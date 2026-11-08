const RULES = {
  duration: 45,
  goal: 5,
  lift: 0.6,
  chewFast: 1.5,
  chewSlow: 3,
  warning: 1,
  scan: 2,
  approach: 2.4,
  inspect: 0.8,
  depart: 1.2,
  maxCatches: 2,
};

const SCRIPT = [
  { type: "write", duration: 5.2 },
  { type: "scan" },
  { type: "write", duration: 4.1 },
  { type: "scan" },
  { type: "write", duration: 4.8 },
  { type: "patrol" },
  { type: "write", duration: 6 },
  { type: "scan" },
  { type: "write", duration: 4.4 },
  { type: "scan" },
  { type: "write", duration: 99 },
];

function createState() {
  return {
    time: 0,
    bites: 0,
    catches: 0,
    holding: false,
    phase: "idle",
    progress: 0,
    nearMiss: false,
    reasons: [],
    chalks: [],
    outcome: null,
    finishedAt: null,
    score: 0,
    teacher: { mode: "write", timer: 0, eventIndex: 0, side: "left" },
    toast: { text: "按住吃，松手藏", until: 4.2 },
    gulpUntil: 0,
    caughtFlash: 0,
  };
}

function teacherEvent(state) {
  return SCRIPT[state.teacher.eventIndex];
}

function visible(state) {
  return state.teacher.mode === "scan";
}

function inspecting(state) {
  return state.teacher.mode === "inspect";
}

function approaching(state) {
  return state.teacher.mode === "approach";
}

function dangerText(state) {
  if (approaching(state)) return "脚步从左侧越来越近";
  if (inspecting(state)) return "老师到了桌边";
  if (state.teacher.mode === "warning") return "停笔了，松手藏";
  if (visible(state)) return "老师在看这一排";
  return "";
}

function scoreOf(state) {
  const raw = state.bites * 100 + (state.bites >= RULES.goal && state.catches === 0 ? 100 : 0) - state.catches * 50;
  return Math.max(0, raw);
}

function finish(state, outcome) {
  if (state.outcome) return;
  state.outcome = outcome;
  state.finishedAt = state.time;
  state.holding = false;
  state.score = scoreOf(state);
  if (state.phase === "lifting") {
    state.phase = "idle";
    state.progress = 0;
  }
}

function catchPlayer(state, reason) {
  state.catches += 1;
  state.reasons.push(reason);
  state.phase = "idle";
  state.progress = 0;
  state.holding = false;
  state.caughtFlash = 0.55;
  state.chalks.push({ x: 0.62 + state.catches * 0.08, bounce: 1 });
  state.toast = {
    text: state.catches >= RULES.maxCatches ? "零食被没收了" : reason,
    until: state.time + 2.4,
  };
  if (state.catches >= RULES.maxCatches) finish(state, "confiscated");
}

function advanceTeacher(state) {
  state.teacher.eventIndex += 1;
  state.teacher.timer = 0;
  const next = teacherEvent(state);
  if (next.type === "patrol") {
    state.teacher.mode = "approach";
    state.teacher.side = "left";
    state.toast = { text: "左边有脚步", until: state.time + 1.6 };
  } else {
    state.teacher.mode = "write";
  }
}

function updateTeacher(state, dt) {
  if (state.outcome) return;
  const teacher = state.teacher;
  teacher.timer += dt;
  const event = teacherEvent(state);

  if (teacher.mode === "write" && teacher.timer >= event.duration) {
    teacher.mode = "warning";
    teacher.timer = 0;
    state.toast = { text: "停笔了，松手藏", until: state.time + RULES.warning };
  } else if (teacher.mode === "warning" && teacher.timer >= RULES.warning) {
    teacher.mode = "scan";
    teacher.timer = 0;
  } else if (teacher.mode === "scan" && teacher.timer >= RULES.scan) {
    advanceTeacher(state);
  } else if (teacher.mode === "approach" && teacher.timer >= RULES.approach) {
    teacher.mode = "inspect";
    teacher.timer = 0;
  } else if (teacher.mode === "inspect" && teacher.timer >= RULES.inspect) {
    if (state.phase === "chewing") {
      catchPlayer(state, "老师走到桌边时，你还没咽下");
    } else if (!state.outcome) {
      state.nearMiss = true;
      state.toast = { text: "好险，刚好咽下去", until: state.time + 1.8 };
    }
    if (!state.outcome) {
      teacher.mode = "depart";
      teacher.timer = 0;
    }
  } else if (teacher.mode === "depart" && teacher.timer >= RULES.depart) {
    advanceTeacher(state);
  }
}

function updateEating(state, dt) {
  if (state.outcome && state.phase !== "chewing") return;
  if (state.phase === "lifting") {
    if (!state.holding) {
      state.phase = "idle";
      state.progress = 0;
      return;
    }
    state.progress += dt / RULES.lift;
    if (state.progress >= 1) {
      state.phase = "chewing";
      state.progress = 0;
    }
  } else if (state.phase === "chewing") {
    const duration = state.holding ? RULES.chewFast : RULES.chewSlow;
    state.progress += dt / duration;
    if (state.progress >= 1) {
      state.bites += 1;
      state.phase = "idle";
      state.progress = 0;
      state.gulpUntil = state.time + 0.45;
      state.toast = { text: `咕咚，${state.bites}/${RULES.goal} 口`, until: state.time + 0.9 };
      if (state.bites >= RULES.goal) finish(state, "cleared");
    }
  }
}

function step(state, dt) {
  if (state.outcome) return state;
  const frame = Math.min(Math.max(dt, 0), 0.1);
  state.time += frame;
  updateTeacher(state, frame);
  updateEating(state, frame);

  if (!state.outcome && visible(state) && state.phase === "lifting") {
    catchPlayer(state, "老师看这一排时，你还没把手收回去");
  }
  if (!state.outcome && state.bites >= RULES.goal) finish(state, "cleared");
  if (!state.outcome && state.time >= RULES.duration) finish(state, "bell");
  if (state.caughtFlash > 0) state.caughtFlash = Math.max(0, state.caughtFlash - frame);
  return state;
}

function pointerDown(state) {
  if (state.outcome || state.phase === "lifting" || state.phase === "chewing") {
    state.holding = state.phase === "chewing" || state.phase === "lifting";
    if (state.phase === "idle" || state.outcome) return state;
  }
  if (state.phase === "idle") {
    state.phase = "lifting";
    state.progress = 0;
  }
  state.holding = true;
  return state;
}

function pointerUp(state) {
  state.holding = false;
  return state;
}

const api = { RULES, SCRIPT, createState, step, pointerDown, pointerUp, dangerText, visible, inspecting, approaching };
if (typeof module !== "undefined") module.exports = api;
