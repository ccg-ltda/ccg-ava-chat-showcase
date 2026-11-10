/**
 * The in-browser "server" of the showcase. It answers what the real pages ask of Laravel: pages (Inertia props), form submissions and JSON calls.
 * Handlers are registered by ROUTE NAME (the same names as AVA Platform's routes) in ./handlers. Nothing here touches the network.
 */
import { getDb, onReset, resetDb, save } from './db';
import { match } from './routes';
import { sharedProps } from './shared';

const registry = { get: {}, mut: {}, api: {} };
export const reg = {
    get: (name, fn) => { registry.get[name] = fn; },
    mut: (name, fn) => { registry.mut[name] = fn; },
    api: (name, fn) => { registry.api[name] = fn; },
};

export const unhandled = new Set();

function parseQuery(search = '') {
    const out = {};
    new URLSearchParams(search).forEach((value, key) => {
        if (key.endsWith('[]')) { const k = key.slice(0, -2); out[k] = [...(out[k] ?? []), value]; } else out[key] = value;
    });
    return out;
}

const listeners = new Set();

function context(name, params, query, data, url) {
    return { name, params, query, data: data ?? {}, url, db: getDb(), flash: null };
}

export const mock = {
    onChange: (fn) => { listeners.add(fn); onReset(fn); return () => listeners.delete(fn); },
    reset: () => resetDb(),

    /** A page: `{ component, props, url, routeName }` or `{ redirect }`. */
    get(url, { flash = null } = {}) {
        const [path, search = ''] = url.split('?');
        if (path === '/') return { redirect: '/dashboard' };
        const hit = match(path, 'get');
        const handler = hit && registry.get[hit.name];
        if (!hit || !handler) {
            if (hit) unhandled.add(`GET ${hit.name}`);
            return { component: 'Demo/NotInDemo', props: { ...sharedProps(getDb(), flash), routeName: hit?.name ?? null, path }, url, routeName: hit?.name ?? null };
        }
        const result = handler(context(hit.name, hit.params, parseQuery(search), {}, url));
        if (result?.redirect) return { redirect: result.redirect };
        return { component: result.component, props: { errors: {}, ...sharedProps(getDb(), flash), ...result.props }, url, routeName: hit.name };
    },

    /** A form submission or action. Returns `{ errors?, redirect?, flash? }`. */
    mutate(verb, url, data) {
        const [path, search = ''] = url.split('?');
        const hit = match(path, verb);
        const handler = hit && registry.mut[hit.name];
        if (!hit || !handler) {
            unhandled.add(`${verb.toUpperCase()} ${hit?.name ?? path}`);
            return { flash: { warning: 'Demostración: esta acción no está simulada y no cambió ningún dato.' } };
        }
        const outcome = handler(context(hit.name, hit.params, parseQuery(search), data, url)) ?? {};
        save();
        return outcome;
    },

    /** A JSON call (fetch / axios): `{ status, json }`. */
    api(verb, url, body) {
        const [path, search = ''] = url.split('?');
        const hit = match(path, verb);
        if (!hit) return { status: 404, json: { message: 'No existe en la demostración.' } };
        const api = registry.api[hit.name];
        if (api) {
            const out = api(context(hit.name, hit.params, parseQuery(search), body, url));
            save();
            return out.status ? out : { status: 200, json: out };
        }
        const mut = registry.mut[hit.name];
        if (mut && verb.toLowerCase() !== 'get') {
            const out = mut(context(hit.name, hit.params, parseQuery(search), body, url)) ?? {};
            save();
            return out.errors ? { status: 422, json: { errors: out.errors, message: Object.values(out.errors)[0] } } : { status: 200, json: { ok: true, ...(out.json ?? {}) } };
        }
        unhandled.add(`API ${verb.toUpperCase()} ${hit.name}`);
        return { status: 404, json: { message: 'Esta función no está simulada en la demostración.' } };
    },
};

/** Network guard: the showcase never talks to anything outside its own page. Same-origin calls are answered by the mock; the rest is refused. */
export function installNetworkGuard() {
    const real = window.fetch.bind(window);
    window.fetch = async (input, init = {}) => {
        const raw = typeof input === 'string' ? input : input.url;
        const url = new URL(raw, window.location.origin);
        const method = (init.method ?? (typeof input !== 'string' ? input.method : 'GET') ?? 'GET').toLowerCase();
        if (url.origin !== window.location.origin) throw new TypeError('Showcase: external network calls are disabled.');
        if (/\.(js|css|png|jpg|jpeg|svg|woff2?|ico|json)$/.test(url.pathname) || url.pathname.startsWith('/assets/') || url.pathname.startsWith('/brand/')) return real(input, init);
        let body = init.body;
        if (typeof body === 'string') { try { body = JSON.parse(body); } catch { /* keep as text */ } }
        const { status, json } = mock.api(method, url.pathname + url.search, body);
        return new Response(JSON.stringify(json), { status, headers: { 'Content-Type': 'application/json' } });
    };
    window.XMLHttpRequest = class { constructor() { throw new Error('Showcase: XMLHttpRequest is disabled.'); } };
}

export { getDb };
