'use strict';
// Pixel-art in het MSX2-palet: 9-bit RGB (3 bits per kanaal = 512 kleuren).
const rgb = (r, g, b) => '#' + [r, g, b].map(v => Math.round(v * 255 / 7).toString(16).padStart(2, '0')).join('');
const PALX = {
  '1': rgb(0, 0, 0), '2': rgb(1, 6, 1), '3': rgb(3, 7, 3), '4': rgb(1, 1, 7), '5': rgb(2, 3, 7),
  '6': rgb(5, 1, 1), '7': rgb(2, 6, 7), '8': rgb(7, 1, 1), '9': rgb(7, 3, 3), 'A': rgb(6, 5, 1),
  'B': rgb(6, 6, 4), 'C': rgb(1, 4, 1), 'D': rgb(6, 2, 5), 'E': rgb(5, 5, 5), 'F': rgb(7, 7, 7),
  'G': rgb(4, 2, 1), 'H': rgb(2, 1, 0), 'I': rgb(2, 2, 3), 'J': rgb(7, 4, 0), 'K': rgb(0, 0, 2),
  'L': rgb(3, 0, 0), 'M': rgb(7, 6, 2), 'N': rgb(1, 3, 1), 'O': rgb(6, 5, 3), 'P': rgb(4, 3, 2),
  'Q': rgb(1, 1, 5), 'R': rgb(7, 6, 5), 'S': rgb(0, 2, 0), 'T': rgb(3, 1, 4), 'U': rgb(1, 0, 2),
  'V': rgb(7, 7, 3), 'W': rgb(3, 4, 6), 'X': rgb(3, 3, 4), 'Y': rgb(6, 6, 7), 'Z': rgb(3, 2, 2),
  'a': rgb(2, 5, 2), 'b': rgb(4, 4, 5), 'c': rgb(5, 2, 0), 'd': rgb(2, 1, 1), 'e': rgb(4, 1, 0),
};
const OUTLINE = rgb(0, 0, 1);
// zet een willekeurige hex-kleur om naar de dichtstbijzijnde MSX2-kleur
function msx2(hex) {
  const n = parseInt(hex.slice(1), 16);
  return rgb(...[n >> 16 & 255, n >> 8 & 255, n & 255].map(v => Math.round(v / 255 * 7)));
}
const col = c => PALX[c] || msx2(c);

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
// rijen met paletcodes -> canvas, met een donkere omlijning zoals MSX2-sprites met een extra 'OR'-laag
function makeSprite(rows, scale = 1, outline = true) {
  rows = padRows(rows);
  const h = rows.length, w = rows[0].length;
  let grid = rows.map(r => [...r].map(ch => PALX[ch] || null));
  if (outline) {
    const o = grid.map(r => r.slice());
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      if (grid[j][i]) continue;
      if ((grid[j - 1] && grid[j - 1][i]) || (grid[j + 1] && grid[j + 1][i]) || grid[j][i - 1] || grid[j][i + 1]) o[j][i] = OUTLINE;
    }
    grid = o;
  }
  const c = canvas(w * scale, h * scale), x = c.getContext('2d');
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    if (grid[j][i]) { x.fillStyle = grid[j][i]; x.fillRect(i * scale, j * scale, scale, scale); }
  }
  return c;
}
// procedurele sprite: fn(i, j) geeft een paletcode of null
function procRows(w, h, fn) {
  const rows = [];
  for (let j = 0; j < h; j++) { let s = ''; for (let i = 0; i < w; i++) s += fn(i, j) || '.'; rows.push(s); }
  return rows;
}
function silhouette(src, color = '#ffffff') {
  const c = canvas(src.width, src.height), x = c.getContext('2d');
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
  return c;
}
function shadowOf(src) { const s = silhouette(src, OUTLINE); return s; }

// ---------- sprite-data ----------
const PLAYER_BODY = [
  '......8998......',
  '.....899998.....',
  '....YEEEEEEY....',
  '...YFFFEEEEbX...',
  '...EFFEEEEEbX...',
  '...EEEbbbbbbX...',
  '....XEEEEEEX....',
  '..OO.XXXXXX.....',
  '.OMMO45555544...',
  '.OMRO57775554G..',
  '.OMMO45555554G..',
  '.OMMO.455554.G..',
  '..OO..444444.G..',
];
const LEGS_A = ['......55.55.....', '......44.55.....', '......II.44.....'];
const LEGS_B = ['......55.55.....', '......55.44.....', '......44.II.....'];

