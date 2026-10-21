import { ImportOutlined, PlusOutlined, DownloadOutlined } from '@ant-design/icons'
import { Form, Tabs, Button, Input, Select, Space, Typography, message, Switch } from 'antd'
import CommonDrawer from '@/components/stateless/common/CommonDrawer'
import { useEffect, useState } from 'react'
import { getToken } from '@/store/slice/auth/shared'
import type { McpForm, McpSecurityScheme, McpSecurityExtensions, McpToolItem, PluginItem } from '@/types/plug'
import { importMcpTools } from '@/service/api/pulg'

import { CreateToolModal } from './CreateToolModal'
import { ImportOpenApiModal } from './ImportOpenApiModal'
import { SecuritySchemeSection } from './SecuritySchemeSection'
import { ToolsPanel } from './ToolsPanel'

const { Text } = Typography;
const { TextArea } = Input;

interface PlugUpdateProps {
  readonly currentEdit: PluginItem | null
  /** 分组名称，用于命名空间展示 */
  readonly groupName?: string
  readonly namespaceId: string
  readonly onClose: () => void
  readonly onSubmit: (formData: McpForm) => void
  readonly open: boolean
}

const PROTOCOL_OPTIONS = [
  { label: 'SSE', value: 'sse', description: '服务器发送事件' },
  { label: 'Streamable HTTP', value: 'streamableHttp', description: '流式传输HTTP' }
];

