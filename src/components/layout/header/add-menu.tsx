"use client";

import { useRouter } from "next/navigation";
import {
  ArrowDownLeft, FileText, Minus, Plus, Target, type LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Kbd } from "@/components/ui/kbd";

/**
 * The plus.
 *
 * Four things worth adding, in the order people add them. The
 * shortcuts are shown rather than hidden, because a shortcut
 * nobody knows about is the same as no shortcut.
 */

const ITEMS: { id: string; name: string; icon: LucideIcon; href: string; key: string }[] = [
  { id: "spend", name: "Add expense", icon: Minus, href: "/log?add=out", key: "E" },
  { id: "income", name: "Add income", icon: ArrowDownLeft, href: "/log?add=in", key: "I" },
  { id: "bill", name: "Add bill", icon: FileText, href: "/bills?add=1", key: "B" },
  { id: "goal", name: "Add goal", icon: Target, href: "/goals?add=1", key: "G" },
];

export function AddMenu() {
  const router = useRouter();

  return (
    <Popover>
      <PopoverTrigger
        render={
          <motion.button
            whileTap={{ scale: 0.92 }}
            aria-label="Add"
            className="grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-fill-2 hover:text-foreground"
          >
            <Plus className="size-[18px]" />
          </motion.button>
        }
      />
      <PopoverContent align="end" sideOffset={10} className="w-[232px] p-1.5">
        {ITEMS.map((it) => (
          <button
            key={it.id}
            onClick={() => router.push(it.href)}
            className="flex w-full items-center gap-2.5 rounded-[var(--radius-control)] px-2.5 py-2 text-left text-[13.5px] transition-colors hover:bg-fill-2"
          >
            <it.icon className="size-[16px] flex-none text-muted-foreground" />
            <span className="flex-1">{it.name}</span>
            <Kbd>{it.key}</Kbd>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
