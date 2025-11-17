const W = 900, H = 900;
const COLS = 10, ROWS = 10;

// Base spacing of gaps and small random jitter per gap
// For example, base 10px and each gap jitters by about ±2px
const GAP_X_BASE = 15, GAP_Y_BASE = 15;
const GAP_X_DELTA = 3,  GAP_Y_DELTA = 3;

// Size range of white cells (column width / row height)
const COL_MIN = 20,  COL_MAX = 280;
const ROW_MIN = 40,  ROW_MAX = 140;

// Column width distribution (optional: make middle columns wider, edges narrower for better aesthetics)
const CENTER_POWER = 2.2; // Larger → wider center, narrower sides
const COL_SPREAD   = 2.0; // Larger → more variation; 1 = plain random

// Row height distribution (“taller in the middle, shorter on the sides”)
const ROW_CENTER_POWER = 2.0; // Larger → taller center rows
const ROW_SPREAD       = 1.5; // Larger → more variation; 1 = plain random

// Arrays to store column widths, row heights, gaps and coordinates
let colW = [], rowH = [];
let gapX = [], gapY = [];  // jittered gaps
let xs = [], ys = [];      // start positions of each col/row (no outer margin)
let bigBlocks = [];        // stores generated large color blocks, for second-layer blocks
let sceneBuffer = null;    // Cached scene to avoid redrawing every frame

// Make these globally accessible for PacmanModule
window.colW = colW;
window.rowH = rowH;
window.gapX = gapX;
window.gapY = gapY;
window.xs = xs;
window.ys = ys;
window.COLS = COLS;
window.ROWS = ROWS;
window.W = W;
window.H = H;


function setup(){
  createCanvas(W, H);
  // Disable auto-loop initially
  noLoop();
  // Initial rendering
  drawScene();
  // Initialize Pacman module after scene is drawn
  if (window.PacmanModule) {
    PacmanModule.initialize();
  }
}

// Press r/R to redraw the scene with fresh randomness
function keyPressed(){ 
  if (key === 'r' || key === 'R') {
    drawScene();
    // Reinitialize Pacman after redraw
    if (window.PacmanModule) {
      PacmanModule.stopAnimation();
      PacmanModule.initialize();
    }
  }
  return false;
}

// Draw function to support Pacman animation
function draw() {
  if (window.PacmanModule && PacmanModule.isAnimating()) {
    // Draw cached scene
    if (sceneBuffer) {
      image(sceneBuffer, 0, 0);
    }
    // Update and draw Pacman and ghosts on top
    PacmanModule.update();
    PacmanModule.draw();
  }
}

function drawScene(){
  // 1) Generate small random gap values for each vertical/horizontal gap
  gapX = new Array(COLS-1).fill(0).map(()=> GAP_X_BASE + random(-GAP_X_DELTA, GAP_X_DELTA));
  gapY = new Array(ROWS-1).fill(0).map(()=> GAP_Y_BASE + random(-GAP_Y_DELTA, GAP_Y_DELTA));

  const sumGapX = gapX.reduce((a,b)=>a+b, 0);
  const sumGapY = gapY.reduce((a,b)=>a+b, 0);

  // 2) Total available width/height for white cells (no outer margin)
  const availW = W - sumGapX;
  const availH = H - sumGapY;

  // 3) Randomly allocate column widths and row heights (sum strictly equals available size)
  const posW = positionWeights(COLS, CENTER_POWER);
  randomizeWithBias(colW, COLS, availW, COL_MIN, COL_MAX, COL_SPREAD, posW);

  const posR = positionWeights(ROWS, ROW_CENTER_POWER);
  randomizeWithBias(rowH, ROWS, availH, ROW_MIN, ROW_MAX, ROW_SPREAD, posR);

  // 4) Compute starting x/y for each col/row
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

  // Create off-screen buffer
  sceneBuffer = createGraphics(W, H);
  sceneBuffer.background('#f2d31b');

  // Draw white grid to buffer
  sceneBuffer.noStroke(); 
  sceneBuffer.fill('#ffffff');
  for (let r = 0; r < ROWS; r++){
    for (let c = 0; c < COLS; c++){
      sceneBuffer.rect(xs[c], ys[r], colW[c], rowH[r]);
    }
  }

  // Draw colored elements using buffer-aware functions
  sprinkleColorInGapsToBuffer(sceneBuffer);
  linkWhiteBlocksToBuffer(sceneBuffer, 12);
  addBigBlocksToBuffer(sceneBuffer, { prob: 0.55, minFrac: 0.35, maxFrac: 0.85, aspectThresh: 1.15 });
  overlayBlocksToBuffer(sceneBuffer, { prob: 0.20, minFrac: 0.35, maxFrac: 0.85 });

  // Draw to main canvas
  image(sceneBuffer, 0, 0);

  // Sync globals
  window.colW = colW;
  window.rowH = rowH;
  window.gapX = gapX;
  window.gapY = gapY;
  window.xs = xs;
  window.ys = ys;
}

