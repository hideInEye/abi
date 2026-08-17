export const MAPPED_BIZ_NAME_SEPARATOR = '_#_'
const LEGACY_MAPPED_BIZ_NAME_SEPARATOR = '_#'
const MAPPED_BIZ_NAME_SEPARATORS = [MAPPED_BIZ_NAME_SEPARATOR, LEGACY_MAPPED_BIZ_NAME_SEPARATOR]
export const MAPPED_TECH_NAME_SEPARATOR = '.'

function trim(value: unknown) {
  return String(value ?? '').trim()
}

function getResponseData(res: any) {
  return res?.response?.data?.data ?? res?.data ?? res?.response?.data
}

function findMappedBizNameSeparator(text: string) {
  return MAPPED_BIZ_NAME_SEPARATORS
    .map(separator => ({
      index: text.indexOf(separator),
      separator
    }))
    .filter(item => item.index >= 0)
    .sort((a, b) => a.index - b.index || b.separator.length - a.separator.length)[0]
}

export function getMappedBizNameParts(value: unknown) {
  const text = trim(value)
  const match = findMappedBizNameSeparator(text)
  if (!match) {
    return {
      displayName: text,
      fieldName: '',
      isMapped: false,
      rawName: text
    }
  }

  return {
    displayName: text.slice(0, match.index).trim(),
    fieldName: text.slice(match.index + match.separator.length).trim(),
    isMapped: true,
    rawName: text
  }
}

export function getMappedTechNameParts(value: unknown) {
  const text = trim(value)
  const index = text.lastIndexOf(MAPPED_TECH_NAME_SEPARATOR)
  if (index < 0) {
    return {
      displayName: text,
      isMapped: false,
      rawName: text,
      tableName: ''
    }
  }

  return {
    displayName: text.slice(index + MAPPED_TECH_NAME_SEPARATOR.length).trim(),
    isMapped: true,
    rawName: text,
    tableName: text.slice(0, index).trim()
  }
}

export function getMappedBizNameDisplay(value: unknown) {
  return getMappedBizNameParts(value).displayName
}

export function getMappedTechNameDisplay(value: unknown) {
  return getMappedTechNameParts(value).displayName
}

export function buildMappedBizName(tableBizName: unknown, fieldBizName: unknown) {
  const tableName = trim(tableBizName)
  const fieldName = trim(fieldBizName)
  return tableName && fieldName ? `${tableName}${MAPPED_BIZ_NAME_SEPARATOR}${fieldName}` : tableName || fieldName
}

export function buildMappedTechName(tableTechName: unknown, fieldOriginName: unknown) {
  const tableName = trim(tableTechName)
  const fieldName = trim(fieldOriginName)
  return tableName && fieldName ? `${tableName}${MAPPED_TECH_NAME_SEPARATOR}${fieldName}` : tableName || fieldName
}

export function restoreMappedBizName(displayName: unknown, mappedFieldName?: unknown) {
  const fieldName = trim(mappedFieldName)
  return fieldName ? buildMappedBizName(displayName, fieldName) : trim(displayName)
}

export function restoreMappedTechName(displayName: unknown, mappedTableName?: unknown) {
  const tableName = trim(mappedTableName)
  return tableName ? buildMappedTechName(tableName, displayName) : trim(displayName)
}

export function validateCustomBizNameText(value: unknown, label = '中文名称') {
  const text = trim(value)
  if (!text) {
    return `请输入${label}`
  }
  if (MAPPED_BIZ_NAME_SEPARATORS.some(separator => text.includes(separator))) {
    return `${label}不能包含${MAPPED_BIZ_NAME_SEPARATOR}`
  }
  return ''
}

export function validateCustomTechNameText(value: unknown, label = '英文名称') {
  const text = trim(value)
  if (!text) {
    return `请输入${label}`
  }
  if (!/^[A-Za-z]+(?:_[A-Za-z]+)*$/.test(text)) {
    return `${label}仅支持字母和单个下划线连接，不能包含数字，不能以下划线开头或结尾`
  }
  return ''
}

export function isOntologyNameCheckPassed(res: any) {
  const data = getResponseData(res)
  if (typeof data === 'boolean') {
    return !data
  }
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>
    if (typeof record.available === 'boolean') {
      return record.available
    }
    if (typeof record.valid === 'boolean') {
      return record.valid
    }
    if (typeof record.passed === 'boolean') {
      return record.passed
    }
    if (typeof record.exists === 'boolean') {
      return !record.exists
    }
    if (typeof record.exist === 'boolean') {
      return !record.exist
    }
    if (typeof record.duplicate === 'boolean') {
      return !record.duplicate
    }
  }

  const success = res?.response?.data?.success ?? res?.success
  return success !== false
}
