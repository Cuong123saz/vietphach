const {test}=require('node:test');
const assert=require('node:assert/strict');
const load=require('./load-ts.cjs')();
const {createArcherRun,tickArcherRun,prepareArcherTrial,archerRunContext,finishArcherRun}=load('src/run/ArcherRun.ts');
const {spawnArcherEncounter}=load('src/run/ArcherEncounter.ts');
const {createVillageZone}=load('src/run/Run.ts');
const {createArcher,grantArcherExperience,allocateArcherPotential,chooseArcherEvolution}=load('src/gameplay/characters/jobs/archer/ArcherRuntime.ts');
const {castArcherBasic,castArcherQ,castArcherE,castArcherR,castArcherUltimate,archerUltimateStatus,clearWoodArcher,woodGroveConnection}=load('src/gameplay/characters/jobs/archer/WoodArcherSkills.ts');
const {evolutionOptions}=load('src/gameplay/progression/Evolution.ts');
const {WOOD_ARCHER_EVOLUTION}=load('src/gameplay/characters/jobs/archer/WoodArcherEvolution.ts');
const {bodyMoveMultiplier}=load('src/gameplay/combat/CombatBody.ts');
const {addShield}=load('src/gameplay/combat/Shield.ts');
const {movementBody}=load('src/world/bodyGeometry.ts');
const {overlaps}=load('src/world/collision.ts');
const near=(a,b,eps=1e-7)=>assert.ok(Math.abs(a-b)<eps,`${a} != ${b}`);
function fixture(path){
 const run=createArcherRun('test',{...createVillageZone(),spawn:{x:400,y:400}});
 run.enemyCombat.enabled=false;if(path)prepareArcherTrial(run,path);return run;
}
function enemy(run,id='enemy',x=600,y=372,def=0){
 const actor=createArcher(id,'enemy');actor.stats={...actor.stats,maxHp:1000000,def};actor.resources.currentHp=1000000;
 const body={id,actor,position:{x,y},radius:14,slows:[]};run.combatBodies.push(body);return body;
}
const ctx=run=>archerRunContext(run,undefined,()=>.99);
const advance=(run,seconds,input={},random=()=>.99)=>tickArcherRun(run,seconds,input,random);
const loss=b=>b.actor.stats.maxHp-b.actor.resources.currentHp;
const damageEvents=run=>run.character.wood.events.filter(e=>e.kind==='damage');
function garden(run,id,point,expires=20,atk=run.character.stats.atk){
 const f={id,kind:'garden',position:{...point},radius:65,plantedAt:run.time,bornAt:run.time,armsAt:run.time,expiresAt:expires,atk};
 run.character.wood.nextId=Math.max(run.character.wood.nextId,id);
 run.character.wood.fields.push(f);return f;
}

