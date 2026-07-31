-- Run this entire file once in Supabase Dashboard -> SQL Editor -> New query.

create table if not exists public.roster_state (
  id integer primary key check (id = 1),
  state jsonb not null default '{"employees":[],"locations":[],"shifts":[]}'::jsonb,
  revision bigint not null default 0,
  updated_at timestamptz not null default now(),
  updated_by text not null default 'system'
);

insert into public.roster_state (id, state, revision, updated_by)
values (
  1,
  jsonb_build_object(
    'employees', jsonb_build_array('Sebastian','Ash','Dhillon','Roy','Ainsley','Anthony','Sash','Vishesh','Lokesh','Sahil','Rahul','Harinder','Sumit','Lochlan','Anikin','Vicky','Joel','Moni','Jashan'),
    'locations', jsonb_build_array('Springvale (Head Office)','Dandenong','Point Cook','Caroline Springs','Tarneit','Manor Lakes','Craigieburn','Reservoir','South Yarra (Chapel Street)','Ringwood','Chirnside Park'),
    'shifts', '[]'::jsonb
  ),
  0,
  'system'
)
on conflict (id) do nothing;

alter table public.roster_state enable row level security;

drop policy if exists "Authenticated users can read roster" on public.roster_state;
create policy "Authenticated users can read roster"
on public.roster_state for select
to authenticated
using (true);

-- Writes are performed through the secure function below.
revoke insert, update, delete on public.roster_state from anon, authenticated;
grant select on public.roster_state to authenticated;

create or replace function public.save_roster_state(
  p_state jsonb,
  p_base_revision bigint,
  p_updated_by text
)
returns table (
  conflict boolean,
  state jsonb,
  revision bigint,
  updated_at timestamptz,
  updated_by text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.roster_state%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into current_row
  from public.roster_state
  where id = 1
  for update;

  if current_row.revision <> p_base_revision then
    return query select true, current_row.state, current_row.revision, current_row.updated_at, current_row.updated_by;
    return;
  end if;

  update public.roster_state
  set state = p_state,
      revision = revision + 1,
      updated_at = now(),
      updated_by = coalesce(nullif(trim(p_updated_by), ''), auth.jwt()->>'email', 'Admin')
  where id = 1
  returning roster_state.state, roster_state.revision, roster_state.updated_at, roster_state.updated_by
  into current_row.state, current_row.revision, current_row.updated_at, current_row.updated_by;

  return query select false, current_row.state, current_row.revision, current_row.updated_at, current_row.updated_by;
end;
$$;

revoke all on function public.save_roster_state(jsonb,bigint,text) from public, anon;
grant execute on function public.save_roster_state(jsonb,bigint,text) to authenticated;

-- Enable live updates. Ignore the duplicate-object error if the table is already added.
do $$
begin
  alter publication supabase_realtime add table public.roster_state;
exception
  when duplicate_object then null;
end $$;
