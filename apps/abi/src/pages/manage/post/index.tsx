import { DeleteOutlined, EditOutlined, VerticalAlignBottomOutlined } from '@ant-design/icons';
import axios from 'axios';
import type { AxiosResponse } from 'axios';
import { Suspense } from 'react';

import { enableStatusRecord } from '@/constants/business';
import { addPostAPi, deletePostApi, getPostInfoApi, getPostListApi, updatePostApi } from '@/service/api/post';
import { getAuthorization, getUserId } from '@/service/request/shared';
import { getServiceBaseURL } from '@/utils/service';

import PostOperateDrawer from './modules/post-operate-drawer';
import PostSearch from './modules/post-search';

const isHttpProxy = import.meta.env.DEV && import.meta.env.VITE_HTTP_PROXY === 'Y';
const { apiURL } = getServiceBaseURL(import.meta.env, isHttpProxy);

export function Component() {
  const { t } = useTranslation();
  const { scrollConfig, tableWrapperRef } = useTableScroll();

  const { columnChecks, data, run, searchParams, searchProps, setColumnChecks, tableProps } = useTable({
    apiFn: getPostListApi as any,
    apiParams: {
      pageNum: 1,
      pageSize: 10,
      postCode: '',
      postName: '',
      status: ''
    },
    columns: () =>
      [
        {
          align: 'center',
          dataIndex: 'postId',
          key: 'postId',
          title: t('page.manage.post.postId'),
          width: 80
        },
        {
          align: 'center',
          dataIndex: 'postName',
          key: 'postName',
          title: t('page.manage.post.postName')
        },
        {
          align: 'center',
          dataIndex: 'postCode',
          key: 'postCode',
          title: t('page.manage.post.postCode')
        },
        {
          align: 'center',
          dataIndex: 'postSort',
          key: 'postSort',
          title: t('page.manage.post.postSort')
        },
        {
          align: 'center',
          dataIndex: 'status',
          key: 'status',
          render: (_: unknown, record: { status: Api.Common.EnableStatus }) => {
            const label = t(enableStatusRecord[record.status]);
            if (record.status === '0') {
              return <ATag color="success">{label}</ATag>;
            }
            return <ATag color="error">{label}</ATag>;
          },
          title: t('page.manage.post.status')
        },
        {
          align: 'center',
          dataIndex: 'createTime',
          key: 'createTime',
          title: t('page.manage.common.createTime')
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
                  onClick={() => edit(record.postId)}
                />
              </ATooltip>

              <APopconfirm
                title={t('common.confirmDelete')}
                onConfirm={() => handleDelete(record.postId)}
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
          width: 120
        }
      ] as any,
    // @ts-expect-error ------------
    rowKey: 'postId'
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
      const params = { ...res };
      if (type === 'add') {
        const resData = await addPostAPi(params);
        if (resData.response.data.code !== 200) return false;
      } else {
        const resData = await updatePostApi({ ...params, postId: editingData.postId });
        if (resData.response.data.code !== 200) return false;
      }
    }
  );

  async function add() {
    handleAdd({
      status: '0'
    });
  }

  async function edit(row: number) {
    const res = await getPostInfoApi(row);
    handleEdit({
      ...res.data
    });
  }

  async function handleDelete(id: number) {
    const resData = await deletePostApi(id);
    if (resData.response.data.code !== 200) return false;
    return onDeleted();
  }

  async function handExport() {
    downLoad(
      '/system/post/export',
      {
        ...searchParams.current
      },
      t('page.manage.post.postList')
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

  async function deleteBatch() {
    const resData = await deletePostApi(checkedRowKeys.join(','));
    if (resData.response.data.code !== 200) return false;
    return onBatchDeleted();
  }

  return (
    <div className="h-full min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
      <ACard>
        <PostSearch {...searchProps} />
      </ACard>

      <ACard
        bordered={false}
        className="flex-col-stretch sm:flex-1-hidden card-wrapper"
        ref={tableWrapperRef}
        title={t('page.manage.post.postList')}
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
        <ATable
          scroll={scrollConfig}
          size="small"
          {...tableProps}
          rowSelection={rowSelection}
        />

        <Suspense>
          <PostOperateDrawer {...generalPopupOperation} />
        </Suspense>
      </ACard>
    </div>
  );
}
