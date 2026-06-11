import { DeleteOutlined, EditOutlined, LeftOutlined, MoreOutlined, PlusOutlined, RightOutlined, SearchOutlined } from '@ant-design/icons';
import { Dropdown, Empty, Popconfirm, Select, Switch, message } from 'antd';

// import PageTitle from '@/components/stateless/common/PageTitle';

import { Group } from '@/components/stateful/group/Group';
import type { GroupProps } from '@/components/stateful/group/Group';

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
 * AI 助手列表页（静态卡片版）
 * - 后期接入接口时只需将 MOCK_AGENTS 替换为接口返回数据
 */

interface AgentCard extends AgentMock {
  type: '助手' | '技能';
  iconBg: string;
  iconLetter: string;
  selected?: boolean;
  createBy?: string;
  groupId?: number;
}

const MOCK_AGENTS: AgentCard[] = [
  {
    createBy: 'admin',
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
    description: 'test',
    groupId: 3,
    iconBg: '#52c41a',
    iconLetter: '✦',
    id: 2,
    name: 'AutoGen_Sara回归技能模板',
    type: '技能'
  },
  {
    description: '提供实时股票价格查询和市场行情分析服务。',
    groupId: 5,
    iconBg: '#7cb305',
    iconLetter: '=',
    id: 3,
    name: '投顾助手',
    type: '助手'
  },
  {
    description: '根据提示词创作玄幻小说，包括大章划分和各章节内容概述。',
    groupId: 4,
    iconBg: '#722ed1',
    iconLetter: '=',
    id: 4,
    name: '小说生成',
    type: '助手'
  },
  {
    description: '回答关于金融风控方面的问题。',
    groupId: 6,
    iconBg: '#fa541c',
    iconLetter: '=',
    id: 5,
    name: '预置勿动_互联网金融风控答疑助手',
    type: '助手'
  },
  {
    description: '快速查询宏观经济数据以及图表绘制，提供辅助研究服务。',
    groupId: 1,
    iconBg: '#fa8c16',
    iconLetter: '=',
    id: 6,
    name: '预置勿动_宏观研究员助手',
    type: '助手'
  },
  {
    description: '为您提供全面的 SWOT 公司分析报告，帮助您详细了解指定公司的优势、劣势、机会和威胁。',
    groupId: 1,
    iconBg: '#52c41a',
    iconLetter: '=',
    id: 7,
    name: '预置勿动_公司分析助手',
    type: '助手'
  },
  {
    description: '一名 Excel 全能助手，可以帮助你解决 Excel 相关的问题和提供高效的数据处理方案。',
    groupId: 2,
    iconBg: '#13c2c2',
    iconLetter: '=',
    id: 8,
    name: '预置勿动_Excel助手',
    type: '助手'
  },
  {
    description: '为你生成专业、结构化的中文周报。',
    groupId: 2,
    iconBg: '#1677ff',
    iconLetter: '=',
    id: 9,
    name: '预置勿动_周报写作助手',
    type: '助手'
  },
  {
    description: '解决电脑，手机，打印机，投影仪，路由器等电器问题',
    groupId: 2,
    iconBg: '#fa541c',
    iconLetter: '=',
    id: 10,
    name: '预置勿动_电脑助手',
    type: '助手'
  },
  {
    description: '提供各种与税法相关的帮助和信息',
    groupId: 1,
    iconBg: '#722ed1',
    iconLetter: '=',
    id: 11,
    name: '预置勿动_税法助手',
    type: '助手'
  },
  {
    description: '给代码生成单元测试',
    groupId: 3,
    iconBg: '#52c41a',
    iconLetter: '=',
    id: 12,
    name: '预置勿动_开发测试助手',
    type: '助手'
  },
  {
    description: '一名全能的编程专家，擅长项目设计以及具体的编码。',
    groupId: 3,
    iconBg: '#1677ff',
    iconLetter: '=',
    id: 13,
    name: '预置勿动_编程助手',
    type: '助手'
  },
  {
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
              className="abi-field-input"
              style={{ width: '16rem' }}
            />
            <AButton type="primary" className="btn-accent-gradient" onClick={handleAdd}>
              <PlusOutlined /> 新增助手
            </AButton>
          </div>
        </section>

        {/* v5 Data Area */}
        <section className="abi-data-area">
          <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
            {list.length === 0 ? (
              <div style={{ marginTop: 80 }}>
                <Empty description="暂无助手" />
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
          onClose={() => {
            setEditVisible(false);
            setEditingAgent(null);
          }}
        />
      ) : null}
    </div>
  );
}
