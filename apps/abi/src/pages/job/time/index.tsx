import {
  CaretRightOutlined,
  DeleteOutlined,
  EditOutlined,
  ExceptionOutlined,
  FileSearchOutlined
} from '@ant-design/icons';
import { message } from 'antd';
import { Suspense } from 'react';

// import { enableStatusRecord } from '@/constants/business';
// import { ATG_MAP } from '@/constants/common';
import { JOB_GROUP_OPTIONS } from '@/constants/job';
import { addJob, deleteJob, exportJob, fetchChangeStatus, fetchJobList, runJob, updateJob } from '@/service/api/job';
import { useRouter } from '~/packages/simple-router/src/hooks/useRouter';

import JobDetailDrawer from './modules/job-detail-drawer';
import KeySearch from './modules/key-search';

const JobDrawer = lazy(() => import('./modules/job-drawer'));

export function Component() {
  const { t } = useTranslation();
  const router = useRouter();
  const [viewJobId, setViewJobId] = useState('');

  const { scrollConfig, tableWrapperRef } = useTableScroll();

  const handleSwitch = async (record: any) => {
    AModal.confirm({
      content: `确认要"${record.status === '0' ? '暂停' : '启用'}""${record.jobName}"任务吗？`,
      onOk: async () => {
        const res = await fetchChangeStatus({
          jobId: record.jobId,
          status: record.status === '0' ? '1' : '0'
        });
        if (res.response.data.code === 200) {
          message.success('操作成功');
          run();
        }
      },
      title: '系统提示'
    });
  };

  const { columnChecks, data, run, searchParams, searchProps, setColumnChecks, tableProps } = useTable({
    apiFn: fetchJobList as any,
    apiParams: {
      pageNum: 1,
      pageSize: 10,
      // sourceName: '',
      spaceId: Number(localStorage.getItem('spaceId')) // 空间id
    },
    columns: () =>
      [
        // {
        //   align: 'center',
        //   dataIndex: 'jobId',
        //   key: 'jobId',
        //   title: '任务编号',
        //   width: 80
        // },
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
          title: '任务分组',
          width: 80
        },
        {
          dataIndex: 'invokeTarget',
          key: 'invokeTarget',
          title: '调用方法'
        },
        {
          align: 'center',
          dataIndex: 'cronExpression',
          key: 'cronExpression',
          // render: (_, record) => {
          //   if (record.status === null) {
          //     return null;
          //   }
          //   const label = t(enableStatusRecord[record.status]);
          //   return <ATag color={ATG_MAP[record.status]}>{label}</ATag>;
          // },
          title: 'cron执行表达式'
        },
        {
          dataIndex: 'status',
          key: 'status',
          render: (status: string, record: any) => (
            <ASwitch
              checked={status !== '1'}
              onClick={() => handleSwitch(record)}
            />
          ),
          title: '状态',
          width: 80
        },
        {
          align: 'center',
          key: 'operate',
          render: (_: unknown, record: any) => (
            <div className="flex-center gap-8px">
              <ATooltip title="编辑">
                <AButton
                  color="primary"
                  icon={<EditOutlined />}
                  size="small"
                  variant="link"
                  onClick={() => {
                    edit(record);
                  }}
                />
              </ATooltip>

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
                title="确定要执行吗？"
                onConfirm={() => handleRun(record)}
              >
                <ATooltip title="执行一次">
                  <AButton
                    color="primary"
                    icon={<CaretRightOutlined />}
                    size="small"
                    variant="link"
                  />
                </ATooltip>
              </APopconfirm>
              <ATooltip title="调度日志">
                <AButton
                  color="primary"
                  icon={<ExceptionOutlined />}
                  size="small"
                  variant="link"
                  onClick={() => {
                    router.push(`/job/log/${record.jobId}`);
                  }}
                />
              </ATooltip>

              <APopconfirm
                title={t('common.confirmDelete')}
                onConfirm={() => handleDelete(record.jobId)}
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
    rowKey: 'jobId'
  } as any);

  const {
    checkedRowKeys,
    editingData,
    generalPopupOperation,
    handleAdd,
    handleEdit,
    onBatchDeleted,
    onDeleted,
    rowSelection
  } = useTableOperate(data as any, run, async (res: any, type) => {
    if (type === 'add') {
      // add request 调用新增的接口
      const addRes: any = await addJob(res);
      if (addRes?.response?.data?.code !== 200) return false;
    } else {
      // edit request 调用编辑的接口
      const updateRes: any = await updateJob({ ...editingData, ...res });
      if (updateRes?.response?.data?.code !== 200) return false;
    }
  });

  async function handleBatchDelete() {
    // request
    const res = await deleteJob(checkedRowKeys.join(','));
    if (res.response.data.code === 200) {
      onBatchDeleted();
    }
  }

  async function handleDelete(jobId: string) {
    const res = await deleteJob(jobId);

    if (res.response.data.code === 200) {
      onDeleted();
    }
  }

  async function handleRun(record: any) {
    const res = await runJob(record);

    if (res.response.data.code === 200) {
      message.success('执行成功');
      run();
    }
  }

  async function handleView(record: any) {
    setViewJobId(record.jobId);
  }

  const handleExport = async () => {
    const res = await exportJob({ ...searchParams.current });
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

  function edit(row: any) {
    handleEdit(row);
  }

  return (
    <div className="h-full min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
      {/* <ACollapse
        bordered={false}
        className="card-wrapper"
        defaultActiveKey={isMobile ? undefined : '1'}
        items={[
          {
            children: <KeySearch {...searchProps} />,
            key: '1',
            label: t('common.search')
          }
        ]}
      /> */}
      <ACard>
        <KeySearch {...searchProps} />
      </ACard>

      <ACard
        bordered={false}
        className="flex-col-stretch sm:flex-1-hidden card-wrapper"
        ref={tableWrapperRef}
        title="定时任务"
        extra={
          <TableHeaderOperation
            add={handleAdd}
            columns={columnChecks}
            disabledDelete={checkedRowKeys.length === 0}
            loading={tableProps.loading}
            refresh={run}
            setColumnChecks={setColumnChecks}
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

        <Suspense>
          <JobDrawer {...generalPopupOperation} />
        </Suspense>

        {viewJobId ? (
          <JobDetailDrawer
            jobId={viewJobId}
            onClose={() => setViewJobId('')}
          />
        ) : null}
      </ACard>
    </div>
  );
}
