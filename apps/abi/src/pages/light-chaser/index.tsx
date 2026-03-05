import { loadMicroApp } from 'qiankun';
import styles from './index.module.css';

/**
 * 数据大屏页面组件
 * 使用 qiankun 微前端架构，动态加载 light-chaser 子应用
 */
export function Component() {
  useEffect(() => {
    const container = document.getElementById('light-chaser');
    if (!container) {
      console.error('Container #light-chaser not found');
      return;
    }

    const microApp = loadMicroApp({
      container: '#light-chaser',
      entry: import.meta.env.VITE_MICRO_LIGHT_CHASER_ENTRY,
      name: 'light-chaser',
      props: {},
    }); 

    // eslint-disable-next-line consistent-return
    return () => {
      microApp.mountPromise.then(() => microApp.unmount());
    };
  }, []);

  return (
    <div
      className={styles['light-chaser']}
      id="light-chaser"
    >
      数据大屏
    </div>
  );
}
