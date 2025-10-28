import { useCallback } from 'react';

import { useAppDispatch } from '@/hooks/business/useStore';
import { changeSpaceId } from '@/store/slice/app';
import { clearTabs } from '@/store/slice/tab';
import { clearConversationCache } from '@/utils/cache';
import { localStg } from '@/utils/storage';
import { useRouter } from '~/packages/simple-router/src';

/** 空间切换Hook 用于统一管理空间切换时的缓存清理和状态重置 */
export function useSpaceSwitch() {
  const { push } = useRouter();
  const dispatch = useAppDispatch();

  /**
   * 切换到指定空间
   *
   * @param spaceId 空间ID
   * @param redirectPath 跳转路径，默认为对话分析页面
   */
  const switchToSpace = useCallback(
    async (spaceId: number, redirectPath = '/ai-assistant/conversational-analysis') => {
      // 清除对话相关的缓存，避免显示上个空间的对话列表
      clearConversationCache();

      // 先同步并等待清除标签页（关闭前一个空间打开的 tab）
      try {
        await dispatch(clearTabs());
      } catch {
        // ignore error but continue
      }

      // 移除持久化的 tabs，防止重启/重新登录时恢复到旧空间的 tabs
      localStg.remove('globalTabs');

      // 设置新的空间ID 到 localStorage
      localStorage.setItem('spaceId', spaceId.toString());

      // 更新全局状态
      dispatch(changeSpaceId(spaceId));

      // 触发全局事件（供其它页面监听并刷新数据）
      const event = new CustomEvent('space-change', { detail: { spaceId } });
      window.dispatchEvent(event);

      // 为了确保即使目标路径与当前路径相同也会触发刷新，附加一个时间戳 query
      const sep = redirectPath.includes('?') ? '&' : '?';
      const url = `${redirectPath}${sep}_ts=${Date.now()}`;
      push(url);
    },
    [dispatch, push]
  );

  /**
   * 仅更新空间ID，不跳转页面
   *
   * @param spaceId 空间ID
   */
  const updateSpaceId = useCallback((spaceId: number) => {
    clearConversationCache();
    localStorage.setItem('spaceId', spaceId.toString());
  }, []);

  return {
    switchToSpace,
    updateSpaceId
  };
}
