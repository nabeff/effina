-- Tax paid and the months marked as expecting no more income are
-- both maps keyed by a string, with no fields of their own and no
-- reason to be queried across users. A column each is the honest
-- shape, where a table would be two columns and a join.

alter table public.settings
  add column if not exists tax_paid jsonb not null default '{}'::jsonb,
  add column if not exists done_months jsonb not null default '{}'::jsonb;

-- carry across anything the legacy row held
update public.settings s
set tax_paid = coalesce(l.data->'tax'->'paid', '{}'::jsonb),
    done_months = coalesce(l.data->'done', '{}'::jsonb)
from public.budgets_legacy l
where l.user_id = s.user_id;
