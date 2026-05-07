-- Reopen the demo week for testing prediction entry again.
-- Safe to run repeatedly after supabase/schema.sql and supabase/seed-demo-week.sql.

update public.weeks
set opens_at = now() - interval '1 hour',
    closes_at = now() + interval '7 days'
where name = 'Demo 1. Hafta'
  and season_id in (
    select id
    from public.seasons
    where name = 'Demo Sezon'
  );
