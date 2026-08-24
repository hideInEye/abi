import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Empty, Input, Popconfirm, Select, Spin, Tooltip, TreeSelect } from 'antd'
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'

import styles from './RuleExpressionBuilder.module.scss'
import type { RuleCondition, RuleFieldOption, RuleLayer, RuleLogic, RuleValidationResult } from './types'
import { RULE_EXPRESSION_LIMITS } from './types'
import {
  buildRuleFieldTree,
  createDefaultRuleCondition,
  createDefaultRuleLayer,
  createRuleId,
  normalizeRuleConnections,
  normalizeRuleLayers,
  validateRuleLayers
} from './utils'

const OPERATOR_OPTIONS = [
  { label: '等于', value: '=' },
  { label: '不等于', value: '!=' },
  { label: '大于', value: '>' },
  { label: '大于等于', value: '>=' },
  { label: '小于', value: '<' },
  { label: '小于等于', value: '<=' },
  { label: '包含', value: 'LIKE' },
  { label: '不包含', value: 'NOT LIKE' },
  { label: '为空', value: 'IS NULL' },
  { label: '不为空', value: 'IS NOT NULL' }
] as const

const NULL_OPERATORS = new Set(['IS NULL', 'IS NOT NULL'])

export interface RuleExpressionBuilderHandle {
  focusFirstError: () => boolean
  validate: () => RuleValidationResult
}

interface RuleExpressionBuilderProps {
  readonly emptyText?: string
  readonly fieldLoading?: boolean
  readonly fields: RuleFieldOption[]
  readonly onChange?: (value: RuleLayer[]) => void
  readonly validationRequested?: boolean
  readonly value?: RuleLayer[]
}

function maxDefaultIndex(names: string[], prefix: string): number {
  return names.reduce((max, name) => {
    if (name === prefix) {
      return Math.max(max, 1)
    }
    const match = name.match(new RegExp(`^${prefix} (\\d+)$`))
    return match ? Math.max(max, Number(match[1])) : max
  }, 0)
}

function getConditionLimitMessage(atGlobalLimit: boolean, atGroupLimit: boolean): string {
  if (atGlobalLimit) return '单个标签语义最多支持 100 条条件'
  if (atGroupLimit) return '每个条件分组最多支持 20 条条件'
  return ''
}

