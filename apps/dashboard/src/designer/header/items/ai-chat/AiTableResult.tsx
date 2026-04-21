import React, { useState } from 'react';

interface TableRow { [key: string]: any; }

interface AiTableResultProps {
  data: TableRow[];
  sql?: string;
  mapping?: { [key: string]: string };
  chartName?: { x_name?: string; y_name?: string; title?: string };
}

const AiTableResult: React.FC<AiTableResultProps> = ({ data, sql, chartName }) => {
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
    </div>
  );
};

export default AiTableResult;
