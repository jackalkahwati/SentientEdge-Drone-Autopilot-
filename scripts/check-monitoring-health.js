#!/usr/bin/env node

/**
 * Monitoring Health Check Script
 * Checks the health of all monitoring services for SentientEdge
 */

const http = require('http');
const https = require('https');

// Monitoring service endpoints
const SERVICES = {
  'SentientEdge API': 'http://localhost:4000/api/health',
  'SentientEdge Frontend': 'http://localhost:3000/api/health',
  'Prometheus': 'http://localhost:9090/-/healthy',
  'Grafana': 'http://localhost:3001/api/health',
  'AlertManager': 'http://localhost:9093/-/healthy',
  'Elasticsearch': 'http://localhost:9200/_cluster/health',
  'Kibana': 'http://localhost:5601/api/status',
  'Jaeger': 'http://localhost:14269/',
  'Loki': 'http://localhost:3100/ready'
};

// ANSI color codes for output formatting
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Health check function
function checkHealth(name, url) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.get(url, { timeout: 5000 }, (res) => {
      const isHealthy = res.statusCode >= 200 && res.statusCode < 400;
      
      resolve({
        name,
        url,
        status: isHealthy ? 'healthy' : 'unhealthy',
        statusCode: res.statusCode,
        responseTime: Date.now() - startTime
      });
    });

    const startTime = Date.now();

    req.on('error', (error) => {
      resolve({
        name,
        url,
        status: 'error',
        error: error.message,
        responseTime: Date.now() - startTime
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        name,
        url,
        status: 'timeout',
        error: 'Request timeout (5s)',
        responseTime: 5000
      });
    });
  });
}

// Format status with colors
function formatStatus(result) {
  const statusIcon = result.status === 'healthy' ? '✅' : 
                    result.status === 'timeout' ? '⏰' : '❌';
  
  const statusColor = result.status === 'healthy' ? colors.green : 
                     result.status === 'timeout' ? colors.yellow : colors.red;
  
  const name = `${colors.bold}${result.name}${colors.reset}`;
  const status = `${statusColor}${result.status.toUpperCase()}${colors.reset}`;
  const responseTime = `${result.responseTime}ms`;
  
  let line = `${statusIcon} ${name.padEnd(30)} ${status.padEnd(20)} ${responseTime}`;
  
  if (result.statusCode) {
    line += ` (${result.statusCode})`;
  }
  
  if (result.error) {
    line += `\n   ${colors.red}Error: ${result.error}${colors.reset}`;
  }
  
  return line;
}

// Main execution
async function main() {
  console.log(`${colors.blue}${colors.bold}SentientEdge Monitoring Health Check${colors.reset}`);
  console.log(`${colors.blue}======================================${colors.reset}\n`);
  
  console.log(`${colors.bold}Service Name                   Status               Response Time${colors.reset}`);
  console.log('─'.repeat(70));
  
  const results = [];
  
  // Run health checks in parallel
  const promises = Object.entries(SERVICES).map(([name, url]) => 
    checkHealth(name, url)
  );
  
  const healthResults = await Promise.all(promises);
  
  // Display results
  healthResults.forEach(result => {
    console.log(formatStatus(result));
    results.push(result);
  });
  
  console.log('─'.repeat(70));
  
  // Summary
  const healthy = results.filter(r => r.status === 'healthy').length;
  const total = results.length;
  const healthPercentage = Math.round((healthy / total) * 100);
  
  console.log(`\n${colors.bold}Summary:${colors.reset}`);
  console.log(`Total Services: ${total}`);
  console.log(`Healthy: ${colors.green}${healthy}${colors.reset}`);
  console.log(`Unhealthy: ${colors.red}${total - healthy}${colors.reset}`);
  console.log(`Health Score: ${healthPercentage >= 80 ? colors.green : healthPercentage >= 60 ? colors.yellow : colors.red}${healthPercentage}%${colors.reset}`);
  
  // Recommendations
  const unhealthyServices = results.filter(r => r.status !== 'healthy');
  if (unhealthyServices.length > 0) {
    console.log(`\n${colors.yellow}${colors.bold}Recommendations:${colors.reset}`);
    
    unhealthyServices.forEach(service => {
      console.log(`${colors.yellow}•${colors.reset} Check ${service.name}:`);
      
      if (service.status === 'error' && service.error.includes('ECONNREFUSED')) {
        console.log(`  - Service may not be running. Try: docker-compose up ${service.name.toLowerCase()}`);
      } else if (service.status === 'timeout') {
        console.log(`  - Service is slow to respond. Check resource usage and logs.`);
      } else if (service.statusCode >= 500) {
        console.log(`  - Service has internal errors. Check service logs.`);
      }
      
      console.log(`  - View logs: docker-compose logs ${service.name.toLowerCase()}`);
      console.log('');
    });
  }
  
  // Docker commands help
  console.log(`\n${colors.blue}${colors.bold}Quick Commands:${colors.reset}`);
  console.log(`Start monitoring: ${colors.green}npm run monitoring:start${colors.reset}`);
  console.log(`Stop monitoring:  ${colors.red}npm run monitoring:stop${colors.reset}`);
  console.log(`View logs:        ${colors.blue}npm run monitoring:logs${colors.reset}`);
  
  // Exit with appropriate code
  process.exit(healthy === total ? 0 : 1);
}

// Handle errors gracefully
process.on('unhandledRejection', (error) => {
  console.error(`${colors.red}Unhandled error: ${error.message}${colors.reset}`);
  process.exit(1);
});

// Run the health check
main().catch((error) => {
  console.error(`${colors.red}Health check failed: ${error.message}${colors.reset}`);
  process.exit(1);
});