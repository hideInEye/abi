import { DeleteOutlined, DownOutlined, FileSearchOutlined, FormOutlined, LeftOutlined, RightOutlined, SearchOutlined, StopOutlined } from '@ant-design/icons';
import { useDebounceFn } from 'ahooks';
import { Dropdown, message } from 'antd';
import dayjs from 'dayjs';

import { LOG_CLEAN_TYPE_OPTIONS, LOG_STATUS_OPTIONS } from '@/constants/job';
import { cleanJobLog, fetchJobDetail, fetchJobGroupList, fetchJobInfoList, fetchJobLogList, killJobLog } from '@/service/api/job';
import { isJobRequestSuccess, resolveHandleResult, resolveJobPageResult, resolveTriggerResult } from '../utils';
import type { JobLogStatus } from '../utils';
import { useRoute } from '~/packages/simple-router/src';
import { ViewControls } from '@/components/ViewControls';
import type { ColumnOption } from '@/components/ViewControls';
import { SearchFilterBar, SearchFilterField, getFilterPopupContainer } from '@/components/SearchFilterBar';

import JobLogDetailDrawer from './modules/job-log-detail-drawer';

const RESULT_TAG_MAP: Record<JobLogStatus, { cls: string; text: string }> = {
  fail: { cls: 'status-error', text: '失败' },
  running: { cls: 'status-warning', text: '运行中' },
  success: { cls: 'status-normal', text: '成功' },
  unknown: { cls: 'status-disabled', text: '-' },
};

const PRE_STYLE: React.CSSProperties = {
  background: 'rgba(130,140,200,0.08)',
  borderRadius: 8,
  maxHeight: 320,
  overflow: 'auto',
  padding: 12,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-all',
};

