const {test}=require('node:test');const assert=require('node:assert/strict');
const load=require('./load-ts.cjs')();
const {createMage,grantMageExperience,chooseMageEvolution,allocateMagePotential}=load('src/gameplay/characters/jobs/mage/MageRuntime.ts');
const {castWaterUltimate,castWaterQ,castWaterE,castWaterR,tickWaterMage}=load('src/gameplay/characters/jobs/mage/WaterMageSkills.ts');
const {waterUltimateStatus}=load('src/gameplay/characters/jobs/mage/WaterMageCapstones.ts');
const {grantMach}=load('src/gameplay/characters/jobs/mage/WaterMagePassive.ts');
const {createRun,createVillageZone,finishRun}=load('src/run/Run.ts');
const {waterMageHudModel,waterMageSkillInfo}=load('src/presentation/hud/waterMageHudModel.ts');
const {WaterSkillInput}=load('src/presentation/phaser/WaterSkillInput.ts');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function fixture(path='b1',level=15,allies=0){
 const mage=createMage('p','players','water',150);grantMageExperience(mage,1190);
 chooseMageEvolution(mage,5,path==='b1'?'core-long':'core-ho');
 for(const l of [7,9,11,13,15])if(l<=level)chooseMageEvolution(mage,l,`${path}-${l}`);
 allocateMagePotential(mage,'spirit',75);
 const enemy=createMage('enemy','enemies','water',80);enemy.stats={...enemy.stats,maxHp:1000000,def:50};enemy.resources.currentHp=1000000;
 const bodies=[{id:enemy.id,actor:enemy,position:{x:300,y:300},radius:12}];
 for(let i=0;i<allies;i++){const a=createMage(`a${i}`,'players','water',150);bodies.push({id:a.id,actor:a,position:{x:150+i*20,y:120},radius:12});}
 return {mage,position:{x:100,y:100},bodies,view:{x:0,y:0,width:1000,height:1000},now:0,random:()=>.9};
}
const tick=(c,at)=>{c.now=at;tickWaterMage(c);};
const aim={x:300,y:300};
function barrage(c){
 for(let i=0;i<10;i++){tick(c,1.6+i*.4);assert.equal(castWaterQ(c,{x:999,y:999}).ok,true);tick(c,1.82+i*.4);}
 tick(c,8);
}

