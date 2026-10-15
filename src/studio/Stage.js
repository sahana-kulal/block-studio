import { useRef } from 'react';
import { SPRITE_SIZE, STAGE_H, STAGE_W } from './engine';

export function Cat({ hue }) {
  const fur = `hsl(${hue} 90% 58%)`;
  const edge = `hsl(${hue} 70% 34%)`;
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full">
      <path d="M16 46 L20 10 L47 30 Z" fill={fur} stroke={edge} strokeWidth="3" strokeLinejoin="round" />
      <path d="M84 46 L80 10 L53 30 Z" fill={fur} stroke={edge} strokeWidth="3" strokeLinejoin="round" />
      <ellipse cx="50" cy="56" rx="38" ry="34" fill={fur} stroke={edge} strokeWidth="3" />
      <circle cx="36" cy="50" r="7" fill="#fff" />
      <circle cx="64" cy="50" r="7" fill="#fff" />
      <circle cx="39" cy="50" r="3.5" fill="#1e293b" />
      <circle cx="67" cy="50" r="3.5" fill="#1e293b" />
      <path d="M45 62 L55 62 L50 68 Z" fill="#fb7185" />
      <path d="M50 68 Q46 74 41 72 M50 68 Q54 74 59 72" stroke={edge} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M14 60 L30 62 M14 70 L30 67 M86 60 L70 62 M86 70 L70 67" stroke={edge} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function Bubble({ bubble }) {
  const think = bubble.kind === 'think';
  return (
    <div className="absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2">
      <div
        className={`relative w-max max-w-[150px] border-2 border-slate-300 bg-white px-3 py-1.5 text-center text-xs font-bold text-slate-700 shadow-sm ${
          think ? 'rounded-[18px]' : 'rounded-xl'
        }`}
      >
        {bubble.text}
        {think ? (
          <>
            <span className="absolute -bottom-3 left-1/2 h-2.5 w-2.5 rounded-full border-2 border-slate-300 bg-white" />
            <span className="absolute -bottom-5 left-[55%] h-1.5 w-1.5 rounded-full border-2 border-slate-300 bg-white" />
          </>
        ) : (
          <span className="absolute -bottom-[7px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-slate-300 bg-white" />
        )}
      </div>
    </div>
  );
}

export default function Stage({ sprites, actors, selectedId, toast, onSelect, onDrag, onDragEnd }) {
  const stageRef = useRef(null);
  const grab = useRef(null); // { id, dx, dy }: where inside the sprite the pointer took hold

  // Pointer position -> stage coordinates (origin at the centre, y up)
  const toStage = (e) => {
    const r = stageRef.current.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * STAGE_W - STAGE_W / 2,
      y: STAGE_H / 2 - ((e.clientY - r.top) / r.height) * STAGE_H,
    };
  };
  const startDrag = (e, id, a) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toStage(e);
    grab.current = { id, dx: a.x - p.x, dy: a.y - p.y };
    onSelect(id);
  };
  const moveDrag = (e) => {
    if (!grab.current) return;
    const p = toStage(e);
    onDrag(grab.current.id, p.x + grab.current.dx, p.y + grab.current.dy);
  };
  const endDrag = () => {
    if (!grab.current) return;
    onDragEnd(grab.current.id);
    grab.current = null;
  };

  return (
    <div
      ref={stageRef}
      className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-slate-300 bg-white"
      role="img"
      aria-label="Stage"
    >
      <div className="absolute inset-x-0 top-1/2 h-px bg-slate-100" />
      <div className="absolute inset-y-0 left-1/2 w-px bg-slate-100" />
      {sprites.map((s) => {
        const a = actors[s.id];
        if (!a) return null;
        return (
          <div
            key={s.id}
            className="absolute cursor-grab touch-none active:cursor-grabbing"
            onPointerDown={(e) => startDrag(e, s.id, a)}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            style={{
              left: `${((a.x + STAGE_W / 2) / STAGE_W) * 100}%`,
              top: `${((STAGE_H / 2 - a.y) / STAGE_H) * 100}%`,
              width: `${(SPRITE_SIZE / STAGE_W) * 100}%`,
              aspectRatio: '1',
              transform: 'translate(-50%, -50%)',
            }}
          >
            {a.bubble && <Bubble bubble={a.bubble} />}
            <div
              className={`h-full w-full ${s.id === selectedId ? 'drop-shadow-[0_0_4px_rgba(99,102,241,0.8)]' : ''}`}
              style={{ transform: `rotate(${a.dir - 90}deg)` }}
            >
              <Cat hue={s.hue} />
            </div>
          </div>
        );
      })}
      {toast && (
        <div className="absolute inset-x-0 bottom-2 flex justify-center">
          <span className="rounded-full bg-slate-800/90 px-3 py-1 text-xs font-bold text-white">
            {toast}
          </span>
        </div>
      )}
    </div>
  );
}
