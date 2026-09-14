import { Pagination } from 'antd'
import React from 'react'

import styles from './OntologyTablePagination.module.scss'

interface OntologyTablePaginationProps {
  readonly onChange: (page: number, pageSize: number) => void
  readonly pageNum?: number
  readonly pageSize: number
  readonly total: number
}

const PAGE_SIZE_OPTIONS = [12, 18, 24, 30]

export const OntologyTablePagination: React.FC<OntologyTablePaginationProps> = ({ onChange, pageNum = 1, pageSize, total }) => {
  const handlePageChange = (nextPageNum: number, nextPageSize: number) => {
    const resolvedPageNum = nextPageSize === pageSize ? nextPageNum : 1
    onChange(resolvedPageNum, nextPageSize)
  }

  return (
    <div className={styles.root}>
      <Pagination
        align="end"
        className={styles.pagination}
        current={pageNum}
        pageSize={pageSize}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        showQuickJumper
        showSizeChanger
        showTotal={value => `共 ${value} 条`}
        total={total}
        onChange={handlePageChange}
      />
    </div>
  )
}

export default OntologyTablePagination
