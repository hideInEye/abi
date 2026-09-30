let myScreenModulePromise: Promise<unknown> | null = null;

function getInitialPath(): string {
    return window.__ABI_DASHBOARD_INITIAL_PATH__ || window.location.pathname;
}

export function preloadInitialDashboardRoute(): void {
    if (!getInitialPath().startsWith('/my-screen')) return;

    myScreenModulePromise ??= import('../pages/my-screen/MyScreen.tsx');
    void myScreenModulePromise.catch(() => {
        myScreenModulePromise = null;
    });
}
