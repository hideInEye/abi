import { InfoCircleOutlined, LinkOutlined, TableOutlined } from '@ant-design/icons'
import { message } from 'antd'
import type { TableColumnsType } from 'antd'
import CommonDrawer from '@/components/stateless/common/CommonDrawer'
import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { OntologyFormSectionTitle } from '@/pages/workbench/ontology-kg/components/OntologyFormSectionTitle'
import type { TableSemanticParams } from '@/pages/workbench/data-preparation/data-table-meaning/types'
import { queryTableSemanticsDetail, schemalist } from '@/service/api/data-table-meaning'
import { queryDimensionList } from '@/service/api/dimension-modeling'
import { tableSemanticsGroupList } from '@/service/api/table-semantics'

import { DIMENSION_TYPE_TEXT_MAP } from '../constants/dimensionModeling.constants'
import type { DimensionBatchMappingRow, DimensionModelItem, DimensionSchemaInfo } from '../types/dimensionModeling.types'
import { buildDimensionBatchRows, mapDimensionFromApi, normalizeRows } from '../utils/dimensionModeling.mapper'

interface Props {
  readonly groupId?: number
  readonly groupName?: string
  readonly onClose: (refresh?: boolean) => void
  readonly onSubmit: (rows: DimensionBatchMappingRow[], semanticsGroupId?: number | string) => Promise<boolean>
  readonly open: boolean
}

interface SemanticGroupOption {
  label: string
  value: number | string
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

export const DimensionBatchMappingDrawer: React.FC<Props> = ({ groupId, groupName, onClose, onSubmit, open }) => {
  const [groupOptions, setGroupOptions] = useState<SemanticGroupOption[]>([])
  const [selectedSemanticGroupId, setSelectedSemanticGroupId] = useState<number | string>()
  const [schemaNames, setSchemaNames] = useState<string[]>([])
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
    return normalizeRows(res).map(item => mapDimensionFromApi({ ...item, groupId, groupName }))
  }, [groupId, groupName])

  const fetchSchemaDetail = useCallback(async (schema: DimensionSchemaInfo): Promise<DimensionSchemaInfo> => {
    if (schema.modelDetail) {
      return schema
    }
    if (!schema.schemaId) {
      return schema
    }
    const res = await queryTableSemanticsDetail(schema.schemaId)
    const detail = getResponseData(res)
    return {
      ...schema,
      ...(detail && typeof detail === 'object' ? detail : {}),
      groupId: schema.groupId,
      schemaId: String((detail as any)?.schemaId || schema.schemaId)
    }
  }, [])

  const loadGroupFields = useCallback(
    async (nextGroupId: number | string) => {
      setSelectedSemanticGroupId(nextGroupId)
      setSchemaNames([])
      setFieldRows([])
      setSelectedRowKeys([])
      if (!hasValue(nextGroupId)) {
        return
      }
      setLoadingFields(true)
      try {
        const res = await schemalist({
          bizName: '',
          groupId: nextGroupId,
          pageNum: 1,
          pageSize: 1000
        })
        const schemaRows = normalizeList(getResponseData(res)) as DimensionSchemaInfo[]
        setSchemaNames(schemaRows.map(formatSchemaName))
        if (!schemaRows.length) {
          message.warning('当前数据语义组下没有数据语义')
          return
        }
        const [schemas, existingDimensions] = await Promise.all([
          Promise.all(schemaRows.map(fetchSchemaDetail)),
          loadExistingDimensions()
        ])
        const nextRows = buildDimensionBatchRows(schemas, existingDimensions)
        setFieldRows(nextRows)
        setSelectedRowKeys(nextRows.filter(item => !item.disabled).map(item => item.key))
        if (!nextRows.length) {
          message.warning('当前数据语义组下没有可生成的维度字段')
        }
      } catch {
        setSchemaNames([])
        setFieldRows([])
        setSelectedRowKeys([])
        message.error('查询数据语义字段失败')
      } finally {
        setLoadingFields(false)
      }
    },
    [fetchSchemaDetail, loadExistingDimensions]
  )

  useEffect(() => {
    if (!open) {
      setSelectedSemanticGroupId(undefined)
      setSchemaNames([])
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
        const rows = normalizeList(getResponseData(res))
        setGroupOptions(
          rows
            .map(item => ({
              label: String(item.groupName || ''),
              value: item.groupId
            }))
            .filter(item => item.label && hasValue(item.value))
        )
      } catch {
        setGroupOptions([])
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
        onClose(true)
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
          <AButton onClick={() => onClose()}>取消</AButton>
          <AButton disabled={!selectedRows.length} loading={saving} type="primary" onClick={handleSave}>
            一键生成维度
          </AButton>
        </ASpace>
      }
      open={open}
      title="一键维度映射"
      width="72%"
      onClose={() => onClose()}
    >
      <AAlert
        className="mb-6"
        icon={<InfoCircleOutlined />}
        message="选择数据语义组后，原型将该组下全部数据语义中的字段统一映射为维度；维度自定义仍沿用原新增维度流程。"
        showIcon
        type="info"
      />

      <AForm className="ds-form-section" layout="vertical">
        <OntologyFormSectionTitle icon={<LinkOutlined />}>语义来源</OntologyFormSectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <AForm.Item label="数据语义组" required>
            <ASelect
              allowClear
              loading={loadingGroups}
              optionFilterProp="label"
              options={groupOptions}
              placeholder="请选择数据语义组"
              showSearch
              value={selectedSemanticGroupId}
              onChange={loadGroupFields}
            />
          </AForm.Item>
          <AForm.Item label="映射范围">
            <AInput disabled value={schemaNames.length ? schemaNames.join('、') : '-'} />
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
