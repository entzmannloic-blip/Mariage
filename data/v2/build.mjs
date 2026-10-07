import fs from 'node:fs';
import vm from 'node:vm';
const dir = process.argv[2];
const proj = process.argv[3];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\b(chateau|domaine|manoir|le|la|les|du|des|de|d|l|et|au|aux|hotel|salle)\b/g, ' ').replace(/[^a-z0-9]/g, '');
const m1 = JSON.parse(fs.readFileSync(dir + '/merged.json', 'utf8'));
const m2 = JSON.parse(fs.readFileSync(dir + '/merged2.json', 'utf8'));
let rows = [...m1, ...m2].filter(r => r.g && r.a);
// V1 venues not already present
const html = fs.readFileSync(proj + '/index.v1.html', 'utf8');
const src = html.slice(html.indexOf('const V=[') + 6, html.indexOf('];\nconst COL') + 1);
const V1 = vm.runInNewContext(src);
const have = new Set(rows.map(r => norm(r.name)));
const deptOf = { Loire: '42', Rhône: '69', Beaujolais: '69', Ain: '01', Drôme: '26' };
const v1only = V1.filter(v => !have.has(norm(v.n)) && !Array.from(have).some(h => h.length > 6 && (h === norm(v.n))));
console.log('V1 only', v1only.length);
const extra = [];
for (const v of v1only) {
  const dept = deptOf[v.z];
  let g = null;
  try {
    const j = await (await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(v.c.replace(/\(.*\)/, '').trim())}&type=municipality&limit=10`)).json();
    const f = j.features.find(x => x.properties.context.startsWith(dept));
    if (f) g = { lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1], prec: 'municipality' };
  } catch (e) {}
  if (!g) g = { lng: v.lng, lat: v.lat, prec: 'approx' };
  extra.push({ i: 5000 + extra.length, name: v.n, commune: v.c, dept, a: v.c, c: v.cap, cn: v.capN || null, b: v.beds ?? null, nr: !!v.near, bn: v.bedN || null, pn: v.pN || null, pm: v.p ?? null, t: v.tr || null, x: null, ph: null, s: null, path: v.u ? 'BB:' + v.u : null, g, v1: true, vtype: v.t, w: v.w ? 1 : 0 });
  await sleep(50);
}
const lyon = '4.8320,45.7578', se = '4.3872,45.4397';
for (let i = 0; i < extra.length; i += 40) {
  const b = extra.slice(i, i + 40);
  const coords = [lyon, se, ...b.map(r => `${r.g.lng},${r.g.lat}`)].join(';');
  const url = `https://router.project-osrm.org/table/v1/driving/${coords}?sources=0;1&destinations=${b.map((_, k) => k + 2).join(';')}&annotations=duration,distance`;
  let j; for (let t = 0; t < 4; t++) { try { j = await (await fetch(url)).json(); if (j.code === 'Ok') break; } catch (e) {} await sleep(1500); }
  b.forEach((r, k) => { r.tL = Math.round(j.durations[0][k] / 60); r.tS = Math.round(j.durations[1][k] / 60); r.dL = Math.round(j.distances[0][k] / 1000); r.dS = Math.round(j.distances[1][k] / 1000); });
  await sleep(800);
}
rows = [...rows, ...extra];
const dname = { '01': 'Ain', '07': 'Ardèche', '26': 'Drôme', '38': 'Isère', '42': 'Loire', '43': 'Haute-Loire', '63': 'Puy-de-Dôme', '69': 'Rhône', '71': 'Saône-et-Loire', '73': 'Savoie' };
const typeOf = r => {
  const s = (r.name + ' ' + (r.commune || '')).toLowerCase();
  if (/p[ée]niche|plateforme|bateau/.test(s)) return 'Insolite';
  if (/h[ôo]tel|boscolo|m[ée]tropole|pasino|lyon vert|best western|mercure|auberge|hostellerie|hôstellerie|gil de france|ermitage h/.test(s)) return 'Hôtel / Auberge';
  if (/ch[âa]teau|manoir|abbaye|prieur[ée]|bastie|bastide/.test(s)) return 'Château';
  if (/ferme|gîte|gite|ranch|grange|moulin|ferm/.test(s)) return 'Ferme / Gîtes';
  if (/salle|factory|harner|leya|vinifacture|forez|peybert|palmeraie|combes|baraque|recept|halles|compagnons|caves|talan|maya|limaj|g[ée]nets|saint julien/.test(s)) return 'Salle de réception';
  return 'Domaine';
};
const out = [];
const seen = new Set();
for (const r of rows) {
  const dpc = (r.dept || '').padStart(2, '0');
  const key = norm(r.name) + dpc;
  if (seen.has(key)) continue; seen.add(key);
  let zone = dname[dpc] || dpc;
  if (dpc === '69' && r.g.lat > 45.93 && r.g.lng < 4.85) zone = 'Beaujolais';
  const path = r.path || '';
  const link = path.startsWith('BB:') ? path.slice(3) : path ? 'https://www.mariages.net/' + path : null;
  const nrAuto = /proximit|à côté|voisin|partenaire|à moins de|à 7 min|à 500 m|à 30 m/i.test(r.bn || '');
  out.push({
    n: r.name, c: (r.commune || '').replace(/\s*\(.*\)/, ''), z: zone, d: dpc, t: r.v1 ? (r.vtype === 'Salle moderne' ? 'Salle de réception' : r.vtype === 'Hôtel' ? 'Hôtel / Auberge' : r.vtype) : typeOf(r),
    lat: +r.g.lat.toFixed(5), lng: +r.g.lng.toFixed(5), pr: r.g.prec === 'municipality' || r.g.prec === 'approx' ? 0 : 1,
    tL: r.tL, tS: r.tS, dL: r.dL, dS: r.dS,
    a: r.a, cap: r.c ?? null, cn: r.cn || null, b: r.b ?? null, nr: !!(r.nr || nrAuto), bn: r.bn || null, pn: r.pn || null, pm: r.pm ?? null, tr: r.t || null, x: r.x || null,
    ph: r.ph || null, s: r.s || null, u: link, w: r.w || null
  });
}
out.sort((a, b) => a.n.localeCompare(b.n, 'fr'));
fs.writeFileSync(dir + '/final.json', JSON.stringify(out));
console.log('final', out.length, 'photos', out.filter(o => o.ph).length, 'zones', [...new Set(out.map(o => o.z))]);
console.log('types', Object.entries(out.reduce((m, o) => (m[o.t] = (m[o.t] || 0) + 1, m), {})));
console.log('inzone strict', out.filter(o => o.tL <= 60 || o.tS <= 90).length);
