const {test}=require('node:test');
const assert=require('node:assert/strict');
const load=require('./load-ts.cjs')();
const {createWaterCannon,pressWaterCannon,releaseWaterCannon,tickWaterCannon,chargeMoveMultiplier,fullChargeDuration}=load('src/gameplay/characters/jobs/mage/WaterCannon.ts');
const {createProjectile,tickProjectile}=load('src/gameplay/combat/Projectile.ts');
const {createRun,createVillageZone,moveRunPlayer,finishRun,fireRunProjectile,tickRunProjectiles}=load('src/run/Run.ts');
const {grantPotential}=load('src/gameplay/characters/core/Potential.ts');
const {allocateMagePotential}=load('src/gameplay/characters/jobs/mage/MageRuntime.ts');
const {waterCannonDamage,createWaterCannonAttack,resolveWaterCannonHit}=load('src/gameplay/characters/jobs/mage/WaterCannonCombat.ts');
const {createSandboxDummies}=load('src/dev/sandbox/fixtures.ts');
const settings={speed:480,radius:8,range:600};
const aim={x:1,y:0};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);

function combatFixture(){
  const run=createRun('damage',createVillageZone(),{element:'water',moveSpeed:150});
  const [target,ally]=createSandboxDummies({x:0,y:30});
  target.position={x:100,y:0};ally.position={x:50,y:0};
  return {run,mage:run.character,target,ally};
}
function fire(f,ratio,id='shot'){
  return fireRunProjectile(f.run,id,{x:0,y:0},aim,{...settings,chargeRatio:ratio,isFullCharge:ratio===1});
}
test('Water Cannon damage uses ATK and charge ratio, independently of MaxMP',()=>{
  near(waterCannonDamage(100,0),6);near(waterCannonDamage(100,.5),21.75);near(waterCannonDamage(100,1),37.5);
  for(const ratio of [-1,1.01,NaN])assert.throws(()=>waterCannonDamage(12,ratio));
  const f=combatFixture();fire(f,1);f.mage.stats={...f.mage.stats,atk:500,maxMp:1000};
  const [impact]=tickRunProjectiles(f.run,1,[f.target],()=>.9);
  near(impact.damage.rawDamage,4.5);near(impact.damage.appliedDamage,4.5);
});
test('Partial and 99% charge hits deal damage but never grant Mach',()=>{
  for(const ratio of [.5,.99]){
    const f=combatFixture();fire(f,ratio);
    const [impact]=tickRunProjectiles(f.run,1,[f.target],()=>.9);
    assert.equal(impact.damage.hit,true);near(impact.damage.rawDamage,12*(.06+.315*ratio));
    assert.equal(f.mage.mach,0);
  }
});
test('Full charge, release, spawn, miss and obstacle never grant Mach',()=>{
  const f=combatFixture();pressWaterCannon(f.mage.basicAttack);tickWaterCannon(f.mage.basicAttack,10,0,aim);
  assert.equal(f.mage.mach,0);releaseWaterCannon(f.mage.basicAttack);assert.equal(f.mage.mach,0);
  fire(f,1);assert.equal(f.mage.mach,0);tickRunProjectiles(f.run,2,[],()=>.9);assert.equal(f.mage.mach,0);
  assert.equal(f.run.waterCannonAttacks.size,0);
  f.run.zone.objects.push({id:'wall',kind:'obstacle',x:50,y:-20,name:'wall',resource:'rect',shape:{type:'rect',width:2,height:40}});
  fire(f,1,'blocked');const [impact]=tickRunProjectiles(f.run,1,[f.target],()=>.9);
  assert.equal(impact.type,'obstacle');assert.equal(f.mage.mach,0);assert.equal(f.target.actor.resources.currentHp,10000);
});
test('Full charge valid hit grants exactly one Mach and clamps 3/4 and READY',()=>{
  const f=combatFixture();f.mage.mach=3;fire(f,1);
  const [impact]=tickRunProjectiles(f.run,1,[f.target],()=>.9);
  assert.equal(impact.damage.hit,true);assert.equal(f.mage.mach,4);
  assert.equal(tickRunProjectiles(f.run,1,[f.target]).length,0);assert.equal(f.mage.mach,4);
  fire(f,1,'second');tickRunProjectiles(f.run,1,[f.target],()=>.9);assert.equal(f.mage.mach,4);
  finishRun(f.run);assert.equal(f.run.waterCannonAttacks.size,0);
  assert.equal(createRun('new-mach',createVillageZone(),{element:'water',moveSpeed:150}).character.mach,0);
});
test('One attack cannot grant multiple Mach through duplicate callbacks or multiple targets',()=>{
  const f=combatFixture(),attack=createWaterCannonAttack(f.mage,1);
  const hit={kind:'projectile',sourceId:f.mage.id,targetId:f.target.id};
  resolveWaterCannonHit(f.mage,attack,f.target.actor,hit,()=>.9);
  const hp=f.target.actor.resources.currentHp;
  assert.equal(resolveWaterCannonHit(f.mage,attack,f.target.actor,hit,()=>.9),undefined);
  assert.equal(f.target.actor.resources.currentHp,hp);
  const [other]=createSandboxDummies({x:0,y:0});other.id=other.actor.id='other-enemy';
  resolveWaterCannonHit(f.mage,attack,other.actor,{...hit,targetId:other.id},()=>.9);
  assert.equal(f.mage.mach,1);
});
test('Allies and dead enemies cannot stop a combat projectile or grant Mach',()=>{
  const f=combatFixture();fire(f,1);
  const [impact]=tickRunProjectiles(f.run,1,[f.ally,f.target],()=>.9);
  assert.equal(impact.hit.targetId,f.target.id);assert.equal(f.ally.actor.resources.currentHp,30);assert.equal(f.mage.mach,1);
  f.target.actor.resources.currentHp=0;fire(f,1,'dead-target');
  assert.equal(tickRunProjectiles(f.run,2,[f.target],()=>.9).length,0);assert.equal(f.mage.mach,1);
});
test('Water Cannon uses shared Crit, DEF and Water element pipeline including lethal hits',()=>{
  const f=combatFixture();f.target.actor.stats={...f.target.actor.stats,def:50};f.target.actor.element='fire';
  f.target.actor.resources.currentHp=1;fire(f,1);
  const [impact]=tickRunProjectiles(f.run,1,[f.target],()=>0),d=impact.damage;
  near(d.rawDamage,4.5);near(d.afterCrit,6.75);near(d.afterDef,3.375);near(d.finalDamage,4.21875);
  assert.equal(d.appliedDamage,1);assert.equal(d.killed,true);assert.equal(f.mage.mach,1);
});

