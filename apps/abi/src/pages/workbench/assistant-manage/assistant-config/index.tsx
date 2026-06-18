import { DeleteOutlined, EditOutlined, LeftOutlined, MoreOutlined, PlusOutlined, RightOutlined, SearchOutlined } from '@ant-design/icons';
import { Dropdown, Empty, Popconfirm, Select, Spin, Switch, message } from 'antd';

// import PageTitle from '@/components/stateless/common/PageTitle';

import { Group } from '@/components/stateful/group/Group';
import type { GroupProps } from '@/components/stateful/group/Group';
import { ViewControls } from '@/components/ViewControls';
import type { ColumnOption } from '@/components/ViewControls';
import { getSpaceId } from '@/store/slice/app';
import { useAppSelector } from '@/hooks/business/useStore';
import { fetchAppListApi, deleteAppApi } from '@/service/api/abi-chat-app';

import AssistantEditDrawer, { type AgentMock } from './modules/assistant-edit-drawer';

/** 助手分组配置，复用通用 Group 组件 */
const ASSISTANT_GROUP_CONFIG: GroupProps['config'] = {
  button: '新增分组',
  inputLabel: '分组名称',
  inputPlaceholder: '搜索分组',
  modalAddTitle: '新增分组',
  modalEditTitle: '编辑分组',
  panelTitle: '分组目录',
  rule: [[{ message: '分组名称未填写', required: true }], []],
  type: 'assistant' as any
};

/**
 * AI 助手列表页
 */

interface AgentCard extends AgentMock {
  type: '助手' | '技能';
  iconBg: string;
  iconLetter: string;
  selected?: boolean;
  createBy?: string;
  groupId?: number;
}

