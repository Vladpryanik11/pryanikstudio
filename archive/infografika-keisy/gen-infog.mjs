import { writeFileSync } from 'node:fs';

// niche data from keisy.html: sums of cases whose result is counted in leads or requests
const niches = [
  { key: 'misc',  name: 'Праздники, обучение и другое', sum: 1020, label: '1 020',  share: 12, cases: '4 кейса', best: '520 заявок по 577 ₽, детские праздники, Брянск', color: '#FF6F5E' },
  { key: 'home',  name: 'Дом и ремонт',                 sum: 1146, label: '1 146',  share: 13, cases: '3 кейса', best: '468 лидов по 513 ₽, очистка крыш, Кострома',   color: '#A566FF' },
  { key: 'med',   name: 'Медицина',                     sum: 1459, label: '1 459+', share: 17, cases: '3 кейса', best: '1 000+ заявок, клиника тибетской медицины',       color: '#2EE6E6' },
  { key: 'dent',  name: 'Стоматология',                 sum: 2184, label: '2 184',  share: 25, cases: '5 кейсов', best: '793 заявки по 3,88 $, Казахстан',               color: '#C8FF1A' },
  { key: 'build', name: 'Строительство',                sum: 2868, label: '2 868',  share: 33, cases: '4 кейса', best: '983 лида по 814 ₽, заборы, Магнитогорск',      color: '#3D6BFF' },
];
const VW = 1200, FLOOR = 392, HMAX = 300;
const xs = [150, 365, 585, 815, 1030];
const max = Math.max(...niches.map(n => n.sum));
const f = v => +v.toFixed(1);

niches.forEach((n, i) => {
  n.x = xs[i];
  n.h = HMAX * n.sum / max;
  n.sigma = 40 + n.h * 0.13;
  n.top = FLOOR - n.h;
  const pts = [];
  const span = n.sigma * 3.2;
  for (let k = 0; k <= 64; k++) {
    const x = n.x - span + (2 * span) * k / 64;
    const dx = x - n.x;
    // a soft skew makes each peak lean like the reference, without changing its height
    const skew = 1 + 0.18 * Math.tanh(dx / n.sigma);
    const y = FLOOR - n.h * Math.exp(-(dx * dx) / (2 * n.sigma * n.sigma * skew * skew));
    pts.push([f(x), f(y)]);
  }
  n.edge = 'M' + pts.map(p => p.join(' ')).join('L');
  n.body = n.edge + `L${f(n.x + span)} ${FLOOR}L${f(n.x - span)} ${FLOOR}Z`;
  n.span = span;
});

const defs = niches.map((n, i) => `
    <linearGradient id="lg${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${n.color}" stop-opacity=".95"/><stop offset=".5" stop-color="${n.color}" stop-opacity=".42"/><stop offset="1" stop-color="${n.color}" stop-opacity=".06"/></linearGradient>
    <linearGradient id="le${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".35" stop-color="${n.color}" stop-opacity=".9"/><stop offset="1" stop-color="${n.color}" stop-opacity="0"/></linearGradient>`).join('');

const order = niches.map((n, i) => i).sort((a, b) => niches[b].sum - niches[a].sum); // tallest drawn first, so smaller peaks sit in front
const peaks = order.map(i => {
  const n = niches[i];
  return `
    <g class="pk" data-i="${i}" style="--d:${i * 140}ms;--c:${n.color}">
      <ellipse class="pk-pool" cx="${n.x}" cy="${FLOOR + 10}" rx="${f(n.span * .9)}" ry="9" fill="${n.color}" filter="url(#lsoft)"/>
      <path class="pk-glow" d="${n.body}" fill="${n.color}" filter="url(#lglow)"/>
      <path class="pk-body" d="${n.body}" fill="url(#lg${i})"/>
      <path class="pk-edge" d="${n.edge}" fill="none" stroke="url(#le${i})" stroke-width="2.2"/>
    </g>`;
}).join('');

const pinY = n => f(n.top - 34);
const pins = `
    <g class="pk-pins">
      <polyline points="${niches.map(n => `${n.x},${pinY(n)}`).join(' ')}" fill="none" stroke="rgba(255,255,255,.34)" stroke-width="1.4"/>
      ${niches.map((n, i) => `<line class="pk-lead" data-i="${i}" x1="${n.x}" y1="${pinY(n) + 8}" x2="${n.x}" y2="${FLOOR + 48}" stroke="${n.color}" stroke-opacity=".55" stroke-width="1.2"/>`).join('\n      ')}
      ${niches.map((n, i) => `<circle class="pk-dot" data-i="${i}" cx="${n.x}" cy="${pinY(n)}" r="7" fill="${n.color}" stroke="#fff" stroke-width="2"/>`).join('\n      ')}
    </g>`;

