import React from 'react'
import { Row, Col, Card, Statistic } from 'antd'

const Dashboard: React.FC = () => {
  return (
    <div>
      <h1 style={{ fontSize: 'var(--font-size-extra-large)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--margin-super-loose)' }}>
        数据总览
      </h1>

      {/* 昨日数据 */}
      <h2 style={{ fontSize: 'var(--font-size-large)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--margin-loose)' }}>
        昨日数据
      </h2>
      <Row gutter={[16, 16]} style={{ marginBottom: 'var(--margin-super-loose)' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="昨日花费" value={150000} prefix="¥" className="font-number" />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="昨日激活" value={1200} className="font-number" />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="昨日开户" value={800} className="font-number" />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="昨日ROI" value={2.5} precision={2} className="font-number" />
          </Card>
        </Col>
      </Row>

      {/* 本周数据 */}
      <h2 style={{ fontSize: 'var(--font-size-large)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--margin-loose)' }}>
        本周数据
      </h2>
      <Row gutter={[16, 16]} style={{ marginBottom: 'var(--margin-super-loose)' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="本周花费" value={850000} prefix="¥" className="font-number" />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="本周激活" value={6500} className="font-number" />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="本周开户" value={4200} className="font-number" />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="本周ROI" value={2.3} precision={2} className="font-number" />
          </Card>
        </Col>
      </Row>

      {/* 本月数据 */}
      <h2 style={{ fontSize: 'var(--font-size-large)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--margin-loose)' }}>
        本月数据
      </h2>
      <Row gutter={[16, 16]} style={{ marginBottom: 'var(--margin-super-loose)' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="本月花费" value={3500000} prefix="¥" className="font-number" />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="本月激活" value={28000} className="font-number" />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="本月开户" value={18500} className="font-number" />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="本月ROI" value={2.4} precision={2} className="font-number" />
          </Card>
        </Col>
      </Row>

      {/* 排名图表 */}
      <h2 style={{ fontSize: 'var(--font-size-large)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--margin-loose)' }}>
        渠道投放排名
      </h2>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="渠道花费排名">
            <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-tertiary)' }}>
              图表区域 - 渠道花费排名柱状图
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="渠道效果排名">
            <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-tertiary)' }}>
              图表区域 - 渠道效果排名复合图
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Dashboard
