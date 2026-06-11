import { Modal, message } from 'antd'
import React from 'react'

import type { DimensionFieldOption, DimensionHierarchyEditItem, DimensionModelItem } from '../../types/dimensionModeling.types'

interface Props {
  readonly hierarchyItems?: DimensionHierarchyEditItem[]
  readonly loading?: boolean
  readonly onCancel: () => void
  readonly onSave: (items: DimensionHierarchyEditItem[]) => Promise<boolean> | boolean
  readonly open: boolean
  readonly record?: DimensionModelItem | null
}

type TimeTemplateKey = 'half_year' | 'year' | 'year_date' | 'year_month' | 'year_quarter' | 'year_week'
type TimeUnit = 'date' | 'half_year' | 'hour' | 'month' | 'quarter' | 'week' | 'year'

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
  unit?: TimeUnit
}

interface HierarchyCardItem {
  id: string
  levels: HierarchyFieldItem[]
  title: string
}

const TIME_TEMPLATE_OPTIONS: Array<{ key: TimeTemplateKey; label: string; title: string; units: TimeUnit[] }> = [
  { key: 'year', label: '年', title: '年分析', units: ['year'] },
  { key: 'half_year', label: '半年', title: '半年分析', units: ['year', 'half_year'] },
  { key: 'year_quarter', label: '年季', title: '季度分析', units: ['year', 'quarter'] },
  { key: 'year_month', label: '年月', title: '月分析', units: ['year', 'month'] },
  { key: 'year_week', label: '年周', title: '周分析', units: ['year', 'week'] },
  { key: 'year_date', label: '年月日', title: '自然日分析', units: ['year', 'month', 'date'] }
]

function formatFieldName(field: DimensionFieldOption) {
  const bizName = field.bizName || field.techId
  const techId = field.techId || field.key
  return `${bizName} (${techId})`
}

function detectTimeUnit(field: DimensionFieldOption): TimeUnit | undefined {
  const source = `${field.bizName || ''} ${field.originName || ''} ${field.techId || ''}`.toLowerCase()
  if (/half|half_year|半年|半年度/.test(source)) {
    return 'half_year'
  }
  if (/quarter|季/.test(source)) {
    return 'quarter'
  }
  if (/week|周/.test(source)) {
    return 'week'
  }
  if (/hour|时|小时/.test(source)) {
    return 'hour'
  }
  if (/month|月/.test(source)) {
    return 'month'
  }
  if (/date|day|日/.test(source)) {
    return 'date'
  }
  if (/year|yyyy|年/.test(source)) {
    return 'year'
  }
  return undefined
}

