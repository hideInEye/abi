import { DeleteOutlined, DownOutlined, EditOutlined, EyeOutlined, LeftOutlined, MoreOutlined, ReloadOutlined, RightOutlined, SearchOutlined, SyncOutlined } from '@ant-design/icons';
import { App, Button, Dropdown, Empty, Input, Select, Spin, Tabs, Tooltip, Typography } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';

// import PageTitle from '@/components/stateless/common/PageTitle';
import { deleteSkillApi, querySkillListApi, updateSkillStatusApi } from '@/service/api/skill';
import { fetchOperateNew, fetchOperateNewList } from '@/service/api/operateRecord';
import { getSpaceId } from '@/store/slice/app';
import { useAppSelector } from '@/hooks/business/useStore';
import { ViewControls } from '@/components/ViewControls';
import type { ColumnOption } from '@/components/ViewControls';
import { DeferredRangePicker, SearchFilterBar, SearchFilterField, getFilterPopupContainer } from '@/components/SearchFilterBar';
import { filterByCreateTime } from '@/utils/date';
import { AssistantIconBlock } from '@/components/AssistantIcon';
import type { AssistantIconKey } from '@/components/AssistantIcon';

import SkillDetailDrawer from './modules/skill-detail-drawer';
import SkillEditDrawer from './modules/skill-edit-drawer';
import SkillPublishDrawer from './modules/skill-publish-drawer';

import './skill.css';

type SkillItem = {
  id: number | string;
  bizName?: string;
  spaceId?: number | string;
  spaceName?: string;
  summary?: string;
  status?: string;
  skillType?: number | string;
  visibility?: string;
  latestVersionId?: number | string;
  createdBy?: string;
  createTime?: string;
  updateTime?: string;
  icon?: string;
};

/** 根据技能 id 稳定散列到预设图标 key（兜底逻辑，仅在接口无 icon 字段时使用） */
const ICON_KEYS: AssistantIconKey[] = ['data', 'table', 'orchestration', 'flow', 'automation', 'text', 'chat', 'doc', 'finance', 'account', 'ops', 'security', 'analysis', 'chart', 'other'];
function skillIconKey(id: number | string): AssistantIconKey {
  const hash = String(id).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return ICON_KEYS[hash % ICON_KEYS.length];
}

type StatusKey = 'published' | 'hidden' | 'archived' | 'review' | 'rejected' | 'scanning' | 'draft' | 'offline';

function resolveStatusKey(status?: string): StatusKey {
  if (status === '1') return 'published';
  if (status === '0' || status === 'DRAFT') return 'offline';
  if (status === 'HISTORY' || status === 'ARCHIVED') return 'archived';
  if (status === 'PENDING_REVIEW') return 'review';
  if (status === 'REJECTED') return 'rejected';
  if (status === 'SCANNING' || status === 'UPLOADED') return 'scanning';
  return 'offline';
}

/** 技能类型：0 内置技能，其余（含默认 1、缺省）视为外部技能 */
function resolveSkillTypeLabel(skillType?: number | string): string {
  return String(skillType) === '0' ? '内置技能' : '外部技能';
}

/** 技能名称列：2行截断 + Tooltip 悬浮显示全文，最大宽度 150px */
function NameCell({ text }: { text?: string }) {
  if (!text) return <span style={{ color: '#9ca3af' }}>-</span>;
  return (
    <Tooltip title={text} placement="topLeft">
      <span className="skill-name-cell">{text}</span>
    </Tooltip>
  );
}

