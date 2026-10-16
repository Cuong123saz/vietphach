const {test}=require('node:test');const assert=require('node:assert/strict');
test('swamp roar plays six swimming frames at pool center and clears on expiry or death',()=>{
 const {WaterSwampEffects}=require('./load-ts.cjs')()('src/presentation/phaser/WaterSwampEffects.ts');
 const images=[];
 const scene={add:{image(x,y,key,frame){const image={x,y,key,frame,destroyed:false,
  setOrigin(){return this;},setTexture(key,frame){this.key=key;this.frame=frame;return this;},
  setPosition(x,y){this.x=x;this.y=y;return this;},setDisplaySize(){return this;},
  setDepth(){return this;},setAlpha(){return this;},destroy(){this.destroyed=true;}};
  images.push(image);return image;}}};
 const effects=new WaterSwampEffects(scene);
 const mage={resources:{currentHp:100},waterSkills:{swamp:{id:1,position:{x:100,y:200},radius:50,
  bornAt:0,expiresAt:5,dotDamage:1,execution:'original'},copiedSwamps:[]}};
 const before=JSON.stringify(mage);
 effects.roar({x:100,y:200},50,1);
 for(let i=0;i<6;i++){
  effects.update(mage,1+i*.1+.001);
  assert.equal(images[0].frame,String(i));assert.equal(images[0].x,100);assert.equal(images[0].y,194);
 }
 effects.roar({x:100,y:200},50,1.55);effects.update(mage,1.56);
 assert.equal(images[0].frame,'0');assert.equal(images.filter(i=>i.key==='water-swamp-dragon-swim').length,1);
 assert.equal(JSON.stringify(mage),before);
 effects.update(mage,2.2);assert.equal(images[0].destroyed,true);
 effects.roar({x:100,y:200},50,3);mage.waterSkills.swamp=undefined;effects.update(mage,3.1);
 assert.equal(images.at(-1).destroyed,true);
 mage.waterSkills.swamp=JSON.parse(before).waterSkills.swamp;
 effects.roar({x:100,y:200},50,4);mage.resources.currentHp=0;effects.update(mage,4.1);
 assert.equal(images.at(-1).destroyed,true);effects.destroy();
});
const load=require('./load-ts.cjs')();
const {createMage,chooseMageEvolution,grantMageExperience}=load('src/gameplay/characters/jobs/mage/MageRuntime.ts');
const {experienceRequired}=load('src/gameplay/progression/Level.ts');
const {castWaterQ,castWaterE,castWaterR,tickWaterMage,flushMachRestores,copyRate}=load('src/gameplay/characters/jobs/mage/WaterMageSkills.ts');
const {waterLongProfile}=load('src/gameplay/characters/jobs/mage/WaterLongRules.ts');
const {createWaterCannonAttack,resolveWaterCannonHit}=load('src/gameplay/characters/jobs/mage/WaterCannonCombat.ts');
const {bodyMoveMultiplier}=load('src/gameplay/combat/CombatBody.ts');
const {createVillageZone,createRun,finishRun}=load('src/run/Run.ts');
const {pullSwampTarget}=load('src/gameplay/characters/jobs/mage/WaterLongSwamp.ts');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function fixture(level=7){
 const mage=createMage('p','players','water',150);
 while(mage.progression.level<level)grantMageExperience(mage,experienceRequired(mage.progression.level));
 chooseMageEvolution(mage,5,'core-long');for(const l of [7,9,11,13])if(l<=level)chooseMageEvolution(mage,l,`b1-${l}`);
 const ally=createMage('a','players','water',150),enemy=createMage('e','enemies','water',80);
 enemy.stats={...enemy.stats,def:0,maxHp:5000};enemy.resources.currentHp=5000;
 mage.resources.currentMp=100;ally.resources.currentMp=40;
 const bodies=[{id:'a',actor:ally,position:{x:200,y:200},radius:12},{id:'e',actor:enemy,position:{x:300,y:300},radius:12}];
 return {mage,position:{x:100,y:100},bodies,now:0,view:{x:0,y:0,width:1000,height:1000},random:()=>.9};
}
const tick=(c,t)=>{c.now=t;tickWaterMage(c);};
const pool=c=>{c.mage.mach=4;assert.equal(castWaterE(c,undefined,{x:300,y:300}).ok,true);return c.mage.waterSkills.swamp;};

