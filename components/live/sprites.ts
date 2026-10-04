import { shade } from "./iso";

// Habbo-style pixel avatars, drawn procedurally from a few traits per person.

export type HairStyle = "short" | "side" | "messy" | "long" | "hijab";
export type Beard = "full" | "goatee" | "stubble";

export type Traits = {
  skin: string;
  hair: string;
  style: HairStyle;
  glasses?: boolean;
  beard?: Beard;
  coat: string;
  inner: string;
  tie?: string;
  pants: string;
  casual: string;
  beach: string;
};

// Outfit follows where the person is today.
export type Outfit = "formal" | "casual" | "beach";

export type View = "front" | "back";
export type Pose = "stand" | "walk1" | "walk2" | "sit";

const teamTraits: Record<string, Traits> = {
  Zahran: { skin: "#d9a47a", hair: "#a3a7ad", style: "short", glasses: true, beard: "goatee", coat: "#3d4250", inner: "#dbe7f5", tie: "#3b5bdb", pants: "#2b2f3a", casual: "#5b7bb5", beach: "#2fa3a3" },
  Sheela: { skin: "#b97f56", hair: "#221b1e", style: "long", coat: "#2c2f3a", inner: "#bcd7f2", pants: "#2c2f3a", casual: "#c2417a", beach: "#f2766b" },
  Nurshafiqah: { skin: "#ecc29b", hair: "#2a2930", style: "hijab", coat: "#4a4e5c", inner: "#2a2930", pants: "#2c2f3a", casual: "#8b7bd8", beach: "#f5b83d" },
  Syed: { skin: "#d6a175", hair: "#1d1a1a", style: "side", coat: "#262b3b", inner: "#eef2f7", tie: "#5a6c9f", pants: "#262b3b", casual: "#2fa36b", beach: "#5b8def" },
  Jeff: { skin: "#f1cfae", hair: "#4a3328", style: "messy", glasses: true, coat: "#25272f", inner: "#7a3442", pants: "#30343f", casual: "#e2574c", beach: "#ff8c42" },
  Hakim: { skin: "#b98058", hair: "#1a1616", style: "short", glasses: true, beard: "full", coat: "#363a44", inner: "#eef2f7", tie: "#33457a", pants: "#2b2f3a", casual: "#4b5563", beach: "#22a6b3" },
  Azam: { skin: "#e2b48c", hair: "#1a1616", style: "short", glasses: true, beard: "stubble", coat: "#24398a", inner: "#eef2f7", tie: "#3c6be0", pants: "#1f2b5c", casual: "#3c6be0", beach: "#e2574c" },
  Azizah: { skin: "#f0cba6", hair: "#2b3a63", style: "hijab", glasses: true, coat: "#2b3a63", inner: "#f5f5f5", pants: "#232c4a", casual: "#d97798", beach: "#8fd0f5" },
  Natasha: { skin: "#e8bf98", hair: "#79a7d8", style: "hijab", coat: "#25272f", inner: "#bcd7f2", pants: "#25272f", casual: "#f5b83d", beach: "#a78bfa" },
};

const fallbackSkins = ["#f1cfae", "#e2b48c", "#d39a6e", "#b97f56"];
const fallbackHair = ["#1d1a1a", "#4a3328", "#7a4b2a", "#2b3a63"];
const fallbackStyles: HairStyle[] = ["short", "side", "messy", "long", "hijab"];
const fallbackCoats = ["#2f6fdf", "#e2574c", "#2fa36b", "#8b5cf6", "#e38b1b", "#0e9fbf"];

function hashName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return hash;
}

export function getTraits(name: string): Traits {
  if (teamTraits[name]) return teamTraits[name];
  const h = hashName(name);
  return {
    skin: fallbackSkins[h % fallbackSkins.length],
    hair: fallbackHair[(h >> 3) % fallbackHair.length],
    style: fallbackStyles[(h >> 5) % fallbackStyles.length],
    glasses: (h >> 7) % 3 === 0,
    coat: "#363a44",
    inner: "#eef2f7",
    pants: "#2b2f3a",
    casual: fallbackCoats[(h >> 9) % fallbackCoats.length],
    beach: fallbackCoats[(h >> 11) % fallbackCoats.length],
  };
}

export const SPRITE_W = 14;
export const SPRITE_H = 26;
// Pixel row the feet stand on (bottom outline row).
export const FOOT_Y = 25;
const HY = 2; // top row of the head

const EYE = "#2b2433";
const FRAME = "#2a2a36";
const LENS = "#dbe8f6";

type Grid = string[];

function makeGrid(): Grid {
  return new Array(SPRITE_W * SPRITE_H).fill("");
}

function set(grid: Grid, x: number, y: number, color: string) {
  if (x < 0 || y < 0 || x >= SPRITE_W || y >= SPRITE_H) return;
  grid[y * SPRITE_W + x] = color;
}

