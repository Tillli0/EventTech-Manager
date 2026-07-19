import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";

const SIZE_CLASSES = {
  xs: "h-5 w-5 text-[10px]",
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-9 w-9 text-xs",
  xl: "h-10 w-10 text-sm",
} as const;

export type AvatarSize = keyof typeof SIZE_CLASSES;

interface AvatarProps {
  /** Name, aus dem die Initialen abgeleitet werden. */
  label: string;
  size?: AvatarSize;
  /** Hintergrund-/Textfarbe, überschreibt den Standard (`bg-accent-soft text-accent`). */
  className?: string;
  /** Weißer Rand, für überlappende Avatar-Gruppen. */
  bordered?: boolean;
  style?: CSSProperties;
  title?: string;
}

export function Avatar({ label, size = "md", className, bordered, style, title }: AvatarProps) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-accent-soft font-semibold text-accent",
        SIZE_CLASSES[size],
        bordered && "border-2 border-bg-surface",
        className,
      )}
      style={style}
      title={title ?? label}
    >
      {initials(label)}
    </span>
  );
}
