// ========== Audio-Driven Animation Module ==========
// Audio-Driven Animation Module - IDEA9103 Individual Task
//
// This file is my INDIVIDUAL submission for the "Audio" animation method.
// It reuses the group Mondrian-style grid logic and adds an audio-reactive layer.
//
// Features:
// 1. Audio amplitude controls square sizes.
// 2. Audio frequency content affects color brightness per band (bass/mid/treble).
// 3. Beat detection triggers global flash/pulse effects.
// 4. Real-time audio visualization on top of the group composition.
//
// NOTE / DECLARATION (for assignment documentation):
// - This code is based on our group's grid code (sketch.js) written in class and by the group.
// - Audio analysis (FFT, Amplitude, PeakDetect) uses the official p5.sound library:
//   https://p5js.org/reference/#/libraries/p5.sound
// - I used GitHub Copilot (model GPT-5.1 (Preview)) to help with some comments and structuring,
//   but I checked and edited all logic to ensure I understand how it works.
// - Any technique that comes directly from examples or documentation is referenced in comments.
//
// IMPORTANT TECHNICAL NOTE:
// This file requires p5.js and the p5.sound library to be loaded in the HTML, for example:
//   <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.7.0/p5.js"></script>
//   <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.7.0/addons/p5.sound.min.js"></script>
//   <script src="audio.js"></script>

const W = 900, H = 900;
const COLS = 10, ROWS = 10;

// Base spacing and jitter for the yellow gaps between white blocks
const GAP_X_BASE = 15, GAP_Y_BASE = 15;
const GAP_X_DELTA = 3,  GAP_Y_DELTA = 3;

// White cell size range (column width / row height)
const COL_MIN = 20,  COL_MAX = 280;
const ROW_MIN = 40,  ROW_MAX = 140;

// Column/row distribution parameters to bias sizes towards the center
const CENTER_POWER = 2.2;
const COL_SPREAD   = 2.0;
const ROW_CENTER_POWER = 2.0;
const ROW_SPREAD       = 1.5;

// Geometry data for the Mondrian-like grid
let colW = [], rowH = [];
let gapX = [], gapY = [];
let xs = [], ys = [];
let bigBlocks = [];
let colorBlocks = [];
let connectors = [];

// Road squares data (small moving squares in yellow gaps, audio-reactive)
let roadSquares = [];

// ========== Audio Variables ==========
// p5.sound objects:
// - song: loaded sound file
// - fft: spectrum analyzer (p5.FFT)
// - amplitude: global volume analyzer (p5.Amplitude)
// - peakDetect: beat detector (p5.PeakDetect, low-frequency)
let song;
let fft;
let amplitude;
let peakDetect;

// Local audio file list.
//
// IMPORTANT: For local files, place MP3 files in an `assets/` folder at the project root:
//   /assets/music1.mp3
//   /assets/music2.mp3
//   /assets/music3.mp3
// You can also swap these URLs to online MP3s if needed for testing.
const AUDIO_TRACKS = [
  {
    name: 'Track 1',
    url: 'assets/music1.mp3',
    description: 'Game music 1'
  },
  {
    name: 'Track 2',
    url: 'assets/music2.mp3',
    description: 'Game music 2'
  },
  {
    name: 'Track 3',
    url: 'assets/music3.mp3',
    description: 'Game music 3'
  }
];

let currentTrackIndex = 0;   // Current audio track index

// Audio / animation state
let audioStarted = false;    // Whether audio playback has started
let beatFlash = 0;           // Global beat flash intensity (0–1)
let audioLoading = false;    // Whether an audio track is currently loading

// UI elements (p5.dom)
let playButton;              // Play/Pause button
let nextButton;              // Next track button
let volumeSlider;            // Volume slider
let volumeLabel;             // Volume label
let statusLabel;             // Status label for messages
let trackLabel;              // Track info label

