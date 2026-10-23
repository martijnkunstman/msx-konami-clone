'use strict';
// Pixel-art: MSX1-palet (TMS9918) plus een paar extra MSX2-kleuren.
const PALX = {
  '1': '#000000', '2': '#21c842', '3': '#5edc78', '4': '#5455ed', '5': '#7d76fc', '6': '#d4524d',
  '7': '#42ebf5', '8': '#fc5554', '9': '#ff7978', 'A': '#d4c154', 'B': '#e6ce80', 'C': '#21b03b',
  'D': '#c95bba', 'E': '#cccccc', 'F': '#ffffff',
  // MSX2-extra's
  'G': '#8b5a2b', 'H': '#4a2c14', 'I': '#555566', 'J': '#ff8c1a', 'K': '#1c1c4c', 'L': '#8a1c1c',
  'M': '#ffd84a', 'N': '#2f6e2f', 'O': '#c8a060', 'P': '#9a7840', 'Q': '#2a3ab8', 'R': '#ffd8b0',
};

function padRows(rows) { const w = Math.max(...rows.map(r => r.length)); return rows.map(r => r.padEnd(w, '.')); }
function mirror(half) { return padRows(half).map(r => r + [...r].reverse().join('')); }
function recolor(rows, map) { return rows.map(r => [...r].map(ch => map[ch] ?? ch).join('')); }
// verschuif de kolommen links van maxCol (vleugels) dy rijen
function shiftCols(rows, maxCol, dy) {
  rows = padRows(rows);
  return rows.map((r, j) => [...r].map((ch, i) => {
    if (i >= maxCol) return ch;
    const sj = j - dy;
    return sj >= 0 && sj < rows.length ? rows[sj][i] : '.';
  }).join(''));
}
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function makeSprite(rows, scale = 1) {
  rows = padRows(rows);
  const c = canvas(rows[0].length * scale, rows.length * scale), x = c.getContext('2d');
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const col = PALX[row[i]];
      if (col) { x.fillStyle = col; x.fillRect(i * scale, j * scale, scale, scale); }
    }
  });
  return c;
}
function silhouette(src, color = '#ffffff') {
  const c = canvas(src.width, src.height), x = c.getContext('2d');
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
  return c;
}

// ---------- sprite-data ----------
const PLAYER_BODY = [
  '......8888......',
  '.....889988.....',
  '....EEEEEEEE....',
  '...EEFFFEEEEE...',
  '...EFFEEEEEEI...',
  '...EEEEEEEEEI...',
  '....IEEEEEEI....',
  '..OO.IIIIII.....',
  '.OMMO45555544...',
  '.OMMO55775554G..',
  '.OMMO45555554G..',
  '.OMMO.455554.G..',
  '..OO..444444.G..',
];
const LEGS_A = ['......55.55.....', '......44.55.....', '.........44.....'];
const LEGS_B = ['......55.55.....', '......55.44.....', '......44........'];

const BAT_A = mirror([
  '........', 'D.......', 'DD......', 'DDD....1', '.DDDD.11',
  '.DDDDD18', '..DDDD11', '...DD.11', '......1.', '........',
]);
const BAT_B = mirror([
  '........', '........', '.......1', '......11', '....DD18',
  '..DDDD11', '.DDDDD11', 'DDDD..11', 'DD....1.', 'D.......',
]);
const FBIRD_HALF = [
  'M.......', 'JM......', 'JJM.....', '.JJM...8', '.JJJM.88',
  '..JJJM8F', '...JJJ88', '....J.88', '......J8', '.......J', '......J.', '.....J..',
];
const FBIRD_A = mirror(FBIRD_HALF);
const FBIRD_B = mirror(shiftCols(FBIRD_HALF, 6, 4));

