export const MIME = 'application/x-block';

export const CATEGORIES = {
  motion: { label: 'Motion', color: '#4C97FF', dark: '#3373CC' },
  looks: { label: 'Looks', color: '#9966FF', dark: '#774DCB' },
  control: { label: 'Control', color: '#FFAB19', dark: '#CF8B17' },
};

// Param values are kept as raw strings so people can type "-" or "" mid-edit.
// An empty "times" on the repeat block means "forever".
export const BLOCK_DEFS = {
  move: { cat: 'motion', defaults: { steps: '10' } },
  turn: { cat: 'motion', defaults: { degrees: '15' } },
  goto: { cat: 'motion', defaults: { x: '0', y: '0' } },
  say: { cat: 'looks', defaults: { text: 'Hello!', secs: '2' } },
  think: { cat: 'looks', defaults: { text: 'Hmm...', secs: '2' } },
  repeat: { cat: 'control', defaults: { times: '10' } },
};

export const PALETTE = {
  motion: ['move', 'turn', 'goto'],
  looks: ['say', 'think'],
  control: ['repeat'],
};

let counter = 0;
export const makeBlock = (type, params) => ({
  id: `b${++counter}`,
  type,
  params: { ...BLOCK_DEFS[type].defaults, ...params },
});
