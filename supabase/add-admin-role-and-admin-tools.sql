-- Admin foundation for Spor Toto Tahmin
-- Run this after supabase/schema.sql.
-- Authorization uses public.profiles.role. Allowed roles: user, admin.
-- This script is safe to run repeatedly.

alter table public.profiles
add column if not exists role text not null default 'user';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_role_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
    add constraint profiles_role_check check (role in ('user', 'admin'));
  end if;
end $$;

-- Helper used by RLS policies and RPC functions.
-- security definer avoids RLS recursion while still checking the current auth.uid().
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

-- Admin write policies. Normal users keep the previous read/write limits.
drop policy if exists "Admins can insert seasons" on public.seasons;
create policy "Admins can insert seasons"
on public.seasons for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update seasons" on public.seasons;
create policy "Admins can update seasons"
on public.seasons for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can insert weeks" on public.weeks;
create policy "Admins can insert weeks"
on public.weeks for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update weeks" on public.weeks;
create policy "Admins can update weeks"
on public.weeks for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can insert matches" on public.matches;
create policy "Admins can insert matches"
on public.matches for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update matches" on public.matches;
create policy "Admins can update matches"
on public.matches for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can insert weekly scores" on public.weekly_scores;
create policy "Admins can insert weekly scores"
on public.weekly_scores for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update weekly scores" on public.weekly_scores;
create policy "Admins can update weekly scores"
on public.weekly_scores for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can insert season scores" on public.season_scores;
create policy "Admins can insert season scores"
on public.season_scores for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update season scores" on public.season_scores;
create policy "Admins can update season scores"
on public.season_scores for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Recalculate scores for one week.
-- This is a manual admin fallback before automatic imports/scoring exist.
create or replace function public.recalculate_scores_for_week(target_week_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_season_id uuid;
  users_scored integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Only admins can recalculate scores.';
  end if;

  select season_id into target_season_id
  from public.weeks
  where id = target_week_id;

  if target_season_id is null then
    return jsonb_build_object('ok', false, 'error', 'week_not_found');
  end if;

  delete from public.weekly_scores
  where week_id = target_week_id;

  insert into public.weekly_scores (week_id, user_id, correct_count, points)
  select
    target_week_id,
    predictions.user_id,
    count(*) filter (where predictions.pick = matches.official_result)::integer as correct_count,
    count(*) filter (where predictions.pick = matches.official_result)::integer as points
  from public.predictions
  join public.matches on matches.id = predictions.match_id
  where predictions.week_id = target_week_id
    and matches.week_id = target_week_id
    and matches.official_result is not null
    and matches.official_result <> 'void'
  group by predictions.user_id;

  get diagnostics users_scored = row_count;

  delete from public.season_scores
  where season_id = target_season_id;

  insert into public.season_scores (season_id, user_id, points)
  select
    target_season_id,
    weekly_scores.user_id,
    sum(weekly_scores.points)::integer as points
  from public.weekly_scores
  join public.weeks on weeks.id = weekly_scores.week_id
  where weeks.season_id = target_season_id
  group by weekly_scores.user_id;

  return jsonb_build_object(
    'ok', true,
    'week_id', target_week_id,
    'users_scored', users_scored
  );
end;
$$;
