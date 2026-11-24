import { useState, useEffect, useLayoutEffect, useRef } from "grok/canvas";
import type { CSSProperties } from "grok/canvas";
import { pipify } from "./pip";

// A coach-mark tour of the lesson's controls: one spotlight on one control at a time, with a short note and Back / Next.
// Each step names a CSS selector for what to light and, when the control only exists on another card, where to go first (`at`).
// The note always sits right beside what it lights. `also` lights a second control together with `sel` (their union); `settings` opens the settings panel for that step.
// `live` steps let taps through to the lit control (so "tap a dot" really plays it); every other step blocks the page behind the note.
export interface TutStep { sel: string; title: string; text: string; at?: [number, number]; live?: boolean; also?: string; settings?: boolean }

const INK = "#4d3533";
const INK2 = "#806a68";
const PAGE = "#fdfcfb";
const LINE_UI = "#b9aeac";
const SERIF = "Aime, Georgia, serif";
const EASE = "cubic-bezier(.45,.05,.25,1)";
const SANS = "'KMR Melange Grotesk', -apple-system, 'Helvetica Neue', Arial, sans-serif";

interface Box { top: number; left: number; width: number; height: number }

const pill = (primary: boolean): CSSProperties => ({
  height: 36, padding: "0 14px", borderRadius: 18, border: `1px solid ${primary ? INK : LINE_UI}`, cursor: "pointer",
  fontFamily: SANS, fontSize: 14, fontWeight: 500, lineHeight: "18px", color: primary ? PAGE : INK, backgroundColor: primary ? INK : PAGE,
});

// The part of the window the page content can actually be seen in: below a pinned header and above a fixed bottom bar (both phone-only).
function visibleLimits(): { top: number; bottom: number } {
  const hd = document.querySelector(".agt-sticky") as HTMLElement | null;
  const bar = document.querySelector(".agt-bottombar") as HTMLElement | null;
  const top = hd && getComputedStyle(hd).position === "sticky" ? hd.getBoundingClientRect().bottom : 0;
  const bottom = bar && getComputedStyle(bar).position === "fixed" ? bar.getBoundingClientRect().top : window.innerHeight;
  return { top, bottom };
}

