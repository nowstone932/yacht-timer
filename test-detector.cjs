// 합성 소리로 부저 감지기를 검증한다. 실제 바다 소리 녹음 검증을 대신하지 않는다.
const assert=require('node:assert/strict');const {HornDetector,bandFlatness}=require('./core.js');
const SR=48000;let tests=0;function test(name,fn){fn();console.log('PASS '+name);tests++}
// 재현 가능한 의사 난수
function rng(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296*2-1}}
// 장면: [{from,to,type,amp,freq}] 초 단위. 바탕 잡음 noise.
function scene(seconds,events,noise=0.01,seed=1){const r=rng(seed),n=Math.round(seconds*SR),a=new Float32Array(n);
 for(let i=0;i<n;i++){const t=i/SR;let v=noise*r();
  for(const e of events){if(t<e.from||t>=e.to)continue;const k=t-e.from;
   if(e.type==='horn'){// 기본음+배음, 3ms 상승
    const env=Math.min(1,k/0.003);v+=env*e.amp*(Math.sin(2*Math.PI*e.freq*t)+0.5*Math.sin(4*Math.PI*e.freq*t)+0.3*Math.sin(6*Math.PI*e.freq*t))/1.8}
   else if(e.type==='noise'){v+=e.amp*r()}
   else if(e.type==='click'){v+=e.amp*Math.exp(-k*200)*r()}}
  a[i]=v}return a}
// 실제 앱처럼 2048 샘플 단위로 넣고, 마지막 샘플 시각을 함께 준다.
function run(a,opt={}){const d=new HornDetector(Object.assign({sampleRate:SR},opt)),out=[];for(let i=0;i<a.length;i+=2048){const c=a.subarray(i,Math.min(a.length,i+2048));out.push(...d.process(c,(i+c.length)/SR*1000))}return out}
test('평탄도: 순음은 낮고 백색 잡음은 높다',()=>{const tone=scene(0.1,[{from:0,to:1,type:'horn',amp:0.5,freq:440}],0.001),noise=scene(0.1,[],0.5,7);assert.ok(bandFlatness(Array.from(tone),SR,200,5000)<0.1);assert.ok(bandFlatness(Array.from(noise),SR,200,5000)>0.4)});
test('경적 1개 감지, 시작 시각 오차 3ms 이하',()=>{const out=run(scene(4,[{from:2,to:3,type:'horn',amp:0.4,freq:380}]));assert.equal(out.length,1);assert.ok(Math.abs(out[0].time-2000)<=3,'onset '+out[0].time)});
test('강한 잡음 속 경적(잡음 대비 약 +17dB) 감지, 오차 10ms 이하',()=>{const out=run(scene(5,[{from:3,to:4,type:'horn',amp:0.55,freq:300}],0.06,3));assert.equal(out.length,1);assert.ok(Math.abs(out[0].time-3000)<=10,'onset '+out[0].time)});
test('갑작스러운 바람·물보라 같은 넓은 잡음은 무시',()=>{assert.equal(run(scene(4,[{from:2,to:3,type:'noise',amp:0.5}],0.01,5)).length,0)});
test('짧은 충격음(파도·박수)은 무시',()=>{assert.equal(run(scene(4,[{from:1.5,to:1.6,type:'click',amp:0.9},{from:2.5,to:2.6,type:'click',amp:0.9}])).length,0)});
test('0.2초짜리 짧은 삑 소리는 무시',()=>{assert.equal(run(scene(4,[{from:2,to:2.2,type:'horn',amp:0.4,freq:800}])).length,0)});
test('한 번의 긴 경적(1분 전 긴 신호 4초)은 한 번만 감지',()=>{assert.equal(run(scene(8,[{from:2,to:6,type:'horn',amp:0.4,freq:350}])).length,1)});
test('5분·4분처럼 떨어진 경적 두 개는 각각 감지',()=>{const out=run(scene(10,[{from:2,to:3,type:'horn',amp:0.4,freq:350},{from:7,to:8,type:'horn',amp:0.4,freq:350}]));assert.equal(out.length,2);assert.ok(Math.abs(out[1].time-7000)<=3)});
test('조용한 소리는 감지 안 함(-60dBFS)',()=>{assert.equal(run(scene(4,[{from:2,to:3,type:'horn',amp:0.0007,freq:400}],0.00001)).length,0)});
test('감도 낮음은 약한 경적(약 +11dB)을 놓치고 높음은 잡는다',()=>{const a=scene(5,[{from:3,to:4,type:'horn',amp:0.09,freq:300}],0.02,9);assert.equal(run(a,{sensitivity:'low'}).length,0);assert.equal(run(a,{sensitivity:'high'}).length,1)});
test('마이크가 무음으로 시작한 뒤 잡음이 이어져도 경적 감지',()=>{const a=scene(8,[{from:6,to:7,type:'horn',amp:0.4,freq:330}],0.01,4);a.fill(0,0,4800);const out=run(a);assert.equal(out.length,1);assert.ok(Math.abs(out[0].time-6000)<=3)});
test('계속되는 큰 엔진 소음 속에서도 바닥이 따라가 경적 감지',()=>{const a=scene(20,[{from:1,to:20,type:'noise',amp:0.1},{from:16,to:17,type:'horn',amp:0.9,freq:330}],0.01,6);const out=run(a);assert.equal(out.length,1);assert.ok(Math.abs(out[0].time-16000)<=10,'onset '+(out[0]&&out[0].time))});

console.log(`${tests} detector tests passed`);