const BAT_A = mirror([
  '........', 'D.......', 'DD......', 'DTD....1', '.DTDD.11',
  '.DDTDD18', '..DDDD11', '...DD.11', '......1.', '........',
]);
const BAT_B = mirror([
  '........', '........', '.......1', '......11', '....DD18',
  '..DTDD11', '.DTDDD11', 'DTDD..11', 'DD....1.', 'D.......',
]);
const FBIRD_HALF = [
  'M.......', 'JM......', 'JJM.....', '.JJM...8', '.JJJM.88',
  '..JJJM8F', '...JJJ88', '....J.88', '......J8', '.......J', '......J.', '.....J..',
];
const FBIRD_A = mirror(FBIRD_HALF);
const FBIRD_B = mirror(shiftCols(FBIRD_HALF, 6, 4));

const SKEL = mirror([
  '....YFFF', '...YFFFF', '...F11FF', '...FFFFF', '....F1F1', '.....FFF', '..FFFFFF',
  '.F..E.F.', '.F..FFFF', '.E..E.F.', '....FFFF', '.....F..', '.....F..', '....FF..',
]);
const DKNIGHT = mirror([
  '.....LL.', '....L888', '...L8988', '...81111', '...81M11', '...L8888', '.XX.L888',
  'XEEXL898', 'XEYX6886', 'XEEX6886', '.XX.6886', '....LL6.', '....L.L.', '...LL.LL',
]);
const WIZARD = mirror([
  '.......D', '......DD', '.....DTD', '....DDTD', '..DDDDDD', '....RRRR', '....R1RR', '....RRRR',
  '...DD555', '..DDD5DD', '.RDTDDDD', '..DTDDDD', '..DDTDDD', '.DDDTDDD', '.DDDDTDD', 'DDDDDDTD',
]);
const SLIME = mirror([
  '........', '........', '........', '........', '........', '........', '.....777', '...77777',
  '..777F77', '.7777777', '.7777177', '77777777', '55555555', '.4444444',
]);
// stage 2
const IMP_A = mirror([
  '.....L..', '.....8L.', '....8888', 'T...8V18', 'TT..8888', 'TTT.8J88',
  'TUTT8888', '.TUT6888', '..T.6666', '....6.66', '....J..6', '........',
]);
const IMP_B = mirror([
  '.....L..', '.....8L.', '....8888', '....8V18', '....8888', '.T..8J88',
  'TTT.8888', 'TUTT6888', 'TUT.6666', 'TT..6.66', 'T...J..6', '........',
]);
const GOLEM = mirror([
  '...IXXXX', '..IXEEXX', '.IXEXXXX', '.IXXJ1XX', '.IXXXXXX', 'IXXbXJJX', 'XEXIXXJX',
  'XXXXIXXX', 'IXbXXJXX', '.IXXXXXX', '..IXX.XX', '..XXX.XX', '.IXXX.XI', '.III..II',
]);
const SKULL_A = mirror([
  '......5.', '.....57.', '....577F', '...5777F', '..EEFFFF', '.EFFFFFF', '.EF11FFF',
  '.EF11FFF', '.EFFFF1F', '..EFFFFF', '...E1F1F', '...EFEFE',
]);
const SKULL_B = mirror([
  '.....5..', '....57..', '...5777.', '...577FF', '..EEFFFF', '.EFFFFFF', '.EF11FFF',
  '.EF11FFF', '.EFFFF1F', '..EFFFFF', '...E1F1F', '...EFEFE',
]);
const FEATHER = [
  '....MM..', '...MJJM.', '..MJJJM.', '..MJ8JM.', '.MJ88J..', '.MJ8JM..',
  'MJ88J...', 'MJ8J....', 'J8J.....', 'JJ......', 'G.......', 'G.......',
];
const EBULLET = ['..88..', '.8998.', '89FF98', '89FF98', '.8998.', '..88..'];
const EBULLET2 = ['..DD..', '.D99D.', 'D9FF9D', 'D9FF9D', '.D99D.', '..DD..'];
const EBULLET3 = ['..JJ..', '.JMMJ.', 'JMVVMJ', 'JMVVMJ', '.JMMJ.', '..JJ..'];
const ARROW = ['.F.', 'FYF', '.E.', '.G.', '.G.', '.G.', '.G.', '.G.', 'E.E', 'E.E'];
const FIREBALL = ['..JJ..', '.JMMJ.', 'JMFFMJ', 'JMFFMJ', '.JMMJ.', '..88..', '...8..'];
const FLAME = ['...MM...', '..MFFM..', '.MFFFFM.', 'JMFFFFMJ', 'JMMFFMMJ', '.JMMMMJ.', '..J88J..', '...88...', '...8....'];
const BONE = ['F..F', 'FFFF', 'F..F'];
const ROCK = ['.XXX.', 'XEXXI', 'XXXJI', 'IXXII', '.III.'];

