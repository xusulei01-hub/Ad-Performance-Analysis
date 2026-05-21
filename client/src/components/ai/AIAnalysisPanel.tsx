import React, { useState, useCallback } from 'react'
import { Card, Button, Spin, Typography } from 'antd'
import { RobotOutlined, ReloadOutlined, CloseOutlined } from '@ant-design/icons'
import { request } from '@services/api/client'

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

interface Props {
  data: unknown
  type?: 'dashboard' | 'channel' | 'merchant'
}

const AIAnalysisPanel: React.FC<Props> = ({ data, type = 'dashboard' }) => {
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
