import React from 'react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

const mocks = vi.hoisted(() => ({
    createRoot: vi.fn(),
    destroy: vi.fn(),
    loadConfig: vi.fn(),
    register: vi.fn(),
    render: vi.fn(),
    unmount: vi.fn(),
}));

vi.mock('react-dom/client', () => ({createRoot: mocks.createRoot}));
vi.mock('./utils/FetchUtil.ts', () => ({loadAppConfig: mocks.loadConfig}));
vi.mock('./designer/runtime/destroyDesignerRuntime.ts', () => ({destroyDesignerRuntime: mocks.destroy}));
vi.mock('vite-plugin-qiankun/dist/helper', () => ({
    qiankunWindow: {__POWERED_BY_QIANKUN__: true},
    renderWithQiankun: mocks.register,
}));

interface Lifecycle {
    mount: (props: Record<string, unknown>) => Promise<void>;
    unmount: () => void;
    update: (props: Record<string, unknown>) => void;
}

const createProps = () => ({
    container: {querySelector: vi.fn(() => ({classList: {add: vi.fn()}}))},
    hostBasePath: '/studio/chatbi',
    initialPath: '/my-screen',
    onTokenExpired: vi.fn(),
    pageTitle: '我的大屏',
    spaceId: 1,
});

async function loadLifecycle() {
    await import('./index');
    return mocks.register.mock.calls[0][0] as Lifecycle;
}

beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.loadConfig.mockResolvedValue(undefined);
    mocks.createRoot.mockReturnValue({render: mocks.render, unmount: mocks.unmount});
    vi.stubGlobal('React', React);
    vi.stubGlobal('window', {dispatchEvent: vi.fn()});
    vi.stubGlobal('localStorage', {getItem: vi.fn(), setItem: vi.fn()});
    vi.stubGlobal('CustomEvent', class {
        constructor(readonly type: string, readonly options: {detail: unknown}) {}
    });
});

afterEach(() => vi.unstubAllGlobals());

describe('Dashboard qiankun lifecycle', () => {
    it('does not finish mounting until config and root rendering are ready', async () => {
        let resolveConfig!: () => void;
        mocks.loadConfig.mockReturnValue(new Promise<void>(resolve => { resolveConfig = resolve; }));
        const lifecycle = await loadLifecycle();
        const mounting = lifecycle.mount(createProps());
        expect(mounting).toBeInstanceOf(Promise);
        expect(mocks.createRoot).not.toHaveBeenCalled();
        resolveConfig();
        await mounting;
        expect(mocks.createRoot).toHaveBeenCalledOnce();
        expect(mocks.render).toHaveBeenCalledOnce();
    });

    it('updates internal route, title and space without creating another root or reloading config', async () => {
        const lifecycle = await loadLifecycle();
        const props = createProps();
        await lifecycle.mount(props);
        lifecycle.update({initialPath: '/projects', pageTitle: '大屏管理', spaceId: 2});
        const {getDashboardHostRoute} = await import('./router/dashboardHostRoute');
        expect(getDashboardHostRoute()).toEqual({initialPath: '/projects', pageTitle: '大屏管理'});
        expect(window.__ABI_DASHBOARD_HOST_BASE_PATH__).toBe(props.hostBasePath);
        expect(window.onTokenExpired).toBe(props.onTokenExpired);
        expect(localStorage.setItem).toHaveBeenCalledWith('spaceId', '2');
        expect(window.dispatchEvent).toHaveBeenCalledOnce();
        lifecycle.update({spaceId: 2});
        expect(window.dispatchEvent).toHaveBeenCalledOnce();
        expect(mocks.createRoot).toHaveBeenCalledOnce();
        expect(mocks.render).toHaveBeenCalledOnce();
        expect(mocks.loadConfig).toHaveBeenCalledOnce();
    });

    it('does not send a duplicate space event after initial mount', async () => {
        const lifecycle = await loadLifecycle();
        const props = createProps();
        await lifecycle.mount(props);
        lifecycle.update(props);
        expect(window.dispatchEvent).not.toHaveBeenCalled();
    });

    it('cleans routing and designer runtime before a later mount', async () => {
        const lifecycle = await loadLifecycle();
        await lifecycle.mount(createProps());
        lifecycle.unmount();
        const {getDashboardHostRoute} = await import('./router/dashboardHostRoute');
        expect(mocks.unmount).toHaveBeenCalledOnce();
        expect(mocks.destroy).toHaveBeenCalledOnce();
        expect(getDashboardHostRoute().initialPath).toBeUndefined();
        expect(window.onTokenExpired).toBeUndefined();
        await lifecycle.mount({...createProps(), initialPath: '/projects'});
        expect(mocks.createRoot).toHaveBeenCalledTimes(2);
        expect(getDashboardHostRoute().initialPath).toBe('/projects');
    });
});
