const {test}=require('node:test');
const assert=require('node:assert/strict');
const load=require('./load-ts.cjs')();
const {createRun,createVillageZone,registerRunCombatBody,registerRunEnemyController,tickRun,castRunE,finishRun}=load('src/run/Run.ts');
const {createSandboxMonsters,MONSTER_AI_TUNING:T}=load('src/dev/sandbox/monsters.ts');
const {setEnemyCombatEnabled,resetEnemyCombat}=load('src/gameplay/enemies/EnemyCombat.ts');
const {totalShield}=load('src/gameplay/combat/Shield.ts');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function fixture(kind='ranged',gap=200){
  const run=createRun('enemy-ai',createVillageZone(),{element:'water',moveSpeed:150});
  run.player.position={x:300,y:200};run.player.hitbox={x:-18,y:-64,width:36,height:64};
  const enemy=createSandboxMonsters({x:0,y:0},[{id:'test',name:'Enemy'}],()=>0)[0];
  enemy.actor.element='water';enemy.position={x:300-gap,y:200};enemy.hitbox={x:-18,y:-30,width:36,height:30};
  registerRunCombatBody(run,enemy);registerRunEnemyController(run,enemy.id,{...T,kind,visual:'thorn',attackRange:kind==='melee'?T.meleeRange:T.rangedRange});
  return {run,enemy,state:run.enemyCombat.controllers[0]};
}
function advance(run,seconds){for(let remaining=seconds;remaining>1e-8;){const dt=Math.min(.025,remaining);tickRun(run,dt);remaining-=dt;}}

test('Ue snail commits each burst aim before release and cannot redirect into a late sidestep',()=>{
 const f=fixture('ranged',200);f.run.zone.objects=[];
 Object.assign(f.state.settings,load('src/run/KhangChienStage.ts').stageTraits('elite-crop-snail'));
 f.state.settings.pursuit='relentless';
 tickRun(f.run,0);advance(f.run,.82);assert.ok(f.state.aimLocked);
 const aim={...f.state.aim};f.run.player.position.y+=120;
 advance(f.run,.3);assert.equal(f.run.enemyCombat.shots.length,1);assert.equal(f.state.aimLocked,false,'second windup reacquires');
 const d=f.run.enemyCombat.shots[0].projectile.direction;
 near(d.y/d.x,(aim.y-f.state.origin.y)/(aim.x-f.state.origin.x));
 advance(f.run,.33);assert.ok(f.state.aimLocked,'second shot also commits before release');
 const secondAim={...f.state.aim};f.run.player.position.y-=240;advance(f.run,.31);
 const second=f.run.enemyCombat.shots.at(-1);assert.equal(f.state.serial,2);
 near(second.projectile.direction.y/second.projectile.direction.x,(secondAim.y-f.state.origin.y)/(secondAim.x-f.state.origin.x));
});

test('Ue displaced counter holds its last warning direction; a sideways dodge misses and a fresh episode re-aims',()=>{
 const f=fixture('melee',200);f.run.zone.objects=[];f.run.character.resources.currentHp=f.run.character.stats.maxHp=10000;
 Object.assign(f.state.settings,load('src/run/KhangChienStage.ts').stageTraits('flat-fur-rat'));
 f.state.settings.pursuit='relentless';f.run.player.hitbox={...f.enemy.hitbox};
 f.state.nextAttackAt=999;tickRun(f.run,0);f.enemy.position.x-=12;tickRun(f.run,.025);
 advance(f.run,.72);assert.ok(f.state.aimLocked);const committed={...f.state.aim},before={...f.enemy.position};
 f.run.player.position.y+=140;advance(f.run,.25);near(f.state.aim.x,committed.x);near(f.state.aim.y,committed.y);
 advance(f.run,.9);near(f.enemy.position.y,before.y);assert.ok(f.enemy.position.x>before.x+100,'counter actually travels');assert.equal(f.run.character.resources.currentHp,10000,'sidestep clears the straight sweep');
 advance(f.run,.5);f.enemy.position.x-=15;tickRun(f.run,.025);assert.ok(f.state.counter && !f.state.counter.fired);
 assert.equal(f.state.aimLocked,false);assert.equal(f.state.aim.y,load('src/world/bodyGeometry.ts').bodyCenter(f.run.player).y);
});

test('Ue tar trail warns before damage and slowing, then expires from the collision runtime',()=>{
 const f=fixture('ranged',200);f.run.zone.objects=[];
 f.run.character.resources.currentHp=f.run.character.stats.maxHp=10000;f.state.nextAttackAt=999;
 Object.assign(f.state.settings,load('src/run/KhangChienStage.ts').stageTraits('mutant-caterpillar'));
 tickRun(f.run,0);f.enemy.position.x+=70;tickRun(f.run,.025);
 const z=f.run.enemyCombat.zones[0];assert.ok(z);f.run.player.position={...z.position};const hp=f.run.character.resources.currentHp;
 advance(f.run,z.activeAt-f.run.time-.02);assert.equal(f.run.character.resources.currentHp,hp);assert.equal(f.run.player.slows.length,0);
 advance(f.run,.04);assert.ok(f.run.character.resources.currentHp<hp);assert.ok(f.run.player.slows.some(s=>s.multiplier<1));
 f.enemy.actor.stats.moveSpeed=0;f.state.phase='recover';f.state.phaseEndsAt=999;
 advance(f.run,z.expiresAt-f.run.time+.01);assert.ok(!f.run.enemyCombat.zones.includes(z));
});

