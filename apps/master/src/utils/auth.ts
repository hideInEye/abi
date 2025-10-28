// import { qiankunWindow } from 'vite-plugin-qiankun/dist/helper';

// import { router } from '@/router';

import { localStg } from './storage'

/**
 * 检查token是否过期
 * @param token token字符串
 * @returns 是否过期
 */
export function isTokenExpired(token: string): boolean {
  if (!token) return true

  try {
    // 解析JWT token的payload部分
    const payload = JSON.parse(atob(token.split('.')[1]))
    const currentTime = Math.floor(Date.now() / 1000)

    // 检查token是否过期（提前5分钟认为过期）
    return payload.exp < currentTime + 300
  } catch (error) {
    // 如果解析失败，认为token无效
    return true
  }
}

export const resetStore = () => {
  return new Promise((r, j) => {
    localStg.remove('token')
    localStg.remove('userInfo')
    r('')
  })
}