function buildFieldItem(field: DimensionFieldOption): HierarchyFieldItem {
  return {
    displayName: formatFieldName(field),
    key: field.key || field.techId,
    levelName: field.bizName || field.techId,
    techId: field.techId,
    unit: detectTimeUnit(field)
  }
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
      const configJson = JSON.stringify({
        fieldKey: level.key,
        fieldName: level.levelName,
        techId: level.techId
      })
      return {
        childDimId: level.childDimId,
        configJson,
        dimId,
        drillDirection: level.drillDirection || 'DOWN',
        hierarchyId: level.hierarchyId ? Number(level.hierarchyId) : undefined,
        hierarchyName: card.title,
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

function buildTimeCards(
  templateKeys: TimeTemplateKey[],
  availableFields: HierarchyFieldItem[],
  record: DimensionModelItem | null | undefined
) {
  const fieldByUnit = new Map<TimeUnit, HierarchyFieldItem>()
  availableFields.forEach(field => {
    if (field.unit && !fieldByUnit.has(field.unit)) {
      fieldByUnit.set(field.unit, field)
    }
  })

  const cards = templateKeys
    .map(key => TIME_TEMPLATE_OPTIONS.find(option => option.key === key))
    .filter((item): item is (typeof TIME_TEMPLATE_OPTIONS)[number] => Boolean(item))
    .map(option => {
      const levels = option.units
        .map(unit => fieldByUnit.get(unit))
        .filter((item): item is HierarchyFieldItem => Boolean(item))
      if (!levels.length) {
        return null
      }
      return {
        id: option.key,
        levels,
        title: option.title
      } as HierarchyCardItem
    })
    .filter((item): item is HierarchyCardItem => Boolean(item))

  if (cards.length) {
    return cards
  }

  return [
    {
      id: 'default-time',
      levels: [],
      title: record?.zhName ? `${record.zhName}层级` : '时间层级'
    }
  ]
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

function resolveTemplateKeys(cards: HierarchyCardItem[]) {
  const keys = cards
    .map(card => TIME_TEMPLATE_OPTIONS.find(option => option.title === card.title)?.key)
    .filter((item): item is TimeTemplateKey => Boolean(item))
  return keys.length ? keys : TIME_TEMPLATE_OPTIONS.map(item => item.key)
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
  const [selectedTemplates, setSelectedTemplates] = useState<TimeTemplateKey[]>(
    TIME_TEMPLATE_OPTIONS.map(item => item.key)
  )

  const isTimeDimension = record?.dimType === 'time'

  const availableFields = useMemo(() => (record?.relatedFields || []).map(buildFieldItem), [record?.relatedFields])

  const availableFieldMap = useMemo(() => {
    return new Map(availableFields.map(item => [item.key, item]))
  }, [availableFields])

  useEffect(() => {
    if (!open) {
      return
    }

    if (hierarchyItems.length) {
      const historyCards = buildCardsFromHierarchy(hierarchyItems, availableFieldMap)
      if (historyCards.length) {
        setCards(historyCards)
        setActiveCardId(historyCards[0]?.id || '')
        if (isTimeDimension) {
          setSelectedTemplates(resolveTemplateKeys(historyCards))
        }
        return
      }
    }

    if (isTimeDimension) {
      const initCards = buildTimeCards(
        TIME_TEMPLATE_OPTIONS.map(item => item.key),
        availableFields,
        record
      )
      setCards(initCards)
      setActiveCardId(initCards[0]?.id || '')
      setSelectedTemplates(TIME_TEMPLATE_OPTIONS.map(item => item.key))
      return
    }

    const defaultTitle = record?.zhName ? `${record.zhName}层级` : '层级结构'
    setCards([
      {
        id: 'default-std',
        levels: [],
        title: defaultTitle
      }
    ])
    setActiveCardId('default-std')
  }, [availableFieldMap, availableFields, hierarchyItems, isTimeDimension, open, record])

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

  function addFieldToCard(field: HierarchyFieldItem, cardId?: string) {
    const targetId = cardId || activeCardId
    if (!targetId) {
      return
    }
    const target = cards.find(item => item.id === targetId)
    if (!target) {
      return
    }
    if (target.levels.some(item => item.key === field.key)) {
      return
    }
    updateCardLevels(targetId, [...target.levels, field])
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

  function regenerateTimeCards() {
    const nextCards = buildTimeCards(selectedTemplates, availableFields, record)
    setCards(nextCards)
    setActiveCardId(nextCards[0]?.id || '')
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
          {isTimeDimension ? (
            <div className="flex items-center justify-between border-b border-[#e6ebf5] bg-[#f8faff] px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-4 text-[#3d5afe] font-semibold">快捷生成时间层级</span>
                <ACheckbox.Group
                  options={TIME_TEMPLATE_OPTIONS.map(item => ({ label: item.label, value: item.key }))}
                  value={selectedTemplates}
                  onChange={values => setSelectedTemplates(values as TimeTemplateKey[])}
                />
              </div>
              <AButton
                type="primary"
                onClick={regenerateTimeCards}
              >
                生成层级
              </AButton>
            </div>
          ) : null}

          <div className="min-h-0 flex flex-1 overflow-hidden">
            <div className="w-180px border-r border-[#e6ebf5] bg-[#fbfcff]">
              <div className="border-b border-[#e6ebf5] px-3 py-2 text-4 font-semibold">
                {isTimeDimension ? '可选时间层级' : '可选层级'}
              </div>
              <div className="max-h-full overflow-auto p-2 space-y-2">
                {availableFields.map(item => (
                  <div
                    draggable
                    className="cursor-move border border-[#d7def0] rounded bg-white px-2 py-1 text-3 font-medium hover:border-[#3d5afe]"
                    key={item.key}
                    onClick={() => addFieldToCard(item)}
                    onDragStart={event => event.dataTransfer.setData('text/plain', item.key)}
                  >
                    <div className="flex items-center justify-between">
                      <span>{item.displayName}</span>
                      <span className="text-3 text-[#9aa7bd]">≡</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-3">
              <div className="mb-2 text-4 text-[#1f2a44] font-semibold">
                {isTimeDimension ? '时间层级结构构建' : '层级结构构建'}
              </div>
              <div className={isTimeDimension ? 'grid grid-cols-3 gap-2' : 'max-w-320px'}>
                {cards.map(card => (
                  <div
                    key={card.id}
                    className={`rounded border bg-white ${
                      activeCardId === card.id ? 'border-[#3d5afe] shadow-[0_0_0_1px_#3d5afe]' : 'border-[#d7def0]'
                    }`}
                    onClick={() => setActiveCardId(card.id)}
                  >
                    <div className="border-b border-[#d7def0] bg-[#f3f6fd] px-2 py-1 text-center text-3 text-[#1f2a44] font-semibold">
                      {card.title}
                    </div>

                    <div className="p-2 space-y-2">
                      {card.levels.map((level, index) => (
                        <div
                          className="relative border border-[#cbd8f8] rounded bg-white px-2 py-1 text-[#3d5afe]"
                          key={`${card.id}-${level.key}`}
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
                        onDrop={event => {
                          event.preventDefault()
                          const fieldKey = event.dataTransfer.getData('text/plain')
                          const field = availableFieldMap.get(fieldKey)
                          if (!field) {
                            return
                          }
                          addFieldToCard(field, card.id)
                        }}
                      >
                        + 拖入层级组件继续扩展
                      </div>
                    </div>
                  </div>
                ))}
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
