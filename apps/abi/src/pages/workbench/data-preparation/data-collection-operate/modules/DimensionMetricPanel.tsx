import { CaretRightOutlined, FieldNumberOutlined, FieldStringOutlined, TagOutlined } from '@ant-design/icons';
import type { CollapseProps } from 'antd';
import { Collapse, Empty } from 'antd';
import React from 'react';

interface FieldItem {
  tfieldId?: string | number;
  tfieldName?: string;
  tfieldShowName?: string;
  tfieldType?: 'd' | 'q';
  fieldType?: string;
  dataType?: string;
  originName?: string;
  [key: string]: any;
}

interface DimensionMetricPanelProps {
  fields?: FieldItem[];
}

/** 根据 SQL 字段类型推断是维度还是指标 */
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

/** 获取字段显示名 */
function getFieldDisplayName(field: FieldItem): string {
  return field.tfieldShowName || field.tfieldName || field.originName || '未命名字段';
}

/** 获取字段类型图标 */
function getFieldIcon(field: FieldItem) {
  const category = field.tfieldType
    ? (field.tfieldType === 'q' ? 'metric' : 'dimension')
    : inferFieldCategory(field);

  if (category === 'metric') {
    return <FieldNumberOutlined style={{ color: '#5b7cf7', fontSize: 12 }} />;
  }
  return <FieldStringOutlined style={{ color: '#52c41a', fontSize: 12 }} />;
}

const DimensionMetricPanel: React.FC<DimensionMetricPanelProps> = ({ fields = [] }) => {
  const dimensions = fields.filter(f => {
    if (f.tfieldType) return f.tfieldType === 'd';
    return inferFieldCategory(f) === 'dimension';
  });

  const metrics = fields.filter(f => {
    if (f.tfieldType) return f.tfieldType === 'q';
    return inferFieldCategory(f) === 'metric';
  });

  const renderFieldList = (items: FieldItem[]) => {
    if (items.length === 0) {
      return (
        <div style={{ padding: '16px 0' }}>
          <Empty description="暂无字段" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      );
    }

    return (
      <ul style={{ margin: 0, padding: '4px 0', listStyle: 'none' }}>
        {items.map((item) => (
          <li
            key={item.tfieldId || item.tfieldName || item.originName}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 8px',
              borderRadius: 6,
              fontSize: 13,
              color: '#3e5068',
              cursor: 'default',
              transition: 'background 0.2s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(91, 124, 247, 0.06)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
          >
            {getFieldIcon(item)}
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
              }}
              title={getFieldDisplayName(item)}
            >
              {getFieldDisplayName(item)}
            </span>
          </li>
        ))}
      </ul>
    );
  };

  const collapseItems: CollapseProps['items'] = [
    {
      key: 'dimensions',
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#3e5068' }}>
          <TagOutlined style={{ color: '#52c41a', fontSize: 12 }} />
          <span>维度</span>
          <span style={{
            marginLeft: 'auto',
            fontSize: 11,
            fontWeight: 500,
            color: '#8fa0b5',
            background: 'rgba(82, 196, 26, 0.1)',
            padding: '1px 6px',
            borderRadius: 10,
          }}>
            {dimensions.length}
          </span>
        </div>
      ),
      children: renderFieldList(dimensions),
    },
    {
      key: 'metrics',
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#3e5068' }}>
          <FieldNumberOutlined style={{ color: '#5b7cf7', fontSize: 12 }} />
          <span>指标</span>
          <span style={{
            marginLeft: 'auto',
            fontSize: 11,
            fontWeight: 500,
            color: '#8fa0b5',
            background: 'rgba(91, 124, 247, 0.1)',
            padding: '1px 6px',
            borderRadius: 10,
          }}>
            {metrics.length}
          </span>
        </div>
      ),
      children: renderFieldList(metrics),
    },
  ];

  return (
    <div style={{ width: '100%' }}>
      <div style={{
        fontSize: '13px',
        fontWeight: 600,
        color: '#3e5068',
        letterSpacing: '0.02em',
        padding: '8px 0 4px',
      }}>
        字段语义
      </div>
      <Collapse
        bordered={false}
        defaultActiveKey={['dimensions', 'metrics']}
        expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} style={{ fontSize: 11, color: '#8fa0b5' }} />}
        items={collapseItems}
        style={{ background: 'transparent' }}
      />
    </div>
  );
};

export default DimensionMetricPanel;
