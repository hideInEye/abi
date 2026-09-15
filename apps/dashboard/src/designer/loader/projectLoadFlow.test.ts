import {describe, expect, it, vi} from 'vitest';
import {runProjectLoadFlow} from './projectLoadFlow';

describe('project load flow', () => {
    it('does not run the success path for an empty or rejected response', async () => {
        const onLoaded = vi.fn();
        const onSuccess = vi.fn();
        const onError = vi.fn();

        await expect(runProjectLoadFlow({load: async () => null, onLoaded, onSuccess, onError})).resolves.toBe(false);
        await expect(runProjectLoadFlow({load: async () => { throw new Error('offline'); }, onLoaded, onSuccess, onError})).resolves.toBe(false);

        expect(onSuccess).not.toHaveBeenCalled();
        expect(onLoaded).toHaveBeenNthCalledWith(1, false);
        expect(onLoaded).toHaveBeenNthCalledWith(2, false);
    });

    it('marks the loader ready only after the success callback completes', async () => {
        const order: string[] = [];
        const result = await runProjectLoadFlow({
            load: async () => ({id: 'project'}),
            onSuccess: async () => { order.push('success'); },
            onLoaded: () => { order.push('loaded'); },
            onError: vi.fn(),
        });

        expect(result).toBe(true);
        expect(order).toEqual(['success', 'loaded']);
    });

    it('ignores a response after the load generation is invalidated', async () => {
        let current = true;
        let resolveLoad: ((data: {id: string}) => void) | undefined;
        const load = new Promise<{id: string}>(resolve => { resolveLoad = resolve; });
        const onLoaded = vi.fn();
        const onSuccess = vi.fn();
        const pending = runProjectLoadFlow({
            load: () => load,
            isCurrent: () => current,
            onLoaded,
            onSuccess,
            onError: vi.fn(),
        });

        current = false;
        resolveLoad?.({id: 'stale'});

        await expect(pending).resolves.toBe(false);
        expect(onSuccess).not.toHaveBeenCalled();
        expect(onLoaded).not.toHaveBeenCalled();
    });
});
