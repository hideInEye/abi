import { createBrowserAuthAdapter } from '@sa/auth';

import { showWidgetToast } from '../components/chat-widget/widgetToast';

const adapter = createBrowserAuthAdapter({
  getEnvironment: () => window,
  notify: ({ message: content }) => {
    /* 窗内通知条统一 3s 自动消失，不再用 body 级 antd message（会被悬浮面板遮挡） */
    showWidgetToast('warning', content);
  },
  stateKey: '__CHAT_AUTH_UNAUTHORIZED_STATE__'
});

export const authManager = adapter.authManager;
export const getAuthorization = adapter.getAuthorization;
export const handleLoginExpired = adapter.handleLoginExpired;
export const readAuthToken = adapter.readAuthToken;
