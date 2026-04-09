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

    if (!root) {
        root = createRoot(containerEl);
    }

    root.render(
        <Suspense fallback={null}>
            <MainRouter/>
        </Suspense>
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
            render(props);
        },
    } as any);
};

if ((qiankunWindow as any).__POWERED_BY_QIANKUN__) {
    initQianKun();
} else {
    render({});
}

