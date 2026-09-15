import {describe, expect, it, vi} from 'vitest';
import {requestRollback} from './requestRollback';

describe('requestRollback', () => {
    it('releases backoff when a request cannot start', async () => {
        const finish = vi.fn();
        requestRollback(null, () => true, 'draggable', {}, finish);
        requestRollback({request: vi.fn()}, () => false, 'draggable', {}, finish);
        await Promise.resolve();
        expect(finish).toHaveBeenCalledTimes(2);
    });

    it('releases backoff when moveable throws', async () => {
        const finish = vi.fn();
        requestRollback({request: () => { throw new Error('failed'); }}, () => true, 'draggable', {}, finish);
        await Promise.resolve();
        expect(finish).toHaveBeenCalledOnce();
    });

    it('leaves successful completion to the moveable end event', async () => {
        const finish = vi.fn();
        const request = vi.fn();
        let hasTargets = false;
        requestRollback({request}, () => hasTargets, 'draggable', {x: 1}, finish);
        hasTargets = true;
        await Promise.resolve();
        expect(request).toHaveBeenCalledWith('draggable', {x: 1}, true);
        expect(finish).not.toHaveBeenCalled();
    });
});
