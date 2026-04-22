import React, { useEffect, useState, useCallback } from 'react'
import { Row, Col, Card, Progress, Spin, Empty } from 'antd'
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  DollarOutlined,
  UserAddOutlined,
  BankOutlined,
  PercentageOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  BarChartOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { dashboardService } from '@services/dashboardService'
import { DailyOverview, WeeklyOverview, MonthlyOverview, RankingsData } from '@/types'

const cardTitleStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-large)',
  fontWeight: 'var(--font-weight-medium)',
  marginBottom: 'var(--margin-loose)',
}

const SOFT_COLORS = [
  '#6B8DD6',
  '#E8917A',
  '#7BC4A6',
  '#D4A5A5',
  '#A8C6E0',
  '#D4B483',
  '#9DB0CE',
  '#B8D4B8',
  '#D9B8D4',
  '#C8C8A9',
]

const metricCardStyle: React.CSSProperties = {
  borderRadius: 'var(--radius-extra-large)',
  boxShadow: 'var(--shadow-elevation-small)',
}

function formatNumber(val: number): string {
  if (val >= 10000) return (val / 10000).toFixed(1) + '万'
  if (val >= 1000) return val.toLocaleString()
  return String(val)
}

function ChangeTag({ value, suffix = '%' }: { value: number; suffix?: string }) {
  const isUp = value >= 0
  return (
    <span
      style={{
        color: isUp ? 'var(--color-data-red)' : 'var(--color-data-green)',
        fontSize: 'var(--font-size-small)',
        fontFamily: 'var(--font-family-number)',
        marginLeft: 8,
      }}
    >
      {isUp ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
      {Math.abs(value * 100).toFixed(1)}{suffix}
    </span>
  )
}

function MetricCard({
  title,
  value,
  prefix,
  suffix,
  precision = 0,
  icon,
  change,
  target,
}: {
  title: string
  value: number
  prefix?: string
  suffix?: string
  precision?: number
  icon: React.ReactNode
  change?: number
  target?: number
}) {
  return (
    <Card style={metricCardStyle} bodyStyle={{ padding: 'var(--padding-loose)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 'var(--radius-large)',
            backgroundColor: 'var(--color-brand-primary-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-brand-primary)',
            fontSize: 20,
          }}
        >
          {icon}
        </div>
        <span style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-text-secondary)' }}>
          {title}
        </span>
      </div>
      <div style={{ fontSize: 28, fontFamily: 'var(--font-family-number)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)' }}>
        {prefix}{value.toLocaleString(undefined, { minimumFractionDigits: precision, maximumFractionDigits: precision })}{suffix}
        {change !== undefined && <ChangeTag value={change} />}
      </div>
      {target !== undefined && target > 0 && (
        <div style={{ marginTop: 12 }}>
          <Progress
            percent={Math.min(100, Number(((value / target) * 100).toFixed(1)))}
            size="small"
            strokeColor="var(--color-brand-primary)"
            trailColor="var(--color-background-tertiary)"
            format={(p) => (
              <span style={{ fontSize: 'var(--font-size-small)', fontFamily: 'var(--font-family-number)' }}>
                {p}%
              </span>
            )}
          />
          <div style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-text-tertiary)', marginTop: 4 }}>
            目标: {prefix}{target.toLocaleString()}
          </div>
        </div>
      )}
    </Card>
  )
}

