'use strict';
/* =========================================================
   Word Guardians (워드 가디언즈) - app.js
   순수 클라이언트 사이드 / localStorage / Web Speech / Web Audio
   ========================================================= */

/* ---------- 유틸 ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const norm = s => String(s).toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();
const pad = n => String(n).padStart(2, '0');
const fmtDate = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const todayStr = () => fmtDate(new Date());
const addDays = n => { const d = new Date(); d.setDate(d.getDate() + n); return fmtDate(d); };

/* ---------- 저장 데이터 ---------- */
const SAVE_KEY = 'wordGuardians.v1';
const defaultSave = () => ({ name: '', coins: 0, xp: 0, streak: 0, lastDay: '', stars: {}, collection: {}, wrong: {}, custom: [], muted: false });
let S = loadSave();
function loadSave() {
  try { return Object.assign(defaultSave(), JSON.parse(localStorage.getItem(SAVE_KEY)) || {}); }
  catch (e) { return defaultSave(); }
}
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* 저장 불가 환경 무시 */ } }
function updateStreak() {
  const t = todayStr();
  if (S.lastDay === t) return;
  S.streak = (S.lastDay === addDays(-1)) ? S.streak + 1 : 1;
  S.lastDay = t;
  persist();
}

/* ---------- 단어 데이터 ---------- */
function allWords() {
  const list = WORD_DATABASE.slice();
  const maxStage = {};
  WORD_DATABASE.forEach(w => { maxStage[w.grade] = Math.max(maxStage[w.grade] || 0, w.stage); });
  const cnt = {};
  S.custom.forEach(c => {
    const g = c.grade; cnt[g] = cnt[g] || 0;
    list.push({ id: c.id, grade: g, stage: (maxStage[g] || 0) + 1 + Math.floor(cnt[g] / 5), en: c.en, ko: c.ko, emoji: c.emoji || '⭐', sentence: c.sentence || '', custom: true });
    cnt[g]++;
  });
  return list;
}
const wordById = id => allWords().find(w => w.id === id);
function stagesOf(g) {
  const m = {};
  allWords().filter(w => w.grade === g).forEach(w => { (m[w.stage] = m[w.stage] || []).push(w); });
  return m;
}
function distract(w, n, key) {
  const all = allWords().filter(x => x.id !== w.id);
  const same = shuffle(all.filter(x => x.grade === w.grade));
  const other = shuffle(all.filter(x => x.grade !== w.grade));
  const out = []; const seen = new Set([w[key]]);
  for (const x of same.concat(other)) {
    if (out.length >= n) break;
    if (seen.has(x[key])) continue;
    seen.add(x[key]); out.push(x);
  }
  return out;
}
function blankSentence(w) {
  if (!w.sentence) return '';
  const re = new RegExp('\\b' + escRe(w.en) + '\\w*', 'i');
  return re.test(w.sentence) ? w.sentence.replace(re, '_____') : '';
}

/* ---------- 사운드: Web Audio 신디사이저 + TTS ---------- */
let AC = null;
function ac() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* 미지원 */ } }
  if (AC && AC.state === 'suspended') AC.resume();
  return AC;
}
function tone(freq, start, dur, type, vol) {
  const c = ac(); if (!c || S.muted) return;
  type = type || 'sine'; vol = vol || 0.2;
  const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + start;
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(c.destination);
  o.start(t); o.stop(t + dur + 0.05);
}
const SFX = {
  correct() { tone(784, 0, .14, 'triangle'); tone(988, .12, .14, 'triangle'); tone(1319, .24, .35, 'triangle'); }, // 딩-동-댕
  wrong() { tone(220, 0, .3, 'sawtooth', .13); tone(165, .18, .4, 'sawtooth', .13); },                              // 삐-
  click() { tone(600, 0, .06, 'square', .06); },
  coin() { tone(1400, 0, .07, 'square', .06); tone(1900, .07, .12, 'square', .06); },
  levelup() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, i * .12, .22, 'triangle', .2)); }     // 팡파레
};
let voice = null;
function pickVoice() {
  if (!('speechSynthesis' in window)) return;
  const vs = speechSynthesis.getVoices();
  voice = vs.find(v => v.lang === 'en-US') || vs.find(v => v.lang && v.lang.indexOf('en') === 0) || null;
}
if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function speak(text) {
  if (!('speechSynthesis' in window) || S.muted) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US'; u.rate = 0.85;
    if (voice) u.voice = voice;
    speechSynthesis.speak(u);
  } catch (e) { /* 무시 */ }
}

/* ---------- 공통 UI ---------- */
function showScreen(id) {
  $$('.screen').forEach(s => s.classList.toggle('active', s.id === id));
  if (id !== 'game') document.body.classList.remove('fever');
}
const openModal = id => $('#' + id).classList.add('open');
const closeModal = id => $('#' + id).classList.remove('open');
let toastTimer = null;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 2200);
}

