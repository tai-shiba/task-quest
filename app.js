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

// しゅべつ・メモは、あるときだけ持たせる
const extras = ({ kind, note }) => ({ ...(kind && { kind }), ...(note && { note }) });

// 終わった日の中身（済・やり残しとも）をきろくに入れる
function archive(day) {
  if (!day.tasks.length) return;
  const log = loadLog().filter((x) => x.date !== day.date);
  log.push({ date: day.date, tasks: day.tasks.map((t) => ({ text: t.text, done: t.done, ...extras(t) })) });
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

/* しゅべつ: 名前から色を決める（同じ名前ならいつも同じ色） */
const KIND_COLORS = ['#ff7a6a', '#6ab8ff', '#7ad86a', '#ffd84a', '#c48aff', '#ffa94a', '#4ad8c8', '#ff8ac8'];
function kindColor(name) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return KIND_COLORS[h % KIND_COLORS.length];
}
function kindBadge(name, tag = 'span') {
  const b = document.createElement(tag);
  b.className = 'kind';
  b.textContent = name;
  b.style.setProperty('--kc', kindColor(name));
  return b;
}
// しゅべつのバッジ＋なまえ（一覧ときろくで共通）
function taskLabel(t) {
  return t.kind ? [kindBadge(t.kind), t.text] : [t.text];
}
// これまでに使ったしゅべつ（きょう → きろくの新しい順）
function allKinds() {
  const kinds = new Set(state.tasks.map((t) => t.kind).filter(Boolean));
  for (const day of loadLog().reverse()) for (const t of day.tasks) if (t.kind) kinds.add(t.kind);
  return [...kinds];
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
  const cleared = state.tasks.filter((x) => x.done).length;
  $('questCount').hidden = !total;
  $('questCount').innerHTML = `クリア <b>${cleared}</b> / ${total}`;
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
    text.append(...taskLabel(task));
    if (task.note) li.title = task.note;

    // 行頭のチェック（○）。押すと行のクリックと同じく、済 ⇄ まだ を切り替える
    const checkBtn = document.createElement('button');
    checkBtn.className = 'check';
    checkBtn.setAttribute('aria-label', task.done ? 'まだにもどす' : 'クリアにする');
    checkBtn.setAttribute('aria-pressed', String(task.done));

    // しょうさいを開くボタン。場所はいつも取っておき、ホバー中かメモがあるときだけ見せる（行の幅が変わらない）
    const editBtn = document.createElement('button');
    editBtn.className = 'edit-btn' + (task.note ? ' has-note' : '');
    editBtn.textContent = '✎';
    editBtn.title = 'しょうさい（へんしゅう・さくじょ）';
    editBtn.setAttribute('aria-label', 'しょうさい');

    const side = document.createElement('span');
    side.className = 'side';
    side.append(editBtn);

    li.append(cursor, checkBtn, text, side);
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

    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!stillHere(task)) return;
      openDialog(task);
    });
  });

  fitList();
  renderBattle(battleFx);
  battleFx = {};
}

const MAX_FOES = 6;

let battleTimer = null;
let slaying = false;   // 敵を倒す動きの途中（終われば自分で描き直す）
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
  let rest = left.length - shown.filter((t) => t !== slain).length;
  const more = document.createElement('span');
  more.className = 'more';
  const setMore = () => { more.textContent = `ほか ${rest}`; more.hidden = rest <= 0; };
  setMore();
  foes.append(more);

  slaying = !!slain;
  if (slain) {
    hero.classList.add('attack');
    battleTimer = setTimeout(() => renderBattle(), 800);
  } else if (state.tasks.length && !left.length) {
    hero.classList.add('victory');
  }
  field.append(hero, foes);

  // 窓の幅に収まらない敵は「ほか」にまわす（倒れていく途中の敵は残す）
  const alive = [...foes.querySelectorAll('.foe:not(.dying)')];
  while (field.scrollWidth > field.clientWidth && alive.length > 1) {
    alive.pop().remove();
    rest++;
    setMore();
  }
}


