const {test}=require('node:test');const assert=require('node:assert/strict');
const load=require('./load-ts.cjs')();
const {createRun,createVillageZone,registerRunCombatBody,registerRunEnemyController,tickRun,finishRun}=load('src/run/Run.ts');
const {createSandboxMonsters,MONSTER_AI_TUNING:T}=load('src/dev/sandbox/monsters.ts');
const {objectiveSurface,objectiveProtects}=load('src/gameplay/combat/CombatObjective.ts');
const {createResources}=load('src/gameplay/characters/core/CharacterResources.ts');
const {resolveDamage}=load('src/gameplay/combat/Damage.ts');
const {setEnemyCombatEnabled}=load('src/gameplay/enemies/EnemyCombat.ts');
function fixture(kind='ranged',x=100){
 const run=createRun('objective',createVillageZone(),{element:'water',moveSpeed:150});run.zone.objects=[];
 run.player.position={x:600,y:200};run.character.stats.maxHp=10000;run.character.resources.currentHp=10000;
 const enemy=createSandboxMonsters({x:0,y:0},[{id:'enemy',name:'Enemy'}],()=>0)[0];
 enemy.position={x,y:200};enemy.radius=10;enemy.hitbox=undefined;enemy.actor.element='water';enemy.actor.stats.moveSpeed=0;enemy.actor.stats.atk=240;
 registerRunCombatBody(run,enemy);registerRunEnemyController(run,enemy.id,{...T,kind,visual:'thorn',attackRange:kind==='melee'?60:220,detectionRange:2000,leashRange:2000,objectiveAggroRange:180});
 const stats={...enemy.actor.stats,maxHp:8000,def:0,moveSpeed:0};
 const wall={id:'wall',name:'Barrier',kind:'obstacle',resource:'water-barrier',x:250,y:0,shape:{type:'polygon',points:[{x:0,y:0},{x:10,y:0},{x:10,y:500},{x:0,y:500}]}};
 const objective={body:{id:'barrier',position:{x:1000,y:200},radius:0,actor:{id:'barrier',team:'player',element:'water',combatRole:'melee',stats,resources:createResources(stats)}},obstacleIds:['wall']};
 run.zone.objects.push(wall);run.combatObjectives.push(objective);
 return {run,enemy,objective,state:run.enemyCombat.controllers[0]};
}
function advance(run,seconds){for(let left=seconds;left>1e-8;){const dt=Math.min(.025,left);tickRun(run,dt);left-=dt;}}
const hp=f=>f.objective.body.actor.resources.currentHp;
test('objective aims at nearest polygon edge, not hollow center; absent/dead walls are not targets',()=>{
 const f=fixture();const edge=objectiveSurface(f.objective,f.run.zone,f.enemy.position);assert.equal(edge.position.x,250);assert.equal(edge.position.y,200);assert.equal(edge.actor,f.objective.body.actor);
 f.run.zone.objects=[];assert.equal(objectiveSurface(f.objective,f.run.zone,f.enemy.position),undefined);
 f.objective.body.actor.resources.currentHp=0;assert.equal(objectiveSurface(f.objective,f.run.zone,f.enemy.position),undefined);
});
test('unengaged enemies prefer barrier; nearby player takes priority even when wall is closer',()=>{
 const f=fixture('melee',210);tickRun(f.run,0);assert.equal(f.state.targetId,'barrier');
 f.run.player.position={x:90,y:200};tickRun(f.run,0);assert.equal(f.state.targetId,f.run.character.id);assert.equal(hp(f),8000);
});
test('real ranged player damage draws distant enemy away from wall; decay returns it to wall',()=>{
 const f=fixture();tickRun(f.run,0);assert.equal(f.state.targetId,'barrier');
 resolveDamage({source:f.run.character,target:f.enemy.actor,element:'water',rawDamage:10,canCrit:false,targetPolicy:'ENEMY',hit:{kind:'projectile',sourceId:f.run.character.id,targetId:f.enemy.id}},{random:()=>1,now:0});
 tickRun(f.run,0);assert.equal(f.state.targetId,f.run.character.id);assert.equal(f.state.threat.points.get(f.run.character.id),10);
 advance(f.run,6.9);assert.equal(f.state.targetId,f.run.character.id);
 advance(f.run,5);assert.equal(f.state.threat.points.size,0);assert.equal(f.state.targetId,'barrier');
});
test('ranged shot damages real barrier surface once and cannot reach player behind it',()=>{
 const f=fixture();tickRun(f.run,0);advance(f.run,.4);assert.equal(hp(f),8000,'warning does not damage');
 advance(f.run,1.5);const hits=f.run.enemyCombat.events.filter(e=>e.kind==='damage');
 assert.equal(hits.length,1);assert.equal(hits[0].targetId,'barrier');assert.equal(hp(f),8000-hits[0].damage.appliedDamage);assert.equal(f.run.character.resources.currentHp,10000);
});
test('melee strike uses wall collision and short projectiles do not damage from afar',()=>{
 const melee=fixture('melee',210);advance(melee.run,1.2);assert.ok(hp(melee)<8000);assert.equal(melee.run.enemyCombat.events.filter(e=>e.kind==='damage').length,1);
 const short=fixture();short.state.settings.projectileRange=30;advance(short.run,3);assert.equal(hp(short),8000);
});
test('tall melee sprite can strike barrier from its body center rather than aiming diagonally at its feet',()=>{
 const f=fixture('melee',210);f.enemy.hitbox={x:-18,y:-64,width:36,height:64};advance(f.run,1.2);
 assert.ok(hp(f)<8000);assert.equal(f.run.enemyCombat.events.filter(e=>e.kind==='damage').length,1);
});
test('elite charge hits a barrier only once per charge',()=>{
 const f=fixture('melee',160);Object.assign(f.state.settings,{pattern:'charge',attackRange:220,chargeSpeed:300});
 advance(f.run,1.8);const hits=f.run.enemyCombat.events.filter(e=>e.kind==='damage');assert.equal(hits.length,1);assert.equal(hits[0].targetId,'barrier');assert.ok(f.enemy.position.x<250);
});
test('boss roll damage at obstacle is once per action even with several potential victims',()=>{
 const f=fixture('melee',100);const {createBossSequence,tickBossSequence}=load('src/gameplay/enemies/SpikedShellBoss.ts');
 const settings=load('src/config/balance/eliteEnemies.ts').ELITE_ENEMIES['boss-spiked-shell-beast'].attack.bossCycle;
 const seq=createBossSequence(0,settings);seq.phase='roll';seq.endsAt=1;seq.direction={x:1,y:0};
 const edge=objectiveSurface(f.objective,f.run.zone,f.enemy.position),player={id:f.run.character.id,actor:f.run.character,position:f.run.player.position,radius:10};
 let hits=[];const c={now:.4,seconds:.4,body:f.enemy,target:edge,targets:[edge,player],zone:f.run.zone,settings,hitRadius:30,shoot:()=>{},hit:v=>hits.push(v.id),obstacleTarget:id=>id==='wall'?edge:undefined};
 tickBossSequence(seq,c);c.now=.5;c.seconds=.1;tickBossSequence(seq,c);assert.deepEqual(hits,['barrier']);
});
test('objective HP does not regenerate with AI paused and finishRun removes objectives',()=>{
 const f=fixture();f.objective.body.actor.resources.currentHp=1234;setEnemyCombatEnabled(f.run.enemyCombat,false);advance(f.run,15);
 assert.equal(hp(f),1234);assert.ok(!f.run.combatBodies.includes(f.objective.body));finishRun(f.run);assert.equal(f.run.combatObjectives.length,0);
});
function wardFixture(kind='ranged',x=100){const f=fixture(kind,x);f.objective.protectedArea={center:{x:500,y:200},radiusX:240,radiusY:150};return f;}
test('ward chooses outside player at any distance; shelter and exit switch targets without clearing threat',()=>{
 const f=wardFixture();f.run.player.position.x=1000;tickRun(f.run,0);assert.equal(f.state.targetId,f.run.character.id);
 f.state.threat.points.set(f.run.character.id,50);f.run.player.position.x=600;tickRun(f.run,0);
 assert.equal(f.state.targetId,'barrier');assert.equal(f.state.threat.points.get(f.run.character.id),50);
 f.run.player.position.x=1000;tickRun(f.run,0);assert.equal(f.state.targetId,f.run.character.id);assert.equal(f.state.threat.points.get(f.run.character.id),50);
 assert.equal(objectiveProtects(f.objective,{x:740,y:200}),true);assert.equal(objectiveProtects(f.objective,{x:740.1,y:200}),false);
});
test('outside ally takes priority over sheltered player; highest threat still chooses among outside actors',()=>{
 const f=wardFixture();const ally={id:'ally',position:{x:30,y:200},radius:10,actor:{...f.objective.body.actor,id:'ally',resources:createResources(f.objective.body.actor.stats)}};
 registerRunCombatBody(f.run,ally);f.state.threat.points.set(f.run.character.id,100);tickRun(f.run,0);assert.equal(f.state.targetId,'ally');
 f.run.player.position.x=1000;tickRun(f.run,0);assert.equal(f.state.targetId,f.run.character.id);
});
test('stray shots aimed at outside player stop at ward without HP damage; sheltered player makes next volley attack ward',()=>{
 const f=wardFixture();f.state.settings.attackRange=1000;f.run.player.position.x=1000;advance(f.run,.7);
 assert.ok(f.run.enemyCombat.shots.length>0);assert.equal(f.run.enemyCombat.shots[0].targetId,f.run.character.id);
 f.run.player.position.x=600;advance(f.run,.8);assert.equal(f.state.targetId,'barrier');assert.equal(hp(f),8000);assert.equal(f.run.character.resources.currentHp,10000);
 advance(f.run,2.5);assert.ok(hp(f)<8000);assert.ok(f.run.enemyCombat.events.some(e=>e.kind==='damage' && e.targetId==='barrier'));assert.equal(f.run.character.resources.currentHp,10000);
});
test('melee and charge cannot hurt ward when attacking an outside actor',()=>{
 const f=wardFixture('melee',210);f.run.player.position.x=1000;f.state.settings.attackRange=900;advance(f.run,1.3);assert.equal(hp(f),8000);
 const charge=wardFixture('melee',160);charge.run.player.position.x=50;Object.assign(charge.state.settings,{pattern:'charge',attackRange:220,chargeSpeed:300});
 advance(charge.run,.7);assert.equal(charge.state.phase,'lunge');charge.run.player.position.x=600;tickRun(charge.run,0);assert.notEqual(charge.state.phase,'lunge');assert.equal(charge.state.targetId,'barrier');
});
test('boss attacks outside actor without damaging ward, then attacks ward when player takes shelter',()=>{
 const f=wardFixture();f.state.settings={...load('src/config/balance/eliteEnemies.ts').ELITE_ENEMIES['boss-spiked-shell-beast'].attack};
 f.run.player.position.x=1000;advance(f.run,6);assert.equal(hp(f),8000);assert.equal(f.state.targetId,f.run.character.id);
 f.run.player.position.x=600;advance(f.run,6);assert.ok(hp(f)<8000);assert.equal(f.run.character.resources.currentHp,10000);
});
test('approach follows road waypoints; real damage or a nearby target interrupts approach',()=>{
 const f=fixture('melee');f.enemy.actor.stats.moveSpeed=100;f.state.approach={waypoints:[{x:100,y:200},{x:100,y:350},{x:200,y:350}],index:0};
 advance(f.run,.2);assert.equal(f.enemy.position.x,100);assert.ok(f.enemy.position.y>210);assert.equal(f.state.approach.index,1);
 resolveDamage({source:f.run.character,target:f.enemy.actor,element:'water',rawDamage:10,canCrit:false,targetPolicy:'ENEMY',hit:{kind:'projectile',sourceId:f.run.character.id,targetId:f.enemy.id}},{random:()=>1,now:f.run.time});
 advance(f.run,.2);assert.equal(f.state.approach,undefined);assert.equal(f.state.targetId,f.run.character.id);assert.ok(f.enemy.position.x>100);
 const near=fixture('melee');near.state.approach={waypoints:[{x:100,y:350}],index:0};near.run.player.position={x:130,y:200};tickRun(near.run,0);assert.equal(near.state.approach,undefined);assert.equal(near.state.phase,'windup');
});