/* ---------- 펫 / 레벨 ---------- */
const PETS = [
  { e: '🥚', n: '수상한 알' }, { e: '🐣', n: '아기 정령' }, { e: '🦎', n: '꼬마 용 도마뱀' },
  { e: '🐲', n: '아기 드래곤' }, { e: '🐉', n: '마법 드래곤' }, { e: '👑', n: '전설의 워드 드래곤' }
];
const XP_PER_LEVEL = 60;
const level = () => 1 + Math.floor(S.xp / XP_PER_LEVEL);
const petIdx = () => Math.min(5, Math.floor((level() - 1) / 2));

/* ---------- 오답노트 / SRS ---------- */
const BOX_DAYS = [0, 1, 3, 7, 14];
function recordWrong(w) {
  const e = S.wrong[w.id] || { count: 0, box: 0, due: '' };
  e.count++; e.box = 0; e.due = todayStr();
  S.wrong[w.id] = e; persist();
}
function srsRight(w) {
  const e = S.wrong[w.id]; if (!e) return;
  e.box++;
  if (e.box >= BOX_DAYS.length) { delete S.wrong[w.id]; toast('🎉 ' + w.en + ' 완전 정복! 오답노트 졸업!'); }
  else e.due = addDays(BOX_DAYS[e.box]);
  persist();
}

/* ---------- 타이틀 ---------- */
function renderTitle() {
  const p = PETS[petIdx()];
  $('#pet-emoji').textContent = p.e;
  $('#pet-name').textContent = p.n;
  $('#lv').textContent = 'Lv.' + level();
  $('#xp-fill').style.width = ((S.xp % XP_PER_LEVEL) / XP_PER_LEVEL * 100) + '%';
  $('#coins').textContent = S.coins;
  $('#streak').textContent = S.streak;
  $('#name-input').value = S.name;
  $('#greet').textContent = S.name ? S.name + ' 가디언, 어서 와요!' : '이름을 알려주세요!';
  $('#btn-mute').textContent = S.muted ? '🔇' : '🔊';
}

/* ---------- 스테이지 선택 ---------- */
const GRADE_DESC = {
  1: '🔤 소리 듣고 그림 보고 뜻 고르기', 2: '🍎 단어 찾기 & 첫소리 파닉스',
  3: '⚔️ 스피드 디펜스 – 몬스터를 물리쳐요', 4: '🧩 알파벳 블록 조립',
  5: '🎧 듣고 스펠링 쓰기 & 문장 빈칸', 6: '⌨️ 마스터 타이핑 보스 배틀'
};
let curGrade = 1;
function renderStages() {
  $('#stage-coins').textContent = S.coins;
  $('#grade-tabs').innerHTML = [1, 2, 3, 4, 5, 6].map(g => `<button class="tab ${g === curGrade ? 'on' : ''}" data-g="${g}">${g}학년</button>`).join('');
  $('#grade-desc').textContent = GRADE_DESC[curGrade];
  const st = stagesOf(curGrade);
  const keys = Object.keys(st).map(Number).sort((a, b) => a - b);
  const themes = STAGE_THEMES[curGrade] || [];
  $('#stage-grid').innerHTML = keys.map((n, i) => {
    const stars = S.stars[curGrade + '_' + n] || 0;
    const locked = i > 0 && !(S.stars[curGrade + '_' + keys[i - 1]] > 0);
    const theme = themes[n - 1] || ('내 단어장 ' + (n - themes.length));
    return `<button class="stage-card ${locked ? 'locked' : ''}" data-s="${n}" ${locked ? 'disabled' : ''}>
      <div class="sn">${locked ? '🔒' : n}</div><div class="st">${esc(theme)}</div>
      <div class="stars">${[1, 2, 3].map(k => k <= stars ? '★' : '☆').join('')}</div></button>`;
  }).join('');
}

/* ---------- 사전 학습 ---------- */
let pre = null, preToken = 0;
function openPrestudy(grade, stageNo, words, mode) {
  words = words || stagesOf(grade)[stageNo];
  if (!words || !words.length) return;
  pre = { grade, stageNo, words, mode: mode || 'normal', bonus: new Set() };
  $('#pre-title').textContent = pre.mode === 'review' ? '🏛️ 기억의 신전 – 다시 만나요!' : `👀 ${grade}학년 스테이지 ${stageNo} 미리보기`;
  $('#pre-list').innerHTML = words.map((w, i) => `<div class="pre-card" data-i="${i}"><div class="pe">${w.emoji}</div><div class="pw">${esc(w.en)}</div><div>${esc(w.ko)}</div><button class="spk" data-i="${i}">🔊</button></div>`).join('');
  openModal('modal-pre');
  autoPlayPre();
}
async function autoPlayPre() {
  const t = ++preToken;
  for (let i = 0; i < pre.words.length; i++) {
    if (t !== preToken) return;
    const c = $$('.pre-card')[i]; if (c) c.classList.add('hl');
    speak(pre.words[i].en);
    await sleep(1500);
    if (c) c.classList.remove('hl');
  }
}
function closePre() { preToken++; closeModal('modal-pre'); try { speechSynthesis.cancel(); } catch (e) { /* 무시 */ } }

