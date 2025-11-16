const W = 900, H = 900;
const COLS = 10, ROWS = 10;

// —— 基础间距与“微小抖动幅度” ——
// Base spacing of gaps and small random jitter per gap
// 例如基础 10px，每条缝各自 ±2px 的细微差别
// For example, base 10px and each gap jitters by about ±2px
const GAP_X_BASE = 15, GAP_Y_BASE = 15;
const GAP_X_DELTA = 3,  GAP_Y_DELTA = 3;

// 白色方块尺寸范围（列宽/行高）
// Size range of white cells (column width / row height)
const COL_MIN = 20,  COL_MAX = 280;
const ROW_MIN = 40,  ROW_MAX = 140;

// 列宽分布（可选：让“中间稍宽、两侧偏窄”以获得更好观感）
// Column width distribution (optional: make middle columns wider, edges narrower for better aesthetics)
const CENTER_POWER = 2.2; // 越大→中间越宽、两侧越窄 | Larger → wider center, narrower sides
const COL_SPREAD   = 2.0; // 越大→差距越大；1=普通随机 | Larger → more variation; 1 = plain random

// 行高分布（“中间更高、两侧更矮”）
// Row height distribution (“taller in the middle, shorter on the sides”)
const ROW_CENTER_POWER = 2.0; // 越大→中间更高、两侧更低 | Larger → taller center rows
const ROW_SPREAD       = 1.5; // 越大→差距越大；1=普通随机 | Larger → more variation; 1 = plain random

// 用于存放列宽、行高和缝隙、坐标等
// Arrays to store column widths, row heights, gaps and coordinates
let colW = [], rowH = [];
let gapX = [], gapY = [];  // 变动后的间距 | jittered gaps
let xs = [], ys = [];      // 每列/每行的起点坐标（无外边距）| start positions of each col/row (no outer margin)
let bigBlocks = [];        // 记录刚刚生成的彩色大方块（供二次方块使用 / 动画使用）
// Stores generated large color blocks, for second-layer blocks

function setup(){
  createCanvas(W, H);
  // 原来有 noLoop() 会阻止动画，这里去掉
  // noLoop();
  drawScene(); // 初次绘制静态场景
}

// ⭐ 每帧都会执行，用来做动画
function draw() {
  const t = frameCount * 0.02; // 时间参数，用于 Perlin noise
  animateBigBlocks(t);
}

