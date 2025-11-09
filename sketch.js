// 画布与网格设置
// Canvas & grid settings
const W = 900, H = 900;
const COLS = 10, ROWS = 10;

// —— 基础间距与“微小抖动幅度” ——
// Base gap sizes and small random jitter
const GAP_X_BASE = 15, GAP_Y_BASE = 15;
const GAP_X_DELTA = 3,  GAP_Y_DELTA = 3;

// 白色方块尺寸范围（列宽/行高）
// Size range of white cells (column width / row height)
const COL_MIN = 20,  COL_MAX = 280;
const ROW_MIN = 40,  ROW_MAX = 140;

// 列宽分布：中间更宽、两侧更窄
// Column width distribution: wider in the centre, narrower at the sides
const CENTER_POWER = 2.2;
const COL_SPREAD   = 2.0;

// 行高分布：中间更高、两侧更矮
// Row height distribution: taller in the centre, shorter at the sides
const ROW_CENTER_POWER = 2.0;
const ROW_SPREAD       = 1.5;

// 几何数据：列宽、行高、缝隙宽高、每列/行起点坐标
// Geometry data: column widths, row heights, gaps, start positions
let colW = [], rowH = [];
let gapX = [], gapY = [];
let xs = [], ys = [];

// 白块内部的大色块（第一层 + 叠加）
// Large colour blocks inside white cells (first pass + overlay)
let bigBlocks = [];     // 记录第一层大块（带 mode） | first-pass blocks with mode
let colorBlocks = [];   // 真正要画的所有色块 | all rectangles to draw

// 白色“连通桥”（把某些缝改成白色连接块）
// White connectors between cells
let connectors = [];

// 黄色道路上的小方块（原来 sprinkle 出来的那批，现在作为“会动”的方块）
// Small squares on yellow roads (the original ones, now animated)
let roadSquares = [];

// 小方块是否在移动的开关（按 E 切换）
// Toggle: whether the road squares are moving (press E to toggle)
let moving = true;

// —— UI：速度控制滑块 + 文字标签 ——
// UI: speed slider + labels
let speedSlider;        // p5.js slider element
let speedLabel;         // “Speed 调整” 标签
let speedInfo;          // 显示 Speed × ... (E/R) 的标签
let speedFactor = 1.0;  // 全局速度系数，乘到每个方块的 speed 上
                        // Global speed factor, multiplies each square's base speed


// 计算当前窗口下画布应有的尺寸（保持正方形 + 限制最大 900）
// Compute canvas size for current window (square, max 900)
function calcCanvasSize(){
  // 预留一点边距，防止贴边 | leave some margins
  let maxSize = 900;
  let size = min(windowWidth - 40, windowHeight - 120, maxSize);
  size = max(size, 300); // 最小 300，避免太小 | min 300
  return size;
}

// 更新滑块和标签的位置：放在画布下面同一行
// Update slider and labels positions: place them on one row below the canvas
function updateSliderPosition(){
  const y = height + 20;
  if (speedLabel){
    // 标签在左边 | label on the left
    speedLabel.position(20, y + 3);
  }
  if (speedSlider){
    // 滑块在标签右侧 | slider to the right of label
    speedSlider.position(100, y);
  }
  if (speedInfo){
    // ★ info 文本再往右一点 | info text further to the right
    speedInfo.position(250, y + 3);
  }
}


// --------------------------------------------------------
// p5.js 标准入口
// --------------------------------------------------------
function setup(){
  const size = calcCanvasSize();
  createCanvas(size, size);  // 实际画布大小随屏幕变化 | canvas size adapts to screen
  noStroke();
  createNewLayout(); // 生成一次完整布局 | generate a full layout once

  // 创建一个 UI 滑块，用来控制速度
  // Create a UI slider to control movement speed
  // 范围 0–300，默认 100，对应 speedFactor = 0–3.0
  speedSlider = createSlider(0, 300, 100);

  // 在滑块旁边加一个“Speed 调整”的文字标签
  // Label next to the slider
  speedLabel = createSpan('Speed change');
  speedLabel.style('font-size', '12px');
  speedLabel.style('font-family', 'sans-serif');

  // 用于显示 "Speed × ... (E: pause / R: reset)" 的标签
  // label to show "Speed × ... (E: pause / R: reset)"
  speedInfo = createSpan('');
  speedInfo.style('font-size', '14px');
  speedInfo.style('font-family', 'sans-serif');

  updateSliderPosition();
}

// 当窗口尺寸变化时，自动调整画布大小和滑块位置
// When the window is resized, adapt canvas size and slider position
function windowResized(){
  const size = calcCanvasSize();
  resizeCanvas(size, size);
  updateSliderPosition();
}


