/* eslint-disable complexity */
import { LinkOutlined, TableOutlined } from '@ant-design/icons'
import { message } from 'antd'
import type { TableColumnsType } from 'antd'
import React from 'react'

import CommonDrawer from '@/components/stateless/common/CommonDrawer'
import { TableSemantics } from '@/components/tableSemantics'
import type { TableSemanticParams } from '@/pages/workbench/data-preparation/data-table-meaning/types'
import { OntologyFormSectionTitle } from '@/pages/workbench/ontology-kg/components/OntologyFormSectionTitle'
import { validateFieldsAndScroll } from '@/pages/workbench/ontology-kg/utils/form-scroll'
import { queryTableSemanticsDetail } from '@/service/api/data-table-meaning'
import { queryKnowledgeIndicators } from '@/service/api/knowledge-extraction'
import { assertFlatRequestSuccess } from '@/service/request/flat-result'

import { buildMappedBizName, buildMappedTechName } from '../../../utils/ontologyName'
import { AGG_METHOD_OPTIONS } from '../constants/metricModeling.constants'
import type { AtomicMappingPayload, KnowledgeIndicatorItem, KnowledgeTechField } from '../types/metricModeling.types'
import { getKnowledgeSpaceId } from '../utils/space'

interface MeasureFieldItem {
  alias: string
  bizName: string
  description: string
  englishName: string
  fieldType: string
  key: string
  projectionFunc: string
  raw: KnowledgeTechField
  tableBizName: string
  tableTechName: string
}

interface MappingFormValues {
  semanticGroupId?: number | string
  semanticSchemaId?: number | string
  semanticsGroupId?: number | string
}

interface Props {
  readonly groupId?: string
  readonly groupName?: string
  readonly onClose: (refresh?: boolean) => void
  readonly onSubmit: (payload: AtomicMappingPayload[]) => Promise<boolean>
  readonly open: boolean
}

// eslint-disable-next-line complexity
function parseMeasureFields(modelDetail: unknown, schemaDetail?: Record<string, unknown>): MeasureFieldItem[] {
  if (!modelDetail) {
    return []
  }
  try {
    const detail = typeof modelDetail === 'string' ? JSON.parse(modelDetail) : modelDetail
    const schemaBizName = String(
      schemaDetail?.rtableName ||
        schemaDetail?.bizName ||
        schemaDetail?.schemaName ||
        schemaDetail?.name ||
        schemaDetail?.techName ||
        ''
    ).trim()
    const schemaTechName = String(
      schemaDetail?.tableName ||
        schemaDetail?.techName ||
        schemaDetail?.originName ||
        schemaDetail?.schemaName ||
        schemaDetail?.name ||
        ''
    ).trim()
    const measures = Array.isArray((detail as { measures?: unknown[] })?.measures)
      ? (detail as { measures: KnowledgeTechField[] }).measures
      : []
    return measures
      .map(item => {
        const key = String(item?.techId || item?.tfieldId || item?.fieldName || item?.originName || '').trim()
        if (!key) {
          return null
        }
        const englishName =
          String(item?.techName || item?.originName || item?.fieldName || item?.tfieldName || key).trim() || key
        const bizName =
          String(item?.bizName || item?.tfieldAlias || item?.fieldShortName || item?.fieldName || englishName).trim() ||
          englishName
        return {
          alias: String(item?.alias || bizName).trim() || bizName,
          bizName,
          description: String(item?.description || '').trim(),
          englishName,
          fieldType: String(item?.fieldType || item?.tfieldType || '-').trim() || '-',
          key,
          projectionFunc: String(item?.projectionFunc || item?.agg || 'sum'),
          raw: {
            ...item,
            techId: key
          },
          tableBizName: String(item?.rtableName || item?.tableBizName || schemaBizName).trim(),
          tableTechName: String(item?.tableName || schemaTechName).trim()
        }
      })
      .filter(Boolean) as MeasureFieldItem[]
  } catch {
    return []
  }
}

function getResponseData(res: any) {
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

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value
  }
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function extractTechKeys(value: unknown): string[] {
  const parsed = parseMaybeJson(value)
  if (Array.isArray(parsed)) {
    return parsed.flatMap(item => extractTechKeys(item))
  }
  if (parsed && typeof parsed === 'object') {
    const item = parsed as KnowledgeTechField
    return [String(item.techId || item.tfieldId || item.fieldName || item.originName || item.name || '').trim()].filter(
      Boolean
    )
  }
  if (typeof parsed === 'string') {
    return parsed
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
  }
  return []
}

function getExistingAtomicKeys(items: KnowledgeIndicatorItem[]) {
  return new Set(items.flatMap(item => extractTechKeys(item.techId)))
}

function hasFieldValue(value: unknown) {
  return value !== undefined && value !== null && value !== ''
}

