'use strict';
// TACK 화면 연결: 버튼, 안내 방식, 음성(TTS), 부저 감지(마이크), 다국어.
const { Timer, fixedPlan, customPlan, normalizeCustom, HornDetector, matchSignal } = TackCore;
const { LANGS, phrase } = TackI18n;
const $ = id => document.getElementById(id);
const timer = new Timer();
const RING = 527.79;
let config = {}, fired = new Set(), lastTick = performance.now(), undoState = null;
let speakingUntil = 0, mic = null, wakeLock = null;

// ---- 저장된 설정 (진행 중인 타이머 상태는 저장하지 않음) ----
const SAVE_KEYS = ['lang', 'delay', 'sensitivity', 'micOffset', 'tolerance', 'sequence', 'minuteMode', 'minutes', 'step', 'countFrom'];
const store = {
  load() { try { return JSON.parse(localStorage.getItem('tack.settings') || '{}'); } catch (e) { return {}; } },
  save(v) { try { localStorage.setItem('tack.settings', JSON.stringify(v)); } catch (e) { /* 저장 불가 환경 */ } }
};
function saveSettings() {
  const v = { plan: $('planCustom').checked ? 'custom' : 'fixed', voice: $('voice').checked, earphone: $('earphone').checked };
  for (const k of SAVE_KEYS) v[k] = $(k).value;
  store.save(v);
}
function loadSettings() {
  const v = store.load();
  for (const k of SAVE_KEYS) if (v[k] !== undefined && v[k] !== '') $(k).value = v[k];
  if (v.plan === 'custom') { $('planCustom').checked = true; $('planFixed').checked = false; }
  if (typeof v.voice === 'boolean') $('voice').checked = v.voice;
  if (typeof v.earphone === 'boolean') $('earphone').checked = v.earphone;
}

// ---- 언어 ----
function lang() { return LANGS[$('lang').value] ? $('lang').value : 'ko'; }
function t(key, ...args) { const v = LANGS[lang()].ui[key] ?? LANGS.ko.ui[key]; return typeof v === 'function' ? v(...args) : v; }
function applyLanguage() {
  if (document.documentElement) document.documentElement.lang = lang();
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  const step = $('step'), cur = step.value || '10';
  step.innerHTML = [0, 5, 10, 15, 20, 30].map(n => `<option value="${n}">${n ? t('secEvery', n) : t('off')}</option>`).join('');
  step.value = cur;
  updateMicUi(); render();
}
function detectBrowserLang() {
  const l = (typeof navigator !== 'undefined' && navigator.language || 'ko').slice(0, 2);
  return LANGS[l] ? l : 'ko';
}

// ---- 기록과 음성 ----
function log(text) { $('log').textContent = new Date().toLocaleTimeString() + ' ' + text + '\n' + $('log').textContent; }
function banner(text) { $('banner').textContent = text || ''; }
function pickVoice(tag) {
  if (!('speechSynthesis' in window) || !speechSynthesis.getVoices) return null;
  const voices = speechSynthesis.getVoices() || [], base = tag.slice(0, 2);
  return voices.find(v => v.lang === tag) || voices.find(v => (v.lang || '').replace('_', '-').startsWith(base)) || null;
}
function say(text) {
  log('🔊 ' + text);
  if (!$('voice').checked || document.hidden) return;
  if (!('speechSynthesis' in window)) { log(t('noVoice')); return; }
  speechSynthesis.cancel();
  const L = LANGS[lang()], u = new SpeechSynthesisUtterance(text);
  u.lang = L.tts; u.rate = lang() === 'ko' ? 1.4 : 1.25;
  const voice = pickVoice(L.tts); if (voice) u.voice = voice;
  // 스피커로 안내할 때 내 음성을 부저로 오인하지 않도록 말하는 동안 감지를 막는다.
  speakingUntil = performance.now() + 400 + text.length * 120;
  u.onend = () => { speakingUntil = performance.now() + 300; };
  u.onerror = e => log('TTS: ' + e.error);
  speechSynthesis.speak(u);
}
function stopAudio() { if ('speechSynthesis' in window) speechSynthesis.cancel(); }

// ---- 안내 방식 ----
function readCustom() { return normalizeCustom({ minuteMode: $('minuteMode').value, minutes: $('minutes').value, step: $('step').value, countFrom: $('countFrom').value }); }
function currentPlan() { return $('planCustom').checked ? customPlan(readCustom()) : fixedPlan; }
function updatePlanUi() {
  const custom = $('planCustom').checked;
  $('customBox').hidden = !custom; $('fixedDesc').hidden = custom;
  $('minutes').disabled = $('minuteMode').value !== 'list';
}

