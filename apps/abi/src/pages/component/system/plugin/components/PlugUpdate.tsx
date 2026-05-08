import { CloseOutlined, ToolOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { Form } from 'antd';
import { useEffect, useState } from 'react';
import type { McpForm, McpSecurityScheme, McpSecurityExtensions, McpToolItem, PluginItem } from '@/types/plug';

import { CreateToolModal } from './CreateToolModal';
import { ImportOpenApiModal } from './ImportOpenApiModal';
import { SecuritySchemeSection } from './SecuritySchemeSection';

interface PlugUpdateProps {
  readonly currentEdit: PluginItem | null;
  readonly onClose: () => void;
  readonly onSubmit: (formData: McpForm) => void;
  readonly open: boolean;
}

export const PlugUpdate = ({ currentEdit, onClose, onSubmit, open }: PlugUpdateProps) => {
  const [form] = Form.useForm<McpForm>();
  // 高级配置：安全认证方案列表 + 默认上/下行认证 extensions
  const [securitySchemes, setSecuritySchemes] = useState<McpSecurityScheme[]>([]);
  const [securityExtensions, setSecurityExtensions] = useState<McpSecurityExtensions>({});
  // Tools 列表 + 创建工具弹窗
  const [tools, setTools] = useState<McpToolItem[]>([]);
  const [toolModalOpen, setToolModalOpen] = useState(false);
  const [editingToolIdx, setEditingToolIdx] = useState<number | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const openImportOpenApi = () => setImportModalOpen(true);
  const handleImportOpenApi = (data: { tools: McpToolItem[]; schemes: McpSecurityScheme[] }) => {
    setTools(prev => [...prev, ...data.tools]);
    // 合并认证方案（按 id 去重）
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
      setSecuritySchemes([]);
      setSecurityExtensions({});
      setTools([]);
      return;
    }

    if (currentEdit) {
      // 编辑回显：详情接口返回的 backendEndpoints/remoteServerConfig/toolSpec
      const endpoint = currentEdit.backendEndpoints?.[0];
      const rawAddress = endpoint?.address || '';
      const rawPort = endpoint?.port != null ? String(endpoint.port) : '';
      // address 可能为 "localhost:8080"，需要剥离端口
      let address = rawAddress;
      let port = rawPort;
      if (rawAddress.includes(':')) {
        const [host, portPart] = rawAddress.split(':');
        address = host;
        if (!port && portPart && /^\d+$/.test(portPart)) {
          port = portPart;
        }
      }
      // 从 remoteServerConfig.url 推导 HTTP/HTTPS
      const url = currentEdit.remoteServerConfig?.url || '';
      const transport: 'HTTP' | 'HTTPS' = /^https:/i.test(url) ? 'HTTPS' : 'HTTP';

      form.setFieldsValue({
        mcp_name: currentEdit.name || currentEdit.pluginName,
        version: currentEdit.versionDetail?.version ?? '1.0.0',
        description: currentEdit.description ?? currentEdit.remark ?? '',
        address,
        port,
        transport
      });

      // 高级配置 + Tools 回显
      setSecuritySchemes(currentEdit.toolSpec?.securitySchemes || []);
      setSecurityExtensions((currentEdit.toolSpec?.extensions as any) || {});
      setTools(currentEdit.toolSpec?.tools || []);
    } else {
      form.setFieldsValue({
        mcp_name: '',
        version: '1.0.0',
        description: '',
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
      extra={<CloseOutlined onClick={onClose} />}
      open={open}
      title={currentEdit ? '编辑MCP服务' : '新增MCP服务'}
      width={1000}
      footer={<DrawerFooter onClose={onClose} onSubmit={handleSubmit} />}
      onClose={onClose}
    >
      <AForm form={form} layout="vertical">
        <Form.Item label="命名空间">
          <AInput value="public" disabled />
        </Form.Item>

        <Form.Item
          label="MCP服务名"
          name="mcp_name"
          rules={[{ message: '请输入MCP服务名', required: true }]}
        >
          <AInput placeholder="请输入MCP服务名" disabled={!!currentEdit} />
        </Form.Item>

        <Form.Item label="协议类型">
          <ARadio.Group value="sse">
            <ARadio value="sse">sse</ARadio>
          </ARadio.Group>
        </Form.Item>

        <Form.Item label="新建服务" required style={{ marginBottom: 24 }}>
          <AFlex gap={12} align="flex-start">
            <Form.Item
              name="address"
              label="address"
              required={false}
              style={{ flex: 1, marginBottom: 0 }}
              rules={[{ message: '请输入服务地址', required: true }]}
            >
              <AInput placeholder="localhost" />
            </Form.Item>
            <Form.Item
              name="port"
              label="port"
              required={false}
              style={{ width: 120, marginBottom: 0 }}
              rules={[{ message: '请输入端口', required: true }]}
            >
              <AInput placeholder="8080" />
            </Form.Item>
            <Form.Item
              name="transport"
              label="传输协议"
              required={false}
              style={{ width: 140, marginBottom: 0 }}
              rules={[{ message: '请选择传输协议', required: true }]}
            >
              <ASelect
                options={[
                  { label: 'HTTP', value: 'HTTP' },
                  { label: 'HTTPS', value: 'HTTPS' }
                ]}
              />
            </Form.Item>
          </AFlex>
        </Form.Item>

        <Form.Item
          label="服务版本"
          name="version"
          rules={[{ message: '请输入服务版本', required: true }]}
        >
          <AInput placeholder="例如 1.0.0" />
        </Form.Item>

        <Form.Item label="描述" name="description">
          <AInput.TextArea placeholder="请输入描述" rows={3} />
        </Form.Item>

        {/* 高级配置：安全认证方案（非必填） */}
        <Form.Item label="高级配置">
          <ACollapse
            ghost
            items={[
              {
                key: 'security',
                label: '安全认证方案',
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

        {/* Tools （非必填） */}
        <Form.Item label="Tools">
          {tools.length === 0 ? (
            <AFlex
              vertical
              align="center"
              justify="center"
              gap={12}
              style={{
                padding: '32px 16px',
                background: '#fafafa',
                border: '1px dashed #d9d9d9',
                borderRadius: 4
              }}
            >
              <ToolOutlined style={{ fontSize: 32, color: '#bfbfbf' }} />
              <span style={{ color: '#999', fontSize: 12 }}>暂无可用的 Tools</span>
              <ASpace>
                <AButton type="primary" onClick={openCreateTool}>
                  添加
                </AButton>
                <AButton onClick={openImportOpenApi}>从 OpenAPI 文件导入工具</AButton>
              </ASpace>
            </AFlex>
          ) : (
            <AFlex vertical gap={8}>
              {tools.map((tool, idx) => (
                <AFlex
                  key={idx}
                  gap={8}
                  align="center"
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #eef0f4',
                    borderRadius: 6,
                    background: '#fff'
                  }}
                >
                  <ToolOutlined style={{ color: '#1677ff' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500 }}>{tool.name || '(未命名)'}</div>
                    {tool.description && (
                      <div style={{ color: '#888', fontSize: 12 }}>{tool.description}</div>
                    )}
                  </div>
                  <AButton
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => openEditTool(idx)}
                  />
                  <AButton
                    danger
                    type="text"
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => removeTool(idx)}
                  />
                </AFlex>
              ))}
              <ASpace>
                <AButton type="primary" onClick={openCreateTool}>
                  添加
                </AButton>
                <AButton onClick={openImportOpenApi}>从 OpenAPI 文件导入工具</AButton>
              </ASpace>
            </AFlex>
          )}
        </Form.Item>
      </AForm>

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
    <AFlex justify="end">
      <ASpace>
        <AButton onClick={onClose}>取消</AButton>
        <AButton type="primary" onClick={onSubmit}>
          确认
        </AButton>
      </ASpace>
    </AFlex>
  );
}