test('READY E automatically connects the lowest HP ally before swamp creation and damage',()=>{
 const c=fixture(7),other=createMage('b','players','water',150);
 other.resources.currentHp=other.stats.maxHp*.25;
 c.bodies.push({id:'b',actor:other,position:{x:500,y:500},radius:12});c.mage.mach=4;
 assert.equal(castWaterE(c,'a',{x:300,y:300}).ok,true);
 assert.equal(c.mage.waterSkills.links[0].targetId,'b');
 const events=c.mage.waterSkills.events;
 assert.equal(events[0].kind,'e-support');assert.equal(events[0].targetId,'b');
 assert.equal(events[1].kind,'swamp-start');assert.equal(events[2].kind,'damage');
 const solo=fixture(7);solo.bodies=solo.bodies.filter(b=>b.id!=='a');pool(solo);
 assert.equal(solo.mage.waterSkills.events[0].mode,'solo');assert.equal(solo.mage.temporarySpirit,35);
});

test('READY E cannot skip support when every teammate is outside view; failed cast is atomic',()=>{
 const c=fixture(7);c.mage.mach=4;c.bodies[0].position={x:1200,y:1200};
 const before=JSON.stringify(c.mage);
 assert.equal(castWaterE(c,undefined,{x:300,y:300}).ok,false);
 assert.equal(JSON.stringify(c.mage),before);
 assert.equal(c.mage.waterSkills.swamp,undefined);
});

test('Dry Mach rejects all grant sources without queued refund and starts E cooldown after extended expiry',()=>{
 const {grantMach}=load('src/gameplay/characters/jobs/mage/WaterMagePassive.ts');
 const {waterMageHudModel}=load('src/presentation/hud/waterMageHudModel.ts');
 const {WATER_MAGE_TUNING:T}=load('src/config/balance/waterMage.ts');
 const c=fixture(9),s=pool(c);
 grantMach(c.mage,'original',.1);assert.equal(c.mage.mach,0);
 const attack=createWaterCannonAttack(c.mage,1);
 resolveWaterCannonHit(c.mage,attack,c.bodies[1].actor,{kind:'projectile',sourceId:'p',targetId:'e'},c.random,.1);
 assert.equal(c.mage.mach,0);assert.equal(c.mage.waterSkills.pendingMachRestores.length,0);
 assert.equal(castWaterR(c).ok,true);assert.equal(c.mage.mach,0);
 c.mage.waterSkills.mirrors.count=0;
 assert.equal(castWaterQ(c,{x:300,y:300}).ok,true);tick(c,1.48);
 assert.equal(c.mage.mach,0);near(s.expiresAt,4.5);
 near(c.mage.waterSkills.cooldowns.e,s.expiresAt+T.e.cooldown);
 const before=JSON.stringify(c.mage);assert.equal(castWaterE(c).ok,false);assert.equal(JSON.stringify(c.mage),before);
 assert.equal(waterMageHudModel(c.mage,c.now).skillStatus('passive'),'Khô Mạch');
 assert.equal(waterMageHudModel(c.mage,c.now).skillStatus('e'),'Khóa hồi chiêu');
 tick(c,4.5);assert.equal(c.mage.mach,0,'blocked gains never return');
 grantMach(c.mage,'original',4.5);assert.equal(c.mage.mach,1);
 near(c.mage.waterSkills.cooldowns.e-c.now,T.e.cooldown);
 assert.equal(castWaterE(c).ok,false);
 tick(c,4.5+T.e.cooldown);c.mage.resources.currentMp=100;assert.equal(castWaterE(c).ok,true);
});

test('copied E keeps Dry Mach and postpones cooldown until the last swamp ends, including a large tick',()=>{
 const {grantMach}=load('src/gameplay/characters/jobs/mage/WaterMagePassive.ts');
 const {WATER_MAGE_TUNING:T}=load('src/config/balance/waterMage.ts');
 const c=fixture(11);castWaterR(c);pool(c);tick(c,4);
 assert.equal(c.mage.waterSkills.swamp,undefined);grantMach(c.mage,'original',4);assert.equal(c.mage.mach,0);
 near(c.mage.waterSkills.cooldowns.e,5.5+T.e.cooldown);
 tick(c,5.5);grantMach(c.mage,'original',5.5);assert.equal(c.mage.mach,1);
 const d=fixture(11);castWaterR(d);pool(d);tick(d,20);
 assert.equal(d.mage.waterSkills.copiedSwamps.length,0);near(d.mage.waterSkills.cooldowns.e,5.5+T.e.cooldown);
 grantMach(d.mage,'original',20);assert.equal(d.mage.mach,1);
});

