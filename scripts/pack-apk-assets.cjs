// Shrinks an APK web bundle in place. Every PNG is re-encoded as WebP but keeps its .png name:
// Android WebView sniffs image content, so code paths stay untouched (no redirects inside the app).
//  - Drops art the game never loads (source sheets, references, superseded versions, READMEs).
//  - HUD icons are shown at <= ~90px (finale ritual icons <= 170px): downscaled from 1254px.
//  - Monster sprites: lossy colour, lossless alpha (hitboxes read alpha only); verified pixel-exact alpha.
//  - Everything else: lossless (characters are background-masked by colour at runtime), maps q82.
//    Realistic village backgrounds use q90 to preserve the quieter material detail.
const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp');
const root=path.resolve(process.argv[2]||'dist-apk');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
const rel=file=>'/'+path.relative(root,file).split(path.sep).join('/');

// Verified unused by the runtime (no load path in src). Re-check if art is wired up later.
const UNUSED=new Set([
  '/assets/characters/basic/martial-run-down-v2.png','/assets/characters/basic/martial-run-left-v2.png','/assets/characters/basic/martial-run-right-v2.png',
  '/assets/characters/mage/idle-up-alternate.png','/assets/characters/mage/E-NhanMach-ThuyNguc/E-NhanMach-ThuyNguc.png',
  '/assets/characters/mage/LongMach-ThuyLongGam/dragon-swim-source.png','/assets/characters/mage/khang-chien-finale/boss-bomb-reference.png',
  '/assets/characters/mage/water-guard/source.png','/assets/characters/mage/water-mirror-three-aspects/source.png',
  '/assets/characters/mage/water-vein/source.png','/assets/characters/mage/water-vein/active-link.png','/assets/characters/mage/water-vein/future-link.png',
  '/assets/hud-water-v2/reference.png','/assets/maps/village-area-1.png','/assets/maps/village-area-1-v2.png','/assets/maps/village-room-1.png',
  '/assets/maps/village-area-1-detail-v3.png','/assets/maps/village-area-1-ruined-v1.png',
  '/assets/maps/village-area-1-apocalypse-v1.png','/assets/maps/village-area-1-final-dusk-v1.png',
  '/assets/maps/village-area-1-ruined-realistic-v2.png','/assets/maps/village-area-1-apocalypse-realistic-v2.png',
  '/assets/maps/village-area-1-final-dusk-realistic-v2.png',
  '/assets/maps/khang-chien/villagers-source.png','/assets/maps/khang-chien/villagers-seated-tree.png',
]);
const fit=r=>r.startsWith('/assets/hud-water-v2/')?256:/\/khang-chien-finale\/(bat-dai|giang-the)-icon\.png$/.test(r)?384:undefined;

async function alphaOf(buffer){return (await sharp(buffer).ensureAlpha().extractChannel(3).raw().toBuffer());}
(async()=>{
  let before=0,after=0,dropped=0;
  for(const file of walk(root)){
    const r=rel(file);
    if(UNUSED.has(r) || file.endsWith('.md')){before+=fs.statSync(file).size;fs.unlinkSync(file);dropped++;continue;}
    if(!file.endsWith('.png'))continue;
    const input=fs.readFileSync(file),size=fit(r);
    let image=sharp(input);if(size)image=image.resize(size,size,{fit:'inside',withoutEnlargement:true});
    let output;
    if(r.includes('/maps/'))output=await image.webp({quality:path.basename(file).includes('-realistic-v')?90:82,effort:5}).toBuffer();
    else if(r.startsWith('/assets/monsters/')){
      output=await image.webp({quality:88,alphaQuality:100,effort:5}).toBuffer();
      // Hitboxes come from alpha: insist on identical alpha, else fall back to lossless.
      if(!(await alphaOf(output)).equals(await alphaOf(input)))output=await sharp(input).webp({lossless:true,effort:5}).toBuffer();
    }else output=await image.webp({lossless:true,effort:5}).toBuffer();
    if(!size){
      const [a,b]=await Promise.all([sharp(input).metadata(),sharp(output).metadata()]);
      if(a.width!==b.width||a.height!==b.height)throw new Error('Changed image dimensions: '+file);
    }
    before+=input.length;after+=output.length;fs.writeFileSync(file,output);
  }
  console.log(`APK assets: ${(before/1048576).toFixed(1)} MiB → ${(after/1048576).toFixed(1)} MiB (${dropped} unused files dropped)`);
})().catch(error=>{console.error(error);process.exit(1);});
