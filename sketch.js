const W = 900, H = 900;
const COLS = 10, ROWS = 10;

// —— 基础间距与“微小抖动幅度” ——
// 例如基础 10px，每条缝各自 ±2px 的细微差别
const GAP_X_BASE = 15, GAP_Y_BASE = 15;
const GAP_X_DELTA = 3,  GAP_Y_DELTA = 3;

// 白方块尺寸范围（列宽/行高）
const COL_MIN = 20,  COL_MAX = 280;
const ROW_MIN = 40,  ROW_MAX = 140;

// 列宽分布（可选：让“中间稍宽、两侧偏窄”更好看）
const CENTER_POWER = 2.2; // 越大→中间越宽、两侧越窄
const COL_SPREAD   = 2.0; // 越大→差距越大；1=普通随机

// 行高分布（新增：让“中间更高、两侧更矮”）
const ROW_CENTER_POWER = 2.0; // 越大→中间越高、两侧越低
const ROW_SPREAD       = 1.5; // 越大→差距越大；1=普通随机

let colW = [], rowH = [];
let gapX = [], gapY = [];  // 变动后的间距
let xs = [], ys = [];      // 每列/每行的起点坐标（无外边距）
let bigBlocks = []; // 记录刚刚生成的彩色大方块（供二次方块用）


function setup(){
  createCanvas(W, H);
  noLoop();
  drawScene();
}
function keyPressed(){ if(key==='r'||key==='R') drawScene(); }

function drawScene(){
  background('#f2d31b'); // 黄底

  // 1) 为每条“列缝/行缝”生成微小不同的间距
  gapX = new Array(COLS-1).fill(0).map(()=> GAP_X_BASE + random(-GAP_X_DELTA, GAP_X_DELTA));
  gapY = new Array(ROWS-1).fill(0).map(()=> GAP_Y_BASE + random(-GAP_Y_DELTA, GAP_Y_DELTA));

  const sumGapX = gapX.reduce((a,b)=>a+b, 0);
  const sumGapY = gapY.reduce((a,b)=>a+b, 0);

  // 2) 可用于白块的总宽/高（无外边距）
  const availW = W - sumGapX;
  const availH = H - sumGapY;

  // 3) 列宽/行高的随机分配（总和严格 = 可用尺寸）
  const posW = positionWeights(COLS, CENTER_POWER);     // 中间更宽的权重（可关）
  randomizeWithBias(colW, COLS, availW, COL_MIN, COL_MAX, COL_SPREAD, posW);
  const posR = positionWeights(ROWS, ROW_CENTER_POWER); // 中间权重更大
  randomizeWithBias(rowH, ROWS, availH, ROW_MIN, ROW_MAX, ROW_SPREAD, posR);


  // 4) 计算每列/每行的起点（从 0 开始→直到正好贴边）
  xs = new Array(COLS); ys = new Array(ROWS);
  let x = 0; for (let c=0; c<COLS; c++){ xs[c] = x; x += colW[c] + (c< COLS-1 ? gapX[c] : 0); }
  let y = 0; for (let r=0; r<ROWS; r++){ ys[r] = y; y += rowH[r] + (r< ROWS-1 ? gapY[r] : 0); }

  // 5) 画 10×10 白色方块
  noStroke(); fill('#ffffff');
  for (let r=0; r<ROWS; r++){
    for (let c=0; c<COLS; c++){
      rect(xs[c], ys[r], colW[c], rowH[r]);
    }
  }


  // 5) 画 10×10 白色方块（原样）
  noStroke(); fill('#ffffff');
  for (let r = 0; r < ROWS; r++){
    for (let c = 0; c < COLS; c++){
      rect(xs[c], ys[r], colW[c], rowH[r]);
    }
  }

  // 6) 在黄色缝里撒红/蓝/灰（原样）
  sprinkleColorInGaps();

  // 7) 最后再“连白”，把缝盖成白色 —— 会盖住彩色块
  linkWhiteBlocks(12);   // ← 挪到这里（数量自定）

  // 按宽/高判定加入大块
  addBigBlocksInWhiteAspect({ prob: 0.55, minFrac: 0.35, maxFrac: 0.85, aspectThresh: 1.15 });


  // 再在这些大方块内部，放第二层（颜色不同；若原块蓝→只用红/黄）
  overlayInsideBigBlocks({ prob: 0.20, minFrac: 0.35, maxFrac: 0.85 });
  // ↑ 0.40 表示大约 40% 的大方块会再生成一次

}

