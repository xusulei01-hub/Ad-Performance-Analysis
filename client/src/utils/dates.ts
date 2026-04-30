import dayjs from 'dayjs'

export function getWeekRange(now: dayjs.Dayjs) {
  const dayOfWeek = now.day()
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const startOfWeek = now.subtract(daysSinceMonday, 'day').startOf('day')
  const endOfWeek = startOfWeek.add(6, 'day').endOf('day')
  return { startOfWeek, endOfWeek }
}
