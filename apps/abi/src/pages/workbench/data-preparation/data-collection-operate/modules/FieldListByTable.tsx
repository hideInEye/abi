import { FieldNumberOutlined, FieldStringOutlined } from '@ant-design/icons';
import { Empty } from 'antd';
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
  /** 兜底表名 */
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

export const FieldListByTable: React.FC<FieldListByTableProps> = ({
  fields,
  getTableName,
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
      {grouped.map(({ tableName, items }) => (
        <div key={tableName} style={{ marginBottom: 16 }}>
          <div
            style={{
              padding: '6px 10px',
              fontSize: 12,
              fontWeight: 600,
              color: '#8fa0b5',
              borderBottom: '1px solid rgba(130, 140, 200, 0.12)'
            }}
          >
            {tableName}
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {items.map((item) => {
              const category = item.tfieldType
                ? (item.tfieldType === 'q' ? 'metric' : 'dimension')
                : inferFieldCategory(item);
              const icon = category === 'metric'
                ? <FieldNumberOutlined style={{ color: '#5b7cf7', fontSize: 12 }} />
                : <FieldStringOutlined style={{ color: '#52c41a', fontSize: 12 }} />;

              return (
                <li
                  key={item.tfieldId || item.tfieldName || item.originName}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '7px 10px',
                    borderRadius: 6,
                    fontSize: 13,
                    color: '#3e5068',
                    cursor: 'default',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(91, 124, 247, 0.06)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  {icon}
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1
                    }}
                    title={getFieldDisplayName(item)}
                  >
                    {getFieldDisplayName(item)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default FieldListByTable;
