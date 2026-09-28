import { AppstoreOutlined, BgColorsOutlined, FileTextOutlined, LinkOutlined } from '@ant-design/icons'
import { AutoComplete, Button, Form, Input, InputNumber, Radio, Select } from 'antd'
import { useEffect, useMemo, useState } from 'react'

import CommonDrawer from '@/components/stateless/common/CommonDrawer'

import styles from '../data-dictionary.module.scss'
import { DEFAULT_DICT_DATA_FORM, dictDataToFormValues } from '../dictionary-model'
import type { DictDataFormValues, SysDictData, SysDictType } from '../types'

const { TextArea } = Input

const LIST_CLASS_OPTIONS = [
  { label: '默认（default）', value: 'default' },
  { label: '主要（primary）', value: 'primary' },
  { label: '成功（success）', value: 'success' },
  { label: '信息（info）', value: 'info' },
  { label: '警告（warning）', value: 'warning' },
  { label: '危险（danger）', value: 'danger' }
]

interface DictDataDrawerProps {
  readonly defaultDictType?: string
  readonly loadingTypes: boolean
  readonly onClose: () => void
  readonly onSubmit: (values: DictDataFormValues) => Promise<void>
  readonly open: boolean
  readonly record: SysDictData | null
  readonly typeOptions: SysDictType[]
  readonly width: string
}

const requiredTextRules = (label: string) => [
  { max: 200, message: `${label}不能超过 100 个字符`, transform: (value: string) => value?.trim() },
  { message: `请输入${label}`, required: true, transform: (value: string) => value?.trim(), whitespace: true }
]

export function DictDataDrawer({
  defaultDictType = '',
  loadingTypes,
  onClose,
  onSubmit,
  open,
  record,
  typeOptions,
  width
}: DictDataDrawerProps) {
  const [form] = Form.useForm<DictDataFormValues>()
  const [submitting, setSubmitting] = useState(false)
  const selectOptions = useMemo(() => {
    const options = typeOptions.map(item => ({
      label: `${item.dictName} (${item.dictType})${item.status === '1' ? ' · 已停用' : ''}`,
      value: item.dictType
    }))
    const fallbackType = record?.dictType || defaultDictType
    if (fallbackType && !options.some(option => option.value === fallbackType)) {
      options.unshift({ label: fallbackType, value: fallbackType })
    }
    return options
  }, [defaultDictType, record?.dictType, typeOptions])

  useEffect(() => {
    if (!open) return
    form.resetFields()
    form.setFieldsValue(
      record ? dictDataToFormValues(record) : { ...DEFAULT_DICT_DATA_FORM, dictType: defaultDictType }
    )
    setSubmitting(false)
  }, [defaultDictType, form, open, record])

  async function handleSubmit(): Promise<void> {
    let values: DictDataFormValues
    try {
      values = await form.validateFields()
    } catch {
      return
    }

    setSubmitting(true)
    try {
      await onSubmit(values)
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <CommonDrawer
      destroyOnClose
      closable={!submitting}
      description={record ? `编码 ${String(record.dictCode)}` : '定义业务标签与存储键值的映射关系'}
      icon={<AppstoreOutlined />}
      keyboard={!submitting}
      maskClosable={!submitting}
      open={open}
      rootClassName={styles.dictionaryOverlayRoot}
      title={record ? '编辑字典项' : '新增字典项'}
      width={width}
      footer={
        <div className="flex justify-end gap-2">
          <Button
            disabled={submitting}
            onClick={onClose}
          >
            取消
          </Button>
          <Button
            className="btn-accent-gradient"
            loading={submitting}
            type="primary"
            onClick={() => handleSubmit().catch(() => undefined)}
          >
            保存
          </Button>
        </div>
      }
      onClose={onClose}
    >
      <Form
        requiredMark
        className={styles.drawerForm}
        form={form}
        layout="vertical"
      >
        <section className="ds-form-section">
          <div className="ds-form-section-title">
            <LinkOutlined />
            映射信息
          </div>
          <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
            <Form.Item
              required
              label="字典类型"
              name="dictType"
              rules={requiredTextRules('字典类型')}
            >
              <Select
                showSearch
                loading={loadingTypes}
                notFoundContent={loadingTypes ? '类别加载中…' : '暂无可用字典类别'}
                optionFilterProp="label"
                options={selectOptions}
                placeholder="请选择所属字典类别"
              />
            </Form.Item>
            <Form.Item
              label="字典排序"
              name="dictSort"
            >
              <InputNumber
                className="w-full"
                min={0}
                placeholder="请输入排序值"
                precision={0}
              />
            </Form.Item>
            <Form.Item
              required
              label="字典标签"
              name="dictLabel"
              rules={requiredTextRules('字典标签')}
            >
              <Input
                maxLength={100}
                placeholder="请输入页面显示名称"
              />
            </Form.Item>
            <Form.Item
              required
              label="字典键值"
              name="dictValue"
              rules={requiredTextRules('字典键值')}
            >
              <Input
                className={styles.monospaceInput}
                maxLength={200}
                placeholder="请输入业务存储值"
              />
            </Form.Item>
          </div>
        </section>

        <section className="ds-form-section">
          <div className="ds-form-section-title">
            <BgColorsOutlined />
            展示与状态
          </div>
          <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
            <Form.Item
              label="表格字典样式"
              name="listClass"
            >
              <AutoComplete
                allowClear
                options={LIST_CLASS_OPTIONS}
                placeholder="请选择或输入样式名称"
                filterOption={(inputValue, option) =>
                  String(option?.label ?? option?.value ?? '')
                    .toLocaleLowerCase()
                    .includes(inputValue.toLocaleLowerCase())
                }
              />
            </Form.Item>
            <Form.Item
              label="样式属性扩展"
              name="cssClass"
              rules={[{ max: 100, message: '样式属性扩展不能超过 100 个字符' }]}
            >
              <Input
                maxLength={100}
                placeholder="请输入 CSS class（可选）"
              />
            </Form.Item>
            <Form.Item
              label="默认项"
              name="isDefault"
            >
              <Radio.Group
                options={[
                  { label: '是', value: 'Y' },
                  { label: '否', value: 'N' }
                ]}
              />
            </Form.Item>
            <Form.Item
              label="状态"
              name="status"
            >
              <Radio.Group
                options={[
                  { label: '正常', value: '0' },
                  { label: '停用', value: '1' }
                ]}
              />
            </Form.Item>
          </div>
        </section>

        <section className="ds-form-section">
          <div className="ds-form-section-title">
            <FileTextOutlined />
            备注
          </div>
          <Form.Item
            className="mb-0"
            name="remark"
          >
            <TextArea
              placeholder="补充说明该字典项的业务用途或使用范围"
              rows={4}
            />
          </Form.Item>
        </section>
      </Form>
    </CommonDrawer>
  )
}
