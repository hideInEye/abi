import { ApartmentOutlined, InfoCircleOutlined, LinkOutlined, ProfileOutlined, TeamOutlined } from '@ant-design/icons'
import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { TableSemantics } from '@/components/tableSemantics'
import { OntologyFormSectionTitle } from '@/pages/workbench/ontology-kg/components/OntologyFormSectionTitle'
import { getMappedBizNameParts } from '@/pages/workbench/ontology-kg/label-meaning/utils/ontologyName'
import { queryOntologyLabels } from '@/service/api/ontology-network'
import { assertFlatRequestSuccess } from '@/service/request/flat-result'

import {
  DEFAULT_DIMENSION_TIME_FORMAT,
  DIMENSION_DRILL_DIRECTION_OPTIONS,
  DIMENSION_STATUS_OPTIONS,
  DIMENSION_TIME_FORMAT_OPTIONS,
  DIMENSION_TIME_GRANULARITY_OPTIONS,
  DIMENSION_TYPE_OPTIONS,
  DIMENSION_UPDATE_FREQ_OPTIONS
} from '../../constants/dimensionModeling.constants'
import type { DimensionFieldOption, DimensionSchemaInfo } from '../../types/dimensionModeling.types'

function formatFieldLabel(item: DimensionFieldOption) {
  const bizNameParts = getMappedBizNameParts(item.bizName || item.techId)
  const bizName = bizNameParts.isMapped ? bizNameParts.fieldName || bizNameParts.displayName : bizNameParts.displayName
  const originName = item.originName || item.techId
  return `${bizName}(${originName})`
}

function getLastSelectValue(value: unknown) {
  if (!Array.isArray(value)) {
    return value === undefined || value === null ? '' : String(value).trim()
  }
  const nextValue = value[value.length - 1]
  return nextValue === undefined || nextValue === null ? '' : String(nextValue).trim()
}

function getSelectOptionLabel(option: unknown) {
  const optionItem = Array.isArray(option) ? option[option.length - 1] : option
  const label = optionItem && typeof optionItem === 'object' ? (optionItem as { label?: unknown }).label : undefined

  return typeof label === 'string' || typeof label === 'number' ? String(label).trim() : ''
}

interface Props {
  readonly fieldTableData: DimensionFieldOption[]
  readonly form: any
  readonly getSchemaId: ({
    semanticSchemaId,
    semanticsGroupId,
    viewId
  }: {
    semanticSchemaId: number | string
    semanticsGroupId: number | string | null
    viewId: number | string
  }) => void
  readonly groupName?: string
  readonly isEdit: boolean
  readonly onFieldChange: (fieldKey: string, patch: Partial<DimensionFieldOption>) => void
  readonly onOpenFieldModal: () => void
  readonly selectedDimType: 'std' | 'time'
  readonly selectedSemanticGroupId?: number | string | null
  readonly setSchemaOptions: (schemaOptions: DimensionSchemaInfo[]) => void
  readonly validateEnglishName: (_: unknown, value?: string) => Promise<void>
  readonly validateZhName: (_: unknown, value?: string) => Promise<void>
}

