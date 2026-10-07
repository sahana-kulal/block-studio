import { Cat } from './Stage';

export default function SpritePanel({ sprites, actors, selectedId, onSelect, onAdd, onDelete }) {
  const sel = actors[selectedId];
  const selected = sprites.find((s) => s.id === selectedId);
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-extrabold text-slate-700">Sprites</h2>
        <button
          type="button"
          onClick={onAdd}
          className="rounded-full bg-violet-600 px-3 py-1 text-xs font-bold text-white outline-none hover:bg-violet-700 focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2"
        >
          + Add sprite
        </button>
      </div>
      <ul className="flex flex-wrap gap-2">
        {sprites.map((s) => (
          <li key={s.id} className="relative">
            <button
              type="button"
              onClick={() => onSelect(s.id)}
              aria-pressed={s.id === selectedId}
              className={`flex w-20 flex-col items-center rounded-lg border-2 p-1.5 text-[11px] font-bold text-slate-600 outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
                s.id === selectedId ? 'border-violet-500 bg-violet-50' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="h-10 w-10">
                <Cat hue={s.hue} />
              </span>
              {s.name}
            </button>
            {sprites.length > 1 && (
              <button
                type="button"
                aria-label={`Delete ${s.name}`}
                onClick={() => onDelete(s.id)}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-600 text-xs text-white outline-none hover:bg-rose-500 focus-visible:ring-2 focus-visible:ring-rose-400"
              >
                ×
              </button>
            )}
          </li>
        ))}
      </ul>
      {sel && (
        <dl className="mt-3 flex gap-4 text-xs text-slate-500">
          <div><dt className="inline font-bold">x </dt><dd className="inline">{Math.round(sel.x)}</dd></div>
          <div><dt className="inline font-bold">y </dt><dd className="inline">{Math.round(sel.y)}</dd></div>
          <div><dt className="inline font-bold">direction </dt><dd className="inline">{Math.round(sel.dir)}</dd></div>
          <div className="ml-auto font-bold text-slate-400">{selected?.name}</div>
        </dl>
      )}
    </div>
  );
}
