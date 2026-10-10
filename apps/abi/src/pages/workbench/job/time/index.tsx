import { ClockCircleOutlined, DeleteOutlined, DownOutlined, EditOutlined, FileSearchOutlined, LeftOutlined, MoreOutlined, PlusOutlined, RightOutlined, SearchOutlined } from '@ant-design/icons';
import { useDebounceFn } from 'ahooks';
import { Dropdown, Empty, message } from 'antd';

import { TRIGGER_STATUS_OPTIONS } from '@/constants/job';
import { deleteJobInfo, fetchJobDetail, fetchJobGroupDetail, fetchJobGroupList, fetchJobInfoList, fetchNextTriggerTime, startJob, stopJob, triggerJob } from '@/service/api/job';
import { formatGlueMode, formatNextTriggerTime, formatScheduleConf, isJobRequestSuccess, resolveJobPageResult } from '../utils';
import { useRouter } from '~/packages/simple-router/src/hooks/useRouter';
import { ViewControls } from '@/components/ViewControls';
import type { ColumnOption } from '@/components/ViewControls';
import { SearchFilterBar, SearchFilterField, getFilterPopupContainer } from '@/components/SearchFilterBar';

import JobFormModal from './modules/job-form-modal';
import type { JobFormOperateType } from './modules/job-form-modal';