/* ---------- 게임 엔진 ---------- */
const MONSTERS = ['👹', '👾', '🦖', '👻', '🐙', '🦂', '🧟'];
const BOSSES = ['🐲', '👿', '🦑', '🤖', '🦈'];
let G = null, lastRun = null, keyHandler = null;
document.addEventListener('keydown', e => { if (keyHandler) keyHandler(e); });

function startGame(grade, words, mode, stageNo) {
  const qs = [];
  words.forEach(w => { qs.push({ w, v: 0 }); qs.push({ w, v: 1 }); });
  G = { grade, stageNo, words, review: mode === 'review', queue: shuffle(qs), total: qs.length, done: 0, lives: 3, combo: 0, maxCombo: 0,
    score: 0, coins: 0, mistakes: 0, wrongIds: new Set(), busy: false, timer: null, q: null };
  lastRun = { grade, stageNo, words, review: G.review };
  showScreen('game');
  updateHud();
  nextQuestion();
}
function updateHud() {
  $('#hud-fill').style.width = (G.done / G.total * 100) + '%';
  $('#hearts').textContent = '❤️'.repeat(Math.max(0, G.lives)) + '🖤'.repeat(3 - Math.max(0, G.lives));
  $('#combo').textContent = G.combo >= 3 ? '🔥 콤보 ' + G.combo : '콤보 ' + G.combo;
  $('#score').textContent = '점수 ' + G.score;
  $('#hud-coins').textContent = '🪙 ' + G.coins;
}
function cleanupQ() {
  if (G && G.timer) { clearInterval(G.timer); G.timer = null; }
  keyHandler = null;
}
function nextQuestion() {
  cleanupQ();
  if (!G.queue.length) { finish(true); return; }
  G.q = G.queue.shift(); G.busy = false;
  const fn = { 1: qPic, 2: qG2, 3: qSpeed, 4: qScramble, 5: qSpell, 6: qType }[G.q.w.grade] || qPic;
  fn(G.q);
}
const setStage = html => { $('#stage-area').innerHTML = html; };
const setAnswer = html => { $('#answer-area').innerHTML = html; };
const spkBtn = '<button class="spk big" data-act="speak">🔊</button>';

function banner(text) {
  const b = document.createElement('div'); b.className = 'banner'; b.textContent = text;
  $('#game').appendChild(b); setTimeout(() => b.remove(), 1300);
}
function floatText(text) {
  const f = document.createElement('div'); f.className = 'float'; f.textContent = text;
  $('#stage-area').appendChild(f); setTimeout(() => f.remove(), 1000);
}
function showFeedback(w, reason) {
  $('#feedback').innerHTML = `<div class="fm">${reason === 'timeout' ? '⏰ 시간 초과!' : '아깝다! 정답은…'}</div>
    <div class="fe">${w.emoji}</div><div class="fw">${esc(w.en)}</div><div class="fk">${esc(w.ko)}</div>
    <div class="fm">🔊 잘 들어보세요 · 이 단어는 조금 뒤에 다시 나와요!</div>`;
  $('#feedback').classList.add('show');
}
const hideFeedback = () => $('#feedback').classList.remove('show');

async function answer(ok, w, reason) {
  if (G.busy) return;
  G.busy = true; cleanupQ();
  const gref = G;
  if (ok) {
    SFX.correct(); speak(w.en);
    G.combo++; G.maxCombo = Math.max(G.maxCombo, G.combo);
    const fever = G.combo >= 3, mult = fever ? 2 : 1;
    if (fever && !document.body.classList.contains('fever')) { document.body.classList.add('fever'); banner('🔥 FEVER! 🔥'); }
    G.score += 100 * mult + (G.combo > 1 ? G.combo * 10 : 0);
    G.coins += 5 * mult; G.done++;
    if (G.review && !G.wrongIds.has(w.id)) srsRight(w);
    const m = $('#monster'); if (m) m.classList.add('hit');
    floatText('+' + (5 * mult) + ' 🪙' + (fever ? ' x2' : ''));
    updateHud();
    await sleep(1100);
    if (G !== gref) return;
    nextQuestion();
  } else {
    SFX.wrong();
    G.lives--; G.combo = 0; G.mistakes++; G.wrongIds.add(w.id);
    document.body.classList.remove('fever');
    recordWrong(w);
    updateHud();
    showFeedback(w, reason); speak(w.en);
    G.queue.push({ w, v: 1 - G.q.v, retry: true }); // Phase 3: 큐 맨 뒤에 재삽입
    await sleep(2000);
    if (G !== gref) return;
    hideFeedback();
    if (G.lives <= 0) { finish(false); return; }
    nextQuestion();
  }
}

