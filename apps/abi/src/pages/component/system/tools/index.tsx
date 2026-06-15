import Editor from '@monaco-editor/react';
import {
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleFilled,
  LeftOutlined,
  MinusCircleOutlined,
  MoreOutlined,
  PlusOutlined,
  RightOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { App, Button, Checkbox, Divider, Drawer, Dropdown, Form, Input, Select, Space, Table, Tabs, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useRef, useState } from 'react';

// import PageTitle from '@/components/stateless/common/PageTitle';
import type { CreateToolParams, ToolItem, UpdateToolParams } from '@/service/api/tool';
import { getSpaceId } from '@/store/slice/app';
import { useAppSelector } from '@/hooks/business/useStore';
import { ViewControls } from '@/components/ViewControls';
import type { ColumnOption } from '@/components/ViewControls';
import {
  createToolApi,
  deleteToolApi,
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
  const spaceId = useAppSelector(getSpaceId);

  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | '0' | '1'>('ALL');
  const [list, setList] = useState<ToolItem[]>([]);
  const [loading, setLoading] = useState(false);

  // 弹窗状态
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<ToolItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);
  const [columnOptions, setColumnOptions] = useState<ColumnOption[]>([
    { key: 'toolName', label: '工具名称', visible: true },
    { key: 'toolLabel', label: '标签', visible: true },
    { key: 'description', label: '功能描述', visible: true },
    { key: 'status', label: '状态', visible: true },
    { key: 'createTime', label: '创建时间', visible: true },
    { key: 'action', label: '操作', visible: true },
  ]);
  const handleColumnToggle = (key: string, visible: boolean) => {
    setColumnOptions(prev => prev.map(c => c.key === key ? { ...c, visible } : c));
  };

  // 编辑弹窗 tab
  const [activeTab, setActiveTab] = useState('script');

  // 输入参数 Schema 高级模式
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);

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
  }, [spaceId]);

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

  // v5 pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [jumpValue, setJumpValue] = useState('');
  const totalCount = filteredList.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const pagedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage, pageSize]);

  // 筛选条件变化时重置到第一页
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, keyword]);

  const defaultPythonScript = `def get_current_date(format: str = "%Y-%m-%d", include_weekday: bool = False) -> str:
    from datetime import date
    """获取今天的日期"""
    result = date.today().strftime(format)
    if include_weekday:
        weekday = date.today().strftime("%A")
        result = f"{result} ({weekday})"
    return result`;

  function handleAdd() {
    setEditingTool(null);
    form.resetFields();
    form.setFieldsValue({ status: '0', scriptContent: defaultPythonScript });
    setActiveTab('script');
    setIsAdvancedMode(false);
    setModalOpen(true);
  }


  async function handleEdit(record: ToolItem) {
    setActiveTab('script');
    setIsAdvancedMode(false);
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
          inputSchema: formatJsonString(detail.inputSchema),
          outputSchema: detail.outputSchema
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

  // Python 脚本参数解析
  const lastParsedScriptRef = useRef<string | null>(null);

  function mapPythonType(typeStr: string): string {
    const map: Record<string, string> = {
      str: 'string',
      int: 'integer',
      float: 'number',
      bool: 'boolean',
      list: 'array',
      dict: 'dict',
      List: 'array',
      Dict: 'dict',
      Optional: 'string'
    };
    return map[typeStr] || 'string';
  }

  function parsePythonParams(script: string | undefined): Array<{ paramName: string; paramType: string; paramDescription: string; required: boolean }> | null {
    if (!script) return null;
    const match = script.match(/def\s+[a-zA-Z_]\w*\s*\(([\s\S]*?)\)\s*(?:->[\s\S]*?)?:/);
    if (!match) return null;

    let paramsStr = match[1].trim();
    if (!paramsStr) return [];

    const params: string[] = [];
    let depth = 0;
    let current = '';
    for (const char of paramsStr) {
      if (char === '(' || char === '[' || char === '{') depth++;
      else if (char === ')' || char === ']' || char === '}') depth--;

      if (char === ',' && depth === 0) {
        params.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    if (current.trim()) params.push(current.trim());

    return params
      .filter(p => p && !p.startsWith('*') && !p.startsWith('**'))
      .map(param => {
        let name = param;
        let type = 'string';
        let required = true;

        if (param.includes('=')) {
          const eqIdx = param.indexOf('=');
          name = param.slice(0, eqIdx).trim();
          required = false;
        }

        if (name.includes(':')) {
          const colonIdx = name.indexOf(':');
          const typePart = name.slice(colonIdx + 1).trim();
          name = name.slice(0, colonIdx).trim();
          type = mapPythonType(typePart);
        }

        return {
          paramName: name,
          paramType: type,
          paramDescription: '',
          required
        };
      });
  }

  function buildInputSchema(params: Array<{ paramName: string; paramType: string; paramDescription: string; required: boolean }>): string {
    const properties: Record<string, any> = {};
    const required: string[] = [];

    params.forEach(p => {
      properties[p.paramName] = {
        type: p.paramType,
        description: p.paramDescription || ''
      };
      if (p.required) required.push(p.paramName);
    });

    return JSON.stringify({
      type: 'object',
      properties,
      required
    }, null, 2);
  }

  useEffect(() => {
    if (activeTab === 'inputSchema' && !isAdvancedMode) {
      const script = form.getFieldValue('scriptContent') || '';
      if (script && script !== lastParsedScriptRef.current) {
        const parsed = parsePythonParams(script);
        if (parsed) {
          lastParsedScriptRef.current = script;
          form.setFieldsValue({ schemaParams: parsed });
          if (parsed.length > 0) {
            form.setFieldsValue({ inputSchema: buildInputSchema(parsed) });
          }
        }
      }
    }
  }, [activeTab]);

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
        outputSchema: values.outputSchema,
        mode_type: isAdvancedMode ? 1 : 0
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
          <div className="flex items-center justify-center" style={{ gap: 2 }}>
            <Button className="abi-action-link" size="small" variant="link" onClick={() => handleEdit(record)}>编辑</Button>
            <Button className="abi-action-link" size="small" variant="link" danger onClick={() => handleDelete(record)}>删除</Button>
          </div>
        )
      }
    ],
    []
  );

  const filteredColumns = useMemo(() => {
    const visibleKeys = new Set(columnOptions.filter(c => c.visible).map(c => c.key));
    return columns.filter(col => visibleKeys.has(col.key || (col as any).dataIndex));
  }, [columnOptions, columns]);

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      {/* v5 Searchbar */}
      <section className="abi-searchbar">
        <div className="abi-search-row">
          <Input
            allowClear
            placeholder="请输入工具名称或标签"
            prefix={<SearchOutlined style={{ color: '#a3b3c8' }} />}
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            onPressEnter={() => setCurrentPage(1)}
            className="abi-field-input"
            style={{ width: '16rem' }}
          />
          <Select
            style={{ width: 100 }}
            placeholder="状态"
            value={statusFilter}
            onChange={v => setStatusFilter(v)}
            className="abi-field-input"
            options={[
              { value: 'ALL', label: '全部' },
              { value: '0', label: '启用' },
              { value: '1', label: '禁用' }
            ]}
          />
          <ADatePicker.RangePicker
            placeholder={['开始时间', '结束时间']}
            value={dateRange}
            onChange={(dates) => setDateRange(dates)}
            className="abi-field-input"
          />
          <Button type="primary" className="btn-accent-gradient" onClick={() => setCurrentPage(1)}>
            <SearchOutlined /> 查询
          </Button>
          <Button className="btn-ghost-v5" onClick={() => { setKeyword(''); setStatusFilter('ALL'); setCurrentPage(1); setDateRange(null); }}>
            重置
          </Button>
        </div>
      </section>

      {/* v5 Data Area */}
      <section className="abi-data-area">
        <div className="abi-toolbar">
          <div className="abi-toolbar-left">
            <Button className="btn-accent-gradient" onClick={handleAdd}>
              <PlusOutlined />新增工具
            </Button>
          </div>
          <ViewControls
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            columns={columnOptions}
            onColumnToggle={handleColumnToggle}
          />
        </div>

        {/* 内容区域 */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {viewMode === 'list' ? (
          <div
            style={{
              border: '1px solid rgba(130,140,200,0.18)',
              borderRadius: '12px',
              overflow: 'hidden',
              flex: 1,
              minHeight: 0,
            }}
          >
            <div className="assistant-table-scroll" style={{ overflow: 'auto', maxHeight: '100%' }}>
              <Table<ToolItem>
                rowKey="toolId"
                columns={filteredColumns}
                dataSource={pagedList}
                loading={loading}
                pagination={false}
                size="middle"
                className="tools-table abi-std-table"
                scroll={pagedList.length > 0 ? TABLE_SCROLL : undefined}
              />
            </div>
          </div>
          ) : (
            <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
              {pagedList.length === 0 ? (
                <div style={{ marginTop: 80, textAlign: 'center' }}><AEmpty description="暂无工具" /></div>
              ) : (
                <div className="abi-card-grid">
                  <div className="abi-card-grid-inner">
                    {pagedList.map((item: ToolItem) => (
                      <div key={item.toolId} className="abi-data-card" style={{ position: 'relative' }}>
                        <div className="abi-data-card-head">
                          <div className="abi-data-card-title">
                            <span className="abi-data-card-name">{item.toolName}</span>
                          </div>
                          {item.toolLabel ? <Tag color="blue">{item.toolLabel}</Tag> : null}
                        </div>
                        <div className="abi-data-card-body">
                          <div className="row"><span className="lbl">功能描述</span><span className="val">{item.description || '-'}</span></div>
                          <div className="row"><span className="lbl">状态</span><span className={`abi-status-tag ${String(item.status) === '0' ? 'status-normal' : 'status-disabled'}`}>{String(item.status) === '0' ? '启用' : '禁用'}</span></div>
                          <div className="row"><span className="lbl">创建时间</span><span className="val">{item.createTime ? item.createTime.replace('T', ' ') : '-'}</span></div>
                        </div>
                        <div style={{ position: 'absolute', bottom: 18, right: 20, zIndex: 10 }}>
                          <Dropdown
                            menu={{
                              items: [
                                { key: 'edit', label: <span><EditOutlined style={{ marginRight: 6 }} />编辑</span> },
                                { key: 'delete', label: <span style={{ color: '#ff4d4f' }}><DeleteOutlined style={{ marginRight: 6 }} />删除</span> },
                              ],
                              onClick: ({ key }) => {
                                if (key === 'edit') handleEdit(item);
                                else if (key === 'delete') handleDelete(item);
                              }
                            }}
                            trigger={['hover']}
                          >
                            <AButton type="text" size="small" style={{ color: '#8c8c8c' }}><MoreOutlined /></AButton>
                          </Dropdown>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="data-source-pagination">
            <span className="total-text">共 {totalCount} 条</span>
            <div className="pagination-controls">
              <ASelect
                value={pageSize}
                options={[
                  { label: '10条/页', value: 10 },
                ]}
                disabled
                className="page-size-select"
              />
              <button className="page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                <LeftOutlined />
              </button>
              {(() => {
                const pages: number[] = [];
                if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) pages.push(i); }
                else {
                  pages.push(1);
                  if (currentPage > 3) pages.push(-1);
                  const start = Math.max(2, currentPage - 1);
                  const end = Math.min(totalPages - 1, currentPage + 1);
                  for (let i = start; i <= end; i++) pages.push(i);
                  if (currentPage < totalPages - 2) pages.push(-2);
                  pages.push(totalPages);
                }
                return pages.map(p => p < 0 ? <span key={p} className="page-item page-ellipsis">...</span> : <span key={p} className={`page-item${p === currentPage ? ' page-active' : ''}`} onClick={() => setCurrentPage(p)}>{p}</span>);
              })()}
              <button className="page-btn" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                <RightOutlined />
              </button>
              <span className="quick-jumper">
                前往
                <AInput className="jump-input" style={{ width: 48, textAlign: 'center' }} value={jumpValue} onChange={(e: any) => setJumpValue(e.target.value)} onPressEnter={() => { const p = parseInt(jumpValue, 10); if (p >= 1 && p <= totalPages) setCurrentPage(p); setJumpValue(''); }} />
                页
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 新增/编辑抽屛 */}
      <Drawer
        title={editingTool ? '编辑内置工具' : '新增内置工具'}
        open={modalOpen}
        width={900}
        destroyOnClose
        onClose={() => setModalOpen(false)}
        styles={{ body: { display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', height: '100%' } }}
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
        {/* 固定区域：表单基础字段 */}
        <Form form={form} layout="vertical" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ padding: '24px 24px 0', flexShrink: 0 }}>
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
              <Input.TextArea rows={3} placeholder="请输入功能描述" />
            </Form.Item>

            <Form.Item label="状态" name="status" style={{ marginBottom: 0 }}>
              <Select style={{ width: 160 }}>
                <Select.Option value="0">启用</Select.Option>
                <Select.Option value="1">禁用</Select.Option>
              </Select>
            </Form.Item>

            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              style={{ marginTop: 16 }}
              items={[
                { key: 'script', label: 'Python 脚本' },
                { key: 'startupParams', label: '启动参数' },
                { key: 'inputSchema', label: '输入参数 Schema' },
                { key: 'outputSchema', label: '输出参数 JSON Schema' },
                { key: 'remark', label: '备注' }
              ]}
            />
          </div>

          {/* 滚动区域：五个 Tab 内容盒子，各自内部滚动，外层不产生大滚动条 */}
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: '0 24px 24px' }}>

            {/* Python 脚本 */}
            <div style={{ display: activeTab === 'script' ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  padding: '8px 12px',
                  background: '#fffbe6',
                  border: '1px solid #ffe58f',
                  borderRadius: 6,
                  marginBottom: 12,
                  flexShrink: 0
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
              <div style={{ flex: 1, minHeight: 0 }}>
                <Form.Item name="scriptContent" noStyle>
                  <CodeEditor language="python" height="260px" />
                </Form.Item>
              </div>
            </div>

            {/* 启动参数 */}
            <div style={{ display: activeTab === 'startupParams' ? 'flex' : 'none', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
              <Form.Item name="startupParams" noStyle style={{ flex: 1, minHeight: 0 }}>
                <CodeEditor language="json" height="320px" />
              </Form.Item>
            </div>

            {/* 输入参数 Schema */}
            <div style={{ display: activeTab === 'inputSchema' ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}>
              {isAdvancedMode ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12, flexShrink: 0 }}>
                    <Button type="primary" onClick={() => setIsAdvancedMode(false)}>
                      关闭高级配置
                    </Button>
                  </div>
                  <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                    <Form.Item name="inputSchema" noStyle>
                      <CodeEditor language="json" height="320px" />
                    </Form.Item>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexShrink: 0 }}>
                    <div style={{ fontWeight: 500 }}>参数列表</div>
                    <Button onClick={() => setIsAdvancedMode(true)}>
                      高级配置
                    </Button>
                  </div>
                  <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
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
                        </div>
                      )}
                    </Form.List>
                  </div>
                </>
              )}
            </div>

            {/* 输出参数 JSON Schema */}
            <div style={{ display: activeTab === 'outputSchema' ? 'flex' : 'none', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
              <Form.Item name="outputSchema" noStyle style={{ flex: 1, minHeight: 0 }}>
                <CodeEditor language="json" height="320px" />
              </Form.Item>
            </div>

            {/* 备注 */}
            <div style={{ display: activeTab === 'remark' ? 'flex' : 'none', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
              <Form.Item name="remark" noStyle style={{ flex: 1, minHeight: 0 }}>
                <Input.TextArea rows={12} placeholder="备注信息" style={{ height: '100%', resize: 'none' }} />
              </Form.Item>
            </div>
          </div>
        </Form>
      </Drawer>
    </div>
  );
}

export default Component;
