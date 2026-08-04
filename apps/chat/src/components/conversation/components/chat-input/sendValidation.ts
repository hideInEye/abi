type SelectedSemanticData = {
  schemaId?: unknown
}

type SelectedExcelData = {
  file_id?: unknown
}

/**
 * 交互和报告模式共用同一份数据前置条件。
 * 数据语义与 Excel 任意选择一种即可发送，避免模式分流时绕过校验。
 */
export function hasSelectedConversationData(
  selectedData?: SelectedSemanticData | null,
  selectedExcel?: SelectedExcelData | null,
) {
  return Boolean(selectedData?.schemaId || selectedExcel?.file_id)
}
