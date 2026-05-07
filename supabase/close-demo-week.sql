-- Close the demo week for testing the "Herkesin Tahminleri" view.
-- Safe to run repeatedly after supabase/schema.sql and supabase/seed-demo-week.sql.

update public.weeks
set closes_at = now() - interval '1 minute'
where name = 'Demo 1. Hafta'
  and season_id in (
    select id
    from public.seasons
    where name = 'Demo Sezon'
  );
