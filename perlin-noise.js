
//动画部分：Perlin Noise + Randomness

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