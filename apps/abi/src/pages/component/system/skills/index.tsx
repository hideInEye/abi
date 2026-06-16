import { DeleteOutlined, LeftOutlined, MoreOutlined, RightOutlined, SearchOutlined, SyncOutlined } from '@ant-design/icons';
import { App, Dropdown, Empty, Input, Select, Spin, Switch, Tabs, Tooltip } from 'antd';
import { useEffect, useMemo, useState } from 'react';

// import PageTitle from '@/components/stateless/common/PageTitle';
import { deleteSkillApi, querySkillListApi, updateSkillStatusApi } from '@/service/api/skill';
import { getSpaceId } from '@/store/slice/app';
import { useAppSelector } from '@/hooks/business/useStore';
import { ViewControls } from '@/components/ViewControls';
import type { ColumnOption } from '@/components/ViewControls';

import SkillDetailDrawer from './modules/skill-detail-drawer';
import SkillPublishDrawer from './modules/skill-publish-drawer';

import './skill.css';

type SkillItem = {
  id: number | string;
  bizName?: string;
  spaceId?: number | string;
  spaceName?: string;
  summary?: string;
  status?: string;
  visibility?: string;
  latestVersionId?: number | string;
  createdBy?: string;
  createTime?: string;
  updateTime?: string;
};

type StatusKey = 'published' | 'hidden' | 'archived' | 'review' | 'rejected' | 'scanning';

function resolveStatusKey(status?: string): StatusKey {
  // 后端：0 禁用 / 1 启用
  if (status === '1' || status === 'PUBLISHED') return 'published';
  if (status === '0' || status === 'HIDDEN') return 'hidden';
  if (status === 'ARCHIVED') return 'archived';
  if (status === 'PENDING_REVIEW') return 'review';
  if (status === 'REJECTED') return 'rejected';
  if (status === 'SCANNING' || status === 'UPLOADED') return 'scanning';
  return 'published';
}