function get(grid: Grid, x: number, y: number) {
  if (x < 0 || y < 0 || x >= SPRITE_W || y >= SPRITE_H) return "";
  return grid[y * SPRITE_W + x];
}

function row(grid: Grid, y: number, from: number, to: number, color: string) {
  for (let x = from; x <= to; x += 1) set(grid, x, y, color);
}

function centered(grid: Grid, y: number, width: number, color: string) {
  row(grid, y, 7 - width / 2, 6 + width / 2, color);
}

const headWidths = [6, 8, 10, 10, 10, 10, 10, 8, 6];

function drawHead(grid: Grid, t: Traits, view: View, facing: number, closedEyes = false) {
  const hijab = t.style === "hijab";

  if (hijab) {
    centered(grid, HY, 6, t.hair);
    centered(grid, HY + 1, 8, t.hair);
    for (let r = 2; r <= 8; r += 1) centered(grid, HY + r, 12, t.hair);
  } else {
    headWidths.forEach((w, r) => centered(grid, HY + r, w, t.skin));
  }

  if (view === "back") {
    if (hijab) return;
    for (let r = 0; r <= 7; r += 1) centered(grid, HY + r, headWidths[r], t.hair);
    if (t.style === "long") {
      for (let y = HY + 3; y <= HY + 11; y += 1) row(grid, y, 1, 12, t.hair);
    }
    return;
  }

  if (hijab) {
    // face window
    row(grid, HY + 3, 4, 9, t.skin);
    for (let r = 4; r <= 7; r += 1) row(grid, HY + r, 3, 10, t.skin);
    row(grid, HY + 8, 4, 9, t.skin);
  } else {
    // hair on top
    centered(grid, HY, 6, t.hair);
    centered(grid, HY + 1, 8, t.hair);
    centered(grid, HY + 2, 10, t.hair);
    if (t.style === "side") {
      row(grid, HY + 3, 2, 6, t.hair);
      set(grid, 11, HY + 3, t.hair);
    } else if (t.style === "messy") {
      [3, 5, 8, 10].forEach((x) => set(grid, x, HY - 1, t.hair));
      [2, 3, 5, 8, 10, 11].forEach((x) => set(grid, x, HY + 3, t.hair));
    } else {
      [2, 3, 10, 11].forEach((x) => set(grid, x, HY + 3, t.hair));
    }
    set(grid, 2, HY + 4, t.hair);
    set(grid, 11, HY + 4, t.hair);
    if (t.style === "long") {
      for (let y = HY + 3; y <= HY + 11; y += 1) {
        set(grid, 1, y, t.hair);
        set(grid, 2, y, t.hair);
        set(grid, 11, y, t.hair);
        set(grid, 12, y, t.hair);
      }
    }
  }

  const e1 = 5 + facing;
  const e2 = 8 + facing;
  const mouth = shade(t.skin, -0.32);

  if (t.beard) {
    const color = t.beard === "stubble" ? shade(t.hair, 0.45) : t.hair;
    if (t.beard === "goatee") {
      set(grid, 5 + facing, HY + 7, color);
      set(grid, 8 + facing, HY + 7, color);
      row(grid, HY + 8, 5 + facing, 8 + facing, color);
    } else {
      [2, 11].forEach((x) => set(grid, x, HY + 5, color));
      [2, 3, 10, 11].forEach((x) => set(grid, x, HY + 6, color));
      row(grid, HY + 7, 3, 10, color);
      row(grid, HY + 8, 4, 9, color);
    }
  }

  if (closedEyes) {
    row(grid, HY + 5, e1 - 1, e1, mouth);
    row(grid, HY + 5, e2, e2 + 1, mouth);
  } else if (t.glasses) {
    row(grid, HY + 4, e1 - 1, e2 + 1, FRAME);
    row(grid, HY + 5, e1 - 1, e1 + 1, LENS);
    row(grid, HY + 5, e2 - 1, e2 + 1, LENS);
    set(grid, e1, HY + 5, EYE);
    set(grid, e2, HY + 5, EYE);
  } else {
    set(grid, e1, HY + 4, EYE);
    set(grid, e1, HY + 5, EYE);
    set(grid, e2, HY + 4, EYE);
    set(grid, e2, HY + 5, EYE);
  }

  row(grid, HY + 7, 6 + facing, 7 + facing, mouth);
}

