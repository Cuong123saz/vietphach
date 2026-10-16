import type Phaser from 'phaser';
export function preloadArcher(scene:Phaser.Scene):void {
  scene.load.image('wood-poses','/assets/characters/archer/poses-v1.png');
  scene.load.image('wood-arrow','/assets/characters/archer/jade-arrow-v1.png');
  scene.load.image('wood-bramble','/assets/characters/archer/bramble-v1.png');
}
/** Deterministic atlas extraction, never treats painted effects as body geometry. */
export function prepareArcherTextures(scene:Phaser.Scene):void {
  if(scene.textures.exists('wood-idle-down'))return;
  const image=scene.textures.get('wood-poses').getSourceImage() as HTMLImageElement,w=Math.floor(image.width/4),h=Math.floor(image.height/2);
  const names=['idle-down','idle-right','idle-up','idle-left','run-right-0','run-right-1','fire','ultimate'];
  const frames=names.map((name,index)=>{
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
    const ctx=canvas.getContext('2d',{willReadFrequently:true})!;
    ctx.drawImage(image,(index%4)*w,Math.floor(index/4)*h,w,h,0,0,w,h);
    const data=ctx.getImageData(0,0,w,h);let x0=w,y0=h,x1=0,y1=0;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(data.data[(y*w+x)*4+3]>110){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
    return {name,canvas,x0,y0,x1,y1};
  });
  const scale=74/Math.max(...frames.map(f=>f.y1-f.y0+1));
  for(const f of frames){
    const canvas=document.createElement('canvas');canvas.width=288;canvas.height=288;
    const ctx=canvas.getContext('2d')!;ctx.scale(3,3);ctx.imageSmoothingQuality='high';
    const width=(f.x1-f.x0+1)*scale,height=(f.y1-f.y0+1)*scale;
    ctx.drawImage(f.canvas,f.x0,f.y0,f.x1-f.x0+1,f.y1-f.y0+1,48-width/2,85-height,width,height);
    scene.textures.addCanvas(`wood-${f.name}`,canvas);
  }
  if(!scene.anims.exists('wood-run-right'))scene.anims.create({key:'wood-run-right',frames:[{key:'wood-run-right-0'},{key:'wood-run-right-1'}],frameRate:9,repeat:-1});
  const leaf=document.createElement('canvas');leaf.width=32;leaf.height=32;
  const ctx=leaf.getContext('2d')!,g=ctx.createLinearGradient(4,4,28,28);g.addColorStop(0,'#f0e8a4');g.addColorStop(.45,'#b3eda5');g.addColorStop(1,'#49a378');
  ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(5,28);ctx.bezierCurveTo(0,6,19,1,28,4);ctx.bezierCurveTo(31,20,17,30,5,28);ctx.fill();
  ctx.strokeStyle='#eeefaf';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(5,28);ctx.lineTo(26,6);ctx.stroke();scene.textures.addCanvas('wood-leaf',leaf);
}
