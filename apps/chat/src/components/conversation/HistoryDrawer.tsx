import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Drawer, Table, Input, Pagination, message, Collapse } from 'antd';
import type { AlignType } from 'rc-table/lib/interface';
import { CloseOutlined, SearchOutlined } from '@ant-design/icons';
import { searchConv, historyConv, historyConvPages } from '../../service/api/conv';
import debounce from 'lodash/debounce';

interface Props {
  open: boolean;
  onClose: () => void;
  currentConv: any; // 当前对话信息
  onHistoryClick: (index: number) => void;
}

interface HistoryItem {
  type: string;
  description: string;
  createTime: string;
  key: string;
  orderIndex: number;
}

const { Panel } = Collapse;

const HistoryDrawer: React.FC<Props> = ({ open, onClose, currentConv, onHistoryClick }) => {
  const [searchText, setSearchText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [todayHistory, setTodayHistory] = useState<HistoryItem[]>([]);
  const [monthHistory, setMonthHistory] = useState<HistoryItem[]>([]);
  const [earlierHistory, setEarlierHistory] = useState<HistoryItem[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [searchResults, setSearchResults] = useState<HistoryItem[]>([]);
  const [searchHasMore, setSearchHasMore] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 防抖处理搜索
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setSearchText(value);
      setCurrentPage(1); // 重置搜索页码
      setSearchHasMore(true); // 重置搜索加载状态
    }, 500),
    []
  );

  // 获取历史记录
  const getHistory = async () => {
    if (!currentConv?.conv_uid) return;
    
    try {
      setLoading(true);
      // 获取今天的历史记录
      const todayRes = await historyConv({ 
        conv_uid: currentConv.conv_uid,
        query: { time_mode: 'today' }
      });
      
      // 获取本月的历史记录
      const monthRes = await historyConv({ 
        conv_uid: currentConv.conv_uid,
        query: { time_mode: 'month' }
      });

      if (todayRes.data) {
        setTodayHistory(todayRes.data.map((item: any) => ({
          type: item.role || '未知类型',
          description: item.context || '',
          createTime: item.time_stamp ? new Date(item.time_stamp).toLocaleDateString() : '',
          key: item.id || '',
          orderIndex: item.order_index
        })));
      }

      if (monthRes.data) {
        setMonthHistory(monthRes.data.map((item: any) => ({
          type: item.role || '未知类型',
          description: item.context || '',
          createTime: item.time_stamp ? new Date(item.time_stamp).toLocaleDateString() : '',
          key: item.id || '',
          orderIndex: item.order_index
        })));
      }
      // 获取更早的历史记录
      await loadMoreHistory();
    } catch (error) {
      message.error('获取历史记录失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载更多历史记录
  const loadMoreHistory = async () => {
    if (!currentConv?.conv_uid || !hasMore) return;

    try {
      setLoading(true);
      const res = await historyConvPages({
        conv_uid: currentConv.conv_uid,
        page,
        pageSize
      });
      if (res?.data?.items?.length > 0) {
        const newHistory = res.data.items.map((item: any) => ({
          type: item.role || '未知类型',
          description: item.context || '',
          createTime: item.create_time || '',
          key: item.id || '',
          orderIndex: item.order_index
        }));

        setEarlierHistory(prev => [...prev, ...newHistory]);

        // 根据接口返回的total_pages和当前页判断是否还有更多
        const totalPages = res.data.total_pages || 1;
        setHasMore(page < totalPages);
        setPage(prev => prev + 1);
      }
    } catch (error) {
      console.error('加载更多历史记录失败:', error);
      message.error('加载更多历史记录失败');
    } finally {
      setLoading(false);
    }
  };

  // 搜索对话
  const searchHistory = async (isLoadMore = false) => {
    if (!currentConv?.conv_uid || (!isLoadMore && !searchText)) return;
    
    try {
      setSearchLoading(true);
      const targetPage = isLoadMore ? currentPage + 1 : 1;
      const res = await searchConv({
        conv_uid: currentConv.conv_uid,
        key: searchText,
        page: targetPage,
        pageSize: pageSize,
        role: 'human'
      });
  
      if (res?.data?.items?.length > 0) {
        const results = res.data.items.map((item: any) => ({
          type: item.role || '未知类型',
          description: item.context || '',
          createTime: item.time_stamp ? new Date(item.time_stamp).toLocaleDateString() : '',
          key: item.id || '',
          orderIndex: item.order_index
        }));
        
        setSearchResults(prev => 
          isLoadMore ? [...prev, ...results] : results
        );
        
        // 基于实际返回数据判断是否还有更多
        const hasMoreData = res.data.items.length >= pageSize;
        setSearchHasMore(hasMoreData);
        if (isLoadMore) {
          setCurrentPage(prev => prev + 1);
        } else {
          setCurrentPage(1);
        }
      } else {
        setSearchResults([]);
        setSearchHasMore(false);
      }
    } catch (error) {
      message.error('搜索失败');
    } finally {
      setSearchLoading(false);
    }
  };

  // 防抖处理滚动事件
  const handleScroll = useCallback(
    debounce(() => {
      if (!scrollContainerRef.current || 
        searchLoading || 
        !searchHasMore || 
        !searchText
      ) return;
      
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      const scrollThreshold = 200;
      
      if (scrollTop + clientHeight >= scrollHeight - scrollThreshold) {
        searchHistory(true);
      }
    }, 300),
    [searchLoading, searchHasMore, searchText]
  );

  // 监听搜索条件变化
  useEffect(() => {
    if (open) {
      if (searchText) {
        searchHistory();
      } else {
        setSearchResults([]);
        getHistory();
      }
    } else {
      // 关闭时重置状态
      setSearchResults([]);
      setEarlierHistory([]);
      setPage(1);
      setHasMore(true);
      setCurrentPage(1);
      setSearchHasMore(true);
    }
  }, [open, searchText]);

  // 设置滚动监听
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
    }
    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [handleScroll]);

  const columns = [
    {
      title: '内容',
      dataIndex: 'description',
      key: 'description',
      align: 'left' as AlignType,
      width: '70%',
      ellipsis: true,
      render: (text: string, record: HistoryItem) => (
        <span
          onClick={() => {
            onHistoryClick && onHistoryClick(record.orderIndex);
          }}
          style={{ cursor: 'pointer', color: '#165DFF' }}
        >
          {text}
        </span>
      ),
    },
    {
      title: '时间',
      dataIndex: 'createTime',
      key: 'createTime',
      align: 'right' as AlignType,
      width: '30%'
    }
  ];

  return (
    <Drawer
      title={
        <div className="flex justify-between items-center">
          <span className="text-lg font-medium">历史对话</span>
          <CloseOutlined 
            className="cursor-pointer hover:opacity-70" 
            onClick={onClose}
          />
        </div>
      }
      placement="right"
      onClose={onClose}
      open={open}
      width={500}
      closable={false}
      styles={{
        body: {
          padding: '0',
          display: 'flex',
          flexDirection: 'column',
          height: '100%'
        },
        header: {
          padding: '16px 24px',
          borderBottom: '1px solid #f0f0f0'
        }
      }}
    >
      <div className="px-6 py-4 border-b border-[#f0f0f0] bg-white sticky top-0 z-10">
        <Input
          placeholder="搜索历史记录"
          prefix={<SearchOutlined />}
          defaultValue={searchText}
          onChange={e => debouncedSearch(e.target.value)}
          allowClear
        />
      </div>
      
      <div ref={scrollContainerRef} className="px-6 flex-1 overflow-auto">
        <Collapse defaultActiveKey={['today', 'month', 'earlier', 'search']} ghost>
          {searchText && (
            <Panel header="搜索结果" key="search">
              <Table
                columns={columns}
                dataSource={searchResults}
                pagination={false}
                loading={searchLoading}
                className="history-table"
                showHeader={false}
                size="small"
                locale={{
                  emptyText: '暂无数据'
                }}
                rowKey="question_id"
              />
              {searchResults.length > 0 && (
                <div className="text-center py-4">
                  {searchLoading ? (
                    <span>加载中...</span>
                  ) : searchHasMore ? (
                    <span>滑动加载更多</span>
                  ) : (
                    <span className="text-gray-500">没有更多数据</span>
                  )}
                </div>
              )}
            </Panel>
          )}

          {!searchText && (
            <>
              {todayHistory.length > 0 && (
                <Panel header="今天" key="today">
                  <Table
                    columns={columns}
                    dataSource={todayHistory}
                    pagination={false}
                    loading={loading}
                    className="history-table"
                    showHeader={false}
                    size="small"
                    rowKey="question_id"
                  />
                </Panel>
              )}
              
              {monthHistory.length > 0 && (
                <Panel header="本月" key="month">
                  <Table
                    columns={columns}
                    dataSource={monthHistory}
                    pagination={false}
                    loading={loading}
                    className="history-table"
                    showHeader={false}
                    size="small"
                    rowKey="question_id"
                  />
                </Panel>
              )}

              {earlierHistory.length > 0 && (
                <Panel header="更早" key="earlier">
                  <Table
                    columns={columns}
                    dataSource={earlierHistory}
                    pagination={false}
                    loading={loading}
                    className="history-table"
                    showHeader={false}
                    size="small"
                    rowKey="question_id"
                  />
                  {hasMore ? (
                    <div className="text-center mt-4">
                      <button
                        className="text-[#2E6CF6] hover:opacity-80"
                        onClick={loadMoreHistory}
                        disabled={loading}
                      >
                        {loading ? '加载中...' : '加载更多'}
                      </button>
                    </div>
                  ) : (
                    <div className="text-center mt-4 text-gray-500">
                      没有更多数据
                    </div>
                  )}
                </Panel>
              )}
            </>
          )}
          
          {!loading && !searchLoading && (
            (!searchText && monthHistory.length === 0 && todayHistory.length === 0 && earlierHistory.length === 0)
          ) && (
            <div className="text-center text-gray-500 py-8">
              暂无历史记录
            </div>
          )}
        </Collapse>
      </div>
    </Drawer>
  );
};

export default HistoryDrawer;
