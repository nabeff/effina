"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Cloud, CloudCheck, CloudOff } from "lucide-react";
import { useIsFetching } from "@tanstack/react-query";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Whether this device agrees with the server.
 *
 * Three states and no text, because a line of copy about sync is
 * noise on every screen for the one minute a year it matters.
 *
 * A cloud rather than a dot. The island owns the only green dot
 * on screen, and two glowing dots in one bar is two things
 * competing to be the status.
 */
export function SyncDot() {
  const fetching = useIsFetching();
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const set = () => setOnline(navigator.onLine);
    set();
    window.addEventListener("online", set);
    window.addEventListener("offline", set);
    return () => {
      window.removeEventListener("online", set);
      window.removeEventListener("offline", set);
    };
  }, []);

  const state = !online ? "offline" : fetching > 0 ? "syncing" : "synced";
  /* only the broken state earns a colour. Saved and saving are
     ordinary, so they wear the same muted ink as every other
     icon in the row. */
  const Icon =
    state === "offline" ? CloudOff : state === "syncing" ? Cloud : CloudCheck;

  const says =
    state === "offline"
      ? "Offline, changes are kept here"
      : state === "syncing"
        ? "Saving"
        : "Everything is saved";

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            aria-label={says}
            className={cn(
              "grid size-9 flex-none place-items-center",
              state === "offline" ? "text-destructive" : "text-muted-foreground",
            )}
          >
            <motion.span
              animate={
                state === "syncing"
                  ? { opacity: [0.45, 1, 0.45] }
                  : { opacity: 1 }
              }
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            >
              <Icon className="size-[18px]" />
            </motion.span>
          </span>
        }
      />
      <TooltipContent side="bottom">{says}</TooltipContent>
    </Tooltip>
  );
}
