import type Phaser from 'phaser';
import { stageAge, type KhangChienRuntime } from '../../run/KhangChienStage';
import { KHANG_CHIEN_BALANCE as B } from '../../config/balance/khangChien';

// Multipliers preserve the art's pale edges while its water body darkens across the four maps.
const WATER_TINTS=[0xffffff,0xb3cddd,0x8598bd,0x666b94] as const;
export function mixWaterColor(from:number,to:number,t:number):number{
  const k=Math.max(0,Math.min(1,t));
  return [16,8,0].reduce((color,shift)=>color|(Math.round(((from>>shift)&255)*(1-k)+((to>>shift)&255)*k)<<shift),0);
}
export function stageWaterTint(mapIndex:number,transitionProgress=0):number{
  const index=Math.max(0,Math.min(3,Math.floor(mapIndex)-1));
  return mixWaterColor(WATER_TINTS[index],WATER_TINTS[Math.min(3,index+1)],transitionProgress);
}
export function khangChienWaterTint(s:KhangChienRuntime):number{
  const r=B.renewal;
  const progress=s.phase==='transition'?(stageAge(s)-r.returnSeconds-r.prayerSeconds)/r.drawSeconds:0;
  return stageWaterTint(s.mapIndex,progress);
}
export const multiplyWaterColor=(base:number,tint:number)=>[16,8,0].reduce((color,shift)=>
  color|(Math.round(((base>>shift)&255)*((tint>>shift)&255)/255)<<shift),0);

/** Explicit VFX allowlist excludes cast-pose characters, enemies, aiming markers and the soul. */
export function isStageWaterTexture(key:string):boolean{
  return /^(water-(orb-[0-3]|rise-(low|full)|full-loop-[0-7]|projectile|impact|guard-(mark|hit)|vein-link|mirror-[1-3]|swamp-(7|9|11|dragon-swim))|dragon-(key-[0-5]|impact)|eight-dragon-(formation|pose-[0-3])|stage-water-prison)$/.test(key);
}
type Corners=[number,number,number,number];
interface TintRecord {base:Corners;applied:Corners;fill:boolean}
/** Apply after the VFX update. Remember original corner colors so repeated frames never compound tint. */
export class KhangChienWaterTint {
  private originals=new WeakMap<Phaser.GameObjects.Image,TintRecord>();
  apply(objects:readonly Phaser.GameObjects.GameObject[],tint:number):void{
    for(const object of objects){
      if(object.type!=='Image')continue;
      const image=object as Phaser.GameObjects.Image;
      if(!isStageWaterTexture(image.texture.key))continue;
      const current:Corners=[image.tintTopLeft,image.tintTopRight,image.tintBottomLeft,image.tintBottomRight];
      const previous=this.originals.get(image);
      const base=previous && previous.fill===image.tintFill && current.every((color,i)=>color===previous.applied[i])?previous.base:current;
      const applied=base.map(color=>multiplyWaterColor(color,tint)) as Corners,fill=image.tintFill;
      if(fill)image.setTintFill(...applied);else image.setTint(...applied);
      this.originals.set(image,{base,applied,fill});
    }
  }
}
