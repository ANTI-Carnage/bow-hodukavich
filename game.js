/* B.O.W.: Hodukavich - an unofficial fan game. All art drawn in code, all sound made with WebAudio. */
(() => {
'use strict';
const $ = (id) => document.getElementById(id);
const cvs = $('game');
const ctx = cvs.getContext('2d');
const TAU = Math.PI * 2;
const FONT = '"Arial Black","Segoe UI",system-ui,-apple-system,Roboto,sans-serif';
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
function pickW(items) { let s = 0; for (const it of items) s += it.w; let r = Math.random() * s; for (const it of items) { r -= it.w; if (r <= 0) return it; } return items[items.length - 1]; }

let W = 0, H = 0, DPR = 1, zoom = 1;
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  cvs.width = Math.round(W * DPR); cvs.height = Math.round(H * DPR);
  cvs.style.width = W + 'px'; cvs.style.height = H + 'px';
  zoom = clamp(Math.min(W, H) / 470, 0.78, 1.5);
}

/* ---------------- sound ---------------- */
let ac = null, master = null, muted = false, noiseBuf = null;
try { muted = localStorage.getItem('bowHodu.muted') === '1'; } catch (e) {}
function initAudio() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { ac = new AC(); master = ac.createGain(); master.gain.value = 0.55; master.connect(ac.destination); }
    catch (e) { ac = null; return; }
  }
  if (ac.state === 'suspended') ac.resume();
}
function tone(f, dur, type, vol, f2, delay) {
  if (!ac || muted) return;
  const t = ac.currentTime + (delay || 0);
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type || 'square';
  o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol || 0.15, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + dur + 0.05);
}
function noise(dur, vol, freq, delay, ftype, f2, q) {
  if (!ac || muted) return;
  if (!noiseBuf) {
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = ac.currentTime + (delay || 0);
  const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const f = ac.createBiquadFilter(); f.type = ftype || 'bandpass';
  f.frequency.setValueAtTime(freq || 1000, t);
  if (f2) f.frequency.exponentialRampToValueAtTime(f2, t + dur);
  f.Q.value = q || 1;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(master);
  s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
}
const lastSnd = {};
function thr(name, gap, fn) { return () => { const n = performance.now(); if (lastSnd[name] && n - lastSnd[name] < gap) return; lastSnd[name] = n; fn(); }; }
const sfx = {
  click: () => tone(520, 0.06, 'square', 0.07, 700),
  lash: thr('lash', 60, () => { noise(0.2, 0.28, 500, 0, 'bandpass', 3200, 0.8); tone(150, 0.14, 'sawtooth', 0.07, 60); }),
  hit: thr('hit', 40, () => { noise(0.09, 0.22, 900, 0, 'lowpass', 200, 3); tone(130, 0.08, 'square', 0.06, 60); }),
  clank: thr('clank', 60, () => { tone(1600, 0.08, 'square', 0.06, 1100); tone(2300, 0.06, 'triangle', 0.04, 1800); }),
  grab: () => { tone(260, 0.16, 'sawtooth', 0.07, 900); noise(0.14, 0.12, 2600, 0, 'highpass'); },
  absorb: () => { tone(280, 0.36, 'sine', 0.26, 45); noise(0.32, 0.32, 800, 0.03, 'lowpass', 90, 6); tone(95, 0.26, 'triangle', 0.16, 40, 0.13); },
  roar: () => { [62, 66, 99].forEach((f) => tone(f, 1.15, 'sawtooth', 0.13, 34)); noise(1.0, 0.38, 500, 0, 'lowpass', 80, 1); noise(0.55, 0.18, 2400, 0, 'bandpass', 500, 1); },
  gun: thr('gun', 45, () => { noise(0.07, 0.2, 1500, 0, 'bandpass', 500, 0.7); tone(170, 0.05, 'square', 0.04, 60); }),
  flame: thr('flame', 140, () => noise(0.28, 0.13, 900, 0, 'lowpass', 300, 0.5)),
  boom: thr('boom', 70, () => { noise(0.7, 0.45, 900, 0, 'lowpass', 60, 0.7); tone(80, 0.5, 'sine', 0.28, 30); }),
  hurt: thr('hurt', 120, () => { tone(105, 0.18, 'sawtooth', 0.11, 62); noise(0.12, 0.14, 400, 0, 'lowpass', 150, 3); }),
  eek: thr('eek', 380, () => tone(rand(820, 1050), 0.2, 'triangle', 0.035, 1350)),
  alarm: () => { for (let i = 0; i < 3; i++) { tone(760, 0.26, 'square', 0.05, 520, i * 0.34); } },
  evolve: () => { [196, 247, 294, 392].forEach((f, i) => tone(f, 0.3, 'sawtooth', 0.07, f * 1.02, i * 0.09)); noise(0.5, 0.15, 300, 0, 'lowpass', 1200, 3); },
  beep: thr('beep', 90, () => tone(1250, 0.07, 'square', 0.04)),
  stomp: () => { tone(58, 0.35, 'sine', 0.35, 28); noise(0.3, 0.3, 220, 0, 'lowpass', 60); },
  down: () => { tone(220, 0.4, 'sawtooth', 0.12, 50); noise(0.4, 0.2, 400, 0, 'lowpass', 80, 2); },
  win: () => { [262, 330, 392, 523, 659].forEach((f, i) => tone(f, 0.35, 'square', 0.07, 0, i * 0.12)); },
  spot: thr('spot', 900, () => { tone(600, 0.18, 'square', 0.04, 900); tone(900, 0.18, 'square', 0.04, 600, 0.2); }),
};

/* ---------------- levels ---------------- */
const THEMES = {
  lab: { floorA: '#c9d3d6', floorB: '#bcc7cb', grout: '#9aa7ac', wall: '#3a454c', dark: 0.08 },
  wing: { floorA: '#a9b8b4', floorB: '#9fafab', grout: '#7e8f8b', wall: '#2f3b3a', dark: 0.2 },
  street: { asphalt: '#3b3d42', wall: '#5a5248', dark: 0.1 },
  night: { asphalt: '#2c2e36', wall: '#4a4440', dark: 0.5 },
  arena: { asphalt: '#34363c', wall: '#504840', dark: 0.28 },
};
const LEVELS = [
  { name: 'QUARANTINE LAB B4', theme: 'lab', quota: 12, cap: 10, w: 1400, h: 1050, mix: [{ t: 'sci', w: 7 }, { t: 'sol', w: 2 }], obs: 'lab' },
  { name: 'CONTAINMENT WING', theme: 'wing', quota: 15, cap: 12, w: 1500, h: 1100, mix: [{ t: 'sci', w: 5 }, { t: 'sol', w: 4 }, { t: 'shd', w: 1.5 }], obs: 'lab' },
  { name: 'MILITARY BLOCKADE', theme: 'street', quota: 18, cap: 13, w: 1650, h: 1150, mix: [{ t: 'sci', w: 3 }, { t: 'sol', w: 5 }, { t: 'shd', w: 2 }, { t: 'flm', w: 1.6 }], obs: 'street' },
  { name: 'EVAC ZONE (NIGHT)', theme: 'night', quota: 20, cap: 14, w: 1700, h: 1200, mix: [{ t: 'sci', w: 3 }, { t: 'sol', w: 5 }, { t: 'shd', w: 2 }, { t: 'flm', w: 2 }], drones: 2, obs: 'street' },
  { name: 'BOSS: WARDEN MK-II', theme: 'arena', quota: 0, cap: 6, w: 1500, h: 1150, mix: [{ t: 'sci', w: 4 }, { t: 'sol', w: 4 }], boss: true, obs: 'arena' },
];
const UT = {
  sci: { hp: 12, speed: 96, r: 11, score: 100, heal: 9, meter: 12 },
  sol: { hp: 42, speed: 82, r: 12, score: 150, heal: 13, meter: 16 },
  shd: { hp: 85, speed: 62, r: 14, score: 250, heal: 16, meter: 20 },
  flm: { hp: 62, speed: 72, r: 13, score: 250, heal: 16, meter: 20 },
};
const EVOS = [
  { id: 'tent', ic: '\u{1F991}', name: 'Extra Tentacles', d: '+3 tentacles. Wider lash, +20% lash damage' },
  { id: 'speed', ic: '\u{1F4A8}', name: 'Hyper Metabolism', d: '+15% movement speed' },
  { id: 'armor', ic: '\u{1F6E1}', name: 'Armored Flesh', d: 'Take 18% less damage' },
  { id: 'reach', ic: '\u{1F9B7}', name: 'Long Reach', d: '+30% grab range, longer lash' },
  { id: 'hp', ic: '\u{2764}', name: 'Thick Hide', d: '+30 max flesh, fully healed' },
  { id: 'raven', ic: '\u{1F9EA}', name: 'Ravenous', d: 'Absorbing heals +50% and fills mutagen faster' },
  { id: 'roar', ic: '\u{1F4E2}', name: 'Seismic Roar', d: 'Eruption roar: +30% radius, +40% damage' },
  { id: 'regen', ic: '\u{267B}', name: 'Regeneration', d: 'Slowly heal over time (+1.5/s)' },
  { id: 'eye', ic: '\u{1F441}', name: 'Hunter Eye', d: 'Grab recharges 30% faster, lash 15% faster' },
];

/* ---------------- state ---------------- */
let state = 'title', level = 1, score = 0, best = 0, clock = 0, shake = 0;
let def = LEVELS[0], diff = 1, AW = 1400, AH = 1050, theme = THEMES.lab;
let units = [], drones = [], bullets = [], hazards = [], parts = [], texts = [], obstacles = [], decals = [], boss = null;
let camX = 0, camY = 0, spawnT = 0, levelAbsorbed = 0, totalAbsorbed = 0, combo = 0, comboT = 0, clearT = -1, banner = null, bossDeadT = -1, flashT = 0;
let P = null;
let touchMode = false;
try { best = +localStorage.getItem('bowHodu.best') || 0; } catch (e) {}
const keys = { up: 0, down: 0, left: 0, right: 0, atk: 0 };
const joy = { active: false, id: -1, ox: 0, oy: 0, dx: 0, dy: 0, kx: 0, ky: 0 };
let atkHeld = false;

function newPlayer() {
  return {
    x: 0, y: 0, r: 24, hp: 120, maxHp: 120, face: -Math.PI / 2, look: 0, vx: 0, vy: 0,
    lashCd: 0, grabCd: 0, meter: 0, mass: 0, limbs: [], inv: 0, hurt: 0, lashT: 0, lashDir: 0, gulp: 0, blink: 0, blinkT: 2,
    tendril: null, roarT: 0, burnT: 0,
    st: { lashDmg: 26, arc: 2.2, lashR: 0, grabR: 230, speed: 168, armor: 0, regen: 0.5, absorb: 1, roarR: 250, roarDmg: 70, extraTent: 0, lashRate: 0.42, grabRate: 1.05 },
    evos: [],
  };
}
function updR() { P.r = 24 + Math.min(P.mass, 70) * 0.3; }
const lashRange = () => P.r + 66 + P.st.lashR;
const tentCount = () => 5 + Math.floor(Math.min(P.mass, 40) / 4) + P.st.extraTent;

/* ---------------- level build ---------------- */
function rectHit(x, y, r, o) { const cx = clamp(x, o.x, o.x + o.w), cy = clamp(y, o.y, o.y + o.h); return (x - cx) ** 2 + (y - cy) ** 2 < r * r; }
function freeSpot(r, avoidX, avoidY, avoidR) {
  for (let i = 0; i < 60; i++) {
    const x = rand(60 + r, AW - 60 - r), y = rand(60 + r, AH - 60 - r);
    if (avoidX != null && dist(x, y, avoidX, avoidY) < avoidR) continue;
    if (obstacles.some((o) => rectHit(x, y, r + 6, o))) continue;
    return { x, y };
  }
  return { x: AW / 2 + rand(-100, 100), y: AH / 2 + rand(-100, 100) };
}
function buildLevel(n) {
  level = n;
  def = LEVELS[(n - 1) % LEVELS.length];
  diff = 1 + Math.floor((n - 1) / LEVELS.length) * 0.45;
  AW = def.w; AH = def.h; theme = THEMES[def.theme];
  units = []; drones = []; bullets = []; hazards = []; parts = []; texts = []; obstacles = []; decals = []; boss = null;
  levelAbsorbed = 0; clearT = -1; bossDeadT = -1; spawnT = 0; combo = 0; comboT = 0;
  const cx = AW / 2, cy = AH / 2;
  const want = def.obs === 'arena' ? 6 : def.obs === 'lab' ? 11 : 12;
  for (let i = 0; i < want * 6 && obstacles.length < want; i++) {
    let o;
    if (def.obs === 'lab') {
      const k = pick(['bench', 'bench', 'tank', 'cab']);
      o = k === 'bench' ? { k, w: rand(110, 170), h: 44 } : k === 'tank' ? { k, w: 70, h: 70 } : { k, w: 46, h: rand(90, 130) };
      if (k === 'bench' && Math.random() < 0.4) { const t = o.w; o.w = o.h; o.h = t; }
    } else if (def.obs === 'street') {
      const k = pick(['car', 'car', 'sand', 'barrier', 'crate']);
      o = k === 'car' ? { k, w: 96, h: 50, col: pick(['#7a2a2a', '#2a4a7a', '#666', '#3d5e3d', '#8a7a3a']) } : k === 'sand' ? { k, w: rand(110, 160), h: 34 } : k === 'barrier' ? { k, w: 120, h: 26 } : { k, w: 56, h: 56 };
      if (Math.random() < 0.35) { const t = o.w; o.w = o.h; o.h = t; }
    } else {
      const k = pick(['barrier', 'crate', 'sand']);
      o = k === 'crate' ? { k, w: 60, h: 60 } : k === 'sand' ? { k, w: 130, h: 34 } : { k, w: 120, h: 26 };
      if (Math.random() < 0.4) { const t = o.w; o.w = o.h; o.h = t; }
    }
    o.x = rand(80, AW - 80 - o.w); o.y = rand(80, AH - 80 - o.h);
    if (dist(o.x + o.w / 2, o.y + o.h / 2, cx, cy) < 200) continue;
    if (def.boss && o.y < 330 && Math.abs(o.x + o.w / 2 - cx) < 200) continue;
    if (obstacles.some((p) => o.x < p.x + p.w + 70 && o.x + o.w + 70 > p.x && o.y < p.y + p.h + 70 && o.y + o.h + 70 > p.y)) continue;
    obstacles.push(o);
  }
  for (let i = 0; i < 26; i++) {
    const kind = def.obs === 'lab' ? pick(['goo', 'goo', 'paper', 'glass', 'vent']) : pick(['crack', 'crack', 'goo', 'debris', 'paint']);
    decals.push({ kind, x: rand(40, AW - 40), y: rand(40, AH - 40), r: rand(10, 34), a: rand(0, TAU), s: Math.random() });
  }
  P.x = cx; P.y = def.boss ? cy + 120 : cy; P.vx = P.vy = 0; P.tendril = null; P.inv = 1.2;
  camX = P.x; camY = P.y;
  const start = def.boss ? 2 : Math.min(def.cap, 6 + Math.floor(n / 2));
  for (let i = 0; i < start; i++) spawnUnit(true);
  for (let i = 0; i < (def.drones || 0) * (diff > 1 ? 2 : 1); i++) spawnDrone();
  if (def.boss) spawnBoss();
}
function rollType() { return pickW(def.mix).t; }
function spawnUnit(inside, type) {
  type = type || rollType();
  const b = UT[type];
  let x, y;
  if (inside) { const s = freeSpot(b.r, P.x, P.y, 330); x = s.x; y = s.y; }
  else {
    const side = randi(0, 3);
    x = side === 0 ? 50 : side === 1 ? AW - 50 : rand(60, AW - 60);
    y = side === 2 ? 50 : side === 3 ? AH - 50 : rand(60, AH - 60);
    if (dist(x, y, P.x, P.y) < 300) { x = AW - x; y = AH - y; }
  }
  const u = { type, x, y, r: b.r, hp: b.hp * diff, maxHp: b.hp * diff, speed: b.speed * (0.9 + Math.random() * 0.2) * (1 + (diff - 1) * 0.25),
    face: rand(0, TAU), st: 'idle', t: 0, fireCd: rand(1.0, 2.4), burst: 0, burstT: 0, aimT: 0, flameT: 0, downT: 0, daze: 0, stun: 0, absT: -1, kx: 0, ky: 0,
    wx: x, wy: y, wT: 0, skin: pick(['#f1c9a5', '#d9a77f', '#a8714f', '#7a4b31', '#ffdcbc']), hair: pick(['#2b1b10', '#5a3a1a', '#111', '#a0703a', '#777']), flail: rand(0, TAU), eekT: rand(0, 2) };
  collideObs(u, u.r);
  units.push(u);
  return u;
}
function spawnDrone() {
  const s = freeSpot(20, P.x, P.y, 400);
  drones.push({ x: s.x, y: s.y, hp: 55 * diff, maxHp: 55 * diff, spX: s.x, spY: s.y, spotT: 0, fireCd: rand(1.5, 3), t: rand(0, 9), hitT: 0, vx: 0, vy: 0 });
}
function spawnBoss() {
  boss = { x: AW / 2, y: 150, r: 58, hp: 1500 * diff, maxHp: 1500 * diff, face: Math.PI / 2, aim: Math.PI / 2, mode: 'intro', t: 2.0, fireT: 0, step: 0, hitT: 0, legT: 0, missiles: 0, mT: 0, phase2: false, squadT: 6 };
}

/* ---------------- overlays / flow ---------------- */
function showOverlay(id) {
  for (const o of document.querySelectorAll('.overlay')) o.classList.toggle('show', o.id === id);
  document.body.classList.toggle('playing', state === 'play');
  updatePad();
}
function startGame() { score = 0; totalAbsorbed = 0; P = newPlayer(); startLevel(1); }
function startLevel(n) {
  buildLevel(n);
  state = 'play';
  showOverlay(null);
  banner = { t: 0, a: 'LEVEL ' + n, b: def.name, c: def.boss ? 'Destroy the Warden mech' : `Absorb ${quota()} humans to mutate` };
  sfx.alarm();
}
function quota() { return def.quota + Math.floor((level - 1) / LEVELS.length) * 4; }
function setPaused(p) {
  if (p && state === 'play') { state = 'pause'; clearInput(); showOverlay('pause'); }
  else if (!p && state === 'pause') { state = 'play'; showOverlay(null); }
}
let evoChoices = [];
function levelClear() {
  if (state !== 'play') return;
  saveBest();
  if (def.boss) {
    state = 'win'; sfx.win();
    $('winStats').innerHTML = `The Warden is scrap. Nothing can contain you.<br>Score <b>${score}</b> &middot; Absorbed <b>${totalAbsorbed}</b> &middot; Best <b>${best}</b>`;
    showOverlay('win');
    return;
  }
  openEvolve(`Level ${level} cleared &middot; Score <b>${score}</b> &middot; Mass <b>${P.mass}</b>`);
}
function openEvolve(statsHtml) {
  state = 'evolve'; sfx.evolve();
  const pool = EVOS.filter((e) => !(e.id === 'tent' && P.st.extraTent >= 9) && !(e.id === 'armor' && P.st.armor >= 0.6));
  evoChoices = [];
  while (evoChoices.length < 3 && pool.length) evoChoices.push(pool.splice(randi(0, pool.length - 1), 1)[0]);
  $('evoStats').innerHTML = statsHtml;
  const box = $('evoCards'); box.innerHTML = '';
  evoChoices.forEach((e, i) => {
    const b = document.createElement('button'); b.className = 'evo';
    b.innerHTML = `<span class="ic">${e.ic}</span><span><b>${e.name}</b><span>${e.d}</span></span><span class="num">${touchMode ? '' : i + 1}</span>`;
    b.addEventListener('click', () => { initAudio(); chooseEvo(i); });
    box.appendChild(b);
  });
  showOverlay('evolve');
}
function applyEvo(id) {
  const s = P.st;
  if (id === 'tent') { s.extraTent += 3; s.arc = Math.min(3.6, s.arc + 0.35); s.lashDmg *= 1.2; }
  else if (id === 'speed') s.speed *= 1.15;
  else if (id === 'armor') s.armor = Math.min(0.6, s.armor + 0.18);
  else if (id === 'reach') { s.grabR *= 1.3; s.lashR += 22; }
  else if (id === 'hp') { P.maxHp += 30; P.hp = P.maxHp; }
  else if (id === 'raven') s.absorb *= 1.5;
  else if (id === 'roar') { s.roarR *= 1.3; s.roarDmg *= 1.4; }
  else if (id === 'regen') s.regen += 1.5;
  else if (id === 'eye') { s.grabRate *= 0.7; s.lashRate *= 0.85; }
  P.evos.push(id);
}
function chooseEvo(i) {
  if (state !== 'evolve' || !evoChoices[i]) return;
  applyEvo(evoChoices[i].id);
  P.hp = Math.min(P.maxHp, P.hp + (P.maxHp - P.hp) * 0.5 + 20);
  startLevel(level + 1);
}
function gameOver() {
  state = 'over'; sfx.down();
  const nb = saveBest();
  $('overStats').innerHTML = `Reached level <b>${level}</b> &middot; Absorbed <b>${totalAbsorbed}</b><br>Score <b>${score}</b> &middot; Best <b>${best}</b>`;
  $('newBest').classList.toggle('hidden', !nb);
  showOverlay('over');
}
function saveBest() {
  if (score > best) { best = score; try { localStorage.setItem('bowHodu.best', String(best)); } catch (e) {} return true; }
  return false;
}
function toTitle() {
  state = 'title';
  P = newPlayer(); P.mass = 16; for (let i = 0; i < 10; i++) P.limbs.push(newLimb(i % 2 ? 'sol' : 'sci')); updR();
  buildLevel(1); P.inv = 0;
  $('bestTitle').textContent = best;
  showOverlay('title');
}
function newLimb(type) { return { a: rand(0, TAU), kind: type, len: rand(0.7, 1.15), ph: rand(0, TAU) }; }

/* ---------------- effects ---------------- */
function addText(x, y, txt, col, big) { texts.push({ x, y, txt, col, big: !!big, t: 0, life: big ? 1.8 : 1.2 }); if (texts.length > 40) texts.shift(); }
function burst(x, y, col, n, spd, size, life) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), s = rand(spd * 0.3, spd);
    parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: (life || 0.6) * rand(0.6, 1.2), t: 0, col, size: size * rand(0.6, 1.3) });
  }
  if (parts.length > 500) parts.splice(0, parts.length - 500);
}
function ring(x, y, r, col, life, w) { parts.push({ ring: true, x, y, r, col, life, t: 0, w: w || 6 }); }

