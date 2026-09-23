import { ApartmentOutlined, FileTextOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import { Alert, Button, Form, Input, Radio } from 'antd'
import { useEffect, useState } from 'react'

import CommonDrawer from '@/components/stateless/common/CommonDrawer'

import styles from '../data-dictionary.module.scss'
import { DEFAULT_DICT_TYPE_FORM, DICT_TYPE_PATTERN, dictTypeToFormValues } from '../dictionary-model'
import type { DictTypeFormValues, SysDictType } from '../types'

const { TextArea } = Input

interface DictTypeDrawerProps {
  readonly onClose: () => void
  readonly onSubmit: (values: DictTypeFormValues) => Promise<void>
  readonly open: boolean
  readonly record: SysDictType | null
  readonly width: string
}

const requiredNameRules = [
  { max: 100, message: '字典名称不能超过 100 个字符', transform: (value: string) => value?.trim() },
  { message: '请输入字典名称', required: true, transform: (value: string) => value?.trim(), whitespace: true }
]

const requiredTypeRules = [
  { max: 100, message: '字典类型不能超过 100 个字符', transform: (value: string) => value?.trim() },
  { message: '请输入字典类型', required: true, transform: (value: string) => value?.trim(), whitespace: true },
  {
    message: '请以小写字母开头，仅使用小写字母、数字和下划线',
    pattern: DICT_TYPE_PATTERN,
    transform: (value: string) => value?.trim()
  }
]

export function DictTypeDrawer({ onClose, onSubmit, open, record, width }: DictTypeDrawerProps) {
  const [form] = Form.useForm<DictTypeFormValues>()
  const [submitting, setSubmitting] = useState(false)
  const currentDictType = Form.useWatch('dictType', form)
  const typeChanged = Boolean(record && currentDictType?.trim() && currentDictType.trim() !== record.dictType)

  useEffect(() => {
    if (!open) return
    form.resetFields()
    form.setFieldsValue(record ? dictTypeToFormValues(record) : DEFAULT_DICT_TYPE_FORM)
    setSubmitting(false)
  }, [form, open, record])

  async function handleSubmit(): Promise<void> {
    let values: DictTypeFormValues
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
      description={record ? `主键 ${String(record.dictId)}` : '先定义类别，再为该类别维护标签与键值'}
      icon={<ApartmentOutlined />}
      keyboard={!submitting}
      maskClosable={!submitting}
      open={open}
      rootClassName={styles.dictionaryOverlayRoot}
      title={record ? '编辑字典类别' : '新增字典类别'}
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
            <ApartmentOutlined />
            类别定义
          </div>
          <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
            <Form.Item
              required
              label="字典名称"
              name="dictName"
              rules={requiredNameRules}
            >
              <Input
                maxLength={100}
                placeholder="例如：业务类别"
              />
            </Form.Item>
            <Form.Item
              required
              label="字典类型"
              name="dictType"
              rules={requiredTypeRules}
            >
              <Input
                className={styles.monospaceInput}
                maxLength={100}
                placeholder="例如：semantic_biz_type"
              />
            </Form.Item>
          </div>
          {typeChanged ? (
            <Alert
              showIcon
              className={styles.cascadeAlert}
              description="保存后，后端会将旧类型下的所有数据级联更新到新类型，并重新构建该类型缓存。"
              message="修改类型会迁移该类别下的全部字典数据"
              type="warning"
            />
          ) : null}
        </section>

        <section className="ds-form-section">
          <div className="ds-form-section-title">
            <SafetyCertificateOutlined />
            状态
          </div>
          <Form.Item
            className="mb-0"
            name="status"
          >
            <Radio.Group
              options={[
                { label: '正常', value: '0' },
                { label: '停用', value: '1' }
              ]}
            />
          </Form.Item>
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
              placeholder="补充说明该字典类别的业务用途或使用范围"
              rows={5}
            />
          </Form.Item>
        </section>
      </Form>
    </CommonDrawer>
  )
}
