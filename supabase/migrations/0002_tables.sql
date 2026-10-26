-- ============================================================
-- Real tables
--
-- The budget was one JSON row per user. That was right for one
-- person and wrong for a platform: a blob cannot be indexed,
-- cannot be queried by part, and cannot answer a question about
-- more than one user at a time.
--
-- Nothing here deletes the old row. The legacy table is renamed
-- and kept, so this is reversible until the new app is live.
-- ============================================================

alter table if exists public.budgets rename to budgets_legacy;

-- ---------------------------------------------------------------
-- settings: one row per user, everything that is not a list
-- ---------------------------------------------------------------
create table if not exists public.settings (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  income         numeric(12,2) not null default 0,
  currency       text not null default 'DH',
  leftovers      text not null default 'save'
                 check (leftovers in ('save','roll')),
  tax_rate       numeric(5,2) not null default 10,
  debt_total     numeric(12,2) not null default 0,
  debt_paid_before numeric(12,2) not null default 0,
  /* appearance, six independent choices */
  accent         text not null default 'green',
  motion         text not null default 'full',
  glass          text not null default 'medium',
  background     text not null default 'glow',
  radius         text not null default 'round',
  density        text not null default 'comfy',
  theme          text not null default 'dark',
  glow           text not null default 'green',
  /* dashboard arrangement, a list of card ids and their widths */
  layout_order   text[] not null default '{}',
  layout_widths  jsonb not null default '{}'::jsonb,
  onboarded      boolean not null default false,
  tour_done      boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- bills: exact amounts, taken before anything is divided
-- ---------------------------------------------------------------
create table if not exists public.bills (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  amount      numeric(12,2) not null default 0,
  due_day     smallint not null default 1 check (due_day between 1 and 31),
  icon        text not null default 'receipt',
  hue         text not null default 'teal',
  note        text not null default '',
  position    integer not null default 0,
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- envelopes: percentages of what is left after bills
--
-- kind decides how the money is counted: spend is money leaving,
-- save counts as kept, debt is tracked against a total owed.
-- ---------------------------------------------------------------
create table if not exists public.envelopes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  pct         numeric(5,2) not null default 0 check (pct >= 0 and pct <= 100),
  kind        text not null default 'spend'
              check (kind in ('spend','save','debt')),
  icon        text not null default 'circle-dashed',
  hue         text not null default 'green',
  note        text not null default '',
  position    integer not null default 0,
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- transactions: the facts. Everything else is computed from here.
--
-- bill_id and envelope_id are mutually exclusive, and income has
-- neither, which is what the check enforces.
-- ---------------------------------------------------------------
create table if not exists public.transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  occurred_on date not null,
  direction   text not null check (direction in ('in','out')),
  amount      numeric(12,2) not null check (amount > 0),
  envelope_id uuid references public.envelopes(id) on delete set null,
  bill_id     uuid references public.bills(id) on delete set null,
  note        text not null default '',
  is_sample   boolean not null default false,
  is_auto     boolean not null default false,
  created_at  timestamptz not null default now(),
  constraint one_target check (
    (direction = 'in'  and envelope_id is null and bill_id is null) or
    (direction = 'out' and (envelope_id is null) <> (bill_id is null)) or
    (direction = 'out' and envelope_id is null and bill_id is null)
  )
);

-- ---------------------------------------------------------------
-- goals
-- ---------------------------------------------------------------
create table if not exists public.goals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  price       numeric(12,2) not null default 0,
  saved       numeric(12,2) not null default 0,
  share       numeric(5,2) not null default 0,
  icon        text not null default 'target',
  hue         text not null default 'teal',
  target_month text not null default '',
  note        text not null default '',
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- transfers: applied rebalance moves, kept so one can be undone
-- ---------------------------------------------------------------
create table if not exists public.transfers (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  month         text not null,
  occurred_on   date not null,
  from_envelope uuid references public.envelopes(id) on delete set null,
  to_envelope   uuid references public.envelopes(id) on delete set null,
  amount        numeric(12,2) not null check (amount > 0),
  reason        text not null default '',
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- closed months: frozen, never recalculated
--
-- The totals are columns and the per envelope figures are rows,
-- so spending by envelope across a year is one query rather than
-- a scan that unpacks a blob in application code.
-- ---------------------------------------------------------------
create table if not exists public.closed_months (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  month       text not null,
  income      numeric(12,2) not null default 0,
  spent       numeric(12,2) not null default 0,
  saved       numeric(12,2) not null default 0,
  bill_total  numeric(12,2) not null default 0,
  debt_paid   numeric(12,2) not null default 0,
  rolled      numeric(12,2) not null default 0,
  closed_at   timestamptz not null default now(),
  unique (user_id, month)
);

create table if not exists public.closed_month_envelopes (
  id              uuid primary key default gen_random_uuid(),
  closed_month_id uuid not null references public.closed_months(id) on delete cascade,
  envelope_id     uuid references public.envelopes(id) on delete set null,
  envelope_name   text not null,
  amount          numeric(12,2) not null default 0,
  unique (closed_month_id, envelope_name)
);

-- ---------------------------------------------------------------
-- indexes. Every screen asks "this user, this month", so that is
-- the one doing the work.
-- ---------------------------------------------------------------
create index if not exists tx_user_date   on public.transactions (user_id, occurred_on desc);
create index if not exists tx_user_env    on public.transactions (user_id, envelope_id);
create index if not exists tx_user_bill   on public.transactions (user_id, bill_id);
create index if not exists bills_user     on public.bills (user_id, position);
create index if not exists env_user       on public.envelopes (user_id, position);
create index if not exists goals_user     on public.goals (user_id, position);
create index if not exists transfers_user on public.transfers (user_id, month);
create index if not exists closed_user    on public.closed_months (user_id, month desc);
create index if not exists cme_month      on public.closed_month_envelopes (closed_month_id);

-- ---------------------------------------------------------------
-- row level security: a user reaches their own rows and no others
-- ---------------------------------------------------------------
alter table public.settings     enable row level security;
alter table public.bills        enable row level security;
alter table public.envelopes    enable row level security;
alter table public.transactions enable row level security;
alter table public.goals        enable row level security;
alter table public.transfers    enable row level security;
alter table public.closed_months enable row level security;
alter table public.closed_month_envelopes enable row level security;

do $$
declare t text;
begin
  foreach t in array array['settings','bills','envelopes','transactions',
                           'goals','transfers','closed_months']
  loop
    execute format($f$
      drop policy if exists "own rows" on public.%I;
      create policy "own rows" on public.%I
        for all using (auth.uid() = user_id)
        with check (auth.uid() = user_id);
    $f$, t, t);
  end loop;
end $$;

/* the child table has no user_id, so it is reached through its parent */
drop policy if exists "own rows" on public.closed_month_envelopes;
create policy "own rows" on public.closed_month_envelopes
  for all using (
    exists (
      select 1 from public.closed_months m
      where m.id = closed_month_id and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.closed_months m
      where m.id = closed_month_id and m.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------
-- updated_at, kept honest by the database rather than the client
-- ---------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['settings','bills','envelopes','goals']
  loop
    execute format($f$
      drop trigger if exists %I_touch on public.%I;
      create trigger %I_touch before update on public.%I
        for each row execute function public.touch_updated_at();
    $f$, t, t, t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------
-- a new signup gets a settings row alongside its profile
-- ---------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', ''))
  on conflict (id) do nothing;

  insert into public.settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.subscriptions (user_id, status)
  values (new.id, 'free')
  on conflict (user_id) do nothing;

  return new;
end;
$$;
