/**
 * 归因分析看板（chat_with_analysis）
 *
 * 依据后端 root_analysis 扁平数据结构，复刻参考报告的四视图布局：
 * - 分析概述：指标概览卡片、核心结论、维度贡献速览
 * - 维度归因：单一维度（贡献排行 + 因子明细）与交叉维度
 * - 指标归因：Top 因子贡献条形图 + 全量因子排行表
 * - 组合归因：贡献瀑布图 + 维度汇总卡片
 *
 * @module AttributionDashboard
 */
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { EChartsOption } from 'echarts';
import { EChart } from '../../../components/react-echarts';
import styles from './AttributionDashboard.module.css';

/**
 * 归因分析（chat_with_analysis）数据类型定义。
 * 结构与后端 root_analysis 返回一致：扁平结构，包含指标概览、
 * 维度归因表、因子明细、瀑布数据、交叉归因、异常检测等字段。
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

interface AttributionDashboardProps {
  /** 归因分析数据 */
  data: AttributionAnalysisData;
}

/** 维度配色板（与参考报告一致） */
const PALETTE = ['#dc4a33', '#1a9e6f', '#4a6ee0', '#c8880a', '#8b5cf6', '#0891b2', '#db2777', '#65a30d'];

type TabKey = 'overview' | 'dimension' | 'metric' | 'combo';

/** 千分位格式化 */
const fmt = (n: number | null | undefined, d = 2): string =>
  n == null ? '—' : Number(n).toLocaleString('zh-CN', { minimumFractionDigits: d, maximumFractionDigits: d });

/** 大数值缩写为 K */
const fmtK = (n: number | null | undefined): string => {
  if (n == null) return '—';
  if (Math.abs(n) >= 10000) return `${(n / 1000).toFixed(2)}K`;
  return fmt(n);
};

/** 百分比格式化 */
const fmtPct = (n: number | null | undefined): string => (n == null ? '—' : `${Number(n).toFixed(2)}%`);

/** 截断长文本 */
const truncate = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

