import type Phaser from 'phaser';
import type { Point } from '../../world/definitions';
import type { DragonCast } from '../../gameplay/characters/jobs/mage/WaterMageState';
import type { MageRuntime } from '../../gameplay/characters/jobs/mage/MageRuntime';
import { validBody, type CombatBody } from '../../gameplay/combat/CombatBody';
import { bodyIntersectsCircle, worldBodyBox } from '../../world/bodyGeometry';
import { placeDragonFlightPose } from './WaterDragonPreview';

export function preloadWaterPrison(scene:Phaser.Scene):void {
  scene.load.image('stage-water-prison','/assets/characters/mage/stage-water-prison/sphere.png');
}
/** Orb delivery ends at the confirmed prison arrival, never applies combat. */
export class WaterPrisonDelivery {
  private elapsed=0;
  private orb:Phaser.GameObjects.Image;
  private marker:Phaser.GameObjects.Arc;
  private origin:Point;private target:Point;private duration:number;private mode:'staff'|'mirror';
  phase='swing';done=false;
  get openingPoseActive(){return this.mode==='staff' && this.elapsed<.12;}
  get movementLocked(){return this.mode==='staff' && this.elapsed<.12;}
  get commandActive(){return false;}
  constructor(scene:Phaser.Scene,origin:Point,target:Point,duration:number,radius:number,mode:'staff'|'mirror'){
    this.origin={...origin};this.target={...target};this.duration=duration;this.mode=mode;
    this.orb=scene.add.image(origin.x,origin.y,'stage-water-prison').setVisible(false).setDepth(target.y+4);
    this.orb.setDisplaySize(28,28);
    this.marker=scene.add.circle(target.x,target.y,radius,0x4ecbff,.06).setStrokeStyle(1,0x9ff2ff,.65);
  }
  update(dt:number,_origin:Point):void {
    if(this.done)return;this.elapsed+=dt;
    const wait=this.mode==='mirror'?.18:.12;
    const t=Math.max(0,Math.min(1,(this.elapsed-wait)/(this.duration-wait)));
    this.phase=this.elapsed<wait?(this.mode==='mirror'?'flash':'swing'):'prison-orb';
    if(this.elapsed>=wait)this.orb.setVisible(true).setPosition(this.origin.x+(this.target.x-this.origin.x)*t,
      this.origin.y+(this.target.y-18-this.origin.y)*t-16*Math.sin(t*Math.PI)).setRotation(this.elapsed*.6);
    if(this.elapsed>=this.duration)this.destroy();
  }
  destroy(){if(this.done)return;this.done=true;this.orb.destroy();this.marker.destroy();}
}
/** Prison spheres follow rooted actors; a dragon rises vertically at the confirmed eruption. */
export class WaterPrisonEffects {
  private scene:Phaser.Scene;
  private spheres=new Map<string,Phaser.GameObjects.Image>();
  private eruptions:{cast:DragonCast;at:number;image:Phaser.GameObjects.Image;ring:Phaser.GameObjects.Ellipse}[]=[];
  constructor(scene:Phaser.Scene){this.scene=scene;}
  erupt(cast:DragonCast,at:number):void {
    const p=cast.position,r=cast.radius!;
    const image=this.scene.add.image(p.x,p.y,'dragon-key-3').setDepth(p.y+4).setVisible(false);
    const ring=this.scene.add.ellipse(p.x,p.y,r*2,r*.65,0x8befff,.5).setDepth(p.y+3);
    this.eruptions.push({cast,at,image,ring});
  }
  update(mage:MageRuntime,bodies:readonly CombatBody[],now:number):void {
    const live=new Set<string>();
    const sphere=(key:string,p:Point,size:number,alpha:number)=>{
      live.add(key);let image=this.spheres.get(key);
      if(!image){image=this.scene.add.image(p.x,p.y,'stage-water-prison');this.spheres.set(key,image);}
      image.setPosition(p.x,p.y).setDisplaySize(size,size).setDepth(p.y+80).setAlpha(alpha);
    };
    for(const prison of mage.waterSkills.prisons)if(prison.expiresAt>now && mage.resources.currentHp>0){
      const cast=prison.cast,fade=prison.erupted?Math.max(0,(prison.expiresAt-now)/.25):1;
      const targets=bodies.filter(b=>validBody(b) && b.actor.team!==mage.team && bodyIntersectsCircle(b,cast.position,cast.radius!));
      if(!targets.length && !prison.erupted)sphere(`empty:${cast.id}`,{x:cast.position.x,y:cast.position.y-22},cast.radius!*1.5,.6);
      for(const b of targets){const box=worldBodyBox(b),size=(box?.height??b.radius*2)+18;
        sphere(`body:${cast.id}:${b.id}`,{x:b.position.x,y:box?box.y+box.height/2:b.position.y-b.radius},size,.8*fade);}
    }
    for(const [id,image] of this.spheres)if(!live.has(id)){image.destroy();this.spheres.delete(id);}
    this.eruptions=this.eruptions.filter(e=>{
      const t=(now-e.at)/1.2;
      if(t>=1 || mage.resources.currentHp<=0){e.image.destroy();e.ring.destroy();return false;}
      const p=e.cast.position,r=e.cast.radius!,grow=Math.min(1,Math.max(0,t)/.15),fade=Math.min(1,(1-t)/.25);
      const keys=[3,4,5,4,5],key=keys[Math.min(4,Math.floor(Math.max(0,t)*5))];
      placeDragonFlightPose(e.image,key,p.x,p.y-Math.max(0,t)*210,-Math.PI/2,r*2*grow);
      e.image.setVisible(true).setAlpha(fade);
      e.ring.setAlpha(Math.max(0,.5-t));return true;
    });
  }
  destroy(){for(const image of this.spheres.values())image.destroy();this.spheres.clear();for(const e of this.eruptions){e.image.destroy();e.ring.destroy();}this.eruptions=[];}
}
