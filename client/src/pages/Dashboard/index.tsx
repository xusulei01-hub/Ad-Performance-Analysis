import React, { useEffect, useState, useCallback } from 'react'
import { Row, Col, Card, Progress, Spin, Empty, Button, Modal, Form, InputNumber, DatePicker, message, Tag } from 'antd'
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
  SettingOutlined,
  AlertOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import ReactECharts from 'echarts-for-react'
import { dashboardService } from '@services/dashboardService'
import { targetService } from '@services/targetService'
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

/** 异常阈值：环比绝对值超过此比例视为异常 */
const ALERT_THRESHOLD = 0.3

function ChangeTag({ value, suffix = '%', alert }: { value: number; suffix?: string; alert?: boolean }) {
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
      {alert && <AlertOutlined style={{ color: '#FF2436', marginRight: 4 }} />}
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
  alert,
}: {
  title: string
  value: number
  prefix?: string
  suffix?: string
  precision?: number
  icon: React.ReactNode
  change?: number
  target?: number
  alert?: boolean
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
        {change !== undefined && <ChangeTag value={change} alert={alert} />}
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

function getWeekRange(now: dayjs.Dayjs) {
  const dayOfWeek = now.day()
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const startOfWeek = now.subtract(daysSinceMonday, 'day').startOf('day')
  const endOfWeek = startOfWeek.add(6, 'day').endOf('day')
  return { startOfWeek, endOfWeek }
}

const Dashboard: React.FC = () => {
  const [daily, setDaily] = useState<DailyOverview | null>(null)
  const [weekly, setWeekly] = useState<WeeklyOverview | null>(null)
  const [monthly, setMonthly] = useState<MonthlyOverview | null>(null)
  const [rankings, setRankings] = useState<RankingsData | null>(null)
  const [loading, setLoading] = useState(true)

  const [targetModalVisible, setTargetModalVisible] = useState(false)
  const [targetForm] = Form.useForm()

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

  const handleOpenTargetModal = () => {
    const now = dayjs()
    const { startOfWeek, endOfWeek } = getWeekRange(now)
    const startOfMonth = now.startOf('month')
    const endOfMonth = now.endOf('month')

    targetForm.setFieldsValue({
      weeklyStart: startOfWeek,
      weeklyEnd: endOfWeek,
      weeklyCost: weekly?.targetCost ?? 1000000,
      weeklyActivations: weekly?.targetActivations ?? 8000,
      weeklyAccounts: weekly?.targetAccounts ?? 5000,
      weeklyRoi: weekly?.targetRoi ?? 1.5,
      monthlyStart: startOfMonth,
      monthlyEnd: endOfMonth,
      monthlyCost: monthly?.targetCost ?? 5000000,
      monthlyActivations: monthly?.targetActivations ?? 40000,
      monthlyAccounts: monthly?.targetAccounts ?? 25000,
      monthlyRoi: monthly?.targetRoi ?? 1.5,
    })
    setTargetModalVisible(true)
  }

  const handleSaveTargets = async () => {
    try {
      const values = await targetForm.validateFields()

      await Promise.all([
        targetService.createOrUpdateTarget({
          periodType: 'weekly',
          periodStart: values.weeklyStart.format('YYYY-MM-DD'),
          periodEnd: values.weeklyEnd.format('YYYY-MM-DD'),
          targetCost: values.weeklyCost,
          targetActivations: values.weeklyActivations,
          targetAccounts: values.weeklyAccounts,
          targetRoi: values.weeklyRoi,
        }),
        targetService.createOrUpdateTarget({
          periodType: 'monthly',
          periodStart: values.monthlyStart.format('YYYY-MM-DD'),
          periodEnd: values.monthlyEnd.format('YYYY-MM-DD'),
          targetCost: values.monthlyCost,
          targetActivations: values.monthlyActivations,
          targetAccounts: values.monthlyAccounts,
          targetRoi: values.monthlyRoi,
        }),
      ])

      message.success('目标配置已保存')
      setTargetModalVisible(false)
      fetchData()
    } catch (e) {
      console.error('Save targets error:', e)
      message.error('保存失败')
    }
  }

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--margin-super-loose)' }}>
          <h1 style={{ fontSize: 'var(--font-size-extra-large)', fontWeight: 'var(--font-weight-medium)', margin: 0 }}>
            数据总览
          </h1>
          <Button icon={<SettingOutlined />} onClick={handleOpenTargetModal}>
            配置目标
          </Button>
        </div>

        {/* 异常预警提示 */}
        {daily && (
          (Math.abs(daily.costChange ?? 0) >= ALERT_THRESHOLD ||
           Math.abs(daily.activationsChange ?? 0) >= ALERT_THRESHOLD ||
           Math.abs(daily.accountsChange ?? 0) >= ALERT_THRESHOLD ||
           Math.abs(daily.roiChange ?? 0) >= ALERT_THRESHOLD) && (
            <div style={{ marginBottom: 'var(--margin-loose)' }}>
              <Tag color="error" icon={<AlertOutlined />} style={{ fontSize: 'var(--font-size-medium)', padding: '4px 12px' }}>
                昨日数据异常波动，请关注环比变化
              </Tag>
            </div>
          )
        )}

        {/* 昨日数据 */}
        <h2 style={cardTitleStyle}>昨日数据</h2>
        <Row gutter={[16, 16]} style={{ marginBottom: 'var(--margin-base)' }}>
          <Col xs={24} sm={12} lg={6}>
            <MetricCard
              title="昨日花费"
              value={daily?.cost ?? 0}
              prefix="¥"
              precision={2}
              icon={<DollarOutlined />}
              change={daily?.costChange}
              alert={Math.abs(daily?.costChange ?? 0) >= ALERT_THRESHOLD}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <MetricCard
              title="昨日激活"
              value={daily?.activations ?? 0}
              icon={<UserAddOutlined />}
              change={daily?.activationsChange}
              alert={Math.abs(daily?.activationsChange ?? 0) >= ALERT_THRESHOLD}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <MetricCard
              title="昨日开户"
              value={daily?.accounts ?? 0}
              icon={<BankOutlined />}
              change={daily?.accountsChange}
              alert={Math.abs(daily?.accountsChange ?? 0) >= ALERT_THRESHOLD}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <MetricCard
              title="昨日ROI"
              value={daily?.roi ?? 0}
              precision={2}
              icon={<PercentageOutlined />}
              change={daily?.roiChange}
              alert={Math.abs(daily?.roiChange ?? 0) >= ALERT_THRESHOLD}
            />
          </Col>
        </Row>
        <Row gutter={[16, 16]} style={{ marginBottom: 'var(--margin-super-loose)' }}>
          <Col xs={24} sm={12} lg={6}>
            <MetricCard
              title="昨日CPA"
              value={daily?.cpa ?? 0}
              prefix="¥"
              precision={2}
              icon={<DollarOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <MetricCard
              title="昨日转正"
              value={daily?.formalActivations ?? 0}
              icon={<CheckCircleOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <MetricCard
              title="昨日留资"
              value={daily?.leads ?? 0}
              icon={<FileTextOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
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
              precision={2}
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
          <Col xs={24} sm={12} lg={6}>
            <MetricCard
              title="本周CPA"
              value={weekly?.cpa ?? 0}
              prefix="¥"
              precision={2}
              icon={<DollarOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <MetricCard
              title="本周转正"
              value={weekly?.formalActivations ?? 0}
              icon={<CheckCircleOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <MetricCard
              title="本周留资"
              value={weekly?.leads ?? 0}
              icon={<FileTextOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
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
              precision={2}
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
          <Col xs={24} sm={12} lg={6}>
            <MetricCard
              title="本月CPA"
              value={monthly?.cpa ?? 0}
              prefix="¥"
              precision={2}
              icon={<DollarOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <MetricCard
              title="本月转正"
              value={monthly?.formalActivations ?? 0}
              icon={<CheckCircleOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <MetricCard
              title="本月留资"
              value={monthly?.leads ?? 0}
              icon={<FileTextOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <MetricCard
              title="本月CTR"
              value={(monthly?.ctr ?? 0) * 100}
              precision={2}
              suffix="%"
              icon={<BarChartOutlined />}
            />
          </Col>
        </Row>

        {/* 转化漏斗 */}
        <h2 style={{ ...cardTitleStyle, marginTop: 'var(--margin-super-loose)' }}>本月转化漏斗</h2>
        <Row gutter={[16, 16]} style={{ marginBottom: 'var(--margin-super-loose)' }}>
          <Col xs={24} lg={12}>
            <Card
              title="各环节转化率"
              style={{ borderRadius: 'var(--radius-extra-large)', boxShadow: 'var(--shadow-elevation-small)' }}
            >
              {monthly && monthly.impressions > 0 ? (
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
                        },
                        data: [
                          { value: 100, name: '曝光', itemStyle: { color: '#6B8DD6' } },
                          {
                            value: monthly.ctr * 100,
                            name: '点击',
                            itemStyle: { color: '#E8917A' },
                          },
                          {
                            value: monthly.downloads > 0 && monthly.clicks > 0
                              ? Math.round((monthly.downloads / monthly.clicks) * 100)
                              : 0,
                            name: '下载',
                            itemStyle: { color: '#7BC4A6' },
                          },
                          {
                            value: monthly.activations > 0 && monthly.downloads > 0
                              ? Math.round((monthly.activations / monthly.downloads) * 100)
                              : 0,
                            name: '激活',
                            itemStyle: { color: '#D4A5A5' },
                          },
                          {
                            value: monthly.formalActivations > 0 && monthly.activations > 0
                              ? Math.round((monthly.formalActivations / monthly.activations) * 100)
                              : 0,
                            name: '转正',
                            itemStyle: { color: '#A8C6E0' },
                          },
                          {
                            value: monthly.accounts > 0 && monthly.leads > 0
                              ? Math.round((monthly.accounts / monthly.leads) * 100)
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
            <Card
              title="转化效率指标"
              style={{ borderRadius: 'var(--radius-extra-large)', boxShadow: 'var(--shadow-elevation-small)' }}
            >
              {monthly && monthly.impressions > 0 ? (
                <ReactECharts
                  option={{
                    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
                    grid: { left: '3%', right: '8%', bottom: '3%', containLabel: true },
                    xAxis: {
                      type: 'value',
                      max: 100,
                      axisLabel: { formatter: '{value}%', fontFamily: 'var(--font-family-number)' },
                    },
                    yAxis: {
                      type: 'category',
                      data: ['开户率', '留资率', '转正率', '激活率', '下载率', '点击率'],
                      axisLabel: { fontFamily: 'var(--font-family-cn)' },
                    },
                    series: [
                      {
                        type: 'bar',
                        data: [
                          {
                            value: monthly.leads > 0 ? Number(((monthly.accounts / monthly.leads) * 100).toFixed(2)) : 0,
                            itemStyle: { color: '#D4B483' },
                          },
                          {
                            value: monthly.activations > 0 ? Number(((monthly.leads / monthly.activations) * 100).toFixed(2)) : 0,
                            itemStyle: { color: '#9DB0CE' },
                          },
                          {
                            value: monthly.activations > 0 ? Number(((monthly.formalActivations / monthly.activations) * 100).toFixed(2)) : 0,
                            itemStyle: { color: '#A8C6E0' },
                          },
                          {
                            value: monthly.downloads > 0 ? Number(((monthly.activations / monthly.downloads) * 100).toFixed(2)) : 0,
                            itemStyle: { color: '#D4A5A5' },
                          },
                          {
                            value: monthly.clicks > 0 ? Number(((monthly.downloads / monthly.clicks) * 100).toFixed(2)) : 0,
                            itemStyle: { color: '#7BC4A6' },
                          },
                          {
                            value: Number((monthly.ctr * 100).toFixed(2)),
                            itemStyle: { color: '#E8917A' },
                          },
                        ],
                        label: { show: true, position: 'right', formatter: '{c}%', fontFamily: 'var(--font-family-number)' },
                        barWidth: '50%',
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

        {/* 目标配置 Modal */}
        <Modal
          title="配置周期目标"
          open={targetModalVisible}
          onCancel={() => setTargetModalVisible(false)}
          onOk={handleSaveTargets}
          width={640}
          destroyOnClose
        >
          <Form form={targetForm} layout="vertical">
            <h3 style={{ marginBottom: 16, fontSize: 'var(--font-size-large)' }}>本周目标</h3>
            <Row gutter={[16, 0]}>
              <Col span={12}>
                <Form.Item name="weeklyStart" label="开始日期" rules={[{ required: true }]}>
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="weeklyEnd" label="结束日期" rules={[{ required: true }]}>
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={[16, 0]}>
              <Col span={12}>
                <Form.Item name="weeklyCost" label="花费目标" rules={[{ required: true }]}>
                  <InputNumber style={{ width: '100%' }} min={0} step={1000} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="weeklyActivations" label="激活目标" rules={[{ required: true }]}>
                  <InputNumber style={{ width: '100%' }} min={0} step={100} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={[16, 0]}>
              <Col span={12}>
                <Form.Item name="weeklyAccounts" label="开户目标" rules={[{ required: true }]}>
                  <InputNumber style={{ width: '100%' }} min={0} step={100} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="weeklyRoi" label="ROI 目标" rules={[{ required: true }]}>
                  <InputNumber style={{ width: '100%' }} min={0} step={0.1} precision={2} />
                </Form.Item>
              </Col>
            </Row>

            <h3 style={{ marginBottom: 16, marginTop: 24, fontSize: 'var(--font-size-large)' }}>本月目标</h3>
            <Row gutter={[16, 0]}>
              <Col span={12}>
                <Form.Item name="monthlyStart" label="开始日期" rules={[{ required: true }]}>
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="monthlyEnd" label="结束日期" rules={[{ required: true }]}>
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={[16, 0]}>
              <Col span={12}>
                <Form.Item name="monthlyCost" label="花费目标" rules={[{ required: true }]}>
                  <InputNumber style={{ width: '100%' }} min={0} step={1000} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="monthlyActivations" label="激活目标" rules={[{ required: true }]}>
                  <InputNumber style={{ width: '100%' }} min={0} step={100} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={[16, 0]}>
              <Col span={12}>
                <Form.Item name="monthlyAccounts" label="开户目标" rules={[{ required: true }]}>
                  <InputNumber style={{ width: '100%' }} min={0} step={100} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="monthlyRoi" label="ROI 目标" rules={[{ required: true }]}>
                  <InputNumber style={{ width: '100%' }} min={0} step={0.1} precision={2} />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Modal>
      </div>
    </Spin>
  )
}

export default Dashboard
