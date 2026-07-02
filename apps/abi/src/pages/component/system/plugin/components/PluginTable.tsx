import { ApartmentOutlined, DeleteOutlined, DownOutlined, EditOutlined, LeftOutlined, MoreOutlined, RightOutlined } from '@ant-design/icons';
import { Dropdown, Empty, Typography, message } from 'antd';
import type { ColumnsType, TableProps } from 'antd/es/table';

import MetadataAnalysisDrawer from '@/components/metadata-analysis/MetadataAnalysisDrawer';
import type { MetadataAnalysisContext } from '@/components/metadata-analysis/types';
import type { PluginItem, PluginList } from '@/types/plug';
import { useAppSelector } from '@/hooks/business/useStore';
import { getSpaceId } from '@/store/slice/app';
import { ViewControls } from '@/components/ViewControls';
import type { ColumnOption } from '@/components/ViewControls';

const ALL_COLUMNS: ColumnOption[] = [
  { key: 'pluginName', label: 'MCP名称', visible: true },
  { key: 'remark', label: 'MCP描述', visible: true },
  { key: 'capabilities', label: '支持能力', visible: true },
  { key: 'pluginType', label: 'MCP类型', visible: true },
  { key: 'version', label: '版本', visible: true },
  { key: 'status', label: '状态', visible: true },
];

interface PluginTableProps {
  readonly current: number;
  readonly dataSource: {
    code: number;
    msg: string;
    rows: any[];
    total: number;
  };
  readonly deletePlugin: (data: PluginList) => void;
  readonly setcurrent: (current: number) => void;
  readonly updateCurrentEdit: (currentEdit: PluginItem) => void;
  readonly updateStatus: (record: PluginItem) => void;
  readonly onDetail?: (record: PluginItem) => void;
  readonly groupId: number;
  readonly onAdd: () => void;
}

