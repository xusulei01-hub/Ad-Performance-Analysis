import React, { useState, useCallback } from 'react'
import { Card, Button, Spin, Typography, message, Modal } from 'antd'
import {
  RobotOutlined,
  ReloadOutlined,
  CloseOutlined,
  FileWordOutlined,
  SaveOutlined,
} from '@ant-design/icons'
import { request } from '@services/api/client'
import { aiReportService } from '@services/aiReportService'
import { exportAnalysisToDocx } from '@utils/docxExport'
import dayjs from 'dayjs'

const { Paragraph } = Typography

function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // headers
    .replace(/^## (.+)$/gm, '<h3 style="font-size:15px;margin:16px 0 8px;font-weight:600;">$1</h3>')
    // bold
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#CF1322;">$1</strong>')
    // unordered lists
    .replace(/^- (.+)$/gm, '<li style="margin-bottom:6px;line-height:1.7;">$1</li>')
    // ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li style="margin-bottom:6px;line-height:1.7;">$1</li>')
    // wrap consecutive <li> in <ul>
    .replace(/((?:<li[^>]*>.*<\/li>\n?)+)/g, '<ul style="padding-left:20px;margin:4px 0;">$1</ul>')
    // paragraphs (double newline)
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')
}

const PANEL_META: Record<string, { title: string; subtitle: string; endpoint: string }> = {
  dashboard: {
    title: 'AI 数据诊断',
    subtitle: '基于当前全部数据自动分析，给出结论和投放建议',
    endpoint: '/v1/ai/analyze',
  },
  channel: {
    title: 'AI 渠道诊断',
    subtitle: '基于当前渠道数据自动分析各渠道和计划表现',
    endpoint: '/v1/ai/analyze-channel',
  },
  merchant: {
    title: 'AI 期商诊断',
    subtitle: '基于当前期商数据自动分析期商质量和渠道效果',
    endpoint: '/v1/ai/analyze-merchant',
  },
}

function buildDataSnapshot(type: string, data: unknown): Record<string, any> | undefined {
  if (!data) return undefined
  const d = data as any

  if (type === 'dashboard') {
    return {
      yesterday: d.daily
        ? {
            cost: d.daily.cost,
            activations: d.daily.activations,
            accounts: d.daily.accounts,
            roi: d.daily.roi,
          }
        : undefined,
      weekly: d.weekly
        ? {
            cost: d.weekly.cost,
            activations: d.weekly.activations,
            accounts: d.weekly.accounts,
            roi: d.weekly.roi,
          }
        : undefined,
    }
  }

  if (type === 'channel') {
    return {
      totalCost: d.totalMetrics?.cost,
      totalActivations: d.totalMetrics?.activations,
      totalAccounts: d.totalMetrics?.accounts,
      avgRoi: d.totalMetrics?.roi,
      channelCount: d.channels?.length || d.channelBreakdown?.length,
    }
  }

  if (type === 'merchant') {
    const mr = d.merchantReport || []
    const totalCost = mr.reduce((s: number, r: any) => s + (r.cost || 0), 0)
    const totalLeads = mr.reduce((s: number, r: any) => s + (r.leads || 0), 0)
    const totalAccounts = mr.reduce((s: number, r: any) => s + (r.accounts || 0), 0)
    return {
      totalCost,
      totalLeads,
      totalAccounts,
      accountRate: totalLeads > 0 ? totalAccounts / totalLeads : 0,
    }
  }

  return undefined
}

interface Props {
  data: unknown
  type?: 'dashboard' | 'channel' | 'merchant'
}

