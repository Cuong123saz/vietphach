import Phaser from 'phaser';
import { MAPS, type Point, type Zone } from '../../world/definitions';
import { bodyCenter, worldBodyBox } from '../../world/bodyGeometry';
import { createVillageZone } from '../../run/Run';
import { createArcherRun, tickArcherRun, prepareArcherTrial, finishArcherRun, archerRunContext, type ArcherRun } from '../../run/ArcherRun';
import { spawnArcherEncounter, type ArcherEnemy } from '../../run/ArcherEncounter';
import { allocateArcherPotential, chooseArcherEvolution, grantArcherExperience } from '../../gameplay/characters/jobs/archer/ArcherRuntime';
import { castArcherBasic, castArcherQ, castArcherE, castArcherR, castArcherUltimate, archerUltimateStatus, clearWoodArcher } from '../../gameplay/characters/jobs/archer/WoodArcherSkills';
import { setEnemyCombatEnabled } from '../../gameplay/enemies/EnemyCombat';
import type { SandboxDevAction } from '../../dev/sandbox/DevMenu';
import { WOOD_ARCHER_BALANCE as B } from '../../config/balance/woodArcher';
import { ArcherHud, archerCastMessage } from '../hud/ArcherHud';
import { preloadArcher, prepareArcherTextures } from './ArcherTextures';
import { preloadMonsters, setMonsterPose, monsterBodyClip } from './MonsterTextures';
import { SpriteHitboxes } from './SpriteHitbox';
import { WaterSkillInput } from './WaterSkillInput';
import { WoodArcherEffects } from './WoodArcherEffects';
import { AssetLoadGuard } from './AssetLoadGuard';
import { createLinhMocZone, LINH_MOC_HEART, LINH_MOC_LANES } from '../../world/linhMoc';
import { createArcherStage, startArcherStage, continueArcherStage, tickArcherStage, debugArcherStage,
  type ArcherStage, type ArcherStagePath } from '../../run/ArcherStage';
import { ArcherStageHud } from '../hud/ArcherStageHud';
import { TouchControls, type TouchAction } from '../hud/TouchControls';
import { createKieuNgaoZone } from '../../world/kieuNgao';
import { createKieuNgaoStage, advanceKieuNgaoStory, interactKieuNgao, tickKieuNgaoStage, debugKieuNgao,
  kieuNgaoCanMove, kieuNgaoCanShoot, kieuNgaoInteraction, type KieuNgaoStage } from '../../run/KieuNgaoStage';
import { KieuNgaoHud } from '../hud/KieuNgaoHud';
import { preloadKieuNgaoTextures, prepareKieuNgaoTextures, setMocLocPose, setForestPerson } from './KieuNgaoTextures';
import { preloadUeMonsters, prepareUeMonsters, setUeMonsterPose, ueMonsterBodyClip, ueMonsterKey, ueIdleFrame } from './UeMonsterTextures';
import { drawUeEnemyEffects } from './UeEnemyEffects';
import { KieuNgaoPresentation } from './KieuNgaoPresentation';
import { KieuNgaoAudio } from './KieuNgaoAudio';
import type { BodyBox } from '../../world/bodyGeometry';

const elements:Record<string,string>={wood:'Mộc',water:'Thủy',earth:'Thổ',fire:'Hỏa',metal:'Kim'};
type Selection='basic'|'q'|'e'|'ultimate';
interface EnemyArt {body:ArcherEnemy;sprite:Phaser.GameObjects.Sprite;label:Phaser.GameObjects.Text}
interface Popup {text:Phaser.GameObjects.Text;at:number;position:Point}

