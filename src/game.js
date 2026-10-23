'use strict';
// PHOENIX KNIGHT - een Knightmare-achtige verticale scroller met Hi no Tori-invloeden.
const W = 256, H = 212, TS = 16, COLS = 16, HUD = 20;
const cv = document.getElementById('screen');
const g = cv.getContext('2d');
const FONT = '"Press Start 2P", monospace';

// ---------- invoer ----------
const keys = Object.create(null), pressed = Object.create(null);
const GAME_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyZ', 'KeyX', 'Enter', 'KeyP', 'KeyM', 'KeyC'];
addEventListener('keydown', e => {
  if (GAME_KEYS.includes(e.code)) e.preventDefault();
  if (!keys[e.code]) pressed[e.code] = true;
  keys[e.code] = true;
  SCC.unlock();
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; if (G.state === 'play' && !G.paused) togglePause(); });

let padPrev = {};
function pollPad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const p = pads && pads[0], cur = {};
  if (p) {
    const b = i => !!(p.buttons[i] && p.buttons[i].pressed);
    cur.PadUp = b(12) || p.axes[1] < -0.4; cur.PadDown = b(13) || p.axes[1] > 0.4;
    cur.PadLeft = b(14) || p.axes[0] < -0.4; cur.PadRight = b(15) || p.axes[0] > 0.4;
    cur.PadFire = b(0) || b(2); cur.PadStart = b(9);
  }
  for (const k of ['PadUp', 'PadDown', 'PadLeft', 'PadRight', 'PadFire', 'PadStart']) {
    if (cur[k] && !padPrev[k]) { pressed[k] = true; SCC.unlock(); }
    keys[k] = !!cur[k];
  }
  padPrev = cur;
}
const I = {
  up: () => keys.ArrowUp || keys.KeyW || keys.PadUp,
  down: () => keys.ArrowDown || keys.KeyS || keys.PadDown,
  left: () => keys.ArrowLeft || keys.KeyA || keys.PadLeft,
  right: () => keys.ArrowRight || keys.KeyD || keys.PadRight,
  fire: () => keys.Space || keys.KeyZ || keys.PadFire,
  start: () => pressed.Enter || pressed.Space || pressed.KeyZ || pressed.PadStart || pressed.PadFire,
};

// ---------- hulpjes ----------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const overlap = (ax, ay, aw, ah, bx, by, bw, bh) => ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
function rng(seed) { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }

// ---------- level ----------
const STAGE_NAMES = ['THE ENCHANTED WOODS', 'RUINS OF THE FIREBIRD', 'PHOENIX CASTLE'];
const ARENA = 16;
function buildLevel(stage) {
  const R = rng(stage * 7919 + 17);
  const SEGS = [['meadow', 22], ['forest', 26], ['river', 9], ['meadow', 14], ['ruins', 30], ['river', 9], ['forest', 24], ['ruins', 18], ['castle', 26]];
  const rows = ARENA + SEGS.reduce((a, s) => a + s[1], 0);
  const map = new Uint8Array(rows * COLS), seg = new Array(rows).fill('castle'), pathAt = new Array(rows).fill(7);
  let px = 7, r = rows - 1;
  for (const [type, len] of SEGS) {
    for (let i = 0; i < len; i++, r--) {
      if (type !== 'river' && i > 1 && i < len - 1 && R() < 0.35) px = clamp(px + (R() < 0.5 ? -1 : 1), 3, 12);
      seg[r] = type; pathAt[r] = px;
      for (let c = 0; c < COLS; c++) {
        const d = Math.abs(c - px), inPath = d <= 1;
        let t = R() < 0.82 ? T.GRASS : (R() < 0.6 ? T.GRASS2 : T.FLOWER);
        if (type === 'meadow') { if (inPath) t = T.PATH; else if (d > 2 && R() < 0.07) t = T.TREE; }
        else if (type === 'forest') { if (inPath) t = R() < 0.5 ? T.PATH : T.GRASS; else if (R() < (i < 2 || i > len - 3 ? 0.25 : 0.6)) t = T.TREE; }
        else if (type === 'river') { if (i >= 2 && i <= 6) t = inPath ? T.BRIDGE : T.WATER; else if (inPath) t = T.PATH; }
        else if (type === 'ruins') {
          t = R() < 0.55 ? T.FLOOR : (R() < 0.5 ? T.FLOOR2 : T.RUBBLE);
          if (!inPath) { if (i % 7 === 3 && R() < 0.85) t = T.WALL; else if (R() < 0.05) t = T.PILLAR; }
        } else if (type === 'castle') {
          t = (c + r) % 2 ? T.FLOOR : T.FLOOR2;
          if (c === 0 || c === 15) t = T.WALL; else if ((c === 2 || c === 13) && i % 4 === 1 && !inPath) t = T.PILLAR;
        }
        map[r * COLS + c] = t;
      }
    }
  }
  for (; r >= 0; r--) for (let c = 0; c < COLS; c++) {
    let t = (c + r) % 2 ? T.FLOOR : T.FLOOR2;
    if (c === 0 || c === 15) t = T.WALL; else if ((c === 1 || c === 14) && r % 5 === 2) t = T.PILLAR;
    map[r * COLS + c] = t;
  }

  const POOL = {
    meadow: ['bats', 'slimes', 'bats', 'skel'], forest: ['bats', 'skel', 'slimes', 'knights'],
    river: ['bats', 'bats', 'slimes'], ruins: ['skel', 'knights', 'wizard', 'bats'], castle: ['knights', 'wizard', 'bats', 'skel'],
  };
  const waves = [];
  let y = rows * TS - H - 140, n = 0;
  while (y > ARENA * TS + 60) {
    const pool = POOL[seg[Math.max(0, Math.floor(y / TS))]];
    waves.push({ y, kind: pool[(R() * pool.length) | 0] });
    if (n % 4 === 1) waves.push({ y: y - 30, kind: 'crystal' });
    if (n % 5 === 2) waves.push({ y: y - 50, kind: 'firebird' });
    if (stage > 1 && n % 3 === 0) waves.push({ y: y - 15, kind: pool[(R() * pool.length) | 0] });
    y -= Math.max(50, 75 + R() * 40 - stage * 6); n++;
  }
  waves.sort((a, b) => b.y - a.y);
  return { rows, map, seg, pathAt, waves };
}
const tileAt = (px, py) => {
  const c = Math.floor(px / TS), r = Math.floor(py / TS);
  if (c < 0 || c >= COLS) return T.WALL;
  if (r < 0 || r >= L.rows) return T.GRASS;
  return L.map[r * COLS + c];
};
const solidAt = (px, py) => SOLID[tileAt(px, py)] === 1;
// botsvlak = de voeten van de ridder
const hitsSolid = (x, y) => solidAt(x + 3, y + 8) || solidAt(x + 12, y + 8) || solidAt(x + 3, y + 15) || solidAt(x + 12, y + 15);

