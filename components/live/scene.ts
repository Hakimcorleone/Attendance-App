import { blob, findPath, iso } from "./iso";
import {
  createRoom,
  drawBed,
  drawBlanket,
  drawDrip,
  drawIcePack,
  drawMonitor,
  drawStroller,
  type Facing,
  type Room,
  type RoomKind,
  type Seat,
  type Sky,
} from "./rooms";
import { FOOT_Y, SPRITE_H, SPRITE_W, getSleepingHead, getSprite, getTraits, type Outfit, type Pose } from "./sprites";

// `tag` is extra text for the name label, e.g. "½ AM".
export type Occupant = { name: string; leaveType?: string; tag?: string };

type Agent = {
  name: string;
  leaveType?: string;
  x: number;
  y: number;
  path: [number, number][];
  state: "walk" | "idle" | "sit" | "sleep";
  timer: number;
  face: Facing;
  seat: Seat | null;
  homeSeat: Seat | null;
  bed: [number, number] | null;
  walkClock: number;
  bubble: string | null;
  bubbleUntil: number;
  nextTalk: number;
  label: HTMLDivElement;
  bubbleEl: HTMLDivElement;
  nameEl: HTMLDivElement;
  anchor: [number, number] | null;
  blinkOffset: number;
  stroller: [number, number] | null;
};

const lines: Record<string, string[]> = {
  office: ["Kopi jom ☕", "Meeting kejap lagi", "Deadline hari ni 😵", "Lunch mana? 🍛", "Print jap 🖨️", "Noted 👍", "Email dah reply ✅"],
  home: ["WFH best 😎", "Wifi slow sikit…", "Join Teams jap 💻", "Lapar 🍜", "Kopi O ☕", "On camera ke? 😅"],
  AL: ["Healing 🏖️", "Jangan call 😆", "Air laut sejuk 🌊"],
  RL: ["Rehat jap 😎", "Recharge 🔋", "Hammock best 😴"],
  CL: ["🕊️", "🤍"],
  Others: ["Cuti 🌴", "Chill 😌"],
  MC: ["Ubat dah makan 💊", "Demam… 🤒", "Zzz…", "Nak rehat jap 😷"],
  HL: ["Doktor suruh rehat 🏥", "Drip lagi sejam…", "💤"],
  ML: ["Baby dah tidur 👶", "Shh… 🤫", "Comelnya 🥰"],
  PL: ["Baby tak tidur semalam 😵", "Jalan-jalan jap 🍼", "Pampers mana? 😅"],
  EL: ["Urusan kecemasan ⚡", "Kejap, ada call 📞", "On the way!"],
};

// Leave types that like a particular seat (hammock, bench, rocking chair) most of the time.
const seatLovers = ["RL", "CL", "ML"];

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pickOne = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];
const SPEED = 1.7;
const speedFor = (agent: { leaveType?: string }) => (agent.leaveType === "EL" ? 2.7 : agent.leaveType === "PL" ? 1.2 : SPEED);
// Characters are drawn at 2x so they read like Habbo avatars next to the furniture.
const SCALE = 2;

export class Scene {
  room: Room;
  private overlay: HTMLElement;
  private agents = new Map<string, Agent>();
  private time = 0;
  private sky: Sky;
  private background: HTMLCanvasElement | null = null;
  private hovered: string | null = null;

  constructor(kind: RoomKind, overlay: HTMLElement, sky: Sky) {
    this.room = createRoom(kind);
    this.overlay = overlay;
    this.sky = sky;
  }

  // Pointer position in canvas pixels, or null when it leaves.
  setPointer(point: [number, number] | null) {
    this.hovered = null;
    if (!point) return;
    const [px, py] = point;
    let bestDepth = -Infinity;
    this.agents.forEach((agent) => {
      let hit = false;
      if (agent.state === "sleep" && agent.bed) {
        const [bx, by] = iso(this.room, agent.bed[0] + 0.45, agent.bed[1] + 0.5, 11);
        hit = Math.abs(px - bx) < 16 && Math.abs(py - by) < 14;
      } else if (agent.anchor) {
        const [ax, top] = agent.anchor;
        hit = Math.abs(px - ax) < 13 && py >= top && py <= top + SPRITE_H * SCALE;
      }
      if (hit && agent.x + agent.y > bestDepth) {
        bestDepth = agent.x + agent.y;
        this.hovered = agent.name;
      }
    });
  }

  setSky(sky: Sky) {
    if (sky === this.sky) return;
    this.sky = sky;
    this.background = null;
  }

