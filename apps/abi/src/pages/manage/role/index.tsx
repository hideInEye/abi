import {
  DeleteOutlined,
  EditOutlined,
  SafetyOutlined,
  UserOutlined,
  VerticalAlignBottomOutlined
} from '@ant-design/icons';
import { message } from 'antd';
import axios from 'axios';
import type { AxiosResponse } from 'axios';
import { Suspense } from 'react';

import { fetchDelRole, fetchRoleInfoById, fetchRoleMenuById } from '@/service/api';
import {
  assignDataPermissionSubmit,
  createRoleSubmit,
  roleList,
  updateRole,
  updateRoleStatusAPi
} from '@/service/api/role';
import { getAuthorization, getUserId } from '@/service/request/shared';
import { getServiceBaseURL } from '@/utils/service';
import { useRouter } from '~/packages/simple-router/src/hooks/useRouter';

import RoleSearch from './modules/role-search';

const RoleOperateDrawer = lazy(() => import('./modules/role-operate-drawer'));
const RolePermissionDrawer = lazy(() => import('./modules/role-permission-drawer'));

const isHttpProxy = import.meta.env.DEV && import.meta.env.VITE_HTTP_PROXY === 'Y';
const { apiURL } = getServiceBaseURL(import.meta.env, isHttpProxy);

