import Phaser from 'phaser';
import type { Point } from '../../world/definitions';
import type { WoodArcherContext } from '../../gameplay/characters/jobs/archer/WoodArcherSkills';
import { woodGroveConnection } from '../../gameplay/characters/jobs/archer/WoodArcherSkills';
import type { WoodEvent, WoodUltimate } from '../../gameplay/characters/jobs/archer/WoodArcherState';
interface Burst {position:Point;bornAt:number;radius:number;ultimate:boolean;type:string}
interface Leaf {image:Phaser.GameObjects.Image;bornAt:number;life:number;from:Point;velocity:Point;spin:number;size:number}
interface ArrowArt {image:Phaser.GameObjects.Image;trail:Point[]}
const GREEN=0x8ceabb,GOLD=0xf0d88d;
/** Owns bounded presentation objects only; hit, timers and resource state come from gameplay. */
export class WoodArcherEffects {
  private scene:Phaser.Scene;private ground:Phaser.GameObjects.Graphics;private light:Phaser.GameObjects.Graphics;
  private veil:Phaser.GameObjects.Graphics;
  private arrows=new Map<number,ArrowArt>();private plants=new Map<string,Phaser.GameObjects.Image>();
  private rain:Phaser.GameObjects.Image[]=[];private leaves:Leaf[]=[];private bursts:Burst[]=[];
  private reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  constructor(scene:Phaser.Scene){this.scene=scene;this.veil=scene.add.graphics().setDepth(0);
    this.ground=scene.add.graphics().setDepth(2);this.light=scene.add.graphics().setDepth(9000).setBlendMode(Phaser.BlendModes.ADD);}
  handle(events:readonly WoodEvent[],ctx:WoodArcherContext):void {
    for(const e of events){
      if(e.kind==='impact'){
        const ultimate=e.ultimate??false;
        this.bursts.push({position:{...e.position},bornAt:e.at,radius:e.radius,ultimate,type:e.type});
        if(this.bursts.length>40)this.bursts.shift();
        this.scatter(e.position,e.at,ultimate?18:8,ultimate?1: .7);
        if(ultimate&&e.type!=='ultimate-end'&&!this.reduced)this.scene.cameras.main.shake(e.type==='volley'?110:65,.0025);
      }else if(e.kind==='cast'&&e.skill==='r'){
        this.scatter({x:ctx.position.x,y:ctx.position.y-30},e.at,24,1.2);
        this.bursts.push({position:{...ctx.position},bornAt:e.at,radius:60,ultimate:false,type:'r'});
      }else if(e.kind==='launch'&&e.arrow.skill==='ultimate'&&!this.reduced){
        this.scene.cameras.main.shake(90,.002);this.scene.cameras.main.flash(70,95,165,95,false);
      }
    }
  }
  private scatter(position:Point,at:number,count:number,scale:number):void {
    for(let i=0;i<count&&this.leaves.length<180;i++){
      const angle=i/count*Math.PI*2+at*2,speed=(30+(i%5)*20)*scale;
      const image=this.scene.add.image(position.x,position.y,'wood-leaf').setDepth(9001).setBlendMode(Phaser.BlendModes.ADD);
      this.leaves.push({image,bornAt:at,life:.6+(i%4)*.18,from:{...position},velocity:{x:Math.cos(angle)*speed,y:Math.sin(angle)*speed-25},
        spin:(i%2?1:-1)*(1+i%3),size:(5+i%4)*scale});
    }
  }
  private ring(point:Point,radius:number,time:number,alpha:number,ornate=false):void {
    const g=this.ground;
    g.fillStyle(0x123c2b,alpha*.22).fillCircle(point.x,point.y,radius);
    g.lineStyle(7,GREEN,alpha*.13).strokeCircle(point.x,point.y,radius);
    g.lineStyle(1.5,GOLD,alpha*.8).strokeCircle(point.x,point.y,radius);
    g.lineStyle(1,GREEN,alpha*.45).strokeCircle(point.x,point.y,radius*.88);
    const count=ornate?18:10;
    for(let i=0;i<count;i++){
      const angle=i/count*Math.PI*2+(ornate?time*.08:0),r=radius*.94;
      const x=point.x+Math.cos(angle)*r,y=point.y+Math.sin(angle)*r;
      g.lineStyle(1,GOLD,alpha*.75).beginPath().moveTo(x-Math.cos(angle+.5)*5,y-Math.sin(angle+.5)*5)
        .lineTo(x+Math.cos(angle)*7,y+Math.sin(angle)*7).lineTo(x-Math.cos(angle-.5)*5,y-Math.sin(angle-.5)*5).strokePath();
      if(ornate)g.lineStyle(1,GREEN,alpha*.3).lineBetween(point.x+Math.cos(angle)*radius*.63,point.y+Math.sin(angle)*radius*.63,x,y);
    }
  }
  private plant(key:string,point:Point,width:number,height:number,alpha:number,flip=false):void {
    let image=this.plants.get(key);if(!image){image=this.scene.add.image(point.x,point.y,'wood-bramble').setOrigin(.5,.91);this.plants.set(key,image);}
    image.setPosition(point.x,point.y).setDisplaySize(width,height).setAlpha(alpha).setFlipX(flip).setDepth(point.y+1);
  }
  update(ctx:WoodArcherContext):void {
    const now=ctx.now,s=ctx.archer.wood;this.ground.clear();this.light.clear();this.veil.clear();
    if(ctx.archer.resources.currentHp<=0){this.clear();return;}
    if(s.ultimate){const u=s.ultimate,fade=Math.min(1,(now-u.bornAt)/.25,(u.endsAt-now)/.35);
      const view=this.scene.cameras.main.worldView;
      this.veil.fillStyle(0x031c17,.48*Math.max(0,fade)).fillRect(view.x-16,view.y-16,view.width+32,view.height+32);}
    const activeArrows=new Set<number>();
    for(const arrow of s.arrows){
      activeArrows.add(arrow.id);let art=this.arrows.get(arrow.id);
      if(!art){art={image:this.scene.add.image(0,0,'wood-arrow').setOrigin(.92,.5).setBlendMode(Phaser.BlendModes.ADD),trail:[]};this.arrows.set(arrow.id,art);}
      const p=arrow.projectile.position,dir=arrow.projectile.direction,width=arrow.skill==='ultimate'?420:arrow.skill==='q'?110:arrow.skill==='secondary'?80:65;
      art.image.setPosition(p.x,p.y).setRotation(Math.atan2(dir.y,dir.x)).setDisplaySize(width,width/3).setDepth(p.y+30).setAlpha(arrow.skill==='ultimate'?.98:.85);
      const prior=art.trail.at(-1);if(!prior||Math.hypot(prior.x-p.x,prior.y-p.y)>4)art.trail.push({...p});
      if(art.trail.length>12)art.trail.shift();
      for(let i=1;i<art.trail.length;i++){
        const a=art.trail[i-1],b=art.trail[i],alpha=i/art.trail.length;
        this.light.lineStyle(arrow.skill==='ultimate'?18:5,GREEN,alpha*.12).lineBetween(a.x,a.y,b.x,b.y);
        this.light.lineStyle(arrow.skill==='ultimate'?5:1,GOLD,alpha*.65).lineBetween(a.x,a.y,b.x,b.y);
      }
    }
    for(const [id,art] of this.arrows)if(!activeArrows.has(id)){art.image.destroy();this.arrows.delete(id);}
    const activePlants=new Set<string>();
    for(const field of s.fields){
      if(field.kind==='path'&&field.end){const a=field.position,b=field.end,alpha=Math.min(1,(field.expiresAt-now)/.5);
        this.ground.lineStyle(20,0x173d29,.2*alpha).lineBetween(a.x,a.y,b.x,b.y);
        this.ground.lineStyle(2,GOLD,.55*alpha).lineBetween(a.x,a.y,b.x,b.y);
        const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/24));
        for(let i=0;i<n;i++){const t=i/n,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;
          this.light.lineStyle(2,GREEN,.5*alpha).lineBetween(x,y,x+Math.sin(i)*6,y-13-Math.cos(i)*5);}
        continue;
      }
      if(field.kind==='seed'){
        const p=field.projectile?.active?field.projectile.position:field.position;
        const flight=field.projectile?.active?Math.sin(Math.PI*Math.min(1,(now-field.bornAt)/Math.max(.01,field.armsAt-field.bornAt-.45)))*28:0;
        this.light.fillStyle(GOLD,.7).fillCircle(p.x,p.y-flight,5);this.light.lineStyle(2,GREEN,.6).strokeCircle(p.x,p.y-flight,9+Math.sin(now*6)*2);
        if(!field.projectile?.active)this.ring(field.position,field.radius,now,now<field.armsAt?.3:.6);
      }else{
        const age=now-field.bornAt,growth=Math.min(1,age/.45),fade=Math.min(1,(field.expiresAt-now)/.5);
        this.ring(field.position,field.radius,now,.65*fade,true);
        for(let i=0;i<3;i++){const angle=i/3*Math.PI*2+.4,point={x:field.position.x+Math.cos(angle)*field.radius*.6,y:field.position.y+Math.sin(angle)*field.radius*.6};
          const key=`f${field.id}:${i}`;activePlants.add(key);this.plant(key,point,80*growth,50*growth,.65*fade,i%2===0);}
      }
    }
    const connection=woodGroveConnection(ctx);
    if(connection){const a=connection.from,b=connection.to;this.ground.lineStyle(30,0x247b46,.14).lineBetween(a.x,a.y,b.x,b.y);
      this.light.lineStyle(2,GOLD,.7).lineBetween(a.x,a.y,b.x,b.y);const count=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/20);
      for(let i=0;i<count;i++){const t=i/count,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;
        this.light.fillStyle(GREEN,.6).fillEllipse(x,y-2+Math.sin(now*2+i)*3,8,4);}}
    const u=s.ultimate;if(u)this.drawUltimate(ctx,u,activePlants);
    else for(const image of this.rain)image.setVisible(false);
    if(s.r.charges>0&&s.r.expiresAt>now){
      this.ring(ctx.position,23+Math.sin(now*4)*2,now,.7);
      for(let i=0;i<s.r.charges;i++){const angle=now*1.3+i/3*Math.PI*2;
        this.light.fillStyle(GOLD,.8).fillCircle(ctx.position.x+Math.cos(angle)*28,ctx.position.y-35+Math.sin(angle)*12,3);}
    }
    const target=s.mark?ctx.bodies.find(b=>b.id===s.mark!.targetId):undefined;
    if(target){this.ring(target.position,22,now,.75);const y=target.position.y-70;
      this.light.lineStyle(2,GOLD,.9).beginPath().moveTo(target.position.x,y-8).lineTo(target.position.x+7,y).lineTo(target.position.x,y+8).lineTo(target.position.x-7,y).closePath().strokePath();}
    for(const [key,image] of this.plants)if(!activePlants.has(key)){image.destroy();this.plants.delete(key);}
    this.bursts=this.bursts.filter(b=>now-b.bornAt<.8);
    for(const b of this.bursts){const t=Math.max(0,(now-b.bornAt)/.8),r=b.radius*(.25+t),alpha=1-t;
      this.light.lineStyle(b.ultimate?9:4,GREEN,alpha*.2).strokeCircle(b.position.x,b.position.y,r);
      this.light.lineStyle(b.ultimate?2:1,GOLD,alpha*.85).strokeCircle(b.position.x,b.position.y,r*.94);
      const count=b.ultimate?16:8;
      for(let i=0;i<count;i++){const angle=i/count*Math.PI*2+t*.35,x=b.position.x+Math.cos(angle)*r,y=b.position.y+Math.sin(angle)*r;
        this.light.lineStyle(2,GOLD,alpha*.5).lineBetween(x,y,x+Math.cos(angle)*12*alpha,y+Math.sin(angle)*12*alpha);}}
    for(const leaf of this.leaves){const t=now-leaf.bornAt;
      leaf.image.setPosition(leaf.from.x+leaf.velocity.x*t,leaf.from.y+leaf.velocity.y*t+25*t*t)
        .setRotation(t*leaf.spin).setAlpha(Math.max(0,1-t/leaf.life)).setDisplaySize(leaf.size,leaf.size*.6);}
    for(let i=this.leaves.length-1;i>=0;i--)if(now-this.leaves[i].bornAt>=this.leaves[i].life){this.leaves[i].image.destroy();this.leaves.splice(i,1);}
  }
  private drawUltimate(ctx:WoodArcherContext,u:WoodUltimate,plants:Set<string>):void {
    const now=ctx.now,t=now-u.bornAt,charge=Math.min(1,t/(u.opensAt-u.bornAt)),center={x:ctx.position.x,y:ctx.position.y-28};
    if(now<=u.castEndsAt){
      this.ring(ctx.position,28+charge*45,now,.7,true);
      const heading=Math.atan2(u.direction.y,u.direction.x),radius=65+charge*85;
      if(u.kind==='hunt'){
        for(let layer=0;layer<3;layer++)this.light.lineStyle(layer===0?12:layer===1?4:1,layer===1?GOLD:GREEN,(.1+charge*.35)/(layer===0?2:1))
          .beginPath().arc(center.x,center.y,radius,heading-Math.PI*.62,heading+Math.PI*.62).strokePath();
        const start={x:center.x+Math.cos(heading-Math.PI*.62)*radius,y:center.y+Math.sin(heading-Math.PI*.62)*radius};
        const end={x:center.x+Math.cos(heading+Math.PI*.62)*radius,y:center.y+Math.sin(heading+Math.PI*.62)*radius};
        const pull={x:center.x-u.direction.x*(15+charge*45),y:center.y-u.direction.y*(15+charge*45)};
        this.light.lineStyle(2,GOLD,.65+charge*.3).beginPath().moveTo(start.x,start.y).lineTo(pull.x,pull.y).lineTo(end.x,end.y).strokePath();
        this.light.lineStyle(8,GREEN,charge*.25).lineBetween(pull.x,pull.y,center.x+u.direction.x*100,center.y+u.direction.y*100);
        this.light.lineStyle(2,0xf6ffe1,charge*.9).lineBetween(pull.x,pull.y,center.x+u.direction.x*100,center.y+u.direction.y*100);
        for(let i=0;i<12;i++){const angle=heading-Math.PI*.62+i/11*Math.PI*1.24;
          this.light.fillStyle(GOLD,charge*.8).fillEllipse(center.x+Math.cos(angle)*radius,center.y+Math.sin(angle)*radius,7,3);}
      }else this.ring(u.position,u.radius*charge,now,.8,true);
      for(let i=0;i<18;i++){const angle=i/18*Math.PI*2+now*1.2,r=70*(1-charge)+20;
        this.light.fillStyle(i%3?GREEN:GOLD,.35+charge*.5).fillCircle(center.x+Math.cos(angle)*r,center.y+Math.sin(angle)*r*.65,1+i%3);}
    }
    if(u.kind!=='grove'){for(const image of this.rain)image.setVisible(false);return;}
    const age=Math.max(0,now-u.opensAt),growth=Math.min(1,age/.55),fade=Math.min(1,(u.endsAt-now)/.6);
    this.ring(u.position,u.radius,now,.7,true);
    if(now>=u.opensAt){
      const trunk=`u${u.id}:trunk`;plants.add(trunk);
      this.plant(trunk,{x:u.position.x,y:u.position.y+60},300*growth,250*growth,.97*fade);
      for(let i=0;i<7;i++){const angle=i/7*Math.PI*2,point={x:u.position.x+Math.cos(angle)*u.radius*.77,y:u.position.y+Math.sin(angle)*u.radius*.77},key=`u${u.id}:${i}`;
        plants.add(key);this.plant(key,point,(150+i%3*20)*growth,(110+i%3*20)*growth,.95*fade,i%2===0);}
      this.light.lineStyle(3,GOLD,.65*fade).strokeCircle(u.position.x,u.position.y,u.radius);
      for(let i=0;i<12;i++){const angle=i/12*Math.PI*2+now*.14,r=u.radius*.64;
        this.light.fillStyle(GREEN,.45).fillEllipse(u.position.x+Math.cos(angle)*r,u.position.y+Math.sin(angle)*r,6,3);}
    }
    const volley=[u.opensAt,u.opensAt+1,u.opensAt+2].find(at=>now>=at-.55&&now<at);
    if(volley===undefined){for(const image of this.rain)image.setVisible(false);return;}
    for(let i=0;i<12;i++){
      if(!this.rain[i])this.rain[i]=this.scene.add.image(0,0,'wood-arrow').setOrigin(.92,.5).setBlendMode(Phaser.BlendModes.ADD).setDepth(9010);
      const angle=i/12*Math.PI*2,r=(.15+(i%3)*.25)*u.radius,land={x:u.position.x+Math.cos(angle)*r,y:u.position.y+Math.sin(angle)*r};
      const p=(now-(volley-.55))/.55,dx=55,dy=340;
      this.rain[i].setVisible(true).setPosition(land.x-dx*(1-p),land.y-dy*(1-p)).setRotation(Math.atan2(dy,dx))
        .setDisplaySize(190,63).setAlpha(Math.min(1,p*3));
      this.light.lineStyle(2,GOLD,.55*p).lineBetween(land.x-dx*(1-p),land.y-dy*(1-p),land.x-dx*(1-p)-16,land.y-dy*(1-p)-90);
    }
  }
  clear(){this.ground.clear();this.light.clear();this.veil.clear();for(const a of this.arrows.values())a.image.destroy();this.arrows.clear();
    for(const p of this.plants.values())p.destroy();this.plants.clear();for(const p of this.leaves)p.image.destroy();this.leaves=[];this.bursts=[];
    for(const p of this.rain)p.setVisible(false);}
  destroy(){this.clear();for(const p of this.rain)p.destroy();this.rain=[];this.ground.destroy();this.light.destroy();this.veil.destroy();}
}
