const {test}=require('node:test');
const assert=require('node:assert/strict');
const load=require('./load-ts.cjs')();
const {lockDragonGroundPosition,splitDragonDiveFrames,prepareDragonPreviewTextures,WaterDragonPreview,DRAGON_PREVIEW}=load('src/presentation/phaser/WaterDragonPreview.ts');

test('replaying reuses the complete dragon atlas without reading source pixels',()=>{
 const checked=[];
 prepareDragonPreviewTextures({textures:{exists:key=>{checked.push(key);return true;},get:()=>{throw new Error('unexpected pixel rebuild');}}});
 assert.equal(checked.length,6);
});
test('Q preview locks any finite ground point without needing an enemy',()=>{
 const aim={x:90,y:0},locked=lockDragonGroundPosition(aim);
 aim.x=800;assert.equal(locked.x,90);
 assert.throws(()=>lockDragonGroundPosition({x:NaN,y:0}));
});

test('Q sheet extraction keeps complete unequal silhouettes and excludes neighbouring fragments',()=>{
 const width=36,height=16,pixels=new Uint8ClampedArray(width*height*4),counts=[0,0,0,0];
 const paint=(pose,x,y)=>{const p=(y*width+x)*4;pixels.set([pose+1,90,255,180],p);counts[pose]++;};
 // Pose 2 has a tail across the nominal cell boundary; its bounding box also overlaps pose 3.
 for(let y=8;y<14;y++)for(let x=1;x<5;x++)paint(0,x,y);
 for(let y=1;y<3;y++)for(let x=6;x<18;x++)paint(1,x,y);
 for(let y=3;y<8;y++)paint(1,17,y);
 for(let y=6;y<14;y++)for(let x=21;x<26;x++)paint(2,x,y);
 for(let y=12;y<14;y++)for(let x=15;x<21;x++)paint(2,x,y);
 for(let y=2;y<9;y++)for(let x=29;x<34;x++)paint(3,x,y);
 pixels.set([99,90,255,180],(15*width+35)*4); // A detached sheet speck must not become a frame.
 const before=pixels.slice(),frames=splitDragonDiveFrames(pixels,width,height);
 assert.equal(frames.length,4);assert.deepEqual(pixels,before);
 frames.forEach((frame,pose)=>{
  let retained=0;
  for(let p=0;p<frame.pixels.length;p+=4)if(frame.pixels[p+3]){
   retained++;assert.equal(frame.pixels[p],pose+1);assert.equal(frame.pixels[p+3],180);
  }
  assert.equal(retained,counts[pose]);
  assert.equal(frame.width,frames[0].width);assert.equal(frame.height,frames[0].height);
 });
});

function previewScene(){
 const images=[],objects=[];
 class Image {
  constructor(key){Object.assign(this,{x:0,y:0,originX:0.5,originY:0.5,scaleX:1,scaleY:1,alpha:1,rotation:0,depth:0,flipX:false,visible:true});this.setTexture(key);objects.push(this);}
  setTexture(key){this.texture={key,customData:key.slice(-1)<3?{}:{dragonHead:{x:0.8,y:0.85}}};this.width=key.slice(-1)<3?547:681;this.height=key.slice(-1)<3?949:728;return this;}
  setOrigin(x,y=x){this.originX=x;this.originY=y;return this;}
  setPosition(x,y){this.x=x;this.y=y;return this;}
  setScale(x,y=x){this.scaleX=x;this.scaleY=y;return this;}
  setAlpha(v){this.alpha=v;return this;}
  setDepth(v){this.depth=v;return this;}
  setRotation(v){this.rotation=v;return this;}
  setFlipX(v){this.flipX=v;return this;}
  setVisible(v){this.visible=v;return this;}
  destroy(){this.destroyed=true;}
 }
 const decoration=()=>{const object={destroy(){this.destroyed=true;}};for(const method of ['setStrokeStyle','setAlpha','clear','lineStyle','lineBetween'])object[method]=()=>object;objects.push(object);return object;};
 return {images,objects,add:{image(x,y,key){const image=new Image(key).setPosition(x,y);images.push(image);return image;},circle:decoration,graphics:decoration}};
}

