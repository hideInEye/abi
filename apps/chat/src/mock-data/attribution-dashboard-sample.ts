/**
 * 归因分析（chat_with_analysis）数据类型定义与静态样例。
 *
 * 数据结构与后端 root_analysis 返回一致：扁平结构，包含指标概览、
 * 维度归因表、因子明细、瀑布数据、交叉归因、异常检测等字段。
 * 组件 AttributionDashboard 依据此结构渲染四个分析视图。
 *
 * @module attribution-dashboard-sample
 */

/** 贡献方向 */
export type ContributionDirection = 'positive' | 'negative' | string;

/** 维度归因表条目 */
export interface DimensionRow {
  rank: number;
  dimension: string;
  dimension_label: string;
  gini_score: number;
  contribution_pct: number;
  direction: ContributionDirection;
}

/** 单个因子明细 */
export interface FactorItem {
  factor_value: string;
  contribution_amount: number;
  contribution_pct: number;
  direction: ContributionDirection;
  current_metric?: number | null;
  baseline_metric?: number | null;
  rank: number;
}

/** 按维度分组的因子明细 */
export interface FactorGroup {
  dimension: string;
  dimension_label: string;
  gini_score: number;
  factors: FactorItem[];
}

/** 瀑布图条目 */
export interface WaterfallItem {
  label: string;
  value: number;
  type: 'start' | 'positive' | 'negative' | 'end' | string;
}

/** 交叉归因子因子 */
export interface CrossSubFactor {
  factor_value: string;
  contribution_amount: number;
  contribution_pct: number;
  direction: ContributionDirection;
}

/** 交叉归因关系 */
export interface CrossItem {
  parent_dimension: string;
  parent_factor: string;
  best_sub_dimension: string;
  sub_dimension_gini: number;
  sub_factors: CrossSubFactor[];
}

/** 异常检测结果 */
export interface AnomalyResult {
  is_anomaly: boolean;
  anomaly_level: string;
  anomaly_score: number;
  algorithm: string;
  detected_value: number;
  expected_value: number;
  threshold: number;
  message: string;
}

/** 指标概览 */
export interface MetricOverview {
  metric_label: string;
  current_value: number;
  baseline_value: number | null;
  delta_value: number | null;
}

/** 归因分析完整数据结构 */
export interface AttributionAnalysisData {
  chat_mode: string;
  strategy_name: string;
  target_metric: string;
  analysis_modes: string[];
  semantic_group_name?: string;
  semantic_name?: string;
  semantic_id?: number;
  result_explain: string;
  dimension_table: DimensionRow[];
  factor_table: FactorGroup[];
  waterfall_data: WaterfallItem[];
  diff_data?: any[];
  cross_data: CrossItem[];
  anomaly_result: AnomalyResult;
  metric_overview: MetricOverview;
}