/*
  Place square colored blocks in yellow gaps:
  - Vertical gaps: square size = gap width w, scattered along Y with random spacing
  - Horizontal gaps: square size = gap height h, scattered along X with random spacing
*/
function sprinkleColorInGaps(){
  const COLORS = ['#c63b2d', '#2a59b6', '#bfbfbf']; // red / blue / grey

  // Range of yellow spacing between blocks (along the gap direction)
  const V_GAP_MIN = 8,  V_GAP_MAX = 28;  // vertical gaps: vertical spacing
  const H_GAP_MIN = 8,  H_GAP_MAX = 28;  // horizontal gaps: horizontal spacing

  noStroke();

  // Vertical gaps (between columns): block side length = gap width w
  for (let c = 0; c < COLS - 1; c++) {
    const x0 = xs[c] + colW[c]; // x position of vertical gap
    const w  = gapX[c];         // gap width
    const s  = w;               // square side = gap width
    let y = 0;

    // Place blocks along Y until beyond bottom of canvas
    while (y + s <= H) {
      // Randomly decide whether to place a block to keep it sparse
      if (random() < 0.65) {
        fill(random(COLORS));
        rect(x0, y, s, s);      // Width=height=s → perfect square
      }
      // After a block, leave a random yellow gap
      y += s + random(V_GAP_MIN, V_GAP_MAX);
    }
  }

  // Horizontal gaps (between rows): block side length = gap height h
  for (let r = 0; r < ROWS - 1; r++) {
    const y0 = ys[r] + rowH[r]; // y position of horizontal gap
    const h  = gapY[r];         // gap height
    const s  = h;               // square side = gap height
    let x = 0;

    // Place blocks along X until beyond right edge
    while (x + s <= W) {
      if (random() < 0.65) {
        fill(random(COLORS));
        rect(x, y0, s, s);      // Width=height=s → perfect square
      }
      x += s + random(H_GAP_MIN, H_GAP_MAX);
    }
  }
}


/* ---------- Utility: position weights / distribution ---------- */

// Generate weights based on index (near center or edges) to bias sizes
function positionWeights(n, power){
  const arr = new Array(n);
  const mid = (n - 1) / 2;

  for(let i = 0; i < n; i++){
    // t goes from 0 at edges to 1 at center
    const t = 1 - Math.abs((i - mid) / mid);
    // Weight = t^power (plus small constant to avoid 0)
    arr[i] = Math.pow(t, power) + 0.05;
  }
  return arr;
}