export default function Tutorial(props: { steps: TutStep[]; onStep: (s: TutStep) => boolean; onClose: (finished: boolean) => void }) {
  const { steps, onStep, onClose } = props;
  const [i, setI] = useState<number>(0);
  const [box, setBox] = useState<Box | null>(null);
  const [cardTop, setCardTop] = useState<number>(12);
  const cardRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<Box | null>(null);
  boxRef.current = box;
  const pad = 6;
  const step = steps[i];
  const last = i === steps.length - 1;

  // On every step: go to the card the control lives on. If that changed the screen (another card or beat, the settings panel opening or
  // closing), the spotlight and the note fade out, the page settles, and they fade in on the new target; if nothing moved they glide.
  useEffect(() => {
    const moved = onStep(step);
    if (moved) setBox(null);
    let alive = true;
    const timers: number[] = [];
    const measure = (far: boolean = false): void => {
      const el = document.querySelector(step.sel);
      if (!alive || !el) return;
      const r = el.getBoundingClientRect();
      const o = step.also ? document.querySelector(step.also) : null;
      const q = o ? o.getBoundingClientRect() : r;
      const top = Math.min(r.top, q.top);
      const left = Math.min(r.left, q.left);
      const nb = { top, left, width: Math.max(r.right, q.right) - left, height: Math.max(r.bottom, q.bottom) - top };
      // A long way to travel (more than 240 px) fades out and in instead of racing across the screen.
      const prev = boxRef.current;
      if (far && prev && Math.abs(nb.top - prev.top) > 240) { setBox(null); timers.push(window.setTimeout(() => { if (alive) setBox(nb); }, 260)); } else setBox(nb);
    };
    let tries = 0;
    const find = (): void => {
      if (!alive) return;
      const el = document.querySelector(step.sel);
      if (!el) { if (tries++ < 20) timers.push(window.setTimeout(find, 100)); return; }
      const r = el.getBoundingClientRect();
      const lim = visibleLimits();
      if (!el.closest(".agt-sticky, .agt-bottombar") && (r.top < lim.top || r.bottom > lim.bottom)) el.scrollIntoView({ block: "center" });
      measure(true);
    };
    // 420 ms covers the card's 340 ms slide and the settings panel's 280 ms; measuring once, after it, means the spotlight never chases moving content.
    timers.push(window.setTimeout(find, moved ? 420 : 0));
    const onMove = (): void => measure();
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => { alive = false; timers.forEach((t: number) => window.clearTimeout(t)); window.removeEventListener("resize", onMove); window.removeEventListener("scroll", onMove, true); };
  }, [i]);

  // Put the note right below the lit control, or above it when there is no room; never off screen.
  useLayoutEffect(() => {
    const h = cardRef.current ? cardRef.current.offsetHeight : 0;
    const vh = visibleLimits().bottom;
    if (!box) { setCardTop(Math.max(12, vh - h - 12)); return; }
    let t = box.top + box.height + 18;
    if (t + h > vh - 8) t = box.top - 18 - h;
    if (t < 8) t = vh - h - 8;
    setCardTop(t);
  }, [box, i]);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent): void => {
      if (e.key === "Escape") onClose(false);
      if (e.key === "ArrowRight") { e.stopPropagation(); if (last) onClose(true); else setI((n: number) => n + 1); }
      if (e.key === "ArrowLeft") { e.stopPropagation(); setI((n: number) => Math.max(0, n - 1)); }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [last]);

    return (
    <div role="dialog" aria-modal="true" aria-label="Tutorial" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, pointerEvents: "none", backgroundColor: box ? "rgba(40,25,24,0)" : "rgba(40,25,24,0.55)", transition: `background-color 200ms ${EASE}`, animation: `tut-fade 260ms ${EASE} both` }}>
      <style>{"@keyframes tut-fade{from{opacity:0}to{opacity:1}} @keyframes tut-swap{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}} @media (prefers-reduced-motion:reduce){[role=dialog],[role=dialog] *{animation:none!important;transition:none!important}}"}</style>
      {/* Click shield: the whole page, or (on a live step) everything around the lit control. */}
      {!box || !step.live ? (
        <div aria-hidden="true" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "auto", backgroundColor: "transparent" }} />
      ) : (
        <>
          {[
            { top: 0, left: 0, right: 0, height: Math.max(0, box.top - pad) },
            { top: box.top + box.height + pad, left: 0, right: 0, bottom: 0 },
            { top: box.top - pad, left: 0, width: Math.max(0, box.left - pad), height: box.height + pad * 2 },
            { top: box.top - pad, left: box.left + box.width + pad, right: 0, height: box.height + pad * 2 },
          ].map((r: CSSProperties, n: number) => <div key={n} aria-hidden="true" style={{ position: "fixed", pointerEvents: "auto", backgroundColor: "transparent", ...r }} />)}
        </>
      )}
      {box ? (
        <div aria-hidden="true" style={{ position: "fixed", top: box.top - pad, left: box.left - pad, width: box.width + pad * 2, height: box.height + pad * 2, borderRadius: 12, boxShadow: "0 0 0 9999px rgba(40,25,24,0.55)", border: `2px solid ${PAGE}`, boxSizing: "border-box", pointerEvents: "none", transition: `top 320ms ${EASE}, left 320ms ${EASE}, width 320ms ${EASE}, height 320ms ${EASE}`, animation: `tut-fade 260ms ${EASE} both` }} />
      ) : null}
      <div ref={cardRef} style={{ position: "fixed", pointerEvents: "auto", opacity: box ? 1 : 0, transition: `top 320ms ${EASE}, opacity 260ms ${EASE}`, top: cardTop, left: "50%", transform: "translateX(-50%)", width: "min(340px, calc(100vw - 24px))", boxSizing: "border-box", padding: "14px 16px 12px", borderRadius: 14, border: `1px solid ${LINE_UI}`, backgroundColor: PAGE, color: INK, boxShadow: "0 8px 28px rgba(40,25,24,0.28)", display: "flex", flexDirection: "column", gap: 6 }}>
        <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6, backgroundColor: PAGE, animation: `tut-swap 260ms ${EASE} both` }}>
        <div style={{ fontFamily: SANS, fontSize: 11.5, lineHeight: "16px", color: INK2, backgroundColor: PAGE }}>{`${i + 1} of ${steps.length}`}</div>
        <h2 style={{ margin: 0, fontFamily: SERIF, fontSize: 20, fontWeight: 400, lineHeight: "24px", letterSpacing: "-0.4px", color: INK, backgroundColor: PAGE }}>{step.title}</h2>
        <p style={{ margin: 0, fontFamily: SANS, fontSize: 14, fontWeight: 350, lineHeight: "20px", color: INK, backgroundColor: PAGE }}>{pipify(step.text, { root: "C" })}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, backgroundColor: PAGE }}>
          <button type="button" onClick={() => onClose(false)} style={{ padding: 0, border: 0, boxShadow: "none", cursor: "pointer", fontFamily: SANS, fontSize: 13, color: INK2, backgroundColor: PAGE, textDecoration: "underline", textUnderlineOffset: 2 }}>{last ? "Close" : "Skip"}</button>
          <span style={{ flex: 1 }} />
          {i > 0 ? <button type="button" onClick={() => setI(i - 1)} style={pill(false)}>Back</button> : null}
          <button type="button" onClick={() => { if (last) onClose(true); else setI(i + 1); }} style={pill(true)}>{last ? "Done" : "Next"}</button>
        </div>
      </div>
    </div>
  );
}
