/*
 * Copyright © 2023-2025 puyinzhen
 * All rights reserved.
 *
 * The copyright of this work (or idea/project/document) is owned by puyinzhen. Without explicit written permission, no part of this work may be reproduced, distributed, or modified in any form for commercial purposes.
 *
 * This copyright statement applies to, but is not limited to: concept descriptions, design documents, source code, images, presentation files, and any related content.
 *
 * For permission to use this work or any part of it, please contact 1182810784@qq.com to obtain written authorization.
 */

import {createRoot} from "react-dom/client";
import './index.less';
import {lazy, Suspense} from "react";
// import Loading from "./json-schema/ui/loading/Loading.tsx";
import {loadAppConfig} from "./utils/FetchUtil.ts";
import {renderWithQiankun, qiankunWindow} from 'vite-plugin-qiankun/dist/helper';
import {destroyDesignerRuntime} from './designer/runtime/destroyDesignerRuntime.ts';
import {resetDashboardHostRoute, updateDashboardHostRoute} from './router/dashboardHostRoute.ts';

const MainRouter = lazy(() => import('./router/MainRouter.tsx'))

let root: ReturnType<typeof createRoot> | null = null;
let currentSpaceId: string | undefined;

async function render(props: any) {
    await loadAppConfig();
    const {container, hostBasePath, initialPath, onTokenExpired, pageTitle} = props ?? {};
    window.__ABI_DASHBOARD_HOST_BASE_PATH__ = hostBasePath;
    window.__ABI_DASHBOARD_INITIAL_PATH__ = initialPath;
    window.__ABI_DASHBOARD_PAGE_TITLE__ = pageTitle;
    window.onTokenExpired = onTokenExpired;
    currentSpaceId = props?.spaceId == null ? undefined : String(props.spaceId);
    updateDashboardHostRoute({initialPath, pageTitle});
    const containerEl = container
        ? container.querySelector('#root')
        : document.getElementById('root');
    if (!containerEl) return;

    // 背景样式挂在子应用自身根节点上（见 index.less .abi-dashboard-root），不污染主应用 html/body
    containerEl.classList.add('abi-dashboard-root');

    if (!root) {
        root = createRoot(containerEl);
    }

    root.render(
        <div className="abi-dashboard-root">
            <Suspense fallback={null}>
                <MainRouter/>
            </Suspense>
        </div>
    );
}

const initQianKun = () => {
    renderWithQiankun({
        mount(props: any) {
            return render(props);
        },
        bootstrap() {},
        unmount() {
            root?.unmount();
            root = null;
            destroyDesignerRuntime();
            resetDashboardHostRoute();
            currentSpaceId = undefined;
            delete window.__ABI_DASHBOARD_HOST_BASE_PATH__;
            delete window.__ABI_DASHBOARD_INITIAL_PATH__;
            delete window.__ABI_DASHBOARD_PAGE_TITLE__;
            try {
                delete window.onTokenExpired;
            } catch {
                window.onTokenExpired = undefined;
            }
        },
        update(props: any) {
            const nextProps = props ?? {};
            if ('hostBasePath' in nextProps) window.__ABI_DASHBOARD_HOST_BASE_PATH__ = nextProps.hostBasePath;
            if ('onTokenExpired' in nextProps) window.onTokenExpired = nextProps.onTokenExpired;
            if ('initialPath' in nextProps) window.__ABI_DASHBOARD_INITIAL_PATH__ = nextProps.initialPath;
            if ('pageTitle' in nextProps) window.__ABI_DASHBOARD_PAGE_TITLE__ = nextProps.pageTitle;
            updateDashboardHostRoute({
                initialPath: window.__ABI_DASHBOARD_INITIAL_PATH__,
                pageTitle: window.__ABI_DASHBOARD_PAGE_TITLE__,
            });
            if ('spaceId' in nextProps) {
                const {spaceId} = nextProps;
                if (spaceId !== undefined && spaceId !== null && Number(spaceId) > 0 && String(spaceId) !== currentSpaceId) {
                    const nextSpaceId = String(spaceId);
                    currentSpaceId = nextSpaceId;
                    try {
                        if (localStorage.getItem('spaceId') !== nextSpaceId) {
                            localStorage.setItem('spaceId', nextSpaceId);
                        }
                    } catch {
                        // localStorage 不可写时忽略，列表仍会按事件刷新
                    }
                    window.dispatchEvent(new CustomEvent('abi-dashboard:space-change', {
                        detail: {spaceId: Number(spaceId)}
                    }));
                }
            }
        },
    } as any);
};

if ((qiankunWindow as any).__POWERED_BY_QIANKUN__) {
    initQianKun();
} else {
    render({});
}
