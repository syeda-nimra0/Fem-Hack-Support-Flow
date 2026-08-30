

/**
 * TicketList — responsive list/grid of ticket cards with status & priority
 * chips, category, assignee and last-activity. Used by every dashboard.
 */
import { Loader2, MessageSquareText, UserRound } from "lucide-react";
import { useApp } from "@/lib/store";
import { statusChipClass, priorityChipClass, timeAgo, type Ticket } from "@/lib/types";

export default function TicketList({
  tickets,
  emptyHint = "No tickets match this filter.",
}: {
  tickets: Ticket[] | null;
  emptyHint?: string;
}) {
  const { navigate } = useApp();

  if (tickets === null) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[...Array(6)].map((_, index) => (
          <div key={index} className="sf-skeleton h-40 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card p-12 text-center">
        <Loader2 size={0} className="hidden" />
        <MessageSquareText size={24} className="text-primary" />
        <p className="text-sm text-muted-foreground">{emptyHint}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" role="list">
      {tickets.map((ticket) => (
        <button
          key={ticket.id}
          type="button"
          role="listitem"
          onClick={() => navigate({ name: "ticket", id: ticket.id })}
          className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 text-left shadow-card transition-all hover:-translate-y-1 hover:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xs font-semibold text-muted-foreground">
              {ticket.ticketNumber}
            </span>
            <span className={statusChipClass(ticket.status)}>
              <span className="sf-dot" />
              {ticket.status.replace("_", " ")}
            </span>
          </div>

          <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug group-hover:text-primary">
            {ticket.subject}
          </h3>

          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {ticket.description}
          </p>

          <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
            <span className={priorityChipClass(ticket.priority)}>{ticket.priority}</span>
            <span className="rounded-md bg-muted px-2 py-1 text-[11px] font-semibold text-muted-foreground">
              {ticket.category}
            </span>
            {ticket.aiSuggestion?.reviewed ? (
              <span
                className="rounded-md bg-accent px-2 py-1 text-[11px] font-semibold text-accent-foreground"
                title="AI suggestion reviewed by an agent"
              >
                AI reviewed
              </span>
            ) : ticket.aiSuggestion && !ticket.aiSuggestion.error ? (
              <span
                className="rounded-md border border-dashed border-primary/50 px-2 py-1 text-[11px] font-semibold text-primary"
                title="AI suggestion pending agent review"
              >
                AI pending
              </span>
            ) : null}
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              {ticket.assignedAgent ? (
                <>
                  <UserRound size={13} /> {ticket.assignedAgent.name}
                </>
              ) : (
                "Awaiting agent"
              )}
            </span>
            <span>{timeAgo(ticket.lastMessageAt || ticket.updatedAt)}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
