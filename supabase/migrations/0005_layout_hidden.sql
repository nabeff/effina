-- Widgets the user switched off on the home page.
-- A list of ids, so it is its own column rather than smuggled
-- into the widths map under a prefix.
alter table public.settings
  add column if not exists layout_hidden jsonb not null default '[]'::jsonb;
