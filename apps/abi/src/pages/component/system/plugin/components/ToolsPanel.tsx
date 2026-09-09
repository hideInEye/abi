import { useState } from 'react'

import type { McpToolItem } from '@/types/plug'

const BORDER = '#e8e8e8'
const MONO_FONT = 'Monaco, Consolas, "Courier New", monospace'
// HTTP 方法徽章配色，取自 nacos ShowTools.css 的 .method-badge
const METHOD_BADGE_COLOR: Record<string, string> = { get: '#52c41a', post: '#1890ff', put: '#fa8c16', delete: '#f5222d' }

interface SchemaRow {
  name: string
  type: string
  required: boolean
  description: string
  children: SchemaRow[]
}

/** 递归解析 JSON Schema properties 为参数行（明细展示用） */
const parseSchemaRows = (schema: any): SchemaRow[] => {
  if (!schema?.properties || typeof schema.properties !== 'object') return []
  const requiredSet = new Set<string>(Array.isArray(schema.required) ? schema.required : [])
  return Object.entries(schema.properties).map(([name, prop]: [string, any]) => ({
    name,
    type: prop?.type || 'string',
    required: requiredSet.has(name),
    description: prop?.description || '',
    children:
      prop?.type === 'object' && prop?.properties
        ? parseSchemaRows(prop)
        : prop?.type === 'array' && prop?.items?.properties
          ? parseSchemaRows(prop.items)
          : []
  }))
}

const countRows = (rows: SchemaRow[]): number => rows.reduce((acc, r) => acc + 1 + countRows(r.children), 0)

/** headers 可能为对象或 nacos 的 {key,value} 数组形式，统一转为 entries 渲染 */
const headerEntries = (h: any): [string, any][] =>
  Array.isArray(h) ? h.map((it: any) => [String(it?.key ?? ''), it?.value] as [string, any]) : Object.entries(h || {})

const KvRow = ({ k, children }: { readonly k: string; readonly children: React.ReactNode }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0', fontSize: 13, lineHeight: 1.6 }}>
    <span style={{ color: '#666', flexShrink: 0, fontFamily: MONO_FONT }}>{k}:</span>
    <span style={{ flex: 1, minWidth: 0 }}>{children}</span>
  </div>
)

const SubTitle = ({ children, color }: { readonly children: React.ReactNode; readonly color: string }) => (
  <div
    style={{
      display: 'inline-block',
      background: '#fff',
      color: '#333',
      fontWeight: 600,
      fontSize: 14,
      padding: '4px 12px',
      borderLeft: `3px solid ${color}`,
      borderRadius: '0 4px 4px 0',
      marginBottom: 12
    }}
  >
    {children}
  </div>
)

/**
 * 协议转化配置只读展示，复刻 nacos McpDetail/ShowTools.js 的 templates['json-go-template']
 * 结构化明细（透明认证信息 / 请求模板配置 / 响应模板配置）。
 */
