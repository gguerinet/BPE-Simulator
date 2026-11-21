-- Records : les meilleurs scores de chaque joueur (10 au plus, tous personnages confondus), gardés sur le serveur
-- pour les retrouver sur un autre appareil avec le code joueur. À lancer une fois, après code-joueur.sql. Sans danger si relancé.
begin;

create table if not exists public.records_joueurs (
  joueur_id uuid primary key,
  records   jsonb not null default '[]'::jsonb,
  maj       timestamptz not null default now()
);
alter table public.records_joueurs enable row level security;
revoke all on public.records_joueurs from anon, authenticated;
drop policy if exists "aucun accès direct" on public.records_joueurs;
create policy "aucun accès direct" on public.records_joueurs for all to anon, authenticated using (false) with check (false);

-- Lecture des records d'un code joueur
create or replace function public.records_du_joueur(j uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select records from public.records_joueurs where joueur_id = j
$$;
revoke all on function public.records_du_joueur(uuid) from public, authenticated;
grant execute on function public.records_du_joueur(uuid) to anon;

-- Enregistrement : seulement pour un code joueur déjà rattaché à un pseudo, liste courte et bien formée.
-- Ces records n'ont aucun effet sur le classement en ligne (qui ne lit que les scores vérifiés).
create or replace function public.enregistrer_records(j uuid, r jsonb)
returns text language plpgsql volatile security definer set search_path = public as $$
begin
  if j is null or r is null or jsonb_typeof(r) <> 'array' or jsonb_array_length(r) > 10 or pg_column_size(r) > 8000 then
    return 'refuse';
  end if;
  if exists (select 1 from jsonb_array_elements(r) e
             where jsonb_typeof(e) <> 'object'
                or jsonb_typeof(e->'score') <> 'number'
                or (e->>'score')::numeric < 0 or (e->>'score')::numeric > 10000
                or coalesce(e->>'nom', '') not in ('François', 'Gabriel', 'Hugues', 'Samuel')) then
    return 'refuse';
  end if;
  if not exists (select 1 from public.joueurs where joueur_id = j) then
    return 'inconnu';
  end if;
  insert into public.records_joueurs (joueur_id, records, maj) values (j, r, now())
  on conflict (joueur_id) do update set records = excluded.records, maj = excluded.maj;
  return 'ok';
end $$;
revoke all on function public.enregistrer_records(uuid, jsonb) from public, authenticated;
grant execute on function public.enregistrer_records(uuid, jsonb) to anon;

commit;
