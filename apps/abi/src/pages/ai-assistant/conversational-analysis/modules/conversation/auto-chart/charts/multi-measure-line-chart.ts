import type { Datum } from '@antv/ava';

import { hasSubset } from '../advisor/utils';
import type { ChartKnowledge, CustomChart, GetChartConfigProps, Specification } from '../types';

import { findNominalField, findOrdinalField, getLineSize, processDateEncode, sortData } from './util';

const MULTI_MEASURE_LINE_CHART = 'multi_measure_line_chart';
const getChartSpec = (data: GetChartConfigProps['data'], dataProps: GetChartConfigProps['dataProps']) => {
  try {
    // 优先确认 x 轴，如果没有枚举类型字段，取第一个字段为 x 轴
    const field4Nominal = findNominalField(dataProps) ?? findOrdinalField(dataProps) ?? dataProps[0];

    const field4Y = dataProps?.filter(
      field => field.name !== field4Nominal?.name && hasSubset(field.levelOfMeasurements, ['Interval'])
    );
    if (!field4Nominal || !field4Y) return null;

    const spec: Specification = {
      children: [],
      data: sortData({ chartType: MULTI_MEASURE_LINE_CHART, data, xField: field4Nominal }),
      type: 'view'
    };

    field4Y?.forEach(field => {
      const singleLine: Specification = {
        encode: {
          color: () => field.name,
          series: () => field.name,
          size: (datum: Datum) => getLineSize(datum, data, { field4X: field4Nominal }),
          x: processDateEncode(field4Nominal.name as string, dataProps),
          y: field.name
        },
        legend: {
          size: false
        },
        type: 'line'
      };
      spec.children.push(singleLine);
    });
    return spec;
  } catch (err) {
    console.log(err);
    return null;
  }
};

const ckb: ChartKnowledge = {
  alias: ['multi_measure_line_chart'],
  category: ['Statistic'],
  channel: ['Color', 'Direction', 'Position'],
  coord: ['Cartesian2D'],
  dataPres: [
    { fieldConditions: ['Interval'], maxQty: '*', minQty: 1 },
    { fieldConditions: ['Nominal'], maxQty: 1, minQty: 1 }
  ],
  def: 'multi_measure_line_chart uses lines with segments to show changes in data in a ordinal dimension',
  family: ['LineCharts'],
  id: MULTI_MEASURE_LINE_CHART,
  name: 'multi_measure_line_chart',
  purpose: ['Comparison', 'Distribution'],
  recRate: 'Recommended',
  shape: ['Lines'],
  toSpec: getChartSpec
};

/* 订制一个图表需要的所有参数 */
export const multi_measure_line_chart: CustomChart = {
  /* 图表知识 */
  chartKnowledge: ckb as ChartKnowledge,
  /* 图表唯一 Id */
  chartType: 'multi_measure_line_chart',
  /** 图表中文名 */
  chineseName: '折线图'
};

export default multi_measure_line_chart;
