import React, { useState, useRef, useCallback } from 'react';

interface TableRow { [key: string]: any; }

interface AiTableResultProps {
  data: TableRow[];
  sql?: string;
  mapping?: { [key: string]: string };
  chartName?: { x_name?: string; y_name?: string; title?: string };
  /** 是否已采纳 */
  accepted?: boolean;
  /** 是否为实时消息（true=可点击，false=只读展示） */
  isNew?: boolean;
  /** 切换采纳/取消采纳（传入表格数据），仅 isNew=true 时可点击 */
  onToggleAccept?: (data: TableRow[]) => void;
}

const AiTableResult: React.FC<AiTableResultProps> = ({ data, sql, chartName, accepted = false }) => {
  const [sqlExpanded, setSqlExpanded] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lockedWidthRef = useRef<number | null>(null);

  const handleCollapse = useCallback(() => {
    setCollapsed(prev => {
      if (!prev) {
        if (containerRef.current) {
          lockedWidthRef.current = containerRef.current.offsetWidth;
        }
      } else {
        lockedWidthRef.current = null;
      }
      return !prev;
    });
  }, []);

  if (!data || data.length === 0) return <span>无数据返回</span>;

  const columns = Array.from(new Set(data.flatMap(row => Object.keys(row))));

  const colLabel = (col: string) => {
    if (chartName?.x_name && col === Object.keys(data[0])[0]) return chartName.x_name;
    if (chartName?.y_name && col === Object.keys(data[0])[1]) return chartName.y_name;
    return col;
  };

  return (
    <div
      ref={containerRef}
      className={`ai-table-result${accepted ? ' accepted' : ''}`}
      style={lockedWidthRef.current ? { minWidth: lockedWidthRef.current } : undefined}
    >
      {/* 标题行 */}
      {chartName?.title && (
        <div className="ai-table-header-row">
          <div className="ai-table-title">{chartName.title}</div>
        </div>
      )}

      {/* 折叠内容区域 */}
      <div className={`ai-table-collapse-content${collapsed ? ' collapsed' : ''}`}>
        {/* 数据表格 */}
        <div className="ai-table-wrapper">
          <table className="ai-table">
            <thead>
              <tr>
                {columns.map(col => (
                  <th key={col}>{colLabel(col)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i}>
                  {columns.map(col => (
                    <td key={col}>{row[col] ?? '-'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="ai-table-footer-row">
          <div className="ai-table-meta">共 {data.length} 条记录</div>
        </div>
        {/* SQL 折叠 - 独立一行，左对齐 */}
        {sql && (
          <div className="ai-sql-block">
            <div
              className="ai-sql-toggle"
              onClick={() => setSqlExpanded(v => !v)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"
                style={{ transition: 'transform 0.2s', transform: sqlExpanded ? 'rotate(90deg)' : 'none', flexShrink: 0 }}>
                <polyline points="9 18 15 12 9 6"/>
              </svg>
              查看 SQL
            </div>
            {sqlExpanded && (
              <pre className="ai-sql-content">{sql}</pre>
            )}
          </div>
        )}
      </div>

      {/* 右下角折叠按钮 */}
      <div className="ai-table-collapse-row">
        <button
          className="ai-collapse-btn"
          onClick={handleCollapse}
          title={collapsed ? '展开内容' : '折叠内容'}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11"
            style={{ transition: 'transform 0.2s', transform: collapsed ? 'rotate(180deg)' : 'none' }}>
            <polyline points="18 15 12 9 6 15"/>
          </svg>
          {collapsed ? '展开' : '折叠'}
        </button>
      </div>
    </div>
  );
};

export default AiTableResult;
