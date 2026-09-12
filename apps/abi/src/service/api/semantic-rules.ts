import type {
  SemanticRuleCreateParams,
  SemanticRuleId,
  SemanticRuleListParams,
  SemanticRuleStatusUpdateParams,
  SemanticRuleUpdateParams
} from '@/pages/component/data/semantic-list/types'

import { apiRequest } from '../request'

const SEMANTIC_RULE_API_PREFIX = '/api/copilot/v1/semanticRules'

export function querySemanticRuleList(params: SemanticRuleListParams) {
  return apiRequest<unknown>({
    method: 'get',
    params,
    url: `${SEMANTIC_RULE_API_PREFIX}/list`
  })
}

export function createSemanticRule(data: SemanticRuleCreateParams) {
  return apiRequest<unknown>({
    data,
    method: 'post',
    url: SEMANTIC_RULE_API_PREFIX
  })
}

export function updateSemanticRule(data: SemanticRuleStatusUpdateParams | SemanticRuleUpdateParams) {
  return apiRequest<unknown>({
    data,
    method: 'put',
    url: SEMANTIC_RULE_API_PREFIX
  })
}

export function deleteSemanticRule(ruleId: SemanticRuleId) {
  return apiRequest<unknown>({
    method: 'delete',
    url: `${SEMANTIC_RULE_API_PREFIX}/${encodeURIComponent(String(ruleId))}`
  })
}

export function getSemanticRuleDetail(ruleId: SemanticRuleId) {
  return apiRequest<unknown>({
    method: 'get',
    url: `${SEMANTIC_RULE_API_PREFIX}/${encodeURIComponent(String(ruleId))}`
  })
}
