import { CloseOutlined, ToolOutlined, SettingOutlined, CodeOutlined, PlusOutlined, DeleteOutlined, RightOutlined, DownOutlined } from '@ant-design/icons';
import Editor from '@monaco-editor/react';
import { Button, Form, Modal, Tag, Tooltip, message, Input, Select, Switch, Flex } from 'antd';
import { useEffect, useMemo, useState, useCallback } from 'react';

import type { McpToolItem, McpSecurityScheme } from '@/types/plug';

interface CreateToolModalProps {
  readonly open: boolean;
  readonly initial?: McpToolItem | null;
  readonly schemes?: McpSecurityScheme[];
  readonly restToMcpSwitch?: boolean;
  /** 编辑已发布版本：仅 Tool/参数描述与启用开关可改，对齐 nacos onlyEditRuntimeInfo */
  readonly onlyEditRuntimeInfo?: boolean;
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
  children?: ParamRow[];
  /** array items type info */
  itemsType?: string;
}

const PARAM_TYPE_OPTIONS: Array<{ label: string; value: ParamType }> = [
  { label: '字符串类型 (string)', value: 'string' },
  { label: '数字类型 (number)', value: 'number' },
  { label: '整数类型 (integer)', value: 'integer' },
  { label: '布尔类型 (boolean)', value: 'boolean' },
  { label: '对象类型 (object)', value: 'object' },
  { label: '数组类型 (array)', value: 'array' }
];

/** 参数位置模板在参数表为空时的回退参数名，与 nacos 控制台一致 */
const FALLBACK_PARAM_NAMES = ['id', 'name'];

/** args-path 模板：argsPosition 在顶层，第一个参数进 path，其余进 query（对齐 nacos 控制台 generateTemplateByType） */
const buildArgsPositionTpl = (paramNames: string[]): string => {
  const names = paramNames.length > 0 ? paramNames : FALLBACK_PARAM_NAMES;
  const argsPosition: Record<string, string> = {};
  names.forEach((name, index) => {
    argsPosition[name] = index === 0 ? 'path' : 'query';
  });
  return JSON.stringify(
    {
      requestTemplate: { method: 'GET', url: 'https://api.example.com/endpoint', headers: [{ key: 'Authorization', value: 'Bearer your key' }] },
      responseTemplate: { body: '{{.}}' },
      argsPosition
    },
    null,
    2
  );
};

