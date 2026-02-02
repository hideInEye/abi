import { qiankunWindow } from 'vite-plugin-qiankun/dist/helper';

import { router } from '@/router';

import { localStg } from './storage';
/**
 * 处理登录状态过期后的跳转
 * @param redirectPath 可选的重定向路径，如果不提供则使用当前页面路径
 */
export function handleLoginExpired(redirectPath?: string) {
  // 清除本地存储的登录信息
  localStg.remove('token');
  localStg.remove('refreshToken');
  localStg.remove('userId');
  localStg.remove('userInfo');

  if (qiankunWindow.__POWERED_BY_QIANKUN__) {
    // 微前端环境，建议用主应用跳转
    // 获取当前页面路径作为重定向路径
    const currentPath = redirectPath || (window.location.pathname + (window.location.search || ''));

    // 构建登录页面URL
    const loginUrl = `/login/pwd-login?redirect=${encodeURIComponent(currentPath)}`;

    // 直接跳转到登录页面
    window.location.href = loginUrl;
  } else {
    // 独立运行，SPA 跳转
    router.push({
      name: 'login',
      query: { redirect: redirectPath || window.location.pathname }
    });
  }
}

/**
 * 检查token是否过期
 * @param token token字符串
 * @returns 是否过期
 */
export function isTokenExpired(token: string): boolean {
  if (!token) return true;
  
  try {
    // 解析JWT token的payload部分
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    
    // 检查token是否过期（提前5分钟认为过期）
    if (payload.exp && payload.exp < (currentTime + 300)) {
      return true
    }
    return false
  } catch (error) {
    // 如果解析失败，认为token无效
    return false;
  }
}
