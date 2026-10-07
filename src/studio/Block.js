import { BLOCK_DEFS, CATEGORIES } from './blocks';

function Field({ value, onChange, wide, placeholder }) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      spellCheck={false}
      className={`h-6 rounded-full bg-white px-1 text-center text-xs font-bold text-slate-700 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-white/80 ${
        wide ? 'w-20' : 'w-12'
      }`}
    />
  );
}

const LAYOUT = {
  move: (p, s) => (
    <>
      move <Field value={p.steps} onChange={s('steps')} /> steps
    </>
  ),
  turn: (p, s) => (
    <>
      turn ↻ <Field value={p.degrees} onChange={s('degrees')} /> degrees
    </>
  ),
  goto: (p, s) => (
    <>
      go to x: <Field value={p.x} onChange={s('x')} /> y: <Field value={p.y} onChange={s('y')} />
    </>
  ),
  say: (p, s) => (
    <>
      say <Field wide value={p.text} onChange={s('text')} /> for{' '}
      <Field value={p.secs} onChange={s('secs')} /> seconds
    </>
  ),
  think: (p, s) => (
    <>
      think <Field wide value={p.text} onChange={s('text')} /> for{' '}
      <Field value={p.secs} onChange={s('secs')} /> seconds
    </>
  ),
  repeat: (p, s) => (
    <>
      repeat animation <Field placeholder="∞" value={p.times} onChange={s('times')} /> times
    </>
  ),
};

export default function Block({ type, params, onParams, onRemove, dragProps }) {
  const cat = CATEGORIES[BLOCK_DEFS[type].cat];
  const setter = (key) => (value) => onParams({ ...params, [key]: value });
  return (
    <div
      {...dragProps}
      style={{ background: cat.color, borderColor: cat.dark }}
      className="group relative flex w-fit max-w-full cursor-grab select-none items-center gap-1.5 rounded-lg border-b-[3px] px-3 py-2 text-[13px] font-bold text-white shadow-sm active:cursor-grabbing"
    >
      <div className="flex flex-wrap items-center gap-1.5">{LAYOUT[type](params, setter)}</div>
      {onRemove && (
        <button
          type="button"
          aria-label="Remove block"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 hidden h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black/20 text-xs leading-none hover:bg-black/40 focus-visible:flex group-hover:flex"
        >
          ×
        </button>
      )}
    </div>
  );
}