function drawScene(){
  // 黄色背景
  // Yellow background
  background('#f2d31b');

  // 1) 为每条“列缝/行缝”生成微小不同的间距
  // 1) Generate small random gap values for each vertical/horizontal gap
  gapX = new Array(COLS-1).fill(0).map(()=> GAP_X_BASE + random(-GAP_X_DELTA, GAP_X_DELTA));
  gapY = new Array(ROWS-1).fill(0).map(()=> GAP_Y_BASE + random(-GAP_Y_DELTA, GAP_Y_DELTA));

  const sumGapX = gapX.reduce((a,b)=>a+b, 0);
  const sumGapY = gapY.reduce((a,b)=>a+b, 0);

  // 2) 可用于白块的总宽/高（不含外边距，只在内部划分）  
  // 2) Total available width/height for white cells (no outer margin)
  const availW = W - sumGapX;
  const availH = H - sumGapY;

  // 3) 列宽/行高的随机分配（总和严格 = 可用尺寸）
  // 3) Randomly allocate column widths and row heights (sum strictly equals available size)
  const posW = positionWeights(COLS, CENTER_POWER);     // 中间更宽的权重（可关闭）| weights for wider center columns
  randomizeWithBias(colW, COLS, availW, COL_MIN, COL_MAX, COL_SPREAD, posW);

  const posR = positionWeights(ROWS, ROW_CENTER_POWER); // 中间高度更大的权重
  // Weights for taller center rows
  randomizeWithBias(rowH, ROWS, availH, ROW_MIN, ROW_MAX, ROW_SPREAD, posR);

  // 4) 计算每列/每行的起点（从 0 开始，一直排到边缘）  
  // 4) Compute starting x/y for each col/row (from 0 to canvas edge)
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

  // 5) 画 10×10 白色方块
  // 5) Draw the 10×10 grid of white rectangles
  noStroke(); 
  fill('#ffffff');
  for (let r = 0; r < ROWS; r++){
    for (let c = 0; c < COLS; c++){
      rect(xs[c], ys[r], colW[c], rowH[r]);
    }
  }

  // 5) 再画一层 10×10 白色方块（保持原样）  
  // 5) Draw another layer of 10×10 white rectangles (as originally written)
  noStroke(); 
  fill('#ffffff');
  for (let r = 0; r < ROWS; r++){
    for (let c = 0; c < COLS; c++){
      rect(xs[c], ys[r], colW[c], rowH[r]);
    }
  }

  // 6) 在黄色缝里撒红/蓝/灰小方块
  // 6) Sprinkle red/blue/grey small squares in the yellow gaps
  sprinkleColorInGaps();

  // 7) 用白色“连通”相邻的白块，把一部分缝盖掉
  // 7) Use white to connect some adjacent white cells, covering a number of gaps
  linkWhiteBlocks(12);   // ← 可调连接次数 | adjustable number of connections

  // 8) 按宽高比例，在白块内部加入大色块
  // 8) Add big colored blocks inside each white cell depending on aspect ratio
  addBigBlocksInWhiteAspect({ 
    prob: 0.55, 
    minFrac: 0.35, 
    maxFrac: 0.85, 
    aspectThresh: 1.15 
  });

  // 9) 在这些大方块内部，按“相反规则”再生成第二层方块
  // 9) Inside these big blocks, generate a second layer with the opposite rule
  //    （原来是等高条 → 现在等宽条；原来等宽条 → 现在等高条）
  //    (if first block was equal-height, second is equal-width, and vice versa)
  overlayInsideBigBlocks({ 
    prob: 0.20,        // 大约 20% 的大方块再生成一次 | ~20% chance of overlay per big block
    minFrac: 0.35, 
    maxFrac: 0.85 
  });
}


/* 在黄色间隙里放“正方形”彩块：
   - 竖缝：方块边长 = 缝宽 w，沿 Y 方向随机间隔排列
   - 横缝：方块边长 = 缝高 h，沿 X 方向随机间隔排列

   Place square colored blocks in yellow gaps:
   - Vertical gaps: square size = gap width w, scattered along Y with random spacing
   - Horizontal gaps: square size = gap height h, scattered along X with random spacing
*/
function sprinkleColorInGaps(){
  const COLORS = ['#c63b2d', '#2a59b6', '#bfbfbf']; // 红 / 蓝 / 灰 | red / blue / grey

  // 方块之间的黄色间隔范围（沿缝方向的间距）
  // Range of yellow spacing between blocks (along the gap direction)
  const V_GAP_MIN = 8,  V_GAP_MAX = 28;  // 竖缝：方块之间的垂直空段 | vertical gaps: vertical spacing
  const H_GAP_MIN = 8,  H_GAP_MAX = 28;  // 横缝：方块之间的水平空段 | horizontal gaps: horizontal spacing

  noStroke();

  // —— 竖向缝（列与列之间）：方块边长 = 缝宽 w ——
  // —— Vertical gaps (between columns): block side length = gap width w ——
  for (let c = 0; c < COLS - 1; c++) {
    const x0 = xs[c] + colW[c]; // 竖缝左侧 x 坐标 | x position of vertical gap
    const w  = gapX[c];         // 竖缝宽度 | gap width
    const s  = w;               // 正方形边长 = w | square side = gap width
    let y = 0;

    // 沿 Y 方向逐段放置，直到超出画布底部
    // Place blocks along Y until beyond bottom of canvas
    while (y + s <= H) {
      // 随机决定是否放一个方块，使其更稀疏
      // Decide randomly whether to place a block to keep it sparse
      if (random() < 0.65) {
        fill(random(COLORS));
        rect(x0, y, s, s);      // 宽=高=s，严格正方形 | Width=height=s => perfect square
      }
      // 方块后面再留一点黄色缝隙
      // After a block, leave a random yellow gap
      y += s + random(V_GAP_MIN, V_GAP_MAX);
    }
  }

  // —— 横向缝（行与行之间）：方块边长 = 缝高 h ——
  // —— Horizontal gaps (between rows): block side length = gap height h ——
  for (let r = 0; r < ROWS - 1; r++) {
    const y0 = ys[r] + rowH[r]; // 横缝的 y 坐标 | y position of horizontal gap
    const h  = gapY[r];         // 横缝高度 | gap height
    const s  = h;               // 正方形边长 = h | square side = gap height
    let x = 0;

    // 沿 X 方向逐段放置，直到超出画布右侧
    // Place blocks along X until beyond right edge
    while (x + s <= W) {
      if (random() < 0.65) {
        fill(random(COLORS));
        rect(x, y0, s, s);      // 宽=高=s，严格正方形 | Width=height=s => perfect square
      }
      x += s + random(H_GAP_MIN, H_GAP_MAX);
    }
  }
}


