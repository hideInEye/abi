import { describeStrictApiCallContract } from '../../../../../../service/request/strict-api-call-contract.test-helper'

describeStrictApiCallContract(import.meta.url, './hooks/useDimensionModeling.ts', [
  { guard: /assertFlatRequestSuccess\(res\)/, name: 'queryDimensionList' },
  { guard: /isApiSuccess\(res\)/, name: 'queryDimensionDetail' },
  { guard: /isApiSuccess\(res\)/, name: 'deleteDimensionModel' },
  { guard: /isApiSuccess\(res\)/, name: 'deleteDimensionModelBatch' },
  { guard: /isApiSuccess\(res\)/, name: 'editDimensionModel' },
  { guard: /isApiSuccess\(res\)/, name: 'addDimensionModel' },
  { guard: /isApiSuccess\(res\)/, name: 'batchCreateDimensionModels' },
  { guard: /isApiSuccess\(res\)/, name: 'queryDimensionHierarchyByDimId' },
  { guard: /isApiSuccess\(res\)/, name: 'editDimensionHierarchy' },
])

describeStrictApiCallContract(import.meta.url, './components/DimensionBatchMappingDrawer.tsx', [
  { guard: /assertFlatRequestSuccess\(res\)/, name: 'queryDimensionList' },
  { guard: /assertFlatRequestSuccess\(res\)/, name: 'queryTableSemanticsDetail' },
  { guard: /assertFlatRequestSuccess\(res\)/, name: 'schemalist' },
  { guard: /assertFlatRequestSuccess\(res\)/, name: 'tableSemanticsGroupList' },
])

describeStrictApiCallContract(import.meta.url, './components/DimensionOperateDrawer.tsx', [
  { guard: /assertFlatRequestSuccess\(res/, name: 'checkOntologyName', occurrences: 2 },
  { guard: /assertFlatRequestSuccess\(res\)/, name: 'queryTableSemanticsDetail' },
])

describeStrictApiCallContract(import.meta.url, './components/dimensionOperateDrawer/RelatedMetricsTab.tsx', [{ guard: /assertFlatRequestSuccess\(res\)/, name: 'queryKnowledgeIndicatorDetailList' }])

describeStrictApiCallContract(import.meta.url, './components/dimensionOperateDrawer/BaseInfoTab.tsx', [{ guard: /assertFlatRequestSuccess\(res\)/, name: 'queryOntologyLabels' }])

describeStrictApiCallContract(import.meta.url, './components/dimensionOperateDrawer/PreviewDataTab.tsx', [{ guard: /assertFlatRequestSuccess\(res\)/, name: 'queryDimensionPreview' }])
