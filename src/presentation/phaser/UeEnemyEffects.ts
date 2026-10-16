import type Phaser from 'phaser';
import type { Point } from '../../world/definitions';
import type { RunState } from '../../run/Run';
import { wallObject, type EnemyWall, type EnemyAttackSettings } from '../../gameplay/enemies/EnemyCombat';
import { bodyCenter } from '../../world/bodyGeometry';

export interface UeImpact {position:Point;at:number;visual:EnemyAttackSettings['visual']}
const INK=0x171b18,BONE=0xe6d4ad,RUST=0xbc7c46,TAR=0x34332b;
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
function warning(g:Phaser.GameObjects.Graphics,p:Point,r:number,progress:number){
  g.fillStyle(INK,.23).fillCircle(p.x,p.y,r);
  g.fillStyle(RUST,.08+.13*progress).fillCircle(p.x,p.y,r*progress);
  g.lineStyle(5,INK,.85).strokeCircle(p.x,p.y,r);
  g.lineStyle(2,BONE,.9).strokeCircle(p.x,p.y,r);
  g.lineStyle(3,RUST,1).beginPath().arc(p.x,p.y,r,-Math.PI/2,-Math.PI/2+Math.PI*2*progress).strokePath();
  for(let i=0;i<4;i++){const a=i*Math.PI/2;g.lineStyle(2,BONE,.8).lineBetween(p.x+Math.cos(a)*(r-5),p.y+Math.sin(a)*(r-5),p.x+Math.cos(a)*(r+5),p.y+Math.sin(a)*(r+5));}
}
function corridor(g:Phaser.GameObjects.Graphics,o:Point,d:Point,reach:number,r:number,committed:boolean){
  const end={x:o.x+d.x*reach,y:o.y+d.y*reach},n={x:-d.y*r,y:d.x*r};
  const pts=[{x:o.x+n.x,y:o.y+n.y},{x:end.x+n.x,y:end.y+n.y},{x:end.x-n.x,y:end.y-n.y},{x:o.x-n.x,y:o.y-n.y}];
  g.fillStyle(RUST,committed?.18:.08).fillPoints(pts,true).fillCircle(end.x,end.y,r);
  g.lineStyle(4,INK,.8).lineBetween(o.x+n.x,o.y+n.y,end.x+n.x,end.y+n.y).lineBetween(o.x-n.x,o.y-n.y,end.x-n.x,end.y-n.y);
  g.lineStyle(committed?2:1,BONE,committed?1:.6).lineBetween(o.x+n.x,o.y+n.y,end.x+n.x,end.y+n.y).lineBetween(o.x-n.x,o.y-n.y,end.x-n.x,end.y-n.y);
  const tip={x:end.x-d.x*8,y:end.y-d.y*8};
  g.lineStyle(2,RUST,.9).lineBetween(tip.x-d.x*12-d.y*7,tip.y-d.y*12+d.x*7,tip.x,tip.y).lineBetween(tip.x,tip.y,tip.x-d.x*12+d.y*7,tip.y-d.y*12-d.x*7);
}
function quill(g:Phaser.GameObjects.Graphics,p:Point,d:Point,length:number,width:number,alpha=1){
  const a={x:p.x-d.x*length,y:p.y-d.y*length},tip={x:p.x+d.x*width,y:p.y+d.y*width};
  g.lineStyle(width+2,INK,alpha).lineBetween(a.x,a.y,tip.x,tip.y);
  g.lineStyle(width,RUST,alpha).lineBetween(a.x,a.y,p.x,p.y);
  g.fillStyle(BONE,alpha).fillTriangle(tip.x,tip.y,p.x-d.y*width,p.y+d.x*width,p.x+d.y*width,p.y-d.x*width);
}
function arcPoints(w:Pick<EnemyWall,'id'|'center'|'facing'|'radius'|'halfAngle'|'thickness'>){
  const shape=wallObject(w as EnemyWall);
  return (shape.shape as {points:Point[]}).points.map(p=>({x:p.x+shape.x,y:p.y+shape.y}));
}
/** All warning bounds use combat radii/polygons and the paused Run clock. No decorative hazard outside them. */
export function drawUeEnemyEffects(run:Pick<RunState,'time'|'enemyCombat'|'combatBodies'|'player'>,shots:Phaser.GameObjects.Graphics,ground:Phaser.GameObjects.Graphics,impacts:readonly UeImpact[],reduced:boolean){
  ground.clear();const now=run.time;
  for(const zone of run.enemyCombat.zones){
    const p=zone.position,r=zone.radius,fade=clamp((zone.expiresAt-now)/.6);
    if(now<zone.activeAt){warning(ground,p,r,clamp((now-zone.bornAt)/(zone.activeAt-zone.bornAt)));}
    else {
      ground.fillStyle(INK,.63*fade).fillCircle(p.x,p.y,r);
      ground.fillStyle(zone.kind==='bristle'?TAR:0x454a3c,.35*fade).fillCircle(p.x-r*.12,p.y-r*.1,r*.65);
      ground.lineStyle(2,zone.kind==='bristle'?BONE:0x9b9679,.78*fade).strokeCircle(p.x,p.y,r);
      ground.lineStyle(2,RUST,.7*fade).beginPath().arc(p.x,p.y,r-4,-Math.PI/2,-Math.PI/2+Math.PI*2*clamp((zone.expiresAt-now)/(zone.expiresAt-zone.activeAt))).strokePath();
      for(let i=0;i<6;i++){
        const a=i*Math.PI/3+zone.bornAt,d=r*(.28+.12*(i%3)),q={x:p.x+Math.cos(a)*d,y:p.y+Math.sin(a)*d};
        if(zone.kind==='bristle')quill(ground,{x:q.x,y:q.y-8},{x:.3,y:-.95},8,2,fade);
        else ground.lineStyle(1,0xb2aa86,.35*fade).strokeEllipse(q.x,q.y,7,3);
      }
      const age=now-zone.activeAt;
      if(!reduced && zone.kind==='bristle' && age<.24)shots.lineStyle(2,BONE,(1-age/.24)*.65).strokeCircle(p.x,p.y,r*(.6+.4*age/.24));
    }
    if(zone.origin && now<zone.activeAt){
      const flight=run.enemyCombat.controllers.find(c=>c.id===zone.ownerId)?.settings.zoneShot?.flightSeconds??.9;
      const k=clamp((now-zone.bornAt)/flight),dx=p.x-zone.origin.x,dy=p.y-zone.origin.y,len=Math.hypot(dx,dy)||1;
      if(k<1)for(let i=-1;i<=1;i++)quill(shots,{x:zone.origin.x+dx*k-dy/len*i*8,y:zone.origin.y+dy*k-Math.sin(Math.PI*k)*(reduced?0:48)+dx/len*i*8},{x:dx/len,y:dy/len},12,2);
    }
  }
  for(const w of run.enemyCombat.walls){
    const pts=arcPoints(w),pending=now<w.activeAt,progress=clamp((now-w.bornAt)/(w.activeAt-w.bornAt));
    const alpha=pending?.45+.4*progress:clamp((w.expiresAt-now)/.6)*(w.object?1:.45);
    ground.fillStyle(pending?RUST:INK,(pending?.12:.8)*alpha).fillPoints(pts,true);
    ground.lineStyle(4,INK,alpha).strokePoints(pts,true).lineStyle(2,pending?BONE:RUST,alpha).strokePoints(pts,true);
    const base=Math.atan2(w.facing.y,w.facing.x);
    for(let i=0;i<=8;i++){
      const a=base-w.halfAngle+2*w.halfAngle*i/8,end={x:w.center.x+Math.cos(a)*w.radius,y:w.center.y+Math.sin(a)*w.radius};
      if(pending){
        const k=clamp((now-w.bornAt)/(run.enemyCombat.controllers.find(c=>c.id===w.ownerId)?.settings.wallShot?.flightSeconds??.6));
        if(k<1 && i%2===0)quill(shots,{x:w.origin.x+(end.x-w.origin.x)*k,y:w.origin.y+(end.y-w.origin.y)*k-Math.sin(Math.PI*k)*(reduced?0:40)},{x:Math.cos(a),y:Math.sin(a)},10,2,alpha);
      }else quill(ground,{x:end.x,y:end.y-7},{x:Math.cos(a)*.25,y:-.96},12,3,alpha);
    }
  }
  for(const state of run.enemyCombat.controllers){
    const body=run.combatBodies.find(b=>b.id===state.id);if(!body || body.actor.resources.currentHp<=0)continue;
    const boss=state.boss;
    if(boss){
      const progress=clamp((now-boss.startedAt)/(boss.endsAt-boss.startedAt));
      if(boss.phase==='underground' && boss.emergeAt)warning(ground,boss.emergeAt,state.settings.meleeHitRadius,progress);
      if((boss.phase==='jump-warning'||boss.phase==='jump') && boss.jumpTarget)warning(ground,boss.jumpTarget,state.settings.meleeHitRadius,boss.phase==='jump-warning'?progress*.45:.45+progress*.55);
      if(boss.phase==='roll-warning')corridor(ground,bodyCenter(body),boss.direction,state.settings.bossCycle!.rollSpeed*state.settings.bossCycle!.rollSeconds,state.settings.meleeHitRadius,true);
      if(boss.phase==='landing-pause' && !reduced){const age=now-boss.startedAt;if(age<.3)shots.lineStyle(2,RUST,(1-age/.3)*.8).strokeCircle(body.position.x,body.position.y,state.settings.meleeHitRadius*(.7+age));}
      continue;
    }
    if(state.dive){
      if(state.dive.pauseUntil===undefined)warning(ground,state.dive.to,state.settings.dive!.radius,clamp((now-state.dive.startedAt)/(state.dive.landsAt-state.dive.startedAt)));
      else if(!reduced && now-state.dive.landsAt<.3)shots.lineStyle(2,RUST,1-(now-state.dive.landsAt)/.3).strokeCircle(body.position.x,body.position.y,state.settings.dive!.radius);
      continue;
    }
    if(state.phase!=='windup' || !state.origin || !state.aim)continue;
    const o=state.origin,a=state.aim,angle=Math.atan2(a.y-o.y,a.x-o.x),d={x:Math.cos(angle),y:Math.sin(angle)};
    const progress=clamp(1-(state.phaseEndsAt-now)/(state.counter?state.settings.displacedCounter!.delay:state.settings.windup));
    // Windup markers remain modest. Committed attacks acquire a solid pale rim.
    ground.lineStyle(4,INK,.8).strokeEllipse(body.position.x,body.position.y,40,14);
    ground.lineStyle(2,state.aimLocked?BONE:RUST,.65+.3*progress).strokeEllipse(body.position.x,body.position.y,40,14);
    if(state.ability==='charge')corridor(ground,o,d,state.lungeRange??state.settings.attackRange,state.settings.meleeHitRadius,state.counter?!!state.aimLocked:true);
    else if(state.ability==='dive'){
      // Before takeoff the final spot is chosen at release; the ring on the creature announces a leap.
      ground.lineStyle(2,BONE,.6).lineBetween(body.position.x-8,body.position.y-5,body.position.x,body.position.y-14).lineBetween(body.position.x,body.position.y-14,body.position.x+8,body.position.y-5);
    }else if(state.ability==='zone' && state.settings.zoneShot){
      const z=state.settings.zoneShot,v=run.enemyCombat.playerTrack?.velocity??{x:0,y:0},p=run.player.position;
      const at={x:p.x+v.x*z.flightSeconds,y:p.y+v.y*z.flightSeconds},len=Math.hypot(at.x-o.x,at.y-o.y),limit=state.settings.projectileRange;
      if(len>limit){at.x=o.x+(at.x-o.x)/len*limit;at.y=o.y+(at.y-o.y)/len*limit;}
      // Thin preview distinguishes a prediction from the solid committed landing warning.
      ground.lineStyle(1,RUST,.55).strokeCircle(at.x,at.y,z.radius);
    }else if(state.ability==='wall' && state.settings.wallShot){
      const w=state.settings.wallShot,v=run.enemyCombat.playerTrack?.velocity??{x:0,y:0},p=run.player.position,speed=Math.hypot(v.x,v.y),len=Math.hypot(p.x-o.x,p.y-o.y)||1;
      const facing=speed>30?{x:v.x/speed,y:v.y/speed}:{x:(p.x-o.x)/len,y:(p.y-o.y)/len};
      const center=speed>30?{x:p.x+v.x*w.flightSeconds,y:p.y+v.y*w.flightSeconds}:{x:p.x-facing.x*w.radius,y:p.y-facing.y*w.radius};
      ground.lineStyle(1,RUST,.55).strokePoints(arcPoints({id:'preview',center,facing,...w}),true);
    }else {
      const spread=state.settings.spread??0,count=state.volleyCount??1,range=Math.min(340,state.settings.projectileRange);
      for(let i=0;i<count;i++){const offset=count===1?0:-spread/2+spread*i/(count-1),a2=angle+offset;
        ground.lineStyle(state.aimLocked?2:1,state.aimLocked?BONE:RUST,.45+.35*progress).lineBetween(o.x,o.y,o.x+Math.cos(a2)*range,o.y+Math.sin(a2)*range);}
    }
  }
  for(const shot of run.enemyCombat.shots){
    const {position:p,direction:d,radius:r}=shot.projectile;
    if(shot.visual==='thorn')quill(shots,p,d,Math.max(10,r*2.5),Math.max(2,r*.55));
    else {
      shots.fillStyle(INK,.45).fillCircle(p.x+2,p.y+3,r+1);
      shots.fillStyle(TAR,1).fillCircle(p.x,p.y,r);
      shots.lineStyle(1,shot.visual==='resin'?0xb5ad83:RUST,.9).strokeCircle(p.x,p.y,r);
      shots.fillStyle(shot.visual==='resin'?0xa7b5a2:0x9c8058,.75).fillEllipse(p.x-r*.25,p.y-r*.25,r*.65,r*.3);
      shots.lineStyle(Math.max(2,r*.45),TAR,.55).lineBetween(p.x-d.x*r*1.8,p.y-d.y*r*1.8,p.x,p.y);
    }
  }
  for(const impact of impacts){
    const k=clamp((now-impact.at)/.3),p=impact.position,color=impact.visual==='thorn'?BONE:0x9caa90;
    shots.lineStyle(2,color,(1-k)*.7).strokeEllipse(p.x,p.y,12+24*k,8+12*k);
    if(!reduced)for(let i=0;i<4;i++){const a=i*Math.PI/2+.4;shots.fillStyle(color,(1-k)*.7).fillCircle(p.x+Math.cos(a)*(5+12*k),p.y+Math.sin(a)*(5+8*k)-6*k,2*(1-k));}
  }
}
