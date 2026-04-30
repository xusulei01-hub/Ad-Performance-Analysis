import { PAGE_SIZES } from '../constants'

/**
 * 解析分页参数
 */
export function parsePagination(
  query: { page?: string | number; page_size?: string | number },
  defaultPageSize: number = PAGE_SIZES.DEFAULT,
  maxPageSize: number = PAGE_SIZES.MAX,
) {
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(maxPageSize, Math.max(1, Number(query.page_size) || defaultPageSize))
  return { page, pageSize, skip: (page - 1) * pageSize }
}
