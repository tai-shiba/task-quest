// 今日のクエスト: 保存・日付の切り替え・一覧・戦闘シーン・きろく。sprites.js の後に読み込む。

const KEY = 'today-board';
const LOG_KEY = 'today-board-history';
const THEME_KEY = 'today-board-theme';
const WEEK = '日月火水木金土';
const $ = (id) => document.getElementById(id);
const pad = (n) => String(n).padStart(2, '0');

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; }
}

let state = load() || { date: todayStr(), tasks: [] };
let justAdded = null;   // 追加した直後の行（あらわれる動き）
let justDone = null;    // 済にした直後の行（CLEAR! の動き）
let battleFx = {};      // 戦闘シーンの動き（slay: 倒す / spawn: 出てくる）
let dragId = null;      // ドラッグ中のクエスト
let editing = false;    // 編集中は描き直さない（入力中の文字を消さないため）
let pendingReload = false; // 編集中にほかのタブで保存された

// 0時をまたいだ直後の操作も今日の分として扱う。対象が前の日に済んで消えていたら何もしない
function stillHere(task) {
  if (rollover()) justAdded = justDone = null;
  if (state.tasks.includes(task)) return true;
  render();
  return false;
}

function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
}

function loadLog() {
  try { return JSON.parse(localStorage.getItem(LOG_KEY)) || []; } catch { return []; }
}

// 終わった日の中身（済・やり残しとも）をきろくに入れる
function archive(day) {
  if (!day.tasks.length) return;
  const log = loadLog().filter((x) => x.date !== day.date);
  log.push({ date: day.date, tasks: day.tasks.map(({ text, done }) => ({ text, done })) });
  log.sort((a, b) => a.date.localeCompare(b.date));
  localStorage.setItem(LOG_KEY, JSON.stringify(log));
}

// 日付が変わっていたら、前の日をきろくに入れ、終わったものを消して、やり残しだけ残す
function rollover() {
  const t = todayStr();
  if (state.date === t) return false;
  archive(state);
  state = { date: t, tasks: state.tasks.filter((x) => !x.done) };
  save();
  return true;
}

function isImeEnter(e) {
  return e.isComposing || e.keyCode === 229;
}

/* テーマ */
function syncSwitch() {
  const dark = document.documentElement.dataset.theme === 'dark';
  $('themeBtn').setAttribute('aria-checked', String(dark));
  $('themeBtn').textContent = dark ? '☾' : '☀';
}
$('themeBtn').addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  document.documentElement.dataset.theme = next;
  localStorage.setItem(THEME_KEY, next);
  syncSwitch();
});

function render() {
  const total = state.tasks.length;
  $('none').style.display = total ? 'none' : 'block';
  $('list').style.display = total ? '' : 'none';

  const nextId = state.tasks.find((x) => !x.done)?.id;
  const list = $('list');
  list.replaceChildren();
  state.tasks.forEach((task) => {
    const li = document.createElement('li');
    li.className = 'row';
    if (task.done) li.classList.add('done');
    if (task.id === nextId) li.classList.add('next');
    if (task.id === justAdded) li.classList.add('lit');
    if (task.id === justDone) li.classList.add('pop');

    const cursor = document.createElement('span');
    cursor.className = 'cursor';

    const text = document.createElement('span');
    text.className = 'text';
    text.textContent = task.text;

    // 済なら ★CLEAR!、まだなら「完了」ボタン（押すと行のクリックと同じく済になる）
    let mark;
    if (task.done) {
      mark = document.createElement('span');
      mark.className = 'clear';
      mark.textContent = '★CLEAR!';
    } else {
      mark = document.createElement('button');
      mark.className = 'done-btn';
      mark.textContent = '完了';
    }

    const actions = document.createElement('span');
    actions.className = 'actions';
    const editBtn = document.createElement('button');
    editBtn.textContent = '編集';
    const delBtn = document.createElement('button');
    delBtn.textContent = '削除';
    actions.append(editBtn, delBtn);

    const side = document.createElement('span');
    side.className = 'side';
    side.append(actions, mark);

    li.append(cursor, text, side);
    list.append(li);

    // ドラッグ&ドロップで並べ替え（落とした行の上半分なら前、下半分なら後ろへ）
    li.draggable = true;
    li.addEventListener('dragstart', (e) => {
      dragId = task.id;
      li.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(task.id));
    });
    li.addEventListener('dragend', () => {
      dragId = null;
      document.querySelectorAll('.row').forEach((r) => r.classList.remove('dragging', 'drop-before', 'drop-after'));
    });
    li.addEventListener('dragover', (e) => {
      if (dragId === null || dragId === task.id) return;
      e.preventDefault();
      const r = li.getBoundingClientRect();
      const after = e.clientY > r.top + r.height / 2;
      li.classList.toggle('drop-after', after);
      li.classList.toggle('drop-before', !after);
    });
    li.addEventListener('dragleave', () => li.classList.remove('drop-before', 'drop-after'));
    li.addEventListener('drop', (e) => {
      e.preventDefault();
      if (dragId === null || dragId === task.id) return;
      const from = state.tasks.findIndex((x) => x.id === dragId);
      dragId = null;
      if (from < 0 || !stillHere(task)) { render(); return; }
      const r = li.getBoundingClientRect();
      const after = e.clientY > r.top + r.height / 2;
      const moved = state.tasks.splice(from, 1)[0];
      const to = state.tasks.indexOf(task) + (after ? 1 : 0);
      state.tasks.splice(to, 0, moved);
      justAdded = justDone = null;
      save();
      render();
    });

    li.addEventListener('click', () => {
      if (!stillHere(task)) return;
      task.done = !task.done;
      justDone = task.done ? task.id : null;
      battleFx = task.done ? { slay: task.id } : { spawn: task.id };
      justAdded = null;
      save();
      render();
      if (task.done && state.tasks.every((x) => x.done)) {
        const f = $('flash');
        f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
      }
    });

    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!stillHere(task)) return;
      state.tasks = state.tasks.filter((x) => x !== task);
      justAdded = justDone = null;
      save();
      render();
    });

    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!stillHere(task)) return;
      editing = true;
      const input = document.createElement('input');
      input.className = 'edit-input';
      input.value = task.text;
      text.replaceWith(input);
      li.draggable = false;
      actions.style.display = 'none';
      input.focus();
      input.select();

      let finished = false;
      const finish = (commit) => {
        if (finished) return;
        finished = true;
        editing = false;
        // 編集中にほかのタブで保存されていたら読み直し、日付も確かめてから、いまの状態に反映する
        if (pendingReload) { state = load() || state; pendingReload = false; }
        rollover();
        const cur = state.tasks.find((x) => x.id === task.id);
        if (commit && cur) {
          const v = input.value.trim();
          if (v) cur.text = v;
          else state.tasks = state.tasks.filter((x) => x !== cur);
          save();
        }
        justAdded = justDone = null;
        render();
      };
      input.addEventListener('click', (ev) => ev.stopPropagation());
      input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' && !isImeEnter(ev)) finish(true);
        if (ev.key === 'Escape') finish(false);
      });
      input.addEventListener('blur', () => finish(true));
    });
  });

  fitList();
  renderBattle(battleFx);
  battleFx = {};
}

