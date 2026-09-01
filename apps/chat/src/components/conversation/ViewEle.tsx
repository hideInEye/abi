/**
 * 视图展示组件
 * 用于展示AI返回的数据可视化结果
 * 支持图表、表格等多种数据展示形式
 * @module ViewEle
 */

import React, { useCallback, useEffect, useMemo, useRef, useState, } from "react";
import { Button, Spin, Table, message, ConfigProvider, Typography } from "antd";
import zhCN from 'antd/es/locale/zh_CN';
import { format } from 'sql-formatter';
import SvgIcon from "../../components/SvgIcon";
// @ts-ignore - react-syntax-highlighter 类型定义问题
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
// @ts-ignore
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { EChart } from "../../components/react-echarts";
import PieLegend from "../../components/PieLegend";
const { Text } = Typography;
import ShareModal from "./ShareModal";
import ChartConfigModal from "./ChartConfigModal";
import ModelDebugModal from "./ModelDebugModal";
import FullscreenModal from "./FullscreenModal";
import ChartHeader from "./components/ChartHeader";
import { SUPPORTED_RENDER_TYPES, getChartTypeItem } from './components/chartTypeCatalog';
import StatisticsAnalysis from './components/StatisticsAnalysis';
import PredictionAnalysis from './components/PredictionAnalysis';
import styles from './styles.module.css';
import s from './index.module.css'
import CausalAnalysis from "./components/CausalAnalysis";
import AttributionDashboard from "./components/AttributionDashboard";
import { parseContext, parseJsonContent, isNotEmptyObject, stripHtmlTags } from '@/utils';
import { processChartData, getChartOption, parseISO8601Duration, parseISODate } from './helpers/chartOption';
import { handleDataExport, handleImageExport, handleExcelFileExport } from './helpers/download';
import FileTag from "@/components/FileTag"; // 引入文件组件
import { fetchDrillDown, fetchQueryRewrite, setExperteval, searchConv } from '../../service/api/conv';
import { fetchSemanticGroups } from '../../service/api/semantic';
import { CloseOutlined, RedoOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { marked } from 'marked';
import { CHAT_MODE_MAP } from '../../constant/chat';
import { useDebugStore } from '../../store';

/**
 * 组件属性接口定义
 * @interface PropsType
 * @property {Object} data - 组件数据对象
 * @property {string} data.context - 上下文内容
 * @property {Function} [getAnswer] - 获取回答的回调函数
 * @property {Function} [getRecommend] - 获取推荐问题等的回调函数
 * @property {Function} [getQueryRewrite] - 推荐维度、推荐指标、归因分析、预测分析的回调函数
 * @property {string} [convUid] - 会话唯一标识
 * @property {string} [chatId] - 聊天ID
 * @property {number} [spaceId] - 空间ID
 * @property {string} [agentId] - 代理ID
 */
interface PropsType {
  isReadyShare?: boolean;
  isSharing: boolean;
  data: {
    context: string;
    order: number;
    roundIndex: number;
    describe?: boolean;
    arrowStatus?: boolean;
  };
  getAnswer?: (props: any) => void;
  getRecommend?: (props: any) => Promise<any> | any;
  getQueryRewrite?: (props: any) => void;
  convUid?: string;
  chatId?: string;
  spaceId?: number;
  agentId?: string;
  conv: any,
  isGettingData?: boolean,
  isDone?: boolean;
  onReferenceClick?: (props: any) => void;
  setConvContent: React.Dispatch<React.SetStateAction<any[]>>;
  onDelete?: (data: any) => void; // 进入批量删除选择模式
  onRegenerate?: (data: any) => void; // 重新生成（以相同问题重新发起一轮）
  isLast?: boolean; // 是否为最后一组对话（仅最后一组显示重新生成）
  versionInfo?: { activeIndex: number; total: number; onChange: (i: number) => void }; // 多版本分页（重新生成后展示层合并）
  shareOrder?: number; // 分享预选用的轮次（多版本合并块中复选框挂在 v0 human 上，与当前版本 order 不同）
  onMessageUpdate?: (updatedMessage: any) => void; // <-- 新增
}

/**
 * 图表配置接口定义
 * @interface ChartConfig
 * @property {string} theme - 主题
 * @property {string} font - 字体
 * @property {number} fontSize - 字体大小
 * @property {boolean} [showTypeSelect] - 是否显示类型选择
 */
interface ChartConfig {
  theme: string;
  font: string;
  fontSize: number;
  showTypeSelect?: boolean;
  chartStyle: {
    color: string;
    textColor: string;
  };
}

const getRecommendParams = (conv: any, data: any, type: string, message?: string) => {
  const messagesMap: any = {
    getQa: '推荐问题',
    getD: '推荐维度',
    getI: '推荐指标'
  }
  const { dbName, conv_uid, chat_id, agent_id, space_id, app_code, chat_mode, user_name, sys_code } = conv
  const params = {
    messages: type ? messagesMap[type] : message,
    model: window.APP_CONFIG.VITE_CHAT_MODEL,
    stream: false,
    temperature: 0,
    max_new_tokens: 4096,
    incremental: false,
    enable_vis: false,
    context: {
      conv_uid,
      chat_id,
      agent_id,
      space_id,
      app_code: app_code || '',
      chat_mode,
      user_name,
      sys_code,
      extra: {
        "db_name": dbName,
        "round_index": data.roundIndex || 0
      }
    }
  }
  return params
}

const oneBatch = 3;

/**
 * 视图展示组件
 * @param {PropsType} props - 组件属性
 * @returns {JSX.Element} 视图组件
 */
const ViewEle: React.FC<PropsType> = ({
  isReadyShare,
  isSharing,
  data, 
  getAnswer,
  getRecommend,
  getQueryRewrite,
  convUid,
  chatId,
  spaceId,
  agentId,
  conv,
  isDone,
  isGettingData,
  onReferenceClick,
  setConvContent,
  onDelete,
  onRegenerate,
  isLast,
  versionInfo,
  shareOrder,
  onMessageUpdate // <-- 新增
}, ref) => {
  const [chartData, setChartData] = React.useState<any>(null);
  const [queryResult, setQueryResult] = React.useState<{ sql?: string; data?: any[] }>({});
  const [contextError, setContextError] = React.useState<any>(null);
  const [batchIndex, setBatchIndex] = useState(0);
  // 推荐问题内嵌展示（点击底部灯泡后，直接在当前回答下方展示，不新增消息）
  const [recList, setRecList] = useState<string[]>([]);
  // 推荐问题三类原始数据（后端一次性返回，本地切片展示）
  const [recData, setRecData] = useState<{ ask: string[]; root: string[]; forecast: string[] }>({ ask: [], root: [], forecast: [] });
  // 「换一批」批次计数（灯泡模式下循环用）
  const [recBatch, setRecBatch] = useState(0);
  // 推荐问题后端业务错误信息（success: false 时的 err_msg）
  const [recError, setRecError] = useState('');
  const [loading, setLoading] = useState(false);
  const [drillDownData, setDrillDownData] = useState<{ data: any[]; columns: any[]; } | null>(null);
  // 添加图表相关的状态
  const [shareModalVisible, setShareModalVisible] = React.useState(false);
  const [configModalVisible, setConfigModalVisible] = React.useState(false);
  const [debugModalVisible, setDebugModalVisible] = React.useState(false);
  const [fullscreenModalVisible, setFullscreenModalVisible] = React.useState(false);
  // 模型调试数据流 WebSocket 引用
  const wsRef = useRef<WebSocket | null>(null);
  const wsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { setDebugInfoMap } = useDebugStore();
  const [activeType, setActiveType] = React.useState('table');
  // 图表配置状态
  const [chartConfig, setChartConfig] = React.useState<ChartConfig>({
    theme: 'light',
    font: 'Arial',
    fontSize: 12,
    chartStyle: {
      color: '#2FA4FF,#7ACBFF,#A67AFF,#F7A45C,#6E6E6E,#50C878',
      textColor: '#333333'
    }
  });
  const echartRef = useRef<import('../../components/react-echarts/components/EChart').EChartHandle>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  //当前图表状态
  const [chartType, setChartType] = React.useState<string>('response_bar_chart');
  //描述loding
  const [mLoading, setMLoading] = useState(false);
  // 记录 searchConv 接口是否已经调用过，防止重复调用
  const hasCalledSearchConvRef = useRef(false);
  // 分页状态
  const [pageSize, setPageSize] = React.useState<number>(10);
  const [currentPage, setCurrentPage] = React.useState<number>(1);

  // 记录内容高度
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | string>("auto");

  // 控制图表滚动条显示（通过 CSS 类名控制）
  const [isChartHovered, setIsChartHovered] = useState(false);

  // 动态计算内容高度
  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [data]);

  useEffect(() => {
    // 简化数据获取触发条件，参考master版本
    // 当组件初始化且context为简单的'describe'时，自动获取数据
    // 但如果是WebSocket已经提供了完整数据的情况，则不需要再次获取
    if(data.context === 'describe' && !data.arrowStatus && !mLoading && !chartData?.data){
      fetchData()
    }
  }, [data.context, data.arrowStatus, mLoading, chartData?.data])


  // 导出功能
  const handleDownload = async (key: string) => {
    if(!chartData?.data || chartData?.data?.length === 0) {
      message.warning('暂无数据可导出');
      return;
    }
    const baseName = conv.biz_name || '数据';
    try {
      if (['csv', 'excel'].includes(key)) {
       // chat_excel 模式使用新接口
       if (chartData?.chat_mode === 'chat_excel') {
        await handleExcelFileExport({
          fileName: baseName,
          file_id: chartData?.file_id,
          python: chartData?.python_code,
          format: key === 'excel' ? 'excel' : 'csv'
        });
      } else {
        // 其他模式使用原接口
        if(!chartData.sql) {
          message.warning('未找到可导出的SQL语句, 请联系管理员或重新发起查询');
          return;
        }
        await handleDataExport({
          key: key as 'csv' | 'excel',
          fileName: baseName,
          exportData: {
            convUid,
            chatId,
            spaceId,
            agentId,
            chatMode: chartData?.chat_mode,
            unionSql: chartData?.sql
          }
        });
      }
      } else {
        if (!['table', 'chart'].includes(activeType)) {
          message.warning('请切换到表格或图表再点击进行下载图片');
          return;
        }
        await handleImageExport(
          activeType as 'table' | 'chart',
          activeType === 'table' ? tableRef : echartRef,
          baseName
        );
      }
    }
    catch (error: any) {
      console.error('导出失败:', error);
      message.error(error.message || '文件导出失败，请重试');
    }
  };

  // 添加控制图表图标显示的逻辑
  const [showChartIcon, setShowChartIcon] = React.useState(false);
  // 箭头状态
  const [isCollapsed, setIsCollapsed] = useState(!isReadyShare); 
  const isFirstRender = useRef(true);

  React.useEffect(() => {
    let contextData;
    // console.log(data.context, '--------------- data.context')
    try {
      // 推荐问题 - 检查context是否为对象类型
      if (typeof data.context === 'object' && data.context?.recommendQuestions !== undefined) {
        setBatchIndex(0);
        setChartData(data.context);
        
        return;
      } else if (typeof data.context === 'object' && data.context?.rewrite) {
        // 问题改写
        setBatchIndex(0);
        setChartData(data.context);
        return;
      } else if (typeof data.context === 'string' && data.context.includes('<chart-view')) {
        contextData = parseContext(data.context);
        // console.log('contextData from chart-view:', contextData);
      } else if (typeof data.context === 'string' && (data.context.includes('{"element"') || data.context.includes('{\"element\"'))) {
        contextData = parseJsonContent(data.context);
        // console.log('contextData from element:', contextData);
      } else if (typeof data.context === 'string' && (data.context === 'describe' || data.context.includes('describe'))) {
        // 参考master版本，当context为'describe'时，设置为空，等待后续数据获取
        contextData = '';
        // 如果是复杂的describe数据（比如WebSocket添加的JSON字符串），尝试解析
        if (data.context !== 'describe') {
          try {
            const parsedContext = JSON.parse(data.context);
            // 检查是否是WebSocket添加的数据格式
            if (parsedContext.chat_mode && parsedContext.data && parsedContext.sql) {
              contextData = parsedContext;
            } else {
              contextData = '';
            }
          } catch (error) {
            console.error('Failed to parse describe context:', error);
            contextData = '';
          }
        }
      } else {
        setContextError(data.context);
      }
    } catch (error) {
      console.error('context 格式错误', data.context);
      return;
    }
    setChartData({ ...contextData, feedback: (data as any).feedback });

    // 根据 type 决定是否显示图表图标和设置默认展示类型
    const hasChartType = contextData?.type;
    setShowChartIcon(hasChartType);
    
    // 定义有效的图表类型白名单，避免设置 response_error 等无效类型
    const validChartTypes = [
      'response_bar_chart',
      'response_line_chart',
      'response_area_chart',
      'response_pie_chart',
      'response_donut_chart',
      'response_many_bar_chart',
      'response_many_line_chart'
    ];
    
    // 根据后端返回的图表类型设置 chartType，避免始终默认为柱状图
    // 只有当类型在白名单中且不是 response_table 时才设置
    if (hasChartType && hasChartType !== 'response_table' && validChartTypes.includes(hasChartType)) {
      setChartType(hasChartType);
    }
    
    if (hasChartType === "response_table") {
      setActiveType('table');
    } else {
      setActiveType('chart');
    }
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
  }, [data.context]);


  // const updatePropsData = () => {
  //   console.log('====================================');
  //   console.log('props update:', data);
  //   console.log('====================================');
  //   // onMessageUpdate && onMessageUpdate(data)
  //   // fetchData()
  // }


  // 图表相关的处理函数
  const handleTypeChange = (type: string) => {
    setActiveType(type);
  };

  const handleShareClick = () => {
    setShareModalVisible(true);
  };

  const handleConfigClick = () => {
    setConfigModalVisible(true);
  };

  // 建立 WebSocket 连接，拉取模型调试数据流
  const connectDebugWebSocket = useCallback((cUid: string, rIndex: number) => {
    // 关闭现有连接
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (!cUid) {
      console.warn('缺少 conv_uid，无法建立模型调试连接');
      return;
    }
    try {
      const baseUrl = window.APP_CONFIG?.VITE_WEBSOCKET_API || '';
      if (!baseUrl) {
        message.error('未配置 WebSocket 地址，无法获取调试数据');
        return;
      }
      const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      const url = `${normalizedBaseUrl}/ws-proxy/abi-debug/ws/stream/consume?convUid=${cUid}&roundIndex=${rIndex}`;

      // [临时调试] 打印实际连接的 WS 地址
      console.log('[模型调试][WS连接]', url);

      wsRef.current = new WebSocket(url);

      // 连接超时定时器
      if (wsTimeoutRef.current) clearTimeout(wsTimeoutRef.current);
      wsTimeoutRef.current = setTimeout(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
          console.warn('WebSocket连接超时');
          wsRef.current.close();
          message.error('WebSocket连接超时，请重试');
        }
        wsTimeoutRef.current = null;
      }, 10000);

      // 连接打开：写入初始 loading 占位
      wsRef.current.onopen = () => {
        console.log('[模型调试][WS onopen] 连接已建立，等待后端推送数据...');
        if (wsTimeoutRef.current) {
          clearTimeout(wsTimeoutRef.current);
          wsTimeoutRef.current = null;
        }
        setDebugInfoMap({
          uid: `${cUid}_${rIndex}`,
          metrics: { current_stage: 1 },
          loading: true,
        });
      };

      // 接收消息：分段拼接后解析完整 JSON
      let partialMessage = '';
      wsRef.current.onmessage = (event: MessageEvent) => {
        const msg = event.data;
        // [临时调试] 打印每一帧原始数据，确认后端是否真的推了东西
        console.log('[模型调试][WS onmessage] 原始帧:', msg);
        if (!msg) return;
        partialMessage += msg;
        while (partialMessage.startsWith('{') && partialMessage.endsWith('}')) {
          try {
            const debugInfo = JSON.parse(partialMessage);
            // [临时调试] 打印后端推送的 metrics，核对 total_tokens/total_time
            console.log('[模型调试][ViewEle] metrics:', debugInfo?.metrics, 'full:', debugInfo);
            setDebugInfoMap({ ...debugInfo, name: debugInfo.name || {} });
            partialMessage = '';
          } catch {
            // JSON 尚未完整，等待更多数据
            break;
          }
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        if (wsTimeoutRef.current) {
          clearTimeout(wsTimeoutRef.current);
          wsTimeoutRef.current = null;
        }
        message.error('WebSocket连接异常，请重试');
      };

      wsRef.current.onclose = () => {
        console.log('[模型调试][WS onclose] 连接已关闭');
        if (wsTimeoutRef.current) {
          clearTimeout(wsTimeoutRef.current);
          wsTimeoutRef.current = null;
        }
      };
    } catch (error) {
      console.error('建立模型调试连接失败:', error);
      message.error('建立模型调试连接失败');
    }
  }, [setDebugInfoMap]);

  // 关闭模型调试连接
  const closeDebugWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (wsTimeoutRef.current) {
      clearTimeout(wsTimeoutRef.current);
      wsTimeoutRef.current = null;
    }
  }, []);

  const handleDebugClick = () => {
    // [临时调试] 对比"请求的 roundIndex"与"弹窗读取的 key"，定位 暂无调试数据 是否为 key 不一致
    console.log('[模型调试][打开]', {
      conv_uid: conv?.conv_uid,
      'data.roundIndex': data?.roundIndex,
      '请求roundIndex(?? 0)': data?.roundIndex ?? 0,
      '弹窗读取key': `${conv?.conv_uid}_${data?.roundIndex}`,
    });
    setDebugModalVisible(true);
    connectDebugWebSocket(conv?.conv_uid, data?.roundIndex ?? 0);
  };

  // 组件卸载时清理 WebSocket
  useEffect(() => {
    return () => {
      closeDebugWebSocket();
    };
  }, [closeDebugWebSocket]);

  const handleFullscreenClick = () => {
    setFullscreenModalVisible(true);
  };

  const handleGetChartType = (type: string) => {
    // 检测X轴维度数量
    const chartDataClone = isNotEmptyObject(queryResult) && queryResult || chartData;
    if (chartDataClone?.data && chartDataClone.data.length > 0) {
      // 获取所有非数值字段作为维度字段
      const firstItem = chartDataClone.data[0];
      const allKeys = Object.keys(firstItem);
      const dimensionFields = allKeys.filter(key => {
        const value = firstItem[key];
        // 排除数值字段
        if (typeof value === 'number') return false;
        if (typeof value === 'string') {
          const numValue = parseFloat(value);
          if (!isNaN(numValue) && isFinite(numValue) && numValue === Number(value.trim())) {
            return false;
          }
        }
        return true;
      });
      
      // 如果维度字段超过1个（X轴超过1个维度），显示提醒
      if (dimensionFields.length > 1) {
        message.warning({
          content: `当前数据包含多个维度，图表仅展示两个维度的数据`,
          duration: 3,
        });
      }
    }
    
    setChartType(type);
  };

  // 处理图表配置确认
  const handleConfigConfirm = (config: ChartConfig) => {
    setChartConfig(config);
    setConfigModalVisible(false);
  };

  // 依据数据语义分组名称解析分组 id
  // 历史/实时回答内容里只带 semantic_group_name（名称），不带 group_id，
  // 因此按名称调用分组列表接口反查出 groupId。
  const resolveSemanticGroupId = async (): Promise<number | string | null> => {
    // 回答内容若已直接带 group_id 则优先使用
    if (chartData?.group_id != null) return chartData.group_id;
    const groupName = chartData?.semantic_group_name;
    if (!groupName) return null;
    try {
      const res: any = await fetchSemanticGroups({
        groupType: 'shema',
        pageNum: 1,
        pageSize: 100,
        spaceId: spaceId ?? conv?.space_id,
        groupName,
      });
      const list: any[] = res?.data || res?.rows || [];
      const matched = Array.isArray(list)
        ? (list.find((g: any) => String(g?.groupName) === String(groupName)) ?? list[0])
        : null;
      return matched?.groupId ?? null;
    } catch (error) {
      console.error('解析数据语义分组 id 失败:', error);
      return null;
    }
  };

  // 处理点赞（在原有 convUid + roundIndex + status 基础上附带 groupId / semanticId / appId）
  const handleLike = async (payload: any) => {
    try {
      const groupId = await resolveSemanticGroupId();
      const res: any = await setExperteval({
        convUid,
        roundIndex: data.order || data.roundIndex,
        status: payload?.status, // 0=无评价, 1=点赞, -1=点踩
        groupId,
        semanticId: chartData?.semantic_id ?? null,
        appId: conv?.appId ?? conv?.app_id ?? 0,
      });
      // 兼容两种响应结构：{ success: true, ... } 与 { code: 200, data: ..., msg: ... }
      const isSuccess = res?.success === true || Number(res?.code) === 200;
      if (isSuccess) {
        const msg = payload?.status === 1 ? '感谢您的点赞' : '感谢您的反馈';
        message.success(msg)
        // 后端仅返回 true，本地用本次操作值构造 feedback，保证图标高亮状态
        setChartData({ ...chartData, feedback: { status: payload?.status, eval_user: payload?.eval_user } });
      }
      else {
        message.error(res?.msg || res?.err_msg || '操作失败');
      }
    }
    catch (error) {
      console.error('操作:', error);
      message.error('操作失败');
    }
  };

  // 每批展示数量、循环类别顺序（问数 → 归因 → 预测）
  const REC_PAGE = 3;
  const REC_CYCLE_KEYS: Array<'ask' | 'root' | 'forecast'> = ['ask', 'root', 'forecast'];

  // 调用推荐问题接口；普通推荐（不传 recommendChatMode）返回三类问题列表；
  // 归因=analysis、预测=forecast 时后端返回语义画像 metrics/dimensions/entities（供拼句面板用）
  const fetchRecData = async (recommendChatMode = ''): Promise<{ ask: string[]; root: string[]; forecast: string[]; metrics: any[]; dimensions: any[]; entities: any[]; errMsg?: string } | null> => {
    if (!getRecommend) return null;
    setRecError('');
    try {
      // 传入本轮次 order/roundIndex（供 hook 回填用户问题与实时选中语义）、回答内嵌的数据语义（历史对话用）以及推荐模式参数
      const res = await getRecommend({
        order: data?.order,
        roundIndex: data?.roundIndex,
        semanticId: chartData?.semantic_id,
        recommendChatMode,
      });
      // 后端业务错误（如未找到匹配的数据语义）：设置内联错误文本，风格与 rewrite/contextError 分支一致
      if (res?.errMsg) {
        setRecError(res.errMsg);
        return null;
      }
      return {
        ask: Array.isArray(res?.ask) ? res.ask : [],
        root: Array.isArray(res?.root) ? res.root : [],
        forecast: Array.isArray(res?.forecast) ? res.forecast : [],
        metrics: Array.isArray(res?.metrics) ? res.metrics : [],
        dimensions: Array.isArray(res?.dimensions) ? res.dimensions : [],
        entities: Array.isArray(res?.entities) ? res.entities : [],
      };
    } catch (error) {
      console.error('获取推荐问题失败:', error);
      message.error('获取推荐问题失败');
      return null;
    }
  };

  // 按「换一批」计数从缓存数据切出 3 个：类别按 问数→归因→预测 循环，每绕一圈类别内偏移 +3（循环取）
  const sliceRecByBatch = (
    dataObj: { ask: string[]; root: string[]; forecast: string[] },
    batch: number
  ): string[] => {
    const key = REC_CYCLE_KEYS[batch % REC_CYCLE_KEYS.length];
    const arr = dataObj[key] || [];
    if (arr.length === 0) return [];
    const round = Math.floor(batch / REC_CYCLE_KEYS.length);
    const offset = (round * REC_PAGE) % arr.length;
    const result: string[] = [];
    for (let i = 0; i < REC_PAGE && i < arr.length; i++) {
      result.push(arr[(offset + i) % arr.length]);
    }
    return result;
  };

  // 打开归因/预测拼句模板：作为独立消息追加到会话末尾（像意图澄清一样单独一条），
  // 不在当前回答下方内嵌展示；同一时间只保留一个模板消息
  const openClarifyTemplate = (mode: 'analysis' | 'forecast', metrics: any[], dimensions: any[]) => {
    setConvContent((prevState) => [
      ...prevState.filter((item: any) => item?.role !== 'analysis_clarify'),
      {
        role: 'analysis_clarify',
        order: `clarify-${Date.now()}`,
        context: { mode, metrics, dimensions },
        // 发送时带上当前回答内嵌的数据语义/分组，保证新一轮提问不丢语义信息
        _meta: {
          groupName: chartData?.semantic_group_name || '',
          semanticName: chartData?.semantic_name || '',
          semanticSchemaId: chartData?.semantic_id,
        },
      },
    ]);
  };

  // 处理预测分析点击：带 recommend_chat_mode=forecast 请求语义画像，追加独立拼句模板消息
  const handlePredictClick = async () => {
    const res = await fetchRecData('forecast');
    if (!res) return;
    if (!res.metrics.length && !res.dimensions.length) {
      message.warning('未获取到可用的指标/维度信息');
      return;
    }
    setRecList([]);
    openClarifyTemplate('forecast', res.metrics, res.dimensions);
  };

  // 处理归因分析点击：带 recommend_chat_mode=analysis 请求（后端实际拼写）语义画像，追加独立拼句模板消息
  const handleAttributionClick = async () => {
    const res = await fetchRecData('analysis');
    if (!res) return;
    if (!res.metrics.length && !res.dimensions.length) {
      message.warning('未获取到可用的指标/维度信息');
      return;
    }
    setRecList([]);
    openClarifyTemplate('analysis', res.metrics, res.dimensions);
  };

  // 处理引用
  const handleReferenceClick = () => {
    onReferenceClick && onReferenceClick(data.order);
  }

  // 推荐问题：点击底部灯泡，拉取全部数据并从第 0 批（问数前 3 个）开始展示
  const handleQaClick = async () => {
    const res = await fetchRecData();
    if (!res) return;
    setRecData(res);
    setRecBatch(0);
    setRecList(sliceRecByBatch(res, 0));
  };

  // 换一批：本地循环切换（问数→归因→预测→问数…），每次展示 3 个，不重新调接口
  const handleRecChangeBatch = () => {
    const nextBatch = recBatch + 1;
    setRecBatch(nextBatch);
    setRecList(sliceRecByBatch(recData, nextBatch));
  };

  // 再换一批
  const handleChangeBatch = useCallback((allData: string[]) => {
    if ((batchIndex + 1) * oneBatch >= allData.length) {
      setBatchIndex(0)
    } else {
      setBatchIndex((index) => index + 1)
    }
  }, [batchIndex])

  /**
   * 处理图表数据
   * @param {Array} data - 原始数据数组
   * @returns {Object} 处理后的图表数据对象
   */
  const handleDataFetched = (responseData: any) => {
    setQueryResult({
      ...chartData,
      data: responseData.data,
      sql: responseData.sql
    });
  };

  const handleClick = async (params: any) => {
    setLoading(true);
    setDrillDownData({ columns: [], data: [] }); // 防止柱形图重新加载
    const { componentSubType, name, xField } = params;
    if (componentSubType !== 'bar') return;
    const filteredFields = [{ tfieldName: xField, filteredData: name }]
    const paramsData = {
      convUid,
      chatId,
      agentId,
      spaceId,
      chatMode: chartData?.chat_mode,
      filteredFields,
      unionSql: chartData?.sql
    }
    try {
      const res = await fetchDrillDown(paramsData);
      console.log(res);
      const columns = res.data?.columns?.map((item: any) => ({ ...item, title: item.name, dataIndex: item.name, key: item.name })) || [];
      setDrillDownData({ columns, data: res?.data?.data || [] });
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false)
    }
  }

  /**
   * 渲染数据可视化组件
   * @returns {JSX.Element|null} 可视化组件或 null
   */
  const renderVisualization = () => {
    const chartDataClone = isNotEmptyObject(queryResult) && queryResult || chartData;
    if (!chartDataClone) return null;

    // 检查数据是否为空
    if (!chartDataClone.data || chartDataClone.data.length === 0) {
      return (
        <div className="flex items-center justify-center py-8">
          <span style={{ fontSize: '12px', color: '#999' }}>暂无数据</span>
        </div>
      );
    }

    // 渲染分期：未接入真实渲染的图表类型展示占位提示，可切换其他类型或查看表格
    if (!SUPPORTED_RENDER_TYPES.has(chartType)) {
      const item = getChartTypeItem(chartType);
      return (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          {item?.thumbnail && (
            <img src={item.thumbnail} alt={item.label} className="w-40 opacity-60 mb-3" />
          )}
          <div className="text-sm text-[#666]">「{item?.label || '该图表'}」即将支持</div>
          <div className="text-xs text-[#999] mt-1">当前版本暂未接入该图表渲染，可切换其他图表类型或查看数据表格</div>
        </div>
      );
    }

    const option = getChartOption(chartType, chartDataClone.data, {
      font: chartConfig.font,
      fontSize: chartConfig.fontSize,
      color: chartConfig.chartStyle.color,
      textColor: chartConfig.chartStyle.textColor,
    });
    const { xField } = processChartData(chartDataClone.data) || {};
    const isPieOrDonut = chartType === 'response_pie_chart' || chartType === 'response_donut_chart';
    const pieSeriesData: any[] = isPieOrDonut ? ((option as any).series?.[0]?.data || []) : [];
    const colors = chartConfig.chartStyle.color.split(',');
    const legendData = pieSeriesData.map((item: any, i: number) => ({
      name: String(item.name),
      value: item.value,
      color: colors[i % colors.length]
    }));
    return (
      <div 
        className={`${styles.chartContainer} ${isChartHovered ? styles.chartContainerHovered : ''}`}
        onMouseEnter={() => setIsChartHovered(true)}
        onMouseLeave={() => setIsChartHovered(false)}
      >
        {isPieOrDonut && legendData.length > 0 && (
          <PieLegend
            data={legendData}
            maxRows={3}
            fontSize={chartConfig.fontSize}
            resetKey={chartType + (chartDataClone.data?.length ?? 0)}
            onItemClick={(name) => {
              echartRef.current?.getInstance()?.dispatchAction({ type: 'legendToggleSelect', name });
            }}
          />
        )}
      <EChart
        ref={echartRef}
        option={option}
        style={{ height: '25rem', width: '100%' }}
        theme={chartConfig.theme === 'dark' ? 'dark' : undefined}
        autoResize
        handleClick={(params: any) => handleClick({ ...params, xField })}
      />
     </div>
    );
  };

  /**
   * 渲染内容 
   */
  const renderContent = () => {
    const displayData = queryResult.data || chartData?.data || [];

    if (activeType !== 'sql' && (!displayData || displayData.length === 0)) {
      return (
        <div className="flex items-center justify-center py-8">
          <span style={{ fontSize: '12px', color: '#999' }}>暂无数据</span>
        </div>
      );
    }

    /**
     * 分页配置
     */
    const paginationConfig = {
      current: currentPage,
      pageSize: pageSize,
      total: displayData.length,
      showSizeChanger: true,
      pageSizeOptions: ['10', '20', '50', '100'],
      onChange: (page: number, newPageSize: number) => {
        setCurrentPage(page);
        if (newPageSize !== pageSize) {
          setPageSize(newPageSize);
          setCurrentPage(1); // 改变页面大小时重置到第一页
        }
      },
      showTotal: (total: number) => `共 ${total} 条`
    };

    switch (activeType) {
      case 'chart':
        return renderVisualization();
      case 'table':
        const tableRows = displayData || []
        const tableKeys = Object.keys(tableRows[0] || {})
        // 列较少时优化排版：约束列宽 + 追加填充列，避免内容过度分散
        const isFewCols = tableKeys.length > 0 && tableKeys.length <= 4

        // 判断某列是否为数值列，用于选择对齐方式
        const isNumericColumn = (key: string) =>
          tableRows.slice(0, 20).every((row: Record<string, any>) => {
            const v = row?.[key]
            if (v === null || v === undefined || v === '') return true
            return typeof v === 'number' || (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v)))
          })

        // 估算文本像素宽度：中日韩等全角字符约 14px，其余按 8px 计
        const measureTextWidth = (s: string) => {
          let w = 0
          for (const ch of String(s)) {
            w += /[\u1100-\u115F\u2E80-\u303E\u3041-\u33FF\u3400-\u4DBF\u4E00-\u9FFF\uA000-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFF60\uFFE0-\uFFE6]/.test(ch) ? 14 : 8
          }
          return w
        }

        // 估算列宽（依据表头与内容长度），仅在列较少时使用
        // 表头额外预留空间，确保中文表头能在一行内完整展示，避免逐字换行
        const estimateColWidth = (key: string) => {
          let maxWidth = measureTextWidth(key) + 16
          tableRows.slice(0, 30).forEach((row: Record<string, any>) => {
            const w = measureTextWidth(String(row?.[key] ?? ''))
            if (w > maxWidth) maxWidth = w
          })
          // 加上单元格左右内边距（约 28px），并限制在合理区间
          return Math.min(320, Math.max(96, maxWidth + 28))
        }

        const tableColumns = tableKeys.map((key, columnIndex) => {
          const isDeltaColumn = /变化量|变化率/.test(key)
          const numeric = isNumericColumn(key)

          return {
            title: key,
            dataIndex: key,
            key: key,
            ellipsis: true,
            align: isFewCols ? (numeric ? 'right' : 'left') : (columnIndex <= 1 ? 'left' : 'center'),
            width: isFewCols ? estimateColWidth(key) : (columnIndex === 0 ? 90 : undefined),
            render: (text: any) => {
              let displayText = text
              if (typeof displayText === 'string') {
                // 转换ISO 8601时间格式
                if (displayText.match(/^P(?:\d+D)?T(?:\d+H)?(?:\d+M)?(?:\d+(?:\.\d+)?S)?$/)) {
                  displayText = parseISO8601Duration(displayText)
                }
                // 转换ISO日期格式
                if (displayText.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})?$/)) {
                  displayText = parseISODate(displayText)
                }
              }

              return (
                <span className={isDeltaColumn ? styles.deltaValue : styles.tableCellValue}>
                  {displayText}
                </span>
              )
            }
          }
        })

        // 列较少时追加填充列，吸收多余宽度，让真实列紧凑左聚合，避免排版分散
        if (isFewCols) {
          tableColumns.push({
            title: '',
            dataIndex: '__filler__',
            key: '__filler__',
            ellipsis: true,
            align: 'left',
            width: undefined,
            render: () => null,
          } as any)
        }

        return (
          <div ref={tableRef} className="px-1 pb-2">
            <ConfigProvider locale={zhCN}>
              <Table
                dataSource={displayData?.map((item: Record<string, any>, index: number) => ({ ...item, key: index })) || []}
                columns={tableColumns as any}
                pagination={paginationConfig}
                scroll={isFewCols ? undefined : { x: 'max-content' }}
                className={`${styles.viewTable}`}
                locale={{
                  emptyText: (
                    <div className="flex items-center justify-center py-8 text-gray-400">
                      <div className="text-center">
                        <SvgIcon localIcon="empty" className="w-12 h-12 mb-2" />
                        <div>暂无数据</div>
                      </div>
                    </div>
                  )
                }}
              />
            </ConfigProvider>
          </div>
        );
      case 'sql':
        const sqlText = queryResult?.sql || chartData?.sql;
        const pythonText = chartData?.python_code;
        const codeLang = sqlText ? 'sql' : (pythonText ? 'python' : 'sql');
        const codeText = sqlText || pythonText || '';
        let displayText = codeText;
        if (sqlText) {
          try {
            displayText = format(sqlText, {
              language: 'sql',
              tabWidth: 2,
              keywordCase: 'upper',
              linesBetweenQueries: 2,
            });
          } catch (_) {
            displayText = sqlText;
          }
        }
        return (
          <div className={styles.sqlCodeBlock}>
            <div className={styles.sqlCodeBlockHeader}>
              <span>{codeLang === 'sql' ? 'SQL' : 'Python'}</span>
              <Text
                copyable={{
                  text: displayText,
                  tooltips: ['复制', '已复制'],
                }}
              >
              </Text>
            </div>
            {/* @ts-ignore */}
            <SyntaxHighlighter
              language={codeLang}
              style={oneLight}
              showLineNumbers={true}
              customStyle={{
                margin: 0,
                borderRadius: '0 0 10px 10px',
                fontSize: '0.8125rem',
                backgroundColor: 'transparent',
                padding: '12px 14px',
              }}
              codeTagProps={{
                style: {
                  fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                }
              }}
            >
              {displayText || '暂无 SQL 语句'}
            </SyntaxHighlighter>
          </div>
        );

      default:
        return null;
    }
  }

  // 请求描述分析
  const fetchData = async () => {
    // 添加更多的检查条件
    console.log('fetchData调用:', {
      convUid,
      roundIndex: data.roundIndex,
      context: data.context,
      describe: data.describe,
      arrowStatus: data.arrowStatus
    });

    if (!convUid || !data.roundIndex) {
      console.warn('Missing convUid or roundIndex for fetchData:', { convUid, roundIndex: data.roundIndex });
      return;
    }
    
    //socket数据加载完才能获取描述分析
    if (isGettingData) {
      message.info('数据摘要信息生成中，请稍后...')
      return;
    }

    // 防止 searchConv 接口重复调用
    if (hasCalledSearchConvRef.current) {
      console.log('searchConv 已经调用过，跳过重复调用');
      return;
    }
    hasCalledSearchConvRef.current = true;

    setMLoading(true);
    try {
      const searchResult = await searchConv({
        conv_uid: convUid,
        round_index: data.roundIndex,
        key: 'view',
        role: 'view',
        page: 1,
        pageSize: 1
      });

      setMLoading(false)
      if (searchResult?.data?.items.length === 0) {
        console.warn('No search result items found for roundIndex:', data.roundIndex);
        message.error('聊天失败');
        return;
      }
      setConvContent((prevState) => {
        let viewMessageIndex = -1;
        for (let i = prevState.length - 1; i >= 0; i--) {
          if (prevState[i].role === 'view') {
            viewMessageIndex = i;
            break;
          }
        }

        if (viewMessageIndex !== -1) {
          const updatedState = [...prevState];
          updatedState[viewMessageIndex] = {
            ...updatedState[viewMessageIndex],
            context: searchResult?.data?.items[0]?.context,
            feedback: searchResult?.data?.items[0]?.feedback,
            describe: true,
            arrowStatus: true,
          };
          onMessageUpdate && onMessageUpdate(updatedState[viewMessageIndex])
          return updatedState;
        }

        return prevState;
      });
      
      setIsCollapsed(isSharing? true : !isCollapsed);

    } catch (error) {
      setMLoading(false);
      message.error('请求数据失败');
    }
  };

  // 检查是否为已知场景
  const isKnownChatMode = (chatMode: string) => {
    return chatMode && (CHAT_MODE_MAP[chatMode] !== undefined || chatMode === '');
  };

  // 判断当前场景是否为未知场景
  const isUnknownScene = chartData?.chat_mode && !isKnownChatMode(chartData.chat_mode);

  // 处理markdown格式数据
  // chat_with_knowledge 场景从 data_knowledge 字段获取，其他场景从 desc 字段获取
  const desc = chartData?.chat_mode === 'chat_with_knowledge' 
    ? (chartData?.data_knowledge || '') 
    : (chartData?.desc || '');
  // 先移除HTML标签，再处理markdown；压缩 3 个以上连续换行为段落分隔
  const cleanDesc = stripHtmlTags(desc).replace(/\n{3,}/g, '\n\n').trim();
  const html: any = marked(cleanDesc)

  return (
    <div className={`my-2 w-full flex justify-start items-start`}>
      {/* <SvgIcon
        className="mt-1 text-[1.875rem]"
        localIcon="view"
      /> */}

      <div className="flex flex-col w-full text-left">
        {/* 描述分析 / 数据知识 */}
        {data?.describe && (chartData?.chat_mode !== 'chat_with_analysis' && !chartData?.recommendQuestions && !chartData?.rewrite) && (
          <div className="w-full overflow-hidden mb-[0.625rem]">
            <div className="section-header px-6 pt-3 pb-3 flex justify-between items-center">
              <span className="chart-header-title font-semibold text-[#2d2d2d]">{chartData?.chat_mode === 'chat_with_knowledge' ? '数据知识' : '描述分析'}</span>

              <div className="flex items-center gap-[1.25rem] justify-end">
                {!data.arrowStatus ? (
                  <span className="text-[#6b7280] opacity-90 cursor-pointer hover:opacity-100 text-[0.875rem]" onClick={fetchData}>
                    点击查看数据摘要详情
                  </span>
                ) : (
                  <span className="text-[#6b7280] opacity-90 text-[0.875rem]"> </span>
                )}
              </div>
            </div>
           {(data.arrowStatus || !isCollapsed) ? <div className="px-6 py-4">
              <div
                ref={contentRef}
                className="text-sm text-gray-700 transition-all duration-300 ease-in-out relative"
                style={{
                  maxHeight: data.arrowStatus ? 'none' : contentHeight,
                  overflow: data.arrowStatus ? 'visible' : (isCollapsed ? 'hidden' : 'visible'),
                }}
              >
                {isUnknownScene ? (
                  <div className="text-left text-gray-700" style={{ width: '90%' }}>
                    检测到非法的场景标识
                  </div>
                ) : (
                  <div
                    className={`${s['markdown-content']} text-left`}
                    dangerouslySetInnerHTML={{ __html: html }}
                    style={{ width: '100%'}}
                  ></div>
                )}
              </div>
            </div> : null}
          </div>
        )}

        {
          contextError ?
            <div className="w-full text-left px-6 py-4">{stripHtmlTags(contextError)}</div>
            : (
              // chat_with_knowledge 和未知场景不渲染数据面板
             chartData?.chat_mode !== 'chat_with_knowledge' && !isUnknownScene && (
              <div className="w-full text-left px-6 pt-1">
                <div>
                  {chartData?.chat_mode === 'chat_excel' && chartData.file_id && (
                    <div className="mb-3">
                      <div className="whitespace-nowrap text-[#666] text-left text-[0.875rem] font-medium">Excel分析</div>
                      <div className="mt-2 bg-[#ffffff] rounded-[0.5rem] border border-[#f0f0f0] p-3">
                        <div className="text-left">使用了一个参考</div>
                        <FileTag
                          fileId={chartData.file_id}
                          fileName={chartData.file_name}
                          showCloseIcon={false}
                          showDownloadIcon={true}
                        />
                      </div>
                    </div>
                  )}
                  {/* 描述分析部分 */}
                  {/* {(chartData?.chat_mode !== 'chat_with_analysis' && !chartData?.recommendQuestions && !chartData?.rewrite) && (
                  <div className="mb-2 ml-2 flex pt-2" style={{ width: '100%' }}>
                    <div className="whitespace-nowrap text-[#666] text-left" style={{ width: '10%' }}>描述分析1</div>
                    <div className="text-left whitespace-pre-wrap" style={{ width: '90%' }}>{chartData?.desc}</div>
                  </div>
                )} */}

                  {/* chat_with_db_execute 正常对话（sql查询） */}
                  <Spin spinning={loading}>
                    {drillDownData ? <div className="text-right">
                        <div><Button shape="circle" icon={<CloseOutlined />} onClick={() => setDrillDownData(null)} /></div>
                        <Table columns={drillDownData?.columns || []} dataSource={drillDownData?.data || []} />
                      </div> : (
                        (chartData?.chat_mode === 'chat_with_db_execute' || chartData?.chat_mode === 'chat_excel') && (() => {
                          const hasData = (queryResult.data && queryResult.data.length > 0) || (chartData?.data && chartData.data.length > 0);
                          
                          return (
                            <div className="w-full overflow-hidden">
                              <div className="section-header pt-3 pb-3">
                                <span className="chart-header-title font-semibold text-[#2d2d2d]">图表信息</span>
                              </div>
                              <div className="pt-3">
                                <ChartHeader
                                  onTypeChange={handleTypeChange}
                                  onShareClick={handleShareClick}
                                  onConfigClick={handleConfigClick}
                                  onDebugClick={handleDebugClick}
                                  onFullscreenClick={handleFullscreenClick}
                                  showChartIcon={showChartIcon}
                                  chartType={chartType}
                                  activeType={activeType}
                                  convUid={convUid}
                                  chatId={chatId}
                                  spaceId={spaceId}
                                  agentId={agentId}
                                  sessionId={chatId}
                                  schemaId={chartData?.semantic_id}
                                  chatMode={chartData?.chat_mode}
                                  ansiSql={chartData?.sql}
                                  onDataFetched={handleDataFetched}
                                  onExportClick={handleDownload}
                                  onhandleGetChartType={handleGetChartType}
                                  currentTableData={queryResult.data || chartData?.data || []}
                                  showTitle={false}
                                />
                                <div
                                  className="mt-3"
                                  style={activeType === 'chart' || !hasData ? { background: '#F2F3F5', borderRadius: '8px', padding: '12px' } : undefined}
                                >
                                  {hasData ? (
                                    renderContent()
                                  ) : (
                                    <div className="flex items-center justify-center py-8">
                                      <span style={{ fontSize: '12px', color: '#999' }}>暂无数据</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })()
                      )}
                  </Spin>

                  {/* chat_with_analysis 归因分析：优先渲染新版看板，旧格式沿用原组件；字段未就绪时不渲染静态样例，避免展示与真实数据混淆的“死数据” */}
                  {
                    chartData?.chat_mode === 'chat_with_analysis' && (() => {
                      // 后端返回的归因数据（含维度归因表 / 因子明细 / 指标概览）
                      const hasAnalysis = Array.isArray(chartData?.dimension_table)
                        && Array.isArray(chartData?.factor_table)
                        && chartData?.metric_overview;
                      if (hasAnalysis) {
                        // 抵消父容器 px-6，使归因报告与上方「思考」卡片等宽对齐
                        return (
                          <div className="-mx-6">
                            <AttributionDashboard data={chartData} onDebugClick={handleDebugClick} />
                          </div>
                        );
                      }
                      // 旧格式归因数据：沿用原组件
                      if (chartData?.total_df || chartData?.analysis_response) {
                        return <CausalAnalysis data={chartData} />;
                      }
                      // 归因字段尚未就绪（如流式过程中）：不渲染任何静态样例，等待真实数据到达
                      return null;
                    })()
                  }
                  {/* chat_with_predict 预测分析 */}
                  {chartData?.chat_mode === 'chat_with_predict' && (
                    <div className="flex" style={{ width: '100%' }}>
                      <div className="rounded bg-white" style={{ width: '100%' }}>
                        <PredictionAnalysis data={chartData} onDebugClick={handleDebugClick} />
                      </div>
                    </div>
                  )}
                  {/* 点赞、点踩、引用、推荐、归因、预测 */}
                  {chartData?.chat_mode && (
                    <StatisticsAnalysis
                      onAttributionClick={handleAttributionClick}
                      onPredictClick={handlePredictClick}
                      onReferenceClick={handleReferenceClick}
                      onQaClick={handleQaClick}
                      onRegenerateClick={onRegenerate ? () => onRegenerate(data) : undefined}
                      onDeleteClick={onDelete ? () => onDelete(data) : undefined}
                      onShareClick={() => window.dispatchEvent(new CustomEvent('start-share-conversation', { detail: { chatId: conv?.chat_id, order: shareOrder ?? data?.order } }))}
                      isLast={isLast}
                      versionInfo={versionInfo}
                      onVoteChange={handleLike}
                      feedback={chartData?.feedback || {}}
                      chatMode={chartData?.chat_mode}
                      content={chartData?.desc || chartData?.data_knowledge || ''}
                    />
                  )}

                  {/* 推荐问题 - 后端业务错误提示（沿用 contextError/rewrite 分支的内联文本风格） */}
                  {recError && (
                    <div className="w-full text-left px-6 py-4">{recError}</div>
                  )}

                  {/* 推荐问题 - 点击底部灯泡后，直接在当前回答下方内嵌展示 */}
                  {recList.length > 0 && (
                    <div className="recommend-questions">
                      <div className="recommend-questions-list">
                        {recList.map((question: string) => (
                          <div
                            key={question}
                            className="recommend-question-item"
                            onClick={() => {
                              // 点击推荐问题时带上当前回答内嵌的数据语义/分组，
                              // 否则新一轮的 human 消息与请求都会丢失语义信息
                              getAnswer!({
                                question,
                                _meta: {
                                  groupName: chartData?.semantic_group_name || '',
                                  semanticName: chartData?.semantic_name || '',
                                  semanticSchemaId: chartData?.semantic_id,
                                },
                              });
                            }}
                          >
                            <span className="recommend-question-text">{question}</span>
                            <ArrowRightOutlined className="recommend-question-arrow" />
                          </div>
                        ))}
                      </div>
                      <div className="recommend-questions-footer">
                        <span className="recommend-change-batch" onClick={handleRecChangeBatch}>换一批</span>
                      </div>
                    </div>
                  )}

                  {
                    // 推荐问题
                    chartData?.recommendQuestions !== undefined && (
                      chartData.recommendQuestions?.length ? (
                        <div className="recommend-questions">
                          <div className="recommend-questions-list">
                            {
                              chartData?.recommendQuestions.slice(oneBatch * batchIndex, oneBatch * (batchIndex + 1)).map((question: string) => (
                                <div
                                  key={question}
                                  className="recommend-question-item"
                                  onClick={() => {
                                    // 携带当前回答内嵌的数据语义/分组；改写推荐这条 chartData
                                    // 仅含 recommendQuestions，无语义时字段为空，行为与原先一致
                                    getAnswer!({
                                      question,
                                      _meta: {
                                        groupName: chartData?.semantic_group_name || '',
                                        semanticName: chartData?.semantic_name || '',
                                        semanticSchemaId: chartData?.semantic_id,
                                      },
                                    });
                                  }}
                                >
                                  <span className="recommend-question-text">{question}</span>
                                  <ArrowRightOutlined className="recommend-question-arrow" />
                                </div>
                              ))
                            }
                          </div>
                          <div className="recommend-questions-footer">
                            <a className="recommend-change-batch" onClick={() => handleChangeBatch(chartData?.recommendQuestions)}><RedoOutlined />换一批</a>
                          </div>
                        </div>
                      ) : '暂无相关推荐内容'
                    )
                  }

                  {
                    // 问题改写
                    chartData?.rewrite && (
                      chartData?.rewrite?.length ? (
                        <>
                          {
                            chartData?.rewrite.slice(oneBatch * batchIndex, oneBatch * (batchIndex + 1)).map((text: string) => (
                              <p key={text} className="mb-2">
                                <a onClick={() => {
                                  const params = getRecommendParams(conv, data, '', text)
                                  getQueryRewrite!(params);
                                }}>{text}</a>
                              </p>
                            ))
                          }
                          <div className="flex items-center justify-center mt-4 mb-2">
                            <a onClick={() => handleChangeBatch(chartData?.rewrite)}><RedoOutlined />再换一批</a>
                          </div>
                        </>
                      ) : (chartData?.err_msg || '暂无相关推荐内容')
                    )
                   }
                 </div>
               </div>
              )
            )
         }
       </div>

      <ShareModal
        open={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
      />
      <ChartConfigModal
        open={configModalVisible}
        onClose={() => setConfigModalVisible(false)}
        onConfirm={handleConfigConfirm}
        defaultConfig={chartConfig}
      />
      <ModelDebugModal
        convUid={conv.conv_uid}
        roundIndex={data.roundIndex}
        open={debugModalVisible}
        onClose={() => {
          setDebugModalVisible(false);
          closeDebugWebSocket();
        }}
      />
      <FullscreenModal
        open={fullscreenModalVisible}
        onClose={() => setFullscreenModalVisible(false)}
      >
        {fullscreenModalVisible && (
          <div className="rounded bg-white w-full">
            <ChartHeader
              onTypeChange={handleTypeChange}
              onShareClick={handleShareClick}
              onConfigClick={handleConfigClick}
              onDebugClick={handleDebugClick}
              onFullscreenClick={() => setFullscreenModalVisible(false)}
              showChartIcon={showChartIcon}
              activeType={activeType}
              convUid={convUid}
              chatId={chatId}
              spaceId={spaceId}
              agentId={agentId}
              sessionId={chatId}
              schemaId={chartData?.semantic_id}
              chatMode={chartData?.chat_mode}
              ansiSql={chartData?.sql}
              chartType={chartType}
              onDataFetched={handleDataFetched}
              onExportClick={handleDownload}
              onhandleGetChartType={handleGetChartType}
              currentTableData={queryResult.data || chartData?.data || []}
            />
            <div className="flex-1 p-4 overflow-auto w-full">
              {renderContent()}
            </div>
          </div>
        )}
      </FullscreenModal>
    </div>
  );
}

export default ViewEle;
