export const STAGE_W = 480;
export const STAGE_H = 360;
export const SPRITE_SIZE = 48;
// Motion is tweened at a constant speed (with a minimum duration) so it glides instead of jumping.
const MOVE_SPEED = 200; // steps per second
const TURN_SPEED = 360; // degrees per second
const MIN_MS = 120;
const MAX_BLOCKS_PER_FRAME = 100; // guards against loops made only of zero-time blocks

const num = (v, fallback = 0) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
};
const LIMIT_X = STAGE_W / 2 - SPRITE_SIZE / 2; // keep the whole sprite on the stage
const LIMIT_Y = STAGE_H / 2 - SPRITE_SIZE / 2;
export const clampX = (x) => Math.max(-LIMIT_X, Math.min(LIMIT_X, x));
export const clampY = (y) => Math.max(-LIMIT_Y, Math.min(LIMIT_Y, y));
const round = (n) => Math.round(n * 100) / 100;
const wrap = (d) => ((d % 360) + 360) % 360;

export const createRuntime = (script) => ({
  program: script.map((b) => ({ ...b })), // snapshot: editing while playing doesn't affect the run
  pc: 0,
  left: null, // loops remaining for the repeat block being run
  cur: null, // the block currently animating: { t0, dur, from, to }
  bubbleUntil: 0,
});

export const isDone = (rt) => rt.pc >= rt.program.length;

const motion = (a, to, ms) => ({ from: { x: a.x, y: a.y, dir: a.dir }, to, dur: Math.max(MIN_MS, ms) });

// Works out where a block takes the sprite and how long it takes.
function begin(a, { type, params: p }) {
  switch (type) {
    case 'move': {
      const steps = num(p.steps);
      const rad = (a.dir * Math.PI) / 180;
      const to = {
        x: round(clampX(a.x + steps * Math.sin(rad))),
        y: round(clampY(a.y + steps * Math.cos(rad))),
        dir: a.dir,
      };
      return motion(a, to, (Math.abs(steps) / MOVE_SPEED) * 1000);
    }
    case 'turn': {
      const degrees = num(p.degrees);
      return motion(a, { x: a.x, y: a.y, dir: a.dir + degrees }, (Math.abs(degrees) / TURN_SPEED) * 1000);
    }
    case 'goto': {
      const to = { x: clampX(num(p.x)), y: clampY(num(p.y)), dir: a.dir };
      return motion(a, to, (Math.hypot(to.x - a.x, to.y - a.y) / (MOVE_SPEED * 3)) * 1000);
    }
    default: {
      // say / think: hold still while the bubble shows
      const m = motion(a, { x: a.x, y: a.y, dir: a.dir }, 0);
      return { ...m, dur: Math.max(0, num(p.secs)) * 1000 };
    }
  }
}

// "repeat N" loops the animation back to the start; blank or 0 means forever.
function loop(rt, { params }) {
  const times = num(params.times);
  if (!(times > 0)) {
    rt.pc = 0;
    return;
  }
  if (rt.left === null) rt.left = times;
  rt.left--;
  if (rt.left > 0) {
    rt.pc = 0;
  } else {
    rt.left = null;
    rt.pc++;
  }
}

// Called every frame. Moves one sprite along its animation up to time `now`; returns the new actor.
export function advance(actor, rt, now) {
  let a = actor;
  if (a.bubble && now >= rt.bubbleUntil) a = { ...a, bubble: null };
  let t = now;

  for (let n = 0; n < MAX_BLOCKS_PER_FRAME && !isDone(rt); n++) {
    const block = rt.program[rt.pc];
    if (!rt.cur) {
      if (block.type === 'repeat') {
        loop(rt, block);
        continue;
      }
      rt.cur = { t0: t, ...begin(a, block) };
      if (block.type === 'say' || block.type === 'think') {
        a = { ...a, bubble: { kind: block.type, text: String(block.params.text) } };
        rt.bubbleUntil = t + rt.cur.dur;
      }
    }
    const { t0, dur, from, to } = rt.cur;
    const k = dur > 0 ? Math.min(1, (now - t0) / dur) : 1;
    a = {
      ...a,
      x: from.x + (to.x - from.x) * k,
      y: from.y + (to.y - from.y) * k,
      dir: round(wrap(from.dir + (to.dir - from.dir) * k)),
    };
    if (k < 1) break;
    rt.cur = null;
    rt.pc++;
    t = t0 + dur; // the next block starts exactly where this one ended, so chained moves stay smooth
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
export function swapAnimations(rtA, rtB) {
  [rtA.program, rtB.program] = [rtB.program, rtA.program];
  for (const rt of [rtA, rtB]) {
    rt.pc = 0;
    rt.left = null;
    rt.cur = null;
  }
}
