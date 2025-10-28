import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import React, { Suspense } from 'react';

import { enableStatusRecord } from '@/constants/business';
import { addDeptApi, deleteDeptApi, getDeptInfoApi, getDeptListApi, updateDeptApi } from '@/service/api/dept';

import DeptSearch from './modules/dept-search';

const DeptOperateDrawer = lazy(() => import('./modules/dept-operate-drawer'));

export function Component() {
  const { t } = useTranslation();

  const { scrollConfig, tableWrapperRef } = useTableScroll();

  const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);

  const { columnChecks, data, run, searchProps, setColumnChecks, tableProps } = useTreeTable({
    apiFn: getDeptListApi as any,
    apiParams: {
      deptName: '',
      status: ''
    },
    columns: () =>
      [
        {
          align: 'center',
          dataIndex: 'deptName',
          key: 'deptName',
          title: t('page.manage.dept.deptName')
        },
        {
          align: 'center',
          dataIndex: 'orderNum',
          key: 'orderNum',
          title: t('page.manage.common.sort')
        },
        {
          align: 'center',
          dataIndex: 'status',
          key: 'status',
          render: (_: any, record: { status: Api.Common.EnableStatus }) => {
            const label = t(enableStatusRecord[record.status]);
            if (record.status === '0') {
              return <ATag color="success">{label}</ATag>;
            }
            return <ATag color="error">{label}</ATag>;
          },
          title: t('page.manage.dept.status')
        },
        {
          dataIndex: 'createTime',
          key: 'createTime',
          title: t('page.manage.menu.createTime'),
          width: 160
        },
        {
          align: 'center',
          key: 'operate',
          render: (_: unknown, record: any) => (
            <div className="flex-center gap-8px">
              <ATooltip title={t('page.manage.common.edit')}>
                <AButton
                  color="primary"
                  icon={<EditOutlined />}
                  size="small"
                  variant="link"
                  onClick={() => edit(record.deptId)}
                />
              </ATooltip>

              <ATooltip title={t('page.manage.common.add')}>
                <AButton
                  className="tex-14px mr-2"
                  color="primary"
                  icon={<PlusOutlined />}
                  size="small"
                  variant="link"
                  onClick={() => add(record.deptId)}
                />
              </ATooltip>

              <APopconfirm
                title={t('common.confirmDelete')}
                onConfirm={() => handleDelete(record.deptId)}
              >
                <ATooltip title={t('page.manage.common.delete')}>
                  <DeleteOutlined
                    className="text-red"
                    type="error"
                  />
                </ATooltip>
              </APopconfirm>
            </div>
          ),
          title: t('common.operate'),
          width: 160
        }
      ] as any,
    rowKey: 'deptId'
  } as any);

  const { checkedRowKeys, editingData, generalPopupOperation, handleAdd, handleEdit, onDeleted } = useTableOperate(
    data as any,
    run,
    // eslint-disable-next-line
    async (res: any, type) => {
      if (type === 'add') {
        const params = {
          ...res
        };
        const addRes: any = await addDeptApi(params);
        if (addRes?.response?.data?.code !== 200) return false;
      } else if (type === 'edit') {
        const params = {
          ...res,
          deptId: editingData.deptId
        };
        const addRes: any = await updateDeptApi(params);
        if (addRes?.response?.data?.code !== 200) return false;
      }
    }
  );

  async function add(row: number | string) {
    handleAdd({
      parentId: row,
      status: '0'
    });
  }

  async function edit(row: number) {
    const res = await getDeptInfoApi(row);
    handleEdit({
      ...res.data
    });
  }

  async function handleDelete(deptId: number) {
    const res = await deleteDeptApi(deptId);
    if (res.response.data.code !== 200) return false;
    return onDeleted();
  }

  useEffect(() => {
    if (Array.isArray(data)) {
      const curExpandedRowKeys = [] as number[];
      data.forEach(item => {
        curExpandedRowKeys.push(item.deptId);
        if (Array.isArray(item.children)) {
          item.children.forEach((i: any) => {
            curExpandedRowKeys.push(i.deptId);
          });
        }
      });
      setExpandedRowKeys(curExpandedRowKeys);
    }
  }, [data]);

  return (
    <div className="h-full min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
      <ACard>
        <DeptSearch {...searchProps} />
      </ACard>

      <ACard
        bordered={false}
        className="flex-col-stretch sm:flex-1-hidden card-wrapper"
        ref={tableWrapperRef}
        title={t('page.manage.dept.title')}
        extra={
          <TableHeaderOperation
            columns={columnChecks}
            disabledDelete={checkedRowKeys.length === 0}
            loading={tableProps.loading}
            refresh={run}
            setColumnChecks={setColumnChecks}
            add={() => {
              add('');
            }}
          />
        }
      >
        <ATable
          scroll={scrollConfig}
          size="small"
          {...(tableProps as any)}
          pagination={false}
          expandable={{
            expandedRowKeys,
            indentSize: 24,
            onExpandedRowsChange: keys => setExpandedRowKeys([...keys])
          }}
        />
      </ACard>

      <Suspense>
        <DeptOperateDrawer {...generalPopupOperation} />
      </Suspense>
    </div>
  );
}