const SKEL = mirror([
  '....EFFF', '...EFFFF', '...F11FF', '...FFFFF', '....F1F1', '.....FFF', '..FFFFFF',
  '.F..F.F.', '.F..FFFF', '.E..F.F.', '....FFFF', '.....F..', '.....F..', '....FF..',
]);
const DKNIGHT = mirror([
  '.....LL.', '....L888', '...L8888', '...81111', '...81M11', '...L8888', '.II.L888',
  'IEEIL888', 'IEEI6886', 'IEEI6886', '.II.6886', '....LL6.', '....L.L.', '...LL.LL',
]);
const WIZARD = mirror([
  '.......D', '......DD', '.....DDD', '....DDDD', '..DDDDDD', '....RRRR', '....R1RR', '....RRRR',
  '...DD555', '..DDD5DD', '.RDDDDDD', '..DDDDDD', '..DDDDDD', '.DDDDDDD', '.DDDDDDD', 'DDDDDDDD',
]);
const SLIME = mirror([
  '........', '........', '........', '........', '........', '........', '.....777', '...77777',
  '..777F77', '.7777777', '.7777177', '77777777', '55555555', '.4444444',
]);
const FEATHER = [
  '....MM..', '...MJJM.', '..MJJJM.', '..MJ8JM.', '.MJ88J..', '.MJ8JM..',
  'MJ88J...', 'MJ8J....', 'J8J.....', 'JJ......', 'G.......', 'G.......',
];
const EBULLET = ['..88..', '.8998.', '89FF98', '89FF98', '.8998.', '..88..'];
const EBULLET2 = ['..DD..', '.D99D.', 'D9FF9D', 'D9FF9D', '.D99D.', '..DD..'];
const ARROW = ['.F.', 'FFF', '.E.', '.G.', '.G.', '.G.', '.G.', '.G.', 'E.E', 'E.E'];
const FIREBALL = ['..JJ..', '.JMMJ.', 'JMFFMJ', 'JMFFMJ', '.JMMJ.', '..88..', '...8..'];
const FLAME = ['...MM...', '..MFFM..', '.MFFFFM.', 'JMFFFFMJ', 'JMMFFMMJ', '.JMMMMJ.', '..J88J..', '...88...', '...8....'];
const BONE = ['F..F', 'FFFF', 'F..F'];

// Eindbaas "DARK PHOENIX" (linkerhelft, wordt gespiegeld), kolommen 0-9 zijn de vleugel
const BOSS_HALF = [
  'LL..............', 'L8L.............', 'L88L........M.M.', '.L88L.......MMMM',
  '.L898L.....L8888', '..L898L...L88888', '..L8998L.L888F18', '...L8998LL888888',
  '...L89998L8888JJ', '....L89998L888JJ', '....L899998L888J', '.....L89999L6666',
  '.....L899998L666', '......L89999L666', '......LL8999L666', '.......LLL89L666',
  '..........LL6666', '...........L6696', '...........L6996', '............L699',
  '...........L8L69', '..........L8.L69', '.........L8...L9', '..........L....J',
];
const BOSS_A = mirror(BOSS_HALF);
const BOSS_B = mirror(shiftCols(BOSS_HALF, 10, 4));
const PHX_MAP = { L: '8', '8': 'J', '9': 'M', '6': 'J', J: 'F' };

// ---------- tiles ----------
const T = { GRASS: 0, GRASS2: 1, FLOWER: 2, PATH: 3, WATER: 4, BRIDGE: 5, TREE: 6, WALL: 7, PILLAR: 8, FLOOR: 9, FLOOR2: 10, RUBBLE: 11 };
const SOLID = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 0, 0];
const BLOCKSHOT = [0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0];

