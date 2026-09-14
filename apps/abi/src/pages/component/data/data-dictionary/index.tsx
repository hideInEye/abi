import { DeleteOutlined, LeftOutlined, MoreOutlined, ReloadOutlined, RightOutlined, SearchOutlined } from '@ant-design/icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dropdown, message, Modal, Splitter } from 'antd';

import { ViewControls } from '@/components/ViewControls';
import type { ColumnOption } from '@/components/ViewControls';
import type { GroupHandle } from '@/components/stateful/group/Group.tsx';
import { GroupContentGate } from '@/components/stateful/group/GroupContentGate.tsx';
import { DeferredRangePicker, SearchFilterBar, SearchFilterField, getFilterPopupContainer } from '@/components/SearchFilterBar';
import { filterByCreateTime } from '@/utils/date';

import { DictionaryGroup } from './components/DictionaryGroup';
import { DictionaryModal } from './components/DictionaryModal';
import { TableDictionary } from './components/DictionaryTable';
import { EnumDrawer } from './components/EnumDrawer';
import { useDictionaryGroup } from './hooks/useDictionaryGroup';
import { useEnumDrawer } from './hooks/useEnumDrawer';

export const Component: React.FC = () => {
  const [groupId, setGroupId] = useState<any>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const groupRef = useRef<GroupHandle>(null);
  const [hasGroups, setHasGroups] = useState<boolean | null>(null);

  const {
    current,
    dictionaryDataSource,
    editObj,
    handleAdd,
    handleClose,
    handleDelete,
    handleEdit,
    handleSearch,
    handleSure,
    handleUpdateStatus,
    modalOpen,
    searchValue,
    setCurrent
  } = useDictionaryGroup(groupId);

  const { close: closeEnumDrawer, enumerationModalOpen, open: openEnumDrawer } = useEnumDrawer();
  const [viewMode, setViewMode] = useState<'list' | 'card'>('card');
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);
  const [columnOptions, setColumnOptions] = useState<ColumnOption[]>([
    { key: 'dictField', label: '字典名称', visible: true },
    { key: 'dictName', label: '中文名称', visible: true },
    { key: 'status', label: '状态', visible: true },
    { key: 'remark', label: '描述', visible: true },
    { key: 'createTime', label: '创建时间', visible: true },
    { key: 'action', label: '操作', visible: true },
  ]);
  const handleColumnToggle = (key: string, visible: boolean) => {
    setColumnOptions(prev => prev.map(c => c.key === key ? { ...c, visible } : c));
  };
  const handleViewModeChange = (mode: 'list' | 'card') => {
    setSelectedRowKeys([]);
    setViewMode(mode);
  };

  // Batch delete handler
  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的数据');
      return;
    }
    Modal.confirm({
      title: '批量删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 个字典吗？`,
      okText: '确认',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        for (const id of selectedRowKeys) {
          await handleDelete(id as number);
        }
        setSelectedRowKeys([]);
      },
    });
  };

  // 前端按创建时间过滤 + 前端分页（hook 已全量加载）
  const [pageSize, setPageSize] = useState(12);
  const [jumpValue, setJumpValue] = useState('');
  const filteredRows = useMemo(
    () => filterByCreateTime((dictionaryDataSource.rows as any[]) || [], dateRange, 'createTime'),
    [dictionaryDataSource.rows, dateRange],
  );
  const pagedDataSource = useMemo(
    () => ({
      ...dictionaryDataSource,
      rows: filteredRows.slice((current - 1) * pageSize, current * pageSize),
      total: filteredRows.length,
    }),
    [dictionaryDataSource, filteredRows, current, pageSize],
  );
  useEffect(() => {
    setCurrent(1);
  }, [dateRange]);

  const totalCount = filteredRows.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrent(page);
  };
  const handlePrev = () => { if (current > 1) handlePageChange(current - 1); };
  const handleNext = () => { if (current < totalPages) handlePageChange(current + 1); };
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
    } else if (current <= 3) {
      for (let i = 1; i <= 4; i++) pages.push(i);
      pages.push('...', totalPages);
    } else if (current >= totalPages - 2) {
      pages.push(1, '...');
      for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1, '...');
      pages.push(current - 1, current, current + 1);
      pages.push('...', totalPages);
    }
    return pages.map((page, idx) => {
      if (page === '...') return <span key={`ellipsis-${idx}`} className="page-item page-ellipsis">...</span>;
      const isActive = page === current;
      return (
        <span key={page} className={`page-item ${isActive ? 'page-active' : ''}`} onClick={() => handlePageChange(page as number)}>
          {page}
        </span>
      );
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      <Splitter style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* v5 Tree Panel — left sidebar with resizable width */}
        <Splitter.Panel defaultSize={280} min={200} max={400} resizable>
          <div className="abi-group-sidebar" style={{ height: '100%' }}>
            <DictionaryGroup ref={groupRef} onGroupId={setGroupId} onGroupsChange={setHasGroups} />
          </div>
        </Splitter.Panel>

        {/* Right content area */}
        <Splitter.Panel>
          <GroupContentGate hasGroups={hasGroups} onCreateGroup={() => groupRef.current?.openAddModal()}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', height: '100%' }}>
            {/* v5 Searchbar */}
            <section className="abi-searchbar">
              <SearchFilterBar
                searchPlaceholder="请输入字典名称"
                searchValue={searchValue}
                onQuery={() => handleSearch(searchValue)}
                onReset={() => { handleSearch(''); setDateRange(null); }}
                onSearchChange={handleSearch}
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
                  <AButton
                    type="primary"
                    className="btn-accent-gradient"
                    onClick={handleAdd}
                    disabled={!groupId}
                  >
                    + 新增字典
                  </AButton>
                  <AButton danger
                    disabled={selectedRowKeys.length === 0}
                    onClick={handleBatchDelete}
                  >
                    <DeleteOutlined /> 批量删除{selectedRowKeys.length ? `(${selectedRowKeys.length})` : ''}
                  </AButton>
                </div>
                <ViewControls
                  viewMode={viewMode}
                  onViewModeChange={handleViewModeChange}
                  columns={columnOptions}
                  onColumnToggle={handleColumnToggle}
                />
              </div>
              {viewMode === 'list' ? (
                <TableDictionary
                  dataSource={pagedDataSource}
                  onDelete={handleDelete}
                  onDiff={openEnumDrawer}
                  onEdit={handleEdit}
                  onStatusChange={handleUpdateStatus}
                  selectedRowKeys={selectedRowKeys}
                  onSelectedRowKeysChange={setSelectedRowKeys}
                />
              ) : (
                <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
                  {filteredRows.length === 0 ? (
                    <div className="abi-card-empty"><AEmpty description="暂无字典" image={AEmpty.PRESENTED_IMAGE_SIMPLE} /></div>
                  ) : (
                    <div className="abi-card-grid">
                      <div className="abi-card-grid-inner">
                        {pagedDataSource.rows.map((record: any) => (
                          <div key={record.dictId} className="abi-data-card" style={{ position: 'relative' }}>
                            <div className="abi-data-card-head">
                              <div className="abi-data-card-title">
                                <span className="abi-data-card-name">{record.dictField}</span>
                              </div>
                              <ASwitch checked={record.status === '2'} size="small" onChange={() => handleUpdateStatus(record)} />
                            </div>
                            <div className="abi-data-card-body">
                              <div className="row"><span className="lbl">中文名称</span><span className="val">{record.dictName || '-'}</span></div>
                              <div className="row"><span className="lbl">描述</span><span className="val">{record.remark || '-'}</span></div>
                              <div className="row"><span className="lbl">创建时间</span><span className="val">{record.createTime || '-'}</span></div>
                            </div>
                            <div className="abi-data-card-footer">
                              <button className="abi-card-act" onClick={() => handleEdit(record)}>
                                编辑
                              </button>
                              <button className="abi-card-act" onClick={() => openEnumDrawer(record)}>
                                新增
                              </button>
                              <Dropdown
                                menu={{
                                  items: [
                                    {
                                      key: 'delete',
                                      danger: true,
                                      label: <APopconfirm cancelText="取消" description="确定要删除该字典吗？" okText="确认" title="删除字典" onConfirm={() => handleDelete(record.dictId)}><span>删除</span></APopconfirm>,
                                    },
                                  ]
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
                    onChange={(val: any) => { setPageSize(val); setCurrent(1); }}
                    options={[
                      { label: '12条/页', value: 12 },
                      { label: '18条/页', value: 18 },
                      { label: '24条/页', value: 24 },
                      { label: '30条/页', value: 30 },
                    ]}
                    className="page-size-select"
                  />
                  <button className="page-btn" disabled={current === 1} onClick={handlePrev}>
                    <LeftOutlined />
                  </button>
                  {renderPageNumbers()}
                  <button className="page-btn" disabled={current === totalPages} onClick={handleNext}>
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

      <DictionaryModal
        editObj={editObj}
        open={modalOpen}
        onClose={handleClose}
        onSure={handleSure}
      />

      {enumerationModalOpen && (
        <EnumDrawer
          close={closeEnumDrawer}
          enumerationModalOpen={enumerationModalOpen}
        />
      )}
    </div>
  );
};
