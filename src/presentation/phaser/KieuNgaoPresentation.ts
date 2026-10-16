import type Phaser from 'phaser';
import type { Point } from '../../world/definitions';
import { MOC_LOC_SEAL } from '../../world/kieuNgao';
import { kieuNgaoInteraction, kieuNgaoRootsLeft, type KieuNgaoStage } from '../../run/KieuNgaoStage';
import { setForestPerson, setMocLocPose } from './KieuNgaoTextures';

/** Story props and navigation are separate from hurt zones. They never inflict damage. */
export class KieuNgaoPresentation {
  private scene: Phaser.Scene;
  private ground: Phaser.GameObjects.Graphics;
  private overlay: Phaser.GameObjects.Graphics;
  private hunters: Phaser.GameObjects.Sprite[];
  private teacher: Phaser.GameObjects.Sprite;
  private guardian: Phaser.GameObjects.Sprite;
  private arrows: Phaser.GameObjects.Image[];
  private reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  constructor(scene: Phaser.Scene) {
    this.scene = scene; this.ground = scene.add.graphics().setDepth(1); this.overlay = scene.add.graphics().setDepth(8001);
    this.hunters = [0, 1].map(i => scene.add.sprite(0, 0, 'forest-people', `hunter-${i + 1}`));
    this.teacher = scene.add.sprite(0, 0, 'forest-people', 'mentor-bound');
    this.guardian = scene.add.sprite(0, 0, 'forest-moc-loc', 'guard');
    this.arrows = [0, 1, 2].map(() => scene.add.image(0, 0, 'wood-arrow').setDisplaySize(53, 18).setRotation(Math.PI).setTint(0xddc69b));
  }
  private warning(p: Point, radius: number, progress: number) {
    const g = this.overlay;
    g.fillStyle(0x201a15, .22).fillCircle(p.x, p.y, radius).lineStyle(5, 0x181c16, .95).strokeCircle(p.x, p.y, radius);
    g.lineStyle(2, 0xe4d3a7, .95).strokeCircle(p.x, p.y, radius);
    g.lineStyle(3, 0xaf7850, 1).beginPath().arc(p.x, p.y, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress).strokePath();
  }
  update(s: KieuNgaoStage) {
    const g = this.ground, top = this.overlay, returning = s.phase === 'return' || s.phase === 'ending'; g.clear(); top.clear();
    const now = s.run.time;
    // Irregular forked soil cracks and wet patches; these marks never inflict damage.
    // The few moving wet ridges travel LEFT, toward the village.
    for (let j = 0; j < (returning ? 5 : s.mapIndex + 1); j++) {
      const y = 410 + j * 125, pts = Array.from({ length: 12 }, (_, i) => ({
        x: 125 + i * 137 + Math.sin(i * 2.4 + j) * 17,
        y: y + Math.sin(i * 1.31 + j * 2.4) * 42 + Math.cos(i * .53 + j) * 23,
      }));
      const width = returning ? 4 + j % 3 * 2 : 2 + s.mapIndex;
      g.lineStyle(width, 0x111711, returning ? .8 : .4).strokePoints(pts);
      for (let i = 1; i < pts.length - 1; i++) {
        const p = pts[i], side = (i + j) % 2 ? -1 : 1;
        if (returning) g.fillStyle(0x101610, .18).fillEllipse(p.x + 12, p.y + 3, 45 + (i * 13 + j * 19) % 62, 13 + i % 4 * 5);
        g.lineStyle(Math.max(1, width * .45), 0x171b13, returning ? .72 : .32).strokePoints([
          p, { x: p.x - 23, y: p.y + side * (18 + i % 3 * 9) }, { x: p.x - 18 - j * 7, y: p.y + side * (42 + i % 4 * 8) },
        ]);
      }
      if (returning && !this.reduced) { const k = ((11 - (now * .55 + j * 2.1) % 11) % 11), i = Math.floor(k), t = k - i, a = pts[i], b = pts[i + 1];
        g.fillStyle(0x7b7763, .28).fillEllipse(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, 10, 2); }
    }
    const arrowPoints = s.mapIndex === 0 ? [{ x: 470, y: 550 }, { x: 950, y: 810 }, { x: 1400, y: 795 }]
      : s.mapIndex === 1 ? [{ x: 510, y: 690 }, { x: 1290, y: 690 }] : [{ x: 680, y: 770 }, { x: 1310, y: 740 }];
    this.arrows.forEach((a, i) => { const p = arrowPoints[i]; a.setVisible(!!p && s.mapIndex < 3 && s.phase !== 'ending'); if (p) a.setPosition(p.x, p.y).setDepth(p.y - 5); });
    const hunterPoints = s.mapIndex === 1 ? [{ x: 1330, y: 625 }, { x: 1370, y: 690 }] : [{ x: 630, y: 650 }, { x: 705, y: 675 }];
    this.hunters.forEach((a, i) => { a.setVisible(!returning && (s.mapIndex === 1 || s.mapIndex === 2)); setForestPerson(a, `hunter-${i + 1}`); a.setPosition(hunterPoints[i].x, hunterPoints[i].y).setDepth(hunterPoints[i].y); });
    this.guardian.setVisible(s.mapIndex === 2 && !returning || s.mapIndex === 3 && s.phase === 'reveal');
    if (s.mapIndex === 2) { setMocLocPose(this.guardian); this.guardian.setPosition(1400, 485).setDepth(485).setAlpha(.85).setAngle(0); }
    else if (s.boss) { setMocLocPose(this.guardian); this.guardian.setPosition(s.boss.position.x + 55, s.boss.position.y).setDepth(s.boss.position.y - 1).setAlpha(.6).setAngle(-65); }
    this.teacher.setVisible(s.mapIndex === 3 && !!s.boss);
    if (s.boss) {
      const reveal = s.phase === 'reveal'; setForestPerson(this.teacher, reveal ? s.mentorAlive ? 'mentor-live' : 'mentor-dead' : 'mentor-bound', reveal ? 82 : 48);
      this.teacher.setPosition(s.boss.position.x + (reveal ? -95 : -15), s.boss.position.y + (reveal ? 30 : -93)).setDepth(s.boss.position.y + 1);
      if (!s.sealBroken) { const seal = MOC_LOC_SEAL; g.lineStyle(2, 0xc6b58a, .3).strokeEllipse(seal.x, seal.y, seal.radiusX * 2, seal.radiusY * 2); }
      else for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, x = MOC_LOC_SEAL.x + Math.cos(a) * MOC_LOC_SEAL.radiusX, y = MOC_LOC_SEAL.y + Math.sin(a) * MOC_LOC_SEAL.radiusY;
        g.lineStyle(5, 0x121513, .9).lineBetween(x - 12, y - 13, x + 8, y + 12).lineBetween(x + 8, y + 12, x - 3, y + 21); }
    }
    const a = s.bossAttack;
    if (a && a.phase !== 'recover') {
      const progress = Math.min(1, Math.max(0, (now - a.startedAt) / (a.endsAt - a.startedAt)));
      if (a.kind === 'charge') {
        const dx = a.to.x - a.from.x, dy = a.to.y - a.from.y, length = Math.hypot(dx, dy) || 1, nx = -dy / length * a.radius, ny = dx / length * a.radius;
        const pts = [{ x: a.from.x + nx, y: a.from.y + ny }, { x: a.to.x + nx, y: a.to.y + ny }, { x: a.to.x - nx, y: a.to.y - ny }, { x: a.from.x - nx, y: a.from.y - ny }];
        top.fillStyle(0xaa744e, .16).fillPoints(pts, true).lineStyle(2, 0xe4d3a7, .9).strokePoints(pts, true); this.warning(a.to, a.radius, progress);
      } else for (const p of a.spots) { this.warning(p, a.radius, progress); if (a.phase === 'active') {
        for (let i = 0; i < 5; i++) top.lineStyle(4, 0x5d5035, .95).lineBetween(p.x + (i - 2) * 13, p.y, p.x + (i - 2) * 10, p.y - 32 - i % 2 * 12); } }
    }
    const interaction = kieuNgaoInteraction(s);
    if (interaction) {
      const p = s.run.player.position, dx = interaction.point.x - p.x, dy = interaction.point.y - p.y, length = Math.hypot(dx, dy) || 1, reach = Math.min(155, length);
      const at = { x: p.x + dx / length * reach, y: p.y + dy / length * reach }, nx = -dy / length * 8, ny = dx / length * 8;
      if (length > 25) { top.fillStyle(0x181d15, .9).fillCircle(at.x, at.y, 16);
        top.fillStyle(0xe6d6ac, .9).fillTriangle(at.x + dx / length * 9, at.y + dy / length * 9, at.x - dx / length * 7 + nx, at.y - dy / length * 7 + ny, at.x - dx / length * 7 - nx, at.y - dy / length * 7 - ny); }
      top.lineStyle(2, 0xe6d6ac, .75).strokeCircle(interaction.point.x, interaction.point.y, 26);
    }
    const data = this.scene.game.canvas.dataset;
    data.forestPhase = s.phase; data.forestMap = String(s.mapIndex + 1); data.forestBattle = s.combatWon ? 'won' : 'active';
    data.forestRoots = String(kieuNgaoRootsLeft(s)); data.forestClues = String(s.cluesSeen.length);
    data.playerX = String(Math.round(s.run.player.position.x)); data.playerY = String(Math.round(s.run.player.position.y));
  }
  destroy() { this.ground.destroy(); this.overlay.destroy(); for (const a of [...this.hunters, this.teacher, this.guardian, ...this.arrows]) a.destroy(); }
}
