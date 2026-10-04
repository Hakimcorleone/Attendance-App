import { blob, box, iso, poly, shade, tones, type Pt, type RoomGeometry } from "./iso";

export type RoomKind = "office" | "home" | "beach";
export type Facing = "fr" | "fl" | "br" | "bl";
export type Sky = "day" | "dusk" | "night";

export type Seat = { x: number; y: number; face: Facing; height: number };

export type Furniture = {
  x: number;
  y: number;
  bias?: number;
  draw: (ctx: CanvasRenderingContext2D, room: Room, t: number, sky: Sky) => void;
};

export type Room = RoomGeometry & {
  kind: RoomKind;
  width: number;
  height: number;
  furniture: Furniture[];
  blocked: Set<string>;
  seats: Seat[];
  spots: [number, number][];
  beds: [number, number][];
  door: [number, number];
  drawBackground: (ctx: CanvasRenderingContext2D, sky: Sky) => void;
  drawAnimated?: (ctx: CanvasRenderingContext2D, t: number, sky: Sky) => void;
};

const skyColor: Record<Sky, string> = { day: "#9fd8ff", dusk: "#ffb98a", night: "#2a3170" };

function geometry(cols: number, rows: number, headroom: number) {
  const pad = 6;
  const ox = rows * 16 + pad;
  const oy = headroom + pad;
  return {
    cols,
    rows,
    ox,
    oy,
    width: (cols + rows) * 16 + pad * 2,
    height: oy + (cols + rows) * 8 + 8 + pad,
  };
}

function tileKey(x: number, y: number) {
  return `${x},${y}`;
}

// ---------- shared background pieces ----------

function drawFloor(ctx: CanvasRenderingContext2D, room: Room, a: string, b: string, line: string, edge: string) {
  for (let y = 0; y < room.rows; y += 1) {
    for (let x = 0; x < room.cols; x += 1) {
      poly(ctx, [iso(room, x, y), iso(room, x + 1, y), iso(room, x + 1, y + 1), iso(room, x, y + 1)], (x + y) % 2 ? a : b);
    }
  }

  ctx.fillStyle = line;
  for (let y = 0; y < room.rows; y += 1) {
    for (let x = 0; x < room.cols; x += 1) {
      const [tx, ty] = iso(room, x, y);
      for (let k = 0; k < 8; k += 1) {
        ctx.fillRect(tx - 2 * k - 2, ty + k, 2, 1);
        ctx.fillRect(tx + 2 * k, ty + k, 2, 1);
      }
    }
  }

  // floor slab thickness on the two front edges
  poly(ctx, [iso(room, 0, room.rows), iso(room, room.cols, room.rows), iso(room, room.cols, room.rows, -7), iso(room, 0, room.rows, -7)], edge);
  poly(
    ctx,
    [iso(room, room.cols, room.rows), iso(room, room.cols, 0), iso(room, room.cols, 0, -7), iso(room, room.cols, room.rows, -7)],
    shade(edge, -0.2)
  );
}

function drawWalls(ctx: CanvasRenderingContext2D, room: Room, height: number, left: string, right: string) {
  const { cols, rows } = room;
  poly(ctx, [iso(room, 0, 0, height), iso(room, 0, rows, height), iso(room, 0, rows), iso(room, 0, 0)], left);
  poly(ctx, [iso(room, 0, 0, height), iso(room, cols, 0, height), iso(room, cols, 0), iso(room, 0, 0)], right);

  // skirting
  poly(ctx, [iso(room, 0, 0, 4), iso(room, 0, rows, 4), iso(room, 0, rows), iso(room, 0, 0)], shade(left, -0.25));
  poly(ctx, [iso(room, 0, 0, 4), iso(room, cols, 0, 4), iso(room, cols, 0), iso(room, 0, 0)], shade(right, -0.25));

  // thick top edge, like Habbo walls
  const capL = shade(left, 0.35);
  const capR = shade(right, 0.3);
  const [ax, ay] = iso(room, 0, 0, height);
  const [bx, by] = iso(room, 0, rows, height);
  const [cx, cy] = iso(room, cols, 0, height);
  poly(ctx, [[ax, ay - 4], [bx - 4, by - 2], [bx, by], [ax, ay]], capL);
  poly(ctx, [[ax, ay - 4], [cx + 4, cy - 2], [cx, cy], [ax, ay]], capR);
  poly(ctx, [[bx - 4, by - 2], [bx, by], [bx, by + height], [bx - 4, by + height - 2]], shade(left, -0.3));
  poly(ctx, [[cx + 4, cy - 2], [cx, cy], [cx, cy + height], [cx + 4, cy + height - 2]], shade(right, -0.35));
}

