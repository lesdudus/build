create table public.workout_assignments (
  owner uuid primary key references auth.users(id) on delete cascade,
  definition jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.workout_assignments enable row level security;
revoke all on public.workout_assignments from anon, authenticated;
grant select on public.workout_assignments to authenticated;
create policy own_assignment on public.workout_assignments for select to authenticated using ((select auth.uid()) = owner);