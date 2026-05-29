/* ─── 共享常量 ─── */

/** 指标专属颜色（用于图标、KPI 卡片、图表中按指标类型着色） */
export const METRIC_COLORS: Record<string, string> = {
  cost: '#0064FF',              // 小米科技蓝 - 花费
  activations: '#10B981',       // 精英绿 - 激活
  accounts: '#059669',          // 深邃绿 - 开户
  roi: '#FF6A00',               // 活力橙 - ROI 收益点睛
  cpa: '#64748B',               // 钢灰蓝 - CPA 成本控制
  formalActivations: '#3B82F6',  // 闪电蓝 - 转正数
  leads: '#0D9488',             // 雅致青 - 留资数
  ctr: '#EA580C',               // 暗红橙 - CTR 点击率
  impressions: '#94A3B8',       // 雾灰 - 曝光
  clicks: '#3B82F6',            // 蔚蓝 - 点击
  downloads: '#06B6D4',         // 湖蓝 - 下载
}

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
