const {test}=require('node:test');
const assert=require('node:assert/strict');
const load=require('./load-ts.cjs')();
const {createMage,setMageTemporarySpirit,allocateMagePotential}=load('src/gameplay/characters/jobs/mage/MageRuntime.ts');
const {castWaterQ,castWaterE,castWaterR,tickWaterMage,copyRate,drainWaterEvents}=load('src/gameplay/characters/jobs/mage/WaterMageSkills.ts');
const {grantMach}=load('src/gameplay/characters/jobs/mage/WaterMagePassive.ts');
const {addShield,totalShield,absorbShieldDamage}=load('src/gameplay/combat/Shield.ts');
const {resolveDamage}=load('src/gameplay/combat/Damage.ts');
const {createSandboxDummies}=load('src/dev/sandbox/fixtures.ts');
const {createRun,createVillageZone,registerRunCombatBody,castRunQ,castRunR,tickRun,finishRun}=load('src/run/Run.ts');
const {grantPotential}=load('src/gameplay/characters/core/Potential.ts');
const {WATER_MAGE_TUNING:T,WATER_MAGE_COPY_TIMING:COPY,WATER_MAGE_RULES:R}=load('src/config/balance/waterMage.ts');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('E block artwork anchors on the incoming side of the body, including vertical and diagonal hits',()=>{
 const {waterGuardHitAnchor}=load('src/presentation/phaser/WaterSupportEffects.ts');
 const box={x:-18,y:-60,width:36,height:60};
 for(const [side,offset,rotation] of [
  [{x:-1,y:0},{x:-18,y:-30},Math.PI],
  [{x:1,y:0},{x:18,y:-30},0],
  [{x:0,y:-1},{x:0,y:-60},-Math.PI/2],
  [{x:0,y:1},{x:0,y:0},Math.PI/2],
  [{x:1,y:-1},{x:18,y:-48},-Math.PI/4],
 ]){const anchor=waterGuardHitAnchor(side,box);near(anchor.offset.x,offset.x);near(anchor.offset.y,offset.y);near(anchor.rotation,rotation);}
 const fallback=waterGuardHitAnchor({x:0,y:0},box);near(fallback.offset.x,18);near(fallback.rotation,0);
});
function fixture(solo=false){
 const mage=createMage('mage','player','water',150),bodies=createSandboxDummies({x:0,y:0});
 if(solo)bodies.splice(1);
 return {mage,bodies,position:{x:0,y:0},view:{x:-500,y:-500,width:1000,height:1000},now:0,random:()=>.9};
}
function at(ctx,time){ctx.now=time;tickWaterMage(ctx);return ctx;}
function recharge(ctx,time){at(ctx,time);ctx.mage.resources.currentMp=ctx.mage.stats.maxMp;}

test('Q locks ground at cast, clamps range and grants only once after actual AoE hits',()=>{
 const c=fixture(),aim={...c.bodies[0].position},other=createSandboxDummies({x:0,y:0})[0];
 other.id=other.actor.id='enemy-2';c.bodies.push(other);
 assert.equal(castWaterQ(c,aim).ok,true);assert.equal(c.mage.mach,0);assert.equal(c.mage.resources.currentMp,140);
 aim.x=900;at(c,T.q.impactDelay-.001);assert.equal(c.bodies[0].actor.resources.currentHp,10000);
 at(c,T.q.impactDelay);near(c.bodies[0].actor.resources.currentHp,9976);near(other.actor.resources.currentHp,9976);assert.equal(c.mage.mach,1);
 at(c,3);assert.equal(c.mage.mach,1);
 recharge(c,4);castWaterQ(c,{x:2000,y:0});const event=c.mage.waterSkills.scheduled.find(e=>e.kind==='q-impact');near(event.cast.position.x,600);
});
test('Q misses when enemies leave its locked ground; original miss and mirror hit never grant Mach',()=>{
 const c=fixture();castWaterR(c);assert.equal(c.mage.mach,1);castWaterQ(c,{...c.bodies[0].position});
 c.bodies[0].position={x:900,y:900};at(c,T.q.impactDelay);assert.equal(c.mage.mach,1);
 c.bodies[0].position={x:180,y:-30};at(c,R.copyDelay+COPY.flash+COPY.qFlight);
 near(c.bodies[0].actor.resources.currentHp,10000-24*.316);assert.equal(c.mage.mach,1);
 assert.equal(c.mage.waterSkills.mirrors.count,2);assert.equal(c.mage.waterSkills.scheduled.length,0);
});

