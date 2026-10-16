import Phaser from 'phaser';

export type Facing = 'left' | 'down' | 'up' | 'right';
export const FACINGS: Facing[] = ['left', 'down', 'up', 'right'];
export const runAnimationKey = (facing: Facing) => `martial-run-${facing === 'up' ? '' : 'original-'}${facing}`;

// Source artwork is a presentation sheet, not a uniform transparent atlas.
// Crop away labels, then mask connected neutral background at render time.
export function createCharacterTextures(scene: Phaser.Scene) {
  for (const mode of ['idle', 'run'] as const) {
    FACINGS.forEach((facing, row) => {
      const updated = mode === 'run' && facing !== 'up';
      const prepared: { canvas: HTMLCanvasElement; minX: number; minY: number; maxX: number; maxY: number }[] = [];
      for (let frame = 0; frame < (mode === 'run' ? 4 : 1); frame++) {
        const source = scene.textures.get(updated ? `martial-original-${facing}-${frame}` : `martial-${mode}-source`)
          .getSourceImage() as HTMLImageElement;
        const rect = updated ? [0, 0, source.width, source.height] : mode === 'run'
          ? [280 + frame * 260, row * 256, 240, 246]
          : [row * 384 + 15, 165, 365, 660];
        const [x, y, w, h] = rect;
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
        ctx.drawImage(source, updated ? x : x * source.width / 1536, updated ? y : y * source.height / 1024,
          updated ? w : w * source.width / 1536, updated ? h : h * source.height / 1024, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h);
        const pixels = data.data;
        const visited = new Uint8Array(w * h);
        const queue: number[] = [];
        const visit = (i: number) => {
          if (visited[i]) return;
          visited[i] = 1;
          const p = i * 4;
          const hi = Math.max(pixels[p], pixels[p + 1], pixels[p + 2]);
          const lo = Math.min(pixels[p], pixels[p + 1], pixels[p + 2]);
          if (hi - lo < 22 && lo > 65) queue.push(i);
        };
        for (let xx = 0; xx < w; xx++) { visit(xx); visit((h - 1) * w + xx); }
        for (let yy = 0; yy < h; yy++) { visit(yy * w); visit(yy * w + w - 1); }
        for (let head = 0; head < queue.length; head++) {
          const i = queue[head]; pixels[i * 4 + 3] = 0;
          const xx = i % w, yy = Math.floor(i / w);
          if (xx) visit(i - 1); if (xx < w - 1) visit(i + 1);
          if (yy) visit(i - w); if (yy < h - 1) visit(i + w);
        }
        if (updated) {
          // Keep the main connected figure; discard fragments of adjacent sprites.
          const labels = new Int32Array(w * h);
          let label = 0, largest = 0, largestSize = 0;
          for (let i = 0; i < w * h; i++) {
            if (!pixels[i * 4 + 3] || labels[i]) continue;
            label++;
            const component = [i]; labels[i] = label;
            for (let head = 0; head < component.length; head++) {
              const n = component[head], xx = n % w;
              const neighbors = [n - w, n + w];
              if (xx) neighbors.push(n - 1);
              if (xx < w - 1) neighbors.push(n + 1);
              for (const next of neighbors) {
                if (next >= 0 && next < w * h && !labels[next] && pixels[next * 4 + 3]) {
                  labels[next] = label; component.push(next);
                }
              }
            }
            if (component.length > largestSize) { largestSize = component.length; largest = label; }
          }
          for (let i = 0; i < labels.length; i++) if (labels[i] !== largest) pixels[i * 4 + 3] = 0;
        }
        let minX = w, minY = h, maxX = 0, maxY = 0;
        for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
          if (pixels[(yy * w + xx) * 4 + 3]) {
            minX = Math.min(minX, xx); maxX = Math.max(maxX, xx);
            minY = Math.min(minY, yy); maxY = Math.max(maxY, yy);
          }
        }
        ctx.putImageData(data, 0, 0);
        prepared.push({ canvas, minX, minY, maxX, maxY });
      }
      // A single scale for the cycle preserves leg extension and avoids per-frame resizing.
      const scale = 64 / Math.max(...prepared.map(p => p.maxY - p.minY + 1));
      prepared.forEach(({ canvas, minX, minY, maxX, maxY }, frame) => {
        const output = document.createElement('canvas');
        output.width = 96; output.height = 80;
        const out = output.getContext('2d')!;
        const width = (maxX - minX + 1) * scale;
        const height = (maxY - minY + 1) * scale;
        out.drawImage(canvas, minX, minY, maxX - minX + 1, maxY - minY + 1,
          48 - width / 2, 72 - height, width, height);
        const key = mode === 'run' ? `${runAnimationKey(facing)}-${frame}` : `martial-idle-${facing}-${frame}`;
        // Scene restarts must rebuild generated textures instead of retaining older artwork.
        if (scene.textures.exists(key)) scene.textures.remove(key);
        scene.textures.addCanvas(key, output);
      });
    });
  }
}
