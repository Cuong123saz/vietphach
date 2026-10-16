const {test}=require('node:test');const assert=require('node:assert/strict');
const load=require('./load-ts.cjs')();
const {createRun,tickRun}=load('src/run/Run.ts');
const {createKhangChienZone,KHANG_CHIEN_ROADS:ROADS}=load('src/world/khangChien.ts');
const {createKhangChienRuntime,tickKhangChien,beginKhangChienCombat,khangChienDev,beginKhangChienSacrifice,finaleTiming,stageAge,renewalDuration,renewalStep,castKhangChienFinaleQ,finaleQRemaining,KHANG_CHIEN_RENEWAL_POINT:P}=load('src/run/KhangChienStage.ts');

test('opening follows music: movement until 20, barrier creation until 24, then combat without teleport or waiting',()=>{
 const {syncKhangChienOpening}=load('src/run/KhangChienStage.ts');const s=fresh();s.phase='ready';
 syncKhangChienOpening(s,10);assert.equal(s.phase,'arrival');assert.equal(s.barrierActive,false);
 assert.equal(s.run.player.position.x,1950);assert.equal(s.run.player.position.y,835);
 syncKhangChienOpening(s,20);assert.equal(s.phase,'barrier');assert.equal(s.barrierActive,true);assert.equal(s.run.enemyCombat.enabled,false);
 assert.equal(s.run.player.position.x,1420);assert.equal(s.run.player.position.y,410);
 const p={...s.run.player.position};syncKhangChienOpening(s,23.99);assert.equal(s.phase,'barrier');
 syncKhangChienOpening(s,24);assert.equal(s.phase,'combat');assert.equal(s.run.enemyCombat.enabled,true);
 assert.equal(s.run.player.position.x,p.x);assert.equal(s.run.player.position.y,p.y);
});

test('music lead-in does not enable enemies until the playback cue starts combat',()=>{
 const {prepareKhangChienCombat}=load('src/run/KhangChienStage.ts');const s=fresh();
 khangChienDev(s,'stage-skip-intro');prepareKhangChienCombat(s);
 assert.equal(s.phase,'rally');assert.equal(s.run.enemyCombat.enabled,false);
 tickKhangChien(s,30);assert.equal(s.phase,'rally');assert.equal(s.run.enemyCombat.enabled,false);
 beginKhangChienCombat(s);assert.equal(s.phase,'combat');assert.equal(s.run.enemyCombat.enabled,true);
});
test('music cue uses actual playback position and pauses with the stage instead of a wall-clock timeout',async()=>{
 let media;class AudioMock{
  currentTime=0;paused=true;ended=false;
  constructor(){media=this;}play(){this.paused=false;return Promise.resolve();}pause(){this.paused=true;}removeAttribute(){}load(){}
 }
 const documentMock={hidden:false,addEventListener(){},removeEventListener(){}};
 const {KhangChienMusic}=require('./load-ts.cjs')({Audio:AudioMock,document:documentMock})('src/presentation/phaser/KhangChienMusic.ts');
 const music=new KhangChienMusic();await music.start(24);assert.equal(media.currentTime,24);assert.equal(music.readyForCombat,true);
 await music.start();media.currentTime=23.99;assert.equal(music.readyForCombat,false);
 media.currentTime=24;assert.equal(music.readyForCombat,true);
 music.sync(true);assert.equal(music.readyForCombat,false);assert.equal(media.currentTime,24);
 music.sync(false);await Promise.resolve();assert.equal(music.readyForCombat,true);
 music.destroy();assert.equal(media.paused,true);assert.equal(music.readyForCombat,false);
});
test('remaining stage music switches once, loops across maps, pauses at end and resets on replay',async()=>{
 let media;class AudioMock{
  currentTime=0;paused=true;ended=false;loads=0;
  constructor(){media=this;}play(){this.paused=false;return Promise.resolve();}pause(){this.paused=true;}
  removeAttribute(){}load(){this.loads++;this.paused=true;this.ended=false;}
 }
 const documentMock={hidden:false,addEventListener(){},removeEventListener(){}};
 const {KhangChienMusic}=require('./load-ts.cjs')({Audio:AudioMock,document:documentMock})('src/presentation/phaser/KhangChienMusic.ts');
 const music=new KhangChienMusic();await music.start();assert.equal(media.loop,false);
 media.currentTime=40;music.sync(false,2);await Promise.resolve();
 assert.match(media.src,/trong-tran-troi-nam/);assert.equal(media.loop,true);assert.equal(media.paused,false);
 media.currentTime=75;music.sync(false,3);assert.equal(media.currentTime,75);assert.equal(media.loads,1);
 music.sync(true,4);assert.equal(media.paused,true);music.sync(false,4);await Promise.resolve();assert.equal(media.currentTime,75);
 music.sync(true,4);assert.equal(media.paused,true);
 await music.start();assert.match(media.src,/map-1/);assert.equal(media.loop,false);assert.equal(media.currentTime,0);
 media.ended=true;media.paused=true;music.sync(false,1);await Promise.resolve();assert.match(media.src,/trong-tran-troi-nam/);assert.equal(media.paused,false);
 music.destroy();
});
const {KHANG_CHIEN_BALANCE:B}=load('src/config/balance/khangChien.ts');
const {applyHpDamage}=load('src/gameplay/characters/core/CharacterResources.ts');
const {resolveDamage}=load('src/gameplay/combat/Damage.ts');
const {castRunQ,castRunR,finishRun}=load('src/run/Run.ts');
const {castWaterE,tickWaterMage}=load('src/gameplay/characters/jobs/mage/WaterMageSkills.ts');
const {waterLongProfile,waterLongERadius}=load('src/gameplay/characters/jobs/mage/WaterLongRules.ts');
const {bodyMoveMultiplier}=load('src/gameplay/combat/CombatBody.ts');
const {WATER_MAGE_TUNING:T}=load('src/config/balance/waterMage.ts');
test('prison displays a brighter sphere without a swamp and clears on expiry or death',()=>{
 const {WaterPrisonEffects}=load('src/presentation/phaser/WaterPrisonEffects.ts'),objects=[];
 const object=(x,y,key)=>{
  const o={x,y,key,width:100,height:100,texture:{customData:{}},destroyed:false,
   setTexture(key){this.key=key;return this;},setPosition(x,y){this.x=x;this.y=y;return this;},
   setDisplaySize(w,h){this.displayWidth=w;this.displayHeight=h;return this;},
   setScale(scale){this.scale=scale;return this;},destroy(){this.destroyed=true;}};
  for(const method of ['setOrigin','setDepth','setAlpha','setRotation','setFlipX','setVisible'])o[method]=()=>o;
  objects.push(o);return o;
 };
 const scene={add:{image:object,ellipse:(x,y,w,h)=>Object.assign(object(x,y,'ring'),{displayWidth:w,displayHeight:h})}};
 const effects=new WaterPrisonEffects(scene),radius=163.02;
 const cast={id:1,position:{x:100,y:200},radius,prison:{duration:2,eruptDelay:1.75}};
 const prison={cast,bornAt:0,expiresAt:2,erupted:false};
 const mage={team:'players',resources:{currentHp:100},waterSkills:{prisons:[prison]}};
 effects.update(mage,[],0);const sphere=objects.find(o=>o.key==='stage-water-prison');
 assert.ok(sphere);assert.equal(objects.some(o=>o.key==='water-swamp-7'),false);
 prison.erupted=true;effects.erupt(cast,1.75);effects.update(mage,[],1.99);
 assert.equal(sphere.destroyed,true);assert.equal(objects.find(o=>o.key==='dragon-key-4').scale,radius*2/100);
 assert.equal(objects.find(o=>o.key==='ring').displayWidth,radius*2);
 effects.update(mage,[],2);assert.equal(objects.some(o=>o.key==='water-swamp-7'),false);
 const second={...prison,cast:{...cast,id:2},bornAt:3,expiresAt:5,erupted:false};
 mage.waterSkills.prisons=[second];effects.update(mage,[],3);const next=objects.filter(o=>o.key==='stage-water-prison').at(-1);
 mage.resources.currentHp=0;effects.update(mage,[],3.1);assert.equal(next.destroyed,true);effects.destroy();
});
test('stage Q HUD uses the Q counter and describes manual targeting with the shared radius',()=>{
 const {waterMageHudModel,waterMageSkillInfo}=load('src/presentation/hud/waterMageHudModel.ts');
 const s=fresh(),m=s.run.character;m.mach=4;
 assert.equal(waterMageHudModel(m,0).skillStatus('q'),'Sẵn sàng');
 m.mach=0;m.waterSkills.qCastsSinceEmpower=4;
 assert.equal(waterMageHudModel(m,0).skillStatus('q'),'Thủy Ngục');
 const info=waterMageSkillInfo(m,'q');assert.match(info.description,/không tự khóa tâm/);
 assert.ok(info.rules.some(r=>r.includes('vùng Q')&&r.includes('85,8')));
});
function waterCtx(s,now=s.run.time){return {mage:s.run.character,position:s.run.player.position,bodies:s.run.combatBodies,
 view:{x:0,y:0,width:2200,height:1400},zone:s.run.zone,now,random:()=>.99};}