const TEMPLATE_PRESETS: Array<{ key: string; label: string; color: string; tpl: string | ((paramNames: string[]) => string) }> = [
  {
    key: 'json',
    label: 'JSON请求体',
    color: 'blue',
    tpl: JSON.stringify(
      {
        requestTemplate: {
          method: 'POST',
          url: 'https://api.example.com/endpoint',
          headers: [
            { key: 'Content-Type', value: 'application/json' },
            { key: 'Authorization', value: 'Bearer your key' }
          ],
          argsToJsonBody: true
        },
        responseTemplate: { body: '{{.}}' }
      },
      null,
      2
    )
  },
  {
    key: 'url',
    label: 'URL参数',
    color: 'purple',
    tpl: JSON.stringify(
      {
        requestTemplate: {
          method: 'GET',
          url: 'https://api.example.com/endpoint',
          headers: [{ key: 'Authorization', value: 'Bearer your key' }],
          argsToUrlParam: true
        },
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
          url: 'https://api.example.com/endpoint',
          headers: [
            { key: 'Content-Type', value: 'application/x-www-form-urlencoded' },
            { key: 'Authorization', value: 'Bearer your key' }
          ],
          argsToFormBody: true
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
        requestTemplate: {
          method: 'POST',
          url: 'https://api.example.com/endpoint',
          headers: [
            { key: 'Content-Type', value: 'application/json' },
            { key: 'Authorization', value: 'Bearer your key' }
          ],
          body: '{\n  "query": "{{.args.query}}",\n  "limit": {{.args.limit}}\n}'
        },
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
    tpl: buildArgsPositionTpl
  }
];

/* ── 主题色 ── */
const C = {
  primary: '#5b7cf7',
  primaryLight: 'rgba(91, 124, 247, 0.08)',
  primaryBorder: 'rgba(91, 124, 247, 0.2)',
  accent: '#00d4ff',
  border: '#eef0f5',
  bg: '#f8f9fc',
  bgCard: '#ffffff',
  text: '#1a2340',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
  danger: '#ef4444',
  dangerLight: 'rgba(239, 68, 68, 0.08)',
};

/** 描述文本最大展示长度 */
const DESC_MAX_LEN = 28;

/** 截断描述，超长返回截断后文本 */
const truncateDesc = (desc: string | undefined): string => {
  if (!desc) return '';
  return desc.length > DESC_MAX_LEN ? desc.slice(0, DESC_MAX_LEN) + '…' : desc;
};

/**
 * 递归解析 JSON Schema 属性为 ParamRow[]
 * 支持嵌套 object / array 类型
 */
const parseSchemaProperties = (schema: any): ParamRow[] => {
  if (!schema?.properties || typeof schema.properties !== 'object') return [];
  const requiredSet = new Set<string>(Array.isArray(schema.required) ? schema.required : []);
  return Object.entries(schema.properties).map(([name, prop]: [string, any]) => {
    const row: ParamRow = {
      name,
      type: (prop?.type || 'string') as ParamType,
      description: prop?.description || '',
      required: requiredSet.has(name),
      defaultValue: prop?.default !== undefined ? String(prop.default) : '',
    };
    // 递归解析嵌套 object
    if (prop?.type === 'object' && prop?.properties) {
      row.children = parseSchemaProperties({ properties: prop.properties, required: prop.required });
    }
    // 递归解析 array items
    if (prop?.type === 'array' && prop?.items) {
      const items = prop.items;
      row.itemsType = items.type || 'unknown';
      if (items.type === 'object' && items.properties) {
        row.children = parseSchemaProperties({ properties: items.properties, required: items.required });
      }
    }
    return row;
  });
};

/**
 * 将 ParamRow[] 序列化回 JSON Schema properties + required
 */
const serializeParams = (params: ParamRow[]): { properties: Record<string, any>; required: string[] } => {
  const properties: Record<string, any> = {};
  const required: string[] = [];
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
    // 递归序列化子节点
    if (p.type === 'object' && p.children && p.children.length > 0) {
      const nested = serializeParams(p.children);
      item.properties = nested.properties;
      if (nested.required.length > 0) item.required = nested.required;
    }
    if (p.type === 'array') {
      if (p.children && p.children.length > 0) {
        const nested = serializeParams(p.children);
        item.items = { type: 'object', properties: nested.properties };
        if (nested.required.length > 0) item.items.required = nested.required;
      } else {
        item.items = { type: p.itemsType || 'string' };
      }
    }
    properties[p.name] = item;
    if (p.required) required.push(p.name);
  });
  return { properties, required };
};

/**
 * 使用路径字符串定位嵌套参数
 * path 格式: "0" 或 "0.children.2" 或 "0.children.1.children.0"
 */
const getParamByPath = (params: ParamRow[], path: string): ParamRow | null => {
  const parts = path.split('.');
  let current: ParamRow[] = params;
  let node: ParamRow | null = null;
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === 'children') continue;
    const idx = parseInt(parts[i], 10);
    if (isNaN(idx) || !current[idx]) return null;
    node = current[idx];
    if (i < parts.length - 1 && parts[i + 1] === 'children') {
      current = node.children || [];
      i++; // skip 'children'
    }
  }
  return node;
};

const updateParamByPath = (params: ParamRow[], path: string, patch: Partial<ParamRow>): ParamRow[] => {
  const parts = path.split('.');
  const result = [...params];
  let current = result;
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === 'children') continue;
    const idx = parseInt(parts[i], 10);
    if (isNaN(idx) || !current[idx]) return params;
    if (i === parts.length - 1 || (i < parts.length - 2 && parts[i + 1] !== 'children')) {
      // 最后一个索引 或 下一个不是 children
      current[idx] = { ...current[idx], ...patch };
      return result;
    }
    // 中间节点，需要深层复制
    current[idx] = { ...current[idx], children: [...(current[idx].children || [])] };
    current = current[idx].children!;
    i++; // skip 'children'
  }
  return result;
};