test('Ue counter cancels its committed travel when its last valid target disappears',()=>{
 const f=fixture('melee',200);f.run.zone.objects=[];
 Object.assign(f.state.settings,load('src/run/KhangChienStage.ts').stageTraits('flat-fur-rat'),{pursuit:'relentless'});
 f.state.nextAttackAt=999;tickRun(f.run,0);f.enemy.position.x-=12;tickRun(f.run,.025);advance(f.run,1.03);
 assert.ok(f.state.counter?.fired);f.run.character.resources.currentHp=0;tickRun(f.run,.025);
 assert.equal(f.state.counter,undefined);assert.equal(f.state.phase,'idle');assert.equal(f.state.aim,undefined);assert.equal(f.state.aimLocked,false);
 const p={...f.enemy.position};advance(f.run,.5);near(f.enemy.position.x,p.x);near(f.enemy.position.y,p.y);
});

test('Ue boss landing hits the marked area once, ignores actors in flight and clamps its marker at a ward',()=>{
 const {createBossSequence,tickBossSequence}=load('src/gameplay/enemies/SpikedShellBoss.ts');
 const cycle=load('src/config/balance/khangChien.ts').KHANG_CHIEN_BALANCE.bossCycle;
 const zone=createVillageZone();zone.objects=[];
 const actor=id=>({id,team:'player',combatRole:'melee',element:'water',stats:{maxHp:100,moveSpeed:0},resources:{currentHp:100}});
 const body={id:'boss',position:{x:600,y:600},radius:30,actor:{...actor('boss'),team:'enemy'}},target={id:'p',position:{x:820,y:600},radius:12,actor:actor('p')};
 const far={...target,id:'far',actor:actor('far'),position:{x:820,y:800}},state=Object.assign(createBossSequence(0,cycle),{phase:'volley-wait',secondShotAt:0});
 const hits=[],ctx=(now,seconds=.025)=>({now,seconds,body,target,targets:[target,far],zone,settings:cycle,hitRadius:50,shoot:()=>{},hit:v=>hits.push(v.id)});
 tickBossSequence(state,ctx(0));near(state.jumpTarget.x,target.position.x);near(state.jumpTarget.y,target.position.y);
 tickBossSequence(state,ctx(cycle.jumpDelay));assert.equal(hits.length,0);
 for(let t=cycle.jumpDelay+.025;t<=cycle.jumpDelay+cycle.jumpSeconds+.026;t+=.025)tickBossSequence(state,ctx(t));
 assert.equal(state.phase,'landing-pause');assert.deepEqual(hits,['p']);near(body.position.x,target.position.x);
 tickBossSequence(state,ctx(cycle.jumpDelay+cycle.jumpSeconds+.05));assert.deepEqual(hits,['p'],'no extra damage during recovery');
 zone.objects.push({id:'ward',name:'ward',kind:'obstacle',resource:'water-barrier',x:700,y:0,shape:{type:'rect',width:10,height:1400}});
 body.position={x:600,y:600};Object.assign(state,{phase:'volley-wait',secondShotAt:0});tickBossSequence(state,ctx(10));
 assert.ok(state.jumpTarget.x<700,'the warning stays on the reachable side of the barrier');
});

function special(pattern){
 const f=fixture('melee',120);Object.assign(f.state.settings,{pattern,attackRange:220,chargeSpeed:300,projectileCount:8,spread:1});
 return f;
}
test('relentless enemies acquire distant targets, never leash home, and wait for a new valid target',()=>{
 const {run,enemy,state}=fixture('melee',120);state.settings.pursuit='relentless';
 run.player.position={x:1800,y:200};advance(run,.2);
 assert.equal(state.targetId,run.character.id);assert.equal(state.phase,'chase');assert.ok(enemy.position.x>180);
 enemy.position={x:1200,y:200};advance(run,.2);assert.ok(enemy.position.x>1200,'does not return beyond home leash');
 run.character.resources.currentHp=0;const before={...enemy.position};advance(run,.5);
 assert.equal(state.phase,'idle');assert.equal(state.targetId,undefined);near(enemy.position.x,before.x);near(enemy.position.y,before.y);
 run.character.resources.currentHp=140;advance(run,.2);assert.equal(state.phase,'chase');assert.equal(state.targetId,run.character.id);
 const {ELITE_ENEMIES}=load('src/config/balance/eliteEnemies.ts');
 assert.ok(Object.values(ELITE_ENEMIES).every(def=>def.attack.pursuit==='relentless'));
});
test('elite charge locks direction, moves through collision and does not damage during warning',()=>{
 const {run,enemy,state}=special('charge');tickRun(run,0);const start={...enemy.position},locked={x:state.aim.x-state.origin.x,y:state.aim.y-state.origin.y};
 run.player.position.y+=100;advance(run,.64);assert.equal(enemy.position.x,start.x);assert.equal(run.enemyCombat.attacks,0);
 advance(run,1);assert.ok(enemy.position.x>start.x);near((enemy.position.y-start.y)/(enemy.position.x-start.x),locked.y/locked.x);assert.equal(run.character.resources.currentHp,140);
 const wall=special('charge');wall.run.zone.objects.push({id:'wall',name:'wall',kind:'obstacle',resource:'water-barrier',x:230,y:0,shape:{type:'rect',width:10,height:500}});
 tickRun(wall.run,0);advance(wall.run,1.6);assert.ok(wall.enemy.position.x<230);assert.equal(wall.run.character.resources.currentHp,140);
 const hit=special('charge');tickRun(hit.run,0);advance(hit.run,1.5);
 assert.ok(hit.run.character.resources.currentHp<140,'an unavoided charge hits once at contact');
 assert.equal(hit.run.enemyCombat.events.filter(e=>e.kind==='damage').length,1);
});
test('stopping AI cancels a pending elite charge without moving or damaging',()=>{
 const cancel=special('charge');tickRun(cancel.run,0);advance(cancel.run,.7);assert.equal(cancel.state.phase,'lunge');
 setEnemyCombatEnabled(cancel.run.enemyCombat,false);const p={...cancel.enemy.position};advance(cancel.run,1);
 near(cancel.enemy.position.x,p.x);near(cancel.enemy.position.y,p.y);assert.equal(cancel.run.enemyCombat.attacks,0);
});

