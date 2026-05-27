import React, { useEffect, useState } from 'react';
import {
  Card, Table, Button, Space, Typography, message, Select, Row, Col, Statistic, Tag,
} from 'antd';
import { DownloadOutlined, DashboardOutlined, PrinterOutlined } from '@ant-design/icons';
import api from '../services/api';

const EfficiencyPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState('month');

  useEffect(() => { fetchEfficiency(); }, [period]);

  const fetchEfficiency = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/efficiency/masters', { params: { period } });
      setData(res.data);
    } catch { message.error('Ошибка загрузки'); }
    finally { setLoading(false); }
  };

  const exportData = async (format: string) => {
    try {
      const res = await api.get('/api/efficiency/masters/export', {
        params: { period, format },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `efficiency_${period}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      a.click();
      window.URL.revokeObjectURL(url);
      message.success(`Выгружено в ${format.toUpperCase()}`);
    } catch { message.error('Ошибка выгрузки'); }
  };

  const printData = async () => {
    try {
      const res = await api.get('/api/efficiency/masters/export', {
        params: { period, format: 'pdf' },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      window.open(url, '_blank');
    } catch { message.error('Ошибка печати'); }
  };

  const periodLabel = { day: 'день', month: 'месяц', year: 'год' }[period] || '';

  const columns = [
    { title: 'Мастер', dataIndex: 'master', key: 'master', render: (t: string) => <Tag color="blue">{t}</Tag> },
    ...(data?.periods || []).map((p: string) => ({
      title: p, key: p, dataIndex: 'data',
      render: (_: any, r: any) => {
        const found = r.data?.find((d: any) => d.period === p);
        return found?.count ?? 0;
      },
    })),
    { title: 'Всего', dataIndex: 'total', key: 'total', render: (v: number) => <strong>{v}</strong> },
  ];

  return (
    <div>
      <Typography.Title level={3}><DashboardOutlined /> Эффективность мастеров</Typography.Title>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col>
            <Space>
              <span>Период:</span>
              <Select value={period} onChange={setPeriod} style={{ width: 140 }} options={[
                { value: 'day', label: 'По дням' },
                { value: 'month', label: 'По месяцам' },
                { value: 'year', label: 'По годам' },
              ]} />
            </Space>
          </Col>
          <Col flex="auto">
            <Space>
              <Button icon={<DownloadOutlined />} onClick={() => exportData('xlsx')}>Excel</Button>
              <Button icon={<DownloadOutlined />} onClick={() => exportData('pdf')}>PDF</Button>
              <Button icon={<PrinterOutlined />} onClick={printData}>Печать</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {data && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card><Statistic title="Всего мастеров" value={data.masters?.length || 0} /></Card>
          </Col>
          <Col span={6}>
            <Card><Statistic title="Всего заявок" value={data.grand_total || 0} /></Card>
          </Col>
        </Row>
      )}

      <Card title={`Аналитика по ${periodLabel}ам`}>
        <Table
          dataSource={data?.masters || []} columns={columns} rowKey="master"
          loading={loading} pagination={false}
        />
      </Card>
    </div>
  );
};

export default EfficiencyPage;