// ---------- spelstatus ----------
const G = { state: 'title', t: 0, stage: 1, score: 0, hi: 50000, lives: 3, paused: false, timer: 0, shake: 0, flash: 0, warn: 0, nextExtend: 20000, crt: true };
try { G.hi = Math.max(G.hi, +localStorage.getItem('phoenixKnightHi') || 0); } catch (e) { /* geen opslag */ }
let L = null, camY = 0, S = 0, waveIdx = 0, boss = null, P = null;
let shots = [], foes = [], ebul = [], items = [], fx = [], texts = [];

const WEAPONS = ['ARROW', 'FIRE', 'BLADE'];
const WCOL = ['#7d76fc', '#fc5554', '#5edc78'];
const HP = { bat: 1, fbird: 4, skel: 2, knight: 5, wizard: 3, slime: 2 };
const PTS = { bat: 100, fbird: 500, skel: 150, knight: 300, wizard: 400, slime: 120 };

function newPlayer() { return { x: 120, y: 0, weapon: 0, lvl: 1, speed: 0, shield: 0, feathers: 0, phoenix: 0, inv: 0, cd: 0, anim: 0, dead: 0 }; }

function startGame() {
  G.score = 0; G.lives = 3; G.stage = 1; G.nextExtend = 20000;
  P = newPlayer();
  startStage();
}
function startStage() {
  L = buildLevel(G.stage);
  camY = L.rows * TS - H; waveIdx = 0; boss = null;
  shots = []; foes = []; ebul = []; items = []; fx = []; texts = [];
  const row = L.rows - 3;
  P.x = L.pathAt[row] * TS; P.y = row * TS; P.inv = 0; P.dead = 0; P.phoenix = 0;
  G.state = 'intro'; G.timer = 170;
  SCC.playSong(SCC.TRACKS.start);
}
function addScore(n) {
  G.score += n;
  if (G.score >= G.nextExtend) { G.lives++; G.nextExtend += 60000; SCC.sfx.extend(); texts.push({ x: P.x, y: P.y - 8, s: '1UP', t: 0, col: '#ffd84a' }); }
  if (G.score > G.hi) G.hi = G.score;
}
function saveHi() { try { localStorage.setItem('phoenixKnightHi', G.hi); } catch (e) { /* geen opslag */ } }

function togglePause() {
  G.paused = !G.paused;
  if (G.paused) { SCC.sfx.pause(); setTimeout(() => G.paused && SCC.pause(), 150); } else SCC.resume();
}

// ---------- vijanden ----------
function mk(type, x, y, extra) { return Object.assign({ type, x, y, t: 0, hp: HP[type] + (G.stage > 1 && type !== 'bat' ? 1 : 0), flash: 0 }, extra); }
function freeSpotOnScreen(minSy, maxSy) {
  for (let k = 0; k < 30; k++) {
    const c = 1 + ((Math.random() * 14) | 0), sy = rand(minSy, maxSy), wy = camY + sy;
    if (!solidAt(c * TS + 8, wy + 8)) return { x: c * TS, y: wy };
  }
  return { x: 120, y: camY + minSy };
}
function spawnWave(w) {
  switch (w.kind) {
    case 'bats': {
      const cx = rand(40, 200);
      for (let i = 0; i < 5; i++) foes.push(mk('bat', cx - 8, camY - 16 - i * 20, { sx: cx - 8, ph: i * 0.7 }));
      break;
    }
    case 'slimes':
      for (let i = 0; i < 3; i++) foes.push(mk('slime', rand(16, 224), camY - 16 - i * 24, {}));
      break;
    case 'skel':
      for (let i = 0; i < 3; i++) { const p = freeSpotOnScreen(40, 110); foes.push(mk('skel', p.x, p.y, { rise: 40 + i * 15 })); }
      break;
    case 'knights':
      for (let i = 0; i < 2; i++) foes.push(mk('knight', 40 + i * 160 + rand(-16, 16), camY - 20, { stopY: 50 + i * 16, mode: 0 }));
      break;
    case 'wizard': { const p = freeSpotOnScreen(40, 100); foes.push(mk('wizard', p.x, p.y, { cyc: 0 })); break; }
    case 'firebird': {
      const left = Math.random() < 0.5;
      foes.push(mk('fbird', left ? -16 : W, camY + 40, { vx: left ? 1.3 : -1.3 }));
      break;
    }
    case 'crystal': {
      const wy = camY - 16;
      let c = L.pathAt[clamp(Math.floor(wy / TS), 0, L.rows - 1)] + ((Math.random() * 3) | 0) - 1;
      items.push({ kind: 'crystal', x: c * TS + 2, y: wy, c: 0, cd: 0, t: 0 });
      break;
    }
  }
}
function aim(x, y, spd, spread = 0, kind = 'orb') {
  const a = Math.atan2(P.y + 8 - y, P.x + 8 - x) + spread;
  ebul.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, kind, t: 0 });
}
function bulletAt(x, y, a, spd, kind = 'orb') { ebul.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, kind, t: 0 }); }
const bspd = () => 1.4 + G.stage * 0.2;

