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
  Modal,
  message,
  Table,
} from 'antd'
import {
  DollarOutlined,
  UserAddOutlined,
  BankOutlined,
  PercentageOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  BarChartOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import ReactECharts from 'echarts-for-react'
import { channelService } from '@services/channelService'
import { useRefresh } from '@components/layout/RefreshContext'
import { METRIC_COLORS, SOFT_COLORS, CARD_BASE } from '@utils/constants'
import { getWeekRange } from '@utils/dates'
import { ChannelMetrics } from '@/types'

const { RangePicker } = DatePicker

function MetricCard({
  title,
  value,
  prefix,
  suffix,
  precision = 0,
  icon,
  color = METRIC_COLORS.cost,
}: {
  title: string
  value: number
  prefix?: string
  suffix?: string
  precision?: number
  icon: React.ReactNode
  color?: string
}) {
  return (
    <Card style={CARD_BASE} bodyStyle={{ padding: '28px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: `linear-gradient(135deg, ${color}18, ${color}0A)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color,
            fontSize: 20,
          }}
        >
          {icon}
        </div>
        <span style={{ fontSize: 14, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
          {title}
        </span>
      </div>
      <div
        style={{
          fontSize: 32,
          fontFamily: 'var(--font-family-number)',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          lineHeight: 1.2,
        }}
      >
        {prefix}
        {value.toLocaleString(undefined, { minimumFractionDigits: precision, maximumFractionDigits: precision })}
        {suffix}
      </div>
    </Card>
  )
}

function getRankColor(index: number): string {
  return SOFT_COLORS[index % SOFT_COLORS.length]
}

/** 获取本周一和本周日（中国习惯，周一开始） */
function CampaignChart({
  title,
  data,
  valueKey,
  onBarClick,
}: {
  title: string
  data: Array<{ campaignName: string | null; [key: string]: any }>
  valueKey: string
  onBarClick?: (campaignId: string, campaignName: string | null) => void
}) {
  const option = data.length
    ? {
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: { left: '3%', right: '8%', bottom: '3%', top: '5%', containLabel: true },
        xAxis: {
          type: 'value',
          splitLine: { lineStyle: { type: 'dashed', color: '#F0F0F0' } },
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { fontFamily: 'var(--font-family-number)', color: '#888' },
        },
        yAxis: {
          type: 'category',
          data: data.map((d) => d.campaignName || d.campaignId).reverse(),
          axisLine: { lineStyle: { color: '#E8E8E8' } },
          axisTick: { show: false },
          axisLabel: {
            fontFamily: 'var(--font-family-cn)',
            color: '#888',
            formatter: (v: string) => (v.length > 12 ? v.slice(0, 12) + '...' : v),
          },
        },
        series: [
          {
            name: title,
            type: 'bar',
            data: [...data]
              .reverse()
              .map((d, i) => ({
                value: d[valueKey],
                itemStyle: {
                  color: getRankColor(data.length - 1 - i),
                  borderRadius: [0, 4, 4, 0],
                },
              })),
            barWidth: '60%',
            label: {
              show: true,
              position: 'right',
              fontFamily: 'var(--font-family-number)',
              fontSize: 11,
              color: '#666',
            },
          },
        ],
      }
    : null

  const handleEvents = onBarClick
    ? {
        click: (params: any) => {
          const index = params.dataIndex
          const item = data[data.length - 1 - index]
          if (item) onBarClick(item.campaignId, item.campaignName)
        },
      }
    : undefined

  return (
    <Card style={{ ...CARD_BASE, cursor: onBarClick ? 'pointer' : 'default' }} bodyStyle={{ padding: '20px 24px' }}>
      <div
        style={{
          fontSize: 15,
          fontWeight: 500,
          color: 'var(--color-text-primary)',
          marginBottom: 16,
        }}
      >
        {title}
      </div>
      {option ? (
        <ReactECharts option={option} style={{ height: 250 }} onEvents={handleEvents} />
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

  const { refreshKey } = useRefresh()
  const [drillModalVisible, setDrillModalVisible] = useState(false)
  const [drillCampaignId, setDrillCampaignId] = useState('')
  const [drillCampaignName, setDrillCampaignName] = useState<string | null>(null)
  const [drillTrends, setDrillTrends] = useState<any[]>([])
  const [drillLoading, setDrillLoading] = useState(false)

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
  }, [refreshKey])

  useEffect(() => {
    fetchMetrics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDrillDown = async (campaignId: string, campaignName: string | null) => {
    if (selectedChannels.length !== 1) {
      message.warning('下钻功能仅支持单选渠道时使用')
      return
    }
    setDrillCampaignId(campaignId)
    setDrillCampaignName(campaignName)
    setDrillModalVisible(true)
    setDrillLoading(true)
    try {
      const trends = await channelService.getCampaignTrends(
        selectedChannels[0],
        campaignId,
        dateRange[0].format('YYYY-MM-DD'),
        dateRange[1].format('YYYY-MM-DD')
      )
      setDrillTrends(trends)
    } catch (e) {
      console.error('Fetch drilldown error:', e)
      message.error('获取计划趋势失败')
    } finally {
      setDrillLoading(false)
    }
  }

  const trendOption = metrics?.dailyTrends.length
    ? {
        tooltip: { trigger: 'axis' },
        legend: { data: ['花费', '激活', '开户', '转正', '留资', 'ROI', 'CTR'], bottom: 0, textStyle: { color: '#888' }, selected: { '花费': true, '激活': true, '开户': true, '转正': false, '留资': false, 'ROI': false, 'CTR': false } },
        grid: { left: '3%', right: '4%', bottom: '15%', top: '5%', containLabel: true },
        xAxis: {
          type: 'category',
          data: metrics.dailyTrends.map((d) => d.date),
          axisLine: { lineStyle: { color: '#E8E8E8' } },
          axisTick: { show: false },
          axisLabel: { fontFamily: 'var(--font-family-cn)', color: '#888' },
        },
        yAxis: [
          {
            type: 'value',
            name: '数量',
            position: 'left',
            splitLine: { lineStyle: { type: 'dashed', color: '#F0F0F0' } },
            axisLabel: { fontFamily: 'var(--font-family-number)', color: '#888' },
            nameTextStyle: { color: '#888' },
          },
          {
            type: 'value',
            name: '比率',
            position: 'right',
            splitLine: { show: false },
            axisLabel: { fontFamily: 'var(--font-family-number)', color: '#888' },
            nameTextStyle: { color: '#888' },
          },
        ],
        series: [
          {
            name: '花费',
            type: 'line',
            data: metrics.dailyTrends.map((d) => Number(d.cost.toFixed(2))),
            itemStyle: { color: METRIC_COLORS.cost },
            smooth: true,
            symbol: 'circle',
            symbolSize: 6,
          },
          {
            name: '激活',
            type: 'line',
            data: metrics.dailyTrends.map((d) => d.activations),
            itemStyle: { color: METRIC_COLORS.activations },
            smooth: true,
            symbol: 'circle',
            symbolSize: 6,
          },
          {
            name: '开户',
            type: 'line',
            data: metrics.dailyTrends.map((d) => d.accounts),
            itemStyle: { color: METRIC_COLORS.accounts },
            smooth: true,
            symbol: 'circle',
            symbolSize: 6,
          },
          {
            name: '转正',
            type: 'line',
            data: metrics.dailyTrends.map((d) => d.formalActivations),
            itemStyle: { color: METRIC_COLORS.formalActivations },
            smooth: true,
            symbol: 'circle',
            symbolSize: 6,
          },
          {
            name: '留资',
            type: 'line',
            data: metrics.dailyTrends.map((d) => d.leads),
            itemStyle: { color: METRIC_COLORS.leads },
            smooth: true,
            symbol: 'circle',
            symbolSize: 6,
          },
          {
            name: 'ROI',
            type: 'line',
            yAxisIndex: 1,
            data: metrics.dailyTrends.map((d) => Number(d.roi.toFixed(2))),
            itemStyle: { color: METRIC_COLORS.roi },
            smooth: true,
            symbol: 'circle',
            symbolSize: 6,
          },
          {
            name: 'CTR',
            type: 'line',
            yAxisIndex: 1,
            data: metrics.dailyTrends.map((d) => Number((d.ctr * 100).toFixed(2))),
            itemStyle: { color: METRIC_COLORS.ctr },
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
        {/* 顶部标题区 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--margin-loose)',
          }}
        >
          <h1
            style={{
              fontSize: 'var(--font-size-extra-large)',
              fontWeight: 'var(--font-weight-medium)',
              margin: 0,
            }}
          >
            渠道分析
          </h1>
        </div>

        {/* 筛选器 */}
        <Card style={{ ...CARD_BASE, marginBottom: 'var(--margin-super-loose)' }} bodyStyle={{ padding: '24px' }}>
          <Row gutter={[20, 20]} align="middle">
            <Col xs={24} md={10}>
              <div style={{ marginBottom: 'var(--margin-tight)', fontWeight: 500, fontSize: 14, color: 'var(--color-text-secondary)' }}>
                选择渠道
              </div>
              <Space wrap>
                <Select
                  mode="multiple"
                  style={{ width: '100%', minWidth: 280 }}
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
              <div style={{ marginBottom: 'var(--margin-tight)', fontWeight: 500, fontSize: 14, color: 'var(--color-text-secondary)' }}>
                选择时间范围
              </div>
              <RangePicker
                style={{ width: '100%', marginBottom: 8 }}
                value={dateRange}
                onChange={(dates) => {
                  if (dates && dates[0] && dates[1]) {
                    setDateRange([dates[0], dates[1]])
                  }
                }}
              />
              <Space wrap size="small">
                <Button size="small" onClick={() => setDateRange([dayjs().subtract(1, 'day'), dayjs().subtract(1, 'day')])}>昨日</Button>
                <Button size="small" onClick={() => setDateRange([dayjs().subtract(6, 'day'), dayjs()])}>近7天</Button>
                <Button size="small" onClick={() => setDateRange([dayjs().subtract(29, 'day'), dayjs()])}>近30天</Button>
                <Button size="small" onClick={() => { const { startOfWeek, endOfWeek } = getWeekRange(dayjs()); setDateRange([startOfWeek, endOfWeek]) }}>本周</Button>
                <Button size="small" onClick={() => setDateRange([dayjs().startOf('month'), dayjs().endOf('month')])}>本月</Button>
                <Button size="small" onClick={() => { const m = dayjs().subtract(1, 'month'); setDateRange([m.startOf('month'), m.endOf('month')]) }}>上月</Button>
              </Space>
            </Col>
            <Col xs={24} md={4} style={{ textAlign: 'right' }}>
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                onClick={fetchMetrics}
                style={{ marginTop: 28 }}
              >
                应用筛选
              </Button>
            </Col>
          </Row>
        </Card>

        {/* 渠道总览 */}
        <h2
          style={{
            fontSize: 'var(--font-size-large)',
            fontWeight: 'var(--font-weight-medium)',
            marginBottom: 'var(--margin-loose)',
          }}
        >
          渠道总览
        </h2>
        <Row gutter={[20, 20]} style={{ marginBottom: 'var(--margin-base)' }}>
          <Col xs={24} sm={12} lg={6}>
            <MetricCard
              title="总花费"
              value={metrics?.totalMetrics.cost ?? 0}
              prefix="¥"
              precision={2}
              icon={<DollarOutlined />}
              color={METRIC_COLORS.cost}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <MetricCard
              title="总激活"
              value={metrics?.totalMetrics.activations ?? 0}
              icon={<UserAddOutlined />}
              color={METRIC_COLORS.activations}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <MetricCard
              title="总开户"
              value={metrics?.totalMetrics.accounts ?? 0}
              icon={<BankOutlined />}
              color={METRIC_COLORS.accounts}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <MetricCard
              title="ROI"
              value={metrics?.totalMetrics.roi ?? 0}
              precision={2}
              icon={<PercentageOutlined />}
              color={METRIC_COLORS.roi}
            />
          </Col>
        </Row>
        <Row gutter={[20, 20]} style={{ marginBottom: 'var(--margin-super-loose)' }}>
          <Col xs={24} sm={12} lg={8}>
            <MetricCard
              title="总转正"
              value={metrics?.totalMetrics.formalActivations ?? 0}
              icon={<CheckCircleOutlined />}
              color={METRIC_COLORS.formalActivations}
            />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <MetricCard
              title="总留资"
              value={metrics?.totalMetrics.leads ?? 0}
              icon={<FileTextOutlined />}
              color={METRIC_COLORS.leads}
            />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <MetricCard
              title="CTR"
              value={(metrics?.totalMetrics.ctr ?? 0) * 100}
              precision={2}
              suffix="%"
              icon={<BarChartOutlined />}
              color={METRIC_COLORS.ctr}
            />
          </Col>
        </Row>

        {/* 渠道对比 */}
        {selectedChannels.length > 1 && metrics?.channelBreakdown && metrics.channelBreakdown.length > 0 && (
          <>
            <h2
              style={{
                fontSize: 'var(--font-size-large)',
                fontWeight: 'var(--font-weight-medium)',
                marginBottom: 'var(--margin-loose)',
              }}
            >
              渠道对比
            </h2>
            <Row gutter={[20, 20]} style={{ marginBottom: 'var(--margin-super-loose)' }}>
              <Col xs={24}>
                <Card style={CARD_BASE} bodyStyle={{ padding: '20px 24px' }}>
                  <Table
                    dataSource={metrics.channelBreakdown}
                    rowKey="channel"
                    pagination={false}
                    size="middle"
                    columns={[
                      { title: '渠道名称', dataIndex: 'channel', key: 'channel', sorter: (a: any, b: any) => a.channel.localeCompare(b.channel) },
                      {
                        title: '花费',
                        dataIndex: 'cost',
                        key: 'cost',
                        align: 'right',
                        sorter: (a: any, b: any) => a.cost - b.cost,
                        render: (v: number) => `¥${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                      },
                      {
                        title: '激活',
                        dataIndex: 'activations',
                        key: 'activations',
                        align: 'right',
                        sorter: (a: any, b: any) => a.activations - b.activations,
                        render: (v: number) => v.toLocaleString(),
                      },
                      {
                        title: '开户',
                        dataIndex: 'accounts',
                        key: 'accounts',
                        align: 'right',
                        sorter: (a: any, b: any) => a.accounts - b.accounts,
                        render: (v: number) => v.toLocaleString(),
                      },
                      {
                        title: 'CTR',
                        dataIndex: 'ctr',
                        key: 'ctr',
                        align: 'right',
                        sorter: (a: any, b: any) => a.ctr - b.ctr,
                        render: (v: number) => `${(v * 100).toFixed(2)}%`,
                      },
                      {
                        title: 'CPA',
                        dataIndex: 'cpa',
                        key: 'cpa',
                        align: 'right',
                        sorter: (a: any, b: any) => a.cpa - b.cpa,
                        render: (v: number) => `¥${v.toFixed(2)}`,
                      },
                      {
                        title: 'ROI',
                        dataIndex: 'roi',
                        key: 'roi',
                        align: 'right',
                        sorter: (a: any, b: any) => a.roi - b.roi,
                        render: (v: number) => v.toFixed(2),
                      },
                    ]}
                  />
                </Card>
              </Col>
            </Row>
          </>
        )}

        {/* 分计划分析 */}
        <h2
          style={{
            fontSize: 'var(--font-size-large)',
            fontWeight: 'var(--font-weight-medium)',
            marginBottom: 'var(--margin-loose)',
          }}
        >
          分计划分析（Top 5）
        </h2>
        <Row gutter={[20, 20]} style={{ marginBottom: 'var(--margin-super-loose)' }}>
          <Col xs={24} lg={12}>
            <CampaignChart
              title="分计划花费"
              data={metrics?.campaignMetrics.cost ?? []}
              valueKey="cost"
              onBarClick={handleDrillDown}
            />
          </Col>
          <Col xs={24} lg={12}>
            <CampaignChart
              title="分计划激活"
              data={metrics?.campaignMetrics.activations ?? []}
              valueKey="activations"
              onBarClick={handleDrillDown}
            />
          </Col>
          <Col xs={24} lg={12}>
            <CampaignChart
              title="分计划开户"
              data={metrics?.campaignMetrics.accounts ?? []}
              valueKey="accounts"
              onBarClick={handleDrillDown}
            />
          </Col>
          <Col xs={24} lg={12}>
            <CampaignChart
              title="分计划ROI"
              data={metrics?.campaignMetrics.roi ?? []}
              valueKey="roi"
              onBarClick={handleDrillDown}
            />
          </Col>
        </Row>

        {/* 每日趋势 */}
        <h2
          style={{
            fontSize: 'var(--font-size-large)',
            fontWeight: 'var(--font-weight-medium)',
            marginBottom: 'var(--margin-loose)',
          }}
        >
          每日趋势
        </h2>
        <Row gutter={[20, 20]}>
          <Col xs={24}>
            <Card style={CARD_BASE} bodyStyle={{ padding: '20px 24px' }}>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 500,
                  color: 'var(--color-text-primary)',
                  marginBottom: 16,
                }}
              >
                每日数据变化折线图
              </div>
              {trendOption ? (
                <ReactECharts option={trendOption} style={{ height: 400 }} />
              ) : (
                <Empty description="暂无数据" style={{ padding: '80px 0' }} />
              )}
            </Card>
          </Col>
        </Row>

        {/* 转化漏斗 */}
        <h2
          style={{
            fontSize: 'var(--font-size-large)',
            fontWeight: 'var(--font-weight-medium)',
            marginBottom: 'var(--margin-loose)',
            marginTop: 'var(--margin-super-loose)',
          }}
        >
          转化漏斗
        </h2>
        <Row gutter={[20, 20]} style={{ marginBottom: 'var(--margin-super-loose)' }}>
          <Col xs={24} lg={12}>
            <Card style={CARD_BASE} bodyStyle={{ padding: '20px 24px' }}>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 500,
                  color: 'var(--color-text-primary)',
                  marginBottom: 16,
                }}
              >
                各环节转化率
              </div>
              {metrics?.totalMetrics.impressions ?? 0 > 0 ? (
                <ReactECharts
                  option={{
                    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
                    series: [
                      {
                        type: 'funnel',
                        left: '10%',
                        top: 20,
                        bottom: 20,
                        width: '80%',
                        min: 0,
                        max: 100,
                        minSize: '0%',
                        maxSize: '100%',
                        sort: 'none',
                        gap: 2,
                        label: {
                          show: true,
                          position: 'inside',
                          formatter: '{b}\n{d}%',
                          fontSize: 12,
                          color: '#fff',
                        },
                        data: [
                          { value: 100, name: '曝光', itemStyle: { color: '#6B8DD6' } },
                          {
                            value: (metrics?.totalMetrics.ctr ?? 0) * 100,
                            name: '点击',
                            itemStyle: { color: '#E8917A' },
                          },
                          {
                            value: (metrics?.totalMetrics.downloads ?? 0) > 0 && (metrics?.totalMetrics.clicks ?? 0) > 0
                              ? Math.round(((metrics?.totalMetrics.downloads ?? 0) / (metrics?.totalMetrics.clicks ?? 0)) * 100)
                              : 0,
                            name: '下载',
                            itemStyle: { color: '#7BC4A6' },
                          },
                          {
                            value: (metrics?.totalMetrics.activations ?? 0) > 0 && (metrics?.totalMetrics.downloads ?? 0) > 0
                              ? Math.round(((metrics?.totalMetrics.activations ?? 0) / (metrics?.totalMetrics.downloads ?? 0)) * 100)
                              : 0,
                            name: '激活',
                            itemStyle: { color: '#D4A5A5' },
                          },
                          {
                            value: (metrics?.totalMetrics.formalActivations ?? 0) > 0 && (metrics?.totalMetrics.activations ?? 0) > 0
                              ? Math.round(((metrics?.totalMetrics.formalActivations ?? 0) / (metrics?.totalMetrics.activations ?? 0)) * 100)
                              : 0,
                            name: '转正',
                            itemStyle: { color: '#A8C6E0' },
                          },
                          {
                            value: (metrics?.totalMetrics.accounts ?? 0) > 0 && (metrics?.totalMetrics.leads ?? 0) > 0
                              ? Math.round(((metrics?.totalMetrics.accounts ?? 0) / (metrics?.totalMetrics.leads ?? 0)) * 100)
                              : 0,
                            name: '开户',
                            itemStyle: { color: '#D4B483' },
                          },
                        ],
                      },
                    ],
                  }}
                  style={{ height: 360 }}
                />
              ) : (
                <Empty description="暂无数据" style={{ padding: '60px 0' }} />
              )}
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card style={CARD_BASE} bodyStyle={{ padding: '20px 24px' }}>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 500,
                  color: 'var(--color-text-primary)',
                  marginBottom: 16,
                }}
              >
                转化效率指标
              </div>
              {metrics?.totalMetrics.impressions ?? 0 > 0 ? (
                <ReactECharts
                  option={{
                    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
                    grid: { left: '3%', right: '8%', bottom: '3%', top: '5%', containLabel: true },
                    xAxis: {
                      type: 'value',
                      max: 100,
                      splitLine: { lineStyle: { type: 'dashed', color: '#F0F0F0' } },
                      axisLabel: { formatter: '{value}%', fontFamily: 'var(--font-family-number)', color: '#888' },
                      axisLine: { show: false },
                      axisTick: { show: false },
                    },
                    yAxis: {
                      type: 'category',
                      data: ['开户率', '留资率', '转正率', '激活率', '下载率', '点击率'],
                      axisLabel: { fontFamily: 'var(--font-family-cn)', color: '#888' },
                      axisLine: { lineStyle: { color: '#E8E8E8' } },
                      axisTick: { show: false },
                    },
                    series: [
                      {
                        type: 'bar',
                        data: [
                          {
                            value: (metrics?.totalMetrics.leads ?? 0) > 0 ? Number((((metrics?.totalMetrics.accounts ?? 0) / (metrics?.totalMetrics.leads ?? 0)) * 100).toFixed(2)) : 0,
                            itemStyle: { color: '#D4B483' },
                          },
                          {
                            value: (metrics?.totalMetrics.activations ?? 0) > 0 ? Number((((metrics?.totalMetrics.leads ?? 0) / (metrics?.totalMetrics.activations ?? 0)) * 100).toFixed(2)) : 0,
                            itemStyle: { color: '#9DB0CE' },
                          },
                          {
                            value: (metrics?.totalMetrics.activations ?? 0) > 0 ? Number((((metrics?.totalMetrics.formalActivations ?? 0) / (metrics?.totalMetrics.activations ?? 0)) * 100).toFixed(2)) : 0,
                            itemStyle: { color: '#A8C6E0' },
                          },
                          {
                            value: (metrics?.totalMetrics.downloads ?? 0) > 0 ? Number((((metrics?.totalMetrics.activations ?? 0) / (metrics?.totalMetrics.downloads ?? 0)) * 100).toFixed(2)) : 0,
                            itemStyle: { color: '#D4A5A5' },
                          },
                          {
                            value: (metrics?.totalMetrics.clicks ?? 0) > 0 ? Number((((metrics?.totalMetrics.downloads ?? 0) / (metrics?.totalMetrics.clicks ?? 0)) * 100).toFixed(2)) : 0,
                            itemStyle: { color: '#7BC4A6' },
                          },
                          {
                            value: Number(((metrics?.totalMetrics.ctr ?? 0) * 100).toFixed(2)),
                            itemStyle: { color: '#E8917A' },
                          },
                        ],
                        label: { show: true, position: 'right', formatter: '{c}%', fontFamily: 'var(--font-family-number)', color: '#666' },
                        barWidth: '45%',
                        itemStyle: { borderRadius: [0, 4, 4, 0] },
                      },
                    ],
                  }}
                  style={{ height: 360 }}
                />
              ) : (
                <Empty description="暂无数据" style={{ padding: '60px 0' }} />
              )}
            </Card>
          </Col>
        </Row>

        {/* 下钻 Modal */}
        <Modal
          title={`计划趋势: ${drillCampaignName || drillCampaignId}`}
          open={drillModalVisible}
          onCancel={() => setDrillModalVisible(false)}
          footer={null}
          width={800}
          destroyOnClose
        >
          <Spin spinning={drillLoading}>
            {drillTrends.length > 0 ? (
              <ReactECharts
                option={{
                  tooltip: { trigger: 'axis' },
                  legend: { data: ['花费', '激活', '开户', 'ROI'], bottom: 0, textStyle: { color: '#888' } },
                  grid: { left: '3%', right: '4%', bottom: '15%', top: '5%', containLabel: true },
                  xAxis: {
                    type: 'category',
                    data: drillTrends.map((d: any) => d.date),
                    axisLine: { lineStyle: { color: '#E8E8E8' } },
                    axisTick: { show: false },
                    axisLabel: { fontFamily: 'var(--font-family-cn)', color: '#888' },
                  },
                  yAxis: [
                    {
                      type: 'value',
                      name: '数量',
                      position: 'left',
                      splitLine: { lineStyle: { type: 'dashed', color: '#F0F0F0' } },
                      axisLabel: { fontFamily: 'var(--font-family-number)', color: '#888' },
                      nameTextStyle: { color: '#888' },
                    },
                    {
                      type: 'value',
                      name: 'ROI',
                      position: 'right',
                      splitLine: { show: false },
                      axisLabel: { fontFamily: 'var(--font-family-number)', color: '#888' },
                      nameTextStyle: { color: '#888' },
                    },
                  ],
                  series: [
                    {
                      name: '花费',
                      type: 'line',
                      data: drillTrends.map((d: any) => Number(d.cost.toFixed(2))),
                      itemStyle: { color: '#6B8DD6' },
                      smooth: true,
                      symbol: 'circle',
                      symbolSize: 6,
                    },
                    {
                      name: '激活',
                      type: 'line',
                      data: drillTrends.map((d: any) => d.activations),
                      itemStyle: { color: '#E8917A' },
                      smooth: true,
                      symbol: 'circle',
                      symbolSize: 6,
                    },
                    {
                      name: '开户',
                      type: 'line',
                      data: drillTrends.map((d: any) => d.accounts),
                      itemStyle: { color: '#7BC4A6' },
                      smooth: true,
                      symbol: 'circle',
                      symbolSize: 6,
                    },
                    {
                      name: 'ROI',
                      type: 'line',
                      yAxisIndex: 1,
                      data: drillTrends.map((d: any) => Number(d.roi.toFixed(2))),
                      itemStyle: { color: '#D4B483' },
                      smooth: true,
                      symbol: 'circle',
                      symbolSize: 6,
                    },
                  ],
                }}
                style={{ height: 400 }}
              />
            ) : (
              <Empty description="暂无数据" style={{ padding: '80px 0' }} />
            )}
          </Spin>
        </Modal>
      </div>
    </Spin>
  )
}

export default ChannelAnalysis
