const {test}=require('node:test');
const assert=require('node:assert/strict');
const sharp=require('sharp');
const load=require('./load-ts.cjs')();
const {createArcherRun,archerRunContext,prepareArcherTrial}=load('src/run/ArcherRun.ts');
const {createKieuNgaoZone,insideMocLocSeal,MOC_LOC_SEAL}=load('src/world/kieuNgao.ts');
const {createKieuNgaoStage,advanceKieuNgaoStory,interactKieuNgao,tickKieuNgaoStage,debugKieuNgao,kieuNgaoInteraction,kieuNgaoCanShoot,kieuNgaoRootsLeft}=load('src/run/KieuNgaoStage.ts');
const {castArcherBasic,castArcherQ,castArcherE,castArcherUltimate}=load('src/gameplay/characters/jobs/archer/WoodArcherSkills.ts');
const {bodyCenter}=load('src/world/bodyGeometry.ts');
const {FOREST_PERSON_REGIONS}=load('src/presentation/phaser/KieuNgaoTextures.ts');
const {MAPS}=load('src/world/definitions.ts');
let serial=0;
const fresh=(path='a1')=>createKieuNgaoStage(createArcherRun(`pride-${++serial}`,createKieuNgaoZone()),path);
const tick=(s,t,input={})=>tickKieuNgaoStage(s,t,input,()=>.99);
const ctx=s=>archerRunContext(s.run,undefined,()=>.99);
const start=s=>{advanceKieuNgaoStory(s);advanceKieuNgaoStory(s)};
const walk=s=>{const marker=kieuNgaoInteraction(s);assert.ok(marker);assert.equal(interactKieuNgao(s),false);
 for(let i=0;i<2400&&!kieuNgaoInteraction(s).near;i++){const p=s.run.player.position,goal=marker.point;tick(s,.05,{direction:{x:goal.x-p.x,y:goal.y-p.y},firing:true,aim:goal});}
 assert.ok(kieuNgaoInteraction(s).near,'route must be reachable through actual movement');assert.equal(interactKieuNgao(s),true);};
