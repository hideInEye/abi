import { CloseCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { useRoute } from '@sa/simple-router';
import { message } from 'antd';
import { Suspense } from 'react';

import { enableStatusRecord } from '@/constants/business';
import {
  assignUserList,
  assignUserSubmit,
  batchCancelAuthorizationApi,
  cancelAuthorizationApi
} from '@/service/api/role';
import {
  assignUserForSPaceRoleSubmit,
  batchCancelSpaceAuthorizationApi,
  cancelSpaceAuthorizationApi
} from '@/service/api/space-role';

import RoleAuthSearch from './modules/role-auth-search';

const RoleAuthOperateDrawer = lazy(() => import('./modules/role-auth-operate-drawer'));

export function Component() {
  const route = useRoute();
  const { id } = route.params;

  const { t } = useTranslation();

  const { scrollConfig, tableWrapperRef } = useTableScroll();

  const [visible, setVisible] = useState(false);
  const { search } = useLocation();
  const query = new URLSearchParams(search);
  const curType = query.get('type');

  const { columnChecks, data, run, searchProps, setColumnChecks, tableProps } = useTable({
    apiFn: assignUserList as any,
    apiParams: {
      pageNum: 1,
      pageSize: 10,
      phonenumber: '',
      roleId: id,
      userName: ''
    },
    columns: () =>
      [
        {
          align: 'center',
          dataIndex: 'index',
          key: 'index',
          title: t('page.manage.role.order'),
          width: 80
        },
        {
          align: 'center',
          dataIndex: 'userName',
          key: 'userName',
          title: t('page.manage.user.userName')
        },
        {
          align: 'center',
          dataIndex: 'nickName',
          key: 'nickName',
          title: t('page.manage.user.nickName')
        },
        {
          align: 'center',
          dataIndex: 'email',
          key: 'email',
          title: t('page.manage.common.email')
        },
        {
          align: 'center',
          dataIndex: 'phonenumber',
          key: 'phonenumber',
          title: t('page.manage.user.phonenumber')
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
          title: t('page.manage.role.status')
        },
        {
          align: 'center',
          dataIndex: 'createTime',
          key: 'createTime',
          title: t('page.manage.role.createTime')
        },
        {
          align: 'center',
          key: 'operate',
          render: (_: unknown, record: any) => {
            if (record.roleName === '超级管理员') {
              return null;
            }
            return (
              <div className="flex-center gap-8px">
                <APopconfirm
                  className="tex-14px mr-2"
                  title={t('page.manage.role.isCancelAuthorization')}
                  onConfirm={() => handleDelete(record.userId)}
                >
                  <ATooltip title={t('page.manage.role.cancelAuthorization')}>
                    <CloseCircleOutlined
                      className="text-red"
                      type="error"
                    />
                  </ATooltip>
                </APopconfirm>
              </div>
            );
          },
          title: t('common.operate'),
          width: 180
        }
      ] as any,
    // @ts-expect-error ------------
    rowKey: 'userId'
  });

  const { checkedRowKeys, onBatchDeleted, onDeleted, rowSelection } = useTableOperate(
    data as any,
    run,
    // eslint-disable-next-line
    async (res, type) => { }
  );

  async function handleDelete(userId: number) {
    const params = {
      roleId: id,
      userId
    };
    let res: any = '';
    if (curType === 'space') {
      res = await cancelSpaceAuthorizationApi(params);
    } else {
      res = await cancelAuthorizationApi(params);
    }
    if (res.response.data.code !== 200) return false;
    return onDeleted();
  }

  async function deleteBatch() {
    const params = {
      roleId: id,
      userIds: checkedRowKeys.join(',')
    };
    let res: any = '';
    if (curType === 'space') {
      res = await batchCancelSpaceAuthorizationApi(params);
    } else {
      res = await batchCancelAuthorizationApi(params);
    }
    if (res.response.data.code !== 200) return false;
    return onBatchDeleted();
  }

  async function handSelectuserSubmit(keys: []) {
    const params = {
      roleId: id,
      userIds: keys.join(',')
    };

    let res: any = '';
    if (curType === 'space') {
      res = await assignUserForSPaceRoleSubmit(params);
    } else {
      res = await assignUserSubmit(params);
    }
    if (res.response.data.code === 200) {
      message.success('添加用户成功');
      run();
      setVisible(false);
    } else {
      message.error(res.response.data.msg || '分配数据权限失败');
    }
  }

  return (
    <div className="h-full min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
      <ACard>
        <RoleAuthSearch {...searchProps} />
      </ACard>

      <ACard
        bordered={false}
        className="flex-col-stretch sm:flex-1-hidden card-wrapper"
        ref={tableWrapperRef}
        title={t('page.manage.user.title')}
        extra={
          <TableHeaderOperation
            columns={columnChecks}
            loading={tableProps.loading}
            refresh={run}
            setColumnChecks={setColumnChecks}
            prefix={
              <>
                <AButton
                  ghost
                  color="primary"
                  icon={<PlusOutlined className="text-icon" />}
                  size="small"
                  variant="filled"
                  onClick={() => {
                    setVisible(true);
                  }}
                >
                  {t('page.manage.role.addUser')}
                </AButton>

                <APopconfirm
                  className="tex-14px mr-2"
                  title={t('common.confirmDelete')}
                  onConfirm={() => deleteBatch()}
                >
                  <AButton
                    ghost
                    color="danger"
                    disabled={checkedRowKeys.length === 0}
                    icon={<CloseCircleOutlined className="text-icon" />}
                    size="small"
                    variant="filled"
                  >
                    {t('page.manage.role.batchAssignDataPermissions')}
                  </AButton>
                </APopconfirm>
              </>
            }
          />
        }
      >
        {/* @ts-expect-error ------------ */}
        <ATable
          scroll={scrollConfig}
          size="small"
          {...tableProps}
          rowSelection={rowSelection}
        />

        <Suspense>
          <RoleAuthOperateDrawer
            roleId={id}
            visible={visible}
            onClose={() => setVisible(false)}
            onSubmit={handSelectuserSubmit}
          />
        </Suspense>
      </ACard>
    </div>
  );
}
