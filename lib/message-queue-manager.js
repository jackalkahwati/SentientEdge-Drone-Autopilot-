// High-Throughput Message Queue Manager
// Military-grade message queuing with delivery guarantees and ordering

const { EventEmitter } = require('events');
const crypto = require('crypto');
const { performance } = require('perf_hooks');

class MessageQueueManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      maxQueueSize: options.maxQueueSize || 10000,
      batchSize: options.batchSize || 100,
      batchTimeout: options.batchTimeout || 10, // ms
      retryAttempts: options.retryAttempts || 5,
      retryBackoffBase: options.retryBackoffBase || 1000, // ms
      retryBackoffMultiplier: options.retryBackoffMultiplier || 2,
      maxRetryDelay: options.maxRetryDelay || 30000, // 30 seconds
      messageTimeout: options.messageTimeout || 300000, // 5 minutes
      deadLetterQueueSize: options.deadLetterQueueSize || 1000,
      priorityLevels: options.priorityLevels || ['critical', 'high', 'normal', 'low'],
      throughputTarget: options.throughputTarget || 10000, // messages per second
      deliveryGuarantee: options.deliveryGuarantee || 'at-least-once', // at-least-once, at-most-once, exactly-once
      persistenceEnabled: options.persistenceEnabled !== false,
      compressionEnabled: options.compressionEnabled !== false,
      encryptionEnabled: options.encryptionEnabled !== false,
      orderingEnabled: options.orderingEnabled !== false,
    };
    
    // Queue management
    this.queues = new Map(); // queueName -> Queue
    this.priorityQueues = new Map(); // priority -> PriorityQueue
    this.deadLetterQueue = [];
    this.retryQueues = new Map(); // retryLevel -> RetryQueue
    
    // Message tracking
    this.inFlightMessages = new Map(); // messageId -> MessageInfo
    this.acknowledgedMessages = new Set(); // messageId (for exactly-once delivery)
    this.messageSequences = new Map(); // sequenceKey -> sequenceNumber
    
    // Performance tracking
    this.metrics = {
      messagesProcessed: 0,
      messagesQueued: 0,
      messagesDelivered: 0,
      messagesFailed: 0,
      messagesRetried: 0,
      averageProcessingTime: 0,
      throughput: 0,
      queueSizes: new Map(),
      batchesProcessed: 0,
      compressionRatio: 0,
      errorRate: 0,
    };
    
    // Processing state
    this.isProcessing = false;
    this.processors = new Map(); // queueName -> ProcessorInfo
    this.batchTimers = new Map(); // queueName -> timer
    
    // Compression and encryption
    this.compressionThreshold = 1024; // bytes
    this.encryptionKey = options.encryptionKey || crypto.randomBytes(32);
    
    // Initialize priority queues
    this.initializePriorityQueues();
    
    // Start processing
    this.startProcessing();
    
    console.log('🔄 Message Queue Manager initialized');
  }

  async initialize(redisClient) {
    this.redis = redisClient;
    
    // Initialize Redis streams for persistence
    if (this.options.persistenceEnabled) {
      await this.initializeRedisStreams();
    }
    
    // Load persisted messages if any
    await this.loadPersistedMessages();
    
    // Start metrics collection
    this.startMetricsCollection();
    
    console.log('✅ Message Queue Manager initialized');
    this.emit('queue:ready');
  }

  initializePriorityQueues() {
    for (const priority of this.options.priorityLevels) {
      this.priorityQueues.set(priority, {
        name: priority,
        messages: [],
        processing: false,
        lastProcessed: Date.now(),
      });
    }
  }

  async initializeRedisStreams() {
    const streamNames = [
      'messages:pending',
      'messages:processing',
      'messages:completed',
      'messages:failed',
      'messages:retry',
    ];
    
    for (const streamName of streamNames) {
      try {
        // Create consumer group if it doesn't exist
        await this.redis.xGroupCreate(streamName, 'processors', '$', { MKSTREAM: true });
      } catch (error) {
        if (!error.message.includes('BUSYGROUP')) {
          console.error(`❌ Failed to create consumer group for ${streamName}:`, error);
        }
      }
    }
  }

  // Message queuing interface
  async enqueue(queueName, message, options = {}) {
    const messageId = options.messageId || crypto.randomUUID();
    const timestamp = Date.now();
    
    const queueMessage = {
      id: messageId,
      queueName,
      payload: message,
      priority: options.priority || 'normal',
      sequenceKey: options.sequenceKey,
      deliveryGuarantee: options.deliveryGuarantee || this.options.deliveryGuarantee,
      maxRetries: options.maxRetries || this.options.retryAttempts,
      timeout: options.timeout || this.options.messageTimeout,
      createdAt: timestamp,
      enqueuedAt: timestamp,
      attempts: 0,
      metadata: {
        source: options.source || 'unknown',
        correlationId: options.correlationId,
        traceId: options.traceId,
        userId: options.userId,
        droneId: options.droneId,
        missionId: options.missionId,
        compressed: false,
        encrypted: false,
        originalSize: 0,
        compressedSize: 0,
        ...options.metadata,
      },
    };
    
    // Apply compression if enabled and message is large enough
    if (this.options.compressionEnabled && this.shouldCompress(queueMessage)) {
      queueMessage.payload = await this.compressMessage(queueMessage.payload);
      queueMessage.metadata.compressed = true;
    }
    
    // Apply encryption if enabled
    if (this.options.encryptionEnabled) {
      queueMessage.payload = await this.encryptMessage(queueMessage.payload);
      queueMessage.metadata.encrypted = true;
    }
    
    // Handle ordering
    if (this.options.orderingEnabled && queueMessage.sequenceKey) {
      queueMessage.sequenceNumber = this.getNextSequenceNumber(queueMessage.sequenceKey);
    }
    
    // Get or create queue
    const queue = this.getOrCreateQueue(queueName);
    
    // Check queue capacity
    if (queue.messages.length >= this.options.maxQueueSize) {
      console.warn(`⚠️ Queue ${queueName} at capacity, dropping oldest message`);
      const droppedMessage = queue.messages.shift();
      this.handleDroppedMessage(droppedMessage);
    }
    
    // Add to appropriate queue based on priority
    if (queueMessage.priority !== 'normal') {
      const priorityQueue = this.priorityQueues.get(queueMessage.priority);
      if (priorityQueue) {
        priorityQueue.messages.push(queueMessage);
      } else {
        queue.messages.push(queueMessage);
      }
    } else {
      queue.messages.push(queueMessage);
    }
    
    // Persist message if enabled
    if (this.options.persistenceEnabled) {
      await this.persistMessage(queueMessage, 'pending');
    }
    
    // Update metrics
    this.metrics.messagesQueued++;
    this.updateQueueSizeMetrics();
    
    console.log(`📥 Message enqueued: ${messageId} in ${queueName} (priority: ${queueMessage.priority})`);
    this.emit('message:enqueued', queueMessage);
    
    return messageId;
  }

  getOrCreateQueue(queueName) {
    if (!this.queues.has(queueName)) {
      const queue = {
        name: queueName,
        messages: [],
        processing: false,
        lastProcessed: Date.now(),
        totalProcessed: 0,
        totalFailed: 0,
        averageProcessingTime: 0,
      };
      
      this.queues.set(queueName, queue);
      console.log(`📋 Created queue: ${queueName}`);
    }
    
    return this.queues.get(queueName);
  }

  shouldCompress(message) {
    const serialized = JSON.stringify(message.payload);
    message.metadata.originalSize = Buffer.byteLength(serialized, 'utf8');
    return message.metadata.originalSize > this.compressionThreshold;
  }

  async compressMessage(payload) {
    const zlib = require('zlib');
    const serialized = JSON.stringify(payload);
    const compressed = zlib.gzipSync(serialized);
    return compressed.toString('base64');
  }

  async decompressMessage(compressedPayload) {
    const zlib = require('zlib');
    const compressed = Buffer.from(compressedPayload, 'base64');
    const decompressed = zlib.gunzipSync(compressed);
    return JSON.parse(decompressed.toString());
  }

  async encryptMessage(payload) {
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, this.encryptionKey);
    
    let encrypted = cipher.update(JSON.stringify(payload), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  }

  async decryptMessage(encryptedPayload) {
    const algorithm = 'aes-256-gcm';
    const decipher = crypto.createDecipher(algorithm, this.encryptionKey);
    
    decipher.setAuthTag(Buffer.from(encryptedPayload.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedPayload.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }

  getNextSequenceNumber(sequenceKey) {
    const current = this.messageSequences.get(sequenceKey) || 0;
    const next = current + 1;
    this.messageSequences.set(sequenceKey, next);
    return next;
  }

  // Message processing
  startProcessing() {
    this.isProcessing = true;
    
    // Process different queue types
    this.processPriorityQueues();
    this.processRegularQueues();
    this.processRetryQueues();
    
    console.log('🔄 Message processing started');
  }

  processPriorityQueues() {
    setInterval(() => {
      for (const priority of this.options.priorityLevels) {
        const priorityQueue = this.priorityQueues.get(priority);
        if (priorityQueue && priorityQueue.messages.length > 0 && !priorityQueue.processing) {
          this.processBatch(priorityQueue, 'priority');
        }
      }
    }, 1); // Process priority queues every 1ms for high frequency
  }

  processRegularQueues() {
    setInterval(() => {
      for (const [queueName, queue] of this.queues) {
        if (queue.messages.length > 0 && !queue.processing) {
          this.processBatch(queue, 'regular');
        }
      }
    }, 5); // Process regular queues every 5ms
  }

  processRetryQueues() {
    setInterval(() => {
      const now = Date.now();
      
      for (const [retryLevel, retryQueue] of this.retryQueues) {
        const readyMessages = retryQueue.filter(msg => msg.retryAt <= now);
        
        if (readyMessages.length > 0) {
          // Move ready messages back to main queues
          for (const message of readyMessages) {
            retryQueue.splice(retryQueue.indexOf(message), 1);
            
            const queue = this.getOrCreateQueue(message.queueName);
            queue.messages.push(message);
          }
        }
      }
    }, 1000); // Check retry queues every second
  }

  async processBatch(queue, type) {
    if (queue.processing) return;
    
    queue.processing = true;
    const startTime = performance.now();
    
    try {
      // Determine batch size based on queue type
      const batchSize = type === 'priority' ? 10 : this.options.batchSize;
      const batch = queue.messages.splice(0, Math.min(batchSize, queue.messages.length));
      
      if (batch.length === 0) {
        queue.processing = false;
        return;
      }
      
      console.log(`🔄 Processing batch of ${batch.length} messages from ${queue.name} (${type})`);
      
      // Process batch with ordering if required
      if (this.options.orderingEnabled) {
        batch.sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0));
      }
      
      const processingPromises = batch.map(message => this.processMessage(message));
      const results = await Promise.allSettled(processingPromises);
      
      // Handle results
      let successful = 0;
      let failed = 0;
      
      results.forEach((result, index) => {
        const message = batch[index];
        
        if (result.status === 'fulfilled' && result.value.success) {
          successful++;
          this.handleSuccessfulMessage(message, result.value);
        } else {
          failed++;
          const error = result.status === 'rejected' ? result.reason : result.value.error;
          this.handleFailedMessage(message, error);
        }
      });
      
      // Update metrics
      const processingTime = performance.now() - startTime;
      queue.totalProcessed += successful;
      queue.totalFailed += failed;
      queue.averageProcessingTime = 
        (queue.averageProcessingTime * (queue.totalProcessed - successful) + processingTime) / queue.totalProcessed;
      
      this.metrics.batchesProcessed++;
      this.metrics.messagesProcessed += successful;
      this.metrics.messagesFailed += failed;
      
      console.log(`✅ Batch processed: ${successful} successful, ${failed} failed (${processingTime.toFixed(2)}ms)`);
      
    } catch (error) {
      console.error(`❌ Batch processing failed for ${queue.name}:`, error);
    } finally {
      queue.processing = false;
      queue.lastProcessed = Date.now();
    }
  }

  async processMessage(message) {
    const startTime = performance.now();
    message.attempts++;
    
    try {
      // Update in-flight tracking
      this.inFlightMessages.set(message.id, {
        message,
        startTime,
        attempts: message.attempts,
      });
      
      // Check for exactly-once delivery
      if (message.deliveryGuarantee === 'exactly-once' && 
          this.acknowledgedMessages.has(message.id)) {
        console.log(`⏭️ Message ${message.id} already processed (exactly-once)`);
        return { success: true, reason: 'already_processed' };
      }
      
      // Decrypt message if needed
      let payload = message.payload;
      if (message.metadata.encrypted) {
        payload = await this.decryptMessage(payload);
      }
      
      // Decompress message if needed
      if (message.metadata.compressed) {
        payload = await this.decompressMessage(payload);
      }
      
      // Emit message for processing
      const result = await this.deliverMessage(message, payload);
      
      const processingTime = performance.now() - startTime;
      
      // Update average processing time
      this.metrics.averageProcessingTime = 
        (this.metrics.averageProcessingTime * this.metrics.messagesProcessed + processingTime) / 
        (this.metrics.messagesProcessed + 1);
      
      return { success: true, processingTime, result };
      
    } catch (error) {
      const processingTime = performance.now() - startTime;
      console.error(`❌ Message processing failed for ${message.id}:`, error);
      
      return { success: false, error, processingTime };
    } finally {
      this.inFlightMessages.delete(message.id);
    }
  }

  async deliverMessage(message, payload) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Message delivery timeout'));
      }, message.timeout);
      
      // Emit message for external handlers
      this.emit('message:deliver', {
        id: message.id,
        queueName: message.queueName,
        payload,
        metadata: message.metadata,
        acknowledge: (result) => {
          clearTimeout(timeoutId);
          resolve(result);
        },
        reject: (error) => {
          clearTimeout(timeoutId);
          reject(error);
        },
      });
    });
  }

  handleSuccessfulMessage(message, result) {
    // Mark as acknowledged for exactly-once delivery
    if (message.deliveryGuarantee === 'exactly-once') {
      this.acknowledgedMessages.add(message.id);
      
      // Clean up old acknowledgments to prevent memory leaks
      if (this.acknowledgedMessages.size > 10000) {
        const oldAcks = Array.from(this.acknowledgedMessages).slice(0, 5000);
        oldAcks.forEach(id => this.acknowledgedMessages.delete(id));
      }
    }
    
    // Persist completion if enabled
    if (this.options.persistenceEnabled) {
      this.persistMessage(message, 'completed');
    }
    
    this.metrics.messagesDelivered++;
    
    console.log(`✅ Message delivered: ${message.id}`);
    this.emit('message:delivered', { message, result });
  }

  handleFailedMessage(message, error) {
    console.error(`❌ Message failed: ${message.id} - ${error.message}`);
    
    // Check if we should retry
    if (message.attempts < message.maxRetries) {
      this.scheduleRetry(message, error);
    } else {
      this.moveToDeadLetterQueue(message, error);
    }
    
    // Persist failure if enabled
    if (this.options.persistenceEnabled) {
      this.persistMessage({ ...message, error: error.message }, 'failed');
    }
    
    this.emit('message:failed', { message, error, willRetry: message.attempts < message.maxRetries });
  }

  scheduleRetry(message, error) {
    const retryLevel = Math.min(message.attempts, 5);
    const retryDelay = Math.min(
      this.options.retryBackoffBase * Math.pow(this.options.retryBackoffMultiplier, retryLevel - 1),
      this.options.maxRetryDelay
    );
    
    message.retryAt = Date.now() + retryDelay;
    message.lastError = error.message;
    
    // Add to retry queue
    if (!this.retryQueues.has(retryLevel)) {
      this.retryQueues.set(retryLevel, []);
    }
    
    this.retryQueues.get(retryLevel).push(message);
    this.metrics.messagesRetried++;
    
    console.log(`🔄 Message ${message.id} scheduled for retry in ${retryDelay}ms (attempt ${message.attempts})`);
    
    // Persist retry if enabled
    if (this.options.persistenceEnabled) {
      this.persistMessage(message, 'retry');
    }
    
    this.emit('message:retry-scheduled', { message, retryDelay, attempt: message.attempts });
  }

  moveToDeadLetterQueue(message, error) {
    message.movedToDeadLetterAt = Date.now();
    message.finalError = error.message;
    
    // Add to dead letter queue
    this.deadLetterQueue.push(message);
    
    // Limit dead letter queue size
    if (this.deadLetterQueue.length > this.options.deadLetterQueueSize) {
      const removed = this.deadLetterQueue.shift();
      console.warn(`⚠️ Dead letter queue full, removing oldest message: ${removed.id}`);
    }
    
    console.error(`💀 Message ${message.id} moved to dead letter queue after ${message.attempts} attempts`);
    this.emit('message:dead-letter', { message, error });
  }

  handleDroppedMessage(message) {
    console.warn(`⚠️ Message dropped due to queue capacity: ${message.id}`);
    this.emit('message:dropped', message);
  }

  // Persistence
  async persistMessage(message, status) {
    try {
      const streamName = `messages:${status}`;
      const fields = {
        messageId: message.id,
        queueName: message.queueName,
        payload: JSON.stringify(message.payload),
        metadata: JSON.stringify(message.metadata),
        status,
        timestamp: Date.now(),
      };
      
      await this.redis.xAdd(streamName, '*', fields);
      
    } catch (error) {
      console.error(`❌ Failed to persist message ${message.id}:`, error);
    }
  }

  async loadPersistedMessages() {
    if (!this.options.persistenceEnabled) return;
    
    try {
      // Load pending messages
      const pendingMessages = await this.redis.xRange('messages:pending', '-', '+');
      
      for (const [id, fields] of pendingMessages) {
        try {
          const message = {
            id: fields.messageId,
            queueName: fields.queueName,
            payload: JSON.parse(fields.payload),
            metadata: JSON.parse(fields.metadata),
            attempts: 0,
          };
          
          const queue = this.getOrCreateQueue(message.queueName);
          queue.messages.push(message);
          
        } catch (error) {
          console.error(`❌ Failed to load persisted message ${id}:`, error);
        }
      }
      
      console.log(`📥 Loaded ${pendingMessages.length} persisted messages`);
      
    } catch (error) {
      console.error('❌ Failed to load persisted messages:', error);
    }
  }

  // Metrics and monitoring
  startMetricsCollection() {
    setInterval(() => {
      this.updateMetrics();
    }, 1000); // Update metrics every second
  }

  updateMetrics() {
    // Calculate throughput
    const now = Date.now();
    if (this.lastMetricsUpdate) {
      const timeDiff = (now - this.lastMetricsUpdate) / 1000; // seconds
      const messagesDiff = this.metrics.messagesDelivered - (this.lastMessagesDelivered || 0);
      this.metrics.throughput = messagesDiff / timeDiff;
    }
    
    this.lastMetricsUpdate = now;
    this.lastMessagesDelivered = this.metrics.messagesDelivered;
    
    // Update queue size metrics
    this.updateQueueSizeMetrics();
    
    // Calculate error rate
    const totalProcessed = this.metrics.messagesProcessed + this.metrics.messagesFailed;
    this.metrics.errorRate = totalProcessed > 0 ? this.metrics.messagesFailed / totalProcessed : 0;
    
    // Emit metrics
    this.emit('metrics:updated', this.getMetrics());
  }

  updateQueueSizeMetrics() {
    for (const [queueName, queue] of this.queues) {
      this.metrics.queueSizes.set(queueName, queue.messages.length);
    }
    
    for (const [priority, priorityQueue] of this.priorityQueues) {
      this.metrics.queueSizes.set(`priority:${priority}`, priorityQueue.messages.length);
    }
  }

  // API methods
  getMetrics() {
    return {
      ...this.metrics,
      queueSizes: Object.fromEntries(this.metrics.queueSizes),
      inFlightMessages: this.inFlightMessages.size,
      deadLetterQueueSize: this.deadLetterQueue.length,
      retryQueueSizes: Object.fromEntries(
        Array.from(this.retryQueues.entries()).map(([level, queue]) => [level, queue.length])
      ),
      acknowledgedMessages: this.acknowledgedMessages.size,
      totalQueuedMessages: Array.from(this.queues.values()).reduce((sum, q) => sum + q.messages.length, 0) +
                          Array.from(this.priorityQueues.values()).reduce((sum, q) => sum + q.messages.length, 0),
    };
  }

  getQueueStatus(queueName) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      return null;
    }
    
    return {
      name: queueName,
      size: queue.messages.length,
      processing: queue.processing,
      lastProcessed: queue.lastProcessed,
      totalProcessed: queue.totalProcessed,
      totalFailed: queue.totalFailed,
      averageProcessingTime: queue.averageProcessingTime,
    };
  }

  getAllQueueStatuses() {
    const statuses = {};
    
    for (const [queueName, queue] of this.queues) {
      statuses[queueName] = this.getQueueStatus(queueName);
    }
    
    return statuses;
  }

  getDeadLetterMessages() {
    return this.deadLetterQueue.slice(); // Return copy
  }

  retryDeadLetterMessage(messageId) {
    const messageIndex = this.deadLetterQueue.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1) {
      return false;
    }
    
    const message = this.deadLetterQueue.splice(messageIndex, 1)[0];
    message.attempts = 0; // Reset attempts
    delete message.movedToDeadLetterAt;
    delete message.finalError;
    
    const queue = this.getOrCreateQueue(message.queueName);
    queue.messages.push(message);
    
    console.log(`🔄 Dead letter message ${messageId} moved back to queue`);
    this.emit('message:dead-letter-retry', message);
    
    return true;
  }

  // Queue management
  pauseQueue(queueName) {
    const queue = this.queues.get(queueName);
    if (queue) {
      queue.paused = true;
      console.log(`⏸️ Queue paused: ${queueName}`);
      this.emit('queue:paused', queueName);
      return true;
    }
    return false;
  }

  resumeQueue(queueName) {
    const queue = this.queues.get(queueName);
    if (queue) {
      queue.paused = false;
      console.log(`▶️ Queue resumed: ${queueName}`);
      this.emit('queue:resumed', queueName);
      return true;
    }
    return false;
  }

  purgeQueue(queueName) {
    const queue = this.queues.get(queueName);
    if (queue) {
      const purgedCount = queue.messages.length;
      queue.messages = [];
      console.log(`🗑️ Queue purged: ${queueName} (${purgedCount} messages)`);
      this.emit('queue:purged', { queueName, purgedCount });
      return purgedCount;
    }
    return 0;
  }

  // Graceful shutdown
  async shutdown() {
    console.log('🔄 Shutting down Message Queue Manager...');
    
    this.isProcessing = false;
    
    // Wait for in-flight messages to complete
    if (this.inFlightMessages.size > 0) {
      console.log(`⏳ Waiting for ${this.inFlightMessages.size} in-flight messages...`);
      
      let attempts = 0;
      while (this.inFlightMessages.size > 0 && attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
      
      if (this.inFlightMessages.size > 0) {
        console.warn(`⚠️ ${this.inFlightMessages.size} messages still in-flight during shutdown`);
      }
    }
    
    // Persist remaining messages if enabled
    if (this.options.persistenceEnabled) {
      await this.persistRemainingMessages();
    }
    
    // Clear all queues
    this.queues.clear();
    this.priorityQueues.clear();
    this.retryQueues.clear();
    this.inFlightMessages.clear();
    this.acknowledgedMessages.clear();
    this.messageSequences.clear();
    
    console.log('✅ Message Queue Manager shutdown complete');
  }

  async persistRemainingMessages() {
    let persistedCount = 0;
    
    // Persist messages from all queues
    for (const queue of this.queues.values()) {
      for (const message of queue.messages) {
        await this.persistMessage(message, 'pending');
        persistedCount++;
      }
    }
    
    // Persist priority queue messages
    for (const priorityQueue of this.priorityQueues.values()) {
      for (const message of priorityQueue.messages) {
        await this.persistMessage(message, 'pending');
        persistedCount++;
      }
    }
    
    console.log(`💾 Persisted ${persistedCount} remaining messages`);
  }
}

module.exports = { MessageQueueManager };