// Audio response parameters
const AMPLITUDE_SCALE = 3.0;     // Amplitude scale factor for size changes
const FREQ_BANDS = 4;            // Not used directly, but kept as a configurable constant
const BEAT_THRESHOLD = 0.15;     // Beat detection threshold for PeakDetect
const BEAT_DECAY = 0.92;         // Beat flash decay rate per frame

// Frequency band color mapping (for explanation / reference)
const FREQ_COLORS = {
  bass: '#c63b2d',      // Bass → red
  mid: '#2a59b6',       // Mid → blue
  high: '#bfbfbf'       // Treble → grey
};

// ========== p5.js Setup ==========
// Standard p5.js setup: create canvas, initialize audio analyzers and UI, generate layout.
function setup(){
  const size = calcCanvasSize();
  createCanvas(size, size);
  
  // Initialize audio analyzers (p5.sound)
  // NOTE: Using p5.FFT, p5.Amplitude, p5.PeakDetect as documented here:
  // https://p5js.org/reference/#/libraries/p5.sound
  fft = new p5.FFT(0.8, 256);      // Smoothness 0.8, 256 FFT bins
  amplitude = new p5.Amplitude();
  // PeakDetect for low-frequency beat detection (approx. 20–250 Hz)
  peakDetect = new p5.PeakDetect(20, 250, BEAT_THRESHOLD);
  
  // Create custom UI controls (buttons, slider, labels)
  createAudioControls();
  
  // Generate initial Mondrian-like layout
  createNewLayout();
  
  // Do not loop until the user presses Play
  noLoop();
}

// Compute canvas size based on window size, with a maximum of 900x900
function calcCanvasSize(){
  let maxSize = 900;
  let size = min(windowWidth - 40, windowHeight - 180, maxSize);
  size = max(size, 300);
  return size;
}

// Handle window resizing and move UI elements accordingly
function windowResized(){
  const size = calcCanvasSize();
  resizeCanvas(size, size);
  updateControlPositions();
}

// Create audio-related UI controls (p5.dom)
// NOTE: This is standard p5.dom usage, not from external tutorials.
function createAudioControls(){
  const y = height + 20;
  
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
  
  // Volume label
  volumeLabel = createSpan('Volume');
  volumeLabel.position(300, y + 3);
  volumeLabel.style('font-size', '12px');
  volumeLabel.style('font-family', 'sans-serif');
  
  // Volume slider (0–100)
  volumeSlider = createSlider(0, 100, 50);
  volumeSlider.position(360, y);
  volumeSlider.style('width', '100px');
  
  // Track info label
  trackLabel = createDiv('');
  trackLabel.position(20, y + 40);
  trackLabel.style('font-size', '12px');
  trackLabel.style('font-family', 'sans-serif');
  trackLabel.style('color', '#333');
  
  // Status label
  statusLabel = createSpan('Press Play to start | R: reset layout, Space: play/pause');
  statusLabel.position(480, y + 3);
  statusLabel.style('font-size', '13px');
  statusLabel.style('font-family', 'sans-serif');
  statusLabel.style('color', '#666');
  
  // Auto-load first track (but do not auto-play)
  loadTrack(currentTrackIndex);
}

// Update UI positions after canvas resize
function updateControlPositions(){
  const y = height + 20;
  if (playButton) playButton.position(20, y);
  if (nextButton) nextButton.position(150, y);
  if (volumeLabel) volumeLabel.position(300, y + 3);
  if (volumeSlider) volumeSlider.position(360, y);
  if (trackLabel) trackLabel.position(20, y + 40);
  if (statusLabel) statusLabel.position(480, y + 3);
}