// Randomly distribute 'total' into n values in out[] with min/max constraints and optional positional bias
function randomizeWithBias(out, n, total, minV, maxV, spread, posW){
  const base = n * minV;                 // base amount (min per item)
  const rest = max(0, total - base);     // remaining amount to distribute

  let w = new Array(n), sw = 0;
  for(let i = 0; i < n; i++){
    // random()^spread controls variance; larger spread → more difference
    const r = Math.pow(random(), spread);
    w[i] = (posW ? posW[i] : 1) * r; // multiply by positional weight
    sw += w[i];
  }

  // If total weight is invalid, fallback to uniform 1
  if (sw <= 0){ 
    w.fill(1); 
    sw = n; 
  }

  // Distribute 'rest' proportional to weights, then add minV
  for(let i = 0; i < n; i++){
    out[i] = minV + (w[i] / sw) * rest;
    // Clamp to [minV, maxV]
    if (maxV > minV) out[i] = constrain(out[i], minV, maxV);
  }

  // Rescale so the sum is exactly equal to 'total'
  const s = out.reduce((a,b)=>a+b, 0);
  const k = total / s;
  for(let i = 0; i < n; i++) out[i] *= k;
}

// Simpler version without positional weights (not used now but kept for flexibility)
function randomizeWithSpread(out, n, total, minV, maxV, spread){
  const base = n * minV;
  const rest = max(0, total - base);

  let w = new Array(n), sw = 0;
  for(let i = 0; i < n; i++){
    w[i] = Math.pow(random(), spread);
    sw += w[i];
  }

  if (sw <= 0){ 
    w.fill(1); 
    sw = n; 
  }

  for(let i = 0; i < n; i++){
    out[i] = minV + (w[i] / sw) * rest;
    if (maxV > minV) out[i] = constrain(out[i], minV, maxV);
  }

  const s = out.reduce((a,b)=>a+b, 0);
  const k = total / s;
  for(let i = 0; i < n; i++) out[i] *= k;
}


// Randomly fill some gaps between adjacent cells with white, horizontally or vertically, to form larger white shapes
function linkWhiteBlocks(count = 8){
  noStroke();
  fill('#ffffff');

  for (let k = 0; k < count; k++){
    if (random() < 0.5) {
      // Horizontal link: in the same row, cover the vertical gap between col c and c+1
      const r = int(random(0, ROWS));      // row index
      const c = int(random(0, COLS-1));    // vertical gap index
      const x0 = xs[c] + colW[c];          // x of gap
      const y0 = ys[r];                    // top of this row
      const w  = gapX[c];                  // gap width
      const h  = rowH[r];                  // height of cell
      rect(x0, y0, w, h);                  // cover the gap with white
    } else {
      // Vertical link: in the same column, cover the horizontal gap between row r and r+1
      const c = int(random(0, COLS));      // column index
      const r = int(random(0, ROWS-1));    // horizontal gap index
      const x0 = xs[c];                    // left of column
      const y0 = ys[r] + rowH[r];          // y of gap
      const w  = colW[c];                  // width of cell
      const h  = gapY[r];                  // gap height
      rect(x0, y0, w, h);                  // cover the gap with white
    }
  }
}