export const ProtocolTemplateView = ({ data }: { readonly data: Record<string, any> }) => {
  const rt = (data.requestTemplate || {}) as Record<string, any>
  const resp = (data.responseTemplate || {}) as Record<string, any>
  const method = String(rt.method || 'get').toLowerCase()
  const headerList = headerEntries(rt.headers)
  const authHeader = headerList.find(([k]) => k === 'Authorization')
  const transparentAuth = (data.auth && data.auth.type === 'transparent') || !!authHeader
  const respHeaderList = headerEntries(resp.headers)

  return (
    <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '20px 24px', marginTop: 12 }}>
      {transparentAuth && (
        <>
          <SubTitle color="#52c41a">透明认证信息</SubTitle>
          {authHeader && (
            <KvRow k="Authorization">
              <span style={{ fontFamily: MONO_FONT, fontSize: 12, wordBreak: 'break-all' }}>{String(authHeader[1])}</span>
            </KvRow>
          )}
        </>
      )}

      <SubTitle color="#1890ff">请求模板配置</SubTitle>
      <div style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 6, padding: '12px 16px', marginBottom: transparentAuth || Object.keys(resp).length > 0 ? 24 : 0 }}>
        <KvRow k="HTTP 方法">
          <span
            style={{
              display: 'inline-block',
              background: METHOD_BADGE_COLOR[method] || '#999',
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 10px',
              borderRadius: 10,
              textTransform: 'uppercase',
              letterSpacing: 0.5
            }}
          >
            {method}
          </span>
        </KvRow>
        <KvRow k="请求路径">
          <span style={{ color: '#1890ff', background: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: 4, padding: '2px 10px', fontFamily: MONO_FONT, fontSize: 12, wordBreak: 'break-all' }}>
            {rt.url ? String(rt.url) : '/'}
          </span>
        </KvRow>
        {headerList.length > 0 && (
          <KvRow k="headers">
            <div style={{ background: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: 4, padding: '8px 12px', fontFamily: MONO_FONT, fontSize: 12 }}>
              {headerList.map(([hk, hv]) => (
                <div key={hk} style={{ padding: '2px 0', wordBreak: 'break-all' }}>
                  <span style={{ color: '#666' }}>{hk}</span> = <span style={{ color: '#333' }}>{String(hv)}</span>
                </div>
              ))}
            </div>
          </KvRow>
        )}
        {rt.body && (
          <KvRow k="body">
            <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 4, padding: '10px 12px', fontFamily: MONO_FONT, fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {typeof rt.body === 'string' ? rt.body : JSON.stringify(rt.body, null, 2)}
            </div>
          </KvRow>
        )}
        {rt.argsToJsonBody && (
          <KvRow k="argsToJsonBody">
            <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 4, padding: '10px 12px', fontFamily: MONO_FONT, fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {typeof rt.argsToJsonBody === 'string' ? rt.argsToJsonBody : JSON.stringify(rt.argsToJsonBody, null, 2)}
            </div>
          </KvRow>
        )}
        {rt.argsToUrlParam && <KvRow k="argsToUrlParam"><span style={{ fontFamily: MONO_FONT, fontSize: 12 }}>true</span></KvRow>}
        {rt.argsToFormBody && <KvRow k="argsToFormBody"><span style={{ fontFamily: MONO_FONT, fontSize: 12 }}>true</span></KvRow>}
        {rt.argsPosition && (
          <KvRow k="argsPosition">
            <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 4, padding: '8px 12px', fontFamily: MONO_FONT, fontSize: 12 }}>
              {Object.entries(rt.argsPosition).map(([pn, pos]) => (
                <div key={pn} style={{ padding: '2px 0' }}>
                  <span style={{ color: '#666' }}>{pn}</span> → <span style={{ color: '#333' }}>{String(pos)}</span>
                </div>
              ))}
            </div>
          </KvRow>
        )}
      </div>

      {Object.keys(resp).length > 0 && (
        <>
          <SubTitle color="#fa8c16">响应模板配置</SubTitle>
          <div style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 6, padding: '12px 16px' }}>
            {resp.body !== undefined && (
              <KvRow k="body">
                <div style={{ background: '#f6f8fa', border: '1px solid #e1e4e8', borderRadius: 4, padding: '10px 12px', fontFamily: MONO_FONT, fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {typeof resp.body === 'string' ? resp.body : JSON.stringify(resp.body, null, 2)}
                </div>
              </KvRow>
            )}
            {resp.prependBody && (
              <KvRow k="prependBody">
                <div style={{ background: '#f6f8fa', border: '1px solid #e1e4e8', borderRadius: 4, padding: '10px 12px', fontFamily: MONO_FONT, fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {resp.prependBody}
                </div>
              </KvRow>
            )}
            {resp.appendBody && (
              <KvRow k="appendBody">
                <div style={{ background: '#f6f8fa', border: '1px solid #e1e4e8', borderRadius: 4, padding: '10px 12px', fontFamily: MONO_FONT, fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {resp.appendBody}
                </div>
              </KvRow>
            )}
            {respHeaderList.length > 0 && (
              <KvRow k="headers">
                <div style={{ background: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: 4, padding: '8px 12px', fontFamily: MONO_FONT, fontSize: 12 }}>
                  {respHeaderList.map(([hk, hv]) => (
                    <div key={hk} style={{ padding: '2px 0', wordBreak: 'break-all' }}>
                      <span style={{ color: '#666' }}>{hk}</span> = <span style={{ color: '#333' }}>{String(hv)}</span>
                    </div>
                  ))}
                </div>
              </KvRow>
            )}
          </div>
        </>
      )}
    </div>
  )
}

/** 参数行（名称 + [类型] + 必填 + 描述，子参数递归缩进） */
const SchemaRowView = ({ row, depth }: { readonly row: SchemaRow; readonly depth: number }) => (
  <>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', paddingLeft: depth * 24 }}>
      <span style={{ fontWeight: 600, color: '#000', fontSize: 13, flexShrink: 0 }}>{row.name}</span>
      <span style={{ border: '1px solid #d9d9d9', borderRadius: 3, padding: '0 6px', fontFamily: MONO_FONT, fontSize: 12, color: '#666', background: '#fff', flexShrink: 0 }}>[{row.type}]</span>
      <span style={{ color: row.required ? '#f5222d' : '#999', fontSize: 12, flexShrink: 0 }}>{row.required ? '必填' : '-'}</span>
      <span style={{ color: '#999', fontSize: 12, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {row.description || '-'}
      </span>
    </div>
    {row.children.map(child => (
      <SchemaRowView key={child.name} row={child} depth={depth + 1} />
    ))}
  </>
)

interface ToolsPanelProps {
  readonly tools: McpToolItem[]
  /** HTTP 转 MCP 模式：明细区展示协议转化配置 */
  readonly restToMcp: boolean
  /** 按工具取协议转化模板对象（toolsMeta[name].templates['json-go-template']） */
  readonly templateOf?: (tool: McpToolItem) => Record<string, any> | null
  /** 传 onEdit/onDelete 时卡片显示对应操作链接 */
  readonly onEdit?: (idx: number) => void
  readonly onDelete?: (idx: number) => void
  readonly emptyTip: string
}

/**
 * Tools 主从面板，对齐 nacos NewMcpServer/McpDetail 的 Tools 区：
 * 左侧工具卡片列表（名称 + 启用状态 + N 个参数 + 操作），右侧选中工具明细
 * （名称大标题、描述、参数配置(共 N 项)、协议转化配置）。
 */
export const ToolsPanel = ({ tools, restToMcp, templateOf, onEdit, onDelete, emptyTip }: ToolsPanelProps) => {
  const [selectedIdx, setSelectedIdx] = useState(0)

  if (tools.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 40px', background: '#fafbfc', borderRadius: 10, border: '2px dashed #e5e7eb', color: '#9ca3af', fontSize: 13 }}>
        {emptyTip}
      </div>
    )
  }

  const idx = Math.min(selectedIdx, tools.length - 1)
  const tool = tools[idx]
  const rows = parseSchemaRows(tool.inputSchema)
  const templateData = restToMcp ? templateOf?.(tool) ?? null : null

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
      {/* 左侧：工具卡片列表 */}
      <div style={{ width: 280, flexShrink: 0 }}>
        {tools.map((t, i) => {
          const selected = i === idx
          return (
            <div
              key={i}
              onClick={() => setSelectedIdx(i)}
              style={{
                padding: '14px 16px',
                marginBottom: 8,
                cursor: 'pointer',
                background: selected ? '#e6f7ff' : '#fff',
                border: `1px solid ${selected ? '#91d5ff' : '#f0f0f0'}`,
                borderLeft: `3px solid ${selected ? '#1890ff' : 'transparent'}`,
                borderRadius: 4
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 15, color: '#000', marginBottom: 6 }}>{t.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    background: t.enabled === false ? '#f0f0f0' : '#52c41a',
                    color: t.enabled === false ? '#999' : '#fff',
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '1px 8px',
                    borderRadius: 10,
                    flexShrink: 0
                  }}
                >
                  {t.enabled === false ? '禁用' : '启用'}
                </span>
                <span style={{ color: '#666', fontSize: 13 }}>{countRows(parseSchemaRows(t.inputSchema))} 个参数</span>
              </div>
              {(onEdit || onDelete) && (
                <div style={{ fontSize: 13, marginTop: 6 }}>
                  {onEdit && (
                    <a
                      onClick={e => {
                        e.stopPropagation()
                        onEdit(i)
                      }}
                      style={{ color: '#1890ff' }}
                    >
                      编辑
                    </a>
                  )}
                  {onEdit && onDelete && <span style={{ color: '#d9d9d9', margin: '0 6px' }}>|</span>}
                  {onDelete && (
                    <a
                      onClick={e => {
                        e.stopPropagation()
                        onDelete(i)
                      }}
                      style={{ color: '#1890ff' }}
                    >
                      删除
                    </a>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 右侧：选中工具明细 */}
      <div style={{ flex: 1, minWidth: 0, background: '#fff', border: `1px solid #f0f0f0`, borderRadius: 4, padding: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#000', paddingBottom: 12, borderBottom: `1px solid ${BORDER}` }}>{tool.name}</div>
        {tool.description && <div style={{ margin: '16px 0', color: '#333', fontSize: 14, lineHeight: 1.6 }}>{tool.description}</div>}
        <div style={{ fontSize: 16, fontWeight: 700, color: '#000', paddingBottom: 10, borderBottom: `1px solid ${BORDER}`, marginTop: 16 }}>
          参数配置 <span style={{ fontSize: 13, color: '#999', fontWeight: 400 }}>(共 {countRows(rows)} 项)</span>
        </div>
        <div style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 4, padding: '8px 16px', marginTop: 12 }}>
          {rows.length === 0 ? (
            <div style={{ color: '#bfbfbf', fontSize: 13, padding: '8px 0' }}>暂无参数</div>
          ) : (
            rows.map(r => <SchemaRowView key={r.name} row={r} depth={0} />)
          )}
        </div>
        {templateData && (
          <>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#000', paddingBottom: 10, borderBottom: `1px solid ${BORDER}`, marginTop: 24 }}>协议转化配置</div>
            <ProtocolTemplateView data={templateData} />
          </>
        )}
      </div>
    </div>
  )
}
