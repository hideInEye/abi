import type { EChartsOption } from 'echarts';

export type { EChartsOption };

export interface ChartConfig {
  /** 图表类型 */
  type: 'line' | 'bar' | 'pie' | 'scatter' | 'radar' | 'custom';
  /** 图表标题 */
  title?: string;
  /** 图表数据 */
  data: any[];
  /** x轴字段 */
  xField?: string;
  /** y轴字段 */
  yField?: string;
  /** 系列字段 */
  seriesField?: string;
  /** 自定义配置 */
  customOption?: EChartsOption;
} 