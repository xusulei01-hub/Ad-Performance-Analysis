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
  Empty,
  Space,
  Tabs,
  Form,
  Popconfirm,
  Tag,
} from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  FileExcelOutlined,
  SettingOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { merchantService } from '@services/merchantService'
import { MerchantData, MerchantMapping } from '@/types'

const { Dragger } = Upload
const { RangePicker } = DatePicker
const { TabPane } = Tabs

const MerchantDataManagement: React.FC = () => {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{
    filename: string
    totalRecords: number
    insertedCount: number
    updatedCount: number
  } | null>(null)

  const [records, setRecords] = useState<MerchantData[]>([])
  const [recordsTotal, setRecordsTotal] = useState(0)
  const [recordsPage, setRecordsPage] = useState(1)
  const [recordsPageSize, setRecordsPageSize] = useState(50)
  const [recordsLoading, setRecordsLoading] = useState(false)

  const [merchants, setMerchants] = useState<{ qsId: string; merchantName: string }[]>([])
  const [channels, setChannels] = useState<string[]>([])
  const [filterQsId, setFilterQsId] = useState<string | undefined>()
  const [filterChannel, setFilterChannel] = useState<string | undefined>()
  const [filterDateRange, setFilterDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null)

  const [mappings, setMappings] = useState<MerchantMapping[]>([])
  const [mappingForm] = Form.useForm()
  const [mappingImporting, setMappingImporting] = useState(false)
  const [mappingImportResult, setMappingImportResult] = useState<{ total: number; createdCount: number; updatedCount: number } | null>(null)
  const [mappingImportFile, setMappingImportFile] = useState<File | null>(null)

  const fetchMerchants = useCallback(async () => {
    try {
      const list = await merchantService.getMerchants()
      setMerchants(list.map((m) => ({ qsId: m.qsId, merchantName: m.merchantName })))
    } catch (e) {
      console.error('Fetch merchants error:', e)
    }
  }, [])

  const fetchChannels = useCallback(async () => {
    try {
      const list = await merchantService.getChannels()
      setChannels(list)
    } catch (e) {
      console.error('Fetch channels error:', e)
    }
  }, [])

  const fetchRecords = useCallback(async () => {
    setRecordsLoading(true)
    try {
      const params: any = { page: recordsPage, pageSize: recordsPageSize }
      if (filterQsId) params.qsId = filterQsId
      if (filterChannel) params.channel = filterChannel
      if (filterDateRange?.[0] && filterDateRange?.[1]) {
        params.startDate = filterDateRange[0].format('YYYY-MM-DD')
        params.endDate = filterDateRange[1].format('YYYY-MM-DD')
      }
      const res = await merchantService.getRecords(params)
      setRecords(res.records)
      setRecordsTotal(res.total)
    } catch (e) {
      message.error('获取数据列表失败')
    } finally {
      setRecordsLoading(false)
    }
  }, [recordsPage, recordsPageSize, filterQsId, filterChannel, filterDateRange])

  const fetchMappings = useCallback(async () => {
    try {
      const rows = await merchantService.getMerchantMappings()
      setMappings(rows)
    } catch (e) {
      console.error('Fetch mappings error:', e)
    }
  }, [])

  useEffect(() => { fetchMerchants() }, [fetchMerchants])
  useEffect(() => { fetchChannels() }, [fetchChannels])
  useEffect(() => { fetchRecords() }, [fetchRecords])
  useEffect(() => { fetchMappings() }, [fetchMappings])

  const handleUpload = async () => {
    if (!file) {
      message.warning('请先上传文件')
      return
    }
    setUploading(true)
    try {
      const result = await merchantService.uploadFile(file)
      setUploadResult({
        filename: result.filename,
        totalRecords: result.totalRecords,
        insertedCount: result.insertedCount,
        updatedCount: result.updatedCount,
      })
      message.success(`上传成功！共 ${result.totalRecords} 条，新增 ${result.insertedCount} 条，更新 ${result.updatedCount} 条`)
      fetchRecords()
      fetchMerchants()
      setFile(null)
    } catch (e: any) {
      message.error(`上传失败: ${e.message || '未知错误'}`)
    } finally {
      setUploading(false)
    }
  }

  const handleImportMappings = async () => {
    if (!mappingImportFile) {
      message.warning('请先选择映射表文件')
      return
    }
    setMappingImporting(true)
    try {
      const res = await merchantService.uploadMerchantMappings(mappingImportFile)
      setMappingImportResult(res)
      message.success(`导入完成：新增 ${res.createdCount} 条，更新 ${res.updatedCount} 条`)
      setMappingImportFile(null)
      fetchMappings()
      fetchMerchants()
    } catch (e: any) {
      message.error(`导入失败: ${e.message || '未知错误'}`)
    } finally {
      setMappingImporting(false)
    }
  }

  const handleAddMapping = async (values: { qsId: string; merchantName: string }) => {
    try {
      await merchantService.createMerchantMapping(values.qsId, values.merchantName)
      message.success('映射规则已保存')
      mappingForm.resetFields()
      fetchMappings()
      fetchMerchants()
    } catch (e) {
      message.error('保存失败')
    }
  }

  const handleDeleteMapping = async (id: number) => {
    try {
      await merchantService.deleteMerchantMapping(id)
      message.success('已删除')
      fetchMappings()
      fetchMerchants()
    } catch (e) {
      message.error('删除失败')
    }
  }

  const recordColumns = [
    { title: '用户ID', dataIndex: 'userId', key: 'userId', width: 160 },
    { title: '期商', dataIndex: 'merchantName', key: 'merchantName', width: 160, render: (v: string | null, record: MerchantData) => v || record.qsId },
    { title: '期商ID', dataIndex: 'qsId', key: 'qsId', width: 120 },
    { title: '渠道', dataIndex: 'channel', key: 'channel', width: 120 },
    { title: '留资日期', dataIndex: 'leadDate', key: 'leadDate', width: 120, render: (v: string) => dayjs(v).format('YYYY-MM-DD') },
    { title: '开户日期', dataIndex: 'accountDate', key: 'accountDate', width: 120, render: (v: string | null) => v ? dayjs(v).format('YYYY-MM-DD') : <Tag color="default">未开户</Tag> },
    { title: '状态', key: 'status', width: 100, render: (_: any, record: MerchantData) => record.accountDate ? <Tag color="green">已开户</Tag> : <Tag color="orange">已留资</Tag> },
  ]

  return (
    <div>
      <h1 style={{ fontSize: 'var(--font-size-extra-large)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--margin-super-loose)' }}>
        期商数据管理
      </h1>

      <Tabs defaultActiveKey="upload">
        <TabPane tab={<Space><FileExcelOutlined />数据上传</Space>} key="upload">
          <Spin spinning={uploading} tip="正在解析并入库...">
            <Card title="期商买断数据表" style={{ borderRadius: 'var(--radius-extra-large)', boxShadow: 'var(--shadow-elevation-small)' }}>
              <Dragger
                beforeUpload={(f) => { setFile(f); return false }}
                accept=".xlsx,.xls,.csv"
                showUploadList={false}
              >
                <p className="ant-upload-drag-icon"><FileExcelOutlined style={{ fontSize: 48, color: 'var(--color-brand-primary)' }} /></p>
                <p style={{ color: 'var(--color-text-primary)' }}>
                  {file ? file.name : '点击或拖拽上传期商买断数据表'}
                </p>
                <p style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-text-tertiary)' }}>
                  支持 .xlsx / .xls / .csv
                </p>
                <p style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-text-tertiary)', marginTop: 8 }}>
                  必需列：user_id, qs_id, 渠道, 留资日期 / 可选列：开户日期
                </p>
              </Dragger>
            </Card>

            <div style={{ marginTop: 'var(--margin-loose)', textAlign: 'center' }}>
              <Button type="primary" size="large" onClick={handleUpload} disabled={!file}>
                开始导入
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
                      <div style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-text-secondary)' }}>总记录</div>
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
              </Card>
            )}
          </Spin>
        </TabPane>

        <TabPane tab={<Space><SettingOutlined />期商映射</Space>} key="mapping">
          <Spin spinning={mappingImporting} tip="正在导入...">
            <Card title="批量导入期商映射" style={{ marginBottom: 'var(--margin-loose)', borderRadius: 'var(--radius-extra-large)', boxShadow: 'var(--shadow-elevation-small)' }}>
              <Row gutter={[16, 16]} align="middle">
                <Col xs={24} sm={18}>
                  <Dragger
                    beforeUpload={(f) => { setMappingImportFile(f); return false }}
                    accept=".xlsx,.xls,.csv"
                    showUploadList={false}
                    style={{ padding: 'var(--padding-base)' }}
                  >
                    <p className="ant-upload-drag-icon"><FileExcelOutlined style={{ fontSize: 32, color: 'var(--color-brand-primary)' }} /></p>
                    <p style={{ color: 'var(--color-text-primary)' }}>
                      {mappingImportFile ? mappingImportFile.name : '点击或拖拽上传期商映射表'}
                    </p>
                    <p style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-text-tertiary)' }}>
                      支持 .xlsx / .xls / .csv，需包含「期商id」和「期商名称」两列
                    </p>
                  </Dragger>
                </Col>
                <Col xs={24} sm={6}>
                  <Button
                    type="primary"
                    block
                    onClick={handleImportMappings}
                    disabled={!mappingImportFile}
                  >
                    确认导入
                  </Button>
                  {mappingImportResult && (
                    <div style={{ marginTop: 'var(--margin-base)', fontSize: 'var(--font-size-small)', color: 'var(--color-text-secondary)' }}>
                      <div>共 {mappingImportResult.total} 条</div>
                      <div>新增 {mappingImportResult.createdCount} 条</div>
                      <div>更新 {mappingImportResult.updatedCount} 条</div>
                    </div>
                  )}
                </Col>
              </Row>
            </Card>
          </Spin>

          <Card title="手动添加期商名称映射" style={{ marginBottom: 'var(--margin-loose)', borderRadius: 'var(--radius-extra-large)', boxShadow: 'var(--shadow-elevation-small)' }}>
            <Form form={mappingForm} layout="vertical" onFinish={handleAddMapping}>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={8}>
                  <Form.Item name="qsId" rules={[{ required: true, message: '请输入期商ID' }]}>
                    <Input placeholder="期商ID（如 QS001）" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item name="merchantName" rules={[{ required: true, message: '请输入期商名称' }]}>
                    <Input placeholder="中文名称（如 中信期货）" />
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
              设置 qs_id 对应的中文名称，报表中将显示中文名而非ID。也可通过上方批量导入功能一次性导入。
            </div>
          </Card>

          <Card title="现有映射规则" style={{ borderRadius: 'var(--radius-extra-large)', boxShadow: 'var(--shadow-elevation-small)' }}>
            <Table
              dataSource={mappings}
              rowKey="id"
              pagination={false}
              columns={[
                { title: '期商ID', dataIndex: 'qsId', key: 'qsId' },
                { title: '中文名称', dataIndex: 'merchantName', key: 'merchantName' },
                { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm') },
                {
                  title: '操作',
                  key: 'action',
                  render: (_: any, record: MerchantMapping) => (
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
                <Select style={{ width: '100%' }} placeholder="选择期商" allowClear value={filterQsId} onChange={setFilterQsId}>
                  {merchants.map((m) => <Select.Option key={m.qsId} value={m.qsId}>{m.merchantName}</Select.Option>)}
                </Select>
              </Col>
              <Col xs={24} sm={8} md={6}>
                <Select style={{ width: '100%' }} placeholder="选择渠道" allowClear value={filterChannel} onChange={setFilterChannel}>
                  {channels.map((c) => <Select.Option key={c} value={c}>{c}</Select.Option>)}
                </Select>
              </Col>
              <Col xs={24} sm={8} md={6}>
                <RangePicker style={{ width: '100%' }} value={filterDateRange as any} onChange={(dates) => setFilterDateRange(dates as any)} />
              </Col>
              <Col xs={24} sm={8} md={6}>
                <Space>
                  <Button type="primary" icon={<SearchOutlined />} onClick={() => setRecordsPage(1)}>查询</Button>
                  <Button icon={<ReloadOutlined />} onClick={() => { setFilterQsId(undefined); setFilterChannel(undefined); setFilterDateRange(null); setRecordsPage(1) }}>重置</Button>
                </Space>
              </Col>
            </Row>

            <Spin spinning={recordsLoading}>
              <Table
                columns={recordColumns}
                dataSource={records}
                rowKey="userId"
                pagination={false}
                scroll={{ x: 900 }}
                locale={{ emptyText: <Empty description="暂无数据，请先上传文件" /> }}
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
    </div>
  )
}

export default MerchantDataManagement
