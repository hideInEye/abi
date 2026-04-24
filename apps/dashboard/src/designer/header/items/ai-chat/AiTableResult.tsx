import React, { useState } from 'react';

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

const AiTableResult: React.FC<AiTableResultProps> = ({ data, sql, chartName,accepted = false,isNew = false,onToggleAccept,}) => {
  const [sqlExpanded, setSqlExpanded] = useState(false);

  if (!data || data.length === 0) return <span>无数据返回</span>;

  const columns = Array.from(new Set(data.flatMap(row => Object.keys(row))));

  const colLabel = (col: string) => {
    if (chartName?.x_name && col === Object.keys(data[0])[0]) return chartName.x_name;
    if (chartName?.y_name && col === Object.keys(data[0])[1]) return chartName.y_name;
    return col;
  };

  return (
    <div className={`ai-table-result${accepted ? ' accepted' : ''}`}>
      {/* 标题行 + 采纳星 */}
      <div className="ai-table-header-row">
        {chartName?.title && (
          <div className="ai-table-title">{chartName.title}</div>
        )}
        <button
          className={`ai-accept-star${accepted ? ' accepted' : ''}${!isNew ? ' readonly' : ''}`}
          title={accepted ? '取消采纳' : '采纳此结果'}
          onClick={() => isNew && onToggleAccept && onToggleAccept(data)}
          style={{ pointerEvents: isNew ? 'auto' : 'none' }}
        >
          {accepted ? (
            /* 实心星 */
            <svg viewBox="0 0 24 24" width="16" height="16" fill="#1677ff" stroke="#1677ff" strokeWidth="1">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          ) : (
            /* 空心星 */
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#bfbfbf" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          )}
        </button>
      </div>

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

      <div className="ai-table-meta">共 {data.length} 条记录</div>

      {/* SQL 折叠 */}
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
  );
};

export default AiTableResult;
