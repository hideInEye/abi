import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { Popconfirm, Table, Tooltip } from 'antd';
import React from 'react';

import type { TagGroup } from '../types';

interface TagTableProps {
  readonly dataSource: TagGroup[];
  readonly onDelete: (termId: number) => Promise<void>;
  readonly onEdit: (group: TagGroup) => void;
}

export const TagTable: React.FC<TagTableProps> = ({ dataSource, onDelete, onEdit }) => {
  const columns: any[] = [
    {
      align: 'left',
      dataIndex: 'bizName',
      key: 'bizName',
      title: '中文名',
      width: 120,
      ellipsis: true
    },
    {
      align: 'left',
      dataIndex: 'techName',
      key: 'techName',
      title: '英文名',
      width: 120,
      ellipsis: true
    },
    {
      align: 'left',
      dataIndex: 'termAlias',
      key: 'termAlias',
      title: '别名',
      width: 120,
      ellipsis: true
    },
    {
      align: 'left',
      dataIndex: 'remark',
      key: 'remark',
      title: '业务定义',
      width: 200,
      render: (text?: string) => {
        const val = text || '';
        const truncated = val.length > 10 ? `${val.slice(0, 12)}…` : val;
        return (
          <Tooltip title={val} placement="top">
            <span>{truncated}</span>
          </Tooltip>
        );
      }
    },
    {
      align: 'left',
      dataIndex: 'dataType',
      key: 'dataType',
      title: '数据类型',
      width: 120,
      ellipsis: true
    },
    {
      align: 'left',
      dataIndex: 'measurementUnit',
      key: 'measurementUnit',
      title: '计量单位',
      width: 120,
      ellipsis: true
    },
    {
      align: 'center',
      fixed: 'right',
      key: 'action',
      title: '操作',
      width: 140,
      render: (_: any, record: TagGroup) => (
        <div className="flex items-center justify-center" style={{ gap: 2 }}>
          <AButton className="abi-action-link" size="small" variant="link" onClick={() => onEdit(record)}>编辑</AButton>
          <Popconfirm
            cancelText="取消"
            description="确定要删除吗？"
            okText="确定"
            title="提示"
            onConfirm={() => onDelete(record.termId)}
          >
            <AButton className="abi-action-link-danger" size="small" variant="link">删除</AButton>
          </Popconfirm>
        </div>
      ),
    }
  ];

  const columnWidth = useMemo(() => {
    return columns.reduce((total, column) => total + (column.width || 0), 0);
  }, [columns]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [jumpValue, setJumpValue] = useState('');

  const pagedDataSource = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return dataSource.slice(startIndex, startIndex + pageSize);
  }, [currentPage, dataSource, pageSize]);

  const totalCount = dataSource.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  useEffect(() => {
    setCurrentPage(1);
  }, [dataSource, pageSize]);

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
            dataSource={pagedDataSource}
            rowKey="id"
            scroll={pagedDataSource?.length > 0 ? { x: columnWidth } : undefined}
            size="middle"
            className="technical-table abi-std-table"
            pagination={false}
          />
        </div>
      </div>
      <div className="data-source-pagination">
        <span className="total-text">共 {totalCount} 条</span>
        <div className="pagination-controls">
          <ASelect
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
