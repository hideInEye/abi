import { ApartmentOutlined, DeleteOutlined, EditOutlined, LeftOutlined, MoreOutlined, RightOutlined, SearchOutlined } from '@ant-design/icons';
import { Dropdown, message, Tooltip } from 'antd';
import { Suspense } from 'react';

import MetadataAnalysisDrawer from '@/components/metadata-analysis/MetadataAnalysisDrawer';
import type { MetadataAnalysisContext } from '@/components/metadata-analysis/types';
import { ViewControls } from '@/components/ViewControls';
import type { ColumnOption } from '@/components/ViewControls';
import { deleteCollection, fetchDataCollectionList } from '@/service/api';
import { useRouter } from '~/packages/simple-router/src';
import { useAppSelector } from '@/hooks/business/useStore';
import { getSpaceId } from '@/store/slice/app';

const DataCollectionOperateDrawer = lazy(() => import('./modules/data-collection-operate-drawer'));

const ALL_COLUMNS: ColumnOption[] = [
  { key: 'viewName', label: '数据集名称', visible: true },
  { key: 'viewInfo', label: '数据源', visible: true },
  { key: 'createBy', label: '创建人', visible: true },
  { key: 'createTime', label: '创建时间', visible: true },
  { key: 'updateBy', label: '操作人', visible: false },
  { key: 'updateTime', label: '操作时间', visible: true },
];