function wallRight(room: Room, x1: number, x2: number, z1: number, z2: number): Pt[] {
  return [iso(room, x1, 0, z2), iso(room, x2, 0, z2), iso(room, x2, 0, z1), iso(room, x1, 0, z1)];
}

function wallLeft(room: Room, y1: number, y2: number, z1: number, z2: number): Pt[] {
  return [iso(room, 0, y1, z2), iso(room, 0, y2, z2), iso(room, 0, y2, z1), iso(room, 0, y1, z1)];
}

function windowRight(ctx: CanvasRenderingContext2D, room: Room, x1: number, x2: number, sky: Sky, frame: string) {
  poly(ctx, wallRight(room, x1 - 0.08, x2 + 0.08, 18, 44), frame);
  poly(ctx, wallRight(room, x1, x2, 21, 41), skyColor[sky]);
  if (sky === "night") {
    const [sx, sy] = iso(room, x1 + 0.3, 0, 36);
    ctx.fillStyle = "#fff6c8";
    ctx.fillRect(sx, sy, 1, 1);
    ctx.fillRect(sx + 9, sy + 6, 1, 1);
  } else {
    // little cloud
    const [sx, sy] = iso(room, x1 + 0.25, 0, 34);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillRect(sx, sy, 7, 2);
    ctx.fillRect(sx + 2, sy - 1, 3, 1);
  }
  poly(ctx, wallRight(room, (x1 + x2) / 2 - 0.03, (x1 + x2) / 2 + 0.03, 21, 41), frame);
  poly(ctx, wallRight(room, x1, x2, 30.5, 31.5), frame);
}

function doorLeft(ctx: CanvasRenderingContext2D, room: Room, y: number, color: string) {
  poly(ctx, wallLeft(room, y + 0.08, y + 0.92, 0, 32), shade(color, -0.35));
  poly(ctx, wallLeft(room, y + 0.16, y + 0.84, 0, 29), color);
  const [kx, ky] = iso(room, 0, y + 0.72, 15);
  ctx.fillStyle = "#f5d76e";
  ctx.fillRect(kx, ky, 2, 1);
}

// ---------- furniture ----------

const wood = tones("#d9a066");
const darkWood = tones("#a86c3c");

function desk(x: number, y: number, laptop = false): Furniture {
  return {
    x,
    y,
    draw(ctx, room) {
      box(ctx, room, x + 0.08, y + 0.08, 0.84, 0.84, 13, 0, wood);
      if (laptop) {
        box(ctx, room, x + 0.3, y + 0.28, 0.4, 0.44, 1, 13, tones("#c7ccd6"));
        box(ctx, room, x + 0.24, y + 0.28, 0.06, 0.44, 8, 13, tones("#9aa3b2"));
      } else {
        box(ctx, room, x + 0.36, y + 0.3, 0.32, 0.42, 1, 13, tones("#3f4552"));
        box(ctx, room, x + 0.14, y + 0.2, 0.12, 0.6, 12, 14, tones("#2d323d"));
        box(ctx, room, x + 0.16, y + 0.45, 0.08, 0.1, 2, 13, tones("#2d323d"));
      }
      if ((x + y) % 2 === 0) box(ctx, room, x + 0.68, y + 0.66, 0.13, 0.13, 4, 13, tones("#f4f4f5"));
    },
  };
}

