import type Phaser from 'phaser';
import type { MageRuntime } from '../../gameplay/characters/jobs/mage/MageRuntime';
import type { Point } from '../../world/definitions';
const SWIM_KEY='water-swamp-dragon-swim';
const ROAR_SECONDS=.6;

/** Ground layer: over the map (-100) but under enemy ground skills (-50), monsters and people (depth = y). */
const SWAMP_DEPTH=-60;
export function preloadWaterSwamp(scene:Phaser.Scene):void {
  scene.load.image(SWIM_KEY,'/assets/characters/mage/LongMach-ThuyLongGam/dragon-swim-transparent.png');
  scene.load.image('water-swamp-7','/assets/characters/mage/LongMach-ThuyHam/LongMach-ThuyHam.png');
  scene.load.image('water-swamp-9','/assets/characters/mage/E-LongMach-SongTrongDam/E-LongMach-SongTrongDam-02.png');
  scene.load.image('water-swamp-11','/assets/characters/mage/E-LongMach-SongTrongDam/E-LongMach-ThuyVucSiet.png');
}
export function prepareWaterSwamp(scene:Phaser.Scene):void {
  const swim=scene.textures.get(SWIM_KEY),source=swim.getSourceImage() as HTMLImageElement;
  const width=Math.floor(source.width/3),height=Math.floor(source.height/2);
  for(let i=0;i<6;i++)if(!swim.has(String(i)))swim.add(String(i),0,(i%3)*width,Math.floor(i/3)*height,width,height);
  for(const key of ['water-swamp-7','water-swamp-9','water-swamp-11']){
    const texture=scene.textures.get(key),source=texture.getSourceImage() as HTMLImageElement,half=Math.floor(source.width/2);
    for(let i=0;i<2;i++)if(!texture.has(String(i)))texture.add(String(i),0,i*half,0,half,source.height);
  }
}
/** Effects only read confirmed gameplay; swimming poses surround the confirmed swamp. */
export class WaterSwampEffects {
  private pools=new Map<number,Phaser.GameObjects.Image>();
  private scene:Phaser.Scene;
  private roars:{image:Phaser.GameObjects.Image;at:number;position:Point;radius:number}[]=[];
  private launches:{image:Phaser.GameObjects.Image;at:number;from:Point;to:Point}[]=[];
  constructor(scene:Phaser.Scene){this.scene=scene;}
  roar(position:Point,radius:number,at:number):void {
    const previous=this.roars.find(r=>r.position.x===position.x && r.position.y===position.y);
    if(previous){previous.at=at;previous.radius=radius;return;}
    const image=this.scene.add.image(position.x,position.y,SWIM_KEY,'0').setOrigin(.5,.5);
    this.roars.push({image,at,position:{...position},radius});
  }
  launchCopy(from:Point,to:Point,at:number):void {
    const image=this.scene.add.image(from.x,from.y,'water-orb-3').setDepth(1001).setVisible(false);
    image.setScale(18/image.width);this.launches.push({image,at,from:{...from},to:{...to}});
  }
  update(mage:MageRuntime,now:number):void {
    const state=mage.waterSkills,live=new Set<number>();
    for(const s of [...(state.swamp?[state.swamp]:[]),...state.copiedSwamps])if(s.expiresAt>now && mage.resources.currentHp>0){
      live.add(s.id);
      const key=s.dotDamage>0?'water-swamp-11':s.radius>50?'water-swamp-9':'water-swamp-7';
      let pool=this.pools.get(s.id);if(!pool){pool=this.scene.add.image(s.position.x,s.position.y,key);this.pools.set(s.id,pool);}
      pool.setTexture(key,String(Math.floor((now-s.bornAt)*7)%2)).setPosition(s.position.x,s.position.y)
        .setDisplaySize(s.radius*2,s.radius*2).setDepth(SWAMP_DEPTH).setAlpha(s.execution==='copy'?.7:.9);
    }
    for(const [id,pool] of this.pools)if(!live.has(id)){pool.destroy();this.pools.delete(id);}
    this.roars=this.roars.filter(r=>{
      const elapsed=now-r.at;
      const pool=[state.swamp,...state.copiedSwamps].find(s=>s && s.expiresAt>now && s.position.x===r.position.x && s.position.y===r.position.y);
      if(elapsed>=ROAR_SECONDS || mage.resources.currentHp<=0 || !pool){r.image.destroy();return false;}
      const frame=Math.min(5,Math.floor(Math.max(0,elapsed)/ROAR_SECONDS*6));
      r.image.setTexture(SWIM_KEY,String(frame)).setPosition(r.position.x,r.position.y-6)
        .setDisplaySize(r.radius*1.85,r.radius*1.4).setDepth(SWAMP_DEPTH+1)
        .setAlpha(Math.min(1,Math.max(0,(ROAR_SECONDS-elapsed)/.12)));
      return true;
    });
    this.launches=this.launches.filter(l=>{
      const t=(now-l.at-.18)/.4;if(t>=1){l.image.destroy();return false;}
      if(t>=0)l.image.setVisible(true).setPosition(l.from.x+(l.to.x-l.from.x)*t,l.from.y+(l.to.y-l.from.y)*t);
      return true;
    });
  }
  destroy():void {for(const pool of this.pools.values())pool.destroy();this.pools.clear();for(const r of this.roars)r.image.destroy();for(const l of this.launches)l.image.destroy();this.launches=[];this.roars=[];}
}