// For each white cell: if it's wider, place an equal-height strip; if it's taller, place an equal-width strip
function addBigBlocksInWhiteAspect(opts){
  const COLORS = ['#c63b2d', '#2a59b6', '#f2d31b']; // red / blue / yellow
  const PROB   = (opts && opts.prob)         ?? 0.55;   // probability to place a big block in a cell
  const MINF   = (opts && opts.minFrac)      ?? 0.35;   // min fraction of cell size
  const MAXF   = (opts && opts.maxFrac)      ?? 0.85;   // max fraction of cell size
  const THR    = (opts && opts.aspectThresh) ?? 1.15;   // aspect ratio threshold

  noStroke();
  // Clear the list before generating
  bigBlocks = [];

  for (let r = 0; r < ROWS; r++){
    for (let c = 0; c < COLS; c++){
      // Skip based on probability
      if (random() > PROB) continue;

      const x = xs[c], y = ys[r];
      const w = colW[c], h = rowH[r];
      const ratioW = w / h; // width/height
      const ratioH = h / w; // height/width

      const color = random(COLORS);
      fill(color);

      if (ratioW >= THR) {
        // Wider cell: place an equal-height strip (height = h, width random in [MINF*w, MAXF*w])
        const ww = random(MINF * w, MAXF * w);
        const xx = x + random(0, w - ww);   // random horizontal offset inside cell
        rect(xx, y, ww, h);
        bigBlocks.push({ x: xx, y, w: ww, h, color, mode: 'equalHeight' });

      } else if (ratioH >= THR) {
        // Taller cell: place an equal-width strip (width = w, height random in [MINF*h, MAXF*h])
        const hh = random(MINF * h, MAXF * h);
        const yy = y + random(0, h - hh);   // random vertical offset inside cell
        rect(x, yy, w, hh);
        bigBlocks.push({ x, y: yy, w, h: hh, color, mode: 'equalWidth' });

      } else {
        // Near-square cell: randomly choose equal-height or equal-width
        if (random() < 0.5) {
          const ww = random(MINF * w, MAXF * w);
          const xx = x + random(0, w - ww);
          rect(xx, y, ww, h);
          bigBlocks.push({ x: xx, y, w: ww, h, color, mode: 'equalHeight' });
        } else {
          const hh = random(MINF * h, MAXF * h);
          const yy = y + random(0, h - hh);
          rect(x, yy, w, hh);
          bigBlocks.push({ x, y: yy, w, h: hh, color, mode: 'equalWidth' });
        }
      }
    }
  }
}

// Inside each colored big block, generate a second block with the opposite rule:
// first equalHeight → second equalWidth; first equalWidth → second equalHeight
function overlayInsideBigBlocks(opts){
  const COLORS = ['#c63b2d', '#2a59b6', '#f2d31b']; // red / blue / yellow
  const MINF   = (opts && opts.minFrac)  ?? 0.35;
  const MAXF   = (opts && opts.maxFrac)  ?? 0.85;
  const PROB2  = (opts && opts.prob)     ?? 0.55;      // probability for overlay blocks
  const MAXN   = (opts && opts.maxCount) ?? Infinity;  // overall maximum overlay count

  noStroke();
  let made = 0;

  for (const b of bigBlocks){
    if (made >= MAXN) break;        // stop if we reached max overlay count
    if (random() > PROB2) continue; // skip block based on probability

    // Overlay block color must differ from the original block
    const altChoices = COLORS.filter(c => c !== b.color);
    const alt = random(altChoices);
    fill(alt);

    if (b.mode === 'equalHeight'){
      // First was equal-height → now equal-width (width fixed, random height)
      const hh = random(MINF * b.h, MAXF * b.h);
      const yy = b.y + random(0, b.h - hh);  // random vertical position inside original
      rect(b.x, yy, b.w, hh);
    } else { // b.mode === 'equalWidth'
      // First was equal-width → now equal-height (height fixed, random width)
      const ww = random(MINF * b.w, MAXF * b.w);
      const xx = b.x + random(0, b.w - ww);  // random horizontal position inside original
      rect(xx, b.y, ww, b.h);
    }

    made++;
  }
}

// Buffer versions of drawing functions
function sprinkleColorInGapsToBuffer(buf){
  const COLORS = ['#c63b2d', '#2a59b6', '#bfbfbf'];
  const V_GAP_MIN = 8, V_GAP_MAX = 28;
  const H_GAP_MIN = 8, H_GAP_MAX = 28;

  buf.noStroke();
  for (let c = 0; c < COLS - 1; c++) {
    const x0 = xs[c] + colW[c];
    const w = gapX[c];
    const s = w;
    let y = 0;
    while (y + s <= H) {
      if (random() < 0.65) {
        buf.fill(random(COLORS));
        buf.rect(x0, y, s, s);
      }
      y += s + random(V_GAP_MIN, V_GAP_MAX);
    }
  }
  for (let r = 0; r < ROWS - 1; r++) {
    const y0 = ys[r] + rowH[r];
    const h = gapY[r];
    const s = h;
    let x = 0;
    while (x + s <= W) {
      if (random() < 0.65) {
        buf.fill(random(COLORS));
        buf.rect(x, y0, s, s);
      }
      x += s + random(H_GAP_MIN, H_GAP_MAX);
    }
  }
}

