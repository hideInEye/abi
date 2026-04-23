import React, { useState, useEffect } from 'react';
import { Button, Modal, DatePicker, Popover, Input } from 'antd';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import SvgIcon from '../../../components/SvgIcon';
import {
  DATE_FORMAT_MAP,
  formatItemWithOperator,
  formatDisplayText,
  convertDateToGranularityValue,
  OPERATOR_MAP,
  formatTimeRangeValue,
  FUNCTION_MAP,
  renderFieldWithTooltip
} from './intentClarifyUtils';

// 启用 ISO 周插件（周一作为一周的开始）
dayjs.extend(isoWeek);

// 归因场景专属：时间范围显示格式化（选择后显示 text + operator + value）
const formatAnalysisTimeRange = (item: any): string => {
  if (!item.text || !item.operator || item.value === undefined) {
    return item.text || '';
  }
  
  const text = item.text;
  const operatorText = OPERATOR_MAP[item.operator] || item.operator;
  const formattedValue = formatTimeRangeValue(item.value.toString(), item.granularity);
  
  return `${text}${operatorText}${formattedValue}`;
};

// 归因场景专属：SelectionContent 组件（弹框中显示 text + value）
const AnalysisSelectionContent: React.FC<{
  options: any[];
  selectedValues: any[];
  tempSelected: any[];
  onToggle: (option: any, isCandidate?: boolean) => void;
  fieldType?: string;
}> = ({ options, tempSelected, onToggle, fieldType }) => {
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
                  const displayFunction = candidate.function || option.function;
                  const displayText = candidate.text;

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
                        <span className="text-sm">{displayText}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {displayFunction && (
                          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded font-medium border border-blue-200">
                            {FUNCTION_MAP[displayFunction] || displayFunction}
                          </span>
                        )}
                        {renderFieldWithTooltip(candidate.field)}
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
          
          // 时间范围字段特殊处理：只显示 value（格式化后的）
          let displayText = option.text;
          if (fieldType === 'time_range' && option.value && option.granularity) {
            const formattedValue = formatTimeRangeValue(option.value, option.granularity);
            // 弹框中只显示格式化后的value（如："2024年"）
            displayText = formattedValue;
          }
          
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
                <span className="text-sm font-medium">{displayText}</span>
              </div>
              <div className="flex items-center gap-2">
                {option.function && (
                  <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded font-medium border border-blue-200">
                    {FUNCTION_MAP[option.function] || option.function}
                  </span>
                )}
                {renderFieldWithTooltip(option.field)}
              </div>
            </div>
          );
        }
      })}
    </div>
  );
};

// 组件属性类型定义
interface IntentClarifyAnalysisModeProps {
  questionData: any; // 意图澄清数据
  onComplete: (ICparameter: any) => void; // 完成回调
}