export function Component() {
  const { t } = useTranslation();
  const route = useRoute();
  const [viewJobLogId, setViewJobLogId] = useState('');
  const [triggerMsgModal, setTriggerMsgModal] = useState<{ open: boolean; text: string }>({ open: false, text: '' });
  // 日志清理弹层：回显清理范围的执行器/任务 + 清理方式九选一；scope 为单条记录清理时的范围覆盖
  const [cleanModal, setCleanModal] = useState<{ groupText: string; jobText: string; open: boolean; scope?: { jobGroup?: any; jobId?: any }; type: number }>({ groupText: '全部', jobText: '全部', open: false, type: 1 });
  const [jobGroupOptions, setJobGroupOptions] = useState<{ label: string; value: number | string }[]>([]);
  const [jobOptions, setJobOptions] = useState<{ label: string; value: number | string }[]>([]);
  const [checkedRowKeys, setCheckedRowKeys] = useState<React.Key[]>([]);
  // 任务列展示名：日志接口只回 jobId，用当前执行器下的任务列表做映射（ref 保证列渲染闭包读到最新值）
  const jobNameMapRef = useRef<Record<string, string>>({});

  // 调度时间默认近 7 天，对齐调度中心日志页初始查询范围
  const defaultFilterTime = useMemo(() => [dayjs().subtract(7, 'day').startOf('day'), dayjs().endOf('day')], []);

  // 列选项：用于列选择器
  const [columnOptions, setColumnOptions] = useState<ColumnOption[]>([
    { key: 'id', label: '调度日志ID', visible: true },
    { key: 'job', label: '任务', visible: true },
    { key: 'triggerTime', label: '调度时间', visible: true },
    { key: 'triggerResult', label: '调度结果', visible: true },
    { key: 'triggerMsg', label: '调度备注', visible: true },
    { key: 'handleTime', label: '执行时间', visible: true },
    { key: 'handleResult', label: '执行结果', visible: true },
    { key: 'handleMsg', label: '执行备注', visible: true },
    { key: 'operate', label: '操作', visible: true },
  ]);

  const handleColumnToggle = (key: string, visible: boolean) => {
    setColumnOptions(prev => prev.map(c => c.key === key ? { ...c, visible } : c));
  };
  const { data, run, searchParams, searchProps, tableProps, updateSearchParams } = useTable({
    apiFn: fetchJobLogList as any,
    apiParams: useMemo(() => ({
      pageNum: 1,
      pageSize: 12,
      logStatus: '-1',
      filterTime: defaultFilterTime,
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
          key: 'id',
          title: '调度日志ID',
          minWidth: 110,
        },
        {
          align: 'left',
          key: 'job',
          title: '任务',
          minWidth: 200,
          render: (_: unknown, record: any) => {
            const name = record.jobDesc || record.jobName || jobNameMapRef.current[String(record.jobId)] || '';
            const text = `【${record.jobId}】${name}`;
            return (
              <span style={{ fontWeight: 600 }} title={text}>{text}</span>
            );
          },
        },
        {
          align: 'center',
          dataIndex: 'triggerTime',
          key: 'triggerTime',
          title: '调度时间',
          minWidth: 180,
          render: (text: string) => text || '-',
        },
        {
          align: 'center',
          key: 'triggerResult',
          title: '调度结果',
          minWidth: 100,
          render: (_: unknown, record: any) => {
            const st = RESULT_TAG_MAP[resolveTriggerResult(record)];
            return <span className={`abi-status-tag ${st.cls}`}>{st.text}</span>;
          },
        },
        {
          align: 'center',
          key: 'triggerMsg',
          title: '调度备注',
          minWidth: 100,
          render: (_: unknown, record: any) =>
            record.triggerMsg ? (
              <AButton className="abi-action-link" size="small" variant="link" onClick={() => setTriggerMsgModal({ open: true, text: record.triggerMsg })}>
                查看
              </AButton>
            ) : (
              '-'
            ),
        },
        {
          align: 'center',
          dataIndex: 'handleTime',
          key: 'handleTime',
          title: '执行时间',
          minWidth: 180,
          render: (text: string) => text || '-',
        },
        {
          align: 'center',
          key: 'handleResult',
          title: '执行结果',
          minWidth: 100,
          render: (_: unknown, record: any) => {
            const st = RESULT_TAG_MAP[resolveHandleResult(record)];
            return <span className={`abi-status-tag ${st.cls}`}>{st.text}</span>;
          },
        },
        {
          align: 'left',
          dataIndex: 'handleMsg',
          key: 'handleMsg',
          title: '执行备注',
          minWidth: 160,
          render: (text: string) => text || '无',
        },
        {
          align: 'center',
          fixed: 'right',
          key: 'operate',
          minWidth: 200,
          render: (_: unknown, record: any) => {
            // 行内最多展示 3 个（含「更多」按钮）：有溢出操作时行内 2 个 + 更多，其余收进更多菜单
            const actions: { icon?: React.ReactNode; key: string; label: string; onClick: () => void }[] = [
              { icon: <FileSearchOutlined style={{ fontSize: 12, marginRight: 3 }} />, key: 'view', label: '执行日志', onClick: () => setViewJobLogId(String(record.id)) },
              ...(record.triggerMsg ? [{ icon: <FormOutlined style={{ fontSize: 12, marginRight: 3 }} />, key: 'triggerMsg', label: '调度备注', onClick: () => setTriggerMsgModal({ open: true, text: record.triggerMsg }) }] : []),
              { icon: <StopOutlined style={{ fontSize: 12, marginRight: 3 }} />, key: 'kill', label: '终止任务', onClick: () => handleKill(record) },
              { key: 'clean', label: '日志清理', onClick: () => openCleanModal(record) },
            ];
            const hasOverflow = actions.length > 3;
            const inline = hasOverflow ? actions.slice(0, 2) : actions;
            const overflow = hasOverflow ? actions.slice(2) : [];
            return (
              <div className="ds-action-group">
                {inline.map(action => (
                  <AButton key={action.key} className="abi-action-link" size="small" variant="link" onClick={action.onClick}>
                    {action.icon}{action.label}
                  </AButton>
                ))}
                {overflow.length > 0 && (
                  <Dropdown
                    menu={{ items: overflow.map(action => ({ key: action.key, label: action.label, onClick: action.onClick })) }}
                    trigger={['click']}
                  >
                    <AButton className="abi-action-link" size="small" variant="link">
                      更多 <DownOutlined style={{ fontSize: '0.625rem' }} />
                    </AButton>
                  </Dropdown>
                )}
              </div>
            );
          },
          title: t('common.operate'),
        },
      ] as any,
    immediate: false,
    rowKey: 'id',
  } as any);

  const loadJobOptions = async (jobGroup: any) => {
    if (jobGroup === undefined || jobGroup === null || jobGroup === '') {
      setJobOptions([]);
      jobNameMapRef.current = {};
      return;
    }
    const res: any = await fetchJobInfoList({ jobGroup, pageNum: 1, pageSize: 500 });
    const records = resolveJobPageResult(res).records;
    jobNameMapRef.current = Object.fromEntries(records.map((job: any) => [String(job.id), job.name]));
    setJobOptions(records.map((job: any) => ({ label: job.name, value: job.id })));
  };

  // 执行器-任务级联初始化；从任务管理「查询日志」进入时按 jobId 定位
  useEffect(() => {
    const init = async () => {
      const groupRes: any = await fetchJobGroupList({ pageNum: 1 });
      const groups = resolveJobPageResult(groupRes).records;
      setJobGroupOptions(groups.map((group: any) => ({ label: group.name, value: group.id })));
      const queryJobId = route.query?.jobId as string | undefined;
      let jobGroup = groups[0]?.id;
      if (queryJobId) {
        const jobRes: any = await fetchJobDetail(queryJobId);
        if (jobRes?.data?.jobGroup) jobGroup = jobRes.data.jobGroup;
      }
      await loadJobOptions(jobGroup);
      (searchProps.form.setFieldsValue as any)({ jobGroup, jobId: queryJobId || undefined, logStatus: '-1', filterTime: defaultFilterTime });
      updateSearchParams({ jobGroup, jobId: queryJobId || undefined, logStatus: '-1', filterTime: defaultFilterTime, pageNum: 1 } as any);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleJobGroupChange = (value: any) => {
    (searchProps.form.setFieldsValue as any)({ jobId: undefined });
    loadJobOptions(value);
    searchProps.search();
  };

  // 搜索框停止输入 1s 后自动查询；清空时立即查询
  const { cancel: cancelDebouncedSearch, run: runDebouncedSearch } = useDebounceFn(() => searchProps.search(), { wait: 1000 });
  const handleSearchValuesChange = (changed: Record<string, unknown>): void => {
    if (!Object.hasOwn(changed, 'name')) return;
    const value = changed.name;
    if (value === undefined || value === null || value === '') {
      cancelDebouncedSearch();
      searchProps.search();
    } else {
      runDebouncedSearch();
    }
  };

  const filteredColumns = useMemo(() => {
    const visibleKeys = new Set(columnOptions.filter(c => c.visible).map(c => c.key));
    return ((tableProps as any).columns || []).filter((col: any) => visibleKeys.has(col.key || col.dataIndex));
  }, [columnOptions, tableProps]);

  const selectedRows = useMemo(() => (data as any[]).filter(row => checkedRowKeys.includes(row.id)), [data, checkedRowKeys]);
  const singleRow = selectedRows.length === 1 ? selectedRows[0] : null;

  const rowSelection = {
    columnWidth: 48,
    fixed: true,
    onChange: (keys: React.Key[]) => setCheckedRowKeys(keys),
    selectedRowKeys: checkedRowKeys,
    type: 'checkbox' as const,
  };

  async function handleKillSelected() {
    const ids = checkedRowKeys as (number | string)[];
    const results: any[] = await Promise.all(ids.map(id => killJobLog(String(id))));
    if (!results.every(isJobRequestSuccess)) return;
    message.success('终止成功');
    setCheckedRowKeys([]);
    run(false);
  }

  async function handleKill(record: any) {
    const res: any = await killJobLog(String(record.id));
    if (!isJobRequestSuccess(res)) return;
    message.success('终止成功');
    run(false);
  }

  // 日志清理入口：不传记录按当前筛选范围，传记录按该记录的执行器/任务范围
  function openCleanModal(record?: any) {
    const formValues = searchProps.form.getFieldsValue() as any;
    const jobGroup = record ? record.jobGroup ?? formValues.jobGroup : formValues.jobGroup;
    const jobId = record ? record.jobId : formValues.jobId;
    const jobText = record?.jobDesc || record?.jobName || jobNameMapRef.current[String(jobId)] || jobOptions.find(item => String(item.value) === String(jobId))?.label || '全部';
    setCleanModal({
      groupText: jobGroupOptions.find(item => String(item.value) === String(jobGroup))?.label || '全部',
      jobText,
      open: true,
      scope: record ? { jobGroup, jobId } : undefined,
      type: 1,
    });
  }

  const submitClean = async () => {
    const formValues = searchProps.form.getFieldsValue() as any;
    const jobGroup = cleanModal.scope?.jobGroup ?? formValues.jobGroup;
    const jobId = cleanModal.scope?.jobId ?? formValues.jobId;
    const res: any = await cleanJobLog({ jobGroup: jobGroup ?? 0, jobId: jobId ?? 0, type: cleanModal.type });
    if (!isJobRequestSuccess(res)) return;
    message.success('清理成功');
    setCleanModal(modal => ({ ...modal, open: false }));
    setCheckedRowKeys([]);
    run(false);
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
                  placeholder="请输入日志名称"
                  prefix={<SearchOutlined style={{ color: '#a3b3c8' }} />}
                  onPressEnter={() => { cancelDebouncedSearch(); searchProps.search(); }}
                />
              </AForm.Item>
            }
            onQuery={() => searchProps.search()}
            onReset={() => searchProps.reset()}
            filters={
              <>
                <SearchFilterField label="执行器">
                  <AForm.Item className="m-0" name="jobGroup">
                    <ASelect
                      className="abi-field-input w-full"
                      getPopupContainer={getFilterPopupContainer}
                      options={jobGroupOptions}
                      placeholder="请选择执行器"
                      onChange={handleJobGroupChange}
                    />
                  </AForm.Item>
                </SearchFilterField>
                <SearchFilterField label="任务">
                  <AForm.Item className="m-0" name="jobId">
                    <ASelect
                      allowClear
                      showSearch
                      className="abi-field-input w-full"
                      getPopupContainer={getFilterPopupContainer}
                      optionFilterProp="label"
                      options={jobOptions}
                      placeholder="请选择任务"
                    />
                  </AForm.Item>
                </SearchFilterField>
                <SearchFilterField label="日志状态">
                  <AForm.Item className="m-0" name="logStatus">
                    <ASelect
                      allowClear
                      className="abi-field-input w-full"
                      getPopupContainer={getFilterPopupContainer}
                      options={LOG_STATUS_OPTIONS}
                      placeholder="请选择日志状态"
                    />
                  </AForm.Item>
                </SearchFilterField>
                <SearchFilterField label="调度时间">
                  <AForm.Item className="m-0" initialValue={defaultFilterTime} name="filterTime">
                    <ADatePicker.RangePicker
                      allowClear
                      showTime
                      className="abi-field-input"
                      format="YYYY-MM-DD HH:mm:ss"
                      getPopupContainer={getFilterPopupContainer}
                      placeholder={['开始时间', '结束时间']}
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
            <APopconfirm
              title="系统提示"
              description={`确认终止选中的 ${checkedRowKeys.length} 个作业吗？`}
              onConfirm={handleKillSelected}
            >
              <AButton
                icon={<StopOutlined />}
                disabled={checkedRowKeys.length === 0}
              >
                批量终止任务{checkedRowKeys.length ? `(${checkedRowKeys.length})` : ''}
              </AButton>
            </APopconfirm>
            <AButton danger
              icon={<DeleteOutlined />}
              onClick={() => openCleanModal()}
            >
              批量日志清理
            </AButton>
            <AButton
              icon={<FileSearchOutlined />}
              disabled={!singleRow}
              onClick={() => setViewJobLogId(String(singleRow?.id))}
            >
              执行日志
            </AButton>
          </div>
          <ViewControls
            hideCardToggle
            columns={columnOptions}
            onColumnToggle={handleColumnToggle}
          />
        </div>

        {/* Content */}
        <div
          style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}
        >
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
                scroll={(tableProps as any).dataSource?.length > 0 ? { x: 'max-content' } : undefined}
                size="middle"
                className="job-log-table abi-std-table"
                {...(tableProps as any)}
                columns={filteredColumns as any}
                pagination={false}
                locale={{ emptyText: <TableEmpty description="暂无调度日志" /> }}
                rowSelection={rowSelection}
              />
            </div>
          </div>

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

      {/* 调度备注查看 */}
      <AModal
        open={triggerMsgModal.open}
        title="调度备注"
        footer={null}
        onCancel={() => setTriggerMsgModal({ open: false, text: '' })}
      >
        <pre style={PRE_STYLE}>{triggerMsgModal.text}</pre>
      </AModal>

      {/* 日志清理：执行器/任务只读回显当前筛选，清理方式对齐调度中心九档 */}
      <AModal
        open={cleanModal.open}
        title="日志清理"
        onCancel={() => setCleanModal(modal => ({ ...modal, open: false }))}
        footer={
          <div className="flex justify-end gap-2">
            <AButton danger type="primary" onClick={submitClean}>
              清理
            </AButton>
            <AButton onClick={() => setCleanModal(modal => ({ ...modal, open: false }))}>取消</AButton>
          </div>
        }
      >
        <AForm labelCol={{ span: 5 }} wrapperCol={{ span: 18 }}>
          <AForm.Item label="执行器">
            <AInput disabled value={cleanModal.groupText} />
          </AForm.Item>
          <AForm.Item label="任务">
            <AInput disabled value={cleanModal.jobText} />
          </AForm.Item>
          <AForm.Item label="清理方式">
            <ASelect options={LOG_CLEAN_TYPE_OPTIONS} value={cleanModal.type} onChange={value => setCleanModal(modal => ({ ...modal, type: value }))} />
          </AForm.Item>
        </AForm>
      </AModal>

      {viewJobLogId && (
        <JobLogDetailDrawer
          jobLogId={viewJobLogId}
          onClose={() => setViewJobLogId('')}
          onRefresh={() => run(false)}
        />
      )}
    </div>
  );
}
