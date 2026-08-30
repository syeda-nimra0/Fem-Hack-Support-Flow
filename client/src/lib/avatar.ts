/**
 * Profile pictures live in localStorage (per user id), as requested —
 * no upload endpoint or cloud storage needed. Images are square-cropped
 * and downscaled to 256×256 JPEG so each entry stays well under the
 * ~5MB localStorage budget (typically 20-60KB).
 */

const PREFIX = "supportflow_avatar:";
export const AVATAR_CHANGED_EVENT = "supportflow:avatar-changed";

export function avatarKey(userId: string): string {
  return `${PREFIX}${userId}`;
}

export function getAvatar(userId: string | null | undefined): string | null {
  if (!userId || typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(avatarKey(userId));
  } catch {
    return null;
  }
}

export function setAvatar(userId: string, dataUrl: string): boolean {
  try {
    window.localStorage.setItem(avatarKey(userId), dataUrl);
    window.dispatchEvent(new CustomEvent(AVATAR_CHANGED_EVENT, { detail: { userId } }));
    return true;
  } catch {
    // Quota exceeded (picture too large after resize) — extremely unlikely.
    return false;
  }
}

export function removeAvatar(userId: string): void {
  try {
    window.localStorage.removeItem(avatarKey(userId));
    window.dispatchEvent(new CustomEvent(AVATAR_CHANGED_EVENT, { detail: { userId } }));
  } catch {
    /* ignore */
  }
}

/**
 * Square-crop (center) + downscale an image file to a compact JPEG data URL.
 */
export async function fileToAvatarDataUrl(file: File, size = 256): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file (PNG, JPG, WebP…).");
  }
  const bitmap = await createImageBitmap(file);
  try {
    const min = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - min) / 2;
    const sy = (bitmap.height - min) / 2;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not process the image in this browser.");
    ctx.drawImage(bitmap, sx, sy, min, min, 0, 0, size, size);
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    bitmap.close?.();
  }
}
