const { chromium } = require('playwright');
const { partie } = require('./sim');
const { S, toSrc, w2 } = require('./strats');
(async () => {
  const b = await chromium.launch();
  const [names, heroes, n] = [process.argv[2].split(','), process.argv[3].split(','), +process.argv[4]];
  for (const s of names) for (const hero of heroes) for (let i = 0; i < n; i++) {
    const { res, errs, viol } = await partie(b, hero, toSrc(S[s]), 150000);
    if (!res || res.bloque) { console.log(JSON.stringify({ s, hero, bloque: res, errs })); continue; }
    console.log(JSON.stringify({ ALL: { nCafes: res.nCafes, weMaison: res.weekendsMaison, nWeB: res.nWeBureau, nUrg: res.nUrg, eMin: res.eMin, nImprevus: res.nImprevus, nRegressions: res.nRegressions, nBurnout: res.nBurnout, nightsWorked: res.nightsWorked, nightsSlept: res.nightsSlept, nTickets: res.nTickets, nTicketsTMA: res.nTicketsTMA, nAteliers: res.nAteliers, nAteliersRefuses: res.nAteliersRefuses, nPieges: res.nPieges, piegesEvites: res.piegesEvites, accepted: res.accepted, refused: res.refused, nArbitrages: res.nArbitrages, boostCalls: res.boostCalls, gonogo: res.gonogoChoix, total: res.total, qualite: res.qualite, cout: res.cout, nTicketsRevenus: res.nTicketsRevenus, nReunionAcceptes: res.nReunionAcceptes }, s, hero, score: w2(res), total: +res.total.toFixed(1), q: res.qualite, cout: res.cout, bonus: res.bonusGo, burn: res.nBurnout, gaps: res.accepted + res.refused, pieges: res.nPieges, gonogo: res.gonogoChoix, imprevus: res.nImprevus, regressions: res.nRegressions, tickets: res.nTickets, tma: res.nTicketsTMA, ateliers: res.nAteliers, ateliersRef: res.nAteliersRefuses, nuitsT: res.nightsWorked, nuitsD: res.nightsSlept, bwN: res.boostCalls, deckVide: res.accepted + res.refused + (res.nArbitrages || 0) >= 20, cafe: res.nCafes ?? res.xCafe, nUrg: res.nUrg, eMin: res.eMin, weMaison: res.weekendsMaison, nWeB: res.nWeBureau, weM: res.xWeM, weB: res.xWeB, urg: +(res.joursUrg || 0).toFixed(1), pEv: res.piegesEvites, gaps2: res.accepted, viol: viol.length, errs: errs.length }));
  }
  await b.close();
})();
