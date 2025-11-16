// ========== Audio-Driven Animation Module ==========
// 音频驱动动画模块 - IDEA9103 Individual Task
// Audio-Driven Animation Module - IDEA9103 Individual Task
//
// 功能说明 Features:
// 1. 音频振幅控制方块大小 (Audio amplitude controls square sizes)
// 2. 音频频率影响颜色饱和度/亮度 (Audio frequency affects color saturation/brightness)
// 3. 节拍检测触发视觉效果 (Beat detection triggers visual effects)
// 4. 实时音频可视化交互 (Real-time audio visualization interaction)

const W = 900, H = 900;
const COLS = 10, ROWS = 10;

// —— 基础间距与抖动 ——
// Base spacing and jitter
const GAP_X_BASE = 15, GAP_Y_BASE = 15;
const GAP_X_DELTA = 3,  GAP_Y_DELTA = 3;

// 白色方块尺寸范围
// White cell size range
const COL_MIN = 20,  COL_MAX = 280;
const ROW_MIN = 40,  ROW_MAX = 140;

// 列宽/行高分布参数
// Column/row distribution parameters
const CENTER_POWER = 2.2;
const COL_SPREAD   = 2.0;
const ROW_CENTER_POWER = 2.0;
const ROW_SPREAD       = 1.5;

// 几何数据
// Geometry data
let colW = [], rowH = [];
let gapX = [], gapY = [];
let xs = [], ys = [];
let bigBlocks = [];
let colorBlocks = [];
let connectors = [];

// 道路方块数据（用于音频驱动动画）
// Road squares data (for audio-driven animation)
let roadSquares = [];

// ========== 音频相关变量 Audio Variables ==========
let song;                    // 音频文件 Audio file
let fft;                     // FFT频谱分析器 FFT analyzer
let amplitude;               // 振幅分析器 Amplitude analyzer
let peakDetect;              // 节拍检测器 Beat detector

// 本地音频文件列表
// Local audio file list
// 说明：请将音乐文件放在 assets/ 文件夹中，命名为 music1.mp3, music2.mp3, music3.mp3
// Instructions: Place music files in assets/ folder, named as music1.mp3, music2.mp3, music3.mp3
const AUDIO_TRACKS = [
  {
    name: 'Track 1',
    url: 'assets/music1.mp3',
    description: '游戏音乐 1 | Game music 1'
  },
  {
    name: 'Track 2',
    url: 'assets/music2.mp3',
    description: '游戏音乐 2 | Game music 2'
  },
  {
    name: 'Track 3',
    url: 'assets/music3.mp3',
    description: '游戏音乐 3 | Game music 3'
  }
];

let currentTrackIndex = 0;   // 当前音轨索引 Current track index

// 音频状态
// Audio state
let audioStarted = false;    // 音频是否已开始 Audio started flag
let beatFlash = 0;           // 节拍闪光效果强度 Beat flash intensity
let audioLoading = false;    // 音频是否正在加载 Audio loading flag

// UI元素
// UI elements
let playButton;              // 播放/暂停按钮 Play/Pause button
let nextButton;              // 下一首按钮 Next track button
let volumeSlider;            // 音量滑块 Volume slider
let volumeLabel;             // 音量标签 Volume label
let statusLabel;             // 状态标签 Status label
let trackLabel;              // 音轨信息标签 Track info label

// 音频响应参数
// Audio response parameters
const AMPLITUDE_SCALE = 3.0;     // 振幅缩放系数 Amplitude scale factor
const FREQ_BANDS = 4;            // 频段数量 Number of frequency bands
const BEAT_THRESHOLD = 0.15;     // 节拍检测阈值 Beat detection threshold
const BEAT_DECAY = 0.92;         // 节拍效果衰减 Beat effect decay rate

// 频段颜色映射（用于音频可视化）
// Frequency band color mapping (for audio visualization)
const FREQ_COLORS = {
  bass: '#c63b2d',      // 低频 - 红色 Bass - Red
  mid: '#2a59b6',       // 中频 - 蓝色 Mid - Blue
  high: '#bfbfbf'       // 高频 - 灰色 High - Grey
};

