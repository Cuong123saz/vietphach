const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const load = require('./load-ts.cjs')();
const { createRun, createVillageZone, moveRunPlayer, finishRun } = load('src/run/Run.ts');
const settings = { speed: 150, radius: 12 };

test('Khang Chien owns four ordered scenes with protected villagers and a real barrier',()=>{
  const {createKhangChienStage,khangChienMapId,KHANG_CHIEN_REFUGE:R}=require('./load-ts.cjs')({URLSearchParams})('src/world/khangChien.ts');
  const {parseStage}=load('src/world/parseStage.ts');
  const {overlaps}=load('src/world/collision.ts');
  const {MAPS}=load('src/world/definitions.ts');
  const stage=parseStage(createKhangChienStage());
  assert.equal(stage.name,'Kháng Chiến');assert.equal(stage.zones.length,4);
  const urls=stage.zones.map(z=>MAPS[z.mapId].url);assert.equal(new Set(urls).size,4);
  for(const [index,zone] of stage.zones.entries()){
    assert.equal(zone.mapId,`khang-chien-${index+1}`);
    const barrier=zone.objects.find(o=>o.kind==='obstacle'),villagers=zone.objects.find(o=>o.kind==='npc');
    assert.ok(zone.objects.filter(o=>o.kind==='obstacle').every(o=>!overlaps(villagers,12,o)),'refuge interior stays free');
    assert.equal(overlaps(zone.spawn,12,barrier),false);
    const run=createRun(`resistance-${index}`,zone);run.player.position={x:R.x-R.radiusX-20,y:R.y};
    moveRunPlayer(run,{x:1,y:0},1,settings);
    assert.ok(run.player.position.x>R.x-R.radiusX,'player can walk into refuge');
    const {moveCharacter}=load('src/gameplay/characters/core/movement.ts');
    const enemy=moveCharacter({x:R.x-R.radiusX-20,y:R.y},{x:1,y:0},1,zone,settings);
    assert.ok(enemy.x<R.x-R.radiusX,'enemy cannot walk into refuge');
  }
  assert.equal(khangChienMapId('?map=khang-chien-4'),'khang-chien-4');
  assert.equal(khangChienMapId('?map=khang-chien-5'),undefined);
});

test('new runs own their zone and player state; finishing does not reset another run', () => {
  const zone = createVillageZone();
  const a = createRun('a', zone), b = createRun('b', zone);
  moveRunPlayer(a, { x: 1, y: 0 }, 1, settings);
  assert.equal(a.player.position.x, 810);
  assert.equal(b.player.position.x, 660);
  a.zone.spawn.x = 100;
  assert.equal(zone.spawn.x, 660);
  assert.equal(b.zone.spawn.x, 660);
  const result = finishRun(a);
  assert.equal(result.zoneId, zone.id);
  assert.equal(result.outcome, 'abandoned');
  moveRunPlayer(a, { x: 1, y: 0 }, 1, settings);
  assert.equal(a.player.position.x, 810);
  assert.throws(() => finishRun(a));
  assert.equal(createRun('c', zone).player.position.x, 660);
});

test('movement normalizes diagonal input and has no dependency on render assets', () => {
  const a = createRun('a', createVillageZone());
  moveRunPlayer(a, { x: 1, y: 1 }, 1, settings);
  assert.ok(Math.abs(Math.hypot(a.player.position.x - 660, a.player.position.y - 800) - 150) < 1e-8);
  const before = JSON.stringify(a.player);
  assert.throws(() => moveRunPlayer(a, { x: NaN, y: 0 }, 1, settings));
  assert.throws(() => moveRunPlayer(a, { x: 1, y: 0 }, -1, settings));
  assert.equal(JSON.stringify(a.player), before);
});

test('Run uses shared world collision and validates incoming zone data', () => {
  const zone = createVillageZone();
  zone.spawn = { x: 50, y: 150 };
  zone.objects.push({ id: 'wall', name: 'Wall', kind: 'obstacle', resource: 'rect', x: 100, y: 100, shape: { type: 'rect', width: 4, height: 200 } });
  const run = createRun('collision', zone);
  moveRunPlayer(run, { x: 1, y: 0 }, 1, settings);
  assert.ok(run.player.position.x <= 88);
  zone.spawn.x = 101;
  assert.throws(() => createRun('invalid', zone));
});

test('domain imports stay inside domain; Phaser is confined to app/presentation', () => {
  const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
  const domain = new Set(['gameplay', 'run', 'world', 'engine', 'config', 'account', 'cosmetics']);
  for (const file of walk('src').filter(f => f.endsWith('.ts'))) {
    const owner = path.relative('src', file).split(path.sep)[0];
    const tree = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    const visit = node => {
      const spec = (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) ? node.moduleSpecifier
        : ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || node.expression.getText(tree) === 'require') ? node.arguments[0] : undefined;
      if (spec && ts.isStringLiteral(spec)) {
        const name = spec.text;
        if (name === 'phaser' || name.startsWith('phaser/')) assert.ok(['app', 'presentation'].includes(owner), file);
        if (domain.has(owner)) {
          assert.ok(name.startsWith('.'), `${file}: unexpected external dependency ${name}`);
          const target = path.relative(path.resolve('src'), path.resolve(path.dirname(file), name)).split(path.sep)[0];
          assert.ok(domain.has(target), `${file} must not depend on ${target}`);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(tree);
  }
});
