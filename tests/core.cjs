const { test } = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-ts.cjs')();
const { createMage, allocateMagePotential, grantMageExperience, setMageModifierPolicy } = load('src/gameplay/characters/jobs/mage/MageRuntime.ts');
const { mageBaseStats, deriveMageStats } = load('src/gameplay/characters/jobs/mage/MageStats.ts');
const { createPotential, allocatePotential, grantPotential, validatePotential } = load('src/gameplay/characters/core/Potential.ts');
const { heal, restoreResource, regenerateMp, preserveRatio, applyHpDamage } = load('src/gameplay/characters/core/CharacterResources.ts');
const { elementRelation, elementMultiplier, ELEMENTS } = load('src/gameplay/combat/Element.ts');
const { resolveDamage, resolveDefense } = load('src/gameplay/combat/Damage.ts');
const { actorTargetAllowed, validateTarget } = load('src/gameplay/combat/Targeting.ts');
const { spawnEnemyElement } = load('src/gameplay/enemies/EnemyElement.ts');
const { createProgression, gainExperience } = load('src/gameplay/progression/Level.ts');
const { createRun, createVillageZone, finishRun, tickRun, allocateRunPotential, awardRunExperience, spawnRunEnemy, moveRunPlayer } = load('src/run/Run.ts');
const { validateStats } = load('src/gameplay/characters/core/CharacterStats.ts');
const mage = (id='p', team='players', element='water') => createMage(id, team, element, 150);
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);
// Test-only EXP policy is a fixture, not production balance.
const expFixture = () => 10;
function awardPoints(actor, points=5) { actor.progression.potential = grantPotential(actor.progression.potential, points); }
function request(source, target, element='water', extra={}) {
  return { source, target, element, rawDamage: 20, canCrit: false, targetPolicy: 'ENEMY',
    hit: { kind:'projectile', sourceId:source.id, targetId:target.id }, ...extra };
}

