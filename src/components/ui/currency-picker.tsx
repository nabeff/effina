"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CURRENCIES, searchCurrencies } from "@/lib/data/currencies";

/**
 * Pick a currency by typing what you know.
 *
 * A plain list of fifty codes asks you to recognise an
 * abbreviation. Searching the place as well means "morocco" and
 * "dubai" both work, which is how people actually think about
 * their own money.
 */
export function CurrencyPicker({
  value, onChange, id, className,
}: {
  value: string;
  onChange: (code: string) => void;
  id?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [at, setAt] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const hits = searchCurrencies(query);
  const picked = CURRENCIES.find((c) => c.code === value);

  /* a fresh search starts at the top, or the highlight points at
     a row that scrolled away. Derived during render off the
     remembered values rather than set from an effect. */
  const [lastQuery, setLastQuery] = useState(query);
  if (lastQuery !== query) {
    setLastQuery(query);
    setAt(0);
  }

  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (!open) setQuery("");
  }

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-at="${at}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [at]);

  function choose(code: string) {
    onChange(code);
    setOpen(false);
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAt((n) => Math.min(hits.length - 1, n + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAt((n) => Math.max(0, n - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (hits[at]) choose(hits[at].code);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            id={id}
            type="button"
            aria-label={picked ? `Currency, ${picked.name}` : "Pick a currency"}
            className={cn(
              "flex items-center justify-between gap-2 rounded-control border border-input bg-input/30 px-4 text-[15px] font-bold tracking-[-0.02em] transition-colors",
              "hover:bg-input/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              !picked && "font-normal text-muted-foreground",
              className,
            )}
          >
            {picked ? picked.code : "Currency"}
            <ChevronDown className="size-4 flex-none opacity-50" />
          </button>
        }
      />

      {/* wide enough for the longest name, rather than sized to a
          trigger that only holds three letters */}
      <PopoverContent align="end" className="w-[320px] p-0">
        <div className="flex items-center gap-2.5 border-b border-border-soft px-3.5 py-2.5">
          <Search className="size-4 flex-none text-subtle-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKey}
            placeholder="Search a currency or a country"
            aria-label="Search currencies"
            className="w-full bg-transparent text-[13.5px] outline-none placeholder:text-subtle-foreground"
          />
        </div>

        <div ref={listRef} className="max-h-[280px] overflow-y-auto py-1">
          {hits.length ? (
            hits.map((c, i) => (
              <button
                key={c.code}
                type="button"
                data-at={i}
                onClick={() => choose(c.code)}
                onMouseEnter={() => setAt(i)}
                className={cn(
                  "flex w-full items-center gap-3 px-3.5 py-2 text-left transition-colors",
                  i === at && "bg-fill-2",
                )}
              >
                <span className="w-[42px] flex-none text-[13.5px] font-bold">
                  {c.code}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px]">{c.name}</span>
                  <span className="block truncate text-[11.5px] text-subtle-foreground">
                    {c.where}
                  </span>
                </span>
                {c.code === value ? (
                  <Check className="size-4 flex-none text-primary" />
                ) : null}
              </button>
            ))
          ) : (
            <p className="px-3.5 py-6 text-center text-[13px] text-muted-foreground">
              Nothing matches that. You can type any code you like.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
