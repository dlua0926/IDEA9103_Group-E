/* =========================================================
 * userinput.js
 * Personal interaction module for the group sketch
 *
 * Usage:
 *   <script src="sketch.js"></script>
 *   <script src="userinput.js"></script>
 *
 * Added features:
 * - Responsive canvas (still uses logical 900×900 space)
 * - Moving road squares in yellow gaps
 * - Mouse black hole that swallows squares (wheel changes size)
 * - Speed slider, E to pause/resume, R to reset layout
 * ========================================================= */

(function () {

  // ---------- Logical space & base parameters ----------
  const W = 900, H = 900;          // logical coordinate system
  const COLS = 10, ROWS = 10;

  const GAP_X_BASE = 15, GAP_Y_BASE = 15;      // base gap size
  const GAP_X_DELTA = 3,  GAP_Y_DELTA = 3;     // small random jitter

  const COL_MIN = 20,  COL_MAX = 280;          // column width range
  const ROW_MIN = 40,  ROW_MAX = 140;          // row height range

  const CENTER_POWER = 2.2;    // center bias for column widths
  const COL_SPREAD   = 2.0;    // randomness spread for columns
  const ROW_CENTER_POWER = 2.0;// center bias for row heights
  const ROW_SPREAD       = 1.5;// randomness spread for rows

  // ---------- Geometry & layout data (in logical 900×900) ----------
  let colW = [], rowH = [];   // column widths / row heights
  let gapX = [], gapY = [];   // vertical/horizontal gaps
  let xs = [], ys = [];       // start x/y per column/row

  let bigBlocks = [];         // first-pass colored blocks with mode info
  let colorBlocks = [];       // all colored rectangles to render
  let connectors = [];        // white connectors that cover gaps

  // --------------------------------------------------------
  // New feature state
  // --------------------------------------------------------

  // Black hole radius (mouse-controlled)
  let blackHoleRadius = 45;      // initial radius in logical units
  const BLACK_HOLE_MIN = 15;     // minimum radius
  const BLACK_HOLE_MAX = 120;    // maximum radius

  // Moving “road squares” – agents moving in yellow gaps
  let roadSquares = [];

  // Pause flag (E toggles this)
  let moving = true;

  // UI elements: speed slider + labels
  let speedSlider;               // p5 slider element
  let speedLabel;                // small label text
  let speedInfo;                 // info text about speed and controls
  let speedFactor = 1.0;         // global speed multiplier


  // --------------------------------------------------------
  // Responsive helpers
  // --------------------------------------------------------
  function calcCanvasSize(){
    // Compute a square canvas that fits within the window
    // with some margin and a maximum size of 900.
    const maxSize = 900;
    let size = min(windowWidth - 40, windowHeight - 120, maxSize);
    size = max(size, 300); // avoid extremely tiny canvases
    return size;
  }

  function updateSliderPosition(){
    // Position slider and labels just below the canvas.
    const y = height + 20;
    if (speedLabel)  speedLabel.position(20,  y + 3);
    if (speedSlider) speedSlider.position(100, y);
    if (speedInfo)   speedInfo.position(250, y + 3);
  }


  // --------------------------------------------------------
  // p5.js lifecycle (local versions)
  // --------------------------------------------------------
  function setup(){
    // Create a responsive square canvas
    const size = calcCanvasSize();
    createCanvas(size, size);

    noStroke();
    createNewLayout(); // generate the initial layout

    // Create speed slider: 0–300 → 0.00–3.00
    speedSlider = createSlider(0, 300, 100);

    // Create small label for the slider
    speedLabel = createSpan('Speed Change');
    speedLabel.style('font-size', '12px');
    speedLabel.style('font-family', 'sans-serif');

    // Info line that shows speed, keys, BH radius
    speedInfo = createSpan('');
    speedInfo.style('font-size', '14px');
    speedInfo.style('font-family', 'sans-serif');

    updateSliderPosition();
  }

  function windowResized(){
    // When the window changes size, resize canvas and move UI
    const size = calcCanvasSize();
    resizeCanvas(size, size);
    updateSliderPosition();
  }

  function draw(){
    // Continuous animation instead of original noLoop/drawScene
    background('#f2d31b');   // yellow background (roads)

    // Read current speed factor from the slider
    speedFactor = speedSlider.value() / 100.0;

    push();
    // Scale from logical coordinates to current canvas size
    const s = width / W;
    scale(s);

    // Compute black hole center from mouse position (if inside canvas)
    let holeActive = false;
    let holeX = null, holeY = null;
    const mx = mouseX, my = mouseY;
    if (mx >= 0 && mx <= width && my >= 0 && my <= height){
      holeX = mx / s;
      holeY = my / s;
      holeActive = true;
      noCursor();   // hide cursor when active
    } else {
      cursor();     // show cursor when outside canvas
    }

    // Draw the 10×10 white grid twice (same as group version)
    drawWhiteGrid();

    // Move road squares and apply black-hole culling
    if (moving){
      updateRoadSquares(
        holeActive ? holeX : null,
        holeActive ? holeY : null
      );
    }

    // Render moving agents, white connectors, and colored strips
    drawRoadSquares();
    drawConnectors();
    drawColorBlocks();

    // Draw the black hole (glow + ring + core) if active
    if (holeActive){
      drawBlackHole(holeX, holeY);
    }
    pop();

    // Update info text
    const infoText =
      'Speed × ' + nf(speedFactor, 1, 2) + '   (E: pause / R: reset)' +
      '<br/>' +
      'BH radius: ' + int(blackHoleRadius) + ' (scroll to adjust)';
    if (speedInfo) speedInfo.html(infoText);
  }

  function keyPressed(){
    // R: regenerate the whole layout
    if (key === 'r' || key === 'R'){
      createNewLayout();
    }
    // E: pause/resume motion
    else if (key === 'e' || key === 'E'){
      moving = !moving;
    }
    // If you want to preserve any group keyPress behavior,
    // you could call a stored reference here (e.g. window._groupKeyPressed)
  }

  function mouseWheel(event){
    // Adjust black hole radius only while the mouse is over the canvas
    if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height){
      // event.deltaY < 0: scroll up; > 0: scroll down
      // Negative delta → increase radius, positive delta → decrease radius
      blackHoleRadius = constrain(
        blackHoleRadius - event.deltaY * 0.05,  // sensitivity factor
        BLACK_HOLE_MIN,
        BLACK_HOLE_MAX
      );
      // Return false to block page scrolling when interacting with BH
      return false;
    }
  }


  // --------------------------------------------------------
  // Layout generation: gaps → sizes → coordinates → blocks/agents
  // --------------------------------------------------------
  function createNewLayout(){
    // Random gaps between columns/rows with slight jitter
    gapX = new Array(COLS - 1).fill(0).map(
      () => GAP_X_BASE + random(-GAP_X_DELTA, GAP_X_DELTA)
    );
    gapY = new Array(ROWS - 1).fill(0).map(
      () => GAP_Y_BASE + random(-GAP_Y_DELTA, GAP_Y_DELTA)
    );

    const sumGapX = gapX.reduce((a, b) => a + b, 0);
    const sumGapY = gapY.reduce((a, b) => a + b, 0);

    const availW = W - sumGapX;
    const availH = H - sumGapY;

    // Center-biased random allocation for column/row sizes
    const posW = positionWeights(COLS, CENTER_POWER);
    randomizeWithBias(colW, COLS, availW, COL_MIN, COL_MAX, COL_SPREAD, posW);

    const posR = positionWeights(ROWS, ROW_CENTER_POWER);
    randomizeWithBias(rowH, ROWS, availH, ROW_MIN, ROW_MAX, ROW_SPREAD, posR);

    // Compute start coordinates for each column and row
    xs = new Array(COLS);
    ys = new Array(ROWS);

    let x = 0;
    for (let c = 0; c < COLS; c++){
      xs[c] = x;
      x += colW[c] + (c < COLS - 1 ? gapX[c] : 0);
    }

    let y = 0;
    for (let r = 0; r < ROWS; r++){
      ys[r] = y;
      y += rowH[r] + (r < ROWS - 1 ? gapY[r] : 0);
    }

    // Reset all stored objects and regenerate them
    connectors   = [];
    bigBlocks    = [];
    colorBlocks  = [];
    roadSquares  = [];

    // Generate white connectors that bridge some gaps
    generateConnectors(12);

    // Generate main colored strips and second-layer overlays
    generateBigBlocks({
      prob: 0.55,
      minFrac: 0.35,
      maxFrac: 0.85,
      aspectThresh: 1.15
    });

    // Generate moving agents inside the yellow roads
    generateRoadSquares();
  }


  // --------------------------------------------------------
  // Rendering helpers: white grid / connectors / colored strips / agents / BH
  // --------------------------------------------------------
  function drawWhiteGrid(){
    noStroke();
    fill('#ffffff');

    // First pass: base white cells
    for (let r = 0; r < ROWS; r++){
      for (let c = 0; c < COLS; c++){
        rect(xs[c], ys[r], colW[c], rowH[r]);
      }
    }
    // Second pass: reinforces whiteness and smooths seams
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

  function drawBlackHole(hx, hy){
    // Render a blue-black black hole with glow, ring, and pulsing core
    push();

    const base = blackHoleRadius;
    const pulse = 1 + 0.05 * sin(frameCount * 0.08); // breathing effect
    const r = base * pulse;

    // 1) Outer soft glow (light blue), fading outwards
    noStroke();
    for (let i = 0; i < 14; i++){
      const t = i / 13.0;
      const rr = lerp(r * 1.5, r * 2.2, t);
      const alpha = lerp(90, 0, t);
      fill(120, 170, 255, alpha);
      ellipse(hx, hy, rr * 2, rr * 2);
    }

    // 2) Bright accretion ring around the core
    noFill();
    stroke(190, 210, 255, 230);
    strokeWeight(r * 0.18);
    ellipse(hx, hy, r * 1.6 * 2, r * 1.6 * 2);

    // 3) Deep blue core with inner glow
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
  // Road squares: generation and movement
  // --------------------------------------------------------
  function generateRoadSquares(){
    // Build moving squares along the yellow gaps
    const COLORS = ['#c63b2d', '#2a59b6', '#bfbfbf']; // red / blue / grey
    const V_GAP_MIN = 8,  V_GAP_MAX = 28;
    const H_GAP_MIN = 8,  H_GAP_MAX = 28;

    roadSquares = [];

    // Vertical lanes: squares placed in vertical gaps, moving up/down
    for (let c = 0; c < COLS - 1; c++) {
      const x0 = xs[c] + colW[c]; // x of the vertical gap
      const w  = gapX[c];         // gap width
      const s  = w;               // square side = gap width
      let y = 0;

      while (y + s <= H) {
        if (random() < 0.65) {
          const color = random(COLORS);
          const speed = random(0.6, 2.0) * (random() < 0.5 ? 1 : -1); // up/down
          roadSquares.push({ type: 'v', x: x0, y: y, size: s, color, speed });
        }
        y += s + random(V_GAP_MIN, V_GAP_MAX);
      }
    }

    // Horizontal lanes: squares placed in horizontal gaps, moving left/right
    for (let r = 0; r < ROWS - 1; r++) {
      const y0 = ys[r] + rowH[r]; // y of the horizontal gap
      const h  = gapY[r];         // gap height
      const s  = h;               // square side = gap height
      let x = 0;

      while (x + s <= W) {
        if (random() < 0.65) {
          const color = random(COLORS);
          const speed = random(0.6, 2.0) * (random() < 0.5 ? 1 : -1); // left/right
          roadSquares.push({ type: 'h', x: x, y: y0, size: s, color, speed });
        }
        x += s + random(H_GAP_MIN, H_GAP_MAX);
      }
    }
  }

  function updateRoadSquares(holeX, holeY){
    // Move each road square along its lane, wrap at edges,
    // and optionally remove it if it enters the black hole.
    const hasHole =
      holeX !== null && holeX !== undefined &&
      holeY !== null && holeY !== undefined;

    const keep = [];

    for (const sq of roadSquares){
      // Move according to its speed and the global speedFactor
      const v = sq.speed * speedFactor;

      if (sq.type === 'v'){              // vertical lane
        sq.y += v;
        if (sq.y > H)        sq.y = -sq.size; // wrap bottom → top
        if (sq.y < -sq.size) sq.y = H;        // wrap top → bottom
      } else {                           // horizontal lane
        sq.x += v;
        if (sq.x > W)        sq.x = -sq.size; // wrap right → left
        if (sq.x < -sq.size) sq.x = W;        // wrap left → right
      }

      // If the black hole is active, check whether this square
      // is inside the radius and remove it if so.
      if (hasHole){
        const cx = sq.x + sq.size * 0.5;
        const cy = sq.y + sq.size * 0.5;
        const dx = cx - holeX;
        const dy = cy - holeY;
        const distSq = dx * dx + dy * dy;
        if (distSq < blackHoleRadius * blackHoleRadius){
          continue; // swallowed, do not keep
        }
      }

      keep.push(sq);
    }

    roadSquares = keep;
  }


  // --------------------------------------------------------
  // White connectors + colored strips (record-then-draw style)
  // --------------------------------------------------------
  function generateConnectors(count = 8){
    // Randomly choose horizontal or vertical connectors
    // that bridge gaps between white cells.
    connectors = [];
    for (let k = 0; k < count; k++){
      if (random() < 0.5) {
        // Horizontal connector: cover a vertical gap between column c and c+1 on row r
        const r = int(random(0, ROWS));
        const c = int(random(0, COLS - 1));
        const x0 = xs[c] + colW[c];
        const y0 = ys[r];
        const w  = gapX[c];
        const h  = rowH[r];
        connectors.push({ x: x0, y: y0, w, h });
      } else {
        // Vertical connector: cover a horizontal gap between row r and r+1 on column c
        const c = int(random(0, COLS));
        const r = int(random(0, ROWS - 1));
        const x0 = xs[c];
        const y0 = ys[r] + rowH[r];
        const w  = colW[c];
        const h  = gapY[r];
        connectors.push({ x: x0, y: y0, w, h });
      }
    }
  }

  function generateBigBlocks(opts){
    // Generate large colored strips inside each white cell.
    // Then overlay a second strip inside each big block using
    // the “opposite rule” (equal-height vs equal-width).
    const COLORS = ['#c63b2d', '#2a59b6', '#f2d31b']; // red / blue / yellow
    const PROB   = (opts && opts.prob)         ?? 0.55;
    const MINF   = (opts && opts.minFrac)      ?? 0.35;
    const MAXF   = (opts && opts.maxFrac)      ?? 0.85;
    const THR    = (opts && opts.aspectThresh) ?? 1.15;
    const PROB2  = 0.20; // overlay probability

    bigBlocks   = [];
    colorBlocks = [];

    // First pass: choose equal-height or equal-width strips
    for (let r = 0; r < ROWS; r++){
      for (let c = 0; c < COLS; c++){
        if (random() > PROB) continue;

        const x = xs[c], y = ys[r];
        const w = colW[c], h = rowH[r];
        const ratioW = w / h;
        const ratioH = h / w;

        const color = random(COLORS);
        let bx, by, bw, bh, mode;

        if (ratioW >= THR) {               // wider cell → equal-height strip
          bw = random(MINF * w, MAXF * w);
          bh = h;
          bx = x + random(0, w - bw);
          by = y;
          mode = 'equalHeight';
        } else if (ratioH >= THR) {        // taller cell → equal-width strip
          bw = w;
          bh = random(MINF * h, MAXF * h);
          bx = x;
          by = y + random(0, h - bh);
          mode = 'equalWidth';
        } else {                           // near-square → randomly choose a mode
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

        bigBlocks.push({ x: bx, y: by, w: bw, h: bh, color, mode });
        colorBlocks.push({ x: bx, y: by, w: bw, h: bh, color });
      }
    }

    // Second pass: overlay another strip inside each big block
    for (const b of bigBlocks){
      if (random() > PROB2) continue;

      const COLORS2 = ['#c63b2d', '#2a59b6', '#f2d31b'];
      const alt = random(COLORS2.filter(c => c !== b.color));

      if (b.mode === 'equalHeight'){         // EH → overlay EW inside it
        const hh = random(MINF * b.h, MAXF * b.h);
        const yy = b.y + random(0, b.h - hh);
        colorBlocks.push({ x: b.x, y: yy, w: b.w, h: hh, color: alt });
      } else {                               // EW → overlay EH inside it
        const ww = random(MINF * b.w, MAXF * b.w);
        const xx = b.x + random(0, b.w - ww);
        colorBlocks.push({ x: xx, y: b.y, w: ww, h: b.h, color: alt });
      }
    }
  }


  // --------------------------------------------------------
  // Utility functions (local versions)
  // --------------------------------------------------------
  function positionWeights(n, power){
    // Returns an array of length n.
    // Each position gets a weight that is higher near the center
    // and lower near the edges. The “power” exponent controls
    // how strong this bias is.
    const arr = new Array(n);
    const mid = (n - 1) / 2;
    for (let i = 0; i < n; i++){
      const t = 1 - Math.abs((i - mid) / mid); // 0 at edge, 1 at center
      arr[i] = Math.pow(t, power) + 0.05;      // add small constant to avoid 0
    }
    return arr;
  }

  function randomizeWithBias(out, n, total, minV, maxV, spread, posW){
    // Distribute “total” among n entries in out[],
    // such that:
    //  - Each entry is at least minV.
    //  - No entry exceeds maxV (if maxV > minV).
    //  - Distribution is random with controllable variance (spread).
    //  - posW (optional) influences relative size by position.
    // Final step rescales so the sum is exactly “total”.
    const base = n * minV;
    const rest = max(0, total - base);

    let w = new Array(n), sw = 0;
    for (let i = 0; i < n; i++){
      const r = Math.pow(random(), spread);   // spread > 1 → more variance
      w[i] = (posW ? posW[i] : 1) * r;
      sw  += w[i];
    }
    if (sw <= 0){
      w.fill(1);
      sw = n;
    }

    for (let i = 0; i < n; i++){
      out[i] = minV + (w[i] / sw) * rest;
      if (maxV > minV) out[i] = constrain(out[i], minV, maxV);
    }

    const s = out.reduce((a, b) => a + b, 0);
    const k = total / s;
    for (let i = 0; i < n; i++) out[i] *= k;
  }


  // --------------------------------------------------------
  // Expose p5 entry points globally so this module overrides
  // the group’s setup/draw/keyPressed/etc.
  // --------------------------------------------------------
  window.setup = setup;
  window.draw = draw;
  window.windowResized = windowResized;
  window.keyPressed = keyPressed;
  window.mouseWheel = mouseWheel;

})(); // end IIFE