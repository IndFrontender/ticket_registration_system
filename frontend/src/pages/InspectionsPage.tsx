import React, { useEffect, useState } from 'react';
import { Table, Tag, Button, Space, Input, Select, Row, Col, Card, Modal, Form, Typography, message, DatePicker, Tabs, Descriptions, Popconfirm, Empty, Statistic } from 'antd';
import { PlusOutlined, CheckOutlined, SafetyOutlined, SearchOutlined } from '@ant-design/icons';
import api from '../services/api';
import dayjs from 'dayjs';

const statusLabels: Record<string, string> = { pending: 'Ожидает', completed: 'Выполнена', failed: 'Провалена', skipped: 'Пропущена' };
const statusColors: Record<string, string> = { pending: 'orange', completed: 'green', failed: 'red', skipped: 'default' };
const typeLabels: Record<string, string> = { monthly: 'Ежемесячная', quarterly: 'Ежеквартальная', yearly: 'Ежегодная', custom: 'Произвольная' };

const InspectionsPage: React.FC = () => {
  const [tab, setTab] = useState('inspections');
  const [inspections, setInspections] = useState<any[]>([]);
  const [warranty, setWarranty] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [wcModalOpen, setWcModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [wcForm] = Form.useForm();
  const [tickets, setTickets] = useState<any[]>([]);

  useEffect(() => { fetchInspections(); fetchWarranty(); fetchTickets(); }, []);

  const fetchInspections = async () => {
    setLoading(true);
    try { const res = await api.get('/inspections', { params: { page, page_size: 20 } }); setInspections(res.data.items); setTotal(res.data.total); } finally { setLoading(false); }
  };

  const fetchWarranty = async () => {
    try { const res = await api.get('/inspections/warranty'); setWarranty(res.data.items); } catch {}
  };

  const fetchTickets = async () => {
    try { const res = await api.get('/tickets', { params: { page_size: 200 } }); setTickets(res.data.items); } catch {}
  };

  const createInspection = async (values: any) => {
    try {
      await api.post('/inspections', { ...values, report_date: values.report_date.format('YYYY-MM-DD') });
      message.success('Проверка создана'); setModalOpen(false); form.resetFields(); fetchInspections();
    } catch { message.error('Ошибка'); }
  };

  const createWarrantyCheck = async (values: any) => {
    try {
      await api.post('/inspections/warranty', { ...values, check_date: values.check_date.format('YYYY-MM-DD') });
      message.success('Гарантийная проверка создана'); setWcModalOpen(false); wcForm.resetFields(); fetchWarranty();
    } catch { message.error('Ошибка'); }
  };

  const completeWarranty = async (id: number) => {
    try { await api.put(`/inspections/warranty/${id}/complete`); message.success('Проверка завершена'); fetchWarranty(); } catch {}
  };

  const completeInspection = async (id: number) => {
    try { await api.put(`/inspections/${id}`, { status: 'completed' }); message.success('Проверка завершена'); fetchInspections(); } catch {}
  };

  const inspColumns = [
    { title: 'Тип', dataIndex: 'report_type', key: 'type', render: (t: string) => typeLabels[t] || t },
    { title: 'Заявка', dataIndex: 'ticket_number', key: 'ticket' },
    { title: 'Дата', dataIndex: 'report_date', key: 'date' },
    { title: 'Статус', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={statusColors[s]}>{statusLabels[s]}</Tag> },
    { title: 'Файлов', dataIndex: 'files_count', key: 'files' },
    { title: 'Подтверждено', dataIndex: 'client_confirmed', key: 'confirmed', render: (v: boolean) => v ? 'Да' : 'Нет' },
    {
      title: '', key: 'actions', width: 120,
      render: (_: any, r: any) => r.status === 'pending' && <Button size="small" icon={<CheckOutlined />} onClick={() => completeInspection(r.id)}>Завершить</Button>,
    },
  ];

  const wcColumns = [
    { title: 'Заявка', dataIndex: 'ticket_number', key: 'ticket' },
    { title: 'Месяц', dataIndex: 'month_number', key: 'month', width: 80 },
    { title: 'Дата проверки', dataIndex: 'check_date', key: 'date' },
    { title: 'Статус', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={statusColors[s]}>{statusLabels[s]}</Tag> },
    {
      title: '', key: 'actions', width: 120,
      render: (_: any, r: any) => r.status === 'pending' && <Button size="small" icon={<CheckOutlined />} onClick={() => completeWarranty(r.id)}>Завершить</Button>,
    },
  ];

  return (
    <div>
      <Typography.Title level={3}><SafetyOutlined /> Проверки и гарантия</Typography.Title>
      <Tabs activeKey={tab} onChange={setTab} items={[
        {
          key: 'inspections', label: `Проверки (${total})`,
          children: (
            <div>
              <Card style={{ marginBottom: 16 }}>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>Новая проверка</Button>
              </Card>
              <Table dataSource={inspections} columns={inspColumns} rowKey="id" loading={loading} pagination={{ current: page, pageSize: 20, total, onChange: p => setPage(p) }} />
            </div>
          ),
        },
        {
          key: 'warranty', label: `Гарантийные ТО (${warranty.length})`,
          children: (
            <div>
              <Card style={{ marginBottom: 16 }}>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setWcModalOpen(true)}>Добавить проверку</Button>
              </Card>
              <Table dataSource={warranty} columns={wcColumns} rowKey="id" pagination={false} />
            </div>
          ),
        },
      ]} />

      <Modal title="Новая проверка" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={createInspection}>
          <Form.Item name="ticket_id" label="Заявка" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label" options={tickets.map(t => ({ value: t.id, label: `${t.number} — ${t.short_description}` }))} />
          </Form.Item>
          <Form.Item name="report_type" label="Тип" rules={[{ required: true }]}>
            <Select options={[{ value: 'monthly', label: 'Ежемесячная' }, { value: 'quarterly', label: 'Ежеквартальная' }, { value: 'yearly', label: 'Ежегодная' }, { value: 'custom', label: 'Произвольная' }]} />
          </Form.Item>
          <Form.Item name="report_date" label="Дата проверки" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="notes" label="Примечания"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>

      <Modal title="Добавить гарантийную проверку" open={wcModalOpen} onCancel={() => setWcModalOpen(false)} onOk={() => wcForm.submit()}>
        <Form form={wcForm} layout="vertical" onFinish={createWarrantyCheck}>
          <Form.Item name="ticket_id" label="Заявка" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label" options={tickets.map(t => ({ value: t.id, label: `${t.number} — ${t.short_description}` }))} />
          </Form.Item>
          <Form.Item name="month_number" label="Месяц гарантии" rules={[{ required: true }]}>
            <Select options={Array.from({ length: 24 }, (_, i) => ({ value: i + 1, label: `Месяц ${i + 1}` }))} />
          </Form.Item>
          <Form.Item name="check_date" label="Дата проверки" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="notes" label="Примечания"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default InspectionsPage;
