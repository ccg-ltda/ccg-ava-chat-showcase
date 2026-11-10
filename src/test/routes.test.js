import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { build, routeUri } from '../mock/routes';

const walk = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
const files = walk('src').filter((f) => /\.jsx?$/.test(f) && !/[\\/]test[\\/]/.test(f) && !f.endsWith('route.js'));

describe('route() calls of the frontend', () => {
  it('only name routes that exist in the route table', () => {
    const missing = [];
    for (const f of files) {
      for (const m of readFileSync(f, 'utf8').matchAll(/\broute\(\s*'([a-z0-9.-]+)'/g)) if (!routeUri(m[1])) missing.push(`${f}: ${m[1]}`);
    }
    expect(missing).toEqual([]);
  });

  it('builds URLs with parameters and query strings', () => {
    expect(build('customers.show', { customer: 7 })).toBe('/customers/7');
    expect(build('customers.show', 7)).toBe('/customers/7');
    expect(build('conversations.index', { c: 3, status: 'pending' })).toBe('/conversations?c=3&status=pending');
  });
});