test('Q keeps its cast-time endpoint through summon and dive, and always splashes on empty ground',()=>{
 const scene=previewScene(),aim={x:480,y:500},origin={x:300,y:300};
 const preview=new WaterDragonPreview(scene,origin,aim);
 aim.x=900;aim.y=900;
 const C=DRAGON_PREVIEW;
 preview.update(C.swing+C.orbRise+C.orbSpin+C.water+C.form+C.anticipation+C.dive+.01,origin);
 assert.equal(preview.phase,'impact');assert.equal(scene.images[0].x,480);assert.equal(scene.images[0].y,500);
 assert.equal(scene.images[0].texture.key,'dragon-impact');
 preview.destroy();assert.equal(preview.movementLocked,false);
});

test('Mirror Q flashes then dives directly from its portal without charge, pose lock or retargeting',()=>{
 const portal={x:248,y:224},target={x:480,y:500},C=DRAGON_PREVIEW;
 const {WATER_MAGE_COPY_TIMING:COPY}=load('src/config/balance/waterMage.ts');
 const scene=previewScene(),copy=new WaterDragonPreview(scene,portal,target,75,'mirror');
 copy.update(COPY.flash-.001,{x:900,y:900});
 assert.equal(copy.phase,'flash');assert.equal(scene.images[0].visible,false);assert.equal(scene.images[2].visible,false);
 assert.equal(copy.movementLocked,false);assert.equal(copy.openingPoseActive,false);assert.equal(copy.commandActive,false);
 copy.update(.001,{x:900,y:900});
 assert.equal(copy.phase,'dive');assert.equal(scene.images[0].x,portal.x);assert.equal(scene.images[0].y,portal.y);
 assert.equal(scene.images[0].texture.key,'dragon-key-3');assert.equal(scene.images[2].visible,false,'Copied Q never creates a charging orb');
 target.x=999;target.y=999;
 copy.update(COPY.qFlight-.001,{x:900,y:900});
 assert.equal(copy.phase,'dive');
 copy.update(.002,{x:900,y:900});
 assert.equal(copy.phase,'impact');assert.equal(scene.images[0].x,480);assert.equal(scene.images[0].y,500);
 copy.update(C.impact,portal);
 assert.ok(scene.objects.every(object=>object.destroyed),'Copy owns and releases all its VFX');
});

