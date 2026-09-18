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

import {message} from "antd";
import {useEffect} from "react";
import {MessageInstance} from "antd/es/message/interface";
import {isAuthExpiredNotifying} from "../../utils/FetchUtil";

// 登录过期时请求层已统一提醒并跳转，窗口期内忽略组件层的 error 弹错，避免同一次失败弹两条
function createAuthAwareMessageApi(api: MessageInstance): MessageInstance {
    return new Proxy(api, {
        get(target, prop, receiver) {
            const value = Reflect.get(target, prop, receiver);
            if (prop !== 'error' || typeof value !== 'function') return value;
            return (...args: any[]) => {
                if (isAuthExpiredNotifying()) return () => {};
                return value.apply(target, args);
            };
        }
    });
}

class GMessage {
    public messageApi: MessageInstance | null = null;

    public setMessageApi(messageApi: MessageInstance | null) {
        this.messageApi = messageApi ? createAuthAwareMessageApi(messageApi) : null;
    }

}

const globalMessage = new GMessage();
export {globalMessage};


export default function GlobalMessage() {
    const [messageApi, contextHolder] = message.useMessage();

    useEffect(() => {
        globalMessage.setMessageApi(messageApi);
        return () => {
            globalMessage.setMessageApi(null);
        }
    }, []);

    return (
        <>
            {contextHolder}
        </>
    )
}