test('without Q a moving monster can escape every swamp tier before the field expires',()=>{
 for(const level of [7,9,11,13]){
  const c=fixture(level),s=pool(c),enemy=c.bodies[1];
  enemy.position.x+=s.radius*.65;
  for(let frame=1;frame<=38;frame++){
   tick(c,frame*.05);
   enemy.position.x+=enemy.actor.stats.moveSpeed*bodyMoveMultiplier(enemy,c.now)*.05;
  }
  assert.ok(enemy.position.x-s.position.x>s.radius+enemy.radius,`Lv${level}: monster remains inside`);
  assert.equal(c.mage.waterSkills.swamp,s,'escape occurs while swamp is still active');
  assert.equal(s.extension,0);assert.equal(s.stackDamage,0);
 }
});

test('ordinary E still grants the full shield and one Mach throughout B1 evolution',()=>{
 for(const level of [7,9,11,13]){const c=fixture(level);
  c.mage.waterSkills.links=[{targetId:'a',expiresAt:10}];assert.equal(castWaterE(c).ok,true);
  assert.equal(c.mage.shields[0].amount,32);assert.equal(c.mage.mach,1);assert.equal(c.mage.waterSkills.swamp,undefined);
  near(c.mage.resources.currentMp,86.6);near(c.bodies[0].actor.resources.currentMp,41.6);
 }
});
test('Lv5 MP restore requires actual Mach gain: full cannon hit once; miss and capped counter give none',()=>{
 const c=fixture(5);c.mage.waterSkills.links=[{targetId:'a',expiresAt:10}];
 const shot=createWaterCannonAttack(c.mage,1),hit={kind:'projectile',sourceId:'p',targetId:'e'};
 resolveWaterCannonHit(c.mage,shot,c.bodies[1].actor,hit,c.random);flushMachRestores(c);
 near(c.mage.resources.currentMp,101.6);near(c.bodies[0].actor.resources.currentMp,41.6);
 resolveWaterCannonHit(c.mage,shot,c.bodies[1].actor,hit,c.random);flushMachRestores(c);near(c.mage.resources.currentMp,101.6);
 c.mage.mach=4;castWaterR(c);near(c.mage.resources.currentMp,71.6);
 const miss=fixture(5);castWaterQ(miss,{x:700,y:700});tick(miss,2.31);assert.equal(miss.mage.mach,0);near(miss.mage.resources.currentMp,80);
});
test('READY E consumes four, creates a 4s swamp without shield, and blindly selects a link; invalid placement is atomic',()=>{
 const c=fixture(7);c.mage.mach=4;const before=JSON.stringify(c.mage);
 assert.equal(castWaterE(c).ok,false);assert.equal(JSON.stringify(c.mage),before);
 const s=pool(c);assert.equal(c.mage.mach,0);assert.equal(c.mage.shields.length,0);assert.equal(c.bodies[0].actor.shields.length,0);
 assert.equal(c.mage.waterSkills.links[0].targetId,'a');assert.equal(s.radius,50);assert.equal(s.expiresAt,4);
 assert.equal(c.bodies[1].actor.resources.currentHp,4968);near(c.mage.resources.currentMp,85);
 const solo=fixture(7);solo.bodies=solo.bodies.filter(b=>b.id!=='a');pool(solo);assert.equal(solo.mage.temporarySpirit,35);
});
test('Q multipliers and radius accumulate through Lv9/11/13; flight stays unchanged',()=>{
 for(const [level,radius,damage,charge,cd] of [[7,50,1,1,4],[9,65,.5,.5,4],[11,78,.25,.25,2],[13,85.8,.125,.125,1]]){
  const c=fixture(level),p=waterLongProfile(c.mage);near(p.radius,radius);near(p.qDamageMultiplier,damage);
  near(p.qChargeMultiplier,charge);near(p.qCooldown,cd);
  castWaterQ(c,{x:300,y:300});const cast=c.mage.waterSkills.scheduled[0].cast;
  near(cast.rawDamage,24*damage);near(cast.impactAt,1.66*charge+.65);
  near(cast.radius,level>=11?radius:37.5);
 }
});
test('Lv9 Q locks the pool center, extends once per cast on hit, and misses give no extension',()=>{
 const c=fixture(9),s=pool(c);castWaterQ(c,{x:800,y:800});
 assert.equal(c.mage.waterSkills.scheduled[0].cast.position.x,300);
 tick(c,1.48);near(s.extension,.5);near(s.expiresAt,4.5);assert.equal(c.mage.mach,0);
 const miss=fixture(9),m=pool(miss);miss.bodies[1].position={x:900,y:900};castWaterQ(miss,{x:800,y:800});tick(miss,1.48);assert.equal(m.extension,0);
});
test('Q and mirror Q share a hard 2s extension ceiling; copies do not grant Mach or MP',()=>{
 const c=fixture(13),s=pool(c);c.mage.waterSkills.scheduled=[];
 for(let i=0;i<7;i++)c.mage.waterSkills.scheduled.push({kind:'q-impact',dueAt:(i+1)/10,cast:{id:i,position:{x:300,y:300},rawDamage:1,
  execution:'copy',impactAt:(i+1)/10,machGranted:false,radius:s.radius,effectRate:.4}});
 tick(c,.7);near(s.extension,2);near(s.expiresAt,6);assert.equal(c.mage.mach,0);near(c.mage.resources.currentMp,85);
 near(s.stackDamage,7*1.2*.4);
});
test('Lv11 Siet ticks 5% Max MP each second only inside the pool, with exact expiry',()=>{
 const c=fixture(11),s=pool(c);near(s.dotDamage,8);tick(c,1);near(c.bodies[1].actor.resources.currentHp,4960);
 c.bodies[1].position={x:800,y:800};tick(c,4);near(c.bodies[1].actor.resources.currentHp,4960);
 assert.equal(c.mage.waterSkills.swamp,undefined);
 const d=fixture(11);pool(d);tick(d,4);near(d.bodies[1].actor.resources.currentHp,4936);
});
test('Lv13 Q procs current Siet before adding 10% current ATK, then next Siet uses the increase',()=>{
 const c=fixture(13),s=pool(c);castWaterQ(c,{x:900,y:900});tick(c,.8575);
 near(c.bodies[1].actor.resources.currentHp,4968-3-8);near(s.stackDamage,1.2);
 assert.ok(c.mage.waterSkills.events.some(e=>e.kind==='swamp-roar'));
 tick(c,1);near(c.bodies[1].actor.resources.currentHp,4968-3-8-9.2);
});

