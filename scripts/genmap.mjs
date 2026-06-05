import fs from "node:fs";

const geo = JSON.parse(
  fs.readFileSync(new URL("./mt.json", import.meta.url), "utf8"),
);

// Coleta todos os anéis (Polygon ou MultiPolygon)
function collectRings(geometry) {
  const rings = [];
  if (geometry.type === "Polygon") {
    geometry.coordinates.forEach((r) => rings.push(r));
  } else if (geometry.type === "MultiPolygon") {
    geometry.coordinates.forEach((poly) => poly.forEach((r) => rings.push(r)));
  }
  return rings;
}

let rings = [];
for (const f of geo.features) rings = rings.concat(collectRings(f.geometry));

// bbox geográfico
let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
for (const r of rings)
  for (const [lon, lat] of r) {
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }

const meanLat = ((minLat + maxLat) / 2) * (Math.PI / 180);
const kx = Math.cos(meanLat); // correção de longitude

// projeção equiretangular -> espaço de tela
const W = 1000;
const PAD = 24;
const projW = (maxLon - minLon) * kx;
const projH = maxLat - minLat;
const innerW = W - 2 * PAD;
const innerH = innerW * (projH / projW);
const H = Math.round(innerH + 2 * PAD);

function project(lon, lat) {
  const x = PAD + ((lon - minLon) * kx) / projW * innerW;
  const y = PAD + (maxLat - lat) / projH * innerH; // inverte lat
  return [x, y];
}

// Douglas-Peucker para simplificar cada anel
function rdp(points, eps) {
  if (points.length < 3) return points;
  let dmax = 0, idx = 0;
  const [ax, ay] = points[0];
  const [bx, by] = points[points.length - 1];
  const dx = bx - ax, dy = by - ay;
  const len = Math.hypot(dx, dy);
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i];
    const dist =
      len === 0
        ? Math.hypot(px - ax, py - ay) // base degenerada (anel fechado)
        : Math.abs((px - ax) * dy - (py - ay) * dx) / len;
    if (dist > dmax) { dmax = dist; idx = i; }
  }
  if (dmax > eps) {
    const left = rdp(points.slice(0, idx + 1), eps);
    const right = rdp(points.slice(idx), eps);
    return left.slice(0, -1).concat(right);
  }
  return [points[0], points[points.length - 1]];
}

// mantém o maior anel (contorno principal do estado)
rings.sort((a, b) => b.length - a.length);
let main = rings[0].map(([lon, lat]) => project(lon, lat));
// remove ponto de fechamento duplicado para o RDP funcionar
if (
  main.length > 1 &&
  main[0][0] === main[main.length - 1][0] &&
  main[0][1] === main[main.length - 1][1]
) {
  main = main.slice(0, -1);
}
const simplified = rdp(main, 1.0);

const d =
  "M" +
  simplified.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join("L") +
  "Z";

// cidades reais (lat/lon)
const cities = {
  "Cuiabá": [-15.6014, -56.0979],
  "Várzea Grande": [-15.6467, -56.1326],
  "Chapada dos Guimarães": [-15.4608, -55.7497],
  "Santo Antônio de Leverger": [-15.8656, -56.0769],
  "Campo Verde": [-15.5453, -55.1626],
  "Tangará da Serra": [-14.6229, -57.4933],
  "Sinop": [-11.8642, -55.5025],
  "Sorriso": [-12.5425, -55.7113],
  "Rondonópolis": [-16.4706, -54.6356],
  "Cáceres": [-16.0764, -57.6818],
  "Alta Floresta": [-9.8756, -56.0861],
};

const out = {};
for (const [name, [lat, lon]] of Object.entries(cities)) {
  const [x, y] = project(lon, lat);
  out[name] = { x: +((x / W) * 100).toFixed(2), y: +((y / H) * 100).toFixed(2) };
}

console.log("VIEWBOX", `0 0 ${W} ${H}`);
console.log("POINTS", simplified.length);
console.log("PATH", d);
console.log("CITIES", JSON.stringify(out, null, 2));
