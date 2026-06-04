import {
  DownOutlined,
  SearchOutlined,
  LeftOutlined,
  RightOutlined,
} from "@ant-design/icons";
// import PageTitle from '@/components/stateless/common/PageTitle';
import { Dropdown, message } from "antd";
import { Suspense } from "react";

// import { enableStatusRecord } from '@/constants/business';
// import { ATG_MAP } from '@/constants/common';
import {
  addDataSource,
  addDb,
  deleteDataSource,
  deleteDb,
  fetchDataSourceList,
  updateDataSource,
} from "@/service/api";
import MetadataAnalysisDrawer from "@/components/metadata-analysis/MetadataAnalysisDrawer";
import type { MetadataAnalysisContext } from "@/components/metadata-analysis/types";
import { useRouter } from "~/packages/simple-router/src/hooks/useRouter";
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

import KeySearch from "./modules/key-search";

/**
 * 数据源管理页面组件 用于管理各类数据源（数据库、Excel 等）的连接和配置 支持数据源的增删改查、连接测试、数据预览等功能 包含数据源列表展示、搜索过滤、批量操作等功能
 * 支持多种数据源类型：MySQL、PostgreSQL、Excel 等
 */

const DB_TYPE_ICONS: Record<string, string> = {
  clickhouse: clickhouseIcon,
  dm: dmIcon,
  doris: dorisIcon,
  excel: excelIcon,
  hive: hiveIcon,
  mysql: mysqlIcon,
  oracle: oracleIcon,
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

export function Component() {
  const { t } = useTranslation();
  const { getSourceTypeOptions, sourceTypeOptions } = useDatasource();
  const router = useRouter();
  const [searchValue, setSearchValue] = useState('');
  const [analysisContext, setAnalysisContext] = useState<MetadataAnalysisContext | null>(null);
  const [jumpValue, setJumpValue] = useState('');

  useEffect(() => {
    getSourceTypeOptions();
  }, []);

  const handleListEdit = (record: any) => {
    if (record.excelDatasourceFlag) {
      const config = JSON.parse(record.configuration);
      if (config?.excelConfig) {
        let excelConfig = JSON.parse(config?.excelConfig);

        excelConfig = {
          ...excelConfig[0],
          sourceType: "Excel",
          sourceName: record.sourceName,
          sourceFile: excelConfig,
          excelDatasourceFlag: true,
        };
        edit(excelConfig);
      }
      return;
    } else {
      const config = JSON.parse(record.configuration);
      const formatRecord = {
        ...record,
        ...config,
        sheets: config,
        sourceFile: [{ name: config?.[0]?.fileName }],
        tableName: config?.[0]?.deTableName,
      };
      edit(formatRecord);
    }
  };

  const { columnChecks, data, run, searchProps, setColumnChecks, tableProps, updateSearchParams, searchParams } =
    useTable({
      apiFn: fetchDataSourceList as any,
      apiParams: {
        pageNum: 1,
        pageSize: 10,
        sourceName: searchValue,
        spaceId: Number(localStorage.getItem("spaceId")), // 空间id
      },
      columns: () =>
        [
          {
            align: "left",
            className: "col-source-name",
            dataIndex: "sourceName",
            key: "sourceName",
            minWidth: 140,
            onHeaderCell: () => ({ className: 'col-source-name' }),
            render: (text: string) => (
              <span className="source-name-text" title={text}>
                {text}
              </span>
            ),
            title: t("page.dataPreparation.dataSource.name"),
          },
          {
            align: "center",
            dataIndex: "sourceType",
            key: "sourceType",
            minWidth: 100,
            render: (sourceType: any) => {
              const option = sourceTypeOptions.find(
                (item: any) => item.sourceType === sourceType,
              );
              const name = option?.name || sourceType;
              const icon = getDbIcon(name, sourceType);
              return (
                <span
                  style={{
                    color: '#595959',
                    padding: '2px 0',
                    fontSize: '15px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    lineHeight: '1.5',
                  }}
                >
                  {icon && <img src={icon} alt="" style={{ width: 26, height: 20,objectFit: 'contain' }} />}
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
            minWidth: 140,
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
            minWidth: 140,
          },
          {
            align: "center",
            fixed: "right",
            key: "operate",
            width: 240,
            render: (_: unknown, record: any) => (
              <div className="flex items-center gap-12px" style={{ color: '#206BE0' }}>
                <AButton color="primary" size="small" variant="link" style={{ color: '#206BE0', fontSize: '15px' }} onClick={() => handleListEdit(record)}>
                  编辑
                </AButton>
                <AButton
                  color="primary"
                  size="small"
                  variant="link"
                  style={{ color: '#206BE0', fontSize: '15px' }}
                  onClick={() => router.push(`/workbench/data-preparation/data-source-view/${record.sourceId}`)}
                >
                  预览
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
                          <span onClick={() => setAnalysisContext({ nodeId: record.sourceId, nodeName: record.sourceName, nodeType: 'DATA_SOURCE', spaceId: Number(localStorage.getItem('spaceId')) || undefined })}>
                            元数据分析
                          </span>
                        ),
                      },
                      {
                        key: 'delete',
                        danger: true,
                        label: (
                          <APopconfirm title="提示" description={t('common.confirmDelete')} onConfirm={() => handleDelete(record)}>
                            <span>删除</span>
                          </APopconfirm>
                        ),
                      },
                    ],
                  }}
                >
                  <AButton color="primary" size="small" variant="link" style={{ color: '#206BE0', fontSize: '15px' }}>
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

  const {
    checkedRowKeys,
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
      spaceId: Number(localStorage.getItem("spaceId")),
    };

    if (sourceType === "Excel") {
      let file = res.sourceFile;
      file[0].sheets = res.sheets;
      commonData = {
        configuration: JSON.stringify(file),
        spaceId: Number(localStorage.getItem("spaceId")),
        fileSourceDbType: "mysql",
        ...res,
      };
    }
    message.destroy();
    if (type === "add") {
      // add request 调用新增的接口
      const addRes: any = await addDataSource(commonData);
      if (addRes?.response?.data?.code !== 200) {
        message.error(addRes?.response?.data?.msg);
        return false;
      }
      message.success(t("common.addSuccess"));
    } else {
      // edit request 调用编辑的接口
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
    // 额外调用接口，用于ai对话部分
    // const paramsData = {
    //   comment: res.sourceName,
    //   db_host: res.host,
    //   db_name: res.dbName,
    //   db_port: res.port,
    //   db_pwd: res.password,
    //   db_type: res.sourceType,
    //   db_user: res.userName
    // };
    // await addDb(paramsData);
  }, true);

  async function handleBatchDelete() {
    if (checkedRowKeys.length === 0) {
      message.warning('请先选择要删除的数据源');
      return;
    }
    const spaceId = Number(localStorage.getItem('spaceId'));
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
      spaceId: Number(localStorage.getItem("spaceId")),
    });

    if (res.response.data.code === 200) {
      // const config = JSON.parse(record.configuration);
      // await deleteDb(config.dbName);

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

  // 自定义分页逻辑（从 searchParams 直接读取页码，避免 tableProps.pagination.current 为 undefined 的 bug）
  const pagination = tableProps.pagination as any;
  const currentPage = searchParams.current?.pageNum || searchParams.current?.page || 1;
  const pageSizeVal = searchParams.current?.pageSize || searchParams.current?.page_size || 10;
  const totalCount = pagination?.total || 0;
  const totalPages = Math.ceil(totalCount / pageSizeVal) || 1;

  const handlePageSizeChange = (value: number) => {
    pagination?.onChange?.(1, value);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      pagination?.onChange?.(page, pageSizeVal);
    }
  };

  const handlePrev = () => {
    if (currentPage > 1) {
      handlePageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      handlePageChange(currentPage + 1);
    }
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
      if (page === '...') {
        return (
          <span key={`ellipsis-${idx}`} className="page-item page-ellipsis">
            ...
          </span>
        );
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
    <div className="flex flex-col gap-2 p-6"
      style={{ height: '100%', minHeight: 0, overflow: 'hidden' }}
    >
      {/* 搜索栏 */}
      <div className="flex items-center justify-between gap-4" style={{ marginBottom: '0.5rem' }}>
        <AInput
          allowClear
          placeholder="请输入数据源名称"
          prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onPressEnter={handleSearch}
          style={{ width: '12rem' }}
        />
        <div className="flex items-center gap-2">
          <AButton type="primary" style={{ backgroundColor: '#206BE0'}} onClick={() => handleAdd()}>
            新增
          </AButton>
          <AButton
            disabled={checkedRowKeys.length === 0}
            style={{ borderColor: '#d9d9d9', color: '#333', borderRadius: '3px' }}
            onClick={() => handleBatchDelete()}
          >
            批量删除数据
          </AButton>
        </div>
      </div>

      {/* 表格 */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <div
          style={{
            border: '0.0625rem solid #d9d9d9',
            borderRadius: '0.5rem',
            overflow: 'hidden',
          }}
        >
          <div className="assistant-table-scroll" style={{ overflow: 'auto', maxHeight: '100%' }}>
            <ATable
              columns={tableProps.columns as any}
              dataSource={tableProps.dataSource}
              loading={tableProps.loading}
              pagination={false}
              rowKey="sourceId"
              rowSelection={rowSelection}
              scroll={tableProps.dataSource?.length > 0 ? { x: 'max-content' } : undefined}
              size="middle"
              className="data-source-table abi-std-table"
            />
          </div>
        </div>
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
            <button
              className="page-btn"
              disabled={currentPage === 1}
              onClick={handlePrev}
            >
              <LeftOutlined />
            </button>
            {renderPageNumbers()}
            <button
              className="page-btn"
              disabled={currentPage === totalPages}
              onClick={handleNext}
            >
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
    </div>
  );
}
