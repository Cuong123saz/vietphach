const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(process.argv[2] || 'dist-pwa-release');
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
  const file=path.join(dir,entry.name);return entry.isDirectory()?walk(file):[file];
});}
const aliasesPath=path.join(root,'compressed-aliases.json');
const aliases=fs.existsSync(aliasesPath)?JSON.parse(fs.readFileSync(aliasesPath,'utf8')):[];
const replaced=new Set(aliases.map(file=>file.replace(/\.png$/,'.webp')));
const files=walk(root).filter(file=>!file.endsWith('offline-files.json') && !file.endsWith('_redirects'))
 .map(file=>'/'+path.relative(root,file).split(path.sep).join('/')).filter(file=>!replaced.has(file));
files.push(...aliases);
files.push('/');
fs.writeFileSync(path.join(root,'offline-files.json'),JSON.stringify(files));
console.log(`Offline list: ${files.length} files`);