function bossFixture(){
 const f=fixture('ranged',120);const {ELITE_ENEMIES}=load('src/config/balance/eliteEnemies.ts');
 f.state.settings={...ELITE_ENEMIES['boss-spiked-shell-beast'].attack};
 f.run.character.stats.maxHp=10000;f.run.character.resources.currentHp=10000;
 return f;
}
function untilBoss(f,phase){
 for(let i=0;i<1000 && f.state.boss?.phase!==phase;i++)tickRun(f.run,.01);
 assert.equal(f.state.boss?.phase,phase);
}
test('boss marks player feet, emerges firing immediately, waits between volleys and warns before jumping',()=>{
 const f=bossFixture();tickRun(f.run,0);assert.equal(f.state.boss.phase,'burrow');
 untilBoss(f,'underground');assert.equal(f.enemy.burrowed,true);
 near(f.state.boss.emergeAt.x,f.run.player.position.x);near(f.state.boss.emergeAt.y,f.run.player.position.y);
 const emergeAt={...f.state.boss.emergeAt};f.run.player.position.x+=100;
 assert.equal(load('src/gameplay/combat/CombatBody.ts').validBody(f.enemy),false);assert.notEqual(f.state.phase,'dead');
 untilBoss(f,'emerge');assert.equal(f.enemy.burrowed,false);assert.equal(f.state.serial,7);
 near(f.enemy.position.x,emergeAt.x);near(f.enemy.position.y,emergeAt.y);
 assert.ok(f.run.enemyCombat.shots.every(s=>s.projectile.radius===10));
 const gap=f.state.settings.bossCycle.volleyGap,firstAt=f.run.time;advance(f.run,gap-.02);assert.equal(f.state.serial,7);
 untilBoss(f,'jump-warning');near(f.state.serial,14);assert.ok(f.run.time-firstAt>=gap && f.run.time-firstAt<gap+.03);
 const warningAt=f.run.time;untilBoss(f,'jump');assert.ok(f.run.time-warningAt>=f.state.settings.bossCycle.jumpDelay);
 const locked={...f.state.boss.jumpTarget};f.run.player.position.x+=150;assert.equal(f.state.boss.jumpTarget.x,locked.x);
 untilBoss(f,'landing-pause');const landedAt=f.run.time,p={...f.enemy.position};advance(f.run,.28);
 assert.equal(f.state.boss.phase,'landing-pause');near(f.enemy.position.x,p.x);near(f.enemy.position.y,p.y);
 // The old dash slot is now a second leap.
 untilBoss(f,'jump-warning');assert.ok(f.run.time-landedAt>=f.state.settings.bossCycle.actionPause);assert.equal(f.state.boss.secondJump,true);
 untilBoss(f,'landing-pause');untilBoss(f,'roll-warning');assert.equal(f.state.boss.secondJump,false);
});
test('boss gives the configured extra dodge time for a locked roll then burrows; disable and reset clear hidden state',()=>{
 const f=bossFixture();tickRun(f.run,0);untilBoss(f,'roll-warning');
 const at=f.run.time,dir={...f.state.boss.direction},p={...f.enemy.position};
 const warning=f.state.settings.bossCycle.rollWarningSeconds;
 f.run.player.position.y+=200;advance(f.run,warning-.02);assert.equal(f.state.boss.phase,'roll-warning');near(f.enemy.position.x,p.x);
 untilBoss(f,'roll');assert.ok(f.run.time-at>=warning);near(f.state.boss.direction.x,dir.x);near(f.state.boss.direction.y,dir.y);
 untilBoss(f,'burrow');untilBoss(f,'underground');setEnemyCombatEnabled(f.run.enemyCombat,false);tickRun(f.run,0);
 assert.equal(f.enemy.burrowed,false);assert.equal(f.state.boss,undefined);
 setEnemyCombatEnabled(f.run.enemyCombat,true);tickRun(f.run,0);untilBoss(f,'underground');
 resetEnemyCombat(f.run.enemyCombat,[f.enemy],f.run.time);assert.equal(f.enemy.burrowed,false);assert.equal(f.state.boss,undefined);
});
test('boss rolling sweeps hit once per target and water barrier blocks roll and damage',()=>{
 const {createBossSequence,tickBossSequence}=load('src/gameplay/enemies/SpikedShellBoss.ts');
 function trial(wall){
   const f=bossFixture(),settings=f.state.settings.bossCycle;
   f.enemy.position={x:100,y:200};f.run.player.position={x:300,y:200};
   const player={id:f.run.character.id,actor:f.run.character,position:f.run.player.position,radius:18,hitbox:f.run.player.hitbox};
   const seq=createBossSequence(0,settings);seq.phase='roll';seq.endsAt=1;seq.direction={x:1,y:0};
   if(wall)f.run.zone.objects.push({id:'ward',name:'ward',kind:'obstacle',resource:'water-barrier',x:200,y:0,shape:{type:'rect',width:16,height:500}});
   let hits=0;const c={now:.4,seconds:.4,body:f.enemy,target:player,targets:[player],zone:f.run.zone,settings,hitRadius:30,shoot:()=>{},hit:()=>hits++};
   tickBossSequence(seq,c);c.now=.5;c.seconds=.1;tickBossSequence(seq,c);
   return {hits,f};
 }
 assert.equal(trial(false).hits,1);const blocked=trial(true);assert.equal(blocked.hits,0);assert.ok(blocked.f.enemy.position.x<200);
 const dead=bossFixture();tickRun(dead.run,0);untilBoss(dead,'underground');dead.enemy.actor.resources.currentHp=0;tickRun(dead.run,0);
 assert.equal(dead.state.phase,'dead');assert.equal(dead.enemy.burrowed,false);assert.equal(dead.state.boss,undefined);
});