let serial=0;
function fresh(){return createKhangChienRuntime(createRun(`stage-${++serial}`,createKhangChienZone(1),{element:'water',moveSpeed:180}));}
function battle(s){khangChienDev(s,'stage-skip-intro');beginKhangChienCombat(s);}
test('barrier tutorial starts on an actual attack windup and stays anchored to the first attack',()=>{
 const s=fresh();battle(s);const c=s.run.enemyCombat.controllers[0];
 c.targetId=s.run.character.id;c.phase='windup';tickKhangChien(s,.1);assert.equal(s.barrierAttackAt,undefined);
 c.targetId=s.barrier.body.id;c.phase='chase';tickKhangChien(s,.1);assert.equal(s.barrierAttackAt,undefined);
 c.phase='windup';tickKhangChien(s,.1);assert.equal(s.barrierAttackAt,s.clock);
 const first=s.barrierAttackAt;tickKhangChien(s,1);assert.equal(s.barrierAttackAt,first);
});
test('player death and a broken barrier fail immediately; replay starts with fresh HP, barrier and tutorial',()=>{
 for(const reason of ['player','barrier']){
  const s=fresh();battle(s);(reason==='player'?s.run.character:s.barrier.body.actor).resources.currentHp=0;
  tickKhangChien(s,0);assert.equal(s.phase,'failed');assert.equal(s.failureReason,reason);assert.equal(s.run.enemyCombat.enabled,false);
  const replay=fresh();assert.equal(replay.run.character.resources.currentHp,replay.run.character.stats.maxHp);
  assert.equal(replay.barrier.body.actor.resources.currentHp,4000);assert.equal(replay.barrierAttackAt,undefined);
  load('src/run/KhangChienStage.ts').syncKhangChienOpening(replay,24);
  assert.equal(replay.phase,'combat');assert.equal(replay.barrierActive,true);assert.equal(replay.run.enemyCombat.enabled,true);
  assert.equal(replay.run.player.position.x,1420);assert.equal(replay.run.player.position.y,410);assert.equal(replay.kills,0);
 }
});
function ritual(s){khangChienDev(s,'stage-boss-finale');assert.equal(s.phase,'bomb');assert.equal(beginKhangChienSacrifice(s),true);}
function chargeTen(s){tickKhangChien(s,1.5);for(let i=0;i<10;i++)assert.equal(castKhangChienFinaleQ(s,{x:1200,y:600}),true);}
function bossStage(){const s=fresh();battle(s);for(let i=0;i<3;i++){khangChienDev(s,'stage-clear-wave');tickKhangChien(s,renewalDuration()+.01);}return s;}
function hit(s,e,rawDamage=1e9){return resolveDamage({source:s.run.character,target:e.actor,element:'water',rawDamage,canCrit:false,targetPolicy:'ENEMY',hit:{kind:'aoe',sourceId:s.run.character.id,targetId:e.id}},{random:()=>1,now:s.run.time});}
test('trial owns Lv15 preset and 75 potential points without unlocking unfinished Lv15',()=>{
 const s=fresh(),m=s.run.character;assert.equal(m.progression.level,15);assert.equal(m.progression.potential.earned,75);assert.equal(m.progression.potential.unspent,0);
 assert.equal(m.stats.atk,18000);assert.equal(m.stats.maxMp,18000);assert.equal(m.stats.maxHp,3000);
 assert.equal(m.progression.evolutionChoices['13'],'b1-13');assert.equal(m.progression.evolutionChoices['15'],undefined);
 const normal=createRun('plain',createKhangChienZone(1),{element:'water',moveSpeed:180});assert.equal(normal.progression.level,1);assert.ok(normal.character.stats.maxHp<3000);
 assert.notEqual(s.enemies,fresh().enemies);assert.ok(s.enemies.some(e=>e.monsterArtId.startsWith('elite-')));
});

