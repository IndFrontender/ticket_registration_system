import React, { useEffect, useState } from 'react';
import {
  Table, Button, Space, Input, Tag, Modal, Form,
  Select, Typography, message, Breadcrumb, Card,
} from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { clientsApi } from '../services/api';

const ClientsList: React.FC = () => {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await clientsApi.list({ search, page, page_size: 20 });
      setClients(res.data.items);
      setTotal(res.data.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClients(); }, [page, search]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (client: any) => {
    setEditing(client);
    form.setFieldsValue(client);
    setModalOpen(true);
  };

  const handleSave = async (values: any) => {
    try {
      if (editing) {
        await clientsApi.update(editing.id, values);
        message.success('Клиент обновлён');
      } else {
        await clientsApi.create(values);
        message.success('Клиент создан');
      }
      setModalOpen(false);
      fetchClients();
    } catch (e: any) {
      message.error('Ошибка: ' + (e.response?.data?.detail || 'неизвестная'));
    }
  };

  const handleDelete = async (id: number) => {
    Modal.confirm({
      title: 'Удалить клиента?',
      onOk: async () => {
        await clientsApi.delete(id);
        message.success('Клиент удалён');
        fetchClients();
      },
    });
  };

  const columns = [
    {
      title: 'Тип', dataIndex: 'client_type', key: 'client_type', width: 100,
      render: (t: string) => <Tag>{t === 'individual' ? 'Физ.лицо' : 'Юр.лицо'}</Tag>,
    },
    { title: 'Название / ФИО', dataIndex: 'name', key: 'name' },
    { title: 'Телефон', dataIndex: 'phone', key: 'phone' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Адрес', dataIndex: 'address', key: 'address', ellipsis: true },
    {
      title: '', key: 'actions', width: 100,
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Breadcrumb items={[{ title: 'Главная', href: '/' }, { title: 'Клиенты' }]} style={{ marginBottom: 16 }} />
      <Typography.Title level={3}>Клиенты</Typography.Title>

      <Card style={{ marginBottom: 16 }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Input
            placeholder="Поиск по имени, телефону, email..."
            prefix={<SearchOutlined />}
            style={{ width: 400 }}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Новый клиент</Button>
        </Space>
      </Card>

      <Table
        dataSource={clients}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page, pageSize: 20, total,
          onChange: (p) => setPage(p),
          showTotal: (t) => `Всего: ${t}`,
        }}
      />

      <Modal
        title={editing ? 'Редактировать клиента' : 'Новый клиент'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="client_type" label="Тип клиента" rules={[{ required: true }]}>
            <Select options={[
              { value: 'individual', label: 'Физическое лицо' },
              { value: 'legal', label: 'Юридическое лицо' },
            ]} />
          </Form.Item>
          <Form.Item name="name" label="Название / ФИО" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Телефон">
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input type="email" />
          </Form.Item>
          <Form.Item name="address" label="Адрес">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="inn" label="ИНН">
            <Input />
          </Form.Item>
          <Form.Item name="kpp" label="КПП">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ClientsList;