const MAX_FOES = 6;

let battleTimer = null;
function renderBattle(fx = {}) {
  clearTimeout(battleTimer);
  const field = $('battle');
  field.replaceChildren();

  const hero = document.createElement('div');
  hero.className = 'hero';
  HERO.frames.forEach((map, i) => {
    const c = sprite({ map, pal: HERO.pal });
    c.classList.add(i ? 'f2' : 'f1');
    hero.append(c);
  });

  const left = state.tasks.filter((x) => !x.done);
  const slain = fx.slay ? state.tasks.find((x) => x.id === fx.slay) : null;
  const shown = (slain ? [slain, ...left] : left).slice(0, MAX_FOES);

  const foes = document.createElement('div');
  foes.className = 'foes';
  for (const t of shown) {
    const m = monsterOf(t);
    const f = document.createElement('div');
    f.className = 'foe';
    if (m.fly) f.classList.add('fly');
    if (t === slain) f.classList.add('dying');
    else if (t.id === left[0]?.id && !slain) f.classList.add('target');
    if (t.id === fx.spawn) f.classList.add('spawn');
    f.append(sprite(m));
    foes.append(f);
  }
  const rest = left.length - shown.filter((t) => t !== slain).length;
  if (rest > 0) {
    const more = document.createElement('span');
    more.className = 'more';
    more.textContent = `ほか ${rest}`;
    foes.append(more);
  }

  if (slain) {
    hero.classList.add('attack');
    battleTimer = setTimeout(() => renderBattle(), 800);
  } else if (state.tasks.length && !left.length) {
    hero.classList.add('victory');
  }
  field.append(hero, foes);
}

$('new').addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' || isImeEnter(e) || !$('log').hidden) return;
  const v = e.target.value.trim();
  if (!v) return;
  rollover();
  const task = { id: Date.now(), text: v, done: false };
  state.tasks.push(task);
  justAdded = task.id;
  justDone = null;
  battleFx = { spawn: task.id };
  save();
  e.target.value = '';
  render();
});

