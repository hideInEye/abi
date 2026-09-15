import {
  DatabaseOutlined,
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  EyeOutlined,
  LeftOutlined,
  MoreOutlined,
  PlusOutlined,
  ReloadOutlined,
  RightOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  Button as AButton,
  DatePicker as ADatePicker,
  Dropdown,
  Empty,
  Input as AInput,
  Popconfirm as APopconfirm,
  Select as ASelect,
  Table as ATable,
  message,
} from "antd";
import { Suspense } from "react";

import {
  addDataSource,
  deleteDataSource,
  fetchDataSourceList,
  updateDataSource,
} from "@/service/api";
import MetadataAnalysisDrawer from "@/components/metadata-analysis/MetadataAnalysisDrawer";
import { DeferredRangePicker, SearchFilterBar, SearchFilterField, getFilterPopupContainer } from '@/components/SearchFilterBar';
import { filterByCreateTime } from '@/utils/date';
import type { MetadataAnalysisContext } from "@/components/metadata-analysis/types";
import { ViewControls } from "@/components/ViewControls";
import type { ColumnOption } from "@/components/ViewControls";
import { useRouter } from "~/packages/simple-router/src/hooks/useRouter";
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
import { buildDataSourceEditRecord } from './dataSourceEdit';

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

const DatasourceOperateDrawer = lazy(
  () => import("./modules/data-source-operate-drawer"),
);

const DataSourcePreviewDrawer = lazy(
  () => import("./modules/data-source-preview-drawer"),
);

// Column definitions for picker
const DEFAULT_COLUMNS: ColumnOption[] = [
  { key: 'sourceName', label: '数据源名称', visible: true },
  { key: 'sourceType', label: '类型', visible: true },
  { key: 'createByName', label: '创建人', visible: true },
  { key: 'createTime', label: '创建时间', visible: true },
  { key: 'updateByName', label: '操作人', visible: false },
  { key: 'updateTime', label: '操作时间', visible: true },
];

