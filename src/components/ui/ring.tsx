import { cn } from "@/lib/utils";

interface RingProps {
  /** 0 to 100 */
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  big?: React.ReactNode;
  small?: React.ReactNode;
  className?: string;
}

/**
 * One ring for everything that shows progress: today, the debt,
 * the tax reserve, a goal. Same shape everywhere means the app
 * speaks one visual language.
 */
export function Ring({
  value, size = 132, stroke = 13, color = "var(--primary)", big, small, className,
}: RingProps) {
  const r = size / 2 - stroke;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;

  return (
    <div className={cn("relative flex-none", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="var(--fill-2)" strokeWidth={stroke}
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 900ms var(--ease-out)" }}
        />
      </svg>
      {(big || small) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {big ? (
            <span className="font-bold tracking-[-0.03em]" style={{ fontSize: size * 0.2 }}>
              {big}
            </span>
          ) : null}
          {small ? (
            <span className="text-muted-foreground" style={{ fontSize: size * 0.082 }}>
              {small}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
