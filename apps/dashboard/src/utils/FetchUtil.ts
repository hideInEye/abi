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

import {getAuthorization, handleLoginExpired} from "./auth.ts";

export interface HttpResponse {
    code: number;
    msg: string;
    data: any;
}
export function notifyTokenExpired() {
    void handleLoginExpired();
}

let _apiTarget = '';
export function getApiTarget(): string {
    return _apiTarget;
}
export async function loadAppConfig(): Promise<void> {
    try {
        const configPath = import.meta.env.MODE === 'development' ? 'http://localhost:5174/config.json': '/dashboard-ui/config.json'
        const res = await fetch(configPath);
        const cfg = await res.json();
        if (cfg.VITE_API_TARGET) {
            _apiTarget = cfg.VITE_API_TARGET.replace(/\/$/, '');
        }
    } catch {
        // config.json 不存在时静默降级，使用相对路径
    }
}

export default class FetchUtil {
    private static buildHeaders(headers?: HeadersInit): Headers {
        const nextHeaders = new Headers(headers);
        const authorization = getAuthorization();

        if (authorization && !nextHeaders.has('Authorization')) {
            nextHeaders.set('Authorization', authorization);
        }

        return nextHeaders;
    }
    private static handleUnauthorized(code?: number) {
        if (code === 401) {
            notifyTokenExpired();
        }
    }
    /**
     * GET请求
     * @param url
     * @param options
     */
    static async get(url: string, options: RequestInit = {}): Promise<HttpResponse> {
        options.method = 'GET';
        return FetchUtil.request(url, options);
    }

    /**
     * POST请求
     * @param url
     * @param data
     * @param options
     */
    static async post(url: string, data: any, options: RequestInit = {}): Promise<HttpResponse> {
        options.method = 'POST';
        //默认'Content-Type': 'application/json',
        options.headers = options.headers || {};
        if (!options.headers || !('Content-Type' in options.headers)) {
            (options.headers as any)['Content-Type'] = 'application/json';
        }

        const contentType = (options.headers as any)['Content-Type'] || 'application/json';
        if (contentType === 'application/json') {
            options.body = JSON.stringify(data);
        } else if (contentType === 'application/x-www-form-urlencoded') {
            const params = new URLSearchParams();
            for (const [key, value] of Object.entries(data)) {
                params.append(key, value as string);
            }
            options.body = params.toString();
        } else if (contentType === 'multipart/form-data') {
            // multipart/form-data 不能直接设置 Content-Type，因为需要由浏览器自动生成
            delete (options.headers as any)['Content-Type'];
            if (data instanceof FormData) {
                options.body = data;
            } else {
                const formData = new FormData();
                data.values().forEach((value: any, key: string) => {
                    formData.append(key, value as Blob | string);
                })
                options.body = formData;
            }
        } else {
            // 默认处理为 text/plain
            options.body = data.toString();
        }
        return FetchUtil.request(url, options);
    }