const removeParamByPath = (params: ParamRow[], path: string): ParamRow[] => {
  const parts = path.split('.');
  const result = [...params];
  let current = result;
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === 'children') continue;
    const idx = parseInt(parts[i], 10);
    if (isNaN(idx)) return params;
    if (i === parts.length - 1 || (i < parts.length - 2 && parts[i + 1] !== 'children')) {
      current.splice(idx, 1);
      return result;
    }
    current[idx] = { ...current[idx], children: [...(current[idx].children || [])] };
    current = current[idx].children!;
    i++;
  }
  return result;
};

const addChildParamByPath = (params: ParamRow[], parentPath: string, childCount: number): ParamRow[] => {
  const parts = parentPath.split('.');
  const result = [...params];
  let current = result;
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === 'children') continue;
    const idx = parseInt(parts[i], 10);
    if (isNaN(idx)) return params;
    if (i === parts.length - 1 || (i < parts.length - 2 && parts[i + 1] !== 'children')) {
      const node = { ...current[idx] };
      node.children = [...(node.children || [])];
      node.children.push({
        name: `child_${childCount}`,
        type: 'string' as ParamType,
        description: '',
        required: false,
        defaultValue: '',
      });
      current[idx] = node;
      return result;
    }
    current[idx] = { ...current[idx], children: [...(current[idx].children || [])] };
    current = current[idx].children!;
    i++;
  }
  return result;
};

