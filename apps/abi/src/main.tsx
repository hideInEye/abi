import { createRoot } from 'react-dom/client';
// import { ErrorBoundary } from 'react-error-boundary';
import { Provider } from 'react-redux';
import { qiankunWindow, renderWithQiankun } from 'vite-plugin-qiankun/dist/helper';

import { setupRouter } from '@/router';
import { store } from '@/store';
import { localStg } from '@/utils/storage';
import { setupRequestInterceptor } from '@/utils/requestInterceptor';

import FallbackRender from '../ErrorBoundary.tsx';

import App from './App.tsx';
import './plugins/assets';
import { setupI18n } from './locales';
import { setupDayjs, setupIconifyOffline, setupLoading, setupNProgress } from './plugins';
import { fetchLoginChatbiByOnenet } from './service/api/index.ts';

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
    } catch (error) {
      console.log(error);
    }
  }

  setupNProgress();

  setupIconifyOffline();

  setupRouter();

  // 设置请求拦截器
  setupRequestInterceptor();

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

if (qiankunWindow.__POWERED_BY_QIANKUN__) {
  initQianKun();
} else {
  setupApp({});
}