test('Mage bases and all five potential formulas match V0.1 without drift', () => {
  const base = mageBaseStats(150);
  assert.equal(base.maxHp,140); assert.equal(base.maxMp,160); assert.equal(base.atk,12);
  assert.equal(base.def,8); assert.equal(base.mpRegen,2); assert.equal(base.attackInterval,1.4);
  assert.equal(base.critChance,.05); assert.equal(base.critDamage,1.5);
  for(const key of ['strength','dexterity','spirit','vitality','luck']) {
    const p = allocatePotential(grantPotential(createPotential(),1),key,1);
    const s = deriveMageStats(base,p);
    if(key==='strength') assert.equal(JSON.stringify(s),JSON.stringify(base));
    if(key==='dexterity'){near(s.def,8.4);assert.equal(s.attackSpeedRating,1);near(s.attackInterval,1.4/1.01);}
    if(key==='spirit'){near(s.atk,12.5);assert.equal(s.maxMp,164);near(s.mpRegen,2.04);}
    if(key==='vitality')assert.equal(s.maxHp,146);
    if(key==='luck')near(s.critChance,.05+.45/76);
    assert.equal(JSON.stringify(deriveMageStats(base,p)),JSON.stringify(s));
  }
  const p=allocatePotential(grantPotential(createPotential(),1000),'dexterity',1000);
  assert.equal(deriveMageStats(base,p).attackInterval,.65);
});
test('Potential budget rejects invalid inputs atomically and has no individual cap', () => {
  const state=grantPotential(createPotential(),70), before=JSON.stringify(state);
  for(const amount of [-1,0,.5,NaN,Infinity,71]) assert.throws(()=>allocatePotential(state,'spirit',amount));
  assert.throws(()=>allocatePotential(state,'evasion',1));
  assert.equal(JSON.stringify(state),before);
  assert.equal(allocatePotential(state,'spirit',70).allocation.spirit,70);
  assert.throws(()=>validatePotential({...state,unspent:69}));
  assert.throws(()=>grantPotential(state,Number.MAX_SAFE_INTEGER));
  assert.equal(createPotential().earned,0);
});
test('Allocation preserves HP/MP ratios without creating another offensive stat', () => {
  const a=mage();awardPoints(a);a.resources.currentHp=70;a.resources.currentMp=40;
  allocateMagePotential(a,'spirit',1);near(a.resources.currentMp,41);assert.equal(a.stats.maxMp,164);near(a.stats.atk,12.5);
  allocateMagePotential(a,'vitality',1);near(a.resources.currentHp,73);
  assert.equal(a.baseStats.maxMp,160);assert.equal(a.baseStats.maxHp,140);
  const before=JSON.stringify(a);assert.throws(()=>allocateMagePotential(a,'spirit',99));assert.equal(JSON.stringify(a),before);
  assert.equal(preserveRatio(0,0,100),100);assert.equal(preserveRatio(100,50,25),25);
  assert.equal(preserveRatio(0,100,200),0);
});
test('Modifier policy rederives resources and removing it restores source values', () => {
  const a=mage();a.resources.currentMp=80;
  setMageModifierPolicy(a,s=>({...s,maxMp:s.maxMp+40,mpRegen:s.mpRegen+1}));
  assert.equal(a.resources.currentMp,100);assert.equal(a.stats.maxMp,200);assert.equal(a.stats.atk,12);
  setMageModifierPolicy(a);assert.equal(a.resources.currentMp,80);assert.equal(a.stats.mpRegen,2);
  const before=JSON.stringify(a);assert.throws(()=>setMageModifierPolicy(a,s=>({...s,maxHp:NaN})));assert.equal(JSON.stringify(a),before);
});
test('MP regen is time based and clamped, with no passive HP regen', () => {
  const a=mage();a.resources.currentHp=30;a.resources.currentMp=159;
  assert.equal(regenerateMp(a,2),1);assert.equal(a.resources.currentMp,160);assert.equal(a.resources.currentHp,30);
  a.resources.currentMp=0;regenerateMp(a,.25);near(a.resources.currentMp,.5);
  assert.throws(()=>regenerateMp(a,-1));assert.throws(()=>regenerateMp(a,Infinity));
});
test('Healing supports self and ally/effect targets, clamps, never revives', () => {
  const self=mage(),ally=mage('ally');self.resources.currentHp=100;ally.resources.currentHp=50;
  assert.equal(heal(self,20),20);assert.equal(heal(ally,200),90);assert.equal(ally.resources.currentHp,140);
  applyHpDamage(ally,200);assert.equal(ally.resources.currentHp,0);assert.equal(heal(ally,200),0);
  assert.throws(()=>heal(self,-1));assert.throws(()=>heal(self,NaN));
});
test('Resource restore targets another actor and supports explicit non-MP pools', () => {
  const ally=mage('ally');ally.resources.currentMp=30;assert.equal(restoreResource(ally,'mp',25),25);assert.equal(ally.resources.currentMp,55);
  ally.resources.currentMp=150;assert.equal(restoreResource(ally,'mp',25),10);
  ally.resources.additional.rage={current:90,max:100};assert.equal(restoreResource(ally,'rage',25),10);
  assert.throws(()=>restoreResource(ally,'unknown',10));assert.throws(()=>restoreResource(ally,'hp',10));
  assert.throws(()=>restoreResource(ally,'mp',Infinity));
});
test('Element resolver covers both entire cycles and reverse relations', () => {
  for(const [a,b] of [['wood','earth'],['earth','water'],['water','fire'],['fire','metal'],['metal','wood']]) {
    assert.equal(elementRelation(a,b),'overcomes');assert.equal(elementRelation(b,a),'overcomeBy');
    assert.equal(elementMultiplier(elementRelation(a,b)),1.25);assert.equal(elementMultiplier(elementRelation(b,a)),.8);
  }
  for(const [a,b] of [['wood','fire'],['fire','earth'],['earth','metal'],['metal','water'],['water','wood']]) {
    assert.equal(elementRelation(a,b),'generates');assert.equal(elementRelation(b,a),'generatedBy');assert.equal(elementMultiplier(elementRelation(a,b)),1);
  }
  for(const a of ELEMENTS)assert.equal(elementRelation(a,a),'same');
  assert.throws(()=>elementRelation('neutral','water'));
});
test('Damage uses attack element independently of source element; both sides share pipeline', () => {
  for(const [attack,defender,mult] of [['water','fire',1.25],['fire','water',.8],['earth','water',1.25],['water','earth',.8],['water','wood',1]]) {
    const player=mage('p','players','earth'),enemy=mage('e','enemies',defender);
    const result=resolveDamage(request(player,enemy,attack),{random:()=>.9});
    near(result.finalDamage,(20 * 50 / 58)*mult);near(result.appliedDamage,result.finalDamage);
    const reverseSource=mage('e','enemies','earth'),reverseTarget=mage('p','players',defender);
    const reverse=resolveDamage(request(reverseSource,reverseTarget,attack),{random:()=>.9});
    assert.equal(JSON.stringify(result),JSON.stringify(reverse));
  }
});
test('Crit precedes DEF, elements follow DEF, lethal HP clamps and reports actual damage', () => {
  const a=mage(),b=mage('e','enemies','fire');b.resources.currentHp=5;b.stats.def=20;
  const result=resolveDamage(request(a,b,'water',{rawDamage:100/1.5,canCrit:true}),{random:()=>0});
  near(result.afterCrit,100);near(result.afterDef,71.42857142857143);near(result.finalDamage,89.28571428571429);
  assert.equal(result.appliedDamage,5);assert.equal(result.killed,true);assert.equal(b.resources.currentHp,0);
});
test('No physical hit means no damage or crit RNG', () => {
  const a=mage(),b=mage('e','enemies');const forbidden=()=>{throw Error('Must not run');};
  const r=resolveDamage(request(a,b,'water',{hit:null,canCrit:true}),{random:forbidden});
  assert.equal(r.hit,false);assert.equal(b.resources.currentHp,140);
  assert.throws(()=>resolveDamage(request(a,b,'water',{hit:{kind:'projectile',sourceId:'wrong',targetId:b.id}}),{random:()=>.9}));
});
test('Damage rejects invalid element/DEF and RNG without HP mutation', () => {
  const a=mage(),b=mage('e','enemies');const req=request(a,b);
  for(const def of [-1,NaN,Infinity]) { b.stats.def=def; assert.throws(()=>resolveDamage(req,{random:()=>.9})); }
  b.stats.def=8;
  assert.throws(()=>resolveDamage({...req,element:undefined},{random:()=>.9}));
  assert.throws(()=>resolveDamage({...req,canCrit:true},{random:()=>1}));
  assert.equal(b.resources.currentHp,140);
});