export function Component() {
  const { t } = useTranslation();
  const { message, modal } = App.useApp();
  const spaceId = useAppSelector(getSpaceId);

  const [tab, setTab] = useState<'plaza' | 'mine'>('plaza');
  const [statusFilter, setStatusFilter] = useState<'ALL' | '1' | '0'>('ALL');
  const [keyword, setKeyword] = useState('');
  const [list, setList] = useState<SkillItem[]>([]);
  // 已添加到「我的技能」的技能 id（以后端为准：不读本地存储，切到「我的技能」tab 才拉 favorite/list，addOrRemove 按响应回写）
  const [myIds, setMyIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  // 收藏列表加载中：未返回前不渲染列表，避免广场「添加」先闪一下再变「已添加」
  const [favLoading, setFavLoading] = useState(true);
  const [publishOpen, setPublishOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeSkill, setActiveSkill] = useState<SkillItem | null>(null);
  // 更新文件弹窗
  const [updateOpen, setUpdateOpen] = useState(false);
  const [updatingSkill, setUpdatingSkill] = useState<SkillItem | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<SkillItem | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'card'>('card');
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  // 标记刚刚点击了 Dropdown 菜单项，阻止卡片 onClick 冒泡触发详情弹窗
  const menuActionRef = useRef(false);
  const [columnOptions, setColumnOptions] = useState<ColumnOption[]>([
    { key: 'bizName', label: '技能名称', visible: true },
    { key: 'summary', label: '技能描述', visible: true },
    { key: 'status', label: '状态', visible: true },
    { key: 'spaceName', label: '空间', visible: true },
    { key: 'operate', label: '操作', visible: true },
  ]);
  const handleColumnToggle = (key: string, visible: boolean) => {
    setColumnOptions(prev => prev.map(c => c.key === key ? { ...c, visible } : c));
  };
  const handleViewModeChange = (mode: 'list' | 'card') => {
    setSelectedRowKeys([]);
    setViewMode(mode);
  };

  async function fetchList() {
    setLoading(true);
    try {
      // 不传 spaceId 查全部，前端按 visibility 过滤：公开全平台可见 / 私有所属空间可见
      const res: any = await querySkillListApi({});
      const rows = res?.response?.data?.data?.rows || res?.response?.data?.rows || res?.data?.rows || res?.data?.data || res?.data || [];
      setList(Array.isArray(rows) ? rows : []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }

  // 「我的技能」集合只在进入该 tab 时拉取（对齐 chat 技能商店），广场 tab 不请求收藏接口；
  // 先清空前端残留的旧集合，只以当次接口返回渲染，避免重复进 tab 时先闪旧数据再刷新
  async function fetchMyIds() {
    setFavLoading(true);
    setMyIds([]);
    try {
      const res: any = await fetchOperateNewList({ favorType: 'skill' });
      const body = res?.response?.data;
      const rows = body?.rows ?? body?.data?.rows ?? body?.data?.list ?? (Array.isArray(body?.data) ? body.data : []);
      setMyIds((Array.isArray(rows) ? rows : []).map((r: any) => String(r.favorId ?? r.favor_id ?? r.skillId ?? '')).filter(Boolean));
    } catch {
      // 拉取失败保持空集合，不打断页面
    } finally {
      setFavLoading(false);
    }
  }

  // 「我的技能」集合：切到该 tab 再拉一次收藏列表校准（以最新后端数据渲染）
  useEffect(() => {
    if (tab === 'mine') {
      fetchMyIds();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // 首次挂载直接调两个列表：技能列表 + 收藏列表（我的技能），广场「已添加」状态对比两者得出，不调单条状态接口；
  // 空间切换由前端 visibleList 重新过滤，无需重新请求
  useEffect(() => {
    fetchList();
    fetchMyIds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function goPublish() {
    setPublishOpen(true);
  }

  function goDetail(item: SkillItem) {
    setActiveSkill(item);
    setDetailOpen(true);
  }

  function openUpdate(item: SkillItem) {
    setUpdatingSkill(item);
    setUpdateOpen(true);
  }

  function openEdit(item: SkillItem) {
    setEditingSkill(item);
    setEditOpen(true);
  }

  // 广场卡片右上角「添加」：走收藏接口（addOrRemove 由后端切换状态），类型为 skill，按响应 favoriteStatus 回写，不做乐观更新、不落本地存储
  async function handleAddSkill(item: SkillItem) {
    const id = String(item.id);
    if (myIds.includes(id)) {
      message.info('已在我的技能中');
      return;
    }
    try {
      const res: any = await fetchOperateNew({ favorType: 'skill', favorId: item.id });
      const body = res?.response?.data;
      const favorited = Number(body?.data?.favoriteStatus ?? body?.favoriteStatus) === 1;
      setMyIds(prev => (favorited ? [...prev.filter(v => v !== id), id] : prev.filter(v => v !== id)));
      message.success(favorited ? '添加成功' : '取消添加成功');
    } catch {
      message.error('操作失败，请稍后再试');
    }
  }

  // 我的技能卡片右上角「移除」：同一收藏接口，addOrRemove 自动取消收藏，按响应 favoriteStatus 回写
  async function handleRemoveSkill(item: SkillItem) {
    const id = String(item.id);
    try {
      const res: any = await fetchOperateNew({ favorType: 'skill', favorId: item.id });
      const body = res?.response?.data;
      const favorited = Number(body?.data?.favoriteStatus ?? body?.favoriteStatus) === 1;
      setMyIds(prev => (favorited ? [...prev.filter(v => v !== id), id] : prev.filter(v => v !== id)));
      message.success(favorited ? '添加成功' : '取消添加成功');
    } catch {
      message.error('操作失败，请稍后再试');
    }
  }

  function confirmDelete(item: SkillItem) {
    modal.confirm({
      title: '确认删除该技能？',
      content: `将删除${item.bizName}，删除后不可恢复。`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          await deleteSkillApi({ skillId: item.id });
          message.success('删除成功');
          fetchList();
        } catch (err: any) {
          message.error(err?.message || '删除失败');
        }
      }
    });
  }

  // 批量删除{selectedRowKeys.length ? `(${selectedRowKeys.length})` : ''}
  function handleBatchDelete() {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的技能');
      return;
    }
    modal.confirm({
      title: '批量删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 个技能吗？删除后不可恢复。`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          await Promise.all(
            selectedRowKeys.map(id => deleteSkillApi({ skillId: String(id) }))
          );
          message.success(`成功删除 ${selectedRowKeys.length} 个技能`);
          setSelectedRowKeys([]);
          fetchList();
        } catch {
          message.error('批量删除失败');
        }
      }
    });
  }

  // 切换发布/取消发布
  async function toggleSkillStatus(item: SkillItem, publish: boolean) {
    const nextStatus = publish ? '1' : '0';
    setList(prev => prev.map(it => (it.id === item.id ? { ...it, status: nextStatus } : it)));
    try {
      const res: any = await updateSkillStatusApi({ skillId: item.id, status: nextStatus });
      if (res?.response?.data?.code === 200 || res?.data?.code === 200) {
        message.success(publish ? '已发布' : '已取消发布');
      } else {
        setList(prev => prev.map(it => (it.id === item.id ? { ...it, status: item.status } : it)));
        message.error(res?.response?.data?.msg || '操作失败');
      }
    } catch (err: any) {
      setList(prev => prev.map(it => (it.id === item.id ? { ...it, status: item.status } : it)));
      message.error(err?.message || '操作失败');
    }
  }

  const tabItems = useMemo(
    () => [
      { key: 'plaza', label: '广场' },
      { key: 'mine', label: '我的技能' }
    ],
    []
  );

  const statusOptions = useMemo(
    () => [
      { value: 'ALL', label: '全部' },
      { value: '1', label: '当前启用' },
      { value: '0', label: '离线版本' },
    ],
    []
  );

  const visibleList = useMemo(() => {
    // 广场可见性规则：公开（PUBLIC）全平台可见；私有（PRIVATE）仅所属空间内或已收藏（我的技能）可见
    let arr = list.filter(it => {
      const v = String(it.visibility || '').toUpperCase();
      if (v !== 'PRIVATE') return true;
      const inMySpace = String(it.spaceId ?? '') === String(spaceId ?? '');
      return tab === 'mine'
        ? inMySpace || myIds.includes(String(it.id))
        : inMySpace;
    });

    // 「我的技能」：展示已添加的技能（以收藏接口返回为准）
    if (tab === 'mine') {
      arr = arr.filter(it => myIds.includes(String(it.id)));
    }

    // 启用/隐藏状态
    if (statusFilter !== 'ALL') {
      arr = arr.filter(it => String(it.status ?? '') === statusFilter);
    }

    // 技能名称关键字模糊匹配
    const kw = keyword.trim().toLowerCase();
    if (kw) {
      arr = arr.filter(it => (it.bizName || '').toLowerCase().includes(kw));
    }

    // 前端按创建时间过滤
    arr = filterByCreateTime(arr, dateRange, 'createTime');

    return arr;
  }, [list, tab, myIds, statusFilter, keyword, dateRange, spaceId]);

  // v5 pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [jumpValue, setJumpValue] = useState('');

  // 筛选条件变化时重置到第一页
  useEffect(() => {
    setCurrentPage(1);
  }, [tab, statusFilter, keyword, pageSize, dateRange]);

  const totalCount = visibleList.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const pagedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return visibleList.slice(start, start + pageSize);
  }, [visibleList, currentPage, pageSize]);

  // 表格列定义
  const allTableColumns = useMemo(() => [
    {
      title: '技能名称', dataIndex: 'bizName', key: 'bizName',
      align: 'left' as const, minWidth: 160,
      className: 'col-skill-left',
      onHeaderCell: () => ({ className: 'col-skill-left' }),
      render: (_: any, record: SkillItem) => <NameCell text={record.bizName} />,
    },
    {
      title: '技能描述', dataIndex: 'summary', key: 'summary',
      align: 'left' as const, width: 300, minWidth: 200,
      className: 'col-skill-left',
      onHeaderCell: () => ({ className: 'col-skill-left' }),
      onCell: () => ({ style: { whiteSpace: 'normal', wordBreak: 'break-all' as const, maxWidth: 300 } }),
      render: (_: any, record: SkillItem) => record.summary
        ? <Typography.Paragraph ellipsis={{ rows: 2, tooltip: record.summary }} style={{ marginBottom: 0, fontSize: 'inherit', color: 'inherit', maxWidth: 260 }}>{record.summary}</Typography.Paragraph>
        : <span style={{ color: '#9ca3af' }}>-</span>,
    },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      align: 'center' as const, minWidth: 80,
      render: (_: any, record: SkillItem) => <ASwitch checked={String(record.status) === '1'} size="default" onChange={(checked: boolean) => toggleSkillStatus(record, checked)} />
    },
    {
      title: '空间', dataIndex: 'spaceName', key: 'spaceName',
      align: 'center' as const, minWidth: 100,
      render: (_: any, record: SkillItem) => record.spaceName || (record.spaceId ? `空间${record.spaceId}` : '-')
    },
    {
      title: '操作', key: 'operate', align: 'center' as const, fixed: 'right' as const, minWidth: 200,
      render: (_: any, record: SkillItem) => (
        <div className="ds-action-group">
          <Button className="abi-action-link" size="small" variant="link" onClick={() => openEdit(record)}>
            <EditOutlined style={{ marginRight: 3, fontSize: 12 }} />编辑
          </Button>
          <Button className="abi-action-link" size="small" variant="link" onClick={() => goDetail(record)}>
            <EyeOutlined style={{ marginRight: 3, fontSize: 12 }} />查看
          </Button>
          <Dropdown
            menu={{
              items: [
                {
                  key: 'update',
                  label: (
                    <span onClick={() => openUpdate(record)}>
                      <SyncOutlined style={{ marginRight: 4 }} />更新技能
                    </span>
                  ),
                },
                { type: 'divider' },
                {
                  key: 'delete',
                  danger: true,
                  label: (
                    <span onClick={() => confirmDelete(record)}>
                      <DeleteOutlined style={{ marginRight: 4 }} />删除
                    </span>
                  ),
                },
              ],
            }}
          >
            <Button className="abi-action-link" size="small" variant="link">
              更多 <DownOutlined style={{ fontSize: '0.625rem' }} />
            </Button>
          </Dropdown>
        </div>
      )
    },
  ], []);

  const tableColumns = useMemo(() => {
    const visibleKeys = new Set(columnOptions.filter(c => c.visible).map(c => c.key));
    return allTableColumns.filter(col => col.key === 'operate' || visibleKeys.has(col.key));
  }, [columnOptions, allTableColumns]);

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
        <span key={page} className={`page-item ${isActive ? 'page-active' : ''}`} onClick={() => setCurrentPage(page as number)}>
          {page}
        </span>
      );
    });
  };

  const handleJump = () => {
    const page = parseInt(jumpValue, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setJumpValue('');
    }
  };

  const handleReset = () => {
    setKeyword('');
    setStatusFilter('ALL');
    setCurrentPage(1);
    setDateRange(null);
  };

  return (
    <div className="skill-hub-scope h-full overflow-hidden p-24px" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* 页签行 — 独立区域 */}
      <section className="skill-tabs-row">
        <Tabs
          activeKey={tab}
          className="skill-filter-tabs"
          items={tabItems}
          onChange={k => setTab(k as any)}
        />
      </section>

      {/* v5 Searchbar */}
      <section className="abi-searchbar">
        <SearchFilterBar
          searchPlaceholder="请输入技能名称"
          searchValue={keyword}
          onQuery={() => setCurrentPage(1)}
          onReset={handleReset}
          onSearchChange={setKeyword}
          filters={
            <>
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
              <SearchFilterField label="状态">
                <Select
                  className="abi-field-input w-full"
                  getPopupContainer={getFilterPopupContainer}
                  options={statusOptions}
                  placeholder="状态"
                  value={statusFilter}
                  onChange={v => setStatusFilter(v)}
                />
              </SearchFilterField>
            </>
          }
        />
      </section>

      {/* v5 Data Area */}
      <section className="abi-data-area">
        <div className="abi-toolbar">
          <div className="abi-toolbar-left">
            <AButton
              type="primary"
              className="btn-accent-gradient"
              onClick={goPublish}
            >
              安装技能
            </AButton>
            <Button danger
              icon={<DeleteOutlined />}
              disabled={selectedRowKeys.length === 0}
              onClick={handleBatchDelete}
            >
              批量删除{selectedRowKeys.length ? `(${selectedRowKeys.length})` : ''}
            </Button>
          </div>
          <ViewControls
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
            columns={columnOptions}
            onColumnToggle={handleColumnToggle}
          />
        </div>

        {/* Content: table or cards */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <Spin spinning={loading || favLoading} wrapperClassName="abi-data-spin">
            {favLoading ? null : visibleList.length === 0 && !loading ? (
              <div className="abi-card-empty">
                <Empty description={t('page.manage.skill.empty')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
              </div>
            ) : viewMode === 'list' ? (
              <div style={{ border: '1px solid rgba(130,140,200,0.18)', borderRadius: 12, overflow: 'hidden', flex: 1, minHeight: 0 }}>
                <div className="assistant-table-scroll" style={{ overflow: 'auto', maxHeight: '100%' }}>
                  <ATable
                    rowKey="id"
                    columns={tableColumns as any}
                    dataSource={pagedList}
                    loading={loading}
                    pagination={false}
                    size="middle"
                    className="skills-table abi-std-table"
                    scroll={pagedList.length > 0 ? { x: 'max-content' } : undefined}
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
                <div className="abi-card-grid">
                  <div className="abi-card-grid-inner">
                    {pagedList.map(item => {
                      const statusKey = resolveStatusKey(item.status);
                      const title = item.bizName || '-';
                      const online = String(item.status) === '1';
                      const statusLabel = online ? '当前启用' : '离线版本';
                      const tagCls = online ? '' : 'offline';
                      const iconKey = item.icon || skillIconKey(item.id);
                      const added = myIds.includes(String(item.id));
                      return (
                        <div
                          key={item.id}
                          className="abi-assistant-card"
                          onClick={() => {
                            if (menuActionRef.current) { menuActionRef.current = false; return; }
                            goDetail(item);
                          }}
                        >
                          {/* 头部：图标 + 标题/描述 + 添加按钮（对齐 chat） */}
                          <div className="ac-head">
                            <AssistantIconBlock iconKey={iconKey} radius={12} size={42} />
                            <div className="ac-main">
                              <div className="ac-title" title={title}>{title}</div>
                              <div className="ac-desc">{item.summary || '暂无描述'}</div>
                            </div>
                            {tab === 'plaza' ? (
                              added ? (
                                <button className="ac-add-btn ac-add-btn--added" onClick={e => { e.stopPropagation(); handleRemoveSkill(item); }}>
                                  已添加
                                </button>
                              ) : (
                                <button className="ac-add-btn" onClick={e => { e.stopPropagation(); handleAddSkill(item); }}>
                                  + 添加
                                </button>
                              )
                            ) : (
                              <button className="ac-add-btn ac-add-btn--danger" onClick={e => { e.stopPropagation(); handleRemoveSkill(item); }}>
                                移除
                              </button>
                            )}
                          </div>
                          {/* 底部：状态标签 + 操作（对齐 chat：启用/停用按钮在右下） */}
                          <div className="ac-footer" onClick={e => e.stopPropagation()}>
                            <span className={`ac-tag ${tagCls}`}>{statusLabel}</span>
                            <div className="ac-actions">
                              <button className="ac-btn" onClick={() => toggleSkillStatus(item, !online)}>
                                {online ? '取消发布' : '发布'}
                              </button>
                              <button className="ac-btn" onClick={() => openEdit(item)}>
                                <EditOutlined />编辑
                              </button>
                              <Dropdown
                                menu={{
                                  items: [
                                    {
                                      key: 'update',
                                      label: '更新技能',
                                      onClick: () => { menuActionRef.current = true; openUpdate(item); },
                                    },
                                    { type: 'divider' },
                                    {
                                      key: 'delete',
                                      danger: true,
                                      label: '删除',
                                      onClick: () => { menuActionRef.current = true; confirmDelete(item); },
                                    },
                                  ],
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
              </div>
            )}
          </Spin>

          <div className="data-source-pagination">
            <span className="total-text">共 {totalCount} 条</span>
            <div className="pagination-controls">
              <ASelect
                value={pageSize}
                onChange={(val: number) => setPageSize(val)}
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
              {renderPageNumbers()}
              <button className="page-btn" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                <RightOutlined />
              </button>
              <span className="quick-jumper">
                前往
                <AInput className="jump-input" style={{ width: 48, textAlign: 'center' }} value={jumpValue} onChange={(e: any) => setJumpValue(e.target.value)} onPressEnter={handleJump} />
                页
              </span>
            </div>
          </div>
        </div>
      </section>

      <SkillPublishDrawer
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        onSuccess={fetchList}
        existingSkills={list}
      />

      <SkillPublishDrawer
        mode="update"
        open={updateOpen}
        skill={updatingSkill}
        onClose={() => setUpdateOpen(false)}
        onSuccess={fetchList}
        existingSkills={list}
      />

      <SkillDetailDrawer
        open={detailOpen}
        skill={activeSkill}
        onClose={() => setDetailOpen(false)}
        onDeleted={() => {
          setDetailOpen(false);
          fetchList();
        }}
      />

      <SkillEditDrawer
        open={editOpen}
        skill={editingSkill}
        onClose={() => setEditOpen(false)}
        onSuccess={fetchList}
      />
    </div>
  );
}
