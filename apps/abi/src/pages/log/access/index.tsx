import { LeftOutlined, RightOutlined } from '@ant-design/icons';

import { SearchFilterBar, SearchFilterField, getFilterPopupContainer } from '@/components/SearchFilterBar';
import { getLoginInforListApi } from '@/service/api/log';

export function Component() {
  // Inline search state
  const [searchUserName, setSearchUserName] = useState('');
  const [searchStatus, setSearchStatus] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<any>(null);
  const [jumpValue, setJumpValue] = useState('');

  const statusOptions = [
    { label: '成功', value: '0' },
    { label: '失败', value: '1' }
  ];

  // 若依时间范围查询走 params[beginTime]/params[endTime]
  const timeParams = (range: any) => ({
    'params[beginTime]': range?.[0] ? `${range[0].format('YYYY-MM-DD')} 00:00:00` : '',
    'params[endTime]': range?.[1] ? `${range[1].format('YYYY-MM-DD')} 23:59:59` : ''
  });

  const { data, searchParams, tableProps, updateSearchParams } = useTable({
    apiFn: getLoginInforListApi as any,
    apiParams: {
      pageNum: 1,
      pageSize: 10,
      userName: '',
      status: '',
      'params[beginTime]': '',
      'params[endTime]': ''
    },
    columns: () =>
      [
        {
          align: 'center',
          dataIndex: 'userName',
          key: 'userName',
          title: '用户名称',
          minWidth: 120
        },
        {
          align: 'center',
          dataIndex: 'ipaddr',
          key: 'ipaddr',
          title: '登录地址',
          minWidth: 140
        },
        {
          align: 'center',
          dataIndex: 'status',
          key: 'status',
          render: (_: unknown, record: any) => {
            // 后端 status 可能为数字 0/1，统一转字符串比较
            if (String(record.status) === '0') {
              return <span className="abi-status-tag status-normal">成功</span>;
            }
            return <span className="abi-status-tag status-disabled">失败</span>;
          },
          title: '登录状态',
          minWidth: 100
        },
        {
          align: 'center',
          dataIndex: 'msg',
          key: 'msg',
          title: '消息',
          minWidth: 140
        },
        {
          align: 'center',
          dataIndex: 'accessTime',
          key: 'accessTime',
          title: '访问时间',
          minWidth: 160
        }
      ] as any,
    rowKey: 'infoId'
  } as any);

  const handleSearch = () => {
    updateSearchParams({
      pageNum: 1,
      userName: searchUserName.trim() || '',
      status: searchStatus ?? '',
      ...timeParams(dateRange)
    } as any);
  };

  const handleReset = () => {
    setSearchUserName('');
    setSearchStatus(undefined);
    setDateRange(null);
    updateSearchParams({
      pageNum: 1,
      userName: '',
      status: '',
      'params[beginTime]': '',
      'params[endTime]': ''
    } as any);
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
          searchPlaceholder="用户名称"
          searchValue={searchUserName}
          onQuery={handleSearch}
          onReset={handleReset}
          onSearchChange={setSearchUserName}
          filters={
            <>
              <SearchFilterField label="访问时间">
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
              <SearchFilterField label="登录状态">
                <ASelect
                  allowClear
                  getPopupContainer={getFilterPopupContainer}
                  options={statusOptions}
                  placeholder="登录状态"
                  value={searchStatus}
                  onChange={(val) => setSearchStatus(val)}
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
                rowKey="infoId"
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
