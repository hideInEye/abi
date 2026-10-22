import { FileTextOutlined, FolderOutlined, InfoCircleOutlined, LinkOutlined, TableOutlined } from '@ant-design/icons'
import { message } from 'antd'
import type { TableColumnsType } from 'antd'
import CommonDrawer from '@/components/stateless/common/CommonDrawer'
import React, { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'

import { OntologyFormSectionTitle } from '@/pages/workbench/ontology-kg/components/OntologyFormSectionTitle'
import type { TableSemanticParams } from '@/pages/workbench/data-preparation/data-table-meaning/types'
import { buildGroupTree } from '@/pages/workbench/data-preparation/data-table-meaning/utils/helper'
import { queryTableSemanticsDetail, schemalist } from '@/service/api/data-table-meaning'
import { queryDimensionList } from '@/service/api/dimension-modeling'
import { tableSemanticsGroupList } from '@/service/api/table-semantics'
import { assertFlatRequestSuccess } from '@/service/request/flat-result'

import { DIMENSION_TYPE_TEXT_MAP } from '../constants/dimensionModeling.constants'
import type { DimensionBatchMappingRow, DimensionModelItem, DimensionSchemaInfo } from '../types/dimensionModeling.types'
import { buildDimensionBatchRows, mapDimensionFromApi, normalizeRows } from '../utils/dimensionModeling.mapper'

interface Props {
  readonly groupId?: number | string
  readonly groupName?: string
  readonly onClose: (refresh?: boolean) => void
  readonly onSubmit: (rows: DimensionBatchMappingRow[], semanticsGroupId?: number | string) => Promise<boolean>
  readonly open: boolean
}

interface SemanticGroupOption {
  groupId: number | string
  groupName: string
  parentId?: number | string
  sortOrder?: number
}

interface SemanticSchemaTreeOption {
  label: string
  value: number | string
}

interface CachedSchemaOptions {
  originalOptions: DimensionSchemaInfo[]
  schemaOptions: SemanticSchemaTreeOption[]
}

function getSpaceId() {
  return Number(localStorage.getItem('spaceId')) || 0
}

function getResponseData(res: any) {
  if (Array.isArray(res)) {
    return res
  }
  return res?.data ?? res?.response?.data?.data ?? res?.response?.data
}

function normalizeList(data: any): any[] {
  if (Array.isArray(data)) {
    return data
  }
  if (Array.isArray(data?.list)) {
    return data.list
  }
  if (Array.isArray(data?.records)) {
    return data.records
  }
  if (Array.isArray(data?.data)) {
    return data.data
  }
  if (Array.isArray(data?.data?.list)) {
    return data.data.list
  }
  if (Array.isArray(data?.data?.records)) {
    return data.data.records
  }
  return []
}

function hasValue(value: unknown) {
  return value !== undefined && value !== null && value !== ''
}

function formatSchemaName(item: Partial<TableSemanticParams>) {
  return String(item.bizName || item.techName || item.schemaId || '-')
}

function buildGroupTreeValue(groupId: number | string) {
  return `semantic-group-${String(groupId)}`
}

function renderSemanticTreeTitle(label: ReactNode, type: 'group' | 'schema') {
  const Icon = type === 'group' ? FolderOutlined : FileTextOutlined

  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <Icon className={type === 'group' ? 'text-#358cf3 text-15px' : 'text-#afd1fa text-14px'} />
      <span className="truncate">{label}</span>
    </span>
  )
}

