const {test}=require('node:test');
const assert=require('node:assert/strict');
const load=require('./load-ts.cjs')();
const {waterMageHudModel,waterMageHudVisuals,SKILL_ART,SPECIAL_STATE_FRAME}=load('src/presentation/hud/waterMageHudModel.ts');
const {createMage,setMageTemporarySpirit,allocateMagePotential}=load('src/gameplay/characters/jobs/mage/MageRuntime.ts');
const {grantPotential}=load('src/gameplay/characters/core/Potential.ts');
const {AssetLoadGuard}=load('src/presentation/phaser/AssetLoadGuard.ts');
const {EventEmitter}=require('node:events');
const {enemyHudModel,enemyHudTarget,ELEMENT_PRESENTATION}=load('src/presentation/hud/enemyHudModel.ts');

test('touch joystick releases on cancel; skill fingers aim independently and finale exposes combo',()=>{
 const fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
 const element=()=>({style:{},classList:{add(){},remove(){},toggle(){}},children:[],hidden:false,
  append(...items){this.children.push(...items);},setAttribute(){},setPointerCapture(){},
  getBoundingClientRect(){return {left:0,top:0,width:112,height:112};},addEventListener(){},remove(){this.removed=true;}});
 const listeners=new Map(),mod={exports:{}};
 const code=ts.transpileModule(fs.readFileSync('src/presentation/hud/TouchControls.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 vm.runInNewContext(code,{exports:mod.exports,require:path=>path.includes('waterMageHudModel')?{waterMageHudModel}:{},document:{createElement:element},
  window:{addEventListener:(key,fn)=>listeners.set(key,fn),removeEventListener:key=>listeners.delete(key)}});
 const calls=[],parent=element(),controls=new mod.exports.TouchControls(parent,(key,aim)=>calls.push({key,aim}));
 const stick=controls.root.children.find(el=>el.className==='touch-stick'),buttons=controls.root.children.find(el=>el.className==='touch-actions').children;
 const pointer=(id,x,y)=>({pointerId:id,clientX:x,clientY:y,preventDefault(){}});
 controls.update('combat',false);stick.onpointerdown(pointer(1,96,56));assert.equal(controls.move.x,1);
 buttons[1].onpointerdown(pointer(2,0,0));buttons[1].onpointerup(pointer(2,0,-40));
 assert.equal(calls[0].key,'q');assert.equal(calls[0].aim.y,-1);assert.equal(controls.move.x,1);
 stick.onpointercancel(pointer(1,96,56));assert.equal(controls.move.x,0);
 controls.update('bomb',false);assert.equal(buttons[4].hidden,false);assert.equal(buttons[0].disabled,true);
 buttons[4].onpointerdown(pointer(3,0,0));buttons[4].onpointerup(pointer(3,0,0));assert.equal(calls[1].key,'combo');
 controls.update('sacrifice',false);assert.equal(buttons[1].disabled,false);assert.equal(buttons[2].disabled,true);
 controls.update('combat',true);assert.equal(controls.root.hidden,true);
 controls.update('combat',false,undefined,0,{movementOnly:true,combo:false});
 assert.equal(stick.hidden,false);assert.equal(buttons.every(b=>b.disabled),true);
 assert.equal(controls.root.children.find(el=>el.className==='touch-actions').hidden,true);
 controls.update('combat',false,undefined,0,{basicOnly:true,combo:false});assert.equal(buttons[0].disabled,false);assert.equal(buttons[1].disabled,true);
 controls.update('combat',false,undefined,0,{combo:true});assert.equal(buttons[4].disabled,false);assert.equal(buttons[1].disabled,false);
 assert.equal(controls.root.children.find(el=>el.className==='touch-actions').hidden,false);
 const mage=createMage('touch-cd','player','water',150);mage.waterSkills.cooldowns.q=3;mage.basicAttack.recoveryRemaining=2;
 controls.update('combat',false,mage,0);assert.equal(buttons[1].children[0].textContent,'3,0s');assert.equal(buttons[0].children[0].textContent,'2,0s');
 controls.update('combat',false,mage,4);assert.equal(buttons[1].children[0].textContent,'');
 controls.update('sacrifice',false,mage,4);assert.equal(buttons[1].children[0].textContent,'');
 controls.destroy();assert.equal(listeners.has('blur'),false);assert.equal(controls.root.removed,true);
});

