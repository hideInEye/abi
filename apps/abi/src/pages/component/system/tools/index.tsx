import Editor from '@monaco-editor/react';
import {
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  ExclamationCircleFilled,
  LeftOutlined,
  MinusCircleOutlined,
  MoreOutlined,
  PlusOutlined,
  ReloadOutlined,
  RightOutlined,
  SearchOutlined,
  SettingOutlined,
  SlidersOutlined,
  CodeOutlined,
  FileTextOutlined,
  InfoCircleOutlined
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
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const handleColumnToggle = (key: string, visible: boolean) => {
    setColumnOptions(prev => prev.map(c => c.key === key ? { ...c, visible } : c));
  };

  // 批量删除
  function handleBatchDelete() {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的工具');
      return;
    }
    modal.confirm({
      title: '批量删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 个工具吗？删除后不可恢复。`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          await Promise.all(
            selectedRowKeys.map(id => deleteToolApi({ toolId: Number(id) }))
          );
          message.success(`成功删除 ${selectedRowKeys.length} 个工具`);
          setSelectedRowKeys([]);
          fetchList();
        } catch {
          message.error('批量删除失败');
        }
      }
    });
  }

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
  const [pageSize, setPageSize] = useState(10);
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
  }, [statusFilter, keyword, pageSize]);

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
        minWidth: 120,
        fixed: 'right',
        render: (_, record) => (
          <div className="ds-action-group">
            <Button className="abi-action-link" size="small" variant="link" onClick={() => handleEdit(record)}>
              <EditOutlined style={{ marginRight: 3, fontSize: 12 }} />编辑
            </Button>
            <APopconfirm title="提示" description="确定删除该工具吗？" onConfirm={() => handleDelete(record)}>
              <Button className="abi-action-link" size="small" variant="link">
                <DeleteOutlined style={{ marginRight: 3, fontSize: 12 }} />删除
              </Button>
            </APopconfirm>
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
            style={{ width: '220px' }}
          />
          <Select
            style={{ width: 120 }}
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
            showTime={{ format: 'HH:mm:ss' }}
            format="YYYY-MM-DD HH:mm:ss"
            placeholder={['开始时间', '结束时间']}
            value={dateRange}
            onChange={(dates) => setDateRange(dates)}
            className="abi-field-input"
            style={{ width: '380px' }}
          />
          <Button type="primary" className="btn-accent-gradient" onClick={() => setCurrentPage(1)}>
            <SearchOutlined /> 查询
          </Button>
          <Button className="btn-ghost-v5" onClick={() => { setKeyword(''); setStatusFilter('ALL'); setCurrentPage(1); setDateRange(null); }}>
            <ReloadOutlined /> 重置
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
            <Button
              className="btn-ghost-v5"
              disabled={selectedRowKeys.length === 0}
              onClick={handleBatchDelete}
            >
              批量删除数据
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
                rowSelection={{
                  columnWidth: 48,
                  fixed: true,
                  selectedRowKeys,
                  onChange: (keys) => setSelectedRowKeys(keys),
                }}
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
                      <div key={item.toolId} className="abi-data-card">
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
                        <div className="abi-data-card-footer">
                          <button className="abi-card-act" onClick={() => handleEdit(item)}>
                            <EditOutlined style={{ marginRight: 3 }} />编辑
                          </button>
                          <Dropdown
                            menu={{
                              items: [
                                {
                                  key: 'delete',
                                  danger: true,
                                  label: '删除',
                                  onClick: () => handleDelete(item),
                                },
                              ],
                            }}
                            trigger={['click']}
                          >
                            <button className="abi-card-more" onClick={(e) => e.stopPropagation()}>
                              <MoreOutlined />
                            </button>
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
                onChange={(value: number) => setPageSize(value)}
                options={[
                  { label: '10条/页', value: 10 },
                  { label: '15条/页', value: 15 },
                  { label: '20条/页', value: 20 },
                  { label: '25条/页', value: 25 },
                  { label: '30条/页', value: 30 },
                ]}
                className="page-size-select"
              />
              <button className="page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                <LeftOutlined />
              </button>
              {(() => {
                const pages: (number | string)[] = [];
                const maxVisible = 5;
                if (totalPages <= maxVisible) {
                  for (let i = 1; i <= totalPages; i++) pages.push(i);
                } else if (currentPage <= 3) {
                  for (let i = 1; i <= 4; i++) pages.push(i);
                  pages.push('...', totalPages);
                } else if (currentPage >= totalPages - 2) {
                  pages.push(1, '...');
                  for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
                } else {
                  pages.push(1, '...');
                  pages.push(currentPage - 1, currentPage, currentPage + 1);
                  pages.push('...', totalPages);
                }
                return pages.map((page, idx) => {
                  if (page === '...') return <span key={`ellipsis-${idx}`} className="page-item page-ellipsis">...</span>;
                  const isActive = page === currentPage;
                  return <span key={page} className={`page-item${isActive ? ' page-active' : ''}`} onClick={() => setCurrentPage(page as number)}>{page}</span>;
                });
              })()}
              <button className="page-btn" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                <RightOutlined />
              </button>
              <span className="quick-jumper">
                前往
                <AInput className="jump-input" style={{ width: 48, textAlign: 'center' }} value={jumpValue} onChange={(e: any) => setJumpValue(e.target.value)} onPressEnter={() => { const p = parseInt(jumpValue, 10); if (!isNaN(p) && p >= 1 && p <= totalPages) setCurrentPage(p); setJumpValue(''); }} />
                页
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 新增/编辑抽屉 — v5 风格 */}
      <Drawer
        className="ds-operate-drawer"
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #5b7cf7 0%, #7091fa 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 18, boxShadow: '0 4px 12px rgba(91,124,247,0.3)',
            }}>
              <SettingOutlined />
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#1a2744', letterSpacing: '0.02em' }}>
                {editingTool ? '编辑内置工具' : '新增内置工具'}
              </div>
              <div style={{ fontSize: 12, color: '#768a9f', marginTop: 2 }}>
                {editingTool ? '修改工具配置与脚本' : '创建新的 Python 工具'}
              </div>
            </div>
          </div>
        }
        open={modalOpen}
        width={900}
        destroyOnClose
        closeIcon={null}
        onClose={() => setModalOpen(false)}
        styles={{ body: { display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', height: '100%' } }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, padding: '4px 0' }}>
            <Button
              onClick={() => setModalOpen(false)}
              style={{ height: 38, padding: '0 20px', borderRadius: 8, fontWeight: 500, border: '1px solid rgba(130,140,200,0.18)', color: '#5f7490', background: 'transparent' }}
            >
              取消
            </Button>
            <Button
              type="primary"
              loading={saving}
              onClick={handleSave}
              style={{
                height: 38, padding: '0 28px', borderRadius: 8, fontWeight: 600,
                background: 'linear-gradient(135deg, #5b7cf7, #7091fa)',
                boxShadow: '0 2px 10px rgba(91,124,247,0.3)', border: 'none',
              }}
            >
              保存
            </Button>
          </div>
        }
      >
        {/* 固定区域：表单基础字段 */}
        <Form form={form} layout="vertical" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ padding: '20px 24px 0', flexShrink: 0 }}>
            {/* 基础信息区 */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 0', marginBottom: 16,
              borderBottom: '1px solid rgba(130,140,200,0.10)',
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: 7,
                background: 'linear-gradient(135deg, #5b7cf7 0%, #7091fa 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 13, boxShadow: '0 2px 8px rgba(91,124,247,0.25)',
              }}>
                <SettingOutlined />
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#1a2744', letterSpacing: '0.02em' }}>基础信息</span>
            </div>

            <div style={{ display: 'flex', gap: 16 }}>
              <Form.Item
                label={<span style={{ fontWeight: 500, color: '#3e5068' }}>工具名称</span>}
                name="toolName"
                rules={[{ required: true, message: '请输入工具名称' }]}
                style={{ flex: 1 }}
              >
                <Input placeholder="如：builtin_increment" />
              </Form.Item>

              <Form.Item
                label={<span style={{ fontWeight: 500, color: '#3e5068' }}>标签</span>}
                name="toolLabel"
                rules={[{ required: true, message: '请输入工具标签' }]}
                style={{ flex: 1 }}
              >
                <Input placeholder="如：计算器" />
              </Form.Item>
            </div>

            <Form.Item label={<span style={{ fontWeight: 500, color: '#3e5068' }}>功能描述</span>} name="description">
              <Input.TextArea rows={2} placeholder="请输入功能描述" />
            </Form.Item>

            <Form.Item label={<span style={{ fontWeight: 500, color: '#3e5068' }}>状态</span>} name="status" style={{ marginBottom: 0 }}>
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
                { key: 'script', label: <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><CodeOutlined />Python 脚本</span> },
                { key: 'startupParams', label: <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><SlidersOutlined />启动参数</span> },
                { key: 'inputSchema', label: <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><FileTextOutlined />输入参数 Schema</span> },
                { key: 'outputSchema', label: <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><FileTextOutlined />输出 Schema</span> },
                { key: 'remark', label: <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><InfoCircleOutlined />备注</span> }
              ]}
            />
          </div>

          {/* 滚动区域：五个 Tab 内容盒子 */}
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: '0 24px 24px' }}>

            {/* Python 脚本 */}
            <div style={{ display: activeTab === 'script' ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}>
              <div
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  padding: '8px 12px', marginBottom: 12, flexShrink: 0,
                  background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)',
                  borderRadius: 8,
                }}
              >
                <ExclamationCircleFilled style={{ color: '#f59e0b', fontSize: 14, marginTop: 3 }} />
                <div style={{ fontSize: 13, lineHeight: '20px', color: '#3e5068' }}>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>安全警告</div>
                  <div style={{ color: '#5f7490' }}>
                    Python 脚本将以服务器进程权限执行，请确保代码来源可信。
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
                    <div style={{ fontWeight: 500, color: '#3e5068' }}>参数列表</div>
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
                                display: 'flex', gap: 8, alignItems: 'flex-start',
                                padding: 8, border: '1px solid rgba(130,140,200,0.12)',
                                borderRadius: 8, background: 'rgba(255,255,255,0.5)',
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
