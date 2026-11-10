/** The demo "database": one object in memory, kept in localStorage so the demonstration survives a reload, restorable with one click. */
import { SEED_VERSION, makeSeed } from './seed';

const KEY = 'ava-showcase-db';
let db = null;
const listeners = new Set();
let timer = null;

function load() {
    try {
        const raw = window.localStorage.getItem(KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.version === SEED_VERSION) return parsed;
        }
    } catch { /* storage blocked or corrupt: start from the seed */ }
    return null;
}

export function getDb() {
    if (!db) db = load() ?? makeSeed();
    return db;
}

export function save() {
    clearTimeout(timer);
    timer = setTimeout(() => {
        try { window.localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* quota: keep working in memory */ }
    }, 50);
}

export function resetDb() {
    try { window.localStorage.removeItem(KEY); } catch { /* ignore */ }
    db = makeSeed();
    save();
    listeners.forEach((fn) => fn());
}

export const onReset = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

/** Next id of a table, kept by counter so a deleted row's id is never reused during a session. */
export function take(name, rows) {
    const d = getDb();
    d.counters[name] = Math.max(d.counters[name] ?? 0, rows.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0) + 1);
    return d.counters[name]++;
}
