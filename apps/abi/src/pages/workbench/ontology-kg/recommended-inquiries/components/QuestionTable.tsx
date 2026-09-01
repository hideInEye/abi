import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { Popconfirm, Table } from 'antd';
import React from 'react';

import type { QuestionTableData } from '../types';

interface IQuestionTable {
  readonly dataSource: QuestionTableData[];
  readonly onDelete: (id: number) => Promise<void>;
  readonly onEdit: (group: QuestionTableData) => void;
  pagination: any;
  setPagination: any;
}

export const QuestionTable: React.FC<IQuestionTable> = ({ dataSource, onDelete, onEdit, pagination, setPagination }) => {
  const columns: any[] = [
    {
      align: 'left',
      dataIndex: 'question',
      key: 'question',
      title: '问题',
      minWidth: 200,
    },
    {
      align: 'center',
      fixed: 'right',
      key: 'action',
      width: 140,
      render: (_: any, record: QuestionTableData) => (
        <div className="flex items-center justify-center" style={{ gap: 2 }}>
          <AButton className="abi-action-link" size="small" variant="link" onClick={() => onEdit(record)}>编辑</AButton>
          <Popconfirm
            cancelText="取消"
            description="确定要删除吗？"
            okText="确定"
            title="提示"
            onConfirm={() => onDelete(record.problemId)}
          >
            <AButton className="abi-action-link-danger" size="small" variant="link">删除</AButton>
          </Popconfirm>
        </div>
      ),
      title: '操作'
    }
  ];

  const currentPage = pagination?.pageNum || 1;
  const pageSize = pagination?.pageSize || 10;
  const totalCount = pagination?.total || 0;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const [jumpValue, setJumpValue] = useState('');

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setPagination({ ...pagination, pageNum: page });
    }
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

  return (
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
          <Table
            columns={columns}
            dataSource={dataSource}
            rowKey="id"
            size="middle"
            className="question-table abi-std-table"
            pagination={false}
          />
        </div>
      </div>
      <div className="data-source-pagination">
        <span className="total-text">共 {totalCount} 条</span>
        <div className="pagination-controls">
          <ASelect
            value={pageSize}
            onChange={(val: number) => { setPagination({ ...pagination, pageSize: val, pageNum: 1 }); }}
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
          <button className="page-btn" disabled={currentPage === totalPages} onClick={handleNext}>
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
    </div>
  );
};
