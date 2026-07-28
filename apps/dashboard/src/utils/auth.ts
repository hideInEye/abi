import {message} from "antd";
import {createAuthManager, createAuthorizationHeader, normalizeToken} from "@sa/auth";

const AUTH_TOKEN_STORAGE_KEYS = ['SOY-REACT_token', 'token'];
const AUTH_STORAGE_KEYS = ['SOY-REACT_token', 'token', 'SOY-REACT_refreshToken', 'refreshToken', 'SOY-REACT_userInfo', 'userInfo'];
const LOGIN_EXPIRED_MESSAGE_KEY = 'dashboard-login-expired';

function readLocalStorageValue(key: string) {
    try {
        return window.localStorage.getItem(key);
    } catch {
        return null;
    }
}

export function readAuthToken() {
    for (const storageKey of AUTH_TOKEN_STORAGE_KEYS) {
        const token = normalizeToken(readLocalStorageValue(storageKey));

        if (token) {
            return token;
        }
    }

    return '';
}

export function getAuthorization() {
    return createAuthorizationHeader(readAuthToken());
}

function clearAuthStorageOnly() {
    AUTH_STORAGE_KEYS.forEach(storageKey => {
        try {
            window.localStorage.removeItem(storageKey);
        } catch {
            // localStorage may be unavailable in restricted browser modes.
        }
    });
}

function getCurrentPath() {
    return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function notifyAuthExpired({message: content, redirectDelay}: {message: string; redirectDelay: number; title: string}) {
    message.warning({
        content,
        duration: Math.max(redirectDelay / 1000, 1.5),
        key: LOGIN_EXPIRED_MESSAGE_KEY
    });
}

async function redirectToLogin({preserveRedirect, redirectPath}: {preserveRedirect: boolean; redirectPath?: string}) {
    if (typeof window.onTokenExpired === 'function') {
        await window.onTokenExpired();
        return;
    }

    const loginUrl =
        preserveRedirect && redirectPath ? `/login?redirect=${encodeURIComponent(redirectPath)}` : '/login';
    window.location.href = loginUrl;
}

export const authManager = createAuthManager({
    clearAuth: clearAuthStorageOnly,
    defaultNoticeMessage: '登录已过期，即将前往登录页 …',
    defaultNoticeTitle: '登录提醒',
    getCurrentPath,
    getToken: readAuthToken,
    notify: notifyAuthExpired,
    redirectToLogin,
    stateKey: '__DASHBOARD_AUTH_UNAUTHORIZED_STATE__'
});

export function handleLoginExpired(noticeMessage = '登录已过期，即将前往登录页 …') {
    const hasHostTokenExpiredHandler = typeof window.onTokenExpired === 'function';

    return authManager.handleUnauthorized({
        message: noticeMessage,
        redirectDelay: hasHostTokenExpiredHandler ? 0 : undefined,
        showNotice: !hasHostTokenExpiredHandler
    });
}
