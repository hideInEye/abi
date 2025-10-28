import { DeleteOutlined, FileSearchOutlined } from '@ant-design/icons';
import { message } from 'antd';

import { JOB_GROUP_OPTIONS } from '@/constants/job';
import { cleanJobLog, deleteJobLog, exportJobLog, fetchJobDetail, fetchJobLogList } from '@/service/api/job';
import { useRoute } from '~/packages/simple-router/src';

import JobLogDetailDrawer from './modules/job-log-detail-drawer';
import KeySearch from './modules/key-search';

export function Component() {
  const { t } = useTranslation();
  const route = useRoute();
  const { id } = route.params;
  const [viewJobLogId, setViewJobLogId] = useState('');
  const [jobDetail, setJobDetail] = useState<any>();

  useEffect(() => {
    const getJobDetail = async () => {
      const res = await fetchJobDetail(id);
      // setDetail(res.data);
      const { jobGroup, jobName } = res.data;
      updateSearchParams({ jobGroup, jobName });
      setJobDetail({ jobGroup, jobName });
    };
    if (id) {
      getJobDetail();
    }
  }, [id]);

  const { scrollConfig, tableWrapperRef } = useTableScroll();

  const { columnChecks, data, run, searchParams, searchProps, setColumnChecks, tableProps, updateSearchParams } =
    useTable({
      apiFn: fetchJobLogList as any,
      apiParams: {
        pageNum: 1,
        pageSize: 10,
        // sourceName: '',
        spaceId: Number(localStorage.getItem('spaceId')) // 空间id
      },
      columns: () =>
        [
          {
            align: 'center',
            dataIndex: 'jobLogId',
            key: 'jobLogId',
            title: '日志编号',
            width: 80
          },
          {
            align: 'center',
            dataIndex: 'jobName',
            key: 'jobName',
            title: '任务名称'
          },
          {
            align: 'center',
            dataIndex: 'jobGroup',
            key: 'jobGroup',
            render: (group: string) => JOB_GROUP_OPTIONS.find(item => item.value === group)?.label,
            title: '任务组名',
            width: 80
          },
          {
            dataIndex: 'invokeTarget',
            key: 'invokeTarget',
            title: '调用目标字符串'
          },
          {
            align: 'center',
            dataIndex: 'jobMessage',
            key: 'jobMessage',
            title: '日志信息'
          },
          {
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => (status === '0' ? '成功' : '失败'),
            title: '执行状态',
            width: 80
          },
          {
            dataIndex: 'startTime',
            key: 'startTime',
            // render: (time: string) => status,
            title: '执行时间',
            width: 80
          },
          {
            align: 'center',
            key: 'operate',
            render: (_: unknown, record: any) => (
              <div className="flex-center gap-8px">
                <ATooltip title="详情">
                  <AButton
                    color="primary"
                    icon={<FileSearchOutlined />}
                    size="small"
                    variant="link"
                    onClick={() => handleView(record)}
                  />
                </ATooltip>
                <APopconfirm
                  title={t('common.confirmDelete')}
                  onConfirm={() => handleDelete(record.jobLogId)}
                >
                  <ATooltip title="删除">
                    <AButton
                      color="danger"
                      icon={<DeleteOutlined />}
                      size="small"
                      variant="link"
                    />
                  </ATooltip>
                </APopconfirm>
              </div>
            ),
            title: t('common.operate')
          }
        ] as any,
      immediate: false,
      rowKey: 'jobLogId'
    } as any);

  const { checkedRowKeys, onBatchDeleted, onDeleted, rowSelection } = useTableOperate(data as any, run, async () => {});

  async function handleBatchDelete() {
    // request
    const res = await deleteJobLog(checkedRowKeys.join(','));
    if (res.response.data.code === 200) {
      onBatchDeleted();
    }
  }

  async function handleDelete(jobLogId: string) {
    const res = await deleteJobLog(jobLogId);

    if (res.response.data.code === 200) {
      onDeleted();
    }
  }

  async function handleView(record: any) {
    setViewJobLogId(record.jobLogId);
  }

  const handleExport = async () => {
    const res = await exportJobLog({ ...searchParams.current });
    const url = URL.createObjectURL(res.data);
    const a: any = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClean = async () => {
    const res = await cleanJobLog();

    if (res.response.data.code === 200) {
      message.success('清空成功');
      run();
    }
  };

  return (
    <div className="h-full min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
      <ACard>
        <KeySearch
          jobDetail={jobDetail}
          {...searchProps}
        />
      </ACard>

      <ACard
        bordered={false}
        className="flex-col-stretch sm:flex-1-hidden card-wrapper"
        ref={tableWrapperRef}
        title="定时任务"
        extra={
          <TableHeaderOperation
            columns={columnChecks}
            disabledDelete={checkedRowKeys.length === 0}
            loading={tableProps.loading}
            refresh={run}
            setColumnChecks={setColumnChecks}
            onClean={handleClean}
            onDelete={handleBatchDelete}
            onExport={handleExport}
          />
        }
      >
        <ATable
          scroll={scrollConfig}
          size="small"
          {...(tableProps as any)}
          rowSelection={rowSelection}
        />

        {viewJobLogId ? (
          <JobLogDetailDrawer
            jobLogId={viewJobLogId}
            onClose={() => setViewJobLogId('')}
          />
        ) : null}
      </ACard>
    </div>
  );
}
