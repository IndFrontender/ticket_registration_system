import React, { useEffect, useState } from 'react';
import {
  Card, Table, Tag, Button, Space, Typography, message, Breadcrumb,
} from 'antd';
import { FilePdfOutlined, PrinterOutlined, DownloadOutlined, DeleteOutlined } from '@ant-design/icons';
import { ticketsApi, documentsApi } from '../services/api';
import dayjs from 'dayjs';

const docTypeLabels: Record<string, string> = {
  receipt: 'Кассовый чек', warranty: 'Гарантийный талон', invoice: 'Счёт', act: 'Акт выполненных работ',
};

const DocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const res = await ticketsApi.list({ page_size: 100 });
        const allDocs: any[] = [];
        for (const ticket of res.data.items) {
          const detail = await ticketsApi.get(ticket.id);
          if (detail.data.documents) {
            for (const doc of detail.data.documents) {
              allDocs.push({ ...doc, ticket_number: detail.data.number, client_name: detail.data.client?.name });
            }
          }
        }
        setDocuments(allDocs);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const downloadPdf = async (id: number) => {
    const res = await documentsApi.getPdf(id);
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    window.open(url, '_blank');
  };

  const handleDelete = async (id: number) => {
    await documentsApi.delete(id);
    message.success('Документ удалён');
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const columns = [
    { title: 'Тип', dataIndex: 'doc_type', key: 'doc_type', render: (t: string) => <Tag>{docTypeLabels[t] || t}</Tag> },
    { title: 'Номер', dataIndex: 'number', key: 'number' },
    { title: 'Заявка', dataIndex: 'ticket_number', key: 'ticket_number' },
    { title: 'Клиент', dataIndex: 'client_name', key: 'client_name' },
    { title: 'Сумма', dataIndex: 'total_amount', key: 'total_amount', render: (v: number) => `${v.toFixed(2)} руб.` },
    { title: 'Дата', dataIndex: 'created_at', key: 'created_at', render: (d: string) => dayjs(d).format('DD.MM.YYYY') },
    {
      title: '', key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" icon={<FilePdfOutlined />} onClick={() => downloadPdf(record.id)}>PDF</Button>
          <Button type="link" icon={<PrinterOutlined />} onClick={() => window.open(`/api/documents/${record.id}/html`, '_blank')}>HTML</Button>
          <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Breadcrumb items={[{ title: 'Главная', href: '/' }, { title: 'Документы' }]} style={{ marginBottom: 16 }} />
      <Typography.Title level={3}>Документы</Typography.Title>
      <Card>
        <Table dataSource={documents} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 20 }} />
      </Card>
    </div>
  );
};

export default DocumentsPage;
