import React, { useEffect, useState } from 'react';
import {
  Table, Tag, Button, Space, Input, Select, Row, Col, Card, Modal, Form,
  Typography, DatePicker, InputNumber, message, Breadcrumb,
} from 'antd';
import {
  PlusOutlined, SearchOutlined, FilterOutlined, EyeOutlined, FileExcelOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { ticketsApi, clientsApi, reportsApi } from '../services/api';
import dayjs from 'dayjs';

const statusColors: Record<string, string> = { new: 'blue', in_progress: 'orange', completed: 'green', closed: 'default' };
const statusLabels: Record<string, string> = { new: 'Новая', in_progress: 'В работе', completed: 'Выполнена', closed: 'Закрыта' };
const priorityColors: Record<string, string> = { critical: 'red', high: 'orange', medium: 'gold', low: 'green' };
const priorityLabels: Record<string, string> = { critical: 'Критический', high: 'Высокий', medium: 'Средний', low: 'Низкий' };

const TicketsList: React.FC = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const exportExcel = async () => {
    try {
      const res = await reportsApi.generate({
        entity_type: 'tickets',
        columns: ['number', 'client_name', 'short_description', 'priority', 'status', 'work_date', 'created_at'],
        filters: Object.entries(filters).filter(([k, v]) => v && k !== 'page').map(([k, v]) => ({ field: k, op: 'eq', value: v })),
        title: 'Заявки',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = `tickets_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click(); window.URL.revokeObjectURL(url);
      message.success('Excel выгружен');
    } catch { message.error('Ошибка выгрузки'); }
  };

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = { ...filters, page, page_size: 20 };
      const res = await ticketsApi.list(params);
      setTickets(res.data.items);
      setTotal(res.data.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTickets(); }, [page, filters]);

  const fetchClients = async () => {
    const res = await clientsApi.list({ page_size: 100 });
    setClients(res.data.items);
  };

  const handleCreate = async (values: any) => {
    try {
      await ticketsApi.create(values);
      message.success('Заявка создана');
      setModalOpen(false);
      form.resetFields();
      fetchTickets();
    } catch (e: any) {
      message.error('Ошибка: ' + (e.response?.data?.detail || 'неизвестная'));
    }
  };

  const columns = [
    {
      title: '№ заявки', dataIndex: 'number', key: 'number',
      render: (text: string, record: any) => (
        <a onClick={() => navigate(`/tickets/${record.id}`)} style={{ fontWeight: 600 }}>{text}</a>
      ),
    },
    { title: 'Клиент', dataIndex: 'client_name', key: 'client_name' },
    {
      title: 'Статус', dataIndex: 'status', key: 'status',
      render: (s: string) => <Tag color={statusColors[s]}>{statusLabels[s]}</Tag>,
    },
    {
      title: 'Приоритет', dataIndex: 'priority', key: 'priority',
      render: (p: string) => <Tag color={priorityColors[p]}>{priorityLabels[p]}</Tag>,
    },
    {
      title: 'Создана', dataIndex: 'created_at', key: 'created_at',
      render: (d: string) => dayjs(d).format('DD.MM.YYYY HH:mm'),
    },
    {
      title: '', key: 'actions',
      render: (_: any, record: any) => (
        <Button type="link" icon={<EyeOutlined />} onClick={() => navigate(`/tickets/${record.id}`)} />
      ),
    },
  ];

  return (
    <div>
      <Breadcrumb items={[{ title: 'Главная', href: '/' }, { title: 'Заявки' }]} style={{ marginBottom: 16 }} />
      <Typography.Title level={3}>Заявки</Typography.Title>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={8}>
            <Input
              placeholder="Поиск по номеру, ФИО, организации..."
              prefix={<SearchOutlined />}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              allowClear
            />
          </Col>
          <Col xs={12} sm={5}>
            <Select
              placeholder="Статус"
              style={{ width: '100%' }}
              allowClear
              onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
              options={Object.entries(statusLabels).map(([k, v]) => ({ value: k, label: v }))}
            />
          </Col>
          <Col xs={12} sm={5}>
            <Select
              placeholder="Приоритет"
              style={{ width: '100%' }}
              allowClear
              onChange={(v) => setFilters((f) => ({ ...f, priority: v }))}
              options={Object.entries(priorityLabels).map(([k, v]) => ({ value: k, label: v }))}
            />
          </Col>
          <Col xs={24} sm={6}>
            <Space>
              <Button
                icon={<FilterOutlined />}
                onClick={() => { setFilters({}); setPage(1); }}
              >
                Сброс
              </Button>
              <Button icon={<FileExcelOutlined />} onClick={exportExcel}>
                Excel
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => { fetchClients(); setModalOpen(true); }}>
                Новая заявка
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Table
        dataSource={tickets}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize: 20,
          total,
          onChange: (p) => setPage(p),
          showTotal: (t) => `Всего: ${t}`,
        }}
      />

      <Modal
        title="Новая заявка"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="client_id" label="Клиент">
            <Select
              showSearch
              placeholder="Выберите клиента"
              optionFilterProp="label"
              options={clients.map((c) => ({ value: c.id, label: `${c.name} (${c.phone || c.email || ''})` }))}
            />
          </Form.Item>
          <Form.Item name="short_description" label="Краткое описание" rules={[{ required: true }]}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="full_description" label="Подробное описание">
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="priority" label="Приоритет">
            <Select
              options={Object.entries(priorityLabels).map(([k, v]) => ({ value: k, label: v }))}
              placeholder="Автоопределение"
              allowClear
            />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}><Form.Item name="work_date" label="Дата работы"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item name="review_date" label="Дата проверки"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item name="warranty_months" label="Гарантия (мес)"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default TicketsList;