// ========== p5.js 设置 Setup ==========
function setup(){
  const size = calcCanvasSize();
  createCanvas(size, size);
  
  // 初始化音频分析器
  // Initialize audio analyzers
  fft = new p5.FFT(0.8, 256);      // 平滑度0.8，256个频段 Smoothness 0.8, 256 bins
  amplitude = new p5.Amplitude();
  peakDetect = new p5.PeakDetect(20, 250, BEAT_THRESHOLD); // 低频节拍检测 Low freq beat detection
  
  // 创建UI控件
  // Create UI controls
  createAudioControls();
  
  // 生成布局
  // Generate layout
  createNewLayout();
  
  noLoop(); // 暂停循环，等待用户交互 Pause loop, wait for user interaction
}

// ========== 计算画布尺寸 Calculate Canvas Size ==========
function calcCanvasSize(){
  let maxSize = 900;
  let size = min(windowWidth - 40, windowHeight - 180, maxSize);
  size = max(size, 300);
  return size;
}

// ========== 窗口尺寸调整 Window Resized ==========
function windowResized(){
  const size = calcCanvasSize();
  resizeCanvas(size, size);
  updateControlPositions();
}

// ========== 创建音频控件 Create Audio Controls ==========
function createAudioControls(){
  const y = height + 20;
  
  // 播放/暂停按钮
  // Play/Pause button
  playButton = createButton('▶️ Play Music');
  playButton.position(20, y);
  playButton.mousePressed(toggleAudio);
  playButton.style('padding', '8px 16px');
  playButton.style('font-size', '14px');
  playButton.style('cursor', 'pointer');
  playButton.style('background-color', '#4CAF50');
  playButton.style('color', 'white');
  playButton.style('border', 'none');
  playButton.style('border-radius', '4px');
  
  // 下一首按钮
  // Next track button
  nextButton = createButton('⏭️ Next Track');
  nextButton.position(150, y);
  nextButton.mousePressed(loadNextTrack);
  nextButton.style('padding', '8px 16px');
  nextButton.style('font-size', '14px');
  nextButton.style('cursor', 'pointer');
  nextButton.style('background-color', '#2196F3');
  nextButton.style('color', 'white');
  nextButton.style('border', 'none');
  nextButton.style('border-radius', '4px');
  
  // 音量控制标签
  // Volume control label
  volumeLabel = createSpan('Volume');
  volumeLabel.position(300, y + 3);
  volumeLabel.style('font-size', '12px');
  volumeLabel.style('font-family', 'sans-serif');
  
  // 音量滑块
  // Volume slider
  volumeSlider = createSlider(0, 100, 50);
  volumeSlider.position(360, y);
  volumeSlider.style('width', '100px');
  
  // 音轨信息标签
  // Track info label
  trackLabel = createDiv('');
  trackLabel.position(20, y + 40);
  trackLabel.style('font-size', '12px');
  trackLabel.style('font-family', 'sans-serif');
  trackLabel.style('color', '#333');
  
  // 状态显示标签
  // Status label
  statusLabel = createSpan('Press Play to start | 按播放键开始 (R: reset)');
  statusLabel.position(480, y + 3);
  statusLabel.style('font-size', '13px');
  statusLabel.style('font-family', 'sans-serif');
  statusLabel.style('color', '#666');
  
  // 自动加载第一首音乐
  // Auto-load first track
  loadTrack(currentTrackIndex);
}

// ========== 更新控件位置 Update Control Positions ==========
function updateControlPositions(){
  const y = height + 20;
  if (playButton) playButton.position(20, y);
  if (nextButton) nextButton.position(150, y);
  if (volumeLabel) volumeLabel.position(300, y + 3);
  if (volumeSlider) volumeSlider.position(360, y);
  if (trackLabel) trackLabel.position(20, y + 40);
  if (statusLabel) statusLabel.position(480, y + 3);
}

