const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const load = require('./load-ts.cjs')();
const { MONSTER_ART:ALL_ART } = load('src/presentation/phaser/MonsterTextures.ts');
const MONSTER_ART=ALL_ART.filter(a=>!a.id.startsWith('elite-')&&!a.id.startsWith('boss-'));
const { createSandboxMonsters, MONSTER_TEST_TUNING } = load('src/dev/sandbox/monsters.ts');
const { validBody } = load('src/gameplay/combat/CombatBody.ts');

test('Ue Mach atlases contain six separated alpha silhouettes and select correct rank/attack frames',async()=>{
 const sharp=require('sharp');const {UE_MONSTER_FAMILIES,ueMonsterKey,ueIdleFrame,uePoseFrame}=load('src/presentation/phaser/UeMonsterTextures.ts');
 assert.equal(UE_MONSTER_FAMILIES.length,7);
 for(const family of UE_MONSTER_FAMILIES){
  const {data,info}=await sharp(`public/assets/monsters/ue-mach-v1/${family}-sheet.png`).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert.equal(info.width%3,0);assert.equal(info.height%2,0);
  let transparent=0;for(let i=3;i<data.length;i+=4)transparent+=data[i]===0;
  assert.ok(transparent>info.width*info.height*.5,'atlas has actual transparent padding');
  for(let cell=0;cell<6;cell++){
   const x0=cell%3*info.width/3,x1=(cell%3+1)*info.width/3,y0=Math.floor(cell/3)*info.height/2,y1=(Math.floor(cell/3)+1)*info.height/2;
   let visible=0,edge=0;
   const occupied=(x,y)=>x>=0&&x<info.width&&y>=0&&y<info.height&&data[(y*info.width+x)*4+3]>=24;
   for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(occupied(x,y)){visible++;
    if(x===x0&&occupied(x-1,y)||x===x1-1&&occupied(x+1,y)||y===y0&&occupied(x,y-1)||y===y1-1&&occupied(x,y+1))edge++;
   }
   assert.ok(visible>1000,`${family}/${cell} contains a full creature`);assert.equal(edge,0,`${family}/${cell} must not bleed across a frame boundary`);
  }
  assert.equal(ueMonsterKey('elite-'+family),ueMonsterKey(family));
 }
 assert.equal(ueIdleFrame('elite-crop-snail'),'elite-idle');assert.equal(uePoseFrame('elite-crop-snail','windup'),'elite-windup');
 assert.equal(uePoseFrame('crop-snail','lunge'),'normal-attack');assert.equal(uePoseFrame('boss-spiked-shell-beast','chase','roll-warning'),'roll');
 assert.equal(uePoseFrame('boss-spiked-shell-beast','chase','underground'),'dig');
});

test('six monster assets create independent living enemies using the shared element policy', () => {
  const enemies = createSandboxMonsters({ x: 660, y: 800 }, MONSTER_ART, () => 0);
  assert.equal(enemies.length, 6);
  assert.equal(new Set(enemies.map(e => e.id)).size, 6);
  for (const enemy of enemies) {
    assert.ok(validBody(enemy));
    assert.equal(enemy.actor.team, 'enemy');
    assert.equal(enemy.actor.resources.currentHp, MONSTER_TEST_TUNING.hp);
    assert.equal(enemy.actor.element, enemies[0].actor.element);
    assert.equal(enemy.radius, MONSTER_TEST_TUNING.radius);
    assert.ok(fs.existsSync(`public/assets/monsters/${enemy.monsterArtId}/normal.png`));
    const art = MONSTER_ART.find(a => a.id === enemy.monsterArtId);
    assert.ok(fs.existsSync(`public/assets/monsters/${art.id}/${art.pose}.png`));
    const png=fs.readFileSync(`public/assets/monsters/${art.id}/${art.pose}.png`);
    assert.ok(art.body.x>=0 && art.body.y>=0 && art.body.x+art.body.width<=png.readUInt32BE(16) && art.body.y+art.body.height<=png.readUInt32BE(20),'body metadata must fit the actual supplied attack artwork');
  }
  enemies[0].actor.resources.currentHp = 0;
  assert.equal(validBody(enemies[0]), false);
  assert.equal(validBody(enemies[1]), true);
  assert.equal(createSandboxMonsters({ x: 660, y: 800 }, MONSTER_ART, () => 0)[0].actor.resources.currentHp, MONSTER_TEST_TUNING.hp);
});

test('each sandbox monster rolls its own element once at spawn; later combat does not reroll it', () => {
  const rolls=[.01,.21,.41,.61,.81,.01];let calls=0;
  const enemies=createSandboxMonsters({x:660,y:800},MONSTER_ART,()=>rolls[calls++]);
  assert.equal(calls,6);
  assert.deepEqual(Array.from(enemies,enemy=>enemy.actor.element),['metal','wood','water','fire','earth','metal']);
  enemies[0].actor.resources.currentHp-=10;
  assert.equal(enemies[0].actor.element,'metal');assert.equal(calls,6);
});

test('elite and boss playtest actors have independent resources and supplied artwork paths exist',()=>{
 const {ELITE_ENEMIES}=load('src/config/balance/eliteEnemies.ts');
 const arts=ALL_ART.filter(a=>ELITE_ENEMIES[a.id]);assert.equal(arts.length,7);
 const enemies=createSandboxMonsters({x:660,y:800},arts,()=>0);
 for(const [i,art] of arts.entries()){
   assert.equal(enemies[i].actor.resources.currentHp,ELITE_ENEMIES[art.id].hp);
   for(const pose of new Set(['normal',art.pose])){
     const file=art.frames?'pose-sheet':pose==='normal'?art.normalPose??'normal':pose;
     const png=fs.readFileSync(`public/assets/monsters/${art.directory}/${file}.png`);
     const rect=art.frames?(pose==='normal'?art.frames.normal:art.frames.attack):art.body;
     assert.ok(rect.x+rect.width<=png.readUInt32BE(16)&&rect.y+rect.height<=png.readUInt32BE(20));
   }
 }
 assert.equal(enemies.at(-1).actor.element,'earth');
 enemies[0].actor.resources.currentHp=0;assert.ok(validBody(enemies[1]));
});
