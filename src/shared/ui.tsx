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

