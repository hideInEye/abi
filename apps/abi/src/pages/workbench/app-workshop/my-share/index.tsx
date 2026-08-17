import { DeleteOutlined, SearchOutlined } from "@ant-design/icons";
import React, { useEffect, useMemo, useState } from "react";

import { DeferredRangePicker, SearchFilterBar, SearchFilterField, getFilterPopupContainer } from '@/components/SearchFilterBar';
import { AssistantIconBlock } from '@/components/AssistantIcon';
import { ViewControls } from '@/components/ViewControls';
import type { ColumnOption } from '@/components/ViewControls';
import { filterByCreateTime } from '@/utils/date';
import {
  deleteOperateRecord,
  getOperateRecordList,
} from "@/service/api/operateRecord";
import { message } from "antd";
import { useSpaceSwitch } from '@/hooks/business/useSpaceSwitch';
import { useAppSelector } from '@/hooks/business/useStore';
import { getSpaceId } from '@/store/slice/app';

interface OperateRecord {
  readonly id: string;
  readonly chatId: string;
  spaceId: number;
}

export const Component: React.FC & { loader?: () => Promise<any> } = () => {
  const [dataSource, setDataSource] = useState<any>({
    rows: [],
    total: 0,
  });
  const { switchToSpace } = useSpaceSwitch();
  const spaceId = useAppSelector(getSpaceId);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [jumpValue, setJumpValue] = useState('');
  const [searchValue, setSearchValue] = useState("");
  const [dateRange, setDateRange] = useState<any>(null);
  // 默认卡片视图（对齐「我的助手」与 chat 端应用工坊）
  const [viewMode, setViewMode] = useState<'list' | 'card'>('card');
  const [columnOptions, setColumnOptions] = useState<ColumnOption[]>([
    { key: 'chatName', label: '对话名称', visible: true },
    { key: 'spaceName', label: '所属空间', visible: true },
    { key: 'type', label: '分享类型', visible: true },
    { key: 'sharedTime', label: '分享时间', visible: true },
  ]);

  const handleColumnToggle = (key: string, visible: boolean) => {
    setColumnOptions(prev => prev.map(c => (c.key === key ? { ...c, visible } : c)));
  };

  async function getRecordList(key?: string) {
    const data = await getOperateRecordList('3', {
      pageNumber: currentPage,
      pageSize,
    });
    setDataSource(data.response.data);
  }

  const handleSearch = () => {
    setCurrentPage(1);
    getRecordList(searchValue.trim() || undefined);
  };

  const handleReset = () => {
    setSearchValue('');
    setDateRange(null);
    setCurrentPage(1);
    getRecordList();
  };

  useEffect(() => {
    setCurrentPage(1);
    setDataSource({ rows: [], total: 0 });
    getRecordList();
  }, [spaceId]);

  function deleteOperateRecordItem(ids: string) {
    deleteOperateRecord(ids).then((res) => {
      if (res.response.data.code > 200) {
        message.error(res.response.data.msg);
      } else {
        message.success(res.response.data.msg);
        getRecordList();
      }
    });
  }

  const handleNavigate = (r: OperateRecord) => {
    const { spaceId, chatId } = r;
    switchToSpace(spaceId, undefined, { chatId });
  };

  const allColumns: any[] = [
    { align: "center", dataIndex: "chatName", key: "chatName", minWidth: 140, title: "对话名称" },
    { align: "center", dataIndex: "spaceName", key: "spaceName", minWidth: 120, title: "所属空间" },
    {
      align: "center", dataIndex: "type", key: "type", minWidth: 100, title: "分享类型",
      render: () => "快照",
    },
    { align: "center", dataIndex: "sharedTime", key: "sharedTime", minWidth: 140, title: "分享时间" },
    {
      align: "center", dataIndex: "action", key: "action", width: 150, fixed: "right", title: "操作",
      render: (_: any, record: OperateRecord) => (
        <div className="ds-action-group">
          <AButton className="abi-action-link" size="small" variant="link" onClick={() => handleNavigate(record)}>进入对话</AButton>
          <APopconfirm cancelText="取消" description="确定要删除吗？" okText="确认" title="删除" onConfirm={() => deleteOperateRecordItem(record.id)}>
            <AButton className="abi-action-link-danger" size="small" variant="link">
              <DeleteOutlined style={{ marginRight: 3, fontSize: 12 }} />删除
            </AButton>
          </APopconfirm>
        </div>
      ),
    },
  ];

  // 列设置：隐藏未勾选的列，操作列始终保留
  const visibleColumnKeys = new Set(columnOptions.filter(c => c.visible).map(c => c.key));
  const columns = allColumns.filter(col => col.key === 'action' || visibleColumnKeys.has(String(col.key)));

  // 前端按分享时间过滤 + 前端分页（apiFn 返回全量数据）
  const filteredRows = useMemo(
    () => filterByCreateTime((dataSource.rows as any[]) || [], dateRange, 'sharedTime'),
    [dataSource.rows, dateRange]
  );
  const totalCount = filteredRows.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const pagedRows = useMemo(
    () => filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filteredRows, currentPage, pageSize]
  );

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handlePageSizeChange = (value: number) => {
    setPageSize(value);
    setCurrentPage(1);
  };

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

  // 卡片视图：复用 .abi-assistant-card（视觉已对齐 chat .ws-assistant-card）
  const renderCardGrid = () => {
    if (pagedRows.length === 0) {
      return (
        <div className="abi-card-empty">
          <AEmpty description="暂无分享的对话" image={AEmpty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      );
    }

    return (
      <div className="abi-card-grid">
        <div className="abi-card-grid-inner">
          {pagedRows.map((record: any) => (
            <div key={record.id} className="abi-assistant-card">
              <div className="ac-head">
                <AssistantIconBlock iconKey="chat" radius={12} size={42} />
                <div className="ac-main">
                  <div className="ac-title" title={record.chatName}>{record.chatName || '-'}</div>
                  <div className="ac-desc">所属空间：{record.spaceName || '-'}</div>
                </div>
              </div>
              <div className="ac-footer ac-footer--end">
                <div className="ac-actions">
                  <button className="ac-btn" onClick={() => handleNavigate(record)}>进入对话</button>
                  <APopconfirm cancelText="取消" description="确定要删除吗？" okText="确认" title="删除" onConfirm={() => deleteOperateRecordItem(record.id)}>
                    <button className="ac-btn ac-btn--danger">删除</button>
                  </APopconfirm>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      {/* Searchbar */}
      <section className="abi-searchbar">
        <SearchFilterBar
          searchPlaceholder="请输入对话名称"
          searchValue={searchValue}
          onQuery={handleSearch}
          onReset={handleReset}
          onSearchChange={setSearchValue}
          filters={
            <SearchFilterField label="时间范围">
              <DeferredRangePicker
                allowClear
                className="abi-field-input"
                format="YYYY-MM-DD"
                getPopupContainer={getFilterPopupContainer}
                placeholder={['开始时间', '结束时间']}
                value={dateRange}
                onChange={(dates) => { setDateRange(dates); setCurrentPage(1); }}
              />
            </SearchFilterField>
          }
        />
      </section>

      {/* Data Area */}
      <section className="abi-data-area">
        <div className="abi-toolbar">
          <div className="abi-toolbar-left" />
          <ViewControls
            columns={columnOptions}
            viewMode={viewMode}
            onColumnToggle={handleColumnToggle}
            onViewModeChange={setViewMode}
          />
        </div>
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
                  columns={columns}
                  dataSource={pagedRows}
                  loading={false}
                  pagination={false}
                  rowKey="id"
                  scroll={pagedRows?.length > 0 ? { x: 'max-content' } : undefined}
                  size="middle"
                  locale={{ emptyText: <TableEmpty description="暂无分享的对话" /> }}
                  className="abi-std-table"
                />
              </div>
            </div>
          ) : (
            renderCardGrid()
          )}

          <div className="data-source-pagination">
            <span className="total-text">共 {totalCount} 条</span>
            <div className="pagination-controls">
              <ASelect
                value={pageSize}
                onChange={handlePageSizeChange}
                options={[
                  { label: '10条/页', value: 10 },
                  { label: '15条/页', value: 15 },
                  { label: '20条/页', value: 20 },
                  { label: '25条/页', value: 25 },
                  { label: '30条/页', value: 30 },
                ]}
                className="page-size-select"
              />
              <button className="page-btn" disabled={currentPage === 1} onClick={() => handlePageChange(currentPage - 1)}>
                ‹
              </button>
              {renderPageNumbers()}
              <button className="page-btn" disabled={currentPage === totalPages} onClick={() => handlePageChange(currentPage + 1)}>
                ›
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
    </div>
  );
};
