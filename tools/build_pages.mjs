#!/usr/bin/env node
/*
 * Generates the static, crawlable pages for the Elden Ring Poise Wiki:
 *   /weapons/, /weapons/<class>/, /bosses/, /bosses/<boss>/, /ashes-of-war/, /poise-vs-stance/,
 *   plus sitemap.xml and robots.txt.
 *
 * Every number comes from the same code the interactive page uses: tools/index.template.html is run
 * in jsdom against data/wiki_data.json, and the values it calculates (highest hit per weapon, startup
 * frames, Ash of War ranges) are written out as plain HTML tables.
 *
 * Run after changing data/wiki_data.json or tools/index.template.html:
 *   npm install && python tools/make_index.py && npm run build:pages
 */
import { JSDOM } from 'jsdom';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://eldenringpoisewiki.fun';
const SUFFIX = ' | Elden Ring Poise Wiki';

/* ---------- run the interactive page's own code to get its calculated values ---------- */
const tpl = readFileSync(join(root, 'tools/index.template.html'), 'utf8');
const data = readFileSync(join(root, 'data/wiki_data.json'), 'utf8');
const cssStart = tpl.indexOf('<style>');
const cssEnd = tpl.indexOf('</style>') + '</style>'.length;
const baseStyle = tpl.slice(cssStart, cssEnd);
const fontLink = tpl.match(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>/)[0];
const body = tpl.slice(cssEnd);
const s0 = body.indexOf('<script>') + '<script>'.length;
const s1 = body.lastIndexOf('</script>');
const dom = new JSDOM(`<!doctype html><html><head><meta charset="utf-8"></head><body>${body.slice(0, s0 - '<script>'.length)}</body></html>`,
  { url: SITE + '/', runScripts: 'outside-only' });
const w = dom.window;
const scriptErrors = [];
w.addEventListener('error', e => scriptErrors.push(e.message));
w.eval(body.slice(s0, s1).replace('__DATA__', data) + ';window.__x={D,vis,P};');
if (scriptErrors.length) throw new Error('page script failed: ' + scriptErrors[0]);
const { D, vis, P } = w.__x;