  destroy() {
    this.agents.forEach((agent) => agent.label.remove());
    this.agents.clear();
  }

  setPeople(people: Occupant[], initial: boolean) {
    const names = new Set(people.map((p) => p.name));
    this.agents.forEach((agent, name) => {
      if (!names.has(name)) {
        agent.label.remove();
        this.agents.delete(name);
      }
    });

    people.forEach((person) => {
      const existing = this.agents.get(person.name);
      if (existing) {
        if (existing.leaveType === person.leaveType) {
          existing.nameEl.textContent = this.labelText(person);
          return;
        }
        existing.label.remove();
        this.agents.delete(person.name);
      }
      this.addAgent(person, initial);
    });
  }

  private labelText(person: Occupant) {
    return person.tag ? `${person.name} · ${person.tag}` : person.name;
  }

  private isResting() {
    return this.room.kind === "clinic";
  }

  private addAgent(person: Occupant, initial: boolean) {
    const label = document.createElement("div");
    label.className = "hv-agent";
    const bubbleEl = document.createElement("div");
    bubbleEl.className = "hv-bubble";
    const nameEl = document.createElement("div");
    nameEl.className = "hv-name";
    nameEl.textContent = this.labelText(person);
    label.append(bubbleEl, nameEl);
    this.overlay.append(label);

    const [dx, dy] = this.room.door;
    const agent: Agent = {
      name: person.name,
      leaveType: person.leaveType,
      x: dx + 0.5,
      y: dy + 0.5,
      path: [],
      state: "idle",
      timer: rand(0.5, 2),
      face: "fl",
      seat: null,
      homeSeat: null,
      bed: null,
      walkClock: 0,
      bubble: null,
      bubbleUntil: 0,
      nextTalk: this.time + rand(2, 10),
      label,
      bubbleEl,
      nameEl,
      anchor: null,
      blinkOffset: Math.random() * 4,
      stroller: null,
    };
    this.agents.set(person.name, agent);
    if (person.leaveType === "PL" && this.room.kind === "family") agent.stroller = [agent.x + 0.6, agent.y];

    if (this.isResting()) {
      const bed = this.room.beds.find(([bx, by]) => ![...this.agents.values()].some((a) => a.bed && a.bed[0] === bx && a.bed[1] === by));
      if (bed) {
        agent.bed = bed;
        agent.state = "sleep";
        agent.x = bed[0] + 0.5;
        agent.y = bed[1] + 0.5;
        return;
      }
    }

    if (this.room.kind === "office") {
      agent.homeSeat = this.room.seats.find((s) => ![...this.agents.values()].some((a) => a.homeSeat === s)) ?? null;
    }

    // EL is always on the move and PL starts out pushing the pram.
    const walker = agent.leaveType === "EL" || agent.leaveType === "PL";
    const seat = agent.homeSeat ?? (this.room.kind === "office" || walker ? null : this.favouriteSeat(agent) ?? this.freeSeat(agent));
    if (initial) {
      if (seat) {
        this.sitDown(agent, seat);
        agent.timer = rand(2, 14);
      } else {
        const [sx, sy] = this.freeSpot(agent);
        agent.x = sx + 0.5;
        agent.y = sy + 0.5;
        agent.face = pickOne<Facing>(["fl", "fr"]);
        agent.timer = rand(1, 6);
        if (agent.stroller) agent.stroller = agent.face === "fr" ? [agent.x + 0.6, agent.y] : [agent.x, agent.y + 0.6];
      }
    } else if (seat) {
      this.goTo(agent, [seat.x, seat.y], seat);
    } else {
      this.goTo(agent, this.freeSpot(agent), null);
    }
  }

  private occupiedTiles(except: Agent) {
    const taken = new Set<string>();
    this.agents.forEach((a) => {
      if (a === except) return;
      if (a.seat) taken.add(`${a.seat.x},${a.seat.y}`);
      if (a.path.length) {
        const [tx, ty] = a.path[a.path.length - 1];
        taken.add(`${tx},${ty}`);
      } else {
        taken.add(`${Math.floor(a.x)},${Math.floor(a.y)}`);
      }
    });
    return taken;
  }

  private freeSeat(agent: Agent) {
    const taken = this.occupiedTiles(agent);
    const reserved = new Set([...this.agents.values()].filter((a) => a !== agent && a.homeSeat).map((a) => a.homeSeat));
    const options = this.room.seats.filter(
      (s) => !taken.has(`${s.x},${s.y}`) && !reserved.has(s) && (!s.for || s.for.includes(agent.leaveType ?? ""))
    );
    return options.length ? pickOne(options) : null;
  }