    /**
     * 请求的标准返回结果必须包含code、msg字段，data字段可选，且code为200时，data为有效数据
     * @param url
     * @param options
     * @private
     */
    private static async request(url: string, options: RequestInit = {}): Promise<HttpResponse> {
        // /chat-proxy/ 开头的路径直接走代理，不拼接 _apiTarget
        const fullUrl = (url.startsWith('http') || url.startsWith('/chat-proxy/')) ? url : `${_apiTarget}${url}`;
        let response: Response | null = null;
        try {
            response = await fetch(fullUrl, {
                ...options,
                headers: FetchUtil.buildHeaders(options.headers),
            });
            if (!response.ok) {
                FetchUtil.handleUnauthorized(response.status);
                console.error('请求错误:', response?.status, response?.statusText);
                // 尝试解析错误响应体，保留后端业务错误信息（如 err_msg / msg），
                // 避免上层把真实错误（如数据库异常）误判为其他语义（如"名称已存在"）
                let errData: any = null;
                let errMsg = response?.statusText ?? '';
                try {
                    const errCt = response.headers.get('content-type');
                    if (errCt && errCt.includes('application/json')) {
                        errData = await response.json();
                        errMsg = errData?.msg || errData?.err_msg || errData?.message || errMsg;
                    }
                } catch { /* 保底使用 statusText */ }
                return {code: response?.status ?? 500, msg: errMsg, data: errData};
            }
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const res = await response.json();
                if (typeof res === 'object' && res !== null && 'code' in res) {
                    FetchUtil.handleUnauthorized((res as HttpResponse).code);
                }
                if (typeof res === 'object' && 'code' in res && 'msg' in res)
                    return res;
                else
                    return {code: 200, msg: '操作成功', data: res};
            } else if (contentType && (contentType.includes('text/html') || contentType.includes('text/plain'))) {
                const text = await response.text()
                return {code: 200, msg: '操作成功', data: text}
            } else {
                const blob = await response.blob()
                return {code: 200, msg: '操作成功', data: blob}
            }
        } catch (error: any) {
            return {code: response?.status ?? 500, msg: response?.statusText ?? '', data: null};
        }
    }

    /**
     * 返回原生结果，不做任何封装
     * @param url
     * @param options
     * @private
     */
    private static async requestNativeResult(url: string, options: RequestInit = {}): Promise<any> {
        const fullUrl = (url.startsWith('http') || url.startsWith('/chat-proxy/')) ? url : `${_apiTarget}${url}`;
        let response: Response | null = null;
        try {
            response = await fetch(fullUrl, {
                ...options,
                headers: FetchUtil.buildHeaders(options.headers),
            });
            if (response.ok) {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const res = await response.json();
                    if (typeof res === 'object' && res !== null && 'code' in res) {
                        FetchUtil.handleUnauthorized((res as HttpResponse).code);
                    }
                    return res;
                } else if (contentType && (contentType.includes('text/html') || contentType.includes('text/plain'))) {
                    return await response.text()
                } else {
                    return await response.blob()
                }
            } else {
                FetchUtil.handleUnauthorized(response.status);
                console.error('请求错误:', response?.status, response?.statusText);
                return null;
            }
        } catch (error) {
            console.error('请求错误:', error);
            return null;
        }
    }

    /**
     * 请求前置处理，返回处理后的url和options
     * @param url
     * @param method
     * @param headers
     * @param params
     * @private
     */
    private static doRequestBefore(url: string, method: string, headers: Record<string, string>, params: FormData | Record<string, any>): {
        url: string,
        options: RequestInit
    } {
        const options: RequestInit = {
            method: method.toUpperCase(),
            headers: headers,
        };
        if (params) {
            if (method.toUpperCase() === 'GET') {
                const queryString = new URLSearchParams(params as Record<string, string>).toString();
                url = `${url}?${queryString}`;
            } else {
                options.headers = {
                    'Content-Type': 'application/json',
                    ...options.headers,
                };
                options.body = JSON.stringify(params);
            }
        }
        return {url, options};
    }

    /**
     * 执行自定义请求，请求参数均通过外部指定，返回结果必须为HttpResponse对象，必须包含code、msg字段，data字段可选
     * @param url
     * @param method
     * @param headers
     * @param params
     */
    static async doRequest(url: string, method: string, headers: Record<string, string>, params: FormData | Record<string, any>): Promise<HttpResponse> {
        const reqInfo = FetchUtil.doRequestBefore(url, method, headers, params);
        return FetchUtil.request(reqInfo.url, reqInfo.options);
    }

    /**
     * 执行自定义请求，请求参数均通过外部指定，返回结果为接口原生结果
     * @param url
     * @param method
     * @param headers
     * @param params
     */
    static async doRequestNativeResult(url: string, method: string, headers: Record<string, string>, params: FormData | Record<string, any>): Promise<object> {
        const reqInfo = FetchUtil.doRequestBefore(url, method, headers, params);
        return FetchUtil.requestNativeResult(reqInfo.url, reqInfo.options);
    }

    /**
     * 获取RSA公钥
     * @returns {Promise<string>} RSA公钥PEM格式字符串
     */
    static async getRSAPublicKey(): Promise<string> {
        const response = await FetchUtil.get('/api/crypto/public-key');
        if (response.code === 200) {
            return response.data; // RSA公钥
        }
        throw new Error(`获取RSA公钥失败: ${response.msg}`);
    }

}
