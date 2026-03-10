import { loadMicroApp } from 'qiankun';
import styles from './index.module.css';

/**
 * 数据大屏页面组件
 * 使用 qiankun 微前端架构，动态加载 abi-dashboard 子应用
 */
export function Component() {
  useEffect(() => {
    const container = document.getElementById('abi-dashboard');
    if (!container) {
      console.error('Container #abi-dashboard not found');
      return;
    }

    const microApp = loadMicroApp({
      container: '#abi-dashboard',
      entry: import.meta.env.VITE_MICRO_ABI_DASHBOARD_ENTRY,
      name: 'abi-dashboard',
      props: {},
    });

    // eslint-disable-next-line consistent-return
    return () => {
      microApp.mountPromise.then(() => microApp.unmount());
    };
  }, []);

  return (
    <div
      className={styles['abi-dashboard']}
      id="abi-dashboard"
    >
      数据大屏
    </div>
  );
}
