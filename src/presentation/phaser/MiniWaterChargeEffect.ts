import type Phaser from 'phaser';
import { WATER_CANNON_VISUAL as VISUAL } from '../animations/waterCannonTextures';
import type { WaterChargeVisualInput } from './WaterChargeEffect';

/** Basic-attack variant: small foot ring with the original four-stage charging orb. */
export class MiniWaterChargeEffect {
  private orbs: Phaser.GameObjects.Image[];
  private orbRotation=0;
  private back: Phaser.GameObjects.Image;
  private front: Phaser.GameObjects.Image;
  constructor(scene: Phaser.Scene) {
    this.orbs=Array.from({length:4},(_,index)=>scene.add.image(0,0,`water-orb-${index}`).setVisible(false));
    this.back=scene.add.image(0,0,'water-rise-low').setOrigin(0.5,1).setVisible(false);
    this.front=scene.add.image(0,0,'water-rise-low').setOrigin(0.5,1).setVisible(false);
  }
  update(input: WaterChargeVisualInput): void {
    const {position,origin,timeMs,active,facingLeft}=input;
    const pulse=Math.sin(timeMs*0.009);
    const progress=Math.max(0,Math.min(1,input.progress));
    this.orbRotation=input.full?(this.orbRotation+input.deltaSeconds*0.5)%(Math.PI*2):0;
    this.orbs.forEach((orb,index)=>{
      const opacity=Math.max(0,1-Math.abs(progress*3-index));
      const brightness=Math.round(160+95*progress);
      orb.setVisible(active && opacity>0).setPosition(origin.x,origin.y).setDepth(position.y+1)
        .setScale(VISUAL.orbMaxWidth/orb.width*(0.35+0.65*progress)).setAlpha(opacity)
        .setTint((brightness<<16)|(brightness<<8)|brightness).setRotation(this.orbRotation);
    });
    const growth=0.2+0.8*progress;
    const scale=84*growth/this.back.width,vertical=scale*(0.4+0.6*progress)*(1+0.025*pulse);
    // Preserve the artwork's side jets; mini means the low ring, not a flattened puddle.
    this.back.setVisible(active).setPosition(position.x,position.y+7).setDepth(position.y-1)
      .setFlipX(facingLeft).setScale(scale*(1+0.01*pulse),vertical)
      .setCrop().setAlpha(0.8);
    this.front.setVisible(false);
  }
  hide(): void { this.orbs.forEach(orb=>orb.setVisible(false));this.orbRotation=0;this.back.setVisible(false);this.front.setVisible(false); }
  destroy(): void { this.orbs.forEach(orb=>orb.destroy());this.back.destroy();this.front.destroy(); }
}
