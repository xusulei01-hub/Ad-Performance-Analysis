import React, { ReactNode, useState, useEffect } from 'react'
import { Layout, Menu, Typography, Button, Modal, Tag, Timeline, Breadcrumb } from 'antd'
import {
  DashboardOutlined,
  ReloadOutlined,
  ShopOutlined,
  MenuOutlined,
  CalendarOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import { Link, useLocation } from 'react-router-dom'
import { useRefresh } from '@components/layout/RefreshContext'

const { Header, Sider, Content, Footer } = Layout
const { Title } = Typography

const CURRENT_VERSION = '2.3'

const CHANGELOG = [
  {
    version: '2.3',
    date: '2026-05-21',
    changes: [
      'AI 报告存档：分析结果可保存到数据库，支持历史回溯查看、删除和重新导出',
      'Word 导出：AI 分析报告可一键导出为图文并茂的 .docx 文档，含标题、数据摘要表格、分级标题、加粗重点、有序/无序列表',
      '存储空间预警：报告数量上限 100 条，接近上限时自动提醒清理旧报告',
      '新增「历史报告」独立页面：左侧导航栏单开 Tab，列表展示全部存档报告，支持查看、导出、删除',
      'AI 分析扩展：渠道分析和期商分析页面新增 AI 诊断面板，支持渠道/计划/期商多维分析',
      '前后端一致性修复：修复期商筛选、表格排序等参数命名不匹配导致的隐性 bug',
      '代码规范：期商成本提取命名常量，CPA 计算统一使用工具函数，计划更新接口添加字段校验',
    ],
  },
  {
    version: '2.2',
    date: '2026-05-14',
    changes: [
      'AI 数据诊断：数据总览新增 AI 分析面板，点击即可自动分析当前数据并给出投放建议',
      '后端重构：代码结构模块化（拆分超大路由文件、提取服务层/工具层/常量/类型），消除大量重复代码',
      '新增验证中间件：关键接口自动校验必填字段和枚举值，错误处理更规范',
      '性能优化：页面布局冻结导航栏和侧边栏，内容区独立滚动',
    ],
  },
  {
    version: '2.1',
    date: '2026-04-29',
    changes: [
      '体验优化：筛选器改为手动查询，避免切换筛选项时自动刷新',
      '体验优化：表格新增表头固定 + 列排序，浏览长列表更方便',
      '视觉升级：各指标卡片使用独立配色（花费蓝/激活橙/开户绿/ROI紫等），一眼识别',
      '视觉升级：每日趋势图默认显示核心指标（花费/激活/开户），按需开启其他',
      '新增功能：数据列表支持一键导出为 Excel（CSV 格式）',
      '新增功能：页面顶部面包屑导航 + 全局刷新改为局部数据刷新',
      '移动端优化：手机查看时卡片改为两列布局，弹窗宽度自适应',
    ],
  },
  {
    version: '2.0',
    date: '2026-04-28',
    changes: [
      '页面全新改版：数据总览拆分为昨日/本周/本月三个标签页切换查看',
      '视觉统一升级：所有页面卡片、阴影、间距保持一致风格',
      '菜单优化：投放管理（数据总览/渠道分析/数据管理）和期商买断（期商分析/期商数据）分组展示，可展开收起',
      '图表风格统一：坐标轴、网格线、字体等细节优化',
    ],
  },
  {
    version: '1.4',
    date: '2026-04-27',
    changes: [
      '数据总览新增迷你趋势图：本周和本月卡片可看花费与激活每日走势',
      '渠道分析新增渠道对比表：同时选多个渠道时，自动汇总各渠道指标对比',
      '系统性能优化：大批量数据查询速度提升',
    ],
  },
  {
    version: '1.3',
    date: '2026-04-27',
    changes: [
      '新增目标管理：可设定每周、每月的花费/激活/开户/ROI目标，卡片显示完成进度',
      '新增 CPA（单个激活成本）指标：总览和渠道分析均可查看',
      '新增转化漏斗图：曝光→点击→下载→激活→开户，一图看清转化流失',
      '数据异常自动标记：指标波动超过 30% 时红色高亮提醒',
      '渠道分析新功能：点击柱状图可查看单个计划的每日趋势',
      '渠道分析新功能：快捷日期按钮（昨日/近7天/近30天/本周/本月/上月）',
      '数据管理新功能：上传历史记录 + 误传撤销功能',
    ],
  },
  {
    version: '1.2',
    date: '2026-04-24',
    changes: [
      '新增日程表：月度日历视图，点击任意日期即可添加当日计划',
      '计划功能：支持设置名称、内容、优先级（P1-P5）、状态、完成进度',
      '里程碑功能：每个计划可添加多个里程碑节点，跟踪关键节点完成情况',
      '首页展示本月最优先的 5 个关键事项',
      '所有计划的里程碑进度总览',
    ],
  },
  {
    version: '1.1',
    date: '2026-04-23',
    changes: [
      '新增期商买断数据模块（与广告投放数据独立管理）',
      '期商数据上传：支持 Excel 拖拽上传，按用户 ID 自动去重，重复上传自动更新',
      '期商名称映射：可为期商 ID 设置中文名称，报表中显示中文名',
      '期商分析：按时间/期商/渠道查看消耗、开户数、开户率、开户成本',
      '渠道分析：各渠道留资数和开户率对比',
    ],
  },
  {
    version: '1.0',
    date: '2026-04-22',
    changes: [
      '端外买断工作台正式上线',
      '数据管理：支持媒体数据表 + 转化数据表双文件上传，自动匹配去重入库',
      '渠道名称映射：自动将不同来源的渠道名统一（如 mi→xiaomi）',
      '数据总览：昨日/本周/本月花费、激活、开户、ROI 一目了然',
      '渠道分析：分计划排名 + 每日趋势折线图，支持多指标同时查看',
    ],
  },
]

interface MainLayoutProps {
  children: ReactNode
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const location = useLocation()
  const { triggerRefresh } = useRefresh()
  const [refreshing, setRefreshing] = useState(false)
  const [changelogVisible, setChangelogVisible] = useState(false)
  const [siderCollapsed, setSiderCollapsed] = useState(false)
  const [openKeys, setOpenKeys] = useState<string[]>([])

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

  const menuItems = [
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
    {
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
    },
    {
      key: '/ai-reports',
      icon: <FileTextOutlined />,
      label: <Link to="/ai-reports">历史报告</Link>,
    },
  ]

  return (
    <Layout style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header
        style={{
          backgroundColor: 'var(--color-background-nav)',
          padding: '0 var(--padding-extra-loose)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
          zIndex: 10,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--margin-loose)' }}>
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={() => setSiderCollapsed(!siderCollapsed)}
            style={{
              color: 'var(--color-text-inverse)',
              display: 'none',
            }}
            className="mobile-menu-btn"
          />
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
          <span
            className="header-subtitle"
            style={{
              color: 'var(--color-text-inverse-secondary)',
              fontSize: 'var(--font-size-small)',
            }}
          >
            广告投放数据分析
          </span>
          <Tag
            color="blue"
            style={{ cursor: 'pointer', fontSize: 11, marginLeft: 4, lineHeight: '18px' }}
            onClick={() => setChangelogVisible(true)}
          >
            v{CURRENT_VERSION}
          </Tag>
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
            backgroundColor: 'var(--color-foreground-layer1)',
            boxShadow: 'var(--shadow-elevation-small)',
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
            margin: 'var(--padding-super-loose)',
            padding: 'var(--padding-super-loose)',
            backgroundColor: 'var(--color-foreground-layer1)',
            borderRadius: 'var(--radius-extra-large)',
            minHeight: 280,
            overflow: 'auto',
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
          fontSize: 'var(--font-size-small)',
          color: 'var(--color-text-secondary)',
          padding: 'var(--padding-loose) var(--padding-super-loose)',
          backgroundColor: 'var(--color-background-secondary)',
          borderTop: '1px solid var(--color-border-secondary)',
          flexShrink: 0,
        }}
      >
        阿浪个人工作台
      </Footer>
    </Layout>
  )
}

export default MainLayout
