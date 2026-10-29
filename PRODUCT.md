Write the prompt to tell claud when he read and argue # Mazaj

A money platform for people whose income does not arrive on the
first of the month.

Written 29 October 2026. This file is the honest state of the
product: what it is, what is built, who might pay for it, and
the reasons it might not sell. It is meant to be handed to
somebody cold so they can argue with it.

---

## 1. What it actually does

Most budgeting apps assume a salary. You earn a fixed amount on
a fixed day, so the app divides it into categories and tracks
what you spend. Mint, YNAB, Copilot, Monarch, every bank app,
all of them start from that assumption.

A freelancer does not have that. The money comes when an invoice
clears, which might be the 3rd or might be the 24th, and might
be two invoices or none. Tax is not deducted, it is owed later
in one frightening lump. A good month has to carry a bad one.

Mazaj starts from that life instead.

**The core loop.** You say what you usually earn. You list the
bills that leave every month. What is left is divided into
envelopes, each with a share rather than a fixed amount, so the
envelopes scale with whatever actually arrived. When you
overspend one, the app says which other envelope to take from,
in a fixed order that never touches the tax reserve.

**What it tracks.** Income and spending, bills with due dates,
envelopes with shares, savings goals with dates that move as you
fund them, a tax reserve set aside before it is owed, and debt
you are paying down. Twelve screens, all of them reading from
one computed model.

**What makes it different from a spreadsheet.** The math is a
pure layer with 123 tests pinning every figure. The rebalancing
order, the tax rules, the pace calculations, the lean month
handling: all of it is tested, because a change that moves a
number is a change to somebody's money.

---

## 2. The thing that might actually matter

### Mazaj Island

The header is not a header. It is one black pill at the top of
every screen that says the single most important thing about
your money right now:

```
Groceries over by 120 DH      (overspent, red)
Rent in 2 days                (bill due, orange)
180 DH free today             (on track, green)
All good today                (nothing needs you)
```

It picks that line from eight competing signals in a fixed
priority: money already lost, then money about to leave, then
the shape of the rest of the month, then good news. That order
is tested.

Click it, or press Command K, and the pill grows into an
assistant panel. You can ask it anything about your money in
plain words. It answers from the figures the app already
computed, never from invented numbers, and anything that would
change your money is described for confirmation rather than
done.

The whole thing is one element that morphs. It never unmounts
and remounts. The status dot travels from the closed pill to the
panel header. A short streak of light travels around the edge.
Every so often the dot sends out one soft ripple, or the text
catches a slow multicolour drift, or at breakfast it briefly
becomes a sun.

**Why this matters commercially.** Every budgeting app makes you
go and look. Mazaj tells you without being asked, in one line,
on every screen, in a shape nobody else has. If this product has
a reason to exist beyond "another envelope app", the island is
it.

---

## 3. What is built

**Twelve screens.** Dashboard with 19 draggable widgets, money
log, bills, envelopes, goals, rebalance, tax, history, insights,
setup, plus sign in and the account reset.

**Onboarding.** Six steps that ask about life rather than
percentages. You pick areas (Home, Food, Getting around) and
then the real things inside them (rent, groceries, fuel), and
the shares are worked out from what you picked. You never see a
percentage unless you ask. It ends with an animated radar chart
of the shape of your month, then the budget being built.

**An eight stop tour** that spotlights the real screen with your
own figures in it, starting with the island.

**The math layer.** `src/lib/budget/` is pure TypeScript with no
React, no network, no DOM. 123 tests. It is what makes the app
work offline and what makes a change to the rules deliberate.

**The assistant route.** `/api/agent` talks to Claude server
side so the key never reaches the browser. Voice input uses the
browser's own speech API, no second key, no upload.

**Platform.** Next.js 16, React 19, TypeScript strict, Tailwind
v4, Supabase with row level security, PWA with an offline shell,
Capacitor shells generated for iOS and Android.

**Scale.** About 19,000 lines, 83 components, 68 commits.

---

## 4. What is not built

Being straight about this, because the gaps decide whether it
sells.

- **The assistant has never answered a real question.** The
  route is written and handles its failures honestly, but there
  is no API key, so nobody has had a single real conversation
  with it. The feature that might make this product is entirely
  untested in use.
- **No bank connection.** Every figure is typed in by hand.
  This is the single biggest gap against every competitor.
- **The native apps have never compiled.** The iOS and Android
  projects exist, but Swift Package Manager could not fetch
  Capacitor's binaries in this environment. Nobody has run it
  on a phone.
- **No multi currency, no sharing, no accountant export.**
- **One user has ever used it.** There is no feedback beyond
  the person who built it.
- **No pricing, no payments, no landing page, no analytics.**

---

## 5. Who might pay

### a. Freelancers in Morocco and MENA

The narrowest reading, and the one the product was actually
designed around.

