import { describeStrictApiCallContract } from '../../../../service/request/strict-api-call-contract.test-helper'

describeStrictApiCallContract(import.meta.url, './hooks/useSemanticListManagement.ts', [
  { guard: /assertFlatRequestSuccess\(result\)/, name: 'queryDictionaryDataByType' },
  { guard: /assertFlatRequestSuccess\(result\)/, name: 'querySemanticRuleList' },
  { guard: /assertFlatRequestSuccess\(result\)/, name: 'getSemanticRuleDetail' },
  { guard: /assertFlatRequestSuccess\(result\)/, name: 'createSemanticRule' },
  { guard: /assertFlatRequestSuccess\(result\)/, name: 'updateSemanticRule', occurrences: 2 },
  { guard: /assertFlatRequestSuccess\(result\)/, name: 'deleteSemanticRule' }
])