test('Q pose changes stay opaque and keep outgoing heads on the flight path at 20 and 60 fps',()=>{
 const turnScene=previewScene();
 const turning=new WaterDragonPreview(turnScene,{x:300,y:300},{x:100,y:150});
 const opening=DRAGON_PREVIEW.swing+DRAGON_PREVIEW.orbRise+DRAGON_PREVIEW.orbSpin;
 turning.update(opening+DRAGON_PREVIEW.water+DRAGON_PREVIEW.form+DRAGON_PREVIEW.anticipation/2,{x:300,y:300});
 assert.ok(Math.abs(turnScene.images[0].rotation)<Math.PI/2,'Left/up anticipation must use the short turn, not spin around');
 turning.destroy();
 assert.equal(turning.movementLocked,false,'Cancelling during the command must release movement');
 for(const fps of [20,60])for(const side of [-1,1]){
  const scene=previewScene(),origin={x:300,y:300},target={position:{x:300+side*400,y:500}};
  const preview=new WaterDragonPreview(scene,origin,target.position),[image,ghost,orb]=scene.images,keys=[],phases=new Set();
  let lastOrbRotation=0;
  let age=0;
  while(!preview.done){
   preview.update(1/fps,origin);age+=1/fps;
   phases.add(preview.phase);
   assert.equal(preview.movementLocked,!preview.done && age<opening+DRAGON_PREVIEW.water+DRAGON_PREVIEW.form+DRAGON_PREVIEW.anticipation,'Movement must unlock exactly when the command pose ends');
   assert.equal(preview.commandActive,!preview.done && (preview.phase==='anticipation' || preview.phase==='dive') && age>=opening+DRAGON_PREVIEW.water+DRAGON_PREVIEW.form+DRAGON_PREVIEW.formedHold,'Keep the command pose until the dragon reaches its destination');
   assert.equal(preview.openingPoseActive,!preview.done && age<opening+DRAGON_PREVIEW.water+DRAGON_PREVIEW.form,'Keep the opening pose until water formation completes');
   if(preview.phase==='swing'){assert.equal(image.visible,false);assert.equal(orb.visible,false);}
   if(preview.phase==='orb-rise' || preview.phase==='orb-spin'){
    assert.equal(image.visible,false);assert.equal(orb.visible,true);assert.equal(orb.texture.key,'water-orb-3');
    assert.equal(orb.alpha,1);assert.ok(orb.rotation>lastOrbRotation);lastOrbRotation=orb.rotation;
    assert.ok(Math.abs(orb.width*orb.scaleX-DRAGON_PREVIEW.orbWidth)<1e-8);
    if(preview.phase==='orb-spin')assert.equal(orb.y,origin.y-DRAGON_PREVIEW.orbLift);
   }
   if(age>=opening+DRAGON_PREVIEW.water)assert.equal(orb.visible,false);
   assert.ok(age<5,'The preview must finish and release its sprites');
   if(keys.at(-1)!==image.texture.key)keys.push(image.texture.key);
   if(age>0.04 && preview.phase!=='impact')assert.equal(image.alpha,1,'The incoming frame must not fade out');
   if(preview.phase==='dive'){
    assert.ok(Math.abs(image.height*image.scaleY-DRAGON_PREVIEW.lift)<1e-8,'Flight and formed dragon must retain the same height');
    const nativeAngle=image.texture.key==='dragon-key-2'?0:Math.PI/4;
    const expected=Math.atan2(target.position.y-image.y,target.position.x-image.x);
    const actual=image.rotation+(image.flipX?Math.PI-nativeAngle:nativeAngle);
    assert.equal(image.flipX,side<0,'Left targets must retain mirrored artwork through every flight frame');
    assert.ok(Math.abs(Math.atan2(Math.sin(actual-expected),Math.cos(actual-expected)))<1e-8,'The head must point along the flight path');
    assert.ok(Math.abs(image.rotation)<Math.PI/2,'Downward flight must not turn the body upside down');
   }
   if(preview.phase==='dive' && ghost.visible){
    assert.equal(ghost.x,image.x);assert.equal(ghost.y,image.y);
    assert.equal(ghost.flipX,image.flipX);
    assert.ok(Math.abs(ghost.height*ghost.scaleY-image.height*image.scaleY)<1e-8);
   }
   if(preview.phase==='anticipation')assert.ok(Math.abs(image.height*image.scaleY-DRAGON_PREVIEW.lift)<1e-8);
   if(preview.phase==='impact'){
    assert.equal(image.x,target.position.x);assert.equal(image.y,target.position.y);
    assert.equal(image.originX,DRAGON_PREVIEW.impactAnchor.x);assert.equal(image.originY,DRAGON_PREVIEW.impactAnchor.y);
    assert.equal(image.rotation,Math.PI/2,'The splash rises from the ground regardless of flight direction');
   }
  }
  assert.deepEqual(keys,[...['0','1','2','3','4','5','4','5'].map(k=>'dragon-key-'+k),'dragon-impact']);
  assert.deepEqual([...phases],['swing','orb-rise','orb-spin','summon','anticipation','dive','impact']);
  assert.ok(scene.objects.every(object=>object.destroyed));
  assert.equal(preview.movementLocked,false);
  assert.ok(age>=opening+DRAGON_PREVIEW.water+DRAGON_PREVIEW.form+DRAGON_PREVIEW.anticipation+DRAGON_PREVIEW.dive+DRAGON_PREVIEW.impact);
 }
});
