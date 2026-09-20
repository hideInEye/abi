import { Input, Pagination } from 'antd'
import React, { useState } from 'react'

import styles from './OntologyTablePagination.module.scss'

interface OntologyTablePaginationProps {
  readonly onChange: (page: number, pageSize: number) => void
  readonly pageNum?: number
  readonly pageSize: number
  readonly total: number
}

const PAGE_SIZE_OPTIONS = [12, 18, 24, 30]

export const OntologyTablePagination: React.FC<OntologyTablePaginationProps> = ({ onChange, pageNum = 1, pageSize, total }) => {
  const [jumpValue, setJumpValue] = useState('')
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const handlePageChange = (nextPageNum: number, nextPageSize: number) => {
    const resolvedPageNum = nextPageSize === pageSize ? nextPageNum : 1
    onChange(resolvedPageNum, nextPageSize)
  }

  const handleQuickJump = () => {
    if (!/^\d+$/.test(jumpValue)) return

    const nextPageNum = Number(jumpValue)
    if (nextPageNum < 1 || nextPageNum > totalPages) return

    handlePageChange(nextPageNum, pageSize)
    setJumpValue('')
  }

  return (
    <div className={styles.root}>
      <Pagination
        align="end"
        className={styles.pagination}
        current={pageNum}
        pageSize={pageSize}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        showSizeChanger
        showTotal={value => `共 ${value} 条`}
        total={total}
        onChange={handlePageChange}
      />
      <span className={styles.quickJumper}>
        跳至
        <Input
          aria-label="跳转页码"
          inputMode="numeric"
          value={jumpValue}
          onChange={event => setJumpValue(event.target.value)}
          onPressEnter={handleQuickJump}
        />
        页
      </span>
    </div>
  )
}

export default OntologyTablePagination
