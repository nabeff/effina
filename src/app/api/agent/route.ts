import { NextResponse } from "next/server";

/**
 * The assistant, answered on the server.
 *
 * The key never reaches the browser, which is the whole reason
 * this route exists rather than calling the model from the
 * island directly.
 *
 * It is told what the island already knows, so it can answer
 * "how much can I spend today" without a round trip for data the
 * page is holding anyway.
 */

const MODEL = "claude-sonnet-5";

const SYSTEM = `You are Mazaj, the assistant inside a personal budgeting app.

You help one person understand and run their own money. You are
calm and brief. Two or three sentences at most, and never a list
unless they asked for one.

You are given today's signals, which are the facts the app has
already worked out. Answer from those. If you are asked something
the signals do not cover, say what you would need rather than
guessing at a figure.

Never invent an amount. A wrong number about somebody's money is
worse than saying you do not know.

Never use an em dash or an en dash. Use a comma or a full stop.

If they ask you to change something, for example logging a spend
or moving money between envelopes, do not claim it is done.
Describe exactly what you would do in one sentence so they can
confirm it.`;

export async function POST(req: Request) {
  const key = process.env.ANTHROPIC_API_KEY;

  let body: { question?: string; context?: string[]; currency?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ reply: "I could not read that." }, { status: 400 });
  }

  const question = (body.question ?? "").slice(0, 2000).trim();
  if (!question) {
    return NextResponse.json({ reply: "Ask me something about your month." });
  }

  if (!key) {
    return NextResponse.json({
      reply:
        "The assistant is not connected yet. Add an ANTHROPIC_API_KEY and I will be able to answer.",
    });
  }

  const context = (body.context ?? []).slice(0, 12).join("\n");
  const currency = body.currency ?? "DH";

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        system: SYSTEM,
        messages: [
          {
            role: "user",
            content: `Today's signals, in the person's own currency (${currency}):\n${context || "Nothing needs attention."}\n\nThey asked: ${question}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      /* the body can carry a key or a quota detail, so it is read
         for the log and never passed to the browser */
      console.error("agent upstream", res.status, await res.text());
      return NextResponse.json({
        reply: "The assistant is not answering right now. Your budget is untouched.",
      });
    }

    const data = (await res.json()) as {
      content?: { type: string; text?: string }[];
    };
    const reply =
      data.content
        ?.filter((c) => c.type === "text")
        .map((c) => c.text ?? "")
        .join("")
        .trim() || "I did not catch that.";

    return NextResponse.json({ reply });
  } catch (e) {
    console.error("agent", e);
    return NextResponse.json({
      reply: "The assistant is not answering right now. Your budget is untouched.",
    });
  }
}
