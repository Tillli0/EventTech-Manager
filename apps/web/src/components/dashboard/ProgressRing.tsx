import type { ReactNode } from "react";

/**
 * Ring-Instrument für den nächsten Einsatz. `progress` ist der echte Anteil
 * der vergangenen Zeit im Job-Zeitraum (`lib/jobProgress.ts`) — `null` heißt
 * "noch nicht gestartet" und zeigt einen leeren Ring statt eines erfundenen
 * Füllstands.
 */
export function ProgressRing({
  progress,
  size = 112,
  strokeWidth = 6,
  children,
}: {
  progress: number | null;
  size?: number;
  strokeWidth?: number;
  children?: ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - (progress ?? 0));

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-border"
        />
        {progress !== null && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="stroke-accent transition-[stroke-dashoffset] duration-700 ease-out"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center px-2 text-center">{children}</div>
    </div>
  );
}
