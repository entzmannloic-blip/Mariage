import fs from 'node:fs';
const dir = process.argv[2];
const proj = process.argv[3];
const d = JSON.parse(fs.readFileSync(proj + '/data/v2/final.json', 'utf8'));
const map = {};
for (const f of fs.readdirSync(dir).filter(f => /^bouchon\d+\.txt$/.test(f)).sort()) {
  for (const l of fs.readFileSync(dir + '/' + f, 'utf8').split('\n').filter(Boolean)) {
    const [k, b, e] = l.split('|');
    map[k] = { b, e };
  }
}
let hit = 0;
for (const o of d) {
  const key = o.u && o.u.includes('mariages.net') ? o.u.split('/').pop() : null;
  const m = key && map[key];
  if (m) hit++;
  // droit de bouchon : n = aucun, f = payant, x = boissons extérieures interdites
  o.bo = m && m.b !== '?' ? m.b : null;
  // traiteur imposé : 1 oui, 0 non
  const tr = (o.tr || '').toLowerCase(), pn = (o.pn || '').toLowerCase();
  let ti = null;
  if (/^libre/.test(tr)) ti = 0;
  else if (/impos|sur place|intégré|inclus|exclusif|interne|obligatoire|maison|clé en main|restauration|incluse/.test(tr)) ti = 1;
  else if (/libre|partenaire|choix|préférés|référenc/.test(tr)) ti = 0;
  if (ti == null && /impossible sans/.test(pn)) ti = 1;
  o.ti = ti;
  // extérieur : cérémonie possible dehors
  const x = (o.x || '').toLowerCase();
  const kw = /cérémonie|parc|jardin|terrasse|esplanade|cour\b|cour |pelouse|étang|vignes|verger|prairie|extérieur|patio|forêt|bois|plage|lac\b|rivière|pergola|kiosque|chapiteau|piscine|préau|allée|hectare|ha\b|\bcours\b/;
  let ex = null;
  if (m && m.e === 'y') ex = 1;
  else if (x && kw.test(x)) ex = 1;
  else if (x) ex = 0;
  o.ex = ex;
}
fs.writeFileSync(proj + '/data/v2/final.json', JSON.stringify(d));
const c = (f, v) => d.filter(o => o[f] === v).length;
console.log('bouchon matched', hit, { n: c('bo', 'n'), f: c('bo', 'f'), x: c('bo', 'x'), null: c('bo', null) });
console.log('traiteur', { imp: c('ti', 1), libre: c('ti', 0), null: c('ti', null) });
console.log('exterieur', { oui: c('ex', 1), non: c('ex', 0), null: c('ex', null) });
console.log('ext non:', d.filter(o => o.ex === 0).map(o => o.n + ' [' + o.x + ']').join(' ; '));
