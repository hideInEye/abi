type IndexedData = Record<string, string>;

export function convertTo2DArray(data: IndexedData): string[][] {
  // 1. 获取最大行数和列数
  const rows = new Set<number>();
  const cols = new Set<number>();

  Object.keys(data).forEach(key => {
    const [i, j] = key.split('-').map(Number);
    rows.add(i);
    cols.add(j);
  });

  const rowCount = Math.max(...rows) + 1;
  const colCount = Math.max(...cols) + 1;

  // 2. 初始化二维数组
  const result: string[][] = Array.from({ length: rowCount }, () => Array(colCount).fill(''));

  // 3. 填充数据
  Object.entries(data).forEach(([key, value]) => {
    const [i, j] = key.split('-').map(Number);
    result[i][j] = value;
  });

  return result;
}
