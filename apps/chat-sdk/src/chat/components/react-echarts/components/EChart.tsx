import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import * as echarts from 'echarts';
import { debounce } from 'lodash';
import type { EChartsOption, ECharts } from 'echarts';
export interface EChartProps {
  /** 图表配置项 */
  option: EChartsOption;
  /** 图表主题 */
  theme?: string;
  /** 图表事件 */
  onEvents?: Record<string, (params: any) => void>;
  /** 图表样式 */
  style?: React.CSSProperties;
  /** 图表加载状态 */
  loading?: boolean;
  /** 是否启用自动调整大小 */
  autoResize?: boolean;
  /** 图表类名 */
  className?: string;
}
export interface EChartHandle {
  getInstance: () => ECharts | undefined;
  resize: () => void;
  dispose: () => void;
}

const EChartComponent = forwardRef<EChartHandle, EChartProps & { handleClick: (params: any) => void }>(
  (
    {
      option,
      theme,
      onEvents,
      style = { height: '200px', width: '100%' },
      loading = false,
      autoResize = true,
      className,
      handleClick
    },
    ref
  ) => {
    const chartRef = useRef<HTMLDivElement>(null);
    const chartInstance = useRef<echarts.ECharts>();

    // 暴露方法给父组件
    useImperativeHandle(ref, () => ({
      getInstance: () => chartInstance.current,
      resize: () => chartInstance.current?.resize(),
      dispose: () => {
        if (chartInstance.current) {
          chartInstance.current.dispose();
          chartInstance.current = undefined;
        }
      },
    }));

    // 初始化图表
    useEffect(() => {
      const initChart = () => {
        if (!chartRef.current) return;

        const chart = echarts.init(chartRef.current, theme);
        chart?.on('click', handleClick)
        chartInstance.current = chart;

        chart.setOption(option);

        if (onEvents) {
          Object.entries(onEvents).forEach(([eventName, handler]) => {
            chart.on(eventName, handler);
          });
        }

        if (autoResize) {
          const resizeHandler = debounce(() => {
            chart.resize();
          }, 100);

          // 容器尺寸变化即重绘：面板拖拽改宽 / 放大态切换只改容器尺寸、不触发 window.resize，
          // 用 ResizeObserver 观察图表容器（窗口缩放时容器随之变化也会被捕获），实现实时自适应；
          // 无 ResizeObserver 的环境（旧浏览器 / jsdom）回退 window.resize 监听
          const el = chartRef.current;
          let observer: ResizeObserver | undefined;
          if (typeof ResizeObserver !== 'undefined' && el) {
            observer = new ResizeObserver(resizeHandler);
            observer.observe(el);
          } else {
            window.addEventListener('resize', resizeHandler);
          }

          return () => {
            observer?.disconnect();
            window.removeEventListener('resize', resizeHandler);
            resizeHandler.cancel();
          };
        }
      };

      const teardownAutoResize = initChart();

      return () => {
        teardownAutoResize?.();
        if (chartInstance.current) {
          chartInstance.current.dispose();
          chartInstance.current = undefined;
        }
      };
    }, [theme, autoResize, JSON.stringify(option)]);
    // }, [theme, autoResize, JSON.stringify(option), handleClick]);


    // 更新图表配置
    useEffect(() => {
      if (!chartInstance.current) return;

      if (loading) {
        chartInstance.current.showLoading();
      } else {
        chartInstance.current.hideLoading();
      }

      chartInstance.current.setOption(option, true);
    }, [option, loading]);

    return (
      <div
        ref={chartRef}
        className={className}
        style={{ 
          ...style,
          minHeight: '300px'
        }}
      />
    );
  }
);

export const EChart = React.memo(EChartComponent);
