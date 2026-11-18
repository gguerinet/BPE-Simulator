begin;

-- 1. Vue classement : elle lit la table avec les droits du visiteur, qui ne voit que 4 colonnes publiques
create policy "lecture des colonnes publiques" on public.scores for select to anon using (true);
grant select (pseudo, hero, score, created_at) on public.scores to anon;
alter view public.classement set (security_invoker = true);

-- 2. Fonction du déclencheur : personne n'a besoin de l'appeler directement
revoke execute on function public.scores_avant_ajout() from public, anon, authenticated;

-- 3. Les deux fonctions appelées par le jeu : réservées aux visiteurs anonymes (le jeu n'a pas de comptes)
revoke execute on function public.commencer_partie(uuid) from authenticated;
revoke execute on function public.reserver_pseudo(text, uuid) from authenticated;

-- 4. Règle d'ajout : une vraie condition au lieu de « true » (le reste est contrôlé par le déclencheur)
alter policy "ajout seulement" on public.scores to anon with check (joueur_id is not null);

commit;
