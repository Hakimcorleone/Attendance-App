// Tiny isometric pixel renderer: everything is drawn with 1px-high fillRect
// scanlines so edges stay crisp when the canvas is scaled up with
// `image-rendering: pixelated`.

export type Pt = [number, number];

export type RoomGeometry = {
  cols: number;
  rows: number;
  ox: number;
  oy: number;
};

export function iso(room: RoomGeometry, gx: number, gy: number, z = 0): Pt {
  return [room.ox + (gx - gy) * 16, room.oy + (gx + gy) * 8 - z];
}

export function poly(ctx: CanvasRenderingContext2D, pts: Pt[], color: string) {
  ctx.fillStyle = color;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [, y] of pts) {
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  for (let y = Math.round(minY); y < Math.round(maxY); y += 1) {
    const yc = y + 0.5;
    let left = Infinity;
    let right = -Infinity;

    for (let i = 0; i < pts.length; i += 1) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[(i + 1) % pts.length];
      if (yc >= Math.min(y1, y2) && yc < Math.max(y1, y2)) {
        const x = x1 + ((yc - y1) * (x2 - x1)) / (y2 - y1);
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }

    if (left <= right) {
      const l = Math.round(left);
      ctx.fillRect(l, y, Math.max(1, Math.round(right) - l), 1);
    }
  }
}

export type BoxColors = { top: string; left: string; right: string };

// Axis-aligned iso cuboid. (x, y) is the back corner of the footprint in tile units.
export function box(
  ctx: CanvasRenderingContext2D,
  room: RoomGeometry,
  x: number,
  y: number,
  w: number,
  d: number,
  h: number,
  z: number,
  colors: BoxColors
) {
  const t = iso(room, x, y, z + h);
  const r = iso(room, x + w, y, z + h);
  const b = iso(room, x + w, y + d, z + h);
  const l = iso(room, x, y + d, z + h);
  const rb = iso(room, x + w, y, z);
  const bb = iso(room, x + w, y + d, z);
  const lb = iso(room, x, y + d, z);

  poly(ctx, [l, b, bb, lb], colors.left);
  poly(ctx, [b, r, rb, bb], colors.right);
  poly(ctx, [t, r, b, l], colors.top);
}

export function blob(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.fillStyle = color;
  for (let dy = -r; dy <= r; dy += 1) {
    const half = Math.round(Math.sqrt(r * r - dy * dy));
    ctx.fillRect(Math.round(cx - half), Math.round(cy + dy), half * 2 || 1, 1);
  }
}

export function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => {
    const v = amount < 0 ? c * (1 + amount) : c + (255 - c) * amount;
    return Math.max(0, Math.min(255, Math.round(v)));
  };
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

export function tones(hex: string): BoxColors {
  return { top: shade(hex, 0.18), left: hex, right: shade(hex, -0.18) };
}

// Breadth-first search over a small tile grid; returns tile steps excluding the start.
export function findPath(
  cols: number,
  rows: number,
  blocked: Set<string>,
  from: [number, number],
  to: [number, number]
): [number, number][] {
  const key = (x: number, y: number) => `${x},${y}`;
  const startKey = key(from[0], from[1]);
  const goalKey = key(to[0], to[1]);
  if (startKey === goalKey) return [];

  const previous = new Map<string, string | null>([[startKey, null]]);
  const queue: [number, number][] = [from];

  while (queue.length) {
    const [x, y] = queue.shift()!;
    if (key(x, y) === goalKey) break;

    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx;
      const ny = y + dy;
      const k = key(nx, ny);
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || previous.has(k)) continue;
      if (blocked.has(k) && k !== goalKey) continue;
      previous.set(k, key(x, y));
      queue.push([nx, ny]);
    }
  }

  if (!previous.has(goalKey)) return [];

  const path: [number, number][] = [];
  let cursor: string | null = goalKey;
  while (cursor && cursor !== startKey) {
    const [x, y] = cursor.split(",").map(Number);
    path.unshift([x, y]);
    cursor = previous.get(cursor) ?? null;
  }
  return path;
}
