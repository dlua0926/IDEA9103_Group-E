/* =========================================================
 * User Input Edition (English-only comments + ★ marks updates vs group code)
 *
 * Highlights:
 * ★ Responsive canvas: render logical 900×900 into a window-scaled square
 * ★ UI speed slider; E pause/resume; R reset layout
 * ★ Road squares become moving agents with screen-wrap
 * ★ Black hole at mouse; swallows passing squares
 * ★ Mouse wheel adjusts black hole radius (clamped)
 * ========================================================= */

// ---------- Logical space & base params ----------
const W = 900, H = 900;          // logical coordinate system
const COLS = 10, ROWS = 10;

const GAP_X_BASE = 15, GAP_Y_BASE = 15;      // base gap
const GAP_X_DELTA = 3,  GAP_Y_DELTA = 3;     // small jitter

const COL_MIN = 20,  COL_MAX = 280;          // column width range
const ROW_MIN = 40,  ROW_MAX = 140;          // row height range

const CENTER_POWER = 2.2;    // centre bias for column widths
const COL_SPREAD   = 2.0;    // randomness spread for columns
const ROW_CENTER_POWER = 2.0;// centre bias for rows
const ROW_SPREAD       = 1.5;// randomness spread for rows

// ---------- Geometry & data arrays (logical 900×900) ----------
let colW = [], rowH = [];   // column widths / row heights
let gapX = [], gapY = [];   // vertical/horizontal gaps
let xs = [], ys = [];       // start x/y per column/row

let bigBlocks = [];         // first-pass coloured blocks with mode
let colorBlocks = [];       // all coloured rectangles to draw
let connectors = [];        // white connectors that cover gaps

// --------------------------------------------------------
// ★ Grouped "New Feature" variables (updates vs group code)
// --------------------------------------------------------

// ★ Black hole (wheel-adjustable radius)
let blackHoleRadius = 45;      // initial radius (logical units)
const BLACK_HOLE_MIN = 15;     // min clamp
const BLACK_HOLE_MAX = 120;    // max clamp

// ★ Moving road squares (agents on yellow roads)
let roadSquares = [];

// ★ Motion toggle (E to toggle)
let moving = true;

// ★ UI: speed slider + labels
let speedSlider;               // p5 slider
let speedLabel;                // "Speed" label
let speedInfo;                 // info line
let speedFactor = 1.0;         // global speed multiplier


// --------------------------------------------------------
// ★ Responsive helpers (NEW)
// --------------------------------------------------------
function calcCanvasSize(){
  // leave margins, cap at 900; keep square
  const maxSize = 900;
  let size = min(windowWidth - 40, windowHeight - 120, maxSize);
  size = max(size, 300); // avoid too tiny
  return size;
}

function updateSliderPosition(){
  // place slider and labels on one row below the canvas
  const y = height + 20;
  if (speedLabel)  speedLabel.position(20,  y + 3);
  if (speedSlider) speedSlider.position(100, y);
  if (speedInfo)   speedInfo.position(250, y + 3);
}


// --------------------------------------------------------
// p5.js lifecycle
// --------------------------------------------------------
function setup(){
  // ★ Responsive canvas instead of fixed 900×900 (UPDATED)
  const size = calcCanvasSize();
  createCanvas(size, size);

  noStroke();
  createNewLayout(); // first layout

  // ★ New UI slider (0–300 → 0.00–3.00)
  speedSlider = createSlider(0, 300, 100);

  // ★ New UI labels
  speedLabel = createSpan('Speed Change');
  speedLabel.style('font-size', '12px');
  speedLabel.style('font-family', 'sans-serif');

  speedInfo = createSpan('');
  speedInfo.style('font-size', '14px');
  speedInfo.style('font-family', 'sans-serif');

  updateSliderPosition();
}

function windowResized(){
  // ★ Resize canvas and relocate UI (UPDATED)
  const size = calcCanvasSize();
  resizeCanvas(size, size);
  updateSliderPosition();
}

