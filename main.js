// import { initStartScreen } from './start.js';


// let currentSketch;

// function switchTo(sketchFn) {
//   if (currentSketch && currentSketch.remove) {
//     currentSketch.remove(); // stop previous sketch
//   }
//   currentSketch = new p5(sketchFn); // start new sketch
// }

// initStartScreen(switchTo); // Start on main menu

import { initStartScreen } from './start.js';

let currentSketch;

export function switchTo(sketchFn) {
  if (currentSketch && currentSketch.remove) {
    currentSketch.remove();
  }
  currentSketch = new p5(sketchFn);
}

// Start on the main menu
switchTo(initStartScreen(switchTo));


