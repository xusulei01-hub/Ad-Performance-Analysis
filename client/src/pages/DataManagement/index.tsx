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
} from 'antd'
import {
  InboxOutlined,
  SearchOutlined,
  ReloadOutlined,
  HistoryOutlined,
  FileExcelOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { dataManageService } from '@services/dataManageService'
import { RawData, UploadLog } from '@/types'

const { Dragger } = Upload
const { RangePicker } = DatePicker

const DataManagement: React.FC = () => {
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{
    filename: string
    totalRecords: number
    insertedCount: number
    updatedCount: number
    failedCount: number
  } | null>(null)

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

  const fetchChannels = useCallback(async () => {
    try {
      const list = await dataManageService.getChannels()
      setChannels(list)
    } catch (e) {
      console.error('Fetch channels error:', e)
    }
  }, [])

  const fetchRecords = useCallback(async () => {
    setRecordsLoading(true)
    try {
      const params: any = {
        page: recordsPage,
        pageSize: recordsPageSize,
      }
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
  }, [recordsPage, recordsPageSize, filterChannel, filterDateRange, filterCampaignId])

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true)
    try {
      const res = await dataManageService.getUploadLogs({
        page: logsPage,
        pageSize: logsPageSize,
      })
      setLogs(res.logs)
      setLogsTotal(res.total)
    } catch (e) {
      message.error('获取上传历史失败')
    } finally {
      setLogsLoading(false)
    }
  }, [logsPage, logsPageSize])

  useEffect(() => {
    fetchChannels()
  }, [fetchChannels])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const result = await dataManageService.uploadFile(file)
      setUploadResult({
        filename: result.filename,
        totalRecords: result.totalRecords,
        insertedCount: result.insertedCount,
        updatedCount: result.updatedCount,
        failedCount: result.failedCount,
      })
      message.success(`上传成功！新增 ${result.insertedCount} 条，更新 ${result.updatedCount} 条`)
      fetchRecords()
      fetchChannels()
    } catch (e: any) {
      message.error(`上传失败: ${e.message || '未知错误'}`)
    } finally {
      setUploading(false)
    }
    return false
  }

  const recordColumns = [
    { title: '渠道', dataIndex: 'channel', key: 'channel', width: 100 },
    { title: '日期', dataIndex: 'recordDate', key: 'recordDate', width: 120 },
    { title: '计划ID', dataIndex: 'campaignId', key: 'campaignId', width: 160 },
    { title: '品种/名称', dataIndex: 'campaignName', key: 'campaignName', width: 280 },
    {
      title: '曝光',
      dataIndex: 'impressions',
      key: 'impressions',
      align: 'right' as const,
      render: (v: number) => <span className="font-number">{v.toLocaleString()}</span>,
    },
    {
      title: '点击',
      dataIndex: 'clicks',
      key: 'clicks',
      align: 'right' as const,
      render: (v: number) => <span className="font-number">{v.toLocaleString()}</span>,
    },
    {
      title: '花费',
      dataIndex: 'cost',
      key: 'cost',
      align: 'right' as const,
      render: (v: number) => <span className="font-number">¥{v.toLocaleString()}</span>,
    },
    {
      title: '下载',
      dataIndex: 'downloads',
      key: 'downloads',
      align: 'right' as const,
      render: (v: number) => <span className="font-number">{v.toLocaleString()}</span>,
    },
    {
      title: '激活',
      dataIndex: 'activations',
      key: 'activations',
      align: 'right' as const,
      render: (v: number) => <span className="font-number">{v.toLocaleString()}</span>,
    },
    {
      title: '授信',
      dataIndex: 'credits',
      key: 'credits',
      align: 'right' as const,
      render: (v: number) => <span className="font-number">{v.toLocaleString()}</span>,
    },
    {
      title: '开户',
      dataIndex: 'accounts',
      key: 'accounts',
      align: 'right' as const,
      render: (v: number) => <span className="font-number">{v.toLocaleString()}</span>,
    },
    {
      title: 'ROI',
      dataIndex: 'roi',
      key: 'roi',
      align: 'right' as const,
      render: (v: number) => <span className="font-number">{v.toFixed(2)}</span>,
    },
  ]

  const logColumns = [
    { title: '文件名', dataIndex: 'filename', key: 'filename' },
    {
      title: '总记录',
      dataIndex: 'recordCount',
      key: 'recordCount',
      align: 'right' as const,
      render: (v: number) => <span className="font-number">{v}</span>,
    },
    {
      title: '新增',
      dataIndex: 'insertedCount',
      key: 'insertedCount',
      align: 'right' as const,
      render: (v: number) => (
        <Tag color="green">
          <span className="font-number">+{v}</span>
        </Tag>
      ),
    },
    {
      title: '更新',
      dataIndex: 'updatedCount',
      key: 'updatedCount',
      align: 'right' as const,
      render: (v: number) => (
        <Tag color="blue">
          <span className="font-number">{v}</span>
        </Tag>
      ),
    },
    {
      title: '失败',
      dataIndex: 'failedCount',
      key: 'failedCount',
      align: 'right' as const,
      render: (v: number) => (
        v > 0 ? (
          <Tag color="red">
            <span className="font-number">{v}</span>
          </Tag>
        ) : (
          <span className="font-number">{v}</span>
        )
      ),
    },
    { title: '上传人', dataIndex: 'uploadedBy', key: 'uploadedBy', render: (v: string) => v || '-' },
    {
      title: '上传时间',
      dataIndex: 'uploadedAt',
      key: 'uploadedAt',
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm:ss'),
    },
  ]

  return (
    <div>
      <h1
        style={{
          fontSize: 'var(--font-size-extra-large)',
          fontWeight: 'var(--font-weight-medium)',
          marginBottom: 'var(--margin-super-loose)',
        }}
      >
        数据管理
      </h1>

      {/* 上传区域 */}
      <Card
        title={
          <Space>
            <FileExcelOutlined />
            <span>上传 Excel 数据</span>
          </Space>
        }
        style={{
          marginBottom: 'var(--margin-super-loose)',
          borderRadius: 'var(--radius-extra-large)',
          boxShadow: 'var(--shadow-elevation-small)',
        }}
      >
        <Spin spinning={uploading} tip="正在解析上传...">
          <Dragger
            beforeUpload={handleUpload}
            accept=".xlsx,.xls"
            showUploadList={false}
            multiple={false}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined style={{ fontSize: 48, color: 'var(--color-brand-primary)' }} />
            </p>
            <p
              style={{
                fontSize: 'var(--font-size-base)',
                color: 'var(--color-text-primary)',
                marginBottom: 'var(--margin-base)',
              }}
            >
              点击或拖拽文件到此区域上传
            </p>
            <p style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-text-tertiary)' }}>
              支持 .xlsx / .xls 格式，以 (渠道, 日期, 计划ID) 自动去重
            </p>
          </Dragger>
        </Spin>

        {uploadResult && (
          <div
            style={{
              marginTop: 'var(--margin-loose)',
              padding: 'var(--padding-loose)',
              backgroundColor: 'var(--color-background-secondary)',
              borderRadius: 'var(--radius-large)',
            }}
          >
            <div style={{ fontWeight: 'var(--font-weight-medium)', marginBottom: 8 }}>
              上传结果：{uploadResult.filename}
            </div>
            <Space size="large">
              <span>
                总记录：<Tag><span className="font-number">{uploadResult.totalRecords}</span></Tag>
              </span>
              <span>
                新增：<Tag color="green"><span className="font-number">{uploadResult.insertedCount}</span></Tag>
              </span>
              <span>
                更新：<Tag color="blue"><span className="font-number">{uploadResult.updatedCount}</span></Tag>
              </span>
              {uploadResult.failedCount > 0 && (
                <span>
                  失败：<Tag color="red"><span className="font-number">{uploadResult.failedCount}</span></Tag>
                </span>
              )}
            </Space>
          </div>
        )}

        <div style={{ marginTop: 'var(--margin-loose)', display: 'flex', gap: 'var(--margin-base)' }}>
          <Button
            icon={<HistoryOutlined />}
            onClick={() => {
              setLogsVisible(true)
              fetchLogs()
            }}
          >
            查看上传历史
          </Button>
        </div>
      </Card>

      {/* 数据列表 */}
      <Card
        title="数据列表"
        style={{
          borderRadius: 'var(--radius-extra-large)',
          boxShadow: 'var(--shadow-elevation-small)',
        }}
      >
        {/* 筛选器 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 'var(--margin-loose)' }}>
          <Col xs={24} sm={8} md={6}>
            <Select
              style={{ width: '100%' }}
              placeholder="选择渠道"
              allowClear
              value={filterChannel}
              onChange={setFilterChannel}
            >
              {channels.map((c) => (
                <Select.Option key={c} value={c}>
                  {c}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={8} md={6}>
            <RangePicker
              style={{ width: '100%' }}
              value={filterDateRange as any}
              onChange={(dates) => setFilterDateRange(dates as any)}
            />
          </Col>
          <Col xs={24} sm={8} md={6}>
            <Input
              placeholder="计划ID"
              value={filterCampaignId}
              onChange={(e) => setFilterCampaignId(e.target.value)}
              prefix={<SearchOutlined />}
              allowClear
            />
          </Col>
          <Col xs={24} sm={8} md={6}>
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={() => setRecordsPage(1)}>
                查询
              </Button>
              <Button icon={<ReloadOutlined />} onClick={() => {
                setFilterChannel(undefined)
                setFilterDateRange(null)
                setFilterCampaignId('')
                setRecordsPage(1)
              }}>
                重置
              </Button>
            </Space>
          </Col>
        </Row>

        <Spin spinning={recordsLoading}>
          <Table
            columns={recordColumns}
            dataSource={records}
            rowKey={(r) => `${r.channel}-${r.recordDate}-${r.campaignId}`}
            pagination={false}
            scroll={{ x: 1400 }}
            locale={{ emptyText: <Empty description="暂无数据，请先上传 Excel 文件" /> }}
          />
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <Pagination
              current={recordsPage}
              pageSize={recordsPageSize}
              total={recordsTotal}
              showSizeChanger
              pageSizeOptions={[50, 100, 200]}
              onChange={(page, size) => {
                setRecordsPage(page)
                if (size) setRecordsPageSize(size)
              }}
              showTotal={(total) => `共 ${total} 条`}
            />
          </div>
        </Spin>
      </Card>

      {/* 上传历史弹窗 */}
      <Modal
        title="上传历史"
        open={logsVisible}
        onCancel={() => setLogsVisible(false)}
        footer={null}
        width={800}
      >
        <Spin spinning={logsLoading}>
          <Table
            columns={logColumns}
            dataSource={logs}
            rowKey="id"
            pagination={{
              current: logsPage,
              pageSize: logsPageSize,
              total: logsTotal,
              onChange: (page, size) => {
                setLogsPage(page)
                if (size) setLogsPageSize(size)
              },
            }}
            locale={{ emptyText: <Empty description="暂无上传记录" /> }}
          />
        </Spin>
      </Modal>
    </div>
  )
}

export default DataManagement
