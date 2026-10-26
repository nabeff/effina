"use client";

import { cn } from "@/lib/utils";

/** A label, an explanation and a control, lined up down the card. */
export function SettingRow({
  label, hint, children, className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 py-3", className)}>
      <div className="min-w-0 flex-1">
        <div className="text-[14.5px] font-medium">{label}</div>
        {hint ? (
          <div className="mt-0.5 text-[12.5px] text-muted-foreground">{hint}</div>
        ) : null}
      </div>
      <div className="flex flex-none items-center gap-2">{children}</div>
    </div>
  );
}

/** A row of choices, which replaces a native select. */
export function Choices<T extends string>({
  value, options, onChange, swatch,
}: {
  value: T;
  options: { value: T; label: string; color?: string }[];
  onChange: (v: T) => void;
  swatch?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            aria-pressed={on}
            title={o.label}
            className={cn(
              "rounded-full border text-[13px] font-medium transition-colors",
              swatch ? "size-7 border-2" : "h-8 border px-3",
              on
                ? swatch
                  ? "border-foreground"
                  : "border-transparent bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-fill-2 hover:text-foreground",
            )}
            style={swatch && o.color ? { background: o.color } : undefined}
          >
            {swatch ? <span className="sr-only">{o.label}</span> : o.label}
          </button>
        );
      })}
    </div>
  );
}
