import type { Point, Zone } from '../../../../world/definitions';
import { overlaps } from '../../../../world/collision';
import { bodyCenter, bodyIntersectsCircle, worldBodyBox, sweptCircleContact, sweptCircleBoxContact } from '../../../../world/bodyGeometry';
import { createProjectile, tickProjectile } from '../../../combat/Projectile';
import type { CombatBody, ViewBounds } from '../../../combat/CombatBody';
import { MAPS } from '../../../../world/definitions';
export function clearWoodLine(zone:Zone,from:Point,to:Point):boolean {
  const d={x:to.x-from.x,y:to.y-from.y},length=Math.hypot(d.x,d.y);
  if(length<1e-8)return true;
  const p=createProjectile('wood-line-query','wood-line-query',from,d,{speed:length,radius:.1,range:length});
  return !tickProjectile(p,1,[],zone.objects);
}
export function validWoodPoint(point:Point,origin:Point,view:ViewBounds,zone:Zone,range:number):boolean {
  const map=MAPS[zone.mapId];
  return [point.x,point.y].every(Number.isFinite) && point.x>=0 && point.y>=0 && point.x<=map.width && point.y<=map.height
    && point.x>=view.x && point.y>=view.y && point.x<=view.x+view.width && point.y<=view.y+view.height
    && Math.hypot(point.x-origin.x,point.y-origin.y)<=range
    && !zone.objects.some(o=>!o.passProjectiles && overlaps(point,.1,o));
}
export function woodCircleHit(body:CombatBody,center:Point,radius:number,zone:Zone):boolean {
  return bodyIntersectsCircle(body,center,radius) && clearWoodLine(zone,center,bodyCenter(body));
}
export function woodCapsuleHit(body:CombatBody,a:Point,b:Point,radius:number,zone:Zone):boolean {
  const delta={x:b.x-a.x,y:b.y-a.y},box=worldBodyBox(body);
  const contact=box?sweptCircleBoxContact(a,delta,box,radius):sweptCircleContact(a,delta,body.position,body.radius+radius);
  if(contact===undefined)return false;
  const c=bodyCenter(body),length=delta.x*delta.x+delta.y*delta.y;
  const t=Math.max(0,Math.min(1,length?((c.x-a.x)*delta.x+(c.y-a.y)*delta.y)/length:0));
  return clearWoodLine(zone,{x:a.x+delta.x*t,y:a.y+delta.y*t},c);
}
export function woodDirection(from:Point,to:Point):Point|undefined {
  const dx=to.x-from.x,dy=to.y-from.y,length=Math.hypot(dx,dy);
  return Number.isFinite(length)&&length>1e-8?{x:dx/length,y:dy/length}:undefined;
}