export function Component() {
  const { t } = useTranslation();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'list' | 'card'>('card');
  const [jumpValue, setJumpValue] = useState('');
  const [jobGroupOptions, setJobGroupOptions] = useState<{ label: string; value: number | string }[]>([]);
  const [checkedRowKeys, setCheckedRowKeys] = useState<React.Key[]>([]);
  const [formModal, setFormModal] = useState<{ initial?: any; open: boolean; operateType: JobFormOperateType }>({ open: false, operateType: 'add' });
  const [triggerModal, setTriggerModal] = useState<{ job?: any; open: boolean }>({ open: false });
  const [registryModal, setRegistryModal] = useState<{ list: string[]; loading: boolean; open: boolean }>({ list: [], loading: false, open: false });
  const [nextTriggerModal, setNextTriggerModal] = useState<{ loading: boolean; open: boolean; times: string[] }>({ loading: false, open: false, times: [] });
  const [triggerForm] = AForm.useForm();

  // 列选项：用于列选择器
  const [columnOptions, setColumnOptions] = useState<ColumnOption[]>([
    { key: 'jobId', label: '任务ID', visible: true },
    { key: 'name', label: '任务名称', visible: true },
    { key: 'scheduleType', label: '调度类型', visible: true },
    { key: 'glueType', label: '运行模式', visible: true },
    { key: 'triggerStatus', label: '状态', visible: true },
    { key: 'author', label: '负责人', visible: true },
    { key: 'operate', label: '操作', visible: true },
  ]);

  const handleColumnToggle = (key: string, visible: boolean) => {
    setColumnOptions(prev => prev.map(c => c.key === key ? { ...c, visible } : c));
  };
  const { run, searchParams, searchProps, tableProps, updateSearchParams } = useTable({
    apiFn: fetchJobInfoList as any,
    apiParams: useMemo(() => ({
      pageNum: 1,
      pageSize: 12,
      triggerStatus: '-1',
    }), []),
    transformer: (res: any) => {
      const { records, total } = resolveJobPageResult(res);
      const pageNum = searchParams.current.pageNum || 1;
      const pageSize = searchParams.current.pageSize || 12;
      return {
        data: records.map((item: any, index: number) => ({ ...item, index: (pageNum - 1) * pageSize + index + 1 })),
        pageNum,
        pageSize,
        total,
      };
    },
    columns: () =>
      [
        {
          align: 'center',
          dataIndex: 'id',
          key: 'jobId',
          title: '任务ID',
          minWidth: 90,
        },
        {
          align: 'left',
          dataIndex: 'name',
          key: 'name',
          title: '任务名称',
          minWidth: 200,
          render: (text: string) => (
            <span style={{ fontWeight: 600 }} title={text}>{text}</span>
          ),
        },
        {
          align: 'center',
          dataIndex: 'scheduleType',
          key: 'scheduleType',
          title: '调度类型',
          minWidth: 200,
          render: (_: unknown, record: any) => formatScheduleConf(record),
        },
        {
          align: 'center',
          dataIndex: 'glueType',
          key: 'glueType',
          title: '运行模式',
          minWidth: 220,
          render: (_: unknown, record: any) => formatGlueMode(record),
        },
        {
          align: 'center',
          dataIndex: 'triggerStatus',
          key: 'triggerStatus',
          title: '状态',
          minWidth: 100,
          render: (status: number) => (
            <span className={`abi-status-tag ${String(status) === '1' ? 'status-normal' : 'status-disabled'}`}>
              {String(status) === '1' ? 'RUNNING' : 'STOP'}
            </span>
          ),
        },
        {
          align: 'center',
          dataIndex: 'author',
          key: 'author',
          title: '负责人',
          minWidth: 120,
        },
        {
          align: 'center',
          fixed: 'right',
          key: 'operate',
          minWidth: 150,
          render: (_: unknown, record: any) => (
            <div className="ds-action-group">
              <AButton className="abi-action-link" size="small" variant="link" onClick={() => openEdit(record)}>
                <EditOutlined style={{ marginRight: 3, fontSize: 12 }} />编辑
              </AButton>
              <AButton className="abi-action-link" size="small" variant="link" onClick={() => handleViewLog(record)}>
                <FileSearchOutlined style={{ marginRight: 3, fontSize: 12 }} />日志
              </AButton>
              <Dropdown menu={{ items: moreMenuItems(record) }} trigger={['click']}>
                <AButton className="abi-action-link" size="small" variant="link">
                  更多 <DownOutlined style={{ fontSize: '0.625rem' }} />
                </AButton>
              </Dropdown>
            </div>
          ),
          title: t('common.operate'),
        },
      ] as any,
    immediate: false,
    rowKey: 'id',
  } as any);

  // 执行器加载完成后再发起首查：默认选中第一个执行器（对齐调度中心交互）
  useEffect(() => {
    const init = async () => {
      const groupRes: any = await fetchJobGroupList({ pageNum: 1 });
      const groups = resolveJobPageResult(groupRes).records;
      const options = groups.map((group: any) => ({ label: group.name, value: group.id }));
      setJobGroupOptions(options);
      const firstGroup = groups[0];
      (searchProps.form.setFieldsValue as any)({ jobGroup: firstGroup?.id, triggerStatus: '-1' });
      updateSearchParams({ jobGroup: firstGroup?.id, pageNum: 1, triggerStatus: '-1' } as any);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rowSelection = {
    columnWidth: 48,
    fixed: true,
    onChange: (keys: React.Key[]) => setCheckedRowKeys(keys),
    selectedRowKeys: checkedRowKeys,
    type: 'checkbox' as const,
  };

  const handleViewModeChange = (mode: 'card' | 'list') => {
    setCheckedRowKeys([]);
    setViewMode(mode);
  };

  const filteredColumns = useMemo(() => {
    const visibleKeys = new Set(columnOptions.filter(c => c.visible).map(c => c.key));
    return ((tableProps as any).columns || []).filter((col: any) => visibleKeys.has(col.key || col.dataIndex));
  }, [columnOptions, tableProps]);

  function openForm(operateType: JobFormOperateType, initial?: any) {
    setFormModal({ initial, open: true, operateType });
  }

  async function openEdit(row: any) {
    const res: any = await fetchJobDetail(String(row.id));
    openForm('edit', res?.data || row);
  }

  async function openCopy(row: any) {
    const res: any = await fetchJobDetail(String(row.id));
    const { id, ...rest } = res?.data || row;
    openForm('copy', rest);
  }

  async function handleDelete(ids: (number | string)[]) {
    const results: any[] = await Promise.all(ids.map(id => deleteJobInfo(String(id))));
    if (!results.every(isJobRequestSuccess)) return;
    message.success(t('common.deleteSuccess'));
    setCheckedRowKeys([]);
    run(false);
  }

  const confirmDelete = (record: any) => {
    AModal.confirm({
      content: `确认删除任务“${record.name}”吗？`,
      onOk: () => handleDelete([record.id]),
      title: '系统提示',
    });
  };

  const handleTrigger = async () => {
    if (!triggerModal.job) return;
    const values = triggerForm.getFieldsValue();
    const res: any = await triggerJob(String(triggerModal.job.id), {
      addressList: values.addressList || '',
      executorParam: values.executorParam || '',
    });
    if (!isJobRequestSuccess(res)) return;
    message.success('触发成功');
    setTriggerModal({ open: false });
    triggerForm.resetFields();
    run(false);
  };

  function handleViewLog(row: any) {
    router.push({ name: 'job_log', query: { jobId: String(row.id) } });
  }

  const handleRegistry = async (row: any) => {
    setRegistryModal({ list: [], loading: true, open: true });
    const res: any = await fetchJobGroupDetail(row.jobGroup);
    const list = res?.data?.registryList;
    setRegistryModal({ list: Array.isArray(list) ? list.map(String) : [], loading: false, open: true });
  };

  const handleNextTrigger = async (row: any) => {
    setNextTriggerModal({ loading: true, open: true, times: [] });
    const res: any = await fetchNextTriggerTime({ scheduleConf: row.scheduleConf, scheduleType: row.scheduleType });
    const raw = Array.isArray(res?.data) ? res.data : res?.data !== null && res?.data !== undefined ? [res.data] : [];
    setNextTriggerModal({ loading: false, open: true, times: raw.map(formatNextTriggerTime) });
  };

  // 行内/卡片更多菜单（列表操作列与卡片视图共用）
  function moreMenuItems(record: any) {
    return [
      { key: 'copy', label: '复制', onClick: () => openCopy(record) },
      { key: 'start', label: '启动', onClick: () => handleToggleRowsStatus([record], 1) },
      { key: 'stop', label: '停止', onClick: () => handleToggleRowsStatus([record], 0) },
      { key: 'trigger', label: '执行一次', onClick: () => setTriggerModal({ job: record, open: true }) },
      { key: 'registry', label: '注册节点', onClick: () => handleRegistry(record) },
      { key: 'nextTrigger', label: '下次执行时间', onClick: () => handleNextTrigger(record) },
      { type: 'divider' as const },
      { key: 'delete', danger: true, label: '删除', onClick: () => confirmDelete(record) },
    ];
  }

  function handleToggleRowsStatus(rows: any[], status: 0 | 1) {
    AModal.confirm({
      content: `确认要${status === 1 ? '启动' : '停止'}"${rows[0]?.name}"任务吗？`,
      onOk: async () => {
        const results: any[] = await Promise.all(rows.map(row => (status === 1 ? startJob(String(row.id)) : stopJob(String(row.id)))));
        if (!results.every(isJobRequestSuccess)) return;
        message.success('操作成功');
        run(false);
      },
      title: '系统提示',
    });
  }

  // 搜索框停止输入 1s 后自动查询；清空时立即查询
  const { cancel: cancelDebouncedSearch, run: runDebouncedSearch } = useDebounceFn(() => searchProps.search(), { wait: 1000 });
  const handleSearchValuesChange = (changed: Record<string, unknown>): void => {
    if (!Object.prototype.hasOwnProperty.call(changed, 'name')) return;
    const value = changed.name;
    if (value === undefined || value === null || value === '') {
      cancelDebouncedSearch();
      searchProps.search();
    } else {
      runDebouncedSearch();
    }
  };

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
            const running = String(record.triggerStatus) === '1';
            return (
              <div key={record.id} className="abi-data-card">
                <div className="abi-data-card-head">
                  <div className="abi-data-card-title">
                    <ClockCircleOutlined style={{ fontSize: 16, color: '#5b7cf7', flexShrink: 0 }} />
                    <span className="abi-data-card-name" title={record.name}>{record.name}</span>
                  </div>
                  <span className={`abi-status-tag ${running ? 'status-normal' : 'status-disabled'}`}>{running ? 'RUNNING' : 'STOP'}</span>
                </div>
                <div className="abi-data-card-body">
                  <div className="row"><span className="lbl">调度类型</span><span className="val">{formatScheduleConf(record)}</span></div>
                  <div className="row"><span className="lbl">运行模式</span><span className="val">{formatGlueMode(record)}</span></div>
                  <div className="row"><span className="lbl">负责人</span><span className="val">{record.author || '-'}</span></div>
                </div>
                <div className="abi-data-card-footer">
                  <button className="abi-card-act" onClick={() => openEdit(record)}>
                    <EditOutlined style={{ marginRight: 3 }} />编辑
                  </button>
                  <button className="abi-card-act" onClick={() => handleViewLog(record)}>
                    <FileSearchOutlined style={{ marginRight: 3 }} />日志
                  </button>
                  <Dropdown menu={{ items: moreMenuItems(record) }} trigger={['click']}>
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      {/* v5 Searchbar */}
      <section className="abi-searchbar">
        <AForm form={searchProps.form} layout="inline" style={{ display: 'contents' }} onValuesChange={handleSearchValuesChange}>
          <SearchFilterBar
            searchSlot={
              <AForm.Item className="m-0 flex-1 min-w-0" name="name">
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
            onReset={() => searchProps.reset()}
            filters={
              <>
                <SearchFilterField label="任务状态">
                  <AForm.Item className="m-0" name="triggerStatus">
                    <ASelect
                      allowClear
                      className="abi-field-input w-full"
                      getPopupContainer={getFilterPopupContainer}
                      options={TRIGGER_STATUS_OPTIONS}
                      placeholder="请选择任务状态"
                    />
                  </AForm.Item>
                </SearchFilterField>
                <SearchFilterField label="JobHandler">
                  <AForm.Item className="m-0" name="executorHandler">
                    <AInput allowClear className="abi-field-input w-full" placeholder="请输入JobHandler" />
                  </AForm.Item>
                </SearchFilterField>
                <SearchFilterField label="负责人">
                  <AForm.Item className="m-0" name="author">
                    <AInput allowClear className="abi-field-input w-full" placeholder="请输入负责人" />
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
            <AButton className="btn-accent-gradient" icon={<PlusOutlined />} onClick={() => openForm('add')}>
              新增任务
            </AButton>
            <APopconfirm
              title={t('common.confirmDelete')}
              onConfirm={() => handleDelete(checkedRowKeys as (number | string)[])}
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
                  scroll={tableProps.dataSource?.length > 0 ? { x: 'max-content' } : undefined}
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
              // pagination.current 读的是 searchParams.current.current，与 onChange 写入的 pageNum 不对应，故直接从 searchParams 取当前页
              const current = searchParams.current?.pageNum || 1;
              const pageSizeVal = searchParams.current?.pageSize || 12;
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
                    <span className="quick-jumper">
                      前往
                      <AInput
                        className="jump-input"
                        style={{ width: 48, textAlign: 'center' }}
                        value={jumpValue}
                        onChange={(e) => setJumpValue(e.target.value)}
                        onPressEnter={() => {
                          const page = parseInt(jumpValue, 10);
                          if (!isNaN(page) && page >= 1 && page <= totalPages) {
                            onChange?.(page, pageSizeVal);
                            setJumpValue('');
                          }
                        }}
                      />
                      页
                    </span>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </section>

      <JobFormModal
        initial={formModal.initial}
        jobGroupOptions={jobGroupOptions}
        open={formModal.open}
        operateType={formModal.operateType}
        onClose={() => setFormModal(prev => ({ ...prev, open: false }))}
        onSuccess={() => run(false)}
      />

      <AModal
        width={480}
        open={triggerModal.open}
        title={`执行一次${triggerModal.job?.name ? `：${triggerModal.job.name}` : ''}`}
        onCancel={() => { setTriggerModal({ open: false }); triggerForm.resetFields(); }}
        onOk={handleTrigger}
        okText="执行"
      >
        <AForm form={triggerForm} layout="vertical">
          <AForm.Item label="执行参数" name="executorParam">
            <AInput.TextArea placeholder="执行参数，可选（如 JSON 字符串）" rows={3} />
          </AForm.Item>
          <AForm.Item label="机器地址" name="addressList">
            <AInput placeholder="目标机器地址列表，可选" />
          </AForm.Item>
        </AForm>
      </AModal>

      <AModal
        width={480}
        open={registryModal.open}
        title="注册节点"
        footer={null}
        onCancel={() => setRegistryModal(prev => ({ ...prev, open: false }))}
      >
        {registryModal.loading ? (
          <div className="flex justify-center py-6"><ASpin /></div>
        ) : registryModal.list.length ? (
          <div className="flex flex-wrap gap-2">
            {registryModal.list.map(addr => <ATag key={addr}>{addr}</ATag>)}
          </div>
        ) : (
          <Empty description="暂无注册节点" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </AModal>

      <AModal
        width={480}
        open={nextTriggerModal.open}
        title="下次执行时间"
        footer={null}
        onCancel={() => setNextTriggerModal(prev => ({ ...prev, open: false }))}
      >
        {nextTriggerModal.loading ? (
          <div className="flex justify-center py-6"><ASpin /></div>
        ) : nextTriggerModal.times.length ? (
          <ol className="m-0 pl-5" style={{ lineHeight: 2 }}>
            {nextTriggerModal.times.map((time, index) => <li key={`${time}-${index}`}>{time}</li>)}
          </ol>
        ) : (
          <Empty description="暂无触发时间" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </AModal>
    </div>
  );
}
