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

const MainRouter = lazy(() => import('./router/MainRouter.tsx'))

let root: ReturnType<typeof createRoot> | null = null;

async function render(props: any) {
    await loadAppConfig();
    const {container, hostBasePath, initialPath, onTokenExpired, pageTitle} = props ?? {};
    window.__ABI_DASHBOARD_HOST_BASE_PATH__ = hostBasePath;
    window.__ABI_DASHBOARD_INITIAL_PATH__ = initialPath;
    window.__ABI_DASHBOARD_PAGE_TITLE__ = pageTitle;
    window.onTokenExpired = onTokenExpired;
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
            render(props);
        },
        bootstrap() {},
        unmount(_props: any) {
            root?.unmount();
            root = null;
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
            // 主应用顶部切换空间时会通过 update 单独下发新的 spaceId（single-spa 会整体替换 customProps，
            // 因此这里能可靠地区分“空间更新”与“标题更新”）。
            if ('spaceId' in nextProps) {
                const {spaceId} = nextProps;
                // 仅同步 localStorage 并广播事件，驱动大屏列表页按新空间重新拉取；
                // 不整树重渲染：memo 路由不会重跑列表页挂载副作用，且 render 会重复加载配置、
                // 并因 single-spa 替换 props 而清空其它全局变量。
                if (spaceId !== undefined && spaceId !== null && Number(spaceId) > 0) {
                    const nextSpaceId = String(spaceId);
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
                return;
            }
            // 其它 props（如 pageTitle）变更时保持原有重渲染逻辑
            render(nextProps);
        },
    } as any);
};

if ((qiankunWindow as any).__POWERED_BY_QIANKUN__) {
    initQianKun();
} else {
    render({});
}
