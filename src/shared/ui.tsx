import type { ReactNode } from "grok/canvas";
import { titleNodes, spokenName } from "./notation";

// The sheet's palette and the quiet controls shared by the lessons.
export const INK = "#4d3533";
export const INK2 = "#806a68";
export const PAGE = "#fdfcfb";
export const LINE = "#dcd5d4";
export const LINE_UI = "#b9aeac";
export const TEAL = "#0f766e";
export const RED = "#e8372a";
export const SERIF = "Aime, Georgia, serif";
export const REALBOOK = "'MuseJazz Text', 'KMR Melange Grotesk', -apple-system, 'Helvetica Neue', Arial, sans-serif";
export const SANS = "'KMR Melange Grotesk', -apple-system, 'Helvetica Neue', Arial, sans-serif";
export const EASE = "cubic-bezier(.45,.05,.25,1)";

// Quiet tabs for pickers: no boxes, no fills; the chosen one is dark, bold and underlined, the rest are grey text on a hairline.
export function Tabs(props: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void; weights?: number[]; className?: string; label: string; wrap?: boolean; size?: number; height?: number }) {
  const { options, value, onChange } = props;
  const w = props.weights && props.weights.length === options.length ? props.weights : options.map(() => 1);
  return (
    <div role="radiogroup" aria-label={props.label} className={props.className} style={{ display: "grid", gridTemplateColumns: w.map((x: number) => `minmax(0, ${x}fr)`).join(" "), height: props.height ?? 34, borderBottom: `1px solid ${LINE}`, backgroundColor: PAGE, boxSizing: "border-box" }}>
      {options.map((o: { value: string; label: string }) => {
        const on = o.value === value;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on} aria-label={spokenName(o.label)} onClick={() => onChange(o.value)} style={{ minWidth: 0, padding: 0, border: 0, borderRadius: 0, cursor: "pointer", fontFamily: SANS, fontSize: props.size ?? 13.5, fontWeight: on ? 700 : 400, lineHeight: props.wrap ? "15px" : "20px", whiteSpace: props.wrap ? "normal" : "nowrap", color: on ? INK : INK2, backgroundColor: PAGE, boxShadow: on ? `inset 0 -2px 0 ${INK}` : "none", transition: "color 200ms ease, box-shadow 200ms ease" }}>{titleNodes(o.label)}</button>
        );
      })}
    </div>
  );
}

const PAINT = ["color", "background-color", "fill", "stroke", "border-color", "border-left-color"];

// Re-assert every inline paint colour as !important, give unpainted HTML elements inherit/transparent,
// and cancel an inverting filter on any host ancestor, so no host or theme rule can repaint the sheet.
export function lockPaint(root: HTMLElement): void {
  root.style.setProperty("background-color", PAGE, "important");
  root.style.setProperty("color", INK, "important");
  root.style.setProperty("color-scheme", "only light", "important");
  const filters: string[] = [];
  let el: HTMLElement | null = root.parentElement;
  while (el) {
    const cs = getComputedStyle(el);
    if (cs.filter && cs.filter.includes("invert")) filters.push(cs.filter);
    el = el.parentElement;
  }
  if (filters.length > 0) root.style.setProperty("filter", filters.join(" "), "important");
  else root.style.removeProperty("filter");
  root.querySelectorAll("*").forEach((node: Element) => {
    const st = (node as HTMLElement).style;
    if (!st) return;
    PAINT.forEach((prop: string) => {
      const v = st.getPropertyValue(prop);
      if (v && st.getPropertyPriority(prop) !== "important") st.setProperty(prop, v, "important");
    });
    if (node instanceof HTMLElement) {
      if (!st.getPropertyValue("color")) st.setProperty("color", "inherit", "important");
      if (!st.getPropertyValue("background-color") && !st.getPropertyValue("background-image")) st.setProperty("background-color", "transparent", "important");
    }
  });
}


// The lesson header (title row and step progress) pins to the top of the screen on narrow screens, quietly: paper background, a hairline under it.
// The "Helps to know" and "Show tutorial" links sit below it and scroll away. On wide screens it is an ordinary block, as before.
export function StickyHeader(props: { children: ReactNode }) {
  return <div data-sticky="1" className="agt-sticky" style={{ backgroundColor: PAGE }}>{props.children}</div>;
}
export const STICKY_CSS = ".agt-sticky{display:flex;flex-direction:column;gap:8px} @media (max-width:600px){.agt-sticky{position:sticky;top:0;z-index:40;margin:-12px -16px 0;padding:12px 16px 6px;background:#fdfcfb;border-bottom:1px solid #dcd5d4}}"
  + " @media (max-width:600px){.agt-sticky h1{font-size:18px!important;line-height:22px!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}"
  + " body{padding-bottom:64px!important} .agt-bottombar{position:fixed;left:0;right:0;bottom:0;z-index:40;margin:0!important;padding:8px 16px calc(8px + env(safe-area-inset-bottom));background:#fdfcfb!important;border-top:1px solid #dcd5d4}"
  + " .agt-bottombar button{height:40px!important;font-size:14px!important}}"
  + " html,body{overflow-x:clip!important}";
