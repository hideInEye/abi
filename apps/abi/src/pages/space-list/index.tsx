import {
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  LeftOutlined,
  MoreOutlined,
  PlusOutlined,
  ReloadOutlined,
  RightOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { Dropdown, Empty, message } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ViewControls } from '@/components/ViewControls';
import type { ColumnOption } from '@/components/ViewControls';
import { useSpaceSwitch } from '@/hooks/business/useSpaceSwitch';
import { $t } from '@/locales';
import { deleteSpace, spaceList } from '@/service/api/data-space';
import { spaceRoleList } from '@/service/api/role';
import { setSelectedMenuKey } from '@/store/slice/layout';
import { useRouter } from '~/packages/simple-router/src';

import { SpaceEdit } from './components/SpaceEdit';
import type { ISpaceItem } from './types';

// Column definitions for picker
const ALL_COLUMNS: ColumnOption[] = [
  { key: 'spaceName', label: '空间名称', visible: true },
  { key: 'createBy', label: '创建人', visible: true },
  { key: 'createTime', label: '创建时间', visible: true },
  { key: 'updateBy', label: '操作人', visible: false },
  { key: 'updateTime', label: '操作时间', visible: true },
];

const dotColors = ['blue', 'purple', 'green'] as const;

export function Component() {
  const dispatch = useAppDispatch();
  const { push } = useRouter();
  const { switchToSpace } = useSpaceSwitch();

  const [spaceData, setSpaceData] = useState<ISpaceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageNum, setPageNum] = useState(1);
  const [pageSizeVal, setPageSizeVal] = useState(12);
  const [total, setTotal] = useState(0);
  const [jumpValue, setJumpValue] = useState('');

  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');
  const [columnOptions, setColumnOptions] = useState<ColumnOption[]>(ALL_COLUMNS);
  const [searchValue, setSearchValue] = useState('');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editSpace, setEditSpace] = useState<ISpaceItem | null>(null);

  // Batch selection
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
  };

  const visibleKeys = useMemo(
    () => new Set(columnOptions.filter(c => c.visible).map(c => c.key)),
    [columnOptions],
  );

  const handleColumnToggle = (key: string, visible: boolean) => {
    setColumnOptions(prev => prev.map(c => (c.key === key ? { ...c, visible } : c)));
  };

  async function fetchSpaceData(params: {
    isAsc: 'asc' | 'desc';
    orderByColumn: string;
    pageNum: number;
    pageSize: number;
    spaceName?: string;
  }) {
    setLoading(true);
    try {
      const res = await spaceList(params);
      const { data } = res.response as any;
      const { rows, total: totalCount } = data;
      setSpaceData(rows || []);
      setTotal(totalCount || 0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSpaceData({
      isAsc: 'desc',
      orderByColumn: 'spaceId',
      pageNum,
      pageSize: pageSizeVal,
    });
  }, []);

  const handleSearch = useCallback(() => {
    setPageNum(1);
    fetchSpaceData({
      isAsc: 'desc',
      orderByColumn: 'spaceId',
      pageNum: 1,
      pageSize: pageSizeVal,
      spaceName: searchValue.trim() || undefined,
    });
  }, [searchValue, pageSizeVal]);

  const handleReset = useCallback(() => {
    setSearchValue('');
    setPageNum(1);
    fetchSpaceData({
      isAsc: 'desc',
      orderByColumn: 'spaceId',
      pageNum: 1,
      pageSize: pageSizeVal,
    });
  }, [pageSizeVal]);

  function addNewSpaceHandler() {
    spaceRoleList({ pageNum: 1, pageSize: 100000 }).then(res => {
      const { data } = res.data as any;
      if (Array.isArray(data)) {
        const haiRole = data.some((i: any) => i.roleKey === 'creator');
        if (haiRole) {
          setDrawerOpen(true);
          setEditSpace(null);
        } else {
          message.error($t('page.home.noSpaceRoleTips'));
        }
      }
    });
  }

  function editSpaceHandler(space: ISpaceItem) {
    setDrawerOpen(true);
    setEditSpace(space);
  }

  async function deleteSpaceHandler(space: ISpaceItem) {
    await deleteSpace([space.spaceId]);
    message.success('删除成功');
    fetchSpaceData({
      isAsc: 'desc',
      orderByColumn: 'spaceId',
      pageNum,
      pageSize: pageSizeVal,
      spaceName: searchValue.trim() || undefined,
    });
  }

  async function handleBatchDelete() {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的空间');
      return;
    }
    const ids = selectedRowKeys.map(k => Number(k));
    await deleteSpace(ids);
    message.success('批量删除成功');
    setSelectedRowKeys([]);
    fetchSpaceData({
      isAsc: 'desc',
      orderByColumn: 'spaceId',
      pageNum,
      pageSize: pageSizeVal,
      spaceName: searchValue.trim() || undefined,
    });
  }

  function updateSpace() {
    fetchSpaceData({
      isAsc: 'desc',
      orderByColumn: 'spaceId',
      pageNum,
      pageSize: pageSizeVal,
      spaceName: searchValue.trim() || undefined,
    });
  }

  // Permission check
  const currentUserObj: any = JSON.parse(localStorage.getItem('SOY-REACT_userInfo') || '{}');
  const isAdmin = currentUserObj?.userName === 'admin';

  function canDeleteSpace(space: ISpaceItem) {
    const createByMatchesUserName = space.createBy === currentUserObj?.userName;
    const createByMatchesUserId = space.createBy === (currentUserObj?.userId || '').toString();
    const isCreator = Boolean(space.createBy && (createByMatchesUserName || createByMatchesUserId));
    return isAdmin || isCreator;
  }

  function enterSpace(spaceId: number) {
    switchToSpace(spaceId, undefined, { redirect: true });
    dispatch(setSelectedMenuKey('assistant-manage_assistant-config'));
    push('/workbench');
  }

  // Pagination logic
  const totalPages = Math.ceil(total / pageSizeVal) || 1;

  const handlePageSizeChange = (value: number) => {
    setPageSizeVal(value);
    setPageNum(1);
    fetchSpaceData({
      isAsc: 'desc',
      orderByColumn: 'spaceId',
      pageNum: 1,
      pageSize: value,
      spaceName: searchValue.trim() || undefined,
    });
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setPageNum(page);
      fetchSpaceData({
        isAsc: 'desc',
        orderByColumn: 'spaceId',
        pageNum: page,
        pageSize: pageSizeVal,
        spaceName: searchValue.trim() || undefined,
      });
    }
  };

  const handlePrev = () => { if (pageNum > 1) handlePageChange(pageNum - 1); };
  const handleNext = () => { if (pageNum < totalPages) handlePageChange(pageNum + 1); };

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
    } else if (pageNum <= 3) {
      for (let i = 1; i <= 4; i++) pages.push(i);
      pages.push('...', totalPages);
    } else if (pageNum >= totalPages - 2) {
      pages.push(1, '...');
      for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1, '...');
      pages.push(pageNum - 1, pageNum, pageNum + 1);
      pages.push('...', totalPages);
    }
    return pages.map((page, idx) => {
      if (page === '...') return <span key={`ellipsis-${idx}`} className="page-item page-ellipsis">...</span>;
      const isActive = page === pageNum;
      return (
        <span key={page} className={`page-item ${isActive ? 'page-active' : ''}`} onClick={() => handlePageChange(page as number)}>
          {page}
        </span>
      );
    });
  };

  // Table columns
  const tableColumns: any[] = [
    {
      align: 'left',
      className: 'col-space-name',
      dataIndex: 'spaceName',
      key: 'spaceName',
      minWidth: 200,
      onHeaderCell: () => ({ className: 'col-space-name' }),
      render: (text: string, record: ISpaceItem) => (
        <span className="source-name-cell" style={{ cursor: 'pointer' }} onClick={() => enterSpace(record.spaceId)}>
          <span className="source-name-text" title={text}>{text}</span>
        </span>
      ),
      title: '空间名称',
    },
    {
      align: 'center',
      dataIndex: 'createBy',
      key: 'createBy',
      minWidth: 100,
      title: '创建人',
    },
    {
      align: 'center',
      dataIndex: 'createTime',
      key: 'createTime',
      minWidth: 160,
      title: '创建时间',
    },
    {
      align: 'center',
      dataIndex: 'updateBy',
      key: 'updateBy',
      minWidth: 100,
      title: '操作人',
    },
    {
      align: 'center',
      dataIndex: 'updateTime',
      key: 'updateTime',
      minWidth: 160,
      title: '操作时间',
    },
    {
      align: 'center',
      fixed: 'right',
      key: 'operate',
      minWidth: 160,
      render: (_: unknown, record: ISpaceItem) => {
        const canDelete = canDeleteSpace(record);
        return (
          <div className="ds-action-group">
            <AButton className="abi-action-link" size="small" variant="link" onClick={() => editSpaceHandler(record)}>
              <EditOutlined style={{ marginRight: 3, fontSize: 12 }} />编辑
            </AButton>
            {canDelete && (
              <APopconfirm
                title="删除空间"
                description="确定删除该空间吗？"
                onConfirm={() => deleteSpaceHandler(record)}
              >
                <AButton className="abi-action-link" size="small" variant="link" danger>
                  <DeleteOutlined style={{ marginRight: 3, fontSize: 12 }} />删除
                </AButton>
              </APopconfirm>
            )}
          </div>
        );
      },
      title: '操作',
    },
  ];

  // Filter columns by visibility (always keep operate)
  const filteredColumns = tableColumns.filter(
    (col: any) => col.key === 'operate' || visibleKeys.has(col.key),
  );

  // Card grid render
  const renderCardGrid = () => {
    if (spaceData.length === 0 && !loading) {
      return (
        <div className="abi-card-empty">
          <Empty description="暂无空间" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      );
    }

    return (
      <div className="abi-card-grid">
        <div className="abi-card-grid-inner">
          {spaceData.map((record: ISpaceItem, idx: number) => {
            const dotColor = dotColors[idx % dotColors.length];
            const canDelete = canDeleteSpace(record);
            return (
              <div key={record.spaceId} className="abi-data-card" onClick={() => enterSpace(record.spaceId)} style={{ cursor: 'pointer' }}>
                <div className="abi-data-card-head">
                  <div className="abi-data-card-title">
                    <span className={`abi-space-dot abi-space-dot--${dotColor}`} />
                    <span className="abi-data-card-name" title={record.spaceName}>{record.spaceName}</span>
                  </div>
                  <Dropdown
                    menu={{
                      items: [
                        {
                          key: 'edit',
                          label: '编辑',
                          onClick: ({ domEvent }: any) => { domEvent.stopPropagation(); editSpaceHandler(record); },
                        },
                        ...(canDelete ? [{
                          key: 'delete',
                          danger: true,
                          label: '删除',
                          onClick: ({ domEvent }: any) => {
                            domEvent.stopPropagation();
                            AModal.confirm({
                              content: '确定删除该空间吗？',
                              onOk: () => deleteSpaceHandler(record),
                              title: '删除空间',
                            });
                          },
                        }] : []),
                      ],
                    }}
                    trigger={['click']}
                  >
                    <button
                      className="abi-card-more"
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                    >
                      <MoreOutlined />
                    </button>
                  </Dropdown>
                </div>

                <div className="abi-data-card-body">
                  {visibleKeys.has('createBy') && (
                    <div className="row"><span className="lbl">创建人</span><span className="val">{record.createBy || '-'}</span></div>
                  )}
                  {visibleKeys.has('createTime') && (
                    <div className="row"><span className="lbl">创建时间</span><span className="val">{record.createTime || '-'}</span></div>
                  )}
                  {visibleKeys.has('updateBy') && (
                    <div className="row"><span className="lbl">操作人</span><span className="val">{record.updateBy || '-'}</span></div>
                  )}
                  {visibleKeys.has('updateTime') && (
                    <div className="row"><span className="lbl">操作时间</span><span className="val">{record.updateTime || '-'}</span></div>
                  )}
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
      {/* Searchbar */}
      <section className="abi-searchbar">
        <div className="abi-search-row">
          <AInput
            allowClear
            placeholder="请输入空间名称"
            prefix={<SearchOutlined style={{ color: '#a3b3c8' }} />}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onPressEnter={handleSearch}
            className="abi-field-input"
            style={{ width: '220px' }}
          />
          <AButton type="primary" className="btn-accent-gradient" onClick={handleSearch}>
            <SearchOutlined /> 查询
          </AButton>
          <AButton className="btn-ghost-v5" onClick={handleReset}>
            <ReloadOutlined /> 重置
          </AButton>
        </div>
      </section>

      {/* Data Area */}
      <section className="abi-data-area">
        {/* Toolbar */}
        <div className="abi-toolbar">
          <div className="abi-toolbar-left">
            <AButton className="btn-accent-gradient" onClick={addNewSpaceHandler}>
              <PlusOutlined />{$t('page.mySpace.addNewSpace')}
            </AButton>
            <AButton
              className="btn-ghost-v5"
              disabled={selectedRowKeys.length === 0}
              onClick={handleBatchDelete}
            >
              批量删除
            </AButton>
          </div>
          <ViewControls
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            columns={columnOptions}
            onColumnToggle={handleColumnToggle}
          />
        </div>

        {/* Content: table or cards */}
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
                <ATable
                  columns={filteredColumns}
                  dataSource={spaceData}
                  loading={loading}
                  pagination={false}
                  rowKey="spaceId"
                  rowSelection={rowSelection}
                  scroll={spaceData.length > 0 ? { x: 'max-content' } : undefined}
                  size="middle"
                  className="abi-std-table"
                />
              </div>
            </div>
          ) : (
            renderCardGrid()
          )}

          {/* Pagination */}
          <div className="data-source-pagination">
            <span className="total-text">共 {total} 条</span>
            <div className="pagination-controls">
              <ASelect
                value={pageSizeVal}
                onChange={handlePageSizeChange}
                options={[
                  { label: '10条/页', value: 10 },
                  { label: '12条/页', value: 12 },
                  { label: '15条/页', value: 15 },
                  { label: '20条/页', value: 20 },
                  { label: '25条/页', value: 25 },
                  { label: '30条/页', value: 30 },
                ]}
                className="page-size-select"
              />
              <button className="page-btn" disabled={pageNum === 1} onClick={handlePrev}>
                <LeftOutlined />
              </button>
              {renderPageNumbers()}
              <button className="page-btn" disabled={pageNum === totalPages} onClick={handleNext}>
                <RightOutlined />
              </button>
              <span className="quick-jumper">
                前往
                <AInput
                  className="jump-input"
                  style={{ width: 48, textAlign: 'center' }}
                  value={jumpValue}
                  onChange={(e) => setJumpValue(e.target.value)}
                  onPressEnter={handleJump}
                />
                页
              </span>
            </div>
          </div>
        </div>
      </section>

      {drawerOpen && (
        <SpaceEdit
          drawerOpen={drawerOpen}
          editSpace={editSpace}
          setDrawerOpen={setDrawerOpen}
          updateSpace={updateSpace}
        />
      )}
    </div>
  );
}
