import dayjs from 'dayjs'

/**
 * 获取本周范围（周一 ~ 周日，中国习惯）
 */
export function getWeekRange(now: dayjs.Dayjs) {
  const dayOfWeek = now.day() // 0=周日, 1=周一, ..., 6=周六
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const startOfWeek = now.subtract(daysSinceMonday, 'day').startOf('day')
  const endOfWeek = startOfWeek.add(6, 'day').endOf('day')
  return { startOfWeek, endOfWeek }
}

/**
 * 将日期字符串转换为当日最后一刻
 */
export function toEndOfDay(dateStr: string): Date {
  const d = new Date(dateStr)
  d.setHours(23, 59, 59, 999)
  return d
}
