/**
 * 视图展示组件
 * 用于展示AI返回的数据可视化结果
 * 支持图表、表格等多种数据展示形式
 * @module ViewEle
 */

import React, { useCallback, useEffect, useMemo, useRef, useState, } from "react";
import { Button, Spin, Table, message } from "antd";
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { EditorView } from '@codemirror/view';
import SvgIcon from "../../components/SvgIcon";
import { EChart } from "../../components/react-echarts";
import type { EChartsOption } from 'echarts';
import ShareModal from "./ShareModal";
import ChartConfigModal from "./ChartConfigModal";
import ModelDebugModal from "./ModelDebugModal";
import FullscreenModal from "./FullscreenModal";
import ChartHeader from "./components/ChartHeader";
import StatisticsAnalysis from './components/StatisticsAnalysis';
import PredictionAnalysis from './components/PredictionAnalysis';
import styles from './styles.module.css';
import CausalAnalysis from "./components/CausalAnalysis";
import { parseContext, parseJsonContent, isChartType, calculateRotation, isNotEmptyObject, getUserName, isSingleMetricData } from '@/utils';
import { handleDataExport, handleImageExport } from './helpers/download';
import FileTag from "@/components/FileTag"; // 引入文件组件
import { fetchDrillDown, fetchQueryRewrite, fetchRecommendQuestion, setExperteval, searchConv } from '../../service/api/conv';
import { CloseOutlined, RedoOutlined, DownOutlined } from "@ant-design/icons";
import { marked } from 'marked';

