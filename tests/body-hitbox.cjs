const {test}=require('node:test');
const assert=require('node:assert/strict');
const load=require('./load-ts.cjs')();
const {createProjectile,tickProjectile}=load('src/gameplay/combat/Projectile.ts');
const {sweptCircleBoxContact,bodyIntersectsCircle,bodiesOverlap,movementBody}=load('src/world/bodyGeometry.ts');
const {createRun,createVillageZone,registerRunCombatBody,moveRunPlayer}=load('src/run/Run.ts');
const {createSandboxDummies}=load('src/dev/sandbox/fixtures.ts');
const {castWaterQ,tickWaterMage}=load('src/gameplay/characters/jobs/mage/WaterMageSkills.ts');
const {createMage}=load('src/gameplay/characters/jobs/mage/MageRuntime.ts');
const {WATER_MAGE_TUNING:T}=load('src/config/balance/waterMage.ts');
const {moveCharacter}=load('src/gameplay/characters/core/movement.ts');
const {boxOverlapsObstacle}=load('src/world/collision.ts');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const playerBox={x:-20,y:-60,width:40,height:60};
const shot=(y)=>createProjectile('p','player',{x:0,y},{x:1,y:0},{speed:1000,radius:5,range:500});

test('swept projectile hits the visible upper body and misses space below the art instead of using a foot circle',()=>{
  const target={id:'enemy',position:{x:100,y:0},radius:22,hitbox:{x:-36,y:-50,width:72,height:45}};
  const p=shot(-40);const impact=tickProjectile(p,.3,[target],[]);
  assert.equal(impact.hit.targetId,'enemy');near(impact.position.x,59);
  assert.equal(tickProjectile(shot(8),.3,[target],[]),undefined);
  const p2=shot(-40);const wall={id:'wall',kind:'obstacle',x:40,y:-60,shape:{type:'rect',width:2,height:40}};
  assert.equal(tickProjectile(p2,.3,[target],[wall]).type,'obstacle');
});
test('circle sweep rejects inflated-box corner false hits and detects rounded contact at high speed',()=>{
  const box={x:10,y:10,width:10,height:10};
  assert.equal(sweptCircleBoxContact({x:6,y:6},{x:0,y:.5},box,5),undefined);
  near(sweptCircleBoxContact({x:6,y:6},{x:0,y:1},box,5),1);
  const t=sweptCircleBoxContact({x:0,y:7},{x:30,y:0},box,5);near(t,.2);
  assert.equal(bodyIntersectsCircle({position:{x:100,y:100},radius:30,hitbox:playerBox},{x:100,y:50},0),true);
  assert.equal(bodyIntersectsCircle({position:{x:100,y:100},radius:30,hitbox:playerBox},{x:100,y:110},0),false);
});
test('Q impact tests the art box, including a head in AoE when the ground anchor is outside',()=>{
  const mage=createMage('mage','player','water',150),enemy=createSandboxDummies({x:0,y:0})[0];
  enemy.position={x:0,y:T.q.radius+60};enemy.radius=1;enemy.hitbox={x:-10,y:-70,width:20,height:64};
  const ctx={mage,position:{x:0,y:0},bodies:[enemy],view:{x:-500,y:-500,width:1000,height:1000},now:0,random:()=>.9};
  castWaterQ(ctx,{x:0,y:0});ctx.now=T.q.impactDelay;tickWaterMage(ctx);
  assert.equal(enemy.actor.resources.currentHp,9976);assert.equal(mage.mach,1);
});
function fixture(){
  const run=createRun('blocking',createVillageZone(),{element:'water',moveSpeed:150});
  run.player.position={x:100,y:100};run.player.hitbox=playerBox;
  const enemy=createSandboxDummies({x:0,y:0})[0];enemy.position={x:200,y:100};enemy.hitbox=playerBox;
  registerRunCombatBody(run,enemy);return {run,enemy};
}
test('actors block without tunneling, allow sliding, and stop blocking on death or leaving the field',()=>{
  const {run,enemy}=fixture();moveRunPlayer(run,{x:1,y:0},2,{speed:150,radius:12});assert.ok(run.player.position.x>=170 && run.player.position.x<=176);
  assert.equal(bodiesOverlap(movementBody({position:run.player.position,radius:12,hitbox:playerBox}),movementBody(enemy)),false);
  moveRunPlayer(run,{x:1,y:1},.2,{speed:150,radius:12});assert.ok(run.player.position.y>100);
  enemy.actor.resources.currentHp=0;moveRunPlayer(run,{x:1,y:0},2,{speed:150,radius:12});assert.ok(run.player.position.x>200);
  const f=fixture();f.enemy.targetable=false;moveRunPlayer(f.run,{x:1,y:0},2,{speed:150,radius:12});near(f.run.player.position.x,400);
});
test('overlapping ground footprints can escape but cannot deepen the overlap',()=>{
  const a=fixture();a.run.player.position.x=180;moveRunPlayer(a.run,{x:1,y:0},.1,{speed:150,radius:12});near(a.run.player.position.x,180);
  moveRunPlayer(a.run,{x:-1,y:0},.1,{speed:150,radius:12});near(a.run.player.position.x,165);
});
test('passing behind an actor allows art overlap without shrinking its receiving hitbox',()=>{
  const {run,enemy}=fixture();run.player.position.y=70;
  moveRunPlayer(run,{x:1,y:0},2/3,{speed:150,radius:12});near(run.player.position.x,200);
  const player={position:run.player.position,radius:12,hitbox:run.player.hitbox};
  assert.equal(bodiesOverlap(player,enemy),true);
  assert.equal(bodiesOverlap(movementBody(player),movementBody(enemy)),false);
  assert.equal(bodyIntersectsCircle(enemy,{x:200,y:45},0),true);
  run.player.hitbox={x:-40,y:-80,width:100,height:80};
  assert.ok(movementBody({...player,hitbox:run.player.hitbox}).radius<=12,'a wide cast pose cannot widen the ground blocker beyond the original radius');
});
test('Run uses the smaller ground footprint for fences and map bounds as well as actors',()=>{
  const {run}=fixture();run.combatBodies.length=0;
  run.zone.objects=[{id:'fence',kind:'obstacle',x:200,y:0,shape:{type:'rect',width:2,height:200}}];
  moveRunPlayer(run,{x:1,y:0},2,{speed:150,radius:12});assert.ok(run.player.position.x>=182 && run.player.position.x<=188);
  moveRunPlayer(run,{x:-1,y:-1},5,{speed:150,radius:12});near(run.player.position.x,12);near(run.player.position.y,12);
  const before=JSON.stringify(run.player.position);
  assert.throws(()=>moveRunPlayer(run,{x:1,y:0},1,{speed:150,radius:Infinity}));
  assert.equal(JSON.stringify(run.player.position),before);
});
test('shared geometry still supports explicit rectangle movement and rectangle/circle/polygon obstacles',()=>{
  const zone=createVillageZone();const settings={speed:150,radius:12,hitbox:playerBox};
  const p=moveCharacter({x:20,y:60},{x:-1,y:-1},1,zone,settings);near(p.x,20);near(p.y,60);
  zone.objects=[{id:'fence',kind:'obstacle',x:200,y:0,shape:{type:'rect',width:2,height:200}}];
  const stop=moveCharacter({x:100,y:100},{x:1,y:0},2,zone,settings);near(stop.x,180);
  const box={x:100,y:100,width:40,height:60};
  assert.equal(boxOverlapsObstacle(box,{kind:'obstacle',x:130,y:140,shape:{type:'circle',radius:10}}),true);
  assert.equal(boxOverlapsObstacle(box,{kind:'obstacle',x:300,y:300,shape:{type:'circle',radius:10}}),false);
  assert.equal(boxOverlapsObstacle(box,{kind:'obstacle',x:135,y:120,shape:{type:'polygon',points:[{x:0,y:0},{x:20,y:0},{x:20,y:20},{x:0,y:20}]}}),true);
});
