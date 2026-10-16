import Phaser from 'phaser';
import { MainScene } from '../presentation/phaser/MainScene';
import '../style.css';
import '../dev/labs/map/lab.css';
import { type Zone } from '../world/definitions';
import { parseStage } from '../world/parseStage';
import { mountDevMenu } from '../dev/sandbox/DevMenu';
import { mountGameInstall } from './installGame';
import { isMeleeJob } from '../presentation/animations/meleeModel';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = '';

const archerStageOnly = import.meta.env.VITE_ARCHER_STAGE_ONLY === '1';
const prideStageOnly = import.meta.env.VITE_KIEU_NGAO_STAGE_ONLY === '1';
const stageOnly = import.meta.env.VITE_STAGE_ONLY === '1' || archerStageOnly || prideStageOnly;
if(stageOnly&&!archerStageOnly&&!prideStageOnly)mountGameInstall(app);
document.body.classList.toggle('archer-stage-only',archerStageOnly||prideStageOnly);
if(prideStageOnly)history.replaceState(null,'',`${location.pathname}?stage=kieu-ngao&character=archer&path=${new URLSearchParams(location.search).get('path')==='b1'?'b1':'a1'}`);
else if (archerStageOnly) history.replaceState(null, '', `${location.pathname}?stage=linh-moc&character=archer&path=${new URLSearchParams(location.search).get('path')==='b1'?'b1':'a1'}`);
else if (stageOnly) history.replaceState(null, '', `${location.pathname}?stage=khang-chien&character=mage`);
const params = new URLSearchParams(location.search);
const ActiveScene = isMeleeJob(params.get('character'))
  ? (await import('../presentation/phaser/MeleeModelScene')).MeleeModelScene
  : params.get('character') === 'archer' || ['linh-moc','kieu-ngao'].includes(params.get('stage')??'')
  ? (await import('../presentation/phaser/WoodArcherScene')).WoodArcherScene : MainScene;
const portraitCapture = params.get('capture') === 'portrait';
if (params.has('lab')) {
  const { openLab } = await import('../dev/labs/map/Lab');
  openLab(app);
} else {
if (portraitCapture) document.body.classList.add('portrait-capture');
let playtestZone: Zone | undefined;
if (params.has('playtest')) {
  try {
    const raw = sessionStorage.getItem('vietphach.lab.playtest');
    if (!raw) throw new Error('Không có khu chạy thử.');
    playtestZone = parseStage(JSON.parse(raw)).zones[0];
  } catch (error) {
    app.textContent = `Không mở được khu chạy thử: ${error instanceof Error ? error.message : error}`;
    throw error;
  }
}
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: app,
  width: portraitCapture ? 720 : 960,
  height: portraitCapture ? 1280 : 540,
  backgroundColor: '#15202b',
  scale: {
    mode: portraitCapture ? Phaser.Scale.FIT : Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [ActiveScene],
  callbacks: { preBoot: game => {
    game.registry.set('portraitCapture', portraitCapture);
    if (playtestZone) game.registry.set('labZone', playtestZone);
  } },
});

const removeDevMenu = stageOnly ? () => {} : mountDevMenu(action => game.events.emit('sandbox-dev-action', action), {
  onOpenChange: open => game.events.emit('dev-menu-open', open),
  subscribeStatus: receive => { game.events.on('sandbox-dev-status', receive); return () => game.events.off('sandbox-dev-status', receive); },
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    game.destroy(true);
    document.body.classList.remove('portrait-capture');
    document.body.classList.remove('archer-stage-only');
    removeDevMenu();
  });
}
}
