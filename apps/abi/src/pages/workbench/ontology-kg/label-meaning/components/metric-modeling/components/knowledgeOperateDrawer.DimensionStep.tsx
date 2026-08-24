import { FileTextOutlined, FolderOutlined } from '@ant-design/icons'
import { Alert, Spin, Transfer, Tree } from 'antd'
import type { FormInstance, TransferProps } from 'antd'
import React, { useMemo, useState } from 'react'

import { useKnowledgeDimensions } from '../hooks/useKnowledgeDimensions'
import type { KnowledgeFormValues } from '../types/metricModeling.types'
import { getMappedMetricFieldDisplayName } from '../utils/knowledgeOperateDrawer.utils'

import styles from './knowledgeOperateDrawer.DimensionStep.module.scss'

interface SelectedDimensionSnapshot {
  key: string
  techName?: string
  title?: string
}

interface Props {
  readonly form: FormInstance<KnowledgeFormValues>
}

type UnknownRecord = Record<string, unknown>

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
  const initialSelected = useMemo(() => parseSelectedDimensions(form.getFieldValue('dimensionFieldIds')), [form])
  const [targetKeys, setTargetKeys] = useState<string[]>(initialSelected.map(item => item.key))
  const { error, loading, options, retry, treeData } = useKnowledgeDimensions()
  const snapshots = useMemo(() => new Map(initialSelected.map(item => [item.key, item])), [initialSelected])

  const dataSource = useMemo(() => {
    const map = new Map(options.map(item => [item.key, { key: item.key, techName: item.techName, title: item.title }]))
    targetKeys.forEach(key => {
      if (!map.has(key)) {
        const snapshot = snapshots.get(key)
        map.set(key, { key, techName: snapshot?.techName || key, title: snapshot?.title || snapshot?.techName || key })
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

  const handleChange: TransferProps['onChange'] = keys => {
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
        <Transfer
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
        </Transfer>
      </Spin>
    </>
  )
}
