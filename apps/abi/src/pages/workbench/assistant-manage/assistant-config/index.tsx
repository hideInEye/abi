import { ApartmentOutlined, DeleteOutlined, DownOutlined, EditOutlined, LeftOutlined, MoreOutlined, PlusOutlined, RightOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { Dropdown, Empty, Popconfirm, Select, Switch, message } from 'antd';
import type { TableProps } from 'antd';

import { Group } from '@/components/stateful/group/Group';
import type { GroupProps } from '@/components/stateful/group/Group';
import MetadataAnalysisDrawer from '@/components/metadata-analysis/MetadataAnalysisDrawer';
import type { MetadataAnalysisContext } from '@/components/metadata-analysis/types';
import { ViewControls } from '@/components/ViewControls';
import type { ColumnOption } from '@/components/ViewControls';

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

interface AgentCard extends AgentMock {
  type: '助手' | '技能';
  iconBg: string;
  iconLetter: string;
  selected?: boolean;
  createBy?: string;
  groupId?: number;
  createTime?: string;
  updateTime?: string;
}

const MOCK_AGENTS: AgentCard[] = [
  {
    createBy: 'admin',
    createTime: '2024-01-15 10:30:00',
    updateTime: '2024-01-20 14:20:00',
    description: '提供股票、指数的实时行情以及历史行情查询，以及市场情况分析、投资知识普及。',
    groupId: 1,
    iconBg: '#fa8c16',
    iconLetter: '=',
    id: 1,
    name: '预置勿动_智能投顾助手',
    selected: true,
    status: '2',
    type: '助手'
  },
  {
    createBy: 'admin',
    createTime: '2024-01-16 09:15:00',
    updateTime: '2024-01-18 16:45:00',
    description: 'test',
    groupId: 3,
    iconBg: '#52c41a',
    iconLetter: '✦',
    id: 2,
    name: 'AutoGen_Sara回归技能模板',
    type: '技能'
  },
  {
    createBy: 'admin',
    createTime: '2024-01-17 11:20:00',
    updateTime: '2024-01-19 10:30:00',
    description: '提供实时股票价格查询和市场行情分析服务。',
    groupId: 5,
    iconBg: '#7cb305',
    iconLetter: '=',
    id: 3,
    name: '投顾助手',
    type: '助手'
  },
  {
    createBy: 'admin',
    createTime: '2024-01-18 14:00:00',
    updateTime: '2024-01-20 09:15:00',
    description: '根据提示词创作玄幻小说，包括大章划分和各章节内容概述。',
    groupId: 4,
    iconBg: '#722ed1',
    iconLetter: '=',
    id: 4,
    name: '小说生成',
    type: '助手'
  },
  {
    createBy: 'admin',
    createTime: '2024-01-19 16:30:00',
    updateTime: '2024-01-21 11:45:00',
    description: '回答关于金融风控方面的问题。',
    groupId: 6,
    iconBg: '#fa541c',
    iconLetter: '=',
    id: 5,
    name: '预置勿动_互联网金融风控答疑助手',
    type: '助手'
  },
  {
    createBy: 'admin',
    createTime: '2024-01-20 08:45:00',
    updateTime: '2024-01-22 15:20:00',
    description: '快速查询宏观经济数据以及图表绘制，提供辅助研究服务。',
    groupId: 1,
    iconBg: '#fa8c16',
    iconLetter: '=',
    id: 6,
    name: '预置勿动_宏观研究员助手',
    type: '助手'
  },
  {
    createBy: 'admin',
    createTime: '2024-01-21 13:15:00',
    updateTime: '2024-01-23 10:00:00',
    description: '为您提供全面的 SWOT 公司分析报告，帮助您详细了解指定公司的优势、劣势、机会和威胁。',
    groupId: 1,
    iconBg: '#52c41a',
    iconLetter: '=',
    id: 7,
    name: '预置勿动_公司分析助手',
    type: '助手'
  },
  {
    createBy: 'admin',
    createTime: '2024-01-22 10:00:00',
    updateTime: '2024-01-24 14:30:00',
    description: '一名 Excel 全能助手，可以帮助你解决 Excel 相关的问题和提供高效的数据处理方案。',
    groupId: 2,
    iconBg: '#13c2c2',
    iconLetter: '=',
    id: 8,
    name: '预置勿动_Excel助手',
    type: '助手'
  },
  {
    createBy: 'admin',
    createTime: '2024-01-23 15:45:00',
    updateTime: '2024-01-25 09:30:00',
    description: '为你生成专业、结构化的中文周报。',
    groupId: 2,
    iconBg: '#1677ff',
    iconLetter: '=',
    id: 9,
    name: '预置勿动_周报写作助手',
    type: '助手'
  },
  {
    createBy: 'admin',
    createTime: '2024-01-24 11:30:00',
    updateTime: '2024-01-26 16:15:00',
    description: '解决电脑，手机，打印机，投影仪，路由器等电器问题',
    groupId: 2,
    iconBg: '#fa541c',
    iconLetter: '=',
    id: 10,
    name: '预置勿动_电脑助手',
    type: '助手'
  },
  {
    createBy: 'admin',
    createTime: '2024-01-25 09:00:00',
    updateTime: '2024-01-27 13:45:00',
    description: '提供各种与税法相关的帮助和信息',
    groupId: 1,
    iconBg: '#722ed1',
    iconLetter: '=',
    id: 11,
    name: '预置勿动_税法助手',
    type: '助手'
  },
  {
    createBy: 'admin',
    createTime: '2024-01-26 14:20:00',
    updateTime: '2024-01-28 10:30:00',
    description: '给代码生成单元测试',
    groupId: 3,
    iconBg: '#52c41a',
    iconLetter: '=',
    id: 12,
    name: '预置勿动_开发测试助手',
    type: '助手'
  },
  {
    createBy: 'admin',
    createTime: '2024-01-27 16:00:00',
    updateTime: '2024-01-29 11:15:00',
    description: '一名全能的编程专家，擅长项目设计以及具体的编码。',
    groupId: 3,
    iconBg: '#1677ff',
    iconLetter: '=',
    id: 13,
    name: '预置勿动_编程助手',
    type: '助手'
  },
  {
    createBy: 'admin',
    createTime: '2024-01-28 10:45:00',
    updateTime: '2024-01-30 15:00:00',
    description: '在准确表达原文事实和背景的基础上，进一步润色使得符合中文表达习惯。',
    groupId: 4,
    iconBg: '#fa8c16',
    iconLetter: '=',
    id: 14,
    name: '预置勿动_高级翻译助手',
    type: '助手'
  }
];

export function Component() {
  const [keyword, setKeyword] = useState('');
  const [editVisible, setEditVisible] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AgentCard | null>(null);
  const [selectedId, setSelectedId] = useState<string | number>(1);
  const [groupId, setGroupId] = useState<number>(0);
  const [agents, setAgents] = useState<AgentCard[]>(() =>
    MOCK_AGENTS.map(a => ({ createBy: 'admin', status: '1' as const, ...a }))
  );
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
      arr = arr.filter(it => it.groupId === groupId);
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
  const [pageSize, setPageSize] = useState(10);
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
      align: 'left',
      dataIndex: 'description',
      key: 'description',
      minWidth: 300,
      render: (text: string) => (
        <ATooltip title={text} placement="topLeft">
          <div style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: '1.5',
            maxHeight: '3em'
          }}>
            {text || '-'}
          </div>
        </ATooltip>
      ),
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
    return allTableColumns!.filter(col => col.key === 'operate' || visibleKeys.has(col.key));
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
    setAgents(prev => prev.map(it => (it.id === id ? { ...it, status: checked ? '1' : '2' } : it)));
    message.success(checked ? '已发布' : '已下线');
  };

  const handleDelete = (id: AgentCard['id']) => {
    setAgents(prev => prev.filter(it => it.id !== id));
    message.success('已删除');
  };

  // Batch delete
  const handleBatchDelete = () => {
    if (checkedRowKeys.length === 0) {
      message.warning('请先选择要删除的助手');
      return;
    }
    setAgents(prev => prev.filter(it => !checkedRowKeys.includes(it.id)));
    setCheckedRowKeys([]);
    setSelectedRows([]);
    message.success(`成功删除 ${checkedRowKeys.length} 个助手`);
  };

  const rowSelection: TableProps<AgentCard>['rowSelection'] = {
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
                        borderRadius: 6,
                        color: '#fff',
                        display: 'flex',
                        flexShrink: 0,
                        fontSize: 14,
                        fontWeight: 700,
                        height: 28,
                        justifyContent: 'center',
                        width: 28
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
                  <div className="row"><span className="lbl">创建时间</span><span className="val">{agent.createTime || '-'}</span></div>
                </div>
                <div className="abi-data-card-footer" onClick={e => e.stopPropagation()}>
                  <button className="abi-card-act" onClick={() => handleEdit(agent)}>
                    <EditOutlined style={{ marginRight: 3 }} />编辑
                  </button>
                  <button className="abi-card-act" onClick={() => setAnalysisContext({
                    nodeId: agent.id,
                    nodeName: agent.name,
                    nodeType: 'ASSISTANT',
                    spaceId: Number(localStorage.getItem('spaceId')) || undefined
                  })}>
                    <ApartmentOutlined style={{ marginRight: 3 }} />元数据
                  </button>
                  <Dropdown
                    menu={{
                      items: [
                        { key: 'delete', danger: true, label: '删除' },
                      ],
                      onClick: ({ key, domEvent }) => {
                        domEvent.stopPropagation();
                        if (key === 'delete') handleDelete(agent.id);
                      }
                    }}
                    trigger={['click']}
                  >
                    <button className="abi-card-more" onClick={(e) => e.stopPropagation()}>
                      <MoreOutlined />
                    </button>
                  </Dropdown>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
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
              style={{ width: '220px' }}
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
            <AButton type="primary" className="btn-accent-gradient" onClick={handleSearch}>
              <SearchOutlined /> 查询
            </AButton>
            <AButton className="btn-ghost-v5" onClick={handleReset}>
              <ReloadOutlined /> 重置
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
              <AButton
                className="btn-ghost-v5"
                disabled={checkedRowKeys.length === 0}
                onClick={handleBatchDelete}
              >
                <DeleteOutlined /> 批量删除
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
            {list.length === 0 ? (
              <div style={{ marginTop: 80 }}>
                <Empty description="暂无助手" />
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

      <AssistantEditDrawer
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        agent={editingAgent}
      />

      <MetadataAnalysisDrawer
        context={analysisContext}
        open={Boolean(analysisContext)}
        onClose={() => setAnalysisContext(null)}
      />
    </div>
  );
}