function tile(seed, fn) {
  const c = canvas(16, 16), x = c.getContext('2d');
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const px = (col, i, j, w = 1, h = 1) => { x.fillStyle = PALX[col] || col; x.fillRect(i, j, w, h); };
  fn(px, rnd, x);
  return c;
}
function grassBase(px, rnd) {
  px('C', 0, 0, 16, 16);
  for (let k = 0; k < 14; k++) px(rnd() < 0.5 ? 'N' : '2', (rnd() * 16) | 0, (rnd() * 16) | 0);
}
function stoneFloor(px, rnd, dark) {
  px(dark ? '#4a4a5c' : '#5d5d70', 0, 0, 16, 16);
  px('#3a3a48', 0, 0, 16, 1); px('#3a3a48', 0, 0, 1, 16); px('#3a3a48', 8, 8, 8, 1); px('#3a3a48', 8, 0, 1, 8);
  px('#7a7a8c', 1, 1, 7, 1); px('#7a7a8c', 9, 9, 6, 1);
  for (let k = 0; k < 5; k++) px('#6c6c80', (rnd() * 16) | 0, (rnd() * 16) | 0);
  if (dark) { px('#2e2e3a', 3, 5, 1, 3); px('#2e2e3a', 4, 8, 2, 1); px('#2e2e3a', 11, 2, 1, 3); }
}
function buildTiles() {
  const tiles = [];
  tiles[T.GRASS] = [tile(1, grassBase)];
  tiles[T.GRASS2] = [tile(2, (px, rnd) => {
    grassBase(px, rnd);
    for (let k = 0; k < 4; k++) { const i = 1 + (rnd() * 12) | 0, j = 2 + (rnd() * 11) | 0; px('3', i, j); px('3', i + 2, j); px('3', i + 1, j + 1); }
  })];
  tiles[T.FLOWER] = [tile(3, (px, rnd) => {
    grassBase(px, rnd);
    [[3, 3, 'F'], [10, 6, '9'], [5, 11, 'B'], [12, 12, 'F']].forEach(([i, j, c]) => {
      px(c, i - 1, j); px(c, i + 1, j); px(c, i, j - 1); px(c, i, j + 1); px('A', i, j);
    });
  })];
  tiles[T.PATH] = [tile(4, (px, rnd) => {
    px('O', 0, 0, 16, 16);
    for (let k = 0; k < 18; k++) px(rnd() < 0.7 ? 'P' : 'B', (rnd() * 16) | 0, (rnd() * 16) | 0);
    px('G', 4, 9, 2, 1); px('G', 11, 3, 2, 1);
  })];
  tiles[T.WATER] = [0, 1].map(f => tile(5, (px, rnd) => {
    px('4', 0, 0, 16, 16);
    for (let j = 0; j < 16; j += 4) {
      const o = (j * 3 + f * 4) % 16;
      px('Q', 0, j + 2, 16, 1);
      px('7', o, j, 4, 1); px('5', (o + 8) % 16, j + 1, 3, 1);
    }
  }));
  tiles[T.BRIDGE] = [tile(6, (px, rnd) => {
    px('G', 0, 0, 16, 16);
    for (let j = 0; j < 16; j += 4) { px('H', 0, j + 3, 16, 1); px('O', 0, j, 16, 1); }
    px('H', 3, 1, 1, 1); px('H', 12, 5, 1, 1); px('H', 7, 9, 1, 1); px('H', 2, 13, 1, 1);
  })];
  tiles[T.TREE] = [tile(7, (px, rnd) => {
    grassBase(px, rnd);
    for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) {
      const dx = i - 7.5, dy = j - 7.5, d = Math.hypot(dx, dy);
      if (d > 7.8) continue;
      let c = '2';
      if (d > 6.6) c = '#0b3d0b';
      else if (dx + dy < -5) c = '3';
      else if (dx + dy > 5) c = 'N';
      else if (rnd() < 0.18) c = rnd() < 0.5 ? '3' : 'N';
      px(c, i, j);
    }
    px('F', 4, 4); px('3', 5, 3, 2, 1);
  })];
  tiles[T.WALL] = [tile(8, (px, rnd) => {
    px('I', 0, 0, 16, 16);
    for (let j = 0; j < 16; j += 4) {
      const off = (j / 4) % 2 ? 4 : 0;
      for (let i = -8; i < 16; i += 8) {
        px('E', i + off + 1, j + 1, 6, 2); px('F', i + off + 1, j + 1, 6, 1); px('#8f8f9e', i + off + 1, j + 3, 7, 1);
      }
    }
    px('#333340', 0, 15, 16, 1);
  })];
  tiles[T.PILLAR] = [tile(9, (px, rnd, x) => {
    stoneFloor(px, rnd, false);
    for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) {
      const dx = i - 7.5, dy = j - 7.5, d = Math.hypot(dx, dy);
      if (d > 7) continue;
      px(d > 6 ? '#333340' : dx + dy < -4 ? 'F' : dx + dy > 4 ? 'I' : 'E', i, j);
    }
    px('I', 6, 6, 4, 4); px('#8f8f9e', 7, 7, 2, 2);
  })];
  tiles[T.FLOOR] = [tile(10, (px, rnd) => stoneFloor(px, rnd, false))];
  tiles[T.FLOOR2] = [tile(11, (px, rnd) => stoneFloor(px, rnd, true))];
  tiles[T.RUBBLE] = [tile(12, (px, rnd) => {
    grassBase(px, rnd);
    [[3, 4], [10, 9], [6, 12], [12, 3]].forEach(([i, j]) => { px('I', i, j, 3, 2); px('E', i, j, 2, 1); });
  })];
  return tiles;
}