/* ---------------- combat ---------------- */
let god = false;
function hurtPlayer(dmg) {
  if (state !== 'play' || P.inv > 0 || bossDeadT >= 0 || clearT >= 0) return;
  dmg *= 1 - P.st.armor;
  if (god) dmg = 0;
  P.hp -= dmg; P.hurt = 0.2; shake = Math.max(shake, 4 + dmg * 0.25);
  burst(P.x + rand(-P.r, P.r) * 0.5, P.y + rand(-P.r, P.r) * 0.5, '#b34dff', 4, 120, 4);
  sfx.hurt();
  if (P.hp <= 0) { P.hp = 0; burst(P.x, P.y, '#b34dff', 50, 300, 7, 1); burst(P.x, P.y, '#7dff3a', 30, 200, 5, 1); gameOver(); }
}
function shieldBlocks(u, fromX, fromY) {
  if (u.type !== 'shd' || u.st === 'down' || u.daze > 0) return false;
  const a = Math.atan2(fromY - u.y, fromX - u.x);
  return Math.abs(angDiff(u.face, a)) < 1.05;
}
function damageUnit(u, dmg, fromX, fromY, kb) {
  if (u.absT >= 0) return;
  u.hp -= dmg;
  const a = Math.atan2(u.y - fromY, u.x - fromX);
  u.kx += Math.cos(a) * (kb || 0) * 6; u.ky += Math.sin(a) * (kb || 0) * 6;
  burst(u.x, u.y, '#fff3a0', 5, 160, 3, 0.35);
  if (u.hp <= 0 && u.st !== 'down') knockDown(u);
  else if (u.st !== 'down') { u.stun = Math.max(u.stun, 0.22); if (u.type === 'sci') sfx.eek(); }
}
function knockDown(u) {
  u.hp = 0; u.st = 'down'; u.downT = u.type === 'sci' ? 5 : 7; u.aimT = 0; u.flameT = 0; u.burst = 0;
  addText(u.x, u.y - 18, 'DOWN', '#b6ff5c');
}
const absorbable = (u) => u.absT < 0 && (u.type === 'sci' || u.st === 'down' || u.daze > 0);
function startAbsorb(u) { if (u.absT >= 0) return; u.absT = 0; u.st = 'absorb'; sfx.grab(); }
function finishAbsorb(u) {
  const b = UT[u.type];
  if (comboT > 0) combo++; else combo = 0;
  comboT = 2.6;
  const mult = 1 + combo * 0.25;
  const pts = Math.round(b.score * mult * (1 + (level - 1) * 0.1));
  score += pts;
  P.mass++; totalAbsorbed++; levelAbsorbed++; updR();
  P.hp = Math.min(P.maxHp, P.hp + b.heal * P.st.absorb);
  P.meter = Math.min(100, P.meter + b.meter * P.st.absorb);
  P.gulp = 1;
  if (P.limbs.length < 18) P.limbs.push(newLimb(u.type)); else P.limbs[randi(0, P.limbs.length - 1)] = newLimb(u.type);
  ring(P.x, P.y, P.r + 10, 'rgba(190,90,255,', 0.45, 8);
  burst(P.x, P.y, '#d27bff', 14, 170, 4, 0.5);
  burst(P.x, P.y, '#9eff4a', 6, 120, 3, 0.5);
  addText(P.x, P.y - P.r - 14, combo > 0 ? `+${pts}  x${combo + 1}` : `+${pts}`, combo > 0 ? '#ffd34d' : '#e6b3ff', combo > 1);
  sfx.absorb();
  if (!def.boss && levelAbsorbed >= quota() && clearT < 0 && state === 'play') { clearT = 1.4; addText(P.x, P.y - P.r - 40, 'MUTATING...', '#b6ff5c', true); }
}
function doLash() {
  if (P.lashCd > 0 || state !== 'play') return;
  P.lashCd = P.st.lashRate;
  const R = lashRange();
  let tgt = null, bd = 1e9;
  for (const u of units) { if (u.absT >= 0) continue; const d = dist(u.x, u.y, P.x, P.y) - u.r; if (d < R + 50 && d < bd) { bd = d; tgt = u; } }
  for (const d0 of drones) { const d = dist(d0.x, d0.y, P.x, P.y); if (d < R + 40 && d < bd) { bd = d; tgt = d0; } }
  if (boss && boss.hp > 0) { const d = dist(boss.x, boss.y, P.x, P.y) - boss.r; if (d < R + 40 && d < bd) { bd = d; tgt = boss; } }
  P.lashDir = tgt ? Math.atan2(tgt.y - P.y, tgt.x - P.x) : P.face;
  P.face = P.lashDir;
  P.lashT = 0.24;
  sfx.lash();
  const arc = P.st.arc / 2;
  let hitAny = false;
  for (const u of units) {
    if (u.absT >= 0) continue;
    const d = dist(u.x, u.y, P.x, P.y);
    if (d > R + u.r) continue;
    const a = Math.atan2(u.y - P.y, u.x - P.x);
    if (d > P.r + u.r && Math.abs(angDiff(P.lashDir, a)) > arc + 0.25) continue;
    hitAny = true;
    if (shieldBlocks(u, P.x, P.y)) { u.hp -= 4; sfx.clank(); burst(u.x + Math.cos(u.face) * 14, u.y + Math.sin(u.face) * 14, '#ffffff', 6, 200, 2.5, 0.3); u.kx += Math.cos(a) * 140; u.ky += Math.sin(a) * 140; u.stun = 0.35; continue; }
    damageUnit(u, P.st.lashDmg, P.x, P.y, 30);
  }
  for (const dr of drones) {
    if (dist(dr.x, dr.y, P.x, P.y) > R + 20) continue;
    if (Math.abs(angDiff(P.lashDir, Math.atan2(dr.y - P.y, dr.x - P.x))) > arc + 0.3) continue;
    hitDrone(dr, P.st.lashDmg); hitAny = true;
  }
  if (boss && boss.hp > 0 && dist(boss.x, boss.y, P.x, P.y) < R + boss.r) { hitBoss(P.st.lashDmg); hitAny = true; }
  let swat = 0;
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i]; const d = dist(b.x, b.y, P.x, P.y);
    if (d < R + 10 && Math.abs(angDiff(P.lashDir, Math.atan2(b.y - P.y, b.x - P.x))) < arc + 0.3) { burst(b.x, b.y, '#ffe9a0', 3, 120, 2, 0.25); bullets.splice(i, 1); swat++; }
  }
  if (hitAny) { sfx.hit(); shake = Math.max(shake, 3); }
  if (swat > 1) addText(P.x, P.y - P.r - 10, 'SWAT!', '#ffe9a0');
}
function doGrab() {
  if (P.grabCd > 0 || P.tendril || state !== 'play') return;
  P.grabCd = P.st.grabRate;
  const R = P.st.grabR + P.r;
  let tgt = null, bs = 1e9;
  for (const u of units) {
    if (u.absT >= 0) continue;
    const d = dist(u.x, u.y, P.x, P.y);
    if (d > R) continue;
    const s = d * (absorbable(u) || u.hp <= u.maxHp * 0.5 ? 0.45 : 1) + (u.type === 'shd' ? 80 : 0);
    if (s < bs) { bs = s; tgt = u; }
  }
  for (const dr of drones) { const d = dist(dr.x, dr.y, P.x, P.y); if (d < R && d * 1.1 < bs) { bs = d * 1.1; tgt = dr; } }
  if (boss && boss.hp > 0) { const d = dist(boss.x, boss.y, P.x, P.y) - boss.r; if (d < R && d * 1.3 < bs) { bs = d * 1.3; tgt = boss; } }
  let tx, ty;
  if (tgt) { tx = tgt.x; ty = tgt.y; P.face = Math.atan2(ty - P.y, tx - P.x); }
  else { tx = P.x + Math.cos(P.face) * R; ty = P.y + Math.sin(P.face) * R; }
  P.tendril = { tgt, tx, ty, t: 0, out: 0.14, back: 0.16, done: false, miss: !tgt };
  sfx.grab();
}
function tendrilHit(tg) {
  const tgt = tg.tgt; if (!tgt) return;
  if (tgt === boss) { if (boss.hp > 0) { hitBoss(28); sfx.hit(); } return; }
  if (drones.includes(tgt)) { hitDrone(tgt, 40); tgt.vx += (P.x - tgt.x) * 2; tgt.vy += (P.y - tgt.y) * 2; sfx.hit(); return; }
  const u = tgt; if (!units.includes(u) || u.absT >= 0) return;
  if (shieldBlocks(u, P.x, P.y)) { sfx.clank(); burst(u.x + Math.cos(u.face) * 14, u.y + Math.sin(u.face) * 14, '#fff', 8, 200, 2.5, 0.3); u.stun = 0.5; addText(u.x, u.y - 20, 'BLOCKED', '#9fd0ff'); return; }
  if (absorbable(u) || u.hp <= u.maxHp * 0.5) { startAbsorb(u); return; }
  damageUnit(u, 18, P.x, P.y, 0);
  u.x += (P.x - u.x) * 0.4; u.y += (P.y - u.y) * 0.4; u.stun = Math.max(u.stun, 0.7);
  collideObs(u, u.r);
  sfx.hit();
}
function doSpecial() {
  if (P.meter < 100 || P.roarT > 0 || state !== 'play') return;
  P.meter = 0; P.roarT = 0.9; P.inv = Math.max(P.inv, 1.0);
  const R = P.st.roarR + P.r;
  sfx.roar(); shake = 16; flashT = 0.25;
  ring(P.x, P.y, R, 'rgba(160,255,80,', 0.6, 14);
  ring(P.x, P.y, R * 0.6, 'rgba(210,90,255,', 0.5, 10);
  burst(P.x, P.y, '#b6ff5c', 40, 380, 5, 0.7);
  for (const u of units) {
    if (u.absT >= 0) continue;
    if (dist(u.x, u.y, P.x, P.y) > R + u.r) continue;
    damageUnit(u, P.st.roarDmg, P.x, P.y, 70);
    u.daze = 2.8;
  }
  for (const dr of drones) if (dist(dr.x, dr.y, P.x, P.y) < R + 30) hitDrone(dr, 90);
  if (boss && boss.hp > 0 && dist(boss.x, boss.y, P.x, P.y) < R + boss.r) hitBoss(P.st.roarDmg * 1.6);
  for (let i = bullets.length - 1; i >= 0; i--) if (dist(bullets[i].x, bullets[i].y, P.x, P.y) < R) bullets.splice(i, 1);
  for (const h of hazards) if (dist(h.x, h.y, P.x, P.y) < R) h.dud = true;
  addText(P.x, P.y - P.r - 30, 'ERUPTION!', '#b6ff5c', true);
}
function hitDrone(dr, dmg) {
  dr.hp -= dmg; dr.hitT = 0.15;
  if (dr.hp <= 0 && !dr.dead) {
    dr.dead = true; score += 300; sfx.boom(); shake = Math.max(shake, 8);
    burst(dr.x, dr.y, '#ffb347', 26, 260, 5, 0.7); burst(dr.x, dr.y, '#555', 14, 160, 6, 0.9);
    addText(dr.x, dr.y - 20, '+300 DRONE DOWN', '#ffd34d');
    P.meter = Math.min(100, P.meter + 15);
  }
}
function hitBoss(dmg) {
  if (!boss || boss.hp <= 0) return;
  const mult = boss.mode === 'vent' ? 2.2 : 1;
  boss.hp -= dmg * mult; boss.hitT = 0.12;
  burst(boss.x + rand(-30, 30), boss.y + rand(-30, 30), boss.mode === 'vent' ? '#ffb347' : '#fff3a0', 6, 200, 3, 0.4);
  if (mult > 1 && Math.random() < 0.5) addText(boss.x + rand(-20, 20), boss.y - boss.r - 10, 'CORE HIT!', '#ffb347');
  if (!boss.phase2 && boss.hp < boss.maxHp * 0.5) { boss.phase2 = true; addText(boss.x, boss.y - boss.r - 30, 'WARDEN: OVERDRIVE', '#ff6b6b', true); spawnDrone(); sfx.alarm(); }
  if (boss.hp <= 0) {
    boss.hp = 0; bossDeadT = 2.6; score += 5000; sfx.boom(); shake = 22;
    addText(boss.x, boss.y - 80, '+5000 WARDEN DESTROYED', '#ffd34d', true);
    bullets.length = 0; hazards.length = 0;
  }
}
function fire(x, y, a, spd, dmg, spread, kind) {
  const aa = a + rand(-spread, spread);
  bullets.push({ x, y, vx: Math.cos(aa) * spd, vy: Math.sin(aa) * spd, dmg, life: 2.4, kind: kind || 'b' });
}
function strike(x, y, r, dmg, delay) { hazards.push({ x: clamp(x, 40, AW - 40), y: clamp(y, 40, AH - 40), r, dmg, t: 0, dur: delay, dud: false }); }

