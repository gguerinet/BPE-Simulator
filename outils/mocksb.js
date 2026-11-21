// Imitation minimale de l'API REST Supabase, branchée sur la base PostgreSQL locale avec le rôle anon
const { execFileSync } = require('child_process');
const sql = (q) => execFileSync('su', ['postgres', '-c', 'psql -d bpe -qAt -v ON_ERROR_STOP=1'], { input: 'begin; set local role anon; ' + q + '; commit;' }).toString().trim();
const dq = (s) => '$j$' + s + '$j$';
module.exports = (opts = {}) => async (route) => {
  const req = route.request(), u = new URL(req.url()), body = req.postData() || '{}';
  const ok = (v) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(v) });
  try {
    if (u.pathname.endsWith('/rpc/commencer_partie')) return ok(sql(`select commencer_partie((${dq(body)}::json->>'j')::uuid)`));
    if (u.pathname.endsWith('/rpc/pseudo_du_joueur')) return route.fulfill({ status: 200, contentType: 'application/json', body: sql(`select to_json(pseudo_du_joueur((${dq(body)}::json->>'j')::uuid))`) || 'null' });
    if (u.pathname.endsWith('/rpc/reserver_pseudo')) return ok(sql(`select reserver_pseudo(${dq(body)}::json->>'p', (${dq(body)}::json->>'j')::uuid)`));
    if (u.pathname.endsWith('/classement')) return ok(sql(`select coalesce(json_agg(c), '[]') from (select pseudo, hero, score, created_at from classement order by score desc limit 10) c`) ? JSON.parse(sql(`select coalesce(json_agg(c), '[]') from (select pseudo, hero, score, created_at from classement order by score desc limit 10) c`)) : []);
    if (u.pathname.endsWith('/scores')) {
      if (opts.vieillir) execFileSync('su', ['postgres', '-c', 'psql -d bpe -qAt'], { input: "update parties set debut = now() - interval '10 minutes'; update scores set created_at = now() - interval '10 minutes';" });
      (opts.log || []).push(body);
      sql(`insert into scores (pseudo, hero, score, joueur_id, partie_id, total, qualite, cout, gonogo) select * from json_to_record(${dq(body)}) as x(pseudo text, hero text, score int, joueur_id uuid, partie_id uuid, total float8, qualite float8, cout int, gonogo text)`);
      return route.fulfill({ status: 201, body: '' });
    }
    return route.fulfill({ status: 404, body: '{}' });
  } catch (e) {
    const m = (e.stderr || e.message).toString().match(/ERROR:\s+(.*)/);
    return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ code: 'P0001', message: m ? m[1] : 'erreur' }) });
  }
};
