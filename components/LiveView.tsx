"use client";

import { useEffect, useState, type CSSProperties } from "react";

type LeaveEntry = {
  name: string;
  leave_type: string;
  note: string | null;
};

type LiveViewProps = {
  inOffice: string[];
  wfh: string[];
  leave: LeaveEntry[];
  avatarMap: Record<string, string>;
};

const shirtColors = ["#2563eb", "#e11d48", "#059669", "#7c3aed", "#d97706", "#0891b2", "#db2777", "#4f46e5", "#16a34a"];
const roofColors = ["#dc2626", "#2563eb", "#7c3aed", "#ea580c", "#0d9488", "#be185d"];

const leaveEmoji: Record<string, string> = {
  AL: "🏖️",
  MC: "🤒",
  EL: "⚡",
  RL: "😎",
  PL: "🍼",
  ML: "👶",
  HL: "🏥",
  CL: "🕊️",
  Others: "🌴",
};

const bedLeaveTypes = ["MC", "HL"];

function hashName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return hash;
}

function pick<T>(list: T[], name: string) {
  return list[hashName(name) % list.length];
}

const pixelCache = new Map<string, string>();

// Downscale the avatar to a tiny canvas so it renders as chunky pixels.
function usePixelAvatar(src: string | undefined, resolution = 16) {
  const key = `${src}@${resolution}`;
  const [url, setUrl] = useState<string | null>(() => (src ? pixelCache.get(key) ?? null : null));

  useEffect(() => {
    if (!src) return;

    const cached = pixelCache.get(key);
    if (cached) {
      setUrl(cached);
      return;
    }

    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = resolution;
      canvas.height = resolution;
      const ctx = canvas.getContext("2d");
      if (!ctx || cancelled) return;

      // Avatars are head-and-shoulders portraits, so crop the upper centre to keep the face.
      const size = Math.min(img.width, img.height) * 0.72;
      ctx.drawImage(img, (img.width - size) / 2, img.height * 0.02, size, size, 0, 0, resolution, resolution);

      const output = canvas.toDataURL();
      pixelCache.set(key, output);
      setUrl(output);
    };
    img.src = src;

    return () => {
      cancelled = true;
    };
  }, [key, src, resolution]);

  return url;
}

function PixelFace({ name, src, size = 32 }: { name: string; src?: string; size?: number }) {
  const url = usePixelAvatar(src);

  if (!url) {
    return (
      <div className="lv-face lv-face-fallback" style={{ width: size, height: size }}>
        {name.slice(0, 1)}
      </div>
    );
  }

  return <img className="lv-face" src={url} alt={name} style={{ width: size, height: size }} />;
}

function Sprite({ name, src, delay }: { name: string; src?: string; delay: number }) {
  return (
    <div className="lv-sprite" style={{ "--shirt": pick(shirtColors, name), "--d": `${delay}s` } as CSSProperties}>
      <PixelFace name={name} src={src} />
      <div className="lv-body" />
      <div className="lv-legs">
        <span />
        <span />
      </div>
    </div>
  );
}

function NameTag({ name, sub }: { name: string; sub?: string }) {
  return (
    <div className="lv-tag">
      <strong>{name}</strong>
      {sub && <span>{sub}</span>}
    </div>
  );
}

function isHalfDay(note: string | null) {
  return Boolean(note && note.toLowerCase().startsWith("half day"));
}

