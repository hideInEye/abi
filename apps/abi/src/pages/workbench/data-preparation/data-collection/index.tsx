import { ApartmentOutlined, DeleteOutlined, DownOutlined, EditOutlined, EyeOutlined, LeftOutlined, MoreOutlined, PlusOutlined, ReloadOutlined, RightOutlined, SearchOutlined } from '@ant-design/icons';
import { Dropdown, Empty, message } from 'antd';
import { Suspense } from 'react';

import MetadataAnalysisDrawer from '@/components/metadata-analysis/MetadataAnalysisDrawer';
import { DeferredRangePicker, DeferredSelect, SearchFilterBar, SearchFilterField, getFilterPopupContainer } from '@/components/SearchFilterBar';
import type { MetadataAnalysisContext } from '@/components/metadata-analysis/types';
import { ViewControls } from '@/components/ViewControls';
import type { ColumnOption } from '@/components/ViewControls';
import { deleteCollection, fetchDataCollectionList } from '@/service/api';
import { filterByCreateTime } from '@/utils/date';
import { useRouter } from '~/packages/simple-router/src';
import { useAppSelector } from '@/hooks/business/useStore';
import { getSpaceId } from '@/store/slice/app';
import clickhouseIcon from '@/assets/imgs/home/deClickHouse.svg';
import dmIcon from '@/assets/imgs/home/deDm.svg';
import dorisIcon from '@/assets/imgs/home/deDoris.svg';
import excelIcon from '@/assets/imgs/home/Excel.svg';
import hiveIcon from '@/assets/imgs/home/deHive.svg';
import mysqlIcon from '@/assets/imgs/home/deMysql.svg';
import oracleIcon from '@/assets/imgs/home/deOracle.svg';
import postgresqlIcon from '@/assets/imgs/home/dePostgreSQL.svg';
import starrocksIcon from '@/assets/imgs/home/deStarrocks.svg';
import kingbaseIcon from '@/assets/imgs/home/kingbase.svg';

const DB_TYPE_ICONS: Record<string, string> = {
  ck: clickhouseIcon,
  clickhouse: clickhouseIcon,
  dm: dmIcon,
  doris: dorisIcon,
  excel: excelIcon,
  hive: hiveIcon,
  mysql: mysqlIcon,
  oracle: oracleIcon,
  pg: postgresqlIcon,
  postgresql: postgresqlIcon,
  starrocks: starrocksIcon,
  kingbase: kingbaseIcon,
};

function getDbIcon(name?: string, sourceType?: string): string | undefined {
  const n = name?.toLowerCase().trim() || '';
  const st = sourceType?.toLowerCase().trim() || '';
  if (DB_TYPE_ICONS[n]) return DB_TYPE_ICONS[n];
  if (DB_TYPE_ICONS[st]) return DB_TYPE_ICONS[st];
  const nNoSpace = n.replace(/\s+/g, '');
  if (DB_TYPE_ICONS[nNoSpace]) return DB_TYPE_ICONS[nNoSpace];
  for (const key of Object.keys(DB_TYPE_ICONS)) {
    if (n.includes(key) || st.includes(key)) {
      return DB_TYPE_ICONS[key];
    }
  }
  return undefined;
}

const DataCollectionOperateDrawer = lazy(() => import('./modules/data-collection-operate-drawer'));