// Eindbaas 1 "DARK PHOENIX" (linkerhelft, wordt gespiegeld), kolommen 0-9 zijn de vleugel
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

// Eindbaas 2 "MAGMA SERPENT": kop en lijfsegmenten, procedureel getekend
function serpentHead(open) {
  return procRows(32, 32, (i, j) => {
    const nx = (i - 15.5) / 14.5, ny = (j - 13) / 13.5;
    // horens
    if (j < 9 && (Math.abs(i - (6 - j * 0.6)) < 1.2 || Math.abs(i - (25 + j * 0.6)) < 1.2)) return j < 3 ? 'Y' : 'E';
    const narrow = 1 - 0.38 * Math.max(0, ny);
    const d = (nx / narrow) ** 2 + ny ** 2;
    if (d > 1) return null;
    // ogen
    if (j >= 10 && j <= 12 && ((i >= 8 && i <= 11) || (i >= 20 && i <= 23))) return (i === 10 || i === 21) && j > 10 ? '1' : 'V';
    // neusgaten
    if (j === 23 && (i === 13 || i === 18)) return '1';
    // open bek met vuur
    if (open && j >= 21 && Math.abs(i - 15.5) < (j - 19) * 0.9) return j > 24 ? 'V' : 'L';
    if (d > 0.8) return 'L';
    // rugkam
    if (Math.abs(i - 15.5) < 1.2 && j < 20 && j % 3 !== 2) return 'M';
    const l = -nx * 0.6 - ny * 0.8;
    if ((i * 3 + j * 5) % 11 === 0 && d < 0.6) return 'e';
    return l > 0.6 ? 'M' : l > 0.1 ? 'J' : l > -0.4 ? '8' : '6';
  });
}
function serpentSegment() {
  return procRows(20, 20, (i, j) => {
    const nx = (i - 9.5) / 9.5, ny = (j - 9.5) / 9.5, d = nx * nx + ny * ny;
    if (d > 1) return null;
    if (d > 0.75) return 'L';
    if (Math.abs(i - 9.5) < 1.5 && j > 2 && j < 17) return j % 4 === 0 ? 'J' : 'M';
    const l = -nx * 0.6 - ny * 0.8;
    if ((i + j) % 5 === 0 && d < 0.5) return 'e';
    return l > 0.5 ? 'J' : l > -0.2 ? '8' : l > -0.6 ? '6' : 'L';
  });
}

// ---------- tiles ----------
const T = { GRASS: 0, GRASS2: 1, FLOWER: 2, PATH: 3, WATER: 4, BRIDGE: 5, TREE: 6, WALL: 7, PILLAR: 8, FLOOR: 9, FLOOR2: 10, RUBBLE: 11 };
const SOLID = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 0, 0];
const BLOCKSHOT = [0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0];