// 主组件 - 归因分析场景
const IntentClarifyAnalysisMode: React.FC<IntentClarifyAnalysisModeProps> = ({ questionData, onComplete }) => {
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
      console.log('=== 归因分析场景 - 问题澄清数据开始 ===');
      console.log('📦 完整数据 questionData:', JSON.stringify(questionData, null, 2));
      console.log('🎯 chat_mode:', chatMode);
      console.log('🎯 query_mode:', queryMode);
      console.log('=== 归因分析场景 - 问题澄清数据结束 ===');
      
      const initialData = {
        chat_mode: chatMode,
        query_mode: queryMode,
        time_range: confirm?.time_range || [],
        dimensions: confirm?.dimensions || [],
        target_indicators: confirm?.target_indicators || [],
        filters: confirm?.filters || [],
        base_indicators: confirm?.base_indicators || [],
        indicator_status: confirm?.indicator_status || ''
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
    setPopoverState(prev => ({ ...prev, [type]: visible }));
    
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
        setTempSelections(prev => ({ ...prev, [type]: formData[type] || [] }));
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
  const openDatePicker = () => {
    // 重置日期选择器状态
    setSelectedDateRange([null, null]);
    setDatePickerType('date');
    setDatePickerVisible(true);
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
      
      // 直接更新字段值，保留指标内部的 qualifier
      setFormData((prev: any) => ({
        ...prev,
        [type]: values
      }));
    }
    
    togglePopover(type, false);
  };

  // 处理日期选择
  const handleDateChange = (dates: any) => {
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
          startDate = startDate.startOf('month');
          endDate = endDate.endOf('month');
          break;
        case 'quarter':
          const startMonth = startDate.month();
          const endMonth = endDate.month();
          const startQuarterFirstMonth = Math.floor(startMonth / 3) * 3;
          const endQuarterFirstMonth = Math.floor(endMonth / 3) * 3;
          const endQuarterLastMonth = endQuarterFirstMonth + 2;
          startDate = startDate.month(startQuarterFirstMonth).startOf('month');
          endDate = endDate.month(endQuarterLastMonth).endOf('month');
          break;
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
      
      const startDateStr = startDate.format('YYYY-MM-DD');
      const endDateStr = endDate.format('YYYY-MM-DD');
      
      // 从后端推荐数据中获取 field 和 operator
      const recommendData = recommend?.time_range?.[0] || {};
      const field = recommendData.field || "";
      
      // 根据datePickerType确定granularity的值
      const granularityMap: { [key: string]: string } = {
        'date': '年月日',
        'week': '年周',
        'month': '年月',
        'quarter': '年季度',
        'year': '年'
      };
      const granularity = granularityMap[datePickerType] || '年月日';
      
      // 将日期转换为对应粒度的值格式
      const startValue = convertDateToGranularityValue(startDateStr, granularity);
      const endValue = convertDateToGranularityValue(endDateStr, granularity);
      
      // 构建dateRange对象
      // 自定义日期时，text字段必须为空，这样formatDisplayText才会显示格式化后的具体日期值
      const dateRange: any = {
        text: '',  // 自定义日期时设置为空字符串
        field: field,
        operator: 'range',
        value: `${startValue},${endValue}`,
        granularity: granularity
      };
      
      // 标记字段已通过recommend选择
      setRecommendSelected((prev: any) => ({
        ...prev,
        time_range: true
      }));
      
      // 更新字段的数据
      setFormData((prev: any) => ({
        ...prev,
        time_range: [dateRange]
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
      
      // time_range 特殊处理：使用归因专属格式化
      if (fieldType === 'time_range') {
        const fieldData = formData[fieldType];
        if (!fieldData || fieldData.length === 0) return '';
        return fieldData.map((item: any) => formatAnalysisTimeRange(item)).filter((t: string) => t).join('、');
      }
      
      // 其他字段统一处理
      const fieldData = formData[fieldType];
      if (!fieldData || fieldData.length === 0) return '';
      
      // filters字段使用'且'连接，其他字段使用'、'连接
      const separator = fieldType === 'filters' ? '且' : '、';
      return fieldData.map((item: any) => formatDisplayText(item, fieldType, chatMode)).filter((t: string) => t).join(separator);
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
          // 如果有after文字，并且fieldText中不包含after的内容，才添加它
          if (part.after && !fieldText.includes(part.after)) {
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
      const isIndicatorStatus = field === 'indicator_status';
      const hasRecommend = isIndicatorStatus
        ? (typeof recommend[field] === 'string' && recommend[field].trim() !== '')
        : (recommend[field] && recommend[field].length > 0);
      const hasSelection = isIndicatorStatus
        ? !!formData[field]
        : (formData[field] && formData[field].length > 0);
      
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
    
    // 构建符合后端格式的意图澄清数据
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
              base_indicators: formData.base_indicators || [],
              indicator_status: formData.indicator_status || ''
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
      structured_data: formData,
      extra: intentClarifyData
    };

    // 打印最终拼接的数据
    console.log('=== 归因分析场景 - 点击完成，最终拼接数据 ===');
    console.log('📋 查询语句:', queryString);
    console.log('📦 完整参数 ICparameter:', ICparameter, null, 2);
    console.log('🔧 意图澄清数据 intentClarifyData:', intentClarifyData, null, 2);
    console.log('=== 数据打印结束 ===');
    setTimeout(() => {
      setSubmitting(false);
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
      // 归因 - 单独指标归因
      analysis_single_indicator: {
        start: '请分析',
        parts: [
          { field: 'time_range', after: '，' },
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
          { field: 'time_range', after: '，' },
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
          { field: 'time_range', after: '，' },
          { field: 'filters', after: '条件下，' },
          { field: 'base_indicators', after: '比' },
          { field: 'target_indicators' },
          { field: 'indicator_status' }
        ],
        end: '的原因。'
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
    let confirmData = confirm?.[type];
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
    let recommendData = recommend?.[type];
    const hasRecommend = isIndicatorStatus
      ? (typeof recommendData === 'string' && recommendData.trim() !== '')
      : (Array.isArray(recommendData) && recommendData.length > 0);
    
    // 如果confirm中有candidate，优先使用confirm中的数据作为选项
    if (hasConfirmCandidate && !isIndicatorStatus) {
      recommendData = confirmData;
    }
    
    const multiple = !['time_range', 'indicator_status', 'candidate'].includes(type);
    
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
          <AnalysisSelectionContent
            options={recommendData}
            selectedValues={formData[type] || []}
            tempSelected={tempSelections[type] || []}
            onToggle={(option, isCandidate) => handleToggle(type, option, multiple, isCandidate)}
            fieldType={type}
          />
        )}
        <div className="flex justify-end gap-2 mt-3 pt-3 border-t">
          <Button size="small" onClick={() => togglePopover(type, false)}>取消</Button>
          {isTimeRange && (
            <Button size="small" onClick={() => {
              togglePopover(type, false);
              openDatePicker();
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
              <div className="flex flex-wrap items-center gap-y-2"
                onClick={(e) => {
                  const placement = detectPlacement(e);
                  setPopoverPlacement(prev => ({ ...prev, [type]: placement }));
                }}
              >
                {displayData.map((item: any, index: number) => {
                  // 如果candidate没有function，从confirm的父级获取function
                  let displayItem = item;
                  if ((type === 'target_indicators' || type === 'base_indicators') && !item.function) {
                    // 在confirm中查找父级的function
                    let confirmData = confirm?.[type];
                    if (Array.isArray(confirmData)) {
                      const parent = confirmData.find((parent: any) => 
                        parent.candidate && Array.isArray(parent.candidate) && 
                        parent.candidate.some((c: any) => c.field === item.field || c.text === item.text)
                      );
                      if (parent && parent.function) {
                        // 只有当function不是DEFAULT时才继承到displayItem
                        if (parent.function !== 'DEFAULT' && parent.function !== 'default') {
                          displayItem = { ...item, function: parent.function };
                        }
                      }
                    }
                  }
                  
                  const isIndicatorField = type === 'target_indicators' || type === 'base_indicators';
                  const hasQualifier = isIndicatorField && displayItem.qualifier && Array.isArray(displayItem.qualifier) && displayItem.qualifier.length > 0;
                  const isLastItem = index === displayData.length - 1;
                  
                  // 时间范围字段使用归因专属格式化
                  let itemDisplayText = '';
                  if (type === 'time_range') {
                    itemDisplayText = formatAnalysisTimeRange(displayItem);
                  } else {
                    itemDisplayText = formatDisplayText(displayItem, type, chatMode, isIndicatorField);
                  }
                  
                  return (
                    <React.Fragment key={index}>
                      {/* 如果是指标字段且有qualifier，先渲染qualifier按钮 */}
                      {hasQualifier && displayItem.qualifier.map((q: any, qIndex: number) => (
                        <React.Fragment key={`${index}-q-${qIndex}`}>
                          <span 
                            className="px-3 py-1 bg-gray-50 text-gray-700 rounded-md border border-gray-300 cursor-pointer hover:bg-gray-100 transition-colors text-base font-medium whitespace-nowrap"
                          >
                            {formatDisplayText(q, 'qualifier', chatMode)}
                          </span>
                          {/* qualifier内部多个项之间的分隔符 */}
                          {qIndex < displayItem.qualifier.length - 1 && <span className="text-gray-700 text-base font-medium mx-1 inline-flex items-center">、</span>}
                        </React.Fragment>
                      ))}
                      {/* qualifier和指标之间的连接符 */}
                      {hasQualifier && <span className="text-gray-700 text-base font-medium mx-1 inline-flex items-center">的</span>}
                      {/* 渲染指标按钮（排除qualifier） */}
                      <span 
                        className="px-3 py-1 bg-gray-50 text-gray-700 rounded-md border border-gray-300 cursor-pointer hover:bg-gray-100 transition-colors text-base font-medium whitespace-nowrap"
                      >
                        {itemDisplayText}
                      </span>
                      {/* 项之间的分隔符 */}
                      {!isLastItem && <span className="text-gray-700 text-base font-medium mx-1 inline-flex items-center">、</span>}
                    </React.Fragment>
                  );
                })}
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

  // 字段标签映射（用于顶部提示）
  const getFieldLabel = (key: string, forRecommendText: boolean = false): string => {
    const labels: { [key: string]: string } = {
      time_range: forRecommendText ? '查询时间范围' : '时间范围',
      dimensions: '选择维度',
      target_indicators: '归因指标',
      filters: '过滤条件',
      base_indicators: '基线指标',
      indicator_status: '指标异动描述'
    };
    return labels[key] || key;
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

  const recommendFields = getRecommendFieldsText();

  return (
    <div className="intent-clarify-analysis-mode bg-white pt-6 pb-6">
      {/* 顶部提示信息 */}
      <div className="mb-10">
        <div className="text-base font-medium text-gray-700 leading-relaxed flex-1">
          🎯 嗨！系统识别您已启用 
          <span className="text-purple-700 font-bold text-lg mx-1">「归因分析」</span>
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
                  style={{ minWidth: '32px', padding: 0, outline: 'none', boxShadow: 'none' }}
                />
              )}
            </div>
          );
        })()}
      </div>

      {/* 日期选择器弹框 */}
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

export default IntentClarifyAnalysisMode;

