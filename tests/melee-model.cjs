const {test}=require('node:test');
const assert=require('node:assert/strict');
const load=require('./load-ts.cjs')();
const {splitSpriteSilhouettes:split}=load('src/presentation/animations/spriteSilhouettes.ts');
const {MELEE_JOBS,MELEE_MODEL_CANVAS:C,meleePoseKeys,meleePlacement}=load('src/presentation/animations/meleeModel.ts');

test('all three shipped model sets have 24 substantial, isolated poses and real alpha',async()=>{
 const sharp=require('sharp');
 for(const job of MELEE_JOBS){
  const keys=meleePoseKeys(job);assert.equal(keys.length,24);assert.equal(new Set(keys).size,24);
  for(const [mode,file,columns,rows] of [['core','poses-v2',2,4],['run','run',4,4]]){
   const {data,info}=await sharp(`public/assets/characters/${job}/model-v1/${file}.png`).raw().toBuffer({resolveWithObject:true});
   assert.equal(info.channels,4);
   const frames=split(new Uint8ClampedArray(data),info.width,info.height,columns,rows);
   assert.equal(frames.length,columns*rows);
   frames.forEach((p,i)=>{
    assert.ok(p.height>info.height/(rows*2)&&p.width>info.width/(columns*5),`${job} ${mode} ${i}: full-body pose, not stray pixels`);
    assert.ok(p.pixels.some((a,n)=>n%4===3&&a===0));
    const {scale,root,ground}=meleePlacement(job,mode,i,info.width,info.height);
    const x=C.anchor.x-(root-p.x)*scale,y=C.anchor.y-(ground-p.y)*scale;
    assert.ok(x>=1&&y>=1&&x+p.width*scale<C.width-1&&y+p.height*scale<C.height-1,`${job} ${mode} ${i}: keep complete weapon and boots`);
   });
   const scales=frames.map((_,i)=>meleePlacement(job,mode,i,info.width,info.height).scale);
   assert.equal(new Set(scales).size,1,'Body scale stays fixed through stride and weapon windup');
  }
 }
});
