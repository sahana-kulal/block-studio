const insertAt = (list, idx, items) => [...list.slice(0, idx), ...items, ...list.slice(idx)];

export const addBlock = (script, idx, block) => insertAt(script, idx, [block]);

export const updateParams = (script, id, params) =>
  script.map((b) => (b.id === id ? { ...b, params } : b));

// Like Scratch, grabbing a block takes everything below it. `single` (Shift) takes just that block.
const grab = (script, id, single) => {
  const i = script.findIndex((b) => b.id === id);
  if (i < 0) return [];
  return single ? [script[i]] : script.slice(i);
};

export const removeStack = (script, id, single) => {
  const taken = grab(script, id, single);
  return script.filter((b) => !taken.includes(b));
};

export const moveStack = (script, id, idx, single) => {
  const taken = grab(script, id, single);
  if (!taken.length) return script;
  const rest = script.filter((b) => !taken.includes(b));
  const target = script.slice(0, idx).filter((b) => !taken.includes(b)).length;
  return insertAt(rest, target, taken);
};
