"use client";

import { type CSSProperties } from "react";

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
  hour: number;
};

const shirtColors = ["#5b8def", "#f2766b", "#4fbf8b", "#a78bfa", "#f5a524", "#38bdf8", "#f472b6", "#818cf8", "#34d399"];
const roofColors = ["#f2766b", "#5b8def", "#a78bfa", "#f5a524", "#2dd4bf", "#f472b6"];
const wallColors = ["#fff4e4", "#fdf2f8", "#ecfeff", "#f0fdf4", "#fefce8", "#f5f3ff"];

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

const restLeaveTypes = ["MC", "HL"];

function hashName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return hash;
}

function pick<T>(list: T[], name: string) {
  return list[hashName(name) % list.length];
}

function isHalfDay(note: string | null) {
  return Boolean(note && note.toLowerCase().startsWith("half day"));
}

function getSkyMode(hour: number) {
  if (hour >= 19 || hour < 6) return "night";
  if (hour >= 17) return "dusk";
  return "day";
}

function vars(values: Record<string, string | number>) {
  return values as CSSProperties;
}

function Head({ name, src }: { name: string; src?: string }) {
  return (
    <div className="tv-head">
      {src ? <img src={src} alt={name} /> : <span>{name.slice(0, 2).toUpperCase()}</span>}
    </div>
  );
}

function Chibi({
  name,
  src,
  index,
  seated = false,
  waving = false,
}: {
  name: string;
  src?: string;
  index: number;
  seated?: boolean;
  waving?: boolean;
}) {
  const className = ["tv-chibi", seated ? "is-seated" : "", waving ? "is-waving" : ""].join(" ");

  return (
    <div className={className} style={vars({ "--shirt": pick(shirtColors, name), "--i": index })}>
      <div className="tv-chibi-inner">
        <Head name={name} src={src} />
        <div className="tv-torso">
          <span className="tv-arm tv-arm-left" />
          <span className="tv-arm tv-arm-right" />
        </div>
        {!seated && (
          <div className="tv-legs">
            <span />
            <span />
          </div>
        )}
      </div>
      {!seated && <div className="tv-shadow" />}
    </div>
  );
}

