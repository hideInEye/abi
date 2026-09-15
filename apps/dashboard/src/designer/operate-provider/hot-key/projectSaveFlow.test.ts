import {describe, expect, it, vi} from 'vitest';
import {runProjectSaveFlow} from './projectSaveFlow';

describe('project save flow', () => {
    it('does not update local success state or sync status when saving fails', async () => {
        const onSaved = vi.fn();
        const syncStatus = vi.fn();

        await expect(runProjectSaveFlow({
            save: async () => false,
            onSaved,
            syncStatus,
        })).resolves.toBe(false);

        expect(onSaved).not.toHaveBeenCalled();
        expect(syncStatus).not.toHaveBeenCalled();
    });

    it('does not run follow-up actions when the save request rejects', async () => {
        const onSaved = vi.fn();
        const syncStatus = vi.fn();

        await expect(runProjectSaveFlow({
            save: async () => { throw new Error('offline'); },
            onSaved,
            syncStatus,
        })).rejects.toThrow('offline');

        expect(onSaved).not.toHaveBeenCalled();
        expect(syncStatus).not.toHaveBeenCalled();
    });

    it('runs follow-up actions in order only after saving succeeds', async () => {
        const order: string[] = [];

        await expect(runProjectSaveFlow({
            save: async () => { order.push('save'); return true; },
            onSaved: () => { order.push('saved'); },
            syncStatus: async () => { order.push('sync'); },
        })).resolves.toBe(true);

        expect(order).toEqual(['save', 'saved', 'sync']);
    });
});
