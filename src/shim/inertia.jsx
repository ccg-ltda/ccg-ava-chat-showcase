/**
 * Local stand-in for `@inertiajs/react`. The copied AVA Platform pages keep calling `Link`, `router`, `useForm`, `usePage` and `Head`
 * exactly as in the real application; here they are answered by the in-browser mock server (src/mock) instead of Laravel.
 * Nothing leaves the browser.
 */
import { createElement, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { mock } from '../mock/server';

/* ----------------------------- page store ----------------------------- */
let page = null; // { component, props, url, routeName, key }
const subscribers = new Set();
const listeners = { start: new Set(), finish: new Set() };
const emit = (name, detail) => listeners[name].forEach((fn) => fn({ detail }));
const notify = () => subscribers.forEach((fn) => fn());
const subscribe = (fn) => { subscribers.add(fn); return () => subscribers.delete(fn); };
const snapshot = () => page;
let visitCounter = 0;

function setPage(next, { preserveState = false } = {}) {
    page = { ...next, key: preserveState && page ? page.key : `v${++visitCounter}` };
    notify();
}

export function usePage() {
    return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/* ------------------------------ navigation ---------------------------- */
const withQuery = (url, data) => {
    if (!data || Object.keys(data).length === 0) return url;
    const [path, existing = ''] = url.split('?');
    const q = new URLSearchParams(existing);
    Object.entries(data).forEach(([k, v]) => {
        if (v === undefined || v === null || v === '') q.delete(k);
        else if (Array.isArray(v)) { q.delete(k); v.forEach((x) => q.append(`${k}[]`, String(x))); }
        else q.set(k, String(v));
    });
    const s = q.toString();
    return s ? `${path}?${s}` : path;
};

const normalize = (href) => {
    try {
        const u = new URL(href, window.location.origin);
        return u.origin === window.location.origin ? u.pathname + u.search : null;
    } catch { return null; }
};

async function visit(href, options = {}) {
    const { method = 'get', data = {}, replace = false, preserveState, preserveScroll = false, onBefore, onStart, onSuccess, onError, onFinish, onCancel } = options;
    const verb = String(method).toLowerCase();
    if (onBefore && onBefore() === false) { onCancel?.(); return; }
    const url = normalize(typeof href === 'string' ? href : String(href));
    if (url === null) { window.alert('Demostración: los enlaces externos están desactivados.'); return; }

    emit('start', { visit: { url, method: verb, only: options.only } });
    onStart?.({ url });
    // A beat so skeletons and "processing" states are visible, as with a real request.
    await new Promise((resolve) => setTimeout(resolve, 60));

    try {
        if (verb === 'get') {
            const target = withQuery(url, data);
            const result = mock.get(target, { flash: null });
            if (result.redirect) return visit(result.redirect, { replace: true });
            const same = page && page.component === result.component;
            (replace ? window.history.replaceState : window.history.pushState).call(window.history, {}, '', target);
            setPage(result, { preserveState: preserveState ?? (same && page.url.split('?')[0] === target.split('?')[0] && replace) });
            if (!preserveScroll) window.scrollTo(0, 0);
            onSuccess?.(result);
        } else {
            const outcome = mock.mutate(verb, url, data);
            if (outcome.errors && Object.keys(outcome.errors).length) {
                if (page) setPage({ ...page, props: { ...page.props, errors: outcome.errors } }, { preserveState: true });
                onError?.(outcome.errors);
            } else {
                const target = outcome.redirect ?? (page ? page.url : '/dashboard');
                const result = mock.get(target, { flash: outcome.flash ?? null });
                window.history.replaceState({}, '', target);
                setPage(result, { preserveState: preserveState ?? false });
                if (!preserveScroll) window.scrollTo(0, 0);
                onSuccess?.(result);
            }
        }
    } finally {
        emit('finish', { visit: { url } });
        onFinish?.({ url });
    }
}

export const router = {
    visit: (href, options) => visit(href, options),
    get: (href, data = {}, options = {}) => visit(href, { ...options, method: 'get', data }),
    post: (href, data = {}, options = {}) => visit(href, { ...options, method: 'post', data }),
    put: (href, data = {}, options = {}) => visit(href, { ...options, method: 'put', data }),
    patch: (href, data = {}, options = {}) => visit(href, { ...options, method: 'patch', data }),
    delete: (href, options = {}) => visit(href, { ...options, method: 'delete' }),
    reload: (options = {}) => visit(page ? page.url : '/dashboard', { ...options, replace: true, preserveState: true, preserveScroll: true }),
    on: (name, fn) => { listeners[name]?.add(fn); return () => listeners[name]?.delete(fn); },
};

/* -------------------------------- Link -------------------------------- */
export function Link({ href, method = 'get', data = {}, as = 'a', replace, preserveScroll, preserveState, children, onClick, onSuccess, onFinish, ...rest }) {
    const verb = String(method).toLowerCase();
    const handle = (event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button > 0) return;
        event.preventDefault();
        visit(String(href), { method: verb, data, replace, preserveScroll, preserveState, onSuccess, onFinish });
    };
    if (as === 'button') return createElement('button', { type: 'button', ...rest, onClick: handle }, children);
    return createElement('a', { ...rest, href: verb === 'get' ? withQuery(String(href), data) : String(href), onClick: handle }, children);
}

/* --------------------------------- Head -------------------------------- */
export function Head({ title, children }) {
    const childTitle = Array.isArray(children) ? children.find((c) => c?.type === 'title')?.props?.children : children?.type === 'title' ? children.props.children : undefined;
    const value = title ?? childTitle;
    const brand = usePage()?.props?.brand ?? '';
    useEffect(() => {
        if (value) document.title = brand ? `${value} - ${brand}` : String(value);
    }, [value, brand]);
    return null;
}

/* ------------------------------- useForm ------------------------------- */
export function useForm(initial = {}) {
    const defaults = useRef(initial);
    const transformer = useRef((d) => d);
    const [data, setDataState] = useState(initial);
    const [errors, setErrors] = useState({});
    const [processing, setProcessing] = useState(false);
    const [wasSuccessful, setWasSuccessful] = useState(false);
    const [recentlySuccessful, setRecently] = useState(false);
    const timer = useRef(null);
    const mounted = useRef(true);
    useEffect(() => () => { mounted.current = false; clearTimeout(timer.current); }, []);

    const setData = useCallback((key, value) => {
        if (typeof key === 'function') setDataState((d) => key(d));
        else if (typeof key === 'object' && key !== null) setDataState((d) => ({ ...d, ...key }));
        else setDataState((d) => ({ ...d, [key]: value }));
    }, []);

    const submit = useCallback((method, url, options = {}) => {
        const payload = transformer.current(data);
        setProcessing(true);
        setWasSuccessful(false);
        visit(String(url), {
            ...options,
            method,
            data: payload,
            onError: (e) => { if (mounted.current) setErrors(e); options.onError?.(e); },
            onSuccess: (p) => {
                if (mounted.current) {
                    setErrors({}); setWasSuccessful(true); setRecently(true);
                    timer.current = setTimeout(() => mounted.current && setRecently(false), 2000);
                }
                return options.onSuccess?.(p);
            },
            onFinish: (v) => { if (mounted.current) setProcessing(false); options.onFinish?.(v); },
        });
    }, [data]);

    const keys = (fields) => (fields.length ? fields : Object.keys(defaults.current));
    return {
        data, setData, errors, processing, wasSuccessful, recentlySuccessful,
        hasErrors: Object.keys(errors).length > 0,
        isDirty: JSON.stringify(data) !== JSON.stringify(defaults.current),
        transform: (fn) => { transformer.current = fn; },
        setDefaults: (key, value) => { defaults.current = typeof key === 'object' && key !== null ? { ...defaults.current, ...key } : key === undefined ? { ...data } : { ...defaults.current, [key]: value }; },
        reset: (...fields) => setDataState((d) => { const next = { ...d }; keys(fields).forEach((f) => { next[f] = defaults.current[f]; }); return next; }),
        clearErrors: (...fields) => setErrors((e) => { if (!fields.length) return {}; const n = { ...e }; fields.forEach((f) => delete n[f]); return n; }),
        setError: (key, value) => setErrors((e) => (typeof key === 'object' ? { ...e, ...key } : { ...e, [key]: value })),
        submit,
        get: (u, o) => submit('get', u, o), post: (u, o) => submit('post', u, o), put: (u, o) => submit('put', u, o),
        patch: (u, o) => submit('patch', u, o), delete: (u, o) => submit('delete', u, o),
        cancel: () => {},
    };
}

/* -------------------------------- boot --------------------------------- */
export function bootstrapPage() {
    const url = window.location.pathname + window.location.search;
    const result = mock.get(url, { flash: null });
    if (result.redirect) { window.history.replaceState({}, '', result.redirect); return bootstrapPage(); }
    setPage(result);
    window.addEventListener('popstate', () => {
        const r = mock.get(window.location.pathname + window.location.search, { flash: null });
        setPage(r.redirect ? mock.get(r.redirect, { flash: null }) : r);
    });
    mock.onChange(() => { if (page) setPage(mock.get(page.url, { flash: null }), { preserveState: true }); });
}
