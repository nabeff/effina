"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle, ArrowUp, CheckCircle2, Clock, Mic, Square, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Signal } from "@/lib/budget";
import { Waveform } from "./waveform";
import { INNER_R, INPUT_H, PAD } from "./notch";

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
  signals, currency, maxBodyH, draft, onDraft, scrollAt, onScrollAt,
  onClose, onGo, onListening,
}: {
  signals: Signal[];
  currency: string;
  /** the most the message list may take */
  maxBodyH?: number;
  /** what was typed and not sent, kept across a close */
  draft?: string;
  onDraft?: (v: string) => void;
  /** where the conversation was scrolled to */
  scrollAt?: number;
  onScrollAt?: (v: number) => void;
  onClose: () => void;
  onGo: (href: string) => void;
  /** so the island can show it is recording */
  onListening?: (on: boolean) => void;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setTextState] = useState(draft ?? "");
  const setText = useCallback(
    (v: string) => {
      setTextState(v);
      onDraft?.(v);
    },
    [onDraft],
  );
  const [busy, setBusy] = useState(false);
  const [listening, setListeningState] = useState(false);
  /* The assistant either works or it does not, and saying so
     after every message is nagging. It is said once, then the
     input explains itself rather than repeating. */
  const [offline, setOffline] = useState(false);
  const setListening = useCallback(
    (on: boolean) => {
      setListeningState(on);
      onListening?.(on);
    },
    [onListening],
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  /* whether to keep following the newest message. It stops the
     moment somebody scrolls up to read, and resumes when they
     come back to the bottom, because yanking the view away from
     what a person is reading is the rudest thing a chat can do. */
  const follow = useRef(true);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const onScroll = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
    follow.current = atBottom;
    onScrollAt?.(el.scrollTop);
  }, [onScrollAt]);

  /* where it was left, restored on the way back in */
  useEffect(() => {
    if (scrollAt && scroller.current) {
      scroller.current.scrollTop = scrollAt;
      follow.current = false;
    }
    /* once, on mount */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!follow.current) return;
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy || offline) return;
    setText("");
    setTurns((t) => [...t, { role: "you", text: q }, { role: "mazaj", text: "", pending: true }]);
    setBusy(true);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          question: q,
          /* the bench asks for canned replies so the panel can
             be exercised without a key */
          /* the island already knows what matters today, so the
             model does not have to ask for it */
          context: signals.map((s) => s.detail),
          currency,
        }),
      });
      if (res.status === 401) {
        setOffline(true);
        setTurns((t) => {
          const next = [...t];
          next[next.length - 1] = {
            role: "mazaj",
            text: "You are signed out. Sign in again and I can answer.",
          };
          return next;
        });
        return;
      }

      const data = await res.json();
      if (data.notConnected) setOffline(true);
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
      setOffline(true);
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
      /* the shape grows first, the content arrives into it, so
         the pill reads as becoming the panel rather than being
         replaced by one */
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: EASE, delay: 0.08 }}
      /* One inset for the whole panel, so a clip can never take
         the padding off one row and leave another with it. */
      style={{ paddingLeft: PAD, paddingRight: PAD }}
      className="flex flex-col"
    >
      <div
        style={{ paddingTop: 6, paddingBottom: PAD }}
        className="min-h-0 shrink overflow-y-auto"
      >
        {/* today, which is what the island was already saying */}
        {!turns.length ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="flex flex-col gap-1.5"
          >
            {signals.slice(0, 4).map((s, i) => {
              /* An icon rather than a dot, because the header
                 already owns the one dot on screen and two
                 green dots is two things claiming to be the
                 status. The icon also says which kind of thing
                 it is, which a dot cannot. */
              const Icon =
                s.tone === "bad"
                  ? AlertCircle
                  : s.tone === "warn"
                    ? Clock
                    : CheckCircle2;
              const colour =
                s.tone === "bad"
                  ? "var(--destructive)"
                  : s.tone === "warn"
                    ? "var(--warning)"
                    : "var(--primary)";

              return (
                <motion.button
                  key={s.id}
                  onClick={() => s.href && onGo(s.href)}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: EASE, delay: 0.04 * i }}
                  /* the card is the resting state, and hover only
                     lightens it. A card that appears on hover
                     makes the panel look empty until touched. */
                  className="flex items-center gap-2.5 rounded-[var(--radius-control)] bg-card px-3 py-3 text-left transition-colors hover:bg-card-2"
                >
                  <Icon
                    className="size-4 flex-none"
                    style={{ color: colour }}
                  />
                  <span className="text-[13px] leading-snug text-pretty">
                    {s.detail}
                  </span>
                </motion.button>
              );
            })}
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
        <motion.div
          className="flex flex-wrap gap-1.5"
          style={{ paddingBottom: PAD }}
          /* last in, once the shape has settled, so they are
             never seen re-wrapping as it widens */
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.26, ease: EASE, delay: 0.34 }}
        >
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => void ask(s)}
              className="rounded-full border border-border-soft px-2.5 py-1 text-[11.5px] text-muted-foreground transition-colors hover:border-border hover:text-foreground"
            >
              {s}
            </button>
          ))}
        </motion.div>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask(text);
        }}
        /* inset on all three sides, so the row sits inside the
           shape rather than against its rounded corners */
        className="relative flex items-center gap-1.5 self-stretch"
        style={{ height: INPUT_H, marginBottom: PAD }}
      >
        {/* the rule stops where the row does, so it never
            runs into the rounded corners */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/[0.06]"
        />
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
              disabled={offline}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                offline ? "Assistant not connected" : "Ask, or tell me what you spent"
              }
              className="min-w-0 flex-1 bg-transparent px-2.5 text-[13.5px] outline-none placeholder:text-subtle-foreground"
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
          disabled={!text.trim() || busy || offline}
          solid={Boolean(text.trim()) && !busy && !offline}
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
        className="self-end rounded-[14px] rounded-br-[5px] bg-card-2 px-3 py-2 text-[13px]"
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
      {/* One box, with its padding set once. The thinking dots
          and the reply swap inside it rather than being two
          boxes with different padding, which is what made the
          text jump inward when the dots went away. */}
      <div className="px-1 py-1.5">
        {turn.pending ? (
          <span className="flex h-[19px] items-center gap-1">
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
      </div>

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
      style={solid ? { borderRadius: INNER_R } : undefined}
      className={cn(
        "grid size-7 flex-none place-items-center rounded-full transition-colors",
        solid
          ? "bg-primary text-primary-foreground"
          : live
            ? "bg-destructive text-white"
            : disabled
              ? "bg-fill-2 text-subtle-foreground"
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