export function Component() {
  const { t } = useTranslation();
  const { getSourceTypeOptions, sourceTypeOptions } = useDatasource();
  const router = useRouter();
  const spaceId = useAppSelector(getSpaceId);
  const [searchValue, setSearchValue] = useState('');
  const [analysisContext, setAnalysisContext] = useState<MetadataAnalysisContext | null>(null);
  const [jumpValue, setJumpValue] = useState('');
  const [dateRange, setDateRange] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'list' | 'card'>('card');
  const [columnOptions, setColumnOptions] = useState<ColumnOption[]>(DEFAULT_COLUMNS);
  const [previewSourceId, setPreviewSourceId] = useState<string | undefined>(undefined);

  useEffect(() => {
    getSourceTypeOptions();
  }, []);

  const handleListEdit = (record: any) => {
    try {
      edit(buildDataSourceEditRecord(record));
    } catch (error) {
      message.error(error instanceof Error ? error.message : '数据源配置格式错误，无法编辑');
    }
  };

  // Visible column keys set
  const visibleKeys = useMemo(() => new Set(columnOptions.filter(c => c.visible).map(c => c.key)), [columnOptions]);

  const handleColumnToggle = (key: string, visible: boolean) => {
    setColumnOptions(prev => prev.map(c => c.key === key ? { ...c, visible } : c));
  };

  const { columnChecks, data, run, searchProps, setColumnChecks, tableProps, updateSearchParams, searchParams } =
    useTable({
      apiFn: fetchDataSourceList as any,
      apiParams: useMemo(() => ({
        pageNum: 1,
        pageSize: 10,
        spaceId,
      }), [spaceId]),
      columns: () =>
        [
          {
            align: "left",
            className: "col-source-name",
            dataIndex: "sourceName",
            key: "sourceName",
            minWidth: 160,
            onHeaderCell: () => ({ className: 'col-source-name' }),
            render: (text: string, record: any) => {
              const option = sourceTypeOptions.find((item: any) => item.sourceType === record.sourceType);
              const typeName = option?.name || record.sourceType;
              const icon = getDbIcon(typeName, record.sourceType);
              return (
                <span className="source-name-cell">
                  {icon && <img src={icon} alt="" className="source-name-icon" />}
                  <span className="source-name-text" title={text}>{text}</span>
                </span>
              );
            },
            title: t("page.dataPreparation.dataSource.name"),
          },
          {
            align: "center",
            dataIndex: "sourceType",
            key: "sourceType",
            minWidth: 120,
            render: (sourceType: any) => {
              const option = sourceTypeOptions.find(
                (item: any) => item.sourceType === sourceType,
              );
              const name = option?.name || sourceType;
              return (
                <span className={`abi-db-tag ${getDbTagClass(name)}`}>
                  {name?.toUpperCase()}
                </span>
              );
            },
            title: t("page.dataPreparation.dataSource.type"),
          },
          {
            align: "center",
            className: "col-left",
            dataIndex: "createByName",
            key: "createByName",
            minWidth: 100,
            onHeaderCell: () => ({ className: 'col-left' }),
            title: t("page.dataPreparation.dataSource.creator"),
          },
          {
            align: "center",
            dataIndex: "createTime",
            key: "createTime",
            title: t("page.dataPreparation.dataSource.createTime"),
            minWidth: 150,
          },
          {
            align: "center",
            dataIndex: "updateByName",
            key: "updateByName",
            minWidth: 100,
            title: t("page.dataPreparation.dataSource.operator"),
          },
          {
            align: "center",
            dataIndex: "updateTime",
            key: "updateTime",
            title: t("page.dataPreparation.dataSource.operateTime"),
            minWidth: 150,
          },
          {
            align: "center",
            fixed: "right",
            key: "operate",
            minWidth: 200,
            render: (_: unknown, record: any) => (
              <div className="ds-action-group">
                <AButton className="abi-action-link" size="small" variant="link" onClick={() => handleListEdit(record)}>
                  <EditOutlined style={{ marginRight: 3, fontSize: 12 }} />编辑
                </AButton>
                <AButton
                  className="abi-action-link"
                  size="small"
                  variant="link"
                  onClick={() => setPreviewSourceId(record.sourceId)}
                >
                  <EyeOutlined style={{ marginRight: 3, fontSize: 12 }} />预览
                </AButton>
                <Dropdown
                  menu={{
                    items: [
                      {
                        key: 'collection',
                        label: (
                          <span onClick={() => router.push(`/workbench/data-preparation/data-collection-operate/${record.sourceId}?from=data-source`)}>
                            创建数据集
                          </span>
                        ),
                      },
                      {
                        key: 'analysis',
                        label: (
                          <span onClick={() => setAnalysisContext({ nodeId: record.sourceId, nodeName: record.sourceName, nodeType: 'DATA_SOURCE', spaceId: spaceId || undefined })}>
                            元数据分析
                          </span>
                        ),
                      },
                      { type: 'divider' },
                      {
                        key: 'delete',
                        danger: true,
                        label: (
                          <APopconfirm title="提示" description={t('common.confirmDelete')} onConfirm={() => handleDelete(record)}>
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
            title: t("common.operate"),
          },
        ] as any,
      rowKey: "spaceId",
    } as any);

  // Filter columns by visibility (always keep operate column)
  const filteredColumns = useMemo(() => {
    const cols = tableProps.columns as any[];
    if (!cols) return cols;
    return cols.filter((col: any) => col.key === 'operate' || visibleKeys.has(col.key));
  }, [tableProps.columns, visibleKeys]);

  const {
    checkedRowKeys,
    clearCheckedRowKeys,
    editingData,
    generalPopupOperation,
    handleAdd,
    handleEdit,
    onBatchDeleted,
    onDeleted,
    rowSelection,
  } = useTableOperate(data as any, run, async (res: any, type) => {
    const { sourceName, sourceType, ...elseProps } = res as any;
    let commonData: any = {
      configuration: JSON.stringify({
        ...elseProps,
        extraParams: "compress_algorithm=gzip",
      }),
      sourceName,
      sourceType,
      spaceId,
    };

    if (sourceType === "Excel") {
      let file = res.sourceFile;
      file[0].sheets = res.sheets;
      commonData = {
        configuration: JSON.stringify(file),
        spaceId,
        fileSourceDbType: "mysql",
        ...res,
      };
    }
    message.destroy();
    if (type === "add") {
      const addRes: any = await addDataSource(commonData);
      if (addRes?.response?.data?.code !== 200) {
        message.error(addRes?.response?.data?.msg);
        return false;
      }
      message.success(t("common.addSuccess"));
    } else {
      const sourceId = (editingData as any)?.sourceId;
      const updateRes: any = await updateDataSource({
        ...commonData,
        sourceId,
      });
      if (updateRes?.response?.data?.code !== 200) {
        message.error(updateRes?.response?.data?.msg);
        return false;
      }
      message.success(t("common.updateSuccess"));
    }
  }, true);
  const handleViewModeChange = (mode: 'list' | 'card') => {
    clearCheckedRowKeys();
    setViewMode(mode);
  };

  async function handleBatchDelete() {
    if (checkedRowKeys.length === 0) {
      message.warning('请先选择要删除的数据源');
      return;
    }
    const promises = checkedRowKeys.map((sourceId) =>
      deleteDataSource({ sourceId: Number(sourceId), spaceId }),
    );
    const results = await Promise.all(promises);
    const allSuccess = results.every((res: any) => res.response.data.code === 200);
    if (allSuccess) {
      onBatchDeleted();
    } else {
      message.error('批量删除部分失败');
    }
  }

  async function handleDelete(record: any) {
    const res = await deleteDataSource({
      sourceId: record.sourceId,
      spaceId,
    });
    if (res.response.data.code === 200) {
      onDeleted();
    }
  }

  function edit(row: any) {
    handleEdit(row);
  }

  const handleSearch = () => {
    const keyword = searchValue.trim();
    updateSearchParams({
      pageNum: 1,
      sourceName: keyword ? keyword : undefined,
    } as any);
  };

  const handleReset = () => {
    setSearchValue('');
    setDateRange(null);
    updateSearchParams({
      pageNum: 1,
      sourceName: undefined,
    } as any);
  };

  const pagination = tableProps.pagination as any;
  const currentPage = searchParams.current?.pageNum || searchParams.current?.page || 1;
  const pageSizeVal = searchParams.current?.pageSize || searchParams.current?.page_size || 10;
  // 前端按创建时间过滤 + 前端分页（useTable 返回全量数据）
  const filteredData = useMemo(() => filterByCreateTime((data as any[]) || [], dateRange), [data, dateRange]);
  const totalCount = filteredData.length;
  const totalPages = Math.ceil(totalCount / pageSizeVal) || 1;
  const pagedData = useMemo(
    () => filteredData.slice((currentPage - 1) * pageSizeVal, currentPage * pageSizeVal),
    [filteredData, currentPage, pageSizeVal]
  );

  const handlePageSizeChange = (value: number) => {
    pagination?.onChange?.(1, value);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      pagination?.onChange?.(page, pageSizeVal);
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

  // DB type → tag CSS class mapping
  const getDbTagClass = (typeName: string) => {
    const n = typeName?.toLowerCase().trim() || '';
    const map: Record<string, string> = {
      mysql: 'tag-mysql', postgresql: 'tag-postgresql', oracle: 'tag-oracle',
      clickhouse: 'tag-clickhouse', doris: 'tag-doris', starrocks: 'tag-starrocks',
      hive: 'tag-hive', dm: 'tag-dm', kingbase: 'tag-kingbase', excel: 'tag-excel',
    };
    for (const [key, cls] of Object.entries(map)) {
      if (n.includes(key)) return cls;
    }
    return 'tag-default';
  };

  // Card grid render helper
  const dataSource = pagedData;

  const renderCardGrid = () => {
    if (dataSource.length === 0 && !tableProps.loading) {
      return (
        <div className="abi-card-empty">
          <Empty description="暂无数据源" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      );
    }

    return (
      <div className="abi-card-grid">
        <div className="abi-card-grid-inner">
          {dataSource.map((record: any) => {
            const option = sourceTypeOptions.find((item: any) => item.sourceType === record.sourceType);
            const typeName = option?.name || record.sourceType;
            const icon = getDbIcon(typeName, record.sourceType);

            return (
              <div key={record.sourceId} className="abi-data-card">
                <div className="abi-data-card-head">
                  <div className="abi-data-card-title">
                    {icon && (
                      <span className="abi-data-card-icon">
                        <img src={icon} alt="" />
                      </span>
                    )}
                    <span className="abi-data-card-name" title={record.sourceName}>{record.sourceName}</span>
                  </div>
                  <span className={`abi-db-tag ${getDbTagClass(typeName)}`}>{typeName?.toUpperCase()}</span>
                </div>

                <div className="abi-data-card-body">
                  {visibleKeys.has('createByName') && (
                    <div className="row"><span className="lbl">创建人</span><span className="val">{record.createByName || '-'}</span></div>
                  )}
                  {visibleKeys.has('createTime') && (
                    <div className="row"><span className="lbl">创建时间</span><span className="val">{record.createTime || '-'}</span></div>
                  )}
                  {visibleKeys.has('updateByName') && (
                    <div className="row"><span className="lbl">操作人</span><span className="val">{record.updateByName || '-'}</span></div>
                  )}
                  {visibleKeys.has('updateTime') && (
                    <div className="row"><span className="lbl">操作时间</span><span className="val">{record.updateTime || '-'}</span></div>
                  )}
                </div>

                <div className="abi-data-card-footer">
                  <button className="abi-card-act" onClick={() => handleListEdit(record)}>
                    <EditOutlined style={{ marginRight: 3 }} />编辑
                  </button>
                  <button className="abi-card-act" onClick={() => setPreviewSourceId(record.sourceId)}>
                    <EyeOutlined style={{ marginRight: 3 }} />预览
                  </button>
                  <Dropdown
                    menu={{
                      items: [
                        {
                          key: 'collection',
                          label: '创建数据集',
                        },
                        {
                          key: 'analysis',
                          label: '元数据分析',
                        },
                        { type: 'divider' },
                        {
                          key: 'delete',
                          danger: true,
                          label: '删除',
                        },
                      ],
                      onClick: ({ key, domEvent }) => {
                        domEvent.stopPropagation();
                        if (key === 'collection') {
                          router.push(`/workbench/data-preparation/data-collection-operate/${record.sourceId}?from=data-source`);
                        } else if (key === 'analysis') {
                          setAnalysisContext({ nodeId: record.sourceId, nodeName: record.sourceName, nodeType: 'DATA_SOURCE', spaceId: spaceId || undefined });
                        } else if (key === 'delete') {
                          // handled by popconfirm inside
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
          searchPlaceholder="请输入数据源名称"
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
                onChange={(dates) => { setDateRange(dates); updateSearchParams({ pageNum: 1 } as any); }}
              />
            </SearchFilterField>
          }
        />
      </section>

      {/* Data Area */}
      <section className="abi-data-area">
        {/* Toolbar */}
        <div className="abi-toolbar">
          <div className="abi-toolbar-left">
            <AButton className="btn-accent-gradient" onClick={() => handleAdd()}>
              <PlusOutlined />新增数据源
            </AButton>
            <AButton danger
              icon={<DeleteOutlined />}
              disabled={checkedRowKeys.length === 0}
              onClick={() => handleBatchDelete()}
            >
              批量删除{checkedRowKeys.length ? `(${checkedRowKeys.length})` : ''}
            </AButton>
          </div>
          <ViewControls
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
            columns={columnOptions}
            onColumnToggle={handleColumnToggle}
          />
        </div>

        {/* Content: table or cards */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {viewMode === 'list' ? (
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
                  columns={filteredColumns as any}
                  dataSource={pagedData}
                  loading={tableProps.loading}
                  pagination={false}
                  rowKey="sourceId"
                  rowSelection={viewMode === 'list' ? rowSelection : undefined}
                  scroll={pagedData?.length > 0 ? { x: 'max-content' } : undefined}
                  size="middle"
                  locale={{ emptyText: <TableEmpty description="暂无数据源" /> }}
                  className="data-source-table abi-std-table"
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
        <DatasourceOperateDrawer
          editingData={editingData}
          {...generalPopupOperation}
        />
      </Suspense>
      <MetadataAnalysisDrawer
        context={analysisContext}
        open={Boolean(analysisContext)}
        onClose={() => setAnalysisContext(null)}
      />
      <Suspense>
        <DataSourcePreviewDrawer
          open={Boolean(previewSourceId)}
          sourceId={previewSourceId}
          onClose={() => setPreviewSourceId(undefined)}
        />
      </Suspense>
    </div>
  );
}