const Dashboard: React.FC = () => {
  const [daily, setDaily] = useState<DailyOverview | null>(null)
  const [weekly, setWeekly] = useState<WeeklyOverview | null>(null)
  const [monthly, setMonthly] = useState<MonthlyOverview | null>(null)
  const [rankings, setRankings] = useState<RankingsData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [d, w, m, r] = await Promise.all([
        dashboardService.getDailyOverview(),
        dashboardService.getWeeklyOverview(),
        dashboardService.getMonthlyOverview(),
        dashboardService.getRankings(),
      ])
      setDaily(d)
      setWeekly(w)
      setMonthly(m)
      setRankings(r)
    } catch (e) {
      console.error('Dashboard fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const costRankingOption = rankings?.costRanking.length
    ? {
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: {
          type: 'category',
          data: rankings.costRanking.map((r) => r.channel),
          axisLabel: { fontFamily: 'var(--font-family-cn)' },
        },
        yAxis: {
          type: 'value',
          axisLabel: {
            formatter: (v: number) => formatNumber(v),
            fontFamily: 'var(--font-family-number)',
          },
        },
        series: [
          {
            name: '花费',
            type: 'bar',
            data: rankings.costRanking.map((r, i) => ({
              value: r.cost,
              itemStyle: {
                color: SOFT_COLORS[i % SOFT_COLORS.length],
                borderRadius: [4, 4, 0, 0],
              },
            })),
            barWidth: '50%',
          },
        ],
      }
    : null

  const performanceRankingOption = rankings?.performanceRanking.length
    ? {
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        legend: { data: ['ROI', '激活成本'], bottom: 0 },
        grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
        xAxis: {
          type: 'category',
          data: rankings.performanceRanking.map((r) => r.channel),
          axisLabel: { fontFamily: 'var(--font-family-cn)' },
        },
        yAxis: [
          {
            type: 'value',
            name: 'ROI',
            position: 'left',
            axisLabel: { fontFamily: 'var(--font-family-number)' },
          },
          {
            type: 'value',
            name: '激活成本',
            position: 'right',
            axisLabel: {
              formatter: (v: number) => '¥' + v,
              fontFamily: 'var(--font-family-number)',
            },
          },
        ],
        series: [
          {
            name: 'ROI',
            type: 'bar',
            data: rankings.performanceRanking.map((r) => Number(r.roi?.toFixed(2))),
            itemStyle: { color: 'var(--color-data-red)', borderRadius: [4, 4, 0, 0] },
            barWidth: '30%',
          },
          {
            name: '激活成本',
            type: 'line',
            yAxisIndex: 1,
            data: rankings.performanceRanking.map((r) => r.cpa),
            itemStyle: { color: 'var(--color-brand-primary)' },
            lineStyle: { width: 3 },
            symbol: 'circle',
            symbolSize: 8,
          },
        ],
      }
    : null

  return (
    <Spin spinning={loading} size="large">
      <div>
        <h1 style={{ fontSize: 'var(--font-size-extra-large)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--margin-super-loose)' }}>
          数据总览
        </h1>

        {/* 昨日数据 */}
        <h2 style={cardTitleStyle}>昨日数据</h2>
        <Row gutter={[16, 16]} style={{ marginBottom: 'var(--margin-base)' }}>
          <Col xs={24} sm={12} lg={6}>
            <MetricCard
              title="昨日花费"
              value={daily?.cost ?? 0}
              prefix="¥"
              icon={<DollarOutlined />}
              change={daily?.costChange}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <MetricCard
              title="昨日激活"
              value={daily?.activations ?? 0}
              icon={<UserAddOutlined />}
              change={daily?.activationsChange}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <MetricCard
              title="昨日开户"
              value={daily?.accounts ?? 0}
              icon={<BankOutlined />}
              change={daily?.accountsChange}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <MetricCard
              title="昨日ROI"
              value={daily?.roi ?? 0}
              precision={2}
              icon={<PercentageOutlined />}
              change={daily?.roiChange}
            />
          </Col>
        </Row>
        <Row gutter={[16, 16]} style={{ marginBottom: 'var(--margin-super-loose)' }}>
          <Col xs={24} sm={12} lg={8}>
            <MetricCard
              title="昨日转正"
              value={daily?.formalActivations ?? 0}
              icon={<CheckCircleOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <MetricCard
              title="昨日留资"
              value={daily?.leads ?? 0}
              icon={<FileTextOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <MetricCard
              title="昨日CTR"
              value={daily?.ctr ?? 0}
              precision={2}
              suffix="%"
              icon={<BarChartOutlined />}
            />
          </Col>
        </Row>

        {/* 本周数据 */}
        <h2 style={cardTitleStyle}>本周数据</h2>
        <Row gutter={[16, 16]} style={{ marginBottom: 'var(--margin-base)' }}>
          <Col xs={24} sm={12} lg={6}>
            <MetricCard
              title="本周花费"
              value={weekly?.cost ?? 0}
              prefix="¥"
              icon={<DollarOutlined />}
              target={weekly?.targetCost}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <MetricCard
              title="本周激活"
              value={weekly?.activations ?? 0}
              icon={<UserAddOutlined />}
              target={weekly?.targetActivations}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <MetricCard
              title="本周开户"
              value={weekly?.accounts ?? 0}
              icon={<BankOutlined />}
              target={weekly?.targetAccounts}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <MetricCard
              title="本周ROI"
              value={weekly?.roi ?? 0}
              precision={2}
              icon={<PercentageOutlined />}
              target={weekly?.targetRoi}
            />
          </Col>
        </Row>
        <Row gutter={[16, 16]} style={{ marginBottom: 'var(--margin-super-loose)' }}>
          <Col xs={24} sm={12} lg={8}>
            <MetricCard
              title="本周转正"
              value={weekly?.formalActivations ?? 0}
              icon={<CheckCircleOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <MetricCard
              title="本周留资"
              value={weekly?.leads ?? 0}
              icon={<FileTextOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <MetricCard
              title="本周CTR"
              value={(weekly?.ctr ?? 0) * 100}
              precision={2}
              suffix="%"
              icon={<BarChartOutlined />}
            />
          </Col>
        </Row>

        {/* 本月数据 */}
        <h2 style={cardTitleStyle}>本月数据</h2>
        <Row gutter={[16, 16]} style={{ marginBottom: 'var(--margin-base)' }}>
          <Col xs={24} sm={12} lg={6}>
            <MetricCard
              title="本月花费"
              value={monthly?.cost ?? 0}
              prefix="¥"
              icon={<DollarOutlined />}
              target={monthly?.targetCost}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <MetricCard
              title="本月激活"
              value={monthly?.activations ?? 0}
              icon={<UserAddOutlined />}
              target={monthly?.targetActivations}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <MetricCard
              title="本月开户"
              value={monthly?.accounts ?? 0}
              icon={<BankOutlined />}
              target={monthly?.targetAccounts}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <MetricCard
              title="本月ROI"
              value={monthly?.roi ?? 0}
              precision={2}
              icon={<PercentageOutlined />}
              target={monthly?.targetRoi}
            />
          </Col>
        </Row>
        <Row gutter={[16, 16]} style={{ marginBottom: 'var(--margin-super-loose)' }}>
          <Col xs={24} sm={12} lg={8}>
            <MetricCard
              title="本月转正"
              value={monthly?.formalActivations ?? 0}
              icon={<CheckCircleOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <MetricCard
              title="本月留资"
              value={monthly?.leads ?? 0}
              icon={<FileTextOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <MetricCard
              title="本月CTR"
              value={(monthly?.ctr ?? 0) * 100}
              precision={2}
              suffix="%"
              icon={<BarChartOutlined />}
            />
          </Col>
        </Row>

        {/* 排名图表 */}
        <h2 style={cardTitleStyle}>渠道投放排名</h2>
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card
              title="渠道花费排名"
              style={{ borderRadius: 'var(--radius-extra-large)', boxShadow: 'var(--shadow-elevation-small)' }}
            >
              {costRankingOption ? (
                <ReactECharts option={costRankingOption} style={{ height: 300 }} />
              ) : (
                <Empty description="暂无数据" style={{ padding: '60px 0' }} />
              )}
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card
              title="渠道效果排名"
              style={{ borderRadius: 'var(--radius-extra-large)', boxShadow: 'var(--shadow-elevation-small)' }}
            >
              {performanceRankingOption ? (
                <ReactECharts option={performanceRankingOption} style={{ height: 300 }} />
              ) : (
                <Empty description="暂无数据" style={{ padding: '60px 0' }} />
              )}
            </Card>
          </Col>
        </Row>
      </div>
    </Spin>
  )
}

export default Dashboard