function linkWhiteBlocksToBuffer(buf, count){
  buf.noStroke();
  buf.fill('#ffffff');
  for (let k = 0; k < count; k++){
    if (random() < 0.5) {
      const r = int(random(0, ROWS));
      const c = int(random(0, COLS-1));
      const x0 = xs[c] + colW[c];
      const y0 = ys[r];
      const w = gapX[c];
      const h = rowH[r];
      buf.rect(x0, y0, w, h);
    } else {
      const c = int(random(0, COLS));
      const r = int(random(0, ROWS-1));
      const x0 = xs[c];
      const y0 = ys[r] + rowH[r];
      const w = colW[c];
      const h = gapY[r];
      buf.rect(x0, y0, w, h);
    }
  }
}

function addBigBlocksToBuffer(buf, opts){
  const COLORS = ['#c63b2d', '#2a59b6', '#f2d31b'];
  const PROB = (opts && opts.prob) ?? 0.55;
  const MINF = (opts && opts.minFrac) ?? 0.35;
  const MAXF = (opts && opts.maxFrac) ?? 0.85;
  const THR = (opts && opts.aspectThresh) ?? 1.15;

  buf.noStroke();
  bigBlocks = [];

  for (let r = 0; r < ROWS; r++){
    for (let c = 0; c < COLS; c++){
      if (random() > PROB) continue;
      const x = xs[c], y = ys[r];
      const w = colW[c], h = rowH[r];
      const ratioW = w / h;
      const color = random(COLORS);
      buf.fill(color);

      if (ratioW >= THR) {
        const ww = random(MINF * w, MAXF * w);
        const xx = x + random(0, w - ww);
        buf.rect(xx, y, ww, h);
        bigBlocks.push({ x: xx, y, w: ww, h, color, mode: 'equalHeight' });
      } else if (ratioW <= 1/THR) {
        const hh = random(MINF * h, MAXF * h);
        const yy = y + random(0, h - hh);
        buf.rect(x, yy, w, hh);
        bigBlocks.push({ x, y: yy, w, h: hh, color, mode: 'equalWidth' });
      } else {
        if (random() < 0.5) {
          const ww = random(MINF * w, MAXF * w);
          const xx = x + random(0, w - ww);
          buf.rect(xx, y, ww, h);
          bigBlocks.push({ x: xx, y, w: ww, h, color, mode: 'equalHeight' });
        } else {
          const hh = random(MINF * h, MAXF * h);
          const yy = y + random(0, h - hh);
          buf.rect(x, yy, w, hh);
          bigBlocks.push({ x, y: yy, w, h: hh, color, mode: 'equalWidth' });
        }
      }
    }
  }
}

function overlayBlocksToBuffer(buf, opts){
  const COLORS = ['#c63b2d', '#2a59b6', '#f2d31b'];
  const MINF = (opts && opts.minFrac) ?? 0.35;
  const MAXF = (opts && opts.maxFrac) ?? 0.85;
  const PROB2 = (opts && opts.prob) ?? 0.55;

  buf.noStroke();
  let made = 0;

  for (const b of bigBlocks){
    if (random() > PROB2) continue;
    const altChoices = COLORS.filter(c => c !== b.color);
    const alt = random(altChoices);
    buf.fill(alt);

    if (b.mode === 'equalHeight'){
      const hh = random(MINF * b.h, MAXF * b.h);
      const yy = b.y + random(0, b.h - hh);
      buf.rect(b.x, yy, b.w, hh);
    } else {
      const ww = random(MINF * b.w, MAXF * b.w);
      const xx = b.x + random(0, b.w - ww);
      buf.rect(xx, b.y, ww, b.h);
    }
    made++;
  }
}