/* --- 객관식 공통 --- */
function showOptions(opts, cls) {
  setAnswer(`<div class="opts ${cls || ''}">${shuffle(opts).map(o => `<button class="opt" data-ok="${o.ok ? 1 : 0}">${esc(o.t)}</button>`).join('')}</div>`);
  $$('#answer-area .opt').forEach(b => {
    b.onclick = () => {
      if (G.busy) return;
      SFX.click();
      const ok = b.dataset.ok === '1';
      b.classList.add(ok ? 'right' : 'wrong');
      if (!ok) { const r = $$('#answer-area .opt').find(x => x.dataset.ok === '1'); if (r) r.classList.add('right'); }
      answer(ok, G.q.w);
    };
  });
}

/* --- 1학년: 소리 + 그림 → 한글 뜻 4지선다 --- */
function qPic(q) {
  const w = q.w;
  setStage(`<div class="qcard"><div class="qemoji">${w.emoji}</div><div class="qen">${esc(w.en)}</div>${spkBtn}</div>`);
  speak(w.en);
  showOptions([{ t: w.ko, ok: true }].concat(distract(w, 3, 'ko').map(x => ({ t: x.ko, ok: false }))), 'bubbles');
}

/* --- 2학년: A) 뜻 → 영어 단어 / B) 파닉스 첫 글자 --- */
function qG2(q) {
  const w = q.w, word = norm(w.en);
  if (q.v === 0) {
    setStage(`<div class="qcard"><div class="qemoji">${w.emoji}</div><div class="qko">${esc(w.ko)}</div></div>`);
    showOptions([{ t: w.en, ok: true }].concat(distract(w, 3, 'en').map(x => ({ t: x.en, ok: false }))));
  } else {
    const blank = '_ ' + [...word.slice(1)].map(c => c === ' ' ? '/' : c).join(' ');
    setStage(`<div class="qcard"><div class="qemoji">${w.emoji}</div><div class="hint" id="phonics">${esc(blank)}</div><div class="qko">${esc(w.ko)}</div>${spkBtn}</div>`);
    const first = word[0];
    const letters = shuffle([...'abcdefghijklmnopqrstuvwxyz'].filter(c => c !== first)).slice(0, 3);
    showOptions([{ t: first, ok: true }].concat(letters.map(c => ({ t: c, ok: false }))), 'bubbles');
    // 정답 시 완성된 단어를 보여줌
    $$('#answer-area .opt').forEach(b => {
      const prev = b.onclick;
      b.onclick = () => { if (G.busy) return; prev(); if (b.dataset.ok === '1') { const p = $('#phonics'); if (p) p.textContent = [...word].join(' '); } };
    });
  }
}

/* --- 3학년: 스피드 디펜스 (10초) --- */
function qSpeed(q) {
  const w = q.w;
  setStage(`<div class="monster-wrap"><div class="monster" id="monster">${pick(MONSTERS)}</div>
    <div class="mon-hp"><div class="mon-hp-fill" style="width:${100 - G.done / G.total * 100}%"></div></div>
    <div class="qcard small"><div class="qko">${esc(w.ko)}</div></div>
    <div class="timer"><div id="tfill"></div></div></div>`);
  showOptions([{ t: w.en, ok: true }].concat(distract(w, 3, 'en').map(x => ({ t: x.en, ok: false }))), 'cards');
  const t0 = performance.now(), ms = 10000;
  G.timer = setInterval(() => {
    const r = 1 - (performance.now() - t0) / ms;
    const f = $('#tfill');
    if (f) { f.style.width = Math.max(0, r * 100) + '%'; f.classList.toggle('low', r < 0.3); }
    if (r <= 0) {
      clearInterval(G.timer); G.timer = null;
      if (!G.busy) {
        $$('#answer-area .opt').forEach(b => { if (b.dataset.ok === '1') b.classList.add('right'); });
        answer(false, w, 'timeout');
      }
    }
  }, 50);
}

