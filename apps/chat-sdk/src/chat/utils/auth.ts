import { createBrowserAuthAdapter } from '@sa/auth';
import { message } from 'antd';

const adapter = createBrowserAuthAdapter({
  getEnvironment: () => window,
  notify: ({ message: content, redirectDelay }) => {
    message.warning({
      content,
      duration: Math.max(redirectDelay / 1000, 1.5),
      key: 'chat-login-expired'
    });
  },
  stateKey: '__CHAT_AUTH_UNAUTHORIZED_STATE__'
});

export const authManager = adapter.authManager;
export const getAuthorization = adapter.getAuthorization;
export const handleLoginExpired = adapter.handleLoginExpired;
export const readAuthToken = adapter.readAuthToken;