const bossStage=path=>{const s=fresh(path);start(s);for(let i=0;i<3;i++){debugKieuNgao(s,'clear');walk(s);advanceKieuNgaoStory(s);advanceKieuNgaoStory(s);}return s;};
test('four distinct validated maps, local Lv15 blessing and paused story clock',()=>{
 for(const path of ['a1','b1']){const s=fresh(path),ordinary=createArcherRun('ordinary-'+path,createKieuNgaoZone());prepareArcherTrial(ordinary,path);
  assert.equal(s.phase,'intro');assert.equal(s.run.character.progression.level,15);assert.equal(s.run.character.stats.maxHp,ordinary.character.stats.maxHp+120);assert.equal(s.run.character.stats.mpRegen,8);
  tick(s,40,{firing:true,aim:{x:1100,y:600}});assert.equal(s.run.time,0);assert.equal(advanceKieuNgaoStory(s),true);assert.equal(s.phase,'briefing');tick(s,40);assert.equal(s.run.time,0);
  for(let i=0;i<4;i++){const z=createKieuNgaoZone(i),r=createArcherRun('map-'+path+i,z);assert.equal(r.zone.mapId,`kieu-ngao-${i+1}`);assert.ok(MAPS[z.mapId].url.includes('kieu-ngao'));}
  assert.throws(()=>createKieuNgaoZone(4));assert.throws(()=>createKieuNgaoStage(createArcherRun('wrong',createKieuNgaoZone(2)),path));
 }
});
test('both branches can clear all three outbound maps with real skills and encounter every clue',()=>{
 for(const path of ['a1','b1']){const s=fresh(path);start(s);
  for(let map=0;map<3;map++){s.run.enemyCombat.enabled=false;
   for(let i=0;i<3000&&s.phase==='combat';i++){const b=s.run.combatBodies.find(b=>b.actor.resources.currentHp>0);
    if(b){s.run.player.position={x:b.position.x-150,y:b.position.y+18};const aim=bodyCenter(b);castArcherQ(ctx(s),aim);if(path==='b1')castArcherE(ctx(s),aim);tick(s,.05,{firing:true,aim});}else tick(s,.05);}
   assert.equal(s.phase,'explore',`${path} map ${map+1}`);assert.equal(kieuNgaoCanShoot(s),false);assert.equal(advanceKieuNgaoStory(s),false);
   s.run.player.position={...s.run.zone.spawn};walk(s);assert.equal(s.phase,'dialogue');assert.equal(s.cluesSeen.length,map+1);
   const time=s.run.time;tick(s,50);assert.equal(s.run.time,time);advanceKieuNgaoStory(s);assert.equal(s.phase,'briefing');assert.equal(s.mapIndex,map+1);advanceKieuNgaoStory(s);
  }assert.equal(kieuNgaoRootsLeft(s),3);assert.equal(s.combatWon,false);
 }
});
test('roots shield the core; real root destruction needs a fresh last arrow, and a miss never wins',()=>{
 for(const path of ['a1','b1']){const s=bossStage(path),boss=s.boss;s.run.enemyCombat.enabled=false;
  s.run.player.position={x:boss.position.x-150,y:boss.position.y+15};castArcherBasic(ctx(s),bodyCenter(boss));tick(s,1);assert.equal(boss.actor.resources.currentHp,1);assert.equal(boss.targetable,false);
  for(let i=0;i<6000&&s.phase==='combat';i++){const root=s.run.combatBodies.find(b=>b.id.startsWith('seal-root-')&&b.actor.resources.currentHp>0);
   if(root){s.run.player.position={x:root.position.x-130,y:root.position.y+15};const aim=bodyCenter(root);castArcherQ(ctx(s),aim);if(path==='b1')castArcherE(ctx(s),aim);castArcherUltimate(ctx(s),aim);tick(s,.05,{firing:true,aim});}else tick(s,.05);}
  assert.equal(s.phase,'final-shot',path);assert.equal(kieuNgaoRootsLeft(s),0);assert.equal(s.combatWon,false);assert.equal(s.run.character.wood.scheduled.length,0);
  tick(s,6);assert.equal(s.phase,'final-shot');assert.equal(s.boss.actor.resources.currentHp,1);
  s.run.player.position={x:boss.position.x-180,y:boss.position.y+15};assert.equal(castArcherBasic(ctx(s),{x:boss.position.x-500,y:boss.position.y+500}).ok,true);tick(s,1.2);assert.equal(s.phase,'final-shot');
  assert.equal(castArcherBasic(ctx(s),bodyCenter(boss)).ok,true);tick(s,1);assert.equal(s.phase,'reveal');assert.equal(s.combatWon,true);assert.equal(s.mentorAlive,true);assert.equal(s.sealBroken,true);assert.ok(s.wonAt>0);
  assert.equal(s.run.status,'active');assert.equal(s.run.enemyCombat.shots.length,0);assert.equal(s.run.enemyCombat.controllers.length,0);
 }
});
test('winning persists through the manual reveal and actual walk back through maps 3, 2, 1',()=>{
 const s=bossStage('a1');s.run.enemyCombat.enabled=false;debugKieuNgao(s,'clear');s.run.player.position={x:s.boss.position.x-180,y:s.boss.position.y+15};castArcherBasic(ctx(s),bodyCenter(s.boss));tick(s,1);
 const winTime=s.wonAt;advanceKieuNgaoStory(s);assert.equal(s.mentorAlive,true);advanceKieuNgaoStory(s);assert.equal(s.mentorAlive,false);advanceKieuNgaoStory(s);assert.equal(s.phase,'reveal');advanceKieuNgaoStory(s);
 const hp=s.run.character.resources.currentHp;
 for(const index of [2,1,0]){assert.equal(s.mapIndex,index);assert.equal(s.phase,'return');assert.equal(kieuNgaoCanShoot(s),false);assert.equal(s.run.combatBodies.length,0);assert.equal(s.run.enemyCombat.zones.length,0);
  assert.equal(s.run.enemyCombat.controllers.length,0);walk(s);assert.equal(s.run.character.resources.currentHp,hp);assert.equal(s.run.character.wood.arrows.length,0);assert.equal(s.combatWon,true);}
 assert.equal(s.phase,'ending');assert.equal(s.run.status,'finished');assert.equal(s.wonAt,winTime);assert.ok(s.walkSeconds>12);const time=s.run.time;tick(s,100);assert.equal(s.run.time,time);
 assert.equal(interactKieuNgao(s),false);const replay=fresh('a1');assert.equal(replay.phase,'intro');assert.equal(replay.combatWon,false);assert.equal(replay.sealBroken,false);assert.equal(replay.cluesSeen.length,0);
});
test('Moc Loc commits its warning, charges once inside the seal and a late sidestep avoids root strikes',()=>{
 const s=bossStage('b1');s.run.player.position={x:1200,y:700};tick(s,1.6);const a=s.bossAttack;assert.equal(a.kind,'charge');assert.equal(a.phase,'windup');const hp=s.run.character.resources.currentHp;
 const endpoint={...a.to};s.run.player.position={...endpoint};tick(s,.9);assert.equal(s.run.character.resources.currentHp,hp);tick(s,.8);assert.ok(s.run.character.resources.currentHp<hp);
 const hitHp=s.run.character.resources.currentHp;tick(s,.4);assert.equal(s.run.character.resources.currentHp,hitHp);
 assert.ok(Math.hypot((s.boss.position.x-MOC_LOC_SEAL.x)/(MOC_LOC_SEAL.radiusX-45),(s.boss.position.y-MOC_LOC_SEAL.y)/(MOC_LOC_SEAL.radiusY-45))<=1+1e-8);
 for(let i=0;i<200&&!s.bossAttack?.kind?.includes('roots');i++)tick(s,.05);assert.equal(s.bossAttack.kind,'roots');const positions=JSON.stringify(s.bossAttack.spots);
 s.run.player.position={x:400,y:900};tick(s,1.6);assert.equal(s.run.character.resources.currentHp,hitHp);assert.equal(JSON.stringify(s.bossAttack.spots),positions);
 const p=insideMocLocSeal({x:-1000,y:5000});assert.ok(Math.hypot((p.x-MOC_LOC_SEAL.x)/(MOC_LOC_SEAL.radiusX-45),(p.y-MOC_LOC_SEAL.y)/(MOC_LOC_SEAL.radiusY-45))<=1+1e-8);
});
test('actual forest AI can kill the player; it does not award story victory',()=>{
 const s=fresh();start(s);tick(s,180);assert.equal(s.phase,'lost');assert.equal(s.run.status,'finished');assert.equal(s.combatWon,false);assert.equal(s.sealBroken,false);
});
test('forest boss uses the same fixed clock at 30, 60, 120 FPS',()=>{
 const snapshots=[30,60,120].map(fps=>{const s=bossStage('a1');s.run.player.position={x:450,y:820};for(let i=0;i<fps*8;i++)tick(s,1/fps);
  return {time:s.run.time,hp:s.run.character.resources.currentHp,position:s.boss.position,cycle:s.bossCycle,attack:s.bossAttack};});
 assert.deepEqual(snapshots[0],snapshots[1]);assert.deepEqual(snapshots[1],snapshots[2]);
});
test('selected forest atlases have real alpha and do not cut through any silhouette',async()=>{
 for(const [file,regions] of [['public/assets/characters/archer/kieu-ngao-people-v1.png',FOREST_PERSON_REGIONS],['public/assets/monsters/kieu-ngao/moc-loc-sheet-v1.png',[[0,768,0,1024],[768,1536,0,1024]]]]){
  const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(info.width,1536);assert.equal(info.height,1024);assert.equal((await sharp(file).stats()).isOpaque,false);
  for(const [x0,x1,y0,y1] of regions){let count=0,cuts=0;for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(data[(y*info.width+x)*4+3]>=24){count++;if(x===x0||x===x1-1||y===y0||y===y1-1)cuts++;}
   assert.ok(count>15000,`${file}: empty pose`);assert.equal(cuts,0,`${file}: clipped pose`);}
 }
});
