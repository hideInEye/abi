import {beforeEach, describe, expect, it, vi} from 'vitest';

import {createDashboardStartupController} from './startup';

describe('createDashboardStartupController', () => {
    const context = {container: {} as HTMLElement, props: {}};

    beforeEach(() => vi.clearAllMocks());

    it('loads config and app concurrently and does not duplicate the root mount for stale runs', async () => {
        const signals: AbortSignal[] = [];
        const resolvers: Array<(value: {config: Record<string, unknown>; source: 'remote'}) => void> = [];
        const mountDashboardApp = vi.fn();
        const controller = createDashboardStartupController({
            applyConfig: vi.fn(),
            loadApp: async () => ({mountDashboardApp, unmountDashboardApp: vi.fn()}),
            loadConfig: signal => {
                signals.push(signal);
                return new Promise(resolve => resolvers.push(resolve));
            },
            onError: vi.fn(),
            onLoading: vi.fn(),
        });

        const first = controller.start(context);
        const second = controller.start(context);
        expect(signals[0]?.aborted).toBe(true);
        resolvers[0]?.({config: {run: 1}, source: 'remote'});
        resolvers[1]?.({config: {run: 2}, source: 'remote'});
        await Promise.all([first, second]);
        expect(mountDashboardApp).toHaveBeenCalledTimes(1);
    });

    it('supports fallback status, retry, and once-only disposal', async () => {
        const mountDashboardApp = vi.fn();
        const unmountDashboardApp = vi.fn();
        const onError = vi.fn();
        const onFallback = vi.fn();
        let attempt = 0;
        const controller = createDashboardStartupController({
            applyConfig: vi.fn(),
            loadApp: async () => ({mountDashboardApp, unmountDashboardApp}),
            loadConfig: async () => {
                attempt += 1;
                if (attempt === 1) throw new Error('offline');
                return {config: {}, source: 'relative-fallback'};
            },
            onError,
            onFallback,
            onLoading: vi.fn(),
        });

        await controller.start(context);
        const retry = onError.mock.calls[0]?.[1] as (() => void);
        retry();
        await vi.waitFor(() => expect(mountDashboardApp).toHaveBeenCalledTimes(1));
        expect(onFallback).toHaveBeenCalledTimes(1);
        controller.dispose();
        controller.dispose();
        expect(unmountDashboardApp).toHaveBeenCalledTimes(1);
    });

    it('reuses a successful config during one mount cycle and clears it on unmount', async () => {
        const loadConfig = vi.fn(async () => ({config: {api: '/v1'}, source: 'remote' as const}));
        const mountDashboardApp = vi.fn();
        const controller = createDashboardStartupController({
            applyConfig: vi.fn(),
            loadApp: async () => ({mountDashboardApp, unmountDashboardApp: vi.fn()}),
            loadConfig,
            onError: vi.fn(),
            onLoading: vi.fn(),
        });

        await controller.start(context);
        await controller.start(context);
        expect(loadConfig).toHaveBeenCalledTimes(1);

        controller.unmount();
        await controller.start(context);
        expect(loadConfig).toHaveBeenCalledTimes(2);
    });
});