**For it.** Irregular income, self assessed tax, cash heavy,
and almost no local tool that understands any of it. The tax
reserve alone solves a real and frightening problem. Somebody
in this situation would recognise the app immediately, because
it was built by somebody in exactly that situation.

**Against it.** The market is small and not used to paying for
software subscriptions. Price sensitivity is severe. Bank
connections in the region are poor, so the manual entry problem
does not get solved by adding an integration.

**Honest read.** This is where the product is strongest and the
revenue is weakest. Good place to find the first hundred users
who genuinely love it. Hard place to build a business.

### b. Anyone with irregular income, worldwide

Freelancers, contractors, commission sellers, gig workers,
anywhere.

**For it.** Far bigger. The problem is identical: money arrives
unpredictably, tax is owed later, a good month has to cover a
bad one. The share based envelopes and the rebalancing order are
genuinely better for this than any fixed amount budget.

**Against it.** YNAB has been doing envelopes since 2004 and has
a devoted following. Copilot and Monarch are well funded and
beautiful. All of them connect to banks. Mazaj would have to
win on being the one that understands irregular income, and
would need bank connections to be taken seriously.

**Honest read.** This is the real market. It is also a fight.

### c. Everybody who budgets

**For it.** Biggest possible market.

**Against it.** Mazaj has no advantage here. Against a salaried
person with a bank connection, a generic budgeting app is simply
easier. The things that make Mazaj special (tax reserve,
rebalancing, income timing) are irrelevant to somebody paid on
the 1st.

**Honest read.** Do not aim here. The product's strengths become
invisible and its weaknesses become decisive.

---

## 6. Is it sellable

### The case for yes

The island is genuinely novel. Nobody in personal finance has
an ambient assistant that tells you the one thing that matters
without being asked. If the AI half works, "ask your money
anything" is a real product, not a feature.

The math is trustworthy. 123 tests on the figures is unusual
for an indie product and it shows in the behaviour: the numbers
agree with each other everywhere.

The onboarding is better than the competition. Asking about life
rather than percentages is the right instinct, and most
budgeting apps lose people in the first five minutes.

The irregular income angle is underserved and real.

### The case for no

**Nobody has used it.** Every claim above is a claim about a
product with one user. The honest answer to "will people pay for
this" is that nobody knows, because nobody has been asked.

**Manual entry is the killer.** Every successful budgeting app
connects to banks. The ones that do not have mostly died.
Asking somebody to type in every transaction is asking for a
habit most people cannot keep, and the app becomes wrong within
a week of being abandoned.

**The assistant is unproven.** It is the differentiator and it
has never run. It might be magic, or it might be a chat box that
answers questions you could read off the screen faster. There is
no evidence either way.

**Budgeting apps are a graveyard.** Mint shut down. Most
indie ones never reach a thousand paying users. The category has
high churn because the product reminds people of something they
would rather not think about.

**Polish is not a moat.** The island is beautiful and it took a
very long time. A competitor with funding can copy the idea in a
month. What cannot be copied is the data and the habit, and
Mazaj has neither yet.

### The straight answer

Not sellable today. The assistant does not work, the native apps
do not build, and no human other than its author has opened it.

Potentially sellable, in the irregular income market, if three
things happen:

1. The assistant proves it answers questions better than
   looking at the screen. This needs an API key and ten real
   people using it for two weeks.
2. Manual entry gets solved, by bank connection, by receipt
   scanning, or by the assistant making logging a sentence
   rather than a form.
3. Ten strangers use it for a month and keep using it.

Until those, it is an impressive product with no evidence.

---

## 7. What I would do next

In order, and nothing else until each is done:

1. **Put a key in and use the assistant for a week.** Twenty
   dollars of credit. It answers either the question "is this
   the product" or "is this a feature".
2. **Give it to five freelancers.** Not for feedback on the
   design. Watch whether they open it on day four.
3. **Make logging take one sentence.** "Spent 200 on groceries"
   typed into the island, done. If the assistant can do that
   reliably, the manual entry problem becomes a feature.
4. **Then** decide about bank connections, pricing and the
   native apps.

The product does not need more screens. It needs somebody other
than its author to want it.

---

## 8. For whoever reads this next

Things worth knowing before you form an opinion:

- `src/lib/budget/` is the real product. Read `budget.test.ts`
  to see what the app actually promises about money.
- `src/components/features/island/` is where most of the recent
  work went. It is one element that morphs, not several that
  swap, and that constraint explains most of the code.
- The rules in `effina-money-engine` must not change without
  being asked: envelope percentages, rebalance donor order,
  income timing, and the storage key in the old app.
- There is a design bench at `/header-lab` with a slow motion
  control, so every animation can be watched frame by frame.
- Live at https://effina.vercel.app. Source at
  github.com/nabeff/effina, private.
