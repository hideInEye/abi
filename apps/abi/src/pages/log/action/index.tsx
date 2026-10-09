import { LeftOutlined, RightOutlined } from '@ant-design/icons';

import { SearchFilterBar, SearchFilterField, getFilterPopupContainer } from '@/components/SearchFilterBar';
import { getOperLogListApi } from '@/service/api/log';

import { EMPTY_OPER_LOG_SEARCH_PARAMS, buildOperLogSearchParams } from './search-params';

// 若依业务类型字典
const BUSINESS_TYPE_MAP: Record<string, string> = {
  '0': '其它',
  '1': '新增',
  '2': '修改',
  '3': '删除',
  '4': '授权',
  '5': '导出',
  '6': '导入',
  '7': '强退',
  '8': '生成代码',
  '9': '清空数据'
};

export function Component() {
  // Inline search state
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchStatus, setSearchStatus] = useState<string | undefined>(undefined);
  const [searchTitle, setSearchTitle] = useState('');
  const [searchBusinessType, setSearchBusinessType] = useState<string | undefined>(undefined);
  const [searchOperIp, setSearchOperIp] = useState('');
  const [dateRange, setDateRange] = useState<any>(null);
  const [jumpValue, setJumpValue] = useState('');

  const statusOptions = [
    { label: '正常', value: '0' },
    { label: '异常', value: '1' }
  ];

  const businessTypeOptions = Object.entries(BUSINESS_TYPE_MAP).map(([value, label]) => ({ label, value }));

  const { data, searchParams, tableProps, updateSearchParams } = useTable({
    apiFn: getOperLogListApi as any,
    apiParams: {
      pageNum: 1,
      pageSize: 10,
      operName: '',
      title: '',
      businessType: '',
      operIp: '',
      status: '',
      'params[beginTime]': '',
      'params[endTime]': ''
    },
    columns: () =>
      [
        {
          align: 'center',
          dataIndex: 'title',
          ellipsis: true,
          key: 'title',
          render: (text: string) => (
            <ATooltip placement="topLeft" title={text}>
              <div
                style={{
                  maxWidth: 160,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {text}
              </div>
            </ATooltip>
          ),
          title: '系统模块',
          width: 200
        },
        {
          align: 'center',
          dataIndex: 'businessType',
          key: 'businessType',
          render: (val: unknown) => BUSINESS_TYPE_MAP[String(val)] ?? '-',
          title: '操作类型',
          minWidth: 100
        },
        {
          align: 'center',
          dataIndex: 'operName',
          key: 'operName',
          title: '操作人员',
          minWidth: 120
        },
        {
          align: 'center',
          dataIndex: 'operIp',
          key: 'operIp',
          title: '主机地址',
          minWidth: 140
        },
        {
          align: 'center',
          dataIndex: 'status',
          key: 'status',
          render: (_: unknown, record: any) => {
            // 后端 status 为数字 0/1，统一转字符串比较
            if (String(record.status) === '0') {
              return <span className="abi-status-tag status-normal">正常</span>;
            }
            return <span className="abi-status-tag status-disabled">异常</span>;
          },
          title: '操作状态',
          minWidth: 100
        },
        {
          align: 'center',
          dataIndex: 'operTime',
          key: 'operTime',
          title: '操作时间',
          minWidth: 160
        }
      ] as any,
    rowKey: 'operId'
  } as any);

  const handleSearch = () => {
    updateSearchParams(
      buildOperLogSearchParams({
        keyword: searchKeyword,
        title: searchTitle,
        businessType: searchBusinessType,
        operIp: searchOperIp,
        status: searchStatus,
        dateRange
      }) as any
    );
  };

  const handleReset = () => {
    setSearchKeyword('');
    setSearchStatus(undefined);
    setSearchTitle('');
    setSearchBusinessType(undefined);
    setSearchOperIp('');
    setDateRange(null);
    updateSearchParams(EMPTY_OPER_LOG_SEARCH_PARAMS as any);
  };

  // Pagination logic（服务端分页，total 取自接口返回）
  const pagination = tableProps.pagination as any;
  const currentPage = searchParams.current?.pageNum || searchParams.current?.page || 1;
  const pageSizeVal = searchParams.current?.pageSize || searchParams.current?.page_size || 10;
  const totalCount = (pagination?.total as number) || 0;
  const totalPages = Math.ceil(totalCount / pageSizeVal) || 1;

  const handlePageSizeChange = (value: number) => {
    pagination?.onChange?.(1, value);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      pagination?.onChange?.(page, pageSizeVal);
    }
  };

  const handlePrev = () => {
    if (currentPage > 1) handlePageChange(currentPage - 1);
  };
  const handleNext = () => {
    if (currentPage < totalPages) handlePageChange(currentPage + 1);
  };

  const handleJump = () => {
    const page = parseInt(jumpValue, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      handlePageChange(page);
      setJumpValue('');
    }
  };

  const renderPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 3) {
      for (let i = 1; i <= 4; i++) pages.push(i);
      pages.push('...', totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1, '...');
      for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1, '...');
      pages.push(currentPage - 1, currentPage, currentPage + 1);
      pages.push('...', totalPages);
    }
    return pages.map((page, idx) => {
      if (page === '...') return <span key={`ellipsis-${idx}`} className="page-item page-ellipsis">...</span>;
      const isActive = page === currentPage;
      return (
        <span key={page} className={`page-item ${isActive ? 'page-active' : ''}`} onClick={() => handlePageChange(page as number)}>
          {page}
        </span>
      );
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }} className="lt-sm:overflow-auto">
      {/* Searchbar */}
      <section className="abi-searchbar">
        <SearchFilterBar
          searchPlaceholder="系统模块 / 操作类型"
          searchValue={searchKeyword}
          onQuery={handleSearch}
          onReset={handleReset}
          onSearchChange={setSearchKeyword}
          filters={
            <>
              <SearchFilterField label="操作时间">
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
              <SearchFilterField label="操作类型">
                <ASelect
                  allowClear
                  getPopupContainer={getFilterPopupContainer}
                  options={businessTypeOptions}
                  placeholder="操作类型"
                  value={searchBusinessType}
                  onChange={(val) => setSearchBusinessType(val)}
                />
              </SearchFilterField>
              <SearchFilterField label="操作状态">
                <ASelect
                  allowClear
                  getPopupContainer={getFilterPopupContainer}
                  options={statusOptions}
                  placeholder="操作状态"
                  value={searchStatus}
                  onChange={(val) => setSearchStatus(val)}
                />
              </SearchFilterField>
              <SearchFilterField label="系统模块">
                <AInput
                  allowClear
                  className="abi-field-input w-full"
                  placeholder="模块名称"
                  value={searchTitle}
                  onChange={(e) => setSearchTitle(e.target.value)}
                />
              </SearchFilterField>
              <SearchFilterField label="主机地址">
                <AInput
                  allowClear
                  className="abi-field-input w-full"
                  placeholder="IP 地址"
                  value={searchOperIp}
                  onChange={(e) => setSearchOperIp(e.target.value)}
                />
              </SearchFilterField>
            </>
          }
        />
      </section>

      {/* Data Area */}
      <section className="abi-data-area">
        {/* Table + Pagination */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
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
                columns={tableProps.columns as any}
                dataSource={(data as any[]) || []}
                loading={tableProps.loading}
                pagination={false}
                rowKey="operId"
                size="middle"
                className="abi-std-table"
              />
            </div>
          </div>

          {/* Pagination */}
          <div className="data-source-pagination">
            <span className="total-text">共 {totalCount} 条</span>
            <div className="pagination-controls">
              <ASelect
                value={pageSizeVal}
                onChange={handlePageSizeChange}
                options={[
                  { label: '10条/页', value: 10 },
                  { label: '15条/页', value: 15 },
                  { label: '20条/页', value: 20 },
                  { label: '25条/页', value: 25 },
                  { label: '30条/页', value: 30 },
                ]}
                className="page-size-select"
              />
              <button className="page-btn" disabled={currentPage === 1} onClick={handlePrev}>
                <LeftOutlined />
              </button>
              {renderPageNumbers()}
              <button className="page-btn" disabled={currentPage === totalPages} onClick={handleNext}>
                <RightOutlined />
              </button>
              <span className="quick-jumper">
                前往
                <AInput
                  className="jump-input"
                  style={{ width: 48, textAlign: 'center' }}
                  value={jumpValue}
                  onChange={(e) => setJumpValue(e.target.value)}
                  onPressEnter={handleJump}
                />
                页
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
