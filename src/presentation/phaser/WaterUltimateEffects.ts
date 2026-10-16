import type Phaser from 'phaser';
import type { MageRuntime } from '../../gameplay/characters/jobs/mage/MageRuntime';
import type { Point } from '../../world/definitions';
import type { DragonCast } from '../../gameplay/characters/jobs/mage/WaterMageState';
import { placeDragonFlightPose } from './WaterDragonPreview';

/** Confirmed simulation state owns timing and damage; this layer only draws. */
export class WaterUltimateEffects {
  private orb?:Phaser.GameObjects.Image;
  private formation?:Phaser.GameObjects.Image;
  private dive?:Phaser.GameObjects.Image;
  private rising?:Phaser.GameObjects.Image;
  private flights:{image:Phaser.GameObjects.Image;from:Point;cast:DragonCast;at:number}[]=[];
  private impacts:{ring:Phaser.GameObjects.Ellipse;at:number;radius:number}[]=[];
  private scene:Phaser.Scene;
  constructor(scene:Phaser.Scene){this.scene=scene;}
  launch(cast:DragonCast,from:Point,at:number):void{
    const image=this.scene.add.image(from.x,from.y,'dragon-key-3').setDepth(from.y+100);
    this.flights.push({image,from:{...from},cast,at});
  }
  impact(position:Point,radius:number,at:number):void{
    const ring=this.scene.add.ellipse(position.x,position.y,radius*2,radius,0xb0eeff,.45).setDepth(position.y+2);
    this.impacts.push({ring,at,radius});
  }
  update(mage:MageRuntime,origin:Point,now:number):void{
    const u=mage.waterSkills.ultimate;
    if(u && mage.resources.currentHp>0){
      this.orb??=this.scene.add.image(origin.x,origin.y,'stage-water-prison');
      const t=Math.min(1,Math.max(0,(now-u.bornAt)/(u.opensAt-u.bornAt)));
      const p={x:origin.x+(u.position.x-origin.x)*t,y:origin.y+(u.position.y-origin.y)*t};
      this.orb.setPosition(p.x,p.y-28-70*Math.sin(t*Math.PI)).setDisplaySize(28+u.delivered*3,28+u.delivered*3)
        .setRotation((now-u.bornAt)*1.5).setDepth(u.position.y+60).setAlpha(.9);
      if(u.kind==='eight'){
        this.formation??=this.scene.add.image(origin.x,origin.y,'eight-dragon-formation').setBlendMode('ADD');
        this.formation.setPosition(origin.x,origin.y-25).setTexture('eight-dragon-formation',String(Math.min(3,Math.floor(t*4))))
          .setDisplaySize(220,140).setDepth(origin.y+4).setAlpha(now<u.opensAt?.85:.3);
      }else if(now>=u.opensAt+.6 && now<u.opensAt+1.2){
        this.rising??=this.scene.add.image(u.position.x,u.position.y,'dragon-key-3');
        const rise=(now-u.opensAt-.6)/.6;
        placeDragonFlightPose(this.rising,3,u.position.x,u.position.y-rise*180,-Math.PI/2,120);
        this.rising.setDepth(u.position.y+90).setAlpha(1-rise);
      }else if(now>=u.endsAt){
        this.dive??=this.scene.add.image(u.position.x,u.position.y-180,'dragon-key-3');
        const dive=Math.min(1,Math.max(0,(now-(u.impactAt-.5))/.5));
        placeDragonFlightPose(this.dive,3,u.position.x,u.position.y-180*(1-dive),Math.PI/2,180);
        this.dive.setDepth(u.position.y+90).setAlpha(dive>0?1:0);
      }
      if(this.rising && now>=u.opensAt+1.2){this.rising.destroy();this.rising=undefined;}
    }else this.clearCore();
    this.flights=this.flights.filter(f=>{
      const t=(now-f.at)/(f.cast.impactAt-f.at);
      if(t>=1 || mage.resources.currentHp<=0){f.image.destroy();return false;}
      const x=f.from.x+(f.cast.position.x-f.from.x)*Math.max(0,t),y=f.from.y+(f.cast.position.y-f.from.y)*Math.max(0,t);
      const angle=Math.atan2(f.cast.position.y-f.from.y,f.cast.position.x-f.from.x);
      placeDragonFlightPose(f.image,3,x,y,angle,f.cast.ultimateId?100:55);f.image.setAlpha(t>=0?1:0);return true;
    });
    this.impacts=this.impacts.filter(e=>{
      const t=(now-e.at)/.6;if(t>=1 || mage.resources.currentHp<=0){e.ring.destroy();return false;}
      e.ring.setDisplaySize(e.radius*2*(1+t),e.radius*(1+t)).setAlpha(.45*(1-t));return true;
    });
  }
  private clearCore(){this.orb?.destroy();this.orb=undefined;this.formation?.destroy();this.formation=undefined;this.dive?.destroy();this.dive=undefined;this.rising?.destroy();this.rising=undefined;}
  destroy(){this.clearCore();for(const f of this.flights)f.image.destroy();for(const e of this.impacts)e.ring.destroy();this.flights=[];this.impacts=[];}
}
