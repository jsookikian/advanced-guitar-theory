// Guitar sound for the lessons: recorded notes, played through Web Audio.
// The shape follows how Oolimo.com does it: one recorded sample per pitch, nothing downloads or sounds until the first
// tap (browsers require a gesture), a note per tap, chords as staggered notes. The samples are the FluidR3_GM soundfont
// (Frank Wen, CC BY 3.0) as packaged by gleitz/midi-js-soundfonts, vendored in /sounds. If the sample files can't be
// fetched (for example the page was opened from file://), a synthesised pluck stands in so the page still makes sound.

type AC = AudioContext;

export type InstrumentId = "nylon" | "steel" | "jazz";
export const INSTRUMENTS: { id: InstrumentId; label: string; file: string }[] = [
  { id: "nylon", label: "Nylon acoustic", file: "acoustic_guitar_nylon" },
  { id: "steel", label: "Steel acoustic", file: "acoustic_guitar_steel" },
  { id: "jazz", label: "Jazz electric", file: "electric_guitar_jazz" },
];

let ctx: AC | null = null;
let bus: GainNode | null = null;
let baseUrl = "../../sounds/";
let instrument: InstrumentId = "nylon";
// Raw data URLs per instrument (parsed once from the soundfont file) and decoded buffers per instrument and pitch.
const fonts = new Map<InstrumentId, Promise<Map<string, string> | null>>();
const decoded = new Map<string, AudioBuffer>();
const pending = new Map<string, Promise<AudioBuffer>>();
// What is sounding or scheduled right now, so a phrase can be stopped part-way.
const active = new Set<{ src: AudioBufferSourceNode; g: GainNode }>();
let timers: number[] = [];
let resolvers: Array<() => void> = [];
let epoch = 0;

/** Where the /sounds folder is, relative to the lesson page. */
export function configureAudio(opts: { baseUrl: string }): void { baseUrl = opts.baseUrl.endsWith("/") ? opts.baseUrl : opts.baseUrl + "/"; }
export function setInstrument(id: InstrumentId): void { instrument = id; }
export function getInstrument(): InstrumentId { return instrument; }

