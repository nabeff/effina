"use client";

import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { TxForm } from "./tx-form";
import { useBudget } from "@/lib/hooks/use-budget";

/**
 * The same form the log screen uses, in a sheet. On a phone it
 * comes up from the bottom, which is where the thumb already is.
 */
export function AddSheet({
  open, onOpenChange, envelopeId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  envelopeId?: string;
}) {
  const { data } = useBudget();
  if (!data) return null;

  const envelope = envelopeId
    ? data.envelopes.find((e) => e.id === envelopeId)
    : undefined;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92dvh] gap-0 overflow-y-auto rounded-t-[var(--radius-xl)] px-5 pt-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:mx-auto sm:max-w-[560px]"
      >
        <SheetHeader className="p-0">
          <SheetTitle>{envelope ? `Add to ${envelope.name}` : "Add money"}</SheetTitle>
          <SheetDescription>
            {envelope
              ? "Logged against this envelope."
              : "Something you spent, or money that came in."}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5">
          <TxForm
            data={data}
            envelopeId={envelopeId}
            layout="stack"
            onDone={() => onOpenChange(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
