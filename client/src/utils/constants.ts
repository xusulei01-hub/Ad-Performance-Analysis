/* ─── 共享常量 ─── */

/** 指标专属颜色（用于图标、KPI 卡片、图表中按指标类型着色） */
export const METRIC_COLORS: Record<string, string> = {
  cost: '#3366FF',
  activations: '#FF4019',
  accounts: '#07AB4B',
  roi: '#B341D9',
  cpa: '#FF9500',
  formalActivations: '#29A6FF',
  leads: '#14CCBD',
  ctr: '#FF661A',
  impressions: '#9C9C9C',
  clicks: '#6B8DD6',
  downloads: '#7BC4A6',
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
  borderRadius: 16,
  boxShadow: '0 4px 24px rgba(0,0,0,0.05)',
  border: 'none',
}
