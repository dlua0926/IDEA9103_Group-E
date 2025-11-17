Group E
1. Instructions for Interaction
Load: Open index.html in a browser. The generative grid and animation will load immediately.

Play/Pause: Press the P key to toggle the animation on or off.

Regenerate: Press the R key to generate a completely new city layout and reset the game agents.

2. Animation Approach & Individual Contribution
Animation Driver
My implementation is driven by Time. I used millis() to calculate time deltas, ensuring smooth movement and consistent event cycling (e.g., Ghost mode switching) regardless of the frame rate.

Unique Aspects & Collaboration
While the group established the foundational grid generator, my individual contribution focused on Agent-based Logic:

My Focus: Unlike other group members who animated visual properties like Color Shifting or Block Resizing, my work keeps the grid static but introduces moving agents (Pac-Man and Ghosts) that navigate the generated "roads."

Differentiation: This contrasts with teammates who modified the grid geometry itself. My approach treats the group's generated art as a "level map" for a narrative element.

Inspiration
Visuals: Broadway Boogie Woogie (Piet Mondrian). The yellow lines in the original painting resemble city streets, which naturally suggested a Pac-Man maze.

Mechanics: Classic Arcade movement. The "jittery" nature of the original painting's small squares inspired the scattered movement of the Ghosts.

3. Technical Implementation
How it Works
Map Generation: The sketch.js file generates a weighted grid, storing the coordinates of "roads" (yellow gaps) in global arrays (xs, ys, gapX, gapY).

Agent Navigation: The PacmanModule in timebased.js reads these coordinates. Agents do not move freely; they are constrained to the specific x and y values of the generated roads.

Intersection Logic: As agents move, the code constantly checks if they are crossing an intersection. If so, a probability factor (15%) determines if they should turn onto a perpendicular road.

Modifications to Group Code
I encapsulated the animation logic into a separate file (timebased.js) using the Module Pattern (IIFE).

Why: This prevents variable conflicts with the main sketch.js file and keeps the "Game Logic" separate from the "Art Generation."

Modifications: I added global window assignments in sketch.js (e.g., window.colW = colW) to allow the external module to access the generated layout data.

External Techniques
Technique: JavaScript Module Pattern (IIFE).

Source/Reasoning: Standard JavaScript design pattern. I used this to ensure my animation variables (like ghostMode or mouthTimer) did not pollute the global scope shared with my group members' code.
