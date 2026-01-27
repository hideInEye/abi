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
  const [viewJobLogId, setViewJobLogId] = useState('');
  const [jobDetail, setJobDetail] = useState<any>();
  useEffect(() => {
    const { query } = route;
    console.log(query);

    if (query?.jobId) {
      updateSearchParams({ jobId: query.jobId });
    }
  }, [route.query]);

  const { scrollConfig, tableWrapperRef } = useTableScroll();

  const { columnChecks, data, run, searchParams, searchProps, setColumnChecks, tableProps, updateSearchParams } = useTable({
    apiFn: fetchJobLogList as any,
    apiParams: {
      pageNum: 1,
      pageSize: 10,
      // sourceName: '',
      spaceId: Number(localStorage.getItem('spaceId')), // 空间id
    },
    columns: () =>
      [
        {
          align: 'center',
          dataIndex: 'executeTime',
          key: 'executeTime',
          title: '任务执行时间',
        },
        {
          align: 'center',
          dataIndex: 'status',
          key: 'status',
          title: '任务状态',
          render: (val: number) => {
            const text = {
              0: '正常',
              1: '错误',
              2: '执行中',
            };
            return <span>{text[val]}</span>;
          },
        },
        // {
        //   align: 'center',
        //   dataIndex: 'jobLogDuration',
        //   key: 'jobLogDuration',
        //   title: '任务执行时长'
        // },
        // {
        //   align: 'center',
        //   dataIndex: 'jobLogRecipients',
        //   key: 'jobLogRecipients',
        //   title: '收件人'
        // },
        // {
        //   align: 'center',
        //   dataIndex: 'jobLogSubject',
        //   key: 'jobLogSubject',
        //   title: '邮件标题'
        // },
        {
          align: 'center',
          dataIndex: 'resultDescription',
          key: 'resultDescription',
          title: '结果描述',
        },
        {
          align: 'center',
          key: 'operate',
          render: (_: unknown, record: any) => (
            <div className="flex-center gap-8px">
              {record?.status === '0' && (
                <ATooltip title="查看报告">
                  <AButton color="primary" icon={<FileSearchOutlined />} size="small" variant="link" onClick={() => handleView(record)} />
                </ATooltip>
              )}
              {record?.status === '1' && (
                <ATooltip title="查看错误报告">
                  <AButton color="primary" icon={<FileSearchOutlined />} size="small" variant="link" onClick={() => handleViewError(record)} />
                </ATooltip>
              )}
            </div>
          ),
          title: t('common.operate'),
        },
      ] as any,
    immediate: false,
    rowKey: 'jobLogId',
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
    if (!record.fileUrl) return;
    window.open(record.fileUrl);
  }

  const handleViewError = (r:any)=>{

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
        <KeySearch jobDetail={jobDetail} {...searchProps} />
      </ACard>

      <ACard
        bordered={false}
        className="flex-col-stretch sm:flex-1-hidden card-wrapper"
        ref={tableWrapperRef}
        title="调度日志"
        extra={
          <TableHeaderOperation
            columns={columnChecks}
            // disabledDelete={checkedRowKeys.length === 0}
            loading={tableProps.loading}
            refresh={run}
            setColumnChecks={setColumnChecks}
            // onClean={handleClean}
            // onDelete={handleBatchDelete}
            // onExport={handleExport}
          />
        }
      >
        <ATable
          scroll={scrollConfig}
          size="small"
          {...(tableProps as any)}
          // rowSelection={rowSelection}
        />

        {viewJobLogId ? <JobLogDetailDrawer jobLogId={viewJobLogId} onClose={() => setViewJobLogId('')} /> : null}
      </ACard>
    </div>
  );
}
