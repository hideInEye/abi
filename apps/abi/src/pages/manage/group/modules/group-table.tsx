import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Suspense } from 'react';

import { fetchGetRoleList } from '@/service/api';

import GroupSearch from './group-search';

const GroupOperateDrawer = lazy(() => import('./group-operate-drawer'));

const GroupTable: FC = memo(() => {
  const { t } = useTranslation();
  const { scrollConfig, tableWrapperRef } = useTableScroll();

  const { columnChecks, data, run, searchProps, setColumnChecks, tableProps } = useTable({
    apiFn: fetchGetRoleList,
    apiParams: {
      current: 1,
      keyword: null,
      size: 10
    },
    columns: () =>
      [
        {
          align: 'center',
          dataIndex: 'index',
          key: 'index',
          title: '序号',
          width: 64
        },
        {
          align: 'center',
          dataIndex: 'userName',
          key: 'userName',
          minWidth: 100,
          title: '组织名称'
        },
        {
          align: 'center',
          dataIndex: 'userGender',
          key: 'userGender',
          title: '组织编号',
          width: 100
        },
        {
          align: 'center',
          dataIndex: 'userEmail',
          key: 'userEmail',
          minWidth: 200,
          title: '创建时间'
        },
        {
          align: 'center',
          dataIndex: 'operateTime',
          key: 'operateTime',
          title: '修改时间',
          width: 100
        },
        {
          align: 'center',
          key: 'operate',
          render: (_: unknown, record: any) => (
            <div className="flex-center gap-8px">
              <EditOutlined
                className="tex-14px mr-2"
                onClick={() => edit(record.id)}
              />
              <APopconfirm
                title={t('common.confirmDelete')}
                onConfirm={() => handleDelete(record.id)}
              >
                <DeleteOutlined
                  className="text-red"
                  type="error"
                />
              </APopconfirm>
            </div>
          ),
          title: t('common.operate'),
          width: 195
        }
      ] as any
  });
  const {
    checkedRowKeys,
    editingData,
    generalPopupOperation,
    handleAdd,
    handleEdit,
    // onBatchDeleted,
    onDeleted
    // rowSelection
  } = useTableOperate(data, run, async (res, type) => {
    if (type === 'add') {
      // add request 调用新增的接口
      console.log(res);
    } else {
      // edit request 调用编辑的接口
      console.log(res);
    }
  });

  function edit(id: number) {
    handleEdit(id);
  }
  function handleDelete() {
    onDeleted();
  }

  return (
    <div className="h-full min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
      <ACard>
        <GroupSearch {...searchProps} />
      </ACard>

      <ACard
        bordered={false}
        className="flex-col-stretch sm:flex-1-hidden card-wrapper"
        ref={tableWrapperRef}
        title="组织列表"
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
          // rowSelection={rowSelection}
          scroll={scrollConfig}
          size="small"
          {...tableProps}
        />

        <Suspense>
          <GroupOperateDrawer
            {...generalPopupOperation}
            rowId={editingData?.id || -1}
          />
        </Suspense>
      </ACard>
    </div>
  );
});

export default GroupTable;