  // A seat made for this leave type (hammock for RL, bench for CL, rocking chair for ML).
  private favouriteSeat(agent: Agent) {
    if (!seatLovers.includes(agent.leaveType ?? "")) return null;
    const taken = this.occupiedTiles(agent);
    return this.room.seats.find((s) => s.for?.includes(agent.leaveType ?? "") && !taken.has(`${s.x},${s.y}`)) ?? null;
  }

  private freeSpot(agent: Agent): [number, number] {
    const taken = this.occupiedTiles(agent);
    const options = this.room.spots.filter(([x, y]) => !taken.has(`${x},${y}`));
    return options.length ? pickOne(options) : pickOne(this.room.spots);
  }

  private blockedTiles() {
    return this.room.blocked;
  }

  private goTo(agent: Agent, target: [number, number], seat: Seat | null) {
    const from: [number, number] = [Math.floor(agent.x), Math.floor(agent.y)];
    const path = findPath(this.room.cols, this.room.rows, this.blockedTiles(), from, target);
    agent.seat = seat;
    if (!path.length && (from[0] !== target[0] || from[1] !== target[1])) {
      agent.state = "idle";
      agent.timer = rand(1, 3);
      return;
    }
    agent.path = path;
    agent.state = "walk";
    if (!path.length) this.arrive(agent);
  }

  private sitDown(agent: Agent, seat: Seat) {
    agent.seat = seat;
    agent.x = seat.x + 0.5;
    agent.y = seat.y + 0.5;
    agent.face = seat.face;
    agent.state = "sit";
  }

  private arrive(agent: Agent) {
    agent.path = [];
    if (agent.seat && Math.floor(agent.x) === agent.seat.x && Math.floor(agent.y) === agent.seat.y) {
      this.sitDown(agent, agent.seat);
      agent.timer = this.room.kind === "office" ? rand(10, 24) : seatLovers.includes(agent.leaveType ?? "") ? rand(14, 28) : rand(7, 16);
    } else {
      agent.seat = null;
      agent.state = "idle";
      agent.face = pickOne<Facing>(["fl", "fr"]);
      agent.timer = agent.leaveType === "EL" ? rand(0.6, 1.6) : rand(2, 5);
    }
  }

  private decide(agent: Agent) {
    const kind = this.room.kind;
    if (kind === "office") {
      if (agent.state === "sit" && Math.random() < 0.55) {
        agent.timer = rand(8, 18);
        return;
      }
      if (agent.state === "idle" && agent.homeSeat && Math.random() < 0.75) {
        this.goTo(agent, [agent.homeSeat.x, agent.homeSeat.y], agent.homeSeat);
        return;
      }
      this.goTo(agent, this.freeSpot(agent), null);
      return;
    }

    if (agent.leaveType === "EL") {
      // always on the move
      this.goTo(agent, this.freeSpot(agent), null);
      return;
    }
    const favourite = this.favouriteSeat(agent);
    if (favourite && Math.random() < 0.8) {
      this.goTo(agent, [favourite.x, favourite.y], favourite);
      return;
    }
    if (agent.state === "sit" && Math.random() < 0.35) {
      agent.timer = rand(6, 12);
      return;
    }
    const seat = Math.random() < (agent.leaveType === "PL" ? 0.25 : 0.55) ? this.freeSeat(agent) : null;
    if (seat) this.goTo(agent, [seat.x, seat.y], seat);
    else this.goTo(agent, this.freeSpot(agent), null);
  }

