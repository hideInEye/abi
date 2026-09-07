// 日期语义类型字段的默认字段描述：用户问题未指定时间范围时按最近3个月理解
export const DATE_SEMANTIC_DEFAULT_DESC = '用户问题未涉及时间范围场景，默认最近3个月';

/**
 * 语义类型为日期且字段描述为空时自动填充默认描述；
 * 描述已有值（已保存或用户手填）时不覆盖
 */
export function withDateDefaultDesc(field: any, semanticType: string) {
  if (semanticType === 'datetime' && !String(field.fieldDesc || '').trim()) {
    return { ...field, fieldDesc: DATE_SEMANTIC_DEFAULT_DESC };
  }
  return field;
}

/**
 * 根据字段类型返回语义类型（不考虑主键映射）
 */
export function getSemanticTypeByFieldType(fieldType: string) {
  const lowerFieldType = fieldType?.toLowerCase() || '';
  const upperFieldType = fieldType?.toUpperCase() || '';
  if (upperFieldType === 'DATETIME' ||
      upperFieldType === 'DATETIME64' ||
      upperFieldType === 'DATE' ||
      upperFieldType === 'TIME' ||
      upperFieldType.includes('TIMESTAMP')
  ) {
    return 'datetime';
  }
  // 度量类型：模糊匹配包含 int、float、decimal 的类型（转小写兼容各种大小写）
  if (lowerFieldType.includes('int') ||
      lowerFieldType.includes('float') ||
      lowerFieldType.includes('decimal') ||
      lowerFieldType.includes('integer') ||
      lowerFieldType.includes('double') ||
      upperFieldType.includes('NUMBER') ||
      upperFieldType.includes('NUMERIC') ||
      upperFieldType.includes('LONG')) {
    return 'measure';
  }
  if (upperFieldType.includes('VARCHAR')) {
    return 'categorical';
  }
  switch (fieldType) {
    case 'STRING':
    case 'BOOL':
    case 'BOOLEAN':
    case 'CHAR':
    case 'TEXT':
    case 'FIXEDSTRING':
    case 'NULLABLE':
    case 'CLOB':
    case 'CHARACTER VARYING':
      return 'categorical';
    default:
      return '';
  }
}

/**
 * 默认语义类型展示规则
 *
 * 1. 如果字段的originName 跟 TableName 与 tablePrikey中有匹配则优先展示主键（一个表只映射第一个主键，仅编辑模式）
 * 2. TIME、TIMESTAMP、DATE、DATETIME 展示 datetime
 * 3. VARCHAR CHAR等字符类型展示 categorical
 * 4. INT、FLOAT、DECIMAL（含各种位数变体如Int8, Int16, Float32, Decimal32等）展示 measure
 * 5. 其他情况不展示
 */
export function getDefaultSemanticType(field: any, drawerTitle: string, tablePrikey: any[] = []) {
  const { fieldType, originName, tableName } = field;
  // 只在编辑模式下检查是否是数据库映射的主键（一个表只映射第一个）
  if (drawerTitle === '编辑数据语义' && tablePrikey && tablePrikey.length > 0) {
    // 找出当前表的所有主键字段
    const currentTablePrimaryKeys = tablePrikey.filter((item: any) => item.tableName === tableName);
    // 如果有主键，只映射第一个
    if (currentTablePrimaryKeys.length > 0) {
      const firstPrimaryKey = currentTablePrimaryKeys[0];
      if (firstPrimaryKey.originName === originName && firstPrimaryKey.tableName === tableName) {
        return 'primary_key';
      }
    }
  }
  return getSemanticTypeByFieldType(fieldType);
}

export function getSemanticTypeMap(initFields: any) {
  const semanticTypeMap = new Map();

  initFields.dimensions.forEach((dimension: any) => {
    if (dimension.type === 'datetime') {
      semanticTypeMap.set(dimension.techId, {
        alias: dimension.alias,
        bizName: dimension.bizName,
        fieldDesc: dimension.fieldDesc,
        semanticType: 'datetime'
      });
    } else {
      semanticTypeMap.set(dimension.techId, {
        alias: dimension.alias,
        bizName: dimension.bizName,
        fieldDesc: dimension.fieldDesc,
        semanticType: 'categorical'
      });
    }
  });

  initFields.measures.forEach((measure: any) => {
    semanticTypeMap.set(measure.techId, {
      alias: measure.alias,
      bizName: measure.bizName,
      fieldDesc: measure.fieldDesc,
      semanticType: 'measure'
    });
  });

  initFields.identifiers.forEach((identifier: any) => {
    semanticTypeMap.set(identifier.techId, {
      alias: identifier.alias,
      bizName: identifier.bizName,
      fieldDesc: identifier.fieldDesc,
      semanticType: 'primary_key'
    });
  });

  return semanticTypeMap;
}
