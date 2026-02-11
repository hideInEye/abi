import { CaretRightOutlined, ClockCircleOutlined, DeleteOutlined, EditOutlined, ExceptionOutlined, FileSearchOutlined } from '@ant-design/icons';
import { Form, message } from 'antd';
import { Suspense } from 'react';

// import { enableStatusRecord } from '@/constants/business';
// import { ATG_MAP } from '@/constants/common';
import { JOB_GROUP_OPTIONS } from '@/constants/job';
import { addJob, batchDeleteJob, deleteJob, exportJob, fetchChangeStatus, fetchJobList, fetchShareEmail, fetchShareEmailDetail, runJob, updateJob, updateShareEmail } from '@/service/api/job';
import { useRouter } from '~/packages/simple-router/src/hooks/useRouter';

import JobDetailDrawer from './modules/job-detail-drawer';
import KeySearch from './modules/key-search';
import ShareEmailSetting from './modules/share-email-setting';

const JobDrawer = lazy(() => import('./modules/job-drawer'));

export function Component() {
  const { t } = useTranslation();
  const router = useRouter();
  // const [viewJobId, setViewJobId] = useState('');
  const [form] = Form.useForm();
  const [visible, setVisible] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const { scrollConfig, tableWrapperRef } = useTableScroll();

  const handleSwitch = async (record: any) => {
    AModal.confirm({
      content: `确认要"${record.status === '0' ? '暂停' : '启用'}""${record.jobName}"任务吗？`,
      onOk: async () => {
        const res = await fetchChangeStatus({
          jobId: record.jobId,
          // status: record.status === '0' ? '1' : '0',
        });
        if (res.response.data.code === 200) {
          message.success('操作成功');
          run();
        }
      },
      title: '系统提示',
    });
  };

  const { columnChecks, data, run, searchParams, searchProps, setColumnChecks, tableProps } = useTable({
    apiFn: fetchJobList as any,
    apiParams: {
      pageNum: 1,
      pageSize: 10,
      // sourceName: '',
      spaceId: Number(localStorage.getItem('spaceId')), // 空间id
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
          align: 'left',
          dataIndex: 'jobName',
          key: 'jobName',
          title: '任务名称',
          width: 130,
          fixed: 'left',
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
          dataIndex: 'cycle',
          key: 'cycle',
          title: '周期/单次',
          width: 130,
        },
        {
          align: 'center',
          dataIndex: 'lastSendTime',
          key: 'lastSendTime',
          title: '上次发送时间',
          width: 130,
        },
        {
          align: 'center',
          dataIndex: 'nextExecuteTime',
          key: 'nextExecuteTime',
          title: '下次执行时间',
          width: 130,
        },
        {
          align: 'center',
          dataIndex: 'status',
          key: 'status',
          render: (status: string, record: any) => <ASwitch checked={status !== '1'} onClick={() => handleSwitch(record)} />,
          title: '状态',
          width: 80,
        },
        {
          align: 'center',
          fixed: 'right',
          width: 120,
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

              <ATooltip title="发送记录">
                <AButton color="primary" icon={<ClockCircleOutlined />} size="small" variant="link" onClick={() => handleView(record)} />
              </ATooltip>
              <ATooltip title="调度日志">
                <AButton
                  color="primary"
                  icon={<ExceptionOutlined />}
                  size="small"
                  variant="link"
                  onClick={() => {
                    router.push({
                      name: 'job_log',
                      query: {
                        jobId: record.jobId,
                      },
                    });
                  }}
                />
              </ATooltip>

              <APopconfirm title={t('common.confirmDelete')} onConfirm={() => handleDelete(record.recordId)}>
                <ATooltip title="删除">
                  <AButton color="danger" icon={<DeleteOutlined />} size="small" variant="link" />
                </ATooltip>
              </APopconfirm>
            </div>
          ),
          title: t('common.operate'),
        },
      ] as any,
    rowKey: 'recordId',
  } as any);

  const { checkedRowKeys, editingData, generalPopupOperation, handleAdd, handleEdit, onBatchDeleted, onDeleted, rowSelection } = useTableOperate(data as any, run, async (res: any, type) => {
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
    const res = await batchDeleteJob({ recordIds: checkedRowKeys });
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
    router.push({
      name: 'job_email',
      query: {
        jobName: record.jobName,
      },
    });
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
    fetchShareEmailDetail(row.recordId).then((res: any) => {
      if (res.data.code > 200) {
        message.error(res.message);
        return;
      }
      setVisible(true);
      let data = { ...res.data, sendTime: { time: res.data.executeTime } };
      if (res.data.executeFrequency === 2) {
        data.sendTime = {
          time: res.data.executeTime,
          status: res.data.weekendTargetDay,
        };
      }
      if (res.data.executeFrequency === 3) {
        data.sendTime = {
          time: res.data.executeTime,
          status: res.data.monthlyTargetDay,
        };
      }
      form.setFieldsValue(data);
      setEditData(data);
    });
  }

  const handleConfirmCancel = () => {
    setVisible(false);
    form.resetFields();
    setEditData(null);
  };

  const handleShareEmail = () => {
    form.validateFields().then((values) => {
      let data = {
        ...editData,
        convUid: editData.conv_uid,
        chatId: editData.chat_id,
        agentId: editData.agent_id,
        spaceId: editData.space_id,
        extra: {},
        chatName: editData.biz_name,
        roundIndexs: editData.round_indexs,
        ...values,
        executeTime: values?.sendTime?.time,
      };
      if (values.executeFrequency === 2) {
        data.weekendTargetDay = values?.sendTime?.status;
      }
      if (values.executeFrequency === 3) {
        data.monthlyTargetDay = values?.sendTime?.status;
      }
      delete data.sendTime;

      updateShareEmail(data).then((res: any) => {
        if (res.code === 200) {
          message.success('分享成功');
          form.resetFields();
        } else {
          message.error('服务器错误');
        }
      });
    });
  };

  return (
    <div className="h-full min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto p-6">
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
          <AButton
            type="primary"
            onClick={handleExport}
          >
            导出
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
              scroll={{ x: 'max-content', ...scrollConfig }}
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

        <AModal
          key="shareEmail"
          width="60%"
          open={visible}
          title="定时任务编辑"
          onCancel={handleConfirmCancel}
          classNames={{
            body: 'h-[400px] overflow-auto',
          }}
          footer={
            <div className="flex justify-end gap-2">
              <AButton onClick={handleConfirmCancel}>取消</AButton>
              <AButton
                type="primary"
                style={{
                  outline: 'none',
                }}
                onClick={() => {
                  handleShareEmail();
                }}
              >
                确定
              </AButton>
            </div>
          }
        >
          <Form
            form={form}
            onValuesChange={(values) => {
              if (values.type) {
                form.setFieldsValue({
                  executeFrequency: null,
                  sendTime: null,
                });
              }
              if (values.executeFrequency) {
                form.setFieldsValue({
                  sendTime: null,
                });
              }
            }}
            layout="vertical"
            wrapperCol={{ span: 20 }}
          >
            <ShareEmailSetting form={form} />
          </Form>
        </AModal>
    </div>
  );
}
