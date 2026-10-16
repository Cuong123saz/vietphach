import type Phaser from 'phaser';
import { stageAge, renewalStep, finaleTiming, purificationProgress, type KhangChienRuntime } from '../../run/KhangChienStage';
import { KHANG_CHIEN_BALANCE as B } from '../../config/balance/khangChien';
import { KHANG_CHIEN_REFUGE as R } from '../../world/khangChien';
import { placeDragonFlightPose } from './WaterDragonPreview';
import { khangChienWaterTint, multiplyWaterColor } from './KhangChienWaterTint';

/** Reads the director only. VFX do not deal damage or advance the encounter. */
export class KhangChienEffects {
  private orb?:Phaser.GameObjects.Image;private pool?:Phaser.GameObjects.Image;
  private swim?:Phaser.GameObjects.Image;private dragon?:Phaser.GameObjects.Image;
  private eight:Phaser.GameObjects.Image[]=[];private lastPhase='';
  private volleys:Phaser.GameObjects.Image[]=[];
  private formation?:Phaser.GameObjects.Image;
  private celebrants:Phaser.GameObjects.Image[]=[];
  private counterblast?:Phaser.GameObjects.Graphics;
  private mist?:Phaser.GameObjects.Graphics;private claw?:Phaser.GameObjects.Graphics;
  private exploded=false;private clawLanded=false;
  private soul?:Phaser.GameObjects.Image;private cleansing?:Phaser.GameObjects.Graphics;
  private tint=0xffffff;
  private groundwater?:Phaser.GameObjects.Graphics;private renewalAura?:Phaser.GameObjects.Image;
  private scene:Phaser.Scene;
  constructor(scene:Phaser.Scene){this.scene=scene;}
  update(s:KhangChienRuntime,paused=false){
    this.tint=khangChienWaterTint(s);
    if(s.phase==='complete'){
      this.soul?.setVisible(false);this.cleansing?.clear();
      this.lastPhase=s.phase;return;
    }
    if(s.phase==='purification'){this.updatePurification(s);this.lastPhase=s.phase;return;}
    if(s.phase==='transition'){
      if(this.lastPhase==='sacrifice')this.clear();
      this.lastPhase=s.phase;this.updateRenewal(s,paused);return;
    }
    if(this.lastPhase==='transition'){this.clearRenewal();this.scene.cameras.main.shakeEffect.reset();}
    if(s.phase!=='sacrifice'){if(this.lastPhase==='sacrifice')this.clear();this.lastPhase=s.phase;return;}
    this.lastPhase=s.phase;const age=stageAge(s),target=s.finaleTarget!,player=s.run.player.position,timing=finaleTiming(s);
    if(!this.orb){
      this.orb=this.scene.add.image(player.x,player.y-35,'water-orb-3').setDepth(1700);
      this.pool=this.scene.add.image(target.x,target.y,'water-swamp-11','0').setDisplaySize(B.finale.radius*2,B.finale.radius*2).setDepth(target.y-.5);
      this.swim=this.scene.add.image(target.x,target.y-6,'water-swamp-dragon-swim','0').setDisplaySize(250,250).setDepth(target.y+1);
      this.dragon=this.scene.add.image(target.x,target.y-400,'dragon-key-5').setOrigin(.83,.81).setDisplaySize(210,210).setDepth(1800);
      const texture=this.scene.textures.get('eight-dragon-formation'),source=texture.getSourceImage() as HTMLImageElement;
      // The four silhouettes have different widths; equal cells sliced through the last dragon.
      const cuts=[0,518,1020,1563,2172],canvasWidth=620;
      for(let i=0;i<4;i++){
        const key=`eight-dragon-pose-${i}`;
        if(this.scene.textures.exists(key))continue;
        const canvas=document.createElement('canvas');canvas.width=canvasWidth;canvas.height=source.height;
        const ctx=canvas.getContext('2d')!,x=cuts[i]*source.width/2172,width=(cuts[i+1]-cuts[i])*source.width/2172;
        ctx.drawImage(source,x,0,width,source.height,(canvasWidth-width)/2,0,width,source.height);
        // Remove the black matte in the runtime atlas; normal blending preserves the blue detail.
        const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);
        for(let p=0;p<pixels.data.length;p+=4){
          const light=Math.max(pixels.data[p],pixels.data[p+1],pixels.data[p+2]);
          pixels.data[p+3]=Math.round(pixels.data[p+3]*light/255);
          if(light>0)for(let c=0;c<3;c++)pixels.data[p+c]=Math.round(pixels.data[p+c]*255/light);
        }
        ctx.putImageData(pixels,0,0);
        this.scene.textures.addCanvas(key,canvas);
      }
      this.formation=this.scene.add.image(player.x,player.y,'eight-dragon-pose-0').setOrigin(.5,.72).setDepth(player.y-1).setVisible(false);
      for(let i=0;i<8;i++)this.eight.push(this.scene.add.image(target.x,target.y,'dragon-key-3').setVisible(false).setDepth(1800));
    }
    const t=Math.min(1,age/B.finale.chargeSeconds),growth=s.finaleShots.filter(shot=>shot.landed).length;
    const diveAt=timing.firstImpactAt-B.finale.diveSeconds;
    this.orb!.setPosition(player.x+(target.x-player.x)*t,player.y-35+(target.y-player.y-30)*t-Math.sin(t*Math.PI)*110)
      .setDisplaySize(35+growth*5,35+growth*5).setRotation(age*3).setVisible(age<timing.firstImpactAt)
      .setTint(s.finaleShots.some(shot=>shot.landed && age-shot.impactAt<.12)?0xcaffff:0xffffff);
    this.pool!.setVisible(age>=B.finale.chargeSeconds && age<timing.eightImpactAt).setTexture('water-swamp-11',String(Math.floor(age*8)%2));
    this.swim!.setVisible(age>=B.finale.chargeSeconds && age<B.finale.chargeSeconds+.8).setTexture('water-swamp-dragon-swim',String(Math.min(5,Math.max(0,Math.floor((age-B.finale.chargeSeconds)*8)))));
    // Each actual Q owns its own flight; rapid taps may produce overlapping dragons.
    s.finaleShots.forEach((shot,i)=>{
      const dragon=this.volleys[i]??(this.volleys[i]=this.scene.add.image(0,0,'dragon-key-5').setOrigin(.83,.81).setDisplaySize(150,150).setDepth(1800));
      const flight=Math.min(1,Math.max(0,(age-shot.launchedAt)/B.finale.qFlightSeconds)),end={x:target.x,y:target.y-30};
      dragon.setPosition(shot.origin.x+(end.x-shot.origin.x)*flight,shot.origin.y+(end.y-shot.origin.y)*flight)
        .setRotation(Math.atan2(end.y-shot.origin.y,end.x-shot.origin.x)-Math.PI/4).setVisible(!shot.landed);
    });
    const flight=Math.min(1,Math.max(0,(age-diveAt)/B.finale.diveSeconds));
    placeDragonFlightPose(this.dragon!,[3,4,5,4,5][Math.min(4,Math.floor(flight*5))],target.x,target.y-430+430*flight,Math.PI/2,210);
    this.dragon!.setVisible(age>=diveAt && age<timing.firstImpactAt);
    // Complete one swim cycle, then launch vertically before the later descent.
    const ascentAt=B.finale.chargeSeconds+.8,ascentSeconds=.8;
    if(age>=ascentAt && age<ascentAt+ascentSeconds && age<diveAt){
      const rise=(age-ascentAt)/ascentSeconds;
      placeDragonFlightPose(this.dragon!,[3,4,5,4,5][Math.min(4,Math.floor(rise*5))],
        target.x,target.y-6-600*rise*rise,-Math.PI/2,210);
      this.dragon!.setVisible(true).setAlpha(1-Math.max(0,(rise-.75)/.25));
    }else this.dragon!.setAlpha(1);
    const charge=s.finaleShots.length/10;
    this.formation!.setVisible(age<timing.eightLaunchAt)
      .setTexture(`eight-dragon-pose-${Math.min(3,Math.max(0,Math.floor(charge*4)))}`)
      .setPosition(player.x,player.y+6).setDepth(player.y-1).setScale((270+30*Math.max(0,Math.min(1,charge)))/620).setAlpha(.65+.35*charge);
    this.eight.forEach((dragon,i)=>{
      const a=i*Math.PI/4,from={x:player.x+Math.cos(a)*115,y:player.y+Math.sin(a)*50-45};
      const end=s.finaleEightTargets?.[i]??target,f=s.finaleReleaseAt===undefined?0:Math.min(1,Math.max(0,(age-timing.eightLaunchAt)/(timing.eightImpactAt-timing.eightLaunchAt))),travel=f*f;
      const key=[3,4,5,4,5][Math.min(4,Math.floor(f*5))];
      const arc=220,dy=end.y-from.y-arc*Math.PI*Math.cos(travel*Math.PI);
      placeDragonFlightPose(dragon,key,from.x+(end.x-from.x)*travel,from.y+(end.y-from.y)*travel-Math.sin(travel*Math.PI)*arc,Math.atan2(dy,end.x-from.x),150);
      dragon.setVisible(age>=timing.eightLaunchAt&&age<timing.eightImpactAt);
    });
    if(age>=timing.eightImpactAt && age<timing.revealAt+.5){
      // Silence: water mist hangs where the boss was, thinning out until it is seen again.
      this.mist??=this.scene.add.graphics().setDepth(target.y+5);
      const g=this.mist.clear(),k=Math.min(1,(age-timing.eightImpactAt)/(timing.revealAt+.5-timing.eightImpactAt)),alpha=(1-k)*.75;
      for(let i=0;i<14;i++){
        const a=i*2.399,r=(20+(i%5)*14)*(1+k*.6),x=target.x+Math.cos(a)*r+Math.sin(age*.8+i)*6,y=target.y-20+Math.sin(a)*r*.5-k*25;
        g.fillStyle(multiplyWaterColor(i%3?0xdff4ff:0xb9dcef,this.tint),alpha*(.5+.1*(i%4))).fillCircle(x,y,22+(i%4)*8+k*14);
      }
    }else if(this.mist){this.mist.destroy();this.mist=undefined;}
    if(age>=timing.celebrateAt){
      if(!this.celebrants.length)for(let i=0;i<8;i++)this.celebrants.push(this.scene.add.image(0,0,'basic-run-down-0').setOrigin(.5,.9));
      const t=Math.min(1,(age-timing.celebrateAt)/(timing.jumpAt-timing.celebrateAt)),reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.celebrants.forEach((image,i)=>{
        const from={x:R.villagers.x+(i%4-1.5)*25,y:R.villagers.y+Math.floor(i/4)*20};
        // Leave the boss-to-player firing lane open; companions surround from the sides and rear.
        const a=(i/7)*Math.PI*1.5-Math.PI*.25;
        const end={x:player.x+Math.cos(a)*135,y:player.y+Math.sin(a)*85};
        const x=from.x+(end.x-from.x)*t,y=from.y+(end.y-from.y)*t,dx=end.x-from.x,dy=end.y-from.y;
        const facing=Math.abs(dx)>Math.abs(dy)?dx<0?'left':'right':dy<0?'up':'down';
        // Arrived: jump for joy, each on its own beat.
        const hop=age>=timing.jumpAt && age<timing.beamAt?Math.abs(Math.sin((age-timing.jumpAt)*9+i*1.3))*(reduced?0:22):0;
        image.setTexture(t<1?`basic-run-${facing}-${Math.floor(age*8)%4}`:`basic-idle-${facing}-0`).setPosition(x,y-hop).setScale(65/image.height).setDepth(y);
      });
    }
    if(age>=timing.beamAt){
      const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if(!this.exploded){
        // Out of nowhere: the shrunken boss blows up.
        this.exploded=true;
        if(!reduced){this.scene.cameras.main.flash(260,255,236,190);this.scene.cameras.main.shake(700,.012);}
      }
      this.counterblast??=this.scene.add.graphics().setDepth(1900);
      const g=this.counterblast.clear(),elapsed=age-timing.beamAt,blast=Math.min(1,elapsed/.35);
      // Expanding fire, drifting smoke and flying embers share the slowed cinematic clock.
      g.fillStyle(0xffa32c,.5*(1-blast*.6)).fillCircle(target.x,target.y,30+100*Math.min(1,elapsed/.4));
      g.fillStyle(0xff6020,(1-blast)*.8).fillCircle(target.x,target.y,12+blast*120);
      g.fillStyle(0xffedaa,(1-blast)*.95).fillCircle(target.x,target.y,8+blast*70);
      g.lineStyle(5,0xffae3b,(1-blast)*.8).strokeEllipse(target.x,target.y,30+blast*260,12+blast*110);
      for(let i=0;i<18;i++){
        const a=i*2.399,r=(35+(i%5)*15)*blast,x=target.x+Math.cos(a)*r,y=target.y+Math.sin(a)*r*.6-elapsed*45;
        g.fillStyle(i%2?0x302a28:0x63534a,Math.min(.6,elapsed*3)).fillCircle(x,y,8+blast*(12+i%4*4));
        const distance=blast*(90+i%4*25),px=target.x+Math.cos(a)*distance,py=target.y+Math.sin(a)*distance*.6;
        g.lineStyle(2,0xffcd63,1-blast*.7).lineBetween(px,py,px-Math.cos(a)*14,py-Math.sin(a)*9);
      }
      // A claw tears loose and flies straight into the mage's chest.
      const chest={x:player.x,y:player.y-45},f=Math.min(1,elapsed/(timing.clawHitAt-timing.beamAt));
      this.claw??=this.scene.add.graphics().setDepth(1950);
      const c=this.claw.clear();
      if(f<1){
        const x=target.x+(chest.x-target.x)*f,y=target.y-20+(chest.y-target.y+20)*f-Math.sin(f*Math.PI)*40;
        const dir=Math.atan2(chest.y-target.y,chest.x-target.x),spin=reduced?0:f*Math.PI*3;
        c.lineStyle(6,0xb8f25a,.55).lineBetween(x-Math.cos(dir)*50,y-Math.sin(dir)*50,x,y);
        this.drawClaw(c,x,y,dir+spin);
      }else if(!this.clawLanded){
        this.clawLanded=true;
        for(let i=0;i<14;i++){
          const a=i*Math.PI/7,drop=this.scene.add.circle(chest.x,chest.y,i%3?4:6,i%4?0xf4fbff:0xb8f25a,1).setDepth(1960);
          this.scene.tweens.add({targets:drop,x:chest.x+Math.cos(a)*(40+i%3*18),y:chest.y+Math.sin(a)*(26+i%3*10),alpha:0,duration:900,ease:'Quad.Out',onComplete:()=>drop.destroy()});
        }
        if(!reduced)this.scene.cameras.main.shake(260,.01);
      }
    }
  }
  private updatePurification(s:KhangChienRuntime){
    const p=s.run.player.position,age=stageAge(s),progress=purificationProgress(s);
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // The body remains fallen. Its soul is a separate image that dissolves into the water.
    for(const image of [this.orb,this.pool,this.swim,this.dragon,this.formation,...this.eight,...this.volleys])image?.setVisible(false);
    this.counterblast?.clear();this.claw?.clear();this.mist?.clear();
    this.soul??=this.scene.add.image(p.x,p.y,'mage-idle-down-0').setOrigin(.5,.9).setTint(0xd9faff).setBlendMode('ADD').setDepth(1800);
    const rise=Math.min(1,age/B.purification.riseSeconds),fade=1-progress;
    this.soul.setPosition(p.x,p.y-(reduced?20:85*rise)).setScale(72/this.soul.height).setAlpha(fade*.85).setVisible(progress<1);
    this.cleansing??=this.scene.add.graphics().setDepth(1700);
    const g=this.cleansing.clear();
    if(progress>0 && progress<1){
      const radius=reduced?130:30+progress*2600;
      g.lineStyle(12,0xc4f5ff,(1-progress)*.3).strokeEllipse(p.x,p.y,radius*2,radius*1.4);
      g.lineStyle(3,0xf2fcff,(1-progress)*.85).strokeEllipse(p.x,p.y,radius*2,radius*1.4);
    }
    // Formerly celebrating companions now stand quietly, facing the mage.
    this.celebrants.forEach(image=>{
      const dx=p.x-image.x,dy=p.y-image.y,facing=Math.abs(dx)>Math.abs(dy)?dx<0?'left':'right':dy<0?'up':'down';
      image.setTexture(`basic-idle-${facing}-0`).setScale(65/image.height);
    });
  }
  /** A bone-white hooked claw with red spines, drawn around its centre. */
  private drawClaw(g:Phaser.GameObjects.Graphics,x:number,y:number,angle:number){
    const pts:{x:number;y:number}[]=[],cos=Math.cos(angle),sin=Math.sin(angle);
    const put=(u:number,v:number)=>({x:x+u*cos-v*sin,y:y+u*sin+v*cos});
    for(let i=0;i<=10;i++){const t=i/10;pts.push(put(-26+52*t,-14*Math.sin(t*Math.PI)-8*t*t));}
    for(let i=10;i>=0;i--){const t=i/10;pts.push(put(-26+48*t,6-6*Math.sin(t*Math.PI)-12*t*t));}
    g.fillStyle(0x3b2a1e,1).fillPoints(pts.map(p=>({x:p.x+1.5,y:p.y+1.5})),true);
    g.fillStyle(0xf2ead8,1).fillPoints(pts,true);
    g.lineStyle(2,0x3b2a1e,1).strokePoints(pts,true);
    for(let i=0;i<4;i++){
      const t=.15+i*.18,base=put(-26+52*t,-14*Math.sin(t*Math.PI)-8*t*t),tip=put(-26+52*t-4,-14*Math.sin(t*Math.PI)-8*t*t-11);
      const side=put(-26+52*t+7,-14*Math.sin(t*Math.PI)-8*t*t);
      g.fillStyle(0xc0262b,1).fillTriangle(base.x,base.y,side.x,side.y,tip.x,tip.y);
    }
  }
  private updateRenewal(s:KhangChienRuntime,paused:boolean){
    const camera=this.scene.cameras.main,reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(paused || reduced)camera.shakeEffect.reset();
    else if(stageAge(s)%3<.2 && !camera.shakeEffect.isRunning)camera.shake(220,.0008);
    this.groundwater??=this.scene.add.graphics().setDepth(1700);
    this.renewalAura??=this.scene.add.image(0,0,'water-swamp-11','0').setDepth(1600);
    const graphics=this.groundwater.clear(),step=renewalStep(s),p=s.run.player.position,age=stageAge(s);
    this.renewalAura.setVisible(step==='draw');
    if(step!=='draw')return;
    const elapsed=age-B.renewal.returnSeconds-B.renewal.prayerSeconds,t=Math.min(1,elapsed/B.renewal.drawSeconds);
    this.renewalAura.setPosition(p.x,p.y+8).setDisplaySize(130+40*t,65+20*t).setAlpha(.5+.3*t).setTexture('water-swamp-11',String(Math.floor(elapsed*8)%2));
    const color=(base:number)=>multiplyWaterColor(base,this.tint);
    graphics.lineStyle(2,color(0x75e9ff),.85).strokeEllipse(p.x,p.y+12,130,50);
    for(let i=0;i<8;i++){
      const progress=reduced ? .5 : (elapsed*1.15+i/8)%1,a=i*Math.PI/4;
      const x=p.x+Math.cos(a)*85*(1-progress)+Math.sin(progress*Math.PI*2+a)*10;
      const y=p.y+100*(1-progress)-55*progress;
      graphics.lineStyle(3,color(0x55d8ff),.8).lineBetween(x+Math.cos(a)*7,y+15,x,y);
      graphics.fillStyle(color(0xcafaff),.95).fillCircle(x,y,3+progress*3);
      const flow=(elapsed*.7+i/8)%1;
      graphics.fillStyle(color(0x8deeff),.8).fillCircle(p.x+(R.x-p.x)*flow,p.y-55+(R.y-p.y+55)*flow-Math.sin(flow*Math.PI)*65,4);
    }
    graphics.fillStyle(color(0x59dfff),.18).fillCircle(p.x,p.y-45,28+Math.sin(elapsed*4)*4);
    graphics.fillStyle(color(0xcffaff),.85).fillCircle(p.x,p.y-45,8);
  }
  private clearRenewal(){this.groundwater?.destroy();this.renewalAura?.destroy();this.groundwater=undefined;this.renewalAura=undefined;}
  burst(position:{x:number;y:number},eight:boolean,targets?:readonly {x:number;y:number}[]){
    const points=eight && targets?.length?targets:[position];
    const unique=points.filter((p,i)=>points.findIndex(other=>other.x===p.x && other.y===p.y)===i);
    for(const p of unique){
      const radius=eight?75:100,flash=this.scene.add.ellipse(p.x,p.y,30,12,multiplyWaterColor(0xc7f8ff,this.tint),.6).setDepth(p.y+.1);
      this.scene.tweens.add({targets:flash,scale:radius/15,alpha:0,duration:700,onComplete:()=>flash.destroy()});
      const splash=this.scene.add.image(p.x,p.y,'dragon-impact').setOrigin(.9,.56).setRotation(Math.PI/2).setDepth(p.y+3);
      splash.setScale((eight?180:260)/splash.width);
      this.scene.tweens.add({targets:splash,alpha:0,duration:900,onComplete:()=>splash.destroy()});
    }
    if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)this.scene.cameras.main.shake(eight?400:180,.006);
  }
  private clear(){this.orb?.destroy();this.pool?.destroy();this.swim?.destroy();this.dragon?.destroy();for(const d of [...this.eight,...this.volleys])d.destroy();
    this.formation?.destroy();this.formation=undefined;
    for(const image of this.celebrants)image.destroy();this.celebrants=[];this.counterblast?.destroy();this.counterblast=undefined;
    this.mist?.destroy();this.mist=undefined;this.claw?.destroy();this.claw=undefined;this.exploded=false;this.clawLanded=false;
    this.soul?.destroy();this.soul=undefined;this.cleansing?.destroy();this.cleansing=undefined;
    this.orb=undefined;this.pool=undefined;this.swim=undefined;this.dragon=undefined;this.eight=[];this.volleys=[];}
  destroy(){this.clear();this.clearRenewal();if(this.lastPhase==='transition')this.scene.cameras.main.shakeEffect.reset();}
}
