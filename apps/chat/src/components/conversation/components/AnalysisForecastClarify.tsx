import React, { useMemo, useState } from 'react';
import { Button, Modal, DatePicker, Popover } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import SvgIcon from '../../../components/SvgIcon';
import {
  DATE_FORMAT_MAP,
  convertDateToGranularityValue,
  formatTimeRangeValue,
  renderFieldWithTooltip
} from './intentClarifyUtils';

// 启用 ISO 周插件（周一作为一周的开始），与意图澄清的自定义时间保持一致
dayjs.extend(isoWeek);

// 语义字段（后端 query_recommend 接口在 recommend_chat_mode=analysis/forecast 时返回的 SemanticField）
interface SemanticField {
  name: string;
  label?: string;
  table_name?: string;
  [key: string]: any;
}

interface AnalysisForecastClarifyProps {
  mode: 'analysis' | 'forecast'; // analysis=归因分析 forecast=预测分析
  metrics: SemanticField[];
  dimensions: SemanticField[];
  onSend: (question: string) => void; // 拼接完成后发送
  onClose: () => void; // 关闭面板
}

// 时间范围预设（与后端推荐候选的时间句式对齐），自定义时间走意图澄清同款日期弹窗
const TIME_PRESETS = ['最近7天', '最近30天', '最近3个月', '最近半年', '最近1年'];
// 预测分析的预测时长预设（对应后端 FORECAST_TIME_TEMPLATES 句式）
const FORECAST_TIME_PRESETS = ['未来7天', '未来30天', '未来3个月', '未来半年', '未来1年'];

const getFieldLabel = (field: SemanticField | null): string => field?.label || field?.name || '';

/**
 * 归因分析 / 预测分析拼句面板
 * 后端不再返回现成的推荐问题列表，而是返回语义画像（metrics/dimensions/entities），
 * 由前端像「意图澄清」一样拼接一句自然语言问题，用户确认后点击发送。
 */
