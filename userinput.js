/* =========================================================
 * User-Input Addon Module (load AFTER group sketch)
 * Purpose: add moving road-squares + mouse “black hole” +
 *          speed UI, without editing the group code.
 *
 * Hotkeys: E = pause/resume, R = resync after group reset
 * Mouse:   wheel = adjust black-hole radius (clamped)
 *
 * Notes:
 * - Works on top of the group’s static drawing (noLoop()).
 * - Uses a p5.Graphics overlay so we don’t repaint the base.
 * - Reads group globals: xs, ys, colW, rowH, gapX, gapY, COLS, ROWS, W, H
 * ========================================================= */
(function () {
  // ---------- New state (addon only) ----------
  let blackHoleRadius = 45;
  const BLACK_HOLE_MIN = 15;
  const BLACK_HOLE_MAX = 120;

  let roadSquares = [];              // moving agents on yellow gaps
  let moving = true;                 // E to toggle
  let speedSlider, speedLabel, speedInfo;
  let speedFactor = 1.0;             // global speed multiplier

  let overlay;                       // p5.Graphics overlay layer (W×H)
  let needsRegenAfterReset = false;  // rebuild agents after group “R”

  // Optional: keep original handlers (if any exist)
  const __group_setup      = (typeof setup      === 'function') ? setup      : null;
  const __group_keyPressed = (typeof keyPressed === 'function') ? keyPressed : null;
  const __group_draw       = (typeof draw       === 'function') ? draw       : null; // usually absent

  // ---------- Utilities ----------
  function ensureUI() {
    if (!speedSlider) {
      speedSlider = createSlider(0, 300, 100);
      speedLabel  = createSpan('Speed');
      speedInfo   = createSpan('');

      speedLabel.style('font-size', '12px');
      speedLabel.style('font-family', 'sans-serif');
      speedInfo.style('font-size', '14px');
      speedInfo.style('font-family', 'sans-serif');

      const y = height + 20; // place below canvas
      speedLabel.position(20,  y + 3);
      speedSlider.position(100, y);
      speedInfo.position(250,  y + 3);
    }
  }

  function generateRoadSquaresFromGroup() {
    // Build agents along the same “yellow gaps” the group uses.
    // We intentionally allow differences from the group’s static sprinkle.
    const COLORS = ['#c63b2d', '#2a59b6', '#bfbfbf'];
    const V_GAP_MIN = 8, V_GAP_MAX = 28;
    const H_GAP_MIN = 8, H_GAP_MAX = 28;

    roadSquares = [];

    // Vertical gaps (between columns), place squares along Y
    for (let c = 0; c < COLS - 1; c++) {
      const x0 = xs[c] + colW[c];
      const w  = gapX[c];
      const s  = w; // square edge = gap width
      let y = 0;
      while (y + s <= H) {
        if (random() < 0.65) {
          const color = random(COLORS);
          const speed = random(0.6, 2.0) * (random() < 0.5 ? 1 : -1); // up/down
          roadSquares.push({ type: 'v', x: x0, y, size: s, color, speed });
        }
        y += s + random(V_GAP_MIN, V_GAP_MAX);
      }
    }

    // Horizontal gaps (between rows), place squares along X
    for (let r = 0; r < ROWS - 1; r++) {
      const y0 = ys[r] + rowH[r];
      const h  = gapY[r];
      const s  = h; // square edge = gap height
      let x = 0;
      while (x + s <= W) {
        if (random() < 0.65) {
          const color = random(COLORS);
          const speed = random(0.6, 2.0) * (random() < 0.5 ? 1 : -1); // left/right
          roadSquares.push({ type: 'h', x, y: y0, size: s, color, speed });
        }
        x += s + random(H_GAP_MIN, H_GAP_MAX);
      }
    }
  }

  function updateRoadSquares(holeX, holeY, bhR) {
    const hasHole = holeX != null && holeY != null;
    const keep = [];

    for (const sq of roadSquares) {
      // move
      const v = sq.speed * speedFactor;
      if (sq.type === 'v') {
        sq.y += v;
        if (sq.y > H)        sq.y = -sq.size;
        if (sq.y < -sq.size) sq.y = H;
      } else {
        sq.x += v;
        if (sq.x > W)        sq.x = -sq.size;
        if (sq.x < -sq.size) sq.x = W;
      }

      // black-hole cull
      if (hasHole) {
        const cx = sq.x + sq.size * 0.5;
        const cy = sq.y + sq.size * 0.5;
        const dx = cx - holeX;
        const dy = cy - holeY;
        if (dx * dx + dy * dy < bhR * bhR) {
          continue; // swallowed
        }
      }

      keep.push(sq);
    }

    roadSquares = keep;
  }

  function drawOverlay(holeX, holeY, bhR) {
    overlay.clear();

    // agents
    overlay.noStroke();
    for (const s of roadSquares) {
      overlay.fill(s.color);
      overlay.rect(s.x, s.y, s.size, s.size);
    }

    // black hole: cool-blue glow + ring + deep core
    if (holeX != null && holeY != null) {
      overlay.push();
      const r = bhR * (1 + 0.05 * sin(frameCount * 0.08)); // subtle breathing

      // outer glow
      overlay.noStroke();
      for (let i = 0; i < 14; i++) {
        const t  = i / 13;
        const rr = lerp(r * 1.5, r * 2.2, t);
        const a  = lerp(90, 0, t);
        overlay.fill(120, 170, 255, a);
        overlay.ellipse(holeX, holeY, rr * 2, rr * 2);
      }
      // ring
      overlay.noFill();
      overlay.stroke(190, 210, 255, 230);
      overlay.strokeWeight(r * 0.18);
      overlay.ellipse(holeX, holeY, r * 1.6 * 2, r * 1.6 * 2);
      // core
      overlay.noStroke();
      for (let i = 0; i < 18; i++) {
        const t  = i / 17;
        const rr = lerp(r * 0.3, r, t);
        const a  = lerp(220, 0, t);
        overlay.fill(30, 70, 180, a);
        overlay.ellipse(holeX, holeY, rr * 2, rr * 2);
      }
      overlay.pop();
    }
  }

  // ---------- Wrap lifecycle ----------
  setup = function () {
    // 1) Run the group’s original setup first (creates canvas, draws base)
    if (__group_setup) __group_setup();

    // 2) Start our animation loop (group used noLoop())
    loop();

    // 3) Create an overlay matching the group canvas size
    overlay = createGraphics(W, H);

    // 4) Generate our moving agents based on the current layout
    generateRoadSquaresFromGroup();

    // 5) UI
    ensureUI();
  };

  keyPressed = function () {
    // keep group behavior (e.g., R triggers a redrawScene())
    if (__group_keyPressed) __group_keyPressed();

    // our hotkeys
    if (key === 'e' || key === 'E') moving = !moving;
    if (key === 'r' || key === 'R') needsRegenAfterReset = true; // resync after reset
  };

  // We take ownership of draw(). If the group had a draw(), we do NOT call it,
  // to avoid changing their “noLoop() single render” behavior.
  window.draw = function () {
    ensureUI();
    speedFactor = speedSlider.value() / 100.0;

    // If the group just reset (R), rebuild agents once using fresh gaps
    if (needsRegenAfterReset) {
      generateRoadSquaresFromGroup();
      needsRegenAfterReset = false;
    }

    // Mouse → canvas space (group canvas is W×H)
    let holeX = null, holeY = null;
    if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
      holeX = mouseX;
      holeY = mouseY;
      noCursor();
    } else {
      cursor();
    }

    if (moving) updateRoadSquares(holeX, holeY, blackHoleRadius);
    drawOverlay(holeX, holeY, blackHoleRadius);

    // Composite overlay onto the base canvas (no base repaint)
    image(overlay, 0, 0, width, height);

    // UI text (two lines)
    if (speedInfo) {
      speedInfo.html(
        'Speed × ' + nf(speedFactor, 1, 2) + '  (E: pause / R: reset)' +
        '<br/>' +
        'BH ' + int(blackHoleRadius) + ' (Scroll wheel to adjust black hole size)'
      );
    }
  };

  // Mouse wheel handler: adjust black-hole radius
  window.mouseWheel = function (event) {
    if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
      blackHoleRadius = constrain(
        blackHoleRadius - event.deltaY * 0.05, // up: bigger, down: smaller
        BLACK_HOLE_MIN, BLACK_HOLE_MAX
      );
      return false; // prevent page scroll
    }
  };
})();
