/**
 * 对话页面主组件
 * 实现与AI助手的对话功能，包括：
 * - 消息展示
 * - 消息发送
 * - 实时响应处理
 */

import { Input, Modal, message, Spin, Card, Tag } from "antd"
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
import { clearConvHistory, fetchConvHistory, fetchDimension, fetchQueryRewrite, fetchRecommendQuestion, searchConv, fetchRecommendedQuestionOpenings, fetchExceptionGuidance, fetchConvMaxRound, fetchConvIncrement } from "../../service/api/conv";
import { updateApp } from '../../service/api/app';
import { CloseOutlined, LoadingOutlined } from "@ant-design/icons";
import { fetchEventSource, EventStreamContentType } from '@microsoft/fetch-event-source';
import { getHumanInHistoryByOrderIndex, getOpeningText } from '../../utils';
import HumanEle from "./HumanEle";
import AiEle from "./AiEle";
import ViewEle from "./ViewEle";
import SvgIcon from "../../components/SvgIcon";
import FileTag from "../../components/FileTag";
import styles from './index.module.css';
import HistoryDrawer from './HistoryDrawer';
import SaveDrawer from './SaveDrawer';
import UploadDrawer from './UploadDrawer';
import CreateModal from '../conversation-analysis/CreateModal';
import ShareModal from './ShareModal';
import { fetchOperate } from "../../service/api/abi-system";
import { useDebugStore } from "../../store";
import { parseRecommendText } from "../../utils";
import ModelDebugModal from "./ModelDebugModal";
import OpeningsEle from "./OpeningsEle";
// 导入 Redux store 和相关 actions/selectors - 已注释
// import { store } from '../../store/redux';
// import { setConvHistoryCache, setRecQuestionCache, clearAllCache, upsertConvHistoryToCache } from '../../store/redux/slices/conversations';
import AudioRecorder from "../../components/AudioRecorder";
import SharingModal from "./SharingModal";
import CheckboxWrapCom from "./CheckboxWrapCom";
import { useScreenshot } from "./useScreenShot";
import IntentClarifyTestPanel from "./components/IntentClarifyTestPanel";
import _ from 'lodash'
// 环境变量
const env = {
  NODE_ENV: process.env.NODE_ENV || 'development'
};

const chatApi = env.NODE_ENV === 'development' ? '' : '/chat-proxy'
/**
 * 组件属性类型定义
 */
interface PropsType {
  conv: any; // 对话配置信息
  onClose: () => void; // 关闭回调函数
  onUpdateList: (data: any) => void;
};

/**
 * 对话组件
 * 使用React.memo优化性能
 */