/* 受注: ボタンか N キーで、しょうさいの窓を「あたらしい クエスト」として開く */
function addTask(text, kind, note) {
  const task = { id: Date.now(), text, done: false, ...extras({ kind, note }) };
  state.tasks.push(task);
  justAdded = task.id;
  justDone = null;
  battleFx = { spawn: task.id };
  save();
}
$('addBtn').addEventListener('click', () => openDialog(null));
document.addEventListener('keydown', (e) => {
  if (e.key?.toLowerCase() !== 'n' || e.metaKey || e.ctrlKey || e.altKey || e.isComposing) return;
  if ($('log').open || $('dlg').open || e.target.closest('input, textarea')) return;
  e.preventDefault();
  openDialog(null);
});

/* しょうさいの窓（いまのクエストの編集・削除と、あたらしいクエストの受注で使う） */
let dlgId = null;   // null ならあたらしいクエスト
let dlgAdded = 0;   // この窓で「つづけて受注」した数
// しゅべつを選ぶボタンの列。窓を開いたときに1回だけ作り（きろくの読み込みも1回）、
// そのあとは選んだ印だけ付けかえる（押したボタンが作り直されてフォーカスが外れないように）
function buildKindChips() {
  const box = $('kindChips');
  box.replaceChildren();
  for (const k of allKinds()) {
    const chip = kindBadge(k, 'button');
    chip.type = 'button';
    chip.dataset.kind = k;
    // 選んでいるものをもう一度押すと、しゅべつなし
    chip.addEventListener('click', () => {
      $('dlgKind').value = $('dlgKind').value.trim() === k ? '' : k;
      markKindChips();
    });
    box.append(chip);
  }
  markKindChips();
}
function markKindChips() {
  const cur = $('dlgKind').value.trim();
  for (const chip of $('kindChips').children) {
    const on = chip.dataset.kind === cur;
    chip.classList.toggle('on', on);
    chip.setAttribute('aria-pressed', String(on));
  }
}
function openDialog(task) {
  editing = true;
  dlgId = task ? task.id : null;
  $('dlgTitle').textContent = task ? 'クエストの しょうさい' : 'あたらしい クエスト';
  $('dlgOk').textContent = task ? 'きめる' : '受注する';
  $('dlgDelete').hidden = !task;
  $('dlgMore').hidden = !!task;
  $('dlgMsg').textContent = '';
  $('dlgText').value = task ? task.text : '';
  $('dlgKind').value = task?.kind || '';
  $('dlgNote').value = task?.note || '';
  dlgAdded = 0;
  buildKindChips();
  resetDelete();
  $('dlg').showModal();
  $('dlgText').focus();
}
// 編集中にほかのタブで保存されていたら読み直し、日付も確かめる（いまの状態に反映する前に呼ぶ）
function syncBeforeWrite() {
  if (pendingReload) { state = load() || state; pendingReload = false; }
  rollover();
  justAdded = justDone = null;
}
// commit: true = 保存（受注） / false = 閉じる（保存しない） / 'delete' = けす / 'more' = 受注して、つぎのクエストを書く
function closeDialog(commit) {
  if (!$('dlg').open) return;
  const text = $('dlgText').value.trim();
  const kind = $('dlgKind').value.trim();
  const note = $('dlgNote').value.trim();
  if (dlgId === null && commit && !text) {
    // なまえのないクエストは受注できない。ただ「つづけて受注」したあとなら、受注を終えて閉じる
    if (commit === true && dlgAdded) commit = false;
    else { $('dlgText').focus(); return; }
  }
  if (commit === 'more') {
    // 窓は開いたまま、しゅべつだけ残して次を書けるようにする
    syncBeforeWrite();
    addTask(text, kind, note);
    dlgAdded++;
    render();
    $('dlgMsg').textContent = `「${text}」を 受注した！`;
    $('dlgText').value = '';
    $('dlgNote').value = '';
    buildKindChips();   // いま受注したしゅべつが新しければ、ボタンに加わる
    $('dlgText').focus();
    return;
  }
  $('dlg').close();
  editing = false;
  syncBeforeWrite();
  if (dlgId === null) {
    if (commit) addTask(text, kind, note);
  } else {
    const cur = state.tasks.find((x) => x.id === dlgId);
    if (commit === 'delete' && cur) {
      state.tasks = state.tasks.filter((x) => x !== cur);
      battleFx = {};
      save();
    } else if (commit && cur) {
      if (text) cur.text = text;   // 空にしたときは元のなまえのまま
      if (kind) cur.kind = kind; else delete cur.kind;
      if (note) cur.note = note; else delete cur.note;
      save();
    }
  }
  dlgId = null;
  render();
  $('addBtn').focus();
}
// けすは2回押し（1回目で「ほんとうに けす?」に変わる）
function resetDelete() {
  $('dlgDelete').classList.remove('armed');
  $('dlgDelete').textContent = 'けす';
}
$('dlgDelete').addEventListener('click', () => {
  if ($('dlgDelete').classList.contains('armed')) { closeDialog('delete'); return; }
  $('dlgDelete').classList.add('armed');
  $('dlgDelete').textContent = 'ほんとうに けす?';
});
$('dlgDelete').addEventListener('blur', resetDelete);
$('dlgOk').addEventListener('click', () => closeDialog(true));
$('dlgMore').addEventListener('click', () => closeDialog('more'));
$('dlgClose').addEventListener('click', () => closeDialog(false));
// 窓の外を押したら閉じる（窓の中で押して外で離したとき＝文字を選んでいたときは閉じない）
let downOnBackdrop = false;
$('dlg').addEventListener('mousedown', (e) => { downOnBackdrop = e.target === $('dlg'); });
$('dlg').addEventListener('click', (e) => { if (downOnBackdrop && e.target === $('dlg')) closeDialog(false); });
$('dlgKind').addEventListener('input', markKindChips);
// Esc は dialog の cancel で受ける（日本語の変換中の Esc では cancel は起きない）
$('dlg').addEventListener('cancel', (e) => { e.preventDefault(); closeDialog(false); });
// ブラウザが cancel を経ずに窓を閉じたとき（Esc の連打など）も、編集中の状態を残さない
$('dlg').addEventListener('close', () => {
  if (!editing) return;
  editing = false;
  syncBeforeWrite();
  dlgId = null;
  render();
  $('addBtn').focus();
});
$('dlg').addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' || isImeEnter(e)) return;
  // 1行の欄は Enter、しょうさい欄は ⌘/Ctrl + Enter で決める（ただの Enter は改行）
  if (e.target.tagName !== 'INPUT' && !e.metaKey && !e.ctrlKey) return;
  e.preventDefault();
  closeDialog(e.shiftKey && dlgId === null ? 'more' : true);
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
    text.append(...taskLabel(t));
    if (t.note) {
      const note = document.createElement('span');
      note.className = 'day-note';
      note.textContent = t.note;
      text.append(note);
    }
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
  $('log').showModal();
  $('logClose').focus();
};
$('logBtn').addEventListener('click', openLog);
$('logClose').addEventListener('click', () => $('log').close());
$('log').addEventListener('click', (e) => { if (e.target === $('log')) $('log').close(); });   // 窓の外を押したら閉じる
$('log').addEventListener('close', () => $('addBtn').focus());   // Esc で閉じたときも

// タブを開きっぱなしで日をまたいでも切り替わるように
const checkDate = () => {
  if (editing || !rollover()) return;
  justAdded = justDone = null;
  render();
};
setInterval(checkDate, 30 * 1000);
document.addEventListener('visibilitychange', checkDate);
window.addEventListener('focus', checkDate);

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
// ウィンドウの幅を変えている間は、文字の大きさは1コマに1回だけ計算する。
// 戦闘シーンは、幅を変え終わってから描き直す（倒す動きの途中なら、その動きが終わったときに描き直される）
let fitQueued = false;
let battleResize = null;
window.addEventListener('resize', () => {
  clearTimeout(battleResize);
  battleResize = setTimeout(() => { if (!slaying) renderBattle(); }, 200);
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

// Webフォントが読み込まれると文字幅が変わるので、もう一度収まりを計算する
document.fonts.ready.then(fitList);
