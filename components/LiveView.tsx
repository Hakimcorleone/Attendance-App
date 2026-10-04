"use client";

import { useEffect, useRef } from "react";
import type { RoomKind, Sky } from "./live/rooms";
import { Scene, type Occupant } from "./live/scene";

type LeaveEntry = {
  name: string;
  leave_type: string;
  note: string | null;
};

type LiveViewProps = {
  inOffice: string[];
  wfh: string[];
  leave: LeaveEntry[];
  hour: number;
};

function getSky(hour: number): Sky {
  if (hour >= 19 || hour < 6) return "night";
  if (hour >= 17) return "dusk";
  return "day";
}

export default function LiveView({ inOffice, wfh, leave, hour }: LiveViewProps) {
  const sky = getSky(hour);

  return (
    <div className={`hv-world sky-${sky}`}>
      <RoomCard
        kind="office"
        title="Office"
        icon="🏢"
        sky={sky}
        people={inOffice.map((name) => ({ name }))}
        empty="Office kosong… 🦗"
      />
      <RoomCard
        kind="home"
        title="WFH"
        icon="🏠"
        sky={sky}
        people={wfh.map((name) => ({ name }))}
        empty="Semua masuk office 💪"
      />
      <RoomCard
        kind="beach"
        title="Cuti"
        icon="🌴"
        sky={sky}
        people={leave.map((record) => ({ name: record.name, leaveType: record.leave_type }))}
        empty="Takde yang cuti hari ni"
      />
      <LiveViewStyles />
    </div>
  );
}

function RoomCard({
  kind,
  title,
  icon,
  sky,
  people,
  empty,
}: {
  kind: RoomKind;
  title: string;
  icon: string;
  sky: Sky;
  people: Occupant[];
  empty: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<Scene | null>(null);
  const peopleRef = useRef(people);
  const skyRef = useRef(sky);
  peopleRef.current = people;
  skyRef.current = sky;
  const peopleKey = people.map((p) => `${p.name}:${p.leaveType ?? ""}`).join("|");

  useEffect(() => {
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (!canvas || !overlay) return;

    const scene = new Scene(kind, overlay, skyRef.current);
    sceneRef.current = scene;
    canvas.width = scene.room.width;
    canvas.height = scene.room.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    scene.setPeople(peopleRef.current, true);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let visible = true;
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    observer.observe(canvas);

    let raf = 0;
    let last = performance.now();
    let pending = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      pending += Math.min(0.1, (now - last) / 1000);
      last = now;
      // ~20fps is plenty for chunky pixel art and keeps it light on phones
      if (pending < 0.05 || !visible || document.hidden) return;
      scene.update(reduceMotion ? 0 : pending);
      scene.draw(ctx);
      pending = 0;
    };

    const toCanvas = (event: PointerEvent): [number, number] => {
      const rect = canvas.getBoundingClientRect();
      return [((event.clientX - rect.left) / rect.width) * canvas.width, ((event.clientY - rect.top) / rect.height) * canvas.height];
    };
    const onMove = (event: PointerEvent) => scene.setPointer(toCanvas(event));
    const onLeave = () => scene.setPointer(null);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onMove);
    canvas.addEventListener("pointerleave", onLeave);

    scene.update(0);
    scene.draw(ctx);
    raf = requestAnimationFrame(tick);

    return () => {
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
      observer.disconnect();
      scene.destroy();
      sceneRef.current = null;
    };
  }, [kind]);

  useEffect(() => {
    sceneRef.current?.setPeople(peopleRef.current, false);
  }, [peopleKey]);

  useEffect(() => {
    sceneRef.current?.setSky(sky);
  }, [sky]);

  return (
    <section className={`hv-card hv-${kind}`}>
      <header className="hv-titlebar">
        <span>
          {icon} {title}
        </span>
        <b>{people.length}</b>
      </header>
      <div className="hv-stage">
        <div className="hv-canvas-wrap">
          <canvas ref={canvasRef} className="hv-canvas" />
          <div ref={overlayRef} className="hv-overlay" />
          {people.length === 0 && <div className="hv-empty">{empty}</div>}
        </div>
      </div>
    </section>
  );
}

