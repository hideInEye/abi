import {
  DownOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import PageTitle from '@/components/stateless/common/PageTitle';
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

import KeySearch from "./modules/key-search";

/**
 * 数据源管理页面组件 用于管理各类数据源（数据库、Excel 等）的连接和配置 支持数据源的增删改查、连接测试、数据预览等功能 包含数据源列表展示、搜索过滤、批量操作等功能
 * 支持多种数据源类型：MySQL、PostgreSQL、Excel 等
 */

const DatasourceOperateDrawer = lazy(
  () => import("./modules/data-source-operate-drawer"),
);

export function Component() {
  const { t } = useTranslation();
  const { getSourceTypeOptions, sourceTypeOptions } = useDatasource();
  const router = useRouter();
  const [searchValue, setSearchValue] = useState('');
  const [analysisContext, setAnalysisContext] = useState<MetadataAnalysisContext | null>(null);

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

  const { columnChecks, data, run, searchProps, setColumnChecks, tableProps, updateSearchParams, } =
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
            align: "center",
            dataIndex: "sourceType",
            key: "sourceType",
            minWidth: 100,
            render: (sourceType: any) =>
              sourceTypeOptions.find(
                (item: any) => item.sourceType === sourceType,
              )?.name,
            title: t("page.dataPreparation.dataSource.type"),
          },
          {
            align: "center",
            dataIndex: "sourceName",
            key: "sourceName",
            minWidth: 140,
            title: t("page.dataPreparation.dataSource.name"),
          },
          {
            align: "center",
            dataIndex: "createByName",
            key: "createByName",
            minWidth: 100,
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
              <div className="flex items-center gap-12px">
                <AButton color="primary" size="small" variant="link" onClick={() => handleListEdit(record)}>
                  编辑
                </AButton>
                <AButton
                  color="primary"
                  size="small"
                  variant="link"
                  onClick={() => router.push(`/workbench/data-preparation/data-source-view/${record.sourceId}`)}
                >
                  预览
                </AButton>
                <AButton
                  color="primary"
                  size="small"
                  variant="link"
                  onClick={() => router.push(`/workbench/data-preparation/data-collection-operate/${record.sourceId}?from=data-source`)}
                >
                  创建数据集
                </AButton>
                <Dropdown
                  menu={{
                    items: [
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
                  <AButton color="primary" size="small" variant="link">
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
  });

  // async function handleBatchDelete() {
  //   // request
  //   console.log(checkedRowKeys);
  //   onBatchDeleted();
  // }

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

  return (
    <div className="flex flex-col gap-2 p-6"
      style={{ height: '100%', minHeight: 0, overflow: 'hidden' }}
    >
      <div className="flex items-center justify-between">
        <PageTitle />
        <AButton type="primary" onClick={() => handleAdd()}>
          新增
        </AButton>
      </div>
      {/* 搜索栏 */}
      <div className="flex items-center gap-4">
        <AInput
          allowClear
          placeholder="请输入数据源名称"
          prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onPressEnter={handleSearch}
          style={{ width: '12rem' }}
        />
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
        <div
          style={{
            padding: '0.75rem 0',
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: 'auto'
          }}
        >
          <APagination
            {...tableProps.pagination}
            showSizeChanger
            style={{ padding: '0' }}
          />
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
