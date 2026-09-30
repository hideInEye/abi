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

import type {MessageInstance} from "antd/es/message/interface";
import {isAuthExpiredNotifying} from "../../utils/FetchUtil";

let messageModulePromise: Promise<typeof import('antd/es/message')> | null = null;

function loadMessageApi() {
    messageModulePromise ??= import('antd/es/message');
    return messageModulePromise.then(module => module.default);
}

// 提示组件只有在业务真正调用时才加载，避免根路由为未发生的反馈初始化整套 UI 运行时。
const lazyMessageApi = new Proxy({} as MessageInstance, {
    get(_target, prop) {
        if (prop === 'then') return undefined;
        return (...args: any[]) => {
            if (prop === 'error' && isAuthExpiredNotifying()) return Promise.resolve();
            return loadMessageApi().then(api => {
                const method = Reflect.get(api, prop);
                return typeof method === 'function' ? method.apply(api, args) : method;
            });
        };
    }
});

class GMessage {
    public messageApi: MessageInstance = lazyMessageApi;
}

const globalMessage = new GMessage();
export {globalMessage};

export default function GlobalMessage() {
    return null;
}
