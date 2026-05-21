import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { Row, Col, Card, Progress, Spin, Empty, Button, Modal, Form, InputNumber, DatePicker, message, Tag, Tabs } from 'antd'
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
import { useRefresh } from '@components/layout/RefreshContext'
import AIAnalysisPanel from '@components/ai/AIAnalysisPanel'
import { METRIC_COLORS, SOFT_COLORS, CARD_BASE } from '@utils/constants'
import { getWeekRange } from '@utils/dates'
import { formatNumber } from '@utils/format'
import { DailyOverview, WeeklyOverview, MonthlyOverview, RankingsData } from '@/types'

/** 异常阈值 */
const ALERT_THRESHOLD = 0.3

/* ─── 环比变化标签 ─── */
function ChangeTag({ value, suffix = '%', alert }: { value: number; suffix?: string; alert?: boolean }) {
  const isUp = value >= 0
  return (
    <span
      style={{
        color: alert ? '#F5222D' : isUp ? 'var(--color-data-red)' : 'var(--color-data-green)',
        fontSize: 12,
        fontFamily: 'var(--font-family-number)',
        marginLeft: 8,
        fontWeight: 500,
      }}
    >
      {alert && <AlertOutlined style={{ color: '#F5222D', marginRight: 4 }} />}
      {isUp ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
      {Math.abs(value * 100).toFixed(1)}{suffix}
    </span>
  )
}

/* ─── 核心 KPI 大卡片 ─── */
function KpiCard({
  title,
  value,
  prefix,
  suffix,
  precision = 0,
  icon,
  change,
  target,
  alert,
  color = 'var(--color-brand-primary)',
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
  color?: string
}) {
  const pct = target !== undefined && target > 0
    ? Math.min(100, Number(((value / target) * 100).toFixed(1)))
    : 0

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
        {change !== undefined && <ChangeTag value={change} alert={alert} />}
      </div>
      {target !== undefined && target > 0 && (
        <div style={{ marginTop: 16 }}>
          <Progress
            percent={pct}
            size={{ height: 5 }}
            strokeColor={color}
            trailColor="rgba(0,0,0,0.04)"
            showInfo={false}
          />
          <div
            style={{
              fontSize: 12,
              color: 'var(--color-text-tertiary)',
              marginTop: 6,
              display: 'flex',
              justifyContent: 'space-between',
              fontFamily: 'var(--font-family-number)',
            }}
          >
            <span>目标完成度</span>
            <span>
              {prefix}{value.toLocaleString(undefined, { minimumFractionDigits: precision, maximumFractionDigits: precision })}
              <span style={{ color: 'var(--color-text-tertiary)', margin: '0 4px' }}>/</span>
              {prefix}{target.toLocaleString(undefined, { minimumFractionDigits: precision, maximumFractionDigits: precision })}
            </span>
          </div>
        </div>
      )}
    </Card>
  )
}

/* ─── 效率指标小卡片 ─── */
function EfficiencyCard({
  title,
  value,
  prefix,
  suffix,
  precision = 0,
  icon,
  color = 'var(--color-brand-primary)',
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
    <Card
      style={{ ...CARD_BASE, backgroundColor: 'var(--color-background-secondary)' }}
      bodyStyle={{ padding: '18px 20px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: `${color}14`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color,
              fontSize: 14,
            }}
          >
            {icon}
          </div>
          <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{title}</span>
        </div>
        <span
          style={{
            fontSize: 20,
            fontFamily: 'var(--font-family-number)',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
          }}
        >
          {prefix}
          {value.toLocaleString(undefined, { minimumFractionDigits: precision, maximumFractionDigits: precision })}
          {suffix}
        </span>
      </div>
    </Card>
  )
}

/* ─── 迷你 Sparkline 趋势图 ─── */
function MiniSparkline({
  data,
  color,
  formatter,
}: {
  data: { date: string; value: number }[]
  color: string
  formatter: (v: number) => string
}) {
  return (
    <ReactECharts
      option={{
        tooltip: {
          trigger: 'axis',
          formatter: (p: any) => `${p[0].axisValue}<br/>${formatter(p[0].value)}`,
          backgroundColor: 'rgba(255,255,255,0.95)',
          borderColor: 'rgba(0,0,0,0.05)',
          textStyle: { fontSize: 12, color: '#333' },
          extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-radius: 8px;',
        },
        grid: { top: 4, bottom: 4, left: 4, right: 4 },
        xAxis: {
          type: 'category',
          data: data.map((d) => d.date.slice(5)),
          show: false,
        },
        yAxis: { type: 'value', show: false },
        series: [
          {
            type: 'line',
            data: data.map((d) => d.value),
            smooth: true,
            symbol: 'none',
            lineStyle: { width: 2, color },
            areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [
              { offset: 0, color: color + '18' },
              { offset: 1, color: color + '02' },
            ]}},
          },
        ],
      }}
      style={{ height: 56, width: '100%' }}
    />
  )
}