function Label({ name, sub }: { name: string; sub?: string }) {
  return (
    <div className="tv-label">
      {name}
      {sub && <em>{sub}</em>}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="tv-empty">{text}</div>;
}

export default function LiveView({ inOffice, wfh, leave, avatarMap, hour }: LiveViewProps) {
  const sky = getSkyMode(hour);

  return (
    <div className={`tv-town sky-${sky}`}>
      <div className="tv-sky" aria-hidden="true">
        <div className="tv-sun" />
        <div className="tv-cloud" style={vars({ "--top": "28px", "--dur": "70s", "--delay": "-10s" })} />
        <div className="tv-cloud tv-cloud-small" style={vars({ "--top": "70px", "--dur": "95s", "--delay": "-55s" })} />
        <div className="tv-cloud" style={vars({ "--top": "46px", "--dur": "120s", "--delay": "-80s" })} />
        <div className="tv-stars" />
      </div>

      <section className="tv-zone tv-zone-office">
        <div className="tv-sign">
          🏢 Office <b>{inOffice.length}</b>
        </div>
        <div className="tv-building">
          <div className="tv-building-top">
            <span className="tv-win" />
            <span className="tv-win" />
            <span className="tv-clock">
              <i style={vars({ "--deg": `${(hour % 12) * 30}deg` })} />
            </span>
            <span className="tv-win" />
            <span className="tv-win" />
          </div>
          <div className="tv-room">
            {inOffice.length === 0 && <Empty text="Office kosong 🦗" />}
            {inOffice.map((name, index) => (
              <div key={name} className="tv-seat" style={vars({ "--i": index })}>
                <Chibi name={name} src={avatarMap[name]} index={index} seated />
                <div className="tv-desk">
                  <span className="tv-laptop" />
                  {index % 2 === 0 && (
                    <span className="tv-mug">
                      <i />
                    </span>
                  )}
                </div>
                <Label name={name} />
              </div>
            ))}
            <span className="tv-plant" aria-hidden="true" />
          </div>
        </div>
        <div className="tv-ground tv-ground-office" />
      </section>

      <section className="tv-zone tv-zone-home">
        <div className="tv-sign">
          🏠 WFH <b>{wfh.length}</b>
        </div>
        <div className="tv-yard">
          <span className="tv-tree tv-tree-left" aria-hidden="true" />
          {wfh.length === 0 && <Empty text="Semua masuk office 💪" />}
          {wfh.map((name, index) => (
            <div
              key={name}
              className="tv-home"
              style={vars({ "--roof": pick(roofColors, name), "--wall": pick(wallColors, name), "--i": index })}
            >
              <div className="tv-house">
                <span className="tv-chimney">
                  <i />
                  <i />
                  <i />
                </span>
                <span className="tv-roof" />
                <span className="tv-house-body">
                  <span className="tv-house-window" />
                  <span className="tv-house-door" />
                </span>
              </div>
              <div className="tv-home-person">
                <Chibi name={name} src={avatarMap[name]} index={index} waving />
              </div>
              <Label name={name} sub="WFH" />
            </div>
          ))}
        </div>
        <div className="tv-ground tv-ground-grass" />
      </section>

      <section className="tv-zone tv-zone-beach">
        <div className="tv-sign">
          🌴 Cuti <b>{leave.length}</b>
        </div>
        <div className="tv-beach">
          <span className="tv-sea" aria-hidden="true" />
          <span className="tv-palm" aria-hidden="true" />
          {leave.length === 0 && <Empty text="Takde yang cuti hari ni" />}
          {leave.map((record, index) => {
            const resting = restLeaveTypes.includes(record.leave_type);
            const sub = `${record.leave_type}${isHalfDay(record.note) ? " · ½ hari" : ""}`;

            return (
              <div key={record.name} className="tv-vacation" style={vars({ "--i": index })}>
                <div className="tv-bubble">{leaveEmoji[record.leave_type] || leaveEmoji.Others}</div>
                {resting ? (
                  <div className="tv-bed" style={vars({ "--shirt": pick(shirtColors, record.name) })}>
                    <Head name={record.name} src={avatarMap[record.name]} />
                    <span className="tv-blanket" />
                    <span className="tv-zzz">z</span>
                    <span className="tv-zzz tv-zzz-2">z</span>
                  </div>
                ) : (
                  <div className="tv-spot">
                    <span className="tv-umbrella" style={vars({ "--roof": pick(roofColors, record.name) })} />
                    <Chibi name={record.name} src={avatarMap[record.name]} index={index} />
                  </div>
                )}
                <Label name={record.name} sub={sub} />
              </div>
            );
          })}
        </div>
        <div className="tv-ground tv-ground-sand" />
      </section>

      <LiveViewStyles />
    </div>
  );
}

function LiveViewStyles() {
  return (
    <style jsx global>{`
      .tv-town {
        --ink: #1e293b;
        --sky-top: #7cc8ff;
        --sky-bottom: #d8f0ff;
        position: relative;
        display: flex;
        align-items: stretch;
        padding-top: 64px;
        border-radius: 26px;
        overflow: hidden;
        background: linear-gradient(180deg, var(--sky-top) 0%, var(--sky-bottom) 70%);
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05), 0 18px 40px rgba(15, 23, 42, 0.1);
        isolation: isolate;
      }

      .tv-town.sky-dusk {
        --sky-top: #8b9cf6;
        --sky-bottom: #ffc49b;
      }

      .tv-town.sky-night {
        --sky-top: #1e1b4b;
        --sky-bottom: #3b3f8f;
      }

      /* ---------- Sky ---------- */

      .tv-sky {
        position: absolute;
        inset: 0;
        z-index: -1;
        pointer-events: none;
      }

      .tv-sun {
        position: absolute;
        top: 12px;
        right: 2.5%;
        width: 42px;
        height: 42px;
        border-radius: 50%;
        background: #ffe27a;
        box-shadow: 0 0 0 10px rgba(255, 226, 122, 0.35), 0 0 0 22px rgba(255, 226, 122, 0.15);
        animation: tv-glow 4s ease-in-out infinite;
      }

      .sky-dusk .tv-sun {
        top: 26px;
        background: #ffb36b;
        box-shadow: 0 0 0 10px rgba(255, 179, 107, 0.35), 0 0 0 22px rgba(255, 179, 107, 0.15);
      }

      .sky-night .tv-sun {
        width: 40px;
        height: 40px;
        background: transparent;
        box-shadow: inset -12px -4px 0 0 #fef3c7;
        animation: none;
      }

      .tv-stars {
        position: absolute;
        inset: 0 0 50% 0;
        display: none;
        background-image: radial-gradient(1.5px 1.5px at 12% 20%, white 50%, transparent 51%),
          radial-gradient(1.5px 1.5px at 30% 45%, white 50%, transparent 51%),
          radial-gradient(1.5px 1.5px at 48% 15%, white 50%, transparent 51%),
          radial-gradient(1.5px 1.5px at 66% 38%, white 50%, transparent 51%),
          radial-gradient(1.5px 1.5px at 78% 12%, white 50%, transparent 51%),
          radial-gradient(1.5px 1.5px at 90% 52%, white 50%, transparent 51%);
        animation: tv-twinkle 3s ease-in-out infinite;
      }

      .sky-night .tv-stars {
        display: block;
      }

      .tv-cloud {
        position: absolute;
        top: var(--top);
        left: 0;
        width: 86px;
        height: 26px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.92);
        animation: tv-drift var(--dur) linear infinite;
        animation-delay: var(--delay);
      }

      .tv-cloud::before,
      .tv-cloud::after {
        content: "";
        position: absolute;
        border-radius: 50%;
        background: inherit;
      }

      .tv-cloud::before {
        left: 14px;
        top: -14px;
        width: 34px;
        height: 34px;
      }

      .tv-cloud::after {
        left: 38px;
        top: -20px;
        width: 40px;
        height: 40px;
      }

      .tv-cloud-small {
        scale: 0.7;
      }

      .sky-night .tv-cloud {
        background: rgba(255, 255, 255, 0.12);
      }

      /* ---------- Zones ---------- */

      .tv-zone {
        position: relative;
        flex: 1 1 auto;
        min-width: 230px;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
      }

      .tv-sign {
        position: absolute;
        top: -48px;
        left: 50%;
        z-index: 5;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 8px 6px 14px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.92);
        color: var(--ink);
        font-size: 14px;
        font-weight: 800;
        white-space: nowrap;
        transform: translateX(-50%);
        box-shadow: 0 6px 16px rgba(15, 23, 42, 0.12);
      }

      .tv-sign b {
        min-width: 24px;
        height: 24px;
        padding: 0 7px;
        display: grid;
        place-items: center;
        border-radius: 999px;
        background: var(--ink);
        color: white;
        font-size: 12px;
      }

      .tv-ground {
        height: 26px;
        flex-shrink: 0;
      }

      .tv-ground-office {
        background: linear-gradient(180deg, #cfd6e2 0 6px, #e4e8ef 6px);
      }

      .tv-ground-grass {
        background: linear-gradient(180deg, #6fc157 0 6px, #8bd46e 6px);
      }

      .tv-ground-sand {
        background: linear-gradient(180deg, #f4cf7a 0 6px, #fde5a8 6px);
      }

      .sky-night .tv-ground,
      .sky-night .tv-yard,
      .sky-night .tv-beach {
        filter: brightness(0.75) saturate(0.9);
      }

      .tv-empty {
        position: relative;
        z-index: 2;
        margin: auto;
        padding: 8px 14px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.88);
        color: var(--ink);
        font-size: 13px;
        font-weight: 700;
        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
      }

      .tv-label {
        position: relative;
        z-index: 3;
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-top: 8px;
        padding: 3px 10px;
        border-radius: 999px;
        background: white;
        color: var(--ink);
        font-size: 12px;
        font-weight: 800;
        line-height: 1.25;
        white-space: nowrap;
        box-shadow: 0 3px 8px rgba(15, 23, 42, 0.12);
      }

      .tv-label em {
        font-style: normal;
        font-size: 10px;
        font-weight: 700;
        color: #64748b;
      }

      /* ---------- Chibi ---------- */

      .tv-chibi {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        animation: tv-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        animation-delay: calc(var(--i) * 0.12s);
      }

      .tv-chibi-inner {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        animation: tv-bob 2.6s ease-in-out infinite;
        animation-delay: calc(var(--i) * -0.7s);
      }

      .tv-chibi.is-seated .tv-chibi-inner {
        animation: tv-type 0.9s ease-in-out infinite;
        animation-delay: calc(var(--i) * -0.3s);
      }

      .tv-head {
        position: relative;
        z-index: 2;
        width: 62px;
        height: 62px;
        border-radius: 50%;
        overflow: hidden;
        background: #fde7d3;
        border: 3px solid white;
        box-shadow: 0 3px 8px rgba(15, 23, 42, 0.18);
      }

      .tv-head img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: 50% 12%;
        transform: scale(1.35);
        transform-origin: 50% 20%;
      }

      .tv-head span {
        display: grid;
        place-items: center;
        width: 100%;
        height: 100%;
        color: var(--ink);
        font-size: 15px;
        font-weight: 800;
      }

      .tv-torso {
        position: relative;
        width: 42px;
        height: 30px;
        margin-top: -7px;
        border-radius: 16px 16px 9px 9px;
        background: var(--shirt);
        box-shadow: inset 0 -5px 0 rgba(0, 0, 0, 0.1);
      }

      .tv-arm {
        position: absolute;
        top: 8px;
        width: 11px;
        height: 20px;
        border-radius: 999px;
        background: var(--shirt);
        filter: brightness(0.92);
        transform-origin: 50% 2px;
      }

      .tv-arm-left {
        left: -6px;
        transform: rotate(14deg);
      }

      .tv-arm-right {
        right: -6px;
        transform: rotate(-14deg);
      }

      .tv-chibi.is-waving .tv-arm-right {
        animation: tv-wave 3.6s ease-in-out infinite;
        animation-delay: calc(var(--i) * -1.1s);
      }

      .tv-legs {
        display: flex;
        gap: 6px;
        margin-top: -2px;
      }

      .tv-legs span {
        width: 11px;
        height: 12px;
        border-radius: 0 0 5px 5px;
        background: #475569;
      }

      .tv-shadow {
        width: 44px;
        height: 8px;
        margin-top: 1px;
        border-radius: 50%;
        background: rgba(15, 23, 42, 0.16);
      }

      /* ---------- Office ---------- */

      .tv-building {
        position: relative;
        margin: 0 14px;
        padding: 10px 10px 0;
        border-radius: 22px 22px 0 0;
        background: #e9eef6;
        box-shadow: inset 0 0 0 4px #dbe3ef;
      }

      .tv-building-top {
        display: flex;
        align-items: center;
        justify-content: space-around;
        padding: 4px 8px 12px;
      }

      .tv-win {
        width: 30px;
        height: 18px;
        border-radius: 5px;
        background: linear-gradient(135deg, #bfe3ff 0 55%, #dff1ff 55%);
      }

      .sky-night .tv-win {
        background: #fde68a;
        box-shadow: 0 0 12px rgba(253, 230, 138, 0.6);
      }

      .tv-clock {
        position: relative;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: white;
        box-shadow: inset 0 0 0 3px #94a3b8;
      }

      .tv-clock::after,
      .tv-clock i {
        content: "";
        position: absolute;
        left: 50%;
        bottom: 50%;
        width: 2px;
        border-radius: 2px;
        background: var(--ink);
        transform-origin: 50% 100%;
      }

      .tv-clock::after {
        height: 10px;
        margin-left: -1px;
        animation: tv-spin 60s linear infinite;
      }

      .tv-clock i {
        height: 7px;
        margin-left: -1px;
        transform: rotate(var(--deg));
      }

      .tv-room {
        position: relative;
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        align-items: flex-end;
        gap: 18px 10px;
        padding: 26px 14px 16px;
        border-radius: 16px 16px 0 0;
        background: linear-gradient(180deg, #fff6e8 0%, #ffefd6 100%);
      }

      .sky-night .tv-room {
        background: linear-gradient(180deg, #fff1cf 0%, #ffe3a8 100%);
      }

      .tv-seat {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 106px;
      }

      .tv-seat .tv-chibi {
        z-index: 1;
        margin-bottom: -12px;
      }

      .tv-desk {
        position: relative;
        z-index: 2;
        width: 100px;
        height: 32px;
        border-radius: 8px 8px 4px 4px;
        background: linear-gradient(180deg, #e0a96d 0 9px, #c88a52 9px);
        box-shadow: 0 6px 0 -2px rgba(120, 72, 32, 0.25);
      }

      .tv-laptop {
        position: absolute;
        bottom: 23px;
        left: 50%;
        width: 30px;
        height: 18px;
        margin-left: -15px;
        border-radius: 5px 5px 2px 2px;
        background: #e2e8f0;
        box-shadow: inset 0 -3px 0 #cbd5e1;
      }

      .tv-laptop::after {
        content: "";
        position: absolute;
        left: 50%;
        top: 5px;
        width: 6px;
        height: 6px;
        margin-left: -3px;
        border-radius: 50%;
        background: #93c5fd;
        animation: tv-glow 2.4s ease-in-out infinite;
      }

      .tv-mug {
        position: absolute;
        bottom: 23px;
        right: 10px;
        width: 11px;
        height: 12px;
        border-radius: 2px 2px 4px 4px;
        background: white;
      }

      .tv-mug i,
      .tv-chimney i {
        position: absolute;
        left: 2px;
        top: -10px;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.9);
        opacity: 0;
        animation: tv-steam 2.6s ease-out infinite;
      }

      .tv-mug i {
        background: rgba(148, 163, 184, 0.6);
      }

      .tv-plant {
        position: absolute;
        left: 12px;
        bottom: 0;
        width: 22px;
        height: 18px;
        border-radius: 3px 3px 6px 6px;
        background: #f2766b;
      }

      .tv-plant::before {
        content: "";
        position: absolute;
        left: -7px;
        bottom: 14px;
        width: 36px;
        height: 34px;
        border-radius: 50% 50% 45% 45%;
        background: radial-gradient(circle at 35% 35%, #6ee7a0, #34c47c);
        transform-origin: 50% 100%;
        animation: tv-sway 4s ease-in-out infinite;
      }

      /* ---------- Homes ---------- */

      .tv-yard {
        position: relative;
        flex: 1;
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        align-items: flex-end;
        align-content: flex-end;
        gap: 14px 6px;
        padding: 20px 10px 10px;
        background: radial-gradient(120% 60% at 50% 100%, #a6e08c 0 60%, transparent 61%);
      }

      .tv-home {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 140px;
      }

      .tv-house {
        align-self: flex-start;
        position: relative;
        width: 92px;
        height: 86px;
        animation: tv-rise 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        animation-delay: calc(var(--i) * 0.15s);
      }

      .tv-roof {
        position: absolute;
        top: 0;
        left: 0;
        width: 92px;
        height: 40px;
        background: var(--roof);
        clip-path: polygon(50% 0, 100% 100%, 0 100%);
        border-radius: 6px;
      }

      .tv-house-body {
        position: absolute;
        left: 10px;
        bottom: 0;
        width: 72px;
        height: 48px;
        border-radius: 0 0 6px 6px;
        background: var(--wall);
        box-shadow: inset 0 -6px 0 rgba(15, 23, 42, 0.06);
      }

      .tv-house-window {
        position: absolute;
        left: 9px;
        top: 10px;
        width: 20px;
        height: 18px;
        border-radius: 4px;
        background: linear-gradient(135deg, #bfe3ff 0 55%, #dff1ff 55%);
      }

      .sky-night .tv-house-window {
        background: #fde68a;
        box-shadow: 0 0 10px rgba(253, 230, 138, 0.7);
      }

      .tv-house-door {
        position: absolute;
        right: 10px;
        bottom: 0;
        width: 18px;
        height: 28px;
        border-radius: 9px 9px 0 0;
        background: #b7794a;
      }

      .tv-chimney {
        position: absolute;
        top: 8px;
        right: 16px;
        width: 12px;
        height: 22px;
        border-radius: 2px;
        background: #94a3b8;
      }

      .tv-chimney i:nth-child(2) {
        animation-delay: 0.9s;
      }

      .tv-chimney i:nth-child(3) {
        animation-delay: 1.8s;
      }

      .tv-home-person {
        position: absolute;
        right: 0;
        bottom: 30px;
        z-index: 2;
      }

      .tv-home .tv-label {
        margin-top: 6px;
      }

      .tv-tree {
        position: absolute;
        bottom: 8px;
        width: 14px;
        height: 30px;
        border-radius: 3px;
        background: #a16b45;
        pointer-events: none;
      }

      .tv-tree::before {
        content: "";
        position: absolute;
        left: -20px;
        bottom: 22px;
        width: 54px;
        height: 58px;
        border-radius: 50%;
        background: radial-gradient(circle at 35% 35%, #7ddb8c, #3fae5f);
        transform-origin: 50% 100%;
        animation: tv-sway 5s ease-in-out infinite;
      }

      .tv-tree-left {
        left: -4px;
      }

      /* ---------- Beach ---------- */

      .tv-beach {
        position: relative;
        flex: 1;
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        align-items: flex-end;
        align-content: flex-end;
        gap: 14px 8px;
        padding: 66px 10px 10px;
        background: linear-gradient(180deg, transparent 0 40px, #fde5a8 40px);
      }

      .tv-sea {
        position: absolute;
        left: 0;
        right: 0;
        top: 0;
        height: 44px;
        background: linear-gradient(180deg, #4cb8ec 0%, #7dd3f7 100%);
        pointer-events: none;
      }

      .tv-sea::after {
        content: "";
        position: absolute;
        left: 0;
        right: 0;
        bottom: 2px;
        height: 8px;
        background: radial-gradient(circle at 8px 4px, rgba(255, 255, 255, 0.6) 2px, transparent 3px) 0 0 / 24px 8px repeat-x;
        animation: tv-waves 2.4s linear infinite;
      }

      .tv-palm {
        position: absolute;
        right: 34px;
        bottom: 6px;
        width: 10px;
        height: 104px;
        border-radius: 6px;
        background: #b98454;
        transform: rotate(-5deg);
        transform-origin: 50% 100%;
        pointer-events: none;
      }

      .tv-palm::before,
      .tv-palm::after {
        content: "";
        position: absolute;
        top: -10px;
        width: 54px;
        height: 20px;
        border-radius: 0 100% 0 100%;
        background: #3fae5f;
        animation: tv-sway 4.5s ease-in-out infinite;
      }

      .tv-palm::before {
        right: 2px;
        transform-origin: 100% 100%;
        transform: rotate(18deg) scaleX(-1);
      }

      .tv-palm::after {
        left: 2px;
        transform-origin: 0 100%;
        transform: rotate(-12deg);
      }

      .tv-vacation {
        position: relative;
        z-index: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 112px;
        padding-top: 32px;
      }

      .tv-bubble {
        position: absolute;
        top: 0;
        left: 50%;
        z-index: 4;
        padding: 3px 8px;
        border-radius: 12px;
        background: white;
        font-size: 15px;
        line-height: 1.3;
        box-shadow: 0 4px 10px rgba(15, 23, 42, 0.12);
        animation: tv-float 2.4s ease-in-out infinite;
        animation-delay: calc(var(--i) * -0.6s);
      }

      .tv-bubble::after {
        content: "";
        position: absolute;
        left: 50%;
        bottom: -5px;
        width: 10px;
        height: 10px;
        margin-left: -5px;
        background: white;
        transform: rotate(45deg);
        border-radius: 2px;
      }

      .tv-spot {
        position: relative;
        display: flex;
        justify-content: center;
        width: 112px;
      }

      .tv-umbrella {
        position: absolute;
        left: 0;
        bottom: 8px;
        width: 4px;
        height: 92px;
        margin-left: 12px;
        border-radius: 2px;
        background: #94a3b8;
      }

      .tv-umbrella::before {
        content: "";
        position: absolute;
        left: -22px;
        top: -12px;
        width: 48px;
        height: 22px;
        border-radius: 48px 48px 4px 4px;
        background: repeating-linear-gradient(90deg, var(--roof) 0 12px, white 12px 24px);
      }

      .tv-bed {
        position: relative;
        width: 112px;
        height: 74px;
        animation: tv-rise 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        animation-delay: calc(var(--i) * 0.15s);
      }

      .tv-bed::before {
        content: "";
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 22px;
        border-radius: 8px;
        background: #c88a52;
        box-shadow: inset 0 -5px 0 rgba(0, 0, 0, 0.12);
      }

      .tv-bed .tv-head {
        position: absolute;
        left: 2px;
        bottom: 14px;
        z-index: 2;
        width: 50px;
        height: 50px;
        transform: rotate(-12deg);
      }

      .tv-blanket {
        position: absolute;
        left: 42px;
        right: 2px;
        bottom: 16px;
        z-index: 1;
        height: 30px;
        border-radius: 12px 14px 6px 6px;
        background: var(--shirt);
        box-shadow: inset 0 -6px 0 rgba(0, 0, 0, 0.1);
        animation: tv-breathe 3s ease-in-out infinite;
        transform-origin: 50% 100%;
      }

      .tv-zzz {
        position: absolute;
        left: 50px;
        top: 0;
        z-index: 3;
        color: #6366f1;
        font-size: 13px;
        font-weight: 900;
        opacity: 0;
        animation: tv-zzz 2.8s ease-out infinite;
      }

      .tv-zzz-2 {
        animation-delay: 1.4s;
      }

      /* ---------- Animations ---------- */

      @keyframes tv-pop {
        from {
          opacity: 0;
          transform: translateY(14px) scale(0.6);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @keyframes tv-rise {
        from {
          opacity: 0;
          transform: translateY(18px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes tv-bob {
        0%,
        100% {
          transform: translateY(0);
        }
        50% {
          transform: translateY(-4px);
        }
      }

      @keyframes tv-type {
        0%,
        100% {
          transform: translateY(0) rotate(0);
        }
        50% {
          transform: translateY(-2px) rotate(-1.5deg);
        }
      }

      @keyframes tv-wave {
        0%,
        55%,
        100% {
          transform: rotate(-14deg);
        }
        65%,
        85% {
          transform: rotate(-150deg);
        }
        75%,
        95% {
          transform: rotate(-120deg);
        }
      }

      @keyframes tv-drift {
        from {
          transform: translateX(-140px);
        }
        to {
          transform: translateX(1500px);
        }
      }

      @keyframes tv-glow {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.65;
        }
      }

      @keyframes tv-twinkle {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }

      @keyframes tv-steam {
        0% {
          opacity: 0;
          transform: translate(0, 0) scale(0.6);
        }
        20% {
          opacity: 1;
        }
        100% {
          opacity: 0;
          transform: translate(6px, -22px) scale(1.6);
        }
      }

      @keyframes tv-sway {
        0%,
        100% {
          rotate: -3deg;
        }
        50% {
          rotate: 3deg;
        }
      }

      @keyframes tv-spin {
        to {
          transform: rotate(360deg);
        }
      }

      @keyframes tv-waves {
        to {
          background-position: 24px 0;
        }
      }

      @keyframes tv-float {
        0%,
        100% {
          transform: translate(-50%, 0);
        }
        50% {
          transform: translate(-50%, -4px);
        }
      }

      @keyframes tv-breathe {
        0%,
        100% {
          transform: scaleY(1);
        }
        50% {
          transform: scaleY(1.08);
        }
      }

      @keyframes tv-zzz {
        0% {
          opacity: 0;
          transform: translate(0, 4px) scale(0.8);
        }
        30% {
          opacity: 1;
        }
        100% {
          opacity: 0;
          transform: translate(14px, -18px) scale(1.3);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .tv-town *,
        .tv-town *::before,
        .tv-town *::after {
          animation: none !important;
        }
      }

      @media (max-width: 900px) {
        .tv-town {
          flex-direction: column;
          padding-top: 0;
        }

        .tv-zone {
          flex: none;
          min-width: 0;
          padding-top: 64px;
        }

        .tv-sign {
          top: 18px;
        }

        .tv-room {
          min-height: 0;
        }
      }
    `}</style>
  );
}
