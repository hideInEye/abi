/**
 * 预测分析组件 - 用于展示时间序列数据的实际值和预测值
 * 支持数据解析、图表展示和交互功能
 */

import React, { useState, useEffect } from 'react';
import { EChart } from '../../../components/react-echarts';
import type { EChartsOption } from 'echarts';

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
}

/**
 * 预测分析组件
 * @param {PropsType} props - 组件属性
 * @returns {JSX.Element} 预测分析图表组件
 */
const PredictionAnalysis: React.FC<PropsType> = ({ data }) => {
  // 使用 useState 管理图表数据状态
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);
  
  /**
   * 解析原始数据
   */
  const parseData = (data: string): ChartDataItem[] => {
    try {
      // 使用正则表达式按数字索引分割数据行，避免日期时间中的空格被错误分割
      // console.log(data)
      const lines = data.trim().split('\n');
      // console.log(lines)
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
  const option = React.useMemo(() => {
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
        formatter: function(params: any[]) {
          // 过滤掉无效数据
          const validParams = params.filter((param: { seriesIndex: number; dataIndex: number; }) => {
            if (param.seriesIndex === 0) return true;
            return param.seriesIndex === 1 && param.dataIndex >= actualDataLen;
          });
          
          if (validParams.length === 0) return null;
          
          const date = validParams[0].axisValue;
          let tooltip = `<div style="margin-bottom: 5px;">${date}</div>`;
          
          validParams.forEach(param => {
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
      toolbox: {
        show: true,
        feature: {
          saveAsImage: {}
        }
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: dates
      },
      yAxis: {
        type: 'value',
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
            color: function(params: { dataIndex: number; }) {
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
  return (
    <div className="prediction-analysis">
      <EChart option={option} />
    </div>
  );
};

export default PredictionAnalysis; 