test('stage empowered Q preserves Mach, roots on arrival then deals one existing Q hit on eruption',()=>{
 const s=fresh();battle(s);const m=s.run.character,e=s.enemies[0],point={x:1200,y:750};
 s.enemies.slice(1).forEach(b=>b.position={x:340,y:1200});e.position={...point};e.actor.element='water';
 m.mach=4;m.waterSkills.qCastsSinceEmpower=4;const mp=m.resources.currentMp,hp=e.actor.resources.currentHp;
 assert.equal(castRunQ(s.run,point).ok,true);assert.equal(m.mach,4);assert.equal(m.resources.currentMp,mp-T.q.mpCost);
 const cast=m.waterSkills.scheduled.find(e=>e.kind==='q-impact').cast;
 assert.equal(cast.rawDamage,m.stats.atk*2*waterLongProfile(m).qDamageMultiplier);
 tickWaterMage(waterCtx(s,cast.impactAt-.01));assert.equal(m.waterSkills.prisons.length,0);assert.equal(e.actor.resources.currentHp,hp);
 tickWaterMage(waterCtx(s,cast.impactAt));assert.ok(e.actor.resources.currentHp<hp);assert.equal(bodyMoveMultiplier(e,cast.impactAt),0);
 const erupt=cast.impactAt+B.skills.prisonEruptDelay;
 tickWaterMage(waterCtx(s,erupt));assert.equal(m.mach,4);assert.ok(e.actor.resources.currentHp<hp);
 assert.equal(m.waterSkills.events.filter(e=>e.kind==='damage').length,2);
 assert.ok(Math.abs(m.resources.currentMp-(mp-T.q.mpCost)*.6)<1e-8);
 const after=e.actor.resources.currentHp;
 tickWaterMage(waterCtx(s,cast.impactAt+B.skills.prisonDuration));assert.equal(m.waterSkills.prisons.length,0);assert.equal(bodyMoveMultiplier(e,cast.impactAt+2),1);
 assert.equal(e.actor.resources.currentHp,after);
});
test('stage Q keeps manual ground aim while E exists and shares its per-map radius with copies',()=>{
 const s=fresh();battle(s);const m=s.run.character;
 for(let i=1;i<=4;i++){
  m.mach=4;m.waterSkills.cooldowns.e=0;m.waterSkills.mirrors={count:3,expiresAt:1000};
  assert.equal(castWaterE(waterCtx(s),undefined,{x:1200,y:750}).ok,true);
  m.waterSkills.cooldowns.q=0;m.waterSkills.qCastsSinceEmpower=4;
  const aim={x:s.run.player.position.x+120,y:s.run.player.position.y};
  assert.equal(castRunQ(s.run,aim).ok,true);
  const cast=m.waterSkills.scheduled.find(e=>e.kind==='q-impact').cast;
  assert.deepEqual({...cast.position},aim);assert.notDeepEqual(cast.position,m.waterSkills.swamp.position);
  assert.equal(cast.radius,m.waterSkills.swamp.radius);
  const copy=m.waterSkills.scheduled.find(e=>e.kind==='copy-q');
  assert.deepEqual({...copy.position},aim);assert.equal(copy.radius,cast.radius);
  assert.equal(copy.rawDamage,cast.rawDamage*.5);
  if(i<4){khangChienDev(s,'stage-clear-wave');tickKhangChien(s,renewalDuration()+.01);assert.equal(s.mapIndex,i+1);}
 }
});
test('stage manual aim still clamps to Q range even with an active swamp',()=>{
 const s=fresh();battle(s);const m=s.run.character;m.mach=4;
 castWaterE(waterCtx(s),undefined,{x:1200,y:750});
 const origin=s.run.player.position;assert.equal(castRunQ(s.run,{x:origin.x+T.q.castRange*2,y:origin.y}).ok,true);
 const cast=m.waterSkills.scheduled.find(e=>e.kind==='q-impact').cast;
 assert.equal(cast.position.x,origin.x+T.q.castRange);assert.equal(cast.position.y,origin.y);
});
test('map-four prison root and eruption hit the same expanded Q area with exactly one Q damage',()=>{
 const s=bossStage(),m=s.run.character,point={x:1200,y:750},radius=waterLongERadius(m);
 const inside=s.enemies[0],outside=s.enemies[1];
 s.enemies.forEach(b=>b.position={x:340,y:1200});
 for(const [b,offset] of [[inside,radius-2],[outside,radius+2]]){
  b.position={x:point.x+offset,y:point.y};b.radius=1;b.hitbox=undefined;
  b.actor.element='water';b.actor.stats.def=0;b.actor.stats.maxHp=100000;b.actor.resources.currentHp=100000;b.actor.minimumHp=undefined;
 }
 m.waterSkills.qCastsSinceEmpower=4;assert.equal(castRunQ(s.run,point).ok,true);
 const cast=m.waterSkills.scheduled.find(e=>e.kind==='q-impact').cast;
 assert.equal(cast.radius,radius);assert.ok(radius>waterLongProfile(m).radius);
 tickWaterMage(waterCtx(s,cast.impactAt));
 assert.equal(bodyMoveMultiplier(inside,cast.impactAt),0);assert.equal(bodyMoveMultiplier(outside,cast.impactAt),1);
 assert.equal(inside.actor.resources.currentHp,100000-cast.rawDamage);
 const eruptionMp=m.resources.currentMp;
 inside.position={x:340,y:1200};outside.position={...point};
 tickWaterMage(waterCtx(s,cast.impactAt+B.skills.prisonEruptDelay));
 assert.equal(inside.actor.resources.currentHp,100000-2*cast.rawDamage-eruptionMp*.4);assert.equal(outside.actor.resources.currentHp,100000);
 tickWaterMage(waterCtx(s,cast.impactAt+B.skills.prisonDuration));
 assert.equal(m.waterSkills.events.filter(e=>e.kind==='damage' && e.targetId===inside.id).length,2);
});
test('failed or busy empowered Q preserves READY; ordinary runs never get the stage payload',()=>{
 const s=fresh();battle(s);const m=s.run.character;m.mach=4;m.resources.currentMp=0;
 assert.equal(castRunQ(s.run,{x:1200,y:700}).reason,'mp');assert.equal(m.mach,4);
 m.resources.currentMp=m.stats.maxMp;m.waterSkills.cooldowns.q=1;
 assert.equal(castRunQ(s.run,{x:1200,y:700}).reason,'cooldown');assert.equal(m.mach,4);
 m.waterSkills.cooldowns.q=0;assert.equal(castRunQ(s.run,{x:NaN,y:700}).reason,'target');assert.equal(m.mach,4);
 assert.equal(castRunQ(s.run,{x:1200,y:700}).ok,true);m.mach=4;
 assert.equal(castRunQ(s.run,{x:1200,y:700}).reason,'busy');assert.equal(m.mach,4);
 const normal=createRun('normal-stage-isolation',createKhangChienZone(1),{element:'water',moveSpeed:180});normal.character.mach=4;
 assert.equal(castRunQ(normal,{x:1200,y:700}).ok,true);assert.equal(normal.character.mach,4);
 assert.equal(normal.character.waterSkills.scheduled[0].cast.prison,undefined);
});
test('mirror replays captured empowered prison with one damage scale and never consumes or grants Mach',()=>{
 const s=fresh();battle(s);const m=s.run.character,e=s.enemies[0],point={x:1200,y:750};
 s.enemies.slice(1).forEach(b=>b.position={x:340,y:1200});e.position={...point};e.actor.stats.maxHp=100000;e.actor.resources.currentHp=100000;e.actor.element='water';
 castRunR(s.run);m.mach=4;m.waterSkills.qCastsSinceEmpower=4;castRunQ(s.run,point);assert.equal(m.mach,4);assert.equal(m.waterSkills.mirrors.count,2);
 const original=m.waterSkills.scheduled.find(e=>e.kind==='q-impact').cast;
 tickWaterMage(waterCtx(s,1.5));const copied=m.waterSkills.scheduled.find(e=>e.kind==='q-impact').cast;
 assert.equal(copied.execution,'copy');assert.deepEqual(copied.prison,original.prison);assert.equal(copied.radius,original.radius);
 assert.equal(copied.rawDamage,original.rawDamage*.5);m.waterSkills.encounterBuff.prisonEruptDelay=99;
 tickWaterMage(waterCtx(s,5));assert.equal(m.mach,4);assert.equal(m.waterSkills.prisons.length,0);
 assert.equal(m.waterSkills.events.filter(e=>e.kind==='prison-erupt').length,2);
 assert.equal(m.waterSkills.scheduled.length,0);
});
test('E radius grows additively per map (x1.25 more on the final map); copied pool captures radius and ordinary shield stays unchanged',()=>{
 const s=fresh();battle(s);const m=s.run.character,base=waterLongProfile(m).radius;
 for(let i=1;i<=4;i++){
  const multiplier=(1+(i-1)*.3)*(i===4?1.25:1);assert.ok(Math.abs(waterLongERadius(m)-base*multiplier)<1e-8);
  m.mach=4;m.waterSkills.cooldowns.e=0;m.waterSkills.mirrors={count:3,expiresAt:1000};
  const expectedDamage=m.stats.maxMp*.2;
  assert.equal(castWaterE(waterCtx(s),undefined,{x:1200,y:750}).ok,true);
  assert.ok(Math.abs(m.waterSkills.swamp.radius-base*multiplier)<1e-8);
  assert.equal(m.waterSkills.swamp.rawDamage,expectedDamage);
  const copy=m.waterSkills.scheduled.find(e=>e.kind==='copy-swamp');assert.equal(copy.swamp.radius,m.waterSkills.swamp.radius);
  assert.equal(copy.swamp.rawDamage,m.waterSkills.swamp.rawDamage*.5);
  if(i<4){khangChienDev(s,'stage-clear-wave');tickKhangChien(s,renewalDuration()+.01);assert.equal(s.mapIndex,i+1);assert.equal(m.waterSkills.prisons.length,0);}
 }
 m.waterSkills.swamp=undefined;m.waterSkills.copiedSwamps=[];m.waterSkills.cooldowns.e=0;m.mach=0;
 assert.equal(castWaterE(waterCtx(s)).ok,true);assert.equal(m.mach,1);assert.equal(m.shields.at(-1).amount,m.stats.maxMp*.2);
 finishRun(s.run);assert.equal(m.waterSkills.encounterBuff,undefined);assert.equal(m.waterSkills.prisons.length,0);
});
test('death or map transition removes stage prisons and only their own root source',()=>{
 const s=fresh();battle(s);const m=s.run.character,e=s.enemies[0];e.position={x:1200,y:750};m.mach=4;m.waterSkills.qCastsSinceEmpower=4;
 castRunQ(s.run,e.position);const cast=m.waterSkills.scheduled[0].cast;tickWaterMage(waterCtx(s,cast.impactAt));
 e.slows.push({sourceId:'another-skill',multiplier:.8,expiresAt:100});m.resources.currentHp=0;tickWaterMage(waterCtx(s,1));
 assert.equal(m.waterSkills.prisons.length,0);assert.equal(m.waterSkills.scheduled.length,0);assert.equal(bodyMoveMultiplier(e,1),.8);
 const transition=fresh();battle(transition);transition.run.character.mach=4;transition.run.character.waterSkills.qCastsSinceEmpower=4;
 castRunQ(transition.run,{x:1200,y:750});const pending=transition.run.character.waterSkills.scheduled[0].cast;
 tickWaterMage(waterCtx(transition,pending.impactAt));assert.equal(transition.run.character.waterSkills.prisons.length,1);
 khangChienDev(transition,'stage-clear-wave');assert.equal(transition.phase,'transition');assert.equal(transition.run.character.waterSkills.prisons.length,0);
});
test('stage prison stops boss jump and burrow displacement without disabling attacks or unrelated movement',()=>{
 const s=bossStage(),body=s.enemies.find(e=>e.id===s.bossId),m=s.run.character;
 const {createBossSequence,tickBossSequence}=load('src/gameplay/enemies/SpikedShellBoss.ts');
 const settings=load('src/config/balance/eliteEnemies.ts').ELITE_ENEMIES['boss-spiked-shell-beast'].attack.bossCycle;
 body.position={x:1000,y:800};body.slows=[{sourceId:`water-prison:${m.id}:1`,multiplier:0,expiresAt:2}];
 const target={id:m.id,actor:m,position:{x:1200,y:800},radius:12};
 const ctx={now:.5,seconds:.1,body,target,targets:[target],zone:s.run.zone,settings,hitRadius:20,shoot:()=>{},hit:()=>{}};
 const seq=createBossSequence(0,settings);seq.phase='jump';seq.endsAt=1;seq.jumpTarget={x:1200,y:800};
 tickBossSequence(seq,ctx);assert.equal(body.position.x,1000);assert.equal(body.position.y,800);
 seq.phase='burrow';seq.endsAt=.5;tickBossSequence(seq,ctx);assert.equal(seq.emergeAt.x,body.position.x);assert.equal(seq.emergeAt.y,body.position.y);
 body.burrowed=false;body.slows=[];seq.phase='jump';seq.endsAt=3;ctx.now=2.5;
 tickBossSequence(seq,ctx);assert.ok(body.position.x>1000);
});
test('opening runs from map bottom, summons barrier, exits and awaits player',()=>{
 const s=fresh();assert.equal(s.run.player.position.y,1320);assert.equal(s.barrierActive,false);assert.equal(s.run.zone.objects.filter(o=>o.resource==='water-barrier').length,0);
 tickKhangChien(s,4);assert.equal(s.phase,'barrier');assert.equal(s.barrierActive,true);assert.ok(s.run.zone.objects.some(o=>o.resource==='water-barrier'));
 tickKhangChien(s,1.21);assert.equal(s.phase,'sortie');tickKhangChien(s,1.21);assert.equal(s.phase,'briefing');
 const clock=s.clock;tickKhangChien(s,60);assert.equal(s.clock,clock);beginKhangChienCombat(s);assert.equal(s.phase,'combat');assert.equal(s.run.enemyCombat.enabled,true);
});
test('only real dead bodies count, not missing/cull or attack events',()=>{
 const s=fresh();battle(s);tickKhangChien(s,1.3);assert.equal(s.kills,0);const e=s.enemies[0];hit(s,e);tickKhangChien(s,0);
 assert.equal(s.kills,1);assert.ok(!s.enemies.includes(e));assert.ok(!s.run.combatBodies.includes(e));assert.ok(!s.run.enemyCombat.controllers.some(c=>c.id===e.id));
 tickKhangChien(s,0);assert.equal(s.kills,1);assert.equal(s.phase,'combat');
});
test('active actor count is bounded and spawn positions remain outside barrier',()=>{
 const s=fresh();battle(s);for(let i=0;i<200;i++)tickKhangChien(s,1.3);
 assert.equal(s.enemies.length,36);assert.equal(s.spawned,36);assert.equal(s.kills,0);
 const R=load('src/world/khangChien.ts').KHANG_CHIEN_REFUGE;
 for(const e of s.enemies.slice(20))assert.ok(((e.position.x-R.x)/R.radiusX)**2+((e.position.y-R.y)/R.radiusY)**2>=1.12);
});
test('100,150,200 real kills advance maps after renewal, which also restores HP; progression kept',()=>{
 const s=fresh();battle(s);const m=s.run.character;m.resources.currentHp=1234;m.resources.currentMp=8765;
 for(const [index,quota] of [[1,100],[2,150],[3,200]]){
  assert.equal(s.mapIndex,index);khangChienDev(s,'stage-clear-wave');assert.equal(s.kills,quota);assert.equal(s.spawned,quota);assert.equal(s.phase,'transition');
  tickKhangChien(s,1);assert.equal(s.mapIndex,index);tickKhangChien(s,renewalDuration());assert.equal(s.mapIndex,index+1);
  assert.equal(s.run.character,m);assert.ok(Math.abs(m.resources.currentHp-m.stats.maxHp)<1e-6);assert.ok(Math.abs(m.resources.currentMp-m.stats.maxMp)<1e-6);
  assert.equal(s.run.zone.mapId,`khang-chien-${index+1}`);assert.equal(s.run.enemyCombat.shots.length,0);
 }assert.equal(s.phase,'boss');assert.ok(s.bossId);assert.ok(s.enemies.length>1);
});
test('oversized damage gates boss at 40%, counted applied damage is accurate',()=>{
 const s=bossStage(),boss=s.enemies.find(e=>e.id===s.bossId);const result=hit(s,boss);
 assert.equal(boss.actor.resources.currentHp,400000);assert.equal(result.appliedDamage,600000);assert.equal(result.killed,false);
 tickKhangChien(s,0);assert.equal(s.phase,'bomb');assert.equal(s.run.character.resources.currentMp,18000);assert.equal(s.run.enemyCombat.enabled,false);
});
test('ten stacks release first dragon then eight; soul offering starts cleansing after the counterblast',()=>{
 const s=bossStage(),boss=s.enemies.find(e=>e.id===s.bossId);ritual(s);chargeTen(s);const timing=finaleTiming(s);
 tickKhangChien(s,timing.firstImpactAt-stageAge(s)-.01);assert.equal(s.firstImpact,false);
 tickKhangChien(s,.02);assert.equal(s.firstImpact,true);assert.ok(boss.actor.resources.currentHp>1);
 tickKhangChien(s,timing.eightImpactAt-stageAge(s)+.01);assert.equal(s.eightImpact,true);assert.equal(boss.actor.resources.currentHp,1);
 assert.equal(s.run.character.resources.currentHp,1);assert.equal(s.run.character.resources.currentMp,0);
 tickKhangChien(s,timing.beamAt-stageAge(s)-.01);assert.equal(s.run.character.resources.currentHp,1);
 tickKhangChien(s,timing.offeringAt-stageAge(s)+.01);assert.equal(s.phase,'sacrifice');assert.equal(s.run.character.resources.currentHp,1);
 tickKhangChien(s,timing.collapseAt-stageAge(s)+.01);assert.equal(s.phase,'purification');assert.equal(s.run.character.resources.currentHp,0);assert.equal(s.enemies.length,0);
 tickKhangChien(s,load('src/run/KhangChienStage.ts').purificationDuration());assert.equal(s.phase,'complete');
});

