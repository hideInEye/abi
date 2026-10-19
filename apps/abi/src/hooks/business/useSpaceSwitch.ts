import { useCallback, useRef } from 'react';

import { useAppDispatch } from '@/hooks/business/useStore';
import { getCurrentSpaceInfo, setCurrentSpaceInfo, setSpaceHidden } from '@/store/slice/app';
import type { CurrentSpaceInfo } from '@/store/slice/app';
import { store } from '@/store';
import { loadCurrentSpaceInfo } from '@/resources/currentSpaceInfo';
import { assertFlatRequestSuccess } from '@/service/request/flat-result';
import { clearConversationCache } from '@/utils/cache';
import { getChatStandaloneUrl } from '@/utils/chatWindow';
import { localStg } from '@/utils/storage';
import { getSpaceMenuBySpaceIdApi } from '@/service/api';

/** 空间切换Hook 用于统一管理空间切换时的缓存清理和状态重置 */
export function useSpaceSwitch() {
  const dispatch = useAppDispatch();
  const requestRunRef = useRef(0);

  /**
   * 切换到指定空间
   *
   * @param spaceId 空间ID
   * @param redirectPath 可选跳转路径；默认只切换空间，不打开页面
   */
  const switchToSpace = useCallback(
    async (
      spaceId: number,
      redirectPath?: string,
      options?: { redirect?: boolean; chatId?: string | number; spaceName?: string }
    ) => {
      spaceId = Number(spaceId);
      if (!Number.isFinite(spaceId) || spaceId <= 0) return false;
      const run = ++requestRunRef.current;
      const previousSpace = getCurrentSpaceInfo(store.getState());
      const token = localStg.get('token');
      const url = redirectPath
        ? `${redirectPath}`
        : options?.chatId !== undefined && options?.chatId !== null && `${options.chatId}` !== ''
          ? getChatStandaloneUrl({ chatId: options.chatId, spaceId })
          : '';

      let selected: CurrentSpaceInfo;
      let hasMenu: boolean;
      try {
        const result = await getSpaceMenuBySpaceIdApi(spaceId);
        assertFlatRequestSuccess(result);
        hasMenu = Boolean(result.data && result.data.length > 0);
        selected = options?.spaceName?.trim()
          ? { spaceId, spaceName: options.spaceName.trim() }
          : await loadCurrentSpaceInfo(spaceId);
      } catch {
        return false;
      }
      // 较慢的旧切换、其他入口的新选择或账号变化，都不能覆盖当前空间。
      if (run !== requestRunRef.current || token !== localStg.get('token') || previousSpace !== getCurrentSpaceInfo(store.getState())) return false;

      dispatch(setSpaceHidden(!hasMenu))

      // 只有空间权限请求明确成功后才清理旧空间状态并提交新空间。
      clearConversationCache();
      // 先同步并等待清除标签页（关闭前一个空间打开的 tab）
      // try {
      //   await dispatch(clearTabs());
      // } catch {
      //   // ignore error but continue
      // }

      // 移除持久化的 tabs，防止重启/重新登录时恢复到旧空间的 tabs
      localStg.remove('globalTabs');

      dispatch(setCurrentSpaceInfo(selected));
      if (options?.chatId !== undefined && options?.chatId !== null && `${options.chatId}` !== '') {
        localStorage.setItem('chatId', String(options.chatId));
      }

      // 触发全局事件（供其它页面监听并刷新数据）
      const event = new CustomEvent('space-change', { detail: selected });
      window.dispatchEvent(event);
      if (options?.redirect || !url) return true;

      window.open(url, '_blank', 'noopener,noreferrer');
      return true;

    },
    [dispatch]
  );

  return {
    switchToSpace
  };
}