function crystalSprite(cols, sparkle) {
  const c = canvas(12, 14), x = c.getContext('2d');
  for (let j = 0; j < 14; j++) {
    const hw = j < 7 ? j + 1 : 14 - j;
    for (let i = 6 - hw; i < 6 + hw; i++) {
      const edge = i === 6 - hw || i === 5 + hw;
      x.fillStyle = edge ? cols[1] : (i < 6 && j < 7 ? cols[2] : cols[0]);
      x.fillRect(i, j, 1, 1);
    }
  }
  x.fillStyle = '#ffffff';
  x.fillRect(4, 4, 1, 2);
  if (sparkle) { x.fillRect(3, 3, 1, 1); x.fillRect(5, 3, 1, 1); x.fillRect(4, 2, 1, 1); }
  return c;
}
const CRYSTAL_COLS = [
  ['#7d76fc', '#3a36b8', '#c0bcff'], // ARROW
  ['#fc5554', '#a02020', '#ffb0a8'], // FIRE
  ['#5edc78', '#178a2c', '#c8ffd0'], // BLADE
  ['#e8e8e8', '#8f8f9e', '#ffffff'], // SHIELD
  ['#e6ce80', '#a08a30', '#fff4c8'], // SPEED
];

const SPR = {};
function buildSprites() {
  SPR.player = [makeSprite(PLAYER_BODY.concat(LEGS_A)), makeSprite(PLAYER_BODY.concat(LEGS_B))];
  SPR.playerW = SPR.player.map(s => silhouette(s));
  SPR.bat = [makeSprite(BAT_A), makeSprite(BAT_B)];
  SPR.fbird = [makeSprite(FBIRD_A), makeSprite(FBIRD_B)];
  SPR.skel = [makeSprite(SKEL)];
  SPR.knight = [makeSprite(DKNIGHT)];
  SPR.wizard = [makeSprite(WIZARD)];
  SPR.slime = [makeSprite(SLIME)];
  for (const k of ['bat', 'fbird', 'skel', 'knight', 'wizard', 'slime']) SPR[k + 'W'] = SPR[k].map(s => silhouette(s));
  SPR.feather = makeSprite(FEATHER);
  SPR.ebullet = [makeSprite(EBULLET), makeSprite(EBULLET2)];
  SPR.arrow = makeSprite(ARROW);
  SPR.fireball = makeSprite(FIREBALL);
  SPR.flame = makeSprite(FLAME);
  SPR.bone = makeSprite(BONE);
  SPR.boss = [makeSprite(BOSS_A, 2), makeSprite(BOSS_B, 2)];
  SPR.bossW = SPR.boss.map(s => silhouette(s));
  SPR.phoenix = [makeSprite(recolor(BOSS_A, PHX_MAP)), makeSprite(recolor(BOSS_B, PHX_MAP))];
  SPR.titleBird = [makeSprite(recolor(BOSS_A, PHX_MAP), 3), makeSprite(recolor(BOSS_B, PHX_MAP), 3)];
  SPR.crystal = CRYSTAL_COLS.map(cols => [crystalSprite(cols, false), crystalSprite(cols, true)]);
  SPR.crystalW = silhouette(SPR.crystal[0][0]);
  SPR.tiles = buildTiles();
}
