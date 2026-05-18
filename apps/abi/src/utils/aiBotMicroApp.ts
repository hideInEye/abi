import { registerMicroApps, start } from 'qiankun';

/**
 * 主应用启动时注册 chat 子应用，后续只依赖路由激活挂载
 */
export function registerAiBotMicroApp() {

registerMicroApps([
  {
    container:'#root',
    name: 'ai-bot', // app name registered
    entry: '//localhost:5173/chat-ui/',
    activeRule: '/chat-ui/',
  },
]);

start();
}

