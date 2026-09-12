import { message } from 'antd'
import { useCallback, useEffect, useRef, useState } from 'react'

import { queryDictionaryDataByType } from '@/service/api/dictionary'
import {
  createSemanticRule,
  deleteSemanticRule,
  getSemanticRuleDetail,
  querySemanticRuleList,
  updateSemanticRule
} from '@/service/api/semantic-rules'
import { assertFlatRequestSuccess } from '@/service/request/flat-result'

import {
  buildSemanticRuleCreateParams,
  buildSemanticRuleListParams,
  buildSemanticRuleStatusUpdateParams,
  buildSemanticRuleUpdateParams
} from '../semantic-list-model'
import {
  adaptSemanticDictionaryOptions,
  adaptSemanticRuleDetail,
  adaptSemanticRulePage
} from '../semantic-rule-adapter'
import type {
  SemanticDictionaryOption,
  SemanticRule,
  SemanticRuleDraft,
  SemanticRuleFilters,
  SemanticRuleId
} from '../types'

const BUSINESS_CATEGORY_DICT_TYPE = 'semantic_biz_type'
const MATCH_TARGET_DICT_TYPE = 'semantic_match_target'

interface UseSemanticListManagementParams {
  filters: SemanticRuleFilters
  pageNum: number
  pageSize: number
  spaceId: number
}

interface UseSemanticListManagementResult {
  businessCategoryOptions: SemanticDictionaryOption[]
  createRule: (draft: SemanticRuleDraft) => Promise<void>
  deleteRule: (ruleId: SemanticRuleId) => Promise<void>
  dictionaryLoading: boolean
  fetchRuleDetail: (ruleId: SemanticRuleId) => Promise<SemanticRule>
  loading: boolean
  matchTargetOptions: SemanticDictionaryOption[]
  refresh: () => Promise<boolean>
  rules: SemanticRule[]
  total: number
  updateRule: (rule: SemanticRule, draft: SemanticRuleDraft) => Promise<void>
  updateRuleStatus: (rule: SemanticRule, enabled: boolean) => Promise<void>
}

async function loadDictionary(dictType: string): Promise<SemanticDictionaryOption[]> {
  const result = await queryDictionaryDataByType(dictType)
  assertFlatRequestSuccess(result)
  return adaptSemanticDictionaryOptions(result)
}

export function useSemanticListManagement({
  filters,
  pageNum,
  pageSize,
  spaceId
}: UseSemanticListManagementParams): UseSemanticListManagementResult {
  const [rules, setRules] = useState<SemanticRule[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [dictionaryLoading, setDictionaryLoading] = useState(false)
  const [businessCategoryOptions, setBusinessCategoryOptions] = useState<SemanticDictionaryOption[]>([])
  const [matchTargetOptions, setMatchTargetOptions] = useState<SemanticDictionaryOption[]>([])
  const activeSpaceId = useRef(spaceId)
  activeSpaceId.current = spaceId
  const listRequestSequence = useRef(0)
  const dictionaryRequestSequence = useRef(0)

  const refresh = useCallback(async (): Promise<boolean> => {
    if (activeSpaceId.current !== spaceId) return false
    listRequestSequence.current += 1
    const requestId = listRequestSequence.current

    if (spaceId <= 0) {
      setRules([])
      setTotal(0)
      setLoading(false)
      return false
    }

    setLoading(true)
    try {
      const result = await querySemanticRuleList(buildSemanticRuleListParams({ filters, pageNum, pageSize, spaceId }))
      assertFlatRequestSuccess(result)
      if (requestId !== listRequestSequence.current || activeSpaceId.current !== spaceId) return false

      const page = adaptSemanticRulePage(result)
      setRules(page.records)
      setTotal(page.total)
      return true
    } catch {
      if (requestId === listRequestSequence.current && activeSpaceId.current === spaceId) {
        message.error('语义名单加载失败，请稍后重试')
      }
      return false
    } finally {
      if (requestId === listRequestSequence.current && activeSpaceId.current === spaceId) setLoading(false)
    }
  }, [filters, pageNum, pageSize, spaceId])

  const loadDictionaries = useCallback(async (): Promise<void> => {
    dictionaryRequestSequence.current += 1
    const requestId = dictionaryRequestSequence.current
    setDictionaryLoading(true)

    const [businessResult, targetResult] = await Promise.allSettled([
      loadDictionary(BUSINESS_CATEGORY_DICT_TYPE),
      loadDictionary(MATCH_TARGET_DICT_TYPE)
    ])
    if (requestId !== dictionaryRequestSequence.current) return

    if (businessResult.status === 'fulfilled') {
      setBusinessCategoryOptions(businessResult.value)
    } else {
      setBusinessCategoryOptions([])
      message.error('业务类别字典加载失败，请稍后重试')
    }

    if (targetResult.status === 'fulfilled') {
      setMatchTargetOptions(targetResult.value)
    } else {
      setMatchTargetOptions([])
      message.error('匹配目标字典加载失败，请稍后重试')
    }
    setDictionaryLoading(false)
  }, [])

  useEffect(() => {
    listRequestSequence.current += 1
    setRules([])
    setTotal(0)
  }, [spaceId])

  useEffect(() => {
    refresh().catch(() => undefined)
    return () => {
      listRequestSequence.current += 1
    }
  }, [refresh])

  useEffect(() => {
    loadDictionaries().catch(() => undefined)
    return () => {
      dictionaryRequestSequence.current += 1
    }
  }, [loadDictionaries])

  const fetchRuleDetail = useCallback(async (ruleId: SemanticRuleId): Promise<SemanticRule> => {
    const result = await getSemanticRuleDetail(ruleId)
    assertFlatRequestSuccess(result)
    const rule = adaptSemanticRuleDetail(result)
    if (!rule) throw new Error('规则详情数据格式异常')
    return rule
  }, [])

  const createRule = useCallback(
    async (draft: SemanticRuleDraft): Promise<void> => {
      const result = await createSemanticRule(buildSemanticRuleCreateParams(spaceId, draft))
      assertFlatRequestSuccess(result)
    },
    [spaceId]
  )

  const updateRule = useCallback(
    async (rule: SemanticRule, draft: SemanticRuleDraft): Promise<void> => {
      const result = await updateSemanticRule(buildSemanticRuleUpdateParams({ draft, rule, spaceId }))
      assertFlatRequestSuccess(result)
    },
    [spaceId]
  )

  const updateRuleStatus = useCallback(
    async (rule: SemanticRule, enabled: boolean): Promise<void> => {
      const result = await updateSemanticRule(buildSemanticRuleStatusUpdateParams(spaceId, rule, enabled))
      assertFlatRequestSuccess(result)
      if (activeSpaceId.current !== spaceId) return
      setRules(currentRules =>
        currentRules.map(currentRule => (currentRule.id === rule.id ? { ...currentRule, enabled } : currentRule))
      )
    },
    [spaceId]
  )

  const deleteRule = useCallback(
    async (ruleId: SemanticRuleId): Promise<void> => {
      const result = await deleteSemanticRule(ruleId)
      assertFlatRequestSuccess(result)
      if (activeSpaceId.current !== spaceId) return
      setRules(currentRules => currentRules.filter(rule => rule.id !== ruleId))
      setTotal(currentTotal => Math.max(0, currentTotal - 1))
    },
    [spaceId]
  )

  return {
    businessCategoryOptions,
    createRule,
    deleteRule,
    dictionaryLoading,
    fetchRuleDetail,
    loading,
    matchTargetOptions,
    refresh,
    rules,
    total,
    updateRule,
    updateRuleStatus
  }
}
