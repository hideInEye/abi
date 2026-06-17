import { ApiOutlined, CloudServerOutlined, SafetyCertificateOutlined, ToolOutlined, CloseOutlined, EditOutlined, DeleteOutlined, ImportOutlined, PlusOutlined } from '@ant-design/icons';
import { Form } from 'antd';
import { useEffect, useState } from 'react';
import type { McpForm, McpSecurityScheme, McpSecurityExtensions, McpToolItem, PluginItem } from '@/types/plug';

import { CreateToolModal } from './CreateToolModal';
import { ImportOpenApiModal } from './ImportOpenApiModal';
import { SecuritySchemeSection } from './SecuritySchemeSection';

interface PlugUpdateProps {
  readonly currentEdit: PluginItem | null;
  readonly namespaceId: string;
  readonly onClose: () => void;
  readonly onSubmit: (formData: McpForm) => void;
  readonly open: boolean;
}

export const PlugUpdate = ({ currentEdit, namespaceId, onClose, onSubmit, open }: PlugUpdateProps) => {
  const [form] = Form.useForm<McpForm>();
  const [restToMcpSwitch, setRestToMcpSwitch] = useState(false);
  const [securitySchemes, setSecuritySchemes] = useState<McpSecurityScheme[]>([]);
  const [securityExtensions, setSecurityExtensions] = useState<McpSecurityExtensions>({});
  const [tools, setTools] = useState<McpToolItem[]>([]);
  const [toolModalOpen, setToolModalOpen] = useState(false);
  const [editingToolIdx, setEditingToolIdx] = useState<number | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const openImportOpenApi = () => setImportModalOpen(true);
  const handleImportOpenApi = (data: { tools: McpToolItem[]; schemes: McpSecurityScheme[] }) => {
    setTools(prev => [...prev, ...data.tools]);
    setSecuritySchemes(prev => {
      const map = new Map(prev.map(s => [s.id, s] as const));
      data.schemes.forEach(s => {
        if (s.id && !map.has(s.id)) map.set(s.id, s);
      });
      return Array.from(map.values());
    });
    setImportModalOpen(false);
  };

  const removeTool = (idx: number) => setTools(prev => prev.filter((_, i) => i !== idx));
  const openCreateTool = () => {
    setEditingToolIdx(null);
    setToolModalOpen(true);
  };
  const openEditTool = (idx: number) => {
    setEditingToolIdx(idx);
    setToolModalOpen(true);
  };
  const handleToolModalOk = (tool: McpToolItem) => {
    setTools(prev => {
      if (editingToolIdx === null) return [...prev, tool];
      return prev.map((t, i) => (i === editingToolIdx ? tool : t));
    });
    setToolModalOpen(false);
  };

  useEffect(() => {
    if (!open) {
      form.resetFields();
      setRestToMcpSwitch(false);
      setSecuritySchemes([]);
      setSecurityExtensions({});
      setTools([]);
      return;
    }

    if (currentEdit) {
      const endpoint = currentEdit.backendEndpoints?.[0];
      const rawAddress = endpoint?.address || '';
      const rawPort = endpoint?.port != null ? String(endpoint.port) : '';
      let address = rawAddress;
      let port = rawPort;
      if (rawAddress.includes(':')) {
        const [host, portPart] = rawAddress.split(':');
        address = host;
        if (!port && portPart && /^\d+$/.test(portPart)) {
          port = portPart;
        }
      }
      const url = currentEdit.remoteServerConfig?.url || '';
      const transport: 'HTTP' | 'HTTPS' = /^https:/i.test(url) ? 'HTTPS' : 'HTTP';
      const proto = (currentEdit.protocol || '').toLowerCase();
      const isRestToMcp = proto === 'http' || proto === 'https';
      setRestToMcpSwitch(isRestToMcp);

      form.setFieldsValue({
        mcp_name: currentEdit.name || currentEdit.pluginName,
        version: currentEdit.versionDetail?.version ?? '1.0.0',
        description: currentEdit.description ?? currentEdit.remark ?? '',
        restToMcpSwitch: isRestToMcp,
        address,
        port,
        transport,
        mcpEndpointUrl: url || (address && port ? `${transport.toLowerCase()}://${address}:${port}` : '')
      });

      setSecuritySchemes(currentEdit.toolSpec?.securitySchemes || []);
      setSecurityExtensions((currentEdit.toolSpec?.extensions as any) || {});
      setTools(currentEdit.toolSpec?.tools || []);
    } else {
      setRestToMcpSwitch(false);
      form.setFieldsValue({
        mcp_name: '',
        version: '1.0.0',
        description: '',
        restToMcpSwitch: false,
        mcpEndpointUrl: '',
        address: '',
        port: '',
        transport: 'HTTP'
      });
    }
  }, [open, currentEdit, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      onSubmit({
        ...values,
        restToMcpSwitch,
        securitySchemes: securitySchemes.filter(s => s.id),
        securityExtensions,
        tools
      });
    } catch (error) {
      console.error('Form validation failed:', error);
    }
  };

  return (
    <ADrawer
      closeIcon={null}
      extra={
        <div className="drawer-close-btn" onClick={onClose}>
          <CloseOutlined />
        </div>
      }
      open={open}
      title={
        <div className="drawer-title-v5">
          <div className="drawer-title-icon">
            <ApiOutlined />
          </div>
          <span>{currentEdit ? '编辑MCP服务' : '新增MCP服务'}</span>
        </div>
      }
      width={1000}
      className="mcp-edit-drawer"
      footer={<DrawerFooter onClose={onClose} onSubmit={handleSubmit} />}
      onClose={onClose}
    >
      <div className="mcp-form-container">
        <AForm form={form} layout="vertical" className="mcp-form">
          {/* 基础信息区 */}
          <div className="form-section">
            <div className="section-header">
              <CloudServerOutlined className="section-icon" />
              <span className="section-title">基础信息</span>
            </div>
            <div className="section-body">
              <Form.Item label="命名空间" className="form-item-v5">
                <AInput value={namespaceId} disabled className="form-input-v5" />
              </Form.Item>

              <Form.Item
                label="MCP服务名"
                name="mcp_name"
                rules={[{ message: '请输入MCP服务名', required: true }]}
                className="form-item-v5"
              >
                <AInput placeholder="请输入MCP服务名" disabled={!!currentEdit} className="form-input-v5" />
              </Form.Item>

              <Form.Item label="协议类型" className="form-item-v5">
                <ARadio.Group value="sse" className="radio-group-v5">
                  <ARadio value="sse">SSE (Server-Sent Events)</ARadio>
                </ARadio.Group>
              </Form.Item>

              <Form.Item label="服务版本" name="version" rules={[{ message: '请输入服务版本', required: true }]} className="form-item-v5">
                <AInput placeholder="例如 1.0.0" className="form-input-v5" />
              </Form.Item>

              <Form.Item label="描述" name="description" className="form-item-v5">
                <AInput.TextArea placeholder="请输入服务描述" rows={3} className="form-textarea-v5" />
              </Form.Item>
            </div>
          </div>

          {/* 连接配置区 */}
          <div className="form-section">
            <div className="section-header">
              <ApiOutlined className="section-icon" />
              <span className="section-title">连接配置</span>
            </div>
            <div className="section-body">
              <Form.Item label="HTTP 转 MCP 服务" required className="form-item-v5">
                <div className="switch-wrapper-v5">
                  <ASwitch
                    checked={restToMcpSwitch}
                    checkedChildren="开启"
                    unCheckedChildren="关闭"
                    onChange={setRestToMcpSwitch}
                    className="switch-v5"
                  />
                  <span className="switch-label">{restToMcpSwitch ? '已开启' : '已关闭'}</span>
                </div>
                <div className="form-hint-v5">
                  存量 HTTP 服务转化为 MCP 服务需要搭配网关使用，请参考文档
                  <a
                    href="https://nacos.io/docs/v3.0/manual/user/mcp-template"
                    target="_blank"
                    rel="noreferrer"
                    className="hint-link"
                  >
                    MCP模板配置指南
                  </a>
                </div>
              </Form.Item>

              {restToMcpSwitch ? (
                <Form.Item label="新建服务" required className="form-item-v5" style={{ marginBottom: 24 }}>
                  <div className="endpoint-grid">
                    <Form.Item
                      name="address"
                      label="服务地址"
                      required={false}
                      rules={[{ message: '请输入服务地址', required: true }]}
                      className="endpoint-item endpoint-item-wide"
                    >
                      <AInput placeholder="localhost" className="form-input-v5" />
                    </Form.Item>
                    <Form.Item
                      name="port"
                      label="端口"
                      required={false}
                      rules={[{ message: '请输入端口', required: true }]}
                      className="endpoint-item endpoint-item-narrow"
                    >
                      <AInput placeholder="8080" className="form-input-v5" />
                    </Form.Item>
                    <Form.Item
                      name="transport"
                      label="传输协议"
                      required={false}
                      rules={[{ message: '请选择传输协议', required: true }]}
                      className="endpoint-item endpoint-item-medium"
                    >
                      <ASelect
                        options={[
                          { label: 'HTTP', value: 'HTTP' },
                          { label: 'HTTPS', value: 'HTTPS' }
                        ]}
                        className="form-select-v5"
                      />
                    </Form.Item>
                  </div>
                </Form.Item>
              ) : (
                <Form.Item
                  label="MCP Server Endpoint"
                  name="mcpEndpointUrl"
                  rules={[
                    { message: '请输入完整的 MCP 服务端点 URL', required: true },
                    {
                      validator: (_: any, value: string) => {
                        if (!value) return Promise.resolve();
                        try {
                          new URL(value);
                          return Promise.resolve();
                        } catch {
                          return Promise.reject(new Error('URL 格式不正确，例如：http://example.com/sse'));
                        }
                      }
                    }
                  ]}
                  className="form-item-v5"
                  extra="请输入完整的 MCP 服务端点 URL，例如：http://example.com/sse"
                >
                  <AInput placeholder="http://example.com/sse" className="form-input-v5" />
                </Form.Item>
              )}
            </div>
          </div>

          {/* 高级配置区 */}
          <div className="form-section">
            <div className="section-header">
              <SafetyCertificateOutlined className="section-icon" />
              <span className="section-title">高级配置</span>
            </div>
            <div className="section-body">
              <Form.Item label="安全认证方案" className="form-item-v5">
                <ACollapse
                  ghost
                  className="collapse-v5"
                  items={[
                    {
                      key: 'security',
                      label: '配置安全认证方案（可选）',
                      children: (
                        <SecuritySchemeSection
                          schemes={securitySchemes}
                          extensions={securityExtensions}
                          onSchemesChange={setSecuritySchemes}
                          onExtensionsChange={setSecurityExtensions}
                        />
                      )
                    }
                  ]}
                />
              </Form.Item>
            </div>
          </div>

          {/* Tools 区 */}
          <div className="form-section">
            <div className="section-header">
              <ToolOutlined className="section-icon" />
              <span className="section-title">Tools 工具集</span>
            </div>
            <div className="section-body">
              <Form.Item label="可用工具" className="form-item-v5">
                {tools.length === 0 ? (
                  <div className="tools-empty-v5">
                    <div className="empty-icon">
                      <ToolOutlined />
                    </div>
                    <div className="empty-text">暂无可用的 Tools</div>
                    <div className="empty-actions">
                      <AButton type="primary" className="btn-accent-gradient" onClick={openCreateTool}>
                        <PlusOutlined /> 添加工具
                      </AButton>
                      <AButton className="btn-ghost-v5" onClick={openImportOpenApi}>
                        <ImportOutlined /> 从 OpenAPI 导入
                      </AButton>
                    </div>
                  </div>
                ) : (
                  <div className="tools-list-v5">
                    {tools.map((tool, idx) => (
                      <div key={idx} className="tool-card-v5">
                        <div className="tool-icon">
                          <ToolOutlined />
                        </div>
                        <div className="tool-info">
                          <div className="tool-name">{tool.name || '(未命名)'}</div>
                          {tool.description && (
                            <div className="tool-desc">{tool.description}</div>
                          )}
                        </div>
                        <div className="tool-actions">
                          <AButton
                            type="text"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => openEditTool(idx)}
                            className="tool-action-btn"
                          />
                          <AButton
                            danger
                            type="text"
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={() => removeTool(idx)}
                            className="tool-action-btn danger"
                          />
                        </div>
                      </div>
                    ))}
                    <div className="tools-actions-v5">
                      <AButton type="primary" className="btn-accent-gradient" onClick={openCreateTool}>
                        <PlusOutlined /> 添加工具
                      </AButton>
                      <AButton className="btn-ghost-v5" onClick={openImportOpenApi}>
                        <ImportOutlined /> 从 OpenAPI 导入
                      </AButton>
                    </div>
                  </div>
                )}
              </Form.Item>
            </div>
          </div>
        </AForm>
      </div>

      <CreateToolModal
        open={toolModalOpen}
        initial={editingToolIdx !== null ? tools[editingToolIdx] : null}
        schemes={securitySchemes}
        onClose={() => setToolModalOpen(false)}
        onOk={handleToolModalOk}
      />

      <ImportOpenApiModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onOk={handleImportOpenApi}
      />
    </ADrawer>
  );
};

interface DrawerFooterProps {
  readonly onClose: () => void;
  readonly onSubmit: () => void;
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
  );
}
