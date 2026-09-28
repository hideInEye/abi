import {afterEach, describe, expect, it, vi} from 'vitest';
import {
    getDashboardHostRoute,
    resetDashboardHostRoute,
    subscribeDashboardHostRoute,
    updateDashboardHostRoute,
} from './dashboardHostRoute';

afterEach(resetDashboardHostRoute);

describe('Dashboard host route updates', () => {
    it('retains updates received before the router subscribes', () => {
        updateDashboardHostRoute({initialPath: '/my-screen', pageTitle: '我的大屏'});
        expect(getDashboardHostRoute()).toEqual({initialPath: '/my-screen', pageTitle: '我的大屏'});
    });

    it('notifies the mounted router on route or title changes and preserves missing fields', () => {
        const listener = vi.fn();
        const unsubscribe = subscribeDashboardHostRoute(listener);
        updateDashboardHostRoute({initialPath: '/my-screen', pageTitle: '我的大屏'});
        updateDashboardHostRoute({initialPath: '/projects'});
        expect(getDashboardHostRoute()).toEqual({initialPath: '/projects', pageTitle: '我的大屏'});
        updateDashboardHostRoute({pageTitle: '大屏管理'});
        expect(listener).toHaveBeenCalledTimes(3);
        unsubscribe();
        resetDashboardHostRoute();
        expect(listener).toHaveBeenCalledTimes(3);
    });

    it('keeps the same snapshot for unchanged props to avoid rerender loops', () => {
        updateDashboardHostRoute({initialPath: '/projects', pageTitle: '大屏管理'});
        const snapshot = getDashboardHostRoute();
        const listener = vi.fn();
        const unsubscribe = subscribeDashboardHostRoute(listener);
        updateDashboardHostRoute({...snapshot});
        expect(getDashboardHostRoute()).toBe(snapshot);
        expect(listener).not.toHaveBeenCalled();
        unsubscribe();
    });

    it('clears stale routing state when the micro-app is unmounted', () => {
        updateDashboardHostRoute({initialPath: '/designer?id=1', pageTitle: '设计器'});
        resetDashboardHostRoute();
        expect(getDashboardHostRoute()).toEqual({initialPath: undefined, pageTitle: undefined});
    });
});
