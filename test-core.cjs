const assert=require('node:assert/strict');const {Timer,fixedPlan,customPlan,normalizeCustom,matchSignal}=require('./core.js');let now=0;const t=new Timer(()=>now);let tests=0;function test(name,fn){fn();console.log('PASS '+name);tests++}
const sec=n=>({kind:'sec',n}),min=n=>({kind:'min',n});
test('4분 신호와 1.5초 지연 = 238.5초',()=>{t.sync(240,1.5);assert.equal(t.remaining(),238.5)});
test('±1초 조정',()=>{t.adjust(-1);assert.equal(t.remaining(),237.5);t.adjust(1);assert.equal(t.remaining(),238.5)});
test('콜백 중단에도 기준 시각 유지',()=>{now+=18000;assert.equal(t.remaining(),220.5);assert.equal(t.tick(),null)});
test('마지막 30초 및 중복 차단',()=>{t.sync(31);now+=1000;assert.deepEqual(t.tick(),sec(30));assert.equal(t.tick(),null);now+=1000;assert.deepEqual(t.tick(),sec(29))});
test('출발 전환 한 번',()=>{t.sync(1);now+=1001;assert.deepEqual(t.tick(),{kind:'start'});assert.equal(t.tick(),null)});
test('재동기화는 경기 사건 초기화',()=>{t.firstFinish=123;t.markReached=true;t.sync(240,2);assert.equal(t.firstFinish,null);assert.equal(t.markReached,false);assert.equal(t.remaining(),238)});
test('잘못된 보정 거부',()=>{for(const d of [-1,240,NaN])assert.throws(()=>t.sync(240,d))});
test('전체 초기화',()=>{t.reset();assert.equal(t.remaining(),null)});
// 안내 계획
function spokenSeconds(plan,from){const out=[];for(let s=from;s>0;s--){const e=plan(s);if(e)out.push(e.kind==='min'?e.n+'m':String(e.n))}return out}
test('고정 방식: 1분 전까지는 분 단위만',()=>{const a=spokenSeconds(fixedPlan,600);assert.deepEqual(a.slice(0,10),['10m','9m','8m','7m','6m','5m','4m','3m','2m','1m']);assert.ok(!a.includes('90'))});
test('고정 방식: 마지막 1분은 50·40 후 30초부터 매초',()=>{const a=spokenSeconds(fixedPlan,59);assert.deepEqual(a,['50','40',...Array.from({length:30},(_,i)=>String(30-i))])});
test('커스텀: 지정한 분만 안내',()=>{const a=spokenSeconds(customPlan({minuteMode:'list',minutes:'10, 5 4,1',step:0,countFrom:10}),600);assert.deepEqual(a,['10m','5m','4m','1m','10','9','8','7','6','5','4','3','2','1'])});
test('커스텀: 15초 간격 + 20초부터 매초',()=>{const a=spokenSeconds(customPlan({minuteMode:'every',step:15,countFrom:20}),59);assert.deepEqual(a,['45','30',...Array.from({length:20},(_,i)=>String(20-i))])});
test('커스텀 값 정리: 잘못된 값은 기본값으로',()=>{const c=normalizeCustom({minutes:'abc, 0, 99, 3',step:7,countFrom:-2});assert.deepEqual(c.minutes,[3]);assert.equal(c.step,10);assert.equal(c.countFrom,30)});
test('타이머 tick이 계획을 따른다',()=>{t.sync(61);now+=1000;assert.deepEqual(t.tick(),min(1));now+=1000;assert.equal(t.tick(),null)});
// 마이크 감지 시각 동기화
test('감지 시각 기준 동기화: 경적 200ms 전 시작 + 보정 0.3초',()=>{now=100000;t.syncAt(300,now-200,0.3);assert.equal(t.remaining(),299.5)});
test('신호 매칭: 꺼져 있으면 순서의 첫 신호',()=>{assert.equal(matchSignal(null,10),600);assert.equal(matchSignal(null,5),300)});
test('신호 매칭: 허용 오차 안의 가장 가까운 신호',()=>{assert.equal(matchSignal(242.1,5),240);assert.equal(matchSignal(58,5),60);assert.equal(matchSignal(0.8,5),0)});
test('신호 매칭: 오차 밖이면 무시(다른 코스 경적 등)',()=>{assert.equal(matchSignal(270,5),null);assert.equal(matchSignal(120,10),null)});
console.log(`${tests} tests passed`);