/* ── 递归树节点组件 ── */
const TreeNode = ({
  param,
  path,
  depth,
  selectedPath,
  onSelect,
  onRemove,
  onAddChild,
  expandedPaths,
  onToggleExpand,
  readOnly,
}: {
  param: ParamRow;
  path: string;
  depth: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  onRemove: (path: string) => void;
  onAddChild: (path: string) => void;
  expandedPaths: Set<string>;
  onToggleExpand: (path: string) => void;
  readOnly?: boolean;
}) => {
  const isSelected = path === selectedPath;
  const hasChildren = (param.type === 'object' || param.type === 'array') && param.children && param.children.length > 0;
  const canHaveChildren = param.type === 'object' || param.type === 'array';
  const isExpanded = expandedPaths.has(path);

  const typeLabel = param.type === 'array' && param.itemsType && param.itemsType !== 'object'
    ? `array<${param.itemsType}>`
    : param.type === 'array' && hasChildren
    ? `array<object>`
    : param.type;

  return (
    <div>
      {/* 当前节点 */}
      <div
        onClick={() => onSelect(path)}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '5px 10px', marginBottom: 3, borderRadius: 6,
          cursor: 'pointer',
          background: isSelected ? C.primaryLight : 'transparent',
          border: `1px solid ${isSelected ? C.primaryBorder : 'transparent'}`,
          transition: 'all 0.2s',
          paddingLeft: 10 + depth * 18,
        }}
      >
        {/* 展开/折叠按钮 */}
        {canHaveChildren ? (
          <span
            onClick={(e) => { e.stopPropagation(); onToggleExpand(path); }}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 16, height: 16, borderRadius: 3, fontSize: 10,
              color: C.primary, cursor: 'pointer', flexShrink: 0,
            }}
          >
            {isExpanded ? <DownOutlined /> : <RightOutlined />}
          </span>
        ) : (
          <span style={{ width: 16, flexShrink: 0 }} />
        )}

        {/* 名称 */}
        <span style={{ color: isSelected ? C.primary : C.text, fontWeight: 500, fontSize: 13, minWidth: 80, flexShrink: 0 }}>
          {param.name || '(未命名)'}
        </span>

        {/* 类型标签 */}
        <Tag style={{ marginLeft: 4, fontSize: 11, border: `1px solid ${C.border}`, color: C.textSecondary, background: 'transparent', flexShrink: 0 }}>
          {typeLabel}
        </Tag>

        {/* 必填标签 */}
        {param.required && (
          <Tag style={{ fontSize: 11, border: `1px solid rgba(239,68,68,0.2)`, color: C.danger, background: C.dangerLight, flexShrink: 0 }}>
            必填
          </Tag>
        )}

        {/* 描述列 - 长度限制 + 悬浮提示 */}
        <div style={{ flex: 1, minWidth: 0, marginLeft: 8 }}>
          {param.description ? (
            <Tooltip title={param.description} placement="topLeft">
              <span style={{
                color: C.textMuted, fontSize: 12, lineHeight: '22px',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                display: 'block',
              }}>
                {truncateDesc(param.description)}
              </span>
            </Tooltip>
          ) : (
            <span style={{ color: C.textMuted, fontSize: 12, fontStyle: 'italic' }}>—</span>
          )}
        </div>

        {/* 操作按钮 */}
        <Flex gap={2} style={{ flexShrink: 0, marginLeft: 4 }}>
          {canHaveChildren && !readOnly && (
            <span
              onClick={(e) => { e.stopPropagation(); onAddChild(path); }}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 20, height: 20, borderRadius: 4, cursor: 'pointer',
                color: C.primary, fontSize: 11, transition: 'all 0.2s',
                background: isSelected ? C.primaryLight : 'transparent',
              }}
              title="添加子参数"
            >
              <PlusOutlined />
            </span>
          )}
          {isSelected && !readOnly && (
            <span
              onClick={e => { e.stopPropagation(); onRemove(path); }}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 20, height: 20, borderRadius: 4, cursor: 'pointer',
                background: C.danger, color: '#fff', fontSize: 11, transition: 'all 0.2s',
              }}
              title="删除参数"
            >
              <DeleteOutlined />
            </span>
          )}
        </Flex>
      </div>

      {/* 子节点 */}
      {canHaveChildren && isExpanded && param.children && param.children.length > 0 && (
        <div style={{ borderLeft: `1px dashed ${C.primaryBorder}`, marginLeft: 18 + depth * 18 }}>
          {param.children.map((child, childIdx) => (
            <TreeNode
              key={childIdx}
              param={child}
              path={`${path}.children.${childIdx}`}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
              onRemove={onRemove}
              onAddChild={onAddChild}
              expandedPaths={expandedPaths}
              onToggleExpand={onToggleExpand}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const CreateToolModal = ({ open, initial, restToMcpSwitch = false, onlyEditRuntimeInfo = false, onClose, onOk }: CreateToolModalProps) => {
  const [form] = Form.useForm();
  const [params, setParams] = useState<ParamRow[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [rootExpanded, setRootExpanded] = useState<boolean>(true);
  const [protocolTpl, setProtocolTpl] = useState('');

  /** 累计子参数计数器（用于命名） */
  const childCounter = useMemo(() => {
    const count = (rows: ParamRow[]): number => rows.reduce((acc, r) => acc + 1 + (r.children ? count(r.children) : 0), 0);
    return count(params);
  }, [params]);

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      name: initial?.name || '',
      description: initial?.description || '',
      enabled: initial?.enabled ?? true
    });
    const initParams = parseSchemaProperties(initial?.inputSchema);
    setParams(initParams);
    // 参数详情默认关闭，由用户点击参数行打开
    setSelectedPath(null);
    setRootExpanded(true);
    setProtocolTpl(initial?.protocolTemplate || '');
    // 默认展开第一层有子节点的参数
    const initialExpanded = new Set<string>();
    initParams.forEach((p, i) => {
      if (p.children && p.children.length > 0) {
        initialExpanded.add(String(i));
      }
    });
    setExpandedPaths(initialExpanded);
  }, [open, initial, form]);

  const addParam = () => {
    setParams(prev => {
      const next = [...prev, { name: `NewArg${prev.length + 1}`, type: 'string' as ParamType, description: '', required: false, defaultValue: '' }];
      return next;
    });
    setRootExpanded(true);
  };

  const handleRemoveParam = useCallback((path: string) => {
    setParams(prev => removeParamByPath(prev, path));
    // 选中有子节点的 object/array 类型的参数时不应被删除
    setSelectedPath(prev => {
      if (prev === path) return null;
      return prev;
    });
  }, []);

  const handleAddChild = useCallback((parentPath: string) => {
    setParams(prev => addChildParamByPath(prev, parentPath, childCounter));
    setExpandedPaths(prev => new Set([...prev, parentPath]));
  }, [childCounter]);

  const handleToggleExpand = useCallback((path: string) => {
    setExpandedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const updateParam = useCallback((path: string, patch: Partial<ParamRow>) => {
    setParams(prev => updateParamByPath(prev, path, patch));
  }, []);

  const selected = useMemo<ParamRow | null>(() => {
    if (!selectedPath) return null;
    return getParamByPath(params, selectedPath);
  }, [params, selectedPath]);

  /** 统计总参数数（含嵌套） */
  const totalCount = useMemo(() => {
    const count = (rows: ParamRow[]): number => rows.reduce((acc, r) => acc + 1 + (r.children ? count(r.children) : 0), 0);
    return count(params);
  }, [params]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      // HTTP 转 MCP 模式时校验协议转化配置
      if (restToMcpSwitch && protocolTpl.trim()) {
        try {
          const parsed = JSON.parse(protocolTpl);
          if (!parsed.requestTemplate) {
            message.error('协议转化配置缺少 requestTemplate 字段');
            return;
          }
        } catch {
          message.error('协议转化配置 JSON 格式不正确');
          return;
        }
      }
      const { properties, required: requiredList } = serializeParams(params);
      const tool: McpToolItem = {
        name: values.name,
        description: values.description,
        enabled: values.enabled,
        inputSchema: {
          type: 'object',
          properties,
          ...(requiredList.length > 0 ? { required: requiredList } : {})
        },
        ...(restToMcpSwitch && protocolTpl.trim() ? { protocolTemplate: protocolTpl } : {}),
      };
      onOk(tool);
    } catch (err) {
      console.error('CreateToolModal validation failed', err);
    }
  };

  /* ── 样式常量 ── */
  const sectionStyle: React.CSSProperties = {
    background: C.bgCard,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: 20,
    marginBottom: 16,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  };

  const sectionTitle = (icon: React.ReactNode, title: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 12, marginBottom: 16, borderBottom: `1px solid ${C.border}` }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 28, height: 28, borderRadius: 7,
        background: `linear-gradient(135deg, ${C.primaryLight}, rgba(0, 212, 255, 0.06))`,
        color: C.primary, fontSize: 14,
      }}>
        {icon}
      </span>
      <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{title}</span>
    </div>
  );

  const labelStyle: React.CSSProperties = {
    display: 'block',
    color: C.textSecondary,
    fontSize: 12,
    fontWeight: 500,
    marginBottom: 6,
  };

  return (
    <Modal
      open={open}
      title={
        <Flex align="center" gap={8}>
          <ToolOutlined style={{ color: C.primary, fontSize: 16 }} />
          <span style={{ fontWeight: 600, fontSize: 16 }}>
            {initial ? '编辑工具' : '创建工具'}
          </span>
        </Flex>
      }
      width={820}
      onCancel={onClose}
      onOk={handleOk}
      okText="确定"
      cancelText="取消"
      closeIcon={<CloseOutlined />}
      styles={{
        body: { maxHeight: '72vh', overflow: 'auto', padding: '20px 24px', background: C.bg },
        header: { borderBottom: `1px solid ${C.border}` },
      }}
      okButtonProps={{ className: 'btn-accent-gradient', style: { border: 'none', fontWeight: 600 } }}
    >
      <Form form={form} layout="vertical">
        {/* ── 基础信息 ── */}
        <div style={sectionStyle}>
          {sectionTitle(<SettingOutlined />, '基础信息')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}><span style={{ color: C.danger, marginRight: 4 }}>*</span>Tool 名称</label>
              <Form.Item name="name" noStyle rules={[{ message: '请输入 Tool 名称', required: true }]}>
                {/* 编辑模式锁定名称，对齐 nacos BasicInfo 名称 isPreview */}
                <Input placeholder="请输入工具名称" disabled={!!initial} />
              </Form.Item>
            </div>
            <div>
              <label style={labelStyle}>是否启用</label>
              <Form.Item name="enabled" valuePropName="checked" noStyle required>
                <Switch checkedChildren="启用" unCheckedChildren="禁用" />
              </Form.Item>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={labelStyle}><span style={{ color: C.danger, marginRight: 4 }}>*</span>Tool 描述</label>
            <Form.Item name="description" noStyle rules={[{ message: '请输入 Tool 描述', required: true }]}>
              <Input.TextArea rows={4} placeholder="请描述该工具的功能用途" />
            </Form.Item>
          </div>
        </div>

        {/* ── 参数结构 ── */}
        <div style={sectionStyle}>
          {sectionTitle(<CodeOutlined />, '参数结构')}
          <div style={{
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: 16,
          }}>
            {onlyEditRuntimeInfo ? (
              <div style={{ background: '#fff7e6', border: '1px solid #ffd591', color: '#fa8c16', fontSize: 12, padding: '6px 12px', borderRadius: 6, marginBottom: 16 }}>
                当前正在修改已发布的版本，只能修改Tool以及参数的描述信息以及开关
              </div>
            ) : (
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={addParam}
                block
                style={{ marginBottom: 16, borderColor: C.primaryBorder, color: C.primary }}
              >
                添加参数
              </Button>
            )}

            {/* 列头 */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '4px 10px 8px', fontSize: 11, color: C.textMuted, fontWeight: 500,
            }}>
              <span style={{ width: 16, flexShrink: 0 }} />
              <span style={{ minWidth: 80, flexShrink: 0 }}>名称</span>
              <span style={{ width: 80, flexShrink: 0, marginLeft: 4 }}>类型</span>
              <span style={{ width: 40, flexShrink: 0 }}>必填</span>
              <span style={{ flex: 1, marginLeft: 8 }}>描述</span>
              <span style={{ width: 44, flexShrink: 0, textAlign: 'center' }}>操作</span>
            </div>

            {/* 根节点 */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '4px 10px', marginBottom: 2 }}>
              <span
                onClick={() => setRootExpanded(e => !e)}
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 16, height: 16, borderRadius: 3, fontSize: 10,
                  color: C.primary, cursor: 'pointer', flexShrink: 0,
                }}
              >
                {rootExpanded ? <DownOutlined /> : <RightOutlined />}
              </span>
              <span style={{ color: C.primary, fontWeight: 600, cursor: 'pointer', fontSize: 13, marginLeft: 4 }}>参数列表</span>
              <Tag style={{ marginLeft: 8, fontSize: 11, border: `1px solid ${C.primaryBorder}`, color: C.primary, background: C.primaryLight }}>object</Tag>
              {totalCount > 0 && (
                <span style={{ marginLeft: 'auto', color: C.textMuted, fontSize: 12 }}>
                  共 {totalCount} 个参数
                </span>
              )}
            </div>

            {/* 子节点列表 */}
            {rootExpanded && (
              <div style={{ borderLeft: `1px dashed ${C.primaryBorder}`, marginLeft: 18 }}>
                {params.length === 0 && (
                  <div style={{ color: C.textMuted, fontSize: 12, padding: '12px 0 8px 14px' }}>暂无参数，点击「添加参数」新增</div>
                )}
                {params.map((p, idx) => (
                  <TreeNode
                    key={idx}
                    param={p}
                    path={String(idx)}
                    depth={0}
                    selectedPath={selectedPath}
                    // 点击已选中参数时取消选中，关闭参数详情
                    onSelect={p => setSelectedPath(prev => (prev === p ? null : p))}
                    onRemove={handleRemoveParam}
                    onAddChild={handleAddChild}
                    expandedPaths={expandedPaths}
                    onToggleExpand={handleToggleExpand}
                    readOnly={onlyEditRuntimeInfo}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── 参数详情 ── */}
        {selected && selectedPath && (
          <div style={sectionStyle}>
            {sectionTitle(<SettingOutlined />, `参数详情 — ${selected.name}`)}
            <Flex gap={16}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>名称</label>
                <Input
                  value={selected.name}
                  placeholder="请输入参数名"
                  disabled={onlyEditRuntimeInfo}
                  onChange={e => updateParam(selectedPath, { name: e.target.value })}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>类型</label>
                <Select
                  value={selected.type}
                  style={{ width: '100%' }}
                  options={PARAM_TYPE_OPTIONS}
                  disabled={onlyEditRuntimeInfo}
                  onChange={v => {
                    const patch: Partial<ParamRow> = { type: v };
                    // 切换到 object/array 时初始化 children
                    if ((v === 'object' || v === 'array') && !selected.children) {
                      patch.children = [];
                    }
                    updateParam(selectedPath, patch);
                  }}
                />
              </div>
            </Flex>
            <div style={{ marginTop: 14 }}>
              <label style={labelStyle}>描述</label>
              <Input.TextArea
                rows={4}
                value={selected.description}
                placeholder="请输入参数描述信息"
                onChange={e => updateParam(selectedPath, { description: e.target.value })}
              />
            </div>
            <Flex gap={16} style={{ marginTop: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>是否必填</label>
                <Flex gap={8} align="center">
                  <Switch
                    checked={!!selected.required}
                    checkedChildren="必填"
                    unCheckedChildren="可选"
                    disabled={onlyEditRuntimeInfo}
                    onChange={v => updateParam(selectedPath, { required: v })}
                  />
                  <span style={{ color: C.textSecondary, fontSize: 12 }}>{selected.required ? '必填' : '可选'}</span>
                </Flex>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>默认值</label>
                <Input
                  value={selected.defaultValue}
                  placeholder="请输入默认值"
                  onChange={e => updateParam(selectedPath, { defaultValue: e.target.value })}
                />
              </div>
            </Flex>
          </div>
        )}

        {/* ── 高级配置（仅 HTTP 转 MCP 模式展示） ── */}
        {restToMcpSwitch && (
          <div style={sectionStyle}>
            {sectionTitle(<CodeOutlined />, '高级配置')}
            
            <div style={{ fontWeight: 600, color: C.text, marginBottom: 8, fontSize: 13 }}>协议转化配置</div>
            <div style={{
              background: C.bg,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: 16,
            }}>
              {!onlyEditRuntimeInfo && (
                <>
                  <div style={{ color: C.textSecondary, fontSize: 12, marginBottom: 10 }}>
                    配置模板生成器 — 点击快速生成对应类型的配置模板
                  </div>
                  <Flex gap={8} wrap="wrap" style={{ marginBottom: 12 }}>
                    {TEMPLATE_PRESETS.map(preset => (
                      <Tag.CheckableTag
                        key={preset.key}
                        checked={false}
                        onChange={() => setProtocolTpl(typeof preset.tpl === 'function' ? preset.tpl(params.map(p => p.name)) : preset.tpl)}
                        style={{
                          padding: '3px 12px',
                          border: `1px solid ${C.primaryBorder}`,
                          borderRadius: 6,
                          background: 'transparent',
                          transition: 'all 0.2s',
                        }}
                      >
                        <span style={{ color: C.primary, fontSize: 12, fontWeight: 500 }}>{preset.label}</span>
                      </Tag.CheckableTag>
                    ))}
                  </Flex>
                  <div style={{ color: C.textMuted, fontSize: 11, marginBottom: 4 }}>
                    💡 包含完整的请求和响应配置；参数位置模式通过 argsPosition 指定每个参数在请求中的位置
                  </div>
                </>
              )}
              {onlyEditRuntimeInfo ? (
                <div
                  style={{
                    background: '#f6f7f9',
                    border: '1px solid #dcdee3',
                    borderRadius: 8,
                    padding: 16,
                    fontSize: 13,
                    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    maxHeight: 400,
                    overflow: 'auto',
                    marginTop: 8,
                  }}
                >
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(protocolTpl), null, 2);
                    } catch {
                      return protocolTpl;
                    }
                  })()}
                </div>
              ) : (
                <div style={{ border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden', marginTop: 8 }}>
                  <Editor
                    height="200px"
                    defaultLanguage="json"
                    value={protocolTpl}
                    onChange={v => setProtocolTpl(v || '')}
                    options={{ minimap: { enabled: false }, fontSize: 13, lineNumbers: 'on', scrollBeyondLastLine: false }}
                  />
                </div>
              )}
              <div style={{ color: C.textMuted, fontSize: 11, marginTop: 8 }}>
                通过网关提供的协议转换模版进行协议转化，详见{' '}
                <a href="https://nacos.io/docs/v3.0/manual/user/mcp-template" target="_blank" rel="noreferrer" style={{ color: C.primary }}>
                  文档链接
                </a>
              </div>
            </div>
          </div>
        )}
      </Form>
    </Modal>
  );
};