test('Early release fires immediately once, preserving charge ratio and current aim',()=>{
  const s=createWaterCannon();pressWaterCannon(s);
  tickWaterCannon(s,.735,0,aim);releaseWaterCannon(s);
  assert.equal(s.phase,'firing');assert.equal(chargeMoveMultiplier(s),1);
  releaseWaterCannon(s);
  const shots=tickWaterCannon(s,0,0,{x:0,y:-1});assert.equal(shots.length,1);
  near(shots[0].chargeRatio,.35);assert.equal(shots[0].direction.y,-1);
  assert.equal(tickWaterCannon(s,10,0,aim).length,0);assert.equal(s.phase,'idle');assert.equal(s.shots,1);
  pressWaterCannon(s);releaseWaterCannon(s);near(tickWaterCannon(s,0,0,aim)[0].chargeRatio,0);
});
test('Holding clamps at FULL_CHARGE without firing; release fires once and requires a fresh press',()=>{
  const s=createWaterCannon();pressWaterCannon(s);
  assert.equal(tickWaterCannon(s,3.5,0,aim).length,0);
  assert.equal(s.phase,'full_charge');assert.equal(s.progress,1);near(chargeMoveMultiplier(s),.4);
  pressWaterCannon(s);assert.equal(tickWaterCannon(s,10,0,aim).length,0);assert.equal(s.shots,0);assert.equal(s.progress,1);
  releaseWaterCannon(s);assert.equal(chargeMoveMultiplier(s),1);
  const shots=tickWaterCannon(s,0,0,aim);assert.equal(shots.length,1);assert.equal(shots[0].chargeRatio,1);
  releaseWaterCannon(s);assert.equal(tickWaterCannon(s,10,0,aim).length,0);assert.equal(s.phase,'idle');
  assert.equal(s.shots,1);pressWaterCannon(s);assert.equal(s.phase,'charging');
});
test('Attack speed reaches full sooner but never triggers a shot',()=>{
  near(fullChargeDuration(0),2.1);near(fullChargeDuration(25),1.68);near(fullChargeDuration(100),1.45);
  const run=createRun('attack-speed',createVillageZone(),{element:'water',moveSpeed:150}),mage=run.character;
  mage.progression.potential=grantPotential(mage.progression.potential,1000);allocateMagePotential(mage,'dexterity',1000);
  assert.equal(mage.stats.attackInterval,.65);
  const s=mage.basicAttack;pressWaterCannon(s);
  assert.equal(tickWaterCannon(s,1.44,mage.stats.attackSpeedRating,aim).length,0);assert.equal(s.phase,'charging');
  assert.equal(tickWaterCannon(s,.01,mage.stats.attackSpeedRating,aim).length,0);assert.equal(s.phase,'full_charge');
});
test('Base charge boundary and recovery reject spam without queueing; projectile retains charge metadata',()=>{
  const s=createWaterCannon();pressWaterCannon(s);
  tickWaterCannon(s,2.09,0,aim);assert.equal(s.phase,'charging');
  tickWaterCannon(s,.01,0,aim);assert.equal(s.phase,'full_charge');
  releaseWaterCannon(s);assert.equal(s.phase,'firing');
  const shot=tickWaterCannon(s,0,0,aim)[0];assert.equal(shot.isFullCharge,true);assert.equal(shot.chargeRatio,1);
  assert.equal(s.phase,'recovery');pressWaterCannon(s);
  tickWaterCannon(s,.54,100,aim);assert.equal(s.phase,'recovery');assert.equal(s.held,false);
  pressWaterCannon(s);tickWaterCannon(s,.01,100,aim);assert.equal(s.phase,'idle');
  assert.equal(s.shots,1);pressWaterCannon(s);tickWaterCannon(s,.4,0,aim);releaseWaterCannon(s);
  const partial=tickWaterCannon(s,0,0,aim)[0];near(partial.chargeRatio,.4/2.1);assert.equal(partial.isFullCharge,false);
  const p=createProjectile('charged','mage',{x:0,y:0},aim,{...settings,...shot});
  const hit=tickProjectile(p,1,[{id:'enemy',position:{x:100,y:0},radius:12}],[]);
  assert.equal(hit.isFullCharge,true);assert.equal(hit.chargeRatio,1);
});
test('Charging and full charge movement preserve stats; releasing restores full movement',()=>{
  const run=createRun('moving',createVillageZone(),{element:'water',moveSpeed:150}),s=run.character.basicAttack;
  pressWaterCannon(s);assert.equal(chargeMoveMultiplier(s),1);
  tickWaterCannon(s,1.05,0,aim);near(chargeMoveMultiplier(s),.475);
  moveRunPlayer(run,aim,1,{speed:150,radius:12});near(run.player.position.x,731.25);
  tickWaterCannon(s,1.05,0,aim);assert.equal(s.phase,'full_charge');near(chargeMoveMultiplier(s),.4);
  moveRunPlayer(run,aim,1,{speed:150,radius:12});near(run.player.position.x,791.25);
  assert.equal(run.character.stats.moveSpeed,150);
  releaseWaterCannon(s);assert.equal(chargeMoveMultiplier(s),1);
  moveRunPlayer(run,aim,1,{speed:150,radius:12});near(run.player.position.x,941.25);
});
test('Projectile miss expires by range, diagonal aim remains independent of visual facing',()=>{
  const p=createProjectile('p','mage',{x:0,y:0},{x:1,y:-1},settings);
  assert.equal(tickProjectile(p,2,[{id:'enemy',position:{x:100,y:100},radius:12}],[]),undefined);
  assert.equal(p.active,false);assert.equal(p.remainingRange,0);near(p.position.x,600/Math.sqrt(2));near(p.position.y,-600/Math.sqrt(2));
});
test('Swept projectile confirms first enemy Hit once and cannot pierce; obstacle stops it first',()=>{
  const targets=[{id:'far',position:{x:200,y:0},radius:12},{id:'near',position:{x:100,y:0},radius:12}];
  const p=createProjectile('p','mage',{x:0,y:0},aim,settings);
  const hit=tickProjectile(p,1,targets,[]);assert.equal(hit.type,'enemy');assert.equal(hit.hit.targetId,'near');near(p.position.x,80);
  assert.equal(tickProjectile(p,1,targets,[]),undefined);
  const wall={id:'wall',kind:'obstacle',x:50,y:-20,name:'wall',resource:'rect',shape:{type:'rect',width:2,height:40}};
  const blocked=createProjectile('b','mage',{x:0,y:0},aim,settings);
  assert.equal(tickProjectile(blocked,1,targets,[wall]).type,'obstacle');assert.ok(blocked.position.x<50);
});
test('Run owns projectile lifetime and reset; Hit preview does not mutate HP/MP',()=>{
  const run=createRun('r',createVillageZone(),{element:'water',moveSpeed:150});
  const hp=run.character.resources.currentHp,mp=run.character.resources.currentMp;
  const p=fireRunProjectile(run,'p',{x:0,y:0},aim,{...settings,chargeRatio:.35});near(p.chargeRatio,.35);
  assert.throws(()=>createProjectile('invalid','mage',{x:0,y:0},aim,{...settings,chargeRatio:1.1}));
  const impacts=tickRunProjectiles(run,1,[{id:'e',position:{x:100,y:0},radius:12}]);
  assert.equal(impacts.length,1);near(impacts[0].chargeRatio,.35);assert.equal(run.projectiles.length,1);tickRunProjectiles(run,10,[]);assert.equal(run.projectiles.length,0);
  assert.equal(run.character.resources.currentHp,hp);assert.equal(run.character.resources.currentMp,mp);
  pressWaterCannon(run.character.basicAttack);fireRunProjectile(run,'p2',{x:0,y:0},aim,settings);finishRun(run);
  assert.equal(run.projectiles.length,0);assert.equal(run.character.basicAttack.held,false);
  const next=createRun('new',createVillageZone(),{element:'water',moveSpeed:150});assert.equal(next.character.basicAttack.phase,'idle');
});




