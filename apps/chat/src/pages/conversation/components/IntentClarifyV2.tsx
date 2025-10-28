import React, { useState, useEffect } from 'react';
import { Button, Modal, DatePicker, Popover, Input } from 'antd';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import SvgIcon from '../../../components/SvgIcon';

// 启用 ISO 周插件（周一作为一周的开始）
dayjs.extend(isoWeek);

// 聚合函数翻译映射
const FUNCTION_MAP: { [key: string]: string } = {
  "MAX": "最大值",
  "max": "最大值",
  "MIN": "最小值",
  "min": "最小值",
  "AVG": "平均值",
  "avg": "平均值",
  "SUM": "总计",
  "sum": "总计",
  "COUNT": "计数",
  "count": "计数",
  "COUNT_DISTINCT": "去重计数",
  "count_distinct": "去重计数",
  "YoY": "年同比",
  "yoy": "年同比",
  "MoM": "月环比",
  "mom": "月环比",
  "QoQ": "季环比",
  "qoq": "季环比"
};

// 操作符映射
const OPERATOR_MAP: {[key: string]: string} = {
  "like":'是',
  "not like":'不是',
  'in': '包括',
  'not in': '不包括',
  '>': '大于',
  '<': '小于',
  '>=': '大于等于',
  '<=': '小于等于',
  '=': '等于',
  '!=': '不等于',
  'range': '介于',
  'not range': '不介于',
  'null': '为空',
  'not null': '不为空'
};

// 日期格式映射
const DATE_FORMAT_MAP: { [key: string]: string } = {
  date: 'YYYY-MM-DD',
  week: 'YYYY-wo',
  month: 'YYYY-MM',
  quarter: 'YYYY-[Q]Q',
  year: 'YYYY'
};

// 格式化带操作符和值的项（用于qualifier和filters）
const formatItemWithOperator = (item: any, valueSeparator: string = '、'): string => {
  if (typeof item === 'string') return item;
  if (!item.text && !item.operator) return '';
  
  const operatorText = OPERATOR_MAP[item.operator] || item.operator;
  const valueText = item.value ? item.value.toString().replace(/,/g, valueSeparator) : '';
  const text = item.text || '';
  return `${text}${operatorText}${valueText}`;
};

// 格式化显示文本
const formatDisplayText = (item: any, fieldType: string, chatMode?: string): string => {
  if (typeof item === 'string') return item;
  
  const isIndicatorField = fieldType === 'target_indicators' || fieldType === 'base_indicators';
  
  // filters和qualifier字段特殊处理
  if ((fieldType === 'filters' || fieldType === 'qualifier') && item.operator && item.value !== undefined) {
    return formatItemWithOperator(item, fieldType === 'filters' ? '到' : '、');
  }
  
  // 指标字段添加聚合函数前缀
  if (isIndicatorField && item.function) {
    const functionPrefix = FUNCTION_MAP[item.function] || item.function;
    let displayText = `${item.text || ''}${functionPrefix}`;
    
    // 如果指标有qualifier，将qualifier信息添加到显示文本前面
    if (item.qualifier && Array.isArray(item.qualifier) && item.qualifier.length > 0) {
      const qualifierTexts = item.qualifier.map((q: any) => {
        // 使用 formatItemWithOperator 来格式化 qualifier，显示 text+operator+value
        return formatItemWithOperator(q, '、');
      }).filter(Boolean);
      
      if (qualifierTexts.length > 0) {
        displayText = `${qualifierTexts.join('、')}的${displayText}`;
      }
    }
    
    // 如果指标有group_filters（分组过滤），将group_filters信息添加到显示文本后面
    // 仅在问数场景且为target_indicators时处理
    if (chatMode === 'chat_with_db_execute' &&  fieldType === 'target_indicators' &&  item.group_filters &&  Array.isArray(item.group_filters) &&  item.group_filters.length > 0) {
      const groupFilterTexts = item.group_filters.map((gf: any, index: number) => {
        if (gf.operator && gf.value !== undefined) {
          const operatorText = OPERATOR_MAP[gf.operator] || gf.operator;
          // 第一个对象包含指标名称，后续对象只包含"且"和操作符+值
          if (index === 0) {
            return `${item.text}${operatorText}${gf.value}`;
          } else {
            return `且${operatorText}${gf.value}`;
          }
        }
        return '';
      }).filter(Boolean);
      
      if (groupFilterTexts.length > 0) {
        displayText = `${displayText}，${groupFilterTexts.join('')}`;
      }
    }
    
    return displayText;
  }
  
  return item.text || JSON.stringify(item);
};

// 组件属性类型定义
interface IntentClarifyV2Props {
  questionData: any; // 意图澄清数据
  onComplete: (ICparameter: any) => void; // 完成回调
}

