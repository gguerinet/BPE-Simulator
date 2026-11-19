const { chromium } = require('playwright');
const { open } = require('./harness');
const fs = require('fs');
const mock = require('./mocksb');
const { S, toSrc, w2 } = require('./strats');
const FC = fs.readFileSync(__dirname + '/fakeclock.js', 'utf8');
async function jouer(b, nom, opts) {
  const log = [];
  const { p, errs, ctx } = await open({ browser: b, url: 'http://bpe.test/game.html', wait: 300, supabase: mock({ ...opts, log }),
    init: FC + `;try{localStorage.setItem('bpe-simulator-pseudo', JSON.stringify(${JSON.stringify(opts.pseudo)}));}catch(e){}` });
  await p.addScriptTag({ content: fs.readFileSync(__dirname + '/bot.js', 'utf8') });
  await p.evaluate(() => { window.__res = null; window.__end = (f) => (window.__res = f); window.__start('hugues'); });
  for (let i = 0; i < 6; i++) await p.evaluate(() => window.__adv(500));
  const pid = await p.evaluate(() => window.__api.n.current.partieId);
  await p.evaluate((src) => window.__bot(eval('(' + src + ')')), toSrc(S.smartGO));
  let res = null;
  for (let i = 0; i < 3000 && !res; i++) res = await p.evaluate(() => { window.__adv(1000); return window.__res; });
  for (let i = 0; i < 20; i++) await p.evaluate(() => window.__adv(500));
  await p.waitForTimeout(1500);
  const txt = await p.evaluate(() => (document.body.innerText.match(/(Score non publi[^\n]*|Classement en ligne[^\n]*|[^\n]*rang[^\n]*|[^\n]*classement[^\n]*)/gi) || []).slice(0, 2));
  const client = w2(res);
  console.log(nom, '| numéro de partie :', pid ? 'oui' : 'non', '| score jeu :', client, '| envoyé :', log.length ? JSON.parse(log[0]).score + ' avec détail ' + JSON.stringify((({ total, qualite, cout, gonogo }) => ({ total: +total.toFixed(2), qualite, cout, gonogo }))(JSON.parse(log[0]))) : '-', '| message :', JSON.stringify(txt), errs.length ? errs : '');
  await ctx.close();
}
(async () => {
  const b = await chromium.launch();
  
  await jouer(b, 'Partie normale             ', { pseudo: 'Audit4', vieillir: true });
  await b.close();
  console.log(require('child_process').execFileSync('su', ['postgres', '-c', 'psql -d bpe -qAt'], { input: "select pseudo || ' : ' || score || ' (partie ' || coalesce(left(partie_id::text, 8), 'aucune') || ')' from scores order by id;" }).toString());
})();
