const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp');
const root=path.resolve(process.argv[2]);
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
(async()=>{
 const files=walk(root).filter(f=>f.endsWith('.png'));let before=0,after=0;const redirects=[];
 for(const file of files){
  const size=fs.statSync(file).size,output=file.replace(/\.png$/,'.webp');
  // Preserve sprite alpha pixels exactly: gameplay art hitboxes derive from alpha.
  const map=file.includes(path.sep+'maps'+path.sep);
  // Keep the cleaner village material detail when compressing the new backgrounds.
  const mapQuality=path.basename(file).includes('-realistic-v')?90:82;
  await sharp(file).webp(map?{quality:mapQuality,effort:5}:{lossless:true,effort:5}).toFile(output);
  const source=await sharp(file).metadata(),target=await sharp(output).metadata();
  if(source.width!==target.width || source.height!==target.height)throw new Error('Changed image dimensions: '+file);
  before+=size;after+=fs.statSync(output).size;
  const url='/'+path.relative(root,file).split(path.sep).join('/');
  redirects.push(`${url} ${url.replace(/\.png$/,'.webp')} 200`);
  fs.unlinkSync(file);
 }
 fs.writeFileSync(path.join(root,'_redirects'),redirects.join('\n')+'\n');
 fs.writeFileSync(path.join(root,'compressed-aliases.json'),JSON.stringify(redirects.map(line=>line.split(' ')[0])));
 console.log(`PNG images: ${(before/1048576).toFixed(1)} MiB → ${(after/1048576).toFixed(1)} MiB (${Math.round((1-after/before)*100)}% smaller)`);
})().catch(error=>{console.error(error);process.exit(1);});
