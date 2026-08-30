

import { create } from "zustand";
import { api, clearSession, setSession, getStoredUser } from "./api";
import type { User } from "./types";
import { resetSocket } from "./socket";

/**
 * Hash-based router. The sandbox exposes a single Next.js route (`/`),
 * so the app behaves like a SPA: `#/`, `#/login`, `#/tickets/:id`, `#/agent` …
 */
export type Route =
  | { name: "landing" }
  | { name: "login" }
  | { name: "register" }
  | { name: "customer" }
  | { name: "agent" }
  | { name: "admin" }
  | { name: "settings" }
  | { name: "ticket"; id: string };

export function parseHash(hash: string): Route {
  const clean = hash.replace(/^#\/?/, "");
  const parts = clean.split("/").filter(Boolean);
  if (parts.length === 0) return { name: "landing" };
  switch (parts[0]) {
    case "login":
      return { name: "login" };
    case "register":
      return { name: "register" };
    case "tickets":
      return parts[1] ? { name: "ticket", id: parts[1] } : { name: "customer" };
    case "agent":
      return { name: "agent" };
    case "admin":
      return { name: "admin" };
    case "settings":
      return { name: "settings" };
    case "dashboard":
      return { name: "customer" };
    default:
      return { name: "landing" };
  }
}

export function routeToHash(route: Route): string {
  switch (route.name) {
    case "landing":
      return "#/";
    case "login":
      return "#/login";
    case "register":
      return "#/register";
    case "customer":
      return "#/dashboard";
    case "agent":
      return "#/agent";
    case "admin":
      return "#/admin";
    case "settings":
      return "#/settings";
    case "ticket":
      return `#/tickets/${route.id}`;
  }
}

export function homeRouteFor(user: User | null): Route {
  if (!user) return { name: "landing" };
  if (user.role === "customer") return { name: "customer" };
  if (user.role === "agent") return { name: "agent" };
  return { name: "admin" };
}

interface AppState {
  user: User | null;
  route: Route;
  hydrated: boolean;
  toastMessage: { text: string; kind: "info" | "success" | "error" } | null;
  hydrate: () => void;
  navigate: (route: Route, replace?: boolean) => void;
  setUser: (user: User | null) => void;
  /** Update the user after a profile edit (persists to localStorage too). */
  applyUser: (user: User) => void;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  logout: () => void;
  notify: (text: string, kind?: "info" | "success" | "error") => void;
  clearNotify: () => void;
}

export const useApp = create<AppState>((set, get) => ({
  user: null,
  route: { name: "landing" },
  hydrated: false,
  toastMessage: null,

  hydrate: () => {
    if (get().hydrated) return;
    const user = getStoredUser<User>();
    const route = parseHash(window.location.hash);
    set({
      user,
      hydrated: true,
      route: user && route.name === "landing" ? homeRouteFor(user) : route,
    });

    window.addEventListener("hashchange", () => {
      const next = parseHash(window.location.hash);
      set({ route: next });
    });

    // Revalidate the session in the background
    if (user) {
      api
        .get<{ user: User }>("/api/auth/me")
        .then(({ user: fresh }) => set({ user: fresh }))
        .catch(() => {
          clearSession();
          resetSocket();
          set({ user: null, route: { name: "landing" } });
        });
    }
  },

  navigate: (route, replace) => {
    const hash = routeToHash(route);
    if (window.location.hash === hash) {
      set({ route });
      return;
    }
    if (replace) {
      window.history.replaceState(null, "", hash);
      set({ route });
    } else {
      window.location.hash = hash;
    }
  },

  setUser: (user) => set({ user }),

  applyUser: (user) => {
    const token = typeof window !== "undefined" ? window.localStorage.getItem("supportflow_token") : null;
    if (token) {
      window.localStorage.setItem("supportflow_user", JSON.stringify(user));
    }
    set({ user });
  },

  login: async (email, password) => {
    const data = await api.post<{ token: string; user: User }>("/api/auth/login", {
      email,
      password,
    });
    setSession(data.token, data.user);
    resetSocket();
    set({ user: data.user });
    get().navigate(homeRouteFor(data.user), true);
    return data.user;
  },

  register: async (name, email, password) => {
    const data = await api.post<{ token: string; user: User }>("/api/auth/register", {
      name,
      email,
      password,
    });
    setSession(data.token, data.user);
    resetSocket();
    set({ user: data.user });
    get().navigate(homeRouteFor(data.user), true);
    return data.user;
  },

  logout: () => {
    clearSession();
    resetSocket();
    set({ user: null, route: { name: "landing" } });
    get().navigate({ name: "landing" }, true);
  },

  notify: (text, kind = "info") => set({ toastMessage: { text, kind } }),
  clearNotify: () => set({ toastMessage: null }),
}));
