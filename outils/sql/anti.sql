begin;

-- 1. Les parties : un numéro et une heure de départ par partie, invisibles pour les visiteurs
create table if not exists public.parties (
  id        uuid primary key default gen_random_uuid(),
  joueur_id uuid not null,
  debut     timestamptz not null default now()
);
alter table public.parties enable row level security;
revoke all on public.parties from anon, authenticated;
create index if not exists parties_joueur_idx on public.parties (joueur_id, debut);
create index if not exists parties_debut_idx  on public.parties (debut);

-- Le jeu demande un numéro au lancement de chaque nouvelle partie
create or replace function public.commencer_partie(j uuid)
returns uuid language plpgsql volatile security definer set search_path = public as $$
declare
  pid uuid;
begin
  if j is null then
    raise exception 'Joueur inconnu';
  end if;
  if (select count(*) from public.parties where joueur_id = j and debut > now() - interval '1 hour') >= 30
     or (select count(*) from public.parties where debut > now() - interval '1 minute') >= 120 then
    raise exception 'Trop de parties commencées, réessayez plus tard';
  end if;
  delete from public.parties where debut < now() - interval '90 days';
  insert into public.parties (joueur_id) values (j) returning id into pid;
  return pid;
end $$;
revoke all on function public.commencer_partie(uuid) from public;
grant execute on function public.commencer_partie(uuid) to anon, authenticated;

-- 2. Le détail de la partie accompagne le score
alter table public.scores
  add column if not exists partie_id uuid,
  add column if not exists total     double precision,
  add column if not exists qualite   double precision,
  add column if not exists cout      integer,
  add column if not exists gonogo    text;
create unique index if not exists scores_partie_unique on public.scores (partie_id);
grant insert (pseudo, hero, score, joueur_id, partie_id, total, qualite, cout, gonogo) on public.scores to anon, authenticated;

-- 3. Contrôles à l'ajout : pseudo, rythme, numéro et durée de partie, score recalculé par la base
create or replace function public.scores_avant_ajout()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  proprio uuid;
  p       public.parties%rowtype;
  nq      double precision;
  nb      double precision;
  nd      double precision;
  base    integer;
begin
  new.pseudo := btrim(new.pseudo);
  new.created_at := now();
  if new.joueur_id is null then
    raise exception 'Joueur inconnu';
  end if;

  -- Un pseudo appartient au premier joueur qui l'a utilisé
  select joueur_id into proprio from public.scores
   where lower(pseudo) = lower(new.pseudo) order by created_at limit 1;
  if proprio is not null and proprio <> new.joueur_id then
    raise exception 'Ce pseudo est déjà pris par un autre joueur';
  end if;

  -- Rythme des envois
  if exists (select 1 from public.scores
             where joueur_id = new.joueur_id and created_at > now() - interval '2 minutes') then
    raise exception 'Trop d''envois rapprochés, réessayez plus tard';
  end if;
  if (select count(*) from public.scores where created_at > now() - interval '1 minute') >= 30 then
    raise exception 'Trop d''envois en ce moment, réessayez plus tard';
  end if;

  -- Ancienne version du jeu (sans numéro de partie) : acceptée jusqu'au 25 novembre, le temps que tout le monde recharge
  if new.partie_id is null then
    if now() >= timestamptz '2026-11-25 00:00:00+01' then
      raise exception 'Partie inconnue : recharge le jeu';
    end if;
    return new;
  end if;

  -- La partie doit exister, appartenir à ce joueur, ne pas avoir déjà servi, et avoir duré au moins 2 minutes
  select * into p from public.parties where id = new.partie_id;
  if not found or p.joueur_id <> new.joueur_id then
    raise exception 'Partie inconnue';
  end if;
  if exists (select 1 from public.scores where partie_id = new.partie_id) then
    raise exception 'Score déjà envoyé pour cette partie';
  end if;
  if now() - p.debut < interval '2 minutes' then
    raise exception 'Partie trop courte';
  end if;

  -- Détail plausible
  if new.total is null or new.qualite is null or new.cout is null
     or new.total < 20 or new.total > 1000
     or new.qualite < 0 or new.qualite > 100 or new.qualite * 2 <> floor(new.qualite * 2)
     or new.cout < 0 or new.cout > 1000000 or new.cout % 5000 <> 0
     or (new.gonogo is not null and new.gonogo not in ('go-ok', 'go-ko', 'nogo')) then
    raise exception 'Détail de partie invalide';
  end if;

  -- Score recalculé avec la formule du jeu : il remplace celui envoyé par le navigateur
  nq := greatest(0, least(100, (new.qualite - 40) / 50 * 100));
  nb := greatest(0, least(100, 100 - greatest(0, new.cout - 5000) / 25000.0 * 100));
  nd := greatest(0, least(100, (170 - greatest(90, new.total)) / 80 * 100));
  base := floor(10000 * cbrt((nq / 100) * (nb / 100) * (nd / 100)) + 0.5);
  new.score := case when base > 0 then
                 greatest(0, least(10000, base + case new.gonogo when 'go-ok' then 200 when 'go-ko' then -200
                                                                 when 'nogo' then 100 else 0 end))
               else 0 end;
  return new;
end $$;

commit;
