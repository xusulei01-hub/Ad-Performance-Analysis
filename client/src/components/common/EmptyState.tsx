import React from 'react'
import { Empty } from 'antd'
import { FileSearchOutlined, InboxOutlined, DatabaseOutlined } from '@ant-design/icons'

type EmptyType = 'no-data' | 'no-result' | 'no-selection'

const config: Record<EmptyType, { icon: React.ReactNode; description: string }> = {
  'no-data': {
    icon: <DatabaseOutlined style={{ fontSize: 48, color: '#B3B3B3' }} />,
    description: '暂无数据，请先上传数据文件',
  },
  'no-result': {
    icon: <FileSearchOutlined style={{ fontSize: 48, color: '#B3B3B3' }} />,
    description: '未匹配到数据，请调整筛选条件',
  },
  'no-selection': {
    icon: <InboxOutlined style={{ fontSize: 48, color: '#B3B3B3' }} />,
    description: '请选择渠道和时间范围后查询',
  },
}

interface EmptyStateProps {
  type?: EmptyType
  description?: string
}

const EmptyState: React.FC<EmptyStateProps> = ({ type = 'no-data', description }) => {
  const cfg = config[type]
  return (
    <Empty
      image={cfg.icon}
      description={description || cfg.description}
      style={{ padding: '60px 0' }}
    />
  )
}

export default EmptyState
