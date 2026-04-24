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
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { dataManageService } from '@services/dataManageService'
import { RawData, UploadLog, ChannelMapping } from '@/types'

const { Dragger } = Upload
const { RangePicker } = DatePicker
const { TabPane } = Tabs

const DataManagement: React.FC = () => {
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [convFile, setConvFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{
    filename: string
    totalRecords: number
    mediaRows: number
    convRows: number
    insertedCount: number
    updatedCount: number
    unmatchedMediaCount: number
    unmatchedConvCount: number
  } | null>(null)

  const [uploadError, setUploadError] = useState<any>(null)
  const [uploadErrorVisible, setUploadErrorVisible] = useState(false)

  const [records, setRecords] = useState<RawData[]>([])
  const [recordsTotal, setRecordsTotal] = useState(0)
  const [recordsPage, setRecordsPage] = useState(1)
  const [recordsPageSize, setRecordsPageSize] = useState(50)
  const [recordsLoading, setRecordsLoading] = useState(false)

  const [channels, setChannels] = useState<string[]>([])
  const [filterChannel, setFilterChannel] = useState<string | undefined>()
  const [filterDateRange, setFilterDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null)
  const [filterCampaignId, setFilterCampaignId] = useState('')

  const [logs, _setLogs] = useState<UploadLog[]>([])
  const [logsTotal, _setLogsTotal] = useState(0)
  const [logsPage, setLogsPage] = useState(1)
  const [logsPageSize, setLogsPageSize] = useState(10)
  const [logsLoading, _setLogsLoading] = useState(false)
  const [logsVisible, setLogsVisible] = useState(false)

  const [mappings, setMappings] = useState<ChannelMapping[]>([])
  const [mappingForm] = Form.useForm()

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
  }, [recordsPage, recordsPageSize, filterChannel, filterDateRange, filterCampaignId])

  const fetchMappings = useCallback(async () => {
    try {
      const rows = await dataManageService.getChannelMappings()
      setMappings(rows)
    } catch (e) {
      console.error('Fetch mappings error:', e)
    }
  }, [])

  useEffect(() => { fetchChannels() }, [fetchChannels])
  useEffect(() => { fetchRecords() }, [fetchRecords])
  useEffect(() => { fetchMappings() }, [fetchMappings])

  const handleUpload = async () => {
    if (!mediaFile || !convFile) {
      message.warning('请同时上传媒体数据表和转化数据表')
      return
    }
    setUploading(true)
    setUploadError(null)
    try {
      const result = await dataManageService.uploadFiles(mediaFile, convFile)
      setUploadResult({
        filename: result.filename,
        totalRecords: result.totalRecords,
        mediaRows: result.mediaRows,
        convRows: result.convRows,
        insertedCount: result.insertedCount,
        updatedCount: result.updatedCount,
        unmatchedMediaCount: result.unmatchedMediaCount,
        unmatchedConvCount: result.unmatchedConvCount,
      })
      message.success(`上传成功！匹配 ${result.totalRecords} 条，新增 ${result.insertedCount} 条，更新 ${result.updatedCount} 条`)
      fetchRecords()
      fetchChannels()
      setMediaFile(null)
      setConvFile(null)
    } catch (e: any) {
      const errData = e.responseData
      if (errData?.data?.diagnosis) {
        setUploadError(errData)
        setUploadErrorVisible(true)
      }
      message.error(`上传失败: ${e.message || '未知错误'}`)
    } finally {
      setUploading(false)
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
    { title: '留资', dataIndex: 'leads', key: 'leads', align: 'right' as const, render: (v: number) => <span className="font-number">{v.toLocaleString()}</span> },
    { title: '开户', dataIndex: 'accounts', key: 'accounts', align: 'right' as const, render: (v: number) => <span className="font-number">{v.toLocaleString()}</span> },
  ]

  const logColumns = [
    { title: '文件名', dataIndex: 'filename', key: 'filename' },
    { title: '总记录', dataIndex: 'recordCount', key: 'recordCount', align: 'right' as const, render: (v: number) => <span className="font-number">{v}</span> },
    { title: '新增', dataIndex: 'insertedCount', key: 'insertedCount', align: 'right' as const, render: (v: number) => <Tag color="green"><span className="font-number">+{v}</span></Tag> },
    { title: '更新', dataIndex: 'updatedCount', key: 'updatedCount', align: 'right' as const, render: (v: number) => <Tag color="blue"><span className="font-number">{v}</span></Tag> },
    { title: '失败', dataIndex: 'failedCount', key: 'failedCount', align: 'right' as const, render: (v: number) => v > 0 ? <Tag color="red"><span className="font-number">{v}</span></Tag> : <span className="font-number">{v}</span> },
    { title: '上传人', dataIndex: 'uploadedBy', key: 'uploadedBy', render: (v: string) => v || '-' },
    { title: '上传时间', dataIndex: 'uploadedAt', key: 'uploadedAt', render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm:ss') },
  ]

  return (
    <div>
      <h1 style={{ fontSize: 'var(--font-size-extra-large)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--margin-super-loose)' }}>
        数据管理
      </h1>

      <Tabs defaultActiveKey="upload">
        <TabPane tab={<Space><FileExcelOutlined />数据上传</Space>} key="upload">
          <Spin spinning={uploading} tip="正在解析匹配并入库...">
            <Row gutter={[24, 24]}>
              <Col xs={24} md={12}>
                <Card title="媒体数据表" style={{ borderRadius: 'var(--radius-extra-large)', boxShadow: 'var(--shadow-elevation-small)' }}>
                  <Dragger
                    beforeUpload={(file) => { setMediaFile(file); return false }}
                    accept=".xlsx,.xls,.csv"
                    showUploadList={false}
                  >
                    <p className="ant-upload-drag-icon"><FileExcelOutlined style={{ fontSize: 48, color: 'var(--color-brand-primary)' }} /></p>
                    <p style={{ color: 'var(--color-text-primary)' }}>
                      {mediaFile ? mediaFile.name : '点击或拖拽上传媒体数据表'}
                    </p>
                    <p style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-text-tertiary)' }}>
                      支持 .xlsx / .xls / .csv
                    </p>
                  </Dragger>
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card title="转化数据表" style={{ borderRadius: 'var(--radius-extra-large)', boxShadow: 'var(--shadow-elevation-small)' }}>
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
                </Card>
              </Col>
            </Row>

            <div style={{ marginTop: 'var(--margin-loose)', textAlign: 'center' }}>
              <Button type="primary" size="large" onClick={handleUpload} disabled={!mediaFile || !convFile}>
                开始匹配并入库
              </Button>
            </div>

            {uploadResult && (
              <Card style={{ marginTop: 'var(--margin-loose)', borderRadius: 'var(--radius-large)', backgroundColor: 'var(--color-background-secondary)' }}>
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={8}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 28, fontFamily: 'var(--font-family-number)', fontWeight: 'bold', color: 'var(--color-brand-primary)' }}>
                        {uploadResult.totalRecords}
                      </div>
                      <div style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-text-secondary)' }}>匹配成功</div>
                    </div>
                  </Col>
                  <Col xs={24} sm={8}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 28, fontFamily: 'var(--font-family-number)', fontWeight: 'bold', color: 'var(--color-data-green)' }}>
                        +{uploadResult.insertedCount}
                      </div>
                      <div style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-text-secondary)' }}>新增</div>
                    </div>
                  </Col>
                  <Col xs={24} sm={8}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 28, fontFamily: 'var(--font-family-number)', fontWeight: 'bold', color: 'var(--color-data-blue)' }}>
                        {uploadResult.updatedCount}
                      </div>
                      <div style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-text-secondary)' }}>更新</div>
                    </div>
                  </Col>
                </Row>
                <div style={{ marginTop: 'var(--margin-base)', textAlign: 'center', fontSize: 'var(--font-size-small)', color: 'var(--color-text-tertiary)' }}>
                  媒体表 {uploadResult.mediaRows} 条 · 转化表 {uploadResult.convRows} 条
                  {uploadResult.unmatchedMediaCount > 0 && ` · 媒体表未匹配 ${uploadResult.unmatchedMediaCount} 条`}
                  {uploadResult.unmatchedConvCount > 0 && ` · 转化表未匹配 ${uploadResult.unmatchedConvCount} 条`}
                </div>
              </Card>
            )}
          </Spin>
        </TabPane>

        <TabPane tab={<Space><SettingOutlined />渠道映射</Space>} key="mapping">
          <Card title="添加渠道名称映射规则" style={{ marginBottom: 'var(--margin-loose)', borderRadius: 'var(--radius-extra-large)', boxShadow: 'var(--shadow-elevation-small)' }}>
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

          <Card title="现有映射规则" style={{ borderRadius: 'var(--radius-extra-large)', boxShadow: 'var(--shadow-elevation-small)' }}>
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
                    <Popconfirm title="确定删除这条映射规则？" onConfirm={() => handleDeleteMapping(record.id)}>
                      <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
                    </Popconfirm>
                  ),
                },
              ]}
              locale={{ emptyText: <Empty description="暂无映射规则" /> }}
            />
          </Card>
        </TabPane>

        <TabPane tab={<Space><SearchOutlined />数据列表</Space>} key="records">
          <Card style={{ borderRadius: 'var(--radius-extra-large)', boxShadow: 'var(--shadow-elevation-small)' }}>
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
                  <Button type="primary" icon={<SearchOutlined />} onClick={() => setRecordsPage(1)}>查询</Button>
                  <Button icon={<ReloadOutlined />} onClick={() => { setFilterChannel(undefined); setFilterDateRange(null); setFilterCampaignId(''); setRecordsPage(1) }}>重置</Button>
                </Space>
              </Col>
            </Row>

            <Spin spinning={recordsLoading}>
              <Table
                columns={recordColumns}
                dataSource={records}
                rowKey={(r) => `${r.channel}-${r.recordDate}-${r.campaignId}`}
                pagination={false}
                scroll={{ x: 1600 }}
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
        </TabPane>
      </Tabs>

      <Modal title="上传历史" open={logsVisible} onCancel={() => setLogsVisible(false)} footer={null} width={800}>
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
