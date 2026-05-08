import { CloseOutlined, CloseCircleFilled } from '@ant-design/icons';
import Editor from '@monaco-editor/react';
import { Form, Modal, Tag } from 'antd';
import { useEffect, useMemo, useState } from 'react';

import type { McpToolItem, McpSecurityScheme } from '@/types/plug';

interface CreateToolModalProps {
  readonly open: boolean;
  readonly initial?: McpToolItem | null;
  readonly schemes?: McpSecurityScheme[];
  readonly onClose: () => void;
  readonly onOk: (tool: McpToolItem) => void;
}

type ParamType = 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array';

interface ParamRow {
  name: string;
  type: ParamType;
  description?: string;
  required?: boolean;
  defaultValue?: string;
}

const PARAM_TYPE_OPTIONS: Array<{ label: string; value: ParamType }> = [
  { label: '字符串类型 (string)', value: 'string' },
  { label: '数字类型 (number)', value: 'number' },
  { label: '整数类型 (integer)', value: 'integer' },
  { label: '布尔类型 (boolean)', value: 'boolean' },
  { label: '对象类型 (object)', value: 'object' },
  { label: '数组类型 (array)', value: 'array' }
];

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

export const CreateToolModal = ({ open, initial, schemes = [], onClose, onOk }: CreateToolModalProps) => {
  const [form] = Form.useForm();
  const [params, setParams] = useState<ParamRow[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number>(-1);
  const [treeExpanded, setTreeExpanded] = useState<boolean>(true);
  const [protocolTpl, setProtocolTpl] = useState('');
  const [passthroughAuth, setPassthroughAuth] = useState(false);
  const [backendSchemeId, setBackendSchemeId] = useState<string | undefined>();
  const [clientSchemeId, setClientSchemeId] = useState<string | undefined>();

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      name: initial?.name || '',
      description: initial?.description || '',
      enabled: initial?.enabled ?? true
    });
    const initParams = Array.isArray(initial?.inputSchema?.properties)
      ? (initial!.inputSchema.properties as ParamRow[])
      : [];
    setParams(initParams);
    setSelectedIdx(initParams.length > 0 ? 0 : -1);
    setTreeExpanded(true);
    setProtocolTpl(initial?.protocolTemplate || '');
    setPassthroughAuth(initial?.passthroughAuth || false);
    setBackendSchemeId(initial?.backendSecuritySchemeId);
    setClientSchemeId(initial?.clientSecuritySchemeId);
  }, [open, initial, form]);

  const addParam = () => {
    setParams(prev => {
      const next = [...prev, { name: `NewArg${prev.length + 1}`, type: 'string' as ParamType, description: '', required: false, defaultValue: '' }];
      setSelectedIdx(next.length - 1);
      return next;
    });
    setTreeExpanded(true);
  };
  const removeParam = (idx: number) => {
    setParams(prev => {
      const next = prev.filter((_, i) => i !== idx);
      setSelectedIdx(si => {
        if (next.length === 0) return -1;
        if (si === idx) return Math.min(idx, next.length - 1);
        if (si > idx) return si - 1;
        return si;
      });
      return next;
    });
  };
  const updateParam = (idx: number, patch: Partial<ParamRow>) =>
    setParams(prev => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));

  const selected = useMemo<ParamRow | null>(() => (selectedIdx >= 0 && selectedIdx < params.length ? params[selectedIdx] : null), [params, selectedIdx]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      // 转换 params 为 JSON Schema properties 结构
      const properties: Record<string, any> = {};
      const requiredList: string[] = [];
      params.forEach(p => {
        if (!p.name) return;
        const item: Record<string, any> = { type: p.type };
        if (p.description) item.description = p.description;
        if (p.defaultValue !== undefined && p.defaultValue !== '') {
          if (p.type === 'number') {
            const n = Number(p.defaultValue);
            if (!Number.isNaN(n)) item.default = n;
          } else if (p.type === 'integer') {
            const n = parseInt(p.defaultValue, 10);
            if (!Number.isNaN(n)) item.default = n;
          } else if (p.type === 'boolean') {
            item.default = p.defaultValue === 'true';
          } else {
            item.default = p.defaultValue;
          }
        }
        properties[p.name] = item;
        if (p.required) requiredList.push(p.name);
      });
      const tool: McpToolItem = {
        name: values.name,
        description: values.description,
        enabled: values.enabled,
        inputSchema: {
          type: 'object',
          properties,
          ...(requiredList.length > 0 ? { required: requiredList } : {})
        },
        protocolTemplate: protocolTpl,
        passthroughAuth,
        ...(passthroughAuth ? { backendSecuritySchemeId: backendSchemeId, clientSecuritySchemeId: clientSchemeId } : {})
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

        {/* Tool 入参描述 - 参数结构 */}
        <div style={sectionStyle}>
          <div style={sectionTitle}>参数结构</div>
          <div style={{ background: '#fff', border: '1px solid #eef0f4', borderRadius: 6, padding: 16 }}>
            <AButton type="primary" onClick={addParam} style={{ marginBottom: 16 }}>
              添加参数
            </AButton>
            {/* 根节点：参数列表 (object) */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 16,
                  height: 16,
                  border: '1px solid #bfbfbf',
                  borderRadius: 2,
                  marginRight: 8,
                  fontSize: 12,
                  lineHeight: 1,
                  cursor: 'pointer',
                  userSelect: 'none',
                  color: '#666'
                }}
                onClick={() => setTreeExpanded(e => !e)}
              >
                {treeExpanded ? '−' : '+'}
              </span>
              <span style={{ color: '#1677ff', fontWeight: 500, cursor: 'pointer' }}>参数列表</span>
              <span style={{ color: '#888', marginLeft: 6 }}>(object)</span>
            </div>
            {/* 子节点：参数行 */}
            {treeExpanded && (
              <div style={{ marginLeft: 24, borderLeft: '1px dashed #d9d9d9', paddingLeft: 12 }}>
                {params.length === 0 && (
                  <div style={{ color: '#bfbfbf', fontSize: 12, padding: '6px 0' }}>暂无参数，点击「添加参数」新增</div>
                )}
                {params.map((p, idx) => {
                  const isSelected = idx === selectedIdx;
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedIdx(idx)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '4px 10px',
                        marginBottom: 4,
                        borderRadius: 4,
                        cursor: 'pointer',
                        background: isSelected ? '#bae0ff' : 'transparent'
                      }}
                    >
                      <span>
                        <span style={{ color: isSelected ? '#003eb3' : '#1677ff', fontWeight: 500 }}>
                          {p.name || '(未命名)'}
                        </span>
                        <span style={{ color: '#888', marginLeft: 8 }}>({p.type})</span>
                      </span>
                      {isSelected && (
                        <span
                          onClick={e => {
                            e.stopPropagation();
                            removeParam(idx);
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 20,
                            height: 20,
                            background: '#ff4d4f',
                            color: '#fff',
                            borderRadius: 3,
                            cursor: 'pointer',
                            fontSize: 12,
                            lineHeight: 1
                          }}
                        >
                          <CloseCircleFilled style={{ color: '#fff' }} />
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 参数信息 - 选中参数的详情面板 */}
        {selected && (
          <div style={sectionStyle}>
            <div style={sectionTitle}>参数信息</div>
            <AFlex gap={16}>
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: 6, color: '#333' }}>名称</div>
                <AInput
                  value={selected.name}
                  placeholder="请输入参数名"
                  onChange={e => updateParam(selectedIdx, { name: e.target.value })}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: 6, color: '#333' }}>类型</div>
                <ASelect
                  value={selected.type}
                  style={{ width: '100%' }}
                  options={PARAM_TYPE_OPTIONS}
                  onChange={v => updateParam(selectedIdx, { type: v })}
                />
              </div>
            </AFlex>
            <div style={{ marginTop: 16 }}>
              <div style={{ marginBottom: 6, color: '#333' }}>描述</div>
              <AInput.TextArea
                rows={3}
                value={selected.description}
                placeholder="请输入参数描述信息"
                onChange={e => updateParam(selectedIdx, { description: e.target.value })}
              />
            </div>
            <div style={{ marginTop: 16 }}>
              <div style={{ marginBottom: 6, color: '#333' }}>是否必填</div>
              <AFlex gap={8} align="center">
                <ASwitch
                  checked={!!selected.required}
                  checkedChildren="必"
                  unCheckedChildren="可"
                  onChange={v => updateParam(selectedIdx, { required: v })}
                />
                <span style={{ color: '#888' }}>{selected.required ? '必填' : '可选'}</span>
              </AFlex>
            </div>
            <div style={{ marginTop: 16 }}>
              <div style={{ marginBottom: 6, color: '#333' }}>默认值</div>
              <AInput
                value={selected.defaultValue}
                placeholder="请输入默认值"
                onChange={e => updateParam(selectedIdx, { defaultValue: e.target.value })}
              />
            </div>
          </div>
        )}

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
              <span style={{ color: '#888', fontSize: 12 }}>
                {passthroughAuth ? '认证信息将透明传递' : '使用默认认证方式'}
              </span>
            </AFlex>
          </div>

          {passthroughAuth && (
            <div
              style={{
                marginTop: 16,
                background: '#f7f9fc',
                border: '1px solid #e6ebf5',
                borderRadius: 6,
                padding: 16
              }}
            >
              <div style={{ fontWeight: 600, color: '#495057', marginBottom: 12 }}>认证方案配置</div>
              <AFlex gap={16}>
                <div style={{ flex: 1 }}>
                  <div style={{ marginBottom: 6, color: '#333' }}>
                    <span style={{ color: '#ff4d4f', marginRight: 4 }}>*</span>后端认证方式
                  </div>
                  <ASelect
                    style={{ width: '100%' }}
                    placeholder="请选择认证方案"
                    value={backendSchemeId}
                    options={schemes.filter(s => !!s.id).map(s => ({
                      label: `${s.id} (${s.type})`,
                      value: s.id
                    }))}
                    onChange={setBackendSchemeId}
                    allowClear
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ marginBottom: 6, color: '#333' }}>
                    <span style={{ color: '#ff4d4f', marginRight: 4 }}>*</span>客户端认证方式
                  </div>
                  <ASelect
                    style={{ width: '100%' }}
                    placeholder="请选择认证方案"
                    value={clientSchemeId}
                    options={schemes.filter(s => !!s.id).map(s => ({
                      label: `${s.id} (${s.type})`,
                      value: s.id
                    }))}
                    onChange={setClientSchemeId}
                    allowClear
                  />
                </div>
              </AFlex>
            </div>
          )}
        </div>
      </Form>
    </Modal>
  );
};
