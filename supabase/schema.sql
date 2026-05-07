-- Spor Toto Tahmin Supabase schema foundation
-- Copy this file into the Supabase SQL Editor and run it for the public schema.
-- This script does not use a service_role key and does not import any external data.

create extension if not exists pgcrypto;

-- Keep updated_at values fresh on tables that users or admins may edit.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Public profile row for each authenticated user.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Optional helper: create a profile row when a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- A season groups many Spor Toto weeks.
create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_at date,
  ends_at date,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger seasons_set_updated_at
before update on public.seasons
for each row execute function public.set_updated_at();

-- Weeks control when predictions can be entered.
create table if not exists public.weeks (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  week_number integer not null,
  name text,
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weeks_closes_after_opens check (closes_at > opens_at),
  constraint weeks_unique_number unique (season_id, week_number)
);

create trigger weeks_set_updated_at
before update on public.weeks
for each row execute function public.set_updated_at();

-- A week normally has 15 matches. official_result is filled later by an admin/import process.
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.weeks(id) on delete cascade,
  position integer not null,
  home_team text not null,
  away_team text not null,
  starts_at timestamptz,
  official_result text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint matches_position_positive check (position > 0),
  constraint matches_official_result_check check (
    official_result is null or official_result in ('1', 'X', '2', 'void')
  ),
  constraint matches_unique_position unique (week_id, position)
);

create trigger matches_set_updated_at
before update on public.matches
for each row execute function public.set_updated_at();

-- User predictions. One correct prediction is worth one point during later score calculation.
create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.weeks(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  pick text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint predictions_pick_check check (pick in ('1', 'X', '2')),
  constraint predictions_one_per_match unique (week_id, match_id, user_id)
);

create index if not exists predictions_user_week_idx on public.predictions (user_id, week_id);

create trigger predictions_set_updated_at
before update on public.predictions
for each row execute function public.set_updated_at();

-- Weekly score totals. Score calculation is intentionally not implemented yet.
create table if not exists public.weekly_scores (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.weeks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  correct_count integer not null default 0,
  points integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weekly_scores_non_negative check (correct_count >= 0 and points >= 0),
  constraint weekly_scores_unique_user unique (week_id, user_id)
);

create trigger weekly_scores_set_updated_at
before update on public.weekly_scores
for each row execute function public.set_updated_at();

-- Season score totals. Score calculation is intentionally not implemented yet.
create table if not exists public.season_scores (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  points integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint season_scores_non_negative check (points >= 0),
  constraint season_scores_unique_user unique (season_id, user_id)
);

create trigger season_scores_set_updated_at
before update on public.season_scores
for each row execute function public.set_updated_at();

-- Enable Row Level Security on every public table.
alter table public.profiles enable row level security;
alter table public.seasons enable row level security;
alter table public.weeks enable row level security;
alter table public.matches enable row level security;
alter table public.predictions enable row level security;
alter table public.weekly_scores enable row level security;
alter table public.season_scores enable row level security;

-- Profiles: authenticated users can read profiles and update only their own row.
create policy "Authenticated users can read profiles"
on public.profiles for select
to authenticated
using (true);

create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Seasons, weeks, and matches: authenticated users can read app schedule data.
create policy "Authenticated users can read seasons"
on public.seasons for select
to authenticated
using (true);

create policy "Authenticated users can read weeks"
on public.weeks for select
to authenticated
using (true);

create policy "Authenticated users can read matches"
on public.matches for select
to authenticated
using (true);

-- Predictions: own picks are visible before close; all picks are visible after close.
create policy "Users can read own predictions before close"
on public.predictions for select
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.weeks
    where weeks.id = predictions.week_id
      and now() < weeks.closes_at
  )
);

create policy "Users can read all predictions after close"
on public.predictions for select
to authenticated
using (
  exists (
    select 1
    from public.weeks
    where weeks.id = predictions.week_id
      and now() >= weeks.closes_at
  )
);

create policy "Users can insert own predictions while week is open"
on public.predictions for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.weeks
    where weeks.id = predictions.week_id
      and now() < weeks.closes_at
  )
);

create policy "Users can update own predictions while week is open"
on public.predictions for update
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.weeks
    where weeks.id = predictions.week_id
      and now() < weeks.closes_at
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.weeks
    where weeks.id = predictions.week_id
      and now() < weeks.closes_at
  )
);

-- Scores: authenticated users can read calculated totals.
create policy "Authenticated users can read weekly scores"
on public.weekly_scores for select
to authenticated
using (true);

create policy "Authenticated users can read season scores"
on public.season_scores for select
to authenticated
using (true);
