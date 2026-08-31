/** 助手分享前端路由前缀（连字符约定，对齐大屏 dashboard-share-page） */
export const ASSISTANT_SHARE_ROUTE = '/assistant-share-page'

/** 后端分享路径标识（助手/大屏 × 下划线/连字符 均兼容，后端统一返回 share_page 标识） */
const BACKEND_PATH_MARKER = '(?:assistant|dashboard)[_-]share[_-]page'

/** 从后端分享链接中提取 shareCode（兼容完整 URL / 纯路径） */
export function parseShareCode(shareUrl: string): string {
  const m = String(shareUrl || '').match(new RegExp(`${BACKEND_PATH_MARKER}\\/([^/?#]+)`))
  return m ? decodeURIComponent(m[1]) : ''
}

/** 后端分享链接（下划线或连字线路径）→ 前端 hash 路由路径；无法解析时返回空字符串 */
export function convertShareUrl(shareUrl: string): string {
  const code = parseShareCode(shareUrl)
  return code ? `${ASSISTANT_SHARE_ROUTE}/${code}` : ''
}