/* ---------------- movement helpers ---------------- */
function collideObs(e, r) {
  for (const o of obstacles) {
    const cx = clamp(e.x, o.x, o.x + o.w), cy = clamp(e.y, o.y, o.y + o.h);
    const dx = e.x - cx, dy = e.y - cy, d2 = dx * dx + dy * dy;
    if (d2 < r * r) {
      if (d2 > 0.0001) { const d = Math.sqrt(d2); e.x = cx + dx / d * r; e.y = cy + dy / d * r; }
      else { const l = e.x - o.x, rr = o.x + o.w - e.x, t = e.y - o.y, b = o.y + o.h - e.y; const m = Math.min(l, rr, t, b); if (m === l) e.x = o.x - r; else if (m === rr) e.x = o.x + o.w + r; else if (m === t) e.y = o.y - r; else e.y = o.y + o.h + r; }
    }
  }
  e.x = clamp(e.x, 30 + r, AW - 30 - r); e.y = clamp(e.y, 30 + r, AH - 30 - r);
}
function steer(u, tx, ty, spd, dt) {
  const a = Math.atan2(ty - u.y, tx - u.x);
  u.x += Math.cos(a) * spd * dt; u.y += Math.sin(a) * spd * dt;
  return a;
}
function los(ax, ay, bx, by) {
  for (const o of obstacles) {
    if (o.k === 'sand' || o.k === 'barrier') continue;
    for (let i = 1; i < 8; i++) { const x = ax + (bx - ax) * i / 8, y = ay + (by - ay) * i / 8; if (x > o.x && x < o.x + o.w && y > o.y && y < o.y + o.h) return false; }
  }
  return true;
}
function wanderU(u, dt) {
  u.wT -= dt;
  if (u.wT <= 0 || dist(u.x, u.y, u.wx, u.wy) < 12) { const s = freeSpot(u.r); u.wx = s.x; u.wy = s.y; u.wT = rand(2, 5); }
  u.face = steer(u, u.wx, u.wy, u.speed * 0.45, dt);
  u.st = 'idle';
}