function chair(x: number, y: number, color: string): Furniture {
  const c = tones(color);
  return {
    x,
    y,
    bias: -0.05,
    draw(ctx, room) {
      box(ctx, room, x + 0.45, y + 0.45, 0.1, 0.1, 5, 0, tones("#4b5563"));
      box(ctx, room, x + 0.24, y + 0.24, 0.52, 0.52, 3, 5, c);
      box(ctx, room, x + 0.14, y + 0.26, 0.1, 0.48, 10, 5, c);
    },
  };
}

function plant(x: number, y: number): Furniture {
  return {
    x,
    y,
    draw(ctx, room, t) {
      box(ctx, room, x + 0.3, y + 0.3, 0.4, 0.4, 8, 0, tones("#d9774e"));
      const [cx, cy] = iso(room, x + 0.5, y + 0.5, 8);
      const sway = Math.round(Math.sin(t * 1.4 + x) * 0.6);
      blob(ctx, cx + sway, cy - 6, 6, "#2f9e57");
      blob(ctx, cx - 4 + sway, cy - 11, 4, "#3fb565");
      blob(ctx, cx + 4 + sway, cy - 12, 4, "#3fb565");
      blob(ctx, cx + sway, cy - 15, 3, "#5fd17f");
    },
  };
}

function cooler(x: number, y: number): Furniture {
  return {
    x,
    y,
    draw(ctx, room) {
      box(ctx, room, x + 0.25, y + 0.25, 0.5, 0.5, 15, 0, tones("#e8edf3"));
      box(ctx, room, x + 0.3, y + 0.3, 0.4, 0.4, 10, 15, tones("#8fd0f5"));
      box(ctx, room, x + 0.42, y + 0.42, 0.16, 0.16, 2, 25, tones("#4aa6dd"));
    },
  };
}

function shelf(x: number, y: number): Furniture {
  const bookColors = ["#e2574c", "#2f6fdf", "#f5b83d", "#2fa36b", "#8b5cf6", "#f472b6"];
  return {
    x,
    y,
    draw(ctx, room) {
      box(ctx, room, x + 0.02, y + 0.06, 0.38, 0.88, 32, 0, darkWood);
      const fx = x + 0.4;
      [4, 14, 24].forEach((z, level) => {
        for (let i = 0; i < 5; i += 1) {
          const ya = y + 0.12 + i * 0.16;
          const top = z + 6 + ((i + level) % 3);
          poly(ctx, [iso(room, fx, ya, top), iso(room, fx, ya + 0.12, top), iso(room, fx, ya + 0.12, z), iso(room, fx, ya, z)], bookColors[(i + level * 2) % bookColors.length]);
        }
      });
    },
  };
}

function printer(x: number, y: number): Furniture {
  return {
    x,
    y,
    draw(ctx, room) {
      box(ctx, room, x + 0.15, y + 0.2, 0.7, 0.6, 9, 0, tones("#dfe3ea"));
      box(ctx, room, x + 0.25, y + 0.3, 0.5, 0.4, 2, 9, tones("#9aa3b2"));
      box(ctx, room, x + 0.3, y + 0.35, 0.35, 0.3, 1, 11, tones("#ffffff"));
    },
  };
}

function sofa(x: number, y: number, end: "left" | "right" | "both", color: string): Furniture {
  const c = tones(color);
  const back = tones(shade(color, -0.12));
  return {
    x,
    y,
    draw(ctx, room) {
      box(ctx, room, x, y + 0.05, 1, 0.24, 15, 0, back);
      box(ctx, room, x, y + 0.29, 1, 0.66, 7, 0, c);
      if (end === "left" || end === "both") box(ctx, room, x, y + 0.05, 0.14, 0.9, 11, 0, back);
      if (end === "right" || end === "both") box(ctx, room, x + 0.86, y + 0.05, 0.14, 0.9, 11, 0, back);
    },
  };
}