test('piercing cannon hits two enemies once, carries them and triggers Siet only once',()=>{
 const f=combatFixture();f.run.zone.objects=[];
 const second=createSandboxDummies({x:0,y:0})[0];second.id='second';second.actor.id='second';second.position={x:160,y:0};
 f.run.combatBodies.push(f.target,second);
 f.mage.waterSkills.swamp={id:1,position:{x:130,y:0},radius:100,bornAt:0,expiresAt:10,extension:0,rawDamage:0,dotDamage:1,stackDamage:0,nextDotAt:1,controlledAt:0,execution:'original',pull:0,slow:0,roar:true};
 const shot=fire(f,1);const hits=tickRunProjectiles(f.run,1,[f.target,second],()=>.99);
 assert.equal(hits.filter(h=>h.type==='enemy').length,2);assert.equal(f.mage.waterSkills.events.filter(e=>e.kind==='swamp-roar').length,1);
 const hp=f.target.actor.resources.currentHp,x=f.target.position.x;
 tickRunProjectiles(f.run,.1,[f.target,second],()=>.99);
 assert.equal(f.target.actor.resources.currentHp,hp);assert.ok(f.target.position.x>x);assert.ok(shot.active);
 tickRunProjectiles(f.run,10,[f.target,second],()=>.99);assert.equal(shot.active,false);
 assert.equal(f.mage.waterSkills.events.filter(e=>e.kind==='swamp-roar').length,1);
});