/* 在黄色间隙里随机放红/蓝/灰块：
   - 竖缝：块宽 = 缝宽 (gapX[c])，沿 Y 方向随机长度；中间留黄段
   - 横缝：块高 = 缝高 (gapY[r])，沿 X 方向随机长度；中间留黄段
*/
/* 在黄色间隙里放“正方形”彩块：
   - 竖缝：方块边长 = 缝宽 w，沿 Y 方向随机间隔排列
   - 横缝：方块边长 = 缝高 h，沿 X 方向随机间隔排列
*/
function sprinkleColorInGaps(){
  const COLORS = ['#c63b2d', '#2a59b6', '#bfbfbf'];

  // 方块之间的黄色间隔范围（沿缝方向的间距）
  const V_GAP_MIN = 8,  V_GAP_MAX = 28;  // 竖缝：方块之间的垂直空段
  const H_GAP_MIN = 8,  H_GAP_MAX = 28;  // 横缝：方块之间的水平空段

  noStroke();

  // —— 竖向缝（列与列之间）：方块边长 = 缝宽 w ——
  for (let c = 0; c < COLS - 1; c++) {
    const x0 = xs[c] + colW[c];
    const w  = gapX[c];               // 竖缝宽度
    const s  = w;                      // 正方形边长 = w
    let y = 0;

    while (y + s <= H) {               // 不越界
      // 随机决定是否放一个方块（稀疏一点）
      if (random() < 0.65) {
        fill(random(COLORS));
        rect(x0, y, s, s);             // 宽=高=s，严格正方形
      }
      y += s + random(V_GAP_MIN, V_GAP_MAX); // 方块后留一点黄色间隔
    }
  }

  // —— 横向缝（行与行之间）：方块边长 = 缝高 h ——
  for (let r = 0; r < ROWS - 1; r++) {
    const y0 = ys[r] + rowH[r];
    const h  = gapY[r];               // 横缝高度
    const s  = h;                      // 正方形边长 = h
    let x = 0;

    while (x + s <= W) {
      if (random() < 0.65) {
        fill(random(COLORS));
        rect(x, y0, s, s);             // 宽=高=s，严格正方形
      }
      x += s + random(H_GAP_MIN, H_GAP_MAX);
    }
  }
}



/* ---------- 工具：位置权重/分配 ---------- */
function positionWeights(n, power){
  const arr = new Array(n);
  const mid = (n-1)/2;
  for(let i=0;i<n;i++){
    const t = 1 - Math.abs((i - mid) / mid); // 边0→中1
    arr[i] = Math.pow(t, power) + 0.05;      // 防 0
  }
  return arr;
}
function randomizeWithBias(out, n, total, minV, maxV, spread, posW){
  const base = n * minV;
  const rest = max(0, total - base);
  let w = new Array(n), sw = 0;
  for(let i=0;i<n;i++){ const r=Math.pow(random(),spread); w[i]=(posW?posW[i]:1)*r; sw+=w[i]; }
  if(sw<=0){ w.fill(1); sw=n; }
  for(let i=0;i<n;i++){
    out[i] = minV + (w[i]/sw)*rest;
    if(maxV>minV) out[i] = constrain(out[i], minV, maxV);
  }
  const s = out.reduce((a,b)=>a+b,0), k = total/s;
  for(let i=0;i<n;i++) out[i]*=k;
}
function randomizeWithSpread(out, n, total, minV, maxV, spread){
  const base = n * minV;
  const rest = max(0, total - base);
  let w=new Array(n), sw=0;
  for(let i=0;i<n;i++){ w[i]=Math.pow(random(),spread); sw+=w[i]; }
  if(sw<=0){ w.fill(1); sw=n; }
  for(let i=0;i<n;i++){
    out[i] = minV + (w[i]/sw)*rest;
    if(maxV>minV) out[i] = constrain(out[i], minV, maxV);
  }
  const s = out.reduce((a,b)=>a+b,0), k = total/s;
  for(let i=0;i<n;i++) out[i]*=k;
}