const ALL_COLUMNS: ColumnOption[] = [
  { key: 'viewName', label: '数据集名称', visible: true },
  { key: 'viewInfo', label: '数据源名称', visible: true },
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
  // 创建方式筛选：'sql'=SQL创建，'union'=快速创建（与数据集记录的 viewType 对应）
  const [createType, setCreateType] = useState<string | undefined>(undefined);
  const [analysisContext, setAnalysisContext] = useState<MetadataAnalysisContext | null>(null);
  const [jumpValue, setJumpValue] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'card'>('card');
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
        align: 'left',
        className: 'col-dataset-name',
        dataIndex: 'viewName',
        key: 'viewName',
        minWidth: 180,
        onHeaderCell: () => ({ className: 'col-dataset-name' }),
        render: (text: string) => <span style={{ fontWeight: 600 }}>{text}</span>,
        title: '数据集名称'
      },
      {
        align: 'left',
        className: 'col-source-name',
        dataIndex: 'viewInfo',
        key: 'viewInfo',
        minWidth: 160,
        onHeaderCell: () => ({ className: 'col-source-name' }),
        render: (viewInfo: string) => {
          const info = JSON.parse(viewInfo)?.[0];
          const source = dataSourceList?.find((item: any) => item?.sourceId === info?.currentDs?.sourceId);
          const sourceName = source?.sourceName;
          const sourceType = source?.sourceType;
          const icon = getDbIcon(sourceType, sourceType);
          return (
            <span className="source-name-cell">
              {icon && <img src={icon} alt="" className="source-name-icon" />}
              <span className="source-name-text" title={sourceName}>{sourceName}</span>
            </span>
          );
        },
        title: '数据源名称'
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
        minWidth: 160,
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
        minWidth: 160,
        title: t('page.dataPreparation.dataCollection.operateTime')
      },
      {
        align: 'center',
        fixed: 'right',
        key: 'operate',
        minWidth: 200,
        render: (_: unknown, record: any) => (
          <div className="ds-action-group">
            <AButton className="abi-action-link" size="small" variant="link" onClick={() => toDetail(record)}>
              <EditOutlined style={{ marginRight: 3, fontSize: 12 }} />编辑
            </AButton>
            <AButton
              className="abi-action-link"
              size="small"
              variant="link"
              onClick={() => setAnalysisContext({ nodeId: record.viewId, nodeName: record.viewName, nodeType: 'DATASET', spaceId: spaceId || undefined })}
            >
              <ApartmentOutlined style={{ marginRight: 3, fontSize: 12 }} />元数据分析
            </AButton>
            <APopconfirm title="提示" description={t('common.confirmDelete')} onConfirm={() => handleDelete(record.viewId)}>
              <AButton className="abi-action-link" size="small" variant="link">
                <DeleteOutlined style={{ marginRight: 3, fontSize: 12 }} />删除
              </AButton>
            </APopconfirm>
          </div>
        ),
        title: t('common.operate')
      },
    ],
    [dataSourceList]
  );

  const { columnChecks, data, run, searchProps, setColumnChecks, tableProps } = useTable({
    apiFn: fetchDataCollectionList,
    apiParams: {
      pageNum: 1,
      // 一次性拉取全部数据，前端做名称/时间筛选与分页
      pageSize: 100000,
      spaceId,
      viewName: ''
    },
    columns
  } as any);

  // 前端分页状态
  const [fePage, setFePage] = useState(1);
  const [fePageSize, setFePageSize] = useState(12);

  // Filter columns by visibility (always keep operate column)
  const filteredColumns = useMemo(() => {
    const cols = tableProps.columns as any[];
    if (!cols) return cols;
    return cols.filter((col: any) => col.key === 'operate' || visibleKeys.has(col.key));
  }, [tableProps.columns, visibleKeys]);

  const { checkedRowKeys, clearCheckedRowKeys, generalPopupOperation, onDeleted, rowSelection } = useTableOperate(data as any, run, async (res, type) => {
    if (type === 'add') {
      // add request
    } else {
      console.log(res);
    }
  }, true);
  const handleViewModeChange = (mode: 'list' | 'card') => {
    clearCheckedRowKeys();
    setViewMode(mode);
  };

  async function handleDelete(id: number) {
    const res = await deleteCollection({ updateBy: '1', viewId: id });
    if (res.response.data.code !== 200) return;
    onDeleted();
  }

  async function handleBatchDelete() {
    if (!checkedRowKeys || checkedRowKeys.length === 0) return;
    const ids = checkedRowKeys as number[];
    const promises = ids.map(id => deleteCollection({ updateBy: '1', viewId: id }));
    const results = await Promise.all(promises);
    const allSuccess = results.every((res: any) => res.response.data.code === 200);
    if (allSuccess) {
      message.success(`成功删除 ${ids.length} 个数据集`);
      onDeleted();
    } else {
      message.error('部分数据集删除失败');
    }
  }

  // 名称/时间筛选均在前端进行，点击查询/重置不再请求接口
  const handleSearch = () => {
    setFePage(1);
  };

  const handleReset = () => {
    setSearchValue('');
    setDateRange(null);
    setCreateType(undefined);
    setFePage(1);
  };

  const currentPage = fePage;
  const pageSizeVal = fePageSize;
  const filteredData = useMemo(() => {
    const kw = searchValue.trim().toLowerCase();
    let rows = (tableProps.dataSource as any[]) || [];
    if (kw) rows = rows.filter((r: any) => String(r.viewName || '').toLowerCase().includes(kw));
    if (createType) rows = rows.filter((r: any) => r.viewType === createType);
    return filterByCreateTime(rows, dateRange, 'createTime');
  }, [tableProps.dataSource, searchValue, dateRange, createType]);
  const totalCount = filteredData.length;
  const totalPages = Math.ceil(totalCount / pageSizeVal) || 1;
  const pagedData = useMemo(() => filteredData.slice((currentPage - 1) * pageSizeVal, currentPage * pageSizeVal), [filteredData, currentPage, pageSizeVal]);

  // 筛选变化时回到第一页
  useEffect(() => {
    setFePage(1);
  }, [searchValue, dateRange, createType, tableProps.dataSource]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) setFePage(page);
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
  const dataSource = pagedData;

  const getDatasourceInfo = (record: any) => {
    try {
      const info = JSON.parse(record.viewInfo)?.[0];
      const source = dataSourceList?.find((item: any) => item?.sourceId === info?.currentDs?.sourceId);
      return {
        name: source?.sourceName || '-',
        type: source?.sourceType
      };
    } catch {
      return { name: '-', type: undefined };
    }
  };

  const renderCardGrid = () => {
    if (dataSource.length === 0) {
      return (
        <div className="abi-card-empty">
          <Empty description="暂无数据集" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      );
    }

    return (
      <div className="abi-card-grid">
        <div className="abi-card-grid-inner">
          {dataSource.map((record: any) => {
            const dsInfo = getDatasourceInfo(record);
            const icon = getDbIcon(dsInfo.type, dsInfo.type);
            return (
              <div key={record.viewId} className="abi-data-card">
                <div className="abi-data-card-head">
                  <div className="abi-data-card-title">
                    <span className="abi-data-card-name" title={record.viewName}>{record.viewName}</span>
                  </div>
                  <span className="abi-db-tag tag-default">
                    {icon && <img src={icon} alt="" style={{ width: 16, height: 16, marginRight: 4, verticalAlign: 'middle' }} />}
                    {dsInfo.name}
                  </span>
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
                  <button className="abi-card-act" onClick={() => toDetail(record)}>
                    <EditOutlined style={{ marginRight: 3 }} />编辑
                  </button>
                  <button className="abi-card-act" onClick={() => setAnalysisContext({ nodeId: record.viewId, nodeName: record.viewName, nodeType: 'DATASET', spaceId: spaceId || undefined })}>
                    <ApartmentOutlined style={{ marginRight: 3 }} />元数据
                  </button>
                  <Dropdown
                    menu={{
                      items: [
                        { key: 'delete', danger: true, label: '删除' },
                      ],
                      onClick: ({ key, domEvent }) => {
                        domEvent.stopPropagation();
                        if (key === 'delete') handleDelete(record.viewId);
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
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      {/* Searchbar */}
      <section className="abi-searchbar">
        <SearchFilterBar
          searchPlaceholder="请输入数据集名称"
          searchValue={searchValue}
          onQuery={handleSearch}
          onReset={handleReset}
          onSearchChange={setSearchValue}
          filters={
            <>
              <SearchFilterField label="时间范围">
                <DeferredRangePicker
                  allowClear
                  className="abi-field-input"
                  format="YYYY-MM-DD"
                  getPopupContainer={getFilterPopupContainer}
                  placeholder={['开始时间', '结束时间']}
                  value={dateRange}
                  onChange={(dates) => { setDateRange(dates); setFePage(1); }}
                />
              </SearchFilterField>
              <SearchFilterField label="创建方式">
                <DeferredSelect
                  allowClear
                  className="abi-field-input"
                  getPopupContainer={getFilterPopupContainer}
                  placeholder="请选择创建方式"
                  options={[
                    { label: 'SQL创建', value: 'sql' },
                    { label: '快速创建', value: 'union' },
                  ]}
                  value={createType}
                  onChange={(val) => { setCreateType(val); setFePage(1); }}
                />
              </SearchFilterField>
            </>
          }
        />
      </section>

      {/* Data Area */}
      <section className="abi-data-area">
        <div className="abi-toolbar">
          <div className="abi-toolbar-left">
            <Dropdown.Button
              className="btn-accent-dropdown"
              icon={<DownOutlined />}
              menu={{
                items: [
                  {
                    key: 'union',
                    label: (
                      <div className="py-1">
                        <div className="text-sm font-semibold">快速创建</div>
                        <div className="mt-1 text-xs text-gray-400">拖放式快速构建数据集</div>
                      </div>
                    ),
                  },
                  {
                    key: 'sql',
                    label: (
                      <div className="py-1">
                        <div className="text-sm font-semibold">SQL创建</div>
                        <div className="mt-1 text-xs text-gray-400">编写SQL语句创建数据集</div>
                      </div>
                    ),
                  },
                ],
                onClick: ({ key }) => push(`/workbench/data-preparation/data-collection-operate/0?viewType=${key}`),
              }}
              placement="bottom"
              type="primary"
              onClick={() => push('/workbench/data-preparation/data-collection-operate/0?viewType=union')}
            >
              <PlusOutlined />新增数据集
            </Dropdown.Button>
            <APopconfirm
              title="提示"
              description={`确定要删除选中的 ${checkedRowKeys?.length || 0} 个数据集吗？`}
              onConfirm={handleBatchDelete}
              disabled={!checkedRowKeys || checkedRowKeys.length === 0}
            >
              <AButton danger
                disabled={!checkedRowKeys || checkedRowKeys.length === 0}
              >
                <DeleteOutlined />批量删除{checkedRowKeys && checkedRowKeys.length > 0 ? `(${checkedRowKeys.length})` : ''}
              </AButton>
            </APopconfirm>
          </div>
          <ViewControls
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
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
                dataSource={pagedData}
                loading={tableProps.loading}
                pagination={false}
                rowKey="viewId"
                rowSelection={viewMode === 'list' ? rowSelection : undefined}
                scroll={pagedData.length > 0 ? { x: 'max-content' } : undefined}
                size="middle"
                locale={{ emptyText: <TableEmpty description="暂无数据集" /> }}
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
              onChange={(value: number) => { setFePageSize(value); setFePage(1); }}
              options={[
                { label: '12条/页', value: 12 },
                { label: '18条/页', value: 18 },
                { label: '24条/页', value: 24 },
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