function coffeeTable(x: number, y: number): Furniture {
  return {
    x,
    y,
    draw(ctx, room) {
      box(ctx, room, x + 0.15, y + 0.2, 0.7, 0.6, 6, 0, wood);
      box(ctx, room, x + 0.45, y + 0.4, 0.13, 0.13, 4, 6, tones("#f4f4f5"));
      box(ctx, room, x + 0.22, y + 0.55, 0.18, 0.12, 1, 6, tones("#f87171"));
    },
  };
}

function fridge(x: number, y: number): Furniture {
  return {
    x,
    y,
    draw(ctx, room) {
      box(ctx, room, x + 0.1, y + 0.12, 0.8, 0.76, 34, 0, tones("#eef2f6"));
      poly(ctx, [iso(room, x + 0.9, y + 0.25, 30), iso(room, x + 0.9, y + 0.3, 30), iso(room, x + 0.9, y + 0.3, 20), iso(room, x + 0.9, y + 0.25, 20)], "#9aa3b2");
      poly(ctx, [iso(room, x + 0.9, y + 0.12, 22.5), iso(room, x + 0.9, y + 0.88, 22.5), iso(room, x + 0.9, y + 0.88, 21.5), iso(room, x + 0.9, y + 0.12, 21.5)], "#c7ccd6");
    },
  };
}

function lamp(x: number, y: number): Furniture {
  return {
    x,
    y,
    draw(ctx, room, _t, sky) {
      box(ctx, room, x + 0.35, y + 0.35, 0.3, 0.3, 2, 0, tones("#4b5563"));
      box(ctx, room, x + 0.47, y + 0.47, 0.06, 0.06, 22, 2, tones("#4b5563"));
      box(ctx, room, x + 0.28, y + 0.28, 0.44, 0.44, 8, 22, tones(sky === "night" ? "#ffe08a" : "#f7d9a8"));
    },
  };
}

function rug(ctx: CanvasRenderingContext2D, room: Room, x: number, y: number, w: number, d: number, color: string) {
  poly(ctx, [iso(room, x, y), iso(room, x + w, y), iso(room, x + w, y + d), iso(room, x, y + d)], shade(color, -0.15));
  poly(ctx, [iso(room, x + 0.12, y + 0.12), iso(room, x + w - 0.12, y + 0.12), iso(room, x + w - 0.12, y + d - 0.12), iso(room, x + 0.12, y + d - 0.12)], color);
}

function palm(x: number, y: number): Furniture {
  return {
    x,
    y,
    draw(ctx, room, t) {
      for (let i = 0; i < 7; i += 1) {
        box(ctx, room, x + 0.42 - i * 0.025, y + 0.42 + i * 0.01, 0.16, 0.16, 6, i * 6, tones(i % 2 ? "#a8743f" : "#bf8a52"));
      }
      const [cx, cy] = iso(room, x + 0.3, y + 0.5, 44);
      const sway = Math.sin(t * 1.2) * 1.2;
      const frond = (dx: number, dy: number, color: string) => {
        for (let k = 0; k < 7; k += 1) {
          ctx.fillStyle = color;
          ctx.fillRect(Math.round(cx + dx * k + sway * (k / 6)), Math.round(cy + dy * k + (k * k) / 9), 3, 2);
        }
      };
      frond(-2.2, -0.6, "#2f9e57");
      frond(2.2, -0.6, "#2f9e57");
      frond(-1.4, 0.4, "#3fb565");
      frond(1.4, 0.4, "#3fb565");
      frond(0, -1, "#4cc574");
      blob(ctx, cx - 1, cy + 3, 2, "#7a4a24");
      blob(ctx, cx + 3, cy + 3, 2, "#6b3f1e");
    },
  };
}

