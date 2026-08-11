type SelectedSemanticData = {
  schemaId?: unknown
  groupId?: unknown
}

type SelectedExcelData = {
  file_id?: unknown
}

/**
 * 交互和报告模式共用同一份数据前置条件。
 * 数据语义叶子（schemaId）、数据语义分组（groupId）与 Excel 任选一种即可发送，避免模式分流时绕过校验。
 */
export function hasSelectedConversationData(
  selectedData?: SelectedSemanticData | null,
  selectedExcel?: SelectedExcelData | null,
) {
  return Boolean(selectedData?.schemaId || selectedData?.groupId || selectedExcel?.file_id)
}