function updateFoe(e) {
  e.t++; if (e.flash) e.flash--;
  const sy = e.y - camY;
  switch (e.type) {
    case 'bat':
      e.y += 1.1 - S; e.x = e.sx + Math.sin(e.t * 0.05 + e.ph) * 48;
      break;
    case 'fbird':
      e.x += e.vx; e.y += Math.sin(e.t * 0.06) * 1.3 - S;
      if (e.t % 70 === 35) aim(e.x + 8, e.y + 8, bspd());
      if (e.t > 40 && (e.x < -24 || e.x > W + 8)) e.dead = true;
      break;
    case 'slime': {
      const ph = e.t % 50;
      if (ph < 22) {
        const dx = P.x - e.x, dy = P.y - e.y, d = Math.hypot(dx, dy) || 1;
        e.x += dx / d * 0.9; e.y += dy / d * 0.9 + 0.3;
      }
      e.hop = ph < 22 ? Math.sin(ph / 22 * Math.PI) * 6 : 0;
      break;
    }
    case 'skel':
      if (e.rise > 0) { e.rise--; break; }
      { const dx = P.x - e.x, dy = P.y - e.y, d = Math.hypot(dx, dy) || 1; e.x += dx / d * 0.45; e.y += dy / d * 0.45; }
      if (e.t % 130 === 60) { aim(e.x + 8, e.y + 4, bspd(), 0, 'bone'); SCC.sfx.eshot(); }
      break;
    case 'knight':
      if (e.mode === 0) { e.y += 1.0 - S; if (sy > e.stopY) { e.mode = 1; e.t = 0; } }
      else if (e.mode === 1) {
        e.y -= S;
        if (e.t === 30 || e.t === 70) { aim(e.x + 8, e.y + 12, bspd() + 0.3); aim(e.x + 8, e.y + 12, bspd() + 0.3, 0.25); aim(e.x + 8, e.y + 12, bspd() + 0.3, -0.25); SCC.sfx.eshot(); }
        if (e.t > 100) e.mode = 2;
      } else e.y += 1.4 - S;
      break;
    case 'wizard': {
      e.y -= S;
      const c = e.t % 120;
      e.alpha = c < 20 ? c / 20 : c < 90 ? 1 : c < 110 ? 1 - (c - 90) / 20 : 0;
      if (c === 50) { for (const s of [-0.3, 0, 0.3]) aim(e.x + 8, e.y + 8, bspd(), s); SCC.sfx.eshot(); }
      if (c === 110) {
        if (++e.cyc >= 3) { e.dead = true; break; }
        const p = freeSpotOnScreen(36, 110); e.x = p.x; e.y = p.y;
      }
      break;
    }
  }
  const nsy = e.y - camY;
  if (nsy > H + 24 || nsy < -140 || e.x < -60 || e.x > W + 60) e.dead = true;
}
function killFoe(e) {
  e.dead = true;
  addScore(PTS[e.type]);
  explode(e.x + 8, e.y + 8, false);
  if (e.type === 'fbird') items.push({ kind: 'feather', x: e.x + 4, y: e.y + 2, t: 0 });
  else if (Math.random() < 0.04) items.push({ kind: 'crystal', x: e.x + 2, y: e.y, c: (Math.random() * 5) | 0, cd: 0, t: 0 });
}

// ---------- effecten ----------
function explode(x, y, big) {
  fx.push({ x, y, t: 0, max: big ? 34 : 22, big });
  for (let i = 0; i < (big ? 14 : 6); i++) {
    const a = Math.random() * Math.PI * 2, s = rand(0.5, big ? 3 : 2);
    fx.push({ part: true, x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, max: 20 + (Math.random() * 15 | 0), col: ['#ffffff', '#ffd84a', '#ff8c1a', '#fc5554'][(Math.random() * 4) | 0] });
  }
  if (big) { SCC.sfx.big(); G.shake = 12; } else SCC.sfx.explode();
}

