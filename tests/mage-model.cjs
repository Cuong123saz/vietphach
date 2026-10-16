const {test}=require('node:test');
const assert=require('node:assert/strict');
const {splitSpriteSilhouettes:split}=require('./load-ts.cjs')()('src/presentation/animations/spriteSilhouettes.ts');

test('atlas separation keeps a staff across cell boundaries without importing the adjacent body',()=>{
 const w=64,h=40,p=new Uint8ClampedArray(w*h*4);
 const paint=(x,y,id,a=255)=>p.set([id,40,90,a],(y*w+x)*4);
 const body=(x,y,id)=>{for(let yy=y;yy<y+10;yy++)for(let xx=x;xx<x+7;xx++)paint(xx,yy,id)};
 body(6,3,1);body(44,3,2);body(6,25,3);body(44,25,4);
 for(let x=12;x<41;x++)paint(x,8,1); // The first staff goes past the 32px cell boundary.
 for(let x=36;x<45;x++)paint(x,13,2); // Bounding boxes overlap, painted bodies do not.
 paint(41,8,1,60);paint(0,0,99); // Preserve owned fringe, discard isolated noise.
 const frames=split(p,w,h,2,2);assert.equal(frames.length,4);
 frames.forEach((f,i)=>{const colors=new Set();for(let a=3;a<f.pixels.length;a+=4)if(f.pixels[a])colors.add(f.pixels[a-3]);assert.deepEqual([...colors],[i+1])});
 assert.ok(frames[0].x+frames[0].width>32,'The complete staff must survive');
 assert.ok([...frames[0].pixels].includes(60),'Keep antialiased alpha');
});

test('faint alpha connecting two figures cannot merge the poses',()=>{
 const w=40,h=20,p=new Uint8ClampedArray(w*h*4);
 for(const x0 of [3,28])for(let y=3;y<17;y++)for(let x=x0;x<x0+7;x++)p.set([90,120,180,255],(y*w+x)*4);
 for(let x=10;x<28;x++)p.set([90,120,180,25],(10*w+x)*4);
 const frames=split(p,w,h,2,1);assert.equal(frames.length,2);
 assert.ok(frames.every(f=>f.width<20));
 assert.throws(()=>split(new Uint8ClampedArray(w*h*4),w,h,2,1),/isolated character poses/);
});

test('shipped Mage atlases contain all 24 separate figures with real transparency',async()=>{
 const sharp=require('sharp');
 for(const [name,rows] of [['poses',2],['run',4]]){
  const {data,info}=await sharp(`public/assets/characters/mage/model-v2/${name}.png`).raw().toBuffer({resolveWithObject:true});
  assert.equal(info.channels,4);
  const frames=split(new Uint8ClampedArray(data),info.width,info.height,4,rows);assert.equal(frames.length,4*rows);
  assert.ok(frames.every(f=>f.height>info.height/(rows*2)&&f.width>info.width/16));
  assert.ok(frames.every(f=>f.pixels.some((a,i)=>i%4===3&&a===0)),'Every extracted figure has transparent padding');
 }
});
