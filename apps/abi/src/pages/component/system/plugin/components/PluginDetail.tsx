import {
  ApiOutlined,
  BranchesOutlined,
  CloseOutlined,
  ClusterOutlined,
  LinkOutlined,
  SafetyCertificateOutlined,
  ToolOutlined
} from '@ant-design/icons';

import type { PluginItem } from '@/types/plug';

interface PluginDetailProps {
  readonly open: boolean;
  readonly record: PluginItem | null;
  readonly onClose: () => void;
}

const PRIMARY = '#1677ff';
const BORDER = '#eef0f4';
const TEXT_MUTED = '#8c8c8c';
const TEXT_DEFAULT = '#333';

const SectionCard = ({
  icon,
  title,
  extra,
  children
}: {
  icon: React.ReactNode;
  title: React.ReactNode;
  extra?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div
    style={{
      border: `1px solid ${BORDER}`,
      borderRadius: 8,
      overflow: 'hidden',
      marginBottom: 16,
      background: '#fff'
    }}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        borderBottom: `1px solid ${BORDER}`
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 13, color: TEXT_DEFAULT }}>
        <span style={{ color: TEXT_MUTED, display: 'inline-flex', alignItems: 'center' }}>{icon}</span>
        <span>{title}</span>
      </div>
      {extra && <span style={{ color: TEXT_MUTED, fontSize: 12 }}>{extra}</span>}
    </div>
    <div style={{ padding: 16 }}>{children}</div>
  </div>
);

const InfoCell = ({ label, value }: { label: React.ReactNode; value: React.ReactNode }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', padding: '10px 12px', gap: 12, minHeight: 44 }}>
    <div style={{ minWidth: 88, color: TEXT_MUTED, fontSize: 12 }}>{label}</div>
    <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: TEXT_DEFAULT, wordBreak: 'break-all' }}>
      {value ?? '--'}
    </div>
  </div>
);

