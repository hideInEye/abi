import { CloseOutlined } from '@ant-design/icons';
import React, { useMemo, useState } from 'react';

import { FieldItem, FieldListByTable } from './FieldListByTable';

interface DesignerRightPanelProps {
  fields?: FieldItem[];
  /** 节点数据，用于构建 rtableId -> tableName 映射 */
  nodeData?: any;
}

/** 菜单项定义 */
interface MenuItem {
  key: string;
  name: string;
}

const MENU_ITEMS: MenuItem[] = [
  { key: 'dimensions', name: '维度' },
  { key: 'metrics', name: '指标' },
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

const DesignerRightPanel: React.FC<DesignerRightPanelProps> = ({ fields = [], nodeData }) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const dimensions = fields.filter(f => {
    if (f.tfieldType) return f.tfieldType === 'd';
    return inferFieldCategory(f) === 'dimension';
  });

  const metrics = fields.filter(f => {
    if (f.tfieldType) return f.tfieldType === 'q';
    return inferFieldCategory(f) === 'metric';
  });

  const tableMap = useMemo(() => {
    const map: Record<string, { tableName: string; remark: string }> = {};
    const loop = (node: any) => {
      if (node?.currentDs) {
        map[node.currentDs.rtableId] = {
          tableName: node.currentDs.tableName || '',
          remark: node.currentDs.rtableName || '',
        };
      }
      if (node?.childrenDs?.length) {
        node.childrenDs.forEach(loop);
      }
    };
    if (nodeData) loop(nodeData);
    return map;
  }, [nodeData]);

  const handleMenuClick = (key: string) => {
    setActiveMenu(prev => prev === key ? null : key);
  };

  const handleClose = () => {
    setActiveMenu(null);
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
          <FieldListByTable
            fields={items}
            getTableName={(field) => (field.rtableId ? tableMap[field.rtableId]?.tableName : undefined) || '未知表'}
            getTableRemark={(field: FieldItem) => (field.rtableId ? tableMap[field.rtableId]?.remark : undefined) || ''}
          />
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
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          flexShrink: 0,
        }}
      >
          <div style={{ paddingTop: 8, width: '100%' }}>
          {MENU_ITEMS.map((item) => {
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
                padding: '18px 0 14px',
                fontSize: 13,
                lineHeight: '18px',
                color: isActive ? '#5b7cf7' : '#3e5068',
                borderLeft: isActive ? '2px solid #5b7cf7' : '2px solid transparent',
                background: isActive ? 'rgba(91, 124, 247, 0.08)' : 'transparent',
                transition: 'background 0.2s, color 0.2s',
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
                  (e.currentTarget as HTMLElement).style.color = '#3e5068';
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                }
              }}
            >
              <div style={{
                fontWeight: 700,
                fontFamily: 'SimHei, "Microsoft YaHei", "黑体", sans-serif',
                letterSpacing: '2px',
                writingMode: 'vertical-lr',
                textOrientation: 'upright',
              }}>
                {item.name}
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
};

export default DesignerRightPanel;
