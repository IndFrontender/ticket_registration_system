import React, { useState } from 'react';
import { Card, Form, Input, Button, Typography, message, Tabs, Select } from 'antd';
import { UserOutlined, LockOutlined, SafetyOutlined, TeamOutlined } from '@ant-design/icons';
import { useAuth } from '../auth/AuthContext';
import api from '../services/api';

const LoginPage: React.FC = () => {
  const { login, initialized } = useAuth();
  const [loading, setLoading] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(false);
  const [regForm] = Form.useForm();

  const handleInit = async () => {
    setInitLoading(true);
    try {
      const res = await api.post('/auth/init');
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

  const handleRegister = async (values: any) => {
    setRegLoading(true);
    try {
      await api.post('/auth/register', values);
      message.success('Регистрация выполнена! Теперь можно войти.');
      regForm.resetFields();
    } catch (e: any) {
      console.error('Registration error:', e.response?.data || e.message);
      const detail = e.response?.data?.detail;
      let msg: string;
      if (Array.isArray(detail)) {
        msg = detail.map((d: any) => d.msg || d.message).join('; ');
      } else if (typeof detail === 'string') {
        msg = detail;
      } else {
        msg = e.response?.data?.message
          || (e.response ? `Ошибка сервера (${e.response.status})` : 'Сервер недоступен');
      }
      message.error(msg);
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg, #1e1e1e)',
    }}>
      <Card style={{ width: 420, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <SafetyOutlined style={{ fontSize: 48, color: '#1677ff' }} />
          <Typography.Title level={3} style={{ marginTop: 12 }}>
            Система учета регистрации заявок
          </Typography.Title>
        </div>

        <Tabs
          centered
          items={[
            {
              key: 'login',
              label: 'Вход',
              children: (
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
                  {!initialized && (
                    <Button
                      type="link" block
                      loading={initLoading} onClick={handleInit}
                      style={{ marginTop: 8 }}
                    >
                      Первый запуск — создать администратора
                    </Button>
                  )}
                </Form>
              ),
            },
            {
              key: 'register',
              label: 'Регистрация',
              children: (
                <Form layout="vertical" form={regForm} onFinish={handleRegister} initialValues={{ role: 'master' }}>
                  <Form.Item name="username" rules={[{ required: true, message: 'Введите имя' }]}>
                    <Input prefix={<UserOutlined />} placeholder="Имя пользователя" size="large" />
                  </Form.Item>
                  <Form.Item name="password" rules={[{ required: true, message: 'Введите пароль' }]}>
                    <Input.Password prefix={<LockOutlined />} placeholder="Пароль" size="large" />
                  </Form.Item>
                  <Form.Item name="full_name">
                    <Input prefix={<TeamOutlined />} placeholder="ФИО (необязательно)" size="large" />
                  </Form.Item>
                  <Form.Item name="role" label="Роль" rules={[{ required: true, message: 'Выберите роль' }]}>
                    <Select
                      options={[
                        { value: 'master', label: 'Мастер' },
                        { value: 'admin', label: 'Администратор' },
                      ]}
                      size="large"
                    />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" block size="large" loading={regLoading}>
                    Зарегистрироваться
                  </Button>
                </Form>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default LoginPage;