function tile(seed, fn) {
  const c = canvas(16, 16), x = c.getContext('2d');
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const px = (cc, i, j, w = 1, h = 1) => { x.fillStyle = col(cc); x.fillRect(i, j, w, h); };
  fn(px, rnd);
  return c;
}
// kleurensets per thema: 0 = betoverd bos, 1 = vuurland
const THEMES = [
  { ground: 'C', spk: ['N', '2'], tuft: 'a', path: 'O', pathSpk: ['P', 'B'], pebble: 'G',
    water: '4', waterDeep: 'Q', waterHi: ['5', '7'], bridge: 'G', bridgeLine: 'H', bridgeHi: 'O',
    wall: ['I', 'E', 'F', 'X'], floor: ['X', 'I', 'b', 'U'], shadow: 'S', edge: 'C', bank: ['O', 'P'], foam: '7', rail: ['H', 'O'] },
  { ground: 'Z', spk: ['d', 'H'], tuft: 'X', path: 'I', pathSpk: ['X', 'U'], pebble: 'b',
    water: '8', waterDeep: 'e', waterHi: ['J', 'V'], bridge: 'X', bridgeLine: 'I', bridgeHi: 'b',
    wall: ['U', 'I', 'X', 'T'], floor: ['d', 'H', 'Z', 'L'], shadow: 'd', edge: 'Z', bank: ['H', 'L'], foam: 'M', rail: ['U', 'X'] },
];
function buildTileset(th) {
  const P = THEMES[th], tiles = [];
  const ground = (px, rnd) => {
    px(P.ground, 0, 0, 16, 16);
    for (let k = 0; k < 16; k++) px(P.spk[k & 1], (rnd() * 16) | 0, (rnd() * 16) | 0);
    for (let k = 0; k < 3; k++) {
      const i = 1 + (rnd() * 12) | 0, j = 2 + (rnd() * 11) | 0;
      px(P.tuft, i, j); px(P.tuft, i + 2, j); px(P.tuft, i + 1, j + 1);
    }
    if (th === 1 && rnd() < 0.7) px('J', (rnd() * 16) | 0, (rnd() * 16) | 0);
  };
  const floor = (px, rnd, dark) => {
    const [base, line, hi, crack] = P.floor;
    px(dark ? line : base, 0, 0, 16, 16);
    px(th ? '1' : 'U', 0, 0, 16, 1); px(th ? '1' : 'U', 0, 0, 1, 16);
    px(th ? '1' : 'U', 8, 8, 8, 1); px(th ? '1' : 'U', 8, 0, 1, 8);
    px(hi, 1, 1, 7, 1); px(hi, 1, 1, 1, 7); px(hi, 9, 9, 6, 1); px(hi, 9, 9, 1, 6);
    for (let k = 0; k < 5; k++) px(hi, (rnd() * 16) | 0, (rnd() * 16) | 0);
    if (dark) { px(crack, 3, 5, 1, 3); px(crack, 4, 8, 2, 1); px(crack, 11, 2, 1, 3); px(crack, 12, 5, 1, 1); }
  };
  tiles[T.GRASS] = [tile(1, ground)];
  tiles[T.GRASS2] = [tile(2, (px, rnd) => {
    ground(px, rnd);
    if (th === 1) { px('d', 3, 4, 4, 1); px('d', 7, 5, 3, 1); px('H', 10, 6, 1, 2); px('d', 2, 11, 5, 1); px('b', 3, 3, 3, 1); }
    else for (let k = 0; k < 4; k++) { const i = 1 + (rnd() * 12) | 0, j = 2 + (rnd() * 11) | 0; px('3', i, j); px('2', i + 1, j + 1); }
  })];
  tiles[T.FLOWER] = [tile(3, (px, rnd) => {
    ground(px, rnd);
    if (th === 1) {
      // gloeiende spleet
      [[2, 3], [3, 4], [4, 5], [5, 5], [6, 6], [7, 7], [8, 7], [9, 8], [10, 9], [11, 10], [12, 10], [13, 11]].forEach(([i, j]) => { px('L', i, j - 1); px('J', i, j); px('8', i, j + 1); });
      px('V', 6, 6); px('V', 10, 9);
    } else {
      [[3, 3, 'F'], [10, 6, '9'], [5, 11, 'B'], [12, 12, 'D']].forEach(([i, j, c]) => {
        px(c, i - 1, j); px(c, i + 1, j); px(c, i, j - 1); px(c, i, j + 1); px('A', i, j);
      });
    }
  })];
  tiles[T.PATH] = [tile(4, (px, rnd) => {
    px(P.path, 0, 0, 16, 16);
    for (let k = 0; k < 20; k++) px(P.pathSpk[k % 3 ? 0 : 1], (rnd() * 16) | 0, (rnd() * 16) | 0);
    px(P.pebble, 4, 9, 2, 1); px(P.pebble, 11, 3, 2, 1); px(P.pathSpk[1], 4, 8, 2, 1);
  })];
  tiles[T.WATER] = [tile(5, (px) => {
    px(P.water, 0, 0, 16, 16);
    for (let j = 0; j < 16; j += 4) { px(P.waterDeep, 0, j + 2, 16, 1); px(P.waterDeep, (j * 5) % 16, j + 3, 5, 1); }
    if (th === 1) { px('L', 2, 5, 4, 2); px('e', 3, 6, 2, 1); px('L', 10, 11, 3, 2); }
  })];
  tiles[T.BRIDGE] = [tile(6, (px) => {
    px(P.bridge, 0, 0, 16, 16);
    for (let j = 0; j < 16; j += 4) { px(P.bridgeLine, 0, j + 3, 16, 1); px(P.bridgeHi, 0, j, 16, 1); }
    px(P.bridgeLine, 3, 1); px(P.bridgeLine, 12, 5); px(P.bridgeLine, 7, 9); px(P.bridgeLine, 2, 13);
    if (th === 1) { px('I', 8, 0, 1, 16); }
  })];
  tiles[T.TREE] = [7, 17, 27].map(seed => tile(seed, (px, rnd) => {
    ground(px, rnd);
    if (th === 0) {
      // boomkruin van drie bollen, belicht van linksboven
      const jx = (rnd() - 0.5) * 2, jy = (rnd() - 0.5) * 2;
      const blobs = [[8, 9, 7], [5 + jx, 5.5 + jy, 4.4], [11 - jx, 5.5 - jy, 4.4]];
      for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) {
        let d = 9;
        for (const [bx, by, br] of blobs) d = Math.min(d, Math.hypot(i - bx, j - by) / br);
        if (d > 1) continue;
        const l = -(i - 8) * 0.13 - (j - 8) * 0.16 + (rnd() - 0.5) * 0.7;
        px(d > 0.86 ? 'S' : l > 0.75 ? '3' : l > 0 ? '2' : l > -0.8 ? 'C' : 'N', i, j);
      }
      px('F', 4, 3); px('3', 5, 3);
    } else {
      // knobbelig vulkanisch rotsblok met facetten en een gloeiende ader
      const ph = rnd() * 6, lump = 0.12 + rnd() * 0.1;
      for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) {
        const nx = (i - 7.5) / 7.4, ny = (j - 8) / 7.4;
        const a = Math.atan2(ny, nx), d = Math.hypot(nx, ny) * (1 + lump * Math.sin(a * 3 + ph) + 0.06 * Math.sin(a * 7));
        if (d > 1) continue;
        const facet = Math.sin(a * 2 + ph) * 0.25;
        const l = -nx * 0.65 - ny * 0.75 + facet;
        px(d > 0.88 ? 'd' : l > 0.55 ? 'E' : l > 0.15 ? 'b' : l > -0.35 ? 'X' : 'I', i, j);
      }
      if (rnd() < 0.7) { const i0 = 6 + (rnd() * 4) | 0; px('J', i0, 9); px('J', i0 + 1, 10); px('V', i0 + 1, 11); px('8', i0 + 2, 12); }
      px('Y', 5, 4); px('E', 6, 4);
    }
  }));
  tiles[T.WALL] = [tile(8, (px) => {
    const [mortar, brick, hi, low] = P.wall;
    px(mortar, 0, 0, 16, 16);
    for (let j = 0; j < 16; j += 4) {
      const off = (j / 4) % 2 ? 4 : 0;
      for (let i = -8; i < 16; i += 8) {
        px(brick, i + off + 1, j + 1, 6, 2); px(hi, i + off + 1, j + 1, 6, 1); px(low, i + off + 1, j + 3, 7, 1);
      }
    }
    if (th === 0) { px('N', 2, 13, 3, 1); px('C', 3, 12, 1, 1); px('N', 12, 5, 2, 1); }
    else { px('J', 6, 7, 2, 1); px('8', 13, 11, 1, 1); }
    px('1', 0, 15, 16, 1);
  })];
  tiles[T.PILLAR] = [tile(9, (px, rnd) => {
    floor(px, rnd, false);
    for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) {
      const dx = i - 7.5, dy = j - 7.5, d = Math.hypot(dx, dy);
      if (d > 7) continue;
      const c = th ? (d > 6 ? '1' : dx + dy < -4 ? 'D' : dx + dy > 4 ? 'U' : 'T') : (d > 6 ? 'I' : dx + dy < -4 ? 'F' : dx + dy > 4 ? 'X' : 'E');
      px(c, i, j);
    }
    px(th ? 'U' : 'X', 6, 6, 4, 4); px(th ? 'J' : 'b', 7, 7, 2, 2);
  })];
  tiles[T.FLOOR] = [tile(10, (px, rnd) => floor(px, rnd, false))];
  tiles[T.FLOOR2] = [tile(11, (px, rnd) => floor(px, rnd, true))];
  tiles[T.RUBBLE] = [tile(12, (px, rnd) => {
    ground(px, rnd);
    [[3, 4], [10, 9], [6, 12], [12, 3]].forEach(([i, j]) => { px('1', i, j + 2, 3, 1); px('X', i, j, 3, 2); px('E', i, j, 2, 1); });
  })];
  return tiles;
}

