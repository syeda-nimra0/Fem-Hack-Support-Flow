import { io, type Socket } from "socket.io-client";
import { SOCKET_URL, getToken } from "./api";

let socket: Socket | null = null;
let refCount = 0;

/**
 * Realtime (Socket.IO) availability — when VITE_SOCKET_URL is empty (e.g. the
 * Vercel deployment, where serverless functions cannot hold WebSockets), the
 * app switches to short-interval polling so everything keeps updating live.
 */
export function isRealtimeEnabled(): boolean {
  return SOCKET_URL.length > 0;
}

// ---------------------------------------------------------------------------
// Connection status as an external store (safe for useSyncExternalStore)
// ---------------------------------------------------------------------------
let connectionState = false;
const connectionListeners = new Set<() => void>();

function setConnectionState(value: boolean) {
  if (connectionState === value) return;
  connectionState = value;
  connectionListeners.forEach((listener) => listener());
}

export function subscribeConnection(listener: () => void) {
  connectionListeners.add(listener);
  return () => connectionListeners.delete(listener);
}

export function getConnectionSnapshot() {
  return connectionState;
}

function bindConnectionEvents(instance: Socket) {
  instance.on("connect", () => setConnectionState(true));
  instance.on("disconnect", () => setConnectionState(false));
}

/**
 * Singleton Socket.IO connection to the SupportFlow realtime service.
 * Connects directly to the Express realtime server (VITE_SOCKET_URL,
 * default http://localhost:3002 — Socket.IO path stays "/" by server config).
 */
export function getSocket(): Socket | null {
  if (typeof window === "undefined") return null;
  if (socket) return socket;
  if (!isRealtimeEnabled()) return null; // polling mode (e.g. Vercel deploy)

  const token = getToken();
  if (!token) return null;

  socket = io(SOCKET_URL, {
    path: "/",
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 8,
    reconnectionDelay: 1200,
    timeout: 12000,
  });
  bindConnectionEvents(socket);
  return socket;
}

export function retainSocket(): Socket | null {
  refCount += 1;
  return getSocket();
}

export function releaseSocket() {
  refCount = Math.max(0, refCount - 1);
  if (refCount === 0 && socket) {
    socket.disconnect();
    socket = null;
  }
}

export function resetSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  refCount = 0;
  setConnectionState(false);
}
