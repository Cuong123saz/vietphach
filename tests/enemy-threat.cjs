const {test}=require('node:test');
const assert=require('node:assert/strict');
const load=require('./load-ts.cjs')();
const {createRun,createVillageZone,registerRunCombatBody,registerRunEnemyController,tickRun,fireRunProjectile,tickRunProjectiles,castRunQ,castRunE,castRunR,finishRun}=load('src/run/Run.ts');
const {createSandboxMonsters,MONSTER_AI_TUNING:T}=load('src/dev/sandbox/monsters.ts');
const {createSandboxDummies}=load('src/dev/sandbox/fixtures.ts');
const {resolveDamage}=load('src/gameplay/combat/Damage.ts');
const {addShield}=load('src/gameplay/combat/Shield.ts');
const {resetEnemyCombat}=load('src/gameplay/enemies/EnemyCombat.ts');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function fixture(){
  const run=createRun('threat',createVillageZone(),{element:'water',moveSpeed:150});
  run.player.position={x:400,y:300};run.player.hitbox={x:-18,y:-64,width:36,height:64};
  const enemy=createSandboxMonsters({x:0,y:0},[{id:'test',name:'Enemy',kind:'ranged'}],()=>0)[0];
  enemy.actor.element='water';enemy.position={x:300,y:300};enemy.hitbox={x:-18,y:-30,width:36,height:30};
  registerRunCombatBody(run,enemy);registerRunEnemyController(run,enemy.id,{...T,kind:'ranged',visual:'thorn',attackRange:T.rangedRange});
  const [melee,ranged]=createSandboxDummies({x:0,y:0}).filter(b=>b.actor.team==='player');
  melee.position={x:330,y:300};ranged.position={x:340,y:300};
  registerRunCombatBody(run,melee);registerRunCombatBody(run,ranged);run.enemyCombat.enabled=false;
  return {run,enemy,melee,ranged,state:run.enemyCombat.controllers[0]};
}
function hit(f,source=f.run.character,amount=1,kind='projectile',confirmed=true){
  return resolveDamage({source,target:f.enemy.actor,element:'water',rawDamage:amount,canCrit:false,targetPolicy:'ENEMY',
    hit:confirmed?{kind,sourceId:source.id,targetId:f.enemy.id}:null},{random:()=>.99,now:f.run.time});
}
function advance(run,seconds){for(let remaining=seconds;remaining>1e-8;){const dt=Math.min(.05,remaining);tickRun(run,dt);remaining-=dt;}}

