import { DeleteOutlined, EditOutlined, LeftOutlined, MoreOutlined, PlusOutlined, RightOutlined, SearchOutlined, ApartmentOutlined, DownOutlined, ReloadOutlined } from '@ant-design/icons';
import { Dropdown, Empty, Popconfirm, Select, Spin, Splitter, Switch, Typography, message } from 'antd';
// import PageTitle from '@/components/stateless/common/PageTitle';
import type { TableProps } from 'antd';

import { Group } from '@/components/stateful/group/Group';
import { GroupContentGate } from '@/components/stateful/group/GroupContentGate';
import { DeferredRangePicker, SearchFilterBar, SearchFilterField, getFilterPopupContainer } from '@/components/SearchFilterBar';
import type { GroupHandle, GroupProps } from '@/components/stateful/group/Group';
import MetadataAnalysisDrawer from '@/components/metadata-analysis/MetadataAnalysisDrawer';
import type { MetadataAnalysisContext } from '@/components/metadata-analysis/types';
import { ViewControls } from '@/components/ViewControls';
import type { ColumnOption } from '@/components/ViewControls';
import { AssistantIconBlock } from '@/components/AssistantIcon';
import { getSpaceId } from '@/store/slice/app';
import { useAppSelector } from '@/hooks/business/useStore';
import { fetchAppListApi, deleteAppApi, updateAppApi } from '@/service/api/abi-chat-app';
import { syncShareAppStatus } from '@/service/api/share';
import { filterByCreateTime } from '@/utils/date';

import AssistantEditDrawer, { type AgentMock } from './modules/assistant-edit-drawer';

/** 将接口返回的 AppItem 映射为页面卡片数据结构 */
function mapAppToCard(item: any): AgentCard {
  return {
    id: item.appId,
    name: item.appName || '',
    description: item.description || '',
    icon: item.icon,
    status: item.status ?? '0',
    createBy: item.createBy || '-',
    createTime: item.createTime ? String(item.createTime).replace('T', ' ') : '-',
    updateTime: item.updateTime ? String(item.updateTime).replace('T', ' ') : '-',
    groupId: (item.groupId && String(item.groupId) !== '0') ? String(item.groupId) : undefined,
    type: '助手',
  };
}

/** 助手分组配置，复用通用 Group 组件 */
const ASSISTANT_GROUP_CONFIG: GroupProps['config'] = {
  button: '新增分组',
  inputLabel: '分组名称',
  inputPlaceholder: '搜索分组',
  modalAddTitle: '新增分组',
  modalEditTitle: '编辑分组',
  panelTitle: '数据目录',
  rule: [[{ message: '分组名称未填写', required: true }], []],
  type: 'assistant' as any
};

/**
 * AI 助手列表页
 */

interface AgentCard extends AgentMock {
  type: '助手' | '技能';
  icon?: string;
  selected?: boolean;
  createBy?: string;
  groupId?: string;
  createTime?: string;
  updateTime?: string;
}

