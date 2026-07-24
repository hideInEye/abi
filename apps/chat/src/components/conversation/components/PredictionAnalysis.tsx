/**
 * 预测分析组件 - 用于展示时间序列数据的实际值和预测值
 * 支持数据解析、图表展示和交互功能
 */

import React, { useState, useEffect, useRef } from 'react';
import { Table, Tooltip } from 'antd';
import { BugOutlined, DownloadOutlined } from '@ant-design/icons';
import { EChart } from '../../../components/react-echarts';
import type { EChartHandle } from '../../../components/react-echarts/components/EChart';
import type { EChartsOption } from 'echarts';
import './styles.css';

/**
 * 定义图表数据项的接口
 */
interface ChartDataItem {
  date: string;
  value: number | null;
  type: 'actual' | 'predicted';
}

/**
 * 组件属性接口
 */
interface PropsType {
  data: any;  // 组件数据对象
  /** 点击模型调试图标的回调 */
  onDebugClick?: () => void;
}

/**
 * 预测分析组件
 * @param {PropsType} props - 组件属性
 * @returns {JSX.Element} 预测分析图表组件
 */
const PredictionAnalysis: React.FC<PropsType> = ({ data, onDebugClick }) => {
  // 使用 useState 管理图表数据状态
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);
  // 图表实例引用，用于导出图片（保持原 echarts saveAsImage 的下载行为）
  const echartRef = useRef<EChartHandle>(null);

  // 下载：导出当前预测图表为 PNG（等价于原 echarts toolbox.saveAsImage）
  const handleDownloadImage = () => {
    const instance = echartRef.current?.getInstance();
    if (!instance) return;
    const url = instance.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' });
    const link = document.createElement('a');
    link.href = url;
    link.download = '预测分析.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  /**
   * 解析原始数据
   */
  const parseData = (data: string | any[]): ChartDataItem[] => {
    try {
      // 如果数据已经是数组格式（历史数据），直接处理
      if (Array.isArray(data)) {
        return data.map(item => ({
          date: item.date || item.ds,
          value: typeof item.value === 'number' ? item.value : (typeof item.y === 'number' ? item.y : parseFloat(item.value || item.y)),
          type: item.type === 'real' || item.type === 'actual' ? 'actual' : 'predicted'
        }));
      }

      // 如果数据是字符串格式，按原来的方式解析
      if (typeof data !== 'string') {
        console.error('数据格式不支持:', typeof data);
        return [];
      }

      const lines = data.trim().split('\n');
      
      // 检查是否是 MCP 表格格式数据
      if (lines.length > 0 && lines[0].includes('rh_prediction')) {
        const parsedData: ChartDataItem[] = [];
        // 从第二行开始解析数据
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const values = line.split(/\s+/);
          if (values.length >= 2) {
            const rowIndex = values[0];
            const predictionValue = parseFloat(values[values.length - 1]);
            
            if (!isNaN(predictionValue)) {
              parsedData.push({
                date: `预测${parseInt(rowIndex) + 1}`,
                value: predictionValue,
                type: 'predicted'
              });
            }
          }
        }
        return parsedData;
      }

      // 原有的时间序列数据解析逻辑
      const [ds, y, type] = lines[0].split(/\s+/);
      
      const parsedData: ChartDataItem[] = [];
      
      for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          // 分割行，但保留日期时间中的空格
          const parts: any[] = [];
          let inDateTime = false;
          let tempPart = '';
          
          line.split(' ').forEach(segment => {
              // 检测日期部分
              if (segment.match(/^\d{4}-\d{2}-\d{2}$/)) {
                  inDateTime = true;
                  tempPart = segment;
              } 
              // 检测时间部分
              else if (inDateTime && segment.match(/^\d{2}:\d{2}:\d{2}$/)) {
                  tempPart += ' ' + segment;
                  parts.push(tempPart);
                  inDateTime = false;
                  tempPart = '';
              }
              // 检测数值部分
              else if (segment.match(/^[\d.]+$/)) {
                  parts.push(segment);
              }
              // 检测类型部分
              else if (segment.match(/^(real|predict)$/)) {
                  parts.push(segment);
              }
              // 处理行号
              else if (segment.match(/^\d+$/)) {
                  parts.push(segment);
              }
          });
          
          // 确保我们有足够的部件来构建数据对象
          if (parts.length >= 4) {
              const dateIndex = parts.findIndex(p => p.includes('-') && p.includes(':'));
              if (dateIndex !== -1) {
                  const date = parts[dateIndex];
                  const value = parseFloat(parts[dateIndex + 1]);
                  const dataType = parts[dateIndex + 2];
                  
                  if (!isNaN(value)) {
                      parsedData.push({
                          date: date,
                          value: value,
                          type: dataType.toLowerCase() === 'real' ? 'actual' : 'predicted'
                      });
                  }
              }
          }
      }

      if (parsedData.length === 0) {
        console.error('没有解析到任何数据');
        return [];
      }

      // 按日期分组并计算每天的总和
      const dateGroups = new Map<string, { real: number; predict: number }>();
      
      parsedData.forEach(item => {
        const date = item.date;
        if (!dateGroups.has(date)) {
          dateGroups.set(date, { real: 0, predict: 0 });
        }
        const group = dateGroups.get(date)!;
        
        if (item.type === 'actual') {
          group.real += item.value!;
        } else if (item.type === 'predicted') {
          group.predict += item.value!;
        }
      });

      // 获取所有日期并排序
      const dates = Array.from(dateGroups.keys()).sort((a, b) => {
        const dateA = new Date(a);
        const dateB = new Date(b);
        return dateA.getTime() - dateB.getTime();
      });

      const realValues: (number | null)[] = [];
      const predictValues: (number | null)[] = [];

      // 找到最后一个实际值的日期和第一个预测值的日期
      const lastRealDate = dates.filter(date => 
        parsedData.some(item => item.date === date && item.type === 'actual')
      ).pop();

      const firstPredictDate = dates.filter(date => 
        parsedData.some(item => item.date === date && item.type === 'predicted')
      )[0];

      // 获取最后一个实际值
      const lastRealValue = lastRealDate ? dateGroups.get(lastRealDate)!.real : null;

      dates.forEach(date => {
        const group = dateGroups.get(date)!;
        // 检查这个日期是否有预测数据
        const hasPrediction = parsedData.some(item => item.date === date && item.type === 'predicted');
        // 检查这个日期是否有实际数据
        const hasReal = parsedData.some(item => item.date === date && item.type === 'actual');

        if (hasPrediction) {
          // 预测数据
          realValues.push(null);
          predictValues.push(group.predict);  // 直接添加预测值，不再添加额外的连接点
        } else if (hasReal) {
          // 实际数据
          realValues.push(group.real);
          if (date === lastRealDate) {
            // 在最后一个实际数据点添加预测起始值
            predictValues.push(group.real);
          } else {
            predictValues.push(null);
          }
        }
      });

      return parsedData.map(item => ({
        date: item.date,
        value: item.value,
        type: item.type === 'actual' ? 'actual' : 'predicted'
      }));
    } catch (error) {
      console.error('数据解析错误:', error);
      return [];
    }
  };

  /**
   * 处理图表数据
   */
  const processChartData = (data: ChartDataItem[]): ChartDataItem[] => {
    const resData = data.map((item: any) => {
      const isActual = item.type === 'actual';
      return {
        ...item,
        name: isActual ? '实际值' : '预测值'
      }
    })
    return resData;
  };

  /**
   * 使用 useEffect 处理数据初始化
   */
  useEffect(() => {
    if (data) {
      try {
        const parsedData = parseData(data?.result_df);
        if (parsedData.length > 0) {
          setChartData(processChartData(parsedData));
        }
      } catch (error) {
        console.error('数据处理错误:', error);
      }
    }
  }, [data]);

  /**
   * 图表配置对象
   */
  const option = React.useMemo((): EChartsOption => {
    // 准备数据
    const dates = chartData.map(item => item.date);
    const actualData = chartData.filter(item => item.type === 'actual').map(item => item.value);
    const actualDataLen = actualData.length;
    const predictedData = chartData.map((item, index) => {
        return index < actualDataLen - 1 ? null : item.value;
    });
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        },
        formatter: function(params: any) {
          // 过滤掉无效数据
          const validParams = params.filter((param: { seriesIndex: number; dataIndex: number; }) => {
            if (param.seriesIndex === 0) return true;
            return param.seriesIndex === 1 && param.dataIndex >= actualDataLen;
          });
          
          if (validParams.length === 0) return '';
          
          const date = validParams[0].axisValue;
          let tooltip = `<div style="margin-bottom: 5px;">${date}</div>`;
          
          validParams.forEach((param: any) => {
            const color = param.seriesIndex === 0 ? '#5470C6' : '#91CC75';
            const name = param.seriesIndex === 0 ? '实际值' : '预测值';
            tooltip += `
              <div style="display: flex; align-items: center;">
                <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${color}; margin-right: 5px;"></span>
                <span>${name}: <strong>${param.value}</strong></span>
              </div>
            `;
          });
          return tooltip;
        }
      },
      xAxis: {
        type: 'category' as const,
        boundaryGap: false,
        data: dates
      },
      yAxis: {
        type: 'value' as const,
        axisPointer: {
          snap: true
        }
      },
      series: [
        {
          type: 'line',
          smooth: true,
          data: actualData,
          lineStyle: {
            color: '#5470C6'
          },
          itemStyle: {
            color: '#5470C6'
          },
          symbol: 'circle',
          symbolSize: 6
        },
        {
          type: 'line',
          smooth: true,
          connectNulls: true,
          data: predictedData,
          lineStyle: {
            color: '#91CC75'
          },
          itemStyle: {
            color: function(params: any) {
              return params.dataIndex === actualDataLen - 1 ? 'transparent' : '#91CC75';
            }
          },
          symbol: 'circle',
          symbolSize: 6,
          markArea: {
            itemStyle: {
              color: 'rgba(238, 102, 102, 0.1)'
            },
            data: [
              [
                { xAxis: chartData.filter(item => item.type === 'actual').at(-1)?.date || '' },
                { xAxis: chartData.filter(item => item.type === 'predicted').at(-1)?.date || '' }
              ]
            ]
          }
        }
      ]
    };
  }, [chartData]);

  /**
   * 获取 AQI 等级颜色
   */
  const getAQIColor = (value: number): string => {
    if (value <= 50) return '#00e400';      // 优 - 绿色
    if (value <= 100) return '#ffff00';     // 良 - 黄色
    if (value <= 150) return '#ff7e00';     // 轻度污染 - 橙色
    if (value <= 200) return '#ff0000';     // 中度污染 - 红色
    if (value <= 300) return '#99004c';     // 重度污染 - 紫色
    return '#7e0023';                       // 严重污染 - 褐红色
  };

  /**
   * 渲染表格数据 - 新版本（显示特征列和预测值）
   */
  const renderTable = () => {
    let inputData: any[] = [];
    let predictions: any[] = [];
    let featureKeys: string[] = [];
    
    // 从 result_df 解析数据（输入特征 + 预测结果）
    if (data?.result_df && typeof data.result_df === 'string') {
      try {
        const lines = data.result_df.trim().split('\n');
        
        if (lines.length > 1) {
          // 解析列名（第一行）
          const headers = lines[0].trim().split(/\s+/);
          
          // 去掉最后一列（预测列），其他都是特征列
          featureKeys = headers.slice(0, -1);
          
          // 解析数据行
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const values = line.split(/\s+/);
            
            // 跳过第一个值（索引），解析剩余的值
            const dataValues = values.slice(1);
            
            if (dataValues.length > 0) {
              // 构建特征对象
              const rowData: any = {};
              for (let j = 0; j < featureKeys.length && j < dataValues.length - 1; j++) {
                rowData[featureKeys[j]] = parseFloat(dataValues[j]);
              }
              inputData.push(rowData);
              
              // 最后一个值是预测结果
              const predValue = parseFloat(dataValues[dataValues.length - 1]);
              if (!isNaN(predValue)) {
                predictions.push(predValue);
              }
            }
          }
        }
      } catch (e) {
        console.error('Failed to parse result_df:', e);
      }
    }
    
    // 如果没有输入数据，返回空
    if (inputData.length === 0) {
      return <div>暂无数据</div>;
    }

    // 构建表格数据
    const tableData = inputData.map((item: any, index: number) => {
      const predictionValue = predictions[index] !== undefined ? predictions[index] : null;
      
      return {
        key: index,
        ...item,
        prediction: predictionValue
      };
    });

    // 构建表格列
    const columns: any[] = featureKeys.map((key) => ({
      title: key.toUpperCase(),
      dataIndex: key,
      key: key,
      render: (value: number) => typeof value === 'number' ? value.toFixed(1) : value
    }));

    // 添加预测值列
    columns.push({
      title: '预测AQI',
      dataIndex: 'prediction',
      key: 'prediction',
      render: (value: number | null) => {
        if (value === null || value === undefined) return '-';
        const displayValue = typeof value === 'number' ? Math.round(value) : value;
        return (
          <span style={{ 
            color: getAQIColor(displayValue),
            fontWeight: 'bold'
          }}>
            {displayValue}
          </span>
        );
      }
    });

    return (
      <Table
        columns={columns}
        dataSource={tableData}
        pagination={{ 
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条数据`
        }}
        size="small"
        bordered
      />
    );
  };
  
  // 判断是否应该渲染表格
  const shouldRenderTable = data?.predict_with_mcp || data?.predict_type === 'predict_with_mcp';

  return (
    <div className="prediction-analysis">
      {/* 标题栏：与问数保持一致，文案为「图表信息」 */}
      <div className="w-full overflow-hidden">
        <div className="section-header pt-3 pb-3">
          <span className="chart-header-title font-semibold text-[#2d2d2d]">图表信息</span>
        </div>
        <div className="pt-3">
          {shouldRenderTable ? (
            renderTable()
          ) : (
            <>
              {/* 工具栏：模型调试 + 下载，采用与问数一致的 chart-header-icon 样式 */}
              <div className="flex items-center justify-end gap-1">
                {onDebugClick && (
                  <Tooltip title="模型调试">
                    <span className="chart-header-icon" onClick={onDebugClick}>
                      <BugOutlined />
                    </span>
                  </Tooltip>
                )}
                <Tooltip title="下载">
                  <span className="chart-header-icon" onClick={handleDownloadImage}>
                    <DownloadOutlined />
                  </span>
                </Tooltip>
              </div>
              <EChart ref={echartRef} option={option} handleClick={() => {}} />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PredictionAnalysis;