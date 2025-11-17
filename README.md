Group E – Broadway Boogie Woogie

This project is our group’s final Mondrian “Broadway Boogie Woogie” reinterpretation made with p5.js. The shared base is in `sketch.js`, which generates a 10×10 Mondrian-style grid: white rectangles, yellow “roads” (gaps), small colored squares in the gaps, and larger colored strips inside the white cells.

Different group members then added their own animation approaches on top of this shared layout, so the same static image can come alive in multiple ways:

- `timebased.js`  
  Time-based Pac-Man style agents moving on the yellow “roads”. Uses `millis()` to drive Pacman mouth animation and ghost mode switching (chase/scatter), plus probabilistic turns at intersections.

- `userinput.js`  
  Interactive version of the grid. The canvas is responsive, small squares move along the yellow gaps, and the mouse acts as a “black hole” that swallows nearby squares (mouse wheel changes radius). A speed slider and keys (`E` pause/resume, `R` reset) let the user control motion.

- `audio.js`  
  Audio‑driven version using the p5.sound library (FFT, Amplitude, PeakDetect). Small squares in the roads scale with bass/mid/treble energy, and big colored blocks pulse brighter on beats. UI buttons control play/pause, track switching, volume, and layout reset.

- `perlin-noise.js`  
  Version that focuses on Perlin noise–driven animation. It keeps the same Mondrian grid but uses `noise()` together with randomness to smoothly vary properties such as block positions, sizes, or colors over time, creating organic, non-repeating motion different from the time-based, user-input, and audio versions.


To view the work, open the folder in VS Code, start Live Server on `index.html`, and then choose which JS module to include (time-based, user input, audio, or Perlin-noise) depending on which version you want to run. Each module keeps the group’s grid as the base and then applies a different animation method on top of it.