import { cn } from "@/lib/utils";

interface ProgressBarProps {
  /** 0 to 100 */
  value: number;
  /** a second mark showing where you should be */
  marker?: number;
  color?: string;
  className?: string;
  height?: number;
}

export function ProgressBar({
  value, marker, color = "var(--primary)", className, height = 8,
}: ProgressBarProps) {
  return (
    <div
      className={cn("relative w-full overflow-hidden rounded-full bg-fill-2", className)}
      style={{ height }}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-[var(--ease-out)]"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }}
      />
      {marker !== undefined ? (
        <span
          className="absolute -top-[3px] -bottom-[3px] w-[2px] bg-foreground/50"
          style={{ left: `${Math.min(100, Math.max(0, marker))}%` }}
        />
      ) : null}
    </div>
  );
}
