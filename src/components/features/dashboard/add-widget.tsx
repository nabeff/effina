"use client";

import { Plus } from "lucide-react";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { DASH_CARDS } from "@/lib/budget";

/**
 * Everything switched off, so a widget removed is never lost.
 */
export function AddWidget({
  hidden, open, onOpenChange, onAdd,
}: {
  hidden: string[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdd: (id: string) => void;
}) {
  const available = DASH_CARDS.filter((c) => hidden.includes(c.id));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[80dvh] gap-0 overflow-y-auto rounded-t-[var(--radius-xl)] px-5 pt-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:mx-auto sm:max-w-[560px]"
      >
        <SheetHeader className="p-0">
          <SheetTitle>Add a widget</SheetTitle>
          <SheetDescription>
            {available.length
              ? "Anything you removed is still here."
              : "Everything is already on the page."}
          </SheetDescription>
        </SheetHeader>

        {available.length ? (
          <div className="mt-5 flex flex-col gap-2">
            {available.map((c) => (
              <button
                key={c.id}
                onClick={() => onAdd(c.id)}
                className="flex items-center gap-3 rounded-[var(--radius-md)] bg-fill-2 px-4 py-3 text-left transition-colors hover:bg-fill"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-semibold">{c.name}</div>
                  <div className="mt-0.5 text-[12.5px] text-muted-foreground">
                    {c.hint}
                  </div>
                </div>
                <Plus className="size-4 flex-none text-muted-foreground" />
              </button>
            ))}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