// Load a track from AUDIO_TRACKS[index] using p5.loadSound
// NOTE: loadSound is part of p5.sound, this usage follows the p5 reference.
function loadTrack(index){
  if (audioLoading) return; // Avoid double-loading
  
  audioLoading = true;
  const track = AUDIO_TRACKS[index];
  
  statusLabel.html('Loading music... Please wait');
  playButton.html('⏳ Loading...');
  
  // Stop and disconnect the previous song if any
  if (song) {
    if (song.isPlaying()) {
      song.stop();
    }
    song.disconnect();
  }
  
  // Load new audio file
  loadSound(
    track.url,
    // Success callback
    (loadedSound) => {
      song = loadedSound;
      
      // Connect audio analyzers to the new sound
      fft.setInput(song);
      amplitude.setInput(song);
      // PeakDetect analyses the FFT via peakDetect.update(fft)
      
      // Set initial volume from slider
      song.setVolume(volumeSlider.value() / 100);
      
      // Loop playback (user still has to press Play to start/resume)
      song.loop();
      song.pause(); // start paused so user controls playback explicitly
      
      playButton.html('▶️ Play Music');
      statusLabel.html('Music loaded! Press Play');
      trackLabel.html(
        `🎵 Track ${index + 1}/${AUDIO_TRACKS.length}: ${track.name}<br><small>${track.description}</small>`
      );
      
      audioLoading = false;
    },
    // Error callback
    (err) => {
      statusLabel.html('Failed to load music. Will try next track.');
      playButton.html('▶️ Play Music');
      console.error('Audio load error:', err);
      audioLoading = false;
      
      // Try loading next track after a short delay
      setTimeout(() => {
        loadNextTrack();
      }, 2000);
    }
  );
}

// Load the next track in AUDIO_TRACKS
function loadNextTrack(){
  if (audioLoading) return;
  
  // Stop current playback
  if (song && song.isPlaying()) {
    song.stop();
    audioStarted = false;
    noLoop();
  }
  
  currentTrackIndex = (currentTrackIndex + 1) % AUDIO_TRACKS.length;
  loadTrack(currentTrackIndex);
}

// Toggle audio playback and animation on/off.
//
// NOTE: userStartAudio() is required by modern browsers to resume the Web Audio context
// after a user gesture, otherwise audio may be blocked. This is recommended in p5.sound docs.
function toggleAudio(){
  if (!song || audioLoading) {
    statusLabel.html('Please wait for music to load');
    return;
  }
  
  userStartAudio(); // ensure AudioContext is started (browser autoplay policy)
  
  if (song.isPlaying()) {
    // Pause audio + animation
    song.pause();
    noLoop();
    playButton.html('▶️ Play Music');
    playButton.style('background-color', '#4CAF50');
    statusLabel.html('Paused (Space: play, R: reset)');
    audioStarted = false;
  } else {
    // Play audio + start draw loop
    song.play();
    loop();
    playButton.html('⏸️ Pause Music');
    playButton.style('background-color', '#FF5722');
    statusLabel.html('Playing - Audio-driven animation');
    audioStarted = true;
  }
}

// Main draw loop.
//
// This sketch uses the same grid logic as the group code, but scales it to current canvas size.
// When audio is playing, it updates audio-driven animation; otherwise it shows a static scene.
function draw(){
  background('#f2d31b');
  
  // Update volume from slider while audio is playing
  if (song && audioStarted) {
    song.setVolume(volumeSlider.value() / 100);
  }
  
  // Scale the Mondrian coordinate system to the current canvas
  push();
  const s = width / W;
  scale(s);
  
  // Base Mondrian grid (two white layers)
  drawWhiteGrid();
  
  // If audio is playing, update audio-driven animation state
  if (audioStarted && song && song.isPlaying()) {
    updateAudioDrivenAnimation();
  }
  
  // Draw moving road squares and color blocks
  drawRoadSquares();
  drawConnectors();
  drawColorBlocks();
  
  pop();
}

