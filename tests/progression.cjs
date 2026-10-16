const {test}=require('node:test');
const assert=require('node:assert/strict');
const load=require('./load-ts.cjs')();
const {createProgression,gainExperience,experienceRequired}=load('src/gameplay/progression/Level.ts');
const {evolutionProgress,chooseEvolution}=load('src/gameplay/progression/Evolution.ts');
const {WATER_MAGE_EVOLUTION}=load('src/gameplay/characters/jobs/mage/WaterMageEvolution.ts');
const {createRun,createVillageZone,awardRunExperience,allocateRunPotential}=load('src/run/Run.ts');

test('real EXP curve rewards exactly 75 total points and stops at level 15',()=>{
  let state=createProgression();assert.equal(state.potential.unspent,5);
  let total=0;
  for(let level=1;level<15;level++){
    const cost=experienceRequired(level);assert.equal(cost,20+(level-1)*10);total+=cost;
    state=gainExperience(state,cost-1);assert.equal(state.level,level);
    state=gainExperience(state,1);assert.equal(state.level,level+1);assert.equal(state.exp,0);
    assert.equal(state.potential.earned,5*(level+1));
  }
  assert.equal(total,1190);assert.equal(experienceRequired(15),0);
  assert.equal(JSON.stringify(gainExperience(state,100000)),JSON.stringify(state));
  assert.equal(gainExperience(createProgression(),100000).potential.earned,75);
});
test('starting allocation and leveling preserve resources and fresh run owns five new points',()=>{
  const run=createRun('progression',createVillageZone(),{element:'water',moveSpeed:150});
  run.character.resources.currentHp=70;run.character.resources.currentMp=80;
  allocateRunPotential(run,'spirit',5);
  assert.equal(run.progression.potential.unspent,0);assert.equal(run.character.stats.atk,14.5);
  assert.equal(run.character.resources.currentMp,90);assert.equal(run.character.resources.currentHp,70);
  awardRunExperience(run,50);assert.equal(run.progression.level,3);assert.equal(run.progression.potential.unspent,10);
  assert.equal(run.character.resources.currentMp,90);assert.equal(run.character.resources.currentHp,70);
  const fresh=createRun('fresh',createVillageZone(),{element:'water',moveSpeed:150});
  assert.equal(fresh.progression.potential.unspent,5);assert.equal(fresh.progression.potential.allocation.spirit,0);
});
test('prepared Mage milestones cannot grant unimplemented gameplay or consume points',()=>{
  const state=gainExperience(createProgression(),1190),before=JSON.stringify(state);
  assert.equal(WATER_MAGE_EVOLUTION.map(m=>m.level).join(','),'5,7,9,11,13,15');
  assert.equal(evolutionProgress(state,WATER_MAGE_EVOLUTION)[0].status,'ready');
  for(const m of WATER_MAGE_EVOLUTION)for(const o of m.options){
    if(!o.implemented)assert.throws(()=>chooseEvolution(state,WATER_MAGE_EVOLUTION,m.level,o.id));
  }
  assert.equal(JSON.stringify(state),before);
});
test('future evolution catalog enforces ordered levels, branch and path without mutation on rejection',()=>{
  const catalog=WATER_MAGE_EVOLUTION.map(m=>({...m,options:m.options.map(o=>({...o,implemented:true}))}));
  let state=createProgression();assert.throws(()=>chooseEvolution(state,catalog,5,'core-long'));
  state=gainExperience(state,1190);const before=JSON.stringify(state);
  assert.throws(()=>chooseEvolution(state,catalog,7,'a1-7'));assert.equal(JSON.stringify(state),before);
  state=chooseEvolution(state,catalog,5,'core-ho');
  assert.throws(()=>chooseEvolution(state,catalog,5,'core-long'));
  assert.throws(()=>chooseEvolution(state,catalog,7,'b1-7'));
  state=chooseEvolution(state,catalog,7,'a1-7');
  assert.throws(()=>chooseEvolution(state,catalog,9,'b1-9'));
  assert.throws(()=>chooseEvolution(state,catalog,15,'a1-15'));
  for(const level of [9,11,13,15])state=chooseEvolution(state,catalog,level,`a1-${level}`);
  assert.equal(state.evolutionChoices['15'],'a1-15');assert.equal(state.potential.unspent,75);assert.equal(state.skillPoints,14);
  assert.equal(Object.keys(createProgression().evolutionChoices).length,0);
});

test('A2 and B2 stay locked at every milestone even when effects exist; A1 and B1 remain available',()=>{
  const catalog=WATER_MAGE_EVOLUTION.map(m=>({...m,options:m.options.map(o=>({...o,implemented:true}))}));
  for(const [active,locked,core] of [['a1','a2','core-ho'],['b1','b2','core-long']]){
    let state=chooseEvolution(gainExperience(createProgression(),1190),catalog,5,core);
    for(const level of [7,9,11,13,15]){
      const id=`${locked}-${level}`,before=JSON.stringify(state);
      assert.equal(catalog.find(m=>m.level===level).options.find(o=>o.id===id).locked,true);
      assert.throws(()=>chooseEvolution(state,catalog,level,id));assert.equal(JSON.stringify(state),before);
      assert.ok(!evolutionProgress(state,catalog).find(m=>m.level===level).options.some(o=>o.id===id));
      state=chooseEvolution(state,catalog,level,`${active}-${level}`);
    }
    assert.equal(state.evolutionChoices['15'],`${active}-15`);
  }
});