/* ---------- 工具：位置权重/分配 ---------- */
/* ---------- Utility: position weights / distribution ---------- */

// 根据索引（靠中间或两侧）生成一组权重，用于让“中间更宽或更高”
// Generate weights based on index (near center or edges) to bias sizes
function positionWeights(n, power){
  const arr = new Array(n);
  const mid = (n - 1) / 2;

  for(let i = 0; i < n; i++){
    // t 从 0（两侧）到 1（中间）
    // t goes from 0 at edges to 1 at center
    const t = 1 - Math.abs((i - mid) / mid);
    // 权重 = t^power，外加 0.05 防止为 0
    // Weight = t^power (plus small constant to avoid 0)
    arr[i] = Math.pow(t, power) + 0.05;
  }
  return arr;
}

// 按给定总量 total，把 n 个值随机分配到 out[] 中，同时控制最小/最大值与随机幅度、位置权重
// Randomly distribute 'total' into n values in 'out[]' with min/max constraints and optional positional bias
function randomizeWithBias(out, n, total, minV, maxV, spread, posW){
  const base = n * minV;                 // 每个至少 minV，总基数 | base amount (min per item)
  const rest = max(0, total - base);     // 剩余可分配部分 | remaining amount to distribute

  let w = new Array(n), sw = 0;
  for(let i = 0; i < n; i++){
    // random()^spread 控制大小差异，spread 越大→区别越大
    // random()^spread controls variance; larger spread → more difference
    const r = Math.pow(random(), spread);
    w[i] = (posW ? posW[i] : 1) * r; // 乘以位置权重 | multiply by positional weight
    sw += w[i];
  }

  // 如果总权重太小，退化成平均 1
  // If total weight is invalid, fallback to uniform 1
  if (sw <= 0){ 
    w.fill(1); 
    sw = n; 
  }

  // 先把剩余的 rest 按权重分配，再加上最小值 base
  // Distribute 'rest' proportional to weights, then add minV
  for(let i = 0; i < n; i++){
    out[i] = minV + (w[i] / sw) * rest;
    // 夹在 [minV, maxV] 之间 | clamp to [minV, maxV]
    if (maxV > minV) out[i] = constrain(out[i], minV, maxV);
  }

  // 再整体缩放一次，使总和精确等于 total
  // Rescale so the sum is exactly equal to 'total'
  const s = out.reduce((a,b)=>a+b, 0);
  const k = total / s;
  for(let i = 0; i < n; i++) out[i] *= k;
}

// 简化版：没有位置权重的分配函数（当前没用到，但保留以备扩展）
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


