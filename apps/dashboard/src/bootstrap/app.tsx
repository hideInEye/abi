import {createRoot} from 'react-dom/client';

import MainRouter from '../router/MainRouter';
import '../index.less';
import type {DashboardMountContext} from './startup';

let root: ReturnType<typeof createRoot> | null = null;
let rootContainer: HTMLElement | null = null;

export function mountDashboardApp({container}: DashboardMountContext): void {
    if (root && rootContainer !== container) {
        root.unmount();
        root = null;
    }

    rootContainer = container;
    container.classList.add('abi-dashboard-root');
    root ??= createRoot(container);
    root.render(
        <div className="abi-dashboard-root">
            <MainRouter/>
        </div>,
    );
}

export function unmountDashboardApp(): void {
    root?.unmount();
    root = null;
    rootContainer = null;
}
