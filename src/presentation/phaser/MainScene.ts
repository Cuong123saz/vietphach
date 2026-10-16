import { WaterDragonPreview, prepareDragonPreviewTextures, DRAGON_PREVIEW } from './WaterDragonPreview';
import { createSandboxDummies, type SandboxDummy } from '../../dev/sandbox/fixtures';
import { createSandboxMonsters, MONSTER_AI_TUNING } from '../../dev/sandbox/monsters';
import { ELITE_ENEMIES } from '../../config/balance/eliteEnemies';
import { MONSTER_ART, preloadMonsters, setMonsterPose, monsterBodyClip } from './MonsterTextures';
import { UE_MONSTER_FAMILIES, preloadUeMonsters, prepareUeMonsters, setUeMonsterPose, ueMonsterKey, ueIdleFrame } from './UeMonsterTextures';
import { drawUeEnemyEffects, type UeImpact } from './UeEnemyEffects';
import type { SandboxDevAction } from '../../dev/sandbox/DevMenu';
import { MiniWaterChargeEffect } from './MiniWaterChargeEffect';
import { WaterSupportEffects, preloadWaterSupport, prepareWaterSupport, hasWaterGuard, waterMirrorOrigin } from './WaterSupportEffects';
import { WaterSwampEffects, preloadWaterSwamp, prepareWaterSwamp } from './WaterSwampEffects';
import { hasWaterLong, waterLongERadius } from '../../gameplay/characters/jobs/mage/WaterLongRules';
import { WaterPrisonDelivery, WaterPrisonEffects, preloadWaterPrison } from './WaterPrisonEffects';
import Phaser from 'phaser';
import { TouchControls, enterTouchLandscape, type TouchAction } from '../hud/TouchControls';
import { MAPS, KHANG_CHIEN_CLEANSED_MAP_URL, type Point, type Zone } from '../../world/definitions';
import { createRun, createVillageZone, finishRun, moveRunPlayer, playerSlowMultiplier, playerPhasing, tickRun, fireRunProjectile, tickRunProjectiles, registerRunCombatBody, registerRunEnemyController, castRunQ, castRunE, castRunR, awardRunExperience, chooseRunEvolution, type RunState } from '../../run/Run';
import { RUN_BALANCE } from '../../config/balance/core';
import { experienceRequired } from '../../gameplay/progression/Level';
import { resetEnemyCombat, setEnemyCombatEnabled, wallObject } from '../../gameplay/enemies/EnemyCombat';
import { drainWaterEvents, type CastResult } from '../../gameplay/characters/jobs/mage/WaterMageSkills';
import { totalShield } from '../../gameplay/combat/Shield';
import { resolveDamage } from '../../gameplay/combat/Damage';
import { restoreResource } from '../../gameplay/characters/core/CharacterResources';
import { bodyInView, validBody } from '../../gameplay/combat/CombatBody';
import { WATER_MAGE_TUNING } from '../../config/balance/waterMage';
import { ENEMY_THREAT } from '../../config/balance/enemyThreat';
import { MOVEMENT_PREVIEW } from '../../config/movement';
import { createCharacterTextures, applyCharacterTextureScale, FACINGS, runAnimationKey, idleTextureKey, type Facing, type CharacterBase } from '../animations/characterTextures';
import { createWaterCannonTextures, WATER_CANNON_VISUAL as VISUAL } from '../animations/waterCannonTextures';
import { preloadMageModel } from '../animations/mageModel';
import { WATER_CANNON_PREVIEW as PREVIEW } from '../../config/waterCannon';
import { pressWaterCannon, releaseWaterCannon, stopWaterCannon, tickWaterCannon, chargeMoveMultiplier } from '../../gameplay/characters/jobs/mage/WaterCannon';
import type { ProjectileTarget } from '../../gameplay/combat/Projectile';
import { CombatHud } from '../hud/CombatHud';
import { enemyHudTarget, enemyHudModel, ELEMENT_PRESENTATION } from '../hud/enemyHudModel';
import { AssetLoadGuard } from './AssetLoadGuard';
import { SpriteHitboxes } from './SpriteHitbox';
import { bodyCenter, bodyIntersectsCircle, movementBody, worldBodyBox } from '../../world/bodyGeometry';
import { allocateRunPotential } from '../../run/Run';
import { khangChienMapId, createKhangChienZone, KHANG_CHIEN_REFUGE, KHANG_CHIEN_ROADS } from '../../world/khangChien';
import { KHANG_CHIEN_BALANCE } from '../../config/balance/khangChien';
import { preloadKhangChienRefuge, drawKhangChienRefuge } from './KhangChienRefuge';
import { OPENING_SHIELD, openingShieldPlacement, createKhangChienRuntime, tickKhangChien, stageInteractive, syncKhangChienOpening, khangChienDev, renewalStep, castKhangChienFinaleQ, finaleTiming, khangChienTimeScale, beginKhangChienSacrifice, inputKhangChienRitual, finaleQRemaining, purificationProgress, stageAge, type KhangChienRuntime } from '../../run/KhangChienStage';
import { KhangChienMusic } from './KhangChienMusic';
import { KhangChienHud } from '../hud/KhangChienHud';
import { KhangChienEffects } from './KhangChienEffects';
import { KhangChienWaterTint, khangChienWaterTint } from './KhangChienWaterTint';
import { stageKeyboardEnabled } from './stageInputPolicy';
import { WaterSkillInput } from './WaterSkillInput';
import { WaterUltimateEffects } from './WaterUltimateEffects';
import { waterGroundE, waterGroundERadius, waterUltimateKind } from '../../gameplay/characters/jobs/mage/WaterHumanRules';
import { waterUltimateStatus } from '../../gameplay/characters/jobs/mage/WaterMageCapstones';
import { castRunUltimate } from '../../run/Run';
import { WATER_EVOLUTION as EV } from '../../config/balance/waterEvolution';
import { prepareWaterEvolutionTrial } from '../../dev/sandbox/waterEvolutionTrial';

const WORLD_WIDTH = MAPS.village.width;
const WORLD_HEIGHT = MAPS.village.height;
const CAMERA_REFERENCE_HEIGHT = 620;
const CAPTURE_CAMERA_REFERENCE_HEIGHT = 440;
// Clear dirt path outside the village in the v2 artwork (not the irrigation bank).
const CAMERA_FOLLOW_RATE = 8;
const MAP_TEXTURE = 'village-area-1';
const KHANG_CHIEN_MAP = khangChienMapId(location.search);
const MAP_URL = MAPS[KHANG_CHIEN_MAP ?? 'village'].url;
const MAP_ASPECT_RATIO_TOLERANCE = 0.005;
const KHANG_CHIEN_STAGE = import.meta.env.VITE_STAGE_ONLY==='1' || new URLSearchParams(location.search).get('stage')==='khang-chien';


export class MainScene extends Phaser.Scene {
  private run!: RunState;
  private player!: Phaser.GameObjects.Container;
  private devKeys?: Record<string, Phaser.Input.Keyboard.Key>;
  private debugGraphics?: Phaser.GameObjects.Graphics;
  private debugText?: Phaser.GameObjects.Text;
  private debugEnabled = false;
  private labZone?: Zone;
  private character!: Phaser.GameObjects.Sprite;
  private facing: Facing = 'down';
  private characterBase: CharacterBase = 'basic';
  private qFacingLeft=false;
  private stageFocused=true;
  private dragonPreview?: WaterDragonPreview | WaterPrisonDelivery;
  private castStartRemaining=0;
  private firingVisualRemaining=0;
  private waterChargeEffect?: MiniWaterChargeEffect;
  private aim = { x: 1, y: 0 };
  private projectileImages = new Map<string, Phaser.GameObjects.Image>();
  private previewTargets: ProjectileTarget[] = [];
  private previewHits = 0;
  private sandboxDummies: SandboxDummy[] = [];
  private sandboxLabels = new Map<string, Phaser.GameObjects.Text>();
  private hud?: CombatHud;
  private enemyFocusId?: string;
  private lastEnemyHitId?: string;
  private enemyFocusRing?: Phaser.GameObjects.Ellipse;
  private assetLoadGuard?: AssetLoadGuard;
  private spriteHitboxes=new SpriteHitboxes();
  private allySprites=new Map<string,Phaser.GameObjects.Sprite>();
  private uiBlocks = new Set<string>();
  private lastDamage = 0;
  private copyDragons: { effect: WaterDragonPreview | WaterPrisonDelivery; origin: Point; updatedAt: number }[] = [];
  private dragonUpdatedAt = 0;
  private waterSupport?: WaterSupportEffects;
  private waterSwamp?: WaterSwampEffects;
  private waterPrison?:WaterPrisonEffects;
  private ePlacement?:Phaser.GameObjects.Arc;
  private ultimatePlacement=false;
  private waterSkillInput?:WaterSkillInput;
  private waterUltimateEffects?:WaterUltimateEffects;
  private sandboxCircles = new Map<string, Phaser.GameObjects.Arc>();
  private sandboxCharacters = new Map<string, Phaser.GameObjects.Container>();
  private monsterSprites = new Map<string, Phaser.GameObjects.Sprite>();
  private monsterPortraits=new Map<string,string>();
  private enemyShotGraphics?:Phaser.GameObjects.Graphics;
  private enemyZoneGraphics?:Phaser.GameObjects.Graphics;
  private bristleBursts=new Set<string>();
  private ueImpacts:UeImpact[]=[];
  private rootLabel?:Phaser.GameObjects.Text;private rootTotal=0;
  private castFeedback = '';
  private stageRun?:KhangChienRuntime;
  private stageMusic?:KhangChienMusic;private stageMusicStarting=false;
  private stageHud?:KhangChienHud;
  private stageEffects?:KhangChienEffects;
  private stageMap?:Phaser.GameObjects.Image;
  private stageMapBlend?:Phaser.GameObjects.Image;
  private stageWaterColors=new KhangChienWaterTint();
  private purificationCamera?:{x:number;y:number;zoom:number};
  private touchControls?:TouchControls;
  private touchAim?:{x:number;y:number};
  private stageBarrier?:Phaser.GameObjects.Image;
  private openingShield?:{band:Phaser.GameObjects.Graphics;waves:{image:Phaser.GameObjects.Image;angle:number;scale:number}[]};private openingShieldImpact=false;private openingShieldBroken=false;
  private stageLastPhase='';
  private replayAtBarrier=false;

  init(data:{replayAtBarrier?:boolean}={}){this.replayAtBarrier=!!data.replayAtBarrier;this.stageLastPhase='';this.castFeedback='';this.purificationCamera=undefined;this.stageWaterColors=new KhangChienWaterTint();}

  constructor() {
    super('MainScene');
  }

  preload() {
    this.assetLoadGuard?.destroy();
    this.assetLoadGuard=new AssetLoadGuard(this,[MAP_TEXTURE,...(KHANG_CHIEN_STAGE?UE_MONSTER_FAMILIES.map(ueMonsterKey):[])]);
    if(KHANG_CHIEN_STAGE)preloadUeMonsters(this);
    else if(new URLSearchParams(location.search).has('sandbox'))preloadMonsters(this);
    const params=new URLSearchParams(location.search);
    this.characterBase = params.get('character') === 'mage' || params.has('sandbox') || KHANG_CHIEN_STAGE ? 'mage' : 'basic';
    this.load.image(MAP_TEXTURE, MAP_URL);
    if(KHANG_CHIEN_MAP || KHANG_CHIEN_STAGE)preloadKhangChienRefuge(this);
    if(KHANG_CHIEN_STAGE)for(const i of [1,2,3,4])this.load.image(`khang-stage-map-${i}`,MAPS[`khang-chien-${i}` as keyof typeof MAPS].url);
    if(KHANG_CHIEN_STAGE)this.load.image('khang-stage-cleansed',KHANG_CHIEN_CLEANSED_MAP_URL);
    this.load.image('eight-dragon-formation','/assets/characters/mage/BatDaiHaiLong/formation.png');
    if(KHANG_CHIEN_STAGE){
      this.load.image('martial-idle-source','/assets/characters/basic/martial-idle-source.png');
      this.load.image('martial-run-source','/assets/characters/basic/martial-run-source.png');
      for(const facing of ['down','left','right'])for(let frame=0;frame<4;frame++)this.load.image(`martial-original-${facing}-${frame}`,`/assets/characters/basic/martial-run-${facing}-original-${frame}.png`);
    }
    if (this.characterBase === 'mage') {
      preloadWaterSupport(this);
      preloadWaterSwamp(this);
      preloadWaterPrison(this);
      preloadMageModel(this);
      this.load.image('dragon-formation-source','/assets/characters/mage/water-cannon/dragon-formation.png');
      this.load.image('dragon-dive-source','/assets/characters/mage/water-cannon/dragon-dive.png');
      this.load.image('dragon-impact','/assets/characters/mage/water-cannon/dragon-impact.png');
      this.load.image('water-impact','/assets/characters/mage/water-cannon/impact.png');
      this.load.image('water-full-loop-source','/assets/characters/mage/water-cannon/full-water-loop.png');
      this.load.image('water-charge-water-source','/assets/characters/mage/water-cannon/charge-water.png');
      this.load.image('water-cannon-source', '/assets/characters/mage/water-cannon/source.png');
      return;
    }
    this.load.image('martial-idle-source', '/assets/characters/basic/martial-idle-source.png');
    this.load.image('martial-run-source', '/assets/characters/basic/martial-run-source.png');
    for (const facing of ['down', 'left', 'right']) {
      for (let frame = 0; frame < 4; frame++) {
        this.load.image(`martial-original-${facing}-${frame}`, `/assets/characters/basic/martial-run-${facing}-original-${frame}.png`);
      }
    }
  }

