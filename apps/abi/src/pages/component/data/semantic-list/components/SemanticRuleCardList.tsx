import { DeleteOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons'
import { Button, Empty, Switch } from 'antd'

import { LIST_TYPE_LABELS, MATCH_METHOD_LABELS } from '../constants'
import styles from '../semantic-list.module.scss'
import type { SemanticRule, SemanticRuleId } from '../types'

interface SemanticRuleCardListProps {
  readonly dataSource: readonly SemanticRule[]
  readonly getCategoryLabel: (category: string) => string
  readonly getTargetLabel: (target: string) => string
  readonly onDelete: (rule: SemanticRule) => void
  readonly onDetail: (rule: SemanticRule) => void
  readonly onEdit: (rule: SemanticRule) => void
  readonly onStatusChange: (rule: SemanticRule, enabled: boolean) => void
  readonly statusPendingIds: ReadonlySet<SemanticRuleId>
  readonly visibleColumnKeys: ReadonlySet<string>
}

export function SemanticRuleCardList({
  dataSource,
  getCategoryLabel,
  getTargetLabel,
  onDelete,
  onDetail,
  onEdit,
  onStatusChange,
  statusPendingIds,
  visibleColumnKeys
}: SemanticRuleCardListProps) {
  if (!dataSource.length) {
    return (
      <div className="abi-card-empty">
        <Empty
          description="暂无符合条件的规则"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </div>
    )
  }

  return (
    <div
      aria-label="语义名单卡片列表"
      className="abi-card-grid ontology-card-grid"
    >
      <div className="abi-card-grid-inner">
        {dataSource.map(rule => (
          <article
            className="abi-data-card"
            key={rule.id}
          >
            <div className="abi-data-card-head">
              <div className="abi-data-card-title">
                <button
                  className={styles.cardTitleButton}
                  title={rule.name}
                  type="button"
                  onClick={() => onDetail(rule)}
                >
                  {rule.name}
                </button>
              </div>
              <span className={`abi-status-tag ${rule.type === 'WHITELIST' ? 'status-normal' : 'status-error'}`}>
                {LIST_TYPE_LABELS[rule.type]}
              </span>
            </div>

            <div className="abi-data-card-body">
              {visibleColumnKeys.has('code') && (
                <div className="row">
                  <span className="lbl">规则编码</span>
                  <code
                    className={`val ${styles.cardCode}`}
                    title={rule.code || '-'}
                  >
                    {rule.code || '-'}
                  </code>
                </div>
              )}
              {visibleColumnKeys.has('category') && (
                <div className="row">
                  <span className="lbl">业务类别</span>
                  <span
                    className="val"
                    title={getCategoryLabel(rule.category)}
                  >
                    {getCategoryLabel(rule.category)}
                  </span>
                </div>
              )}
              {visibleColumnKeys.has('target') && (
                <div className="row">
                  <span className="lbl">匹配规则</span>
                  <span
                    className="val"
                    title={`${getTargetLabel(rule.target)} · ${MATCH_METHOD_LABELS[rule.method]}`}
                  >
                    {getTargetLabel(rule.target)} · {MATCH_METHOD_LABELS[rule.method]}
                  </span>
                </div>
              )}
              {visibleColumnKeys.has('updatedAt') && (
                <div className="row">
                  <span className="lbl">更新时间</span>
                  <span className="val">{rule.updatedAt || '-'}</span>
                </div>
              )}
              {visibleColumnKeys.has('enabled') && (
                <div className="row">
                  <span className="lbl">状态</span>
                  <span className="val">
                    <Switch
                      aria-label={`${rule.name}${rule.enabled ? '已启用' : '已禁用'}`}
                      checked={rule.enabled}
                      loading={statusPendingIds.has(rule.id)}
                      size="small"
                      onChange={enabled => onStatusChange(rule, enabled)}
                    />
                  </span>
                </div>
              )}
            </div>

            <div className="abi-data-card-footer">
              <Button
                className="abi-action-link"
                icon={<EyeOutlined />}
                size="small"
                type="link"
                onClick={() => onDetail(rule)}
              >
                详情
              </Button>
              <Button
                className="abi-action-link"
                icon={<EditOutlined />}
                size="small"
                type="link"
                onClick={() => onEdit(rule)}
              >
                编辑
              </Button>
              <Button
                className="abi-action-link-danger"
                icon={<DeleteOutlined />}
                size="small"
                type="link"
                onClick={() => onDelete(rule)}
              >
                删除
              </Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
