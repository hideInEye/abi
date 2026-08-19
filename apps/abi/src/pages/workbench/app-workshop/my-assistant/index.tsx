import { EyeOutlined, LeftOutlined, PoweroffOutlined, RightOutlined, ShareAltOutlined } from '@ant-design/icons';
import { Empty, Modal, Select, Spin, message } from 'antd';

import { DeferredRangePicker, SearchFilterBar, SearchFilterField, getFilterPopupContainer } from '@/components/SearchFilterBar';
import { AssistantIconBlock } from '@/components/AssistantIcon';
import { getSpaceId } from '@/store/slice/app';
import { useAppSelector } from '@/hooks/business/useStore';
import { fetchAppListApi, updateAppApi } from '@/service/api/abi-chat-app';
import { tableSemanticsGroupList } from '@/service/api/table-semantics';
import { filterByCreateTime } from '@/utils/date';

import AssistantEditDrawer, { type AgentMock } from '@/pages/workbench/assistant-manage/assistant-config/modules/assistant-edit-drawer';
import DataDirectoryDropdown from './DataDirectoryDropdown';
import AssistantShareModal from './AssistantShareModal';

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

/**
 * 我的助手 - 助手列表页
 * 只展示已上线的助手（status='1'），版式与「助手编排」右侧内容区保持一致
 * （无左侧分组，无新增 / 批量删除）
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

export const Component: React.FC & { loader?: () => Promise<any> } = () => {
  const spaceId = useAppSelector(getSpaceId);
  const [keyword, setKeyword] = useState('');
  const [groupId, setGroupId] = useState<string>('');
  const [groups, setGroups] = useState<any[]>([]);
  const [editVisible, setEditVisible] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AgentCard | null>(null);
  const [selectedId, setSelectedId] = useState<string | number>(1);
  const [agents, setAgents] = useState<AgentCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);
  // 分享弹窗：当前分享的助手（为空时关闭）
  const [shareAgent, setShareAgent] = useState<AgentCard | null>(null);

  /** 拉取助手列表（仅已上线，searchName 未传时使用当前搜索关键字） */
  async function fetchList(searchName?: string) {
    setLoading(true);
    try {
      const name = (searchName ?? keyword).trim();
      const res: any = await fetchAppListApi({
        appName: name || undefined,
        spaceId: spaceId || undefined,
        status: '1', // 只显示已上线的助手
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
    setCurrentPage(1);
    fetchList();
  }, [spaceId]);

  // 拉取助手分组目录（groupType=assistant），供「数据目录」下拉筛选
  useEffect(() => {
    tableSemanticsGroupList({ groupType: 'assistant' as any, pageNum: 1, pageSize: 60, spaceId: Number(spaceId) || (undefined as any) })
      .then((res: any) => {
        const list = res?.data?.rows || res?.data || [];
        setGroups(Array.isArray(list) ? list : []);
      })
      .catch(() => setGroups([]));
  }, [spaceId]);

  /** 查询：由 SearchFilterBar 停止输入 1s 防抖 / 回车 / 面板查询按钮触发，走后端接口 */
  const handleSearch = () => {
    setCurrentPage(1);
    fetchList();
  };

  const handleReset = () => {
    setKeyword('');
    setDateRange(null);
    setGroupId('');
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
  }, [agents, dateRange, groupId]);

  // 先按数据目录（分组）客户端过滤（仅当前分组自身，不含子分组），再按创建时间过滤
  const groupFilteredAgents = useMemo(() => {
    if (!groupId) return agents;
    return agents.filter(a => a.groupId != null && String(a.groupId) === groupId);
  }, [agents, groupId]);
  const filteredAgents = useMemo(() => filterByCreateTime(groupFilteredAgents, dateRange, 'createTime'), [groupFilteredAgents, dateRange]);
  const totalCount = filteredAgents.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const pagedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAgents.slice(start, start + pageSize);
  }, [filteredAgents, currentPage, pageSize]);

  /** 查看：以只读模式打开助手配置抽屉 */
  const handleView = (agent: AgentCard) => {
    setSelectedId(agent.id);
    setEditingAgent(agent);
    setEditVisible(true);
  };

  /** 下线：将助手状态置为已下线（status='2'），成功后刷新列表 */
  const handleOffline = (agent: AgentCard) => {
    Modal.confirm({
      title: '确认下线',
      content: `确认要下线「${agent.name}」吗？`,
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          await updateAppApi({ appId: agent.id, appName: agent.name, status: '2' });
          message.success('已下线');
          fetchList();
        } catch {
          message.error('下线失败');
        }
      },
    });
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
            const statusLabel = agent.status === '1' ? '已上线' : agent.status === '0' ? '草稿' : '已下线';
            const tagCls = agent.status === '1' ? '' : agent.status === '0' ? 'draft' : 'off';
            return (
              <div
                key={agent.id}
                className={`abi-assistant-card${active ? ' selected' : ''}`}
                onClick={() => handleView(agent)}
              >
                {/* 头部：图标 + 标题/描述 */}
                <div className="ac-head">
                  <AssistantIconBlock iconKey={agent.icon} radius={12} size={42} />
                  <div className="ac-main">
                    <div className="ac-title" title={agent.name}>{agent.name}</div>
                    <div className="ac-desc">{agent.description || '暂无描述'}</div>
                  </div>
                </div>
                {/* 底部：状态标签 + 操作（查看 / 下线 / 分享） */}
                <div className="ac-footer" onClick={e => e.stopPropagation()}>
                  <span className={`ac-tag ${tagCls}`}>{statusLabel}</span>
                  <div className="ac-actions">
                    <button className="ac-btn" onClick={() => handleView(agent)}>
                      <EyeOutlined />查看
                    </button>
                    <button className="ac-btn" onClick={() => handleOffline(agent)}>
                      <PoweroffOutlined />下线
                    </button>
                    <button className="ac-btn" onClick={() => setShareAgent(agent)}>
                      <ShareAltOutlined />分享
                    </button>
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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', height: '100%' }}>
        {/* v5 Searchbar */}
        <section className="abi-searchbar">
          <SearchFilterBar
            searchPlaceholder="请输入助手名称"
            searchValue={keyword}
            onQuery={handleSearch}
            onReset={handleReset}
            onSearchChange={setKeyword}
            extra={
              <DataDirectoryDropdown
                groups={groups}
                assistants={agents}
                value={groupId}
                onChange={(id) => { setGroupId(id); setCurrentPage(1); }}
              />
            }
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
          <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
            <Spin spinning={loading}>
              {renderCardGrid()}
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

      <AssistantEditDrawer
        visible={editVisible}
        readOnly
        onClose={(refresh) => {
          setEditVisible(false);
          if (refresh) fetchList();
        }}
        agent={editingAgent}
        groupId={editingAgent?.groupId}
      />

      <AssistantShareModal
        agent={shareAgent}
        open={Boolean(shareAgent)}
        onClose={() => setShareAgent(null)}
      />
    </div>
  );
};

export default Component;
