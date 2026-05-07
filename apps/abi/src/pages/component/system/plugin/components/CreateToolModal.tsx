import { CloseOutlined } from '@ant-design/icons';
import Editor from '@monaco-editor/react';
import { Form, Modal, Tag } from 'antd';
import { useEffect, useState } from 'react';

import type { McpToolItem } from '@/types/plug';

interface CreateToolModalProps {
  readonly open: boolean;
  readonly initial?: McpToolItem | null;
  readonly onClose: () => void;
  readonly onOk: (tool: McpToolItem) => void;
}

interface ParamRow {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object';
  description?: string;
}

const TEMPLATE_PRESETS: Array<{ key: string; label: string; color: string; tpl: string }> = [
  {
    key: 'json',
    label: 'JSON请求体',
    color: 'blue',
    tpl: JSON.stringify(
      {
        requestTemplate: { method: 'POST', url: '/api/example', body: '{"foo":"{{.foo}}"}' },
        responseTemplate: { body: '{{.}}' }
      },
      null,
      2
    )
  },
  {
    key: 'url',
    label: 'URL参数',
    color: 'magenta',
    tpl: JSON.stringify(
      {
        requestTemplate: { method: 'GET', url: '/api/example?foo={{.foo}}' },
        responseTemplate: { body: '{{.}}' }
      },
      null,
      2
    )
  },
  {
    key: 'form',
    label: '表单数据',
    color: 'green',
    tpl: JSON.stringify(
      {
        requestTemplate: {
          method: 'POST',
          url: '/api/example',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'foo={{.foo}}'
        },
        responseTemplate: { body: '{{.}}' }
      },
      null,
      2
    )
  },
  {
    key: 'custom',
    label: '自定义请求体',
    color: 'orange',
    tpl: JSON.stringify(
      {
        requestTemplate: { method: 'POST', url: '/api/example', body: '{{.body}}' },
        responseTemplate: { body: '{{.}}' }
      },
      null,
      2
    )
  },
  {
    key: 'argsPosition',
    label: '参数位置-Path',
    color: 'red',
    tpl: JSON.stringify(
      {
        requestTemplate: { method: 'GET', url: '/api/example/{{.id}}', argsPosition: { id: 'path' } },
        responseTemplate: { body: '{{.}}' }
      },
      null,
      2
    )
  }
];

