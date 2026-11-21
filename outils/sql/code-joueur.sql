-- Code joueur : un même joueur sur plusieurs appareils, avec son pseudo actuel tenu à jour côté serveur
-- À lancer une fois dans Supabase (SQL Editor), après pseudos.sql. Sans danger si relancé.
begin;

-- 1. Pseudo actuel de chaque joueur (mis à jour à chaque changement de pseudo)
create table if not exists public.joueurs (
  joueur_id uuid primary key,
  pseudo    text not null,
  maj       timestamptz not null default now()
);
alter table public.joueurs enable row level security;
revoke all on public.joueurs from anon, authenticated;
drop policy if exists "aucun accès direct" on public.joueurs;
create policy "aucun accès direct" on public.joueurs for all to anon, authenticated using (false) with check (false);

-- Reprise : le dernier pseudo réservé par chaque joueur devient son pseudo actuel
insert into public.joueurs (joueur_id, pseudo, maj)
select distinct on (joueur_id) joueur_id, pseudo, cree from public.pseudos order by joueur_id, cree desc
on conflict (joueur_id) do nothing;

-- 2. Réservation d'un pseudo : identique à pseudos.sql, et le pseudo accepté devient le pseudo actuel du joueur
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
  if proprio is null then
    -- Pas plus de 10 nouveaux pseudos par joueur et par jour, ni 200 par heure au total
    if (select count(*) from public.pseudos where joueur_id = j and cree > now() - interval '1 day') >= 10
       or (select count(*) from public.pseudos where cree > now() - interval '1 hour') >= 200 then
      return 'inconnu';
    end if;
    insert into public.pseudos (cle, pseudo, joueur_id) values (k, btrim(p), j) on conflict (cle) do nothing;
    select joueur_id into proprio from public.pseudos where cle = k;
  end if;
  if proprio <> j then
    return 'pris';
  end if;
  insert into public.joueurs (joueur_id, pseudo, maj) values (j, btrim(p), now())
  on conflict (joueur_id) do update set pseudo = excluded.pseudo, maj = excluded.maj;
  return 'ok';
end $$;
revoke all on function public.reserver_pseudo(text, uuid) from public, authenticated;
grant execute on function public.reserver_pseudo(text, uuid) to anon;

-- 3. Pseudo actuel d'un code joueur (le code est secret : seul celui qui le connaît peut l'utiliser)
create or replace function public.pseudo_du_joueur(j uuid)
returns text language sql stable security definer set search_path = public as $$
  select pseudo from public.joueurs where joueur_id = j
$$;
revoke all on function public.pseudo_du_joueur(uuid) from public, authenticated;
grant execute on function public.pseudo_du_joueur(uuid) to anon;

commit;
