const PacmanModule = (function(){
  
  // ========== Configuration Constants ==========
  const MOUTH_CYCLE = 300;        // Mouth animation cycle (ms)
  const GHOST_MODE_CYCLE = 5000;  // Ghost mode switch cycle (ms)
  const TURN_PROBABILITY = 0.15;  // Probability to turn at intersection (15%)
  const UTURN_PROBABILITY = 0.008;// Probability to make U-turn (0.8%)
  
  // ========== State Variables ==========
  let pacman = null;              // Pacman object
  let ghosts = [];                // Array of ghost objects
  let mouthTimer = 0;             // Mouth animation timer
  let mouthOpenAngle = 0;         // Current mouth open angle (0-45°)
  let ghostModeTimer = 0;         // Ghost mode switch timer
  let ghostMode = 'chase';        // Ghost mode: 'chase' or 'scatter'
  
  let animationActive = false;    // Animation loop active flag
  let lastUpdateTime = 0;         // Last update timestamp
  
  // ========== Module enabled flag ==========
  let enabled = true;             // Module enabled by default
  
  
  // ========================================================
  // PUBLIC API
  // ========================================================
  
  /**
   * Initialize the Pacman game
   * Call this after layout is generated (after drawScene sets xs, ys, etc.)
   */
  function initialize(){
    if (!enabled) return;
    
    // Access global variables from sketch.js
    const { xs, ys, colW, rowH, gapX, gapY, COLS, ROWS, W, H } = window;
    
    // Verify that layout data exists - check for array length instead of truthiness
    if (!xs || !ys || !colW || !rowH || !gapX || !gapY || 
        xs.length === 0 || ys.length === 0 || colW.length === 0 || rowH.length === 0) {
      console.error('PacmanModule: Layout data not available. xs.length=' + (xs?.length || 0) + 
                    ', ys.length=' + (ys?.length || 0) + 
                    ', colW.length=' + (colW?.length || 0) + 
                    ', rowH.length=' + (rowH?.length || 0));
      return;
    }
    
    // Create Pacman on a random horizontal road
    if (ROWS > 1) {
      const r = Math.floor(Math.random() * (ROWS - 1));
      const roadY = ys[r] + rowH[r];
      const roadH = gapY[r];
      const roadCenterY = roadY + roadH / 2;  // Center of horizontal road
      const size = roadH * 0.8;  // Fit nicely in road
      
      pacman = {
        x: W / 2,
        y: roadCenterY,
        size: size,
        speed: 1.5,
        direction: 1,           // 1 = right, -1 = left
        roadType: 'h',          // 'h' = horizontal, 'v' = vertical
        roadIndex: r
      };
    }
    
    // Create 3 Ghosts on random vertical roads
    ghosts = [];
    const ghostColors = ['#FF0000', '#00FFFF', '#FFB8FF']; // Red, Cyan, Pink
    
    if (COLS > 1) {
      for (let i = 0; i < 3; i++) {
        const c = Math.floor(Math.random() * (COLS - 1));
        const roadX = xs[c] + colW[c];
        const roadW = gapX[c];
        const roadCenterX = roadX + roadW / 2;  // Center of vertical road
        const size = roadW * 0.8;  // Fit nicely in road
        
        ghosts.push({
          x: roadCenterX,
          y: Math.random() * H,
          size: size,
          speed: 1.2,
          direction: Math.random() < 0.5 ? 1 : -1,
          color: ghostColors[i],
          roadType: 'v',
          roadIndex: c
        });
      }
    }
    
    // Reset timers
    mouthTimer = millis();
    ghostModeTimer = millis();
    lastUpdateTime = millis();
  }
  
  /**
   * Start the animation loop
   * Call this to begin continuous animation
   */
  function startAnimation(){
    if (!enabled) return;
    animationActive = true;
    if (!pacman) initialize();
    loop(); // Enable p5.js draw loop
  }
  
  /**
   * Stop the animation loop
   */
  function stopAnimation(){
    animationActive = false;
  }
  
  /**
   * Update all Pacman game logic
   * Should be called every frame in draw()
   */
  function update(){
    if (!enabled || !animationActive || !pacman) return;
    
    const currentTime = millis();
    const deltaTime = currentTime - lastUpdateTime;
    lastUpdateTime = currentTime;
    
    // Base speed factor (can be adjusted)
    const speedFactor = 1.0;
    
    updatePacmanMouth();
    updateGhostMode();
    updatePacmanPosition(speedFactor);
    updateGhostsPosition(speedFactor);
  }
  
  /**
   * Draw all Pacman game elements
   * Should be called in draw() after drawing the base scene
   */
  function draw(){
    if (!enabled || !animationActive) return;
    
    drawPacman();
    drawGhosts();
  }
  
  /**
   * Enable or disable the Pacman module
   */
  function setEnabled(state){
    enabled = state;
    if (!state) {
      stopAnimation();
    }
  }
  
  /**
   * Check if module is enabled
   */
  function isEnabled(){
    return enabled;
  }
  
  /**
   * Check if animation is active
   */
  function isAnimating(){
    return animationActive;
  }
  
  
  // ========================================================
  // PRIVATE FUNCTIONS - Animation Updates
  // ========================================================
  
  /**
   * Update Pacman's mouth animation using time-based sine wave
   */
  function updatePacmanMouth(){
    const elapsed = millis() - mouthTimer;
    const phase = (elapsed % MOUTH_CYCLE) / MOUTH_CYCLE; // 0 to 1
    
    // Sine wave for smooth animation: 0° to 45° and back
    mouthOpenAngle = (Math.sin(phase * Math.PI * 2) + 1) / 2 * 45;
  }
  
  /**
   * Update Ghost mode switching using time-based events
   */
  function updateGhostMode(){
    const elapsed = millis() - ghostModeTimer;
    
    if (elapsed > GHOST_MODE_CYCLE) {
      // Toggle mode
      ghostMode = (ghostMode === 'chase') ? 'scatter' : 'chase';
      ghostModeTimer = millis();
    }
  }
  
  /**
   * Update Pacman's position with intelligent road navigation
   */
  function updatePacmanPosition(speedFactor){
    if (!pacman) return;
    
    const { xs, ys, colW, rowH, gapX, gapY, COLS, ROWS, W, H } = window;
    const v = pacman.speed * speedFactor;
    
    if (pacman.roadType === 'h') {
      // ========== Moving on Horizontal Road ==========
      pacman.x += v * pacman.direction;
      
      // Wrap around edges
      if (pacman.x > W) pacman.x = -pacman.size;
      if (pacman.x < -pacman.size) pacman.x = W;
      
      // Check for intersections with vertical roads
      for (let c = 0; c < COLS - 1; c++) {
        const roadX = xs[c] + colW[c];
        const roadW = gapX[c];
        const roadCenterX = roadX + roadW / 2;
        const pacmanCenterX = pacman.x + pacman.size / 2;
        
        // If Pacman center is near this vertical road center
        if (Math.abs(pacmanCenterX - roadCenterX) < roadW) {
          // Random turn at intersection
          if (Math.random() < TURN_PROBABILITY) {
            // Switch to vertical road - position at center
            pacman.roadType = 'v';
            pacman.roadIndex = c;
            pacman.x = roadCenterX - pacman.size / 2;  // Center horizontally
            pacman.direction = Math.random() < 0.5 ? 1 : -1;
            break;
          }
        }
      }
      
      // Random U-turn
      if (Math.random() < UTURN_PROBABILITY) {
        pacman.direction *= -1;
      }
      
    } else {
      // ========== Moving on Vertical Road ==========
      pacman.y += v * pacman.direction;
      
      // Wrap around edges
      if (pacman.y > H) pacman.y = -pacman.size;
      if (pacman.y < -pacman.size) pacman.y = H;
      
      // Check for intersections with horizontal roads
      for (let r = 0; r < ROWS - 1; r++) {
        const roadY = ys[r] + rowH[r];
        const roadH = gapY[r];
        const roadCenterY = roadY + roadH / 2;
        const pacmanCenterY = pacman.y + pacman.size / 2;
        
        // If Pacman center is near this horizontal road center
        if (Math.abs(pacmanCenterY - roadCenterY) < roadH) {
          // Random turn at intersection
          if (Math.random() < TURN_PROBABILITY) {
            // Switch to horizontal road - position at center
            pacman.roadType = 'h';
            pacman.roadIndex = r;
            pacman.y = roadCenterY - pacman.size / 2;  // Center vertically
            pacman.direction = Math.random() < 0.5 ? 1 : -1;
            break;
          }
        }
      }
      
      // Random U-turn
      if (Math.random() < UTURN_PROBABILITY) {
        pacman.direction *= -1;
      }
    }
  }
  
  /**
   * Update all Ghosts' positions
   */
  function updateGhostsPosition(speedFactor){
    if (!pacman) return;
    
    const { xs, colW, gapX, COLS, H } = window;
    
    for (const ghost of ghosts) {
      const v = ghost.speed * speedFactor;
      
      if (ghostMode === 'chase' && pacman) {
        // Chase Mode: Pursue Pacman
        if (ghost.y < pacman.y) {
          ghost.direction = 1;  // Move down
        } else if (ghost.y > pacman.y) {
          ghost.direction = -1; // Move up
        }
      } else {
        // Scatter Mode: Random Movement
        if (Math.random() < 0.02) {
          ghost.direction *= -1;
        }
      }
      
      ghost.y += v * ghost.direction;
      
      // Wrap around edges
      if (ghost.y > H) ghost.y = -ghost.size;
      if (ghost.y < -ghost.size) ghost.y = H;
      
      // Keep ghost centered on vertical road
      const c = ghost.roadIndex;
      if (c >= 0 && c < COLS - 1) {
        const roadX = xs[c] + colW[c];
        const roadW = gapX[c];
        const roadCenterX = roadX + roadW / 2;
        ghost.x = roadCenterX - ghost.size / 2;  // Center horizontally
      }
    }
  }
  
  
  // ========================================================
  // PRIVATE FUNCTIONS - Drawing
  // ========================================================
  
  /**
   * Draw Pacman with animated mouth
   */
  function drawPacman(){
    if (!pacman) return;
    
    push();
    fill('#FFFF00'); // Yellow
    noStroke();
    
    // Calculate mouth direction based on road type and direction
    let angle;
    if (pacman.roadType === 'h') {
      // Horizontal road: right (0) or left (PI)
      angle = pacman.direction > 0 ? 0 : Math.PI;
    } else {
      // Vertical road: down (PI/2) or up (-PI/2)
      angle = pacman.direction > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
    
    // Draw Pacman with open mouth
    translate(pacman.x + pacman.size / 2, pacman.y + pacman.size / 2);
    rotate(angle);
    
    const startAngle = radians(mouthOpenAngle);
    const endAngle = Math.PI * 2 - radians(mouthOpenAngle);
    
    arc(0, 0, pacman.size, pacman.size, startAngle, endAngle, PIE);
    pop();
  }
  
  /**
   * Draw all Ghosts with classic appearance
   */
  function drawGhosts(){
    for (const ghost of ghosts) {
      push();
      
      fill(ghost.color);
      noStroke();
      
      const x = ghost.x;
      const y = ghost.y;
      const s = ghost.size;
      
      // Top half: semicircle (rounded head)
      arc(x + s / 2, y + s / 2, s, s, Math.PI, Math.PI * 2);
      
      // Middle: rectangle body
      rect(x, y + s / 2, s, s / 2);
      
      // Bottom: wavy edge (simplified as triangles)
      fill(ghost.color);
      triangle(x, y + s, x + s / 3, y + s * 0.8, x + s / 3, y + s);
      triangle(x + s / 3, y + s, x + s * 2 / 3, y + s * 0.8, x + s * 2 / 3, y + s);
      triangle(x + s * 2 / 3, y + s, x + s, y + s * 0.8, x + s, y + s);
      
      // Eyes (white)
      fill(255);
      const eyeSize = s * 0.2;
      ellipse(x + s * 0.35, y + s * 0.4, eyeSize, eyeSize);
      ellipse(x + s * 0.65, y + s * 0.4, eyeSize, eyeSize);
      
      // Pupils (black)
      fill(0);
      const pupilSize = eyeSize * 0.5;
      ellipse(x + s * 0.35, y + s * 0.4, pupilSize, pupilSize);
      ellipse(x + s * 0.65, y + s * 0.4, pupilSize, pupilSize);
      
      pop();
    }
  }
  
  
  // ========================================================
  // EXPORT PUBLIC API
  // ========================================================
  return {
    initialize: initialize,
    startAnimation: startAnimation,
    stopAnimation: stopAnimation,
    update: update,
    draw: draw,
    setEnabled: setEnabled,
    isEnabled: isEnabled,
    isAnimating: isAnimating,
    // Expose for debugging/info
    getGhostMode: () => ghostMode,
    getMouthAngle: () => mouthOpenAngle
  };
  
})();

// Export globally
window.PacmanModule = PacmanModule;

// Add keyboard handler for P key to toggle animation
document.addEventListener('keydown', function(e) {
  const key = String.fromCharCode(e.which).toLowerCase();
  if (key === 'p') {
    if (PacmanModule.isAnimating()) {
      PacmanModule.stopAnimation();
      console.log('Pacman animation stopped');
    } else {
      PacmanModule.startAnimation();
      console.log('Pacman animation started');
    }
  }
});

console.log('PacmanModule loaded. Press P to start/stop Pacman animation, R to reset scene.');