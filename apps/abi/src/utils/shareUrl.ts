/**
 * 分享链接路径规范化：后端历史路径 dashboard_share_page 检测到后直接替换为新路径 share_url（助手与大屏共用）。
 * TODO: 过渡兼容逻辑，后端切换为 share_url 返回后删除
 */
export function normalizeShareUrl(url?: string | null): string {
  return String(url || '').replace(/dashboard_share_page/g, 'share_url');
}
