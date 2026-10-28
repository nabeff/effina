"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Mic, Square, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Signal } from "@/lib/budget";
import { Waveform } from "./waveform";

/**
 * The assistant, inside the island.
 *
 * It opens on what is happening today, because that is what you
 * came to see, and the conversation grows underneath. Anything
 * that would change your money is proposed rather than done, and
 * waits for a yes.
 */

const EASE = [0.32, 0.72, 0, 1] as const;

export interface Turn {
  role: "you" | "mazaj";
  text: string;
  /** a change the agent wants to make, which needs a yes */
  action?: { summary: string; kind: string; payload: Record<string, unknown> };
  pending?: boolean;
}

const SUGGESTIONS = [
  "How much can I spend today",
  "What is due this week",
  "Add 200 groceries",
];

export function Agent({
  signals, currency, onClose, onGo,
}: {
  signals: Signal[];
  currency: string;
  onClose: () => void;
  onGo: (href: string) => void;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    setText("");
    setTurns((t) => [...t, { role: "you", text: q }, { role: "mazaj", text: "", pending: true }]);
    setBusy(true);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          question: q,
          /* the island already knows what matters today, so the
             model does not have to ask for it */
          context: signals.map((s) => s.detail),
          currency,
        }),
      });
      const data = await res.json();
      setTurns((t) => {
        const next = [...t];
        next[next.length - 1] = {
          role: "mazaj",
          text: data.reply ?? "I could not reach the assistant.",
          action: data.action,
        };
        return next;
      });
    } catch {
      setTurns((t) => {
        const next = [...t];
        next[next.length - 1] = {
          role: "mazaj",
          text: "I could not reach the assistant. Your budget is untouched.",
        };
        return next;
      });
    } finally {
      setBusy(false);
    }
  }

  /* voice, through whatever the browser already has. No key, no
     upload, and it degrades to typing where it is missing. */
  function listen() {
    const Rec =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike })
        .SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike })
        .webkitSpeechRecognition;
    if (!Rec) return;

    const rec = new Rec();
    rec.lang = "en-GB";
    rec.interimResults = true;
    rec.continuous = false;

    rec.onresult = (e: SpeechResultLike) => {
      const said = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join("");
      setText(said);
      if (e.results[e.results.length - 1].isFinal) {
        setListening(false);
        void ask(said);
      }
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);

    setListening(true);
    rec.start();
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: EASE }}
      className="flex max-h-[min(70vh,560px)] flex-col"
    >
      <header className="flex items-center justify-between px-4 pt-3.5 pb-2">
        <span className="text-[12px] font-semibold tracking-[0.02em] text-muted-foreground">
          Mazaj
        </span>
        <button
          onClick={onClose}
          aria-label="Close"
          className="grid size-6 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-fill-2 hover:text-foreground"
        >
          <X className="size-[13px]" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">
        {/* today, which is what the island was already saying */}
        {!turns.length ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="flex flex-col gap-1.5"
          >
            {signals.slice(0, 4).map((s, i) => (
              <motion.button
                key={s.id}
                onClick={() => s.href && onGo(s.href)}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: EASE, delay: 0.04 * i }}
                className="flex items-start gap-2.5 rounded-[var(--radius-control)] px-2.5 py-2 text-left transition-colors hover:bg-fill-2"
              >
                <span
                  className="mt-[5px] size-[7px] flex-none rounded-full"
                  style={{
                    background:
                      s.tone === "bad"
                        ? "var(--destructive)"
                        : s.tone === "warn"
                          ? "var(--warning)"
                          : s.tone === "good"
                            ? "var(--primary)"
                            : "var(--muted-foreground)",
                  }}
                />
                <span className="text-[13px] leading-relaxed text-pretty">
                  {s.detail}
                </span>
              </motion.button>
            ))}
          </motion.div>
        ) : (
          <div className="flex flex-col gap-3 py-1">
            {turns.map((t, i) => (
              <Bubble key={i} turn={t} onConfirm={() => void 0} />
            ))}
            <div ref={endRef} />
          </div>
        )}
      </div>

      {/* what you can ask, until you have asked something */}
      {!turns.length ? (
        <div className="flex flex-wrap gap-1.5 px-4 pb-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => void ask(s)}
              className="rounded-full border border-border-soft px-2.5 py-1 text-[11.5px] text-muted-foreground transition-colors hover:border-border hover:text-foreground"
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask(text);
        }}
        className="flex items-center gap-2 border-t border-white/[0.06] px-3 py-2.5"
      >
        <AnimatePresence mode="wait" initial={false}>
          {listening ? (
            <motion.div
              key="wave"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex min-w-0 flex-1 items-center gap-2.5 px-1"
            >
              <Waveform />
              <span className="truncate text-[13px] text-muted-foreground">
                {text || "Listening"}
              </span>
            </motion.div>
          ) : (
            <motion.input
              key="input"
              ref={inputRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ask, or tell me what you spent"
              className="min-w-0 flex-1 bg-transparent px-1 text-[13.5px] outline-none placeholder:text-subtle-foreground"
            />
          )}
        </AnimatePresence>

        <IconButton
          icon={listening ? Square : Mic}
          label={listening ? "Stop" : "Speak"}
          onClick={() => (listening ? setListening(false) : listen())}
          live={listening}
        />
        <IconButton
          icon={ArrowUp}
          label="Send"
          type="submit"
          disabled={!text.trim() || busy}
          solid
        />
      </form>
    </motion.div>
  );
}

function Bubble({ turn, onConfirm }: { turn: Turn; onConfirm: () => void }) {
  if (turn.role === "you") {
    return (
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: EASE }}
        className="self-end rounded-[14px] rounded-br-[5px] bg-primary px-3 py-2 text-[13px] text-primary-foreground"
      >
        {turn.text}
      </motion.p>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="max-w-[88%]"
    >
      {turn.pending ? (
        <span className="flex gap-1 px-1 py-1.5">
          {[0, 1, 2].map((n) => (
            <motion.span
              key={n}
              className="size-[5px] rounded-full bg-muted-foreground"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.1, repeat: Infinity, delay: n * 0.16 }}
            />
          ))}
        </span>
      ) : (
        <p className="text-[13px] leading-relaxed text-pretty">{turn.text}</p>
      )}

      {turn.action ? (
        <div className="mt-2 rounded-[var(--radius-control)] border border-border-soft bg-fill-2 px-3 py-2.5">
          <p className="text-[12.5px] text-muted-foreground">{turn.action.summary}</p>
          <button
            onClick={onConfirm}
            className="mt-2 rounded-full bg-primary px-3 py-1 text-[12px] font-semibold text-primary-foreground"
          >
            Do it
          </button>
        </div>
      ) : null}
    </motion.div>
  );
}

function IconButton({
  icon: Icon, label, onClick, type = "button", disabled, solid, live,
}: {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  solid?: boolean;
  live?: boolean;
}) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      whileTap={{ scale: 0.9 }}
      className={cn(
        "grid size-8 flex-none place-items-center rounded-full transition-colors disabled:opacity-35",
        solid
          ? "bg-primary text-primary-foreground"
          : live
            ? "bg-destructive text-white"
            : "text-muted-foreground hover:bg-fill-2 hover:text-foreground",
      )}
    >
      <Icon className="size-[15px]" />
    </motion.button>
  );
}

/* the browser's own speech API, which TypeScript does not ship */
interface SpeechResultLike {
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
}
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  onresult: (e: SpeechResultLike) => void;
  onerror: () => void;
  onend: () => void;
}