export const PluginTable: React.FC<PluginTableProps> = ({
  current,
  dataSource,
  deletePlugin,
  setcurrent,
  updateCurrentEdit,
  updateStatus,
  onDetail,
  groupId,
  onAdd,
}: PluginTableProps) => {
  const spaceId = useAppSelector(getSpaceId);
  const [analysisContext, setAnalysisContext] = useState<MetadataAnalysisContext | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');
  const [columnOptions, setColumnOptions] = useState<ColumnOption[]>(ALL_COLUMNS);
  const [checkedRowKeys, setCheckedRowKeys] = useState<React.Key[]>([]);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);

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
    selectedRows.forEach(record => deletePlugin(record));
    setCheckedRowKeys([]);
    setSelectedRows([]);
  };

  const rowSelection: TableProps<any>['rowSelection'] = {
    columnWidth: 48,
    fixed: true,
    selectedRowKeys: checkedRowKeys,
    onChange: (keys, rows) => {
      setCheckedRowKeys(keys);
      setSelectedRows(rows);
    },
  };

  const allColumns: ColumnsType<any> = [
    {
      align: 'left',
      dataIndex: 'pluginName',
      className: 'col-plugin-name',
      key: 'pluginName',
      minWidth: 160,
      render: (text: string) => (
        <span style={{ fontWeight: 600 }} title={text}>{text}</span>
      ),
      title: 'MCP名称'
    },
    {
      align: 'left' as const,
      className: 'col-plugin-desc',
      dataIndex: 'remark',
      key: 'remark',
      minWidth: 200,
      onHeaderCell: () => ({ className: 'col-plugin-desc' }),
      onCell: () => ({ style: { whiteSpace: 'normal', wordBreak: 'break-all' as const, maxWidth: 300 } }),
      render: (text: string) => text
        ? <Typography.Paragraph ellipsis={{ rows: 2, tooltip: text }} style={{ marginBottom: 0, fontSize: 'inherit', color: 'inherit', maxWidth: 260 }}>{text}</Typography.Paragraph>
        : <span style={{ color: '#9ca3af' }}>-</span>,
      title: 'MCP描述'
    },
    {
      align: 'center',
      dataIndex: 'capabilities',
      key: 'capabilities',
      minWidth: 120,
      title: '支持能力',
      render: (_: unknown, record: any) => {
        const caps = record.capabilities ?? [];
        if (!caps.length) return '--';
        return (
          <ASpace size={4} wrap>
            {caps.map((item: string) => (
              <ATag color="blue" key={item}>{item}</ATag>
            ))}
          </ASpace>
        );
      }
    },
    {
      align: 'center',
      dataIndex: 'pluginType',
      key: 'pluginType',
      minWidth: 220,
      width: 220,
      title: 'MCP类型',
      render: (_: unknown, record: any) => {
        // 对齐 Nacos 官方：显示协议原文 + 存量转化标签
        const rp = (record.frontProtocol || record.protocol || '');
        const isLegacy = record.protocol === 'http' || record.protocol === 'https';
        return (
          <ASpace size={4} style={{ whiteSpace: 'nowrap' }}>
            <span>{rp || '--'}</span>
            {isLegacy && <ATag color="green" style={{ margin: 0 }}>存量转化</ATag>}
          </ASpace>
        );
      }
    },
    {
      align: 'center',
      dataIndex: 'version',
      key: 'version',
      minWidth: 80,
      title: '版本',
      render: (_: unknown, record: any) => record?.versionDetail?.version || '--'
    },
    {
      align: 'center',
      dataIndex: 'status',
      key: 'status',
      minWidth: 80,
      render: (status: number, record: any) => {
        return (
          <ASwitch
            checked={status === 1}
            onChange={() => updateStatus(record)}
          />
        );
      },
      title: '状态'
    },
    {
      align: 'center',
      fixed: 'right',
      key: 'action',
      minWidth: 180,
      title: '操作',
      render: (_: any, record: any) => (
        <div className="ds-action-group">
          <AButton className="abi-action-link" size="small" variant="link" onClick={() => updateCurrentEdit(record)}>
            <EditOutlined style={{ marginRight: 3, fontSize: 12 }} />编辑
          </AButton>
          <Dropdown
            menu={{
              items: [
                {
                  key: 'detail',
                  label: <span>详情</span>,
                  onClick: () => onDetail?.(record),
                },
                {
                  key: 'metadata',
                  label: (
                    <span><ApartmentOutlined style={{ marginRight: 4 }} />元数据分析</span>
                  ),
                  onClick: () => setAnalysisContext({ nodeId: record.pluginId, nodeName: record.pluginName, nodeType: 'MCP', spaceId: spaceId || undefined })
                },
                { type: 'divider' },
                {
                  key: 'delete',
                  danger: true,
                  label: (
                    <APopconfirm title="提示" description="确定删除该MCP服务吗？" onConfirm={() => deletePlugin(record)}>
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
    return columns.reduce((total: number, column: any) => total + (column.minWidth || column.width || 100), 0);
  }, [columns]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [jumpValue, setJumpValue] = useState('');

  const pagedList = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return dataSource.rows.slice(startIndex, startIndex + pageSize);
  }, [currentPage, pageSize, dataSource.rows]);

  const totalCount = dataSource.total;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize, dataSource.rows]);

  // Sync with parent current
  useEffect(() => {
    setCurrentPage(current);
  }, [current]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setcurrent(page);
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

  // Card grid
  const renderCardGrid = () => {
    if (pagedList.length === 0) {
      return (
        <div className="abi-card-empty">
          <Empty description="暂无MCP服务" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      );
    }

    return (
      <div className="abi-card-grid">
        <div className="abi-card-grid-inner">
          {pagedList.map((record: any) => (
            <div key={record.pluginId} className="abi-data-card">
              <div className="abi-data-card-head">
                <div className="abi-data-card-title">
                  <span className="abi-data-card-name" title={record.pluginName}>{record.pluginName}</span>
                </div>
                <ASwitch checked={record.status === 1} size="small" onChange={() => updateStatus(record)} />
              </div>
              <div className="abi-data-card-body">
                {visibleKeys.has('remark') && (
                  <div className="row"><span className="lbl">描述</span><span className="val">{record.remark || '-'}</span></div>
                )}
                {visibleKeys.has('pluginType') && (
                  <div className="row">
                    <span className="lbl">类型</span>
                    <span className="val">
                      {(() => {
                        const rp = record.frontProtocol || record.protocol || '';
                        const isLegacy = record.protocol === 'http' || record.protocol === 'https';
                        return (
                          <ASpace size={4}>
                            <span>{rp || '-'}</span>
                            {isLegacy && <ATag color="green" style={{ margin: 0 }}>存量转化</ATag>}
                          </ASpace>
                        );
                      })()}
                    </span>
                  </div>
                )}
                {visibleKeys.has('version') && (
                  <div className="row"><span className="lbl">版本</span><span className="val">{record.versionDetail?.version || '-'}</span></div>
                )}
              </div>
              <div className="abi-data-card-footer">
                <button className="abi-card-act" onClick={() => updateCurrentEdit(record)}>
                  <EditOutlined style={{ marginRight: 3 }} />编辑
                </button>
                <button className="abi-card-act" onClick={() => setAnalysisContext({ nodeId: record.pluginId, nodeName: record.pluginName, nodeType: 'MCP', spaceId: spaceId || undefined })}>
                  <ApartmentOutlined style={{ marginRight: 3 }} />元数据
                </button>
                <Dropdown
                  menu={{
                    items: [
                      { key: 'detail', label: '详情' },
                      { key: 'delete', danger: true, label: '删除' },
                    ],
                    onClick: ({ key, domEvent }) => {
                      domEvent.stopPropagation();
                      if (key === 'detail') {
                        onDetail?.(record);
                      } else if (key === 'delete') {
                        deletePlugin(record);
                      }
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
          <AButton type="primary" className="btn-accent-gradient" disabled={!groupId} onClick={onAdd}>
            + 新增MCP服务
          </AButton>
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
              scroll={pagedList?.length > 0 ? { x: columnWidth } : undefined}
              dataSource={pagedList}
              size="middle"
              className="plugin-table abi-std-table"
              pagination={false}
              rowKey="pluginId"
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
};
