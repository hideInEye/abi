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

// 兼容后端助手分享返回的哈希路径（#/share_url/{code}，助手与大屏共用）：
// 本应用为 history 路由无法消费哈希路径，独立运行时以全屏 iframe 内嵌 chat 分享页，
// 地址栏保持后端原路径不变，也不经过本应用路由（避免 404 / 登录跳转闪烁）
// TODO: 过渡兼容旧路径 #/dashboard_share_page/{code}，检测到后直接替换成 share_url，后端切换完成后删除旧路径分支
const shareHashMatch = !qiankunWindow.__POWERED_BY_QIANKUN__
  ? window.location.hash.match(/^#\/?(share_url|dashboard_share_page)\/([^/?#]+)/)
  : null;
if (shareHashMatch && shareHashMatch[1] === 'dashboard_share_page') {
  const newHash = window.location.hash.replace('dashboard_share_page', 'share_url');
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${newHash}`);
}
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
  // 分享页改用新 SDK：引入 abi-assistant-widget 的 css + js 两个标签，加载完成后加 <abi-assistant> 悬浮窗标签。
  // base="/api" 与 chat 应用 config.json 的 VITE_BASE_API 一致，保证网关路径拼接正确；
  // theme-switch 开启悬浮窗头部的“外观自定义”入口按钮（打开定制抽屉，支持背景/标题栏/字体/图表自定义）。
  const shareCode = shareHashMatch[2];
  const rootEl = document.getElementById('root');
  if (rootEl) rootEl.replaceChildren();

  // bundle 文件名无内容 hash，浏览器会强缓存旧版：dev 带时间戳永远拉新，生产带版本号（发新产物后 bump）
  const widgetVer = import.meta.env.DEV ? String(Date.now()) : '20260929-1813';

  const link = document.createElement('link');
  // id 与 SDK 内置去重一致，防止 loadStyles 再插一条不带 ?v 的旧缓存 CSS
  link.id = 'abi-assistant-widget-styles';
  link.rel = 'stylesheet';
  link.href = `/chat-ui/abi-assistant-widget.css?v=${widgetVer}`;
  document.head.appendChild(link);

  const script = document.createElement('script');
  script.src = `/chat-ui/abi-assistant-widget.js?v=${widgetVer}`;
  script.onload = () => {
    const assistant = document.createElement('abi-assistant');
    assistant.setAttribute('share-code', shareCode);
    assistant.setAttribute('base', '/api');
    assistant.setAttribute('theme-switch', '');
    // SDK 为纯弹窗，关闭按钮派发 close 事件；分享页为独立页面，关闭即移除弹窗
    assistant.addEventListener('close', () => assistant.remove());
    document.body.appendChild(assistant);
  };
  document.head.appendChild(script);
} else if (qiankunWindow.__POWERED_BY_QIANKUN__) {
  initQianKun();
} else {
  setupApp({});
}
