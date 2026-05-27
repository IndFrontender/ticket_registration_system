import React, { useEffect, useState } from 'react';
import { Table, Card, Typography, Button, Modal, Form, Input, Select, message, Tag, Space, Upload, List, Image, Empty } from 'antd';
import { PlusOutlined, MessageOutlined, UploadOutlined, PictureOutlined } from '@ant-design/icons';
import api from '../services/api';

const SmsLogsPage: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [form] = Form.useForm();
  const [clients, setClients] = useState<any[]>([]);

  useEffect(() => { fetchSms(); fetchClients(); }, []);

  const fetchSms = async () => {
    setLoading(true);
    try { const res = await api.get('/nosql/sms'); setItems(res.data.items || []); } catch { setItems([]); } finally { setLoading(false); }
  };

  const fetchClients = async () => {
    try { const res = await api.get('/clients', { params: { page_size: 200 } }); setClients(res.data.items); } catch {}
  };

  const handleSend = async (values: any) => {
    const client = clients.find(c => c.id === values.client_id);
    try {
      await api.post('/nosql/sms', {
        client_id: values.client_id,
        client_name: client?.name || '',
        phone: client?.phone || values.phone,
        direction: 'sent',
        message: values.message,
        ticket_id: values.ticket_id || null,
      });
      message.success('SMS записан');
      setModalOpen(false); form.resetFields(); fetchSms();
    } catch { message.error('Ошибка'); }
  };

  const columns = [
    { title: 'Клиент', dataIndex: 'client_name', key: 'client' },
    { title: 'Телефон', dataIndex: 'phone', key: 'phone' },
    {
      title: 'Направление', dataIndex: 'direction', key: 'direction', width: 100,
      render: (d: string) => <Tag color={d === 'sent' ? 'blue' : 'green'}>{d === 'sent' ? 'Исходящее' : 'Входящее'}</Tag>,
    },
    { title: 'Сообщение', dataIndex: 'message', key: 'msg', ellipsis: true },
    { title: 'Дата', dataIndex: 'timestamp', key: 'date', render: (t: string) => t ? new Date(t).toLocaleString('ru-RU') : '' },
    {
      title: '', key: 'actions', width: 80,
      render: (_: any, r: any) => <Button size="small" onClick={() => { setSelected(r); setDetailOpen(true); }}>Детали</Button>,
    },
  ];

  return (
    <div>
      <Typography.Title level={3}><MessageOutlined /> SMS-логи</Typography.Title>
      <Card style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>Записать SMS</Button>
      </Card>
      {loading ? null : items.length === 0 ? (
        <Empty description="SMS-логов нет. MongoDB подключена?" />
      ) : (
        <Table dataSource={items} columns={columns} rowKey={(r) => r._id || Math.random()} loading={loading} pagination={false} />
      )}

      <Modal title="Записать SMS" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={handleSend}>
          <Form.Item name="client_id" label="Клиент" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label"
              options={clients.map(c => ({ value: c.id, label: `${c.name} (${c.phone || c.email || ''})` }))} />
          </Form.Item>
          <Form.Item name="phone" label="Номер телефона"><Input placeholder="Если не указан у клиента" /></Form.Item>
          <Form.Item name="message" label="Текст SMS" rules={[{ required: true }]}><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="ticket_id" label="Заявка №"><Input type="number" /></Form.Item>
        </Form>
      </Modal>

      <Modal title="Детали SMS" open={detailOpen} onCancel={() => setDetailOpen(false)} footer={null}>
        {selected && (
          <div>
            <p><strong>Клиент:</strong> {selected.client_name}</p>
            <p><strong>Телефон:</strong> {selected.phone}</p>
            <p><strong>Направление:</strong> <Tag color={selected.direction === 'sent' ? 'blue' : 'green'}>{selected.direction === 'sent' ? 'Исходящее' : 'Входящее'}</Tag></p>
            <p><strong>Сообщение:</strong> {selected.message}</p>
            <p><strong>Дата:</strong> {selected.timestamp ? new Date(selected.timestamp).toLocaleString('ru-RU') : ''}</p>
            {selected.ticket_id && <p><strong>Заявка:</strong> №{selected.ticket_id}</p>}
            {selected.screenshot_file_id && <p><strong>Скриншот:</strong> есть (ID: {selected.screenshot_file_id})</p>}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SmsLogsPage;