export const BaseInfoTab: React.FC<Props> = ({
  fieldTableData,
  form,
  getSchemaId,
  groupName,
  isEdit,
  onFieldChange,
  onOpenFieldModal,
  selectedDimType,
  selectedSemanticGroupId,
  setSchemaOptions,
  validateEnglishName,
  validateZhName
}) => {
  const [categoryOptions, setCategoryOptions] = useState<Array<{ label: string; value: string }>>([])
  const categoryLabelMap = useMemo(() => new Map(categoryOptions.map(item => [item.value, item.label])), [categoryOptions])
  const syncDimCategoryName = useCallback((value: unknown, option?: unknown) => {
    const nextValue = getLastSelectValue(value)
    const nextName = getSelectOptionLabel(option) || categoryLabelMap.get(nextValue) || nextValue

    form.setFieldValue('dimCategoryName', nextName || undefined)
  }, [categoryLabelMap, form])

  const loadCategoryOptions = useCallback(async () => {
    try {
      const res = await queryOntologyLabels({
        moduleType: 'DIM',
        spaceId: localStorage.getItem('spaceId') || '',
        type: 'RECOMMENDED'
      })
      assertFlatRequestSuccess(res)
      const nextOptions = Array.isArray(res?.data)
        ? res.data
            .map(item => ({ label: item.bizName, value: item.id === undefined || item.id === null ? '' : String(item.id) }))
            .filter(item => item.label && item.value)
        : []
      setCategoryOptions(nextOptions)
    } catch {
      setCategoryOptions([])
    }
  }, [])

  useEffect(() => {
    loadCategoryOptions()
  }, [loadCategoryOptions])

  useEffect(() => {
    const currentValue = getLastSelectValue(form.getFieldValue('dimCategory'))
    if (!currentValue) {
      form.setFieldValue('dimCategoryName', undefined)
      return
    }

    const nextName = categoryLabelMap.get(currentValue) || form.getFieldValue('dimCategoryName') || currentValue
    form.setFieldValue('dimCategoryName', nextName)
  }, [categoryLabelMap, form])

  const fieldTableColumns = useMemo(() => {
    const columns: any[] = [
      {
        dataIndex: 'bizName',
        key: 'bizName',
        render: (_: string, record: DimensionFieldOption) => formatFieldLabel(record),
        title: '字段名'
      },
      { dataIndex: 'fieldType', key: 'fieldType', title: '字段类型 (field_type)' },
      {
        dataIndex: 'sourceTableName',
        key: 'sourceTableName',
        render: (value: string) => value || '-',
        title: '来源表'
      }
    ]

    if (selectedDimType === 'time') {
      columns.push({
        dataIndex: 'timeFormat',
        key: 'timeFormat',
        render: (value: string, record: DimensionFieldOption) => (
          <ASelect
            options={DIMENSION_TIME_FORMAT_OPTIONS}
            size="small"
            value={value || DEFAULT_DIMENSION_TIME_FORMAT}
            onChange={nextValue => onFieldChange(record.key, { timeFormat: nextValue })}
          />
        ),
        title: '时间格式'
      })
    }

    return columns
  }, [onFieldChange, selectedDimType])

  return (
    <>
      <OntologyFormSectionTitle icon={<ProfileOutlined />}>基础信息</OntologyFormSectionTitle>
      <div className="grid grid-cols-2 gap-x-4">
        <AForm.Item
          required
          label="中文名"
          name="zhName"
          rules={[{ validator: validateZhName }]}
          validateDebounce={600}
          validateTrigger="onChange"
        >
          <AInput placeholder="如：行政区域" />
        </AForm.Item>
        <AForm.Item
          required
          label="英文名 (技术标识)"
          name="englishName"
          rules={[{ validator: validateEnglishName }]}
          validateDebounce={600}
          validateTrigger="onChange"
        >
          <AInput placeholder="如：dim_region" />
        </AForm.Item>
        <AForm.Item
          required
          label="维度分组"
        >
          <AInput
            disabled
            value={groupName || '-'}
          />
        </AForm.Item>
        <AForm.Item
          hidden
          name="groupId"
          rules={[{ message: '请选择维度分组', required: true }]}
        >
          <AInput />
        </AForm.Item>
        <AForm.Item
          label="维度归类 (dim_category)"
          name="dimCategory"
          getValueFromEvent={(value) => {
            if (!Array.isArray(value)) {
              return value === undefined || value === null ? undefined : String(value)
            }
            const nextValue = value[value.length - 1]
            return nextValue === undefined || nextValue === null ? undefined : String(nextValue)
          }}
          getValueProps={(value) => ({
            value: value === undefined || value === null || value === '' ? [] : [String(value)]
          })}
        >
          <ASelect
            labelRender={item => categoryLabelMap.get(String(item.value)) || item.label || item.value}
            maxCount={1}
            mode="tags"
            optionFilterProp="label"
            options={categoryOptions}
            placeholder="请选择或输入维度归类"
            showSearch
            onChange={syncDimCategoryName}
          />
        </AForm.Item>
        <AForm.Item hidden name="dimCategoryName">
          <AInput />
        </AForm.Item>
        <AForm.Item
          label="维度类型"
          name="dimType"
          rules={[{ message: '请选择维度类型', required: true }]}
        >
          <ASelect
            disabled={isEdit}
            options={DIMENSION_TYPE_OPTIONS}
            placeholder="请选择维度类型"
          />
        </AForm.Item>
        <AForm.Item
          label="状态"
          name="status"
          rules={[{ message: '请选择状态', required: true }]}
        >
          <ASelect
            options={DIMENSION_STATUS_OPTIONS}
            placeholder="请选择状态"
          />
        </AForm.Item>
      </div>

      <OntologyFormSectionTitle icon={<LinkOutlined />}>语义来源</OntologyFormSectionTitle>
      <TableSemantics
        form={form}
        getSchemaId={getSchemaId}
        getSchemaOptions={setSchemaOptions as any}
        groupFieldName="semanticsGroupId"
        isEdit={isEdit}
        selectedGroupId={selectedSemanticGroupId}
        type="shema"
      />

      <div className="mb-3 mt-2 flex items-center justify-between">
        <OntologyFormSectionTitle className="!mb-0" icon={<ApartmentOutlined />}>关联字段</OntologyFormSectionTitle>
        <AButton
          size="small"
          type="primary"
          onClick={onOpenFieldModal}
        >
          + 选择字段
        </AButton>
      </div>

      <ATable
        className="mb-5"
        columns={fieldTableColumns}
        dataSource={fieldTableData}
        locale={{ emptyText: '暂无关联字段，请点击「+ 选择字段」添加' }}
        pagination={false}
        rowKey={item => item.key}
        scroll={{ y: 180 }}
        size="small"
        style={{ height: 235 }}
      />

      {selectedDimType === 'std' ? (
        <AForm.Item
          label="示例值 (sample_values)"
          name="sampleValues"
        >
          <AInput placeholder="可录入维度枚举，如：男,女,未知" />
        </AForm.Item>
      ) : (
        <div>
          <AForm.Item
            label="时间粒度"
            name="timeGranularity"
            rules={[{ message: '请选择时间粒度', required: true }]}
          >
            <ACheckbox.Group options={DIMENSION_TIME_GRANULARITY_OPTIONS} />
          </AForm.Item>
        </div>
      )}

      <AForm.Item
        label="钻取方向"
        name="drillDirection"
      >
        <ASelect
          options={DIMENSION_DRILL_DIRECTION_OPTIONS}
          placeholder="请选择钻取方向"
        />
      </AForm.Item>

      <OntologyFormSectionTitle icon={<TeamOutlined />}>管理信息</OntologyFormSectionTitle>
      <div className="grid grid-cols-2 gap-x-4">
        <AForm.Item
          label="维度责任人 (dim_owner)"
          name="owner"
          rules={[{ message: '请输入维度责任人', required: true }]}
        >
          <AInput placeholder="请输入责任人" />
        </AForm.Item>
        <AForm.Item
          label="责任人邮箱 (owner_email)"
          name="ownerEmail"
          rules={[{ message: '邮箱格式不正确', type: 'email' }]}
        >
          <AInput placeholder="请输入责任人邮箱" />
        </AForm.Item>
        <AForm.Item
          label="更新频率 (update_freq)"
          name="updateFreq"
        >
          <ASelect
            options={DIMENSION_UPDATE_FREQ_OPTIONS}
            placeholder="请选择更新频率"
          />
        </AForm.Item>
      </div>

      <OntologyFormSectionTitle className="mt-4" icon={<InfoCircleOutlined />}>说明信息</OntologyFormSectionTitle>
      <AForm.Item
        label="别名"
        name="alias"
      >
        <AInput placeholder="请输入别名" />
      </AForm.Item>
      <AForm.Item
        label="业务说明"
        name="bizDesc"
      >
        <AInput.TextArea
          placeholder="请输入业务说明"
          rows={3}
        />
      </AForm.Item>
    </>
  )
}
