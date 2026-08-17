import { message } from 'antd'
import CommonDrawer from '@/components/stateless/common/CommonDrawer'
import React from 'react'

import { DEFAULT_DIMENSION_TIME_FORMAT, DEFAULT_FORM_VALUES } from '../constants/dimensionModeling.constants'
import type { DimensionFieldOption, DimensionFormValues, DimensionModelItem, DimensionSchemaInfo } from '../types/dimensionModeling.types'
import { buildFormValues, buildSchemaFieldOptions, filterSelectableFields, getDimensionFieldLookupKeys, normalizeDetail, normalizeDimensionSelectedFieldsToOptionKeys } from '../utils/dimensionModeling.mapper'
import { checkOntologyName } from '@/service/api/ontology-name'
import { queryTableSemanticsDetail } from '@/service/api/data-table-meaning'
import { isOntologyNameCheckPassed, restoreMappedBizName, restoreMappedTechName, validateCustomBizNameText, validateCustomTechNameText } from '../../../utils/ontologyName'
import { validateFieldsAndScroll } from '../../../../utils/form-scroll'

import { BaseInfoTab } from './dimensionOperateDrawer/BaseInfoTab'
import { FieldSelectModal } from './dimensionOperateDrawer/FieldSelectModal'
import { PreviewDataTab } from './dimensionOperateDrawer/PreviewDataTab'
import { RelatedMetricsTab } from './dimensionOperateDrawer/RelatedMetricsTab'

interface Props {
  readonly editingItem: DimensionModelItem | null
  readonly groupId?: number | string
  readonly groupName?: string
  readonly onClose: (refresh?: boolean) => void
  readonly onGoMetricModeling?: () => void
  readonly onOpenHierarchy: (record: DimensionModelItem) => void
  readonly onSubmit: (params: { formValues: DimensionFormValues; id?: number; relatedFields: DimensionFieldOption[]; selectedSchema?: DimensionSchemaInfo }) => Promise<boolean>
  readonly open: boolean
}

function buildFieldLookupMap(fields: DimensionFieldOption[]) {
  const map = new Map<string, DimensionFieldOption>()
  fields.forEach(field => {
    getDimensionFieldLookupKeys(field).forEach(key => {
      if (!map.has(key)) {
        map.set(key, field)
      }
    })
  })
  return map
}

function buildFieldDetailLookupMap(detailMap: Record<string, Partial<DimensionFieldOption>>) {
  const map = new Map<string, Partial<DimensionFieldOption>>()
  Object.entries(detailMap).forEach(([key, field]) => {
    const detail = {
      ...field,
      key: field.key || key
    }
    const lookupKeys = [key, ...getDimensionFieldLookupKeys(detail)]
    lookupKeys.forEach(item => {
      const lookupKey = String(item || '').trim()
      if (lookupKey && !map.has(lookupKey)) {
        map.set(lookupKey, detail)
      }
    })
  })
  return map
}

