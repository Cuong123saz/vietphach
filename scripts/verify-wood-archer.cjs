// Real fixed-step run, projectiles and field activation; no fabricated ConfirmedHit.
const fs=require('node:fs');const assert=require('node:assert/strict');
const load=require('../tests/load-ts.cjs')();
const R=load('src/run/ArcherRun.ts');const S=load('src/gameplay/characters/jobs/archer/WoodArcherSkills.ts');
const {createVillageZone}=load('src/run/Run.ts');const {spawnArcherEncounter}=load('src/run/ArcherEncounter.ts');
function scenario(path,marked=false,slots=0,fps=60){
 const run=R.createArcherRun('benchmark',{...createVillageZone(),spawn:{x:400,y:400}});R.prepareArcherTrial(run,path);
 const body=spawnArcherEncounter(run,true)[0];body.position={x:600,y:372};
 const context=()=>R.archerRunContext(run,undefined,()=>.99);
 const advance=seconds=>{for(let i=0;i<Math.round(seconds*fps);i++)R.tickArcherRun(run,1/fps,{},()=>.99);};
 if(marked){assert.equal(S.castArcherBasic(context(),body.position).ok,true);advance(.5);assert.equal(run.character.wood.mark.targetId,body.id);}
 if(slots===2){
  body.position={x:1000,y:600};assert.equal(S.castArcherE(context(),{x:550,y:372}).ok,true);advance(6);
  assert.equal(S.castArcherE(context(),{x:650,y:372}).ok,true);advance(1);
  body.position={x:600,y:372};advance(5);assert.equal(run.character.wood.fields.filter(f=>f.kind==='garden').length,2);
 }
 const before=body.actor.resources.currentHp;run.character.wood.events=[];
 assert.equal(S.castArcherUltimate(context(),body.position).ok,true);const captured=run.character.wood.ultimate.harvested;
 advance(8);const events=run.character.wood.events.filter(e=>e.kind==='damage');
 const result={path,marked,slots:captured,fps,damage:before-body.actor.resources.currentHp,
  hits:events.filter(e=>e.skill==='ultimate'||e.skill==='volley').length,ticks:events.filter(e=>e.skill==='dot').length,
  critical:events.some(e=>e.damage.critical),sap:run.character.wood.sap,mpCost:run.character.stats.maxMp*.6};
 const expected=path==='a1'?(marked?109350:102060):81000+slots*13500;
 assert.ok(Math.abs(result.damage-expected)<1e-7,JSON.stringify(result));assert.equal(result.critical,false);assert.equal(result.sap,0);
 return result;
}
const results=[];for(const fps of [30,60,120]){
 results.push(scenario('a1',false,0,fps),scenario('a1',true,0,fps),scenario('b1',false,0,fps),scenario('b1',false,2,fps));
}
const report={status:'VERIFIED_LIVE_ARCHER_RUNTIME',date:'2026-10-08',target:{hp:1000000,def:50,element:'wood'},
 assumptions:'Stationary body on the arrow line / inside forest; no shields or external buffs. B1 n2 uses two actual E seed casts, late body entry, then six-second E cooldown.',results};
fs.mkdirSync('outputs/wood-archer',{recursive:true});fs.writeFileSync('outputs/wood-archer/runtime-benchmark.json',JSON.stringify(report,null,2)+'\n');
process.stdout.write(JSON.stringify(report,null,2)+'\n');