export default function LiveView({ inOffice, wfh, leave, avatarMap }: LiveViewProps) {
  return (
    <div className="lv-scene">
      <section className="lv-zone lv-office">
        <header className="lv-zone-head">
          <span>🏢 OFFICE</span>
          <b>{inOffice.length}</b>
        </header>
        <div className="lv-wall">
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="lv-floor">
          {inOffice.length === 0 && <p className="lv-empty">Office kosong… 🦗</p>}
          {inOffice.map((name, index) => (
            <div key={name} className="lv-desk-cell">
              <div className="lv-actor">
                <Sprite name={name} src={avatarMap[name]} delay={index * 0.12} />
              </div>
              <div className="lv-desk">
                <div className="lv-monitor" style={{ "--d": `${(index % 4) * 0.4}s` } as CSSProperties} />
              </div>
              <NameTag name={name} />
            </div>
          ))}
          <div className="lv-plant" aria-hidden="true">
            <span />
          </div>
        </div>
      </section>

      <section className="lv-zone lv-home">
        <header className="lv-zone-head">
          <span>🏠 WFH</span>
          <b>{wfh.length}</b>
        </header>
        <div className="lv-yard">
          {wfh.length === 0 && <p className="lv-empty">Semua masuk office hari ni</p>}
          {wfh.map((name, index) => (
            <div key={name} className="lv-house-cell" style={{ "--roof": pick(roofColors, name), "--d": `${index * 0.5}s` } as CSSProperties}>
              <div className="lv-house">
                <div className="lv-chimney">
                  <i />
                  <i />
                  <i />
                </div>
                <div className="lv-roof" />
                <div className="lv-house-body">
                  <div className="lv-window">
                    <PixelFace name={name} src={avatarMap[name]} size={24} />
                  </div>
                  <div className="lv-door" />
                </div>
              </div>
              <NameTag name={name} sub="Rumah" />
            </div>
          ))}
        </div>
      </section>

      <section className="lv-zone lv-leave">
        <header className="lv-zone-head">
          <span>🌴 CUTI</span>
          <b>{leave.length}</b>
        </header>
        <div className="lv-beach">
          {leave.length === 0 && <p className="lv-empty">Tiada yang cuti hari ni</p>}
          {leave.map((record, index) => {
            const inBed = bedLeaveTypes.includes(record.leave_type);
            const sub = `${record.leave_type}${isHalfDay(record.note) ? " · ½ hari" : ""}`;

            return (
              <div key={record.name} className={inBed ? "lv-leave-cell lv-sick" : "lv-leave-cell lv-holiday"}>
                <div className="lv-bubble" style={{ "--d": `${index * 0.3}s` } as CSSProperties}>
                  {leaveEmoji[record.leave_type] || leaveEmoji.Others}
                </div>
                {inBed ? (
                  <div className="lv-bed">
                    <div className="lv-pillow">
                      <PixelFace name={record.name} src={avatarMap[record.name]} size={26} />
                    </div>
                    <div className="lv-blanket" style={{ "--shirt": pick(shirtColors, record.name) } as CSSProperties} />
                    <span className="lv-zzz">z</span>
                  </div>
                ) : (
                  <div className="lv-holiday-spot">
                    <div className="lv-umbrella" />
                    <div className="lv-actor">
                      <Sprite name={record.name} src={avatarMap[record.name]} delay={index * 0.12} />
                    </div>
                  </div>
                )}
                <NameTag name={record.name} sub={sub} />
              </div>
            );
          })}
        </div>
      </section>

      <LiveViewStyles />
    </div>
  );
}

