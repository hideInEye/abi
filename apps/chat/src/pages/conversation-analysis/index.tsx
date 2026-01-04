import { Button, Modal, Spin } from "antd"
import React, { useEffect, useCallback, useRef } from "react"
import { useState } from "react"
import dayjs from 'dayjs';
import {
  deleteConv,
  fetchConvList,
  newConv
} from '../../service/api/conv'
import CreateModal from "./CreateModal";
import { createApp, deleteApp, fetchAppList, fetchDatasourceById } from "../../service/api/app";
import { CHAT_MODE } from "../../constant";
import Conversation from "../conversation";
import AllConversations from "./AllConversations";
import SvgIcon from "../../components/SvgIcon";
import CloseOutlined from "@ant-design/icons/CloseOutlined";
import DoubleLeftOutlined from "@ant-design/icons/DoubleLeftOutlined";
import DoubleRightOutlined from "@ant-design/icons/DoubleRightOutlined";
import { message } from "antd";
import { getSpaceId } from "../../utils";
// redux hooks已注释
// import { useAppDispatch, useAppSelector } from '../../store/redux/hooks';
// import { setConvListForChat, upsertConvForChat, removeConvForChat, clearConvListForChat, selectConvListByChatId, setDatasourceCache, selectDatasourceCache } from '../../store/redux/slices/conversations';

