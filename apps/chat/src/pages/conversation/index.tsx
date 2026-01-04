/**
 * 对话页面主组件
 * 实现与AI助手的对话功能，包括：
 * - 消息展示
 * - 消息发送
 * - 实时响应处理
 */

import {
  EventStreamContentType,
  fetchEventSource,
} from '@microsoft/fetch-event-source';
import { Modal, message, Button, Form } from 'antd';
import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import FileTag from '../../components/FileTag';
import { fetchOperate, fetchShareEmail } from '../../service/api/abi-system';
import {
  fetchConvHistory,
  fetchConvHistoryRound,
  // fetchConvIncrement, // 已注释 - zustand缓存逻辑已禁用
  fetchConvMaxRound,
  fetchDimension,
  fetchExceptionGuidance,
  fetchQueryRewrite,
  fetchRecommendQuestion,
  fetchRecommendedQuestionOpenings,
} from '../../service/api/conv';
import { useDebugStore } from '../../store';
import { getHumanInHistoryByOrderIndex, getOpeningText } from '../../utils';
import AiEle from './AiEle';
import HumanEle from './HumanEle';
import ModelDebugModal from './ModelDebugModal';
import OpeningsEle from './OpeningsEle';
// 不能删除
// import ShareModal from './ShareModal';
import _ from 'lodash';
import { chatHeaderRefMethod } from '../../types';
import CheckboxWrapCom from './CheckboxWrapCom';
import ChatHeader from './components/chat-header';
import ChatInput from './components/chat-input';
import SharingModal from './SharingModal';
import { useScreenshot } from './useScreenShot';
import ViewEle from './ViewEle';
import { fetchDatasourceById } from '../../service/api/app';
import ShareEmailSetting from './components/share-email-setting';
import dayjs from 'dayjs';
// 环境变量
const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
};

/**
 * 组件属性类型定义
 */
interface PropsType {
  conv: any; // 对话配置信息
  onClose: () => void; // 关闭回调函数
  onUpdateList: (data: any) => void;
}

/**
 * 对话组件
 * 使用React.memo优化性能
 */
