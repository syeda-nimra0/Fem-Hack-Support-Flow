

/**
 * TicketDetail — the shared customer/agent ticket view.
 * - Persistent conversation thread with realtime messages + typing indicator
 * - AI triage panel: agents review/edit suggestions before they are applied
 * - Status workflow controls with all business rules (resolve needs a note)
 * - AI resolution draft, similar-ticket detection, reopen flow
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Send,
  Sparkles,
  Loader2,
  CheckCircle2,
  RotateCcw,
  StickyNote,
  MessageSquareText,
  AlertTriangle,
  UserRound,
  Copy,
} from "lucide-react";
import AppShell from "./AppShell";
import UserAvatar from "./UserAvatar";
import { api, ApiError } from "@/lib/api";
import { useApp } from "@/lib/store";
import { retainSocket, releaseSocket } from "@/lib/socket";
import { useTicketDetail } from "@/hooks/use-supportflow";
import {
  CATEGORIES,
  PRIORITIES,
  STATUS_LABELS,
  formatTime,
  priorityChipClass,
  statusChipClass,
  type Priority,
  type Category,
  type Ticket,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export default function TicketDetail({ id }: { id: string }) {
  const { user, navigate } = useApp();
  const { ticket, messages, similar, loading, error, setTicket, setMessages } = useTicketDetail(id);
  const [toast, setToast] = useState<{ text: string; kind: "success" | "error" } | null>(null);

  if (!user) return null;

  const flash = (text: string, kind: "success" | "error" = "success") => {
    setToast({ text, kind });
    setTimeout(() => setToast(null), 3200);
  };

  if (loading) {
    return (
      <AppShell maxWidth="max-w-5xl">
        <div className="flex flex-col gap-4">
          <div className="sf-skeleton h-8 w-40 rounded-lg" />
          <div className="sf-skeleton h-24 rounded-2xl" />
          <div className="sf-skeleton h-96 rounded-2xl" />
        </div>
      </AppShell>
    );
  }

  if (error || !ticket) {
    return (
      <AppShell maxWidth="max-w-5xl">
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-8 text-center">
          <AlertTriangle size={24} className="mx-auto text-destructive" />
          <p className="mt-3 text-sm text-destructive">{error || "Ticket not found."}</p>
          <button
            type="button"
            onClick={() => navigate({ name: user.role === "customer" ? "customer" : user.role === "agent" ? "agent" : "admin" })}
            className="mt-4 rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-accent"
          >
            Back to dashboard
          </button>
        </div>
      </AppShell>
    );
  }

  const isAgentSide = user.role === "agent" || user.role === "admin";
  const isAssignedAgent = ticket.assignedAgent?.id === user.id;
  const canOperate = user.role === "admin" || (user.role === "agent" && isAssignedAgent);
  const resolved = ticket.status === "resolved";

  return (
    <AppShell maxWidth="max-w-6xl">
      {toast && (
        <div
          role="status"
          className={cn(
            "fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-xl px-5 py-3 text-sm font-medium shadow-card",
            toast.kind === "success"
              ? "bg-[var(--status-resolved)] text-white"
              : "bg-destructive text-white"
          )}
        >
          {toast.text}
        </div>
      )}

      <button
        type="button"
        onClick={() =>
          navigate({ name: user.role === "customer" ? "customer" : user.role === "agent" ? "agent" : "admin" })
        }
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft size={15} /> Back to dashboard
      </button>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* ------------------------------------------------ Main: conversation */}
        <div className="flex flex-col gap-5">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold text-muted-foreground">
                {ticket.ticketNumber}
              </span>
              <span className={statusChipClass(ticket.status)}>
                <span className="sf-dot" />
                {STATUS_LABELS[ticket.status]}
              </span>
              <span className={priorityChipClass(ticket.priority)}>{ticket.priority} priority</span>
              <span className="rounded-md bg-muted px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                {ticket.category}
              </span>
            </div>
            <h1 className="mt-3 text-xl font-bold leading-snug tracking-tight sm:text-2xl">
              {ticket.subject}
            </h1>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {ticket.description}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <UserRound size={13} /> {ticket.customer?.name}
              </span>
              {ticket.assignedAgent && (
                <span>Agent: {ticket.assignedAgent.name}</span>
              )}
              <span>Opened {formatTime(ticket.createdAt)}</span>
            </div>
          </div>

          <Conversation
            ticket={ticket}
            messages={messages}
            setMessages={setMessages}
            userId={user.id}
            userRole={user.role}
            userName={user.name}
            canReply={!resolved && (user.role === "customer" || canOperate)}
            isAgentSide={isAgentSide}
            locked={resolved}
            onFlash={flash}
            onTicketUpdate={setTicket}
          />

          {resolved && (
            <div className="rounded-2xl border border-[color-mix(in_srgb,var(--status-resolved)_35%,transparent)] bg-[color-mix(in_srgb,var(--status-resolved)_8%,transparent)] p-5">
              <p className="flex items-center gap-2 text-sm font-semibold text-[var(--status-resolved)]">
                <CheckCircle2 size={16} /> Resolution
              </p>
              <p className="mt-2 text-sm leading-relaxed">{ticket.resolutionNote}</p>
              {ticket.resolutionSummary && (
                <p className="mt-2 border-t border-border pt-2 text-xs leading-relaxed text-muted-foreground">
                  <Sparkles size={12} className="mr-1 inline text-primary" />
                  AI summary: {ticket.resolutionSummary}
                </p>
              )}
            </div>
          )}
        </div>

        {/* -------------------------------------------------- Side: AI + meta */}
        <div className="flex flex-col gap-5">
          <AiSuggestionPanel
            ticket={ticket}
            isAgentSide={isAgentSide}
            canOperate={canOperate}
            onTicketUpdate={setTicket}
            onFlash={flash}
          />

          {isAgentSide && (
            <AgentActions
              ticket={ticket}
              canOperate={canOperate}
              isAdmin={user.role === "admin"}
              onTicketUpdate={setTicket}
              onFlash={flash}
            />
          )}

          {ticket.status === "resolved" && (user.role === "customer" || canOperate) && (
            <ReopenCard ticket={ticket} onTicketUpdate={setTicket} onFlash={flash} />
          )}

          {similar.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Similar tickets detected
              </h3>
              <ul className="mt-3 flex flex-col gap-2.5">
                {similar.map((row) => (
                  <li key={row.ticket.id}>
                    <button
                      type="button"
                      onClick={() => navigate({ name: "ticket", id: row.ticket.id })}
                      className="w-full rounded-xl border border-border p-3 text-left transition-colors hover:border-primary/60"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] font-semibold text-muted-foreground">
                          {row.ticket.ticketNumber}
                        </span>
                        <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-foreground">
                          {Math.round(row.similarity * 100)}% match
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-1 text-xs font-medium">{row.ticket.subject}</p>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Conversation thread                                                        */
/* -------------------------------------------------------------------------- */
function Conversation({
  ticket,
  messages,
  setMessages,
  userId,
  userRole,
  userName,
  canReply,
  isAgentSide,
  locked,
  onFlash,
  onTicketUpdate,
}: {
  ticket: Ticket;
  messages: import("@/lib/types").TicketMessage[];
  setMessages: (updater: (prev: import("@/lib/types").TicketMessage[]) => import("@/lib/types").TicketMessage[]) => void;
  userId: string;
  userRole: string;
  userName: string;
  canReply: boolean;
  isAgentSide: boolean;
  locked: boolean;
  onFlash: (text: string, kind?: "success" | "error") => void;
  onTicketUpdate: (ticket: Ticket) => void;
}) {
  const [content, setContent] = useState("");
  const [asNote, setAsNote] = useState(false);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, { name: string; at: number }>>({});
  const threadRef = useRef<HTMLDivElement | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingActive = useRef(false);

  // Auto-scroll to the newest message
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, typingUsers]);

  // Typing indicators from the other party
  useEffect(() => {
    const socket = retainSocket();
    if (!socket) return;
    const onTyping = (payload: { ticketId: string; user: { id: string; name: string }; isTyping: boolean }) => {
      if (payload.ticketId !== ticket.id || payload.user.id === userId) return;
      setTypingUsers((prev) => {
        const next = { ...prev };
        if (payload.isTyping) next[payload.user.id] = { name: payload.user.name, at: Date.now() };
        else delete next[payload.user.id];
        return next;
      });
    };
    socket.on("typing", onTyping);
    return () => {
      socket.off("typing", onTyping);
      releaseSocket();
    };
  }, [ticket.id, userId]);

  // Expire stale typing states
  useEffect(() => {
    const interval = setInterval(() => {
      setTypingUsers((prev) => {
        const next: typeof prev = {};
        Object.entries(prev).forEach(([key, value]) => {
          if (Date.now() - value.at < 4000) next[key] = value;
        });
        return Object.keys(next).length === Object.keys(prev).length ? prev : next;
      });
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const emitTyping = (active: boolean) => {
    const socket = retainSocket();
    if (!socket) return;
    if (active && !typingActive.current) {
      typingActive.current = true;
      socket.emit("typing:start", ticket.id);
    } else if (!active && typingActive.current) {
      typingActive.current = false;
      socket.emit("typing:stop", ticket.id);
    }
  };

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = content.trim();
    if (!text) return;
    setSending(true);
    emitTyping(false);
    try {
      const data = await api.post<{ message: import("@/lib/types").TicketMessage; ticket: Ticket }>(
        `/api/tickets/${ticket.id}/messages`,
        { content: text, type: asNote ? "note" : "message" }
      );
      setMessages((prev) => (prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message]));
      onTicketUpdate(data.ticket);
      setContent("");
      setAsNote(false);
    } catch (err) {
      onFlash(err instanceof ApiError ? err.message : "Could not send the message.", "error");
    } finally {
      setSending(false);
    }
  };

  const visibleMessages = messages.filter((m) => (m.type === "note" ? isAgentSide : true));
  const typingList = Object.values(typingUsers);

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card shadow-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <MessageSquareText size={15} className="text-primary" /> Conversation
        </h2>
        <span className="text-xs text-muted-foreground">{visibleMessages.length} messages · persisted</span>
      </div>

      <div ref={threadRef} className="thin-scrollbar flex max-h-[52vh] flex-col gap-3 overflow-y-auto px-5 py-5">
        {visibleMessages.map((message) => {
          if (message.type === "system") {
            return (
              <div key={message.id} className="flex justify-center">
                <p className="sf-bubble sf-bubble-system">{message.content}</p>
              </div>
            );
          }
          const mine = message.sender.id === userId;
          const isNote = message.type === "note";
          return (
            <div key={message.id} className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
              <div className={cn("mb-1 flex items-center gap-2 text-[11px] text-muted-foreground", mine && "flex-row-reverse")}>
                <UserAvatar
                  user={{
                    id: message.sender.id,
                    name: message.sender.name,
                  }}
                  size={22}
                />
                <span className="font-semibold">
                  {isNote ? `${message.sender.name} · internal note` : message.sender.name}
                </span>
                <span>{formatTime(message.createdAt)}</span>
              </div>
              <div
                className={cn(
                  "sf-bubble",
                  isNote ? "sf-bubble-note" : mine ? "sf-bubble-customer" : "sf-bubble-agent"
                )}
              >
                {message.content}
              </div>
            </div>
          );
        })}

        {typingList.length > 0 && (
          <div className="flex items-center gap-2 self-start rounded-full border border-border bg-muted px-4 py-2">
            <span className="sf-typing-dot" />
            <span className="sf-typing-dot" />
            <span className="sf-typing-dot" />
            <span className="ml-1 text-xs text-muted-foreground">
              {typingList[0].name} is typing…
            </span>
          </div>
        )}
      </div>

      {canReply ? (
        <form onSubmit={send} className="border-t border-border p-4">
          <div className="flex items-end gap-3">
            <textarea
              value={content}
              rows={2}
              maxLength={4000}
              onChange={(event) => {
                setContent(event.target.value);
                emitTyping(event.target.value.trim().length > 0);
                if (typingTimer.current) clearTimeout(typingTimer.current);
                typingTimer.current = setTimeout(() => emitTyping(false), 2500);
              }}
              onBlur={() => emitTyping(false)}
              placeholder={asNote ? "Write an internal note (agents only)…" : "Write a reply…"}
              aria-label="Message"
              className="thin-scrollbar max-h-32 flex-1 resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              disabled={sending || !content.trim()}
              aria-label="Send message"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
          {isAgentSide && (
            <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={asNote}
                onChange={(event) => setAsNote(event.target.checked)}
                className="h-3.5 w-3.5 accent-[#3368A0]"
              />
              <StickyNote size={12} /> Internal note (hidden from the customer)
            </label>
          )}
        </form>
      ) : (
        <div className="border-t border-border px-5 py-4 text-center text-xs text-muted-foreground">
          {locked
            ? "This ticket is resolved and locked — reopen it to continue the conversation."
            : "Only participants of this ticket can reply."}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* AI suggestion review panel (agents) / info panel (customers)               */
/* -------------------------------------------------------------------------- */
function AiSuggestionPanel({
  ticket,
  isAgentSide,
  canOperate,
  onTicketUpdate,
  onFlash,
}: {
  ticket: Ticket;
  isAgentSide: boolean;
  canOperate: boolean;
  onTicketUpdate: (ticket: Ticket) => void;
  onFlash: (text: string, kind?: "success" | "error") => void;
}) {
  const suggestion = ticket.aiSuggestion;
  const pending = suggestion && !suggestion.reviewed;
  const [editing, setEditing] = useState(false);
  const [category, setCategory] = useState<Category>("General");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [summary, setSummary] = useState("");
  const [responseDraft, setResponseDraft] = useState("");
  const [takeTicket, setTakeTicket] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (suggestion) {
      setCategory(suggestion.category || "General");
      setPriority(suggestion.priority || "Medium");
      setSummary(suggestion.summary || "");
      setResponseDraft(suggestion.suggestedResponse || "");
    }
  }, [suggestion?.reviewed, ticket.id]);

  const approve = async () => {
    setBusy(true);
    try {
      const data = await api.post<{ ticket: Ticket }>(`/api/tickets/${ticket.id}/review`, {
        category,
        priority,
        summary,
        suggestedResponse: responseDraft,
        takeTicket,
      });
      onTicketUpdate(data.ticket);
      setEditing(false);
      onFlash(`AI suggestion ${editing ? "edited and " : ""}approved${takeTicket ? " — ticket assigned" : ""}.`);
    } catch (err) {
      onFlash(err instanceof ApiError ? err.message : "Could not save the review.", "error");
    } finally {
      setBusy(false);
    }
  };

  if (!suggestion) return null;

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-5 shadow-card",
        pending ? "border-primary/50" : "border-border"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
          <Sparkles size={13} /> AI triage
        </h3>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[10px] font-bold",
            suggestion.reviewed
              ? "bg-[color-mix(in_srgb,var(--status-resolved)_15%,transparent)] text-[var(--status-resolved)]"
              : "bg-accent text-accent-foreground"
          )}
        >
          {suggestion.reviewed ? "REVIEWED" : "PENDING REVIEW"}
        </span>
      </div>

      {suggestion.error ? (
        <p className="mt-3 text-sm text-muted-foreground">{suggestion.error}</p>
      ) : editing && isAgentSide ? (
        <div className="mt-4 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-medium">
              Category
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as Category)}
                className="mt-1 w-full rounded-lg border border-input bg-background px-2.5 py-2 text-sm"
              >
                {CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium">
              Priority
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value as Priority)}
                className="mt-1 w-full rounded-lg border border-input bg-background px-2.5 py-2 text-sm"
              >
                {PRIORITIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="text-xs font-medium">
            Summary
            <textarea
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              rows={2}
              maxLength={300}
              className="mt-1 w-full resize-none rounded-lg border border-input bg-background px-2.5 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium">
            Suggested first reply (visible to you when answering)
            <textarea
              value={responseDraft}
              onChange={(event) => setResponseDraft(event.target.value)}
              rows={3}
              maxLength={600}
              className="mt-1 w-full resize-none rounded-lg border border-input bg-background px-2.5 py-2 text-sm"
            />
          </label>
          {!ticket.assignedAgent && (
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={takeTicket}
                onChange={(event) => setTakeTicket(event.target.checked)}
                className="h-3.5 w-3.5 accent-[#3368A0]"
              />
              Assign this ticket to me
            </label>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={approve}
              disabled={busy}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Approve &amp; apply
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="sf-status-chip sf-status-assigned">
              <span className="sf-dot" />
              {suggestion.category || "—"}
            </span>
            {suggestion.priority && (
              <span className={priorityChipClass(suggestion.priority)}>{suggestion.priority} priority</span>
            )}
            {suggestion.sentiment && (
              <span className="rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
                {suggestion.sentiment}
              </span>
            )}
          </div>
          <p className="text-sm leading-relaxed">{suggestion.summary || "No summary generated."}</p>
          {suggestion.suggestedResponse && (
            <div className="rounded-xl border border-border p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Draft first reply
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {suggestion.suggestedResponse}
              </p>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">
            Provider: <span className="font-semibold">{suggestion.provider || "manual"}</span>
            {suggestion.reviewedBy ? " · reviewed by agent" : ""}
          </p>

          {pending && isAgentSide && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:-translate-y-0.5"
            >
              <Sparkles size={14} /> Review &amp; edit suggestion
            </button>
          )}
          {pending && !isAgentSide && (
            <p className="text-xs text-muted-foreground">
              An agent will review this suggestion before it is finalized.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Agent status controls                                                      */
/* -------------------------------------------------------------------------- */
function AgentActions({
  ticket,
  canOperate,
  isAdmin,
  onTicketUpdate,
  onFlash,
}: {
  ticket: Ticket;
  canOperate: boolean;
  isAdmin: boolean;
  onTicketUpdate: (ticket: Ticket) => void;
  onFlash: (text: string, kind?: "success" | "error") => void;
}) {
  const [busy, setBusy] = useState("");
  const [resolving, setResolving] = useState(false);
  const [resolutionNote, setResolutionNote] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [customerMessage, setCustomerMessage] = useState("");

  const claim = async () => {
    setBusy("claim");
    try {
      const data = await api.post<{ ticket: Ticket }>(`/api/tickets/${ticket.id}/assign`, {});
      onTicketUpdate(data.ticket);
      onFlash("Ticket assigned to you.");
    } catch (err) {
      onFlash(err instanceof ApiError ? err.message : "Could not claim the ticket.", "error");
    } finally {
      setBusy("");
    }
  };

  const setStatus = async (status: string) => {
    setBusy(status);
    try {
      const data = await api.patch<{ ticket: Ticket }>(`/api/tickets/${ticket.id}/status`, { status });
      onTicketUpdate(data.ticket);
      onFlash(`Status changed to ${STATUS_LABELS[status as keyof typeof STATUS_LABELS]}.`);
    } catch (err) {
      onFlash(err instanceof ApiError ? err.message : "Could not change the status.", "error");
    } finally {
      setBusy("");
    }
  };

  const draftResolution = async () => {
    setDrafting(true);
    try {
      const data = await api.post<{ resolutionSummary: string; customerMessage: string; provider: string }>(
        `/api/tickets/${ticket.id}/resolution-draft`,
        {}
      );
      setResolutionNote((prev) => prev || data.resolutionSummary);
      setCustomerMessage(data.customerMessage);
      onFlash(`AI drafted a resolution summary (${data.provider}). Edit before saving.`);
    } catch (err) {
      onFlash(err instanceof ApiError ? err.message : "AI draft unavailable — write it manually.", "error");
    } finally {
      setDrafting(false);
    }
  };

  const resolve = async (event: React.FormEvent) => {
    event.preventDefault();
    if (resolutionNote.trim().length < 10) {
      onFlash("A resolution note (min 10 characters) is required.", "error");
      return;
    }
    setBusy("resolve");
    try {
      // Optionally send the AI-crafted closing message first
      if (customerMessage.trim()) {
        await api.post(`/api/tickets/${ticket.id}/messages`, { content: customerMessage.trim() });
      }
      const data = await api.patch<{ ticket: Ticket }>(`/api/tickets/${ticket.id}/status`, {
        status: "resolved",
        resolutionNote: resolutionNote.trim(),
      });
      onTicketUpdate(data.ticket);
      setResolving(false);
      setResolutionNote("");
      setCustomerMessage("");
      onFlash("Ticket resolved.");
    } catch (err) {
      onFlash(err instanceof ApiError ? err.message : "Could not resolve the ticket.", "error");
    } finally {
      setBusy("");
    }
  };

  if (ticket.status === "resolved") return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Agent controls
      </h3>

      {!ticket.assignedAgent && (
        <button
          type="button"
          onClick={claim}
          disabled={busy === "claim" || (!isAdmin && false)}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {busy === "claim" ? <Loader2 size={14} className="animate-spin" /> : <UserRound size={14} />}
          Claim this ticket
        </button>
      )}

      {canOperate && (
        <div className="mt-3 flex flex-col gap-2">
          {ticket.status === "new" && (
            <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
              Review the AI suggestion first — approving it assigns this ticket to you.
            </p>
          )}
          {ticket.status === "assigned" && (
            <button
              type="button"
              onClick={() => setStatus("in_progress")}
              disabled={busy === "in_progress"}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-accent disabled:opacity-60"
            >
              {busy === "in_progress" ? <Loader2 size={14} className="animate-spin" /> : null}
              Start working (In Progress)
            </button>
          )}
          {ticket.status === "in_progress" && (
            <button
              type="button"
              onClick={() => setResolving(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--status-resolved)] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5"
            >
              <CheckCircle2 size={14} /> Resolve ticket…
            </button>
          )}
        </div>
      )}

      {!canOperate && (
        <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          {ticket.assignedAgent
            ? `Assigned to ${ticket.assignedAgent.name}.`
            : "Ticket not assigned yet."}
        </p>
      )}

      {/* Resolve dialog */}
      {resolving && (
        <form
          onSubmit={resolve}
          className="mt-4 flex flex-col gap-3 rounded-xl border border-[color-mix(in_srgb,var(--status-resolved)_35%,transparent)] p-4"
        >
          <p className="text-sm font-semibold">Resolve {ticket.ticketNumber}</p>
          <label className="text-xs font-medium">
            Resolution note (required, min 10 characters)
            <textarea
              value={resolutionNote}
              onChange={(event) => setResolutionNote(event.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Describe the root cause and the fix…"
              className="mt-1 w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium">
            Closing message to the customer (optional)
            <textarea
              value={customerMessage}
              onChange={(event) => setCustomerMessage(event.target.value)}
              rows={2}
              maxLength={1000}
              placeholder="Thank you for your patience…"
              className="mt-1 w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={busy === "resolve"}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--status-resolved)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy === "resolve" ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Confirm resolution
            </button>
            <button
              type="button"
              onClick={draftResolution}
              disabled={drafting}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-2.5 text-xs font-semibold transition-colors hover:bg-accent disabled:opacity-60"
            >
              {drafting ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              AI draft
            </button>
            <button
              type="button"
              onClick={() => setResolving(false)}
              className="rounded-xl border border-border px-3 py-2.5 text-xs font-semibold hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Reopen card                                                                */
/* -------------------------------------------------------------------------- */
function ReopenCard({
  ticket,
  onTicketUpdate,
  onFlash,
}: {
  ticket: Ticket;
  onTicketUpdate: (ticket: Ticket) => void;
  onFlash: (text: string, kind?: "success" | "error") => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const reopen = async (event: React.FormEvent) => {
    event.preventDefault();
    if (reason.trim().length < 5) {
      onFlash("Please give a short reason (min 5 characters).", "error");
      return;
    }
    setBusy(true);
    try {
      const data = await api.post<{ ticket: Ticket }>(`/api/tickets/${ticket.id}/reopen`, {
        reason: reason.trim(),
      });
      onTicketUpdate(data.ticket);
      setOpen(false);
      setReason("");
      onFlash("Ticket reopened — the conversation is unlocked.");
    } catch (err) {
      onFlash(err instanceof ApiError ? err.message : "Could not reopen the ticket.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Not solved?
      </h3>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-accent"
        >
          <RotateCcw size={14} /> Reopen this ticket
        </button>
      ) : (
        <form onSubmit={reopen} className="mt-3 flex flex-col gap-3">
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={2}
            maxLength={300}
            placeholder="What is still not working?"
            className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />} Reopen
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