export function Component() {
  const { t } = useTranslation();
  const { message, modal } = App.useApp();
  const spaceId = useAppSelector(getSpaceId);

  const [tab, setTab] = useState<'plaza' | 'mine'>('plaza');
  const [statusFilter, setStatusFilter] = useState<'ALL' | '1' | '0'>('ALL');
  const [keyword, setKeyword] = useState('');
  const [list, setList] = useState<SkillItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeSkill, setActiveSkill] = useState<SkillItem | null>(null);
  // 更新文件弹窗
  const [updateOpen, setUpdateOpen] = useState(false);
  const [updatingSkill, setUpdatingSkill] = useState<SkillItem | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'card'>('card');
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);
  const [columnOptions, setColumnOptions] = useState<ColumnOption[]>([
    { key: 'bizName', label: '技能名称', visible: true },
    { key: 'summary', label: '描述', visible: true },
    { key: 'status', label: '状态', visible: true },
    { key: 'spaceName', label: '空间', visible: true },
    { key: 'operate', label: '操作', visible: true },
  ]);
  const handleColumnToggle = (key: string, visible: boolean) => {
    setColumnOptions(prev => prev.map(c => c.key === key ? { ...c, visible } : c));
  };

  async function fetchList() {
    setLoading(true);
    try {
      const res: any = await querySkillListApi({});
      const rows = res?.response?.data?.data?.rows || res?.response?.data?.rows || res?.data?.rows || res?.data?.data || res?.data || [];
      setList(Array.isArray(rows) ? rows : []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }

  // 空间切换时重新拉取列表
  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceId]);

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

  // 切换启用/隐藏
  async function toggleSkillStatus(item: SkillItem, checked: boolean) {
    const nextStatus = checked ? '1' : '0';
    setList(prev => prev.map(it => (it.id === item.id ? { ...it, status: nextStatus } : it)));
    try {
      const res: any = await updateSkillStatusApi({ skillId: item.id, status: nextStatus });
      if (res?.response?.data?.code === 200 || res?.data?.code === 200) {
        message.success(checked ? '已启用' : '已隐藏');
      } else {
        // 接口失败
        setList(prev => prev.map(it => (it.id === item.id ? { ...it, status: item.status } : it)));
        message.error(res?.response?.data?.msg || '操作失败');
      }
    } catch (err: any) {
      // 网络错误
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
      { value: 'ALL', label: t('page.manage.skill.filter.all') },
      { value: '1', label: t('page.manage.skill.filter.published') },
      { value: '0', label: t('page.manage.skill.filter.hidden') }
    ],
    [t]
  );

  const visibleList = useMemo(() => {
    let arr = list;

    // 「我的技能」：spaceId + createdBy 双重匹配
    if (tab === 'mine') {
      const sid = localStorage.getItem('spaceId');
      let userName = '';
      try {
        const u = JSON.parse(localStorage.getItem('SOY-REACT_userInfo') || '{}');
        userName = u?.userName || '';
      } catch { /* ignore */ }
      arr = arr.filter(it =>
        (!sid || String(it.spaceId ?? '') === String(sid)) &&
        (!userName || String(it.createdBy ?? '') === String(userName))
      );
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

    return arr;
  }, [list, tab, statusFilter, keyword]);

  // v5 pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [jumpValue, setJumpValue] = useState('');

  // 筛选条件变化时重置到第一页
  useEffect(() => {
    setCurrentPage(1);
  }, [tab, statusFilter, keyword]);

  const totalCount = visibleList.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const pagedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return visibleList.slice(start, start + pageSize);
  }, [visibleList, currentPage, pageSize]);

  // 表格列定义
  const allTableColumns = useMemo(() => [
    { title: '技能名称', dataIndex: 'bizName', key: 'bizName', align: 'center' as const },
    {
      title: '描述', dataIndex: 'summary', key: 'summary', align: 'center' as const, width: 200,
      render: (text: string) => (
        <Tooltip title={text} placement="topLeft">
          <div style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '0 auto' }}>
            {text || '-'}
          </div>
        </Tooltip>
      )
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', align: 'center' as const,
      render: (_: any, record: SkillItem) => <Switch checked={String(record.status) === '1'} size="small" onChange={checked => toggleSkillStatus(record, checked)} />
    },
    {
      title: '空间', dataIndex: 'spaceName', key: 'spaceName', align: 'center' as const,
      render: (_: any, record: SkillItem) => record.spaceName || (record.spaceId ? `空间${record.spaceId}` : '-')
    },
    {
      title: '操作', key: 'operate', align: 'center' as const, fixed: 'right' as const,
      render: (_: any, record: SkillItem) => (
        <div className="flex items-center justify-center" style={{ gap: 2 }}>
          <AButton className="abi-action-link" size="small" variant="link" onClick={() => openUpdate(record)}>更新技能</AButton>
          <AButton className="abi-action-link-danger" size="small" variant="link" onClick={() => confirmDelete(record)}>删除</AButton>
        </div>
      )
    },
  ], []);

  const tableColumns = useMemo(() => {
    const visibleKeys = new Set(columnOptions.filter(c => c.visible).map(c => c.key));
    return allTableColumns.filter(col => visibleKeys.has(col.key));
  }, [columnOptions, allTableColumns]);

  return (
    <div className="skill-hub-scope h-full overflow-hidden p-24px" style={{ display: 'flex', flexDirection: 'column' }}>
      <Tabs
        activeKey={tab}
        className="skill-filter-tabs"
        items={tabItems}
        onChange={k => setTab(k as any)}
      />

      {/* v5 Searchbar */}
      <section style={{ borderBottom: '1px solid rgba(130, 140, 200, 0.10)', background: 'rgba(255, 255, 255, 0.08)', flexShrink: 0 }}>
        <div className="abi-search-row">
          <Input
            allowClear
            className="w-170px abi-field-input"
            placeholder="请输入技能名称"
            prefix={<SearchOutlined style={{ color: '#a3b3c8' }} />}
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
          />
          <Select
            className="w-80px"
            options={statusOptions}
            placeholder="状态"
            value={statusFilter}
            onChange={v => setStatusFilter(v)}
          />
          <ADatePicker.RangePicker
            placeholder={['开始时间', '结束时间']}
            value={dateRange}
            onChange={(dates) => setDateRange(dates)}
            className="abi-field-input"
          />
          <AButton type="primary" className="btn-accent-gradient" onClick={() => setCurrentPage(1)}>
            <SearchOutlined /> 查询
          </AButton>
          <AButton className="btn-ghost-v5" onClick={() => { setKeyword(''); setStatusFilter('ALL'); setCurrentPage(1); setDateRange(null); }}>
            重置
          </AButton>
        </div>
      </section>

      {/* v5 Data Area */}
      <section style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '16px 0 0' }}>
        <div className="abi-toolbar">
          <div className="abi-toolbar-left">
            <AButton
              type="primary"
              className="btn-accent-gradient"
              onClick={goPublish}
            >
              安装技能
            </AButton>
          </div>
          <ViewControls
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            columns={columnOptions}
            onColumnToggle={handleColumnToggle}
          />
        </div>

        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          <Spin spinning={loading}>
            {visibleList.length === 0 && !loading ? (
              <div className="py-80px">
                <Empty description={t('page.manage.skill.empty')} />
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
                    className="abi-std-table"
                    scroll={pagedList.length > 0 ? { x: 'max-content' } : undefined}
                  />
                </div>
              </div>
            ) : (
              <div className="skill-card-grid">
                {pagedList.map(item => {
                  const statusKey = resolveStatusKey(item.status);
                  const title = item.bizName || '-';
                  const spaceName = item.spaceName || (item.spaceId ? `空间${item.spaceId}` : '');
                  const summary = item.summary;
                  return (
                    <div
                      className="skill-card"
                      key={item.id}
                      onClick={() => goDetail(item)}
                    >
                      <div className="skill-card__title">{title}</div>

                      {summary && <div className="skill-card__summary">{summary}</div>}

                      <div className="skill-card__footer">
                        <div className="skill-card__meta">
                          <span className={`status-pill status-pill--${statusKey}`}>
                            {t(`page.manage.skill.status.${statusKey}` as any)}
                          </span>
                          {spaceName && (
                            <Tooltip title={spaceName}>
                              <span className="handle-tag">
                                {spaceName.length > 4 ? `${spaceName.slice(0, 4)}...` : spaceName}
                              </span>
                            </Tooltip>
                          )}
                        </div>

                        <div className="skill-card__actions">
                          <Switch
                            checked={String(item.status) === '1'}
                            size="small"
                            onChange={checked => toggleSkillStatus(item, checked)}
                          />
                          <Dropdown
                            trigger={['click']}
                            placement="bottomRight"
                            menu={{
                              items: [
                                {
                                  key: 'update',
                                  label: (
                                    <span>
                                      <SyncOutlined style={{ marginRight: 6 }} />
                                      更新技能
                                    </span>
                                  )
                                },
                                {
                                  key: 'delete',
                                  label: (
                                    <span style={{ color: '#ff4d4f' }}>
                                      <DeleteOutlined style={{ marginRight: 6 }} />
                                      删除
                                    </span>
                                  )
                                }
                              ],
                              onClick: ({ domEvent, key }) => {
                                domEvent?.stopPropagation?.();
                                if (key === 'update') openUpdate(item);
                                else if (key === 'delete') confirmDelete(item);
                              }
                            }}
                          >
                            <button
                              type="button"
                              className="skill-card__more"
                              aria-label="more"
                              onClick={e => e.stopPropagation()}
                            >
                              <MoreOutlined />
                            </button>
                          </Dropdown>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Spin>
        </div>
        <div className="data-source-pagination" style={{ flexShrink: 0 }}>
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
    </div>
  );
}
