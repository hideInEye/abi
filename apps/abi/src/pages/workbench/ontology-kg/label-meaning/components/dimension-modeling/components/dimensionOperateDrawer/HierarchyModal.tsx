import { Modal, message } from 'antd'
import React from 'react'

import { DIMENSION_TIME_GRANULARITY_OPTIONS } from '../../constants/dimensionModeling.constants'
import type { DimensionFieldOption, DimensionHierarchyEditItem, DimensionModelItem } from '../../types/dimensionModeling.types'

interface Props {
  readonly hierarchyItems?: DimensionHierarchyEditItem[]
  readonly loading?: boolean
  readonly onCancel: () => void
  readonly onSave: (items: DimensionHierarchyEditItem[]) => Promise<boolean> | boolean
  readonly open: boolean
  readonly record?: DimensionModelItem | null
}

interface HierarchyFieldItem {
  childDimId?: number
  displayName: string
  drillDirection?: 'DOWN' | 'UP'
  hierarchyId?: number
  isDefault?: '0' | '1'
  key: string
  levelName: string
  parentDimId?: number
  remark?: string
  status?: '0' | '1'
  techId: string
}

interface HierarchyCardItem {
  id: string
  levels: HierarchyFieldItem[]
  title: string
}

type DragPayload =
  | {
      fieldKey: string
      type: 'field'
    }
  | {
      cardId: string
      fieldKey: string
      type: 'level'
    }

function formatFieldName(field: DimensionFieldOption) {
  const bizName = field.bizName || field.techId
  const techId = field.techId || field.key
  return `${bizName} (${techId})`
}

function buildFieldItem(field: DimensionFieldOption): HierarchyFieldItem {
  return {
    displayName: formatFieldName(field),
    key: field.key || field.techId,
    levelName: field.bizName || field.techId,
    techId: field.techId
  }
}

function buildTimeGranularityItems(values?: string[]): HierarchyFieldItem[] {
  const optionMap = new Map(DIMENSION_TIME_GRANULARITY_OPTIONS.map(item => [item.value, item.label]))
  const selectedValues = values?.length ? values : DIMENSION_TIME_GRANULARITY_OPTIONS.map(item => item.value)

  return selectedValues.map(value => {
    const label = optionMap.get(value) || value
    return {
      displayName: `${label} (${value})`,
      key: value,
      levelName: label,
      techId: value
    }
  })
}

function buildPayload(record: DimensionModelItem | null | undefined, cards: HierarchyCardItem[]) {
  if (!record?.id) {
    return []
  }
  const dimId = Number(record.id)
  const spaceId = Number(localStorage.getItem('spaceId'))
  if (!spaceId) {
    return []
  }

  return cards.flatMap((card, cardIndex) =>
    card.levels.map((level, levelIndex) => {
      const configJson = {
        fieldKey: level.key,
        fieldName: level.levelName,
        techId: level.techId
      }
      return {
        childDimId: level.childDimId,
        configJson,
        dimId,
        drillDirection: level.drillDirection || 'DOWN',
        hierarchyId: level.hierarchyId ? Number(level.hierarchyId) : null,
        hierarchyName: card.title.trim() || '层级结构',
        isDefault: level.isDefault || (cardIndex === 0 ? '0' : '1'),
        levelName: level.levelName,
        levelOrder: levelIndex + 1,
        parentDimId: level.parentDimId,
        remark: level.remark,
        spaceId,
        status: level.status || '1'
      } satisfies DimensionHierarchyEditItem
    })
  )
}

