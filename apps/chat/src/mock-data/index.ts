// 模拟数据统一导出入口
import { mockIntentClarifyData, fieldMappings } from './intent-clarify-samples';

// 获取场景字段显示配置
export const getSceneFieldConfig = (scenarioType: string) => {
  const sceneFieldConfigs: Record<string, any> = {
    // 问数场景
    'chat_with_db_execute': {
      required: ["time_range", "target_indicators"],
      optional: ["dimensions", "filters"],
      hidden: ["base_indicators", "indicator_status", "time_series_continuous"]
    },

    // 归因分析场景
    'chat_with_analysis': {
      required: ["time_range", "target_indicators", "indicator_status"],
      optional: ["dimensions", "filters", "base_indicators"],
      hidden: ["time_series_continuous"]
    },

    // 预测分析场景
    'chat_with_predict': {
      required: ["time_range", "target_indicators", "time_series_continuous"],
      optional: ["dimensions", "filters"],
      hidden: ["base_indicators", "indicator_status"]
    },

    // Excel分析场景
    'chat_with_excel': {
      required: ["target_indicators"],
      optional: ["time_range", "dimensions", "filters"],
      hidden: ["base_indicators", "indicator_status", "time_series_continuous"]
    },

    // 大屏场景
    'chat_with_dashboard': {
      required: ["time_range", "target_indicators"],
      optional: ["dimensions", "filters"],
      hidden: ["base_indicators", "indicator_status", "time_series_continuous"],
      特殊规则: "支持实时数据展示"
    }
  };
  
  return sceneFieldConfigs[scenarioType] || sceneFieldConfigs['chat_with_db_execute'];
};

// 验证表单数据
export const validateFormData = (data: any, scenarioType: string) => {
  const errors: any[] = [];
  const sceneConfig = getSceneFieldConfig(scenarioType);
  
  // 表单验证规则
  const validationRules: Record<string, any> = {
    time_range: {
      required: true,
      message: "请选择时间范围",
      validator: (value: any) => {
        if (!value || !value.field) return false;
        if (value.operator === "range" && (!value.value || !value.value.includes(","))) {
          return false;
        }
        return true;
      }
    },

    target_indicators: {
      required: true,
      message: "请至少选择一个目标指标",
      validator: (value: any) => {
        return Array.isArray(value) && value.length > 0;
      }
    },

    dimensions: {
      required: false,
      maxCount: 5,
      message: "最多选择5个维度",
      validator: (value: any) => {
        return !value || !Array.isArray(value) || value.length <= 5;
      }
    },

    filters: {
      required: false,
      validator: (value: any) => {
        if (!value || !Array.isArray(value)) return true;
        // 检查每个筛选条件是否完整
        return value.every((filter: any) => 
          filter.field && filter.operator && 
          (filter.operator === "null" || filter.operator === "not null" || filter.value)
        );
      }
    },

    indicator_status: {
      required: true, // 仅归因分析场景
      message: "请选择指标异动状态",
      validator: (value: any, scenario: string) => {
        if (scenario !== 'chat_with_analysis') return true;
        return value && value.trim().length > 0;
      }
    }
  };
  
  // 检查必填字段
  sceneConfig.required.forEach((fieldName: string) => {
    const rule = validationRules[fieldName];
    if (rule && rule.required) {
      const fieldData = data[fieldName];
      if (!rule.validator(fieldData, scenarioType)) {
        errors.push({
          field: fieldName,
          message: rule.message
        });
      }
    }
  });
  
  // 检查可选字段
  sceneConfig.optional.forEach((fieldName: string) => {
    const rule = validationRules[fieldName];
    if (rule && data[fieldName]) {
      if (!rule.validator(data[fieldName], scenarioType)) {
        errors.push({
          field: fieldName,
          message: rule.message
        });
      }
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// 格式化提交数据
export const formatSubmitData = (rawData: any) => {
  const submitFormatters = {
    // 时间范围格式化
    formatTimeRange: (timeRange: any) => {
      if (!timeRange) return null;
      
      const formatted = {
        text: timeRange.text || "",
        field: timeRange.field,
        operator: timeRange.operator,
        value: timeRange.value
      };
      
      // 处理日期格式
      if (formatted.operator === "range" && formatted.value) {
        const dates = formatted.value.split(",");
        if (dates.length === 2) {
          formatted.value = `${dates[0].trim()},${dates[1].trim()}`;
        }
      }
      
      return formatted;
    },

    // 指标格式化
    formatIndicators: (indicators: any) => {
      if (!Array.isArray(indicators)) return [];
      
      return indicators.map((indicator: any) => ({
        text: indicator.text || "",
        field: indicator.field,
        function: indicator.function || "SUM",
        qualifier: indicator.qualifier || []
      }));
    },

    // 筛选条件格式化
    formatFilters: (filters: any) => {
      if (!Array.isArray(filters)) return [];
      
      return filters.map((filter: any) => ({
        type: filter.type || "dim",
        text: filter.text || "",
        field: filter.field,
        operator: filter.operator,
        value: filter.value || ""
      }));
    }
  };

  const formatted = {
    agent_label: "intent_clarify",
    agent_step: [
      {
        chat_mode: rawData.chat_mode,
        query_mode: rawData.query_mode,
        confirm: {
          time_range: rawData.time_range ? [submitFormatters.formatTimeRange(rawData.time_range)] : [],
          dimensions: rawData.dimensions || [],
          target_indicators: submitFormatters.formatIndicators(rawData.target_indicators),
          filters: submitFormatters.formatFilters(rawData.filters),
          base_indicators: submitFormatters.formatIndicators(rawData.base_indicators),
          indicator_status: rawData.indicator_status || ""
        },
        recommend: {
          config: rawData.config || {
            time_range: "single",
            dimensions: "multiple", 
            target_indicators: "single",
            base_indicators: "single"
          },
          time_range: [],
          dimensions: [],
          target_indicators: [],
          filters: [],
          base_indicators: [],
          time_series_continuous: rawData.time_series_continuous || {}
        }
      }
    ]
  };
  
  return formatted;
};

// 解析候选字段数据
export const parseCandidateField = (candidateData: any) => {
  if (!candidateData || !candidateData.candidate || candidateData.candidate.length === 0) {
    return {
      hasCandidate: false,
      field: candidateData?.field || '',
      text: candidateData?.text || ''
    };
  }
  
  return {
    hasCandidate: true,
    candidates: candidateData.candidate,
    text: candidateData.text,
    selectedField: candidateData.field || ''
  };
};

export { mockIntentClarifyData, fieldMappings };
