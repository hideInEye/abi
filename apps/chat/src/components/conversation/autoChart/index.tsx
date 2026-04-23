/**
 * 自动图表组件
 * 根据数据自动选择合适的图表类型进行展示
 * 支持多种图表类型：折线图、柱状图、饼图等
 */

// import { ChatContext } from '@/app/chat-context';
// import i18n, { I18nKeys } from '@/app/i18n';
import { DownloadOutlined } from '@ant-design/icons';
import { Advice, Advisor, Datum } from '@antv/ava';
import { Chart, ChartRef } from '@berryv/g2-react';
import { Button, Col, Empty, Row, Select, Space, Tooltip } from 'antd';
import { compact, concat, uniq } from 'lodash';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { downloadImage } from '../helpers/downloadChartImage';
import { customizeAdvisor, getVisAdvices } from './advisor/pipeline';
import { defaultAdvicesFilter } from './advisor/utils';
import { customCharts } from './charts';
import { processNilData, sortData } from './charts/util';
import { AutoChartProps, ChartType, CustomAdvisorConfig, CustomChart, Specification } from './types';
import { CommonZh } from '../../../constant/chat';
import { Chart as G2Chart } from '@antv/g2';
const { Option } = Select;

interface AreaChartData {
  order_date: string;
  quantity: number;
}

/**
 * 自动图表组件属性
 */
interface Props {
  /** 图表数据 */
  data: any[];
  /** 图表类型 */
  chartType: 'bar' | 'line' | 'pie' | 'area';
  /** 图表类型变更回调 */
  onChartTypeChange?: (type: string) => void;
  /** 配置选项 */
  config?: {
    theme: string;
    font: string;
    fontSize: number;
    showTypeSelect?: boolean;
  };
  /** 图表字段配置 */
  fields?: {
    /** x轴字段名 */
    xField: string;
    /** y轴字段名 */
    yField: string;
    /** 分类字段名(用于饼图) */
    colorField?: string;
  };
  /** 坐标轴配置 */
  axis?: {
    /** x轴标题 */
    xTitle?: string;
    /** y轴标题 */
    yTitle?: string;
  };
}

/**
 * 自动图表组件
 */
const AutoChart: React.FC<Props> = ({ 
  data = [], 
  chartType = 'line',
  onChartTypeChange,
  config,
  fields = {
    xField: 'product_name',
    yField: 'total_quantity',
    colorField: 'product_name'
  },
  axis = {
    xTitle: '',
    yTitle: ''
  }
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<G2Chart>();

  useEffect(() => {
    if (!chartRef.current || !data.length) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    // 创建图表实例
    const chart = new G2Chart({
      container: chartRef.current,
      autoFit: true,
      height: 400,
    });

    // 设置主题
    chart.theme({
      fontFamily: config?.font || 'Arial',
      fontSize: config?.fontSize || 12,
      colors10: [
        '#3470f6',
        '#36CBCB',
        '#4DCB73',
        '#FAD337',
        '#F2637B',
        '#975FE4',
        '#36CBCB',
        '#4DCB73',
        '#FAD337',
        '#F2637B'
      ]
    });

    // 设置数据
    const formattedData = chartType === 'area' ? data.map(item => {
      if (!item?.[fields.xField]) {
        console.warn(`Missing ${fields.xField} in data item:`, item);
        return item;
      }
      try {
        return {
          ...item,
          [fields.xField]: new Date(item[fields.xField]).toISOString().split('T')[0]
        };
      } catch (error) {
        console.error('Error formatting date:', error, item);
        return item;
      }
    }) : data;
    
    // 数据验证
    if (!Array.isArray(formattedData) || formattedData.length === 0) {
      console.warn('Invalid or empty data:', formattedData);
      return;
    }
    
    chart.data(formattedData);

    // 根据图表类型设置编码
    if (chartType === 'line') {
      chart
        .line()
        .encode('x', fields.xField)
        .encode('y', fields.yField)
        .axis('y', {
          title: axis.yTitle || fields.yField
        })
        .axis('x', {
          title: axis.xTitle || fields.xField,
          label: {
            autoRotate: true,
            autoHide: true,
            autoEllipsis: true
          }
        });
    } else if (chartType === 'bar') {
      chart
        .interval()
        .encode('x', fields.xField)
        .encode('y', fields.yField)
        .axis('y', {
          title: axis.yTitle || fields.yField
        })
        .axis('x', {
          title: axis.xTitle || fields.xField,
          label: {
            autoRotate: true,
            autoHide: true,
            autoEllipsis: true
          }
        });
    } else if (chartType === 'pie') {
      chart.coordinate({ type: 'theta' });
      chart
        .interval()
        .encode('y', fields.yField)
        .encode('color', fields.colorField || fields.xField)
        .label({
          text: fields.colorField || fields.xField,
          position: 'outside'
        })
        .tooltip({
          items: [fields.colorField || fields.xField, fields.yField]
        });
    } else if (chartType === 'area') {
      chart
        .area()
        .encode('x', fields.xField)
        .encode('y', fields.yField)
        .style('fillOpacity', 0.3)
        .style('fill', '#3470f6')
        .style('stroke', '#3470f6')
        .style('lineWidth', 2)
        .axis('y', {
          title: axis.yTitle || fields.yField,
          grid: {
            line: {
              style: {
                stroke: '#e8e8e8',
                lineDash: [4, 4]
              }
            }
          }
        })
        .axis('x', {
          title: axis.xTitle || fields.xField,
          label: {
            autoRotate: true,
            autoHide: true,
            autoEllipsis: true,
            formatter: (text: string) => {
              const date = new Date(text);
              return `${date.getMonth() + 1}月${date.getDate()}日`;
            }
          }
        })
        .tooltip({
          title: (d) => {
            const date = new Date(d[fields.xField]);
            return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
          },
          items: [
            {
              field: fields.yField,
              name: '订单数量'
            }
          ]
        });
    }

    // 渲染图表
    chart.render();
    chartInstance.current = chart;

    // 清理函数
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data, chartType, config, fields, axis]);

  return (
    <div>
      <div ref={chartRef} style={{ minHeight: '400px' }} />
    </div>
  );
};

export default AutoChart

export * from './helpers';
