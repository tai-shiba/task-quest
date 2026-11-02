// ドット絵の定義（勇者・モンスター・昼の背景）。app.js より先に読み込む。

/* ドット絵（文字の並びを1マス1色で描く） */
// 勇者: 全身よろいの騎士。2コマ目は剣の光（w）だけ明るく（v）して、ゆらめかせる
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
  { // ドラゴン系: 翼を広げた赤い竜（横向き）
    size: 0.65,   // ドットが多いぶん、1マスを小さく描いてほかと大きさをそろえる
    map: [
      '................A......................',
      '...............ABA.......A.............',
      '...............ABBA.....ABA............',
      '...............ABCBA...ABBA...A........',
      '...............ABCCBA.ABCBA..ABA.......',
      '................ABCCBABCCBA.ABBA.......',
      '....AA..........ABCCCBBCCBAABCBA.......',
      '...ADDAAA........ABCCCBCCCBABCBA.......',
      '...AADDEEAAA.....ABCCCCBCCCBBCCBA...A..',
      '..AEEBBBBEEEAA....ABCCCBCCCCBCCBA..ABA.',
      '.AEEEEFGEEEEEEA...ABCCCCBCCCBCBA..ABBBA',
      'AEEEEEEEEEEEEEEA...ABCCCCBCCBCBA.ABEBA.',
      'AEDEDEDEEEEEEEEEA..ABCCCCCBCCBA..AEEA..',
      'AHHHHHHHEEEEEEEEA.A.ABBBBBBBBA..AEEA...',
      'AIDIDIIIIEEEEEEEEABAABAAAAAAA..AEEEA...',
      '.AIIIIIIIAEEEEEEEEEEEEEEEAA...AEEEA....',
      '..AAAAAAA.AEEEEEEEEEEEEEEEEAAAEEEA.....',
      '...........AEEIIIIEEEEEEEEEEEEEEA......',
      '..........AEEEIIIIIEEEEEEEEEEEEA.......',
      '..........AEEIIIIIIIEEEEEEEEEEEA.......',
      '..........AEEIIIIIIIEEEEEEEEEEEA.......',
      '...........AEIIIIIIEEEEEEEEEEAA........',
      '............AEEEEEEEEEEEEEEAA..........',
      '............AEEEEAAAAAAEEEEEA..........',
      '............AEEEEEA...AEEEEEEA.........',
      '............ADEDEDA...ADEDEDEA.........',
      '.............AAAAA.....AAAAAA..........',
    ],
    pal: { A: '#140c1c', B: '#7a1410', C: '#9a2418', D: '#ffffff', E: '#d8402a', F: '#111111', G: '#ffe14a', H: '#3a0808', I: '#ecd47a' },
  },
  { // 悪魔系: 空を飛ぶ小悪魔
    fly: true,
    map: [
      '......KK..KK......',
      '.....KwK..KwK.....',
      'K....KRKKKKRK....K',
      'VK..KRRRRRRRRK..KV',
      'VVK.KRyKRRyKRK.KVV',
      'VVVKKRRRRRRRRKKVVV',
      'VvVVKRRwKKwRRKVVvV',
      '.VvVVKRRRRRRKVVvV.',
      '..VvVVKRRRRKVVvV..',
      '...VV.KRRRRK.VV...',
      '......KRKKRK..KK..',
      '.....KrK..KrKKrK..',
      '.....KK....KKK....',
    ],
    pal: { K: '#1a1020', R: '#d84a4a', r: '#8a1a1a', V: '#6a3a9a', v: '#3a1a5a', w: '#ffffff', y: '#ffe14a' },
  },
  { // スライム系: 紫のゼリー
    map: [
      '.....KKKKKK.....',
      '...KKJJJJJJKK...',
      '..KJJwwJJJJJJK..',
      '.KJJwJJJJJJJJJK.',
      '.KJJJJJJJJJJJJK.',
      'KJJJJkJJJJkJJJJK',
      'KJJJJkJJJJkJJJJK',
      'KJJJJJJkkJJJJJJK',
      'KjJJJJJJJJJJJJjK',
      'KjjJJJJJJJJJJjjK',
      '.KjjjjjjjjjjjjK.',
      '..KKKKKKKKKKKK..',
    ],
    pal: { K: '#1a1020', J: '#a85ef0', j: '#6a2ab0', w: '#f2e2ff', k: '#2a0a4a' },
  },
  { // 植物系: 歯の生えた食人花
    map: [
      '....KKKKKK....',
      '..KKPPPPPPKK..',
      '.KPPyPPPPyPPK.',
      'KPPPPPPPPPPPPK',
      'KPwKwKwKwKwPPK',
      'KKrrrrrrrrrrKK',
      'KPwKwKwKwKwPPK',
      '.KPPPPPPPPPPK.',
      '..KKpPPPPpKK..',
      '....KKllKK....',
      '.KK..KlLK..KK.',
      'KLLK.KlLK.KLLK',
      'KLLLKKlLKKLLLK',
      '.KLLLLlLLLLLK.',
      '..KKKKlLKKKK..',
      '....KKKKKK....',
    ],
    pal: { K: '#1a1020', P: '#d84a8a', p: '#8a1a4a', w: '#ffffff', r: '#6a0a1a', L: '#4ab84a', l: '#1f6a2a', y: '#ffe14a' },
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

function drawSprite({ map, pal, size = 1 }) {
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
  c.style.width = `calc(${w} * ${size} * var(--px))`;
  c.style.height = `calc(${h} * ${size} * var(--px))`;
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
