import { createRoot } from 'react-dom/client';
// import { ErrorBoundary } from 'react-error-boundary';
import { Provider } from 'react-redux';
import { qiankunWindow, renderWithQiankun } from 'vite-plugin-qiankun/dist/helper';

import { setupRouter } from '@/router';
import { store } from '@/store';
import { registerAiBotMicroApp } from '@/utils/aiBotMicroApp';
import { setupRequestInterceptor } from '@/utils/requestInterceptor';
import { localStg } from '@/utils/storage';

import FallbackRender from '../ErrorBoundary.tsx';

import App from './App.tsx';
import { setupI18n } from './locales';
import { setupDayjs, setupIconifyOffline, setupLoading, setupNProgress } from './plugins';
import './plugins/assets';
import { fetchLoginChatbiByOnenet } from './service/api/index.ts';
// import { createApp } from '@sa/framework';

// const modelModules = import.meta.glob('./models/*.ts', { eager: true })

// const models = Object.values(modelModules).map((m: any) => m.default)

//
// createApp({
//   models,
// })
let root: any;
let teardownRequestInterceptor: null | (() => void) = null;

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
    } catch (error) {
      console.log(error);
    }
  }

  setupNProgress();

  setupIconifyOffline();

  setupRouter();

  // 主应用初始化时注册 chat 子应用，后续通过路由激活挂载
  registerAiBotMicroApp();

  // 设置请求拦截器
  teardownRequestInterceptor?.();
  teardownRequestInterceptor = setupRequestInterceptor();

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
      teardownRequestInterceptor?.();
      teardownRequestInterceptor = null;
      window.qiankunStore = null;
    }
  } as any);
};

if (qiankunWindow.__POWERED_BY_QIANKUN__) {
  initQianKun();
} else {
  setupApp({});
}