/* --- 4·5학년 공통: 알파벳 타일 조립 --- */
function qPuzzle(q, o) {
  const w = q.w, word = norm(w.en), chars = [...word];
  const letters = chars.filter(c => c !== ' ');
  const slots = chars.map(c => c === ' ' ? { sep: true } : { ch: null, tile: null, fixed: false });
  let tiles = letters.map((c, i) => ({ id: i, ch: c, used: false }));
  for (let k = 0; k < (o.traps || 0); k++) {
    const pool = [...'abcdefghijklmnopqrstuvwxyz'].filter(c => !tiles.some(t => t.ch === c));
    if (pool.length) tiles.push({ id: 100 + k, ch: pick(pool), used: false });
  }
  let tries = 0;
  do { tiles = shuffle(tiles); tries++; }
  while (tries < 10 && !o.traps && letters.length > 1 && tiles.map(t => t.ch).join('') === letters.join(''));

  let head = '';
  if (o.emoji) head += `<div class="qemoji">${w.emoji}</div>`;
  head += `<div class="qko">${esc(w.ko)}</div>`;
  if (o.sentence) { const s = blankSentence(w); if (s) head += `<div class="qsent">${esc(s)}</div>`; }
  head += spkBtn;
  setStage(`<div class="qcard">${head}</div>`);
  setAnswer(`<div class="slots" id="slots"></div><div class="tiles" id="tiles"></div>
    <div class="row-btns">${o.hint ? '<button class="btn yellow sm" id="hint">💡 힌트</button>' : ''}<button class="btn sm" id="clear">↩️ 지우기</button></div>`);

  const draw = () => {
    $('#slots').innerHTML = slots.map((s, i) => s.sep ? '<span class="sep"></span>'
      : `<button class="slot ${s.ch ? 'filled' : ''} ${s.fixed ? 'fixed' : ''}" data-i="${i}">${s.ch ? esc(s.ch) : ''}</button>`).join('');
    $('#tiles').innerHTML = tiles.map(t => `<button class="tile" data-id="${t.id}" ${t.used ? 'disabled' : ''}>${esc(t.ch)}</button>`).join('');
  };
  const place = (idx, t) => { slots[idx].ch = t.ch; slots[idx].tile = t; t.used = true; };
  const free = idx => { const s = slots[idx]; if (s.tile) s.tile.used = false; s.ch = null; s.tile = null; };
  const check = () => {
    if (slots.some(s => !s.sep && !s.ch)) return;
    const guess = slots.map(s => s.sep ? ' ' : s.ch).join('');
    const ok = guess === word;
    $('#slots').classList.add(ok ? 'ok' : 'bad');
    answer(ok, w);
  };
  draw();
  $('#tiles').onclick = e => {
    const b = e.target.closest('.tile'); if (!b || G.busy) return;
    const t = tiles.find(x => x.id === Number(b.dataset.id)); if (!t || t.used) return;
    const idx = slots.findIndex(s => !s.sep && !s.ch); if (idx < 0) return;
    SFX.click(); place(idx, t); draw(); check();
  };
  $('#slots').onclick = e => {
    const b = e.target.closest('.slot'); if (!b || G.busy) return;
    const i = Number(b.dataset.i);
    if (slots[i].ch && !slots[i].fixed) { SFX.click(); free(i); draw(); }
  };
  $('#clear').onclick = () => {
    if (G.busy) return; SFX.click();
    slots.forEach((s, i) => { if (!s.sep && !s.fixed && s.ch) free(i); });
    draw();
  };
  if (o.hint) {
    $('#hint').onclick = () => {
      if (G.busy) return; SFX.click();
      const i0 = slots.findIndex(s => !s.sep);
      if (slots[i0].fixed) return;
      if (slots[i0].ch !== letters[0]) {
        if (slots[i0].ch) free(i0);
        const t = tiles.find(x => !x.used && x.ch === letters[0]);
        if (t) place(i0, t);
      }
      slots[i0].fixed = true; draw(); check();
    };
  }
}
function qScramble(q) { qPuzzle(q, { emoji: true, hint: true }); speak(q.w.en); }
function qSpell(q) { qPuzzle(q, { emoji: false, sentence: true, traps: 2 }); speak(q.w.en); }

/* --- 6학년: 마스터 타이핑 + 보스 --- */
function qType(q) {
  const w = q.w, word = norm(w.en);
  let typed = '';
  const hint = [...word].map((c, i) => c === ' ' ? '/' : (i === 0 ? c : '_')).join(' ');
  setStage(`<div class="monster-wrap"><div class="monster boss" id="monster">${pick(BOSSES)}</div>
    <div class="mon-hp"><div class="mon-hp-fill" style="width:${100 - G.done / G.total * 100}%"></div></div>
    <div class="qcard small"><div class="qko">${esc(w.ko)}</div><div class="hint">${esc(hint)}</div><div class="typed" id="typed"></div></div></div>`);
  const rows = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
  setAnswer(`<div class="kb">${rows.map(r => `<div class="kbrow">${[...r].map(c => `<button class="key" data-k="${c}">${c}</button>`).join('')}</div>`).join('')}
    <div class="kbrow"><button class="key wide" data-k=" ">␣</button><button class="key wide" data-k="bs">⌫</button><button class="key wide go" data-k="enter">확인</button></div></div>`);
  const show = () => { const t = $('#typed'); if (t) t.textContent = typed || '｜'; };
  const press = k => {
    if (G.busy) return;
    if (k === 'enter') {
      if (!typed.trim()) return;
      const ok = norm(typed) === word;
      $('#typed').classList.add(ok ? 'ok' : 'bad');
      answer(ok, w); return;
    }
    if (k === 'bs') typed = typed.slice(0, -1);
    else if (typed.length < word.length + 2) typed += k;
    show();
  };
  $('.kb').onclick = e => { const b = e.target.closest('.key'); if (b) { SFX.click(); press(b.dataset.k); } };
  keyHandler = e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Enter') press('enter');
    else if (e.key === 'Backspace') press('bs');
    else if (/^[a-zA-Z ]$/.test(e.key)) { press(e.key.toLowerCase()); if (e.key === ' ') e.preventDefault(); }
  };
  show();
}