/* きろく（カレンダー） */
function dayLabel(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${y}/${m}/${d}(${WEEK[new Date(y, m - 1, d).getDay()]})`;
}

// 日付 → その日のクエスト（きろく＋きょう）
function records() {
  const map = new Map(loadLog().map((d) => [d.date, d.tasks]));
  if (state.tasks.length) map.set(state.date, state.tasks);
  return map;
}

let calY, calM, calSel;
function renderCal() {
  const recs = records();
  $('calMonth').textContent = `${calY}ねん ${calM + 1}がつ`;
  const cal = $('cal');
  cal.replaceChildren();
  const first = new Date(calY, calM, 1).getDay();
  const days = new Date(calY, calM + 1, 0).getDate();
  for (let i = 0; i < first; i++) {
    const b = document.createElement('div');
    b.className = 'cell blank';
    cal.append(b);
  }
  for (let d = 1; d <= days; d++) {
    const key = `${calY}-${pad(calM + 1)}-${pad(d)}`;
    const tasks = recs.get(key);
    const cell = document.createElement('div');
    cell.className = 'cell';
    if (key === todayStr()) cell.classList.add('today');
    if (key === calSel) cell.classList.add('sel');
    const num = document.createElement('span');
    num.textContent = d;
    cell.append(num);
    if (tasks) {
      cell.classList.add('has');
      const done = tasks.filter((x) => x.done).length;
      const mark = document.createElement('span');
      mark.className = 'mark' + (done === tasks.length ? ' star' : '');
      mark.textContent = done === tasks.length ? '★' : `${done}/${tasks.length}`;
      cell.append(mark);
      cell.addEventListener('click', () => { calSel = key; renderCal(); });
    }
    cal.append(cell);
  }
  renderDetail(recs);
}

function renderDetail(recs) {
  const box = $('calDetail');
  box.replaceChildren();
  const tasks = recs.get(calSel);
  const head = document.createElement('div');
  head.className = 'day-head';
  const date = document.createElement('span');
  date.textContent = dayLabel(calSel);
  head.append(date);
  box.append(head);
  if (!tasks) {
    const p = document.createElement('p');
    p.className = 'log-empty';
    p.textContent = 'この日の きろくは ない。';
    box.append(p);
    return;
  }
  const done = tasks.filter((x) => x.done).length;
  const score = document.createElement('span');
  score.className = 'day-score';
  score.textContent = (done === tasks.length ? '★ ぜんぶ クリア ' : '') + `${done}/${tasks.length}`;
  head.append(score);
  for (const t of tasks) {
    const row = document.createElement('div');
    row.className = 'day-item' + (t.done ? '' : ' miss');
    const mk = document.createElement('span');
    mk.textContent = t.done ? '★' : '・';
    const text = document.createElement('span');
    text.textContent = t.text;
    row.append(mk, text);
    box.append(row);
  }
}

function moveMonth(diff) {
  const d = new Date(calY, calM + diff, 1);
  calY = d.getFullYear();
  calM = d.getMonth();
  renderCal();
}
$('calPrev').addEventListener('click', () => moveMonth(-1));
$('calNext').addEventListener('click', () => moveMonth(1));

const openLog = () => {
  const now = new Date();
  calY = now.getFullYear();
  calM = now.getMonth();
  calSel = todayStr();
  renderCal();
  $('log').hidden = false;
  $('logClose').focus();
};
const closeLog = () => { $('log').hidden = true; $('new').focus(); };
$('logBtn').addEventListener('click', openLog);
$('logClose').addEventListener('click', closeLog);
$('log').addEventListener('click', (e) => { if (e.target === $('log')) closeLog(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('log').hidden) closeLog(); });

// タブを開きっぱなしで日をまたいでも切り替わるように
const check = () => {
  if (editing || !rollover()) return;
  justAdded = justDone = null;
  render();
};
setInterval(check, 30 * 1000);
document.addEventListener('visibilitychange', check);
window.addEventListener('focus', check);

// 一覧が窓に収まるまで文字を小さくする。34px を切りそうなら2列にする（下限 20px、それでも多ければスクロール）
function fitList() {
  const ul = $('list');
  const max = Math.round(Math.min(68, Math.max(34, innerWidth * 0.042)));
  const overflow = () => ul.scrollHeight > ul.clientHeight + 1;
  const shrink = (min) => {
    let fs = max;
    ul.style.setProperty('--fs', fs + 'px');
    while (overflow() && fs > min) {
      fs = Math.max(fs - 2, min);
      ul.style.setProperty('--fs', fs + 'px');
    }
  };
  ul.classList.remove('two');
  ul.style.removeProperty('grid-template-rows');
  shrink(34);
  if (!overflow() || ul.children.length < 2) return;
  ul.classList.add('two');
  ul.style.gridTemplateRows = `repeat(${Math.ceil(ul.children.length / 2)}, auto)`;
  shrink(20);
}
// ウィンドウの幅を変えている間は、1コマに1回だけ計算する
let fitQueued = false;
window.addEventListener('resize', () => {
  if (fitQueued) return;
  fitQueued = true;
  requestAnimationFrame(() => { fitQueued = false; fitList(); });
});

// 別のタブで変えたら揃える（編集中は終わるまで待つ）
window.addEventListener('storage', (e) => {
  if (e.key === KEY) {
    if (editing) { pendingReload = true; return; }
    state = load() || state;
    dragId = null;
    justAdded = justDone = null;
    render();
  }
  if (e.key === THEME_KEY && e.newValue) { document.documentElement.dataset.theme = e.newValue; syncSwitch(); }
});

buildScene();

syncSwitch();
rollover();
render();