  update(dt: number) {
    this.time += dt;
    let talking = 0;
    this.agents.forEach((a) => {
      if (a.bubble) talking += 1;
    });

    this.agents.forEach((agent) => {
      if (agent.bubble && this.time > agent.bubbleUntil) {
        agent.bubble = null;
        talking -= 1;
      }
      if (!agent.bubble && this.time > agent.nextTalk) {
        if (talking < (this.room.kind === "office" ? 2 : 1) && dt > 0) {
          const key = this.room.kind === "office" || this.room.kind === "home" ? this.room.kind : agent.leaveType ?? "Others";
          agent.bubble = pickOne(lines[key] ?? lines.Others);
          agent.bubbleUntil = this.time + 3.6;
          talking += 1;
        }
        agent.nextTalk = this.time + rand(7, 16);
      }

      if (agent.state === "sleep" || dt === 0) return;

      if (agent.state === "walk") {
        agent.walkClock += dt;
        let budget = speedFor(agent) * dt;
        while (budget > 0 && agent.path.length) {
          const [tx, ty] = agent.path[0];
          const cx = tx + 0.5;
          const cy = ty + 0.5;
          const ddx = cx - agent.x;
          const ddy = cy - agent.y;
          if (Math.abs(ddx) > 0.001) agent.face = ddx > 0 ? "fr" : "bl";
          else if (Math.abs(ddy) > 0.001) agent.face = ddy > 0 ? "fl" : "br";
          const dist = Math.abs(ddx) + Math.abs(ddy);
          if (dist <= budget) {
            agent.x = cx;
            agent.y = cy;
            agent.path.shift();
            budget -= dist;
          } else {
            agent.x += Math.sign(ddx) * Math.min(Math.abs(ddx), budget);
            agent.y += Math.abs(ddx) > 0.001 ? 0 : Math.sign(ddy) * Math.min(Math.abs(ddy), budget);
            budget = 0;
          }
        }
        if (agent.stroller) {
          const [ox, oy] = { fr: [0.6, 0], fl: [0, 0.6], bl: [-0.6, 0], br: [0, -0.6] }[agent.face];
          agent.stroller = [agent.x + ox, agent.y + oy];
        }
        if (!agent.path.length) this.arrive(agent);
        return;
      }

      agent.timer -= dt;
      if (agent.timer <= 0) this.decide(agent);
    });
  }

  private renderBackground() {
    const canvas = document.createElement("canvas");
    canvas.width = this.room.width;
    canvas.height = this.room.height;
    this.room.drawBackground(canvas.getContext("2d")!, this.sky);
    this.background = canvas;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const { room } = this;
    if (!this.background) this.renderBackground();
    ctx.clearRect(0, 0, room.width, room.height);
    ctx.drawImage(this.background!, 0, 0);
    room.drawAnimated?.(ctx, this.time, this.sky);

    type Drawable = { key: number; draw: () => void };
    const items: Drawable[] = room.furniture.map((f) => ({
      key: f.x + f.y + 1 + (f.bias ?? 0),
      draw: () => f.draw(ctx, room, this.time, this.sky),
    }));

    room.beds.forEach(([bx, by]) => {
      const sleeper = [...this.agents.values()].find((a) => a.bed && a.bed[0] === bx && a.bed[1] === by);
      items.push({
        key: bx + by + 2,
        draw: () => {
          if (sleeper?.leaveType === "HL") drawMonitor(ctx, room, by, this.time);
          drawBed(ctx, room, bx, by);
          if (sleeper) {
            const [px, py] = iso(room, bx + 0.45, by + 0.5, 11);
            ctx.drawImage(getSleepingHead(sleeper.name), Math.round(px - SPRITE_W), Math.round(py - 16), SPRITE_W * SCALE, SPRITE_H * SCALE);
            if (sleeper.leaveType === "MC") drawIcePack(ctx, px, py - 16);
            drawBlanket(ctx, room, bx, by, room.kind === "clinic" ? "#8ec5e6" : getTraits(sleeper.name).beach, this.time);
            if (sleeper.leaveType === "HL") drawDrip(ctx, room, bx, by, this.time);
          } else {
            drawBlanket(ctx, room, bx, by, "#cfe3ef", 0);
          }
        },
      });
    });

    this.agents.forEach((agent) => {
      if (agent.stroller) {
        const [sx, sy] = agent.stroller;
        items.push({ key: sx + sy, draw: () => drawStroller(ctx, room, sx, sy) });
      }
      if (agent.state === "sleep") return;
      items.push({ key: agent.x + agent.y, draw: () => this.drawAgent(ctx, agent) });
    });

    items.sort((a, b) => a.key - b.key);
    items.forEach((item) => item.draw());

    if (this.sky !== "day") {
      ctx.fillStyle = this.sky === "night" ? "rgba(16, 20, 64, 0.38)" : "rgba(255, 140, 90, 0.12)";
      ctx.fillRect(0, 0, room.width, room.height);
      if (this.sky === "night") this.drawLights(ctx);
    }

    this.placeLabels();
  }