// ========== 加载音轨 Load Track ==========
function loadTrack(index){
  if (audioLoading) return; // 防止重复加载 Prevent duplicate loading
  
  audioLoading = true;
  const track = AUDIO_TRACKS[index];
  
  statusLabel.html('Loading music... | 加载音乐中...');
  playButton.html('⏳ Loading...');
  
  // 停止并移除旧音频
  // Stop and remove old audio
  if (song) {
    if (song.isPlaying()) {
      song.stop();
    }
    song.disconnect();
  }
  
  // 加载新音频
  // Load new audio
  loadSound(track.url,
    // 加载成功回调
    // Success callback
    (loadedSound) => {
      song = loadedSound;
      
      // 连接音频分析器（使用正确的p5.sound方式）
      // Connect audio analyzers (correct p5.sound way)
      fft.setInput(song);
      amplitude.setInput(song);
      // peakDetect 不需要 setInput，它通过 update(fft) 来分析
      // peakDetect doesn't need setInput, it analyzes through update(fft)
      
      // 设置音量
      // Set volume
      song.setVolume(volumeSlider.value() / 100);
      
      // 设置循环播放
      // Set loop
      song.loop();
      
      // 更新UI
      // Update UI
      playButton.html('▶️ Play Music');
      statusLabel.html('Music loaded! Press Play | 音乐已加载！按播放键');
      trackLabel.html(`🎵 Track ${index + 1}/${AUDIO_TRACKS.length}: ${track.name}<br><small>${track.description}</small>`);
      
      audioLoading = false;
    },
    // 加载失败回调
    // Error callback
    (err) => {
      statusLabel.html('Failed to load music | 加载失败，请重试');
      playButton.html('▶️ Play Music');
      console.error('Audio load error:', err);
      audioLoading = false;
      
      // 尝试加载下一首
      // Try loading next track
      setTimeout(() => {
        loadNextTrack();
      }, 2000);
    }
  );
}

// ========== 加载下一首音轨 Load Next Track ==========
function loadNextTrack(){
  if (audioLoading) return;
  
  // 停止当前播放
  // Stop current playback
  if (song && song.isPlaying()) {
    song.stop();
    audioStarted = false;
    noLoop();
  }
  
  // 切换到下一首
  // Switch to next track
  currentTrackIndex = (currentTrackIndex + 1) % AUDIO_TRACKS.length;
  loadTrack(currentTrackIndex);
}

// ========== 音频播放控制 Audio Play Control ==========
function toggleAudio(){
  if (!song || audioLoading) {
    statusLabel.html('Please wait for music to load | 请等待音乐加载');
    return;
  }
  
  userStartAudio(); // 激活p5.js音频上下文 Activate p5.js audio context
  
  if (song.isPlaying()) {
    // 暂停
    // Pause
    song.pause();
    noLoop();
    playButton.html('▶️ Play Music');
    playButton.style('background-color', '#4CAF50');
    statusLabel.html('Paused | 已暂停 (Space: play, R: reset)');
    audioStarted = false;
  } else {
    // 播放
    // Play
    song.play();
    loop();
    playButton.html('⏸️ Pause Music');
    playButton.style('background-color', '#FF5722');
    statusLabel.html('🎵 Playing - Audio driving animation | 播放中 - 音频驱动动画');
    audioStarted = true;
  }
}

// ========== 主绘制循环 Main Draw Loop ==========
function draw(){
  background('#f2d31b');
  
  // 更新音量
  // Update volume
  if (song && audioStarted) {
    song.setVolume(volumeSlider.value() / 100);
  }
  
  // 缩放到当前画布大小
  // Scale to current canvas size
  push();
  const s = width / W;
  scale(s);
  
  // 绘制基础网格
  // Draw base grid
  drawWhiteGrid();
  
  // 如果音频正在播放，更新音频驱动的动画
  // If audio is playing, update audio-driven animation
  if (audioStarted && song && song.isPlaying()) {
    updateAudioDrivenAnimation();
  }
  
  // 绘制场景元素
  // Draw scene elements
  drawRoadSquares();
  drawConnectors();
  drawColorBlocks();
  
  pop();
}