/* ---------- helpers ---------- */
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = x => (Number.isInteger(x) ? String(x) : (Math.round(x * 100) / 100).toString());
const slugify = s => String(s).toLowerCase().replace(/&/g, ' and ').replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const clip = (t, n = 158) => (t.length <= n ? t : t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…');
const pagesOut = [];

const crumbs = trail => ({
  '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: trail.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE + path })),
});

const extraCss = `<style>
.snav{display:flex;gap:4px;flex-wrap:wrap;border-bottom:1px solid var(--line);padding-block:8px;margin-bottom:8px}
.snav a{font:500 14px var(--body);color:var(--mute);text-decoration:none;border:1px solid transparent;border-radius:4px;padding:7px 14px}
.snav a:hover{color:var(--fg)}.snav a[aria-current="page"]{color:var(--accent-fg);background:var(--accent)}
.crumbs{color:var(--mute);font-size:13px;margin-block:0 6px}.crumbs a{color:var(--mute)}
main h2{font:400 22px/1.2 var(--display);margin:28px 0 8px}
main p{max-width:75ch}a{color:var(--accent)}
.cta{display:inline-block;margin-block:8px;padding:9px 16px;background:var(--accent);color:var(--accent-fg);border-radius:4px;text-decoration:none;font-weight:600}
.chiplist{display:flex;gap:6px;flex-wrap:wrap;margin-block:10px}.chiplist a{border:1px solid var(--line);border-radius:999px;padding:4px 12px;text-decoration:none;font-size:13px;background:var(--panel);color:var(--fg)}
footer{color:var(--mute);font-size:12px;margin-top:40px;border-top:1px solid var(--line);padding-top:12px}
</style>`;

const NAV = [['/', 'Find a weapon'], ['/weapons/', 'All weapons'], ['/bosses/', 'Bosses'], ['/ashes-of-war/', 'Ashes of War'], ['/poise-vs-stance/', 'Poise vs stance']];
const navHtml = active => `<nav class="snav" aria-label="Site">${NAV.map(([h, l]) => `<a href="${h}"${h === active ? ' aria-current="page"' : ''}>${l}</a>`).join('')}</nav>`;

function shell({ path, title, desc, h1, lead, content, trail, nav }) {
  const url = SITE + path;
  const ld = JSON.stringify(crumbs(trail));
  const html = `<!doctype html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Elden Ring Poise Wiki">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<script type="application/ld+json">${ld}</script>
${fontLink}
${baseStyle}
${extraCss}
</head>
<body>
<div class="wrap">
<header>
<div class="crumbs">${trail.map(([n, p], i) => (i < trail.length - 1 ? `<a href="${p}">${esc(n)}</a>` : esc(n))).join(' / ')}</div>
<h1>${h1}</h1>
<p class="sub">${lead}</p>
</header>
${navHtml(nav)}
<main>
${content}
</main>
<footer>Poise values are read from regulation.bin and organised by the <a href="/">Elden Ring Poise Wiki</a>. Names come from the community Paramdex. Unofficial fan project, not affiliated with FromSoftware or Bandai Namco.</footer>
</div>
</body>
</html>
`;
  pagesOut.push({ path, html });
}

/* ---------- data ---------- */
const weapons = D.weapons.filter(vis).filter(x => x.max > 0)
  .sort((a, b) => b.max - a.max || a.name.localeCompare(b.name));
const types = [...new Set(weapons.map(x => x.type))].sort();
const typeSlug = new Map(types.map(t => [t, slugify(t)]));

const weaponRow = x => `<tr><td>${esc(x.name)}${x.dlc ? ' <span class="tag som">DLC</span>' : ''}</td><td><a href="/weapons/${typeSlug.get(x.type)}/">${esc(x.type)}</a></td><td>${x.up}${x.maxLv ? ' +' + x.maxLv : ''}</td><td class="n">${fmt(x.sa)}</td><td class="n">${fmt(x.max)}</td><td>${esc(x.topl)}</td><td class="n">${x.topf ? 'f' + x.topf : 'n/a'}</td></tr>`;
const weaponTable = list => `<div class="tbl"><table><thead><tr><th>Weapon</th><th>Class</th><th>Upgrade</th><th class="n">Base poise</th><th class="n">Highest hit</th><th>Highest hit is</th><th class="n">Its startup</th></tr></thead><tbody>${list.map(weaponRow).join('')}</tbody></table></div>`;
const classChips = `<div class="chiplist">${types.map(t => `<a href="/weapons/${typeSlug.get(t)}/">${esc(t)}</a>`).join('')}</div>`;
const formula = '<p class="mono">poise damage = flat + weapon base poise × attack multiplier ÷ 100</p>';

/* ---------- /weapons/ ---------- */
shell({
  path: '/weapons/', nav: '/weapons/',
  title: 'Elden Ring Poise Damage Table: Every Weapon' + SUFFIX,
  desc: clip(`Elden Ring poise damage table: base poise and the highest single-hit poise damage for all ${weapons.length} weapons, hardest hitting first. Read from the game files.`),
  h1: 'Elden Ring poise damage table: every weapon',
  lead: `Base poise and the hardest single hit for all ${weapons.length} weapons, sorted from the biggest staggering hit down. Startup is the frame the hit lands, at 30 frames per second.`,
  trail: [['Elden Ring Poise Wiki', '/'], ['Weapons', '/weapons/']],
  content: `<p>Poise damage is what fills an enemy's stance bar. When the bar is full, the enemy staggers and you get a free hit. A bigger number staggers faster.</p>${formula}<p>Browse by weapon class:</p>${classChips}${weaponTable(weapons)}<p><a class="cta" href="/">Open the interactive finder</a> to filter by grip, combo length and attack type.</p>`,
});

/* ---------- /weapons/<class>/ ---------- */
for (const t of types) {
  const list = weapons.filter(x => x.type === t);
  const top = list[0];
  shell({
    path: `/weapons/${typeSlug.get(t)}/`, nav: '/weapons/',
    title: `Elden Ring ${t} Poise Damage: All ${list.length} Weapons Ranked${SUFFIX}`,
    desc: clip(`Elden Ring ${t} poise damage: ${list.length} weapons ranked by highest single hit. The hardest hit is ${fmt(top.max)} poise from ${top.name} (${top.topl}).`),
    h1: `Elden Ring ${esc(t)} poise damage`,
    lead: `All ${list.length} weapons in the ${esc(t)} class, ranked by their hardest single hit. The top hit is ${fmt(top.max)} poise from ${esc(top.name)} (${esc(top.topl)}).`,
    trail: [['Elden Ring Poise Wiki', '/'], ['Weapons', '/weapons/'], [t, `/weapons/${typeSlug.get(t)}/`]],
    content: `${formula}<p>Other classes:</p>${classChips}${weaponTable(list)}<p><a class="cta" href="/">Open the interactive finder</a></p>`,
  });
}

/* ---------- bosses ---------- */
const groups = new Map();
for (const b of D.bosses) {
  if (!groups.has(b.name)) groups.set(b.name, []);
  groups.get(b.name).push(b);
}
const bossList = [...groups.entries()].map(([name, forms]) => ({ name, forms, maxPoise: Math.max(...forms.map(f => f.poise)), dlc: forms.every(f => f.dlc) }))
  .filter(b => b.maxPoise > 0);
const usedSlugs = new Set();
for (const b of bossList) {
  let s = slugify(b.name) || 'boss';
  while (usedSlugs.has(s)) s += '-2';
  usedSlugs.add(s);
  b.slug = s;
}
const uniq = a => [...new Set(a)];
const list = (a, f) => uniq(a.map(f)).join(' / ');

shell({
  path: '/bosses/', nav: '/bosses/',
  title: 'Elden Ring Boss Poise (Stance) Values: Full List' + SUFFIX,
  desc: clip(`Elden Ring boss poise (stance) values for ${bossList.length} bosses and enemies: base poise, poise recovery rate and HP, from the game files.`),
  h1: 'Elden Ring boss poise (stance) values',
  lead: `Base poise, recovery rate and HP for ${bossList.length} bosses and boss-like enemies. A poise damage total at or above the value breaks the stance bar. Click a boss to see how many hits each weapon needs.`,
  trail: [['Elden Ring Poise Wiki', '/'], ['Bosses', '/bosses/']],
  content: `<p>These are base values from the enemy table. New Game Plus scaling and phase effects can change them, and bosses recover poise over time. Bosses with more than one form list each value.</p><div class="tbl"><table><thead><tr><th>Boss</th><th class="n">Poise</th><th class="n">Recovery rate</th><th class="n">HP (base)</th></tr></thead><tbody>${[...bossList].sort((a, b) => b.maxPoise - a.maxPoise || a.name.localeCompare(b.name)).map(b => `<tr><td><a href="/bosses/${b.slug}/">${esc(b.name)}</a>${b.dlc ? ' <span class="tag som">DLC</span>' : ''}</td><td class="n">${list(b.forms.filter(f => f.poise > 0).sort((p, q) => q.poise - p.poise), f => fmt(f.poise))}</td><td class="n">${list(b.forms.filter(f => f.rec > 0), f => fmt(f.rec)) || '—'}</td><td class="n">${list(b.forms, f => f.hp.toLocaleString('en-US'))}</td></tr>`).join('')}</tbody></table></div><p><a class="cta" href="/">Open the interactive finder</a></p>`,
});

const bestPerClass = types.map(t => weapons.find(x => x.type === t)).sort((a, b) => b.max - a.max);
for (const b of bossList) {
  const poises = uniq(b.forms.map(f => f.poise).filter(p => p > 0)).sort((p, q) => p - q);
  const hits = (p, per) => Math.ceil(p / per - 1e-9);
  const head = poises.map(p => `<th class="n">Hits at ${fmt(p)} poise</th>`).join('');
  const cells = x => poises.map(p => `<td class="n"><b>${hits(p, x.max)}</b></td>`).join('');
  const rows = (arr, withClass) => arr.map(x => `<tr><td>${esc(x.name)}${x.dlc ? ' <span class="tag som">DLC</span>' : ''}</td>${withClass ? `<td>${esc(x.type)}</td>` : ''}<td>${esc(x.topl)}</td><td class="n">${fmt(x.max)}</td>${cells(x)}</tr>`).join('');
  const theadFor = withClass => `<thead><tr><th>Weapon</th>${withClass ? '<th>Class</th>' : ''}<th>Attack</th><th class="n">Poise per hit</th>${head}</tr></thead>`;
  const formsTable = b.forms.length > 1 ? `<h2>Forms and phases</h2><div class="tbl"><table><thead><tr><th>Entry</th><th class="n">Poise</th><th class="n">Recovery rate</th><th class="n">HP (base)</th></tr></thead><tbody>${b.forms.map(f => `<tr><td>${esc(f.name)}</td><td class="n">${f.poise < 0 ? '—' : fmt(f.poise)}</td><td class="n">${f.rec < 0 ? '—' : fmt(f.rec)}</td><td class="n">${f.hp.toLocaleString('en-US')}</td></tr>`).join('')}</tbody></table></div>` : '';
  const main = poises[poises.length - 1];
  shell({
    path: `/bosses/${b.slug}/`, nav: '/bosses/',
    title: `${b.name}: Poise and Hits to Stagger (Elden Ring)${SUFFIX}`,
    desc: clip(`${b.name} has ${poises.length > 1 ? `${fmt(poises[0])} to ${fmt(main)}` : fmt(main)} base poise in Elden Ring. See how many hits each weapon needs to stagger it, with the best weapon in every class.`),
    h1: `${esc(b.name)}: poise and hits to stagger`,
    lead: `Base poise ${poises.length > 1 ? poises.map(fmt).join(' / ') : fmt(main)}${b.forms.some(f => f.rec > 0) ? `, recovery rate ${list(b.forms.filter(f => f.rec > 0), f => fmt(f.rec))}` : ''}, base HP ${list(b.forms, f => f.hp.toLocaleString('en-US'))}.`,
    trail: [['Elden Ring Poise Wiki', '/'], ['Bosses', '/bosses/'], [b.name, `/bosses/${b.slug}/`]],
    content: `<p>Hits needed is the boss's poise divided by the poise of one hit, rounded up. The table uses each weapon's hardest single attack. Poise recovers after a few seconds without hits, so the hits have to land close together. New Game Plus, boss phases and effects that boost poise damage are not included.</p>
<h2>Hardest-hitting weapons against ${esc(b.name)}</h2><div class="tbl"><table>${theadFor(true)}<tbody>${rows(weapons.slice(0, 10), true)}</tbody></table></div>
<h2>Best weapon in each class</h2><div class="tbl"><table>${theadFor(false).replace('<th>Weapon</th>', '<th>Weapon (class)</th>')}<tbody>${bestPerClass.map(x => `<tr><td>${esc(x.name)} <span class="mute">(${esc(x.type)})</span>${x.dlc ? ' <span class="tag som">DLC</span>' : ''}</td><td>${esc(x.topl)}</td><td class="n">${fmt(x.max)}</td>${cells(x)}</tr>`).join('')}</tbody></table></div>${formsTable}
<p><a class="cta" href="/">Pick your own weapon and grip</a> to see heavy-attack and light-attack combos against this boss.</p>`,
  });
}

/* ---------- /ashes-of-war/ ---------- */
const SAv = D.weapons.map(x => x.sa).filter(x => x > 0);
const SAmin = Math.min(...SAv), SAmax = Math.max(...SAv);
const ashes = D.ashes.filter(a => a.isAsh && a.rows.length).map(a => ({
  name: a.name,
  lo: Math.max(0, ...a.rows.map(r => P(SAmin, r[1], r[2]))),
  hi: Math.max(0, ...a.rows.map(r => P(SAmax, r[1], r[2]))),
  n: new Set(a.rows.map(r => r.slice(1, 4).join('|'))).size,
})).filter(a => a.hi > 0).sort((a, b) => b.hi - a.hi || a.name.localeCompare(b.name));
shell({
  path: '/ashes-of-war/', nav: '/ashes-of-war/',
  title: 'Elden Ring Ash of War Poise Damage: Every Ash Ranked' + SUFFIX,
  desc: clip(`Elden Ring Ash of War poise damage: the highest single hit for ${ashes.length} equippable Ashes of War, from the weakest to the strongest weapon base poise.`),
  h1: 'Elden Ring Ash of War poise damage',
  lead: `The hardest single hit of ${ashes.length} equippable Ashes of War. Ash poise scales with the base poise of the weapon it is on, so each Ash shows a range.`,
  trail: [['Elden Ring Poise Wiki', '/'], ['Ashes of War', '/ashes-of-war/']],
  content: `<p>Ash of War poise comes from the game's shared Ash of War attack table:</p>${formula}<p>"On the weakest weapon" uses a weapon with base poise ${fmt(SAmin)}, and "on the strongest weapon" uses base poise ${fmt(SAmax)}. The game data lists each hit definition for a skill but not which ones happen in one use, so these are single-hit figures, not totals. Pick a specific weapon in the <a href="/">interactive finder</a> to recalculate.</p><div class="tbl"><table><thead><tr><th>Ash of War</th><th class="n">Highest hit, weakest weapon</th><th class="n">Highest hit, strongest weapon</th><th class="n">Hit strengths</th></tr></thead><tbody>${ashes.map(a => `<tr><td>${esc(a.name)}</td><td class="n">${fmt(a.lo)}</td><td class="n">${fmt(a.hi)}</td><td class="n">${a.n}</td></tr>`).join('')}</tbody></table></div>`,
});

/* ---------- /poise-vs-stance/ ---------- */
shell({
  path: '/poise-vs-stance/', nav: '/poise-vs-stance/',
  title: 'Elden Ring Poise vs Stance: What Is the Difference?' + SUFFIX,
  desc: clip('Elden Ring poise vs stance explained: what poise damage does to enemies, why players also say stance damage, and where the numbers on this wiki come from.'),
  h1: 'Elden Ring poise vs stance',
  lead: 'Players use both words, and they are easy to mix up. Here is how this wiki uses them.',
  trail: [['Elden Ring Poise Wiki', '/'], ['Poise vs stance', '/poise-vs-stance/']],
  content: `<h2>Poise damage on this wiki</h2><p>Every enemy has a hidden bar. Each hit you land fills it, and when it is full the enemy staggers. This wiki calls the amount a hit adds <b>poise damage</b>, and the size of the bar the enemy's <b>poise</b>. These are the numbers stored in the game files, in fields named after "super armor" (for example <code>atkSuperArmor</code> for an attack and <code>superArmorDurability</code> for an enemy).</p>
<h2>Why people also say stance</h2><p>Many players call an enemy's bar its <b>stance</b> and the damage that breaks it <b>stance damage</b>, and use <b>poise</b> for the stat on your own armor that makes you harder to stagger. Guides and forum threads switch between the words, so a search for "stance damage" and one for "poise damage" are usually about the same enemy-side numbers.</p>
<h2>The formula used here</h2>${formula}<p>Most player attacks have a flat amount of 0, so the multiplier does the work. Boss poise is the base value from the enemy table. Hits needed to stagger a boss is the boss's poise divided by the poise of one hit, rounded up.</p>
<h2>Where to go next</h2><div class="chiplist"><a href="/weapons/">Poise damage of every weapon</a><a href="/bosses/">Boss poise values</a><a href="/ashes-of-war/">Ash of War poise</a><a href="/">Interactive weapon finder</a></div>
<p>The formula is derived from the game's field layout and has not been checked against in-game testing, so treat the numbers as well-founded estimates.</p>`,
});

/* ---------- write everything ---------- */
for (const { path, html } of pagesOut) {
  const file = join(root, path.replace(/^\//, ''), 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}
const today = new Date().toISOString().slice(0, 10);
const urls = ['/', ...pagesOut.map(p => p.path)];
const priority = p => (p === '/' ? '1.0' : p.split('/').filter(Boolean).length === 1 ? '0.8' : '0.6');
writeFileSync(join(root, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map(p => `  <url><loc>${SITE}${p}</loc><lastmod>${today}</lastmod><priority>${priority(p)}</priority></url>`).join('\n') + `\n</urlset>\n`);
writeFileSync(join(root, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`Wrote ${pagesOut.length} pages (${weapons.length} weapons, ${types.length} classes, ${bossList.length} bosses, ${ashes.length} Ashes), sitemap.xml and robots.txt`);