  private drawLights(ctx: CanvasRenderingContext2D) {
    const { room } = this;
    const glow = (gx: number, gy: number, z: number, r: number, color: string) => {
      const [x, y] = iso(room, gx, gy, z);
      blob(ctx, x, y, r, color);
    };
    if (room.kind === "office") {
      room.seats.forEach((s) => glow(s.x + 1.2, s.y + 0.5, 20, 4, "rgba(147, 197, 253, 0.28)"));
    }
    if (room.kind === "clinic") {
      this.agents.forEach((a) => {
        if (a.bed && a.leaveType === "HL") glow(0, a.bed[1] + 0.5, 35, 5, "rgba(74, 222, 128, 0.3)");
      });
    }
    if (room.kind === "family") {
      glow(0.5, 2.5, 26, 12, "rgba(255, 214, 120, 0.16)");
      glow(1.5, 0.5, 10, 8, "rgba(249, 168, 212, 0.18)");
    }
    if (room.kind === "home") {
      glow(6.5, 4.5, 26, 14, "rgba(255, 214, 120, 0.16)");
      glow(6.5, 4.5, 26, 7, "rgba(255, 224, 150, 0.25)");
      room.seats.filter((s) => s.face === "fr").forEach((s) => glow(s.x + 1.3, s.y + 0.5, 18, 3, "rgba(147, 197, 253, 0.3)"));
    }
  }

  private drawAgent(ctx: CanvasRenderingContext2D, agent: Agent) {
    const [fx, fy] = iso(this.room, agent.x, agent.y);
    const view = agent.face === "fr" || agent.face === "fl" ? "front" : "back";
    const facing = agent.face === "fr" ? 1 : agent.face === "fl" ? -1 : 0;
    const walking = agent.state === "walk";
    const frame = walking ? Math.floor(agent.walkClock * 7) % 4 : 0;
    const pose: Pose = agent.state === "sit" ? "sit" : walking ? (["walk1", "stand", "walk2", "stand"] as Pose[])[frame] : "stand";
    const outfit: Outfit = this.room.kind === "office" ? "formal" : this.room.kind === "beach" ? "beach" : "casual";
    const blink = (this.time + agent.blinkOffset) % 4 < 0.14;
    const sprite = getSprite(agent.name, view, facing, pose, outfit, blink);

    let top: number;
    if (agent.state === "sit" && agent.seat) {
      top = fy - agent.seat.height - 21 * SCALE + (agent.seat.rock ? Math.round(Math.sin(this.time * 2.5)) : 0);
    } else {
      top = fy - FOOT_Y * SCALE + (walking && frame % 2 ? -1 : 0);
      ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
      ctx.fillRect(Math.round(fx - 8), Math.round(fy - 2), 16, 3);
    }
    const left = Math.round(fx - (SPRITE_W * SCALE) / 2);
    ctx.drawImage(sprite, left, Math.round(top), SPRITE_W * SCALE, SPRITE_H * SCALE);

    if (agent.leaveType === "ML" && agent.state === "sit") {
      // baby in arms
      blob(ctx, fx, top + 32, 5, "#ffffff");
      blob(ctx, fx + 1, top + 33, 3, "#f9c9d9");
      blob(ctx, fx - 4, top + 29, 3, "#f1cfae");
    }
    if (agent.leaveType === "EL") {
      // phone to the ear and a bouncing "!"
      ctx.fillStyle = "#1f2937";
      ctx.fillRect(Math.round(fx + 9), Math.round(top + 12), 3, 7);
      const hop = Math.round(Math.abs(Math.sin(this.time * 6)) * 2);
      const ex = Math.round(fx - 1);
      const ey = Math.round(top - 12 - hop);
      ctx.fillStyle = "#7f1d1d";
      ctx.fillRect(ex - 1, ey - 1, 4, 9);
      ctx.fillRect(ex - 1, ey + 9, 4, 4);
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(ex, ey, 2, 7);
      ctx.fillRect(ex, ey + 10, 2, 2);
    }

    agent.anchor = [fx, agent.leaveType === "EL" ? top - 14 : top];
  }

  private placeLabels() {
    const { width, height } = this.room;
    this.overlay.classList.toggle("is-crowded", this.agents.size > 5);
    this.agents.forEach((agent) => {
      agent.label.classList.toggle("is-hover", agent.name === this.hovered);
      agent.label.classList.toggle("has-bubble", Boolean(agent.bubble));
      let ax: number;
      let ay: number;
      if (agent.state === "sleep" && agent.bed) {
        [ax, ay] = iso(this.room, agent.bed[0] + 0.45, agent.bed[1] + 0.5, 34);
      } else {
        if (!agent.anchor) return;
        [ax, ay] = agent.anchor;
      }
      agent.label.style.left = `${(ax / width) * 100}%`;
      agent.label.style.top = `${((ay - 1) / height) * 100}%`;
      agent.label.style.zIndex = String(Math.round((agent.x + agent.y) * 10));
      if (agent.bubble) {
        agent.bubbleEl.textContent = agent.bubble;
        agent.bubbleEl.classList.add("is-on");
      } else {
        agent.bubbleEl.classList.remove("is-on");
      }
    });
  }
}
