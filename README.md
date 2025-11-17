# Group E – Broadway Boogie Woogie

## Overview

This project is our group’s final reinterpretation of Piet Mondrian’s **“Broadway Boogie Woogie”** using **p5.js**.

The shared base is in `sketch.js`, which generates a **10×10 Mondrian-style grid**:

- White rectangles.
- Yellow “roads” (gaps) between blocks.
- Small red/blue/grey squares in the yellow gaps.
- Larger colored strips inside the white cells.

On top of this common static layout, different group members implemented **different animation approaches**, so the same image comes alive in multiple ways.

---

## Modules

### `sketch.js` – Base Group Layout

- Creates the Mondrian-like 10×10 grid.
- Uses biased randomness for column widths and row heights (center columns/rows tend to be larger).
- Fills yellow gaps with small colored squares.
- Adds large colored strips and second-layer overlays inside white cells.

### `timebased.js` – Time-Based Animation

- Pac-Man style agents moving along the yellow “roads”.
- Uses `millis()` for:
  - Pacman mouth animation (cyclic).
  - Ghost mode switching (chase / scatter).
- Uses probabilities for:
  - Turns at intersections.
  - Occasional U-turns.

### `userinput.js` – User Input / Interaction

- Interactive version of the grid:
  - Responsive canvas (logical 900×900 space scaled to the window).
  - Small squares moving continuously along yellow gaps.
- Mouse:
  - Acts as a **“black hole”** that swallows nearby squares.
  - Mouse wheel changes black hole radius.
- Keyboard:
  - `E` – pause / resume motion.
  - `R` – reset and regenerate a new layout.
- UI:
  - Speed slider to globally scale movement speed.

### `audio.js` – Audio-Driven Animation

- Uses the **p5.sound** library:
  - `p5.FFT` for frequency spectrum.
  - `p5.Amplitude` for overall loudness.
  - `p5.PeakDetect` for simple beat detection.
- Mapping:
  - Small road squares scale with **bass / mid / treble** energy.
  - Big colored blocks pulse brighter on detected beats (global `beatFlash`).
- UI controls:
  - Play / Pause button.
  - Next Track button.
  - Volume slider.
  - `R` to reset layout, Space to play/pause.

### `perlin-noise.js` – Perlin Noise–Driven Animation

- Focuses on **Perlin noise** and randomness.
- Keeps the same Mondrian grid, but uses `noise()` plus random values to:
  - Smoothly vary positions, sizes, or colors over time.
  - Create organic, non-repeating motion distinct from time-based, user-input, and audio versions.

---

## How to Run

1. Open this project folder in **VS Code**.
2. Install the **Live Server** extension (if not already installed).
3. Right-click on `index.html` and choose **“Open with Live Server”**.
4. In `index.html`, choose which JS module(s) to include:
   - `timebased.js`
   - `userinput.js`
   - `audio.js`
   - `perlin-noise.js`

Each module keeps the **group’s grid (`sketch.js`) as the base**, and then applies a **different animation method** on top of it.