function umbrella(x: number, y: number, color: string): Furniture {
  return {
    x,
    y,
    draw(ctx, room) {
      const cx = x + 0.5;
      const cy = y + 0.5;
      const [sx, sy] = iso(room, cx, cy);
      ctx.fillStyle = "rgba(120, 80, 30, 0.18)";
      ctx.fillRect(sx - 14, sy - 3, 28, 6);
      box(ctx, room, cx - 0.04, cy - 0.04, 0.08, 0.08, 30, 0, tones("#e5e7eb"));
      const apex = iso(room, cx, cy, 36);
      const n = iso(room, cx, cy - 0.75, 27);
      const e = iso(room, cx + 0.75, cy, 27);
      const s = iso(room, cx, cy + 0.75, 27);
      const w = iso(room, cx - 0.75, cy, 27);
      poly(ctx, [apex, n, e], shade(color, 0.15));
      poly(ctx, [apex, e, s], "#ffffff");
      poly(ctx, [apex, s, w], color);
      poly(ctx, [apex, w, n], "#f3f4f6");
    },
  };
}

function towel(x: number, y: number, color: string): Furniture {
  return {
    x,
    y,
    bias: -0.4,
    draw(ctx, room) {
      poly(ctx, [iso(room, x + 0.12, y + 0.18), iso(room, x + 0.88, y + 0.18), iso(room, x + 0.88, y + 0.82), iso(room, x + 0.12, y + 0.82)], color);
      poly(ctx, [iso(room, x + 0.36, y + 0.18), iso(room, x + 0.5, y + 0.18), iso(room, x + 0.5, y + 0.82), iso(room, x + 0.36, y + 0.82)], "#ffffff");
    },
  };
}

function sandcastle(x: number, y: number): Furniture {
  return {
    x,
    y,
    draw(ctx, room) {
      const sand = tones("#e8bf6a");
      box(ctx, room, x + 0.25, y + 0.25, 0.5, 0.5, 6, 0, sand);
      box(ctx, room, x + 0.3, y + 0.3, 0.18, 0.18, 6, 6, sand);
      box(ctx, room, x + 0.52, y + 0.3, 0.18, 0.18, 6, 6, sand);
      box(ctx, room, x + 0.3, y + 0.52, 0.18, 0.18, 6, 6, sand);
      box(ctx, room, x + 0.52, y + 0.52, 0.18, 0.18, 9, 6, sand);
      const [fx, fy] = iso(room, x + 0.61, y + 0.61, 15);
      ctx.fillStyle = "#6b4a2a";
      ctx.fillRect(fx, fy - 6, 1, 6);
      ctx.fillStyle = "#e2574c";
      ctx.fillRect(fx + 1, fy - 6, 3, 2);
    },
  };
}

function beachBall(x: number, y: number): Furniture {
  return {
    x,
    y,
    draw(ctx, room, t) {
      const [sx, sy] = iso(room, x + 0.5, y + 0.5);
      const hop = Math.abs(Math.sin(t * 2.6)) * 9;
      ctx.fillStyle = "rgba(120, 80, 30, 0.22)";
      ctx.fillRect(sx - 4 + Math.round(hop / 5), sy - 1, 8 - Math.round(hop / 3), 2);
      const by = Math.round(sy - 5 - hop);
      blob(ctx, sx, by, 5, "#ffffff");
      ctx.fillStyle = "#e2574c";
      ctx.fillRect(sx - 4, by - 2, 3, 5);
      ctx.fillStyle = "#2f6fdf";
      ctx.fillRect(sx + 2, by - 2, 3, 5);
      ctx.fillStyle = "#f5b83d";
      ctx.fillRect(sx - 1, by - 5, 2, 3);
    },
  };
}

// Beds are two tiles long: (x, y) and (x + 1, y), pillow at the x end.
export function drawBed(ctx: CanvasRenderingContext2D, room: Room, x: number, y: number) {
  box(ctx, room, x + 0.04, y + 0.1, 1.92, 0.8, 7, 0, darkWood);
  box(ctx, room, x + 0.04, y + 0.1, 0.16, 0.8, 18, 0, darkWood);
  box(ctx, room, x + 0.2, y + 0.12, 1.72, 0.76, 2, 7, tones("#f4f4f5"));
  box(ctx, room, x + 0.24, y + 0.2, 0.36, 0.6, 4, 9, tones("#ffffff"));
}

