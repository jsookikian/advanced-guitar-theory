import { titlePieces } from "./notation";
import type { TitlePiece } from "./notation";
import { INK, INK2, PAGE, REALBOOK, SANS } from "./ui";

// Share: draw a diagram onto a 1080-wide paper-white PNG under its bold chord name, then hand it to the native share sheet (or download it).
export async function shareBoard(opts: { svg: SVGSVGElement; title: string; subtitle?: string; fileName: string }): Promise<void> {
  const { svg, title, subtitle, fileName } = opts;
  try { await document.fonts.load(`400 88px ${REALBOOK}`, `${title}♭♯`); await document.fonts.ready; } catch { /* draw with fallbacks */ }
  const W = 1080;
  const M = 80;
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const vb = svg.viewBox.baseVal;
  // Notes that are only faded on screen are left out of the image.
  clone.querySelectorAll('g[data-vis="1"]').forEach((g: Element) => { const c = g.querySelector("circle[data-dot]"); if (c && parseFloat((c as SVGElement).style.opacity || "1") < 0.5) g.remove(); });
  const bw = W - 2 * M;
  const bh = (bw * vb.height) / vb.width;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(bw));
  clone.setAttribute("height", String(bh));
  clone.removeAttribute("id");
  [clone, ...Array.from(clone.querySelectorAll("*"))].forEach((el: Element) => {
    const st = (el as SVGElement).style;
    if (!st) return;
    st.setProperty("animation", "none", "important");
    st.setProperty("transition", "none", "important");
  });
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml;charset=utf-8" }));
  const img = new Image();
  await new Promise<void>((res: () => void, rej: (e: unknown) => void) => { img.onload = () => res(); img.onerror = (e: unknown) => rej(e); img.src = url; });
  // The chord name, then (when there is one) its subtitle line, then the diagram: one-line and two-line headers keep the same tidy air.
  const TITLE_H = subtitle ? 176 : 120;
  const H = M + TITLE_H + bh + M;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = PAGE;
  ctx.fillRect(0, 0, W, H);
  const pieces = titlePieces(title);
  const widthAt = (px: number): number => pieces.reduce((w: number, x: TitlePiece) => { ctx.font = `400 ${px * x.scale}px ${REALBOOK}`; return w + ctx.measureText(x.t).width + (x.after ?? 0) * px; }, 0);
  let fs = 104;
  while (fs > 44 && widthAt(fs) > W - 2 * M) fs -= 4;
  ctx.fillStyle = INK;
  ctx.textAlign = "left";
  let tx = (W - widthAt(fs)) / 2;
  pieces.forEach((x: TitlePiece) => {
    ctx.font = `400 ${fs * x.scale}px ${REALBOOK}`;
    ctx.fillText(x.t, tx, M + 90 - fs * x.rise);
    tx += ctx.measureText(x.t).width + (x.after ?? 0) * fs;
  });
  if (subtitle) {
    ctx.font = `400 34px ${SANS}`;
    ctx.fillStyle = INK2;
    ctx.textAlign = "center";
    let sub = subtitle;
    while (sub.length > 4 && ctx.measureText(sub).width > W - 2 * M) sub = sub.slice(0, -1);
    ctx.fillText(sub, W / 2, M + 140);
  }
  ctx.drawImage(img, M, M + TITLE_H, bw, bh);
  URL.revokeObjectURL(url);
  const blob = await new Promise<Blob | null>((res: (b: Blob | null) => void) => cv.toBlob(res, "image/png"));
  if (!blob) return;
  const file = new File([blob], fileName, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
    try { await nav.share({ files: [file] }); return; } catch (e) { if ((e as Error).name === "AbortError") return; }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
