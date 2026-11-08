const assert = require("node:assert/strict");
const game = require("../js/game.js");

function holdFor(state, seconds) {
  game.pointerDown(state);
  let left = seconds;
  while (left > 0) {
    const dt = Math.min(0.05, left);
    game.step(state, dt);
    left -= dt;
  }
}

{
  const state = game.createState();
  holdFor(state, 0.3);
  game.pointerUp(state);
  game.step(state, 0.05);
  assert.equal(state.phase, "idle");
  assert.equal(state.progress, 0);
}

{
  const state = game.createState();
  holdFor(state, 0.65);
  assert.equal(state.phase, "chewing");
  game.pointerUp(state);
  holdFor(state, 3.1);
  assert.equal(state.bites, 1);
  assert.equal(state.phase, "idle");
}

{
  const state = game.createState();
  state.teacher.mode = "scan";
  game.pointerDown(state);
  game.step(state, 0.05);
  assert.equal(state.catches, 1);
  assert.match(state.reasons[0], /手/);
  assert.equal(state.phase, "idle");
}

{
  const state = game.createState();
  state.teacher.mode = "scan";
  state.phase = "chewing";
  state.progress = 0.4;
  game.step(state, 0.05);
  assert.equal(state.catches, 0);
  assert.equal(state.phase, "chewing");
}

{
  const state = game.createState();
  state.teacher = { mode: "inspect", timer: 0.75, eventIndex: 5, side: "left" };
  state.phase = "chewing";
  state.progress = 0.2;
  game.step(state, 0.1);
  assert.equal(state.catches, 1);
  assert.match(state.reasons[0], /还没咽下/);
}

{
  const state = game.createState();
  state.teacher = { mode: "inspect", timer: 0.75, eventIndex: 5, side: "left" };
  state.phase = "idle";
  game.step(state, 0.1);
  assert.equal(state.catches, 0);
  assert.equal(state.nearMiss, true);
  assert.equal(state.teacher.mode, "depart");
}

{
  const state = game.createState();
  state.catches = 0;
  state.time = 20;
  state.phase = "chewing";
  state.bites = 4;
  state.progress = 0.2;
  state.holding = true;
  for (let i = 0; i < 15; i += 1) game.step(state, 0.1);
  assert.equal(state.outcome, "cleared");
  assert.equal(state.score, 600);
}

{
  const state = game.createState();
  state.bites = 3;
  state.catches = 1;
  state.time = 44.98;
  game.step(state, 0.05);
  assert.equal(state.outcome, "bell");
  assert.equal(state.score, 250);
}

{
  const state = game.createState();
  state.catches = 1;
  state.teacher.mode = "scan";
  game.pointerDown(state);
  game.step(state, 0.05);
  assert.equal(state.outcome, "confiscated");
  assert.equal(state.catches, 2);
}

console.log("9 checks passed");
