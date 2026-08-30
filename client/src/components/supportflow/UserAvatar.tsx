import { useEffect, useState } from "react";
import { getAvatar, AVATAR_CHANGED_EVENT } from "@/lib/avatar";
import { cn } from "@/lib/utils";

function initialsOf(name: string): string {
  return (
    name
      .split(" ")
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

/**
 * Avatar for any user: shows the profile picture from localStorage when one
 * exists (the current user's own picture) and falls back to a colored circle
 * with initials. All instances refresh instantly when the picture changes.
 */
export default function UserAvatar({
  user,
  size = 32,
  className,
  ring = false,
}: {
  user: { id?: string | null; name: string; avatarColor?: string } | null | undefined;
  size?: number;
  className?: string;
  ring?: boolean;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const id = user?.id || null;

  useEffect(() => {
    const update = () => setSrc(getAvatar(id));
    update();
    if (typeof window === "undefined") return;
    window.addEventListener(AVATAR_CHANGED_EVENT, update);
    return () => window.removeEventListener(AVATAR_CHANGED_EVENT, update);
  }, [id]);

  if (!user) return null;

  const style = {
    width: size,
    height: size,
    ...(src ? {} : { backgroundColor: user.avatarColor || "#3368A0" }),
  };

  return (
    <span
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-bold text-white",
        ring && "ring-2 ring-background",
        className
      )}
      style={style}
      title={user.name}
    >
      {src ? (
        <img
          src={src}
          alt={user.name}
          className="h-full w-full object-cover"
          draggable={false}
        />
      ) : (
        <span style={{ fontSize: Math.max(9, Math.round(size * 0.38)) }}>
          {initialsOf(user.name || "")}
        </span>
      )}
    </span>
  );
}