// ---------- speler ----------
function addShot(kind, x, y, ang, spd, dmg) {
  const size = { arrow: [3, 10], fire: [6, 6], blade: [12 + P.lvl * 4, 6], flame: [8, 9] }[kind];
  shots.push({ kind, x: x - size[0] / 2, y, w: size[0], h: size[1], vx: Math.sin(ang) * spd, vy: -Math.cos(ang) * spd, dmg, pierce: kind === 'blade' || kind === 'flame', hit: new Set() });
}
function fire() {
  const cx = P.x + 8, cy = P.y - 2;
  if (P.phoenix) {
    for (const a of [-0.45, -0.22, 0, 0.22, 0.45]) addShot('flame', cx, cy, a, 5, 2);
    P.cd = 8; SCC.sfx.flame(); return;
  }
  if (P.weapon === 0) {
    const max = [0, 3, 6, 9][P.lvl];
    if (shots.length >= max) return;
    if (P.lvl === 1) addShot('arrow', cx, cy, 0, 6, 1);
    else if (P.lvl === 2) { addShot('arrow', cx - 4, cy, 0, 6, 1); addShot('arrow', cx + 4, cy, 0, 6, 1); }
    else { addShot('arrow', cx - 6, cy, -0.08, 6, 1); addShot('arrow', cx, cy - 2, 0, 6, 1); addShot('arrow', cx + 6, cy, 0.08, 6, 1); }
    P.cd = 7; SCC.sfx.shoot();
  } else if (P.weapon === 1) {
    if (shots.length > 12) return;
    const angs = P.lvl === 1 ? [-0.25, 0, 0.25] : P.lvl === 2 ? [-0.4, -0.2, 0, 0.2, 0.4] : [-0.6, -0.4, -0.2, 0, 0.2, 0.4, 0.6];
    for (const a of angs) addShot('fire', cx, cy, a, 3.6 + P.lvl * 0.3, 1);
    P.cd = 13; SCC.sfx.fire();
  } else {
    if (shots.length >= 3) return;
    addShot('blade', cx, cy, 0, 3.8, 1 + P.lvl);
    P.cd = 16 - P.lvl * 2; SCC.sfx.blade();
  }
}
function findFree(x, y) {
  for (let r = 0; r < 64; r += 4) for (const [dx, dy] of [[0, -r], [-r, 0], [r, 0], [0, r], [-r, -r], [r, -r]]) {
    const nx = clamp(x + dx, 0, W - 16);
    if (!hitsSolid(nx, y + dy)) return { x: nx, y: y + dy };
  }
  return { x, y };
}
function moveY(dy) {
  if (!dy) return;
  const ny = P.y + dy;
  if (P.phoenix || !hitsSolid(P.x, ny)) { P.y = ny; return; }
  // hoekhulp: schuif om een obstakel heen als er bijna ruimte is
  for (let k = 1; k <= 7; k++) for (const s of [-1, 1]) {
    if (!hitsSolid(P.x + s * k, ny) && !hitsSolid(P.x + s, P.y)) { P.x += s; return; }
  }
}
function moveX(dx) {
  if (!dx) return;
  const nx = clamp(P.x + dx, 0, W - 16);
  if (P.phoenix || !hitsSolid(nx, P.y)) P.x = nx;
}
function updatePlayer() {
  if (P.dead) {
    if (--P.dead === 0) {
      if (!G.infinite) {
        if (G.lives <= 0) { G.state = 'gameover'; G.timer = 420; saveHi(); SCC.playSong(SCC.TRACKS.gameover); return; }
        G.lives--;
      }
      const row = clamp(Math.floor((camY + H - 40) / TS), 0, L.rows - 1);
      const p = boss ? findFree(120, camY + H - 40) : findFree(L.pathAt[row] * TS, camY + H - 40);
      P.x = p.x; P.y = p.y; P.inv = 150;
    }
    return;
  }
  if (P.inv) P.inv--;
  if (P.phoenix) {
    if (--P.phoenix === 0) { const p = findFree(P.x, P.y); P.x = p.x; P.y = p.y; P.inv = 90; }
    if (G.t % 2 === 0) fx.push({ part: true, x: P.x + 8 + rand(-6, 6), y: P.y + 16, vx: rand(-0.3, 0.3), vy: 1, t: 0, max: 16, col: Math.random() < 0.5 ? '#ffd84a' : '#ff8c1a' });
  }
  const sp = [1.4, 1.75, 2.1, 2.4][P.speed] * (P.phoenix ? 1.2 : 1);
  let dx = (I.right() ? 1 : 0) - (I.left() ? 1 : 0), dy = (I.down() ? 1 : 0) - (I.up() ? 1 : 0);
  if (dx && dy) { dx *= 0.7071; dy *= 0.7071; }
  moveX(dx * sp); moveY(dy * sp);
  if (dx || dy) P.anim++;
  const top = camY + HUD + 4, bot = camY + H - 16;
  if (P.y < top) P.y = top;
  if (P.y > bot) {
    P.y = bot;
    // Knightmare-regel: wie door het landschap tegen de onderrand gedrukt wordt, is dood
    if (!P.phoenix && hitsSolid(P.x, P.y)) { killPlayer(); return; }
  }
  if (P.cd) P.cd--;
  if (I.fire() && !P.cd) fire();
}
function playerHit() {
  if (P.dead || P.inv || P.phoenix) return;
  if (P.shield > 0) { P.shield--; P.inv = 60; SCC.sfx.shield(); return; }
  killPlayer();
}
function killPlayer() {
  explode(P.x + 8, P.y + 8, true);
  SCC.sfx.die();
  P.dead = 130; P.lvl = Math.max(1, P.lvl - 1); P.speed = 0; P.shield = 0; P.phoenix = 0;
}

// ---------- items ----------
function collect(it) {
  if (it.kind === 'feather') {
    P.feathers++; addScore(1000); SCC.sfx.feather();
    texts.push({ x: it.x, y: it.y, s: 'FEATHER', t: 0, col: '#ffd84a' });
    if (P.feathers >= 3) { P.feathers = 0; P.phoenix = 600; G.flash = 12; SCC.sfx.phoenix(); texts.push({ x: P.x - 16, y: P.y - 10, s: 'PHOENIX!', t: 0, col: '#ff8c1a' }); }
    return;
  }
  const c = it.c;
  let label;
  if (c <= 2) {
    if (P.weapon === c) P.lvl = Math.min(3, P.lvl + 1); else P.weapon = c;
    label = WEAPONS[c] + ' ' + P.lvl;
  } else if (c === 3) { P.shield = Math.min(3, P.shield + 2); label = 'SHIELD'; }
  else { if (P.speed < 3) { P.speed++; label = 'SPEED UP'; } else { addScore(2000); label = '2000'; } }
  addScore(500); SCC.sfx.power();
  texts.push({ x: it.x - 8, y: it.y, s: label, t: 0, col: '#ffffff' });
}

