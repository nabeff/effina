"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function parse(iso: string): Date | undefined {
  if (!iso) return undefined;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

function format(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * A date picker rather than a native date input, which looks
 * different in every browser and ignores the design tokens.
 */
export function DateField({
  value, onChange, id, className,
}: {
  value: string;
  onChange: (iso: string) => void;
  id?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = parse(value);
  const today = format(new Date());

  const shown = !selected
    ? "Pick a date"
    : value === today
      ? "Today"
      : selected.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="secondary"
            className={cn("h-[42px] w-full justify-start font-normal", className)}
          >
            <CalendarDays className="size-4 text-muted-foreground" />
            {shown}
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={(d) => {
            if (d) onChange(format(d));
            setOpen(false);
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
