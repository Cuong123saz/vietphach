import Phaser from 'phaser';
import { WATER_CANNON_VISUAL as VISUAL } from '../animations/waterCannonTextures';
import type { Point } from '../../world/definitions';

export interface WaterChargeVisualInput {
  active: boolean; full: boolean; progress: number;
  position: Point; origin: Point; facingLeft: boolean;
  deltaSeconds: number; timeMs: number;
}
/** Reusable presentation only. Caller owns charge timing, input and gameplay. */
export class WaterChargeEffect {
  private orbs: Phaser.GameObjects.Image[];
  private back: Phaser.GameObjects.Image[];
  private front: Phaser.GameObjects.Image[];
  private droplets: Phaser.GameObjects.Ellipse[];
  private orbRotation=0;
  constructor(scene: Phaser.Scene) {
    this.orbs=Array.from({length:4},(_,index)=>scene.add.image(0,0,`water-orb-${index}`).setVisible(false));
    this.back=['water-rise-low','water-rise-full'].map(key=>scene.add.image(0,0,key).setVisible(false));
    this.front=['water-rise-low','water-rise-full'].map(key=>scene.add.image(0,0,key).setVisible(false));
    this.droplets=Array.from({length:3},()=>scene.add.ellipse(0,0,2,3,0xb7f5ff).setVisible(false));
  }
  update(input: WaterChargeVisualInput): void {
    const {position,origin,full,timeMs}=input;
    const progress=Math.max(0,Math.min(1,input.progress));
    const sign=input.facingLeft?-1:1,dt=input.deltaSeconds;
    const charging=input.active;
    const orbProgress=progress;
    if(full)this.orbRotation=(this.orbRotation+dt*0.5)%(Math.PI*2);
    else this.orbRotation=0;
    const orbStage=orbProgress*3;
    this.orbs.forEach((orb,index)=>{
      const opacity=Math.max(0,1-Math.abs(orbStage-index));
      const brightness=Math.round(160+95*orbProgress);
      orb.setVisible(charging && opacity>0).setPosition(origin.x,origin.y).setDepth(position.y+1)
        .setScale(VISUAL.orbMaxWidth/orb.width*(0.35+0.65*orbProgress)).setAlpha(opacity)
        .setTint((brightness<<16)|(brightness<<8)|brightness).setRotation(this.orbRotation);
    });
    const blend=progress*progress*(3-2*progress);
    // Presentation only: a shallow puddle grows from its fixed foot anchor.
    const growth=0.2+0.8*progress;
    this.back.forEach((water,index)=>{
      water.setTexture(index===0?'water-rise-low':full?`water-full-loop-${Math.floor(timeMs/100)%8}`:'water-rise-full');
      const width=index===0?88:96;
      const scale=width/water.width;
      // Restore the original bottom anchor, preserving front/back layering.
      const waterFootOffset=7;
      const verticalScale=scale*(0.12+0.88*progress);
      // Most frames cover 35%; a brief crest reaches 45% at full charge.
      const crest=full?Math.pow(Math.max(0,Math.sin(timeMs*0.003)),8):0;
      const cover=64*(0.35+0.1*crest)*progress;
      const split=Math.max(0,Math.min(water.height,Math.round(water.height+(waterFootOffset-cover)/verticalScale)));
      const alpha=(index===0?1-blend:blend)*(0.35+0.65*progress);
      water.setOrigin(0.5,1).setCrop(0,0,water.width,split)
        .setVisible(charging).setPosition(position.x,position.y+waterFootOffset)
        .setDepth(position.y-1).setFlipX(sign<0)
        .setScale(scale*growth,scale*(0.12+0.88*progress)).setAlpha(alpha);
      this.front[index].setTexture(water.texture.key).setOrigin(0.5,1)
        .setCrop(0,split,water.width,water.height-split).setVisible(charging)
        .setPosition(water.x,water.y).setDepth(position.y+0.5)
        .setFlipX(sign<0).setScale(water.scaleX,water.scaleY).setAlpha(alpha);

    });
    this.droplets.forEach((drop,index)=>{
      const cycle=(timeMs/1100+index/3)%1;
      const side=index%2===0?-1:1;
      drop.setVisible(charging && progress>0.7 && cycle<0.65)
        .setPosition(position.x+side*(19+8*cycle),position.y-18-27*cycle)
        .setDepth(position.y+2).setScale(0.7+0.3*progress)
        .setAlpha((1-cycle/0.65)*0.7);
    });
  }
  hide(): void {
    for(const object of [...this.orbs,...this.back,...this.front,...this.droplets])object.setVisible(false);
    this.orbRotation=0;
  }
  destroy(): void {
    for(const object of [...this.orbs,...this.back,...this.front,...this.droplets])object.destroy();
    this.orbs=[];this.back=[];this.front=[];this.droplets=[];this.orbRotation=0;
  }
}
