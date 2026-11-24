// TACK core: 시간 계산, 안내 계획, 부저(경적) 감지. 브라우저와 Node 테스트에서 함께 사용한다.
(function (root) {
'use strict';

// ---------------------------------------------------------------------------
// 1. 타이머: performance.now 기준 마감 시각(deadline)으로 계산한다.
//    반복 콜백 횟수를 흐른 시간으로 쓰지 않는다.
// ---------------------------------------------------------------------------
class Timer {
  constructor(now = () => performance.now()) { this.now = now; this.reset(); }
  reset() { this.deadline = null; this.total = null; this.last = null; this.firstFinish = null; this.markReached = false; }
  // 버튼 입력: seconds 신호에서 사람이 delay 초 늦게 눌렀다고 보고 맞춘다.
  sync(seconds, delay = 0) {
    if (!Number.isFinite(seconds) || seconds <= 0 || !Number.isFinite(delay) || delay < 0 || delay >= seconds) throw Error('time');
    this._set(this.now() + (seconds - delay) * 1000, seconds);
  }
  // 마이크 감지: at(ms) 시각에 seconds 신호가 울렸다. offset 초만큼 실제 신호가 더 일찍 울렸다고 본다(소리 전달 등).
  syncAt(seconds, at, offset = 0) {
    if (!Number.isFinite(seconds) || seconds < 0 || !Number.isFinite(at) || !Number.isFinite(offset)) throw Error('time');
    this._set(at - offset * 1000 + seconds * 1000, Math.max(seconds, this.total || 0));
  }
  _set(deadline, total) {
    this.deadline = deadline; this.total = total;
    this.last = Math.ceil((deadline - this.now()) / 1000);
    this.firstFinish = null; this.markReached = false;
  }
  remaining() { return this.deadline === null ? null : (this.deadline - this.now()) / 1000; }
  adjust(seconds) { if (this.deadline !== null) this.deadline += seconds * 1000; }
  // 남은 초(올림)가 바뀔 때 plan(s)이 돌려주는 안내 사건을 1번만 돌려준다.
  tick(plan = fixedPlan) {
    const r = this.remaining(); if (r === null) return null;
    const s = Math.ceil(r), old = this.last; this.last = s;
    if (old === s) return null;
    if (old > 0 && s <= 0) return { kind: 'start' };
    if (s > 0 && s < old) return plan(s);
    return null;
  }
}

// ---------------------------------------------------------------------------
// 2. 안내 계획. 사건은 언어와 무관한 객체로 만들고 문장은 i18n.js가 만든다.
//    {kind:'min', n} = "n분 전", {kind:'sec', n} = 숫자 카운트다운, {kind:'start'}
// ---------------------------------------------------------------------------
// 고정 방식: 1분 전까지는 매 분 "n분 전"만, 마지막 1분은 기존과 같이 50·40초 후 30초부터 매초.
function fixedPlan(s) {
  if (s >= 60) return s % 60 === 0 ? { kind: 'min', n: s / 60 } : null;
  if (s <= 30 || s % 10 === 0) return { kind: 'sec', n: s };
  return null;
}
const CUSTOM_DEFAULT = { minuteMode: 'every', minutes: [10, 5, 4, 1], step: 10, countFrom: 30 };
function normalizeCustom(c) {
  c = Object.assign({}, CUSTOM_DEFAULT, c || {});
  const minutes = (Array.isArray(c.minutes) ? c.minutes : String(c.minutes).split(/[,\s]+/))
    .map(Number).filter(n => Number.isInteger(n) && n >= 1 && n <= 60);
  const step = Number(c.step), countFrom = Number(c.countFrom);
  return {
    minuteMode: c.minuteMode === 'list' ? 'list' : 'every',
    minutes: [...new Set(minutes)].sort((a, b) => b - a),
    step: [0, 5, 10, 15, 20, 30].includes(step) ? step : 10,
    countFrom: Number.isInteger(countFrom) && countFrom >= 0 && countFrom <= 60 ? countFrom : 30,
  };
}
// 커스텀 방식: 어느 분에 알릴지, 마지막 1분의 간격 안내, 매초 카운트다운 시작점을 사용자가 고른다.
function customPlan(config) {
  const c = normalizeCustom(config);
  return s => {
    if (s >= 60) {
      if (s % 60 !== 0) return null;
      const n = s / 60;
      return c.minuteMode === 'every' || c.minutes.includes(n) ? { kind: 'min', n } : null;
    }
    if (s <= c.countFrom) return { kind: 'sec', n: s };
    if (c.step > 0 && s % c.step === 0) return { kind: 'sec', n: s };
    return null;
  };
}

// ---------------------------------------------------------------------------
// 3. 부저(경적) 감지.
//    - 10ms 프레임 에너지가 적응형 소음 바닥보다 threshold dB 이상 커지면 후보 시작
//    - minDuration 동안 유지되어야 함(파도·충격음·박수 같은 짧은 소리 제거)
//    - 200~5000Hz 대역 스펙트럼이 음정을 가진 소리(낮은 평탄도)여야 함(바람·물보라 같은 잡음 제거)
//    - 시작 시각은 1ms 단위로 되짚어 찾는다. 확정까지 걸린 시간과 무관하게 '울리기 시작한 순간'을 돌려준다.
// ---------------------------------------------------------------------------
const SENSITIVITY = { high: 10, normal: 15, low: 22 };
class HornDetector {
  constructor(o = {}) {
    this.sr = o.sampleRate || 48000;
    this.threshold = SENSITIVITY[o.sensitivity] || (Number.isFinite(o.threshold) ? o.threshold : SENSITIVITY.normal);
    this.minDuration = o.minDurationMs ?? 300;
    this.refractory = o.refractoryMs ?? 2500;
    this.maxFlatness = o.maxFlatness ?? 0.3;
    this.minLevel = o.minLevelDb ?? -55;
    this.frame = Math.round(this.sr / 100);
    this.sub = Math.max(1, Math.round(this.sr / 1000));
    this.reset();
  }
  reset() {
    this.buf = new Float32Array(this.frame); this.fill = 0; this.prev = new Float32Array(this.frame);
    this.frameIndex = 0; this.sampleIndex = 0; this.floor = null; this.level = -120;
    this.cand = null; this.blockUntil = -Infinity; this.waitQuiet = false; this.lastReject = null;
  }
  setSensitivity(name) { if (SENSITIVITY[name]) this.threshold = SENSITIVITY[name]; }
  // samples: Float32Array, endTime: 마지막 샘플 다음 순간의 시각(ms). 확정된 감지 배열을 돌려준다.
  process(samples, endTime) {
    const out = [], startSample = this.sampleIndex, msPer = 1000 / this.sr;
    const timeOf = idx => endTime - (startSample + samples.length - idx) * msPer;
    for (let i = 0; i < samples.length; i++) {
      this.buf[this.fill++] = samples[i]; this.sampleIndex++;
      if (this.fill === this.frame) {
        const d = this._frame(this.sampleIndex - this.frame, timeOf);
        if (d) out.push(d);
        const t = this.prev; this.prev = this.buf; this.buf = t; this.fill = 0;
      }
    }
    return out;
  }
  _frame(firstIdx, timeOf) {
    const db = dbOf(this.buf, 0, this.frame); this.level = db; this.frameIndex++;
    if (this.floor === null) this.floor = db;
    const warm = this.frameIndex > 30, now = timeOf(firstIdx + this.frame);
    const above = db > this.floor + this.threshold && db > this.minLevel;
    if (this.cand) {
      const c = this.cand;
      if (db < this.floor + this.threshold - 6) { this.lastReject = 'short'; this.cand = null; }
      else {
        if (c.samples.length < 8192) for (let i = 0; i < this.frame && c.samples.length < 8192; i++) c.samples.push(this.buf[i]);
        c.peak = Math.max(c.peak, db);
        if (timeOf(firstIdx + this.frame) - c.time >= this.minDuration) {
          const flat = bandFlatness(c.samples, this.sr, 200, 5000);
          this.cand = null; this.waitQuiet = true;
          if (flat <= this.maxFlatness) {
            this.blockUntil = c.time + this.refractory;
            return { time: c.time, level: c.peak, floor: this.floor, flatness: flat };
          }
          this.lastReject = 'noise';
        }
      }
      return null;
    }
    if (above && warm && !this.waitQuiet && now >= this.blockUntil) {
      this.cand = { time: this._onset(firstIdx, timeOf), peak: db, samples: Array.from(this.buf) };
      return null;
    }
    if (this.waitQuiet && !above) this.waitQuiet = false;
    // 소음 바닥: 시작 직후(0.3초)는 빠르게 맞추고, 이후엔 빨리 내려가고 천천히 올라간다.
    // 큰 소리가 계속되면(엔진·바람) 바닥이 따라 올라가 계속 막히지 않게 한다.
    const rate = !warm ? 0.3 : db < this.floor ? 0.1 : above ? 0.002 : 0.003;
    this.floor += (db - this.floor) * rate;
    return null;
  }
  _onset(firstIdx, timeOf) {
    const target = this.floor + this.threshold / 2, all = new Float32Array(this.frame * 2);
    all.set(this.prev, 0); all.set(this.buf, this.frame);
    for (let j = 0; j + this.sub <= all.length; j += this.sub) {
      if (dbOf(all, j, j + this.sub) > target) return timeOf(firstIdx - this.frame + j);
    }
    return timeOf(firstIdx);
  }
}
function dbOf(a, from, to) { let s = 0; for (let i = from; i < to; i++) s += a[i] * a[i]; return 10 * Math.log10(s / (to - from) + 1e-12); }
// 대역 스펙트럼 평탄도(기하평균/산술평균). 순음·경적 ≈ 0에 가깝고 백색 잡음 ≈ 0.5 이상.
function bandFlatness(samples, sr, lo, hi) {
  let n = 1; while (n * 2 <= samples.length && n < 4096) n *= 2;
  if (n < 256) return 1;
  const re = new Float64Array(n), im = new Float64Array(n), off = samples.length - n;
  for (let i = 0; i < n; i++) re[i] = samples[off + i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1)));
  fft(re, im);
  const a = Math.max(1, Math.floor(lo * n / sr)), b = Math.min(n / 2, Math.ceil(hi * n / sr));
  let logSum = 0, sum = 0, k = 0;
  for (let i = a; i < b; i++) { const p = re[i] * re[i] + im[i] * im[i] + 1e-12; logSum += Math.log(p); sum += p; k++; }
  return Math.exp(logSum / k) / (sum / k);
}
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let j = 0; j < len / 2; j++) {
        const a = i + j, b = a + len / 2, tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 4. 감지된 경적을 어느 신호로 볼지 정한다.
//    타이머가 꺼져 있으면 순서의 첫 신호, 켜져 있으면 허용 오차 안의 가장 가까운 신호만 받는다.
// ---------------------------------------------------------------------------
const SEQUENCES = { 10: [600, 300, 240, 60, 0], 5: [300, 240, 60, 0] };
function matchSignal(remainingAtOnset, sequence, tolerance = 5) {
  const marks = SEQUENCES[sequence] || SEQUENCES[5];
  if (remainingAtOnset === null) return marks[0];
  let best = null;
  for (const m of marks) if (Math.abs(remainingAtOnset - m) <= tolerance && (best === null || Math.abs(remainingAtOnset - m) < Math.abs(remainingAtOnset - best))) best = m;
  return best;
}

const api = { Timer, fixedPlan, customPlan, normalizeCustom, CUSTOM_DEFAULT, HornDetector, bandFlatness, matchSignal, SEQUENCES, SENSITIVITY };
if (typeof module !== 'undefined') module.exports = api; else { root.TackCore = api; root.RaceTimer = Timer; }
})(globalThis);