// ========== 音频驱动动画更新 Audio-Driven Animation Update ==========
function updateAudioDrivenAnimation(){
  // 获取音频数据
  // Get audio data
  let level = amplitude.getLevel();           // 整体振幅 0-1 Overall amplitude
  let spectrum = fft.analyze();                // 频谱数组 Spectrum array
  peakDetect.update(fft);                      // 更新节拍检测 Update beat detection
  
  // 节拍检测 - 触发闪光效果
  // Beat detection - trigger flash effect
  if (peakDetect.isDetected) {
    beatFlash = 1.0;
  } else {
    beatFlash *= BEAT_DECAY; // 衰减效果 Decay effect
  }
  
  // 计算频段能量
  // Calculate frequency band energy
  let bass = fft.getEnergy("bass");      // 低频 60-250Hz
  let mid = fft.getEnergy("mid");        // 中频 400-2600Hz
  let treble = fft.getEnergy("treble");  // 高频 5200-14000Hz
  
  // 归一化频段能量 (0-255 → 0-1)
  // Normalize frequency band energy (0-255 → 0-1)
  bass = map(bass, 0, 255, 0, 1);
  mid = map(mid, 0, 255, 0, 1);
  treble = map(treble, 0, 255, 0, 1);
  
  // 更新道路方块
  // Update road squares
  for (let sq of roadSquares) {
    // 根据颜色和频段调整方块大小
    // Adjust square size based on color and frequency band
    let energyFactor = 1.0;
    
    if (sq.color === '#c63b2d') {
      // 红色方块响应低频（贝斯）
      // Red squares respond to bass
      energyFactor = 1 + bass * AMPLITUDE_SCALE;
    } else if (sq.color === '#2a59b6') {
      // 蓝色方块响应中频
      // Blue squares respond to mid
      energyFactor = 1 + mid * AMPLITUDE_SCALE;
    } else if (sq.color === '#bfbfbf') {
      // 灰色方块响应高频
      // Grey squares respond to treble
      energyFactor = 1 + treble * AMPLITUDE_SCALE;
    }
    
    // 更新方块大小（带音频响应）
    // Update square size (with audio response)
    sq.currentSize = sq.baseSize * energyFactor;
    
    // 节拍时增加额外的脉冲效果
    // Add extra pulse on beat
    if (beatFlash > 0.5) {
      sq.currentSize *= (1 + beatFlash * 0.3);
    }
    
    // 方块移动（基于原始速度）
    // Square movement (based on original speed)
    const moveSpeed = 0.8; // 固定移动速度 Fixed movement speed
    
    if (sq.type === 'v') {
      // 竖向道路
      // Vertical road
      sq.y += sq.speed * moveSpeed;
      if (sq.y > H) sq.y = -sq.currentSize;
      if (sq.y < -sq.currentSize) sq.y = H;
    } else {
      // 横向道路
      // Horizontal road
      sq.x += sq.speed * moveSpeed;
      if (sq.x > W) sq.x = -sq.currentSize;
      if (sq.x < -sq.currentSize) sq.x = W;
    }
  }
  
  // 更新彩色大方块的颜色亮度（节拍响应）
  // Update big block color brightness (beat response)
  if (beatFlash > 0.3) {
    for (let block of colorBlocks) {
      // 在节拍时增加颜色亮度
      // Increase color brightness on beat
      block.brightnessFactor = 1 + beatFlash * 0.2;
    }
  } else {
    for (let block of colorBlocks) {
      block.brightnessFactor = 1.0;
    }
  }
}

// ========== 绘制白色网格 Draw White Grid ==========
function drawWhiteGrid(){
  noStroke();
  fill('#ffffff');
  
  // 绘制两层白色网格
  // Draw two layers of white grid
  for (let layer = 0; layer < 2; layer++) {
    for (let r = 0; r < ROWS; r++){
      for (let c = 0; c < COLS; c++){
        rect(xs[c], ys[r], colW[c], rowH[r]);
      }
    }
  }
}

// ========== 绘制道路方块 Draw Road Squares ==========
function drawRoadSquares(){
  noStroke();
  
  for (let sq of roadSquares) {
    // 使用当前大小（音频驱动）
    // Use current size (audio-driven)
    const size = sq.currentSize || sq.baseSize;
    
    // 计算居中位置
    // Calculate centered position
    const offset = (sq.baseSize - size) / 2;
    
    // 颜色亮度调整（节拍响应）
    // Color brightness adjustment (beat response)
    let col = color(sq.color);
    if (beatFlash > 0.3) {
      const brighten = map(beatFlash, 0, 1, 0, 40);
      col = color(
        red(col) + brighten,
        green(col) + brighten,
        blue(col) + brighten
      );
    }
    
    fill(col);
    rect(sq.x + offset, sq.y + offset, size, size);
  }
}

