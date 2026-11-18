const { chromium } = require('playwright');
const { open } = require('./harness');
const fs = require('fs');
const { S, toSrc } = require('./strats');
const FC = fs.readFileSync(__dirname + '/fakeclock.js', 'utf8');
(async () => {
  const b = await chromium.launch({ args: ['--js-flags=--expose-gc'] });
  const { p, errs } = await open({ browser: b, url: 'http://bpe.test/game.html', wait: 300, init: FC + ';window.__noDraw=false;' });
  await p.addScriptTag({ content: fs.readFileSync(__dirname + '/bot.js', 'utf8') });
  await p.evaluate(() => window.__start('hugues'));
  for (let i = 0; i < 6; i++) await p.evaluate(() => window.__adv(500));
  const m = () => p.evaluate(() => { gc(); const g = window.__api.n.current; return { heapMo: +(performance.memory.usedJSHeapSize / 1e6).toFixed(1), dom: document.getElementsByTagName('*').length, timersMemo: window.__api.He.current.length, ents: g.ents.length, journal: g.journal.length, curve: g.curve.length, saveKo: Math.round((localStorage.getItem('bpe-simulator-partie-v18') || '').length / 1024), pu: g.pu }; });
  console.log('début', JSON.stringify(await m()));
  await p.evaluate((src) => window.__bot(eval('(' + src + ')')), toSrc(S.sainSmart));
  for (let k = 1; k <= 4; k++) {
    for (let i = 0; i < 150; i++) await p.evaluate(() => window.__adv(1000));
    console.log('étape', k, JSON.stringify(await m()));
  }
  console.log(errs);
  await b.close();
})();
