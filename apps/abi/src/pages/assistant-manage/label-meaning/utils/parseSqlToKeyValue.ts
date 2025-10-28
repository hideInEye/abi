export function parseSqlToKeyValue(sqlCondition: string | undefined): Record<string, string> | null {
  if (!sqlCondition) return null;

  // 使用正则拆分并保留逻辑运算符
  const parts = sqlCondition.split(/(AND|OR)/i).map(p => p.trim());
  const conditions: {
    field: string;
    logic?: string;
    operator: string;
    value: string;
  }[] = [];

  // 每次处理两个元素：条件 + 逻辑运算符
  for (let i = 0; i < parts.length; i += 2) {
    const condition = parts[i];
    if (!condition) continue;

    // 解析字段、操作符、值
    const match = condition.match(/^(\S+)\s+(\S+)\s+(.+)/);
    if (!match) continue;

    const [, field, operator, value] = match;
    const logic = i + 1 < parts.length ? parts[i + 1].toUpperCase() : undefined;

    conditions.push({
      field,
      logic: logic === 'AND' || logic === 'OR' ? logic : undefined,
      operator,
      value: value.replace(/^['"]|['"]$/g, '')
    });
  }

  // 转换为键值对
  const result: Record<string, string> = {};
  conditions.forEach((cond, rowIndex) => {
    const base = `${rowIndex}`;
    result[`${base}-0`] = cond.field;
    result[`${base}-1`] = cond.operator;
    result[`${base}-2`] = cond.value;
    if (cond.logic) result[`${base}-3`] = cond.logic;
  });

  return result;
}
