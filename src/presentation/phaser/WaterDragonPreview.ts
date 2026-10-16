import type Phaser from 'phaser';
import type { Point } from '../../world/definitions';
import { WATER_MAGE_COPY_TIMING as COPY } from '../../config/balance/waterMage';

// Presentation preview only. None of these values are combat balance.
export const DRAGON_PREVIEW={swing:0.12,orbRise:0.22,orbSpin:0.3,orbLift:55,orbWidth:34,orbRotation:0.5,water:0.2,form:0.42,formedHold:0.22,anticipation:0.4,dive:0.65,impact:0.18,poseBlend:0.08,impactWidth:140,impactAnchor:{x:0.9,y:0.56},lift:88};
// Every flight frame uses the same world-space head position.
const FLIGHT_POSES=[
  {x:0.77,y:0.23,angle:0},
  {x:0.78,y:0.43,angle:Math.PI/4},
  {x:0.83,y:0.81,angle:Math.PI/4},
  {x:0.83,y:0.88,angle:Math.PI/4},
] as const;
const DIVE_HEADS=[{x:424,y:311},{x:994,y:586},{x:1537,y:637},{x:1982,y:615}] as const;
interface DragonTextureFrame { pixels:Uint8ClampedArray; width:number; height:number; head:Point }
interface DragonTextureData { dragonHead?:Point }
/** Q flight artwork, aligned by its head to a world-space direction. */
export function placeDragonFlightPose(image:Phaser.GameObjects.Image,key:number,x:number,y:number,angle:number,height:number):void {
  const pose=FLIGHT_POSES[key-2];
  image.setTexture(`dragon-key-${key}`);
  const head=(image.texture.customData as DragonTextureData).dragonHead??pose;
  const facingLeft=Math.cos(angle)<0,nativeAngle=facingLeft?Math.PI-pose.angle:pose.angle;
  const difference=angle-nativeAngle,rotation=Math.atan2(Math.sin(difference),Math.cos(difference));
  image.setFlipX(facingLeft).setOrigin(facingLeft?1-head.x:head.x,head.y)
    .setPosition(x,y).setRotation(rotation).setScale(height/image.height);
}
/** The supplied sheet has overlapping bounding boxes, not four equal-width cells. */
export function splitDragonDiveFrames(pixels:Uint8ClampedArray,width:number,height:number):DragonTextureFrame[] {
  const size=width*height,labels=new Uint32Array(size),queue=new Uint32Array(size);
  const parts:{id:number;count:number;minX:number;minY:number;maxX:number;maxY:number}[]=[];
  for(let seed=0;seed<size;seed++){
    if(labels[seed] || pixels[seed*4+3]===0)continue;
    const part={id:parts.length+1,count:1,minX:width,minY:height,maxX:0,maxY:0};
    queue[0]=seed;labels[seed]=part.id;
    for(let read=0;read<part.count;read++){
      const index=queue[read],x=index%width,y=(index/width)|0;
      if(x<part.minX)part.minX=x;if(x>part.maxX)part.maxX=x;
      if(y<part.minY)part.minY=y;if(y>part.maxY)part.maxY=y;
      const minX=x>0?x-1:0,maxX=x+1<width?x+1:x,minY=y>0?y-1:0,maxY=y+1<height?y+1:y;
      for(let ny=minY;ny<=maxY;ny++){
        for(let nx=minX;nx<=maxX;nx++){
          const next=ny*width+nx;
          if(!labels[next] && pixels[next*4+3]>0){labels[next]=part.id;queue[part.count++]=next;}
        }
      }
    }
    parts.push(part);
  }
  const poses=parts.sort((a,b)=>b.count-a.count).slice(0,4).sort((a,b)=>a.minX-b.minX);
  if(poses.length!==4)throw new Error('Dragon dive sheet must contain four separate water silhouettes.');
  // A shared canvas size keeps pixel scale stable when the body bends between frames.
  const outWidth=Math.max(...poses.map(p=>p.maxX-p.minX+1))+4;
  const outHeight=Math.max(...poses.map(p=>p.maxY-p.minY+1))+4;
  return poses.map((part,i)=>{
    const output=new Uint8ClampedArray(outWidth*outHeight*4);
    for(let y=part.minY;y<=part.maxY;y++)for(let x=part.minX;x<=part.maxX;x++){
      const index=y*width+x;if(labels[index]!==part.id)continue;
      const dest=((y-part.minY+2)*outWidth+x-part.minX+2)*4;
      const src=index*4;
      output[dest]=pixels[src];output[dest+1]=pixels[src+1];output[dest+2]=pixels[src+2];output[dest+3]=pixels[src+3];
    }
    const head=DIVE_HEADS[i];
    return {pixels:output,width:outWidth,height:outHeight,
      head:{x:(head.x*width/2172-part.minX+2)/outWidth,y:(head.y*height/724-part.minY+2)/outHeight}};
  });
}
export function lockDragonGroundPosition(aim: Point): Point {
  if (![aim.x, aim.y].every(Number.isFinite)) throw new Error('Invalid Q ground position.');
  return { ...aim };
}
export function prepareDragonPreviewTextures(scene: Phaser.Scene): void {
  if(Array.from({length:6},(_,i)=>`dragon-key-${i}`).every(key=>scene.textures.exists(key)))return;
  const source=scene.textures.get('dragon-formation-source').getSourceImage() as HTMLImageElement;
  const width=source.width/3;
  for(let i=0;i<3;i++){
    const canvas=document.createElement('canvas');canvas.width=Math.round(width);canvas.height=source.height;
    canvas.getContext('2d')!.drawImage(source,i*width,0,width,source.height,0,0,canvas.width,canvas.height);
    const key=`dragon-key-${i}`;if(scene.textures.exists(key))scene.textures.remove(key);scene.textures.addCanvas(key,canvas);
  }
  const dive=scene.textures.get('dragon-dive-source').getSourceImage() as HTMLImageElement;
  const sheet=document.createElement('canvas');sheet.width=dive.width;sheet.height=dive.height;
  const context=sheet.getContext('2d',{willReadFrequently:true})!;context.drawImage(dive,0,0);
  const frames=splitDragonDiveFrames(context.getImageData(0,0,dive.width,dive.height).data,dive.width,dive.height);
  for(const [i,frame] of frames.entries()){
    const canvas=document.createElement('canvas');canvas.width=frame.width;canvas.height=frame.height;
    const ctx=canvas.getContext('2d')!,data=ctx.createImageData(frame.width,frame.height);
    data.data.set(frame.pixels);ctx.putImageData(data,0,0);
    const key=`dragon-key-${i+3}`;if(scene.textures.exists(key))scene.textures.remove(key);
    scene.textures.addCanvas(key,canvas)!.customData={dragonHead:frame.head};
  }
}
/** A cast owns its sprites; reaching the endpoint is a visual cue, never ConfirmedHit. */
export class WaterDragonPreview {
  private age=0;
  private readonly endpoint: Point;
  private image: Phaser.GameObjects.Image;
  private ghost: Phaser.GameObjects.Image;
  private orb: Phaser.GameObjects.Image;
  private launchOrigin?:Point;
  private marker: Phaser.GameObjects.Arc;
  private start: Point;
  private formationWidth:number;
  private originMode: 'staff' | 'mirror';
  private elapsed=0;
  private chargeMultiplier:number;
  private lastKey=0;
  private ghostKey=0;
  private transition=1;
  private impactStarted=false;
  phase='swing';
  done=false;
  get openingPoseActive():boolean {
    const C=DRAGON_PREVIEW;
    return this.originMode==='staff' && !this.done && this.age<C.swing+C.orbRise+C.orbSpin+C.water+C.form;
  }
  get movementLocked():boolean {return this.originMode==='staff' && !this.done && this.phase!=='dive' && this.phase!=='impact';}
  get commandActive():boolean {
    const C=DRAGON_PREVIEW;
    return this.originMode==='staff' && !this.done && (this.phase==='anticipation' || this.phase==='dive')
      && this.age>=C.swing+C.orbRise+C.orbSpin+C.water+C.form+C.formedHold;
  }
  constructor(scene: Phaser.Scene, origin: Point, targetPosition: Point, radius=17, originMode: 'staff' | 'mirror' = 'staff', chargeMultiplier=1){
    this.originMode=originMode;
    this.chargeMultiplier=chargeMultiplier;
    this.endpoint=lockDragonGroundPosition(targetPosition);
    const mirrored=originMode==='mirror';
    this.start=mirrored?{...origin}:{x:origin.x,y:origin.y-DRAGON_PREVIEW.lift};
    if(mirrored){this.launchOrigin={...origin};this.phase='flash';this.lastKey=3;this.ghostKey=3;}
    this.image=scene.add.image(origin.x,origin.y,mirrored?'dragon-key-3':'dragon-key-0').setOrigin(0.5,1).setVisible(false);
    this.formationWidth=this.image.width*DRAGON_PREVIEW.lift/this.image.height;
    this.ghost=scene.add.image(origin.x,origin.y,'dragon-key-0').setVisible(false);
    this.orb=scene.add.image(origin.x,origin.y,'water-orb-3').setVisible(false);
    this.marker=scene.add.circle(this.endpoint.x,this.endpoint.y,radius).setStrokeStyle(2,0x72e8ff,0.8);
  }
  update(seconds:number,origin:Point):void {
    if(this.done)return;
    this.elapsed+=seconds;
    const C=DRAGON_PREVIEW,waterAt=C.swing+C.orbRise+C.orbSpin;
    const charge=C.swing+C.orbRise+C.orbSpin+C.water+C.form+C.anticipation;
    this.age=this.originMode==='mirror'?this.elapsed:this.elapsed<charge*this.chargeMultiplier
      ?this.elapsed/this.chargeMultiplier:charge+this.elapsed-charge*this.chargeMultiplier;
    const mirrored=this.originMode==='mirror';
    const formed=waterAt+C.water+C.form,diveAt=mirrored?COPY.flash:formed+C.anticipation;
    const flightSeconds=mirrored?COPY.qFlight:C.dive,impactAt=diveAt+flightSeconds;
    if(mirrored && this.age<diveAt){this.phase='flash';return;}
    if(!mirrored && this.age<C.swing){this.phase='swing';return;}
    if(!this.launchOrigin)this.launchOrigin={...origin};
    const launch=this.launchOrigin;
    const orbLift=mirrored?0:C.orbLift;
    if(!mirrored && this.age<waterAt){
      const rise=Math.min(1,(this.age-C.swing)/C.orbRise);
      this.phase=rise<1?'orb-rise':'orb-spin';
      this.orb.setVisible(true).setPosition(launch.x,launch.y-orbLift*(1-(1-rise)**2))
        .setScale(C.orbWidth/this.orb.width).setRotation((this.age-C.swing)*C.orbRotation).setAlpha(1).setDepth(launch.y+2);
      return;
    }
    origin={x:launch.x,y:launch.y-orbLift};
    const waterAge=this.age-waterAt;
    this.image.setVisible(true);
    this.orb.setVisible(!mirrored && waterAge<C.water).setPosition(origin.x,origin.y)
      .setRotation((this.age-C.swing)*C.orbRotation).setAlpha(Math.max(0,1-waterAge/C.water));
    if(this.age<diveAt){
      const key=waterAge<C.water?0:this.age<formed?1:2;
      const rise=Math.min(1,waterAge/C.water),form=Math.max(0,Math.min(1,(waterAge-C.water)/C.form));
      const turnProgress=Math.max(0,Math.min(1,(this.age-formed-C.formedHold)/(C.anticipation-C.formedHold)));
      const anticipation=turnProgress*turnProgress*(3-2*turnProgress);
      const face=this.endpoint.x<origin.x?-1:1;
      this.phase=key===2?'anticipation':'summon';
      // Asset 01 itself is the rising water jet, rooted at the raised staff orb.
      // Keep the base and height continuous as 01 broadens into 02, then 03.
      const height=C.lift*(key===0?0.03+0.97*(1-(1-rise)**2):1);
      const width=key===0?6+16*rise:22+(this.formationWidth-22)*form;
      this.beginPose(key);
      if(key<2){
        this.image.setTexture(`dragon-key-${key}`).setOrigin(0.5,0.98).setPosition(origin.x,origin.y)
          .setScale(width/this.image.width,height/this.image.height).setFlipX(face<0).setRotation(0);
        this.start={x:origin.x+face*0.27*width,y:origin.y-0.75*height};
      }else{
        this.start={x:origin.x+face*0.27*this.formationWidth,y:origin.y-0.75*C.lift-anticipation*6};
        const initialAngle=Math.atan2(this.endpoint.y-this.start.y,this.endpoint.x-this.start.x);
        const difference=initialAngle-(face<0?Math.PI:0),turn=Math.atan2(Math.sin(difference),Math.cos(difference));
        this.image.setTexture('dragon-key-2').setOrigin(face<0?0.23:0.77,0.23)
          .setPosition(this.start.x,this.start.y).setScale(C.lift/this.image.height)
          .setFlipX(face<0).setRotation(turn*anticipation);
      }
      this.image.setAlpha(1).setDepth(origin.y+2);
      if(this.ghost.visible && this.ghostKey<2){
        this.ghost.setPosition(origin.x,origin.y).setScale(width/this.ghost.width,height/this.ghost.height)
          .setFlipX(face<0).setDepth(this.image.depth+0.01);
      }
      this.blendPose(seconds,key<2?0.14:0.2);
    }else if(this.age<impactAt){
      this.phase='dive';
      const u=Math.min(1,(this.age-diveAt)/flightSeconds),t=0.12*u+0.88*u*u;
      const end=this.endpoint,a=this.start;
      const x=a.x+(end.x-a.x)*t,y=a.y+(end.y-a.y)*t;
      const angle=Math.atan2(end.y-a.y,end.x-a.x);
      // Two extra flight poses; bending is already drawn into the artwork.
      const flightKeys=[3,4,5,4,5];
      const key=mirrored?flightKeys[Math.min(4,Math.floor(u*5))]
        :u<0.12?2:flightKeys[Math.min(4,Math.floor((u-0.12)/0.88*5))];
      this.beginPose(key);
      // Dive poses face down-right. Anchor the head rather than the image centre.
      this.placeFlightPose(this.image,key,x,y,angle);
      this.image.setAlpha(1).setDepth(end.y+2);
      if(this.ghost.visible){
        if(this.ghostKey>=2){
          this.placeFlightPose(this.ghost,this.ghostKey,x,y,angle);
          this.ghost.setDepth(this.image.depth+0.01);
        }else this.ghost.setVisible(false);
      }
      this.blendPose(seconds);
    }else{
      this.phase='impact';const end=this.endpoint,u=Math.min(1,(this.age-impactAt)/C.impact);
      if(!this.impactStarted){
        this.impactStarted=true;
        this.ghost.setTexture(this.image.texture.key).setPosition(end.x,end.y)
          .setOrigin(this.image.originX,this.image.originY).setRotation(this.image.rotation)
          .setScale(this.image.scaleX,this.image.scaleY).setFlipX(this.image.flipX).setDepth(end.y+2).setVisible(true);
      }
      this.ghost.setAlpha(1-u);
      // Contact is near the right edge; rotate the plume up from the ground pivot.
      this.image.setTexture('dragon-impact').setOrigin(C.impactAnchor.x,C.impactAnchor.y).setFlipX(false).setRotation(Math.PI/2)
        .setPosition(end.x,end.y).setScale(C.impactWidth/this.image.width*(1+0.15*u)).setAlpha(1-u).setDepth(end.y+3);
      this.marker.setAlpha(1-u);
      if(u>=1){this.done=true;this.destroy();}
    }
  }
  private beginPose(key:number):void {
    if(key===this.lastKey)return;
    this.ghost.setTexture(this.image.texture.key).setOrigin(this.image.originX,this.image.originY)
      .setPosition(this.image.x,this.image.y).setScale(this.image.scaleX,this.image.scaleY)
      .setRotation(this.image.rotation).setFlipX(this.image.flipX).setAlpha(1).setDepth(this.image.depth+0.01).setVisible(true);
    this.ghostKey=this.lastKey;
    this.lastKey=key;this.transition=0;
  }
  private placeFlightPose(image:Phaser.GameObjects.Image,key:number,x:number,y:number,angle:number):void {
    placeDragonFlightPose(image,key,x,y,angle,DRAGON_PREVIEW.lift);
  }
  private blendPose(seconds:number,duration=DRAGON_PREVIEW.poseBlend):void {
    this.transition=Math.min(1,this.transition+seconds/duration);
    if(!this.ghost.visible)return;
    // Keep the incoming water opaque; complementary fades made it blink against the map.
    this.ghost.setAlpha(1-this.transition);
    if(this.transition===1)this.ghost.setVisible(false);
  }
  destroy():void {this.image.destroy();this.ghost.destroy();this.orb.destroy();this.marker.destroy();this.done=true;}
}
