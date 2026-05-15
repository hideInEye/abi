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
  FUNCTION_MAP,
  OPERATOR_MAP,
  convertDateToGranularityValue
} from './intentClarifyUtils';

// 启用 ISO 周插件（周一作为一周的开始）
dayjs.extend(isoWeek);

// 组件属性类型定义
interface IntentClarifyQueryModeProps {
  questionData: any; // 意图澄清数据
  onComplete: (ICparameter: any) => void; // 完成回调
}

// 主组件 - 问数场景
const IntentClarifyQueryMode: React.FC<IntentClarifyQueryModeProps> = ({ questionData, onComplete }) => {
  const [formData, setFormData] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);
  const [popoverState, setPopoverState] = useState<{[key: string]: boolean}>({});
  const [tempSelections, setTempSelections] = useState<{[key: string]: any[]}>({});
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
      console.log('=== 问数场景 - 问题澄清数据开始 ===');
      console.log('📦 完整数据 questionData:', JSON.stringify(questionData, null, 2));
      console.log('🎯 chat_mode:', chatMode);
      console.log('🎯 query_mode:', queryMode);
      console.log('=== 问数场景 - 问题澄清数据结束 ===');
      
      const initialData = {
        chat_mode: chatMode,
        query_mode: queryMode,
        time_range: confirm?.time_range || [],
        dimensions: confirm?.dimensions || [],
        target_indicators: confirm?.target_indicators || [],
        filters: confirm?.filters || []
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
      // 初始化临时选择为当前已选择的值
      setTempSelections(prev => ({ ...prev, [type]: formData[type] || [] }));
    }
  };

  // 处理选项切换
  const handleToggle = (type: string, option: any, multiple: boolean, isCandidate: boolean = false) => {
    setTempSelections(prev => {
      const current = prev[type] || [];
      // 如果是 candidate 项，强制使用单选模式
      const shouldUseSingleSelection = !multiple || isCandidate;
      
      if (shouldUseSingleSelection) {
        // 当 time_range 的 candidate 项被选择时，需要将其与父项合并，以保留 field 等信息
        if (isCandidate && type === 'time_range') {
          const confirmItems = confirm?.[type] || [];
          let parentItem = null;
          
          // 找到包含该 candidate 的父项
          for (const item of confirmItems) {
            if (item.candidate?.some((c: any) => c.text === option.text && c.value === option.value)) {
              parentItem = item;
              break;
            }
          }
          
          if (parentItem) {
            // 合并父项和 candidate 的属性，并移除 candidate 列表
            const newItem = { ...parentItem, ...option };
            delete newItem.candidate;
            return { ...prev, [type]: [newItem] };
          }
        }
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
      const selectedIndicators = [...(formData.target_indicators || [])];
      const allQualifiers: any[] = [];
      selectedIndicators.forEach((indicator: any) => {
        if (indicator.qualifier && Array.isArray(indicator.qualifier)) {
          allQualifiers.push(...indicator.qualifier);
        }
      });
      return allQualifiers;
    };

    // 获取所有指标中的group_filters
    const getGroupFiltersFromIndicators = () => {
      const selectedIndicators = [...(formData.target_indicators || [])];
      const allGroupFilters: any[] = [];
      selectedIndicators.forEach((indicator: any) => {
        if (indicator.group_filters && Array.isArray(indicator.group_filters) && indicator.group_filters.length > 0) {
          // 将同一指标的多个group_filters合并
          allGroupFilters.push({
            text: indicator.text,
            filters: indicator.group_filters,
            isGroupedFilters: true
          });
        }
      });
      return allGroupFilters;
    };

    // 获取字段的值文本
    const getFieldText = (fieldType: string) => {
      // qualifier 特殊处理：从指标中提取
      if (fieldType === 'qualifier') {
        const allQualifiers = getQualifiersFromIndicators();
        return allQualifiers.map(item => formatItemWithOperator(item, '、')).filter((t: string) => t).join('、');
      }
      
      // group_filters 特殊处理：从指标中提取
      if (fieldType === 'group_filters') {
        const allGroupFilters = getGroupFiltersFromIndicators();
        return allGroupFilters.map(item => {
          if (item.isGroupedFilters && item.filters && Array.isArray(item.filters)) {
            // 将同一指标的多个条件用"且"连接
            const conditionsText = item.filters.map((filter: any) => {
              const operatorText = OPERATOR_MAP[filter.operator] || filter.operator;
              const valueText = filter.value ? filter.value.toString() : '';
              return `${operatorText}${valueText}`;
            }).join('且');
            return `${item.text}${conditionsText}`;
          }
          return formatItemWithOperator(item, '、');
        }).filter((t: string) => t).join('、');
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
      if (fieldType === 'group_filters') {
        return getGroupFiltersFromIndicators().length > 0;
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
              filters: formData.filters || []
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
    console.log('=== 问数场景 - 点击完成，最终拼接数据 ===');
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
      // 问数 - 明细查询
      query_detail: {
        start: '请查询',
        parts: [
          { field: 'time_range', after: '，' },
          { field: 'filters', after: '条件下，' },
          { field: 'dimensions', after: '维度、' },
          { field: 'target_indicators', after:'指标' }
        ],
        end: '的明细数据。'
      },
      // 问数 - 聚合查询
      query_aggregation: {
        start: '请统计',
        parts: [
          { field: 'time_range', after: '范围内，' },
          { field: 'filters', after: '条件下，' },
          { before: '根据', field: 'dimensions' ,after: '分组，'},
          { before: '计算', field: 'target_indicators'},
          { before: '，筛选出', field: 'group_filters', after: '的分组' }
        ],
        end: '数据。'
      },
      // Excel分析 - 明细查询
      excel_detail: {
        start: '请查询',
        parts: [
          { field: 'time_range', after: '，' },
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
          { field: 'time_range', after: '，' },
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
          { field: 'time_range', after: '，' },
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
          { field: 'time_range', after: '，' },
          { field: 'filters', after: '条件下，不同' },
          { field: 'dimensions' },
          { field: 'target_indicators' }
        ],
        end: '数据。'
      }
    };

    return templates[queryMode] || { parts: [] };
  };

  // 获取字段显示数据（qualifier和group_filters特殊处理）
  const getFieldDisplayData = (type: string) => {
    if (type === 'qualifier') {
      const selectedIndicators = [...(formData.target_indicators || [])];
      const qualifierData: any[] = [];
      selectedIndicators.forEach((indicator: any) => {
        if (indicator.qualifier && Array.isArray(indicator.qualifier)) {
          qualifierData.push(...indicator.qualifier);
        }
      });
      return qualifierData;
    }
    if (type === 'group_filters') {
      const selectedIndicators = [...(formData.target_indicators || [])];
      const groupFiltersData: any[] = [];
      selectedIndicators.forEach((indicator: any) => {
        if (indicator.group_filters && Array.isArray(indicator.group_filters) && indicator.group_filters.length > 0) {
          // 将同一指标的多个group_filters合并成一个对象
          groupFiltersData.push({
            text: indicator.text,
            filters: indicator.group_filters, // 保留完整的filters数组
            isGroupedFilters: true // 标记这是一个合并的filters组
          });
        }
      });
      return groupFiltersData;
    }
    return formData[type] || [];
  };

  // 渲染选择项
  const renderSelectionItem = (label: string, type: string) => {
    const isQualifier = type === 'qualifier';
    const isGroupFilters = type === 'group_filters';
    const isTimeRange = type === 'time_range';
    
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
      : displayData.length > 0;  // 没有candidate时，formData有值就算已确认
    
    // 检查是否有推荐数据
    let recommendData = recommend?.[type];
    const hasRecommend = Array.isArray(recommendData) && recommendData.length > 0;
    
    // 如果confirm中有candidate，优先使用confirm中的数据作为选项
    if (hasConfirmCandidate) {
      recommendData = confirmData;
    }
    
    const multiple = !['time_range'].includes(type);
    
    // 判断是否应该显示选择弹框：有推荐数据或者confirm中有candidate
    const shouldShowPopover = (hasRecommend || hasConfirmCandidate) && !isQualifier && !isGroupFilters;
    
    // Popover 内容
    const popoverContent = shouldShowPopover ? (
      <div className="w-80">
        {/* 选择列表 */}
        <SelectionContent
          options={recommendData}
          selectedValues={formData[type] || []}
          tempSelected={tempSelections[type] || []}
          onToggle={(option, isCandidate) => handleToggle(type, option, multiple, isCandidate)}
          fieldType={type}
        />
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
          ) : isGroupFilters ? (
            // group_filters 特殊渲染：同一指标的多个条件合并在一个按钮内
            <div className="flex flex-wrap items-center gap-y-2">
              {displayData.map((item: any, index: number) => {
                const isLastItem = index === displayData.length - 1;
                
                // 如果是合并的filters组
                if (item.isGroupedFilters && item.filters && Array.isArray(item.filters)) {
                  // 将同一指标的多个条件用"且"连接
                  const conditionsText = item.filters.map((filter: any) => {
                    const operatorText = OPERATOR_MAP[filter.operator] || filter.operator;
                    const valueText = filter.value ? filter.value.toString() : '';
                    return `${operatorText}${valueText}`;
                  }).join('且');
                  
                  return (
                    <React.Fragment key={index}>
                      <span 
                        className="px-3 py-1 bg-gray-50 text-gray-700 rounded-md border border-gray-300 cursor-pointer hover:bg-gray-100 transition-colors text-base font-medium whitespace-nowrap"
                      >
                        {item.text}{conditionsText}
                      </span>
                      {/* 不同指标之间的分隔符 */}
                      {!isLastItem && <span className="text-gray-700 text-base font-medium mx-1 inline-flex items-center">、</span>}
                    </React.Fragment>
                  );
                } else {
                  // 兼容旧格式
                  return (
                    <React.Fragment key={index}>
                      <span 
                        className="px-3 py-1 bg-gray-50 text-gray-700 rounded-md border border-gray-300 cursor-pointer hover:bg-gray-100 transition-colors text-base font-medium whitespace-nowrap"
                      >
                        {formatItemWithOperator(item, '、')}
                      </span>
                      {!isLastItem && <span className="text-gray-700 text-base font-medium mx-1 inline-flex items-center">、</span>}
                    </React.Fragment>
                  );
                }
              })}
            </div>
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
                  if (type === 'target_indicators' && !item.function) {
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
                      {isIndicatorField && displayItem.function && displayItem.function !== 'DEFAULT' && displayItem.function !== 'default' ? (
                        <>
                          {/* text按钮 */}
                          <span 
                            className="px-3 py-1 bg-gray-50 text-gray-700 rounded-md border border-gray-300 cursor-pointer hover:bg-gray-100 transition-colors text-base font-medium whitespace-nowrap"
                          >
                            {displayItem.text || ''}
                          </span>
                          {/* text和function之间的连接符 */}
                          <span className="text-gray-700 text-base font-medium mx-1 inline-flex items-center">的</span>
                          {/* function按钮 */}
                          <span 
                            className="px-3 py-1 bg-gray-50 text-gray-700 rounded-md border border-gray-300 cursor-pointer hover:bg-gray-100 transition-colors text-base font-medium whitespace-nowrap"
                          >
                            {FUNCTION_MAP[displayItem.function] || displayItem.function}
                          </span>
                        </>
                      ) : (
                        <span 
                          className="px-3 py-1 bg-gray-50 text-gray-700 rounded-md border border-gray-300 cursor-pointer hover:bg-gray-100 transition-colors text-base font-medium whitespace-nowrap"
                        >
                          {formatDisplayText(displayItem, type, chatMode, isIndicatorField)}
                        </span>
                      )}
                      {/* 项之间的分隔符 */}
                      {!isLastItem && <span className="text-gray-700 text-base font-medium mx-1 inline-flex items-center">、</span>}
                    </React.Fragment>
                  );
                })}
              </div>
            </Popover>
          )
        )}
        
        {/* 显示推荐的占位符 - 只有在没有通过recommend选择时才显示，qualifier和group_filters 不显示占位符 */}
        {shouldShowPopover && !isRecommendSelected && !isQualifier && !isGroupFilters && (
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
        
        {/* group_filters 特殊占位符 - 在选择指标前显示"分组过滤" */}
        {isGroupFilters && !hasConfirm && (
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
      target_indicators: '指标',
      filters: '过滤条件',
      group_filters: '分组过滤'
    };
    return labels[key] || key;
  };

  // 根据 chat_mode 获取智能体名称
  const getChatModeLabel = () => {
    const modeLabels: { [key: string]: string } = {
      chat_with_db_execute: '智能问数',
      chat_with_excel: 'Excel分析',
      chat_with_dashboard: '大屏生成'
    };
    return modeLabels[chatMode] || '智能问数';
  };

  // 根据 recommend 和 confirm 获取推荐字段的显示文本
  const getRecommendFieldsText = (): string[] => {
    const fields = new Set<string>();
    
    // 从recommend中获取字段
    if (recommend) {
      Object.keys(recommend).forEach(key => {
        const value = recommend[key];
        const hasValue = Array.isArray(value) && value.length > 0;
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
    <div className="intent-clarify-query-mode bg-white pt-6 pb-6">
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
              const allIndicators = [...(recommend?.target_indicators || [])];
              return allIndicators.some((indicator: any) => 
                indicator.qualifier && Array.isArray(indicator.qualifier) && indicator.qualifier.length > 0
              );
            }
            
            // group_filters 特殊处理：检查是否有指标包含 group_filters 属性
            if (fieldType === 'group_filters') {
              // 检查已选择的指标中是否有 group_filters
              const hasSelectedGroupFilters = getFieldDisplayData(fieldType).length > 0;
              if (hasSelectedGroupFilters) return true;
              
              // 检查推荐的指标中是否有 group_filters
              const allIndicators = [...(recommend?.target_indicators || [])];
              return allIndicators.some((indicator: any) => 
                indicator.group_filters && Array.isArray(indicator.group_filters) && indicator.group_filters.length > 0
              );
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
                    {/* 显示after文字：如果后面还有字段，正常显示；如果是最后一个字段，和end合并显示 */}
                    {part.after && hasNextField && <span className="text-gray-700 font-medium">{part.after}</span>}
                    {part.after && !hasNextField && template.end && (
                      <span className="text-gray-700 font-medium">{part.after}{template.end}</span>
                    )}
                    {part.after && !hasNextField && !template.end && (
                      <span className="text-gray-700 font-medium">{part.after}</span>
                    )}
                  </React.Fragment>
                );
              })}
              
              {/* 结束文字 - 只在没有字段有after的情况下单独显示 */}
              {hasAnyField && template.end && !template.parts?.some((part: any) => {
                const fieldExists = checkFieldExists(part.field);
                const isLastField = !template.parts?.slice(template.parts.indexOf(part) + 1).some((p: any) => checkFieldExists(p.field));
                return fieldExists && isLastField && part.after;
              }) && (
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

export default IntentClarifyQueryMode;

