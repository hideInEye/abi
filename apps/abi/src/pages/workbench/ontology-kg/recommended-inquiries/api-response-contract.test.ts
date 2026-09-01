import { describeStrictApiCallContract } from '../../../../service/request/strict-api-call-contract.test-helper'

describeStrictApiCallContract(import.meta.url, './hooks/useQuestionManagement.ts', [
  { guard: /isFlatRequestSuccess\(result\)/, name: 'queryQuestion' },
  { guard: /isFlatRequestSuccess\(res\)/, name: 'addQuestion' },
  { guard: /assertFlatRequestSuccess\(res/, name: 'deleteQuestion' },
  { guard: /isFlatRequestSuccess\(res\)/, name: 'editQuestion' },
])

describeStrictApiCallContract(import.meta.url, './hooks/useAssistant.ts', [{ guard: /isFlatRequestSuccess\(res\)/, name: 'fetchAssistantConfigList' }])
