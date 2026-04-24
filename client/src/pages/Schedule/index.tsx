import React, { useEffect, useState, useCallback } from 'react'
import {
  Calendar,
  Card,
  Badge,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Slider,
  Button,
  Tag,
  Timeline,
  Progress,
  Empty,
  Popconfirm,
  Row,
  Col,
  List,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FlagOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import { planService } from '@services/planService'
import { Plan, Milestone } from '@/types'

const { RangePicker } = DatePicker
const { TextArea } = Input

const PRIORITY_OPTIONS = [
  { label: 'P1 - 最高', value: 1, color: '#FF2436' },
  { label: 'P2 - 高', value: 2, color: '#FF661A' },
  { label: 'P3 - 中', value: 3, color: '#FF9500' },
  { label: 'P4 - 低', value: 4, color: '#3366FF' },
  { label: 'P5 - 最低', value: 5, color: '#858585' },
]

const STATUS_OPTIONS = [
  { label: '待开始', value: 'pending' },
  { label: '进行中', value: 'in_progress' },
  { label: '已完成', value: 'completed' },
  { label: '已延期', value: 'delayed' },
]

const TAG_ICON_OPTIONS = [
  { label: '📌 工作', value: '📌' },
  { label: '🏠 个人', value: '🏠' },
  { label: '🚨 紧急', value: '🚨' },
  { label: '📚 学习', value: '📚' },
  { label: '💡 创意', value: '💡' },
  { label: '🤝 会议', value: '🤝' },
]

function getPriorityColor(priority: number): string {
  return PRIORITY_OPTIONS.find((p) => p.value === priority)?.color || '#858585'
}

function getPriorityLabel(priority: number): string {
  return `P${priority}`
}

function getStatusTag(status: string) {
  const map: Record<string, { color: string; text: string }> = {
    pending: { color: 'default', text: '待开始' },
    in_progress: { color: 'processing', text: '进行中' },
    completed: { color: 'success', text: '已完成' },
    delayed: { color: 'warning', text: '已延期' },
  }
  const s = map[status] || map.pending
  return <Tag color={s.color}>{s.text}</Tag>
}

const Schedule: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(dayjs())
  const [plans, setPlans] = useState<Plan[]>([])
  const [top5Plans, setTop5Plans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(false)

  const [modalVisible, setModalVisible] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null)
  const [form] = Form.useForm()

  const [milestones, setMilestones] = useState<{ title: string; dueDate: string; completed: boolean }[]>([])

  const monthStr = currentDate.format('YYYY-MM')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [all, top] = await Promise.all([
        planService.getPlans(monthStr),
        planService.getTop5Plans(monthStr),
      ])
      setPlans(all)
      setTop5Plans(top)
    } catch (e) {
      console.error('Fetch plans error:', e)
    } finally {
      setLoading(false)
    }
  }, [monthStr])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const getPlansForDate = (date: Dayjs): Plan[] => {
    return plans.filter((p) => {
      const start = dayjs(p.startDate)
      const end = dayjs(p.endDate)
      return date.isSame(start, 'day') || date.isSame(end, 'day') || (date.isAfter(start, 'day') && date.isBefore(end, 'day'))
    })
  }

  const dateCellRender = (value: Dayjs) => {
    const list = getPlansForDate(value)
    return (
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {list.slice(0, 3).map((plan) => (
          <li key={plan.id}>
            <Badge
              color={getPriorityColor(plan.priority)}
              text={<span style={{ fontSize: 11 }}>{plan.tagIcon} {plan.title}</span>}
            />
          </li>
        ))}
        {list.length > 3 && <li style={{ fontSize: 11, color: '#999' }}>+{list.length - 3} 更多</li>}
      </ul>
    )
  }

  const handleSelectDate = (date: Dayjs) => {
    setSelectedDate(date)
    setEditingPlan(null)
    form.resetFields()
    form.setFieldsValue({
      dateRange: [date, date],
      priority: 3,
      status: 'pending',
      progress: 0,
    })
    setMilestones([])
    setModalVisible(true)
  }

  const handleEditPlan = (plan: Plan) => {
    setEditingPlan(plan)
    setSelectedDate(dayjs(plan.startDate))
    form.setFieldsValue({
      title: plan.title,
      content: plan.content,
      priority: plan.priority,
      status: plan.status,
      dateRange: [dayjs(plan.startDate), dayjs(plan.endDate)],
      progress: plan.progress,
      tag: plan.tag,
      tagIcon: plan.tagIcon,
    })
    setMilestones(plan.milestones.map((m) => ({ title: m.title, dueDate: m.dueDate, completed: m.completed })))
    setModalVisible(true)
  }

  const handleDeletePlan = async (id: number) => {
    try {
      await planService.deletePlan(id)
      fetchData()
    } catch (e) {
      console.error('Delete plan error:', e)
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const payload = {
        title: values.title,
        content: values.content,
        priority: values.priority,
        status: values.status,
        startDate: values.dateRange[0].format('YYYY-MM-DD'),
        endDate: values.dateRange[1].format('YYYY-MM-DD'),
        progress: values.progress,
        tag: values.tag,
        tagIcon: values.tagIcon,
        milestones: milestones.filter((m) => m.title.trim()),
      }

      if (editingPlan) {
        await planService.updatePlan(editingPlan.id, payload)
      } else {
        await planService.createPlan(payload)
      }
      setModalVisible(false)
      fetchData()
    } catch (e) {
      console.error('Submit plan error:', e)
    }
  }

  const addMilestone = () => {
    setMilestones([...milestones, { title: '', dueDate: dayjs().format('YYYY-MM-DD'), completed: false }])
  }

  const updateMilestone = (index: number, field: string, value: any) => {
    const next = [...milestones]
    ;(next[index] as any)[field] = value
    setMilestones(next)
  }

  const removeMilestone = (index: number) => {
    setMilestones(milestones.filter((_, i) => i !== index))
  }

  return (
    <div>
      <h1 style={{ fontSize: 'var(--font-size-extra-large)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--margin-super-loose)' }}>
        日程表
      </h1>

      {/* Top 5 关键事项 */}
      <Card
        title={<span><FlagOutlined /> 本月关键事项（Top 5）</span>}
        style={{ marginBottom: 'var(--margin-super-loose)', borderRadius: 'var(--radius-extra-large)', boxShadow: 'var(--shadow-elevation-small)' }}
      >
        {top5Plans.length > 0 ? (
          <List
            dataSource={top5Plans}
            renderItem={(plan) => (
              <List.Item
                actions={[
                  <Button type="text" icon={<EditOutlined />} onClick={() => handleEditPlan(plan)} />,
                  <Popconfirm title="确定删除？" onConfirm={() => handleDeletePlan(plan.id)}>
                    <Button type="text" danger icon={<DeleteOutlined />} />
                  </Popconfirm>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <span>
                      <Tag color={getPriorityColor(plan.priority)}>{getPriorityLabel(plan.priority)}</Tag>
                      <span style={{ marginLeft: 8 }}>{plan.tagIcon} {plan.title}</span>
                      <span style={{ marginLeft: 8 }}>{getStatusTag(plan.status)}</span>
                    </span>
                  }
                  description={
                    <span style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-text-secondary)' }}>
                      {dayjs(plan.startDate).format('MM-DD')} ~ {dayjs(plan.endDate).format('MM-DD')}
                      {plan.content && ` · ${plan.content}`}
                    </span>
                  }
                />
              </List.Item>
            )}
          />
        ) : (
          <Empty description="本月暂无关键事项" />
        )}
      </Card>

      {/* 日历 */}
      <Card
        title={<span><ClockCircleOutlined /> {currentDate.format('YYYY年M月')} 日历</span>}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleSelectDate(dayjs())}>
            新增计划
          </Button>
        }
        style={{ marginBottom: 'var(--margin-super-loose)', borderRadius: 'var(--radius-extra-large)', boxShadow: 'var(--shadow-elevation-small)' }}
      >
        <Calendar
          value={currentDate}
          onChange={setCurrentDate}
          onSelect={handleSelectDate}
          dateCellRender={dateCellRender}
        />
      </Card>

      {/* 里程碑进度 */}
      <Card
        title={<span><ExclamationCircleOutlined /> 所有计划里程碑进度</span>}
        style={{ borderRadius: 'var(--radius-extra-large)', boxShadow: 'var(--shadow-elevation-small)' }}
      >
        {plans.length > 0 ? (
          <Row gutter={[16, 16]}>
            {plans.map((plan) => (
              <Col xs={24} md={12} lg={8} key={plan.id}>
                <Card
                  size="small"
                  title={
                    <span>
                      <Tag color={getPriorityColor(plan.priority)}>{getPriorityLabel(plan.priority)}</Tag>
                      <span style={{ marginLeft: 4 }}>{plan.tagIcon} {plan.title}</span>
                    </span>
                  }
                  extra={getStatusTag(plan.status)}
                  style={{ borderRadius: 'var(--radius-large)' }}
                >
                  <div style={{ marginBottom: 12 }}>
                    <Progress percent={plan.progress} size="small" status={plan.progress === 100 ? 'success' : 'active'} />
                  </div>
                  {plan.milestones.length > 0 ? (
                    <Timeline
                      mode="left"
                      items={plan.milestones.map((m) => ({
                        dot: m.completed ? <CheckCircleOutlined style={{ color: 'var(--color-status-success)' }} /> : <ClockCircleOutlined style={{ color: 'var(--color-text-tertiary)' }} />,
                        label: dayjs(m.dueDate).format('MM-DD'),
                        children: <span style={{ textDecoration: m.completed ? 'line-through' : 'none', color: m.completed ? 'var(--color-text-tertiary)' : 'inherit' }}>{m.title}</span>,
                      }))}
                    />
                  ) : (
                    <div style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-text-tertiary)' }}>暂无里程碑</div>
                  )}
                </Card>
              </Col>
            ))}
          </Row>
        ) : (
          <Empty description="暂无计划，点击日历日期添加" />
        )}
      </Card>

      {/* 新增/编辑 Modal */}
      <Modal
        title={editingPlan ? '编辑计划' : '新增计划'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        width={640}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={16}>
              <Form.Item name="title" label="计划名称" rules={[{ required: true, message: '请输入名称' }]}>
                <Input placeholder="输入计划名称" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="tagIcon" label="标签图标">
                <Select placeholder="选择标签" allowClear>
                  {TAG_ICON_OPTIONS.map((t) => (
                    <Select.Option key={t.value} value={t.value}>{t.label}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="content" label="计划内容">
            <TextArea rows={2} placeholder="输入计划详细内容" />
          </Form.Item>

          <Row gutter={[16, 0]}>
            <Col xs={24} sm={8}>
              <Form.Item name="priority" label="优先级" rules={[{ required: true }]}>
                <Select>
                  {PRIORITY_OPTIONS.map((p) => (
                    <Select.Option key={p.value} value={p.value}>
                      <span style={{ color: p.color }}>{p.label}</span>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="status" label="状态" rules={[{ required: true }]}>
                <Select>
                  {STATUS_OPTIONS.map((s) => (
                    <Select.Option key={s.value} value={s.value}>{s.label}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="dateRange" label="时间范围" rules={[{ required: true, message: '请选择时间范围' }]}>
                <RangePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="progress" label={`完成进度: ${form.getFieldValue('progress') || 0}%`}>
            <Slider min={0} max={100} step={5} />
          </Form.Item>

          <div style={{ marginBottom: 12, fontWeight: 'bold' }}>里程碑</div>
          {milestones.map((m, idx) => (
            <Row gutter={[8, 8]} key={idx} style={{ marginBottom: 8 }}>
              <Col span={12}>
                <Input
                  placeholder="里程碑名称"
                  value={m.title}
                  onChange={(e) => updateMilestone(idx, 'title', e.target.value)}
                />
              </Col>
              <Col span={8}>
                <DatePicker
                  style={{ width: '100%' }}
                  value={m.dueDate ? dayjs(m.dueDate) : null}
                  onChange={(d) => updateMilestone(idx, 'dueDate', d ? d.format('YYYY-MM-DD') : '')}
                />
              </Col>
              <Col span={4}>
                <Button danger size="small" onClick={() => removeMilestone(idx)}>删除</Button>
              </Col>
            </Row>
          ))}
          <Button type="dashed" block icon={<PlusOutlined />} onClick={addMilestone}>
            添加里程碑
          </Button>
        </Form>
      </Modal>
    </div>
  )
}

export default Schedule
