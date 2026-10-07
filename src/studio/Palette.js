import { useState } from 'react';
import Block from './Block';
import { BLOCK_DEFS, CATEGORIES, MIME, PALETTE } from './blocks';

const initialValues = () =>
  Object.fromEntries(Object.entries(BLOCK_DEFS).map(([k, v]) => [k, { ...v.defaults }]));

export default function Palette({ onRun, onDropRemove }) {
  const [cat, setCat] = useState('motion');
  const [values, setValues] = useState(initialValues);
  const [over, setOver] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setOver(false);
    const raw = e.dataTransfer.getData(MIME);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.from === 'script') onDropRemove(data.id, data.single);
  };

  return (
    <aside
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(MIME)) {
          e.preventDefault();
          setOver(true);
        }
      }}
      onDragLeave={() => setOver(false)}
      onDrop={handleDrop}
      className={`flex h-72 shrink-0 border-r border-slate-200 bg-white lg:h-auto lg:w-[24rem] ${
        over ? 'bg-rose-50' : ''
      }`}
    >
      <nav className="flex w-16 shrink-0 flex-col items-center gap-3 border-r border-slate-100 py-3">
        {Object.entries(CATEGORIES).map(([id, c]) => (
          <button
            key={id}
            type="button"
            onClick={() => setCat(id)}
            aria-pressed={cat === id}
            className={`flex w-14 flex-col items-center gap-1 rounded-lg py-1.5 text-[11px] font-bold text-slate-600 outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
              cat === id ? 'bg-slate-100' : 'hover:bg-slate-50'
            }`}
          >
            <span className="h-7 w-7 rounded-full" style={{ background: c.color }} />
            {c.label}
          </button>
        ))}
      </nav>

      <div className="flex-1 overflow-y-auto p-4">
        <h2 className="mb-3 text-sm font-extrabold text-slate-700">{CATEGORIES[cat].label}</h2>
        <div className="flex flex-col gap-3">
          {PALETTE[cat].map((type) => (
            <Block
              key={type}
              type={type}
              params={values[type]}
              onParams={(p) => setValues((v) => ({ ...v, [type]: p }))}
              dragProps={{
                draggable: true,
                onDragStart: (e) => {
                  e.dataTransfer.effectAllowed = 'copyMove';
                  e.dataTransfer.setData(
                    MIME,
                    JSON.stringify({ from: 'palette', type, params: values[type] })
                  );
                },
                onClick: () => onRun(type, values[type]),
              }}
            />
          ))}
        </div>
        <p className="mt-6 text-xs leading-relaxed text-slate-500">
          Click a block to run it on the selected sprite. Drag it into the script area to build an
          animation. Drag a block back here to delete it.
        </p>
      </div>
    </aside>
  );
}
