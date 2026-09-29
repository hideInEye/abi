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
export const handleLoginExpired = adapter.handleLoginExpired;
export const readAuthToken = adapter.readAuthToken;
