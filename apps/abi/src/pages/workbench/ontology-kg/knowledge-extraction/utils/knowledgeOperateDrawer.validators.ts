import type { FormInstance } from 'antd'

import type { KnowledgeFormValues, KnowledgeIndicatorItem } from '../types'

import { hasSqlSyntaxError } from './knowledgeOperateDrawer.sql'
import {
  compactArray,
  isBalancedParentheses,
  isFieldNameLike,
  isValidNumberInput
} from './knowledgeOperateDrawer.utils'

interface CreateValidatorsParams {
  editingItem: KnowledgeIndicatorItem | null
  existingItems: KnowledgeIndicatorItem[]
  form: FormInstance<KnowledgeFormValues>
}

export function createKnowledgeOperateValidators({ editingItem, existingItems, form }: CreateValidatorsParams) {
  const validateIndicatorName = (_: any, value?: string) => {
    const text = String(value || '').trim()
    if (!text) {
      return Promise.reject(new Error('请输入指标名称'))
    }
    if (text.length < 1 || text.length > 50) {
      return Promise.reject(new Error('请输入合法的指标名称（1-50字符）'))
    }
    if (/^\d+$/.test(text)) {
      return Promise.reject(new Error('指标名称不能为纯数字'))
    }
    if (!/^[\u4E00-\u9FA5A-Za-z0-9_]+$/.test(text)) {
      return Promise.reject(new Error('指标名称仅支持中文、英文、数字、下划线'))
    }

    const duplicate = existingItems.some(item => {
      if (!item.bizName) {
        return false
      }
      if (editingItem?.termId && item.termId === editingItem.termId) {
        return false
      }
      return item.bizName.trim() === text
    })
    if (duplicate) {
      return Promise.reject(new Error('指标名称已存在，请更换后重试'))
    }
    return Promise.resolve()
  }

  const validateMeasurementUnit = (_: any, value?: string) => {
    const text = String(value || '').trim()
    if (!text) {
      return Promise.resolve()
    }
    if (text.length > 20) {
      return Promise.reject(new Error('请输入合法的计量单位'))
    }
    if (!/^[A-Za-z%次件]+$/.test(text)) {
      return Promise.reject(new Error('请输入合法的计量单位'))
    }
    return Promise.resolve()
  }

  const validateAliasTags = (_: any, value?: string[]) => {
    const list = compactArray((value || []).map(item => String(item || '').trim())).filter(Boolean)
    if (list.length > 10) {
      return Promise.reject(new Error('别名需唯一且不超过10个'))
    }
    if (list.some(item => item.length > 20)) {
      return Promise.reject(new Error('单个别名长度不能超过20个字符'))
    }
    const lowerSet = new Set(list.map(item => item.toLowerCase()))
    if (lowerSet.size !== list.length) {
      return Promise.reject(new Error('别名需唯一且不超过10个'))
    }
    const bizName = String(form.getFieldValue('bizName') || '').trim()
    if (bizName && list.includes(bizName)) {
      return Promise.reject(new Error('别名不能与指标名称相同'))
    }
    return Promise.resolve()
  }

  const validateBusinessRemark = (_: any, value?: string) => {
    const text = String(value || '').trim()
    if (!text) {
      return Promise.reject(new Error('请填写完整的业务口径描述（10-500字）'))
    }
    if (text.length < 10 || text.length > 500) {
      return Promise.reject(new Error('请填写完整的业务口径描述（10-500字）'))
    }
    if (isFieldNameLike(text)) {
      return Promise.reject(new Error('业务口径需为业务描述，不能仅填写字段名'))
    }
    return Promise.resolve()
  }

  const validateTechName = (_: any, value?: string) => {
    const text = String(value || '').trim()
    if (!text) {
      return Promise.reject(new Error('请输入合法的指标编码（大写字母开头，仅支持字母/数字/下划线，且不可重复）'))
    }
    if (text.length < 3 || text.length > 50) {
      return Promise.reject(new Error('请输入合法的指标编码（大写字母开头，仅支持字母/数字/下划线，且不可重复）'))
    }
    if (!/^[A-Z][A-Z0-9_]*$/.test(text)) {
      return Promise.reject(new Error('请输入合法的指标编码（大写字母开头，仅支持字母/数字/下划线，且不可重复）'))
    }

    const duplicate = existingItems.some(item => {
      if (!item.techName) {
        return false
      }
      if (editingItem?.termId && item.termId === editingItem.termId) {
        return false
      }
      return item.techName.trim() === text
    })
    if (duplicate) {
      return Promise.reject(new Error('指标编码已存在，请更换后重试'))
    }
    return Promise.resolve()
  }

  const validateTechnicalRemark = (_: any, value?: string) => {
    const text = String(value || '')
    if (!text) {
      return Promise.resolve()
    }
    if (!text.trim()) {
      return Promise.reject(new Error('请输入有效的技术口径描述'))
    }
    if (text.trim().length > 500) {
      return Promise.reject(new Error('请输入有效的技术口径描述'))
    }
    return Promise.resolve()
  }

  const validateThresholdValue = (_: any, value?: string) => {
    const text = String(value || '').trim()
    if (!text) {
      return Promise.resolve()
    }
    if (text.length > 15 || !isValidNumberInput(text)) {
      return Promise.reject(new Error('请输入有效的数值'))
    }
    return Promise.resolve()
  }

  const validateThresholdMax = async (_: any, value?: string) => {
    const text = String(value || '').trim()
    if (!text) {
      return Promise.resolve()
    }
    await validateThresholdValue(_, text)
    const minValue = String(form.getFieldValue('thresholdMin') || '').trim()
    if (minValue && Number(text) < Number(minValue)) {
      return Promise.reject(new Error('最大值不能小于最小值'))
    }
    return Promise.resolve()
  }

  const validateAccumulationDate = (_: any, value?: string) => {
    const text = String(value || '').trim()
    if (!text) {
      return Promise.reject(new Error('请选择有效的累加起点日期'))
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(new Date(text).valueOf())) {
      return Promise.reject(new Error('请选择有效的累加起点日期'))
    }
    const selectedTime = new Date(`${text}T00:00:00`).valueOf()
    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).valueOf()
    if (selectedTime > todayStart) {
      return Promise.reject(new Error('起点日期不能晚于当前日期'))
    }
    return Promise.resolve()
  }

  const validatePositiveInt = (value: any, messageText: string) => {
    const text = String(value ?? '').trim()
    if (!text || !/^[1-9]\d*$/.test(text)) {
      return Promise.reject(new Error(messageText))
    }
    return Promise.resolve()
  }

  const validateRollingWindow = (_: any, value?: number | string) => {
    const text = String(value ?? '').trim()
    if (!text || !/^[1-9]\d*$/.test(text)) {
      return Promise.reject(new Error('计算波动至少需要2个周期，窗口大小必须 ≥ 2'))
    }
    if (Number(text) < 2) {
      return Promise.reject(new Error('计算波动至少需要2个周期，窗口大小必须 ≥ 2'))
    }
    return Promise.resolve()
  }

  const validatePercentile = (_: any, value?: number | string) => {
    const text = String(value ?? '').trim()
    if (!text) {
      return Promise.reject(new Error('分位数值必须大于0且小于1'))
    }
    if (text.length > 6) {
      return Promise.reject(new Error('分位数值最多支持4位小数'))
    }
    if (!/^\d+(\.\d+)?$/.test(text)) {
      return Promise.reject(new Error('分位数值必须大于0且小于1'))
    }
    const decimalPart = text.split('.')[1] || ''
    if (decimalPart.length > 4) {
      return Promise.reject(new Error('分位数值最多支持4位小数'))
    }
    const num = Number(text)
    if (!(num > 0 && num < 1)) {
      return Promise.reject(new Error('分位数值必须大于0且小于1'))
    }
    return Promise.resolve()
  }

  const validateVariableName = (_: any, value?: string) => {
    const text = String(value || '').trim()
    if (!text) {
      return Promise.reject(new Error('变量名仅支持英文和数字，且需以字母开头'))
    }
    if (text.length > 10 || !/^[a-zA-Z][a-zA-Z0-9]*$/.test(text)) {
      return Promise.reject(new Error('变量名仅支持英文和数字，且需以字母开头'))
    }
    const reservedSet = new Set(['SUM', 'AVG', 'COUNT', 'MIN', 'MAX'])
    if (reservedSet.has(text.toUpperCase())) {
      return Promise.reject(new Error('该变量名已存在或与内置函数冲突'))
    }

    const rows = compactArray((form.getFieldValue('variableMappings') || []) as Array<{ variableName?: string }>)
    const rowNames = rows
      .map(item => String(item?.variableName || '').trim())
      .filter(Boolean)
      .map(item => item.toLowerCase())
    if (new Set(rowNames).size !== rowNames.length) {
      return Promise.reject(new Error('该变量名已存在或与内置函数冲突'))
    }
    return Promise.resolve()
  }

  const validateCustomExpression = (_: any, value?: string) => {
    const expr = String(value || '').trim()
    if (!expr) {
      return Promise.reject(new Error('表达式未引用任何变量或指标'))
    }
    if (expr.length > 2000) {
      return Promise.reject(new Error('表达式长度不能超过2000个字符'))
    }
    if (!isBalancedParentheses(expr)) {
      return Promise.reject(new Error('表达式缺少闭合的括号'))
    }
    if (/[+\-*/]{2,}/.test(expr.replace(/\*\*/g, ''))) {
      return Promise.reject(new Error('存在非法的连续运算符'))
    }

    const vars = compactArray<string>([
      String(form.getFieldValue('variableName') || '').trim(),
      ...compactArray((form.getFieldValue('variableMappings') || []) as Array<{ variableName?: string }>).map(item =>
        String(item?.variableName || '').trim()
      )
    ]).filter(Boolean)

    if (!vars.length) {
      return Promise.reject(new Error('表达式未引用任何变量或指标'))
    }

    const hasVar = vars.some(item => new RegExp(`\\b${item}\\b`).test(expr))
    if (!hasVar) {
      return Promise.reject(new Error('表达式未引用任何变量或指标'))
    }
    if (hasSqlSyntaxError(expr)) {
      return Promise.reject(new Error('SQL计算函数语法错误，请检查后重试'))
    }
    return Promise.resolve()
  }

  const validateSqlExpression = (_: any, value?: string) => {
    const expr = String(value || '').trim()
    if (!expr) {
      return Promise.reject(new Error('请输入计算逻辑'))
    }
    if (hasSqlSyntaxError(expr)) {
      return Promise.reject(new Error('SQL计算函数语法错误，请检查后重试'))
    }
    return Promise.resolve()
  }

  return {
    validateAccumulationDate,
    validateAliasTags,
    validateBusinessRemark,
    validateCustomExpression,
    validateIndicatorName,
    validateMeasurementUnit,
    validatePercentile,
    validatePositiveInt,
    validateRollingWindow,
    validateSqlExpression,
    validateTechName,
    validateTechnicalRemark,
    validateThresholdMax,
    validateThresholdValue,
    validateVariableName
  }
}
