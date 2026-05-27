import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Typography, message, Space } from 'antd';
import { UserOutlined, LockOutlined, SafetyOutlined } from '@ant-design/icons';
import { useAuth } from '../auth/AuthContext';
import api from '../services/api';

const LoginPage: React.FC = () => {
  const { login, initialized } = useAuth();
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(false);

  const handleInit = async () => {
    setInitLoading(true);
    try {
      const res = await api.post('/api/auth/init');
      message.success(`Администратор создан: ${res.data.username} / ${res.data.password}`);
    } catch (e: any) {
      message.error(e.response?.data?.detail || 'Ошибка');
    } finally {
      setInitLoading(false);
    }
  };

  const handleLogin = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      await login(values.username, values.password);
      message.success('Вход выполнен');
    } catch (e: any) {
      message.error(e.response?.data?.detail || 'Неверное имя или пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg, #1e1e1e)',
    }}>
      <Card style={{ width: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <SafetyOutlined style={{ fontSize: 48, color: '#1677ff' }} />
          <Typography.Title level={3} style={{ marginTop: 12 }}>
            Система учета регистрации заявок
          </Typography.Title>
          <Typography.Text type="secondary">Вход в систему</Typography.Text>
        </div>

        {!initialized ? (
          <div style={{ textAlign: 'center' }}>
            <Typography.Text>Первый запуск — создайте администратора</Typography.Text>
            <Button
              type="primary" size="large" block
              loading={initLoading} onClick={handleInit}
              style={{ marginTop: 16 }}
            >
              Создать администратора
            </Button>
          </div>
        ) : (
          <Form layout="vertical" onFinish={handleLogin}>
            <Form.Item name="username" rules={[{ required: true, message: 'Введите имя' }]}>
              <Input prefix={<UserOutlined />} placeholder="Имя пользователя" size="large" />
            </Form.Item>
            <Form.Item name="password" rules={[{ required: true, message: 'Введите пароль' }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="Пароль" size="large" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={loading}>
              Войти
            </Button>
          </Form>
        )}
      </Card>
    </div>
  );
};

export default LoginPage;
