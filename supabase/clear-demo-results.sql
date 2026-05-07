-- Clear demo results, remove calculated demo scores, and reopen the demo week.
-- Safe to run repeatedly after supabase/schema.sql and supabase/seed-demo-week.sql.

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

  update public.matches
  set official_result = null
  where week_id = demo_week_id;

  delete from public.weekly_scores
  where week_id = demo_week_id;

  delete from public.season_scores
  where season_id = demo_season_id;

  insert into public.season_scores (season_id, user_id, points)
  select demo_season_id, weekly_scores.user_id, sum(weekly_scores.points)::integer
  from public.weekly_scores
  join public.weeks on weeks.id = weekly_scores.week_id
  where weeks.season_id = demo_season_id
  group by weekly_scores.user_id;

  update public.weeks
  set opens_at = now() - interval '1 hour',
      closes_at = now() + interval '7 days'
  where id = demo_week_id;
end $$;
