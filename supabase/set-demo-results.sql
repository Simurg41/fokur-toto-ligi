-- Set demo match results and close the demo week.
-- Safe to run repeatedly after supabase/schema.sql and supabase/seed-demo-week.sql.
-- After this, run supabase/recalculate-demo-scores.sql to update leaderboards.

do $$
declare
  demo_week_id uuid;
begin
  select weeks.id into demo_week_id
  from public.weeks
  join public.seasons on seasons.id = weeks.season_id
  where seasons.name = 'Demo Sezon'
    and weeks.name = 'Demo 1. Hafta'
  limit 1;

  if demo_week_id is null then
    raise notice 'Demo week not found. Run supabase/seed-demo-week.sql first.';
    return;
  end if;

  update public.weeks
  set closes_at = now() - interval '1 minute'
  where id = demo_week_id;

  update public.matches
  set official_result = case position
    when 1 then '1'
    when 2 then 'X'
    when 3 then '2'
    when 4 then '1'
    when 5 then 'X'
    when 6 then '2'
    when 7 then '1'
    when 8 then 'X'
    when 9 then '2'
    when 10 then '1'
    when 11 then 'X'
    when 12 then '2'
    when 13 then '1'
    when 14 then 'X'
    when 15 then '2'
    else official_result
  end
  where week_id = demo_week_id
    and position between 1 and 15;
end $$;