/* ---------- 종료 / 결과 ---------- */
function finish(cleared) {
  cleanupQ();
  document.body.classList.remove('fever');
  const g = G;
  let stars = 0, coins = g.coins;
  if (cleared) {
    stars = g.mistakes === 0 ? 3 : g.mistakes <= 2 ? 2 : 1;
    coins += 20 + stars * 5;
    if (g.review) coins *= 2; // 기억의 신전: 코인 2배
  }
  const xpGain = cleared ? 20 + g.done * 2 : g.done;
  const lvBefore = level(), petBefore = petIdx();
  S.coins += coins; S.xp += xpGain;
  if (cleared) {
    if (!g.review) { const k = g.grade + '_' + g.stageNo; S.stars[k] = Math.max(S.stars[k] || 0, stars); }
    g.words.forEach(w => { S.collection[w.id] = 1; });
  }
  persist();
  const up = level() > lvBefore, evolved = petIdx() > petBefore;
  if (up) SFX.levelup(); else if (cleared) SFX.correct(); else SFX.wrong();
  renderResult(g, cleared, stars, coins, xpGain, up, evolved);
}
function renderResult(g, cleared, stars, coins, xpGain, up, evolved) {
  showScreen('result');
  const r = lastRun;
  const hasNext = cleared && !r.review && stagesOf(r.grade)[r.stageNo + 1];
  $('#result-body').innerHTML = `<div class="res-card">
    <h2>${cleared ? '스테이지 클리어! 🎉' : '아쉬워요… 💔 다시 도전!'}</h2>
    <div class="big-stars">${[1, 2, 3].map(k => `<span class="${k <= stars ? 'on' : ''}">★</span>`).join('')}</div>
    <div class="res-stats"><span>🪙 +${coins}</span><span>✨ XP +${xpGain}</span><span>🏆 ${g.score}점</span><span>🔥 최대 콤보 ${g.maxCombo}</span></div>
    ${up ? `<div class="levelup">🎊 레벨 업! Lv.${level()} ${evolved ? '· ' + PETS[petIdx()].e + ' 진화했어요!' : ''}</div>` : ''}
    <div class="learned">${cleared ? '이번 판에서 외운 단어' : '연습한 단어'} (눌러서 발음 듣기)</div>
    <div class="wl">${r.words.map(w => `<button class="wchip" data-en="${esc(w.en)}">${w.emoji} ${esc(w.en)} <small>${esc(w.ko)}</small> 🔊</button>`).join('')}</div>
    <div class="res-btns">
      ${hasNext ? '<button class="btn green" id="r-next">다음 스테이지 ▶</button>' : ''}
      <button class="btn blue" id="r-retry">🔄 다시 하기</button>
      <button class="btn yellow" id="r-home">🏠 ${r.review ? '메인으로' : '스테이지 선택'}</button>
    </div></div>`;
  $$('#result-body .wchip').forEach(b => b.onclick = () => { SFX.click(); speak(b.dataset.en); });
  const next = $('#r-next');
  if (next) next.onclick = () => { SFX.click(); curGrade = r.grade; renderStages(); showScreen('stages'); openPrestudy(r.grade, r.stageNo + 1); };
  $('#r-retry').onclick = () => {
    SFX.click();
    if (r.review) startReview(); else startGame(r.grade, r.words, 'normal', r.stageNo);
  };
  $('#r-home').onclick = () => {
    SFX.click();
    if (r.review) { renderTitle(); showScreen('title'); } else { curGrade = r.grade; renderStages(); showScreen('stages'); }
  };
}

/* ---------- 기억의 신전 (오답 복습) ---------- */
function startReview() {
  const ids = Object.keys(S.wrong).filter(id => wordById(id));
  if (!ids.length) { toast('오답노트가 비어 있어요! 대단해요 👏'); return; }
  const t = todayStr();
  const due = shuffle(ids.filter(id => S.wrong[id].due <= t));
  const rest = shuffle(ids.filter(id => S.wrong[id].due > t));
  const words = due.concat(rest).slice(0, 5).map(wordById);
  closeModal('modal-col');
  openPrestudy(0, 0, words, 'review');
}

