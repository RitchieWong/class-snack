function tone(ctx, start, frequency, duration, type, gainValue) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(gainValue, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration);
}

function play(kind) {
  const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AudioContext) return;
  if (!play.context) play.context = new AudioContext();
  const ctx = play.context;
  if (ctx.state === "suspended") ctx.resume();
  const now = ctx.currentTime;
  if (kind === "crunch") {
    tone(ctx, now, 180, 0.08, "square", 0.025);
    tone(ctx, now + 0.09, 140, 0.07, "square", 0.018);
  } else if (kind === "gulp") {
    tone(ctx, now, 240, 0.12, "sine", 0.04);
    tone(ctx, now + 0.08, 150, 0.14, "sine", 0.03);
  } else if (kind === "catch") {
    tone(ctx, now, 520, 0.05, "triangle", 0.04);
    tone(ctx, now + 0.07, 180, 0.16, "triangle", 0.035);
  } else if (kind === "bell") {
    tone(ctx, now, 880, 0.25, "sine", 0.03);
    tone(ctx, now + 0.28, 880, 0.3, "sine", 0.025);
  }
}

const api = { play };
if (typeof module !== "undefined") module.exports = api;
