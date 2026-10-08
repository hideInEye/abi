import type {DashboardConfigResult} from './runtimeConfig';

export interface DashboardMountContext {
    container: HTMLElement;
    props: Record<string, unknown>;
}

export interface DashboardAppModule {
    mountDashboardApp: (context: DashboardMountContext) => void | Promise<void>;
    unmountDashboardApp: () => void;
}

interface DashboardStartupDependencies {
    applyConfig: (result: DashboardConfigResult) => void;
    loadApp: () => Promise<DashboardAppModule>;
    loadConfig: (signal: AbortSignal) => Promise<DashboardConfigResult>;
    onError: (error: Error, retry: () => void, hasMounted: boolean) => void;
    onFallback?: (hasMounted: boolean) => void;
    onLoading: (hasMounted: boolean) => void;
    onReady?: () => void;
}

function toError(error: unknown): Error {
    return error instanceof Error ? error : new Error(String(error));
}

export function createDashboardStartupController({
    applyConfig,
    loadApp,
    loadConfig,
    onError,
    onFallback,
    onLoading,
    onReady,
}: DashboardStartupDependencies) {
    let activeRun = 0;
    let app: DashboardAppModule | null = null;
    let requestController: AbortController | null = null;
    let cachedConfig: DashboardConfigResult | null = null;
    let disposed = false;

    const start = async (context: DashboardMountContext): Promise<void> => {
        if (disposed) return;

        const run = ++activeRun;
        requestController?.abort();
        const runController = new AbortController();
        requestController = runController;
        onLoading(Boolean(app));

        try {
            const [configResult, appModule] = await Promise.all([
                cachedConfig
                    ? Promise.resolve(cachedConfig)
                    : loadConfig(runController.signal).then(result => {
                        if (!runController.signal.aborted) cachedConfig = result;
                        return result;
                    }),
                loadApp(),
            ]);
            if (disposed || run !== activeRun) return;

            applyConfig(configResult);
            if (configResult.source === 'relative-fallback') onFallback?.(Boolean(app));
            const previousApp = app;
            app = appModule;
            try {
                await appModule.mountDashboardApp(context);
            } catch (error) {
                if (app === appModule) app = previousApp;
                throw error;
            }
            if (disposed || run !== activeRun) return;
            onReady?.();
        } catch (error) {
            if (disposed || run !== activeRun || runController.signal.aborted) return;
            onError(toError(error), () => void start(context), Boolean(app));
        }
    };

    const unmount = () => {
            activeRun += 1;
            requestController?.abort();
            requestController = null;
            app?.unmountDashboardApp();
            app = null;
            cachedConfig = null;
    };

    return {
        dispose() {
            if (disposed) return;
            unmount();
            disposed = true;
        },
        start,
        unmount,
    };
}
