-- =====================================================================
-- BPE Simulator · nouveau barème de la note de coût (à exécuter une fois)
-- Supabase > SQL Editor > New query > Run
-- Note de coût selon le nombre de missions b.workchoc payées (5 000 € chacune) :
--   0 → 100, 1 → 95, 2 → 85, 3 → 65, 4 → 25, 5 ou plus → 0
-- Même calcul que le jeu (index.html, C2). Le reste de la vérification est inchangé.
-- =====================================================================
begin;

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
    -- Coût : 100, 95, 85, 65, 25 selon le nombre de missions payées, puis 0 dès la 5e
    nb := case new.cout / 5000 when 0 then 100 when 1 then 95 when 2 then 85 when 3 then 65 when 4 then 25 else 0 end;
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
