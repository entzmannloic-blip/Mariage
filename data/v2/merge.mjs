import fs from 'node:fs';
const dir = process.argv[2];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const inz = JSON.parse(fs.readFileSync(dir + '/inzone.json', 'utf8'));
const det = {};
for (const f of fs.readdirSync(dir).filter(f => /^det\d+\.jsonl$/.test(f)).sort()) {
  for (const l of fs.readFileSync(dir + '/' + f, 'utf8').split('\n').filter(Boolean)) { const o = JSON.parse(l); det[o.i] = { ...(det[o.i] || {}), ...o }; }
}
const rows = inz.map(x => ({ ...x, ...det[x.i] }));
// exact geocoding
async function geo(r) {
  const q = encodeURIComponent(r.a || r.commune);
  const j = await (await fetch(`https://api-adresse.data.gouv.fr/search/?q=${q}&limit=3`)).json();
  const f = j.features.find(x => x.properties.context.startsWith(r.dept) || x.properties.postcode?.startsWith(r.dept));
  if (f && f.properties.score > 0.45) return { lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1], prec: f.properties.type, city: f.properties.city, label: f.properties.label };
  return null;
}
for (const r of rows) {
  let g = null; try { g = await geo(r); } catch (e) {}
  if (!g) { // fallback commune
    const j = await (await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(r.commune)}&type=municipality&limit=10`)).json();
    const f = j.features.find(x => x.properties.context.startsWith(r.dept));
    if (f) g = { lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1], prec: 'municipality', city: f.properties.city, label: f.properties.label };
  }
  r.g = g; await sleep(50);
}
const ok = rows.filter(r => r.g);
const lyon = '4.8320,45.7578', se = '4.3872,45.4397';
for (let i = 0; i < ok.length; i += 40) {
  const b = ok.slice(i, i + 40);
  const coords = [lyon, se, ...b.map(r => `${r.g.lng},${r.g.lat}`)].join(';');
  const url = `https://router.project-osrm.org/table/v1/driving/${coords}?sources=0;1&destinations=${b.map((_, k) => k + 2).join(';')}&annotations=duration,distance`;
  let j; for (let t = 0; t < 4; t++) { try { j = await (await fetch(url)).json(); if (j.code === 'Ok') break; } catch (e) {} await sleep(1500); }
  if (!j || j.code !== 'Ok') { console.error('osrm fail', i); continue; }
  b.forEach((r, k) => { r.tL = Math.round(j.durations[0][k] / 60); r.tS = Math.round(j.durations[1][k] / 60); r.dL = Math.round(j.distances[0][k] / 1000); r.dS = Math.round(j.distances[1][k] / 1000); });
  await sleep(800);
}
// photo validation
const UA = { 'User-Agent': 'Mozilla/5.0' };
for (const r of rows) {
  if (!r.ph) continue;
  try { const res = await fetch(r.ph, { method: 'GET', headers: { ...UA, Range: 'bytes=0-200' } }); r.phOk = res.ok; r.phType = res.headers.get('content-type'); } catch (e) { r.phOk = false; }
}
fs.writeFileSync(dir + '/merged.json', JSON.stringify(rows, null, 1));
console.log('rows', rows.length, 'nogeo', rows.filter(r => !r.g).map(r => r.name));
console.log('photo bad', rows.filter(r => r.ph && !r.phOk).map(r => r.i + ' ' + r.name));
console.log('muni-precision', rows.filter(r => r.g && r.g.prec === 'municipality').length);
const inzone = rows.filter(r => r.g && (r.tL <= 60 || r.tS <= 90));
console.log('strict in zone', inzone.length, 'near (<=65/<=95)', rows.filter(r => r.g && (r.tL <= 65 || r.tS <= 95)).length);
