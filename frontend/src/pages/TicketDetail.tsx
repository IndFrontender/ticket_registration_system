import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Tag, Button, Space, Spin, message, Tabs,
  Modal, Form, Input, InputNumber, Select, Upload, List, Timeline,
  Typography, Row, Col, Breadcrumb, Divider,
} from 'antd';
import {
  ArrowLeftOutlined, UploadOutlined, FilePdfOutlined,
  PrinterOutlined, MailOutlined, SendOutlined, PlusOutlined,
  DownloadOutlined, EditOutlined,
} from '@ant-design/icons';
import { ticketsApi, documentsApi } from '../services/api';
import dayjs from 'dayjs';

const statusLabels: Record<string, string> = { new: 'Новая', in_progress: 'В работе', completed: 'Выполнена', closed: 'Закрыта' };
const statusColors: Record<string, string> = { new: 'blue', in_progress: 'orange', completed: 'green', closed: 'default' };
const priorityLabels: Record<string, string> = { critical: 'Критический', high: 'Высокий', medium: 'Средний', low: 'Низкий' };
const priorityColors: Record<string, string> = { critical: 'red', high: 'orange', medium: 'gold', low: 'green' };

const docTypeLabels: Record<string, string> = {
  receipt: 'Кассовый чек', warranty: 'Гарантийный талон', invoice: 'Счёт', act: 'Акт выполненных работ',
};

const TicketDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [docModal, setDocModal] = useState(false);
  const [docType, setDocType] = useState('receipt');
  const [docItems, setDocItems] = useState<any[]>([{ service_name: '', quantity: 1, price: 0, total: 0 }]);
  const [warrantyPeriod, setWarrantyPeriod] = useState('');
  const [prioritySelect, setPrioritySelect] = useState(false);

  const fetchTicket = async () => {
    try {
      const res = await ticketsApi.get(Number(id));
      setTicket(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTicket(); }, [id]);

  const handleStatusChange = async (status: string) => {
    await ticketsApi.update(Number(id), { status });
    message.success('Статус обновлён');
    fetchTicket();
  };

  const handlePriorityChange = async (priority: string) => {
    await ticketsApi.update(Number(id), { priority });
    message.success('Приоритет обновлён');
    setPrioritySelect(false);
    fetchTicket();
  };

  const handleUpload = async (file: File) => {
    await ticketsApi.uploadAttachment(Number(id), file);
    message.success('Файл прикреплён');
    fetchTicket();
  };

  const addDocItem = () => {
    setDocItems([...docItems, { service_name: '', quantity: 1, price: 0, total: 0 }]);
  };

  const updateDocItem = (index: number, field: string, value: any) => {
    const updated = [...docItems];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'quantity' || field === 'price') {
      updated[index].total = updated[index].quantity * updated[index].price;
    }
    setDocItems(updated);
  };

  const createDocument = async () => {
    const total = docItems.reduce((sum, item) => sum + (item.total || item.quantity * item.price), 0);
    try {
      await documentsApi.create(Number(id), {
        doc_type: docType,
        total_amount: total,
        warranty_period: docType === 'warranty' ? warrantyPeriod : null,
        items: docItems.map((item) => ({
          service_name: item.service_name,
          quantity: item.quantity,
          price: item.price,
          total: item.total || item.quantity * item.price,
        })),
      });
      message.success('Документ создан');
      setDocModal(false);
      setDocItems([{ service_name: '', quantity: 1, price: 0, total: 0 }]);
      fetchTicket();
    } catch (e: any) {
      message.error('Ошибка: ' + (e.response?.data?.detail || 'неизвестная'));
    }
  };

  const downloadPdf = async (docId: number) => {
    const res = await documentsApi.getPdf(docId);
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    window.open(url, '_blank');
  };

  const notify = async () => {
    await ticketsApi.notify(Number(id));
    message.success('Уведомления отправлены');
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!ticket) return <div>Заявка не найдена</div>;

  return (
    <div>
      <Breadcrumb items={[
        { title: 'Главная', href: '/' },
        { title: 'Заявки', href: '/tickets' },
        { title: `Заявка ${ticket.number}` },
      ]} style={{ marginBottom: 16 }} />
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/tickets')}>Назад</Button>
          <Typography.Title level={3} style={{ margin: 0 }}>Заявка {ticket.number}</Typography.Title>
          <Tag color={statusColors[ticket.status]}>{statusLabels[ticket.status]}</Tag>
          {prioritySelect ? (
            <Select
              autoFocus
              value={ticket.priority}
              style={{ width: 140 }}
              onChange={handlePriorityChange}
              onBlur={() => setPrioritySelect(false)}
              options={Object.entries(priorityLabels).map(([k, v]) => ({
                value: k, label: v,
              }))}
            />
          ) : (
            <Tag color={priorityColors[ticket.priority]} style={{ cursor: 'pointer' }}
              onClick={() => setPrioritySelect(true)}>
              {priorityLabels[ticket.priority]} <EditOutlined />
            </Tag>
          )}
        </Space>
        <Space>
          <Button icon={<SendOutlined />} onClick={notify}>Уведомить</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setDocModal(true)}>Создать документ</Button>
        </Space>
      </Row>

      <Tabs defaultActiveKey="info" items={[
        {
          key: 'info',
          label: 'Информация',
          children: (
            <Row gutter={[16, 16]}>
              <Col xs={24} md={16}>
                <Card title="Описание">
                  <Descriptions column={1}>
                    <Descriptions.Item label="Краткое описание">{ticket.short_description}</Descriptions.Item>
                    <Descriptions.Item label="Детальное описание">{ticket.full_description || '—'}</Descriptions.Item>
                    <Descriptions.Item label="Срок выполнения">{ticket.deadline ? dayjs(ticket.deadline).format('DD.MM.YYYY') : 'Не указан'}</Descriptions.Item>
                    <Descriptions.Item label="Создана">{dayjs(ticket.created_at).format('DD.MM.YYYY HH:mm')}</Descriptions.Item>
                    <Descriptions.Item label="Обновлена">{dayjs(ticket.updated_at).format('DD.MM.YYYY HH:mm')}</Descriptions.Item>
                  </Descriptions>
                  <Divider>Действия</Divider>
                  <Space>
                    {ticket.status === 'new' && <Button type="primary" onClick={() => handleStatusChange('in_progress')}>Взять в работу</Button>}
                    {ticket.status === 'in_progress' && <Button type="primary" onClick={() => handleStatusChange('completed')}>Завершить</Button>}
                    {ticket.status === 'completed' && <Button onClick={() => handleStatusChange('closed')}>Закрыть заявку</Button>}
                    {ticket.status !== 'new' && <Button onClick={() => handleStatusChange('new')}>Вернуть в новые</Button>}
                  </Space>
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card title="Клиент">
                  {ticket.client ? (
                    <Descriptions column={1} size="small">
                      <Descriptions.Item label="Тип">{ticket.client.client_type === 'individual' ? 'Физ.лицо' : 'Юр.лицо'}</Descriptions.Item>
                      <Descriptions.Item label="Название">{ticket.client.name}</Descriptions.Item>
                      <Descriptions.Item label="Телефон">{ticket.client.phone || '—'}</Descriptions.Item>
                      <Descriptions.Item label="Email">{ticket.client.email || '—'}</Descriptions.Item>
                      <Descriptions.Item label="Адрес">{ticket.client.address || '—'}</Descriptions.Item>
                    </Descriptions>
                  ) : <Typography.Text type="secondary">Не указан</Typography.Text>}
                </Card>
                <Card title="Вложения" style={{ marginTop: 16 }}>
                  <Upload
                    showUploadList={false}
                    customRequest={({ file }: any) => { handleUpload(file); }}
                  >
                    <Button icon={<UploadOutlined />}>Прикрепить файл</Button>
                  </Upload>
                  {ticket.attachments?.length > 0 && (
                    <List
                      size="small"
                      dataSource={ticket.attachments}
                      renderItem={(item: any) => (
                        <List.Item>
                          <a href={`/${item.filepath}`} target="_blank">{item.filename}</a>
                        </List.Item>
                      )}
                    />
                  )}
                </Card>
              </Col>
            </Row>
          ),
        },
        {
          key: 'documents',
          label: 'Документы',
          children: (
            <List
              dataSource={ticket.documents || []}
              renderItem={(doc: any) => (
                <Card size="small" style={{ marginBottom: 8 }}>
                  <Row justify="space-between" align="middle">
                    <Col>
                      <Typography.Text strong>{docTypeLabels[doc.doc_type] || doc.doc_type} №{doc.number}</Typography.Text>
                      <br />
                      <Typography.Text type="secondary">{dayjs(doc.created_at).format('DD.MM.YYYY HH:mm')} | Сумма: {doc.total_amount} руб.</Typography.Text>
                    </Col>
                    <Space>
                      <Button icon={<FilePdfOutlined />} onClick={() => downloadPdf(doc.id)}>PDF</Button>
                      <Button icon={<PrinterOutlined />} onClick={() => window.open(`/api/documents/${doc.id}/html`, '_blank')}>HTML</Button>
                      <Button icon={<MailOutlined />}>Отправить</Button>
                    </Space>
                  </Row>
                </Card>
              )}
            />
          ),
        },
        {
          key: 'history',
          label: 'История',
          children: (
            <Timeline
              items={(ticket.history || []).map((h: any) => ({
                children: (
                  <div>
                    <Typography.Text strong>{h.action}</Typography.Text>
                    <br />
                    <Typography.Text type="secondary">{h.description}</Typography.Text>
                    <br />
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>{h.user} — {dayjs(h.created_at).format('DD.MM.YYYY HH:mm')}</Typography.Text>
                  </div>
                ),
              }))}
            />
          ),
        },
      ]} />

      <Modal
        title="Создание документа"
        open={docModal}
        onCancel={() => setDocModal(false)}
        onOk={createDocument}
        width={700}
      >
        <Form layout="vertical">
          <Form.Item label="Тип документа">
            <Select value={docType} onChange={setDocType} options={[
              { value: 'receipt', label: 'Кассовый чек' },
              { value: 'warranty', label: 'Гарантийный талон' },
              { value: 'invoice', label: 'Счёт' },
              { value: 'act', label: 'Акт выполненных работ' },
            ]} />
          </Form.Item>
          {docType === 'warranty' && (
            <Form.Item label="Срок гарантии">
              <Input value={warrantyPeriod} onChange={(e) => setWarrantyPeriod(e.target.value)} placeholder="например: 6 месяцев" />
            </Form.Item>
          )}
          <Typography.Text strong>Услуги:</Typography.Text>
          {docItems.map((item, index) => (
            <Row gutter={8} key={index} style={{ marginTop: 8 }}>
              <Col span={8}>
                <Input placeholder="Услуга" value={item.service_name} onChange={(e) => updateDocItem(index, 'service_name', e.target.value)} />
              </Col>
              <Col span={4}>
                <InputNumber placeholder="Кол-во" min={1} value={item.quantity} onChange={(v) => updateDocItem(index, 'quantity', v || 1)} style={{ width: '100%' }} />
              </Col>
              <Col span={5}>
                <InputNumber placeholder="Цена" min={0} value={item.price} onChange={(v) => updateDocItem(index, 'price', v || 0)} style={{ width: '100%' }} prefix="₽" />
              </Col>
              <Col span={5}>
                <InputNumber placeholder="Сумма" min={0} value={item.total} onChange={(v) => updateDocItem(index, 'total', v || 0)} style={{ width: '100%' }} prefix="₽" />
              </Col>
            </Row>
          ))}
          <Button type="dashed" onClick={addDocItem} block style={{ marginTop: 8 }} icon={<PlusOutlined />}>Добавить услугу</Button>
        </Form>
      </Modal>
    </div>
  );
};

export default TicketDetail;