  create() {
    this.game.canvas.tabIndex=0;
    if(this.assetLoadGuard?.failed){this.assetLoadGuard.showRecovery();return;}
    if(KHANG_CHIEN_STAGE)createCharacterTextures(this,'basic');
    if(KHANG_CHIEN_STAGE)prepareUeMonsters(this);
    this.ueImpacts=[];
    this.game.canvas.dataset.assetLoad='ready';
    this.labZone = this.registry.get('labZone') as Zone | undefined;
    this.run = createRun(crypto.randomUUID(), KHANG_CHIEN_STAGE?createKhangChienZone(1):this.labZone ?? (KHANG_CHIEN_MAP?createKhangChienZone(Number(KHANG_CHIEN_MAP.slice(-1))):createVillageZone()),
      this.characterBase === 'mage' ? { element: 'water', moveSpeed: MOVEMENT_PREVIEW.speed } : undefined);
    if(KHANG_CHIEN_STAGE)this.stageRun=createKhangChienRuntime(this.run);
    this.createWorldArtwork();
    if(KHANG_CHIEN_MAP && !this.labZone && !this.stageRun)drawKhangChienRefuge(this);
    if(this.stageRun){this.stageBarrier=drawKhangChienRefuge(this).setVisible(false);this.tweens.killTweensOf(this.stageBarrier);}
    createCharacterTextures(this, this.characterBase);
    if(this.run.character){
      createWaterCannonTextures(this);
      prepareDragonPreviewTextures(this);
      this.dragonPreview=undefined;
      this.waterChargeEffect=new MiniWaterChargeEffect(this);
      prepareWaterSupport(this);
      this.waterSupport=new WaterSupportEffects(this);
      prepareWaterSwamp(this);this.waterSwamp=new WaterSwampEffects(this);
      this.waterPrison=new WaterPrisonEffects(this);
      this.waterUltimateEffects=new WaterUltimateEffects(this);
      const formation=this.textures.get('eight-dragon-formation'),source=formation.getSourceImage() as HTMLImageElement;
      for(let i=0;i<4;i++)if(!formation.has(String(i)))formation.add(String(i),0,i*source.width/4,0,source.width/4,source.height);
      this.previewHits=0;this.aim={x:1,y:0};this.projectileImages.clear();
      // Lab enemies remain hit-preview targets, not invented combat actors with balance stats.
      this.previewTargets=this.run.zone.objects.filter(o=>o.kind==='enemy').map(o=>({id:o.id,position:{x:o.x,y:o.y},radius:PREVIEW.enemyMarkerRadius}));
      if(new URLSearchParams(location.search).has('sandbox') && !this.stageRun){
        const encounter=new URLSearchParams(location.search).get('encounter');
        const selected=MONSTER_ART.filter(art=>encounter?art.id===encounter:!ELITE_ENEMIES[art.id]);
        this.sandboxDummies=[...createSandboxDummies(this.run.player.position),
          ...createSandboxMonsters(this.run.player.position,selected)];
        this.previewTargets.push(...this.sandboxDummies);
        for(const dummy of this.sandboxDummies){
          registerRunCombatBody(this.run,dummy);
          if(dummy.monsterArtId){
            const sprite=this.add.sprite(dummy.position.x,dummy.position.y,`monster-${dummy.monsterArtId}-normal`)
              .setOrigin(.5,.85);
            setMonsterPose(sprite,dummy.monsterArtId,false,false);sprite.setDepth(dummy.position.y);
            this.monsterSprites.set(dummy.id,sprite);
            const art=MONSTER_ART.find(a=>a.id===dummy.monsterArtId)!;
            registerRunEnemyController(this.run,dummy.id,ELITE_ENEMIES[art.id]?.attack??{...MONSTER_AI_TUNING,kind:art.kind,visual:art.visual,
              attackRange:art.kind==='melee'?MONSTER_AI_TUNING.meleeRange:MONSTER_AI_TUNING.rangedRange});
          }else if(dummy.actor.team==='player'){
            const body=this.add.container(dummy.position.x,dummy.position.y).setDepth(dummy.position.y);
            const sprite=this.add.sprite(0,0,idleTextureKey('down',this.characterBase)).setOrigin(.5,.9);
            applyCharacterTextureScale(sprite);
            body.add([this.add.ellipse(0,0,28,10,0x182016,.3),sprite]);
            this.allySprites.set(dummy.id,sprite);
            this.sandboxCharacters.set(dummy.id,body);
          }else this.sandboxCircles.set(dummy.id,this.add.circle(dummy.position.x,dummy.position.y,dummy.radius,0xf4b357).setDepth(dummy.position.y));
          const ally=dummy.actor.team==='player';
          this.sandboxLabels.set(dummy.id,this.add.text(dummy.position.x,
            dummy.position.y-(ally?68:dummy.radius+10),'',
            {fontSize:'12px',color:'#ffffff',backgroundColor:'#172129',padding:{x:4,y:2}})
            .setOrigin(.5,1).setDepth(dummy.position.y+1));
        }
        this.enemyShotGraphics=this.add.graphics().setDepth(999);this.enemyZoneGraphics=this.add.graphics().setDepth(-50);
        const restore=()=>{
          for(const dummy of this.sandboxDummies)dummy.actor.resources.currentHp=dummy.actor.stats.maxHp;
          // Explicit DEV reset, including after death; ordinary healing still never revives.
          this.run.character!.resources.currentHp=this.run.character!.stats.maxHp;
          restoreResource(this.run.character!,'mp',this.run.character!.stats.maxMp);
          resetEnemyCombat(this.run.enemyCombat,this.run.combatBodies,this.run.time);
          this.updateMonsterPresentation();this.syncImageHitboxes();
        };
        const toggleAllies=()=>{
          const current=this.sandboxDummies.find(dummy=>dummy.actor.team==='player')?.targetable!==false;
          for(const dummy of this.sandboxDummies)if(dummy.actor.team==='player')dummy.targetable=!current;
          this.castFeedback=current?'Đồng đội rời sân':'Đồng đội vào sân';
        };
        const hitPlayer=()=>this.sandboxHit(this.run.character!.id);
        const hitAlly=()=>{const ally=this.sandboxDummies.find(dummy=>dummy.actor.team==='player' && validBody(dummy));if(ally)this.sandboxHit(ally.id);};
        const devAction=(action:SandboxDevAction)=>{
          if(action==='restore')restore();
          else if(action==='trial-human-15' || action==='trial-long-15'){
            this.cancelEPlacement();this.waterSkillInput?.clear();this.dragonPreview?.destroy();this.dragonPreview=undefined;
            for(const copy of this.copyDragons)copy.effect.destroy();this.copyDragons=[];
            this.waterUltimateEffects?.destroy();this.run.projectiles.length=0;this.run.waterCannonAttacks.clear();
            prepareWaterEvolutionTrial(this.run.character!,action==='trial-human-15'?'a1':'b1',this.run.combatBodies,this.run.time);
            restore();setEnemyCombatEnabled(this.run.enemyCombat,false);
            this.hud?.showFeedback('Đã chuẩn bị cấp 15 / 4 Mạch · đóng Dev → Q+E → click chọn tâm');
          }
          else if(action==='grant-exp' || action==='level-up'){
            const before=this.run.progression.level;
            const amount=action==='grant-exp'?RUN_BALANCE.debugExp:Math.max(0,experienceRequired(before)-this.run.progression.exp);
            awardRunExperience(this.run,amount);
            const gained=this.run.progression.level-before;
            this.castFeedback=gained?`Lên cấp ${this.run.progression.level} · +${gained*RUN_BALANCE.potentialPerLevel} tiềm năng`
              :before===RUN_BALANCE.maxLevel?'Đã đạt cấp tối đa 15':`+${amount} EXP`;
            this.hud?.showFeedback(this.castFeedback);
          }
          else if(action==='toggle-allies')toggleAllies();
          else if(action==='hit-player')hitPlayer();
          else if(action==='hit-ally')hitAlly();
          else if(action==='toggle-monster-ai'){
            setEnemyCombatEnabled(this.run.enemyCombat,!this.run.enemyCombat.enabled);
            this.castFeedback=this.run.enemyCombat.enabled?'AI quái đang chạy':'AI quái đã dừng';
            this.hud?.showFeedback(this.castFeedback);
          }
        };
        this.game.events.on('sandbox-dev-action',devAction);
        this.input.keyboard?.on('keydown-H',restore);
        this.input.keyboard?.on('keydown-T',toggleAllies);this.input.keyboard?.on('keydown-J',hitPlayer);this.input.keyboard?.on('keydown-K',hitAlly);
        this.events.once('shutdown',()=>{
          this.game.events.off('sandbox-dev-action',devAction);
          this.sandboxCharacters.clear();
          this.allySprites.clear();
          this.monsterSprites.clear();
          this.enemyShotGraphics=undefined;this.enemyZoneGraphics=undefined;
          this.input.keyboard?.off('keydown-H',restore);this.input.keyboard?.off('keydown-T',toggleAllies);this.input.keyboard?.off('keydown-J',hitPlayer);this.input.keyboard?.off('keydown-K',hitAlly);
          this.sandboxDummies=[];this.sandboxLabels.clear();this.sandboxCircles.clear();
        });
      }
      const down=(pointer:Phaser.Input.Pointer)=>{if(this.stageRun && !stageInteractive(this.stageRun))return;if(pointer.button===0){
        if(this.ePlacement){
          const point=this.cameras.main.getWorldPoint(pointer.x,pointer.y);
          const ultimate=this.ultimatePlacement;
          this.cancelEPlacement();
          this.showCastResult(ultimate?'Đại chiêu':'E',ultimate?castRunUltimate(this.run,this.currentView(),{x:point.x,y:point.y})
            :castRunE(this.run,this.currentView(),undefined,{x:point.x,y:point.y}));this.handleWaterEvents();return;
        }
        const point=this.cameras.main.getWorldPoint(pointer.x,pointer.y);
        const focused=this.sandboxDummies.filter(body=>validBody(body) && body.actor.team!==this.run.character!.team
          && bodyInView(body,this.currentView()) && bodyIntersectsCircle(body,point,0))
          .sort((a,b)=>Math.hypot(bodyCenter(a).x-point.x,bodyCenter(a).y-point.y)-Math.hypot(bodyCenter(b).x-point.x,bodyCenter(b).y-point.y) || a.id.localeCompare(b.id))[0];
        if(focused)this.enemyFocusId=focused.id;
        if(this.dragonPreview?.movementLocked || this.run.character!.waterSkills.ultimate)return;
        if(this.run.character!.basicAttack.phase==='idle')this.castStartRemaining=0.12;
        pressWaterCannon(this.run.character!.basicAttack);
      }};
      const up=(pointer:Phaser.Input.Pointer)=>{if(pointer.button===0)releaseWaterCannon(this.run.character!.basicAttack);};
      const clearHeld=()=>releaseWaterCannon(this.run.character!.basicAttack);
      const mouseUp=(event:MouseEvent)=>{if(event.button===0)clearHeld();};
      const blur=()=>{this.stageFocused=false;this.waterSkillInput?.clear();this.cancelEPlacement();stopWaterCannon(this.run.character!.basicAttack);};
      const focus=()=>{this.stageFocused=true;};
      this.input.on('pointerdown',down);this.input.on('pointerup',up);this.input.on('pointerupoutside',up);
      window.addEventListener('mouseup',mouseUp);window.addEventListener('blur',blur);window.addEventListener('focus',focus);
      const castQ=(event?:KeyboardEvent)=>{
        if(event?.repeat)return;
        if(this.stageRun?.phase==='sacrifice'){
          if(document.hidden || !this.stageFocused || this.uiBlocks.has('dev') || this.uiBlocks.has('character'))return;
          castKhangChienFinaleQ(this.stageRun,this.qStaffOrigin());return;
        }
        if(this.stageRun && !stageInteractive(this.stageRun))return;
        this.cancelEPlacement();
        const mage=this.run.character!;
        if(mage.resources.currentHp<=0)return;
        const pointer=this.input.activePointer,aim=this.cameras.main.getWorldPoint(pointer.x,pointer.y);
        const target={x:Phaser.Math.Clamp(aim.x,0,WORLD_WIDTH),y:Phaser.Math.Clamp(aim.y,0,WORLD_HEIGHT)};
        this.showCastResult('Q',castRunQ(this.run,target));this.handleWaterEvents();
      };
      const castE=(event?:KeyboardEvent)=>{
        if(event?.repeat)return;
        if(this.stageRun && !stageInteractive(this.stageRun))return;
        const mage=this.run.character!;
        if(waterGroundE(mage) && mage.mach===4){
          if(this.ePlacement){this.cancelEPlacement();return;}
          if(mage.resources.currentHp<=0 || mage.waterSkills.cooldowns.e>this.run.time || mage.resources.currentMp<WATER_MAGE_TUNING.e.mpCost){
            this.showCastResult('E',{ok:false,reason:mage.resources.currentHp<=0?'dead':mage.waterSkills.cooldowns.e>this.run.time?'cooldown':'mp'});return;
          }
          this.ePlacement=this.add.circle(0,0,waterGroundERadius(mage)??waterLongERadius(mage),0x2499dd,.18).setStrokeStyle(2,0x8df1ff,.9).setDepth(1000);
          stopWaterCannon(mage.basicAttack);this.hud?.showFeedback('E READY: click chọn tâm · Esc hoặc E để hủy');return;
        }
        const pointer=this.input.activePointer,point=this.cameras.main.getWorldPoint(pointer.x,pointer.y),view=this.currentView();
        const target=this.run.combatBodies.filter(body=>validBody(body) && body.actor.team===this.run.character!.team && bodyInView(body,view)
          && bodyIntersectsCircle(body,point,0))
          .sort((a,b)=>Math.hypot(bodyCenter(a).x-point.x,bodyCenter(a).y-point.y)-Math.hypot(bodyCenter(b).x-point.x,bodyCenter(b).y-point.y))[0];
        this.showCastResult('E',castRunE(this.run,view,target?.id));this.handleWaterEvents();
      };
      const castR=()=>{if(this.stageRun && !stageInteractive(this.stageRun))return;this.waterSkillInput?.clear();this.cancelEPlacement();this.showCastResult('R',castRunR(this.run));this.handleWaterEvents();};
      this.waterSkillInput=new WaterSkillInput(key=>key==='q'?castQ():castE(),()=>{
        this.cancelEPlacement();this.ultimatePlacement=true;
        const kind=waterUltimateKind(this.run.character!);
        this.ePlacement=this.add.circle(0,0,kind==='descent'?EV.descent.radius:EV.eight.radius,0x66cfff,.18).setStrokeStyle(2,0xf6e9a0,.9).setDepth(1000);
        stopWaterCannon(this.run.character!.basicAttack);this.hud?.showFeedback('Đại chiêu: click chọn tâm · Esc để hủy');
      },EV.ultimate.comboWindow);
      const inputSkill=(key:'q'|'e',event:KeyboardEvent)=>{
        if(event.repeat || document.hidden || !this.stageFocused || this.uiBlocks.has('dev') || this.uiBlocks.has('character'))return;
        if(this.stageRun){key==='q'?castQ(event):castE(event);return;}
        this.waterSkillInput?.press(key,this.run.time,waterUltimateStatus({mage:this.run.character!,position:this.run.player.position,
          bodies:this.run.combatBodies,view:this.currentView(),now:this.run.time,random:Math.random}).ok && !this.ePlacement);
      };
      const inputQ=(event:KeyboardEvent)=>inputSkill('q',event),inputE=(event:KeyboardEvent)=>inputSkill('e',event);
      const cancelE=()=>{this.waterSkillInput?.clear();this.cancelEPlacement();};this.input.keyboard?.on('keydown-ESC',cancelE);
      this.input.keyboard?.on('keydown-Q',inputQ);
      const ritualKeys=new Set<string>();
      const ritualDown=(event:KeyboardEvent)=>{
        if(event.repeat || document.hidden || !this.stageFocused || this.uiBlocks.has('dev') || this.uiBlocks.has('character'))return;
        ritualKeys.add(event.code);
        if(this.stageRun?.phase==='bomb' && (event.code==='KeyQ' || event.code==='KeyE')){
          const accepted=ritualKeys.has('KeyQ') && ritualKeys.has('KeyE')
            ?beginKhangChienSacrifice(this.stageRun):inputKhangChienRitual(this.stageRun,event.code==='KeyQ'?'q':'e');
          if(accepted){ritualKeys.clear();this.game.canvas.focus();}
        }
      };
      const ritualUp=(event:KeyboardEvent)=>ritualKeys.delete(event.code);
      const ritualBlur=()=>{ritualKeys.clear();if(this.stageRun)this.stageRun.ritualLastKey=undefined;};
      this.input.keyboard?.on('keydown',ritualDown);this.input.keyboard?.on('keyup',ritualUp);window.addEventListener('blur',ritualBlur);
      this.events.once('shutdown',()=>{this.input.keyboard?.off('keydown',ritualDown);this.input.keyboard?.off('keyup',ritualUp);window.removeEventListener('blur',ritualBlur);});
      this.input.keyboard?.on('keydown-E',inputE);this.input.keyboard?.on('keydown-R',castR);
      this.events.once('shutdown',()=>{this.waterSkillInput?.clear();this.waterSkillInput=undefined;this.waterUltimateEffects?.destroy();this.waterUltimateEffects=undefined;this.input.keyboard?.off('keydown-Q',inputQ);this.input.keyboard?.off('keydown-E',inputE);this.input.keyboard?.off('keydown-R',castR);this.dragonPreview?.destroy();this.dragonPreview=undefined;this.input.off('pointerdown',down);this.input.off('pointerup',up);this.input.off('pointerupoutside',up);
        this.input.keyboard?.off('keydown-ESC',cancelE);this.cancelEPlacement();this.waterSwamp?.destroy();this.waterSwamp=undefined;
        this.waterPrison?.destroy();this.waterPrison=undefined;
        for(const copy of this.copyDragons)copy.effect.destroy();this.copyDragons=[];this.waterSupport?.destroy();this.waterSupport=undefined;
        window.removeEventListener('mouseup',mouseUp);window.removeEventListener('blur',blur);window.removeEventListener('focus',focus);this.waterChargeEffect?.destroy();this.waterChargeEffect=undefined;this.projectileImages.clear();});
    }
    for (const facing of FACINGS) {
      const key = runAnimationKey(facing, this.characterBase);
      if (this.anims.exists(key)) this.anims.remove(key);
      this.anims.create({ key,
        frames: Array.from({ length: 4 }, (_, frame) => ({ key: `${key}-${frame}` })),
        frameRate: 8, repeat: -1 });
    }

    // Presentation follows the world position owned by the active Run.
    this.player = this.add.container(this.run.player.position.x, this.run.player.position.y);
    this.facing = 'down';
    const shadow = this.add.ellipse(0, 0, 28, 10, 0x182016, 0.3);
    this.character = this.add.sprite(0, 0, idleTextureKey('down', this.characterBase)).setOrigin(0.5, 0.9);
    applyCharacterTextureScale(this.character);
    this.player.add([shadow, this.character]);
    if(this.stageRun){
      this.stageMusic=new KhangChienMusic();
      this.stageRun.phase='ready';
      this.enemyShotGraphics=this.add.graphics().setDepth(999);this.enemyZoneGraphics=this.add.graphics().setDepth(-50);
      this.stageEffects=new KhangChienEffects(this);
      // Opening beat: a wide arc of E block splashes, raised as a temporary water shield.
      {const place=openingShieldPlacement(),base=Math.atan2(place.facing.y,place.facing.x),count=7;
        const band=this.add.graphics().setDepth(place.center.y+2).setVisible(false);
        const waves=Array.from({length:count},(_,k)=>{
          const angle=base+place.halfAngle*(2*k/(count-1)-1),x=place.center.x+Math.cos(angle)*place.radius,y=place.center.y+Math.sin(angle)*place.radius;
          const image=this.add.image(x,y,'water-guard-hit','artwork').setVisible(false).setRotation(angle).setDepth(y+4);
          const source=image.texture.getSourceImage() as HTMLImageElement;
          image.setDisplayOrigin(source.width*.62-image.frame.cutX,source.height*.5-image.frame.cutY);
          // Each splash spans ~1.6x the gap between neighbours, so the arc reads as one wall.
          return {image,angle,scale:2*place.halfAngle*place.radius/(count-1)*1.6/image.frame.height};
        });
        this.openingShield={band,waves};this.openingShieldImpact=false;this.openingShieldBroken=false;}
      if(navigator.maxTouchPoints>0 || matchMedia('(any-pointer:coarse)').matches)this.touchControls=new TouchControls(this.game.canvas.parentElement!,(key,aim)=>this.touchAction(key,aim));
      this.stageHud=new KhangChienHud(this.game.canvas.parentElement!,async()=>{
        if(this.stageMusicStarting || !this.stageRun || !['ready','briefing'].includes(this.stageRun.phase))return;
        this.stageMusicStarting=true;
        try{
          if(this.touchControls)void enterTouchLandscape(this.game.canvas.parentElement!);
          await this.stageMusic!.start();
          if(this.stageRun){this.stageRun.phase='arrival';this.stageRun.phaseAt=0;this.syncStage();this.game.canvas.focus();}
        }catch{this.hud?.showFeedback('Chưa phát được nhạc. Bấm Ra trận để thử lại.');}
        finally{this.stageMusicStarting=false;}
      },()=>{if(this.touchControls)void enterTouchLandscape(this.game.canvas.parentElement!);this.scene.restart({replayAtBarrier:true});});
      if(this.replayAtBarrier){
        syncKhangChienOpening(this.stageRun,24);
        void this.stageMusic.start(24).catch(()=>this.hud?.showFeedback('Chưa phát được nhạc.'));
        this.game.canvas.focus();
      }
      const stageAction=(action:SandboxDevAction)=>{
        if(import.meta.env.VITE_STAGE_ONLY==='1')return;
        if(action==='stage-skip-intro' || action==='stage-clear-wave' || action==='stage-boss-finale' || action==='stage-test-ultimate' || action==='stage-enter-refuge' || action==='stage-exit-refuge')khangChienDev(this.stageRun!,action);
        else if(action==='restore' && stageInteractive(this.stageRun!)){
          this.run.character!.resources.currentHp=this.run.character!.stats.maxHp;
          restoreResource(this.run.character!,'mp',this.run.character!.stats.maxMp);
        }else if(action==='toggle-monster-ai')setEnemyCombatEnabled(this.run.enemyCombat,!this.run.enemyCombat.enabled);
        this.syncStage();
      };
      this.game.events.on('sandbox-dev-action',stageAction);this.syncStage();
      this.events.once('shutdown',()=>{
        this.touchControls?.destroy();this.touchControls=undefined;this.touchAim=undefined;
        this.stageMusic?.destroy();this.stageMusic=undefined;this.stageMusicStarting=false;
        this.game.events.off('sandbox-dev-action',stageAction);this.stageHud?.destroy();this.stageHud=undefined;
        this.stageEffects?.destroy();this.stageEffects=undefined;this.stageRun=undefined;this.stageLastPhase='';
        this.game.canvas.parentElement?.classList.remove('khang-stage-finished','khang-stage-playing');
        this.stageBarrier=undefined;this.openingShield=undefined;this.rootLabel=undefined;this.rootTotal=0;this.stageMap=undefined;this.stageMapBlend=undefined;this.sandboxDummies=[];this.sandboxLabels.clear();this.monsterSprites.clear();
      });
    }
    this.syncImageHitboxes();
    this.player.setDepth(this.player.y);
    this.game.canvas.dataset.characterAssets = this.characterBase;
    {
      this.devKeys = this.input.keyboard?.addKeys('W,A,S,D,UP,LEFT,DOWN,RIGHT,F3') as
        Record<string, Phaser.Input.Keyboard.Key> | undefined;
      this.debugGraphics = this.add.graphics().setDepth(1000);
      this.debugText = this.add.text(12, 12, '', {
        fontSize: '14px', color: '#ffffff', backgroundColor: '#243524', padding: { x: 8, y: 6 },
      }).setScrollFactor(0).setDepth(1001);
      this.debugEnabled = import.meta.env.VITE_STAGE_ONLY!=='1' && new URLSearchParams(window.location.search).get('debug') === '1';
      if (this.labZone) this.drawLabObjects(this.labZone);
    }

    const camera = this.cameras.main;
    camera.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    const resizeCamera = () => {
      const { width, height } = this.scale.gameSize;
      if (width <= 0 || height <= 0) return;
      // Height sets the viewing scale. Extreme ultrawide must still stay inside world bounds.
      const referenceHeight = this.registry.get('portraitCapture')
        ? CAPTURE_CAMERA_REFERENCE_HEIGHT : CAMERA_REFERENCE_HEIGHT;
      camera.setZoom(Math.max(height / referenceHeight, width / WORLD_WIDTH));
      camera.centerOn(this.player.x, this.player.y);
    };
    resizeCamera();
    if(this.run.character && !this.registry.get('portraitCapture')){
      this.hud=new CombatHud(this.game.canvas.parentElement!,{
        portrait: this.textures.getBase64('mage-portrait'),
        getMage:()=>this.run.character!,getTime:()=>this.run.time,
        getUltimateStatus:()=>waterUltimateStatus({mage:this.run.character!,position:this.run.player.position,bodies:this.run.combatBodies,view:this.currentView(),now:this.run.time,random:Math.random}),
        getFinaleQ:()=>this.stageRun?.phase==='sacrifice'?{count:this.stageRun.finaleShots.length,max:KHANG_CHIEN_BALANCE.finale.maxQ,
          remaining:finaleQRemaining(this.stageRun),forming:stageAge(this.stageRun)<KHANG_CHIEN_BALANCE.finale.chargeSeconds,
          paused:!this.stageFocused || document.hidden || this.uiBlocks.has('dev') || this.uiBlocks.has('character')}:undefined,
        onInputBlock:blocked=>this.setUiBlock('character',blocked),
        onAllocate:(key,amount)=>allocateRunPotential(this.run,key,amount),
        onEvolution:(level,id)=>chooseRunEvolution(this.run,level,id),
      });
      this.enemyFocusRing=this.add.ellipse(0,0,40,12).setVisible(false);
    }
    const devOpen=(open:boolean)=>this.setUiBlock('dev',open);
    this.game.events.on('dev-menu-open',devOpen);
    if(this.stageRun && document.querySelector<HTMLDetailsElement>('.dev-menu')?.open)this.setUiBlock('dev',true);
    // Subpixel rendering avoids snapping the smooth follow to integer pixels.
    camera.startFollow(this.player, false, 0.12, 0.12);
    this.scale.on('resize', resizeCamera);
    this.events.once('shutdown', () => {
      if (this.run.status === 'active') finishRun(this.run);
      this.scale.off('resize', resizeCamera);
      camera.stopFollow();
      this.devKeys = undefined;
      this.debugGraphics = undefined;
      this.debugText = undefined;
      this.debugEnabled = false;
      this.hud?.destroy();this.hud=undefined;this.uiBlocks.clear();
      this.enemyFocusRing?.destroy();this.enemyFocusRing=undefined;
      this.enemyFocusId=undefined;this.lastEnemyHitId=undefined;
      this.game.events.off('dev-menu-open',devOpen);
      this.monsterPortraits.clear();
      this.ueImpacts=[];this.rootLabel?.destroy();this.rootLabel=undefined;this.rootTotal=0;
    });
  }