export const CreateToolModal = ({ open, initial, onClose, onOk }: CreateToolModalProps) => {
  const [form] = Form.useForm();
  const [params, setParams] = useState<ParamRow[]>([]);
  const [protocolTpl, setProtocolTpl] = useState('');
  const [passthroughAuth, setPassthroughAuth] = useState(false);

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      name: initial?.name || '',
      description: initial?.description || '',
      enabled: initial?.enabled ?? true
    });
    setParams(
      Array.isArray(initial?.inputSchema?.properties)
        ? (initial!.inputSchema.properties as ParamRow[])
        : []
    );
    setProtocolTpl(initial?.protocolTemplate || '');
    setPassthroughAuth(initial?.passthroughAuth || false);
  }, [open, initial, form]);

  const addParam = () =>
    setParams(prev => [...prev, { name: '', type: 'string', description: '' }]);
  const removeParam = (idx: number) => setParams(prev => prev.filter((_, i) => i !== idx));
  const updateParam = (idx: number, patch: Partial<ParamRow>) =>
    setParams(prev => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const tool: McpToolItem = {
        name: values.name,
        description: values.description,
        enabled: values.enabled,
        inputSchema: { type: 'object', properties: params },
        protocolTemplate: protocolTpl,
        passthroughAuth
      };
      onOk(tool);
    } catch (err) {
      console.error('CreateToolModal validation failed', err);
    }
  };

  const sectionTitle: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 600,
    paddingBottom: 8,
    marginBottom: 12,
    borderBottom: '1px solid #f0f0f0'
  };

  const sectionStyle: React.CSSProperties = {
    background: '#fafbfd',
    border: '1px solid #eef0f4',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16
  };

  return (
    <Modal
      open={open}
      title={
        <span>
          <span style={{ display: 'inline-block', width: 3, height: 14, background: '#1677ff', marginRight: 8, verticalAlign: 'middle' }} />
          创建工具
        </span>
      }
      width={780}
      onCancel={onClose}
      onOk={handleOk}
      okText="确定"
      cancelText="取消"
      closeIcon={<CloseOutlined />}
      styles={{ body: { maxHeight: '70vh', overflow: 'auto' } }}
    >
      <Form form={form} layout="vertical">
        {/* 基础信息 */}
        <div style={sectionStyle}>
          <div style={sectionTitle}>基础信息</div>
          <Form.Item
            label="Tool 名称"
            name="name"
            rules={[{ message: '请输入 Tool 名称', required: true }]}
          >
            <AInput placeholder="Tool 名称" />
          </Form.Item>
          <Form.Item
            label="Tool 描述"
            name="description"
            rules={[{ message: '请输入 Tool 描述', required: true }]}
          >
            <AInput.TextArea rows={3} placeholder="Tool 描述" />
          </Form.Item>
          <Form.Item label="是否启用" name="enabled" valuePropName="checked" required>
            <ASwitch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
        </div>

        {/* Tool 入参描述 */}
        <div style={sectionStyle}>
          <div style={sectionTitle}>Tool 入参描述</div>
          <div style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>参数结构</div>
          <div style={{ background: '#fff', border: '1px solid #eef0f4', borderRadius: 6, padding: 12 }}>
            <AButton type="primary" size="small" onClick={addParam} style={{ marginBottom: 12 }}>
              添加参数
            </AButton>
            <div style={{ background: '#e6f4ff', padding: '6px 12px', borderRadius: 4, marginBottom: 8 }}>
              <span style={{ marginRight: 6 }}>+</span>参数列表 (object)
            </div>
            {params.map((p, idx) => (
              <AFlex key={idx} gap={8} align="center" style={{ marginBottom: 8 }}>
                <AInput
                  placeholder="参数名"
                  value={p.name}
                  onChange={e => updateParam(idx, { name: e.target.value })}
                  style={{ width: 160 }}
                />
                <ASelect
                  value={p.type}
                  onChange={v => updateParam(idx, { type: v })}
                  options={[
                    { label: 'string', value: 'string' },
                    { label: 'number', value: 'number' },
                    { label: 'boolean', value: 'boolean' },
                    { label: 'object', value: 'object' }
                  ]}
                  style={{ width: 120 }}
                />
                <AInput
                  placeholder="描述"
                  value={p.description}
                  onChange={e => updateParam(idx, { description: e.target.value })}
                  style={{ flex: 1 }}
                />
                <AButton danger size="small" onClick={() => removeParam(idx)}>
                  删除
                </AButton>
              </AFlex>
            ))}
          </div>
        </div>

        {/* 高级配置 */}
        <div style={sectionStyle}>
          <div style={sectionTitle}>高级配置</div>
          <div style={{ fontWeight: 500, marginBottom: 8 }}>协议转化配置</div>
          <div style={{ background: '#fff', border: '1px solid #eef0f4', borderRadius: 6, padding: 12 }}>
            <div style={{ color: '#666', fontSize: 12, marginBottom: 8 }}>配置模板生成器</div>
            <AFlex gap={8} wrap="wrap" style={{ marginBottom: 8 }}>
              {TEMPLATE_PRESETS.map(preset => (
                <Tag.CheckableTag
                  key={preset.key}
                  checked={false}
                  onChange={() => setProtocolTpl(preset.tpl)}
                  style={{ padding: '2px 10px', border: `1px solid var(--ant-color-${preset.color}-3, #d9d9d9)`, borderRadius: 4 }}
                >
                  <span style={{ color: `var(--ant-color-${preset.color}-7, #1677ff)` }}>{preset.label}</span>
                </Tag.CheckableTag>
              ))}
            </AFlex>
            <div style={{ color: '#888', fontSize: 12, marginBottom: 4 }}>
              💡 点击按钮快速生成对应类型的配置模板，包含完整的请求和响应配置
            </div>
            <div style={{ color: '#888', fontSize: 12, marginBottom: 12 }}>
              ◆ 参数位置模式：通过 argsPosition 对象指定每个参数在请求中的位置（支持 query/path/header/cookie/body）
            </div>
            <div style={{ border: '1px solid #eef0f4', borderRadius: 4, overflow: 'hidden' }}>
              <Editor
                height="220px"
                defaultLanguage="json"
                value={protocolTpl}
                onChange={v => setProtocolTpl(v || '')}
                options={{ minimap: { enabled: false }, fontSize: 13 }}
              />
            </div>
            <div style={{ color: '#888', fontSize: 12, marginTop: 8 }}>
              通过网关提供的协议转换模版进行协议转化，详情请见文档{' '}
              <a href="https://nacos.io/docs/v3.0/manual/user/mcp-template" target="_blank" rel="noreferrer">
                https://nacos.io/docs/v3.0/manual/user/mcp-template
              </a>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <span style={{ fontWeight: 500, marginRight: 8 }}>启用透明认证</span>
            <Tag color="orange">安全</Tag>
            <AFlex gap={6} align="center" style={{ marginTop: 8 }}>
              <ASwitch
                checked={passthroughAuth}
                checkedChildren="启"
                unCheckedChildren="禁"
                onChange={setPassthroughAuth}
              />
              <span style={{ color: '#888', fontSize: 12 }}>使用默认认证方式</span>
            </AFlex>
          </div>
        </div>
      </Form>
    </Modal>
  );
};
