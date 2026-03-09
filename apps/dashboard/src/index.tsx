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
import Loading from "./json-schema/ui/loading/Loading.tsx";
import {renderWithQiankun, qiankunWindow} from 'vite-plugin-qiankun/dist/helper';

const MainRouter = lazy(() => import('./router/MainRouter.tsx'))

let root: ReturnType<typeof createRoot> | null = null;

function render(props: any) {
    const {container} = props ?? {};
    const containerEl = container
        ? container.querySelector('#root')
        : document.getElementById('root');
    if (!containerEl) return;

    if (!root) {
        root = createRoot(containerEl);
    }

    root.render(
        <Suspense fallback={<Loading/>}>
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
        },
        update(_props: any) {},
    } as any);
};

if ((qiankunWindow as any).__POWERED_BY_QIANKUN__) {
    initQianKun();
} else {
    render({});
}

