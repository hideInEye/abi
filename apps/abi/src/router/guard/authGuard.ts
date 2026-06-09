import { hasLoginToken } from '@/utils/auth';

/**
 * 检查登录状态是否有效
 * @returns 是否有效
 */
export function checkAuthStatus(): boolean {
  return hasLoginToken();
}
