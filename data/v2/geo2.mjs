import fs from 'node:fs';
const dir = process.argv[2];
const lines = fs.readFileSync(dir + '/cand2.txt', 'utf8').split('\n').filter(Boolean);
const rows = lines.map(l => { const [name, commune, dept, cap, path] = l.split('|'); return { name, commune, dept, cap: +cap, path }; });
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function geocode(r) {
  const q = encodeURIComponent(r.commune);
  const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${q}&type=municipality&limit=10`);
  const j = await res.json();
  const f = j.features.find(x => x.properties.context.startsWith(r.dept)) || null;
  if (!f) return null;
  return { lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1], city: f.properties.city, postcode: f.properties.postcode };
}
for (const r of rows) { r.geo = await geocode(r).catch(() => null); await sleep(60); }
const ok = rows.filter(r => r.geo);
const lyon = '4.8320,45.7578', se = '4.3872,45.4397';
for (let i = 0; i < ok.length; i += 40) {
  const b = ok.slice(i, i + 40);
  const coords = [lyon, se, ...b.map(r => `${r.geo.lng},${r.geo.lat}`)].join(';');
  const url = `https://router.project-osrm.org/table/v1/driving/${coords}?sources=0;1&destinations=${b.map((_, k) => k + 2).join(';')}&annotations=duration,distance`;
  let j; for (let t = 0; t < 4; t++) { try { j = await (await fetch(url)).json(); if (j.code === 'Ok') break; } catch (e) {} await sleep(1500); }
  if (!j || j.code !== 'Ok') { console.error('osrm fail', i, j && j.code); continue; }
  b.forEach((r, k) => { r.minLyon = Math.round(j.durations[0][k] / 60); r.minSE = Math.round(j.durations[1][k] / 60); r.kmLyon = Math.round(j.distances[0][k] / 1000); r.kmSE = Math.round(j.distances[1][k] / 1000); });
  await sleep(800);
}
fs.writeFileSync(dir + '/geo2.json', JSON.stringify(rows, null, 1));
const noGeo = rows.filter(r => !r.geo).map(r => r.name + ' / ' + r.commune);
const inz = rows.filter(r => r.geo && (r.minLyon <= 60 || r.minSE <= 90));
console.log('total', rows.length, 'geocoded', ok.length, 'in zone', inz.length);
console.log('NOGEO', noGeo);
console.log('OUT', rows.filter(r => r.geo && !(r.minLyon <= 60 || r.minSE <= 90)).map(r => `${r.name} (${r.commune}) L${r.minLyon} S${r.minSE}`));
