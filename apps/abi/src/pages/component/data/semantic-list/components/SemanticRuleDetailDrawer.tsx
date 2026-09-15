import { AimOutlined, AppstoreOutlined, ExperimentOutlined, ProfileOutlined } from '@ant-design/icons'
import { Button, Tag } from 'antd'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

import CommonDrawer from '@/components/stateless/common/CommonDrawer'

import { DETAIL_HIT_EXAMPLES, LIST_TYPE_LABELS, MATCH_METHOD_LABELS, VISIBILITY_LABELS } from '../constants'
import { testSemanticRule } from '../semantic-list-model'
import styles from '../semantic-list.module.scss'
import type { SemanticMatchResult, SemanticRule } from '../types'

import { MatchTester } from './MatchTester'

interface SemanticRuleDetailDrawerProps {
  readonly getCategoryLabel: (category: string) => string
  readonly getTargetLabel: (target: string) => string
  readonly onClose: () => void
  readonly onEdit: (rule: SemanticRule) => void
  readonly open: boolean
  readonly rule: SemanticRule | null
  readonly width: string
}

function DetailItem({
  full = false,
  label,
  monospace = false,
  value
}: {
  readonly full?: boolean
  readonly label: string
  readonly monospace?: boolean
  readonly value: ReactNode
}) {
  return (
    <div className={`${full ? 'md:col-span-2 xl:col-span-3' : ''} ${styles.detailItem}`}>
      <div className={styles.detailLabel}>{label}</div>
      <div className={monospace ? styles.detailCode : styles.detailValue}>{value}</div>
    </div>
  )
}

export function SemanticRuleDetailDrawer({
  getCategoryLabel,
  getTargetLabel,
  onClose,
  onEdit,
  open,
  rule,
  width
}: SemanticRuleDetailDrawerProps) {
  const [testText, setTestText] = useState('')
  const [testResult, setTestResult] = useState<SemanticMatchResult | null>(null)

  useEffect(() => {
    if (!open) return
    setTestText('')
    setTestResult(null)
  }, [open, rule?.id])

  if (!rule) return null
  const hitExamples = DETAIL_HIT_EXAMPLES[rule.target] ?? []

  return (
    <CommonDrawer
      destroyOnClose
      description={rule.code || '未返回规则编码'}
      icon={<AppstoreOutlined />}
      open={open}
      rootClassName={styles.semanticOverlayRoot}
      title="规则详情"
      width={width}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>关闭</Button>
          <Button
            className="btn-accent-gradient"
            type="primary"
            onClick={() => onEdit(rule)}
          >
            编辑
          </Button>
        </div>
      }
      onClose={onClose}
    >
      <div className={styles.drawerForm}>
        <section className="ds-form-section">
          <div className="ds-form-section-title">
            <ProfileOutlined />
            基本信息
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <DetailItem
              label="规则名称"
              value={rule.name}
            />
            <DetailItem
              monospace
              label="规则编码"
              value={rule.code || '-'}
            />
            <DetailItem
              label="名单类型"
              value={
                <Tag
                  bordered={false}
                  className={rule.type === 'WHITELIST' ? styles.allowTag : styles.blockTag}
                >
                  {LIST_TYPE_LABELS[rule.type]}
                </Tag>
              }
            />
            <DetailItem
              label="业务类别"
              value={getCategoryLabel(rule.category)}
            />
            <DetailItem
              label="优先级"
              value={rule.priority}
            />
            <DetailItem
              label="可见性"
              value={VISIBILITY_LABELS[rule.visibility]}
            />
            <DetailItem
              label="状态"
              value={<Tag bordered={false}>{rule.enabled ? '启用' : '禁用'}</Tag>}
            />
            <DetailItem
              full
              label="备注"
              value={rule.remark || '-'}
            />
          </div>
        </section>

        <section className="ds-form-section">
          <div className="ds-form-section-title">
            <AimOutlined />
            匹配规则
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <DetailItem
              label="匹配目标"
              value={getTargetLabel(rule.target)}
            />
            <DetailItem
              label="匹配方式"
              value={MATCH_METHOD_LABELS[rule.method]}
            />
            <div className="md:col-span-2">
              <div className={styles.detailLabel}>{rule.method === 'REGEX' ? '匹配表达式' : '匹配内容'}</div>
              <div className={styles.codeBox}>{rule.pattern}</div>
              <MatchTester
                note="仅验证，不修改规则"
                result={testResult}
                text={testText}
                onTest={() => setTestResult(testSemanticRule(rule.method, rule.pattern, testText))}
                onChange={value => {
                  setTestText(value)
                  setTestResult(null)
                }}
              />
            </div>
          </div>
        </section>

        {hitExamples.length ? (
          <section className="ds-form-section">
            <div className="ds-form-section-title">
              <ExperimentOutlined />
              命中示例
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {hitExamples.map((example, index) => (
                <div
                  className={styles.hitExample}
                  key={`${example}-${index}`}
                >
                  <span>示例 {index + 1}</span>
                  <strong>{example}</strong>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </CommonDrawer>
  )
}
