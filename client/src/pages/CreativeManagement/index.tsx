import React, { useEffect, useState, useCallback } from 'react'
import {
  Card, Upload, Button, Table, message, Row, Col, Select, Input, Tag, Modal, Empty, Space, Tabs, Drawer, Popconfirm, Badge, Tooltip, Descriptions,
} from 'antd'
import {
  InboxOutlined, PictureOutlined, VideoCameraOutlined, CheckOutlined, CloseOutlined, LinkOutlined, BarChartOutlined, DeleteOutlined, RedoOutlined, ReloadOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { creativeService } from '@services/creativeService'
import { useAuthStore } from '@stores/authStore'
import { CARD_BASE } from '@utils/constants'
import { formatNumber } from '@utils/format'
import type { Creative, CreativeStatus, CreativePerformance } from '@/types'

const { Dragger } = Upload

const STATUS_META: Record<CreativeStatus, { label: string; color: string }> = {
  processing: { label: '压缩中', color: 'gold' },
  pending: { label: '待审核', color: 'orange' },
  approved: { label: '已通过', color: 'green' },
  rejected: { label: '已驳回', color: 'red' },
}

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  return (bytes / 1024).toFixed(0) + ' KB'
}

const CreativeManagement: React.FC = () => {
  const { isAdmin } = useAuthStore()

  // ===== 上传 =====
  const [uploadChannel, setUploadChannel] = useState<string | undefined>()
  const [uploadCampaignId, setUploadCampaignId] = useState('')
  const [uploadTitle, setUploadTitle] = useState('')
  const [fileList, setFileList] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [channelOptions, setChannelOptions] = useState<string[]>([])

  // ===== 列表 =====
  const [records, setRecords] = useState<Creative[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [loading, setLoading] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string | undefined>()
  const [filterCampaignId, setFilterCampaignId] = useState('')

  // ===== 审核 =====
  const [reviewRecords, setReviewRecords] = useState<Creative[]>([])
  const [reviewTotal, setReviewTotal] = useState(0)
  const [reviewPage, setReviewPage] = useState(1)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [rejectTarget, setRejectTarget] = useState<Creative | null>(null)
  const [rejectComment, setRejectComment] = useState('')

  // ===== 预览 / 关联 / 效果 =====
  const [previewTarget, setPreviewTarget] = useState<Creative | null>(null)
  const [linkTarget, setLinkTarget] = useState<Creative | null>(null)
  const [linkCampaignId, setLinkCampaignId] = useState('')
  const [perfTarget, setPerfTarget] = useState<Creative | null>(null)
  const [perfData, setPerfData] = useState<CreativePerformance | null>(null)
  const [perfLoading, setPerfLoading] = useState(false)

  const [activeTab, setActiveTab] = useState('upload')

  // 渠道选项：主清单 ∪ 数据渠道，后端按用户权限过滤
  useEffect(() => {
    creativeService.getChannels().then(setChannelOptions).catch(() => {})
  }, [])

  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const res = await creativeService.list({
        page, pageSize,
        status: filterStatus,
        campaign_id: filterCampaignId || undefined,
      })
      setRecords(res.records)
      setTotal(res.total)
    } catch {
      message.error('素材列表加载失败，请确认后端服务已启动后刷新')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, filterStatus, filterCampaignId])

  const fetchReviewQueue = useCallback(async () => {
    if (!isAdmin) return
    setReviewLoading(true)
    try {
      const res = await creativeService.list({ page: reviewPage, pageSize: 12, status: 'pending' })
      setReviewRecords(res.records)
      setReviewTotal(res.total)
    } catch {
      message.error('审核队列加载失败，请确认后端服务已启动后刷新')
    } finally {
      setReviewLoading(false)
    }
  }, [isAdmin, reviewPage])

  useEffect(() => { fetchList() }, [fetchList])
  useEffect(() => { if (activeTab === 'review') fetchReviewQueue() }, [activeTab, fetchReviewQueue])

  // 列表中有压缩中的视频时，5s 后自动刷新一次
  useEffect(() => {
    if (!records.some((r) => r.status === 'processing')) return
    const timer = setTimeout(fetchList, 5000)
    return () => clearTimeout(timer)
  }, [records, fetchList])

  // ===== 上传处理 =====
  const handleUpload = async () => {
    if (fileList.length === 0) { message.warning('请选择素材文件（可多选或传 zip 压缩包）'); return }
    if (!uploadChannel) { message.warning('请选择素材所属渠道'); return }
    setUploading(true)
    try {
      const result = await creativeService.upload(fileList, uploadChannel, uploadCampaignId.trim() || undefined, uploadTitle.trim() || undefined)
      const parts = [`成功创建 ${result.created} 个素材`]
      if (result.zips > 0) parts.push(`（含压缩包拆出 ${result.zipExtracted} 个）`)
      if (result.videosProcessing > 0) parts.push(`，${result.videosProcessing} 个视频正在后台压缩，稍后自动进入待审核`)
      message.success(parts.join(''))
      if (result.rejected.length > 0) {
        Modal.warning({
          title: '部分文件未入库',
          content: (
            <div style={{ maxHeight: 240, overflowY: 'auto' }}>
              {result.rejected.map((r, i) => <div key={i} style={{ padding: '4px 0' }}>{r.filename}：{r.reason}</div>)}
            </div>
          ),
        })
      }
      setFileList([])
      setUploadCampaignId('')
      setUploadTitle('')
      fetchList()
    } catch { /* 拦截器已提示 */ } finally {
      setUploading(false)
    }
  }

  // ===== 关联计划 =====
  const openLinkModal = (record: Creative) => {
    setLinkTarget(record)
    setLinkCampaignId(record.campaigns[0]?.campaignId || '')
  }
  const handleLinkSave = async () => {
    if (!linkTarget) return
    try {
      await creativeService.setCampaigns(linkTarget.id, linkCampaignId.trim() ? [linkCampaignId.trim()] : [])
      message.success(linkCampaignId.trim() ? '计划关联已保存' : '已取消计划关联')
      setLinkTarget(null)
      fetchList()
    } catch { /* 拦截器已提示 */ }
  }

  // ===== 效果 =====
  const openPerformance = async (record: Creative) => {
    setPerfTarget(record)
    setPerfData(null)
    setPerfLoading(true)
    try {
      const data = await creativeService.performance(record.id)
      setPerfData(data)
    } catch { /* 拦截器已提示 */ } finally {
      setPerfLoading(false)
    }
  }

  // ===== 审核 =====
  const handleApprove = async (record: Creative) => {
    try {
      await creativeService.review(record.id, 'approve')
      message.success('已通过')
      fetchReviewQueue()
      fetchList()
    } catch { /* 拦截器已提示 */ }
  }
  const handleReject = async () => {
    if (!rejectTarget) return
    if (!rejectComment.trim()) { message.warning('请填写驳回原因'); return }
    try {
      await creativeService.review(rejectTarget.id, 'reject', rejectComment.trim())
      message.success('已驳回')
      setRejectTarget(null)
      setRejectComment('')
      fetchReviewQueue()
      fetchList()
    } catch { /* 拦截器已提示 */ }
  }

  const handleResubmit = async (record: Creative) => {
    try {
      await creativeService.resubmit(record.id)
      message.success('已重新提交，等待审核')
      fetchList()
    } catch { /* 拦截器已提示 */ }
  }

  const handleDelete = async (record: Creative) => {
    try {
      await creativeService.remove(record.id)
      message.success('已删除')
      fetchList()
    } catch { /* 拦截器已提示 */ }
  }

  // ===== 预览缩略图 =====
  const renderThumb = (record: Creative, size = 64) => {
    const url = creativeService.fileUrl(record.storedName)
    const style: React.CSSProperties = { width: size, height: size, objectFit: 'cover', borderRadius: 8, cursor: 'pointer', background: '#f5f5f5', display: 'block' }
    if (record.mediaType === 'image') {
      return <img src={url} style={style} onClick={() => setPreviewTarget(record)} alt={record.filename} />
    }
    return (
      <div style={{ ...style, position: 'relative' }} onClick={() => setPreviewTarget(record)}>
        <video src={url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} preload="metadata" muted />
        <VideoCameraOutlined style={{ position: 'absolute', inset: 0, margin: 'auto', width: 22, height: 22, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,.6)' }} />
      </div>
    )
  }

  const renderCampaigns = (record: Creative) => {
    if (record.campaigns.length === 0) {
      return <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>未关联</span>
    }
    return (
      <Space size={4} wrap>
        {record.campaigns.map((c) => <Tag key={c.campaignId} color="blue" style={{ marginRight: 0 }}>{c.campaignId}</Tag>)}
      </Space>
    )
  }

  const listColumns = [
    { title: '预览', key: 'preview', width: 90, render: (_: unknown, r: Creative) => renderThumb(r) },
    { title: '文件名', dataIndex: 'filename', key: 'filename', ellipsis: true, render: (v: string, r: Creative) => (
      <div>
        <div style={{ color: 'var(--color-text-primary)' }}>{r.title || v}</div>
        {r.title && <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{v}</div>}
      </div>
    ) },
    { title: '渠道', dataIndex: 'channel', key: 'channel', width: 90 },
    { title: '类型', dataIndex: 'mediaType', key: 'mediaType', width: 80, render: (v: string) => v === 'image'
      ? <Tag icon={<PictureOutlined />}>图片</Tag>
      : <Tag icon={<VideoCameraOutlined />} color="purple">视频</Tag> },
    { title: '大小', dataIndex: 'fileSize', key: 'fileSize', width: 90, align: 'right' as const, render: (v: number) => <span className="font-number">{formatSize(v)}</span> },
    { title: '状态', dataIndex: 'status', key: 'status', width: 110, render: (v: CreativeStatus, r: Creative) => (
      <div>
        <Tag color={STATUS_META[v].color}>{STATUS_META[v].label}</Tag>
        {v === 'rejected' && r.reviewComment && (
          <Tooltip title={`驳回原因：${r.reviewComment}`}>
            <div style={{ fontSize: 12, color: 'var(--color-data-red, #cf1322)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'help' }}>
              {r.reviewComment}
            </div>
          </Tooltip>
        )}
      </div>
    ) },
    { title: '关联计划', key: 'campaigns', width: 160, render: (_: unknown, r: Creative) => renderCampaigns(r) },
    { title: '上传时间', dataIndex: 'createdAt', key: 'createdAt', width: 150, render: (v: string) => <span className="font-number">{dayjs(v).format('MM-DD HH:mm')}</span> },
    {
      title: '操作', key: 'action', width: 200,
      render: (_: unknown, r: Creative) => (
        <Space size={0} wrap>
          <Button type="link" size="small" icon={<LinkOutlined />} onClick={() => openLinkModal(r)}>
            {r.campaigns.length > 0 ? '改关联' : '关联计划'}
          </Button>
          <Button type="link" size="small" icon={<BarChartOutlined />} disabled={r.campaigns.length === 0} onClick={() => openPerformance(r)}>效果</Button>
          {r.status === 'rejected' && (
            <Button type="link" size="small" icon={<RedoOutlined />} onClick={() => handleResubmit(r)}>重提</Button>
          )}
          {(r.status === 'rejected' || r.status === 'pending' || isAdmin) && (
            <Popconfirm title="确定删除该素材？" onConfirm={() => handleDelete(r)} okButtonProps={{ danger: true }}>
              <Button type="link" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  const reviewColumns = [
    { title: '预览', key: 'preview', width: 100, render: (_: unknown, r: Creative) => renderThumb(r, 80) },
    { title: '文件名', dataIndex: 'filename', key: 'filename', ellipsis: true },
    { title: '渠道', dataIndex: 'channel', key: 'channel', width: 90 },
    { title: '上传人', dataIndex: 'uploaderName', key: 'uploaderName', width: 110 },
    { title: '类型', dataIndex: 'mediaType', key: 'mediaType', width: 80, render: (v: string) => v === 'image' ? <Tag>图片</Tag> : <Tag color="purple">视频</Tag> },
    { title: '关联计划', key: 'campaigns', width: 150, render: (_: unknown, r: Creative) => renderCampaigns(r) },
    { title: '上传时间', dataIndex: 'createdAt', key: 'createdAt', width: 150, render: (v: string) => <span className="font-number">{dayjs(v).format('MM-DD HH:mm')}</span> },
    {
      title: '审核', key: 'action', width: 160,
      render: (_: unknown, r: Creative) => (
        <Space>
          <Popconfirm title="确认通过该素材？" onConfirm={() => handleApprove(r)}>
            <Button type="primary" size="small" icon={<CheckOutlined />}>通过</Button>
          </Popconfirm>
          <Button danger size="small" icon={<CloseOutlined />} onClick={() => { setRejectTarget(r); setRejectComment('') }}>驳回</Button>
        </Space>
      ),
    },
  ]

  const tabItems = [
    {
      key: 'upload',
      label: <Space><InboxOutlined />上传素材</Space>,
      children: (
        <Card style={CARD_BASE} bodyStyle={{ padding: '20px 24px' }}>
          <Row gutter={[16, 16]} style={{ marginBottom: 'var(--margin-loose)' }}>
            <Col xs={24} sm={8}>
              <Select
                style={{ width: '100%' }}
                placeholder="选择素材所属渠道（必选）"
                value={uploadChannel}
                onChange={setUploadChannel}
                options={channelOptions.map((c) => ({ label: c, value: c }))}
              />
            </Col>
            <Col xs={24} sm={8}>
              <Input
                placeholder="关联计划ID（可选，可稍后在素材列表补关联）"
                value={uploadCampaignId}
                onChange={(e) => setUploadCampaignId(e.target.value)}
                allowClear
              />
            </Col>
            <Col xs={24} sm={8}>
              <Input
                placeholder="素材标题（可选）"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                allowClear
              />
            </Col>
          </Row>
          <Dragger
            multiple
            fileList={fileList.map((f, i) => ({ uid: String(i), name: f.name, size: f.size })) as any}
            beforeUpload={(file) => {
              const ext = ('.' + (file.name.split('.').pop() || '')).toLowerCase()
              const MB = 1024 * 1024
              if (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'].includes(ext) && file.size > 10 * MB) {
                message.error(`${file.name}：图片不能超过 10MB`)
                return Upload.LIST_IGNORE
              }
              if (['.mp4', '.mov', '.webm', '.m4v'].includes(ext) && file.size > 200 * MB) {
                message.error(`${file.name}：视频不能超过 200MB，请先压缩后再上传`)
                return Upload.LIST_IGNORE
              }
              if (ext === '.zip' && file.size > 500 * MB) {
                message.error(`${file.name}：压缩包不能超过 500MB，请拆分后分批上传`)
                return Upload.LIST_IGNORE
              }
              setFileList((prev) => [...prev, file])
              return false
            }}
            onRemove={(file) => { setFileList((prev) => prev.filter((_, i) => String(i) !== file.uid)); return true }}
            accept=".jpg,.jpeg,.png,.webp,.gif,.bmp,.mp4,.mov,.webm,.m4v,.zip"
          >
            <p className="ant-upload-drag-icon"><InboxOutlined style={{ fontSize: 48, color: 'var(--color-brand-primary)' }} /></p>
            <p style={{ color: 'var(--color-text-primary)' }}>点击或拖拽上传素材，支持多选与 zip 压缩包</p>
            <p style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-text-tertiary)' }}>
              图片 ≤10MB（jpg/png/webp/gif）；视频 ≤200MB（mp4/mov/webm，上传后自动压缩）；zip ≤500MB（自动拆出包内素材）
            </p>
          </Dragger>
          <div style={{ marginTop: 'var(--margin-loose)', textAlign: 'center' }}>
            <Button type="primary" size="large" loading={uploading} disabled={fileList.length === 0 || !uploadChannel} onClick={handleUpload}>
              上传 {fileList.length > 0 ? `${fileList.length} 个文件` : ''}
            </Button>
          </div>
        </Card>
      ),
    },
    {
      key: 'list',
      label: <Space><PictureOutlined />素材列表</Space>,
      children: (
        <Card style={CARD_BASE} bodyStyle={{ padding: '20px 24px' }}>
          <Row gutter={[16, 16]} style={{ marginBottom: 'var(--margin-loose)' }}>
            <Col xs={24} sm={8} md={6}>
              <Select
                style={{ width: '100%' }}
                placeholder="按状态筛选"
                allowClear
                value={filterStatus}
                onChange={(v) => { setFilterStatus(v); setPage(1) }}
                options={Object.entries(STATUS_META).map(([value, m]) => ({ label: m.label, value }))}
              />
            </Col>
            <Col xs={24} sm={8} md={6}>
              <Input placeholder="按计划ID筛选" value={filterCampaignId} onChange={(e) => { setFilterCampaignId(e.target.value); setPage(1) }} allowClear />
            </Col>
            <Col xs={24} sm={8} md={6}>
              <Button icon={<ReloadOutlined />} onClick={fetchList}>刷新</Button>
            </Col>
          </Row>
          <Table
            columns={listColumns}
            dataSource={records}
            rowKey="id"
            loading={loading}
            scroll={{ x: 1100 }}
            pagination={{ current: page, pageSize, total, showSizeChanger: true, pageSizeOptions: [10, 20, 50], onChange: (p, s) => { setPage(p); if (s) setPageSize(s) }, showTotal: (t) => `共 ${t} 条` }}
            locale={{ emptyText: <Empty description="暂无素材，请先上传" /> }}
          />
        </Card>
      ),
    },
    ...(isAdmin ? [{
      key: 'review',
      label: (
        <Badge count={reviewTotal} size="small" offset={[8, 0]}>
          <Space><CheckOutlined />审核队列</Space>
        </Badge>
      ),
      children: (
        <Card style={CARD_BASE} bodyStyle={{ padding: '20px 24px' }}>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-text-tertiary)' }}>
              待审核素材（视频压缩完成后才会出现在这里）
            </span>
            <Button icon={<ReloadOutlined />} onClick={fetchReviewQueue}>刷新</Button>
          </div>
          <Table
            columns={reviewColumns as any}
            dataSource={reviewRecords}
            rowKey="id"
            loading={reviewLoading}
            scroll={{ x: 1000 }}
            pagination={{ current: reviewPage, pageSize: 12, total: reviewTotal, onChange: (p) => setReviewPage(p), showTotal: (t) => `共 ${t} 条` }}
            locale={{ emptyText: <Empty description="没有待审核的素材" /> }}
          />
        </Card>
      ),
    }] : []),
  ]

  return (
    <div>
      <div style={{ marginBottom: 'var(--margin-loose)' }}>
        <h1 style={{ fontSize: 'var(--font-size-extra-large)', fontWeight: 'var(--font-weight-medium)', margin: 0 }}>
          素材管理
        </h1>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems as any} destroyInactiveTabPane={false} />

      {/* 预览弹窗 */}
      <Modal
        open={!!previewTarget}
        title={previewTarget?.title || previewTarget?.filename}
        footer={null}
        onCancel={() => setPreviewTarget(null)}
        width="min(760px, 92vw)"
        destroyOnClose
      >
        {previewTarget && (
          previewTarget.mediaType === 'image' ? (
            <img src={creativeService.fileUrl(previewTarget.storedName)} style={{ width: '100%', borderRadius: 8 }} alt={previewTarget.filename} />
          ) : (
            <video src={creativeService.fileUrl(previewTarget.storedName)} style={{ width: '100%', borderRadius: 8 }} controls autoPlay />
          )
        )}
      </Modal>

      {/* 关联计划弹窗 */}
      <Modal
        open={!!linkTarget}
        title={`关联计划 - ${linkTarget?.title || linkTarget?.filename || ''}`}
        onOk={handleLinkSave}
        onCancel={() => setLinkTarget(null)}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <div style={{ marginBottom: 8, fontSize: 'var(--font-size-small)', color: 'var(--color-text-tertiary)' }}>
          素材渠道：{linkTarget?.channel}。填入该渠道下的计划ID；留空则取消关联。
        </div>
        <Input
          placeholder="计划ID"
          value={linkCampaignId}
          onChange={(e) => setLinkCampaignId(e.target.value)}
          onPressEnter={handleLinkSave}
          allowClear
        />
      </Modal>

      {/* 驳回弹窗 */}
      <Modal
        open={!!rejectTarget}
        title={`驳回素材 - ${rejectTarget?.filename || ''}`}
        onOk={handleReject}
        onCancel={() => setRejectTarget(null)}
        okText="确认驳回"
        okButtonProps={{ danger: true }}
        cancelText="取消"
        destroyOnClose
      >
        <Input.TextArea
          rows={3}
          placeholder="请填写驳回原因（必填，上传人可见）"
          value={rejectComment}
          onChange={(e) => setRejectComment(e.target.value)}
        />
      </Modal>

      {/* 效果抽屉 */}
      <Drawer
        open={!!perfTarget}
        title={`素材投放效果 - ${perfTarget?.title || perfTarget?.filename || ''}`}
        onClose={() => setPerfTarget(null)}
        width="min(720px, 94vw)"
      >
        {perfLoading ? (
          <Empty description="加载中..." style={{ padding: '60px 0' }} />
        ) : perfData?.message ? (
          <Empty description={perfData.message} style={{ padding: '60px 0' }} />
        ) : perfData && perfData.campaigns.length > 0 ? (
          <div>
            <div style={{ marginBottom: 16, fontSize: 'var(--font-size-small)', color: 'var(--color-text-tertiary)' }}>
              统计范围：{perfData.dateRange.startDate} ~ {perfData.dateRange.endDate}（默认近 30 天）
            </div>
            {perfData.campaigns.map((c) => (
              <Card key={c.campaignId} size="small" style={{ ...CARD_BASE, marginBottom: 16 }} title={`计划 ${c.campaignId}（${c.channel}）`}>
                <Descriptions column={{ xs: 2, sm: 3 }} size="small">
                  <Descriptions.Item label="消耗">¥{formatNumber(c.cost)}</Descriptions.Item>
                  <Descriptions.Item label="曝光">{formatNumber(c.impressions)}</Descriptions.Item>
                  <Descriptions.Item label="点击">{formatNumber(c.clicks)}</Descriptions.Item>
                  <Descriptions.Item label="CTR">{(c.ctr * 100).toFixed(2)}%</Descriptions.Item>
                  <Descriptions.Item label="下载">{formatNumber(c.downloads)}</Descriptions.Item>
                  <Descriptions.Item label="激活">{formatNumber(c.activations)}</Descriptions.Item>
                  <Descriptions.Item label="转正">{formatNumber(c.formalActivations)}</Descriptions.Item>
                  <Descriptions.Item label="留资">{formatNumber(c.leads)}</Descriptions.Item>
                  <Descriptions.Item label="开户">{formatNumber(c.accounts)}</Descriptions.Item>
                  <Descriptions.Item label="CPA">¥{formatNumber(c.cpa)}</Descriptions.Item>
                  <Descriptions.Item label="ROI">{c.roi.toFixed(3)}</Descriptions.Item>
                </Descriptions>
              </Card>
            ))}
          </div>
        ) : (
          <Empty description="关联计划在近 30 天暂无投放数据" style={{ padding: '60px 0' }} />
        )}
      </Drawer>
    </div>
  )
}

export default CreativeManagement