/* ─── Tab 内容组件 ─── */
function OverviewTab({
  daily,
  weekly,
  monthly,
  type,
}: {
  daily: DailyOverview | null
  weekly: WeeklyOverview | null
  monthly: MonthlyOverview | null
  type: 'daily' | 'weekly' | 'monthly'
}) {
  const data = type === 'daily' ? daily : type === 'weekly' ? weekly : monthly
  const isDaily = type === 'daily'
  const labelPrefix = isDaily ? '昨日' : type === 'weekly' ? '本周' : '本月'

  if (!data) return <Empty description="暂无数据" style={{ padding: '60px 0' }} />

  /* 核心指标 */
  const coreKpis = [
    {
      title: `${labelPrefix}花费`,
      key: 'cost',
      prefix: '¥',
      precision: 2,
      icon: <DollarOutlined />,
      color: METRIC_COLORS.cost,
      change: isDaily ? daily?.costChange : undefined,
      target: !isDaily
        ? type === 'weekly'
          ? weekly?.targetCost
          : monthly?.targetCost
        : undefined,
      alert: isDaily ? Math.abs((daily?.costChange ?? 0)) >= ALERT_THRESHOLD : false,
    },
    {
      title: `${labelPrefix}激活`,
      key: 'activations',
      icon: <UserAddOutlined />,
      color: METRIC_COLORS.activations,
      change: isDaily ? daily?.activationsChange : undefined,
      target: !isDaily
        ? type === 'weekly'
          ? weekly?.targetActivations
          : monthly?.targetActivations
        : undefined,
      alert: isDaily ? Math.abs((daily?.activationsChange ?? 0)) >= ALERT_THRESHOLD : false,
    },
    {
      title: `${labelPrefix}开户`,
      key: 'accounts',
      icon: <BankOutlined />,
      color: METRIC_COLORS.accounts,
      change: isDaily ? daily?.accountsChange : undefined,
      target: !isDaily
        ? type === 'weekly'
          ? weekly?.targetAccounts
          : monthly?.targetAccounts
        : undefined,
      alert: isDaily ? Math.abs((daily?.accountsChange ?? 0)) >= ALERT_THRESHOLD : false,
    },
    {
      title: `${labelPrefix}ROI`,
      key: 'roi',
      precision: 2,
      icon: <PercentageOutlined />,
      color: METRIC_COLORS.roi,
      change: isDaily ? daily?.roiChange : undefined,
      target: !isDaily
        ? type === 'weekly'
          ? weekly?.targetRoi
          : monthly?.targetRoi
        : undefined,
      alert: isDaily ? Math.abs((daily?.roiChange ?? 0)) >= ALERT_THRESHOLD : false,
    },
  ]

  /* 效率指标 */
  const efficiencyMetrics = [
    {
      title: `${labelPrefix}CPA`,
      key: 'cpa',
      prefix: '¥',
      precision: 2,
      icon: <DollarOutlined />,
      color: METRIC_COLORS.cpa,
    },
    {
      title: `${labelPrefix}转正`,
      key: 'formalActivations',
      icon: <CheckCircleOutlined />,
      color: METRIC_COLORS.formalActivations,
    },
    {
      title: `${labelPrefix}留资`,
      key: 'leads',
      icon: <FileTextOutlined />,
      color: METRIC_COLORS.leads,
    },
    {
      title: `${labelPrefix}CTR`,
      key: 'ctr',
      precision: 2,
      suffix: '%',
      icon: <BarChartOutlined />,
      color: METRIC_COLORS.ctr,
      transform: (v: number) => v * 100,
    },
  ]

  const trends = !isDaily && (data as WeeklyOverview | MonthlyOverview).dailyTrends

  return (
    <div style={{ paddingTop: 20 }}>
      {/* 核心 KPI 区 */}
      <Row gutter={[20, 20]}>
        {coreKpis.map((kpi) => (
          <Col xs={12} sm={12} lg={6} key={kpi.key}>
            <KpiCard
              title={kpi.title}
              value={(data as any)[kpi.key] ?? 0}
              prefix={kpi.prefix}
              suffix={(kpi as any).suffix}
              precision={kpi.precision}
              icon={kpi.icon}
              change={kpi.change}
              target={kpi.target}
              alert={kpi.alert}
              color={kpi.color}
            />
          </Col>
        ))}
      </Row>

      {/* 效率指标区 */}
      <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
        {efficiencyMetrics.map((eff) => {
          const raw = (data as any)[eff.key] ?? 0
          const val = eff.transform ? eff.transform(raw) : raw
          return (
            <Col xs={12} sm={12} lg={6} key={eff.key}>
              <EfficiencyCard
                title={eff.title}
                value={val}
                prefix={eff.prefix}
                suffix={eff.suffix}
                precision={eff.precision}
                icon={eff.icon}
                color={eff.color}
              />
            </Col>
          )
        })}
      </Row>

      {/* 迷你趋势图（本周/本月） */}
      {trends && trends.length > 0 && (
        <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
          <Col xs={24} lg={12}>
            <Card
              style={{ ...CARD_BASE, padding: '16px 20px 8px' }}
              bodyStyle={{ padding: 0 }}
            >
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--color-text-secondary)',
                  fontWeight: 500,
                  marginBottom: 8,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>{labelPrefix}花费趋势</span>
                <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family-number)' }}>
                  {trends.length} 天
                </span>
              </div>
              <MiniSparkline
                data={trends.map((d) => ({ date: d.date, value: Number(d.cost.toFixed(2)) }))}
                color={METRIC_COLORS.cost}
                formatter={(v) => `¥${v.toLocaleString()}`}
              />
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card
              style={{ ...CARD_BASE, padding: '16px 20px 8px' }}
              bodyStyle={{ padding: 0 }}
            >
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--color-text-secondary)',
                  fontWeight: 500,
                  marginBottom: 8,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>{labelPrefix}激活趋势</span>
                <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family-number)' }}>
                  {trends.length} 天
                </span>
              </div>
              <MiniSparkline
                data={trends.map((d) => ({ date: d.date, value: d.activations }))}
                color={METRIC_COLORS.activations}
                formatter={(v) => `${v.toLocaleString()}`}
              />
            </Card>
          </Col>
        </Row>
      )}
    </div>
  )
}

