import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Camera,
  Check,
  ImagePlus,
  KeyRound,
  Loader2,
  Trash2,
  UserRound,
} from "lucide-react";
import AppShell from "./AppShell";
import UserAvatar from "./UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/api";
import { fileToAvatarDataUrl, setAvatar, removeAvatar, getAvatar } from "@/lib/avatar";
import { useApp, homeRouteFor } from "@/lib/store";
import type { User } from "@/lib/types";

/**
 * ProfileSettings — account settings for every signed-in role:
 *  · Profile picture (stored privately in this browser's localStorage)
 *  · Profile details (name, phone, company, location, bio → saved in MongoDB)
 *  · Password change (current password required)
 */
export default function ProfileSettings() {
  const { user, applyUser, navigate, notify } = useApp();

  // ---- profile picture -----------------------------------------------------
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

  useEffect(() => {
    setHasPhoto(Boolean(getAvatar(user?.id)));
  }, [user?.id]);

  if (!user) return null;

  const onPickPhoto = async (file: File | undefined) => {
    if (!file) return;
    setPhotoBusy(true);
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      const ok = setAvatar(user.id, dataUrl);
      if (!ok) throw new Error("This browser could not save the picture (storage full).");
      setHasPhoto(true);
      notify("Profile picture updated.", "success");
    } catch (err) {
      notify((err as Error).message || "Could not read that image.", "error");
    } finally {
      setPhotoBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const onRemovePhoto = () => {
    removeAvatar(user.id);
    setHasPhoto(false);
    notify("Profile picture removed.", "info");
  };

  return (
    <AppShell maxWidth="max-w-3xl">
      <div className="flex flex-col gap-6">
        {/* Page header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            aria-label="Back"
            onClick={() => navigate(homeRouteFor(user))}
            className="rounded-full"
          >
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Profile settings</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your photo, personal details and password.
            </p>
          </div>
        </div>

        <PhotoCard
          user={user}
          hasPhoto={hasPhoto}
          photoBusy={photoBusy}
          fileInputRef={fileInputRef}
          onPickPhoto={onPickPhoto}
          onRemovePhoto={onRemovePhoto}
        />
        <DetailsCard user={user} onSaved={applyUser} notify={notify} />
        <PasswordCard notify={notify} />
      </div>
    </AppShell>
  );
}

// ---------------------------------------------------------------------------
// Photo card
// ---------------------------------------------------------------------------
function PhotoCard({
  user,
  hasPhoto,
  photoBusy,
  fileInputRef,
  onPickPhoto,
  onRemovePhoto,
}: {
  user: User;
  hasPhoto: boolean;
  photoBusy: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onPickPhoto: (file: File | undefined) => void;
  onRemovePhoto: () => void;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
      <div className="flex flex-wrap items-center gap-5">
        <div className="relative">
          <UserAvatar user={user} size={88} ring />
          <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-card">
            <Camera size={14} />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold">Profile picture</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Square images work best. The picture is stored privately in this browser
            (localStorage) — it stays saved every time you visit.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onPickPhoto(e.target.files?.[0])}
            />
            <Button
              type="button"
              disabled={photoBusy}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl"
            >
              {photoBusy ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
              {hasPhoto ? "Change photo" : "Upload photo"}
            </Button>
            {hasPhoto && (
              <Button
                type="button"
                variant="outline"
                disabled={photoBusy}
                onClick={onRemovePhoto}
                className="rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 size={15} /> Remove
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Details card
// ---------------------------------------------------------------------------
function DetailsCard({
  user,
  onSaved,
  notify,
}: {
  user: User;
  onSaved: (user: User) => void;
  notify: (text: string, kind?: "info" | "success" | "error") => void;
}) {
  const [form, setForm] = useState({
    name: user.name,
    phone: user.phone || "",
    company: user.company || "",
    location: user.location || "",
    bio: user.bio || "",
  });
  const [fields, setFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const dirty =
    form.name !== user.name ||
    form.phone !== (user.phone || "") ||
    form.company !== (user.company || "") ||
    form.location !== (user.location || "") ||
    form.bio !== (user.bio || "");

  const save = async () => {
    setSaving(true);
    setFields({});
    try {
      const data = await api.patch<{ user: User }>("/api/auth/profile", form);
      onSaved(data.user);
      notify("Profile details saved.", "success");
    } catch (err) {
      const e = err as ApiError;
      setFields(e.fields || {});
      notify(e.message || "Could not save your profile.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
      <div className="flex items-center gap-2">
        <UserRound size={16} className="text-primary" />
        <h2 className="text-base font-semibold">Personal details</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        These details are saved to your account and shown to support agents.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pf-name">Full name</Label>
          <Input id="pf-name" value={form.name} onChange={set("name")} placeholder="Your name" />
          {fields.name && <p className="text-xs text-destructive">{fields.name}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pf-phone">Phone number</Label>
          <Input id="pf-phone" value={form.phone} onChange={set("phone")} placeholder="+92 300 1234567" />
          {fields.phone && <p className="text-xs text-destructive">{fields.phone}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pf-company">Company</Label>
          <Input id="pf-company" value={form.company} onChange={set("company")} placeholder="Company / organization" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pf-location">Location</Label>
          <Input id="pf-location" value={form.location} onChange={set("location")} placeholder="City, Country" />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="pf-bio">Bio</Label>
          <textarea
            id="pf-bio"
            value={form.bio}
            onChange={set("bio")}
            rows={3}
            maxLength={280}
            placeholder="A short introduction (max 280 characters)"
            className="w-full resize-none rounded-xl border border-input bg-transparent px-3.5 py-2.5 text-sm shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
          />
          <p className="text-right text-[11px] text-muted-foreground">{form.bio.length}/280</p>
        </div>

        {/* Read-only account facts */}
        <div className="flex flex-col gap-1.5">
          <Label>Email address</Label>
          <Input value={user.email} readOnly disabled className="opacity-70" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Role</Label>
          <Input value={user.role.charAt(0).toUpperCase() + user.role.slice(1)} readOnly disabled className="opacity-70 capitalize" />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-end gap-3">
        {dirty && <span className="text-xs text-muted-foreground">Unsaved changes</span>}
        <Button type="button" disabled={!dirty || saving} onClick={save} className="rounded-xl">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
          Save changes
        </Button>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Password card
// ---------------------------------------------------------------------------
function PasswordCard({
  notify,
}: {
  notify: (text: string, kind?: "info" | "success" | "error") => void;
}) {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [fields, setFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const change = async () => {
    const errs: Record<string, string> = {};
    if (form.newPassword.length < 8) errs.newPassword = "Password must be at least 8 characters.";
    if (form.newPassword !== form.confirm) errs.confirm = "Passwords do not match.";
    if (Object.keys(errs).length) {
      setFields(errs);
      return;
    }
    setSaving(true);
    setFields({});
    try {
      const data = await api.patch<{ message: string }>("/api/auth/password", {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setForm({ currentPassword: "", newPassword: "", confirm: "" });
      notify(data.message || "Password updated.", "success");
    } catch (err) {
      const e = err as ApiError;
      setFields(e.fields || {});
      notify(e.message || "Could not change the password.", "error");
    } finally {
      setSaving(false);
    }
  };

  const ready =
    form.currentPassword.length > 0 &&
    form.newPassword.length >= 8 &&
    form.confirm.length > 0;

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
      <div className="flex items-center gap-2">
        <KeyRound size={16} className="text-primary" />
        <h2 className="text-base font-semibold">Change password</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Choose a strong password of at least 8 characters. You stay signed in on this device.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pw-current">Current password</Label>
          <Input
            id="pw-current"
            type="password"
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={set("currentPassword")}
            placeholder="••••••••"
          />
          {fields.currentPassword && <p className="text-xs text-destructive">{fields.currentPassword}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pw-new">New password</Label>
          <Input
            id="pw-new"
            type="password"
            autoComplete="new-password"
            value={form.newPassword}
            onChange={set("newPassword")}
            placeholder="At least 8 characters"
          />
          {fields.newPassword && <p className="text-xs text-destructive">{fields.newPassword}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pw-confirm">Confirm new password</Label>
          <Input
            id="pw-confirm"
            type="password"
            autoComplete="new-password"
            value={form.confirm}
            onChange={set("confirm")}
            placeholder="Repeat new password"
          />
          {fields.confirm && <p className="text-xs text-destructive">{fields.confirm}</p>}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-end">
        <Button type="button" disabled={!ready || saving} onClick={change} className="rounded-xl">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
          Update password
        </Button>
      </div>
    </section>
  );
}
