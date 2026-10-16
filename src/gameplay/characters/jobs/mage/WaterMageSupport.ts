import type { WaterMageContext } from './WaterMageSkills';
import { validBody, bodyInView } from '../../../combat/CombatBody';
import { actorTargetAllowed } from '../../../combat/Targeting';
import { setMageTemporarySpirit } from './MageRuntime';
import { WATER_MAGE_RULES as R } from '../../../../config/balance/waterMage';
/** Read-only validation; callers commit only after every resource check succeeds. */
export function planReadySupport(ctx:WaterMageContext,preferUnlinked=false){
  const allies=ctx.bodies.filter(b=>validBody(b) && actorTargetAllowed(ctx.mage,b.actor,'ALLY'));
  if(!allies.length)return {targetId:ctx.mage.id,solo:true};
  const linked=new Set(ctx.mage.waterSkills.links.filter(l=>l.expiresAt>ctx.now).map(l=>l.targetId));
  const visible=allies.filter(b=>bodyInView(b,ctx.view)).sort((a,b)=>
    (preferUnlinked?Number(linked.has(a.id))-Number(linked.has(b.id)):0)
    || a.actor.resources.currentHp/a.actor.stats.maxHp-b.actor.resources.currentHp/b.actor.stats.maxHp
    || a.actor.resources.currentHp-b.actor.resources.currentHp || a.id.localeCompare(b.id));
  return visible[0]?{targetId:visible[0].id,solo:false}:undefined;
}
export function applyReadySupport(ctx:WaterMageContext,plan:NonNullable<ReturnType<typeof planReadySupport>>,limit:number){
  const state=ctx.mage.waterSkills;
  if(plan.solo){
    setMageTemporarySpirit(ctx.mage,R.soloSpiritPerLevel*ctx.mage.progression.level);
    state.soloBuffExpiresAt=ctx.now+R.soloDuration;
  }else{
    state.links=state.links.filter(l=>l.expiresAt>ctx.now && ctx.bodies.some(b=>b.id===l.targetId && validBody(b) && actorTargetAllowed(ctx.mage,b.actor,'ALLY')));
    if(!state.links.some(l=>l.targetId===plan.targetId))state.links.push({targetId:plan.targetId,expiresAt:ctx.now+R.linkDuration});
    while(state.links.length>limit)state.links.shift();
    for(const link of state.links)link.expiresAt=ctx.now+R.linkDuration;
  }
  ctx.mage.mach=0;
  state.events.push({kind:'e-support',at:ctx.now,targetId:plan.targetId,mode:plan.solo?'solo':'link'});
}
