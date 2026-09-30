/**
 * 分享页路径前缀（share_url 助手与大屏共用，为后端统一的新格式）。
 * TODO: dashboard-share-page / dashboard_share_page 为旧路径过渡兼容，后端切换完成后删除
 */
const SHARE_VIEW_PATHS = ['/share_url/', '/dashboard-share-page/', '/dashboard_share_page/'];

/** 当前地址是否为分享页（兼容 history 与 hash 两种路由格式），分享页无 ?mode 参数需按路径识别为预览态 */
export function isShareViewPath(): boolean {
    const {pathname, hash} = window.location;
    return SHARE_VIEW_PATHS.some(p => pathname.includes(p) || hash.includes(p));
}

/**
 * 分享链接路径规范化：后端历史路径 dashboard_share_page 检测到后直接替换为新路径 share_url。
 * TODO: 过渡兼容逻辑，后端切换为 share_url 返回后删除
 */
export function normalizeShareUrl(url?: string | null): string {
    return String(url || '').replace(/dashboard_share_page/g, 'share_url');
}