const Conversation: React.FC<PropsType> = React.memo(
  ({ conv, onClose, onUpdateList }) => {
    // 数据库名称
    // const agentData = useRef<any>(null);
    const [confirmShareType, setConfirmShareType] = useState('');
    const [shareEmailForm] = Form.useForm();
    const [shareStep, setShareStep] = useState(1);
    const [isStorage, setIsStorage] = useState(false);
    const [loading, setLoading] = useState(false);
    const [convContent, setConvContent] = useState<any[]>([]);
    const [currentMessage, setCurrentMessage] = useState('');
    const [checkAll, setCheckAll] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [sharingList, setSharingList] = useState<any[]>([]);
    const [confirmShareVisible, setConfirmShareVisible] = useState(false);
    const [confirmShareLoading, setConfirmShareLoading] = useState(false);
    const [paramsData, setParamsData] = useState<any>(null);
    const isFirstMessage = useRef(true);
    const isRequesting = useRef(false);
    const messageRef = useRef('');
    const groupCountRef = useRef(0);
    const closedGroupCountRef = useRef(0);
    const abortController = useRef<AbortController | null>(null);
    const [loadingRoundIndex, setLoadingRoundIndex] = useState<number>(0);
    const startTimeRef = useRef<number>(0);
    const [isGettingData, setIsGettingData] = useState(false); // 增加正在执行查询数据未返回值，loading。
    const hasTriggeredIsGetting = useRef(false);
    const [selectedExcel, setSelectedExcel] = useState<any>({}); // 引用文件
    const [referenceDialog, setReferenceDialog] = useState<any>({}); // 引用对话
    const [deepThinkEnabled, setDeepThinkEnabled] = useState(true); // 深度思考
    const [uploadFileEnabled, setUploadFileEnabled] = useState(false); // 上传文件
    const [cur, setCur] = useState<any>();
    const [debugModalVisible, setDebugModalVisible] = React.useState(false);
    const {
      setDebugInfoMap,
      setUserDebugInfoMap,
      userDebugInfoMap,
      // userChatHistory,
      // setUserChatHistory,
    } = useDebugStore();
    const isMessageAdded = useRef(false); // 使用 useRef 来确保只添加一次消息
    const [smLoading, setSmLoading] = useState(false); // 第一步结束状态
    const [doneStatus, setDoneStatus] = useState(false); // down状态
    const prevSpaceId = useRef<number | undefined>(undefined);
    const webSocketViewAdded = useRef(false); // 跟踪是否已通过WebSocket添加ViewEle
    const isAborting = useRef(false); // 追踪是否正在中断请求（处理多条ai消息的中断状态）
    const [exceptionGuidanceLoading, setExceptionGuidanceLoading] =
      useState(false);
    const [tempUserId, setTempUserId] = useState<string>('');
    const aiAssistantName = useRef<string>(''); // 存储AI助手的name字段
    // 在组件顶层调用 useId Hook，但每次需要时生成新的ID
    const baseId = useId();

    // 分页加载历史记录相关状态
    const [minRoundIndex, setMinRoundIndex] = useState<number | undefined>(undefined);
    const [hasMoreHistory, setHasMoreHistory] = useState(true);
    const [historyLoading, setHistoryLoading] = useState(false);

    // 添加对话容器的 ref
    const chatContainerRef = useRef<HTMLDivElement>(null);
    // 测试面板显示状态
    // const [showTestPanel, setShowTestPanel] = useState(
    //   env.NODE_ENV === 'development'
    // );

    const chatHeaderRef = useRef<chatHeaderRefMethod>(null);

    // 滚动到底部的函数
    const scrollToBottom = () => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop =
          chatContainerRef.current.scrollHeight;
      }
    };

    // 加载更多历史记录
    const loadMoreHistory = async () => {
      if (historyLoading || !hasMoreHistory || minRoundIndex === undefined) return;
      
      const chatContainer = chatContainerRef.current;
      if (!chatContainer) return;
      
      // 保存当前滚动位置和高度
      const oldScrollHeight = chatContainer.scrollHeight;
      const oldScrollTop = chatContainer.scrollTop;
      
      // 创建一个强制锁定滚动的函数
      let isLocked = true;
      const maintainScroll = () => {
        if (isLocked && chatContainer) {
          const currentHeight = chatContainer.scrollHeight;
          const heightDiff = currentHeight - oldScrollHeight;
          const targetScroll = oldScrollTop + heightDiff;
          if (chatContainer.scrollTop !== targetScroll) {
            chatContainer.scrollTop = targetScroll;
          }
        }
      };
      
      // 创建 MutationObserver 监听 DOM 变化，立即修正滚动
      const observer = new MutationObserver(() => {
        maintainScroll();
      });
      
      observer.observe(chatContainer, {
        childList: true,
        subtree: true,
        attributes: false
      });
      
      // 拦截任何可能的滚动
      const preventScroll = (e: Event) => {
        if (isLocked) {
          e.preventDefault();
          e.stopPropagation();
          maintainScroll();
        }
      };
      
      // 临时禁用滚动并添加多重拦截
      const originalOverflow = chatContainer.style.overflow;
      const originalScrollBehavior = chatContainer.style.scrollBehavior;
      chatContainer.style.overflow = 'hidden';
      chatContainer.style.scrollBehavior = 'auto'; // 禁用平滑滚动
      chatContainer.addEventListener('scroll', preventScroll, { capture: true, passive: false });
      
      isLoadingHistory.current = true;
      setHistoryLoading(true);

      try {
        const res = await fetchConvHistoryRound({
          conv_uid: conv.conv_uid,
          round_index: minRoundIndex
        });
        
        const newMessages = res?.data || [];
        if (newMessages.length < 10) {
          setHasMoreHistory(false);
        }

        if (newMessages.length > 0) {
          const orders = newMessages.map((item: any) => item.order);
          const newMin = Math.min(...orders);
          setMinRoundIndex(newMin);
          
          const processedMessages = newMessages.map((item: any) => ({
            ...item,
            roundIndex: item.order,
            describe: true,
            arrowStatus: true,
          }));
          
          // 使用 flushSync 强制同步更新，MutationObserver 会立即触发
          flushSync(() => {
            setConvContent(prev => {
              const opening = prev.length > 0 ? prev[0] : null;
              const rest = prev.length > 0 ? prev.slice(1) : [];
              const hasOpening = opening && opening.role === 'first';
              
              if (hasOpening) {
                  return [opening, ...processedMessages, ...rest];
              } else {
                  return [...processedMessages, ...prev];
              }
            });
          });
          
          // flushSync 完成后，立即再次修正（作为双保险）
          maintainScroll();
          
          // 持续修正滚动位置
          const checkInterval = setInterval(maintainScroll, 0);
          
          setTimeout(() => {
            clearInterval(checkInterval);
            isLocked = false;
            observer.disconnect();
            chatContainer.removeEventListener('scroll', preventScroll, { capture: true } as any);
            chatContainer.style.overflow = originalOverflow;
            chatContainer.style.scrollBehavior = originalScrollBehavior;
            
            setHistoryLoading(false);
            isLoadingHistory.current = false;
            canLoadMore.current = true;
          }, 100);
        } else {
          isLocked = false;
          observer.disconnect();
          chatContainer.removeEventListener('scroll', preventScroll, { capture: true } as any);
          chatContainer.style.overflow = originalOverflow;
          chatContainer.style.scrollBehavior = originalScrollBehavior;
          setHistoryLoading(false);
          isLoadingHistory.current = false;
          canLoadMore.current = true;
        }
      } catch (e) {
          console.error("Failed to load more history", e);
          isLocked = false;
          observer.disconnect();
          chatContainer.removeEventListener('scroll', preventScroll, { capture: true } as any);
          chatContainer.style.overflow = originalOverflow;
          chatContainer.style.scrollBehavior = originalScrollBehavior;
          setHistoryLoading(false);
          isLoadingHistory.current = false;
          canLoadMore.current = true;
      }
    };
    // 监听对话内容变化，自动滚动，当用户滚动时，不自动滚动
    const [userScrolled, setUserScrolled] = useState(false);
    const lastScrollTop = useRef(0); // 记录上一次的滚动位置
    const canLoadMore = useRef(false); // 是否允许加载更多，初始为false防止初始滚动时误触发
    const isLoadingHistory = useRef(false); // 标记是否正在加载历史记录，阻止自动滚动

    const handleCollect = async () => {
      const userInfoString = localStorage.getItem('SOY-REACT_userInfo');
      const userInfo = JSON.parse(userInfoString || '{}');
      fetchOperate({
        ...conv,
        type: 1,
        name: conv.biz_name || 'AI智能助手',
        operator: userInfo.userName,
        update_by: userInfo.userName,
        create_by: userInfo.userName,
      });
    };

    // 监听用户滚动事件
    useEffect(() => {
      const chatContainer = chatContainerRef.current;
      if (!chatContainer) return;

      const handleScroll = () => {
        const { scrollTop, scrollHeight, clientHeight } = chatContainer;

        // 检查用户是否主动向上滚动（scrollTop 减小）
        const isScrollingUp = scrollTop < lastScrollTop.current;

        // 计算距离底部的距离
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

        // 只有当用户主动向上滚动，且距离底部超过100px时，才标记为用户滚动
        if (isScrollingUp && distanceFromBottom > 100) {
          setUserScrolled(true);
        } else if (distanceFromBottom <= 50) {
          // 如果滚动到接近底部（50px以内），认为用户想要跟随最新内容
          setUserScrolled(false);
        }

        // 触发加载更多历史记录 - 基于当前批次触发（每次加载10条，滑到第3条时触发下一批）
        if (canLoadMore.current && isScrollingUp && hasMoreHistory && !historyLoading && minRoundIndex !== undefined) {
          const getMsgId = document.querySelector(`#human-msg-${minRoundIndex + 2}`)?.getBoundingClientRect()!;
          const containerRect = chatContainer.getBoundingClientRect();
          if (getMsgId.top <= containerRect.bottom && getMsgId.bottom >= containerRect.top) {
            canLoadMore.current = false; // 防止重复触发
            loadMoreHistory();
          }
        }

        // 更新上一次的滚动位置
        lastScrollTop.current = scrollTop;
      };

      chatContainer.addEventListener('scroll', handleScroll);
      return () => chatContainer.removeEventListener('scroll', handleScroll);
    }, [hasMoreHistory, historyLoading, minRoundIndex, conv.conv_uid]);

    useEffect(() => {
      // 只有在用户没有主动滚动且不在加载历史记录时才自动滚动
      if (!userScrolled && !historyLoading && !isLoadingHistory.current) {
        scrollToBottom();
      }
    }, [convContent, currentMessage, userScrolled, historyLoading]);

    // 监听 conv 变化，切换会话时中断当前的 EventSource 连接
    useEffect(() => {
      // 如果正在请求中，先中断当前请求
      if (isRequesting.current) {
        stopGenerating();
      }

      // 检查空间是否发生变化，如果变化则清空缓存
      const currentSpaceId = conv.space_id;
      // const prevSpaceId = useRef<number | undefined>(undefined); // 移除这行

      if (
        prevSpaceId.current !== undefined &&
        prevSpaceId.current !== currentSpaceId
      ) {
        // 空间发生变化，清空所有缓存 - redux已注释
        // store.dispatch(clearAllCache());
      }
      prevSpaceId.current = currentSpaceId;
      // 记录最近使用
      handleCollect();
      // 查询是否收藏
      chatHeaderRef.current?.handleIsFavorite();
      // 切换对话时清除引用状态
      setSelectedExcel({});
      setReferenceDialog({});

      // 重置历史记录分页状态
      setMinRoundIndex(undefined);
      setHasMoreHistory(true);
      setHistoryLoading(false);
      canLoadMore.current = false; // 重置加载标记
      isLoadingHistory.current = false; // 重置加载历史记录标记

      handleChatHistory();
      // 组装 context
      const {  model_name, biz_name, chat_config, ...elseCov } = conv;
      const context = {
        ...elseCov,
        app_code: conv.app_code || conv.chat_mode,
        extra: {
          db_name: '',
          if_debug: true,
          dsl_or_db: 'db',
          predict_type: 'time_series_predict',
          predict_param: {},
          sql: '',
        },
      };
      // 组装 paramData
      const paramData = {
        model: window.APP_CONFIG.VITE_CHAT_MODEL || 'qwen3:30b-a3b-fp16',
        stream: true,
        temperature: 0.0,
        max_new_tokens: 4096,
        incremental: true,
        enable_vis: false,
        context: context,
      };
      setParamsData(paramData);
      // getAgentData()
    }, [conv]);


    // const getAgentData = () =>{
    //   if(!conv.agent_id){
    //     return
    //   }
    //   fetchDatasourceById(conv.agent_id).then(res=>{
    //     if(res.data){
    //       agentData.current = res.data[0];
    //     }
    //   })
    // }
    // 判断最大对话轮次
    const handleChatHistory = async () => {
      // 如果有 conv_uid 并且缓存中有历史对话记录, 查询接口跟历史对话记录进行对比如果有新增则增量更新否则全量拉取
      if (conv && conv.conv_uid) {
        //是否增量更新
        let isUpdate = false;
        // 最后一个对话的order
        let maxOrder = 0;
        // 是否有缓存对话 - 已注释zustand缓存逻辑
        // if (userChatHistory.get(conv.conv_uid)) {
        //   const maxRoundRes = await fetchConvMaxRound({
        //     conv_uid: conv.conv_uid,
        //   });

        //   // 当前对话记录
        //   const currentHistory = userChatHistory.get(conv.conv_uid) || [];
        //   console.log('currentHistory:', currentHistory);

        //   const currentLen = currentHistory.length;
        //   const maxOrderIndex = currentHistory[currentLen - 1]?.order || 0;
        //   console.log(
        //     'maxOrderIndex:',
        //     maxOrderIndex,
        //     'maxRoundRes:',
        //     maxRoundRes.data
        //   );

        //   if (maxRoundRes.data > maxOrderIndex) {
        //     isUpdate = true;
        //     maxOrder = maxOrderIndex;
        //   }
        // }
        console.log('isUpdate:', isUpdate, 'maxOrder:', maxOrder);

        getHistory(isUpdate, maxOrder);
      }
    };

    /**
     * 获取对话历史记录
     * 功能：
     * 1. 获取智能体推荐问题作为开场白
     * 2. 获取当前对话的历史记录
     * 3. 组合开场白和历史记录显示
     * 4. 自动滚动到对话底部
     */
    const getHistory = async (isUpdate: boolean, maxOrder: number) => {
      let conversationList: any = [];
      const { conv_uid: convUid = '', agent_id: agentId = '' } = conv;
      const text: string = getOpeningText(false);
      let openingMessage = {
        question: {
          items: [],
          page: 1,
          page_size: 0,
          total_count: 0,
          total_pages: 1,
        },
        context: text,
        role: 'first',
        id: `opening_${convUid}`, // 使用固定的ID，基于convUid
        timestamp: Date.now(),
      };
      try {
        let questionData = [];
        // 已注释zustand缓存逻辑 - 始终拉取推荐问题
        // if (!userChatHistory.get(convUid)) {
          if (agentId) {
            // 直接请求接口
            const res2: any = await fetchRecommendedQuestionOpenings({
              agent_id: agentId,
              page_size: 100,
              page:3
            });

            questionData = res2?.data?.items || []; // 修改这里，确保 questionData 是数组
            if (!res2?.success || !res2) {
              // 检查 res2 是否成功
              openingMessage = {
                question: {
                  items: [],
                  page: 1,
                  page_size: 0,
                  total_count: 0,
                  total_pages: 1,
                },
                context: getOpeningText(false),
                role: 'first',
                id: `opening_${convUid}`, // 使用固定的ID，基于convUid
                timestamp: Date.now(),
              };
            }
          }

          let text: string = getOpeningText(questionData.length > 0); // 根据是否有推荐问题决定文本

          openingMessage = {
            question: {
              items: questionData,
              page: 1,
              page_size: questionData.length,
              total_count: questionData.length,
              total_pages: 1,
            },
            context: text,
            role: 'first',
            id: `opening_${convUid}`, // 使用固定的ID，基于convUid
            timestamp: Date.now(),
          };
        // }
      } catch (error) {
        console.error('', error);
      }

      // 获取历史对话
      if (convUid) {
        let result: any = [];
        // 已注释zustand缓存逻辑 - 始终全量拉取历史对话
        // if (userChatHistory.get(convUid) && !isUpdate) {
        //   console.log('使用缓存历史对话');

        //   conversationList = conversationList.concat(
        //     userChatHistory.get(convUid) || []
        //   );
        // } else if (userChatHistory.get(convUid) && isUpdate) {
        //   console.log('增量更新历史对话');
        //   result = await fetchConvIncrement({
        //     conv_uid: convUid,
        //     round_index: maxOrder,
        //   });
        //   conversationList = conversationList.concat(
        //     userChatHistory.get(convUid) || []
        //   );
        // } else {
          conversationList = [openingMessage];
          // console.log('全量拉取历史对话');
          // result = await fetchConvHistory({
          //   conv_uid: convUid,
          // });
          result = await fetchConvHistoryRound({
            conv_uid: convUid,
          });
        // }

        // 对历史对话进行用户id储存
        if (result?.data?.length > 0) {
          // 更新最小roundIndex和hasMore状态
          const orders = result.data.map((item: any) => item.order);
          const minOrder = Math.min(...orders);
          setMinRoundIndex(minOrder);
          
          if (result.data.length < 10) {
            setHasMoreHistory(false);
          } else {
            setHasMoreHistory(true);
          }

          result?.data.forEach((item: any) => {
            setUserDebugInfoMap({
              order: item.order,
              roundIndex: item.order,
            });
          });
        } else {
          setHasMoreHistory(false);
        }
        conversationList = conversationList.concat(result?.data || []);
      }
      // 已注释zustand缓存逻辑 - 不再保存到缓存
      // setUserChatHistory({ conv_uid: convUid, data: conversationList });
      
      // 显示历史记录（包括开场白）
      setConvContent(
        conversationList.map((item: any) => {
          return {
            ...item,
            roundIndex: item.order,
            describe: true,
            arrowStatus: true,
          };
        })
      );

      // 在下一个事件循环中滚动到底部，确保内容已经渲染
      setTimeout(() => {
        scrollToBottom();
        // 滚动完成后，允许触发加载
        setTimeout(() => {
          canLoadMore.current = true;
        }, 500);
      }, 300);
    };

    // 添加中断请求的函数
    const stopGenerating = () => {
      if (abortController.current) {
        isAborting.current = true;
        abortController.current.abort();
        abortController.current = null;
        isRequesting.current = false;
        setLoading(false);
        setIsGettingData(false);
        setSmLoading(false);
        // 重置消息添加标记
        isMessageAdded.current = false;
        hasTriggeredIsGetting.current = false;

        // 强制更新所有AI消息状态，确保进度条停止
        setConvContent((prevState: any[]) => {
          return prevState.map((item: any) => {
            if (item.role === 'ai' && item.smLoading) {
              return {
                ...item,
                smLoading: false,
                isStreaming: false,
                isDone: true,
              };
            }
            return item;
          });
        });

        message.error('请求已中断');
      }
    };
    const wsRef = useRef<WebSocket | null>(null);
    const wsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // 异常标记
    const [hasError, setHasError] = useState(false);

    // 提示引导
    const handleExceptionGuidance = async (data: any) => {
      setExceptionGuidanceLoading(true);
      const res: any = await fetchExceptionGuidance({
        ...data,
        extra: { except_guidance: 'true' },
      });
      console.log(res);
      updateAiMessage({ context: res.content }); // TODO

      setExceptionGuidanceLoading(false);
    };

    const connectWebSocket = (convUid: string, roundIndex: number) => {
      // setLoading(true);
      // 关闭现有连接（如果存在）
      if (wsRef.current) {
        wsRef.current.close();
        // clearInterval(pingIntervalRef.current);
      }

      try {
        // 创建新的WebSocket连接
        const baseUrl = window.APP_CONFIG.VITE_WEBSOCKET_API;

        // 确保基础URL格式正确（去除末尾斜杠）
        const normalizedBaseUrl = baseUrl.endsWith('/')
          ? baseUrl.slice(0, -1)
          : baseUrl;

        // 构建完整URL
        const url = `${normalizedBaseUrl}/ws-proxy/abi-debug/ws/stream/consume?convUid=${convUid}&roundIndex=${roundIndex}`;

        wsRef.current = new WebSocket(url);

        // 清除之前的超时定时器
        if (wsTimeoutRef.current) {
          clearTimeout(wsTimeoutRef.current);
        }

        // 设置连接超时
        wsTimeoutRef.current = setTimeout(() => {
          if (
            wsRef.current &&
            wsRef.current.readyState === WebSocket.CONNECTING
          ) {
            console.warn('WebSocket连接超时');
            wsRef.current.close();
            setLoading(false);
            setIsGettingData(false);
            setSmLoading(false);
            isRequesting.current = false;
            message.error('WebSocket连接超时，请重试');
          }
          wsTimeoutRef.current = null;
        }, 10000); // 10秒超时

        // 连接打开
        wsRef.current.onopen = () => {
          // setStatus('connected');
          console.log('WebSocket connected');

          // 清除连接超时定时器
          if (wsTimeoutRef.current) {
            clearTimeout(wsTimeoutRef.current);
            wsTimeoutRef.current = null;
          }

          // 开始发送心跳（如果需要）
          setDebugInfoMap({
            uid: `${convUid}_${roundIndex}`,
            metrics: {
              current_stage: 1,
            },
            loading: true,
          });
          // pingIntervalRef.current = setInterval(() => {
          // if (wsRef.current.readyState === WebSocket.OPEN) {
          //   wsRef.current.send('PING');
          // }
          // }, 30000); // 每30秒发送一次心跳
        }; // 接收消息

        let partialMessage = ''; // 存储接收到的部分数据
        wsRef.current.onmessage = (event) => {
          const message = event.data;

          try {
            if (message) {
              // 拼接接收到的数据（如果是分段的消息）
              partialMessage += message;
              // partialMessage = partialMessage.replace(/,\s*([\]}])/g, '$1');

              // 检查拼接后的消息是否是完整的 JSON 对象
              while (
                partialMessage.startsWith('{') &&
                partialMessage.endsWith('}')
              ) {
                try {
                  // 解析完整的 JSON 数据
                  const debugInfo = JSON.parse(partialMessage);
                  // console.log("message:", debugInfo);

                  // 如果logs有数据，表示有报错
                  if (
                    debugInfo.logs?.length > 0 &&
                    debugInfo.logs[0] &&
                    !exceptionGuidanceLoading
                  ) {
                    handleExceptionGuidance({
                      conv_uid: convUid,
                      round_index: roundIndex,
                    });
                  }

                  // 确保将完整的debugInfo（包含name.task_name_cn）传递给store
                  const enhancedDebugInfo = {
                    ...debugInfo,
                    // 确保name字段被保留并传递
                    name: debugInfo.name || {},
                  };

                  // 检查chat_mode是否为chat_with_db_execute

                  // 原有的复杂逻辑

                  // 处理解析后的数据（例如更新状态）
                  setDebugInfoMap(enhancedDebugInfo);

                  // 处理完成后，清空缓存
                  partialMessage = '';
                  setHasError(false); // 重置错误状态，因为消息处理成功
                } catch (error) {
                  setHasError(true); // 设置异常标记
                  console.error('Error parsing message:', error);
                  // 如果 JSON 解析失败，说明消息还没有完全接收，等待更多数据
                  break;
                }

                // 处理调试信息
                // const debugInfo = JSON.parse(message);
                // 将调试信息存储到全局状态
                // setDebugInfoMap(debugInfo);

                // 如果不是最后一步，则下一步添加loading
                // if (debugInfo.metrics.current_stage < debugInfo.metrics.total_stages) {
                //   setDebugInfoMap({
                //     uid: `${convUid}_${roundIndex}`,
                //     metrics: {
                //       current_stage: debugInfo.metrics.current_stage + 1
                //     },
                //     loading: true
                //   });
                // }
              }
              // const parsedMessage = JSON.parse(message);
              // setMessages(prev => [parsedMessage, ...prev]); // 新消息添加到顶部
            }
          } catch (error) {
            console.error('Error parsing message:', error);
            // 如果不是JSON，直接显示原始消息
            // setMessages(prev => [{ raw: message }, ...prev]);
          }
        }; // 错误处理
        wsRef.current.onerror = (error) => {
          console.error('WebSocket error:', error);

          // 清除超时定时器
          if (wsTimeoutRef.current) {
            clearTimeout(wsTimeoutRef.current);
            wsTimeoutRef.current = null;
          }

          // WebSocket错误时清理loading状态
          setLoading(false);
          setIsGettingData(false);
          setSmLoading(false);
          isRequesting.current = false;
          message.error('WebSocket连接异常，请重试');
        };
        // 连接关闭
        wsRef.current.onclose = (event) => {
          console.log('WebSocket disconnected', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean,
          });

          // 清除超时定时器
          if (wsTimeoutRef.current) {
            clearTimeout(wsTimeoutRef.current);
            wsTimeoutRef.current = null;
          }

          // 如果不是正常关闭（wasClean为false），清理loading状态
          if (!event.wasClean) {
            console.warn('WebSocket异常关闭，清理loading状态');
            setLoading(false);
            setIsGettingData(false);
            setSmLoading(false);
            isRequesting.current = false;
          }

          // 清除心跳
          // if (pingIntervalRef.current) {
          //   clearInterval(pingIntervalRef.current);
          // }
        };
      } catch (error) {
        console.error('WebSocket连接创建失败:', error);

        // 清除超时定时器
        if (wsTimeoutRef.current) {
          clearTimeout(wsTimeoutRef.current);
          wsTimeoutRef.current = null;
        }

        // 清理loading状态
        setLoading(false);
        setIsGettingData(false);
        setSmLoading(false);
        isRequesting.current = false;
        message.error('WebSocket连接创建失败，请重试');
      }
    };

    const getAnswer = async ({ question, IC }: any) => {
      if (isRequesting.current) {
        return;
      }
      // let dbName="",modelName="";
      // modelName = agentData.current.name;
      // const config = JSON.parse(agentData.current.config);
      // dbName = config.dbName;
      // 生成一个临时对话userid 并储存（使用基础ID + 时间戳确保唯一性）
      const tempUserId = `${baseId}-${Date.now()}`;
      setTempUserId(tempUserId);

      setTimeout(scrollToBottom, 300);
      // 创建新的 AbortController
      abortController.current = new AbortController();
      // 重置中断标记
      isAborting.current = false;
      const params = _.cloneDeep(paramsData);
      params.context.extra.db_name = "";
      params.context.extra.modelName = "";
      params.messages = question;
      params.context.extra.sql_command = '';
      if (!deepThinkEnabled) {
        params.context.extra.quick_mode = true;
      }

      // 为用户消息生成一个临时 ID，以便在后续更新时能找到它
      const userMessage = {
        context: question,
        role: 'human',
        id: Date.now(),
      };
      setConvContent((state) => [...state, userMessage]);
      // 将用户消息添加到缓存 - 已注释
      // if (conv.conv_uid) {
      //   store.dispatch(upsertConvHistoryToCache({
      //     convUid: conv.conv_uid,
      //     message: userMessage
      //   }));
      // }

      const startTime = performance.now();
      setLoading(true);
      isRequesting.current = true;
      messageRef.current = ''; // 重置消息
      startTimeRef.current = startTime; // 记录开始时间
      isMessageAdded.current = false; // 重置添加状态，允许添加新的AI消息
      webSocketViewAdded.current = false; // 重置WebSocket ViewEle添加标记
      setSmLoading(false);
      setDoneStatus(false);
      setCurrentMessage(''); // 重置当前消息

      try {
        // 重置状态
        isFirstMessage.current = true;

        hasTriggeredIsGetting.current = false;
        setIsGettingData(false);

        // 根据问题类型选择不同的 API 端点
        // let apiEndpoint = `/api/v2/workflow/chat/completions`;
        // excel引用extra参数
        if (selectedExcel?.file_id) {
          params.context.app_code = 'chat_excel';
          params.context.chat_mode = 'chat_excel';
          params.context.extra.excel_file_id = selectedExcel.file_id;
        }
        // 问题引用extra参数
        if (referenceDialog?.order) {
          params.context.extra.conv_uid = conv.conv_uid;
          params.context.extra.round_index = referenceDialog.order;
        }

        // 澄清参数处理
        if (IC) {
          params.context.extra.clarify_flag = IC.clarify_flag;
          params.context.extra.chat_mode = IC.chat_mode;
          // 如果有 extra 参数（包含 confirm 数据），合并到 params.context.extra
          if (IC.extra) {
            // console.log('=== 意图澄清：传递 extra 参数到后端 ===');
            console.log('📦 IC.extra 内容:', JSON.stringify(IC.extra, null, 2));
            Object.assign(params.context.extra, IC.extra);
          }
          // 如果有 structured_data，也添加到 extra
          if (IC.structured_data) {
            // console.log('📦 IC.structured_data 内容:', JSON.stringify(IC.structured_data, null, 2));
            params.context.extra.structured_data = IC.structured_data;
          }
          // console.log('📤 最终发送到后端的 params.context.extra:', JSON.stringify(params.context.extra, null, 2));
        }

        let roundIndex: any = undefined;
        let retryCount = 0; // 重试计数器
        const maxRetries = 2; // 最大重试次数（首次请求 + 2次重试 = 共3次尝试）

        const storedToken = localStorage.getItem('SOY-REACT_token');
        let authToken = '';
        try {
          if (storedToken && storedToken !== 'undefined' && storedToken !== 'null') {
            authToken = JSON.parse(storedToken);
          }
        } catch {}
        await fetchEventSource(
          `${window.APP_CONFIG.VITE_BASE_API}/chat-proxy/api/v2/workflow/chat/completions`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
            },
            body: JSON.stringify(params),
            signal: abortController.current.signal, // 添加 signal
            openWhenHidden: true,
            async onopen(response) {
              // 检查HTTP响应状态
              if (
                response.ok &&
                response.headers.get('content-type') === EventStreamContentType
              ) {
                // 重置重试计数器
                retryCount = 0;
                return;
              }

              // 如果响应不正常，判断是否需要重试
              if (
                response.status >= 400 &&
                response.status < 500 &&
                response.status !== 429
              ) {
                // 4xx错误（除429外）不应该重试，直接抛出错误停止
                throw new Error(
                  `HTTP ${response.status}: 请求失败，请检查请求参数`
                );
              }

              // 其他错误（如5xx、网络错误）允许重试，但检查重试次数
              if (retryCount >= maxRetries) {
                throw new Error('对话接口发生异常，请检查系统！');
              }
            },
            async onmessage(event) {
              // 直接处理原始数据
              if (event.data) {
                if (event.data.includes('round_index')) {
                  // 提取 round_index
                  const roundIndexMatch = event.data.match(/round_index:(\d+)/);
                  if (roundIndexMatch) {
                    const extractedRoundIndex = parseInt(
                      roundIndexMatch[1],
                      10
                    );
                    roundIndex = Number(extractedRoundIndex);
                    setLoadingRoundIndex(roundIndex);
                    console.log(
                      '提取到roundIndex:',
                      roundIndex,
                      'chat_mode:',
                      params?.context?.chat_mode
                    );
                    setUserDebugInfoMap({
                      order: tempUserId,
                      roundIndex,
                    });
                    // WebSocket只在点击"模式调试"按钮时连接，正常对话不需要连接
                    // connectWebSocket(conv.conv_uid, roundIndex || 0)

                    // 只在非Excel场景下连接socket
                    const isExcelScenario =
                      params?.context?.chat_mode === 'chat_excel';
                    if (!isExcelScenario) {
                      // 连接socket，获取调试信息
                      // connectWebSocket(conv.conv_uid, roundIndex);
                    }
                  }
                }

                // 跳过包含 chatcmpl 的第一条消息
                if (!event.data.includes('chatcmpl')) {
                  messageRef.current += event.data;
                  // console.log(event.data)

                  // 处理实时显示的消息（支持多组 <think>）
                  const startCount = (
                    messageRef.current.match(/<think>/g) || []
                  ).length;
                  const endCount = (
                    messageRef.current.match(/<\/think>/g) || []
                  ).length;

                  // 仅记录已结束的组数量，不在 </think> 时收起，避免提前中断
                  if (endCount > closedGroupCountRef.current) {
                    closedGroupCountRef.current = endCount;
                  }

                  // 新开一组：先收起上一组，再追加新的 AI 框（单组不会进入此分支）
                  if (startCount > groupCountRef.current) {
                    updateAiMessage({ smLoading: false, isDone: true });
                    
                    // 检查是否正在中断，如果是则不添加新的AI框
                    if (!isAborting.current) {
                      // 提取当前组的 sub_chat_mode（在当前 <think> 标签前面）
                      let currentSubChatMode = undefined;
                      if (event.data.includes('sub_chat_mode')) {
                        const subChatModeMatch = event.data.match(/sub_chat_mode:(\w+)/);
                        if (subChatModeMatch) {
                          currentSubChatMode = subChatModeMatch[1];
                          console.log('提取到 sub_chat_mode:', currentSubChatMode);
                        }
                      }
                      
                      setConvContent((state) => [
                        ...state,
                        {
                          context: '',
                          role: 'ai',
                          useSimpleStyle: false,
                          smLoading: true,
                          isStreaming: true,
                          isDone: false,
                          sub_chat_mode: currentSubChatMode, // 立即设置 sub_chat_mode
                          order: tempUserId, // 添加 order 字段，用于查找 roundIndex
                          roundIndex, // 直接保存 roundIndex
                        },
                      ]);
                    }
                    groupCountRef.current = startCount;
                  } else if (event.data.includes('sub_chat_mode')) {
                    // 如果不是新开一组，但是提取到了 sub_chat_mode，更新当前AI消息
                    const subChatModeMatch = event.data.match(/sub_chat_mode:(\w+)/);
                    if (subChatModeMatch) {
                      const extractedSubChatMode = subChatModeMatch[1];
                      console.log('提取到 sub_chat_mode:', extractedSubChatMode);
                      // 更新当前AI消息，添加 sub_chat_mode
                      updateAiMessage({
                        sub_chat_mode: extractedSubChatMode,
                      });
                    }
                  }

                  // 提取当前正在输出的最新一组 <think> 内容
                  let displayMessage = '';
                  const lastOpen = messageRef.current.lastIndexOf('<think>');
                  if (lastOpen >= 0) {
                    displayMessage = messageRef.current.substring(lastOpen + 7);
                    const closeIdx = displayMessage.indexOf('</think>');
                    if (closeIdx >= 0) {
                      displayMessage = displayMessage.substring(0, closeIdx);
                    }
                  }
                  // 从显示内容中移除 round_index 部分
                  displayMessage = displayMessage.replace(
                    /round_index:\d+,?\s*/,
                    ''
                  );
                  // 处理 illegal_query，去掉前缀
                  displayMessage = displayMessage.replace(
                    /"illegal_query":\s*"([^"]+)"/,
                    '$1'
                  );
                  setCurrentMessage(displayMessage.replace(/\\n/g, '\n'));
                }

                // if (false) {
                if (event.data === '[DONE]') {
                  // 计算思考时间
                  const endTime = performance.now();
                  const thinkTimeMs = endTime - startTimeRef.current;
                  const calculatedThinkTime = Math.round(thinkTimeMs / 1000);

                  // 检查消息中是否包含 </think>
                  const parts = messageRef.current.split('</think>');
                  if (parts.length > 1) {
                    updateAiMessage({
                      smLoading: false,
                      isDone: true,
                      thinkTime: calculatedThinkTime,
                      roundIndex,
                    });
                  }

                  // 请求 message/search 接口，为 ViewEle 提供数据
                  // const searchResult = await searchConv({
                  //   conv_uid: conv.conv_uid,
                  //   round_index: roundIndex,
                  //   key: 'view',
                  //   role: 'view',
                  //   page: 1,
                  //   pageSize: 1
                  // });
                  // console.log('searchResult', searchResult);
                  if (!roundIndex) {
                    try {
                      const maxRoundRes: any = await fetchConvMaxRound({
                        conv_uid: conv.conv_uid,
                      });
                      roundIndex = Number(maxRoundRes?.data || 0);
                      setLoadingRoundIndex(roundIndex);
                      setUserDebugInfoMap({
                        order: tempUserId,
                        roundIndex,
                      });
                    } catch (_) {}
                  }
                  setIsGettingData(false);

                  // 设置加载状态为false，让备用方案处理数据获取
                  setLoading(false);
                  setIsGettingData(false);

                  // 检查是否为Excel场景或者WebSocket没有添加ViewEle组件的情况
                  // 只有在Excel场景或者没有通过WebSocket添加ViewEle的情况下才添加
                  const isExcelScenario =
                    params?.context?.chat_mode === 'chat_excel';

                  if (isExcelScenario || !webSocketViewAdded.current) {
                    // 立即添加ViewEle组件，参考master版本的做法
                    setConvContent((state: any) => [
                      ...state,
                      {
                        context: 'describe',
                        describe: true,
                        role: 'view',
                        arrowStatus: false,
                        roundIndex,
                      },
                    ]);
                  }

                  return;
                }

                if (event.data.includes('illegal_query')) {
                  // 使用正则表达式提取 <think> 标签之间的文本
                  const data = event.data;
                  const regex = /<think>"illegal_query":\s?"(.*?)"<\/think>/;
                  const match: any = data.match(regex);

                  // 更新现有的AI消息而不是添加新的
                  updateAiMessage({
                    context: match[1],
                    isStreaming: false,
                    smLoading: false,
                    isDone: true,
                    isIllegalQuery: true, // 标记为闲聊场景，防止自动折叠
                  });

                  // 停止进度条和释放请求状态
                  setLoading(false);
                  setIsGettingData(false);
                  setSmLoading(false);
                  isRequesting.current = false;
                  abortController.current = null;
                  return;
                }

                if (event.data.includes('intent_clarify')) {
                  const data = JSON.parse(event.data);
                  const assemble = {
                    data: data || {},
                    context:
                      '您好，系统检测到您当前提出的问题意图尚不明确，需进一步澄清。',
                  };
                  // 更新现有的AI消息而不是添加新的
                  updateAiMessage({
                    context: assemble.context,
                    questionData: assemble.data,
                    isStreaming: false,
                    smLoading: false,
                    isDone: true,
                  });

                  // 停止进度条和释放请求状态
                  setLoading(false);
                  setIsGettingData(false);
                  setSmLoading(false);
                  isRequesting.current = false;
                  abortController.current = null;
                  return;
                }
              }
            },
            onclose() {
              setLoading(false);
              setIsGettingData(false);
              setSmLoading(false);
              isRequesting.current = false;
              abortController.current = null;
              // 重置消息添加标记，为下次请求做准备
              isMessageAdded.current = false;
              hasTriggeredIsGetting.current = false;
              groupCountRef.current = 0;
              closedGroupCountRef.current = 0;

              // 强制更新所有AI消息状态，确保进度条停止
              setConvContent((prevState: any[]) => {
                return prevState.map((item: any) => {
                  if (item.role === 'ai' && item.smLoading) {
                    return {
                      ...item,
                      smLoading: false,
                      isStreaming: false,
                      isDone: true,
                    };
                  }
                  return item;
                });
              });
            },
            onerror(err: any) {
              console.error('EventSource error:', err);

              // 增加重试计数
              retryCount++;
              console.log(
                `请求失败，当前重试次数: ${retryCount}/${maxRetries}`
              );

              // 如果超过最大重试次数，停止重试并抛出错误
              if (retryCount > maxRetries) {
                console.error('已达到最大重试次数，停止重试');

                setLoading(false);
                setIsGettingData(false);
                setSmLoading(false);
                isRequesting.current = false;
                abortController.current = null;
                // 重置消息添加标记，为下次请求做准备
                isMessageAdded.current = false;
                hasTriggeredIsGetting.current = false;

                // 显示用户友好的错误提示
                message.error('对话接口发生异常，请检查系统！');

                // 强制更新所有AI消息状态，确保进度条停止
                setConvContent((prevState: any[]) => {
                  return prevState.map((item: any) => {
                    if (item.role === 'ai' && item.smLoading) {
                      return {
                        ...item,
                        smLoading: false,
                        isStreaming: false,
                        isDone: true,
                      };
                    }
                    return item;
                  });
                });

                // 抛出错误以停止fetchEventSource的自动重试
                throw new Error('已达到最大重试次数');
              }

              // 如果还在重试范围内，不显示错误提示，让它自动重试
              console.log('将在短暂延迟后自动重试...');
            },
          }
        );
      } catch (error: any) {
        console.error('Fetch error:', error);
        if (error.name !== 'AbortError') {
          // message.error(`获取${question}的答案失败`);

          // 强制更新所有AI消息状态，确保进度条停止
          setConvContent((prevState: any[]) => {
            return prevState.map((item: any) => {
              if (item.role === 'ai' && item.smLoading) {
                return {
                  ...item,
                  smLoading: false,
                  isStreaming: false,
                  isDone: true,
                };
              }
              return item;
            });
          });
        }
        setLoading(false);
        setIsGettingData(false);
        setSmLoading(false);
        isRequesting.current = false;
        abortController.current = null;
        // 重置消息添加标记，为下次请求做准备
        isMessageAdded.current = false;
        hasTriggeredIsGetting.current = false;
      }
    };

    const getRecommend = async ({ type, params }: any) => {
      if (isRequesting.current) {
        return;
      }
      setLoading(true);
      isRequesting.current = true;
      // 创建新的 AbortController
      abortController.current = new AbortController();

      // 添加用户消息
      setConvContent((state) => [
        ...state,
        { context: params.messages, role: 'human' },
      ]);
      setUserScrolled(false); // 重置滚动状态，触发自动滚动到底部

      webSocketViewAdded.current = false; // 重置WebSocket ViewEle添加标记
      // messageRef.current = ''; // 重置消息

      try {
        // 重置状态
        setCurrentMessage('');
        // isFirstMessage.current = true;

        // hasTriggeredIsGetting.current = false;
        // setIsGettingData(false);

        // 根据问题类型选择不同的 API 端点
        let res;
        // 推荐问题
        if (type === 'getQa') {
          res = await fetchRecommendQuestion(params);
          // 推荐维度
        } else {
          res = await fetchDimension(params);
        }
        // const { thinkContent, recommendData } = parseRecommendText(res.data)
        // 检查消息中是否包含 </think>
        // const parts = res.data.split('</think>');
        // if (parts.length > 1) {
        // 一次性添加所有消息，确保顺序
        setConvContent((prevState: any) => {
          const state = prevState.map((item: any) => {
            if (item.role === 'ai' && item.smLoading) {
              return {
                ...item,
                smLoading: false,
                isStreaming: false,
                isDone: true,
              };
            }
            return item;
          });
          return [
            ...state,
            // 添加 AI 回复, 仅需要</think> 之前的内容
            // {
            //   context: '',
            //   role: 'ai',
            //   // thinkTime: Math.round(thinkTimeMs / 1000), // 转换为秒并四舍五入
            //   // roundIndex, // 添加 roundIndex
            //   // useSimpleStyle: false // 添加使用简单样式的标记
            // },
            {
              context:
                type === 'getQa'
                  ? {
                      recommendQuestions: res?.data?.recommend_questions,
                    }
                  : {
                      rewrite:
                        type === 'getD'
                          ? res?.data?.items?.rec_dim
                          : res?.data?.items?.rec_ind,
                    },
              role: 'view',
              // roundIndex, // 添加 roundIndex
              // useSimpleStyle: false, // 添加使用简单样式的标记,
              // feedback: searchResult?.data?.items[0]?.feedback
            },
          ];
        });
        // }
      } catch (error: any) {
        console.log('Fetch error:', error);
        if (error.name !== 'AbortError') {
          message.error(`获取失败`);
        }
        // 强制更新所有AI消息状态，确保进度条停止
        setConvContent((prevState: any[]) => {
          return prevState.map((item: any) => {
            if (item.role === 'ai' && item.smLoading) {
              return {
                ...item,
                smLoading: false,
                isStreaming: false,
                isDone: true,
              };
            }
            return item;
          });
        });
      } finally {
        // 强制更新所有AI消息状态，确保进度条停止
        setConvContent((prevState: any[]) => {
          return prevState.map((item: any) => {
            if (item.role === 'ai' && item.smLoading) {
              return {
                ...item,
                smLoading: false,
                isStreaming: false,
                isDone: true,
              };
            }
            return item;
          });
        });
        setLoading(false);
        setIsGettingData(false);
        isRequesting.current = false;
        abortController.current = null;
        // 重置消息添加标记，为下次请求做准备
        isMessageAdded.current = false;
        hasTriggeredIsGetting.current = false;
      }
    };

    const getQueryRewrite = async (params: any) => {
      if (isRequesting.current) {
        return;
      }

      // 创建新的 AbortController
      abortController.current = new AbortController();

      // 添加用户消息和带进度条的AI消息
      setConvContent((state) => [
        ...state,
        { context: params.messages, role: 'human' },
        {
          context: '',
          role: 'ai',
          smLoading: true, // 显示进度条
          isStreaming: true,
          isDone: false,
        },
      ]);
      setUserScrolled(false); // 重置滚动状态，触发自动滚动到底部

      setLoading(true);
      isRequesting.current = true;
      isMessageAdded.current = true; // 防止useEffect重复添加AI消息
      webSocketViewAdded.current = false; // 重置WebSocket ViewEle添加标记
      messageRef.current = ''; // 重置消息

      try {
        // 重置状态
        setCurrentMessage('');
        // isFirstMessage.current = true;

        // hasTriggeredIsGetting.current = false;
        // setIsGettingData(false);

        // 根据问题类型选择不同的 API 端点
        const res = await fetchQueryRewrite(params);

        // 检查业务状态 - 即使HTTP状态码是200，也可能是业务错误
        if (
          !res ||
          !res.data ||
          res.data.code === 500 ||
          (res.data.msg && res.data.msg.includes('404 NOT_FOUND')) ||
          (res.data.msg && res.data.msg.includes('ERROR'))
        ) {
          const errorMsg = res?.data?.msg || '获取失败';
          message.error(errorMsg);

          // 强制更新所有AI消息状态，确保进度条停止
          setConvContent((prevState: any[]) => {
            return prevState.map((item: any) => {
              if (item.role === 'ai' && item.smLoading) {
                return {
                  ...item,
                  smLoading: false,
                  isStreaming: false,
                  isDone: true,
                };
              }
              return item;
            });
          });
          return;
        }

        // 检查数据是否有效
        if (!res?.data?.items || res.data.items.length === 0) {
          message.warning('暂无相关数据');

          // 强制更新所有AI消息状态，确保进度条停止
          setConvContent((prevState: any[]) => {
            return prevState.map((item: any) => {
              if (item.role === 'ai' && item.smLoading) {
                return {
                  ...item,
                  smLoading: false,
                  isStreaming: false,
                  isDone: true,
                };
              }
              return item;
            });
          });
          return;
        }

        // API调用成功，更新AI消息并添加视图消息
        setConvContent((state: any) => {
          const newState = [...state];
          // 找到最后一个AI消息并更新它
          for (let i = newState.length - 1; i >= 0; i--) {
            if (newState[i].role === 'ai' && newState[i].smLoading) {
              newState[i] = {
                ...newState[i],
                smLoading: false,
                isStreaming: false,
                isDone: true,
              };
              break;
            }
          }

          // 添加视图消息
          newState.push({
            context: { recommendQuestions: res?.data?.items },
            role: 'view',
          });

          return newState;
        });
      } catch (error: any) {
        console.error('getQueryRewrite error:', error);
        if (error.name === 'AbortError') {
          // 用户主动中断，不显示错误消息
          console.log('请求被用户中断');
        } else {
          // 根据错误类型显示不同的提示信息
          let errorMessage = '获取失败';
          if (error.code === 'ECONNABORTED') {
            errorMessage = '请求超时，服务器响应时间过长，请稍后重试';
          } else if (error.message && error.message.includes('timeout')) {
            errorMessage = '请求超时，请稍后重试';
          } else if (error.message && error.message.includes('Network Error')) {
            errorMessage = '网络连接失败，请检查网络后重试';
          }

          message.error(errorMessage);
        }

        // 错误时停止进度条
        setConvContent((state: any) => {
          return state.map((item: any) => {
            if (item.role === 'ai' && item.smLoading) {
              return {
                ...item,
                smLoading: false,
                isStreaming: false,
                isDone: true,
              };
            }
            return item;
          });
        });
      } finally {
        setLoading(false);
        setIsGettingData(false);
        setSmLoading(false);
        isRequesting.current = false;
        abortController.current = null;
        // 重置消息添加标记，为下次请求做准备
        isMessageAdded.current = false;
        hasTriggeredIsGetting.current = false;
      }
    };

    const handleSend = (value: string) => {
      if (!value.trim() || loading) return;
      //  if(!agentData.current){
      //   message.warning('智能体信息正在加载中,请稍后发送...');
      //   return
      // }
      handleCollect();
      // 构建消息内容，包含文件信息和对话引用信息
      const messageContent = {
        question: value,
        file_id: selectedExcel?.file_id,
        file_name: selectedExcel?.file_name,
        reference_order: referenceDialog?.order,
        reference_context: referenceDialog?.context,
      };

      // 发送问题
      getAnswer(messageContent);

      // 清空引用的文件
      // handleRemoveExcel();
      // 清空引用的问题
      handleRemoveDialog();
    };

    // 移除应用excel
    const handleRemoveExcel = () => {
      setSelectedExcel({});
    };

    // 引用
    const getReference = (orderIndex: number) => {
      const questions = getHumanInHistoryByOrderIndex(orderIndex, convContent);
      setReferenceDialog(questions);
    };

    // 清除引用
    const handleRemoveDialog = () => {
      setReferenceDialog({});
    };

    // 组件卸载时清理
    useEffect(() => {
      return () => {
        if (abortController.current) {
          abortController.current.abort();
        }
        // 清理WebSocket连接和超时定时器
        if (wsRef.current) {
          wsRef.current.close();
        }
        if (wsTimeoutRef.current) {
          clearTimeout(wsTimeoutRef.current);
          wsTimeoutRef.current = null;
        }
      };
    }, []);

    // 提取公共逻辑
    const updateAiMessage = (updateData: any) => {
      setConvContent((prevState: any[]) => {
        let aiMessageIndex = -1;

        for (let i = prevState.length - 1; i >= 0; i--) {
          if (prevState[i].role === 'ai') {
            aiMessageIndex = i;
            break;
          }
        }

        if (aiMessageIndex !== -1) {
          const updatedState = [...prevState];
          updatedState[aiMessageIndex] = {
            ...updatedState[aiMessageIndex],
            ...updateData, // 更新
          };
          return updatedState;
        }

        // 如果没有找到返回原数组
        return prevState;
      });
    };

    // 处理 loading 状态
    useEffect(() => {
      // 如果正在中断，不添加新的AI框
      if (loading && !isMessageAdded.current && !isAborting.current) {
        setConvContent((prevState: any[]) => [
          ...prevState,
          {
            context: currentMessage,
            // 临时用户id
            order: tempUserId,
            role: 'ai',
            useSimpleStyle: false,
            smLoading: true,
          },
        ]);
        isMessageAdded.current = true; // 防止重复添加
        groupCountRef.current = 1;
        closedGroupCountRef.current = 0;
      } else if (currentMessage) {
        updateAiMessage({ context: currentMessage });
      }
    }, [currentMessage, loading]);

    // 处理 smLoading 状态
    useEffect(() => {
      if (smLoading) {
        updateAiMessage({ smLoading: !smLoading });
      }
    }, [smLoading]);

    // console.log(convContent,'convContent-----')
    const { ref: sharingRef, download } = useScreenshot();
    const renderContent = useCallback(() => {
      // 收集被选中消息的order
      const selectedOrders = new Set(sharingList.map((item: any) => item.order));
      
      // 直接过滤convContent，保留被选中order的所有消息（human、ai、view）
      const actualSharingList = convContent.filter((item: any) => 
        selectedOrders.has(item.order)
      );

      return actualSharingList.map((item: any, index: number) => {
        if (item.role === 'human') {
          const anchorId = `human-msg-${item.order}`;
          return <HumanEle key={index} data={item} id={anchorId} />;
        } else if (item.role === 'ai') {
          return (
            <AiEle
              key={index}
              isSharing={isSharing}
              loading={loading}
              data={item}
              thinkTime={item.thinkTime}
              useSimpleStyle={item.useSimpleStyle}
              setCur={setCur}
              setDebugModalVisible={setDebugModalVisible}
              getAnswer={getAnswer}
            />
          );
        } else if (item.role === 'view') {
          return (
            <ViewEle
              isReadyShare={false}
              isSharing={isSharing}
              key={index}
              data={item}
              getAnswer={getAnswer}
              getRecommend={getRecommend}
              getQueryRewrite={getQueryRewrite}
              convUid={conv.conv_uid}
              chatId={conv.chat_id}
              spaceId={conv.space_id}
              agentId={conv.agent_id}
              onReferenceClick={getReference}
              conv={conv}
              isGettingData={isGettingData}
              setConvContent={setConvContent}
              onMessageUpdate={() => {
                // <-- 新增的 prop
                // redux缓存已注释
                // if (conv.conv_uid) {
                //   store.dispatch(upsertConvHistoryToCache({
                //     convUid: conv.conv_uid,
                //     message: updatedMessage
                //   }));
                // }
              }}
            />
          );
        } else if (item.role === 'first') {
          return <OpeningsEle key={index} data={item} getAnswer={getAnswer} />;
        }

        return null;
      });
    }, [sharingList]);

    const handleShareOk = async () => {
      // 防止重复点击
      if (isRequesting.current) {
        return;
      }

      try {
        isRequesting.current = true;
        // loading 状态在 onClick 中提前设置

        // 显示进度提示
        message.loading('正在生成快照，请稍候...', 0);

        // 等待 UI 更新完成，确保 loading 提示显示
        await new Promise(resolve => setTimeout(resolve, 100));
        // 并行执行截图和准备数据
        const userInfoString = localStorage.getItem('SOY-REACT_userInfo');
        const userInfo = JSON.parse(userInfoString || '{}');

        const [_, res] = await Promise.all([
          download(), // 截图
          fetchOperate({
            // API调用
            ...conv,
            type: 3,
            name: conv.biz_name || 'AI智能助手',
            operator: userInfo.userName || '未知用户',
          }),
        ]);

        message.destroy(); // 清除loading

        if (res.code !== 200) {
          message.error(res.msg || '分享失败，请稍后再试');
          return;
        }

        message.success('快照已生成，分享成功');
        setIsSharing(false);
        setConfirmShareVisible(false);
      } catch (error) {
        message.destroy();
        console.error('快照生成失败:', error);
        message.error('快照生成失败，请重试');
      } finally {
        isRequesting.current = false;
        setConfirmShareLoading(false);
      }
    };
    const handleConfirmCancel = () => {
      setConfirmShareVisible(false);
      setConfirmShareLoading(false);
      setShareStep(1);
      shareEmailForm.resetFields();
    };

    const handleShareEmail = () => {
      setConfirmShareLoading(true);
      const roundIndexs = sharingList.map((item: any) => item.order).join(',');
      
      shareEmailForm.validateFields().then((values) => {
        let data = {
          convUid: conv.conv_uid,
          chatId: conv.chat_id,
          agentId: conv.agent_id,
          spaceId: conv.space_id,
          extra:{},
          chatName:conv.biz_name,
          roundIndexs,
          ...values,
          executeTime:values?.sendTime?.time
        }
        if(values.executeFrequency === 2){
          data.weekendTargetDay = values?.sendTime?.status
        }
        if(values.executeFrequency === 3){
          data.monthlyTargetDay = values?.sendTime?.status
        }
        delete data.sendTime
        fetchShareEmail(data).then((res:any) => {
          setConfirmShareLoading(false)
          if(res.code === 200){
            message.success('分享成功')
            setIsSharing(false)
            setConfirmShareVisible(false)
            shareEmailForm.resetFields()
            setShareStep(1)
            setConfirmShareLoading(false)
          }else {
            message.error('服务器错误')
          }
        })
      }).catch(()=>{
        setConfirmShareLoading(false)
      })
    };

    return (
      <div className="min-w-[400px] flex-1 flex flex-col h-full">
        <ChatHeader conv={conv} ref={chatHeaderRef} setConvContent={setConvContent} onUpdateList={onUpdateList} setIsSharing={setIsSharing} onClose={onClose} />
        <div ref={chatContainerRef} className="overflow-y-auto bg-white p-4 flex-1 scroll-smooth" style={{ height: 'calc(100vh - 250px)' }}>
          {/* 开发测试面板 */}
          {/* {showTestPanel && (
          <IntentClarifyTestPanel 
            onTestData={handleTestIntentClarify}
            onClearConversation={handleClearTestConversation}
            visible={showTestPanel}
          />
        )} */}

          {/* 对话内容 */}
          {convContent.map((item: any, index: number) => {
            if (item.role === 'human') {
              const anchorId = `human-msg-${item.order}`;
              return (
                <CheckboxWrapCom key={index} convContent={convContent} checkAll={checkAll} setSharingList={setSharingList} isSharing={isSharing} data={item}>
                  <HumanEle data={item} id={anchorId} />
                </CheckboxWrapCom>
              );
            } else if (item.role === 'ai') {
              return (
                  <AiEle
                    loading={loading}
                    isStorage={isStorage}
                    data={item}
                    isDone={item.isDone}
                    thinkTime={item.thinkTime}
                    useSimpleStyle={item.useSimpleStyle}
                    setCur={setCur}
                    setDebugModalVisible={() => {
                      setDebugModalVisible(true);
                      // 延迟连接 WebSocket，避免阻塞弹窗打开
                      setTimeout(() => {
                        connectWebSocket(conv.conv_uid, userDebugInfoMap.get(item.order)?.roundIndex || 0);
                      }, 0);
                    }}
                    getAnswer={getAnswer}
                    onMessageUpdate={() => {
                      // <-- 新增的 prop
                      if (conv.conv_uid) {
                        setIsStorage(true);
                      }
                    }}
                  />
              );
            } else if (item.role === 'view') {
              return (
                <ViewEle
                  isSharing={isSharing}
                  key={index}
                  data={item}
                  getAnswer={getAnswer}
                  getRecommend={getRecommend}
                  getQueryRewrite={getQueryRewrite}
                  convUid={conv.conv_uid}
                  chatId={conv.chat_id}
                  spaceId={conv.space_id}
                  agentId={conv.agent_id}
                  onReferenceClick={getReference}
                  conv={conv}
                  isDone={doneStatus}
                  isGettingData={isGettingData}
                  setConvContent={setConvContent}
                  onMessageUpdate={() => {
                    // <-- 新增的 prop
                    if (conv.conv_uid) {
                    }
                  }}
                />
              );
            } else if (item.role === 'first') {
              return <OpeningsEle key={index} data={item} getAnswer={getAnswer} />;
            }

            return null;
          })}
        </div>

        <div className="pb-2 pr-4 pl-4 sticky bottom-0 bg-white">
          {isSharing ? (
            <SharingModal
              handleConfirmShare={(type) => {
                setConfirmShareType(type);
                setConfirmShareVisible(true);
              }}
              convContent={convContent}
              checkAll={checkAll}
              setCheckAll={setCheckAll}
              setIsSharing={setIsSharing}
              sharingList={sharingList}
              confirmVisible={confirmShareVisible}
            />
          ) : (
            <>
              {/* excel文件引用区域 */}
              <div className="mb-2">
                {selectedExcel.file_id && <FileTag fileId={selectedExcel.file_id} fileName={selectedExcel.file_name} onClose={handleRemoveExcel} />}
                {referenceDialog.order && (
                  <FileTag fileId={referenceDialog.order} fileName={referenceDialog.context} prefixText="#Dialog" showDownloadIcon={false} showFileIcon={false} onClose={handleRemoveDialog} />
                )}
              </div>

              <ChatInput
                conv={conv}
                loading={loading}
                onSend={handleSend}
                onStop={stopGenerating}
                setSelectedExcel={setSelectedExcel}
                deepThinkEnabled={deepThinkEnabled}
                uploadFileEnabled={uploadFileEnabled}
                onToggleDeepThink={() => setDeepThinkEnabled(!deepThinkEnabled)}
                onToggleUploadFile={() => setUploadFileEnabled(!uploadFileEnabled)}
              />
            </>
          )}
        </div>
        {/* 暂时屏蔽其他分享 */}
        {/* <ShareModal
          open={shareModalVisible}
          onClose={() => setShareModalVisible(false)}
        /> */}
        <Modal
          width="60%"
          title={confirmShareType === 'email' ? '邮件发送' : '生成快照'}
          open={confirmShareVisible}
          onCancel={handleConfirmCancel}
          footer={
            <div className="flex justify-end gap-2">
              <Button onClick={handleConfirmCancel}>取消</Button>
              {confirmShareType === 'email' && (
                <>
                  {shareStep === 1 && (
                    <Button
                      type="primary"
                      style={{
                        outline: 'none',
                      }}
                      onClick={() => {
                        setShareStep(2);
                      }}
                    >
                      下一步
                    </Button>
                  )}
                  {shareStep === 2 && (
                    <Button
                      type="primary"
                      loading={confirmShareLoading}
                      disabled={confirmShareLoading}
                      style={{
                        outline: 'none',
                      }}
                      onClick={() => {
                        handleShareEmail();
                      }}
                    >
                      确定
                    </Button>
                  )}
                </>
              )}
              {confirmShareType === 'snapshot' && (
                <Button
                  type="primary"
                  style={{
                    outline: 'none',
                  }}
                  loading={confirmShareLoading}
                  disabled={confirmShareLoading}
                  onClick={async () => {
                  flushSync(() => setConfirmShareLoading(true));
                  // 等待渲染完成
                  await new Promise(resolve => {
                    requestAnimationFrame(() => requestAnimationFrame(resolve));
                  });
                  handleShareOk();
                }}
                >
                  确定
                </Button>
              )}
            </div>
          }
        >
          <Form form={shareEmailForm} layout="vertical" wrapperCol={{ span: 20 }} initialValues={{emailTitle:`${conv.biz_name}报告-${dayjs().format('YYYY.MM.DD')}`}}>
            {confirmShareType === 'email' && shareStep === 2 && <ShareEmailSetting form={shareEmailForm} />}
          </Form>
         {(confirmShareType === 'snapshot' || confirmShareType === 'email' &&shareStep === 1) &&<div className="h-[60vh] overflow-y-scroll"><div ref={sharingRef}>{renderContent()}</div></div>}
        </Modal>

        {debugModalVisible ? (
          <>
            <ModelDebugModal
              thinkTime={cur?.thinkTime}
              convUid={conv?.conv_uid}
              roundIndex={cur?.roundIndex || loadingRoundIndex}
              open={debugModalVisible}
              onClose={() => {
                setDebugModalVisible(false);
                if (wsRef.current) {
                  wsRef.current.close();
                }
              }}
            />
          </>
        ) : null}
      </div>
    );
  }
);

export default Conversation;