export function Component() {
  const spaceId = useAppSelector(getSpaceId);
  const [keyword, setKeyword] = useState('');
  const [editVisible, setEditVisible] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AgentCard | null>(null);
  const [selectedId, setSelectedId] = useState<string | number>(1);
  const [groupId, setGroupId] = useState<string>('');
  const groupRef = useRef<GroupHandle>(null);
  const [hasGroups, setHasGroups] = useState<boolean | null>(null);
  const [agents, setAgents] = useState<AgentCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'card'>('card');
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);
  const [analysisContext, setAnalysisContext] = useState<MetadataAnalysisContext | null>(null);
  const [checkedRowKeys, setCheckedRowKeys] = useState<React.Key[]>([]);
  const [selectedRows, setSelectedRows] = useState<AgentCard[]>([]);
  const [columnOptions, setColumnOptions] = useState<ColumnOption[]>([
    { key: 'name', label: '助手名称', visible: true },
    { key: 'description', label: '助手描述', visible: true },
    { key: 'createBy', label: '创建用户', visible: true },
    { key: 'createTime', label: '创建时间', visible: true },
    { key: 'updateBy', label: '操作人', visible: false },
    { key: 'updateTime', label: '操作时间', visible: true },
  ]);
  const handleColumnToggle = (key: string, visible: boolean) => {
    setColumnOptions(prev => prev.map(c => c.key === key ? { ...c, visible } : c));
  };
  const handleViewModeChange = (mode: 'list' | 'card') => {
    setCheckedRowKeys([]);
    setSelectedRows([]);
    setViewMode(mode);
  };

  /** 拉取助手列表（searchName 未传时使用当前搜索关键字） */
  async function fetchList(searchName?: string) {
    setLoading(true);
    try {
      const name = (searchName ?? keyword).trim();
      const res: any = await fetchAppListApi({
        appName: name || undefined,
        spaceId: spaceId || undefined,
        groupId: groupId && groupId !== '0' ? groupId : undefined,
      });
      const list = res?.data?.rows || res?.data || [];
      const items = Array.isArray(list) ? list.map(mapAppToCard) : [];
      setAgents(items);
    } catch (e) {
      console.error('拉取助手列表失败', e);
      message.error('拉取助手列表失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // 等待 Group 回传真实分组 id 再拉列表：避免初次挂载时 groupId='' 触发一次多余的无分组请求
    // （切换空间时 Group 会重新回调新分组 id，从而带上最新 spaceId 刷新列表）
    if (!groupId) return;
    fetchList();
  }, [groupId]);

  /** 查询：由 SearchFilterBar 停止输入 1s 防抖 / 回车 / 面板查询按钮触发，走后端接口 */
  const handleSearch = () => {
    setCurrentPage(1);
    fetchList();
  };

  const handleReset = () => {
    setKeyword('');
    setDateRange(null);
    setCurrentPage(1);
    fetchList('');
  };

  // v5 pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [jumpValue, setJumpValue] = useState('');

  // 筛选条件变化时重置到第一页（关键字改为后端查询，随 agents 变化联动）
  useEffect(() => {
    setCurrentPage(1);
  }, [agents, dateRange]);

  const filteredAgents = useMemo(() => filterByCreateTime(agents, dateRange, 'createTime'), [agents, dateRange]);
  const totalCount = filteredAgents.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const pagedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAgents.slice(start, start + pageSize);
  }, [filteredAgents, currentPage, pageSize]);

  // 表格列定义
  const allTableColumns: TableProps<AgentCard>['columns'] = [
    {
      align: 'left',
      className: 'col-assistant-name',
      dataIndex: 'name',
      key: 'name',
      minWidth: 200,
      onHeaderCell: () => ({ className: 'col-assistant-name' }),
      render: (text: string) => (
        <span style={{ fontWeight: 600 }} title={text}>{text}</span>
      ),
      title: '助手名称'
    },
    {
      align: 'left' as const,
      className: 'col-assistant-desc',
      dataIndex: 'description',
      key: 'description',
      width: 300,
      onHeaderCell: () => ({ className: 'col-assistant-desc' }),
      onCell: () => ({ style: { whiteSpace: 'normal', wordBreak: 'break-all' as const } }),
      render: (text: string) => text
        ? <Typography.Paragraph ellipsis={{ rows: 2, tooltip: text }} style={{ marginBottom: 0, fontSize: 'inherit', color: 'inherit' }}>{text}</Typography.Paragraph>
        : <span style={{ color: '#9ca3af' }}>-</span>,
      title: '助手描述'
    },
    {
      align: 'center',
      dataIndex: 'createBy',
      key: 'createBy',
      minWidth: 100,
      title: '创建用户'
    },
    {
      align: 'center',
      dataIndex: 'createTime',
      key: 'createTime',
      minWidth: 150,
      title: '创建时间'
    },
    {
      align: 'center',
      dataIndex: 'updateBy',
      key: 'updateBy',
      minWidth: 100,
      title: '操作人'
    },
    {
      align: 'center',
      dataIndex: 'updateTime',
      key: 'updateTime',
      minWidth: 150,
      title: '操作时间'
    },
    {
      align: 'center',
      fixed: 'right',
      key: 'operate',
      minWidth: 150,
      title: '操作',
      render: (_: any, record: AgentCard) => (
        <div className="ds-action-group">
          <AButton className="abi-action-link" size="small" variant="link" onClick={() => handleEdit(record)}>
            <EditOutlined style={{ marginRight: 3, fontSize: 12 }} />编辑
          </AButton>
          <Dropdown
            menu={{
              items: [
                {
                  key: 'metadata',
                  label: (
                    <span><ApartmentOutlined style={{ marginRight: 4 }} />元数据分析</span>
                  ),
                  onClick: () => setAnalysisContext({
                    nodeId: record.id,
                    nodeName: record.name,
                    nodeType: 'ASSISTANT',
                    spaceId: Number(localStorage.getItem('spaceId')) || undefined
                  })
                },
                { type: 'divider' },
                {
                  key: 'delete',
                  danger: true,
                  label: (
                    <APopconfirm title="提示" description="确定要删除吗？" onConfirm={() => handleDelete(record.id)}>
                      <span><DeleteOutlined style={{ marginRight: 4 }} />删除</span>
                    </APopconfirm>
                  ),
                },
              ],
            }}
          >
            <AButton className="abi-action-link" size="small" variant="link">
              更多 <DownOutlined style={{ fontSize: '0.625rem' }} />
            </AButton>
          </Dropdown>
        </div>
      )
    },
  ];

  const tableColumns = useMemo(() => {
    const visibleKeys = new Set(columnOptions.filter(c => c.visible).map(c => c.key));
    return allTableColumns!.filter(col => {
      if (col.key === 'operate') return true;
      if (col.key == null) return false;
      return visibleKeys.has(String(col.key));
    });
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
  const handleToggle = async (id: AgentCard['id'], checked: boolean) => {
    const nextStatus = checked ? '1' : '2';
    // 后端 update 接口校验应用名称非空，切换状态时需回传当前助手名称
    const appName = agents.find(it => it.id === id)?.name;
    setAgents(prev => prev.map(it => (it.id === id ? { ...it, status: nextStatus } : it)));
    // flat request 不会抛异常，失败时需判断 error 并回滚乐观更新（失败原因已由全局错误提示弹出）
    const { error } = await updateAppApi({ appId: id, appName, status: nextStatus });
    if (error) {
      setAgents(prev => prev.map(it => (it.id === id ? { ...it, status: checked ? '2' : '1' } : it)));
      return;
    }
    message.success(checked ? '已发布' : '已取消发布');
    syncShareAppStatus({ projectId: id, type: 'workflow', spaceId: spaceId || undefined, appStatus: checked ? 1 : 2 });
  };

  const handleDelete = async (id: AgentCard['id']) => {
    // flat request 不会抛异常，error 为空才能走成功流程；失败原因已由全局错误提示弹出
    const { error } = await deleteAppApi({ appId: id });
    if (error) return;
    setAgents(prev => prev.filter(it => it.id !== id));
    message.success('已删除');
    syncShareAppStatus({ projectId: id, type: 'workflow', spaceId: spaceId || undefined, appStatus: 0 });
  };

  // Batch delete
  const handleBatchDelete = async () => {
    if (checkedRowKeys.length === 0) {
      message.warning('请先选择要删除的助手');
      return;
    }
    const results = await Promise.all(checkedRowKeys.map(id => deleteAppApi({ appId: id as number | string })));
    const deletedKeys = checkedRowKeys.filter((_, index) => !results[index].error);
    const failCount = checkedRowKeys.length - deletedKeys.length;
    if (deletedKeys.length > 0) {
      setAgents(prev => prev.filter(it => !deletedKeys.includes(it.id)));
      setCheckedRowKeys(prev => prev.filter(key => !deletedKeys.includes(key)));
      setSelectedRows(prev => prev.filter(row => !deletedKeys.includes(row.id)));
      message.success(`成功删除 ${deletedKeys.length} 个助手`);
      deletedKeys.forEach(id => syncShareAppStatus({ projectId: id as number | string, type: 'workflow', spaceId: spaceId || undefined, appStatus: 0 }));
    }
    // 存在删除失败时以服务端为准刷新列表，避免本地状态与服务端不一致（失败原因已由全局错误提示弹出）
    if (failCount > 0) fetchList();
  };

  const rowSelection: TableProps<AgentCard>['rowSelection'] = {
    columnWidth: 48,
    fixed: true,
    selectedRowKeys: checkedRowKeys,
    onChange: (keys, rows) => {
      setCheckedRowKeys(keys);
      setSelectedRows(rows);
    },
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };
  const handlePrev = () => { if (currentPage > 1) handlePageChange(currentPage - 1); };
  const handleNext = () => { if (currentPage < totalPages) handlePageChange(currentPage + 1); };

  const handleJump = () => {
    const page = parseInt(jumpValue, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      handlePageChange(page);
      setJumpValue('');
    }
  };

  const renderPageNumbers = () => {
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
      return (
        <span key={page} className={`page-item ${isActive ? 'page-active' : ''}`} onClick={() => handlePageChange(page as number)}>
          {page}
        </span>
      );
    });
  };

  // Card grid
  const renderCardGrid = () => {
    if (pagedList.length === 0) {
      return (
        <div className="abi-card-empty">
          <Empty description="暂无助手" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      );
    }

    return (
      <div className="abi-card-grid">
        <div className="abi-card-grid-inner">
          {pagedList.map(agent => {
            const active = agent.id === selectedId;
            const online = agent.status === '1';
            const statusLabel = agent.status === '1' ? '当前启用' : agent.status === '0' ? '编辑中' : '历史版本';
            const tagCls = agent.status === '1' ? '' : agent.status === '0' ? 'draft' : 'off';
            return (
              <div
                key={agent.id}
                className={`abi-assistant-card${active ? ' selected' : ''}`}
                onClick={() => handleEdit(agent)}
              >
                {/* 头部：图标 + 标题/描述 + 状态开关 */}
                <div className="ac-head">
                  <AssistantIconBlock iconKey={agent.icon} radius={12} size={42} />
                  <div className="ac-main">
                    <div className="ac-title" title={agent.name}>{agent.name}</div>
                    <div className="ac-desc">{agent.description || '暂无描述'}</div>
                  </div>
                  <span onClick={e => e.stopPropagation()}>
                    <Switch checked={online} size="small" onChange={checked => handleToggle(agent.id, checked)} />
                  </span>
                </div>
                {/* 底部：状态标签 + 操作 */}
                <div className="ac-footer" onClick={e => e.stopPropagation()}>
                  <span className={`ac-tag ${tagCls}`}>{statusLabel}</span>
                  <div className="ac-actions">
                    <button className="ac-btn" onClick={() => handleEdit(agent)}>
                      <EditOutlined />编辑
                    </button>
                    <Dropdown
                      menu={{
                        items: [
                          {
                            key: 'metadata',
                            label: (<span><ApartmentOutlined style={{ marginRight: 4 }} />元数据分析</span>),
                            onClick: () => setAnalysisContext({
                              nodeId: agent.id,
                              nodeName: agent.name,
                              nodeType: 'ASSISTANT',
                              spaceId: Number(localStorage.getItem('spaceId')) || undefined
                            })
                          },
                          { type: 'divider' },
                          { key: 'delete', danger: true, label: '删除', onClick: () => handleDelete(agent.id) },
                        ]
                      }}
                      trigger={['click']}
                    >
                      <button className="ac-icon-btn"><MoreOutlined /></button>
                    </Dropdown>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      <Splitter style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* v5 Tree Panel — left sidebar */}
        <Splitter.Panel defaultSize={280} min={200} max={400} resizable>
          <div className="abi-group-sidebar" style={{ height: '100%' }}>
            <Group ref={groupRef} config={ASSISTANT_GROUP_CONFIG} onGroupId={setGroupId} onGroupsChange={setHasGroups} />
          </div>
        </Splitter.Panel>

        {/* Right content area */}
        <Splitter.Panel>
          <GroupContentGate hasGroups={hasGroups} onCreateGroup={() => groupRef.current?.openAddModal()}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', height: '100%' }}>
        {/* v5 Searchbar */}
        <section className="abi-searchbar">
          <SearchFilterBar
            searchPlaceholder="请输入助手名称"
            searchValue={keyword}
            onQuery={handleSearch}
            onReset={handleReset}
            onSearchChange={setKeyword}
            filters={
              <SearchFilterField label="时间范围">
                <DeferredRangePicker
                  allowClear
                  className="abi-field-input"
                  format="YYYY-MM-DD"
                  getPopupContainer={getFilterPopupContainer}
                  placeholder={['开始时间', '结束时间']}
                  value={dateRange}
                  onChange={(dates) => setDateRange(dates)}
                />
              </SearchFilterField>
            }
          />
        </section>

        {/* v5 Data Area */}
        <section className="abi-data-area">
          <div className="abi-toolbar">
            <div className="abi-toolbar-left">
              <AButton type="primary" className="btn-accent-gradient" onClick={handleAdd}>
                <PlusOutlined /> 新增助手
              </AButton>
              <AButton danger
                disabled={checkedRowKeys.length === 0}
                onClick={handleBatchDelete}
              >
                <DeleteOutlined /> 批量删除{checkedRowKeys.length ? `(${checkedRowKeys.length})` : ''}
              </AButton>
            </div>
            <ViewControls
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
              columns={columnOptions}
              onColumnToggle={handleColumnToggle}
            />
          </div>
          <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
            <Spin spinning={loading}>
            {agents.length === 0 && !loading ? (
              <div className="abi-card-empty">
                <Empty description="暂无助手" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              </div>
            ) : viewMode === 'list' ? (
              <div style={{
                border: '1px solid rgba(130,140,200,0.18)',
                borderRadius: 12,
                overflow: 'hidden',
                flex: 1,
                minHeight: 0,
                width: '100%',
                maxHeight: '100%'
              }}>
                <div className="assistant-table-scroll" style={{ overflow: 'auto', maxHeight: '100%' }}>
                  <ATable
                    rowKey="id"
                    columns={tableColumns as any}
                    dataSource={pagedList}
                    pagination={false}
                    locale={{ emptyText: <TableEmpty description="暂无助手" /> }}
                    size="middle"
                    className="assistant-table abi-std-table"
                    scroll={pagedList.length > 0 ? { x: 'max-content' } : undefined}
                    rowSelection={viewMode === 'list' ? rowSelection : undefined}
                  />
                </div>
              </div>
            ) : (
              renderCardGrid()
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
                  { label: '10条/页', value: 10 },
                  { label: '15条/页', value: 15 },
                  { label: '20条/页', value: 20 },
                  { label: '25条/页', value: 25 },
                  { label: '30条/页', value: 30 },
                ]}
                className="page-size-select"
              />
              <button className="page-btn" disabled={currentPage === 1} onClick={handlePrev}>
                <LeftOutlined />
              </button>
              {renderPageNumbers()}
              <button className="page-btn" disabled={currentPage >= totalPages} onClick={handleNext}>
                <RightOutlined />
              </button>
              <span className="quick-jumper">
                前往
                <AInput
                  className="jump-input"
                  style={{ width: 48, textAlign: 'center' }}
                  value={jumpValue}
                  onChange={(e: any) => setJumpValue(e.target.value)}
                  onPressEnter={handleJump}
                />
                页
              </span>
            </div>
          </div>
        </section>
          </div>
          </GroupContentGate>
        </Splitter.Panel>
      </Splitter>

      <AssistantEditDrawer
        visible={editVisible}
        onClose={(refresh) => {
          setEditVisible(false);
          if (refresh) fetchList();
        }}
        agent={editingAgent}
        groupId={groupId && groupId !== '0' ? groupId : undefined}
      />

      <MetadataAnalysisDrawer
        context={analysisContext}
        open={Boolean(analysisContext)}
        onClose={() => setAnalysisContext(null)}
      />
    </div>
  );
}
