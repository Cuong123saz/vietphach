import type { Point, Zone } from '../../world/definitions';
import { bodyCenter, bodyIntersectsCircle, movementBody } from '../../world/bodyGeometry';
import { moveCharacter } from '../characters/core/movement';
import { bodyMoveMultiplier, type CombatBody } from '../combat/CombatBody';
import { createProjectile, tickProjectile } from '../combat/Projectile';

export interface BossCycleSettings {
  burrowSeconds:number; undergroundSeconds:number; emergeSeconds:number; volleyGap:number;
  jumpSeconds:number; jumpRange:number; jumpDelay:number; dashSeconds:number; dashSpeed:number;
  rollWarningSeconds:number; rollSeconds:number; rollSpeed:number; actionPause:number;
  /** rad/s the roll may turn toward the player (0/absent = straight line). */
  rollTurnRate?:number;
  /** Stage concept: airborne leaps pass over actors and deal one marked ground impact on landing. */
  landingImpact?:boolean;
}
export type BossPhase='burrow'|'underground'|'emerge'|'volley-wait'|'jump-warning'|'jump'|'landing-pause'|'dash'|'dash-pause'|'roll-warning'|'roll'|'roll-pause';
export interface BossSequence {
  phase:BossPhase; startedAt:number; endsAt:number; secondShotAt?:number;
  direction:Point; jumpTarget?:Point; emergeAt?:Point; hitIds:Set<string>;
  /** The charge is now a second jump; true while that follow-up leap is under way. */
  secondJump?:boolean;
}
interface BossContext {
  now:number;seconds:number;body:CombatBody;target:CombatBody;targets:CombatBody[];zone:Zone;
  settings:BossCycleSettings;hitRadius:number;
  shoot:()=>void;hit:(victim:CombatBody,direction:Point)=>void;
  obstacleTarget?:(id:string)=>CombatBody|undefined;
  /** Target's current velocity: the emerge point leads it, like the black elite's bristle zone. */
  targetVelocity?:Point;
  /** When set, surfacing calls this instead of firing the two volleys. */
  emerged?:(at:Point)=>void;
}
/** Longest lead the burrow prediction may take, so a wild turn can still be read. */
const EMERGE_MAX_LEAD=200;
/** Where the target's centre will be after `seconds` of its current movement, lead capped like the emerge. */
/** Jump landing: where the target will be by touchdown, clamped to the jump range. */
function leapTarget(c:BossContext,body:CombatBody,s:BossCycleSettings):Point {
  const goal=ahead(c,s.jumpDelay+s.jumpSeconds),center=bodyCenter(body),feet={x:goal.x+body.position.x-center.x,y:goal.y+body.position.y-center.y};
  const dir=direction(body.position,feet),range=Math.min(s.jumpRange,Math.hypot(feet.x-body.position.x,feet.y-body.position.y));
  if(s.landingImpact)return moveCharacter(body.position,dir,1,c.zone,{speed:range,radius:movementBody(body).radius});
  return {x:body.position.x+dir.x*range,y:body.position.y+dir.y*range};
}
function ahead(c:BossContext,seconds:number):Point {
  const v=c.targetVelocity??{x:0,y:0},lead={x:v.x*seconds,y:v.y*seconds},len=Math.hypot(lead.x,lead.y),k=len>EMERGE_MAX_LEAD?EMERGE_MAX_LEAD/len:1,at=bodyCenter(c.target);
  return {x:at.x+lead.x*k,y:at.y+lead.y*k};
}
const direction=(from:Point,to:Point):Point=>{
  const dx=to.x-from.x,dy=to.y-from.y,length=Math.hypot(dx,dy);
  return length>1e-8?{x:dx/length,y:dy/length}:{x:1,y:0};
};
function enter(state:BossSequence,phase:BossPhase,now:number,seconds:number){
  state.phase=phase;state.startedAt=now;state.endsAt=now+seconds;state.hitIds.clear();
}
export function createBossSequence(now:number,settings:BossCycleSettings):BossSequence {
  return {phase:'burrow',startedAt:now,endsAt:now+settings.burrowSeconds,direction:{x:1,y:0},hitIds:new Set()};
}
export function tickBossSequence(state:BossSequence,c:BossContext):void {
  const {body,settings:s,now}=c;
  const imprisoned=body.slows?.some(effect=>effect.multiplier===0 && effect.expiresAt>now && effect.sourceId.startsWith('water-prison:'))??false;
  body.burrowed=state.phase==='underground';
  if(state.phase==='burrow'){
    if(now>=state.endsAt){
      enter(state,'underground',now,s.undergroundSeconds);body.burrowed=true;
      // Predict where the target will be when it surfaces (capped lead), then lock it: the dodge window.
      const v=c.targetVelocity??{x:0,y:0},lead={x:v.x*s.undergroundSeconds,y:v.y*s.undergroundSeconds},len=Math.hypot(lead.x,lead.y);
      const k=len>EMERGE_MAX_LEAD?EMERGE_MAX_LEAD/len:1,goal={x:c.target.position.x+lead.x*k,y:c.target.position.y+lead.y*k};
      const dir=direction(body.position,goal),range=Math.hypot(goal.x-body.position.x,goal.y-body.position.y);
      // Wards still stop access.
      state.emergeAt=moveCharacter(body.position,dir,1,c.zone,{speed:imprisoned?0:range,radius:movementBody(body).radius});
    }
  }else if(state.phase==='underground'){
    if(now>=state.endsAt){
      body.position={...state.emergeAt!};body.burrowed=false;enter(state,'emerge',now,s.emergeSeconds);
      // Bursting out of the ground hurts whatever stands on the marked spot.
      for(const victim of c.targets)if(bodyIntersectsCircle(victim,state.emergeAt!,c.hitRadius)){state.hitIds.add(victim.id);c.hit(victim,direction(state.emergeAt!,bodyCenter(victim)));}
      state.direction=direction(bodyCenter(body),bodyCenter(c.target));
      if(c.emerged)c.emerged({...state.emergeAt!});else c.shoot();
      state.secondShotAt=now+s.volleyGap;
    }
  }else if(state.phase==='emerge'){
    if(now>=state.endsAt)enter(state,'volley-wait',now,Math.max(0,state.secondShotAt!-now));
  }else if(state.phase==='volley-wait'){
    if(now>=state.secondShotAt!){
      state.direction=direction(bodyCenter(body),bodyCenter(c.target));if(!c.emerged)c.shoot();enter(state,'jump-warning',now,s.jumpDelay);
      state.jumpTarget=leapTarget(c,body,s);state.secondJump=false;
    }
  }else if(state.phase==='jump-warning'){
    if(now>=state.endsAt)enter(state,'jump',now,s.jumpSeconds);
  }else if(state.phase==='jump'){
    const goal=state.jumpTarget!,dir=direction(body.position,goal),remaining=Math.hypot(goal.x-body.position.x,goal.y-body.position.y);
    const dt=Math.min(c.seconds,Math.max(0,state.endsAt-(now-c.seconds)));
    const left=Math.max(dt,state.endsAt-(now-c.seconds)),foot=movementBody(body);
    body.position=moveCharacter(body.position,dir,dt,c.zone,{speed:imprisoned?0:remaining/Math.max(left,1e-8),radius:foot.radius,
      blockingBodies:s.landingImpact?undefined:c.targets.map(movementBody)});
    if(now>=state.endsAt){
      if(s.landingImpact)for(const victim of c.targets)if(bodyIntersectsCircle(victim,body.position,c.hitRadius))
        c.hit(victim,direction(body.position,bodyCenter(victim)));
      enter(state,'landing-pause',now,s.actionPause);
    }
  }else if(state.phase==='landing-pause'){
    if(now>=state.endsAt){
      if(!state.secondJump){
        // Instead of a dash: leap again onto where the target is heading.
        state.secondJump=true;enter(state,'jump-warning',now,s.jumpDelay);state.jumpTarget=leapTarget(c,body,s);
      }else{
        state.secondJump=false;
        // Locked at the warning: aim where the target will be when the roll arrives.
        const from=bodyCenter(body),reach=Math.hypot(bodyCenter(c.target).x-from.x,bodyCenter(c.target).y-from.y);
        enter(state,'roll-warning',now,s.rollWarningSeconds);state.direction=direction(from,ahead(c,s.rollWarningSeconds+reach/s.rollSpeed));
      }
    }
  }else if(state.phase==='dash-pause'){
    if(now>=state.endsAt){
      // Locked at the warning: aim where the target will be when the roll arrives.
      const from=bodyCenter(body),reach=Math.hypot(bodyCenter(c.target).x-from.x,bodyCenter(c.target).y-from.y);
      enter(state,'roll-warning',now,s.rollWarningSeconds);state.direction=direction(from,ahead(c,s.rollWarningSeconds+reach/s.rollSpeed));
    }
  }else if(state.phase==='roll-pause'){
    if(now>=state.endsAt)enter(state,'burrow',now,s.burrowSeconds);
  }else if(state.phase==='roll-warning'){
    if(now>=state.endsAt)enter(state,'roll',now,s.rollSeconds);
  }else{
    if(state.phase==='roll' && s.rollTurnRate){
      // Rolling shell steers toward where the target is heading, at a capped turn rate.
      const from=bodyCenter(body),goal=ahead(c,Math.hypot(bodyCenter(c.target).x-from.x,bodyCenter(c.target).y-from.y)/s.rollSpeed);
      const want=Math.atan2(goal.y-from.y,goal.x-from.x),current=Math.atan2(state.direction.y,state.direction.x),turn=s.rollTurnRate*c.seconds;
      const heading=current+Math.max(-turn,Math.min(turn,Math.atan2(Math.sin(want-current),Math.cos(want-current))));
      state.direction={x:Math.cos(heading),y:Math.sin(heading)};
    }
    const speed=state.phase==='roll'?s.rollSpeed:s.dashSpeed;
    const before={...bodyCenter(body)},old={...body.position},foot=movementBody(body);
    const dt=Math.min(c.seconds,Math.max(0,state.endsAt-(now-c.seconds)));
    body.position=moveCharacter(body.position,state.direction,dt,c.zone,{speed:speed*bodyMoveMultiplier(body,now),radius:foot.radius});
    const after=bodyCenter(body),travel=Math.hypot(after.x-before.x,after.y-before.y);
    if(travel>1e-8){
      for(const victim of c.targets.filter(t=>!state.hitIds.has(t.id))){
        const impact=tickProjectile(createProjectile(`${body.id}:boss-probe`,body.id,before,direction(before,after),
          {speed:travel,radius:c.hitRadius,range:travel}),1,[victim],c.zone.objects);
        if(impact?.type==='enemy'){state.hitIds.add(victim.id);c.hit(victim,state.direction);}
        else if(impact?.type==='obstacle'){
          const objective=c.obstacleTarget?.(impact.obstacleId);
          if(objective && !state.hitIds.has(objective.id)){state.hitIds.add(objective.id);c.hit(objective,state.direction);}
        }
      }
    }
    if(now>=state.endsAt || (dt>0 && Math.hypot(body.position.x-old.x,body.position.y-old.y)<1e-5)){
      if(state.phase==='dash'){
        enter(state,'dash-pause',now,s.actionPause);
      }else enter(state,'roll-pause',now,s.actionPause);
    }
  }
}
