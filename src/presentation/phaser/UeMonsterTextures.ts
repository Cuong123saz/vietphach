import type Phaser from 'phaser';
import type { BodyBox } from '../../world/bodyGeometry';
import type { EnemyPhase } from '../../gameplay/enemies/EnemyCombat';
import type { BossPhase } from '../../gameplay/enemies/SpikedShellBoss';

export const UE_MONSTER_FAMILIES=['flat-fur-rat','grasshopper','crop-snail','caterpillar','black-caterpillar','mutant-caterpillar','boss-spiked-shell-beast'] as const;
export const ueMonsterKey=(id:string)=>`ue-monster-${id.replace(/^elite-/,'')}`;
export const ueIdleFrame=(id:string)=>id.startsWith('boss-')?'idle':`${id.startsWith('elite-')?'elite':'normal'}-idle`;
export function uePoseFrame(id:string,phase:EnemyPhase,boss?:BossPhase):string {
  if(id.startsWith('boss-'))return boss==='burrow'||boss==='underground'?'dig':boss==='jump'?'jump':
    boss==='roll'||boss==='roll-warning'||boss==='roll-pause'?'roll':boss==='jump-warning'||boss==='volley-wait'?'windup':
    boss==='emerge'||boss==='landing-pause'?'emerge':boss==='dash'?'attack':'idle';
  return `${id.startsWith('elite-')?'elite':'normal'}-${phase==='windup'?'windup':phase==='lunge'||phase==='recover'?'attack':'idle'}`;
}
export function preloadUeMonsters(scene:Phaser.Scene){
  for(const family of UE_MONSTER_FAMILIES)scene.load.image(ueMonsterKey(family),`/assets/monsters/ue-mach-v1/${family}-sheet.png`);
}
/** Frame extraction preserves source RGBA. It removes empty atlas padding, never paints or remattes art. */
export function prepareUeMonsters(scene:Phaser.Scene){
  for(const family of UE_MONSTER_FAMILIES){
    const texture=scene.textures.get(ueMonsterKey(family));if(texture.has('idle')||texture.has('normal-idle'))continue;
    const source=texture.getSourceImage() as HTMLImageElement;
    const canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;
    const context=canvas.getContext('2d',{willReadFrequently:true})!;context.drawImage(source,0,0);
    const rgba=context.getImageData(0,0,canvas.width,canvas.height).data;
    const names=family.startsWith('boss-')?['idle','dig','emerge','jump','attack','roll']:
      ['normal-idle','normal-windup','normal-attack','elite-idle','elite-windup','elite-attack'];
    for(let i=0;i<6;i++){
      const x0=Math.floor((i%3)*source.width/3),x1=Math.floor((i%3+1)*source.width/3);
      const y0=Math.floor(Math.floor(i/3)*source.height/2),y1=Math.floor((Math.floor(i/3)+1)*source.height/2);
      let left=x1,right=x0,top=y1,bottom=y0;
      for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(rgba[(y*source.width+x)*4+3]>=24){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
      if(left>right)throw new Error(`Empty Ue Mach sprite: ${family}/${names[i]}`);
      const frame=texture.add(names[i],0,left,top,right-left+1,bottom-top+1)!;
      frame.customData={body:{x:frame.width*.08,y:frame.height*.16,width:frame.width*.84,height:frame.height*.84} satisfies BodyBox};
    }
    if(family.startsWith('boss-')){
      const f=texture.get('dig');const windup=texture.add('windup',0,f.cutX,f.cutY,f.cutWidth,f.cutHeight)!;windup.customData=f.customData;
    }
  }
}
export function setUeMonsterPose(sprite:Phaser.GameObjects.Sprite,id:string,phase:EnemyPhase,flipLeft:boolean,boss?:BossPhase,mapIndex=1){
  const texture=sprite.scene.textures.get(ueMonsterKey(id)),name=uePoseFrame(id,phase,boss);
  sprite.setTexture(texture.key,name).setFlipX(flipLeft).setOrigin(.5,.88);
  const frames=id.startsWith('boss-')?['idle','dig','emerge','jump','attack','roll']:
    ['idle','windup','attack'].map(p=>`${id.startsWith('elite-')?'elite':'normal'}-${p}`);
  const extent=Math.max(...frames.map(n=>Math.max(texture.get(n).width,texture.get(n).height)));
  sprite.setScale((id.startsWith('boss-')?174:id.startsWith('elite-')?104:78)/extent);
  sprite.setTint([0xffffff,0xf6f1e7,0xe8e5dc,0xd6d8d0][Math.max(0,Math.min(3,mapIndex-1))]);
}
export function ueMonsterBodyClip(sprite:Phaser.GameObjects.Sprite):BodyBox|undefined {
  return sprite.texture.key.startsWith('ue-monster-')?(sprite.frame.customData as {body?:BodyBox})?.body:undefined;
}