// 每一帧重画底图 + 小方块当前状态
// Each frame: redraw base + road squares
function draw(){
  background('#f2d31b');   // 整个屏幕底色 | screen background

  // 从滑块读取速度系数（0~300 → 0.00~3.00）
  // Read speed factor from slider (0~300 → 0.00~3.00)
  speedFactor = speedSlider.value() / 100.0;

  // 把坐标缩放到当前画布大小：
  // 逻辑空间是 900×900，这里按比例缩放到实际画布的 width×height
  // Scale logical 900×900 space into the current canvas size
  push();
  const s = width / W;   // 因为 width===height，直接用 width/W 即可 | since width==height
  scale(s);

  drawWhiteGrid();         // 10×10 白格 | 10×10 white grid

  if (moving){
    updateRoadSquares();   // 更新位置（用逻辑空间坐标）| update in logical space
  }
  drawRoadSquares();       // 画在黄色道路上的小方块 | draw road squares

  drawConnectors();        // 白色连通桥 | white connectors
  drawColorBlocks();       // 白格内部大色块 | coloured strips inside cells
  pop();

  // 不再在画布里画文字，而是更新 speedInfo 标签的文本
  // Instead of drawing text on canvas, update the HTML label next to the slider
  const infoText = 'Speed × ' + nf(speedFactor, 1, 2) + '  (E: pause / R: reset)';
  if (speedInfo){
    speedInfo.html(infoText);
  }
}


// 键盘控制：R = 重置布局，E = 小方块动/停
// Keyboard: R = reset layout, E = toggle motion
function keyPressed(){
  if (key === 'r' || key === 'R'){
    createNewLayout();
  } else if (key === 'e' || key === 'E'){
    moving = !moving;
  }
}


// --------------------------------------------------------
// 布局生成：缝隙、白格、道路小方块、大色块、连通桥（都在 900×900 逻辑空间里）
// Layout generation in the 900×900 logical space
// --------------------------------------------------------
function createNewLayout(){
  // 1) 缝隙随机抖动 | random jitter for gaps
  gapX = new Array(COLS-1).fill(0).map(
    () => GAP_X_BASE + random(-GAP_X_DELTA, GAP_X_DELTA)
  );
  gapY = new Array(ROWS-1).fill(0).map(
    () => GAP_Y_BASE + random(-GAP_Y_DELTA, GAP_Y_DELTA)
  );

  const sumGapX = gapX.reduce((a,b)=>a+b, 0);
  const sumGapY = gapY.reduce((a,b)=>a+b, 0);

  const availW = W - sumGapX;
  const availH = H - sumGapY;

  // 2) 分配列宽/行高（总和 = 可用宽/高，中间更宽/高）  
  // 2) Allocate column widths / row heights (sum = available size, biased to centre)
  const posW = positionWeights(COLS, CENTER_POWER);
  randomizeWithBias(colW, COLS, availW, COL_MIN, COL_MAX, COL_SPREAD, posW);

  const posR = positionWeights(ROWS, ROW_CENTER_POWER);
  randomizeWithBias(rowH, ROWS, availH, ROW_MIN, ROW_MAX, ROW_SPREAD, posR);

  // 3) 计算每列/每行起点坐标 | compute start x/y for each column/row
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

  // 4) 清空并重新生成：连接桥、大色块、道路小方块
  // 4) Clear and regenerate connectors, big blocks and road squares
  connectors   = [];
  bigBlocks    = [];
  colorBlocks  = [];
  roadSquares  = [];

  generateConnectors(12);    // 白色连通桥 | white bridges
  generateBigBlocks({        // 白格内部大色条 + 叠加 | big strips + overlays
    prob: 0.55,
    minFrac: 0.35,
    maxFrac: 0.85,
    aspectThresh: 1.15
  });
  generateRoadSquares();     // 黄色道路上的小方块（会动的那批）| moving road squares
}


// --------------------------------------------------------
// 绘制部分：白格 / 连通桥 / 大色块 / 道路小方块（都基于逻辑坐标，draw() 里整体缩放）
// Drawing: white grid / connectors / big blocks / road squares (all in logical space)
// --------------------------------------------------------

// 画两层 10×10 白色网格（保持你原来的“刷两遍白块”习惯）
// Draw the 10×10 white grid twice (same as your original code)
function drawWhiteGrid(){
  noStroke();
  fill('#ffffff');
  for (let r = 0; r < ROWS; r++){
    for (let c = 0; c < COLS; c++){
      rect(xs[c], ys[r], colW[c], rowH[r]);
    }
  }
  // 再刷一层，提升“纯白”感 | draw again for a cleaner white
  for (let r = 0; r < ROWS; r++){
    for (let c = 0; c < COLS; c++){
      rect(xs[c], ys[r], colW[c], rowH[r]);
    }
  }
}

