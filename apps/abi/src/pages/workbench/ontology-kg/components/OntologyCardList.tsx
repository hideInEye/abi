import { Empty, Spin } from 'antd'
import React from 'react'

export interface OntologyCardField<T> {
  readonly key: string
  readonly label: string
  readonly render: (record: T) => React.ReactNode
}

interface OntologyCardListProps<T> {
  readonly actions?: (record: T) => React.ReactNode
  readonly dataSource: readonly T[]
  readonly emptyText?: string
  readonly fields: readonly OntologyCardField<T>[]
  readonly loading?: boolean
  readonly rowKey: (record: T) => React.Key
  readonly title: (record: T) => React.ReactNode
  readonly titleExtra?: (record: T) => React.ReactNode
  readonly titlePrefix?: (record: T) => React.ReactNode
}

function normalizeCardValue(value: React.ReactNode): React.ReactNode {
  return value === null || value === undefined || value === '' ? '-' : value
}

export function OntologyCardList<T>({
  actions,
  dataSource,
  emptyText = '暂无数据',
  fields,
  loading,
  rowKey,
  title,
  titleExtra,
  titlePrefix,
}: OntologyCardListProps<T>): React.ReactElement {
  if (loading) {
    return (
      <div className="abi-card-empty">
        <Spin />
      </div>
    )
  }

  if (!dataSource.length) {
    return (
      <div className="abi-card-empty">
        <Empty description={emptyText} image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </div>
    )
  }

  return (
    <div className="abi-card-grid">
      <div className="abi-card-grid-inner">
        {dataSource.map(record => {
          const titleNode = title(record)
          const titleText = typeof titleNode === 'string' || typeof titleNode === 'number' ? String(titleNode) : undefined
          const actionsNode = actions?.(record)
          const prefixNode = titlePrefix?.(record)
          const extraNode = titleExtra?.(record)

          return (
            <div key={rowKey(record)} className="abi-data-card">
              <div className="abi-data-card-head">
                <div className="abi-data-card-title">
                  {prefixNode ? <span className="abi-data-card-icon">{prefixNode}</span> : null}
                  <span className="abi-data-card-name" title={titleText}>
                    {normalizeCardValue(titleNode)}
                  </span>
                </div>
                {extraNode ? <div>{extraNode}</div> : null}
              </div>
              <div className="abi-data-card-body">
                {fields.map(field => {
                  const valueNode = normalizeCardValue(field.render(record))
                  const valueTitle = typeof valueNode === 'string' || typeof valueNode === 'number' ? String(valueNode) : undefined

                  return (
                    <div key={field.key} className="row">
                      <span className="lbl">{field.label}</span>
                      <span className="val" title={valueTitle}>
                        {valueNode}
                      </span>
                    </div>
                  )
                })}
              </div>
              {actionsNode ? <div className="abi-data-card-footer">{actionsNode}</div> : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default OntologyCardList
