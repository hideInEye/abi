import { ClockCircleOutlined, DeleteOutlined, DownOutlined, EditOutlined, ExceptionOutlined, FileSearchOutlined, LeftOutlined, MoreOutlined, RightOutlined, SearchOutlined } from '@ant-design/icons';
import { useDebounceFn } from 'ahooks';
import { Dropdown, Empty, Form, message } from 'antd';
import { Suspense } from 'react';

import { JOB_GROUP_OPTIONS, JOB_STATUS_OPTIONS } from '@/constants/job';
import { addJob, batchDeleteJob, deleteJob, exportJob, fetchChangeStatus, fetchJobList, fetchShareEmail, fetchShareEmailDetail, runJob, updateJob, updateShareEmail } from '@/service/api/job';
import { useRouter } from '~/packages/simple-router/src/hooks/useRouter';
import { useAppSelector } from '@/hooks/business/useStore';
import { getSpaceId } from '@/store/slice/app';
import { ViewControls } from '@/components/ViewControls';
import type { ColumnOption } from '@/components/ViewControls';
import { SearchFilterBar, SearchFilterField, getFilterPopupContainer } from '@/components/SearchFilterBar';

import JobDetailDrawer from './modules/job-detail-drawer';
import ShareEmailSetting from './modules/share-email-setting';

const JobDrawer = lazy(() => import('./modules/job-drawer'));

