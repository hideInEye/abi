import type { Datum } from '@antv/ava';

import { hasSubset } from '../advisor/utils';
import type { ChartKnowledge, CustomChart, GetChartConfigProps, Specification } from '../types';

import { findNominalField, findOrdinalField, getLineSize, processDateEncode, sortData } from './util';

const MULTI_LINE_CHART = 'multi_line_chart';
const getChartSpec = (data: GetChartConfigProps['data'], dataProps: GetChartConfigProps['dataProps']) => {
  const ordinalField = findOrdinalField(dataProps);
  const nominalField = findNominalField(dataProps);
  // 放宽折线图的 x 轴条件，优先选择 time， ordinal, nominal 类型，没有的话使用第一个字段作兜底
  const field4X = ordinalField ?? nominalField ?? dataProps[0];
  const remainFields = dataProps.filter(field => field.name !== field4X?.name);

  const field4Y = remainFields.filter(
    field => field.levelOfMeasurements && hasSubset(field.levelOfMeasurements, ['Interval'])
  ) ?? [remainFields[0]];
  const field4Nominal = remainFields
    .filter(field => !field4Y.find(y => y.name === field.name))
    .find(field => field.levelOfMeasurements && hasSubset(field.levelOfMeasurements, ['Nominal']));
  if (!field4X || !field4Y) return null;

  const spec: Specification = {
    autoFit: true,
    children: [],
    data: sortData({ chartType: MULTI_LINE_CHART, data, xField: field4X }),
    type: 'view'
  };

  field4Y.forEach(field => {
    const singleLine: Specification = {
      encode: {
        size: (datum: Datum) => getLineSize(datum, data, { field4Split: field4Nominal, field4X }),
        x: processDateEncode(field4X.name as string, dataProps),
        y: field.name
      },
      legend: {
        size: false
      },
      type: 'line'
    };
    if (field4Nominal) {
      singleLine.encode.color = field4Nominal.name;
    }
    spec.children.push(singleLine);
  });
  return spec;
};

const ckb: ChartKnowledge = {
  alias: ['multi_line_chart'],
  category: ['Statistic'],
  channel: ['Color', 'Direction', 'Position'],
  coord: ['Cartesian2D'],
  dataPres: [
    { fieldConditions: ['Time', 'Ordinal'], maxQty: 1, minQty: 1 },
    { fieldConditions: ['Interval'], maxQty: '*', minQty: 1 },
    { fieldConditions: ['Nominal'], maxQty: 1, minQty: 0 }
  ],
  def: 'multi_line_chart uses lines with segments to show changes in data in a ordinal dimension',
  family: ['LineCharts'],
  id: MULTI_LINE_CHART,
  name: 'multi_line_chart',
  purpose: ['Comparison', 'Trend'],
  recRate: 'Recommended',
  shape: ['Lines'],
  toSpec: getChartSpec
};

/* 订制一个图表需要的所有参数 */
export const multi_line_chart: CustomChart = {
  /* 图表知识 */
  chartKnowledge: ckb as ChartKnowledge,
  /* 图表唯一 Id */
  chartType: 'multi_line_chart',
  /** 图表中文名 */
  chineseName: '折线图'
};

export default multi_line_chart;
