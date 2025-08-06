"use client";

import { useState, useEffect, useRef, useCallback } from 'react';

interface PerformanceMetrics {
  fps: number;
  renderTime: number;
  updateCount: number;
  memoryUsage?: number;
  wsMessageRate: number;
  activeComponents: number;
}

interface PerformanceHookReturn {
  metrics: PerformanceMetrics;
  trackRender: (componentName: string) => void;
  trackUpdate: () => void;
  trackWSMessage: () => void;
  trackComponent: (componentName: string, active: boolean) => void;
  getReport: () => string;
}

export function usePerformanceMonitor(enabled: boolean = process.env.NODE_ENV === 'development'): PerformanceHookReturn {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    renderTime: 0,
    updateCount: 0,
    wsMessageRate: 0,
    activeComponents: 0,
  });

  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const renderTimesRef = useRef<number[]>([]);
  const updateCountRef = useRef(0);
  const wsMessageCountRef = useRef(0);
  const activeComponentsRef = useRef(new Set<string>());
  const animationFrameRef = useRef<number>();

  // FPS and render time calculation
  const calculateMetrics = useCallback(() => {
    if (!enabled) return;

    const now = performance.now();
    const delta = now - lastTimeRef.current;
    
    if (delta >= 1000) { // Update every second
      const fps = Math.round((frameCountRef.current * 1000) / delta);
      const avgRenderTime = renderTimesRef.current.length > 0 
        ? renderTimesRef.current.reduce((a, b) => a + b, 0) / renderTimesRef.current.length 
        : 0;
      
      const wsRate = (wsMessageCountRef.current * 1000) / delta;

      setMetrics(prev => ({
        ...prev,
        fps,
        renderTime: Math.round(avgRenderTime * 100) / 100,
        updateCount: updateCountRef.current,
        wsMessageRate: Math.round(wsRate * 100) / 100,
        activeComponents: activeComponentsRef.current.size,
        memoryUsage: (performance as any).memory?.usedJSHeapSize / 1024 / 1024 || 0
      }));

      // Reset counters
      frameCountRef.current = 0;
      lastTimeRef.current = now;
      renderTimesRef.current = [];
      updateCountRef.current = 0;
      wsMessageCountRef.current = 0;
    }

    frameCountRef.current++;
    animationFrameRef.current = requestAnimationFrame(calculateMetrics);
  }, [enabled]);

  useEffect(() => {
    if (enabled) {
      animationFrameRef.current = requestAnimationFrame(calculateMetrics);
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled, calculateMetrics]);

  const trackRender = useCallback((componentName: string) => {
    if (!enabled) return;
    
    const renderStart = performance.now();
    
    // Use setTimeout to measure render completion
    setTimeout(() => {
      const renderEnd = performance.now();
      renderTimesRef.current.push(renderEnd - renderStart);
      
      // Keep only last 100 render times
      if (renderTimesRef.current.length > 100) {
        renderTimesRef.current.shift();
      }
    }, 0);
  }, [enabled]);

  const trackUpdate = useCallback(() => {
    if (!enabled) return;
    updateCountRef.current++;
  }, [enabled]);

  const trackWSMessage = useCallback(() => {
    if (!enabled) return;
    wsMessageCountRef.current++;
  }, [enabled]);

  const trackComponent = useCallback((componentName: string, active: boolean) => {
    if (!enabled) return;
    
    if (active) {
      activeComponentsRef.current.add(componentName);
    } else {
      activeComponentsRef.current.delete(componentName);
    }
  }, [enabled]);

  const getReport = useCallback(() => {
    if (!enabled) return 'Performance monitoring disabled';
    
    return `
Performance Report:
- FPS: ${metrics.fps}
- Avg Render Time: ${metrics.renderTime}ms
- Updates/sec: ${metrics.updateCount}
- WS Messages/sec: ${metrics.wsMessageRate}
- Active Components: ${metrics.activeComponents}
- Memory Usage: ${metrics.memoryUsage?.toFixed(2) || 'N/A'} MB

Recommendations:
${metrics.fps < 30 ? '⚠️ Low FPS detected - consider reducing render complexity' : '✅ FPS is healthy'}
${metrics.renderTime > 16 ? '⚠️ Slow renders detected - check for heavy computations' : '✅ Render times are good'}
${metrics.wsMessageRate > 100 ? '⚠️ High WebSocket message rate - consider throttling' : '✅ WebSocket rate is manageable'}
${metrics.updateCount > 50 ? '⚠️ High update frequency - check for unnecessary state changes' : '✅ Update frequency is reasonable'}
    `.trim();
  }, [enabled, metrics]);

  return {
    metrics,
    trackRender,
    trackUpdate,
    trackWSMessage,
    trackComponent,
    getReport,
  };
}

// React DevTools Profiler integration
export function withPerformanceTracking<T extends object>(
  Component: React.ComponentType<T>,
  componentName: string
) {
  return function PerformanceTrackedComponent(props: T) {
    const { trackRender, trackComponent } = usePerformanceMonitor();
    
    useEffect(() => {
      trackComponent(componentName, true);
      return () => trackComponent(componentName, false);
    }, [trackComponent]);

    useEffect(() => {
      trackRender(componentName);
    });

    return <Component {...props} />;
  };
}