"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { GripVertical, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { WIDTHS, type Width } from "@/lib/budget";

/**
 * One widget in the grid.
 *
 * In edit mode it wiggles, takes a drag handle and a resize grip,
 * and can be switched off. Out of edit mode it is just the card,
 * because a dashboard covered in controls is not a dashboard.
 */
export function WidgetShell({
  id, name, width, editing, index, onWidth, onHide, children,
}: {
  id: string;
  name: string;
  width: Width;
  editing: boolean;
  index: number;
  onWidth: (w: Width) => void;
  onHide: () => void;
  children: React.ReactNode;
}) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id, disabled: !editing });

  /* the span is a variable rather than a fixed gridColumn, so the
     one column phone layout can ignore it. An inline span of 8 on
     a single column grid overflows the row. */
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    ["--span" as string]: width,
    ["--span-sm" as string]: Math.min(6, width),
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout={!isDragging}
      initial={{ opacity: 0, y: 12 }}
      animate={{
        opacity: isDragging ? 0.35 : 1,
        y: 0,
        /* the wiggle, offset per card so they are not in lockstep */
        rotate: editing && !isDragging ? [-0.35, 0.35, -0.35] : 0,
      }}
      transition={{
        layout: { type: "spring", stiffness: 420, damping: 36 },
        default: { type: "spring", stiffness: 420, damping: 36 },
        ...(editing && !isDragging
          ? {
              rotate: {
                duration: 2.4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: (index % 5) * 0.12,
              },
            }
          : {}),
      }}
      className={cn(
        "relative col-span-1 min-w-0",
        "sm:col-[span_var(--span-sm)/span_var(--span-sm)]",
        "lg:col-[span_var(--span)/span_var(--span)]",
        isDragging && "z-30",
      )}
    >
      {children}

      {editing ? (
        <>
          <div className="pointer-events-none absolute inset-0 rounded-[var(--radius)] ring-2 ring-primary/50" />

          <div className="absolute -top-2.5 left-3 flex items-center gap-1 rounded-full bg-elevated px-1 py-1 shadow-lg ring-1 ring-border-soft">
            <button
              {...attributes}
              {...listeners}
              aria-label={`Drag ${name}`}
              className="grid size-6 cursor-grab touch-none place-items-center rounded-full text-muted-foreground transition-colors hover:bg-fill-2 hover:text-foreground active:cursor-grabbing"
            >
              <GripVertical className="size-3.5" />
            </button>
            <span className="max-w-[120px] truncate px-1 text-[11.5px] font-semibold text-muted-foreground">
              {name}
            </span>
            <button
              onClick={onHide}
              aria-label={`Remove ${name}`}
              className="grid size-6 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
            >
              <X className="size-3.5" />
            </button>
          </div>

          {/* the resize grip, dragged along the bottom edge */}
          <div className="absolute -bottom-2.5 left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-full bg-elevated p-1 shadow-lg ring-1 ring-border-soft">
            {WIDTHS.map((w) => (
              <button
                key={w}
                onClick={() => onWidth(w)}
                aria-label={`${name} at ${w} of 12 columns`}
                aria-pressed={w === width}
                className={cn(
                  "h-2 rounded-full transition-all",
                  w === width ? "bg-primary" : "bg-fill hover:bg-muted-foreground",
                )}
                style={{ width: 6 + w * 1.6 }}
              />
            ))}
          </div>
        </>
      ) : null}
    </motion.div>
  );
}
