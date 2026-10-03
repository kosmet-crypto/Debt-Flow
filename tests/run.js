// Checks for index.html: statistics math (hand-computed cases), categories, and screenshots.
// Uses only made-up data. Run: node tests/run.js  (screenshots go to tests/out/, which is git-ignored)
const path = require('path'), fs = require('fs');
let chromium;
try { ({chromium} = require('playwright')); } catch(e){ ({chromium} = require('/opt/node-tools/node_modules/playwright')); }

const PAGE = 'file://' + path.resolve(__dirname, '..', 'index.html');
const OUT = path.join(__dirname, 'out');
let failed = 0;
function check(name, ok, info){ console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || info === undefined ? '' : '  → ' + JSON.stringify(info))); if(!ok) failed++; }

(async () => {
  fs.mkdirSync(OUT, {recursive:true});
  const browser = await chromium.launch();
  const errors = [];
  const open = async (opts) => {
    const ctx = await browser.newContext(Object.assign({viewport:{width:390, height:844}, deviceScaleFactor:2, locale:'sr-RS'}, opts));
    const pg = await ctx.newPage();
    pg.on('pageerror', e => errors.push(e.message));
    pg.on('console', m => { if(m.type() === 'error' && !/ERR_|Failed to load resource/.test(m.text())) errors.push(m.text()); });
    await pg.goto(PAGE); await pg.waitForTimeout(200);
    return pg;
  };

  /* ---------- unit checks ---------- */
  const pg = await open();
  const u = await pg.evaluate(() => {
    const r = {};
    r.q = [quantile([0, 0, 100, 200, 300, 400], 0.25), quantile([0, 0, 100, 200, 300, 400], 0.75), quantile([5], 0.25), quantile([], 0.5)];
    r.nice = [niceMax(22000), niceMax(1144), niceMax(1), niceMax(0), niceMax(99)];
    r.m = [monthsToPay(1000, 300), monthsToPay(1000, 0), monthsToPay(100000, 500), monthsToPay(1200, 100)];
    // debt opened June 2025, 20 000 owed, repaid 100, 200, … 1200 in Oct 2025 … Sep 2026
    const now = new Date(2026, 9, 15).getTime();
    D = blank();
    D.people.push({id:'p', name:'Test', created:0});
    D.debts.push({id:'d', personId:'p', dir:'by', currency:'EUR', title:'', opened:new Date(2025, 5, 1).getTime(), closed:null, plan:null});
    D.entries.push({id:'e0', debtId:'d', date:new Date(2025, 5, 1).getTime(), amount:20000, note:'', kind:'tx'});
    for(let k = 0; k < 12; k++) D.entries.push({id:'e' + (k + 1), debtId:'d', date:new Date(2025, 9 + k, 10).getTime(), amount:-(k + 1) * 100, note:'', kind:'tx',
      loc:{amt:(k + 1) * 1150, cur:'NOK', rate:11.5, inferred:false}});
    const f = finishRange(debt('d'), now);
    r.f = {bal:f.bal, months:f.months, enough:f.enough, real:f.pace.real, opt:f.pace.opt, caut:f.pace.caut, mr:f.real, mo:f.opt, mc:f.caut,
      er:isoDate(f.end_real), eo:isoDate(f.end_opt), ec:isoDate(f.end_caut)};
    const idx = completeMonths(debt('d'), 12, now);
    r.loc = monthlyRepaid(debt('d'), idx, true).slice(0, 3);
    // fewer than 6 complete months
    D.debts[0].opened = new Date(2026, 5, 10).getTime();
    const g = finishRange(debt('d'), now); r.short = {months:g.months, enough:g.enough};
    // no repayments → 10+ years
    D.entries = D.entries.filter(e => e.amount > 0);
    const h = finishRange(debt('d'), now); r.none = {real:h.real, end:h.end_real, txt:fmtEnd(h.end_real)};
    // the band must always enclose the realistic pace (random and skewed months)
    let bad = 0;
    const sets = [[0,0,0,0,0,0,0,0,0,0,0,12000]];
    for(let s = 0; s < 300; s++) sets.push(Array.from({length:12}, () => Math.random() < 0.3 ? 0 : Math.round(Math.random() * 3000)));
    for(const tot of sets){
      const real = mean(tot), opt = Math.max(quantile(tot, 0.75), real), caut = Math.min(quantile(tot, 0.25), real);
      if(!(opt >= real && real >= caut)) bad++;
      // balances along the projection: cautious line never below realistic, optimistic never above
      for(let m = 0; m <= 60; m++){ const b = v => Math.max(0, 50000 - v * m); if(b(caut) < b(real) || b(opt) > b(real)) bad++; }
    }
    r.band = bad;
    // categories, both scripts
    D = blank();
    r.cats = ['Лего кесица', 'LEGO set', 'Купила Редми 8 телефон', 'xiaomi slušalice', 'Карта за концерт', 'Beč vikend', 'Беч викенд', 'Роблокс картица',
      'ikea polica', 'Икеа', 'Лекови', '', 'ае поклон', 'маје'].map(n => [n, categoryOf(n)]);
    D.settings.cats[0].words.push('кесица');
    r.edit = categoryOf('кесица бомбона');
    return r;
  });
  check('quantile P25/P75 (25, 275), single value, empty', JSON.stringify(u.q) === JSON.stringify([25, 275, 5, 0]), u.q);
  check('axis top: 22 000→25 000, 1 144→1 200, 1→1, 0→1, 99→100', JSON.stringify(u.nice) === JSON.stringify([25000, 1200, 1, 1, 100]), u.nice);
  check('months to pay: 1000@300=4, pace 0=never, >10y=never, exact 12', JSON.stringify(u.m) === JSON.stringify([4, null, null, 12]), u.m);
  check('finish: balance 12 200, 12 months', u.f.bal === 12200 && u.f.months === 12 && u.f.enough, u.f);
  check('finish: paces mean 650, P75 925, P25 375', u.f.real === 650 && u.f.opt === 925 && u.f.caut === 375, u.f);
  check('finish: 19 / 14 / 33 months', u.f.mr === 19 && u.f.mo === 14 && u.f.mc === 33, u.f);
  check('finish: ends May 2028, Dec 2027, Jul 2029', u.f.er === '2028-05-01' && u.f.eo === '2027-12-01' && u.f.ec === '2029-07-01', u.f);
  check('monthly local amounts (1150, 2300, 3450)', JSON.stringify(u.loc) === JSON.stringify([1150, 2300, 3450]), u.loc);
  check('fewer than 6 months: no range', u.short.months === 4 && u.short.enough === false, u.short);
  check('no repayments: 10+ years', u.none.real === null && u.none.end === null && u.none.txt === '10+ година', u.none);
  check('range band always encloses the realistic line', u.band === 0, u.band);
  const want = {'Лего кесица':'toys', 'LEGO set':'toys', 'Купила Редми 8 телефон':'tech', 'xiaomi slušalice':'tech', 'Карта за концерт':'travel',
    'Beč vikend':'travel', 'Беч викенд':'travel', 'Роблокс картица':'everyday', 'ikea polica':'everyday', 'Икеа':'everyday', 'Лекови':'other', '':'other',
    'ае поклон':'everyday', 'маје':'other'};
  for(const [n, c] of u.cats) check(`category "${n}" → ${want[n]}`, c === want[n], c);
  check('edited keyword applies at once', u.edit === 'toys', u.edit);
  await pg.context().close();

  /* ---------- screenshots: light/dark, 390 and 1280 px ---------- */
  const seed = () => {
    const now = Date.now(), M = 30.44 * 864e5;
    D = blank(); D.settings.lang = 'sr';
    D.people.push({id:'a', name:'Ана', created:0}, {id:'k', name:'Дечји рачун', created:0});
    D.debts.push({id:'eur', personId:'a', dir:'by', currency:'EUR', title:'', opened:now - 26 * M, closed:null, plan:{amt:10000, cur:'NOK', start:now - 10 * M}});
    D.debts.push({id:'kid', personId:'k', dir:'by', currency:'NOK', title:'', opened:now - 20 * M, closed:null, plan:null});
    D.entries.push({id:'x0', debtId:'eur', date:now - 26 * M, amount:22000, note:'', kind:'tx'});
    const notes = ['Лего кесица', 'Redmi телефон', 'Карта за концерт', 'Икеа', 'Роблокс', 'Лекови', 'LOL лутка', 'сувенири Беч'];
    for(let i = 24; i >= 0; i--){
      const d = now - i * M - 3 * 864e5;
      if(i % 5 !== 2){ const nok = 8000 + (i * 1373 % 5) * 1000; D.entries.push({id:'r' + i, debtId:'eur', date:d, amount:-Math.round(nok / 11.5), note:nok + ' nok', kind:'tx', loc:{amt:nok, cur:'NOK', rate:11.5, inferred:i % 3 === 0}}); }
      if(i < 20){ D.entries.push({id:'ki' + i, debtId:'kid', date:d, amount:1766, note:'Barnetrygd', kind:'tx'});
        D.entries.push({id:'ko' + i, debtId:'kid', date:d + 5 * 864e5, amount:-(300 + (i * 211 % 900)), note:notes[i % notes.length], kind:'tx'}); }
    }
    save();
  };
  for(const [w, h] of [[390, 844], [1280, 900]]){
    for(const scheme of ['light', 'dark']){
      const p2 = await open({viewport:{width:w, height:h}, colorScheme:scheme});
      await p2.evaluate(seed); await p2.reload(); await p2.waitForTimeout(200);
      for(const who of ['a', 'k']){
        await p2.click(`.row[data-person="${who}"]`); await p2.waitForTimeout(200);
        if(who === 'a' && w === 390 && scheme === 'light') await p2.screenshot({path:path.join(OUT, 'person-card.png')});
        await p2.click('[data-act=stats]'); await p2.waitForTimeout(250);
        // hover the chart a little to the right of "now" to show the projection tooltip
        const box = await p2.locator('.page').last().locator('.chart').first().boundingBox();
        await p2.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.5); await p2.waitForTimeout(100);
        const pageEl = p2.locator('.page').last();
        const full = await pageEl.evaluate(el => el.scrollHeight);
        await p2.setViewportSize({width:w, height:Math.min(full + 40, 4000)}); await p2.waitForTimeout(100);
        await p2.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.5); await p2.waitForTimeout(100);
        await p2.screenshot({path:path.join(OUT, `stats-${who}-${w}-${scheme}.png`)});
        await p2.setViewportSize({width:w, height:h});
        await p2.goBack(); await p2.waitForTimeout(150); await p2.goBack(); await p2.waitForTimeout(150);
      }
      await p2.context().close();
    }
  }
  // repeat chip + category editor
  const p3 = await open();
  await p3.evaluate(seed); await p3.reload(); await p3.waitForTimeout(200);
  await p3.click('.row[data-person="a"]'); await p3.click('[data-act=entry-for]'); await p3.waitForTimeout(200);
  await p3.click('[data-act=f-repeat]'); await p3.waitForTimeout(150);
  const rep = await p3.evaluate(() => ({loc:F.loc, amt:parseNum(F.amt), flow:F.flow}));
  check('“same as last time” copies the kroner amount and flow', rep.loc !== '' && rep.amt > 0 && rep.flow === 'give', rep);
  await p3.screenshot({path:path.join(OUT, 'form-repeat.png')});
  check('no page errors', errors.length === 0, errors);
  await browser.close();
  console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
  process.exit(failed ? 1 : 0);
})();
