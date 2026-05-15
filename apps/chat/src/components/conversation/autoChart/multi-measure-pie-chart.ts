import { Chart as G2Chart } from '@antv/g2';
import { AutoChartProps } from './types';

/**
 * 多度量饼图组件
 * @param {AutoChartProps} props - 组件属性
 * @returns {JSX.Element} 多度量饼图组件
 */
export const MultiMeasurePieChart: React.FC<AutoChartProps> = ({ data }) => {
  const chartRef = React.useRef<HTMLDivElement>(null);
  const chartInstance = React.useRef<G2Chart>();

  React.useEffect(() => {
    if (!chartRef.current || !data.length) return;

    // 销毁旧图表实例
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    // 创建新图表实例
    const chart = new G2Chart({
      container: chartRef.current,
      autoFit: true,
      height: 400,
    });

    // 设置数据
    chart.data(data);

    // 设置饼图
    chart.coordinate('theta', { radius: 0.75 });
    
    // 设置度量字段
    const measureFields = Object.keys(data[0]).filter(key => typeof data[0][key] === 'number');
    
    measureFields.forEach(field => {
      chart.interval()
        .position(field)
        .color('type')
        .adjust('stack');
    });

    // 添加图例
    chart.legend({
      position: 'right',
    });

    // 添加标签
    chart.label({
      type: 'inner',
      offset: '-30%',
      content: '{value}',
      style: {
        fontSize: 14,
        textAlign: 'center',
      },
    });

    // 渲染图表
    chart.render();
    chartInstance.current = chart;

    // 清理函数
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data]);

  return <div ref={chartRef} />;
};

export default MultiMeasurePieChart; 