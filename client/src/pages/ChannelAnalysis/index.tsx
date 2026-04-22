import React, { useEffect, useState, useCallback } from 'react'
import {
  Row,
  Col,
  Card,
  Select,
  DatePicker,
  Spin,
  Empty,
  Button,
  Space,
} from 'antd'
import {
  DollarOutlined,
  UserAddOutlined,
  BankOutlined,
  PercentageOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import ReactECharts from 'echarts-for-react'
import { channelService } from '@services/channelService'
import { ChannelMetrics } from '@/types'

const { RangePicker } = DatePicker

const cardTitleStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-large)',
  fontWeight: 'var(--font-weight-medium)',
  marginBottom: 'var(--margin-loose)',
}

const metricCardStyle: React.CSSProperties = {
  borderRadius: 'var(--radius-extra-large)',
  boxShadow: 'var(--shadow-elevation-small)',
}

function MetricCard({
  title,
  value,
  prefix,
  suffix,
  precision = 0,
  icon,
}: {
  title: string
  value: number
  prefix?: string
  suffix?: string
  precision?: number
  icon: React.ReactNode
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
      <div
        style={{
          fontSize: 28,
          fontFamily: 'var(--font-family-number)',
          fontWeight: 'var(--font-weight-bold)',
          color: 'var(--color-text-primary)',
        }}
      >
        {prefix}
        {value.toLocaleString(undefined, { minimumFractionDigits: precision, maximumFractionDigits: precision })}
        {suffix}
      </div>
    </Card>
  )
}

function getHeatColor(value: number, min: number, max: number): string {
  const range = max - min || 1
  const ratio = (value - min) / range
  const hue = Math.round(120 * (1 - ratio))
  return `hsl(${hue}, 75%, 50%)`
}

function CampaignChart({
  title,
  data,
  valueKey,
}: {
  title: string
  data: Array<{ campaignName: string | null; [key: string]: any }>
  valueKey: string
}) {
  const values = data.map((d) => Number(d[valueKey]))
  const min = Math.min(...values)
  const max = Math.max(...values)

  const option = data.length
    ? {
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: { left: '3%', right: '8%', bottom: '3%', containLabel: true },
        xAxis: {
          type: 'value',
          axisLabel: { fontFamily: 'var(--font-family-number)' },
        },
        yAxis: {
          type: 'category',
          data: data.map((d) => d.campaignName || d.campaignId).reverse(),
          axisLabel: {
            fontFamily: 'var(--font-family-cn)',
            formatter: (v: string) => (v.length > 12 ? v.slice(0, 12) + '...' : v),
          },
        },
        series: [
          {
            name: title,
            type: 'bar',
            data: [...data]
              .reverse()
              .map((d) => ({
                value: d[valueKey],
                itemStyle: {
                  color: getHeatColor(Number(d[valueKey]), min, max),
                  borderRadius: [0, 4, 4, 0],
                },
              })),
            barWidth: '60%',
            label: {
              show: true,
              position: 'right',
              fontFamily: 'var(--font-family-number)',
              fontSize: 11,
            },
          },
        ],
      }
    : null

  return (
    <Card
      title={title}
      style={{ borderRadius: 'var(--radius-extra-large)', boxShadow: 'var(--shadow-elevation-small)' }}
    >
      {option ? (
        <ReactECharts option={option} style={{ height: 250 }} />
      ) : (
        <Empty description="暂无数据" style={{ padding: '40px 0' }} />
      )}
    </Card>
  )
}

