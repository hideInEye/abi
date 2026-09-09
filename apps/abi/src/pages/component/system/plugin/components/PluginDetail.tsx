import { ApiOutlined, BranchesOutlined, CloseOutlined, ClusterOutlined, LinkOutlined, SafetyCertificateOutlined, ToolOutlined } from '@ant-design/icons'

import type { PluginItem } from '@/types/plug'
import CommonDrawer from '@/components/stateless/common/CommonDrawer'

interface PluginDetailProps {
  readonly open: boolean
  readonly record: PluginItem | null
  /** 分组名称，用于命名空间展示 */
  readonly groupName?: string
  readonly onClose: () => void
}

const GRADIENT_START = '#5b7cf7'
const GRADIENT_END = '#7091fa'
const BORDER = 'rgba(130, 140, 200, 0.18)'
const TEXT_MUTED = '#8c8c8c'
const TEXT_DEFAULT = '#333'

const SectionCard = ({ icon, title, extra, children }: { icon: React.ReactNode; title: React.ReactNode; extra?: React.ReactNode; children: React.ReactNode }) => (
  <div
    style={{
      border: `1px solid ${BORDER}`,
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 16,
      background: 'rgba(255, 255, 255, 0.85)',
      backdropFilter: 'blur(12px)',
      boxShadow: '0 2px 8px rgba(91, 124, 247, 0.06)',
    }}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        borderBottom: `1px solid ${BORDER}`,
        background: 'linear-gradient(135deg, rgba(91, 124, 247, 0.04) 0%, rgba(112, 145, 250, 0.02) 100%)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600, fontSize: 14, color: TEXT_DEFAULT }}>
        <span
          style={{
            color: GRADIENT_START,
            display: 'inline-flex',
            alignItems: 'center',
            width: 28,
            height: 28,
            borderRadius: 6,
            background: 'linear-gradient(135deg, rgba(91, 124, 247, 0.1) 0%, rgba(112, 145, 250, 0.1) 100%)',
            justifyContent: 'center',
          }}
        >
          {icon}
        </span>
        <span>{title}</span>
      </div>
      {extra && <span style={{ color: TEXT_MUTED, fontSize: 12, fontWeight: 500 }}>{extra}</span>}
    </div>
    <div style={{ padding: 20 }}>{children}</div>
  </div>
)

const InfoCell = ({ label, value }: { label: React.ReactNode; value: React.ReactNode }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', padding: '12px 16px', gap: 16, minHeight: 48 }}>
    <div style={{ minWidth: 96, color: TEXT_MUTED, fontSize: 12, fontWeight: 500 }}>{label}</div>
    <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: TEXT_DEFAULT, wordBreak: 'break-all', lineHeight: 1.6 }}>{value ?? '--'}</div>
  </div>
)

/* ── 协议转化配置只读展示（对齐 nacos 控制台 ShowTools 结构与配色） ── */
const MONO_FONT = 'Monaco, Consolas, "Courier New", monospace'
const METHOD_BADGE_COLOR: Record<string, string> = { get: '#52c41a', post: '#1890ff', put: '#fa8c16', delete: '#f5222d' }

const KvRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
    <span style={{ fontWeight: 700, color: '#000', flexShrink: 0 }}>{label}</span>
    {children}
  </div>
)

const SubTitle = ({ color, children }: { color: string; children: React.ReactNode }) => (
  <div style={{ borderLeft: `3px solid ${color}`, paddingLeft: 8, fontSize: 14, fontWeight: 700, color: '#000', marginBottom: 8 }}>{children}</div>
)