// ---------- eindbaas ----------
function startBoss() {
  const hp = 220 + G.stage * 80;
  boss = { x: 128, y: -70, t: 0, hp, max: hp, enter: true, flash: 0, dying: 0, ang: 0 };
  G.warn = 150;
  SCC.playSong(SCC.TRACKS.boss);
  SCC.sfx.roar();
}
function fan(x, y, n, step, spd) {
  const base = Math.atan2(P.y + 8 - y, P.x + 8 - x);
  for (let i = 0; i < n; i++) bulletAt(x, y, base + (i - (n - 1) / 2) * step, spd);
  SCC.sfx.eshot();
}
function updateBoss() {
  const b = boss;
  b.t++; if (b.flash) b.flash--;
  if (b.dying) {
    if (b.dying % 7 === 0) explode(b.x + rand(-28, 28), b.y + rand(4, 44), b.dying % 21 === 0);
    if (--b.dying === 0) {
      explode(b.x, b.y + 24, true); G.flash = 20;
      boss = null; stageClear();
    }
    return;
  }
  if (b.enter) {
    b.y += 0.6;
    if (b.y >= 30) { b.enter = false; b.t = 0; }
    return;
  }
  const ph = b.hp > b.max * 0.66 ? 0 : b.hp > b.max * 0.33 ? 1 : 2;
  b.x = 128 + Math.sin(b.t * [0.012, 0.016, 0.022][ph]) * 72;
  b.y = 32 + Math.sin(b.t * 0.031) * 8 + (ph === 2 ? Math.sin(b.t * 0.05) * 10 : 0);
  const bx = b.x, by = b.y + 30, sp = bspd();
  if (ph === 0) {
    if (b.t % 80 === 0) fan(bx, by, 5, 0.22, sp);
    if (b.t % 160 > 40 && b.t % 160 <= 58 && b.t % 6 === 0) aim(bx, by, sp + 0.8);
  } else if (ph === 1) {
    if (b.t % 60 === 0) fan(bx, by, 7, 0.2, sp + 0.2);
    if (b.t % 240 === 120) for (let i = 0; i < 4; i++) foes.push(mk('bat', 40 + i * 50, camY - 10 - i * 12, { sx: 40 + i * 50, ph: i }));
    if (b.t % 100 === 50) for (const s of [-0.15, 0, 0.15]) aim(bx, by, sp + 0.6, s);
  } else {
    if (b.t % 6 === 0) { b.ang += 0.37; for (let k = 0; k < 2; k++) bulletAt(bx, b.y + 20, b.ang + k * Math.PI, sp * 0.85, 'orb2'); }
    if (b.t % 90 === 0) for (let i = 0; i < 6; i++) ebul.push({ x: rand(16, 240), y: camY + HUD + rand(0, 10), vx: 0, vy: sp * 0.8, kind: 'feather', t: 0 });
    if (b.t % 75 === 37) fan(bx, by, 9, 0.17, sp);
  }
}
function hurtBoss(dmg) {
  const b = boss;
  if (!b || b.enter || b.dying) return;
  b.hp -= dmg; b.flash = 3; addScore(10);
  if (b.hp <= 0) {
    b.hp = 0; b.dying = 150; ebul = [];
    for (const e of foes) { e.dead = true; explode(e.x + 8, e.y + 8, false); }
    addScore(10000 * G.stage);
    texts.push({ x: b.x - 24, y: b.y + 20, s: (10000 * G.stage) + '', t: 0, col: '#ffd84a' });
  }
}
function stageClear() {
  G.state = 'clear'; G.timer = 400;
  SCC.playSong(SCC.TRACKS.clear);
}

// ---------- update ----------
function updatePlay() {
  S = camY > 0 ? Math.min(0.45 + 0.05 * (G.stage - 1), camY) : 0;
  camY -= S;
  while (waveIdx < L.waves.length && camY <= L.waves[waveIdx].y) spawnWave(L.waves[waveIdx++]);
  if (camY <= 0 && !boss && G.state === 'play') startBoss();

  updatePlayer();
  if (G.state !== 'play') return;

  // eigen schoten
  for (const s of shots) {
    s.x += s.vx; s.y += s.vy - S;
    const sy = s.y - camY;
    if (sy < HUD - 12 || sy > H || s.x < -16 || s.x > W) s.dead = true;
    else if (s.kind !== 'flame' && BLOCKSHOT[tileAt(s.x + s.w / 2, s.y + 2)]) { s.dead = true; fx.push({ part: true, x: s.x + s.w / 2, y: s.y, vx: 0, vy: 0, t: 0, max: 6, col: '#ffffff' }); }
  }
  for (const e of foes) updateFoe(e);
  if (boss) updateBoss();

  // schoten raken vijanden / kristallen / baas
  for (const s of shots) {
    if (s.dead) continue;
    for (const e of foes) {
      if (e.dead || s.hit.has(e) || (e.type === 'wizard' && e.alpha < 0.5) || (e.type === 'skel' && e.rise > 20)) continue;
      if (overlap(s.x, s.y, s.w, s.h, e.x + 2, e.y + 2, 12, 12)) {
        e.hp -= s.dmg; e.flash = 4; s.hit.add(e);
        if (e.hp <= 0) killFoe(e); else SCC.sfx.hit();
        if (!s.pierce) { s.dead = true; break; }
      }
    }
    if (s.dead) continue;
    for (const it of items) {
      if (it.kind !== 'crystal' || it.cd) continue;
      if (overlap(s.x, s.y, s.w, s.h, it.x, it.y, 12, 14)) { it.c = (it.c + 1) % 5; it.cd = 8; addScore(10); SCC.sfx.crystal(); if (!s.pierce) { s.dead = true; break; } }
    }
    if (s.dead) continue;
    if (boss && !s.hit.has(boss) && overlap(s.x, s.y, s.w, s.h, boss.x - 24, boss.y + 4, 48, 40)) {
      hurtBoss(s.dmg); s.hit.add(boss);
      if (!s.pierce) s.dead = true;
    }
  }

  // vijandelijke kogels
  for (const b of ebul) {
    b.t++; b.x += b.vx; b.y += b.vy - S;
    const sy = b.y - camY;
    if (sy < -10 || sy > H + 10 || b.x < -10 || b.x > W + 10) b.dead = true;
  }

  // items
  for (const it of items) {
    it.t++; if (it.cd) it.cd--;
    if (it.kind === 'feather') { it.y += 0.5 - S; it.x += Math.sin(it.t * 0.08) * 0.6; }
    if (it.y - camY > H + 16) it.dead = true;
  }

  // botsingen met de speler
  if (!P.dead) {
    const px = P.x + 4, py = P.y + 4, pw = 8, ph = 10;
    for (const it of items) if (!it.dead && overlap(px - 2, py - 2, pw + 4, ph + 4, it.x, it.y, 12, 14)) { it.dead = true; collect(it); }
    for (const e of foes) {
      if (e.dead || (e.type === 'wizard' && e.alpha < 0.5) || (e.type === 'skel' && e.rise > 0)) continue;
      if (overlap(px, py, pw, ph, e.x + 3, e.y + 3, 10, 10)) {
        if (P.phoenix) { killFoe(e); continue; }
        playerHit();
      }
    }
    for (const b of ebul) if (!b.dead && overlap(px, py, pw, ph, b.x - 2, b.y - 2, 4, 4)) { if (P.phoenix) b.dead = true; else { b.dead = true; playerHit(); } }
    if (boss && !boss.dying && !boss.enter && overlap(px, py, pw, ph, boss.x - 20, boss.y + 6, 40, 34)) {
      if (P.phoenix) { if (G.t % 4 === 0) hurtBoss(2); } else playerHit();
    }
  }

  shots = shots.filter(s => !s.dead);
  foes = foes.filter(e => !e.dead);
  ebul = ebul.filter(b => !b.dead);
  items = items.filter(i => !i.dead);
}
function updateFx() {
  for (const f of fx) { f.t++; if (f.part) { f.x += f.vx; f.y += f.vy - S * 0; f.vx *= 0.95; f.vy *= 0.95; } }
  fx = fx.filter(f => f.t < f.max);
  for (const t of texts) { t.t++; t.y -= 0.4; }
  texts = texts.filter(t => t.t < 60);
  if (G.shake) G.shake--;
  if (G.flash) G.flash--;
  if (G.warn) G.warn--;
}

