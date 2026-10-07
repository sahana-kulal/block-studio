import { useRef, useState } from 'react';
import Block from './Block';
import { MIME } from './blocks';

const indexFromPointer = (container, clientY) => {
  const els = [...container.querySelectorAll('[data-block]')];
  for (let i = 0; i < els.length; i++) {
    const r = els[i].getBoundingClientRect();
    if (clientY < r.top + r.height / 2) return i;
  }
  return els.length;
};


function setStackDragImage(e, wrapper, single) {
  const rect = wrapper.getBoundingClientRect();
  const ghost = document.createElement('div');
  ghost.style.cssText =
    'position:absolute;top:-9999px;left:-9999px;display:flex;flex-direction:column;gap:4px;pointer-events:none;';
  let el = wrapper;
  while (el) {
    if (el.hasAttribute('data-block')) {
      const copy = el.cloneNode(true);
      const original = el.querySelectorAll('input');
      copy.querySelectorAll('input').forEach((input, i) => {
        input.value = original[i].value;
      });
      ghost.appendChild(copy);
    }
    el = single ? null : el.nextElementSibling;
  }
  document.body.appendChild(ghost);
  e.dataTransfer.setDragImage(ghost, e.clientX - rect.left, e.clientY - rect.top);
  setTimeout(() => ghost.remove(), 0);
}

export default function ScriptArea({ script, spriteName, onDropAt, onParams, onRemove, onRun }) {
  const listRef = useRef(null);
  const [dropIndex, setDropIndex] = useState(null);
  const [dragIds, setDragIds] = useState([]); // blocks being carried, faded while dragging

  const handleDragOver = (e) => {
    if (!e.dataTransfer.types.includes(MIME)) return;
    e.preventDefault();
    setDropIndex(indexFromPointer(listRef.current, e.clientY));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData(MIME);
    const idx = indexFromPointer(listRef.current, e.clientY);
    setDropIndex(null);
    if (raw) onDropAt(idx, JSON.parse(raw));
  };

  const indicator = (
    <div key="drop" className="relative h-0">
      <div className="absolute inset-x-0 -top-1 h-1.5 rounded-full bg-slate-400/70" />
    </div>
  );

  const rows = [];
  script.forEach((b, i) => {
    if (dropIndex === i) rows.push(indicator);
    rows.push(
      <div key={b.id} data-block className={dragIds.includes(b.id) ? 'opacity-40' : ''}>
        <Block
          type={b.type}
          params={b.params}
          onParams={(p) => onParams(b.id, p)}
          onRemove={() => onRemove(b.id, true)}
          dragProps={{
            draggable: true,
            onDragStart: (e) => {
              e.dataTransfer.effectAllowed = 'copyMove';
              e.dataTransfer.setData(
                MIME,
                JSON.stringify({ from: 'script', id: b.id, single: e.shiftKey })
              );
              setStackDragImage(e, e.currentTarget.closest('[data-block]'), e.shiftKey);
              const ids = e.shiftKey ? [b.id] : script.slice(i).map((x) => x.id);
              setTimeout(() => setDragIds(ids), 0); // after the browser has taken its drag picture
            },
            onDragEnd: () => {
              setDropIndex(null);
              setDragIds([]);
            },
            onClick: onRun,
          }}
        />
      </div>
    );
  });
  if (dropIndex === script.length) rows.push(indicator);

  return (
    <section
      onDragOver={handleDragOver}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setDropIndex(null);
      }}
      onDrop={handleDrop}
      aria-label={`Script for ${spriteName}`}
      className="relative min-h-[320px] flex-1 overflow-auto bg-slate-50 p-6"
      style={{
        backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
    >
      <p className="mb-4 text-xs font-bold text-slate-400">Script for {spriteName}</p>
      <div ref={listRef} className="flex min-h-[200px] flex-col gap-1">
        {rows}
      </div>
      {script.length === 0 && dropIndex === null && (
        <p className="pointer-events-none absolute left-6 top-24 max-w-xs text-sm text-slate-400">
          Drag blocks here to build an animation for {spriteName}.
        </p>
      )}
    </section>
  );
}
