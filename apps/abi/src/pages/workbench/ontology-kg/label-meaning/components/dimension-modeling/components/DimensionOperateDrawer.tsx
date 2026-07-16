import { message } from 'antd'
import CommonDrawer from '@/components/stateless/common/CommonDrawer'
import React from 'react'

import { DEFAULT_DIMENSION_TIME_FORMAT, DEFAULT_FORM_VALUES } from '../constants/dimensionModeling.constants'
import type { DimensionFieldOption, DimensionFormValues, DimensionModelItem, DimensionSchemaInfo } from '../types/dimensionModeling.types'
import { buildFormValues, buildSchemaFieldOptions, filterSelectableFields } from '../utils/dimensionModeling.mapper'

import { BaseInfoTab } from './dimensionOperateDrawer/BaseInfoTab'
import { FieldSelectModal } from './dimensionOperateDrawer/FieldSelectModal'
import { PreviewDataTab } from './dimensionOperateDrawer/PreviewDataTab'
import { RelatedMetricsTab } from './dimensionOperateDrawer/RelatedMetricsTab'

interface Props {
  readonly editingItem: DimensionModelItem | null
  readonly groupId?: number
  readonly groupName?: string
  readonly onClose: (refresh?: boolean) => void
  readonly onGoMetricModeling?: () => void
  readonly onOpenHierarchy: (record: DimensionModelItem) => void
  readonly onSubmit: (params: { formValues: DimensionFormValues; id?: number; relatedFields: DimensionFieldOption[]; selectedSchema?: DimensionSchemaInfo }) => Promise<boolean>
  readonly open: boolean
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

  const selectedDimType = (AForm.useWatch('dimType', form) || DEFAULT_FORM_VALUES.dimType) as 'std' | 'time'
  const selectedSchemaId = AForm.useWatch('semanticSchemaId', form)

  const selectedSchema = useMemo(() => schemaOptions.find((item) => Number(item.schemaId) === Number(selectedSchemaId)), [schemaOptions, selectedSchemaId])

  const allSchemaFields = useMemo(() => buildSchemaFieldOptions(selectedSchema), [selectedSchema])
  const filteredFields = useMemo(() => filterSelectableFields(allSchemaFields, selectedDimType), [allSchemaFields, selectedDimType])

  const selectedFields = useMemo(() => {
    if (!selectedFieldKeys.length) {
      return []
    }
    const fallbackFieldMap = new Map((editingItem?.relatedFields || []).map((item) => [item.key, item]))
    const schemaFieldMap = new Map(filteredFields.map((item) => [item.key, item]))
    return selectedFieldKeys
      .map((key) => {
        const baseField = schemaFieldMap.get(key) || fallbackFieldMap.get(key)
        if (!baseField) {
          return null
        }
        const detail = fieldDetailMap[key]
        return {
          ...baseField,
          ...detail,
          timeFormat: detail?.timeFormat || baseField.timeFormat || DEFAULT_DIMENSION_TIME_FORMAT
        }
      })
      .filter((item): item is DimensionFieldOption => Boolean(item))
  }, [editingItem?.relatedFields, fieldDetailMap, filteredFields, selectedFieldKeys])

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

  useEffect(() => {
    if (!selectedFieldKeys.length || !selectedSchema) {
      return
    }
    const keySet = new Set(selectedFieldKeys)
    const safeKeys = filteredFields.filter((field) => keySet.has(field.key)).map((item) => item.key)
    if (safeKeys.length !== selectedFieldKeys.length) {
      setSelectedFieldKeys(safeKeys)
      form.setFieldValue('relatedFieldKeys', safeKeys)
      setFieldDetailMap(prev => Object.fromEntries(Object.entries(prev).filter(([key]) => safeKeys.includes(key))))
    }
  }, [filteredFields, form, selectedFieldKeys, selectedSchema])

  useEffect(() => {
    if (!open) {
      return
    }
    setActiveTab('base')
    setRelatedMetricTotal(editingItem?.relatedMetrics?.length || 0)
    setSchemaOptions([])
    setViewId(editingItem?.viewId)

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

  const getSchemaId = ({ semanticSchemaId, semanticsGroupId, viewId: nextViewId }: { semanticSchemaId: number; semanticsGroupId: number | null; viewId: number }) => {
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
    const values = await form.validateFields()
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
              setSchemaOptions={setSchemaOptions}
              onFieldChange={handleFieldChange}
              onOpenFieldModal={() => {
                if (!selectedSchemaId) {
                  message.warning('请先选择表语义')
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
        selectedKeys={selectedFieldKeys}
        onCancel={() => setFieldModalOpen(false)}
        onConfirm={(keys) => {
          setSelectedFieldKeys(keys)
          form.setFieldValue('relatedFieldKeys', keys)
          setFieldDetailMap(prev =>
            Object.fromEntries(
              keys.map(key => [
                key,
                {
                  ...(prev[key] || {}),
                  key,
                  techId: prev[key]?.techId || key,
                  timeFormat: prev[key]?.timeFormat || DEFAULT_DIMENSION_TIME_FORMAT
                }
              ])
            )
          )
          setFieldModalOpen(false)
        }}
      />
    </>
  )
}
