-- Optional official team IDs for logo rendering.
-- Broadage exposes team logos by numeric externalTeamId:
-- https://cdn.broadage.com/images-teams/soccer/72x72/{externalTeamId}.png
-- These IDs come from the official Spor Toto GetGameMatches response.

alter table public.matches
add column if not exists home_external_team_id integer;

alter table public.matches
add column if not exists away_external_team_id integer;

comment on column public.matches.home_external_team_id is
  'Official homeTeam.externalTeamId used to build Broadage team logo URLs.';

comment on column public.matches.away_external_team_id is
  'Official awayTeam.externalTeamId used to build Broadage team logo URLs.';
