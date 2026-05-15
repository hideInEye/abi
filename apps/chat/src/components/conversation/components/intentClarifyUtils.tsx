import React from 'react';
import { Tooltip } from 'antd';

// 聚合函数翻译映射
export const FUNCTION_MAP: { [key: string]: string } = {
  "MAX": "最大值",
  "max": "最大值",
  "MIN": "最小值",
  "min": "最小值",
  "AVG": "平均值",
  "avg": "平均值",
  "SUM": "总量",
  "sum": "总量",
  "COUNT": "统计量",
  "count": "统计量",
  "COUNT_DISTINCT": "去重统计量",
  "count_distinct": "去重统计量",
  "YoY": "年同比",
  "yoy": "年同比",
  "MoM": "月环比",
  "mom": "月环比",
  "QoQ": "季环比",
  "qoq": "季环比",
  "DEFAULT":"",
  "default":""
};

// 操作符映射
export const OPERATOR_MAP: {[key: string]: string} = {
  "like":'是',
  "not like":'不是',
  'in': '包括',
  'not in': '不包括',
  '>': '大于',
  '<': '小于',
  '>=': '大于等于',
  '<=': '小于等于',
  '=': '是',
  '!=': '不是',
  'range': '介于',
  'not range': '不介于',
  'null': '为空',
  'not null': '不为空'
};

// 日期颗粒度映射
export const GRANULARITY_MAP: {[key: string]: string} = {
  "年":"在年份",
  "年月":"在月份",
  "年月日":"在日期",
  "年季度":"在季度",
  "年周":"在周",
}

// 日期格式映射
export const DATE_FORMAT_MAP: { [key: string]: string } = {
  date: 'YYYY-MM-DD',
  week: 'YYYY-wo',
  month: 'YYYY-MM',
  quarter: 'YYYY-[Q]Q',
  year: 'YYYY'
};

// 格式化带操作符和值的项（用于qualifier和filters）
export const formatItemWithOperator = (item: any, valueSeparator: string = '、'): string => {
  if (typeof item === 'string') return item;
  if (!item.text && !item.operator) return '';
  
  const operatorText = OPERATOR_MAP[item.operator] || item.operator;
  const valueText = item.value ? item.value.toString().replace(/,/g, valueSeparator) : '';
  const text = item.text || '';
  return `${text}${operatorText}${valueText}`;
};

// 将YYYY-MM-DD格式转换为对应粒度的值格式（用于自定义日期选择器）
export const convertDateToGranularityValue = (dateStr: string, granularity: string): string => {
  if (!dateStr) return '';
  
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return dateStr;
  
  const year = match[1];
  const month = parseInt(match[2], 10);
  
  switch (granularity) {
    case '年月日':
      return dateStr; // 保持 YYYY-MM-DD
    case '年季度':
      // 根据月份计算季度
      const quarter = Math.floor((month - 1) / 3) + 1;
      return `${year}-Q${quarter}`;
    case '年月':
      return `${year}-${String(month).padStart(2, '0')}`;
    case '年':
      return year;
    default:
      return dateStr;
  }
};

// 格式化时间范围的值
export const formatTimeRangeValue = (value: string, granularity: string): string => {
  if (!value) return '';
  
  // 如果是年月日格式 (YYYY-MM-DD 或 YYYY-M-D)
  if (granularity === '年月日') {
    const match = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (match) {
      const year = match[1];
      const month = parseInt(match[2], 10);
      const day = parseInt(match[3], 10);
      return `${year}年${month}月${day}日`;
    }
  }
  
  // 如果是年季度格式 (YYYY-Q1, YYYY-Q2, YYYY-Q3, YYYY-Q4)
  if (granularity === '年季度') {
    const match = value.match(/^(\d{4})-Q([1-4])$/);
    if (match) {
      const year = match[1];
      const quarter = match[2];
      const quarterMap: { [key: string]: string } = {
        '1': '一',
        '2': '二',
        '3': '三',
        '4': '四'
      };
      return `${year}年第${quarterMap[quarter]}季度`;
    }
  }
  
  // 如果是年月格式 (YYYY-MM)
  if (granularity === '年月') {
    const match = value.match(/^(\d{4})-(\d{1,2})$/);
    if (match) {
      const year = match[1];
      const month = parseInt(match[2], 10);
      return `${year}年${month}月`;
    }
  }
  
  // 如果是年格式 (YYYY)
  if (granularity === '年') {
    const match = value.match(/^(\d{4})$/);
    if (match) {
      return `${match[1]}年`;
    }
  }
  
  return value;
};

