

/**
 * AgentDashboard — the support agent's desk: live statistics, ticket queues
 * (my tickets / unassigned pool), leaderboard and quick triage actions.
 */
import { useMemo, useState } from "react";
import { Search, Sparkles, Trophy, Clock3 } from "lucide-react";
import AppShell from "./AppShell";
import FluidTabs from "./FluidTabs";
import DonutChart from "./DonutChart";
import AnimatedCounter from "./AnimatedCounter";
import TicketList from "./TicketList";
import { useStats, useTickets } from "@/hooks/use-supportflow";

type Scope = "all" | "mine" | "pool";

export default function AgentDashboard() {
  const { stats } = useStats();
  const [scope, setScope] = useState<Scope>("all");
  const { tickets, error, reload } = useTickets(scope !== "all" ? scope : undefined);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!tickets) return null;
    if (!search) return tickets;
    const needle = search.toLowerCase();
    return tickets.filter(
      (ticket) =>
        ticket.subject.toLowerCase().includes(needle) ||
        ticket.ticketNumber.toLowerCase().includes(needle) ||
        ticket.customer?.name.toLowerCase().includes(needle)
    );
  }, [tickets, search]);

  const pendingReview = useMemo(
    () => (tickets || []).filter((ticket) => ticket.aiSuggestion && !ticket.aiSuggestion.reviewed).length,
    [tickets]
  );

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Agent desk</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your queue and the unassigned pool — new tickets arrive in real time.
            </p>
          </div>
          {pendingReview > 0 && (
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground">
              <Sparkles size={13} /> {pendingReview} AI suggestion{pendingReview > 1 ? "s" : ""} awaiting review
            </span>
          )}
        </div>

        {/* Statistics — computed from live ticket data */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Open tickets
            </p>
            <p className="mt-2 text-3xl font-bold">
              <AnimatedCounter value={stats?.open ?? 0} />
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {stats ? `${stats.new} new · ${stats.assigned} assigned · ${stats.inProgress} in progress` : "—"}
            </p>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-5 shadow-card">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Resolved
              </p>
              <p className="mt-2 text-3xl font-bold">
                <AnimatedCounter value={stats?.resolved ?? 0} />
              </p>
              <p className="mt-1 text-xs text-muted-foreground">of {stats?.total ?? 0} total</p>
            </div>
            <DonutChart
              size={68}
              progress={stats?.resolutionRate ?? 0}
              circleWidth={7}
              progressWidth={7}
              progressClassName="text-[var(--status-resolved)]"
            >
              <span className="text-[10px] font-bold">{stats ? `${stats.resolutionRate}%` : ""}</span>
            </DonutChart>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Clock3 size={13} /> Avg. resolution
            </p>
            <p className="mt-2 text-3xl font-bold">
              {stats?.avgResolutionHours != null ? (
                <AnimatedCounter value={stats.avgResolutionHours} decimals={1} suffix="h" />
              ) : (
                "—"
              )}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{stats?.today ?? 0} new today</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Trophy size={13} /> Resolved by you
            </p>
            {stats?.leaderboard?.length ? (
              <ul className="mt-2 flex flex-col gap-1">
                {stats.leaderboard.slice(0, 3).map((row, index) => (
                  <li key={row.agent} className="flex items-center justify-between text-sm">
                    <span className={index === 0 ? "font-semibold" : "text-muted-foreground"}>
                      {row.agent}
                    </span>
                    <span className="font-semibold text-primary">{row.resolved}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">No resolutions yet</p>
            )}
          </div>
        </div>

        {/* Queue scope tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="w-full max-w-md">
            <FluidTabs
              defaultActiveIndex={0}
              activeIndex={{ all: 0, mine: 1, pool: 2 }[scope]}
              onActiveIndexChange={(index) => setScope((["all", "mine", "pool"] as const)[index])}
            >
              <FluidTabs.List aria-label="Ticket queue scope" className="max-w-md">
                <FluidTabs.Tab>
                  <FluidTabs.Label>All visible</FluidTabs.Label>
                </FluidTabs.Tab>
                <FluidTabs.Tab>
                  <FluidTabs.Label>Assigned to me</FluidTabs.Label>
                </FluidTabs.Tab>
                <FluidTabs.Tab>
                  <FluidTabs.Label>Unassigned pool</FluidTabs.Label>
                </FluidTabs.Tab>
              </FluidTabs.List>
            </FluidTabs>
          </div>
          <div className="relative w-full max-w-xs">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tickets or customers…"
              aria-label="Search tickets"
              className="w-full rounded-xl border border-input bg-card py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive">
            {error}{" "}
            <button type="button" onClick={reload} className="font-semibold underline">
              Retry
            </button>
          </div>
        ) : (
          <TicketList
            tickets={filtered}
            emptyHint={
              scope === "pool"
                ? "The unassigned pool is empty — great work!"
                : "No tickets match this view."
            }
          />
        )}
      </div>
    </AppShell>
  );
}
