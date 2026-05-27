import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Typography, Spin, List, Progress, Divider, Space, Button, message, Modal, Alert } from 'antd';
import { BarChartOutlined, SafetyOutlined, CheckCircleOutlined, WarningOutlined, DatabaseOutlined, DownloadOutlined, CloudUploadOutlined } from '@ant-design/icons';
import api from '../services/api';
import dayjs from 'dayjs';

const statusLabels: Record<string, string> = { new: 'Новые', in_progress: 'В работе', completed: 'Выполнены', closed: 'Закрыты', on_hold: 'Отложены' };
const statusColors: Record<string, string> = { new: 'blue', in_progress: 'orange', completed: 'green', closed: 'default', on_hold: 'purple' };

const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [backups, setBackups] = useState<any[]>([]);
  const [sysInfo, setSysInfo] = useState<any>(null);
  const [backupLoading, setBackupLoading] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [analyticsRes, backupsRes, infoRes] = await Promise.all([
        api.get('/analytics'),
        api.get('/system/backups').catch(() => ({ data: { backups: [] } })),
        api.get('/system/info').catch(() => ({ data: {} })),
      ]);
      setData(analyticsRes.data);
      setBackups(backupsRes.data.backups);
      setSysInfo(infoRes.data);
    } catch {} finally { setLoading(false); }
  };

  const createBackup = async () => {
    setBackupLoading(true);
    try {
      await api.post('/system/backup');
      message.success('Бэкап создан');
      fetchAll();
    } catch { message.error('Ошибка создания бэкапа'); } finally { setBackupLoading(false); }
  };

  const downloadBackup = async (filename: string) => {
    try {
      const res = await api.get(`/system/backup/download/${filename}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = filename;
      a.click(); window.URL.revokeObjectURL(url);
    } catch { message.error('Ошибка скачивания'); }
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!data) return <Alert type="warning" message="Нет данных для анализа" />;

  const statusTotal = Object.values(data.tickets?.by_status || {}).reduce((a: number, b: any) => a + (typeof b === 'number' ? b : 0), 0);

  return (
    <div>
      <Typography.Title level={3}><BarChartOutlined /> Аналитика и метрики</Typography.Title>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card><Statistic title="Заявок за месяц" value={data.tickets?.month || 0} prefix={<BarChartOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card><Statistic title="Задач выполнено за неделю" value={data.tasks?.completed_week || 0} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a' }} /></Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card><Statistic title="Активных гарантий" value={data.warranty?.active || 0} prefix={<SafetyOutlined />} valueStyle={{ color: '#1677ff' }} /></Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card><Statistic title="Гарантий истекает" value={data.warranty?.expiring_30d || 0} prefix={<WarningOutlined />}
            valueStyle={{ color: data.warranty?.expiring_30d > 0 ? '#faad14' : undefined }} /></Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={8}>
          <Card title="Статусы заявок" size="small">
            {Object.entries(data.tickets?.by_status || {}).map(([key, value]) => (
              <div key={key} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Tag color={statusColors[key]}>{statusLabels[key]}</Tag>
                  <span>{value as number}</span>
                </div>
                <Progress percent={statusTotal > 0 ? Math.round((value as number) / statusTotal * 100) : 0} size="small" showInfo={false} />
              </div>
            ))}
          </Card>

          <Card title="Оборудование" size="small" style={{ marginTop: 16 }}>
            <Statistic title="Всего единиц" value={data.equipment?.total || 0} />
            <Statistic title="ТО за неделю" value={data.equipment?.maintenance_week || 0} style={{ marginTop: 8 }} />
          </Card>
        </Col>

        <Col xs={24} md={16}>
          <Card title="Заявки по дням (последние 30 дней)" size="small" style={{ marginBottom: 16 }}>
            {data.tickets_by_day?.slice(-14).map((d: any) => (
              <div key={d.date} style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ width: 90, fontSize: 11, color: '#a0a0a0' }}>{d.date.slice(5)}</span>
                <Progress percent={Math.min(d.count / 5 * 100, 100)} size="small" format={() => `${d.count}`} style={{ flex: 1, margin: 0 }} />
              </div>
            ))}
          </Card>

          <Card title="Задачи по дням (последние 7 дней)" size="small">
            {data.tasks_by_day?.map((d: any) => (
              <div key={d.date} style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ width: 90, fontSize: 11, color: '#a0a0a0' }}>{d.date.slice(5)}</span>
                <Progress percent={d.completed * 20} size="small" format={() => `${d.completed}`} strokeColor="#52c41a" style={{ flex: 1, margin: 0 }} />
              </div>
            ))}
          </Card>
        </Col>
      </Row>

      <Divider />

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card title={<span><DatabaseOutlined /> Бэкапы БД</span>} extra={<Button icon={<CloudUploadOutlined />} onClick={createBackup} loading={backupLoading}>Создать бэкап</Button>}>
            {backups.length === 0 ? (
              <Typography.Text type="secondary">Бэкапов пока нет</Typography.Text>
            ) : (
              <List size="small" dataSource={backups.slice(0, 10)} renderItem={(b: any) => (
                <List.Item actions={[<Button size="small" icon={<DownloadOutlined />} onClick={() => downloadBackup(b.filename)}>Скачать</Button>]}>
                  <List.Item.Meta title={b.filename} description={`${(b.size / 1024).toFixed(1)} KB — ${dayjs(b.created_at).format('DD.MM.YYYY HH:mm')}`} />
                </List.Item>
              )} />
            )}
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card title={<span><DatabaseOutlined /> Информация о системе</span>}>
            {sysInfo && (
              <div>
                <p><strong>Версия:</strong> {sysInfo.version}</p>
                <p><strong>Платформа:</strong> {sysInfo.platform} / Python {sysInfo.python}</p>
                <p><strong>Аптайм:</strong> {Math.floor((sysInfo.uptime_seconds || 0) / 3600)}ч {Math.floor(((sysInfo.uptime_seconds || 0) % 3600) / 60)}м</p>
                <p><strong>Размер БД:</strong> {((sysInfo.db_size_bytes || 0) / 1024).toFixed(1)} KB</p>
                <Button size="small" onClick={async () => {
                  try { const r = await api.get('/metrics', { responseType: 'text' }); message.info(`Prometheus metrics loaded (${r.data.split('\n').length} lines)`); } catch {}
                }}>Prometheus /metrics</Button>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AnalyticsPage;
