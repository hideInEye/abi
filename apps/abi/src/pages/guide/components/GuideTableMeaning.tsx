import { Component as TableMeaningList } from '@/pages/workbench/data-preparation/data-table-meaning';

/**
 * Guide页面的表语义包装组件
 * 控制布局高度，适配向导流程
 */
export const GuideTableMeaning: React.FC = () => {
  return (
    <div 
      style={{ 
        height: 'calc(100vh - 11.25rem)',
        overflow: 'hidden',
      }}
      className="guide-table-meaning-wrapper"
    >
      <style>{`
        .guide-table-meaning-wrapper > div {
          min-height: auto !important;
          height: 100% !important;
        }
      `}</style>
      <TableMeaningList />
    </div>
  );
};