const AttributionDashboard: React.FC<AttributionDashboardProps> = ({ data }) => {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [dimSubTab, setDimSubTab] = useState<'single' | 'cross'>('single');
  const [factorTab, setFactorTab] = useState<string>(data?.factor_table?.[0]?.dimension || '');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 全屏模式：ESC 退出并锁定页面滚动
  useEffect(() => {
    if (!isFullscreen) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isFullscreen]);

  // 切换全屏后触发一次 resize，让 ECharts 图表自适应新容器尺寸
  useEffect(() => {
    const timer = setTimeout(() => window.dispatchEvent(new Event('resize')), 320);
    return () => clearTimeout(timer);
  }, [isFullscreen]);

  // 维度 -> 颜色 映射
  const dimColor = useMemo(() => {
    const map: Record<string, string> = {};
    const names: string[] = [];
    const push = (name?: string) => {
      if (name && !names.includes(name)) names.push(name);
    };
    (data?.dimension_table || []).forEach((d) => push(d.dimension));
    (data?.factor_table || []).forEach((g) => push(g.dimension));
    (data?.cross_data || []).forEach((c) => {
      push(c.parent_dimension);
      push(c.best_sub_dimension);
    });
    names.forEach((name, i) => {
      map[name] = PALETTE[i % PALETTE.length];
    });
    return map;
  }, [data]);

  const colorOf = (dim: string): string => dimColor[dim] || PALETTE[0];

  // 扁平化全部因子
  const allFactors = useMemo(() => {
    const arr: (FactorItem & { dimension: string })[] = [];
    (data?.factor_table || []).forEach((g) => {
      g.factors.forEach((f) => arr.push({ ...f, dimension: g.dimension }));
    });
    return arr;
  }, [data]);

  const overview = data?.metric_overview;
  const anomaly = data?.anomaly_result;

  // 较基准变化
  const deltaValue = useMemo(() => {
    if (overview?.delta_value != null) return overview.delta_value;
    if (overview?.baseline_value != null) return overview.current_value - overview.baseline_value;
    return overview?.current_value ?? null;
  }, [overview]);

  // 正向贡献占比
  const positiveShare = useMemo(() => {
    const list = data?.dimension_table || [];
    if (!list.length) return 0;
    const pos = list.filter((d) => d.direction === 'positive').length;
    return Math.round((pos / list.length) * 100);
  }, [data]);

  /* ============ 图表配置 ============ */
  const factorBarOption = useMemo<EChartsOption>(() => {
    const all = [...allFactors].sort((a, b) => a.contribution_amount - b.contribution_amount);
    return {
      grid: { left: 10, right: 80, top: 10, bottom: 10, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(255,255,255,0.97)',
        borderColor: 'rgba(0,0,0,0.08)',
        textStyle: { color: '#1a1d23' },
        formatter: (p: any) => {
          const item = Array.isArray(p) ? p[0] : p;
          const f = all[item.dataIndex];
          if (!f) return '';
          return `<div style="font-weight:700;margin-bottom:4px">${f.factor_value}</div>
            <div style="font-size:11px;color:#6b7280;margin-bottom:6px">${f.dimension}</div>
            <div style="font-size:12px">贡献量: <span style="color:${colorOf(f.dimension)};font-weight:600">¥${fmt(f.contribution_amount)}</span></div>
            <div style="font-size:12px">贡献率: ${fmtPct(f.contribution_pct)}</div>`;
        },
      },
      xAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: 'rgba(0,0,0,0.04)' } },
        axisLabel: { color: '#9ca3af', fontSize: 11, formatter: (v: number) => fmtK(v) },
      },
      yAxis: {
        type: 'category',
        data: all.map((f) => truncate(f.factor_value, 16)),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#4b5563', fontSize: 12 },
      },
      series: [
        {
          type: 'bar',
          barWidth: 14,
          data: all.map((f) => {
            const c = colorOf(f.dimension);
            return {
              value: f.contribution_amount,
              itemStyle: {
                borderRadius: [0, 4, 4, 0],
                color: {
                  type: 'linear',
                  x: 0,
                  y: 0,
                  x2: 1,
                  y2: 0,
                  colorStops: [
                    { offset: 0, color: `${c}66` },
                    { offset: 1, color: c },
                  ],
                },
              },
            };
          }),
          label: {
            show: true,
            position: 'right',
            color: '#6b7280',
            fontSize: 11,
            formatter: (p: any) => fmtK(p.value),
          },
        },
      ],
    } as EChartsOption;
  }, [allFactors, dimColor]);

  const waterfallOption = useMemo<EChartsOption>(() => {
    const wf = data?.waterfall_data || [];
    let cumulative = 0;
    const dataWithBase = wf.map((item) => {
      if (item.type === 'start') {
        cumulative = 0;
        return { label: item.label, base: 0, value: 0, type: item.type };
      }
      if (item.type === 'end') {
        return { label: item.label, base: 0, value: item.value, type: item.type };
      }
      const base = cumulative;
      cumulative += item.value;
      return { label: item.label, base, value: item.value, type: item.type };
    });
    const labels = dataWithBase.map((d) => {
      if (d.type === 'start') return '基准值';
      if (d.type === 'end') return '当前值';
      const parts = d.label.split('/');
      return truncate(parts[1] || d.label, 10);
    });

    return {
      grid: { left: 10, right: 20, top: 30, bottom: 80, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(255,255,255,0.97)',
        borderColor: 'rgba(0,0,0,0.08)',
        textStyle: { color: '#1a1d23' },
        formatter: (params: any) => {
          const d = dataWithBase[params[0].dataIndex];
          if (!d) return '';
          if (d.type === 'start') return `<div style="font-weight:600">基准值</div><div style="font-size:12px;color:#6b7280;margin-top:4px">¥0.00</div>`;
          if (d.type === 'end') return `<div style="font-weight:600">当前值</div><div style="font-size:12px;color:#c8880a;margin-top:4px">¥${fmt(d.value)}</div>`;
          const dim = d.label.split('/')[0];
          const factor = d.label.split('/')[1];
          return `<div style="font-weight:700;margin-bottom:4px;color:${colorOf(dim)}">${factor}</div>
            <div style="font-size:11px;color:#6b7280;margin-bottom:6px">维度: ${dim}</div>
            <div style="font-size:12px">贡献量: <span style="color:${colorOf(dim)};font-weight:600">+¥${fmt(d.value)}</span></div>
            <div style="font-size:12px;color:#6b7280">累计: ¥${fmt(d.base + d.value)}</div>`;
        },
      },
      xAxis: {
        type: 'category',
        data: labels,
        axisLine: { lineStyle: { color: 'rgba(0,0,0,0.08)' } },
        axisTick: { show: false },
        axisLabel: { color: '#6b7280', fontSize: 10, rotate: 38, interval: 0 },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: 'rgba(0,0,0,0.04)' } },
        axisLabel: { color: '#9ca3af', fontSize: 10, formatter: (v: number) => fmtK(v) },
      },
      series: [
        {
          type: 'custom',
          renderItem: (_params: any, api: any) => {
            const idx = api.value(0);
            const d = dataWithBase[idx];
            const start = api.coord([idx, d.base]);
            const end = api.coord([idx, d.base + d.value]);
            const width = api.size([1, 0])[0] * 0.55;
            if (d.type === 'start') {
              return {
                type: 'group',
                children: [
                  { type: 'circle', shape: { cx: start[0], cy: start[1], r: 5 }, style: { fill: '#9ca3af' } },
                  { type: 'text', style: { text: '0', x: start[0] + 10, y: start[1] - 2, fill: '#9ca3af', font: '600 11px sans-serif' } },
                ],
              };
            }
            if (d.type === 'end') {
              return {
                type: 'group',
                children: [
                  { type: 'rect', shape: { x: start[0] - width / 2, y: start[1] - 14, width, height: 14 }, style: { fill: 'rgba(200,136,10,0.1)' } },
                  { type: 'text', style: { text: `¥${fmtK(d.value)}`, x: start[0], y: start[1] - 4, fill: '#c8880a', font: '700 11px sans-serif', textAlign: 'center' } },
                ],
              };
            }
            const dim = d.label.split('/')[0];
            const color = colorOf(dim);
            const height = start[1] - end[1];
            return {
              type: 'group',
              children: [
                { type: 'rect', shape: { x: start[0] - width / 2, y: end[1], width, height: Math.max(2, height) }, style: { fill: color, fillOpacity: 0.85 } },
                { type: 'line', shape: { x1: start[0] - width / 2, y1: end[1], x2: start[0] + width / 2, y2: end[1] }, style: { stroke: color, lineWidth: 1 } },
                { type: 'text', style: { text: `+${fmtK(d.value)}`, x: start[0], y: end[1] - 5, fill: color, font: '600 10px sans-serif', textAlign: 'center' } },
              ],
            };
          },
          encode: { x: 0, y: [1, 2] },
          data: dataWithBase.map((d, i) => ({ value: [i, d.base, d.base + d.value] })),
        },
      ],
    } as EChartsOption;
  }, [data, dimColor]);

  if (!data) return null;

  /* ============ 分块渲染 ============ */
  const renderDimRank = (dims: DimensionRow[]) => {
    const max = Math.max(...dims.map((d) => d.contribution_pct), 1);
    return (
      <div className={styles.dimRankList}>
        {dims.map((d) => {
          const color = colorOf(d.dimension);
          const width = ((d.contribution_pct / max) * 100).toFixed(1);
          return (
            <div key={d.dimension} className={styles.dimRankRow}>
              <div className={styles.dimStrip} style={{ background: color }} />
              <div className={styles.dimRankBody}>
                <div className={styles.dimRankTop}>
                  <div className={styles.dimRankMeta}>
                    <span className={styles.mono}>#{d.rank}</span>
                    <span className={styles.dimRankName}>{d.dimension}</span>
                    <span className={styles.badgeMuted}>Gini {d.gini_score.toFixed(4)}</span>
                  </div>
                  <div className={styles.dimRankPct} style={{ color }}>{fmtPct(d.contribution_pct)}</div>
                </div>
                <div className={styles.barTrack}>
                  <div className={styles.barFill} style={{ width: `${width}%`, background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderFactorTable = (group?: FactorGroup) => {
    if (!group) return null;
    const color = colorOf(group.dimension);
    const max = Math.max(...group.factors.map((f) => f.contribution_pct), 1);
    return (
      <table className={styles.dt}>
        <thead>
          <tr>
            <th style={{ width: 60 }}>排名</th>
            <th>因子</th>
            <th className={styles.tr}>贡献量</th>
            <th className={styles.tr}>贡献率</th>
            <th style={{ width: '30%' }}>贡献占比</th>
            <th className={styles.tc}>方向</th>
          </tr>
        </thead>
        <tbody>
          {group.factors.map((f) => (
            <tr key={f.factor_value}>
              <td><span className={styles.monoMuted}>#{f.rank}</span></td>
              <td>
                <div className={styles.factorName}>
                  <span className={styles.dot} style={{ background: color }} />
                  <span className={styles.medium}>{f.factor_value}</span>
                </div>
              </td>
              <td className={styles.tr} style={{ color }}><span className={styles.mono}>¥{fmt(f.contribution_amount)}</span></td>
              <td className={`${styles.tr} ${styles.semibold}`}><span className={styles.mono}>{fmtPct(f.contribution_pct)}</span></td>
              <td>
                <div className={styles.barTrack} style={{ height: 5 }}>
                  <div className={styles.barFill} style={{ width: `${((f.contribution_pct / max) * 100).toFixed(1)}%`, background: color }} />
                </div>
              </td>
              <td className={styles.tc}>
                <span className={f.direction === 'positive' ? styles.badgeGreen : styles.badgeCoral}>
                  {f.direction === 'positive' ? '↑ 正向' : '↓ 负向'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderAllFactorTable = () => {
    const all = [...allFactors].sort((a, b) => b.contribution_amount - a.contribution_amount);
    const maxPct = Math.max(...all.map((f) => f.contribution_pct), 1);
    return (
      <table className={styles.dt}>
        <thead>
          <tr>
            <th style={{ width: 50 }}>#</th>
            <th>因子</th>
            <th>所属维度</th>
            <th className={styles.tr}>贡献量</th>
            <th className={styles.tr}>贡献率</th>
            <th style={{ width: '22%' }}>贡献占比</th>
          </tr>
        </thead>
        <tbody>
          {all.map((f, i) => {
            const color = colorOf(f.dimension);
            return (
              <tr key={`${f.dimension}-${f.factor_value}`}>
                <td><span className={styles.monoMuted}>#{i + 1}</span></td>
                <td>
                  <div className={styles.factorName}>
                    <span className={styles.dot} style={{ background: color }} />
                    <span className={styles.medium}>{f.factor_value}</span>
                  </div>
                </td>
                <td>
                  <span className={styles.dimBadge} style={{ background: `${color}1a`, color, borderColor: `${color}40` }}>{f.dimension}</span>
                </td>
                <td className={styles.tr} style={{ color }}><span className={styles.mono}>¥{fmt(f.contribution_amount)}</span></td>
                <td className={`${styles.tr} ${styles.semibold}`}><span className={styles.mono}>{fmtPct(f.contribution_pct)}</span></td>
                <td>
                  <div className={styles.barTrack} style={{ height: 5 }}>
                    <div className={styles.barFill} style={{ width: `${((f.contribution_pct / maxPct) * 100).toFixed(1)}%`, background: color }} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  const renderCross = (list: CrossItem[]) => (
    <div className={styles.crossGrid}>
      {list.map((c, i) => {
        const pColor = colorOf(c.parent_dimension);
        const sColor = colorOf(c.best_sub_dimension);
        const maxSub = Math.max(...c.sub_factors.map((s) => s.contribution_pct), 1);
        return (
          <div key={`${c.parent_factor}-${i}`} className={`${styles.card} ${styles.cardPad}`}>
            <div className={styles.crossHead}>
              <span className={styles.dimBadge} style={{ background: `${pColor}1a`, color: pColor, borderColor: `${pColor}40` }}>{c.parent_dimension}</span>
              <span className={styles.crossArrow}>→</span>
              <span className={styles.dimBadge} style={{ background: `${sColor}1a`, color: sColor, borderColor: `${sColor}40` }}>{c.best_sub_dimension}</span>
            </div>
            <div className={styles.crossFactor} style={{ color: pColor }}>{c.parent_factor}</div>
            <div className={styles.crossGini}>子维度 Gini: <span className={styles.mono}>{c.sub_dimension_gini.toFixed(4)}</span></div>
            <div className={styles.crossSubList}>
              {c.sub_factors.map((s) => (
                <div key={s.factor_value} className={styles.crossSubItem}>
                  <div className={styles.crossSubTop}>
                    <span className={styles.medium}>{s.factor_value}</span>
                    <div className={styles.crossSubVals}>
                      <span className={styles.crossSubAmount}>¥{fmtK(s.contribution_amount)}</span>
                      <span className={styles.crossSubPct} style={{ color: sColor }}>{fmtPct(s.contribution_pct)}</span>
                    </div>
                  </div>
                  <div className={styles.barTrack} style={{ height: 4 }}>
                    <div className={styles.barFill} style={{ width: `${((s.contribution_pct / maxSub) * 100).toFixed(1)}%`, background: `linear-gradient(90deg, ${sColor}66, ${sColor})` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderComboCards = () => (
    <div className={styles.comboGrid}>
      {(data.dimension_table || []).map((d) => {
        const color = colorOf(d.dimension);
        const group = data.factor_table.find((g) => g.dimension === d.dimension);
        const total = group ? group.factors.reduce((s, f) => s + f.contribution_amount, 0) : 0;
        const top = group ? group.factors[0] : null;
        return (
          <div key={d.dimension} className={`${styles.card} ${styles.cardPad}`}>
            <div className={styles.comboTop}>
              <div className={styles.comboRank} style={{ background: `${color}18`, color }}>#{d.rank}</div>
              <span className={styles.badgeMuted}>Gini {d.gini_score.toFixed(4)}</span>
            </div>
            <div className={styles.comboName}>{d.dimension}</div>
            <div className={styles.comboValue} style={{ color }}>¥{fmtK(total)}</div>
            <div className={styles.comboSub}>贡献率 {fmtPct(d.contribution_pct)} · {group ? group.factors.length : 0} 个因子</div>
            {top && (
              <div className={styles.comboTopFactor}>
                <div className={styles.comboTopLabel}>TOP 因子</div>
                <div className={styles.comboTopRow}>
                  <span className={styles.medium}>{top.factor_value}</span>
                  <span className={styles.mono} style={{ color }}>¥{fmtK(top.contribution_amount)}</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const tabs: { key: TabKey; title: string; desc: string }[] = [
    { key: 'overview', title: '分析概述', desc: '指标概览与核心结论' },
    { key: 'dimension', title: '维度归因', desc: '单一维度与交叉维度' },
    { key: 'metric', title: '指标归因', desc: '因子贡献分布与排行' },
    { key: 'combo', title: '组合归因', desc: '瀑布图与累积贡献' },
  ];

  const curIntDec = fmt(overview?.current_value).split('.');

  const dashboard = (
    <div className={styles.root}>
      {/* 顶部导航 */}
      <header className={styles.header}>
        <div className={styles.headerBrand}>
          <div className={styles.headerLogo}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" /><path d="M7 14l4-4 4 4 5-5" />
            </svg>
          </div>
          <div>
            <div className={styles.headerTitle}>归因分析报告</div>
            <div className={styles.headerSub}>ATTRIBUTION · ANALYSIS</div>
          </div>
        </div>
        <div className={styles.headerBadges}>
          <span className={styles.badgeAmber}>目标指标 · {data.target_metric}</span>
          {data.semantic_id != null && <span className={styles.badgeMuted}>语义模型 #{data.semantic_id}</span>}
          <span className={styles.badgeGreen}><span className={styles.pulseDot} />运行完成</span>
          <button
            type="button"
            className={styles.fsBtn}
            onClick={() => setIsFullscreen((v) => !v)}
            title={isFullscreen ? '退出全屏' : '全屏展示'}
            aria-label={isFullscreen ? '退出全屏' : '全屏展示'}
          >
            {isFullscreen ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
              </svg>
            )}
          </button>
        </div>
      </header>

      <div className={styles.layout}>
        {/* 左侧垂直 Tab */}
        <nav className={styles.sidebar}>
          <div className={styles.sidebarLabel}>分析维度</div>
          {tabs.map((t, ti) => (
            <button
              key={t.key}
              className={`${styles.vtab} ${activeTab === t.key ? styles.vtabActive : ''}`}
              onClick={() => setActiveTab(t.key)}
              type="button"
            >
              <span className={styles.vtabDotWrap}>
                <span className={styles.vtabDot} style={{ background: PALETTE[ti % PALETTE.length] }} />
              </span>
              <span className={styles.vtabText}>
                <span className={styles.vtabTitle}>{t.title}</span>
                <span className={styles.vtabDesc}>{t.desc}</span>
              </span>
            </button>
          ))}
        </nav>

        {/* 主内容区 */}
        <div className={styles.main}>
          {/* ==== 分析概述 ==== */}
          {activeTab === 'overview' && (
            <div>
              <section className={styles.titleSection}>
                <div className={styles.strategyLabel}>分析策略 / {data.strategy_name}</div>
                <h1 className={styles.h1}>{data.target_metric} <span className={styles.accent}>归因拆解</span></h1>
                <p className={styles.desc}>对当前分析周期内的指标变化进行多维度归因，识别主要影响维度与关键驱动因子，并通过交叉归因揭示维度间的联动效应。</p>
                <div className={styles.modeList}>{(data.analysis_modes || []).join(' · ')}</div>
              </section>

              <section className={styles.metricStrip}>
                <div className={`${styles.card} ${styles.metricCard}`}>
                  <div className={styles.metricLabel}>当前值</div>
                  <div className={styles.metricValue} style={{ color: 'var(--attr-accent)' }}>
                    ¥{curIntDec[0]}<span className={styles.metricDec}>.{curIntDec[1] || '00'}</span>
                  </div>
                  <div className={styles.metricSub}>{overview?.metric_label} · 当前周期</div>
                </div>
                <div className={`${styles.card} ${styles.metricCard}`}>
                  <div className={styles.metricLabel}>对比基准</div>
                  {overview?.baseline_value != null ? (
                    <div className={styles.metricValue}>¥{fmt(overview.baseline_value)}</div>
                  ) : (
                    <div className={`${styles.metricValue} ${styles.metricMuted}`}>— <span className={styles.metricDec}>无基准</span></div>
                  )}
                  <div className={styles.metricSub}>{overview?.baseline_value != null ? '对比周期基准' : '首次分析 / 基准缺失'}</div>
                </div>
                <div className={`${styles.card} ${styles.metricCard}`}>
                  <div className={styles.metricLabel}>较基准变化</div>
                  <div className={styles.metricValue} style={{ color: (deltaValue ?? 0) >= 0 ? 'var(--attr-success)' : 'var(--attr-danger)' }}>
                    {(deltaValue ?? 0) >= 0 ? '+' : '-'}{fmtK(Math.abs(deltaValue ?? 0))}
                  </div>
                  <div className={styles.metricSub}>{positiveShare === 100 ? '全部为正向贡献 · 100%' : `正向贡献 · ${positiveShare}%`}</div>
                </div>
                <div className={`${styles.card} ${styles.metricCard}`}>
                  <div className={styles.metricLabel}>异常检测</div>
                  <div className={styles.metricAnomaly}>
                    <span className={styles.metricValue} style={{ color: anomaly?.is_anomaly ? 'var(--attr-danger)' : 'var(--attr-success)' }}>
                      {anomaly?.is_anomaly ? '异常' : '正常'}
                    </span>
                    {anomaly && <span className={styles.badgeGreen}>Z-Score {anomaly.anomaly_score.toFixed(2)}</span>}
                  </div>
                  <div className={styles.metricSub}>阈值 {anomaly?.threshold} · 算法 {anomaly?.algorithm}</div>
                </div>
              </section>

              <section className={`${styles.card} ${styles.conclusionCard}`}>
                <div className={styles.conclusionIcon}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--attr-accent)" strokeWidth="2"><path d="M12 2a7 7 0 017 7c0 3-2 5-3 6s-1 2-1 3H9c0-1 0-2-1-3s-3-3-3-6a7 7 0 017-7z" /><path d="M9 18h6M10 22h4" /></svg>
                </div>
                <div className={styles.conclusionBody}>
                  <div className={styles.conclusionHead}>
                    <h3 className={styles.blockTitle}>分析结论</h3>
                    <span className={styles.badgeAmber}>关键洞察</span>
                  </div>
                  <p className={styles.conclusionText}>{data.result_explain}</p>
                </div>
              </section>
            </div>
          )}

          {/* ==== 维度归因 ==== */}
          {activeTab === 'dimension' && (
            <div>
              <section className={styles.panelHead}>
                <h2 className={styles.h2}>维度归因</h2>
                <p className={styles.panelDesc}>从单一维度和交叉维度两个视角，拆解指标变化的驱动因素</p>
              </section>

              <div className={styles.subTabBar}>
                <button type="button" className={`${styles.subTab} ${dimSubTab === 'single' ? styles.subTabActive : ''}`} onClick={() => setDimSubTab('single')}>单一维度</button>
                <button type="button" className={`${styles.subTab} ${dimSubTab === 'cross' ? styles.subTabActive : ''}`} onClick={() => setDimSubTab('cross')}>交叉维度</button>
              </div>

              {dimSubTab === 'single' ? (
                <div className={styles.singleGrid}>
                  <div className={`${styles.card} ${styles.cardPad}`}>
                    <div className={styles.blockHead}>
                      <h3 className={styles.blockTitle}>维度贡献排行</h3>
                      <span className={styles.monoMuted}>{data.dimension_table.length} DIMENSIONS</span>
                    </div>
                    {renderDimRank(data.dimension_table)}
                  </div>
                  <div className={styles.card}>
                    <div className={styles.factorTabBar}>
                      {data.factor_table.map((g) => (
                        <button
                          key={g.dimension}
                          type="button"
                          className={`${styles.factorTabBtn} ${factorTab === g.dimension ? styles.factorTabActive : ''}`}
                          onClick={() => setFactorTab(g.dimension)}
                        >
                          <span className={styles.dot} style={{ background: colorOf(g.dimension) }} />{g.dimension}
                        </button>
                      ))}
                    </div>
                    <div className={styles.tablePad}>
                      {renderFactorTable(data.factor_table.find((g) => g.dimension === factorTab) || data.factor_table[0])}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className={styles.crossIntro}>
                    <div>
                      <h3 className={styles.blockTitle}>交叉归因分析</h3>
                      <p className={styles.panelDesc}>挖掘主要因子在其他维度上的分布特征，定位问题根因</p>
                    </div>
                    <span className={styles.badgeMuted}>{data.cross_data.length} 组交叉关系</span>
                  </div>
                  {renderCross(data.cross_data)}
                </div>
              )}
            </div>
          )}

          {/* ==== 指标归因 ==== */}
          {activeTab === 'metric' && (
            <div>
              <section className={styles.panelHead}>
                <h2 className={styles.h2}>指标归因</h2>
                <p className={styles.panelDesc}>跨维度汇总所有因子的贡献分布，识别关键驱动因子</p>
              </section>

              <div className={`${styles.card} ${styles.cardPad}`}>
                <div className={styles.blockHead}>
                  <div>
                    <h3 className={styles.blockTitle}>Top 因子贡献分布</h3>
                    <p className={styles.blockSub}>按贡献量排序 · 颜色区分所属维度</p>
                  </div>
                  <div className={styles.legend}>
                    {data.factor_table.map((g) => (
                      <span key={g.dimension} className={styles.legendItem}>
                        <span className={styles.legendDot} style={{ background: colorOf(g.dimension) }} />{g.dimension}
                      </span>
                    ))}
                  </div>
                </div>
                <EChart option={factorBarOption} style={{ height: '420px', width: '100%' }} handleClick={() => {}} />
              </div>

              <div className={styles.card} style={{ marginTop: 16 }}>
                <div className={styles.tableHead}>
                  <h3 className={styles.blockTitle}>全量因子排行</h3>
                  <span className={styles.badgeMuted}>{allFactors.length} 个因子</span>
                </div>
                <div className={styles.tablePad}>{renderAllFactorTable()}</div>
              </div>
            </div>
          )}

          {/* ==== 组合归因 ==== */}
          {activeTab === 'combo' && (
            <div>
              <section className={styles.panelHead}>
                <h2 className={styles.h2}>组合归因</h2>
                <p className={styles.panelDesc}>多维度因子的累积贡献路径，展示从基准值到当前值的完整变化过程</p>
              </section>

              <div className={`${styles.card} ${styles.cardPad}`}>
                <div className={styles.blockHead}>
                  <div>
                    <h3 className={styles.blockTitle}>贡献瀑布图</h3>
                    <p className={styles.blockSub}>展示各 Top 因子对总金额的累积贡献（按维度分组）</p>
                  </div>
                  <span className={styles.badgeAmber}>最终值 ¥{fmt(overview?.current_value)}</span>
                </div>
                <EChart option={waterfallOption} style={{ height: '420px', width: '100%' }} handleClick={() => {}} />
              </div>

              <div style={{ marginTop: 16 }}>{renderComboCards()}</div>
            </div>
          )}

          <footer className={styles.footer}>
            <div className={styles.footerMono}>
              分析模式: {(data.analysis_modes || []).join(' · ')} ｜ 异常算法: {anomaly?.algorithm} ｜ 模型 ID: {data.semantic_id}
            </div>
            <div className={styles.footerNote}>归因分析报告 · 自动生成</div>
          </footer>
        </div>
      </div>
    </div>
  );

  if (isFullscreen) {
    return createPortal(
      <div
        className={styles.fsOverlay}
        onClick={(e) => {
          if (e.target === e.currentTarget) setIsFullscreen(false);
        }}
      >
        <div className={styles.fsModal}>{dashboard}</div>
      </div>,
      document.body,
    );
  }

  return dashboard;
};

export default AttributionDashboard;
