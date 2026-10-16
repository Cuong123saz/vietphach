import type Phaser from 'phaser';
import type { Point } from '../../world/definitions';
import { validateBodyBox, type BodyBox } from '../../world/bodyGeometry';

/** Cache by frame object so rebuilding a texture cannot retain an older asset's bounds. */
export class SpriteHitboxes {
  private cache=new WeakMap<Phaser.Textures.Frame,BodyBox>();

  localBox(sprite: Phaser.GameObjects.Sprite,anchor:Point,bodyClip?:BodyBox):BodyBox {
    const frame=sprite.frame;
    let bounds=this.cache.get(frame);
    if(!bounds){
      const canvas=document.createElement('canvas');canvas.width=frame.cutWidth;canvas.height=frame.cutHeight;
      const ctx=canvas.getContext('2d',{willReadFrequently:true})!;
      ctx.drawImage(frame.source.image as HTMLImageElement,frame.cutX,frame.cutY,frame.cutWidth,frame.cutHeight,0,0,frame.cutWidth,frame.cutHeight);
      const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
      let left=canvas.width,top=canvas.height,right=-1,bottom=-1;
      for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(pixels[(y*canvas.width+x)*4+3]>20){
        left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);
      }
      if(right<left)throw new Error(`Empty actor sprite: ${sprite.texture.key}`);
      bounds={x:left+frame.x,y:top+frame.y,width:right-left+1,height:bottom-top+1};
      this.cache.set(frame,bounds);
    }
    if(bodyClip){
      validateBodyBox(bodyClip);
      const left=Math.max(bounds.x,bodyClip.x),top=Math.max(bounds.y,bodyClip.y);
      bounds={x:left,y:top,width:Math.min(bounds.x+bounds.width,bodyClip.x+bodyClip.width)-left,
        height:Math.min(bounds.y+bounds.height,bodyClip.y+bodyClip.height)-top};
      validateBodyBox(bounds);
    }
    const x=sprite.flipX?sprite.width-bounds.x-bounds.width:bounds.x;
    const y=sprite.flipY?sprite.height-bounds.y-bounds.height:bounds.y;
    const matrix=sprite.getWorldTransformMatrix();
    const points=[[x,y],[x+bounds.width,y],[x+bounds.width,y+bounds.height],[x,y+bounds.height]]
      .map(([xx,yy])=>matrix.transformPoint(xx-sprite.displayOriginX,yy-sprite.displayOriginY));
    const left=Math.min(...points.map(p=>p.x)),top=Math.min(...points.map(p=>p.y));
    return {x:left-anchor.x,y:top-anchor.y,width:Math.max(...points.map(p=>p.x))-left,height:Math.max(...points.map(p=>p.y))-top};
  }
}