test('finale requires actual Q commands after E arrival, capped at ten without MP/CD/Mach/copies',()=>{
 const s=bossStage(),m=s.run.character,origin={x:1200,y:600};
 assert.equal(castKhangChienFinaleQ(s,origin),false);ritual(s);
 m.mach=4;m.waterSkills.cooldowns.q=999;m.waterSkills.mirrors={count:3,expiresAt:999};
 assert.equal(castKhangChienFinaleQ(s,origin),false);tickKhangChien(s,B.finale.chargeSeconds);
 assert.equal(finaleQRemaining(s),Infinity);assert.equal(s.finaleShots.length,0);
 assert.equal(castKhangChienFinaleQ(s,{x:NaN,y:600}),false);
 for(let i=0;i<10;i++)assert.equal(castKhangChienFinaleQ(s,origin),true);
 origin.x=0;assert.equal(s.finaleShots[0].origin.x,1200);assert.equal(castKhangChienFinaleQ(s,origin),false);
 assert.equal(m.resources.currentMp,0);assert.equal(m.waterSkills.cooldowns.q,999);assert.equal(m.mach,4);
 assert.equal(m.waterSkills.mirrors.count,3);assert.equal(m.waterSkills.scheduled.length,0);
 tickKhangChien(s,5);assert.equal(finaleQRemaining(s),0);assert.equal(castKhangChienFinaleQ(s,origin),false);
});

test('each accepted Q arrives once, triggers real Siet then adds stack damage without hurting actors outside the pool',()=>{
 const s=bossStage(),boss=s.enemies.find(e=>e.id===s.bossId),far=s.enemies.find(e=>e.id!==s.bossId);
 ritual(s);far.position={x:100,y:100};const hp=far.actor.resources.currentHp;
 tickKhangChien(s,1.5);const origin={x:1200,y:600};
 castKhangChienFinaleQ(s,origin);tickKhangChien(s,B.finale.qFlightSeconds-.01);assert.equal(boss.actor.resources.currentHp,400000);
 tickKhangChien(s,.02);assert.equal(s.finaleShots[0].landed,true);
 assert.equal(boss.actor.resources.currentHp,399640);assert.equal(s.finaleStackDamage,1800);
 castKhangChienFinaleQ(s,origin);tickKhangChien(s,B.finale.qFlightSeconds+.01);
 assert.equal(boss.actor.resources.currentHp,398560);assert.equal(s.finaleStackDamage,3600);
 assert.equal(far.actor.resources.currentHp,hp);assert.equal(s.events.filter(e=>e.kind==='finale-q-impact').length,2);
 tickKhangChien(s,.3);assert.equal(boss.actor.resources.currentHp,398560);assert.equal(s.finaleStackDamage,3600);
});

test('final Q completes delivery before the first dragon and no eleventh stack is accepted',()=>{
 const s=bossStage();ritual(s);tickKhangChien(s,8);
 for(let i=0;i<10;i++)assert.equal(castKhangChienFinaleQ(s,{x:1200,y:600}),true);
 assert.equal(castKhangChienFinaleQ(s,{x:1200,y:600}),false);tickKhangChien(s,.23);
 assert.equal(s.finaleShots.filter(shot=>shot.landed).length,10);assert.equal(s.firstImpact,false);
 tickKhangChien(s,.28);assert.equal(s.firstImpact,true);assert.equal(s.events.filter(e=>e.kind==='finale-q-impact').length,10);
});

test('waiting never manufactures finale dragons and dead or finished runs reject Q',()=>{
 const s=bossStage();ritual(s);tickKhangChien(s,6.49);
 assert.equal(s.finaleShots.length,0);assert.equal(s.finaleStackDamage,0);
 s.run.character.resources.currentHp=0;assert.equal(castKhangChienFinaleQ(s,{x:1200,y:600}),false);
 s.run.character.resources.currentHp=1;s.run.status='finished';assert.equal(castKhangChienFinaleQ(s,{x:1200,y:600}),false);
});

test('explicit Dev skip can enter combat from the start screen even when browser audio is unavailable',()=>{
 const s=fresh();s.phase='ready';khangChienDev(s,'stage-skip-intro');
 assert.equal(s.phase,'combat');assert.equal(s.run.enemyCombat.enabled,true);assert.equal(s.barrierActive,true);
 const briefing=fresh();khangChienDev(briefing,'stage-skip-intro');assert.equal(briefing.phase,'briefing');
 khangChienDev(briefing,'stage-skip-intro');assert.equal(briefing.phase,'combat');
});

