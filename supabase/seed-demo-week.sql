-- Demo week seed for Spor Toto Tahmin
-- Copy this file into the Supabase SQL Editor after running supabase/schema.sql.
-- It creates one active season, one open week, and 15 demo matches.
-- Safe to run more than once: the same demo season/week is reused, and matches are upserted by position.

do $$
declare
  demo_season_id uuid;
  demo_week_id uuid;
begin
  -- Keep the selected demo season as the only active season.
  update public.seasons
  set is_active = false;

  select id into demo_season_id
  from public.seasons
  where name = 'Demo Sezon'
  order by created_at
  limit 1;

  if demo_season_id is null then
    insert into public.seasons (name, starts_at, ends_at, is_active)
    values ('Demo Sezon', current_date, current_date + 90, true)
    returning id into demo_season_id;
  end if;

  update public.seasons
  set starts_at = current_date,
      ends_at = current_date + 90,
      is_active = (id = demo_season_id)
  where id = demo_season_id;

  select id into demo_week_id
  from public.weeks
  where season_id = demo_season_id
    and week_number = 1
  limit 1;

  if demo_week_id is null then
    insert into public.weeks (season_id, week_number, name, opens_at, closes_at)
    values (
      demo_season_id,
      1,
      'Demo 1. Hafta',
      now() - interval '1 hour',
      now() + interval '7 days'
    )
    returning id into demo_week_id;
  else
    update public.weeks
    set name = 'Demo 1. Hafta',
        opens_at = now() - interval '1 hour',
        closes_at = now() + interval '7 days'
    where id = demo_week_id;
  end if;

  insert into public.matches (week_id, position, home_team, away_team, starts_at)
  values
    (demo_week_id, 1, 'Galatasaray', 'Trabzonspor', now() + interval '1 day'),
    (demo_week_id, 2, 'Fenerbahce', 'Samsunspor', now() + interval '1 day 2 hours'),
    (demo_week_id, 3, 'Besiktas', 'Antalyaspor', now() + interval '1 day 4 hours'),
    (demo_week_id, 4, 'Basaksehir', 'Konyaspor', now() + interval '2 days'),
    (demo_week_id, 5, 'Rizespor', 'Kayserispor', now() + interval '2 days 2 hours'),
    (demo_week_id, 6, 'Adana Demirspor', 'Alanyaspor', now() + interval '2 days 4 hours'),
    (demo_week_id, 7, 'Sivasspor', 'Kasimpasa', now() + interval '3 days'),
    (demo_week_id, 8, 'Ankaragucu', 'Gaziantep FK', now() + interval '3 days 2 hours'),
    (demo_week_id, 9, 'Goztepe', 'Genclerbirligi', now() + interval '3 days 4 hours'),
    (demo_week_id, 10, 'Bodrum FK', 'Erzurumspor', now() + interval '4 days'),
    (demo_week_id, 11, 'Sakaryaspor', 'Boluspor', now() + interval '4 days 2 hours'),
    (demo_week_id, 12, 'Kocaelispor', 'Bandirmaspor', now() + interval '4 days 4 hours'),
    (demo_week_id, 13, 'Altay', 'Manisa FK', now() + interval '5 days'),
    (demo_week_id, 14, 'Corum FK', 'Umraniyespor', now() + interval '5 days 2 hours'),
    (demo_week_id, 15, 'Pendikspor', 'Istanbulspor', now() + interval '5 days 4 hours')
  on conflict (week_id, position) do update
  set home_team = excluded.home_team,
      away_team = excluded.away_team,
      starts_at = excluded.starts_at;
end $$;
