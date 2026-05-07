import { CloseOutlined } from '@ant-design/icons';

import type { PluginItem } from '@/types/plug';

interface PluginDetailProps {
  readonly open: boolean;
  readonly record: PluginItem | null;
  readonly onClose: () => void;
}

function safeParse(raw?: string) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function renderJson(value: unknown) {
  if (value === null || value === undefined || value === '') return '--';
  if (typeof value === 'string') return value;
  return (
    <pre
      style={{
        margin: 0,
        padding: '0.75rem',
        background: '#f6f8fa',
        border: '1px solid #eee',
        borderRadius: 4,
        maxHeight: 320,
        overflow: 'auto',
        fontFamily: 'Menlo, Consolas, monospace',
        fontSize: 12
      }}
    >
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export const PluginDetail: React.FC<PluginDetailProps> = ({ open, record, onClose }) => {
  const caps = record?.capabilities ?? [];
  const isHttp = record?.protocol === 'http' || record?.protocol === 'https';

  return (
    <ADrawer
      closeIcon={null}
      extra={<CloseOutlined onClick={onClose} />}
      open={open}
      title="MCP服务详情"
      width={720}
      onClose={onClose}
    >
      {record ? (
        <ADescriptions column={1} bordered size="small">
          <ADescriptions.Item label="MCP服务名称">{record.pluginName || '--'}</ADescriptions.Item>
          <ADescriptions.Item label="描述">{record.remark || '--'}</ADescriptions.Item>
          <ADescriptions.Item label="支持能力">
            {caps.length ? (
              <ASpace size={4} wrap>
                {caps.map(item => (
                  <ATag color="blue" key={item}>{item}</ATag>
                ))}
              </ASpace>
            ) : (
              '--'
            )}
          </ADescriptions.Item>
          <ADescriptions.Item label="类型">
            <ASpace size={6}>
              <span>{record.pluginType || '--'}</span>
              {isHttp && <ATag color="green">转换服务</ATag>}
            </ASpace>
          </ADescriptions.Item>
          <ADescriptions.Item label="版本">
            {record?.versionDetail?.version || '--'}
          </ADescriptions.Item>
          <ADescriptions.Item label="状态">
            {record.status === 1 ? <ATag color="green">启用</ATag> : <ATag>停用</ATag>}
          </ADescriptions.Item>
          <ADescriptions.Item label="创建人">{record.createBy || '--'}</ADescriptions.Item>
          <ADescriptions.Item label="创建时间">{record.createTime || '--'}</ADescriptions.Item>
          <ADescriptions.Item label="更新人">{record.updateBy || '--'}</ADescriptions.Item>
          <ADescriptions.Item label="更新时间">{record.updateTime || '--'}</ADescriptions.Item>
          <ADescriptions.Item label="解析配置">
            {renderJson(safeParse(record.parseModeConfig))}
          </ADescriptions.Item>
          <ADescriptions.Item label="服务参数配置">
            {renderJson(safeParse(record.serviceConfig))}
          </ADescriptions.Item>
        </ADescriptions>
      ) : null}
    </ADrawer>
  );
};
