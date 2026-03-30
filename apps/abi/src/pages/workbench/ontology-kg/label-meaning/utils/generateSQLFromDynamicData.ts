export function generateSQLFromDynamicData(data: any) {
  // 1. 提取所有行号（如 0, 1, 2）
  const rowIndices = new Set();
  for (const key in data) {
    if (key.includes('-')) {
      const row = key.split('-')[0];
      rowIndices.add(row);
    }
  }

  // 2. 重组数据为数组结构
  const conditions: any = [];
  rowIndices.forEach(row => {
    const condition = {
      field: data[`${row}-0`]?.replace(/['"“”]/g, ''),
      logic: data[`${row}-3`],
      // 去除引号
      operator: data[`${row}-1`]?.replace(/['"“”]/g, ''),
      value: data[`${row}-2`]?.replace(/['"“”]/g, '') // AND/OR（可能不存在）
    };
    conditions.push(condition);
  });

  // 3. 生成 SQL 条件
  const sqlConditions = conditions.map((cond: any, index: number) => {
    const { field, logic, operator, value } = cond;

    // 判断 value 是否是数字（不加引号）
    const isNumeric = !Number.isNaN(value) && !Number.isNaN(Number.parseFloat(value));
    const formattedValue = isNumeric ? value : `'${value}'`;

    // 组合条件（如 `field <= 12`）
    let conditionPart = `${field} ${operator} ${formattedValue}`;

    // 如果不是最后一条，且存在逻辑运算符，则加上 AND/OR
    if (index < conditions.length - 1 && logic) {
      conditionPart += ` ${logic}`;
    }

    return conditionPart;
  });

  return sqlConditions.join(' '); // 返回组合后的 SQL 条件
}
