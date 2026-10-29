import { cn } from "@/lib/utils";

/** A key, shown the way a keyboard shows it. */
export function Kbd({
  children, className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "grid h-[18px] min-w-[18px] place-items-center rounded-[5px] border border-hairline bg-fill-2 px-1 font-sans text-[10.5px] font-medium text-muted-foreground",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
