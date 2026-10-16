import type { CombatBody } from './CombatBody';
import { validBody } from './CombatBody';
import type { Point, Zone } from '../../world/definitions';

/** Destructible world obstacle, separate from actors/ally targeting and movement bodies. */
export interface CombatObjective {
  body:CombatBody; obstacleIds:readonly string[];
  protectedArea?:{center:Point;radiusX:number;radiusY:number};
}
/** Foot position decides whether an actor has taken shelter; the rim counts as inside. */
export function objectiveProtects(objective:CombatObjective,point:Point):boolean {
  const area=objective.protectedArea;
  return !!area && validBody(objective.body) && ((point.x-area.center.x)/area.radiusX)**2+((point.y-area.center.y)/area.radiusY)**2<=1+1e-8;
}
export function objectiveAtObstacle(objectives:readonly CombatObjective[]|undefined,id:string):CombatObjective|undefined {
  return objectives?.find(o=>validBody(o.body) && o.obstacleIds.includes(id));
}
/** Aim at the nearest actual edge, not the center of a large hollow structure. */
export function objectiveSurface(objective:CombatObjective,zone:Zone,origin:Point):CombatBody|undefined {
  if(!validBody(objective.body))return;
  let point:Point|undefined,best=Infinity;
  for(const obstacle of zone.objects){
    if(!objective.obstacleIds.includes(obstacle.id) || obstacle.kind!=='obstacle' || obstacle.shape?.type!=='polygon')continue;
    const points=obstacle.shape.points;
    for(let i=0;i<points.length;i++){
      const a={x:obstacle.x+points[i].x,y:obstacle.y+points[i].y},b={x:obstacle.x+points[(i+1)%points.length].x,y:obstacle.y+points[(i+1)%points.length].y};
      const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((origin.x-a.x)*dx+(origin.y-a.y)*dy)/(dx*dx+dy*dy||1)));
      const p={x:a.x+dx*t,y:a.y+dy*t},distance=(origin.x-p.x)**2+(origin.y-p.y)**2;
      if(distance<best){best=distance;point=p;}
    }
  }
  return point?{...objective.body,position:point,radius:0}:undefined;
}