test('Dev ultimate shortcut uses the real wave and boss director, never auto-fills Q and rejects failed runs',()=>{
 const s=fresh();s.phase='ready';khangChienDev(s,'stage-test-ultimate');
 assert.equal(s.mapIndex,4);assert.equal(s.phase,'bomb');assert.equal(s.run.character.resources.currentHp,3000);beginKhangChienSacrifice(s);
 assert.equal(s.run.character.resources.currentMp,0);assert.equal(s.finaleShots.length,0);
 assert.equal(s.enemies.find(e=>e.id===s.bossId).actor.resources.currentHp,400000);
 tickKhangChien(s,1.5);assert.equal(castKhangChienFinaleQ(s,{x:1200,y:600}),true);
 const failed=fresh();failed.phase='failed';khangChienDev(failed,'stage-test-ultimate');assert.equal(failed.phase,'failed');assert.equal(failed.mapIndex,1);
});
test('ordinary player death fails encounter and stops reinforcement',()=>{
 const s=fresh();battle(s);applyHpDamage(s.run.character,1e9);tickKhangChien(s,.01);assert.equal(s.phase,'failed');const count=s.spawned;
 tickKhangChien(s,100);assert.equal(s.spawned,count);assert.equal(s.run.enemyCombat.enabled,false);assert.equal(fresh().phase,'arrival');
});
test('boss health does not regenerate, ordinary recovery remains unchanged',()=>{
 const s=bossStage(),boss=s.enemies.find(e=>e.id===s.bossId);hit(s,boss,100000);const hp=boss.actor.resources.currentHp;
 s.run.enemyCombat.enabled=false;tickRun(s.run,12);assert.equal(boss.actor.resources.currentHp,hp);
 const e=s.enemies.find(e=>e.id!==s.bossId);applyHpDamage(e.actor,1000);const old=e.actor.resources.currentHp;
 tickRun(s.run,1);assert.ok(e.actor.resources.currentHp>old);
});
test('HP floor never heals a damaged or dead actor; invalid floor rejected',()=>{
 const s=bossStage(),target=s.enemies.find(e=>e.id===s.bossId).actor;target.resources.currentHp=50;
 assert.equal(applyHpDamage(target,10),0);assert.equal(target.resources.currentHp,50);target.resources.currentHp=0;applyHpDamage(target,99);assert.equal(target.resources.currentHp,0);
 target.minimumHp=NaN;assert.throws(()=>applyHpDamage(target,1));
});
test('finished run cannot continue director and invalid delta rejected',()=>{
 const s=fresh();s.run.status='finished';tickKhangChien(s,12);assert.equal(s.clock,0);assert.throws(()=>tickKhangChien(s,-1));assert.throws(()=>tickKhangChien(s,Infinity));
});
test('barrier activates after summon, renewal heals the same actor across maps; never an ally body',()=>{
 const s=fresh();assert.equal(s.run.combatObjectives.length,0);battle(s);assert.equal(s.run.combatObjectives[0],s.barrier);
 assert.equal(s.barrier.body.actor.stats.maxHp,8000);assert.equal(s.barrier.body.actor.resources.currentHp,4000,'raised at half strength');applyHpDamage(s.barrier.body.actor,1500);
 for(let i=0;i<3;i++){
  khangChienDev(s,'stage-clear-wave');tickKhangChien(s,renewalDuration()+.01);
  assert.equal(s.barrier.body.actor.resources.currentHp,Math.min(8000,2500+4000*(i+1)));assert.equal(s.run.combatObjectives.length,1);assert.equal(s.run.combatObjectives[0],s.barrier);assert.ok(!s.run.combatBodies.includes(s.barrier.body));
  assert.ok(s.barrier.obstacleIds.every(id=>s.run.zone.objects.some(o=>o.id===id && o.resource==='water-barrier')));
 }
 assert.equal(fresh().barrier.body.actor.resources.currentHp,4000);
});
test('broken barrier fails stage with surviving mage, stops attacks/spawns and removes collision',()=>{
 const s=fresh();battle(s);applyHpDamage(s.barrier.body.actor,1e9);tickKhangChien(s,.01);
 assert.equal(s.phase,'failed');assert.equal(s.failureReason,'barrier');assert.equal(s.run.character.resources.currentHp,3000);
 assert.equal(s.barrierActive,false);assert.equal(s.run.combatObjectives.length,0);assert.ok(!s.run.zone.objects.some(o=>o.resource==='water-barrier'));
 const spawned=s.spawned;tickKhangChien(s,30);assert.equal(s.spawned,spawned);assert.equal(s.run.enemyCombat.enabled,false);assert.equal(s.run.enemyCombat.shots.length,0);
});
test('wall destruction takes priority over boss finale; cinematic itself never drains wall HP',()=>{
 const s=bossStage(),boss=s.enemies.find(e=>e.id===s.bossId);hit(s,boss);applyHpDamage(s.barrier.body.actor,1e9);tickKhangChien(s,0);
 assert.equal(s.phase,'failed');assert.equal(s.failureReason,'barrier');assert.equal(s.firstImpact,false);
 const success=bossStage();success.barrier.body.actor.resources.currentHp=100;ritual(success);chargeTen(success);
 tickKhangChien(success,finaleTiming(success).collapseAt-stageAge(success)+load('src/run/KhangChienStage.ts').purificationDuration()+.01);
 assert.equal(success.phase,'complete');assert.equal(success.barrier.body.actor.resources.currentHp,100);
});
test('renewal drains MP immediately, returns to current barrier, prays, restores gradually then changes map',()=>{
 const s=fresh();battle(s);s.run.character.resources.currentHp=1200;s.barrier.body.actor.resources.currentHp=1000;
 const origin={...s.run.player.position};khangChienDev(s,'stage-clear-wave');assert.equal(s.phase,'transition');assert.equal(renewalStep(s),'return');
 assert.equal(s.run.character.resources.currentMp,900);assert.equal(s.run.enemyCombat.enabled,false);
 tickKhangChien(s,1.5);assert.equal(s.mapIndex,1);assert.ok(Math.abs(s.run.player.position.x-(origin.x+P.x)/2)<1e-6);
 tickKhangChien(s,1.5);assert.equal(renewalStep(s),'prayer');assert.equal(s.run.player.position.x,P.x);assert.equal(s.run.player.position.y,P.y);assert.equal(s.run.character.resources.currentMp,900);
 tickKhangChien(s,1.5);assert.equal(renewalStep(s),'draw');assert.equal(s.barrier.body.actor.resources.currentHp,1000);
 tickKhangChien(s,1.5);assert.equal(s.mapIndex,1);assert.equal(s.run.character.resources.currentMp,9450);assert.equal(s.barrier.body.actor.resources.currentHp,3000);
 assert.equal(s.run.character.resources.currentHp,2100,'HP refills alongside MP: halfway at mid-draw');
 tickKhangChien(s,1.5);assert.equal(renewalStep(s),'sortie');assert.equal(s.barrier.body.actor.resources.currentHp,5000);assert.equal(s.run.character.resources.currentMp,18000);
 tickKhangChien(s,1.21);assert.equal(s.mapIndex,2);assert.equal(s.phase,'combat');assert.equal(s.renewal,undefined);assert.equal(s.run.character.resources.currentHp,3000);
 assert.equal(s.events.filter(e=>e.kind==='map').length,1);assert.equal(s.run.player.position.x,1350);assert.equal(s.run.enemyCombat.enabled,true);
});
test('renewal has no free MP before drawing; partial frame and large delta give the same capped recovery',()=>{
 function setup(){const s=fresh();battle(s);s.run.character.resources.currentMp=100;s.barrier.body.actor.resources.currentHp=500;khangChienDev(s,'stage-clear-wave');return s;}
 const large=setup(),small=setup();assert.equal(large.run.character.resources.currentMp,100,'drain never grants MP');
 tickKhangChien(large,renewalDuration()+.01);
 for(let age=0;age<renewalDuration()+.01-1e-8;){const dt=Math.min(.025,renewalDuration()+.01-age);tickKhangChien(small,dt);age+=dt;}
 assert.ok(Math.abs(small.barrier.body.actor.resources.currentHp-4500)<1e-6);assert.ok(Math.abs(small.run.character.resources.currentMp-18000)<1e-6);
 assert.equal(large.barrier.body.actor.resources.currentHp,4500);assert.equal(large.run.character.resources.currentMp,18000);assert.equal(small.mapIndex,large.mapIndex);
 const before=large.barrier.body.actor.resources.currentHp;tickKhangChien(large,.1);assert.equal(large.barrier.body.actor.resources.currentHp,before);
});
test('every map renewal is one reward; no restoration on incomplete waves, failure or finished run',()=>{
 const s=fresh();battle(s);s.run.character.resources.currentMp=500;s.barrier.body.actor.resources.currentHp=2000;tickKhangChien(s,1);
 assert.equal(s.renewal,undefined);assert.equal(s.run.character.resources.currentMp,500);assert.equal(s.barrier.body.actor.resources.currentHp,2000);
 khangChienDev(s,'stage-clear-wave');const mp=s.run.character.resources.currentMp;s.run.status='finished';tickKhangChien(s,20);
 assert.equal(s.mapIndex,1);assert.equal(s.run.character.resources.currentMp,mp);assert.equal(s.barrier.body.actor.resources.currentHp,2000);
 const broken=fresh();battle(broken);broken.barrier.body.actor.resources.currentHp=0;khangChienDev(broken,'stage-clear-wave');tickKhangChien(broken,20);
 assert.equal(broken.phase,'failed');assert.equal(broken.barrier.body.actor.resources.currentHp,0);assert.equal(broken.renewal,undefined);
});
test('reinforcements arrive on three road columns independent of player location, then hunt the mage directly',()=>{
 const s=fresh(),other=fresh();battle(s);battle(other);other.run.player.position={x:100,y:100};
 for(let i=0;i<3;i++){tickKhangChien(s,1.3);tickKhangChien(other,1.3);}
 const opening=B.openingEnemies,mobs=s.enemies.slice(opening);assert.equal(new Set(mobs.map(e=>e.roadId)).size,3);
 for(let i=0;i<mobs.length;i++){
  const e=mobs[i],road=ROADS.find(r=>r.id===e.roadId),state=s.run.enemyCombat.controllers.find(c=>c.id===e.id);
  assert.ok(road);assert.ok(Math.hypot(e.position.x-road.points[0].x,e.position.y-road.points[0].y)<270);
  assert.equal(e.position.x,other.enemies[i+opening].position.x);assert.equal(e.position.y,other.enemies[i+opening].position.y);
  assert.equal(state.approach,undefined);assert.equal(state.settings.pursuit,'relentless');assert.equal(state.settings.objectiveAggroRange,undefined);
 }
 const boss=bossStage(),leader=boss.enemies.find(e=>e.id===boss.bossId);assert.ok(leader.roadId);assert.equal(boss.run.enemyCombat.controllers.find(c=>c.id===leader.id).approach,undefined);
});
test('stage always targets exposed mage and changes to ward only after mage enters it',()=>{
 const s=fresh();battle(s);tickRun(s.run,0);assert.ok(s.run.enemyCombat.controllers.every(c=>c.targetId===s.run.character.id));
 assert.equal(s.barrier.body.actor.resources.currentHp,4000);s.run.player.position={x:1630,y:230};tickRun(s.run,0);
 assert.ok(s.run.enemyCombat.controllers.every(c=>c.targetId===s.barrier.body.id));
 s.run.player.position={x:1350,y:650};tickRun(s.run,0);assert.ok(s.run.enemyCombat.controllers.every(c=>c.targetId===s.run.character.id));
});
test('Dev refuge probes use same region policy without altering resources, progression or cinematic',()=>{
 const s=fresh(),start=s.run.player.position.x;khangChienDev(s,'stage-enter-refuge');assert.equal(s.run.player.position.x,start);
 battle(s);const mp=s.run.character.resources.currentMp;khangChienDev(s,'stage-enter-refuge');tickRun(s.run,0);
 assert.ok(s.run.enemyCombat.controllers.every(c=>c.targetId===s.barrier.body.id));assert.equal(s.run.character.resources.currentMp,mp);
 khangChienDev(s,'stage-exit-refuge');tickRun(s.run,0);assert.ok(s.run.enemyCombat.controllers.every(c=>c.targetId===s.run.character.id));assert.equal(s.run.character.progression.level,15);
});

