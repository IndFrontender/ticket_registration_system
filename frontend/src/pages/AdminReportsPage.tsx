import React, { useEffect, useState } from 'react';
import {
  Card, Table, Button, Space, Typography, message, DatePicker, Statistic, Row, Col,
} from 'antd';
import { DownloadOutlined, BarChartOutlined, PrinterOutlined } from '@ant-design/icons';
import api from '../services/api';

const { RangePicker } = DatePicker;

const AdminReportsPage: React.FC = () => {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dates, setDates] = useState<[any, any] | null>(null);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => { fetchServices(); }, []);

  const fetchServices = async (dateFrom?: string, dateTo?: string) => {
    setLoading(true);
    try {
      const params: any = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const res = await api.get('/admin/reports/services', { params });
      setServices(res.data.items || []);
      setTotalAmount(res.data.total_amount || 0);
    } catch { message.error('Ошибка загрузки'); }
    finally { setLoading(false); }
  };

  const handleDateChange = (dates: any) => {
    setDates(dates);
    if (dates && dates[0] && dates[1]) {
      fetchServices(dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD'));
    } else {
      fetchServices();
    }
  };

  const exportReport = async (format: string) => {
    try {
      const params: any = { format };
      if (dates && dates[0] && dates[1]) {
        params.date_from = dates[0].format('YYYY-MM-DD');
        params.date_to = dates[1].format('YYYY-MM-DD');
      }
      const res = await api.post('/admin/reports/services/export', null, {
        params, responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `services_report.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      a.click();
      window.URL.revokeObjectURL(url);
      message.success(`Отчёт экспортирован в ${format.toUpperCase()}`);
    } catch { message.error('Ошибка экспорта'); }
  };

  const printReport = async () => {
    try {
      const params: any = { format: 'pdf' };
      if (dates && dates[0] && dates[1]) {
        params.date_from = dates[0].format('YYYY-MM-DD');
        params.date_to = dates[1].format('YYYY-MM-DD');
      }
      const res = await api.post('/admin/reports/services/export', null, {
        params, responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      window.open(url, '_blank');
    } catch { message.error('Ошибка печати'); }
  };

  const columns = [
    { title: '№', key: 'idx', width: 50, render: (_: any, __: any, i: number) => i + 1 },
    { title: 'Услуга', dataIndex: 'service_name', key: 'name' },
    { title: 'Кол-во', dataIndex: 'quantity', key: 'qty', width: 80 },
    { title: 'Цена', dataIndex: 'price', key: 'price', width: 100, render: (v: number) => `${(v || 0).toFixed(2)} руб.` },
    { title: 'Сумма', dataIndex: 'total', key: 'total', width: 120, render: (v: number) => `${(v || 0).toFixed(2)} руб.` },
    { title: 'Заявка', dataIndex: 'ticket_number', key: 'ticket', width: 160 },
    { title: 'Дата', dataIndex: 'created_at', key: 'date', width: 140, render: (d: string) => new Date(d).toLocaleString('ru-RU') },
  ];

  return (
    <div>
      <Typography.Title level={3}><BarChartOutlined /> Отчёты по услугам</Typography.Title>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col>
            <RangePicker onChange={handleDateChange} placeholder={['Дата с', 'Дата по']} />
          </Col>
          <Col flex="auto">
            <Space>
              <Button icon={<DownloadOutlined />} onClick={() => exportReport('xlsx')}>
                Excel
              </Button>
              <Button icon={<DownloadOutlined />} onClick={() => exportReport('pdf')}>
                PDF
              </Button>
              <Button icon={<PrinterOutlined />} onClick={printReport}>
                Печать
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card><Statistic title="Всего услуг" value={services.length} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="Общая сумма" value={totalAmount} suffix="руб." precision={2} /></Card>
        </Col>
      </Row>

      <Card>
        <Table dataSource={services} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 25 }} />
      </Card>
    </div>
  );
};

export default AdminReportsPage;
