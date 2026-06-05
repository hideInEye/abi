import Editor from '@monaco-editor/react';
import {
  ExclamationCircleFilled,
  MinusCircleOutlined,
  PlusOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { App, Button, Checkbox, Divider, Drawer, Form, Input, Select, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useRef, useState } from 'react';

// import PageTitle from '@/components/stateless/common/PageTitle';
import type { CreateToolParams, ToolItem, UpdateToolParams } from '@/service/api/tool';
import {
  createToolApi,
  deleteToolApi,
  generateSchemaApi,
  getToolDetailApi,
  queryToolListApi,
  updateToolApi
} from '@/service/api/tool';

/** Monaco 代码编辑器适配 Form.Item value/onChange */
interface CodeEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  language?: string;
  height?: string | number;
}
/** 计算 Monaco Editor 的自适应高度（内容少时不出现内部滚动条） */
function calcEditorHeight(content: string | undefined, maxHeight: string | number): number {
  const lineCount = (content || '').split('\n').length;
  const LINE_HEIGHT = 19;
  const MIN_HEIGHT = 120;
  const PADDING = 24;
  const maxH = typeof maxHeight === 'string' ? parseInt(maxHeight, 10) || 300 : maxHeight;
  return Math.max(MIN_HEIGHT, Math.min(maxH, lineCount * LINE_HEIGHT + PADDING));
}

function CodeEditor({ value, onChange, language = 'plaintext', height = '300px' }: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasScrollbarRef = useRef(false);

  // 根据内容行数自适应高度，避免没几行代码也出现内部滚动条
  const editorHeight =
    typeof height === 'string' && height.endsWith('px')
      ? calcEditorHeight(value, height)
      : height;

  const contentHeight = (value || '').split('\n').length * 19 + 24;
  const containerHeight = typeof editorHeight === 'string' ? parseInt(editorHeight, 10) || 120 : editorHeight;
  const hasScrollbar = contentHeight > containerHeight;

  useEffect(() => {
    // Monaco Editor 内部会阻止滚轮事件冒泡，导致页面滚不动。
    // 当编辑器内部没有滚动条时，在捕获阶段拦截事件，不让它到达 Monaco Editor，
    // 浏览器就会自己滚动父容器。
    const el = containerRef.current;
    if (!el) return;

    // 用 ref 记录上一次的 hasScrollbar，只在变化时操作事件监听
    if (hasScrollbarRef.current === hasScrollbar) return;
    hasScrollbarRef.current = hasScrollbar;

    if (hasScrollbar) return;

    const handleWheel = (e: WheelEvent) => {
      e.stopImmediatePropagation();
    };

    el.addEventListener('wheel', handleWheel, { passive: true, capture: true });
    return () => el.removeEventListener('wheel', handleWheel, { capture: true });
  }, [hasScrollbar]);

  return (
    <div
      ref={containerRef}
      style={{
        border: '1px solid #d9d9d9',
        borderRadius: 6,
        overflow: 'hidden'
      }}
    >
      <Editor
        height={editorHeight}
        language={language}
        value={value ?? ''}
        onChange={v => onChange?.(v ?? '')}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          scrollbar: {
            alwaysConsumeMouseWheel: false
          }
        }}
      />
    </div>
  );
}

// JSON 自动格式化
function formatJsonString(raw: string | undefined): string {
  if (!raw || !raw.trim()) return '';
  try {
    const obj = JSON.parse(raw);
    return JSON.stringify(obj, null, 2);
  } catch {
    return raw;
  }
}

