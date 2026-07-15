import dayjs from 'dayjs'
import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons'
import { isMaskedValue, MetricValue, toMetricNumber } from './format'

export function calcPeriodChange(current?: MetricValue, previous?: MetricValue): number | null {
  if (isMaskedValue(current) || isMaskedValue(previous)) return null
  const currentValue = toMetricNumber(current)
  const previousValue = toMetricNumber(previous)
  if (previousValue === 0) return currentValue === 0 ? 0 : null
  return (currentValue - previousValue) / previousValue
}

export function getPreviousDateRange(range: [dayjs.Dayjs, dayjs.Dayjs]) {
  const days = range[1].diff(range[0], 'day') + 1
  const endDate = range[0].subtract(1, 'day')
  const startDate = endDate.subtract(days - 1, 'day')
  return { startDate, endDate, days }
}

export function ChangeText({
  value,
  label = '环比',
  compact = false,
}: {
  value?: number | null | '**'
  label?: string
  compact?: boolean
}) {
  const hasValue = value !== undefined
  if (!hasValue) return null
  if (value === '**') {
    return (
      <span
        style={{
          color: 'var(--color-text-tertiary)',
          fontSize: compact ? 12 : 12,
          fontFamily: 'var(--font-family-number)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          whiteSpace: 'nowrap',
        }}
      >
        {label && <span style={{ color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family-cn)' }}>{label}</span>}
        <span>**</span>
      </span>
    )
  }

  const isUp = (value ?? 0) > 0
  const isFlat = value === 0
  const color = value === null || isFlat
    ? 'var(--color-text-tertiary)'
    : isUp
      ? 'var(--color-data-red)'
      : 'var(--color-data-green)'

  return (
    <span
      style={{
        color,
        fontSize: compact ? 12 : 12,
        fontFamily: 'var(--font-family-number)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        whiteSpace: 'nowrap',
      }}
    >
      {label && <span style={{ color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family-cn)' }}>{label}</span>}
      {value === null ? (
        <span>--</span>
      ) : (
        <>
          {!isFlat && (isUp ? <ArrowUpOutlined style={{ fontSize: 10 }} /> : <ArrowDownOutlined style={{ fontSize: 10 }} />)}
          <span>{isFlat ? '0.0%' : `${isUp ? '+' : '-'}${Math.abs(value * 100).toFixed(1)}%`}</span>
        </>
      )}
    </span>
  )
}
