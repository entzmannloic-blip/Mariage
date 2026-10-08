// Ajoute les lieux de new4.json + det4.txt à final.json (géocodage adresse exacte, trajets OSRM, dédoublonnage)
// usage : node addnew.mjs [--write]
import fs from 'node:fs';
const dir = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const final = JSON.parse(fs.readFileSync(dir + '/final.json', 'utf8'));
const cands = JSON.parse(fs.readFileSync(dir + '/new4.json', 'utf8'));
const stem = u => { try { return new URL(u).hostname.replace(/^www\./, '').replace(/\.(fr|com|net|org|eu|app|free\.fr)$/, '').replace(/[^a-z0-9]/g, ''); } catch { return null; } };
const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const haveStems = new Set(final.flatMap(o => [stem(o.s)].filter(Boolean)));
const haveNames = new Set(final.map(o => norm(o.n)));

const det = {};
for (const l of fs.readFileSync(dir + '/det4.txt', 'utf8').split('\n').filter(Boolean)) {
  const k = l.indexOf('|'); const id = +l.slice(0, k); const f = l.slice(k + 1).split('|').map(x => x.trim());
  det[id] = { a: f[0], seated: f[1], standing: f[2], beds: f[3], price: f[4], site: f[5], photo: f[6], cater: f[7], out: f[8] };
}
const num = v => (/^\d+$/.test(v || '') ? +v : null);
const unk = v => !v || v === 'unknown';

const BB = { // sources hors 1001salles
  51: 'https://bridebook.com/fr/wedding-venues/camping-les-portes-du-beaujolais-anse-rh-ne-frwXowd7XM',
  52: 'https://bridebook.com/fr/wedding-venues/revea-vacances-les-demeures-du-lac-saint-r-my-sur-durolle-puy-de-d-me-frqgnj9BgN',
  53: 'https://bridebook.com/fr/wedding-venues/base-de-loisirs-le-neyrial-yssingeaux-haute-loire-fr1nXVLMYr',
  54: 'https://www.grandsgites.com/gite-69-domaine-montclair-7154.htm',
  56: 'https://www.grandsgites.com/gite-69-jonchy-3535.htm',
  61: 'https://bridebook.com/fr/wedding-venues/le-bateau-bellona-lyon-rh-ne-frQgvnkyg1'
};
const typeOf = (n, i) => {
  const s = n.toLowerCase();
  if ([51, 52, 53].includes(i) || /camping/.test(s)) return 'Camping / Village vacances';
  if (/bateau|péniche|yacht(?!.*espace)/.test(s) || /verrière|loft/.test(s)) return 'Insolite';
  if (/château|chateau|manoir|abbaye|prieuré|commanderie/.test(s)) return 'Château';
  if (/hôtel|hotel|auberge|radisson|courtyard|bridge|caribou|hôtellerie|lodges|restaurant|bistro/.test(s)) return 'Hôtel / Auberge';
  if (/ferme|gîte|gite|grange|ranch|manade|cuvage|moulin|mas /.test(s)) return 'Ferme / Gîtes';
  if (/domaine|clos|jardin|villa|parc|ruisselière|oliviers|caveau|golf/.test(s)) return 'Domaine';
  return 'Salle de réception';
};
const dname = { '01': 'Ain', '26': 'Drôme', '38': 'Isère', '42': 'Loire', '43': 'Haute-Loire', '63': 'Puy-de-Dôme', '69': 'Rhône', '71': 'Saône-et-Loire' };

// enregistrement manuel : Gîte Auberge du Château (fiche Bridebook lue plus haut)
const extra = [{ i: 1000, name: 'Gîte Auberge du Château', commune: "Saint-Marcel-d'Urfé", dept: '42', path: 'B:https://bridebook.com/fr/wedding-venues/gite-auberge-du-chateau-saint-marcel-d-urf-loire-frWXRAMz8d', cap: 110,
  d: { a: "le Château, 42430 Saint-Marcel-d'Urfé", seated: '110', standing: '110', beds: '50', price: 'unknown', site: 'http://gite-auberge-du-chateau.com/', photo: 'https://image.bridebook.com/weddingsuppliers/venue/frWXRAMz8d/frWXRAMz8d_photoA0.jpeg', cater: 'unknown', out: 'yes' } }];

const recs = [];
cands.forEach((c, i) => { if (det[i]) recs.push({ i, ...c, d: det[i] }); });
extra.forEach(e => recs.push(e));

