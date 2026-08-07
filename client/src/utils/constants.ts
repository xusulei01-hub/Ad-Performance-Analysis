/* ─── 共享常量 ─── */

/** 指标专属颜色（用于图标、KPI 卡片、图表中按指标类型着色） */
export const METRIC_COLORS: Record<string, string> = {
  cost: '#0064FF',              // 小米科技蓝 - 花费
  activations: '#10B981',       // 精英绿 - 激活
  accounts: '#059669',          // 深邃绿 - 开户
  roi: '#FF6A00',               // 活力橙 - ROI 收益点睛
  cpa: '#64748B',               // 钢灰蓝 - CPA 成本控制
  formalActivations: '#8B5CF6',  // 绛紫 - 转正数（与点击 #3B82F6 区分）
  leads: '#0D9488',             // 雅致青 - 留资数
  ctr: '#EA580C',               // 暗红橙 - CTR 点击率
  impressions: '#94A3B8',       // 雾灰 - 曝光
  clicks: '#3B82F6',            // 蔚蓝 - 点击
  downloads: '#06B6D4',         // 湖蓝 - 下载
}

/** 转化漏斗各环节颜色（顺序：曝光→点击→下载→激活→转正→开户），Dashboard / ChannelAnalysis 共用 */
export const FUNNEL_STAGE_COLORS = [
  METRIC_COLORS.impressions,
  METRIC_COLORS.clicks,
  METRIC_COLORS.downloads,
  METRIC_COLORS.activations,
  METRIC_COLORS.formalActivations,
  METRIC_COLORS.accounts,
]

/** 转化效率条形图各环节颜色（顺序与 yAxis 一致：开户率→留资率→转正率→激活率→下载率→点击率） */
export const EFFICIENCY_STAGE_COLORS = [
  METRIC_COLORS.accounts,
  METRIC_COLORS.leads,
  METRIC_COLORS.formalActivations,
  METRIC_COLORS.activations,
  METRIC_COLORS.downloads,
  METRIC_COLORS.ctr,
]

/** 图表色板（用于多系列图表颜色区分） */
export const SOFT_COLORS = [
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

/** 现代化卡片基础样式 */
export const CARD_BASE: React.CSSProperties = {
  borderRadius: 'var(--radius-xxl)',
  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.02)',
  border: '1px solid var(--color-divider)',
}