test('real A1 and B1 paths unlock all ordered milestones; choosing either never unlocks the other',()=>{
 for(const path of ['a1','b1']){const c=fixture(path);assert.equal(c.mage.progression.evolutionChoices['15'],`${path}-15`);
  assert.throws(()=>chooseMageEvolution(c.mage,15,path==='a1'?'b1-15':'a1-15'));}
});
test('ultimate rejection is atomic for insufficient MP, wrong aim, missing READY, cooldown and unavailable team support',()=>{
 for(const alter of [c=>c.mage.resources.currentMp=229,c=>c.mage.stats.maxMp=0,c=>c.mage.mach=3,c=>c.mage.waterSkills.cooldowns.q=1,
  c=>c.mage.waterSkills.ultimateCooldown=1,c=>{const a=createMage('a','players','water',150);c.bodies.push({id:'a',actor:a,position:{x:2000,y:2000},radius:12});}]){
  const c=fixture();c.mage.mach=4;alter(c);const before=JSON.stringify(c);assert.equal(castWaterUltimate(c,aim).ok,false);assert.equal(JSON.stringify(c),before);
 }
 const c=fixture();c.mage.mach=4;const before=JSON.stringify(c);assert.equal(castWaterUltimate(c,{x:Infinity,y:300}).ok,false);assert.equal(JSON.stringify(c),before);
});
test('B1 spends current MP, preserves movement, blocks E/R/Mach, and accepts exactly ten fast Q in a fixed five-second window',()=>{
 const c=fixture();c.mage.mach=4;c.mage.resources.currentMp=230;
 assert.equal(castWaterUltimate(c,aim).ok,true);assert.equal(c.mage.resources.currentMp,0);
 assert.equal(castWaterQ(c,aim).ok,false);assert.equal(castWaterE(c).ok,false);assert.equal(castWaterR(c).ok,false);
 grantMach(c.mage,'original',.5);assert.equal(c.mage.mach,0);
 tick(c,1.5);close(c.mage.waterSkills.swamp.radius,100);
 for(let i=0;i<10;i++)assert.equal(castWaterQ(c,{x:999,y:999}).ok,true);
 const before=JSON.stringify(c.mage);assert.equal(castWaterQ(c,aim).ok,false);assert.equal(JSON.stringify(c.mage),before);
 tick(c,1.72);assert.equal(c.mage.waterSkills.ultimate.delivered,10);assert.equal(c.mage.waterSkills.swamp.extension,0);
 close(c.mage.waterSkills.ultimate.endsAt,6.5);tick(c,6.5);assert.equal(castWaterQ(c,aim).ok,false);tick(c,8);
 assert.equal(c.mage.waterSkills.ultimate,undefined);assert.equal(c.mage.waterSkills.swamp,undefined);
 assert.equal(c.mage.mach,0);assert.equal(c.mage.waterSkills.links.length,0);
});
test('B1 benchmark: full MP and ten Q deal at least 100k real damage against 1m HP / DEF50 same-element boss',()=>{
 const c=fixture();c.mage.mach=4;assert.equal(castWaterUltimate(c,aim).ok,true);barrage(c);
 const damage=1000000-c.bodies[0].actor.resources.currentHp;
 assert.ok(damage>=100000,`Measured ${damage}`);
 const impact=c.mage.waterSkills.events.find(e=>e.kind==='ultimate-impact');assert.ok(impact.ultimate.accumulated>0);
 close(c.mage.waterSkills.events.filter(e=>e.kind==='damage').at(-1).damage.rawDamage,impact.ultimate.accumulated*.5);
});
test('Siet accumulation is independent of crowd size and duplicate body entries; an empty field cannot accumulate',()=>{
 const run=(count,duplicate=false)=>{
  const c=fixture();for(let i=1;i<count;i++){const e=createMage(`e${i}`,'enemies','water',80);e.stats={...e.stats,maxHp:1000000,def:50};e.resources.currentHp=1000000;c.bodies.push({id:e.id,actor:e,position:{...aim},radius:12});}
  if(count===0)c.bodies=[];
  if(duplicate)c.bodies.push(c.bodies[0]);
  c.mage.mach=4;castWaterUltimate(c,aim);barrage(c);
  return c.mage.waterSkills.events.find(e=>e.kind==='ultimate-impact').ultimate.accumulated;
 };
 close(run(1),run(5));close(run(1),run(1,true));close(run(0),0);
});
test('Q accepted just before deadline arrives and contributes before explosion; eleven and post-window casts add nothing',()=>{
 const c=fixture();c.mage.mach=4;castWaterUltimate(c,aim);tick(c,6.49);assert.equal(castWaterQ(c,aim).ok,true);
 tick(c,6.5);const dot=c.mage.waterSkills.ultimate.accumulated;assert.equal(castWaterQ(c,aim).ok,false);
 tick(c,6.71);assert.equal(c.mage.waterSkills.ultimate.delivered,1);assert.ok(c.mage.waterSkills.ultimate.accumulated>dot);tick(c,7.22);
 assert.equal(c.mage.waterSkills.ultimate,undefined);
});
test('large tick follows the same timeline as incremental ticks without periodic damage after five seconds',()=>{
 const run=steps=>{const c=fixture();c.mage.mach=4;castWaterUltimate(c,aim);for(const at of steps)tick(c,at);return {hp:c.bodies[0].actor.resources.currentHp,events:c.mage.waterSkills.events.filter(e=>e.kind==='damage').map(e=>({at:e.at,raw:e.damage.rawDamage}))};};
 assert.equal(JSON.stringify(run([8])),JSON.stringify(run([1.5,2.5,3.5,4.5,5.5,6.5,7.22,8])));
});
test('B1 empty-MP and half-MP damage cannot equal a full-MP ultimate',()=>{
 const run=mp=>{const c=fixture();c.mage.mach=4;c.mage.resources.currentMp=mp;const result=castWaterUltimate(c,aim);if(!result.ok)return 0;barrage(c);return 1000000-c.bodies[0].actor.resources.currentHp;};
 assert.equal(run(0),0);close(run(230),run(460)*.5);
});
test('A1 READY E consumes only owned live shields, does not mutate on invalid support, and keeps ordinary E',()=>{
 const c=fixture('a1',7);c.mage.shields=[{id:'own',sourceId:'p',skillId:'water-e',amount:20,expiresAt:10},{id:'other',sourceId:'other',skillId:'water-e',amount:50,expiresAt:10}];
 c.mage.mach=4;assert.equal(castWaterE(c,undefined,aim).ok,true);assert.equal(c.mage.shields[0].amount,0);assert.equal(c.mage.shields[1].amount,50);
 tick(c,1.2);close(c.mage.waterSkills.events.find(e=>e.kind==='damage').damage.rawDamage,45);
 tick(c,3);assert.equal(castWaterE(c).ok,true);assert.equal(c.mage.mach,1);assert.ok(c.mage.shields.some(s=>s.sourceId==='p' && s.amount>0));
 const d=fixture('a1',7,1);d.bodies[1].position={x:1500,y:100};d.mage.mach=4;const before=JSON.stringify(d);assert.equal(castWaterE(d,undefined,aim).ok,false);assert.equal(JSON.stringify(d),before);
});
test('A1 level9 roots and erupts; level11 creates four independent prisons; R captures damage without a second cost/support',()=>{
 const c=fixture('a1',11);castWaterR(c);c.mage.mach=4;castWaterE(c,undefined,aim);const mp=c.mage.resources.currentMp;
 tick(c,1.2);assert.equal(c.mage.waterSkills.prisons.length,4);assert.equal(c.bodies[0].slows.some(s=>s.multiplier===0),true);
 tick(c,2.1);assert.equal(c.mage.waterSkills.prisons.length,8);close(c.mage.resources.currentMp,mp);
 const damages=c.mage.waterSkills.events.filter(e=>e.kind==='damage');assert.ok(damages.some(e=>e.execution==='copy'));assert.equal(c.mage.mach,0);
 tick(c,2.95);assert.ok(c.mage.waterSkills.events.some(e=>e.kind==='prison-erupt'));tick(c,5);assert.equal(c.bodies[0].slows.length,0);
});
test('A1 level13 mirror use launches one small dragon per wire without recursion or Mach gain',()=>{
 const c=fixture('a1',13,2);c.mage.waterSkills.links=[{targetId:'a0',expiresAt:10},{targetId:'a1',expiresAt:10}];
 castWaterR(c);castWaterQ(c,aim);
 const small=c.mage.waterSkills.scheduled.filter(e=>e.kind==='q-impact' && e.cast.secondary);
 assert.equal(small.length,2);tick(c,4);assert.equal(c.mage.waterSkills.mirrors.count,2);
 assert.equal(c.mage.waterSkills.events.filter(e=>e.kind==='q-start' && e.cast.secondary).length,2);
 assert.equal(c.mage.mach,2,'R and original Q are the only gains');
});
test('A1 ultimate requires all living party wires, rejects unsupported parties, and costs 90/80/70/60% Max MP',()=>{
 for(let count=0;count<=4;count++){
  const c=fixture('a1',15,count);c.mage.mach=4;
  if(count>0){const before=JSON.stringify(c);assert.equal(castWaterUltimate(c,aim).ok,false);assert.equal(JSON.stringify(c),before);}
  c.mage.waterSkills.links=c.bodies.slice(1).map(b=>({targetId:b.id,expiresAt:10}));
  const before=JSON.stringify(c),result=castWaterUltimate(c,aim);
  if(count===4){assert.equal(result.ok,false);assert.equal(JSON.stringify(c),before);continue;}
  assert.equal(result.ok,true);close(c.mage.resources.currentMp,460*(1-[.9,.8,.7,.6][count]));assert.equal(c.mage.waterSkills.links.length,0);
  tick(c,3);const dragons=c.mage.waterSkills.events.filter(e=>e.kind==='q-start' && e.cast.ultimateId);assert.equal(dragons.length,8);
  assert.equal(c.mage.waterSkills.ultimate,undefined);assert.equal(c.mage.mach,0);
 }
});
test('ultimates neither consume R charges nor create copies; death and run finish cancel pending effects and roots',()=>{
 for(const path of ['a1','b1']){
  const c=fixture(path);castWaterR(c);c.mage.waterSkills.cooldowns.r=0;c.mage.resources.currentMp=c.mage.stats.maxMp;c.mage.mach=4;
  castWaterUltimate(c,aim);assert.equal(c.mage.waterSkills.mirrors.count,3);assert.equal(c.mage.waterSkills.scheduled.some(e=>e.kind.startsWith('copy')),false);
  tick(c,1.5);c.mage.resources.currentHp=0;tick(c,2);assert.equal(c.mage.waterSkills.ultimate,undefined);assert.equal(c.mage.waterSkills.scheduled.length,0);assert.equal(c.bodies[0].slows?.length??0,0);
  const d=fixture(path);d.mage.mach=4;castWaterUltimate(d,aim);const run=createRun('finish',createVillageZone());Object.defineProperty(run,'character',{value:d.mage});run.combatBodies.push(...d.bodies);finishRun(run);
  assert.equal(d.mage.waterSkills.ultimate,undefined);assert.equal(d.mage.waterSkills.scheduled.length,0);
 }
});
test('HUD reads active Q progress even at zero MP and reports exact party eligibility without mutating gameplay',()=>{
 const c=fixture();c.mage.mach=4;const before=JSON.stringify(c);
 assert.equal(waterMageHudModel(c.mage,0,undefined,waterUltimateStatus(c)).skillStatus('q'),'Q+E sẵn sàng');assert.equal(JSON.stringify(c),before);
 castWaterUltimate(c,aim);assert.equal(waterMageHudModel(c.mage,0).skillStatus('q'),'Tụ cầu');tick(c,1.5);castWaterQ(c,aim);
 assert.equal(waterMageHudModel(c.mage,1.5).skillStatus('q'),'1/10 Q');assert.match(waterMageSkillInfo(c.mage,'q').rules.join(' '),/không gia hạn/);
 const a=fixture('a1',15,1);a.mage.mach=4;assert.match(waterMageHudModel(a.mage,0,undefined,waterUltimateStatus(a)).ultimateHint,/đủ dây/);
});
test('Q/E buffering handles either order, single presses, same-key repeats, and cancellation without phantom casts',()=>{
 const calls=[],input=new WaterSkillInput(k=>calls.push(k),()=>calls.push('combo'),.4);
 input.press('q',0,true);input.press('q',.1,true);input.press('e',.2,true);assert.equal(calls.join(','),'combo');
 input.press('e',1,true);input.press('q',1.2,true);assert.equal(calls.join(','),'combo,combo');
 input.press('q',2,true);input.flush(2.4);assert.equal(calls.at(-1),'q');
 input.press('e',3,true);input.clear();input.flush(4);assert.equal(calls.length,3);
 input.press('q',5,false);assert.equal(calls.at(-1),'q');
});
