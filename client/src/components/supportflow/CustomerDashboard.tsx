

/**
 * CustomerDashboard — the customer's workspace: personal stats, ticket list
 * with filters (FluidTabs), and the New Ticket flow with AI triage review.
 */
import { useMemo, useState } from "react";
import { Loader2, Plus, Ticket as TicketIcon, Search } from "lucide-react";
import AppShell from "./AppShell";
import FluidTabs from "./FluidTabs";
import DonutChart from "./DonutChart";
import TicketList from "./TicketList";
import NewTicketDialog from "./NewTicketDialog";
import { useStats, useTickets } from "@/hooks/use-supportflow";
import { useApp } from "@/lib/store";
import type { TicketStatus } from "@/lib/types";

export default function CustomerDashboard() {
  const { user } = useApp();
  const { stats } = useStats();
  const { tickets, error, reload } = useTickets();
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!tickets) return null;
    return tickets.filter((ticket) => {
      if (filter === "open" && ticket.status === "resolved") return false;
      if (filter === "resolved" && ticket.status !== "resolved") return false;
      if (search) {
        const needle = search.toLowerCase();
        return (
          ticket.subject.toLowerCase().includes(needle) ||
          ticket.ticketNumber.toLowerCase().includes(needle)
        );
      }
      return true;
    });
  }, [tickets, filter, search]);

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        {/* Header row */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Hello, {user?.name.split(" ")[0]}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Track your requests and talk to your support agent — everything updates live.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-all hover:-translate-y-0.5"
          >
            <Plus size={16} /> New ticket
          </button>
        </div>

        {/* Personal stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total requests" value={stats?.total} />
          <StatCard label="Open" value={stats?.open} accent="var(--status-progress)" />
          <StatCard label="Resolved" value={stats?.resolved} accent="var(--status-resolved)" />
          <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-5 shadow-card">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Resolution rate
              </p>
              <p className="mt-2 text-2xl font-bold">
                {stats ? `${stats.resolutionRate}%` : <LoadingDot />}
              </p>
            </div>
            <DonutChart
              size={64}
              progress={stats?.resolutionRate ?? 0}
              circleWidth={7}
              progressWidth={7}
              progressClassName="text-[var(--status-resolved)]"
            >
              <span className="text-[10px] font-bold">{stats ? `${stats.resolutionRate}%` : ""}</span>
            </DonutChart>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="w-full max-w-sm">
            <FluidTabs defaultActiveIndex={0} activeIndex={{ all: 0, open: 1, resolved: 2 }[filter]} onActiveIndexChange={(index) => setFilter((["all", "open", "resolved"] as const)[index])}>
              <FluidTabs.List aria-label="Filter tickets" className="max-w-xs">
                <FluidTabs.Tab>
                  <FluidTabs.Label>All</FluidTabs.Label>
                </FluidTabs.Tab>
                <FluidTabs.Tab>
                  <FluidTabs.Label>Open</FluidTabs.Label>
                </FluidTabs.Tab>
                <FluidTabs.Tab>
                  <FluidTabs.Label>Resolved</FluidTabs.Label>
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
              placeholder="Search subject or TKT number…"
              aria-label="Search tickets"
              className="w-full rounded-xl border border-input bg-card py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Ticket list */}
        {error ? (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive">
            {error}{" "}
            <button type="button" onClick={reload} className="font-semibold underline">
              Retry
            </button>
          </div>
        ) : (
          <TicketList tickets={filtered} emptyHint="You have not created any tickets yet — start with “New ticket”." />
        )}
      </div>

      <NewTicketDialog open={creating} onClose={() => setCreating(false)} onCreated={() => reload()} />
    </AppShell>
  );
}

function StatCard({ label, value, accent }: { label: string; value?: number; accent?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-bold" style={accent ? { color: accent } : undefined}>
        {value === undefined ? <LoadingDot /> : value}
      </p>
    </div>
  );
}

function LoadingDot() {
  return <Loader2 size={20} className="inline-block animate-spin text-muted-foreground" />;
}

// Re-export for convenience
export { TicketIcon };
export type { TicketStatus };