/** Wood job presentation. The run owns every timer, hit and resource change. */
export class WoodArcherScene extends Phaser.Scene {
  private run!:ArcherRun;private playerArt!:Phaser.GameObjects.Sprite;private shadow!:Phaser.GameObjects.Ellipse;
  private effects!:WoodArcherEffects;private hud!:ArcherHud;private graphics!:Phaser.GameObjects.Graphics;
  private targeting!:Phaser.GameObjects.Graphics;private enemyArt:EnemyArt[]=[];private popups:Popup[]=[];
  private hitboxes=new SpriteHitboxes();private keys!:Record<string,Phaser.Input.Keyboard.Key>;
  private combo!:WaterSkillInput;private selected:Selection='basic';private firing=false;
  private blocked=false;private devOpen=false;private unfocused=false;private alive=true;private heading:Point={x:1,y:0};
  private trial=false;private sandbox=false;private wave=1;private nextWave?:number;private selectedTarget?:string;
  private inputAbort=new AbortController();private statusAt=-Infinity;
  private playback=1;
  private stageMode=false;private stage?:ArcherStage;private stageHud?:ArcherStageHud;private stageArt?:Phaser.GameObjects.Graphics;
  private touch?:TouchControls;private stagePhase='';private assets!:AssetLoadGuard;
  private forestMode=false;private forest?:KieuNgaoStage;private forestHud?:KieuNgaoHud;
  private forestPresentation?:KieuNgaoPresentation;private forestAudio?:KieuNgaoAudio;
  private mapArt!:Phaser.GameObjects.Image;private enemyGround?:Phaser.GameObjects.Graphics;private forestMap=-1;
  constructor(){super('WoodArcherScene');}
  preload(){const zone=this.registry.get('labZone') as Zone|undefined;
    const stage=new URLSearchParams(location.search).get('stage');this.forestMode=stage==='kieu-ngao';
    this.stageMode=this.forestMode||stage==='linh-moc';this.assets=new AssetLoadGuard(this);
    if(this.forestMode){for(let i=1;i<=4;i++)this.load.image(`forest-map-${i}`,MAPS[`kieu-ngao-${i}` as keyof typeof MAPS].url);
      preloadUeMonsters(this);preloadKieuNgaoTextures(this);}
    else {this.load.image('wood-map',MAPS[this.stageMode?'linh-moc':zone?.mapId??'village'].url);preloadMonsters(this);}
    preloadArcher(this);}
  create(){
    if(this.assets.failed){this.assets.showRecovery();return;}
    const params=new URLSearchParams(location.search);this.sandbox=!this.stageMode&&params.has('sandbox');this.trial=this.sandbox;
    const zone=this.registry.get('labZone') as Zone|undefined;
    const archerZone=this.forestMode?createKieuNgaoZone():this.stageMode?createLinhMocZone():zone??{...createVillageZone(),spawn:{x:850,y:740}};
    this.run=createArcherRun(crypto.randomUUID(),archerZone);
    if(this.forestMode)this.forest=createKieuNgaoStage(this.run,params.get('path')==='b1'?'b1':'a1');
    else if(this.stageMode)this.stage=createArcherStage(this.run,params.get('path')==='b1'?'b1':'a1');
    prepareArcherTextures(this);
    if(this.forestMode){prepareUeMonsters(this);prepareKieuNgaoTextures(this);this.forestAudio=new KieuNgaoAudio();}
    const mapSize=MAPS[this.run.zone.mapId];
    this.mapArt=this.add.image(0,0,this.forestMode?'forest-map-1':'wood-map').setOrigin(0).setDisplaySize(mapSize.width,mapSize.height).setDepth(-100);
    this.shadow=this.add.ellipse(0,0,39,14,0x091e15,.4).setDepth(1);
    this.playerArt=this.add.sprite(0,0,'wood-idle-down').setScale(1/3).setOrigin(.5,85/96);
    this.graphics=this.add.graphics().setDepth(8000);this.targeting=this.add.graphics().setDepth(9005);
    this.effects=new WoodArcherEffects(this);
    const camera=this.cameras.main,map=MAPS[this.run.zone.mapId];camera.setBounds(0,0,map.width,map.height);
    camera.startFollow(this.playerArt,true,.15,.15);
    if(!this.stageMode)this.rebuildEncounter();
    if(this.sandbox)prepareArcherTrial(this.run,params.get('path')==='b1'?'b1':'a1');
    const portrait=this.textures.get('wood-idle-down').getSourceImage() as HTMLCanvasElement;
    this.hud=new ArcherHud(document.querySelector('#app')!,{
      getArcher:()=>this.run.character,getTime:()=>this.run.time,getUltimateStatus:()=>archerUltimateStatus(this.context()),
      onBlock:value=>{this.blocked=value;this.releaseInput();},onSkill:skill=>this.skillButton(skill),
      onEvolution:(level,id)=>{try{chooseArcherEvolution(this.run.character,level,id);this.hud.feedback('Đã chọn tiến hóa.');}catch(error){this.hud.feedback(String(error));}},
      onAllocate:(key,n)=>{allocateArcherPotential(this.run.character,key,n);},
      onTrial:path=>this.preset(path),onNew:()=>this.newRun(),onTargets:()=>this.toggleTargets(),onRestore:()=>this.restore(),
      portrait:portrait.toDataURL(),sandbox:this.sandbox,stage:this.stageMode,
      canOpen:()=>this.forest?this.forest.phase==='combat':!this.stage||this.stage.phase==='combat',
    });
    this.keys=this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT') as Record<string,Phaser.Input.Keyboard.Key>;
    this.combo=new WaterSkillInput(key=>this.select(key),()=>this.select('ultimate'),.18);
    const press=(key:'q'|'e',e:KeyboardEvent)=>{if(this.canInput()&&!e.repeat&&this.forest?.phase!=='final-shot')this.combo.press(key,this.run.time,archerUltimateStatus(this.context()).ok);};
    const q=(e:KeyboardEvent)=>press('q',e),e=(e:KeyboardEvent)=>press('e',e),r=(e:KeyboardEvent)=>{if(!e.repeat&&this.canInput())this.skillButton('r');};
    const escape=()=>{this.releaseInput();this.hud.feedback('Đã hủy chọn chiêu.');};
    this.input.keyboard!.on('keydown-Q',q);this.input.keyboard!.on('keydown-E',e);this.input.keyboard!.on('keydown-R',r);this.input.keyboard!.on('keydown-ESC',escape);
    const interact=(e:KeyboardEvent)=>{if(!e.repeat)this.interactForest();};this.input.keyboard!.on('keydown-F',interact);
    const down=(p:Phaser.Input.Pointer)=>{
      if(!this.canInput()||!p.leftButtonDown())return;
      this.combo.resolvePending();
      const point=camera.getWorldPoint(p.x,p.y);this.rememberTarget(point);
      if(this.selected==='basic'){this.firing=true;this.report(castArcherBasic(this.context(),point));}
      else {const selected=this.selected;this.selected='basic';this.combo.clear();
        this.report(selected==='q'?castArcherQ(this.context(),point):selected==='e'?castArcherE(this.context(),point):castArcherUltimate(this.context(),point));}
    };
    const up=()=>{this.firing=false;};this.input.on('pointerdown',down);this.input.on('pointerup',up);this.input.on('pointerupoutside',up);
    // Releasing over DOM, losing focus or opening a modal cannot leave fire/movement held.
    const signal=this.inputAbort.signal;
    window.addEventListener('pointerup',up,{signal});window.addEventListener('blur',()=>{this.unfocused=true;this.releaseInput();},{signal});
    window.addEventListener('focus',()=>{this.unfocused=false;this.releaseInput();},{signal});
    document.addEventListener('visibilitychange',()=>{this.unfocused=document.hidden;this.releaseInput();},{signal});
    document.addEventListener('pointerdown',event=>{if(!(event.target instanceof HTMLCanvasElement))this.releaseInput();},{signal});
    const dev=(open:boolean)=>{this.devOpen=open;this.releaseInput();};const action=(action:SandboxDevAction)=>this.devAction(action);
    this.game.events.on('dev-menu-open',dev);this.game.events.on('sandbox-dev-action',action);
    this.events.once('shutdown',()=>{
      this.inputAbort.abort();this.game.events.off('dev-menu-open',dev);this.game.events.off('sandbox-dev-action',action);
      this.input.keyboard?.off('keydown-Q',q);this.input.keyboard?.off('keydown-E',e);this.input.keyboard?.off('keydown-R',r);this.input.keyboard?.off('keydown-ESC',escape);
      this.input.keyboard?.off('keydown-F',interact);
      this.input.off('pointerdown',down);this.input.off('pointerup',up);this.input.off('pointerupoutside',up);
      this.combo.clear();finishArcherRun(this.run);this.effects.destroy();this.hud.destroy();this.clearPopups();
      this.stageHud?.destroy();this.touch?.destroy();this.scale.off('resize',this.resizeStage,this);
      this.forestHud?.destroy();this.forestPresentation?.destroy();this.forestAudio?.destroy();
    });
    if(this.forest){
      const touchMode=params.has('touch')||navigator.maxTouchPoints>0||matchMedia('(any-pointer:coarse)').matches;
      this.enemyGround=this.add.graphics().setDepth(2);this.forestPresentation=new KieuNgaoPresentation(this);
      this.forestHud=new KieuNgaoHud(document.querySelector('#app')!,{getStage:()=>this.forest!,portrait:portrait.toDataURL(),touch:touchMode,
        onStart:path=>this.resetForest(path,true),onAdvance:()=>{this.releaseInput();advanceKieuNgaoStory(this.forest!);this.forestHud!.update(true);},
        onInteract:()=>this.interactForest(),onLastArrow:()=>{if(this.canInput()&&this.forest?.phase==='final-shot')this.report(castArcherBasic(this.context(),bodyCenter(this.forest.boss!)));},
        onRestart:()=>this.resetForest(this.forest!.path,false),onSound:()=>this.forestAudio!.toggle()});
      if(touchMode){this.touch=new TouchControls(document.querySelector('#app')!,(key,aim)=>this.touchAction(key,aim));document.body.classList.add('wood-stage-touch');}
      this.resizeStage();this.scale.on('resize',this.resizeStage,this);
    }
    if(this.stage){
      const touchMode=params.has('touch')||navigator.maxTouchPoints>0||matchMedia('(any-pointer:coarse)').matches;
      this.stageArt=this.add.graphics().setDepth(3).setBlendMode(Phaser.BlendModes.ADD);
      this.stageHud=new ArcherStageHud(document.querySelector('#app')!,{getStage:()=>this.stage!,portrait:portrait.toDataURL(),touch:touchMode,
        onStart:path=>this.resetStage(path,true),onContinue:()=>{this.releaseInput();continueArcherStage(this.stage!);this.stageHud!.update(true);},
        onRestart:()=>this.resetStage(this.stage!.path,false)});
      if(touchMode){this.touch=new TouchControls(document.querySelector('#app')!,(key,aim)=>this.touchAction(key,aim));document.body.classList.add('wood-stage-touch');}
      this.resizeStage();this.scale.on('resize',this.resizeStage,this);
    }
    this.renderActors();this.hud.feedback(this.stageMode?'':this.sandbox?'A1/B1 cấp 15 · Q+E rồi click vào bia để thử đại chiêu.':'Cấp 1 · Diệt quái, tích điểm và chọn tiến hóa trong bảng C.');
  }
  private context(){const v=this.cameras.main.worldView;return archerRunContext(this.run,{x:v.x,y:v.y,width:v.width,height:v.height});}
  private canInput(){return (this.forest?kieuNgaoCanShoot(this.forest):!this.stage||this.stage.phase==='combat')&&!this.blocked&&!this.devOpen&&!this.unfocused&&!document.hidden&&this.run.character.resources.currentHp>0;}
  private releaseInput(){this.firing=false;this.selected='basic';this.combo?.clear();this.input.keyboard?.resetKeys();}
  private select(skill:Selection){this.firing=false;this.selected=skill;this.hud.feedback(`${skill==='ultimate'?'Đại chiêu':skill.toUpperCase()} · Click chọn ${skill==='e'||(skill==='ultimate'&&this.run.character.progression.evolutionChoices['7']==='wood-b1-7')?'vùng':'hướng'} · Esc hủy`);}
  private skillButton(skill:'basic'|'q'|'e'|'r'|'ultimate'){
    if(!this.canInput()||this.forest?.phase==='final-shot'&&skill!=='basic')return;this.combo.clear();
    if(skill==='r')this.report(castArcherR(this.context()));
    else if(skill==='ultimate'){const status=archerUltimateStatus(this.context());status.ok?this.select(skill):this.report(status);}
    else this.select(skill);
  }
  private report(result:ReturnType<typeof castArcherQ>){this.hud.feedback(result.ok?'':archerCastMessage(result));}
  private rememberTarget(point:Point){const target=this.run.combatBodies.filter(b=>b.actor.resources.currentHp>0)
    .sort((a,b)=>Math.hypot(bodyCenter(a).x-point.x,bodyCenter(a).y-point.y)-Math.hypot(bodyCenter(b).x-point.x,bodyCenter(b).y-point.y))[0];
    if(target&&Math.hypot(bodyCenter(target).x-point.x,bodyCenter(target).y-point.y)<90)this.selectedTarget=target.id;}
  private rebuildEncounter(){
    this.enemyArt.forEach(a=>{a.sprite.destroy();a.label.destroy();});this.enemyArt=[];this.selectedTarget=undefined;this.nextWave=undefined;
    const enemies=spawnArcherEncounter(this.run,this.trial,this.wave);
    if(this.trial)enemies[0].position.x=this.run.player.position.x+Math.min(220,this.cameras.main.width*.25);
    for(const body of enemies){const sprite=this.add.sprite(body.position.x,body.position.y,`monster-${body.artId}-normal`);
      setMonsterPose(sprite,body.artId,false,false);body.hitbox=this.hitboxes.localBox(sprite,body.position,monsterBodyClip(sprite,body.artId));
      const label=this.add.text(body.position.x,body.position.y,body.label,{fontSize:'11px',color:'#eef0cf',stroke:'#122319',strokeThickness:3}).setOrigin(.5,1);
      this.enemyArt.push({body,sprite,label});}
  }
  private preset(path:'a1'|'b1'){
    this.releaseInput();this.effects.clear();this.clearPopups();this.trial=true;this.wave=1;
    this.run.player.position={...this.run.zone.spawn};this.rebuildEncounter();prepareArcherTrial(this.run,path);this.alive=true;
    this.hud.update(true);this.hud.feedback(`Đã chuẩn bị ${path.toUpperCase()} cấp 15 · đủ 6 Sinh Tức.`);
  }
  private newRun(){
    if(this.forest){this.resetForest(this.forest.path,false);return;}
    if(this.stage){this.resetStage(this.stage.path,false);return;}
    this.playback=1;
    this.releaseInput();this.effects.clear();this.clearPopups();const zone=this.run.zone;finishArcherRun(this.run);
    this.run=createArcherRun(crypto.randomUUID(),zone);this.trial=false;this.wave=1;this.alive=true;this.rebuildEncounter();
    this.hud.update(true);this.hud.feedback('Run mới · Lv1. Điểm và tiến hóa bắt đầu lại.');
  }
  private toggleTargets(){
    this.releaseInput();const sap=this.run.character.wood.sap;clearWoodArcher(this.context());this.run.character.wood.sap=sap;
    this.effects.clear();this.clearPopups();this.trial=!this.trial;this.wave++;this.rebuildEncounter();
    this.hud.feedback(this.trial?'Bia 1.000.000 HP · DEF 50 · hệ Mộc.':'Quái đang hoạt động · đọc hướng tấn công và né.');
  }
  private restore(){if(!this.sandbox)return;this.run.character.resources.currentHp=this.run.character.stats.maxHp;this.run.character.resources.currentMp=this.run.character.stats.maxMp;
    this.alive=true;this.hud.update(true);this.hud.feedback('Đã hồi đầy HP/MP trong phòng thử.');}
  private devAction(action:SandboxDevAction){
    if(this.forest){this.releaseInput();
      if(action==='archer-stage-clear')debugKieuNgao(this.forest,'clear');
      else if(action==='archer-stage-ready')debugKieuNgao(this.forest,'ready');
      else if(action==='restore')debugKieuNgao(this.forest,'restore');
      else if(action==='toggle-monster-ai')setEnemyCombatEnabled(this.run.enemyCombat,!this.run.enemyCombat.enabled);
      else if(action==='forest-marker'){const p=kieuNgaoInteraction(this.forest)?.point;if(p)this.run.player.position={...p};}
      this.forestHud?.update(true);this.hud.update(true);return;}
    if(this.stage){this.releaseInput();
      if(action==='archer-stage-clear')debugArcherStage(this.stage,'clear');
      else if(action==='archer-stage-ready')debugArcherStage(this.stage,'ready');
      else if(action==='restore')debugArcherStage(this.stage,'restore');
      else if(action==='toggle-monster-ai')setEnemyCombatEnabled(this.run.enemyCombat,!this.run.enemyCombat.enabled);
      this.stageHud?.update(true);this.hud.update(true);return;}
    this.releaseInput();if(action==='trial-archer-a1')this.preset('a1');else if(action==='trial-archer-b1')this.preset('b1');
    else if(action==='toggle-archer-slow'&&this.sandbox){this.playback=this.playback===1?.25:1;this.hud.feedback(this.playback===1?'Tốc độ thường.':'Xem chậm ×4 · toàn bộ trận dùng cùng một nhịp.');}
    else if(action==='restore')this.restore();else if(action==='toggle-monster-ai'){setEnemyCombatEnabled(this.run.enemyCombat,!this.run.enemyCombat.enabled);}
    else if(action==='grant-exp')grantArcherExperience(this.run.character,100);else if(action==='level-up')grantArcherExperience(this.run.character,200);
    this.hud.update(true);
  }
  update(_time:number,delta:number){
    if(!this.run||!this.hud)return;
    const paused=(this.forest?!kieuNgaoCanMove(this.forest):!!this.stage&&this.stage.phase!=='combat')||this.blocked||this.devOpen||this.unfocused||document.hidden;
    const direction={x:Number(this.keys.D.isDown||this.keys.RIGHT.isDown)-Number(this.keys.A.isDown||this.keys.LEFT.isDown),
      y:Number(this.keys.S.isDown||this.keys.DOWN.isDown)-Number(this.keys.W.isDown||this.keys.UP.isDown)};
    if(this.touch&&Math.hypot(this.touch.move.x,this.touch.move.y)>0)Object.assign(direction,this.touch.move);
    const aim=this.cameras.main.getWorldPoint(this.input.activePointer.x,this.input.activePointer.y);
    if(!paused){
      this.combo.flush(this.run.time);const seconds=Math.min(delta/1000,.1)*this.playback,input={direction,aim,firing:this.firing&&this.selected==='basic'};
      if(this.forest)tickKieuNgaoStage(this.forest,seconds,input);else if(this.stage)tickArcherStage(this.stage,seconds,input);else tickArcherRun(this.run,seconds,input);
      const events=this.run.character.wood.events.splice(0);this.effects.handle(events,this.context());
      for(const e of events)if(e.kind==='damage')this.popup(e.position,e.damage.appliedDamage,e.damage.critical?'#fff0a9':'#ebf1c0');
      for(const e of this.run.enemyCombat.events.splice(0))if(e.kind==='damage')this.popup(e.position,e.damage.appliedDamage,'#ffb49d');
      if(this.alive&&this.run.character.resources.currentHp<=0){this.alive=false;this.releaseInput();this.effects.clear();this.hud.feedback('Bạn đã gục. Chọn Chơi mới để bắt đầu lại.');}
      if(!this.stage&&!this.forest&&!this.trial&&this.alive&&this.run.combatBodies.every(b=>b.actor.resources.currentHp<=0)){
        this.nextWave??=this.run.time+B.encounter.respawnDelay;
        if(this.run.time>=this.nextWave){this.wave++;this.rebuildEncounter();this.hud.feedback(`Đợt ${this.wave} · ${this.run.character.progression.potential.unspent} điểm tiềm năng. C để phát triển nhân vật.`);}
      }
    }
    if(this.stage||this.forest){this.syncStageEnemies();if(this.forest)this.renderForest();else this.renderStage();this.stageHud?.update();this.forestHud?.update();
      const wood=this.run.character.wood,cd=(key:'q'|'e'|'r'|'ultimate')=>Math.max(0,wood.cooldowns[key]-this.run.time);
      this.touch?.update('combat',paused,undefined,this.run.time,{combo:!this.forest||this.forest.phase==='combat',
        movementOnly:!!this.forest&&!kieuNgaoCanShoot(this.forest),basicOnly:this.forest?.phase==='final-shot',statuses:{attack:'0 MP',
        q:cd('q')?`${cd('q').toFixed(1)}s`:'18 MP',e:cd('e')?`${cd('e').toFixed(1)}s`:'20 MP',
        r:cd('r')?`${cd('r').toFixed(1)}s`:'3 Sinh Tức',combo:cd('ultimate')?`${Math.ceil(cd('ultimate'))}s`:`${wood.sap}/6 Sinh Tức`}});}
    this.renderActors(paused?{x:0,y:0}:direction);this.effects.update(this.context());this.renderTargeting(aim);this.renderPopups();this.hud.update();
    if(this.forest)this.forestAudio?.update(this.forest,this.blocked||this.devOpen||this.unfocused||document.hidden);
    const target=this.run.combatBodies.find(b=>b.id===this.selectedTarget&&b.actor.resources.currentHp>0&&b.targetable!==false)??this.run.combatBodies.find(b=>b.actor.resources.currentHp>0&&b.targetable!==false);
    const art=this.enemyArt.find(a=>a.body===target);this.hud.target(target?{label:art?.body.label??'Mục tiêu',hp:target.actor.resources.currentHp,maxHp:target.actor.stats.maxHp,element:elements[target.actor.element]}:undefined);
    if(this.run.time-this.statusAt>1){this.statusAt=this.run.time;this.game.events.emit('sandbox-dev-status',`CUNG THỦ MỘC · Lv${this.run.character.progression.level}\nA1 / B1 mở · A2 / B2 khóa\nSinh Tức ${this.run.character.wood.sap}/6 · Đợt ${this.wave}\nAI ${this.run.enemyCombat.enabled?'chạy':'dừng'} · ${Math.round(this.game.loop.actualFps)} FPS\nTốc độ ${this.playback===1?'thường':'chậm ×4'}`);}
  }
  private resizeStage(){if(this.stageMode){this.cameras.main.setZoom(Math.max(.65,Math.min(1.1,this.scale.height/750)));this.cameras.main.setFollowOffset(0,90);}}
  private resetForest(path:ArcherStagePath,start:boolean){
    this.releaseInput();this.effects.clear();this.clearPopups();finishArcherRun(this.run);
    this.enemyArt.forEach(a=>{a.sprite.destroy();a.label.destroy();});this.enemyArt=[];
    this.run=createArcherRun(crypto.randomUUID(),createKieuNgaoZone());this.forest=createKieuNgaoStage(this.run,path);this.alive=true;this.blocked=false;
    this.selectedTarget=undefined;this.stagePhase='';this.forestMap=-1;this.heading={x:1,y:0};this.hud.feedback('');
    history.replaceState(null,'',`?stage=kieu-ngao&character=archer&path=${path}${this.touch?'&touch=1':''}`);
    if(start){void this.forestAudio?.start();advanceKieuNgaoStory(this.forest);}
    this.forestHud!.update(true);this.hud.update(true);this.renderActors();
  }
  private interactForest(){if(!this.forest||this.blocked||this.devOpen||this.unfocused||document.hidden)return;
    if(interactKieuNgao(this.forest)){this.releaseInput();this.forestHud?.update(true);}}
  private renderForest(){
    const s=this.forest!,key=`${s.phase}:${s.mapIndex}:${s.revealIndex}`;
    if(this.forestMap!==s.mapIndex){this.forestMap=s.mapIndex;this.mapArt.setTexture(`forest-map-${s.mapIndex+1}`).setDisplaySize(1800,1200);
      this.cameras.main.centerOn(this.run.player.position.x,this.run.player.position.y);}
    if(key!==this.stagePhase){this.stagePhase=key;this.releaseInput();this.effects.clear();this.clearPopups();}
    this.forestPresentation?.update(s);
  }
  private poseEnemy(body:ArcherEnemy,sprite:Phaser.GameObjects.Sprite):BodyBox|undefined{
    const controller=this.run.enemyCombat.controllers.find(c=>c.id===body.id);
    if(!this.forest){setMonsterPose(sprite,body.artId,controller?.phase==='windup'||controller?.phase==='lunge',controller?.facingLeft??false,controller?.boss?.phase);return monsterBodyClip(sprite,body.artId);}
    if(body.artId==='moc-loc'){setMocLocPose(sprite,!!this.forest.bossAttack&&this.forest.bossAttack.kind==='charge',!!this.forest.bossAttack&&this.forest.bossAttack.to.x>this.forest.bossAttack.from.x);
      return (sprite.frame.customData as {body:BodyBox}).body;}
    if(body.artId==='seal-root'){sprite.setTexture('wood-bramble').setDisplaySize(78,82).setOrigin(.5,.84).setTint(0xb0a384);return;}
    setUeMonsterPose(sprite,body.artId,controller?.phase??'idle',controller?.facingLeft??false,undefined,this.forest.mapIndex+1);return ueMonsterBodyClip(sprite);
  }
  private resetStage(path:ArcherStagePath,start:boolean){
    this.releaseInput();this.effects.clear();this.clearPopups();finishArcherRun(this.run);
    this.enemyArt.forEach(a=>{a.sprite.destroy();a.label.destroy();});this.enemyArt=[];
    this.run=createArcherRun(crypto.randomUUID(),createLinhMocZone());this.stage=createArcherStage(this.run,path);this.alive=true;this.blocked=false;
    this.selectedTarget=undefined;this.stagePhase='';this.heading={x:1,y:0};
    history.replaceState(null,'',`?stage=linh-moc&character=archer&path=${path}`);
    if(start)startArcherStage(this.stage);this.stageHud!.update(true);this.hud.update(true);this.renderActors();
  }
  private syncStageEnemies(){
    const bodies=this.run.combatBodies as ArcherEnemy[],ids=new Set(bodies.map(b=>b.id));
    this.enemyArt=this.enemyArt.filter(a=>{if(ids.has(a.body.id))return true;a.sprite.destroy();a.label.destroy();return false;});
    const known=new Set(this.enemyArt.map(a=>a.body.id));
    for(const body of bodies)if(!known.has(body.id)){
      const key=this.forest?body.artId==='moc-loc'?'forest-moc-loc':body.artId==='seal-root'?'wood-bramble':ueMonsterKey(body.artId):`monster-${body.artId}-normal`;
      const frame=this.forest&&body.artId==='moc-loc'?'guard':this.forest&&body.artId!=='seal-root'?ueIdleFrame(body.artId):undefined;
      const sprite=this.add.sprite(body.position.x,body.position.y,key,frame),clip=this.poseEnemy(body,sprite);
      if(body.artId!=='seal-root')body.hitbox=this.hitboxes.localBox(sprite,body.position,clip);
      const label=this.add.text(body.position.x,body.position.y,body.label,{fontSize:'11px',color:'#eef0cf',stroke:'#122319',strokeThickness:3}).setOrigin(.5,1);
      this.enemyArt.push({body,sprite,label});
    }
  }
  private renderStage(){
    const s=this.stage!,g=this.stageArt!;g.clear();const heart=LINH_MOC_HEART,now=this.run.time;
    const pulse=matchMedia('(prefers-reduced-motion:reduce)').matches?0:Math.sin(now*2)*3;
    g.lineStyle(9,0x7cda9e,.12).strokeEllipse(heart.x,heart.y,120+pulse,75+pulse);
    g.lineStyle(1.5,0xe5d393,.8).strokeEllipse(heart.x,heart.y,108+pulse,68+pulse);
    for(let i=0;i<12;i++){const angle=i*Math.PI/6;g.fillStyle(0xbded9c,.7).fillEllipse(heart.x+Math.cos(angle)*55,heart.y+Math.sin(angle)*34,5,3);}
    if(s.phase==='combat')for(const pending of s.pending.filter(p=>p.dueAt-now<1.8)){
      const point=LINH_MOC_LANES[pending.lane].spawn;g.lineStyle(2,0xf2be73,.8).strokeCircle(point.x,point.y,28+pulse);
      g.lineStyle(1,0xf2be73,.35).lineBetween(point.x,point.y,point.x+(heart.x-point.x)*.1,point.y+(heart.y-point.y)*.1);
    }
    if(s.phase!==this.stagePhase){this.stagePhase=s.phase;this.releaseInput();this.effects.clear();
      if(s.phase==='won'&&!matchMedia('(prefers-reduced-motion:reduce)').matches)this.cameras.main.flash(450,130,190,100);}
  }
  private touchAction(key:TouchAction,heading?:Point){
    if(!this.canInput()||this.forest?.phase==='final-shot'&&key!=='attack')return;const origin=this.run.player.position;
    const target=this.run.combatBodies.filter(b=>b.actor.resources.currentHp>0&&!b.burrowed&&b.targetable!==false).sort((a,b)=>Math.hypot(a.position.x-origin.x,a.position.y-origin.y)-Math.hypot(b.position.x-origin.x,b.position.y-origin.y))[0];
    const point=heading?{x:origin.x+heading.x*300,y:origin.y-28+heading.y*300}:target?bodyCenter(target):{x:origin.x+this.heading.x*280,y:origin.y-28+this.heading.y*280};
    this.report(key==='attack'?castArcherBasic(this.context(),point):key==='q'?castArcherQ(this.context(),point):key==='e'?castArcherE(this.context(),point):key==='r'?castArcherR(this.context()):castArcherUltimate(this.context(),point));
  }
  private renderActors(direction:Point={x:0,y:0}){
    if(this.forest?.phase!=='ending')this.playerArt.setScale(1/3).setOrigin(.5,85/96);
    const p=this.run.player.position,s=this.run.character.wood,moving=Math.hypot(direction.x,direction.y)>0;
    const pending=s.scheduled.find(e=>e.kind==='arrow');
    if(s.busyUntil>this.run.time){
      const locked=s.ultimate?.direction??(pending?.kind==='arrow'?pending.direction:undefined);
      if(locked)this.heading=locked;else if(s.dash)this.heading={x:-s.dash.direction.x,y:-s.dash.direction.y};
    }else if(moving)this.heading=direction;
    const horizontal=Math.abs(this.heading.x)>Math.abs(this.heading.y),left=this.heading.x<0;
    if(s.busyUntil>this.run.time){this.playerArt.anims.stop();this.playerArt.setTexture(s.ultimate?'wood-ultimate':'wood-fire').setFlipX(left);}
    else if(moving&&horizontal)this.playerArt.play('wood-run-right',true).setFlipX(left);
    else {this.playerArt.anims.stop();this.playerArt.setTexture(horizontal?left?'wood-idle-left':'wood-idle-right':this.heading.y<0?'wood-idle-up':'wood-idle-down').setFlipX(false);}
    this.playerArt.setPosition(p.x,p.y).setDepth(p.y).setAlpha(this.alive?1:.45);
    if(this.forest?.phase==='ending'){this.playerArt.anims.stop();setForestPerson(this.playerArt,'archer-sit',72);}
    this.shadow.setPosition(p.x,p.y-2);this.graphics.clear();
    for(const a of this.enemyArt){const body=a.body,controller=this.run.enemyCombat.controllers.find(c=>c.id===body.id),live=body.actor.resources.currentHp>0;
      const boss=controller?.boss;
      if(live&&boss){
        const marked=boss.phase==='underground'?boss.emergeAt:['jump-warning','jump'].includes(boss.phase)?boss.jumpTarget:undefined;
        if(marked){const radius=controller!.settings.meleeHitRadius;
          this.graphics.fillStyle(0xa84429,.14).fillCircle(marked.x,marked.y,radius);
          this.graphics.lineStyle(3,0xffb46b,.9).strokeCircle(marked.x,marked.y,radius);
          const progress=Math.min(1,Math.max(0,(this.run.time-boss.startedAt)/(boss.endsAt-boss.startedAt)));
          this.graphics.lineStyle(2,0xffead0,.8).strokeCircle(marked.x,marked.y,Math.max(5,radius*(1-progress)));}
        if(boss.phase==='roll-warning')this.graphics.lineStyle(8,0xffa765,.4).lineBetween(body.position.x,body.position.y,
          body.position.x+boss.direction.x*230,body.position.y+boss.direction.y*230);
      }
      a.sprite.setPosition(body.position.x,body.position.y).setDepth(body.position.y).setVisible(live&&!body.burrowed);a.label.setVisible(live&&!body.burrowed);if(!live||body.burrowed)continue;
      const clip=this.poseEnemy(body,a.sprite);if(body.artId!=='seal-root')body.hitbox=this.hitboxes.localBox(a.sprite,body.position,clip);const box=worldBodyBox(body)!;
      a.label.setPosition(body.position.x,box.y-10);const width=body.rank==='boss'?100:54;
      if(body.artId!=='moc-loc'){this.graphics.fillStyle(0x102b1e,.9).fillRoundedRect(body.position.x-width/2,box.y-7,width,4,2);
        this.graphics.fillStyle(0xc78a63,.95).fillRoundedRect(body.position.x-width/2,box.y-7,width*body.actor.resources.currentHp/body.actor.stats.maxHp,4,2);}
      if(!this.forest&&controller?.phase==='windup'&&controller.aim){this.graphics.lineStyle(2,0xff946b,.8).lineBetween(body.position.x,body.position.y,controller.aim.x,controller.aim.y);
        this.graphics.lineStyle(1,0xffbc84,.8).strokeCircle(controller.aim.x,controller.aim.y,controller.settings.meleeHitRadius);}
    }
    if(this.forest)drawUeEnemyEffects(this.run,this.graphics,this.enemyGround!,[],matchMedia('(prefers-reduced-motion:reduce)').matches);
    else for(const shot of this.run.enemyCombat.shots){const p=shot.projectile.position;this.graphics.fillStyle(shot.visual==='slime'?0xa4b27b:0xc49377,.95).fillCircle(p.x,p.y,5);}
  }
  private renderTargeting(aim:Point){
    const g=this.targeting;g.clear();if(this.selected==='basic'||!this.canInput())return;
    const p=this.run.player.position;g.lineStyle(1,0xe8dea3,.6).lineBetween(p.x,p.y-28,aim.x,aim.y);
    const radius=this.selected==='ultimate'&&this.run.character.progression.evolutionChoices['7']==='wood-b1-7'?B.ultimate.groveRadius:this.selected==='e'?B.e.radius:16;
    g.lineStyle(2,0xaee6ac,.8).strokeCircle(aim.x,aim.y,radius);g.lineStyle(1,0xf6e4ad,.75).strokeCircle(aim.x,aim.y,5);
  }
  private popup(position:Point,amount:number,color:string){if(amount<=0)return;if(this.popups.length>=40)this.popups.shift()!.text.destroy();
    const text=this.add.text(position.x,position.y-45,Math.round(amount).toLocaleString('vi-VN'),{fontFamily:'Georgia',fontSize:amount>1000?'23px':'15px',color,stroke:'#18241b',strokeThickness:3}).setOrigin(.5).setDepth(9020);
    this.popups.push({text,at:this.run.time,position:{...position}});}
  private renderPopups(){for(let i=this.popups.length-1;i>=0;i--){const p=this.popups[i],age=this.run.time-p.at;
    if(age>.9){p.text.destroy();this.popups.splice(i,1);}else p.text.setPosition(p.position.x,p.position.y-45-age*35).setAlpha(1-age/.9);}}
  private clearPopups(){this.popups.forEach(p=>p.text.destroy());this.popups=[];}
}