test('damage event preserves the incoming projectile side when the shooter moves elsewhere',()=>{
 const {run,enemy}=fixture();tickRun(run,0);advance(run,.66);
 const direction={...run.enemyCombat.shots[0].projectile.direction};
 enemy.position.x=500;advance(run,1);
 const hit=run.enemyCombat.events.find(e=>e.kind==='damage');assert.ok(hit);
 near(hit.incomingSide.x,-direction.x);near(hit.incomingSide.y,-direction.y);
});

test('enemy detection is range based, chase uses movement, and damage waits for an actual attack',()=>{
  const {run,enemy,state}=fixture('melee',270);advance(run,.2);assert.equal(state.phase,'idle');near(enemy.position.x,30);
  run.player.position.x=230;advance(run,.25);assert.equal(state.phase,'chase');assert.ok(enemy.position.x>30);assert.equal(run.character.resources.currentHp,140);
  const close=fixture('melee',40);tickRun(close.run,0);assert.equal(close.state.phase,'windup');
  advance(close.run,.64);assert.equal(close.run.enemyCombat.attacks,0);assert.equal(close.run.character.resources.currentHp,140);
  advance(close.run,.02);assert.equal(close.state.phase,'recover');assert.equal(close.run.enemyCombat.attacks,1);assert.ok(close.run.character.resources.currentHp<140);
  advance(close.run,1);assert.equal(close.run.enemyCombat.attacks,1,'recover and cooldown cannot produce a second hit every tick');
});
test('locked melee strike misses a player who leaves its hit area during windup',()=>{
  const {run,state}=fixture('melee',40);tickRun(run,0);assert.equal(state.phase,'windup');
  run.player.position.y+=100;advance(run,.66);
  assert.equal(run.enemyCombat.attacks,1);assert.equal(run.character.resources.currentHp,140);assert.equal(run.enemyCombat.events.filter(e=>e.kind==='damage').length,0);
});
test('ranged attack locks its direction and has no homing or guaranteed target damage',()=>{
  const {run,state}=fixture();tickRun(run,0);assert.equal(state.phase,'windup');
  run.player.position.y+=120;advance(run,.66);assert.equal(run.enemyCombat.shots.length,1);
  const direction={...run.enemyCombat.shots[0].projectile.direction};advance(run,1.4);
  assert.equal(run.enemyCombat.shots.length,0);assert.equal(run.character.resources.currentHp,140);assert.ok(direction.y<0);
});
test('confirmed enemy projectile uses DEF, element and independent E shield layers before HP',()=>{
  const {run}=fixture();castRunE(run,{x:0,y:0,width:1000,height:1000});const initial=totalShield(run.character,0);
  tickRun(run,0);advance(run,1.7);
  const hits=run.enemyCombat.events.filter(e=>e.kind==='damage');assert.equal(hits.length,1);
  near(hits[0].damage.afterDef,8*50/58);near(hits[0].damage.absorbedDamage,8*50/58);
  near(totalShield(run.character,run.time),initial-8*50/58);assert.equal(run.character.resources.currentHp,140);assert.equal(run.character.mach,1);
});
test('walls stop both enemy projectiles and melee without manufacturing hit events',()=>{
  const {run}=fixture();run.zone.objects=[{id:'wall',kind:'obstacle',x:200,y:0,shape:{type:'rect',width:4,height:400}}];
  tickRun(run,0);advance(run,1.7);assert.equal(run.character.resources.currentHp,140);assert.equal(run.enemyCombat.shots.length,0);
  assert.equal(run.enemyCombat.events.filter(e=>e.kind==='damage').length,0);assert.ok(run.enemyCombat.events.some(e=>e.kind==='impact'));
  const melee=fixture('melee',40);melee.run.zone.objects=[{id:'wall',kind:'obstacle',x:280,y:0,shape:{type:'rect',width:4,height:400}}];
  tickRun(melee.run,0);advance(melee.run,.66);assert.equal(melee.run.character.resources.currentHp,140);
});
test('death cancels pending attacks and launched shots; invalid targets cannot be hit',()=>{
  const a=fixture();tickRun(a.run,0);a.enemy.actor.resources.currentHp=0;advance(a.run,1);
  assert.equal(a.state.phase,'dead');assert.equal(a.run.enemyCombat.attacks,0);assert.equal(a.run.character.resources.currentHp,140);
  const b=fixture();tickRun(b.run,0);advance(b.run,.66);assert.equal(b.run.enemyCombat.shots.length,1);
  b.enemy.targetable=false;advance(b.run,.05);assert.equal(b.run.enemyCombat.shots.length,0);assert.equal(b.run.character.resources.currentHp,140);
  const c=fixture();tickRun(c.run,0);c.run.character.resources.currentHp=0;advance(c.run,.66);assert.equal(c.run.enemyCombat.attacks,0);
});
test('leash returns the enemy home without regenerating HP, and chasing respects ground blockers',()=>{
  const {run,enemy,state}=fixture('melee',100);advance(run,.25);assert.ok(enemy.position.x>200);
  enemy.actor.resources.currentHp=123;run.player.position.x=800;advance(run,.3);assert.equal(state.phase,'idle');near(enemy.position.x,200);assert.equal(enemy.actor.resources.currentHp,123);
  const wall=fixture('melee',180);wall.run.zone.objects=[{id:'fence',kind:'obstacle',x:180,y:0,shape:{type:'rect',width:2,height:400}}];
  advance(wall.run,3);assert.ok(wall.enemy.position.x<=180-10.8);assert.equal(wall.run.enemyCombat.attacks,0);assert.equal(wall.run.character.resources.currentHp,140);
});
test('pausing cancels queued attacks and resetting/finishing clears enemy runtime without affecting another Run',()=>{
  const {run,state}=fixture();tickRun(run,0);setEnemyCombatEnabled(run.enemyCombat,false);advance(run,3);
  assert.equal(run.enemyCombat.attacks,0);assert.equal(run.enemyCombat.shots.length,0);
  setEnemyCombatEnabled(run.enemyCombat,true);tickRun(run,0);assert.equal(state.phase,'windup');assert.equal(run.enemyCombat.shots.length,0);
  advance(run,.66);assert.equal(run.enemyCombat.shots.length,1);
  const other=fixture();resetEnemyCombat(run.enemyCombat,run.combatBodies);assert.equal(run.enemyCombat.shots.length,0);assert.equal(state.phase,'idle');
  finishRun(run);assert.equal(run.enemyCombat.controllers.length,0);assert.equal(other.run.enemyCombat.controllers.length,1);
});

