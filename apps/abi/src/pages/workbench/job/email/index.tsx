import { DeleteOutlined, FileMarkdownOutlined, QuestionCircleOutlined, WechatWorkOutlined } from '@ant-design/icons';
// import PageTitle from '@/components/stateless/common/PageTitle';

import { deleteJob, deleteShareEmail, deleteShareEmailBatch, fetchEmailList } from '@/service/api/job';

import KeySearch from './modules/key-search';
import { useRoute, useRouter } from '~/packages/simple-router/src';
import { shareMailColor, shareMailStatus, statusType } from '@/types/job';
import { message } from 'antd';
import { getSpaceId } from '@/store/slice/app';

export function Component() {
  const { t } = useTranslation();
  const { switchToSpace } = useSpaceSwitch();
  const route = useRoute();
  const spaceId = useAppSelector(getSpaceId);
  const { scrollConfig, tableWrapperRef } = useTableScroll();
  const { data, run, searchProps, tableProps } = useTable({
    apiFn: fetchEmailList as any,
    apiParams: {
      pageNum: 1,
      pageSize: 10,
      spaceId: Number(localStorage.getItem('spaceId')), // 空间id
    },
    transformer: (res: any) => {
      return res;
    },
    columns: () =>
      [
        {
          align: 'left',
          fixed: 'left',
          dataIndex: 'jobName',
          key: 'jobName',
          title: '任务名称',
          width: 130,
          render: (text: string) => {
            if (!text) {
              return '';
            }
            return <APopover content={text}>{text.length > 30 ? `${text.slice(0, 30)}...` : text}</APopover>;
          },
        },
        {
          align: 'right',
          dataIndex: 'jobId',
          key: 'jobId',
          title: '任务id',
          width: 130,
        },
        {
          align: 'center',
          dataIndex: 'recipients',
          key: 'recipients',
          title: '收件人',
          width: 130,
          render: (text: string) => {
            const data = (text && text.split(',')) || [];
            if (data.length === 0) {
              return '';
            }
            if (data.length === 1) {
              return data.slice(0, 1).map((item, index) => {
                return <div key={index}>{item}</div>;
              });
            }
            return (
              <APopover
                content={
                  <div>
                    {data.slice(1).map((item, index) => {
                      return <div key={index}>{item}</div>;
                    })}
                  </div>
                }
              >
                {data.slice(0, 1).map((item, index) => {
                  return <div key={index}>{`${item.slice(0, 10)}...`}</div>;
                })}
              </APopover>
            );
          },
        },
        {
          align: 'left',
          dataIndex: 'type',
          key: 'type',
          title: '发送类型',
          width: 130,
        },
        {
          align: 'center',
          dataIndex: 'sendTime',
          key: 'sendTime',
          title: '发送时间',
          width: 130,
        },
        {
          align: 'center',
          dataIndex: 'status',
          key: 'status',
          title: '状态',
          width: 120,
          render: (r: statusType, row: any) => {
            return (
              <span style={{ color: shareMailColor[r] }}>
                {shareMailStatus[r]}
                {r === 4 && (
                  <APopover content={row?.reject || ''}>
                    <QuestionCircleOutlined style={{ color: '#FF4D4F' }} className="ml-2" />
                  </APopover>
                )}
              </span>
            );
          },
        },
        {
          align: 'center',
          fixed: 'right',
          key: 'operate',
          title: '操作',
          width: 120,
          render: (_: unknown, record: any) => (
            <div className="flex-center gap-8px">
              <ATooltip title="下载">
                <AButton
                  color="primary"
                  icon={<FileMarkdownOutlined />}
                  size="small"
                  variant="link"
                  onClick={() => {
                    handleExport(record);
                  }}
                />
              </ATooltip>

              <ATooltip title="进入对话">
                <AButton
                  color="primary"
                  icon={<WechatWorkOutlined />}
                  size="small"
                  variant="link"
                  onClick={() => {
                    handleNavigate(record);
                  }}
                />
              </ATooltip>
              <APopconfirm title="提示" description={t('common.confirmDelete')} onConfirm={() => handleDelete(record.logId)}>
                <ATooltip title="删除">
                  <AButton color="danger" icon={<DeleteOutlined />} size="small" variant="link" />
                </ATooltip>
              </APopconfirm>
            </div>
          ),
        },
      ] as any,
    rowKey: 'logId',
  } as any);

  const { checkedRowKeys, onBatchDeleted, onDeleted, rowSelection } = useTableOperate(data as any, run, () => {}, true);
  useEffect(() => {
    const { query } = route;
    if (query?.jobName) {
      const { form } = searchProps;
      form.setFieldsValue({
        jobName: query.jobName,
      });
      run();
    }
  }, [route.query]);
  async function handleBatchDelete() {
    // request
    const res = await deleteShareEmailBatch({logIds:checkedRowKeys});
    if (res.response.data.code === 200) {
      onBatchDeleted();
    }
  }

  async function handleDelete(id: string) {
    const res = await deleteShareEmail(id);
    if (res.response.data.code === 200) {
      onDeleted();
    }
  }

  function handleExport(row: any) {
    const { fileUrl, status } = row;
    if (status === 5) {
      message.warning('文件生成失败，请重新生成');
      return;
    }
    if (!fileUrl) {
      message.warning('报告文件生成中,请稍后下载');
      setTimeout(() => {
        run();
      }, 300);
      return;
    }
    window.open(fileUrl);
  }

  function handleNavigate(row: any) {
    const { chatId } = row;
    switchToSpace(spaceId, undefined, { chatId });
  }

  const columnWidth = useMemo(() => {
    return tableProps.columns.reduce((acc, item) => {
      return acc + ((item.width as number) || 0);
    }, 0);
  }, [tableProps.columns]);

  return (
    <div className="h-full min-h-500px flex-col-stretch gap-8px p-6">
      {/* <PageTitle /> */}
      <div className="flex items-center gap-4">
        <KeySearch {...searchProps} />
        <div className="ml-auto flex items-center gap-3">
          <AButton
            type="primary"
            onClick={searchProps.reset}
          >
            重置
          </AButton>
          <AButton
            type="primary"
            onClick={searchProps.search}
          >
            查询
          </AButton>

          <APopconfirm
            title={t('common.confirmDelete')}
            onConfirm={handleBatchDelete}
          >
            <AButton
              type="primary"
              disabled={checkedRowKeys.length === 0}
            >
              批量删除
            </AButton>
          </APopconfirm>
        </div>
      </div>
      <div
        ref={tableWrapperRef}
        style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}
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
          <div
            className="assistant-table-scroll"
            style={{ overflow: 'auto', maxHeight: '100%' }}
          >
            <ATable
              scroll={tableProps.dataSource?.length > 0 ? { x: columnWidth, ...scrollConfig } : undefined}
              size="small"
              {...(tableProps as any)}
              pagination={false}
              rowSelection={rowSelection}
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
            {...(tableProps.pagination as any)}
            showSizeChanger
            style={{ padding: '0' }}
          />
        </div>
      </div>
    </div>
  );
}
