import {
  AimOutlined,
  DeleteOutlined,
  PlusOutlined,
  ProfileOutlined,
  SafetyCertificateOutlined,
  SettingOutlined
} from '@ant-design/icons'
import { Button, Form, Input, InputNumber, Radio, Select } from 'antd'
import { useEffect, useState } from 'react'

import CommonDrawer from '@/components/stateless/common/CommonDrawer'

import {
  BUSINESS_CATEGORIES,
  DEFAULT_RULE_DRAFT,
  LIST_TYPE_OPTIONS,
  MATCH_METHOD_HINTS,
  MATCH_METHOD_OPTIONS,
  MATCH_TARGET_OPTIONS,
  VISIBILITY_OPTIONS
} from '../constants'
import { testSemanticRule, validateSemanticRuleDraft } from '../semantic-list-model'
import styles from '../semantic-list.module.scss'
import type {
  SemanticListType,
  SemanticMatchMethod,
  SemanticMatchResult,
  SemanticMatchTarget,
  SemanticRule,
  SemanticRuleDraft,
  SemanticRuleField
} from '../types'

import { MatchTester } from './MatchTester'
import { SmartMatchHelper } from './SmartMatchHelper'

const { TextArea } = Input

interface SemanticRuleDrawerProps {
  readonly onClose: () => void
  readonly onSubmit: (draft: SemanticRuleDraft) => Promise<void>
  readonly open: boolean
  readonly rule: SemanticRule | null
  readonly width: string
}

const FORM_FIELDS: SemanticRuleField[] = [
  'name',
  'type',
  'category',
  'priority',
  'visibility',
  'target',
  'method',
  'pattern'
]

function getRuleDraft(rule: SemanticRule | null): SemanticRuleDraft {
  if (!rule) {
    return { ...DEFAULT_RULE_DRAFT, advancedSettings: [] }
  }

  return {
    advancedSettings: rule.advancedSettings.map(item => ({ ...item })),
    category: rule.category,
    method: rule.method,
    name: rule.name,
    pattern: rule.pattern,
    priority: rule.priority,
    remark: rule.remark,
    target: rule.target,
    type: rule.type,
    visibility: rule.visibility
  }
}