export const DimensionBatchMappingDrawer: React.FC<Props> = ({ groupId, groupName, onClose, onSubmit, open }) => {
  const [groupOptions, setGroupOptions] = useState<SemanticGroupOption[]>([])
  const [selectedSemanticGroupId, setSelectedSemanticGroupId] = useState<number | string>()
  const [selectedSemanticSchemaId, setSelectedSemanticSchemaId] = useState<number | string>()
  const [schemaOptionsByGroup, setSchemaOptionsByGroup] = useState<Record<string, CachedSchemaOptions>>({})
  const [fieldRows, setFieldRows] = useState<DimensionBatchMappingRow[]>([])
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [loadingGroups, setLoadingGroups] = useState(false)
  const [loadingFields, setLoadingFields] = useState(false)
  const [saving, setSaving] = useState(false)

  const loadExistingDimensions = useCallback(async (): Promise<DimensionModelItem[]> => {
    if (!groupId) {
      return []
    }
    const res = await queryDimensionList({
      groupId,
      pageNum: 1,
      pageSize: 1000,
      spaceId: getSpaceId()
    })
    assertFlatRequestSuccess(res)
    return normalizeRows(res).map(item => mapDimensionFromApi({ ...item, groupId, groupName }))
  }, [groupId, groupName])

  const dataTree = useMemo(() => {
    const buildNodes = (groups: SemanticGroupOption[]): any[] =>
      groups.map((group) => {
        const cachedOptions = schemaOptionsByGroup[String(group.groupId)]?.schemaOptions
        const childGroupNodes = Array.isArray((group as any).children) ? buildNodes((group as any).children) : []
        const schemaNodes = cachedOptions?.map(schema => ({
          isLeaf: true,
          searchLabel: schema.label,
          title: renderSemanticTreeTitle(schema.label, 'schema'),
          value: schema.value
        })) || []
        const children = [...childGroupNodes, ...schemaNodes]

        return {
          ...(children.length || schemaOptionsByGroup[String(group.groupId)] ? { children } : {}),
          isLeaf: false,
          searchLabel: group.groupName,
          selectable: false,
          title: renderSemanticTreeTitle(group.groupName, 'group'),
          value: buildGroupTreeValue(group.groupId)
        }
      })

    return buildNodes(buildGroupTree(groupOptions, '0', true))
  }, [groupOptions, schemaOptionsByGroup])

  function findSchemaGroup(schemaId: number | string) {
    return Object.entries(schemaOptionsByGroup).find(([, groupSchemas]) =>
      groupSchemas.schemaOptions.some(schema => String(schema.value) === String(schemaId))
    )
  }

  const fetchSchemaDetail = useCallback(async (schema: DimensionSchemaInfo): Promise<DimensionSchemaInfo> => {
    if (schema.modelDetail) {
      return schema
    }
    if (!schema.schemaId) {
      return schema
    }
    const res = await queryTableSemanticsDetail(schema.schemaId)
    assertFlatRequestSuccess(res)
    const detail = getResponseData(res)
    return {
      ...schema,
      ...(detail && typeof detail === 'object' ? detail : {}),
      groupId: schema.groupId,
      schemaId: String((detail as any)?.schemaId || schema.schemaId)
    }
  }, [])

  const loadGroupSchemas = useCallback(async (nextGroupId: number | string): Promise<DimensionSchemaInfo[]> => {
    const res = await schemalist({
      bizName: '',
      groupId: String(nextGroupId),
      pageNum: 1,
      pageSize: 1000
    })
    assertFlatRequestSuccess(res)
    const schemaRows = normalizeList(getResponseData(res)) as DimensionSchemaInfo[]
    setSchemaOptionsByGroup(prev => ({
      ...prev,
      [String(nextGroupId)]: {
        originalOptions: schemaRows,
        schemaOptions: schemaRows
          .map(item => ({
            label: formatSchemaName(item),
            value: item.schemaId
          }))
          .filter(item => hasValue(item.value))
      }
    }))
    return schemaRows
  }, [])

  const loadSchemaFields = useCallback(
    async (nextGroupId?: number | string, nextSchemaId?: number | string) => {
      setSelectedSemanticGroupId(nextGroupId)
      setSelectedSemanticSchemaId(nextSchemaId)
      setFieldRows([])
      setSelectedRowKeys([])
      if (!hasValue(nextGroupId) || !hasValue(nextSchemaId)) {
        return
      }
      setLoadingFields(true)
      try {
        const schemaRows = await loadGroupSchemas(nextGroupId)
        const selectedSchema = schemaRows.find(item => String(item.schemaId) === String(nextSchemaId))
        if (!selectedSchema) {
          message.warning('未找到选中的数据语义')
          return
        }
        const [schema, existingDimensions] = await Promise.all([
          fetchSchemaDetail(selectedSchema),
          loadExistingDimensions()
        ])
        const nextRows = buildDimensionBatchRows([schema], existingDimensions)
        setFieldRows(nextRows)
        setSelectedRowKeys(nextRows.filter(item => !item.disabled).map(item => item.key))
        if (!nextRows.length) {
          message.warning('当前数据语义下没有可生成的维度字段')
        }
      } catch {
        setFieldRows([])
        setSelectedRowKeys([])
        message.error('查询数据语义字段失败')
      } finally {
        setLoadingFields(false)
      }
    },
    [fetchSchemaDetail, loadExistingDimensions, loadGroupSchemas]
  )

  const handleDataChange = useCallback((nextValue?: number | string) => {
    if (!nextValue) {
      loadSchemaFields(undefined, undefined)
      return
    }
    const matchedGroupEntry = findSchemaGroup(nextValue)
    const matchedGroupId = matchedGroupEntry?.[0]
    if (!matchedGroupId) {
      return
    }
    loadSchemaFields(matchedGroupId, nextValue)
  }, [schemaOptionsByGroup, loadSchemaFields])

  const handleTreeExpand = useCallback((expandedValues: React.Key[]) => {
    expandedValues.forEach((value) => {
      const rawValue = String(value || '')
      const selectedGroup = groupOptions.find(item => buildGroupTreeValue(item.groupId) === rawValue)
      if (selectedGroup && !schemaOptionsByGroup[String(selectedGroup.groupId)]) {
        void loadGroupSchemas(selectedGroup.groupId).catch(() => undefined)
      }
    })
  }, [groupOptions, loadGroupSchemas, schemaOptionsByGroup])

  const handleLoadTreeData = useCallback((node: { value?: number | string }) => {
    const rawValue = String(node.value || '')
    const selectedGroup = groupOptions.find(item => buildGroupTreeValue(item.groupId) === rawValue)
    if (!selectedGroup || schemaOptionsByGroup[String(selectedGroup.groupId)]) {
      return Promise.resolve()
    }
    return loadGroupSchemas(selectedGroup.groupId).then(() => undefined).catch(() => undefined)
  }, [groupOptions, loadGroupSchemas, schemaOptionsByGroup])

  useEffect(() => {
    if (!open) {
      setSelectedSemanticGroupId(undefined)
      setSelectedSemanticSchemaId(undefined)
      setSchemaOptionsByGroup({})
      setFieldRows([])
      setSelectedRowKeys([])
      setLoadingFields(false)
      setSaving(false)
      return
    }

    const loadGroups = async () => {
      setLoadingGroups(true)
      try {
        const res = await tableSemanticsGroupList({
          groupName: '',
          groupType: 'shema',
          pageNum: 1,
          pageSize: 100,
          spaceId: getSpaceId()
        })
        assertFlatRequestSuccess(res)
        const rows = normalizeList(getResponseData(res))
        setGroupOptions(
          rows
            .map(item => ({
              groupId: item.groupId,
              groupName: String(item.groupName || ''),
              parentId: item.parentId ?? 0,
              sortOrder: Number(item.sortOrder ?? 0)
            }))
            .filter(item => item.groupName && hasValue(item.groupId))
        )
        setSchemaOptionsByGroup({})
      } catch {
        setGroupOptions([])
        setSchemaOptionsByGroup({})
        message.error('查询数据语义组失败')
      } finally {
        setLoadingGroups(false)
      }
    }

    loadGroups()
  }, [open])

  const selectedRows = useMemo(() => {
    const keySet = new Set(selectedRowKeys.map(String))
    return fieldRows.filter(item => keySet.has(String(item.key)) && !item.disabled)
  }, [fieldRows, selectedRowKeys])

  const handleSave = async () => {
    if (!selectedRows.length) {
      message.warning('请选择未生成的维度字段')
      return
    }
    setSaving(true)
    try {
      const success = await onSubmit(selectedRows, selectedSemanticGroupId)
      if (success) {
        onClose()
      }
    } finally {
      setSaving(false)
    }
  }

  const columns: TableColumnsType<DimensionBatchMappingRow> = [
    {
      dataIndex: ['field', 'fieldName'],
      key: 'fieldName',
      render: (_: string, record) => record.field.fieldName || record.field.techId || '-',
      title: '字段名'
    },
    {
      dataIndex: ['field', 'bizName'],
      key: 'bizName',
      title: '中文名'
    },
    {
      dataIndex: 'semanticSchemaName',
      key: 'semanticSchemaName',
      title: '来源数据语义'
    },
    {
      dataIndex: 'dimType',
      key: 'dimType',
      render: (value: string) => (
        <span className="inline-flex items-center gap-2 font-semibold">
          <span className={value === 'time' ? 'h-2 w-2 rounded-full bg-emerald-500' : 'h-2 w-2 rounded-full bg-slate-300'} />
          {DIMENSION_TYPE_TEXT_MAP[value] || value}
        </span>
      ),
      title: '生成维度类型'
    }
  ]

  return (
    <CommonDrawer
      destroyOnClose
      footer={
        <ASpace className="w-full justify-end">
          <AButton disabled={saving} onClick={() => onClose()}>取消</AButton>
          <AButton disabled={!selectedRows.length} loading={saving} type="primary" onClick={handleSave}>
            一键生成维度
          </AButton>
        </ASpace>
      }
      open={open}
      title="一键维度映射"
      width="72%"
      onClose={() => {
        if (!saving) onClose()
      }}
    >
      <AAlert
        className="mb-6"
        icon={<InfoCircleOutlined />}
        message="选择数据后，将该数据语义中的维度字段统一映射为维度；维度自定义仍沿用原新增维度流程。"
        showIcon
        type="info"
      />

      <AForm className="ds-form-section" layout="vertical">
        <OntologyFormSectionTitle icon={<LinkOutlined />}>语义来源</OntologyFormSectionTitle>
        <div className="grid grid-cols-1 gap-4">
          <AForm.Item label="数据" required>
            <ATreeSelect
              allowClear
              loadData={handleLoadTreeData}
              loading={loadingGroups || loadingFields}
              placeholder="请选择数据"
              showSearch
              treeData={dataTree}
              treeExpandAction="click"
              filterTreeNode={(inputValue, treeNode) => String((treeNode as { searchLabel?: number | string })?.searchLabel || '').toLowerCase().includes(inputValue.toLowerCase())}
              value={hasValue(selectedSemanticSchemaId) ? selectedSemanticSchemaId : undefined}
              onTreeExpand={handleTreeExpand}
              onChange={handleDataChange}
            />
          </AForm.Item>
        </div>
      </AForm>

      <div className="ds-form-section mt-4">
        <OntologyFormSectionTitle icon={<TableOutlined />}>待生成维度预览</OntologyFormSectionTitle>
        <ATable<DimensionBatchMappingRow>
          columns={columns}
          dataSource={fieldRows}
          loading={loadingFields}
          pagination={false}
          rowKey="key"
          rowSelection={{
            getCheckboxProps: record => ({
              disabled: record.disabled
            }),
            selectedRowKeys,
            onChange: keys => setSelectedRowKeys(keys)
          }}
          scroll={{ x: 900, y: 520 }}
        />
      </div>
    </CommonDrawer>
  )
}
