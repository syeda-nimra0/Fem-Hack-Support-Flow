

/**
 * SwapText — text that rolls over on hover/click to reveal a second line.
 * Adapted from upload/Code 2.md (animata SwapText).
 */
import { useState, type ComponentProps } from "react";
import { cn } from "@/lib/utils";

interface SwapTextProps extends ComponentProps<"div"> {
  initialText: string;
  finalText: string;
  supportsHover?: boolean;
  textClassName?: string;
  initialTextClassName?: string;
  finalTextClassName?: string;
  disableClick?: boolean;
}

export default function SwapText({
  initialText,
  finalText,
  className,
  supportsHover = true,
  textClassName,
  initialTextClassName,
  finalTextClassName,
  disableClick,
  ...props
}: SwapTextProps) {
  const [active, setActive] = useState(false);
  const common = "block transition-transform duration-700 ease-[cubic-bezier(0.65,0,0.35,1)]";
  const longWord = finalText.length > initialText.length ? finalText : null;

  return (
    <div {...props} className={cn("relative overflow-hidden", className)}>
      <div
        className="group/swap cursor-pointer select-none font-semibold"
        onClick={() => !disableClick && setActive((current) => !current)}
      >
        <span
          className={cn(common, initialTextClassName, {
            "-translate-y-full": active,
            "group-hover/swap:-translate-y-full": supportsHover,
          })}
        >
          {initialText}
          {Boolean(longWord?.length) && <span className="invisible h-0">{longWord}</span>}
        </span>
        <span
          className={cn(`${common} absolute top-full`, finalTextClassName, {
            "-translate-y-full": active,
            "group-hover/swap:-translate-y-full": supportsHover,
          })}
        >
          {finalText}
        </span>
      </div>
    </div>
  );
}