// 把随机“相邻两块”的间隙改成白色（横向/纵向都可能）
function linkWhiteBlocks(count = 8){
  noStroke();
  fill('#ffffff');

  for (let k = 0; k < count; k++){
    if (random() < 0.5) {
      // —— 横向连接：同一行，打掉列 c 与 c+1 之间的竖缝 ——
      const r = int(random(0, ROWS));      // 行号
      const c = int(random(0, COLS-1));    // 竖缝索引
      const x0 = xs[c] + colW[c];          // 竖缝的 x
      const y0 = ys[r];                    // 该行顶部
      const w  = gapX[c];                  // 竖缝宽度
      const h  = rowH[r];                  // 该行白块高度
      rect(x0, y0, w, h);                  // 用白色把缝盖掉
    } else {
      // —— 纵向连接：同一列，打掉行 r 与 r+1 之间的横缝 ——
      const c = int(random(0, COLS));      // 列号
      const r = int(random(0, ROWS-1));    // 横缝索引
      const x0 = xs[c];                    // 该列左侧
      const y0 = ys[r] + rowH[r];          // 横缝的 y
      const w  = colW[c];                  // 该列白块宽度
      const h  = gapY[r];                  // 横缝高度
      rect(x0, y0, w, h);                  // 用白色把缝盖掉
    }
  }
}

// 在每个白色方块内：若“更宽”→放等高条；若“更高”→放等宽条
function addBigBlocksInWhiteAspect(opts){
  const COLORS = ['#c63b2d', '#2a59b6', '#f2d31b']; // 红/蓝/黄
  const PROB   = (opts && opts.prob)        ?? 0.55;   // 每个白块落一个大块的概率
  const MINF   = (opts && opts.minFrac)     ?? 0.35;   // 尺寸下限（相对白块宽/高）
  const MAXF   = (opts && opts.maxFrac)     ?? 0.85;   // 尺寸上限
  const THR    = (opts && opts.aspectThresh)?? 1.15;   // 宽高判定阈值

  noStroke();
  bigBlocks = []; // 重新生成时清空

  for (let r = 0; r < ROWS; r++){
    for (let c = 0; c < COLS; c++){
      if (random() > PROB) continue;

      const x = xs[c], y = ys[r];
      const w = colW[c], h = rowH[r];
      const ratioW = w / h;
      const ratioH = h / w;

      const color = random(COLORS);
      fill(color);

      if (ratioW >= THR) {
        // 更宽：等高条（高度 = h，宽度随机）
        const ww = random(MINF * w, MAXF * w);
        const xx = x + random(0, w - ww);
        rect(xx, y, ww, h);
        bigBlocks.push({ x: xx, y, w: ww, h, color, mode: 'equalHeight' });

      } else if (ratioH >= THR) {
        // 更高：等宽条（宽度 = w，高度随机）
        const hh = random(MINF * h, MAXF * h);
        const yy = y + random(0, h - hh);
        rect(x, yy, w, hh);
        bigBlocks.push({ x, y: yy, w, h: hh, color, mode: 'equalWidth' });

      } else {
        // 近似正方：两种方式随机其一
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
function overlayInsideBigBlocks(opts){
  const COLORS = ['#c63b2d', '#2a59b6', '#f2d31b']; // 红/蓝/黄
  const MINF   = (opts && opts.minFrac) ?? 0.35;
  const MAXF   = (opts && opts.maxFrac) ?? 0.85;
  const PROB2  = (opts && opts.prob)    ?? 0.55;      // 二次出现概率
  const MAXN   = (opts && opts.maxCount)?? Infinity;  // 二次方块最多数量（可选）

  noStroke();
  let made = 0;

  for (const b of bigBlocks){
    if (made >= MAXN) break;
    if (random() > PROB2) continue;

    // 颜色必须与原块不同（若原块是蓝，只会在红/黄里选）
    const altChoices = COLORS.filter(c => c !== b.color);
    const alt = random(altChoices);
    fill(alt);

    if (b.mode === 'equalHeight'){
      // 首次等高 → 二次改为等宽（宽固定 = b.w，高度随机，且完全落在 b 内）
      const hh = random(MINF * b.h, MAXF * b.h);
      const yy = b.y + random(0, b.h - hh);
      rect(b.x, yy, b.w, hh);
    } else { // b.mode === 'equalWidth'
      // 首次等宽 → 二次改为等高（高固定 = b.h，宽度随机，且完全落在 b 内）
      const ww = random(MINF * b.w, MAXF * b.w);
      const xx = b.x + random(0, b.w - ww);
      rect(xx, b.y, ww, b.h);
    }

    made++;
  }
}