// 把随机“相邻两块”的间隙改成白色（横向/纵向都可能），形成一些连通的大白块
// Randomly fill some gaps between adjacent cells with white, horizontally or vertically, to form larger white shapes
function linkWhiteBlocks(count = 8){
  noStroke();
  fill('#ffffff');

  for (let k = 0; k < count; k++){
    if (random() < 0.5) {
      // —— 横向连接：同一行，打掉列 c 与 c+1 之间的竖缝 ——
      // —— Horizontal link: in the same row, cover the vertical gap between col c and c+1 ——
      const r = int(random(0, ROWS));      // 行号 | row index
      const c = int(random(0, COLS-1));    // 竖缝索引 | vertical gap index
      const x0 = xs[c] + colW[c];          // 竖缝的 x | x of gap
      const y0 = ys[r];                    // 对应行的顶部 y | top of this row
      const w  = gapX[c];                  // 竖缝宽度 | gap width
      const h  = rowH[r];                  // 该行白块高度 | height of cell
      rect(x0, y0, w, h);                  // 用白色把缝盖掉 | cover the gap with white
    } else {
      // —— 纵向连接：同一列，打掉行 r 与 r+1 之间的横缝 ——
      // —— Vertical link: in the same column, cover the horizontal gap between row r and r+1 ——
      const c = int(random(0, COLS));      // 列号 | column index
      const r = int(random(0, ROWS-1));    // 横缝索引 | horizontal gap index
      const x0 = xs[c];                    // 该列左侧 x | left of column
      const y0 = ys[r] + rowH[r];          // 横缝的 y | y of gap
      const w  = colW[c];                  // 该列白块宽度 | width of cell
      const h  = gapY[r];                  // 横缝高度 | gap height
      rect(x0, y0, w, h);                  // 用白色把缝盖掉 | cover the gap with white
    }
  }
}

