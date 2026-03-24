/**
 * 过滤对象，只保留带有 `-` 的键（如 `0-0`, `1-2`）
 *
 * @param input 输入对象，可能包含 `alias`、`bizName` 等不带 `-` 的键
 * @returns 返回过滤后的对象，仅包含 `{行号-列号: 值}` 格式的键
 */
export function filterHyphenatedKeys(input: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};

  for (const key in input) {
    if (key.includes('-')) {
      // 只保留带 `-` 的键
      result[key] = input[key];
    }
  }

  return result;
}

/**
 * 过滤掉 带“-”的数据
 *
 * @param obj
 */
export function filterKeysWithoutHyphen(obj: Record<string, any>): Record<string, any> {
  return Object.entries(obj)
    .filter(([key]) => !key.includes('-'))
    .reduce(
      (acc, [key, value]) => {
        acc[key] = value;
        return acc;
      },
      {} as Record<string, any>
    );
}