/* ---------- 도감 & 오답노트 ---------- */
let colTab = 'dex', colGrade = 1;
function openCollection(tab) { colTab = tab || 'dex'; renderCol(); openModal('modal-col'); }
function renderCol() {
  $('#col-tabs').innerHTML = `<button class="tab ${colTab === 'dex' ? 'on' : ''}" data-t="dex">📖 단어 도감</button><button class="tab ${colTab === 'note' ? 'on' : ''}" data-t="note">📝 오답노트</button>`;
  const body = $('#col-body');
  if (colTab === 'dex') {
    const ws = allWords().filter(w => w.grade === colGrade);
    const got = ws.filter(w => S.collection[w.id]).length;
    body.innerHTML = `<div class="tabs">${[1, 2, 3, 4, 5, 6].map(g => `<button class="tab ${g === colGrade ? 'on' : ''}" data-g="${g}">${g}학년</button>`).join('')}</div>
      <div style="text-align:center;margin:4px 0 8px">수집한 정령 <b>${got}</b> / ${ws.length}</div>
      <div class="dex-grid">${ws.map(w => S.collection[w.id]
        ? `<button class="dex-card" data-en="${esc(w.en)}"><div class="e">${w.emoji}</div><div>${esc(w.en)}</div><small>${esc(w.ko)}</small></button>`
        : `<div class="dex-card off"><div class="e">❓</div><div>???</div></div>`).join('')}</div>`;
  } else {
    const ids = Object.keys(S.wrong).filter(id => wordById(id));
    body.innerHTML = (ids.length ? ids.map(id => { const w = wordById(id), e = S.wrong[id];
      return `<div class="note-row"><div class="e">${w.emoji}</div><div class="m"><b>${esc(w.en)}</b> ${esc(w.ko)}<br><small>틀린 횟수 ${e.count} · 복습 단계 ${e.box}/${BOX_DAYS.length}</small></div><button class="spk" data-en="${esc(w.en)}">🔊</button></div>`; }).join('')
      : '<div class="empty">오답노트가 비어 있어요 🎉<br>틀린 단어가 생기면 여기에 모여요.</div>')
      + (ids.length ? '<div class="row-btns"><button class="btn purple" id="enter-temple">🏛️ 기억의 신전 입장 (코인 2배!)</button></div>' : '');
  }
}