/** 静态样例数据（后端未就绪时用于预览） */
export const ATTRIBUTION_ANALYSIS_SAMPLE: AttributionAnalysisData = {
  chat_mode: 'chat_with_analysis',
  strategy_name: '归因分析_订单总金额',
  target_metric: '订单总金额',
  analysis_modes: ['component', 'comparison', 'diff', 'cross'],
  semantic_group_name: '',
  semantic_name: '',
  semantic_id: 381,
  result_explain:
    '当前分析周期，订单总金额 为 669.20K，较 对比基准 上升 669.20K（0%）。主要影响维度为 取消原因（贡献率 100.00%）和 收货城市。其中 不想买了 是提升 订单总金额 最主要的因子，贡献量为 197.06K，占总变化的 29.45%。',
  dimension_table: [
    { rank: 1, dimension: '取消原因', dimension_label: '取消原因', gini_score: 0.1212, contribution_pct: 100.0, direction: 'positive' },
    { rank: 2, dimension: '收货城市', dimension_label: '收货城市', gini_score: 0.5925, contribution_pct: 44.39, direction: 'positive' },
    { rank: 3, dimension: '订单编号', dimension_label: '订单编号', gini_score: 0.6525, contribution_pct: 8.9, direction: 'positive' },
  ],
  factor_table: [
    {
      dimension: '取消原因',
      dimension_label: '取消原因',
      gini_score: 0.1212,
      factors: [
        { factor_value: '不想买了', contribution_amount: 197062.69, contribution_pct: 29.45, direction: 'positive', current_metric: 197062.69, baseline_metric: null, rank: 1 },
        { factor_value: '其他原因', contribution_amount: 133255.88, contribution_pct: 19.91, direction: 'positive', current_metric: 133255.88, baseline_metric: null, rank: 2 },
        { factor_value: '找到更便宜的', contribution_amount: 121268.59, contribution_pct: 18.12, direction: 'positive', current_metric: 121268.59, baseline_metric: null, rank: 3 },
        { factor_value: '地址信息填错', contribution_amount: 110682.07, contribution_pct: 16.54, direction: 'positive', current_metric: 110682.07, baseline_metric: null, rank: 4 },
        { factor_value: '等待时间过长', contribution_amount: 106928.0, contribution_pct: 15.98, direction: 'positive', current_metric: 106928.0, baseline_metric: null, rank: 5 },
      ],
    },
    {
      dimension: '收货城市',
      dimension_label: '收货城市',
      gini_score: 0.5925,
      factors: [
        { factor_value: '上海', contribution_amount: 123473.3, contribution_pct: 18.45, direction: 'positive', current_metric: 123473.3, baseline_metric: null, rank: 1 },
        { factor_value: '北京', contribution_amount: 49460.15, contribution_pct: 7.39, direction: 'positive', current_metric: 49460.15, baseline_metric: null, rank: 2 },
        { factor_value: '德阳', contribution_amount: 45862.04, contribution_pct: 6.85, direction: 'positive', current_metric: 45862.04, baseline_metric: null, rank: 3 },
        { factor_value: '东莞', contribution_amount: 43245.06, contribution_pct: 6.46, direction: 'positive', current_metric: 43245.06, baseline_metric: null, rank: 4 },
        { factor_value: '深圳', contribution_amount: 34985.32, contribution_pct: 5.23, direction: 'positive', current_metric: 34985.32, baseline_metric: null, rank: 5 },
      ],
    },
    {
      dimension: '订单编号',
      dimension_label: '订单编号',
      gini_score: 0.6525,
      factors: [
        { factor_value: 'ORD2025100110003005', contribution_amount: 14898.94, contribution_pct: 2.23, direction: 'positive', current_metric: 14898.94, baseline_metric: null, rank: 1 },
        { factor_value: 'ORD2025090610002121', contribution_amount: 13240.05, contribution_pct: 1.98, direction: 'positive', current_metric: 13240.05, baseline_metric: null, rank: 2 },
        { factor_value: 'ORD2025092010002649', contribution_amount: 11098.04, contribution_pct: 1.66, direction: 'positive', current_metric: 11098.04, baseline_metric: null, rank: 3 },
        { factor_value: 'ORD2025102510004061', contribution_amount: 10460.3, contribution_pct: 1.56, direction: 'positive', current_metric: 10460.3, baseline_metric: null, rank: 4 },
        { factor_value: 'ORD2025072610000735', contribution_amount: 9892.71, contribution_pct: 1.48, direction: 'positive', current_metric: 9892.71, baseline_metric: null, rank: 5 },
      ],
    },
  ],
  waterfall_data: [
    { label: '基准值', value: 0.0, type: 'start' },
    { label: '取消原因/不想买了', value: 197062.69, type: 'positive' },
    { label: '取消原因/其他原因', value: 133255.88, type: 'positive' },
    { label: '取消原因/找到更便宜的', value: 121268.59, type: 'positive' },
    { label: '取消原因/地址信息填错', value: 110682.07, type: 'positive' },
    { label: '取消原因/等待时间过长', value: 106928.0, type: 'positive' },
    { label: '收货城市/上海', value: 123473.3, type: 'positive' },
    { label: '收货城市/北京', value: 49460.15, type: 'positive' },
    { label: '收货城市/德阳', value: 45862.04, type: 'positive' },
    { label: '收货城市/东莞', value: 43245.06, type: 'positive' },
    { label: '收货城市/深圳', value: 34985.32, type: 'positive' },
    { label: '订单编号/ORD2025100110003005', value: 14898.94, type: 'positive' },
    { label: '订单编号/ORD2025090610002121', value: 13240.05, type: 'positive' },
    { label: '订单编号/ORD2025092010002649', value: 11098.04, type: 'positive' },
    { label: '订单编号/ORD2025102510004061', value: 10460.3, type: 'positive' },
    { label: '订单编号/ORD2025072610000735', value: 9892.71, type: 'positive' },
    { label: '当前值', value: 669197.23, type: 'end' },
  ],
  diff_data: [],
  cross_data: [
    {
      parent_dimension: '取消原因',
      parent_factor: '不想买了',
      best_sub_dimension: '收货城市',
      sub_dimension_gini: 0.5331,
      sub_factors: [
        { factor_value: '上海', contribution_amount: 28858.7, contribution_pct: 14.64, direction: 'positive' },
        { factor_value: '宁波', contribution_amount: 16457.77, contribution_pct: 8.35, direction: 'positive' },
        { factor_value: '南阳', contribution_amount: 16107.14, contribution_pct: 8.17, direction: 'positive' },
      ],
    },
    {
      parent_dimension: '取消原因',
      parent_factor: '其他原因',
      best_sub_dimension: '收货城市',
      sub_dimension_gini: 0.594,
      sub_factors: [
        { factor_value: '上海', contribution_amount: 29120.3, contribution_pct: 21.85, direction: 'positive' },
        { factor_value: '德阳', contribution_amount: 15183.24, contribution_pct: 11.39, direction: 'positive' },
        { factor_value: '北京', contribution_amount: 13419.45, contribution_pct: 10.07, direction: 'positive' },
      ],
    },
    {
      parent_dimension: '收货城市',
      parent_factor: '上海',
      best_sub_dimension: '取消原因',
      sub_dimension_gini: 0.1498,
      sub_factors: [
        { factor_value: '地址信息填错', contribution_amount: 30163.58, contribution_pct: 24.43, direction: 'positive' },
        { factor_value: '其他原因', contribution_amount: 29120.3, contribution_pct: 23.58, direction: 'positive' },
        { factor_value: '不想买了', contribution_amount: 28858.7, contribution_pct: 23.37, direction: 'positive' },
      ],
    },
    {
      parent_dimension: '收货城市',
      parent_factor: '北京',
      best_sub_dimension: '取消原因',
      sub_dimension_gini: 0.1291,
      sub_factors: [
        { factor_value: '其他原因', contribution_amount: 13419.45, contribution_pct: 27.13, direction: 'positive' },
        { factor_value: '找到更便宜的', contribution_amount: 11107.47, contribution_pct: 22.46, direction: 'positive' },
        { factor_value: '地址信息填错', contribution_amount: 9529.71, contribution_pct: 19.27, direction: 'positive' },
      ],
    },
  ],
  anomaly_result: {
    is_anomaly: false,
    anomaly_level: 'normal',
    anomaly_score: 0.6368,
    algorithm: 'zscore',
    detected_value: 67.46,
    expected_value: 1338.39,
    threshold: 3.0,
    message: 'Z-score=0.64, threshold=3.0',
  },
  metric_overview: {
    metric_label: '订单总金额',
    current_value: 669197.23,
    baseline_value: null,
    delta_value: null,
  },
};

/** @deprecated 兼容旧引用名，指向新的样例数据 */
export const ATTRIBUTION_DASHBOARD_SAMPLE = ATTRIBUTION_ANALYSIS_SAMPLE;