test('DEF V0.1 preserves damage at zero and uses diminishing returns without rounding', () => {
  const zero=resolveDefense(100,0);assert.equal(zero.reduction,0);assert.equal(zero.damageAfterDef,100);
  const defended=resolveDefense(100,20);near(defended.damageAfterDef,71.42857142857143);
  near(defended.reduction,20/70);near(defended.damageAfterDef,100*(1-defended.reduction));
});
test('Targeting is reusable for support and does not certify hits', () => {
  const a=mage(),ally=mage('ally'),enemy=mage('e','enemies');
  assert.equal(actorTargetAllowed(a,a,'SELF'),true);assert.equal(actorTargetAllowed(a,ally,'ALLY'),true);
  assert.equal(actorTargetAllowed(a,enemy,'ENEMY'),true);assert.equal(actorTargetAllowed(a,ally,'ENEMY'),false);
  assert.equal(actorTargetAllowed(a,enemy,'ALLY_OR_ENEMY'),true);
  assert.equal(validateTarget(a,{mode:'GROUND',point:{x:20,y:30}}),true);
  assert.equal(validateTarget(a,{mode:'DIRECTION',direction:{x:0,y:0}}),false);
  assert.equal(validateTarget(a,{mode:'DIRECTION',direction:{x:-1,y:0}}),true);
  const result=resolveDamage(request(a,ally),{random:()=>.9});assert.equal(result.hit,false);
});
test('Enemy spawn rolls all five elements once, accepts authority and preserves boss definition', () => {
  for(const rank of ['normal','elite']) for(let i=0;i<5;i++)assert.equal(spawnEnemyElement('e',{rank},{random:()=>i/5}).element,ELEMENTS[i]);
  let calls=0;const enemy=spawnEnemyElement('e',{rank:'normal'},{random:()=>{calls++;return .1;}});assert.equal(calls,1);assert.equal(enemy.element,'metal');
  const noRoll=()=>{throw Error('Should not roll');};
  assert.equal(spawnEnemyElement('e',{rank:'elite'},{random:noRoll,authoritativeElement:'water'}).element,'water');
  assert.equal(spawnEnemyElement('b',{rank:'boss',element:'earth'},{random:noRoll}).element,'earth');
  assert.throws(()=>spawnEnemyElement('b',{rank:'boss',element:'earth'},{random:noRoll,authoritativeElement:'fire'}));
  assert.throws(()=>spawnEnemyElement('e',{rank:'normal'},{random:()=>1}));
});
test('Level rewards handle multiple levels and Lv15 budget with initial five points', () => {
  const state=createProgression(),next=gainExperience(state,145,expFixture);
  assert.equal(next.level,15);assert.equal(next.exp,0);assert.equal(next.potential.earned,75);assert.equal(next.potential.unspent,75);assert.equal(next.skillPoints,14);
  assert.equal(state.level,1);assert.equal(state.potential.earned,5);
  const capped=gainExperience(next,100,expFixture);assert.equal(capped.potential.earned,75);assert.equal(capped.skillPoints,14);
  for(const invalid of [()=>0,()=>NaN,()=>-1])assert.throws(()=>gainExperience(state,20,invalid));
  assert.throws(()=>gainExperience(state,-1,expFixture));
});
test('Runtime XP and allocation are atomic if derivation fails', () => {
  const a=mage();grantMageExperience(a,10,expFixture);assert.equal(a.progression.level,2);
  a.modifierPolicy=()=>{throw Error('Invalid modifier');};const before=JSON.stringify(a);
  assert.throws(()=>allocateMagePotential(a,'spirit',1));assert.equal(JSON.stringify(a),before);
  assert.throws(()=>grantMageExperience(a,10,expFixture));assert.equal(JSON.stringify(a),before);
});
test('Mage Run integrates resources/progression, resets by new ownership, excludes meta', () => {
  const options={element:'water',moveSpeed:150},a=createRun('a',createVillageZone(),options);
  a.character.resources.currentMp=0;a.character.resources.currentHp=70;tickRun(a,1);assert.equal(a.character.resources.currentMp,2);assert.equal(a.character.resources.currentHp,70);
  awardRunExperience(a,10,expFixture);allocateRunPotential(a,'spirit',1);assert.equal(a.character.stats.maxMp,164);
  assert.equal(a.progression,a.character.progression);assert.equal(a.progression.level,2);
  a.character.progression.evolutionChoices.example='test-only';setMageModifierPolicy(a.character,s=>({...s,atk:s.atk+1}));
  spawnRunEnemy(a,'enemy',{rank:'elite'},{random:()=>.5});assert.throws(()=>spawnRunEnemy(a,'enemy',{rank:'normal'},{random:()=>0}));
  const b=createRun('b',createVillageZone(),options);assert.equal(b.character.progression.level,1);assert.equal(b.character.progression.exp,0);
  assert.equal(b.character.progression.potential.earned,5);assert.equal(b.character.progression.skillPoints,0);
  assert.equal(Object.keys(b.character.progression.evolutionChoices).length,0);assert.equal(b.character.modifierPolicy,undefined);
  assert.equal(b.character.resources.currentHp,140);assert.equal(b.character.resources.currentMp,160);assert.equal(b.enemies.length,0);
  assert.ok(!('account' in b));finishRun(a);const before=JSON.stringify(a);tickRun(a,1);assert.equal(JSON.stringify(a),before);
  const basic=createRun('basic',createVillageZone());assert.equal(basic.progression.level,1);assert.equal(basic.progression.potential.earned,5);
  assert.throws(()=>allocateRunPotential(a,'spirit',1));assert.throws(()=>awardRunExperience(a,10,expFixture));
  moveRunPlayer(b,{x:1,y:0},1,{speed:999,radius:12});assert.equal(b.player.position.x,810);
});
test('Forbidden and incomplete stats cannot enter the common stat boundary', () => {
  const base=mageBaseStats(150);
  for(const key of ['accuracy','evasion','hpRegen','physicalDamage','magicDamage','neutralDamage','physicalDefense','magicDefense','elementDamageBonus','elementResistance'])assert.throws(()=>validateStats({...base,[key]:1}));
  const incomplete={...base};delete incomplete.atk;assert.throws(()=>validateStats(incomplete));
});

