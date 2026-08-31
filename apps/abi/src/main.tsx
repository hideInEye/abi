import { createRoot } from 'react-dom/client';
// import { ErrorBoundary } from 'react-error-boundary';
import { Provider } from 'react-redux';
import { qiankunWindow, renderWithQiankun } from 'vite-plugin-qiankun/dist/helper';

import { setupRouter } from '@/router';
import { store } from '@/store';
import { localStg } from '@/utils/storage';

import FallbackRender from '../ErrorBoundary.tsx';

import App from './App.tsx';
import { setupI18n } from './locales';
import { setupDayjs, setupIconifyOffline, setupLoading, setupNProgress } from './plugins';
import './plugins/assets';
import { fetchLoginChatbiByOnenet } from './service/api/index.ts';
import { resetLoginExpiredState } from './utils/auth.ts';
// import { createApp } from '@sa/framework';

// const modelModules = import.meta.glob('./models/*.ts', { eager: true })

// const models = Object.values(modelModules).map((m: any) => m.default)

//
// createApp({
//   models,
// })

// 兼容后端助手分享返回的哈希路径（#/dashboard_share_page/{code}）：
// 本应用为 history 路由无法消费哈希路径，独立运行时以全屏 iframe 内嵌 chat 分享页，
// 地址栏保持后端原路径不变，也不经过本应用路由（避免 404 / 登录跳转闪烁）
const shareHashMatch = !qiankunWindow.__POWERED_BY_QIANKUN__
  ? window.location.hash.match(/^#\/?dashboard_share_page\/([^/?#]+)/)
  : null;
let root: any;

async function setupApp(props: any) {
  setupI18n();

  setupLoading();

  const { basename, container, store: qiankunStore } = props;
  if (qiankunWindow.__POWERED_BY_QIANKUN__) {
    try {
      window.qiankunStore = qiankunStore;
      qiankunStore.commit('setShowMenu', false);
      qiankunStore.commit('setShowHeader', false);
      const res = await fetchLoginChatbiByOnenet();
      localStg.set('token', res.data?.access_token);
      resetLoginExpiredState();
    } catch (error) {
      console.log(error);
    }
  }

  setupNProgress();

  setupIconifyOffline();

  setupRouter();

  setupDayjs();

  // 更新提醒
  // setupAppVersionNotification();

  const resContainer = container ? container.querySelector('#root') : document.getElementById('root');
  if (!resContainer) return;
  root = createRoot(resContainer);
  root.render(
    // <ErrorBoundary fallbackRender={FallbackRender}>
      <Provider store={store}>
        <App />
      </Provider>
    // </ErrorBoundary>
  );
}

const initQianKun = () => {
  renderWithQiankun({
    bootstrap() {
      console.log('bootstrap');
    },
    mount(props: any) {
      console.log('mount');
      setupApp(props);
    },
    unmount(props: any) {
      console.log('unmount');
      // const { container } = props;
      // const mountRoot = container?.querySelector('#root');
      // ReactDOM.unmountComponentAtNode(mountRoot || document.querySelector('#root'));
      root.unmount();
      window.qiankunStore = null;
    }
  } as any);
};

if (shareHashMatch) {
  const iframe = document.createElement('iframe');
  iframe.src = `${window.location.origin}/chat-ui/#/dashboard_share_page/${decodeURIComponent(shareHashMatch[1])}`;
  iframe.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;border:0;';
  const rootEl = document.getElementById('root');
  if (rootEl) rootEl.replaceChildren(iframe);
  else document.body.appendChild(iframe);
} else if (qiankunWindow.__POWERED_BY_QIANKUN__) {
  initQianKun();
} else {
  setupApp({});
}
