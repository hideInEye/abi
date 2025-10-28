import { hasSubset } from '../advisor/utils';
import type { ChartKnowledge, CustomChart, GetChartConfigProps, Specification } from '../types';

import { findNominalField, findOrdinalField } from './util';

const getChartSpec = (data: GetChartConfigProps['data'], dataProps: GetChartConfigProps['dataProps']) => {
  try {
    const field4Y = dataProps?.filter(field => hasSubset(field.levelOfMeasurements, ['Interval']));
    const nominalField = findNominalField(dataProps);
    const ordinalField = findOrdinalField(dataProps);
    const field4X = nominalField ?? ordinalField;
    if (!field4X || !field4Y) return null;

    const spec: Specification = {
      children: [],
      data,
      type: 'view'
    };

    field4Y?.forEach(field => {
      const singleLine: Specification = {
        encode: {
          color: () => field.name,
          series: () => field.name,
          x: field4X.name,
          y: field.name
        },
        type: 'interval'
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
  alias: ['multi_measure_column_chart'],
  category: ['Statistic'],
  channel: ['Color', 'Direction', 'Position'],
  coord: ['Cartesian2D'],
  dataPres: [
    { fieldConditions: ['Interval'], maxQty: '*', minQty: 1 },
    { fieldConditions: ['Nominal'], maxQty: 1, minQty: 1 }
  ],
  def: 'multi_measure_column_chart uses lines with segments to show changes in data in a ordinal dimension',
  family: ['ColumnCharts'],
  id: 'multi_measure_column_chart',
  name: 'multi_measure_column_chart',
  purpose: ['Comparison', 'Distribution'],
  recRate: 'Recommended',
  shape: ['Lines'],
  toSpec: getChartSpec
};

/* 订制一个图表需要的所有参数 */
export const multi_measure_column_chart: CustomChart = {
  /* 图表知识 */
  chartKnowledge: ckb as ChartKnowledge,
  /* 图表唯一 Id */
  chartType: 'multi_measure_column_chart',
  /** 图表中文名 */
  chineseName: '折线图'
};

export default multi_measure_column_chart;