// ---- 타이머 맞추기 ----
function remember() { undoState = timer.deadline === null ? { deadline: null } : { deadline: timer.deadline, total: timer.total }; $('undo').disabled = false; }
function afterSync(seconds) { fired.clear(); say(LANGS[lang()].say.synced(seconds)); keepAwake(); render(); updateMicUi(); }
function sync(seconds) {
  const delay = Number($('delay').value);
  remember();
  timer.sync(seconds, delay);
  log(`${seconds / 60} min −${delay}s`);
  afterSync(seconds);
}
function undo() {
  if (!undoState) return;
  if (undoState.deadline === null) timer.reset();
  else { timer.deadline = undoState.deadline; timer.total = undoState.total; timer.last = Math.ceil(timer.remaining()); }
  undoState = null; $('undo').disabled = true; fired.clear(); stopAudio(); log(t('undone')); banner(t('undone')); render(); updateMicUi();
}

// ---- 부저 감지 ----
// onset: 경적이 울리기 시작한 순간(performance.now 기준 ms)
function handleHorn(onset, info = {}) {
  if (!$('earphone').checked && onset < speakingUntil) { log(t('rejected') + ' (TTS)'); return null; }
  const remainingAtOnset = timer.deadline === null ? null : (timer.deadline - onset) / 1000;
  const tol = Math.max(1, Number($('tolerance').value) || 5);
  const signal = matchSignal(remainingAtOnset, $('sequence').value, tol);
  if (signal === null) { const msg = t('ignored', remainingAtOnset === null ? '-' : remainingAtOnset.toFixed(1)); log(msg); banner(msg); return null; }
  remember();
  timer.syncAt(signal, onset, Number($('micOffset').value) || 0);
  const msg = t('detected', signal);
  log(msg + (info.level !== undefined ? ` (${info.level.toFixed(0)} dB, floor ${info.floor.toFixed(0)})` : ''));
  banner(msg);
  afterSync(signal);
  return signal;
}
async function startMic() {
  if (!(typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) { banner(t('micUnsupported')); return; }
  try {
    // 정확도를 위해 통화용 처리(에코 제거·잡음 억제·자동 음량)를 끈다.
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    const AC = window.AudioContext || window.webkitAudioContext, ctx = new AC();
    const src = ctx.createMediaStreamSource(stream);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 150;   // 바람의 낮은 소음 제거
    const proc = ctx.createScriptProcessor(2048, 1, 1), mute = ctx.createGain(); mute.gain.value = 0;
    const detector = new HornDetector({ sampleRate: ctx.sampleRate, sensitivity: $('sensitivity').value });
    proc.onaudioprocess = e => {
      const end = performance.now();
      for (const d of detector.process(e.inputBuffer.getChannelData(0), end)) handleHorn(d.time, d);
      const lvl = Math.max(0, Math.min(1, (detector.level - (detector.floor ?? -90)) / 30));
      $('meterBar').style.width = (lvl * 100).toFixed(0) + '%';
    };
    src.connect(hp); hp.connect(proc); proc.connect(mute); mute.connect(ctx.destination);
    if (ctx.state === 'suspended') await ctx.resume();
    mic = { stream, ctx, detector };
    log(`mic ${ctx.sampleRate} Hz`); keepAwake();
    if (timer.deadline === null) say(LANGS[lang()].say.armed);
  } catch (e) { banner(t('micDenied')); log('mic: ' + e.message); mic = null; }
  updateMicUi();
}
function stopMic() {
  if (mic) { mic.stream.getTracks().forEach(tr => tr.stop()); mic.ctx.close(); mic = null; }
  updateMicUi();
}
function updateMicUi() {
  const on = !!mic;
  $('app').classList.toggle('mic-on', on);
  $('micLabel').textContent = on ? t('micOff') : t('micOn');
  $('micState').textContent = !on ? t('micIdle') : timer.deadline === null ? t('micArmed') : t('micListening');
}

// ---- 화면 꺼짐 방지 ----
async function keepAwake() {
  try {
    if (wakeLock || document.hidden || typeof navigator === 'undefined' || !navigator.wakeLock) return;
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
    log(t('wake'));
  } catch (e) { wakeLock = null; }
}

// ---- 경기 중 기능 ----
function apply() {
  const next = {};
  for (const k of ['race', 'mark', 'finish']) {
    const value = $(k).value;
    if (value === '') next[k] = null;
    else { const n = Number(value); if (!Number.isFinite(n) || n <= 0 || n > 1440) throw Error(t('badTime')); next[k] = n * 60; }
  }
  config = next; fired.clear(); $('settings').textContent = t('settingsApplied');
}
function guard(fn) { return () => { try { fn(); } catch (e) { const m = e.message === 'time' ? t('badInput') : e.message; banner(m); log(m); } }; }

// ---- 그리기 ----
function fmt(s) { s = Math.max(0, s); return [`${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`, `.${Math.floor(s * 10) % 10}`]; }
function setClock(sign, s) { const [main, tenth] = fmt(s); $('clock').innerHTML = `${sign}${main}<span id="tenth">${tenth}</span>`; }
function deadline(id, left, label) {
  $(id).textContent = left === null ? t('off2') : left <= 0 ? t('reached') : fmt(left).join('');
  if (left !== null && left <= 0 && !fired.has(id)) { fired.add(id); say(LANGS[lang()].say.limit(label)); }
}
function render() {
  const r = timer.remaining(), app = $('app');
  if (r === null) { setClock('', Number($('sequence').value) * 60); $('phase').textContent = t('ready'); }
  else if (r > 0) { setClock('', r); $('phase').textContent = t('toStart'); }
  else { setClock('+', -r); $('phase').textContent = t('racing'); }
  app.classList.toggle('final', r !== null && r > 0 && r <= 60);
  app.classList.toggle('racing', r !== null && r <= 0);
  // 바깥 링: 출발 전에는 남은 비율, 경기 중에는 1분 단위 진행
  const frac = r === null ? 1 : r > 0 ? r / (timer.total || 300) : ((-r) % 60) / 60;
  $('ring').setAttribute('stroke-dashoffset', String(RING * (1 - Math.max(0, Math.min(1, frac)))));
  for (const k of ['raceOut', 'markOut', 'finishOut']) $(k).textContent = t('waiting');
  if (r !== null && r <= 0) {
    deadline('raceOut', config.race == null ? null : config.race + r, t('raceLimit'));
    if (timer.markReached) $('markOut').textContent = t('passed');
    else deadline('markOut', config.mark == null ? null : config.mark + r, t('markLimit'));
    if (timer.firstFinish !== null) deadline('finishOut', config.finish == null ? null : config.finish - (performance.now() - timer.firstFinish) / 1000, t('finishWindow'));
  }
}
function drawTicks() {
  let s = '';
  for (let i = 0; i < 60; i++) {
    const a = i / 60 * 2 * Math.PI, major = i % 5 === 0, r1 = 96, r2 = major ? 89 : 92;
    s += `<line class="${major ? 'major' : ''}" x1="${100 + r1 * Math.cos(a)}" y1="${100 + r1 * Math.sin(a)}" x2="${100 + r2 * Math.cos(a)}" y2="${100 + r2 * Math.sin(a)}"/>`;
  }
  $('ticks').innerHTML = s;
}

// ---- 이벤트 연결 ----
$('start10').onclick = guard(() => sync(600));
$('start').onclick = guard(() => sync(300));
$('sync').onclick = guard(() => sync(240));
$('sync1').onclick = guard(() => sync(60));
$('undo').onclick = undo;
$('reset').onclick = () => { stopAudio(); remember(); timer.reset(); fired.clear(); banner(''); log(t('reset')); render(); updateMicUi(); };
for (const [id, sec] of [['minus', -1], ['plus', 1]]) $(id).onclick = () => { timer.adjust(sec); stopAudio(); log(`${sec > 0 ? '+' : ''}${sec}s`); render(); };
$('micBtn').onclick = () => { mic ? stopMic() : startMic(); };
$('apply').onclick = guard(apply);
$('demo').onclick = () => { remember(); timer.sync(30); fired.clear(); say('30'); render(); };
$('audio').onclick = () => say(LANGS[lang()].say.test);
$('voice').onchange = () => { stopAudio(); saveSettings(); };
$('lang').onchange = () => { banner(''); applyLanguage(); saveSettings(); if (!pickVoice(LANGS[lang()].tts) && 'speechSynthesis' in window && (speechSynthesis.getVoices() || []).length) banner(t('noVoice')); };
$('sensitivity').onchange = () => { if (mic) mic.detector.setSensitivity($('sensitivity').value); saveSettings(); };
$('planFixed').onchange = $('planCustom').onchange = $('minuteMode').onchange = () => { updatePlanUi(); saveSettings(); };
for (const id of ['minutes', 'step', 'countFrom', 'delay', 'micOffset', 'tolerance', 'earphone']) $(id).onchange = saveSettings;
$('sequence').onchange = () => { saveSettings(); render(); };
$('markBtn').onclick = () => { const r = timer.remaining(); if (r === null || r > 0) { banner(t('afterStart')); return; } timer.markReached = true; log(t('markBtn')); render(); };
$('finishBtn').onclick = () => { const r = timer.remaining(); if (r === null || r > 0) { banner(t('afterStart')); return; } if (timer.firstFinish !== null) return; timer.firstFinish = performance.now(); log(t('finishBtn')); render(); };

document.addEventListener('visibilitychange', () => {
  stopAudio();
  banner(document.hidden ? t('hidden') : '');
  timer.last = Math.ceil(timer.remaining() ?? 0);   // 복귀 시 지난 안내를 몰아서 읽지 않는다
  if (!document.hidden) keepAwake();
  render();
});
setInterval(() => {
  const now = performance.now(), gap = now - lastTick; lastTick = now;
  const event = timer.tick(currentPlan());
  if (gap > 1500) { stopAudio(); log(`gap ${(gap / 1000).toFixed(1)}s`); }
  else if (event) say(phrase(lang(), event));
  render();
}, 100);

// ---- 시작 ----
(function init() {
  $('lang').innerHTML = Object.entries(LANGS).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('');
  $('lang').value = detectBrowserLang();
  loadSettings(); drawTicks(); applyLanguage(); updatePlanUi(); apply();
  if ('speechSynthesis' in window && speechSynthesis.getVoices) speechSynthesis.getVoices();
})();
window.mvp = { timer, config: () => config, render, handleHorn, currentPlan, t };
