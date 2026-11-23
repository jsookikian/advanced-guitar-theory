import type { ReactNode } from "grok/canvas";
import tokens from "./tokens.json";

// Every note name and interval in running text is a small circle (roots red, the 9 teal, the rest ink), like the dots on the board.
// `pipify` finds them in a string (see tokens.json; `[x]` forces one); tests/circles.js enforces that none are left as plain text.
const RED = "#e8372a";
const TEAL = "#0f766e";
const INK = "#4d3533";

// A double flat or sharp (\u266d\u266d7, B\u266d\u266d) is two signs with a little air between them, so it reads as two and not one blob.
function spaced(label: string): ReactNode {
  return label.split(/([\u266d\u266f]{2})/).map((part: string, i: number) => (i % 2 === 1 ? <span key={i} data-dbl="1" style={{ letterSpacing: "0.14em", marginRight: "0.08em" }}>{part}</span> : part));
}
export function Pip(props: { label: string; root?: string; ninth?: string }) {
  const { label, root, ninth } = props;
  const bg = label === "R" || label === root ? RED : label === "9" || label === ninth ? TEAL : INK;
  return (
    <span data-pip="1" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 18, height: 18, padding: "0 5px", margin: "0 1px", boxSizing: "border-box", verticalAlign: "baseline", borderRadius: 9, fontFamily: "'KMR Melange Grotesk', -apple-system, 'Helvetica Neue', Arial, sans-serif", fontSize: 11, fontWeight: 700, lineHeight: "18px", letterSpacing: 0, color: "#ffffff", backgroundColor: bg }}>{spaced(label)}</span>
  );
}

export function pipify(text: string, o: { root?: string; ninth?: string } = {}): ReactNode {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(new RegExp(tokens.source, tokens.flags))) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    const t = m[0];
    out.push(<Pip key={`p${at}`} label={t.startsWith("[") ? t.slice(1, -1) : t} root={o.root} ninth={o.ninth} />);
    last = at + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