test('threat follows the actor role tag, regardless of range or projectile/hitbox/AoE kind',()=>{
  const f=fixture();assert.equal(f.run.character.combatRole,'ranged');assert.equal(f.melee.actor.combatRole,'melee');
  hit(f,f.run.character,1,'hitbox');assert.equal(f.state.threat.points.get(f.run.character.id),10);
  hit(f,f.melee.actor,1,'projectile');assert.equal(f.state.threat.points.get(f.melee.id),5);
  hit(f,f.melee.actor,1,'aoe');assert.equal(f.state.threat.points.get(f.melee.id),10);
  hit(f,f.ranged.actor,1,'hitbox');assert.equal(f.state.threat.points.get(f.ranged.id),10);
});
test('Cannon, Q and mirror Q use the same damage hook and credit the real Mage; E/R create none',()=>{
  const f=fixture();castRunR(f.run);castRunE(f.run,{x:0,y:0,width:1000,height:1000});assert.equal(f.state.threat.points.size,0);
  fireRunProjectile(f.run,'shot',{x:400,y:280},{x:-1,y:0},{speed:1000,radius:4,range:300,chargeRatio:1});
  tickRunProjectiles(f.run,.2,[f.enemy],()=>.99);assert.equal(f.state.threat.points.get(f.run.character.id),10);
  // E consumed one mirror; Q still schedules one original and one copy.
  f.run.projectiles.length=0;f.enemy.position={x:300,y:285};castRunQ(f.run,{x:300,y:285});tickRun(f.run,2.4);
  assert.equal(f.state.threat.points.get(f.run.character.id),30);assert.equal(f.state.threat.points.size,1);
});
test('enemy picks the highest threat, keeps ties stable, and cancels an old windup when priority changes',()=>{
  const f=fixture();hit(f,f.melee.actor);hit(f,f.ranged.actor);f.run.enemyCombat.enabled=true;tickRun(f.run,0);
  assert.equal(f.state.targetId,f.ranged.id);assert.equal(f.state.phase,'windup');
  hit(f,f.melee.actor);tickRun(f.run,0);assert.equal(f.state.targetId,f.ranged.id,'equal points retain the current target');
  hit(f,f.melee.actor);tickRun(f.run,0);assert.equal(f.state.targetId,f.melee.id);assert.equal(f.state.phase,'chase');assert.equal(f.state.aim,undefined);
  assert.equal(f.run.enemyCombat.shots.length,0);tickRun(f.run,1);assert.equal(f.run.enemyCombat.shots.length,0,'switching cannot bypass the original cooldown');
});
test('a damaging attacker outside detection but inside leash outranks nearby zero-threat actors',()=>{
  const f=fixture();f.run.player.position.x=700;hit(f);f.run.enemyCombat.enabled=true;tickRun(f.run,0);
  assert.equal(f.state.targetId,f.run.character.id);assert.equal(f.state.phase,'chase');
  f.run.player.position.x=900;tickRun(f.run,0);assert.notEqual(f.state.targetId,f.run.character.id,'an actor beyond leash cannot be pursued');
});
test('dead/off-field attackers are removed and cannot remain top priority',()=>{
  const f=fixture();hit(f,f.melee.actor);hit(f,f.melee.actor);hit(f,f.melee.actor);hit(f,f.ranged.actor);
  f.run.enemyCombat.enabled=true;tickRun(f.run,0);assert.equal(f.state.targetId,f.melee.id);
  f.melee.actor.resources.currentHp=0;tickRun(f.run,0);assert.equal(f.state.targetId,f.ranged.id);assert.equal(f.state.threat.points.has(f.melee.id),false);
  f.ranged.targetable=false;tickRun(f.run,0);assert.equal(f.state.threat.points.has(f.ranged.id),false);assert.equal(f.state.targetId,f.run.character.id);
});
test('recovery starts at 7 seconds, decays faster each second and heals only the surviving enemy',()=>{
  const f=fixture();hit(f,f.run.character,80);f.run.character.resources.currentHp=50;
  tickRun(f.run,6.9);near(f.enemy.actor.resources.currentHp,220);near(f.state.threat.points.get(f.run.character.id),10);
  tickRun(f.run,.1);near(f.enemy.actor.resources.currentHp,220);near(f.state.threat.points.get(f.run.character.id),10);
  tickRun(f.run,.5);near(f.enemy.actor.resources.currentHp,223);near(f.state.threat.points.get(f.run.character.id),8.75);
  tickRun(f.run,.5);near(f.enemy.actor.resources.currentHp,226);near(f.state.threat.points.get(f.run.character.id),7);
  assert.equal(f.run.character.resources.currentHp,50);assert.equal(f.state.threat.recovering,true);
});
test('decay and HP recovery integrate identically across a large tick or many small frames',()=>{
  const a=fixture(),b=fixture();
  for(const f of [a,b]){hit(f,f.run.character,80);for(let i=0;i<11;i++)hit(f);}
  tickRun(a.run,10);advance(b.run,10);
  near(a.enemy.actor.resources.currentHp,227);near(b.enemy.actor.resources.currentHp,227);
  near(a.state.threat.points.get(a.run.character.id),105);near(b.state.threat.points.get(b.run.character.id),105);
});
test('new damage interrupts recovery and restarts the full delay and initial decay speed',()=>{
  const f=fixture();hit(f,f.run.character,80);tickRun(f.run,8);near(f.enemy.actor.resources.currentHp,226);
  hit(f);near(f.enemy.actor.resources.currentHp,225);near(f.state.threat.points.get(f.run.character.id),17);assert.equal(f.state.threat.recovering,false);
  tickRun(f.run,6.99);near(f.enemy.actor.resources.currentHp,225);near(f.state.threat.points.get(f.run.character.id),17);
  tickRun(f.run,.51);near(f.enemy.actor.resources.currentHp,228);near(f.state.threat.points.get(f.run.character.id),15.75);
});
test('MISS and zero damage create no threat and do not reset recovery; shielded damage does',()=>{
  const f=fixture();hit(f,f.run.character,80);tickRun(f.run,6);hit(f,f.run.character,1,'projectile',false);hit(f,f.run.character,0);
  tickRun(f.run,1.5);near(f.enemy.actor.resources.currentHp,223);near(f.state.threat.points.get(f.run.character.id),8.75);near(f.state.threat.lastDamageAt,0);
  addShield(f.enemy.actor,{id:'enemy-shield',sourceId:f.enemy.id,skillId:'test',amount:20,expiresAt:100},f.run.time);
  const before=f.enemy.actor.resources.currentHp,result=hit(f);assert.equal(result.absorbedDamage,1);near(f.enemy.actor.resources.currentHp,before);
  near(f.state.threat.points.get(f.run.character.id),18.75);near(f.state.threat.lastDamageAt,7.5);assert.equal(f.state.threat.recovering,false);
});
test('incoming damage accounts for recovery before its timestamp instead of losing a large-frame healing interval',()=>{
  const f=fixture();hit(f,f.run.character,80);f.run.time=8;hit(f);
  near(f.enemy.actor.resources.currentHp,225);near(f.state.threat.points.get(f.run.character.id),17);
});
test('threat and healing clamp, never revive a dead enemy, and are cleared by reset/finish',()=>{
  const f=fixture();hit(f,f.run.character,80);tickRun(f.run,100);near(f.enemy.actor.resources.currentHp,300);assert.equal(f.state.threat.points.size,0);
  hit(f);resetEnemyCombat(f.run.enemyCombat,f.run.combatBodies,f.run.time);assert.equal(f.state.threat.points.size,0);near(f.state.threat.lastDamageAt,100);
  hit(f);finishRun(f.run);assert.equal(f.state.threat.points.size,0);assert.equal(f.enemy.actor.threat,undefined);
  const dead=fixture();hit(dead,dead.run.character,999);tickRun(dead.run,100);assert.equal(dead.enemy.actor.resources.currentHp,0);assert.equal(dead.state.threat.points.size,0);assert.equal(dead.state.phase,'dead');
});
test('each enemy owns a separate table; invalid source tags fail before HP mutation',()=>{
  const f=fixture();const other=createSandboxMonsters({x:0,y:0},[{id:'other',name:'Other',kind:'ranged'}],()=>0)[0];
  other.position={x:500,y:300};registerRunCombatBody(f.run,other);registerRunEnemyController(f.run,other.id,{...T,kind:'ranged',visual:'thorn',attackRange:T.rangedRange});
  hit(f);assert.equal(f.state.threat.points.size,1);assert.equal(other.actor.threat.points.size,0);
  const before=f.enemy.actor.resources.currentHp;
  assert.throws(()=>hit(f,{...f.run.character,combatRole:undefined}));assert.equal(f.enemy.actor.resources.currentHp,before);
});