test('Stage finale Q HUD overrides empty MP and normal cooldown only for the active encounter snapshot',()=>{
 const mage=createMage('finale-hud','player','water',150);mage.resources.currentMp=0;mage.waterSkills.cooldowns.q=999;
 const view={count:3,max:10,remaining:4,forming:false,paused:false},before=JSON.stringify(mage);
 assert.equal(waterMageHudModel(mage,0,view).skillStatus('q'),'3/10 Q');
 assert.equal(waterMageHudModel(mage,0,{...view,forming:true}).skillStatus('q'),'Tụ cầu');
 assert.equal(waterMageHudModel(mage,0,{...view,paused:true}).skillStatus('q'),'Tạm dừng');
 assert.equal(waterMageHudModel(mage,0,{...view,count:10}).skillStatus('q'),'Đủ rồng');
 assert.equal(waterMageHudModel(mage,0,{...view,remaining:0}).skillStatus('q'),'Giáng Thế');
 assert.notEqual(waterMageHudModel(mage,0).skillStatus('q'),'3/10 Q');
 const info=load('src/presentation/hud/waterMageHudModel.ts').waterMageSkillInfo(mage,'q',view);
 assert.equal(info.name,'Thủy Long Giáng Thế');assert.match(info.rules.join(' '),/Không tốn MP/);
 assert.equal(JSON.stringify(mage),before);
});

test('DEV AI action keeps the menu open and releases keyboard focus on both stop and resume',()=>{
 let document;
 class Element {
  constructor(tag){this.tag=tag;this.children=[];this.listeners={};this.open=false;}
  append(...nodes){this.children.push(...nodes);}
  setAttribute(){}
  addEventListener(name,fn){this.listeners[name]=fn;}
  contains(node){return this===node || this.children.some(child=>child.contains(node));}
  blur(){document.activeElement=null;}
  remove(){}
 }
 document={body:new Element('body'),activeElement:null,createElement:tag=>new Element(tag)};
 const uiLoad=require('./load-ts.cjs')({document,HTMLElement:Element,URL,URLSearchParams,
  location:{search:'?sandbox=1',href:'http://localhost/?sandbox=1'}});
 let blocked=false,enabled=true;
 const remove=uiLoad('src/dev/sandbox/DevMenu.ts').mountDevMenu(action=>{
  if(action==='toggle-monster-ai')enabled=!enabled;
 },{onOpenChange:open=>{blocked=open;}});
 const menu=document.body.children[0],button=menu.children[1].children.find(el=>el.textContent==='Dừng / chạy AI quái');
 for(const expected of [false,true]){
  menu.open=true;menu.listeners.toggle();assert.equal(blocked,true);document.activeElement=button;
  button.listeners.click();assert.equal(enabled,expected);assert.equal(menu.open,true);
  assert.equal(blocked,false);assert.equal(document.activeElement,null);
  let stopped=false;menu.listeners.keydown({key:'w',stopPropagation(){stopped=true;}});assert.equal(stopped,true);
  menu.open=false;menu.listeners.toggle();assert.equal(blocked,false);
 }
 menu.open=true;menu.listeners.toggle();document.activeElement=button;
 menu.listeners.keydown({key:'Escape',stopPropagation(){},preventDefault(){}});
 assert.equal(menu.open,false);assert.equal(blocked,false);assert.equal(document.activeElement,null);
 remove();
});

test('optional map fallback remains available while required texture failures block scene boot',()=>{
  const scene={load:new EventEmitter(),events:new EventEmitter()};
  const guard=new AssetLoadGuard(scene,['map']);
  scene.load.emit('loaderror',{key:'map',url:'/map.png'});assert.equal(guard.failed,false);
  scene.load.emit('loaderror',{key:'mage-idle-down',url:'/idle.png'});assert.equal(guard.failed,true);
  scene.load.emit('complete');assert.equal(scene.load.listenerCount('loaderror'),0);
  scene.events.emit('shutdown');
});
test('leaving during preload detaches error handling instead of leaking across scene starts',()=>{
  const scene={load:new EventEmitter(),events:new EventEmitter()};
  const guard=new AssetLoadGuard(scene);
  assert.equal(scene.load.listenerCount('loaderror'),1);
  scene.events.emit('shutdown');assert.equal(scene.load.listenerCount('loaderror'),0);
  assert.equal(scene.load.listenerCount('complete'),0);
  scene.load.emit('loaderror',{key:'later',url:'/later.png'});assert.equal(guard.failed,false);
});