test('stage Q has an independent four-cast counter: fifth empowers, failed casts and E never consume it',()=>{
 const s=fresh();battle(s);const m=s.run.character;m.mach=4;
 for(let i=0;i<5;i++){
  m.waterSkills.scheduled=[];m.waterSkills.cooldowns.q=0;
  assert.equal(castRunQ(s.run,{x:1200,y:750}).ok,true);
  const cast=m.waterSkills.scheduled.find(e=>e.kind==='q-impact').cast;
  assert.equal(!!cast.prison,i===4);assert.equal(m.mach,4);assert.equal(m.waterSkills.qCastsSinceEmpower,i===4?0:i+1);
 }
 m.waterSkills.qCastsSinceEmpower=4;m.waterSkills.scheduled=[];m.resources.currentMp=0;m.waterSkills.cooldowns.q=0;
 assert.equal(castRunQ(s.run,{x:1200,y:750}).ok,false);assert.equal(m.waterSkills.qCastsSinceEmpower,4);
 m.resources.currentMp=m.stats.maxMp;m.waterSkills.cooldowns.e=0;
 assert.equal(castWaterE(waterCtx(s),undefined,{x:1200,y:750}).ok,true);assert.equal(m.waterSkills.qCastsSinceEmpower,4);assert.equal(m.mach,0);
});
test('stage cannon clicks instantly fire full charge, respect 1.5 seconds and cannot bypass recovery by stopping',()=>{
 const {pressWaterCannon,tickWaterCannon,stopWaterCannon}=load('src/gameplay/characters/jobs/mage/WaterCannon.ts');
 const s=fresh(),a=s.run.character.basicAttack;
 pressWaterCannon(a);const shots=tickWaterCannon(a,0,0,{x:1,y:0});assert.equal(shots.length,1);assert.equal(shots[0].chargeRatio,1);
 stopWaterCannon(a);pressWaterCannon(a);assert.equal(tickWaterCannon(a,1.49,100,{x:1,y:0}).length,0);
 pressWaterCannon(a);assert.equal(tickWaterCannon(a,.01,100,{x:1,y:0}).length,0);
 pressWaterCannon(a);assert.equal(tickWaterCannon(a,0,100,{x:1,y:0}).length,1);
});
test('stage cannon grows its hit radius and pushes surviving enemies, with stage damage increased by 50 percent',()=>{
 const {fireRunProjectile,tickRunProjectiles}=load('src/run/Run.ts');const s=fresh();battle(s);s.run.zone.objects=[];
 const e=s.enemies[0];e.position={x:1000,y:1000};e.actor.resources.currentHp=e.actor.stats.maxHp=1e9;
 const shot=fireRunProjectile(s.run,'stage-push',{x:930,y:1000},{x:1,y:0},{speed:200,radius:8,range:400,chargeRatio:1,isFullCharge:true});
 assert.equal(shot.radius,12);const x=e.position.x;tickRunProjectiles(s.run,1,[e],()=>.99);assert.ok(e.position.x>x+24);const pushed=e.position.x;tickRunProjectiles(s.run,.5,[e],()=>.99);assert.ok(e.position.x>pushed);
 assert.equal(s.enemies.find(e=>!e.monsterArtId.startsWith('elite')).actor.stats.atk,360);
 assert.equal(s.enemies.find(e=>e.monsterArtId.startsWith('elite')).actor.stats.atk,900);
 const boss=bossStage();assert.equal(boss.enemies.find(e=>e.id===boss.bossId).actor.stats.atk,2400);
 // HP doubled for normal and elite monsters; the boss keeps its HP.
 const hp=fresh();assert.equal(hp.enemies.find(e=>e.rank==='normal').actor.stats.maxHp,13000);assert.equal(hp.enemies.find(e=>e.rank==='elite').actor.stats.maxHp,48000);
 assert.equal(boss.enemies.find(e=>e.id===boss.bossId).actor.stats.maxHp,1000000);
});

test('stage cannon pushes a crowd together at its heaviest member power, bumping enemies it runs into',()=>{
 const {fireRunProjectile,tickRunProjectiles}=load('src/run/Run.ts');
 const setup=(stage=true)=>{const s=fresh();battle(s);s.run.zone.objects=[];
  if(!stage)delete s.run.character.waterSkills.encounterBuff.cannonPushScale;
  for(const e of s.enemies){e.position={x:5000+Math.random()*100,y:5000};e.actor.resources.currentHp=e.actor.stats.maxHp=1e9;}return s;};
 const fire=(s,targets,seconds=1)=>{fireRunProjectile(s.run,'stage-push',{x:930,y:1000},{x:1,y:0},{speed:200,radius:8,range:400,chargeRatio:1,isFullCharge:true});
  // Game frames are at most 0.05s; bumping is checked per frame.
  const impacts=[];for(let t=0;t<seconds-1e-9;t+=.02)impacts.push(...tickRunProjectiles(s.run,.02,targets,()=>.99));return impacts;};
 const carry=(rank,stage=true)=>{const s=setup(stage),e=s.enemies[0];e.rank=rank;e.position={x:1000,y:1000};fire(s,[e]);return e.position.x-1000;};
 const full=carry('normal',false);assert.ok(full>100);
 assert.ok(Math.abs(carry('normal')-full*.35)<1);assert.ok(Math.abs(carry('elite')-full*.15)<1);assert.ok(Math.abs(carry('boss')-full*.05)<1);
 // Small enemy carried into an elite: both keep moving together, at the elite's power.
 const s=setup(),small=s.enemies[0],elite=s.enemies[1];small.rank='normal';elite.rank='elite';
 small.position={x:1000,y:1000};elite.position={x:1060,y:1000};const eliteHp=elite.actor.resources.currentHp;
 fire(s,[small,elite],1.5);
 assert.ok(elite.position.x>1060,'elite still nudged');assert.ok(elite.position.x-1060<carry('normal'),'but far less than a small enemy');
 assert.ok(elite.actor.resources.currentHp<eliteHp,'elite takes the cannon hit');
 assert.ok(Math.abs((small.position.x-1000)-(elite.position.x-1060))<carry('normal'),'pushed as one crowd');
 // An enemy off the cannon line but touched by the pushed crowd is hit and nudged too.
 const b=setup(),lead=b.enemies[0],side=b.enemies[1];lead.rank='normal';side.rank='normal';
 lead.position={x:1000,y:1000};side.position={x:1000+lead.radius+side.radius+20,y:1000+lead.radius};const sideHp=side.actor.resources.currentHp,sideX=side.position.x;
 const impacts=fire(b,[lead,side]);
 assert.ok(side.actor.resources.currentHp<sideHp,'bumped enemy damaged');assert.ok(side.position.x>sideX,'bumped enemy nudged');
 assert.ok(impacts.some(i=>i.type==='enemy' && i.hit.targetId===side.id));
 const boss=bossStage();assert.equal(boss.enemies.find(e=>e.id===boss.bossId).rank,'boss');
 assert.ok(boss.enemies.some(e=>e.rank==='elite') && boss.enemies.some(e=>e.rank==='normal'));
});

test('eight dragons lock one boss point only after charging ten stacks',()=>{
 const s=bossStage(),boss=s.enemies.find(e=>e.id===s.bossId);ritual(s);tickKhangChien(s,30);
 assert.equal(s.finaleEightTargets,undefined);assert.equal(s.phase,'sacrifice');assert.equal(s.firstImpact,false);
 for(let i=0;i<10;i++)castKhangChienFinaleQ(s,{x:1200,y:600});tickKhangChien(s,1.01);
 assert.equal(s.finaleEightTargets.length,8);assert.ok(s.finaleEightTargets.every(p=>p.x===boss.position.x && p.y===boss.position.y));
 const locked=s.finaleEightTargets[0].x;boss.position.x+=100;assert.equal(s.finaleEightTargets[0].x,locked);
});

test('bomb warning waits for explicit sacrifice and no timer invents stacks or restores MP',()=>{
 const s=bossStage(),m=s.run.character;const hp=m.resources.currentHp,mp=m.resources.currentMp;
 assert.equal(beginKhangChienSacrifice(s),false);khangChienDev(s,'stage-boss-finale');
 assert.equal(s.phase,'bomb');tickKhangChien(s,20);assert.equal(s.phase,'bomb');assert.equal(m.resources.currentHp,hp);assert.equal(m.resources.currentMp,mp);
 assert.equal(castKhangChienFinaleQ(s,{x:1,y:1}),false);assert.equal(beginKhangChienSacrifice(s),true);
 assert.equal(m.resources.currentHp,1);assert.equal(m.resources.currentMp,0);assert.equal(beginKhangChienSacrifice(s),false);
 m.resources.currentMp=100;tickKhangChien(s,20);assert.equal(m.resources.currentMp,0);assert.equal(m.resources.currentHp,1);
 assert.equal(s.finaleShots.length,0);assert.equal(s.firstImpact,false);
});

test('ritual accepts either key order within 0.6s, rejects single/repeated/late keys',()=>{
 const {inputKhangChienRitual}=load('src/run/KhangChienStage.ts');
 for(const keys of [['q','e'],['e','q']]){
  const s=bossStage();khangChienDev(s,'stage-boss-finale');
  assert.equal(inputKhangChienRitual(s,keys[0]),false);tickKhangChien(s,.5);
  assert.equal(inputKhangChienRitual(s,keys[1]),true);assert.equal(s.phase,'sacrifice');
 }
 const s=bossStage();khangChienDev(s,'stage-boss-finale');
 assert.equal(inputKhangChienRitual(s,'q'),false);assert.equal(inputKhangChienRitual(s,'q'),false);
 tickKhangChien(s,.7);assert.equal(inputKhangChienRitual(s,'e'),false);assert.equal(s.phase,'bomb');
});

test('counterblast slows only the final cinematic, keeping death after the visible blast',()=>{
 const {khangChienTimeScale}=load('src/run/KhangChienStage.ts');const s=bossStage();ritual(s);chargeTen(s);const timing=finaleTiming(s);
 assert.equal(khangChienTimeScale(s),1);tickKhangChien(s,timing.beamAt-stageAge(s)+.01);
 assert.equal(khangChienTimeScale(s),.2);assert.equal(s.run.character.resources.currentHp,1);
 tickKhangChien(s,timing.collapseAt-stageAge(s)+.01);assert.equal(khangChienTimeScale(s),1);assert.equal(s.run.character.resources.currentHp,0);
});

test('opening scouts northeast, pauses to reveal landing enemies, then reaches the barrier at twenty seconds',()=>{
 const {syncKhangChienOpening}=load('src/run/KhangChienStage.ts');const s=fresh();s.phase='ready';
 syncKhangChienOpening(s,0);assert.equal(s.run.player.position.x,1800);assert.equal(s.run.player.position.y,1220);
 syncKhangChienOpening(s,6);assert.equal(s.run.player.position.x,1950);assert.equal(s.run.player.position.y,835);
 const enemyY=s.enemies[0].position.y;syncKhangChienOpening(s,8);assert.equal(s.run.player.position.x,1950);assert.ok(s.enemies[0].position.y<enemyY);
 // Path stays on the dirt roads: never crosses the lotus pond on Map 1.
 for(let time=0;time<=20;time+=.25){syncKhangChienOpening(s,time);const p=s.run.player.position;
  assert.ok(!(p.x>1480 && p.x<1940 && p.y>610 && p.y<800),`player in pond at ${time}s: ${p.x},${p.y}`);}
 syncKhangChienOpening(s,20);assert.equal(s.phase,'barrier');assert.equal(s.run.player.position.x,1420);assert.equal(s.run.player.position.y,410);
 syncKhangChienOpening(s,24);assert.equal(s.phase,'combat');
});