/* ─── 主组件 ─── */
const Dashboard: React.FC = () => {
  const [daily, setDaily] = useState<DailyOverview | null>(null)
  const [weekly, setWeekly] = useState<WeeklyOverview | null>(null)
  const [monthly, setMonthly] = useState<MonthlyOverview | null>(null)
  const [rankings, setRankings] = useState<RankingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('daily')

  const { refreshKey } = useRefresh()
  const [targetModalVisible, setTargetModalVisible] = useState(false)
  const [targetForm] = Form.useForm()

  const tabItems = useMemo(
    () => [
      {
        key: 'daily',
        label: '昨日',
        children: <OverviewTab daily={daily} weekly={weekly} monthly={monthly} type="daily" />,
      },
      {
        key: 'weekly',
        label: '本周',
        children: <OverviewTab daily={daily} weekly={weekly} monthly={monthly} type="weekly" />,
      },
      {
        key: 'monthly',
        label: '本月',
        children: <OverviewTab daily={daily} weekly={weekly} monthly={monthly} type="monthly" />,
      },
    ],
    [daily, weekly, monthly]
  )

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
  }, [fetchData, refreshKey])

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

  /* ─── ECharts 配置（明亮色系 + 去网格线） ─── */
  const costRankingOption = rankings?.costRanking.length
    ? {
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: { left: '3%', right: '4%', bottom: '3%', top: '8%', containLabel: true },
        xAxis: {
          type: 'category',
          data: rankings.costRanking.map((r) => r.channel),
          axisLine: { lineStyle: { color: '#E8E8E8' } },
          axisTick: { show: false },
          axisLabel: { fontFamily: 'var(--font-family-cn)', color: '#888' },
        },
        yAxis: {
          type: 'value',
          splitLine: { lineStyle: { type: 'dashed', color: '#F0F0F0' } },
          axisLabel: { formatter: (v: number) => formatNumber(v), fontFamily: 'var(--font-family-number)', color: '#888' },
        },
        series: [
          {
            name: '花费',
            type: 'bar',
            data: rankings.costRanking.map((r, i) => ({
              value: r.cost,
              itemStyle: {
                color: SOFT_COLORS[i % SOFT_COLORS.length],
                borderRadius: [6, 6, 0, 0],
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
        legend: { data: ['ROI', '激活成本'], bottom: 0, textStyle: { color: '#888' } },
        grid: { left: '3%', right: '4%', bottom: '15%', top: '8%', containLabel: true },
        xAxis: {
          type: 'category',
          data: rankings.performanceRanking.map((r) => r.channel),
          axisLine: { lineStyle: { color: '#E8E8E8' } },
          axisTick: { show: false },
          axisLabel: { fontFamily: 'var(--font-family-cn)', color: '#888' },
        },
        yAxis: [
          {
            type: 'value',
            name: 'ROI',
            position: 'left',
            splitLine: { lineStyle: { type: 'dashed', color: '#F0F0F0' } },
            axisLabel: { fontFamily: 'var(--font-family-number)', color: '#888' },
            nameTextStyle: { color: '#888' },
          },
          {
            type: 'value',
            name: '激活成本',
            position: 'right',
            splitLine: { show: false },
            axisLabel: { formatter: (v: number) => '¥' + v, fontFamily: 'var(--font-family-number)', color: '#888' },
            nameTextStyle: { color: '#888' },
          },
        ],
        series: [
          {
            name: 'ROI',
            type: 'bar',
            data: rankings.performanceRanking.map((r) => Number(r.roi?.toFixed(2))),
            itemStyle: { color: '#D4A5A5', borderRadius: [4, 4, 0, 0] },
            barWidth: '30%',
          },
          {
            name: '激活成本',
            type: 'line',
            yAxisIndex: 1,
            data: rankings.performanceRanking.map((r) => r.cpa),
            itemStyle: { color: '#6B8DD6' },
            lineStyle: { width: 3 },
            symbol: 'circle',
            symbolSize: 6,
          },
        ],
      }
    : null

  const hasAlert = daily && (
    Math.abs(daily.costChange ?? 0) >= ALERT_THRESHOLD ||
    Math.abs(daily.activationsChange ?? 0) >= ALERT_THRESHOLD ||
    Math.abs(daily.accountsChange ?? 0) >= ALERT_THRESHOLD ||
    Math.abs(daily.roiChange ?? 0) >= ALERT_THRESHOLD
  )

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
            数据总览
          </h1>
          <Button icon={<SettingOutlined />} onClick={handleOpenTargetModal}>
            配置目标
          </Button>
        </div>

        {/* 异常预警 */}
        {hasAlert && (
          <div style={{ marginBottom: 'var(--margin-loose)' }}>
            <Tag
              color="error"
              icon={<AlertOutlined />}
              style={{ fontSize: 'var(--font-size-medium)', padding: '4px 12px' }}
            >
              昨日数据异常波动，请关注环比变化
            </Tag>
          </div>
        )}

        {/* AI 分析面板 */}
        <AIAnalysisPanel data={daily && weekly && monthly && rankings ? { daily, weekly, monthly, rankings } : null} />

        {/* Tabs 主区域 */}
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          destroyInactiveTabPane={false}
          style={{ marginBottom: 'var(--margin-super-loose)' }}
        />

        {/* 转化漏斗 */}
        <h2
          style={{
            fontSize: 'var(--font-size-large)',
            fontWeight: 'var(--font-weight-medium)',
            marginBottom: 'var(--margin-loose)',
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
              {monthly && monthly.impressions > 0 ? (
                <ReactECharts
                  option={{
                    tooltip: { trigger: 'item', formatter: '{b}: {c}% ({d}%)' },
                    series: [
                      {
                        type: 'funnel',
                        left: '10%',
                        top: 10,
                        bottom: 10,
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
                  style={{ height: 320 }}
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
              {monthly && monthly.impressions > 0 ? (
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
                        label: { show: true, position: 'right', formatter: '{c}%', fontFamily: 'var(--font-family-number)', color: '#666' },
                        barWidth: '45%',
                        itemStyle: { borderRadius: [0, 4, 4, 0] },
                      },
                    ],
                  }}
                  style={{ height: 320 }}
                />
              ) : (
                <Empty description="暂无数据" style={{ padding: '60px 0' }} />
              )}
            </Card>
          </Col>
        </Row>

        {/* 排名图表 */}
        <h2
          style={{
            fontSize: 'var(--font-size-large)',
            fontWeight: 'var(--font-weight-medium)',
            marginBottom: 'var(--margin-loose)',
          }}
        >
          渠道投放排名
        </h2>
        <Row gutter={[20, 20]}>
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
                渠道花费排名
              </div>
              {costRankingOption ? (
                <ReactECharts option={costRankingOption} style={{ height: 280 }} />
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
                渠道效果排名
              </div>
              {performanceRankingOption ? (
                <ReactECharts option={performanceRankingOption} style={{ height: 280 }} />
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
