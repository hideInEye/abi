import {qiankunWindow, renderWithQiankun} from 'vite-plugin-qiankun/dist/helper';

import {
    applyDashboardRuntimeConfig,
    loadDashboardRuntimeConfig,
} from './bootstrap/runtimeConfig.ts';
import {createDashboardStartupController} from './bootstrap/startup.ts';
import {preloadInitialDashboardRoute} from './bootstrap/routePreload.ts';
import {runRegisteredAppCleanup} from './runtime/appCleanup.ts';

let activeContainer: HTMLElement | null = null;

function startupMarkup(message = '正在准备大屏应用...'): string {
    return `
        <div class="dashboard-startup-shell" role="status">
            <div class="dashboard-startup-shell__spinner" aria-hidden="true"></div>
            <p class="dashboard-startup-shell__title">${message}</p>
        </div>
    `;
}

function renderLoading(hasMounted: boolean): void {
    if (!activeContainer || hasMounted) return;
    activeContainer.setAttribute('aria-busy', 'true');
    activeContainer.innerHTML = startupMarkup();
}

function renderFallbackStatus(hasMounted: boolean): void {
    if (!activeContainer || hasMounted) return;
    activeContainer.innerHTML = startupMarkup('未找到运行配置，正在使用同源接口启动...');
}

function renderError(error: Error, retry: () => void, hasMounted: boolean): void {
    if (hasMounted) {
        console.error('Dashboard 更新失败:', error);
        return;
    }
    if (!activeContainer) return;

    activeContainer.setAttribute('aria-busy', 'false');
    activeContainer.innerHTML = `
        <div class="dashboard-startup-shell dashboard-startup-shell--error" role="alert">
            <h2 class="dashboard-startup-shell__title">大屏应用加载失败</h2>
            <p class="dashboard-startup-shell__message"></p>
            <button class="dashboard-startup-shell__retry" type="button">重新加载</button>
        </div>
    `;
    const message = activeContainer.querySelector<HTMLElement>('.dashboard-startup-shell__message');
    if (message) message.textContent = error.message;
    activeContainer.querySelector<HTMLButtonElement>('.dashboard-startup-shell__retry')
        ?.addEventListener('click', retry, {once: true});
}

const startup = createDashboardStartupController({
    applyConfig(result) {
        applyDashboardRuntimeConfig(result.config);
    },
    loadApp: () => {
        const appModulePromise = import('./bootstrap/app.tsx');
        preloadInitialDashboardRoute();
        return appModulePromise;
    },
    loadConfig: signal => loadDashboardRuntimeConfig({signal}),
    onError: renderError,
    onFallback: renderFallbackStatus,
    onLoading: renderLoading,
    onReady() {
        activeContainer?.setAttribute('aria-busy', 'false');
    },
});

function applyHostProps(props: Record<string, any>): void {
    const {hostBasePath, initialPath, onTokenExpired, pageTitle} = props;
    window.__ABI_DASHBOARD_HOST_BASE_PATH__ = hostBasePath;
    window.__ABI_DASHBOARD_INITIAL_PATH__ = initialPath;
    window.__ABI_DASHBOARD_PAGE_TITLE__ = pageTitle;
    window.onTokenExpired = onTokenExpired;
}

async function render(props: Record<string, any> = {}): Promise<void> {
    applyHostProps(props);
    const container = props.container?.querySelector?.('#root')
        ?? activeContainer
        ?? document.getElementById('root');
    if (!container) throw new Error('未找到 Dashboard 根节点 #root');

    activeContainer = container as HTMLElement;
    await startup.start({container: activeContainer, props});
}

function clearHostState(): void {
    delete window.__ABI_DASHBOARD_HOST_BASE_PATH__;
    delete window.__ABI_DASHBOARD_INITIAL_PATH__;
    delete window.__ABI_DASHBOARD_PAGE_TITLE__;
    try {
        delete window.onTokenExpired;
    } catch {
        window.onTokenExpired = undefined;
    }
}

function syncSpace(spaceId: unknown): void {
    if (spaceId === undefined || spaceId === null || Number(spaceId) <= 0) return;
    const nextSpaceId = String(spaceId);
    try {
        if (localStorage.getItem('spaceId') !== nextSpaceId) {
            localStorage.setItem('spaceId', nextSpaceId);
        }
    } catch {
        // 存储不可写时仍通过事件刷新当前页面。
    }
    window.dispatchEvent(new CustomEvent('abi-dashboard:space-change', {
        detail: {spaceId: Number(spaceId)},
    }));
}

if ((qiankunWindow as any).__POWERED_BY_QIANKUN__) {
    renderWithQiankun({
        bootstrap() {},
        mount: (props: Record<string, any>) => render(props),
        unmount() {
            startup.unmount();
            runRegisteredAppCleanup();
            activeContainer = null;
            clearHostState();
        },
        update(props: Record<string, any>) {
            const nextProps = props ?? {};
            if ('spaceId' in nextProps) {
                syncSpace(nextProps.spaceId);
                return;
            }
            return render(nextProps);
        },
    } as any);
} else {
    void render();
    window.addEventListener('beforeunload', () => {
        startup.dispose();
        runRegisteredAppCleanup();
    }, {once: true});
}
