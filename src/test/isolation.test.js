import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const walk = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
const sources = walk('src').filter((f) => /\.(jsx?|tsx?)$/.test(f) && !/[\\/]test[\\/]/.test(f));

describe('the showcase never talks to a real service', () => {
  it('no source opens a socket, an event stream or a beacon', () => {
    const offenders = sources.filter((f) => !f.endsWith('server.js') && /\b(new XMLHttpRequest|new WebSocket|sendBeacon\(|new EventSource)/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('the network guard is installed before anything renders', () => {
    const main = readFileSync('src/main.jsx', 'utf8');
    expect(main.indexOf('installNetworkGuard();')).toBeGreaterThan(-1);
    expect(main.indexOf('installNetworkGuard();')).toBeLessThan(main.indexOf('createRoot('));
  });

  it('fetch is answered locally for the same origin and refused for any other', async () => {
    let reachedTheNetwork = false;
    globalThis.window.fetch = async () => { reachedTheNetwork = true; return new Response('{}'); };
    await import('../mock/handlers');
    const { installNetworkGuard } = await import('../mock/server');
    installNetworkGuard();
    await expect(globalThis.window.fetch('https://api.example.org/data')).rejects.toThrow(/disabled/);
    const local = await globalThis.window.fetch('/notifications');
    expect(local.status).toBe(200);
    expect(reachedTheNetwork).toBe(false);
    expect(() => new globalThis.window.XMLHttpRequest()).toThrow(/disabled/);
  });

  it('every absolute URL is a documentation placeholder, never a real endpoint', () => {
    const allowed = /^(tu-dominio\.example|www\.w3\.org|n8n\.ejemplo\.com|www\.ejemplo\.com|api\.ejemplo\.com|wa\.me|[a-z-]+\.app\.n8n\.cloud|mi-sistema\.com|localhost)$/;
    const found = new Set();
    for (const f of [...sources, 'public/widget/ava-widget.js']) for (const m of readFileSync(f, 'utf8').matchAll(/https?:\/\/([A-Za-z0-9][A-Za-z0-9.-]*)/g)) found.add(m[1]);
    expect([...found].filter((h) => !allowed.test(h))).toEqual([]);
  });

  it('contains no secrets or private identifiers', () => {
    const bad = /(sk_(live|test)_|AKIA[0-9A-Z]{16}|BEGIN (RSA |EC )?PRIVATE KEY|ghp_[A-Za-z0-9]{20})/;
    expect(sources.filter((f) => bad.test(readFileSync(f, 'utf8')))).toEqual([]);
  });
});
