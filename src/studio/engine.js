export const STAGE_W = 480;
export const STAGE_H = 360;
export const SPRITE_SIZE = 48;
export const STEP_MS = 60; // time each motion block takes, so movement is visible

const num = (v, fallback = 0) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
};
const LIMIT_X = STAGE_W / 2 - SPRITE_SIZE / 2; // keep the whole sprite on the stage
const LIMIT_Y = STAGE_H / 2 - SPRITE_SIZE / 2;
const clampX = (x) => Math.max(-LIMIT_X, Math.min(LIMIT_X, x));
const clampY = (y) => Math.max(-LIMIT_Y, Math.min(LIMIT_Y, y));
const round = (n) => Math.round(n * 100) / 100;

export const createRuntime = (script) => ({
  program: script.map((b) => ({ ...b })), // snapshot: editing while playing doesn't affect the run
  pc: 0,
  left: null,
  readyAt: 0,
  bubbleUntil: 0,
});

export const isDone = (rt) => rt.pc >= rt.program.length;

// Runs at most one block for one sprite. Returns the new actor (position, direction, bubble).
export function advance(actor, rt, now) {
  let a = actor;
  if (a.bubble && now >= rt.bubbleUntil) a = { ...a, bubble: null };
  if (now < rt.readyAt || isDone(rt)) return a;

  const { type, params: p } = rt.program[rt.pc];
  switch (type) {
    case 'move': {
      const steps = num(p.steps);
      const rad = (a.dir * Math.PI) / 180;
      a = {
        ...a,
        x: round(clampX(a.x + steps * Math.sin(rad))),
        y: round(clampY(a.y + steps * Math.cos(rad))),
      };
      rt.pc++;
      rt.readyAt = now + STEP_MS;
      break;
    }
    case 'turn': {
      a = { ...a, dir: round((((a.dir + num(p.degrees)) % 360) + 360) % 360) };
      rt.pc++;
      rt.readyAt = now + STEP_MS;
      break;
    }
    case 'goto': {
      a = { ...a, x: clampX(num(p.x)), y: clampY(num(p.y)) };
      rt.pc++;
      rt.readyAt = now + STEP_MS;
      break;
    }
    case 'say':
    case 'think': {
      const ms = Math.max(0, num(p.secs)) * 1000;
      a = { ...a, bubble: { kind: type, text: String(p.text) } };
      rt.bubbleUntil = now + ms;
      rt.readyAt = now + ms;
      rt.pc++;
      break;
    }
    case 'repeat': {
      const times = num(p.times);
      rt.readyAt = now + STEP_MS;
      if (!(times > 0)) {
        rt.pc = 0; // blank / 0 = forever
      } else {
        if (rt.left === null) rt.left = times;
        if (rt.left > 0) {
          rt.left--;
          rt.pc = 0;
        } else {
          rt.left = null;
          rt.pc++;
        }
      }
      break;
    }
    default:
      rt.pc++;
  }
  return a;
}

// ---- Hero feature: collision-based animation swap ----

export const overlaps = (a, b) =>
  Math.abs(a.x - b.x) < SPRITE_SIZE * 0.9 && Math.abs(a.y - b.y) < SPRITE_SIZE * 0.9;

// Returns pairs that *started* touching this frame. `touching` remembers pairs that are still
// overlapping so a collision swaps once, and re-arms only after the sprites separate.
export function detectCollisions(ids, actors, touching) {
  const hits = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const key = `${ids[i]}|${ids[j]}`;
      if (overlaps(actors[ids[i]], actors[ids[j]])) {
        if (!touching.has(key)) {
          touching.add(key);
          hits.push([ids[i], ids[j]]);
        }
      } else {
        touching.delete(key);
      }
    }
  }
  return hits;
}

// Each sprite takes the other's animation and starts it from the top.
export function swapAnimations(rtA, rtB, now) {
  [rtA.program, rtB.program] = [rtB.program, rtA.program];
  for (const rt of [rtA, rtB]) {
    rt.pc = 0;
    rt.left = null;
    rt.readyAt = now;
  }
}
