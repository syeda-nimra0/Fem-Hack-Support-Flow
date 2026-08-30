/**
 * useSocket — React hook for Socket.IO real-time updates with polling fallback.
 *
 * Tries Socket.IO first. If Socket.IO is unavailable (e.g., Vercel
 * serverless doesn't support WebSockets), automatically falls back to
 * polling every 10 seconds.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { getSocket, isPollingMode } from '../lib/socket';

const POLL_INTERVAL = 10000; // 10 seconds

export function useSocketEvents(handlers, deps = []) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const socket = getSocket();

    if (socket) {
      const entries = Object.entries(handlersRef.current);
      entries.forEach(([event, handler]) => {
        const wrappedHandler = (data) => handlersRef.current[event]?.(data);
        socket.on(event, wrappedHandler);
      });

      return () => {
        entries.forEach(([event]) => {
          socket.off(event);
        });
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * useLiveTickets — auto-refreshes a ticket list when Socket.IO
 * receives events OR via polling fallback.
 */
export function useLiveTickets(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const result = await fetcherRef.current();
      setData(result);
      setError('');
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh, ...deps]);

  // Real-time: try Socket.IO, fall back to polling
  useEffect(() => {
    const socket = getSocket();

    if (socket) {
      const handler = () => refresh(true);
      socket.on('ticket:new', handler);
      socket.on('ticket:updated', handler);
      socket.on('ticket:message', handler);
      return () => {
        socket.off('ticket:new', handler);
        socket.off('ticket:updated', handler);
        socket.off('ticket:message', handler);
      };
    }

    // Fallback: polling
    const interval = setInterval(() => refresh(true), POLL_INTERVAL);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh, ...deps]);

  return { data, loading, error, refresh, lastUpdated, setError };
}

/**
 * usePolling — simple polling hook for pages that need periodic refresh.
 * Used by dashboards when Socket.IO is unavailable.
 */
export function usePolling(callback, interval = POLL_INTERVAL, deps = []) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const interval = setInterval(() => callbackRef.current(), interval);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interval, ...deps]);
}