// Update all audio-driven state (sizes, brightness, positions).
// This function is called every frame while audio is playing.
//
// Audio analysis logic is adapted from p5.sound reference examples:
// - https://p5js.org/reference/#/p5.FFT
// - https://p5js.org/reference/#/p5.Amplitude
// - https://p5js.org/reference/#/p5.PeakDetect
function updateAudioDrivenAnimation(){
  // Overall amplitude (0–1, roughly)
  let level = amplitude.getLevel();
  
  // Full spectrum array (256 bins)
  let spectrum = fft.analyze();
  
  // Update beat detection from the current spectrum
  peakDetect.update(fft);
  
  // If a beat is detected in the low-frequency band, trigger flash
  if (peakDetect.isDetected) {
    beatFlash = 1.0;
  } else {
    // Exponential decay towards 0
    beatFlash *= BEAT_DECAY;
  }
  
  // Compute band energies (0–255) and normalize to 0–1
  let bass = fft.getEnergy("bass");      // ~60–250 Hz
  let mid = fft.getEnergy("mid");        // ~400–2600 Hz
  let treble = fft.getEnergy("treble");  // ~5200–14000 Hz
  
  bass = map(bass, 0, 255, 0, 1);
  mid = map(mid, 0, 255, 0, 1);
  treble = map(treble, 0, 255, 0, 1);
  
  // Update road squares (audio-reactive movement and scaling)
  for (let sq of roadSquares) {
    let energyFactor = 1.0;
    
    // Map each color to a different band:
    if (sq.color === '#c63b2d') {
      // Red squares respond mainly to bass
      energyFactor = 1 + bass * AMPLITUDE_SCALE;
    } else if (sq.color === '#2a59b6') {
      // Blue squares respond mainly to mid frequencies
      energyFactor = 1 + mid * AMPLITUDE_SCALE;
    } else if (sq.color === '#bfbfbf') {
      // Grey squares respond mainly to treble
      energyFactor = 1 + treble * AMPLITUDE_SCALE;
    }
    
    // Base size scaled by energy
    sq.currentSize = sq.baseSize * energyFactor;
    
    // Extra pulse on strong beats
    if (beatFlash > 0.5) {
      sq.currentSize *= (1 + beatFlash * 0.3);
    }
    
    // Movement along the road (constant nominal speed)
    const moveSpeed = 0.8;
    
    if (sq.type === 'v') {
      // Vertical road: move in y direction
      sq.y += sq.speed * moveSpeed;
      if (sq.y > H) sq.y = -sq.currentSize;
      if (sq.y < -sq.currentSize) sq.y = H;
    } else {
      // Horizontal road: move in x direction
      sq.x += sq.speed * moveSpeed;
      if (sq.x > W) sq.x = -sq.currentSize;
      if (sq.x < -sq.currentSize) sq.x = W;
    }
  }
  
  // Update big color blocks brightness based on beatFlash
  if (beatFlash > 0.3) {
    for (let block of colorBlocks) {
      block.brightnessFactor = 1 + beatFlash * 0.2;
    }
  } else {
    for (let block of colorBlocks) {
      block.brightnessFactor = 1.0;
    }
  }
}

// Draw two layers of white grid rectangles (base Mondrian layout)
function drawWhiteGrid(){
  noStroke();
  fill('#ffffff');
  
  for (let layer = 0; layer < 2; layer++) {
    for (let r = 0; r < ROWS; r++){
      for (let c = 0; c < COLS; c++){
        rect(xs[c], ys[r], colW[c], rowH[r]);
      }
    }
  }
}

