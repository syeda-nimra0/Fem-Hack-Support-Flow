

/**
 * AdminDashboard — supervisor overview: global statistics, category mix and
 * the full ticket board across every agent and customer.
 */
import { useMemo, useState } from "react";
import { LayoutGrid, ListFilter } from "lucide-react";
import AppShell from "./AppShell";
import FluidTabs from "./FluidTabs";
import DonutChart from "./DonutChart";
import AnimatedCounter from "./AnimatedCounter";
import TicketList from "./TicketList";
import { useStats, useTickets } from "@/hooks/use-supportflow";
import { useApp } from "@/lib/store";
import type { TicketStatus } from "@/lib/types";

const STATUS_COLORS: Record<string, string> = {
  new: "text-[var(--status-new)]",
  assigned: "text-[var(--status-assigned)]",
  in_progress: "text-[var(--status-progress)]",
  resolved: "text-[var(--status-resolved)]",
};

export default function AdminDashboard() {
  const { navigate } = useApp();
  const { stats } = useStats();
  const { tickets, error, reload } = useTickets();
  const [statusFilter, setStatusFilter] = useState<"all" | TicketStatus>("all");

  const filtered = useMemo(
    () => (tickets ? tickets.filter((t) => statusFilter === "all" || t.status === statusFilter) : null),
    [tickets, statusFilter]
  );

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Administrator overview</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Every ticket, every agent — statistics computed live from the database.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate({ name: "agent" })}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <LayoutGrid size={15} /> Open agent desk
          </button>
        </div>

        {/* Global stats */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total tickets", value: stats?.total, suffix: "" },
            { label: "Open", value: stats?.open, suffix: "" },
            { label: "Resolved", value: stats?.resolved, suffix: "" },
            { label: "New today", value: stats?.today, suffix: "" },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {card.label}
              </p>
              <p className="mt-2 text-3xl font-bold">
                {card.value === undefined ? "" : <AnimatedCounter value={card.value} suffix={card.suffix} />}
              </p>
            </div>
          ))}
        </div>

        {/* Category + status + leaderboard */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Category mix
            </h2>
            <ul className="mt-4 flex flex-col gap-3">
              {(stats?.byCategory || []).slice(0, 6).map((row) => {
                const max = Math.max(...(stats?.byCategory || []).map((r) => r.count), 1);
                return (
                  <li key={row.category}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{row.category}</span>
                      <span className="font-semibold">{row.count}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${(row.count / max) * 100}%` }}
                      />
                    </div>
                  </li>
                );
              })}
              {!stats?.byCategory?.length && <p className="text-sm text-muted-foreground">No data yet</p>}
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Status breakdown
            </h2>
            <div className="mt-4 flex flex-col items-center gap-4">
              <DonutChart
                size={140}
                progress={stats ? (stats.resolved / Math.max(1, stats.total)) * 100 : 0}
                circleWidth={14}
                progressWidth={14}
                progressClassName="text-[var(--status-resolved)]"
              >
                <span className="text-lg font-bold">{stats ? `${stats.resolutionRate}%` : ""}</span>
                <span className="text-[10px] text-muted-foreground">resolved</span>
              </DonutChart>
              <ul className="grid w-full grid-cols-2 gap-2">
                {(["new", "assigned", "in_progress", "resolved"] as TicketStatus[]).map((status) => (
                  <li key={status} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-xs">
                    <span className={STATUS_COLORS[status]}>{status.replace("_", " ")}</span>
                    <span className="font-bold">
                      {status === "new" ? stats?.new : status === "assigned" ? stats?.assigned : status === "in_progress" ? stats?.inProgress : stats?.resolved}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Agent leaderboard
            </h2>
            <ul className="mt-4 flex flex-col gap-3">
              {(stats?.leaderboard || []).map((row, index) => (
                <li key={row.agent} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-3">
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: ["#3368A0", "#66A3BF", "#4E8D6E"][index % 3] }}
                    >
                      {index + 1}
                    </span>
                    {row.agent}
                  </span>
                  <span className="font-semibold text-primary">{row.resolved} resolved</span>
                </li>
              ))}
              {!stats?.leaderboard?.length && (
                <p className="text-sm text-muted-foreground">No resolutions recorded yet.</p>
              )}
            </ul>
          </div>
        </div>

        {/* All tickets */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <ListFilter size={15} /> All tickets
          </div>
          <div className="w-full max-w-xl">
            <FluidTabs
              defaultActiveIndex={0}
              activeIndex={{ all: 0, new: 1, assigned: 2, in_progress: 3, resolved: 4 }[statusFilter]}
              onActiveIndexChange={(index) =>
                setStatusFilter((["all", "new", "assigned", "in_progress", "resolved"] as const)[index])
              }
            >
              <FluidTabs.List aria-label="Status filter" className="max-w-xl">
                {["All", "New", "Assigned", "In progress", "Resolved"].map((label) => (
                  <FluidTabs.Tab key={label}>
                    <FluidTabs.Label>{label}</FluidTabs.Label>
                  </FluidTabs.Tab>
                ))}
              </FluidTabs.List>
            </FluidTabs>
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
          <TicketList tickets={filtered} emptyHint="No tickets match this filter." />
        )}
      </div>
    </AppShell>
  );
}
