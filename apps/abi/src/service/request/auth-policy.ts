export const LOGOUT_API_PATH = '/api/auth/logout'

/**
 * 路由初始化阶段的菜单接口。
 * 这些接口仅在 initDynamicAuthRoute 中调用；如果返回 401，
 * 由 initDynamicAuthRoute 统一处理跳转，请求层不弹 toast、不触发 handleLoginExpired。
 */
const AUTH_INIT_MENU_PATHS = [
  '/api/system/menu/getRouters',
  '/api/system/v1/space/menu/getAllRouters'
]

export function shouldHandleLoginExpiredForRequest(url?: string): boolean {
  if (!url) return true

  const requestPath = url.split(/[?#]/, 1)[0].replace(/^https?:\/\/[^/]+/i, '')

  if (requestPath === LOGOUT_API_PATH) return false
  if (AUTH_INIT_MENU_PATHS.includes(requestPath)) return false

  return true
}
