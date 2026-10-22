import { SearchOutlined } from "@ant-design/icons";
import React, { useEffect, useMemo, useState } from "react";

import { DeferredRangePicker, SearchFilterBar, SearchFilterField, getFilterPopupContainer } from '@/components/SearchFilterBar';
import { AssistantIconBlock } from '@/components/AssistantIcon';
import { filterByCreateTime } from '@/utils/date';
import {
  fetchOperateNew,
  fetchOperateNewList,
} from "@/service/api/operateRecord";
import { message } from "antd";
import { useSpaceSwitch } from '@/hooks/business/useSpaceSwitch';
import { useAppSelector } from '@/hooks/business/useStore';
import { getSpaceId } from '@/store/slice/app';

interface OperateRecord {
  readonly id: string;
  readonly sessionId: string;
  spaceId: number;
  spaceName?: string;
}

interface Response {
  rows: any[];
  total: number;
}

export const Component: React.FC & { loader?: () => Promise<any> } = () => {
  const [dataSource, setDataSource] = useState<Response>({
    rows: [],
    total: 0,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [jumpValue, setJumpValue] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [dateRange, setDateRange] = useState<any>(null);
  const { switchToSpace } = useSpaceSwitch();
  const spaceId = useAppSelector(getSpaceId);

  async function getRecordList() {
    const data: any = await fetchOperateNewList();
    setDataSource({
      total: data.response.data.total,
      rows: data.response.data.rows,
    });
  }

  const handleSearch = () => {
    setCurrentPage(1);
    getRecordList();
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

  const handleNavigate = (r: OperateRecord) => {
    const { spaceId, spaceName, sessionId } = r;
    switchToSpace(spaceId, undefined, { chatId: sessionId, spaceName });
  };

  const handleCollect = async (id: string) => {
    const res: any = await fetchOperateNew({ sessionId: id, type: 2 });
    // 失败时请求层已全局弹后端 msg，此处不再重复弹错误提示
    if (res.response.data.code !== 200) return;
    message.success(res.response.data.msg);
    getRecordList();
  };

  // 前端按收藏时间过滤 + 前端分页（apiFn 返回全量数据）
  const filteredRows = useMemo(
    () => filterByCreateTime((dataSource.rows as any[]) || [], dateRange, 'recentlyUseTime'),
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
          <AEmpty description="暂无收藏的对话" image={AEmpty.PRESENTED_IMAGE_SIMPLE} />
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
                  <button className="ac-btn ac-btn--danger" onClick={() => handleCollect(record.sessionId)}>取消收藏</button>
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
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {renderCardGrid()}

          <div className="data-source-pagination">
            <span className="total-text">共 {totalCount} 条</span>
            <div className="pagination-controls">
              <ASelect
                value={pageSize}
                onChange={handlePageSizeChange}
                options={[
                  { label: '12条/页', value: 12 },
                  { label: '18条/页', value: 18 },
                  { label: '24条/页', value: 24 },
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