// 画白色连通块 | draw white connectors
function drawConnectors(){
  noStroke();
  fill('#ffffff');
  for (const b of connectors){
    rect(b.x, b.y, b.w, b.h);
  }
}

// 画白格子里的大色块（含叠加层）
// Draw all coloured blocks inside white cells (including overlays)
function drawColorBlocks(){
  noStroke();
  for (const b of colorBlocks){
    fill(b.color);
    rect(b.x, b.y, b.w, b.h);
  }
}

// 画黄色道路上的小方块（可能是静止或移动状态）
// Draw small squares on yellow roads (either static or moving)
function drawRoadSquares(){
  noStroke();
  for (const s of roadSquares){
    fill(s.color);
    rect(s.x, s.y, s.size, s.size);
  }
}


// --------------------------------------------------------
// 黄色道路小方块：用原来 sprinkle 的逻辑，改成“生成对象 + 可移动”
// Road squares: same placement logic as original sprinkleColorInGaps, now animatable
// --------------------------------------------------------
function generateRoadSquares(){
  const COLORS = ['#c63b2d', '#2a59b6', '#bfbfbf']; // 红 / 蓝 / 灰 | red / blue / grey
  const V_GAP_MIN = 8,  V_GAP_MAX = 28;
  const H_GAP_MIN = 8,  H_GAP_MAX = 28;

  roadSquares = [];

  // —— 竖向缝（列与列之间），沿 Y 方向排列 ——  
  // Vertical gaps between columns: squares arranged along Y
  for (let c = 0; c < COLS - 1; c++) {
    const x0 = xs[c] + colW[c];
    const w  = gapX[c];
    const s  = w;       // 方块边长 = 缝宽 | square size = gap width
    let y = 0;

    while (y + s <= H) {
      if (random() < 0.65) {
        const color = random(COLORS);
        const speed = random(0.6, 2.0) * (random() < 0.5 ? 1 : -1); // 随机上下方向 | random up/down
        roadSquares.push({
          type: 'v',   // vertical lane
          x: x0,
          y: y,
          size: s,
          color,
          speed      // 基础速度（在 updateRoadSquares 里会乘以 speedFactor）
                     // Base speed (multiplied by speedFactor in updateRoadSquares)
        });
      }
      y += s + random(V_GAP_MIN, V_GAP_MAX);
    }
  }

  // —— 横向缝（行与行之间），沿 X 方向排列 ——  
  // Horizontal gaps between rows: squares arranged along X
  for (let r = 0; r < ROWS - 1; r++) {
    const y0 = ys[r] + rowH[r];
    const h  = gapY[r];
    const s  = h;       // 方块边长 = 缝高 | square size = gap height
    let x = 0;

    while (x + s <= W) {
      if (random() < 0.65) {
        const color = random(COLORS);
        const speed = random(0.6, 2.0) * (random() < 0.5 ? 1 : -1); // 随机左右方向 | random left/right
        roadSquares.push({
          type: 'h',   // horizontal lane
          x: x,
          y: y0,
          size: s,
          color,
          speed
        });
      }
      x += s + random(H_GAP_MIN, H_GAP_MAX);
    }
  }
}

// 更新小方块位置，让它们沿道路循环移动（出界从另一侧回来）
// Update road squares so they move along the roads and wrap around edges
function updateRoadSquares(){
  for (const s of roadSquares){
    // 这里用基础速度 * 全局 speedFactor
    // Use base speed * global speedFactor
    const v = s.speed * speedFactor;

    if (s.type === 'v'){          // 在竖向道路上 | on a vertical road
      s.y += v;
      if (s.y > H)       s.y = -s.size;
      if (s.y < -s.size) s.y = H;
    } else {                      // 在横向道路上 | on a horizontal road
      s.x += v;
      if (s.x > W)       s.x = -s.size;
      if (s.x < -s.size) s.x = W;
    }
  }
}


// --------------------------------------------------------
// 连通桥 + 白格内部大色块（等高/等宽 + 叠加一层“反规则”）
// Connectors + big coloured strips (equal-height/width + opposite overlay)
// --------------------------------------------------------