const ground={radius:30,duration:4,damageRatio:.5,tickInterval:.5};
const chasing=(kind,gap)=>{const f=fixture(kind,gap);Object.assign(f.state.settings,{pursuit:'relentless',detectionRange:3000,leashRange:3000});return f;};
test('enemy trail leaves timed ground zones that damage on a tick and slow the player in place',()=>{
 const {run,enemy,state}=chasing('ranged',400);
 Object.assign(state.settings,{trail:{...ground,kind:'slime',spacing:20,slow:{multiplier:.5,seconds:1}}});
 advance(run,1);assert.ok(run.enemyCombat.zones.length>=2);assert.ok(run.enemyCombat.zones.every(z=>z.kind==='slime'));
 const zone=run.enemyCombat.zones[0];run.player.position={...zone.position};const hp=run.character.resources.currentHp;
 const slows=run.player.slows;tickRun(run,.01);
 assert.ok(run.character.resources.currentHp<hp,'zone damages');assert.equal(run.player.slows,slows,'same array survives');
 assert.equal(run.player.slows.length,1);assert.equal(run.player.slows[0].multiplier,.5);
 const after=run.character.resources.currentHp;tickRun(run,.1);assert.equal(run.character.resources.currentHp,after,'waits for the tick interval');
 advance(run,5);assert.ok(run.enemyCombat.zones.every(z=>z.expiresAt>run.time));
 setEnemyCombatEnabled(run.enemyCombat,false);assert.equal(run.enemyCombat.zones.length,0);
 enemy.actor.resources.currentHp=0;
});
test('zone shot leads the moving player and lands after its flight time',()=>{
 const {run,state}=chasing('ranged',200);
 Object.assign(state.settings,{pattern:'zone',zoneShot:{...ground,flightSeconds:.5,impactRatio:1},projectileRange:600,windup:.2});
 // Player walks straight down at 100 px/s while the elite winds up.
 let firedAt;
 for(let i=0;i<20 && !run.enemyCombat.zones.length;i++){run.player.position.y+=2.5;tickRun(run,.025);firedAt={...run.player.position};}
 const zone=run.enemyCombat.zones.find(z=>z.kind==='bristle');assert.ok(zone,'bristle zone created');
 assert.ok(zone.position.y>=firedAt.y+30,'aims ahead of the movement, at the feet');assert.ok(zone.activeAt>run.time);
 const hp=run.character.resources.currentHp;run.player.position={x:zone.position.x,y:zone.position.y+20};
 advance(run,.6);assert.ok(run.character.resources.currentHp<hp,'impact hits once the bristles land');
 // With rootSeconds the landing pins the player in place.
 const rooted=chasing('ranged',200);Object.assign(rooted.state.settings,{pattern:'zone',zoneShot:{...ground,flightSeconds:.3,impactRatio:1,rootSeconds:1},projectileRange:600,windup:.2});
 advance(rooted.run,.6);const {moveRunPlayer,playerSlowMultiplier}=load('src/run/Run.ts');const {MOVEMENT_PREVIEW}=load('src/config/movement.ts');
 assert.equal(playerSlowMultiplier(rooted.run),0,'rooted');const at={...rooted.run.player.position};
 moveRunPlayer(rooted.run,{x:1,y:0},.2,MOVEMENT_PREVIEW);near(rooted.run.player.position.x,at.x);
 rooted.run.time+=1.1;assert.equal(playerSlowMultiplier(rooted.run),1,'root wears off');
});
test('push or pull arms a counter lunge after a stagger; a second push interrupts it',()=>{
 const {run,enemy,state}=chasing('melee',300);
 Object.assign(state.settings,{displacedCounter:{delay:1,chargeSpeed:400,range:200},attackRange:30});
 tickRun(run,.025);enemy.position.x-=40;tickRun(run,.025);
 assert.ok(state.counter && !state.counter.fired);assert.equal(state.phase,'windup');
 const held={...enemy.position};advance(run,.9);near(enemy.position.x,held.x);near(enemy.position.y,held.y);
 advance(run,.2);assert.ok(state.counter?.fired || state.phase==='lunge' || state.phase==='recover');assert.ok(enemy.position.x>held.x,'lunges toward the player');
 const second=chasing('melee',300);
 Object.assign(second.state.settings,{displacedCounter:{delay:1,chargeSpeed:400,range:200},attackRange:30});
 tickRun(second.run,.025);second.enemy.position.x-=40;tickRun(second.run,.025);advance(second.run,.5);
 second.enemy.position.x-=40;tickRun(second.run,.025);
 assert.equal(second.state.counter,undefined);assert.equal(second.state.phase,'recover');
 assert.ok(second.run.enemyCombat.events.some(e=>e.kind==='interrupt'));
 const held2={...second.enemy.position};advance(second.run,.45);near(second.enemy.position.x,held2.x);near(second.enemy.position.y,held2.y);
 advance(second.run,1);assert.ok(second.state.phase!=='lunge');
});