// ========== 绘制连接块 Draw Connectors ==========
function drawConnectors(){
  noStroke();
  fill('#ffffff');
  
  for (let conn of connectors) {
    rect(conn.x, conn.y, conn.w, conn.h);
  }
}

// ========== 绘制彩色大方块 Draw Color Blocks ==========
function drawColorBlocks(){
  noStroke();
  
  for (let block of colorBlocks) {
    let col = color(block.color);
    
    // 应用亮度因子（节拍响应）
    // Apply brightness factor (beat response)
    if (block.brightnessFactor && block.brightnessFactor > 1) {
      const brighten = (block.brightnessFactor - 1) * 50;
      col = color(
        red(col) + brighten,
        green(col) + brighten,
        blue(col) + brighten
      );
    }
    
    fill(col);
    rect(block.x, block.y, block.w, block.h);
  }
}

// ========== 键盘控制 Keyboard Control ==========
function keyPressed(){
  if (key === 'r' || key === 'R'){
    // 重新生成布局
    // Regenerate layout
    createNewLayout();
    redraw();
  } else if (key === ' '){
    // 空格键：播放/暂停
    // Spacebar: Play/Pause
    toggleAudio();
  }
}

// ========== 生成新布局 Create New Layout ==========
function createNewLayout(){
  // 1) 生成间隙
  // Generate gaps
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
  
  // 2) 分配列宽/行高
  // Allocate column widths and row heights
  const posW = positionWeights(COLS, CENTER_POWER);
  randomizeWithBias(colW, COLS, availW, COL_MIN, COL_MAX, COL_SPREAD, posW);
  
  const posR = positionWeights(ROWS, ROW_CENTER_POWER);
  randomizeWithBias(rowH, ROWS, availH, ROW_MIN, ROW_MAX, ROW_SPREAD, posR);
  
  // 3) 计算起点坐标
  // Calculate start coordinates
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
  
  // 4) 生成场景元素
  // Generate scene elements
  connectors = [];
  bigBlocks = [];
  colorBlocks = [];
  roadSquares = [];
  
  generateConnectors(12);
  generateBigBlocks({
    prob: 0.55,
    minFrac: 0.35,
    maxFrac: 0.85,
    aspectThresh: 1.15
  });
  generateRoadSquares();
}

// ========== 生成道路方块 Generate Road Squares ==========
function generateRoadSquares(){
  const COLORS = ['#c63b2d', '#2a59b6', '#bfbfbf'];
  const V_GAP_MIN = 8,  V_GAP_MAX = 28;
  const H_GAP_MIN = 8,  H_GAP_MAX = 28;
  
  roadSquares = [];
  
  // 竖向缝
  // Vertical gaps
  for (let c = 0; c < COLS - 1; c++) {
    const x0 = xs[c] + colW[c];
    const w = gapX[c];
    const baseSize = w;
    let y = 0;
    
    while (y + baseSize <= H) {
      if (random() < 0.65) {
        const color = random(COLORS);
        const speed = random(0.6, 2.0) * (random() < 0.5 ? 1 : -1);
        
        roadSquares.push({
          type: 'v',
          x: x0,
          y: y,
          baseSize: baseSize,       // 基础大小 Base size
          currentSize: baseSize,    // 当前大小（音频驱动）Current size (audio-driven)
          color: color,
          speed: speed
        });
      }
      y += baseSize + random(V_GAP_MIN, V_GAP_MAX);
    }
  }
  
  // 横向缝
  // Horizontal gaps
  for (let r = 0; r < ROWS - 1; r++) {
    const y0 = ys[r] + rowH[r];
    const h = gapY[r];
    const baseSize = h;
    let x = 0;
    
    while (x + baseSize <= W) {
      if (random() < 0.65) {
        const color = random(COLORS);
        const speed = random(0.6, 2.0) * (random() < 0.5 ? 1 : -1);
        
        roadSquares.push({
          type: 'h',
          x: x,
          y: y0,
          baseSize: baseSize,       // 基础大小 Base size
          currentSize: baseSize,    // 当前大小（音频驱动）Current size (audio-driven)
          color: color,
          speed: speed
        });
      }
      x += baseSize + random(H_GAP_MIN, H_GAP_MAX);
    }
  }
}

