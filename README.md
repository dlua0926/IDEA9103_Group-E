# README

## 1. How to run and interact with the work

Mouse movement  
Move the mouse over the canvas: a blue-black “black hole” follows the cursor.

Mouse wheel  
Scroll up/down while the cursor is over the canvas to change the black hole radius.

Road squares  
Small coloured squares (red/blue/grey) move along the yellow gaps like traffic.  
When they enter the black hole radius, they disappear (get “swallowed”).

Speed slider  
Below the canvas there is a slider labelled Speed Change.  
Drag it to make all moving squares slower or faster (0×–3×).

Keyboard  

R – regenerate a new layout (new grid, gaps, blocks, agents).  

E – pause / resume the movement of all road squares.

---

## 2. My approach to animating the group image

The group work in sketch.js creates a static composition:

10×10 white grid on a yellow background  

random yellow gaps with small coloured squares  

large red/blue/yellow blocks inside cells, based on aspect ratio  

In userinput.js, my personal contribution is:

Turn the static gap squares into moving agents (roadSquares) that travel along the yellow gaps.  

Introduce a mouse-controlled black hole that removes agents when they get too close.  

Add interactive control (speed slider, pause, radius change).

---

## 3. Animation driver: User Input

User interaction as the primary driver:

The mouse position controls where the black hole is.  

Mouse wheel controls its radius.  

Keyboard keys control regeneration and pause.  

Slider controls global speed.

---

## 4. What properties are animated, and how is my work different?

Position along the gaps、Existence / Disappearance、Black hole appearance、speed  

My primary focus was on the “road” layer, where I designed the small blocks to flow across the gaps like traffic, and implemented an “absorption” interaction through black holes. This approach differentiated my work from my teammates' by going beyond merely altering the blocks' colors or sizes.

---

## 5. References and visual inspiration

I drew inspiration from black hole visualizations, transit network diagrams, and minimalist game UIs, abstracting these visual impressions into an interactive solution featuring a black hole and flowing cubes.

---

## 6. How the code animates the image

Static images consist of group-generated grids and color blocks. I added a layer of “road tiles + black holes” logic on top, achieving animation and interaction through frame-by-frame updates and conditional deletions.

---

## 7. External tools, techniques, and copied code

p5.js reference  
I used the official p5.js reference to understand and confirm:  
createCanvas(), resizeCanvas(), background(), rect(), ellipse()  
random(), constrain(), frameCount  
DOM functions: createSlider(), createSpan(), position()  
Events: keyPressed(), mouseWheel(), windowResized()