// het hele level wordt vooraf getekend, inclusief randen en schaduwen die van de buren afhangen
function renderLevel(L, th) {
  const P = THEMES[th], set = SPR.tilesets[th];
  const c = canvas(COLS * TS, L.rows * TS), x = c.getContext('2d');
  const at = (cc, r) => (cc < 0 || cc >= COLS || r < 0 || r >= L.rows) ? -1 : L.map[r * COLS + cc];
  const put = (ch, i, j, w = 1, h = 1) => { x.fillStyle = col(ch); x.fillRect(i, j, w, h); };
  const dither = (ch, x0, y0, w, h) => {
    x.fillStyle = col(ch);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if ((x0 + i + y0 + j) % 2 === 0) x.fillRect(x0 + i, y0 + j, 1, 1);
  };
  let s = 12345;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const isObj = t => t === T.TREE || t === T.WALL || t === T.PILLAR;
  for (let r = 0; r < L.rows; r++) for (let cc = 0; cc < COLS; cc++) {
    const v = set[at(cc, r)];
    x.drawImage(v[(cc * 7 + r * 13) % v.length], cc * TS, r * TS);
  }
  for (let r = 0; r < L.rows; r++) for (let cc = 0; cc < COLS; cc++) {
    const t = at(cc, r), X = cc * TS, Y = r * TS;
    if (t !== T.WATER && !SOLID[t]) {
      // slagschaduw: licht valt van linksboven
      if (isObj(at(cc - 1, r))) dither(P.shadow, X, Y + 3, 4, 13);
      if (isObj(at(cc, r - 1))) dither(P.shadow, X + 2, Y, 14, 4);
      if (isObj(at(cc - 1, r - 1))) dither(P.shadow, X, Y, 3, 3);
    }
    if (t === T.PATH) {
      for (const [side, ex] of [[-1, 0], [1, 15]]) {
        const n = at(cc + side, r);
        if (n === T.PATH || n === T.BRIDGE || n === -1) continue;
        for (let j = 0; j < 16; j++) {
          if (rnd() < 0.55) put(P.edge, X + ex, Y + j);
          if (rnd() < 0.2) put(P.edge, X + ex - side, Y + j);
        }
      }
    }
    if (t === T.WATER) {
      const up = at(cc, r - 1), dn = at(cc, r + 1);
      if (up !== T.WATER && up !== T.BRIDGE && up !== -1) { put(P.bank[1], X, Y, 16, 2); put(P.bank[0], X, Y, 16, 1); put(P.foam, X, Y + 2, 16, 1); }
      if (dn !== T.WATER && dn !== T.BRIDGE && dn !== -1) { put(P.foam, X, Y + 13, 16, 1); put(P.bank[1], X, Y + 14, 16, 2); }
    }
    if (t === T.BRIDGE) {
      if (at(cc - 1, r) === T.WATER) { put(P.rail[0], X, Y, 2, 16); put(P.rail[1], X, Y, 1, 16); }
      if (at(cc + 1, r) === T.WATER) { put(P.rail[0], X + 14, Y, 2, 16); put(P.rail[1], X + 14, Y, 1, 16); }
    }
  }
  return c;
}

