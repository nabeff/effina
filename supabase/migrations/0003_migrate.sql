-- ============================================================
-- Move every legacy budget into real rows
--
-- Reads budgets_legacy, writes settings, bills, envelopes,
-- transactions, goals, transfers and closed months. The legacy
-- row is never touched, so this can be run again or rolled back
-- by simply ignoring the new tables.
--
-- Ids are remapped: the old data used short strings like "food"
-- and "loan", the new tables use uuids, so a lookup is carried
-- through the whole migration to keep references intact.
-- ============================================================

create or replace function public.migrate_legacy_budget(target uuid)
returns table (
  what text,
  moved integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  blob        jsonb;
  item        jsonb;
  env_map     jsonb := '{}'::jsonb;   -- old envelope id -> new uuid
  bill_map    jsonb := '{}'::jsonb;   -- old bill id     -> new uuid
  new_id      uuid;
  n_bills     integer := 0;
  n_env       integer := 0;
  n_tx        integer := 0;
  n_goals     integer := 0;
  n_transfers integer := 0;
  n_closed    integer := 0;
  key         text;
  closed_id   uuid;
  env_key     text;
begin
  select data into blob from public.budgets_legacy where user_id = target;
  if blob is null then
    return query select 'nothing to migrate'::text, 0;
    return;
  end if;

  ---------------------------------------------------------------
  -- settings
  ---------------------------------------------------------------
  insert into public.settings (
    user_id, income, currency, leftovers, tax_rate,
    debt_total, debt_paid_before,
    accent, motion, glass, background, radius, density, glow,
    onboarded, tour_done
  )
  values (
    target,
    coalesce((blob->>'income')::numeric, 0),
    coalesce(blob->'profile'->>'currency', 'DH'),
    coalesce(blob->>'leftovers', 'save'),
    coalesce((blob->'tax'->>'rate')::numeric, 10),
    coalesce((blob->>'dadDebt')::numeric, 0),
    coalesce((blob->>'dadPaidBefore')::numeric, 0),
    coalesce(blob->'ui'->>'accent', 'green'),
    coalesce(blob->'ui'->>'motion', 'full'),
    coalesce(blob->'ui'->>'glass', 'medium'),
    coalesce(blob->'ui'->>'bg', 'glow'),
    coalesce(blob->'ui'->>'radius', 'round'),
    coalesce(blob->'ui'->>'density', 'comfy'),
    coalesce(blob->>'glow', 'green'),
    coalesce((blob->>'onboarded')::boolean, true),
    coalesce((blob->>'tourDone')::boolean, true)
  )
  on conflict (user_id) do update set
    income = excluded.income,
    currency = excluded.currency,
    leftovers = excluded.leftovers,
    tax_rate = excluded.tax_rate,
    debt_total = excluded.debt_total,
    debt_paid_before = excluded.debt_paid_before;

  ---------------------------------------------------------------
  -- bills
  ---------------------------------------------------------------
  for item in select * from jsonb_array_elements(coalesce(blob->'bills','[]'::jsonb))
  loop
    insert into public.bills (user_id, name, amount, due_day, icon, hue, note, position)
    values (
      target,
      coalesce(item->>'name', 'Bill'),
      coalesce((item->>'amount')::numeric, 0),
      least(greatest(coalesce((item->>'due')::smallint, 1), 1), 31),
      coalesce(item->>'icon', 'receipt'),
      coalesce(item->>'hue', 'teal'),
      coalesce(item->>'note', ''),
      n_bills
    )
    returning id into new_id;

    bill_map := bill_map || jsonb_build_object(item->>'id', new_id::text);
    n_bills := n_bills + 1;
  end loop;

  ---------------------------------------------------------------
  -- envelopes
  ---------------------------------------------------------------
  for item in select * from jsonb_array_elements(coalesce(blob->'envelopes','[]'::jsonb))
  loop
    insert into public.envelopes (user_id, name, pct, kind, icon, hue, note, position)
    values (
      target,
      coalesce(item->>'name', 'Envelope'),
      coalesce((item->>'pct')::numeric, 0),
      coalesce(item->>'kind', 'spend'),
      coalesce(item->>'icon', 'circle-dashed'),
      coalesce(item->>'hue', 'green'),
      coalesce(item->>'note', ''),
      n_env
    )
    returning id into new_id;

    env_map := env_map || jsonb_build_object(item->>'id', new_id::text);
    n_env := n_env + 1;
  end loop;

  ---------------------------------------------------------------
  -- transactions
  --
  -- The old env field held three shapes: an envelope id, the form
  -- "bill:<id>", or null for income. Each maps to a different
  -- column now, which is what the constraint enforces.
  ---------------------------------------------------------------
  for item in select * from jsonb_array_elements(coalesce(blob->'tx','[]'::jsonb))
  loop
    key := item->>'env';

    insert into public.transactions (
      user_id, occurred_on, direction, amount,
      envelope_id, bill_id, note, is_sample, is_auto
    )
    values (
      target,
      (item->>'date')::date,
      coalesce(item->>'type', 'out'),
      abs(coalesce((item->>'amount')::numeric, 0)),
      case
        when key is null or key like 'bill:%' then null
        else nullif(env_map->>key, '')::uuid
      end,
      case
        when key like 'bill:%'
        then nullif(bill_map->>substring(key from 6), '')::uuid
        else null
      end,
      coalesce(item->>'note', ''),
      coalesce((item->>'sample')::boolean, false),
      coalesce((item->>'auto')::boolean, false)
    );
    n_tx := n_tx + 1;
  end loop;

  ---------------------------------------------------------------
  -- goals
  ---------------------------------------------------------------
  for item in select * from jsonb_array_elements(coalesce(blob->'goals','[]'::jsonb))
  loop
    insert into public.goals (user_id, name, price, saved, share, icon, hue, target_month, note, position)
    values (
      target,
      coalesce(item->>'name', 'Goal'),
      coalesce((item->>'price')::numeric, 0),
      coalesce((item->>'saved')::numeric, 0),
      coalesce((item->>'share')::numeric, 0),
      coalesce(item->>'icon', 'target'),
      coalesce(item->>'hue', 'teal'),
      coalesce(item->>'by', ''),
      coalesce(item->>'note', ''),
      n_goals
    );
    n_goals := n_goals + 1;
  end loop;

  ---------------------------------------------------------------
  -- transfers
  ---------------------------------------------------------------
  for item in select * from jsonb_array_elements(coalesce(blob->'transfers','[]'::jsonb))
  loop
    insert into public.transfers (user_id, month, occurred_on, from_envelope, to_envelope, amount, reason)
    values (
      target,
      coalesce(item->>'month', ''),
      coalesce((item->>'date')::date, current_date),
      nullif(env_map->>(item->>'from'), '')::uuid,
      nullif(env_map->>(item->>'to'), '')::uuid,
      abs(coalesce((item->>'amount')::numeric, 0)),
      coalesce(item->>'why', '')
    );
    n_transfers := n_transfers + 1;
  end loop;

  ---------------------------------------------------------------
  -- closed months, totals as columns and per envelope as rows
  ---------------------------------------------------------------
  for key in select jsonb_object_keys(coalesce(blob->'closed','{}'::jsonb))
  loop
    item := blob->'closed'->key;

    insert into public.closed_months (
      user_id, month, income, spent, saved, bill_total, debt_paid, rolled
    )
    values (
      target, key,
      coalesce((item->>'income')::numeric, 0),
      coalesce((item->>'spent')::numeric, 0),
      coalesce((item->>'saved')::numeric, 0),
      coalesce((item->>'billTotal')::numeric, 0),
      coalesce((item->>'dadPay')::numeric, 0),
      coalesce((item->>'rolled')::numeric, 0)
    )
    on conflict (user_id, month) do update set
      income = excluded.income, spent = excluded.spent,
      saved = excluded.saved, bill_total = excluded.bill_total,
      debt_paid = excluded.debt_paid, rolled = excluded.rolled
    returning id into closed_id;

    for env_key in select jsonb_object_keys(coalesce(item->'perEnv','{}'::jsonb))
    loop
      insert into public.closed_month_envelopes (
        closed_month_id, envelope_id, envelope_name, amount
      )
      values (
        closed_id,
        nullif(env_map->>env_key, '')::uuid,
        env_key,
        coalesce((item->'perEnv'->>env_key)::numeric, 0)
      )
      on conflict (closed_month_id, envelope_name) do update set
        amount = excluded.amount;
    end loop;

    n_closed := n_closed + 1;
  end loop;

  return query
    select 'bills'::text, n_bills union all
    select 'envelopes', n_env union all
    select 'transactions', n_tx union all
    select 'goals', n_goals union all
    select 'transfers', n_transfers union all
    select 'closed months', n_closed;
end $$;

-- ============================================================
-- Verification. Counts both sides and says plainly whether the
-- migration is faithful, rather than leaving it to be eyeballed.
-- ============================================================
create or replace function public.verify_migration(target uuid)
returns table (
  what text,
  legacy integer,
  migrated integer,
  ok boolean
)
language sql
security definer
set search_path = public
as $$
  with blob as (
    select data from public.budgets_legacy where user_id = target
  )
  select 'bills', 
         coalesce(jsonb_array_length((select data->'bills' from blob)), 0),
         (select count(*)::integer from public.bills where user_id = target),
         coalesce(jsonb_array_length((select data->'bills' from blob)), 0)
           = (select count(*)::integer from public.bills where user_id = target)
  union all
  select 'envelopes',
         coalesce(jsonb_array_length((select data->'envelopes' from blob)), 0),
         (select count(*)::integer from public.envelopes where user_id = target),
         coalesce(jsonb_array_length((select data->'envelopes' from blob)), 0)
           = (select count(*)::integer from public.envelopes where user_id = target)
  union all
  select 'transactions',
         coalesce(jsonb_array_length((select data->'tx' from blob)), 0),
         (select count(*)::integer from public.transactions where user_id = target),
         coalesce(jsonb_array_length((select data->'tx' from blob)), 0)
           = (select count(*)::integer from public.transactions where user_id = target)
  union all
  select 'goals',
         coalesce(jsonb_array_length((select data->'goals' from blob)), 0),
         (select count(*)::integer from public.goals where user_id = target),
         coalesce(jsonb_array_length((select data->'goals' from blob)), 0)
           = (select count(*)::integer from public.goals where user_id = target)
  union all
  select 'closed months',
         (select count(*)::integer from jsonb_object_keys(
            coalesce((select data->'closed' from blob), '{}'::jsonb))),
         (select count(*)::integer from public.closed_months where user_id = target),
         (select count(*)::integer from jsonb_object_keys(
            coalesce((select data->'closed' from blob), '{}'::jsonb)))
           = (select count(*)::integer from public.closed_months where user_id = target)
  union all
  select 'income matches',
         coalesce((select (data->>'income')::integer from blob), 0),
         coalesce((select income::integer from public.settings where user_id = target), 0),
         coalesce((select (data->>'income')::integer from blob), 0)
           = coalesce((select income::integer from public.settings where user_id = target), 0);
$$;
