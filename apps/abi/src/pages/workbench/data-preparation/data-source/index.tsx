import {
  DeleteOutlined,
  EditOutlined,
  FileSearchOutlined,
} from "@ant-design/icons";
import { message, Tooltip } from "antd";
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

  // const isMobile = useMobile();

  const { scrollConfig, tableWrapperRef } = useTableScroll();

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

  const { columnChecks, data, run, searchProps, setColumnChecks, tableProps } =
    useTable({
      apiFn: fetchDataSourceList as any,
      apiParams: {
        pageNum: 1,
        pageSize: 10,
        sourceName: "",
        spaceId: Number(localStorage.getItem("spaceId")), // 空间id
      },
      columns: () =>
        [
          {
            align: "center",
            dataIndex: "index",
            key: "index",
            title: t("common.index"),
            width: 60,
          },
          {
            align: "center",
            dataIndex: "sourceType",
            key: "sourceType",
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
            title: t("page.dataPreparation.dataSource.name"),
          },
          {
            dataIndex: "configuration",
            key: "configuration",
            render: (configJson: any) => {
              const config = JSON.parse(configJson);
              return config?.host;
            },
            title: t("page.dataPreparation.dataSource.databaseAddress"),
          },
          {
            align: "center",
            dataIndex: "createByName",
            key: "createByName",
            // render: (_, record) => {
            //   if (record.status === null) {
            //     return null;
            //   }
            //   const label = t(enableStatusRecord[record.status]);
            //   return <ATag color={ATG_MAP[record.status]}>{label}</ATag>;
            // },
            title: t("page.dataPreparation.dataSource.creator"),
          },
          {
            dataIndex: "createTime",
            key: "createTime",
            title: t("page.dataPreparation.dataSource.createTime"),
            width: 160,
          },
          {
            dataIndex: "updateByName",
            key: "updateByName",
            title: t("page.dataPreparation.dataSource.operator"),
          },
          {
            dataIndex: "updateTime",
            key: "updateTime",
            title: t("page.dataPreparation.dataSource.operateTime"),
            width: 160,
          },
          {
            align: "center",
            key: "operate",
            render: (_: unknown, record: any) => (
              <div className="flex-center gap-8px">
                <Tooltip title="编辑">
                  <AButton
                    color="primary"
                    icon={<EditOutlined />}
                    size="small"
                    variant="link"
                    onClick={() => {
                      handleListEdit(record);
                    }}
                  />
                </Tooltip>
                <Tooltip title="预览">
                  <AButton
                    color="primary"
                    icon={<FileSearchOutlined />}
                    size="small"
                    variant="link"
                    onClick={() =>
                      router.push(
                        `/data-preparation/data-source-view/${record.sourceId}`,
                      )
                    }
                  />
                </Tooltip>
                <Tooltip title="创建数据集">
                  <AButton
                    color="primary"
                    icon={<SvgIcon localIcon="add-collection" />}
                    size="small"
                    variant="link"
                    onClick={() =>
                      router.push(
                        `/data-preparation/data-collection-operate/${record.sourceId}?from=data-source`,
                      )
                    }
                  />
                </Tooltip>
                <APopconfirm
                  title={t("common.confirmDelete")}
                  onConfirm={() => handleDelete(record)}
                >
                  <Tooltip title="删除">
                    <AButton
                      color="danger"
                      icon={<DeleteOutlined />}
                      size="small"
                      variant="link"
                    />
                  </Tooltip>
                </APopconfirm>
                {/* <Tooltip title="数据血缘">
                <AButton
                  color="primary"
                  icon={<SvgIcon localIcon="kinship" />}
                  size="small"
                  variant="link"
                  onClick={() => router.push(`/data-preparation/data-source-kinship/${record.sourceId}?from=1`)}
                />
              </Tooltip> */}
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

  return (
    <div className="h-full min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
      {/* <ACollapse
        bordered={false}
        className="card-wrapper"
        defaultActiveKey={isMobile ? undefined : '1'}
        items={[
          {
            children: <KeySearch {...searchProps} />,
            key: '1',
            label: t('common.search')
          }
        ]}
      /> */}
      <ACard>
        <KeySearch {...searchProps} />
      </ACard>

      <ACard
        bordered={false}
        className="flex-col-stretch sm:flex-1-hidden card-wrapper"
        ref={tableWrapperRef}
        title={t("page.dataPreparation.dataSource.title")}
        extra={
          <TableHeaderOperation
            add={handleAdd}
            columns={columnChecks}
            disabledDelete={checkedRowKeys.length === 0}
            loading={tableProps.loading}
            refresh={run}
            setColumnChecks={setColumnChecks}
            // onDelete={handleBatchDelete}
          />
        }
      >
        <ATable
          scroll={{ x: "max-content", y: "300px" }}
          size="small"
          {...(tableProps as any)}
        />

        <Suspense>
          <DatasourceOperateDrawer
            editingData={editingData}
            {...generalPopupOperation}
          />
        </Suspense>
      </ACard>
    </div>
  );
}
