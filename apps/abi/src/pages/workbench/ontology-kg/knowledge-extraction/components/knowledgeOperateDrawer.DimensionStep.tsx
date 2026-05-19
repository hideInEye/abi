import { Spin, Transfer, Tree, message } from 'antd'
import type { FormInstance, TransferProps } from 'antd'
import React from 'react'

import { queryDimensionList } from '@/service/api/dimension-modeling'
import { tableSemanticsGroupList } from '@/service/api/table-semantics'

import type { KnowledgeFormValues } from '../types'

interface DimensionGroupItem {
  groupId: number
  groupName: string
}

interface DimensionTransferItem {
  disabled?: boolean
  key: string
  techName: string
  title: string
}

interface SelectedDimensionSnapshot {
  key: string
  techName?: string
  title?: string
}

interface Props {
  readonly form: FormInstance<KnowledgeFormValues>
}

function getFirstArray(res: any, paths: string[]) {
  for (const path of paths) {
    if (!path) {
      if (Array.isArray(res)) {
        return res
      }
    } else {
      const value = path.split('.').reduce((acc, key) => acc?.[key], res)
      if (Array.isArray(value)) {
        return value
      }
    }
  }
  return []
}

function normalizeRows(res: any): any[] {
  return getFirstArray(res, [
    '',
    'rows',
    'list',
    'data.rows',
    'data.list',
    'data',
    'response.data.data.rows',
    'response.data.rows',
    'response.data.data'
  ])
}

function getSpaceId() {
  return Number(localStorage.getItem('spaceId')) || 0
}

function normalizeDimensionGroup(item: any): DimensionGroupItem | null {
  const groupId = Number(item?.groupId ?? item?.id)
  const groupName = String(item?.groupName ?? item?.name ?? '').trim()
  if (!groupId || !groupName) {
    return null
  }
  return { groupId, groupName }
}

function pickText(item: any, keys: string[]) {
  for (const key of keys) {
    const value = String(item?.[key] ?? '').trim()
    if (value) {
      return value
    }
  }
  return ''
}

function normalizeDimensionOption(item: any): DimensionTransferItem | null {
  const dimId = pickText(item, ['dimId', 'id', 'dimensionId'])
  if (!dimId) {
    return null
  }

  const bizName = pickText(item, ['bizName', 'zhName', 'dimName'])
  const techName = pickText(item, ['techName', 'englishName', 'dimCode'])
  const title = bizName && techName ? `${bizName}（${techName}）` : bizName || techName || dimId
  return { key: dimId, techName, title }
}

function parseSelectedDimensions(dimensionFieldIds?: any): SelectedDimensionSnapshot[] {
  if (!dimensionFieldIds) {
    return []
  }
  if (Array.isArray(dimensionFieldIds)) {
    return dimensionFieldIds
      .map(item => {
        if (item === null || item === undefined) {
          return null
        }
        if (typeof item === 'object') {
          const key = String(item.dimId ?? item.id ?? '').trim()
          if (!key) {
            return null
          }
          const techName = String(item.techName ?? '').trim()
          const title = String(item.title ?? '').trim()
          return { key, techName: techName || undefined, title: title || undefined }
        }
        const key = String(item).trim()
        return key ? { key } : null
      })
      .filter(Boolean) as SelectedDimensionSnapshot[]
  }
  if (typeof dimensionFieldIds === 'string') {
    try {
      const parsed = JSON.parse(dimensionFieldIds)
      return parseSelectedDimensions(parsed)
    } catch {
      return dimensionFieldIds
        .split(',')
        .map(item => item.trim())
        .filter(Boolean)
        .map(key => ({ key }))
    }
  }
  return []
}

