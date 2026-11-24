// 실제 Chromium에서 가짜 마이크(합성 경적 WAV)로 부저 감지를 끝까지 확인한다.
// 필요: npm i playwright && npx playwright install chromium   실행: node test-browser-mic.cjs
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');const {chromium}=require('playwright');
// 10초 반복 WAV: 3초 지점부터 1초 동안 경적(330Hz+배음), 나머지는 약한 잡음
function wav(file){const sr=48000,n=sr*10,b=Buffer.alloc(44+n*2);let seed=1;const r=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296*2-1};
 b.write('RIFF',0);b.writeUInt32LE(36+n*2,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(sr,24);b.writeUInt32LE(sr*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);
 for(let i=0;i<n;i++){const t=i/sr;let v=0.01*r();if(t>=3&&t<4)v+=0.4*(Math.sin(2*Math.PI*330*t)+0.5*Math.sin(4*Math.PI*330*t)+0.3*Math.sin(6*Math.PI*330*t))/1.8;b.writeInt16LE(Math.round(Math.max(-1,Math.min(1,v))*32767),44+i*2)}fs.writeFileSync(file,b)}
(async()=>{const file=path.join(os.tmpdir(),'tack-horn.wav');wav(file);
 const b=await chromium.launch({args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-audio-capture='+file]});
 const p=await (await b.newContext({locale:'ko-KR',permissions:['microphone']})).newPage();
 await p.goto('file://'+path.join(__dirname,'index.html'));await p.click('#micBtn');
 await p.waitForFunction(()=>document.getElementById('log').textContent.includes('부저 감지 →'),null,{timeout:15000});
 const rem=await p.evaluate(()=>mvp.timer.remaining());assert.ok(rem>298&&rem<=300);console.log('PASS 첫 경적으로 5분 시작 (남은 '+rem.toFixed(2)+'초)');
 await p.waitForFunction(()=>document.getElementById('log').textContent.includes('무시 (남은'),null,{timeout:15000});
 const m=(await p.evaluate(()=>document.getElementById('log').textContent)).match(/남은 ([\d.]+)초/);assert.ok(Math.abs(Number(m[1])-290)<=0.05,m[1]);
 console.log('PASS 10초 뒤 경적은 무시, 경적 간격 측정 '+m[1]+'초 (기대 290.0)');await b.close()})().catch(e=>{console.error(e);process.exit(1)});
