import { Component as AssistantList } from '@/pages/workbench/assistant-manage/assistant-config';

/**
 * Guide页面的智能助手包装组件
 * 控制布局高度，适配向导流程
 */
export const GuideAssistant: React.FC = () => {
  return (
    <div 
      style={{ 
        height: 'calc(100vh - 11.25rem)',
        overflow: 'hidden',
      }}
      className="guide-assistant-wrapper"
    >
      <style>{`
        .guide-assistant-wrapper > div {
          min-height: auto !important;
          height: 100% !important;
        }
        .guide-assistant-wrapper > div > div:last-of-type {
          height: calc(100% - 3.75rem) !important;
        }
      `}</style>
      <AssistantList />
    </div>
  );
};
