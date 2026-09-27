"use client";

import React, { forwardRef, useEffect, useId, useImperativeHandle, useRef } from "react";
import styles from "./dove.module.css";

export type DoveStand = "idle" | "denkt" | "praat" | "alert" | "slaapt";

export type DoveFigureHandle = {
  /** Cung cấp volume âm thanh (0..1) để nhép mỏ mascot */
  zetAmp: (doel: number) => void;
  /** Kích hoạt chớp mắt chủ động */
  knipper: () => void;
  /** Nhảy nhót vui vẻ (Squash & Stretch) */
  hup: () => void;
  /** Easter egg gõ vào đầu: hoa mắt, nghiêng ngả rồi bật dậy */
  raakHoofd: () => void;
};

type Props = {
  stand?: DoveStand;
  size?: number;
  kaal?: boolean;
  oogVolgen?: boolean;
  decoratief?: boolean;
  speels?: boolean;
  paasei?: boolean;
  label?: string;
  className?: string;
  onClick?: () => void;
  colorScheme?: "ocean" | "white";
};

const beweegArm = () =>
  typeof window === "undefined" || !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export const DoveFigure = forwardRef<DoveFigureHandle, Props>(function DoveFigure(
  {
    stand = "idle",
    size = 220,
    kaal = false,
    oogVolgen = false,
    decoratief = false,
    speels = false,
    paasei = true,
    label = "Bồ câu y tế - Mascot nhà thuốc",
    className,
    onClick,
    colorScheme = "ocean",
  },
  ref,
) {
  const svgRef = useRef<SVGSVGElement>(null);
  const clipId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const amp = useRef(0);
  const bob = useRef(0);
  const doel = useRef(0);
  const raf = useRef(0);
  const actief = useRef(false);
  const delen = useRef<{
    kaak: SVGGElement | null;
    mond: SVGEllipseElement | null;
    lijf: SVGGElement | null;
    brauwen: SVGPathElement[];
  } | null>(null);

  /* Envelope-loop lipsync */
  const tik = useRef<() => void>(() => {});
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    delen.current = {
      kaak: svg.querySelector<SVGGElement>("[data-kaak]"),
      mond: svg.querySelector<SVGEllipseElement>("[data-mond]"),
      lijf: svg.querySelector<SVGGElement>("[data-lijf]"),
      brauwen: Array.from(svg.querySelectorAll<SVGPathElement>(`.${styles.wenkbrauw}`)),
    };
    tik.current = () => {
      const d = doel.current;
      amp.current += (d - amp.current) * (d > amp.current ? 0.45 : 0.12);
      bob.current += (d - bob.current) * 0.05;
      const p = delen.current;
      if (p) {
        const a = amp.current;
        const b = bob.current;
        p.kaak?.setAttribute("transform", `translate(0, ${(a * 10).toFixed(1)})`);
        if (p.mond) {
          p.mond.setAttribute("opacity", Math.min(1, a * 4).toFixed(2));
          p.mond.setAttribute("ry", (2.5 + a * 8).toFixed(1));
          p.mond.setAttribute("cy", (154 + a * 4).toFixed(1));
        }
        if (p.lijf) p.lijf.style.translate = `0 ${(-b * 3).toFixed(1)}px`;
        p.brauwen.forEach((w) => (w.style.translate = `0 ${(-b * 3.5).toFixed(1)}px`));
      }
      if (doel.current === 0 && amp.current < 0.004 && bob.current < 0.004) {
        amp.current = 0;
        bob.current = 0;
        actief.current = false;
        return;
      }
      raf.current = requestAnimationFrame(tik.current);
    };
    return () => {
      cancelAnimationFrame(raf.current);
      actief.current = false;
    };
  }, []);

  const wek = () => {
    if (actief.current) return;
    actief.current = true;
    raf.current = requestAnimationFrame(tik.current);
  };

  /* Easter egg hit handler */
  const geraaktBezig = useRef(false);
  const valAnim = useRef<Animation | null>(null);
  const klokken = useRef<ReturnType<typeof setTimeout>[]>([]);
  const audio = useRef<AudioContext | null>(null);

  const straks = (fn: () => void, ms: number) => {
    klokken.current.push(setTimeout(fn, ms));
  };

  const klap = (fel: boolean) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      audio.current ??= new AudioCtx();
      const ac = audio.current;
      if (ac.state === "suspended") void ac.resume();
      const nu = ac.currentTime;
      const duur = fel ? 0.075 : 0.055;
      const n = Math.floor(ac.sampleRate * duur);
      const buffer = ac.createBuffer(1, n, ac.sampleRate);
      const kanaal = buffer.getChannelData(0);
      for (let i = 0; i < n; i++) kanaal[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 5;
      const ruis = ac.createBufferSource();
      ruis.buffer = buffer;
      const band = ac.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.value = fel ? 1800 : 950;
      band.Q.value = 0.7;
      const ruisVol = ac.createGain();
      ruisVol.gain.value = fel ? 0.35 : 0.25;
      ruis.connect(band).connect(ruisVol).connect(ac.destination);
      ruis.start(nu);

      const bonk = ac.createOscillator();
      bonk.type = "sine";
      bonk.frequency.setValueAtTime(fel ? 220 : 140, nu);
      bonk.frequency.exponentialRampToValueAtTime(60, nu + 0.1);
      const bonkVol = ac.createGain();
      bonkVol.gain.setValueAtTime(fel ? 0.25 : 0.18, nu);
      bonkVol.gain.exponentialRampToValueAtTime(0.001, nu + 0.12);
      bonk.connect(bonkVol).connect(ac.destination);
      bonk.start(nu);
      bonk.stop(nu + 0.13);
    } catch {
      // Audio is non-blocking
    }
  };

  const hup = () => {
    if (!beweegArm()) return;
    svgRef.current
      ?.querySelector(`.${styles.romp}`)
      ?.animate(
        [
          { transform: "translateY(0) scale(1,1)" },
          { transform: "translateY(-12px) scale(.97,1.06)" },
          { transform: "translateY(0) scale(1.05,.94)" },
          { transform: "translateY(0) scale(1,1)" },
        ],
        { duration: 560, easing: "cubic-bezier(.34,1.56,.64,1)" },
      );
  };

  const raakHoofd = () => {
    const svg = svgRef.current;
    if (!svg || geraaktBezig.current) return;
    geraaktBezig.current = true;
    klap(true);

    const marker = svg.querySelector<SVGGElement>("[data-hitmarker]");
    const lijf = svg.querySelector<SVGGElement>("[data-lijf]");
    const tak = svg.querySelector<SVGGElement>("[data-tak]");
    svg.classList.add(styles.geraakt);

    if (marker && beweegArm()) {
      marker.animate(
        [
          { transform: "scale(.35)", opacity: 0.85 },
          { transform: "scale(1.05)", opacity: 1, offset: 0.2 },
          { transform: "scale(1.16)", opacity: 1, offset: 0.6 },
          { transform: "scale(1.5)", opacity: 0 },
        ],
        { duration: 520, easing: "cubic-bezier(.25,.8,.4,1)" },
      );
    }

    if (!beweegArm()) {
      straks(() => {
        svg.classList.remove(styles.geraakt);
        geraaktBezig.current = false;
      }, 2200);
      return;
    }

    valAnim.current = lijf!.animate(
      [
        { transform: "translate(0px,0px) rotate(0deg)" },
        { transform: "translate(-7px,3px) rotate(-11deg)", offset: 0.12 },
        { transform: "translate(20px,40px) rotate(54deg)", offset: 0.5 },
        { transform: "translate(28px,65px) rotate(80deg)", offset: 0.68 },
        { transform: "translate(26px,58px) rotate(75deg)", offset: 0.8 },
        { transform: "translate(29px,66px) rotate(78deg)", offset: 1 },
      ],
      { duration: 950, easing: "cubic-bezier(.45,.05,.55,1)", fill: "forwards" },
    );

    tak?.animate(
      [
        { transform: "translateY(0)" },
        { transform: "translateY(-4px)", offset: 0.3 },
        { transform: "translateY(2px)", offset: 0.62 },
        { transform: "translateY(0)" },
      ],
      { duration: 700, delay: 200, easing: "ease-out" },
    );
    straks(() => klap(false), 620);

    straks(() => {
      svg.classList.remove(styles.geraakt);
      const op = lijf!.animate(
        [
          { transform: "translate(29px,66px) rotate(78deg)" },
          { transform: "translate(12px,24px) rotate(24deg)", offset: 0.55 },
          { transform: "translate(0px,-6px) rotate(-6deg)", offset: 0.82 },
          { transform: "translate(0px,0px) rotate(0deg)" },
        ],
        { duration: 750, easing: "cubic-bezier(.34,1.5,.64,1)", fill: "forwards" },
      );
      straks(() => {
        valAnim.current?.cancel();
        valAnim.current = null;
        op.cancel();
        geraaktBezig.current = false;
      }, 820);
    }, 2400);
  };

  useEffect(
    () => () => {
      klokken.current.forEach(clearTimeout);
      klokken.current = [];
      audio.current?.close().catch(() => {});
      audio.current = null;
    },
    [],
  );

  useImperativeHandle(ref, () => ({
    zetAmp: (d: number) => {
      doel.current = Math.max(0, Math.min(1, d));
      wek();
    },
    knipper: () => {
      if (!beweegArm()) return;
      svgRef.current
        ?.querySelectorAll(`.${styles.oogGroep}`)
        .forEach((oog) =>
          oog.animate(
            [
              { transform: "scaleY(1)" },
              { transform: "scaleY(.08)", offset: 0.4 },
              { transform: "scaleY(1)" },
            ],
            { duration: 200, easing: "ease-in-out" },
          ),
        );
    },
    hup,
    raakHoofd,
  }));

  // Eye tracking cursor
  useEffect(() => {
    if (!oogVolgen) return;
    const svg = svgRef.current;
    if (!svg) return;
    const pupillen = svg.querySelectorAll<SVGCircleElement>("[data-pupil]");
    const bases = [
      { x: 100, y: 128 },
      { x: 160, y: 128 },
    ];
    const onMove = (e: MouseEvent) => {
      const r = svg.getBoundingClientRect();
      const schaal = 260 / r.width;
      const muisX = (e.clientX - r.left) * schaal;
      const muisY = (e.clientY - r.top) * schaal;
      pupillen.forEach((p, i) => {
        const b = bases[i];
        const dx = muisX - b.x;
        const dy = muisY - b.y;
        const d = Math.hypot(dx, dy) || 1;
        const straal = Math.min(5, d * 0.08);
        p.setAttribute("cx", (b.x + (dx / d) * straal).toFixed(1));
        p.setAttribute("cy", (b.y + (dy / d) * straal).toFixed(1));
      });
    };
    const onLeave = () => {
      pupillen.forEach((p, i) => {
        p.setAttribute("cx", String(bases[i].x));
        p.setAttribute("cy", String(bases[i].y));
      });
    };
    svg.addEventListener("mousemove", onMove);
    svg.addEventListener("mouseleave", onLeave);
    return () => {
      svg.removeEventListener("mousemove", onMove);
      svg.removeEventListener("mouseleave", onLeave);
    };
  }, [oogVolgen]);

  const isOcean = colorScheme === "ocean";
  const hoogte = Math.round((size / 260) * 270);

  return (
    <svg
      ref={svgRef}
      className={`${styles.figuur} ${styles[stand]} ${className ?? ""}`}
      width={size}
      height={hoogte}
      viewBox="0 0 260 270"
      role={decoratief ? "presentation" : "img"}
      aria-hidden={decoratief ? "true" : undefined}
      aria-label={decoratief ? undefined : label}
      onClick={() => {
        if (speels) hup();
        onClick?.();
      }}
      style={{ cursor: speels ? "pointer" : "default" }}
    >
      <defs>
        <clipPath id={`dove-clip-${clipId}`}>
          <ellipse cx="130" cy="160" rx="70" ry="74" />
        </clipPath>
        <linearGradient id={`dove-grad-${clipId}`} x1="0" y1="0" x2="0" y2="1">
          {isOcean ? (
            <>
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="55%" stopColor="#0ea5e9" />
              <stop offset="100%" stopColor="#0284c7" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#f1f5f9" />
            </>
          )}
        </linearGradient>
        <linearGradient id={`belly-grad-${clipId}`} x1="0" y1="0" x2="0" y2="1">
          {isOcean ? (
            <>
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#dbeafe" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#e0f2fe" />
              <stop offset="100%" stopColor="#bae6fd" />
            </>
          )}
        </linearGradient>
        <linearGradient id={`wing-grad-${clipId}`} x1="0" y1="0" x2="0" y2="1">
          {isOcean ? (
            <>
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0369a1" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#f1f5f9" />
            </>
          )}
        </linearGradient>
      </defs>

      {/* Cloud or Base Perch */}
      {!kaal && (
        <g data-tak>
          <ellipse cx="130" cy="256" rx="86" ry="12" fill={isOcean ? "#bfdbfe" : "#e2e8f0"} opacity="0.6" />
          <path
            d="M50 254 C60 242 80 242 92 250 C104 238 132 238 144 250 C156 240 184 240 196 250 C206 244 218 248 222 254"
            fill="#ffffff"
            stroke={isOcean ? "#93c5fd" : "#cbd5e1"}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </g>
      )}

      {/* Main Body */}
      <g data-lijf className={styles.lijf}>
        <g className={styles.romp}>
          {/* Main Body */}
          <ellipse
            cx="130"
            cy="160"
            rx="70"
            ry="74"
            fill={`url(#dove-grad-${clipId})`}
            stroke={isOcean ? "#0284c7" : "#e2e8f0"}
            strokeWidth="2.5"
          />

          {/* Soft Belly */}
          <g clipPath={`url(#dove-clip-${clipId})`}>
            <ellipse
              cx="130"
              cy="188"
              rx="52"
              ry="44"
              fill={`url(#belly-grad-${clipId})`}
            />
          </g>

          {/* Left Wing */}
          <g className={styles.vleugelL}>
            <path
              d="M62 142 C36 172 44 212 56 220 C72 212 76 178 72 152 Z"
              fill={isOcean ? `url(#wing-grad-${clipId})` : "#f8fafc"}
              stroke={isOcean ? "#0369a1" : "#cbd5e1"}
              strokeWidth="2"
            />
          </g>

          {/* Right Wing */}
          <g className={styles.vleugelR}>
            <path
              d="M198 142 C224 172 216 212 204 220 C188 212 184 178 188 152 Z"
              fill={isOcean ? `url(#wing-grad-${clipId})` : "#f8fafc"}
              stroke={isOcean ? "#0369a1" : "#cbd5e1"}
              strokeWidth="2"
            />
          </g>

          {/* Face Elements */}
          <g className={styles.gezicht}>
            {/* Top Crest / Feathers */}
            <g className={styles.kuif}>
              <path
                d="M124 94 Q132 50 152 42 Q142 66 144 93 Z"
                fill={isOcean ? "#38bdf8" : "#ffffff"}
                stroke={isOcean ? "#0284c7" : "#cbd5e1"}
                strokeWidth="2"
              />
            </g>

            {/* Rosy Cheeks */}
            <circle cx="82" cy="144" r="8" fill={isOcean ? "#fda4af" : "#fecdd3"} opacity={isOcean ? 0.85 : 0.7} />
            <circle cx="178" cy="144" r="8" fill={isOcean ? "#fda4af" : "#fecdd3"} opacity={isOcean ? 0.85 : 0.7} />

            {/* Eyes */}
            <circle cx="98" cy="126" r="18" fill="#ffffff" stroke={isOcean ? "#0284c7" : "#cbd5e1"} strokeWidth="1.5" />
            <circle cx="162" cy="126" r="18" fill="#ffffff" stroke={isOcean ? "#0284c7" : "#cbd5e1"} strokeWidth="1.5" />

            {/* Eyebrows */}
            <path
              className={styles.wenkbrauw}
              d="M86 106 Q98 101 108 105"
              stroke="#334155"
              strokeWidth="3.2"
              fill="none"
              strokeLinecap="round"
            />
            <path
              className={styles.wenkbrauw}
              d="M152 105 Q162 101 174 106"
              stroke="#334155"
              strokeWidth="3.2"
              fill="none"
              strokeLinecap="round"
            />

            {/* Normal Pupils */}
            <g className={styles.oogGroep}>
              <circle data-pupil cx="100" cy="128" r="12" fill="#0f172a" />
              <circle cx="96" cy="123" r="3.8" fill="#ffffff" />
              <circle cx="104" cy="132" r="1.5" fill="#ffffff" />
            </g>
            <g className={`${styles.oogGroep} ${styles.r}`}>
              <circle data-pupil cx="160" cy="128" r="12" fill="#0f172a" />
              <circle cx="156" cy="123" r="3.8" fill="#ffffff" />
              <circle cx="164" cy="132" r="1.5" fill="#ffffff" />
            </g>

            {/* Cross Eyes (Easter Egg when hit) */}
            <g
              className={styles.kruisOog}
              stroke="#0f172a"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
            >
              <path d="M88 116 L108 136 M108 116 L88 136" />
              <path d="M152 116 L172 136 M172 116 L152 136" />
            </g>

            {/* Beak & Mouth */}
            <g>
              <ellipse data-mond cx="130" cy="154" rx="10" ry="2.5" fill="#dc2626" opacity="0" />
              <polygon points="130,134 115,148 130,156 145,148" fill="#fb923c" />
              <g data-kaak>
                <polygon points="119,152 130,155 141,152 130,163" fill="#f97316" />
              </g>
            </g>

            <text className={styles.zzz} x="176" y="86">
              z z
            </text>
          </g>

          {/* Stethoscope around neck */}
          <g>
            <path
              d="M86 166 C84 196 112 216 130 216 C148 216 176 196 174 166"
              fill="none"
              stroke={isOcean ? "#1e293b" : "#475569"}
              strokeWidth="3.8"
              strokeLinecap="round"
            />
            <path d="M130 216 L130 226" fill="none" stroke={isOcean ? "#1e293b" : "#475569"} strokeWidth="3.8" />
            {/* Chest Piece */}
            <circle cx="130" cy="232" r="9" fill="#94a3b8" />
            <circle cx="130" cy="232" r="7" fill={isOcean ? "#0057cd" : "#0d6efd"} />
            <circle cx="130" cy="232" r="2.5" fill="#ffffff" />
          </g>

          {/* Crossbody First-Aid Bag with Medical Cross */}
          <g>
            <path
              d="M94 150 L172 216"
              fill="none"
              stroke="#059669"
              strokeWidth="2.8"
              strokeDasharray="4 2"
              opacity="0.85"
            />
            {/* Pouch */}
            <rect
              x="154"
              y="200"
              width="28"
              height="22"
              rx="6"
              fill="#10b981"
              stroke="#047857"
              strokeWidth="1.5"
            />
            {/* White Cross on Pouch */}
            <rect x="166" y="205" width="4" height="12" rx="1" fill="#ffffff" />
            <rect x="162" y="209" width="12" height="4" rx="1" fill="#ffffff" />
          </g>

          {/* Cute Orange Feet */}
          <path
            d="M112 238 L110 248 M118 239 L117 248 M142 239 L143 248 M148 238 L150 248"
            stroke="#fb923c"
            strokeWidth="3.2"
            strokeLinecap="round"
          />

          {/* Forehead Click Zone for Easter Egg */}
          {paasei && (
            <circle
              className={styles.zone}
              cx="130"
              cy="110"
              r="22"
              onClick={(e) => {
                e.stopPropagation();
                raakHoofd();
              }}
              title="Gõ nhẹ vào trán tớ nè!"
            />
          )}

          {/* Hitmarker SVG effect */}
          <g
            data-hitmarker
            className={styles.hitmarker}
            stroke="#ef4444"
            strokeWidth="3"
            strokeLinecap="round"
            transform="translate(130, 110)"
          >
            <line x1="-12" y1="-12" x2="-5" y2="-5" />
            <line x1="12" y1="-12" x2="5" y2="-5" />
            <line x1="-12" y1="12" x2="-5" y2="5" />
            <line x1="12" y1="12" x2="5" y2="5" />
          </g>
        </g>
      </g>
    </svg>
  );
});