export function Component() {
  const spaceId = useAppSelector(getSpaceId);
  const [keyword, setKeyword] = useState('');
  const [editVisible, setEditVisible] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AgentCard | null>(null);
  const [selectedId, setSelectedId] = useState<string | number>(1);
  const [groupId, setGroupId] = useState<number>(0);
  const [agents, setAgents] = useState<AgentCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'card'>('card');
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);
  const [columnOptions, setColumnOptions] = useState<ColumnOption[]>([
    { key: 'name', label: '名称', visible: true },
    { key: 'description', label: '描述', visible: true },
    { key: 'createBy', label: '创建用户', visible: true },
    { key: 'status', label: '状态', visible: true },
    { key: 'operate', label: '操作', visible: true },
  ]);
  const handleColumnToggle = (key: string, visible: boolean) => {
    setColumnOptions(prev => prev.map(c => c.key === key ? { ...c, visible } : c));
  };

  /** 拉取助手列表 */
  const fetchIdRef = useRef(0);
  async function fetchList() {
    if (!spaceId) return;
    const fetchId = ++fetchIdRef.current;
    setLoading(true);
    try {
      const res: any = await fetchAppListApi({ spaceId, appName: keyword || undefined });
      // 防止旧请求覆盖新数据
      if (fetchId !== fetchIdRef.current) return;
      // 解包响应：createFlatRequest 返回 { data, error, response }
      const rows: any[] = Array.isArray(res?.data)
        ? res.data
        : (res?.response?.data?.data || res?.response?.data?.rows || []);
      const list: AgentCard[] = (Array.isArray(rows) ? rows : []).map((r: any) => ({
        id: r.appId ?? r.id,
        name: r.appName ?? r.name ?? '-',
        description: r.description ?? '',
        iconBg: r.iconBg ?? '#fa8c16',
        iconLetter: r.iconLetter ?? (r.appName ?? r.name ?? '?').slice(0, 1),
        status: r.status ?? '0',
        createBy: r.createBy ?? '',
        groupId: r.groupId,
        type: '助手' as const,
      }));
      setAgents(list);
    } catch {
      if (fetchId === fetchIdRef.current) setAgents([]);
    } finally {
      if (fetchId === fetchIdRef.current) setLoading(false);
    }
  }

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceId]);

  const handleSearch = () => {
    setCurrentPage(1);
  };

  const handleReset = () => {
    setKeyword('');
    setDateRange(null);
    setCurrentPage(1);
  };

  const list = useMemo(() => {
    let arr = agents;
    // 按分组过滤
    if (groupId > 0) {
      arr = arr.filter(it => it.groupId == groupId);
    }
    // 关键字搜索
    const k = keyword.trim();
    if (k) {
      arr = arr.filter(it => it.name.includes(k) || (it.description || '').includes(k));
    }
    return arr;
  }, [keyword, agents, groupId]);

  // v5 pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [jumpValue, setJumpValue] = useState('');

  // 筛选条件变化时重置到第一页
  useEffect(() => {
    setCurrentPage(1);
  }, [keyword, groupId]);

  const totalCount = list.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const pagedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return list.slice(start, start + pageSize);
  }, [list, currentPage, pageSize]);

  // 表格列定义
  const allTableColumns = useMemo(() => [
    {
      title: '名称', key: 'name', dataIndex: 'name',
      render: (_: any, record: AgentCard) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ alignItems: 'center', background: record.iconBg, borderRadius: 6, color: '#fff', display: 'flex', flexShrink: 0, fontSize: 12, fontWeight: 700, height: 24, justifyContent: 'center', width: 24 }}>{record.iconLetter}</div>
          <span>{record.name}</span>
        </div>
      )
    },
    { title: '描述', key: 'description', dataIndex: 'description', ellipsis: true },
    { title: '创建用户', key: 'createBy', dataIndex: 'createBy' },
    {
      title: '状态', key: 'status', dataIndex: 'status', align: 'center' as const,
      render: (_: any, record: AgentCard) => <Switch checked={record.status === '1'} size="small" onChange={checked => handleToggle(record.id, checked)} />
    },
    {
      title: '操作', key: 'operate', align: 'center' as const, fixed: 'right' as const,
      render: (_: any, record: AgentCard) => (
        <Dropdown trigger={['hover']} menu={{
          items: [
            { key: 'edit', label: <span><EditOutlined style={{ marginRight: 6 }} />编辑</span> },
            { key: 'delete', label: <span style={{ color: '#ff4d4f' }}><DeleteOutlined style={{ marginRight: 6 }} />删除</span> },
          ],
          onClick: ({ key }) => { if (key === 'edit') handleEdit(record); else if (key === 'delete') handleDelete(record.id); }
        }}>
          <AButton type="text" size="small" style={{ color: '#8c8c8c' }}><MoreOutlined /></AButton>
        </Dropdown>
      )
    },
  ], []);

  const tableColumns = useMemo(() => {
    const visibleKeys = new Set(columnOptions.filter(c => c.visible).map(c => c.key));
    return allTableColumns.filter(col => visibleKeys.has(col.key));
  }, [columnOptions, allTableColumns]);

  const handleAdd = () => {
    setEditingAgent(null);
    setEditVisible(true);
  };

  const handleEdit = (agent: AgentCard) => {
    setSelectedId(agent.id);
    setEditingAgent(agent);
    setEditVisible(true);
  };

  /** 开关切换: ON=发布(status='1') OFF=下线(status='2') */
  const handleToggle = (id: AgentCard['id'], checked: boolean) => {
    const nextStatus = checked ? '1' : '2';
    setAgents(prev => prev.map(it => (it.id === id ? { ...it, status: nextStatus } : it)));
    // TODO: 接口对接：待后端提供更新状态接口后替换
    message.success(checked ? '已发布' : '已下线');
  };

  const handleDelete = async (id: AgentCard['id']) => {
    try {
      await deleteAppApi({ appId: id });
      message.success('已删除');
      fetchList();
    } catch {
      message.error('删除失败');
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      {/* v5 Tree Panel — left sidebar */}
      <div className="abi-group-sidebar">
        <Group config={ASSISTANT_GROUP_CONFIG} onGroupId={setGroupId} />
      </div>

      {/* Right content area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        {/* v5 Searchbar */}
        <section className="abi-searchbar">
          <div className="abi-search-row">
            <AInput
              allowClear
              placeholder="请输入助手名称"
              prefix={<SearchOutlined style={{ color: '#a3b3c8' }} />}
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onPressEnter={handleSearch}
              className="abi-field-input"
              style={{ width: '16rem' }}
            />
            <ADatePicker.RangePicker
              placeholder={['开始时间', '结束时间']}
              value={dateRange}
              onChange={(dates) => setDateRange(dates)}
              className="abi-field-input"
            />
            <AButton type="primary" className="btn-accent-gradient" onClick={handleSearch}>
              <SearchOutlined /> 查询
            </AButton>
            <AButton className="btn-ghost-v5" onClick={handleReset}>
              重置
            </AButton>
          </div>
        </section>

        {/* v5 Data Area */}
        <section className="abi-data-area">
          <div className="abi-toolbar">
            <div className="abi-toolbar-left">
              <AButton type="primary" className="btn-accent-gradient" onClick={handleAdd}>
                <PlusOutlined /> 新增助手
              </AButton>
            </div>
            <ViewControls
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              columns={columnOptions}
              onColumnToggle={handleColumnToggle}
            />
          </div>
          <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
            <Spin spinning={loading}>
            {list.length === 0 && !loading ? (
              <div style={{ marginTop: 80 }}>
                <Empty description="暂无助手" />
              </div>
            ) : viewMode === 'list' ? (
              <div style={{ border: '1px solid rgba(130,140,200,0.18)', borderRadius: 12, overflow: 'hidden', flex: 1, minHeight: 0 }}>
                <div className="assistant-table-scroll" style={{ overflow: 'auto', maxHeight: '100%' }}>
                  <ATable
                    rowKey="id"
                    columns={tableColumns as any}
                    dataSource={pagedList}
                    pagination={false}
                    size="middle"
                    className="abi-std-table"
                    scroll={pagedList.length > 0 ? { x: 'max-content' } : undefined}
                  />
                </div>
              </div>
            ) : (
              <div className="abi-card-grid">
                <div className="abi-card-grid-inner">
                  {pagedList.map(agent => {
                    const active = agent.id === selectedId;
                    return (
                      <div
                        key={agent.id}
                        className="abi-data-card"
                        style={active ? { borderColor: '#5b7cf7' } : undefined}
                        onClick={() => handleEdit(agent)}
                      >
                        <div className="abi-data-card-head">
                          <div className="abi-data-card-title">
                            <div
                              style={{
                                alignItems: 'center',
                                background: agent.iconBg,
                                borderRadius: 12,
                                color: '#fff',
                                display: 'flex',
                                flexShrink: 0,
                                fontSize: 18,
                                fontWeight: 700,
                                height: 42,
                                justifyContent: 'center',
                                width: 42
                              }}
                            >
                              {agent.iconLetter}
                            </div>
                            <span className="abi-data-card-name">{agent.name}</span>
                          </div>
                          <span onClick={e => e.stopPropagation()}>
                            <Switch
                              checked={agent.status === '1'}
                              size="small"
                              onChange={checked => handleToggle(agent.id, checked)}
                            />
                          </span>
                        </div>
                        <div className="abi-data-card-body">
                          <div className="row">
                            <span className="lbl">描述</span>
                            <span className="val" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{agent.description}</span>
                          </div>
                          <div className="row"><span className="lbl">创建用户</span><span className="val">{agent.createBy || '-'}</span></div>
                        </div>
                        <div className="abi-data-card-footer" onClick={e => e.stopPropagation()}>
                          <Dropdown
                            trigger={['hover']}
                            placement="topRight"
                            menu={{
                              items: [
                                {
                                  key: 'edit',
                                  label: (
                                    <span>
                                      <EditOutlined style={{ marginRight: 6 }} />
                                      编辑
                                    </span>
                                  ),
                                },
                                {
                                  key: 'delete',
                                  label: (
                                    <Popconfirm
                                      cancelText="取消"
                                      okText="删除"
                                      okType="danger"
                                      title="确定删除该助手？"
                                      onConfirm={() => handleDelete(agent.id)}
                                    >
                                      <span style={{ color: '#ff4d4f' }}>
                                        <DeleteOutlined style={{ marginRight: 6 }} />
                                        删除
                                      </span>
                                    </Popconfirm>
                                  ),
                                },
                              ],
                              onClick: ({ key, domEvent }) => {
                                domEvent?.stopPropagation?.();
                                if (key === 'edit') handleEdit(agent);
                              },
                            }}
                          >
                            <button
                              type="button"
                              className="abi-card-more"
                              aria-label="more"
                            >
                              <MoreOutlined />
                            </button>
                          </Dropdown>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            </Spin>
          </div>
          <div className="data-source-pagination">
            <span className="total-text">共 {totalCount} 条</span>
            <div className="pagination-controls">
              <Select
                value={pageSize}
                onChange={(val: number) => { setPageSize(val); setCurrentPage(1); }}
                options={[
                  { label: '12条/页', value: 12 },
                  { label: '20条/页', value: 20 },
                  { label: '30条/页', value: 30 },
                  { label: '50条/页', value: 50 },
                ]}
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
        </section>
      </div>

      {editVisible ? (
        <AssistantEditDrawer
          agent={editingAgent}
          groupId={groupId}
          onClose={(refresh) => {
            setEditVisible(false);
            setEditingAgent(null);
            if (refresh) fetchList();
          }}
        />
      ) : null}
    </div>
  );
}