const ConversationAnalysis: React.FC = () => {
  const [fold, setFold] = useState(false);
  const [visible, setVisible] = useState(false);
  const [curApp, setCurApp] = useState<any>({});
  const [appList, setAppList] = useState<any[]>([]);
  const [curConv, setCurConv] = useState<any>();
  const [convList, setConvList] = useState<any[]>([]);
  const [showAllConversations, setShowAllConversations] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hideRight, setHideRight] = useState(false);
  const isInitializedRef = useRef(false);
  const skipNextConvFetchRef = useRef(false);
  // redux hooks已注释
  // const dispatch = useAppDispatch();
  // const cachedConvList = useAppSelector(state => curApp.chat_id ? selectConvListByChatId(state as any, curApp.chat_id) : []);
  // const datasourceCache = useAppSelector(state => selectDatasourceCache(state as any)); // <-- 将 useSelector 移到这里

  // 按 create_time 排序
  const sortAppList = (list: any[]) => {
    return list.sort((a, b) => {
      return new Date(b.create_time).getTime() - new Date(a.create_time).getTime();
    });
  };

  // 获取app列表
  const getAppList = useCallback(async () => {
     const userInfoString = JSON.parse(localStorage.getItem('SOY-REACT_userInfo')!||"");
    console.log(userInfoString);
    
     
    try {
      setLoading(true);
      const res = await fetchAppList({
        chat_mode: CHAT_MODE,
        space_id: getSpaceId(),
        create_by: userInfoString?.userName
        // space_id: 73 //测试对话
      });
      const data = sortAppList(res.data) ||[]
      setAppList(data);
      const chatId = localStorage.getItem('chatId')
      
      if(chatId) {
        
        const item = data.find(item=>item.chat_id ==chatId)
        if(Object.keys(item).length>0) {
          handleSetCurApp(item)
        }
      }
      return res.data;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 防止StrictMode导致的重复调用
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      getAppList();
    }
  }, []);

  // 新建会话
  // const createConv = async () => {
  //   try {
  //     setLoading(true);
  //     const res = await newConv(curApp);
  //     setConvList(state => {
  //       return [res.data, ...state];
  //     });
  //     setCurConv({ ...res.data, ...curApp });
  //     // redux已注释
  //     // if (curApp?.chat_id) {
  //     //   dispatch(upsertConvForChat({ chatId: curApp.chat_id, conv: res.data, toTop: true }));
  //     // }
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // 获取会话列表
  const getConvList = async () => {
    try {
      setLoading(true);
      // redux缓存已注释，直接请求接口
      // if (cachedConvList && cachedConvList.length > 0) {
      //   setConvList(cachedConvList);
      //   setCurConv({ ...cachedConvList[0], ...curApp });
      //   return; // 从缓存中加载，直接返回
      // }
      const res = await fetchConvList({
        chat_id: curApp.chat_id,
        chat_mode: CHAT_MODE,
        space_id: getSpaceId(),
        // space_id: 73,
      });
      if (res.data?.length) {
        setConvList(res.data);
        setCurConv({ ...res.data[0], ...curApp });
        // redux已注释
        // if (curApp?.chat_id) {
        //   dispatch(setConvListForChat({ chatId: curApp.chat_id, convList: res.data }));
        // }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 如果有选中的app就获取会话列表
    if (curApp.chat_id) {
      if (skipNextConvFetchRef.current) {
        skipNextConvFetchRef.current = false;
      } else {
        getConvList();
      }
    }
  }, [curApp]);

  const handleSetCurApp = async (item: any) => { // 移除datasourceCache参数
    try {
      // redux已注释
      // if (curApp?.chat_id && convList?.length) {
      //   dispatch(setConvListForChat({ chatId: curApp.chat_id, convList }));
      // }
      setLoading(true);
      // redux已注释
      // if (datasourceData) {
      //   dispatch(setDatasourceCache({ agentId: agentId, data: datasourceData }));
      // }
      
     
      setCurApp({ ...item });
    } finally {
      setLoading(false);
      setShowAllConversations(false);
      setHideRight(false);
    }
  };

  const onClose = async (val?: any) => {
    if (val) {
      try {
        setLoading(true);
        // console.log(val,'创建接口 - push')
        // console.log( JSON.parse(val.chat_config) ,'--------- config')
        
        // 1. 创建应用
        const res = await createApp(val);
        // console.log(val,'创建接口- data')
        
        // 2. 刷新应用列表
        await getAppList();
            
        const currentApp = { ...res.data };
        setCurApp(currentApp);
        
        // 4. 创建新会话
        const newConvRes = await newConv(currentApp);
        
        // 5. 获取会话列表
        // await getConvList();
        
        // 6. 设置当前会话
        setCurConv({ ...newConvRes.data, ...currentApp });
        
        setShowAllConversations(false);
        setHideRight(false);
        setVisible(false);
        return Promise.resolve();
      } catch(e) {
        message.error('创建失败');
        return Promise.reject();
      } finally {
        setLoading(false);
      }
    } else {
      setVisible(false);
      return Promise.resolve();
    }
  };

  const handleDeleteApp = async (item: any) => {
    Modal.confirm({
      title: '确认删除对话',
      content: '是否确认删除当前对话？删除后无法恢复。',
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          setLoading(true);
          const res = await fetchConvList({
            chat_id: item.chat_id,
            chat_mode: CHAT_MODE,
            space_id: getSpaceId(),
          });
          if (res.data?.length) {
            await Promise.all(res.data.map((conv: any) => deleteConv({ conv_uid: conv.conv_uid })));
          }
          if (curApp.chat_id === item.chat_id) {
            setCurConv(undefined);
          }
          getAppList();
        } catch (error) {
          message.error('删除对话失败');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleDeleteConv = async (conv_uid: string) => {
    try {
      setLoading(true);
      await deleteConv({ conv_uid });
      // redux已注释
      // if (curApp?.chat_id) {
      //   dispatch(removeConvForChat({ chatId: curApp.chat_id, convUid: conv_uid }));
      // }
      getConvList();
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateList = (data: any) => {
    const newApp = data?.newApp;
    const newConv = data?.newConv;
    if (newApp) {
      setAppList(prev => [newApp, ...prev.filter(a => a.chat_id !== newApp.chat_id)]);
      skipNextConvFetchRef.current = true;
      setCurApp(newApp);
      if (newConv) {
        setConvList([newConv]);
        setCurConv({ ...newConv, ...newApp });
      }
      setShowAllConversations(false);
      setHideRight(false);
      return;
    }
    if (data) {
      // 更新curConv
      if (data.conv_uid) {
        setCurConv((prev: any) => ({ ...prev, ...data }));
      }
      // 同步更新appList和curApp（编辑对话名称等信息）
      if (data.chat_id) {
        setAppList(prev => prev.map(app => 
          app.chat_id === data.chat_id ? { ...app, ...data } : app
        ));
        if (curApp.chat_id === data.chat_id) {
          setCurApp((prev: any) => ({ ...prev, ...data }));
        }
      }
    }
  }

  return (
    <Spin spinning={loading} wrapperClassName="h-full">
      <div className="h-full w-full flex bg-white">
        <div className={`relative flex flex-col px-2 py-4 border-r h-full overflow-hidden transition-all duration-300 ease-in-out ${fold ? 'w-[30px]' : 'w-[200px]'}`}>
          <header className="mb-2 w-full flex items-center">
            {!fold && (
              <Button
                className="ml-[20px]"
                type="primary"
                onClick={() => setVisible(true)}
              >
                +&nbsp;&nbsp;新建对话
              </Button>
            )}
          </header>
          <span
            className="absolute right-1 top-1/2 -translate-y-1/2 z-10 text-[#2E6CF6] cursor-pointer select-none"
            onClick={() => setFold(!fold)}
            title={fold ? '展开菜单' : '收起菜单'}
          >
            {fold ? <DoubleRightOutlined /> : <DoubleLeftOutlined />}
          </span>
          <ul
            className={`flex-1 text-black overflow-y-auto transition-opacity duration-300 ease-in-out ${fold ? 'opacity-0' : 'opacity-100'}`}
            style={{display: fold ? 'none' : 'block', transitionDelay: fold ? '0ms' : '150ms'}}
          >
            {appList.map(item => (
              <li
                className={`group flex items-center justify-between py-4 hover:bg-[#e8eefb] rounded px-2 cursor-pointer leading-[17px] ${curApp.chat_id === item.chat_id ? 'bg-[#e8eefb]' : ''}`}
                key={item.chat_id}
                onClick={() => handleSetCurApp(item)} // 移除datasourceCache参数
              >
                <div>
                  <span>{item.biz_name}</span>
                  <br />
                  <sub>{item.create_time ? dayjs(item.create_time).format('YYYY-MM-DD HH:mm:ss') : '-'}</sub>
                </div>
                <span
                  className="invisible px-2 text-[12px] group-hover:visible"
                  onClick={e => {
                    e.stopPropagation();
                    handleDeleteApp(item);
                  }}
                >
                  <CloseOutlined />
                </span>
              </li>
            ))}
          </ul>
          <div className={`mt-auto pt-2 transition-opacity duration-300 ease-in-out ${fold ? 'opacity-0' : 'opacity-100'}`}
            style={{display: fold ? 'none' : 'block', transitionDelay: fold ? '0ms' : '150ms'}}
          >
            <div
              className="block text-[#2E6CF6] hover:text-[#2E6CF6]/80 text-sm cursor-pointer text-center"
              onClick={() => {
                setHideRight(false);
                setShowAllConversations(true);
              }}
            >
              查看全部对话 {'>>'} 
            </div>
          </div>
        </div>
        {!hideRight && curConv && !showAllConversations && (
          <Conversation
            conv={curConv}
            onClose={() => setCurConv(undefined)}
            onUpdateList={handleUpdateList}
          />
        )}
        {!hideRight && showAllConversations && (
          <AllConversations 
            onClose={() => setShowAllConversations(false)} 
            onSelectApp={(item) => handleSetCurApp(item)}
            onUpdateList={handleUpdateList}
          />
        )}
      </div>
      <CreateModal
        visible={visible}
        onClose={onClose}
      />
    </Spin>
  );
};

export default ConversationAnalysis;