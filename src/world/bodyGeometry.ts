import type { Point } from './definitions';
import { GROUND_BLOCKING } from '../config/movement';

/** Local world-unit rectangle, relative to the actor's existing ground anchor. */
export interface BodyBox { x: number; y: number; width: number; height: number }
export interface BodyGeometry { position: Point; radius: number; hitbox?: BodyBox }
/** Movement uses a small round footprint at the ground anchor, separate from receiving hits. */
export function movementBody(body: BodyGeometry): BodyGeometry {
  if(!Number.isFinite(body.radius) || body.radius<0)throw new Error('Invalid movement body radius.');
  if(body.hitbox)validateBodyBox(body.hitbox);
  const widthRadius=body.hitbox?body.hitbox.width*GROUND_BLOCKING.widthRatio:body.radius;
  return {position:body.position,radius:Math.min(body.radius,GROUND_BLOCKING.maxRadius,Math.max(GROUND_BLOCKING.minRadius,widthRadius))};
}
export function validateBodyBox(box: BodyBox): void {
  if (![box.x,box.y,box.width,box.height].every(Number.isFinite) || box.width<=0 || box.height<=0) throw new Error('Invalid body hitbox.');
}
export function worldBodyBox(body: BodyGeometry): BodyBox | undefined {
  if (!body.hitbox) return undefined;
  validateBodyBox(body.hitbox);
  return {...body.hitbox,x:body.position.x+body.hitbox.x,y:body.position.y+body.hitbox.y};
}
export function circleIntersectsBox(point: Point, radius: number, box: BodyBox): boolean {
  const x=Math.max(box.x,Math.min(box.x+box.width,point.x));
  const y=Math.max(box.y,Math.min(box.y+box.height,point.y));
  return (point.x-x)**2+(point.y-y)**2<=radius**2;
}
export function bodyIntersectsCircle(body: BodyGeometry, point: Point, radius: number): boolean {
  const box=worldBodyBox(body);
  return box ? circleIntersectsBox(point,radius,box) : Math.hypot(point.x-body.position.x,point.y-body.position.y)<=radius+body.radius;
}
export function bodyCenter(body: BodyGeometry): Point {
  const box=worldBodyBox(body);
  return box?{x:box.x+box.width/2,y:box.y+box.height/2}:body.position;
}
export function boxesOverlap(a: BodyBox,b: BodyBox): boolean {
  return a.x<b.x+b.width && a.x+a.width>b.x && a.y<b.y+b.height && a.y+a.height>b.y;
}
export function bodyEnvelope(body: BodyGeometry): BodyBox {
  return worldBodyBox(body)??{x:body.position.x-body.radius,y:body.position.y-body.radius,width:body.radius*2,height:body.radius*2};
}
export function bodiesOverlap(a: BodyGeometry,b: BodyGeometry): boolean {
  const aa=worldBodyBox(a),bb=worldBodyBox(b);
  if(aa && bb)return boxesOverlap(aa,bb);
  if(aa)return circleIntersectsBox(b.position,Math.max(0,b.radius-1e-8),aa);
  if(bb)return circleIntersectsBox(a.position,Math.max(0,a.radius-1e-8),bb);
  return Math.hypot(a.position.x-b.position.x,a.position.y-b.position.y)<a.radius+b.radius;
}
/** Used only to let an already-overlapping pose move out without increasing overlap. */
export function bodyOverlapArea(a: BodyGeometry,b: BodyGeometry): number {
  if(!bodiesOverlap(a,b))return 0;
  const aa=bodyEnvelope(a),bb=bodyEnvelope(b);
  return Math.max(0,Math.min(aa.x+aa.width,bb.x+bb.width)-Math.max(aa.x,bb.x))
    *Math.max(0,Math.min(aa.y+aa.height,bb.y+bb.height)-Math.max(aa.y,bb.y));
}
export function sweptCircleContact(from: Point,delta: Point,center: Point,radius: number): number | undefined {
  const x=from.x-center.x,y=from.y-center.y,c=x*x+y*y-radius*radius;
  if(c<=0)return 0;
  const a=delta.x*delta.x+delta.y*delta.y;if(a===0)return undefined;
  const b=2*(x*delta.x+y*delta.y),d=b*b-4*a*c;if(d<0)return undefined;
  const t=(-b-Math.sqrt(d))/(2*a);return t>=0 && t<=1?t:undefined;
}
function segmentBoxContact(from: Point,delta: Point,box: BodyBox): number | undefined {
  let near=0,far=1;
  for(const [origin,direction,min,max] of [[from.x,delta.x,box.x,box.x+box.width],[from.y,delta.y,box.y,box.y+box.height]]){
    if(direction===0){if(origin<min || origin>max)return undefined;continue;}
    const a=(min-origin)/direction,b=(max-origin)/direction;
    near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));
    if(near>far)return undefined;
  }
  return near;
}
/** Exact circle sweep against the rectangle, including rounded corner contacts. */
export function sweptCircleBoxContact(from: Point,delta: Point,box: BodyBox,radius: number): number | undefined {
  const times=[segmentBoxContact(from,delta,{x:box.x-radius,y:box.y,width:box.width+radius*2,height:box.height}),
    segmentBoxContact(from,delta,{x:box.x,y:box.y-radius,width:box.width,height:box.height+radius*2})];
  for(const x of [box.x,box.x+box.width])for(const y of [box.y,box.y+box.height])times.push(sweptCircleContact(from,delta,{x,y},radius));
  const contacts=times.filter((value):value is number=>value!==undefined);
  return contacts.length?Math.min(...contacts):undefined;
}