export function SemanticRuleDrawer({ onClose, onSubmit, open, rule, width }: SemanticRuleDrawerProps) {
  const [form] = Form.useForm<SemanticRuleDraft>()
  const [submitting, setSubmitting] = useState(false)
  const [testText, setTestText] = useState('')
  const [testResult, setTestResult] = useState<SemanticMatchResult | null>(null)
  const selectedType = Form.useWatch('type', form) ?? 'WHITELIST'
  const selectedTarget = Form.useWatch('target', form) ?? 'TABLE_NAME'
  const selectedMethod = Form.useWatch('method', form) ?? 'EXACT'
  const selectedPattern = Form.useWatch('pattern', form) ?? ''

  useEffect(() => {
    if (!open) return
    form.setFieldsValue(getRuleDraft(rule))
    form.setFields(FORM_FIELDS.map(name => ({ errors: [], name })))
    setSubmitting(false)
    setTestText('')
    setTestResult(null)
  }, [form, open, rule])

  function handleValuesChange(changedValues: Partial<SemanticRuleDraft>) {
    const changedField = Object.keys(changedValues)[0] as SemanticRuleField | undefined
    if (changedField && FORM_FIELDS.includes(changedField)) form.setFields([{ errors: [], name: changedField }])

    if (changedValues.type) {
      form.setFieldValue('category', BUSINESS_CATEGORIES[changedValues.type][0])
      form.setFields([{ errors: [], name: 'category' }])
    }

    if (changedValues.method || changedValues.pattern !== undefined) setTestResult(null)
  }

  function runRegexTest(pattern = selectedPattern) {
    setTestResult(testSemanticRule('REGEX', pattern, testText))
  }

  function applySmartExample(value: string) {
    form.setFieldValue('pattern', value)
    form.setFields([{ errors: [], name: 'pattern' }])
    if (selectedMethod === 'REGEX' && testText) setTestResult(testSemanticRule('REGEX', value, testText))
  }

  async function handleSubmit() {
    const values = form.getFieldsValue(true) as SemanticRuleDraft
    const errors = validateSemanticRuleDraft(values)
    form.setFields(FORM_FIELDS.map(name => ({ errors: errors[name] ? [errors[name]!] : [], name })))

    const firstInvalidField = FORM_FIELDS.find(field => errors[field])
    if (firstInvalidField) {
      form.scrollToField(firstInvalidField, { block: 'center' })
      requestAnimationFrame(() => form.getFieldInstance(firstInvalidField)?.focus?.())
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
      description={rule ? rule.code : '填写基础信息并配置匹配规则'}
      icon={<SafetyCertificateOutlined />}
      maskClosable={!submitting}
      open={open}
      rootClassName={styles.semanticOverlayRoot}
      title={rule ? '编辑规则' : '新建规则'}
      width={width}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>取消</Button>
          <Button
            className="btn-accent-gradient"
            loading={submitting}
            type="primary"
            onClick={() => {
              handleSubmit().catch(() => undefined)
            }}
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
        onValuesChange={handleValuesChange}
      >
        <section className="ds-form-section">
          <div className="ds-form-section-title">
            <ProfileOutlined />
            基本信息
          </div>
          <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
            <Form.Item
              required
              label="规则名称"
              name="name"
            >
              <Input placeholder="请输入规则名称" />
            </Form.Item>
            {rule ? (
              <Form.Item
                extra="由系统自动生成，不可修改"
                label="规则编码"
              >
                <Input
                  readOnly
                  className={styles.monospaceInput}
                  value={rule.code}
                />
              </Form.Item>
            ) : null}
            <Form.Item
              required
              label="名单类型"
              name="type"
            >
              <Radio.Group options={LIST_TYPE_OPTIONS} />
            </Form.Item>
            <Form.Item
              required
              label="业务类别"
              name="category"
            >
              <Select
                options={BUSINESS_CATEGORIES[selectedType as SemanticListType].map(category => ({
                  label: category,
                  value: category
                }))}
              />
            </Form.Item>
            <Form.Item
              extra="数值越大越优先匹配"
              label="优先级"
              name="priority"
            >
              <InputNumber
                className="w-full"
                min={0}
                placeholder="请输入优先级"
              />
            </Form.Item>
            <Form.Item
              required
              label="可见性"
              name="visibility"
            >
              <Select options={VISIBILITY_OPTIONS} />
            </Form.Item>
            <Form.Item
              className="md:col-span-2"
              label="备注"
              name="remark"
            >
              <TextArea
                placeholder="补充说明规则的适用范围或使用目的"
                rows={3}
              />
            </Form.Item>
          </div>
        </section>

        <section className="ds-form-section">
          <div className="ds-form-section-title">
            <AimOutlined />
            匹配规则
          </div>
          <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
            <Form.Item
              required
              label="匹配目标"
              name="target"
            >
              <Select options={MATCH_TARGET_OPTIONS} />
            </Form.Item>
            <Form.Item
              required
              label="匹配方式"
              name="method"
            >
              <Select options={MATCH_METHOD_OPTIONS} />
            </Form.Item>
            <Form.Item
              required
              className="md:col-span-2"
              extra={MATCH_METHOD_HINTS[selectedMethod as SemanticMatchMethod]}
              label={selectedMethod === 'REGEX' ? '匹配表达式' : '匹配内容'}
              name="pattern"
            >
              <TextArea
                className={styles.monospaceInput}
                placeholder={selectedMethod === 'REGEX' ? '请输入正则表达式' : '请输入匹配内容'}
                rows={3}
              />
            </Form.Item>
            <div className="md:col-span-2">
              <SmartMatchHelper
                method={selectedMethod as SemanticMatchMethod}
                target={selectedTarget as SemanticMatchTarget}
                onApply={applySmartExample}
              />
              {selectedMethod === 'REGEX' ? (
                <MatchTester
                  note="保存前可验证当前规则"
                  result={testResult}
                  text={testText}
                  onTest={() => runRegexTest()}
                  onChange={value => {
                    setTestText(value)
                    setTestResult(null)
                  }}
                />
              ) : null}
            </div>
          </div>
        </section>

        <section className="ds-form-section">
          <div className="ds-form-section-title">
            <SettingOutlined />
            高级设置
          </div>
          <p className={styles.sectionDescription}>可通过 Key / Value 补充额外生效范围；不配置时仅按匹配规则判断。</p>
          <Form.List name="advancedSettings">
            {(fields, { add, remove }) => (
              <div className="flex flex-col gap-3">
                {fields.map(field => (
                  <div
                    className="flex flex-wrap items-start gap-2"
                    key={field.key}
                  >
                    <Form.Item
                      className="mb-0 min-w-[40%] flex-1"
                      name={[field.name, 'key']}
                    >
                      <Input
                        aria-label={`高级设置 ${field.name + 1} Key`}
                        placeholder="Key"
                      />
                    </Form.Item>
                    <Form.Item
                      className="mb-0 min-w-[40%] flex-1"
                      name={[field.name, 'value']}
                    >
                      <Input
                        aria-label={`高级设置 ${field.name + 1} Value`}
                        placeholder="Value"
                      />
                    </Form.Item>
                    <Button
                      danger
                      aria-label={`删除高级设置 ${field.name + 1}`}
                      icon={<DeleteOutlined />}
                      type="text"
                      onClick={() => remove(field.name)}
                    />
                  </div>
                ))}
                <div>
                  <Button
                    icon={<PlusOutlined />}
                    onClick={() => add({ key: '', value: '' })}
                  >
                    添加条件
                  </Button>
                </div>
              </div>
            )}
          </Form.List>
        </section>
      </Form>
    </CommonDrawer>
  )
}