test('Wood Archer progresses through Core, preserves resource ratios and locks A2/B2',()=>{
 const r=fixture(),a=r.character;a.resources.currentHp=60;a.resources.currentMp=65;
 allocateArcherPotential(a,'vitality',5);near(a.resources.currentHp,75);near(a.resources.currentMp,65);
 grantArcherExperience(a,1190);assert.equal(a.progression.level,15);assert.equal(a.progression.potential.unspent,70);
 assert.throws(()=>chooseArcherEvolution(a,7,'wood-a1-7'));
 chooseArcherEvolution(a,5,'wood-hunt');assert.throws(()=>chooseArcherEvolution(a,7,'wood-a2-7'));
 chooseArcherEvolution(a,7,'wood-a1-7');assert.throws(()=>chooseArcherEvolution(a,9,'wood-b1-9'));
 for(const milestone of WOOD_ARCHER_EVOLUTION)for(const o of milestone.options)if(o.id.includes('-a2-')||o.id.includes('-b2-')){
  assert.equal(o.locked,true);assert.equal(o.implemented,false);
 }
});
test('Basic arrows collide with a real body, misses/walls/allies grant no sap',()=>{
 const r=fixture(),b=enemy(r);assert.equal(castArcherBasic(ctx(r),b.position).ok,true);advance(r,1);
 near(loss(b),13);assert.equal(r.character.wood.sap,1);
 const missed=fixture();enemy(missed);castArcherBasic(ctx(missed),{x:600,y:100});advance(missed,1);assert.equal(missed.character.wood.sap,0);
 const wall=fixture(),blocked=enemy(wall);wall.zone.objects.push({id:'wall',name:'wall',kind:'obstacle',resource:'',x:500,y:320,shape:{type:'rect',width:20,height:120}});
 castArcherBasic(ctx(wall),blocked.position);advance(wall,1);near(loss(blocked),0);assert.equal(wall.character.wood.sap,0);
 const ally=fixture(),friend=enemy(ally);friend.actor.team='player';castArcherBasic(ctx(ally),friend.position);advance(ally,1);near(loss(friend),0);
});
test('Q sweeps pierced bodies once each, respects fractions and one sap per original command',()=>{
 const r=fixture(),bs=[enemy(r,'a',500),enemy(r,'b',550),enemy(r,'c',600),enemy(r,'d',650)];
 castArcherQ(ctx(r),{x:700,y:372});advance(r,1.5);
 [39,29.25,19.5,0].forEach((n,i)=>near(loss(bs[i]),n));assert.equal(r.character.wood.sap,1);
 assert.equal(damageEvents(r).length,3);
 const hunt=fixture('a1'),five=Array.from({length:6},(_,i)=>enemy(hunt,`h${i}`,480+i*55));hunt.character.wood.sap=0;
 castArcherQ(ctx(hunt),{x:850,y:372});advance(hunt,1.5);
 [1,.85,.7,.55,.4,0].forEach((f,i)=>near(loss(five[i]),3*40.5*f));assert.equal(hunt.character.wood.sap,1);
});
test('Primary arrows launch from the moving bow, with heading locked and tail at the Q origin',()=>{
 const r=fixture('a1');castArcherR(ctx(r));castArcherQ(ctx(r),{x:900,y:372});advance(r,.35,{direction:{x:0,y:1}});
 const main=r.character.wood.arrows.find(a=>a.skill==='q');assert.ok(main);near(main.origin.y,r.player.position.y-28);near(main.projectile.direction.y,0);
 const origin={...main.origin};advance(r,.125,{direction:{x:1,y:0}});const tail=r.character.wood.arrows.find(a=>a.skill==='secondary');
 assert.ok(tail);near(tail.origin.x,origin.x);near(tail.origin.y,origin.y);
});
test('Truy An applies after basic hit; Q removes it with one combined crit/DEF packet',()=>{
 const r=fixture('a1'),b=enemy(r,'marked',600,372,50);r.character.wood.sap=0;
 castArcherBasic(ctx(r),b.position);advance(r,.5);near(loss(b),40.5*.5);assert.equal(r.character.wood.mark.targetId,b.id);
 castArcherQ(ctx(r),b.position);advance(r,1);near(loss(b),40.5*.5+(3*1.15+1.5)*40.5*.5);
 assert.equal(r.character.wood.mark,undefined);assert.equal(r.character.wood.sap,2);
 const killing=fixture('a1'),low=enemy(killing);low.actor.resources.currentHp=1;castArcherBasic(ctx(killing),low.position);advance(killing,.5);
 assert.equal(killing.character.wood.sap,6);assert.equal(killing.character.wood.mark,undefined);
});
test('Shield absorption still grants sap; E, tail, DoT and ultimate do not',()=>{
 const r=fixture(),b=enemy(r);addShield(b.actor,{id:'s',sourceId:'shield',skillId:'test',amount:100,expiresAt:5},0);
 castArcherQ(ctx(r),b.position);advance(r,1);near(loss(b),0);assert.equal(r.character.wood.sap,1);
 const grove=fixture('b1'),g=enemy(grove);grove.character.wood.sap=0;
 castArcherE(ctx(grove),g.position);advance(grove,3);assert.ok(loss(g)>0);assert.equal(grove.character.wood.sap,0);
});
test('Rejected casts leave MP, sap, cooldowns and fields unchanged',()=>{
 const r=fixture('b1');r.character.wood.sap=5;const before=JSON.stringify(r.character.wood.cooldowns),mp=r.character.resources.currentMp;
 assert.equal(castArcherUltimate(ctx(r),{x:600,y:372}).reason,'sap');near(r.character.resources.currentMp,mp);assert.equal(r.character.wood.sap,5);
 assert.equal(JSON.stringify(r.character.wood.cooldowns),before);
 assert.equal(castArcherE(ctx(r),{x:5000,y:0}).reason,'target');assert.equal(r.character.wood.fields.length,0);
 r.character.wood.sap=6;r.character.wood.cooldowns.q=10;assert.equal(archerUltimateStatus(ctx(r)).reason,'cooldown');
 r.character.wood.cooldowns.q=0;r.character.resources.currentMp=0;assert.equal(castArcherUltimate(ctx(r),{x:600,y:372}).reason,'mp');
 const base=fixture();assert.equal(castArcherUltimate(ctx(base),{x:600,y:372}).reason,'locked');
});
test('Khai Cung consumes exactly three sap and three commands; Q tails cannot feed sap',()=>{
 const r=fixture('a1'),b=enemy(r);assert.equal(castArcherR(ctx(r)).ok,true);assert.equal(r.character.wood.sap,3);near(r.character.resources.currentMp,100);
 const before=r.character.resources.currentMp;assert.equal(castArcherR(ctx(r)).reason,'cooldown');near(r.character.resources.currentMp,before);
 castArcherQ(ctx(r),b.position);assert.equal(r.character.wood.r.charges,2);advance(r,1);
 const packets=damageEvents(r);assert.equal(packets.filter(e=>e.skill==='q').length,1);assert.equal(packets.filter(e=>e.skill==='secondary').length,1);
 near(loss(b),(3+1.8)*40.5*1.35);assert.equal(r.character.wood.sap,4);
 castArcherBasic(ctx(r),b.position);assert.equal(r.character.wood.r.charges,2);advance(r,.5);assert.equal(r.character.wood.r.charges,1);
 advance(r,1);castArcherBasic(ctx(r),b.position);advance(r,.5);assert.equal(r.character.wood.r.charges,0);
});
test('E seeds wait, arm, explode once, respect a shared root gate and expire',()=>{
 const r=fixture('b1'),b=enemy(r,'seed',900,500);r.character.wood.sap=0;
 castArcherE(ctx(r),{x:600,y:372});advance(r,.8);assert.equal(r.character.wood.fields[0].kind,'seed');near(loss(b),0);
 b.position={x:600,y:372};advance(r,.02);assert.equal(r.character.wood.fields[0].kind,'garden');near(loss(b),1.25*37.5);
 assert.equal(bodyMoveMultiplier(b,r.time),0);const expires=b.slows.find(s=>s.multiplier===0).expiresAt;
 r.character.wood.fields.push({id:99,kind:'seed',position:{...b.position},radius:55,plantedAt:0,bornAt:0,armsAt:r.time,expiresAt:20,atk:37.5});
 advance(r,.1);near(b.slows.find(s=>s.multiplier===0).expiresAt,expires);
 advance(r,1);assert.ok(bodyMoveMultiplier(b,r.time)>0);b.position={x:1000,y:600};advance(r,2);near(bodyMoveMultiplier(b,r.time),1);
 advance(r,20);assert.equal(r.character.wood.fields.length,0);assert.equal(r.character.wood.sap,0);
});
test('A1 E dashes 90 units backwards, collides with terrain and keeps its seed at the old foot',()=>{
 const r=fixture('a1');castArcherE(ctx(r),{x:700,y:400});advance(r,.25);near(r.player.position.x,310);near(r.character.wood.fields[0].position.x,400);
 const w=fixture('a1');w.zone.objects.push({id:'w',name:'w',kind:'obstacle',resource:'',x:340,y:350,shape:{type:'rect',width:20,height:100}});
 castArcherE(ctx(w),{x:700,y:400});advance(w,.25);assert.ok(w.player.position.x<400);
 assert.equal(overlaps(w.player.position,movementBody(w.player).radius,w.zone.objects[0]),false);
});
test('Grove replacement keeps only two slots and DoT overlaps select the strongest source',()=>{
 const r=fixture('b1'),b=enemy(r);garden(r,1,b.position);garden(r,2,{x:620,y:372});
 r.character.wood.nextDotAt=1;advance(r,1);near(loss(b),.7*37.5);
 assert.ok(woodGroveConnection(ctx(r)));b.position={x:610,y:372};assert.equal(bodyMoveMultiplier(b,r.time),.5);
 castArcherE(ctx(r),{x:650,y:372});assert.equal(r.character.wood.fields.filter(f=>f.kind!=='path').length,2);
 assert.equal(r.character.wood.fields.some(f=>f.id===1),false);
});
test('Grove Q path ends at its actual wall contact and cannot damage through a wall',()=>{
 const r=fixture('b1'),b=enemy(r,'far',650);r.zone.objects.push({id:'w',name:'w',kind:'obstacle',resource:'',x:520,y:340,shape:{type:'rect',width:20,height:100}});
 castArcherQ(ctx(r),{x:800,y:372});advance(r,1.5);near(loss(b),0);
 const path=r.character.wood.fields.find(f=>f.kind==='path');assert.ok(path);assert.ok(path.end.x<=520);
 const hidden=fixture('b1'),h=enemy(hidden);garden(hidden,1,{x:500,y:372});hidden.character.wood.nextDotAt=1;
 hidden.zone.objects.push({id:'w',name:'w',kind:'obstacle',resource:'',x:540,y:330,shape:{type:'rect',width:15,height:100}});
 advance(hidden,1);near(loss(h),0);
});
test('R Q harvests at most one eligible garden with a three-second cap and leaves the other intact',()=>{
 const r=fixture('b1'),b=enemy(r),b2=enemy(r,'next',700);garden(r,1,b.position);garden(r,2,b2.position);
 castArcherR(ctx(r));castArcherQ(ctx(r),{x:850,y:372});advance(r,1);
 assert.equal(damageEvents(r).filter(e=>e.skill==='harvest').length,1);near(damageEvents(r).find(e=>e.skill==='harvest').damage.rawDamage,1.5*37.5*3*1.35);
 assert.equal(r.character.wood.fields.some(f=>f.id===2),true);assert.equal(r.character.wood.sap,4);
});
test('A1 ultimate commits cost once, launches three real arrows, no crit/R/sap, and checks third-arrow mark',()=>{
 for(const mark of [false,true]){
  const r=fixture('a1'),b=enemy(r,'boss',600,372,50);if(mark)r.character.wood.mark={targetId:b.id,expiresAt:6};
  r.character.wood.r={charges:3,expiresAt:8};let rolls=0;
  assert.equal(castArcherUltimate(ctx(r),b.position).ok,true);near(r.character.resources.currentMp,52);assert.equal(r.character.wood.sap,0);
  assert.equal(castArcherUltimate(ctx(r),b.position).reason,'busy');advance(r,3,{},()=>{rolls++;return 0;});
  near(loss(b),mark?109350:102060);assert.equal(rolls,0);assert.equal(r.character.wood.r.charges,3);assert.equal(r.character.wood.sap,0);
  assert.equal(damageEvents(r).filter(e=>e.skill==='ultimate').length,3);assert.equal(r.character.wood.ultimate,undefined);
 }
});
test('A1 ultimate can miss moved bodies, loses stale mark bonus, and stops at a wall',()=>{
 const r=fixture('a1'),b=enemy(r,'boss',600,372,50);r.character.wood.mark={targetId:b.id,expiresAt:1.25};castArcherUltimate(ctx(r),b.position);advance(r,3);near(loss(b),102060);
 const miss=fixture('a1'),m=enemy(miss);castArcherUltimate(ctx(miss),m.position);m.position.y=600;advance(miss,3);near(loss(m),0);
 const wall=fixture('a1'),w=enemy(wall);wall.zone.objects.push({id:'w',name:'w',kind:'obstacle',resource:'',x:500,y:320,shape:{type:'rect',width:20,height:120}});
 castArcherUltimate(ctx(wall),w.position);advance(wall,3);near(loss(w),0);
});
test('B1 ultimate snapshots 0..2 seeds/gardens, never paths, resolves three volleys plus six inclusive ticks',()=>{
 for(const n of [0,1,2]){
  const r=fixture('b1'),b=enemy(r,'boss',600,372,50);for(let i=0;i<n;i++)garden(r,i+1,b.position);
  r.character.wood.fields.push({id:9,kind:'path',position:{x:400,y:100},end:{x:500,y:100},radius:10,plantedAt:0,bornAt:0,armsAt:0,expiresAt:2,atk:37.5});
  castArcherUltimate(ctx(r),b.position);near(r.character.resources.currentMp,68);assert.equal(r.character.wood.ultimate.harvested,n);
  assert.equal(r.character.wood.fields.filter(f=>f.kind!=='path').length,0);advance(r,7.1);
  near(loss(b),81000+n*13500);assert.equal(damageEvents(r).filter(e=>e.skill==='volley').length,3);assert.equal(damageEvents(r).filter(e=>e.skill==='dot').length,6);
  assert.equal(r.character.wood.ultimate,undefined);assert.equal(r.character.wood.sap,0);
 }
});
test('B1 forest loses future ticks when target exits and AoE cannot cross terrain',()=>{
 const r=fixture('b1'),b=enemy(r,'boss',600,372,50);castArcherUltimate(ctx(r),b.position);advance(r,2.05);
 const amount=loss(b);b.position={x:1000,y:600};advance(r,5.1);near(loss(b),amount);
 const w=fixture('b1'),hidden=enemy(w,'boss',600,372,50);
 w.zone.objects.push({id:'w',name:'w',kind:'obstacle',resource:'',x:520,y:330,shape:{type:'rect',width:15,height:100}});
 castArcherUltimate(ctx(w),{x:500,y:372});advance(w,7.1);near(loss(hidden),0);
});
test('Fixed-step Archer run produces the same damage, sap and cadence at 30/60/120 FPS',()=>{
 const results=[30,60,120].map(fps=>{
  const r=fixture('a1'),b=enemy(r);r.character.wood.sap=0;for(let frame=0;frame<fps*8;frame++)advance(r,1/fps,{firing:true,aim:b.position});
  return {damage:loss(b),sap:r.character.wood.sap,shots:damageEvents(r).length,time:r.time,mp:r.character.resources.currentMp};});
 for(const value of results.slice(1)){near(value.damage,results[0].damage);near(value.mp,results[0].mp);near(value.time,8);assert.equal(value.sap,results[0].sap);assert.equal(value.shots,results[0].shots);}
});
test('Death/finish/trial reset clear arrows, fields, roots, pending damage and owned slows',()=>{
 const r=fixture('b1'),b=enemy(r);castArcherUltimate(ctx(r),b.position);r.character.resources.currentHp=0;advance(r,8);
 near(loss(b),0);assert.equal(r.character.wood.scheduled.length,0);assert.equal(r.character.wood.fields.length,0);assert.equal(r.character.wood.sap,0);
 const f=fixture('b1'),target=enemy(f);garden(f,1,target.position);f.character.wood.nextDotAt=1;advance(f,.1);assert.ok(target.slows.length);
 finishArcherRun(f);assert.equal(target.slows.length,0);const time=f.time;advance(f,10);near(f.time,time);assert.equal(f.character.wood.events.length,0);
 const reset=fixture('a1');castArcherQ(ctx(reset),{x:800,y:372});prepareArcherTrial(reset,'b1');assert.equal(reset.character.wood.scheduled.length,0);assert.equal(reset.character.wood.sap,6);
 const fresh=fixture();assert.equal(fresh.character.progression.level,1);assert.equal(fresh.character.wood.sap,0);
});
test('Ordinary waves award EXP once per killed enemy; trial dummy awards none',()=>{
 const r=fixture(),enemies=spawnArcherEncounter(r,false,1,()=>.5);r.enemyCombat.enabled=false;enemies[0].actor.resources.currentHp=0;
 advance(r,.1);assert.equal(r.character.progression.level,2);assert.equal(r.character.progression.exp,10);
 advance(r,1);assert.equal(r.character.progression.exp,10);assert.equal(r.rewarded.size,1);
 const trial=fixture();const dummy=spawnArcherEncounter(trial,true)[0];dummy.actor.resources.currentHp=0;advance(trial,.1);assert.equal(trial.character.progression.level,1);
});
test('Slot age stays at planting time even when an older seed blooms after a younger one',()=>{
 const r=fixture('b1'),b=enemy(r,'trigger',900,600);castArcherE(ctx(r),{x:500,y:372});advance(r,6);
 castArcherE(ctx(r),{x:650,y:372});advance(r,.8);b.position={x:650,y:372};advance(r,.02);
 b.position={x:500,y:372};advance(r,.1);const oldest=r.character.wood.fields.find(f=>f.position.x===500);assert.equal(oldest.kind,'garden');
 advance(r,5.2);castArcherE(ctx(r),{x:700,y:372});assert.equal(r.character.wood.fields.includes(oldest),false);
 assert.equal(r.character.wood.fields.some(f=>f.position.x===650),true);
});
test('Ultimate simulation is consistent at 30/60/120 FPS for both live projectiles and forest ticks',()=>{
 for(const path of ['a1','b1']){
  const totals=[30,60,120].map(fps=>{const r=fixture(path),b=enemy(r,'boss',600,372,50);castArcherUltimate(ctx(r),b.position);
   for(let i=0;i<fps*8;i++)advance(r,1/fps);return loss(b);});totals.forEach(n=>near(n,path==='a1'?102060:81000));
 }
});
test('An early click resolves buffered Q as Q; both key orders still select one ultimate',()=>{
 const {WaterSkillInput}=load('src/presentation/phaser/WaterSkillInput.ts');const ordinary=[],combos=[];
 const input=new WaterSkillInput(k=>ordinary.push(k),()=>combos.push('ultimate'),.18);
 input.press('q',0,true);input.resolvePending();input.flush(.3);assert.equal(ordinary.join(','),'q');assert.equal(combos.length,0);
 input.press('q',1,true);input.press('e',1.1,true);input.resolvePending();assert.equal(combos.length,1);
 input.press('e',2,true);input.press('q',2.1,true);assert.equal(combos.length,2);assert.equal(ordinary.length,1);
 input.press('q',3,true);input.clear();input.resolvePending();input.flush(5);assert.equal(ordinary.length,1);
});
