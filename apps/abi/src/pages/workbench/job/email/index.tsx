import { DeleteOutlined, FileMarkdownOutlined, LeftOutlined, MoreOutlined, QuestionCircleOutlined, RightOutlined, SearchOutlined } from '@ant-design/icons';
import { useDebounceFn } from 'ahooks';
// import PageTitle from '@/components/stateless/common/PageTitle';

import { deleteJob, deleteShareEmail, deleteShareEmailBatch, fetchEmailList } from '@/service/api/job';

import { DeferredRangePicker, SearchFilterBar, SearchFilterField, getFilterPopupContainer } from '@/components/SearchFilterBar';
import { filterByCreateTime } from '@/utils/date';
import { useRoute, useRouter } from '~/packages/simple-router/src';
import { shareMailColor, shareMailStatus, statusType } from '@/types/job';
import { Dropdown, Empty, message } from 'antd';
import { getSpaceId } from '@/store/slice/app';
import { ViewControls } from '@/components/ViewControls';
import type { ColumnOption } from '@/components/ViewControls';

export function Component() {
  const { t } = useTranslation();
  const route = useRoute();
  const spaceId = useAppSelector(getSpaceId);
  const [dateRange, setDateRange] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');
  // 列选项：用于列选择器
  const [columnOptions, setColumnOptions] = useState<ColumnOption[]>([
    { key: 'jobName', label: '任务名称', visible: true },
    { key: 'jobId', label: '任务id', visible: true },
    { key: 'recipients', label: '收件人', visible: true },
    { key: 'type', label: '发送类型', visible: true },
    { key: 'sendTime', label: '发送时间', visible: true },
    { key: 'status', label: '状态', visible: true },
    { key: 'operate', label: '操作', visible: true },
  ]);
  const handleColumnToggle = (key: string, visible: boolean) => {
    setColumnOptions(prev => prev.map(c => c.key === key ? { ...c, visible } : c));
  };
  const { data, run, searchProps, tableProps } = useTable({
    apiFn: fetchEmailList as any,
    apiParams: {
      pageNum: 1,
      pageSize: 10,
      spaceId, // 空间id
    },
    transformer: (res: any) => {
      return res;
    },
    columns: () =>
      [
        {
          align: 'left',
          dataIndex: 'jobName',
          key: 'jobName',
          title: '任务名称',
          minWidth: 160,
          onHeaderCell: () => ({ className: 'col-left-header' }),
          render: (text: string) => {
            if (!text) {
              return '';
            }
            return <APopover content={text}>{text.length > 30 ? `${text.slice(0, 30)}...` : text}</APopover>;
          },
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
          dataIndex: 'recipients',
          key: 'recipients',
          title: '收件人',
          minWidth: 130,
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
          minWidth: 130,
          onHeaderCell: () => ({ className: 'col-left-header' }),
        },
        {
          align: 'center',
          dataIndex: 'sendTime',
          key: 'sendTime',
          title: '发送时间',
          minWidth: 150,
        },
        {
          align: 'center',
          dataIndex: 'status',
          key: 'status',
          title: '状态',
          minWidth: 120,
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
          minWidth: 200,
          render: (_: unknown, record: any) => (
            <div className="ds-action-group">
              <AButton className="abi-action-link" size="small" variant="link" onClick={() => handleExport(record)}>
                <FileMarkdownOutlined style={{ marginRight: 3, fontSize: 12 }} />下载
              </AButton>
              <APopconfirm title="提示" description={t('common.confirmDelete')} onConfirm={() => handleDelete(record.logId)}>
                <AButton className="abi-action-link-danger" size="small" variant="link">
                  <DeleteOutlined style={{ marginRight: 3, fontSize: 12 }} />删除
                </AButton>
              </APopconfirm>
            </div>
          ),
        },
      ] as any,
    rowKey: 'logId',
  } as any);

  const { checkedRowKeys, clearCheckedRowKeys, onBatchDeleted, onDeleted, rowSelection } = useTableOperate(data as any, run, () => {}, true);
  const handleViewModeChange = (mode: 'list' | 'card') => {
    clearCheckedRowKeys?.();
    setViewMode(mode);
  };
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

  const jobOptions = useMemo(() => {
    return Object.entries(shareMailStatus).map(([key, value]) => ({
      label: value,
      value: key,
    }));
  }, [shareMailStatus]);

  // 前端按发送时间过滤 + 前端分页（useTable 返回全量数据）
  const pag = tableProps.pagination as any;
  const currentPage = pag?.current || 1;
  const pageSizeVal = pag?.pageSize || 10;
  const filteredData = useMemo(
    () => filterByCreateTime((data as any[]) || [], dateRange, 'sendTime'),
    [data, dateRange]
  );
  const totalCount = filteredData.length;
  const pagedData = useMemo(
    () => filteredData.slice((currentPage - 1) * pageSizeVal, currentPage * pageSizeVal),
    [filteredData, currentPage, pageSizeVal]
  );

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

  const filteredColumns = useMemo(() => {
    const visibleKeys = new Set(columnOptions.filter(c => c.visible).map(c => c.key));
    return ((tableProps as any).columns || []).filter((col: any) => visibleKeys.has(col.key || col.dataIndex));
  }, [columnOptions, tableProps]);

  // 卡片视图渲染
  const renderCardGrid = () => {
    if (!pagedData || pagedData.length === 0) {
      return (
        <div className="abi-card-empty">
          <Empty description="暂无邮件记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      );
    }
    return (
      <div className="abi-card-grid">
        <div className="abi-card-grid-inner">
          {pagedData.map((record: any) => (
            <div key={record.logId} className="abi-data-card">
              <div className="abi-data-card-head">
                <div className="abi-data-card-title">
                  <span className="abi-data-card-name" title={record.jobName}>{record.jobName || '-'}</span>
                </div>
                <span className="abi-status-tag" style={{ color: shareMailColor[record.status as statusType] }}>
                  {shareMailStatus[record.status as statusType] || '-'}
                </span>
              </div>
              <div className="abi-data-card-body">
                <div className="row"><span className="lbl">任务id</span><span className="val">{record.jobId || '-'}</span></div>
                <div className="row"><span className="lbl">收件人</span><span className="val">{record.recipients || '-'}</span></div>
                <div className="row"><span className="lbl">发送类型</span><span className="val">{record.type || '-'}</span></div>
                <div className="row"><span className="lbl">发送时间</span><span className="val">{record.sendTime || '-'}</span></div>
              </div>
              <div className="abi-data-card-footer">
                <button className="abi-card-act" onClick={() => handleExport(record)}>
                  <FileMarkdownOutlined style={{ marginRight: 3 }} />下载
                </button>
                <Dropdown
                  menu={{
                    items: [{ key: 'delete', danger: true, label: '删除' }],
                    onClick: ({ key, domEvent }) => {
                      domEvent.stopPropagation();
                      if (key === 'delete') handleDelete(record.logId);
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
          ))}
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
                    <DeferredRangePicker
                      allowClear
                      className="abi-field-input"
                      format="YYYY-MM-DD"
                      getPopupContainer={getFilterPopupContainer}
                      placeholder={['开始时间', '结束时间']}
                      value={dateRange}
                      onChange={(dates) => { setDateRange(dates); pag?.onChange?.(1, pageSizeVal); }}
                    />
                  </SearchFilterField>
                  <SearchFilterField label="任务状态">
                    <AForm.Item className="m-0" name="status">
                      <ASelect
                        allowClear
                        className="abi-field-input w-full"
                        getPopupContainer={getFilterPopupContainer}
                        options={jobOptions}
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
          <div
            className="assistant-table-scroll"
            style={{ overflow: 'auto', maxHeight: '100%' }}
          >
            <ATable
              scroll={pagedData?.length > 0 ? { x: 'max-content' } : undefined}
              size="middle"
              className="abi-std-table"
              {...(tableProps as any)}
              columns={filteredColumns as any}
              dataSource={pagedData}
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
            const current = currentPage;
            const totalVal = totalCount;
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
