// Clocks plugin (digital + analog) for OpenDeck / Stream Deck SDK
// Renders the local time onto a canvas and pushes it to each visible key.
// Each key has its own settings, edited in the Property Inspector (pi.html).

const SIZE = 144;
const canvas = document.createElement("canvas");
canvas.width = SIZE;
canvas.height = SIZE;
const ctx = canvas.getContext("2d");

const ACTION_DIGITAL = "com.mrredstonia.clocks.digital";
const ACTION_ANALOG = "com.mrredstonia.clocks.analog";

const DEFAULTS_DIGITAL = {
  bgColor: "#000000",
  bgImage: "", // data URL, set from the Property Inspector
  bgOpacity: 100, // % opacity of the image; the background color shows through below 100
  timeColor: "#ffffff",
  secColor: "#4fc3f7",
  dateColor: "#ffffff",
  timeSize: 27,
  dateSize: 20,
  timeBold: true,
  dateBold: true,
  showSeconds: true,
  showDate: true,
  hour12: false,
  dateFormat: "wdDM", // wdDM | dM | wdDMY | dmy | iso
  timeFont: "monospace", // any installed font family name
  dateFont: "monospace",
  timeWrap: true, // wrap to a second line when too wide (off = shrink to fit)
  dateWrap: true,
};

const DEFAULTS_ANALOG = {
  bgColor: "#000000",
  bgImage: "",
  bgOpacity: 100,
  showFace: true,
  faceColor: "#111111",
  showRing: true,
  tickColor: "#ffffff",
  showHourTicks: true,
  showMinuteTicks: true,
  numbers: "quarter", // none | quarter | all
  numberSize: 14,
  numberColor: "#ffffff",
  hourHandColor: "#ffffff",
  minuteHandColor: "#ffffff",
  secondHandColor: "#4fc3f7", // same light blue as the icon
  showSecondHand: true,
  smoothSecond: false, // gliding sweep instead of one tick per second
  clockSize: 100, // % of the key
  handWidth: 3,
  showDate: true,
  dateColor: "#ffffff",
  dateSize: 14,
  dateFormat: "dM",
  numberFont: "sans-serif",
  numberBold: true,
  dateFont: "monospace",
  dateBold: true,
  dateWrap: true, // wrap to a second line when too wide (off = shrink to fit)
  dateY: 72, // vertical position: 0 = top edge of the key, 50 = centered, 100 = bottom edge
  bgFaceOnly: false, // keep a background image inside the clock face
};

const instances = new Map(); // action context -> { action, settings }
let ws = null;

const pad = (n) => String(n).padStart(2, "0");
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const GENERIC_FONTS = ["serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui"];