const RuleExpressionBuilder = forwardRef<RuleExpressionBuilderHandle, RuleExpressionBuilderProps>(
  (
    {
      emptyText = '当前数据语义暂无可选字段',
      fieldLoading = false,
      fields,
      onChange,
      validationRequested = false,
      value
    },
    ref
  ) => {
    const layers = useMemo(() => normalizeRuleLayers(value), [value])
    const fieldTree = useMemo(() => buildRuleFieldTree(fields), [fields])
    const validation = useMemo(() => validateRuleLayers(layers, fields), [fields, layers])
    const [activeLayerId, setActiveLayerId] = useState(layers[0]?.id)
    const [showErrors, setShowErrors] = useState(false)
    const rootRef = useRef<HTMLDivElement>(null)
    const layerCounter = useRef(1)
    const groupCounters = useRef(new Map<string, number>())

    useEffect(() => {
      if (validationRequested) setShowErrors(true)
    }, [validationRequested])

    useEffect(() => {
      layerCounter.current = Math.max(
        layerCounter.current,
        maxDefaultIndex(
          layers.map(layer => layer.name),
          '新分层'
        )
      )
      layers.forEach(layer => {
        const current = groupCounters.current.get(layer.id) || 0
        groupCounters.current.set(
          layer.id,
          Math.max(
            current,
            maxDefaultIndex(
              layer.groups.map(group => group.name),
              '条件分组'
            )
          )
        )
      })
      if (!layers.some(layer => layer.id === activeLayerId)) {
        setActiveLayerId(layers[0]?.id)
      }
    }, [activeLayerId, layers])

    const emit = (nextLayers: RuleLayer[]) => {
      onChange?.(normalizeRuleConnections(nextLayers))
    }

    const updateLayer = (layerIndex: number, updater: (layer: RuleLayer) => RuleLayer) => {
      emit(layers.map((layer, index) => (index === layerIndex ? updater(layer) : layer)))
    }

    const focusIssue = useCallback(
      (path: string) => {
        const layerIndex = Number(path.match(/^layers\.(\d+)/)?.[1] ?? 0)
        if (layers[layerIndex]) {
          setActiveLayerId(layers[layerIndex].id)
        }
        window.setTimeout(() => {
          const target = rootRef.current?.querySelector<HTMLElement>(`[data-rule-path="${path}"]`)
          target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          target?.querySelector<HTMLElement>('input, .ant-select-selector, button')?.focus()
        })
      },
      [layers]
    )

    useImperativeHandle(
      ref,
      () => ({
        focusFirstError: () => {
          setShowErrors(true)
          const issue = validation.issues[0]
          if (issue) {
            focusIssue(issue.path)
          }
          return Boolean(issue)
        },
        validate: () => validation
      }),
      [focusIssue, validation]
    )

    const issueFor = (path: string) =>
      showErrors ? validation.issues.find(issue => issue.path === path)?.message : undefined
    const totalConditions = layers.reduce(
      (total, layer) => total + layer.groups.reduce((groupTotal, group) => groupTotal + group.conditions.length, 0),
      0
    )
    const activeLayerIndex = Math.max(
      0,
      layers.findIndex(layer => layer.id === activeLayerId)
    )
    const activeLayer = layers[activeLayerIndex]
    const atLayerLimit = layers.length >= RULE_EXPRESSION_LIMITS.layers
    const atGlobalConditionLimit = totalConditions >= RULE_EXPRESSION_LIMITS.totalConditions

    const addLayer = () => {
      layerCounter.current += 1
      const layer = createDefaultRuleLayer(`新分层 ${layerCounter.current}`)
      groupCounters.current.set(layer.id, 0)
      emit([...layers, layer])
      setActiveLayerId(layer.id)
    }

    const addGroup = () => {
      if (!activeLayer) return
      const nextIndex = (groupCounters.current.get(activeLayer.id) || 0) + 1
      groupCounters.current.set(activeLayer.id, nextIndex)
      updateLayer(activeLayerIndex, layer => ({
        ...layer,
        groups: [
          ...layer.groups,
          {
            conditions: [],
            id: createRuleId('group'),
            ...(layer.groups.length ? { logicWithPrevious: 'AND' as RuleLogic } : {}),
            name: `条件分组 ${nextIndex}`
          }
        ]
      }))
    }

    if (!activeLayer) {
      return null
    }

    const renderFieldDropdown = (menu: React.ReactElement) => {
      if (fieldLoading) {
        return (
          <div className={styles.fieldState}>
            <Spin size="small" />
          </div>
        )
      }
      if (fields.length) return menu
      return (
        <Empty
          description={emptyText}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      )
    }

    return (
      <div
        className={styles.builder}
        ref={rootRef}
      >
        <div className={styles.layerBar}>
          <div
            className={styles.layerTabs}
            role="tablist"
          >
            {layers.map(layer => (
              <button
                aria-selected={layer.id === activeLayer.id}
                className={`${styles.layerTab} ${layer.id === activeLayer.id ? styles.layerTabActive : ''}`}
                key={layer.id}
                role="tab"
                type="button"
                onClick={() => setActiveLayerId(layer.id)}
              >
                {layer.name || '未命名分层'}
              </button>
            ))}
          </div>
          <Tooltip title={atLayerLimit ? '最多支持 20 个分层' : ''}>
            <span>
              <Button
                disabled={atLayerLimit}
                icon={<PlusOutlined />}
                type="dashed"
                onClick={addLayer}
              >
                添加分层
              </Button>
            </span>
          </Tooltip>
        </div>

        <section className={styles.layerPanel}>
          <div className={styles.layerHeader}>
            <div
              className={styles.nameField}
              data-rule-path={`layers.${activeLayerIndex}.name`}
            >
              <Input
                maxLength={30}
                placeholder="请输入分层名称"
                status={issueFor(`layers.${activeLayerIndex}.name`) ? 'error' : undefined}
                value={activeLayer.name}
                onBlur={() => setShowErrors(true)}
                onChange={event => updateLayer(activeLayerIndex, layer => ({ ...layer, name: event.target.value }))}
              />
              {issueFor(`layers.${activeLayerIndex}.name`) && (
                <div className={styles.errorText}>{issueFor(`layers.${activeLayerIndex}.name`)}</div>
              )}
            </div>
            {layers.length > 1 && (
              <Popconfirm
                cancelText="取消"
                okText="确认删除"
                title="确认删除当前分层及其全部表达式配置？"
                onConfirm={() => {
                  const next = layers.filter((_, index) => index !== activeLayerIndex)
                  emit(next)
                  setActiveLayerId(next[Math.max(0, activeLayerIndex - 1)]?.id)
                }}
              >
                <Button
                  danger
                  aria-label="删除当前分层"
                  icon={<DeleteOutlined />}
                  type="text"
                />
              </Popconfirm>
            )}
          </div>

          <div className={styles.logicSpine}>
            {activeLayer.groups.map((group, groupIndex) => {
              const groupPath = `layers.${activeLayerIndex}.groups.${groupIndex}`
              const atGroupConditionLimit = group.conditions.length >= RULE_EXPRESSION_LIMITS.conditionsPerGroup
              const conditionLimitMessage = getConditionLimitMessage(atGlobalConditionLimit, atGroupConditionLimit)
              return (
                <React.Fragment key={group.id}>
                  {groupIndex > 0 && (
                    <button
                      aria-label={`切换为${group.logicWithPrevious === 'OR' ? '且' : '或'}`}
                      className={styles.logicNode}
                      type="button"
                      onClick={() =>
                        updateLayer(activeLayerIndex, layer => ({
                          ...layer,
                          groups: layer.groups.map((item, index) =>
                            index === groupIndex
                              ? { ...item, logicWithPrevious: item.logicWithPrevious === 'OR' ? 'AND' : 'OR' }
                              : item
                          )
                        }))
                      }
                    >
                      {group.logicWithPrevious === 'OR' ? '或' : '且'}
                    </button>
                  )}
                  <article className={styles.groupCard}>
                    <header className={styles.groupHeader}>
                      <div className={styles.groupTitle}>
                        <span className={styles.collapseMark}>−</span>
                        <div
                          className={styles.nameField}
                          data-rule-path={`${groupPath}.name`}
                        >
                          <Input
                            maxLength={30}
                            placeholder="请输入条件分组名称"
                            status={issueFor(`${groupPath}.name`) ? 'error' : undefined}
                            value={group.name}
                            variant="borderless"
                            onBlur={() => setShowErrors(true)}
                            onChange={event =>
                              updateLayer(activeLayerIndex, layer => ({
                                ...layer,
                                groups: layer.groups.map((item, index) =>
                                  index === groupIndex ? { ...item, name: event.target.value } : item
                                )
                              }))
                            }
                          />
                          {issueFor(`${groupPath}.name`) && (
                            <div className={styles.errorText}>{issueFor(`${groupPath}.name`)}</div>
                          )}
                        </div>
                      </div>
                      <div className={styles.groupActions}>
                        <Tooltip title={conditionLimitMessage}>
                          <span data-rule-path={`${groupPath}.conditions`}>
                            <Button
                              disabled={Boolean(conditionLimitMessage)}
                              icon={<PlusOutlined />}
                              type="link"
                              onClick={() =>
                                updateLayer(activeLayerIndex, layer => ({
                                  ...layer,
                                  groups: layer.groups.map((item, index) =>
                                    index === groupIndex
                                      ? {
                                          ...item,
                                          conditions: [
                                            ...item.conditions,
                                            createDefaultRuleCondition(item.conditions.length ? 'AND' : undefined)
                                          ]
                                        }
                                      : item
                                  )
                                }))
                              }
                            >
                              添加条件
                            </Button>
                          </span>
                        </Tooltip>
                        <Popconfirm
                          cancelText="取消"
                          okText="确认删除"
                          title="确认删除当前条件分组？"
                          onConfirm={() =>
                            updateLayer(activeLayerIndex, layer => ({
                              ...layer,
                              groups: layer.groups.filter((_, index) => index !== groupIndex)
                            }))
                          }
                        >
                          <Button
                            danger
                            aria-label="删除当前条件分组"
                            icon={<DeleteOutlined />}
                            type="text"
                          />
                        </Popconfirm>
                      </div>
                    </header>

                    {group.conditions.length ? (
                      <div className={styles.conditionList}>
                        {group.conditions.map((condition, conditionIndex) => {
                          const conditionPath = `${groupPath}.conditions.${conditionIndex}`
                          return (
                            <React.Fragment key={condition.id}>
                              {conditionIndex > 0 && (
                                <button
                                  aria-label={`切换为${condition.logicWithPrevious === 'OR' ? '且' : '或'}`}
                                  className={`${styles.logicNode} ${styles.conditionLogicNode}`}
                                  type="button"
                                  onClick={() =>
                                    updateLayer(activeLayerIndex, layer => ({
                                      ...layer,
                                      groups: layer.groups.map((item, index) =>
                                        index === groupIndex
                                          ? {
                                              ...item,
                                              conditions: item.conditions.map((row, rowIndex) =>
                                                rowIndex === conditionIndex
                                                  ? {
                                                      ...row,
                                                      logicWithPrevious: row.logicWithPrevious === 'OR' ? 'AND' : 'OR'
                                                    }
                                                  : row
                                              )
                                            }
                                          : item
                                      )
                                    }))
                                  }
                                >
                                  {condition.logicWithPrevious === 'OR' ? '或' : '且'}
                                </button>
                              )}
                              <div className={styles.conditionRow}>
                                <span className={styles.conditionBadge}>
                                  {String.fromCharCode(65 + conditionIndex)}
                                </span>
                                <div
                                  className={styles.conditionControl}
                                  data-rule-path={`${conditionPath}.fieldId`}
                                >
                                  <TreeSelect
                                    allowClear
                                    showSearch
                                    treeDefaultExpandAll
                                    dropdownRender={renderFieldDropdown}
                                    fieldNames={{ label: 'title', value: 'value' }}
                                    placeholder="请选择字段"
                                    status={issueFor(`${conditionPath}.fieldId`) ? 'error' : undefined}
                                    style={{ width: '100%' }}
                                    treeData={fieldTree}
                                    treeNodeFilterProp="title"
                                    value={condition.fieldId || undefined}
                                    onChange={fieldId =>
                                      updateLayer(activeLayerIndex, layer => ({
                                        ...layer,
                                        groups: layer.groups.map((item, index) =>
                                          index === groupIndex
                                            ? {
                                                ...item,
                                                conditions: item.conditions.map((row, rowIndex) =>
                                                  rowIndex === conditionIndex ? { ...row, fieldId: fieldId || '' } : row
                                                )
                                              }
                                            : item
                                        )
                                      }))
                                    }
                                  />
                                  {issueFor(`${conditionPath}.fieldId`) && (
                                    <div className={styles.errorText}>{issueFor(`${conditionPath}.fieldId`)}</div>
                                  )}
                                </div>
                                <div
                                  className={styles.operatorControl}
                                  data-rule-path={`${conditionPath}.operator`}
                                >
                                  <Select
                                    options={[...OPERATOR_OPTIONS]}
                                    status={issueFor(`${conditionPath}.operator`) ? 'error' : undefined}
                                    value={condition.operator}
                                    onChange={(operator: RuleCondition['operator']) =>
                                      updateLayer(activeLayerIndex, layer => ({
                                        ...layer,
                                        groups: layer.groups.map((item, index) =>
                                          index === groupIndex
                                            ? {
                                                ...item,
                                                conditions: item.conditions.map((row, rowIndex) =>
                                                  rowIndex === conditionIndex
                                                    ? {
                                                        ...row,
                                                        operator,
                                                        ...(NULL_OPERATORS.has(operator) ? { value: '' } : {})
                                                      }
                                                    : row
                                                )
                                              }
                                            : item
                                        )
                                      }))
                                    }
                                  />
                                </div>
                                {!NULL_OPERATORS.has(condition.operator) && (
                                  <div
                                    className={styles.valueControl}
                                    data-rule-path={`${conditionPath}.value`}
                                  >
                                    <Input
                                      placeholder="请输入值"
                                      status={issueFor(`${conditionPath}.value`) ? 'error' : undefined}
                                      value={condition.value}
                                      onChange={event =>
                                        updateLayer(activeLayerIndex, layer => ({
                                          ...layer,
                                          groups: layer.groups.map((item, index) =>
                                            index === groupIndex
                                              ? {
                                                  ...item,
                                                  conditions: item.conditions.map((row, rowIndex) =>
                                                    rowIndex === conditionIndex
                                                      ? { ...row, value: event.target.value }
                                                      : row
                                                  )
                                                }
                                              : item
                                          )
                                        }))
                                      }
                                    />
                                    {issueFor(`${conditionPath}.value`) && (
                                      <div className={styles.errorText}>{issueFor(`${conditionPath}.value`)}</div>
                                    )}
                                  </div>
                                )}
                                <Button
                                  danger
                                  aria-label="删除此条件"
                                  icon={<DeleteOutlined />}
                                  type="text"
                                  onClick={() =>
                                    updateLayer(activeLayerIndex, layer => ({
                                      ...layer,
                                      groups: layer.groups.map((item, index) =>
                                        index === groupIndex
                                          ? {
                                              ...item,
                                              conditions: item.conditions.filter(
                                                (_, rowIndex) => rowIndex !== conditionIndex
                                              )
                                            }
                                          : item
                                      )
                                    }))
                                  }
                                />
                              </div>
                            </React.Fragment>
                          )
                        })}
                      </div>
                    ) : (
                      <div className={styles.emptyGroup}>
                        {issueFor(`${groupPath}.conditions`) || '当前分组暂无条件，请添加条件'}
                      </div>
                    )}
                  </article>
                </React.Fragment>
              )
            })}

            {!activeLayer.groups.length && (
              <div className={styles.emptyLayer}>
                {issueFor(`layers.${activeLayerIndex}.groups`) || '当前分层暂无条件分组'}
              </div>
            )}
            <Tooltip
              title={
                activeLayer.groups.length >= RULE_EXPRESSION_LIMITS.groupsPerLayer
                  ? '每个分层最多支持 10 个条件分组'
                  : ''
              }
            >
              <span
                className={styles.addGroupWrap}
                data-rule-path={`layers.${activeLayerIndex}.groups`}
              >
                <Button
                  block
                  disabled={activeLayer.groups.length >= RULE_EXPRESSION_LIMITS.groupsPerLayer}
                  icon={<PlusOutlined />}
                  type="dashed"
                  onClick={addGroup}
                >
                  新增条件分组
                </Button>
              </span>
            </Tooltip>
          </div>
        </section>
      </div>
    )
  }
)

RuleExpressionBuilder.displayName = 'RuleExpressionBuilder'

export default RuleExpressionBuilder