export function Component() {
  const { t } = useTranslation();
  const router = useRouter();
  const spaceId = useAppSelector(getSpaceId);
  const [form] = Form.useForm();
  const [visible, setVisible] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'list' | 'card'>('card');
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);

  // 列选项：用于列选择器
  const [columnOptions, setColumnOptions] = useState<ColumnOption[]>([
    { key: 'jobName', label: '任务名称', visible: true },
    { key: 'jobId', label: '任务ID', visible: true },
    { key: 'cycle', label: '周期/单次', visible: true },
    { key: 'lastSendTime', label: '上次发送时间', visible: true },
    { key: 'nextExecuteTime', label: '下次执行时间', visible: true },
    { key: 'status', label: '状态', visible: true },
    { key: 'operate', label: '操作', visible: true },
  ]);

  const handleColumnToggle = (key: string, visible: boolean) => {
    setColumnOptions(prev => prev.map(c => c.key === key ? { ...c, visible } : c));
  };
  const { scrollConfig, tableWrapperRef } = useTableScroll();

  const handleSwitch = async (record: any) => {
    AModal.confirm({
      content: `确认要"${record.status === '0' ? '暂停' : '启用'}""${record.jobName}"任务吗？`,
      onOk: async () => {
        const res = await fetchChangeStatus({
          jobId: record.jobId,
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
    apiParams: useMemo(() => ({
      pageNum: 1,
      pageSize: 12,
      spaceId,
    }), [spaceId]),
    columns: () =>
      [
        {
          align: 'left',
          dataIndex: 'jobName',
          key: 'jobName',
          title: '任务名称',
          minWidth: 200,
          render: (text: string) => (
            <span style={{ fontWeight: 600 }} title={text}>{text}</span>
          ),
        },
        {
          align: 'center',
          dataIndex: 'jobId',
          key: 'jobId',
          title: '任务id',
          minWidth: 130,
        },
        {
          align: 'center',
          dataIndex: 'cycle',
          key: 'cycle',
          title: '周期/单次',
          minWidth: 130,
        },
        {
          align: 'center',
          dataIndex: 'lastSendTime',
          key: 'lastSendTime',
          title: '上次发送时间',
          minWidth: 150,
        },
        {
          align: 'center',
          dataIndex: 'nextExecuteTime',
          key: 'nextExecuteTime',
          title: '下次执行时间',
          minWidth: 150,
        },
        {
          align: 'center',
          dataIndex: 'status',
          key: 'status',
          render: (status: string, record: any) => <ASwitch checked={status !== '1'} onClick={() => handleSwitch(record)} />,
          title: '状态',
          minWidth: 80,
        },
        {
          align: 'center',
          fixed: 'right',
          key: 'operate',
          minWidth: 150,
          render: (_: unknown, record: any) => (
            <div className="ds-action-group">
              <AButton className="abi-action-link" size="small" variant="link" onClick={() => edit(record)}>
                <EditOutlined style={{ marginRight: 3, fontSize: 12 }} />编辑
              </AButton>
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'sendRecord',
                      label: (
                        <span><FileSearchOutlined style={{ marginRight: 4 }} />发送记录</span>
                      ),
                      onClick: () => handleView(record),
                    },
                    {
                      key: 'jobLog',
                      label: (
                        <span><ExceptionOutlined style={{ marginRight: 4 }} />调度日志</span>
                      ),
                      onClick: () => router.push({ name: 'job_log', query: { jobId: record.jobId } }),
                    },
                    { type: 'divider' },
                    {
                      key: 'delete',
                      danger: true,
                      label: (
                        <APopconfirm title="提示" description={t('common.confirmDelete')} onConfirm={() => handleDelete(record.recordId)}>
                          <span><DeleteOutlined style={{ marginRight: 4 }} />删除</span>
                        </APopconfirm>
                      ),
                    },
                  ],
                }}
              >
                <AButton className="abi-action-link" size="small" variant="link">
                  更多 <DownOutlined style={{ fontSize: '0.625rem' }} />
                </AButton>
              </Dropdown>
            </div>
          ),
          title: t('common.operate'),
        },
      ] as any,
    rowKey: 'recordId',
  } as any);

  const { checkedRowKeys, clearCheckedRowKeys, editingData, generalPopupOperation, handleAdd, handleEdit, onBatchDeleted, onDeleted, rowSelection } = useTableOperate(data as any, run, async (res: any, type) => {
    if (type === 'add') {
      const addRes: any = await addJob(res);
      if (addRes?.response?.data?.code !== 200) return false;
    } else {
      const updateRes: any = await updateJob({ ...editingData, ...res });
      if (updateRes?.response?.data?.code !== 200) return false;
    }
  }, true);
  const handleViewModeChange = (mode: 'list' | 'card') => {
    clearCheckedRowKeys();
    setViewMode(mode);
  };

  const filteredColumns = useMemo(() => {
    const visibleKeys = new Set(columnOptions.filter(c => c.visible).map(c => c.key));
    return ((tableProps as any).columns || []).filter((col: any) => visibleKeys.has(col.key || col.dataIndex));
  }, [columnOptions, tableProps]);

  // 卡片视图渲染
  const renderCardGrid = () => {
    const dataSource = (tableProps as any).dataSource || [];
    if (dataSource.length === 0) {
      return (
        <div className="abi-card-empty">
          <Empty description="暂无定时任务" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      );
    }
    return (
      <div className="abi-card-grid">
        <div className="abi-card-grid-inner">
          {dataSource.map((record: any) => {
            const statusOn = record.status !== '1';
            return (
              <div key={record.recordId || record.jobId} className="abi-data-card">
                <div className="abi-data-card-head">
                  <div className="abi-data-card-title">
                    <ClockCircleOutlined style={{ fontSize: 16, color: '#5b7cf7', flexShrink: 0 }} />
                    <span className="abi-data-card-name" title={record.jobName}>{record.jobName}</span>
                  </div>
                  <ASwitch checked={statusOn} size="small" onClick={() => handleSwitch(record)} />
                </div>
                <div className="abi-data-card-body">
                  <div className="row"><span className="lbl">周期</span><span className="val">{record.cycle || '-'}</span></div>
                  <div className="row"><span className="lbl">上次发送</span><span className="val">{record.lastSendTime || '-'}</span></div>
                  <div className="row"><span className="lbl">下次执行</span><span className="val">{record.nextExecuteTime || '-'}</span></div>
                </div>
                <div className="abi-data-card-footer">
                  <button className="abi-card-act" onClick={() => edit(record)}>
                    <EditOutlined style={{ marginRight: 3 }} />编辑
                  </button>
                  <button className="abi-card-act" onClick={() => handleView(record)}>
                    <FileSearchOutlined style={{ marginRight: 3 }} />记录
                  </button>
                  <Dropdown
                    menu={{
                      items: [
                        {
                          key: 'log',
                          label: '调度日志',
                          onClick: () => router.push({ name: 'job_log', query: { jobId: record.jobId } }),
                        },
                        { type: 'divider' },
                        { key: 'delete', danger: true, label: '删除' },
                      ],
                      onClick: ({ key, domEvent }) => {
                        domEvent.stopPropagation();
                        if (key === 'delete') handleDelete(record.recordId);
                      }
                    }}
                    trigger={['click']}
                  >
                    <button className="abi-card-more" onClick={(e) => e.stopPropagation()}>
                      <MoreOutlined />
                    </button>
                  </Dropdown>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };
    
  async function handleBatchDelete() {
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
        sessionId: editData.chat_id,
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

  // 搜索框停止输入 1s 后自动查询；清空时立即查询
  const { cancel: cancelDebouncedSearch, run: runDebouncedSearch } = useDebounceFn(() => searchProps.search(), { wait: 1000 });
  const handleSearchValuesChange = (changed: Record<string, unknown>): void => {
    if (!Object.prototype.hasOwnProperty.call(changed, 'jobName')) return;
    const value = changed.jobName;
    if (value === undefined || value === null || value === '') {
      cancelDebouncedSearch();
      searchProps.search();
    } else {
      runDebouncedSearch();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      {/* v5 Searchbar */}
      <section className="abi-searchbar">
        <AForm form={searchProps.form} layout="inline" style={{ display: 'contents' }} onValuesChange={handleSearchValuesChange}>
          <SearchFilterBar
            searchSlot={
              <AForm.Item className="m-0 flex-1 min-w-0" name="jobName">
                <AInput
                  allowClear
                  className="abi-field-input w-full"
                  placeholder="请输入任务名称"
                  prefix={<SearchOutlined style={{ color: '#a3b3c8' }} />}
                  onPressEnter={() => { cancelDebouncedSearch(); searchProps.search(); }}
                />
              </AForm.Item>
            }
            onQuery={() => searchProps.search()}
            onReset={() => { searchProps.reset(); setDateRange(null); }}
            filters={
              <>
                <SearchFilterField label="时间范围">
                  <ADatePicker.RangePicker
                    allowClear
                    className="abi-field-input"
                    format="YYYY-MM-DD"
                    getPopupContainer={getFilterPopupContainer}
                    placeholder={['开始时间', '结束时间']}
                    value={dateRange}
                    onChange={(dates) => setDateRange(dates)}
                  />
                </SearchFilterField>
                <SearchFilterField label="任务状态">
                  <AForm.Item className="m-0" name="status">
                    <ASelect
                      allowClear
                      className="abi-field-input w-full"
                      getPopupContainer={getFilterPopupContainer}
                      options={JOB_STATUS_OPTIONS}
                      placeholder="请选择任务状态"
                    />
                  </AForm.Item>
                </SearchFilterField>
              </>
            }
          />
        </AForm>
      </section>

      {/* v5 Data Area */}
      <section className="abi-data-area">
        <div className="abi-toolbar">
          <div className="abi-toolbar-left">
            <AButton className="btn-accent-gradient" onClick={handleExport}>
              导出
            </AButton>
            <APopconfirm
              title={t('common.confirmDelete')}
              onConfirm={handleBatchDelete}
            >
              <AButton danger
                icon={<DeleteOutlined />}
                disabled={checkedRowKeys.length === 0}
              >
                批量删除{checkedRowKeys.length ? `(${checkedRowKeys.length})` : ''}
              </AButton>
            </APopconfirm>
          </div>
          <ViewControls
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
            columns={columnOptions}
            onColumnToggle={handleColumnToggle}
          />
        </div>

        {/* Content */}
        <div
          ref={tableWrapperRef}
          style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}
        >
          {viewMode === 'list' ? (
            <div
              style={{
                border: '1px solid rgba(130,140,200,0.18)',
                borderRadius: '12px',
                overflow: 'hidden',
                flex: 1,
                minHeight: 0,
              }}
            >
              <div className="assistant-table-scroll" style={{ overflow: 'auto', maxHeight: '100%' }}>
                <ATable
                  scroll={tableProps.dataSource?.length > 0 ? { x: 'max-content', ...scrollConfig } : undefined}
                  size="middle"
                  className="abi-std-table"
                  {...(tableProps as any)}
                  columns={filteredColumns as any}
                  pagination={false}
                  locale={{ emptyText: <TableEmpty description="暂无定时任务" /> }}
                  rowSelection={rowSelection}
                />
              </div>
            </div>
          ) : (
            renderCardGrid()
          )}

          <div className="data-source-pagination">
            {(() => {
              const pag = tableProps.pagination as any;
              const current = pag?.current || 1;
              const pageSizeVal = pag?.pageSize || 12;
              const totalVal = pag?.total || 0;
              const totalPages = Math.max(1, Math.ceil(totalVal / pageSizeVal));
              const onChange = pag?.onChange;
              const pages: number[] = [];
              if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) pages.push(i); }
              else {
                pages.push(1);
                if (current > 3) pages.push(-1);
                const start = Math.max(2, current - 1);
                const end = Math.min(totalPages - 1, current + 1);
                for (let i = start; i <= end; i++) pages.push(i);
                if (current < totalPages - 2) pages.push(-2);
                pages.push(totalPages);
              }
              return (
                <>
                  <span className="total-text">共 {totalVal} 条</span>
                  <div className="pagination-controls">
                    <ASelect value={pageSizeVal} onChange={(v: number) => onChange?.(1, v)} options={[{label:'12条/页',value:12},{label:'18条/页',value:18},{label:'24条/页',value:24},{label:'30条/页',value:30}]} className="page-size-select" />
                    <button className="page-btn" disabled={current === 1} onClick={() => onChange?.(current - 1, pageSizeVal)}><LeftOutlined /></button>
                    {pages.map(p => p < 0 ? <span key={p} className="page-item page-ellipsis">...</span> : <span key={p} className={`page-item${p === current ? ' page-active' : ''}`} onClick={() => onChange?.(p, pageSizeVal)}>{p}</span>)}
                    <button className="page-btn" disabled={current >= totalPages} onClick={() => onChange?.(current + 1, pageSizeVal)}><RightOutlined /></button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </section>

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