test('Direct mirror Q checks collision at the shortened impact time and never grants Mach',()=>{
 const c=fixture();castWaterR(c);castWaterQ(c,{...c.bodies[0].position});
 at(c,R.copyDelay);
 const copy=c.mage.waterSkills.scheduled.find(e=>e.kind==='q-impact' && e.cast.execution==='copy');
 near(copy.dueAt,R.copyDelay+COPY.flash+COPY.qFlight);
 assert.ok(copy.dueAt<R.copyDelay+T.q.impactDelay,'Mirror no longer waits for original summon timing');
 at(c,T.q.impactDelay);near(c.bodies[0].actor.resources.currentHp,9976);assert.equal(c.mage.mach,2);
 at(c,copy.dueAt-.001);near(c.bodies[0].actor.resources.currentHp,9976);
 c.bodies[0].position={x:900,y:900};at(c,copy.dueAt);near(c.bodies[0].actor.resources.currentHp,9976);
 assert.equal(c.mage.mach,2,'A direct mirror miss cannot grant Mach or homing-hit the moved enemy');
 const hits=drainWaterEvents(c.mage).filter(e=>e.kind==='damage');assert.equal(hits.length,1);assert.equal(hits[0].execution,'original');
});
test('Several impacts sharing one Q cast instance cannot grant more than one Mach',()=>{
 const c=fixture();castWaterQ(c,{...c.bodies[0].position});
 const first=c.mage.waterSkills.scheduled.find(event=>event.kind==='q-impact');
 c.mage.waterSkills.scheduled.push({...first,dueAt:first.dueAt+.1});
 at(c,first.dueAt+.1);assert.equal(c.mage.mach,1);
 assert.equal(first.cast.machGranted,true);
});
test('Shielded Q hit still counts, and mirror shield layers disappear at their own exact deadline',()=>{
 const c=fixture();addShield(c.bodies[0].actor,{id:'enemy-shield',sourceId:'support',skillId:'any',amount:100,expiresAt:8},0);
 castWaterR(c);castWaterQ(c,{...c.bodies[0].position});castWaterE(c);
 at(c,T.q.impactDelay);assert.equal(c.bodies[0].actor.resources.currentHp,10000);assert.equal(c.mage.mach,3);
 at(c,8);near(totalShield(c.mage,c.now),32*.316);at(c,9.5);near(totalShield(c.mage,c.now),0);
});
test('E defaults to self and existing links do not split or refresh non-READY E',()=>{
 const c=fixture();c.mage.mach=4;castWaterE(c,c.bodies[1].id);
 assert.equal(c.mage.mach,0);near(totalShield(c.mage,0),16);near(totalShield(c.bodies[1].actor,0),16);
 recharge(c,3);castWaterE(c);
 near(totalShield(c.mage,3),48);near(totalShield(c.bodies[1].actor,3),16);
 assert.equal(c.mage.mach,1);assert.equal(c.mage.waterSkills.links[0].expiresAt,10);
});
test('E READY chooses lowest percent HP, then lower current HP, and replaces the previous link',()=>{
 const c=fixture();c.mage.mach=4;castWaterE(c);assert.equal(c.mage.waterSkills.links[0].targetId,c.bodies[1].id);
 c.bodies[1].actor.resources.currentHp=60;c.bodies[2].actor.stats.maxHp=100;c.bodies[2].actor.resources.currentHp=50;
 recharge(c,3);c.mage.mach=4;castWaterE(c);
 assert.equal(c.mage.waterSkills.links.length,1);assert.equal(c.mage.waterSkills.links[0].targetId,c.bodies[2].id);
 assert.equal(c.mage.waterSkills.links[0].expiresAt,13);assert.equal(c.mage.mach,0);
});
test('E selected ally overrides automatic HP choice and invalid targets cost nothing',()=>{
 const c=fixture();c.mage.mach=4;castWaterE(c,c.bodies[2].id);assert.equal(c.mage.waterSkills.links[0].targetId,c.bodies[2].id);
 const bad=fixture(),mp=bad.mage.resources.currentMp;
 assert.equal(castWaterE(bad,bad.bodies[0].id).reason,'target');assert.equal(bad.mage.resources.currentMp,mp);assert.equal(bad.mage.waterSkills.cooldowns.e,0);
 bad.bodies[1].position.x=1000;assert.equal(castWaterE(bad,bad.bodies[1].id).reason,'target');
});
test('Allies outside screen retain READY with full self shield and no solo Spirit',()=>{
 const c=fixture();c.mage.mach=4;c.bodies[1].position.x=c.bodies[2].position.x=1000;
 castWaterE(c);assert.equal(c.mage.mach,4);assert.equal(c.mage.temporarySpirit,0);near(totalShield(c.mage,0),32);assert.equal(c.mage.waterSkills.links.length,0);
});
test('Links survive distance changes but expire or cancel when ally dies, leaves or becomes untargetable',()=>{
 for(const cause of ['distance','death','leave','untargetable','expiry']){
  const c=fixture();c.mage.mach=4;castWaterE(c,c.bodies[1].id);
  if(cause==='distance')c.bodies[1].position.x=10000;
  if(cause==='death')c.bodies[1].actor.resources.currentHp=0;
  if(cause==='leave')c.bodies.splice(1,1);
  if(cause==='untargetable')c.bodies[1].targetable=false;
  at(c,cause==='expiry'?10:1);assert.equal(c.mage.waterSkills.links.length,cause==='distance'?1:0,cause);
 }
});
test('Solo READY E derives temporary Spirit without spending Potential, replaces and refreshes at new level',()=>{
 const c=fixture(true),potential=JSON.stringify(c.mage.progression.potential);c.mage.mach=4;
 castWaterE(c);assert.equal(c.mage.mach,0);assert.equal(c.mage.temporarySpirit,5);near(c.mage.stats.atk,14.5);assert.equal(c.mage.stats.maxMp,180);near(c.mage.stats.mpRegen,2.2);
 near(c.mage.resources.currentMp,145/160*180);assert.equal(JSON.stringify(c.mage.progression.potential),potential);
 grantMach(c.mage,'original');assert.equal(c.mage.mach,1);
 recharge(c,3);c.mage.progression.level=2;c.mage.mach=4;castWaterE(c);
 assert.equal(c.mage.temporarySpirit,10);assert.equal(c.mage.stats.maxMp,200);assert.equal(c.mage.waterSkills.soloBuffExpiresAt,13);
 at(c,12.99);assert.equal(c.mage.temporarySpirit,10);at(c,13);assert.equal(c.mage.temporarySpirit,0);assert.equal(c.mage.stats.maxMp,160);
});
test('Joining allies has no automatic effect; next READY E links while old solo buff lasts to expiry',()=>{
 const c=fixture(true);c.mage.mach=4;castWaterE(c);
 const ally=createSandboxDummies({x:0,y:0})[1];c.bodies.push(ally);at(c,1);
 assert.equal(c.mage.waterSkills.links.length,0);assert.equal(c.mage.temporarySpirit,5);
 recharge(c,3);c.mage.mach=4;castWaterE(c);assert.equal(c.mage.waterSkills.links[0].targetId,ally.id);assert.equal(c.mage.temporarySpirit,5);
 at(c,10);assert.equal(c.mage.temporarySpirit,0);assert.equal(c.mage.waterSkills.links.length,1);
});
test('Temporary Spirit persists correctly through allocation and restores derived stats/resources on removal',()=>{
 const c=fixture(true);c.mage.resources.currentMp=80;setMageTemporarySpirit(c.mage,5);near(c.mage.resources.currentMp,90);
 c.mage.progression.potential=grantPotential(c.mage.progression.potential,1);allocateMagePotential(c.mage,'spirit',1);
 assert.equal(c.mage.stats.maxMp,184);near(c.mage.stats.atk,15);setMageTemporarySpirit(c.mage,0);
 assert.equal(c.mage.stats.maxMp,164);near(c.mage.resources.currentMp,82);near(c.mage.stats.atk,12.5);
});
test('Mirror E keeps the two 50/50 recipients and excludes all Unique effects',()=>{
 const c=fixture();castWaterR(c);c.mage.mach=4;castWaterE(c,c.bodies[1].id);
 assert.equal(c.mage.waterSkills.mirrors.count,2);assert.equal(c.mage.mach,0);
 c.bodies[2].actor.resources.currentHp=1;
 at(c,1.499);near(totalShield(c.mage,c.now),16);at(c,1.5);
 near(totalShield(c.mage,c.now),16*(1+.316));near(totalShield(c.bodies[1].actor,c.now),16*(1+.316));near(totalShield(c.bodies[2].actor,c.now),0);
 assert.equal(c.mage.mach,0);assert.equal(c.mage.waterSkills.links[0].expiresAt,10);assert.equal(c.mage.temporarySpirit,0);
 assert.equal(c.mage.shields[0].expiresAt,8);assert.equal(c.mage.shields[1].expiresAt,9.5);
});
test('Mirror E fizzles only its invalid recipient without refund, redistribution or requiring screen range',()=>{
 for(const invalid of ['dead','untargetable','left','outside']){
  const c=fixture();castWaterR(c);c.mage.mach=4;castWaterE(c,c.bodies[1].id);const ally=c.bodies[1];
  if(invalid==='dead')ally.actor.resources.currentHp=0;
  if(invalid==='untargetable')ally.targetable=false;
  if(invalid==='left')c.bodies.splice(1,1);
  if(invalid==='outside')ally.position.x=10000;
  at(c,1.5);near(totalShield(c.mage,c.now),16*(1+.316));
  near(totalShield(ally.actor,c.now),invalid==='outside'?16*(1+.316):16);
  assert.equal(c.mage.waterSkills.mirrors.count,2);assert.equal(c.mage.mach,0);
 }
});
test('Solo Mirror E copies only original shield amount and never Spirit or passive',()=>{
 const c=fixture(true);castWaterR(c);c.mage.mach=4;castWaterE(c);
 at(c,1.5);near(totalShield(c.mage,c.now),32*(1+.316));assert.equal(c.mage.temporarySpirit,5);
 assert.equal(c.mage.waterSkills.soloBuffExpiresAt,10);assert.equal(c.mage.mach,0);
});
test('R recast replaces unused mirrors but scheduled copies survive; mirrors expire at 12 seconds',()=>{
 const c=fixture();castWaterR(c);castWaterE(c);assert.equal(c.mage.waterSkills.mirrors.count,2);
 c.mage.waterSkills.cooldowns.r=0;c.now=.5;castWaterR(c);assert.equal(c.mage.waterSkills.mirrors.count,3);assert.equal(c.mage.waterSkills.mirrors.expiresAt,12.5);
 at(c,1.5);near(totalShield(c.mage,c.now),32*(1+.316));assert.equal(c.mage.waterSkills.mirrors.count,3);
 at(c,12.5);assert.equal(c.mage.waterSkills.mirrors.count,0);
});
test('Failed MP/cooldown commits leave points, mirrors, shield and costs untouched',()=>{
 const c=fixture();castWaterR(c);const mp=c.mage.resources.currentMp;
 assert.equal(castWaterR(c).reason,'cooldown');assert.equal(c.mage.resources.currentMp,mp);assert.equal(c.mage.mach,1);assert.equal(c.mage.waterSkills.mirrors.count,3);
 c.mage.resources.currentMp=0;assert.equal(castWaterE(c).reason,'mp');assert.equal(castWaterQ(c,{x:0,y:0}).reason,'mp');
 assert.equal(totalShield(c.mage,0),0);assert.equal(c.mage.waterSkills.scheduled.length,0);
});
test('Shield layers stack within and across sources, expire independently and consume earliest deadline first',()=>{
 const target={};
 addShield(target,{id:'e-1',sourceId:'mage',skillId:'water-e',amount:100,expiresAt:8},0);
 addShield(target,{id:'other',sourceId:'ally',skillId:'other-shield',amount:80,expiresAt:5},1);
 addShield(target,{id:'copy',sourceId:'mage',skillId:'water-e',amount:50,expiresAt:9.5},1.5);
 near(totalShield(target,1.5),230);near(absorbShieldDamage(target,100,2),100);
 assert.equal(target.shields.find(s=>s.id==='e-1').amount,80);assert.equal(target.shields.find(s=>s.id==='copy').amount,50);
 addShield(target,{id:'e-2',sourceId:'mage',skillId:'water-e',amount:100,expiresAt:11},3);
 near(totalShield(target,3),230);near(totalShield(target,8),150);near(totalShield(target,9.5),100);near(totalShield(target,11),0);
});
test('Shared damage calculates Crit/DEF/element once then absorbs shields before HP',()=>{
 const c=fixture(),enemy=c.bodies[0].actor;enemy.stats={...enemy.stats,def:50};enemy.element='fire';
 addShield(enemy,{id:'s',sourceId:'support',skillId:'any',amount:10,expiresAt:8},0);
 const result=resolveDamage({source:c.mage,target:enemy,element:'water',rawDamage:40,canCrit:true,targetPolicy:'ENEMY',hit:{kind:'aoe',sourceId:c.mage.id,targetId:enemy.id}},{random:()=>0,now:1});
 near(result.finalDamage,37.5);near(result.absorbedDamage,10);near(result.appliedDamage,27.5);near(enemy.resources.currentHp,9972.5);
});
test('Copy cap, Unique passive cap, caster death and run reset protect lifecycle',()=>{
 near(copyRate(0),.3);near(copyRate(1000),.4);near(copyRate(2000),.5);near(copyRate(100000),.5);
 const c=fixture();c.mage.mach=3;grantMach(c.mage,'copy');assert.equal(c.mage.mach,3);grantMach(c.mage,'original');grantMach(c.mage,'original');assert.equal(c.mage.mach,4);
 castWaterR(c);castWaterQ(c,{...c.bodies[0].position});c.mage.resources.currentHp=0;at(c,5);
 assert.equal(c.mage.waterSkills.scheduled.length,0);assert.equal(c.mage.waterSkills.mirrors.count,0);assert.equal(c.bodies[0].actor.resources.currentHp,10000);
 const run=createRun('kit-run',createVillageZone(),{element:'water',moveSpeed:150}),body=createSandboxDummies(run.player.position)[0];registerRunCombatBody(run,body);
 castRunR(run);castRunQ(run,{...body.position});tickRun(run,T.q.impactDelay);assert.ok(body.actor.resources.currentHp<10000);
 finishRun(run);assert.equal(run.character.waterSkills.scheduled.length,0);assert.equal(run.character.mach,0);
 const fresh=createRun('fresh-kit',createVillageZone(),{element:'water',moveSpeed:150});assert.equal(fresh.character.waterSkills.mirrors.count,0);assert.equal(fresh.time,0);
});
