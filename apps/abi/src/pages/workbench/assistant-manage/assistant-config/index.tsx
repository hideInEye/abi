import { DeleteOutlined, SearchOutlined, SettingOutlined, UserOutlined } from '@ant-design/icons';
import { Empty, Input, Popconfirm, Switch, message } from 'antd';

import PageTitle from '@/components/stateless/common/PageTitle';

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
  panelTitle: '文件夹',
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
    <div className="h-full min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
      <ACard
        className="flex-col-stretch sm:flex-1-hidden card-wrapper h-full border-0"
        styles={{ body: { flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' } }}
      >
        <div className="flex items-center justify-between" style={{ paddingBottom: '0.5rem' }}>
          <PageTitle />
          <AButton type="primary" onClick={handleAdd}>
            新增助手
          </AButton>
        </div>

        <AFlex className="gap-6 h-full" style={{ flex: 1, minHeight: 0 }}>
          {/* 左侧：分组树 */}
          <div style={{ borderRight: '0.0625rem solid #d9d9d9', paddingRight: '1rem' }}>
            <Group config={ASSISTANT_GROUP_CONFIG} onGroupId={setGroupId} />
          </div>

          {/* 右侧：搜索 + 卡片网格 */}
          <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden">
            <div className="mb-3">
              <Input
                allowClear
                placeholder="请输入助手名称"
                prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                style={{ width: '12rem' }}
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
              />
            </div>

            {/* 卡片网格 */}
            <div style={{ flex: 1, overflow: 'auto' }}>
              {list.length === 0 ? (
                <div style={{ marginTop: 80 }}>
                  <Empty description="暂无助手" />
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gap: 16,
                    gridTemplateColumns: 'repeat(2, 1fr)'
                  }}
                >
                  {list.map(agent => {
                    const active = agent.id === selectedId;
                    return (
                      <div
                        key={agent.id}
                        style={{
                          background: '#fff',
                          border: active ? '2px solid #ff4d4f' : '1px solid #d9d9d9',
                          borderRadius: 8,
                          boxShadow: '0 2px 8px 0 rgba(0,0,0,0.08)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          minHeight: 180,
                          padding: 16,
                          position: 'relative',
                          transition: 'all 0.2s'
                        }}
                        onClick={() => handleEdit(agent)}
                      >
                        {/* 标题行：图标 + 名称 + 开关 */}
                        <div style={{ alignItems: 'flex-start', display: 'flex', gap: 10 }}>
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
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: 14,
                                fontWeight: 600,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {agent.name}
                            </div>
                          </div>
                          <span onClick={e => e.stopPropagation()}>
                            <Switch
                              checked={agent.status === '1'}
                              size="small"
                              onChange={checked => handleToggle(agent.id, checked)}
                            />
                          </span>
                        </div>
                        {/* 描述 */}
                        <div
                          style={{
                            color: '#8c8c8c',
                            display: '-webkit-box',
                            flex: 1,
                            fontSize: 12,
                            lineHeight: 1.6,
                            marginTop: 12,
                            overflow: 'hidden',
                            WebkitBoxOrient: 'vertical',
                            WebkitLineClamp: 2
                          }}
                        >
                          {agent.description}
                        </div>
                        {/* 底部：创建用户 + 设置/删除 */}
                        <div
                          style={{
                            alignItems: 'center',
                            borderTop: '1px solid #f5f5f5',
                            color: '#8c8c8c',
                            display: 'flex',
                            fontSize: 12,
                            marginTop: 12,
                            paddingTop: 10
                          }}
                        >
                          <UserOutlined style={{ marginRight: 6 }} />
                          <span>创建用户 {agent.createBy || '-'}</span>
                          <span
                            style={{ display: 'flex', gap: 12, marginLeft: 'auto' }}
                            onClick={e => e.stopPropagation()}
                          >
                            <SettingOutlined
                              style={{ color: '#8c8c8c', cursor: 'pointer', fontSize: 14 }}
                              onClick={() => handleEdit(agent)}
                            />
                            <Popconfirm
                              cancelText="取消"
                              okText="删除"
                              okType="danger"
                              title="确定删除该助手？"
                              onConfirm={() => handleDelete(agent.id)}
                            >
                              <DeleteOutlined style={{ color: '#8c8c8c', cursor: 'pointer', fontSize: 14 }} />
                            </Popconfirm>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </AFlex>
      </ACard>

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
