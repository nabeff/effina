import { cn } from "@/lib/utils";

interface SectionProps {
  title?: string;
  sub?: React.ReactNode;
  tools?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** false when the child draws its own padding, like a row list */
  pad?: boolean;
}

/**
 * The shape every screen is built from: a heading, an optional
 * explanation, optional tools on the right, and a card.
 */
export function Section({ title, sub, tools, children, className, pad = true }: SectionProps) {
  return (
    <section className={cn("mb-8", className)}>
      {title ? (
        <div className="mb-3 flex min-h-[46px] w-full flex-wrap items-start gap-3">
          <h2 className="min-w-0 flex-1 text-xl font-bold tracking-[-0.024em]">
            {title}
            {sub ? (
              <span className="mt-0.5 block text-[13px] font-normal tracking-[-0.008em] text-muted-foreground">
                {sub}
              </span>
            ) : null}
          </h2>
          {tools ? <div className="ml-auto flex flex-none items-center gap-2">{tools}</div> : null}
        </div>
      ) : null}
      <div className="overflow-hidden rounded-[var(--radius)] bg-card">
        {pad ? <div className="px-5 py-[18px]">{children}</div> : children}
      </div>
    </section>
  );
}