function draw(){
  // ★ Use draw loop for animation instead of original noLoop/drawScene (UPDATED)
  background('#f2d31b');   // yellow background

  // ★ Read speed factor from slider (NEW)
  speedFactor = speedSlider.value() / 100.0;

  push();
  // scale logical space to canvas
  const s = width / W;
  scale(s);

  // ★ Compute black hole centre (mouse→logical); hide cursor when inside canvas (NEW)
  let holeActive = false;
  let holeX = null, holeY = null;
  const mx = mouseX, my = mouseY;
  if (mx >= 0 && mx <= width && my >= 0 && my <= height){
    holeX = mx / s;
    holeY = my / s;
    holeActive = true;
    noCursor();
  } else {
    cursor();
  }

  // draw 10×10 white grid twice
  drawWhiteGrid();

  // ★ Update road squares and apply black-hole culling (NEW)
  if (moving){
    updateRoadSquares(holeActive ? holeX : null, holeActive ? holeY : null);
  }

  // render agents, connectors, and coloured strips
  drawRoadSquares();
  drawConnectors();
  drawColorBlocks();

  // ★ Draw black hole (glow + ring + core) (NEW)
  if (holeActive){
    drawBlackHole(holeX, holeY);
  }
  pop();

  // ★ Info line: speed × factor, hotkeys, BH radius (NEW)
  const infoText =
  'Speed × ' + nf(speedFactor, 1, 2) + '  (E: pause / R: reset)' +
  '<br/>' +
  'BH ' + int(blackHoleRadius) + ' (Scroll wheel to adjust black hole size)';
  if (speedInfo) speedInfo.html(infoText);

}

function keyPressed(){
  // ★ Keyboard: R reset, E toggle motion (NEW)
  if (key === 'r' || key === 'R'){
    createNewLayout();
  } else if (key === 'e' || key === 'E'){
    moving = !moving;
  }
}

// ★ Mouse wheel adjusts black hole radius (NEW)
function mouseWheel(event){
  // only when cursor is over canvas
  if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height){
    // event.deltaY < 0 scroll up; > 0 scroll down
    // subtract so scroll-up increases, scroll-down decreases
    blackHoleRadius = constrain(
      blackHoleRadius - event.deltaY * 0.05,  // sensitivity
      BLACK_HOLE_MIN,
      BLACK_HOLE_MAX
    );
    return false; // prevent page scroll
  }
}


// --------------------------------------------------------
// Layout generation: gaps → sizes → coords → connectors/blocks/agents
// --------------------------------------------------------
function createNewLayout(){
  // gaps with small random jitter
  gapX = new Array(COLS-1).fill(0).map(()=> GAP_X_BASE + random(-GAP_X_DELTA, GAP_X_DELTA));
  gapY = new Array(ROWS-1).fill(0).map(()=> GAP_Y_BASE + random(-GAP_Y_DELTA, GAP_Y_DELTA));

  const sumGapX = gapX.reduce((a,b)=>a+b, 0);
  const sumGapY = gapY.reduce((a,b)=>a+b, 0);

  const availW = W - sumGapX;
  const availH = H - sumGapY;

  // centre-biased random allocation for col/row sizes
  const posW = positionWeights(COLS, CENTER_POWER);
  randomizeWithBias(colW, COLS, availW, COL_MIN, COL_MAX, COL_SPREAD, posW);

  const posR = positionWeights(ROWS, ROW_CENTER_POWER);
  randomizeWithBias(rowH, ROWS, availH, ROW_MIN, ROW_MAX, ROW_SPREAD, posR);

  // start coordinates
  xs = new Array(COLS);
  ys = new Array(ROWS);

  let x = 0;
  for (let c = 0; c < COLS; c++){
    xs[c] = x;
    x += colW[c] + (c < COLS-1 ? gapX[c] : 0);
  }

  let y = 0;
  for (let r = 0; r < ROWS; r++){
    ys[r] = y;
    y += rowH[r] + (r < ROWS-1 ? gapY[r] : 0);
  }

  // reset and regenerate
  connectors   = [];
  bigBlocks    = [];
  colorBlocks  = [];
  roadSquares  = [];   // ★ NEW agents layer

  generateConnectors(12); // white bridges

  // coloured strips + opposite-rule overlay
  generateBigBlocks({
    prob: 0.55,
    minFrac: 0.35,
    maxFrac: 0.85,
    aspectThresh: 1.15
  });

  // ★ NEW moving agents
  generateRoadSquares();
}


// --------------------------------------------------------
// Rendering: white grid / connectors / coloured strips / agents / black hole
// --------------------------------------------------------
function drawWhiteGrid(){
  noStroke();
  fill('#ffffff');
  // pass 1
  for (let r = 0; r < ROWS; r++){
    for (let c = 0; c < COLS; c++){
      rect(xs[c], ys[r], colW[c], rowH[r]);
    }
  }
  // pass 2 for cleaner white
  for (let r = 0; r < ROWS; r++){
    for (let c = 0; c < COLS; c++){
      rect(xs[c], ys[r], colW[c], rowH[r]);
    }
  }
}

function drawConnectors(){
  noStroke();
  fill('#ffffff');
  for (const b of connectors){
    rect(b.x, b.y, b.w, b.h);
  }
}

function drawColorBlocks(){
  noStroke();
  for (const b of colorBlocks){
    fill(b.color);
    rect(b.x, b.y, b.w, b.h);
  }
}