const wallShot={count:3,gap:.3,flightSeconds:.4,duration:3,radius:60,halfAngle:.9,thickness:14,impactRatio:.5,cooldown:5,touchRatio:.25,touchInterval:.5};
test('bristle wall volley: three arcs across the path, solid only when empty, projectiles pass, cooldown and expiry',()=>{
 const {moveRunPlayer}=load('src/run/Run.ts');const {MOVEMENT_PREVIEW}=load('src/config/movement.ts');
 const {run,state}=chasing('ranged',200);
 Object.assign(state.settings,{pattern:'wall',wallShot,windup:.2,attackRange:400});
 let t=0;while(run.enemyCombat.walls.length<3 && t<2){run.player.position.y+=2.5;tickRun(run,.025);t+=.025;}
 const walls=run.enemyCombat.walls;assert.equal(walls.length,3);
 for(const w of walls){assert.ok(w.facing.y>.95,'faces the walking direction');}
 assert.ok(state.nextAttackAt>=walls[2].bornAt+5-1e-6,'5s cooldown after the third shot');
 run.player.position={x:2000,y:200};advance(run,.5);
 const solid=run.zone.objects.filter(o=>o.resource==='bristle-wall');assert.equal(solid.length,3);assert.ok(solid.every(o=>o.passProjectiles));
 const w=walls[0],mid={x:w.center.x+w.facing.x*w.radius,y:w.center.y+w.facing.y*w.radius};
 run.player.position={x:mid.x,y:mid.y-40};moveRunPlayer(run,{x:0,y:1},.6,MOVEMENT_PREVIEW);
 assert.ok(run.player.position.y<mid.y-w.thickness/2,'arc blocks movement');
 // Pressed against the arc: stings once per touch interval.
 const before=run.character.resources.currentHp;advance(run,.3);assert.ok(run.character.resources.currentHp<before,'touching hurts');
 const touched=run.character.resources.currentHp;run.player.position={x:2000,y:200};advance(run,.6);assert.equal(run.character.resources.currentHp,touched,'no damage away from it');
 advance(run,3);assert.equal(run.zone.objects.filter(o=>o.resource==='bristle-wall').length,0,'expires after 3s');
 // A still player gets the arc dropped on them: hit, and the arc waits until they step out.
 const still=chasing('ranged',200);Object.assign(still.state.settings,{pattern:'wall',wallShot:{...wallShot,count:1},windup:.2,attackRange:400});
 const hp=still.run.character.resources.currentHp;advance(still.run,.7);
 assert.ok(still.run.character.resources.currentHp<hp,'landing hits');
 assert.equal(still.run.enemyCombat.walls[0].object,undefined,'not solid while occupied');
 still.run.player.position={x:2000,y:200};tickRun(still.run,.025);assert.ok(still.run.enemyCombat.walls[0].object);
 setEnemyCombatEnabled(still.run.enemyCombat,false);assert.equal(still.run.zone.objects.filter(o=>o.resource==='bristle-wall').length,0);
});
test('grasshopper dive lands twice on locked spots: dodge the first, the second re-aims',()=>{
 const {run,enemy,state}=chasing('melee',150);
 Object.assign(state.settings,{pattern:'dive',dive:{count:2,airSeconds:.5,pause:.3,radius:50,range:300,impactRatio:1},windup:.2,attackRange:240});
 let t=0;while(!state.dive && t<2){tickRun(run,.025);t+=.025;}
 assert.ok(state.dive);near(state.dive.to.x,run.player.position.x);
 const hp=run.character.resources.currentHp;run.player.position={x:300,y:450};
 while(state.dive && state.dive.pauseUntil===undefined)tickRun(run,.025);
 assert.equal(run.character.resources.currentHp,hp,'first landing dodged');
 while(state.dive && state.dive.pauseUntil!==undefined)tickRun(run,.025);
 assert.ok(state.dive);near(state.dive.to.y,450);
 advance(run,.6);assert.ok(run.character.resources.currentHp<hp,'second dive crushes');
 assert.equal(state.dive,undefined);assert.equal(state.phase,'recover');near(enemy.position.y,450);
});
test('rat charge that connects drags the player along',()=>{
 const {run,state}=chasing('melee',150);
 Object.assign(state.settings,{pattern:'charge',chargeSpeed:400,attackRange:220,windup:.2,dragOnHit:{distance:150,speed:300}});
 const hp=run.character.resources.currentHp;let t=0;while(!state.drag && t<2){tickRun(run,.025);t+=.025;}
 assert.ok(state.drag,'charge connects');assert.ok(run.character.resources.currentHp<hp);
 const x=run.player.position.x;advance(run,.6);
 assert.ok(run.player.position.x>x+100,'player dragged');assert.equal(state.drag,undefined);
});

