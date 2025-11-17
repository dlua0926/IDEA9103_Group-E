Task 1 - Group sketch of major project
======================================

This repository contains the **group base sketch** for our major project, where we reinterpret  
Piet Mondrian’s *Broadway Boogie Woogie* using p5.js.

At this stage, this code is focused on the **static composition only**:

- `sketch.js` generates a Mondrian-like 10×10 grid.
- Column widths, row heights and gaps are randomized with positional bias to keep the center heavier.
- Yellow gaps between white rectangles are filled with small red/blue/grey squares.
- Some white blocks are connected to form larger shapes.
- Larger colored strips are added inside white cells, sometimes with a second “overlay” strip.

**Important:**  
This is the **group task “initial drawing” version**.  
There is **no animation yet** in this file: it only sets up the static layout that all individual members will later animate in their own versions (audio-driven, time-based, Perlin noise, or interaction based).

Individual animation logic (e.g. `audio.js`, `timebased.js`) lives in separate files and is **not part of this basic group sketch README**.