// 在每个白色方块内：若“更宽”→放等高条；若“更高”→放等宽条
// For each white cell: if it's wider, place an equal-height strip; if it's taller, place an equal-width strip
function addBigBlocksInWhiteAspect(opts){
  const COLORS = ['#c63b2d', '#2a59b6', '#f2d31b']; // 红/蓝/黄 | red/blue/yellow
  const PROB   = (opts && opts.prob)         ?? 0.55;   // 每个白块放大块的概率 | probability to place a big block in a cell
  const MINF   = (opts && opts.minFrac)      ?? 0.35;   // 尺寸下限（相对白块宽/高）| min fraction of cell size
  const MAXF   = (opts && opts.maxFrac)      ?? 0.85;   // 尺寸上限 | max fraction of cell size
  const THR    = (opts && opts.aspectThresh) ?? 1.15;   // 宽高比阈值 | aspect ratio threshold

  noStroke();
  bigBlocks = []; // 重新生成前清空记录 | clear the list before generating

  for (let r = 0; r < ROWS; r++){
    for (let c = 0; c < COLS; c++){
      if (random() > PROB) continue;  // 按概率跳过 | skip based on probability

      const x = xs[c], y = ys[r];
      const w = colW[c], h = rowH[r];
      const ratioW = w / h; // 宽高比 | width/height
      const ratioH = h / w; // 高宽比 | height/width

      const color = random(COLORS);
      fill(color);

      if (ratioW >= THR) {
        // 更宽：放“等高条”（高度 = h，宽度在 [MINF*w, MAXF*w] 内随机）  
        // Wider cell: place an equal-height strip (height=h, random width in [MINF*w, MAXF*w])
        const ww = random(MINF * w, MAXF * w);
        const xx = x + random(0, w - ww);   // 在 cell 内水平随机偏移 | random horizontal offset inside cell
        rect(xx, y, ww, h);
        bigBlocks.push({ x: xx, y, w: ww, h, color, mode: 'equalHeight' });

      } else if (ratioH >= THR) {
        // 更高：放“等宽条”（宽度 = w，高度在 [MINF*h, MAXF*h] 内随机）  
        // Taller cell: place an equal-width strip (width=w, random height in [MINF*h, MAXF*h])
        const hh = random(MINF * h, MAXF * h);
        const yy = y + random(0, h - hh);   // 在 cell 内垂直随机偏移 | random vertical offset inside cell
        rect(x, yy, w, hh);
        bigBlocks.push({ x, y: yy, w, h: hh, color, mode: 'equalWidth' });

      } else {
        // 近似正方形：随机选择等高或等宽的方式
        // Near-square cell: randomly choose between equal-height and equal-width
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

// 在彩色大方块内部，按“相反规则”生成二次方块：
// 首次 equalHeight → 二次 equalWidth；首次 equalWidth → 二次 equalHeight
// Inside each colored big block, generate a second block with the opposite rule:
// first equalHeight → second equalWidth; first equalWidth → second equalHeight
function overlayInsideBigBlocks(opts){
  const COLORS = ['#c63b2d', '#2a59b6', '#f2d31b']; // 红/蓝/黄 | red/blue/yellow
  const MINF   = (opts && opts.minFrac)  ?? 0.35;
  const MAXF   = (opts && opts.maxFrac)  ?? 0.85;
  const PROB2  = (opts && opts.prob)     ?? 0.55;      // 二次方块出现的概率 | probability for overlay blocks
  const MAXN   = (opts && opts.maxCount) ?? Infinity;  // 最多生成的二次方块数量 | overall maximum overlay count

  noStroke();
  let made = 0;

  for (const b of bigBlocks){
    if (made >= MAXN) break;       // 达到总数上限就停止 | stop if we reached max overlay count
    if (random() > PROB2) continue; // 按概率跳过 | skip block based on probability

    // 二次方块颜色必须与原块不同
    // Overlay block color must differ from the original block
    const altChoices = COLORS.filter(c => c !== b.color);
    const alt = random(altChoices);
    fill(alt);

    if (b.mode === 'equalHeight'){
      // 首次为等高条 → 二次改为等宽条（宽固定，随机高度）
      // First was equal-height → now equal-width (width fixed, random height)
      const hh = random(MINF * b.h, MAXF * b.h);
      const yy = b.y + random(0, b.h - hh);  // 在原块内部随机位置 | random vertical position inside original
      rect(b.x, yy, b.w, hh);
    } else { // b.mode === 'equalWidth'
      // 首次为等宽条 → 二次改为等高条（高固定，随机宽度）
      // First was equal-width → now equal-height (height fixed, random width)
      const ww = random(MINF * b.w, MAXF * b.w);
      const xx = b.x + random(0, b.w - ww);  // 在原块内部随机位置 | random horizontal position inside original
      rect(xx, b.y, ww, b.h);
    }

    made++;
  }
}

/* ⭐⭐ 动画部分：Perlin Noise + Randomness ⭐⭐ */

// 使用 Perlin noise + random() 对 bigBlocks 做动画
// - Perlin noise：让缩放 & 位移平滑变化（呼吸感）
// - random()：让颜色偶尔随机闪一下，体现“随机性”
function animateBigBlocks(t) {
  if (!bigBlocks || bigBlocks.length === 0) return;

  noStroke();

  for (const b of bigBlocks) {
    // ---- 1. Perlin Noise 控制“呼吸缩放” + “柔和抖动” ----
    const nScale = noise(b.x * 0.01, b.y * 0.01, t);
    const pulse  = map(nScale, 0, 1, 0.9, 1.2);         // 缩放因子 0.9 ~ 1.2

    const jx = (noise(b.x * 0.02, t)      - 0.5) * 4.0; // 水平 ±2 像素抖动
    const jy = (noise(b.y * 0.02, t + 99) - 0.5) * 4.0; // 垂直 ±2 像素抖动

    // ---- 2. Randomness 控制“随机闪烁” ----
    let c = b.color;
    if (random() < 0.01) {          // 1% 概率闪成白色
      c = '#ffffff';
    }

    // 以原方块中心为基准缩放 & 抖动
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const w  = b.w * pulse;
    const h  = b.h * pulse;

    fill(c);
    rect(cx - w/2 + jx, cy - h/2 + jy, w, h);
  }
}
