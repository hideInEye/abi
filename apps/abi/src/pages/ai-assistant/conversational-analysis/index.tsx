import { loadMicroApp } from 'qiankun';
import { qiankunWindow } from 'vite-plugin-qiankun/dist/helper';

import styles from './index.module.css';

const { VITE_BASE_URL } = import.meta.env;

/**
 * AI 对话分析页面组件
 * 使用 qiankun 微前端架构，动态加载 AI 对话子应用
 * 支持智能对话、数据分析等 AI 功能
 */
export function Component() {
  useEffect(() => {
    // 获取子应用容器
    const container = document.getElementById('ai-bot');
    if (!container) {
      console.error('Container #ai-bot not found');
      return;
    }

    // 手动加载 AI 对话子应用 (微前端)
    const microApp = loadMicroApp({
      container: '#ai-bot', // 子应用挂载容器
      entry: import.meta.env.VITE_MICRO_AI_BOT_ENTRY, // 子应用入口地址
      name: 'ai-bot', // 子应用名称
      props: {
        // 传递给子应用的路由基础路径
        basename: '/ai-assistant/conversational-analysis'
        // 注释的代码支持根据是否为 qiankun 子应用动态调整路径
        // basename: (qiankunWindow as any)?.__POWERED_BY_QIANKUN__
        //   ? '/studio/chatbi/ai-assistant/conversational-analysis'
        //   : `${VITE_BASE_URL}/ai-assistant/conversational-analysis`
      }
    });

    // 组件卸载时清理子应用
    // eslint-disable-next-line consistent-return
    return () => {
      // 等待子应用挂载完成后再卸载，避免卸载时机问题
      microApp.mountPromise.then(() => microApp.unmount());
    };
  }, []);
  
  return (
    <div
      className={styles['ai-bot']}
      id="ai-bot" // 作为子应用的挂载点
    >
      ai对话
    </div>
  );
}