export const PlugUpdate = ({ currentEdit, groupName, namespaceId, onClose, onSubmit, open }: PlugUpdateProps) => {
  const [form] = Form.useForm<McpForm>()
  const [restToMcpSwitch, setRestToMcpSwitch] = useState(false)
  const [securitySchemes, setSecuritySchemes] = useState<McpSecurityScheme[]>([])
  const [securityExtensions, setSecurityExtensions] = useState<McpSecurityExtensions>({})
  const [tools, setTools] = useState<McpToolItem[]>([])
  const [toolModalOpen, setToolModalOpen] = useState(false)
  const [editingToolIdx, setEditingToolIdx] = useState<number | null>(null)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [autoImporting, setAutoImporting] = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const [selectedProtocol, setSelectedProtocol] = useState<string>('sse')

  const versionValue = Form.useWatch('version', form)
  // 编辑已发布版本（当前版本号已在版本历史中）：对齐 nacos，仅 Tool/参数描述/开关可改
  const publishedEdit =
    !!currentEdit &&
    [...(currentEdit.allVersions ?? []).map(v => v.version), currentEdit.versionDetail?.version ?? '']
      .filter(Boolean)
      .includes(versionValue || '')

  const openImportOpenApi = () => setImportModalOpen(true)
  const handleImportOpenApi = (data: { tools: McpToolItem[]; schemes: McpSecurityScheme[] }) => {
    setTools((prev) => [...prev, ...data.tools])
    setSecuritySchemes((prev) => {
      const map = new Map(prev.map((s) => [s.id, s] as const))
      data.schemes.forEach((s) => {
        if (s.id && !map.has(s.id)) map.set(s.id, s)
      })
      return Array.from(map.values())
    })
    setImportModalOpen(false)
  }

  const handleAutoImport = async () => {
    const mcpEndpointUrl = form.getFieldValue('mcpEndpointUrl')
    const protocol = form.getFieldValue('protocol') || 'sse'

    if (!mcpEndpointUrl) {
      message.warning('请先填写 MCP 服务端点 URL')
      return
    }

    // Parse URL into baseUrl (origin) and endpoint (pathname)
    let baseUrl: string
    let endpoint: string
    try {
      const url = new URL(mcpEndpointUrl)
      baseUrl = url.origin
      endpoint = url.pathname || '/'
    } catch (err) {
      message.error('URL 格式无效，请输入完整的 URL（如 http://host:port/path）')
      return
    }

    // Map protocol to transportType
    const transportType: 'mcp-sse' | 'mcp-streamable' = 
      protocol === 'streamableHttp' ? 'mcp-streamable' : 'mcp-sse'

    // Get auth token
    const authToken = getToken() || undefined

    setAutoImporting(true)
    try {
      const res = await importMcpTools({
        transportType,
        baseUrl,
        endpoint,
        authToken,
        namespaceId
      })
      const payload = res?.response?.data?.data?.data ?? res?.response?.data?.data ?? res?.response?.data
      const importedTools: McpToolItem[] = Array.isArray(payload) ? payload : (payload?.tools ?? [])
      
      if (importedTools.length > 0) {
        setTools(prev => [...prev, ...importedTools])
        message.success(`成功导入 ${importedTools.length} 个工具`)
      } else {
        message.warning('未发现可导入的工具')
      }
    } catch (err) {
      console.error('Auto import failed:', err)
      message.error('自动导入工具失败，请检查 MCP 服务是否可用')
    } finally {
      setAutoImporting(false)
    }
  }

  const removeTool = (idx: number) => setTools((prev) => prev.filter((_, i) => i !== idx))
  const openCreateTool = () => {
    setEditingToolIdx(null)
    setToolModalOpen(true)
  }
  const openEditTool = (idx: number) => {
    setEditingToolIdx(idx)
    setToolModalOpen(true)
  }
  const handleToolModalOk = (tool: McpToolItem) => {
    setTools((prev) => {
      if (editingToolIdx === null) return [...prev, tool]
      return prev.map((t, i) => (i === editingToolIdx ? tool : t))
    })
    setToolModalOpen(false)
  }

  useEffect(() => {
    if (!open) {
      form.resetFields()
      setRestToMcpSwitch(false)
      setSecuritySchemes([])
      setSecurityExtensions({})
      setTools([])
      setActiveTab('general')
      setSelectedProtocol('sse')
      return
    }

    if (currentEdit) {
      const endpoint = currentEdit.backendEndpoints?.[0]
      const rawAddress = endpoint?.address || ''
      const rawPort = endpoint?.port != null ? String(endpoint.port) : ''
      let address = rawAddress
      let port = rawPort
      if (rawAddress.includes(':')) {
        const [host, portPart] = rawAddress.split(':')
        address = host
        if (!port && portPart && /^\d+$/.test(portPart)) {
          port = portPart
        }
      }
      const url = currentEdit.remoteServerConfig?.url || ''
      const transportProtocol = currentEdit.remoteServerConfig?.serviceRef?.transportProtocol || currentEdit.backendEndpoints?.[0]?.protocol || ''
      const transport: 'HTTP' | 'HTTPS' = /^https/i.test(transportProtocol) ? 'HTTPS' : 'HTTP'
      const proto = (currentEdit.protocol || currentEdit.frontProtocol || 'sse').toLowerCase()
      // 用协议类型判断连接方式：http/https 表示 HTTP 转 MCP，sse/streamableHttp 表示 MCP 直接接入
      const isRest = proto === 'http' || proto === 'https'
      // 重建 MCP 端点 URL：优先使用 remoteServerConfig.url，否则从 backendEndpoints 拼接
      const endpointPath = endpoint?.path || ''
      const mcpEndpointUrl = url || (address
        ? `${transport.toLowerCase()}://${address}${port ? ':' + port : ''}${endpointPath}`
        : '')
      const selectedProto = proto === 'streamablehttp' ? 'streamableHttp' : 'sse'

      form.setFieldsValue({
        mcp_name: currentEdit.pluginName || '',
        version: currentEdit.versionDetail?.version || '1.0.0',
        description: currentEdit.remark || '',
        restToMcpSwitch: isRest,
        mcpEndpointUrl: isRest ? '' : mcpEndpointUrl,
        address: isRest ? address : '',
        port: isRest ? port : '',
        transport: isRest ? transport : undefined,
        protocol: selectedProto
      })
      setRestToMcpSwitch(isRest)
      setSelectedProtocol(selectedProto)

      const toolSpec = currentEdit.toolSpec
      if (toolSpec) {
        setSecuritySchemes(toolSpec.securitySchemes ?? [])
        setSecurityExtensions(toolSpec.extensions ?? {})
        const toolList = (toolSpec.tools ?? []).map(tool => {
          const meta = toolSpec.toolsMeta?.[tool.name]
          // 优先读 json-go-template（与写入侧及 nacos 一致），回退旧 streamableHttp/sse.protocolTemplate
          const tplObj = meta?.templates?.['json-go-template']
          const tpl =
            typeof tplObj === 'string'
              ? tplObj
              : tplObj && typeof tplObj === 'object'
                ? JSON.stringify(tplObj, null, 2)
                : meta?.templates?.[proto === 'streamablehttp' ? 'streamableHttp' : 'sse']?.protocolTemplate
          return {
            name: tool.name,
            description: tool.description || '',
            enabled: meta?.enabled ?? true,
            inputSchema: tool.inputSchema,
            protocolTemplate: tpl || '',
            passthroughAuth: !!meta?.invokeContext?.passthroughAuth,
            backendSecuritySchemeId: meta?.invokeContext?.backendSecuritySchemeId,
            clientSecuritySchemeId: meta?.invokeContext?.clientSecuritySchemeId
          }
        })
        setTools(toolList)
      }
    } else {
      form.setFieldsValue({ protocol: 'sse', version: '1.0.0' })
    }
  }, [open, currentEdit, form])

  const handleFinish = (values: McpForm) => {
    if (tools.length === 0) {
      message.warning('请至少添加 1 个工具')
      setActiveTab('tools')
      return
    }
    onSubmit({
      ...values,
      restToMcpSwitch,
      securitySchemes,
      securityExtensions,
      tools
    })
  }

  const AButton = Button as any
  const AForm = Form as any
  const AInput = Input as any
  const ASelect = Select as any
  const ASwitch = (props: any) => {
    if (props.type === 'switch') {
      const { checked, onChange, disabled, type: _type, ...rest } = props
      return <Switch checked={checked} onChange={onChange} disabled={disabled} {...rest} />
    }
    return <Input {...props} />
  }
  const AFlex = Space as any

  // General Tab Content
  const generalTabContent = (
    <>
      {/* 基础信息 */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>基础信息</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                <span style={{ color: '#ff4d4f' }}>*</span> 命名空间
              </Text>
            </div>
            <Input value={groupName || namespaceId} disabled style={{ background: '#f5f5f5' }} />
          </div>
          <div>
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                <span style={{ color: '#ff4d4f' }}>*</span> MCP服务名称
              </Text>
            </div>
            {/* 编辑已有服务时锁定名称，对齐 nacos BasicInfo name isPreview */}
            <Form.Item name="mcp_name" noStyle rules={[{ required: true, message: '请输入MCP服务名称' }]}>
              <Input placeholder="请输入MCP服务名称" disabled={!!currentEdit} />
            </Form.Item>
          </div>
          <div>
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                <span style={{ color: '#ff4d4f' }}>*</span> 协议类型
              </Text>
            </div>
            <Form.Item name="protocol" noStyle>
              <Select
                options={PROTOCOL_OPTIONS}
                placeholder="请选择协议类型"
                onChange={(value) => setSelectedProtocol(value)}
                style={{ width: '160px' }}
                disabled={!!currentEdit}
              />
            </Form.Item>
            {selectedProtocol && (
              <div style={{ marginTop: 4, fontSize: 12, color: '#666' }}>
                {PROTOCOL_OPTIONS.find(opt => opt.value === selectedProtocol)?.description}
              </div>
            )}
          </div>
          <div>
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                <span style={{ color: '#ff4d4f' }}>*</span> 服务版本
              </Text>
            </div>
            <Form.Item name="version" noStyle rules={[{ required: true, message: '请输入服务版本' }]}>
              <Input placeholder="如 1.0.0" />
            </Form.Item>
            {publishedEdit && (
              <div style={{ marginTop: 4, color: '#ff4d4f', fontSize: 12, lineHeight: 1.7 }}>
                <div>当前正在修改已发布的版本，只能修改Tool以及参数的描述信息以及开关</div>
                <div>修改其他信息请使用新的版本号</div>
              </div>
            )}
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 4 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>描述信息</Text>
          </div>
          <Form.Item name="description" noStyle>
            <TextArea rows={3} placeholder="请输入描述信息" disabled={publishedEdit} />
          </Form.Item>
        </div>
      </div>

      {/* 连接配置 */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>连接配置</h3>
        
        {/* 连接方式 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 4 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>连接方式</Text>
          </div>
          <AFlex gap={12} align="center">
            <ASwitch
              type="switch"
              checked={restToMcpSwitch}
              disabled={!!currentEdit}
              onChange={(v: boolean) => {
                setRestToMcpSwitch(v)
                form.setFieldValue('restToMcpSwitch', v)
              }}
            />
            <span style={{ color: '#666', fontSize: 13, fontWeight: 500 }}>
              {restToMcpSwitch ? 'HTTP 转 MCP 服务' : 'MCP 服务直接接入'}
            </span>
          </AFlex>
        </div>

        {!restToMcpSwitch ? (
          <div>
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                <span style={{ color: '#ff4d4f' }}>*</span> MCP 服务端点
              </Text>
            </div>
            <AForm.Item name="mcpEndpointUrl" noStyle rules={[{ required: true, message: '请输入 MCP 服务端点 URL' }]}>
              <AInput placeholder="请输入完整的 MCP 服务端点 URL，如 https://example.com/mcp" disabled={publishedEdit} />
            </AForm.Item>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 3 }}>
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  <span style={{ color: '#ff4d4f' }}>*</span> 服务地址
                </Text>
              </div>
              <AForm.Item name="address" noStyle rules={[{ required: true, message: '请输入服务地址' }]}>
                <AInput placeholder="如 ip地址 或 服务域名" disabled={publishedEdit} />
              </AForm.Item>
            </div>
            <div style={{ flex: 2 }}>
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  <span style={{ color: '#ff4d4f' }}>*</span> 端口
                </Text>
              </div>
              <AForm.Item name="port" noStyle rules={[{ required: true, message: '请输入端口' }]}>
                <AInput placeholder="如 8080" disabled={publishedEdit} />
              </AForm.Item>
            </div>
            <div style={{ flex: 2 }}>
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  <span style={{ color: '#ff4d4f' }}>*</span> 传输协议
                </Text>
              </div>
              <AForm.Item name="transport" noStyle rules={[{ required: true, message: '请选择传输协议' }]}>
                <ASelect
                  placeholder="选择协议"
                  disabled={publishedEdit}
                  options={[
                    { label: 'HTTP', value: 'HTTP' },
                    { label: 'HTTPS', value: 'HTTPS' }
                  ]}
                />
              </AForm.Item>
            </div>
          </div>
        )}
      </div>

      {/* 高级配置 */}
      <div>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>高级配置</h3>
        <SecuritySchemeSection
          schemes={securitySchemes}
          extensions={securityExtensions}
          onSchemesChange={setSecuritySchemes}
          onExtensionsChange={setSecurityExtensions}
        />
      </div>
    </>
  )

  // Tools Tab Content
  const toolsTabContent = (
    <>
      {/* 工具操作按钮（编辑已发布版本时整行隐藏：无新增/导入入口、不展示工具计数） */}
      {!publishedEdit && (
        <div style={{ 
          marginBottom: 20, 
          display: 'flex', 
          gap: 12,
          padding: '16px 20px',
          background: 'linear-gradient(135deg, rgba(91, 124, 247, 0.04) 0%, rgba(0, 212, 255, 0.02) 100%)',
          borderRadius: 10,
          border: '1px solid rgba(91, 124, 247, 0.12)',
        }}>
          {restToMcpSwitch ? (
            <>
              <Button 
                className="btn-accent-gradient" 
                icon={<PlusOutlined />} 
                onClick={openCreateTool}
                style={{ fontWeight: 600 }}
              >
                添加工具
              </Button>
              <Button 
                icon={<ImportOutlined />} 
                onClick={openImportOpenApi}
                style={{ borderColor: 'rgba(91, 124, 247, 0.3)', color: '#5b7cf7' }}
              >
                从 OpenAPI 导入
              </Button>
            </>
          ) : (
            <Button 
              className="btn-accent-gradient"
              icon={<DownloadOutlined />} 
              onClick={handleAutoImport}
              loading={autoImporting}
              style={{ fontWeight: 600 }}
            >
              从 MCP 服务自动导入
            </Button>
          )}
          {tools.length > 0 && (
            <div style={{ 
              marginLeft: 'auto', 
              display: 'flex', 
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              color: '#6b7280'
            }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #5b7cf7 0%, #7091fa 100%)',
                color: '#fff',
                fontSize: 12,
                fontWeight: 700,
              }}>
                {tools.length}
              </span>
              <span>个工具</span>
            </div>
          )}
        </div>
      )}

      <ToolsPanel
        tools={tools}
        restToMcp={restToMcpSwitch}
        templateOf={t => {
          // 优先读本地未保存的编辑值，新增/修改工具后无需保存即可展示
          const local = (t as McpToolItem & { protocolTemplate?: string }).protocolTemplate
          if (local) {
            try {
              return JSON.parse(local)
            } catch {
              return null
            }
          }
          const d = currentEdit?.toolSpec?.toolsMeta?.[t.name]?.templates?.['json-go-template']
          return d && typeof d === 'object' ? d : null
        }}
        onEdit={openEditTool}
        // 编辑已发布版本不可删工具，对齐 nacos（卡片仅保留编辑链接）
        onDelete={publishedEdit ? undefined : removeTool}
        emptyTip={restToMcpSwitch
          ? '点击"添加工具"手动创建，或"从 OpenAPI 导入"批量导入'
          : '点击"从 MCP 服务自动导入"获取工具列表'}
      />
    </>
  )

  const tabItems = [
    {
      key: 'general',
      label: '通用',
      children: generalTabContent
    },
    {
      key: 'tools',
      label: '工具',
      children: toolsTabContent
    }
  ]

  return (
    <CommonDrawer
      open={open}
      title={currentEdit ? '编辑 MCP 服务' : '新增 MCP 服务'}
      onClose={onClose}
      width={960}
      footer={<DrawerFooter onClose={onClose} onSubmit={() => form.submit()} />}
    >
      <Form form={form} layout="vertical" onFinish={handleFinish} initialValues={{ protocol: 'sse', version: '1.0.0' }}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Form>

      <CreateToolModal
        open={toolModalOpen}
        initial={editingToolIdx !== null ? tools[editingToolIdx] : null}
        schemes={securitySchemes}
        restToMcpSwitch={restToMcpSwitch}
        onlyEditRuntimeInfo={publishedEdit}
        onClose={() => setToolModalOpen(false)}
        onOk={handleToolModalOk}
      />

      <ImportOpenApiModal open={importModalOpen} onClose={() => setImportModalOpen(false)} onOk={handleImportOpenApi} />
    </CommonDrawer>
  )
}

interface DrawerFooterProps {
  readonly onClose: () => void
  readonly onSubmit: () => void
}

function DrawerFooter({ onClose, onSubmit }: DrawerFooterProps) {
  return (
    <div className="drawer-footer-v5">
      <AButton className="btn-ghost-v5" onClick={onClose}>
        取消
      </AButton>
      <AButton type="primary" className="btn-accent-gradient" onClick={onSubmit}>
        确认提交
      </AButton>
    </div>
  )
}
