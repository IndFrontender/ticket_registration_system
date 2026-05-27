import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Spin, Typography, List, Badge, Space, Button } from 'antd';
import {
  FileTextOutlined, CheckCircleOutlined, ClockCircleOutlined,
  ArrowUpOutlined, BellOutlined, ToolOutlined, SafetyOutlined,
  UnorderedListOutlined, WarningOutlined, MessageOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { ticketsApi } from '../services/api';
import api from '../services/api';
import dayjs from 'dayjs';

const statusColors: Record<string, string> = { new: 'blue', in_progress: 'orange', completed: 'green', closed: 'default' };
const statusLabels: Record<string, string> = { new: 'Новая', in_progress: 'В работе', completed: 'Выполнена', closed: 'Закрыта' };
const priorityColors: Record<string, string> = { critical: 'red', high: 'orange', medium: 'gold', low: 'green' };
const priorityLabels: Record<string, string> = { critical: 'Критический', high: 'Высокий', medium: 'Средний', low: 'Низкий' };

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [recentTickets, setRecentTickets] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [taskStats, setTaskStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      ticketsApi.stats(),
      ticketsApi.list({ sort_by: 'created_at', sort_order: 'desc', page_size: 5 }),
      api.get('/inspections/upcoming', { params: { days: 30 } }).catch(() => ({ data: { items: [] } })),
      api.get('/equipment/reminders/upcoming', { params: { days: 30 } }).catch(() => ({ data: { items: [] } })),
      api.get('/tasks/stats').catch(() => ({ data: {} })),
    ]).then(([statsRes, ticketsRes, inspRes, equipRemRes, taskRes]) => {
      setStats(statsRes.data);
      setRecentTickets(ticketsRes.data.items);
      const all = [
        ...(inspRes.data.items || []).map((i: any) => ({ ...i, icon: 'inspection' })),
        ...(equipRemRes.data.items || []).map((i: any) => ({ ...i, icon: 'equipment' })),
      ].sort((a, b) => a.date?.localeCompare?.(b.date) || 0);
      setReminders(all);
      setTaskStats(taskRes.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  const columns = [
    { title: '№ заявки', dataIndex: 'number', key: 'number',
      render: (text: string, record: any) => <a onClick={() => navigate(`/tickets/${record.id}`)}>{text}</a> },
    { title: 'Клиент', dataIndex: 'client_name', key: 'client_name' },
    { title: 'Статус', dataIndex: 'status', key: 'status',
      render: (s: string) => <Tag color={statusColors[s]}>{statusLabels[s]}</Tag> },
    { title: 'Приоритет', dataIndex: 'priority', key: 'priority',
      render: (p: string) => <Tag color={priorityColors[p]}>{priorityLabels[p]}</Tag> },
    { title: 'Создана', dataIndex: 'created_at', key: 'created_at',
      render: (d: string) => dayjs(d).format('DD.MM.YYYY HH:mm') },
  ];

  const reminderIcon: Record<string, React.ReactNode> = {
    warranty: <SafetyOutlined style={{ color: '#faad14' }} />,
    inspection: <SafetyOutlined style={{ color: '#1677ff' }} />,
    equipment: <ToolOutlined style={{ color: '#52c41a' }} />,
  };
  const reminderLabel: Record<string, string> = {
    warranty: 'Гарантийное ТО',
    inspection: 'Проверка',
    equipment: 'ТО оборудования',
  };

  return (
    <div>
      <Typography.Title level={3}>Панель управления</Typography.Title>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card><Statistic title="Всего заявок" value={stats?.total || 0} prefix={<FileTextOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card><Statistic title="Новые" value={stats?.by_status?.new || 0} prefix={<ClockCircleOutlined />} valueStyle={{ color: '#1677ff' }} /></Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card><Statistic title="В работе" value={stats?.by_status?.in_progress || 0} prefix={<ArrowUpOutlined />} valueStyle={{ color: '#faad14' }} /></Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card><Statistic title="Выполнено" value={stats?.by_status?.completed || 0} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a' }} /></Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={16}>
          <Card title="Последние заявки" style={{ marginBottom: 16 }}>
            <Table dataSource={recentTickets} columns={columns} rowKey="id" pagination={false}
              onRow={(record) => ({ onClick: () => navigate(`/tickets/${record.id}`), style: { cursor: 'pointer' } })} />
          </Card>

          <Row gutter={16}>
            <Col span={12}>
              <Card title="По статусам" size="small">
                {stats?.by_status && Object.entries(stats.by_status).map(([key, value]: [string, any]) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #2d2d30' }}>
                    <Tag color={statusColors[key]}>{statusLabels[key]}</Tag>
                    <span style={{ fontWeight: 'bold' }}>{value as number}</span>
                  </div>
                ))}
              </Card>
            </Col>
            <Col span={12}>
              <Card title="По приоритетам" size="small">
                {stats?.by_priority && Object.entries(stats.by_priority).map(([key, value]: [string, any]) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #2d2d30' }}>
                    <Tag color={priorityColors[key]}>{priorityLabels[key]}</Tag>
                    <span style={{ fontWeight: 'bold' }}>{value as number}</span>
                  </div>
                ))}
              </Card>
            </Col>
          </Row>
        </Col>

        <Col xs={24} lg={8}>
          <Card title={<span><BellOutlined /> Предстоящие напоминания <Badge count={reminders.length} style={{ backgroundColor: '#faad14' }} /></span>} style={{ marginBottom: 16 }}>
            {reminders.length === 0 ? (
              <Typography.Text type="secondary">Нет активных напоминаний</Typography.Text>
            ) : (
              <List size="small" dataSource={reminders.slice(0, 10)} renderItem={(item: any) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={reminderIcon[item.type] || <BellOutlined />}
                    title={<Space>{reminderLabel[item.type] || item.type}: {item.title}</Space>}
                    description={`${item.date}${item.ticket_id ? ` (заявка №${item.ticket_id})` : ''}`}
                  />
                </List.Item>
              )} />
            )}
          </Card>

          <Card title={<span><UnorderedListOutlined /> Задачи</span>}>
            <Row gutter={8}>
              <Col span={12}><Statistic title="Активные" value={(taskStats.pending || 0) + (taskStats.in_progress || 0)} valueStyle={{ color: '#1677ff' }} /></Col>
              <Col span={12}><Statistic title="Просрочено" value={taskStats.overdue || 0}
                valueStyle={{ color: taskStats.overdue ? 'red' : undefined }} /></Col>
            </Row>
            <Button type="link" onClick={() => navigate('/tasks')} style={{ padding: 0, marginTop: 8 }}>Перейти к задачам →</Button>
          </Card>

          <Card title="Быстрые ссылки" style={{ marginTop: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button block icon={<ToolOutlined />} onClick={() => navigate('/equipment')}>Оборудование</Button>
              <Button block icon={<SafetyOutlined />} onClick={() => navigate('/inspections')}>Проверки</Button>
              <Button block icon={<MessageOutlined />} onClick={() => navigate('/sms-logs')}>SMS-логи</Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
