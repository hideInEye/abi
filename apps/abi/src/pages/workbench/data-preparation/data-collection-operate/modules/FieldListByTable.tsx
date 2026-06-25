import { FieldNumberOutlined, FieldStringOutlined } from '@ant-design/icons';
import { Empty, Tooltip } from 'antd';
import React, { useMemo } from 'react';

export interface FieldItem {
  tfieldId?: string | number;
  tfieldName?: string;
  tfieldShowName?: string;
  tfieldType?: 'd' | 'q';
  fieldType?: string;
  dataType?: string;
  originName?: string;
  rtableId?: string | number;
  [key: string]: any;
}

export interface FieldListByTableProps {
  fields: FieldItem[];
  /** 根据字段返回所属表名，为空则使用 defaultTableName */
  getTableName?: (field: FieldItem) => string | undefined;
  /** 根据字段返回表中文备注 */
  getTableRemark?: (field: FieldItem) => string | undefined;
  /** 底底表名 */
  defaultTableName?: string;
  /** 空状态提示 */
  emptyText?: string;
}

function inferFieldCategory(field: FieldItem): 'dimension' | 'metric' {
  const type = (field.fieldType || field.dataType || '').toLowerCase();
  const metricTypes = [
    'int', 'integer', 'bigint', 'smallint', 'tinyint', 'mediumint',
    'float', 'double', 'decimal', 'numeric', 'real', 'number',
    'long', 'short', 'byte'
  ];
  for (const mt of metricTypes) {
    if (type.includes(mt)) return 'metric';
  }
  return 'dimension';
}

function getFieldDisplayName(field: FieldItem): string {
  return field.tfieldShowName || field.tfieldName || field.originName || '未命名字段';
}

/** 字段中文备注（bizName > tfieldAlias） */
function getFieldRemark(field: FieldItem): string {
  return field.bizName || field.tfieldAlias || '';
}

export const FieldListByTable: React.FC<FieldListByTableProps> = ({
  fields,
  getTableName,
  getTableRemark,
  defaultTableName = '其他',
  emptyText = '暂无字段'
}) => {
  const grouped = useMemo(() => {
    const map = new Map<string, FieldItem[]>();
    for (const field of fields) {
      const tableName = getTableName?.(field) || defaultTableName;
      if (!map.has(tableName)) {
        map.set(tableName, []);
      }
      map.get(tableName)!.push(field);
    }
    return Array.from(map.entries()).map(([tableName, items]) => ({
      tableName,
      items
    }));
  }, [fields, getTableName, defaultTableName]);

  if (fields.length === 0) {
    return (
      <div style={{ padding: '24px 0' }}>
        <Empty description={emptyText} image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </div>
    );
  }

  return (
    <div style={{ padding: '4px 0' }}>
      {grouped.map(({ tableName, items }) => {
          const remark = getTableRemark?.(items[0]) || '';
          return (
          <div key={tableName} style={{ marginBottom: 16 }}>
          <div
            style={{
              padding: '6px 10px',
              fontSize: 12,
              fontWeight: 600,
              color: '#8fa0b5',
              borderBottom: '1px solid rgba(130, 140, 200, 0.12)',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <span>{tableName}</span>
            {remark && (
              <span style={{
                marginLeft: 'auto',
                flexShrink: 0,
                fontSize: 11,
                fontWeight: 400,
                color: '#6b7fa0',
                background: 'rgba(130,140,200,0.14)',
                border: '1px solid rgba(130,140,200,0.30)',
                borderRadius: 20,
                padding: '0 6px',
                lineHeight: '17px',
                display: 'inline-block',
              }}>
                {remark}
              </span>
            )}
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {items.map((item) => {
              const category = item.tfieldType
                ? (item.tfieldType === 'q' ? 'metric' : 'dimension')
                : inferFieldCategory(item);
              const isMetric = category === 'metric';
              const icon = isMetric
                ? <FieldNumberOutlined style={{ color: '#5b7cf7', fontSize: 12 }} />
                : <FieldStringOutlined style={{ color: '#52c41a', fontSize: 12 }} />;

              // 胶囊颜色跟图标一致：指标蓝紫，维度绿色
              const tagColor = isMetric
                ? { color: '#5b7cf7', bg: 'rgba(91,124,247,0.10)', border: 'rgba(91,124,247,0.22)' }
                : { color: '#389e0d', bg: 'rgba(82,196,26,0.10)', border: 'rgba(82,196,26,0.28)' };

              const displayName = getFieldDisplayName(item);
              const remark = getFieldRemark(item);
              const tooltipContent = remark ? `${displayName}（${remark}）` : displayName;

              return (
                <li
                  key={item.tfieldId || item.tfieldName || item.originName}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 10px',
                    borderRadius: 6,
                    fontSize: 13,
                    color: '#3e5068',
                    cursor: 'default',
                    transition: 'background 0.2s ease',
                    // CSS 变量驱动 hover，避免 Tooltip span 拦截 mouseEnter 事件
                  }}
                  className="field-list-item"
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(91, 124, 247, 0.06)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = '';
                  }}
                >
                  {icon}
                  <Tooltip placement="topLeft" title={tooltipContent}>
                    <span
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 140,
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      {displayName}
                    </span>
                  </Tooltip>
                  {remark && (
                    <span
                      style={{
                        flexShrink: 0,
                        maxWidth: 72,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontSize: 11,
                        color: tagColor.color,
                        background: tagColor.bg,
                        border: `1px solid ${tagColor.border}`,
                        borderRadius: 20,
                        padding: '0 7px',
                        lineHeight: '18px',
                        display: 'inline-block',
                      }}
                    >
                      {remark}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
          );
        })}
    </div>
  );
};

export default FieldListByTable;
