import {
  DeleteOutlined,
  EditOutlined,
  KeyOutlined,
  SafetyOutlined,
  VerticalAlignBottomOutlined,
  VerticalAlignTopOutlined
} from '@ant-design/icons';
import { message } from 'antd';
import axios from 'axios';
import type { AxiosResponse } from 'axios';
import type { Key } from 'react';
import { Suspense } from 'react';

import { fetchAddUser, fetchDelUser, fetchGetUserList, fetchUpdateUser } from '@/service/api';
import { getUserInfoApi, importUserApi, updateUserStatusAPi } from '@/service/api/user';
import { getAuthorization, getUserId } from '@/service/request/shared';
import { encrypt } from '@/utils/jsencrypt';
import { getServiceBaseURL } from '@/utils/service';
import { useRouter } from '~/packages/simple-router/src/hooks/useRouter';

import GroupTree from './modules/group-tree';
import ImportModal from './modules/import-modal';
import ResetPassword from './modules/reset-password';
import UserOperateDrawer from './modules/user-operate-drawer';
import UserSearch from './modules/user-search';

const isHttpProxy = import.meta.env.DEV && import.meta.env.VITE_HTTP_PROXY === 'Y';
const { apiURL } = getServiceBaseURL(import.meta.env, isHttpProxy);

