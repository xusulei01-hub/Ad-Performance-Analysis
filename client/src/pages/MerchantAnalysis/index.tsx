import React, { useEffect, useState, useCallback } from 'react'
import { Card, DatePicker, Table, Spin, Empty, Space, Button, Row, Col, Statistic } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import ReactECharts from 'echarts-for-react'
import { merchantService } from '@services/merchantService'
import { MerchantReportItem, ChannelReportItem } from '@/types'

const { RangePicker } = DatePicker

const SOFT_COLORS = [
  '#6B8DD6', '#E8917A', '#7BC4A6', '#D4A5A5', '#A8C6E0',
  '#D4B483', '#9DB0CE', '#B8D4B8', '#D9B8D4', '#C8C8A9',
]

const MerchantAnalysis: React.FC = () => {
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('month'),
    dayjs(),
  ])
  const [loading, setLoading] = useState(false)
  const [merchantReport, setMerchantReport] = useState<MerchantReportItem[]>([])
  const [channelReport, setChannelReport] = useState<ChannelReportItem[]>([])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [mRes, cRes] = await Promise.all([
        merchantService.getMerchantReport({
          startDate: dateRange[0].format('YYYY-MM-DD'),
          endDate: dateRange[1].format('YYYY-MM-DD'),
        }),
        merchantService.getChannelReport({
          startDate: dateRange[0].format('YYYY-MM-DD'),
          endDate: dateRange[1].format('YYYY-MM-DD'),
        }),
      ])
      setMerchantReport(mRes.report)
      setChannelReport(cRes.report)
    } catch (e) {
      console.error('Fetch merchant report error:', e)
    } finally {
      setLoading(false)
    }
  }, [dateRange])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const totalLeads = merchantReport.reduce((sum, r) => sum + r.leads, 0)
  const totalAccounts = merchantReport.reduce((sum, r) => sum + r.accounts, 0)
  const totalCost = merchantReport.reduce((sum, r) => sum + r.cost, 0)
  const overallAccountRate = totalLeads > 0 ? Number((totalAccounts / totalLeads).toFixed(4)) : 0
  // const overallAccountCost = totalAccounts > 0 ? Number((totalCost / totalAccounts).toFixed(2)) : 0

  const merchantChartOption = merchantReport.length
    ? {
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        legend: { data: ['消耗', '开户数'], bottom: 0 },
        grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
        xAxis: {
          type: 'category',
          data: merchantReport.map((r) => r.merchantName || r.qsId),
          axisLabel: { fontFamily: 'var(--font-family-cn)', rotate: 30 },
        },
        yAxis: [
          { type: 'value', name: '消耗', position: 'left', axisLabel: { formatter: (v: number) => '¥' + (v / 10000).toFixed(1) + '万' } },
          { type: 'value', name: '开户数', position: 'right' },
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
            itemStyle: { color: 'var(--color-data-green)' },
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
        legend: { data: ['留资数', '开户率'], bottom: 0 },
        grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
        xAxis: {
          type: 'category',
          data: channelReport.map((r) => r.channel),
          axisLabel: { fontFamily: 'var(--font-family-cn)' },
        },
        yAxis: [
          { type: 'value', name: '留资数', position: 'left' },
          { type: 'value', name: '开户率', position: 'right', axisLabel: { formatter: (v: number) => (v * 100).toFixed(1) + '%' } },
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
            itemStyle: { color: 'var(--color-data-red)' },
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
        <h1 style={{ fontSize: 'var(--font-size-extra-large)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--margin-super-loose)' }}>
          期商数据分析
        </h1>

        <Row gutter={[16, 16]} style={{ marginBottom: 'var(--margin-loose)' }}>
          <Col xs={24} md={12} lg={8}>
            <RangePicker style={{ width: '100%' }} value={dateRange as any} onChange={(dates) => dates && setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])} />
          </Col>
          <Col xs={24} md={12} lg={8}>
            <Space>
              <Button type="primary" icon={<ReloadOutlined />} onClick={fetchData}>刷新</Button>
            </Space>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginBottom: 'var(--margin-super-loose)' }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="总消耗" value={totalCost} prefix="¥" valueStyle={{ fontFamily: 'var(--font-family-number)' }} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="总留资" value={totalLeads} valueStyle={{ fontFamily: 'var(--font-family-number)' }} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="总开户" value={totalAccounts} valueStyle={{ fontFamily: 'var(--font-family-number)' }} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="开户率" value={overallAccountRate * 100} suffix="%" precision={2} valueStyle={{ fontFamily: 'var(--font-family-number)' }} />
            </Card>
          </Col>
        </Row>

        <h2 style={{ fontSize: 'var(--font-size-large)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--margin-loose)' }}>
          期商报表
        </h2>
        <Row gutter={[16, 16]} style={{ marginBottom: 'var(--margin-super-loose)' }}>
          <Col xs={24} lg={12}>
            <Card title="期商消耗与开户" style={{ borderRadius: 'var(--radius-extra-large)', boxShadow: 'var(--shadow-elevation-small)' }}>
              {merchantChartOption ? (
                <ReactECharts option={merchantChartOption} style={{ height: 320 }} />
              ) : (
                <Empty description="暂无数据" style={{ padding: '60px 0' }} />
              )}
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="期商数据明细" style={{ borderRadius: 'var(--radius-extra-large)', boxShadow: 'var(--shadow-elevation-small)' }}>
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

        <h2 style={{ fontSize: 'var(--font-size-large)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--margin-loose)' }}>
          渠道报表
        </h2>
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card title="渠道留资与开户率" style={{ borderRadius: 'var(--radius-extra-large)', boxShadow: 'var(--shadow-elevation-small)' }}>
              {channelChartOption ? (
                <ReactECharts option={channelChartOption} style={{ height: 320 }} />
              ) : (
                <Empty description="暂无数据" style={{ padding: '60px 0' }} />
              )}
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="渠道数据明细" style={{ borderRadius: 'var(--radius-extra-large)', boxShadow: 'var(--shadow-elevation-small)' }}>
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
