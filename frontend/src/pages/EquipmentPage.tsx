import React, { useEffect, useState } from 'react';
import { Table, Tag, Button, Space, Input, Select, Row, Col, Card, Modal, Form, Typography, message, Tabs, DatePicker, Descriptions, List, Popconfirm, Empty } from 'antd';
import { PlusOutlined, SearchOutlined, ToolOutlined, BellOutlined, DeleteOutlined, CheckOutlined } from '@ant-design/icons';
import api from '../services/api';
import dayjs from 'dayjs';

const statusColors: Record<string, string> = { active: 'green', inactive: 'default', broken: 'red', written_off: 'gray' };
const statusLabels: Record<string, string> = { active: 'Активно', inactive: 'Не активно', broken: 'Сломано', written_off: 'Списано' };

const EquipmentPage: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [detailItem, setDetailItem] = useState<any>(null);
  const [form] = Form.useForm();
  const [clients, setClients] = useState<any[]>([]);

  useEffect(() => { fetchData(); fetchClients(); }, []);
  useEffect(() => { fetchData(); }, [page, search, typeFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/equipment', { params: { page, page_size: 20, search: search || undefined, equipment_type: typeFilter } });
      setItems(res.data.items); setTotal(res.data.total);
    } finally { setLoading(false); }
  };

  const fetchClients = async () => {
    try { const res = await api.get('/clients', { params: { page_size: 200 } }); setClients(res.data.items); } catch {}
  };

  const openCreate = () => { setEditItem(null); form.resetFields(); setModalOpen(true); };
  const openEdit = (item: any) => { setEditItem(item); form.setFieldsValue(item); setModalOpen(true); };

  const handleSave = async (values: any) => {
    try {
      if (editItem) await api.put(`/equipment/${editItem.id}`, values);
      else await api.post('/equipment', values);
      message.success(editItem ? 'Оборудование обновлено' : 'Оборудование добавлено');
      setModalOpen(false); fetchData();
    } catch { message.error('Ошибка сохранения'); }
  };

  const handleDelete = async (id: number) => {
    try { await api.delete(`/equipment/${id}`); message.success('Удалено'); fetchData(); } catch { message.error('Ошибка'); }
  };

  const fetchDetail = async (id: number) => {
    try { const res = await api.get(`/equipment/${id}`); setDetailItem(res.data); } catch {}
  };

  const addMaintenance = async () => {
    if (!detailItem) return;
    const values = await form.validateFields().catch(() => null);
    if (!values) return;
    try {
      await api.post('/equipment/maintenance', { ...values, equipment_id: detailItem.id });
      message.success('ТО добавлено'); fetchDetail(detailItem.id);
    } catch { message.error('Ошибка'); }
  };

  const addReminder = async () => {
    if (!detailItem) return;
    const values = await form.validateFields().catch(() => null);
    if (!values) return;
    try {
      await api.post('/equipment/reminders', { ...values, equipment_id: detailItem.id });
      message.success('Напоминание добавлено'); fetchDetail(detailItem.id);
    } catch { message.error('Ошибка'); }
  };

  const completeReminder = async (id: number) => {
    try { await api.put(`/equipment/reminders/${id}/complete`); message.success('Выполнено'); fetchDetail(detailItem.id); } catch {}
  };

  const columns = [
    { title: 'Тип', dataIndex: 'equipment_type', key: 'type', width: 100 },
    { title: 'Производитель', dataIndex: 'manufacturer', key: 'manufacturer' },
    { title: 'Модель', dataIndex: 'model', key: 'model' },
    { title: 'Серийный №', dataIndex: 'serial_number', key: 'serial' },
    { title: 'Клиент', dataIndex: 'client_name', key: 'client' },
    { title: 'Статус', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={statusColors[s]}>{statusLabels[s]}</Tag> },
    {
      title: '', key: 'actions', width: 200,
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" onClick={() => fetchDetail(r.id)}>Детали</Button>
          <Button size="small" onClick={() => openEdit(r)}>Изменить</Button>
          <Popconfirm title="Удалить?" onConfirm={() => handleDelete(r.id)}><Button size="small" danger icon={<DeleteOutlined />} /></Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={3}><ToolOutlined /> Оборудование</Typography.Title>
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={8}><Input placeholder="Поиск..." prefix={<SearchOutlined />} onChange={e => setSearch(e.target.value)} allowClear /></Col>
          <Col xs={12} sm={5}>
            <Select placeholder="Тип" allowClear style={{ width: '100%' }} onChange={setTypeFilter}
              options={[{ value: 'printer', label: 'Принтер' }, { value: 'kkt', label: 'ККТ' }, { value: 'svn', label: 'СВН' }, { value: 'other', label: 'Другое' }]} />
          </Col>
          <Col xs={12} sm={5}>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Добавить</Button>
          </Col>
        </Row>
      </Card>
      <Table dataSource={items} columns={columns} rowKey="id" loading={loading} pagination={{ current: page, pageSize: 20, total, onChange: p => setPage(p), showTotal: t => `Всего: ${t}` }} />

      <Modal title={editItem ? 'Редактировать оборудование' : 'Новое оборудование'} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} width={700}>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Row gutter={16}>
            <Col span={8}><Form.Item name="equipment_type" label="Тип" rules={[{ required: true }]}><Select options={[{ value: 'printer', label: 'Принтер' }, { value: 'kkt', label: 'ККТ' }, { value: 'svn', label: 'СВН' }, { value: 'other', label: 'Другое' }]} /></Form.Item></Col>
            <Col span={8}><Form.Item name="manufacturer" label="Производитель"><Input /></Form.Item></Col>
            <Col span={8}><Form.Item name="model" label="Модель"><Input /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}><Form.Item name="serial_number" label="Серийный номер"><Input /></Form.Item></Col>
            <Col span={8}><Form.Item name="inventory_number" label="Инв. номер"><Input /></Form.Item></Col>
            <Col span={8}><Form.Item name="status" label="Статус"><Select options={Object.entries(statusLabels).map(([k, v]) => ({ value: k, label: v }))} /></Form.Item></Col>
          </Row>
          <Form.Item name="location" label="Местоположение"><Input /></Form.Item>
          <Row gutter={16}>
            <Col span={8}><Form.Item name="client_id" label="Клиент"><Select allowClear showSearch optionFilterProp="label" options={clients.map(c => ({ value: c.id, label: `${c.name}` }))} /></Form.Item></Col>
            <Col span={8}><Form.Item name="purchase_date" label="Дата покупки"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item name="warranty_expiry" label="Гарантия до"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          <Form.Item name="notes" label="Примечания"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      {detailItem && (
        <Modal title={`${detailItem.equipment_type} — ${detailItem.manufacturer || ''} ${detailItem.model || ''}`} open={!!detailItem} onCancel={() => setDetailItem(null)} width={800} footer={null}>
          <Tabs items={[
            {
              key: 'info', label: 'Информация',
              children: <Descriptions column={2}><Descriptions.Item label="Тип">{detailItem.equipment_type}</Descriptions.Item><Descriptions.Item label="Статус"><Tag color={statusColors[detailItem.status]}>{statusLabels[detailItem.status]}</Tag></Descriptions.Item><Descriptions.Item label="Производитель">{detailItem.manufacturer}</Descriptions.Item><Descriptions.Item label="Модель">{detailItem.model}</Descriptions.Item><Descriptions.Item label="Серийный №">{detailItem.serial_number}</Descriptions.Item><Descriptions.Item label="Инв. №">{detailItem.inventory_number}</Descriptions.Item><Descriptions.Item label="Местоположение">{detailItem.location}</Descriptions.Item><Descriptions.Item label="Клиент">{detailItem.client_name}</Descriptions.Item><Descriptions.Item label="Дата покупки">{detailItem.purchase_date}</Descriptions.Item><Descriptions.Item label="Гарантия до">{detailItem.warranty_expiry}</Descriptions.Item><Descriptions.Item label="Примечания" span={2}>{detailItem.notes}</Descriptions.Item></Descriptions>,
            },
            {
              key: 'maintenance', label: `ТО (${detailItem.maintenance?.length || 0})`,
              children: (
                <div>
                  <List size="small" dataSource={detailItem.maintenance || []} renderItem={(m: any) => (
                    <List.Item><Descriptions size="small" column={1}><Descriptions.Item label="Тип">{m.maintenance_type}</Descriptions.Item><Descriptions.Item label="Описание">{m.description}</Descriptions.Item><Descriptions.Item label="Дата">{m.work_date}{m.next_maintenance_date ? ` → ${m.next_maintenance_date}` : ''}</Descriptions.Item><Descriptions.Item label="Стоимость">{m.cost} руб.</Descriptions.Item></Descriptions></List.Item>
                  )} locale={{ emptyText: <Empty description="Нет записей ТО" /> }} />
                </div>
              ),
            },
            {
              key: 'reminders', label: `Напоминания (${detailItem.reminders?.length || 0})`,
              children: (
                <List dataSource={detailItem.reminders || []} renderItem={(r: any) => (
                  <List.Item actions={[!r.is_completed && <Button size="small" icon={<CheckOutlined />} onClick={() => completeReminder(r.id)}>Выполнить</Button>].filter(Boolean)}>
                    <List.Item.Meta title={<span>{r.title} <Tag color={r.is_completed ? 'green' : 'orange'}>{r.is_completed ? 'Выполнено' : 'Активно'}</Tag></span>}
                      description={`${r.reminder_date}${r.repeat_interval ? ` (повтор: ${r.repeat_interval})` : ''}${r.description ? ` — ${r.description}` : ''}`} />
                  </List.Item>
                )} locale={{ emptyText: <Empty description="Нет напоминаний" /> }} />
              ),
            },
          ]} />
        </Modal>
      )}
    </div>
  );
};

export default EquipmentPage;