export function Component() {
  const { t } = useTranslation();
  const { scrollConfig, tableWrapperRef } = useTableScroll();
  const [selectedKeys, setSelectedKeys] = useState<Key[]>();
  const [userId, setUserId] = useState(0);
  const [visible, setVisible] = useState(false);

  const router = useRouter();

  const { columnChecks, data, run, searchParams, searchProps, setColumnChecks, tableProps, updateSearchParams } = useTable(
    {
      apiFn: fetchGetUserList as any,
      apiParams: {
        deptId: '',
        pageNum: 1,
        pageSize: 10,
        params: {
          beginTime: '',
          endTime: ''
        },
        phonenumber: '',
        status: '',
        userName: ''
      },
      columns: () =>
        [
          {
            align: 'center',
            dataIndex: 'userId',
            key: 'userId',
            title: t('page.manage.user.userId'),
            width: 80
          },
          {
            align: 'center',
            dataIndex: 'userName',
            key: 'userName',
            title: t('page.manage.user.userName'),
            width: 100
          },
          {
            align: 'center',
            dataIndex: 'nickName',
            key: 'nickName',
            title: t('page.manage.user.nickName'),
            width: 100
          },
          {
            align: 'center',
            dataIndex: 'dept',
            key: 'dept',
            render: (dept: any) => dept?.deptName,
            title: t('page.manage.user.dept'),
            width: 100
          },
          {
            align: 'center',
            dataIndex: 'phonenumber',
            key: 'phonenumber',
            title: t('page.manage.user.userPhone'),
            width: 100
          },
          {
            align: 'center',
            dataIndex: 'status',
            key: 'status',
            render: (_: unknown, record: any) => (
              <APopconfirm
                cancelText={t('common.cancel')}
                okText={t('common.confirm')}
                title={
                  record.status === '0' ? t('page.manage.user.isDisabledUser') : t('page.manage.user.isEnableUser')
                }
                onConfirm={async () => {
                  const newStatus = record.status === '0' ? '1' : '0';
                  const params = {
                    status: newStatus,
                    userId: record.userId
                  };
                  // 2. 调用 API 更新
                  const res = await updateUserStatusAPi(params);
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
            title: t('page.manage.common.createTime'),
            width: 120
          },
          // {
          //   align: 'center',
          //   dataIndex: 'loginDate',
          //   key: 'loginDate',
          //   render: (time: string) => (time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-'),
          //   title: '上次登录时间',
          //   width: 120
          // },
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
                    onClick={() => edit(record.userId)}
                  />
                </ATooltip>

                <APopconfirm
                  className="tex-14px mr-2"
                  title={t('common.confirmDelete')}
                  onConfirm={() => handleDelete(record.userId)}
                >
                  <ATooltip title={t('page.manage.common.delete')}>
                    <DeleteOutlined
                      className="cursor-pointer text-red"
                      type="error"
                    />
                  </ATooltip>
                </APopconfirm>

                <ATooltip title={t('page.manage.user.resetPassword')}>
                  <KeyOutlined
                    className="tex-14px mr-2"
                    onClick={() => setUserId(record.userId)}
                  />
                </ATooltip>

                <ATooltip title={t('page.manage.user.assigningRole')}>
                  <SafetyOutlined
                    className="tex-14px"
                    onClick={() => router.push(`/manage/user-role/${record.userId}`)}
                  />
                </ATooltip>
              </div>
            ),
            title: t('common.operate'),
            width: 80
          }
        ] as any,
      // @ts-expect-error ------------
      rowKey: 'userId'
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
    async (res: any, type) => {
      const params = { ...res, password: encrypt(res.password) };
      if (type === 'add') {
        const resData = await fetchAddUser(params);
        if (resData.response.data.code !== 200) return false;
      } else {
        const resData = await fetchUpdateUser({ ...params, userId: editingData.userId });
        if (resData.response.data.code !== 200) return false;
      }
    }
  );

  async function edit(row: number) {
    const res: any = await getUserInfoApi(row);
    handleEdit({
      ...res.data.data,
      postIds: res?.data?.postIds || [],
      roleIds: res?.data?.roleIds || []
    });
  }

  async function handleDelete(id: number) {
    const resData = await fetchDelUser(id);
    if (resData.response.data.code !== 200) return false;
    return onDeleted();
  }

  async function handExport() {
    downLoad(
      '/system/user/export',
      {
        ...searchParams.current
      },
      t('page.manage.user.title')
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

  const handleClose = (refresh?: boolean) => {
    if (refresh) {
      run();
    }
    setUserId(0);
  };

  async function deleteBatch() {
    const resData = await fetchDelUser(checkedRowKeys.join(','));
    if (resData.response.data.code !== 200) return false;
    return onBatchDeleted();
  }

  const handleImport = async (file: File, updateExisting: boolean) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('updateSupport', updateExisting);
    importUserApi(formData);
  };

  useEffect(() => {
    if (Array.isArray(selectedKeys) && selectedKeys.length > 0) {
      updateSearchParams({
        ...searchParams.current,
        deptId: selectedKeys[0],
        pageNum: 1
      });
    }
  }, [selectedKeys]);

  return (
    <div className="h-full min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
      <AFlex className="gap-6">
        <ACard>
          <GroupTree
            selectedKeys={selectedKeys}
            setSelectedKeys={setSelectedKeys}
          />
        </ACard>

        <div className="h-full min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
          <ACard>
            <UserSearch {...searchProps} />
          </ACard>

          <ACard
            bordered={false}
            className="flex-col-stretch sm:flex-1-hidden card-wrapper"
            ref={tableWrapperRef}
            title={t('page.manage.user.title')}
            extra={
              <TableHeaderOperation
                add={handleAdd}
                columns={columnChecks}
                disabledDelete={checkedRowKeys.length === 0}
                loading={tableProps.loading}
                refresh={run}
                setColumnChecks={setColumnChecks}
                suffix={
                  <>
                    <AButton
                      ghost
                      color="danger"
                      icon={<VerticalAlignTopOutlined className="text-icon" />}
                      size="small"
                      variant="filled"
                      onClick={() => setVisible(true)}
                    >
                      {t('page.manage.common.import')}
                    </AButton>

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
                  </>
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
              <UserOperateDrawer {...generalPopupOperation} />
            </Suspense>

            {userId ? (
              <ResetPassword
                userId={userId}
                onClose={handleClose}
              />
            ) : null}

            <ImportModal
              visible={visible}
              onClose={() => setVisible(false)}
              onImport={handleImport}
              onLoadTel={() => downLoad('/system/user/importTemplate', {}, '用户列表模板')}
            />
          </ACard>
        </div>
      </AFlex>
    </div>
  );
}
