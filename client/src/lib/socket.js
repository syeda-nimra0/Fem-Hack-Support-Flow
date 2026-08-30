import { io } from 'socket.io-client';
import { api } from './api';

let socket = null;
let connectionPromise = null;
let connectionFailed = false;

/**
 * Initialize Socket.IO connection.
 * In production (Vercel), WebSockets are not supported, so this will
 * fail to connect. The caller should use useSocketEvents which
 * automatically falls back to polling.
 */
export function getSocket() {
  if (connectionFailed) return null;
  if (socket) return socket;

  const token = api.getToken();
  if (!token) return null;

  try {
    socket = io('/', {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
      timeout: 5000,
    });

    socket.on('connect', () => {
      connectionFailed = false;
    });

    socket.on('disconnect', (reason) => {
      // If the server doesn't support Socket.IO (Vercel), mark as failed
      if (reason === 'io server disconnect' || reason === 'transport close') {
        // Will try to reconnect
      }
    });

    socket.on('connect_error', (err) => {
      console.warn('[socket] Connect error:', err.message);
      // After 3 failed attempts, give up and switch to polling
      if (socket.io.reconnectionAttempts >= 3) {
        console.warn('[socket] Giving up — switching to polling mode');
        connectionFailed = true;
        socket.disconnect();
        socket = null;
      }
    });

    // Safety timeout: if not connected in 5s, switch to polling
    setTimeout(() => {
      if (socket && !socket.connected) {
        console.warn('[socket] Timeout — switching to polling mode');
        connectionFailed = true;
        socket.disconnect();
        socket = null;
      }
    }, 5000);

    return socket;
  } catch (err) {
    console.warn('[socket] Init failed:', err.message);
    connectionFailed = true;
    return null;
  }
}

export function connectSocket() {
  if (!api.getToken()) return null;
  if (socket && socket.connected) return socket;
  if (connectionFailed) return null;
  if (connectionPromise) return connectionPromise;

  const s = getSocket();
  if (!s) return null;
  if (s.connected) return s;

  connectionPromise = new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), 5000);
    s.once('connect', () => {
      clearTimeout(timeout);
      resolve(s);
    });
    s.once('connect_error', () => {
      clearTimeout(timeout);
      resolve(null);
    });
    if (!s.connected) s.connect();
  });

  return connectionPromise;
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    connectionPromise = null;
  }
  connectionFailed = false;
}

export function joinTicketRoom(ticketId) {
  const s = getSocket();
  if (s && s.connected) s.emit('ticket:join', ticketId);
}

export function leaveTicketRoom(ticketId) {
  const s = getSocket();
  if (s && s.connected) s.emit('ticket:leave', ticketId);
}

export function emitTyping(ticketId, isTyping) {
  const s = getSocket();
  if (s && s.connected) s.emit('ticket:typing', { ticketId, isTyping });
}

export function isSocketConnected() {
  return !!(socket && socket.connected);
}

export function isPollingMode() {
  return connectionFailed;
}
