import { FileTextOutlined, FolderOpenOutlined, FolderOutlined } from '@ant-design/icons'
import { Spin, Transfer, Tree, message } from 'antd'
import type { FormInstance, TransferProps } from 'antd'
import React from 'react'

import { OntologyFormSectionTitle } from '@/pages/workbench/ontology-kg/components/OntologyFormSectionTitle'
import { queryDimensionList } from '@/service/api/dimension-modeling'
import { tableSemanticsGroupList } from '@/service/api/table-semantics'

import type { KnowledgeFormValues } from '../types/metricModeling.types'
import { formatMappedDimensionOptionTitle, getMappedMetricFieldDisplayName } from '../utils/knowledgeOperateDrawer.utils'
import { getKnowledgeSpaceId } from '../utils/space'

import styles from './knowledgeOperateDrawer.DimensionStep.module.scss'

interface DimensionGroupItem {
  groupId: string
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

type UnknownRecord = Record<string, unknown>

function getPathValue(source: unknown, path: string) {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (!acc || typeof acc !== 'object') {
      return undefined
    }
    return (acc as UnknownRecord)[key]
  }, source)
}

function getFirstArray(res: unknown, paths: string[]) {
  for (const path of paths) {
    if (!path) {
      if (Array.isArray(res)) {
        return res
      }
    } else {
      const value = getPathValue(res, path)
      if (Array.isArray(value)) {
        return value
      }
    }
  }
  return []
}

function normalizeRows(res: unknown): unknown[] {
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

function normalizeDimensionGroup(item: unknown): DimensionGroupItem | null {
  const source = item as UnknownRecord
  const groupId = String(source?.groupId ?? source?.id ?? '').trim()
  const groupName = String(source?.groupName ?? source?.name ?? '').trim()
  if (!groupId || !groupName) {
    return null
  }
  return { groupId, groupName }
}

function pickText(item: unknown, keys: string[]) {
  const source = item as UnknownRecord
  for (const key of keys) {
    const value = String(source?.[key] ?? '').trim()
    if (value) {
      return value
    }
  }
  return ''
}

function normalizeDimensionOption(item: unknown): DimensionTransferItem | null {
  const dimId = pickText(item, ['dimId', 'id', 'dimensionId'])
  if (!dimId) {
    return null
  }

  const bizName = pickText(item, ['bizName', 'zhName', 'dimName'])
  const techName = pickText(item, ['techName', 'englishName', 'dimCode'])
  const title = formatMappedDimensionOptionTitle({
    bizName,
    fallback: dimId,
    techName
  })
  return { key: dimId, techName, title }
}

function parseSelectedDimensions(dimensionFieldIds?: unknown): SelectedDimensionSnapshot[] {
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
          const source = item as UnknownRecord
          const key = String(source.dimId ?? source.id ?? '').trim()
          if (!key) {
            return null
          }
          const techName = String(source.techName ?? '').trim()
          const rawTitle = source.title ?? source.bizName ?? source.zhName ?? source.dimName
          const title = source.title
            ? getMappedMetricFieldDisplayName(rawTitle)
            : formatMappedDimensionOptionTitle({
                bizName: rawTitle,
                fallback: key,
                techName
              })
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
  const loadingDimensionGroupIdsRef = React.useRef<Set<string>>(new Set())
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
            spaceId: getKnowledgeSpaceId()
          })
        )
        const groups = rows.map(normalizeDimensionGroup).filter(Boolean) as DimensionGroupItem[]
        setDimensionGroups(groups)
        setExpandedKeys([])
      } catch {
        message.error('维度分组查询失败')
      } finally {
        setLoadingGroups(false)
      }
    }

    fetchDimensionGroups()
  }, [])

  const fetchDimensionsByGroup = useCallback(
    async (groupId: string) => {
      const groupKey = String(groupId)
      if (loadingDimensionGroupIdsRef.current.has(groupKey)) {
        return
      }

      loadingDimensionGroupIdsRef.current.add(groupKey)
      setLoadingDimensionGroupIds(prev => [...prev, groupKey])
      try {
        const rows = normalizeRows(
          await queryDimensionList({
            groupId,
            pageNum: 1,
            pageSize: 1000,
            spaceId: getKnowledgeSpaceId()
          })
        )
        setDimensionMap(prev => ({
          ...prev,
          [groupKey]: rows.map(normalizeDimensionOption).filter(Boolean) as DimensionTransferItem[]
        }))
      } catch {
        message.error('维度列表查询失败')
      } finally {
        loadingDimensionGroupIdsRef.current.delete(groupKey)
        setLoadingDimensionGroupIds(prev => prev.filter(item => item !== groupKey))
      }
    },
    []
  )

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
        isLeaf: true,
        key: item.key,
        title: (
          <span className={styles.treeNodeTitle}>
            <FileTextOutlined className={styles.fileIcon} />
            <span className={styles.nodeText}>{item.title}</span>
          </span>
        )
      }))
      const treeKey = `group-${group.groupId}`
      const isExpanded = expandedKeys.includes(treeKey)

      return {
        checkable: false,
        children,
        className: styles.groupNode,
        disableCheckbox: true,
        isLeaf: false,
        key: treeKey,
        title: (
          <span className={styles.treeNodeTitle}>
            {isExpanded ? (
              <FolderOpenOutlined className={styles.folderIcon} />
            ) : (
              <FolderOutlined className={styles.folderIcon} />
            )}
            <span className={styles.nodeText}>{group.groupName}</span>
          </span>
        )
      }
    })
  }, [dimensionGroups, dimensionMap, expandedKeys, targetKeys])

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

  const handleLoadTreeData = async (node: { key?: React.Key }) => {
    const key = String(node.key || '')
    if (!key.startsWith('group-')) {
      return
    }
    await fetchDimensionsByGroup(key.replace('group-', ''))
  }

  const handleGroupSelect = (key: string) => {
    const groupId = key.replace('group-', '')
    const isExpanded = expandedKeys.includes(key)
    setExpandedKeys(isExpanded ? expandedKeys.filter(item => item !== key) : [...expandedKeys, key])
    if (!isExpanded) {
      fetchDimensionsByGroup(groupId)
    }
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
      <OntologyFormSectionTitle icon={<FolderOpenOutlined />}>三、维度配置</OntologyFormSectionTitle>
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
                className={styles.dimensionTree}
                expandedKeys={expandedKeys}
                loadData={handleLoadTreeData}
                selectedKeys={[]}
                treeData={treeData}
                onCheck={(_, info) => {
                  const key = String(info.node.key)
                  if (key.startsWith('group-')) {
                    return
                  }
                  onItemSelect(key, !selectedKeys.includes(key))
                }}
                onExpand={(keys, info) => {
                  const nextKeys = keys.map(item => String(item))
                  setExpandedKeys(nextKeys)
                  const key = String(info.node.key)
                  if (info.expanded && key.startsWith('group-')) {
                    fetchDimensionsByGroup(key.replace('group-', ''))
                  }
                }}
                onSelect={(_, info) => {
                  const key = String(info.node.key)
                  if (!key.startsWith('group-')) {
                    onItemSelect(key, !selectedKeys.includes(key))
                    return
                  }
                  handleGroupSelect(key)
                }}
              />
            )
          }}
        </Transfer>
      </Spin>
    </>
  )
}
