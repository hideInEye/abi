import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { message, Tooltip } from 'antd';
import { Suspense } from 'react';

// import { enableStatusRecord } from '@/constants/business';
// import { ATG_MAP } from '@/constants/common';
import { deleteCollection, fetchDataCollectionList } from '@/service/api';
import { useRouter } from '~/packages/simple-router/src';

import KeySearch from './modules/key-search';

/** 数据集合管理页面组件 用于管理数据集合（数据集）的创建、编辑、删除和预览 支持数据集的操作、数据源关联、守族门查看等功能 包含数据集列表展示、搜索过滤、批量操作等功能 */

const DataCollectionOperateDrawer = lazy(() => import('./modules/data-collection-operate-drawer'));

export function Component() {
  const { t } = useTranslation();
  const { push } = useRouter();
  const [searchValue, setSearchValue] = useState('');

  const { dataSourceList, getDatasourceList } = useDatasource();
  useEffect(() => {
    getDatasourceList({ spaceId: Number(localStorage.getItem('spaceId')) });
  }, []);
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
      console.log(error);
    }
  };
  const columns = useCallback(
    () => [
      {
        align: 'left',
        dataIndex: 'viewName',
        key: 'viewName',
        minWidth: 120,
        title: t('page.dataPreparation.dataCollection.name')
      },
      {
        align: 'left',
        dataIndex: 'viewInfo',
        key: 'viewInfo',
        minWidth: 120,
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
        width: 100
      },
      {
        align: 'center',
        dataIndex: 'createTime',
        key: 'createTime',
        minWidth: 120,
        title: t('page.dataPreparation.dataCollection.createTime')
      },
      {
        align: 'center',
        dataIndex: 'updateBy',
        key: 'updateBy',
        minWidth: 120,
        title: t('page.dataPreparation.dataCollection.operator')
      },
      {
        align: 'center',
        dataIndex: 'updateTime',
        key: 'updateTime',
        minWidth: 120,
        title: t('page.dataPreparation.dataCollection.operateTime')
      },
      {
        align: 'center',
        fixed: 'right',
        key: 'operate',
        render: (_: unknown, record: any) => (
          <div className="flex-center gap-8px">
            <Tooltip title="编辑">
              <AButton
                color="primary"
                icon={<EditOutlined style={{ fontSize: '1rem' }} />}
                size="small"
                variant="link"
                onClick={() => toDetail(record)}
              />
            </Tooltip>
            <APopconfirm
              title="提示"
              description={t('common.confirmDelete')}
              onConfirm={() => handleDelete(record.viewId)}
            >
              <Tooltip title="删除">
                <AButton
                  color="danger"
                  icon={<DeleteOutlined style={{ fontSize: '1rem' }} />}
                  size="small"
                  variant="link"
                />
              </Tooltip>
            </APopconfirm>
            {/* <Tooltip title="血缘关系">
              <AButton
                color="primary"
                icon={<SvgIcon localIcon="kinship" style={{ fontSize: '1rem' }} />}
                size="small"
                variant="link"
                onClick={() => {
                  const viewName = record.viewName;
                  let sourceId = '';
                  try {
                    const viewInfo = JSON.parse(record.viewInfo);
                    const { currentDs } = viewInfo[0];
                    sourceId = currentDs.sourceId;
                  } catch (error) {
                    console.log(error);
                  }
                  push(`/workbench/data-preparation/data-source-kinship/${sourceId}?from=2&name=${viewName}`);
                }}
              />
            </Tooltip> */}
          </div>
        ),
        title: t('common.operate'),
        width: 195
      }
    ],
    [dataSourceList]
  );
  const { columnChecks, data, run, searchProps, setColumnChecks, tableProps, updateSearchParams } = useTable({
    apiFn: fetchDataCollectionList,
    apiParams: {
      pageNum: 1,
      pageSize: 10,
      spaceId: Number(localStorage.getItem('spaceId')),
      viewName: searchValue
    },
    columns
  } as any);

  const { checkedRowKeys, generalPopupOperation, onDeleted, rowSelection } = useTableOperate(data as any, run, async (res, type) => {
    if (type === 'add') {
      // add request 调用新增的接口
      // push('/data-preparation/data-collection-operate/0');
    } else {
      // edit request 调用编辑的接口
      console.log(res);
    }
  });

  async function handleDelete(id: number) {
    // request
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

  return (
    <div
      className="flex flex-col gap-2 p-6"
      style={{ height: '100%', minHeight: 0, overflow: 'hidden' }}
    >
      <h1 style={{ fontFamily: 'PingFangSC, PingFang SC', fontWeight: 600, fontSize: '1.125rem', color: '#333333' }}>数据集</h1>
      <div className="flex items-center gap-4">
        <AInput
          placeholder="请输入数据集名称"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onPressEnter={handleSearch}
          style={{ width: '12.5rem' }}
        />
        <AButton className="ml-auto" type="primary" onClick={() => push('/workbench/data-preparation/data-collection-operate/0')}>
          新增
        </AButton>
      </div>

      {/* 表格 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden'
        }}
      >
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
              columns={tableProps.columns as any}
              dataSource={tableProps.dataSource}
              loading={tableProps.loading}
              pagination={false}
              rowKey="viewId"
              rowSelection={rowSelection}
              scroll={tableProps.dataSource?.length > 0 ? { x: 'max-content' } : undefined}
              size="small"
              className="data-collection-table"
            />
          </div>
        </div>
        <div style={{ padding: '0.75rem 0', display: 'flex', justifyContent: 'flex-end', marginTop: 'auto' }}>
          <APagination {...tableProps.pagination} showSizeChanger style={{ padding: '0'}} />
        </div>
      </div>

      <Suspense>
        <DataCollectionOperateDrawer {...generalPopupOperation} />
      </Suspense>
    </div>
  );
}
