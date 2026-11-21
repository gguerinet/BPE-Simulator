-- Classement : le meilleur score de chaque joueur avec chaque personnage (un joueur peut donc apparaître 4 fois)
-- À lancer une fois dans Supabase (SQL Editor). Sans danger si relancé.
create or replace view public.classement with (security_invoker = true) as
select distinct on (lower(pseudo), hero) pseudo, hero, score, created_at
  from public.scores
 order by lower(pseudo), hero, score desc, created_at;
