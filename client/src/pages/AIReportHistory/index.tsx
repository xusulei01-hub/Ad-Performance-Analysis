import React, { useEffect, useState, useCallback } from 'react'
import {
  Card,
  Table,
  Tag,
  Button,
  Modal,
  Popconfirm,
  Empty,
  Spin,
  Typography,
  Space,
  message,
} from 'antd'
import {
  FileTextOutlined,
  DownloadOutlined,
  DeleteOutlined,
  EyeOutlined,
} from '@ant-design/icons'
import { aiReportService } from '@services/aiReportService'
import { exportAnalysisToDocx } from '@utils/docxExport'
import { AiReport } from '@/types'

const { Text } = Typography

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  dashboard: { label: '数据总览', color: 'blue' },
  channel: { label: '渠道分析', color: 'purple' },
  merchant: { label: '期商分析', color: 'orange' },
}

function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/^## (.+)$/gm, '<h3 style="font-size:15px;margin:16px 0 8px;font-weight:600;">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#CF1322;">$1</strong>')
    .replace(/^- (.+)$/gm, '<li style="margin-bottom:6px;line-height:1.7;">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li style="margin-bottom:6px;line-height:1.7;">$1</li>')
    .replace(/((?:<li[^>]*>.*<\/li>\n?)+)/g, '<ul style="padding-left:20px;margin:4px 0;">$1</ul>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')
}

const AIReportHistory: React.FC = () => {
  const [reports, setReports] = useState<AiReport[]>([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({ totalCount: 0, totalChars: 0, estimatedKb: 0 })
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [viewReport, setViewReport] = useState<AiReport | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [reportList, storageStats] = await Promise.all([
        aiReportService.getReports(),
        aiReportService.getStats(),
      ])
      setReports(reportList)
      setStats(storageStats)
    } catch (e) {
      console.error('Fetch reports error:', e)
      message.error('加载报告列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleDelete = async (id: number) => {
    try {
      await aiReportService.deleteReport(id)
      message.success('报告已删除')
      fetchData()
    } catch (e) {
      console.error('Delete report error:', e)
      message.error('删除失败')
    }
  }

  const handleExport = async (report: AiReport) => {
    try {
      const snapshot = report.dataSnapshot ? JSON.parse(report.dataSnapshot) : undefined
      await exportAnalysisToDocx(report.title, report.type, report.analysis, snapshot)
      message.success('Word 导出成功')
    } catch (e) {
      console.error('Export word error:', e)
      message.error('Word 导出失败')
    }
  }

  const handleView = (report: AiReport) => {
    setViewReport(report)
    setViewModalOpen(true)
  }

  const columns = [
    {
      title: '报告标题',
      dataIndex: 'title',
      key: 'title',
      render: (v: string) => (
        <span style={{ fontWeight: 500 }}>{v}</span>
      ),
    },
    {
      title: '分析类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (v: string) => {
        const meta = TYPE_LABELS[v] || { label: v, color: 'default' }
        return <Tag color={meta.color}>{meta.label}</Tag>
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (v: string) => new Date(v).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      render: (_: any, record: AiReport) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
          >
            查看
          </Button>
          <Button
            type="text"
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => handleExport(record)}
          >
            导出 Word
          </Button>
          <Popconfirm
            title="确认删除"
            description="删除后无法恢复，是否继续？"
            onConfirm={() => handleDelete(record.id)}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const isNearLimit = stats.totalCount >= 80

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
            历史报告
          </h1>
        </div>

        {/* 统计栏 */}
        <Card
          style={{ marginBottom: 'var(--margin-super-loose)' }}
          bodyStyle={{ padding: '16px 24px' }}
        >
          <Space size="large">
            <Text>
              <FileTextOutlined style={{ marginRight: 8 }} />
              已保存 <strong>{stats.totalCount}</strong> 条报告
            </Text>
            <Text>
              占用约 <strong>{stats.estimatedKb}</strong> KB
            </Text>
            {isNearLimit && (
              <Text type="danger" style={{ fontWeight: 500 }}>
                接近存储上限（100条），建议清理旧报告
              </Text>
            )}
          </Space>
        </Card>

        {/* 报告列表 */}
        <Table
          dataSource={reports}
          rowKey="id"
          columns={columns}
          pagination={{ pageSize: 10, showTotal: (total) => `共 ${total} 条` }}
          locale={{
            emptyText: (
              <Empty
                description="暂无保存的报告，前往各分析页面点击「保存报告」即可存档"
                style={{ padding: '60px 0' }}
              />
            ),
          }}
        />

        {/* 查看详情 Modal */}
        <Modal
          title={viewReport?.title || '报告详情'}
          open={viewModalOpen}
          onCancel={() => {
            setViewModalOpen(false)
            setViewReport(null)
          }}
          footer={
            viewReport ? (
              <Space>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={() => handleExport(viewReport)}
                >
                  导出 Word
                </Button>
                <Button onClick={() => setViewModalOpen(false)}>关闭</Button>
              </Space>
            ) : null
          }
          width={720}
        >
          {viewReport && (
            <div
              style={{
                fontSize: 14,
                lineHeight: 1.8,
                color: 'var(--color-text-primary)',
                background: 'var(--color-background-secondary)',
                borderRadius: 12,
                padding: '20px 24px',
                maxHeight: 600,
                overflow: 'auto',
              }}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(viewReport.analysis) }}
            />
          )}
        </Modal>
      </div>
    </Spin>
  )
}

export default AIReportHistory