// 生成白色连通桥（记录版的 linkWhiteBlocks）
// Generate white connectors between adjacent cells
function generateConnectors(count = 8){
  connectors = [];
  for (let k = 0; k < count; k++){
    if (random() < 0.5) {
      // 横向连接：同一行打掉列 c 与 c+1 之间的竖缝
      // Horizontal connection along a row: cover vertical gap between col c and c+1
      const r = int(random(0, ROWS));
      const c = int(random(0, COLS-1));
      const x0 = xs[c] + colW[c];
      const y0 = ys[r];
      const w  = gapX[c];
      const h  = rowH[r];
      connectors.push({ x: x0, y: y0, w, h });
    } else {
      // 纵向连接：同一列打掉行 r 与 r+1 之间的横缝
      // Vertical connection along a column: cover horizontal gap between row r and r+1
      const c = int(random(0, COLS));
      const r = int(random(0, ROWS-1));
      const x0 = xs[c];
      const y0 = ys[r] + rowH[r];
      const w  = colW[c];
      const h  = gapY[r];
      connectors.push({ x: x0, y: y0, w, h });
    }
  }
}


// 在白格里生成大色块，然后按“相反规则”叠加第二层
// Generate big colour blocks and overlay a second layer with the opposite rule
function generateBigBlocks(opts){
  const COLORS = ['#c63b2d', '#2a59b6', '#f2d31b']; // 红 / 蓝 / 黄
  const PROB   = (opts && opts.prob)         ?? 0.55;
  const MINF   = (opts && opts.minFrac)      ?? 0.35;
  const MAXF   = (opts && opts.maxFrac)      ?? 0.85;
  const THR    = (opts && opts.aspectThresh) ?? 1.15;
  const PROB2  = 0.20; // 第二层出现概率 | probability for second-layer blocks

  bigBlocks   = [];
  colorBlocks = [];

  // 第一层：根据白块宽高比，决定等高条 or 等宽条
  // First pass: decide equal-height or equal-width strips based on cell aspect ratio
  for (let r = 0; r < ROWS; r++){
    for (let c = 0; c < COLS; c++){
      if (random() > PROB) continue;

      const x = xs[c], y = ys[r];
      const w = colW[c], h = rowH[r];
      const ratioW = w / h;
      const ratioH = h / w;

      const color = random(COLORS);
      let bx, by, bw, bh, mode;

      if (ratioW >= THR) {
        // 更宽：等高条 | wider → equal-height strip
        bw = random(MINF * w, MAXF * w);
        bh = h;
        bx = x + random(0, w - bw);
        by = y;
        mode = 'equalHeight';
      } else if (ratioH >= THR) {
        // 更高：等宽条 | taller → equal-width strip
        bw = w;
        bh = random(MINF * h, MAXF * h);
        bx = x;
        by = y + random(0, h - bh);
        mode = 'equalWidth';
      } else {
        // 近似正方：随机选一种 | near-square → random choice
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

  // 第二层：按“相反规则”在第一层内部叠加一块
  // Second pass: overlay a block inside each first-pass block using the opposite rule
  for (const b of bigBlocks){
    if (random() > PROB2) continue;

    const COLORS2 = ['#c63b2d', '#2a59b6', '#f2d31b'];
    const altChoices = COLORS2.filter(c => c !== b.color);
    const alt = random(altChoices);

    if (b.mode === 'equalHeight'){
      // 首次等高 → 第二层等宽 | first equal-height → second equal-width
      const hh = random(MINF * b.h, MAXF * b.h);
      const yy = b.y + random(0, b.h - hh);
      colorBlocks.push({ x: b.x, y: yy, w: b.w, h: hh, color: alt });
    } else {
      // 首次等宽 → 第二层等高 | first equal-width → second equal-height
      const ww = random(MINF * b.w, MAXF * b.w);
      const xx = b.x + random(0, b.w - ww);
      colorBlocks.push({ x: xx, y: b.y, w: ww, h: b.h, color: alt });
    }
  }
}


// --------------------------------------------------------
// 工具函数：位置权重 + 带 bias 的随机分配
// Utility functions: positional weights + biased random distribution
// --------------------------------------------------------

// 位置权重：中间值更大，用来让“中间更宽/更高”
// Positional weights: larger in the centre, used to bias widths/heights
function positionWeights(n, power){
  const arr = new Array(n);
  const mid = (n - 1) / 2;
  for (let i = 0; i < n; i++){
    const t = 1 - Math.abs((i - mid) / mid); // 0 at edges, 1 at centre
    arr[i] = Math.pow(t, power) + 0.05;      // +0.05 防止为 0 | avoid 0
  }
  return arr;
}

// 把总量 total 分配给 n 个值，考虑最小值/最大值 + 位置权重
// Distribute total among n values with min/max and positional weights
function randomizeWithBias(out, n, total, minV, maxV, spread, posW){
  const base = n * minV;
  const rest = max(0, total - base);

  let w = new Array(n), sw = 0;
  for (let i = 0; i < n; i++){
    const r = Math.pow(random(), spread);   // spread 越大差异越大 | larger spread → more variance
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

  const s = out.reduce((a,b)=>a+b, 0);
  const k = total / s;
  for (let i = 0; i < n; i++) out[i] *= k;
}