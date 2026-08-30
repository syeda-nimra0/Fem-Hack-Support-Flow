

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { retainSocket, releaseSocket, subscribeConnection, getConnectionSnapshot, isRealtimeEnabled } from "@/lib/socket";
import { useSyncExternalStore } from "react";
import type { Stats, Ticket, TicketMessage } from "@/lib/types";

/**
 * Realtime refresh strategy:
 *  · Socket.IO events when realtime is available (local dev / long-running host)
 *  · Short-interval polling otherwise (Vercel deployment, where serverless
 *    functions cannot hold WebSocket connections) — and as a safety net while
 *    the socket is reconnecting.
 */
function useAutoRefresh(reload: () => void, intervalMs: number) {
  const connected = useSyncExternalStore(subscribeConnection, getConnectionSnapshot, () => false);

  useEffect(() => {
    if (connected) return; // socket pushes handle updates
    const timer = setInterval(reload, intervalMs);
    return () => clearInterval(timer);
  }, [reload, intervalMs, connected]);
}

/**
 * useTickets — role-scoped ticket list that refreshes in real time
 * (new tickets, updates and activity events arrive over Socket.IO).
 */
export function useTickets(scope?: string) {
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  useEffect(() => {
    let cancelled = false;
    const query = scope ? `?scope=${scope}` : "";
    api
      .get<{ tickets: Ticket[] }>(`/api/tickets${query}`)
      .then((data) => {
        if (!cancelled) {
          setTickets(data.tickets);
          setError("");
        }
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [scope, reloadKey]);

  useEffect(() => {
    const socket = retainSocket();
    if (!socket) return;
    const onNew = () => reload();
    const onActivity = () => reload();
    socket.on("ticket:new", onNew);
    socket.on("ticket:activity", onActivity);
    return () => {
      socket.off("ticket:new", onNew);
      socket.off("ticket:activity", onActivity);
      releaseSocket();
    };
  }, [reload]);

  // Polling fallback (Vercel / socket reconnecting)
  useAutoRefresh(reload, 6000);

  return { tickets, error, reload, setTickets };
}

/** useStats — dashboard statistics with realtime refresh. */
export function useStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ stats: Stats }>("/api/stats")
      .then((data) => !cancelled && (setStats(data.stats), setError("")))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    const socket = retainSocket();
    if (!socket) return;
    const onNew = () => reload();
    socket.on("ticket:new", onNew);
    socket.on("ticket:activity", onNew);
    return () => {
      socket.off("ticket:new", onNew);
      socket.off("ticket:activity", onNew);
      releaseSocket();
    };
  }, [reload]);

  // Polling fallback (Vercel / socket reconnecting)
  useAutoRefresh(reload, 8000);

  return { stats, error, reload };
}

/** useTicketDetail — one ticket + its conversation, live-updated. */
export function useTicketDetail(id: string | null) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [similar, setSimilar] = useState<{ ticket: Ticket; similarity: number }[]>([]);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const lastIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    // Only show the loading skeleton for a NEW ticket id or when nothing is
    // on screen yet — background polls (Vercel mode) must not flash it.
    const isNewId = lastIdRef.current !== id;
    lastIdRef.current = id;
    if (isNewId || !ticket) setLoading(true);
    (async () => {
      try {
        const data = await api.get<{ ticket: Ticket; messages: TicketMessage[] }>(
          `/api/tickets/${id}`
        );
        if (cancelled) return;
        setTicket(data.ticket);
        setMessages(data.messages);
        setError("");
        try {
          const sim = await api.get<{ similar: { ticket: Ticket; similarity: number }[] }>(
            `/api/tickets/${id}/similar`
          );
          if (!cancelled) setSimilar(sim.similar);
        } catch {
          /* similar tickets are best-effort */
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  // Polling fallback (Vercel / socket reconnecting)
  const reloadDetail = useCallback(() => setReloadKey((key) => key + 1), []);
  useAutoRefresh(reloadDetail, 5000);

  // Realtime updates while the ticket is open
  useEffect(() => {
    if (!id) return;
    const socket = retainSocket();
    if (!socket) return;
    socket.emit("ticket:join", id, (ack: { ok: boolean }) => {
      if (!ack?.ok) console.warn("Could not join ticket room");
    });

    const onMessage = (payload: { message: TicketMessage }) => {
      setMessages((prev) =>
        prev.some((m) => m.id === payload.message.id) ? prev : [...prev, payload.message]
      );
    };
    const onTicketUpdated = (payload: { ticket: Ticket }) => setTicket(payload.ticket);
    const onTyping = () => undefined; // handled locally in the view

    socket.on("message:new", onMessage);
    socket.on("ticket:updated", onTicketUpdated);
    socket.on("typing", onTyping);

    return () => {
      socket.emit("ticket:leave", id);
      socket.off("message:new", onMessage);
      socket.off("ticket:updated", onTicketUpdated);
      socket.off("typing", onTyping);
      releaseSocket();
    };
  }, [id]);

  return { ticket, messages, similar, loading, error, setTicket, setMessages };
}
