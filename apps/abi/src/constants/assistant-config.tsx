// 助手配置 - 配置表语义 - 可选数据集表语义字段映射
export const SEMANTIC_TYPE_MAP: any = {
  dates: '日期',
  dimensions: '维度',
  metrics: '度量',
  primaryKeys: '主键'
};

// 记忆管理 - 场景类型
export const MEMORY_CHAT_MODE_OPTIONS: any = [
  {
    label: '归因',
    value: 'chat_with_analysis'
  },
  {
    label: '预测',
    value: 'chat_with_predict'
  },
  {
    label: '问数',
    value: 'chat_with_db_execute'
  },
  {
    label: 'Excel',
    value: 'chat_with_excel'
  },
  {
    label: '大屏',
    value: 'chat_with_dashboard'
  }
];

// 效果评审 - 审核状态（status：0=拒绝 1=接受 2=待处理）
export const MEMORY_STATUS_OPTIONS: any = [
  {
    label: '已拒绝',
    value: '0'
  },
  {
    label: '已接受',
    value: '1'
  },
  {
    label: '待处理',
    value: '2'
  }
];

// 效果评审 - 模型评估结果（evalLlm：0=正确 1=错误）
export const EVAL_LLM_OPTIONS: any = [
  {
    label: '正确',
    value: '0'
  },
  {
    label: '错误',
    value: '1'
  }
];

// 效果评审 - 专家评估结果（evalExpert：0=正确 1=错误）
export const EVAL_EXPERT_OPTIONS: any = [
  {
    label: '正确',
    value: '0'
  },
  {
    label: '错误',
    value: '1'
  }
];

// 记忆管理 - 人工调整
export const MANUAL_OPTIONS: any = [
  {
    label: '否',
    value: false
  },
  {
    label: '是',
    value: true
  }
];
