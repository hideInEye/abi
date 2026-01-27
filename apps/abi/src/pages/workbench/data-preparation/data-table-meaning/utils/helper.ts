/**
 * 格式化字段 去除字段中的空格和逗号
 *
 * @param field
 * @returns
 */
export function formatField(field: string) {
  if (field) {
    return field.replace(/\s+/g, '').replace(/，/g, ',');
  }
  return '';
}