test('stage enemy roles: sticky spit, delayed tar trail, quill pin, thorn wall, leaps and a dodgeable counter',()=>{
 const s=fresh();battle(s);
 for(let i=0;i<6 && s.enemies.length<40;i++){s.nextSpawnAt=0;tickKhangChien(s,.01);}
 const seen=new Set();
 for(const e of s.enemies){
  const c=s.run.enemyCombat.controllers.find(c=>c.id===e.id).settings,art=e.monsterArtId,species=art.replace(/^elite-/,'');seen.add(art);
  if(art==='elite-crop-snail'){assert.equal(c.visual,'resin');assert.equal(c.projectileCount,1);assert.equal(c.burstCount,2);assert.ok(c.leadShots);assert.ok(c.projectileSpeed<150);assert.ok(c.shotSlow.multiplier<1);assert.equal(c.pattern,undefined);}
  if(species==='mutant-caterpillar'){assert.equal(c.trail.kind,'slime');assert.ok(c.trail.armingSeconds>0);assert.ok(c.trail.slow.multiplier<1);assert.ok(c.kind==='ranged');}
  else assert.equal(c.trail,undefined,art);
  if(art==='elite-black-caterpillar'){assert.equal(c.pattern,'zone');assert.ok(c.zoneShot.flightSeconds>0);assert.ok(c.zoneShot.rootSeconds>0 && c.zoneShot.rootSeconds<1);assert.ok(c.zoneShot.dodgeSeconds>=.3);}
  else assert.equal(c.zoneShot,undefined,art);
  if(art==='elite-caterpillar'){assert.equal(c.pattern,'wall');assert.equal(c.wallShot.count,1);assert.ok(c.wallShot.dodgeSeconds>=.3);assert.ok(c.wallShot.touchRatio>0);assert.equal(c.wallShot.cooldown,5);assert.equal(c.wallShot.duration,3);}
  else assert.equal(c.wallShot,undefined,art);
  if(species==='grasshopper'){assert.equal(c.pattern,'dive');assert.equal(c.dive.count,art.startsWith('elite-')?2:1);}else assert.equal(c.dive,undefined,art);
  if(art==='elite-flat-fur-rat')assert.ok(c.dragOnHit.distance>0);else assert.equal(c.dragOnHit,undefined,art);
  if(species==='flat-fur-rat'||species==='grasshopper'){assert.equal(c.displacedCounter.delay,1);assert.ok(c.displacedCounter.lockSeconds>0);assert.equal(c.displacedCounter.turnRate,undefined);}
  else assert.equal(c.displacedCounter,undefined,art);
 }
 assert.ok(seen.has('mutant-caterpillar') && seen.has('flat-fur-rat'),[...seen].join());
});

test('opening shield beat: pack closes in, shoves the E shield back until the barrier is half raised, then stands ready',()=>{
 const {syncKhangChienOpening,OPENING_SHIELD:S,openingShieldPlacement}=load('src/run/KhangChienStage.ts');
 const s=fresh();s.phase='ready';const shield=openingShieldPlacement();
 const nearest=()=>Math.min(...s.enemies.map(e=>Math.hypot(e.position.x-s.run.player.position.x,e.position.y-s.run.player.position.y)));
 syncKhangChienOpening(s,14);const far=nearest();
 syncKhangChienOpening(s,S.at);assert.ok(nearest()<200,'pack right at the mage\'s back');assert.ok(nearest()<far);
 // The arc curls around the mage; every enemy is pressed against its outside, inside its sweep.
 const fromArc=p=>Math.hypot(p.x-shield.center.x,p.y-shield.center.y);
 assert.ok(fromArc(s.run.player.position)<shield.radius,'mage inside the arc');
 assert.ok(s.enemies.every(e=>fromArc(e.position)>shield.radius+25 && fromArc(e.position)<shield.radius+80),'pack pressed against the outside');
 const base=Math.atan2(shield.facing.y,shield.facing.x);
 assert.ok(s.enemies.every(e=>{let d=Math.atan2(e.position.y-shield.center.y,e.position.x-shield.center.x)-base;d=Math.atan2(Math.sin(d),Math.cos(d));return Math.abs(d)<=shield.halfAngle+.1;}),'covered by the sweep');
 const mage=()=>({...s.run.player.position});
 syncKhangChienOpening(s,S.at+.2);const castPos=mage();syncKhangChienOpening(s,S.castEnd-.01);assert.deepEqual(mage(),castPos,'mage stands still to cast');
 syncKhangChienOpening(s,S.at+.4);const held=s.enemies.map(e=>({...e.position}));
 syncKhangChienOpening(s,S.until-.05);const late=openingShieldPlacement(S.until-.05);
 const moved=Math.hypot(late.center.x-shield.center.x,late.center.y-shield.center.y);
 assert.ok(moved>S.pushDistance*.9,'shield shoved back');assert.ok(late.center.x>shield.center.x,'toward the refuge');
 s.enemies.forEach((e,i)=>{
  const shift=Math.hypot(e.position.x-held[i].x,e.position.y-held[i].y);assert.ok(shift>40 && shift<S.pushDistance+1,'pack presses forward with it');
  assert.ok(Math.hypot(e.position.x-late.center.x,e.position.y-late.center.y)>late.radius+25,'still outside the moving shield');
 });
 assert.ok(nearest()>200,'mage escapes while the shield holds');
 assert.equal(S.until,22,'breaks once the barrier is half raised');
 // Mana: full before the shield, -10% for the shield, drained by the barrier; no regen during the cinematic.
 const mp=()=>s.run.character.resources.currentMp,max=s.run.character.stats.maxMp;
 syncKhangChienOpening(s,S.at-.01);assert.equal(mp(),max);
 syncKhangChienOpening(s,S.at+1);assert.ok(Math.abs(mp()-max*.9)<1e-6);
 syncKhangChienOpening(s,19.9);assert.ok(Math.abs(mp()-max*.9)<1e-6);
 syncKhangChienOpening(s,21.5);assert.equal(mp(),0,'barrier drains all mana');
 syncKhangChienOpening(s,S.readyBy+.1);
 s.enemies.forEach((e,i)=>{assert.equal(e.position.x,1420-100-(i%5)*35);assert.equal(e.position.y,Math.min(1370,410+200+Math.floor(i/5)*42));});
 syncKhangChienOpening(s,24);assert.equal(s.phase,'combat');assert.equal(mp(),0);
 load('src/run/Run.ts').tickRun(s.run,1);assert.ok(mp()>0,'regen starts only once combat runs');
});

test('finale beats: silence after the dragons, celebration with the boss still alive, sudden blast and claw in slow motion',()=>{
 const {khangChienTimeScale}=load('src/run/KhangChienStage.ts');
 const s=bossStage(),boss=s.enemies.find(e=>e.id===s.bossId);ritual(s);chargeTen(s);
 const t=finaleTiming(s);
 assert.ok(t.celebrateAt-t.eightImpactAt>=2.5,'a few quiet seconds');
 assert.ok(t.eightImpactAt<t.celebrateAt && t.celebrateAt<t.revealAt && t.revealAt<t.jumpAt && t.jumpAt<t.beamAt && t.beamAt<t.clawHitAt && t.clawHitAt<t.collapseAt);
 tickKhangChien(s,t.jumpAt-stageAge(s)+.01);assert.equal(boss.actor.resources.currentHp,1,'still clinging to life while they celebrate');assert.equal(khangChienTimeScale(s),1);
 tickKhangChien(s,t.beamAt-stageAge(s)+.01);assert.equal(khangChienTimeScale(s),.2,'explosion runs in slow motion');
 tickKhangChien(s,t.clawHitAt-stageAge(s)+.01);assert.equal(khangChienTimeScale(s),.2,'claw hit still in slow motion');assert.equal(s.phase,'sacrifice');
 tickKhangChien(s,t.offeringAt-stageAge(s)+.01);assert.equal(s.phase,'sacrifice');assert.equal(khangChienTimeScale(s),1,'voluntary offering reads at ordinary cinematic speed');
 tickKhangChien(s,t.collapseAt-stageAge(s)+.01);assert.equal(s.phase,'purification');
});

test('purification unfolds without combat, revival or reinforcement; pauses and finishes exactly once',()=>{
 const {purificationDuration,purificationProgress,stageInteractive}=load('src/run/KhangChienStage.ts');
 const s=bossStage();ritual(s);chargeTen(s);tickKhangChien(s,finaleTiming(s).collapseAt-stageAge(s));
 assert.equal(s.phase,'purification');assert.equal(stageInteractive(s),false);assert.equal(s.run.enemyCombat.enabled,false);
 assert.equal(s.run.character.resources.currentHp,0);assert.equal(s.run.character.resources.currentMp,0);assert.equal(purificationProgress(s),0);
 const clock=s.clock,spawned=s.spawned;tickKhangChien(s,0);assert.equal(s.clock,clock);assert.equal(purificationProgress(s),0);
 tickKhangChien(s,B.purification.riseSeconds+B.purification.waveSeconds/2);assert.equal(purificationProgress(s),.5);
 assert.equal(castKhangChienFinaleQ(s,{x:1,y:1}),false);assert.equal(beginKhangChienSacrifice(s),false);
 khangChienDev(s,'stage-test-ultimate');assert.equal(s.phase,'purification');assert.equal(s.spawned,spawned);
 tickKhangChien(s,purificationDuration()-stageAge(s)-.01);assert.equal(s.phase,'purification');assert.equal(purificationProgress(s),1);
 tickKhangChien(s,.02);assert.equal(s.phase,'complete');const finished=s.clock;tickKhangChien(s,100);assert.equal(s.clock,finished);
 assert.equal(s.run.character.resources.currentHp,0);assert.equal(s.run.character.resources.currentMp,0);
 const replay=fresh();assert.equal(replay.mapIndex,1);assert.equal(purificationProgress(replay),0);assert.equal(replay.run.character.resources.currentHp,3000);
});

