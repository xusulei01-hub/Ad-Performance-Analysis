import React, { ReactNode, useState } from 'react'
import { Layout, Menu, Typography, Button, Modal, Tag, Timeline } from 'antd'
import {
  DashboardOutlined,
  BarChartOutlined,
  CloudUploadOutlined,
  ReloadOutlined,
  ShopOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { Link, useLocation } from 'react-router-dom'

const { Header, Sider, Content } = Layout
const { Title } = Typography

const CURRENT_VERSION = '1.1'

const CHANGELOG = [
  {
    version: '1.1',
    date: '2026-04-23',
    changes: [
      '新增买断期商数据模块（数据与广告投放完全隔离）',
      '期商数据上传：单文件上传，按 user_id 去重，支持增量更新',
      '期商名称映射管理：qs_id ↔ 中文名称',
      '期商数据分析：消耗、开户数、开户率、开户成本报表',
      '渠道数据分析：各渠道留资数、开户率报表',
      '支持按时间区间、期商、渠道筛选分析数据',
      '修复大文件上传事务超时问题',
    ],
  },
  {
    version: '1.0',
    date: '2026-04-22',
    changes: [
      '完成端外买断工作台核心功能',
      '支持媒体数据表 + 转化数据表双文件上传匹配入库',
      '新增渠道名称映射表管理（如 mi → xiaomi）',
      '数据总览：昨日/本周/本月数据卡片',
      '渠道分析：分计划排名和每日趋势折线图',
      '数据管理：上传、映射、列表查询',
      '后端聚合新增 formalActivations、leads、CTR 指标',
    ],
  },
]

interface MainLayoutProps {
  children: ReactNode
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const location = useLocation()
  const [refreshing, setRefreshing] = useState(false)
  const [changelogVisible, setChangelogVisible] = useState(false)

  const handleRefresh = () => {
    setRefreshing(true)
    window.location.reload()
  }

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: <Link to="/dashboard">数据总览</Link>,
    },
    {
      key: '/channel-analysis',
      icon: <BarChartOutlined />,
      label: <Link to="/channel-analysis">渠道分析</Link>,
    },
    {
      key: '/data-management',
      icon: <CloudUploadOutlined />,
      label: <Link to="/data-management">数据管理</Link>,
    },
    {
      key: '/merchant-data',
      icon: <ShopOutlined />,
      label: <Link to="/merchant-data">期商数据</Link>,
    },
    {
      key: '/merchant-analysis',
      icon: <TeamOutlined />,
      label: <Link to="/merchant-analysis">期商分析</Link>,
    },
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          backgroundColor: 'var(--color-background-nav)',
          padding: '0 var(--padding-extra-loose)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--margin-loose)' }}>
          <img
            src="/logo-for-alang.png"
            alt="logo"
            style={{
              height: 36,
              width: 36,
              borderRadius: 'var(--radius-medium)',
              objectFit: 'cover',
            }}
          />
          <Title
            level={4}
            style={{
              margin: 0,
              color: 'var(--color-text-inverse)',
              fontSize: 'var(--font-size-large)',
              fontWeight: 'var(--font-weight-medium)',
            }}
          >
            阿浪个人工作台
          </Title>
          <Tag
            color="blue"
            style={{ cursor: 'pointer', fontSize: 'var(--font-size-small)' }}
            onClick={() => setChangelogVisible(true)}
          >
            v{CURRENT_VERSION}
          </Tag>
          <span
            style={{
              color: 'var(--color-text-inverse-secondary)',
              fontSize: 'var(--font-size-small)',
            }}
          >
            广告投放数据分析
          </span>
        </div>
        <Button
          type="text"
          icon={<ReloadOutlined spin={refreshing} />}
          onClick={handleRefresh}
          style={{
            color: 'var(--color-text-inverse)',
            fontSize: 'var(--font-size-small)',
          }}
        >
          刷新数据
        </Button>
      </Header>

      <Modal
        title="版本历史"
        open={changelogVisible}
        onCancel={() => setChangelogVisible(false)}
        footer={null}
        width={560}
      >
        <Timeline
          items={CHANGELOG.map((item) => ({
            children: (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                  v{item.version} <span style={{ fontWeight: 'normal', color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-small)' }}>{item.date}</span>
                </div>
                <ul style={{ paddingLeft: 16, margin: 0 }}>
                  {item.changes.map((change, i) => (
                    <li key={i} style={{ marginBottom: 2, fontSize: 'var(--font-size-small)' }}>{change}</li>
                  ))}
                </ul>
              </div>
            ),
          }))}
        />
      </Modal>

      <Layout>
        <Sider
          width={200}
          style={{
            backgroundColor: 'var(--color-foreground-layer1)',
            boxShadow: 'var(--shadow-elevation-small)',
          }}
        >
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            style={{
              height: '100%',
              borderRight: 'none',
              fontSize: 'var(--font-size-medium)',
              paddingTop: 'var(--padding-base)',
            }}
            items={menuItems}
          />
        </Sider>

        <Content
          style={{
            margin: 'var(--padding-super-loose)',
            padding: 'var(--padding-super-loose)',
            backgroundColor: 'var(--color-foreground-layer1)',
            borderRadius: 'var(--radius-extra-large)',
            minHeight: 280,
            overflow: 'auto',
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}

export default MainLayout
