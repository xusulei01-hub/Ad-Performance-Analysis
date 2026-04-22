import React from 'react'
import { Row, Col, Card, Select, DatePicker, Statistic } from 'antd'

const { Option } = Select
const { RangePicker } = DatePicker

const ChannelAnalysis: React.FC = () => {
  return (
    <div>
      <h1 style={{ fontSize: 'var(--font-size-extra-large)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--margin-super-loose)' }}>
        渠道分析
      </h1>

      {/* 筛选器 */}
      <Card style={{ marginBottom: 'var(--margin-super-loose)' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={12}>
            <div>
              <div style={{ marginBottom: 'var(--margin-tight)', fontWeight: 'var(--font-weight-medium)', fontSize: 'var(--font-size-medium)' }}>
                选择渠道
              </div>
              <Select style={{ width: '100%' }} placeholder="请选择渠道" defaultValue="all">
                <Option value="all">全部渠道</Option>
                <Option value="hihonor">hihonor</Option>
                <Option value="oppo">oppo</Option>
                <Option value="vivo">vivo</Option>
              </Select>
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div>
              <div style={{ marginBottom: 'var(--margin-tight)', fontWeight: 'var(--font-weight-medium)', fontSize: 'var(--font-size-medium)' }}>
                选择时间范围
              </div>
              <RangePicker style={{ width: '100%' }} />
            </div>
          </Col>
        </Row>
      </Card>

      {/* 渠道总览 */}
      <h2 style={{ fontSize: 'var(--font-size-large)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--margin-loose)' }}>
        渠道总览
      </h2>
      <Row gutter={[16, 16]} style={{ marginBottom: 'var(--margin-super-loose)' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="总花费" value={250000} prefix="¥" className="font-number" />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="总激活" value={2000} className="font-number" />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="总开户" value={1500} className="font-number" />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="ROI" value={2.8} precision={2} className="font-number" />
          </Card>
        </Col>
      </Row>

      {/* 分计划分析 */}
      <h2 style={{ fontSize: 'var(--font-size-large)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--margin-loose)' }}>
        分计划分析（Top 5）
      </h2>
      <Row gutter={[16, 16]} style={{ marginBottom: 'var(--margin-super-loose)' }}>
        <Col xs={24} lg={12} xl={6}>
          <Card title="分计划花费">
            <div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-tertiary)' }}>
              图表区域
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12} xl={6}>
          <Card title="分计划激活">
            <div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-tertiary)' }}>
              图表区域
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12} xl={6}>
          <Card title="分计划开户">
            <div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-tertiary)' }}>
              图表区域
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12} xl={6}>
          <Card title="分计划ROI">
            <div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-tertiary)' }}>
              图表区域
            </div>
          </Card>
        </Col>
      </Row>

      {/* 每日趋势 */}
      <h2 style={{ fontSize: 'var(--font-size-large)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--margin-loose)' }}>
        每日趋势
      </h2>
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card title="每日数据变化折线图">
            <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-tertiary)' }}>
              图表区域 - 每日趋势折线图
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default ChannelAnalysis
