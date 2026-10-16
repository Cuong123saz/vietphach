const {test}=require('node:test');
const assert=require('node:assert/strict');
const load=require('./load-ts.cjs')();
const {createArcherRun,archerRunContext,prepareArcherTrial}=load('src/run/ArcherRun.ts');
const {createLinhMocZone}=load('src/world/linhMoc.ts');
const {createArcherStage,startArcherStage,continueArcherStage,tickArcherStage,debugArcherStage}=load('src/run/ArcherStage.ts');
const {castArcherUltimate,castArcherE,castArcherQ}=load('src/gameplay/characters/jobs/archer/WoodArcherSkills.ts');
const {bodyCenter}=load('src/world/bodyGeometry.ts');
let serial=0;
const fresh=(path='a1')=>createArcherStage(createArcherRun(`stage-${++serial}`,createLinhMocZone()),path);
const ctx=s=>archerRunContext(s.run,undefined,()=>.99);
const tick=(s,t,input={})=>tickArcherStage(s,t,input,()=>.99);
const bossStage=path=>{const s=fresh(path);startArcherStage(s);for(let i=0;i<3;i++){debugArcherStage(s,'clear');continueArcherStage(s);}tick(s,2);return s;};
test('stage validates its real map and owns a Lv15 preset without changing ordinary balance',()=>{
 for(const path of ['a1','b1']){const s=fresh(path),a=s.run.character;
  assert.equal(s.phase,'intro');assert.equal(a.progression.level,15);assert.equal(a.wood.sap,6);
  assert.equal(a.progression.evolutionChoices['15'],`wood-${path}-15`);assert.equal(s.heart.body.actor.resources.currentHp,900);
  const ordinary=createArcherRun('ordinary-'+path,createLinhMocZone());prepareArcherTrial(ordinary,path);
  assert.equal(a.stats.maxHp,ordinary.character.stats.maxHp+120);assert.equal(a.stats.mpRegen,8);
  assert.equal(ordinary.combatObjectives.length,0);assert.notEqual(ordinary.character.stats.mpRegen,8);
  tick(s,60,{firing:true,aim:{x:1000,y:500}});assert.equal(s.run.time,0);assert.equal(s.run.combatBodies.length,0);
 }
});
test('pending packs block wave completion; intermission heals once and preserves sap and cooldowns',()=>{
 const s=fresh();startArcherStage(s);assert.equal(startArcherStage(s),false);tick(s,2);s.run.enemyCombat.enabled=false;
 for(const b of s.run.combatBodies)b.actor.resources.currentHp=0;tick(s,.1);assert.equal(s.phase,'combat');assert.equal(s.defeated,2);
 s.run.character.resources.currentHp=80;s.heart.body.actor.resources.currentHp=400;s.run.character.wood.sap=4;
 s.run.character.wood.cooldowns.ultimate=s.run.time+25;const cd=s.run.character.wood.cooldowns.ultimate;
 debugArcherStage(s,'clear');assert.equal(s.phase,'intermission');assert.equal(s.defeated,6);assert.equal(s.run.enemyCombat.shots.length,0);
 const time=s.run.time;tick(s,100);assert.equal(s.run.time,time);assert.equal(s.run.character.resources.currentHp,80);
 assert.equal(continueArcherStage(s),true);assert.equal(s.wave,1);assert.equal(s.run.character.resources.currentHp,170);
 assert.equal(s.heart.body.actor.resources.currentHp,535);assert.equal(s.run.character.wood.sap,4);assert.equal(s.run.character.wood.cooldowns.ultimate,cd);
 assert.equal(continueArcherStage(s),false);assert.equal(s.heart.body.actor.resources.currentHp,535);
});
test('real enemy AI damages the tree and fails an undefended stage',()=>{
 const s=fresh();startArcherStage(s);s.run.player.position={x:1250,y:920};
 tick(s,90);assert.ok(s.heart.body.actor.resources.currentHp<900);
 tick(s,400);assert.equal(s.phase,'lost');assert.equal(s.reason,'heart');assert.equal(s.run.status,'finished');
 assert.equal(s.run.combatBodies.length,0);assert.equal(s.pending.length,0);
});
test('player death fails immediately and replay restores the objective, resources and branch',()=>{
 const s=fresh();startArcherStage(s);s.run.character.resources.currentHp=0;tick(s,1/120);
 assert.equal(s.phase,'lost');assert.equal(s.reason,'player');const time=s.run.time;tick(s,60);assert.equal(s.run.time,time);
 const replay=fresh('b1');assert.equal(replay.phase,'intro');assert.equal(replay.wave,0);assert.equal(replay.defeated,0);
 assert.equal(replay.heart.body.actor.resources.currentHp,900);assert.equal(replay.run.character.wood.sap,6);
});
test('a living burrowed boss cannot clear the stage; rage schedules exactly one reinforcement pack',()=>{
 const s=bossStage('a1'),b=s.run.combatBodies[0],controller=s.run.enemyCombat.controllers[0];s.run.enemyCombat.enabled=false;
 b.burrowed=true;tick(s,.1);assert.equal(s.phase,'combat');b.burrowed=false;
 b.actor.resources.currentHp=b.actor.stats.maxHp*.49;const atk=b.actor.stats.atk,windup=controller.settings.windup;
 tick(s,.1);assert.equal(s.enraged,true);assert.equal(s.pending.length,4);assert.equal(b.actor.stats.atk,atk*1.25);
 assert.equal(controller.settings.windup,windup*.8);tick(s,.1);assert.equal(s.pending.length,4);
 b.actor.resources.currentHp=0;tick(s,.1);assert.equal(s.phase,'won');assert.equal(s.pending.length,0);assert.equal(s.defeated,25);
});
test('stage boss retains damage during a lull instead of inheriting ordinary monster regeneration',()=>{
 const s=bossStage('b1'),b=s.run.combatBodies[0];s.run.enemyCombat.enabled=false;
 b.actor.resources.currentHp=180000;tick(s,35);assert.equal(b.actor.resources.currentHp,180000);
});
test('actual A1 arrows and B1 grove can defeat the boss without developer clear or damage mutation',()=>{
 for(const path of ['a1','b1']){
  const s=bossStage(path),b=s.run.combatBodies[0];s.run.enemyCombat.enabled=false;
  s.run.player.position={x:b.position.x-170,y:b.position.y+28};
  for(let i=0;i<4&&s.phase==='combat';i++){
   if(path==='b1'){castArcherE(ctx(s),bodyCenter(b));tick(s,6.1);castArcherE(ctx(s),{x:b.position.x+25,y:b.position.y});tick(s,6.1);}
   tick(s,.4);const cast=castArcherUltimate(ctx(s),bodyCenter(b));assert.equal(cast.ok,true,`${path} ultimate ${i+1}: ${cast.reason}`);tick(s,8);
   if(s.phase==='combat'){
    // Refill Sinh Tức through genuine basic hits while MP/cooldown recover.
    for(let t=0;t<35*20&&s.phase==='combat';t++)tick(s,.05,{firing:true,aim:bodyCenter(b)});
   }
  }
  assert.equal(s.phase,'won',`${path} failed to finish the boss`);assert.equal(s.run.character.progression.level,15);
 }
});
test('real skills can clear each ordinary wave on both branches',()=>{
 for(const path of ['a1','b1']){
  const s=fresh(path);startArcherStage(s);
  for(let wave=0;wave<3;wave++){
   s.run.enemyCombat.enabled=false;
   for(let i=0;i<120*20&&s.phase==='combat';i++){
    const b=s.run.combatBodies.find(b=>b.actor.resources.currentHp>0);
    if(b){s.run.player.position={x:b.position.x-160,y:b.position.y+28};
     const aim=bodyCenter(b);castArcherQ(ctx(s),aim);if(path==='b1')castArcherE(ctx(s),aim);
     tick(s,.05,{firing:true,aim});
    }else tick(s,.05);
   }
   assert.equal(s.phase,'intermission',`${path} wave ${wave+1}`);assert.equal(s.defeated,[6,14,24][wave]);continueArcherStage(s);
  }
 }
});
test('stage simulation is consistent at 30, 60 and 120 FPS',()=>{
 const snapshots=[30,60,120].map(fps=>{const s=fresh('b1');startArcherStage(s);s.run.player.position={x:1250,y:920};
  for(let i=0;i<fps*30;i++)tick(s,1/fps);
  return {phase:s.phase,time:s.run.time,hp:s.heart.body.actor.resources.currentHp,foes:s.run.combatBodies.map(b=>[b.position.x,b.position.y,b.actor.resources.currentHp])};});
 assert.deepEqual(snapshots[0],snapshots[1]);assert.deepEqual(snapshots[1],snapshots[2]);
});