function drawRoadSquares(){
  noStroke();
  for (const s of roadSquares){
    fill(s.color);
    rect(s.x, s.y, s.size, s.size);
  }
}

// ★ Black hole rendering: glow → ring → core (NEW)
function drawBlackHole(hx, hy){
  push();

  // use adjustable radius as base
  const base = blackHoleRadius;
  const pulse = 1 + 0.05 * sin(frameCount * 0.08); // subtle breathing
  const r = base * pulse;

  // 1) outer cool-blue glow (fades outward)
  noStroke();
  for (let i = 0; i < 14; i++){
    const t = i / 13.0;
    const rr = lerp(r * 1.5, r * 2.2, t);
    const alpha = lerp(90, 0, t);
    fill(120, 170, 255, alpha);
    ellipse(hx, hy, rr * 2, rr * 2);
  }

  // 2) accretion ring
  noFill();
  stroke(190, 210, 255, 230);
  strokeWeight(r * 0.18);
  ellipse(hx, hy, r * 1.6 * 2, r * 1.6 * 2);

  // 3) deep blue core
  noStroke();
  for (let i = 0; i < 18; i++){
    const t = i / 17.0;
    const rr = lerp(r * 0.3, r, t);
    const alpha = lerp(220, 0, t);
    fill(30, 70, 180, alpha);
    ellipse(hx, hy, rr * 2, rr * 2);
  }

  pop();
}


// --------------------------------------------------------
// ★ Road squares (from sprinkle to movable agents) (NEW)
// --------------------------------------------------------
function generateRoadSquares(){
  const COLORS = ['#c63b2d', '#2a59b6', '#bfbfbf']; // red / blue / grey
  const V_GAP_MIN = 8,  V_GAP_MAX = 28;
  const H_GAP_MIN = 8,  H_GAP_MAX = 28;

  roadSquares = [];

  // vertical lanes (between columns), along Y
  for (let c = 0; c < COLS - 1; c++) {
    const x0 = xs[c] + colW[c];
    const w  = gapX[c];
    const s  = w;       // square side = gap width
    let y = 0;

    while (y + s <= H) {
      if (random() < 0.65) {
        const color = random(COLORS);
        const speed = random(0.6, 2.0) * (random() < 0.5 ? 1 : -1); // up or down
        roadSquares.push({ type:'v', x:x0, y:y, size:s, color, speed });
      }
      y += s + random(V_GAP_MIN, V_GAP_MAX);
    }
  }

  // horizontal lanes (between rows), along X
  for (let r = 0; r < ROWS - 1; r++) {
    const y0 = ys[r] + rowH[r];
    const h  = gapY[r];
    const s  = h;       // square side = gap height
    let x = 0;

    while (x + s <= W) {
      if (random() < 0.65) {
        const color = random(COLORS);
        const speed = random(0.6, 2.0) * (random() < 0.5 ? 1 : -1); // left or right
        roadSquares.push({ type:'h', x:x, y:y0, size:s, color, speed });
      }
      x += s + random(H_GAP_MIN, H_GAP_MAX);
    }
  }
}

// ★ Move along lanes + wrap + black-hole cull (NEW)
function updateRoadSquares(holeX, holeY){
  const hasHole = (holeX !== null && holeX !== undefined &&
                   holeY !== null && holeY !== undefined);

  const keep = [];

  for (const sq of roadSquares){
    // base speed × global factor
    const v = sq.speed * speedFactor;

    if (sq.type === 'v'){              // vertical lane
      sq.y += v;
      if (sq.y > H)        sq.y = -sq.size; // wrap bottom→top
      if (sq.y < -sq.size) sq.y = H;        // wrap top→bottom
    } else {                           // horizontal lane
      sq.x += v;
      if (sq.x > W)        sq.x = -sq.size; // wrap right→left
      if (sq.x < -sq.size) sq.x = W;        // wrap left→right
    }

    // cull if inside black hole
    if (hasHole){
      const cx = sq.x + sq.size * 0.5;
      const cy = sq.y + sq.size * 0.5;
      const dx = cx - holeX;
      const dy = cy - holeY;
      const distSq = dx*dx + dy*dy;
      if (distSq < blackHoleRadius * blackHoleRadius){
        continue; // swallowed
      }
    }

    keep.push(sq);
  }

  roadSquares = keep;
}


