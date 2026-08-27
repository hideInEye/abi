import { FileTextOutlined, FolderOutlined } from '@ant-design/icons'
import { Alert, Spin, Transfer, Tree } from 'antd'
import type { FormInstance, TransferProps } from 'antd'
import React, { useEffect, useMemo, useState } from 'react'

import { useKnowledgeDimensions } from '../hooks/useKnowledgeDimensions'
import type { KnowledgeFormValues } from '../types/metricModeling.types'
import { getMappedMetricFieldDisplayName } from '../utils/knowledgeOperateDrawer.utils'

import styles from './knowledgeOperateDrawer.DimensionStep.module.scss'

interface SelectedDimensionSnapshot {
  groupId?: string
  groupName?: string
  key: string
  techName?: string
  title?: string
}

interface DimensionTransferItem {
  groupId?: string
  groupName?: string
  key: string
  techName: string
  title: string
}

interface SelectedDimensionGroup {
  groupId: string
  groupName: string
  items: DimensionTransferItem[]
}

interface Props {
  readonly form: FormInstance<KnowledgeFormValues>
}

type UnknownRecord = Record<string, unknown>

function groupSelectedDimensionItems(items: DimensionTransferItem[]): SelectedDimensionGroup[] {
  const groups = new Map<string, SelectedDimensionGroup>()
  items.forEach(item => {
    const groupId = item.groupId || 'ungrouped'
    const group = groups.get(groupId) || {
      groupId,
      groupName: item.groupName || '未分组',
      items: []
    }
    group.items.push(item)
    groups.set(groupId, group)
  })
  return Array.from(groups.values())
}

function parseSelectedDimensions(value: unknown): SelectedDimensionSnapshot[] {
  if (!value) return []
  if (Array.isArray(value)) {
    return value
      .map(item => {
        if (item && typeof item === 'object') {
          const source = item as UnknownRecord
          const key = String(source.dimId ?? source.id ?? '').trim()
          if (!key) return null
          return {
            groupId: String(source.groupId ?? source.group_id ?? '').trim() || undefined,
            groupName: String(source.groupName ?? source.group_name ?? '').trim() || undefined,
            key,
            techName: String(source.techName || '').trim() || undefined,
            title: getMappedMetricFieldDisplayName(source.title ?? source.bizName ?? source.dimName ?? '') || undefined
          }
        }
        const key = String(item ?? '').trim()
        return key ? { key } : null
      })
      .filter(Boolean) as SelectedDimensionSnapshot[]
  }
  if (typeof value === 'string') {
    try {
      return parseSelectedDimensions(JSON.parse(value))
    } catch {
      return value
        .split(',')
        .map(key => key.trim())
        .filter(Boolean)
        .map(key => ({ key }))
    }
  }
  return []
}

