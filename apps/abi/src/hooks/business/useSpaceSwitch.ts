import { useCallback } from 'react';

import { useAppDispatch } from '@/hooks/business/useStore';
import { changeSpaceId, setSpaceHidden } from '@/store/slice/app';
import { clearConversationCache } from '@/utils/cache';
import { getChatStandaloneUrl } from '@/utils/chatWindow';
import { persistSpaceId } from '@/utils/spaceStorage';
import { localStg } from '@/utils/storage';
import { getSpaceMenuBySpaceIdApi } from '@/service/api';

/** 空间切换Hook 用于统一管理空间切换时的缓存清理和状态重置 */
export function useSpaceSwitch() {
  const dispatch = useAppDispatch();

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
      options?: { redirect?: boolean; chatId?: string | number }
    ) => {
      const url = redirectPath
        ? `${redirectPath}`
        : options?.chatId !== undefined && options?.chatId !== null && `${options.chatId}` !== ''
          ? getChatStandaloneUrl({ chatId: options.chatId, spaceId })
          : '';

      // 必须在同步点击上下文中尽早触发打开新窗口，避免 await 后被浏览器拦截为弹窗

      // 清除对话相关的缓存，避免显示上个空间的对话列表
      clearConversationCache();

      // 如果空间内没有菜单权限隐藏左边菜单
      const { data, error } = await getSpaceMenuBySpaceIdApi(Number(spaceId));
      if(!error) {
        const isHidden = data && data.length > 0
        dispatch(setSpaceHidden(!isHidden))
      }else {
        dispatch(setSpaceHidden(false))
      }
      // 先同步并等待清除标签页（关闭前一个空间打开的 tab）
      // try {
      //   await dispatch(clearTabs());
      // } catch {
      //   // ignore error but continue
      // }

      // 移除持久化的 tabs，防止重启/重新登录时恢复到旧空间的 tabs
      localStg.remove('globalTabs');

      // 设置新的空间ID 到 localStorage
      persistSpaceId(spaceId);
      if (options?.chatId !== undefined && options?.chatId !== null && `${options.chatId}` !== '') {
        localStorage.setItem('chatId', String(options.chatId));
      }

      // 更新全局状态
      dispatch(changeSpaceId(spaceId));

      // 触发全局事件（供其它页面监听并刷新数据）
      const event = new CustomEvent('space-change', { detail: { spaceId } });
      window.dispatchEvent(event);
      if (options?.redirect || !url) return;

      window.open(url, '_blank', 'noopener,noreferrer');

    },
    [dispatch]
  );

  /**
   * 仅更新空间ID，不跳转页面
   *
   * @param spaceId 空间ID
   */
  const updateSpaceId = useCallback((spaceId: number) => {
    clearConversationCache();
    persistSpaceId(spaceId);
  }, []);

  return {
    switchToSpace,
    updateSpaceId
  };
}