function LiveViewStyles() {
  return (
    <style jsx global>{`
      .lv-scene {
        --px: #0b1630;
        display: grid;
        grid-template-columns: 1.35fr 1fr 1fr;
        gap: 14px;
        align-items: stretch;
      }

      .lv-zone {
        position: relative;
        display: flex;
        flex-direction: column;
        border: 3px solid var(--px);
        border-radius: 8px;
        box-shadow: 5px 5px 0 var(--px);
        overflow: hidden;
        background: white;
        min-height: 280px;
      }

      .lv-zone-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 12px;
        background: var(--px);
        color: white;
        font-family: var(--font-pixel), monospace;
        font-size: 11px;
        letter-spacing: 0.04em;
      }

      .lv-zone-head b {
        font-weight: 400;
        background: white;
        color: var(--px);
        padding: 4px 7px;
        border-radius: 3px;
      }

      /* Draw everything at a small base size, then scale it up so the pixels stay chunky. */
      .lv-floor,
      .lv-yard,
      .lv-beach {
        zoom: 1.4;
      }

      .lv-empty {
        grid-column: 1 / -1;
        align-self: center;
        margin: 24px auto;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.85);
        border: 2px solid var(--px);
        border-radius: 4px;
        font-size: 13px;
        font-weight: 700;
        color: var(--px);
        text-align: center;
      }

      /* ---------- Sprite ---------- */

      .lv-face {
        display: block;
        image-rendering: pixelated;
        border: 2px solid var(--px);
        background: #f1d3b3;
        border-radius: 2px;
      }

      .lv-face-fallback {
        display: grid;
        place-items: center;
        color: var(--px);
        font-family: var(--font-pixel), monospace;
        font-size: 12px;
      }

      .lv-sprite {
        display: flex;
        flex-direction: column;
        align-items: center;
        animation: lv-walk-in 0.9s steps(6) both, lv-bob 1.2s steps(2) infinite;
        animation-delay: var(--d), calc(var(--d) + 0.9s);
      }

      .lv-body {
        width: 26px;
        height: 14px;
        margin-top: -1px;
        background: var(--shirt);
        border: 2px solid var(--px);
        border-radius: 4px 4px 0 0;
      }

      .lv-legs {
        display: flex;
        gap: 4px;
      }

      .lv-legs span {
        width: 7px;
        height: 7px;
        background: #334155;
        border: 2px solid var(--px);
        border-top: 0;
      }

      .lv-tag {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-top: 6px;
        padding: 3px 7px;
        background: white;
        border: 2px solid var(--px);
        border-radius: 3px;
        line-height: 1.2;
        max-width: 100%;
      }

      .lv-tag strong {
        font-size: 11px;
        color: var(--px);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 92px;
      }

      .lv-tag span {
        font-size: 10px;
        font-weight: 700;
        color: #64748b;
      }

      /* ---------- Office ---------- */

      .lv-wall {
        display: flex;
        justify-content: space-around;
        padding: 10px 14px;
        background: #cbd5e1;
        border-bottom: 3px solid var(--px);
      }

      .lv-wall span {
        width: 44px;
        height: 22px;
        background: linear-gradient(180deg, #7dd3fc 0 60%, #bae6fd 60%);
        border: 3px solid var(--px);
        border-radius: 2px;
      }

      .lv-floor {
        position: relative;
        flex: 1;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
        gap: 14px 8px;
        padding: 16px 12px 40px;
        background: repeating-conic-gradient(#eef1f6 0 25%, #e2e7f0 0 50%) 0 0 / 24px 24px;
        align-content: start;
      }

      .lv-desk-cell,
      .lv-house-cell,
      .lv-leave-cell {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .lv-actor {
        position: relative;
        z-index: 1;
      }

      .lv-desk {
        position: relative;
        z-index: 2;
        width: 76px;
        height: 14px;
        margin-top: -12px;
        background: #b45309;
        border: 2px solid var(--px);
        border-radius: 2px;
        box-shadow: inset 0 -4px 0 #92400e;
      }

      .lv-desk::before,
      .lv-desk::after {
        content: "";
        position: absolute;
        top: 12px;
        width: 4px;
        height: 10px;
        background: var(--px);
      }

      .lv-desk::before {
        left: 6px;
      }

      .lv-desk::after {
        right: 6px;
      }

      .lv-monitor {
        position: absolute;
        right: 4px;
        bottom: 12px;
        width: 22px;
        height: 16px;
        background: #22d3ee;
        border: 2px solid var(--px);
        border-bottom-width: 4px;
        border-radius: 2px;
        animation: lv-screen 1.6s steps(1) infinite;
        animation-delay: var(--d);
      }

      .lv-desk-cell .lv-tag {
        margin-top: 14px;
      }

      .lv-plant {
        position: absolute;
        right: 10px;
        bottom: 8px;
        width: 16px;
        height: 14px;
        background: #c2410c;
        border: 2px solid var(--px);
        border-radius: 0 0 3px 3px;
      }

      .lv-plant span {
        position: absolute;
        left: -6px;
        bottom: 12px;
        width: 24px;
        height: 18px;
        background: #22c55e;
        border: 2px solid var(--px);
        border-radius: 50% 50% 40% 40%;
        animation: lv-sway 2.4s steps(2) infinite;
        transform-origin: bottom center;
      }

      /* ---------- Home ---------- */

      .lv-yard {
        flex: 1;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
        gap: 16px 8px;
        padding: 18px 12px;
        background: linear-gradient(180deg, #bae6fd 0 34px, transparent 34px),
          repeating-conic-gradient(#86d36b 0 25%, #79c75e 0 50%) 0 0 / 24px 24px;
        align-content: start;
      }

      .lv-house {
        position: relative;
        width: 72px;
        animation: lv-pop-in 0.5s steps(4) both;
        animation-delay: var(--d);
      }

      .lv-roof {
        position: relative;
        z-index: 1;
        width: 72px;
        height: 28px;
        background: var(--roof);
        clip-path: polygon(50% 0, 100% 100%, 0 100%);
      }

      .lv-house-body {
        position: relative;
        width: 60px;
        height: 42px;
        margin: 0 auto;
        background: #fef3c7;
        border: 3px solid var(--px);
        border-top: 0;
      }

      .lv-window {
        position: absolute;
        left: 5px;
        top: 6px;
        padding: 1px;
        background: #fde68a;
        border: 2px solid var(--px);
      }

      .lv-window .lv-face {
        border: 0;
        border-radius: 0;
      }

      .lv-door {
        position: absolute;
        right: 6px;
        bottom: 0;
        width: 14px;
        height: 22px;
        background: #7c2d12;
        border: 2px solid var(--px);
        border-bottom: 0;
      }

      .lv-chimney {
        position: absolute;
        right: 12px;
        top: 4px;
        width: 10px;
        height: 18px;
        background: #64748b;
        border: 2px solid var(--px);
      }

      .lv-chimney i {
        position: absolute;
        left: 0;
        top: -8px;
        width: 6px;
        height: 6px;
        background: #e2e8f0;
        border-radius: 1px;
        opacity: 0;
        animation: lv-smoke 2.4s steps(6) infinite;
        animation-delay: calc(var(--d) + var(--i, 0s));
      }

      .lv-chimney i:nth-child(2) {
        --i: 0.8s;
      }

      .lv-chimney i:nth-child(3) {
        --i: 1.6s;
      }

      /* ---------- Leave ---------- */

      .lv-beach {
        flex: 1;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
        gap: 16px 8px;
        padding: 18px 12px;
        background: linear-gradient(180deg, #7dd3fc 0 26px, #38bdf8 26px 40px, transparent 40px),
          repeating-conic-gradient(#fde68a 0 25%, #fcd34d 0 50%) 0 0 / 24px 24px;
        align-content: start;
      }

      .lv-leave-cell {
        padding-top: 30px;
      }

      .lv-bubble {
        position: absolute;
        top: 0;
        left: 50%;
        z-index: 3;
        padding: 2px 6px;
        font-size: 16px;
        line-height: 1.3;
        background: white;
        border: 2px solid var(--px);
        border-radius: 6px;
        transform: translateX(-50%);
        animation: lv-float 1.8s steps(2) infinite;
        animation-delay: var(--d);
      }

      .lv-holiday-spot {
        position: relative;
        width: 80px;
        display: flex;
        justify-content: center;
      }

      .lv-umbrella {
        position: absolute;
        left: 0;
        top: -6px;
        width: 34px;
        height: 64px;
      }

      .lv-umbrella::before {
        content: "";
        position: absolute;
        left: 0;
        top: 0;
        width: 34px;
        height: 17px;
        background: repeating-linear-gradient(90deg, #ef4444 0 8px, white 8px 16px);
        border: 2px solid var(--px);
        border-bottom-width: 3px;
        border-radius: 17px 17px 0 0;
      }

      .lv-umbrella::after {
        content: "";
        position: absolute;
        left: 15px;
        top: 17px;
        width: 3px;
        height: 46px;
        background: var(--px);
      }

      .lv-bed {
        position: relative;
        width: 84px;
        height: 58px;
        margin-top: 6px;
      }

      .lv-pillow {
        position: absolute;
        left: 4px;
        top: 8px;
        z-index: 1;
        padding: 3px;
        background: white;
        border: 2px solid var(--px);
        border-radius: 4px;
      }

      .lv-blanket {
        position: absolute;
        left: 30px;
        right: 0;
        top: 12px;
        height: 30px;
        background: repeating-linear-gradient(90deg, var(--shirt) 0 8px, color-mix(in srgb, var(--shirt) 75%, white) 8px 16px);
        border: 2px solid var(--px);
        border-radius: 3px;
      }

      .lv-bed::after {
        content: "";
        position: absolute;
        left: 0;
        right: 0;
        bottom: 4px;
        height: 12px;
        background: #92400e;
        border: 2px solid var(--px);
        border-radius: 2px;
      }

      .lv-zzz {
        position: absolute;
        left: 32px;
        top: -4px;
        font-family: var(--font-pixel), monospace;
        font-size: 10px;
        color: var(--px);
        animation: lv-zzz 2s steps(4) infinite;
      }

      /* ---------- Animations ---------- */

      @keyframes lv-walk-in {
        from {
          opacity: 0;
          transform: translateX(-28px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      @keyframes lv-bob {
        0% {
          transform: translateY(0);
        }
        100% {
          transform: translateY(-2px);
        }
      }

      @keyframes lv-screen {
        0%,
        100% {
          background: #22d3ee;
        }
        50% {
          background: #a5f3fc;
        }
      }

      @keyframes lv-sway {
        0%,
        100% {
          transform: rotate(-4deg);
        }
        50% {
          transform: rotate(4deg);
        }
      }

      @keyframes lv-pop-in {
        from {
          opacity: 0;
          transform: translateY(8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes lv-smoke {
        0% {
          opacity: 0.9;
          transform: translate(0, 0) scale(1);
        }
        100% {
          opacity: 0;
          transform: translate(8px, -20px) scale(1.6);
        }
      }

      @keyframes lv-float {
        0%,
        100% {
          transform: translate(-50%, 0);
        }
        50% {
          transform: translate(-50%, -3px);
        }
      }

      @keyframes lv-zzz {
        0% {
          opacity: 0;
          transform: translate(0, 4px);
        }
        50% {
          opacity: 1;
        }
        100% {
          opacity: 0;
          transform: translate(10px, -12px);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .lv-scene *,
        .lv-scene *::before,
        .lv-scene *::after {
          animation: none !important;
        }
      }

      @media (max-width: 1100px) {
        .lv-scene {
          grid-template-columns: 1fr;
        }

        .lv-zone {
          min-height: 0;
        }
      }
    `}</style>
  );
}
