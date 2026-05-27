import React, { useState } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Layout, Menu, Typography, Button, Badge, Space, Spin, Dropdown,
} from 'antd';
import {
  DashboardOutlined, FileTextOutlined, UserOutlined,
  TeamOutlined, MessageOutlined, RobotOutlined, BarChartOutlined,
  ToolOutlined, UnorderedListOutlined, SafetyOutlined, WechatOutlined,
  SunOutlined, MoonOutlined, DatabaseOutlined, LogoutOutlined,
  PrinterOutlined, FileSearchOutlined,
} from '@ant-design/icons';
import { useTheme } from './theme/ThemeContext';
import { useAuth, AuthProvider } from './auth/AuthContext';
import Dashboard from './pages/Dashboard';
import TicketsList from './pages/TicketsList';
import TicketDetail from './pages/TicketDetail';
import ClientsList from './pages/ClientsList';
import DocumentsPage from './pages/DocumentsPage';
import ReportsPage from './pages/ReportsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import EquipmentPage from './pages/EquipmentPage';
import TasksPage from './pages/TasksPage';
import InspectionsPage from './pages/InspectionsPage';
import SmsLogsPage from './pages/SmsLogsPage';
import BackupPage from './pages/BackupPage';
import UsersPage from './pages/UsersPage';
import DocumentsCreatePage from './pages/DocumentsCreatePage';
import AdminReportsPage from './pages/AdminReportsPage';
import EfficiencyPage from './pages/EfficiencyPage';
import LoginPage from './pages/LoginPage';
import AiAssistant from './components/AiAssistant';

const { Header, Sider, Content } = Layout;

const AppContent: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const { user, loading, initialized, logout, isAdmin } = useAuth();

  if (loading) {
    return <Spin size="large" style={{ display: 'block', margin: '200px auto' }} />;
  }

  if (!user) {
    return <LoginPage />;
  }

  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: <Link to="/">Дашборд</Link> },
    { key: '/tickets', icon: <FileTextOutlined />, label: <Link to="/tickets">Заявки</Link> },
    { key: '/clients', icon: <TeamOutlined />, label: <Link to="/clients">Клиенты</Link> },
    { key: '/equipment', icon: <ToolOutlined />, label: <Link to="/equipment">Оборудование</Link> },
    { key: '/tasks', icon: <UnorderedListOutlined />, label: <Link to="/tasks">Задачи</Link> },
    { key: '/inspections', icon: <SafetyOutlined />, label: <Link to="/inspections">Проверки</Link> },
    { key: '/sms-logs', icon: <WechatOutlined />, label: <Link to="/sms-logs">SMS-логи</Link> },
    { key: '/documents', icon: <UserOutlined />, label: <Link to="/documents">Документы</Link> },
    { key: '/analytics', icon: <BarChartOutlined />, label: <Link to="/analytics">Аналитика</Link> },
    { key: '/reports', icon: <BarChartOutlined />, label: <Link to="/reports">Отчёты</Link> },
    { key: '/documents-create', icon: <PrinterOutlined />, label: <Link to="/documents-create">Чеки/Талоны</Link> },
    ...(isAdmin ? [
      { key: '/backup', icon: <DatabaseOutlined />, label: <Link to="/backup">Бэкапы</Link> },
      { key: '/users', icon: <TeamOutlined />, label: <Link to="/users">Пользователи</Link> },
      { key: '/admin-reports', icon: <FileSearchOutlined />, label: <Link to="/admin-reports">Отчёты по услугам</Link> },
      { key: '/efficiency', icon: <BarChartOutlined />, label: <Link to="/efficiency">Эффективность</Link> },
    ] : []),
  ];

  const siderTheme = isDark ? 'dark' : 'light';
  const userMenu = {
    items: [
      { key: 'role', label: `Роль: ${user.role === 'admin' ? 'Администратор' : 'Мастер'}`, disabled: true },
      { key: 'logout', label: 'Выйти', icon: <LogoutOutlined />, danger: true },
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === 'logout') { logout(); navigate('/login'); }
    },
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} theme={siderTheme} width={220}>
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography.Title level={4} style={{ margin: 0, fontSize: collapsed ? 14 : 13, color: isDark ? '#e0e0e0' : undefined }}>
            {collapsed ? 'СУРЗ' : 'Система учета регистрации заявок системного администратора'}
          </Typography.Title>
        </div>
        <Menu mode="inline" theme={siderTheme} selectedKeys={[location.pathname]} items={menuItems} />
      </Sider>
      <Layout>
        <Header style={{
          padding: '0 24px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
          borderBottom: `1px solid ${isDark ? '#2d2d30' : '#f0f0f0'}`,
        }}>
          <Space>
            <Button
              type={isDark ? 'default' : 'text'}
              icon={isDark ? <SunOutlined style={{ color: '#faad14' }} /> : <MoonOutlined />}
              onClick={toggleTheme}
            >
              {isDark ? 'Светлая' : 'Тёмная'}
            </Button>
            <Badge count={3} size="small">
              <Button type="text" icon={<MessageOutlined style={{ color: isDark ? '#a0a0a0' : '#666' }} />} />
            </Badge>
            <Button
              type="primary"
              icon={<RobotOutlined />}
              onClick={() => setAiOpen(true)}
            >
              AI-помощник
            </Button>
            <Dropdown menu={userMenu}>
              <Button type="text" icon={<UserOutlined />}>
                {user.full_name || user.username}
              </Button>
            </Dropdown>
          </Space>
        </Header>
        <Content style={{ margin: 24, minHeight: 280 }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tickets" element={<TicketsList />} />
            <Route path="/tickets/:id" element={<TicketDetail />} />
            <Route path="/clients" element={<ClientsList />} />
            <Route path="/equipment" element={<EquipmentPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/inspections" element={<InspectionsPage />} />
            <Route path="/sms-logs" element={<SmsLogsPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/documents-create" element={<DocumentsCreatePage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            {isAdmin && <Route path="/backup" element={<BackupPage />} />}
            {isAdmin && <Route path="/users" element={<UsersPage />} />}
            {isAdmin && <Route path="/admin-reports" element={<AdminReportsPage />} />}
            {isAdmin && <Route path="/efficiency" element={<EfficiencyPage />} />}
          </Routes>
        </Content>
      </Layout>
      <AiAssistant open={aiOpen} onClose={() => setAiOpen(false)} />
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