  update(_time: number, delta: number) {
    if(this.assetLoadGuard?.failed || !this.run)return;
    this.syncImageHitboxes();
    this.castStartRemaining=Math.max(0,this.castStartRemaining-delta/1000);
    this.firingVisualRemaining=Math.max(0,this.firingVisualRemaining-delta/1000);
    // Equivalent smoothing at different frame rates, matching the prototype's rate.
    const dt = this.stageFocused && !document.hidden && !this.uiBlocks.has('dev') && !this.uiBlocks.has('character')?Math.min(delta / 1000, 0.05):0;
    if(this.stageRun){
      const canAdvance=this.stageFocused && !this.uiBlocks.has('dev') && !this.uiBlocks.has('character');
      this.stageMusic?.sync(!canAdvance || document.hidden || ['ready','briefing','purification','complete','failed'].includes(this.stageRun.phase),this.stageRun.mapIndex);
      if(canAdvance && !document.hidden){
        if(this.stageRun.mapIndex===1 && ['arrival','barrier'].includes(this.stageRun.phase))syncKhangChienOpening(this.stageRun,this.stageMusic?.playbackTime??0);
        else if(this.stageRun.phase!=='ready'){if(stageInteractive(this.stageRun))tickRun(this.run,dt);tickKhangChien(this.stageRun,dt*khangChienTimeScale(this.stageRun));}
      }
      this.handleEnemyEvents();
      this.syncStage();
      if(!stageInteractive(this.stageRun)){
        this.updateStageCinematic(dt);return;
      }
    }else if(this.stageFocused && !document.hidden && this.uiBlocks.size===0){tickRun(this.run,dt);this.waterSkillInput?.flush(this.run.time);}
    this.updateMonsterPresentation();this.syncImageHitboxes();this.handleEnemyEvents();
    this.handleWaterEvents();
    this.cameras.main.setLerp(1 - Math.exp(-CAMERA_FOLLOW_RATE * dt));

    if (this.devKeys) {
      const keys = this.devKeys;
      const direction = new Phaser.Math.Vector2(
        Number(keys.D.isDown || keys.RIGHT.isDown) - Number(keys.A.isDown || keys.LEFT.isDown),
        Number(keys.S.isDown || keys.DOWN.isDown) - Number(keys.W.isDown || keys.UP.isDown),
      ).normalize();
      if(this.touchControls && Math.hypot(this.touchControls.move.x,this.touchControls.move.y)>0)
        direction.set(this.touchControls.move.x,this.touchControls.move.y);
      if(this.uiBlocks.size)direction.set(0,0);
      const oldX = this.player.x, oldY = this.player.y;
      if(this.run.character && this.run.character.resources.currentHp<=0)this.dragonPreview?.destroy();
      if(this.run.character?.resources.currentHp===0){for(const copy of this.copyDragons)copy.effect.destroy();this.copyDragons=[];}
      for(const copy of this.copyDragons){copy.effect.update(Math.max(0,this.run.time-copy.updatedAt),copy.origin);copy.updatedAt=this.run.time;}
      this.copyDragons=this.copyDragons.filter(copy=>!copy.effect.done);
      this.game.canvas.dataset.qCopyPreview=this.copyDragons.map(copy=>copy.effect.phase).join(',') || 'idle';
      if(this.dragonPreview && !this.dragonPreview.done){
        this.dragonPreview.update(Math.max(0,this.run.time-this.dragonUpdatedAt),this.qStaffOrigin());this.dragonUpdatedAt=this.run.time;
        this.game.canvas.dataset.qPreview=this.dragonPreview.phase;
      }else if(this.dragonPreview)this.game.canvas.dataset.qPreview='idle';
      const qLocked=this.dragonPreview?.movementLocked??false;
      this.game.canvas.dataset.qMovementLocked=String(qLocked);
      if(!qLocked)moveRunPlayer(this.run, { x: direction.x, y: direction.y }, this.stageRun && this.uiBlocks.size?0:dt, MOVEMENT_PREVIEW);
      if(this.stageRun){
        const slow=playerSlowMultiplier(this.run),phasing=playerPhasing(this.run);
        // R phase: a pale, flickering water ghost that enemies look straight through.
        this.character.setTint(phasing?0x9fe8ff:slow<=0?0xd6a8ff:slow<1?0xc6f59a:0xffffff)
          .setAlpha(phasing?(window.matchMedia('(prefers-reduced-motion: reduce)').matches?.55:.45+.2*Math.sin(this.run.time*30)):1);
      }
      this.player.setPosition(this.run.player.position.x, this.run.player.position.y);
      this.updateWaterAttack(this.stageRun && this.uiBlocks.size?0:dt);
      if (direction.lengthSq() > 0) {
        this.facing = direction.x !== 0 ? (direction.x < 0 ? 'left' : 'right')
          : direction.y < 0 ? 'up' : 'down';
      }
      const moving = Math.hypot(this.player.x - oldX, this.player.y - oldY) > 0.001;
      if (moving) this.character.play(runAnimationKey(this.facing, this.characterBase), true);
      else {
        this.character.stop();
        this.character.setTexture(idleTextureKey(this.facing, this.characterBase));
      }
      if(this.run.character){
        const charging=this.run.character.basicAttack.phase==='charging' || this.run.character.basicAttack.phase==='full_charge';
        if(this.dragonPreview?.openingPoseActive){this.character.stop();this.character.setTexture('water-cast-start').setOrigin(0.5,104/112).setFlipX(this.qFacingLeft);}
        else if(qLocked || this.dragonPreview?.commandActive){this.character.stop();this.character.setTexture(this.dragonPreview!.commandActive?'water-q-command':'water-q-ready').setOrigin(0.5,104/112).setFlipX(this.qFacingLeft);}
        else if(this.firingVisualRemaining>0){this.character.stop();this.character.setTexture('water-charge');this.character.setOrigin(0.5,0.9).setFlipX(this.aim.x<0);}
        else if(charging || this.castStartRemaining>0){this.character.stop();this.character.setTexture(this.castStartRemaining>0?'water-cast-start':this.run.character.basicAttack.phase==='full_charge'?'water-full':'water-charge');this.character.setOrigin(0.5,this.castStartRemaining>0?104/112:0.9);this.character.setFlipX(this.aim.x<0);}
        else this.character.setOrigin(0.5,0.9).setFlipX(false);
      }
      this.player.setDepth(this.player.y);
      this.game.canvas.dataset.characterPose = moving ? 'run' : 'idle';
      this.game.canvas.dataset.characterFacing = this.facing;
      this.game.canvas.dataset.characterFrame = this.character.texture.key;
      this.game.canvas.dataset.playerX=this.player.x.toFixed(2);
      this.game.canvas.dataset.playerY=this.player.y.toFixed(2);
      if (moving) this.game.canvas.dataset.lastRunningFrame = this.character.texture.key;
      if (import.meta.env.VITE_STAGE_ONLY!=='1' && Phaser.Input.Keyboard.JustDown(keys.F3)) this.debugEnabled = !this.debugEnabled;
    }
    this.updateSandbox();
    this.syncImageHitboxes();
    this.drawDebug();
    this.drawEnemyShots();
    this.drawWaterEffects();
    this.updateEnemyFocus();
    this.hud?.update(this.castFeedback);
    this.tintStageWater();
  }

  private tintStageWater(){
    if(!this.stageRun)return;
    const tint=khangChienWaterTint(this.stageRun);
    this.stageWaterColors.apply(this.children.list,tint);
    this.game.canvas.dataset.stageWaterTint=tint.toString(16).padStart(6,'0');
  }