export const DimensionOperateDrawer: React.FC<Props> = ({ editingItem, groupId, groupName, onClose, onGoMetricModeling, onOpenHierarchy, onSubmit, open }) => {
  const [form] = AForm.useForm<DimensionFormValues>()
  const [activeTab, setActiveTab] = useState('base')
  const [schemaOptions, setSchemaOptions] = useState<DimensionSchemaInfo[]>([])
  const [viewId, setViewId] = useState<number | undefined>(editingItem?.viewId)
  const [fieldModalOpen, setFieldModalOpen] = useState(false)
  const [relatedMetricTotal, setRelatedMetricTotal] = useState(0)
  const [selectedFieldKeys, setSelectedFieldKeys] = useState<string[]>([])
  const [fieldDetailMap, setFieldDetailMap] = useState<Record<string, Partial<DimensionFieldOption>>>({})
  const schemaDetailRequestedRef = useRef(new Set<string>())

  const selectedDimType = (AForm.useWatch('dimType', form) || DEFAULT_FORM_VALUES.dimType) as 'std' | 'time'
  const selectedSchemaId = AForm.useWatch('semanticSchemaId', form)
  const semanticsGroupIdVal = AForm.useWatch('semanticsGroupId', form)
  const semanticGroupIdVal = AForm.useWatch('semanticGroupId', form)
  const selectedSemanticGroupId = semanticsGroupIdVal || semanticGroupIdVal || editingItem?.semanticsGroupId || editingItem?.semanticGroupId

  const selectedSchema = useMemo(() => {
    if (selectedSchemaId === undefined || selectedSchemaId === null || selectedSchemaId === '') {
      return undefined
    }
    return schemaOptions.find((item) => String(item.schemaId) === String(selectedSchemaId))
  }, [schemaOptions, selectedSchemaId])

  const allSchemaFields = useMemo(() => buildSchemaFieldOptions(selectedSchema), [selectedSchema])
  const filteredFields = useMemo(() => filterSelectableFields(allSchemaFields, selectedDimType), [allSchemaFields, selectedDimType])

  const selectedFields = useMemo(() => {
    if (!selectedFieldKeys.length) {
      return []
    }
    const fallbackFieldMap = buildFieldLookupMap(editingItem?.relatedFields || [])
    const schemaFieldMap = buildFieldLookupMap(filteredFields)
    const detailFieldMap = buildFieldDetailLookupMap(fieldDetailMap)
    return selectedFieldKeys
      .map((key) => {
        const baseField = schemaFieldMap.get(key) || fallbackFieldMap.get(key)
        if (!baseField) {
          return null
        }
        const detail = detailFieldMap.get(key)
        return {
          ...baseField,
          ...detail,
          timeFormat: detail?.timeFormat || baseField.timeFormat || DEFAULT_DIMENSION_TIME_FORMAT
        }
      })
      .filter((item): item is DimensionFieldOption => Boolean(item))
  }, [editingItem?.relatedFields, fieldDetailMap, filteredFields, selectedFieldKeys])
  const fieldModalSelectedKeys = useMemo(
    () => normalizeDimensionSelectedFieldsToOptionKeys(selectedFields, filteredFields, selectedFieldKeys),
    [filteredFields, selectedFieldKeys, selectedFields]
  )

  const handleFieldChange = useCallback((fieldKey: string, patch: Partial<DimensionFieldOption>) => {
    setFieldDetailMap(prev => ({
      ...prev,
      [fieldKey]: {
        ...(prev[fieldKey] || {}),
        key: fieldKey,
        techId: prev[fieldKey]?.techId || fieldKey,
        ...patch
      }
    }))
  }, [])

  const validateZhName = useCallback(async (_: unknown, value?: string) => {
    const error = validateCustomBizNameText(value, '中文名')
    if (error) {
      return Promise.reject(new Error(error))
    }
    const nextName = restoreMappedBizName(value, form.getFieldValue('mappedBizNameFieldName'))
    const currentName = editingItem?.rawZhName || editingItem?.zhName || ''
    if (!groupId || nextName === currentName) {
      return Promise.resolve()
    }
    try {
      const res = await checkOntologyName({
        groupId,
        name: nextName,
        nameType: 'bizName',
        objectType: 'dimension',
        spaceId: Number(localStorage.getItem('spaceId')) || 0
      })
      if (!isOntologyNameCheckPassed(res)) {
        return Promise.reject(new Error('中文名已存在'))
      }
    } catch {
      return Promise.reject(new Error('中文名校验失败，请稍后重试'))
    }
    return Promise.resolve()
  }, [editingItem?.rawZhName, editingItem?.zhName, form, groupId])

  const validateEnglishName = useCallback(async (_: unknown, value?: string) => {
    const text = String(value || '').trim()
    if (text.length > 64) {
      return Promise.reject(new Error('长度不能超过64'))
    }
    const error = validateCustomTechNameText(text, '英文名')
    if (error) {
      return Promise.reject(new Error(error))
    }
    const nextName = restoreMappedTechName(text, form.getFieldValue('mappedTechNameTableName'))
    const currentName = editingItem?.rawEnglishName || editingItem?.englishName || ''
    if (!groupId || nextName === currentName) {
      return Promise.resolve()
    }
    try {
      const res = await checkOntologyName({
        groupId,
        name: nextName,
        nameType: 'techName',
        objectType: 'dimension',
        spaceId: Number(localStorage.getItem('spaceId')) || 0
      })
      if (!isOntologyNameCheckPassed(res)) {
        return Promise.reject(new Error('英文名已存在'))
      }
    } catch {
      return Promise.reject(new Error('英文名校验失败，请稍后重试'))
    }
    return Promise.resolve()
  }, [editingItem?.englishName, editingItem?.rawEnglishName, form, groupId])

  useEffect(() => {
    if (!open || !selectedSchemaId || selectedSchema?.modelDetail) {
      return
    }

    const schemaKey = String(selectedSchemaId)
    if (schemaDetailRequestedRef.current.has(schemaKey)) {
      return
    }
    schemaDetailRequestedRef.current.add(schemaKey)

    let ignore = false
    const loadSchemaDetail = async () => {
      try {
        const res = await queryTableSemanticsDetail(selectedSchemaId)
        const detail = normalizeDetail(res)
        if (ignore || !detail) {
          return
        }
        const nextSchema = {
          ...(selectedSchema || {}),
          ...detail,
          groupId: detail.groupId ?? selectedSchema?.groupId ?? form.getFieldValue('semanticsGroupId') ?? form.getFieldValue('semanticGroupId'),
          relViewId: detail.relViewId ?? selectedSchema?.relViewId,
          schemaId: detail.schemaId ?? selectedSchema?.schemaId ?? selectedSchemaId
        } as DimensionSchemaInfo

        setSchemaOptions(prev => {
          const hasSchema = prev.some(item => String(item.schemaId) === schemaKey)
          if (!hasSchema) {
            return [...prev, nextSchema]
          }
          return prev.map(item => (String(item.schemaId) === schemaKey ? { ...item, ...nextSchema } : item))
        })
      } catch {
        schemaDetailRequestedRef.current.delete(schemaKey)
      }
    }

    loadSchemaDetail()

    return () => {
      ignore = true
    }
  }, [form, open, selectedSchema, selectedSchemaId])

  useEffect(() => {
    if (!selectedFieldKeys.length || !selectedSchema) {
      return
    }
    const validKeySet = new Set(
      [...filteredFields, ...(editingItem?.relatedFields || [])]
        .flatMap(field => getDimensionFieldLookupKeys(field))
    )
    const safeKeys = selectedFieldKeys.filter(key => validKeySet.has(String(key || '').trim()))
    if (safeKeys.length !== selectedFieldKeys.length) {
      setSelectedFieldKeys(safeKeys)
      form.setFieldValue('relatedFieldKeys', safeKeys)
      setFieldDetailMap(prev => Object.fromEntries(Object.entries(prev).filter(([key]) => safeKeys.includes(key))))
    }
  }, [editingItem?.relatedFields, filteredFields, form, selectedFieldKeys, selectedSchema])

  useEffect(() => {
    if (!open) {
      return
    }
    setActiveTab('base')
    setRelatedMetricTotal(editingItem?.relatedMetrics?.length || 0)
    setSchemaOptions([])
    setViewId(editingItem?.viewId)
    schemaDetailRequestedRef.current.clear()

    if (editingItem) {
      const editValues = buildFormValues(editingItem)
      form.setFieldsValue({
        ...DEFAULT_FORM_VALUES,
        ...editValues,
        groupId: groupId || editingItem.groupId,
      })
      setSelectedFieldKeys(editValues.relatedFieldKeys || [])
      setFieldDetailMap(
        Object.fromEntries(
          (editingItem.relatedFields || []).map(field => [
            field.key,
            {
              ...field,
              timeFormat: field.timeFormat || DEFAULT_DIMENSION_TIME_FORMAT
            }
          ])
        )
      )
      return
    }

    form.setFieldsValue({
      ...DEFAULT_FORM_VALUES,
      groupId,
    })
    setSelectedFieldKeys([])
    setFieldDetailMap({})
  }, [editingItem, form, groupId, open])

  const getSchemaId = ({ semanticSchemaId, semanticsGroupId, viewId: nextViewId }: { semanticSchemaId: number | string; semanticsGroupId: number | string | null; viewId: number | string }) => {
    setViewId(nextViewId)
    setSelectedFieldKeys([])
    setFieldDetailMap({})
    form.setFieldsValue({
      relatedFieldKeys: [],
      semanticSchemaId,
      semanticsGroupId: semanticsGroupId || undefined,
    })
  }

  const handleSave = async (openHierarchyAfterSave = false) => {
    const formValues = await validateFieldsAndScroll<DimensionFormValues>(form)
    if (!formValues) {
      return
    }
    const values = {
      ...formValues,
      mappedBizNameFieldName: form.getFieldValue('mappedBizNameFieldName'),
      mappedTechNameTableName: form.getFieldValue('mappedTechNameTableName'),
    }
    if (!groupId) {
      message.error('请先选择维度分组')
      return
    }
    const success = await onSubmit({
      formValues: values,
      id: editingItem?.id,
      relatedFields: selectedFields,
      selectedSchema,
    })
    if (!success) {
      return
    }
    const nextRecord: DimensionModelItem = {
      ...(editingItem || {}),
      dimType: values.dimType,
      englishName: values.englishName,
      groupId,
      groupName,
      id: editingItem?.id || 0,
      owner: values.owner,
      path: editingItem?.path || groupName || '-',
      relatedFields: selectedFields,
      status: values.status,
      timeGranularity: values.timeGranularity,
      updateTime: editingItem?.updateTime || '-',
      viewId,
      zhName: values.zhName,
    }

    if (openHierarchyAfterSave) {
      handleDrawerClose(true)
      onOpenHierarchy(nextRecord)
      return
    }
    handleDrawerClose(true)
  }

  const createFooter = (
    <div className="flex justify-end gap-3">
      <AButton onClick={() => handleDrawerClose()}>取消</AButton>
      <AButton type="primary" onClick={() => handleSave(false)}>
        保存
      </AButton>
      <AButton onClick={() => handleSave(true)}>保存并配置层级</AButton>
    </div>
  )

  const editFooter = (
    <div className="flex justify-end gap-3">
      <AButton onClick={() => handleDrawerClose()}>取消</AButton>
      <AButton type="primary" onClick={() => handleSave(false)}>
        保存修改
      </AButton>
    </div>
  )

  function resetDrawerState() {
    form.resetFields()
    setActiveTab('base')
    setRelatedMetricTotal(0)
    setSchemaOptions([])
    setViewId(undefined)
    setFieldModalOpen(false)
    setSelectedFieldKeys([])
    setFieldDetailMap({})
    schemaDetailRequestedRef.current.clear()
  }

  function handleDrawerClose(refresh?: boolean) {
    resetDrawerState()
    onClose(refresh)
  }

  function handleGoMetricModeling() {
    handleDrawerClose()
    onGoMetricModeling?.()
  }

  return (
    <>
      <CommonDrawer
        destroyOnClose
        extra={editingItem ? null : <span className="text-xs text-gray-400">所在分组：{groupName || '-'}</span>}
        footer={editingItem ? editFooter : createFooter}
        open={open}
        title={editingItem ? '编辑维度' : '新建维度'}
        width="60%"
        onClose={() => handleDrawerClose()}
      >
        {editingItem ? (
          <ATabs
            activeKey={activeTab}
            className="mb-4"
            items={[
              { key: 'base', label: '基础信息' },
              { key: 'metrics', label: `相关指标 (${relatedMetricTotal})` },
              { key: 'preview', label: '预览数据' },
            ]}
            onChange={setActiveTab}
          />
        ) : null}

        {activeTab === 'base' ? (
          <AForm<DimensionFormValues>
            className="ds-form-section"
            form={form}
            layout="vertical"
            onValuesChange={(changeValues) => {
              if (Object.hasOwn(changeValues, 'semanticSchemaId')) {
                setSelectedFieldKeys([])
                form.setFieldValue('relatedFieldKeys', [])
              }
            }}
          >
            <BaseInfoTab
              fieldTableData={selectedFields}
              form={form}
              getSchemaId={getSchemaId}
              groupName={groupName || editingItem?.groupName}
              isEdit={Boolean(editingItem)}
              selectedDimType={selectedDimType}
              selectedSemanticGroupId={selectedSemanticGroupId}
              setSchemaOptions={setSchemaOptions}
              validateEnglishName={validateEnglishName}
              validateZhName={validateZhName}
              onFieldChange={handleFieldChange}
              onOpenFieldModal={() => {
                if (!selectedSchemaId) {
                  message.warning('请先选择数据')
                  return
                }
                setFieldModalOpen(true)
              }}
            />
          </AForm>
        ) : null}

        {activeTab === 'metrics' ? <RelatedMetricsTab record={editingItem} onGoMetricModeling={handleGoMetricModeling} onTotalChange={setRelatedMetricTotal} /> : null}

        {activeTab === 'preview' ? <PreviewDataTab dimId={editingItem?.id} fieldTableData={selectedFields} sampleValues={form.getFieldValue('sampleValues')} type={selectedDimType} /> : null}
      </CommonDrawer>

      <FieldSelectModal
        open={fieldModalOpen}
        options={filteredFields}
        selectedKeys={fieldModalSelectedKeys}
        onCancel={() => setFieldModalOpen(false)}
        onConfirm={(keys) => {
          setSelectedFieldKeys(keys)
          form.setFieldValue('relatedFieldKeys', keys)
          setFieldDetailMap(prev => {
            const schemaFieldMap = buildFieldLookupMap(filteredFields)
            const detailFieldMap = buildFieldDetailLookupMap(prev)
            return Object.fromEntries(
              keys.map(key => {
                const option = schemaFieldMap.get(key)
                const detail = detailFieldMap.get(key)
                return [
                  key,
                  {
                    ...(detail || {}),
                    key,
                    fieldName: detail?.fieldName || option?.fieldName,
                    rtableName: detail?.rtableName || option?.rtableName,
                    sourceTableName: detail?.sourceTableName || option?.sourceTableName,
                    tableName: detail?.tableName || option?.tableName,
                    tableRemarks: detail?.tableRemarks || option?.tableRemarks,
                    tdesc: detail?.tdesc || option?.tdesc,
                    techId: detail?.techId || option?.techId || key,
                    techName: detail?.techName || option?.techName,
                    tfieldName: detail?.tfieldName || option?.tfieldName,
                    timeFormat: detail?.timeFormat || option?.timeFormat || DEFAULT_DIMENSION_TIME_FORMAT
                  }
                ]
              })
            )
          })
          setFieldModalOpen(false)
        }}
      />
    </>
  )
}