// 格式化显示文本
export const formatDisplayText = (item: any, fieldType: string, chatMode?: string, excludeQualifier: boolean = false): string => {
  if (typeof item === 'string') return item;
  
  const isIndicatorField = fieldType === 'target_indicators' || fieldType === 'base_indicators';
  
  // time_range字段特殊处理
  if (fieldType === 'time_range' && item.granularity && item.operator && item.value !== undefined) {
    const text = item.text || '';
    const granularityText = GRANULARITY_MAP[item.granularity] || '';
    const operatorText = OPERATOR_MAP[item.operator] || item.operator;
    
    // 判断是否是用户选择的推荐text（而非自定义时间）
    // 如果text存在且不为空，且不是字段名，则认为是推荐的语义化文本
    const hasSemanticText = text && text !== 'time_range' && text.trim().length > 0;
    
    // 如果是range操作符，需要处理逗号分隔的多个值
    if (item.operator === 'range' || item.operator === 'not range') {
      const values = item.value.toString().split(',');
      const formattedValues = values.map((v: string) => formatTimeRangeValue(v.trim(), item.granularity));
      
      // 如果有语义化文本，只显示文本；否则显示格式化后的时间范围
      if (hasSemanticText) {
        return text;
      } else {
        return `${granularityText}${formattedValues.join('到')}`;
      }
    } else if (item.operator === 'in' || item.operator === 'not in') {
      // in操作符不显示operatorText，直接显示多个值
      const values = item.value.toString().split(',');
      const formattedValues = values.map((v: string) => formatTimeRangeValue(v.trim(), item.granularity));
      
      // 如果有语义化文本（如"未来三年"），只显示文本；否则显示格式化后的值
      if (hasSemanticText) {
        return text;
      } else {
        return `${granularityText}${formattedValues.join('、')}`;
      }
    } else {
      // 单值操作符
      const formattedValue = formatTimeRangeValue(item.value.toString(), item.granularity);
      
      // 如果有语义化文本，只显示文本；否则显示格式化后的值
      if (hasSemanticText) {
        return text;
      } else {
        return `${granularityText}${operatorText}${formattedValue}`;
      }
    }
  }
  
  // filters、qualifier和group_filters字段特殊处理
  if ((fieldType === 'filters' || fieldType === 'qualifier' || fieldType === 'group_filters') && item.operator && item.value !== undefined) {
    return formatItemWithOperator(item, fieldType === 'filters' ? '到' : '、');
  }
  
  // 指标字段添加聚合函数前缀
  if (isIndicatorField && item.function) {
    const functionPrefix = FUNCTION_MAP[item.function] !== undefined ? FUNCTION_MAP[item.function] : item.function;
    // 只有当functionPrefix不为空字符串时才拼接
    let displayText = functionPrefix !== '' ? `${item.text || ''}的${functionPrefix}` : `${item.text || ''}`;
    
    // 如果指标有qualifier，将qualifier信息添加到显示文本前面（除非明确排除）
    if (!excludeQualifier && item.qualifier && Array.isArray(item.qualifier) && item.qualifier.length > 0) {
      const qualifierTexts = item.qualifier.map((q: any) => {
        // 使用 formatItemWithOperator 来格式化 qualifier，显示 text+operator+value
        return formatItemWithOperator(q, '、');
      }).filter(Boolean);
      
      if (qualifierTexts.length > 0) {
        displayText = `${qualifierTexts.join('、')}的${displayText}`;
      }
    }
    
    // group_filters 不再拼接到指标文本中，而是作为独立字段处理
    
    return displayText;
  }
  
  return item.text || JSON.stringify(item);
};

// 渲染field字段，超过12个字符时显示省略号和tooltip
export const renderFieldWithTooltip = (field: string) => {
  if (!field) return null;
  
  const maxLength = 12;
  const needTruncate = field.length > maxLength;
  const displayText = needTruncate ? `${field.substring(0, maxLength)}...` : field;
  
  const fieldContent = (
    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
      {displayText}
    </span>
  );
  
  if (needTruncate) {
    return (
      <Tooltip title={field} placement="top">
        {fieldContent}
      </Tooltip>
    );
  }
  
  return fieldContent;
};

// 选择弹框内容组件
export const SelectionContent: React.FC<{
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
                    // 如果candidate没有function，从父级option获取
                    const displayFunction = candidate.function || option.function;
                    // 修正：displayText应始终为candidate的文本
                    const displayText = candidate.text;
                    // 新增：检查是否为时间候选项，并从父级获取value和granularity进行格式化
                    const isTimeCandidate = fieldType === 'time_range' && option.value;
                    const timeValueText = isTimeCandidate ? formatTimeRangeValue(option.value, option.granularity) : null;

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
                          {/* 新增：用于显示格式化后的时间值 */}
                          {timeValueText && <span className="text-sm text-gray-500 ml-2">{timeValueText}</span>}
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
            // 修正：移除之前错误的逻辑，直接使用formatTimeRangeValue
            const displayText = fieldType === 'time_range' && option.value 
              ? formatTimeRangeValue(option.value, option.granularity) 
              : option.text;
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

