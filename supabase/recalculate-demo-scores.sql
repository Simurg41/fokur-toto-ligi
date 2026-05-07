-- Recalculate demo weekly and season scores.
-- Safe to run repeatedly after setting demo results.
-- Scoring rule: one correct prediction equals one point.
-- Matches with official_result null or 'void' are ignored.

do $$
declare
  demo_season_id uuid;
  demo_week_id uuid;
begin
  select id into demo_season_id
  from public.seasons
  where name = 'Demo Sezon'
  limit 1;

  if demo_season_id is null then
    raise notice 'Demo season not found. Run supabase/seed-demo-week.sql first.';
    return;
  end if;

  select id into demo_week_id
  from public.weeks
  where season_id = demo_season_id
    and name = 'Demo 1. Hafta'
  limit 1;

  if demo_week_id is null then
    raise notice 'Demo week not found. Run supabase/seed-demo-week.sql first.';
    return;
  end if;

  -- Rebuild weekly scores from predictions and official match results.
  delete from public.weekly_scores
  where week_id = demo_week_id;

  insert into public.weekly_scores (week_id, user_id, correct_count, points)
  select
    demo_week_id,
    predictions.user_id,
    count(*) filter (where predictions.pick = matches.official_result)::integer as correct_count,
    count(*) filter (where predictions.pick = matches.official_result)::integer as points
  from public.predictions
  join public.matches on matches.id = predictions.match_id
  where predictions.week_id = demo_week_id
    and matches.week_id = demo_week_id
    and matches.official_result is not null
    and matches.official_result <> 'void'
  group by predictions.user_id;

  -- Rebuild demo season totals from every weekly score in the demo season.
  delete from public.season_scores
  where season_id = demo_season_id;

  insert into public.season_scores (season_id, user_id, points)
  select
    demo_season_id,
    weekly_scores.user_id,
    sum(weekly_scores.points)::integer as points
  from public.weekly_scores
  join public.weeks on weeks.id = weekly_scores.week_id
  where weeks.season_id = demo_season_id
  group by weekly_scores.user_id;
end $$;
