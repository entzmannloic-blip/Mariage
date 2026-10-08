// Compare cand4.txt avec final.json : géocode la commune, calcule les trajets OSRM, garde les lieux absents et dans la zone
import fs from 'node:fs';
const dir = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\b(chateau|domaine|manoir|le|la|les|du|des|de|d|l|et|au|aux|hotel|salle|restaurant|espace)\b/g, ' ').replace(/[^a-z0-9]/g, '');
const final = JSON.parse(fs.readFileSync(dir + '/final.json', 'utf8'));
const have = final.map(o => ({ k: norm(o.n), c: norm(o.c), lat: o.lat, lng: o.lng, n: o.n }));
const rows = (fs.readFileSync(dir + '/cand4.txt', 'utf8') + '\n' + fs.readFileSync(dir + '/cand4b.txt', 'utf8')).split('\n').filter(Boolean).map(l => { const [name, commune, dept, cap, path] = l.split('|'); return { name, commune, dept, cap: +cap, path }; });
async function geo(r) {
  const q = r.commune.replace(/\s+\d+$/, '');
  const j = await (await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&type=municipality&limit=10`)).json();
  const f = j.features.find(x => x.properties.context.startsWith(r.dept)) || j.features[0];
  return f ? { lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] } : null;
}
for (const r of rows) { r.g = await geo(r).catch(() => null); await sleep(50); }
const ok = rows.filter(r => r.g);
const lyon = '4.8320,45.7578', se = '4.3872,45.4397';
for (let i = 0; i < ok.length; i += 40) {
  const b = ok.slice(i, i + 40);
  const coords = [lyon, se, ...b.map(r => `${r.g.lng},${r.g.lat}`)].join(';');
  const url = `https://router.project-osrm.org/table/v1/driving/${coords}?sources=0;1&destinations=${b.map((_, k) => k + 2).join(';')}&annotations=duration,distance`;
  let j; for (let t = 0; t < 4; t++) { try { j = await (await fetch(url)).json(); if (j.code === 'Ok') break; } catch (e) {} await sleep(1500); }
  if (!j || j.code !== 'Ok') { console.error('osrm fail', i); continue; }
  b.forEach((r, k) => { r.tL = Math.round(j.durations[0][k] / 60); r.tS = Math.round(j.durations[1][k] / 60); });
  await sleep(800);
}
const dup = r => have.find(h => norm(r.name) === h.k || (h.k.length > 5 && norm(r.name).length > 5 && (h.k.includes(norm(r.name)) || norm(r.name).includes(h.k)) && h.c === norm(r.commune.replace(/\s+\d+$/, ''))));
const out = { noGeo: [], present: [], far: [], fresh: [] };
for (const r of rows) {
  if (!r.g) { out.noGeo.push(r.name); continue; }
  const d = dup(r);
  if (d) { out.present.push(r.name + ' = ' + d.n); continue; }
  if (!(r.tL <= 62 || r.tS <= 92)) { out.far.push(`${r.name} (${r.commune}) L${r.tL} S${r.tS}`); continue; }
  out.fresh.push(r);
}
fs.writeFileSync(dir + '/new4.json', JSON.stringify(out.fresh, null, 1));
console.log('noGeo', out.noGeo);
console.log('present', out.present.length, out.present);
console.log('far', out.far);
console.log('FRESH', out.fresh.length);
console.log(out.fresh.map(r => `${r.name} | ${r.commune} | L${r.tL} S${r.tS} | cap ${r.cap}`).join('\n'));