// 选择弹框内容组件
const SelectionContent: React.FC<{
  options: any[];
  selectedValues: any[];
  tempSelected: any[];
  onToggle: (option: any, isCandidate?: boolean) => void;
}> = ({ options, tempSelected, onToggle }) => {
  return (
    <div className="space-y-1 max-h-80 overflow-y-auto w-80">
        {options.map((option, index) => {
          // 如果有候选字段，展开显示
          if (option.candidate && option.candidate.length > 0) {
            return (
              <div key={index} className="border rounded-lg p-2 bg-gray-50">
                <div className="text-sm font-medium mb-1">{option.text}</div>
                <div className="space-y-1">
                  {option.candidate.map((candidate: any, cIndex: number) => {
                    const isSelected = tempSelected.some(item => 
                      item.text === candidate.text && 
                      (!item.field || !candidate.field || item.field === candidate.field) &&
                      (!item.value || !candidate.value || item.value === candidate.value)
                    );
                    return (
                      <div
                        key={cIndex}
                        className={`
                          flex items-center justify-between p-2 rounded cursor-pointer border transition-colors
                          ${isSelected 
                            ? 'bg-green-50 border-green-200' 
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                          }
                        `}
                        onClick={() => onToggle(candidate, true)}
                      >
                        <div className="flex items-center space-x-2">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            isSelected ? 'bg-green-500 border-green-500' : 'border-gray-300'
                          }`}>
                            {isSelected && <span className="text-white text-xs">M</span>}
                          </div>
                          <span className="text-sm">{candidate.text}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {candidate.function && (
                            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded font-medium border border-blue-200">
                              {FUNCTION_MAP[candidate.function] || candidate.function}
                            </span>
                          )}
                          {candidate.field && (
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              {candidate.field}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          } else {
            // 直接选项
            const isSelected = tempSelected.some(item => 
              item.text === option.text && 
              (!item.field || !option.field || item.field === option.field) &&
              (!item.value || !option.value || item.value === option.value)
            );
            return (
              <div
                key={index}
                className={`
                  flex items-center justify-between p-2 rounded cursor-pointer border transition-colors
                  ${isSelected 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                  }
                `}
                onClick={() => onToggle(option)}
              >
                <div className="flex items-center space-x-2">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    isSelected ? 'bg-green-500 border-green-500' : 'border-gray-300'
                  }`}>
                    {isSelected && <span className="text-white text-xs">M</span>}
                  </div>
                  <span className="text-sm font-medium">{option.text}</span>
                </div>
                <div className="flex items-center gap-2">
                  {option.function && (
                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded font-medium border border-blue-200">
                      {FUNCTION_MAP[option.function] || option.function}
                    </span>
                  )}
                  {option.field && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {option.field}
                    </span>
                  )}
                </div>
              </div>
            );
          }
        })}
      </div>
  );
};

// 主组件
const IntentClarifyV2: React.FC<IntentClarifyV2Props> = ({ questionData, onComplete }) => {
  const [formData, setFormData] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);
  const [popoverState, setPopoverState] = useState<{[key: string]: boolean}>({});
  const [tempSelections, setTempSelections] = useState<{[key: string]: any[]}>({});
  const [tempIndicatorStatus, setTempIndicatorStatus] = useState<string>('');
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [datePickerType, setDatePickerType] = useState<'date' | 'week' | 'month' | 'quarter' | 'year'>('date');
  const [selectedDateRange, setSelectedDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);
  const [recommendSelected, setRecommendSelected] = useState<{[key: string]: boolean}>({});
  const [popoverPlacement, setPopoverPlacement] = useState<{[key: string]: 'topLeft' | 'topRight'}>({});
  const [currentDateFieldType, setCurrentDateFieldType] = useState<'time_range' | 'predict_time_range'>('time_range'); // 标记当前正在选择日期的字段类型

  // 解析意图澄清数据
  const agentStep = questionData?.agent_step?.[0];
  const chatMode = agentStep?.chat_mode;
  const queryMode = agentStep?.query_mode;
  const confirm = agentStep?.confirm;
  const recommend = agentStep?.recommend;

  // 初始化表单数据
  useEffect(() => {
    if (agentStep) {
      // 打印后端返回的完整数据
      console.log('=== 问题澄清数据开始 ===');
      console.log('📦 完整数据 questionData:', JSON.stringify(questionData, null, 2));
      console.log('🎯 chat_mode:', chatMode);
      console.log('🎯 query_mode:', queryMode);
      console.log('=== 问题澄清数据结束 ===');
      
      // 在预测场景下，base_indicators 和 target_indicators 使用相同的数据
      const baseIndicators = queryMode === 'predict_time_series' 
        ? (confirm?.target_indicators || [])
        : (confirm?.base_indicators || []);
      
      const initialData = {
        chat_mode: chatMode,
        query_mode: queryMode,
        time_range: confirm?.time_range || [],
        dimensions: confirm?.dimensions || [],
        target_indicators: confirm?.target_indicators || [],
        filters: confirm?.filters || [],
        base_indicators: baseIndicators,
        indicator_status: confirm?.indicator_status || '',
        predict_time_range: confirm?.predict_time_range || []
      };
      setFormData(initialData);
    }
  }, [agentStep, chatMode, queryMode, confirm, questionData, recommend]);

  // 检测元素位置并决定弹窗placement
  const detectPlacement = (event: any) => {
    const target = event?.target || event?.currentTarget;
    if (target) {
      const rect = target.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      const popoverWidth = 320; // 弹窗宽度约320px (w-80)
      
      // 如果元素右侧空间不足以显示弹窗，使用左侧
      const spaceOnRight = windowWidth - rect.right;
      return spaceOnRight < popoverWidth ? 'topLeft' : 'topRight';
    }
    return 'topRight';
  };

  // 打开/关闭 Popover
  const togglePopover = (type: string, visible: boolean) => {
    // 在预测场景下，如果打开base_indicators或target_indicators，关闭另一个
    if (visible && queryMode === 'predict_time_series') {
      if (type === 'base_indicators' || type === 'target_indicators') {
        const otherField = type === 'base_indicators' ? 'target_indicators' : 'base_indicators';
        setPopoverState(prev => ({ ...prev, [type]: visible, [otherField]: false }));
      } else {
        setPopoverState(prev => ({ ...prev, [type]: visible }));
      }
    } else {
      setPopoverState(prev => ({ ...prev, [type]: visible }));
    }
    
    if (visible) {
      if (type === 'indicator_status') {
        // 初始化临时输入框的值，优先使用已有值，其次使用推荐值，最后使用默认提示
        const recommendData = recommend?.['indicator_status'];
        const defaultValue = formData[type] || 
          (typeof recommendData === 'string' ? recommendData : '') || 
          '例如：偏高、偏低、异常波动等';
        setTempIndicatorStatus(defaultValue);
      } else {
        // 初始化临时选择为当前已选择的值
        // 在预测场景下，base_indicators和target_indicators使用相同的数据
        let initialValue = formData[type] || [];
        if (queryMode === 'predict_time_series' && (type === 'base_indicators' || type === 'target_indicators')) {
          // 优先使用已有的选择，如果没有，则使用空数组
          initialValue = formData[type] || formData['target_indicators'] || formData['base_indicators'] || [];
        }
        setTempSelections(prev => ({ ...prev, [type]: initialValue }));
      }
    }
  };

  // 处理选项切换
  const handleToggle = (type: string, option: any, multiple: boolean, isCandidate: boolean = false) => {
    setTempSelections(prev => {
      const current = prev[type] || [];
      // 如果是 candidate 项，强制使用单选模式
      const shouldUseSingleSelection = !multiple || isCandidate;
      
      if (shouldUseSingleSelection) {
        return { ...prev, [type]: [option] };
      } else {
        const isSelected = current.some(item => 
          item.text === option.text && 
          (!item.field || !option.field || item.field === option.field) &&
          (!item.value || !option.value || item.value === option.value)
        );
        if (isSelected) {
          return {
            ...prev,
            [type]: current.filter(item => 
              !(item.text === option.text && 
                (!item.field || !option.field || item.field === option.field) &&
                (!item.value || !option.value || item.value === option.value))
            )
          };
        } else {
          return { ...prev, [type]: [...current, option] };
        }
      }
    });
  };

  // 打开日期选择器
  const openDatePicker = (fieldType: 'time_range' | 'predict_time_range' = 'time_range') => {
    // 重置日期选择器状态
    setSelectedDateRange([null, null]);
    setDatePickerType('date');
    setCurrentDateFieldType(fieldType);
    setDatePickerVisible(true);
  };

  // 获取time_range的结束日期，用于约束predict_time_range
  const getTimeRangeEndDate = (): dayjs.Dayjs | null => {
    if (!formData.time_range || formData.time_range.length === 0) {
      return null;
    }
    const timeRange = formData.time_range[0];
    if (!timeRange.value) {
      return null;
    }
    // value格式为 "2023-04-01,2023-06-30"
    const dates = timeRange.value.split(',');
    if (dates.length < 2) {
      return null;
    }
    return dayjs(dates[1]);
  };

  // 计算预测时间的最小可选日期（time_range结束日期的下一天）
  const getPredictTimeMinDate = (): dayjs.Dayjs | null => {
    const endDate = getTimeRangeEndDate();
    if (!endDate) {
      return null;
    }
    return endDate.add(1, 'day');
  };

  // 确认选择
  const confirmSelection = (type: string) => {
    // indicator_status 特殊处理：从输入框获取值
    if (type === 'indicator_status') {
      const statusValue = tempIndicatorStatus.trim();
      setRecommendSelected((prev: any) => ({
        ...prev,
        [type]: statusValue !== ''
      }));
      setFormData((prev: any) => ({
        ...prev,
        [type]: statusValue
      }));
    } else {
      // 其他字段处理
      const values = tempSelections[type] || [];
      setRecommendSelected((prev: any) => ({
        ...prev,
        [type]: values.length > 0
      }));
      
      // 在预测场景下，base_indicators 和 target_indicators 自动同步
      if (queryMode === 'predict_time_series' && (type === 'base_indicators' || type === 'target_indicators')) {
        const otherField = type === 'base_indicators' ? 'target_indicators' : 'base_indicators';
        setFormData((prev: any) => ({
          ...prev,
          [type]: values,
          [otherField]: values  // 自动同步到另一个字段
        }));
        // 同时标记另一个字段也已选择
        setRecommendSelected((prev: any) => ({
          ...prev,
          [otherField]: values.length > 0
        }));
      } else {
        // 直接更新字段值，保留指标内部的 qualifier
        setFormData((prev: any) => ({
          ...prev,
          [type]: values
        }));
      }
    }
    
    togglePopover(type, false);
  };

  // 处理日期选择
  const handleDateChange = (dates: any) => {
    // 如果是预测时间范围，需要校验时间连续性
    if (currentDateFieldType === 'predict_time_range' && dates && dates[0]) {
      const minDate = getPredictTimeMinDate();
      if (minDate) {
        const selectedStart = dates[0];
        // 检查选择的开始日期是否是time_range结束日期的下一天
        if (!selectedStart.isSame(minDate, 'day')) {
          // 如果不是紧接着的日期，自动调整为最小可选日期
          dates[0] = minDate;
        }
      }
    }
    setSelectedDateRange(dates);
  };

  // 格式化日期显示文本
  const formatDateText = (start: dayjs.Dayjs, end: dayjs.Dayjs, type: string) => {
    const format = DATE_FORMAT_MAP[type] || 'YYYY-MM-DD';
    return `${start.format(format)} 至 ${end.format(format)}`;
  };

  // 确认日期选择
  const handleDateConfirm = () => {
    if (selectedDateRange[0] && selectedDateRange[1]) {
      let startDate: dayjs.Dayjs = selectedDateRange[0];
      let endDate: dayjs.Dayjs = selectedDateRange[1];
      
      // 根据不同的日期类型，调整起始日期
      switch (datePickerType) {
        case 'month':
          // 月份选择器特殊处理
          if (currentDateFieldType === 'predict_time_range') {
            const minDate = getPredictTimeMinDate();
            if (minDate) {
              // 计算用户选择的月数
              const selectedStartMonth = startDate.startOf('month');
              const selectedEndMonth = endDate.endOf('month');
              const daysDiff = selectedEndMonth.diff(selectedStartMonth, 'day') + 1;
              
              // 从最小可选日期开始，连续计算相同天数
              startDate = minDate;
              endDate = minDate.add(daysDiff - 1, 'day');
            } else {
              startDate = startDate.startOf('month');
              endDate = endDate.endOf('month');
            }
          } else {
            // 查询时间范围：设置为当月1号到月末
            startDate = startDate.startOf('month');
            endDate = endDate.endOf('month');
          }
          break;
        case 'quarter':
          // 季度选择器特殊处理
          if (currentDateFieldType === 'predict_time_range') {
            const minDate = getPredictTimeMinDate();
            if (minDate) {
              // 计算用户选择的季度数对应的天数
              const startMonth = startDate.month();
              const endMonth = endDate.month();
              const startQuarterFirstMonth = Math.floor(startMonth / 3) * 3;
              const endQuarterFirstMonth = Math.floor(endMonth / 3) * 3;
              const endQuarterLastMonth = endQuarterFirstMonth + 2;
              
              const selectedStartQuarter = startDate.month(startQuarterFirstMonth).startOf('month');
              const selectedEndQuarter = endDate.month(endQuarterLastMonth).endOf('month');
              const daysDiff = selectedEndQuarter.diff(selectedStartQuarter, 'day') + 1;
              
              // 从最小可选日期开始，连续计算相同天数
              startDate = minDate;
              endDate = minDate.add(daysDiff - 1, 'day');
            } else {
              const startMonth = startDate.month();
              const endMonth = endDate.month();
              const startQuarterFirstMonth = Math.floor(startMonth / 3) * 3;
              const endQuarterFirstMonth = Math.floor(endMonth / 3) * 3;
              const endQuarterLastMonth = endQuarterFirstMonth + 2;
              startDate = startDate.month(startQuarterFirstMonth).startOf('month');
              endDate = endDate.month(endQuarterLastMonth).endOf('month');
            }
          } else {
            // 查询时间范围：设置为季度第一天到季度最后一天
            const startMonth = startDate.month();
            const endMonth = endDate.month();
            const startQuarterFirstMonth = Math.floor(startMonth / 3) * 3;
            const endQuarterFirstMonth = Math.floor(endMonth / 3) * 3;
            const endQuarterLastMonth = endQuarterFirstMonth + 2;
            startDate = startDate.month(startQuarterFirstMonth).startOf('month');
            endDate = endDate.month(endQuarterLastMonth).endOf('month');
          }
          break;
        case 'year':
          // 年份选择器特殊处理
          if (currentDateFieldType === 'predict_time_range') {
            const minDate = getPredictTimeMinDate();
            if (minDate) {
              // 计算用户选择的年数对应的天数
              const selectedStartYear = startDate.startOf('year');
              const selectedEndYear = endDate.endOf('year');
              const daysDiff = selectedEndYear.diff(selectedStartYear, 'day') + 1;
              
              // 从最小可选日期开始，连续计算相同天数
              startDate = minDate;
              endDate = minDate.add(daysDiff - 1, 'day');
            } else {
              startDate = startDate.startOf('year');
              endDate = endDate.endOf('year');
            }
          } else {
            // 查询时间范围：设置为1月1日到12月31日
            startDate = startDate.startOf('year');
            endDate = endDate.endOf('year');
          }
          break;
        case 'week':
          // 周选择器特殊处理：
          // 如果是预测时间范围，从最小可选日期开始，按用户选择的周数计算天数
          // 否则使用 ISO 周（周一到周日）
          if (currentDateFieldType === 'predict_time_range') {
            const minDate = getPredictTimeMinDate();
            if (minDate) {
              // 计算用户选择的周数
              // 先按ISO周计算开始和结束周
              const selectedStartWeek = startDate.startOf('isoWeek');
              const selectedEndWeek = endDate.endOf('isoWeek');
              // 计算相差的天数（包含首尾）
              const daysDiff = selectedEndWeek.diff(selectedStartWeek, 'day') + 1;
              
              // 从最小可选日期开始，连续计算相同天数
              startDate = minDate;
              endDate = minDate.add(daysDiff - 1, 'day');
            } else {
              // 没有最小日期限制，使用 ISO 周
              startDate = startDate.startOf('isoWeek');
              endDate = endDate.endOf('isoWeek');
            }
          } else {
            // 查询时间范围使用 ISO 周（周一作为一周的开始）
            startDate = startDate.startOf('isoWeek');
            endDate = endDate.endOf('isoWeek');
          }
          break;
        case 'date':
        default:
          // 日期选择器：保持原样
          break;
      }
      
      // 预测时间范围所有粒度都已经自动锁定到最小日期，不需要再校验
      // 日期模式保持原样，也不需要校验
      
      const startDateStr = startDate.format('YYYY-MM-DD');
      const endDateStr = endDate.format('YYYY-MM-DD');
      
      // 从后端推荐数据中获取 field 和 operator（根据当前字段类型选择）
      const recommendData = recommend?.[currentDateFieldType]?.[0] || {};
      const field = recommendData.field || "";
      // const operator = recommendData.operator || "range";
      
      // 判断是否需要添加granularity字段（只在归因和预测场景下添加）
      const needGranularity = chatMode === 'chat_with_analysis' || chatMode === 'chat_with_predict';
      
      // 根据datePickerType确定granularity的值
      const granularityMap: { [key: string]: string } = {
        'date': '年月日',
        'week': '年周',
        'month': '年月',
        'quarter': '年季度',
        'year': '年'
      };
      const granularity = granularityMap[datePickerType] || '年月日';
      
      // 根据granularity计算periods（如果是predict_time_range）
      let periods = 0;
      if (currentDateFieldType === 'predict_time_range') {
        // 根据不同的粒度计算对应的单位数量
        switch (granularity) {
          case '年月日':
            periods = endDate.diff(startDate, 'day') + 1; // 天数
            break;
          case '年周':
            periods = Math.ceil(endDate.diff(startDate, 'day') / 7) + 1; // 周数
            break;
          case '年月':
            // 计算月份差，包含开始和结束月
            const startYear = startDate.year();
            const endYear = endDate.year();
            const startMonth = startDate.month();
            const endMonth = endDate.month();
            periods = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
            break;
          case '年季度':
            // 计算季度差，包含开始和结束季度
            const startQuarter = Math.floor(startDate.month() / 3);
            const endQuarter = Math.floor(endDate.month() / 3);
            periods = (endDate.year() - startDate.year()) * 4 + (endQuarter - startQuarter) + 1;
            break;
          case '年':
            periods = endDate.year() - startDate.year() + 1; // 年数
            break;
          default:
            periods = endDate.diff(startDate, 'day') + 1; // 默认按天数
        }
      }
      
      // 构建基础dateRange对象
      const dateRange: any = {
        text: `${startDateStr+' '}到${' '+endDateStr}`,
        field: field,
        operator: 'range',
        value: `${startDateStr},${endDateStr}`
      };
      
      // 只在归因和预测场景下添加granularity字段
      if (needGranularity) {
        dateRange.granularity = granularity;
      }
      
      // 如果是预测时间范围，添加额外的字段
      if (currentDateFieldType === 'predict_time_range') {
        dateRange.time_series_continuous = true; // 默认true
        dateRange.periods = periods; // 根据granularity计算的周期数
      }
      
      // 标记对应字段已通过recommend选择
      setRecommendSelected((prev: any) => ({
        ...prev,
        [currentDateFieldType]: true
      }));
      
      // 更新对应字段的数据
      setFormData((prev: any) => ({
        ...prev,
        [currentDateFieldType]: [dateRange]
      }));
    }
    setDatePickerVisible(false);
  };

  // 构建查询语句 - 根据模板拼接自然语言查询
  const buildQueryString = () => {
    const template = getTemplateText();
    
    if (!template || !template.parts) {
      return '查询数据';
    }

    // 获取所有指标中的qualifiers
    const getQualifiersFromIndicators = () => {
      const selectedIndicators = [...(formData.target_indicators || []), ...(formData.base_indicators || [])];
      const allQualifiers: any[] = [];
      selectedIndicators.forEach((indicator: any) => {
        if (indicator.qualifier && Array.isArray(indicator.qualifier)) {
          allQualifiers.push(...indicator.qualifier);
        }
      });
      return allQualifiers;
    };

    // 获取字段的值文本
    const getFieldText = (fieldType: string) => {
      // qualifier 特殊处理：从指标中提取
      if (fieldType === 'qualifier') {
        const allQualifiers = getQualifiersFromIndicators();
        return allQualifiers.map(item => formatItemWithOperator(item, '、')).filter((t: string) => t).join('、');
      }
      
      // indicator_status 特殊处理：是字符串
      if (fieldType === 'indicator_status') {
        return formData[fieldType] || '';
      }
      
      // 其他字段统一处理
      const fieldData = formData[fieldType];
      if (!fieldData || fieldData.length === 0) return '';
      
      return fieldData.map((item: any) => formatDisplayText(item, fieldType, chatMode)).filter((t: string) => t).join('、');
    };

    // 检查字段是否存在且有值
    const hasFieldValue = (fieldType: string) => {
      if (fieldType === 'qualifier') {
        return getQualifiersFromIndicators().length > 0;
      }
      if (fieldType === 'indicator_status') {
        return !!formData[fieldType];
      }
      return formData[fieldType]?.length > 0;
    };

    // 构建查询语句
    let queryString = '';
    
    // 检查是否有任何字段有值
    const hasAnyValue = template.parts.some((part: any) => hasFieldValue(part.field));
    
    if (hasAnyValue) {
      // 添加开始文字
      if (template.start) {
        queryString += template.start;
      }

      // 处理各个字段
      template.parts.forEach((part: any) => {
        const fieldText = getFieldText(part.field);
        if (fieldText) {
          // 如果有before文字，添加它
          if (part.before) {
            queryString += part.before;
          }
          queryString += fieldText;
          // 如果有after文字，添加它
          if (part.after) {
            queryString += part.after;
          }
        }
      });

      // 添加结束文字
      if (template.end) {
        queryString += template.end;
      }
    } else {
      queryString = '查询数据';
    }

    return queryString;
  };

  // 检查所有推荐选项是否已完成
  const checkAllRecommendationsCompleted = () => {
    if (!recommend) return true;
    
    // 获取当前模板中需要的字段
    const template = getTemplateText();
    const templateFields = template.parts?.map((part: any) => part.field) || [];
    
    // 只检查当前模板中需要的字段
    for (const field of templateFields) {
      const hasRecommend = recommend[field] && recommend[field].length > 0;
      const hasSelection = formData[field] && formData[field].length > 0;
      
      if (hasRecommend && !hasSelection) {
        return false;
      }
    }
    return true;
  };

  // 提交处理
  const handleSubmit = () => {
    setSubmitting(true);
    
    // 构建查询语句
    const queryString = buildQueryString();
    
    // 在预测场景下，base_indicators 提交时为空数组
    const baseIndicatorsValue = queryMode === 'predict_time_series' ? [] : (formData.base_indicators || []);
    
    // 构建符合后端格式的意图澄清数据
    const intentClarifyData = {
      data: {
        agent_label: "intent_clarify",
        extra:questionData.extra || {},
        agent_step: [
          {
            chat_mode: chatMode,
            query_mode: queryMode,
            confirm: {
              time_range: formData.time_range || [],
              dimensions: formData.dimensions || [],
              target_indicators: formData.target_indicators || [],
              filters: formData.filters || [],
              base_indicators: baseIndicatorsValue,
              indicator_status: formData.indicator_status || '',
              predict_time_range: formData.predict_time_range || []
            }
          }
        ]
      },
      chat_mode: chatMode
    };

    const ICparameter = {
      query: queryString || '查询数据',
      clarify_flag: true,
      chat_mode: chatMode,
      structured_data: {
        ...formData,
        base_indicators: baseIndicatorsValue
      },
      extra: intentClarifyData
    };

    // 打印最终拼接的数据
    console.log('=== 点击完成，最终拼接数据 ===');
    console.log('📋 查询语句:', queryString);
    console.log('📦 完整参数 ICparameter:', ICparameter, null, 2);
    console.log('🔧 意图澄清数据 intentClarifyData:', intentClarifyData, null, 2);
    console.log('=== 数据打印结束 ===');
    setTimeout(() => {
      setSubmitting(false);
      // 暂时注释掉接口调用，只查看打印数据
      onComplete(ICparameter);
    }, 500);
  };


  // 根据 query_mode 生成问题模板的各个部分
  const getTemplateText = () => {
    type TemplatePart = { 
      field: string; 
      before?: string;  // 字段前面的文字
      after?: string;   // 字段后面的文字
    };
    const templates: { [key: string]: { start?: string; parts: TemplatePart[]; end?: string } } = {
      // 问数 - 明细查询
      query_detail: {
        start: '请查询',
        parts: [
          { field: 'time_range', after: '内，' },
          { field: 'filters', after: '条件下，' },
          { field: 'dimensions', after: '、' },
          { field: 'target_indicators' }
        ],
        end: '的明细数据。'
      },
      // 问数 - 聚合查询
      query_aggregation: {
        start: '请筛选',
        parts: [
          { field: 'time_range', after: '时间范围内，' },
          { field: 'dimensions', after: '条件下的数据，' },
          { before: '再按', field: 'filters' ,after: '分组，'},
          { before: '计算',field: 'target_indicators' }
        ],
        end: '。'
      },
      // 归因 - 单独指标归因
      analysis_single_indicator: {
        start: '请分析',
        parts: [
          { field: 'time_range', after: '内，' },
          { field: 'filters', after: '条件下，' },
          { field: 'target_indicators' },
          { field: 'indicator_status' }
        ],
        end: '的原因。'
      },
      // 归因 - 多维指标归因
      analysis_dims_indicator: {
        start: '请分析',
        parts: [
          { field: 'time_range', after: '内，' },
          { field: 'filters', after: '条件下，从' },
          { field: 'dimensions', after: '维度分析' },
          { field: 'target_indicators' },
          { field: 'indicator_status' }
        ],
        end: '的原因。'
      },
      // 归因 - 实体对比指标归因
      analysis_compare_indicator: {
        start: '请对比分析',
        parts: [
          { field: 'time_range', after: '内，' },
          { field: 'filters', after: '条件下，' },
          { field: 'base_indicators', after: '比' },
          { field: 'target_indicators' },
          { field: 'indicator_status' }
        ],
        end: '的原因。'
      },
      // 预测 - 时间序列预测
      predict_time_series: {
        start: '请查询',
        parts: [
          { field: 'time_range', after: '内，' },
          { field: 'filters', after: '条件下，' },
          { field: 'base_indicators', after: '，预测' },
          { field: 'predict_time_range' },
          { field: 'target_indicators' }
        ],
        end: '。'
      },
      // Excel分析 - 明细查询
      excel_detail: {
        start: '请查询',
        parts: [
          { field: 'time_range', after: '内，' },
          { field: 'filters', after: '条件下，' },
          { field: 'dimensions', after: '、' },
          { field: 'target_indicators' }
        ],
        end: '的明细数据。'
      },
      // Excel分析 - 聚合查询
      excel_aggregation: {
        start: '请统计',
        parts: [
          { field: 'time_range', after: '内，' },
          { field: 'filters', after: '条件下，不同' },
          { field: 'dimensions' },
          { field: 'target_indicators' }
        ],
        end: '数据。'
      },
      // 大屏 - 明细查询
      dashboard_detail: {
        start: '请查询',
        parts: [
          { field: 'time_range', after: '内，' },
          { field: 'filters', after: '条件下，' },
          { field: 'dimensions', after: '、' },
          { field: 'target_indicators' }
        ],
        end: '的明细数据。'
      },
      // 大屏 - 聚合查询
      dashboard_aggregation: {
        start: '请统计',
        parts: [
          { field: 'time_range', after: '内，' },
          { field: 'filters', after: '条件下，不同' },
          { field: 'dimensions' },
          { field: 'target_indicators' }
        ],
        end: '数据。'
      }
    };

    return templates[queryMode] || { parts: [] };
  };

  // 获取字段显示数据（qualifier特殊处理）
  const getFieldDisplayData = (type: string) => {
    if (type === 'qualifier') {
      const selectedIndicators = [...(formData.target_indicators || []), ...(formData.base_indicators || [])];
      const qualifierData: any[] = [];
      selectedIndicators.forEach((indicator: any) => {
        if (indicator.qualifier && Array.isArray(indicator.qualifier)) {
          qualifierData.push(...indicator.qualifier);
        }
      });
      return qualifierData;
    }
    return formData[type] || [];
  };

  // 渲染选择项
  const renderSelectionItem = (label: string, type: string) => {
    const isQualifier = type === 'qualifier';
    const isTimeRange = type === 'time_range';
    const isIndicatorStatus = type === 'indicator_status';
    
    // 检查confirm中是否有candidate数组
    // 特殊处理：预测场景下，base_indicators 应该检查 target_indicators 的 candidate
    let confirmData = confirm?.[type];
    if (type === 'base_indicators' && queryMode === 'predict_time_series') {
      confirmData = confirm?.['target_indicators'];
    }
    const hasConfirmCandidate = Array.isArray(confirmData) && confirmData.some((item: any) => 
      item.candidate && Array.isArray(item.candidate) && item.candidate.length > 0
    );
    
    // 检查是否已通过推荐选择（需要提前获取，因为hasConfirm依赖它）
    const isRecommendSelected = recommendSelected[type];
    
    // 检查是否有确认的值
    // 特殊处理：如果confirm中有candidate，只有用户选择后才算已确认
    const displayData = getFieldDisplayData(type);
    const hasConfirm = hasConfirmCandidate 
      ? isRecommendSelected  // 有candidate时，只有用户选择后才算已确认
      : (isIndicatorStatus ? !!formData[type] : displayData.length > 0);  // 没有candidate时，formData有值就算已确认
    
    // 检查是否有推荐数据
    // 特殊处理：在预测 - 时间序列预测场景下，base_indicators的推荐数据来自target_indicators
    let recommendData = recommend?.[type];
    if (type === 'base_indicators' && queryMode === 'predict_time_series') {
      recommendData = recommend?.['target_indicators'];
    }
    const hasRecommend = isIndicatorStatus
      ? (typeof recommendData === 'string' && recommendData.trim() !== '')
      : (Array.isArray(recommendData) && recommendData.length > 0);
    
    // 如果confirm中有candidate，优先使用confirm中的数据作为选项
    // confirmData 在上面已经根据预测场景做了处理，可以直接使用
    if (hasConfirmCandidate && !isIndicatorStatus) {
      recommendData = confirmData;
    }
    
    const multiple = !['time_range', 'indicator_status', 'candidate', 'predict_time_range'].includes(type);
    
    // 判断是否应该显示选择弹框：有推荐数据或者confirm中有candidate
    const shouldShowPopover = (hasRecommend || hasConfirmCandidate) && !isQualifier;
    
    // Popover 内容
    const popoverContent = shouldShowPopover ? (
      <div className="w-80">
        {type === 'indicator_status' ? (
          // indicator_status 显示输入框
          <div className="p-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              请输入指标异动描述
            </label>
            <Input
              value={tempIndicatorStatus}
              onChange={(e) => setTempIndicatorStatus(e.target.value)}
              placeholder="请输入指标异动描述"
              className="mb-3"
            />
          </div>
        ) : (
          // 其他字段显示选择列表
          <SelectionContent
            options={recommendData}
            selectedValues={formData[type] || []}
            tempSelected={tempSelections[type] || []}
            onToggle={(option, isCandidate) => handleToggle(type, option, multiple, isCandidate)}
          />
        )}
        <div className="flex justify-end gap-2 mt-3 pt-3 border-t">
          <Button size="small" onClick={() => togglePopover(type, false)}>取消</Button>
          {isTimeRange && (
            <Button size="small" onClick={() => {
              togglePopover(type, false);
              openDatePicker('time_range');
            }}>自定义日期</Button>
          )}
          {type === 'predict_time_range' && (
            <Button size="small" onClick={() => {
              togglePopover(type, false);
              openDatePicker('predict_time_range');
            }}>自定义日期</Button>
          )}
          <Button type="primary" size="small" onClick={() => confirmSelection(type)}>确认</Button>
        </div>
      </div>
    ) : null;
    
    return (
      <div key={type} className="flex items-center space-x-3 min-w-0">
        
        {/* 显示已确认的内容 */}
        {hasConfirm && (
          isQualifier ? (
            // qualifier 不可点击，只显示
            <div className="flex flex-wrap gap-2">
              {displayData.map((item: any, index: number) => (
                <span 
                  key={index} 
                  className="px-3 py-1  text-base font-medium whitespace-nowrap"
                >
                  {formatDisplayText(item, type, chatMode)}
                </span>
              ))}
            </div>
          ) : isIndicatorStatus ? (
            // indicator_status 显示为可点击的标签
            <Popover
              content={popoverContent}
              trigger="click"
              open={popoverState[type]}
              onOpenChange={(visible) => togglePopover(type, visible)}
              placement={popoverPlacement[type] || 'topRight'}
              arrow={false}
              align={{
                offset: popoverPlacement[type] === 'topLeft' ? [-350, 0] : [350, 0]
              }}
            >
              <span 
                className="px-3 py-1 bg-gray-50 text-gray-700 rounded-md border border-gray-300 cursor-pointer hover:bg-gray-100 transition-colors text-base font-medium whitespace-nowrap"
                onClick={(e) => {
                  const placement = detectPlacement(e);
                  setPopoverPlacement(prev => ({ ...prev, [type]: placement }));
                }}
              >
                {formData[type]}
              </span>
            </Popover>
          ) : (
            // 其他字段显示为可点击的标签列表
            <Popover
              content={popoverContent}
              trigger="click"
              open={popoverState[type]}
              onOpenChange={(visible) => togglePopover(type, visible)}
              placement={popoverPlacement[type] || 'topRight'}
              arrow={false}
              align={{
                offset: popoverPlacement[type] === 'topLeft' ? [-350, 0] : [350, 0]
              }}
            >
              <div className="flex flex-wrap gap-2"
                onClick={(e) => {
                  const placement = detectPlacement(e);
                  setPopoverPlacement(prev => ({ ...prev, [type]: placement }));
                }}
              >
                {displayData.map((item: any, index: number) => (
                  <span 
                    key={index}
                    className="px-3 py-1 bg-gray-50 text-gray-700 rounded-md border border-gray-300 cursor-pointer hover:bg-gray-100 transition-colors text-base font-medium whitespace-nowrap"
                  >
                    {formatDisplayText(item, type, chatMode)}
                  </span>
                ))}
              </div>
            </Popover>
          )
        )}
        
        {/* 显示推荐的占位符 - 只有在没有通过recommend选择时才显示，qualifier 不显示占位符 */}
        {shouldShowPopover && !isRecommendSelected && !isQualifier && (
          <Popover
            content={popoverContent}
            trigger="click"
            open={popoverState[type]}
            onOpenChange={(visible) => togglePopover(type, visible)}
            placement={popoverPlacement[type] || 'topRight'}
            arrow={false}
            align={{
              offset: popoverPlacement[type] === 'topLeft' ? [-350, 0] : [350, 0]
            }}
          >
            <span 
              className="cursor-pointer text-gray-600 hover:text-gray-800 text-sm font-medium px-3 py-2 border border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors whitespace-nowrap"
              onClick={(e) => {
                const placement = detectPlacement(e);
                setPopoverPlacement(prev => ({ ...prev, [type]: placement }));
              }}
            >
              {label}
            </span>
          </Popover>
        )}
        
        {/* qualifier 特殊占位符 - 在选择指标前显示"业务限定" */}
        {isQualifier && !hasConfirm && (
          <span 
            className="text-gray-600 text-sm font-medium px-3 py-2 border border-dashed border-gray-300 rounded-lg whitespace-nowrap"
          >
            {label}
          </span>
        )}
      </div>
    );
  };

  // 获取target_indicators的动态标签
  const getTargetIndicatorsLabel = (isShort: boolean = false) => {
    if (chatMode === 'chat_with_analysis') return '归因指标';
    if (chatMode === 'chat_with_predict') return '预测指标';
    return isShort ? '指标' : '指标';
  };

  // 字段标签映射（用于顶部提示）
  const getFieldLabel = (key: string, forRecommendText: boolean = false): string => {
    const labels: { [key: string]: string } = {
      time_range: forRecommendText ? '查询时间范围' : '时间范围',
      dimensions: '选择维度',
      candidate: '选择对象',
      target_indicators: getTargetIndicatorsLabel(),
      qualifier: '业务限定',
      filters: '过滤条件',
      base_indicators: '基线指标',
      indicator_status: '指标异动描述',
      predict_time_range: '预测时间范围'
    };
    return labels[key] || key;
  };

  // 根据 chat_mode 获取智能体名称
  const getChatModeLabel = () => {
    const modeLabels: { [key: string]: string } = {
      chat_with_db_execute: '智能问数',
      chat_with_analysis: '归因分析',
      chat_with_predict: '预测分析',
      chat_with_excel: 'Excel分析',
      chat_with_dashboard: '大屏生成'
    };
    return modeLabels[chatMode];
  };

  // 根据 recommend 和 confirm 获取推荐字段的显示文本
  const getRecommendFieldsText = (): string[] => {
    const fields = new Set<string>();
    
    // 从recommend中获取字段
    if (recommend) {
      Object.keys(recommend).forEach(key => {
        const value = recommend[key];
        const hasValue = key === 'indicator_status' 
          ? (typeof value === 'string' && value.trim() !== '')
          : (Array.isArray(value) && value.length > 0);
        if (value && hasValue) {
          fields.add(key);
        }
      });
    }
    
    // 从confirm中获取有candidate的字段
    if (confirm) {
      Object.keys(confirm).forEach(key => {
        const value = confirm[key];
        if (Array.isArray(value)) {
          const hasCandidate = value.some((item: any) => 
            item.candidate && Array.isArray(item.candidate) && item.candidate.length > 0
          );
          if (hasCandidate) {
            fields.add(key);
          }
        }
      });
    }
    
    return Array.from(fields)
      .map(key => getFieldLabel(key, true))
      .filter(label => label);
  };

  if (!agentStep) {
    return <div>数据格式错误</div>;
  }

  const chatModeLabel = getChatModeLabel();
  const recommendFields = getRecommendFieldsText();

  return (
    <div className="intent-clarify-v2 bg-white pt-6 pb-6">
      {/* 顶部提示信息 */}
      <div className="mb-10">
        <div className="text-base font-medium text-gray-700 leading-relaxed flex-1">
          🎯 嗨！系统识别您已启用 
          <span className="text-purple-700 font-bold text-lg mx-1">「{chatModeLabel}」</span>
          智能体问答模式。
          <br />
          为生成精准数据分析，请在下方的推荐选项中，完成{' '}
          {recommendFields.map((field, index) => (
            <span key={index}>
              <span className="text-blue-600 font-semibold">{field}</span>
              {index < recommendFields.length - 1 && '、'}
            </span>
          ))}
          {' '}语义信息配置，以进一步完善您的查询指令。
        </div>
      </div>

      {/* 选择区域 - 根据模板显示字段 */}
      <div className="mb-8">
        {(() => {
          const template = getTemplateText();

          // 检查字段是否存在且不为空数组
          const checkFieldExists = (fieldType: string) => {
            // qualifier 特殊处理：检查是否有指标包含 qualifier 属性
            if (fieldType === 'qualifier') {
              // 检查已选择的指标中是否有 qualifier
              const hasSelectedQualifier = getFieldDisplayData(fieldType).length > 0;
              if (hasSelectedQualifier) return true;
              
              // 检查推荐的指标中是否有 qualifier
              const allIndicators = [...(recommend?.target_indicators || []), ...(recommend?.base_indicators || [])];
              return allIndicators.some((indicator: any) => 
                indicator.qualifier && Array.isArray(indicator.qualifier) && indicator.qualifier.length > 0
              );
            }
            
            // indicator_status 特殊处理：是字符串
            if (fieldType === 'indicator_status') {
              const hasConfirm = !!confirm?.[fieldType];
              const hasRecommend = typeof recommend?.[fieldType] === 'string' && recommend[fieldType].trim() !== '';
              return hasConfirm || hasRecommend;
            }
            
            // base_indicators 在预测场景下特殊处理：只检测target_indicators
            if (fieldType === 'base_indicators' && queryMode === 'predict_time_series') {
              // 检查confirm.target_indicators
              const hasConfirmTarget = Array.isArray(confirm?.['target_indicators']) && confirm['target_indicators'].length > 0;
              // 检查recommend.target_indicators
              const hasRecommend = Array.isArray(recommend?.['target_indicators']) && recommend['target_indicators'].length > 0;
              // 检查confirm.target_indicators中是否有candidate
              const hasTargetCandidate = Array.isArray(confirm?.['target_indicators']) && confirm['target_indicators'].some((item: any) => 
                item.candidate && Array.isArray(item.candidate) && item.candidate.length > 0
              );
              return hasConfirmTarget || hasRecommend || hasTargetCandidate;
            }
            
            // 其他字段统一判断
            const hasConfirm = Array.isArray(confirm?.[fieldType]) && confirm[fieldType].length > 0;
            const hasRecommend = Array.isArray(recommend?.[fieldType]) && recommend[fieldType].length > 0;
            
            // 检查confirm中是否有candidate数组
            const hasConfirmCandidate = Array.isArray(confirm?.[fieldType]) && confirm[fieldType].some((item: any) => 
              item.candidate && Array.isArray(item.candidate) && item.candidate.length > 0
            );
            
            return hasConfirm || hasRecommend || hasConfirmCandidate;
          };

          // 检查是否有任何字段存在
          const hasAnyField = template.parts?.some((part: any) => {
            return checkFieldExists(part.field);
          });

          return (
            <div className="flex items-center flex-wrap gap-x-2 gap-y-3 text-base leading-relaxed">
              {/* 开始文字 - 只有当有字段存在时才显示 */}
              {hasAnyField && template.start && (
                <span className="text-gray-700 font-medium">{template.start}</span>
              )}
              
              {/* 渲染字段和它们的前后文字 */}
              {template.parts?.map((part: any, index: number) => {
                const fieldType = part.field;
                const hasField = checkFieldExists(fieldType);
                
                // 如果字段不存在或为空数组，跳过整个字段（包括before和after文字）
                if (!hasField) return null;
                
                // 检查是否有下一个存在的字段
                const hasNextField = template.parts?.slice(index + 1).some((nextPart: any) => {
                  return checkFieldExists(nextPart.field);
                });
                
                return (
                  <React.Fragment key={index}>
                    {/* 字段前面的文字 */}
                    {part.before && <span className="text-gray-700 font-medium">{part.before}</span>}
                    {/* 字段选择按钮 */}
                    {renderSelectionItem(getFieldLabel(fieldType), fieldType)}
                    {/* 只有在当前字段存在且后面还有其他字段存在时，才显示after文字 */}
                    {part.after && hasNextField && <span className="text-gray-700 font-medium">{part.after}</span>}
                  </React.Fragment>
                );
              })}
              
              {/* 结束文字 - 只有当有字段存在时才显示 */}
              {hasAnyField && template.end && (
                <span className="text-gray-700 font-medium">{template.end}</span>
              )}
              
              {/* 提交按钮 - 放在句子后面 */}
              {hasAnyField && (
                <Button 
                  icon={<SvgIcon localIcon="refresh" style={{ width: '16px', height: '16px' }} />}
                  onClick={handleSubmit}
                  loading={submitting}
                  disabled={!checkAllRecommendationsCompleted()}
                  className={`ml-2 flex items-center justify-center w-8 h-8 rounded-full transition-all ${
                    checkAllRecommendationsCompleted() 
                      ? '' 
                      : 'opacity-50 cursor-not-allowed'
                  }`}
                  style={{ minWidth: '32px', padding: 0 }}
                />
              )}
            </div>
          );
        })()}
      </div>

      {/* 日期选择器弹框 */}
      <Modal
        title={currentDateFieldType === 'time_range' ? '选择时间范围' : '选择预测时间范围'}
        open={datePickerVisible}
        onCancel={() => setDatePickerVisible(false)}
        onOk={handleDateConfirm}
        okText="确认"
        cancelText="取消"
        width={600}
      >
        <div className="p-4">
          {/* 预测时间范围的约束提示 */}
          {currentDateFieldType === 'predict_time_range' && (() => {
            const minDate = getPredictTimeMinDate();
            const timeRangeEnd = getTimeRangeEndDate();
            return minDate && timeRangeEnd ? (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start">
                  <SvgIcon localIcon="info" style={{ width: '16px', height: '16px', marginTop: '2px' }} className="text-blue-500 mr-2" />
                  <div className="text-sm text-blue-700">
                    <div className="font-medium mb-1">⏰ 预测时间约束说明：</div>
                    <div>• 查询时间范围：截止到 <span className="font-semibold">{timeRangeEnd.format('YYYY-MM-DD')}</span></div>
                    <div>• 预测时间必须从 <span className="font-semibold">{minDate.format('YYYY-MM-DD')}</span> 开始</div>
                    <div>• 不能跳过日期，必须保持时间连续性</div>
                  </div>
                </div>
              </div>
            ) : null;
          })()}
          
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
              onChange={handleDateChange}
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
              disabledDate={(current) => {
                // 只对预测时间范围添加约束
                if (currentDateFieldType !== 'predict_time_range') {
                  return false;
                }
                
                const minDate = getPredictTimeMinDate();
                if (!minDate) {
                  return false;
                }
                
                // 禁用time_range结束日期及之前的所有日期
                return current && current.isBefore(minDate, 'day');
              }}
            />
          </div>

          {/* 预览选择结果 */}
          {selectedDateRange[0] && selectedDateRange[1] && (
            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
              已选择：{formatDateText(selectedDateRange[0], selectedDateRange[1], datePickerType)}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default IntentClarifyV2;

