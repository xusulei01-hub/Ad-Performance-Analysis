export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  columns: { title: string; dataIndex?: string; render?: (v: any, record: T) => any }[],
  filename: string
) {
  const headers = columns.map((c) => c.title)
  const rows = data.map((record) =>
    columns.map((col) => {
      const val = col.dataIndex ? record[col.dataIndex] : undefined
      const display = col.render ? col.render(val, record) : (val ?? '')
      return String(display).includes(',') || String(display).includes('"')
        ? `"${String(display).replace(/"/g, '""')}"`
        : String(display)
    })
  )

  const bom = '﻿'
  const csv = bom + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
