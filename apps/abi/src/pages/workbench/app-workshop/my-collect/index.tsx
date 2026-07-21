import { SearchOutlined } from "@ant-design/icons";
import React, { useEffect, useState } from "react";

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
  const [pageSize, setPageSize] = useState(10);
  const [jumpValue, setJumpValue] = useState('');
  const [searchValue, setSearchValue] = useState('');
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
    setCurrentPage(1);
    getRecordList();
  };

  useEffect(() => {
    setCurrentPage(1);
    setDataSource({ rows: [], total: 0 });
    getRecordList();
  }, [spaceId]);

  const handleNavigate = (r: OperateRecord) => {
    const { spaceId, sessionId } = r;
    switchToSpace(spaceId, undefined, { chatId: sessionId });
  };

  const handleCollect = async (id: string) => {
    const res: any = await fetchOperateNew({ sessionId: id, type: 2 });
    if (res.response.data.code !== 200) {
      message.error(res.response.data.msg);
    } else {
      message.success(res.response.data.msg);
      getRecordList();
    }
  };

  const columns: any[] = [
    { align: "center", dataIndex: "chatName", key: "chatName", minWidth: 140, title: "对话名称" },
    { align: "center", dataIndex: "spaceName", key: "spaceName", minWidth: 120, title: "所属空间" },
    { align: "center", dataIndex: "recentlyUseTime", key: "recentlyUseTime", minWidth: 140, title: "收藏时间" },
    {
      align: "center", dataIndex: "action", key: "action", width: 150, fixed: "right", title: "操作",
      render: (_: any, record: OperateRecord) => (
        <div className="ds-action-group">
          <AButton className="abi-action-link" size="small" variant="link" onClick={() => handleNavigate(record)}>进入对话</AButton>
          <AButton className="abi-action-link-danger" size="small" variant="link" onClick={() => handleCollect(record.sessionId)}>取消收藏</AButton>
        </div>
      ),
    },
  ];

  // Pagination
  const totalCount = dataSource.total || 0;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      getRecordList();
    }
  };

  const handlePageSizeChange = (value: number) => {
    setPageSize(value);
    setCurrentPage(1);
    getRecordList();
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      {/* Searchbar */}
      <section className="abi-searchbar">
        <div className="abi-search-row">
          <AInput
            allowClear
            placeholder="请输入对话名称"
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
            重置
          </AButton>
        </div>
      </section>

      {/* Data Area */}
      <section className="abi-data-area">
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
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
                dataSource={dataSource.rows}
                loading={false}
                pagination={false}
                rowKey="id"
                scroll={dataSource.rows?.length > 0 ? { x: 'max-content' } : undefined}
                size="middle"
                className="abi-std-table"
              />
            </div>
          </div>

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
