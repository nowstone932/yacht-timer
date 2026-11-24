// 모의 DOM 통합 테스트: 실제 브라우저 대신 vm 안에서 index.html의 요소를 흉내 낸다.
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
let now=0,interval,visibility;const nodes={};const spoken=[];
const html=fs.readFileSync(__dirname+'/index.html','utf8');
function node(id){return nodes[id]??=( {id,value:'',textContent:'',innerHTML:'',checked:false,disabled:false,hidden:false,dataset:{},style:{},attrs:{},
 classList:{set:new Set(),toggle(c,on){on?this.set.add(c):this.set.delete(c)},contains(c){return this.set.has(c)}},setAttribute(k,v){this.attrs[k]=v}})}
// index.html의 기본값을 읽어 모의 요소에 넣는다.
for(const m of html.matchAll(/<(input|select)[^>]*id="(\w+)"[^>]*>/g)){const n=node(m[2]),tag=m[0];const v=tag.match(/value="([^"]*)"/);if(v)n.value=v[1];if(/checked/.test(tag))n.checked=true}
node('sequence').value='5';node('sensitivity').value='normal';node('minuteMode').value='every';node('step').value='10';node('lang').value='ko';
const i18nNodes=[...html.matchAll(/data-i18n="(\w+)"/g)].map((m,i)=>({dataset:{i18n:m[1]},textContent:''}));
const c={console,performance:{now:()=>now},Date,JSON,Math,
 document:{hidden:false,documentElement:{lang:''},getElementById:id=>node(id),querySelectorAll:()=>i18nNodes,addEventListener:(e,fn)=>visibility=fn},
 speechSynthesis:{cancel(){},speak:u=>spoken.push({text:u.text,lang:u.lang}),getVoices:()=>[]},SpeechSynthesisUtterance:function(t){this.text=t},setInterval:fn=>interval=fn};
