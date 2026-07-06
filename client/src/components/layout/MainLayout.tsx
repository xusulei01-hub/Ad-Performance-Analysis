import React, { ReactNode, useState, useEffect, useMemo } from 'react'
import { Layout, Menu, Typography, Button, Modal, Tag, Timeline, Breadcrumb, Space } from 'antd'
import {
  DashboardOutlined,
  ReloadOutlined,
  ShopOutlined,
  MenuOutlined,
  CalendarOutlined,
  FileTextOutlined,
  LogoutOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useRefresh } from '@components/layout/RefreshContext'
import { useAuthStore } from '@stores/authStore'

const { Header, Sider, Content, Footer } = Layout
const { Title } = Typography

const CURRENT_VERSION = '3.0'

const CHANGELOG = [
  {
    version: '3.0',
    date: '2026-07-06',
    changes: [
      '投放数据上传重构：支持先上传转化数据表作为基底，再按渠道分别上传媒体数据表进行匹配',
      '账户体系上线：支持管理员和渠道用户两种角色，渠道用户数据按渠道隔离',
      '权限控制：渠道用户仅可查看所属渠道数据，留资/开户等敏感字段仅管理员可见',
      '期商模块仅管理员可访问',
      '新增登录页面和用户管理功能',
    ],
  },
  {
    version: '2.3',
    date: '2026-05-21',
    changes: [
      'AI 报告存档：分析结果可保存到数据库，支持历史回溯查看、删除和重新导出',
      'Word 导出：AI 分析报告可一键导出为图文并茂的 .docx 文档',
      '存储空间预警：报告数量上限 100 条，接近上限时自动提醒',
      '新增「历史报告」独立页面',
      'AI 分析扩展：渠道分析和期商分析页面新增 AI 诊断面板',
      '前后端一致性修复',
    ],
  },
  {
    version: '2.2',
    date: '2026-05-14',
    changes: [
      'AI 数据诊断：数据总览新增 AI 分析面板',
      '后端重构：代码结构模块化',
      '新增验证中间件',
      '性能优化：页面布局冻结导航栏',
    ],
  },
  {
    version: '2.1',
    date: '2026-04-29',
    changes: [
      '体验优化：筛选器改为手动查询',
      '视觉升级：各指标卡片使用独立配色',
      '移动端优化',
    ],
  },
  {
    version: '2.0',
    date: '2026-04-28',
    changes: [
      '页面全新改版',
      '视觉统一升级',
      '菜单优化：投放管理和期商买断分组展示',
    ],
  },
  {
    version: '1.4',
    date: '2026-04-27',
    changes: [
      '迷你趋势图',
      '渠道对比表',
      '性能优化',
    ],
  },
  {
    version: '1.3',
    date: '2026-04-27',
    changes: [
      '目标管理',
      'CPA 指标',
      '转化漏斗图',
      '数据异常自动标记',
      '计划下钻',
      '上传历史撤销',
    ],
  },
  {
    version: '1.2',
    date: '2026-04-24',
    changes: ['日程表', '计划功能', '里程碑功能'],
  },
  {
    version: '1.1',
    date: '2026-04-23',
    changes: ['期商买断数据模块', '期商名称映射', '期商分析'],
  },
  {
    version: '1.0',
    date: '2026-04-22',
    changes: ['端外买断工作台正式上线', '双文件上传匹配', '渠道名称映射', '数据总览', '渠道分析'],
  },
]

interface MainLayoutProps {
  children: ReactNode
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { triggerRefresh } = useRefresh()
  const [refreshing, setRefreshing] = useState(false)
  const [changelogVisible, setChangelogVisible] = useState(false)
  const [siderCollapsed, setSiderCollapsed] = useState(false)
  const [openKeys, setOpenKeys] = useState<string[]>([])

  const { user, isAdmin, logout } = useAuthStore()

  useEffect(() => {
    if (['/dashboard', '/channel-analysis', '/data-management'].includes(location.pathname)) {
      setOpenKeys(['ad-management'])
    } else if (['/merchant-analysis', '/merchant-data'].includes(location.pathname)) {
      setOpenKeys(['merchant-buyout'])
    }
  }, [location.pathname])

