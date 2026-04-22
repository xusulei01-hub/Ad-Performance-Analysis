import React, { ReactNode, useState } from 'react'
import { Layout, Menu, Typography, Button } from 'antd'
import {
  DashboardOutlined,
  BarChartOutlined,
  CloudUploadOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { Link, useLocation } from 'react-router-dom'

const { Header, Sider, Content } = Layout
const { Title } = Typography

interface MainLayoutProps {
  children: ReactNode
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const location = useLocation()
  const [refreshing, setRefreshing] = useState(false)

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
          <Title
            level={4}
            style={{
              margin: 0,
              color: 'var(--color-text-inverse)',
              fontSize: 'var(--font-size-large)',
              fontWeight: 'var(--font-weight-medium)',
            }}
          >
            端外买断工作台
          </Title>
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
