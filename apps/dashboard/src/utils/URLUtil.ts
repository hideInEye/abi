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
