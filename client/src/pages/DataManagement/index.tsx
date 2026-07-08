import React, { useEffect, useState, useCallback } from 'react'
import {
  Card,
  Upload,
  Button,
  Table,
  message,
  Spin,
  Row,
  Col,
  Select,
  DatePicker,
  Input,
  Pagination,
  Tag,
  Modal,
  Empty,
  Space,
  Tabs,
  Form,
  Popconfirm,
} from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  SettingOutlined,
  DeleteOutlined,
  HistoryOutlined,
  DownloadOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { dataManageService } from '@services/dataManageService'
import { CARD_BASE } from '@utils/constants'
import { exportToExcel } from '@utils/export'
import { useAuthStore } from '@stores/authStore'
import { RawData, UploadLog, ChannelMapping } from '@/types'

const { Dragger } = Upload
const { RangePicker } = DatePicker

const DataManagement: React.FC = () => {
  const { isAdmin, user } = useAuthStore()

  // ===== 转化表上传 =====
  const [convFile, setConvFile] = useState<File | null>(null)
  const [convUploading, setConvUploading] = useState(false)
  const [convResult, setConvResult] = useState<{ filename: string; totalRecords: number; insertedCount: number; updatedCount: number } | null>(null)

  // ===== 媒体表上传 =====
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaChannel, setMediaChannel] = useState<string | undefined>()
  const [mediaUploading, setMediaUploading] = useState(false)
  const [mediaResult, setMediaResult] = useState<any>(null)

  // ===== 旧版上传 =====
  const [oldMediaFile, setOldMediaFile] = useState<File | null>(null)
  const [oldConvFile, setOldConvFile] = useState<File | null>(null)
  const [oldUploading, setOldUploading] = useState(false)
  const [oldUploadResult, setOldUploadResult] = useState<any>(null)
  const [uploadError, setUploadError] = useState<any>(null)
  const [uploadErrorVisible, setUploadErrorVisible] = useState(false)

  // ===== 数据列表 =====
  const [records, setRecords] = useState<RawData[]>([])
  const [recordsTotal, setRecordsTotal] = useState(0)
  const [recordsPage, setRecordsPage] = useState(1)
  const [recordsPageSize, setRecordsPageSize] = useState(50)
  const [recordsLoading, setRecordsLoading] = useState(false)

  const [channels, setChannels] = useState<string[]>([])
  const [filterChannel, setFilterChannel] = useState<string | undefined>()
  const [filterDateRange, setFilterDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null)
  const [filterCampaignId, setFilterCampaignId] = useState('')

  const [logs, setLogs] = useState<UploadLog[]>([])
  const [logsTotal, setLogsTotal] = useState(0)
  const [logsPage, setLogsPage] = useState(1)
  const [logsPageSize, setLogsPageSize] = useState(10)
  const [logsLoading, setLogsLoading] = useState(false)
  const [logsVisible, setLogsVisible] = useState(false)

  const [mappings, setMappings] = useState<ChannelMapping[]>([])
  const [mappingForm] = Form.useForm()

  const [queryTrigger, setQueryTrigger] = useState(0)

  // 获取用户可访问的渠道列表
  const getUserChannels = useCallback((): string[] => {
    if (isAdmin) return []
    try {
      if (user?.permittedChannels) {
        return JSON.parse(user.permittedChannels)
      }
    } catch {}
    return []
  }, [isAdmin, user?.permittedChannels])

  const fetchChannels = useCallback(async () => {
    try {
      const list = await dataManageService.getChannels()
      setChannels(list)
      // 非管理员默认选中自己的第一个渠道
      if (!isAdmin && !filterChannel) {
        const userChs = getUserChannels()
        if (userChs.length > 0 && !filterChannel) {
          setFilterChannel(userChs[0])
        }
      }
    } catch (e) {
      console.error('Fetch channels error:', e)
    }
  }, [isAdmin, getUserChannels, filterChannel])

  const fetchRecords = useCallback(async () => {
    setRecordsLoading(true)
    try {
      const params: any = { page: recordsPage, pageSize: recordsPageSize }
      if (filterChannel) params.channel = filterChannel
      if (filterDateRange?.[0] && filterDateRange?.[1]) {
        params.startDate = filterDateRange[0].format('YYYY-MM-DD')
        params.endDate = filterDateRange[1].format('YYYY-MM-DD')
      }
      if (filterCampaignId) params.campaignId = filterCampaignId
      const res = await dataManageService.getRecords(params)
      setRecords(res.records)
      setRecordsTotal(res.total)
    } catch (e) {
      message.error('获取数据列表失败')
    } finally {
      setRecordsLoading(false)
    }
  }, [recordsPage, recordsPageSize, filterChannel, filterDateRange, filterCampaignId, queryTrigger])

  const fetchMappings = useCallback(async () => {
    try {
      const rows = await dataManageService.getChannelMappings()
      setMappings(rows)
    } catch (e) {
      console.error('Fetch mappings error:', e)
    }
  }, [])

  const fetchUploadLogs = useCallback(async () => {
    setLogsLoading(true)
    try {
      const res = await dataManageService.getUploadLogs({ page: logsPage, pageSize: logsPageSize })
      setLogs(res.logs)
      setLogsTotal(res.total)
    } catch (e) {
      console.error('Fetch upload logs error:', e)
      message.error('获取上传历史失败')
    } finally {
      setLogsLoading(false)
    }
  }, [logsPage, logsPageSize])

  useEffect(() => { fetchChannels() }, [fetchChannels])
  useEffect(() => { fetchRecords() }, [fetchRecords])
  useEffect(() => { fetchMappings() }, [fetchMappings])
  useEffect(() => { if (logsVisible) fetchUploadLogs() }, [logsVisible, fetchUploadLogs])

  // ===== 新版：上传转化数据表 =====
  const handleConvUpload = async () => {
    if (!convFile) {
      message.warning('请选择转化数据表文件')
      return
    }
    setConvUploading(true)
    try {
      const result = await dataManageService.uploadConvFile(convFile)
      setConvResult(result)
      message.success(`转化数据上传成功！共 ${result.totalRecords} 条，新增 ${result.insertedCount} 条，更新 ${result.updatedCount} 条`)
      setConvFile(null)
    } catch (e: any) {
      message.error(`上传失败: ${e.message || '未知错误'}`)
    } finally {
      setConvUploading(false)
    }
  }

  // ===== 新版：按渠道上传媒体表 =====
  const handleMediaUpload = async () => {
    if (!mediaFile) {
      message.warning('请选择媒体数据表文件')
      return
    }
    if (!mediaChannel) {
      message.warning('请先选择渠道')
      return
    }
    setMediaUploading(true)
    try {
      const result = await dataManageService.uploadMediaFile(mediaFile, mediaChannel)
      setMediaResult(result)
      message.success(
        `媒体数据上传成功！共 ${result.totalRecords} 条，匹配 ${result.matchedCount} 条，新增 ${result.insertedCount} 条，更新 ${result.updatedCount} 条`
      )
      fetchRecords()
      fetchChannels()
      setMediaFile(null)
    } catch (e: any) {
      message.error(`上传失败: ${e.message || '未知错误'}`)
    } finally {
      setMediaUploading(false)
    }
  }

  const handleDownloadMediaTemplate = () => {
    const headers = ['日期', '计划ID', '品种/名称', '展示', '点击', '花费', '下载']
    const rows = [
      ['2026-07-01', '2143573311', '品牌词', '943', '197', '6297.58', '147'],
      ['2026-07-01', '2143573500', '同花顺', '1585', '65', '1513.57', '42'],
    ]
    const csv = `\uFEFF${[headers, ...rows].map((row) => row.join(',')).join('\n')}`
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = '媒体表模板.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  // ===== 旧版：双文件上传 =====
  const handleOldUpload = async () => {
    if (!oldMediaFile || !oldConvFile) {
      message.warning('请同时上传媒体数据表和转化数据表')
      return
    }
    setOldUploading(true)
    setUploadError(null)
    try {
      const result = await dataManageService.uploadFiles(oldMediaFile, oldConvFile)
      setOldUploadResult(result)
      message.success(`上传成功！匹配 ${result.totalRecords} 条，新增 ${result.insertedCount} 条，更新 ${result.updatedCount} 条`)
      fetchRecords()
      fetchChannels()
      setOldMediaFile(null)
      setOldConvFile(null)
    } catch (e: any) {
      const errData = e.responseData
      if (errData?.data?.diagnosis) {
        setUploadError(errData)
        setUploadErrorVisible(true)
      }
      message.error(`上传失败: ${e.message || '未知错误'}`)
    } finally {
      setOldUploading(false)
    }
  }

  const handleAddMapping = async (values: { sourceName: string; targetName: string }) => {
    try {
      await dataManageService.createChannelMapping(values.sourceName, values.targetName)
      message.success('映射规则已保存')
      mappingForm.resetFields()
      fetchMappings()
    } catch (e) {
      message.error('保存失败')
    }
  }

  const handleDeleteMapping = async (id: number) => {
    try {
      await dataManageService.deleteChannelMapping(id)
      message.success('已删除')
      fetchMappings()
    } catch (e) {
      message.error('删除失败')
    }
  }

  const handleRollback = async (id: number) => {
    try {
      const result = await dataManageService.rollbackUpload(id)
      message.success(result.message)
      fetchUploadLogs()
      fetchRecords()
      fetchChannels()
    } catch (e: any) {
      message.error(`撤销失败: ${e.message || '未知错误'}`)
    }
  }

  // 动态构建列（非管理员隐藏 leads/accounts）
  const recordColumns = [
    { title: '渠道', dataIndex: 'channel', key: 'channel', width: 100 },
    { title: '日期', dataIndex: 'recordDate', key: 'recordDate', width: 120 },
    { title: '计划ID', dataIndex: 'campaignId', key: 'campaignId', width: 160 },
    { title: '品种/名称', dataIndex: 'campaignName', key: 'campaignName', width: 280, render: (v: string | null) => v || '-' },
    { title: '曝光', dataIndex: 'impressions', key: 'impressions', align: 'right' as const, render: (v: number) => <span className="font-number">{v.toLocaleString()}</span> },
    { title: '点击', dataIndex: 'clicks', key: 'clicks', align: 'right' as const, render: (v: number) => <span className="font-number">{v.toLocaleString()}</span> },
    { title: 'CTR', dataIndex: 'ctr', key: 'ctr', align: 'right' as const, render: (v: number) => <span className="font-number">{(v * 100).toFixed(2)}%</span> },
    { title: '花费', dataIndex: 'cost', key: 'cost', align: 'right' as const, render: (v: number) => <span className="font-number">¥{v.toLocaleString()}</span> },
    { title: '下载', dataIndex: 'downloads', key: 'downloads', align: 'right' as const, render: (v: number) => <span className="font-number">{v.toLocaleString()}</span> },
    { title: '激活', dataIndex: 'activations', key: 'activations', align: 'right' as const, render: (v: number) => <span className="font-number">{v.toLocaleString()}</span> },
    { title: '转正', dataIndex: 'formalActivations', key: 'formalActivations', align: 'right' as const, render: (v: number) => <span className="font-number">{v.toLocaleString()}</span> },
    ...(isAdmin ? [
      { title: '留资', dataIndex: 'leads', key: 'leads', align: 'right' as const, render: (v: number) => <span className="font-number">{v.toLocaleString()}</span> },
      { title: '开户', dataIndex: 'accounts', key: 'accounts', align: 'right' as const, render: (v: number) => <span className="font-number">{v.toLocaleString()}</span> },
    ] : []),
  ]

  const logColumns = [
    { title: '文件名', dataIndex: 'filename', key: 'filename' },
    { title: '总记录', dataIndex: 'recordCount', key: 'recordCount', align: 'right' as const, render: (v: number) => <span className="font-number">{v}</span> },
    { title: '新增', dataIndex: 'insertedCount', key: 'insertedCount', align: 'right' as const, render: (v: number) => <Tag color="green"><span className="font-number">+{v}</span></Tag> },
    { title: '更新', dataIndex: 'updatedCount', key: 'updatedCount', align: 'right' as const, render: (v: number) => <Tag color="blue"><span className="font-number">{v}</span></Tag> },
    { title: '失败', dataIndex: 'failedCount', key: 'failedCount', align: 'right' as const, render: (v: number) => v > 0 ? <Tag color="red"><span className="font-number">{v}</span></Tag> : <span className="font-number">{v}</span> },
    { title: '上传人', dataIndex: 'uploadedBy', key: 'uploadedBy', render: (v: string) => v || '-' },
    { title: '上传时间', dataIndex: 'uploadedAt', key: 'uploadedAt', render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm:ss') },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: UploadLog) => (
        record.errorDetails?.startsWith('已撤销')
          ? <Tag color="default">已撤销</Tag>
          : isAdmin ? (
            <Popconfirm
              title="确定撤销本次上传？"
              description="这将删除本次上传首次创建的所有数据，不可恢复。"
              okButtonProps={{ danger: true }}
              onConfirm={() => handleRollback(record.id)}
              okText="撤销"
              cancelText="取消"
            >
              <Button type="link" danger size="small">撤销</Button>
            </Popconfirm>
          ) : null
      ),
    },
  ]

  // 构建动态 tab 项
  const tabItems = [
    // 管理员：转化数据上传 tab
    ...(isAdmin ? [{
      key: 'conv-upload',
      label: (
        <Space>
          <FileTextOutlined />
          转化数据上传
        </Space>
      ),
      children: (
        <Spin spinning={convUploading} tip="正在解析并入库...">
          <Card style={CARD_BASE} bodyStyle={{ padding: '20px 24px' }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 16 }}>
              上传转化数据表（端内数据表）
            </div>
            <div style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-text-tertiary)', marginBottom: 16 }}>
              转化数据表作为各渠道媒体表匹配的基底，可随时重新上传覆盖。
              包含字段：渠道、日期、计划ID、激活、转正、留资、开户
            </div>
            <Dragger
              beforeUpload={(file) => { setConvFile(file); return false }}
              accept=".xlsx,.xls,.csv"
              showUploadList={false}
            >
              <p className="ant-upload-drag-icon"><FileTextOutlined style={{ fontSize: 48, color: 'var(--color-brand-primary)' }} /></p>
              <p style={{ color: 'var(--color-text-primary)' }}>
                {convFile ? convFile.name : '点击或拖拽上传转化数据表'}
              </p>
              <p style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-text-tertiary)' }}>
                支持 .xlsx / .xls / .csv
              </p>
            </Dragger>

            <div style={{ marginTop: 'var(--margin-loose)', textAlign: 'center' }}>
              <Button type="primary" size="large" onClick={handleConvUpload} disabled={!convFile}>
                上传转化数据
              </Button>
            </div>

            {convResult && (
              <Card style={{ ...CARD_BASE, marginTop: 'var(--margin-loose)', backgroundColor: 'var(--color-background-secondary)' }} bodyStyle={{ padding: '24px' }}>
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={8}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 28, fontFamily: 'var(--font-family-number)', fontWeight: 'bold', color: 'var(--color-brand-primary)' }}>
                        {convResult.totalRecords}
                      </div>
                      <div style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-text-secondary)' }}>总记录数</div>
                    </div>
                  </Col>
                  <Col xs={24} sm={8}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 28, fontFamily: 'var(--font-family-number)', fontWeight: 'bold', color: 'var(--color-data-green)' }}>
                        +{convResult.insertedCount}
                      </div>
                      <div style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-text-secondary)' }}>新增</div>
                    </div>
                  </Col>
                  <Col xs={24} sm={8}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 28, fontFamily: 'var(--font-family-number)', fontWeight: 'bold', color: 'var(--color-data-blue)' }}>
                        {convResult.updatedCount}
                      </div>
                      <div style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-text-secondary)' }}>更新</div>
                    </div>
                  </Col>
                </Row>
              </Card>
            )}
          </Card>
        </Spin>
      ),
    }] : []),
    // 媒体数据上传 tab（所有登录用户）
    {
      key: 'media-upload',
      label: (
        <Space>
          <FileExcelOutlined />
          媒体数据上传
        </Space>
      ),
      children: (
        <Spin spinning={mediaUploading} tip="正在解析匹配并入库...">
          <Row gutter={[24, 24]}>
            <Col xs={24} md={8}>
              <Card style={CARD_BASE} bodyStyle={{ padding: '20px 24px' }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 16 }}>
                  选择渠道
                </div>
                <Select
                  style={{ width: '100%' }}
                  placeholder="请先选择要上传的渠道"
                  value={mediaChannel}
                  onChange={setMediaChannel}
                  options={channels.map((c) => ({ label: c, value: c }))}
                />
                <div style={{ marginTop: 8, fontSize: 'var(--font-size-small)', color: 'var(--color-text-tertiary)' }}>
                  选择渠道后上传该渠道的媒体数据表
                </div>
              </Card>
            </Col>
            <Col xs={24} md={16}>
              <Card style={CARD_BASE} bodyStyle={{ padding: '20px 24px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 16,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                    上传 {mediaChannel || '...'} 的媒体数据表
                  </div>
                  <Button icon={<DownloadOutlined />} onClick={handleDownloadMediaTemplate}>
                    模板下载
                  </Button>
                </div>
                <Dragger
                  beforeUpload={(file) => { setMediaFile(file); return false }}
                  accept=".xlsx,.xls,.csv"
                  showUploadList={false}
                  disabled={!mediaChannel}
                >
                  <p className="ant-upload-drag-icon"><FileExcelOutlined style={{ fontSize: 48, color: mediaChannel ? 'var(--color-brand-primary)' : '#d9d9d9' }} /></p>
                  <p style={{ color: mediaChannel ? 'var(--color-text-primary)' : '#d9d9d9' }}>
                    {mediaFile ? mediaFile.name : mediaChannel ? '点击或拖拽上传媒体数据表' : '请先选择渠道'}
                  </p>
                  <p style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-text-tertiary)' }}>
                    支持 .xlsx / .xls / .csv
                  </p>
                </Dragger>
              </Card>
            </Col>
          </Row>

          <div style={{ marginTop: 'var(--margin-loose)', textAlign: 'center' }}>
            <Button type="primary" size="large" onClick={handleMediaUpload} disabled={!mediaFile || !mediaChannel}>
              开始匹配并入库
            </Button>
          </div>

          {mediaResult && (
            <Card style={{ ...CARD_BASE, marginTop: 'var(--margin-loose)', backgroundColor: 'var(--color-background-secondary)' }} bodyStyle={{ padding: '24px' }}>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={6}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontFamily: 'var(--font-family-number)', fontWeight: 'bold', color: 'var(--color-brand-primary)' }}>
                      {mediaResult.totalRecords}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-text-secondary)' }}>总记录数</div>
                  </div>
                </Col>
                <Col xs={24} sm={6}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontFamily: 'var(--font-family-number)', fontWeight: 'bold', color: 'var(--color-data-purple)' }}>
                      {mediaResult.matchedCount}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-text-secondary)' }}>匹配成功</div>
                  </div>
                </Col>
                <Col xs={24} sm={6}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontFamily: 'var(--font-family-number)', fontWeight: 'bold', color: 'var(--color-data-green)' }}>
                      +{mediaResult.insertedCount}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-text-secondary)' }}>新增</div>
                  </div>
                </Col>
                <Col xs={24} sm={6}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontFamily: 'var(--font-family-number)', fontWeight: 'bold', color: 'var(--color-data-blue)' }}>
                      {mediaResult.updatedCount}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-text-secondary)' }}>更新</div>
                  </div>
                </Col>
              </Row>
              {mediaResult.unmatchedCount > 0 && (
                <div style={{ marginTop: 'var(--margin-base)', textAlign: 'center', fontSize: 'var(--font-size-small)', color: 'var(--color-data-orange)' }}>
                  未匹配 {mediaResult.unmatchedCount} 条（转化表中无对应数据）
                </div>
              )}
            </Card>
          )}
        </Spin>
      ),
    },
    // 旧版双文件上传（保留兼容）
    {
      key: 'old-upload',
      label: (
        <Space>
          <UploadOutlined />
          双文件上传（旧版）
        </Space>
      ),
      children: (
        <Spin spinning={oldUploading} tip="正在解析匹配并入库...">
          <Row gutter={[24, 24]}>
            <Col xs={24} md={12}>
              <Card style={CARD_BASE} bodyStyle={{ padding: '20px 24px' }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 16 }}>
                  媒体数据表
                </div>
                <Dragger
                  beforeUpload={(file) => { setOldMediaFile(file); return false }}
                  accept=".xlsx,.xls,.csv"
                  showUploadList={false}
                >
                  <p className="ant-upload-drag-icon"><FileExcelOutlined style={{ fontSize: 48, color: 'var(--color-brand-primary)' }} /></p>
                  <p style={{ color: 'var(--color-text-primary)' }}>
                    {oldMediaFile ? oldMediaFile.name : '点击或拖拽上传媒体数据表'}
                  </p>
                </Dragger>
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card style={CARD_BASE} bodyStyle={{ padding: '20px 24px' }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 16 }}>
                  转化数据表
                </div>
                <Dragger
                  beforeUpload={(file) => { setOldConvFile(file); return false }}
                  accept=".xlsx,.xls,.csv"
                  showUploadList={false}
                >
                  <p className="ant-upload-drag-icon"><FileTextOutlined style={{ fontSize: 48, color: 'var(--color-brand-primary)' }} /></p>
                  <p style={{ color: 'var(--color-text-primary)' }}>
                    {oldConvFile ? oldConvFile.name : '点击或拖拽上传转化数据表'}
                  </p>
                </Dragger>
              </Card>
            </Col>
          </Row>

          <div style={{ marginTop: 'var(--margin-loose)', textAlign: 'center' }}>
            <Button type="primary" size="large" onClick={handleOldUpload} disabled={!oldMediaFile || !oldConvFile}>
              开始匹配并入库
            </Button>
          </div>

          {oldUploadResult && (
            <Card style={{ ...CARD_BASE, marginTop: 'var(--margin-loose)', backgroundColor: 'var(--color-background-secondary)' }} bodyStyle={{ padding: '24px' }}>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={8}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontFamily: 'var(--font-family-number)', fontWeight: 'bold', color: 'var(--color-brand-primary)' }}>
                      {oldUploadResult.totalRecords}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-text-secondary)' }}>匹配成功</div>
                  </div>
                </Col>
                <Col xs={24} sm={8}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontFamily: 'var(--font-family-number)', fontWeight: 'bold', color: 'var(--color-data-green)' }}>
                      +{oldUploadResult.insertedCount}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-text-secondary)' }}>新增</div>
                  </div>
                </Col>
                <Col xs={24} sm={8}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontFamily: 'var(--font-family-number)', fontWeight: 'bold', color: 'var(--color-data-blue)' }}>
                      {oldUploadResult.updatedCount}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-text-secondary)' }}>更新</div>
                  </div>
                </Col>
              </Row>
            </Card>
          )}
        </Spin>
      ),
    },
    // 渠道映射 tab
    {
      key: 'mapping',
      label: (
        <Space>
          <SettingOutlined />
          渠道映射
        </Space>
      ),
      children: (
        <>
          <Card style={{ ...CARD_BASE, marginBottom: 'var(--margin-loose)' }} bodyStyle={{ padding: '20px 24px' }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 16 }}>
              添加渠道名称映射规则
            </div>
            <Form form={mappingForm} layout="vertical" onFinish={handleAddMapping}>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={8}>
                  <Form.Item name="sourceName" rules={[{ required: true, message: '请输入来源名称' }]}>
                    <Input placeholder="来源名称（如 mi）" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item name="targetName" rules={[{ required: true, message: '请输入目标名称' }]}>
                    <Input placeholder="目标名称（如 xiaomi）" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" style={{ width: '100%' }}>添加映射</Button>
                  </Form.Item>
                </Col>
              </Row>
            </Form>
            <div style={{ marginTop: 'var(--margin-base)', fontSize: 'var(--font-size-small)', color: 'var(--color-text-tertiary)' }}>
              系统会自动将转化表中的来源名称替换为目标名称，再与媒体表进行匹配。
            </div>
          </Card>

          <Card style={CARD_BASE} bodyStyle={{ padding: '20px 24px' }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 16 }}>
              现有映射规则
            </div>
            <Table
              dataSource={mappings}
              rowKey="id"
              pagination={false}
              columns={[
                { title: '来源名称', dataIndex: 'sourceName', key: 'sourceName' },
                { title: '目标名称', dataIndex: 'targetName', key: 'targetName' },
                { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm') },
                {
                  title: '操作',
                  key: 'action',
                  render: (_: any, record: ChannelMapping) => (
                    <Popconfirm title="确定删除这条映射规则？" onConfirm={() => handleDeleteMapping(record.id)} okButtonProps={{ danger: true }}>
                      <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
                    </Popconfirm>
                  ),
                },
              ]}
              locale={{ emptyText: <Empty description="暂无映射规则" /> }}
            />
          </Card>
        </>
      ),
    },
    // 数据列表 tab
    {
      key: 'records',
      label: (
        <Space>
          <SearchOutlined />
          数据列表
        </Space>
      ),
      children: (
        <Card style={CARD_BASE} bodyStyle={{ padding: '20px 24px' }}>
          <Row gutter={[16, 16]} style={{ marginBottom: 'var(--margin-loose)' }}>
            <Col xs={24} sm={8} md={6}>
              <Select style={{ width: '100%' }} placeholder="选择渠道" allowClear value={filterChannel} onChange={setFilterChannel}>
                {channels.map((c) => <Select.Option key={c} value={c}>{c}</Select.Option>)}
              </Select>
            </Col>
            <Col xs={24} sm={8} md={6}>
              <RangePicker style={{ width: '100%' }} value={filterDateRange as any} onChange={(dates) => setFilterDateRange(dates as any)} />
            </Col>
            <Col xs={24} sm={8} md={6}>
              <Input placeholder="计划ID" value={filterCampaignId} onChange={(e) => setFilterCampaignId(e.target.value)} prefix={<SearchOutlined />} allowClear />
            </Col>
            <Col xs={24} sm={8} md={6}>
              <Space>
                <Button type="primary" icon={<SearchOutlined />} onClick={() => { setRecordsPage(1); setQueryTrigger(c => c + 1) }}>查询</Button>
                <Button icon={<ReloadOutlined />} onClick={() => { setFilterChannel(undefined); setFilterDateRange(null); setFilterCampaignId(''); setRecordsPage(1); setQueryTrigger(c => c + 1) }}>重置</Button>
                <Button icon={<DownloadOutlined />} onClick={() => exportToExcel(records, recordColumns, `数据列表_${dayjs().format('YYYY-MM-DD')}`)} disabled={records.length === 0}>导出</Button>
              </Space>
            </Col>
          </Row>

          <Spin spinning={recordsLoading}>
            <Table
              columns={recordColumns}
              dataSource={records}
              rowKey={(r) => `${r.channel}-${r.recordDate}-${r.campaignId}`}
              pagination={false}
              scroll={{ x: 1600, y: 480 }}
              locale={{ emptyText: <Empty description="暂无数据，请先上传 Excel 文件" /> }}
            />
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <Pagination
                current={recordsPage}
                pageSize={recordsPageSize}
                total={recordsTotal}
                showSizeChanger
                pageSizeOptions={[50, 100, 200]}
                onChange={(page, size) => { setRecordsPage(page); if (size) setRecordsPageSize(size) }}
                showTotal={(total) => `共 ${total} 条`}
              />
            </div>
          </Spin>
        </Card>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--margin-loose)' }}>
        <h1 style={{ fontSize: 'var(--font-size-extra-large)', fontWeight: 'var(--font-weight-medium)', margin: 0 }}>
          数据管理
        </h1>
        <Button icon={<HistoryOutlined />} onClick={() => setLogsVisible(true)}>
          上传历史
        </Button>
      </div>

      <Tabs
        defaultActiveKey={isAdmin ? 'conv-upload' : 'media-upload'}
        items={tabItems}
        destroyInactiveTabPane={false}
      />

      <Modal title="上传历史" open={logsVisible} onCancel={() => setLogsVisible(false)} footer={null} width="min(800px, 92vw)">
        <Spin spinning={logsLoading}>
          <Table
            columns={logColumns}
            dataSource={logs}
            rowKey="id"
            pagination={{
              current: logsPage,
              pageSize: logsPageSize,
              total: logsTotal,
              onChange: (page, size) => { setLogsPage(page); if (size) setLogsPageSize(size) },
            }}
            locale={{ emptyText: <Empty description="暂无上传记录" /> }}
          />
        </Spin>
      </Modal>

      <Modal
        title="上传失败诊断"
        open={uploadErrorVisible}
        onCancel={() => setUploadErrorVisible(false)}
        footer={<Button onClick={() => setUploadErrorVisible(false)}>关闭</Button>}
        width={640}
      >
        {uploadError?.data?.diagnosis && (
          <div>
            <div style={{ marginBottom: 16, padding: 12, backgroundColor: 'var(--color-background-secondary)', borderRadius: 'var(--radius-large)' }}>
              <strong>建议：</strong>{uploadError.data.diagnosis.suggestion}
            </div>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Card size="small" title="媒体数据表">
                  <p><strong>解析行数：</strong>{uploadError.data.mediaRows}</p>
                  <p><strong>渠道：</strong>{uploadError.data.diagnosis.mediaChannels?.join(', ') || '无'}</p>
                  <p><strong>日期样例：</strong>{uploadError.data.diagnosis.mediaDates?.join(', ') || '无'}</p>
                  <p><strong>计划ID样例：</strong>{uploadError.data.diagnosis.mediaCampaignIds?.join(', ') || '无'}</p>
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card size="small" title="转化数据表">
                  <p><strong>解析行数：</strong>{uploadError.data.convRows}</p>
                  <p><strong>渠道：</strong>{uploadError.data.diagnosis.convChannels?.join(', ') || '无'}</p>
                  <p><strong>日期样例：</strong>{uploadError.data.diagnosis.convDates?.join(', ') || '无'}</p>
                  <p><strong>计划ID样例：</strong>{uploadError.data.diagnosis.convCampaignIds?.join(', ') || '无'}</p>
                </Card>
              </Col>
            </Row>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default DataManagement