function parseConfigJson(value: any) {
  if (!value) {
    return null
  }
  if (typeof value === 'object') {
    return value
  }
  if (typeof value !== 'string') {
    return null
  }
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function buildCardsFromHierarchy(
  items: DimensionHierarchyEditItem[],
  fieldMap: Map<string, HierarchyFieldItem>
): HierarchyCardItem[] {
  const grouped = new Map<string, DimensionHierarchyEditItem[]>()
  items.forEach(item => {
    const key = String(item.hierarchyName || '层级结构')
    const list = grouped.get(key) || []
    list.push(item)
    grouped.set(key, list)
  })

  return Array.from(grouped.entries()).map(([name, list], index) => {
    const levels = list
      .sort((a, b) => Number(a.levelOrder || 0) - Number(b.levelOrder || 0))
      .map(item => {
        const config = parseConfigJson(item.configJson)
        const fieldKey = String(config?.fieldKey || config?.techId || item.levelName || '')
        const hierarchyId = Number(item.hierarchyId || (item as any).id || (item as any).hierarchyID) || undefined
        const matched = fieldMap.get(fieldKey)
        if (matched) {
          return {
            ...matched,
            childDimId: item.childDimId,
            drillDirection: item.drillDirection,
            hierarchyId,
            isDefault: item.isDefault,
            parentDimId: item.parentDimId,
            remark: item.remark,
            status: item.status
          }
        }
        const levelName = String(config?.fieldName || item.levelName || fieldKey)
        return {
          childDimId: item.childDimId,
          displayName: `${levelName} (${fieldKey})`,
          drillDirection: item.drillDirection,
          hierarchyId,
          isDefault: item.isDefault,
          key: fieldKey,
          levelName,
          parentDimId: item.parentDimId,
          remark: item.remark,
          status: item.status,
          techId: String(config?.techId || fieldKey)
        } as HierarchyFieldItem
      })

    return {
      id: `history-${index + 1}`,
      levels,
      title: name
    } as HierarchyCardItem
  })
}

function createCardId() {
  return `hierarchy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function parseDragPayload(event: React.DragEvent): DragPayload | null {
  const text = event.dataTransfer.getData('application/json') || event.dataTransfer.getData('text/plain')
  if (!text) {
    return null
  }
  try {
    const payload = JSON.parse(text) as DragPayload
    if (payload?.type && payload?.fieldKey) {
      return payload
    }
  } catch {
    return {
      fieldKey: text,
      type: 'field'
    }
  }
  return null
}

export const HierarchyModal: React.FC<Props> = ({
  hierarchyItems = [],
  loading = false,
  onCancel,
  onSave,
  open,
  record
}) => {
  const [cards, setCards] = useState<HierarchyCardItem[]>([])
  const [activeCardId, setActiveCardId] = useState('')
  const [saving, setSaving] = useState(false)

  const isTimeDimension = record?.dimType === 'time'

  const availableFields = useMemo(() => (record?.relatedFields || []).map(buildFieldItem), [record?.relatedFields])
  const availableLevelItems = useMemo(
    () => (isTimeDimension ? buildTimeGranularityItems(record?.timeGranularity) : availableFields),
    [availableFields, isTimeDimension, record?.timeGranularity]
  )

  const availableFieldMap = useMemo(() => {
    return new Map(availableLevelItems.map(item => [item.key, item]))
  }, [availableLevelItems])

  useEffect(() => {
    if (!open) {
      return
    }

    if (hierarchyItems.length) {
      const historyCards = buildCardsFromHierarchy(hierarchyItems, availableFieldMap)
      if (historyCards.length) {
        setCards(historyCards)
        setActiveCardId(historyCards[0]?.id || '')
        return
      }
    }

    setCards([])
    setActiveCardId('')
  }, [availableFieldMap, hierarchyItems, open])

  function updateCardLevels(cardId: string, nextLevels: HierarchyFieldItem[]) {
    setCards(prev =>
      prev.map(item => {
        if (item.id !== cardId) {
          return item
        }
        return { ...item, levels: nextLevels }
      })
    )
  }

  function updateCardTitle(cardId: string, title: string) {
    setCards(prev => prev.map(item => (item.id === cardId ? { ...item, title } : item)))
  }

  function removeCard(cardId: string) {
    setCards(prev => {
      const nextCards = prev.filter(item => item.id !== cardId)
      setActiveCardId(current => (current === cardId ? nextCards[0]?.id || '' : current))
      return nextCards
    })
  }

  function createCardWithField(field: HierarchyFieldItem) {
    const nextCard: HierarchyCardItem = {
      id: createCardId(),
      levels: [field],
      title: field.levelName ? `${field.levelName}层级` : '层级结构'
    }
    setCards(prev => [...prev, nextCard])
    setActiveCardId(nextCard.id)
  }

  function addFieldToCard(field: HierarchyFieldItem, cardId?: string) {
    const targetId = cardId || activeCardId
    if (!targetId) {
      createCardWithField(field)
      return
    }
    const target = cards.find(item => item.id === targetId)
    if (!target) {
      createCardWithField(field)
      return
    }
    if (target.levels.some(item => item.key === field.key)) {
      return
    }
    updateCardLevels(targetId, [...target.levels, field])
  }

  function moveLevelToCard(payload: Extract<DragPayload, { type: 'level' }>, targetCardId: string, targetFieldKey?: string) {
    if (payload.cardId === targetCardId && payload.fieldKey === targetFieldKey) {
      return
    }
    const sourceCard = cards.find(item => item.id === payload.cardId)
    const targetCard = cards.find(item => item.id === targetCardId)
    if (!sourceCard || !targetCard) {
      return
    }
    const movingLevel = sourceCard.levels.find(item => item.key === payload.fieldKey)
    if (!movingLevel) {
      return
    }
    if (payload.cardId !== targetCardId && targetCard.levels.some(item => item.key === payload.fieldKey)) {
      return
    }

    setCards(prev => {
      const withoutMoving = prev.map(card => {
        if (card.id !== payload.cardId) {
          return card
        }
        return {
          ...card,
          levels: card.levels.filter(level => level.key !== payload.fieldKey)
        }
      })

      return withoutMoving.map(card => {
        if (card.id !== targetCardId) {
          return card
        }
        const levels = card.levels.filter(level => level.key !== payload.fieldKey)
        const targetIndex = targetFieldKey ? levels.findIndex(level => level.key === targetFieldKey) : -1
        if (targetIndex < 0) {
          return {
            ...card,
            levels: [...levels, movingLevel]
          }
        }
        return {
          ...card,
          levels: [...levels.slice(0, targetIndex), movingLevel, ...levels.slice(targetIndex)]
        }
      })
    })
    setActiveCardId(targetCardId)
  }

  function handleDropOnCard(event: React.DragEvent, cardId: string, targetFieldKey?: string) {
    event.preventDefault()
    event.stopPropagation()
    const payload = parseDragPayload(event)
    if (!payload) {
      return
    }
    if (payload.type === 'level') {
      moveLevelToCard(payload, cardId, targetFieldKey)
      return
    }
    const field = availableFieldMap.get(payload.fieldKey)
    if (!field) {
      return
    }
    const target = cards.find(item => item.id === cardId)
    if (target?.levels.some(item => item.key === field.key)) {
      return
    }
    if (targetFieldKey) {
      const nextLevels = [...(target?.levels || [])]
      const targetIndex = nextLevels.findIndex(item => item.key === targetFieldKey)
      const insertIndex = targetIndex < 0 ? nextLevels.length : targetIndex
      nextLevels.splice(insertIndex, 0, field)
      updateCardLevels(cardId, nextLevels)
      return
    }
    addFieldToCard(field, cardId)
  }

  function handleDropOnCanvas(event: React.DragEvent) {
    event.preventDefault()
    const payload = parseDragPayload(event)
    if (!payload || payload.type !== 'field') {
      return
    }
    const field = availableFieldMap.get(payload.fieldKey)
    if (!field) {
      return
    }
    createCardWithField(field)
  }

  function removeField(cardId: string, fieldKey: string) {
    const card = cards.find(item => item.id === cardId)
    if (!card) {
      return
    }
    updateCardLevels(
      cardId,
      card.levels.filter(item => item.key !== fieldKey)
    )
  }

  async function handleSave() {
    const hasLevel = cards.some(card => card.levels.length > 0)
    if (!hasLevel) {
      message.warning('请先添加层级字段')
      return
    }
    const payload = buildPayload(
      record,
      cards.filter(card => card.levels.length > 0)
    )
    if (!payload.length) {
      message.warning('层级参数构建失败，请检查空间或维度信息')
      return
    }
    setSaving(true)
    try {
      await onSave(payload)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      destroyOnClose
      footer={null}
      open={open}
      title={isTimeDimension ? '时间层级关系配置' : '层级关系配置'}
      width="60%"
      onCancel={onCancel}
    >
      <ASpin
        spinning={loading}
        tip="加载层级配置中..."
      >
        <div className="h-550px flex flex-col overflow-hidden border border-[#e6ebf5] rounded">
          <div className="min-h-0 flex flex-1 overflow-hidden">
            <div className="w-180px border-r border-[#e6ebf5] bg-[#fbfcff]">
              <div className="border-b border-[#e6ebf5] px-3 py-2 text-4 font-semibold">
                {isTimeDimension ? '可选时间层级' : '可选层级'}
              </div>
              <div className="max-h-full overflow-auto p-2 space-y-2">
                {availableLevelItems.map(item => (
                  <div
                    draggable
                    className="cursor-move border border-[#d7def0] rounded bg-white px-2 py-1 text-3 font-medium hover:border-[#3d5afe]"
                    key={item.key}
                    onClick={() => addFieldToCard(item)}
                    onDragStart={event => {
                      event.dataTransfer.effectAllowed = 'copy'
                      event.dataTransfer.setData(
                        'application/json',
                        JSON.stringify({
                          fieldKey: item.key,
                          type: 'field'
                        } satisfies DragPayload)
                      )
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span>{item.displayName}</span>
                      <span className="text-3 text-[#9aa7bd]">≡</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="min-h-0 flex-1 overflow-auto p-3"
              onDragOver={event => event.preventDefault()}
              onDrop={handleDropOnCanvas}
            >
              <div className="mb-2 text-4 text-[#1f2a44] font-semibold">
                {isTimeDimension ? '时间层级结构构建' : '层级结构构建'}
              </div>
              <div className={isTimeDimension ? 'grid grid-cols-3 gap-2' : 'grid max-w-720px grid-cols-2 gap-3'}>
                {cards.map(card => (
                  <div
                    key={card.id}
                    className={`rounded border bg-white ${
                      activeCardId === card.id ? 'border-[#3d5afe] shadow-[0_0_0_1px_#3d5afe]' : 'border-[#d7def0]'
                    }`}
                    onClick={() => setActiveCardId(card.id)}
                  >
                    <div className="flex items-center gap-2 border-b border-[#d7def0] bg-[#f3f6fd] px-2 py-1">
                      <AInput
                        className="text-center text-3 font-semibold"
                        value={card.title}
                        variant="borderless"
                        onChange={event => updateCardTitle(card.id, event.target.value)}
                        onClick={event => event.stopPropagation()}
                      />
                      <AButton
                        danger
                        size="small"
                        type="text"
                        onClick={event => {
                          event.stopPropagation()
                          removeCard(card.id)
                        }}
                      >
                        ×
                      </AButton>
                    </div>

                    <div className="p-2 space-y-2">
                      {card.levels.map((level, index) => (
                        <div
                          draggable
                          className="relative cursor-move border border-[#cbd8f8] rounded bg-white px-2 py-1 text-[#3d5afe] transition hover:border-[#3d5afe] hover:shadow-sm"
                          key={`${card.id}-${level.key}`}
                          onDragOver={event => event.preventDefault()}
                          onDragStart={event => {
                            event.stopPropagation()
                            event.dataTransfer.effectAllowed = 'move'
                            event.dataTransfer.setData(
                              'application/json',
                              JSON.stringify({
                                cardId: card.id,
                                fieldKey: level.key,
                                type: 'level'
                              } satisfies DragPayload)
                            )
                          }}
                          onDrop={event => handleDropOnCard(event, card.id, level.key)}
                        >
                          <div className="flex items-center justify-between text-3 font-semibold">
                            <span>{`${index + 1}. ${level.displayName}`}</span>
                            <AButton
                              size="small"
                              type="text"
                              onClick={event => {
                                event.stopPropagation()
                                removeField(card.id, level.key)
                              }}
                            >
                              ×
                            </AButton>
                          </div>
                        </div>
                      ))}

                      <div
                        className="border border-[#cdd6ea] rounded border-dashed px-2 py-1 text-center text-4 text-[#97a3bb]"
                        onDragOver={event => event.preventDefault()}
                        onDrop={event => handleDropOnCard(event, card.id)}
                      >
                        + 拖入层级组件继续扩展
                      </div>
                    </div>
                  </div>
                ))}
                {!cards.length ? (
                  <div className="col-span-full flex min-h-180px items-center justify-center rounded border border-dashed border-[#cdd6ea] bg-[#fbfcff] text-4 text-[#97a3bb]">
                    从左侧拖入{isTimeDimension ? '时间粒度' : '字段'}生成层级结构
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-[#e6ebf5] bg-white px-3 py-2">
            <AButton onClick={onCancel}>取消</AButton>
            <AButton
              loading={saving}
              type="primary"
              onClick={handleSave}
            >
              保存并应用结构
            </AButton>
          </div>
        </div>
      </ASpin>
    </Modal>
  )
}