function step() {
  pollPad();
  G.t++;
  if (pressed.KeyM) SCC.toggleMute();
  // cheat: houd G 5 seconden ingedrukt voor oneindige levens
  G.gHold = keys.KeyG ? (G.gHold || 0) + 1 : 0;
  if (G.gHold === 300 && !G.infinite) { G.infinite = true; G.cheatMsg = 180; SCC.sfx.extend(); }
  if (G.cheatMsg) G.cheatMsg--;
  if (pressed.KeyC) { G.crt = !G.crt; document.getElementById('crt').style.display = G.crt ? '' : 'none'; }
  switch (G.state) {
    case 'title':
      camY = Math.max(0, camY - 0.3); if (camY <= 0) camY = L.rows * TS - H;
      if (I.start()) startGame();
      break;
    case 'intro':
      if (--G.timer <= 0) { G.state = 'play'; SCC.playSong(SCC.TRACKS.stage); }
      break;
    case 'play':
      if (pressed.KeyP || pressed.Enter || pressed.PadStart) togglePause();
      if (!G.paused) { updatePlay(); updateFx(); }
      break;
    case 'clear':
      S = 0;
      updateFx();
      if (!P.dead) { moveX(((I.right() ? 1 : 0) - (I.left() ? 1 : 0)) * 1.5); moveY(((I.down() ? 1 : 0) - (I.up() ? 1 : 0)) * 1.5); }
      if (--G.timer <= 0) { G.stage++; P.phoenix = 0; startStage(); }
      break;
    case 'gameover':
      updateFx();
      if (--G.timer <= 0 || (G.timer < 300 && I.start())) { G.state = 'title'; SCC.stopSong(); L = buildLevel(1); camY = L.rows * TS - H; }
      break;
  }
  for (const k in pressed) delete pressed[k];
}

// ---------- tekenen ----------
function text(s, x, y, col = '#ffffff', align = 'left', size = 8) {
  g.font = size + 'px ' + FONT; g.textBaseline = 'top'; g.textAlign = align;
  g.fillStyle = '#000000'; g.fillText(s, x + 1, y + 1);
  g.fillStyle = col; g.fillText(s, x, y);
}
const pad = (n, l) => String(n).padStart(l, '0');