const ProtocolTemplateView = ({ data }: { data: Record<string, any> }) => {
  const req = data.requestTemplate
  const resp = data.responseTemplate
  const method = req?.method ? String(req.method) : ''
  const headers = req?.headers
  const headerRows: Array<[string, unknown]> = headers && typeof headers === 'object' ? Object.entries(headers) : []
  const knownRespFields = ['body', 'prependBody', 'appendBody']
  const otherRespFields = resp ? Object.keys(resp).filter(key => !knownRespFields.includes(key)) : []

  return (
    <div style={{ marginTop: 12, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 16, background: 'rgba(255,255,255,0.9)' }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: TEXT_DEFAULT, marginBottom: 12 }}>协议转化配置</div>

      {/* 透明认证信息 */}
      {data.security && (
        <div style={{ marginBottom: 16 }}>
          <SubTitle color="#52c41a">透明认证信息</SubTitle>
          <div style={{ background: '#f9f9f9', padding: 12, borderRadius: 4, fontFamily: MONO_FONT, fontSize: 12 }}>
            <KvRow label="启用状态: ">
              <span style={{ color: data.security.passthrough ? '#52c41a' : '#666' }}>{data.security.passthrough ? '已启用' : '未启用'}</span>
            </KvRow>
            {data.security.id && (
              <KvRow label="客户端认证方式: ">
                <span style={{ color: '#1890ff' }}>{data.security.id}</span>
              </KvRow>
            )}
            {data.security.type && <KvRow label="认证类型: ">{data.security.type}</KvRow>}
          </div>
        </div>
      )}

      {/* 请求模板配置 */}
      {req && (
        <div style={{ marginBottom: 16 }}>
          <SubTitle color="#1890ff">请求模板配置</SubTitle>
          <div style={{ background: '#f5f8ff', padding: 12, borderRadius: 4, fontFamily: MONO_FONT, fontSize: 12 }}>
            {method && (
              <KvRow label="HTTP 方法: ">
                <span
                  style={{
                    color: '#fff',
                    background: METHOD_BADGE_COLOR[method.toLowerCase()] || '#999',
                    padding: '2px 6px',
                    borderRadius: 3,
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {method}
                </span>
              </KvRow>
            )}
            {req.url && (
              <KvRow label="请求路径: ">
                <span style={{ color: '#1890ff', background: '#e6f7ff', padding: '2px 6px', borderRadius: 3, wordBreak: 'break-all' }}>{req.url}</span>
              </KvRow>
            )}
            {req.security?.id && (
              <KvRow label="后端认证方式: ">
                <span style={{ color: '#fa8c16' }}>{req.security.id}</span>
              </KvRow>
            )}
            {headerRows.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 700, color: '#000', marginBottom: 6 }}>headers:</div>
                <div style={{ background: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: 3, padding: 8, maxHeight: 120, overflowY: 'auto' }}>
                  {headerRows.map(([key, value]) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, color: '#000', flexShrink: 0 }}>{key}:</span>
                      <span style={{ color: '#1890ff', wordBreak: 'break-all' }}>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {req.body && (
              <div>
                <div style={{ fontWeight: 700, color: '#000', marginBottom: 6 }}>body:</div>
                <div
                  style={{
                    background: '#f6ffed',
                    border: '1px solid #b7eb8f',
                    borderRadius: 3,
                    padding: 8,
                    maxHeight: 100,
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    color: '#52c41a',
                  }}
                >
                  {typeof req.body === 'object' ? JSON.stringify(req.body, null, 2) : req.body}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 响应模板配置 */}
      {resp && (
        <div>
          <SubTitle color="#fa8c16">响应模板配置</SubTitle>
          <div style={{ background: '#fffbe6', padding: 12, borderRadius: 4, fontFamily: MONO_FONT, fontSize: 12 }}>
            {resp.body && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 700, color: '#000', marginBottom: 6 }}>body:</div>
                <div style={{ background: '#f6f8fa', border: '1px solid #e1e4e8', borderRadius: 3, padding: 8, maxHeight: 100, overflowY: 'auto', color: '#8c8c8c', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {resp.body}
                </div>
              </div>
            )}
            {resp.prependBody && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 700, color: '#000', marginBottom: 6 }}>prependBody:</div>
                <div style={{ background: '#f6f8fa', border: '1px solid #e1e4e8', borderRadius: 3, padding: 8, maxHeight: 100, overflowY: 'auto', color: '#8c8c8c', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {resp.prependBody}
                </div>
              </div>
            )}
            {resp.appendBody && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 700, color: '#000', marginBottom: 6 }}>appendBody:</div>
                <div style={{ background: '#f6f8fa', border: '1px solid #e1e4e8', borderRadius: 3, padding: 8, maxHeight: 100, overflowY: 'auto', color: '#8c8c8c', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {resp.appendBody}
                </div>
              </div>
            )}
            {otherRespFields.length > 0 && (
              <div>
                <div style={{ fontWeight: 700, color: '#000', marginBottom: 6 }}>其他配置:</div>
                {otherRespFields.map(field => (
                  <div key={field} style={{ marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, color: '#000' }}>{field}: </span>
                    <span style={{ color: '#666' }}>{typeof resp[field] === 'object' ? JSON.stringify(resp[field], null, 2) : String(resp[field])}</span>
                  </div>
                ))}
              </div>
            )}
            {!resp.body && !resp.prependBody && !resp.appendBody && Object.keys(resp).length === 0 && (
              <div style={{ color: '#bfbfbf' }}>暂无响应模板配置</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export const PluginDetail: React.FC<PluginDetailProps> = ({ open, record, groupName, onClose }) => {
  if (!record) {
    return <CommonDrawer open={open} title="MCP 服务详情" width={800} onClose={onClose} />
  }

  const rawProto = record.frontProtocol || record.protocol || ''
  const protocolLabel = rawProto || 'unknown'
  const isLegacy = record.protocol === 'http' || record.protocol === 'https'
  const tools = record.toolSpec?.tools || []
  const schemes = record.toolSpec?.securitySchemes || []
  const endpoints = record.backendEndpoints || []
  const allVersions = record.allVersions || []
  const serviceRef = record.remoteServerConfig?.serviceRef
  const enabled = record.enabled ?? record.status === 1

  return (
    <CommonDrawer
      open={open}
      title="MCP 服务详情"
      width={800}
      onClose={onClose}
      styles={{
        body: {
          background: 'linear-gradient(180deg, rgba(91, 124, 247, 0.03) 0%, rgba(255, 255, 255, 0.95) 100%)',
          padding: 24,
        },
      }}
    >
      {/* Hero Card */}
      <div
        style={{
          position: 'relative',
          background: 'linear-gradient(135deg, rgba(91, 124, 247, 0.08) 0%, rgba(112, 145, 250, 0.04) 100%)',
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
          padding: 24,
          marginBottom: 20,
          backdropFilter: 'blur(12px)',
          boxShadow: '0 4px 16px rgba(91, 124, 247, 0.08)',
        }}
      >
        <AFlex gap={18} align="flex-start">
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(91, 124, 247, 0.15) 0%, rgba(112, 145, 250, 0.15) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(91, 124, 247, 0.12)',
            }}
          >
            <ClusterOutlined style={{ color: GRADIENT_START, fontSize: 26 }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <AFlex gap={10} align="center" wrap="wrap">
              <span style={{ fontSize: 18, fontWeight: 700, color: TEXT_DEFAULT, letterSpacing: '0.3px' }}>{record.name || record.pluginName}</span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '2px 10px',
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, rgba(91, 124, 247, 0.15) 0%, rgba(112, 145, 250, 0.15) 100%)',
                  color: GRADIENT_START,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {protocolLabel}
              </span>
              {isLegacy && (
                <ATag color="green" style={{ margin: 0 }}>
                  存量转化
                </ATag>
              )}
              {record.versionDetail?.version && <span style={{ fontSize: 12, color: TEXT_MUTED, fontWeight: 500 }}>v{record.versionDetail.version}</span>}
              {record.versionDetail?.is_latest && (
                <ATag style={{ margin: 0, background: 'linear-gradient(135deg, #5b7cf7 0%, #7091fa 100%)', color: '#fff', border: 'none', fontWeight: 600 }}>Latest</ATag>
              )}
              <ATag
                color={enabled ? 'blue' : 'default'}
                style={{
                  margin: 0,
                  background: enabled ? 'linear-gradient(135deg, rgba(91, 124, 247, 0.15) 0%, rgba(112, 145, 250, 0.15) 100%)' : 'rgba(0,0,0,0.04)',
                  color: enabled ? GRADIENT_START : TEXT_MUTED,
                  border: `1px solid ${enabled ? 'rgba(91, 124, 247, 0.3)' : 'rgba(0,0,0,0.08)'}`,
                  fontWeight: 600,
                }}
              >
                {enabled ? '已启用' : '已停用'}
              </ATag>
            </AFlex>
            {record.description && <div style={{ marginTop: 10, color: TEXT_MUTED, fontSize: 13, lineHeight: 1.7 }}>{record.description}</div>}
          </div>
        </AFlex>
      </div>

      {/* 基础信息 */}
      <SectionCard icon={<ClusterOutlined />} title="基础信息">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
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
                    <span style={{ fontFamily: 'Menlo, Consolas, monospace', fontSize: 12, color: '#5b7cf7' }}>
                      {serviceRef.groupName}@@{serviceRef.serviceName}
                    </span>
                  }
                />
              </>
            )}
          </div>
          <div>
            <InfoCell
              label="协议"
              value={
                <ASpace size={4}>
                  <span>{protocolLabel}</span>
                  {isLegacy && (
                    <ATag color="green" style={{ margin: 0 }}>
                      存量转化
                    </ATag>
                  )}
                </ASpace>
              }
            />
            <div style={{ borderTop: `1px solid ${BORDER}` }} />
            <InfoCell label="命名空间" value={groupName || serviceRef?.namespaceId || (record.spaceId != null ? `s_${record.spaceId}` : '--')} />
            {record.remoteServerConfig?.exportPath && (
              <>
                <div style={{ borderTop: `1px solid ${BORDER}` }} />
                <InfoCell label="导出路径" value={<span style={{ fontFamily: 'Menlo, Consolas, monospace', fontSize: 12, color: '#5b7cf7' }}>{record.remoteServerConfig.exportPath}</span>} />
              </>
            )}
          </div>
        </div>
      </SectionCard>

      {/* 后端端点 */}
      {endpoints.length > 0 && (
        <SectionCard icon={<LinkOutlined />} title="后端端点" extra={`${endpoints.length} 个`}>
          <AFlex vertical gap={10}>
            {endpoints.map((ep, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 16px',
                  background: 'rgba(91, 124, 247, 0.04)',
                  border: `1px solid ${BORDER}`,
                  borderRadius: 8,
                  transition: 'all 0.2s',
                }}
              >
                <span style={{ fontFamily: 'Menlo, Consolas, monospace', fontSize: 13, color: '#5b7cf7', fontWeight: 500 }}>{ep.address || '--'}</span>
                {ep.port != null && <span style={{ color: TEXT_MUTED, fontSize: 12, fontWeight: 500 }}>port: {ep.port}</span>}
              </div>
            ))}
          </AFlex>
        </SectionCard>
      )}

      {/* Tools */}
      <SectionCard icon={<ToolOutlined />} title="Tools" extra={`${tools.length} 个`}>
        {tools.length === 0 ? (
          <div style={{ color: '#bfbfbf', fontSize: 13, padding: '16px 0', textAlign: 'center' }}>暂无可用的 Tools</div>
        ) : (
          <AFlex vertical gap={10}>
            {tools.map((tool, idx) => (
              <div
                key={idx}
                style={{
                  padding: '14px 16px',
                  border: `1px solid ${BORDER}`,
                  borderRadius: 8,
                  background: 'rgba(255, 255, 255, 0.9)',
                  transition: 'all 0.2s',
                }}
              >
                <AFlex align="center" gap={10} style={{ marginBottom: tool.description ? 6 : 0 }}>
                  <ToolOutlined style={{ color: GRADIENT_START, fontSize: 14 }} />
                  <span style={{ fontWeight: 600, color: TEXT_DEFAULT, fontSize: 13 }}>{tool.name || '(未命名)'}</span>
                  <ATag
                    color={tool.enabled ? 'blue' : 'default'}
                    style={{
                      margin: 0,
                      background: tool.enabled ? 'linear-gradient(135deg, rgba(91, 124, 247, 0.15) 0%, rgba(112, 145, 250, 0.15) 100%)' : 'rgba(0,0,0,0.04)',
                      color: tool.enabled ? GRADIENT_START : TEXT_MUTED,
                      border: `1px solid ${tool.enabled ? 'rgba(91, 124, 247, 0.3)' : 'rgba(0,0,0,0.08)'}`,
                      fontWeight: 600,
                    }}
                  >
                    {tool.enabled ? '启用' : '禁用'}
                  </ATag>
                </AFlex>
                {tool.description && <div style={{ color: TEXT_MUTED, fontSize: 12, marginLeft: 24, lineHeight: 1.6 }}>{tool.description}</div>}
                {/* HTTP 转 MCP 服务展示协议转化配置，对齐 nacos 明细页 */}
                {isLegacy &&
                  (() => {
                    const templateData = record.toolSpec?.toolsMeta?.[tool.name]?.templates?.['json-go-template']
                    return templateData && typeof templateData === 'object' ? <ProtocolTemplateView data={templateData} /> : null
                  })()}
              </div>
            ))}
          </AFlex>
        )}
      </SectionCard>

      {/* 安全认证方案 */}
      {schemes.length > 0 && (
        <SectionCard icon={<SafetyCertificateOutlined />} title="安全认证方案" extra={`${schemes.length} 个`}>
          <AFlex vertical gap={10}>
            {schemes.map((s, idx) => (
              <div
                key={idx}
                style={{
                  padding: '12px 16px',
                  border: `1px solid ${BORDER}`,
                  borderRadius: 8,
                  background: 'rgba(91, 124, 247, 0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  transition: 'all 0.2s',
                }}
              >
                <ATag style={{ margin: 0, background: 'linear-gradient(135deg, #5b7cf7 0%, #7091fa 100%)', color: '#fff', border: 'none', fontWeight: 600 }}>{s.type}</ATag>
                <span style={{ fontWeight: 600, color: TEXT_DEFAULT, fontSize: 13 }}>{s.id}</span>
                {s.scheme && <span style={{ color: TEXT_MUTED, fontSize: 12, fontWeight: 500 }}>scheme: {s.scheme}</span>}
              </div>
            ))}
          </AFlex>
        </SectionCard>
      )}

      {/* 版本历史 */}
      {allVersions.length > 0 && (
        <SectionCard icon={<BranchesOutlined />} title="版本历史" extra={`${allVersions.length} 个`}>
          <AFlex wrap="wrap" gap={10}>
            {allVersions.map((v) => (
              <ATag
                key={v.version}
                style={{
                  margin: 0,
                  background: v.is_latest ? 'linear-gradient(135deg, #5b7cf7 0%, #7091fa 100%)' : 'rgba(0,0,0,0.04)',
                  color: v.is_latest ? '#fff' : TEXT_DEFAULT,
                  border: v.is_latest ? 'none' : '1px solid rgba(0,0,0,0.08)',
                  fontWeight: 600,
                  padding: '4px 12px',
                }}
              >
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
    </CommonDrawer>
  )
}
