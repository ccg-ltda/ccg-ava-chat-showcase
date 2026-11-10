/** A minimal browser for the mock layer: an origin and an in-memory localStorage. */
const store = new Map();
globalThis.window = {
  location: { origin: 'http://localhost', pathname: '/', search: '' },
  localStorage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
};
