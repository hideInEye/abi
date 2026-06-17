import { ApartmentOutlined, DeleteOutlined, DownOutlined, EditOutlined, LeftOutlined, MoreOutlined, RightOutlined } from '@ant-design/icons';
import { Dropdown, Empty, message } from 'antd';
import type { TableProps } from 'antd';

import MetadataAnalysisDrawer from '@/components/metadata-analysis/MetadataAnalysisDrawer';
import type { MetadataAnalysisContext } from '@/components/metadata-analysis/types';
import { ViewControls } from '@/components/ViewControls';
import type { ColumnOption } from '@/components/ViewControls';

const ALL_COLUMNS: ColumnOption[] = [
  { key: 'bizName', label: '数据语义名称', visible: true },
  { key: 'createBy', label: '创建人', visible: true },
  { key: 'createTime', label: '创建时间', visible: true },
  { key: 'updateBy', label: '操作人', visible: false },
  { key: 'updateTime', label: '操作时间', visible: true },
];

interface DataType {
  bizName: string;
  createBy: string;
  createTime: string;
  groupId?: number;
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
  const [checkedRowKeys, setCheckedRowKeys] = useState<React.Key[]>([]);
  const [selectedRows, setSelectedRows] = useState<DataType[]>([]);

  const visibleKeys = useMemo(() => new Set(columnOptions.filter(c => c.visible).map(c => c.key)), [columnOptions]);

  const handleColumnToggle = (key: string, visible: boolean) => {
    setColumnOptions(prev => prev.map(c => c.key === key ? { ...c, visible } : c));
  };

  // Batch delete
  const handleBatchDelete = () => {
    if (checkedRowKeys.length === 0) {
      message.warning('请先选择要删除的数据');
      return;
    }
    selectedRows.forEach(record => deleteTable(record));
    setCheckedRowKeys([]);
    setSelectedRows([]);
  };

  const rowSelection: TableProps<DataType>['rowSelection'] = {
    fixed: true,
    selectedRowKeys: checkedRowKeys,
    onChange: (keys, rows) => {
      setCheckedRowKeys(keys);
      setSelectedRows(rows);
    },
  };

  const allColumns: TableProps<DataType>['columns'] = [
    {
      align: 'left',
      className: 'col-biz-name',
      dataIndex: 'bizName',
      key: 'bizName',
      minWidth: 200,
      onHeaderCell: () => ({ className: 'col-biz-name' }),
      render: (text: string) => (
        <span style={{ fontWeight: 600 }} title={text}>{text}</span>
      ),
      title: '数据语义名称'
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
      minWidth: 150,
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
      minWidth: 150,
      title: '操作时间'
    },
    {
      align: 'center',
      fixed: 'right',
      key: 'action',
      minWidth: 150,
      title: '操作',
      render: (_, record) => (
        <div className="ds-action-group">
          <AButton className="abi-action-link" size="small" variant="link" onClick={() => editTable(record)}>
            <EditOutlined style={{ marginRight: 3, fontSize: 12 }} />编辑
          </AButton>
          <Dropdown
            menu={{
              items: [
                {
                  key: 'metadata',
                  label: (
                    <span><ApartmentOutlined style={{ marginRight: 4 }} />元数据分析</span>
                  ),
                  onClick: () => setAnalysisContext({ nodeId: record.schemaId, nodeName: record.bizName, nodeType: 'TABLE_SEMANTIC', spaceId: Number(localStorage.getItem('spaceId')) || undefined })
                },
                { type: 'divider' },
                {
                  key: 'delete',
                  danger: true,
                  label: (
                    <APopconfirm title="提示" description="确定要删除吗？" onConfirm={() => deleteTable(record)}>
                      <span><DeleteOutlined style={{ marginRight: 4 }} />删除</span>
                    </APopconfirm>
                  ),
                },
              ],
            }}
          >
            <AButton className="abi-action-link" size="small" variant="link">
              更多 <DownOutlined style={{ fontSize: '0.625rem' }} />
            </AButton>
          </Dropdown>
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
  const renderCardGrid = () => {
    if (pagedTableSchemaList.length === 0) {
      return (
        <div className="abi-card-empty">
          <Empty description="暂无数据语义" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      );
    }

    return (
      <div className="abi-card-grid">
        <div className="abi-card-grid-inner">
          {pagedTableSchemaList.map((record: DataType) => (
            <div key={record.schemaId || record.id} className="abi-data-card">
              <div className="abi-data-card-head">
                <div className="abi-data-card-title">
                  <span className="abi-data-card-name" title={record.bizName}>{record.bizName}</span>
                </div>
                <span className="abi-db-tag tag-default">{record.techName || '-'}</span>
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
              <div className="abi-data-card-footer">
                <button className="abi-card-act" onClick={() => editTable(record)}>
                  <EditOutlined style={{ marginRight: 3 }} />编辑
                </button>
                <button className="abi-card-act" onClick={() => setAnalysisContext({ nodeId: record.schemaId, nodeName: record.bizName, nodeType: 'TABLE_SEMANTIC', spaceId: Number(localStorage.getItem('spaceId')) || undefined })}>
                  <ApartmentOutlined style={{ marginRight: 3 }} />元数据
                </button>
                <Dropdown
                  menu={{
                    items: [
                      { key: 'delete', danger: true, label: '删除' },
                    ],
                    onClick: ({ key, domEvent }) => {
                      domEvent.stopPropagation();
                      if (key === 'delete') deleteTable(record);
                    }
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
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      {/* Toolbar */}
      <div className="abi-toolbar">
        <div className="abi-toolbar-left">
          {toolbarLeft}
          <AButton
            className="btn-ghost-v5"
            disabled={checkedRowKeys.length === 0}
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
              rowKey="schemaId"
              rowSelection={viewMode === 'list' ? rowSelection : undefined}
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