test('Siet applies one copy rate across all original/copied Q and swamp combinations',()=>{
 for(const [copiedPool,copiedQ,qRate,burst,increase] of [
  [false,false,1,50,10],[false,true,.4,20,4],
  [true,false,1,20,4],[true,true,.4,20,4],
  [true,true,.5,20,4], // A later Q's rate must not rescale the captured E copy.
 ]){
  const c=fixture(13);c.mage.stats={...c.mage.stats,maxMp:1000,atk:100};
  if(copiedPool)assert.equal(castWaterR(c).ok,true);
  let s=pool(c);
  if(copiedPool){
   tick(c,1.5);s=c.mage.waterSkills.copiedSwamps[0];
   c.mage.waterSkills.swamp=undefined;
  }
  const impactAt=c.now+.1,dragonDamage=25*qRate;
  s.nextDotAt=impactAt+1;
  c.mage.waterSkills.scheduled.push({kind:'q-impact',dueAt:impactAt,cast:{
   id:100,position:{...s.position},rawDamage:dragonDamage,
   execution:copiedQ?'copy':'original',impactAt,machGranted:false,radius:s.radius,effectRate:qRate,
  }});
  const events=c.mage.waterSkills.events.length;
  tick(c,impactAt);
  const hits=c.mage.waterSkills.events.slice(events).filter(e=>e.kind==='damage');
  assert.equal(hits.length,2);near(hits[0].damage.rawDamage,dragonDamage);
  near(hits[1].damage.rawDamage,burst);near(s.stackDamage,increase);
  near(s.extension,.5);assert.equal(c.mage.mach,0);
  tick(c,impactAt+1);
  near(c.mage.waterSkills.events.filter(e=>e.kind==='damage').at(-1).damage.rawDamage,
   s.dotDamage+increase);
 }
});
test('R copies the E swamp at captured effectiveness with its own duration and no second link/SPI/Mach',()=>{
 const c=fixture(11);castWaterR(c);c.mage.mach=4;const s=pool(c),rate=copyRate(160);
 tick(c,1.5);assert.equal(c.mage.waterSkills.copiedSwamps.length,1);const mirror=c.mage.waterSkills.copiedSwamps[0];
 near(mirror.rawDamage,32*rate);near(mirror.dotDamage,8*rate);near(mirror.expiresAt,5.5);
 assert.equal(c.mage.waterSkills.links.length,1);assert.equal(c.mage.mach,0);assert.equal(s.extension,0);
 tick(c,4);assert.equal(c.mage.waterSkills.swamp,undefined);assert.equal(c.mage.waterSkills.copiedSwamps.length,1);
 tick(c,5.5);assert.equal(c.mage.waterSkills.copiedSwamps.length,0);
});

