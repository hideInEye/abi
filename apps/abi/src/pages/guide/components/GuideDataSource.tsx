import { Component as DataSourceList } from '@/pages/workbench/data-preparation/data-source';

/**
 * Guide页面的数据源包装组件
 * 控制布局高度，适配向导流程
 */
export const GuideDataSource: React.FC = () => {
  return (
    <div 
      style={{ 
        height: 'calc(100vh - 11.25rem)',
        overflow: 'hidden',
      }}
      className="guide-data-source-wrapper"
    >
      <style>{`
        .guide-data-source-wrapper > div {
          min-height: auto !important;
          height: 100% !important;
        }
        .guide-data-source-wrapper > div > div:last-of-type {
          height: calc(100% - 3.75rem) !important;
        }
      `}</style>
      <DataSourceList />
    </div>
  );
};
