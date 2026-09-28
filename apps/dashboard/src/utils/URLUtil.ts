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

import {qiankunWindow} from 'vite-plugin-qiankun/dist/helper';

export interface UrlParams {
    [key: string]: string;
}

export interface BuildUrlParams {
    [key: string]: string | number | undefined | null;
}

export default class URLUtil {

    public static parseUrlParams(): UrlParams {
        const urlParams: URLSearchParams = new URLSearchParams(window.location.search);
        const params: UrlParams = {};
        for (const [key, value] of urlParams) {
            params[key] = value;
        }
        return params;
    }

    public static getAppBaseUrl(): string {
        if (window.__ABI_DASHBOARD_HOST_BASE_PATH__) {
            const basePath = window.__ABI_DASHBOARD_HOST_BASE_PATH__.endsWith('/')
                ? window.__ABI_DASHBOARD_HOST_BASE_PATH__
                : `${window.__ABI_DASHBOARD_HOST_BASE_PATH__}/`;
            return new URL(basePath, window.location.origin).toString();
        }
        const qiankunPublicPath = (window as any).__INJECTED_PUBLIC_PATH_BY_QIANKUN__;
        const publicPath = qiankunPublicPath || import.meta.env.BASE_URL || '/';
        return new URL(publicPath, window.location.origin).toString();
    }

    /**
     * 修正 dev 下 qiankun 嵌入时的静态资源 URL：import 进来的图片是 /src/xx.png 绝对路径，
     * 会被浏览器按宿主 origin 解析导致 404，需拼接大屏自身注入的 public path。仅 dev 生效，线上原样返回。
     */
    public static resolveAssetUrl(url: string | null): string | null {
        // 仅 dev 需要修正：大屏(5174)与宿主跨源；线上 base=/dashboard-ui/ 且同源，资源路径已正确，勿动
        if (!import.meta.env.DEV || !url || /^(https?:|data:|blob:)/i.test(url)) {
            return url;
        }
        // ESM 子应用下 public path 注入在 qiankun 的 window.proxy 上，而非真实 window
        const publicPath = (qiankunWindow as any).__INJECTED_PUBLIC_PATH_BY_QIANKUN__;
        if (!publicPath) {
            return url;
        }
        const normalized = url.startsWith('/') ? url.slice(1) : url;
        const base = publicPath.endsWith('/') ? publicPath : `${publicPath}/`;
        return `${base}${normalized}`;
    }

    public static buildAppUrl(path: string, params?: BuildUrlParams): string {
        const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
        const url = new URL(normalizedPath, URLUtil.getAppBaseUrl());
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value === undefined || value === null) {
                    return;
                }
                url.searchParams.set(key, String(value));
            });
        }
        return url.toString();
    }

    public static navigateToAppPath(path: string, params?: BuildUrlParams) {
        window.location.assign(URLUtil.buildAppUrl(path, params));
    }

}
