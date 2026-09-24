create table public.workout_programs (
  owner uuid not null references auth.users(id) on delete cascade,
  version text not null,
  definition jsonb not null,
  primary key (owner, version)
);
create table public.workout_sessions (
  id uuid primary key,
  owner uuid not null references auth.users(id) on delete cascade,
  program_version text not null,
  revision integer not null check (revision > 0),
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  foreign key (owner, program_version) references public.workout_programs(owner, version)
);
create index workout_owner on public.workout_sessions(owner);
create unique index one_active_workout on public.workout_sessions(owner) where payload->>'status' = 'active';
create table public.workout_exercises (
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  id uuid not null,
  owner uuid not null references auth.users(id) on delete cascade,
  prescription jsonb not null,
  actual jsonb not null,
  primary key (session_id, id)
);
create index workout_exercise_owner on public.workout_exercises(owner);
create table public.workout_sets (
  session_id uuid not null,
  exercise_id uuid not null,
  id uuid not null,
  owner uuid not null references auth.users(id) on delete cascade,
  actual jsonb not null,
  primary key (session_id, exercise_id, id),
  foreign key (session_id, exercise_id) references public.workout_exercises(session_id, id) on delete cascade
);
create index workout_set_owner on public.workout_sets(owner);
create table public.workout_revisions (
  owner uuid not null references auth.users(id) on delete cascade,
  operation uuid not null,
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  revision integer not null,
  payload jsonb not null,
  saved_at timestamptz not null default now(),
  primary key (owner, operation),
  unique (session_id, revision)
);
alter table public.workout_programs enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_sets enable row level security;
alter table public.workout_revisions enable row level security;
revoke all on public.workout_programs, public.workout_sessions, public.workout_exercises, public.workout_sets, public.workout_revisions from anon, authenticated;
grant select on public.workout_programs, public.workout_sessions, public.workout_exercises, public.workout_sets, public.workout_revisions to authenticated;
create policy own_programs on public.workout_programs for select to authenticated using ((select auth.uid()) = owner);
create policy own_sessions on public.workout_sessions for select to authenticated using ((select auth.uid()) = owner);
create policy own_exercises on public.workout_exercises for select to authenticated using ((select auth.uid()) = owner);
create policy own_sets on public.workout_sets for select to authenticated using ((select auth.uid()) = owner);
create policy own_revisions on public.workout_revisions for select to authenticated using ((select auth.uid()) = owner);

