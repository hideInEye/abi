import React, { useMemo, useState } from 'react'
import { Empty, Table } from 'antd'
import ReactMarkdown from 'react-markdown'

import { stripHtmlTags } from '@/utils'

import styles from './CausalAnalysis.module.css'

type CausalAnalysisData = {
  data?: Record<string, any>[]
  total_df?: Record<string, any> | Record<string, any>[]
  desc?: string
  description?: string
  analysis_response?: string | Record<string, any>
  suggestion?: string
  timeRange?: [string, string]
}

interface CausalAnalysisProps {
  data: CausalAnalysisData
}

const toFixedValue = (value: any, digits = 2) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return '--'
  return num.toFixed(digits)
}

const CausalAnalysis: React.FC<CausalAnalysisProps> = ({ data }) => {
  const [pageSize, setPageSize] = useState<number>(5)

  const tableData = Array.isArray(data?.data) ? data.data : []
  const totalDfRaw = data?.total_df
  const totalDf = Array.isArray(totalDfRaw) ? (totalDfRaw[0] || {}) : (totalDfRaw || {})

  const columns = useMemo(() => {
    if (!tableData.length) return []

    return Object.keys(tableData[0]).map((key) => {
      const isDeltaColumn = /变化量|变化率|diff|ratio/i.test(key)

      return {
        title: key,
        dataIndex: key,
        key,
        ellipsis: true,
        render: (value: any) => {
          const content = value ?? '--'
          if (isDeltaColumn) {
            return <span className={styles.deltaValue}>{content}</span>
          }
          return <span>{content}</span>
        },
      }
    })
  }, [tableData])

  const descriptionText = stripHtmlTags(data?.desc || data?.description || '')
  const suggestionRaw = typeof data?.analysis_response === 'object'
    ? JSON.stringify(data?.analysis_response)
    : (data?.analysis_response || data?.suggestion || '')
  const suggestionText = stripHtmlTags(suggestionRaw)
  const diffVal = Number(totalDf?.diff_val ?? 0)
  const ratioVal = Number(totalDf?.total_ratio ?? 0)

  return (
    <div className={styles.container}>
      <div className={styles.block}>
        <div className={styles.blockTitle}>指标概览</div>
        <div className={styles.divider} />
        <div className={styles.summaryRow}>
          <div className={styles.metricItem}>
            <div className={styles.metricLabel}>指标值</div>
            <div className={styles.metricValue}>{toFixedValue(totalDf?.total_target_sum)}</div>
          </div>
          <div className={styles.metricItem}>
            <div className={styles.metricLabel}>变化量</div>
            <div className={styles.metricHighlight}>
              {diffVal > 0 ? '+' : ''}
              {toFixedValue(diffVal)}
            </div>
          </div>
          <div className={styles.metricItem}>
            <div className={styles.metricLabel}>变化率</div>
            <div className={styles.metricHighlight}>
              {ratioVal > 0 ? '+' : ''}
              {toFixedValue(ratioVal * 100)}%
            </div>
          </div>
        </div>
      </div>

      <div className={styles.block}>
        <div className={styles.blockTitle}>描述分析</div>
        <div className={styles.divider} />
        <div className={styles.blockContent}>
          <div className={styles.descText}>{descriptionText || '暂无描述分析'}</div>
        </div>
      </div>

      <div className={styles.block}>
        <div className={styles.blockTitle}>影响因素</div>
        <div className={styles.divider} />
        <div className={styles.tableWrap}>
          <Table
            className={styles.factorTable}
            rowKey={(_, index) => String(index)}
            columns={columns}
            dataSource={tableData}
            scroll={{ x: 'max-content', y: 420 }}
            size="middle"
            pagination={{
              pageSize,
              showSizeChanger: true,
              pageSizeOptions: ['5', '10', '20'],
              showQuickJumper: true,
              onShowSizeChange: (_, size) => setPageSize(size),
            }}
            locale={{
              emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据" />,
            }}
          />
        </div>
      </div>

      <div className={styles.block}>
        <div className={styles.blockTitle}>归因建议</div>
        <div className={styles.divider} />
        <div className={styles.blockContent}>
          <div className={styles.markdownContent}>
            <ReactMarkdown>{suggestionText || '暂无归因建议'}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CausalAnalysis
