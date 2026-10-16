import { createBrowserAuthAdapter } from '@sa/auth';

function notifyLoginExpired(content: string, redirectDelay: number) {
  void import('antd/es/message').then(({ default: message }) => {
    message.warning({
      content,
      duration: Math.max(redirectDelay / 1000, 1.5),
      key: 'chat-login-expired'
    });
  });
}

const adapter = createBrowserAuthAdapter({
  getEnvironment: () => window,
  notify: ({ message: content, redirectDelay }) => {
    notifyLoginExpired(content, redirectDelay);
  },
  stateKey: '__CHAT_AUTH_UNAUTHORIZED_STATE__'
});

export const authManager = adapter.authManager;
export const getAuthorization = adapter.getAuthorization;
export const readAuthToken = adapter.readAuthToken;

export function handleLoginExpired(noticeMessage?: string) {
  const hasHostHandler = typeof window.onTokenExpired === 'function';

  return authManager.handleUnauthorized({
    message: noticeMessage,
    // 显式回到 ABI 首页，避免保留 Chat 地址或落回角色默认的 Chat 首页。
    preserveRedirect: true,
    redirectPath: '/home',
    redirectDelay: hasHostHandler ? 0 : undefined,
    showNotice: !hasHostHandler
  });
}