function drawBody(grid: Grid, t: Traits, view: View, pose: Pose, outfit: Outfit) {
  const modest = t.style === "hijab";
  const top = outfit === "formal" ? t.coat : outfit === "casual" ? t.casual : t.beach;
  const sleeve = shade(top, -0.12);
  const shortSleeves = outfit !== "formal" && !modest;

  // neck, torso, arms, hands
  row(grid, 11, 6, 7, shade(t.skin, -0.12));
  for (let y = 12; y <= 19; y += 1) row(grid, y, 3, 10, top);
  for (let y = 13; y <= 18; y += 1) {
    const color = shortSleeves && y >= 16 ? t.skin : sleeve;
    set(grid, 2, y, color);
    set(grid, 11, y, color);
  }
  set(grid, 2, 19, t.skin);
  set(grid, 11, 19, t.skin);

  if (outfit === "formal" && view === "front") {
    row(grid, 12, 5, 8, t.inner);
    if (t.tie) {
      for (let y = 13; y <= 17; y += 1) row(grid, y, 6, 7, t.tie);
    } else {
      for (let y = 13; y <= 18; y += 1) row(grid, y, 6, 7, t.inner);
    }
  } else if (outfit === "casual" && view === "front") {
    // little chest print on the tee
    row(grid, 14, 5, 6, shade(top, 0.45));
  } else if (outfit === "beach") {
    // flower-print holiday shirt
    const flower = shade(top, 0.6);
    [
      [4, 13],
      [8, 14],
      [5, 16],
      [9, 17],
      [3, 18],
      [7, 18],
    ].forEach(([x, y]) => set(grid, x, y, flower));
    if (view === "front") row(grid, 12, 6, 7, shade(top, -0.25));
  }

  if (t.style === "hijab") {
    // drape over the shoulders
    for (let y = 11; y <= 13; y += 1) row(grid, y, 2, 11, t.hair);
    row(grid, 14, 4, 9, t.hair);
  }

  // hips + legs
  const pants = outfit === "formal" ? t.pants : outfit === "casual" ? "#3d5a8a" : modest ? "#e6dfd0" : "#f0e2b6";
  const shorts = outfit === "beach" && !modest;
  row(grid, 20, 3, 10, pants);
  const shoe = outfit === "beach" ? "#8a5a32" : outfit === "casual" ? "#f4f4f5" : "#1f1c24";

  if (pose === "sit") {
    row(grid, 21, 3, 10, shade(pants, -0.1));
    return;
  }

  const leftLift = pose === "walk1" ? 1 : 0;
  const rightLift = pose === "walk2" ? 1 : 0;
  for (let y = 21; y <= 23 - leftLift; y += 1) row(grid, y, 3, 5, shorts && y >= 22 ? t.skin : pants);
  for (let y = 21; y <= 23 - rightLift; y += 1) row(grid, y, 8, 10, shorts && y >= 22 ? t.skin : pants);
  row(grid, 24 - leftLift, 3, 5, shoe);
  row(grid, 24 - rightLift, 8, 10, shoe);
}

function finish(grid: Grid) {
  // soft shading on right-hand edges
  const shaded = grid.slice();
  for (let y = 0; y < SPRITE_H; y += 1) {
    for (let x = 0; x < SPRITE_W; x += 1) {
      const c = get(grid, x, y);
      if (c && !get(grid, x + 1, y)) shaded[y * SPRITE_W + x] = shade(c, -0.14);
    }
  }

  // dark outline around everything
  const out = shaded.slice();
  for (let y = 0; y < SPRITE_H; y += 1) {
    for (let x = 0; x < SPRITE_W; x += 1) {
      if (get(shaded, x, y)) continue;
      const neighbour = get(shaded, x, y + 1) || get(shaded, x, y - 1) || get(shaded, x - 1, y) || get(shaded, x + 1, y);
      if (neighbour) out[y * SPRITE_W + x] = shade(neighbour, -0.62);
    }
  }
  return out;
}

function toCanvas(grid: Grid) {
  const canvas = document.createElement("canvas");
  canvas.width = SPRITE_W;
  canvas.height = SPRITE_H;
  const ctx = canvas.getContext("2d")!;
  grid.forEach((color, i) => {
    if (!color) return;
    ctx.fillStyle = color;
    ctx.fillRect(i % SPRITE_W, Math.floor(i / SPRITE_W), 1, 1);
  });
  return canvas;
}

const cache = new Map<string, HTMLCanvasElement>();

export function getSprite(name: string, view: View, facing: number, pose: Pose, outfit: Outfit, blink = false) {
  const key = `${name}|${view}|${facing}|${pose}|${outfit}|${blink}`;
  let sprite = cache.get(key);
  if (!sprite) {
    const traits = getTraits(name);
    const grid = makeGrid();
    drawBody(grid, traits, view, pose, outfit);
    drawHead(grid, traits, view, view === "front" ? facing : 0, blink);
    sprite = toCanvas(finish(grid));
    cache.set(key, sprite);
  }
  return sprite;
}

// Head only, eyes closed — used for people asleep in bed.
export function getSleepingHead(name: string) {
  const key = `${name}|sleep`;
  let sprite = cache.get(key);
  if (!sprite) {
    const traits = getTraits(name);
    const grid = makeGrid();
    drawHead(grid, traits, "front", 0, true);
    for (let y = HY + 9; y < SPRITE_H; y += 1) row(grid, y, 0, SPRITE_W - 1, "");
    sprite = toCanvas(finish(grid));
    cache.set(key, sprite);
  }
  return sprite;
}
