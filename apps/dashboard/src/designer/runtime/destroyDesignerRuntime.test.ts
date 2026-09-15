import {beforeEach, describe, expect, it, vi} from 'vitest';

const mocks = vi.hoisted(() => ({
    destroy: vi.fn(),
    eventReset: vi.fn(),
    historyReset: vi.fn(),
    runtimeReset: vi.fn(),
}));

vi.mock('../manager/DesignerManager', () => ({default: {destroy: mocks.destroy}}));
vi.mock('../operate-provider/EventOperateStore', () => ({default: {reset: mocks.eventReset}}));
vi.mock('../operate-provider/undo-redo/HistoryOperator', () => ({historyOperator: {reset: mocks.historyReset}}));
vi.mock('../store/RuntimeStore', () => ({default: {reset: mocks.runtimeReset}}));

import {destroyDesignerRuntime} from './destroyDesignerRuntime';

describe('destroyDesignerRuntime', () => {
    beforeEach(() => vi.clearAllMocks());

    it('cleans every runtime owner and is safe to repeat', () => {
        destroyDesignerRuntime();
        destroyDesignerRuntime();
        expect(mocks.destroy).toHaveBeenCalledTimes(2);
        expect(mocks.eventReset).toHaveBeenCalledTimes(2);
        expect(mocks.historyReset).toHaveBeenCalledTimes(2);
        expect(mocks.runtimeReset).toHaveBeenCalledTimes(2);
    });
});
