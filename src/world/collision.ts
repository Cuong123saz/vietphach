import { MAPS, type Point, type PlacedObject, type Zone } from './definitions';
import { boxesOverlap, circleIntersectsBox, worldBodyBox, bodyOverlapArea, validateBodyBox, type BodyGeometry, type BodyBox } from './bodyGeometry';

export function overlaps(p: Point, radius: number, object: PlacedObject): boolean {
  const s = object.shape;
  if (object.kind !== 'obstacle' || !s) return false;
  if (s.type === 'circle') return Math.hypot(p.x - object.x, p.y - object.y) < radius + s.radius;
  if (s.type === 'rect') return Math.hypot(p.x - Math.max(object.x, Math.min(object.x + s.width, p.x)), p.y - Math.max(object.y, Math.min(object.y + s.height, p.y))) < radius;
  const x = p.x - object.x, y = p.y - object.y;
  let inside = false;
  for (let i = 0, j = s.points.length - 1; i < s.points.length; j = i++) {
    const a = s.points[i], b = s.points[j];
    if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside;
    const dx = b.x - a.x, dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1)));
    if (Math.hypot(x - a.x - t * dx, y - a.y - t * dy) < radius) return true;
  }
  return inside;
}
export function boxOverlapsObstacle(box: BodyBox,object: PlacedObject): boolean {
  const shape=object.shape;if(object.kind!=='obstacle' || !shape)return false;
  if(shape.type==='rect')return boxesOverlap(box,{x:object.x,y:object.y,width:shape.width,height:shape.height});
  if(shape.type==='circle')return circleIntersectsBox({x:object.x,y:object.y},Math.max(0,shape.radius-1e-8),box);
  const points=shape.points.map(p=>({x:p.x+object.x,y:p.y+object.y}));
  const eps=1e-8;
  const corners=[{x:box.x+eps,y:box.y+eps},{x:box.x+box.width-eps,y:box.y+eps},{x:box.x+box.width-eps,y:box.y+box.height-eps},{x:box.x+eps,y:box.y+box.height-eps}];
  const inside=(p:Point)=>{
    let result=false;
    for(let i=0,j=points.length-1;i<points.length;j=i++){
      const a=points[i],b=points[j];
      if((a.y>p.y)!==(b.y>p.y) && p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)result=!result;
    }
    return result;
  };
  if(corners.some(inside) || points.some(p=>p.x>box.x && p.x<box.x+box.width && p.y>box.y && p.y<box.y+box.height))return true;
  const cross=(a:Point,b:Point,c:Point)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
  for(let i=0;i<points.length;i++)for(let j=0;j<4;j++){
    const a=points[i],b=points[(i+1)%points.length],c=corners[j],d=corners[(j+1)%4];
    if(cross(a,b,c)*cross(a,b,d)<0 && cross(c,d,a)*cross(c,d,b)<0)return true;
  }
  return false;
}
export function movePlayer(p: Point, dx: number, dy: number, zone: Zone, radius = 12,
  geometry: {hitbox?:BodyBox;blockers?:readonly BodyGeometry[];passWaterBarrier?:boolean} = {}): Point {
  const map = MAPS[zone.mapId];
  const box=geometry.hitbox;if(box)validateBodyBox(box);
  // Small steps prevent crossing thin fences at low frame rates.
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / (box?Math.min(box.width,box.height)/2:radius/2)));
  const next = { ...p };
  const body=(position:Point):BodyGeometry=>({position,radius,hitbox:box});
  const clear = (q: Point) => {
    const bounds=worldBodyBox(body(q));
    if(zone.objects.some(o=>!(geometry.passWaterBarrier && o.resource==='water-barrier') && (bounds?boxOverlapsObstacle(bounds,o):overlaps(q,radius,o))))return false;
    return !(geometry.blockers??[]).some(blocker=>bodyOverlapArea(body(q),blocker)>bodyOverlapArea(body(next),blocker)+1e-8);
  };
  const minX=box?-box.x:radius,maxX=box?map.width-box.x-box.width:map.width-radius;
  const minY=box?-box.y:radius,maxY=box?map.height-box.y-box.height:map.height-radius;
  for (let i = 0; i < steps; i++) {
    const x = Math.max(minX, Math.min(maxX, next.x + dx / steps));
    const y = Math.max(minY, Math.min(maxY, next.y + dy / steps));
    if (clear({ x, y })) { next.x = x; next.y = y; }
    else { if (clear({ x, y: next.y })) next.x = x; if (clear({ x: next.x, y })) next.y = y; }
  }
  return next;
}