const AIAnalysisPanel: React.FC<Props> = ({ data, type = 'dashboard' }) => {
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)

  const meta = PANEL_META[type]

  const handleAnalyze = useCallback(async () => {
    if (!data) return
    setLoading(true)
    setError(null)
    try {
      const res = await request.post<{ analysis: string }>(meta.endpoint, data)
      setAnalysis(res.analysis)
    } catch (err: any) {
      const msg = err?.responseData?.message || err?.message || '分析失败，请稍后重试'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [data, meta.endpoint])

  const handleClose = () => {
    setAnalysis(null)
    setError(null)
  }

  const handleExportWord = async () => {
    if (!analysis) return
    setExporting(true)
    try {
      const title = `${meta.title}报告 — ${dayjs().format('YYYY-MM-DD')}`
      const snapshot = buildDataSnapshot(type, data)
      await exportAnalysisToDocx(title, type, analysis, snapshot)
      message.success('Word 导出成功')
    } catch (e) {
      console.error('Export word error:', e)
      message.error('Word 导出失败')
    } finally {
      setExporting(false)
    }
  }

  const handleSaveReport = async () => {
    if (!analysis) return
    setSaving(true)
    try {
      const title = `${meta.title}报告 — ${dayjs().format('YYYY-MM-DD')}`
      const snapshot = buildDataSnapshot(type, data)
      const result = await aiReportService.createReport({
        title,
        type,
        analysis,
        dataSnapshot: snapshot ? JSON.stringify(snapshot) : undefined,
      })

      if (result.warning) {
        Modal.confirm({
          title: '存储空间预警',
          content: `${result.warning}，是否继续保存？`,
          okText: '继续保存',
          cancelText: '取消',
          onOk: async () => {
            try {
              const r = await aiReportService.createReport({
                title,
                type,
                analysis,
                dataSnapshot: snapshot ? JSON.stringify(snapshot) : undefined,
              })
              message.success('报告已保存')
              return r
            } catch (err: any) {
              if (err?.responseData?.message?.includes('上限')) {
                Modal.warning({
                  title: '存储空间已满',
                  content: '报告数量已达上限（100条），请先到「历史报告」页面删除旧报告后再保存。',
                })
              } else {
                message.error(err?.responseData?.message || '保存失败')
              }
            }
          },
        })
      } else {
        message.success('报告已保存')
      }
    } catch (err: any) {
      const msg = err?.responseData?.message || err?.message || '保存失败'
      if (msg.includes('上限') || err?.responseData?.message?.includes('上限')) {
        Modal.warning({
          title: '存储空间已满',
          content: '报告数量已达上限（100条），请先到「历史报告」页面删除旧报告后再保存。',
        })
      } else {
        message.error(msg)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card
      style={{
        marginBottom: 24,
        borderLeft: '3px solid var(--color-brand-primary)',
      }}
      bodyStyle={{ padding: '20px 24px' }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: analysis || loading || error ? 16 : 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #6B8DD6, #A8C6E0)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 18,
            }}
          >
            <RobotOutlined />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {meta.title}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
              {meta.subtitle}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {!analysis && !loading && (
            <Button type="primary" icon={<RobotOutlined />} onClick={handleAnalyze}>
              开始分析
            </Button>
          )}
          {(analysis || error) && (
            <>
              <Button
                icon={<FileWordOutlined />}
                onClick={handleExportWord}
                loading={exporting}
              >
                导出 Word
              </Button>
              <Button
                icon={<SaveOutlined />}
                onClick={handleSaveReport}
                loading={saving}
              >
                保存报告
              </Button>
              <Button icon={<ReloadOutlined />} onClick={handleAnalyze} loading={loading}>
                重新分析
              </Button>
              <Button icon={<CloseOutlined />} onClick={handleClose} />
            </>
          )}
        </div>
      </div>

      {/* Content */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 12, color: 'var(--color-text-tertiary)', fontSize: 13 }}>
            AI 正在分析数据，预计 5-10 秒...
          </div>
        </div>
      )}

      {error && !loading && (
        <Paragraph
          style={{
            color: '#CF1322',
            fontSize: 13,
            marginBottom: 0,
            padding: '12px 16px',
            background: '#FFF2F0',
            borderRadius: 8,
          }}
        >
          {error}
        </Paragraph>
      )}

      {analysis && !loading && (
        <div
          style={{
            fontSize: 14,
            lineHeight: 1.8,
            color: 'var(--color-text-primary)',
            background: 'var(--color-background-secondary)',
            borderRadius: 12,
            padding: '20px 24px',
          }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(analysis) }}
        />
      )}
    </Card>
  )
}

export default AIAnalysisPanel