/**
 * 组件属性接口定义
 * @interface PropsType
 * @property {Object} data - 组件数据对象
 * @property {string} data.context - 上下文内容
 * @property {Function} [getAnswer] - 获取回答的回调函数
 * @property {Function} [getRecommend] - 获取推荐问题等的回调函数
 * @property {Function} [getQueryRewrite] - 推荐维度、推荐指标、归因分析、预测分析的回调函数
 * @property {Object} [paramsData] - 参数数据
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
  paramsData?: any;
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
  paramsData,
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
  const tooltipHtml = (color: any) => `<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background-color:${color}; margin-right:5px;"></span>`

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
    const baseName = conv.biz_name || '数据';
    try {
      if (['csv', 'excel'].includes(key)) {
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
        round_index: data.order,
        create_by: createBy,
        ...payload
      });
      if (res?.success) {
        const msg = payload?.eval_user === '0' ? '感谢您的点赞' : '感谢您的反馈';
        message.success(msg)
        setChartData({ ...chartData, feedback: res?.data || {} });
      }
      else {
        message.error('操作失败');
      }
    }
    catch (error) {
      console.error('操作:', error);
    }
  };

  // 处理预测分析点击
  const handlePredictClick = () => {
    if (getQueryRewrite) {
      const params = getRecommendParams(conv, data, '', '预测分析')
      getQueryRewrite(params);
    }
  };

  // 处理归因分析点击
  const handleAttributionClick = () => {
    if (getQueryRewrite) {
      const params = getRecommendParams(conv, data, '', '归因分析')
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
    if (!data || !data.length) return { xData: [], yFields: [], yData: [] };

    // 判断数据格式是单指标还是多指标
    const isSingle = isSingleMetricData(data);

    // 获取第一条数据的所有键
    const keys = Object.keys(data[0]);

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

    // 获取 xData
    const xData = data.map(item => item[xField] || '');  // 为空时返回空字符串

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
      const columns = res.data?.columns?.map((item: any) => ({ ...item, title: item.name, dataIndex: item.name, key: item.name }));
      setDrillDownData({ columns, data: res?.data?.data } || {});
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
        <div className="flex items-center justify-center h-[200px] text-gray-400">
          <div className="text-center">
            <SvgIcon localIcon="empty" className="w-12 h-12 mb-2" />
            <div>暂无数据</div>
          </div>
        </div>
      );
    }

    const getChartOption = (type: string, data: any[]): EChartsOption => {
      const { xField, yFields, xData, yData }: any = processChartData(data);  // 获取 xData 和 yData

      const isDateAxis = xData.some((x: any) => /^\d{4}-\d{2}-\d{2}/.test(x));

      // 为系列生成不同的颜色
      const colors = ['#1677ff', '#ff9f00', '#ff4f6c', '#33cc99', '#ff6600', '#3399ff'];

      // 根据索引循环颜色
      const getColor = (index: number) => colors[index % colors.length];

      // 计算x轴标签的旋转角度
      const rotation = isDateAxis ? 30 : calculateRotation(xData);

      // 使用配置的字体和字号
      const { font, fontSize, chartStyle } = chartConfig;

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
          bottom: xData.length > 15 ? '12%' : (rotation > 0 ? '15%' : '3%'), // 有滚动条或标签倾斜时增加底部间距
          containLabel: true
        },
        // 添加横向滚动条配置（只能拖动蓝色区域）
        dataZoom: [
          {
            type: 'slider',
            show: xData.length > 10, // 当数据点超过10个时显示滚动条
            xAxisIndex: 0,
            start: 0,
            end: xData.length > 10 ? Math.min(100, (10 / xData.length) * 100) : 100, // 默认显示前10个数据点
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
                  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日<br/>${yFields[0]}: ${value}`;
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
          data: xData,
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
        case 'response_bar_chart': {
          const option: EChartsOption = {
            ...baseOption,
            series: [{
              type: 'bar',
              name: yFields[0], // 只取第一个指标
              data: yData[0],   // 对应yData中的第一个数组
              // itemStyle: {
              //   color: getColor(0),
              // },
              barMaxWidth: 50,
              barGap: '30%'
            }]
          };
          return option;
        }

        case 'response_line_chart': {
          const option: EChartsOption = {
            ...baseOption,
            series: [{
              type: 'line',
              name: yFields[0], // 只取第一个指标
              data: yData[0],   // 对应yData中的第一个数组
              smooth: true,
              // itemStyle: {
              //   color: getColor(0),
              // },
              // lineStyle: {
              //   color: getColor(0),
              // }
            }]
          };
          return option;
        }

        case 'response_area_chart': {
          const option: EChartsOption = {
            ...baseOption,
            series: [{
              type: 'line',
              name: yFields[0], // 只取第一个指标
              data: yData[0],   // 对应yData中的第一个数组
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
          return option;
        }

        case 'response_pie_chart': {
          const option: EChartsOption = {
            tooltip: {
              trigger: 'item',
              formatter: '{b}: {c} ({d}%)'
            },
            legend: {
              show: true,
              itemWidth: 8,
              itemHeight: 8,
              data: xData.filter((item: any) => item !== undefined && item !== null),
              textStyle: {
                color: chartStyle.textColor,
                fontFamily: font,
                fontSize,
              }
            },
            series: [{
              type: 'pie',
              name: yFields[0], // 只取第一个指标
              radius: '70%',
              center: ['50%', '60%'],
              data: xData.map((item: any, index: any) => ({
                name: item,
                value: yData[0][index]  // 从第一个指标的 yData 中取值
              })),
              emphasis: {
                itemStyle: {
                  shadowBlur: 10,
                  shadowOffsetX: 0,
                  shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
              },
              label: {
                show: false,
                position: 'center'
              },
            }]
          };
          return option;
        }

        case 'response_donut_chart': {
          const option: EChartsOption = {
            tooltip: {
              trigger: 'item',
              formatter: '{b}: {c} ({d}%)'
            },
            legend: {
              show: true,
              itemWidth: 8,
              itemHeight: 8,
              data: xData.filter((item: any) => item !== undefined && item !== null),
              textStyle: {
                color: chartStyle.textColor,
                fontFamily: font,
                fontSize,
              }
            },
            series: [{
              type: 'pie',
              name: yFields[0], // 只取第一个指标
              radius: ['40%', '70%'],
              center: ['50%', '60%'],
              data: xData.map((item: any, index: any) => ({
                name: item,
                value: yData[0][index]  // 从第一个指标的 yData 中取值
              })),
              label: {
                show: false,
                position: 'center'
              },
            }]
          };
          return option;
        }

        // **多指标柱状图**
        case 'response_many_bar_chart': {
          const option: EChartsOption = {
            ...baseOption,
            series: yFields.map((field: any, index: any) => ({
              type: 'bar',
              name: field,   // 指标名
              data: yData[index], // 对应指标的数据
              // itemStyle: {
              //   color: getColor(index),  // 动态分配颜色
              // },
              barMaxWidth: 50,
              barGap: '30%',
              emphasis: {
                focus: 'series'
              },
            })),
          };
          return option;
        }

        // **多指标折线图**
        case 'response_many_line_chart': {
          const option: EChartsOption = {
            ...baseOption,
            series: yFields.map((field: any, index: any) => ({
              type: 'line',
              name: field,    // 指标名
              data: yData[index], // 对应指标的数据
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
            })),
          };
          return option;
        }

        default:
          return baseOption;
      }

    };

    const option = getChartOption(chartType, chartDataClone.data);
    const { xField } = processChartData(chartDataClone.data);
    return (
      <EChart
        ref={echartRef}
        option={option}
        style={{ height: '400px', width: '100%' }}
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
        <div className="flex items-center justify-center h-[200px] text-gray-400">
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
        return (
          <div ref={tableRef} className="px-[1rem]">
            <Table
              dataSource={displayData?.map((item: Record<string, any>, index: number) => ({ ...item, key: index })) || []}
              columns={Object.keys(displayData?.[0] || {}).map(key => ({
                title: key,
                dataIndex: key,
                key: key,
                ellipsis: true
              }))}
              pagination={paginationConfig}
              size="small"
              scroll={{ x: 'max-content' }}
              // className={styles.viewTable}
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
          </div>
        );
      case 'sql':
        const sqlDispaly = queryResult?.sql || chartData?.sql || chartData?.python_code;
        return (
          <div className="bg-[#f6f6f6] rounded">
            <CodeMirror
              readOnly
              value={sqlDispaly?.replace(/,/g, ',\n  ').replace(/ FROM /g, '\nFROM ').replace(/ WHERE /g, '\nWHERE ').replace(/ GROUP BY /g, '\nGROUP BY ').replace(/ ORDER BY /g, '\nORDER BY ').replace(/ LIMIT /g, '\nLIMIT ') || '暂无 SQL 语句'}
              height="auto"
              extensions={[sql()]}
              editable={false}
              basicSetup={{
                lineNumbers: true,
                foldGutter: true,
                highlightActiveLine: true,
                highlightActiveLineGutter: true,
                dropCursor: false,
              }}
              theme={EditorView.theme({
                "&": {
                  backgroundColor: "#fff",
                  border: "1px solid #aaa",
                  borderRadius: "4px"
                },
                ".cm-content": {
                  whiteSpace: "pre-wrap",
                  padding: "8px",
                  color: "#333"
                },
                ".cm-line": { padding: "0 8px" },
                ".cm-gutters": {
                  backgroundColor: "#fff",
                  color: "#999",
                  borderRight: "1px solid #aaa"
                },
                // ".cm-activeLineGutter": {
                //   backgroundColor: "#f5f5f5"
                // },
                // ".cm-activeLine": {
                //   backgroundColor: "#f5f5f5"
                // },
              })}
            />
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

      setIsCollapsed(!isCollapsed);

    } catch (error) {
      setMLoading(false);
      message.error('请求数据失败');
    }
  };

  const handleChangeStatus = () => {
    if (data.arrowStatus) {
      setIsCollapsed(!isCollapsed);
      return;
    }
  }

  // 处理markdown格式数据
  const desc = chartData?.desc || '';
  const html: any = marked(desc)

  return (
    <div className={`my-2 w-full flex justify-start ${isSharing ? 'pl-[52px]' : ''}`}>
      <SvgIcon
        className="mt-6px text-[30px]"
        localIcon="view"
      />

      <div className="flex flex-col w-full px-2 text-left">
        {/* 描述分析 */}
        {data?.describe && (chartData?.chat_mode !== 'chat_with_analysis' && !chartData?.recommendQuestions && !chartData?.rewrite) && (
          <div className="w-full bg-white border border-gray-200 rounded-lg p mb-[8px]">
            <div className="p-[0.75rem] px-[1.5625rem] border-b border-gray-200 flex justify-between items-center grid grid-cols-[1fr_5fr]">
              <span className="font-bold font-extrabold">描述分析</span>

              <div className="flex items-center gap-[20px] justify-end" onClick={handleChangeStatus}>
                {!data.arrowStatus ? (
                  <span className="text-[#666] opacity-80 cursor-pointer hover:opacity-100" onClick={fetchData}>
                    点击查看数据摘要详情
                  </span>
                ) : (
                  <span className="text-[#666] opacity-80 cursor-pointer hover:opacity-100">
                    点击查看数据摘要详情
                  </span>
                )}
                <span
                  style={{ transform: isCollapsed ? 'rotate(270deg)' : 'rotate(360deg)' }}
                  className={`cursor-pointer transition-transform duration-300`}
                >
                  <DownOutlined className="text-[#666]" />
                </span>
              </div>
            </div>
            <div className="p-[0.75rem] px-[1.5625rem]">
              <div
                ref={contentRef}
                className={`
                  whitespace-pre-wrap text-sm text-gray-700 transition-all duration-300 ease-in-out relative 
                  ${isCollapsed ? 'max-h-0 overflow-hidden' : `max-h-[${contentHeight}px] `} 
                `}
              >
                <div
                  className={`text-left whitespace-pre-wrap`}
                  dangerouslySetInnerHTML={{ __html: html }}
                  style={{ width: '90%', lineHeight: '1.1', }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {
          contextError ?
            <div className="w-full px-2 text-left bg-[#f6f6f6] pt-4 pb-4 rounded-[8px]">{contextError}</div>
            : (
              <div className="w-full px-2 text-left bg-[#f6f6f6] pt-4 rounded-[8px]">
                <div className="rounded">
                  {chartData?.chat_mode === 'chat_excel' && chartData.file_id && (
                    <div className="mb-2 ml-2 mr-2">
                      <div className="whitespace-nowrap text-[#666] text-left" style={{ width: '10%' }}>Excel分析</div>
                      <div className="mt-2 bg-[#ffffff] rounded-[8px] pl-2 pr-2 pt-2 pb-2">
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
                        <div>
                          <div className="pr-2">
                            <div className="rounded bg-[#f6f6f6] w-full p-2">
                              <div className="flex" style={{ width: '100%' }}>
                                <div className="rounded bg-white" style={{ width: '100%' }}>
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
                                  />
                                  {renderContent()}
                                </div>
                              </div>
                            </div>
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
                  {chartData?.chat_mode && (
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
                      paramsData={paramsData}
                    />
                  )}
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
                      ) : '无数据'
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
                      ) : (chartData?.err_msg || '无数据')
                    )
                  }
                </div>
              </div>
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