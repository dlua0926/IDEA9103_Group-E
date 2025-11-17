# Broadway Boogie Woogie — Audio-Driven Version - dlua0926

## 1. How to Run & Interact

### Run

1. Download or clone this repo.
2. Simply **open `index.html` in a browser**.
   - No extra server / terminal commands are required for marking.
   - `index.html` is set up to load the p5.js sketches.

### Interaction Instructions

#### Audio Version (`audio.js`)

- Click **“Play Music”** to start the audio‑driven animation.
- Click **“Pause Music”** to pause both audio and animation.
- Click **“Next Track”** to switch music tracks.
- Use the **Volume** slider to adjust loudness.
- Press **`R`** to regenerate a new Mondrian‑style layout.
- Press **Space** to play/pause with the keyboard.
- Watch:
  - Small squares in the yellow “roads” scale and move with the music.
  - Large colored blocks pulse brighter on beats.

---

## 2. My Individual Approach

Our group recreated Piet Mondrian’s **“Broadway Boogie Woogie”** with a parametric grid (`sketch.js`).  
My individual work focuses on an **audio‑driven version** (`audio.js`):

- The group’s static Mondrian‑style grid is reused as the base composition.
- I add an **audio layer** that makes the yellow “roads” and colored blocks **react to music** in real time.
- The goal is to make the painting feel like it is **dancing to a soundtrack**, echoing the title *Boogie Woogie*.

---

## 3. Driver Chosen

- **Chosen driver for my individual task:** **Audio**
- Libraries:
  - `p5.js` for drawing.
  - `p5.sound` for:
    - FFT (frequency spectrum).
    - Amplitude (overall loudness).
    - Peak detection (beats / transients).


---

## 4. What is Animated & How It’s Unique

### Audio‑Driven (`audio.js`)

1. **Road Squares** (small squares in yellow gaps)
   - Colors:
     - **Red** squares respond to **bass** (60–250 Hz).
     - **Blue** squares respond to **mid** (400–2600 Hz).
     - **Grey** squares respond to **treble** (5.2–14 kHz).
   - Their **size** scales with the energy of the corresponding frequency band.
   - They **move** along horizontal/vertical gaps at constant speeds and wrap around edges.

2. **Big Color Blocks** (inside white cells)
   - On each detected **beat**, their **brightness** briefly increases.
   - They “pulse” with the rhythm like a light grid.

3. **Global Beat Flash**
   - A global `beatFlash` value is set when a beat is detected and then decays smoothly.
   - Road squares and big blocks read this value to synchronize pulsing and highlight strong hits.

**Uniqueness vs. other group members:**

- My animation is directly tied to **real audio analysis** (bass/mid/treble + beats).
- If the soundtrack changes, the visual motion and brightness also change.
- Other members use different drivers (e.g. time, mouse/keyboard, Perlin noise), so my version is clearly identified as the **audio‑driven interpretation**.

---

## 5. Inspiration

- **Original artwork**: Piet Mondrian, *Broadway Boogie Woogie*  
  - The painting references jazz/boogie‑woogie music; the grid feels like both a city map and a musical score.
  - I wanted the composition to literally **move to music** instead of being only visually rhythmic.

- **Music visualizers / equalizers**
  - Classic spectrum bars where each bar responds to a frequency band.
  - I adapted this idea so that **grid squares** react instead of bars, and their movement follows the Mondrian road structure.

---

## 6. Technical Overview (Short)

### Files

- `sketch.js`  
  Group base code that:
  - Creates a 10×10 Mondrian‑like grid.
  - Randomizes column widths, row heights, and gaps.
  - Places small squares in gaps, connects blocks, and inserts big colored strips.

- `audio.js`  
  My **audio‑driven** individual sketch:
  - Regenerates a Mondrian‑like layout (same grid logic as `sketch.js`).
  - Creates:
    - `roadSquares` along the yellow gaps.
    - `colorBlocks` as large colored strips inside white cells.
  - Uses `p5.FFT`, `p5.Amplitude`, and `p5.PeakDetect` to control:
    - Square size scaling.
    - Brightness pulses on beats.

### Audio Mapping (in `audio.js`)

- Audio setup in `setup()`:
  ```js
  fft = new p5.FFT(0.8, 256);
  amplitude = new p5.Amplitude();
  peakDetect = new p5.PeakDetect(20, 250, BEAT_THRESHOLD);
  ```

- In `updateAudioDrivenAnimation()`:
  ```js
  let level = amplitude.getLevel();
  let spectrum = fft.analyze();
  peakDetect.update(fft);

  let bass   = map(fft.getEnergy("bass"),   0, 255, 0, 1);
  let mid    = map(fft.getEnergy("mid"),    0, 255, 0, 1);
  let treble = map(fft.getEnergy("treble"), 0, 255, 0, 1);
  ```

- Road squares use band energies:
  ```js
  if (sq.color === '#c63b2d') {
    energyFactor = 1 + bass * AMPLITUDE_SCALE;
  } else if (sq.color === '#2a59b6') {
    energyFactor = 1 + mid * AMPLITUDE_SCALE;
  } else if (sq.color === '#bfbfbf') {
    energyFactor = 1 + treble * AMPLITUDE_SCALE;
  }
  sq.currentSize = sq.baseSize * energyFactor;
  if (beatFlash > 0.5) {
    sq.currentSize *= (1 + beatFlash * 0.3);
  }
  ```

- Beat flash:
  ```js
  if (peakDetect.isDetected) {
    beatFlash = 1.0;
  } else {
    beatFlash *= BEAT_DECAY;
  }
  ```

### Changes vs. Group Code

- Reused:
  - Core layout logic (columns, rows, gaps, connectors, big blocks).
  - Color palette and general Mondrian structure.
- Added:
  - Audio analysis pipeline (`fft`, `amplitude`, `peakDetect`).
  - Data structures for audio‑reactive squares (`roadSquares`) and brightness‑reactive colored blocks (`colorBlocks`).
  - UI elements for audio control (play/pause, next track, volume, status).

---

## 7. External Techniques & References

- **p5.sound**  
  - Docs: https://p5js.org/reference/#/libraries/p5.sound  
  - Used classes:
    - `p5.FFT`
    - `p5.Amplitude`
    - `p5.PeakDetect`
  - In the code I note where these come from, for example:
    ```js
    // Audio analysis (FFT, Amplitude, PeakDetect) uses the official p5.sound library:
    // https://p5js.org/reference/#/libraries/p5.sound
    ```

- **Beat detection**  
  - Usage of `p5.PeakDetect` is adapted from the official example:  
    https://p5js.org/reference/#/p5.PeakDetect  
  - Commented in code:
    ```js
    // Beat detection is adapted from the p5.PeakDetect example in the p5.sound reference:
    // https://p5js.org/reference/#/p5.PeakDetect
    ```

All external techniques are briefly explained and referenced in the comments.

## 8. Code Comments

- Group comments in `sketch.js` are preserved.
- My individual code in `audio.js` includes:
  - High‑level headers describing the module and behaviour.
  - Inline comments for each major audio/time parameter and mapping.
  - References and small explanations for anything that comes from outside tutorials or documentation.