test('Every physical hit kind uses the same resolver; dead actors cannot deal or receive damage', () => {
  const a=mage(),b=mage('e','enemies');
  for(const kind of ['projectile','hitbox','aoe']) {
    const r=resolveDamage(request(a,b,'water',{hit:{kind,sourceId:a.id,targetId:b.id}}),{random:()=>.5});
    assert.equal(r.hit,true);near(r.finalDamage,20 * 50 / 58);
  }
  a.resources.currentHp=0;
  const r=resolveDamage(request(a,b),{random:()=>{throw Error('Dead source must not roll');}});
  assert.equal(r.hit,false);
});
test('Crit threshold is strict and does not add a second miss roll', () => {
  const a=mage(),b=mage('e','enemies');let calls=0;
  const r=resolveDamage(request(a,b,'water',{canCrit:true}),{random:()=>{calls++;return .05;}});
  assert.equal(calls,1);assert.equal(r.critical,false);assert.equal(r.hit,true);
});
test('Invalid current resources cannot poison HP/resource mutations', () => {
  const a=mage();a.resources.currentHp=NaN;
  assert.throws(()=>heal(a,10));assert.throws(()=>restoreResource(a,'mp',10));
  a.resources.currentHp=140;a.resources.currentMp=161;
  assert.throws(()=>regenerateMp(a,1));
});
