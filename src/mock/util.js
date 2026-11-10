/** Small helpers shared by the seed and the handlers. Everything is fictional and computed in the browser. */
export const MIN = 60_000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

export const iso = (ms) => new Date(ms).toISOString();
const pad = (n) => String(n).padStart(2, '0');

/** Workspace regional preferences of the demo Workspace: DD/MM/AAAA and 24 hours, Bogotá time (UTC-5, no DST). */
const OFFSET = -5 * HOUR;
const local = (value) => new Date(new Date(value).getTime() + OFFSET);
export const fmtDate = (value) => { const d = local(value); return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`; };
export const fmtTime = (value) => { const d = local(value); return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`; };
export const fmtDateTime = (value) => (value ? `${fmtDate(value)} ${fmtTime(value)}` : null);
export const ymd = (value) => { const d = local(value); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; };
export const localHour = (value) => local(value).getUTCHours();
export const startOfLocalDay = (value) => { const d = local(value); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - OFFSET; };

/** Deterministic pseudo-random numbers so the seed is the same on every restore. */
export function rng(seed = 7) {
    let s = seed >>> 0;
    return () => {
        s = (s + 0x6d2b79f5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export const clone = (value) => JSON.parse(JSON.stringify(value));
export const nextId = (rows) => rows.reduce((max, row) => Math.max(max, Number(row.id) || 0), 0) + 1;
export const lower = (v) => String(v ?? '').toLowerCase();
export const includes = (text, q) => lower(text).includes(lower(q));

export const PER_PAGE_OPTIONS = [10, 20, 30, 50, 100];

/** ListPagination of AVA Platform: `{ data, meta }`, prefixed query keys (`customers_page`, `customers_per_page`; users keep plain `page` / `per_page`). */
export function listPage(rows, query, section) {
    const pageKey = section === 'users' ? 'page' : `${section}_page`;
    const sizeKey = section === 'users' ? 'per_page' : `${section}_per_page`;
    const requested = Number(query[sizeKey]);
    const perPage = PER_PAGE_OPTIONS.includes(requested) ? requested : PER_PAGE_OPTIONS[0];
    const total = rows.length;
    const last = Math.max(1, Math.ceil(total / perPage));
    const current = Math.min(Math.max(1, Number(query[pageKey]) || 1), last);
    const data = rows.slice((current - 1) * perPage, current * perPage);
    return { page: { data, meta: { current_page: current, last_page: last, per_page: perPage, total, from: total ? (current - 1) * perPage + 1 : 0, to: total ? (current - 1) * perPage + data.length : 0 } }, perPage };
}

/** Paginator in the shape Laravel's `paginate()->through()` gives Inertia. */
export function paginate(rows, page = 1, perPage = 15, path = '') {
    const total = rows.length;
    const last = Math.max(1, Math.ceil(total / perPage));
    const current = Math.min(Math.max(1, Number(page) || 1), last);
    const data = rows.slice((current - 1) * perPage, current * perPage);
    const link = (p, label, active = false) => ({ url: p ? `${path}${path.includes('?') ? '&' : '?'}page=${p}` : null, label, active });
    return {
        data, current_page: current, last_page: last, per_page: perPage, total,
        from: total ? (current - 1) * perPage + 1 : null, to: total ? Math.min(current * perPage, total) : null,
        links: [link(current > 1 ? current - 1 : null, '&laquo; Anterior'), ...Array.from({ length: last }, (_, i) => link(i + 1, String(i + 1), i + 1 === current)), link(current < last ? current + 1 : null, 'Siguiente &raquo;')],
        prev_page_url: current > 1 ? `${path}${path.includes('?') ? '&' : '?'}page=${current - 1}` : null,
        next_page_url: current < last ? `${path}${path.includes('?') ? '&' : '?'}page=${current + 1}` : null,
    };
}
