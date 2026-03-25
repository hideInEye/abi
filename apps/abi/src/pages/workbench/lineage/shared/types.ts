export type LineageStatus = '0' | '1'

export interface LineageRelation {
  create_by?: string
  create_time?: string
  lineage_id: number | string
  relation_type: string
  remark?: string
  source_node_id: number | string
  source_node_name?: string
  source_node_type: string
  space_id?: number
  status: LineageStatus
  target_node_id: number | string
  target_node_name?: string
  target_node_type: string
  update_by?: string
  update_time?: string
}

export interface LineageNode {
  id: number | string
  label?: string
  type: string
}
