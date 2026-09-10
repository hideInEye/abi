export const LOGOUT_API_PATH = '/api/auth/logout'

export function shouldHandleLoginExpiredForRequest(url?: string): boolean {
  if (!url) return true

  const requestPath = url.split(/[?#]/, 1)[0].replace(/^https?:\/\/[^/]+/i, '')
  return requestPath !== LOGOUT_API_PATH
}