// Draw road squares (small squares in the yellow gaps)
// Uses sq.currentSize (audio-driven) and beatFlash for brightness.
function drawRoadSquares(){
  noStroke();
  
  for (let sq of roadSquares) {
    const size = sq.currentSize || sq.baseSize;
    const offset = (sq.baseSize - size) / 2;
    
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

// Draw white connectors that merge some gaps between cells
function drawConnectors(){
  noStroke();
  fill('#ffffff');
  
  for (let conn of connectors) {
    rect(conn.x, conn.y, conn.w, conn.h);
  }
}

// Draw big colored blocks inside white cells
function drawColorBlocks(){
  noStroke();
  
  for (let block of colorBlocks) {
    let col = color(block.color);
    
    // Apply brightness factor (beat reactive)
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

// Keyboard controls:
// - R: regenerate layout (static design) and redraw
// - Space: play/pause audio and animation
function keyPressed(){
  if (key === 'r' || key === 'R'){
    createNewLayout();
    redraw();
  } else if (key === ' '){
    toggleAudio();
  }
}

// ========== Layout generation and utility functions ==========
// The functions below are adapted from the group code (sketch.js),
// but are kept in this file so the audio sketch is self-contained.

function createNewLayout(){
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
  
  // Allocate column widths and row heights
  const posW = positionWeights(COLS, CENTER_POWER);
  randomizeWithBias(colW, COLS, availW, COL_MIN, COL_MAX, COL_SPREAD, posW);
  
  const posR = positionWeights(ROWS, ROW_CENTER_POWER);
  randomizeWithBias(rowH, ROWS, availH, ROW_MIN, ROW_MAX, ROW_SPREAD, posR);
  
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

// ========== Generate Road Squares ==========
function generateRoadSquares(){
  const COLORS = ['#c63b2d', '#2a59b6', '#bfbfbf'];
  const V_GAP_MIN = 8,  V_GAP_MAX = 28;
  const H_GAP_MIN = 8,  H_GAP_MAX = 28;
  
  roadSquares = [];
  
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
          baseSize: baseSize,       // Base size
          currentSize: baseSize,    // Current size (audio-driven)
          color: color,
          speed: speed
        });
      }
      y += baseSize + random(V_GAP_MIN, V_GAP_MAX);
    }
  }
  
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
          baseSize: baseSize,       // Base size
          currentSize: baseSize,    // Current size (audio-driven)
          color: color,
          speed: speed
        });
      }
      x += baseSize + random(H_GAP_MIN, H_GAP_MAX);
    }
  }
}

// ========== Generate Connectors ==========
function generateConnectors(count = 8){
  connectors = [];
  
  for (let k = 0; k < count; k++){
    if (random() < 0.5) {
      // Horizontal connection
      const r = int(random(0, ROWS));
      const c = int(random(0, COLS-1));
      const x0 = xs[c] + colW[c];
      const y0 = ys[r];
      const w = gapX[c];
      const h = rowH[r];
      connectors.push({ x: x0, y: y0, w, h });
    } else {
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

// ========== Generate Big Blocks ==========
function generateBigBlocks(opts){
  const COLORS = ['#c63b2d', '#2a59b6', '#f2d31b'];
  const PROB   = opts.prob ?? 0.55;
  const MINF   = opts.minFrac ?? 0.35;
  const MAXF   = opts.maxFrac ?? 0.85;
  const THR    = opts.aspectThresh ?? 1.15;
  const PROB2  = 0.20;
  
  bigBlocks = [];
  colorBlocks = [];
  
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
        // Equal-height strip
        bw = random(MINF * w, MAXF * w);
        bh = h;
        bx = x + random(0, w - bw);
        by = y;
        mode = 'equalHeight';
      } else if (ratioH >= THR) {
        // Equal-width strip
        bw = w;
        bh = random(MINF * h, MAXF * h);
        bx = x;
        by = y + random(0, h - bh);
        mode = 'equalWidth';
      } else {
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
        brightnessFactor: 1.0  // Brightness factor
      });
    }
  }
  
  // Second layer overlay (opposite rule)
  for (let b of bigBlocks){
    if (random() > PROB2) continue;
    
    const COLORS2 = ['#c63b2d', '#2a59b6', '#f2d31b'];
    const altChoices = COLORS2.filter(c => c !== b.color);
    const alt = random(altChoices);
    
    if (b.mode === 'equalHeight'){
      // Equal-height → Equal-width
      const hh = random(MINF * b.h, MAXF * b.h);
      const yy = b.y + random(0, b.h - hh);
      colorBlocks.push({ 
        x: b.x, y: yy, w: b.w, h: hh, color: alt,
        brightnessFactor: 1.0
      });
    } else {
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

// ========== Utility Functions ==========

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
