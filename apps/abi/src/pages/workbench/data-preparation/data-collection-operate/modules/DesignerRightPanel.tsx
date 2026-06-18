import { BarChartOutlined, CloseOutlined, FieldNumberOutlined, FieldStringOutlined, TagOutlined } from '@ant-design/icons';
import { Collapse, Empty } from 'antd';
import type { CollapseProps } from 'antd';
import React, { useState } from 'react';

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

interface DesignerRightPanelProps {
  fields?: FieldItem[];
}

/** 菜单项定义 */
interface MenuItem {
  key: string;
  name: string;
  icon: React.ReactNode;
}

const MENU_ITEMS: MenuItem[] = [
  { key: 'dimensions', name: '维度', icon: <TagOutlined style={{ fontSize: 16 }} /> },
  { key: 'metrics', name: '指标', icon: <FieldNumberOutlined style={{ fontSize: 16 }} /> },
];

/** 根据字段类型推断维度/指标 */
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

/** 字段列表渲染 */
function FieldList({ items }: { items: FieldItem[] }) {
  if (items.length === 0) {
    return (
      <div style={{ padding: '24px 0' }}>
        <Empty description="暂无字段" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </div>
    );
  }

  return (
    <ul style={{ margin: 0, padding: '4px 0', listStyle: 'none' }}>
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
              transition: 'background 0.2s ease',
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
                flex: 1,
              }}
              title={getFieldDisplayName(item)}
            >
              {getFieldDisplayName(item)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

const DesignerRightPanel: React.FC<DesignerRightPanelProps> = ({ fields = [] }) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const dimensions = fields.filter(f => {
    if (f.tfieldType) return f.tfieldType === 'd';
    return inferFieldCategory(f) === 'dimension';
  });

  const metrics = fields.filter(f => {
    if (f.tfieldType) return f.tfieldType === 'q';
    return inferFieldCategory(f) === 'metric';
  });

  const handleMenuClick = (key: string) => {
    setActiveMenu(prev => prev === key ? null : key);
  };

  const handleClose = () => {
    setActiveMenu(null);
  };

  const getMenuCount = (key: string): number => {
    if (key === 'dimensions') return dimensions.length;
    if (key === 'metrics') return metrics.length;
    return 0;
  };

  const renderPanelContent = () => {
    if (!activeMenu) return null;

    const items = activeMenu === 'dimensions' ? dimensions : metrics;
    const title = activeMenu === 'dimensions' ? '维度' : '指标';

    return (
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 40,
          width: 280,
          height: '100%',
          zIndex: 10,
          background: 'linear-gradient(135deg, #F0F4FF 0%, #EFF3FF 45%, #EFF2FF 100%)',
          backdropFilter: 'blur(12px)',
          borderRight: '1px solid rgba(130, 140, 200, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '-4px 0 20px rgba(91, 124, 247, 0.08)',
        }}
      >
        {/* 面板顶部 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid rgba(130, 140, 200, 0.1)',
            background: 'linear-gradient(180deg, rgba(246, 247, 255, 0.8), rgba(246, 247, 255, 0.6))',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: '#3e5068' }}>{title}</span>
          <span style={{
            fontSize: 11,
            fontWeight: 500,
            color: '#8fa0b5',
            background: activeMenu === 'dimensions' ? 'rgba(82, 196, 26, 0.1)' : 'rgba(91, 124, 247, 0.1)',
            padding: '1px 8px',
            borderRadius: 10,
          }}>
            {items.length}
          </span>
          <CloseOutlined
            style={{ fontSize: 12, color: '#8fa0b5', cursor: 'pointer', marginLeft: 8 }}
            onClick={handleClose}
          />
        </div>

        {/* 面板内容 */}
        <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px' }}>
          <FieldList items={items} />
        </div>
      </div>
    );
  };

  return (
    <div style={{ position: 'relative', height: '100%' }}>
      {/* 配置面板 - 绝对定位浮层，不挤占编辑器空间 */}
      {renderPanelContent()}

      {/* 垂直导航栏 */}
      <div
        style={{
          width: 40,
          height: '100%',
          background: 'rgba(255, 255, 255, 0.5)',
          backdropFilter: 'blur(12px)',
          borderLeft: '1px solid rgba(130, 140, 200, 0.10)',
          boxShadow: '-2px 0 12px rgba(91, 124, 247, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        {MENU_ITEMS.map((item) => {
          const count = getMenuCount(item.key);
          const isActive = activeMenu === item.key;

          return (
            <div
              key={item.key}
              style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                padding: '14px 0 10px',
                fontSize: 12,
                lineHeight: '16px',
                color: isActive ? '#5b7cf7' : '#5f7490',
                borderLeft: isActive ? '2px solid #5b7cf7' : '2px solid transparent',
                background: isActive ? 'rgba(91, 124, 247, 0.08)' : 'transparent',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
              }}
              onClick={() => handleMenuClick(item.key)}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.color = '#5b7cf7';
                  (e.currentTarget as HTMLElement).style.background = 'rgba(91, 124, 247, 0.06)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.color = '#5f7490';
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                }
              }}
            >
              <div style={{ fontSize: 16, marginBottom: 6 }}>{item.icon}</div>
              <div style={{
                fontWeight: 500,
                letterSpacing: '2px',
                writingMode: 'vertical-lr',
                textOrientation: 'upright',
              }}>
                {item.name}
              </div>
              {count > 0 && (
                <div style={{
                  position: 'absolute',
                  top: 8,
                  right: 4,
                  minWidth: 16,
                  height: 16,
                  lineHeight: '16px',
                  textAlign: 'center',
                  borderRadius: 8,
                  background: item.key === 'dimensions' ? 'rgba(82, 196, 26, 0.15)' : 'rgba(91, 124, 247, 0.15)',
                  color: item.key === 'dimensions' ? '#52c41a' : '#5b7cf7',
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '0 4px',
                }}>
                  {count}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DesignerRightPanel;
