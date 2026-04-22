import React, { useState } from 'react';

interface TableRow { [key: string]: any; }

interface AiTableResultProps {
  data: TableRow[];
  sql?: string;
  mapping?: { [key: string]: string };
  chartName?: { x_name?: string; y_name?: string; title?: string };
  /** 采纳回调（仅实时消息传入），参数为表格数据 */
  onAccept?: (data: TableRow[]) => void;
  /** 不采纳回调（仅实时消息传入） */
  onReject?: () => void;
}

const AiTableResult: React.FC<AiTableResultProps> = ({ data, sql, chartName, onAccept, onReject }) => {
  const [sqlExpanded, setSqlExpanded] = useState(false);

  if (!data || data.length === 0) return <span>无数据返回</span>;

  // 取表头（所有 key 的并集）
  const columns = Array.from(new Set(data.flatMap(row => Object.keys(row))));

  // 列名显示：优先用 chartName 里的语义名
  const colLabel = (col: string) => {
    if (chartName?.x_name && col === Object.keys(data[0])[0]) return chartName.x_name;
    if (chartName?.y_name && col === Object.keys(data[0])[1]) return chartName.y_name;
    return col;
  };

  return (
    <div className="ai-table-result">
      {chartName?.title && (
        <div className="ai-table-title">{chartName.title}</div>
      )}

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

      {/* 采纳 / 不采纳（仅实时消息） */}
      {(onAccept || onReject) && (
        <div className="ai-accept-bar">
          {onAccept && (
            <button className="ai-accept-btn" onClick={() => onAccept(data)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              采纳
            </button>
          )}
          {onReject && (
            <button className="ai-reject-btn" onClick={onReject}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="13" height="13">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              不采纳
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default AiTableResult;
