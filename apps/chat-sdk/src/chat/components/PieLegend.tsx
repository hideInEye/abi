import React, { useState, useLayoutEffect, useRef } from 'react';

interface LegendItem { name: string; value: number; color: string }

interface PieLegendProps {
  data: LegendItem[];
  maxRows?: number;
  onItemClick?: (name: string) => void;
  fontSize?: number;
  /** 外部重置信号：data 变化时传入新值，用于清空内部选中状态 */
  resetKey?: string | number;
}

/** 测量容器内前几个子元素刚好占 maxRows 行 */
function measureRowCutoff(el: HTMLDivElement, maxRows: number): number {
  const children = Array.from(el.children) as HTMLElement[];
  if (children.length <= 1) return children.length;
  let rows = 1, lastTop = children[0].offsetTop;
  for (let i = 1; i < children.length; i++) {
    if (children[i].offsetTop > lastTop) {
      if (++rows > maxRows) return i;
      lastTop = children[i].offsetTop;
    }
  }
  return children.length;
}

/** 自动测量 + 分页状态管理 */
function useLegendPagination(data: LegendItem[], maxRows: number, wrapRef: React.RefObject<HTMLDivElement | null>) {
  const [itemsPerPage, setItemsPerPage] = useState(0);
  const [page, setPage] = useState(0);
  const dataKey = `${data.length}-${data[0]?.name}-${data[data.length - 1]?.name}`;

  useLayoutEffect(() => {
    setPage(0);
    setItemsPerPage(0);
    // 测量在同一个 effect 的下一帧完成（setState(0) 触发重渲染后由下方分支处理）
  }, [dataKey]);

  useLayoutEffect(() => {
    if (itemsPerPage !== 0 || !wrapRef.current) return;
    setItemsPerPage(measureRowCutoff(wrapRef.current, maxRows) || data.length || 1);
  }, [itemsPerPage, data.length, maxRows]);

  const needsMeasure = itemsPerPage === 0;
  const ipp = needsMeasure ? data.length : itemsPerPage;
  const totalPages = Math.max(1, Math.ceil(data.length / ipp));
  const safePage = Math.min(page, Math.max(0, totalPages - 1));

  return {
    needsMeasure,
    totalPages,
    safePage,
    currentItems: needsMeasure ? data : data.slice(safePage * ipp, (safePage + 1) * ipp),
    setPage,
  };
}

const PieLegend: React.FC<PieLegendProps> = ({ data, maxRows = 3, onItemClick, fontSize = 12, resetKey }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const { needsMeasure, totalPages, safePage, currentItems, setPage } = useLegendPagination(data, maxRows, wrapRef);
  // 记录被点击隐藏的图例名称
  const [deselected, setDeselected] = useState<Set<string>>(new Set());

  // resetKey 变化时清空选中状态（数据切换）
  useLayoutEffect(() => { setDeselected(new Set()); }, [resetKey]);

  if (!data?.length) return null;

  const hasPagination = totalPages > 1;
  const isFirst = safePage === 0;
  const isLast = safePage >= totalPages - 1;

  const handleClick = (name: string) => {
    setDeselected(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
    onItemClick?.(name);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '8px 10px 0', fontFamily: 'Arial, sans-serif' }}>
      {/* 图例区域 */}
      <div ref={wrapRef} style={{
        flex: 1, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px 14px',
        ...(needsMeasure ? { overflow: 'hidden', maxHeight: maxRows * (fontSize + 12) + (maxRows - 1) * 6 } : {}),
      }}>
        {currentItems.map((item, i) => {
          const isOff = deselected.has(item.name);
          return (
            <div
              key={`${item.name}-${safePage}-${i}`}
              onClick={() => handleClick(item.name)}
              style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize, opacity: isOff ? 0.4 : 1 }}
            >
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, backgroundColor: isOff ? '#aaa' : item.color, marginRight: 5, flexShrink: 0 }} />
              <span style={{ color: '#333', whiteSpace: 'nowrap' }}>{item.name}</span>
            </div>
          );
        })}
      </div>
      {/* 分页按钮：测量时预留空间（visibility:hidden），测量完根据是否需要分页显示 */}
      {(needsMeasure || hasPagination) && (
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', marginLeft: 8, gap: 4, visibility: !needsMeasure && hasPagination ? 'visible' : 'hidden' }}>
          <span onClick={() => !isFirst && setPage(safePage - 1)}
            style={{ cursor: isFirst ? 'default' : 'pointer', color: isFirst ? '#ccc' : '#666', fontSize: 16, userSelect: 'none', lineHeight: 1 }}>◄</span>
          <span style={{ fontSize: 12, color: '#666', minWidth: 32, textAlign: 'center' }}>{safePage + 1}/{totalPages}</span>
          <span onClick={() => !isLast && setPage(safePage + 1)}
            style={{ cursor: isLast ? 'default' : 'pointer', color: isLast ? '#ccc' : '#666', fontSize: 16, userSelect: 'none', lineHeight: 1 }}>►</span>
        </div>
      )}
    </div>
  );
};

export default PieLegend;