// ========== 生成连接块 Generate Connectors ==========
function generateConnectors(count = 8){
  connectors = [];
  
  for (let k = 0; k < count; k++){
    if (random() < 0.5) {
      // 横向连接
      // Horizontal connection
      const r = int(random(0, ROWS));
      const c = int(random(0, COLS-1));
      const x0 = xs[c] + colW[c];
      const y0 = ys[r];
      const w = gapX[c];
      const h = rowH[r];
      connectors.push({ x: x0, y: y0, w, h });
    } else {
      // 纵向连接
      // Vertical connection
      const c = int(random(0, COLS));
      const r = int(random(0, ROWS-1));
      const x0 = xs[c];
      const y0 = ys[r] + rowH[r];
      const w = colW[c];
      const h = gapY[r];
      connectors.push({ x: x0, y: y0, w, h });
    }
  }
}

// ========== 生成大色块 Generate Big Blocks ==========
function generateBigBlocks(opts){
  const COLORS = ['#c63b2d', '#2a59b6', '#f2d31b'];
  const PROB   = opts.prob ?? 0.55;
  const MINF   = opts.minFrac ?? 0.35;
  const MAXF   = opts.maxFrac ?? 0.85;
  const THR    = opts.aspectThresh ?? 1.15;
  const PROB2  = 0.20;
  
  bigBlocks = [];
  colorBlocks = [];
  
  // 第一层大色块
  // First layer of big blocks
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
        // 等高条
        // Equal-height strip
        bw = random(MINF * w, MAXF * w);
        bh = h;
        bx = x + random(0, w - bw);
        by = y;
        mode = 'equalHeight';
      } else if (ratioH >= THR) {
        // 等宽条
        // Equal-width strip
        bw = w;
        bh = random(MINF * h, MAXF * h);
        bx = x;
        by = y + random(0, h - bh);
        mode = 'equalWidth';
      } else {
        // 近似正方
        // Near-square
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
      colorBlocks.push({ 
        x: bx, y: by, w: bw, h: bh, color,
        brightnessFactor: 1.0  // 亮度因子 Brightness factor
      });
    }
  }
  
  // 第二层叠加（相反规则）
  // Second layer overlay (opposite rule)
  for (let b of bigBlocks){
    if (random() > PROB2) continue;
    
    const COLORS2 = ['#c63b2d', '#2a59b6', '#f2d31b'];
    const altChoices = COLORS2.filter(c => c !== b.color);
    const alt = random(altChoices);
    
    if (b.mode === 'equalHeight'){
      // 等高 → 等宽
      // Equal-height → Equal-width
      const hh = random(MINF * b.h, MAXF * b.h);
      const yy = b.y + random(0, b.h - hh);
      colorBlocks.push({ 
        x: b.x, y: yy, w: b.w, h: hh, color: alt,
        brightnessFactor: 1.0
      });
    } else {
      // 等宽 → 等高
      // Equal-width → Equal-height
      const ww = random(MINF * b.w, MAXF * b.w);
      const xx = b.x + random(0, b.w - ww);
      colorBlocks.push({ 
        x: xx, y: b.y, w: ww, h: b.h, color: alt,
        brightnessFactor: 1.0
      });
    }
  }
}

// ========== 工具函数 Utility Functions ==========

// 位置权重
// Position weights
function positionWeights(n, power){
  const arr = new Array(n);
  const mid = (n - 1) / 2;
  
  for (let i = 0; i < n; i++){
    const t = 1 - Math.abs((i - mid) / mid);
    arr[i] = Math.pow(t, power) + 0.05;
  }
  return arr;
}

// 带偏置的随机分配
// Random distribution with bias
function randomizeWithBias(out, n, total, minV, maxV, spread, posW){
  const base = n * minV;
  const rest = max(0, total - base);
  
  let w = new Array(n), sw = 0;
  for (let i = 0; i < n; i++){
    const r = Math.pow(random(), spread);
    w[i] = (posW ? posW[i] : 1) * r;
    sw += w[i];
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
