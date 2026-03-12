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
const { Text } = Typography;
import type { EChartsOption } from 'echarts';
import ShareModal from "./ShareModal";
import ChartConfigModal from "./ChartConfigModal";
import ModelDebugModal from "./ModelDebugModal";
import FullscreenModal from "./FullscreenModal";
import ChartHeader from "./components/ChartHeader";
import StatisticsAnalysis from './components/StatisticsAnalysis';
import PredictionAnalysis from './components/PredictionAnalysis';
import styles from './styles.module.css';
import s from './index.module.css'
import CausalAnalysis from "./components/CausalAnalysis";
import { parseContext, parseJsonContent, isChartType, calculateRotation, isNotEmptyObject, getUserName, isSingleMetricData, stripHtmlTags } from '@/utils';
import { handleDataExport, handleImageExport } from './helpers/download';
import FileTag from "@/components/FileTag"; // 引入文件组件
import { fetchDrillDown, fetchQueryRewrite, fetchRecommendQuestion, setExperteval, searchConv } from '../../service/api/conv';
import { CloseOutlined, RedoOutlined } from "@ant-design/icons";
import { marked } from 'marked';
import { CHAT_MODE_MAP } from '../../constant/chat';

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
  getRecommend?: (props: any) => void;
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
  onMessageUpdate // <-- 新增
}, ref) => {
  const [chartData, setChartData] = React.useState<any>(null);
  const [queryResult, setQueryResult] = React.useState<{ sql?: string; data?: any[] }>({});
  const [contextError, setContextError] = React.useState<any>(null);
  const [batchIndex, setBatchIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [drillDownData, setDrillDownData] = useState<{ data: any[]; columns: any[]; } | null>(null);
  // 添加图表相关的状态
  const [shareModalVisible, setShareModalVisible] = React.useState(false);
  const [configModalVisible, setConfigModalVisible] = React.useState(false);
  const [debugModalVisible, setDebugModalVisible] = React.useState(false);
  const [fullscreenModalVisible, setFullscreenModalVisible] = React.useState(false);
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
  // 图表tooltip 
  const tooltipHtml = (color: any) => `<span style="display:inline-block; width:0.5rem; height:0.5rem; border-radius:50%; background-color:${color}; margin-right:0.3125rem;"></span>`

  // 解析ISO 8601时间格式 
  const parseISO8601Duration = (duration: string): string => {
    if (typeof duration !== 'string') return duration;
    
    const match = duration.match(/^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/);
    if (!match) return duration;

    const days = parseInt(match[1] || '0', 10);
    const hours = parseInt(match[2] || '0', 10);
    const minutes = parseInt(match[3] || '0', 10);
    const seconds = Math.floor(parseFloat(match[4] || '0'));

    const totalHours = days * 24 + hours;
    const hh = String(totalHours).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');

    return `${hh}:${mm}:${ss}`;
  };
  // 解析ISO日期格式
  const parseISODate = (dateStr: string): string => {
    if (typeof dateStr !== 'string') return dateStr;
    
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}T/)) {
      return dateStr.split('T')[0];
    }
    
    return dateStr;
  };

  const echartRef = useRef(null);
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

  const handleDebugClick = () => {
    setDebugModalVisible(true);
  };

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

  // 处理点赞
  const handleLike = async (payload: any) => {
    try {
      const createBy = getUserName();
      const res: any = await setExperteval({
        conv_uid: convUid,
        chat_id: chatId,
        space_id: spaceId,
        agent_id: agentId,
        round_index: data.order || data.roundIndex,
        create_by: createBy,
        ...payload
      });
      if (res?.success) {
        const msg = payload?.eval_user === '0' ? '感谢您的点赞' : '感谢您的反馈';
        message.success(msg)
        setChartData({ ...chartData, feedback: res?.data || {} });
      }
      else {
        message.error(res?.err_msg || '操作失败');
      }
    }
    catch (error) {
      console.error('操作:', error);
    }
  };

  // 处理预测分析点击
  const handlePredictClick = () => {
    if (getQueryRewrite) {
      const params = getRecommendParams(conv, data, '', '推荐与当前问题相关的预测分析问题')
      getQueryRewrite(params);
    }
  };

  // 处理归因分析点击
  const handleAttributionClick = () => {
    if (getQueryRewrite) {
      const params = getRecommendParams(conv, data, '', '推荐与当前问题相关的归因分析问题')
      getQueryRewrite(params);
    }
  };

  // 处理引用
  const handleReferenceClick = () => {
    onReferenceClick && onReferenceClick(data.order);
  }

  // 推荐问题
  const handleQaClick = async () => {
    if (getRecommend) {
      const params = getRecommendParams(conv, data, 'getQa')
      getRecommend({ type: 'getQa', params });
    }
  };

  // 推荐指标
  const handleIndexClick = () => {
    if (getRecommend) {
      const params = getRecommendParams(conv, data, 'getI')
      getRecommend({ type: 'getI', params });
    }
  };

  // 推荐维度
  const handleDimensionClick = () => {
    if (getRecommend) {
      const params = getRecommendParams(conv, data, 'getD')
      getRecommend({ type: 'getD', params });
    }
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
  const processChartData = (data: any[]) => {
    if (!data || !data.length) return { xField: '', xData: [], yFields: [], yData: [] };

    // 判断数据格式是单指标还是多指标
    const isSingle = isSingleMetricData(data);

    // 获取第一条数据的所有键
    const keys = Object.keys(data[0]);

    // 特殊处理：如果只有一条数据且只有一个数值字段，将其作为 yField
    if (data.length === 1 && keys.length === 1) {
      const singleKey = keys[0];
      const singleValue = data[0][singleKey];
      
      // 检查是否为数值
      const isNumeric = typeof singleValue === 'number' || 
                       (!isNaN(parseFloat(singleValue)) && isFinite(parseFloat(singleValue)));
      
      if (isNumeric) {
        // 单数值情况：返回特殊格式供图表使用
        // console.log('检测到单数值数据:', singleKey, singleValue);
        return {
          xField: '',
          xData: [],
          yFields: [singleKey],
          yData: [[typeof singleValue === 'number' ? singleValue : parseFloat(singleValue)]]
        };
      }
    }

    // 获取 x 轴字段
    let xField = '';
    const dateField = keys.find(key =>
      key.includes('日期') ||
      key.includes('date') ||
      key.includes('时间') ||
      key.includes('time') ||
      /^\d{4}-\d{2}-\d{2}/.test(data[0][key])
    );

    if (dateField) {
      xField = dateField;
    } else {
      xField = keys.find(key =>
        key.includes('名称') ||
        key.includes('name') ||
        key.includes('产品') ||
        key.includes('商品') ||
        key.includes('部门') ||
        key.includes('站')
      ) || keys[0];  // 如果找不到默认使用第一个字段作为 xField
    }

    // 获取 y 轴字段：不再依赖硬编码的字段名，而是自动识别所有包含数字的字段
    const yFields = keys.filter(key => {
      // 排除已经被识别为x轴的字段
      if (key === xField) return false;
      
      const value = data[0][key];
      
      // 如果是纯数字类型，直接认为是Y轴字段
      if (typeof value === 'number') return true;
      
      // 如果是字符串，需要进一步判断
      if (typeof value === 'string') {
        // 排除日期时间格式的字符串
        if (/^\d{4}-\d{2}-\d{2}/.test(value) || 
            key.includes('日期') || 
            key.includes('date') || 
            key.includes('时间') || 
            key.includes('time')) {
          return false;
        }
        
        // 检查是否为纯数字字符串
        const numValue = parseFloat(value);
        return !isNaN(numValue) && isFinite(numValue) && numValue === Number(value.trim());
      }
      
      return false;
    });

    // 处理 yData，根据 yFields 获取对应的数据
    const yData = yFields.map(field => {
      return data.map(item => {
        const value = item[field];
        return typeof value === 'number' ? value : parseFloat(value) || 0;  // 转换为数值，如果是 NaN 则设为 0
      });
    });

    // 获取 xData，并转换ISO 8601时间格式
    const xData = data.map(item => {
      const value = item[xField] || '';
      // 检查是否为ISO 8601时间格式
      if (typeof value === 'string' && value.match(/^P(?:\d+D)?T(?:\d+H)?(?:\d+M)?(?:\d+(?:\.\d+)?S)?$/)) {
        return parseISO8601Duration(value);
      }
      return value;
    });

    return { xField, yFields, xData, yData };
  };

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
        <div className="flex items-center justify-center h-[12.5rem] text-gray-400">
          <div className="text-center">
            <SvgIcon localIcon="empty" className="w-12 h-12 mb-2" />
            <div>暂无数据</div>
          </div>
        </div>
      );
    }

    const getChartOption = (type: string, data: any[]): EChartsOption => {
      const { xField, yFields = [], xData = [], yData = [] }: any = processChartData(data) || {};  // 获取 xData 和 yData，添加默认值

      const isDateAxis = Array.isArray(xData) && xData.some((x: any) => /^\d{4}-\d{2}-\d{2}/.test(x));

      // 处理单数值情况：如果 xData 为空，使用字段名作为 X 轴标签
      const finalXData = Array.isArray(xData) && xData.length > 0 ? xData : (yFields || []);

      // 为系列生成不同的颜色
      const colors = ['#1677ff', '#ff9f00', '#ff4f6c', '#33cc99', '#ff6600', '#3399ff'];

      // 根据索引循环颜色
      const getColor = (index: number) => colors[index % colors.length];

      // 计算x轴标签的旋转角度
      const rotation = isDateAxis ? 30 : calculateRotation(finalXData);

      // 使用配置的字体和字号
      const { font, fontSize, chartStyle } = chartConfig;

      // 根据图表类型计算Y轴最大值
      const calculateYAxisMax = (chartType: string) => {
        // 多指标图表：计算所有指标的最大值
        if (chartType === 'response_many_bar_chart' || chartType === 'response_many_line_chart') {
          const allValues = Array.isArray(yData) ? yData.flat().filter((v: any) => typeof v === 'number') : [];
          return allValues.length > 0 ? Math.max(...allValues) : 0;
        }
        // 单指标图表：只计算第一个指标的最大值
        const currentValues = Array.isArray(yData?.[0]) ? yData[0].filter((v: any) => typeof v === 'number') : [];
        return currentValues.length > 0 ? Math.max(...currentValues) : 0;
      };

      // 基础配置
      const baseOption: EChartsOption = {
        title: {
          show: false, // 禁用默认标题
        },
        color: chartStyle.color.split(','),
        textStyle: {
          fontFamily: font,
          fontSize,
          color: chartStyle.textColor
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: finalXData.length > 15 ? '12%' : (rotation > 0 ? '15%' : '3%'), // 有滚动条或标签倾斜时增加底部间距
          containLabel: true
        },
        // 添加横向滚动条配置（只能拖动蓝色区域）
        dataZoom: [
          {
            type: 'slider',
            show: finalXData.length > 10, // 当数据点超过10个时显示滚动条
            xAxisIndex: 0,
            start: 0,
            end: finalXData.length > 10 ? Math.min(100, (10 / finalXData.length) * 100) : 100, // 默认显示前10个数据点
            bottom: '2%',
            height: 15, // 滚动条高度
            handleSize: '100%', // 手柄大小设为100%，覆盖整个蓝色区域
            handleStyle: {
              color: 'rgba(24, 144, 255, 0.8)', // 手柄颜色与填充色相同
              borderColor: 'transparent', // 隐藏手柄边框
              borderWidth: 0
            },
            showDetail: false, // 隐藏详细信息
            showDataShadow: false, // 隐藏数据阴影
            borderColor: 'transparent', // 隐藏边框
            fillerColor: 'rgba(24, 144, 255, 0.8)', // 深蓝色填充
            backgroundColor: 'transparent', // 背景透明
            moveHandleSize: 0, // 禁用移动手柄
            zoomLock: true, // 锁定缩放，只允许平移
            brushSelect: false, // 禁用框选缩放
            preventDefaultMouseMove: false // 禁用默认鼠标移动行为
          }
        ],
        tooltip: {
          trigger: 'axis',
          formatter: (params: any) => {
            if (Array.isArray(params) && params[0]) {
              const value = params[0].value;
              const name = params[0].name;
              if (isDateAxis) {
                const date = new Date(name);
                if (date.toString() !== 'Invalid Date') {
                  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日<br/>${yFields?.[0] || ''}: ${value}`;
                }
              }

              let tooltipContent = '';
              params.forEach((param: any) => {
                const value = param.value;
                const seriesName = param.seriesName;
                const color = param.color;
                tooltipContent += `<span>${tooltipHtml(color)}${seriesName}: ${value}</span><br/>`;

              });
              return tooltipContent;
              // return `${name}<br/>${yFields[0]}: ${value}`;
            }
            return '';
          }
        },
        // 添加图例配置
        legend: {
          show: true, // 设置为true显示图例
          left: '4%', // 向右移动图例
          top: '5%', // 向下调整图例位置
          data: yFields, // 图例展示的系列名，可以根据需要动态修改
          textStyle: {
            color: chartStyle.textColor, // 设置图例文字的颜色
            fontFamily: font,
            fontSize,
          },
          itemWidth: 8, // 图例标志的宽度
          itemHeight: 8, // 图例标志的高度
        },
        xAxis: {
          type: 'category' as const,
          data: finalXData,  // 统一使用 finalXData
          axisLabel: {
            interval: 0, // 显示所有标签
            rotate: rotation,
            overflow: 'break', // 文字过长时换行
            formatter: isDateAxis ? (value: string) => {
              const date = new Date(value);
              if (date.toString() !== 'Invalid Date') {
                return `${date.getMonth() + 1}月${date.getDate()}日`;
              }
              return value;
            } : undefined,
            fontFamily: font,
            fontSize,
            color: chartStyle.textColor
          }
        },
        yAxis: {
          type: 'value' as const,
          // name: yField,
          scale: false, // 不自动缩放，确保滚动时纵轴不变
          min: 0, // 从0开始
          max: calculateYAxisMax(type), // 根据图表类型动态计算最大值
          nameTextStyle: {
            fontFamily: font,
            fontSize,
            color: chartStyle.textColor
          },
          axisLabel: {
            fontFamily: font,
            fontSize,
            color: chartStyle.textColor
          }
        }
      };

      switch (type) {
        case 'response_bar_chart':
          return {
            ...baseOption,
            series: [{
              type: 'bar',
              name: yFields?.[0] || '',
              data: yData?.[0] || [],
              barMaxWidth: 50,
              barGap: '30%'
            }]
          };

        case 'response_line_chart':
          return {
            ...baseOption,
            series: [{
              type: 'line',
              name: yFields?.[0] || '',
              data: yData?.[0] || [],
              smooth: true,
              // itemStyle: {
              //   color: getColor(0),
              // },
              // lineStyle: {
              //   color: getColor(0),
              // }
            }]
          };

        case 'response_area_chart':
          return {
            ...baseOption,
            series: [{
              type: 'line',
              name: yFields?.[0] || '', // 只取第一个指标
              data: yData?.[0] || [],   // 对应yData中的第一个数组
              smooth: true,
              areaStyle: {
                opacity: 0.3,
                // color: getColor(0),
              },
              // itemStyle: {
              //   color: getColor(0),
              // },
              // lineStyle: {
              //   color: getColor(0),
              // }
            }]
          };

        case 'response_pie_chart': {
          // 处理饼图数据：支持单数值和多分类数据
          let pieData: any[] = [];
          
          if (Array.isArray(xData) && xData.length > 0 && Array.isArray(yData?.[0])) {
            // 正常的多分类数据
            pieData = xData.map((item: any, index: any) => ({
              name: item,
              value: yData[0][index]
            }));
          } else if (Array.isArray(yData?.[0]) && yData[0].length > 0) {
            // 单数值数据：显示为一个完整的圆
            pieData = [{
              name: yFields?.[0] || '数值',
              value: yData[0][0]
            }];
          }
          // 双数值字段的特殊处理：当 xData 为空 yFields 有多个数值字段时
          if (pieData.length === 0 && yFields.length >= 2 && Array.isArray(yData) && yData.length >= 2) {
            pieData = yData[0].map((_: any, index: number) => ({
              name: String(yData[0][index]),
              value: yData[1][index]
            }));
          }
          const legendData = pieData.map((item: any) => String(item.name));
          
          const option: EChartsOption = {
            tooltip: {
              trigger: 'item',
              formatter: '{b}: {c}'
            },
            legend: {
              show: true,
              type: 'scroll',
              top: '5%',
              itemWidth: 8,
              itemHeight: 8,
              data: legendData,
              textStyle: {
                color: chartStyle.textColor,
                fontFamily: font,
                fontSize,
              }
            },
            series: [{
              type: 'pie',
              radius: '70%',
              center: ['50%', '60%'],
              data: pieData,
              emphasis: {
                itemStyle: {
                  shadowBlur: 10,
                  shadowOffsetX: 0,
                  shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
              },
              label: {
                show: pieData.length === 1,  // 单数值时显示标签
                position: 'center',
                formatter: '{b}\n{c}',
                fontSize: 16,
                color: chartStyle.textColor
              },
            }]
          };
          return option;
        }

        case 'response_donut_chart': {
          // 处理环形图数据：支持单数值和多分类数据
          let donutData: any[] = [];
          
          if (Array.isArray(xData) && xData.length > 0 && Array.isArray(yData?.[0])) {
            // 正常的多分类数据
            donutData = xData.map((item: any, index: any) => ({
              name: item,
              value: yData[0][index]
            }));
          } else if (Array.isArray(yData?.[0]) && yData[0].length > 0) {
            // 单数值数据：显示为一个完整的环
            donutData = [{
              name: yFields?.[0] || '数值',
              value: yData[0][0]
            }];
          }
          // 双数值字段的特殊处理：当 xData 为空 yFields 有多个数值字段时
          if (donutData.length === 0 && yFields.length >= 2 && Array.isArray(yData) && yData.length >= 2) {
            donutData = yData[0].map((_: any, index: number) => ({
              name: String(yData[0][index]),
              value: yData[1][index]
            }));
          }
          const donutLegendData = donutData.map((item: any) => String(item.name));
          
          const option: EChartsOption = {
            tooltip: {
              trigger: 'item',
              formatter: '{b}: {c}'
            },
            legend: {
              show: true,
              type: 'scroll',
              top: '5%',
              itemWidth: 8,
              itemHeight: 8,
              data: donutLegendData,
              textStyle: {
                color: chartStyle.textColor,
                fontFamily: font,
                fontSize,
              }
            },
            series: [{
              type: 'pie',
              radius: ['40%', '70%'],
              center: ['50%', '60%'],
              data: donutData,
              label: {
                show: donutData.length === 1,  // 单数值时显示标签
                position: 'center',
                formatter: '{b}\n{c}',
                fontSize: 16,
                color: chartStyle.textColor
              },
            }]
          };
          return option;
        }

        // **多指标柱状图**
        case 'response_many_bar_chart':
          return {
            ...baseOption,
            series: Array.isArray(yFields) ? yFields.map((field: any, index: any) => ({
              type: 'bar',
              name: field,   // 指标名
              data: yData?.[index] || [], // 对应指标的数据
              // itemStyle: {
              //   color: getColor(index),  // 动态分配颜色
              // },
              barMaxWidth: 50,
              barGap: '30%',
              emphasis: {
                focus: 'series'
              },
            })) : [],
          };

        // **多指标折线图**
        case 'response_many_line_chart':
          return {
            ...baseOption,
            series: Array.isArray(yFields) ? yFields.map((field: any, index: any) => ({
              type: 'line',
              name: field,
              data: yData?.[index] || [],
              smooth: true,
              // itemStyle: {
              //   color: getColor(index),  // 动态分配颜色
              // },
              // lineStyle: {
              //   color: getColor(index),  // 动态分配颜色
              // },
              emphasis: {
                focus: 'series'
              },
            })) : [],
          };

        default:
          return baseOption;
      }

    };

    const option = getChartOption(chartType, chartDataClone.data);
    const { xField } = processChartData(chartDataClone.data) || {};
    return (
      <EChart
        ref={echartRef}
        option={option}
        style={{ height: '25rem', width: '100%' }}
        theme={chartConfig.theme === 'dark' ? 'dark' : undefined}
        autoResize
        handleClick={(params: any) => handleClick({ ...params, xField })}
      />
    );
  };

  /**
   * 渲染内容 
   */
  const renderContent = () => {
    const displayData = queryResult.data || chartData?.data || [];

    if (activeType !== 'sql' && (!displayData || displayData.length === 0)) {
      return (
        <div className="flex items-center justify-center h-[12.5rem] text-gray-400">
          <div className="text-center">
            <SvgIcon localIcon="empty" className="w-12 h-12 mb-2" />
            <div>暂无数据</div>
          </div>
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
        const tableColumns = Object.keys(displayData?.[0] || {}).map((key, columnIndex) => {
          const isDeltaColumn = /变化量|变化率/.test(key)
          const isLeftAlign = columnIndex <= 1

          return {
            title: key,
            dataIndex: key,
            key: key,
            ellipsis: true,
            align: isLeftAlign ? 'left' : 'center',
            width: columnIndex === 0 ? 90 : undefined,
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

        return (
          <div ref={tableRef} className="px-1 pb-2">
            <ConfigProvider locale={zhCN}>
              <Table
                dataSource={displayData?.map((item: Record<string, any>, index: number) => ({ ...item, key: index })) || []}
                columns={tableColumns as any}
                pagination={paginationConfig}
                scroll={{ x: 'max-content' }}
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
          <div className="bg-[#f6f6f6] rounded p-2 relative">
            <div className="absolute right-3 top-3 z-10 cursor-pointer text-gray-600 hover:text-gray-800 transition-colors">
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
                borderRadius: '0.25rem',
                fontSize: '0.875rem',
                backgroundColor: '#f5f5f5',
                padding: '0.75rem',
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
  // 先移除HTML标签，再处理markdown
  const cleanDesc = stripHtmlTags(desc);
  const html: any = marked(cleanDesc)

  return (
    <div className={`my-2 w-full flex justify-start items-start`}>
      {/* <SvgIcon
        className="mt-1 text-[1.875rem]"
        localIcon="view"
      /> */}

      <div className="flex flex-col w-full px-2 text-left">
        {/* 描述分析 / 数据知识 */}
        {data?.describe && (chartData?.chat_mode !== 'chat_with_analysis' && !chartData?.recommendQuestions && !chartData?.rewrite) && (
          <div className="w-full overflow-hidden mb-[0.625rem]">
            <div className="px-6 pt-2 pb-4 border-b border-[#edf1f5] flex justify-between items-center">
              <span className="font-semibold text-[#2d2d2d]">{chartData?.chat_mode === 'chat_with_knowledge' ? '数据知识' : '描述分析'}</span>

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
                className="whitespace-pre-wrap text-sm text-gray-700 transition-all duration-300 ease-in-out relative"
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
                    className={`${s['markdown-content']} text-left whitespace-pre-wrap`}
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
              <div className="w-full text-left px-6 pt-1 pb-4">
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
                        (chartData?.chat_mode === 'chat_with_db_execute' || chartData?.chat_mode === 'chat_excel') && (
                          <div className="w-full overflow-hidden">
                            <div className="pt-2 pb-4 border-b border-[#edf1f5]">
                              <span className="font-semibold text-[#2d2d2d]">图表信息</span>
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
                              chatMode={chartData?.chat_mode}
                              ansiSql={chartData?.sql}
                              onDataFetched={handleDataFetched}
                              onExportClick={handleDownload}
                              onhandleGetChartType={handleGetChartType}
                              currentTableData={queryResult.data || chartData?.data || []}
                              showTitle={false}
                            />
                            <div className="mt-3">{renderContent()}</div>
                            </div>
                          </div>
                        )
                      )}
                    </Spin>

                  {/* chat_with_analysis 归因分析 - 待补充 */}
                  {
                    chartData?.chat_mode === 'chat_with_analysis' && (
                      <CausalAnalysis data={chartData} />
                    )
                  }
                  {/* chat_with_predict 预测分析 */}
                  {chartData?.chat_mode === 'chat_with_predict' && (
                    <div className="flex" style={{ width: '100%' }}>
                      <div className="rounded bg-white" style={{ width: '100%' }}>
                        <PredictionAnalysis data={chartData} />
                      </div>
                    </div>
                  )}
                  {/* 点赞、点踩、引用、推荐、归因、预测 */}
                  {/* {chartData?.chat_mode && (
                    <StatisticsAnalysis
                      onAttributionClick={handleAttributionClick}
                      onPredictClick={handlePredictClick}
                      onReferenceClick={handleReferenceClick}
                      onDimensionClick={handleDimensionClick}
                      onIndexClick={handleIndexClick}
                      onQaClick={handleQaClick}
                      onVoteChange={handleLike}
                      feedback={chartData?.feedback || {}}
                      chatMode={chartData?.chat_mode}
                    />
                  )} */}
                  {
                    // 推荐问题
                    chartData?.recommendQuestions !== undefined && (
                      chartData.recommendQuestions?.length ? (
                        <>
                          {
                            chartData?.recommendQuestions.slice(oneBatch * batchIndex, oneBatch * (batchIndex + 1)).map((question: string) => (
                              <p key={question} className="mb-2">
                                <a onClick={() => {
                                  getAnswer!({ question });
                                }}>{question}</a>
                              </p>
                            ))
                          }
                          <div className="flex items-center justify-center mt-4 mb-2">
                            <a onClick={() => handleChangeBatch(chartData?.recommendQuestions)}><RedoOutlined />再换一批</a>
                          </div>
                        </>
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
        onClose={() => setDebugModalVisible(false)}
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
