import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

vi.mock('../../utils/auth.ts', () => ({getAuthorization: () => null, handleLoginExpired: vi.fn()}));

import AbstractDesignerController from './AbstractDesignerController';
import FetchUtil from '../../utils/FetchUtil';

class TestController extends AbstractDesignerController {
    async create(): Promise<void> {}
    update(): void {}
    getConfig(): null { return null; }
    start(callback: () => void) {
        this.interval = setInterval(callback, 100);
    }
}

class OverrideDestroyController extends TestController {
    destroy(): void {}
}

describe('AbstractDesignerController lifecycle', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it('stops polling when destroyed', () => {
        const callback = vi.fn();
        const controller = new TestController();
        controller.start(callback);
        vi.advanceTimersByTime(100);
        controller.destroy();
        vi.advanceTimersByTime(500);
        expect(callback).toHaveBeenCalledTimes(1);
    });

    it('cleans base resources even when a subclass overrides destroy without calling super', () => {
        const callback = vi.fn();
        const controller = new OverrideDestroyController();
        controller.start(callback);
        controller.dispose();
        vi.advanceTimersByTime(500);
        expect(callback).not.toHaveBeenCalled();
    });

    it('updates component data only after a successful API response', async () => {
        const controller = new TestController();
        controller.config = {
            data: {
                sourceType: 'api',
                apiData: {url: '/data', method: 'GET', header: {}, params: {}},
            },
        };
        const changeData = vi.spyOn(controller, 'changeData');
        const request = vi.spyOn(FetchUtil, 'doRequestNativeResult');

        request.mockResolvedValueOnce(null);
        controller.loadComponentData();
        await Promise.resolve();
        expect(changeData).not.toHaveBeenCalled();

        request.mockResolvedValueOnce({rows: []});
        controller.loadComponentData();
        await Promise.resolve();
        expect(changeData).toHaveBeenCalledOnce();
        expect(changeData).toHaveBeenCalledWith({rows: []});
    });
});