export const PluginDetail: React.FC<PluginDetailProps> = ({ open, record, onClose }) => {
  if (!record) {
    return (
      <ADrawer
        closeIcon={null}
        extra={<CloseOutlined onClick={onClose} />}
        open={open}
        title="MCP 服务详情"
        width={780}
        onClose={onClose}
      />
    );
  }

  const protocolLabel = record.frontProtocol || record.protocol || 'unknown';
  const tools = record.toolSpec?.tools || [];
  const schemes = record.toolSpec?.securitySchemes || [];
  const endpoints = record.backendEndpoints || [];
  const allVersions = record.allVersions || [];
  const serviceRef = record.remoteServerConfig?.serviceRef;
  const enabled = record.enabled ?? record.status === 1;

  return (
    <ADrawer
      closeIcon={null}
      extra={<CloseOutlined onClick={onClose} />}
      open={open}
      title="MCP 服务详情"
      width={780}
      onClose={onClose}
      styles={{ body: { background: '#fafbfc', padding: 16 } }}
    >
      {/* Hero：白底 + 顶部蓝色竖线 */}
      <div
        style={{
          position: 'relative',
          background: '#fff',
          border: `1px solid ${BORDER}`,
          borderRadius: 8,
          padding: 20,
          marginBottom: 16
        }}
      >
        <AFlex gap={14} align="flex-start">
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 8,
              background: '#e6f4ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ClusterOutlined style={{ color: PRIMARY, fontSize: 22 }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <AFlex gap={8} align="center" wrap="wrap">
              <span style={{ fontSize: 16, fontWeight: 600, color: TEXT_DEFAULT }}>
                {record.name || record.pluginName}
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '1px 8px',
                  borderRadius: 10,
                  background: '#e6f4ff',
                  color: PRIMARY,
                  fontSize: 12
                }}
              >
                {protocolLabel}
              </span>
              {record.versionDetail?.version && (
                <span style={{ fontSize: 12, color: TEXT_MUTED }}>v{record.versionDetail.version}</span>
              )}
              {record.versionDetail?.is_latest && <ATag style={{ margin: 0 }}>Latest</ATag>}
              <ATag color={enabled ? 'blue' : 'default'} style={{ margin: 0 }}>
                {enabled ? '已启用' : '已停用'}
              </ATag>
            </AFlex>
            {record.description && (
              <div style={{ marginTop: 8, color: TEXT_MUTED, fontSize: 13, lineHeight: 1.6 }}>
                {record.description}
              </div>
            )}
          </div>
        </AFlex>
      </div>

      {/* 基础信息 */}
      <SectionCard icon={<ClusterOutlined />} title="基础信息">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          <div style={{ borderRight: `1px solid ${BORDER}` }}>
            <InfoCell label="服务名" value={record.name || record.pluginName || '--'} />
            <div style={{ borderTop: `1px solid ${BORDER}` }} />
            <InfoCell label="版本" value={record.versionDetail?.version || '--'} />
            {serviceRef && (
              <>
                <div style={{ borderTop: `1px solid ${BORDER}` }} />
                <InfoCell
                  label="服务引用"
                  value={
                    <span style={{ fontFamily: 'Menlo, Consolas, monospace', fontSize: 12 }}>
                      {serviceRef.groupName}@@{serviceRef.serviceName}
                    </span>
                  }
                />
              </>
            )}
          </div>
          <div>
            <InfoCell label="协议" value={protocolLabel} />
            <div style={{ borderTop: `1px solid ${BORDER}` }} />
            <InfoCell
              label="命名空间"
              value={
                serviceRef?.namespaceId
                || (record.spaceId != null ? `s_${record.spaceId}` : '--')
              }
            />
            {record.remoteServerConfig?.exportPath && (
              <>
                <div style={{ borderTop: `1px solid ${BORDER}` }} />
                <InfoCell
                  label="导出路径"
                  value={
                    <span style={{ fontFamily: 'Menlo, Consolas, monospace', fontSize: 12 }}>
                      {record.remoteServerConfig.exportPath}
                    </span>
                  }
                />
              </>
            )}
          </div>
        </div>
      </SectionCard>

      {/* 后端端点 */}
      {endpoints.length > 0 && (
        <SectionCard icon={<LinkOutlined />} title="后端端点" extra={`${endpoints.length} 个`}>
          <AFlex vertical gap={8}>
            {endpoints.map((ep, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: '#fafbfc',
                  border: `1px solid ${BORDER}`,
                  borderRadius: 6
                }}
              >
                <span style={{ fontFamily: 'Menlo, Consolas, monospace', fontSize: 13, color: TEXT_DEFAULT }}>
                  {ep.address || '--'}
                </span>
                {ep.port != null && <span style={{ color: TEXT_MUTED, fontSize: 12 }}>port: {ep.port}</span>}
              </div>
            ))}
          </AFlex>
        </SectionCard>
      )}

      {/* Tools */}
      <SectionCard icon={<ToolOutlined />} title="Tools" extra={`${tools.length} 个`}>
        {tools.length === 0 ? (
          <div style={{ color: '#bfbfbf', fontSize: 13, padding: '8px 0', textAlign: 'center' }}>
            暂无可用的 Tools
          </div>
        ) : (
          <AFlex vertical gap={8}>
            {tools.map((tool, idx) => (
              <div
                key={idx}
                style={{
                  padding: '10px 12px',
                  border: `1px solid ${BORDER}`,
                  borderRadius: 6,
                  background: '#fff'
                }}
              >
                <AFlex align="center" gap={8} style={{ marginBottom: tool.description ? 4 : 0 }}>
                  <ToolOutlined style={{ color: TEXT_MUTED }} />
                  <span style={{ fontWeight: 500, color: TEXT_DEFAULT }}>{tool.name || '(未命名)'}</span>
                  <ATag color={tool.enabled ? 'blue' : 'default'} style={{ margin: 0 }}>
                    {tool.enabled ? '启用' : '禁用'}
                  </ATag>
                </AFlex>
                {tool.description && (
                  <div style={{ color: TEXT_MUTED, fontSize: 12, marginLeft: 22 }}>{tool.description}</div>
                )}
              </div>
            ))}
          </AFlex>
        )}
      </SectionCard>

      {/* 安全认证方案 */}
      {schemes.length > 0 && (
        <SectionCard
          icon={<SafetyCertificateOutlined />}
          title="安全认证方案"
          extra={`${schemes.length} 个`}
        >
          <AFlex vertical gap={8}>
            {schemes.map((s, idx) => (
              <div
                key={idx}
                style={{
                  padding: '8px 12px',
                  border: `1px solid ${BORDER}`,
                  borderRadius: 6,
                  background: '#fafbfc',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10
                }}
              >
                <ATag style={{ margin: 0 }}>{s.type}</ATag>
                <span style={{ fontWeight: 500, color: TEXT_DEFAULT }}>{s.id}</span>
                {s.scheme && (
                  <span style={{ color: TEXT_MUTED, fontSize: 12 }}>scheme: {s.scheme}</span>
                )}
              </div>
            ))}
          </AFlex>
        </SectionCard>
      )}

      {/* 版本历史 */}
      {allVersions.length > 0 && (
        <SectionCard
          icon={<BranchesOutlined />}
          title="版本历史"
          extra={`${allVersions.length} 个`}
        >
          <AFlex wrap="wrap" gap={8}>
            {allVersions.map(v => (
              <ATag key={v.version} color={v.is_latest ? 'blue' : 'default'}>
                v{v.version}
                {v.is_latest && ' · Latest'}
              </ATag>
            ))}
          </AFlex>
        </SectionCard>
      )}

      {/* 协议字段防未使用告警 */}
      <span style={{ display: 'none' }}>
        <ApiOutlined />
      </span>
    </ADrawer>
  );
};
