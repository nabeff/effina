import { cn } from "@/lib/utils";
import { Money } from "./money";
import type { Tone } from "@/types/budget";

const toneColor: Record<Tone, string> = {
  good: "text-primary",
  warn: "text-warning",
  bad: "text-destructive",
  neutral: "text-foreground",
};

interface StatProps {
  label: string;
  value: number;
  currency?: string;
  tone?: Tone;
  delta?: React.ReactNode;
  className?: string;
}

export function Stat({ label, value, currency, tone = "neutral", delta, className }: StatProps) {
  return (
    <div className={cn("rounded-[var(--radius)] bg-card px-[17px] py-[15px]", className)}>
      <div className="text-xs font-semibold tracking-[0.01em] text-muted-foreground">
        {label}
      </div>
      <div className={cn(
        "mt-1 text-[clamp(21px,4.4vw,27px)] font-bold tracking-[-0.034em]",
        toneColor[tone],
      )}>
        <Money value={value} currency={currency} />
      </div>
      {delta ? <div className="mt-1 text-xs font-semibold">{delta}</div> : null}
    </div>
  );
}
