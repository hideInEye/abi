import React from 'react'

import { TableSemantics } from '@/components/tableSemantics'

import {
  DIMENSION_CATEGORY_OPTIONS,
  DIMENSION_DRILL_DIRECTION_OPTIONS,
  DIMENSION_STATUS_OPTIONS,
  DIMENSION_TIME_FORMAT_OPTIONS,
  DIMENSION_TIME_GRANULARITY_OPTIONS,
  DIMENSION_TYPE_OPTIONS,
  DIMENSION_UPDATE_FREQ_OPTIONS
} from '../../constants/dimensionModeling.constants'
import type { DimensionFieldOption, DimensionSchemaInfo } from '../../types/dimensionModeling.types'

function formatFieldLabel(item: DimensionFieldOption) {
  const bizName = item.bizName || item.techId
  const originName = item.originName || item.techId
  return `${bizName}(${originName})`
}

interface Props {
  readonly fieldTableData: DimensionFieldOption[]
  readonly form: any
  readonly getSchemaId: ({
    semanticSchemaId,
    semanticsGroupId,
    viewId
  }: {
    semanticSchemaId: number
    semanticsGroupId: number | null
    viewId: number
  }) => void
  readonly groupName?: string
  readonly isEdit: boolean
  readonly onOpenFieldModal: () => void
  readonly selectedDimType: 'std' | 'time'
  readonly setSchemaOptions: (schemaOptions: DimensionSchemaInfo[]) => void
}

export const BaseInfoTab: React.FC<Props> = ({
  fieldTableData,
  form,
  getSchemaId,
  groupName,
  isEdit,
  onOpenFieldModal,
  selectedDimType,
  setSchemaOptions
}) => {
  const timeFieldOptions = useMemo(
    () =>
      fieldTableData.map(item => ({
        label: formatFieldLabel(item),
        value: item.techId
      })),
    [fieldTableData]
  )

  return (
    <>
      <div className="mb-4 text-lg font-semibold">基础信息</div>
      <div className="grid grid-cols-2 gap-x-4">
        <AForm.Item
          label="中文名"
          name="zhName"
          rules={[{ message: '请输入中文名', required: true }]}
        >
          <AInput placeholder="如：行政区域" />
        </AForm.Item>
        <AForm.Item
          label="英文名 (技术标识)"
          name="englishName"
          rules={[
            { message: '请输入英文名', required: true },
            { max: 64, message: '长度不能超过64' },
            { message: '仅支持字母、数字和下划线，且需字母或下划线开头', pattern: /^[A-Za-z_][A-Za-z0-9_]*$/ }
          ]}
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
        >
          <ASelect
            options={DIMENSION_CATEGORY_OPTIONS}
            placeholder="请选择维度归类"
          />
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

      <div className="mb-4 text-lg font-semibold">语义来源</div>
      <TableSemantics
        form={form}
        getSchemaId={getSchemaId}
        getSchemaOptions={setSchemaOptions as any}
        groupFieldName="semanticsGroupId"
        isEdit={isEdit}
        type="shema"
      />

      <div className="mb-3 mt-2 flex items-center justify-between">
        <div className="text-lg font-semibold">关联字段</div>
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
        dataSource={fieldTableData}
        locale={{ emptyText: '暂无关联字段，请点击「+ 选择字段」添加' }}
        pagination={false}
        rowKey={item => item.key}
        size="small"
        columns={[
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
        ]}
      />

      {selectedDimType === 'std' ? (
        <AForm.Item
          label="示例值 (sample_values)"
          name="sampleValues"
        >
          <AInput placeholder="可录入维度枚举，如：男,女,未知" />
        </AForm.Item>
      ) : (
        <div className="grid grid-cols-2 gap-x-4">
          <AForm.Item
            label="时间字段"
            name="timeField"
            rules={[{ message: '请选择时间字段', required: true }]}
          >
            <ASelect
              options={timeFieldOptions}
              placeholder="请选择时间字段"
            />
          </AForm.Item>
          <AForm.Item
            label="时间格式"
            name="timeFormat"
            rules={[{ message: '请选择时间格式', required: true }]}
          >
            <ASelect
              options={DIMENSION_TIME_FORMAT_OPTIONS}
              placeholder="请选择时间格式"
            />
          </AForm.Item>
          <AForm.Item
            className="col-span-2"
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

      <div className="mb-4 mt-6 text-lg font-semibold">管理信息</div>
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

      <div className="mb-4 mt-6 text-lg font-semibold">说明信息</div>
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
