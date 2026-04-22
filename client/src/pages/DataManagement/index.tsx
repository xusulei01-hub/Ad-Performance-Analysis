import React from 'react'
import { Card, Upload, Button, Table, message } from 'antd'
import { InboxOutlined, UploadOutlined } from '@ant-design/icons'

const { Dragger } = Upload

const DataManagement: React.FC = () => {
  const uploadProps = {
    name: 'file',
    action: '/api/v1/data/upload',
    accept: '.xlsx,.xls',
    onChange(info: any) {
      const { status } = info.file
      if (status === 'done') {
        message.success(`${info.file.name} 上传成功`)
      } else if (status === 'error') {
        message.error(`${info.file.name} 上传失败`)
      }
    },
  }

  const columns = [
    { title: '渠道', dataIndex: 'channel', key: 'channel' },
    { title: '日期', dataIndex: 'record_date', key: 'record_date' },
    { title: '计划ID', dataIndex: 'campaign_id', key: 'campaign_id' },
    { title: '品种/名称', dataIndex: 'campaign_name', key: 'campaign_name' },
    { title: '曝光', dataIndex: 'impressions', key: 'impressions', className: 'font-number' },
    { title: '点击', dataIndex: 'clicks', key: 'clicks', className: 'font-number' },
    { title: '花费', dataIndex: 'cost', key: 'cost', className: 'font-number' },
    { title: '下载', dataIndex: 'downloads', key: 'downloads', className: 'font-number' },
    { title: '激活', dataIndex: 'activations', key: 'activations', className: 'font-number' },
    { title: '授信', dataIndex: 'credits', key: 'credits', className: 'font-number' },
    { title: '开户', dataIndex: 'accounts', key: 'accounts', className: 'font-number' },
    { title: 'ROI', dataIndex: 'roi', key: 'roi', className: 'font-number' },
  ]

  const mockData = [
    {
      key: '1',
      channel: 'hihonor',
      record_date: '2026-01-01',
      campaign_id: '10004127059',
      campaign_name: '商店-商店搜索-行业词-精准-ocpd-240529',
      impressions: 1154,
      clicks: 16,
      cost: 86.38,
      downloads: 7,
      activations: 1,
      credits: 2,
      accounts: 3,
      roi: 1.2,
    },
    {
      key: '2',
      channel: 'hihonor',
      record_date: '2026-01-01',
      campaign_id: '10008247269',
      campaign_name: '商店-商店搜索-竞品词-ocpd激活-240731',
      impressions: 4802,
      clicks: 48,
      cost: 92.86,
      downloads: 25,
      activations: 2,
      credits: 3,
      accounts: 4,
      roi: 1.3,
    },
  ]

  return (
    <div>
      <h1 style={{ fontSize: 'var(--font-size-extra-large)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--margin-super-loose)' }}>
        数据管理
      </h1>

      {/* 上传区域 */}
      <Card
        title="上传Excel数据"
        style={{ marginBottom: 'var(--margin-super-loose)' }}
      >
        <Dragger {...uploadProps}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined style={{ fontSize: 48, color: 'var(--color-brand-primary)' }} />
          </p>
          <p style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-text-primary)', marginBottom: 'var(--margin-base)' }}>
            点击或拖拽文件到此区域上传
          </p>
          <p style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-text-tertiary)' }}>
            支持 .xlsx / .xls 格式，以 (渠道, 日期, 计划ID) 自动去重
          </p>
        </Dragger>
        <div style={{ marginTop: 'var(--margin-loose)', display: 'flex', gap: 'var(--margin-base)' }}>
          <Button type="primary" icon={<UploadOutlined />}>
            确认上传
          </Button>
          <Button>查看上传历史</Button>
        </div>
      </Card>

      {/* 数据列表 */}
      <Card title="数据列表">
        <Table
          columns={columns}
          dataSource={mockData}
          pagination={{
            pageSize: 50,
            showSizeChanger: true,
            pageSizeOptions: ['50', '100', '200'],
          }}
          scroll={{ x: 1500 }}
        />
      </Card>
    </div>
  )
}

export default DataManagement
