export interface SpriteSilhouette {
  pixels: Uint8ClampedArray;
  x: number; y: number; width: number; height: number;
}

/** Alpha separates poses even when a staff crosses a nominal atlas cell.
 * Strong seeds ignore faint bridges; owned fringe retains painted edges.
 */
export function splitSpriteSilhouettes(pixels: Uint8ClampedArray, width: number, height: number,
  columns: number, rows: number): SpriteSilhouette[] {
  const size = width * height, labels = new Uint32Array(size), queue = new Uint32Array(size);
  const parts: { id: number; count: number; x0: number; y0: number; x1: number; y1: number }[] = [];
  const neighbours = (index: number, visit: (n: number) => void) => {
    const x = index % width;
    if (index >= width) visit(index - width);
    if (index + width < size) visit(index + width);
    if (x) visit(index - 1);
    if (x + 1 < width) visit(index + 1);
  };
  for (let seed = 0; seed < size; seed++) {
    if (labels[seed] || pixels[seed * 4 + 3] < 110) continue;
    const part = { id: parts.length + 1, count: 1, x0: width, y0: height, x1: 0, y1: 0 };
    queue[0] = seed; labels[seed] = part.id;
    for (let read = 0; read < part.count; read++) {
      const index = queue[read], x = index % width, y = Math.floor(index / width);
      part.x0 = Math.min(part.x0, x); part.x1 = Math.max(part.x1, x);
      part.y0 = Math.min(part.y0, y); part.y1 = Math.max(part.y1, y);
      neighbours(index, n => {
        if (!labels[n] && pixels[n * 4 + 3] >= 110) { labels[n] = part.id; queue[part.count++] = n; }
      });
    }
    parts.push(part);
  }
  const selected = parts.sort((a, b) => b.count - a.count).slice(0, columns * rows);
  if (selected.length !== columns * rows) throw new Error(`Expected ${columns * rows} isolated character poses.`);
  const selectedIds = new Set(selected.map(p => p.id));
  const owners = new Uint32Array(size), distance = new Uint8Array(size);
  let count = 0;
  for (let i = 0; i < size; i++) if (selectedIds.has(labels[i])) { owners[i] = labels[i]; queue[count++] = i; }
  for (let read = 0; read < count; read++) {
    const index = queue[read]; if (distance[index] === 3) continue;
    neighbours(index, n => {
      if (!owners[n] && pixels[n * 4 + 3] > 0) {
        owners[n] = owners[index]; distance[n] = distance[index] + 1; queue[count++] = n;
      }
    });
  }
  selected.sort((a, b) => a.y0 - b.y0);
  const ordered = Array.from({ length: rows }, (_, row) => selected.slice(row * columns, (row + 1) * columns)
    .sort((a, b) => a.x0 - b.x0)).flat();
  return ordered.map(part => {
    const x0 = Math.max(0, part.x0 - 4), y0 = Math.max(0, part.y0 - 4);
    const w = Math.min(width, part.x1 + 5) - x0, h = Math.min(height, part.y1 + 5) - y0;
    const output = new Uint8ClampedArray(w * h * 4);
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const i = y * width + x;
      if (owners[i] === part.id) output.set(pixels.subarray(i * 4, i * 4 + 4), ((y - y0) * w + x - x0) * 4);
    }
    return { pixels: output, x: x0, y: y0, width: w, height: h };
  });
}
