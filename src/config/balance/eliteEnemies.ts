import type { EnemyAttackSettings } from '../../gameplay/enemies/EnemyCombat';

// Playtest values only. Designer has not approved final balance or rewards.
const base:EnemyAttackSettings={kind:'ranged',visual:'thorn',pursuit:'relentless',detectionRange:500,leashRange:850,
  attackRange:260,windup:1,recovery:1,meleeHitRadius:28,projectileSpeed:190,projectileRadius:6,projectileRange:480};
export const ELITE_ENEMIES:Record<string,{rank:'elite'|'boss';hp:number;atk:number;speed:number;interval:number;radius:number;attack:EnemyAttackSettings}>={
  'elite-flat-fur-rat':{rank:'elite',hp:800,atk:16,speed:95,interval:3.2,radius:28,attack:{...base,kind:'melee',pattern:'charge',chargeSpeed:360,attackRange:200}},
  'elite-grasshopper':{rank:'elite',hp:700,atk:18,speed:85,interval:3.5,radius:26,attack:{...base,kind:'melee',pattern:'charge',chargeSpeed:480,attackRange:240,windup:1.1}},
  'elite-crop-snail':{rank:'elite',hp:1000,atk:12,speed:45,interval:3.8,radius:30,attack:{...base,visual:'slime',pattern:'fan',projectileCount:3,spread:.6}},
  'elite-caterpillar':{rank:'elite',hp:700,atk:12,speed:60,interval:3.4,radius:26,attack:{...base,pattern:'fan',projectileCount:5,spread:1}},
  'elite-black-caterpillar':{rank:'elite',hp:900,atk:14,speed:65,interval:4,radius:28,attack:{...base,pattern:'fan',projectileCount:7,spread:1.4,windup:1.2}},
  'elite-mutant-caterpillar':{rank:'elite',hp:900,atk:12,speed:65,interval:4,radius:28,attack:{...base,pattern:'radial',projectileCount:8,attackRange:180}},
  'boss-spiked-shell-beast':{rank:'boss',hp:6000,atk:24,speed:65,interval:4.5,radius:50,attack:{...base,kind:'ranged',pattern:'boss',projectileCount:7,spread:Math.PI*.75,attackRange:300,
    windup:1.4,recovery:1.4,meleeHitRadius:55,projectileRange:600,projectileRadius:10,
    bossCycle:{burrowSeconds:.6,undergroundSeconds:1.5,emergeSeconds:.3,volleyGap:2.5,jumpSeconds:.85,jumpRange:400,jumpDelay:.5,
      // Dash/roll run ~20% slower for the same reach; their heading leads the target (see SpikedShellBoss).
      // The dash slot is now a second jump; the roll homes at up to 2.4 rad/s.
      dashSeconds:.56,dashSpeed:340,rollWarningSeconds:1.3,rollSeconds:1,rollSpeed:580,actionPause:.3,rollTurnRate:2.4}}},
};