const landSvg = `<svg class="land-svg" viewBox="0 0 ${VW} 440" aria-hidden="true">
  <defs>${defs}
    <linearGradient id="lfloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset="1" stop-color="#fff" stop-opacity=".02"/></linearGradient>
    <filter id="lglow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="16"/></filter>
    <filter id="lsoft" x="-60%" y="-300%" width="220%" height="700%"><feGaussianBlur stdDeviation="8"/></filter>
  </defs>
  <g class="floor">
    <polygon points="28,${FLOOR} 1172,${FLOOR} 1198,${FLOOR + 22} 2,${FLOOR + 22}" fill="url(#lfloor)"/>
    <polygon points="2,${FLOOR + 22} 1198,${FLOOR + 22} 1198,${FLOOR + 30} 2,${FLOOR + 30}" fill="rgba(255,255,255,.05)"/>
    <line x1="28" y1="${FLOOR}" x2="1172" y2="${FLOOR}" stroke="rgba(255,255,255,.5)" stroke-width="1.2"/>
  </g>${peaks}${pins}
</svg>`;

const pct = v => +(v / VW * 100).toFixed(2);
const labels = niches.map((n, i) => `<li style="left:${pct(n.x)}%;--c:${n.color}"><span class="ll-name">${n.name}</span><span class="ll-num">${n.label}</span><span class="ll-share">${n.share}%</span></li>`).join('\n          ');
const hits = niches.map((n, i) => {
  const left = pct(n.x - n.span * .62), width = pct(n.span * 1.24);
  return `<button class="land-hit" type="button" style="left:${left}%;width:${width}%" data-i="${i}" data-x="${pct(n.x)}" data-top="${+((pinY(n) - 6) / 440 * 100).toFixed(2)}" data-name="${n.name}" data-sum="${n.label}" data-share="${n.share}%" data-cases="${n.cases}" data-best="${n.best}" data-color="${n.color}" aria-label="${n.name}: ${n.label} заявок и лидов, ${n.share}%, ${n.cases}, лучший: ${n.best}"></button>`;
}).join('\n          ');
const bars = [...niches].sort((a, b) => b.sum - a.sum).map(n => `<li style="--c:${n.color};--w:${(n.sum / max).toFixed(3)}"><span class="lb-top"><span class="lb-name">${n.name}</span><span class="lb-num">${n.label}</span></span><span class="lb-track"><i></i></span><span class="lb-meta">${n.share}% · ${n.cases} · лучший: ${n.best}</span></li>`).join('\n          ');

// gauge: 270 degree dial from 135deg, scale 0..1000%
const C = 2 * Math.PI * 150, SWEEP = C * .75, VAL = 770 / 1000;
const ang = t => (135 + 270 * t) * Math.PI / 180;
const pol = (r, t) => [f(200 + r * Math.cos(ang(t))), f(200 + r * Math.sin(ang(t)))];
let ticks = '';
for (let k = 0; k <= 40; k++) {
  const t = k / 40, major = k % 10 === 0;
  const [x1, y1] = pol(major ? 164 : 168, t), [x2, y2] = pol(major ? 180 : 175, t);
  ticks += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(255,255,255,${major ? .7 : .22})" stroke-width="${major ? 2.4 : 1.2}" stroke-linecap="round"/>`;
}
const labs = [0, 250, 500, 750, 1000].map(v => { const [x, y] = pol(124, v / 1000); return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle">${v}</text>`; }).join('');
const gaugeSvg = `<svg class="g-svg" viewBox="0 0 400 400" aria-hidden="true">
  <defs>
    <linearGradient id="gg" gradientUnits="userSpaceOnUse" x1="70" y1="330" x2="330" y2="90"><stop offset="0" stop-color="#3D6BFF"/><stop offset=".62" stop-color="#2EE6E6"/><stop offset="1" stop-color="#EFFFFF"/></linearGradient>
    <radialGradient id="gcore" cx="50%" cy="42%" r="60%"><stop offset="0" stop-color="#111624"/><stop offset="1" stop-color="#05060A"/></radialGradient>
    <filter id="gblur" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="12"/></filter>
    <filter id="gtip" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="6"/></filter>
  </defs>
  <circle class="g-track" cx="200" cy="200" r="150" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="14" stroke-dasharray="${f(SWEEP)} ${f(C)}" transform="rotate(135 200 200)"/>
  <circle class="g-halo" cx="200" cy="200" r="150" fill="none" stroke="url(#gg)" stroke-width="46" filter="url(#gblur)" transform="rotate(135 200 200)" style="--v:${f(SWEEP * VAL)};--c:${f(C)}"/>
  <circle class="g-val" cx="200" cy="200" r="150" fill="none" stroke="url(#gg)" stroke-width="14" stroke-linecap="round" transform="rotate(135 200 200)" style="--v:${f(SWEEP * VAL)};--c:${f(C)}"/>
  <g class="g-ticks">${ticks}</g>
  <g class="g-labs">${labs}</g>
  <g class="g-needle" style="--to:${f(135 + 270 * VAL)}deg">
    <line x1="292" y1="200" x2="372" y2="200" stroke="#F4FFFF" stroke-width="3" stroke-linecap="round"/>
    <circle cx="352" cy="200" r="11" fill="#EFFFFF" filter="url(#gtip)"/>
  </g>
  <circle cx="200" cy="200" r="104" fill="url(#gcore)" stroke="rgba(255,255,255,.16)" stroke-width="1.2"/>
</svg>`;

writeFileSync(process.argv[2], JSON.stringify({ landSvg, labels, hits, bars, gaugeSvg }));
console.log('ok', niches.map(n => `${n.key} h=${n.h.toFixed(0)} sigma=${n.sigma.toFixed(0)}`).join(' | '));
