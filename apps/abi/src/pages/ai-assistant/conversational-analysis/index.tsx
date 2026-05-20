import { Spin } from 'antd';
import { useRouter } from '@sa/simple-router';

import { getChatStandaloneUrl, openChatConversationWindow } from '@/utils/chatWindow';

function getSpaceIdFromContext() {
  const fromQuery = new URLSearchParams(window.location.search).get('spaceId');
  if (fromQuery) {
    return fromQuery;
  }

  const fromStorage = localStorage.getItem('spaceId');
  return fromStorage || undefined;
}

/**
 * 兼容旧路由：
 * 命中 `/ai-assistant/conversational-analysis` 时统一转发到 chat 独立页面，
 * 避免子应用继续渲染在主应用布局中。
 */
export function Component() {
  const { push } = useRouter();

  useEffect(() => {
    const spaceId = getSpaceIdFromContext();
    const result = openChatConversationWindow({ spaceId });

    // 若浏览器拦截新开页，降级为当前页直接跳转到独立 chat 地址
    if (result === 'blocked') {
      window.location.replace(getChatStandaloneUrl({ spaceId }));
      return;
    }

    push('/home');
  }, [push]);

  return (
    <div className="flex h-full items-center justify-center">
      <Spin tip="正在打开对话页面..." />
    </div>
  );
}
