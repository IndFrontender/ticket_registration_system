import React, { useEffect, useState } from 'react';
import {
  Card, Table, Button, Space, Typography, message, Modal, Form,
  Input, Select, Tag, Switch, Popconfirm, Descriptions,
} from 'antd';
import { PlusOutlined, UserOutlined, DeleteOutlined, EditOutlined, CrownOutlined } from '@ant-design/icons';
import api from '../services/api';

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [form] = Form.useForm();

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/auth/users');
      setUsers(res.data);
    } catch { message.error('Ошибка загрузки'); }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditUser(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (u: any) => {
    setEditUser(u);
    form.setFieldsValue({ username: u.username, full_name: u.full_name, role: u.role });
    setModalOpen(true);
  };

  const handleSave = async (values: any) => {
    try {
      if (editUser) {
        await api.put(`/api/auth/users/${editUser.id}`, values);
        message.success('Пользователь обновлён');
      } else {
        await api.post('/api/auth/users', values);
        message.success('Пользователь создан');
      }
      setModalOpen(false);
      fetchUsers();
    } catch (e: any) {
      message.error(e.response?.data?.detail || 'Ошибка');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/api/auth/users/${id}`);
      message.success('Пользователь удалён');
      fetchUsers();
    } catch (e: any) {
      message.error(e.response?.data?.detail || 'Ошибка');
    }
  };

  const toggleActive = async (user: any, active: boolean) => {
    try {
      await api.put(`/api/auth/users/${user.id}`, { is_active: active });
      message.success(active ? 'Пользователь активирован' : 'Пользователь заблокирован');
      fetchUsers();
    } catch { message.error('Ошибка'); }
  };

  const columns = [
    {
      title: 'Имя', dataIndex: 'username', key: 'username',
      render: (t: string, r: any) => (
        <Space>
          <UserOutlined />
          {t}
          {r.role === 'admin' && <CrownOutlined style={{ color: '#faad14' }} />}
        </Space>
      ),
    },
    { title: 'Полное имя', dataIndex: 'full_name', key: 'full_name' },
    {
      title: 'Роль', dataIndex: 'role', key: 'role', width: 140,
      render: (r: string) => (
        <Tag color={r === 'admin' ? 'gold' : 'blue'}>
          {r === 'admin' ? 'Администратор' : 'Мастер'}
        </Tag>
      ),
    },
    {
      title: 'Статус', dataIndex: 'is_active', key: 'active', width: 100,
      render: (a: boolean, r: any) => (
        <Switch checked={a} onChange={(v) => toggleActive(r, v)} size="small" />
      ),
    },
    {
      title: '', key: 'actions', width: 140,
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm title="Удалить пользователя?" onConfirm={() => handleDelete(r.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={3}><UserOutlined /> Управление пользователями</Typography.Title>

      <Card style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Новый пользователь
        </Button>
      </Card>

      <Card>
        <Table
          dataSource={users} columns={columns} rowKey="id"
          loading={loading} pagination={false}
        />
      </Card>

      <Modal
        title={editUser ? 'Редактировать пользователя' : 'Новый пользователь'}
        open={modalOpen} onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()} width={450}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="username" label="Имя пользователя" rules={[{ required: true }]}>
            <Input disabled={!!editUser} />
          </Form.Item>
          {!editUser && (
            <Form.Item name="password" label="Пароль" rules={[{ required: true }]}>
              <Input.Password />
            </Form.Item>
          )}
          {editUser && (
            <Form.Item name="password" label="Новый пароль (оставьте пустым)">
              <Input.Password />
            </Form.Item>
          )}
          <Form.Item name="full_name" label="Полное имя">
            <Input />
          </Form.Item>
          <Form.Item name="role" label="Роль" rules={[{ required: true }]}>
            <Select options={[
              { value: 'master', label: 'Мастер' },
              { value: 'admin', label: 'Администратор' },
            ]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UsersPage;
