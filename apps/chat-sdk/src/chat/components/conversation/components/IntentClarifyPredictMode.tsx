import React, { useState, useEffect } from 'react';
import { Button, Modal, DatePicker, Popover } from 'antd';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import SvgIcon from '../../../components/SvgIcon';
import {
  DATE_FORMAT_MAP,
  formatItemWithOperator,
  formatDisplayText,
  SelectionContent,
  convertDateToGranularityValue,
  formatTimeRangeValue
} from './intentClarifyUtils';

// 启用 ISO 周插件（周一作为一周的开始）
dayjs.extend(isoWeek);

// 组件属性类型定义
interface IntentClarifyPredictModeProps {
  questionData: any; // 意图澄清数据
  onComplete: (ICparameter: any) => void; // 完成回调
}

// 主组件 - 预测分析场景
const IntentClarifyPredictMode: React.FC<IntentClarifyPredictModeProps> = ({ questionData, onComplete }) => {
  const [formData, setFormData] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);
  const [popoverState, setPopoverState] = useState<{[key: string]: boolean}>({});
  const [tempSelections, setTempSelections] = useState<{[key: string]: any[]}>({});
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [datePickerType, setDatePickerType] = useState<'date' | 'week' | 'month' | 'quarter' | 'year'>('date');
  const [selectedDateRange, setSelectedDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);
  const [recommendSelected, setRecommendSelected] = useState<{[key: string]: boolean}>({});
  const [popoverPlacement, setPopoverPlacement] = useState<{[key: string]: 'topLeft' | 'topRight'}>({});
  const [currentDateFieldType, setCurrentDateFieldType] = useState<'time_range' | 'predict_time_range'>('time_range');

  // 解析意图澄清数据
  const agentStep = questionData?.agent_step?.[0];
  const chatMode = agentStep?.chat_mode;
  const queryMode = agentStep?.query_mode;
  const confirm = agentStep?.confirm;
  const recommend = agentStep?.recommend;

  // 初始化表单数据
  useEffect(() => {
    if (agentStep) {
      console.log('=== 预测分析场景 - 问题澄清数据开始 ===');
      console.log('📦 完整数据 questionData:', JSON.stringify(questionData, null, 2));
      console.log('🎯 chat_mode:', chatMode);
      console.log('🎯 query_mode:', queryMode);
      console.log('=== 预测分析场景 - 问题澄清数据结束 ===');
      
      // 在预测场景下，base_indicators 和 target_indicators 使用相同的数据
      const baseIndicators = confirm?.target_indicators || [];
      
      const initialData = {
        chat_mode: chatMode,
        query_mode: queryMode,
        time_range: confirm?.time_range || [],
        dimensions: confirm?.dimensions || [],
        target_indicators: confirm?.target_indicators || [],
        filters: confirm?.filters || [],
        base_indicators: baseIndicators,
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
      const popoverWidth = 320;
      
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
      // 在预测场景下，base_indicators和target_indicators使用相同的数据
      let initialValue = formData[type] || [];
      if (queryMode === 'predict_time_series' && (type === 'base_indicators' || type === 'target_indicators')) {
        initialValue = formData[type] || formData['target_indicators'] || formData['base_indicators'] || [];
      }
      setTempSelections(prev => ({ ...prev, [type]: initialValue }));
    }
  };

  // 处理选项切换
  const handleToggle = (type: string, option: any, multiple: boolean, isCandidate: boolean = false) => {
    setTempSelections(prev => {
      const current = prev[type] || [];
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
    setSelectedDateRange([null, null]);
    setDatePickerType('date');
    setCurrentDateFieldType(fieldType);
    setDatePickerVisible(true);
  };

  // 获取time_range的结束日期
  const getTimeRangeEndDate = (): dayjs.Dayjs | null => {
    if (!formData.time_range || formData.time_range.length === 0) {
      return null;
    }
    const timeRange = formData.time_range[0];
    if (!timeRange.value) {
      return null;
    }
    const dates = timeRange.value.split(',');
    if (dates.length < 2) {
      return null;
    }
    return dayjs(dates[1]);
  };

  // 计算预测时间的最小可选日期
  const getPredictTimeMinDate = (): dayjs.Dayjs | null => {
    const endDate = getTimeRangeEndDate();
    if (!endDate) {
      return null;
    }
    return endDate.add(1, 'day');
  };

  // 确认选择
  const confirmSelection = (type: string) => {
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
        [otherField]: values
      }));
      setRecommendSelected((prev: any) => ({
        ...prev,
        [otherField]: values.length > 0
      }));
    } else {
      setFormData((prev: any) => ({
        ...prev,
        [type]: values
      }));
    }
    
    togglePopover(type, false);
  };

  // 处理日期选择
  const handleDateChange = (dates: any) => {
    if (currentDateFieldType === 'predict_time_range' && dates && dates[0]) {
      const minDate = getPredictTimeMinDate();
      if (minDate) {
        const selectedStart = dates[0];
        if (!selectedStart.isSame(minDate, 'day')) {
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

  // 确认日期选择（包含预测时间范围的特殊处理）
  const handleDateConfirm = () => {
    if (selectedDateRange[0] && selectedDateRange[1]) {
      let startDate: dayjs.Dayjs = selectedDateRange[0];
      let endDate: dayjs.Dayjs = selectedDateRange[1];
      
      // 根据不同的日期类型调整起始日期（预测场景的特殊处理）
      switch (datePickerType) {
        case 'month':
          if (currentDateFieldType === 'predict_time_range') {
            const minDate = getPredictTimeMinDate();
            if (minDate) {
              const selectedStartMonth = startDate.startOf('month');
              const selectedEndMonth = endDate.endOf('month');
              const daysDiff = selectedEndMonth.diff(selectedStartMonth, 'day') + 1;
              startDate = minDate;
              endDate = minDate.add(daysDiff - 1, 'day');
            } else {
              startDate = startDate.startOf('month');
              endDate = endDate.endOf('month');
            }
          } else {
            startDate = startDate.startOf('month');
            endDate = endDate.endOf('month');
          }
          break;
        case 'quarter':
          if (currentDateFieldType === 'predict_time_range') {
            const minDate = getPredictTimeMinDate();
            if (minDate) {
              const startMonth = startDate.month();
              const endMonth = endDate.month();
              const startQuarterFirstMonth = Math.floor(startMonth / 3) * 3;
              const endQuarterFirstMonth = Math.floor(endMonth / 3) * 3;
              const endQuarterLastMonth = endQuarterFirstMonth + 2;
              const selectedStartQuarter = startDate.month(startQuarterFirstMonth).startOf('month');
              const selectedEndQuarter = endDate.month(endQuarterLastMonth).endOf('month');
              const daysDiff = selectedEndQuarter.diff(selectedStartQuarter, 'day') + 1;
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
          if (currentDateFieldType === 'predict_time_range') {
            const minDate = getPredictTimeMinDate();
            if (minDate) {
              const selectedStartYear = startDate.startOf('year');
              const selectedEndYear = endDate.endOf('year');
              const daysDiff = selectedEndYear.diff(selectedStartYear, 'day') + 1;
              startDate = minDate;
              endDate = minDate.add(daysDiff - 1, 'day');
            } else {
              startDate = startDate.startOf('year');
              endDate = endDate.endOf('year');
            }
          } else {
            startDate = startDate.startOf('year');
            endDate = endDate.endOf('year');
          }
          break;
        case 'week':
          if (currentDateFieldType === 'predict_time_range') {
            const minDate = getPredictTimeMinDate();
            if (minDate) {
              const selectedStartWeek = startDate.startOf('isoWeek');
              const selectedEndWeek = endDate.endOf('isoWeek');
              const daysDiff = selectedEndWeek.diff(selectedStartWeek, 'day') + 1;
              startDate = minDate;
              endDate = minDate.add(daysDiff - 1, 'day');
            } else {
              startDate = startDate.startOf('isoWeek');
              endDate = endDate.endOf('isoWeek');
            }
          } else {
            startDate = startDate.startOf('isoWeek');
            endDate = endDate.endOf('isoWeek');
          }
          break;
        case 'date':
        default:
          break;
      }
      
      const startDateStr = startDate.format('YYYY-MM-DD');
      const endDateStr = endDate.format('YYYY-MM-DD');
      
      const recommendData = recommend?.[currentDateFieldType]?.[0] || {};
      const field = recommendData.field || "";
      
      const needGranularity = chatMode === 'chat_with_analysis' || chatMode === 'chat_with_predict';
      
      const granularityMap: { [key: string]: string } = {
        'date': '年月日',
        'week': '年周',
        'month': '年月',
        'quarter': '年季度',
        'year': '年'
      };
      const granularity = granularityMap[datePickerType] || '年月日';
      
      // 计算periods（如果是predict_time_range）
      let periods = 0;
      if (currentDateFieldType === 'predict_time_range') {
        switch (granularity) {
          case '年月日':
            periods = endDate.diff(startDate, 'day') + 1;
            break;
          case '年周':
            periods = Math.ceil(endDate.diff(startDate, 'day') / 7) + 1;
            break;
          case '年月':
            const startYear = startDate.year();
            const endYear = endDate.year();
            const startMonth = startDate.month();
            const endMonth = endDate.month();
            periods = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
            break;
          case '年季度':
            const startQuarter = Math.floor(startDate.month() / 3);
            const endQuarter = Math.floor(endDate.month() / 3);
            periods = (endDate.year() - startDate.year()) * 4 + (endQuarter - startQuarter) + 1;
            break;
          case '年':
            periods = endDate.year() - startDate.year() + 1;
            break;
          default:
            periods = endDate.diff(startDate, 'day') + 1;
        }
      }
      
      const startValue = convertDateToGranularityValue(startDateStr, granularity);
      const endValue = convertDateToGranularityValue(endDateStr, granularity);
      
      const startText = formatTimeRangeValue(startValue, granularity);
      const endText = formatTimeRangeValue(endValue, granularity);
      
      const dateRange: any = {
        text: currentDateFieldType === 'predict_time_range' 
          ? `${startText}到${endText}` 
          : '',
        field: field,
        operator: 'range',
        value: `${startValue},${endValue}`
      };
      
      if (needGranularity) {
        dateRange.granularity = granularity;
      }
      
      if (currentDateFieldType === 'predict_time_range') {
        dateRange.time_series_continuous = true;
        dateRange.periods = periods;
      }
      
      setRecommendSelected((prev: any) => ({
        ...prev,
        [currentDateFieldType]: true
      }));
      
      setFormData((prev: any) => ({
        ...prev,
        [currentDateFieldType]: [dateRange]
      }));
    }
    setDatePickerVisible(false);
  };

  // 构建查询语句
  const buildQueryString = () => {
    const template = getTemplateText();
    
    if (!template || !template.parts) {
      return '查询数据';
    }

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

    const getFieldText = (fieldType: string) => {
      if (fieldType === 'qualifier') {
        const allQualifiers = getQualifiersFromIndicators();
        return allQualifiers.map(item => formatItemWithOperator(item, '、')).filter((t: string) => t).join('、');
      }
      
      const fieldData = formData[fieldType];
      if (!fieldData || fieldData.length === 0) return '';
      
      const separator = fieldType === 'filters' ? '且' : '、';
      return fieldData.map((item: any) => formatDisplayText(item, fieldType, chatMode)).filter((t: string) => t).join(separator);
    };

    const hasFieldValue = (fieldType: string) => {
      if (fieldType === 'qualifier') {
        return getQualifiersFromIndicators().length > 0;
      }
      return formData[fieldType]?.length > 0;
    };

    let queryString = '';
    const hasAnyValue = template.parts.some((part: any) => hasFieldValue(part.field));
    
    if (hasAnyValue) {
      if (template.start) {
        queryString += template.start;
      }

      template.parts.forEach((part: any) => {
        const fieldText = getFieldText(part.field);
        if (fieldText) {
          if (part.before) {
            queryString += part.before;
          }
          queryString += fieldText;
          if (part.after && !fieldText.includes(part.after)) {
            queryString += part.after;
          }
        }
      });

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
    
    const template = getTemplateText();
    const templateFields = template.parts?.map((part: any) => part.field) || [];
    
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
    
    const queryString = buildQueryString();
    
    // 在预测场景下，base_indicators 提交时为空数组
    const baseIndicatorsValue: any[] = [];
    
    const intentClarifyData = {
      data: {
        agent_label: "intent_clarify",
        extra: questionData.extra || {},
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

    console.log('=== 预测分析场景 - 点击完成，最终拼接数据 ===');
    console.log('📋 查询语句:', queryString);
    console.log('📦 完整参数 ICparameter:', ICparameter, null, 2);
    console.log('🔧 意图澄清数据 intentClarifyData:', intentClarifyData, null, 2);
    console.log('=== 数据打印结束 ===');
    
    setTimeout(() => {
      setSubmitting(false);
      onComplete(ICparameter);
    }, 500);
  };

  // 根据 query_mode 生成问题模板
  const getTemplateText = () => {
    type TemplatePart = { 
      field: string; 
      before?: string;
      after?: string;
    };
    const templates: { [key: string]: { start?: string; parts: TemplatePart[]; end?: string } } = {
      // 预测 - 时间序列预测
      predict_time_series: {
        start: '请查询',
        parts: [
          { field: 'time_range', after: '，' },
          { field: 'filters', after: '条件下，' },
          { field: 'base_indicators', after: '，预测' },
          { field: 'predict_time_range' },
          { field: 'target_indicators' }
        ],
        end: '。'
      }
    };

    return templates[queryMode] || { parts: [] };
  };

  // 获取字段显示数据
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
    
    let confirmData = confirm?.[type];
    if (type === 'base_indicators' && queryMode === 'predict_time_series') {
      confirmData = confirm?.['target_indicators'];
    }
    const hasConfirmCandidate = Array.isArray(confirmData) && confirmData.some((item: any) => 
      item.candidate && Array.isArray(item.candidate) && item.candidate.length > 0
    );
    
    const isRecommendSelected = recommendSelected[type];
    
    const displayData = getFieldDisplayData(type);
    const hasConfirm = hasConfirmCandidate 
      ? isRecommendSelected
      : displayData.length > 0;
    
    let recommendData = recommend?.[type];
    if (type === 'base_indicators' && queryMode === 'predict_time_series') {
      recommendData = recommend?.['target_indicators'];
    }
    const hasRecommend = Array.isArray(recommendData) && recommendData.length > 0;
    
    if (hasConfirmCandidate) {
      recommendData = confirmData;
    }
    
    const multiple = !['time_range', 'candidate', 'predict_time_range'].includes(type);
    
    const shouldShowPopover = (hasRecommend || hasConfirmCandidate) && !isQualifier;
    
    const popoverContent = shouldShowPopover ? (
      <div className="w-80">
        <SelectionContent
          options={recommendData}
          selectedValues={formData[type] || []}
          tempSelected={tempSelections[type] || []}
          onToggle={(option, isCandidate) => handleToggle(type, option, multiple, isCandidate)}
        />
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
        {hasConfirm && (
          isQualifier ? (
            <div className="flex flex-wrap gap-2">
              {displayData.map((item: any, index: number) => (
                <span 
                  key={index} 
                  className="px-3 py-1 text-base font-medium whitespace-nowrap"
                >
                  {formatDisplayText(item, type, chatMode)}
                </span>
              ))}
            </div>
          ) : (
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
              <div className="flex flex-wrap items-center gap-y-2"
                onClick={(e) => {
                  const placement = detectPlacement(e);
                  setPopoverPlacement(prev => ({ ...prev, [type]: placement }));
                }}
              >
                {displayData.map((item: any, index: number) => {
                  let displayItem = item;
                  if ((type === 'target_indicators' || type === 'base_indicators') && !item.function) {
                    let confirmData = confirm?.[type];
                    if (type === 'base_indicators' && queryMode === 'predict_time_series') {
                      confirmData = confirm?.['target_indicators'];
                    }
                    if (Array.isArray(confirmData)) {
                      const parent = confirmData.find((parent: any) => 
                        parent.candidate && Array.isArray(parent.candidate) && 
                        parent.candidate.some((c: any) => c.field === item.field || c.text === item.text)
                      );
                      if (parent && parent.function) {
                        if (parent.function !== 'DEFAULT' && parent.function !== 'default') {
                          displayItem = { ...item, function: parent.function };
                        }
                      }
                    }
                  }
                  
                  const isIndicatorField = type === 'target_indicators' || type === 'base_indicators';
                  const hasQualifier = isIndicatorField && displayItem.qualifier && Array.isArray(displayItem.qualifier) && displayItem.qualifier.length > 0;
                  const isLastItem = index === displayData.length - 1;
                  
                  return (
                    <React.Fragment key={index}>
                      {hasQualifier && displayItem.qualifier.map((q: any, qIndex: number) => (
                        <React.Fragment key={`${index}-q-${qIndex}`}>
                          <span 
                            className="px-3 py-1 bg-gray-50 text-gray-700 rounded-md border border-gray-300 cursor-pointer hover:bg-gray-100 transition-colors text-base font-medium whitespace-nowrap"
                          >
                            {formatDisplayText(q, 'qualifier', chatMode)}
                          </span>
                          {qIndex < displayItem.qualifier.length - 1 && <span className="text-gray-700 text-base font-medium mx-1 inline-flex items-center">、</span>}
                        </React.Fragment>
                      ))}
                      {hasQualifier && <span className="text-gray-700 text-base font-medium mx-1 inline-flex items-center">的</span>}
                      <span 
                        className="px-3 py-1 bg-gray-50 text-gray-700 rounded-md border border-gray-300 cursor-pointer hover:bg-gray-100 transition-colors text-base font-medium whitespace-nowrap"
                      >
                        {formatDisplayText(displayItem, type, chatMode, isIndicatorField)}
                      </span>
                      {!isLastItem && <span className="text-gray-700 text-base font-medium mx-1 inline-flex items-center">、</span>}
                    </React.Fragment>
                  );
                })}
              </div>
            </Popover>
          )
        )}
        
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

  // 字段标签映射
  const getFieldLabel = (key: string, forRecommendText: boolean = false): string => {
    const labels: { [key: string]: string } = {
      time_range: forRecommendText ? '查询时间范围' : '时间范围',
      dimensions: '选择维度',
      target_indicators: '预测指标',
      filters: '过滤条件',
      base_indicators: '基线指标',
      predict_time_range: '预测时间范围'
    };
    return labels[key] || key;
  };

  // 获取推荐字段的显示文本
  const getRecommendFieldsText = (): string[] => {
    const fields = new Set<string>();
    
    if (recommend) {
      Object.keys(recommend).forEach(key => {
        const value = recommend[key];
        const hasValue = Array.isArray(value) && value.length > 0;
        if (value && hasValue) {
          fields.add(key);
        }
      });
    }
    
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

  const recommendFields = getRecommendFieldsText();

  return (
    <div className="intent-clarify-predict-mode bg-white pt-6 pb-6">
      {/* 顶部提示信息 */}
      <div className="mb-10">
        <div className="text-base font-medium text-gray-700 leading-relaxed flex-1">
          🎯 嗨！系统识别您已启用 
          <span className="text-purple-700 font-bold text-lg mx-1">「预测分析」</span>
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

      {/* 选择区域 */}
      <div className="mb-8">
        {(() => {
          const template = getTemplateText();

          const checkFieldExists = (fieldType: string) => {
            if (fieldType === 'qualifier') {
              const hasSelectedQualifier = getFieldDisplayData(fieldType).length > 0;
              if (hasSelectedQualifier) return true;
              
              const allIndicators = [...(recommend?.target_indicators || []), ...(recommend?.base_indicators || [])];
              return allIndicators.some((indicator: any) => 
                indicator.qualifier && Array.isArray(indicator.qualifier) && indicator.qualifier.length > 0
              );
            }
            
            if (fieldType === 'base_indicators' && queryMode === 'predict_time_series') {
              const hasConfirmTarget = Array.isArray(confirm?.['target_indicators']) && confirm['target_indicators'].length > 0;
              const hasRecommend = Array.isArray(recommend?.['target_indicators']) && recommend['target_indicators'].length > 0;
              const hasTargetCandidate = Array.isArray(confirm?.['target_indicators']) && confirm['target_indicators'].some((item: any) => 
                item.candidate && Array.isArray(item.candidate) && item.candidate.length > 0
              );
              return hasConfirmTarget || hasRecommend || hasTargetCandidate;
            }
            
            const hasConfirm = Array.isArray(confirm?.[fieldType]) && confirm[fieldType].length > 0;
            const hasRecommend = Array.isArray(recommend?.[fieldType]) && recommend[fieldType].length > 0;
            
            const hasConfirmCandidate = Array.isArray(confirm?.[fieldType]) && confirm[fieldType].some((item: any) => 
              item.candidate && Array.isArray(item.candidate) && item.candidate.length > 0
            );
            
            return hasConfirm || hasRecommend || hasConfirmCandidate;
          };

          const hasAnyField = template.parts?.some((part: any) => {
            return checkFieldExists(part.field);
          });

          return (
            <div className="flex items-center flex-wrap gap-x-2 gap-y-3 text-base leading-relaxed">
              {hasAnyField && template.start && (
                <span className="text-gray-700 font-medium">{template.start}</span>
              )}
              
              {template.parts?.map((part: any, index: number) => {
                const fieldType = part.field;
                const hasField = checkFieldExists(fieldType);
                
                if (!hasField) return null;
                
                const hasNextField = template.parts?.slice(index + 1).some((nextPart: any) => {
                  return checkFieldExists(nextPart.field);
                });
                
                return (
                  <React.Fragment key={index}>
                    {part.before && <span className="text-gray-700 font-medium">{part.before}</span>}
                    {renderSelectionItem(getFieldLabel(fieldType), fieldType)}
                    {part.after && hasNextField && <span className="text-gray-700 font-medium">{part.after}</span>}
                  </React.Fragment>
                );
              })}
              
              {hasAnyField && template.end && (
                <span className="text-gray-700 font-medium">{template.end}</span>
              )}
              
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
                  style={{ minWidth: '32px', padding: 0, outline: 'none', boxShadow: 'none' }}
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
                if (currentDateFieldType !== 'predict_time_range') {
                  return false;
                }
                
                const minDate = getPredictTimeMinDate();
                if (!minDate) {
                  return false;
                }
                
                return current && current.isBefore(minDate, 'day');
              }}
            />
          </div>

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

export default IntentClarifyPredictMode;

