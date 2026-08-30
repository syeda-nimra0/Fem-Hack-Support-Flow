

/**
 * AppShell — header + layout wrapper for authenticated areas.
 * Shows the live realtime connection status and the signed-in user.
 */
import { useEffect } from "react";
import { LogOut, Moon, Sun, LayoutGrid, Users, ShieldCheck, Wifi, WifiOff, Settings2, RefreshCw } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useSyncExternalStore } from "react";
import { useApp } from "@/lib/store";
import { retainSocket, releaseSocket, subscribeConnection, getConnectionSnapshot, isRealtimeEnabled } from "@/lib/socket";
import { cn } from "@/lib/utils";
import type { Route } from "@/lib/store";
import { useHydrated } from "@/hooks/use-hydrated";
import UserAvatar from "./UserAvatar";
import Logo from "./Logo";

const NAV_BY_ROLE: Record<string, { label: string; route: Route; icon: React.ReactNode }[]> = {
  customer: [
    { label: "My Tickets", route: { name: "customer" }, icon: <LayoutGrid size={15} /> },
    { label: "Settings", route: { name: "settings" }, icon: <Settings2 size={15} /> },
  ],
  agent: [
    { label: "Desk", route: { name: "agent" }, icon: <LayoutGrid size={15} /> },
    { label: "Settings", route: { name: "settings" }, icon: <Settings2 size={15} /> },
  ],
  admin: [
    { label: "Overview", route: { name: "admin" }, icon: <ShieldCheck size={15} /> },
    { label: "Agent Desk", route: { name: "agent" }, icon: <Users size={15} /> },
    { label: "Settings", route: { name: "settings" }, icon: <Settings2 size={15} /> },
  ],
};

export default function AppShell({
  children,
  maxWidth = "max-w-7xl",
}: {
  children: React.ReactNode;
  maxWidth?: string;
}) {
  const { user, route, navigate, logout } = useApp();
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useHydrated();
  const connected = useSyncExternalStore(subscribeConnection, getConnectionSnapshot, () => false);

  // Realtime connection + status indicator
  useEffect(() => {
    const socket = retainSocket();
    if (!socket) return;
    return () => {
      releaseSocket();
    };
  }, [user?.id]);

  if (!user) return null;
  const navItems = NAV_BY_ROLE[user.role] || [];
  const isDark = resolvedTheme === "dark";
  const realtimeOn = isRealtimeEnabled();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
        <div className={cn("mx-auto flex h-16 w-full items-center justify-between gap-3 px-4 sm:px-6", maxWidth)}>
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => navigate(navItems[0]?.route || { name: "customer" })}
              className="flex items-center gap-2.5"
              aria-label="SupportFlow home"
            >
              <Logo variant="mark" className="h-9 w-9 sm:hidden" />
              <Logo className="hidden h-9 sm:inline-flex" />
            </button>

            <nav className="flex items-center gap-1" aria-label="Primary">
              {navItems.map((item) => {
                const active = route.name === item.route.name;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => navigate(item.route)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    {item.icon}
                    <span className="hidden sm:inline">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={cn(
                "hidden items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold md:inline-flex",
                connected
                  ? "border-[color-mix(in_srgb,var(--status-resolved)_40%,transparent)] text-[var(--status-resolved)]"
                  : realtimeOn
                    ? "border-border text-muted-foreground"
                    : "border-[color-mix(in_srgb,var(--brand-soft)_45%,transparent)] text-[var(--brand-soft)]"
              )}
              title={
                connected
                  ? "Realtime connected (Socket.IO)"
                  : realtimeOn
                    ? "Realtime offline — reconnecting…"
                    : "Synced mode — data refreshes automatically every few seconds"
              }
            >
              {connected ? (
                <>
                  <Wifi size={13} /> Live
                </>
              ) : realtimeOn ? (
                <>
                  <WifiOff size={13} /> Offline
                </>
              ) : (
                <>
                  <RefreshCw size={13} /> Synced
                </>
              )}
            </span>

            <button
              type="button"
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-accent"
            >
              {mounted && isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <div className="flex items-center gap-2.5 rounded-full border border-border py-1 pl-1 pr-3">
              <button
                type="button"
                onClick={() => navigate({ name: "settings" })}
                aria-label="Profile settings"
                title="Profile settings"
                className="transition-transform hover:scale-105"
              >
                <UserAvatar user={user} size={30} />
              </button>
              <button
                type="button"
                onClick={() => navigate({ name: "settings" })}
                className="hidden text-left leading-tight transition-colors hover:text-primary sm:block"
              >
                <p className="text-xs font-semibold">{user.name}</p>
                <p className="text-[11px] capitalize text-muted-foreground">{user.role}</p>
              </button>
              <button
                type="button"
                onClick={logout}
                aria-label="Sign out"
                className="ml-1 text-muted-foreground transition-colors hover:text-destructive"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className={cn("mx-auto w-full flex-1 px-4 py-6 sm:px-6", maxWidth)}>{children}</main>
    </div>
  );
}