async function geo(r) {
  const q = r.d.a;
  try {
    const j = await (await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=3`)).json();
    const f = j.features.find(x => (x.properties.postcode || '').slice(0, 2) === r.dept.slice(0, 2) || (x.properties.context || '').startsWith(r.dept));
    if (f && f.properties.score > 0.55 && ['housenumber', 'street', 'locality'].includes(f.properties.type)) return { lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1], pr: 1 };
  } catch (e) {}
  const j = await (await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(r.commune.replace(/\s+\d+$/, ''))}&type=municipality&limit=10`)).json();
  const f = j.features.find(x => (x.properties.context || '').startsWith(r.dept)) || j.features[0];
  return f ? { lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1], pr: 0 } : null;
}
for (const r of recs) { r.g = await geo(r); await sleep(60); }
const ok = recs.filter(r => r.g);
const lyon = '4.8320,45.7578', se = '4.3872,45.4397';
for (let i = 0; i < ok.length; i += 40) {
  const b = ok.slice(i, i + 40);
  const coords = [lyon, se, ...b.map(r => `${r.g.lng},${r.g.lat}`)].join(';');
  const url = `https://router.project-osrm.org/table/v1/driving/${coords}?sources=0;1&destinations=${b.map((_, k) => k + 2).join(';')}&annotations=duration,distance`;
  let j; for (let t = 0; t < 4; t++) { try { j = await (await fetch(url)).json(); if (j.code === 'Ok') break; } catch (e) {} await sleep(1500); }
  b.forEach((r, k) => { r.tL = Math.round(j.durations[0][k] / 60); r.tS = Math.round(j.durations[1][k] / 60); r.dL = Math.round(j.distances[0][k] / 1000); r.dS = Math.round(j.distances[1][k] / 1000); });
  await sleep(800);
}

const out = [], skipped = [];
for (const r of ok) {
  const d = r.d;
  const st = stem(d.site);
  if ((st && haveStems.has(st)) || haveNames.has(norm(r.name))) { skipped.push(r.name + ' (déjà présent)'); continue; }
  if (!(r.tL <= 60 || r.tS <= 90)) { skipped.push(`${r.name} (hors zone L${r.tL} S${r.tS})`); continue; }
  const seated = num(d.seated), standing = num(d.standing);
  const cap = Math.max(seated || 0, standing || 0) || null;
  const priceN = num(d.price);
  const pm = priceN && priceN >= 300 ? priceN : null;
  const beds = num(d.beds);
  let photo = unk(d.photo) ? null : d.photo; if (photo && photo.startsWith('/')) photo = 'https://www.1001salles.com' + photo;
  const site = unk(d.site) || /google\.com|facebook\.com/.test(d.site) ? null : d.site;
  const path = r.path || '';
  const u = BB[r.i] || (path.startsWith('B:') ? path.slice(2) : path.startsWith('/mariage/') ? 'https://www.1001salles.com' + path : null);
  const dept = r.dept.padStart(2, '0');
  let z = dname[dept] || dept;
  if (dept === '69' && r.g.lat > 45.93 && r.g.lng < 4.85) z = 'Beaujolais';
  const commune = r.commune.replace(/\s+\d+$/, '').replace(/^Lyon$/, 'Lyon');
  out.push({
    n: r.name.replace(/^Revea Vacances - /, ''), c: commune, z, d: dept, t: typeOf(r.name, r.i),
    lat: +r.g.lat.toFixed(5), lng: +r.g.lng.toFixed(5), pr: r.g.pr, tL: r.tL, tS: r.tS, dL: r.dL, dS: r.dS,
    a: d.a, cap, cn: seated && standing && standing > seated ? `${seated} assis / ${standing} debout` : cap ? `${cap} invités` : null,
    b: beds, nr: false, bn: beds === 0 ? "Pas d'hébergement" : beds ? `${beds} couchages` : null,
    pn: pm ? `dès ${pm.toLocaleString('fr-FR')} €` : null, pm, tr: d.cater === 'libre' ? 'Libre' : d.cater === 'imposé' ? 'Imposé' : null, x: null,
    ph: photo, s: site, u, w: null,
    bo: null, ti: d.cater === 'imposé' ? 1 : d.cater === 'libre' ? 0 : null, ex: d.out === 'yes' ? 1 : d.out === 'no' ? 0 : null
  });
}
console.log('candidats', recs.length, 'ajoutés', out.length, 'écartés', skipped.length);
console.log(skipped.join('\n'));
const tc = {}; out.forEach(o => tc[o.t] = (tc[o.t] || 0) + 1); console.log(tc);
console.log('sans photo', out.filter(o => !o.ph).length, 'précis', out.filter(o => o.pr).length);
fs.writeFileSync(dir + '/added4.json', JSON.stringify(out, null, 1));
if (process.argv.includes('--write')) {
  const merged = [...final, ...out].sort((a, b) => a.n.localeCompare(b.n, 'fr'));
  fs.writeFileSync(dir + '/final.json', JSON.stringify(merged));
  console.log('final.json :', final.length, '->', merged.length);
}
