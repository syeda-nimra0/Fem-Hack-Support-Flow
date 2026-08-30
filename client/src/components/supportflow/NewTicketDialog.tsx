

/**
 * NewTicketDialog — customer ticket creation.
 * Step 1: subject / description / optional category.
 * Step 2: the created ticket + its AI triage suggestion (category, priority,
 * summary, draft reply) — shown for transparency before an agent reviews it.
 */
import { useState } from "react";
import { Sparkles, X, Loader2, CheckCircle2, ArrowRight, AlertTriangle } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { CATEGORIES, type Category, type Ticket } from "@/lib/types";
import { priorityChipClass } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function NewTicketDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}) {
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [created, setCreated] = useState<Ticket | null>(null);

  if (!open) return null;

  const reset = () => {
    setSubject("");
    setDescription("");
    setCategory("");
    setError("");
    setFieldErrors({});
    setCreated(null);
  };

  const close = () => {
    onClose();
    setTimeout(reset, 200);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setFieldErrors({});
    try {
      const data = await api.post<{ ticket: Ticket }>("/api/tickets", {
        subject,
        description,
        category: category || undefined,
      });
      setCreated(data.ticket);
      onCreated?.();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFieldErrors(err.fields || {});
      } else {
        setError("Could not create the ticket. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Create a support ticket"
      onClick={(event) => event.target === event.currentTarget && close()}
    >
      <div className="relative w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8">
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X size={18} />
        </button>

        {!created ? (
          <>
            <h2 className="text-xl font-bold tracking-tight">New support ticket</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Describe your issue — our AI triages it instantly and an agent reviews it before
              responding.
            </p>

            <form onSubmit={submit} className="mt-6 flex flex-col gap-4" noValidate>
              <div>
                <label htmlFor="ticket-subject" className="mb-1.5 block text-sm font-medium">
                  Subject <span className="text-destructive">*</span>
                </label>
                <input
                  id="ticket-subject"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="Short summary of the issue"
                  maxLength={200}
                  className={cn(
                    "w-full rounded-xl border bg-background px-4 py-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring",
                    fieldErrors.subject ? "border-destructive" : "border-input"
                  )}
                  required
                />
                {fieldErrors.subject && (
                  <p className="mt-1.5 text-xs text-destructive">{fieldErrors.subject}</p>
                )}
              </div>

              <div>
                <label htmlFor="ticket-description" className="mb-1.5 block text-sm font-medium">
                  What happened? <span className="text-destructive">*</span>
                </label>
                <textarea
                  id="ticket-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Include what you were doing, what you expected, and any error messages…"
                  rows={5}
                  maxLength={5000}
                  className={cn(
                    "w-full resize-none rounded-xl border bg-background px-4 py-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring",
                    fieldErrors.description ? "border-destructive" : "border-input"
                  )}
                  required
                />
                {fieldErrors.description && (
                  <p className="mt-1.5 text-xs text-destructive">{fieldErrors.description}</p>
                )}
              </div>

              <div>
                <label htmlFor="ticket-category" className="mb-1.5 block text-sm font-medium">
                  Category <span className="font-normal text-muted-foreground">(optional — AI will suggest one)</span>
                </label>
                <select
                  id="ticket-category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value as Category | "")}
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring"
                >
                  <option value="">Let AI decide</option>
                  {CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <p role="alert" className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground transition-all hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Submitting &amp; running AI triage…
                  </>
                ) : (
                  <>
                    <Sparkles size={16} /> Submit ticket
                  </>
                )}
              </button>
              <p className="text-center text-xs text-muted-foreground">
                Ticket creation runs the AI triage — this can take a few seconds.
              </p>
            </form>
          </>
        ) : (
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--status-resolved)_15%,transparent)] text-[var(--status-resolved)]">
                <CheckCircle2 size={22} />
              </span>
              <div>
                <h2 className="text-xl font-bold tracking-tight">Ticket {created.ticketNumber} created</h2>
                <p className="text-sm text-muted-foreground">Our AI already triaged it for the team.</p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-border bg-background p-5">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                <Sparkles size={13} /> AI triage suggestion
                {!created.aiSuggestion?.error && created.aiSuggestion?.provider && (
                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium normal-case text-muted-foreground">
                    {created.aiSuggestion.provider}
                  </span>
                )}
              </p>

              {created.aiSuggestion?.error ? (
                <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0 text-[var(--status-progress)]" />
                  {created.aiSuggestion.error}
                </p>
              ) : (
                <>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="sf-status-chip sf-status-assigned">
                      <span className="sf-dot" />
                      {created.aiSuggestion?.category}
                    </span>
                    {created.aiSuggestion?.priority && (
                      <span className={priorityChipClass(created.aiSuggestion.priority)}>
                        {created.aiSuggestion.priority} priority
                      </span>
                    )}
                    {created.aiSuggestion?.sentiment && (
                      <span className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                        {created.aiSuggestion.sentiment}
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-sm leading-relaxed">{created.aiSuggestion?.summary}</p>
                </>
              )}

              <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
                An agent will review and confirm these suggestions before working on your ticket —
                you will see every update right here.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={close}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-all hover:-translate-y-0.5"
              >
                View my tickets <ArrowRight size={15} />
              </button>
              <button
                type="button"
                onClick={reset}
                className="rounded-xl border border-border px-5 py-3 text-sm font-semibold transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                Create another
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