const ChannelAnalysis: React.FC = () => {
  const [channels, setChannels] = useState<string[]>([])
  const [selectedChannels, setSelectedChannels] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(6, 'day'),
    dayjs(),
  ])
  const [metrics, setMetrics] = useState<ChannelMetrics | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchChannels = useCallback(async () => {
    try {
      const list = await channelService.getChannels()
      setChannels(list)
      if (list.length > 0 && selectedChannels.length === 0) {
        setSelectedChannels([list[0]])
      }
    } catch (e) {
      console.error('Fetch channels error:', e)
    }
  }, [selectedChannels.length])

  const fetchMetrics = useCallback(async () => {
    if (selectedChannels.length === 0) return
    setLoading(true)
    try {
      const data = await channelService.getChannelMetrics(
        selectedChannels.join(','),
        dateRange[0].format('YYYY-MM-DD'),
        dateRange[1].format('YYYY-MM-DD')
      )
      setMetrics(data)
    } catch (e) {
      console.error('Fetch metrics error:', e)
    } finally {
      setLoading(false)
    }
  }, [selectedChannels, dateRange])

  useEffect(() => {
    fetchChannels()
  }, [fetchChannels])

  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])

  const trendOption = metrics?.dailyTrends.length
    ? {
        tooltip: { trigger: 'axis' },
        legend: { data: ['花费', '激活', '开户', 'ROI'], bottom: 0 },
        grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
        xAxis: {
          type: 'category',
          data: metrics.dailyTrends.map((d) => d.date),
          axisLabel: { fontFamily: 'var(--font-family-cn)' },
        },
        yAxis: [
          {
            type: 'value',
            name: '数量',
            position: 'left',
            axisLabel: { fontFamily: 'var(--font-family-number)' },
          },
          {
            type: 'value',
            name: 'ROI',
            position: 'right',
            axisLabel: { fontFamily: 'var(--font-family-number)' },
          },
        ],
        series: [
          {
            name: '花费',
            type: 'line',
            data: metrics.dailyTrends.map((d) => Number(d.cost.toFixed(2))),
            itemStyle: { color: 'var(--color-brand-primary)' },
            smooth: true,
            symbol: 'circle',
            symbolSize: 6,
          },
          {
            name: '激活',
            type: 'line',
            data: metrics.dailyTrends.map((d) => d.activations),
            itemStyle: { color: 'var(--color-data-red)' },
            smooth: true,
            symbol: 'circle',
            symbolSize: 6,
          },
          {
            name: '开户',
            type: 'line',
            data: metrics.dailyTrends.map((d) => d.accounts),
            itemStyle: { color: 'var(--color-data-green)' },
            smooth: true,
            symbol: 'circle',
            symbolSize: 6,
          },
          {
            name: 'ROI',
            type: 'line',
            yAxisIndex: 1,
            data: metrics.dailyTrends.map((d) => Number(d.roi.toFixed(2))),
            itemStyle: { color: 'var(--color-data-orange)' },
            smooth: true,
            symbol: 'circle',
            symbolSize: 6,
          },
        ],
      }
    : null

  return (
    <Spin spinning={loading} size="large">
      <div>
        <h1
          style={{
            fontSize: 'var(--font-size-extra-large)',
            fontWeight: 'var(--font-weight-medium)',
            marginBottom: 'var(--margin-super-loose)',
          }}
        >
          渠道分析
        </h1>

        {/* 筛选器 */}
        <Card
          style={{
            marginBottom: 'var(--margin-super-loose)',
            borderRadius: 'var(--radius-extra-large)',
            boxShadow: 'var(--shadow-elevation-small)',
          }}
        >
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} md={10}>
              <div style={{ marginBottom: 'var(--margin-tight)', fontWeight: 'var(--font-weight-medium)', fontSize: 'var(--font-size-medium)' }}>
                选择渠道
              </div>
              <Space wrap>
                <Select
                  mode="multiple"
                  style={{ minWidth: 280 }}
                  placeholder="请选择渠道"
                  value={selectedChannels}
                  onChange={setSelectedChannels}
                  maxTagCount={3}
                  allowClear
                >
                  {channels.map((c) => (
                    <Select.Option key={c} value={c}>
                      {c}
                    </Select.Option>
                  ))}
                </Select>
                <Button size="small" onClick={() => setSelectedChannels(channels)}>
                  全选
                </Button>
                <Button size="small" onClick={() => setSelectedChannels([])}>
                  清空
                </Button>
              </Space>
              {selectedChannels.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <span style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-text-secondary)' }}>
                    已选 {selectedChannels.length} / {channels.length} 个渠道
                  </span>
                </div>
              )}
            </Col>
            <Col xs={24} md={10}>
              <div style={{ marginBottom: 'var(--margin-tight)', fontWeight: 'var(--font-weight-medium)', fontSize: 'var(--font-size-medium)' }}>
                选择时间范围
              </div>
              <RangePicker
                style={{ width: '100%' }}
                value={dateRange}
                onChange={(dates) => {
                  if (dates && dates[0] && dates[1]) {
                    setDateRange([dates[0], dates[1]])
                  }
                }}
              />
            </Col>
            <Col xs={24} md={4} style={{ textAlign: 'right' }}>
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                onClick={fetchMetrics}
                style={{ marginTop: 28 }}
              >
                刷新
              </Button>
            </Col>
          </Row>
        </Card>

        {/* 渠道总览 */}
        <h2 style={cardTitleStyle}>渠道总览</h2>
        <Row gutter={[16, 16]} style={{ marginBottom: 'var(--margin-super-loose)' }}>
          <Col xs={24} sm={12} lg={6}>
            <MetricCard
              title="总花费"
              value={metrics?.totalMetrics.cost ?? 0}
              prefix="¥"
              icon={<DollarOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <MetricCard
              title="总激活"
              value={metrics?.totalMetrics.activations ?? 0}
              icon={<UserAddOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <MetricCard
              title="总开户"
              value={metrics?.totalMetrics.accounts ?? 0}
              icon={<BankOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <MetricCard
              title="ROI"
              value={metrics?.totalMetrics.roi ?? 0}
              precision={2}
              icon={<PercentageOutlined />}
            />
          </Col>
        </Row>

        {/* 分计划分析 */}
        <h2 style={cardTitleStyle}>分计划分析（Top 5）</h2>
        <Row gutter={[16, 16]} style={{ marginBottom: 'var(--margin-super-loose)' }}>
          <Col xs={24} lg={12}>
            <CampaignChart
              title="分计划花费"
              data={metrics?.campaignMetrics.cost ?? []}
              valueKey="cost"
            />
          </Col>
          <Col xs={24} lg={12}>
            <CampaignChart
              title="分计划激活"
              data={metrics?.campaignMetrics.activations ?? []}
              valueKey="activations"
            />
          </Col>
          <Col xs={24} lg={12}>
            <CampaignChart
              title="分计划开户"
              data={metrics?.campaignMetrics.accounts ?? []}
              valueKey="accounts"
            />
          </Col>
          <Col xs={24} lg={12}>
            <CampaignChart
              title="分计划ROI"
              data={metrics?.campaignMetrics.roi ?? []}
              valueKey="roi"
            />
          </Col>
        </Row>

        {/* 每日趋势 */}
        <h2 style={cardTitleStyle}>每日趋势</h2>
        <Row gutter={[16, 16]}>
          <Col xs={24}>
            <Card
              title="每日数据变化折线图"
              style={{
                borderRadius: 'var(--radius-extra-large)',
                boxShadow: 'var(--shadow-elevation-small)',
              }}
            >
              {trendOption ? (
                <ReactECharts option={trendOption} style={{ height: 400 }} />
              ) : (
                <Empty description="暂无数据" style={{ padding: '80px 0' }} />
              )}
            </Card>
          </Col>
        </Row>
      </div>
    </Spin>
  )
}

export default ChannelAnalysis
