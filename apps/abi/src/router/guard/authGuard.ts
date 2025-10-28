import { handleLoginExpired, isTokenExpired } from '@/utils/auth';
import { localStg } from '@/utils/storage';

/**
 * 检查登录状态是否有效
 * @returns 是否有效
 */
export function checkAuthStatus(): boolean {
  const token = localStg.get('token');
  
  if (!token) {
    return false;
  }
  
  // 检查token是否过期
  if (isTokenExpired(token)) {
    handleLoginExpired();
    return false;
  }
  
  return true;
}

/**
 * 在路由跳转前检查认证状态
 * @param to 目标路由
 * @param from 来源路由
 * @returns 是否允许跳转
 */
export function beforeRouteEnter(to: any, from: any): boolean {
  // 如果是登录页面，不需要检查认证状态
  if (to.path.includes('/login')) {
    return true;
  }
  
  // 检查认证状态
  if (!checkAuthStatus()) {
    return false;
  }
  
  return true;
} 