test('Q can use the surviving copied swamp after the original expires; new original resets Siet increase',()=>{
 const c=fixture(13);castWaterR(c);pool(c);tick(c,4);
 assert.equal(c.mage.waterSkills.swamp,undefined);
 const mirror=c.mage.waterSkills.copiedSwamps[0];assert.ok(mirror);
 assert.equal(castWaterQ(c,{x:800,y:800}).ok,true);
 assert.deepEqual(c.mage.waterSkills.scheduled.find(e=>e.kind==='q-impact').cast.position,mirror.position);
 tick(c,4.8575);near(mirror.extension,.5);assert.ok(mirror.stackDamage>0);
 c.now=5;c.mage.mach=4;c.mage.resources.currentMp=100;
 assert.equal(castWaterE(c,undefined,{x:300,y:300}).ok,false,'copy still locks E');
 tick(c,20);c.mage.mach=4;c.mage.resources.currentMp=100;
 const fresh=pool(c);near(fresh.stackDamage,0);
 assert.ok(mirror.stackDamage>0);
});
test('slow never mutates base stats; pull respects walls; death and run finish clear effects',()=>{
 const c=fixture(11),s=pool(c);tick(c,.1);near(bodyMoveMultiplier(c.bodies[1],.1),.7);assert.equal(c.bodies[1].actor.stats.moveSpeed,80);
 const wallZone=createVillageZone();wallZone.objects=[{id:'wall',name:'Wall',kind:'obstacle',resource:'',x:240,y:0,shape:{type:'rect',width:10,height:600}}];
 c.bodies[1].position={x:280,y:300};s.position={x:200,y:300};pullSwampTarget(c,s,c.bodies[1],100,wallZone);
 assert.ok(c.bodies[1].position.x>=262);
 c.mage.resources.currentHp=0;tick(c,.2);assert.equal(c.mage.waterSkills.swamp,undefined);near(bodyMoveMultiplier(c.bodies[1],.2),1);
 const run=createRun('r',createVillageZone(),{element:'water',moveSpeed:150});run.character.waterSkills.pendingMachRestores=[1];
 finishRun(run);assert.equal(run.character.waterSkills.pendingMachRestores.length,0);
});
test('stage: each Q dragon that sets off Siet grants the mage an E shield of 1% Max MP',()=>{
 const c=fixture(13);pool(c);
 const before=(c.mage.shields??[]).filter(s=>s.skillId==='water-e').reduce((a,s)=>a+s.amount,0);
 // Only the shield ratio is set (after casting), so the fixture's ordinary Q rules still apply.
 castWaterQ(c,{x:900,y:900});c.mage.waterSkills.encounterBuff={qSietShieldMpRatio:.01};tick(c,.8575);
 assert.ok(c.mage.waterSkills.events.some(e=>e.kind==='swamp-roar'));
 const after=c.mage.shields.filter(s=>s.skillId==='water-e').reduce((a,s)=>a+s.amount,0);
 near(after-before,c.mage.stats.maxMp*.01);
 const plain=fixture(13);pool(plain);const base=(plain.mage.shields??[]).length;castWaterQ(plain,{x:900,y:900});tick(plain,.8575);
 assert.equal((plain.mage.shields??[]).length,base,'ordinary runs: no Siet shield');
});
