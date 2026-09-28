interface DashboardHostRoute {
    initialPath?: string;
    pageTitle?: string;
}

let route: DashboardHostRoute = {};
const listeners = new Set<() => void>();

export const getDashboardHostRoute = () => route;

export function subscribeDashboardHostRoute(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}

export function updateDashboardHostRoute(next: DashboardHostRoute) {
    const merged = {...route, ...next};
    if (merged.initialPath === route.initialPath && merged.pageTitle === route.pageTitle) return;
    route = merged;
    listeners.forEach(listener => listener());
}

export function resetDashboardHostRoute() {
    updateDashboardHostRoute({initialPath: undefined, pageTitle: undefined});
}
