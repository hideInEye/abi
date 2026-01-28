declare global {
  interface Window {
    APP_CONFIG: any;
    onTokenExpired?: () => Promise<void>;
  }
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import 'virtual:svg-icons-register'
import { renderWithQiankun, qiankunWindow } from 'vite-plugin-qiankun/dist/helper';
import { message } from 'antd';
// redux Provider已注释
// import { Provider } from 'react-redux';
// import { store } from './store/redux'; // 只导入store，移除persistor
// 移除PersistGate导入

const configPath = import.meta.env.MODE==='development' ? 'http://localhost:5173/config.json': '/chat-ui/config.json'
function render(props: any) {
  fetch(configPath)
    .then((res) => res.json())
    .then((config) => {
      console.log('config', config);
      window.APP_CONFIG = config;
      
      const { container, basename, onTokenExpired, spaceId } = props;
      // 将主应用传递的 token 过期处理函数挂载到 window 对象
      if (onTokenExpired) {
        window.onTokenExpired = onTokenExpired;
      }
      // 避免根id #root 与其他的 DOM 冲突
      createRoot(container ? container.querySelector('#root') : document.getElementById('root')!).render(
        <StrictMode>
          {/* redux Provider已注释 */}
          {/* <Provider store={store}> */}
            {/* 移除PersistGate包装器，直接使用BrowserRouter */}
            <BrowserRouter basename={(qiankunWindow as any)?.__POWERED_BY_QIANKUN__ ? basename : '/'}>
              <Routes>
                <Route path="/" element={<App spaceId={spaceId} />} />
              </Routes>
            </BrowserRouter>
          {/* </Provider> */}
        </StrictMode>,
      )
    })
    .catch((err) => {
      message.error('获取配置文件失败')
    })
}

const initQianKun = () => {
  renderWithQiankun(({
    mount(props: any) {
      console.log('mount',props);
      render(props);
    },
    bootstrap() {
      console.log('bootstrap');
    },
    unmount(props: any) {
      console.log('unmount');
      localStorage.removeItem('chatId')
      // const { container } = props;
      // const mountRoot = container?.querySelector('#root');
      // ReactDOM.unmountComponentAtNode(
      //   mountRoot || document.querySelector('#root'),
      // );
    },
  }) as any);
}

if (qiankunWindow.__POWERED_BY_QIANKUN__) {
  initQianKun()
} else {
  render({});
}