  const handleRefresh = () => {
    setRefreshing(true)
    triggerRefresh()
    setTimeout(() => setRefreshing(false), 600)
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const menuItems = useMemo(() => {
    const items: any[] = [
      {
        key: '/schedule',
        icon: <CalendarOutlined />,
        label: <Link to="/schedule">日程表</Link>,
      },
      {
        key: 'ad-management',
        icon: <DashboardOutlined />,
        label: '投放管理',
        children: [
          {
            key: '/dashboard',
            label: <Link to="/dashboard">数据总览</Link>,
          },
          {
            key: '/channel-analysis',
            label: <Link to="/channel-analysis">渠道分析</Link>,
          },
          {
            key: '/data-management',
            label: <Link to="/data-management">数据管理</Link>,
          },
        ],
      },
    ]

    // 期商买断仅管理员可见
    if (isAdmin) {
      items.push({
        key: 'merchant-buyout',
        icon: <ShopOutlined />,
        label: '期商买断',
        children: [
          {
            key: '/merchant-analysis',
            label: <Link to="/merchant-analysis">期商分析</Link>,
          },
          {
            key: '/merchant-data',
            label: <Link to="/merchant-data">期商数据</Link>,
          },
        ],
      })
    }

    items.push({
      key: '/ai-reports',
      icon: <FileTextOutlined />,
      label: <Link to="/ai-reports">历史报告</Link>,
    })

    // 用户管理仅管理员可见
    if (isAdmin) {
      items.push({
        key: '/user-management',
        icon: <SettingOutlined />,
        label: <Link to="/user-management">用户管理</Link>,
      })
    }

    return items
  }, [isAdmin])

  // 渠道用户的渠道标签
  const channelTags = useMemo(() => {
    if (isAdmin || !user?.permittedChannels) return null
    try {
      const channels = JSON.parse(user.permittedChannels)
      if (Array.isArray(channels) && channels.length > 0) {
        return channels.map((c: string) => (
          <Tag key={c} color="blue" style={{ fontSize: 10, marginRight: 4 }}>
            {c}
          </Tag>
        ))
      }
    } catch {}
    return null
  }, [isAdmin, user?.permittedChannels])

  return (
    <Layout style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header
        style={{
          backgroundColor: '#FFFFFF',
          padding: '0 var(--padding-extra-loose)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--color-divider)',
          zIndex: 10,
          flexShrink: 0,
          height: '60px',
          lineHeight: '60px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--margin-loose)' }}>
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={() => setSiderCollapsed(!siderCollapsed)}
            style={{
              color: 'var(--color-text-primary)',
              display: 'none',
            }}
            className="mobile-menu-btn"
          />
          <img
            src="/logo-for-alang.png"
            alt="logo"
            style={{
              height: 32,
              width: 32,
              objectFit: 'contain',
              mixBlendMode: 'multiply',
            }}
          />
          <Title
            level={4}
            style={{
              margin: 0,
              color: 'var(--color-text-primary)',
              fontSize: 'var(--font-size-base)',
              fontWeight: 600,
            }}
          >
            阿浪个人工作台
          </Title>
          <span
            className="header-subtitle"
            style={{
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--font-size-small)',
              marginLeft: 'var(--margin-base)',
              paddingLeft: 'var(--padding-base)',
              borderLeft: '1px solid var(--color-divider)'
            }}
          >
            广告投放数据分析
          </span>
          <Tag
            color="processing"
            style={{ cursor: 'pointer', fontSize: 10, marginLeft: 8, lineHeight: '18px', border: 'none', backgroundColor: '#E6F7FF', color: '#0064FF' }}
            onClick={() => setChangelogVisible(true)}
          >
            v{CURRENT_VERSION}
          </Tag>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {user && (
            <Space size="small">
              <Tag color={isAdmin ? 'gold' : 'blue'} style={{ margin: 0 }}>
                {isAdmin ? '管理员' : '渠道用户'}
              </Tag>
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                {user.username}
              </span>
              {channelTags}
            </Space>
          )}
          <Button
            type="text"
            icon={<ReloadOutlined spin={refreshing} />}
            onClick={handleRefresh}
            style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-small)' }}
          >
            刷新数据
          </Button>
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-small)' }}
          >
            退出
          </Button>
        </div>
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

      <Layout style={{ flex: 1, overflow: 'hidden' }}>
        <Sider
          width={200}
          breakpoint="lg"
          collapsedWidth={0}
          onBreakpoint={(broken) => setSiderCollapsed(broken)}
          trigger={null}
          collapsible
          collapsed={siderCollapsed}
          style={{
            backgroundColor: '#FFFFFF',
            borderRight: '1px solid var(--color-divider)',
            overflow: 'auto',
            height: '100%',
          }}
        >
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            openKeys={openKeys}
            onOpenChange={setOpenKeys}
            style={{
              height: '100%',
              borderRight: 'none',
              fontSize: 'var(--font-size-medium)',
              paddingTop: 'var(--padding-base)',
            }}
            items={menuItems}
            onClick={() => {
              if (window.innerWidth < 992) {
                setSiderCollapsed(true)
              }
            }}
          />
        </Sider>

        <Content
          className="main-content"
          style={{
            margin: 'var(--padding-extra-loose)',
            padding: 'var(--padding-extra-loose)',
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--radius-large)',
            minHeight: 280,
            overflow: 'auto',
            border: '1px solid var(--color-divider)',
          }}
        >
          <Breadcrumb
            style={{ marginBottom: 'var(--margin-loose)' }}
            items={(() => {
              const pathMap: Record<string, { parent: string; label: string }> = {
                '/dashboard': { parent: '投放管理', label: '数据总览' },
                '/channel-analysis': { parent: '投放管理', label: '渠道分析' },
                '/data-management': { parent: '投放管理', label: '数据管理' },
                '/merchant-analysis': { parent: '期商买断', label: '期商分析' },
                '/merchant-data': { parent: '期商买断', label: '期商数据' },
                '/schedule': { parent: '', label: '日程表' },
                '/ai-reports': { parent: '', label: '历史报告' },
                '/user-management': { parent: '', label: '用户管理' },
              }
              const match = pathMap[location.pathname]
              if (!match) return [{ title: '首页' }]
              const items = [{ title: match.parent }, { title: match.label }]
              if (!match.parent) return [{ title: match.label }]
              return items
            })()}
          />
          {children}
        </Content>
      </Layout>
      <Footer
        style={{
          textAlign: 'center',
          fontSize: 'var(--font-size-extra-small)',
          color: 'var(--color-text-tertiary)',
          padding: 'var(--padding-base) var(--padding-super-loose)',
          backgroundColor: '#F7F9FA',
          borderTop: '1px solid var(--color-divider)',
          flexShrink: 0,
        }}
      >
        阿浪个人工作台
      </Footer>
    </Layout>
  )
}

export default MainLayout