export function drawBlanket(ctx: CanvasRenderingContext2D, room: Room, x: number, y: number, blanket: string, t: number) {
  const breathe = Math.sin(t * 1.6) > 0 ? 1 : 0;
  box(ctx, room, x + 0.78, y + 0.12, 1.14, 0.76, 6 + breathe, 9, tones(blanket));
  box(ctx, room, x + 0.78, y + 0.12, 0.1, 0.76, 7 + breathe, 9, tones(shade(blanket, 0.4)));
}

// ---------- rooms ----------

function finalize(room: Room, blockedTiles: [number, number][]) {
  blockedTiles.forEach(([x, y]) => room.blocked.add(tileKey(x, y)));
  room.furniture.forEach((f) => {
    if (!room.seats.some((s) => s.x === f.x && s.y === f.y) && (f.bias ?? 0) > -0.3) room.blocked.add(tileKey(f.x, f.y));
  });
  return room;
}

function officeRoom(): Room {
  const g = geometry(8, 7, 58);
  const room: Room = {
    kind: "office",
    ...g,
    furniture: [],
    blocked: new Set(),
    seats: [],
    spots: [
      [1, 6],
      [3, 0],
      [5, 0],
      [1, 4],
      [6, 0],
      [3, 6],
      [5, 6],
    ],
    beds: [],
    door: [0, 5],
    drawBackground(ctx, sky) {
      drawWalls(ctx, room, 52, "#c9d3e3", "#dfe6f0");
      windowRight(ctx, room, 1.2, 2.8, sky, "#f4f7fb");
      windowRight(ctx, room, 4.2, 5.8, sky, "#f4f7fb");
      // whiteboard
      poly(ctx, wallLeft(room, 1.1, 2.9, 16, 40), "#9aa3b2");
      poly(ctx, wallLeft(room, 1.18, 2.82, 18, 38), "#ffffff");
      poly(ctx, wallLeft(room, 1.4, 2.2, 31, 32), "#2f6fdf");
      poly(ctx, wallLeft(room, 1.4, 2.5, 27, 28), "#e2574c");
      poly(ctx, wallLeft(room, 1.4, 1.9, 23, 24), "#2fa36b");
      // clock
      const [cx, cy] = iso(room, 7, 0, 40);
      blob(ctx, cx, cy, 4, "#ffffff");
      ctx.fillStyle = "#334155";
      ctx.fillRect(cx, cy - 3, 1, 3);
      ctx.fillRect(cx, cy, 2, 1);
      doorLeft(ctx, room, 5, "#7c8aa5");
      drawFloor(ctx, room, "#a9b8d0", "#a2b2cb", "#b8c6db", "#7d8ca6");
    },
  };

  const chairColor = "#6d7fa3";
  [1, 3, 5].forEach((y) => {
    [1, 4, 6].forEach((x) => {
      room.furniture.push(chair(x, y, chairColor), desk(x + 1, y));
      room.seats.push({ x, y, face: "fr", height: 8 });
    });
  });
  room.furniture.push(plant(0, 0), shelf(0, 3), cooler(0, 6), printer(7, 0), plant(7, 6));
  return finalize(room, []);
}