export const KnowledgeOperateDimensionStep: React.FC<Props> = ({ form }) => {
  const watchedDimensionFieldIds = AForm.useWatch('dimensionFieldIds', { form, preserve: true })
  const selectedDimensions = useMemo(
    () => parseSelectedDimensions(watchedDimensionFieldIds ?? form.getFieldValue('dimensionFieldIds')),
    [form, watchedDimensionFieldIds]
  )
  const [targetKeys, setTargetKeys] = useState<string[]>(selectedDimensions.map(item => item.key))
  const { error, loading, options, retry, treeData } = useKnowledgeDimensions()
  const snapshots = useMemo(() => new Map(selectedDimensions.map(item => [item.key, item])), [selectedDimensions])

  useEffect(() => {
    setTargetKeys(selectedDimensions.map(item => item.key))
  }, [selectedDimensions])

  const dataSource = useMemo(() => {
    const map = new Map<string, DimensionTransferItem>(
      options.map(item => [
        item.key,
        {
          groupId: item.groupId,
          groupName: item.groupName,
          key: item.key,
          techName: item.techName,
          title: item.title
        }
      ])
    )
    targetKeys.forEach(key => {
      if (!map.has(key)) {
        const snapshot = snapshots.get(key)
        map.set(key, {
          groupId: snapshot?.groupId,
          groupName: snapshot?.groupName,
          key,
          techName: snapshot?.techName || key,
          title: snapshot?.title || snapshot?.techName || key
        })
      }
    })
    return Array.from(map.values())
  }, [options, snapshots, targetKeys])

  const transferTree = useMemo(
    () =>
      treeData.map(group => ({
        ...group,
        checkable: false,
        children: group.children.map(item => ({
          ...item,
          disabled: targetKeys.includes(item.value),
          key: item.value,
          title: (
            <span className={styles.treeNodeTitle}>
              <FileTextOutlined className={styles.fileIcon} />
              <span className={styles.nodeText}>{item.title}</span>
            </span>
          )
        })),
        disableCheckbox: true,
        key: group.value,
        title: (
          <span className={styles.treeNodeTitle}>
            <FolderOutlined className={styles.folderIcon} />
            <span className={styles.nodeText}>{group.title}</span>
          </span>
        )
      })),
    [targetKeys, treeData]
  )

  const handleChange: TransferProps<DimensionTransferItem>['onChange'] = keys => {
    const nextKeys = keys.map(String)
    const optionMap = new Map(dataSource.map(item => [item.key, item]))
    form.setFieldValue(
      'dimensionFieldIds',
      JSON.stringify(
        nextKeys.map(key => ({
          dimId: key,
          techName: optionMap.get(key)?.techName || optionMap.get(key)?.title || key
        }))
      )
    )
    setTargetKeys(nextKeys)
  }

  return (
    <>
      <AForm.Item
        hidden
        name="dimensionFieldIds"
      >
        <AInput />
      </AForm.Item>
      {error ? (
        <Alert
          className="mb-3"
          message="维度数据加载失败"
          type="error"
          action={
            <AButton
              size="small"
              onClick={retry}
            >
              重试
            </AButton>
          }
        />
      ) : null}
      <Spin spinning={loading}>
        <Transfer<DimensionTransferItem>
          className={styles.dimensionTransfer}
          dataSource={dataSource}
          listStyle={{ height: 420, width: '46%' }}
          render={item => item.title}
          showSelectAll={false}
          targetKeys={targetKeys}
          onChange={handleChange}
        >
          {({ direction, filteredItems, onItemSelect, selectedKeys }) =>
            direction === 'left' ? (
              <Tree
                blockNode
                checkable
                checkedKeys={[...selectedKeys, ...targetKeys]}
                className={styles.dimensionTree}
                treeData={transferTree}
                onCheck={(_, info) => {
                  const key = String(info.node.key)
                  if (!key.startsWith('group-')) onItemSelect(key, !selectedKeys.includes(key))
                }}
              />
            ) : (
              <div className={styles.selectedList}>
                {groupSelectedDimensionItems(filteredItems).map(group => (
                  <section
                    className={styles.selectedGroup}
                    key={group.groupId}
                  >
                    <div className={styles.selectedGroupTitle}>
                      <FolderOutlined className={styles.folderIcon} />
                      <span className={styles.nodeText}>{group.groupName}</span>
                    </div>
                    <div className={styles.selectedGroupItems}>
                      {group.items.map(item => {
                        const checked = selectedKeys.includes(item.key)
                        return (
                          <div
                            className={styles.selectedItem}
                            key={item.key}
                            onClick={() => onItemSelect(item.key, !checked)}
                          >
                            <ACheckbox
                              checked={checked}
                              className={styles.selectedItemCheckbox}
                            />
                            <FileTextOutlined className={styles.fileIcon} />
                            <span
                              className={styles.selectedItemTitle}
                              title={item.title}
                            >
                              {item.title}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )
          }
        </Transfer>
      </Spin>
    </>
  )
}