// The context must be created or resumed inside a user gesture (iOS and Chrome both require it): every public
// function here is meant to be called from a click or tap handler.
function ensure(): AC | null {
  if (ctx) {
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  }
  const Ctor = (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
  if (!Ctor) return null;
  ctx = new Ctor();
  bus = ctx.createGain();
  bus.gain.value = 0.9;
  const comp = ctx.createDynamicsCompressor();
  bus.connect(comp);
  comp.connect(ctx.destination);
  return ctx;
}

const NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const noteName = (midi: number): string => `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;

function loadFont(id: InstrumentId): Promise<Map<string, string> | null> {
  let p = fonts.get(id);
  if (!p) {
    const file = INSTRUMENTS.find((i) => i.id === id)?.file ?? INSTRUMENTS[0].file;
    p = fetch(`${baseUrl}${file}-mp3.js`)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((txt) => {
        const m = new Map<string, string>();
        const re = /"([A-G][b#]?\d)":\s*"(data:audio\/mp3;base64,[^"]+)"/g;
        let hit: RegExpExecArray | null;
        while ((hit = re.exec(txt)) !== null) m.set(hit[1], hit[2]);
        return m.size > 0 ? m : null;
      })
      .catch(() => null);
    fonts.set(id, p);
  }
  return p;
}

// --- Fallback: a synthesised pluck (Karplus-Strong), used only when the samples can't be loaded. ---
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function synth(c: AC, midi: number): AudioBuffer {
  const sr = c.sampleRate;
  const f = 440 * Math.pow(2, (midi - 69) / 12);
  const N = Math.max(2, Math.round(sr / f));
  const len = Math.floor(sr * (midi < 48 ? 3.4 : midi < 64 ? 2.8 : 2.2));
  const y = new Float32Array(len);
  const rnd = mulberry32(midi * 7919);
  for (let i = 0; i < N; i++) y[i] = rnd() * 2 - 1;
  for (let pass = 0; pass < 2; pass++) for (let i = N - 1; i > 0; i--) y[i] = 0.5 * (y[i] + y[i - 1]);
  const decay = midi < 52 ? 0.9985 : 0.997;
  for (let i = N + 1; i < len; i++) y[i] = decay * 0.5 * (y[i - N] + y[i - N - 1]);
  let peak = 0;
  for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(y[i]));
  const g = peak > 0 ? 0.9 / peak : 1;
  const tail = Math.floor(sr * 0.25);
  for (let i = 0; i < len; i++) y[i] *= g * (i > len - tail ? (len - i) / tail : 1);
  const buf = c.createBuffer(1, len, sr);
  buf.copyToChannel(y, 0);
  return buf;
}

/** Make sure a pitch is decoded and ready (samples if available, else the synth). */
function buffer(c: AC, midi: number): Promise<AudioBuffer> {
  const key = `${instrument}:${midi}`;
  const have = decoded.get(key);
  if (have) return Promise.resolve(have);
  let p = pending.get(key);
  if (!p) {
    const inst = instrument;
    p = loadFont(inst)
      .then(async (font) => {
        const url = font?.get(noteName(midi));
        if (!url) return synth(c, midi);
        const raw = await (await fetch(url)).arrayBuffer();
        return await c.decodeAudioData(raw);
      })
      .catch(() => synth(c, midi))
      .then((b) => { decoded.set(key, b); pending.delete(key); return b; });
    pending.set(key, p);
  }
  return p;
}

function start(c: AC, b: AudioBuffer, at: number, vel: number, hold: number): void {
  if (!bus) return;
  const src = c.createBufferSource();
  src.buffer = b;
  const g = c.createGain();
  g.gain.setValueAtTime(vel, at);
  if (hold > 0) {
    g.gain.setValueAtTime(vel, at + hold);
    g.gain.exponentialRampToValueAtTime(0.001, at + hold + 0.4);
  }
  src.connect(g);
  g.connect(bus);
  src.start(at);
  const entry = { src, g };
  active.add(entry);
  src.onended = () => { active.delete(entry); };
}

/** Stop everything that is playing or scheduled (a short fade, so there is no click) and wake anything waiting on a phrase. */
export function stopAll(): void {
  epoch++;
  timers.forEach((t: number) => window.clearTimeout(t));
  timers = [];
  if (ctx) {
    const now = ctx.currentTime;
    active.forEach(({ src, g }) => {
      try {
        g.gain.cancelScheduledValues(now);
        g.gain.setTargetAtTime(0, now, 0.03);
        src.stop(now + 0.2);
      } catch { /* already stopped */ }
    });
  }
  active.clear();
  const r = resolvers;
  resolvers = [];
  r.forEach((fn: () => void) => fn());
}

/** Play one note now (the first tap on a pitch waits a moment for its sample to decode). `hold` seconds before the release; 0 lets it ring. */
export async function pluck(midi: number, vel = 0.75, hold = 0): Promise<void> {
  const c = ensure();
  if (!c) return;
  const b = await buffer(c, midi);
  start(c, b, c.currentTime + 0.01, vel, hold);
}

/**
 * A phrase: an optional bass note that rings underneath, then the notes either one after another (arpeggio) or strummed
 * together low to high. Every sample is decoded first, so the timing between notes is exact once it starts.
 * Resolves when the phrase should have finished.
 */
export async function playPhrase(opts: { bass?: number; notes: number[]; style: "arpeggio" | "strum"; onNote?: (midi: number) => void }): Promise<void> {
  const c = ensure();
  if (!c) return;
  const { bass, notes, style, onNote } = opts;
  const mine = ++epoch;
  const sorted = [...notes].sort((a: number, b: number) => a - b);
  const all = bass === undefined ? sorted : [bass, ...sorted];
  const bufs = new Map<number, AudioBuffer>();
  await Promise.all(Array.from(new Set(all)).map(async (m: number) => { bufs.set(m, await buffer(c, m)); }));
  if (mine !== epoch) return; // stopped (or replaced) while the samples were decoding
  const t0 = c.currentTime + 0.03;
  let t = 0;
  if (bass !== undefined) { start(c, bufs.get(bass) as AudioBuffer, t0, 0.7, 0); t = 0.12; }
  const dur = style === "strum" ? 0.038 : 0.26;
  sorted.forEach((m: number, i: number) => {
    const at = t + i * dur;
    start(c, bufs.get(m) as AudioBuffer, t0 + at, style === "strum" ? 0.7 : 0.8, style === "strum" ? 0 : dur * 0.95);
    if (onNote) timers.push(window.setTimeout(() => onNote(m), Math.max(0, (t0 - c.currentTime + at) * 1000)));
  });
  await new Promise<void>((res: () => void) => {
    resolvers.push(res);
    timers.push(window.setTimeout(res, (t0 - c.currentTime + t + sorted.length * dur + 0.5) * 1000));
  });
}