test('HUD observes shield layers without removing expired combat data or merging expiry',()=>{
  const mage=createMage('hud','player','water',150);
  mage.shields=[{id:'old',sourceId:'a',skillId:'water-e',amount:10,expiresAt:1},
    {id:'e',sourceId:'a',skillId:'water-e',amount:32,expiresAt:8},
    {id:'other',sourceId:'b',skillId:'other',amount:50,expiresAt:10}];
  const before=JSON.stringify(mage);
  const model=waterMageHudModel(mage,2);
  assert.equal(model.shield,82);assert.deepEqual(model.shieldLayers.map(s=>s.expiresAt),[8,10]);
  assert.equal(JSON.stringify(mage),before);
});
test('HUD follows derived stats and keeps R duration separate from cooldown and queued copies',()=>{
  const mage=createMage('hud','player','water',150);
  mage.progression.potential=grantPotential(mage.progression.potential,2);
  allocateMagePotential(mage,'spirit',2);setMageTemporarySpirit(mage,5);
  mage.waterSkills.mirrors={count:2,expiresAt:12};mage.waterSkills.cooldowns.r=4;
  mage.waterSkills.scheduled=[{kind:'copy-e',dueAt:13,grants:[]}];
  const model=waterMageHudModel(mage,5);
  assert.equal(mage.stats.maxMp,188);assert.equal(model.rate,.3188);
  assert.equal(model.skillStatus('r'),'Sẵn sàng');assert.equal(model.mirrors,2);assert.equal(model.mirrorRemaining,7);
  const expired=waterMageHudModel(mage,12);
  assert.equal(expired.mirrors,0);assert.equal(expired.pendingCopies,1);
});
test('HUD distinguishes READY from empty mana and displays real death rather than cast availability',()=>{
  const mage=createMage('hud','player','water',150);mage.mach=4;mage.resources.currentMp=0;
  assert.equal(waterMageHudModel(mage,0).skillStatus('passive'),'READY');
  assert.equal(waterMageHudModel(mage,0).skillStatus('e'),'Thiếu MP');
  mage.resources.currentHp=0;
  assert.equal(waterMageHudModel(mage,0).skillStatus('e'),'Đã gục');
});

test('new HUD artwork exists and replaces every old skill icon',()=>{
 const fs=require('node:fs'),path=require('node:path');
 for(const asset of ['passive','basic','q','e','r'].map(key=>SKILL_ART(key)).concat(SKILL_ART('e',true),SPECIAL_STATE_FRAME)) {
  assert.ok(asset.startsWith('/assets/hud-water-v2/'));
  assert.ok(fs.existsSync(path.join('public',asset)));
 }
});

test('special frames follow full charge and bounded Mạch independently from E eligibility',()=>{
 const mage=createMage('hud','player','water',150);
 for(let points=0;points<=4;points++) {
  mage.mach=points;
  assert.equal(waterMageHudVisuals(mage,0).machStage,points);
  assert.equal(waterMageHudVisuals(mage,0).machReady,points===4);
 }
 mage.basicAttack.phase='charging';assert.equal(waterMageHudVisuals(mage,0).fullCharge,false);
 mage.basicAttack.phase='full_charge';assert.equal(waterMageHudVisuals(mage,0).fullCharge,true);
 assert.equal(waterMageHudVisuals(mage,0).empoweredE,false);
 mage.resources.currentHp=0;assert.equal(waterMageHudVisuals(mage,0).fullCharge,false);
});

test('E artwork only switches for unlocked Long Mạch with READY, MP and cooldown satisfied',()=>{
 const {grantMageExperience,chooseMageEvolution}=load('src/gameplay/characters/jobs/mage/MageRuntime.ts');
 const {experienceRequired}=load('src/gameplay/progression/Level.ts');
 const mage=createMage('hud','player','water',150);
 while(mage.progression.level<7)grantMageExperience(mage,experienceRequired(mage.progression.level));
 chooseMageEvolution(mage,5,'core-long');chooseMageEvolution(mage,7,'b1-7');mage.mach=4;
 const before=JSON.stringify(mage);
 assert.equal(waterMageHudVisuals(mage,0).empoweredE,true);assert.equal(JSON.stringify(mage),before);
 mage.waterSkills.cooldowns.e=1;assert.equal(waterMageHudVisuals(mage,0).empoweredE,false);
 assert.equal(waterMageHudVisuals(mage,1).empoweredE,true);
 mage.resources.currentMp=14;assert.equal(waterMageHudVisuals(mage,1).empoweredE,false);
 mage.resources.currentMp=15;mage.mach=3;assert.equal(waterMageHudVisuals(mage,1).empoweredE,false);
 mage.mach=4;mage.waterSkills.swamp={id:1,position:{x:0,y:0},expiresAt:5};
 assert.equal(waterMageHudVisuals(mage,1).empoweredE,false);
 assert.equal(waterMageHudModel(mage,1).skillStatus('e'),'Khóa hồi chiêu');
 assert.equal(waterMageHudModel(mage,1).skillStatus('passive'),'Khô Mạch');
 mage.waterSkills.swamp=undefined;
 mage.mach=4;mage.resources.currentHp=0;assert.equal(waterMageHudVisuals(mage,1).empoweredE,false);
});