  private syncStage(){
    const stage=this.stageRun;if(!stage)return;
    const live=new Set(stage.enemies.map(e=>e.id));
    for(const [id,sprite] of this.monsterSprites)if(!live.has(id)){
      sprite.destroy();this.monsterSprites.delete(id);this.sandboxLabels.get(id)?.destroy();this.sandboxLabels.delete(id);
    }
    this.sandboxDummies=stage.enemies;this.previewTargets=stage.enemies;
    for(const body of stage.enemies)if(!this.monsterSprites.has(body.id)){
      const sprite=this.add.sprite(body.position.x,body.position.y,ueMonsterKey(body.monsterArtId),ueIdleFrame(body.monsterArtId));
      setUeMonsterPose(sprite,body.monsterArtId,'idle',false,undefined,stage.mapIndex);this.monsterSprites.set(body.id,sprite);
      if(import.meta.env.VITE_STAGE_ONLY!=='1' && new URLSearchParams(location.search).get('debug')==='1')this.sandboxLabels.set(body.id,this.add.text(body.position.x,body.position.y-45,'',{fontSize:'11px',color:'#ffffff',backgroundColor:'#172129',padding:{x:3,y:1}}).setOrigin(.5,1));
    }
    this.stageBarrier?.setVisible(stage.barrierActive);
    this.stageBarrier?.setAlpha(stage.phase==='barrier'?Math.min(1,(stage.clock-stage.phaseAt)/4)*.9:.9*(1-purificationProgress(stage)));
    this.stageBarrier?.setTint(stage.barrier.body.actor.resources.currentHp/stage.barrier.body.actor.stats.maxHp<=KHANG_CHIEN_BALANCE.barrier.warningRatio?0xff9b88:0xffffff);
    this.game.canvas.parentElement?.classList.toggle('khang-stage-finished',stage.phase==='complete');
    this.game.canvas.parentElement?.classList.toggle('khang-stage-playing',!['ready','briefing','complete','failed'].includes(stage.phase));
    if(stage.phase!==this.stageLastPhase){
      this.stageLastPhase=stage.phase;
      if(!stageInteractive(stage)){
        this.ueImpacts=[];
        this.cancelEPlacement();this.dragonPreview?.destroy();this.dragonPreview=undefined;
        for(const copy of this.copyDragons)copy.effect.destroy();this.copyDragons=[];
        for(const image of this.projectileImages.values())image.destroy();this.projectileImages.clear();
        this.waterChargeEffect?.hide();
      }
      this.setUiBlock('stage',!stageInteractive(stage));
      this.hud?.update('',true);this.updateEnemyFocus(true);
      if(stage.phase==='sacrifice'){
        this.cameras.main.stopFollow();
        this.cameras.main.pan((stage.finaleTarget!.x+this.run.player.position.x)/2,(stage.finaleTarget!.y+this.run.player.position.y)/2,700,Phaser.Math.Easing.Sine.InOut);
      }else if(stage.phase==='purification'){
        const camera=this.cameras.main;
        this.castFeedback='';this.hud?.showFeedback('');camera.stopFollow();camera.shakeEffect.reset();
        this.purificationCamera={x:camera.midPoint.x,y:camera.midPoint.y,zoom:camera.zoom};
      }else if(stage.phase==='complete'){
        this.castFeedback='';this.hud?.showFeedback('');
        const camera=this.cameras.main;
        camera.stopFollow();camera.setZoom(Math.max(camera.width/WORLD_WIDTH,camera.height/WORLD_HEIGHT));
        camera.centerOn(WORLD_WIDTH/2,WORLD_HEIGHT/2);
      }else if(stage.phase==='failed')this.cameras.main.startFollow(this.player,false,.12,.12);
      else if(['barrier','combat','boss'].includes(stage.phase)){
        this.cameras.main.shakeEffect.reset();this.cameras.main.startFollow(this.player,false,.12,.12);
      }
    }
    for(const event of stage.events.splice(0)){
      if(event.kind==='map'){
        this.stageMap?.setTexture(`khang-stage-map-${event.index}`).setDisplaySize(WORLD_WIDTH,WORLD_HEIGHT);
        this.stageMapBlend?.destroy();this.stageMapBlend=undefined;
        this.enemyFocusId=stage.bossId;this.lastEnemyHitId=undefined;
        this.character.setRotation(0);
      }else if(event.kind==='summon'){
        // Elites claw out of the ground: dark burst, dust ring and a shake.
        for(const p of event.positions){
          const hole=this.add.ellipse(p.x,p.y,24,10,0x2a1406,.85).setDepth(p.y-1);
          const ring=this.add.ellipse(p.x,p.y,30,12,0xd8742a,.55).setStrokeStyle(3,0xffc277,.9).setDepth(p.y+2);
          this.tweens.add({targets:hole,scale:2.4,alpha:0,duration:700,ease:'Quad.Out',onComplete:()=>hole.destroy()});
          this.tweens.add({targets:ring,scale:3,alpha:0,duration:450,ease:'Cubic.Out',onComplete:()=>ring.destroy()});
        }
        if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)this.cameras.main.shake(220,.004);
      }else if(event.kind==='finale-q-impact'){
        this.hud?.update('',true);this.updateEnemyFocus(true);
      }else{
        this.stageEffects?.burst(event.position,event.kind==='eight-impact',this.stageRun?.finaleEightTargets);
        this.hud?.update('',true);this.updateEnemyFocus(true);
        this.hud?.showFeedback(`${event.kind==='first-impact'?'Thủy Long Giáng Thế':'Bát Đại Hải Long'} · ${Math.round(event.damage).toLocaleString('vi-VN')} sát thương`);
      }
    }
    if(stage.phase==='transition'){
      const b=KHANG_CHIEN_BALANCE.renewal;
      const progress=Phaser.Math.Clamp((stageAge(stage)-b.returnSeconds-b.prayerSeconds)/b.drawSeconds,0,1);
      if(progress>0){
        this.stageMapBlend??=this.add.image(0,0,`khang-stage-map-${stage.mapIndex+1}`)
          .setOrigin(0,0).setDisplaySize(WORLD_WIDTH,WORLD_HEIGHT).setDepth(-99);
        this.stageMapBlend.setAlpha(progress);
      }
    }else if(stage.phase==='purification' || stage.phase==='complete'){
      const progress=purificationProgress(stage),start=this.purificationCamera,camera=this.cameras.main;
      if(start && stage.phase==='purification'){
        const t=Math.min(1,stageAge(stage)/(KHANG_CHIEN_BALANCE.purification.riseSeconds+KHANG_CHIEN_BALANCE.purification.waveSeconds)),ease=t*t*(3-2*t);
        camera.setZoom(start.zoom+(Math.max(camera.width/WORLD_WIDTH,camera.height/WORLD_HEIGHT)-start.zoom)*ease);
        camera.centerOn(start.x+(WORLD_WIDTH/2-start.x)*ease,start.y+(WORLD_HEIGHT/2-start.y)*ease);
      }
      if(progress>=1){
        this.stageMap?.setTexture('khang-stage-cleansed').setDisplaySize(WORLD_WIDTH,WORLD_HEIGHT);
        this.stageMapBlend?.destroy();this.stageMapBlend=undefined;
      }else if(progress>0){
        this.stageMapBlend??=this.add.image(0,0,'khang-stage-cleansed').setOrigin(0,0).setDisplaySize(WORLD_WIDTH,WORLD_HEIGHT).setDepth(-99);
        this.stageMapBlend.setAlpha(progress);
      }
    }else if(this.stageMapBlend){this.stageMapBlend.destroy();this.stageMapBlend=undefined;}
    const paused=!this.stageFocused || document.hidden || this.uiBlocks.has('dev') || this.uiBlocks.has('character');
    this.stageEffects?.update(stage,paused);
    this.stageHud?.update(stage,paused);
    this.touchControls?.update(stage.phase,paused,this.run.character,this.run.time);
    Object.assign(this.game.canvas.dataset,{stagePhase:stage.phase,stageMap:String(stage.mapIndex),stageKills:String(stage.kills),stageSpawned:String(stage.spawned),stageAlive:String(stage.enemies.length),
      barrierHp:String(stage.barrier.body.actor.resources.currentHp),barrierMaxHp:String(stage.barrier.body.actor.stats.maxHp),stageFailure:stage.failureReason??'',
      stageRenewal:renewalStep(stage)??'',
      stagePurification:String(purificationProgress(stage)),
      stageFinaleQ:String(stage.finaleShots.length),stageFinaleLanded:String(stage.finaleShots.filter(shot=>shot.landed).length),
      barrierAttackers:String(this.run.enemyCombat.controllers.filter(c=>c.targetId===stage.barrier.body.id).length)});
  }
  private updateStageCinematic(dt:number){
    const stage=this.stageRun!,old={x:this.player.x,y:this.player.y};
    this.player.setPosition(this.run.player.position.x,this.run.player.position.y).setDepth(this.run.player.position.y);
    if(stage.phase==='arrival'){
      const camera=this.cameras.main,age=stage.clock;
      camera.stopFollow();
      const pan=age<6?0:age<8?(age-6)/2:age<9?1:age<10?10-age:0;
      const landing={x:430,y:1090};
      camera.centerOn(this.player.x+(landing.x-this.player.x)*pan,this.player.y+(landing.y-this.player.y)*pan);
      const paused=!this.stageFocused || document.hidden || this.uiBlocks.has('dev') || this.uiBlocks.has('character');
      if(paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches)camera.shakeEffect.reset();
      else if(age%3<.2 && !camera.shakeEffect.isRunning)camera.shake(220,.0008);
    }
    const renewal=renewalStep(stage);
    if(stage.phase==='arrival' || stage.phase==='sortie' || renewal==='return' || renewal==='sortie'){
      const dx=this.player.x-old.x,dy=this.player.y-old.y;this.facing=Math.abs(dx)>Math.abs(dy)?dx<0?'left':'right':dy<0?'up':'down';
      if(Math.hypot(dx,dy)>.001)this.character.play(runAnimationKey(this.facing,this.characterBase),true).setRotation(0);
      else {this.character.stop();this.character.setTexture(idleTextureKey(this.facing,this.characterBase));}
      this.character.anims.timeScale=stage.phase==='arrival' || renewal==='return'?2:1.5;
    }else{
      this.character.stop();this.character.anims.timeScale=1;
      if(['purification','complete'].includes(stage.phase) || stage.phase==='failed' && this.run.character!.resources.currentHp<=0)this.character.setTexture(idleTextureKey(['purification','complete'].includes(stage.phase)?this.facing:'down',this.characterBase)).setOrigin(.5,.9).setFlipX(false).setRotation(Math.PI/2).setAlpha(1);
      else this.character.setTexture(stage.phase==='barrier' || stage.phase==='sacrifice' || renewal==='prayer' || renewal==='draw'?'water-q-command':idleTextureKey('down',this.characterBase)).setRotation(0).setAlpha(1);
      if(stage.phase==='sacrifice' && stageAge(stage)>=finaleTiming(stage).celebrateAt){
        const dx=KHANG_CHIEN_REFUGE.villagers.x-this.player.x,dy=KHANG_CHIEN_REFUGE.villagers.y-this.player.y;
        this.facing=Math.abs(dx)>Math.abs(dy)?dx<0?'left':'right':dy<0?'up':'down';
        this.character.setTexture(idleTextureKey(this.facing,this.characterBase)).setOrigin(.5,.9).setFlipX(false);
      }
      // The claw strikes: hold the hurt pose (the art's claw comes in from the right).
      if(stage.phase==='sacrifice' && stageAge(stage)>=finaleTiming(stage).clawHitAt)
        this.character.setTexture('mage-claw-hit').setOrigin(.5,.95).setFlipX((stage.finaleTarget?.x??this.player.x)<this.player.x-20);
    }
    this.updateOpeningShield(stage);
    // Textures may have just switched (run/idle/cast); rescale now so no frame renders at the old texture's scale.
    applyCharacterTextureScale(this.character);
    this.cameras.main.setLerp(1-Math.exp(-CAMERA_FOLLOW_RATE*dt));
    this.updateSandbox();this.updateEnemyFocus();this.hud?.update('');this.drawEnemyShots();this.drawWaterEffects();this.drawDebug();
    this.tintStageWater();
  }

  private updateOpeningShield(stage:KhangChienRuntime){
    const shield=this.openingShield;if(!shield)return;
    const t=stage.clock,s=OPENING_SHIELD,end=s.until+s.fadeSeconds,reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const active=(stage.phase==='arrival' || stage.phase==='barrier') && t>=s.at && t<end;
    shield.band.setVisible(active);for(const wave of shield.waves)wave.image.setVisible(active);
    if(t<s.at){this.openingShieldImpact=false;this.openingShieldBroken=false;}
    if(!active)return;
    // Shoved back by the pack: the whole arc slides toward the refuge.
    const place=openingShieldPlacement(t),base=Math.atan2(place.facing.y,place.facing.x),mid=(shield.waves.length-1)/2;
    for(const wave of shield.waves){
      const x=place.center.x+Math.cos(wave.angle)*place.radius,y=place.center.y+Math.sin(wave.angle)*place.radius;
      wave.image.setPosition(x,y).setDepth(y+4);
    }
    shield.band.setDepth(place.center.y+2);
    // Straining just before it gives way, then it bursts.
    const strain=t>=s.until-.6 && t<s.until?(reduced?.85:.55+.45*Math.abs(Math.sin(t*28))):1;
    const fade=t>=s.until?Math.min(1,(t-s.until)/s.fadeSeconds):0;
    if(!this.openingShieldBroken && t>=s.until){
      this.openingShieldBroken=true;
      if(!reduced)this.cameras.main.shake(200,.004);
      for(let i=0;i<7;i++){
        const a=base+place.halfAngle*(i/3-1),x=place.center.x+Math.cos(a)*place.radius,y=place.center.y+Math.sin(a)*place.radius;
        const splash=this.add.image(x,y-20,'water-impact').setDepth(y+6).setRotation(a).setAlpha(0);
        const size=60/splash.width;splash.setScale(size);
        this.tweens.add({targets:splash,alpha:{from:.95,to:0},scale:size*1.7,duration:500,delay:i*25,onComplete:()=>splash.destroy()});
      }
    }
    // Unfolds from the middle outward, then holds with a gentle ripple.
    const unfold=Math.min(1,(t-s.at)/.35),span=place.halfAngle*(1-(1-unfold)*(1-unfold));
    shield.band.clear();
    const arc=(radius:number,width:number,color:number,alpha:number)=>{
      shield.band.lineStyle(width,color,alpha*(1-fade)).beginPath();
      shield.band.arc(place.center.x,place.center.y,radius,base-span,base+span,false);shield.band.strokePath();
    };
    arc(place.radius,26,0x2a7fd8,.35*strain);arc(place.radius,14,0x7fd6ff,.55*strain);arc(place.radius+5,3,0xe8fbff,.8*strain);
    shield.waves.forEach((wave,k)=>{
      const delay=Math.abs(k-mid)*.05,grow=Math.max(0,Math.min(1,(t-s.at-delay)/.22)),ease=1-(1-grow)*(1-grow);
      const pulse=reduced?0:.04*Math.sin(t*12+k);
      wave.image.setScale(wave.scale*(.4+.6*ease)*(1+pulse+.12*fade)).setAlpha(grow*(1-fade)*strain);
    });
    if(!this.openingShieldImpact && t>=s.at+.12){
      // The pack slams into the shield.
      this.openingShieldImpact=true;
      if(!reduced)this.cameras.main.shake(160,.0025);
      for(let i=0;i<4;i++){
        const a=base+(i-1.5)*.3,x=place.center.x+Math.cos(a)*(place.radius+10),y=place.center.y+Math.sin(a)*(place.radius+10);
        const splash=this.add.image(x,y-20,'water-impact').setDepth(y+6).setRotation(a+Math.PI).setAlpha(0);
        // Source art is 1536px wide: size it in world pixels, like the cannon impacts.
        const size=56/splash.width;splash.setScale(size);
        this.tweens.add({targets:splash,alpha:{from:.9,to:0},scale:size*1.5,duration:420,delay:i*40,onComplete:()=>splash.destroy()});
      }
    }
    // The mage holds the casting pose while raising the shield.
    if(t<s.castEnd){this.character.stop();this.character.setTexture('water-q-command').setRotation(0);}
  }

  private syncImageHitboxes(){
    applyCharacterTextureScale(this.character);
    this.run.player.hitbox=this.spriteHitboxes.localBox(this.character,this.run.player.position);
    for(const dummy of this.sandboxDummies){
      const sprite=this.monsterSprites.get(dummy.id)??this.allySprites.get(dummy.id);
      if(sprite){
        dummy.hitbox=this.spriteHitboxes.localBox(sprite,dummy.position,dummy.monsterArtId?monsterBodyClip(sprite,dummy.monsterArtId):undefined);
        if(dummy.monsterArtId==='boss-spiked-shell-beast')dummy.hitbox.y+=dummy.position.y-sprite.y;
      }
    }
    if(import.meta.env.VITE_STAGE_ONLY==='1')return;
    this.game.canvas.dataset.playerHitbox=JSON.stringify(this.run.player.hitbox);
    this.game.canvas.dataset.playerCombatRole=this.run.character?.combatRole??'';
    this.game.canvas.dataset.playerBlockingRadius=String(movementBody({position:this.run.player.position,radius:MOVEMENT_PREVIEW.radius,hitbox:this.run.player.hitbox}).radius);
    this.game.canvas.dataset.actorHitboxes=JSON.stringify(this.sandboxDummies.map(dummy=>({id:dummy.id,position:dummy.position,hitbox:dummy.hitbox,radius:dummy.radius,blockingRadius:movementBody(dummy).radius})));
  }

  private updateEnemyFocus(force=false){
    const mage=this.run.character;
    const body=mage?enemyHudTarget(this.sandboxDummies,mage.team,this.currentView(),this.run.player.position,this.enemyFocusId,this.lastEnemyHitId):undefined;
    if(!body || !mage){this.hud?.updateEnemyFocus();this.enemyFocusRing?.setVisible(false);return;}
    const controller=this.run.enemyCombat.controllers.find(state=>state.id===body.id);
    const model=enemyHudModel(body,this.run.time,mage.id,controller,this.threatTargetName(controller?.targetId));
    if(body.monsterArtId){
      let portrait=this.monsterPortraits.get(body.monsterArtId);
      if(!portrait){
        const art=MONSTER_ART.find(a=>a.id===body.monsterArtId);
        portrait=this.stageRun?this.textures.getBase64(ueMonsterKey(body.monsterArtId),ueIdleFrame(body.monsterArtId)):
          this.textures.getBase64(`monster-${body.monsterArtId}-normal`,art?.frames?'normal':undefined);
        this.monsterPortraits.set(body.monsterArtId,portrait);
      }model.portrait=portrait;
    }
    this.hud?.updateEnemyFocus(model,force);
    const color=Phaser.Display.Color.HexStringToColor(ELEMENT_PRESENTATION[body.actor.element].color).color;
    this.enemyFocusRing?.setPosition(body.position.x,body.position.y).setDepth(body.position.y-.5)
      .setDisplaySize((body.hitbox?.width??body.radius*2)+10,12).setStrokeStyle(2,color,.9)
      .setVisible(body.actor.resources.currentHp>0);
  }

  private setUiBlock(source:string,blocked:boolean){
    if(blocked){this.cancelEPlacement();this.waterSkillInput?.clear();}
    if(blocked)this.uiBlocks.add(source);else this.uiBlocks.delete(source);
    this.input.enabled=this.uiBlocks.size===0;
    if(this.input.keyboard){
      const keyboardEnabled=stageKeyboardEnabled(this.uiBlocks,this.stageRun?.phase);
      this.input.keyboard.resetKeys();this.input.keyboard.enabled=keyboardEnabled;
      if(keyboardEnabled)this.input.keyboard.enableGlobalCapture();else this.input.keyboard.disableGlobalCapture();
    }
    if(blocked && this.run.character)stopWaterCannon(this.run.character.basicAttack);
  }
  private cancelEPlacement(){this.ePlacement?.destroy();this.ePlacement=undefined;this.ultimatePlacement=false;}

  private touchAction(key:TouchAction,aim?:{x:number;y:number}){
    const stage=this.stageRun,mage=this.run.character;
    if(!stage || !mage || document.hidden || !this.stageFocused || this.uiBlocks.has('dev') || this.uiBlocks.has('character'))return;
    this.game.canvas.focus();
    if(key==='combo'){beginKhangChienSacrifice(stage);return;}
    if(stage.phase==='sacrifice'){
      if(key==='q')castKhangChienFinaleQ(stage,this.qStaffOrigin());return;
    }
    if(!stageInteractive(stage) || mage.resources.currentHp<=0)return;
    const origin=this.run.player.position;
    const closest=stage.enemies.filter(validBody).sort((a,b)=>
      Math.hypot(a.position.x-origin.x,a.position.y-origin.y)-Math.hypot(b.position.x-origin.x,b.position.y-origin.y))[0];
    const fallback=this.touchAim??{x:this.facing==='left'?-1:this.facing==='right'?1:0,y:this.facing==='up'?-1:this.facing==='down'?1:0};
    const target=aim?{x:origin.x+aim.x*220,y:origin.y+aim.y*220}:closest?{...closest.position}:{x:origin.x+fallback.x*220,y:origin.y+fallback.y*220};
    this.touchAim={x:target.x-origin.x,y:target.y-origin.y};this.aim={...this.touchAim};
    if(Math.hypot(this.touchAim.x,this.touchAim.y)<.001){this.touchAim={x:1,y:0};this.aim={...this.touchAim};}
    if(key==='attack'){
      if(this.dragonPreview?.movementLocked)return;
      pressWaterCannon(mage.basicAttack);releaseWaterCannon(mage.basicAttack);return;
    }
    this.cancelEPlacement();
    if(key==='q')this.showCastResult('Q',castRunQ(this.run,target));
    else if(key==='e')this.showCastResult('E',hasWaterLong(mage,7) && mage.mach===4
      ?castRunE(this.run,this.currentView(),undefined,target):castRunE(this.run,this.currentView()));
    else this.showCastResult('R',castRunR(this.run));
    this.handleWaterEvents();
  }

  private updateWaterAttack(dt:number) {
    const mage=this.run.character;if(!mage)return;
    const pointer=this.input.activePointer;
    // Screen-to-world conversion uses the current camera, including zoom/follow.
    const world=this.cameras.main.getWorldPoint(pointer.x,pointer.y);
    const dx=world.x-this.run.player.position.x,dy=world.y-this.run.player.position.y;
    if(this.touchControls){if(this.touchAim)this.aim={...this.touchAim};}
    else if(Math.hypot(dx,dy)>0.001)this.aim={x:dx,y:dy};
    if(mage.resources.currentHp<=0){stopWaterCannon(mage.basicAttack);this.waterChargeEffect?.hide();return;}
    const shots=tickWaterCannon(mage.basicAttack,dt,mage.stats.attackSpeedRating,this.aim);
    const sign=this.aim.x<0?-1:1;
    const origin={x:this.run.player.position.x+VISUAL.muzzleRight.x*sign,y:this.run.player.position.y+VISUAL.muzzleRight.y};
    for(const shot of shots){
      this.castStartRemaining=0;
      this.firingVisualRemaining=0.165; // Existing recoil duration; no gameplay lock.
      const projectile=fireRunProjectile(this.run,crypto.randomUUID(),origin,shot.direction,
        {speed:PREVIEW.projectileSpeed,radius:PREVIEW.projectileRadius,range:PREVIEW.projectileRange,chargeRatio:shot.chargeRatio,isFullCharge:shot.isFullCharge});
      const image=this.add.image(origin.x,origin.y,'water-projectile').setBlendMode(Phaser.BlendModes.NORMAL);
      const chargeScale=VISUAL.projectileMinScale+(1-VISUAL.projectileMinScale)*shot.chargeRatio;
      image.setScale(VISUAL.projectileWidth*chargeScale*(mage.waterSkills.encounterBuff?.cannonSize??1)/image.width).setRotation(Math.atan2(shot.direction.y,shot.direction.x));
      this.projectileImages.set(projectile.id,image);
      // Local sprite recoil only; world position and collision remain owned by Run.
      this.tweens.killTweensOf(this.character);
      this.character.setPosition(0,0);
      const recoil=3+7*shot.chargeRatio;
      this.tweens.add({targets:this.character,x:-shot.direction.x*recoil,y:-shot.direction.y*recoil,
        duration:45,ease:'Quad.Out',onComplete:()=>{
          this.tweens.add({targets:this.character,x:0,y:0,duration:120,ease:'Sine.Out'});
        }});
    }
    const carrying=new Set([...this.run.waterCannonAttacks].filter(([,attack])=>attack.hitTargets.size>0).map(([id])=>id));
    const impacts=tickRunProjectiles(this.run,dt,this.previewTargets);
    for(const impact of impacts){
      if(impact.type==='enemy')this.previewHits++;
      if(impact.type==='enemy' && impact.damage?.hit){
        this.lastEnemyHitId=impact.hit.targetId;
        const body=this.run.combatBodies.find(body=>body.id===impact.hit.targetId);
        if(body)this.waterSupport?.damageResponse(body.id,body.position,this.run.time,impact.damage.absorbedDamage>0,{x:-impact.direction.x,y:-impact.direction.y},body.hitbox);
        this.lastDamage=impact.damage.appliedDamage;
        this.game.canvas.dataset.lastDamage=String(this.lastDamage);
        const number=this.add.text(impact.position.x,impact.position.y-32,
          `${impact.damage.critical?'CRIT ':''}${this.lastDamage.toFixed(2)}`,
          {fontSize:'16px',color:'#ffffff',backgroundColor:'#172129',padding:{x:4,y:2}}).setOrigin(.5).setDepth(1002);
        this.tweens.add({targets:number,y:number.y-28,alpha:0,duration:700,onComplete:()=>number.destroy()});
      }
      const target=impact.type==='enemy'?this.previewTargets.find(target=>target.id===impact.hit.targetId):undefined;
      // A sprite hit keeps the actual swept contact point, rather than relocating to its feet.
      const hitPosition=target && !target.hitbox?{x:target.position.x,y:target.position.y-target.radius}:impact.position;
      const image=this.add.image(hitPosition.x,hitPosition.y,'water-impact').setBlendMode(Phaser.BlendModes.NORMAL)
        .setDepth((target?.position.y??impact.position.y)+3).setOrigin(0.88,0.57)
        .setRotation(Math.atan2(impact.direction.y,impact.direction.x));
      const impactScale=VISUAL.projectileMinScale+(1-VISUAL.projectileMinScale)*(impact.chargeRatio??1);
      image.setScale(64*impactScale/image.width);this.tweens.add({targets:image,alpha:0,delay:VISUAL.impactSeconds*650,
        duration:VISUAL.impactSeconds*350,onComplete:()=>image.destroy()});
    }
    const live=new Set(this.run.projectiles.map(p=>p.id));
    for(const [id,image] of this.projectileImages)if(!live.has(id)){
      this.projectileImages.delete(id);
      // A cannon that was pushing a crowd stalls a beat before dissolving; a free shot just fades.
      const {scaleX,scaleY}=image,pushing=carrying.has(id);
      this.tweens.add({targets:image,scaleX:scaleX*(pushing?.8:1),scaleY:scaleY*(pushing?1.15:1),duration:pushing?90:1,ease:'Quad.Out',onComplete:()=>{
        this.tweens.add({targets:image,alpha:0,scaleX:scaleX*1.25,scaleY:scaleY*1.25,duration:pushing?380:160,ease:'Sine.In',onComplete:()=>image.destroy()});
      }});
    }
    for(const projectile of this.run.projectiles)this.projectileImages.get(projectile.id)?.setPosition(projectile.position.x,projectile.position.y).setDepth(projectile.position.y);
    this.waterChargeEffect?.update({
      active:mage.basicAttack.phase==='charging' || mage.basicAttack.phase==='full_charge',
      full:mage.basicAttack.phase==='full_charge',progress:mage.basicAttack.progress,
      position:this.run.player.position,origin,facingLeft:sign<0,deltaSeconds:dt,timeMs:this.time.now,
    });
    const data=this.game.canvas.dataset;
    data.attackPhase=mage.basicAttack.phase;data.chargeProgress=mage.basicAttack.progress.toFixed(3);
    data.attackFacing=sign<0?'left':'right';data.attackShots=String(mage.basicAttack.shots);
    if(shots.length)data.lastChargeRatio=String(shots[0].chargeRatio);
    data.projectiles=String(this.run.projectiles.length);data.previewHits=String(this.previewHits);
    data.attackMoveMultiplier=chargeMoveMultiplier(mage.basicAttack).toFixed(3);
    data.mach=String(mage.mach);
  }

  private updateSandbox() {
    if(!this.run.character)return;
    // Stage-only builds skip dev labels, but cinematic phases still need monster sprites synced.
    if(import.meta.env.VITE_STAGE_ONLY==='1'){this.updateMonsterPresentation();return;}
    for(const dummy of this.sandboxDummies){
      const {currentHp}=dummy.actor.resources,max=dummy.actor.stats.maxHp;
      const shield=totalShield(dummy.actor,this.run.time);
      const enemy=this.run.enemyCombat.controllers.find(state=>state.id===dummy.id);
      const threat=enemy?Math.max(0,...enemy.threat.points.values()):0;
      const recovering=enemy?.threat.recovering && currentHp>0 && currentHp<max;
      this.sandboxLabels.get(dummy.id)?.setPosition(dummy.position.x,dummy.position.y+(dummy.hitbox?.y??-dummy.radius)-10)
        .setDepth(dummy.position.y+1).setVisible(dummy.targetable!==false && !dummy.burrowed).setColor(recovering?'#a4ffbc':'#ffffff')
        .setText(`${dummy.monsterArtId && !this.debugEnabled?'':`${dummy.label} · `}${(currentHp/max*100).toFixed(0)}%${shield>0?` · Khiên ${shield.toFixed(1)}`:''}${threat>0?` · TH ${Math.ceil(threat)}`:''}${recovering?' · Hồi':''}`);
      this.sandboxCircles.get(dummy.id)?.setVisible(dummy.targetable!==false).setAlpha(currentHp>0?1:.3);
      this.sandboxCharacters.get(dummy.id)?.setPosition(dummy.position.x,dummy.position.y)
        .setDepth(dummy.position.y).setVisible(dummy.targetable!==false).setAlpha(currentHp>0?1:.3);
    }
    this.updateMonsterPresentation();
    if(this.stageRun){
      this.game.events.emit('sandbox-dev-status',[
        `STAGE KHÁNG CHIẾN · Map ${this.stageRun.mapIndex}/4 · ${this.stageRun.phase}`,
        `Quái hạ: ${this.stageRun.kills} · Đã xuất hiện: ${this.stageRun.spawned} · Còn sống: ${this.stageRun.enemies.filter(e=>validBody(e)).length}`,
        `HP: ${Math.round(this.run.character.resources.currentHp)} · MP: ${Math.round(this.run.character.resources.currentMp)} · Mạch: ${this.run.character.mach}/4`,
        `Kết giới: ${Math.ceil(this.stageRun.barrier.body.actor.resources.currentHp)} / ${this.stageRun.barrier.body.actor.stats.maxHp} HP · Quái nhắm kết giới: ${this.run.enemyCombat.controllers.filter(c=>c.targetId===this.stageRun!.barrier.body.id).length}`,
        ...KHANG_CHIEN_ROADS.map(road=>`${road.name}: ${this.stageRun!.enemies.filter(e=>e.roadId===road.id).length} quái`),
        `AI: ${this.run.enemyCombat.enabled?'chạy':'dừng'} · F3: vùng va chạm`,
        'Các nút hoàn thành đợt và boss 40% chỉ phục vụ kiểm tra Stage.',
      ].join('\n'));return;
    }
    this.game.events.emit('sandbox-dev-status',['SANDBOX · Pháp Sư Thủy V0.1',
        `Mạch: ${this.run.character.mach}/4${this.run.character.mach===4?' READY':''} · Damage: ${this.lastDamage.toFixed(2)}`,
        `HP: ${this.run.character.resources.currentHp.toFixed(1)} · MP: ${this.run.character.resources.currentMp.toFixed(1)}/${this.run.character.stats.maxMp} · Khiên: ${totalShield(this.run.character,this.run.time).toFixed(2)}`,
        `Kính: ${this.run.character.waterSkills.mirrors.count}/3 · Dây: ${this.run.character.waterSkills.links.length} · Tinh Thần tạm: +${this.run.character.temporarySpirit}`,
        `CD Q/E/R: ${(['q','e','r'] as const).map(key=>Math.max(0,this.run.character!.waterSkills.cooldowns[key]-this.run.time).toFixed(1)).join(' / ')}`,
        'Q: mặt đất · E: đồng đội dưới chuột / bản thân',
        'R: kính · H: hồi · T: solo/đội · J/K: thử hit',
        `AI quái: ${this.run.enemyCombat.enabled?'chạy':'dừng'} · Đòn đã phát: ${this.run.enemyCombat.attacks} · Đạn: ${this.run.enemyCombat.shots.length}`,
        `Tag: Bạn tầm xa (+10), Đội A cận chiến (+5), Đội B tầm xa (+10)`,
        ...this.run.enemyCombat.controllers.map(state=>`${this.sandboxDummies.find(b=>b.id===state.id)?.label}: → ${this.threatTargetName(state.targetId)} · ${[...state.threat.points].map(([id,points])=>`${this.threatTargetName(id)} ${points.toFixed(1)}`).join(', ')||'TH 0'}`),
        'F3: vùng camera / collision',this.castFeedback].join('\n'));
  }

  private threatTargetName(id?:string):string {
    if(id===this.run.character?.id)return 'Bạn';
    if(id===this.stageRun?.barrier.body.id)return 'Kết giới';
    return this.sandboxDummies.find(b=>b.id===id)?.label.replace('Đồng đội ','Đội ')??'—';
  }

  private updateMonsterPresentation(){
    const pushed=new Set<string>();
    for(const projectile of this.run.projectiles){const attack=this.run.waterCannonAttacks.get(projectile.id);if(attack && projectile.active)for(const id of attack.hitTargets)pushed.add(id);}
    const still=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    for(const state of this.run.enemyCombat.controllers){
      const body=this.sandboxDummies.find(b=>b.id===state.id),sprite=this.monsterSprites.get(state.id);
      if(!body?.monsterArtId || !sprite)continue;
      if(this.stageRun)setUeMonsterPose(sprite,body.monsterArtId,state.phase==='recover' && state.phaseEndsAt-this.run.time<state.settings.recovery-.18?'idle':state.phase,state.facingLeft,state.boss?.phase,this.stageRun.mapIndex);
      else setMonsterPose(sprite,body.monsterArtId,validBody(body) && (state.phase==='windup' || state.phase==='lunge' || state.phase==='recover'),state.facingLeft,state.boss?.phase);
      if(this.stageRun && body.id===this.stageRun.bossId && ['bomb','sacrifice'].includes(this.stageRun.phase)){
        const age=stageAge(this.stageRun),heat=this.stageRun.phase==='bomb'?Math.min(1,age/6):1;
        const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const pulse=reduced?0:Math.sin(age*(8+heat*4))*.035;
        sprite.setTexture(ueMonsterKey(body.monsterArtId),'roll').setOrigin(.5,.9).setFlipX(false).setRotation(0);
        const small=body.actor.resources.currentHp<=1;
        const shrink=small?Math.min(1,Math.max(0,(age-finaleTiming(this.stageRun).eightImpactAt)/.35)):0;
        const size=(150*(1+.2*heat)*(1-shrink)+32*shrink)*(1+pulse);
        sprite.setScale(size/sprite.width,size/sprite.width*(1-pulse));
        const green=Math.round(255-heat*55),blue=Math.round(255-heat*95);
        sprite.setTint((255<<16)|(green<<8)|blue);
      }else if(!this.stageRun)sprite.clearTint();
      sprite.setPosition(body.position.x,body.position.y).setDepth(body.position.y)
        .setVisible(body.targetable!==false && !body.burrowed).setAlpha(body.actor.resources.currentHp>0?1:.25);
      if(state.counter && !state.counter.fired && !still){
        sprite.x+=Math.sin(this.run.time*16)*(this.stageRun ? .7 : 2);sprite.setTint(this.stageRun?0xf1d0a4:0xffb0a0);
      }
      if(this.stageRun && ['arrival','barrier'].includes(this.stageRun.phase) && this.stageRun.clock>=OPENING_SHIELD.until && this.stageRun.clock<24){
        // Shield gone: everyone stands wound up, ready to strike.
        setUeMonsterPose(sprite,body.monsterArtId,'windup',this.run.player.position.x<body.position.x,undefined,this.stageRun.mapIndex);
      }
      if(this.stageRun && ['arrival','barrier'].includes(this.stageRun.phase) && this.stageRun.clock>=OPENING_SHIELD.at && this.stageRun.clock<OPENING_SHIELD.until){
        // Blocked by the shield: rats and grasshoppers keep leaping at it, the others stay wound up to strike.
        const species=body.monsterArtId.replace(/^elite-/,''),jumper=species==='flat-fur-rat' || species==='grasshopper';
        const clock=this.stageRun.clock,seed=body.position.x*.37+body.position.y*.11;
        setUeMonsterPose(sprite,body.monsterArtId,jumper?'lunge':'windup',this.run.player.position.x<body.position.x,undefined,this.stageRun.mapIndex);
        if(jumper)sprite.y-=Math.abs(Math.sin(clock*6.5+seed))*(still?8:28);
        else if(!still)sprite.x+=Math.sin(clock*55+seed)*1.6;
      }
      // Heavy enemies straining against the cannon shudder while they are pushed.
      if(pushed.has(body.id) && body.rank && body.rank!=='normal' && !still){
        sprite.x+=Math.sin(this.run.time*90)*2.5;sprite.y+=Math.cos(this.run.time*70)*1.2;
      }
      if(state.dive && state.dive.pauseUntil===undefined){
        const k=Phaser.Math.Clamp((this.run.time-state.dive.startedAt)/Math.max(.01,state.dive.landsAt-state.dive.startedAt),0,1);
        sprite.y-=Math.sin(k*Math.PI)*95;sprite.setDepth(body.position.y+200);
      }
      if(this.stageRun && body.id===this.stageRun.bossId && ['bomb','sacrifice'].includes(this.stageRun.phase)
        && !window.matchMedia('(prefers-reduced-motion: reduce)').matches){
        const age=stageAge(this.stageRun);sprite.x+=Math.sin(age*35)*2;sprite.y+=Math.sin(age*27)*1.2;
      }
      if(this.stageRun && body.id===this.stageRun.bossId && this.stageRun.phase==='sacrifice'){
        // Lost in the mist after the dragons, seen again barely alive, gone once it blows up.
        const timing=finaleTiming(this.stageRun),age=stageAge(this.stageRun);
        if((age>=timing.eightImpactAt+.35 && age<timing.revealAt) || age>=timing.beamAt)sprite.setVisible(false);
        else if(age>=timing.revealAt)sprite.setRotation(still?0:Math.sin(age*13)*.12);
      }
      if(state.boss?.phase==='jump'){
        const progress=Phaser.Math.Clamp((this.run.time-state.boss.startedAt)/(state.boss.endsAt-state.boss.startedAt),0,1);
        sprite.y-=Math.sin(progress*Math.PI)*75;
      }
    }
    if(import.meta.env.VITE_STAGE_ONLY==='1')return;
    const data=this.game.canvas.dataset;
    data.enemyAi=String(this.run.enemyCombat.enabled);data.enemyAttacks=String(this.run.enemyCombat.attacks);
    data.enemyProjectiles=String(this.run.enemyCombat.shots.length);
    data.enemyThreatTotal=String(this.run.enemyCombat.controllers.reduce((sum,state)=>sum+[...state.threat.points.values()].reduce((a,b)=>a+b,0),0));
    data.enemyRecovering=String(this.run.enemyCombat.controllers.filter(state=>{
      const body=this.run.combatBodies.find(b=>b.id===state.id);
      return state.threat.recovering && body && validBody(body) && body.actor.resources.currentHp<body.actor.stats.maxHp;
    }).length);
    data.enemyStates=JSON.stringify(this.run.enemyCombat.controllers.map(state=>({id:state.id,phase:state.phase,
      texture:this.monsterSprites.get(state.id)?.texture.key,position:this.run.combatBodies.find(b=>b.id===state.id)?.position,
      targetId:state.targetId,approach:state.approach?{index:state.approach.index,waypoint:state.approach.waypoints[state.approach.index]}:undefined,threat:[...state.threat.points],recovering:state.threat.recovering,
      recoveryIn:Math.max(0,state.threat.lastDamageAt+ENEMY_THREAT.recoveryDelay-this.run.time),
      hp:this.run.combatBodies.find(b=>b.id===state.id)?.actor.resources.currentHp})));
  }

  private handleEnemyEvents(){
    for(const event of this.run.enemyCombat.events.splice(0)){
      if(event.kind==='impact'){
        if(this.stageRun){this.ueImpacts.push({position:event.position,visual:event.visual,at:this.run.time});continue;}
        const splash=this.add.circle(event.position.x,event.position.y,event.visual==='resin'?14:6,event.visual==='slime'?0xbce848:event.visual==='resin'?0xd8922a:0xffdb8b,.7).setDepth(1001);
        this.tweens.add({targets:splash,alpha:0,scale:1.8,duration:180,onComplete:()=>splash.destroy()});
        continue;
      }
      if(event.kind==='interrupt'){
        const label=this.add.text(event.position.x,event.position.y-30,'Ngắt!',{fontSize:'15px',fontStyle:'bold',color:'#9ff3ff',backgroundColor:'#172129',padding:{x:4,y:1}})
          .setOrigin(.5).setDepth(1002);
        this.tweens.add({targets:label,y:label.y-22,alpha:0,duration:650,onComplete:()=>label.destroy()});
        continue;
      }
      const objectiveHit=event.targetId===this.stageRun?.barrier.body.id;
      const body=this.run.combatBodies.find(b=>b.id===event.targetId);
      const point=body?.position??this.run.player.position;
      if(!objectiveHit)this.waterSupport?.damageResponse(event.targetId,point,this.run.time,event.damage.absorbedDamage>0,event.incomingSide,body?.hitbox??this.run.player.hitbox);
      else {
        const flash=this.add.circle(event.position.x,event.position.y,18,0x90eeff,.65).setDepth(1001);
        this.tweens.add({targets:flash,alpha:0,scale:2,duration:220,onComplete:()=>flash.destroy()});
      }
      const label=this.add.text(event.position.x,event.position.y-14,
        event.damage.appliedDamage>0?`-${event.damage.appliedDamage.toFixed(1)}`:`Khiên -${event.damage.absorbedDamage.toFixed(1)}`,
        {fontSize:'14px',color:event.damage.appliedDamage>0?'#ffb0a1':'#a9f1ff',backgroundColor:'#172129'})
        .setOrigin(.5).setDepth(1002);
      this.tweens.add({targets:label,y:label.y-24,alpha:0,duration:700,onComplete:()=>label.destroy()});
      this.game.canvas.dataset.enemyHits=String(Number(this.game.canvas.dataset.enemyHits??0)+1);
      if(event.targetId===this.run.character?.id && event.damage.killed){
        this.castFeedback='Đã gục · Dev → Hồi đầy HP / MP để thử lại';this.hud?.showFeedback(this.castFeedback);
      }
    }
  }

  private drawEnemyShots(){
    const graphics=this.enemyShotGraphics;if(!graphics)return;graphics.clear();
    if(this.stageRun && this.enemyZoneGraphics){
      this.ueImpacts=this.ueImpacts.filter(i=>this.run.time-i.at<.3);
      drawUeEnemyEffects(this.run,graphics,this.enemyZoneGraphics,this.ueImpacts,window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      this.drawRooted(graphics);return;
    }
    this.drawEnemyZones(graphics);
    this.drawRooted(graphics);
    for(const state of this.run.enemyCombat.controllers){
      if(state.boss?.phase==='underground' && state.boss.emergeAt){
        // Same read as the black elite: a marked spot that fills in until it erupts.
        const p=state.boss.emergeAt,r=state.settings.meleeHitRadius,body=this.sandboxDummies.find(b=>b.id===state.id);
        const t=Phaser.Math.Clamp((this.run.time-state.boss.startedAt)/Math.max(.01,state.boss.endsAt-state.boss.startedAt),0,1);
        const blink=window.matchMedia('(prefers-reduced-motion: reduce)').matches?1:.75+.25*Math.sin(this.run.time*30);
        if(body){const len=Math.hypot(p.x-body.position.x,p.y-body.position.y)||1,dx=(p.x-body.position.x)/len,dy=(p.y-body.position.y)/len;
          for(let d=0;d<len;d+=18)graphics.lineStyle(2,0xffad55,.4+.4*t).lineBetween(body.position.x+dx*d,body.position.y+dy*d,body.position.x+dx*Math.min(len,d+10),body.position.y+dy*Math.min(len,d+10));}
        graphics.fillStyle(0x2a1406,.3).fillCircle(p.x,p.y,r);
        graphics.fillStyle(0xd8742a,.18+.35*t).fillCircle(p.x,p.y,r*t);
        graphics.lineStyle(5,0x2a1406,.7).strokeCircle(p.x,p.y,r);
        graphics.lineStyle(3,0xffc277,blink).strokeCircle(p.x,p.y,r);
        graphics.lineStyle(2,0xffffff,.8).lineBetween(p.x-r*.3,p.y,p.x+r*.3,p.y).lineBetween(p.x,p.y-r*.3,p.x,p.y+r*.3);
        continue;
      }
      if(state.boss && (state.boss.phase==='roll-warning' || state.boss.phase==='jump' || state.boss.phase==='jump-warning')){
        const body=this.sandboxDummies.find(b=>b.id===state.id);if(!body)continue;
        graphics.lineStyle(4,0xffad55,.9);
        if(state.boss.phase==='roll-warning'){
          const p=bodyCenter(body),d=state.boss.direction,reach=state.settings.bossCycle!.rollSpeed*state.settings.bossCycle!.rollSeconds;
          graphics.lineBetween(p.x,p.y,p.x+d.x*reach,p.y+d.y*reach);
          graphics.strokeCircle(p.x+d.x*reach,p.y+d.y*reach,state.settings.meleeHitRadius);
        }else if(state.boss.jumpTarget)graphics.strokeCircle(state.boss.jumpTarget.x,state.boss.jumpTarget.y,state.settings.meleeHitRadius);
        continue;
      }
      if(state.phase!=='windup' || (!state.settings.pattern && !state.counter && !state.lockedTarget) || !state.origin || !state.aim)continue;
      const o=state.origin,a=state.aim,color=state.counter || state.lockedTarget?0xff5a4a:0xffad55;
      graphics.lineStyle(3,color,.85);
      if(state.ability==='zone'){
        const pulse=.5+.5*Math.sin(this.run.time*14);
        graphics.lineStyle(3,0xdc75ff,.5+.4*pulse).strokeCircle(o.x,o.y,26+6*pulse);
        // Prediction preview: where the bristles would land if the player keeps moving this way.
        const zone=state.settings.zoneShot,track=this.run.enemyCombat.playerTrack;
        if(zone && state.targetId===this.run.character?.id){
          const v=track?.velocity??{x:0,y:0},p=this.run.player.position;
          let px=p.x+v.x*zone.flightSeconds,py=p.y+v.y*zone.flightSeconds;
          const reach=Math.hypot(px-o.x,py-o.y),limit=state.settings.projectileRange;
          if(reach>limit){px=o.x+(px-o.x)/reach*limit;py=o.y+(py-o.y)/reach*limit;}
          const charge=Phaser.Math.Clamp(1-(state.phaseEndsAt-this.run.time)/Math.max(.01,state.settings.windup),0,1);
          const len=Math.hypot(px-o.x,py-o.y)||1,dx=(px-o.x)/len,dy=(py-o.y)/len;
          for(let d=0;d<len;d+=18)graphics.lineStyle(2,0xdc75ff,.35+.5*charge).lineBetween(o.x+dx*d,o.y+dy*d,o.x+dx*Math.min(len,d+10),o.y+dy*Math.min(len,d+10));
          graphics.lineStyle(2,0xf0b8ff,.45+.45*charge).strokeCircle(px,py,zone.radius);
          graphics.fillStyle(0xb44ee0,.08+.17*charge).fillCircle(px,py,zone.radius*charge);
          graphics.lineStyle(3,0xffffff,.6+.3*pulse).lineBetween(px-10,py,px+10,py).lineBetween(px,py-10,px,py+10);
        }
      }else if(state.ability==='wall' && state.settings.wallShot && state.targetId===this.run.character?.id){
        // Prediction preview: the arc lands across the way the player is heading (same rule as the director).
        const w=state.settings.wallShot,v=this.run.enemyCombat.playerTrack?.velocity??{x:0,y:0},p=this.run.player.position,speed=Math.hypot(v.x,v.y);
        const toward={x:p.x-o.x,y:p.y-o.y},tl=Math.hypot(toward.x,toward.y)||1;
        const facing=speed>30?{x:v.x/speed,y:v.y/speed}:{x:toward.x/tl,y:toward.y/tl};
        const center=speed>30?{x:p.x+v.x*w.flightSeconds,y:p.y+v.y*w.flightSeconds}:{x:p.x-facing.x*w.radius,y:p.y-facing.y*w.radius};
        const shape=wallObject({id:'preview',center,facing,radius:w.radius,halfAngle:w.halfAngle,thickness:w.thickness} as Parameters<typeof wallObject>[0]);
        const pts=(shape.shape as {points:{x:number;y:number}[]}).points.map(q=>({x:q.x+shape.x,y:q.y+shape.y}));
        const charge=Phaser.Math.Clamp(1-(state.phaseEndsAt-this.run.time)/Math.max(.01,state.settings.windup),0,1),pulse=.5+.5*Math.sin(this.run.time*14);
        const mid={x:center.x+facing.x*w.radius,y:center.y+facing.y*w.radius},len=Math.hypot(mid.x-o.x,mid.y-o.y)||1,dx=(mid.x-o.x)/len,dy=(mid.y-o.y)/len;
        for(let d=0;d<len;d+=18)graphics.lineStyle(2,0xd8ff7a,.35+.5*charge).lineBetween(o.x+dx*d,o.y+dy*d,o.x+dx*Math.min(len,d+10),o.y+dy*Math.min(len,d+10));
        graphics.fillStyle(0xb8e85a,.08+.2*charge).fillPoints(pts,true);
        graphics.lineStyle(3,0x1a1410,.5).strokePoints(pts,true);
        graphics.lineStyle(2,0xe9ff9a,.5+.4*charge*pulse+.1).strokePoints(pts,true);
        graphics.lineStyle(3,0xb8e85a,.5+.4*pulse).strokeCircle(o.x,o.y,24+5*pulse);
      }else if(state.ability==='charge'){
        // A homing counter shows its line up to the player, not its full (long) chase range.
        const dx=a.x-o.x,dy=a.y-o.y,len=Math.hypot(dx,dy)||1,full=state.lungeRange??state.settings.attackRange,reach=state.counter?Math.min(full,len+30):full;
        graphics.lineBetween(o.x,o.y,o.x+dx/len*reach,o.y+dy/len*reach);
        graphics.strokeCircle(o.x+dx/len*reach,o.y+dy/len*reach,state.settings.meleeHitRadius);
      }else if(state.ability==='radial')graphics.strokeCircle(o.x,o.y,state.settings.attackRange);
      else {
        const angle=Math.atan2(a.y-o.y,a.x-o.x),spread=state.settings.spread??0,range=state.settings.attackRange;
        for(const offset of [-spread/2,spread/2])graphics.lineBetween(o.x,o.y,o.x+Math.cos(angle+offset)*range,o.y+Math.sin(angle+offset)*range);
      }
    }
    for(const shot of this.run.enemyCombat.shots){
      const {position:p,direction:d,radius}=shot.projectile;
      if(this.sandboxDummies.find(b=>b.id===shot.ownerId)?.monsterArtId?.startsWith('boss-')){
        // Boss volley: torn-off claws, bone-white with red spines, spinning in flight.
        this.drawClawShot(graphics,p,Math.atan2(d.y,d.x)+Math.sin(this.run.time*12+p.x*.05)*.35,radius*4.4);
        continue;
      }
      if(shot.visual==='resin'){
        // A slow, glossy crescent of amber resin, bowed forward along its flight.
        const n={x:-d.y,y:d.x},half=radius*1.5,bow=radius*.7,wob=Math.sin(this.run.time*9)*.12;
        const arc=Array.from({length:9},(_,i)=>{const k=i/4-1,f=bow*(1-k*k)*(1+wob);return {x:p.x+n.x*half*k+d.x*(f-bow*.4),y:p.y+n.y*half*k+d.y*(f-bow*.4)};});
        graphics.fillStyle(0xd99a2b,.2).fillCircle(p.x,p.y,half*1.2);
        graphics.lineStyle(radius*.8+4,0x3a2208,.6).strokePoints(arc,false);
        graphics.lineStyle(radius*.8,0xd8922a,.95).strokePoints(arc,false);
        graphics.lineStyle(radius*.25,0xffe1a0,.85).strokePoints(arc.map(q=>({x:q.x+d.x*radius*.15,y:q.y+d.y*radius*.15})),false);
        for(let i=0;i<3;i++){const q=arc[2+i*2];graphics.fillStyle(0xc07b1c,.9).fillCircle(q.x-d.x*radius*.6,q.y-d.y*radius*.6,3+i%2);}
        continue;
      }
      const art=this.sandboxDummies.find(b=>b.id===shot.ownerId)?.monsterArtId??'',elite=art.startsWith('elite-');
      const color=shot.visual==='slime'?0xbee855:art.includes('black')?0xdc75ff:art.includes('mutant')?0xff9c55:0xffe768;
      // Dark rim + soft glow + longer trail keep enemy shots readable on the busy painted maps.
      const trail=elite?34:22;
      graphics.fillStyle(color,.22).fillCircle(p.x,p.y,radius*2.6);
      graphics.lineStyle(radius*1.6+2,0x1a1410,.45).lineBetween(p.x-d.x*trail,p.y-d.y*trail,p.x,p.y);
      graphics.lineStyle(radius*1.1+1,color,.75).lineBetween(p.x-d.x*trail,p.y-d.y*trail,p.x,p.y);
      graphics.lineStyle(2,0x1a1410,.85).strokeCircle(p.x,p.y,radius+1.5);
      if(elite){
        const tip={x:p.x+d.x*radius*2.5,y:p.y+d.y*radius*2.5},tail={x:p.x-d.x*radius*2,y:p.y-d.y*radius*2};
        graphics.fillStyle(color,.95).fillTriangle(tip.x,tip.y,tail.x-d.y*radius*.45,tail.y+d.x*radius*.45,tail.x+d.y*radius*.45,tail.y-d.x*radius*.45);
        graphics.lineStyle(1,0xfff7d2,1).lineBetween(tail.x,tail.y,tip.x,tip.y);
      }else if(shot.visual==='slime')graphics.fillStyle(color,.95).fillCircle(p.x,p.y,radius);
      else graphics.fillStyle(color).fillTriangle(p.x+d.x*radius*2,p.y+d.y*radius*2,
        p.x-d.x*radius-d.y*radius,p.y-d.y*radius+d.x*radius,
        p.x-d.x*radius+d.y*radius,p.y-d.y*radius-d.x*radius);
    }
  }

  /** Pinned by bristles (black elite): spikes around the feet, a label and a countdown above the head. */
  private drawRooted(g:Phaser.GameObjects.Graphics){
    const now=this.run.time,remaining=Math.max(0,...(this.run.player.slows??[]).filter(s=>s.multiplier<=0).map(s=>s.expiresAt-now));
    const rim=this.stageRun?0xe6d4ad:0xdc75ff,fillColor=this.stageRun?0x34332b:0x6a2a8a;
    const p=this.run.player.position,reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(remaining<=0 || (this.run.character?.resources.currentHp??0)<=0){this.rootTotal=0;this.rootLabel?.setVisible(false);return;}
    if(this.rootTotal===0){
      // Onset: a purple snap around the feet.
      this.rootTotal=remaining;
      const ring=this.add.ellipse(p.x,p.y,40,14,rim,.35).setStrokeStyle(2,rim,.9).setDepth(p.y+2);
      this.tweens.add({targets:ring,scale:2.2,alpha:0,duration:320,ease:'Cubic.Out',onComplete:()=>ring.destroy()});
      if(!reduced && !this.stageRun)this.cameras.main.shake(140,.003);
    }
    const pulse=reduced?0:Math.sin(now*14);
    g.fillStyle(fillColor,.35).fillEllipse(p.x,p.y,62,22);
    g.lineStyle(2,rim,.95).strokeEllipse(p.x,p.y,62,22);
    for(let i=0;i<12;i++){
      const a=i*Math.PI/6,x=p.x+Math.cos(a)*31,y=p.y+Math.sin(a)*11,h=16+4*Math.sin(now*10+i)*(reduced?0:1);
      g.lineStyle(3,0x2a0a36,.8).lineBetween(x,y,x-Math.cos(a)*5,y-h);
      g.lineStyle(2,this.stageRun?rim:i%2?0xf0b8ff:0xdc75ff,1).lineBetween(x,y,x-Math.cos(a)*5,y-h);
    }
    const top=p.y-92,width=46,fill=Math.min(1,remaining/Math.max(.01,this.rootTotal));
    g.fillStyle(0x12061a,.85).fillRoundedRect(p.x-width/2-2,top+12,width+4,8,3);
    g.fillStyle(rim,1).fillRoundedRect(p.x-width/2,top+14,width*fill,4,2);
    this.rootLabel??=this.add.text(0,0,'BỊ GHIM',{fontSize:'13px',fontStyle:'bold',color:this.stageRun?'#e6d4ad':'#f3d6ff',backgroundColor:this.stageRun?'#171b18d9':'#2a0a36d9',padding:{x:5,y:1}}).setOrigin(.5,1).setDepth(1003);
    this.rootLabel.setVisible(true).setPosition(p.x,top+10+pulse).setScale(1+.06*Math.max(0,pulse));
  }

  private drawClawShot(g:Phaser.GameObjects.Graphics,c:{x:number;y:number},angle:number,length:number){
    const cos=Math.cos(angle),sin=Math.sin(angle),half=length/2,put=(u:number,v:number)=>({x:c.x+u*cos-v*sin,y:c.y+u*sin+v*cos});
    const pts:{x:number;y:number}[]=[];
    for(let i=0;i<=10;i++){const t=i/10;pts.push(put(-half+length*t,-length*.27*Math.sin(t*Math.PI)-length*.15*t*t));}
    for(let i=10;i>=0;i--){const t=i/10;pts.push(put(-half+length*.92*t,length*.11-length*.11*Math.sin(t*Math.PI)-length*.23*t*t));}
    g.fillStyle(0x1a1410,.55).fillPoints(pts.map(q=>({x:q.x+2,y:q.y+2})),true);
    g.fillStyle(0xf2ead8,1).fillPoints(pts,true);
    g.lineStyle(2,0x3b2a1e,1).strokePoints(pts,true);
    for(let i=0;i<3;i++){
      const t=.2+i*.22,base=put(-half+length*t,-length*.27*Math.sin(t*Math.PI)-length*.15*t*t);
      const side=put(-half+length*t+length*.13,-length*.27*Math.sin(t*Math.PI)-length*.15*t*t),tip=put(-half+length*t-length*.06,-length*.27*Math.sin(t*Math.PI)-length*.15*t*t-length*.2);
      g.fillStyle(0xc0262b,1).fillTriangle(base.x,base.y,side.x,side.y,tip.x,tip.y);
    }
  }

  private drawEnemyZones(shots:Phaser.GameObjects.Graphics){
    const graphics=this.enemyZoneGraphics;if(!graphics)return;graphics.clear();
    if(this.bristleBursts.size){const live=new Set(this.run.enemyCombat.zones.map(z=>z.id));for(const id of this.bristleBursts)if(!live.has(id))this.bristleBursts.delete(id);}
    const now=this.run.time,reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    for(const zone of this.run.enemyCombat.zones){
      const {x,y}=zone.position,r=zone.radius,fade=Math.min(1,Math.max(0,(zone.expiresAt-now)/1));
      if(zone.kind==='bristle' && now<zone.activeAt){
        // In flight: warning ring on the predicted spot, filling as the bristles arrive.
        const t=Math.min(1,(now-zone.bornAt)/Math.max(.01,zone.activeAt-zone.bornAt)),blink=reduced?1:.75+.25*Math.sin(now*30);
        graphics.fillStyle(0x1a0624,.25).fillCircle(x,y,r);
        graphics.fillStyle(0xb44ee0,.18+.32*t).fillCircle(x,y,r*t);
        graphics.lineStyle(5,0x2a0a36,.7).strokeCircle(x,y,r);
        graphics.lineStyle(3,0xf0b8ff,blink).strokeCircle(x,y,r);
        graphics.lineStyle(2,0xffffff,.8).lineBetween(x-r*.3,y,x+r*.3,y).lineBetween(x,y-r*.3,x,y+r*.3);
        if(zone.origin)for(let i=0;i<5;i++){
          const k=Math.min(1,t+i*.06),sx=zone.origin.x+(x-zone.origin.x)*k+Math.cos(i*1.7)*r*.4*k,sy=zone.origin.y+(y-zone.origin.y)*k-Math.sin(Math.PI*k)*60+Math.sin(i*2.3)*r*.3*k;
          const dx=x-zone.origin.x,dy=y-zone.origin.y,len=Math.hypot(dx,dy)||1;
          shots.lineStyle(3,0xdc75ff,1).lineBetween(sx-dx/len*10,sy-dy/len*10,sx,sy);
        }
        continue;
      }
      if(zone.kind==='slime'){
        graphics.fillStyle(0x8fd13c,.38*fade).fillEllipse(x,y,r*2,r*1.3);
        graphics.fillStyle(0xd4ff8a,.35*fade).fillEllipse(x-r*.25,y-r*.12,r*.7,r*.35);
      }else if(zone.kind==='fire'){
        // Bright, wide ground fire: dark scorched rim, orange body, hot core and flickering tongues.
        const flicker=reduced?0:Math.sin(now*11+x*.13)*.08,seed=zone.bornAt*7.3;
        graphics.fillStyle(0x3a0c04,.5*fade).fillEllipse(x,y,r*2.15,r*1.3);
        graphics.fillStyle(0xff4a12,(.55+flicker)*fade).fillEllipse(x,y,r*1.9,r*1.12);
        graphics.fillStyle(0xff9a2e,(.6+flicker)*fade).fillEllipse(x,y,r*1.3,r*.76);
        graphics.fillStyle(0xffe58a,(.55+flicker)*fade).fillEllipse(x+Math.sin(now*7+y)*3,y-2,r*.6,r*.34);
        graphics.lineStyle(2,0xffb347,.85*fade).strokeEllipse(x,y,r*2,r*1.2);
        for(let i=0;i<6;i++){
          const a=seed+i*Math.PI/3,fx=x+Math.cos(a)*r*.62,fy=y+Math.sin(a)*r*.36,h=reduced?12:10+6*Math.sin(now*9+i*2.1+seed);
          graphics.fillStyle(i%2?0xffd04a:0xff6a1f,.85*fade).fillTriangle(fx-5,fy,fx+5,fy,fx+Math.sin(now*6+i)*2,fy-h);
        }
      }else{
        if(!this.bristleBursts.has(zone.id)){
          // The moment it lands: a sharp purple burst so the hit reads clearly.
          this.bristleBursts.add(zone.id);
          const ring=this.add.circle(x,y,r,0xdc75ff,.55).setStrokeStyle(4,0xffffff,.95).setDepth(y+3);
          this.tweens.add({targets:ring,scale:{from:.5,to:1.35},alpha:{from:.9,to:0},duration:320,ease:'Cubic.Out',onComplete:()=>ring.destroy()});
          for(let i=0;i<8;i++){
            const a=i*Math.PI/4,spike=this.add.rectangle(x+Math.cos(a)*r*.4,y+Math.sin(a)*r*.4*.7,4,22,0xf0b8ff,1).setRotation(a+Math.PI/2).setDepth(y+4);
            this.tweens.add({targets:spike,x:x+Math.cos(a)*r*1.1,y:y+Math.sin(a)*r*.77,alpha:0,duration:300,ease:'Quad.Out',onComplete:()=>spike.destroy()});
          }
          if(!reduced && Math.hypot(this.run.player.position.x-x,this.run.player.position.y-y)<r+30)this.cameras.main.shake(140,.003);
        }
        graphics.fillStyle(0x6a2a8a,.45*fade).fillCircle(x,y,r);
        graphics.lineStyle(3,0xdc75ff,.9*fade).strokeCircle(x,y,r);
        for(let i=0;i<10;i++){const a=i*Math.PI/5+zone.bornAt,d=r*(.25+.6*((i*37)%10)/10);
          graphics.lineStyle(2,0xf0b8ff,.85*fade).lineBetween(x+Math.cos(a)*d,y+Math.sin(a)*d*.7,x+Math.cos(a)*d,y+Math.sin(a)*d*.7-9);}
      }
    }
    for(const wall of this.run.enemyCombat.walls){
      const shape=wallObject(wall),pts=(shape.shape as {points:{x:number;y:number}[]}).points.map(q=>({x:q.x+shape.x,y:q.y+shape.y}));
      if(now<wall.activeAt){
        // In flight: arc outline on the landing line, bristles arcing in from the caterpillar.
        const t=Math.min(1,(now-wall.bornAt)/Math.max(.01,wall.activeAt-wall.bornAt));
        graphics.fillStyle(0xb8e85a,.1+.2*t).fillPoints(pts,true);
        graphics.lineStyle(2,0xd8ff7a,.9).strokePoints(pts,true);
        const base=Math.atan2(wall.facing.y,wall.facing.x);
        for(let i=0;i<4;i++){
          const a=base-wall.halfAngle+2*wall.halfAngle*i/3,end={x:wall.center.x+Math.cos(a)*wall.radius,y:wall.center.y+Math.sin(a)*wall.radius};
          const k=Math.min(1,t*1.05+i*.02),px=wall.origin.x+(end.x-wall.origin.x)*k,py=wall.origin.y+(end.y-wall.origin.y)*k-Math.sin(Math.PI*k)*55;
          const dx=end.x-wall.origin.x,dy=end.y-wall.origin.y,len=Math.hypot(dx,dy)||1;
          shots.lineStyle(4,0x1a1410,.6).lineBetween(px-dx/len*14,py-dy/len*14,px,py);
          shots.lineStyle(3,0xe0ff6a,1).lineBetween(px-dx/len*14,py-dy/len*14,px,py);
        }
        continue;
      }
      const fade=Math.min(1,(wall.expiresAt-now)/.5),solid=wall.object?1:.45;
      graphics.fillStyle(0x4f6b14,.85*fade*solid).fillPoints(pts,true);
      graphics.lineStyle(2,0xd8ff7a,.9*fade*solid).strokePoints(pts,true);
      const base=Math.atan2(wall.facing.y,wall.facing.x),outer=wall.radius+wall.thickness/2;
      for(let i=0;i<=10;i++){
        const a=base-wall.halfAngle+2*wall.halfAngle*i/10,c=Math.cos(a),n=Math.sin(a);
        const bx=wall.center.x+c*outer,by=wall.center.y+n*outer,h=11+4*((i*7)%3);
        graphics.fillStyle(i%2?0xe9ff9a:0xb6e04a,.95*fade*solid).fillTriangle(bx-n*4,by+c*4,bx+n*4,by-c*4,bx+c*h,by+n*h-h*.6);
      }
    }
    for(const state of this.run.enemyCombat.controllers){
      const dive=state.dive,body=dive && this.sandboxDummies.find(b=>b.id===state.id);
      if(!dive || !body || dive.pauseUntil!==undefined)continue;
      const k=Math.min(1,(now-dive.startedAt)/Math.max(.01,dive.landsAt-dive.startedAt)),r=state.settings.dive!.radius;
      const pulse=reduced?0:.15*Math.sin(now*20);
      graphics.fillStyle(0xff5a3a,.12+.3*k).fillCircle(dive.to.x,dive.to.y,r*k);
      graphics.lineStyle(3,0xff6a4a,.75+pulse).strokeCircle(dive.to.x,dive.to.y,r);
      const lift=Math.sin(k*Math.PI);
      graphics.fillStyle(0x10140c,.35*(1-.5*lift)).fillEllipse(body.position.x,body.position.y,44*(1-.4*lift),14*(1-.4*lift));
    }
  }

  private currentView() {
    const c=this.cameras.main,width=c.width/c.zoom,height=c.height/c.zoom;
    return {x:c.scrollX+(c.width-width)/2,y:c.scrollY+(c.height-height)/2,width,height};
  }
  private showCastResult(skill:string,result:CastResult) {
    const reasons={dead:'Đã gục',cooldown:'Đang hồi chiêu',mp:'Không đủ MP',target:'Mục tiêu không hợp lệ',busy:'Q đang thi triển'};
    this.castFeedback=result.ok?`${skill} đã dùng`:`${skill}: ${reasons[result.reason]}`;
    this.hud?.showFeedback(this.castFeedback);
    this.game.canvas.dataset.castFeedback=this.castFeedback;
  }
  private handleWaterEvents() {
    const mage=this.run.character;if(!mage)return;
    for(const event of drainWaterEvents(mage)){
      if(event.kind==='q-start'){
        const point=event.cast.position;
        if(event.cast.flightSeconds){
          this.waterUltimateEffects?.launch(event.cast,event.cast.ultimateId && event.cast.secondary
            ?{x:point.x+Math.cos(event.cast.id*Math.PI/4)*120,y:point.y-160}:this.qStaffOrigin(),event.at);continue;
        }
        if(event.cast.execution==='original'){
          this.qFacingLeft=point.x<this.run.player.position.x;
          this.game.canvas.dataset.qTargetX=String(point.x);this.game.canvas.dataset.qTargetY=String(point.y);
          stopWaterCannon(mage.basicAttack);this.waterChargeEffect?.hide();
          this.tweens.killTweensOf(this.character);this.character.setPosition(0,0);this.firingVisualRemaining=0;
          this.dragonPreview?.destroy();this.dragonPreview=event.cast.prison || event.cast.humanPayload
            ?new WaterPrisonDelivery(this,this.qStaffOrigin(),point,event.cast.impactAt-event.at,event.cast.radius!,'staff')
            :new WaterDragonPreview(this,this.qStaffOrigin(),point,event.cast.radius??WATER_MAGE_TUNING.q.radius,'staff',event.cast.chargeMultiplier??1);
          this.dragonUpdatedAt=event.at;
          this.castStartRemaining=DRAGON_PREVIEW.swing;
        }else{
          const origin=waterMirrorOrigin(this.run.player.position,this.aim.x);
          this.waterSupport?.flashCopy(origin,event.at,mage.waterSkills.mirrors.count);
          this.copyDragons.push({origin,effect:event.cast.prison || event.cast.humanPayload
            ?new WaterPrisonDelivery(this,origin,point,event.cast.impactAt-event.at,event.cast.radius!,'mirror')
            :new WaterDragonPreview(this,origin,point,event.cast.radius??WATER_MAGE_TUNING.q.radius,'mirror'),updatedAt:event.at});
          this.game.canvas.dataset.qCopyOriginX=String(origin.x);this.game.canvas.dataset.qCopyOriginY=String(origin.y);
        }
      }else if(event.kind==='ultimate-start'){
        this.dragonPreview?.destroy();this.dragonPreview=undefined;this.hud?.showFeedback(event.ultimate.kind==='descent'?'Thủy Long Giáng Thế · nhấn Q tối đa 10 lần trong 5s':'Bát Đại Hải Long · 8 rồng đang tụ');
      }else if(event.kind==='ultimate-impact')this.waterUltimateEffects?.impact(event.ultimate.position,event.ultimate.radius,event.at);
      else if(event.kind==='prison-erupt')this.waterPrison?.erupt(event.cast,event.at);
      else if(event.kind==='damage'){
        if(event.damage.hit)this.lastEnemyHitId=event.targetId;
        this.lastDamage=event.damage.appliedDamage;this.game.canvas.dataset.lastDamage=String(this.lastDamage);
        const target=this.run.combatBodies.find(body=>body.id===event.targetId);
        if(target && event.damage.hit){const center=bodyCenter(target);
          this.waterSupport?.damageResponse(target.id,target.position,event.at,event.damage.absorbedDamage>0,
            {x:this.run.player.position.x-center.x,y:this.run.player.position.y-center.y},target.hitbox);}
        if(target){const label=this.add.text(target.position.x,target.position.y-35,`${event.execution==='copy'?'COPY ':''}${this.lastDamage.toFixed(2)}`,
          {fontSize:'16px',color:'#ffffff',backgroundColor:'#172129'}).setOrigin(.5).setDepth(1002);
          this.tweens.add({targets:label,y:label.y-25,alpha:0,duration:800,onComplete:()=>label.destroy()});}
      }else if(event.kind==='shield' && event.execution==='copy'){
        const targets=event.grants.flatMap(grant=>{
          if(grant.targetId===mage.id)return [{id:mage.id,position:this.run.player.position}];
          const body=this.run.combatBodies.find(body=>body.id===grant.targetId && validBody(body));
          return body?[{id:body.id,position:body.position}]:[];
        });
        const origin=waterMirrorOrigin(this.run.player.position,this.aim.x);
        this.waterSupport?.flashCopy(origin,event.at,mage.waterSkills.mirrors.count);
        this.waterSupport?.copyShield(origin,targets,event.at);
        this.game.canvas.dataset.eCopyOriginX=String(origin.x);this.game.canvas.dataset.eCopyOriginY=String(origin.y);
      }else if(event.kind==='e-support'){
        // Apply the confirmed tether before processing the subsequent swamp-start event.
        this.waterSupport?.update(mage,this.run.player.position,this.run.combatBodies,event.at,this.aim.x);
        this.game.canvas.dataset.eSupportTarget=event.targetId;
      }else if(event.kind==='ready-heal'){
        const p=this.run.player.position,label=this.add.text(p.x,p.y-70,`+${Math.round(event.amount)} HP`,
          {fontSize:'15px',fontStyle:'bold',color:'#8dffb0',backgroundColor:'#0f2a1a',padding:{x:4,y:1}}).setOrigin(.5).setDepth(1002);
        this.tweens.add({targets:label,y:label.y-26,alpha:0,duration:900,onComplete:()=>label.destroy()});
      }else if(event.kind==='swamp-roar')this.waterSwamp?.roar(event.position,event.radius,event.at);
      else if(event.kind==='swamp-start' && event.execution==='copy'){
        const origin=waterMirrorOrigin(this.run.player.position,this.aim.x);
        this.waterSupport?.flashCopy(origin,event.at,mage.waterSkills.mirrors.count);this.waterSwamp?.launchCopy(origin,event.position,event.at);
      }
      else if(event.kind==='fizzle')this.castFeedback='E sao chép: mục tiêu mất hợp lệ';
    }
  }
  private sandboxHit(targetId:string) {
    const enemy=this.sandboxDummies.find(dummy=>dummy.actor.team==='enemy'),mage=this.run.character;
    const target=targetId===mage?.id?mage:this.sandboxDummies.find(dummy=>dummy.id===targetId)?.actor;
    if(!enemy || !target || !mage)return;
    const guarded=hasWaterGuard(target,this.run.time);
    const result=resolveDamage({source:enemy.actor,target,element:'water',rawDamage:40,canCrit:false,targetPolicy:'ENEMY',
      hit:{kind:'hitbox',sourceId:enemy.id,targetId:target.id}},{random:Math.random,now:this.run.time});
    const position=target.id===mage.id?this.run.player.position:this.sandboxDummies.find(dummy=>dummy.id===target.id)!.position;
    const targetBody=this.sandboxDummies.find(dummy=>dummy.id===target.id);
    const box=targetBody?.hitbox??this.run.player.hitbox;
    const center=bodyCenter({position,radius:MOVEMENT_PREVIEW.radius,hitbox:box}),source=bodyCenter(enemy);
    if(result.hit)this.waterSupport?.damageResponse(target.id,position,this.run.time,guarded,{x:source.x-center.x,y:source.y-center.y},box);
    this.castFeedback=`Thử hit: khiên -${result.absorbedDamage.toFixed(2)}, HP -${result.appliedDamage.toFixed(2)}`;
    this.hud?.showFeedback(this.castFeedback);
  }
  private drawWaterEffects() {
    const mage=this.run.character;if(!mage)return;
    const point=this.run.player.position,now=this.run.time;
    const shieldSelf=totalShield(mage,now);
    this.waterSupport?.update(mage,point,this.run.combatBodies,now,this.aim.x);
    this.waterSwamp?.update(mage,now);
    this.waterPrison?.update(mage,this.run.combatBodies,now);
    this.waterUltimateEffects?.update(mage,this.qStaffOrigin(),now);
    this.game.canvas.dataset.waterUltimate=JSON.stringify(mage.waterSkills.ultimate??null);
    this.game.canvas.dataset.waterPrisons=JSON.stringify(mage.waterSkills.prisons.map(p=>({id:p.cast.id,position:p.cast.position,radius:p.cast.radius,expiresAt:p.expiresAt,erupted:p.erupted,execution:p.cast.execution})));
    if(this.ePlacement){
      if(mage.resources.currentHp<=0 || mage.mach!==4)this.cancelEPlacement();
      else {const pointer=this.input.activePointer,p=this.cameras.main.getWorldPoint(pointer.x,pointer.y);this.ePlacement.setPosition(p.x,p.y);}
    }
    this.game.canvas.dataset.ePlacement=String(!!this.ePlacement);
    this.game.canvas.dataset.waterSwamp=JSON.stringify(mage.waterSkills.swamp??null);
    this.game.canvas.dataset.waterSwampCopies=String(mage.waterSkills.copiedSwamps.length);
    const data=this.game.canvas.dataset;
    data.castFeedback=this.castFeedback;
    data.mach=String(mage.mach);data.mirrors=String(mage.waterSkills.mirrors.count);data.waterLinks=String(mage.waterSkills.links.length);
    data.shieldSelf=String(shieldSelf);data.temporarySpirit=String(mage.temporarySpirit);data.mp=String(mage.resources.currentMp);
    data.pendingCopies=String(mage.waterSkills.scheduled.filter(event=>event.kind==='copy-q'||event.kind==='copy-e'||event.kind==='copy-swamp').length);
    data.eCopyFlights=String(this.waterSupport?.shieldCopyFlightCount ?? 0);
    data.mirrorFlash=String(this.waterSupport?.copyFlashing ?? false);
  }

  private qStaffOrigin() {
    return {x:this.run.player.position.x+VISUAL.castMuzzleRight.x*(this.qFacingLeft?-1:1),
      y:this.run.player.position.y+VISUAL.castMuzzleRight.y};
  }

  private drawLabObjects(zone: Zone) {
    const graphics = this.add.graphics().setDepth(900);
    for (const object of zone.objects) {
      if (object.kind !== 'obstacle') {
        this.add.circle(object.x, object.y, 12, object.kind === 'enemy' ? 0xf4b357 : 0xcab1ff).setDepth(object.y);
        this.add.text(object.x, object.y - 22, object.name, { fontSize: '12px', color: '#ffffff', backgroundColor: '#172129' }).setOrigin(0.5).setDepth(901);
        continue;
      }
      graphics.lineStyle(2, 0xff8585).fillStyle(0xff8585, 0.2);
      const shape = object.shape!;
      if (shape.type === 'rect') graphics.fillRect(object.x, object.y, shape.width, shape.height).strokeRect(object.x, object.y, shape.width, shape.height);
      else if (shape.type === 'circle') graphics.fillCircle(object.x, object.y, shape.radius).strokeCircle(object.x, object.y, shape.radius);
      else { const points = shape.points.map(p => ({ x: p.x + object.x, y: p.y + object.y })); graphics.fillPoints(points, true).strokePoints(points, true); }
    }
    if (zone.exit) this.add.circle(zone.exit.x, zone.exit.y, 18, 0xa7efb9, 0.6).setDepth(900);
  }

  private createWorldArtwork() {
    if(this.stageRun){this.stageMap=this.add.image(0,0,'khang-stage-map-1').setOrigin(0,0).setDisplaySize(WORLD_WIDTH,WORLD_HEIGHT).setDepth(-100);return;}
    if (this.textures.exists(MAP_TEXTURE)) {
      const source = this.textures.get(MAP_TEXTURE).getSourceImage();
      if(KHANG_CHIEN_MAP){
        this.add.image(0,0,MAP_TEXTURE).setOrigin(0,0).setDisplaySize(WORLD_WIDTH,WORLD_HEIGHT).setDepth(-100);
        return;
      }
      const aspectError = Math.abs((source.width / source.height) / (WORLD_WIDTH / WORLD_HEIGHT) - 1);
      // Allow small export rounding differences, cropping excess instead of stretching.
      if (aspectError < MAP_ASPECT_RATIO_TOLERANCE) {
        const worldScale = Math.max(WORLD_WIDTH / source.width, WORLD_HEIGHT / source.height);
        this.add.image(0, 0, MAP_TEXTURE).setOrigin(0, 0)
          .setScale(worldScale)
          .setCrop(0, 0, WORLD_WIDTH / worldScale, WORLD_HEIGHT / worldScale)
          .setDepth(-100);
        return;
      }
      if (import.meta.env.DEV) {
        console.warn(`[MainScene] ${MAP_URL} must have aspect ratio 11:7 (e.g. 2200 × 1400). ` +
          'Incompatible artwork replaced with the world placeholder to avoid stretching.');
      }
    } else if (import.meta.env.DEV) {
      console.warn(`[MainScene] Missing ${MAP_URL}; showing a world placeholder until artwork is supplied.`);
    }

    // Single world-space placeholder, not a duplicate/cover backdrop. Replace with area artwork.
    const ground = this.add.graphics().setDepth(-100);
    ground.fillStyle(0x49633b).fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    ground.lineStyle(1, 0x729055, 0.35);
    for (let x = 0; x <= WORLD_WIDTH; x += 100) ground.lineBetween(x, 0, x, WORLD_HEIGHT);
    for (let y = 0; y <= WORLD_HEIGHT; y += 100) ground.lineBetween(0, y, WORLD_WIDTH, y);
  }

  private drawDebug() {
    if (!this.debugGraphics || !this.debugText) return;
    this.debugGraphics.clear().setVisible(this.debugEnabled);
    this.debugText.setVisible(this.debugEnabled);
    if (!this.debugEnabled) return;
    const camera = this.cameras.main;
    // worldView updates during render, after update(), so derive the current view here.
    const width = camera.width / camera.zoom;
    const height = camera.height / camera.zoom;
    const x = camera.scrollX + (camera.width - width) / 2;
    const y = camera.scrollY + (camera.height - height) / 2;
    this.debugGraphics.lineStyle(3 / camera.zoom, 0xffdc73)
      .strokeRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
      .lineStyle(2 / camera.zoom, 0x79d9ff)
      .strokeRect(x + 1, y + 1, width - 2, height - 2)
      .lineBetween(this.player.x - 20, this.player.y, this.player.x + 20, this.player.y)
      .lineBetween(this.player.x, this.player.y - 20, this.player.x, this.player.y + 20);
    this.debugGraphics.lineStyle(1/camera.zoom,0x76ffae);
    const playerBox=worldBodyBox({position:this.run.player.position,radius:MOVEMENT_PREVIEW.radius,hitbox:this.run.player.hitbox});
    if(playerBox)this.debugGraphics.strokeRect(playerBox.x,playerBox.y,playerBox.width,playerBox.height);
    for(const body of this.run.combatBodies){
      if(!validBody(body))continue;
      const box=worldBodyBox(body);
      if(box)this.debugGraphics.strokeRect(box.x,box.y,box.width,box.height);
      else this.debugGraphics.strokeCircle(body.position.x,body.position.y,body.radius);
    }
    this.debugGraphics.lineStyle(2/camera.zoom,0xffa54f);
    const footprint=movementBody({position:this.run.player.position,radius:MOVEMENT_PREVIEW.radius,hitbox:this.run.player.hitbox});
    this.debugGraphics.strokeCircle(footprint.position.x,footprint.position.y,footprint.radius);
    for(const body of this.run.combatBodies.filter(validBody)){
      const feet=movementBody(body);this.debugGraphics.strokeCircle(feet.position.x,feet.position.y,feet.radius);
    }
    if(this.stageRun)KHANG_CHIEN_ROADS.forEach((road,index)=>{
      const color=[0xffcf65,0xff8dcc,0xc9a5ff][index];this.debugGraphics!.lineStyle(2/camera.zoom,color,.85);
      road.points.forEach((point,i)=>{
        this.debugGraphics!.strokeCircle(point.x,point.y,i===0?18:7);
        if(i){const before=road.points[i-1];this.debugGraphics!.lineBetween(before.x,before.y,point.x,point.y);}
      });
    });
    this.debugText.setPosition(
      camera.width / 2 + (12 - camera.width / 2) / camera.zoom,
      camera.height / 2 + (180 - camera.height / 2) / camera.zoom,
    ).setScale(1 / camera.zoom).setText([
      'F3: debug | WASD / arrows: DEV player',
      'Xanh: nhận đòn | Cam: chặn chân',
      ...(this.stageRun?['Tuyến quái: Vàng Tây · Hồng Nam · Tím Đông Nam']:[]),
      `World: ${WORLD_WIDTH} × ${WORLD_HEIGHT}`,
      `Player: ${this.player.x.toFixed(1)}, ${this.player.y.toFixed(1)}`,
      `Scroll: ${camera.scrollX.toFixed(1)}, ${camera.scrollY.toFixed(1)}`,
      `View: ${width.toFixed(1)} × ${height.toFixed(1)} | zoom: ${camera.zoom.toFixed(4)}`,
    ]);
  }
}

