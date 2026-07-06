import React, { useEffect, useState, useCallback } from 'react'
import {
  Card, Table, Button, Modal, Form, Input, Select, Tag, Popconfirm, message, Empty, Space,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { request } from '@services/api/client'
import { CARD_BASE } from '@utils/constants'

interface UserRow {
  id: number
  username: string
  role: string
  permittedChannels: string | null
  createdAt: string
}

const CHANNEL_OPTIONS = [
  'oppo', 'vivo', 'xiaomi', 'hihonor', 'rongyao', 'wangyi',
  'baidu', 'huawei', 'meizu', 'samsung', 'mi',
]

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserRow | null>(null)
  const [form] = Form.useForm()

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await request.get('/v1/user/users')
      setUsers(data as unknown as UserRow[])
    } catch (e) {
      message.error('获取用户列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleCreate = () => {
    setEditingUser(null)
    form.resetFields()
    form.setFieldsValue({ role: 'channel_user', permittedChannels: [] })
    setModalOpen(true)
  }

  const handleEdit = (user: UserRow) => {
    setEditingUser(user)
    let channels: string[] = []
    try {
      if (user.permittedChannels) channels = JSON.parse(user.permittedChannels)
    } catch {}
    form.setFieldsValue({
      username: user.username,
      role: user.role,
      permittedChannels: channels,
      password: '',
    })
    setModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await request.delete(`/v1/user/users/${id}`)
      message.success('用户已删除')
      fetchUsers()
    } catch (e: any) {
      message.error(e.message || '删除失败')
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (editingUser) {
        await request.put(`/v1/user/users/${editingUser.id}`, values)
        message.success('用户已更新')
      } else {
        await request.post('/v1/user/users', values)
        message.success('用户已创建')
      }
      setModalOpen(false)
      fetchUsers()
    } catch (e: any) {
      if (e.message && !e.errorFields) message.error(e.message || '操作失败')
    }
  }

  const role = Form.useWatch('role', form)

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: '用户名', dataIndex: 'username', key: 'username' },
    {
      title: '角色', dataIndex: 'role', key: 'role', width: 120,
      render: (v: string) => (
        <Tag color={v === 'admin' ? 'gold' : 'blue'}>
          {v === 'admin' ? '管理员' : '渠道用户'}
        </Tag>
      ),
    },
    {
      title: '渠道权限', dataIndex: 'permittedChannels', key: 'permittedChannels',
      render: (v: string | null, record: UserRow) => {
        if (record.role === 'admin') return <Tag color="default">全部渠道</Tag>
        try {
          const arr = v ? JSON.parse(v) : []
          if (arr.length === 0) return <Tag color="red">无权限</Tag>
          return arr.map((c: string) => <Tag key={c} color="blue">{c}</Tag>)
        } catch {
          return <span>-</span>
        }
      },
    },
    {
      title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 170,
      render: (v: string) => new Date(v).toLocaleString('zh-CN'),
    },
    {
      title: '操作', key: 'action', width: 130,
      render: (_: any, record: UserRow) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确定删除该用户？" onConfirm={() => handleDelete(record.id)} okButtonProps={{ danger: true }}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--margin-loose)' }}>
        <h1 style={{ fontSize: 'var(--font-size-extra-large)', fontWeight: 'var(--font-weight-medium)', margin: 0 }}>
          用户管理
        </h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          添加用户
        </Button>
      </div>

      <Card style={CARD_BASE} bodyStyle={{ padding: '20px 24px' }}>
        <Table
          dataSource={users}
          rowKey="id"
          columns={columns}
          loading={loading}
          pagination={false}
          locale={{ emptyText: <Empty description="暂无用户" /> }}
        />
      </Card>

      <Modal
        title={editingUser ? '编辑用户' : '添加用户'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        width={520}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input placeholder="用户名" disabled={!!editingUser} />
          </Form.Item>

          <Form.Item
            name="password"
            label={editingUser ? '新密码（留空则不修改）' : '密码'}
            rules={editingUser ? [] : [{ required: true, message: '请输入密码' }]}
          >
            <Input.Password placeholder={editingUser ? '留空则不修改密码' : '设置密码'} />
          </Form.Item>

          <Form.Item name="role" label="角色" rules={[{ required: true }]}>
            <Select
              options={[
                { label: '管理员（全部渠道 + 全部数据）', value: 'admin' },
                { label: '渠道用户（仅限指定渠道）', value: 'channel_user' },
              ]}
            />
          </Form.Item>

          {role === 'channel_user' && (
            <Form.Item name="permittedChannels" label="允许访问的渠道" rules={[{ required: true, message: '请至少选择一个渠道', type: 'array' }]}>
              <Select
                mode="multiple"
                placeholder="选择渠道"
                options={CHANNEL_OPTIONS.map((c) => ({ label: c, value: c }))}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  )
}

export default UserManagement
