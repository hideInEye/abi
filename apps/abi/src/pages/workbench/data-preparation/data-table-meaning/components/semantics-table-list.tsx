import { ApartmentOutlined, DeleteOutlined, EditOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import type { TableProps } from 'antd';

import MetadataAnalysisDrawer from '@/components/metadata-analysis/MetadataAnalysisDrawer';
import type { MetadataAnalysisContext } from '@/components/metadata-analysis/types';

interface DataType {
  bizName: string;
  createBy: string;
  createTime: string;
  id?: number | string;
  relViewId?: number | string;
  schemaId?: number | string;
  techName: string;
  updateBy: string;
  updateTime: string;
  viewName: string;
}

interface SemanticsTableListProps {
  readonly deleteTable: (record: DataType) => void;
  readonly editTable: (record: DataType) => void;
  readonly tableSchemaList: DataType[];
}

export function SemanticsTableList({ deleteTable, editTable, tableSchemaList = [] }: SemanticsTableListProps) {
  const [analysisContext, setAnalysisContext] = useState<MetadataAnalysisContext | null>(null);
  const columns: TableProps<DataType>['columns'] = [
    {
      align: 'center',
      dataIndex: 'bizName',
      key: 'bizName',
      minWidth: 160,
      render: text => {
        return (
          <APopover content={text}>
            <span className="max-w-100 overflow-hidden text-ellipsis">{text && text.length > 10 ? `${text.slice(0, 10)}...` : text}</span>
          </APopover>
        );
      },
      title: '主机名'
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
      minWidth: 140,
      title: '创建时间'
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
      minWidth: 140,
      title: '操作时间'
    },
    {
      align: 'center',
      fixed: 'right',
      key: 'action',
      minWidth: 600,
      title: '操作',
      render: (_, record) => (
        <div className="flex items-center justify-center gap-12px" style={{ color: '#206BE0' }}>
          <AButton color="primary" size="small" variant="link" style={{ color: '#206BE0', fontSize: '15px' }} onClick={() => editTable(record)}>
            编辑
          </AButton>
          <AButton
            color="primary"
            size="small"
            variant="link"
            style={{ color: '#206BE0', fontSize: '15px' }}
            onClick={() => setAnalysisContext({ nodeId: record.schemaId, nodeName: record.bizName, nodeType: 'TABLE_SEMANTIC', spaceId: Number(localStorage.getItem('spaceId')) || undefined })}
          >
            元数据分析
          </AButton>
          <APopconfirm title="提示" description="确定要删除吗？" onConfirm={() => deleteTable(record)}>
            <AButton color="danger" size="small" variant="link" style={{ fontSize: '15px' }}>删除</AButton>
          </APopconfirm>
        </div>
      ),
    }
  ];

  const columnWidth = useMemo(() => {
    return columns!.reduce((total, column: any) => total + (column.minWidth || column.width || 100), 0);
  }, [columns]);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [jumpValue, setJumpValue] = useState('');
  const pagedTableSchemaList = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return tableSchemaList.slice(startIndex, startIndex + pageSize);
  }, [currentPage, pageSize, tableSchemaList]);

  const totalCount = tableSchemaList.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize, tableSchemaList]);

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
      if (page === '...') {
        return <span key={`ellipsis-${idx}`} className="page-item page-ellipsis">...</span>;
      }
      const isActive = page === currentPage;
      return (
        <span
          key={page}
          className={`page-item ${isActive ? 'page-active' : ''}`}
          onClick={() => handlePageChange(page as number)}
        >
          {page}
        </span>
      );
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <div
        style={{
          border: '0.0625rem solid #d9d9d9',
          borderRadius: '0.5rem',
          overflow: 'hidden',
          width: '100%',
          maxHeight: '100%'
        }}
      >
        <div className="assistant-table-scroll" style={{ overflow: 'auto', maxHeight: '100%' }}>
          <ATable
            columns={columns}
            scroll={pagedTableSchemaList?.length > 0 ? { x: columnWidth } : undefined}
            dataSource={pagedTableSchemaList}
            size="middle"
            className="semantics-table abi-std-table"
            pagination={false}
          />
        </div>
      </div>
      <div className="data-source-pagination">
        <span className="total-text">共 {totalCount} 条</span>
        <div className="pagination-controls">
          <ASelect
            value={pageSize}
            onChange={(val) => { setPageSize(val); setCurrentPage(1); }}
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
              onChange={(e) => setJumpValue(e.target.value)}
              onPressEnter={handleJump}
            />
            页
          </span>
        </div>
      </div>
      <MetadataAnalysisDrawer
        context={analysisContext}
        open={Boolean(analysisContext)}
        onClose={() => setAnalysisContext(null)}
      />
    </div>
  );
}
