

/**
 * ChatWidget — "Flow", the AI support assistant (Gemini via backend proxy).
 * Available on the landing page and inside the app. The API key never
 * reaches the browser — all calls go through /api/ai/chat.
 */
import { useEffect, useRef, useState } from "react";
import { Send, X, Loader2, MessageCircle, Sparkles } from "lucide-react";
import Logo from "./Logo";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ChatLine {
  role: "user" | "assistant";
  content: string;
  provider?: string;
}

/** Renders **bold** and line breaks from AI replies without pulling in a markdown dependency. */
function Markdownish({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((part, index) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={index}>{part.slice(2, -2)}</strong>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  );
}

const GREETING: ChatLine = {
  role: "assistant",
  content:
    "Hi, I'm Flow — the SupportFlow AI assistant. Ask me how ticketing works, or describe an issue and I'll point you in the right direction.",
};

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<ChatLine[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, open, busy]);

  const send = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setLines((prev) => [...prev, { role: "user", content: text }]);
    setBusy(true);
    try {
      const history = [...lines, { role: "user" as const, content: text }].slice(-10);
      const data = await api.post<{ reply: string; provider: string }>("/api/ai/chat", {
        messages: history,
      });
      setLines((prev) => [...prev, { role: "assistant", content: data.reply, provider: data.provider }]);
    } catch (err) {
      setLines((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            err instanceof ApiError && err.status === 429
              ? "You're sending messages a bit fast — give me a few seconds and try again."
              : "I'm having trouble connecting right now. If you're signed in, you can also create a ticket and a human agent will follow up.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* Launcher */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? "Close the AI assistant" : "Open the AI assistant"}
        className={cn(
          "fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full",
          "bg-primary text-primary-foreground shadow-card transition-transform hover:scale-105",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        )}
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {/* Panel */}
      {open && (
        <div
          role="dialog"
          aria-label="SupportFlow AI assistant"
          className="fixed bottom-24 right-5 z-50 flex h-[min(560px,75vh)] w-[min(400px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card"
        >
          <div className="flex items-center gap-3 border-b border-border bg-primary px-5 py-4 text-primary-foreground">
            <Logo variant="mark" className="h-10 w-10 rounded-xl bg-primary-foreground/10" />
            <div>
              <p className="text-sm font-semibold">Flow · AI Assistant</p>
              <p className="text-[11px] opacity-80">Powered by Gemini — answers in seconds</p>
            </div>
          </div>

          <div ref={scrollRef} className="thin-scrollbar flex-1 space-y-3 overflow-y-auto p-4">
            {lines.map((line, index) => (
              <div key={index} className={cn("flex", line.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "sf-bubble max-w-[85%] whitespace-pre-wrap",
                    line.role === "user" ? "sf-bubble-customer" : "border border-border bg-background"
                  )}
                >
                  <Markdownish text={line.content} />
                  {line.provider && line.role === "assistant" && (
                    <span className="mt-1.5 block text-[10px] opacity-60">via {line.provider}</span>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex items-center gap-2 self-start rounded-full border border-border bg-muted px-4 py-2.5">
                <Loader2 size={13} className="animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">Flow is thinking…</span>
              </div>
            )}
          </div>

          <form onSubmit={send} className="border-t border-border p-3">
            <div className="flex items-end gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about tickets, billing, account…"
                aria-label="Message the AI assistant"
                maxLength={2000}
                className="flex-1 rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                aria-label="Send"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50"
              >
                <Send size={15} />
              </button>
            </div>
            <p className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
              <Sparkles size={10} /> AI answers may be imperfect — sign in to reach a human agent.
            </p>
          </form>
        </div>
      )}
    </>
  );
}
