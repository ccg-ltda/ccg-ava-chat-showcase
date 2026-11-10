/** Global `route()` as the real pages call it (Ziggy): `route('x', params)` builds a URL; `route().current('x.*')` tests the current page. */
import { build, match } from '../mock/routes';

export function route(name, params, absolute) {
    if (name === undefined) {
        return {
            current: (pattern) => {
                const here = match(window.location.pathname, 'get')?.name;
                if (pattern === undefined) return here;
                if (!here) return false;
                const re = new RegExp(`^${String(pattern).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);
                return re.test(here);
            },
            has: (n) => { try { build(n); return true; } catch { return false; } },
        };
    }
    const url = build(name, params);
    return absolute ? window.location.origin + url : url;
}

window.route = route;