function LiveViewStyles() {
  return (
    <style jsx global>{`
      .hv-world {
        display: grid;
        grid-template-columns: 252fr 220fr 220fr;
        gap: 14px;
        align-items: stretch;
      }

      .hv-card {
        display: flex;
        flex-direction: column;
        min-width: 0;
        border-radius: 16px;
        border: 2px solid #1b2440;
        background: #121a33;
        box-shadow: 0 14px 30px rgba(15, 23, 42, 0.18);
      }

      .hv-titlebar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        background: linear-gradient(180deg, #33456b 0%, #24324f 100%);
        border-bottom: 2px solid #1b2440;
        border-radius: 14px 14px 0 0;
        color: white;
        font-size: 14px;
        font-weight: 800;
        letter-spacing: 0.01em;
      }

      .hv-titlebar b {
        min-width: 26px;
        padding: 2px 8px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.16);
        font-size: 12px;
        text-align: center;
      }

      .hv-stage {
        flex: 1;
        border-radius: 0 0 14px 14px;
        display: flex;
        align-items: center;
        background: radial-gradient(120% 90% at 50% 40%, #24305a 0%, #121a33 70%);
      }

      .hv-beach .hv-stage {
        background: linear-gradient(180deg, #8fd3ff 0%, #d9f1ff 100%);
      }

      .sky-dusk .hv-beach .hv-stage {
        background: linear-gradient(180deg, #8b9cf6 0%, #ffc49b 100%);
      }

      .sky-night .hv-beach .hv-stage {
        background: linear-gradient(180deg, #151a45 0%, #2d3480 100%);
      }

      .hv-canvas-wrap {
        position: relative;
        width: 100%;
      }

      .hv-canvas {
        display: block;
        width: 100%;
        height: auto;
        image-rendering: pixelated;
      }

      .hv-overlay {
        position: absolute;
        inset: 0;
        pointer-events: none;
      }

      .hv-agent {
        position: absolute;
        display: flex;
        flex-direction: column;
        align-items: center;
        transform: translate(-50%, -100%);
        white-space: nowrap;
      }

      .hv-name {
        transition: opacity 0.15s ease;
        padding: 1px 6px;
        border-radius: 5px;
        background: rgba(10, 15, 35, 0.72);
        color: white;
        font-size: 10px;
        font-weight: 700;
        line-height: 1.4;
      }

      .hv-overlay.is-crowded .hv-agent .hv-name {
        opacity: 0;
      }

      .hv-overlay.is-crowded .hv-agent.is-hover .hv-name,
      .hv-overlay.is-crowded .hv-agent.has-bubble .hv-name {
        opacity: 1;
      }

      .hv-agent.is-hover {
        z-index: 1000 !important;
      }

      .hv-agent.is-hover .hv-name {
        background: #2f6fdf;
      }

      .hv-bubble {
        display: none;
        position: relative;
        margin-bottom: 5px;
        padding: 3px 8px;
        border: 2px solid #1b2440;
        border-radius: 8px;
        background: white;
        color: #1b2440;
        font-size: 11px;
        font-weight: 700;
        box-shadow: 0 2px 0 rgba(0, 0, 0, 0.2);
      }

      .hv-bubble.is-on {
        display: block;
        animation: hv-pop 0.25s ease-out;
      }

      .hv-bubble::after {
        content: "";
        position: absolute;
        left: 50%;
        bottom: -6px;
        width: 8px;
        height: 8px;
        margin-left: -4px;
        background: white;
        border-right: 2px solid #1b2440;
        border-bottom: 2px solid #1b2440;
        transform: rotate(45deg);
      }

      .hv-empty {
        position: absolute;
        left: 50%;
        top: 50%;
        padding: 6px 12px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.92);
        color: #1b2440;
        font-size: 13px;
        font-weight: 700;
        transform: translate(-50%, -50%);
        white-space: nowrap;
      }

      @keyframes hv-pop {
        from {
          opacity: 0;
          transform: translateY(4px) scale(0.9);
        }
        to {
          opacity: 1;
          transform: none;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .hv-bubble.is-on {
          animation: none;
        }
      }

      @media (max-width: 1000px) {
        .hv-world {
          grid-template-columns: 1fr;
        }
      }
    `}</style>
  );
}
