import React, { useEffect, useState, useCallback } from 'react'
import { Card, DatePicker, Table, Spin, Empty, Space, Button, Row, Col, Select } from 'antd'
import { ReloadOutlined, DollarOutlined, FileTextOutlined, BankOutlined, PercentageOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import ReactECharts from 'echarts-for-react'
import { merchantService } from '@services/merchantService'
import { MerchantReportItem, ChannelReportItem } from '@/types'

const { RangePicker } = DatePicker

/* ─── 现代化卡片基础样式（与 Dashboard 严格一致） ─── */
const CARD_BASE: React.CSSProperties = {
  borderRadius: 16,
  boxShadow: '0 4px 24px rgba(0,0,0,0.05)',
  border: 'none',
}

const SOFT_COLORS = [
  '#6B8DD6', '#E8917A', '#7BC4A6', '#D4A5A5', '#A8C6E0',
  '#D4B483', '#9DB0CE', '#B8D4B8', '#D9B8D4', '#C8C8A9',
]

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
    <Card style={CARD_BASE} bodyStyle={{ padding: '28px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'linear-gradient(135deg, var(--color-brand-primary)18, var(--color-brand-primary)0A)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-brand-primary)',
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

const MerchantAnalysis: React.FC = () => {
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('month'),
    dayjs(),
  ])
  const [selectedMerchants, setSelectedMerchants] = useState<string[]>([])
  const [selectedChannels, setSelectedChannels] = useState<string[]>([])
  const [merchantOptions, setMerchantOptions] = useState<{ qsId: string; merchantName: string }[]>([])
  const [channelOptions, setChannelOptions] = useState<string[]>([])

  const [loading, setLoading] = useState(false)
  const [merchantReport, setMerchantReport] = useState<MerchantReportItem[]>([])
  const [channelReport, setChannelReport] = useState<ChannelReportItem[]>([])

  const fetchFilterOptions = useCallback(async () => {
    try {
      const [merchants, channels] = await Promise.all([
        merchantService.getMerchants(),
        merchantService.getChannels(),
      ])
      setMerchantOptions(merchants.map((m) => ({ qsId: m.qsId, merchantName: m.merchantName })))
      setChannelOptions(channels)
    } catch (e) {
      console.error('Fetch filter options error:', e)
    }
  }, [])

  useEffect(() => {
    fetchFilterOptions()
  }, [fetchFilterOptions])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = {
        start_date: dateRange[0].format('YYYY-MM-DD'),
        end_date: dateRange[1].format('YYYY-MM-DD'),
      }
      if (selectedMerchants.length > 0) params.qs_id = selectedMerchants.join(',')
      if (selectedChannels.length > 0) params.channel = selectedChannels.join(',')

      const [mRes, cRes] = await Promise.all([
        merchantService.getMerchantReport(params),
        merchantService.getChannelReport(params),
      ])
      setMerchantReport(mRes.report)
      setChannelReport(cRes.report)
    } catch (e) {
      console.error('Fetch merchant report error:', e)
    } finally {
      setLoading(false)
    }
  }, [dateRange, selectedMerchants, selectedChannels])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const totalLeads = merchantReport.reduce((sum, r) => sum + r.leads, 0)
  const totalAccounts = merchantReport.reduce((sum, r) => sum + r.accounts, 0)
  const totalCost = merchantReport.reduce((sum, r) => sum + r.cost, 0)
  const overallAccountRate = totalLeads > 0 ? Number((totalAccounts / totalLeads).toFixed(4)) : 0

  const merchantChartOption = merchantReport.length
    ? {
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        legend: { data: ['消耗', '开户数'], bottom: 0, textStyle: { color: '#888' } },
        grid: { left: '3%', right: '4%', bottom: '15%', top: '5%', containLabel: true },
        xAxis: {
          type: 'category',
          data: merchantReport.map((r) => r.merchantName || r.qsId),
          axisLine: { lineStyle: { color: '#E8E8E8' } },
          axisTick: { show: false },
          axisLabel: { fontFamily: 'var(--font-family-cn)', color: '#888', rotate: 30 },
        },
        yAxis: [
          {
            type: 'value',
            name: '消耗',
            position: 'left',
            splitLine: { lineStyle: { type: 'dashed', color: '#F0F0F0' } },
            axisLabel: { formatter: (v: number) => '¥' + (v / 10000).toFixed(1) + '万', fontFamily: 'var(--font-family-number)', color: '#888' },
            nameTextStyle: { color: '#888' },
          },
          {
            type: 'value',
            name: '开户数',
            position: 'right',
            splitLine: { show: false },
            axisLabel: { fontFamily: 'var(--font-family-number)', color: '#888' },
            nameTextStyle: { color: '#888' },
          },
        ],
        series: [
          {
            name: '消耗',
            type: 'bar',
            data: merchantReport.map((r, i) => ({ value: r.cost, itemStyle: { color: SOFT_COLORS[i % SOFT_COLORS.length], borderRadius: [4, 4, 0, 0] } })),
            barWidth: '40%',
          },
          {
            name: '开户数',
            type: 'line',
            yAxisIndex: 1,
            data: merchantReport.map((r) => r.accounts),
            itemStyle: { color: '#7BC4A6' },
            lineStyle: { width: 3 },
            symbol: 'circle',
            symbolSize: 8,
          },
        ],
      }
    : null

  const channelChartOption = channelReport.length
    ? {
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        legend: { data: ['留资数', '开户率'], bottom: 0, textStyle: { color: '#888' } },
        grid: { left: '3%', right: '4%', bottom: '15%', top: '5%', containLabel: true },
        xAxis: {
          type: 'category',
          data: channelReport.map((r) => r.channel),
          axisLine: { lineStyle: { color: '#E8E8E8' } },
          axisTick: { show: false },
          axisLabel: { fontFamily: 'var(--font-family-cn)', color: '#888' },
        },
        yAxis: [
          {
            type: 'value',
            name: '留资数',
            position: 'left',
            splitLine: { lineStyle: { type: 'dashed', color: '#F0F0F0' } },
            axisLabel: { fontFamily: 'var(--font-family-number)', color: '#888' },
            nameTextStyle: { color: '#888' },
          },
          {
            type: 'value',
            name: '开户率',
            position: 'right',
            splitLine: { show: false },
            axisLabel: { formatter: (v: number) => (v * 100).toFixed(1) + '%', fontFamily: 'var(--font-family-number)', color: '#888' },
            nameTextStyle: { color: '#888' },
          },
        ],
        series: [
          {
            name: '留资数',
            type: 'bar',
            data: channelReport.map((r, i) => ({ value: r.leads, itemStyle: { color: SOFT_COLORS[i % SOFT_COLORS.length], borderRadius: [4, 4, 0, 0] } })),
            barWidth: '40%',
          },
          {
            name: '开户率',
            type: 'line',
            yAxisIndex: 1,
            data: channelReport.map((r) => Number((r.accountRate * 100).toFixed(2))),
            itemStyle: { color: '#E8917A' },
            lineStyle: { width: 3 },
            symbol: 'circle',
            symbolSize: 8,
          },
        ],
      }
    : null

  const merchantColumns = [
    { title: '期商', dataIndex: 'merchantName', key: 'merchantName', render: (v: string, record: MerchantReportItem) => v || record.qsId },
    { title: '留资数', dataIndex: 'leads', key: 'leads', align: 'right' as const, render: (v: number) => v.toLocaleString() },
    { title: '开户数', dataIndex: 'accounts', key: 'accounts', align: 'right' as const, render: (v: number) => v.toLocaleString() },
    { title: '消耗', dataIndex: 'cost', key: 'cost', align: 'right' as const, render: (v: number) => '¥' + v.toLocaleString() },
    { title: '开户率', dataIndex: 'accountRate', key: 'accountRate', align: 'right' as const, render: (v: number) => (v * 100).toFixed(2) + '%' },
    { title: '开户成本', dataIndex: 'accountCost', key: 'accountCost', align: 'right' as const, render: (v: number) => '¥' + v.toLocaleString() },
  ]

  const channelColumns = [
    { title: '渠道', dataIndex: 'channel', key: 'channel' },
    { title: '留资数', dataIndex: 'leads', key: 'leads', align: 'right' as const, render: (v: number) => v.toLocaleString() },
    { title: '开户数', dataIndex: 'accounts', key: 'accounts', align: 'right' as const, render: (v: number) => v.toLocaleString() },
    { title: '开户率', dataIndex: 'accountRate', key: 'accountRate', align: 'right' as const, render: (v: number) => (v * 100).toFixed(2) + '%' },
  ]

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
            期商数据分析
          </h1>
        </div>

        {/* 筛选器 */}
        <Card style={{ ...CARD_BASE, marginBottom: 'var(--margin-super-loose)' }} bodyStyle={{ padding: '24px' }}>
          <Row gutter={[20, 20]} align="middle">
            <Col xs={24} md={12} lg={6}>
              <RangePicker
                style={{ width: '100%' }}
                value={dateRange as any}
                onChange={(dates) => dates && setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])}
              />
            </Col>
            <Col xs={24} md={12} lg={6}>
              <Select
                mode="multiple"
                style={{ width: '100%' }}
                placeholder="选择期商"
                allowClear
                value={selectedMerchants}
                onChange={setSelectedMerchants}
                options={merchantOptions.map((m) => ({ label: m.merchantName, value: m.qsId }))}
                maxTagCount={2}
              />
            </Col>
            <Col xs={24} md={12} lg={6}>
              <Select
                mode="multiple"
                style={{ width: '100%' }}
                placeholder="选择渠道"
                allowClear
                value={selectedChannels}
                onChange={setSelectedChannels}
                options={channelOptions.map((c) => ({ label: c, value: c }))}
                maxTagCount={2}
              />
            </Col>
            <Col xs={24} md={12} lg={6} style={{ textAlign: 'right' }}>
              <Button type="primary" icon={<ReloadOutlined />} onClick={fetchData}>
                刷新
              </Button>
            </Col>
          </Row>
        </Card>

        {/* 核心指标 */}
        <Row gutter={[20, 20]} style={{ marginBottom: 'var(--margin-super-loose)' }}>
          <Col xs={24} sm={12} lg={6}>
            <MetricCard
              title="总消耗"
              value={totalCost}
              prefix="¥"
              precision={2}
              icon={<DollarOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <MetricCard
              title="总留资"
              value={totalLeads}
              icon={<FileTextOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <MetricCard
              title="总开户"
              value={totalAccounts}
              icon={<BankOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <MetricCard
              title="开户率"
              value={overallAccountRate * 100}
              suffix="%"
              precision={2}
              icon={<PercentageOutlined />}
            />
          </Col>
        </Row>

        {/* 期商报表 */}
        <h2
          style={{
            fontSize: 'var(--font-size-large)',
            fontWeight: 'var(--font-weight-medium)',
            marginBottom: 'var(--margin-loose)',
          }}
        >
          期商报表
        </h2>
        <Row gutter={[20, 20]} style={{ marginBottom: 'var(--margin-super-loose)' }}>
          <Col xs={24} lg={12}>
            <Card style={CARD_BASE} bodyStyle={{ padding: '20px 24px' }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 16 }}>
                期商消耗与开户
              </div>
              {merchantChartOption ? (
                <ReactECharts option={merchantChartOption} style={{ height: 320 }} />
              ) : (
                <Empty description="暂无数据" style={{ padding: '60px 0' }} />
              )}
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card style={CARD_BASE} bodyStyle={{ padding: '20px 24px' }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 16 }}>
                期商数据明细
              </div>
              <Table
                dataSource={merchantReport}
                rowKey="qsId"
                pagination={false}
                columns={merchantColumns}
                scroll={{ y: 320 }}
                locale={{ emptyText: <Empty description="暂无数据" /> }}
                size="small"
              />
            </Card>
          </Col>
        </Row>

        {/* 渠道报表 */}
        <h2
          style={{
            fontSize: 'var(--font-size-large)',
            fontWeight: 'var(--font-weight-medium)',
            marginBottom: 'var(--margin-loose)',
          }}
        >
          渠道报表
        </h2>
        <Row gutter={[20, 20]}>
          <Col xs={24} lg={12}>
            <Card style={CARD_BASE} bodyStyle={{ padding: '20px 24px' }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 16 }}>
                渠道留资与开户率
              </div>
              {channelChartOption ? (
                <ReactECharts option={channelChartOption} style={{ height: 320 }} />
              ) : (
                <Empty description="暂无数据" style={{ padding: '60px 0' }} />
              )}
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card style={CARD_BASE} bodyStyle={{ padding: '20px 24px' }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 16 }}>
                渠道数据明细
              </div>
              <Table
                dataSource={channelReport}
                rowKey="channel"
                pagination={false}
                columns={channelColumns}
                scroll={{ y: 320 }}
                locale={{ emptyText: <Empty description="暂无数据" /> }}
                size="small"
              />
            </Card>
          </Col>
        </Row>
      </div>
    </Spin>
  )
}

export default MerchantAnalysis