export const KnowledgeOperateDimensionStep: React.FC<Props> = ({ form }) => {
  const [dimensionGroups, setDimensionGroups] = useState<DimensionGroupItem[]>([])
  const [dimensionMap, setDimensionMap] = useState<Record<string, DimensionTransferItem[]>>({})
  const [expandedKeys, setExpandedKeys] = useState<string[]>([])
  const [loadingGroups, setLoadingGroups] = useState(false)
  const [loadingDimensionGroupIds, setLoadingDimensionGroupIds] = useState<string[]>([])
  const [targetKeys, setTargetKeys] = useState<string[]>([])
  const [selectedSnapshotMap, setSelectedSnapshotMap] = useState<Record<string, SelectedDimensionSnapshot>>({})

  useEffect(() => {
    const selected = parseSelectedDimensions(form.getFieldValue('dimensionFieldIds'))
    setTargetKeys(selected.map(item => item.key))
    setSelectedSnapshotMap(
      selected.reduce<Record<string, SelectedDimensionSnapshot>>((acc, item) => {
        acc[item.key] = item
        return acc
      }, {})
    )
  }, [form])

  useEffect(() => {
    const fetchDimensionGroups = async () => {
      setLoadingGroups(true)
      try {
        const rows = normalizeRows(
          await tableSemanticsGroupList({
            groupType: 'ontology-dimension',
            pageNum: 1,
            pageSize: 1000,
            spaceId: getSpaceId()
          })
        )
        const groups = rows.map(normalizeDimensionGroup).filter(Boolean) as DimensionGroupItem[]
        setDimensionGroups(groups)
        const groupKeys = groups.map(group => `group-${group.groupId}`)
        setExpandedKeys(groupKeys)
      } catch {
        message.error('维度分组查询失败')
      } finally {
        setLoadingGroups(false)
      }
    }

    fetchDimensionGroups()
  }, [])

  const fetchDimensionsByGroup = useCallback(
    async (groupId: number) => {
      const groupKey = String(groupId)
      if (dimensionMap[groupKey] || loadingDimensionGroupIds.includes(groupKey)) {
        return
      }

      setLoadingDimensionGroupIds(prev => [...prev, groupKey])
      try {
        const rows = normalizeRows(
          await queryDimensionList({
            groupId,
            pageNum: 1,
            pageSize: 1000,
            spaceId: getSpaceId()
          })
        )
        setDimensionMap(prev => ({
          ...prev,
          [groupKey]: rows.map(normalizeDimensionOption).filter(Boolean) as DimensionTransferItem[]
        }))
      } catch {
        message.error('维度列表查询失败')
      } finally {
        setLoadingDimensionGroupIds(prev => prev.filter(item => item !== groupKey))
      }
    },
    [dimensionMap, loadingDimensionGroupIds]
  )

  useEffect(() => {
    if (!dimensionGroups.length) {
      return
    }
    dimensionGroups.forEach(group => {
      fetchDimensionsByGroup(group.groupId)
    })
  }, [dimensionGroups, fetchDimensionsByGroup])

  const loadedDimensionOptions = useMemo(() => {
    const map = new Map<string, DimensionTransferItem>()
    Object.values(dimensionMap)
      .flat()
      .forEach(item => {
        map.set(item.key, item)
      })
    targetKeys.forEach(key => {
      if (!map.has(key)) {
        const snapshot = selectedSnapshotMap[key]
        const techName = snapshot?.techName || key
        const title = snapshot?.title || snapshot?.techName || key
        map.set(key, { key, techName, title })
      }
    })
    return Array.from(map.values())
  }, [dimensionMap, selectedSnapshotMap, targetKeys])

  const treeData = useMemo(() => {
    return dimensionGroups.map(group => {
      const groupKey = String(group.groupId)
      const children = dimensionMap[groupKey]?.map(item => ({
        disabled: targetKeys.includes(item.key),
        key: item.key,
        title: item.title
      }))

      return {
        children,
        disabled: true,
        isLeaf: false,
        key: `group-${group.groupId}`,
        title: group.groupName
      }
    })
  }, [dimensionGroups, dimensionMap, targetKeys])

  const handleTransferChange: TransferProps['onChange'] = nextTargetKeys => {
    const nextKeys = nextTargetKeys.map(item => String(item))
    const dimensionOptionMap = new Map(loadedDimensionOptions.map(item => [item.key, item]))
    const relateDims = nextKeys.map(key => {
      const current = dimensionOptionMap.get(key)
      return {
        dimId: Number(key),
        techName: current?.techName || current?.title || key
      }
    })
    setTargetKeys(nextKeys)
    form.setFieldValue('dimensionFieldIds', JSON.stringify(relateDims))
  }

  const handleLoadTreeData = async (node: any) => {
    const key = String(node.key || '')
    if (!key.startsWith('group-')) {
      return
    }
    await fetchDimensionsByGroup(Number(key.replace('group-', '')))
  }

  const renderRightList = ({
    filteredItems,
    onItemSelect,
    selectedKeys
  }: {
    filteredItems: DimensionTransferItem[]
    onItemSelect: (key: string, selected: boolean) => void
    selectedKeys: React.Key[]
  }) => {
    if (!filteredItems.length) {
      return (
        <div className="h-full flex items-center justify-center">
          <AEmpty image={AEmpty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      )
    }

    return (
      <div className="h-full overflow-auto p-2">
        {filteredItems.map(item => {
          const checked = selectedKeys.includes(item.key)
          return (
            <div
              className="mb-1 flex cursor-pointer items-center rounded px-2 py-1 hover:bg-gray-50"
              key={item.key}
              onClick={() => onItemSelect(item.key, !checked)}
            >
              <ACheckbox
                checked={checked}
                className="mr-2"
              />
              <span className="truncate">{item.title}</span>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <>
      <div className="mb-4 text-lg font-semibold">三、维度配置</div>
      <AForm.Item
        hidden
        name="dimensionFieldIds"
      >
        <AInput />
      </AForm.Item>
      <Spin spinning={loadingGroups}>
        <Transfer
          dataSource={loadedDimensionOptions}
          listStyle={{ height: 420, width: '46%' }}
          render={item => item.title}
          showSelectAll={false}
          targetKeys={targetKeys}
          onChange={handleTransferChange}
        >
          {({ direction, filteredItems, onItemSelect, selectedKeys }) => {
            if (direction === 'right') {
              return renderRightList({
                filteredItems: filteredItems as DimensionTransferItem[],
                onItemSelect: onItemSelect as (key: string, selected: boolean) => void,
                selectedKeys
              })
            }

            return (
              <Tree
                blockNode
                checkable
                checkedKeys={[...selectedKeys, ...targetKeys]}
                expandedKeys={expandedKeys}
                loadData={handleLoadTreeData}
                treeData={treeData}
                onExpand={keys => setExpandedKeys(keys.map(item => String(item)))}
                onCheck={(_, info) => {
                  const key = String(info.node.key)
                  if (key.startsWith('group-')) {
                    return
                  }
                  onItemSelect(key, !selectedKeys.includes(key))
                }}
              />
            )
          }}
        </Transfer>
      </Spin>
    </>
  )
}