// --------------------------------------------------------
// White connectors + coloured strips (record-then-draw style)
// --------------------------------------------------------
function generateConnectors(count = 8){
  connectors = [];
  for (let k = 0; k < count; k++){
    if (random() < 0.5) {
      // horizontal: cover vertical gap between column c and c+1 on row r
      const r = int(random(0, ROWS));
      const c = int(random(0, COLS-1));
      const x0 = xs[c] + colW[c];
      const y0 = ys[r];
      const w  = gapX[c];
      const h  = rowH[r];
      connectors.push({ x:x0, y:y0, w, h });
    } else {
      // vertical: cover horizontal gap between row r and r+1 on column c
      const c = int(random(0, COLS));
      const r = int(random(0, ROWS-1));
      const x0 = xs[c];
      const y0 = ys[r] + rowH[r];
      const w  = colW[c];
      const h  = gapY[r];
      connectors.push({ x:x0, y:y0, w, h });
    }
  }
}

function generateBigBlocks(opts){
  const COLORS = ['#c63b2d', '#2a59b6', '#f2d31b']; // red / blue / yellow
  const PROB   = (opts && opts.prob)         ?? 0.55;
  const MINF   = (opts && opts.minFrac)      ?? 0.35;
  const MAXF   = (opts && opts.maxFrac)      ?? 0.85;
  const THR    = (opts && opts.aspectThresh) ?? 1.15;
  const PROB2  = 0.20; // overlay probability

  bigBlocks   = [];
  colorBlocks = [];

  // first pass: equal-height/width strips by aspect
  for (let r = 0; r < ROWS; r++){
    for (let c = 0; c < COLS; c++){
      if (random() > PROB) continue;

      const x = xs[c], y = ys[r];
      const w = colW[c], h = rowH[r];
      const ratioW = w / h;
      const ratioH = h / w;

      const color = random(COLORS);
      let bx, by, bw, bh, mode;

      if (ratioW >= THR) {               // wider → equal-height strip
        bw = random(MINF * w, MAXF * w);
        bh = h;
        bx = x + random(0, w - bw);
        by = y;
        mode = 'equalHeight';
      } else if (ratioH >= THR) {        // taller → equal-width strip
        bw = w;
        bh = random(MINF * h, MAXF * h);
        bx = x;
        by = y + random(0, h - bh);
        mode = 'equalWidth';
      } else {                            // near-square → either
        if (random() < 0.5){
          bw = random(MINF * w, MAXF * w);
          bh = h;
          bx = x + random(0, w - bw);
          by = y;
          mode = 'equalHeight';
        } else {
          bw = w;
          bh = random(MINF * h, MAXF * h);
          bx = x;
          by = y + random(0, h - bh);
          mode = 'equalWidth';
        }
      }

      bigBlocks.push({ x:bx, y:by, w:bw, h:bh, color, mode });
      colorBlocks.push({ x:bx, y:by, w:bw, h:bh, color });
    }
  }

  // second pass: opposite rule overlay
  for (const b of bigBlocks){
    if (random() > PROB2) continue;

    const COLORS2 = ['#c63b2d', '#2a59b6', '#f2d31b'];
    const alt = random(COLORS2.filter(c => c !== b.color));

    if (b.mode === 'equalHeight'){         // EH → EW
      const hh = random(MINF * b.h, MAXF * b.h);
      const yy = b.y + random(0, b.h - hh);
      colorBlocks.push({ x: b.x, y: yy, w: b.w, h: hh, color: alt });
    } else {                               // EW → EH
      const ww = random(MINF * b.w, MAXF * b.w);
      const xx = b.x + random(0, b.w - ww);
      colorBlocks.push({ x: xx, y: b.y, w: ww, h: b.h, color: alt });
    }
  }
}


// --------------------------------------------------------
// Utilities
// --------------------------------------------------------
function positionWeights(n, power){
  // edge 0 → centre 1; t^power boosts centre
  const arr = new Array(n);
  const mid = (n - 1) / 2;
  for (let i = 0; i < n; i++){
    const t = 1 - Math.abs((i - mid) / mid);
    arr[i] = Math.pow(t, power) + 0.05; // avoid zero weight
  }
  return arr;
}

function randomizeWithBias(out, n, total, minV, maxV, spread, posW){
  // distribute 'total' into n slots with min/max & positional weights, then normalize to exact sum
  const base = n * minV;
  const rest = max(0, total - base);

  let w = new Array(n), sw = 0;
  for (let i = 0; i < n; i++){
    const r = Math.pow(random(), spread);   // larger spread → more variance
    w[i] = (posW ? posW[i] : 1) * r;
    sw  += w[i];
  }
  if (sw <= 0){ w.fill(1); sw = n; }

  for (let i = 0; i < n; i++){
    out[i] = minV + (w[i] / sw) * rest;
    if (maxV > minV) out[i] = constrain(out[i], minV, maxV);
  }

  const s = out.reduce((a,b)=>a+b, 0);
  const k = total / s;
  for (let i = 0; i < n; i++) out[i] *= k;
}
