import { useEffect, useRef, useState } from 'react';
import Palette from './Palette';
import ScriptArea from './ScriptArea';
import Stage from './Stage';
import SpritePanel from './SpritePanel';
import { makeBlock } from './blocks';
import { addBlock, moveStack, removeStack, updateParams } from './scriptOps';
import { advance, createRuntime, detectCollisions, isDone, swapAnimations } from './engine';

const HUES = [28, 205, 145, 330, 262, 8];
const SPAWNS = [[-120, 0], [120, 0], [0, 100], [0, -100], [-170, 90], [170, -90]];

const newSprite = (n, script = []) => ({
  id: `s${n}`,
  name: `Sprite${n}`,
  hue: HUES[(n - 1) % HUES.length],
  script,
});
const spawnActor = (n, at) => {
  const [x, y] = at ?? SPAWNS[(n - 1) % SPAWNS.length];
  return { x, y, dir: 90, bubble: null };
};

export default function App() {
  const [sprites, setSprites] = useState(() => [newSprite(1)]);
  const [selectedId, setSelectedId] = useState('s1');
  const [actors, setActors] = useState(() => ({ s1: spawnActor(1) }));
  const [running, setRunning] = useState(false);
  const [toast, setToast] = useState(null);

  const actorsRef = useRef(actors);
  const spritesRef = useRef(sprites);
  spritesRef.current = sprites;
  const runtimes = useRef({});
  const touching = useRef(new Set());
  const startPositions = useRef(null);
  const nextN = useRef(2);
  const toastTimer = useRef(null);
  const originals = useRef({}); // scripts as the user wrote them, before any collision swap
  const shown = useRef({}); // scripts currently displayed because of a swap

  const setActorState = (fn) => {
    actorsRef.current = fn(actorsRef.current);
    setActors(actorsRef.current);
  };
  const showToast = (text) => {
    setToast(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  };

  const selected = sprites.find((s) => s.id === selectedId) ?? sprites[0];
  const editScript = (fn) =>
    setSprites((list) => list.map((s) => (s.id === selected.id ? { ...s, script: fn(s.script) } : s)));

  // The editor shows the swapped scripts during a run; the originals come back when it ends.
  const swapShownScripts = (a, b) => {
    const orig = originals.current;
    const disp = shown.current;
    setSprites((list) => {
      const sa = list.find((s) => s.id === a);
      const sb = list.find((s) => s.id === b);
      if (!sa || !sb) return list;
      orig[a] ??= sa.script;
      orig[b] ??= sb.script;
      disp[a] = sb.script;
      disp[b] = sa.script;
      return list.map((s) =>
        s.id === a ? { ...s, script: sb.script } : s.id === b ? { ...s, script: sa.script } : s
      );
    });
  };

  useEffect(() => {
    if (running) return;
    const orig = originals.current;
    const disp = shown.current;
    originals.current = {};
    shown.current = {};
    setSprites((list) =>
      list.map((s) => (orig[s.id] && s.script === disp[s.id] ? { ...s, script: orig[s.id] } : s))
    );
  }, [running]);

  // ---- editing ----
  const handleDropAt = (idx, data) => {
    if (data.from === 'palette') {
      editScript((sc) => addBlock(sc, idx, makeBlock(data.type, data.params)));
    } else {
      editScript((sc) => moveStack(sc, data.id, idx, data.single));
    }
  };

  const addSprite = () => {
    const n = nextN.current++;
    const sprite = newSprite(n);
    setSprites((l) => [...l, sprite]);
    setActorState((a) => ({ ...a, [sprite.id]: spawnActor(n) }));
    setSelectedId(sprite.id);
  };

  const deleteSprite = (id) => {
    const rest = sprites.filter((s) => s.id !== id);
    setSprites(rest);
    setActorState(({ [id]: _gone, ...others }) => others);
    delete runtimes.current[id];
    if (selectedId === id) setSelectedId(rest[0].id);
  };

  // ---- playback ----
  const clearBubbles = () =>
    setActorState((a) =>
      Object.fromEntries(Object.entries(a).map(([id, v]) => [id, { ...v, bubble: null }]))
    );

  const play = () => {
    startPositions.current = actorsRef.current;
    runtimes.current = Object.fromEntries(sprites.map((s) => [s.id, createRuntime(s.script)]));
    clearBubbles();
    // Sprites already overlapping at the start shouldn't swap until they separate and re-collide.
    touching.current = new Set();
    detectCollisions(sprites.map((s) => s.id), actorsRef.current, touching.current);
    setRunning(true);
  };

  // Scratch-style: clicking a block or script runs it right away on the selected sprite.
  const runProgram = (spriteId, program) => {
    if (!program.length) return;
    if (!running) {
      startPositions.current = actorsRef.current;
      runtimes.current = {};
      touching.current = new Set();
      clearBubbles();
      setRunning(true);
    }
    runtimes.current[spriteId] = createRuntime(program);
  };

  const stop = () => {
    setRunning(false);
    clearBubbles();
  };

  const reset = () => {
    setRunning(false);
    if (startPositions.current) {
      const saved = startPositions.current;
      setActorState((a) =>
        Object.fromEntries(
          Object.entries(a).map(([id, v]) => [id, { ...(saved[id] ?? v), bubble: null }])
        )
      );
    }
  };

  const loadDemo = () => {
    setRunning(false);
    const demo = [
      newSprite(1, [makeBlock('move', { steps: '10' }), makeBlock('repeat', { times: '' })]),
      newSprite(2, [makeBlock('move', { steps: '-10' }), makeBlock('repeat', { times: '' })]),
    ];
    nextN.current = 3;
    startPositions.current = null;
    setSprites(demo);
    setSelectedId('s1');
    setActorState(() => ({ s1: spawnActor(1, [-170, 0]), s2: spawnActor(2, [170, 0]) }));
    showToast('Demo loaded. Press the green flag.');
  };

  useEffect(() => {
    if (!running) return undefined;
    let raf;
    const loop = () => {
      const now = performance.now();
      const ids = Object.keys(runtimes.current).filter((id) => actorsRef.current[id]);
      const next = { ...actorsRef.current };
      for (const id of ids) next[id] = advance(next[id], runtimes.current[id], now);

      for (const [a, b] of detectCollisions(ids, next, touching.current)) {
        swapAnimations(runtimes.current[a], runtimes.current[b], now);
        swapShownScripts(a, b);
        const name = (id) => spritesRef.current.find((s) => s.id === id)?.name ?? id;
        showToast(`${name(a)} and ${name(b)} collided: animations swapped`);
      }

      actorsRef.current = next;
      setActors(next);

      const finished = ids.every((id) => isDone(runtimes.current[id]) && !next[id].bubble);
      if (finished) setRunning(false);
      else raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  const ctrl =
    'flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 disabled:opacity-40';

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 text-slate-800 lg:h-screen">
      <header className="flex items-center justify-between bg-violet-600 px-4 py-2.5 text-white">
        <h1 className="text-lg font-extrabold">Block Studio</h1>
        <button
          type="button"
          onClick={loadDemo}
          className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold outline-none hover:bg-white/30 focus-visible:ring-2 focus-visible:ring-white"
        >
          Load collision demo
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="order-2 flex flex-col lg:order-1 lg:flex-row">
          <Palette
            onRun={(type, params) => {
              if (type !== 'repeat') runProgram(selected.id, [makeBlock(type, params)]);
            }}
            onDropRemove={(id, single) => editScript((sc) => removeStack(sc, id, single))}
          />
        </div>

        <main className="order-3 flex min-h-0 flex-1 flex-col lg:order-2">
          <ScriptArea
            script={selected.script}
            spriteName={selected.name + (shown.current[selected.id] === selected.script ? ' (swapped animation)' : '')}
            onRun={() => runProgram(selected.id, selected.script)}
            onDropAt={handleDropAt}
            onParams={(id, p) => editScript((sc) => updateParams(sc, id, p))}
            onRemove={(id, single) => editScript((sc) => removeStack(sc, id, single))}
          />
        </main>

        <aside className="order-1 flex w-full shrink-0 flex-col gap-3 overflow-y-auto p-3 lg:order-3 lg:w-[500px]">
          <div className="flex items-center gap-2">
            <button type="button" onClick={play} disabled={running} className={`${ctrl} bg-emerald-500 text-white hover:bg-emerald-600`}>
              <span aria-hidden>⚑</span> Play all
            </button>
            <button type="button" onClick={stop} disabled={!running} className={`${ctrl} bg-rose-500 text-white hover:bg-rose-600`}>
              <span aria-hidden>■</span> Stop
            </button>
            <button type="button" onClick={reset} className={`${ctrl} bg-white text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50`}>
              Reset positions
            </button>
          </div>
          <Stage sprites={sprites} actors={actors} selectedId={selected.id} toast={toast} />
          <SpritePanel
            sprites={sprites}
            actors={actors}
            selectedId={selected.id}
            onSelect={setSelectedId}
            onAdd={addSprite}
            onDelete={deleteSprite}
          />
        </aside>
      </div>
    </div>
  );
}
