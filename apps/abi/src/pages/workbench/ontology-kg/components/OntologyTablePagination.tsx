import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import React, { useCallback, useMemo, useState } from 'react'

import { getVisiblePaginationItems } from '../utils/pagination'

interface OntologyTablePaginationProps {
  readonly current: number
  readonly onChange: (page: number, pageSize: number) => void
  readonly pageSize: number
  readonly total: number
}

const PAGE_SIZE_OPTIONS = [
  { label: '10条/页', value: 10 },
  { label: '15条/页', value: 15 },
  { label: '20条/页', value: 20 },
  { label: '25条/页', value: 25 },
  { label: '30条/页', value: 30 },
]

export const OntologyTablePagination: React.FC<OntologyTablePaginationProps> = ({ current, onChange, pageSize, total }) => {
  const [jumpValue, setJumpValue] = useState('')
  const safePageSize = useMemo(() => Math.max(1, pageSize || 10), [pageSize])
  const safeTotal = useMemo(() => Math.max(0, total || 0), [total])
  const totalPages = useMemo(() => Math.ceil(safeTotal / safePageSize) || 1, [safePageSize, safeTotal])
  const currentPage = useMemo(() => Math.min(Math.max(1, current || 1), totalPages), [current, totalPages])
  const pageItems = useMemo(() => getVisiblePaginationItems(currentPage, totalPages), [currentPage, totalPages])

  const handlePageChange = useCallback(
    (page: number): void => {
      if (page >= 1 && page <= totalPages && page !== currentPage) {
        onChange(page, safePageSize)
      }
    },
    [currentPage, onChange, safePageSize, totalPages],
  )

  const handlePageSizeChange = useCallback(
    (nextPageSize: number): void => {
      onChange(1, nextPageSize)
    },
    [onChange],
  )

  const handleJump = useCallback((): void => {
    const page = Number.parseInt(jumpValue, 10)
    if (!Number.isNaN(page) && page >= 1 && page <= totalPages) {
      onChange(page, safePageSize)
      setJumpValue('')
    }
  }, [jumpValue, onChange, safePageSize, totalPages])

  return (
    <div className="data-source-pagination">
      <span className="total-text">共 {safeTotal} 条</span>
      <div className="pagination-controls">
        <ASelect className="page-size-select" options={PAGE_SIZE_OPTIONS} value={safePageSize} onChange={handlePageSizeChange} />
        <button className="page-btn" disabled={currentPage === 1} type="button" onClick={() => handlePageChange(currentPage - 1)}>
          <LeftOutlined />
        </button>
        {pageItems.map((page, index) =>
          page === 'ellipsis' ? (
            <span key={`ellipsis-${index}`} className="page-item page-ellipsis">
              ...
            </span>
          ) : (
            <span key={page} className={`page-item ${page === currentPage ? 'page-active' : ''}`} onClick={() => handlePageChange(page)}>
              {page}
            </span>
          ),
        )}
        <button className="page-btn" disabled={currentPage === totalPages} type="button" onClick={() => handlePageChange(currentPage + 1)}>
          <RightOutlined />
        </button>
        <span className="quick-jumper">
          前往
          <AInput
            className="jump-input"
            style={{ width: 48, textAlign: 'center' }}
            value={jumpValue}
            onChange={(event) => setJumpValue(event.target.value)}
            onPressEnter={handleJump}
          />
          页
        </span>
      </div>
    </div>
  )
}

export default OntologyTablePagination
