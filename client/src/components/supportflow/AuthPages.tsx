

/**
 * AuthPages — sign in / create account screens.
 * Demo credentials are one click away for the hackathon demonstration.
 */
import { useState } from "react";
import { useApp } from "@/lib/store";
import { ApiError } from "@/lib/api";
import { Loader2, Lock, Mail, User, ArrowLeft, Sparkles } from "lucide-react";
import Logo from "./Logo";

function DemoCredentialButton({ email, password, label }: { email: string; password: string; label: string }) {
  const { login } = useApp();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await login(email, password);
        } catch {
          setBusy(false);
        }
      }}
      className="flex w-full items-center justify-between rounded-xl border border-border bg-background px-4 py-3 text-left transition-colors hover:border-primary disabled:opacity-60"
    >
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-xs text-muted-foreground">
          {email} · {password}
        </span>
      </span>
      {busy ? (
        <Loader2 size={16} className="animate-spin text-primary" />
      ) : (
        <span className="text-xs font-semibold text-primary">Use →</span>
      )}
    </button>
  );
}

export function LoginPage() {
  const { login, navigate } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setFieldErrors({});
    try {
      await login(email, password);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFieldErrors(err.fields || {});
      } else {
        setError("Something went wrong. Please try again.");
      }
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your SupportFlow workspace.">
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field
          id="email"
          label="Email"
          icon={<Mail size={15} />}
          error={fieldErrors.email}
        >
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            required
          />
        </Field>
        <Field
          id="password"
          label="Password"
          icon={<Lock size={15} />}
          error={fieldErrors.password}
        >
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Your password"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            required
          />
        </Field>

        {error && (
          <p role="alert" className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-all hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          Sign in
        </button>
      </form>

      <div className="mt-8">
        <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Sparkles size={13} className="text-primary" /> Demo accounts — one click
        </p>
        <div className="flex flex-col gap-2">
          <DemoCredentialButton label="Customer" email="customer@supportflow.io" password="Demo@123" />
          <DemoCredentialButton label="Support Agent" email="agent@supportflow.io" password="Agent@123" />
          <DemoCredentialButton label="Administrator" email="admin@supportflow.io" password="Admin@123" />
        </div>
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        New to SupportFlow?{" "}
        <button type="button" onClick={() => navigate({ name: "register" })} className="font-semibold text-primary hover:underline">
          Create a customer account
        </button>
      </p>
    </AuthLayout>
  );
}

export function RegisterPage() {
  const { register, navigate } = useApp();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setFieldErrors({});
    if (password !== confirm) {
      setFieldErrors({ confirm: "Passwords do not match." });
      return;
    }
    setLoading(true);
    try {
      await register(name, email, password);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFieldErrors(err.fields || {});
      } else {
        setError("Something went wrong. Please try again.");
      }
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Create your account" subtitle="Open a customer workspace in seconds.">
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field id="name" label="Full name" icon={<User size={15} />} error={fieldErrors.name}>
          <input
            id="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Sarah Williams"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            required
          />
        </Field>
        <Field id="reg-email" label="Email" icon={<Mail size={15} />} error={fieldErrors.email}>
          <input
            id="reg-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            required
          />
        </Field>
        <Field
          id="reg-password"
          label="Password"
          icon={<Lock size={15} />}
          error={fieldErrors.password}
          hint="At least 8 characters"
        >
          <input
            id="reg-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Create a password"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            required
            minLength={8}
          />
        </Field>
        <Field id="confirm" label="Confirm password" icon={<Lock size={15} />} error={fieldErrors.confirm}>
          <input
            id="confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            placeholder="Repeat your password"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            required
          />
        </Field>

        {error && (
          <p role="alert" className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-all hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          Create account
        </button>
      </form>

      <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
        Public registration creates a customer account. Support agent and administrator accounts are
        provisioned by the team — use the demo credentials on the sign-in page to explore those
        roles.
      </p>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already registered?{" "}
        <button type="button" onClick={() => navigate({ name: "login" })} className="font-semibold text-primary hover:underline">
          Sign in instead
        </button>
      </p>
    </AuthLayout>
  );
}

function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const { navigate } = useApp();
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div className="sf-dotgrid pointer-events-none absolute inset-0 opacity-50" aria-hidden />
      <div className="relative w-full max-w-md">
        <button
          type="button"
          onClick={() => navigate({ name: "landing" })}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft size={15} /> Back to home
        </button>
        <div className="rounded-3xl border border-border bg-card p-7 shadow-card">
          <Logo className="mb-5 h-12" />
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  icon,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <div
        className={`flex items-center gap-3 rounded-xl border bg-background px-4 py-3 transition-colors focus-within:ring-2 focus-within:ring-ring ${
          error ? "border-destructive" : "border-input"
        }`}
      >
        <span className="text-muted-foreground">{icon}</span>
        {children}
      </div>
      {error ? (
        <p className="mt-1.5 text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
