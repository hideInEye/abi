import { DeleteOutlined, DownOutlined, ExceptionOutlined, FileSearchOutlined, LeftOutlined, MoreOutlined, RightOutlined, SearchOutlined } from '@ant-design/icons';
import { useDebounceFn } from 'ahooks';
import { Dropdown, Empty, Typography, message } from 'antd';

import { JOB_GROUP_OPTIONS, RUN_STATUS_OPTIONS } from '@/constants/job';
import { cleanJobLog, deleteJobLog, exportJobLog, fetchJobDetail, fetchJobLogList } from '@/service/api/job';
import { useRoute } from '~/packages/simple-router/src';
import { useAppSelector } from '@/hooks/business/useStore';
import { getSpaceId } from '@/store/slice/app';
import { ViewControls } from '@/components/ViewControls';
import type { ColumnOption } from '@/components/ViewControls';
import { SearchFilterBar, SearchFilterField, getFilterPopupContainer } from '@/components/SearchFilterBar';

import JobLogDetailDrawer from './modules/job-log-detail-drawer';

export function Component() {
  const { t } = useTranslation();
  const route = useRoute();
  const spaceId = useAppSelector(getSpaceId);
  const [viewJobLogId, setViewJobLogId] = useState('');
  const [jobDetail, setJobDetail] = useState<any>();
  const [viewMode, setViewMode] = useState<'list' | 'card'>('card');

  // 列选项：用于列选择器
  const [columnOptions, setColumnOptions] = useState<ColumnOption[]>([
    { key: 'executeTime', label: '任务执行时间', visible: true },
    { key: 'status', label: '任务状态', visible: true },
    { key: 'resultDescription', label: '结果描述', visible: true },
    { key: 'operate', label: '操作', visible: true },
  ]);

  const handleColumnToggle = (key: string, visible: boolean) => {
    setColumnOptions(prev => prev.map(c => c.key === key ? { ...c, visible } : c));
  };

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
      spaceId, // 空间id
    },
    columns: () =>
      [
        {
          align: 'center',
          dataIndex: 'executeTime',
          key: 'executeTime',
          title: '任务执行时间',
          minWidth: 180,
        },
        {
          align: 'center',
          dataIndex: 'status',
          key: 'status',
          title: '任务状态',
          minWidth: 100,
          render: (val: number) => {
            const text: Record<number, string> = {
              0: '正常',
              1: '错误',
              2: '执行中',
            };
            return <span>{text[val] || '-'}</span>;
          },
        },
        {
          align: 'left' as const,
          className: 'col-job-log-desc',
          dataIndex: 'resultDescription',
          key: 'resultDescription',
          title: '结果描述',
          minWidth: 200,
          onHeaderCell: () => ({ className: 'col-job-log-desc' }),
          onCell: () => ({ style: { whiteSpace: 'normal', wordBreak: 'break-all' as const, maxWidth: 300 } }),
          render: (text: string) => text
            ? <Typography.Paragraph ellipsis={{ rows: 2, tooltip: text }} style={{ marginBottom: 0, fontSize: 'inherit', color: 'inherit', maxWidth: 260 }}>{text}</Typography.Paragraph>
            : <span style={{ color: '#9ca3af' }}>-</span>,
        },
        {
          align: 'center',
          fixed: 'right',
          key: 'operate',
          minWidth: 120,
          render: (_: unknown, record: any) => (
            <div className="ds-action-group">
              {record?.status === '0' && (
                <AButton className="abi-action-link" size="small" variant="link" onClick={() => handleView(record)}>
                  <FileSearchOutlined style={{ marginRight: 3, fontSize: 12 }} />查看报告
                </AButton>
              )}
              {record?.status === '1' && (
                <AButton className="abi-action-link" size="small" variant="link" onClick={() => handleViewError(record)}>
                  <ExceptionOutlined style={{ marginRight: 3, fontSize: 12 }} />查看错误
                </AButton>
              )}
              <APopconfirm title="提示" description="确定要删除吗？" onConfirm={() => handleDelete(record.jobLogId)}>
                <AButton className="abi-action-link" size="small" variant="link">
                  <DeleteOutlined style={{ marginRight: 3, fontSize: 12 }} />删除
                </AButton>
              </APopconfirm>
            </div>
          ),
          title: t('common.operate'),
        },
      ] as any,
    immediate: false,
    rowKey: 'jobLogId',
  } as any);

  const { checkedRowKeys, clearCheckedRowKeys, onBatchDeleted, onDeleted, rowSelection } = useTableOperate(data as any, run, async () => {}, true);
  const handleViewModeChange = (mode: 'list' | 'card') => {
    clearCheckedRowKeys();
    setViewMode(mode);
  };

  const filteredColumns = useMemo(() => {
    const visibleKeys = new Set(columnOptions.filter(c => c.visible).map(c => c.key));
    return ((tableProps as any).columns || []).filter((col: any) => visibleKeys.has(col.key || col.dataIndex));
  }, [columnOptions, tableProps]);

  // 卡片视图渲染
  const statusMap: Record<string, { text: string; cls: string }> = {
    '0': { text: '正常', cls: 'status-normal' },
    '1': { text: '错误', cls: 'status-error' },
    '2': { text: '执行中', cls: 'status-warning' },
  };

  const renderCardGrid = () => {
    const dataSource = (tableProps as any).dataSource || [];
    if (dataSource.length === 0) {
      return (
        <div className="abi-card-empty">
          <Empty description="暂无调度日志" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      );
    }
    return (
      <div className="abi-card-grid">
        <div className="abi-card-grid-inner">
          {dataSource.map((record: any) => {
            const st = statusMap[String(record.status)] || { text: '-', cls: '' };
            return (
              <div key={record.jobLogId} className="abi-data-card">
                <div className="abi-data-card-head">
                  <div className="abi-data-card-title">
                    <span className="abi-data-card-name" title={record.jobName || record.jobLogId}>{record.jobName || record.jobLogId}</span>
                  </div>
                  <span className={`abi-status-tag ${st.cls}`}>{st.text}</span>
                </div>
                <div className="abi-data-card-body">
                  <div className="row"><span className="lbl">执行时间</span><span className="val">{record.executeTime || '-'}</span></div>
                  <div className="row"><span className="lbl">结果描述</span><span className="val">{record.resultDescription || '-'}</span></div>
                </div>
                <div className="abi-data-card-footer">
                  {record.status === '0' && (
                    <button className="abi-card-act" onClick={() => handleView(record)}>
                      <FileSearchOutlined style={{ marginRight: 3 }} />查看报告
                    </button>
                  )}
                  {record.status === '1' && (
                    <button className="abi-card-act" onClick={() => handleViewError(record)}>
                      <ExceptionOutlined style={{ marginRight: 3 }} />查看错误
                    </button>
                  )}
                  <Dropdown
                    menu={{
                      items: [
                        { key: 'delete', danger: true, label: '删除' },
                      ],
                      onClick: ({ key, domEvent }) => {
                        domEvent.stopPropagation();
                        if (key === 'delete') handleDelete(record.jobLogId);
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
            onReset={() => searchProps.reset()}
            filters={
              <>
                <SearchFilterField label="任务执行时间">
                  <AForm.Item className="m-0" name="lastSendTime">
                    <ADatePicker.RangePicker
                      allowClear
                      className="abi-field-input"
                      format="YYYY-MM-DD"
                      getPopupContainer={getFilterPopupContainer}
                      placeholder={['开始时间', '结束时间']}
                    />
                  </AForm.Item>
                </SearchFilterField>
                <SearchFilterField label="执行状态">
                  <AForm.Item className="m-0" name="status">
                    <ASelect
                      allowClear
                      className="abi-field-input w-full"
                      getPopupContainer={getFilterPopupContainer}
                      options={RUN_STATUS_OPTIONS}
                      placeholder="请选择执行状态"
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
            <AButton className="btn-ghost-v5" onClick={handleClean}>
              清空日志
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
                  scroll={(tableProps as any).dataSource?.length > 0 ? { x: 'max-content', ...scrollConfig } : undefined}
                  size="middle"
                  className="job-log-table abi-std-table"
                  {...(tableProps as any)}
                  columns={filteredColumns as any}
                  pagination={false}
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
              const pageSizeVal = pag?.pageSize || 10;
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
                    <ASelect value={pageSizeVal} onChange={(v: number) => onChange?.(1, v)} options={[{label:'10条/页',value:10},{label:'15条/页',value:15},{label:'20条/页',value:20}]} className="page-size-select" />
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
    </div>
  );
}
