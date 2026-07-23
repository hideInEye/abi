import { SearchOutlined } from '@ant-design/icons'
import { useDebounceFn } from 'ahooks'
import { Form, Input, Select } from 'antd'
import React, { useCallback, useEffect, useState } from 'react'

import { SearchFilterBar, SearchFilterField, getFilterPopupContainer } from '@/components/SearchFilterBar'
import type { OntologyLabel, OntologyNetworkId } from '@/pages/workbench/ontology-kg/shared-network-types'

import type { EntitySearchValues } from '../types'

interface EntitySearchProps {
  readonly labels: OntologyLabel[]
  readonly onChange: (values: EntitySearchValues) => void
  readonly onDateRangeChange?: (range: any) => void
  readonly onReset: () => void
  readonly value: EntitySearchValues
}

export const EntitySearch: React.FC<EntitySearchProps> = ({ labels, onChange, onDateRangeChange, onReset, value }) => {
  const [form] = Form.useForm<EntitySearchValues>()
  const [dateRange, setDateRange] = useState<any>(null)

  useEffect(() => {
    form.setFieldsValue(value)
  }, [form, value])

  const handleFinish = useCallback(
    (values: EntitySearchValues): void => {
      onChange({ ...values, entityCode: values.entityCode?.trim() ?? '', entityName: values.entityName?.trim() ?? '' })
    },
    [onChange],
  )

  const handleReset = useCallback((): void => {
    form.resetFields()
    setDateRange(null)
    onDateRangeChange?.(null)
    onReset()
  }, [form, onDateRangeChange, onReset])

  // 搜索框停止输入 1s 后自动查询；清空时立即查询
  const { cancel: cancelDebouncedSearch, run: runDebouncedSearch } = useDebounceFn(() => form.submit(), { wait: 1000 })
  const handleValuesChange = useCallback(
    (changed: Record<string, unknown>): void => {
      if (!Object.prototype.hasOwnProperty.call(changed, 'entityName')) return
      const value = changed.entityName
      if (value === undefined || value === null || value === '') {
        cancelDebouncedSearch()
        form.submit()
      } else {
        runDebouncedSearch()
      }
    },
    [form, cancelDebouncedSearch, runDebouncedSearch],
  )

  const labelOptions = labels.map((label) => ({ label: label.bizName, value: label.id }))

  return (
    <Form form={form} layout="inline" style={{ display: 'contents' }} onFinish={handleFinish} onValuesChange={handleValuesChange}>
      <SearchFilterBar
        searchSlot={
          <Form.Item className="m-0 flex-1 min-w-0" name="entityName">
            <Input
              allowClear
              className="abi-field-input w-full"
              placeholder="请输入实体名称"
              prefix={<SearchOutlined style={{ color: '#a3b3c8' }} />}
              onPressEnter={() => { cancelDebouncedSearch(); form.submit(); }}
            />
          </Form.Item>
        }
        onQuery={() => form.submit()}
        onReset={handleReset}
        filters={
          <>
            <SearchFilterField label="时间范围">
              <ADatePicker.RangePicker
                allowClear
                className="abi-field-input"
                format="YYYY-MM-DD"
                getPopupContainer={getFilterPopupContainer}
                placeholder={['开始时间', '结束时间']}
                value={dateRange}
                onChange={(dates) => { setDateRange(dates); onDateRangeChange?.(dates); }}
              />
            </SearchFilterField>
            <SearchFilterField label="实体编码">
              <Form.Item className="m-0" name="entityCode">
                <Input allowClear className="abi-field-input w-full" placeholder="请输入实体编码" />
              </Form.Item>
            </SearchFilterField>
            <SearchFilterField label="标签类型">
              <Form.Item className="m-0" name="labelId">
                <Select<OntologyNetworkId>
                  allowClear
                  className="abi-field-input w-full"
                  getPopupContainer={getFilterPopupContainer}
                  options={labelOptions}
                  placeholder="请选择标签类型"
                />
              </Form.Item>
            </SearchFilterField>
          </>
        }
      />
    </Form>
  )
}
