import React, { useEffect, useState } from 'react';
import {
  Card, Table, Button, Space, Typography, message, Modal, Checkbox,
  Row, Col, Tag, Spin, Descriptions, Divider,
} from 'antd';
import {
  CloudUploadOutlined, DownloadOutlined, DatabaseOutlined,
  RollbackOutlined, CheckCircleOutlined, WarningOutlined,
  FileProtectOutlined,
} from '@ant-design/icons';
import api from '../services/api';
import dayjs from 'dayjs';

const BackupPage: React.FC = () => {
  const [backups, setBackups] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [incModal, setIncModal] = useState(false);
  const [restoreModal, setRestoreModal] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bRes, mRes] = await Promise.all([
        api.get('/system/backups'),
        api.get('/system/backup/modules').catch(() => ({ data: { modules: [] } })),
      ]);
      setBackups(bRes.data.backups);
      setModules(mRes.data.modules);
    } catch { message.error('Ошибка загрузки'); }
    finally { setLoading(false); }
  };

  const createFull = async () => {
    setBackupLoading(true);
    try {
      await api.post('/system/backup/full');
      message.success('Полный бэкап создан');
      fetchData();
    } catch { message.error('Ошибка'); }
    finally { setBackupLoading(false); }
  };

  const createIncremental = async () => {
    if (!selectedModules.length) { message.warning('Выберите модули'); return; }
    setBackupLoading(true);
    try {
      await api.post('/system/backup/incremental', { modules: selectedModules });
      message.success('Инкрементальный бэкап создан');
      setIncModal(false);
      fetchData();
    } catch { message.error('Ошибка'); }
    finally { setBackupLoading(false); }
  };

  const handleRestore = async () => {
    if (!restoreModal) return;
    setBackupLoading(true);
    try {
      await api.post(`/api/system/backup/restore/${restoreModal}`);
      message.success('Бэкап восстановлен. Перезапустите сервер.');
      setRestoreModal(null);
    } catch (e: any) {
      message.error(e.response?.data?.detail || 'Ошибка восстановления');
    } finally { setBackupLoading(false); }
  };

  const downloadBackup = async (filename: string) => {
    try {
      const res = await api.get(`/api/system/backup/download/${filename}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = filename;
      a.click(); window.URL.revokeObjectURL(url);
    } catch { message.error('Ошибка скачивания'); }
  };

  const typeColor: Record<string, string> = { full: 'green', incremental: 'blue', db_copy: 'default' };
  const typeText: Record<string, string> = { full: 'Полный', incremental: 'Инкр.', db_copy: 'Копия БД' };

  const columns = [
    { title: 'Файл', dataIndex: 'filename', key: 'file', ellipsis: true },
    {
      title: 'Тип', dataIndex: 'type', key: 'type', width: 100,
      render: (t: string) => <Tag color={typeColor[t]}>{typeText[t]}</Tag>,
    },
    {
      title: 'Размер', dataIndex: 'size', key: 'size', width: 100,
      render: (s: number) => `${(s / 1024).toFixed(1)} KB`,
    },
    {
      title: 'Дата', dataIndex: 'created_at', key: 'date', width: 160,
      render: (d: string) => dayjs(d).format('DD.MM.YYYY HH:mm'),
    },
    {
      title: '', key: 'actions', width: 160,
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" icon={<DownloadOutlined />} onClick={() => downloadBackup(r.filename)}>Скачать</Button>
          <Button size="small" danger icon={<RollbackOutlined />} onClick={() => setRestoreModal(r.filename)}>Восстановить</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={3}><DatabaseOutlined /> Управление бэкапами</Typography.Title>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={16}>
          <Card title="Создать бэкап" style={{ marginBottom: 16 }}>
            <Space>
              <Button type="primary" icon={<CloudUploadOutlined />} onClick={createFull} loading={backupLoading}>
                Полный бэкап
              </Button>
              <Button icon={<FileProtectOutlined />} onClick={() => { setSelectedModules(modules.map(m => m.key)); setIncModal(true); }}>
                Инкрементальный
              </Button>
            </Space>
          </Card>

          <Card title="История бэкапов">
            {loading ? <Spin /> : (
              <Table
                dataSource={backups} columns={columns} rowKey="filename"
                pagination={{ pageSize: 10 }}
                locale={{ emptyText: 'Бэкапов пока нет' }}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card title="Информация">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Всего бэкапов">{backups.length}</Descriptions.Item>
              <Descriptions.Item label="Полных">
                {backups.filter(b => b.type === 'full').length}
              </Descriptions.Item>
              <Descriptions.Item label="Инкрементальных">
                {backups.filter(b => b.type === 'incremental').length}
              </Descriptions.Item>
              <Descriptions.Item label="Общий размер">
                {(backups.reduce((s, b) => s + b.size, 0) / 1024).toFixed(1)} KB
              </Descriptions.Item>
            </Descriptions>
            <Divider />
            <Typography.Text type="secondary">
              Полный бэкап — вся БД + вложения
              <br />
              Инкрементальный — выбранные модули
            </Typography.Text>
          </Card>
        </Col>
      </Row>

      <Modal title="Инкрементальный бэкап" open={incModal}
        onOk={createIncremental} onCancel={() => setIncModal(false)} confirmLoading={backupLoading}>
        <Typography.Text>Выберите модули для бэкапа:</Typography.Text>
        <Checkbox.Group value={selectedModules} onChange={setSelectedModules} style={{ width: '100%', marginTop: 12 }}>
          <Row gutter={[8, 8]}>
            {modules.map(m => (
              <Col span={12} key={m.key}>
                <Checkbox value={m.key}>{m.label}</Checkbox>
              </Col>
            ))}
          </Row>
        </Checkbox.Group>
      </Modal>

      <Modal title="Восстановление бэкапа" open={!!restoreModal}
        onOk={handleRestore} onCancel={() => setRestoreModal(null)}
        okText="Восстановить" okButtonProps={{ danger: true }}
        confirmLoading={backupLoading}
      >
        <Space>
          <WarningOutlined style={{ fontSize: 24, color: '#faad14' }} />
          <Typography.Text>
            Вы уверены? Текущая база данных будет заменена из файла:<br />
            <strong>{restoreModal}</strong>
            <br /><br />
            <Typography.Text type="danger">Рекомендуется сделать полный бэкап перед восстановлением.</Typography.Text>
          </Typography.Text>
        </Space>
      </Modal>
    </div>
  );
};

export default BackupPage;
