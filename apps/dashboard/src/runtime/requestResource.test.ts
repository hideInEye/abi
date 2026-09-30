import {describe, expect, it, vi} from 'vitest';

import {createStableRequestKey, RequestResource} from './requestResource';

describe('Dashboard RequestResource', () => {
    it('uses stable keys and shares the inflight request', async () => {
        const key = createStableRequestKey('projects', {page: 1, filter: {b: 2, a: 1}});
        expect(key).toBe(createStableRequestKey('projects', {filter: {a: 1, b: 2}, page: 1}));

        const resource = new RequestResource<number>();
        let resolve!: (value: number) => void;
        const pending = new Promise<number>(done => { resolve = done; });
        const loader = vi.fn(() => pending);
        const first = resource.load(key, loader);
        const second = resource.load(key, loader);
        expect(first).toBe(second);
        resolve(9);
        await expect(first).resolves.toBe(9);
        expect(loader).toHaveBeenCalledOnce();
    });

    it('prevents an aborted late response from entering the cache', async () => {
        const resource = new RequestResource<string>();
        let resolve!: (value: string) => void;
        const pending = new Promise<string>(done => { resolve = done; });
        const oldLoad = resource.load('old', () => pending);
        resource.abort('old');
        resolve('stale');
        await expect(oldLoad).rejects.toMatchObject({name: 'AbortError'});
        expect(resource.peek('old')).toBeUndefined();
    });
});