export function Component() {
  const { t } = useTranslation();

  const { scrollConfig, tableWrapperRef } = useTableScroll();
  const [visible, setVisible] = useState(false);
  const [roleId, setRoleId] = useState<number>(0);
  const router = useRouter();

  const { columnChecks, data, run, searchParams, searchProps, setColumnChecks, tableProps } = useTable({
    apiFn: roleList as any,
    apiParams: {
      pageNum: 1,
      pageSize: 10,
      roleKey: '',
      roleName: '',
      status: ''
    },
    columns: () =>
      [
        {
          align: 'center',
          dataIndex: 'roleId',
          key: 'roleId',
          title: t('page.manage.role.order'),
          width: 80
        },
        {
          align: 'center',
          dataIndex: 'roleName',
          key: 'roleName',
          title: t('page.manage.role.roleName')
        },
        {
          align: 'center',
          dataIndex: 'roleKey',
          key: 'roleKey',
          title: t('page.manage.role.permission')
        },
        {
          align: 'center',
          dataIndex: 'roleSort',
          key: 'roleSort',
          title: t('page.manage.role.roleSort')
        },
        {
          align: 'center',
          dataIndex: 'status',
          key: 'status',
          render: (_: unknown, record: any) => (
            <APopconfirm
              cancelText={t('common.cancel')}
              okText={t('common.confirm')}
              title={record.status === '0' ? t('page.manage.role.isDisabledRole') : t('page.manage.role.isEnableRole')} // 确认提示文本
              onConfirm={async () => {
                const newStatus = record.status === '0' ? '1' : '0';
                const params = {
                  roleId: record.roleId,
                  status: newStatus
                };
                // 2. 调用 API 更新
                const res = await updateRoleStatusAPi(params);
                if (res.response.data.code !== 200) {
                  message.error(res.response.data.msg || '更新失败');
                }
                message.success('更新成功');
                // 3. 刷新表格数据
                await run(false);
              }}
            >
              <ASwitch
                checked={record.status === '0'}
                loading={tableProps.loading} // 加载状态
                onChange={() => { }} // 阻止直接切换
              />
            </APopconfirm>
          ),
          title: t('page.manage.role.status'),
          width: 160
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
                <ATooltip title={t('page.manage.common.edit')}>
                  <AButton
                    color="primary"
                    icon={<EditOutlined />}
                    size="small"
                    variant="link"
                    onClick={() => edit(record.roleId)}
                  />
                </ATooltip>

                <APopconfirm
                  className="tex-14px mr-2"
                  title={t('common.confirmDelete')}
                  onConfirm={() => handleDelete(record.roleId)}
                >
                  <ATooltip title={t('page.manage.common.delete')}>
                    <DeleteOutlined
                      className="text-red"
                      type="error"
                    />
                  </ATooltip>
                </APopconfirm>

                <ATooltip title={t('page.manage.role.dataPermissions')}>
                  <SafetyOutlined
                    className="tex-14px mr-2"
                    onClick={() => {
                      setVisible(true);
                      setRoleId(record.roleId);
                    }}
                  />
                </ATooltip>

                <ATooltip title={t('page.manage.role.assigningUsers')}>
                  <UserOutlined
                    className="tex-14px"
                    onClick={() => router.push(`/manage/role-auth/${record.roleId}`)}
                  />
                </ATooltip>
              </div>
            );
          },
          title: t('common.operate'),
          width: 180
        }
      ] as any,
    // @ts-expect-error ------------
    rowKey: 'roleId'
  });

  const {
    checkedRowKeys,
    editingData,
    generalPopupOperation,
    handleAdd,
    handleEdit,
    onBatchDeleted,
    onDeleted,
    rowSelection
  } = useTableOperate(
    data as any,
    run,
    // eslint-disable-next-line
    async (res, type) => {
      if (type === 'add') {
        const resData = await createRoleSubmit(res);
        if (resData.response.data.code !== 200) return false;
      } else {
        const resData = await updateRole({ ...editingData, ...res });
        if (resData.response.data.code !== 200) return false;
      }
    }
  );

  async function add() {
    handleAdd({
      status: '0'
    });
  }

  async function handleDelete(id: number) {
    const resData = await fetchDelRole(id);
    if (resData.response.data.code !== 200) return false;
    return onDeleted();
  }

  function edit(id: number) {
    Promise.all([fetchRoleInfoById(id), fetchRoleMenuById(id)]).then((res: any) => {
      const [roleInfo, ruleMenus] = res;
      const values = {
        ...roleInfo.data,
        menuIds: ruleMenus?.response?.data?.checkedKeys ?? []
      };
      handleEdit(values);
    });
  }

  async function deleteBatch() {
    const resData = await fetchDelRole(checkedRowKeys.join(','));
    if (resData.response.data.code !== 200) return false;
    return onBatchDeleted();
  }

  async function handExport() {
    downLoad(
      '/system/role/export',
      {
        ...searchParams.current
      },
      t('page.manage.role.title')
    );
  }

  async function downLoad(url: string, params: any, fileName: string) {
    try {
      // 1. 发送 POST 请求
      const response: AxiosResponse<Blob> = await axios.post(url, params, {
        baseURL: apiURL,
        headers: {
          apifoxToken: 'XL299LiMEDZ0H5h3A29PxwQXdMJqWyY2',
          Authorization: getAuthorization(),
          'Content-Type': 'application/json', // 根据实际需求调整
          userId: getUserId()
        },
        responseType: 'blob' // 关键配置：声明响应类型为二进制流
      });

      // 2. 提取文件名（优先从响应头获取）
      const contentDisposition = response.headers['content-disposition'];
      const extractedFileName = contentDisposition
        ? decodeURIComponent(
          contentDisposition.split(';')[1].split('=')[1].replace(/"/g, '')
        )
        : fileName || '';

      // 3. 创建 Blob 对象
      const blob = new Blob([response.data], {
        type: response.headers['content-type'] || 'application/octet-stream'
      });

      // 4. 创建虚拟下载链接
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', extractedFileName); // 设置下载文件名

      // 5. 触发下载
      document.body.appendChild(link);
      link.click();

      // 6. 清理资源
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('下载失败:', error);
    }
  }

  async function handDataPermissionSubmit(params: any) {
    const res = await assignDataPermissionSubmit(params);
    if (res.response.data.code === 200) {
      message.success('分配数据权限成功');
      setVisible(false);
    } else {
      message.error(res.response.data.msg || '分配数据权限失败');
    }
  }

  return (
    <div className="h-full min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
      <ACard>
        <RoleSearch {...searchProps} />
      </ACard>

      <ACard
        bordered={false}
        className="flex-col-stretch sm:flex-1-hidden card-wrapper"
        ref={tableWrapperRef}
        title={t('page.manage.role.title')}
        extra={
          <TableHeaderOperation
            columns={columnChecks}
            disabledDelete={checkedRowKeys.length === 0}
            loading={tableProps.loading}
            refresh={run}
            setColumnChecks={setColumnChecks}
            add={() => {
              add();
            }}
            suffix={
              <AButton
                ghost
                color="danger"
                icon={<VerticalAlignBottomOutlined className="text-icon" />}
                size="small"
                variant="filled"
                onClick={handExport}
              >
                {t('page.manage.common.export')}
              </AButton>
            }
            onDelete={deleteBatch}
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
          <RoleOperateDrawer
            {...generalPopupOperation}
            rowId={editingData?.id || -1}
          />
        </Suspense>

        <RolePermissionDrawer
          roleId={roleId}
          visible={visible}
          onClose={() => setVisible(false)}
          onSubmit={handDataPermissionSubmit}
        />
      </ACard>
    </div>
  );
}