function drawMap() {
  const cy = Math.floor(camY), r0 = Math.floor(cy / TS);
  const wf = (G.t >> 4) & 1;
  for (let r = r0; r <= r0 + 14 && r < L.rows; r++) {
    if (r < 0) continue;
    for (let c = 0; c < COLS; c++) {
      const set = SPR.tiles[L.map[r * COLS + c]];
      g.drawImage(set[set.length > 1 ? wf : 0], c * TS, r * TS - cy);
    }
  }
}
function drawSprite(img, x, y, alpha = 1) {
  if (alpha < 1) g.globalAlpha = Math.max(0, alpha);
  g.drawImage(img, Math.round(x), Math.round(y - Math.floor(camY)));
  g.globalAlpha = 1;
}
function drawFoe(e) {
  const fr = (e.t >> 3) & 1;
  const set = e.flash ? SPR[e.type + 'W'] : SPR[e.type];
  const img = set[fr % set.length];
  if (e.type === 'skel' && e.rise > 0) {
    // skelet kruipt uit de grond
    const vis = Math.max(2, 16 - Math.floor(e.rise / 3));
    const sy = Math.round(e.y - Math.floor(camY));
    g.drawImage(img, 0, 0, 16, vis, Math.round(e.x), sy + 16 - vis, 16, vis);
    g.fillStyle = '#4a2c14'; g.fillRect(Math.round(e.x) + 1, sy + 14, 14, 2);
    return;
  }
  if (e.type === 'slime') { drawSprite(img, e.x, e.y - (e.hop || 0)); return; }
  drawSprite(img, e.x, e.y, e.type === 'wizard' ? e.alpha : 1);
}
function drawPlayer() {
  if (P.dead) return;
  if (P.inv && (G.t >> 2) & 1) return;
  const fr = (P.anim >> 3) & 1;
  if (P.phoenix) {
    if (P.phoenix < 120 && (G.t >> 2) & 1) { drawSprite(SPR.player[0], P.x, P.y); return; }
    drawSprite(SPR.phoenix[(G.t >> 3) & 1], P.x - 8, P.y - 6);
    return;
  }
  drawSprite(SPR.player[fr], P.x, P.y);
  if (P.shield) {
    g.strokeStyle = (G.t >> 2) & 1 ? '#ffffff' : '#42ebf5';
    g.beginPath(); g.arc(Math.round(P.x + 8), Math.round(P.y - Math.floor(camY) + 8), 11, 0, Math.PI * 2); g.stroke();
  }
}
function drawShots() {
  for (const s of shots) {
    if (s.kind === 'arrow') drawSprite(SPR.arrow, s.x, s.y);
    else if (s.kind === 'fire') drawSprite(SPR.fireball, s.x, s.y);
    else if (s.kind === 'flame') drawSprite(SPR.flame, s.x, s.y);
    else {
      // BLADE: een groene halve-maangolf
      const x = Math.round(s.x), y = Math.round(s.y - Math.floor(camY));
      g.fillStyle = '#21b03b'; g.fillRect(x + 2, y + 2, s.w - 4, 4);
      g.fillStyle = '#5edc78'; g.fillRect(x, y + 3, s.w, 2); g.fillRect(x + 3, y + 1, s.w - 6, 2);
      g.fillStyle = '#ffffff'; g.fillRect(x + 5, y, s.w - 10, 2);
    }
  }
}
function drawBullets() {
  for (const b of ebul) {
    if (b.kind === 'bone') drawSprite(SPR.bone, b.x - 2, b.y - 1);
    else if (b.kind === 'feather') drawSprite(SPR.feather, b.x - 4, b.y - 6);
    else drawSprite(SPR.ebullet[b.kind === 'orb2' ? 1 : (b.t >> 2) & 1], b.x - 3, b.y - 3);
  }
}
function drawItems() {
  for (const it of items) {
    if (it.kind === 'feather') drawSprite(SPR.feather, it.x, it.y + Math.sin(it.t * 0.1) * 2);
    else drawSprite(it.cd ? SPR.crystalW : SPR.crystal[it.c][(it.t >> 4) & 1], it.x, it.y);
  }
}
function drawBoss() {
  const b = boss;
  const fr = (b.t >> 3) & 1;
  const img = b.flash ? SPR.bossW[fr] : SPR.boss[fr];
  if (b.dying && (b.t >> 1) & 1) return;
  // gloeiende aura
  g.fillStyle = 'rgba(255,80,40,0.18)';
  g.beginPath(); g.arc(Math.round(b.x), Math.round(b.y + 24), 36 + Math.sin(b.t * 0.2) * 3, 0, Math.PI * 2); g.fill();
  g.drawImage(img, Math.round(b.x - 32), Math.round(b.y));
}
function drawFx() {
  const cy = Math.floor(camY);
  for (const f of fx) {
    if (f.part) { g.fillStyle = f.col; g.fillRect(Math.round(f.x), Math.round(f.y - cy), 2, 2); continue; }
    const p = f.t / f.max, r = (f.big ? 22 : 12) * Math.sqrt(p);
    const cols = ['#ffffff', '#ffd84a', '#ff8c1a', '#fc5554', '#8a1c1c'];
    g.fillStyle = cols[Math.min(4, (p * 5) | 0)];
    const n = f.big ? 12 : 8;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + f.t * 0.05, s = Math.max(2, Math.round((1 - p) * (f.big ? 6 : 4)));
      g.fillRect(Math.round(f.x + Math.cos(a) * r - s / 2), Math.round(f.y - cy + Math.sin(a) * r - s / 2), s, s);
    }
    if (p < 0.4) { const s = Math.round((0.4 - p) * (f.big ? 30 : 16)); g.fillStyle = '#ffffff'; g.fillRect(Math.round(f.x - s / 2), Math.round(f.y - cy - s / 2), s, s); }
  }
  for (const t of texts) text(t.s, Math.round(t.x), Math.round(t.y - cy), t.col);
}
function drawHud() {
  g.fillStyle = '#000000'; g.fillRect(0, 0, W, HUD);
  text('1P', 4, 2, '#fc5554'); text(pad(G.score, 7), 22, 2);
  text('HI', 140, 2, '#fc5554'); text(pad(G.hi, 7), 158, 2);
  // levens
  g.drawImage(SPR.player[0], 0, 0, 16, 10, 220, 0, 12, 8);
  if (G.infinite) {
    // ∞-teken als pixel-art (het lettertype heeft dit teken niet)
    text('x', 234, 2, '#ffd84a');
    g.fillStyle = '#ffd84a';
    ['.##..##.', '#..##..#', '#..##..#', '.##..##.'].forEach((row, j) => {
      for (let i = 0; i < 8; i++) if (row[i] === '#') g.fillRect(243 + i, 3 + j, 1, 1);
    });
  } else text('x' + Math.min(G.lives, 9), 234, 2, '#ffffff');
  // wapen
  if (P.phoenix) text('PHOENIX', 4, 11, (G.t >> 3) & 1 ? '#ffd84a' : '#ff8c1a');
  else text(WEAPONS[P.weapon] + P.lvl, 4, 11, WCOL[P.weapon]);
  // snelheid
  text('S', 72, 11, '#e6ce80');
  for (let i = 0; i < 3; i++) { g.fillStyle = i < P.speed ? '#e6ce80' : '#333340'; g.fillRect(82 + i * 6, 12, 4, 6); }
  // schild
  text('D', 108, 11, '#cccccc');
  for (let i = 0; i < 3; i++) { g.fillStyle = i < P.shield ? '#ffffff' : '#333340'; g.fillRect(118 + i * 6, 12, 4, 6); }
  // veren
  text('FEATHER', 146, 11, '#ff8c1a');
  for (let i = 0; i < 3; i++) {
    if (i < P.feathers) g.drawImage(SPR.feather, 0, 0, 8, 12, 206 + i * 8, 11, 6, 9);
    else { g.fillStyle = '#333340'; g.fillRect(208 + i * 8, 13, 3, 6); }
  }
  if (boss) {
    g.fillStyle = '#000000'; g.fillRect(0, HUD, W, 10);
    text('DARK PHOENIX', 4, HUD + 1, '#ff7978');
    g.fillStyle = '#4a1010'; g.fillRect(104, HUD + 2, 148, 6);
    g.fillStyle = (G.t >> 2) & 1 && boss.hp < boss.max * 0.33 ? '#ffd84a' : '#fc5554';
    g.fillRect(104, HUD + 2, Math.round(148 * boss.hp / boss.max), 6);
  }
}
function drawTitle() {
  drawMap();
  g.fillStyle = 'rgba(0,0,24,0.72)'; g.fillRect(0, 0, W, H);
  const bird = SPR.titleBird[(G.t >> 4) & 1];
  g.globalAlpha = 0.35; g.drawImage(bird, W / 2 - 48, 30 + Math.sin(G.t * 0.04) * 4); g.globalAlpha = 1;
  g.drawImage(SPR.phoenix[(G.t >> 4) & 1], W / 2 - 16, 6 + Math.round(Math.sin(G.t * 0.04) * 3));
  text('PHOENIX', W / 2 + 2, 52, '#8a1c1c', 'center', 24);
  text('PHOENIX', W / 2, 50, '#ffd84a', 'center', 24);
  text('KNIGHT', W / 2 + 1, 81, '#8a1c1c', 'center', 16);
  text('KNIGHT', W / 2, 80, '#ff8c1a', 'center', 16);
  if ((G.t >> 5) & 1) text('PUSH SPACE KEY', W / 2, 124, '#ffffff', 'center');
  text('ARROWS:MOVE  Z/SPACE:SHOOT', W / 2, 146, '#7d76fc', 'center');
  text('P:PAUSE M:MUTE C:CRT', W / 2, 158, '#7d76fc', 'center');
  text('HI ' + pad(G.hi, 7), W / 2, 176, '#fc5554', 'center');
  text('©2026 MK SOFT', W / 2, 196, '#cccccc', 'center');
  // SCC-badge
  g.fillStyle = '#d4524d'; g.fillRect(212, 192, 40, 14);
  g.fillStyle = '#ffffff'; g.fillRect(213, 193, 38, 12);
  g.fillStyle = '#d4524d'; g.fillRect(214, 194, 36, 10);
  text('SCC', 232, 195, '#ffffff', 'center');
}
function drawCheatMsg() {
  if (G.cheatMsg && (G.t >> 3) & 1) {
    g.fillStyle = 'rgba(0,0,0,0.7)'; g.fillRect(0, 60, W, 14);
    text('INFINITE LIVES!', W / 2, 63, '#ffd84a', 'center');
  }
}
function draw() {
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#000000'; g.fillRect(0, 0, W, H);
  if (G.state === 'title') { drawTitle(); drawCheatMsg(); return; }
  if (G.shake) g.setTransform(1, 0, 0, 1, Math.round(rand(-2, 2)), Math.round(rand(-2, 2)));
  drawMap();
  drawItems();
  for (const e of foes) drawFoe(e);
  if (boss) drawBoss();
  drawShots();
  drawPlayer();
  drawBullets();
  drawFx();
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (G.flash) { g.fillStyle = `rgba(255,255,255,${G.flash / 24})`; g.fillRect(0, 0, W, H); }
  drawHud();
  if (G.warn && (G.t >> 3) & 1) {
    g.fillStyle = 'rgba(140,0,0,0.55)'; g.fillRect(0, 92, W, 28);
    text('WARNING!!', W / 2, 96, '#ffffff', 'center', 16);
  }
  if (G.state === 'intro') {
    g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(0, 84, W, 44);
    text('STAGE ' + G.stage, W / 2, 90, '#ffd84a', 'center', 16);
    text(STAGE_NAMES[(G.stage - 1) % STAGE_NAMES.length], W / 2, 114, '#ffffff', 'center');
  }
  if (G.state === 'play' && G.paused) text('PAUSE', W / 2, 100, '#ffffff', 'center', 16);
  drawCheatMsg();
  if (G.state === 'clear' && G.timer < 380) {
    g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(0, 84, W, 44);
    text('STAGE CLEAR!', W / 2, 90, '#ffd84a', 'center', 16);
    text('BONUS ' + 10000 * G.stage, W / 2, 114, '#ffffff', 'center');
  }
  if (G.state === 'gameover') {
    g.fillStyle = 'rgba(0,0,0,0.7)'; g.fillRect(0, 88, W, 34);
    text('GAME OVER', W / 2, 98, '#fc5554', 'center', 16);
  }
}

// ---------- schaal & lus ----------
function resize() {
  const s = Math.min(innerWidth / W, innerHeight / H);
  const scale = s >= 1 ? Math.floor(s) : s;
  const w = Math.round(W * scale), h = Math.round(H * scale);
  for (const el of [cv, document.getElementById('crt')]) { el.style.width = w + 'px'; el.style.height = h + 'px'; }
  document.getElementById('crt').style.backgroundSize = `100% ${Math.max(2, scale)}px`;
}
addEventListener('resize', resize);
document.addEventListener('visibilitychange', () => { if (document.hidden && G.state === 'play' && !G.paused) togglePause(); });

let last = performance.now(), acc = 0;
function frame(now) {
  acc += Math.min(100, now - last); last = now;
  while (acc >= 1000 / 60) { step(); acc -= 1000 / 60; }
  draw();
  requestAnimationFrame(frame);
}
function boot() {
  buildSprites();
  L = buildLevel(1); camY = L.rows * TS - H;
  P = newPlayer();
  resize();
  requestAnimationFrame(frame);
}
(document.fonts ? document.fonts.load('8px "Press Start 2P"').catch(() => { }) : Promise.resolve()).finally(boot);
