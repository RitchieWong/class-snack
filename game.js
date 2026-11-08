const core = require("./js/game.js");
const sfx = require("./audio/sfx.js");

const canvas = wx.createCanvas();
const ctx = canvas.getContext("2d");
const { windowWidth, windowHeight, pixelRatio } = wx.getSystemInfoSync();
canvas.width = windowWidth * pixelRatio;
canvas.height = windowHeight * pixelRatio;
ctx.scale(pixelRatio, pixelRatio);

let state = core.createState();
let last = Date.now();
let crunchAt = 0;
let seen = { bites: 0, catches: 0, outcome: null };

function reset() {
  state = core.createState();
  last = Date.now();
  seen = { bites: 0, catches: 0, outcome: null };
}

function playChanges() {
  if (state.bites > seen.bites) sfx.play("gulp");
  if (state.catches > seen.catches) sfx.play("catch");
  if (state.outcome && !seen.outcome) sfx.play("bell");
  if (state.holding && state.phase === "chewing" && state.time - crunchAt > 0.28) {
    sfx.play("crunch");
    crunchAt = state.time;
  }
  seen = { bites: state.bites, catches: state.catches, outcome: state.outcome };
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawTeacher(w, h) {
  const pose = state.teacher.mode;
  ctx.save();
  ctx.translate(w * 0.72, h * 0.2);
  if (pose === "approach") ctx.translate(-w * 0.16, h * 0.015);
  if (pose === "inspect") ctx.translate(-w * 0.25, h * 0.045);
  if (pose === "scan" || pose === "inspect") ctx.scale(-1, 1);
  if (pose === "warning") ctx.rotate(-0.18);
  ctx.fillStyle = "#efc7a8";
  ctx.beginPath();
  ctx.arc(0, 0, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#c9a27a";
  roundRect(-42, 34, 84, 118, 16);
  ctx.fill();
  ctx.restore();
}

function draw() {
  const w = windowWidth;
  const h = windowHeight;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#efe2cb";
  ctx.fillRect(0, 0, w, h * 0.48);
  ctx.fillStyle = "#234338";
  roundRect(28, 58, w - 56, h * 0.23, 10);
  ctx.fill();
  ctx.fillStyle = "#f4f7ef";
  ctx.font = "28px PingFang SC, sans-serif";
  ctx.fillText("y = 2x + 1", 58, 112);
  ctx.globalAlpha = state.teacher.mode === "warning" ? 0.45 : 0.8;
  ctx.fillText("当 x = 3 时", 58, 158);
  ctx.globalAlpha = 1;
  drawTeacher(w, h);

  ctx.fillStyle = "#a56b32";
  ctx.fillRect(0, h * 0.48, w, h * 0.52);
  ctx.fillStyle = "#f8f4e8";
  ctx.save();
  ctx.translate(48, h * 0.55);
  ctx.rotate(-0.08);
  ctx.fillRect(0, 0, 130, 92);
  ctx.restore();
  ctx.fillStyle = "#ef7d32";
  roundRect(w - 150, h * 0.62, 105, 78, 16);
  ctx.fill();
  ctx.fillStyle = "#f2c14f";
  ctx.beginPath();
  ctx.arc(w - 180, h * 0.75, 18, 0, Math.PI * 2);
  ctx.fill();

  const pose = state.teacher.mode;
  if (pose === "approach" || pose === "inspect") {
    ctx.fillStyle = pose === "inspect" ? "rgba(32,24,15,.28)" : "rgba(32,24,15,.16)";
    ctx.fillRect(0, h * 0.48, pose === "inspect" ? w : w * 0.48, h * 0.52);
  }
  state.chalks.forEach((chalk) => {
    ctx.fillStyle = "#f7f7f2";
    ctx.beginPath();
    ctx.arc(w * chalk.x, h * 0.58, 8, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = "#f0c7aa";
  ctx.save();
  const handX = state.phase === "idle" ? w - 40 : w - 150;
  const handY = state.phase === "idle" ? h - 120 : h * 0.58;
  ctx.translate(handX, handY);
  roundRect(-70, -18, 115, 42, 21);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "rgba(255,255,255,.5)";
  roundRect(28, h - 58, 150, 18, 9);
  ctx.fill();
  ctx.fillStyle = "#ef7d32";
  ctx.fillRect(28, h - 58, 150 * (state.phase === "chewing" ? state.progress : 0), 18);

  ctx.fillStyle = "#fffdf8";
  ctx.font = "700 18px PingFang SC, sans-serif";
  const left = Math.max(0, Math.ceil(core.RULES.duration - state.time));
  ctx.fillText(`剩 ${left} 秒`, 24, 34);
  ctx.fillText(`${state.bites}/${core.RULES.goal} 口`, w / 2 - 28, 34);
  ctx.fillText(`记名 ${state.catches}/2`, w - 105, 34);
  const danger = core.dangerText(state);
  if (danger) {
    ctx.fillStyle = "#ffe0b4";
    roundRect(24, h * 0.39, 190, 38, 8);
    ctx.fill();
    ctx.fillStyle = "#6d3518";
    ctx.font = "700 16px PingFang SC, sans-serif";
    ctx.fillText(danger, 38, h * 0.39 + 25);
  }
  if (state.time < state.toast.until) {
    ctx.fillStyle = "#3d2718";
    ctx.font = "800 28px PingFang SC, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(state.toast.text, w / 2, h * 0.5);
    ctx.textAlign = "left";
  }
  ctx.fillStyle = "rgba(255,248,236,.85)";
  ctx.font = "16px PingFang SC, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("按住吃 · 松手藏", w / 2, h - 18);
  ctx.textAlign = "left";

  if (state.outcome) {
    ctx.fillStyle = "rgba(26,37,32,.78)";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.font = "800 36px PingFang SC, sans-serif";
    const title = state.outcome === "cleared" ? "下课了，吃完啦" : state.outcome === "confiscated" ? "零食被没收" : "下课铃响了";
    ctx.fillText(title, w / 2, h * 0.38);
    ctx.font = "700 28px PingFang SC, sans-serif";
    ctx.fillText(`${state.score} 分`, w / 2, h * 0.46);
    ctx.font = "18px PingFang SC, sans-serif";
    const reason = state.reasons[0] || (state.outcome === "cleared" ? "老师走过去时，最后一口刚好咽下。" : `吃下 ${state.bites} 口`);
    ctx.fillText(reason, w / 2, h * 0.54);
    ctx.fillStyle = "#ef7d32";
    roundRect(w / 2 - 90, h * 0.63, 180, 54, 12);
    ctx.fill();
    ctx.fillStyle = "white";
    ctx.font = "700 22px PingFang SC, sans-serif";
    ctx.fillText("再上一节", w / 2, h * 0.63 + 35);
    ctx.textAlign = "left";
  }
}

function frame() {
  const now = Date.now();
  core.step(state, (now - last) / 1000);
  last = now;
  playChanges();
  draw();
  requestAnimationFrame(frame);
}

wx.onTouchStart((event) => {
  const touch = event.touches[0];
  if (state.outcome && touch.clientY > windowHeight * 0.6 && touch.clientY < windowHeight * 0.75) {
    reset();
    return;
  }
  core.pointerDown(state);
});
wx.onTouchEnd(() => core.pointerUp(state));
wx.onTouchCancel(() => core.pointerUp(state));
requestAnimationFrame(frame);