test('sticky resin shot flies slowly and slows the player it hits; dodge window delays zone damage',()=>{
 const {run,state}=chasing('ranged',180);
 Object.assign(state.settings,{visual:'resin',projectileSpeed:110,projectileRadius:16,projectileRange:440,shotSlow:{multiplier:.5,seconds:2},windup:.2});
 let t=0;while(!run.enemyCombat.shots.length && t<2){tickRun(run,.025);t+=.025;}
 const shot=run.enemyCombat.shots[0];assert.equal(shot.visual,'resin');assert.equal(shot.projectile.speed,110);
 const hp=run.character.resources.currentHp;advance(run,1.6);
 assert.ok(run.character.resources.currentHp<hp,'resin hits');
 const {playerSlowMultiplier}=load('src/run/Run.ts');assert.equal(playerSlowMultiplier(run),.5,'and sticks');
 // Dodge window: the zone lands after flight + dodgeSeconds, giving time to step out.
 const z=chasing('ranged',200);Object.assign(z.state.settings,{pattern:'zone',zoneShot:{...ground,flightSeconds:.4,dodgeSeconds:.25,impactRatio:1},projectileRange:600,windup:.2});
 let u=0;while(!z.run.enemyCombat.zones.length && u<2){tickRun(z.run,.025);u+=.025;}
 const zone=z.run.enemyCombat.zones[0];near(zone.activeAt-zone.bornAt,.65);
});

test('resin burst: two shots in a row, each leading the moving player',()=>{
 const {run,state}=chasing('ranged',200);
 Object.assign(state.settings,{visual:'resin',projectileSpeed:110,projectileRadius:22,projectileRange:600,leadShots:true,burstCount:2,burstGap:.4,windup:.2,attackRange:400});
 const dirs=[];let t=0;
 while(dirs.length<2 && t<3){run.player.position.y+=2.5;tickRun(run,.025);t+=.025;
  for(const shot of run.enemyCombat.shots)if(!dirs.some(d=>d.id===shot.projectile.id))dirs.push({id:shot.projectile.id,at:t,dir:{...shot.projectile.direction},player:{...run.player.position}});}
 assert.equal(dirs.length,2,'two shots');near(Math.round((dirs[1].at-dirs[0].at)*40)/40,.4);
 for(const d of dirs){
  const toPlayer=Math.atan2(d.player.y-32-200,d.player.x-100),shot=Math.atan2(d.dir.y,d.dir.x);
  assert.ok(shot>toPlayer+.05,'aims ahead of a player walking down');
 }
});

test('homing counter lunge follows a dodging player and lands unless pushed again',()=>{
 const make=()=>{const f=chasing('melee',260);Object.assign(f.state.settings,{displacedCounter:{delay:1,chargeSpeed:420,range:650,turnRate:5},attackRange:30});
  tickRun(f.run,.025);f.enemy.position.x-=40;tickRun(f.run,.025);return f;};
 const {run,state}=make();advance(run,1);const hp=run.character.resources.currentHp;
 // Player keeps strafing sideways during the lunge.
 for(let i=0;i<60 && run.character.resources.currentHp===hp;i++){run.player.position.y+=3;tickRun(run,.025);}
 assert.ok(run.character.resources.currentHp<hp,'homing lunge connects');
 const b=make();advance(b.run,1.1);assert.equal(b.state.phase,'lunge');
 const hp2=b.run.character.resources.currentHp;b.enemy.position.x-=40;tickRun(b.run,.025);
 assert.equal(b.state.counter,undefined);assert.equal(b.state.phase,'recover','a well-timed push breaks it');
 advance(b.run,.4);assert.equal(b.run.character.resources.currentHp,hp2);
 void state;
});

test('a pull or push during a leap or dive interrupts it outright, without arming a counter',()=>{
 const f=chasing('melee',150);
 Object.assign(f.state.settings,{pattern:'dive',dive:{count:2,airSeconds:.5,pause:.3,radius:50,range:300,impactRatio:1},windup:.2,attackRange:240,
  displacedCounter:{delay:1,chargeSpeed:420,range:650,turnRate:5}});
 let t=0;while(!f.state.dive && t<2){tickRun(f.run,.025);t+=.025;}
 tickRun(f.run,.1);assert.ok(f.state.dive,'airborne');
 const hp=f.run.character.resources.currentHp;f.enemy.position.x+=30;tickRun(f.run,.025);
 assert.equal(f.state.dive,undefined);assert.equal(f.state.counter,undefined);assert.equal(f.state.phase,'recover');
 assert.ok(f.run.enemyCombat.events.some(e=>e.kind==='interrupt'));
 advance(f.run,.4);assert.equal(f.run.character.resources.currentHp,hp,'no landing, no counter');
});

