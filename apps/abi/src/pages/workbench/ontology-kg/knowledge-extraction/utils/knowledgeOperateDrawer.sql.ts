import { sql } from '@codemirror/lang-sql'

const SQL_ERROR_NODE_NAME = '⚠'
const sqlParser = sql().language.parser

function normalizeExpressionForSql(expression: string) {
  return expression
    .replace(/##[^#]+##/g, 'field_ref')
    .replace(/\$\{[^}]+\}/g, 'field_ref')
    .replace(/\{[^{}]+\}/g, 'field_ref')
    .trim()
}

function wrapExpressionToSql(expression: string) {
  const normalized = normalizeExpressionForSql(expression)
  if (!normalized) {
    return ''
  }
  if (/^select\b/i.test(normalized)) {
    return normalized
  }

  const hasFrom = /\bfrom\b/i.test(normalized)
  const whereMatch = normalized.match(/\bwhere\b/i)
  if (whereMatch && !hasFrom) {
    const whereIndex = whereMatch.index || 0
    const selectExpr = normalized.slice(0, whereIndex).trim()
    const whereExpr = normalized.slice(whereIndex).trim()
    return `SELECT ${selectExpr} FROM mock_table ${whereExpr}`
  }

  if (hasFrom) {
    return `SELECT ${normalized}`
  }
  return `SELECT ${normalized} FROM mock_table`
}

export function hasSqlSyntaxError(expression: string) {
  const sqlText = wrapExpressionToSql(expression)
  if (!sqlText) {
    return false
  }

  const tree = sqlParser.parse(sqlText)
  const cursor = tree.cursor()
  do {
    if (cursor.type.isError || cursor.name === SQL_ERROR_NODE_NAME) {
      return true
    }
  } while (cursor.next())

  return false
}