function crystalSprite(cs, sparkle) {
  return makeSprite(procRows(12, 14, (i, j) => {
    const hw = j < 7 ? j + 1 : 14 - j;
    if (i < 6 - hw || i >= 6 + hw) return null;
    if (sparkle && i === 3 && j === 4) return 'F';
    if (i === 6 - hw || i === 5 + hw) return cs[1];
    if (i === 4 && (j === 4 || j === 5)) return 'F';
    return i < 6 && j < 7 ? cs[2] : (i >= 6 && j >= 7 ? cs[1] : cs[0]);
  }));
}
const CRYSTAL_COLS = [['5', '4', 'Y'], ['8', '6', '9'], ['3', 'C', 'F'], ['E', 'X', 'F'], ['B', 'A', 'V']];

const SPR = {};
function buildSprites() {
  SPR.player = [makeSprite(PLAYER_BODY.concat(LEGS_A)), makeSprite(PLAYER_BODY.concat(LEGS_B))];
  SPR.bat = [makeSprite(BAT_A), makeSprite(BAT_B)];
  SPR.fbird = [makeSprite(FBIRD_A), makeSprite(FBIRD_B)];
  SPR.skel = [makeSprite(SKEL)];
  SPR.knight = [makeSprite(DKNIGHT)];
  SPR.wizard = [makeSprite(WIZARD)];
  SPR.slime = [makeSprite(SLIME)];
  SPR.imp = [makeSprite(IMP_A), makeSprite(IMP_B)];
  SPR.golem = [makeSprite(GOLEM)];
  SPR.skull = [makeSprite(SKULL_A), makeSprite(SKULL_B)];
  SPR.snake = [makeSprite(procRows(12, 12, (i, j) => {
    const nx = (i - 5.5) / 5.5, ny = (j - 6) / 6, d = nx * nx + ny * ny;
    if (d > 1) return null;
    if (j >= 3 && j <= 4 && (i === 3 || i === 8)) return '1';
    return d > 0.7 ? 'e' : -nx - ny > 0.5 ? 'M' : 'J';
  }))];
  SPR.snakeBody = makeSprite(procRows(10, 10, (i, j) => {
    const nx = (i - 4.5) / 4.5, ny = (j - 4.5) / 4.5, d = nx * nx + ny * ny;
    if (d > 1) return null;
    return d > 0.65 ? 'e' : -nx - ny > 0.4 ? 'J' : (i + j) % 3 ? '8' : 'c';
  }));
  for (const k of ['bat', 'fbird', 'skel', 'knight', 'wizard', 'slime', 'imp', 'golem', 'skull', 'snake']) SPR[k + 'W'] = SPR[k].map(s => silhouette(s));
  SPR.feather = makeSprite(FEATHER);
  SPR.ebullet = [makeSprite(EBULLET), makeSprite(EBULLET2), makeSprite(EBULLET3)];
  SPR.arrow = makeSprite(ARROW);
  SPR.fireball = makeSprite(FIREBALL);
  SPR.flame = makeSprite(FLAME);
  SPR.bone = makeSprite(BONE);
  SPR.rock = makeSprite(ROCK);
  SPR.boss = [makeSprite(BOSS_A, 2), makeSprite(BOSS_B, 2)];
  SPR.bossW = SPR.boss.map(s => silhouette(s));
  SPR.serpHead = [makeSprite(serpentHead(false)), makeSprite(serpentHead(true))];
  SPR.serpHeadW = SPR.serpHead.map(s => silhouette(s));
  SPR.serpSeg = makeSprite(serpentSegment());
  SPR.phoenix = [makeSprite(recolor(BOSS_A, PHX_MAP)), makeSprite(recolor(BOSS_B, PHX_MAP))];
  SPR.titleBird = [makeSprite(recolor(BOSS_A, PHX_MAP), 3), makeSprite(recolor(BOSS_B, PHX_MAP), 3)];
  SPR.crystal = CRYSTAL_COLS.map(cs => [crystalSprite(cs, false), crystalSprite(cs, true)]);
  SPR.crystalW = silhouette(SPR.crystal[0][0]);
  SPR.tilesets = [buildTileset(0), buildTileset(1)];
  // schaduwen voor vliegende figuren
  SPR.shadow = {};
  for (const k of ['bat', 'fbird', 'imp', 'skull', 'phoenix']) SPR.shadow[k] = shadowOf(SPR[k][0]);
  SPR.shadow.boss = shadowOf(SPR.boss[0]);
  SPR.shadow.serpHead = shadowOf(SPR.serpHead[0]);
  SPR.shadow.serpSeg = shadowOf(SPR.serpSeg);
}