test('a slow continuous pull (E swamp speed) is noticed: it breaks a leap',()=>{
 const f=chasing('melee',150);
 Object.assign(f.state.settings,{pattern:'charge',chargeSpeed:300,attackRange:220,windup:.6,displacedCounter:{delay:1,chargeSpeed:420,range:650,turnRate:5}});
 let t=0;while(f.state.phase!=='windup' && t<2){tickRun(f.run,1/60);t+=1/60;}
 assert.equal(f.state.phase,'windup');
 // 20 px/s pull, applied between frames like the swamp does.
 for(let i=0;i<3;i++){f.enemy.position.x-=20/60;tickRun(f.run,1/60);}
 assert.equal(f.state.phase,'recover','pulled out of the leap');assert.equal(f.state.counter,undefined);
});

test('boss emerges where the player is heading (capped lead) and hits whoever stands on the marked spot',()=>{
 const {createBossSequence,tickBossSequence}=load('src/gameplay/enemies/SpikedShellBoss.ts');
 const {ELITE_ENEMIES}=load('src/config/balance/eliteEnemies.ts');const cycle=ELITE_ENEMIES['boss-spiked-shell-beast'].attack.bossCycle;
 const zone=createVillageZone();zone.objects=[];
 const actor=id=>({id,team:'player',combatRole:'melee',element:'water',stats:{maxHp:100},resources:{currentHp:100}});
 const run=(velocity,victimAt)=>{
  const body={id:'boss',position:{x:600,y:600},radius:50,actor:{...actor('boss'),team:'enemy'}},target={id:'p',position:{x:900,y:600},radius:12,actor:actor('p')};
  const state=createBossSequence(0,cycle),hits=[];
  const ctx=now=>({now,seconds:.05,body,target,targets:victimAt?[{...target,position:victimAt}]:[],zone,settings:cycle,hitRadius:55,
   shoot:()=>{},hit:v=>hits.push(v.id),targetVelocity:velocity});
  tickBossSequence(state,ctx(cycle.burrowSeconds));const at={...state.emergeAt};
  if(victimAt)tickBossSequence(state,ctx(cycle.burrowSeconds+cycle.undergroundSeconds));
  return {at,hits};
 };
 near(run({x:0,y:0}).at.x,900);
 const slow=run({x:60,y:0}).at;near(slow.x,900+60*cycle.undergroundSeconds);
 near(run({x:400,y:0}).at.x,1100,'lead capped at 200px');
 const {at}=run({x:0,y:0});assert.deepEqual(run({x:0,y:0},{x:at.x+10,y:at.y}).hits,['p']);
 assert.deepEqual(run({x:0,y:0},{x:at.x+300,y:at.y}).hits,[]);
});

test('boss leaps twice onto where the target is heading, then rolls, steering after the target',()=>{
 const {createBossSequence,tickBossSequence}=load('src/gameplay/enemies/SpikedShellBoss.ts');
 const {ELITE_ENEMIES}=load('src/config/balance/eliteEnemies.ts');const cycle=ELITE_ENEMIES['boss-spiked-shell-beast'].attack.bossCycle;
 assert.ok(cycle.rollTurnRate>0);assert.ok(Math.abs(cycle.rollSpeed*cycle.rollSeconds-720*.8)<25,'same roll reach');
 const zone=createVillageZone();zone.objects=[];
 const actor=id=>({id,team:'player',combatRole:'melee',element:'water',stats:{maxHp:100,moveSpeed:0},resources:{currentHp:100}});
 const setup=(phase,velocity,extra={})=>{
  const body={id:'boss',position:{x:600,y:600},radius:50,actor:{...actor('boss'),team:'enemy'}},target={id:'p',position:{x:900,y:600},radius:12,actor:actor('p')};
  const state=Object.assign(createBossSequence(0,cycle),{phase,endsAt:0,secondJump:false,secondShotAt:0},extra);
  const ctx=(now,v=velocity)=>({now,seconds:.05,body,target,targets:[],zone,settings:cycle,hitRadius:55,shoot:()=>{},hit:()=>{},targetVelocity:v});
  return {state,body,target,ctx};
 };
 // First leap (from the volley wait) and second leap (from landing) both lead a target moving down.
 for(const [phase,extra] of [['volley-wait',{}],['landing-pause',{secondJump:false}]]){
  const still=setup(phase,{x:0,y:0},extra);tickBossSequence(still.state,still.ctx(0));
  const moving=setup(phase,{x:0,y:150},extra);tickBossSequence(moving.state,moving.ctx(0));
  assert.equal(moving.state.phase,'jump-warning');assert.ok(moving.state.jumpTarget.y>still.state.jumpTarget.y+30,phase+' leap leads');
 }
 // After the second landing it rolls, aimed ahead.
 const roll=setup('landing-pause',{x:0,y:150},{secondJump:true});tickBossSequence(roll.state,roll.ctx(0));
 assert.equal(roll.state.phase,'roll-warning');assert.ok(roll.state.direction.y>.15);
 // While rolling it turns toward a target that moved, but no faster than the turn rate.
 const homing=setup('roll',{x:0,y:0},{endsAt:5,direction:{x:1,y:0}});homing.target.position={x:600,y:900};
 tickBossSequence(homing.state,homing.ctx(.05));const turned=Math.atan2(homing.state.direction.y,homing.state.direction.x);
 assert.ok(turned>0,'steers toward the target');assert.ok(turned<=cycle.rollTurnRate*.05+1e-9,'capped turn');
});
