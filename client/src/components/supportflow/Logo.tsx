

/**
 * Logo — theme-aware SupportFlow brand mark.
 * Renders BOTH the light and dark variants (one hidden via CSS) so switching
 * themes is instant with zero image loading delay. Both files are tiny
 * (~10-22 KB) palette-quantized PNGs with transparent backgrounds.
 *
 * variant="full"  → horizontal wordmark (icon + SupportFlow + tagline)
 * variant="mark"  → square icon only (chat bubble squircle)
 */
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  variant?: "full" | "mark";
  alt?: string;
}

export default function Logo({ className, variant = "full", alt = "SupportFlow" }: LogoProps) {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const files =
    variant === "mark"
      ? { light: "/logo-mark-light.png", dark: "/logo-mark-dark.png" }
      : { light: "/logo-light.png", dark: "/logo-dark.png" };

  return (
    <span className={cn("inline-flex shrink-0 items-center", className)}>
      <img
        src={files.light}
        alt={alt}
        draggable={false}
        className={cn("block h-full w-auto max-w-none", dark && "hidden")}
      />
      <img
        src={files.dark}
        alt=""
        aria-hidden
        draggable={false}
        className={cn("block h-full w-auto max-w-none", !dark && "hidden")}
      />
    </span>
  );
}
