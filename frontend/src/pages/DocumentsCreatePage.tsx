import React, { useEffect, useState } from 'react';
import {
  Card, Table, Button, Space, Typography, message, Select, Form,
  InputNumber, Modal, Input, Tag, Descriptions, Tooltip,
} from 'antd';
import { PlusOutlined, FileTextOutlined, EyeOutlined, PrinterOutlined, DownloadOutlined } from '@ant-design/icons';
import api from '../services/api';

const DOC_TYPES = [
  { value: 'receipt', label: 'Кассовый чек' },
  { value: 'warranty', label: 'Гарантийный талон' },
  { value: 'invoice', label: 'Платёжный документ' },
  { value: 'act', label: 'Акт выполненных работ' },
];

const DocumentsCreatePage: React.FC = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchTickets();
    fetchDocuments();
  }, []);

  const fetchTickets = async () => {
    try {
      const res = await api.get('/tickets', { params: { page_size: 100 } });
      setTickets(res.data.items || res.data || []);
    } catch { message.error('Ошибка загрузки заявок'); }
  };

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/documents', { params: { page_size: 50 } });
      setDocuments(res.data.items || []);
    } catch { message.error('Ошибка загрузки документов'); }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    form.resetFields();
    setModalOpen(true);
  };

  const handleCreate = async (values: any) => {
    try {
      const res = await api.post(`/api/documents/${values.ticket_id}`, {
        doc_type: values.doc_type,
        total_amount: values.total_amount || 0,
        warranty_period: values.warranty_period || null,
        items: values.items || [],
      });
      message.success('Документ создан');
      setModalOpen(false);
      fetchDocuments();
    } catch (e: any) {
      message.error(e.response?.data?.detail || 'Ошибка создания');
    }
  };

  const previewDoc = async (id: number) => {
    try {
      const res = await api.get(`/api/documents/${id}/html`, { responseType: 'text' });
      setPreviewHtml(typeof res.data === 'string' ? res.data : res.request?.responseText || '');
      setPreviewOpen(true);
    } catch { message.error('Ошибка загрузки предпросмотра'); }
  };

  const downloadPdf = async (id: number, number: string) => {
    try {
      const res = await api.get(`/api/documents/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `doc_${number}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch { message.error('Ошибка скачивания'); }
  };

  const printDoc = async (id: number) => {
    try {
      const res = await api.get(`/api/documents/${id}/html`, { responseType: 'text' });
      const html = typeof res.data === 'string' ? res.data : res.request?.responseText || '';
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(html);
        w.document.close();
        w.onload = () => { w.print(); };
      }
    } catch { message.error('Ошибка печати'); }
  };

  const docTypeLabel = (t: string) => DOC_TYPES.find(d => d.value === t)?.label || t;

  const columns = [
    { title: 'Номер', dataIndex: 'number', key: 'number', width: 180 },
    {
      title: 'Тип', dataIndex: 'doc_type', key: 'type', width: 170,
      render: (t: string) => <Tag>{docTypeLabel(t)}</Tag>,
    },
    {
      title: 'Сумма', dataIndex: 'total_amount', key: 'amount', width: 120,
      render: (v: number) => `${(v || 0).toFixed(2)} руб.`,
    },
    {
      title: 'Дата', dataIndex: 'created_at', key: 'date', width: 150,
      render: (d: string) => new Date(d).toLocaleString('ru-RU'),
    },
    {
      title: '', key: 'actions', width: 200,
      render: (_: any, r: any) => (
        <Space>
          <Tooltip title="Предпросмотр"><Button size="small" icon={<EyeOutlined />} onClick={() => previewDoc(r.id)} /></Tooltip>
          <Tooltip title="Печать"><Button size="small" icon={<PrinterOutlined />} onClick={() => printDoc(r.id)} /></Tooltip>
          <Tooltip title="Скачать PDF"><Button size="small" icon={<DownloadOutlined />} onClick={() => downloadPdf(r.id, r.number)} /></Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={3}><FileTextOutlined /> Генерация документов</Typography.Title>

      <Card style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Создать документ
        </Button>
      </Card>

      <Card title="Созданные документы">
        <Table dataSource={documents} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 20 }} />
      </Card>

      <Modal
        title="Создание документа"
        open={modalOpen} onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()} width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="ticket_id" label="Заявка" rules={[{ required: true, message: 'Выберите заявку' }]}>
            <Select
              showSearch placeholder="Выберите заявку"
              filterOption={(input, option) => (option?.label || '').toLowerCase().includes(input.toLowerCase())}
              options={tickets.map((t: any) => ({
                value: t.id,
                label: `#${t.number} — ${t.short_description?.substring(0, 50) || ''} (${t.client_name || ''})`,
              }))}
            />
          </Form.Item>
          <Form.Item name="doc_type" label="Тип документа" rules={[{ required: true }]}>
            <Select options={DOC_TYPES} placeholder="Выберите тип" />
          </Form.Item>
          <Form.Item name="total_amount" label="Общая сумма (руб.)">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="warranty_period" label="Срок гарантии (только для гарантийного талона)">
            <Input placeholder="например: 6 месяцев" />
          </Form.Item>
          <Form.Item label="Услуги (опционально)">
            <Form.List name="items">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...rest }) => (
                    <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                      <Form.Item {...rest} name={[name, 'service_name']} rules={[{ required: true }]}>
                        <Input placeholder="Услуга" style={{ width: 200 }} />
                      </Form.Item>
                      <Form.Item {...rest} name={[name, 'quantity']}>
                        <InputNumber min={1} placeholder="Кол" style={{ width: 60 }} />
                      </Form.Item>
                      <Form.Item {...rest} name={[name, 'price']}>
                        <InputNumber min={0} placeholder="Цена" style={{ width: 100 }} />
                      </Form.Item>
                      <Button type="link" danger onClick={() => remove(name)}>Удалить</Button>
                    </Space>
                  ))}
                  <Button type="dashed" onClick={() => add()} block>Добавить услугу</Button>
                </>
              )}
            </Form.List>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Предпросмотр документа"
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        width={800}
        footer={null}
      >
        {previewHtml && (
          <iframe srcDoc={previewHtml} style={{ width: '100%', height: '70vh', border: '1px solid #ddd' }} title="preview" />
        )}
      </Modal>
    </div>
  );
};

export default DocumentsCreatePage;