/* ---------- 단어장 관리 ---------- */
function renderManage() {
  $('#custom-count').textContent = '(' + S.custom.length + '개)';
  $('#custom-list').innerHTML = S.custom.length ? S.custom.map(c => `<div class="note-row"><div class="e">${esc(c.emoji || '⭐')}</div>
    <div class="m"><b>${esc(c.en)}</b> ${esc(c.ko)} <small>(${c.grade}학년)</small></div><button class="btn sm" data-del="${esc(c.id)}">삭제</button></div>`).join('')
    : '<div class="empty">아직 추가한 단어가 없어요.</div>';
}
function addCustom(en, ko, emoji, grade, sentence) {
  en = String(en || '').trim(); ko = String(ko || '').trim();
  if (!norm(en) || !ko) return false;
  grade = Math.min(6, Math.max(1, parseInt(grade, 10) || 2));
  if (allWords().some(w => w.grade === grade && w.en.toLowerCase() === en.toLowerCase())) return false;
  S.custom.push({ id: 'c_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), grade, en, ko, emoji: (emoji || '').trim() || '⭐', sentence: (sentence || '').trim() });
  return true;
}
function importWords(text) {
  let arr;
  try { arr = JSON.parse(text); } catch (e) { toast('JSON 형식이 올바르지 않아요'); return; }
  if (!Array.isArray(arr)) { toast('단어 목록(배열) 형식이어야 해요'); return; }
  let n = 0;
  arr.forEach(c => { if (c && addCustom(c.en, c.ko, c.emoji, c.grade, c.sentence)) n++; });
  persist(); renderManage();
  toast(n + '개 단어를 불러왔어요' + (n < arr.length ? ' (중복/오류 ' + (arr.length - n) + '개 제외)' : ''));
}
function exportWords() {
  const data = S.custom.map(c => ({ en: c.en, ko: c.ko, emoji: c.emoji, grade: c.grade, sentence: c.sentence }));
  const json = JSON.stringify(data, null, 2);
  $('#json-box').value = json;
  try {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    a.download = 'word-guardians-words.json';
    document.body.appendChild(a); a.click(); a.remove();
  } catch (e) { /* 텍스트 상자 복사로 대체 */ }
  toast(data.length ? '내보내기 완료!' : '내보낼 단어가 아직 없어요');
}

/* ---------- 이벤트 바인딩 ---------- */
function bind() {
  document.addEventListener('pointerdown', () => ac(), { once: true });

  // 타이틀
  $('#name-input').addEventListener('input', e => { S.name = e.target.value.trim(); persist(); $('#greet').textContent = S.name ? S.name + ' 가디언, 어서 와요!' : '이름을 알려주세요!'; });
  $('#btn-play').onclick = () => { SFX.click(); renderStages(); showScreen('stages'); };
  $('#btn-dex').onclick = () => { SFX.click(); openCollection('dex'); };
  $('#btn-temple').onclick = () => { SFX.click(); startReview(); };
  $('#btn-manage').onclick = () => { SFX.click(); renderManage(); openModal('modal-manage'); };
  $('#btn-mute').onclick = () => { S.muted = !S.muted; persist(); if (S.muted) { try { speechSynthesis.cancel(); } catch (e) { /* 무시 */ } } renderTitle(); SFX.click(); };

  // 스테이지 선택
  $('#btn-stages-back').onclick = () => { SFX.click(); renderTitle(); showScreen('title'); };
  $('#grade-tabs').onclick = e => { const b = e.target.closest('.tab'); if (!b) return; SFX.click(); curGrade = Number(b.dataset.g); renderStages(); };
  $('#stage-grid').onclick = e => { const b = e.target.closest('.stage-card'); if (!b || b.disabled) return; SFX.click(); openPrestudy(curGrade, Number(b.dataset.s)); };

  // 사전 학습
  $('#pre-list').onclick = e => {
    const b = e.target.closest('.spk'); if (!b) return;
    const i = Number(b.dataset.i); speak(pre.words[i].en);
    if (!pre.bonus.has(i)) { pre.bonus.add(i); S.coins += 2; persist(); SFX.coin(); toast('🔊 +2 보너스 코인!'); }
  };
  $('#pre-replay').onclick = () => { SFX.click(); autoPlayPre(); };
  $('#pre-cancel').onclick = () => { SFX.click(); closePre(); };
  $('#pre-go').onclick = () => {
    SFX.click(); const p = pre; closePre();
    startGame(p.grade, p.words, p.mode, p.stageNo);
  };

  // 게임
  $('#btn-quit').onclick = () => {
    if (!confirm('그만두고 나갈까요? (이번 판 기록은 저장되지 않아요)')) return;
    cleanupQ(); hideFeedback(); const r = lastRun; G = null;
    if (r && r.review) { renderTitle(); showScreen('title'); } else { renderStages(); showScreen('stages'); }
  };
  $('#game').addEventListener('click', e => { if (e.target.closest('[data-act="speak"]') && G && G.q) { speak(G.q.w.en); } });

  // 도감
  $('#col-tabs').onclick = e => { const b = e.target.closest('.tab'); if (!b) return; SFX.click(); colTab = b.dataset.t; renderCol(); };
  $('#col-body').onclick = e => {
    const g = e.target.closest('[data-g]'); if (g) { SFX.click(); colGrade = Number(g.dataset.g); renderCol(); return; }
    const sp = e.target.closest('[data-en]'); if (sp) { speak(sp.dataset.en); return; }
    if (e.target.closest('#enter-temple')) { SFX.click(); startReview(); }
  };
  $('#col-close').onclick = () => { SFX.click(); closeModal('modal-col'); };

  // 단어장 관리
  $('#add-form').onsubmit = e => {
    e.preventDefault();
    const ok = addCustom($('#f-en').value, $('#f-ko').value, $('#f-emoji').value, $('#f-grade').value, $('#f-sent').value);
    if (!ok) { toast('영어/한글 뜻을 확인해 주세요 (이미 있는 단어일 수도 있어요)'); return; }
    persist(); renderManage(); SFX.coin();
    ['#f-en', '#f-ko', '#f-emoji', '#f-sent'].forEach(s => { $(s).value = ''; });
    $('#f-en').focus(); toast('단어를 추가했어요!');
  };
  $('#custom-list').onclick = e => {
    const b = e.target.closest('[data-del]'); if (!b) return;
    S.custom = S.custom.filter(c => c.id !== b.dataset.del);
    delete S.wrong[b.dataset.del]; delete S.collection[b.dataset.del];
    persist(); renderManage();
  };
  $('#btn-export').onclick = exportWords;
  $('#btn-import-text').onclick = () => importWords($('#json-box').value);
  $('#btn-import-file').onclick = () => $('#file-import').click();
  $('#file-import').onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => importWords(String(rd.result));
    rd.readAsText(f); e.target.value = '';
  };
  $('#manage-close').onclick = () => { SFX.click(); closeModal('modal-manage'); renderStages(); };
}

/* ---------- 시작 ---------- */
(function init() {
  updateStreak();
  bind();
  renderTitle();
})();
