import type Phaser from 'phaser';
import { createMageModelTextures } from './mageModel';

export function createMageCastingTextures(scene: Phaser.Scene): void {
  createMageModelTextures(scene);
}

// Extraction coordinates use the 2048 × 694 reference display; source is 2155 × 730.
const SOURCE_DISPLAY_WIDTH = 2048;
export const WATER_CANNON_VISUAL = Object.freeze({
  castMuzzleRight: { x: 22, y: -65 },
  muzzleRight: { x: 28, y: -37 }, projectileWidth: 72, projectileMinScale: 0.2, orbMaxWidth: 34,
  impactSeconds: 1,
});
export function createWaterCannonTextures(scene: Phaser.Scene): void {
  const cachedKeys=['water-projectile','water-q-ready','water-q-command','water-charge','water-full','water-cast-start',
    'water-rise-low','water-rise-full',...Array.from({length:8},(_,i)=>`water-full-loop-${i}`),
    ...Array.from({length:4},(_,i)=>`water-orb-${i}`)];
  if(cachedKeys.every(key=>scene.textures.exists(key)))return;
  createMageCastingTextures(scene);
  const water=scene.textures.get('water-charge-water-source').getSourceImage() as HTMLImageElement;
  for(const [key,x,width] of [['water-rise-low',0,940],['water-rise-full',940,1020]] as const){
    const out=document.createElement('canvas');out.width=width;out.height=water.height;
    out.getContext('2d')!.drawImage(water,x,0,width,water.height,0,0,width,water.height);
    if(scene.textures.exists(key))scene.textures.remove(key);scene.textures.addCanvas(key,out);
  }
  const loop=scene.textures.get('water-full-loop-source').getSourceImage() as HTMLImageElement;
  const cellWidth=loop.width/4,cellHeight=loop.height/2;
  for(let frame=0;frame<8;frame++){
    const crop=document.createElement('canvas');crop.width=cellWidth;crop.height=cellHeight;
    const ctx=crop.getContext('2d',{willReadFrequently:true})!;
    ctx.drawImage(loop,(frame%4)*cellWidth,Math.floor(frame/4)*cellHeight,cellWidth,cellHeight,0,0,cellWidth,cellHeight);
    const data=ctx.getImageData(0,0,cellWidth,cellHeight).data;
    // Align the dense base of each ring, ignoring scattered droplets/faint fringe.
    let baseline=cellHeight-1;
    for(let y=cellHeight-1;y>=0;y--){
      let count=0;for(let x=0;x<cellWidth;x++)if(data[(y*cellWidth+x)*4+3]>128)count++;
      if(count>cellWidth*0.3){baseline=y;break;}
    }
    const out=document.createElement('canvas');out.width=cellWidth;out.height=cellHeight;
    out.getContext('2d')!.drawImage(crop,0,cellHeight-18-baseline);
    const key=`water-full-loop-${frame}`;
    if(scene.textures.exists(key))scene.textures.remove(key);scene.textures.addCanvas(key,out);
  }
  const source=scene.textures.get('water-cannon-source').getSourceImage() as HTMLImageElement;
  const ratio=source.width/SOURCE_DISPLAY_WIDTH;
  const crops: { key: string; rect: number[]; pose?: boolean }[] = [
    {key:'water-orb-0',rect:[8,470,151,164]},
    {key:'water-orb-1',rect:[166,470,151,164]},
    {key:'water-orb-2',rect:[327,470,151,164]},
    {key:'water-orb-3',rect:[486,470,151,164]},
    {key:'water-projectile',rect:[922,498,185,112]},
  ];
  for(const crop of crops) {
    const [x,y,w,h]=crop.rect.map(n=>Math.round(n*ratio));
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
    const ctx=canvas.getContext('2d',{willReadFrequently:true})!;ctx.drawImage(source,x,y,w,h,0,0,w,h);
    const data=ctx.getImageData(0,0,w,h),pixels=data.data;
    // The sheet is flattened over black. Preserve dark character details;
    // only key near-black pixels, including enclosed gaps between limbs.
    for(let i=0;i<pixels.length;i+=4){
      const intensity=Math.max(pixels[i],pixels[i+1],pixels[i+2]);
      if(crop.pose){
        if(intensity<=5)pixels[i+3]=0;
      }else{
        // Recover a straight-alpha VFX texture from its black matte.
        // Normal blending then retains blue saturation instead of adding map colour.
        const alpha=intensity/255;
        pixels[i+3]=intensity;
        if(alpha>0){pixels[i]/=alpha;pixels[i+1]/=alpha;pixels[i+2]/=alpha;}
      }
    }
    ctx.putImageData(data,0,0);
    let output=canvas;
    if(crop.pose){
      output=document.createElement('canvas');output.width=96;output.height=80;
      const out=output.getContext('2d')!,scale=64/h;
      out.drawImage(canvas,48-w*scale/2,72-h*scale,w*scale,h*scale);
    }
    if(scene.textures.exists(crop.key))scene.textures.remove(crop.key);
    scene.textures.addCanvas(crop.key,output);
  }
}
