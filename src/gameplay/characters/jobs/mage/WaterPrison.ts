import type { WaterMageContext } from './WaterMageSkills';
import { actorTargetAllowed } from '../../../combat/Targeting';
import { validBody } from '../../../combat/CombatBody';
import { bodyIntersectsCircle } from '../../../../world/bodyGeometry';

/** Root movement while in a live prison; attacks and the ordinary passive are unchanged. */
export function tickWaterPrisons(ctx:WaterMageContext):void {
  const state=ctx.mage.waterSkills,prefix=`water-prison:${ctx.mage.id}:`;
  state.prisons=state.prisons.filter(p=>p.expiresAt>ctx.now && ctx.mage.resources.currentHp>0);
  for(const body of ctx.bodies){
    body.slows=body.slows?.filter(s=>!s.sourceId.startsWith(prefix))??[];
    if(!validBody(body) || !actorTargetAllowed(ctx.mage,body.actor,'ENEMY'))continue;
    for(const p of state.prisons)if(bodyIntersectsCircle(body,p.cast.position,p.cast.radius!))
      body.slows.push({sourceId:`${prefix}${p.cast.id}`,multiplier:0,expiresAt:p.expiresAt});
  }
}