const Conversation: React.FC<PropsType> = React.memo(({ conv, onClose, onUpdateList }) => {
  // 数据库名称
  const dbName = conv.dbName;
  const [inputValue, setInputValue] = useState('');
  const [isStorage, setIsStorage] = useState(false)
  const [loading, setLoading] = useState(false);
  const [convContent, setConvContent] = useState<any[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [saveVisible, setSaveVisible] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [checkAll, setCheckAll] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [sharingList, setSharingList] = useState<any[]>([]);
  const [confirmShareVisible, setConfirmShareVisible] = useState(false);
  const [isStarred, setIsStarred] = useState(false);
  const [uploadFileVisible, setUploadFileVisible] = useState(false);
  const [paramsData, setParamsData] = useState<any>(null);
  const isFirstMessage = useRef(true);
  const isRequesting = useRef(false);
  const messageRef = useRef('');
  const abortController = useRef<AbortController | null>(null);
  const [thinkTime, setThinkTime] = useState<number>(0);
  const [loadingRoundIndex, setLoadingRoundIndex] = useState<number>(0);
  const startTimeRef = useRef<number>(0);
  const [isGettingData, setIsGettingData] = useState(false); // 增加正在执行查询数据未返回值，loading。
  const hasTriggeredIsGetting = useRef(false);
  const [selectedExcel, setSelectedExcel] = useState<any>({}); // 引用文件
  const [referenceDialog, setReferenceDialog] = useState<any>({}); // 引用对话
  const [cur, setCur] = useState<any>();
  const [debugModalVisible, setDebugModalVisible] = React.useState(false);
  const { setDebugInfoMap,setUserDebugInfoMap,userDebugInfoMap, userChatHistory, setUserChatHistory } = useDebugStore();
  const isMessageAdded = useRef(false); // 使用 useRef 来确保只添加一次消息
  const [smLoading, setSmLoading] = useState(false);  // 第一步结束状态
  const [doneStatus, setDoneStatus] = useState(false);  // down状态
  const prevSpaceId = useRef<number | undefined>(undefined);
  const [otherStatus, setOtherStatus] = useState(false);  // 除问数状态
  const webSocketViewAdded = useRef(false); // 跟踪是否已通过WebSocket添加ViewEle
  const [exceptionGuidanceLoading, setExceptionGuidanceLoading] = useState(false)
  const [tempUserId, setTempUserId] = useState<string>('');
  const aiAssistantName = useRef<string>(''); // 存储AI助手的name字段
  // 在组件顶层调用 useId Hook，但每次需要时生成新的ID
  const baseId = useId();
  // 添加对话容器的 ref
  const chatContainerRef = useRef<HTMLDivElement>(null);
  // 测试面板显示状态
  const [showTestPanel, setShowTestPanel] = useState(env.NODE_ENV === 'development');

  // 滚动到底部的函数
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  // 监听对话内容变化，自动滚动，当用户滚动时，不自动滚动
  const [userScrolled, setUserScrolled] = useState(false);

  // 清空测试对话
  const handleClearTestConversation = () => {
    setConvContent([]);
    message.success('对话已清空');
  };

  // 测试意图澄清数据处理函数
  const handleTestIntentClarify = (testData: any, scenarioTitle: string) => {
    const timestamp = Date.now();
    const userMessageId = `user_${timestamp}`;
    const aiMessageId = `ai_${timestamp}`;
    
    // 根据场景生成模拟用户问题
    const userQuestions: any = {
      'chat_with_db_execute': {
        'query_detail': '查询最近一个月的水位数据明细',
        'query_aggregation': '统计各地区的平均降水量'
      },
      'chat_with_analysis': {
        'analysis_single_indicator': '分析长江水位异常偏高的原因',
        'analysis_dims_indicator': '分析多个流域的汛期水位情况'
      },
      'chat_with_predict': {
        'predict_time_series': '预测黄河流域未来半年的流量变化'
      },
      'chat_with_excel': {
        'excel_description': '分析这份Excel表格的统计特征'
      },
      'chat_with_dashboard': {
        'dashboard_aggregation': '展示监测设备的运行状态数据'
      }
    };

    const chatMode = testData?.agent_step?.[0]?.chat_mode;
    const queryMode = testData?.agent_step?.[0]?.query_mode;
    const userQuestion = userQuestions[chatMode]?.[queryMode] || `测试${scenarioTitle}场景`;

    // 模拟用户消息
    const userMessage = {
      id: userMessageId,
      roundIndex: convContent.length,
      order: convContent.length + 1,
      type: 'human',
      role: 'human',
      context: userQuestion,
      createTime: new Date().toISOString()
    };

    // 模拟AI回复消息
    const aiMessage = {
      id: aiMessageId,
      roundIndex: convContent.length + 1,
      order: convContent.length + 2,
      type: 'ai',
      role: 'ai',
      context: '您好，系统检测到您当前提出的问题意图尚不明确，需进一步澄清。',
      questionData: testData,
      isStreaming: false,
      smLoading: false,
      isDone: true,
      createTime: new Date().toISOString()
    };

    // 更新对话内容 - 先添加用户消息，再添加AI消息
    setConvContent(prev => [...prev, userMessage, aiMessage]);
    
    // 滚动到底部
    setTimeout(() => {
      scrollToBottom();
    }, 100);
    
    console.log('测试意图澄清数据已添加:', { 
      userQuestion, 
      testData, 
      aiMessage: aiMessage,
      hasAgentStep: !!testData?.agent_step 
    });
  };

  // 监听用户滚动事件
  useEffect(() => {
    const chatContainer = chatContainerRef.current;
    if (!chatContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = chatContainer;
      // 如果用户向上滚动超过100px，标记为用户滚动
      if (scrollHeight - scrollTop - clientHeight > 100) {
        setUserScrolled(true);
      } else {
        setUserScrolled(false);
      }
    };

    chatContainer.addEventListener('scroll', handleScroll);
    return () => chatContainer.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // 只有在用户没有主动滚动的情况下才自动滚动
    if (!userScrolled) {
      scrollToBottom();
    }
  }, [convContent, currentMessage, userScrolled]);

  // 监听 conv 变化，切换会话时中断当前的 EventSource 连接
  useEffect(() => {
    // 如果正在请求中，先中断当前请求
    if (isRequesting.current) {
      stopGenerating();
    }

    // 检查空间是否发生变化，如果变化则清空缓存
    const currentSpaceId = conv.space_id;
    // const prevSpaceId = useRef<number | undefined>(undefined); // 移除这行

    if (prevSpaceId.current !== undefined && prevSpaceId.current !== currentSpaceId) {
      // 空间发生变化，清空所有缓存 - redux已注释
      // store.dispatch(clearAllCache());
    }
    prevSpaceId.current = currentSpaceId;

    // 切换对话时清除引用状态
    setSelectedExcel({});
    setReferenceDialog({});

    handleChatHistory()

    // 组装 context
    const { modelName, model_name, ...elseCov } = conv;
    const context = {
      ...elseCov,
      app_code: conv.app_code || conv.chat_mode,
      extra: {
        "db_name": dbName,
        "if_debug": true,
        "dsl_or_db": "db",
        "predict_type": "time_series_predict",
        "predict_param": {},
        "sql": ""
      }
    }
    // 组装 paramData
    const paramData = {
      model: window.APP_CONFIG.VITE_CHAT_MODEL || "qwen3:30b-a3b-fp16",
      stream: true,
      temperature: 0.0,
      max_new_tokens: 4096,
      incremental: true,
      enable_vis: false,
      context: context,
    }
    setParamsData(paramData);
  }, [conv, dbName]);

 // 判断最大对话轮次
 const handleChatHistory = async() => {
    // 如果有 conv_uid 并且缓存中有历史对话记录, 查询接口跟历史对话记录进行对比如果有新增则增量更新否则全量拉取
    if (conv && conv.conv_uid) {
      //是否增量更新
      let isUpdate = false;
      // 最后一个对话的order
      let maxOrder = 0;
      // 是否有缓存对话
      if(userChatHistory.get(conv.conv_uid)) {
        const maxRoundRes = await fetchConvMaxRound({ conv_uid: conv.conv_uid });
        
        // 当前对话记录
        const currentHistory = userChatHistory.get(conv.conv_uid) || [];
        console.log('currentHistory:', currentHistory);
        
        const currentLen = currentHistory.length;
        const maxOrderIndex = currentHistory[currentLen - 1]?.order || 0;
        console.log('maxOrderIndex:', maxOrderIndex, 'maxRoundRes:', maxRoundRes.data);

        if(maxRoundRes.data > maxOrderIndex){
           isUpdate = true
          maxOrder = maxOrderIndex
        };
      }
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
      if(!userChatHistory.get(convUid)) {
      if (agentId) {
        // 直接请求接口
        const res2: any = await fetchRecommendedQuestionOpenings({
          agent_id: agentId,
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
    }
    } catch (error) {
      console.error("",error)
    }
    
    // 获取历史对话
    if (convUid) {
      let result:any = []
      // 如果有历史记录并且没有更新数据则直接利用缓存历史对话
      if(userChatHistory.get(convUid) && !isUpdate) {
        console.log('使用缓存历史对话');
        
        conversationList = conversationList.concat(userChatHistory.get(convUid) || []);
      }else if(userChatHistory.get(convUid) && isUpdate) {
        console.log('增量更新历史对话');
        result = await fetchConvIncrement({
          conv_uid: convUid,
          round_index: maxOrder
        })
        conversationList = conversationList.concat(userChatHistory.get(convUid) || []);
      }else {
        conversationList = [openingMessage];
        console.log('全量拉取历史对话');
        result = await fetchConvHistory({
          conv_uid: convUid,
        });
      }
       
      // 对历史对话进行用户id储存
      if(result?.data?.length > 0) {
        result?.data.forEach((item: any) => {
          setUserDebugInfoMap({
            order:item.order,
            roundIndex:item.order,
          })
          // 提取并保存AI助手的name字段
          if (item.role === 'ai' && item.name && !aiAssistantName.current) {
            aiAssistantName.current = item.name;
          }
        })
      }
      conversationList = conversationList.concat(result?.data || []);
    }
    setUserChatHistory({ conv_uid: convUid, data: conversationList });
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
    setTimeout(scrollToBottom, 300);
  };

  // 添加中断请求的函数
  const stopGenerating = () => {
    if (abortController.current) {
      abortController.current.abort();
      abortController.current = null;
      isRequesting.current = false;
      setLoading(false);
      setIsGettingData(false);
      setSmLoading(false);
      setOtherStatus(false);
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
              isDone: true
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
    setExceptionGuidanceLoading(true)
    const res: any = await fetchExceptionGuidance({...data, extra: { except_guidance: 'true' }});
    console.log(res);
    updateAiMessage({ context: res.content }); // TODO

    setExceptionGuidanceLoading(false)
  }

  const connectWebSocket = (convUid: string, roundIndex: number) => {
    console.log('连接socket');
    
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
        if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
          console.warn('WebSocket连接超时');
          wsRef.current.close();
          setLoading(false);
          setIsGettingData(false);
          setSmLoading(false);
          setOtherStatus(false);
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
          current_stage: 1
        },
        loading: true
      });
      // pingIntervalRef.current = setInterval(() => {
      // if (wsRef.current.readyState === WebSocket.OPEN) {
      //   wsRef.current.send('PING');
      // }
      // }, 30000); // 每30秒发送一次心跳
    };// 接收消息

    let partialMessage = "";  // 存储接收到的部分数据
    wsRef.current.onmessage = (event) => {
      const message = event.data;

      try {
        if (message) {
          // 拼接接收到的数据（如果是分段的消息）
          partialMessage += message;
          // partialMessage = partialMessage.replace(/,\s*([\]}])/g, '$1');

          // 检查拼接后的消息是否是完整的 JSON 对象
          while (partialMessage.startsWith('{') && partialMessage.endsWith('}')) {
            try {
              // 解析完整的 JSON 数据
              const debugInfo = JSON.parse(partialMessage);
              // console.log("message:", debugInfo);
              
              // 如果logs有数据，表示有报错
              if (debugInfo.logs?.length > 0 && debugInfo.logs[0] && !exceptionGuidanceLoading) {
                handleExceptionGuidance({
                  conv_uid: convUid,
                  round_index: roundIndex
                })
              }

              // 确保将完整的debugInfo（包含name.task_name_cn）传递给store
              const enhancedDebugInfo = {
                ...debugInfo,
                // 确保name字段被保留并传递
                name: debugInfo.name || {}
              };

              // 检查chat_mode是否为chat_with_db_execute

              // 原有的复杂逻辑


              // 处理解析后的数据（例如更新状态）
              setDebugInfoMap(enhancedDebugInfo);

              // 处理完成后，清空缓存
              partialMessage = "";
              setHasError(false);  // 重置错误状态，因为消息处理成功
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
    };// 错误处理
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
      setOtherStatus(false);
      isRequesting.current = false;
      message.error('WebSocket连接异常，请重试');
    };
    // 连接关闭
    wsRef.current.onclose = (event) => {
      console.log('WebSocket disconnected', { code: event.code, reason: event.reason, wasClean: event.wasClean });
      
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
        setOtherStatus(false);
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
      setOtherStatus(false);
      isRequesting.current = false;
      message.error('WebSocket连接创建失败，请重试');
    }
  };

  const getAnswer = async ({ type, question, sql, IC }: any) => {
    if (isRequesting.current) {
      return;
    }
    // 生成一个临时对话userid 并储存（使用基础ID + 时间戳确保唯一性）
    const tempUserId = `${baseId}-${Date.now()}`;
    setTempUserId(tempUserId);
   
    setTimeout(scrollToBottom,300)
    // 创建新的 AbortController
    abortController.current = new AbortController();
    const params = _.cloneDeep(paramsData);
    params.messages = question;
    params.context.extra.sql_command = '';
    
    // 为用户消息生成一个临时 ID，以便在后续更新时能找到它
    const userMessage = { context: question, role: 'human', id: Date.now() };
    setConvContent(state => [
      ...state,
      userMessage
    ]);
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
    isMessageAdded.current = false // 重置添加状态，允许添加新的AI消息
    webSocketViewAdded.current = false; // 重置WebSocket ViewEle添加标记
    setSmLoading(false)
    setDoneStatus(false)
    setCurrentMessage('') // 重置当前消息

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
      await fetchEventSource(`${window.APP_CONFIG.VITE_BASE_API}${chatApi}/api/v2/workflow/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
        signal: abortController.current.signal, // 添加 signal
        openWhenHidden: true,
        async onopen(response) {
          console.log('onopen');
          
          // // 继续处理 EventSource 流
          if (response.ok && response.headers.get('content-type') === EventStreamContentType) {
            return;
          }
        },
        async onmessage(event) {
          console.log('onmessage');
          
          // 直接处理原始数据
          if (event.data) {

            if (event.data.includes('round_index')) {
              // 提取 round_index
              const roundIndexMatch = event.data.match(/round_index:(\d+)/);
              if (roundIndexMatch) {
                const extractedRoundIndex = parseInt(roundIndexMatch[1], 10);
                roundIndex = Number(extractedRoundIndex)
                setLoadingRoundIndex(roundIndex);
                console.log('提取到roundIndex:', roundIndex, 'chat_mode:', params?.context?.chat_mode);
                setUserDebugInfoMap({
                  order: tempUserId,
                  roundIndex,
                })
                connectWebSocket(conv.conv_uid, roundIndex || 0)

                // 只在非Excel场景下连接socket
                const isExcelScenario = params?.context?.chat_mode === 'chat_excel';
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
              
              // 处理实时显示的消息
              let displayMessage = messageRef.current;
              if (displayMessage.includes('</think>')) {
                const parts = displayMessage.split('</think>');
                if (!hasTriggeredIsGetting.current) {
                  setIsGettingData(true);
                  hasTriggeredIsGetting.current = true;
                }
                displayMessage = parts[0] || '';
              }
              if (displayMessage.includes('<think>')) {
                displayMessage = displayMessage.split('<think>')[1] || displayMessage;
              }
              // 从显示内容中移除 round_index 部分
              displayMessage = displayMessage.replace(/round_index:\d+,?\s*/, '');
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
                  // 更新现有的AI消息而不是添加新的
                  updateAiMessage({
                    context: parts[0].replace(/\\n/g, '\n').replace('<think>', '').trim(),
                    thinkTime: calculatedThinkTime,
                    roundIndex,
                    smLoading: false, // 结束loading状态
                    isDone: true // 标记完成
                  });
                  
                  // 延迟设置状态，避免同步状态更新冲突
                  setTimeout(() => {
                    setDoneStatus(true);
                    setThinkTime(calculatedThinkTime);
                  }, 0);
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
              setIsGettingData(false);
              // if (searchResult?.data?.items.length === 0) {
              //   return message.error('聊天失败')
              // }
              // setConvContent((state: any) => [
              //   ...state,
              //   {
              //     context: searchResult?.data?.items[0]?.context,
              //     role: 'view',
              //     roundIndex, // 添加 roundIndex
              //     useSimpleStyle: false, // 添加使用简单样式的标记,
              //     feedback: searchResult?.data?.items[0]?.feedback
              //   }
              // ]);

              // setConvContent((state: any) => [
              //   ...state,
              //   {
              //     context:'describe',
              //     describe:true,
              //     role: 'view',
              //     arrowStatus:false,

              // 设置加载状态为false，让备用方案处理数据获取
              setLoading(false)
              setIsGettingData(false);

              // 检查是否为Excel场景或者WebSocket没有添加ViewEle组件的情况
              // 只有在Excel场景或者没有通过WebSocket添加ViewEle的情况下才添加
              const isExcelScenario = params?.context?.chat_mode === 'chat_excel';

              // console.log('Excel场景检查:', {
              //   isExcelScenario,
              //   webSocketViewAdded: webSocketViewAdded.current,
              //   roundIndex,
              //   chatMode: paramsData?.context?.chat_mode
              // });

              if (isExcelScenario || !webSocketViewAdded.current) {
                // 立即添加ViewEle组件，参考master版本的做法
                setConvContent((state: any) => [
                  ...state,
                  {
                    context:'describe',
                    describe:true,
                    role: 'view',
                    arrowStatus:false,
                    roundIndex, // 添加 roundIndex 用于后续数据获取
                  }
                ]);
              }

              return;
            }

            if (event.data.includes('illegal_query')) {
              // 使用正则表达式提取 <think> 标签之间的文本
              const data = event.data
              const regex = /<think>"illegal_query":\s?"(.*?)"<\/think>/;
              const match: any = data.match(regex);

              // 更新现有的AI消息而不是添加新的
              updateAiMessage({
                context: match[1],
                isStreaming: false,
                smLoading: false
              });
            }

            if (event.data.includes('intent_clarify')) {
              const data = JSON.parse(event.data)
              const assemble = {
                data: data || {},
                context: '您好，系统检测到您当前提出的问题意图尚不明确，需进一步澄清。'
              }
              // 更新现有的AI消息而不是添加新的
              updateAiMessage({
                context: assemble.context,
                questionData: assemble.data,
                isStreaming: false,
                smLoading: false
              });
            }
          }
        },
        onclose() {
          console.log('关闭onclose');
          
          setLoading(false);
          setIsGettingData(false);
          setSmLoading(false);
          isRequesting.current = false;
          abortController.current = null;
          // 重置消息添加标记，为下次请求做准备
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
                  isDone: true
                };
              }
              return item;
            });
          });
        },
        onerror(err: any) {
          console.log('EventSource error:', err);
          setLoading(false);
          setIsGettingData(false);
          setSmLoading(false);
          isRequesting.current = false;
          abortController.current = null;
          // 重置消息添加标记，为下次请求做准备
          isMessageAdded.current = false;
          hasTriggeredIsGetting.current = false;
          
          // 显示用户友好的错误提示
          message.error('对话请求失败，请稍后重试');
          
          // 强制更新所有AI消息状态，确保进度条停止
          setConvContent((prevState: any[]) => {
            return prevState.map((item: any) => {
              if (item.role === 'ai' && item.smLoading) {
                return {
                  ...item,
                  smLoading: false,
                  isStreaming: false,
                  isDone: true
                };
              }
              return item;
            });
          });
        },
      });
    } catch (error: any) {
      console.log('Fetch error:', error);
      if (error.name !== 'AbortError') {
        message.error(`获取${question}的答案失败`);
        
        // 强制更新所有AI消息状态，确保进度条停止
        setConvContent((prevState: any[]) => {
          return prevState.map((item: any) => {
            if (item.role === 'ai' && item.smLoading) {
              return {
                ...item,
                smLoading: false,
                isStreaming: false,
                isDone: true
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
    setConvContent(state => [
      ...state,
      { context: params.messages, role: 'human' }
    ]);

    setOtherStatus(true);
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
        res = await fetchRecommendQuestion(params)
        // 推荐维度
      } else {
        res = await fetchDimension(params)
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
              isDone: true
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
            context: type === 'getQa' ? {
              recommendQuestions: res?.data?.recommend_questions
            } : {
              rewrite: type === 'getD' ? res?.data?.recommend?.rec_dim : res?.data?.recommend?.rec_ind
            },
            role: 'view',
            // roundIndex, // 添加 roundIndex
            // useSimpleStyle: false, // 添加使用简单样式的标记,
            // feedback: searchResult?.data?.items[0]?.feedback
          }
        ]
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
              isDone: true
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
              isDone: true
            };
          }
          return item;
        });
      });
      setOtherStatus(false);
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
    setConvContent(state => [
      ...state,
      { context: params.messages, role: 'human' },
      { 
        context: '', 
        role: 'ai', 
        smLoading: true, // 显示进度条
        isStreaming: true,
        isDone: false
      }
    ]);

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
      const res = await fetchQueryRewrite(params)

      // 检查业务状态 - 即使HTTP状态码是200，也可能是业务错误
      if (!res || !res.data || res.data.code === 500 || (res.data.msg && res.data.msg.includes('404 NOT_FOUND')) || (res.data.msg && res.data.msg.includes('ERROR'))) {
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
                isDone: true
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
                isDone: true
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
              isDone: true
            };
            break;
          }
        }
        
        // 添加视图消息
        newState.push({
          context: { recommendQuestions: res?.data?.items },
          role: 'view'
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
              isDone: true
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


  const handleSend = () => {
    if (!inputValue.trim() || loading) return;

    // 构建消息内容，包含文件信息和对话引用信息
    const messageContent = {
      question: inputValue,
      file_id: selectedExcel?.file_id,
      file_name: selectedExcel?.file_name,
      reference_order: referenceDialog?.order,
      reference_context: referenceDialog?.context
    };
    console.log('发送');
    
    // 发送问题
    getAnswer(messageContent);

    // 清空输入框
    setInputValue('');
    // 清空引用的文件
    // handleRemoveExcel();
    // 清空引用的问题
    handleRemoveDialog();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 处理编辑对话
  const handleEdit = () => {
    setCreateModalVisible(true);
  };

  // 处理创建/编辑对话完成
  const handleUpdateConv = async (data: any) => {
    try {
      const res = await updateApp(data);
      if (res?.success) {
        message.success('更新成功');
        setCreateModalVisible(false);
        onUpdateList && onUpdateList(res?.data);
      }
    }
    finally {
    }
  };

  // 处理收藏功能
  const handleStar = async () => {
    const userInfoString = localStorage.getItem('SOY-REACT_userInfo');
    const userInfo = JSON.parse(userInfoString || '{}');
    const res: any = await fetchOperate({
      ...conv,
      type: 2,
      name: conv.biz_name || 'AI智能助手',
      operator: userInfo.userName || '未知用户',
    })
    if (res.code !== 200) {
      message.error(res.msg || '收藏失败，请稍后再试');
      return;
    }
    setIsStarred(!isStarred);
    message.success(isStarred ? '已取消收藏' : '已收藏');
  };

  // 处理分享功能
  const handleShare = () => {
    // setShareModalVisible(true);
    setIsSharing(true);
  };

  // 处理文件上传
  const handleUploadFile = () => {
    setUploadFileVisible(true);
  };

  // 处理历史记录
  const handleHistory = () => {
    setHistoryVisible(true);
  };

  // 处理清空对话
  const handleClearChat = () => {
    Modal.confirm({
      title: '确认清空对话',
      content: '是否确认清空当前对话？清空后无法恢复。',
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          if (conv.conv_uid) {
            await clearConvHistory({
              conv_uid: conv.conv_uid
            });
          }
          setConvContent([]);
          message.success('对话已清空');
        } catch (error) {
          message.error('清空对话失败');
        }
      }
    });
  };

  // 上传excel回调
  const handleUploadOk = (file: any) => {
    setSelectedExcel(file);
    setUploadFileVisible(false);
  }

  // 移除应用excel
  const handleRemoveExcel = () => {
    setSelectedExcel({});
  }
  // 历史记录点击
  const handleHistoryClick = (orderIndex: number) => {
    setHistoryVisible(false);

    const anchorId = `human-msg-${orderIndex}`;
    const targetElement = document.getElementById(anchorId);

    if (targetElement) {
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    } else {
      message.warning('未找到对应的历史消息');
    }
  };

  // 引用
  const getReference = (orderIndex: number) => {
    const questions = getHumanInHistoryByOrderIndex(orderIndex, convContent);
    setReferenceDialog(questions);
  }

  // 清除引用
  const handleRemoveDialog = () => {
    setReferenceDialog({});
  }

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

  const saveDrawerClose = (refresh?: boolean) => {
    if (refresh) {
      onUpdateList && onUpdateList({});
    }
    setSaveVisible(false)
  }

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
          ...updateData,  // 更新
        };
        return updatedState;
      }

      // 如果没有找到返回原数组
      return prevState;
    });
  };

  // 处理 loading 状态
  useEffect(() => {
    
    if (loading && !isMessageAdded.current) {

      setConvContent((prevState: any[]) => [
        ...prevState,
        {
          context: currentMessage,
          // 临时用户id
          order: tempUserId,
          role: 'ai',
          useSimpleStyle: false,
          smLoading: true,
          name: aiAssistantName.current || '', // 添加name字段
        },
      ]);
      isMessageAdded.current = true; // 防止重复添加
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



  // 处理 doneStatus 状态 - 注释掉以避免重复更新
  // useEffect(() => {
  //   if (doneStatus) {
  //     updateAiMessage({ thinkTime });
  //   }
  // }, [doneStatus, thinkTime]);

  // console.log(convContent,'convContent-----')
  const { ref: sharingRef, download } = useScreenshot();
  const renderContent = useCallback(() => {
    const actualSharingList = convContent.reduce((acc, cur) => {
      const matched = sharingList.find((item) => cur.id ? item.id === cur.id : (`${item.role}${item.order}` === `${cur.role}${cur.order}`));
      if (matched) {
        acc.push(cur);
        if (matched.role === 'ai') {
          const matchedView = convContent.find((item) => (item.order === matched.order && item.role === 'view'));
          if (matchedView) acc.push(matchedView);
        }
      }
      return acc;
    }, []);
    return (
      actualSharingList.map((item: any, index: number) => {
        if (item.role === 'human') {
          const anchorId = `human-msg-${item.order}`;
          return (
            <HumanEle
              key={index}
              data={item}
              id={anchorId}
            />
          );
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
              isReadyShare
              isSharing={false}
              key={index}
              data={item}
              getAnswer={getAnswer}
              getRecommend={getRecommend}
              getQueryRewrite={getQueryRewrite}
              paramsData={paramsData}
              convUid={conv.conv_uid}
              chatId={conv.chat_id}
              spaceId={conv.space_id}
              agentId={conv.agent_id}
              onReferenceClick={getReference}
              conv={conv}
              isGettingData={isGettingData}
              setConvContent={setConvContent}
              onMessageUpdate={(updatedMessage: any) => { // <-- 新增的 prop
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
          return (
            <OpeningsEle
              key={index}
              data={item}
              getAnswer={getAnswer}
            />
          )
        }

        return null;
      })
    )
  }, [sharingList])

  const handleShareOk = async () => {
    download();
    const userInfoString = localStorage.getItem('SOY-REACT_userInfo');
    const userInfo = JSON.parse(userInfoString || '{}');
    const res: any = await fetchOperate({
      ...conv,
      type: 3,
      name: conv.biz_name || 'AI智能助手',
      operator: userInfo.userName || '未知用户',
    })
    if (res.code !== 200) {
      message.error(res.msg || '分享失败，请稍后再试');
      return;
    }
    message.success('快照已生成，分享成功');
    setIsSharing(false);
    setConfirmShareVisible(false);
  }

  return (
    <div className="min-w-[400px] flex-1 flex flex-col h-full">
      <header className="flex items-center justify-between border-b-2 border-[#3470f6] bg-[#e8eefb] p-2 sticky top-0 z-10">
        <div className="flex items-center">
          <span>{conv.biz_name || 'AI智能助手'}</span>
        </div>
        <span className="flex items-center gap-2">
          <span className="cursor-pointer text-[12px] text-[#8a8a8a] hover:text-[#2E6CF6]"
            onClick={handleEdit}>
            <SvgIcon localIcon="edit" className="w-5 h-5 text-[#8a8a8a] hover:text-[#2E6CF6]" />
          </span>
          <span
            className="cursor-pointer text-[12px] text-[#8a8a8a] hover:text-[#2E6CF6]"
            onClick={handleStar}
          >
            <SvgIcon localIcon={isStarred ? "star-fill" : "star"} className="w-5 h-5" />
          </span>
          <span
            className="cursor-pointer text-[12px] text-[#8a8a8a] hover:text-[#2E6CF6]"
            onClick={() => setSaveVisible(true)}
          >
            <SvgIcon localIcon="save" className="w-5 h-5" />
          </span>
          {/* 暂时隐藏分享按钮 */}
          <span
            className="cursor-pointer text-[12px] text-[#8a8a8a] hover:text-[#2E6CF6]"
            onClick={handleShare}
          >
            <SvgIcon localIcon="share-blue" className="w-5 h-5" />
          </span>

          <span
            className="cursor-pointer text-[12px] text-[#8a8a8a] hover:text-[#2E6CF6]"
            onClick={onClose}
          >
            <CloseOutlined className="w-5 h-5" />
          </span>
        </span>
      </header>

      <div
        ref={chatContainerRef}
        className="overflow-y-auto bg-white p-4 flex-1 scroll-smooth"
        style={{ height: 'calc(100vh - 250px)' }}
      >
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
              <CheckboxWrapCom
                key={index}
                convContent={convContent}
                checkAll={checkAll}
                setSharingList={setSharingList}
                isSharing={isSharing}
                data={item}
              >
                <HumanEle
                  data={item}
                  id={anchorId}
                />
              </CheckboxWrapCom>
            );
          } else if (item.role === 'ai') {
            return (
              <CheckboxWrapCom
                key={index}
                convContent={convContent}
                checkAll={checkAll}
                setSharingList={setSharingList}
                isSharing={isSharing}
                data={item}
              >
                <AiEle
                  loading={loading}
                  isStorage={isStorage}
                  data={item}
                  isDone={doneStatus}
                  thinkTime={item.thinkTime}
                  useSimpleStyle={item.useSimpleStyle}
                  setCur={setCur}
                  setDebugModalVisible={() => {
                    setDebugModalVisible(true)
                    connectWebSocket(conv.conv_uid, userDebugInfoMap.get(item.order)?.roundIndex || 0)
                  }}
                  getAnswer={getAnswer}
                  onMessageUpdate={(updatedMessage: any) => { // <-- 新增的 prop
                    if (conv.conv_uid) {
                      // console.log('====================================');
                      // console.log('触发AI保存回调 id:', conv.conv_uid);
                      // console.log('触发AI保存回调 message:', updatedMessage);
                      // console.log('====================================');

                      // redux缓存已注释
                      // store.dispatch(upsertConvHistoryToCache({
                      //   convUid: conv.conv_uid,
                      //   message: updatedMessage
                      // }));
                      // 注释掉这行，避免重置doneStatus影响后续流程
                      // setDoneStatus(false)
                      setIsStorage(true)
                    }
                  }}
                />
              </CheckboxWrapCom>
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
                paramsData={paramsData}
                convUid={conv.conv_uid}
                chatId={conv.chat_id}
                spaceId={conv.space_id}
                agentId={conv.agent_id}
                onReferenceClick={getReference}
                conv={conv}
                isDone={doneStatus}
                isGettingData={isGettingData}
                setConvContent={setConvContent}
                onMessageUpdate={(updatedMessage: any) => { // <-- 新增的 prop
                  if (conv.conv_uid) {
                    // console.log('====================================');
                    // console.log('触发保存回调 id:', conv.conv_uid);
                    // console.log('触发保存回调 message:', updatedMessage);
                    // console.log('====================================');
                    // // redux缓存已注释
                    // store.dispatch(upsertConvHistoryToCache({
                    //   convUid: conv.conv_uid,
                    //   message: updatedMessage
                    // }));
                  }
                }}
              />
            );
          } else if (item.role === 'first') {
            return (
              <OpeningsEle
                key={index}
                data={item}
                getAnswer={getAnswer}
              />
            )
          }

          return null;
        })}
        {/* {loading && (
          <>
            <AiEle
              loading
              data={{ context: currentMessage }}
              isNew
              setCur={setCur}
              setDebugModalVisible={setDebugModalVisible}
            />
            { isGettingData &&
              <Card className="ml-10">
                <div className="flex items-center"><Spin indicator={<LoadingOutlined spin />} /><span className="ml-10">正在执行查询，请稍后...</span></div>
              </Card>
            }
          </>
        )} */}
      </div>

      <div className="pt-2 pb-6 pr-4 pl-4 shadow-2xl sticky bottom-0 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        {
          isSharing ? (
            <SharingModal
              handleConfirmShare={() => {
                setConfirmShareVisible(true)
              }}
              convContent={convContent}
              checkAll={checkAll}
              setCheckAll={setCheckAll}
              setIsSharing={setIsSharing}
              sharingList={sharingList}
            />
          ) : (
            <>
              {/* 推荐问题区域 */}
              <div className="p-2 flex items-center justify-between" style={{ userSelect: 'none' }}>
                {/* 推荐问题区域 - 左侧 */}

                {/* <div className="flex items-center flex-1 overflow-hidden">
                  <div className="text-gray-500 mr-4 text-sm whitespace-nowrap">推荐问题</div>
                  <div className="flex flex-nowrap overflow-x-auto">
                  </div>
                </div> */}

                {/* excel文件引用 - 左侧 */}
                <div className="w-full">
                  {
                    selectedExcel.file_id &&
                    <FileTag
                      fileId={selectedExcel.file_id}
                      fileName={selectedExcel.file_name}
                      onClose={handleRemoveExcel}
                    />
                  }
                  {
                    referenceDialog.order &&
                    <FileTag
                      fileId={referenceDialog.order}
                      fileName={referenceDialog.context}
                      prefixText="#Dialog"
                      showDownloadIcon={false}
                      showFileIcon={false}
                      onClose={handleRemoveDialog}
                    />
                  }
                </div>

                {/* 功能按钮区域 - 右侧 */}
                <div className="flex items-center ml-2">
                  <span
                    className="cursor-pointer px-2 text-[12px] text-[#8a8a8a] hover:text-[#2E6CF6]"
                    onClick={handleUploadFile}
                    title="上传文件"
                  >
                    <SvgIcon localIcon="file-link" className="w-5 h-5" />
                  </span>
                  <span
                    className="cursor-pointer px-2 text-[12px] text-[#8a8a8a] hover:text-[#2E6CF6]"
                    onClick={handleHistory}
                    title="历史记录"
                  >
                    <SvgIcon localIcon="history" className="w-5 h-5" />
                  </span>
                  <span
                    className="cursor-pointer px-2 text-[12px] text-[#8a8a8a] hover:text-[#2E6CF6]"
                    onClick={handleClearChat}
                    title="清空对话"
                  >
                    <SvgIcon localIcon="delete" className="w-5 h-5" />
                  </span>
                </div>
              </div>

              {/* 输入框区域 */}
              <div className="relative">
                <Input.TextArea
                  autoFocus
                  placeholder="请输入您想了解的问题"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pr-12"
                  autoSize={{ minRows: 1, maxRows: 4 }}
                />
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                  {/* 语音录制按钮 */}
                  <AudioRecorder
                    onTranscribed={(text) => {
                      setInputValue(text); // 将识别的文本设置到输入框
                    }}
                    disabled={loading}
                  />
                  {/* 发送按钮 */}
                  <div
                    className="cursor-pointer p-1"
                    onClick={loading ? stopGenerating : handleSend}
                  >
                    <SvgIcon
                      localIcon={loading ? "stop" : "send"}
                      className={`w-6 h-6 ${loading ? 'text-red-500 hover:text-red-600' : 'text-[#3470f6] hover:text-[#2E6CF6]'}`}
                    />
                  </div>
                </div>
              </div>
            </>
          )
        }
      </div>

      {/* 添加抽屉和模态框组件 */}
      <HistoryDrawer
        open={historyVisible}
        onClose={() => setHistoryVisible(false)}
        onHistoryClick={handleHistoryClick}
        currentConv={conv}
      />
      <ShareModal
        open={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
      />
      <Modal
        width={1200}
        title='再次确认'
        open={confirmShareVisible}
        onCancel={() => setConfirmShareVisible(false)}
        classNames={{
          body: 'h-[300px] overflow-auto'
        }}
        onOk={handleShareOk}
        okText='确定'
        cancelText='取消'
      >
        <div ref={sharingRef}>
          {renderContent()}
        </div>
      </Modal>
      <SaveDrawer
        open={saveVisible}
        onClose={(refresh?: boolean) => saveDrawerClose(refresh)}
        conv={conv}
      />
      <UploadDrawer
        open={uploadFileVisible}
        conv={conv}
        onOk={handleUploadOk}
        onClose={() => setUploadFileVisible(false)}
      />
      <CreateModal
        visible={createModalVisible}
        onClose={async (val: any) => {
          if (val) {
            await handleUpdateConv(val);
          }
          else {
            setCreateModalVisible(false);
          }
        }}
        isEdit={true}
        initialValues={{
          ...conv,
          title: conv.title || 'AI智能助手',
          biz_name: conv.biz_name || 'AI智能助手'
        }}
      />
      {
        debugModalVisible ? (
          <>
            <ModelDebugModal
              thinkTime={cur?.thinkTime || thinkTime}
              convUid={conv?.conv_uid}
              roundIndex={cur?.roundIndex || loadingRoundIndex}
              open={debugModalVisible}
              onClose={() => {
                setDebugModalVisible(false)
                if(wsRef.current) {
                  wsRef.current.close();
                }
              }}
            />
          </>
        ) : null
      }
    </div>
  );
});

export default Conversation;