test('enemy HUD selection respects hostility, visibility and explicit focus without changing combat',()=>{
 const body=(id,team,x,hp=100)=>({id,label:id,position:{x,y:50},radius:12,
  actor:{...createMage(id,team,'water',150),resources:{currentHp:hp,currentMp:160}}});
 const ally=body('a','player',10),near=body('n','enemy',50),far=body('f','enemy',90),hidden=body('h','enemy',150);
 const bodies=[ally,near,far,hidden],view={x:0,y:0,width:100,height:100},origin={x:0,y:50};
 const before=JSON.stringify(bodies);
 assert.equal(enemyHudTarget(bodies,'player',view,origin).id,'n');
 assert.equal(enemyHudTarget(bodies,'player',view,origin,'f','n').id,'f');
 assert.equal(enemyHudTarget(bodies,'player',view,origin,'h','f').id,'f');
 assert.equal(JSON.stringify(bodies),before);
 far.actor.resources.currentHp=0;assert.equal(enemyHudTarget(bodies,'player',view,origin,'f').id,'f');
 far.targetable=false;assert.equal(enemyHudTarget(bodies,'player',view,origin,'f').id,'n');
 assert.equal(enemyHudTarget([ally,hidden],'player',view,origin),undefined);
});

test('enemy HUD reads element, active slow, shields, recovery and threat without expiring state',()=>{
 const actor=createMage('e','enemy','fire',150);actor.resources.currentHp=80;
 actor.shields=[{id:'old',amount:10,expiresAt:1},{id:'live',amount:20,expiresAt:5}];
 actor.threat={points:new Map([['p',10]]),recovering:true,lastDamageAt:0,updatedAt:2};
 const body={id:'e',label:'Ốc sên',position:{x:20,y:30},radius:12,actor,
  slows:[{sourceId:'old',multiplier:.1,expiresAt:1},{sourceId:'live',multiplier:.7,expiresAt:5}]};
 const before=JSON.stringify(body),model=enemyHudModel(body,2,'p');
 assert.equal(model.element,'fire');assert.equal(ELEMENT_PRESENTATION[model.element].name,'Hỏa');
 assert.equal(model.playerThreat,10);assert.equal(model.hp,80);assert.equal(model.maxHp,140);
 assert.match(model.status,/Đang hồi máu/);assert.match(model.status,/Chậm 30%/);assert.match(model.status,/Khiên 20/);
 assert.equal(JSON.stringify(body),before);
 actor.resources.currentHp=0;assert.equal(enemyHudModel(body,2,'p').status,'Đã hạ gục');
 actor.resources.currentHp=80;actor.threat.recoveryMaxHpPerSecond=0;assert.doesNotMatch(enemyHudModel(body,2,'p').status,/Đang hồi máu/);
});

test('stage warning keeps keyboard enabled for Q/E ritual while cinematic movement stays blocked',()=>{
 const {stageKeyboardEnabled}=load('src/presentation/phaser/stageInputPolicy.ts');
 assert.equal(stageKeyboardEnabled(new Set(),undefined),true);
 for(const phase of ['bomb','sacrifice']){
  assert.equal(stageKeyboardEnabled(new Set(['stage']),phase),true);
  assert.equal(stageKeyboardEnabled(new Set(['stage','dev']),phase),false);
  assert.equal(stageKeyboardEnabled(new Set(['stage','character']),phase),false);
 }
 for(const phase of ['ready','arrival','barrier','complete','failed'])assert.equal(stageKeyboardEnabled(new Set(['stage']),phase),false);
});
