// ドット絵の定義（勇者・モンスター・昼の背景）。app.js より先に読み込む。

/* ドット絵（文字の並びを1マス1色で描く） */
// 2コマ目は剣の光（w）だけ明るく（v）して、ゆらめかせる
const KNIGHT = [
  '...........KK.....KK..',
  '..........KpPK...KWwK.',
  '.........KppK....KWwK.',
  '.......KKKKKKKK..KWwK.',
  '......KMMMMMMMMK.KWwK.',
  '.....KMMnMMMMMMMKKWwK.',
  '.....KMMMMMMMMMMKKWwK.',
  '.....KMKKKKKKKKMKKWwK.',
  '.....KMMMMMKMMMMKKWwK.',
  '.....KnMMMMKMMMnKKWwK.',
  '......KnMMMMMMnK.KWwK.',
  '.....KCKKKKKKKKKKYYYYK',
  'KKKKKKKYYYYYYYYYK.KyK.',
  'KMMMMMKAAAYYAAAAAKss..',
  'KMAYAMKAAYYYYAAAAKss..',
  'KMYYYMKAAAYYAAAAAKKCK.',
  'KMAYAMKAAAAAAAAaKCCcK.',
  'KMMMMMKYYYYYYYYYKCCcK.',
  'CKMMMKKLLLK.KLLLKCCCcK',
  'CCKMKKBBBBK.KBBBBKCCcK',
  'CCcK.KKKKKK.KKKKKKKKKK',
  'KKKK..................',
];
const HERO = {
  frames: [KNIGHT, KNIGHT.map((r) => r.replace(/w/g, 'v'))],
  pal: { K: '#1a1020', s: '#f5c49c', A: '#2f5fd0', a: '#1d3a8a', Y: '#e8b830', y: '#8a5a1a', W: '#f4ffff', w: '#7fdfff', L: '#c9d2dc', B: '#5a3412', M: '#d0d8e2', n: '#8b97a6', p: '#3a6ee8', P: '#9cc0ff', C: '#a0182e', c: '#6a0f20', v: '#c8f6ff' },
};
const MONSTERS = [
  { // 一つ目のもこもこ
    map: [
      '..mmmmmm..',
      '.mmmmmmmm.',
      'mmmwwwmmmm',
      'mmwwkwwmmm',
      'mmmwwwmmmm',
      'mmmmmmmmmm',
      'mmmtmtmtmm',
      '.mmmmmmmm.',
      '.m.m..m.m.',
    ],
    pal: { m: '#9b59d0', w: '#ffffff', k: '#111111', t: '#ffffff' },
  },
  { // きのこ
    map: [
      '...RRRR...',
      '.RRwRRRRR.',
      'RRRRRRwRRR',
      'RwRRRRRRRR',
      '.RRRRRRRR.',
      '...ssss...',
      '..skssks..',
      '..ssmmss..',
      '...ssss...',
      '..o....o..',
    ],
    pal: { R: '#e0402f', w: '#ffffff', s: '#f3dfc0', k: '#111111', m: '#7a2a1a', o: '#5a3a1a' },
  },
  { // コウモリ
    fly: true,
    map: [
      'v..........v',
      'vv...vv...vv',
      'vvv.vvvv.vvv',
      'vvvvvyvyvvvv',
      '.vvvvvvvvvv.',
      '..vvvwwvvv..',
      '..v..vv..v..',
    ],
    pal: { v: '#6a46a8', y: '#ffe14a', w: '#ffffff' },
  },
  { // いわ
    map: [
      '...gggg...',
      '.gggggggg.',
      'gggGggggGg',
      'ggykggykgg',
      'gggggggggg',
      'gGggGGggGg',
      '.gggggggg.',
      '.oo....oo.',
    ],
    pal: { g: '#9a9aa6', G: '#64646f', y: '#ffffff', k: '#c0302a', o: '#4a4a52' },
  },
];
const spriteCache = new Map();
function sprite(def) {
  if (!spriteCache.has(def.map)) spriteCache.set(def.map, drawSprite(def));
  const src = spriteCache.get(def.map);
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  c.getContext('2d').drawImage(src, 0, 0);
  c.className = src.className;
  c.style.cssText = src.style.cssText;
  return c;
}

function drawSprite({ map, pal }) {
  const h = map.length;
  const w = Math.max(...map.map((r) => r.length));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  map.forEach((row, y) => [...row].forEach((ch, x) => {
    if (!pal[ch]) return;
    g.fillStyle = pal[ch];
    g.fillRect(x, y, 1, 1);
  }));
  c.className = 'sprite';
  c.style.width = `calc(${w} * var(--px))`;
  c.style.height = `calc(${h} * var(--px))`;
  return c;
}

const monsterOf = (task) => MONSTERS[Math.abs(Number(task.id)) % MONSTERS.length];

/* フィールドの背景（山・木・雲）をつくる */
function buildScene() {
  // 階段状の山の輪郭
  const hill = (seed, amp) => {
    const pts = ['0% 100%'];
    for (let x = 0; x <= 100; x += 2) {
      const y = 55 - amp * Math.sin(x / 9 + seed) - amp * 0.5 * Math.sin(x / 4 + seed * 2);
      const q = Math.round(y / 10) * 10;
      pts.push(`${x}% ${q}%`, `${x + 2}% ${q}%`);
    }
    pts.push('100% 100%');
    return `polygon(${pts.join(',')})`;
  };
  document.getElementById('hillsFar').style.clipPath = hill(1.3, 40);
  document.getElementById('hills').style.clipPath = hill(4.1, 30);

  // 木
  for (const [x, y, sc] of [[6, 60, 1], [11, 62, .8], [78, 59, 1.1], [86, 61, .9], [92, 60, 1], [3, 84, 1.6], [9, 90, 1.3], [90, 86, 1.7], [95, 91, 1.2], [50, 93, 1.1]]) {
    const t = document.createElement('div');
    t.className = 'tree';
    t.style.left = x + '%';
    t.style.top = y + '%';
    t.style.transform = `scale(${sc})`;
    document.getElementById('scene').append(t);
  }

  // ドット絵の雲
  const shape = ['...XXXX....', '.XXXXXXXXX.', 'XXXXXXXXXXX', '.ooooooooo.'];
  const u = 16;
  const shadows = [];
  shape.forEach((row, y) => [...row].forEach((c, x) => {
    if (c === 'X') shadows.push(`${x * u}px ${y * u}px 0 #fff`);
    if (c === 'o') shadows.push(`${x * u}px ${y * u}px 0 #d6ebfb`);
  }));
  for (const [top, dur, delay, sc] of [[8, 140, -20, 1], [20, 190, -120, .7], [32, 160, -70, .85], [12, 220, -170, .6]]) {
    const c = document.createElement('div');
    c.className = 'cloud';
    c.style.top = top + '%';
    c.style.boxShadow = shadows.join(',');
    c.style.background = 'transparent';
    c.style.animationDuration = dur + 's';
    c.style.animationDelay = delay + 's';
    c.style.scale = sc;
    document.getElementById('scene').append(c);
  }
}