/* ---------------- update ---------------- */
function update(dt) {
  if (banner) { banner.t += dt; if (banner.t > 2.8) banner = null; }
  let mx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0), my = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
  if (joy.active) { mx = joy.dx; my = joy.dy; }
  let m = Math.hypot(mx, my); if (m > 1) { mx /= m; my /= m; m = 1; }
  const spd = P.st.speed * (P.burnT > 0 ? 0.85 : 1) * (P.roarT > 0 ? 0.4 : 1);
  P.vx += (mx * spd - P.vx) * Math.min(1, dt * 12); P.vy += (my * spd - P.vy) * Math.min(1, dt * 12);
  P.x += P.vx * dt; P.y += P.vy * dt;
  if (m > 0.2 && P.lashT <= 0) P.face = Math.atan2(my, mx);
  collideObs(P, P.r * 0.8);
  if (boss && boss.hp > 0) { const d = dist(P.x, P.y, boss.x, boss.y), rr = P.r * 0.8 + boss.r; if (d < rr && d > 0) { P.x = boss.x + (P.x - boss.x) / d * rr; P.y = boss.y + (P.y - boss.y) / d * rr; } }
  P.lashCd -= dt; P.grabCd -= dt; P.inv -= dt; P.hurt -= dt; P.lashT -= dt; P.roarT -= dt; P.burnT -= dt;
  P.gulp = Math.max(0, P.gulp - dt * 2.5);
  P.blinkT -= dt; if (P.blinkT < 0) { P.blink = 0.16; P.blinkT = rand(1.8, 4.5); } P.blink = Math.max(0, P.blink - dt);
  if (P.st.regen) P.hp = Math.min(P.maxHp, P.hp + P.st.regen * dt);
  if (keys.atk || atkHeld) doLash();
  comboT -= dt;
  flashT = Math.max(0, flashT - dt);
  let lk = null, ld = 420;
  for (const u of units) { const d = dist(u.x, u.y, P.x, P.y); if (d < ld && u.absT < 0) { ld = d; lk = u; } }
  if (boss && boss.hp > 0 && dist(boss.x, boss.y, P.x, P.y) < 500) lk = boss;
  const la = lk ? Math.atan2(lk.y - P.y, lk.x - P.x) : P.face;
  P.look += angDiff(P.look, la) * Math.min(1, dt * 8);
  const tg = P.tendril;
  if (tg) {
    tg.t += dt;
    if (tg.tgt && (units.includes(tg.tgt) || drones.includes(tg.tgt) || tg.tgt === boss)) { tg.tx = tg.tgt.x; tg.ty = tg.tgt.y; }
    if (!tg.done && tg.t >= tg.out) { tg.done = true; tendrilHit(tg); }
    if (tg.t >= tg.out + tg.back) P.tendril = null;
  }
  const mf = state === 'play' && bossDeadT < 0 && clearT < 0;
  // ---- units
  for (let i = units.length - 1; i >= 0; i--) {
    const u = units[i];
    u.t += dt; u.stun -= dt; u.daze -= dt; u.flail += dt * 14;
    u.x += u.kx * dt; u.y += u.ky * dt; u.kx *= Math.pow(0.02, dt); u.ky *= Math.pow(0.02, dt);
    const d = dist(u.x, u.y, P.x, P.y);
    const aP = Math.atan2(P.y - u.y, P.x - u.x);
    if (u.absT >= 0) {
      u.absT += dt;
      const k = Math.min(1, dt * 9);
      u.x += (P.x - u.x) * k; u.y += (P.y - u.y) * k;
      if (u.absT >= 0.38) { units.splice(i, 1); finishAbsorb(u); }
      continue;
    }
    if (state === 'play' && d < P.r + u.r + 3 && absorbable(u)) { startAbsorb(u); continue; }
    if (u.st === 'down') {
      u.downT -= dt;
      if (u.downT <= 0) { u.st = 'idle'; u.hp = u.maxHp * 0.4; addText(u.x, u.y - 18, 'GOT UP', '#ffb3b3'); }
      collideObs(u, u.r);
      continue;
    }
    if (u.daze > 0 || u.stun > 0) { collideObs(u, u.r); continue; }
    if (u.type === 'sci') {
      if (d < 340) {
        u.st = 'flee';
        const fa = aP + Math.PI + Math.sin(u.t * 2 + i) * 0.6;
        let tx = u.x + Math.cos(fa) * 100, ty = u.y + Math.sin(fa) * 100;
        if (tx < 90 || tx > AW - 90 || ty < 90 || ty > AH - 90) { const sa = fa + (i % 2 ? 1.5 : -1.5); tx = u.x + Math.cos(sa) * 100; ty = u.y + Math.sin(sa) * 100; }
        u.face = steer(u, tx, ty, u.speed * 1.05, dt);
        u.eekT -= dt; if (u.eekT < 0 && d < 220) { u.eekT = rand(1.5, 3.5); sfx.eek(); }
      } else wanderU(u, dt);
    } else {
      if (d > 640) { wanderU(u, dt); collideObs(u, u.r); continue; }
      u.st = 'fight';
      const desired = u.type === 'sol' ? 260 : u.type === 'shd' ? 150 : 140;
      const busy = u.aimT > 0 || u.burst > 0 || u.flameT > 0;
      if (u.type === 'shd') u.face += angDiff(u.face, aP) * Math.min(1, dt * 3.5);
      else if (!busy) u.face = aP;
      if (!busy || u.type === 'shd') {
        if (d > desired + 30) steer(u, P.x, P.y, u.speed, dt);
        else if (d < desired - 40 && u.type === 'sol') { u.x -= Math.cos(aP) * u.speed * 0.85 * dt; u.y -= Math.sin(aP) * u.speed * 0.85 * dt; }
        else { const sa = aP + Math.PI / 2 * (i % 2 ? 1 : -1); u.x += Math.cos(sa) * u.speed * 0.35 * dt; u.y += Math.sin(sa) * u.speed * 0.35 * dt; }
      }
      u.fireCd -= dt;
      if (u.type === 'sol') {
        if (u.aimT > 0) { u.aimT -= dt; if (u.aimT <= 0) { u.burst = 3 + (diff > 1 ? 1 : 0); u.burstT = 0; } }
        else if (u.burst > 0) { u.burstT -= dt; if (u.burstT <= 0) { u.burst--; u.burstT = 0.11; if (mf) { fire(u.x + Math.cos(u.face) * 16, u.y + Math.sin(u.face) * 16, u.face, 330, 6, 0.09); sfx.gun(); } if (u.burst <= 0) u.fireCd = rand(1.6, 2.6) / (0.8 + diff * 0.2); } }
        else if (u.fireCd <= 0 && d < 520 && los(u.x, u.y, P.x, P.y)) { u.aimT = 0.5; u.face = aP; }
      } else if (u.type === 'shd') {
        if (u.fireCd <= 0 && d < 420 && Math.abs(angDiff(u.face, aP)) < 0.5) { u.fireCd = rand(1.3, 1.9) / diff; if (mf) { fire(u.x + Math.cos(u.face) * 18, u.y + Math.sin(u.face) * 18, u.face, 300, 5, 0.06); sfx.gun(); } }
      } else if (u.type === 'flm') {
        if (u.flameT > 0) {
          u.flameT -= dt; u.face += angDiff(u.face, aP) * Math.min(1, dt * 1.6);
          if (mf) sfx.flame();
          for (let k = 0; k < 3; k++) { const a = u.face + rand(-0.3, 0.3), s = rand(160, 260); parts.push({ x: u.x + Math.cos(u.face) * 18, y: u.y + Math.sin(u.face) * 18, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.45, 0.7), t: 0, col: pick(['#ffb347', '#ff7a1a', '#ffe066']), size: rand(5, 9), fire: true }); }
          if (mf && d < 185 + P.r * 0.5 && Math.abs(angDiff(u.face, aP)) < 0.38) { hurtPlayer(30 * dt * diff); P.burnT = 0.3; }
          if (u.flameT <= 0) u.fireCd = rand(2.2, 3.2);
        } else if (u.fireCd <= 0 && d < 200) u.flameT = 1.6;
      }
    }
    collideObs(u, u.r);
  }
  for (let i = 0; i < units.length; i++) for (let j = i + 1; j < units.length; j++) {
    const a = units[i], b = units[j]; if (a.absT >= 0 || b.absT >= 0) continue;
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), rr = a.r + b.r;
    if (d < rr && d > 0.01) { const p = (rr - d) / 2; a.x -= dx / d * p; a.y -= dy / d * p; b.x += dx / d * p; b.y += dy / d * p; }
  }
  // ---- drones
  for (let i = drones.length - 1; i >= 0; i--) {
    const dr = drones[i]; dr.t += dt; dr.hitT -= dt;
    if (dr.dead) { drones.splice(i, 1); continue; }
    const hx = P.x + Math.cos(dr.t * 0.6 + i * 2) * 230, hy = P.y + Math.sin(dr.t * 0.6 + i * 2) * 170;
    dr.vx += (hx - dr.x) * dt * 1.2; dr.vy += (hy - dr.y) * dt * 1.2; dr.vx *= Math.pow(0.3, dt); dr.vy *= Math.pow(0.3, dt);
    dr.x = clamp(dr.x + dr.vx * dt, 20, AW - 20); dr.y = clamp(dr.y + dr.vy * dt, 20, AH - 20);
    const sa = Math.atan2(P.y - dr.spY, P.x - dr.spX), sd = dist(P.x, P.y, dr.spX, dr.spY);
    const ss = Math.min(sd, 115 * dt * (0.9 + diff * 0.15));
    dr.spX += Math.cos(sa) * ss; dr.spY += Math.sin(sa) * ss;
    if (sd < 85 && mf) {
      dr.spotT += dt;
      if (dr.spotT > 0.35) sfx.spot();
      if (dr.spotT >= 1.1) { dr.spotT = -0.9; strike(P.x + P.vx * 0.5, P.y + P.vy * 0.5, 75, 22 * diff, 1.05); addText(P.x, P.y - P.r - 26, 'STRIKE INBOUND', '#ff6b6b'); }
    } else if (dr.spotT > 0) dr.spotT = 0; else dr.spotT = Math.min(0, dr.spotT + dt);
    dr.fireCd -= dt;
    if (dr.fireCd <= 0) { dr.fireCd = rand(2.0, 3.0) / diff; if (mf) { fire(dr.x, dr.y, Math.atan2(P.y - dr.y, P.x - dr.x), 280, 5, 0.05); sfx.gun(); } }
  }
  if (boss) updateBoss(dt, mf);
  // ---- bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    let dead = b.life <= 0 || b.x < 0 || b.y < 0 || b.x > AW || b.y > AH;
    if (!dead) for (const o of obstacles) { if (o.k !== 'sand' && b.x > o.x && b.x < o.x + o.w && b.y > o.y && b.y < o.y + o.h) { dead = true; burst(b.x, b.y, '#ddd', 2, 80, 2, 0.2); break; } }
    if (!dead && dist(b.x, b.y, P.x, P.y) < P.r * 0.85 + 3) { dead = true; hurtPlayer(b.dmg * (b.kind === 'g' ? 1 : diff * 0.9 + 0.1)); }
    if (dead) bullets.splice(i, 1);
  }
  // ---- strikes
  for (let i = hazards.length - 1; i >= 0; i--) {
    const h = hazards[i]; h.t += dt;
    if (Math.floor(h.t * 6) !== Math.floor((h.t - dt) * 6)) sfx.beep();
    if (h.t >= h.dur) {
      hazards.splice(i, 1);
      if (h.dud) { burst(h.x, h.y, '#888', 8, 100, 4, 0.5); continue; }
      sfx.boom(); shake = Math.max(shake, 9);
      burst(h.x, h.y, '#ffb347', 22, 260, 6, 0.6); burst(h.x, h.y, '#ff5a1a', 12, 200, 5, 0.5); burst(h.x, h.y, '#555', 10, 120, 7, 0.9);
      ring(h.x, h.y, h.r, 'rgba(255,170,60,', 0.35, 8);
      if (dist(h.x, h.y, P.x, P.y) < h.r + P.r * 0.5) hurtPlayer(h.dmg);
      for (const u of units) if (u.absT < 0 && dist(u.x, u.y, h.x, h.y) < h.r) damageUnit(u, 40, h.x, h.y, 60);
      decals.push({ kind: 'scorch', x: h.x, y: h.y, r: h.r * 0.7, a: rand(0, TAU), s: 0 });
      if (decals.length > 70) decals.splice(26, 1);
    }
  }
  // ---- spawning
  if (mf) {
    spawnT -= dt;
    let alive = 0; for (const u of units) if (u.absT < 0) alive++;
    const cap = def.cap + Math.floor((diff - 1) * 6);
    if (spawnT <= 0 && alive < cap) { spawnT = def.boss ? rand(2.5, 4) : rand(0.9, 1.8) / diff; spawnUnit(false); }
    if (alive < 3 && !def.boss) spawnUnit(false);
  }
  if (clearT >= 0) { clearT -= dt; if (clearT < 0) { levelClear(); return; } }
  if (bossDeadT >= 0) {
    bossDeadT -= dt;
    if (Math.random() < dt * 9 && boss) { burst(boss.x + rand(-60, 60), boss.y + rand(-50, 50), '#ffb347', 14, 220, 5, 0.6); sfx.boom(); shake = Math.max(shake, 6); }
    if (bossDeadT < 0) { boss = null; levelClear(); return; }
  }
  stepFx(dt);
}
function stepFx(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]; p.t += dt;
    if (p.t >= p.life) { parts.splice(i, 1); continue; }
    if (!p.ring) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= Math.pow(0.08, dt); p.vy *= Math.pow(0.08, dt); }
  }
  for (let i = texts.length - 1; i >= 0; i--) { const t = texts[i]; t.t += dt; t.y -= 26 * dt; if (t.t > t.life) texts.splice(i, 1); }
}
function updateBoss(dt, mf) {
  const B = boss; B.t -= dt; B.hitT -= dt; B.legT += dt;
  if (B.hp <= 0) return;
  const d = dist(B.x, B.y, P.x, P.y), aP = Math.atan2(P.y - B.y, P.x - B.x);
  const rate = B.phase2 ? 1.35 : 1;
  B.squadT -= dt;
  if (B.squadT <= 0 && mf) { B.squadT = B.phase2 ? 6 : 8; for (let k = 0; k < 2; k++) spawnUnit(false, Math.random() < 0.55 ? 'sci' : 'sol'); }
  const walkTo = (spd) => {
    if (d > 290) { B.x += Math.cos(aP) * spd * dt; B.y += Math.sin(aP) * spd * dt; }
    else if (d < 190) { B.x -= Math.cos(aP) * spd * 0.6 * dt; B.y -= Math.sin(aP) * spd * 0.6 * dt; }
    collideObs(B, B.r);
  };
  if (B.mode === 'intro') { B.y += 35 * dt; if (B.t <= 0) { B.mode = 'walk'; B.t = 1.5; } }
  else if (B.mode === 'walk') {
    walkTo(70 * rate); B.aim += angDiff(B.aim, aP) * Math.min(1, dt * 3);
    if (d < B.r + P.r + 70 && B.t < 1.2) { B.mode = 'stomp'; B.t = 0.75; addText(B.x, B.y - B.r - 10, 'STOMP!', '#ff6b6b'); }
    else if (B.t <= 0) { B.step++; if (B.step % 2) { B.mode = 'gatling'; B.t = 3.0; } else { B.mode = 'missiles'; B.t = 2.2; B.missiles = B.phase2 ? 7 : 5; B.mT = 0; } }
  } else if (B.mode === 'gatling') {
    B.aim += angDiff(B.aim, aP) * Math.min(1, dt * (B.phase2 ? 1.5 : 1.1));
    B.fireT -= dt;
    if (B.fireT <= 0 && B.t < 2.7) { B.fireT = 0.075 / rate; if (mf) { fire(B.x + Math.cos(B.aim) * 60, B.y + Math.sin(B.aim) * 60, B.aim, 360, 5 * diff, 0.13, 'g'); sfx.gun(); } }
    walkTo(25);
    if (B.t <= 0) { B.mode = 'vent'; B.t = 2.4; addText(B.x, B.y - B.r - 12, 'OVERHEATED: HIT THE CORE!', '#ffb347', true); }
  } else if (B.mode === 'missiles') {
    B.mT -= dt;
    if (B.mT <= 0 && B.missiles > 0) { B.missiles--; B.mT = 0.28 / rate; if (mf) { const r = B.missiles === 0 ? 0 : rand(30, 150), a = rand(0, TAU); strike(P.x + Math.cos(a) * r + P.vx * 0.4, P.y + Math.sin(a) * r + P.vy * 0.4, 70, 18 * diff, 1.1); } }
    walkTo(40);
    if (B.t <= 0) { B.mode = 'walk'; B.t = 1.6; }
  } else if (B.mode === 'vent') {
    if (Math.random() < dt * 20) parts.push({ x: B.x + rand(-20, 20), y: B.y + rand(-20, 20), vx: rand(-30, 30), vy: rand(-60, -20), life: 0.8, t: 0, col: 'rgba(220,220,220,0.6)', size: rand(6, 12) });
    if (B.t <= 0) { B.mode = 'walk'; B.t = 1.4; }
  } else if (B.mode === 'stomp') {
    if (B.t <= 0) {
      sfx.stomp(); shake = Math.max(shake, 12);
      ring(B.x, B.y, 190, 'rgba(255,220,120,', 0.4, 10); burst(B.x, B.y, '#c9b08a', 20, 240, 6, 0.6);
      if (mf && d < 190 + P.r * 0.5) { hurtPlayer(20 * diff); P.x += Math.cos(aP) * 90; P.y += Math.sin(aP) * 90; collideObs(P, P.r * 0.8); }
      B.mode = 'walk'; B.t = 1.6;
    }
  }
  B.face += angDiff(B.face, aP) * Math.min(1, dt * 1.5);
}

