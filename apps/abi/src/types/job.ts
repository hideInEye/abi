// 1-已删除,0-待处理,1-生成日报中,2-日报已生成,3-已发送,4-发送失败
export const shareMailStatus = {
  0: '待处理',
  1: '生成日报中',
  2: '日报已生成',
  3: '已发送',
  4: '发送失败',
  5: '文件生成失败'
};

export const shareMailColor = {
  0: '#8C8C8C',
  1: '#1677FF',
  2: '#52C41A',
  3: '#389E0D',
  4: '#FF4D4F',
  5: '#FF7875',
};

export type statusType = keyof typeof shareMailStatus;

// 简化状态分组（后端 displayGroup 字段）：原始 7 类状态聚合为 4 类
export const shareMailDisplayGroups = ['处理中', '已生成', '成功', '失败'] as const;

export type displayGroupType = (typeof shareMailDisplayGroups)[number];

// 原始状态 → 简化状态分组（-1 已删除不属于任何分组）
export const statusToDisplayGroup: Record<number, displayGroupType> = {
  0: '处理中',
  1: '处理中',
  2: '已生成',
  3: '成功',
  4: '失败',
  5: '失败',
};

export const displayGroupColor: Record<displayGroupType, string> = {
  处理中: '#1677FF',
  已生成: '#FA8C16',
  成功: '#52C41A',
  失败: '#FF4D4F',
};

/**
 * 解析记录行的简化状态分组：
 * 优先取后端 displayGroup（兼容中文文案或 1~4 数字），缺失/无法识别时按原始 status 推导
 */
export function resolveDisplayGroup(row?: { displayGroup?: number | string; status?: number }): displayGroupType | undefined {
  if (!row) return undefined;
  const { displayGroup, status } = row;
  if (typeof displayGroup === 'string' && (shareMailDisplayGroups as readonly string[]).includes(displayGroup)) {
    return displayGroup as displayGroupType;
  }
  if (typeof displayGroup === 'number' && displayGroup >= 1 && displayGroup <= shareMailDisplayGroups.length) {
    return shareMailDisplayGroups[displayGroup - 1];
  }
  if (status !== undefined && status !== null && status in statusToDisplayGroup) {
    return statusToDisplayGroup[status];
  }
  return undefined;
}
