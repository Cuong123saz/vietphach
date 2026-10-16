const fs=require('node:fs');const load=require('../tests/load-ts.cjs')();
const {createMage,grantMageExperience,chooseMageEvolution,allocateMagePotential}=load('src/gameplay/characters/jobs/mage/MageRuntime.ts');
const {castWaterUltimate,castWaterQ,tickWaterMage}=load('src/gameplay/characters/jobs/mage/WaterMageSkills.ts');
function measure(path,mpRatio,qCount){
 const mage=createMage('p','players','water',150);grantMageExperience(mage,1190);allocateMagePotential(mage,'spirit',75);
 chooseMageEvolution(mage,5,path==='a1'?'core-ho':'core-long');for(const l of [7,9,11,13,15])chooseMageEvolution(mage,l,`${path}-${l}`);
 const enemy=createMage('boss','enemy','water',80);enemy.stats={...enemy.stats,maxHp:1000000,def:50};enemy.resources.currentHp=1000000;
 const maxMp=mage.stats.maxMp,atk=mage.stats.atk;mage.mach=4;mage.resources.currentMp=maxMp*mpRatio;
 const ctx={mage,position:{x:100,y:100},bodies:[{id:enemy.id,actor:enemy,position:{x:300,y:300},radius:12}],
   view:{x:0,y:0,width:1000,height:1000},now:0,random:()=>.99};
 const result=castWaterUltimate(ctx,{x:300,y:300});if(!result.ok)return {path,mpRatio,qCount,result};
 for(let i=0;i<qCount;i++){ctx.now=1.6+i*.4;tickWaterMage(ctx);castWaterQ(ctx,{x:300,y:300});ctx.now+=.22;tickWaterMage(ctx);}
 ctx.now=8;tickWaterMage(ctx);
 const hits=mage.waterSkills.events.filter(e=>e.kind==='damage'),impact=mage.waterSkills.events.find(e=>e.kind==='ultimate-impact');
 const actualDamage=1000000-enemy.resources.currentHp;
 return {path,maxMp,atk,mpRatio,qCount,mpSpent:impact.ultimate.mpSpent,rawDamage:hits.reduce((n,e)=>n+e.damage.rawDamage,0),
  actualDamage,bossHpShare:actualDamage/1000000,sietAccumulated:impact.ultimate.accumulated};
}
const results=[measure('b1',1,10),measure('b1',.5,10),measure('b1',1,0),measure('a1',1,0)];
if(results[0].actualDamage<100000)throw new Error('B1 full combo missed the 10% boss benchmark');
fs.mkdirSync('outputs/water-evolution',{recursive:true});fs.writeFileSync('outputs/water-evolution/benchmark.json',JSON.stringify({
 assumptions:'Lv15, 75 Spirit, solo, boss 1m HP / DEF50 / water, no crit, target stays at center, no external shields or Stage buffs. Damage tuning is provisional.',results},null,2));
console.log(JSON.stringify(results,null,2));
