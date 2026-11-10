/** Route table of AVA Platform (names and URI patterns only; no controllers). Same role as Ziggy in the real frontend. */
import base from './routes.json';

/** Screens that exist only in the showcase (AVA Voz reference, guide and simulated scenarios). */
const table = { ...base, 'demo.voice': ['GET', '/demo/ava-voz'], 'demo.docs': ['GET', '/demo/documentacion/{section}'], 'demo.docs.index': ['GET', '/demo/documentacion'], 'demo.scenarios': ['GET', '/demo/escenarios'], logout: ['POST', '/logout'], 'verification.send': ['POST', '/email/verification-notification'], 'password.update': ['PUT', '/password'] };

const entries = Object.entries(table).map(([name, [method, uri]]) => {
    const params = [];
    const source = uri.replace(/[.*+?^${}()|[\]\\]/g, (c) => (c === '{' || c === '}' ? c : `\\${c}`)).replace(/\{(\w+)\??\}/g, (_, p) => { params.push(p); return '([^/]+)'; });
    return { name, method, uri, params, regex: new RegExp(`^${source}$`), statics: uri.split('/').filter((s) => s && !s.startsWith('{')).length };
});

export const routeUri = (name) => table[name]?.[1];

/** Finds the route of a path. `verb` 'get' prefers GET routes; any other verb prefers the same method and then any non-GET route. */
export function match(path, verb = 'get') {
    const candidates = entries.filter((e) => e.regex.test(path));
    if (!candidates.length) return null;
    const isGet = verb.toLowerCase() === 'get';
    const pool = candidates.filter((e) => (e.method === 'GET') === isGet);
    const list = (pool.length ? pool : candidates).sort((a, b) => b.statics - a.statics);
    const best = (isGet ? list : list.filter((e) => e.method.toLowerCase() === verb.toLowerCase())[0] ? list.filter((e) => e.method.toLowerCase() === verb.toLowerCase()) : list)[0];
    const values = best.regex.exec(path).slice(1).map(decodeURIComponent);
    return { name: best.name, params: Object.fromEntries(best.params.map((p, i) => [p, values[i]])) };
}

export function build(name, params = {}, query = true) {
    const uri = routeUri(name);
    if (!uri) throw new Error(`Unknown route: ${name}`);
    const names = [...uri.matchAll(/\{(\w+)\??\}/g)].map((m) => m[1]);
    const given = Array.isArray(params) ? params : params !== null && typeof params === 'object' && !(names.some((n) => n in params)) && !Object.keys(params).length ? [] : params;
    const positional = Array.isArray(given) || typeof given !== 'object';
    const list = positional ? [].concat(given) : null;
    const used = new Set();
    const pick = (v) => (v !== null && typeof v === 'object' ? (v.id ?? v.key ?? v.slug) : v);
    const path = uri.replace(/\{(\w+)\??\}/g, (_, p) => {
        const i = names.indexOf(p);
        const v = positional ? list[i] : given[p];
        used.add(p);
        return v === undefined ? '' : encodeURIComponent(pick(v));
    });
    const rest = positional ? {} : Object.fromEntries(Object.entries(given).filter(([k]) => !used.has(k)));
    const q = new URLSearchParams();
    if (query) Object.entries(rest).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') q.set(k, String(v)); });
    const s = q.toString();
    return path.replace(/\/$/, '') + (s ? `?${s}` : '') || '/';
}
