export type PaginationPageItem = number | 'ellipsis'

export function getVisiblePaginationItems(currentPage: number, totalPages: number, maxVisible = 5): PaginationPageItem[] {
  const safeTotalPages = Math.max(1, Math.floor(totalPages) || 1)
  const safeCurrentPage = Math.min(Math.max(1, Math.floor(currentPage) || 1), safeTotalPages)
  const safeMaxVisible = Math.max(3, Math.floor(maxVisible) || 5)
  const pages: PaginationPageItem[] = []

  if (safeTotalPages <= safeMaxVisible) {
    for (let page = 1; page <= safeTotalPages; page += 1) {
      pages.push(page)
    }
    return pages
  }

  if (safeCurrentPage <= 3) {
    for (let page = 1; page <= safeMaxVisible - 1; page += 1) {
      pages.push(page)
    }
    pages.push('ellipsis', safeTotalPages)
    return pages
  }

  if (safeCurrentPage >= safeTotalPages - 2) {
    pages.push(1, 'ellipsis')
    for (let page = safeTotalPages - (safeMaxVisible - 2); page <= safeTotalPages; page += 1) {
      pages.push(page)
    }
    return pages
  }

  pages.push(1, 'ellipsis', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, 'ellipsis', safeTotalPages)
  return pages
}
