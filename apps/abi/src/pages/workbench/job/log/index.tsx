import { DeleteOutlined, FileSearchOutlined, LeftOutlined, RightOutlined, SearchOutlined } from '@ant-design/icons';
// import PageTitle from '@/components/stateless/common/PageTitle';
import { message } from 'antd';

import { JOB_GROUP_OPTIONS } from '@/constants/job';
import { cleanJobLog, deleteJobLog, exportJobLog, fetchJobDetail, fetchJobLogList } from '@/service/api/job';
import { useRoute } from '~/packages/simple-router/src';
import { useAppSelector } from '@/hooks/business/useStore';
import { getSpaceId } from '@/store/slice/app';

import JobLogDetailDrawer from './modules/job-log-detail-drawer';
import KeySearch from './modules/key-search';

export function Component() {
  const { t } = useTranslation();
  const route = useRoute();
  const spaceId = useAppSelector(getSpaceId);
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
      spaceId, // 空间id
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
          fixed: 'right',
          key: 'operate',
          render: (_: unknown, record: any) => (
            <div className="flex items-center justify-center" style={{ gap: 2 }}>
              {record?.status === '0' && (
                <AButton className="abi-action-link" size="small" variant="link" onClick={() => handleView(record)}>
                  查看报告
                </AButton>
              )}
              {record?.status === '1' && (
                <AButton className="abi-action-link" size="small" variant="link" onClick={() => handleViewError(record)}>
                  查看错误
                </AButton>
              )}
            </div>
          ),
          title: t('common.operate'),
        },
      ] as any,
    immediate: false,
    rowKey: 'jobLogId',
  } as any);

  const { checkedRowKeys, onBatchDeleted, onDeleted, rowSelection } = useTableOperate(data as any, run, async () => {}, true);

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      {/* v5 Searchbar */}
      <section className="abi-searchbar">
        <AForm form={searchProps.form} layout="inline" style={{ display: 'contents' }}>
          <div className="abi-search-row">
            <KeySearch {...searchProps} />
            <AButton type="primary" className="btn-accent-gradient" onClick={() => searchProps.search()}>
              <SearchOutlined /> 查询
            </AButton>
            <AButton className="btn-ghost-v5" onClick={() => searchProps.reset()}>
              重置
            </AButton>
          </div>
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
              <AButton
                className="btn-ghost-v5"
                disabled={checkedRowKeys.length === 0}
              >
                批量删除
              </AButton>
            </APopconfirm>
          </div>
        </div>

        {/* Content */}
        <div
          ref={tableWrapperRef}
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
                scroll={tableProps.dataSource?.length > 0 ? { x: 'max-content', ...scrollConfig } : undefined}
                size="middle"
                className="abi-std-table"
                {...(tableProps as any)}
                pagination={false}
                rowSelection={rowSelection}
              />
            </div>
          </div>

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
