/** Stage trial values, independent of Sandbox and ordinary Mage progression. */
export const KHANG_CHIEN_BALANCE={
  quotas:[100,150,200] as const, aliveCaps:[36,44,48] as const,
  openingEnemies:23,spawnInterval:1.2,
  /** The moment the barrier stands, the whole opening pack winds up on it at once. Rats and grasshoppers leap,
   * the rest shoot. Unblocked, it breaks the 4000 HP barrier; the mage must cannon the leapers back and body-block shots. */
  openingAssault:{windup:1,stagger:.08,leapSpeed:380,damageRatio:.5},spawnBatch:5,eliteEvery:5,
  /** The freshly raised barrier starts at half strength: 4000/8000. */
  barrier:{hp:8000,initialRatio:.5,warningRatio:.25},
  ritualComboWindow:.6,
  skills:{prisonDuration:2,prisonEruptDelay:1.75,prisonDragonMpRatio:.4,eRadiusPerMap:.3,qEmpowerAfter:4,cannonInterval:1.5,cannonDamage:.5,readyEHealRatio:.05,qSietShieldMpRatio:.01,rPhaseSeconds:1,rCooldown:20,
    /** Final map: E radius +25% on top of the per-map growth (damage unchanged). */
    finalMapERadius:1.25,cannonSize:1.5,cannonPush:24,
    cannonPushScale:{normal:.35,elite:.15,boss:.05}},
  renewal:{returnSeconds:3,prayerSeconds:1.5,drawSeconds:3,sortieSeconds:1.2,remainingMpRatio:.05,barrierHealRatio:.5},
  mentor:{maxHp:3000,maxMp:18000,atk:18000,def:180,mpRegen:300,attackSpeedRating:50,moveSpeed:190,critChance:.2,critDamage:1.5},
  /** Stage-only enemy traits. Ratios multiply the enemy ATK per hit. */
  traits:{
    // Two heavy sticky clots. Each commits its predictive aim 0.3s before release.
    snailResin:{projectileCount:1,projectileSpeed:120,projectileRadius:18,projectileRange:440,shotSlow:{multiplier:.55,seconds:1.6},
      windup:1.1,recovery:1.05,leadShots:true,aimLockSeconds:.3,burstCount:2,burstGap:.6},
    // Tar pools arm after a visible warning; repeated pools refresh one source's slow.
    mireTrail:{kind:'slime',spacing:60,radius:44,duration:4,armingSeconds:.35,damageRatio:.06,tickInterval:.8,slow:{multiplier:.78,seconds:.6}},
    // Black elite: marked quill landing, brief pin, then a persistent thorn zone.
    bristleZone:{flightSeconds:.9,dodgeSeconds:.35,radius:64,duration:2.5,impactRatio:.5,damageRatio:.12,tickInterval:.65,rootSeconds:.65},
    // Displacement arms a straight counter. Last 0.3s is committed; sidestep or push again.
    displacedCounter:{delay:1,lockSeconds:.3,chargeSpeed:340,range:420},
    // Elite green caterpillar: one bristle arc, 5s cooldown. The wide arc cups the path ahead for 3s,
    // forcing the player to turn back; touching it hurts every 0.5s.
    bristleWall:{count:1,gap:1,flightSeconds:.6,dodgeSeconds:.35,duration:3,radius:85,halfAngle:1.5,thickness:16,impactRatio:.5,cooldown:5,touchRatio:.25,touchInterval:.5},
    grasshopperDive:{count:2,airSeconds:.85,pause:.55,radius:54,range:280,impactRatio:1},
    ratDrag:{distance:96,speed:260},
  },
  // Monster HP doubled (boss unchanged).
  normal:{hp:13000,atk:360,speed:100,interval:2.8,radius:22},
  elite:{hp:48000,atk:900,speed:110,interval:3.4,radius:28},
  // Instead of volleys, every time the boss surfaces 5 random elites burst out around it.
  boss:{hp:1000000,atk:2400,def:50,speed:85,interval:4.5,radius:50,emergeSummon:5,summonRadius:110,summonAliveCap:40},
  bossCycle:{burrowSeconds:.75,undergroundSeconds:1.8,emergeSeconds:.45,volleyGap:1.3,jumpSeconds:.95,jumpRange:320,jumpDelay:.8,
    dashSeconds:.56,dashSpeed:340,rollWarningSeconds:1.4,rollSeconds:1.1,rollSpeed:360,actionPause:.7,landingImpact:true},
  finale:{radius:100,chargeSeconds:1.5,qSeconds:5,maxQ:10,qFlightSeconds:.22,diveSeconds:.5,
    firstImpactAt:7.22,firstRawDamage:250000,eightChargeAt:7.5,eightLaunchAt:9.7,eightImpactAt:10.6,eightRawDamage:1000000,collapseAt:12},
  /** Cinematic seconds after the voluntary soul offering; no combat or healing. */
  purification:{riseSeconds:2,waveSeconds:6,quietSeconds:4},
} as const;