export const KnowledgeAtomicMappingDrawer: React.FC<Props> = ({ groupId, groupName, onClose, onSubmit, open }) => {
  const [form] = AForm.useForm<MappingFormValues>()
  const [fieldRows, setFieldRows] = useState<MeasureFieldItem[]>([])
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [disabledRowKeys, setDisabledRowKeys] = useState<React.Key[]>([])
  const [loadingFields, setLoadingFields] = useState(false)
  const [saving, setSaving] = useState(false)
  const [semanticLocked, setSemanticLocked] = useState(false)

  const queryCurrentGroupAtomicIndicators = useCallback(async () => {
    if (!groupId) {
      return []
    }
    const res = await queryKnowledgeIndicators({
      groupId,
      indicatorClass: 'atomic',
      pageNum: 1,
      pageSize: 1000,
      spaceId: getKnowledgeSpaceId()
    })
    assertFlatRequestSuccess(res)
    return normalizeList(getResponseData(res)) as KnowledgeIndicatorItem[]
  }, [groupId])

  const loadSchemaFields = useCallback(
    async (
      semanticSchemaId: number | string,
      options?: { existingAtomicItems?: KnowledgeIndicatorItem[]; keepExistingSelection?: boolean }
    ) => {
      setLoadingFields(true)
      try {
        const res = await queryTableSemanticsDetail(semanticSchemaId)
        assertFlatRequestSuccess(res)
        const detail = getResponseData(res)
        const nextRows = parseMeasureFields(detail?.modelDetail, detail)
        let existingKeys = getExistingAtomicKeys(options?.existingAtomicItems || [])
        if (!options?.existingAtomicItems) {
          existingKeys = getExistingAtomicKeys(await queryCurrentGroupAtomicIndicators())
        }
        const disabledKeys = nextRows.filter(item => existingKeys.has(item.key)).map(item => item.key)
        setFieldRows(nextRows)
        setDisabledRowKeys(disabledKeys)
        setSelectedRowKeys(options?.keepExistingSelection ? disabledKeys : [])
        if (!nextRows.length) {
          message.warning('当前数据语义下没有可映射的度量字段')
        }
      } catch {
        setFieldRows([])
        setSelectedRowKeys([])
        setDisabledRowKeys([])
        message.error('查询数据语义字段失败')
      } finally {
        setLoadingFields(false)
      }
    },
    [queryCurrentGroupAtomicIndicators]
  )

  const handleSchemaChange = async ({
    semanticGroupId,
    semanticSchemaId,
    semanticsGroupId
  }: {
    semanticGroupId: number | string | null
    semanticSchemaId: number | string
    semanticsGroupId: number | string | null
    viewId: number | string
  }) => {
    form.setFieldsValue({
      semanticGroupId: semanticGroupId ?? semanticsGroupId ?? undefined,
      semanticSchemaId,
      semanticsGroupId: semanticsGroupId ?? semanticGroupId ?? undefined
    })
    await loadSchemaFields(semanticSchemaId)
  }

  useEffect(() => {
    if (!open) {
      form.resetFields()
      setFieldRows([])
      setSelectedRowKeys([])
      setDisabledRowKeys([])
      setLoadingFields(false)
      setSaving(false)
      setSemanticLocked(false)
    }
  }, [form, open])

  useEffect(() => {
    if (!open || !groupId) {
      return
    }

    const loadExistingAtomicMapping = async () => {
      setSemanticLocked(true)
      try {
        const atomicItems = await queryCurrentGroupAtomicIndicators()
        if (!atomicItems.length) {
          setSemanticLocked(false)
          return
        }

        const firstAtomic = atomicItems[0] as Record<string, unknown>
        const semanticsGroupId = (firstAtomic.semanticsGroupId ?? firstAtomic.semanticGroupId) as
          | number
          | string
          | undefined
        const semanticSchemaId = (firstAtomic.relSchemaId ?? firstAtomic.semanticSchemaId ?? firstAtomic.schemaId) as
          | number
          | string
          | undefined
        if (!hasFieldValue(semanticsGroupId) || !hasFieldValue(semanticSchemaId)) {
          setSemanticLocked(false)
          return
        }

        form.setFieldsValue({
          semanticGroupId: semanticsGroupId,
          semanticSchemaId,
          semanticsGroupId
        })
        setSemanticLocked(true)
        await loadSchemaFields(semanticSchemaId as string | number, {
          existingAtomicItems: atomicItems,
          keepExistingSelection: true
        })
      } catch {
        message.error('查询已有原子指标映射失败')
      }
    }

    loadExistingAtomicMapping()
  }, [form, groupId, loadSchemaFields, open, queryCurrentGroupAtomicIndicators])

  const handleSave = async () => {
    const values = await validateFieldsAndScroll<MappingFormValues>(form)
    if (!values) {
      return
    }
    if (!values.semanticSchemaId) {
      return
    }
    const disabledKeySet = new Set(disabledRowKeys.map(item => String(item)))
    const selectedRows = fieldRows.filter(item => selectedRowKeys.includes(item.key) && !disabledKeySet.has(item.key))

    if (!selectedRows.length) {
      message.warning('请选择未映射的度量字段')
      return
    }

    const semanticSchemaId = values.semanticSchemaId
    const semanticsGroupId = values.semanticsGroupId ?? values.semanticGroupId
    if (!hasFieldValue(semanticSchemaId)) {
      return
    }
    const payload: AtomicMappingPayload[] = selectedRows.map(item => ({
      groupId,
      projectionFunc: item.projectionFunc || 'sum',
      relSchemaId: semanticSchemaId as number | string,
      semanticsGroupId,
      spaceId: getKnowledgeSpaceId(),
      techId: [
        {
          ...item.raw,
          alias: item.alias,
          bizName: buildMappedBizName(item.tableBizName, item.bizName),
          description: item.description,
          englishName: item.englishName,
          fieldType: item.fieldType,
          projectionFunc: item.projectionFunc || 'sum',
          techId: String(item.raw?.techId ?? item.key),
          techName: buildMappedTechName(item.tableTechName, item.englishName)
        }
      ]
    }))

    setSaving(true)
    try {
      const success = await onSubmit(payload)
      if (!success) {
        return
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const columns: TableColumnsType<MeasureFieldItem> = [
    {
      dataIndex: 'englishName',
      key: 'englishName',
      title: '英文名称'
    },
    {
      dataIndex: 'fieldType',
      key: 'fieldType',
      title: '字段类型'
    },
    {
      key: 'semanticType',
      render: () => (
        <ASelect
          disabled
          options={[{ label: '度量', value: 'measure' }]}
          value="measure"
        />
      ),
      title: '语义类型'
    },
    {
      dataIndex: 'projectionFunc',
      key: 'projectionFunc',
      render: (value: string, record: MeasureFieldItem) => (
        <ASelect
          options={AGG_METHOD_OPTIONS}
          placeholder="请选择聚合方式"
          value={value || 'sum'}
          onChange={projectionFunc =>
            setFieldRows(prev => prev.map(item => (item.key === record.key ? { ...item, projectionFunc } : item)))
          }
        />
      ),
      title: '聚合方式'
    },
    {
      dataIndex: 'bizName',
      key: 'bizName',
      render: (value: string, record: MeasureFieldItem) => (
        <AInput
          value={value}
          onChange={e => {
            const nextValue = e.target.value
            setFieldRows(prev => prev.map(item => (item.key === record.key ? { ...item, bizName: nextValue } : item)))
          }}
        />
      ),
      title: '中文名称'
    },
    {
      dataIndex: 'alias',
      key: 'alias',
      render: (value: string, record: MeasureFieldItem) => (
        <AInput
          value={value}
          onChange={e => {
            const nextValue = e.target.value
            setFieldRows(prev => prev.map(item => (item.key === record.key ? { ...item, alias: nextValue } : item)))
          }}
        />
      ),
      title: '别名'
    },
    {
      dataIndex: 'description',
      key: 'description',
      render: (value: string, record: MeasureFieldItem) => (
        <AInput
          value={value}
          onChange={e => {
            const nextValue = e.target.value
            setFieldRows(prev =>
              prev.map(item => (item.key === record.key ? { ...item, description: nextValue } : item))
            )
          }}
        />
      ),
      title: '字段描述'
    }
  ]

  return (
    <CommonDrawer
      open={open}
      title="原子指标映射配置"
      width="60%"
      footer={
        <ASpace className="w-full justify-end">
          <AButton disabled={saving} onClick={() => onClose()}>取消</AButton>
          <AButton
            loading={saving}
            type="primary"
            onClick={handleSave}
          >
            保存绑定并映射
          </AButton>
        </ASpace>
      }
      onClose={() => {
        if (!saving) onClose()
      }}
    >
      <div className="mb-4 rounded bg-gray-50 px-3 py-2 text-sm">当前分组：{groupName || '-'}</div>
      <AForm<MappingFormValues>
        className="ds-form-section"
        form={form}
        layout="vertical"
      >
        <OntologyFormSectionTitle icon={<LinkOutlined />}>语义来源</OntologyFormSectionTitle>
        <TableSemantics
          form={form}
          getSchemaId={handleSchemaChange}
          getSchemaOptions={(_: TableSemanticParams[]) => {}}
          groupFieldName="semanticsGroupId"
          isEdit={semanticLocked}
          type="shema"
        />
      </AForm>

      <div className="ds-form-section mt-4">
        <OntologyFormSectionTitle icon={<TableOutlined />}>字段映射原子指标</OntologyFormSectionTitle>
        <ATable
          columns={columns}
          dataSource={fieldRows}
          loading={loadingFields}
          pagination={false}
          rowKey="key"
          scroll={{ x: 1200, y: 520 }}
          rowSelection={{
            getCheckboxProps: record => ({
              disabled: disabledRowKeys.includes(record.key)
            }),
            onChange: keys => setSelectedRowKeys(keys),
            selectedRowKeys
          }}
        />
      </div>
    </CommonDrawer>
  )
}
