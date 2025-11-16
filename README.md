Assignment 4 – Individual Animation Extension  
 Branch: `kenan` (Perlin Noise + Randomness)

This branch contains my individual animation extension for Assignment 4.  
Based on our group’s static reconstruction of Piet Mondrian’s *Broadway Boogie Woogie*, I added a time-based animation using Perlin noise and Randomness. The overall layout from the group work is preserved, and only the large colored blocks are animated.

---

 1. How to Run
Open the file below in any browser:

```
index.html
```

The animation starts automatically.  
p5.js is loaded via CDN, so no installation is required.



2. Interaction
This work uses a **time-based animation**:

- No mouse or keyboard interaction is required  
- The animation runs continuously after loading  
- Large blocks show breathing-like scaling, subtle jitter, and occasional random flashes

---

 3. Animation Method (Perlin Noise + Randomness)
To differentiate from other group members, I used Perlin Noise + Randomness as my individual animation method.

✔ Perlin Noise (smooth variation)
Used to generate:
- Smooth size changes (0.9–1.2 scale range)  
- Very slight position jitter  
- Continuous, non-repeating movement  

Example:

```js
const nScale = noise(b.x * 0.01, b.y * 0.01, t);
const pulse = map(nScale, 0, 1, 0.9, 1.2);
```

 ✔ Randomness (flash events)
Adds unpredictable visual changes:

```js
if (random() < 0.01) c = '#ffffff';
```

This creates a dynamic effect that breaks the regular rhythm.

---

4. Differences from Group Code
The structure created by the group (grid, spacing, block sizes, colors) is kept exactly the same.  
Only the animation layer is added:

1. Removed `noLoop()` so that animation can run  
2. Added a `draw()` function to update frames  
3. Implemented `animateBigBlocks(t)` to control scaling, jitter, and flashes  
4. Animation applies **only to the large colored blocks**  

All layout logic from the group work remains unchanged.

---

5. Technical Overview
- `t = frameCount * 0.02` controls animation timing  
- Perlin noise drives scaling and micro-movement  
- Jitter amplitude is about ±2px  
- `rectMode(CENTER)` ensures stable scaling  
- Random flashes add irregular visual rhythm  

---

 6. Files in This Branch
```
kenan/index.html
kenan/sketch.js
kenan/README.md
```
