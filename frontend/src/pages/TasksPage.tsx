import React, { useEffect, useState } from 'react';
import { Table, Tag, Button, Space, Input, Select, Row, Col, Card, Modal, Form, Typography, message, DatePicker, Popconfirm, Statistic, Progress } from 'antd';
import { PlusOutlined, CheckOutlined, DeleteOutlined, UnorderedListOutlined } from '@ant-design/icons';
import api from '../services/api';
import dayjs from 'dayjs';

const priorityColors: Record<string, string> = { high: 'red', medium: 'gold', low: 'green' };
const statusLabels: Record<string, string> = { pending: 'Ожидает', in_progress: 'В работе', completed: 'Выполнена', cancelled: 'Отменена' };
const statusColors: Record<string, string> = { pending: 'default', in_progress: 'blue', completed: 'green', cancelled: 'red' };

const TasksPage: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [stats, setStats] = useState<any>({});
  const [form] = Form.useForm();

  useEffect(() => { fetchData(); fetchStats(); }, []);
  useEffect(() => { fetchData(); }, [page, search, statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/tasks', { params: { page, page_size: 50, search: search || undefined, status: statusFilter } });
      setItems(res.data.items); setTotal(res.data.total);
    } finally { setLoading(false); }
  };

  const fetchStats = async () => {
    try { const res = await api.get('/tasks/stats'); setStats(res.data); } catch {}
  };

  const openCreate = () => { setEditItem(null); form.resetFields(); setModalOpen(true); };
  const openEdit = (item: any) => { setEditItem(item); form.setFieldsValue({ ...item, due_date: item.due_date ? dayjs(item.due_date) : null }); setModalOpen(true); };

  const handleSave = async (values: any) => {
    try {
      const data = { ...values, due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') : null };
      if (editItem) await api.put(`/tasks/${editItem.id}`, data);
      else await api.post('/tasks', data);
      message.success(editItem ? 'Задача обновлена' : 'Задача создана');
      setModalOpen(false); fetchData(); fetchStats();
    } catch { message.error('Ошибка'); }
  };

  const handleDelete = async (id: number) => {
    try { await api.delete(`/tasks/${id}`); message.success('Удалено'); fetchData(); fetchStats(); } catch { message.error('Ошибка'); }
  };

  const handleComplete = async (id: number) => {
    try { await api.put(`/tasks/${id}`, { status: 'completed' }); message.success('Задача выполнена'); fetchData(); fetchStats(); } catch { message.error('Ошибка'); }
  };

  const columns = [
    { title: 'Задача', dataIndex: 'title', key: 'title', ellipsis: true },
    { title: 'Категория', dataIndex: 'category', key: 'category', width: 120 },
    { title: 'Приоритет', dataIndex: 'priority', key: 'priority', width: 100, render: (p: string) => <Tag color={priorityColors[p]}>{p === 'high' ? 'Высокий' : p === 'medium' ? 'Средний' : 'Низкий'}</Tag> },
    { title: 'Статус', dataIndex: 'status', key: 'status', width: 110, render: (s: string) => <Tag color={statusColors[s]}>{statusLabels[s]}</Tag> },
    { title: 'Срок', dataIndex: 'due_date', key: 'due_date', width: 110 },
    {
      title: '', key: 'actions', width: 180,
      render: (_: any, r: any) => (
        <Space>
          {r.status !== 'completed' && <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => handleComplete(r.id)} />}
          <Button size="small" onClick={() => openEdit(r)}>Изменить</Button>
          <Popconfirm title="Удалить?" onConfirm={() => handleDelete(r.id)}><Button size="small" danger icon={<DeleteOutlined />} /></Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={3}><UnorderedListOutlined /> Задачи</Typography.Title>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card size="small"><Statistic title="Всего" value={stats.total || 0} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="Активные" value={(stats.pending || 0) + (stats.in_progress || 0)} valueStyle={{ color: '#1677ff' }} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="Просрочено" value={stats.overdue || 0} valueStyle={{ color: stats.overdue ? 'red' : undefined }} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="Выполнено" value={stats.completed || 0} valueStyle={{ color: '#52c41a' }} /></Card></Col>
      </Row>
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={8}><Input placeholder="Поиск..." prefix={<UnorderedListOutlined />} onChange={e => setSearch(e.target.value)} allowClear /></Col>
          <Col xs={12} sm={5}>
            <Select placeholder="Статус" allowClear style={{ width: '100%' }} onChange={setStatusFilter}
              options={Object.entries(statusLabels).map(([k, v]) => ({ value: k, label: v }))} />
          </Col>
          <Col xs={12} sm={5}><Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Новая задача</Button></Col>
        </Row>
      </Card>
      <Table dataSource={items} columns={columns} rowKey="id" loading={loading} pagination={{ current: page, pageSize: 50, total, onChange: p => setPage(p), showTotal: t => `Всего: ${t}` }} />

      <Modal title={editItem ? 'Редактировать задачу' : 'Новая задача'} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} width={600}>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="title" label="Название" rules={[{ required: true }]}><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="description" label="Описание"><Input.TextArea rows={3} /></Form.Item>
          <Row gutter={16}>
            <Col span={8}><Form.Item name="category" label="Категория"><Input placeholder="Например: Офис" /></Form.Item></Col>
            <Col span={8}><Form.Item name="priority" label="Приоритет"><Select options={[{ value: 'high', label: 'Высокий' }, { value: 'medium', label: 'Средний' }, { value: 'low', label: 'Низкий' }]} /></Form.Item></Col>
            <Col span={8}><Form.Item name="due_date" label="Срок"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default TasksPage;
