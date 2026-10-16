/** Ordinary-run prototype tuning. No cinematic damage or target-HP formula. */
export const WATER_EVOLUTION = Object.freeze({
  human: { linkLimit:3, linkMpRatio:.01, radius:50, charge:.6, flight:.6,
    shieldConversion:1.5, prisonDuration:2, eruptDelay:1.75, clusterOffset:65,
    smallDragonRatio:.1, smallDragonFlight:.35 },
  ultimate: { cooldown:20, charge:1.5, power:120, comboWindow:.4 },
  descent: { radius:100, duration:5, maxQ:10, qFlight:.22, dive:.5,
    minimumMpRatio:.5, explosionRatio:.5 },
  eight: { radius:90, count:8, dragonMultiplier:1.25, flight:.9,
    manaByLinks:[.9,.8,.7,.6] as readonly number[] },
});