const AnalysisForecastClarify: React.FC<AnalysisForecastClarifyProps> = ({ mode, metrics, dimensions, onSend, onClose }) => {
  const isAnalysis = mode === 'analysis';

  // 默认选中重要性最高的指标（后端已按 importance 排序），时间/预测时长给默认值保证一键可发送
  const [selectedMetric, setSelectedMetric] = useState<SemanticField | null>(metrics[0] || null);
  const [selectedDimension, setSelectedDimension] = useState<SemanticField | null>(null);
  const [timeText, setTimeText] = useState<string>(TIME_PRESETS[1]);
  const [forecastTime, setForecastTime] = useState<string>(FORECAST_TIME_PRESETS[1]);
  const [popoverState, setPopoverState] = useState<{ [key: string]: boolean }>({});

  // 自定义日期弹窗状态（与 IntentClarifyAnalysisMode 的自定义时间一致）
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [datePickerType, setDatePickerType] = useState<'date' | 'week' | 'month' | 'quarter' | 'year'>('date');
  const [selectedDateRange, setSelectedDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);

  const togglePopover = (key: string, visible: boolean) => {
    setPopoverState(prev => ({ ...prev, [key]: visible }));
  };

  // 打开自定义日期弹窗（先关闭时间 Popover）
  const openDatePicker = () => {
    togglePopover('time', false);
    setSelectedDateRange([null, null]);
    setDatePickerType('date');
    setDatePickerVisible(true);
  };

  // 确认自定义日期：按粒度对齐起止并格式化为自然语言时间段（如 2025年1月至2025年6月）
  const handleDateConfirm = () => {
    if (selectedDateRange[0] && selectedDateRange[1]) {
      let startDate: dayjs.Dayjs = selectedDateRange[0];
      let endDate: dayjs.Dayjs = selectedDateRange[1];

      switch (datePickerType) {
        case 'month':
          startDate = startDate.startOf('month');
          endDate = endDate.endOf('month');
          break;
        case 'quarter': {
          const startQuarterFirstMonth = Math.floor(startDate.month() / 3) * 3;
          const endQuarterLastMonth = Math.floor(endDate.month() / 3) * 3 + 2;
          startDate = startDate.month(startQuarterFirstMonth).startOf('month');
          endDate = endDate.month(endQuarterLastMonth).endOf('month');
          break;
        }
        case 'year':
          startDate = startDate.startOf('year');
          endDate = endDate.endOf('year');
          break;
        case 'week':
          startDate = startDate.startOf('isoWeek');
          endDate = endDate.endOf('isoWeek');
          break;
        case 'date':
        default:
          break;
      }

      const granularityMap: { [key: string]: string } = {
        date: '年月日',
        week: '年周',
        month: '年月',
        quarter: '年季度',
        year: '年'
      };
      const granularity = granularityMap[datePickerType] || '年月日';
      const startValue = convertDateToGranularityValue(startDate.format('YYYY-MM-DD'), granularity);
      const endValue = convertDateToGranularityValue(endDate.format('YYYY-MM-DD'), granularity);
      setTimeText(`${formatTimeRangeValue(startValue, granularity)}至${formatTimeRangeValue(endValue, granularity)}`);
    }
    setDatePickerVisible(false);
  };

  // 拼接自然语言问题（句式与后端推荐候选模板保持一致，保证意图可被正确识别）
  const buildQuery = (): string => {
    const metricLabel = getFieldLabel(selectedMetric);
    const dimensionLabel = getFieldLabel(selectedDimension);
    if (isAnalysis) {
      return dimensionLabel
        ? `分析${timeText}哪些${dimensionLabel}影响${metricLabel}？`
        : `分析${timeText}${metricLabel}变化的原因`;
    }
    return dimensionLabel
      ? `查询${timeText}数据并预测未来哪些${dimensionLabel}${metricLabel}增长最快？`
      : `查询${timeText}数据并预测${forecastTime}${metricLabel}`;
  };

  const canSend = !!selectedMetric && !!timeText;

  const handleSend = () => {
    if (!canSend) return;
    onSend(buildQuery());
  };

  // 通用的单选列表 Popover 内容
  const renderOptionList = (
    options: SemanticField[],
    selected: SemanticField | null,
    onPick: (option: SemanticField | null) => void,
    allowClear: boolean
  ) => (
    <div className="space-y-1 max-h-80 overflow-y-auto w-72">
      {allowClear && (
        <div
          className={`flex items-center p-2 rounded cursor-pointer border transition-colors ${
            !selected ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 hover:bg-gray-50'
          }`}
          onClick={() => onPick(null)}
        >
          <span className="text-sm text-gray-500">不指定维度</span>
        </div>
      )}
      {options.map((option, index) => {
        const isSelected = !!selected && selected.name === option.name && selected.table_name === option.table_name;
        return (
          <div
            key={index}
            className={`flex items-center justify-between p-2 rounded cursor-pointer border transition-colors ${
              isSelected ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
            onClick={() => onPick(option)}
          >
            <span className="text-sm font-medium">{getFieldLabel(option)}</span>
            {renderFieldWithTooltip(option.name)}
          </div>
        );
      })}
    </div>
  );

  // 时间选择 Popover：预设时间 + 意图澄清同款「自定义日期」入口
  const timePopoverContent = (
    <div className="w-72">
      <div className="space-y-1 max-h-80 overflow-y-auto">
        {TIME_PRESETS.map(preset => (
          <div
            key={preset}
            className={`flex items-center p-2 rounded cursor-pointer border transition-colors ${
              timeText === preset ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
            onClick={() => {
              setTimeText(preset);
              togglePopover('time', false);
            }}
          >
            <span className="text-sm font-medium">{preset}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2 mt-3 pt-3 border-t">
        <Button size="small" onClick={() => togglePopover('time', false)}>取消</Button>
        <Button size="small" onClick={openDatePicker}>自定义日期</Button>
      </div>
    </div>
  );

  // 可点击的槽位标签（已选中：灰底实线；未选中：虚线占位）
  const renderSlot = (key: string, text: string, content: React.ReactNode, placeholder?: string) => (
    <Popover
      content={content}
      trigger="click"
      open={popoverState[key]}
      onOpenChange={(visible) => togglePopover(key, visible)}
      placement="top"
      arrow={false}
    >
      {text ? (
        <span className="px-3 py-1 bg-gray-50 text-gray-700 rounded-md border border-gray-300 cursor-pointer hover:bg-gray-100 transition-colors text-base font-medium whitespace-nowrap">
          {text}
        </span>
      ) : (
        <span className="cursor-pointer text-gray-600 hover:text-gray-800 text-sm font-medium px-3 py-2 border border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors whitespace-nowrap">
          {placeholder}
        </span>
      )}
    </Popover>
  );

  const metricSlot = renderSlot(
    'metric',
    getFieldLabel(selectedMetric),
    renderOptionList(metrics, selectedMetric, (option) => {
      if (option) setSelectedMetric(option);
      togglePopover('metric', false);
    }, false),
    '选择指标'
  );

  const dimensionSlot = renderSlot(
    'dimension',
    getFieldLabel(selectedDimension),
    renderOptionList(dimensions, selectedDimension, (option) => {
      setSelectedDimension(option);
      togglePopover('dimension', false);
    }, true),
    '维度(可选)'
  );

  const timeSlot = renderSlot('time', timeText, timePopoverContent, '选择时间');

  const forecastTimeSlot = renderSlot(
    'forecastTime',
    forecastTime,
    <div className="space-y-1 max-h-80 overflow-y-auto w-72">
      {FORECAST_TIME_PRESETS.map(preset => (
        <div
          key={preset}
          className={`flex items-center p-2 rounded cursor-pointer border transition-colors ${
            forecastTime === preset ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 hover:bg-gray-50'
          }`}
          onClick={() => {
            setForecastTime(preset);
            togglePopover('forecastTime', false);
          }}
        >
          <span className="text-sm font-medium">{preset}</span>
        </div>
      ))}
    </div>,
    '预测时长'
  );

  const modeName = isAnalysis ? '归因分析' : '预测分析';
  const hasDimension = !!selectedDimension;
  const textSpan = (text: string) => <span className="text-gray-700 font-medium">{text}</span>;

  const sentence = useMemo(() => {
    if (isAnalysis) {
      // 归因：分析 [时间] （哪些 [维度] 影响）[指标] 变化的原因/？
      return (
        <>
          {textSpan('分析')}
          {timeSlot}
          {hasDimension && textSpan('哪些')}
          {dimensionSlot}
          {hasDimension && textSpan('影响')}
          {metricSlot}
          {textSpan(hasDimension ? '？' : '变化的原因')}
        </>
      );
    }
    // 预测：查询 [时间] 数据并预测 [预测时长|未来哪些 [维度]] [指标]（增长最快？）
    return (
      <>
        {textSpan('查询')}
        {timeSlot}
        {textSpan('数据并预测')}
        {hasDimension ? textSpan('未来哪些') : forecastTimeSlot}
        {dimensionSlot}
        {metricSlot}
        {hasDimension && textSpan('增长最快？')}
      </>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAnalysis, hasDimension, selectedMetric, selectedDimension, timeText, forecastTime, popoverState]);

  return (
    <div className="analysis-forecast-clarify bg-white pt-4 pb-4 relative">
      {/* 关闭按钮 */}
      <Button
        type="text"
        size="small"
        icon={<CloseOutlined />}
        onClick={onClose}
        className="absolute right-0 top-2 text-gray-400 hover:text-gray-600"
      />

      {/* 顶部提示 */}
      <div className="mb-4 pr-8">
        <div className="text-base font-medium text-gray-700 leading-relaxed">
          🎯 已为您生成
          <span className="text-purple-700 font-bold text-lg mx-1">「{modeName}」</span>
          问题模板，请确认下方的时间范围、指标{isAnalysis ? '' : '、预测时长'}（可选维度）后点击发送。
        </div>
      </div>

      {/* 拼句区域 */}
      <div className="flex items-center flex-wrap gap-x-2 gap-y-3 text-base leading-relaxed">
        {sentence}
        {/* 发送按钮 - 与意图澄清一致的圆形提交按钮 */}
        <Button
          icon={<SvgIcon localIcon="refresh" style={{ width: '16px', height: '16px' }} />}
          onClick={handleSend}
          disabled={!canSend}
          className={`ml-2 flex items-center justify-center w-8 h-8 rounded-full transition-all ${canSend ? '' : 'opacity-50 cursor-not-allowed'}`}
          style={{ minWidth: '32px', padding: 0, outline: 'none', boxShadow: 'none' }}
        />
      </div>

      {/* 自定义日期弹窗（复用意图澄清的时间选择交互） */}
      <Modal
        title="选择时间范围"
        open={datePickerVisible}
        onCancel={() => setDatePickerVisible(false)}
        onOk={handleDateConfirm}
        okText="确认"
        cancelText="取消"
        width={600}
      >
        <div className="p-4">
          {/* 时间类型选择 */}
          <div className="mb-4">
            <div className="flex gap-2 flex-wrap">
              {[
                { key: 'date', label: '日期' },
                { key: 'week', label: '周' },
                { key: 'month', label: '月份' },
                { key: 'quarter', label: '季度' },
                { key: 'year', label: '年份' }
              ].map(item => (
                <Button
                  key={item.key}
                  type={datePickerType === item.key ? 'primary' : 'default'}
                  onClick={() => {
                    setDatePickerType(item.key as any);
                    setSelectedDateRange([null, null]);
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>

          {/* 日期选择器 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {datePickerType === 'date' && '请选择开始和结束日期：'}
              {datePickerType === 'week' && '请选择开始和结束周：'}
              {datePickerType === 'month' && '请选择开始和结束月份：'}
              {datePickerType === 'quarter' && '请选择开始和结束季度：'}
              {datePickerType === 'year' && '请选择开始和结束年份：'}
            </label>
            <DatePicker.RangePicker
              value={selectedDateRange}
              onChange={(dates: any) => setSelectedDateRange(dates)}
              picker={datePickerType}
              format={DATE_FORMAT_MAP[datePickerType]}
              className="w-full"
              placeholder={(() => {
                const placeholderMap: { [key: string]: [string, string] } = {
                  date: ['开始日期', '结束日期'],
                  week: ['开始周', '结束周'],
                  month: ['开始月份', '结束月份'],
                  quarter: ['开始季度', '结束季度'],
                  year: ['开始年份', '结束年份']
                };
                return placeholderMap[datePickerType] || ['开始', '结束'];
              })()}
            />
          </div>

          {/* 预览选择结果 */}
          {selectedDateRange[0] && selectedDateRange[1] && (
            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
              已选择：{selectedDateRange[0].format(DATE_FORMAT_MAP[datePickerType])} 至 {selectedDateRange[1].format(DATE_FORMAT_MAP[datePickerType])}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default AnalysisForecastClarify;