test('one large cinematic tick preserves the same cleansing age as many small ticks',()=>{
 const {purificationDuration,purificationProgress}=load('src/run/KhangChienStage.ts');
 const a=bossStage(),b=bossStage();for(const s of [a,b]){ritual(s);chargeTen(s);}
 const duration=finaleTiming(a).collapseAt-stageAge(a)+5;
 tickKhangChien(a,duration);for(let i=0;i<Math.floor(duration*100);i++)tickKhangChien(b,.01);
 tickKhangChien(b,duration-Math.floor(duration*100)/100);
 assert.equal(a.phase,'purification');assert.equal(b.phase,'purification');assert.ok(Math.abs(stageAge(a)-stageAge(b))<1e-8);
 assert.ok(Math.abs(purificationProgress(a)-purificationProgress(b))<1e-8);
 tickKhangChien(a,purificationDuration()-stageAge(a)+.01);assert.equal(a.phase,'complete');
});

test('water darkens monotonically, interpolates on map renewal and leaves characters and enemy cues alone',()=>{
 const {stageWaterTint,isStageWaterTexture,KhangChienWaterTint}=load('src/presentation/phaser/KhangChienWaterTint.ts');
 const colors=[1,2,3,4].map(i=>stageWaterTint(i));
 const luminance=color=>((color>>16)&255)*.2126+((color>>8)&255)*.7152+(color&255)*.0722;
 for(let i=1;i<colors.length;i++)assert.ok(luminance(colors[i])<luminance(colors[i-1]));
 assert.ok(luminance(colors[3])>75,'final water must retain readable highlights');
 assert.equal(stageWaterTint(2,1),colors[2]);assert.ok(luminance(stageWaterTint(2,.5))<luminance(colors[1]));
 for(const key of ['water-projectile','water-orb-3','dragon-key-5','stage-water-prison','eight-dragon-pose-3'])assert.equal(isStageWaterTexture(key),true);
 for(const key of ['water-charge','water-q-command','mage-idle-down-0','stage-boss-bomb','khang-stage-map-4'])assert.equal(isStageWaterTexture(key),false);
 const object=key=>({type:'Image',texture:{key},tintFill:false,tintTopLeft:0xffffff,tintTopRight:0xffffff,tintBottomLeft:0xffffff,tintBottomRight:0xffffff,
  setTint(a,b=a,c=a,d=a){[this.tintTopLeft,this.tintTopRight,this.tintBottomLeft,this.tintBottomRight]=[a,b,c,d];return this;},
  setTintFill(...colors){this.tintFill=true;return this.setTint(...colors);}});
 const water=object('water-orb-3'),mage=object('mage-idle-down-0'),tinter=new KhangChienWaterTint();
 tinter.apply([water,mage],colors[3]);const tint=water.tintTopLeft;for(let i=0;i<100;i++)tinter.apply([water,mage],colors[3]);
 assert.equal(water.tintTopLeft,tint,'no progressive multiplication on repeated frames');assert.equal(mage.tintTopLeft,0xffffff);
 water.setTint(0xcaffff);tinter.apply([water],colors[2]);assert.notEqual(water.tintTopLeft,tint,'a new impact flash retains its own base color');
 tinter.apply([water],0xffffff);assert.equal(water.tintTopLeft,0xcaffff,'returning to neutral restores the authored color');
});

test('opening assault: the moment the barrier stands the pack winds up on it, locked even once the mage steps out',()=>{
 const {syncKhangChienOpening}=load('src/run/KhangChienStage.ts');
 const s=fresh();s.phase='ready';syncKhangChienOpening(s,24);assert.equal(s.phase,'combat');
 const opening=s.enemies.slice(0,B.openingEnemies),ctl=e=>s.run.enemyCombat.controllers.find(c=>c.id===e.id);
 for(const e of opening){
  const c=ctl(e),species=e.monsterArtId.replace(/^elite-/,'');
  assert.equal(c.phase,'windup');assert.equal(c.targetId,s.barrier.body.id);assert.ok(c.lockedTarget);
  if(species==='flat-fur-rat'||species==='grasshopper'){assert.equal(c.ability,'charge');assert.ok(c.lungeRange>0);}
  else assert.notEqual(c.ability,'charge');
 }
 // Stepping out does not save the barrier by itself: the wound-up attacks keep their target.
 s.run.player.position={x:1700,y:620};tickRun(s.run,.1);tickKhangChien(s,.1);
 assert.ok(opening.every(e=>ctl(e).targetId===s.barrier.body.id));
 for(let t=0;t<4 && s.phase!=='failed';t+=1/60){tickRun(s.run,1/60);tickKhangChien(s,1/60);}
 assert.equal(s.phase,'failed','unblocked, the assault breaks the barrier');assert.equal(s.failureReason,'barrier');
});

test('stage cannon deals half damage; ordinary runs keep full damage',()=>{
 const {createWaterCannonAttack,waterCannonDamage}=load('src/gameplay/characters/jobs/mage/WaterCannonCombat.ts');
 const s=fresh(),m=s.run.character;
 assert.equal(createWaterCannonAttack(m,1).rawDamage,waterCannonDamage(m.stats.atk,1)*.5);
 const buff=m.waterSkills.encounterBuff;m.waterSkills.encounterBuff=undefined;
 assert.equal(createWaterCannonAttack(m,1).rawDamage,waterCannonDamage(m.stats.atk,1));m.waterSkills.encounterBuff=buff;
});

test('casting E while READY heals the mage 5% of max HP; a plain E does not',()=>{
 const s=fresh();battle(s);const m=s.run.character;
 m.resources.currentHp=1000;m.mach=4;m.waterSkills.cooldowns.e=0;
 assert.equal(castWaterE(waterCtx(s),undefined,{x:1200,y:750}).ok,true);
 assert.equal(m.resources.currentHp,1000+m.stats.maxHp*.05);
 assert.ok(m.waterSkills.events.some(e=>e.kind==='ready-heal' && e.amount===m.stats.maxHp*.05));
 const plain=fresh();battle(plain);const p=plain.run.character;p.resources.currentHp=1000;p.mach=0;p.waterSkills.cooldowns.e=0;
 assert.equal(castWaterE(waterCtx(plain)).ok,true);assert.equal(p.resources.currentHp,1000);
});

test('stage R: 1s phase walks through enemies, sheds crowd control and cannot be targeted; 20s cooldown',()=>{
 const {castRunR,moveRunPlayer,playerPhasing,playerSlowMultiplier}=load('src/run/Run.ts');const {MOVEMENT_PREVIEW}=load('src/config/movement.ts');
 const s=fresh();battle(s);s.run.zone.objects=[];const m=s.run.character;
 s.run.player.position={x:1000,y:900};s.run.player.slows.push({sourceId:'enemy-root:x',multiplier:0,expiresAt:s.run.time+5});
 const blocker=s.enemies[0];blocker.position={x:1040,y:900};blocker.actor.resources.currentHp=blocker.actor.stats.maxHp=1e9;
 for(const e of s.enemies.slice(1))e.position={x:3000,y:3000};
 assert.equal(castRunR(s.run).ok,true);
 assert.ok(playerPhasing(s.run));assert.equal(playerSlowMultiplier(s.run),1,'root and slows shed');
 assert.ok(Math.abs(m.waterSkills.cooldowns.r-(s.run.time+20))<1e-9,'20s cooldown');
 moveRunPlayer(s.run,{x:1,y:0},.6,MOVEMENT_PREVIEW);assert.ok(s.run.player.position.x>1080,'walks straight through the enemy');
 tickRun(s.run,.05);assert.ok(s.run.enemyCombat.controllers.every(c=>c.targetId!==m.id),'nobody can pick the mage');
 tickRun(s.run,1);assert.ok(!playerPhasing(s.run),'phase ends after 1s');
});

test('boss no longer shoots: each time it surfaces, 5 random elites burst out around it',()=>{
 const s=bossStage(),boss=s.enemies.find(e=>e.id===s.bossId),ctl=s.run.enemyCombat.controllers.find(c=>c.id===boss.id);
 s.run.player.position={x:boss.position.x+300,y:boss.position.y};s.events.length=0;
 let emergeAt,summon,shots=0;
 for(let t=0;t<4 && !summon;t+=1/60){
  tickRun(s.run,1/60);shots=Math.max(shots,s.run.enemyCombat.shots.filter(x=>x.ownerId===boss.id).length);
  if(ctl.boss?.emergeAt)emergeAt={...ctl.boss.emergeAt};
  tickKhangChien(s,1/60);summon=s.events.find(e=>e.kind==='summon');
 }
 assert.ok(summon,'surfaced and summoned');assert.equal(summon.positions.length,5,'five elites per surfacing');assert.equal(shots,0,'no volleys');
 for(const p of summon.positions){
  assert.ok(Math.hypot(p.x-emergeAt.x,p.y-emergeAt.y)<140,'around the emerge spot');
  assert.ok(s.enemies.some(e=>e.rank==='elite' && Math.hypot(e.position.x-p.x,e.position.y-p.y)<1),'an elite stands there');
 }
});

test('the mage\'s Water Cannon passes through the water barrier; enemy shots are still blocked',()=>{
 const {fireRunProjectile,tickRunProjectiles}=load('src/run/Run.ts');
 const s=fresh();battle(s);
 const wall=s.run.zone.objects.find(o=>o.resource==='water-barrier');assert.ok(wall,'barrier is up');
 const p=wall.shape.points,mid={x:wall.x+(p[0].x+p[2].x)/2,y:wall.y+(p[0].y+p[2].y)/2};
 const e=s.enemies[0];e.position={x:mid.x,y:mid.y+90};e.actor.resources.currentHp=e.actor.stats.maxHp=1e9;
 for(const o of s.enemies.slice(1))o.position={x:5000,y:5000};
 const shot=fireRunProjectile(s.run,'through',{x:mid.x,y:mid.y-60},{x:0,y:1},{speed:400,radius:8,range:400,chargeRatio:1,isFullCharge:true});
 const impacts=[];for(let t=0;t<.6;t+=.02)impacts.push(...tickRunProjectiles(s.run,.02,[e],()=>.99));
 assert.ok(!impacts.some(i=>i.type==='obstacle'),'not stopped by the barrier');assert.ok(impacts.some(i=>i.type==='enemy' && i.hit.targetId===e.id),'hits the enemy beyond it');
 void shot;
});
