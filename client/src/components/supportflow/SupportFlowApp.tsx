

/**
 * SupportFlow — application root.
 * Single-page app (the sandbox exposes one Next.js route): a tiny hash router
 * switches between the landing page, auth screens and role-based dashboards.
 */
import { useEffect } from "react";
import { useApp, homeRouteFor, type Route } from "@/lib/store";
import LandingPage from "@/components/supportflow/LandingPage";
import { LoginPage, RegisterPage } from "@/components/supportflow/AuthPages";
import CustomerDashboard from "@/components/supportflow/CustomerDashboard";
import AgentDashboard from "@/components/supportflow/AgentDashboard";
import AdminDashboard from "@/components/supportflow/AdminDashboard";
import TicketDetail from "@/components/supportflow/TicketDetail";
import ProfileSettings from "@/components/supportflow/ProfileSettings";
import ChatWidget from "@/components/supportflow/ChatWidget";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";

const PUBLIC_ROUTES: Route["name"][] = ["landing", "login", "register"];

export default function SupportFlowApp() {
  const { user, route, hydrated, hydrate, navigate, toastMessage, clearNotify } = useApp();
  const { toast } = useToast();

  // Boot: restore session + hash router
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Auth guard: protected areas require a session; authed users skip login screens
  useEffect(() => {
    if (!hydrated) return;
    if (!user && !PUBLIC_ROUTES.includes(route.name)) {
      navigate({ name: "login" }, true);
    } else if (user && (route.name === "login" || route.name === "register")) {
      navigate(homeRouteFor(user), true);
    }
  }, [hydrated, user, route.name, navigate]);

  // Surface store notifications as toasts
  useEffect(() => {
    if (!toastMessage) return;
    toast({
      description: toastMessage.text,
      variant: toastMessage.kind === "error" ? "destructive" : undefined,
    });
    clearNotify();
  }, [toastMessage, toast, clearNotify]);

  // Scroll to top when switching views
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [route.name, route.name === "ticket" ? route.id : ""]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <span className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading SupportFlow…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {route.name === "landing" && <LandingPage />}
      {route.name === "login" && <LoginPage />}
      {route.name === "register" && <RegisterPage />}
      {route.name === "customer" && user && <CustomerDashboard />}
      {route.name === "agent" && user && <AgentDashboard />}
      {route.name === "admin" && user && <AdminDashboard />}
      {route.name === "settings" && user && <ProfileSettings />}
      {route.name === "ticket" && user && <TicketDetail id={route.id} />}
      <ChatWidget />
      <Toaster />
    </>
  );
}
