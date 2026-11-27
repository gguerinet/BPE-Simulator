-- Succès : ceux de chaque joueur, gardés sur le serveur pour les retrouver sur un autre appareil avec le code joueur.
-- À lancer une fois dans Supabase > SQL Editor, après code-joueur.sql. Sans danger si relancé.
-- Forme : {"ok": {"<id du succès ou palier c-<compteur>-<1..4>>": "<date ISO>"}, "heros": {"<héros>": {"f": 0|1, "o": 0|1}},
--          "cumul": {"<compteur>": <nombre>, "pieces": <nombre>}}
begin;

create table if not exists public.succes_joueurs (
  joueur_id uuid primary key,
  succes    jsonb not null default '{}'::jsonb,
  maj       timestamptz not null default now()
);
alter table public.succes_joueurs enable row level security;
revoke all on public.succes_joueurs from anon, authenticated;
drop policy if exists "aucun accès direct" on public.succes_joueurs;
create policy "aucun accès direct" on public.succes_joueurs for all to anon, authenticated using (false) with check (false);

-- Lecture des succès d'un code joueur
create or replace function public.succes_du_joueur(j uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select succes from public.succes_joueurs where joueur_id = j
$$;
revoke all on function public.succes_du_joueur(uuid) from public, authenticated;
grant execute on function public.succes_du_joueur(uuid) to anon;

-- Enregistrement : seulement pour un code joueur déjà rattaché à un pseudo, et des succès connus
create or replace function public.enregistrer_succes(j uuid, s jsonb)
returns text language plpgsql volatile security definer set search_path = public as $$
begin
  if j is null or s is null or jsonb_typeof(s) <> 'object' or pg_column_size(s) > 32000
     or jsonb_typeof(coalesce(s->'ok', '{}'::jsonb)) <> 'object'
     or jsonb_typeof(coalesce(s->'heros', '{}'::jsonb)) <> 'object'
     or jsonb_typeof(coalesce(s->'cumul', '{}'::jsonb)) <> 'object' then
    return 'refuse';
  end if;
  if exists (select 1 from jsonb_each(coalesce(s->'ok', '{}'::jsonb)) e
             where e.key not in ('golive', 'comex', 'legende', 'heure', 'zerodefaut', 'kamikaze',
                                 'zeroeuro', 'famille', 'corps', 'sanscafe', 'noctambule', 'sage', 'rescape', 'mercenaire',
                                 'delegateur', 'denicheur', 'formateur', 'cambouis', 'equipe', 'orpartout',
                                 'propre', 'fidele', 'imprevu', 'zen', 'delai', 'qualite', 'goreussi', 'grandchelem',
                                 'gorate', 'photo', 'sprint', 'pastemps', 'surlefil', 'bonneetoile', 'diplomate', 'accueillant', 'boomerang')
                and e.key !~ '^c-(golive|ateliers|tickets|nuits|ors|points)-[1-4]$'
                or jsonb_typeof(e.value) <> 'string') then
    return 'refuse';
  end if;
  if exists (select 1 from jsonb_each(coalesce(s->'heros', '{}'::jsonb)) e
             where e.key not in ('francois', 'gabriel', 'hugues', 'samuel') or jsonb_typeof(e.value) <> 'object') then
    return 'refuse';
  end if;
  if exists (select 1 from jsonb_each(coalesce(s->'cumul', '{}'::jsonb)) e
             where e.key not in ('golive', 'ateliers', 'tickets', 'nuits', 'ors', 'points', 'pieces')
                or jsonb_typeof(e.value) <> 'number' or (e.value)::numeric < 0 or (e.value)::numeric > 1000000000) then
    return 'refuse';
  end if;
  if not exists (select 1 from public.joueurs where joueur_id = j) then
    return 'inconnu';
  end if;
  insert into public.succes_joueurs (joueur_id, succes, maj) values (j, s, now())
  on conflict (joueur_id) do update set succes = excluded.succes, maj = excluded.maj;
  return 'ok';
end $$;
revoke all on function public.enregistrer_succes(uuid, jsonb) from public, authenticated;
grant execute on function public.enregistrer_succes(uuid, jsonb) to anon;

commit;