export function Component() {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();

  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | '0' | '1'>('ALL');
  const [list, setList] = useState<ToolItem[]>([]);
  const [loading, setLoading] = useState(false);

  // 弹窗状态
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<ToolItem | null>(null);
  const [saving, setSaving] = useState(false);

  // 生成 Schema 加载状态
  const [generating, setGenerating] = useState(false);

// 表格横向滚动配置（常量，避免每次渲染创建新对象）
const TABLE_SCROLL = { x: 'max-content' };

  async function fetchList() {
    setLoading(true);
    try {
      const res: any = await queryToolListApi({});
      const rows =
        res?.response?.data?.data ||
        res?.data?.data ||
        res?.data ||
        [];
      setList(Array.isArray(rows) ? rows : []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchList();
  }, []);

  const filteredList = useMemo(() => {
    let arr = list;

    // 状态筛选
    if (statusFilter !== 'ALL') {
      arr = arr.filter(it => String(it.status ?? '') === statusFilter);
    }

    // 关键字模糊匹配
    const kw = keyword.trim().toLowerCase();
    if (kw) {
      arr = arr.filter(
        it =>
          (it.toolName || '').toLowerCase().includes(kw) ||
          (it.toolLabel || '').toLowerCase().includes(kw)
      );
    }

    return arr;
  }, [list, statusFilter, keyword]);

  function handleAdd() {
    setEditingTool(null);
    form.resetFields();
    form.setFieldsValue({ status: '0' });
    setModalOpen(true);
  }


  async function handleEdit(record: ToolItem) {
    setModalOpen(true);
    setEditingTool(record);
    // 先用列表数据预填充，避免空白闪烁
    form.setFieldsValue({
      toolName: record.toolName,
      toolLabel: record.toolLabel,
      description: record.description,
      status: record.status ?? '0'
    });
    // 调用详情接口获取完整数据后回填
    try {
      const res: any = await getToolDetailApi({ toolId: record.toolId });
      const detail: ToolItem =
        res?.response?.data?.data || res?.data?.data || res?.data || res;
      if (detail) {
        setEditingTool(detail);
        form.setFieldsValue({
          toolName: detail.toolName,
          toolLabel: detail.toolLabel,
          description: detail.description,
          status: detail.status ?? '0',
          scriptContent: detail.scriptContent,
          startupParams: detail.startupParams,
          inputSchema: formatJsonString(detail.inputSchema)
        });
      }
    } catch {
      message.error('获取工具详情失败');
    }
  }

  function handleDelete(record: ToolItem) {
    modal.confirm({
      title: '确认删除',
      content: `确定要删除工具「${record.toolName}」吗？删除后不可恢复。`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteToolApi({ toolId: record.toolId });
          message.success('删除成功');
          fetchList();
        } catch {
          message.error('删除失败');
        }
      }
    });
  }

  async function handleGenerateSchema() {
    try {
      const values = await form.validateFields([
        'schemaName',
        'schemaDescription',
        'schemaParams'
      ]);
      setGenerating(true);
      const res: any = await generateSchemaApi({
        name: values.schemaName,
        description: values.schemaDescription || '',
        param: (values.schemaParams || []).map((p: any) => ({
          paramName: p.paramName,
          paramType: p.paramType,
          paramDescription: p.paramDescription || '',
          required: !!p.required
        }))
      });
      if (res?.response?.data?.code === 200 || res?.data?.code === 200) {
        message.success('生成成功');
        const schemaData = res?.response?.data?.data || res?.data?.data;
        let formatted = '';
        if (schemaData) {
          try {
            const obj = typeof schemaData === 'string' ? JSON.parse(schemaData) : schemaData;
            formatted = JSON.stringify(obj, null, 2);
          } catch {
            formatted = String(schemaData);
          }
        }
        form.setFieldsValue({ inputSchema: formatted });
      } else {
        message.error(res?.response?.data?.msg || '生成失败');
      }
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.message || '生成失败');
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const baseParams = {
        toolName: values.toolName,
        toolLabel: values.toolLabel,
        description: values.description,
        status: values.status,
        scriptContent: values.scriptContent,
        startupParams: values.startupParams,
        inputSchema: values.inputSchema,
        outputSchema: ''
      };

      if (editingTool) {
        await updateToolApi({ ...baseParams, toolId: editingTool.toolId });
        message.success('保存成功');
      } else {
        await createToolApi(baseParams);
        message.success('新增成功');
      }

      setModalOpen(false);
      fetchList();
    } catch (err: any) {
      if (err?.errorFields) return; // 表单校验失败
      message.error(editingTool ? '保存失败' : '新增失败');
    } finally {
      setSaving(false);
    }
  }

  const columns: ColumnsType<ToolItem> = useMemo(
    () => [
      {
        title: '工具名称',
        dataIndex: 'toolName',
        key: 'toolName',
        align: 'center',
        minWidth: 140
      },
      {
        title: '标签',
        dataIndex: 'toolLabel',
        key: 'toolLabel',
        align: 'center',
        minWidth: 100,
        render: (text: string) => (text ? <Tag color="blue">{text}</Tag> : '-')
      },
      {
        title: '功能描述',
        dataIndex: 'description',
        key: 'description',
        align: 'center',
        minWidth: 160,
        ellipsis: true,
        render: (text: string) => text || '-'
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        align: 'center',
        minWidth: 80,
        render: (status: string) =>
          String(status) === '0' ? (
            <Tag color="success">启用</Tag>
          ) : (
            <Tag color="default">禁用</Tag>
          )
      },
      {
        title: '创建时间',
        dataIndex: 'createTime',
        key: 'createTime',
        align: 'center',
        minWidth: 160,
        render: (t: string) => (t ? t.replace('T', ' ') : '-')
      },
      {
        title: '操作',
        key: 'action',
        align: 'center',
        width: 120,
        fixed: 'right',
        render: (_, record) => (
          <div className="flex items-center justify-center gap-12px">
            <Button color="primary" size="small" variant="link" onClick={() => handleEdit(record)}>编辑</Button>
            <Button color="danger" size="small" variant="link" onClick={() => handleDelete(record)}>删除</Button>
          </div>
        )
      }
    ],
    []
  );

  // 参数类型选项
  const paramTypeOptions = useMemo(
    () => [
      { value: 'string', label: 'string' },
      { value: 'number', label: 'number' },
      { value: 'integer', label: 'integer' },
      { value: 'boolean', label: 'boolean' },
      { value: 'array', label: 'array' },
      { value: 'dict', label: 'dict' }
    ],
    []
  );

  // 英文+下划线校验规则
  const nameValidator = useCallback((_: any, value: string) => {
    if (!value) return Promise.resolve();
    if (!/^[a-zA-Z_]+$/.test(value)) {
      return Promise.reject(new Error('只能输入英文字母和下划线，不能包含数字、中文或特殊符号'));
    }
    return Promise.resolve();
  }, []);

  return (
    <div
      className="flex flex-col gap-2 p-6"
      style={{ height: '100%', minHeight: 0, overflow: 'hidden' }}
    >
      <div className="flex items-center gap-4">
        <Input
          allowClear
          placeholder="搜索工具名称或标签"
          prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          style={{ width: '12rem' }}
        />
        <Select
          style={{ width: 80 }}
          placeholder="状态"
          value={statusFilter}
          onChange={v => setStatusFilter(v)}
          options={[
            { value: 'ALL', label: '全部' },
            { value: '0', label: '启用' },
            { value: '1', label: '禁用' }
          ]}
        />
        <Button className="ml-auto" type="primary" onClick={handleAdd}>
          新增
        </Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <div
          style={{
            border: '0.0625rem solid #d9d9d9',
            borderRadius: '0.5rem',
            overflow: 'hidden',
            width: '100%',
            maxHeight: '100%'
          }}
        >
          <div style={{ overflow: 'auto', maxHeight: '100%' }}>
            <Table<ToolItem>
              rowKey="toolId"
              columns={columns}
              dataSource={filteredList}
              loading={loading}
              pagination={false}
              size="middle"
              className="tools-table abi-std-table"
              scroll={list.length > 0 ? TABLE_SCROLL : undefined}
            />
          </div>
        </div>
      </div>

      {/* 新增/编辑抽屛 */}
      <Drawer
        title={editingTool ? '编辑内置工具' : '新增内置工具'}
        open={modalOpen}
        width={1200}
        destroyOnClose
        onClose={() => setModalOpen(false)}
        footer={
          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalOpen(false)}>取消</Button>
              <Button type="primary" loading={saving} onClick={handleSave}>
                保存
              </Button>
            </Space>
          </div>
        }
      >
        <Form form={form} layout="vertical" preserve={false}>
          <div style={{ display: 'flex', gap: 24, height: 'calc(100vh - 180px)' }}>
            {/* 左侧：基础信息 + 输入参数配置 */}
            <div
              style={{
                width: 520,
                minWidth: 520,
                overflow: 'auto',
                paddingRight: 16,
                borderRight: '2px solid #d9d9d9'
              }}
            >
              <Form.Item
                label="工具名称"
                name="toolName"
                rules={[{ required: true, message: '请输入工具名称' }]}
              >
                <Input placeholder="如：builtin_increment" />
              </Form.Item>

              <Form.Item
                label="标签"
                name="toolLabel"
                rules={[{ required: true, message: '请输入工具标签' }]}
              >
                <Input placeholder="如：计算器" />
              </Form.Item>

              <Form.Item label="功能描述" name="description">
                <Input.TextArea rows={2} placeholder="请输入功能描述" />
              </Form.Item>

              <Form.Item label="状态" name="status">
                <Select style={{ width: 160 }}>
                  <Select.Option value="0">启用</Select.Option>
                  <Select.Option value="1">禁用</Select.Option>
                </Select>
              </Form.Item>

              {/* 输入参数配置 */}
              <Divider orientation="left" style={{ fontWeight: 500 }}>
                输入参数配置
              </Divider>
              <Form.Item
                label="函数名称"
                name="schemaName"
                rules={[{ validator: nameValidator }]}
              >
                <Input placeholder="如：get_current_date" />
              </Form.Item>
              <Form.Item label="函数描述" name="schemaDescription">
                <Input.TextArea rows={2} placeholder="请输入函数描述" />
              </Form.Item>

              <div style={{ marginBottom: 8, fontWeight: 500 }}>参数列表</div>
              <Form.List
                name="schemaParams"
                rules={[
                  {
                    validator: (_, values) => {
                      const names = (values || []).map((v: any) => v?.paramName).filter(Boolean);
                      const dup = names.find((n: string, i: number) => names.indexOf(n) !== i);
                      if (dup) return Promise.reject(new Error(`参数名字「${dup}」重复，请修改`));
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                {(fields, { add, remove }) => (
                  <div className="flex flex-col gap-8px">
                    {fields.map(({ key, name, ...restField }) => (
                      <div
                        key={key}
                        style={{
                          display: 'flex',
                          gap: 8,
                          alignItems: 'flex-start',
                          padding: 8,
                          border: '1px solid #f0f0f0',
                          borderRadius: 6,
                          background: '#fafafa'
                        }}
                      >
                        <Form.Item
                          {...restField}
                          name={[name, 'paramName']}
                          rules={[
                            { validator: nameValidator },
                            {
                              validator: (_, value) => {
                                if (!value) return Promise.resolve();
                                const allParams: { paramName?: string }[] = form.getFieldValue('schemaParams') || [];
                                const count = allParams.filter(p => p?.paramName === value).length;
                                if (count > 1) return Promise.reject(new Error('参数名字重复'));
                                return Promise.resolve();
                              }
                            }
                          ]}
                          style={{ flex: 1, marginBottom: 0 }}
                        >
                          <Input placeholder="参数名字" />
                        </Form.Item>
                        <Form.Item
                          {...restField}
                          name={[name, 'paramType']}
                          style={{ flex: 1, marginBottom: 0 }}
                        >
                          <Select placeholder="参数类型" options={paramTypeOptions} />
                        </Form.Item>
                        <Form.Item
                          {...restField}
                          name={[name, 'paramDescription']}
                          style={{ flex: 2, marginBottom: 0 }}
                        >
                          <Input placeholder="参数描述" />
                        </Form.Item>
                        <Form.Item
                          {...restField}
                          name={[name, 'required']}
                          valuePropName="checked"
                          style={{ marginBottom: 0, whiteSpace: 'nowrap' }}
                        >
                          <Checkbox>必填</Checkbox>
                        </Form.Item>
                        <Button
                          type="link"
                          danger
                          icon={<MinusCircleOutlined />}
                          onClick={() => remove(name)}
                          style={{ padding: '0 4px' }}
                        />
                      </div>
                    ))}
                    <Button
                      type="dashed"
                      onClick={() =>
                        add({ paramName: '', paramType: 'string', paramDescription: '', required: false })
                      }
                      icon={<PlusOutlined />}
                      style={{ width: '100%' }}
                    >
                      添加参数
                    </Button>
                  </div>
                )}
              </Form.List>

              <div style={{ marginTop: 16 }}>
                <Button type="primary" loading={generating} onClick={handleGenerateSchema}>
                  生成 Schema
                </Button>
              </div>
            </div>

            {/* 右侧：Python 脚本 + 启动参数 + 生成的 Schema + 备注 */}
            <div style={{ flex: 1, overflow: 'auto', paddingLeft: 4 }}>
              {/* Python 脚本 */}
              <Divider orientation="left" style={{ marginTop: 0, fontWeight: 500 }}>
                Python 脚本
              </Divider>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  padding: '8px 12px',
                  background: '#fffbe6',
                  border: '1px solid #ffe58f',
                  borderRadius: 6,
                  marginBottom: 12
                }}
              >
                <ExclamationCircleFilled style={{ color: '#faad14', fontSize: 14, marginTop: 3 }} />
                <div style={{ fontSize: 13, lineHeight: '20px', color: 'rgba(0,0,0,0.85)' }}>
                  <div style={{ fontWeight: 500, marginBottom: 2 }}>安全警告</div>
                  <div style={{ color: 'rgba(0,0,0,0.65)' }}>
                    Python 脚本将以服务器进程权限执行，请确保代码来源可信。请勿编写删除文件、访问网络等高危操作，或交由管理员审核后发布。
                  </div>
                </div>
              </div>
              <Form.Item name="scriptContent" noStyle>
                <CodeEditor language="python" height="240px" />
              </Form.Item>

              {/* 启动参数 */}
              <Divider orientation="left" style={{ marginTop: 24, fontWeight: 500 }}>
                启动参数
              </Divider>
              <Form.Item name="startupParams" noStyle>
                <CodeEditor language="json" height="160px" />
              </Form.Item>

              {/* 生成的 JSON Schema */}
              <Divider orientation="left" style={{ marginTop: 24, fontWeight: 500 }}>
                生成的 JSON Schema
              </Divider>
              <Form.Item name="inputSchema" noStyle>
                <Input.TextArea
                  rows={10}
                  placeholder="点击左侧「生成 Schema」按钮生成 JSON Schema"
                  style={{ fontFamily: 'monospace', fontSize: 13 }}
                />
              </Form.Item>

              {/* 备注 */}
              <Divider orientation="left" style={{ marginTop: 24, fontWeight: 500 }}>
                备注
              </Divider>
              <Form.Item name="remark" noStyle>
                <Input.TextArea rows={4} placeholder="备注信息" />
              </Form.Item>
            </div>
          </div>
        </Form>
      </Drawer>
    </div>
  );
}

export default Component;
