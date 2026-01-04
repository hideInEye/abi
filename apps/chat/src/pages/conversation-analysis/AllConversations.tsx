import React, { useState, useEffect, useRef } from 'react';
import { Input, Table, Switch, Modal, message, Empty,Tooltip } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { fetchAppListPages, deleteApp, updateApp } from '../../service/api/app';
import dayjs from 'dayjs';
import SvgIcon from '../../components/SvgIcon';
import { fetchDatasourceById } from '../../service/api/app';
import CreateModal from './CreateModal';
import ShareModal from '../conversation/ShareModal';
import SaveDrawer from '../conversation/SaveDrawer';
import { fetchOperate } from '../../service/api/abi-system';
import { getSpaceId } from '../../utils';
import { fetchConvList } from '../../service/api/conv';
import { CHAT_MODE } from '../../constant';

interface Props {
  onClose: () => void;
  onSelectApp?: (app: any) => void;
  onUpdateList: (data: any) => void
}

const AllConversations: React.FC<Props> = ({ onClose, onSelectApp, onUpdateList }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [saveVisible, setSaveVisible] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<any>(null);
  const [isStarred, setIsStarred] = useState<Record<string, boolean>>({});
  const pageSize = 10;
  const tableWrapperRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);
  const [debouncedSearchText, setDebouncedSearchText] = useState('');

  useEffect(() => {
    const tableWrapper = tableWrapperRef.current;
    if (!tableWrapper) return;

    const resizeObserver = new ResizeObserver(() => {
      const wrapperHeight = tableWrapper.offsetHeight;
      const tableHeader = tableWrapper.querySelector('.ant-table-header');
      const tablePagination = tableWrapper.querySelector('.ant-pagination');
      
      const headerHeight = tableHeader?.clientHeight || 55; 
      const paginationHeight = tablePagination?.clientHeight || 64;
      const SAFE_OFFSET = 24; // 额外预留空间，避免分页显示不完整

      const calculatedHeight = wrapperHeight - headerHeight - paginationHeight - SAFE_OFFSET;
      
      if (calculatedHeight > 0) {
          setScrollY(calculatedHeight);
      }
    });

    resizeObserver.observe(tableWrapper);

    return () => {
      resizeObserver.disconnect();
    };
  }, [data]);

  const handleSetCurApp = async (item: any) => {
    const res: any = await fetchDatasourceById(item.agent_id);
    let dbName = '';
    let modelName = '';
    try {
      const data = res.data[0];
      modelName = data.name;
      const config = JSON.parse(data.config);
      dbName = config.dbName;
    } catch (error) {
      console.log(error);
    }
    onSelectApp?.({ ...item, dbName, modelName });
    onClose();
  };

  const getConvList = async () => {
    const userInfoString = localStorage.getItem('SOY-REACT_userInfo');
    const userInfo = JSON.parse(userInfoString || '{}');
    try {
      setLoading(true);
      const res = await fetchAppListPages({
        spaceId: getSpaceId(),
        page,
        pageSize,
        create_by: userInfo.userName,
        biz_name: debouncedSearchText.trim() || undefined
      });
      if (res.data) {
        setData(res.data.items.map((item: any) => ({
          ...item,
          key: item.chat_id,
          name_en: item.app_code || '-'
        })));
        setTotal(res.data.total_count);
      }
    } catch (error) {
      console.error('获取对话列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchText]);

  // 搜索文本变化时重置到第一页
  useEffect(() => {
    if (debouncedSearchText !== searchText) return;
    if (page !== 1) {
      setPage(1);
    } else {
      getConvList();
    }
  }, [debouncedSearchText]);

  useEffect(() => {
    getConvList();
  }, [page]);

  // 处理编辑
  const handleEdit = (record: any) => {
    setCurrentRecord(record);
    setCreateModalVisible(true);
  };

  // 处理收藏
  const handleStar = async (record: any) => {
    try {
      // 先根据 chat_id 查询对话列表，获取 conv_uid
      const convListRes = await fetchConvList({
        chat_id: record.chat_id,
        chat_mode: CHAT_MODE,
        space_id: getSpaceId()
      });
      
      // 如果没有对话，提示用户
      if (!convListRes.data || convListRes.data.length === 0) {
        message.warning('该应用暂无对话记录，无法收藏');
        return;
      }
      
      // 获取最新的对话的 conv_uid
      const latestConv = convListRes.data[0];
      const convUid = latestConv.conv_uid;
      
      console.log('查询到的 conv_uid:', convUid);
      const userInfoString = localStorage.getItem('SOY-REACT_userInfo');
      const userInfo = JSON.parse(userInfoString || '{}');
      const res: any = await fetchOperate({
        ...record,
        conv_uid: convUid,  // 使用查询到的 convUid
        type: 2,
        name: record.biz_name || 'AI智能助手',
        operator: userInfo.userName || '未知用户',
      })
      if (res.code !== 200) {
        message.error(res.msg || '收藏失败，请稍后再试');
        return;
      }
      setIsStarred(prev => ({
        ...prev,
        [record.chat_id]: !prev[record.chat_id]
      }));
      message.success(!isStarred[record.chat_id] ? '已收藏' : '已取消收藏');
    } catch (error) {
      console.error('收藏失败:', error);
      message.error('收藏操作失败，请稍后再试');
    }
  };

  // 处理分享
  const handleShare = (record: any) => {
    setCurrentRecord(record);
    setShareModalVisible(true);
  };

  // 处理保存
  const handleSave = (record: any) => {
    setCurrentRecord(record);
    setSaveVisible(true);
  };

  // 处理删除
  const handleDelete = (record: any) => {
    Modal.confirm({
      title: '确认删除对话',
      content: '是否确认删除当前对话？删除后无法恢复。',
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          setLoading(true);
          await deleteApp(record);
          message.success('删除对话成功');
          getConvList();
        } catch (error) {
          message.error('删除对话失败');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // 处理创建/编辑对话完成
  const handleCreateFinish = async (val?: any) => {
    setCreateModalVisible(false);
    if (val) {
      try {
        // 调用更新API
        const res = await updateApp(val);
        if (res?.success) {
          // 立即更新本地列表数据
          setData(prev => prev.map(item => 
            item.chat_id === res.data.chat_id ? { ...item, ...res.data } : item
          ));
          // 通知父组件更新左侧列表
          onUpdateList && onUpdateList(res?.data);
        }
      } catch (error) {
        console.error('更新对话失败:', error);
      }
    }
  };

  const columns = [
    {
      title: '对话名称',
      dataIndex: 'biz_name',
      key: 'biz_name',
      render: (text: string, record: any) => (
        <span 
          className="cursor-pointer hover:text-[#2E6CF6]"
          onClick={() => handleSetCurApp(record)}
        >
          {text || '-'}
        </span>
      )
    },
    // {
    //   title: '英文名',
    //   dataIndex: 'name_en',
    //   key: 'name_en',
    //   width: '20%',
    // },
    // {
    //   title: '状态',
    //   dataIndex: 'status',
    //   key: 'status',
    //   render: (_: any, record: any) => (
    //     <Switch checked={record.status === '1'} disabled />
    //   )
    // },
    {
      title: '创建人',
      dataIndex: 'create_by',
      key: 'create_by',
      render: (text: string) => text || '-'
    },
    {
      title: '创建时间',
      dataIndex: 'create_time',
      key: 'create_time',
      render: (text: string) => text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '-'
    },
    // {
    //   title: '分享链接',
    //   dataIndex: 'share_link',
    //   key: 'share_link',
    //   render: (text: string) => text || '-'
    // },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: any) => (
        <div className="flex items-center gap-4">
          <Tooltip title="编辑对话">
            <span className="flex-shrink-0 w-[20px] h-[20px] flex items-center justify-center">
              <SvgIcon 
                localIcon="edit" 
                className="text-[#2E6CF6] hover:text-[#2E6CF6]/80 cursor-pointer"
                style={{ fontSize: '20px' }}
                onClick={() => handleEdit(record)}
              />
            </span>
          </Tooltip>
          {/* 收藏功能暂时屏蔽 */}
          {/* <span className="flex-shrink-0 w-[20px] h-[20px] flex items-center justify-center">
            <SvgIcon 
              localIcon={isStarred[record.chat_id] ? "star-fill" : "star"}
              className="text-[#2E6CF6] hover:text-[#2E6CF6]/80 cursor-pointer"
              style={{ fontSize: '20px' }}
              onClick={() => handleStar(record)}
            />
          </span> */}
          {/* <span className="flex-shrink-0 w-[20px] h-[20px] flex items-center justify-center">
            <SvgIcon 
              localIcon="share-blue" 
              className="text-[#2E6CF6] hover:text-[#2E6CF6]/80 cursor-pointer"
              style={{ fontSize: '20px' }}
              onClick={() => handleShare(record)}
            />
          </span> */}
          {/* 隐藏复制对话按钮 */}
          <Tooltip title="复制对话">
            <span className="flex-shrink-0 w-[20px] h-[20px] flex items-center justify-center">
              <SvgIcon 
                localIcon="save" 
                className="text-[#2E6CF6] hover:text-[#2E6CF6]/80 cursor-pointer"
                style={{ fontSize: '20px' }}
                onClick={() => handleSave(record)}
              />
            </span>
          </Tooltip>
          <Tooltip title="删除对话">
            <span className="flex-shrink-0 w-[20px] h-[20px] flex items-center justify-center">
              <SvgIcon 
                localIcon="delete" 
                className="text-[#2E6CF6] hover:text-[#2E6CF6]/80 cursor-pointer"
                style={{ fontSize: '20px' }}
                onClick={() => handleDelete(record)}
              />
            </span>
          </Tooltip>
        </div>
      )
    }
  ];

  const saveDrawerClose = (refresh?: boolean) => {
    if (refresh) {
      onUpdateList && onUpdateList({});
      getConvList();
    }
    setSaveVisible(false)
  }

  return (
    <div className="min-w-[400px] flex-1 flex flex-col h-full">
      <header className="flex items-center justify-between border-b-2 border-[#3470f6] bg-[#e8eefb] p-2 sticky top-0 z-10">
        <span>全部对话</span>
        <span className="cursor-pointer" onClick={onClose}>
          <SvgIcon localIcon="close" className="w-5 h-5" />
        </span>
      </header>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4">
          <div className="mb-4">
            <Input
              placeholder="请输入内容"
              prefix={<SearchOutlined />}
              onChange={e => setSearchText(e.target.value)}
              allowClear
            />
          </div>
        </div>

        <div className="flex-1 overflow-hidden px-4 pb-4" ref={tableWrapperRef}>
          <Table
            columns={columns}
            dataSource={data}
            loading={loading}
            pagination={{
              current: page,
              pageSize,
              total,
              onChange: setPage,
              showSizeChanger: false
            }}
            scroll={{ y: scrollY }}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据"></Empty> }}
          />
        </div>
      </div>

      {/* 添加模态框和抽屉组件 */}
      <CreateModal
        visible={createModalVisible}
        onClose={handleCreateFinish}
        isEdit={true}
        initialValues={currentRecord}
      />
      <ShareModal 
        open={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
      />
      <SaveDrawer 
        open={saveVisible}
        onClose={(refresh?: boolean) => saveDrawerClose(refresh)}
        conv={currentRecord}
      />
    </div>
  );
};

export default AllConversations;