create function public.save_workout(p_id uuid, p_expected integer, p_operation uuid, p_payload jsonb, p_program jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  previous public.workout_sessions;
  retry public.workout_revisions;
  next_revision integer;
  exercise jsonb;
  entry jsonb;
  old_exercise jsonb;
  score text;
begin
  if caller is null or (p_payload->>'owner')::uuid is distinct from caller or (p_payload->>'id')::uuid is distinct from p_id then
    raise exception 'Owner mismatch' using errcode = '42501';
  end if;
  if coalesce(p_payload->>'status','') not in ('active','completed') or coalesce(p_payload->>'day','') not in ('day-1','day-2','day-3','day-4') or jsonb_typeof(p_payload->'exercises') is distinct from 'array' or p_payload->>'programVersion' is distinct from p_program->>'version' or nullif(p_payload->>'programVersion','') is null or p_expected is null or p_expected < 0 or p_operation is null or nullif(p_payload->>'startedAt','') is null then
    raise exception 'Invalid workout';
  end if;
  perform (p_payload->>'startedAt')::timestamptz;
  foreach score in array array[p_payload->>'painBefore',p_payload->>'painAfter',p_payload->>'painNextDay'] loop
    if coalesce(score,'') <> '' and score::numeric not between 0 and 10 then raise exception 'Shoulder scores must be 0-10'; end if;
  end loop;
  if coalesce(p_payload->>'painNextDay','') <> '' and nullif(p_payload->>'nextDayAt','') is null then raise exception 'Next-day observation time required'; end if;
  if p_payload->>'status' = 'completed' and nullif(p_payload->>'finishedAt','') is null then raise exception 'Completion time required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(caller::text, 0));
  select * into retry from public.workout_revisions where owner = caller and operation = p_operation;
  if found then
    if retry.payload is distinct from p_payload or retry.session_id <> p_id then raise exception 'Operation reused with different data'; end if;
    return jsonb_build_object('revision', retry.revision);
  end if;
  select * into previous from public.workout_sessions where id = p_id for update;
  if found then
    if previous.owner <> caller then raise exception 'Owner mismatch' using errcode = '42501'; end if;
    if previous.revision <> p_expected then return jsonb_build_object('revision',previous.revision,'conflict',jsonb_build_object('revision',previous.revision,'payload',previous.payload)); end if;
    if previous.program_version is distinct from p_payload->>'programVersion' or previous.payload->>'day' is distinct from p_payload->>'day' or previous.payload->>'startedAt' is distinct from p_payload->>'startedAt' or jsonb_array_length(previous.payload->'exercises') <> jsonb_array_length(p_payload->'exercises') then raise exception 'Historical prescription is immutable'; end if;
    if previous.payload->>'status' = 'completed' and (p_payload->>'status' is distinct from 'completed' or previous.payload->>'finishedAt' is distinct from p_payload->>'finishedAt') then raise exception 'Completion metadata is immutable'; end if;
  elsif p_expected <> 0 then raise exception 'Unknown revision';
  end if;
  insert into public.workout_programs(owner,version,definition) values(caller,p_program->>'version',p_program) on conflict do nothing;
  if (select definition from public.workout_programs where owner=caller and version=p_program->>'version') is distinct from p_program then raise exception 'Program version is immutable'; end if;
  next_revision := coalesce(previous.revision,0)+1;
  for exercise in select value from jsonb_array_elements(p_payload->'exercises') loop
    if coalesce(exercise->>'unit','') not in ('reps','seconds') or coalesce(exercise->>'basis','') not in ('Machine stack','Per hand','Total external','Per side','Bodyweight','Assistance') or nullif(trim(exercise->>'actualName'),'') is null then raise exception 'Invalid exercise setup'; end if;
    if previous.id is not null then
      select value into old_exercise from jsonb_array_elements(previous.payload->'exercises') where value->>'id'=exercise->>'id';
      if old_exercise is null or old_exercise->'prescription' is distinct from exercise->'prescription' then raise exception 'Historical prescription is immutable'; end if;
    end if;
    if jsonb_typeof(exercise->'sets') is distinct from 'array' then raise exception 'Sets must be an array'; end if;
    for entry in select value from jsonb_array_elements(exercise->'sets') loop
      if coalesce(entry->>'status','') not in ('pending','done','skipped','stopped') or coalesce(entry->>'type','') not in ('working','warm-up','cardio') then raise exception 'Invalid set state'; end if;
      if entry->>'status' = 'done' then
        if exercise->'prescription'->>'status' = 'Hold for assessment' or coalesce(exercise->>'restriction','') <> '' then raise exception 'Held or restricted exercise cannot be completed'; end if;
        if exercise->>'actualName' ~* '(pull[ -]?ups?|push[ -]?ups?|chin[ -]?ups?|pull[ -]?downs?|overhead|shoulder press|chest press|bench press|dead hangs?|scapular hangs?|negatives|\mdips\M)' then raise exception 'Movement excluded by shoulder restrictions'; end if;
        if nullif(entry->>'pain','') is null or (entry->>'pain')::numeric <> 0 then raise exception 'Pain prevents completing a set; record stopped'; end if;
        if exercise->>'unit' not in ('reps','seconds') or coalesce(nullif(entry->>(exercise->>'unit'),'')::numeric,0) <= 0 then raise exception 'Actual repetitions or seconds required'; end if;
        if exercise->>'unit' = 'reps' and (entry->>'reps')::numeric <> trunc((entry->>'reps')::numeric) then raise exception 'Whole repetitions required'; end if;
        if entry->>'type' = 'working' and (nullif(entry->>'rir','') is null or (entry->>'rir')::numeric not between 0 and 10) then raise exception 'RIR required'; end if;
        if entry->>'type' <> 'cardio' and exercise->>'basis' <> 'Bodyweight' and (nullif(entry->>'load','') is null or (entry->>'load')::numeric < 0) then raise exception 'Load required'; end if;
      end if;
    end loop;
  end loop;
  insert into public.workout_sessions(id,owner,program_version,revision,payload) values(p_id,caller,p_program->>'version',next_revision,p_payload)
  on conflict(id) do update set revision=excluded.revision,payload=excluded.payload,updated_at=now();
  delete from public.workout_exercises where session_id=p_id;
  for exercise in select value from jsonb_array_elements(p_payload->'exercises') loop
    insert into public.workout_exercises(session_id,id,owner,prescription,actual) values(p_id,(exercise->>'id')::uuid,caller,exercise->'prescription',exercise-'sets'-'prescription');
    for entry in select value from jsonb_array_elements(exercise->'sets') loop
      insert into public.workout_sets(session_id,exercise_id,id,owner,actual) values(p_id,(exercise->>'id')::uuid,(entry->>'id')::uuid,caller,entry);
    end loop;
  end loop;
  insert into public.workout_revisions(owner,operation,session_id,revision,payload) values(caller,p_operation,p_id,next_revision,p_payload);
  return jsonb_build_object('revision',next_revision);
end;
$$;
revoke all on function public.save_workout(uuid,integer,uuid,jsonb,jsonb) from public, anon;
grant execute on function public.save_workout(uuid,integer,uuid,jsonb,jsonb) to authenticated;