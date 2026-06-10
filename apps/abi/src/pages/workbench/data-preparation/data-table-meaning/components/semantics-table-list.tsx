import { ApartmentOutlined, DeleteOutlined, EditOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import type { TableProps } from 'antd';

import MetadataAnalysisDrawer from '@/components/metadata-analysis/MetadataAnalysisDrawer';
import type { MetadataAnalysisContext } from '@/components/metadata-analysis/types';
import { ViewControls } from '@/components/ViewControls';
import type { ColumnOption } from '@/components/ViewControls';

const ALL_COLUMNS: ColumnOption[] = [
  { key: 'bizName', label: '主机名', visible: true },
  { key: 'createBy', label: '创建人', visible: true },
  { key: 'createTime', label: '创建时间', visible: true },
  { key: 'updateBy', label: '操作人', visible: false },
  { key: 'updateTime', label: '操作时间', visible: true },
];

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
  readonly toolbarLeft?: React.ReactNode;
}

export function SemanticsTableList({ deleteTable, editTable, tableSchemaList = [], toolbarLeft }: SemanticsTableListProps) {
  const [analysisContext, setAnalysisContext] = useState<MetadataAnalysisContext | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');
  const [columnOptions, setColumnOptions] = useState<ColumnOption[]>(ALL_COLUMNS);

  const visibleKeys = useMemo(() => new Set(columnOptions.filter(c => c.visible).map(c => c.key)), [columnOptions]);

  const handleColumnToggle = (key: string, visible: boolean) => {
    setColumnOptions(prev => prev.map(c => c.key === key ? { ...c, visible } : c));
  };

  const allColumns: TableProps<DataType>['columns'] = [
    {
      align: 'center',
      dataIndex: 'bizName',
      key: 'bizName',
      minWidth: 160,
      render: text => (
        <APopover content={text}>
          <span className="max-w-100 overflow-hidden text-ellipsis">{text && text.length > 10 ? `${text.slice(0, 10)}...` : text}</span>
        </APopover>
      ),
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
      width: 230,
      title: '操作',
      render: (_, record) => (
        <div className="flex items-center justify-center" style={{ gap: 2 }}>
          <AButton className="abi-action-link" size="small" variant="link" onClick={() => editTable(record)}>
            编辑
          </AButton>
          <AButton
            className="abi-action-link"
            size="small"
            variant="link"
            onClick={() => setAnalysisContext({ nodeId: record.schemaId, nodeName: record.bizName, nodeType: 'TABLE_SEMANTIC', spaceId: Number(localStorage.getItem('spaceId')) || undefined })}
          >
            元数据分析
          </AButton>
          <APopconfirm title="提示" description="确定要删除吗？" onConfirm={() => deleteTable(record)}>
            <AButton className="abi-action-link-danger" size="small" variant="link">删除</AButton>
          </APopconfirm>
        </div>
      ),
    }
  ];

  // Filter columns by visibility (always keep action column)
  const columns = useMemo(() => {
    return allColumns.filter((col: any) => col.key === 'action' || visibleKeys.has(col.key));
  }, [visibleKeys]);

  const columnWidth = useMemo(() => {
    return columns!.reduce((total: number, column: any) => total + (column.minWidth || column.width || 100), 0);
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
      if (page === '...') return <span key={`ellipsis-${idx}`} className="page-item page-ellipsis">...</span>;
      const isActive = page === currentPage;
      return (
        <span key={page} className={`page-item ${isActive ? 'page-active' : ''}`} onClick={() => handlePageChange(page as number)}>
          {page}
        </span>
      );
    });
  };

  // Card grid
  const renderCardGrid = () => (
    <div className="abi-card-grid">
      <div className="abi-card-grid-inner">
        {pagedTableSchemaList.map((record: DataType) => (
          <div key={record.schemaId || record.id} className="abi-data-card">
            <div className="abi-data-card-head">
              <div className="abi-data-card-title">{record.bizName}</div>
              <span style={{ fontSize: 11, color: '#768a9f' }}>{record.techName}</span>
            </div>
            <div className="abi-data-card-body">
              {visibleKeys.has('createBy') && (
                <div className="row"><span className="lbl">创建人</span><span className="val">{record.createBy}</span></div>
              )}
              {visibleKeys.has('createTime') && (
                <div className="row"><span className="lbl">创建时间</span><span className="val">{record.createTime}</span></div>
              )}
              {visibleKeys.has('updateBy') && (
                <div className="row"><span className="lbl">操作人</span><span className="val">{record.updateBy}</span></div>
              )}
              {visibleKeys.has('updateTime') && (
                <div className="row"><span className="lbl">操作时间</span><span className="val">{record.updateTime}</span></div>
              )}
            </div>
            <div className="abi-data-card-footer">
              <button className="abi-card-act" onClick={() => editTable(record)}>编辑</button>
              <button className="abi-card-act" onClick={() => setAnalysisContext({ nodeId: record.schemaId, nodeName: record.bizName, nodeType: 'TABLE_SEMANTIC', spaceId: Number(localStorage.getItem('spaceId')) || undefined })}>元数据分析</button>
              <APopconfirm title="提示" description="确定要删除吗？" onConfirm={() => deleteTable(record)}>
                <button className="abi-card-act danger">删除</button>
              </APopconfirm>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      {/* View controls toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        {toolbarLeft && <div style={{ marginRight: 'auto' }}>{toolbarLeft}</div>}
        <ViewControls
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          columns={columnOptions}
          onColumnToggle={handleColumnToggle}
        />
      </div>

      {viewMode === 'list' ? (
        <div
          style={{
            border: '1px solid rgba(130,140,200,0.18)',
            borderRadius: '12px',
            overflow: 'hidden',
            width: '100%',
            maxHeight: '100%',
            flex: 1,
            minHeight: 0,
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
      ) : (
        renderCardGrid()
      )}

      <div className="data-source-pagination">
        <span className="total-text">共 {totalCount} 条</span>
        <div className="pagination-controls">
          <ASelect
            value={pageSize}
            onChange={(val: any) => { setPageSize(val); setCurrentPage(1); }}
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
      <MetadataAnalysisDrawer
        context={analysisContext}
        open={Boolean(analysisContext)}
        onClose={() => setAnalysisContext(null)}
      />
    </div>
  );
}