// Turn a user-typed family name into a safe CSS font-family value with a fallback.
function fontCss(name, fallback) {
  const clean = String(name || "").replace(/["';{}\\]/g, "").trim();
  if (!clean) return fallback;
  if (GENERIC_FONTS.includes(clean.toLowerCase())) return clean.toLowerCase();
  return `"${clean}", ${fallback}`;
}

function withDefaults(action, s) {
  const base = action === ACTION_ANALOG ? DEFAULTS_ANALOG : DEFAULTS_DIGITAL;
  return { ...base, ...(s || {}) };
}

function formatDate(now, fmt) {
  const d = now.getDate();
  const m = now.getMonth();
  const y = now.getFullYear();
  switch (fmt) {
    case "dM": return `${d} ${MONTHS[m]}`;
    case "wdDMY": return `${DAYS[now.getDay()]} ${d} ${MONTHS[m]} ${y}`;
    case "dm": return `${pad(d)}/${pad(m + 1)}`;
    case "dmy": return `${pad(d)}/${pad(m + 1)}/${y}`;
    case "iso": return `${y}-${pad(m + 1)}-${pad(d)}`;
    case "wdDM":
    default: return `${DAYS[now.getDay()]} ${d} ${MONTHS[m]}`;
  }
}

// ---- Background (color + optional image) -----------------------------------

const imgCache = new Map(); // data URL -> { img, ready }

function getBgImage(url) {
  if (!url) return null;
  let entry = imgCache.get(url);
  if (!entry) {
    if (imgCache.size > 20) imgCache.clear();
    const img = new Image();
    entry = { img, ready: false };
    img.onload = () => {
      entry.ready = true;
      push(); // redraw as soon as the image has decoded
    };
    img.src = url;
    imgCache.set(url, entry);
  }
  return entry.ready ? entry.img : null;
}

// Fills the key with the background color, then the optional image.
// With `circle` ({cx, cy, r}) the image is clipped to that circle (the analog
// face) instead of covering the whole key. Returns true if an image was drawn.
function drawBackground(s, circle) {
  ctx.fillStyle = s.bgColor;
  ctx.fillRect(0, 0, SIZE, SIZE);

  const img = getBgImage(s.bgImage);
  if (!(img && img.naturalWidth)) return false;

  const box = circle
    ? { x: circle.cx - circle.r, y: circle.cy - circle.r, w: circle.r * 2, h: circle.r * 2 }
    : { x: 0, y: 0, w: SIZE, h: SIZE };

  ctx.save();
  if (circle) {
    ctx.beginPath();
    ctx.arc(circle.cx, circle.cy, circle.r, 0, Math.PI * 2);
    ctx.clip();
  }
  // "cover": fill the box, cropping the overflow
  const scale = Math.max(box.w / img.naturalWidth, box.h / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  // Drawn at the chosen opacity, so the background color stays visible underneath.
  const rawOpacity = Number(s.bgOpacity);
  ctx.globalAlpha = Math.min(100, Math.max(0, Number.isFinite(rawOpacity) ? rawOpacity : 100)) / 100;
  ctx.drawImage(img, box.x + (box.w - w) / 2, box.y + (box.h - h) / 2, w, h);
  ctx.restore(); // also resets globalAlpha
  return true;
}

// ---- Text layout (with wrapping) -------------------------------------------

const TEXT_MAX_W = SIZE - 8;
const LINE_H = 1.12; // line height as a multiple of the font size
const GROUP_GAP = 5; // extra space between the time block and the date block

// Measure a line made of segments {text, px, family, color}. Digits are laid out
// in fixed-width cells (the widest digit of the font), so proportional fonts
// don't make the clock jiggle as the numbers change.
function measureLine(line) {
  let total = 0;
  for (const seg of line.segs) {
    ctx.font = `${line.weight} ${seg.px}px ${seg.family}`;
    let digitW = 0;
    for (const d of "0123456789") digitW = Math.max(digitW, ctx.measureText(d).width);
    seg.cells = [...seg.text].map((ch) => ({ ch, w: /\d/.test(ch) ? digitW : ctx.measureText(ch).width }));
    seg.w = seg.cells.reduce((sum, c) => sum + c.w, 0);
    total += seg.w;
  }
  line.w = total;
  line.px = line.segs[0].px; // main size: drives line height and baseline
  return total;
}

function makeSeg(text, size, scale, color, family) {
  return { text, px: Math.max(6, Math.round(size * scale)), color, family };
}

// Greedy word wrap. A single word that is too wide stays whole (it gets shrunk
// to fit afterwards).
function wrapWords(text, measureFn, maxW) {
  const out = [];
  let cur = "";
  for (const word of text.split(" ")) {
    const candidate = cur ? `${cur} ${word}` : word;
    if (cur && measureFn(candidate) > maxW) {
      out.push(cur);
      cur = word;
    } else {
      cur = candidate;
    }
  }
  if (cur) out.push(cur);
  return out;
}

// Lay out the time block (group 0) and date block (group 1) at a given scale.
function buildDigitalLines(c, scale) {
  const lines = [];

  // Time: one line if it fits, otherwise HH:MM on the first line and the
  // seconds / AM-PM on a second line.
  const full = { group: 0, weight: c.timeWeight, segs: [makeSeg(c.hhmm, c.timeSize, scale, c.timeColor, c.timeFam)] };
  if (c.sec !== null) full.segs.push(makeSeg(`:${c.sec}`, c.timeSize, scale, c.secColor, c.timeFam));
  if (c.suffix) full.segs.push(makeSeg(c.suffix, c.timeSize * 0.5, scale, c.dateColor, c.timeFam));

  if (!c.timeWrap || measureLine(full) <= TEXT_MAX_W) {
    lines.push(full);
  } else {
    lines.push({ group: 0, weight: c.timeWeight, segs: [makeSeg(c.hhmm, c.timeSize, scale, c.timeColor, c.timeFam)] });
    const second = { group: 0, weight: c.timeWeight, segs: [] };
    if (c.sec !== null) second.segs.push(makeSeg(c.sec, c.timeSize, scale, c.secColor, c.timeFam));
    if (c.suffix) {
      second.segs.push(makeSeg(c.sec !== null ? c.suffix : c.suffix.trim(), c.timeSize * 0.5, scale, c.dateColor, c.timeFam));
    }
    if (second.segs.length) lines.push(second);
  }

  // Date: wrap at spaces.
  if (c.dateText) {
    const measureStr = (str) => measureLine({ weight: c.dateWeight, segs: [makeSeg(str, c.dateSize, scale, c.dateColor, c.dateFam)] });
    for (const str of c.dateWrap ? wrapWords(c.dateText, measureStr, TEXT_MAX_W) : [c.dateText]) {
      lines.push({ group: 1, weight: c.dateWeight, segs: [makeSeg(str, c.dateSize, scale, c.dateColor, c.dateFam)] });
    }
  }

  // Measure everything; shrink only a line that still can't fit on its own
  // (e.g. one very long word), and total up the height.
  let height = 0;
  let prevGroup = lines[0].group;
  for (const line of lines) {
    measureLine(line);
    if (line.w > TEXT_MAX_W) {
      const f = TEXT_MAX_W / line.w;
      for (const seg of line.segs) seg.px = Math.max(6, Math.floor(seg.px * f));
      measureLine(line);
    }
    if (line.group !== prevGroup) {
      height += GROUP_GAP;
      prevGroup = line.group;
    }
    height += line.px * LINE_H;
  }
  return { lines, height };
}

function drawLines(lines, height) {
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  let y = (SIZE - height) / 2;
  let prevGroup = lines[0].group;
  for (const line of lines) {
    if (line.group !== prevGroup) {
      y += GROUP_GAP;
      prevGroup = line.group;
    }
    const lh = line.px * LINE_H;
    const baseline = y + lh / 2 + line.px * 0.35;
    let x = (SIZE - line.w) / 2;
    for (const seg of line.segs) {
      ctx.font = `${line.weight} ${seg.px}px ${seg.family}`;
      ctx.fillStyle = seg.color;
      for (const cell of seg.cells) {
        ctx.fillText(cell.ch, x + cell.w / 2, baseline);
        x += cell.w;
      }
    }
    y += lh;
  }
}

// ---- Digital clock -----------------------------------------------------------

function renderDigital(s) {
  const now = new Date(); // system local time

  drawBackground(s);

  let hours = now.getHours();
  let suffix = "";
  if (s.hour12) {
    suffix = hours >= 12 ? " PM" : " AM";
    hours = hours % 12 || 12;
  }

  const c = {
    timeWeight: s.timeBold ? "bold" : "normal",
    dateWeight: s.dateBold ? "bold" : "normal",
    hhmm: s.hour12 ? `${hours}:${pad(now.getMinutes())}` : `${pad(hours)}:${pad(now.getMinutes())}`,
    sec: s.showSeconds ? pad(now.getSeconds()) : null,
    suffix,
    dateText: s.showDate ? formatDate(now, s.dateFormat) : "",
    timeSize: Number(s.timeSize) || DEFAULTS_DIGITAL.timeSize,
    dateSize: Number(s.dateSize) || DEFAULTS_DIGITAL.dateSize,
    timeColor: s.timeColor,
    secColor: s.secColor,
    dateColor: s.dateColor,
    timeFam: fontCss(s.timeFont, "monospace"),
    dateFam: fontCss(s.dateFont, "monospace"),
    timeWrap: s.timeWrap !== false,
    dateWrap: s.dateWrap !== false,
  };

  // Wrap first; only scale everything down if the wrapped text is taller than the key.
  let layout;
  for (let scale = 1; ; scale -= 0.04) {
    layout = buildDigitalLines(c, scale);
    if (layout.height <= SIZE - 8 || scale <= 0.32) break;
  }
  drawLines(layout.lines, layout.height);

  return canvas.toDataURL("image/png");
}

// ---- Analog clock ------------------------------------------------------------

function polar(cx, cy, angleRad, r) {
  return [cx + Math.sin(angleRad) * r, cy - Math.cos(angleRad) * r];
}

function drawHand(cx, cy, angleRad, length, tail, width, color) {
  const [x1, y1] = polar(cx, cy, angleRad, length);
  const [x0, y0] = polar(cx, cy, angleRad + Math.PI, tail);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

function renderAnalog(s) {
  const now = new Date();
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const R = (SIZE / 2 - 3) * ((Number(s.clockSize) || 100) / 100);
  const hand = Number(s.handWidth) || 3;
  const numWeight = s.numberBold ? "bold" : "normal";
  const dateWeight = s.dateBold ? "bold" : "normal";

  const faceOnly = !!s.bgFaceOnly;
  const hasImage = drawBackground(s, faceOnly ? { cx, cy, r: R } : null);

  // A face-only image replaces the face fill (the fill would hide it).
  if (s.showFace && !(faceOnly && hasImage)) {
    ctx.fillStyle = s.faceColor;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fill();
  }

  if (s.showRing) {
    ctx.strokeStyle = s.tickColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.lineCap = "butt";
  if (s.showMinuteTicks) {
    ctx.strokeStyle = s.tickColor;
    ctx.lineWidth = 1;
    for (let i = 0; i < 60; i++) {
      if (s.showHourTicks && i % 5 === 0) continue;
      const a = (i * Math.PI) / 30;
      const [x0, y0] = polar(cx, cy, a, R - 5);
      const [x1, y1] = polar(cx, cy, a, R - 1.5);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
  }
  if (s.showHourTicks) {
    ctx.strokeStyle = s.tickColor;
    ctx.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      const [x0, y0] = polar(cx, cy, a, R - 9);
      const [x1, y1] = polar(cx, cy, a, R - 1.5);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
  }

  if (s.numbers && s.numbers !== "none") {
    const nSize = Number(s.numberSize) || 14;
    const rn = R - 6 - nSize * 0.55 - (s.showHourTicks ? 7 : 2);
    ctx.font = `${numWeight} ${nSize}px ${fontCss(s.numberFont, "sans-serif")}`;
    ctx.fillStyle = s.numberColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let n = 1; n <= 12; n++) {
      if (s.numbers === "quarter" && n % 3 !== 0) continue;
      const [x, y] = polar(cx, cy, (n * Math.PI) / 6, rn);
      ctx.fillText(String(n), x, y + 1);
    }
  }

  if (s.showDate) {
    const dSize = Number(s.dateSize) || 11;
    const dateFam = fontCss(s.dateFont, "monospace");
    const maxW = R * 1.4;
    const measureStr = (str) => {
      ctx.font = `${dateWeight} ${dSize}px ${dateFam}`;
      return ctx.measureText(str).width;
    };
    // Wrap at spaces; shrink only if a single word is still too wide.
    const dateText = formatDate(now, s.dateFormat);
    const dateLines = s.dateWrap === false ? [dateText] : wrapWords(dateText, measureStr, maxW);
    const widest = Math.max(...dateLines.map(measureStr));
    const size = widest > maxW ? Math.max(6, Math.floor((dSize * maxW) / widest)) : dSize;
    const lh = size * LINE_H;
    ctx.font = `${dateWeight} ${size}px ${dateFam}`;
    ctx.fillStyle = s.dateColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // 0 puts the text block against the top edge of the key, 100 against the
    // bottom edge, 50 exactly centered, whatever the font size or line count.
    const blockH = (dateLines.length - 1) * lh + size;
    const lo = 1 + blockH / 2;
    const hi = SIZE - 1 - blockH / 2;
    const rawY = Number(s.dateY);
    const pct = Math.min(100, Math.max(0, Number.isFinite(rawY) ? rawY : DEFAULTS_ANALOG.dateY));
    const y0 = lo + ((hi - lo) * pct) / 100 - ((dateLines.length - 1) * lh) / 2;
    dateLines.forEach((line, i) => ctx.fillText(line, cx, y0 + i * lh));
  }

  const h = now.getHours() % 12;
  const m = now.getMinutes();
  // Smooth sweep uses fractional seconds so the hand glides between ticks.
  const sec = now.getSeconds() + (isSmooth({ action: ACTION_ANALOG, settings: s }) ? now.getMilliseconds() / 1000 : 0);
  drawHand(cx, cy, ((h + m / 60) * Math.PI) / 6, R * 0.5, 0, hand * 1.6, s.hourHandColor);
  drawHand(cx, cy, ((m + sec / 60) * Math.PI) / 30, R * 0.75, 0, hand, s.minuteHandColor);
  if (s.showSecondHand) {
    drawHand(cx, cy, (sec * Math.PI) / 30, R * 0.85, R * 0.18, Math.max(1, hand * 0.5), s.secondHandColor);
  }
  ctx.fillStyle = s.showSecondHand ? s.secondHandColor : s.hourHandColor;
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(2, hand * 0.9), 0, Math.PI * 2);
  ctx.fill();

  return canvas.toDataURL("image/png");
}

// ---- Rendering loop / plumbing ---------------------------------------------------

function render(inst) {
  return inst.action === ACTION_ANALOG ? renderAnalog(inst.settings) : renderDigital(inst.settings);
}

function pushOne(context) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  const inst = instances.get(context);
  if (!inst) return;
  const image = render(inst);
  ws.send(JSON.stringify({ event: "setImage", context, payload: { image, target: 0 } }));
}

function push() {
  for (const context of instances.keys()) pushOne(context);
}

// ---- Timing ------------------------------------------------------------------
// The plugin page is hidden, and browsers throttle ordinary timers on hidden
// pages (often to one wake-up per second), which made the sweep stutter. Timers
// inside a Web Worker are not throttled, so a tiny worker provides the beat and
// the page only reacts to it. Without Worker support it falls back to setInterval.

const SWEEP_FPS = 15;
const FRAME_MS = 1000 / SWEEP_FPS; // beat while any key is sweeping
const IDLE_PULSE_MS = 50; // beat otherwise: just enough to catch each new second

const TICK_WORKER_SRC = `
  let id = null;
  onmessage = (e) => {
    if (id !== null) clearInterval(id);
    id = e.data > 0 ? setInterval(() => postMessage(0), e.data) : null;
  };
`;

let tickWorker; // undefined = not created yet, null = unavailable
let fallbackTimer = null;
let pulseMs = 0;
let lastWholeSecond = -1;

function isSmooth(inst) {
  return inst.action === ACTION_ANALOG && !!inst.settings.smoothSecond && inst.settings.showSecondHand !== false;
}

function anySmooth() {
  for (const inst of instances.values()) if (isSmooth(inst)) return true;
  return false;
}

// Called on every beat: sweeping keys redraw each frame, everything else once
// per second.
function onPulse() {
  const nowSec = Math.floor(Date.now() / 1000);
  const secondChanged = nowSec !== lastWholeSecond;
  lastWholeSecond = nowSec;
  for (const [context, inst] of instances) {
    if (secondChanged || isSmooth(inst)) pushOne(context);
  }
}

function getWorker() {
  if (tickWorker === undefined) {
    try {
      tickWorker = new Worker(URL.createObjectURL(new Blob([TICK_WORKER_SRC], { type: "text/javascript" })));
      tickWorker.onmessage = onPulse;
      tickWorker.onerror = () => {
        tickWorker = null; // blocked or broken: use plain timers instead
        setPulse(pulseMs, true);
      };
    } catch (e) {
      tickWorker = null;
    }
  }
  return tickWorker;
}

function setPulse(ms, force) {
  if (!force && ms === pulseMs) return;
  pulseMs = ms;
  const w = getWorker();
  if (w) {
    w.postMessage(ms);
  } else {
    if (fallbackTimer !== null) clearInterval(fallbackTimer);
    fallbackTimer = ms > 0 ? setInterval(onPulse, ms) : null;
  }
}

// Beat speed follows what is on the deck: stopped with no keys, fast while a
// key sweeps, slow otherwise.
function updatePulse() {
  setPulse(instances.size === 0 ? 0 : anySmooth() ? FRAME_MS : IDLE_PULSE_MS);
}

function startTicking() {
  updatePulse();
}

function stopTicking() {
  setPulse(0);
}

function setInstance(context, action, settings) {
  instances.set(context, { action, settings: withDefaults(action, settings) });
  updatePulse();
}

// Entry point called by the OpenDeck / Stream Deck host.
function connectElgatoStreamDeckSocket(port, pluginUUID, registerEvent, info) {
  ws = new WebSocket("ws://127.0.0.1:" + port);

  ws.onopen = () => {
    ws.send(JSON.stringify({ event: registerEvent, uuid: pluginUUID }));
  };

  ws.onmessage = (evt) => {
    const msg = JSON.parse(evt.data);
    switch (msg.event) {
      case "willAppear": {
        const action = msg.action || ACTION_DIGITAL;
        setInstance(msg.context, action, msg.payload && msg.payload.settings);
        startTicking();
        pushOne(msg.context);
        break;
      }
      case "didReceiveSettings": {
        const prev = instances.get(msg.context);
        const action = msg.action || (prev && prev.action) || ACTION_DIGITAL;
        setInstance(msg.context, action, msg.payload && msg.payload.settings);
        pushOne(msg.context);
        break;
      }
      case "willDisappear": {
        instances.delete(msg.context);
        updatePulse();
        break;
      }
    }
  };

  ws.onclose = stopTicking;
}
