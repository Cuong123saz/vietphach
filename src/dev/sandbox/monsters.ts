import { createResources } from '../../gameplay/characters/core/CharacterResources';
import { validateStats } from '../../gameplay/characters/core/CharacterStats';
import { spawnEnemyElement } from '../../gameplay/enemies/EnemyElement';
import type { Point } from '../../world/definitions';
import type { SandboxDummy } from './fixtures';
import { ELITE_ENEMIES } from '../../config/balance/eliteEnemies';

// Explicit sandbox tuning only; these are not official monster balance values.
export const MONSTER_TEST_TUNING = Object.freeze({ hp: 300, atk: 8, moveSpeed: 80,
  attackInterval: 2.4, radius: 22, spacing: 110 });
export { MONSTER_AI_TUNING } from '../../config/balance/enemyPreview';

export function createSandboxMonsters(origin: Point, types: readonly { id: string; name: string; kind?: 'melee'|'ranged' }[], random: () => number = Math.random): SandboxDummy[] {
  return types.map((type, i) => {
    const id = `sandbox-monster-${type.id}`;
    const tuning=ELITE_ENEMIES[type.id];
    const stats = validateStats({ maxHp: tuning?.hp??MONSTER_TEST_TUNING.hp, maxMp: 0, atk: tuning?.atk??MONSTER_TEST_TUNING.atk, def: 0,
      mpRegen: 0, attackSpeedRating: 0, attackInterval: tuning?.interval??MONSTER_TEST_TUNING.attackInterval,
      critChance: 0, critDamage: 1, moveSpeed: tuning?.speed??MONSTER_TEST_TUNING.moveSpeed });
    const element = spawnEnemyElement(id, tuning?.rank==='boss'?{rank:'boss',element:'earth'}:{rank:tuning?.rank??'normal'}, { random }).element;
    return { id, label: type.name, monsterArtId: type.id,
      position: { x: origin.x + (i % 3 - 1) * MONSTER_TEST_TUNING.spacing,
        y: origin.y - 170 - Math.floor(i / 3) * MONSTER_TEST_TUNING.spacing },
      radius: tuning?.radius??MONSTER_TEST_TUNING.radius, actor: { id, team: 'enemy', element, combatRole:type.kind??'melee', stats, resources: createResources(stats) } };
  });
}