export function Component() {
  const { t } = useTranslation();
  const { push } = useRouter();
  const spaceId = useAppSelector(getSpaceId);
  const [searchValue, setSearchValue] = useState('');
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);
  const [analysisContext, setAnalysisContext] = useState<MetadataAnalysisContext | null>(null);
  const [jumpValue, setJumpValue] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');
  const [columnOptions, setColumnOptions] = useState<ColumnOption[]>(ALL_COLUMNS);

  const { dataSourceList, getDatasourceList } = useDatasource();
  useEffect(() => {
    getDatasourceList({ spaceId });
  }, [spaceId]);

  const visibleKeys = useMemo(() => new Set(columnOptions.filter(c => c.visible).map(c => c.key)), [columnOptions]);

  const handleColumnToggle = (key: string, visible: boolean) => {
    setColumnOptions(prev => prev.map(c => c.key === key ? { ...c, visible } : c));
  };

  const toDetail = (record: any) => {
    try {
      const collectionViewInfo = JSON.parse(record.viewInfo);
      const collectionBingDatasourceId = collectionViewInfo[0]?.currentDs?.sourceId;
      const curSource = dataSourceList.find((item: any) => item.sourceId === collectionBingDatasourceId);
      const curSourceIsEnable = curSource.status === '1';
      if (curSourceIsEnable) {
        push(`/workbench/data-preparation/data-collection-operate/${record.viewId}`);
      } else {
        message.error('当前数据集关联的数据源已被删除，无法进入详情');
      }
    } catch (error) {
      message.error('当前数据集关联的数据源已被删除，无法进入详情');
    }
  };

  const columns = useCallback(
    () => [
      {
        align: 'center',
        dataIndex: 'viewName',
        key: 'viewName',
        minWidth: 140,
        title: t('page.dataPreparation.dataCollection.name')
      },
      {
        align: 'center',
        dataIndex: 'viewInfo',
        key: 'viewInfo',
        minWidth: 140,
        render: (viewInfo: string) => {
          const info = JSON.parse(viewInfo)?.[0];
          return dataSourceList?.find((item: any) => item?.sourceId === info?.currentDs?.sourceId)?.sourceName;
        },
        title: t('page.dataPreparation.dataCollection.datasource')
      },
      {
        align: 'center',
        dataIndex: 'createBy',
        key: 'createBy',
        title: t('page.dataPreparation.dataCollection.creator'),
        minWidth: 100
      },
      {
        align: 'center',
        dataIndex: 'createTime',
        key: 'createTime',
        minWidth: 140,
        title: t('page.dataPreparation.dataCollection.createTime')
      },
      {
        align: 'center',
        dataIndex: 'updateBy',
        key: 'updateBy',
        minWidth: 100,
        title: t('page.dataPreparation.dataCollection.operator')
      },
      {
        align: 'center',
        dataIndex: 'updateTime',
        key: 'updateTime',
        minWidth: 140,
        title: t('page.dataPreparation.dataCollection.operateTime')
      },
      {
        align: 'center',
        fixed: 'right',
        key: 'operate',
        minWidth: 200,
        render: (_: unknown, record: any) => (
          <div className="flex items-center justify-center" style={{ gap: 2 }}>
            <AButton className="abi-action-link" size="small" variant="link" onClick={() => toDetail(record)}>
              编辑
            </AButton>
            <AButton
              className="abi-action-link"
              size="small"
              variant="link"
              onClick={() => setAnalysisContext({ nodeId: record.viewId, nodeName: record.viewName, nodeType: 'DATASET', spaceId: spaceId || undefined })}
            >
              元数据分析
            </AButton>
            <APopconfirm title="提示" description={t('common.confirmDelete')} onConfirm={() => handleDelete(record.viewId)}>
              <AButton className="abi-action-link-danger" size="small" variant="link">删除</AButton>
            </APopconfirm>
          </div>
        ),
        title: t('common.operate')
      },
    ],
    [dataSourceList]
  );

  const { columnChecks, data, run, searchProps, setColumnChecks, tableProps, updateSearchParams, searchParams } = useTable({
    apiFn: fetchDataCollectionList,
    apiParams: {
      pageNum: 1,
      pageSize: 10,
      spaceId,
      viewName: searchValue
    },
    columns
  } as any);

  // Filter columns by visibility (always keep operate column)
  const filteredColumns = useMemo(() => {
    const cols = tableProps.columns as any[];
    if (!cols) return cols;
    return cols.filter((col: any) => col.key === 'operate' || visibleKeys.has(col.key));
  }, [tableProps.columns, visibleKeys]);

  const { checkedRowKeys, generalPopupOperation, onDeleted, rowSelection } = useTableOperate(data as any, run, async (res, type) => {
    if (type === 'add') {
      // add request
    } else {
      console.log(res);
    }
  });

  async function handleDelete(id: number) {
    const res = await deleteCollection({ updateBy: '1', viewId: id });
    if (res.response.data.code !== 200) return;
    onDeleted();
  }

  const handleSearch = () => {
    const keyword = searchValue.trim();
    updateSearchParams({
      pageNum: 1,
      viewName: keyword ? keyword : undefined
    } as any);
  };

  const handleReset = () => {
    setSearchValue('');
    setDateRange(null);
    updateSearchParams({ pageNum: 1, viewName: undefined } as any);
  };

  const pagination = tableProps.pagination as any;
  const currentPage = searchParams.current?.pageNum || searchParams.current?.page || 1;
  const pageSizeVal = searchParams.current?.pageSize || searchParams.current?.page_size || 10;
  const totalCount = pagination?.total || 0;
  const totalPages = Math.ceil(totalCount / pageSizeVal) || 1;

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) pagination?.onChange?.(page, pageSizeVal);
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
  const dataSource = tableProps.dataSource as any[] || [];

  const getDatasourceName = (record: any) => {
    try {
      const info = JSON.parse(record.viewInfo)?.[0];
      return dataSourceList?.find((item: any) => item?.sourceId === info?.currentDs?.sourceId)?.sourceName || '-';
    } catch {
      return '-';
    }
  };

  const renderCardGrid = () => (
    <div className="abi-card-grid">
      <div className="abi-card-grid-inner">
        {dataSource.map((record: any) => (
          <div key={record.viewId} className="abi-data-card">
            <div className="abi-data-card-head">
              <div className="abi-data-card-title">{record.viewName}</div>
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
            <div style={{ position: 'absolute', bottom: 18, right: 20, zIndex: 10 }}>
              <Dropdown
                menu={{
                  items: [
                    { key: 'edit', label: <span><EditOutlined style={{ marginRight: 6 }} />编辑</span> },
                    { key: 'analysis', label: <span><ApartmentOutlined style={{ marginRight: 6 }} />元数据分析</span> },
                    { key: 'delete', label: <span style={{ color: '#ff4d4f' }}><DeleteOutlined style={{ marginRight: 6 }} />删除</span> },
                  ],
                  onClick: ({ key, domEvent }) => {
                    domEvent.stopPropagation();
                    if (key === 'edit') toDetail(record);
                    else if (key === 'analysis') setAnalysisContext({ nodeId: record.viewId, nodeName: record.viewName, nodeType: 'DATASET', spaceId: spaceId || undefined });
                    else if (key === 'delete') handleDelete(record.viewId);
                  }
                }}
                trigger={['hover']}
              >
                <AButton type="text" size="small" style={{ color: '#8c8c8c' }}><MoreOutlined /></AButton>
              </Dropdown>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      {/* v5 Searchbar */}
      <section className="abi-searchbar">
        <div className="abi-search-row">
          <AInput
            allowClear
            placeholder="请输入数据集名称"
            prefix={<SearchOutlined style={{ color: '#a3b3c8' }} />}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onPressEnter={handleSearch}
            className="abi-field-input"
            style={{ width: '16rem' }}
          />
          <ADatePicker.RangePicker
            placeholder={['开始时间', '结束时间']}
            value={dateRange}
            onChange={(dates) => setDateRange(dates)}
            className="abi-field-input"
          />
          <AButton type="primary" className="btn-accent-gradient" onClick={handleSearch}>
            <SearchOutlined /> 查询
          </AButton>
          <AButton className="btn-ghost-v5" onClick={handleReset}>
            重置
          </AButton>
        </div>
      </section>

      {/* v5 Data Area */}
      <section className="abi-data-area">
        <div className="abi-toolbar">
          <div className="abi-toolbar-left">
            <AButton className="btn-accent-gradient" onClick={() => push('/workbench/data-preparation/data-collection-operate/0')}>
              + 新增数据集
            </AButton>
          </div>
          <ViewControls
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            columns={columnOptions}
            onColumnToggle={handleColumnToggle}
          />
        </div>

      {/* 内容区域 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden'
        }}
      >
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
                columns={filteredColumns as any}
                dataSource={tableProps.dataSource}
                loading={tableProps.loading}
                pagination={false}
                rowKey="viewId"
                rowSelection={viewMode === 'list' ? rowSelection : undefined}
                scroll={tableProps.dataSource?.length > 0 ? { x: 'max-content' } : undefined}
                size="middle"
                className="data-collection-table abi-std-table"
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
              value={pageSizeVal}
              onChange={(value: number) => pagination?.onChange?.(1, value)}
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
      </div>
      </section>

      <Suspense>
        <DataCollectionOperateDrawer {...generalPopupOperation} />
      </Suspense>
      <MetadataAnalysisDrawer
        context={analysisContext}
        open={Boolean(analysisContext)}
        onClose={() => setAnalysisContext(null)}
      />
    </div>
  );
}
