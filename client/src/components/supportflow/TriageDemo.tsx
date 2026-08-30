

/**
 * TriageDemo — interactive landing-page demo of the AI triage engine.
 * Calls POST /api/ai/triage-preview (backend proxies to Gemini → GLM → rules).
 */
import { useState } from "react";
import { Sparkles, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { priorityChipClass, type Category, type Priority } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Suggestion {
  category: Category;
  priority: Priority;
  summary: string;
  suggestedResponse: string;
  sentiment: string;
  provider: string;
}

const EXAMPLES = [
  "I was charged twice for the same order and need one payment refunded.",
  "The app keeps crashing every time I open the reports page — very frustrating, I have a meeting in an hour!",
  "How do I add extra seats to my team plan mid-month?",
];

const PROVIDER_LABEL: Record<string, string> = {
  gemini: "Google Gemini",
  glm: "GLM (fallback)",
  rules: "Rules engine (offline fallback)",
};

export default function TriageDemo() {
  const [text, setText] = useState(EXAMPLES[0]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Suggestion | null>(null);
  const [error, setError] = useState("");

  const analyze = async (value?: string) => {
    const description = (value ?? text).trim();
    if (description.length < 10) {
      setError("Please describe the issue with at least 10 characters.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await api.post<{ suggestion: Suggestion }>("/api/ai/triage-preview", {
        subject: description.slice(0, 60),
        description,
      });
      setResult(data.suggestion);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The AI service is unavailable right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Input side */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Customer complaint
          </h3>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            Live AI call
          </span>
        </div>
        <label htmlFor="triage-input" className="sr-only">
          Describe a customer complaint
        </label>
        <textarea
          id="triage-input"
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={5}
          maxLength={600}
          placeholder="Type a customer complaint, e.g. about a duplicate charge…"
          className="w-full resize-none rounded-xl border border-input bg-background p-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((example, index) => (
            <button
              key={index}
              type="button"
              onClick={() => {
                setText(example);
                analyze(example);
              }}
              className="max-w-full truncate rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              Example {index + 1}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => analyze()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-all hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {loading ? "Analyzing with AI…" : "Run AI triage"}
        </button>
        {error && (
          <p role="alert" className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle size={15} /> {error}
          </p>
        )}
      </div>

      {/* Result side */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            AI triage suggestion
          </h3>
          {result && (
            <button
              type="button"
              onClick={() => analyze()}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <RefreshCw size={13} /> Re-run
            </button>
          )}
        </div>

        {!result && !loading && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border p-8 text-center">
            <Sparkles size={22} className="text-primary" />
            <p className="max-w-xs text-sm text-muted-foreground">
              Run the triage to see the suggested category, priority and summary — exactly what an
              agent reviews before acting.
            </p>
          </div>
        )}

        {loading && (
          <div className="flex flex-1 flex-col gap-4 rounded-xl border border-dashed border-border p-8">
            <div className="sf-skeleton h-6 w-2/3 rounded-md" />
            <div className="sf-skeleton h-5 w-1/3 rounded-md" />
            <div className="sf-skeleton h-16 w-full rounded-md" />
            <p className="text-center text-xs text-muted-foreground">
              Gemini analyzes the complaint and validates the output…
            </p>
          </div>
        )}

        {result && !loading && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="sf-status-chip sf-status-assigned">
                <span className="sf-dot" />
                {result.category}
              </span>
              <span className={priorityChipClass(result.priority)}>{result.priority} priority</span>
              <span className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                {result.sentiment}
              </span>
            </div>
            <div className="rounded-xl bg-muted p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Summary
              </p>
              <p className="mt-1 text-sm leading-relaxed">{result.summary}</p>
            </div>
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Suggested first reply
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {result.suggestedResponse}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Provider:{" "}
              <span className={cn("font-semibold", result.provider === "gemini" && "text-primary")}>
                {PROVIDER_LABEL[result.provider] || result.provider}
              </span>
              {" — always validated and reviewed by a human agent before it is applied."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