/* ---------------- drawing ---------------- */
function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function drawFloor() {
  const T = theme;
  const x0v = camX - W / 2 / zoom - 80, x1v = camX + W / 2 / zoom + 80, y0v = camY - H / 2 / zoom - 80, y1v = camY + H / 2 / zoom + 80;
  if (T.floorA) {
    ctx.fillStyle = T.floorA; ctx.fillRect(0, 0, AW, AH);
    const s = 64;
    const x0 = Math.max(0, Math.floor(x0v / s) * s), x1 = Math.min(AW, x1v), y0 = Math.max(0, Math.floor(y0v / s) * s), y1 = Math.min(AH, y1v);
    ctx.fillStyle = T.floorB;
    for (let x = x0; x < x1; x += s) for (let y = y0; y < y1; y += s) if (((x / s) + (y / s)) % 2 === 0) ctx.fillRect(x, y, s, s);
    ctx.strokeStyle = T.grout; ctx.lineWidth = 2; ctx.beginPath();
    for (let x = x0; x <= x1; x += s) { ctx.moveTo(x, y0); ctx.lineTo(x, y1); }
    for (let y = y0; y <= y1; y += s) { ctx.moveTo(x0, y); ctx.lineTo(x1, y); }
    ctx.stroke();
    ctx.save(); ctx.lineWidth = 14; ctx.setLineDash([24, 24]); ctx.strokeStyle = '#e8c21a'; ctx.strokeRect(50, 50, AW - 100, AH - 100); ctx.strokeStyle = '#222'; ctx.lineDashOffset = 24; ctx.strokeRect(50, 50, AW - 100, AH - 100); ctx.restore();
  } else {
    ctx.fillStyle = T.asphalt; ctx.fillRect(0, 0, AW, AH);
    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    for (let i = 0; i < 50; i++) { const x = (i * 397) % AW, y = (i * 613) % AH; ctx.fillRect(x, y, 90 + (i % 5) * 20, 3); }
    ctx.save(); ctx.strokeStyle = '#d8c25a'; ctx.lineWidth = 6; ctx.setLineDash([46, 34]);
    ctx.beginPath(); ctx.moveTo(0, AH / 2); ctx.lineTo(AW, AH / 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(240,240,240,0.5)'; ctx.setLineDash([]); ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(0, AH * 0.2); ctx.lineTo(AW, AH * 0.2); ctx.moveTo(0, AH * 0.8); ctx.lineTo(AW, AH * 0.8); ctx.stroke();
    if (def.theme !== 'street') { ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(AW / 2, AH / 2, 150, 0, TAU); ctx.stroke(); ctx.font = `900 120px ${FONT}`; ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('H', AW / 2, AH / 2 + 6); }
    ctx.restore();
  }
  for (const d of decals) {
    if (d.x < x0v || d.x > x1v || d.y < y0v || d.y > y1v) continue;
    ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.a);
    if (d.kind === 'goo') { ctx.fillStyle = 'rgba(120,200,60,0.28)'; ctx.beginPath(); ctx.ellipse(0, 0, d.r, d.r * 0.6, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(d.r * 0.9, 4, d.r * 0.25, 0, TAU); ctx.fill(); }
    else if (d.kind === 'paper') { ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(-8, -11, 16, 22); ctx.fillStyle = 'rgba(0,0,0,0.25)'; for (let k = 0; k < 4; k++) ctx.fillRect(-5, -7 + k * 4, 10, 1.5); }
    else if (d.kind === 'glass') { ctx.strokeStyle = 'rgba(200,240,255,0.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); for (let k = 0; k < 5; k++) { ctx.moveTo(0, 0); ctx.lineTo(Math.cos(k * 1.3) * d.r * 0.6, Math.sin(k * 1.3) * d.r * 0.6); } ctx.stroke(); }
    else if (d.kind === 'vent') { ctx.fillStyle = '#7d8a90'; ctx.fillRect(-18, -12, 36, 24); ctx.fillStyle = '#3c464b'; for (let k = 0; k < 5; k++) ctx.fillRect(-15, -9 + k * 4.4, 30, 2); }
    else if (d.kind === 'crack') { ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-d.r, 0); ctx.lineTo(-d.r * 0.3, 5); ctx.lineTo(d.r * 0.2, -4); ctx.lineTo(d.r, 3); ctx.stroke(); }
    else if (d.kind === 'debris') { ctx.fillStyle = '#6b6560'; ctx.fillRect(-6, -4, 12, 8); ctx.fillRect(8, 5, 6, 5); }
    else if (d.kind === 'paint') { ctx.fillStyle = 'rgba(240,240,240,0.35)'; ctx.fillRect(-d.r, -4, d.r * 2, 8); }
    else if (d.kind === 'scorch') { ctx.fillStyle = 'rgba(0,0,0,0.38)'; ctx.beginPath(); ctx.arc(0, 0, d.r, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.arc(0, 0, d.r * 0.55, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
}
function drawWalls() {
  ctx.fillStyle = theme.wall;
  ctx.fillRect(-900, -900, AW + 1800, 930); ctx.fillRect(-900, AH - 30, AW + 1800, 930);
  ctx.fillRect(-900, 0, 930, AH); ctx.fillRect(AW - 30, 0, 930, AH);
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(30, 30, AW - 60, 10); ctx.fillRect(30, 30, 10, AH - 60);
  if (!theme.floorA) {
    ctx.strokeStyle = 'rgba(210,210,210,0.35)'; ctx.lineWidth = 2; ctx.beginPath();
    for (let x = 0; x < AW; x += 18) { ctx.moveTo(x, 0); ctx.lineTo(x + 18, 30); ctx.moveTo(x + 18, 0); ctx.lineTo(x, 30); ctx.moveTo(x, AH - 30); ctx.lineTo(x + 18, AH); ctx.moveTo(x + 18, AH - 30); ctx.lineTo(x, AH); }
    ctx.stroke();
  }
}
function drawObstacle(o) {
  ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(o.x + 6, o.y + 8, o.w, o.h);
  const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
  if (o.k === 'bench') {
    ctx.fillStyle = '#e9eef0'; ctx.fillRect(o.x, o.y, o.w, o.h); ctx.strokeStyle = '#8a979c'; ctx.lineWidth = 3; ctx.strokeRect(o.x, o.y, o.w, o.h);
    ctx.fillStyle = '#7fb6d6'; ctx.fillRect(o.x + 8, o.y + 8, 16, 12); ctx.fillStyle = '#c8e86a'; ctx.beginPath(); ctx.arc(o.x + o.w - 16, o.y + o.h - 14, 6, 0, TAU); ctx.fill();
    ctx.fillStyle = '#555'; ctx.fillRect(cx - 8, cy - 4, 16, 8);
  } else if (o.k === 'tank') {
    ctx.fillStyle = '#56636a'; ctx.fillRect(o.x, o.y, o.w, o.h);
    const g = ctx.createRadialGradient(cx - 8, cy - 8, 4, cx, cy, 30); g.addColorStop(0, 'rgba(210,255,200,0.9)'); g.addColorStop(0.6, 'rgba(100,220,120,0.55)'); g.addColorStop(1, 'rgba(30,90,60,0.8)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 29, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#2b3337'; ctx.lineWidth = 4; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx - 12, cy - 6); ctx.lineTo(cx + 4, cy + 3); ctx.lineTo(cx - 2, cy + 14); ctx.moveTo(cx + 4, cy + 3); ctx.lineTo(cx + 16, cy - 2); ctx.stroke();
  } else if (o.k === 'cab') {
    ctx.fillStyle = '#8c969b'; ctx.fillRect(o.x, o.y, o.w, o.h); ctx.strokeStyle = '#4c565b'; ctx.lineWidth = 3; ctx.strokeRect(o.x, o.y, o.w, o.h);
    ctx.fillStyle = '#1c2a2f'; ctx.fillRect(o.x + 8, o.y + 10, o.w - 16, o.h - 20);
    for (let i = 0; i < 4; i++) { ctx.fillStyle = (Math.floor(clock * 3 + i + o.x) % 3) ? '#3cff7a' : '#ff3c3c'; ctx.fillRect(o.x + 12 + (i % 2) * 12, o.y + 16 + Math.floor(i / 2) * 14, 6, 4); }
  } else if (o.k === 'car') {
    const hz = o.w > o.h;
    ctx.fillStyle = o.col; roundRect(o.x, o.y, o.w, o.h, 12); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(150,200,230,0.65)';
    if (hz) { ctx.fillRect(o.x + o.w * 0.22, o.y + 7, o.w * 0.14, o.h - 14); ctx.fillRect(o.x + o.w * 0.62, o.y + 7, o.w * 0.1, o.h - 14); }
    else { ctx.fillRect(o.x + 7, o.y + o.h * 0.22, o.w - 14, o.h * 0.14); ctx.fillRect(o.x + 7, o.y + o.h * 0.62, o.w - 14, o.h * 0.1); }
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; if (hz) ctx.fillRect(o.x + o.w * 0.36, o.y + 7, o.w * 0.26, o.h - 14); else ctx.fillRect(o.x + 7, o.y + o.h * 0.36, o.w - 14, o.h * 0.26);
  } else if (o.k === 'sand') {
    const hz = o.w > o.h, n = Math.max(2, Math.round((hz ? o.w : o.h) / 28));
    for (let i = 0; i < n; i++) {
      const x = hz ? o.x + (i + 0.5) * o.w / n : cx, y = hz ? cy : o.y + (i + 0.5) * o.h / n;
      ctx.fillStyle = i % 2 ? '#a89466' : '#b8a474'; ctx.beginPath(); ctx.ellipse(x, y, hz ? o.w / n / 1.8 : o.w / 2, hz ? o.h / 2 : o.h / n / 1.8, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#7d6c45'; ctx.lineWidth = 2; ctx.stroke();
    }
  } else if (o.k === 'barrier') {
    ctx.fillStyle = '#b9b6ae'; ctx.fillRect(o.x, o.y, o.w, o.h);
    ctx.save(); ctx.beginPath(); ctx.rect(o.x, o.y, o.w, o.h); ctx.clip(); ctx.strokeStyle = '#d33'; ctx.lineWidth = 7;
    const L = Math.max(o.w, o.h);
    for (let k = -L; k < L * 2; k += 22) { ctx.beginPath(); ctx.moveTo(o.x + k, o.y); ctx.lineTo(o.x + k + L, o.y + L); ctx.stroke(); }
    ctx.restore(); ctx.strokeStyle = '#7b786f'; ctx.lineWidth = 3; ctx.strokeRect(o.x, o.y, o.w, o.h);
  } else {
    ctx.fillStyle = '#6b5a3a'; ctx.fillRect(o.x, o.y, o.w, o.h); ctx.strokeStyle = '#3e331f'; ctx.lineWidth = 4; ctx.strokeRect(o.x + 2, o.y + 2, o.w - 4, o.h - 4);
    ctx.beginPath(); ctx.moveTo(o.x + 4, o.y + 4); ctx.lineTo(o.x + o.w - 4, o.y + o.h - 4); ctx.moveTo(o.x + o.w - 4, o.y + 4); ctx.lineTo(o.x + 4, o.y + o.h - 4); ctx.stroke();
  }
}
function drawUnit(u, now) {
  let sc = 1;
  if (u.absT >= 0) sc = Math.max(0.05, 1 - u.absT / 0.38);
  const down = u.st === 'down';
  ctx.save(); ctx.translate(u.x, u.y);
  if (u.absT < 0 && absorbable(u) && state === 'play' && u.type !== 'sci') {
    ctx.strokeStyle = `rgba(160,255,80,${0.5 + 0.35 * Math.sin(now * 8)})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, u.r + 8 + Math.sin(now * 8) * 1.5, 0, TAU); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(2, 4, u.r * sc, u.r * 0.8 * sc, 0, 0, TAU); ctx.fill();
  ctx.save();
  ctx.rotate(u.face + (down ? 1.2 : 0)); ctx.scale(sc, sc);
  if (down) ctx.scale(1.25, 0.9);
  const r = u.r;
  const coat = u.type === 'sci' ? '#f4f6f8' : u.type === 'sol' ? '#5b6b3a' : u.type === 'shd' ? '#2d3a55' : '#8a8f88';
  const dark = u.type === 'sci' ? '#b8c2c8' : u.type === 'sol' ? '#3b4625' : u.type === 'shd' ? '#1a2338' : '#5c615a';
  const fleeing = u.type === 'sci' && u.st === 'flee' && !down;
  ctx.lineWidth = 2; ctx.strokeStyle = dark;
  for (const s of [-1, 1]) {
    ctx.fillStyle = coat;
    if (fleeing) { const w = Math.sin(u.flail + (s > 0 ? 0 : 2)) * 4; ctx.beginPath(); ctx.ellipse(r * 0.55 + w, s * r * 0.85, 7, 4, 0.3 * s, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = u.skin; ctx.beginPath(); ctx.arc(r * 0.98 + w, s * r * 0.98, 3.4, 0, TAU); ctx.fill(); }
    else { ctx.beginPath(); ctx.ellipse(r * 0.35, s * r * 0.75, 7, 4.5, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
  }
  if (!down) {
    if (u.type === 'sol') { ctx.fillStyle = '#1e1e1e'; ctx.fillRect(r * 0.2, -2.5, r * 1.6, 5); ctx.fillRect(r * 0.5, 2, 5, 5); }
    if (u.type === 'flm') { ctx.fillStyle = '#333'; ctx.fillRect(r * 0.2, -3, r * 1.4, 6); ctx.fillStyle = '#ff7a1a'; ctx.fillRect(r * 1.5, -2, 4, 4); }
    if (u.type === 'shd') { ctx.fillStyle = '#222'; ctx.fillRect(r * 0.3, 3, r * 0.9, 4); }
  }
  ctx.fillStyle = coat; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.72, r, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = dark; ctx.lineWidth = 2; ctx.stroke();
  if (u.type === 'flm') { ctx.fillStyle = '#e8641a'; roundRect(-r * 1.05, -r * 0.62, r * 0.6, r * 0.55, 4); ctx.fill(); roundRect(-r * 1.05, r * 0.07, r * 0.6, r * 0.55, 4); ctx.fill(); }
  if (u.type === 'sci') { ctx.fillStyle = '#7fb6d6'; ctx.fillRect(-2, -r * 0.62, 4, 5); }
  if (u.type === 'sol') { ctx.fillStyle = '#4a5630'; ctx.fillRect(-r * 0.55, -r * 0.65, r * 0.4, r * 1.3); }
  if (u.type === 'sci') {
    ctx.fillStyle = u.skin; ctx.beginPath(); ctx.arc(0, 0, r * 0.52, 0, TAU); ctx.fill();
    ctx.fillStyle = u.hair; ctx.beginPath(); ctx.arc(-r * 0.1, 0, r * 0.5, Math.PI * 0.55, Math.PI * 1.45); ctx.fill();
    ctx.strokeStyle = '#222'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(r * 0.36, -r * 0.3); ctx.lineTo(r * 0.36, r * 0.3); ctx.stroke();
  } else if (u.type === 'sol') {
    ctx.fillStyle = '#4e5c31'; ctx.beginPath(); ctx.arc(0, 0, r * 0.58, 0, TAU); ctx.fill(); ctx.strokeStyle = '#2f381c'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.beginPath(); ctx.arc(-r * 0.1, -r * 0.15, r * 0.22, 0, TAU); ctx.fill();
  } else if (u.type === 'shd') {
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(0, 0, r * 0.52, 0, TAU); ctx.fill(); ctx.fillStyle = '#7fb6d6'; ctx.fillRect(r * 0.18, -r * 0.3, r * 0.3, r * 0.6);
  } else {
    ctx.fillStyle = '#4a4f48'; ctx.beginPath(); ctx.arc(0, 0, r * 0.52, 0, TAU); ctx.fill();
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(r * 0.42, 0, r * 0.2, 0, TAU); ctx.fill(); ctx.fillStyle = '#9fd0ff'; ctx.fillRect(r * 0.1, -r * 0.35, r * 0.16, r * 0.7);
  }
  if (u.type === 'shd' && !down) {
    ctx.fillStyle = u.daze > 0 ? 'rgba(160,190,230,0.4)' : 'rgba(170,205,245,0.72)'; ctx.strokeStyle = '#e8f2ff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(-r * 0.4, 0, r * 2.0, -0.62, 0.62); ctx.arc(-r * 0.4, 0, r * 1.55, 0.62, -0.62, true); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
  // aim laser (telegraph)
  if (u.type === 'sol' && u.aimT > 0 && !down) {
    ctx.strokeStyle = `rgba(255,40,40,${0.35 + 0.4 * (1 - u.aimT / 0.5)})`; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(Math.cos(u.face) * 18, Math.sin(u.face) * 18); ctx.lineTo(Math.cos(u.face) * 420, Math.sin(u.face) * 420); ctx.stroke();
  }
  if ((down || u.daze > 0) && u.absT < 0) {
    for (let k = 0; k < 3; k++) { const a = now * 4 + k * TAU / 3; ctx.fillStyle = '#ffe14d'; drawStar(Math.cos(a) * 12, -14 + Math.sin(a) * 5, 3.2); }
  }
  if (u.type === 'sci' && fleeing && Math.sin(u.t * 3 + u.flail * 0.01) > 0.6 && u.absT < 0) { ctx.fillStyle = '#ffffff'; ctx.font = `900 14px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('!', 0, -18); }
  ctx.restore();
}
function drawStar(x, y, r) { ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); }

function tentaclePath(x0, y0, a, len, w0, now, seed, wig) {
  const N = 9, pts = [];
  for (let k = 0; k <= N; k++) {
    const f = k / N, d = len * f;
    const off = Math.sin(now * 5 + seed * 2 + k * 0.8) * f * wig;
    pts.push([x0 + Math.cos(a) * d - Math.sin(a) * off, y0 + Math.sin(a) * d + Math.cos(a) * off]);
  }
  for (let pass = 0; pass < 2; pass++) {
    ctx.strokeStyle = pass ? '#b04f8a' : '#3a0b2e';
    for (let k = 0; k < N; k++) {
      ctx.lineWidth = Math.max(1.5, w0 * (1 - k / N) + (pass ? 0 : 3));
      ctx.beginPath(); ctx.moveTo(pts[k][0], pts[k][1]); ctx.lineTo(pts[k + 1][0], pts[k + 1][1]); ctx.stroke();
    }
  }
  ctx.fillStyle = 'rgba(255,200,225,0.75)';
  for (let k = 2; k < N; k += 2) { ctx.beginPath(); ctx.arc(pts[k][0], pts[k][1], Math.max(1, w0 * (1 - k / N) * 0.22), 0, TAU); ctx.fill(); }
  return pts[N];
}
function drawPlayer(now) {
  const r = P.r * (1 + P.gulp * 0.16 * Math.abs(Math.sin(P.gulp * 9)));
  ctx.save(); ctx.translate(P.x, P.y);
  ctx.lineCap = 'round';
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(5, 9, r * 1.15, r * 0.95, 0, 0, TAU); ctx.fill();
  if (P.inv > 0 && state === 'play' && Math.floor(now * 14) % 2) ctx.globalAlpha = 0.6;
  // absorbed limbs (behind)
  for (const L of P.limbs) {
    const a = L.a + Math.sin(now * 1.3 + L.ph) * 0.15;
    const len = r * 0.55 * L.len;
    const bx = Math.cos(a) * r * 0.8, by = Math.sin(a) * r * 0.8;
    const ex = bx + Math.cos(a + Math.sin(now * 3 + L.ph) * 0.25) * len, ey = by + Math.sin(a + Math.sin(now * 3 + L.ph) * 0.25) * len;
    ctx.strokeStyle = L.kind === 'sci' ? '#d9dee2' : L.kind === 'sol' ? '#56653a' : L.kind === 'shd' ? '#2d3a55' : '#7d827b';
    ctx.lineWidth = Math.max(4, r * 0.2); ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.fillStyle = '#c48a9e'; ctx.beginPath(); ctx.arc(ex, ey, Math.max(2.5, r * 0.1), 0, TAU); ctx.fill();
    ctx.strokeStyle = '#a06a80'; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let f = -1; f <= 1; f++) { const fa = a + f * 0.5 + Math.sin(now * 6 + L.ph) * 0.2; ctx.moveTo(ex, ey); ctx.lineTo(ex + Math.cos(fa) * r * 0.14, ey + Math.sin(fa) * r * 0.14); }
    ctx.stroke();
  }
  // tentacles
  const tn = tentCount(), arc = P.st.arc / 2, lashing = P.lashT > 0;
  const prog = lashing ? 1 - P.lashT / 0.24 : 0;
  for (let i = 0; i < tn; i++) {
    let a = i / tn * TAU + Math.sin(now * 0.7 + i) * 0.22 + now * 0.15;
    let len = r * (0.95 + 0.35 * Math.sin(now * 2 + i * 1.7)) + 12, w = r * 0.3, wig = r * 0.35;
    if (lashing && Math.abs(angDiff(P.lashDir, a)) < arc + 0.3) {
      const off = angDiff(P.lashDir, a);
      a = P.lashDir + off * 0.6 + (prog - 0.5) * arc * 1.4;
      len = lashRange() * Math.sin(Math.min(1, prog * 1.3) * Math.PI * 0.5 + 0.35);
      wig = r * 0.15; w = r * 0.34;
    }
    tentaclePath(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6, a, len, w, now, i, wig);
  }
  // lash sweep arc
  if (lashing) {
    ctx.strokeStyle = `rgba(230,140,255,${0.45 * (1 - prog)})`; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.arc(0, 0, lashRange() * 0.9, P.lashDir - arc, P.lashDir + arc); ctx.stroke();
  }
  // body blob
  const N = 30;
  ctx.beginPath();
  for (let k = 0; k <= N; k++) {
    const a = k / N * TAU;
    const rr = r * (1 + 0.07 * Math.sin(now * 3 + k * 1.3) + 0.06 * Math.sin(now * 5.3 + k * 2.7) + 0.05 * Math.sin(k * 3.1 + P.mass * 0.7));
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
    if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r * 1.1);
  g.addColorStop(0, '#e889b5'); g.addColorStop(0.45, '#a3346e'); g.addColorStop(0.85, '#5e1544'); g.addColorStop(1, '#3a0b2e');
  ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#24061c'; ctx.lineWidth = 3; ctx.stroke();
  // veins
  ctx.strokeStyle = 'rgba(90,10,40,0.65)'; ctx.lineWidth = 1.8;
  for (let v = 0; v < 6; v++) {
    const a = v * 1.07 + 0.4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.2, Math.sin(a) * r * 0.2);
    ctx.quadraticCurveTo(Math.cos(a + 0.4) * r * 0.55, Math.sin(a + 0.4) * r * 0.55, Math.cos(a + 0.15) * r * 0.92, Math.sin(a + 0.15) * r * 0.92); ctx.stroke();
  }
  // pustules
  const pc = 3 + Math.min(10, Math.floor(P.mass / 3));
  for (let k = 0; k < pc; k++) {
    const a = k * 2.4 + 0.3, d = r * (0.35 + (k % 3) * 0.17), pr = r * (0.07 + (k % 2) * 0.04) * (1 + 0.15 * Math.sin(now * 4 + k));
    ctx.fillStyle = '#c95a92'; ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d, pr, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,230,240,0.6)'; ctx.beginPath(); ctx.arc(Math.cos(a) * d - pr * 0.3, Math.sin(a) * d - pr * 0.3, pr * 0.35, 0, TAU); ctx.fill();
  }
  // distorted head lump (toward facing)
  const hf = P.face, hx = Math.cos(hf) * r * 0.42, hy = Math.sin(hf) * r * 0.42, hr = r * 0.52;
  ctx.fillStyle = '#b4467e'; ctx.beginPath(); ctx.ellipse(hx, hy, hr * 1.05, hr * 0.85, hf + 0.4, 0, TAU); ctx.fill(); ctx.strokeStyle = '#4a0f35'; ctx.lineWidth = 2; ctx.stroke();
  // jagged mouth
  const mx = hx + Math.cos(hf) * hr * 0.55, my = hy + Math.sin(hf) * hr * 0.55, pa = hf + Math.PI / 2;
  ctx.fillStyle = '#2a0418'; ctx.beginPath(); ctx.ellipse(mx, my, hr * 0.5, hr * 0.22 + (P.roarT > 0 ? hr * 0.25 : 0), pa, 0, TAU); ctx.fill();
  ctx.fillStyle = '#f2e6c8';
  for (let t = -2; t <= 2; t++) { const tx = mx + Math.cos(pa) * t * hr * 0.18, ty = my + Math.sin(pa) * t * hr * 0.18; ctx.beginPath(); ctx.moveTo(tx - Math.cos(pa) * 2, ty - Math.sin(pa) * 2); ctx.lineTo(tx + Math.cos(pa) * 2, ty + Math.sin(pa) * 2); ctx.lineTo(tx + Math.cos(hf) * 4, ty + Math.sin(hf) * 4); ctx.fill(); }
  // huge bloodshot eye on the side of the head
  const ea = hf - 1.25, er = r * 0.36 + Math.min(P.mass, 50) * 0.12;
  const ex = hx + Math.cos(ea) * hr * 0.75, ey = hy + Math.sin(ea) * hr * 0.75;
  ctx.fillStyle = '#6b1236'; ctx.beginPath(); ctx.arc(ex, ey, er * 1.22, 0, TAU); ctx.fill();
  ctx.fillStyle = '#3a0820'; ctx.beginPath(); ctx.arc(ex, ey, er * 1.08, 0, TAU); ctx.fill();
  const sg = ctx.createRadialGradient(ex - er * 0.3, ey - er * 0.3, er * 0.1, ex, ey, er);
  sg.addColorStop(0, '#fffbe8'); sg.addColorStop(0.7, '#f3e2c4'); sg.addColorStop(1, '#e09090');
  ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(ex, ey, er, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(200,20,40,0.75)'; ctx.lineWidth = Math.max(1, er * 0.06);
  for (let v = 0; v < 9; v++) {
    const a = v * 0.7 + 0.2; ctx.beginPath(); ctx.moveTo(ex + Math.cos(a) * er, ey + Math.sin(a) * er);
    ctx.quadraticCurveTo(ex + Math.cos(a + 0.25) * er * 0.75, ey + Math.sin(a + 0.25) * er * 0.75, ex + Math.cos(a - 0.1) * er * 0.5, ey + Math.sin(a - 0.1) * er * 0.5); ctx.stroke();
  }
  const ix = ex + Math.cos(P.look) * er * 0.38, iy = ey + Math.sin(P.look) * er * 0.38;
  const ig = ctx.createRadialGradient(ix, iy, er * 0.05, ix, iy, er * 0.48);
  ig.addColorStop(0, '#ffd040'); ig.addColorStop(0.6, '#e07800'); ig.addColorStop(1, '#6a2600');
  ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(ix, iy, er * 0.48, 0, TAU); ctx.fill();
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(ix, iy, er * 0.12, er * 0.3, P.look, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(ix - er * 0.18, iy - er * 0.2, er * 0.1, 0, TAU); ctx.fill();
  if (P.blink > 0) { ctx.fillStyle = '#8a2458'; ctx.beginPath(); ctx.arc(ex, ey, er * 1.02, 0, TAU); ctx.fill(); ctx.strokeStyle = '#3a0820'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ex - er, ey); ctx.lineTo(ex + er, ey); ctx.stroke(); }
  if (P.hurt > 0) { ctx.globalAlpha = 0.5; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); }
  ctx.restore();
  // grab tendril
  const tg = P.tendril;
  if (tg) {
    const f = tg.t < tg.out ? tg.t / tg.out : Math.max(0, 1 - (tg.t - tg.out) / tg.back);
    const a = Math.atan2(tg.ty - P.y, tg.tx - P.x), L = dist(tg.tx, tg.ty, P.x, P.y) * f;
    ctx.save(); ctx.lineCap = 'round';
    const end = tentaclePath(P.x + Math.cos(a) * P.r * 0.7, P.y + Math.sin(a) * P.r * 0.7, a, Math.max(4, L - P.r * 0.5), P.r * 0.24, now * 3, 7, 6);
    ctx.fillStyle = '#e889b5'; ctx.beginPath(); ctx.arc(end[0], end[1], 5, 0, TAU); ctx.fill();
    ctx.restore();
  }
  // absorbing tendrils to victims
  for (const u of units) if (u.absT >= 0) { ctx.strokeStyle = 'rgba(200,90,180,0.8)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(u.x, u.y); ctx.stroke(); }
}
function drawDrone(dr, now) {
  ctx.save(); ctx.translate(dr.x, dr.y);
  ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(18, 30, 22, 14, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#222'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-16, -16); ctx.lineTo(16, 16); ctx.moveTo(16, -16); ctx.lineTo(-16, 16); ctx.stroke();
  for (const [x, y] of [[-16, -16], [16, -16], [-16, 16], [16, 16]]) { ctx.fillStyle = 'rgba(200,200,200,0.35)'; ctx.beginPath(); ctx.arc(x, y, 10, 0, TAU); ctx.fill(); ctx.strokeStyle = '#ccc'; ctx.lineWidth = 2; ctx.beginPath(); const a = now * 40; ctx.moveTo(x + Math.cos(a) * 10, y + Math.sin(a) * 10); ctx.lineTo(x - Math.cos(a) * 10, y - Math.sin(a) * 10); ctx.stroke(); }
  ctx.fillStyle = dr.hitT > 0 ? '#fff' : '#3b4048'; roundRect(-11, -9, 22, 18, 5); ctx.fill();
  ctx.fillStyle = Math.floor(now * 4) % 2 ? '#ff3030' : '#661010'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, TAU); ctx.fill();
  ctx.restore();
  // hp
  if (dr.hp < dr.maxHp) { ctx.fillStyle = '#300'; ctx.fillRect(dr.x - 16, dr.y - 30, 32, 4); ctx.fillStyle = '#ff6b6b'; ctx.fillRect(dr.x - 16, dr.y - 30, 32 * Math.max(0, dr.hp / dr.maxHp), 4); }
}
function drawBoss(now) {
  const B = boss; if (!B) return;
  ctx.save(); ctx.translate(B.x, B.y);
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(8, 14, B.r * 1.2, B.r, 0, 0, TAU); ctx.fill();
  ctx.rotate(B.face);
  const step = Math.sin(B.legT * 6) * 8;
  ctx.fillStyle = '#3c4148'; ctx.strokeStyle = '#1b1e22'; ctx.lineWidth = 3;
  for (const [lx, ly, s] of [[30, -48, 1], [30, 48, -1], [-30, -48, -1], [-30, 48, 1]]) { roundRect(lx - 14 + step * s, ly - 10, 28, 20, 5); ctx.fill(); ctx.stroke(); }
  ctx.fillStyle = B.hitT > 0 ? '#ddd' : '#5a616b'; roundRect(-48, -40, 96, 80, 14); ctx.fill(); ctx.stroke();
  ctx.save(); roundRect(-48, -40, 96, 80, 14); ctx.clip(); ctx.strokeStyle = '#e8c21a'; ctx.lineWidth = 6; for (let k = -60; k < 60; k += 16) { ctx.beginPath(); ctx.moveTo(-48, k); ctx.lineTo(-36, k + 12); ctx.stroke(); } ctx.restore();
  ctx.fillStyle = '#444b55'; roundRect(-26, -54, 40, 18, 4); ctx.fill(); ctx.stroke(); roundRect(-26, 36, 40, 18, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#222'; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(-18 + k * 12, -45, 3.5, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(-18 + k * 12, 45, 3.5, 0, TAU); ctx.fill(); }
  const vent = B.mode === 'vent';
  const cg = ctx.createRadialGradient(-6, 0, 2, -6, 0, 22);
  cg.addColorStop(0, vent ? '#fff7c2' : '#ffb0b0'); cg.addColorStop(0.5, vent ? '#ff9a1a' : '#a01818'); cg.addColorStop(1, vent ? 'rgba(255,90,0,0.2)' : '#401010');
  ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(-6, 0, vent ? 22 + Math.sin(now * 20) * 2 : 15, 0, TAU); ctx.fill();
  ctx.restore();
  // gatling turret
  ctx.save(); ctx.translate(B.x, B.y); ctx.rotate(B.aim);
  ctx.fillStyle = '#2b2f35'; ctx.fillRect(20, -13, 46, 26);
  ctx.fillStyle = '#16181b'; const spin = B.mode === 'gatling' ? now * 30 : 0;
  for (let k = 0; k < 3; k++) ctx.fillRect(60, -9 + k * 7 + Math.sin(spin + k) * 1.5, 30, 4);
  if (B.mode === 'gatling' && B.t < 2.7 && Math.floor(now * 30) % 2) { ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.arc(96, 0, 8, 0, TAU); ctx.fill(); }
  ctx.fillStyle = '#ff2020'; ctx.beginPath(); ctx.arc(30, 0, 5, 0, TAU); ctx.fill();
  ctx.restore();
  if (B.mode === 'stomp') { ctx.strokeStyle = `rgba(255,80,60,${0.4 + 0.4 * Math.sin(now * 30)})`; ctx.lineWidth = 4; ctx.setLineDash([10, 8]); ctx.beginPath(); ctx.arc(B.x, B.y, 190, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
}
function drawWorld(now) {
  drawFloor();
  for (const h of hazards) {
    const f = h.t / h.dur;
    ctx.fillStyle = `rgba(255,40,30,${0.12 + f * 0.2})`; ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, TAU); ctx.fill();
    ctx.strokeStyle = `rgba(255,60,40,${0.6 + 0.4 * Math.sin(now * 20)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(h.x, h.y, h.r * (1 - f), 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(h.x - 12, h.y); ctx.lineTo(h.x + 12, h.y); ctx.moveTo(h.x, h.y - 12); ctx.lineTo(h.x, h.y + 12); ctx.stroke();
  }
  for (const o of obstacles) drawObstacle(o);
  const sorted = units.slice().sort((a, b) => (a.st === 'down' ? 0 : 1) - (b.st === 'down' ? 0 : 1));
  for (const u of sorted) drawUnit(u, now);
  if (boss) drawBoss(now);
  if (P) drawPlayer(now);
  for (const b of bullets) {
    const a = Math.atan2(b.vy, b.vx);
    ctx.strokeStyle = b.kind === 'g' ? 'rgba(255,170,60,0.9)' : 'rgba(255,240,150,0.95)'; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(b.x - Math.cos(a) * 12, b.y - Math.sin(a) * 12); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x, b.y, 2.6, 0, TAU); ctx.fill();
  }
  for (const p of parts) {
    const f = p.t / p.life;
    if (p.ring) { ctx.strokeStyle = p.col + (1 - f) * 0.9 + ')'; ctx.lineWidth = p.w * (1 - f) + 1; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.3 + 0.7 * Math.sqrt(f)), 0, TAU); ctx.stroke(); continue; }
    ctx.globalAlpha = 1 - f; ctx.fillStyle = p.col;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (p.fire ? (0.6 + f) : (1 - f * 0.5)), 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const dr of drones) drawDrone(dr, now);
  drawWalls();
}
function drawLights(now) {
  const dk = theme.dark;
  if (dk > 0.15) {
    ctx.save();
    ctx.fillStyle = `rgba(5,5,25,${dk})`; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    const sx = (x) => (x - camX) * zoom + W / 2, sy = (y) => (y - camY) * zoom + H / 2;
    const glow = (x, y, r, c) => { const g = ctx.createRadialGradient(sx(x), sy(y), 0, sx(x), sy(y), r * zoom); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx(x), sy(y), r * zoom, 0, TAU); ctx.fill(); };
    glow(P.x, P.y, 230, 'rgba(120,60,110,0.35)');
    for (const dr of drones) { const lock = dr.spotT > 0.2; glow(dr.spX, dr.spY, 100, lock ? 'rgba(255,80,60,0.55)' : 'rgba(255,250,200,0.45)'); }
    for (const p of parts) if (p.fire) glow(p.x, p.y, 40, 'rgba(255,140,40,0.12)');
    ctx.restore();
  } else if (drones.length) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const dr of drones) { const x = (dr.spX - camX) * zoom + W / 2, y = (dr.spY - camY) * zoom + H / 2; const g = ctx.createRadialGradient(x, y, 0, x, y, 100 * zoom); g.addColorStop(0, dr.spotT > 0.2 ? 'rgba(255,60,40,0.4)' : 'rgba(255,250,200,0.3)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 100 * zoom, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  if (def.theme !== 'street' && state === 'play') { const a = 0.08 + 0.08 * Math.sin(now * 3); ctx.fillStyle = `rgba(255,0,30,${a})`; ctx.fillRect(0, 0, W, H); }
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(20,0,10,${P && P.hp / P.maxHp < 0.3 && state === 'play' ? 0.75 + 0.15 * Math.sin(now * 8) : 0.55})`);
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  if (flashT > 0) { ctx.fillStyle = `rgba(200,255,150,${flashT * 1.6})`; ctx.fillRect(0, 0, W, H); }
}
function hudText(txt, x, y, size, col, align) {
  ctx.font = `900 ${size}px ${FONT}`; ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(3, size / 5); ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.strokeText(txt, x, y);
  ctx.fillStyle = col; ctx.fillText(txt, x, y);
}
function bar(x, y, w, h, f, c1, c2, label) {
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; roundRect(x - 2, y - 2, w + 4, h + 4, 6); ctx.fill();
  if (f > 0) { const g = ctx.createLinearGradient(x, y, x, y + h); g.addColorStop(0, c1); g.addColorStop(1, c2); ctx.fillStyle = g; roundRect(x, y, Math.max(6, w * clamp(f, 0, 1)), h, 4); ctx.fill(); }
  if (label) { ctx.font = `900 ${Math.round(h * 0.78)}px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.fillText(label, x + 6, y + h / 2 + 1); }
}
function drawHUD(now) {
  const sm = W < 520;
  const top = 10 + (sm ? 4 : 0), bw = sm ? Math.min(170, W * 0.44) : 230;
  bar(12, top, bw, sm ? 15 : 18, P.hp / P.maxHp, '#ff7aa8', '#b0124a', `FLESH ${Math.ceil(P.hp)}`);
  const full = P.meter >= 100;
  bar(12, top + (sm ? 22 : 26), bw, sm ? 13 : 15, P.meter / 100, full ? (Math.floor(now * 6) % 2 ? '#eaffa0' : '#b6ff5c') : '#b6ff5c', '#3f8a10', full ? (touchMode ? 'ROAR READY!' : 'ROAR READY! (L)') : 'MUTAGEN');
  const y3 = top + (sm ? 46 : 56);
  if (def.boss) hudText(boss ? 'DESTROY THE WARDEN' : 'WARDEN DOWN', 12, y3, sm ? 12 : 15, '#ffb3b3');
  else hudText(`ABSORBED ${Math.min(levelAbsorbed, quota())}/${quota()}`, 12, y3, sm ? 13 : 16, '#e6b3ff');
  const rx = W - 104;
  hudText(String(score), sm ? W - 12 : rx, sm ? top + 54 : top + 20, sm ? 18 : 22, '#ffffff', 'right');
  hudText(`LV ${level}  ·  BEST ${Math.max(best, score)}`, sm ? W - 12 : rx, sm ? top + 76 : top + 44, sm ? 10 : 12, '#ffd34d', 'right');
  if (comboT > 0 && combo > 0) hudText(`COMBO x${combo + 1}`, W / 2, sm ? top + 100 : top + 70, sm ? 16 : 20, '#ffd34d', 'center');
  if (boss) {
    const w = Math.min(W - 40, 420), x = (W - w) / 2, y = sm ? H - 210 : H - 46;
    bar(x, y, w, 14, boss.hp / boss.maxHp, boss.mode === 'vent' ? '#ffd040' : '#ff6b6b', '#8a1010', boss.mode === 'vent' ? 'WARDEN MK-II  (CORE EXPOSED)' : 'WARDEN MK-II');
  }
  if (banner) {
    const t = banner.t, a = t < 0.3 ? t / 0.3 : t > 2.3 ? Math.max(0, (2.8 - t) / 0.5) : 1;
    ctx.globalAlpha = a;
    const cy = H * 0.3;
    hudText(banner.a, W / 2, cy - 30, sm ? 16 : 20, '#ff9fc0', 'center');
    hudText(banner.b, W / 2, cy, sm ? 26 : 38, '#ffffff', 'center');
    hudText(banner.c, W / 2, cy + 32, sm ? 14 : 18, '#b6ff5c', 'center');
    ctx.globalAlpha = 1;
  }
  if (!touchMode && state === 'play' && level === 1 && clock - levelStartClock < 9) hudText('J/SPACE lash  ·  K grab  ·  L roar', W / 2, H - 28, 14, 'rgba(255,255,255,0.8)', 'center');
  if (touchMode && joy.active) {
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(joy.ox, joy.oy, 58, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(255,150,200,0.45)'; ctx.beginPath(); ctx.arc(joy.ox + joy.kx, joy.oy + joy.ky, 26, 0, TAU); ctx.fill();
  } else if (touchMode && state === 'play' && clock - levelStartClock < 5) hudText('drag to move', W * 0.28, H - 60, 14, 'rgba(255,255,255,0.75)', 'center');
}
let levelStartClock = 0;
function draw() {
  const now = clock;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#14050f'; ctx.fillRect(0, 0, W, H);
  if (!P) return;
  if (state === 'play' || state === 'title') {
    const tx = clamp(P.x, W / 2 / zoom - 120, AW - W / 2 / zoom + 120), ty = clamp(P.y, H / 2 / zoom - 120, AH - H / 2 / zoom + 120);
    const fx = AW < W / zoom - 240 ? AW / 2 : tx, fy = AH < H / zoom - 240 ? AH / 2 : ty;
    camX += (fx - camX) * 0.12; camY += (fy - camY) * 0.12;
  }
  const sx = shake > 0 ? rand(-shake, shake) : 0, sy = shake > 0 ? rand(-shake, shake) : 0;
  ctx.setTransform(DPR * zoom, 0, 0, DPR * zoom, DPR * (W / 2 - camX * zoom + sx), DPR * (H / 2 - camY * zoom + sy));
  drawWorld(now);
  for (const t of texts) {
    const f = t.t / t.life; ctx.globalAlpha = f > 0.7 ? (1 - f) / 0.3 : 1;
    ctx.font = `900 ${t.big ? 22 : 14}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.strokeText(t.txt, t.x, t.y); ctx.fillStyle = t.col; ctx.fillText(t.txt, t.x, t.y);
  }
  ctx.globalAlpha = 1;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  drawLights(now);
  if (state === 'play' || state === 'pause') drawHUD(now);
}

/* ---------------- input ---------------- */
const KM = { KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right' };
window.addEventListener('keydown', (e) => {
  initAudio();
  const k = KM[e.code];
  if (k) { keys[k] = 1; e.preventDefault(); if (touchMode && !e.repeat) setTouchMode(false); return; }
  if (e.code === 'KeyJ' || e.code === 'Space') { e.preventDefault(); if (state === 'play') { keys.atk = 1; doLash(); return; } }
  if (e.code === 'KeyK') { e.preventDefault(); if (state === 'play') doGrab(); return; }
  if (e.code === 'KeyL') { e.preventDefault(); if (state === 'play') doSpecial(); return; }
  if (e.code === 'KeyP' || e.code === 'Escape') { e.preventDefault(); if (state === 'play') setPaused(true); else if (state === 'pause') setPaused(false); return; }
  if (e.code === 'KeyM') { toggleMute(); return; }
  if (state === 'evolve' && /^Digit[123]$/.test(e.code)) { chooseEvo(+e.code.slice(5) - 1); return; }
  if ((e.code === 'Enter' || e.code === 'Space') && state !== 'play' && state !== 'evolve' && !e.repeat) {
    const ov = document.querySelector('.overlay.show');
    if (ov) { const b = ov.querySelector('.big'); if (b) { e.preventDefault(); b.click(); } }
  }
});
window.addEventListener('keyup', (e) => { const k = KM[e.code]; if (k) { keys[k] = 0; e.preventDefault(); } if (e.code === 'KeyJ' || e.code === 'Space') keys.atk = 0; });
function clearInput() { for (const k in keys) keys[k] = 0; joy.active = false; joy.dx = joy.dy = 0; atkHeld = false; }
window.addEventListener('blur', () => { clearInput(); setPaused(true); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { clearInput(); setPaused(true); } });
function setTouchMode(on) {
  if (touchMode === on) return;
  touchMode = on;
  $('hMove').textContent = on ? 'drag anywhere' : 'WASD / arrows';
  $('hAtk').textContent = on ? 'LASH button (hold)' : 'J or SPACE (hold)';
  $('hGrab').textContent = on ? 'GRAB button' : 'K';
  $('hSp').textContent = on ? 'ROAR button (MUTAGEN full)' : 'L (when MUTAGEN is full)';
  updatePad();
}
cvs.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'touch' || e.pointerType === 'pen') setTouchMode(true);
  initAudio();
  if (state !== 'play' || joy.active) return;
  joy.active = true; joy.id = e.pointerId; joy.ox = e.clientX; joy.oy = e.clientY; joy.dx = joy.dy = joy.kx = joy.ky = 0;
  try { cvs.setPointerCapture(e.pointerId); } catch (err) {}
  e.preventDefault();
});
cvs.addEventListener('pointermove', (e) => {
  if (!joy.active || e.pointerId !== joy.id) return;
  let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy;
  const m = Math.hypot(dx, dy), R = 58;
  if (m > R) { joy.ox += dx / m * (m - R); joy.oy += dy / m * (m - R); dx = dx / m * R; dy = dy / m * R; }
  joy.kx = dx; joy.ky = dy; joy.dx = dx / R; joy.dy = dy / R;
  e.preventDefault();
});
const endJoy = (e) => { if (joy.active && e.pointerId === joy.id) { joy.active = false; joy.dx = joy.dy = joy.kx = joy.ky = 0; } };
cvs.addEventListener('pointerup', endJoy);
cvs.addEventListener('pointercancel', endJoy);
cvs.addEventListener('lostpointercapture', endJoy);
document.addEventListener('touchmove', (e) => { if (e.target === cvs) e.preventDefault(); }, { passive: false });
document.addEventListener('gesturestart', (e) => e.preventDefault());
cvs.addEventListener('contextmenu', (e) => e.preventDefault());
function padBtn(id, down, up) {
  const b = $(id);
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); initAudio(); setTouchMode(true); b.classList.add('held'); try { b.setPointerCapture(e.pointerId); } catch (err) {} down(); });
  const rel = () => { b.classList.remove('held'); if (up) up(); };
  b.addEventListener('pointerup', rel); b.addEventListener('pointercancel', rel); b.addEventListener('lostpointercapture', rel);
  b.addEventListener('contextmenu', (e) => e.preventDefault());
}
padBtn('btnAttack', () => { atkHeld = true; doLash(); }, () => { atkHeld = false; });
padBtn('btnGrab', () => doGrab());
padBtn('btnSpecial', () => doSpecial());
let lastPad = '';
function updatePad() {
  const show = touchMode && state === 'play';
  const ready = !!(P && P.meter >= 100);
  const key = `${show}|${ready}`;
  if (key === lastPad) return;
  lastPad = key;
  $('pad').classList.toggle('hidden', !show);
  $('btnSpecial').classList.toggle('ready', ready);
}
function toggleMute() {
  muted = !muted;
  try { localStorage.setItem('bowHodu.muted', muted ? '1' : '0'); } catch (e) {}
  $('muteBtn').innerHTML = muted ? '&#128263;' : '&#128266;';
  if (!muted) { initAudio(); sfx.click(); }
}
const tapBtn = (id, fn) => $(id).addEventListener('click', () => { initAudio(); sfx.click(); fn(); });
tapBtn('playBtn', startGame);
tapBtn('resumeBtn', () => setPaused(false));
tapBtn('quitBtn', toTitle);
tapBtn('againBtn', startGame);
tapBtn('titleBtn', toTitle);
tapBtn('keepBtn', () => openEvolve(`Loop ${Math.floor(level / LEVELS.length) + 1} begins. Everything hits harder.`));
tapBtn('winAgainBtn', startGame);
$('pauseBtn').addEventListener('click', () => setPaused(state === 'play'));
$('muteBtn').addEventListener('click', toggleMute);