c.window=c;vm.createContext(c);for(const f of ['core.js','i18n.js','app.js'])vm.runInContext(fs.readFileSync(__dirname+'/'+f,'utf8'),c,{filename:f});
const mvp=c.mvp,last=()=>spoken[spoken.length-1].text,run=ms=>{for(let i=0;i<ms/100;i++){now+=100;interval()}};
let tests=0;function test(name,fn){fn();console.log('PASS '+name);tests++}
test('화면 문구가 한국어로 채워짐',()=>{assert.ok(i18nNodes.every(n=>n.textContent&&n.textContent!=='undefined'));assert.equal(node('phase').textContent,'출발 대기')});
test('10분 시작 및 지연 보정',()=>{node('start10').onclick();assert.equal(mvp.timer.remaining(),598.5);assert.match(node('clock').innerHTML,/^09:58<span id="tenth">\.5<\/span>$/)});
test('고정 방식: 5분 전까지 분 단위 안내만',()=>{spoken.length=0;run(298500+50);const t=spoken.map(s=>s.text);assert.deepEqual(t,['9분 전','8분 전','7분 전','6분 전','5분 전'])});
test('4분 버튼 맞춤과 −1초',()=>{node('sync').onclick();assert.equal(mvp.timer.remaining(),238.5);node('minus').onclick();assert.equal(mvp.timer.remaining(),237.5)});
test('되돌리기: 직전 맞춤 취소',()=>{node('sync1').onclick();assert.equal(mvp.timer.remaining(),58.5);node('undo').onclick();assert.equal(mvp.timer.remaining(),237.5);assert.equal(node('undo').disabled,true)});
test('마지막 1분: 1분 전 → 50·40 → 30부터 매초 → 출발',()=>{node('delay').value='0';node('sync1').onclick();spoken.length=0;run(60100);const t=spoken.map(s=>s.text);assert.deepEqual(t,['50','40',...Array.from({length:30},(_,i)=>String(30-i)),'출발']);node('delay').value='1.5'});
test('커스텀 방식: 지정 분 + 5초부터 매초',()=>{node('planCustom').checked=true;node('planFixed').checked=false;node('minuteMode').value='list';node('minutes').value='3,1';node('step').value='0';node('countFrom').value='5';node('planCustom').onchange();assert.equal(node('customBox').hidden,false);node('delay').value='0';node('start').onclick();spoken.length=0;run(300100);assert.deepEqual(spoken.map(s=>s.text),['3분 전','1분 전','5','4','3','2','1','출발']);node('planFixed').checked=true;node('planCustom').checked=false;node('planFixed').onchange()});
test('부저: 타이머가 꺼져 있으면 첫 부저 = 5분 신호',()=>{node('reset').onclick();run(2000);assert.equal(mvp.timer.remaining(),null);const onset=now-250;assert.equal(mvp.handleHorn(onset),300);assert.ok(Math.abs(mvp.timer.remaining()-299.75)<1e-9)});
test('부저: 4분 신호를 감지하면 오차를 고침(버튼 2초 늦음 가정)',()=>{run(58000);mvp.timer.adjust(2);const onset=now;assert.equal(mvp.handleHorn(onset),240);assert.ok(Math.abs(mvp.timer.remaining()-240)<1e-9)});
test('부저: 엉뚱한 시점(다른 코스) 경적은 무시',()=>{run(30000);const before=mvp.timer.deadline;now+=5000;assert.equal(mvp.handleHorn(now-100),null);assert.equal(mvp.timer.deadline,before)});
test('부저: 스피커 안내 중엔 내 음성으로 오인하지 않음',()=>{node('audio').onclick();assert.equal(mvp.handleHorn(now),null);node('earphone').checked=true;const r=mvp.timer.remaining();assert.equal(mvp.handleHorn(now+ (r-60)*1000),60);node('earphone').checked=false});
test('부저 보정값: 0.5초 먼저 울린 것으로 계산',()=>{node('reset').onclick();run(3000);node('micOffset').value='0.5';mvp.handleHorn(now);assert.ok(Math.abs(mvp.timer.remaining()-299.5)<1e-9);node('micOffset').value='0'});
test('언어 전환: 영어 화면·음성',()=>{node('lang').value='en';node('lang').onchange();assert.equal(node('phase').textContent,'To start');assert.ok(i18nNodes.some(n=>n.textContent==='Callouts'));node('delay').value='0';node('sync1').onclick();spoken.length=0;run(11000);assert.deepEqual(spoken.map(s=>s.text),['50']);assert.equal(spoken[0].lang,'en-US')});
test('언어 전환: 일본어 분 안내',()=>{node('lang').value='ja';node('lang').onchange();node('start').onclick();spoken.length=0;run(1100);assert.deepEqual(spoken.map(s=>s.text),[]);run(59000);assert.equal(last(),'4分前');assert.equal(spoken[spoken.length-1].lang,'ja-JP');node('lang').value='ko';node('lang').onchange();node('delay').value='1.5'});
test('화면 숨김 음성 억제 및 복귀 재계산',()=>{node('demo').onclick();c.document.hidden=true;visibility();const n=spoken.length;run(1000);assert.equal(spoken.length,n);c.document.hidden=false;visibility();assert.equal(Math.ceil(mvp.timer.remaining()),29)});
test('출발 후 경기 제한·마크 통과·피니시 윈도우',()=>{for(const k of ['race','mark','finish'])node(k).value='0.1';node('apply').onclick();run(29100);node('finishBtn').onclick();node('markBtn').onclick();run(6100);assert.equal(node('raceOut').textContent,'도달');assert.equal(node('markOut').textContent,'통과');assert.equal(node('finishOut').textContent,'도달')});
test('전체 초기화',()=>{node('reset').onclick();assert.equal(mvp.timer.remaining(),null);assert.match(node('clock').innerHTML,/^05:00/)});
console.log(`${tests} DOM tests passed`);
