import { useEffect, useRef } from 'react';

import { handleLoginExpired, isTokenExpired } from '@/utils/auth';
import { localStg } from '@/utils/storage';

/**
 * 定时检查token是否过期的hook
 * @param interval 检查间隔，默认5分钟
 */
export function useTokenCheck(interval: number = 5 * 60 * 1000) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 清除之前的定时器
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // 设置定时检查
    intervalRef.current = setInterval(() => {
      const token = localStg.get('token');
      if (token && isTokenExpired(token)) {
        // token过期，跳转到登录页面
        handleLoginExpired();
      }
    }, interval);

    // 组件卸载时清除定时器
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [interval]);

  return {
    // 手动检查token是否过期
    checkToken: () => {
      const token = localStg.get('token');
      if (token && isTokenExpired(token)) {
        handleLoginExpired();
        return false;
      }
      return true;
    }
  };
}