function homeRoom(): Room {
  const g = geometry(7, 6, 58);
  const room: Room = {
    kind: "home",
    ...g,
    furniture: [],
    blocked: new Set(),
    seats: [
      { x: 2, y: 0, face: "fl", height: 7 },
      { x: 3, y: 0, face: "fl", height: 7 },
      { x: 1, y: 3, face: "fr", height: 8 },
      { x: 4, y: 3, face: "fr", height: 8 },
      { x: 1, y: 5, face: "fr", height: 8 },
    ],
    spots: [
      [1, 1],
      [5, 1],
      [3, 2],
      [6, 5],
      [3, 5],
      [6, 2],
    ],
    beds: [],
    door: [0, 4],
    drawBackground(ctx, sky) {
      drawWalls(ctx, room, 52, "#f1cdb5", "#f7dfcb");
      windowRight(ctx, room, 4.2, 5.6, sky, "#ffffff");
      // framed picture
      poly(ctx, wallLeft(room, 1.2, 2.2, 24, 38), "#a86c3c");
      poly(ctx, wallLeft(room, 1.28, 2.12, 26, 36), "#8fd0f5");
      poly(ctx, wallLeft(room, 1.28, 2.12, 26, 29), "#5fd17f");
      doorLeft(ctx, room, 4, "#b7794a");
      drawFloor(ctx, room, "#d39b63", "#cc945c", "#dcab78", "#9c6a3d");
      rug(ctx, room, 1.6, 0.9, 3.2, 1.6, "#e9a0b4");
    },
  };

  room.furniture.push(
    sofa(2, 0, "left", "#5b8def"),
    sofa(3, 0, "right", "#5b8def"),
    coffeeTable(2, 1),
    chair(1, 3, "#e2574c"),
    desk(2, 3, true),
    chair(4, 3, "#2fa36b"),
    desk(5, 3, true),
    chair(1, 5, "#8b5cf6"),
    desk(2, 5, true),
    fridge(6, 0),
    plant(0, 0),
    lamp(6, 4)
  );
  return finalize(room, []);
}

function beachRoom(): Room {
  const g = geometry(7, 6, 46);
  const water: [number, number][] = [];
  for (let x = 0; x < 7; x += 1) water.push([x, 0]);
  for (let y = 1; y < 6; y += 1) water.push([0, y]);

  const room: Room = {
    kind: "beach",
    ...g,
    furniture: [],
    blocked: new Set(),
    seats: [
      { x: 3, y: 3, face: "fr", height: 1 },
      { x: 2, y: 4, face: "fl", height: 1 },
      { x: 5, y: 2, face: "fl", height: 1 },
    ],
    spots: [
      [1, 1],
      [3, 1],
      [5, 1],
      [1, 3],
      [4, 4],
      [6, 3],
      [2, 2],
    ],
    beds: [
      [4, 5],
      [1, 5],
    ],
    door: [6, 4],
    drawBackground(ctx) {
      drawFloor(ctx, room, "#f5d796", "#f1d08a", "#f8e2b0", "#c99a52");
    },
    drawAnimated(ctx, t) {
      water.forEach(([x, y]) => {
        const wave = Math.sin(t * 2 + x * 0.9 + y * 0.9);
        poly(ctx, [iso(room, x, y), iso(room, x + 1, y), iso(room, x + 1, y + 1), iso(room, x, y + 1)], wave > 0.3 ? "#5cc2ef" : "#4bb4e6");
        const [sx, sy] = iso(room, x + 0.5, y + 0.5);
        if (wave > 0.75) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(sx - 3, sy - 1, 4, 1);
        }
      });
      // foam where the sea meets the sand
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      const foam = Math.floor(t * 4) % 2;
      for (let x = 1; x < 7; x += 1) {
        const [fx, fy] = iso(room, x + 0.25 + foam * 0.3, 1);
        ctx.fillRect(fx, fy - 1, 3, 1);
      }
      for (let y = 1; y < 6; y += 1) {
        const [fx, fy] = iso(room, 1, y + 0.25 + foam * 0.3);
        ctx.fillRect(fx - 3, fy - 1, 3, 1);
      }
    },
  };

  room.furniture.push(
    towel(3, 3, "#e2574c"),
    towel(2, 4, "#2f6fdf"),
    towel(5, 2, "#f5b83d"),
    umbrella(2, 3, "#e2574c"),
    umbrella(5, 3, "#2fa36b"),
    palm(6, 1),
    sandcastle(1, 2),
    beachBall(4, 2)
  );
  return finalize(room, water);
}

export function createRoom(kind: RoomKind): Room {
  if (kind === "office") return officeRoom();
  if (kind === "home") return homeRoom();
  return beachRoom();
}
