import type Phaser from 'phaser';
import type { BodyBox } from '../../world/bodyGeometry';
import type { BossPhase } from '../../gameplay/enemies/SpikedShellBoss';
import { ueMonsterBodyClip } from './UeMonsterTextures';

const BOSS_FRAMES:Record<string,{rect:BodyBox;body:BodyBox}>={
  normal:{rect:{x:0,y:80,width:560,height:380},body:{x:0,y:0,width:490,height:350}},
  burrow:{rect:{x:0,y:470,width:500,height:290},body:{x:70,y:100,width:350,height:130}},
  emerge:{rect:{x:510,y:460,width:490,height:300},body:{x:65,y:65,width:350,height:200}},
  jump:{rect:{x:480,y:0,width:550,height:450},body:{x:120,y:75,width:390,height:260}},
  dash:{rect:{x:1020,y:85,width:510,height:380},body:{x:150,y:110,width:350,height:210}},
  roll:{rect:{x:780,y:770,width:420,height:250},body:{x:60,y:15,width:280,height:220}},
};
const bossFrameName=(phase?:BossPhase)=>phase==='burrow'||phase==='underground'?'burrow':phase==='jump'?'jump':phase==='dash'||phase==='dash-pause'?'dash':phase==='roll'||phase==='roll-warning'||phase==='roll-pause'?'roll':phase==='emerge'||phase==='volley-wait'||phase==='jump-warning'||phase==='landing-pause'?'emerge':'normal';

interface MonsterArt {id:string;name:string;pose:string;kind:'melee'|'ranged';visual:'slime'|'thorn';body:BodyBox;normalBody?:BodyBox;directory?:string;normalPose?:string;displaySize?:number;frames?:{normal:BodyBox;attack:BodyBox}}
export const MONSTER_ART:readonly MonsterArt[] = [
  { id: 'crop-snail', name: 'Ốc sên hại mùa', pose: 'prepare-spray', kind:'ranged', visual:'slime', body:{x:0,y:0,width:365,height:238} },
  { id: 'flat-fur-rat', name: 'Chuột lông bết', pose: 'jump-attack', kind:'melee', visual:'thorn', body:{x:15,y:0,width:382,height:230} },
  { id: 'caterpillar', name: 'Sâu róm', pose: 'prepare-shot', kind:'ranged', visual:'thorn', body:{x:0,y:0,width:310,height:150} },
  { id: 'mutant-caterpillar', name: 'Sâu róm đột biến', pose: 'bristle-attack', kind:'ranged', visual:'thorn', body:{x:0,y:0,width:330,height:153} },
  { id: 'black-caterpillar', name: 'Sâu róm đen', pose: 'bristle-rage', kind:'ranged', visual:'thorn', body:{x:0,y:0,width:290,height:174} },
  { id: 'grasshopper', name: 'Châu chấu', pose: 'jump-attack', kind:'melee', visual:'thorn', body:{x:125,y:0,width:321,height:183} },
  ...[
    ['flat-fur-rat','Nanh Xé','ground','leap-slash','melee'],
    ['grasshopper','Liêm Phong','ground','leap-slash','melee'],
    ['crop-snail','Nhầy Độc','normal','spray','ranged'],
    ['caterpillar','Tiễn Gai','projectile-spray','projectile-spray','ranged'],
    ['black-caterpillar','Hắc Châm','bristled','projectile-spray','ranged'],
    ['mutant-caterpillar','Gai Bạo','bristled','bristled','ranged'],
  ].map(([id,name,normalPose,pose,kind]):MonsterArt=>({id:`elite-${id}`,name:`Tinh anh · ${name}`,normalPose,pose,kind:kind as 'melee'|'ranged',
    visual:id==='crop-snail'?'slime':'thorn',directory:`elite/${id==='mutant-caterpillar'?'caterpillar':id}`,displaySize:95,
    normalBody:{x:100,y:180,width:1050,height:900},body:{x:100,y:180,width:1050,height:900}})),
  {id:'boss-spiked-shell-beast',name:'Boss · Giáp Tai Ương',pose:'attack',kind:'melee',visual:'thorn',directory:'boss/spiked-shell-beast',
    normalPose:'pose-sheet',displaySize:170,normalBody:{x:0,y:0,width:490,height:350},body:{x:65,y:65,width:350,height:200},
    frames:{normal:{x:0,y:80,width:560,height:380},attack:{x:510,y:460,width:490,height:300}}},
];

// Source-pixel body regions exclude baked spray/spikes/trails. Keep original PNGs untouched.
const DISPLAY_SIZE=72;
export function setMonsterPose(sprite:Phaser.GameObjects.Sprite,id:string,attack:boolean,flipLeft:boolean,bossPhase?:BossPhase):void {
  const art=MONSTER_ART.find(a=>a.id===id);if(!art)throw new Error(`Unknown monster art: ${id}`);
  const key=`monster-${id}-${attack?art.pose:'normal'}`;
  if(id==='boss-spiked-shell-beast'){
    const name=bossFrameName(bossPhase),data=BOSS_FRAMES[name],texture=sprite.scene.textures.get(key);
    if(!texture.has(name))texture.add(name,0,data.rect.x,data.rect.y,data.rect.width,data.rect.height);
    sprite.setTexture(key,name);
    const center=(data.body.x+data.body.width/2)/sprite.width;
    sprite.setScale(170/Math.max(data.body.width,data.body.height)).setOrigin(flipLeft?1-center:center,(data.body.y+data.body.height*.85)/sprite.height).setFlipX(flipLeft);
    return;
  }
  const frame=art.frames?(attack?'attack':'normal'):undefined;
  const texture=sprite.scene.textures.get(key);
  if(art.frames && !texture.has(frame!)){
    const rect=attack?art.frames.attack:art.frames.normal;
    texture.add(frame!,0,rect.x,rect.y,rect.width,rect.height);
  }
  if(sprite.texture.key!==key || (frame && sprite.frame.name!==frame))sprite.setTexture(key,frame);
  const body:BodyBox=attack?art.body:art.normalBody??{x:0,y:0,width:sprite.width,height:sprite.height};
  const center=(body.x+body.width/2)/sprite.width;
  sprite.setScale((art.displaySize??DISPLAY_SIZE)/Math.max(body.width,body.height))
    .setOrigin(flipLeft?1-center:center,(body.y+body.height*.85)/sprite.height).setFlipX(flipLeft);
}
export function monsterBodyClip(sprite:Phaser.GameObjects.Sprite,id:string):BodyBox|undefined {
  if(sprite.texture.key.startsWith('ue-monster-'))return ueMonsterBodyClip(sprite);
  if(id==='boss-spiked-shell-beast')return BOSS_FRAMES[String(sprite.frame.name)]?.body;
  const art=MONSTER_ART.find(a=>a.id===id);
  return art? sprite.texture.key===`monster-${id}-${art.pose}`?art.body:art.normalBody:undefined;
}

export function preloadMonsters(scene: Phaser.Scene): void {
  for (const art of MONSTER_ART) {
    for (const pose of new Set(['normal', art.pose])) {
      const source=art.frames?'pose-sheet':pose==='normal'?art.normalPose??'normal':pose;
      scene.load.image(`monster-${art.id}-${pose}`, `/assets/monsters/${art.directory??art.id}/${source}.png`);
    }
  }
}