/* ---------------- loop ---------------- */
let last = performance.now(), lastLevel = -1;
function step(dt) {
  clock += dt;
  if (level !== lastLevel || (state === 'play' && banner && banner.t === 0)) { if (banner && banner.t === 0) levelStartClock = clock; lastLevel = level; }
  if (state === 'play') update(dt);
  else if (state === 'title') {
    P.x = AW / 2 + Math.cos(clock * 0.4) * 120; P.y = AH / 2 + Math.sin(clock * 0.8) * 60; P.face = clock * 0.4 + Math.PI / 2;
    P.look = Math.sin(clock * 0.9) * 2; P.lashT -= dt; if (Math.random() < dt * 0.6) { P.lashDir = rand(0, TAU); P.lashT = 0.24; }
    P.blinkT -= dt; if (P.blinkT < 0) { P.blink = 0.16; P.blinkT = rand(1.8, 4.5); } P.blink = Math.max(0, P.blink - dt);
    stepFx(dt);
  } else stepFx(dt * 0);
  shake = Math.max(0, shake - dt * 30);
  updatePad();
}
function frame(t) {
  let dt = (t - last) / 1000; last = t;
  if (!(dt > 0)) dt = 0; if (dt > 0.05) dt = 0.05;
  step(dt);
  draw();
  requestAnimationFrame(frame);
}
window.addEventListener('resize', resize);
resize();
setTouchMode(!!(window.matchMedia && matchMedia('(pointer: coarse)').matches) || navigator.maxTouchPoints > 0 || 'ontouchstart' in window);
$('muteBtn').innerHTML = muted ? '&#128263;' : '&#128266;';
toTitle();
requestAnimationFrame(frame);
window.__bow = { get state() { return state; }, get level() { return level; }, get units() { return units.length; }, get touchMode() { return touchMode; }, get mass() { return P && P.mass; }, get score() { return score; } };
if (/[?&]debug/.test(location.search)) window.__bowDebug = {
  get P() { return P; }, get units() { return units; }, get drones() { return drones; }, get boss() { return boss; }, get state() { return state; }, get level() { return level; }, get levelAbsorbed() { return levelAbsorbed; }, get score() { return score; }, get bullets() { return bullets; },
  joy, keys, step, draw, startGame, startLevel, chooseEvo, doLash, doGrab, doSpecial, quota, setGod(v) { god = v; }, setMass(n) { for (let i = 0; i < n; i++) { P.mass++; P.limbs.push(newLimb(i % 2 ? 'sol' : 'sci')); } updR(); },
};
})();
