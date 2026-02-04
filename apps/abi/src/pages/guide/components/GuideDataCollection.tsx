import { Component as DataCollectionList } from '@/pages/workbench/data-preparation/data-collection';

/**
 * Guide页面的数据集包装组件
 * 控制布局高度，适配向导流程
 */
export const GuideDataCollection: React.FC = () => {
  return (
    <div 
      style={{ 
        height: 'calc(100vh - 11.25rem)',
        overflow: 'hidden',
      }}
      className="guide-data-collection-wrapper"
    >
      <style>{`
        .guide-data-collection-wrapper > div {
          min-height: auto !important;
          height: 100% !important;
        }
        .guide-data-collection-wrapper > div > div:last-of-type {
          height: calc(100% - 3.75rem) !important;
        }
      `}</style>
      <DataCollectionList />
    </div>
  );
};
