#!/usr/bin/env bash
# Recrée en local (PostgreSQL) une copie de la base Supabase du classement, pour tester sans toucher à la vraie
set -e
cd "$(dirname "$0")"
command -v psql >/dev/null || apt-get install -y -q postgresql >/dev/null
service postgresql start >/dev/null 2>&1 || true
P() { su postgres -c "psql -q -v ON_ERROR_STOP=1 $*"; }
P -f - < base.sql
P -d bpe -f - < anti.sql
P -d bpe -f - < advisor.sql
echo 'create policy "aucun accès direct" on public.parties for all to anon, authenticated using (false) with check (false);' | P -d bpe -f -
echo "Base locale « bpe » prête"
