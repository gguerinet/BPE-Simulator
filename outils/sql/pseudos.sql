begin;

-- 1. Les pseudos réservés : un pseudo appartient au premier joueur qui le choisit (même sans score)
create table if not exists public.pseudos (
  cle       text primary key,                 -- pseudo en minuscules
  pseudo    text not null,
  joueur_id uuid not null,
  cree      timestamptz not null default now()
);
alter table public.pseudos enable row level security;
revoke all on public.pseudos from anon, authenticated;
drop policy if exists "aucun accès direct" on public.pseudos;
create policy "aucun accès direct" on public.pseudos for all to anon, authenticated using (false) with check (false);
create index if not exists pseudos_joueur_idx on public.pseudos (joueur_id, cree);

-- Les pseudos déjà présents au classement restent à leur premier joueur
insert into public.pseudos (cle, pseudo, joueur_id, cree)
select distinct on (lower(btrim(pseudo))) lower(btrim(pseudo)), btrim(pseudo), joueur_id, created_at
  from public.scores where joueur_id is not null
 order by lower(btrim(pseudo)), created_at
on conflict (cle) do nothing;

-- 2. Le jeu réserve le pseudo dès qu'on le choisit : « ok » s'il est libre ou déjà à ce joueur, « pris » sinon
create or replace function public.reserver_pseudo(p text, j uuid)
returns text language plpgsql volatile security definer set search_path = public as $$
declare
  k text := lower(btrim(coalesce(p, '')));
  proprio uuid;
begin
  if j is null or k = '' or char_length(k) > 20 or k ~ '[[:cntrl:]]' then
    return 'inconnu';
  end if;
  select joueur_id into proprio from public.pseudos where cle = k;
  if proprio is not null then
    return case when proprio = j then 'ok' else 'pris' end;
  end if;
  -- Pas plus de 10 nouveaux pseudos par joueur et par jour, ni 200 par heure au total
  if (select count(*) from public.pseudos where joueur_id = j and cree > now() - interval '1 day') >= 10
     or (select count(*) from public.pseudos where cree > now() - interval '1 hour') >= 200 then
    return 'inconnu';
  end if;
  insert into public.pseudos (cle, pseudo, joueur_id) values (k, btrim(p), j) on conflict (cle) do nothing;
  select joueur_id into proprio from public.pseudos where cle = k;
  return case when proprio = j then 'ok' else 'pris' end;
end $$;
revoke all on function public.reserver_pseudo(text, uuid) from public, authenticated;
grant execute on function public.reserver_pseudo(text, uuid) to anon;

-- 3. L'envoi d'un score vérifie la réservation (et réserve le pseudo s'il était encore libre)
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

  -- Le pseudo appartient au joueur qui l'a réservé en premier
  select joueur_id into proprio from public.pseudos where cle = lower(new.pseudo);
  if proprio is not null and proprio <> new.joueur_id then
    raise exception 'Ce pseudo est déjà pris par un autre joueur';
  end if;

  if exists (select 1 from public.scores
             where joueur_id = new.joueur_id and created_at > now() - interval '2 minutes') then
    raise exception 'Trop d''envois rapprochés, réessayez plus tard';
  end if;
  if (select count(*) from public.scores where created_at > now() - interval '1 minute') >= 30 then
    raise exception 'Trop d''envois en ce moment, réessayez plus tard';
  end if;

  if new.partie_id is null then
    if now() >= timestamptz '2026-11-25 00:00:00+01' then
      raise exception 'Partie inconnue : recharge le jeu';
    end if;
  else
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
    if new.total is null or new.qualite is null or new.cout is null
       or new.total < 20 or new.total > 1000
       or new.qualite < 0 or new.qualite > 100 or new.qualite * 2 <> floor(new.qualite * 2)
       or new.cout < 0 or new.cout > 1000000 or new.cout % 5000 <> 0
       or (new.gonogo is not null and new.gonogo not in ('go-ok', 'go-ko', 'nogo')) then
      raise exception 'Détail de partie invalide';
    end if;
    -- Qualité : note nulle à 40 %, parfaite dès 90 %
    nq := greatest(0, least(100, (new.qualite - 40) / 50 * 100));
    nb := greatest(0, least(100, 100 - greatest(0, new.cout - 5000) / 25000.0 * 100));
    nd := greatest(0, least(100, (170 - greatest(90, new.total)) / 80 * 100));
    base := floor(10000 * cbrt((nq / 100) * (nb / 100) * (nd / 100)) + 0.5);
    new.score := case when base > 0 then
                   greatest(0, least(10000, base + case new.gonogo when 'go-ok' then 200 when 'go-ko' then -200
                                                                   when 'nogo' then 100 else 0 end))
                 else 0 end;
  end if;

  -- Score accepté : le pseudo est réservé à ce joueur s'il était encore libre
  insert into public.pseudos (cle, pseudo, joueur_id) values (lower(new.pseudo), new.pseudo, new.joueur_id)
  on conflict (cle) do nothing;
  return new;
end $$;

commit;
