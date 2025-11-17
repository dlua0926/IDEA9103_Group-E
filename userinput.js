// =========================================================
// User Black Hole Edition (Instance Mode)
// - This sketch is fully self-contained and won't clash
//   with the group sketch globals.
// - Attach it to a container with id="user-sketch-container"
//   via `new p5(userBlackHoleSketch, 'user-sketch-container');`
// =========================================================

const userBlackHoleSketch = (p) => {
  // ---------- Logical space & base params ----------
  const W = 900, H = 900;
  const COLS = 10, ROWS = 10;

  const GAP_X_BASE = 15, GAP_Y_BASE = 15;
  const GAP_X_DELTA = 3,  GAP_Y_DELTA = 3;

  const COL_MIN = 20,  COL_MAX = 280;
  const ROW_MIN = 40,  ROW_MAX = 140;

  const CENTER_POWER = 2.2;
  const COL_SPREAD   = 2.0;
  const ROW_CENTER_POWER = 2.0;
  const ROW_SPREAD       = 1.5;

  // ---------- Geometry & data arrays ----------
  let colW = [], rowH = [];
  let gapX = [], gapY = [];
  let xs = [], ys = [];

  let bigBlocks = [];
  let colorBlocks = [];
  let connectors = [];

  // ---------- New Feature variables ----------
  // Black hole radius
  let blackHoleRadius = 45;
  const BLACK_HOLE_MIN = 15;
  const BLACK_HOLE_MAX = 120;

  // Moving road squares
  let roadSquares = [];

  // Motion toggle
  let moving = true;

  // UI slider & labels
  let speedSlider;
  let speedLabel;
  let speedInfo;
  let speedFactor = 1.0;


  // --------------------------------------------------------
  // Responsive helpers
  // --------------------------------------------------------
  function calcCanvasSize(){
    const maxSize = 900;
    let size = Math.min(p.windowWidth - 40, p.windowHeight - 120, maxSize);
    size = Math.max(size, 300);
    return size;
  }

  function updateSliderPosition(){
    const y = p.height + 20;
    if (speedLabel)  speedLabel.position(20,  y + 3);
    if (speedSlider) speedSlider.position(100, y);
    if (speedInfo)   speedInfo.position(250, y + 3);
  }

  // --------------------------------------------------------
  // p5 lifecycle
  // --------------------------------------------------------
  p.setup = () => {
    const size = calcCanvasSize();
    // 让画布挂在这个实例对应的 div 上
    const cnv = p.createCanvas(size, size);
    cnv.parent('user-sketch-container');

    p.noStroke();
    createNewLayout(); // initial layout

    // speed slider
    speedSlider = p.createSlider(0, 300, 100);

    speedLabel = p.createSpan('Speed Change');
    speedLabel.style('font-size', '12px');
    speedLabel.style('font-family', 'sans-serif');

    speedInfo = p.createSpan('');
    speedInfo.style('font-size', '14px');
    speedInfo.style('font-family', 'sans-serif');

    updateSliderPosition();
  };

  p.windowResized = () => {
    const size = calcCanvasSize();
    p.resizeCanvas(size, size);
    updateSliderPosition();
  };

  p.draw = () => {
    p.background('#f2d31b');

    speedFactor = speedSlider.value() / 100.0;

    p.push();
    const s = p.width / W;
    p.scale(s);

    // mouse → logical
    let holeActive = false;
    let holeX = null, holeY = null;
    const mx = p.mouseX, my = p.mouseY;
    if (mx >= 0 && mx <= p.width && my >= 0 && my <= p.height){
      holeX = mx / s;
      holeY = my / s;
      holeActive = true;
      p.noCursor();
    } else {
      p.cursor();
    }

    // draw white grid
    drawWhiteGrid();

    // update squares if moving
    if (moving){
      updateRoadSquares(holeActive ? holeX : null, holeActive ? holeY : null);
    }

    // draw agents / connectors / color blocks
    drawRoadSquares();
    drawConnectors();
    drawColorBlocks();

    // draw black hole
    if (holeActive){
      drawBlackHole(holeX, holeY);
    }

    p.pop();

    const infoText =
      'Speed × ' + p.nf(speedFactor, 1, 2) + '  (E: pause / R: reset)' +
      '<br/>' +
      'BH ' + p.int(blackHoleRadius) + ' (Scroll wheel to adjust black hole size)';
    if (speedInfo) speedInfo.html(infoText);
  };

  p.keyPressed = () => {
    if (p.key === 'r' || p.key === 'R'){
      createNewLayout();
    } else if (p.key === 'e' || p.key === 'E'){
      moving = !moving;
    }
  };

  p.mouseWheel = (event) => {
    if (p.mouseX >= 0 && p.mouseX <= p.width && p.mouseY >= 0 && p.mouseY <= p.height){
      blackHoleRadius = p.constrain(
        blackHoleRadius - event.deltaY * 0.05,
        BLACK_HOLE_MIN,
        BLACK_HOLE_MAX
      );
      return false; // prevent page scroll
    }
  };


  // --------------------------------------------------------
  // Layout generation
  // --------------------------------------------------------
  function createNewLayout(){
    gapX = new Array(COLS-1).fill(0).map(()=> GAP_X_BASE + p.random(-GAP_X_DELTA, GAP_X_DELTA));
    gapY = new Array(ROWS-1).fill(0).map(()=> GAP_Y_BASE + p.random(-GAP_Y_DELTA, GAP_Y_DELTA));

    const sumGapX = gapX.reduce((a,b)=>a+b, 0);
    const sumGapY = gapY.reduce((a,b)=>a+b, 0);

    const availW = W - sumGapX;
    const availH = H - sumGapY;

    const posW = positionWeights(COLS, CENTER_POWER);
    randomizeWithBias(colW, COLS, availW, COL_MIN, COL_MAX, COL_SPREAD, posW);

    const posR = positionWeights(ROWS, ROW_CENTER_POWER);
    randomizeWithBias(rowH, ROWS, availH, ROW_MIN, ROW_MAX, ROW_SPREAD, posR);

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

    connectors   = [];
    bigBlocks    = [];
    colorBlocks  = [];
    roadSquares  = [];

    generateConnectors(12);

    generateBigBlocks({
      prob: 0.55,
      minFrac: 0.35,
      maxFrac: 0.85,
      aspectThresh: 1.15
    });

    generateRoadSquares();
  }


  // --------------------------------------------------------
  // Rendering helpers
  // --------------------------------------------------------
  function drawWhiteGrid(){
    p.noStroke();
    p.fill('#ffffff');
    // pass 1
    for (let r = 0; r < ROWS; r++){
      for (let c = 0; c < COLS; c++){
        p.rect(xs[c], ys[r], colW[c], rowH[r]);
      }
    }
    // pass 2
    for (let r = 0; r < ROWS; r++){
      for (let c = 0; c < COLS; c++){
        p.rect(xs[c], ys[r], colW[c], rowH[r]);
      }
    }
  }

  function drawConnectors(){
    p.noStroke();
    p.fill('#ffffff');
    for (const b of connectors){
      p.rect(b.x, b.y, b.w, b.h);
    }
  }

  function drawColorBlocks(){
    p.noStroke();
    for (const b of colorBlocks){
      p.fill(b.color);
      p.rect(b.x, b.y, b.w, b.h);
    }
  }

  function drawRoadSquares(){
    p.noStroke();
    for (const s of roadSquares){
      p.fill(s.color);
      p.rect(s.x, s.y, s.size, s.size);
    }
  }

  function drawBlackHole(hx, hy){
    p.push();

    const base = blackHoleRadius;
    const pulse = 1 + 0.05 * Math.sin(p.frameCount * 0.08);
    const r = base * pulse;

    // outer glow
    p.noStroke();
    for (let i = 0; i < 14; i++){
      const t = i / 13.0;
      const rr = p.lerp(r * 1.5, r * 2.2, t);
      const alpha = p.lerp(90, 0, t);
      p.fill(120, 170, 255, alpha);
      p.ellipse(hx, hy, rr * 2, rr * 2);
    }

    // ring
    p.noFill();
    p.stroke(190, 210, 255, 230);
    p.strokeWeight(r * 0.18);
    p.ellipse(hx, hy, r * 1.6 * 2, r * 1.6 * 2);

    // core
    p.noStroke();
    for (let i = 0; i < 18; i++){
      const t = i / 17.0;
      const rr = p.lerp(r * 0.3, r, t);
      const alpha = p.lerp(220, 0, t);
      p.fill(30, 70, 180, alpha);
      p.ellipse(hx, hy, rr * 2, rr * 2);
    }

    p.pop();
  }


  // --------------------------------------------------------
  // Road squares
  // --------------------------------------------------------
  function generateRoadSquares(){
    const COLORS = ['#c63b2d', '#2a59b6', '#bfbfbf'];
    const V_GAP_MIN = 8,  V_GAP_MAX = 28;
    const H_GAP_MIN = 8,  H_GAP_MAX = 28;

    roadSquares = [];

    // vertical lanes
    for (let c = 0; c < COLS - 1; c++) {
      const x0 = xs[c] + colW[c];
      const w  = gapX[c];
      const s  = w;
      let y = 0;

      while (y + s <= H) {
        if (p.random() < 0.65) {
          const color = p.random(COLORS);
          const speed = p.random(0.6, 2.0) * (p.random() < 0.5 ? 1 : -1);
          roadSquares.push({ type:'v', x:x0, y:y, size:s, color, speed });
        }
        y += s + p.random(V_GAP_MIN, V_GAP_MAX);
      }
    }

    // horizontal lanes
    for (let r = 0; r < ROWS - 1; r++) {
      const y0 = ys[r] + rowH[r];
      const h  = gapY[r];
      const s  = h;
      let x = 0;

      while (x + s <= W) {
        if (p.random() < 0.65) {
          const color = p.random(COLORS);
          const speed = p.random(0.6, 2.0) * (p.random() < 0.5 ? 1 : -1);
          roadSquares.push({ type:'h', x:x, y:y0, size:s, color, speed });
        }
        x += s + p.random(H_GAP_MIN, H_GAP_MAX);
      }
    }
  }

  function updateRoadSquares(holeX, holeY){
    const hasHole = (holeX !== null && holeX !== undefined &&
                     holeY !== null && holeY !== undefined);

    const keep = [];

    for (const sq of roadSquares){
      const v = sq.speed * speedFactor;

      if (sq.type === 'v'){
        sq.y += v;
        if (sq.y > H)        sq.y = -sq.size;
        if (sq.y < -sq.size) sq.y = H;
      } else {
        sq.x += v;
        if (sq.x > W)        sq.x = -sq.size;
        if (sq.x < -sq.size) sq.x = W;
      }

      if (hasHole){
        const cx = sq.x + sq.size * 0.5;
        const cy = sq.y + sq.size * 0.5;
        const dx = cx - holeX;
        const dy = cy - holeY;
        const distSq = dx*dx + dy*dy;
        if (distSq < blackHoleRadius * blackHoleRadius){
          continue;
        }
      }

      keep.push(sq);
    }

    roadSquares = keep;
  }


  // --------------------------------------------------------
  // Connectors + big blocks
  // --------------------------------------------------------
  function generateConnectors(count = 8){
    connectors = [];
    for (let k = 0; k < count; k++){
      if (p.random() < 0.5) {
        const r = p.int(p.random(0, ROWS));
        const c = p.int(p.random(0, COLS-1));
        const x0 = xs[c] + colW[c];
        const y0 = ys[r];
        const w  = gapX[c];
        const h  = rowH[r];
        connectors.push({ x:x0, y:y0, w, h });
      } else {
        const c = p.int(p.random(0, COLS));
        const r = p.int(p.random(0, ROWS-1));
        const x0 = xs[c];
        const y0 = ys[r] + rowH[r];
        const w  = colW[c];
        const h  = gapY[r];
        connectors.push({ x:x0, y:y0, w, h });
      }
    }
  }

  function generateBigBlocks(opts){
    const COLORS = ['#c63b2d', '#2a59b6', '#f2d31b'];
    const PROB   = (opts && opts.prob)         ?? 0.55;
    const MINF   = (opts && opts.minFrac)      ?? 0.35;
    const MAXF   = (opts && opts.maxFrac)      ?? 0.85;
    const THR    = (opts && opts.aspectThresh) ?? 1.15;
    const PROB2  = 0.20;

    bigBlocks   = [];
    colorBlocks = [];

    for (let r = 0; r < ROWS; r++){
      for (let c = 0; c < COLS; c++){
        if (p.random() > PROB) continue;

        const x = xs[c], y = ys[r];
        const w = colW[c], h = rowH[r];
        const ratioW = w / h;
        const ratioH = h / w;

        const color = p.random(COLORS);
        let bx, by, bw, bh, mode;

        if (ratioW >= THR) {
          bw = p.random(MINF * w, MAXF * w);
          bh = h;
          bx = x + p.random(0, w - bw);
          by = y;
          mode = 'equalHeight';
        } else if (ratioH >= THR) {
          bw = w;
          bh = p.random(MINF * h, MAXF * h);
          bx = x;
          by = y + p.random(0, h - bh);
          mode = 'equalWidth';
        } else {
          if (p.random() < 0.5){
            bw = p.random(MINF * w, MAXF * w);
            bh = h;
            bx = x + p.random(0, w - bw);
            by = y;
            mode = 'equalHeight';
          } else {
            bw = w;
            bh = p.random(MINF * h, MAXF * h);
            bx = x;
            by = y + p.random(0, h - bh);
            mode = 'equalWidth';
          }
        }

        bigBlocks.push({ x:bx, y:by, w:bw, h:bh, color, mode });
        colorBlocks.push({ x:bx, y:by, w:bw, h:bh, color });
      }
    }

    for (const b of bigBlocks){
      if (p.random() > PROB2) continue;

      const COLORS2 = ['#c63b2d', '#2a59b6', '#f2d31b'];
      const alt = p.random(COLORS2.filter(c => c !== b.color));

      if (b.mode === 'equalHeight'){
        const hh = p.random(MINF * b.h, MAXF * b.h);
        const yy = b.y + p.random(0, b.h - hh);
        colorBlocks.push({ x: b.x, y: yy, w: b.w, h: hh, color: alt });
      } else {
        const ww = p.random(MINF * b.w, MAXF * b.w);
        const xx = b.x + p.random(0, b.w - ww);
        colorBlocks.push({ x: xx, y: b.y, w: ww, h: b.h, color: alt });
      }
    }
  }


  // --------------------------------------------------------
  // Utilities
  // --------------------------------------------------------
  function positionWeights(n, power){
    const arr = new Array(n);
    const mid = (n - 1) / 2;
    for (let i = 0; i < n; i++){
      const t = 1 - Math.abs((i - mid) / mid);
      arr[i] = Math.pow(t, power) + 0.05;
    }
    return arr;
  }

  function randomizeWithBias(out, n, total, minV, maxV, spread, posW){
    const base = n * minV;
    const rest = Math.max(0, total - base);

    let w = new Array(n), sw = 0;
    for (let i = 0; i < n; i++){
      const r = Math.pow(p.random(), spread);
      w[i] = (posW ? posW[i] : 1) * r;
      sw  += w[i];
    }
    if (sw <= 0){ w.fill(1); sw = n; }

    for (let i = 0; i < n; i++){
      out[i] = minV + (w[i] / sw) * rest;
      if (maxV > minV) out[i] = p.constrain(out[i], minV, maxV);
    }

    const s = out.reduce((a,b)=>a+b, 0);
    const k = total / s;
    for (let i = 0; i < n; i++) out[i] *= k;
  }
};

// 创建这个实例（挂在 id="user-sketch-container" 上）
new p5(userBlackHoleSketch);

