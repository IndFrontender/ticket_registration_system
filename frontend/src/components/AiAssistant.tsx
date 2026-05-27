import React, { useState, useRef, useEffect } from 'react';
import {
  Drawer, Input, Button, Space, Typography, Spin, Avatar, Tag, Card, Row, Col, Form, Select, InputNumber, message,
} from 'antd';
import {
  RobotOutlined, UserOutlined, SendOutlined, CloseOutlined,
  CustomerServiceOutlined, BulbOutlined, FileTextOutlined, CheckOutlined,
} from '@ant-design/icons';
import { aiApi, documentsApi } from '../services/api';
import { useTheme } from '../theme/ThemeContext';

const DOC_LABELS: Record<string, string> = {
  receipt: 'Кассовый чек',
  warranty: 'Гарантийный талон',
  invoice: 'Платёжный документ',
  act: 'Акт выполненных работ',
};

interface Message {
  role: 'user' | 'assistant';
  content: string;
  suggested_actions?: string[];
  document_action?: any;
}

const suggestions = [
  'Как создать заявку?',
  'Расскажи о статусах',
  'Какой приоритет выбрать?',
  'Создай чек',
  'Нужен гарантийный талон',
];

const AiAssistant: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Здравствуйте! Я AI-консультант системы заявок.\n\nЯ помогу вам:\n• Создать заявку\n• Подскажу приоритет\n• Объясню статусы\n• Сформирую документы (чеки, талоны, платёжные документы)\n\nЧем могу помочь?',
      suggested_actions: ['Создать заявку', 'Узнать статус', 'Создать чек'],
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [docForm] = Form.useForm();
  const [docSubmitting, setDocSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isDark } = useTheme();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await aiApi.chat(input);
      const msg: Message = {
        role: 'assistant',
        content: res.data.answer,
        suggested_actions: res.data.suggested_actions,
        document_action: res.data.document_action,
      };
      setMessages((prev) => [...prev, msg]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Произошла ошибка. Попробуйте ещё раз.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestion = (text: string) => {
    setInput(text);
  };

  const handleDocSubmit = async (msgIndex: number, values: any) => {
    setDocSubmitting(true);
    try {
      const action = messages[msgIndex].document_action;
      const ticketId = parseInt(values.ticket_id, 10);
      if (isNaN(ticketId)) { message.error('Выберите заявку'); return; }

      const itemNames = (values.items || '').split(',').map((s: string) => s.trim()).filter(Boolean);
      const quantities = (values.quantities || '').split(',').map((s: string) => parseInt(s.trim(), 10) || 1);
      const prices = (values.prices || '').split(',').map((s: string) => parseFloat(s.trim()) || 0);
      const items = itemNames.map((name: string, i: number) => ({
        service_name: name,
        quantity: quantities[i] || 1,
        price: prices[i] || 0,
        total: (quantities[i] || 1) * (prices[i] || 0),
      }));

      const docData: any = {
        doc_type: action.doc_type,
        total_amount: values.total_amount || items.reduce((sum: number, it: any) => sum + it.total, 0),
        warranty_period: values.warranty_period || null,
        items,
      };

      const res = await documentsApi.create(ticketId, docData);
      message.success(`${DOC_LABELS[action.doc_type] || 'Документ'} создан!`);

      const updated = [...messages];
      updated[msgIndex] = { ...updated[msgIndex], document_action: null };
      updated.push({
        role: 'assistant',
        content: `✅ **${DOC_LABELS[action.doc_type] || 'Документ'}** №${res.data.number} создан!\n\n[Посмотреть все документы](/documents-create)`,
        suggested_actions: ['Открыть документы', 'Создать ещё'],
      });
      setMessages(updated);
    } catch (e: any) {
      message.error(e.response?.data?.detail || 'Ошибка создания документа');
    } finally {
      setDocSubmitting(false);
    }
  };

  const c = {
    bodyBg: isDark ? '#1e1e1e' : '#f0f2f5',
    assistantBubble: isDark ? '#2d2d30' : '#ffffff',
    assistantText: isDark ? '#e0e0e0' : '#000000',
    inputBg: isDark ? '#252526' : '#ffffff',
    inputBorder: isDark ? '#2d2d30' : '#f0f0f0',
    tagBg: isDark ? '#2d2d30' : '#f5f5f5',
    tagText: isDark ? '#a0a0a0' : '#666666',
    tagBorder: isDark ? '#3e3e42' : '#d9d9d9',
    gradient: 'linear-gradient(135deg, #4da3ff 0%, #764ba2 100%)',
    cardBg: isDark ? '#252526' : '#fafafa',
  };

  return (
    <Drawer
      title={
        <Space>
          <Avatar icon={<CustomerServiceOutlined />} style={{ background: c.gradient }} />
          <div>
            <Typography.Text strong style={{ fontSize: 16 }}>AI-консультант</Typography.Text>
            <br />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>Всегда рад помочь</Typography.Text>
          </div>
        </Space>
      }
      placement="right"
      onClose={onClose}
      open={open}
      width={440}
      styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column', height: 'calc(100% - 55px)' } }}
      extra={<Button type="text" icon={<CloseOutlined />} onClick={onClose} />}
    >
      <div style={{ flex: 1, overflow: 'auto', padding: 16, background: c.bodyBg }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', gap: 8 }}>
              <Avatar
                icon={msg.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
                style={{
                  background: msg.role === 'user' ? '#1677ff' : c.gradient,
                  flexShrink: 0,
                }}
              />
              <div style={{ maxWidth: '80%' }}>
                <Card
                  size="small"
                  style={{
                    background: msg.role === 'user' ? '#1677ff' : c.assistantBubble,
                    color: msg.role === 'user' ? '#fff' : c.assistantText,
                    border: 'none',
                    borderRadius: 12,
                    boxShadow: `0 2px 8px rgba(0,0,0,${isDark ? 0.2 : 0.06})`,
                  }}
                >
                  <Typography.Text style={{ color: msg.role === 'user' ? '#fff' : c.assistantText, whiteSpace: 'pre-wrap' }}>
                    {msg.content}
                  </Typography.Text>
                </Card>
                {msg.suggested_actions && msg.role === 'assistant' && (
                  <div style={{ marginTop: 8 }}>
                    {msg.suggested_actions.map((action, j) => (
                      <Tag
                        key={j}
                        style={{ cursor: 'pointer', marginBottom: 4, background: c.tagBg, color: c.tagText, border: `1px solid ${c.tagBorder}` }}
                        onClick={() => handleSuggestion(action)}
                      >
                        <BulbOutlined /> {action}
                      </Tag>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {msg.document_action && msg.role === 'assistant' && (
              <Card
                size="small"
                style={{ margin: '8px 0 0 40px', background: c.cardBg, border: `1px solid ${c.inputBorder}` }}
                title={<Space><FileTextOutlined />{DOC_LABELS[msg.document_action.doc_type] || 'Документ'}</Space>}
              >
                <Form
                  form={docForm}
                  layout="vertical"
                  size="small"
                  onFinish={(values) => handleDocSubmit(i, values)}
                  disabled={docSubmitting}
                >
                  {msg.document_action.fields?.map((field: any) => (
                    <Form.Item
                      key={field.key}
                      name={field.key}
                      label={field.label}
                      rules={field.required ? [{ required: true, message: `Заполните ${field.label}` }] : undefined}
                    >
                      {field.type === 'select' ? (
                        <Select
                          placeholder={field.placeholder}
                          showSearch
                          filterOption={(input, option) => String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                          options={field.options?.map((o: string) => {
                            const parts = o.split(':');
                            return { value: parts[0], label: parts[1] || o };
                          })}
                        />
                      ) : field.type === 'number' ? (
                        <InputNumber style={{ width: '100%' }} min={0} step={0.01} placeholder={field.placeholder} />
                      ) : (
                        <Input placeholder={field.placeholder} />
                      )}
                    </Form.Item>
                  ))}
                  <Form.Item>
                    <Space>
                      <Button type="primary" htmlType="submit" loading={docSubmitting} icon={<CheckOutlined />}>
                        {msg.document_action.step < msg.document_action.total_steps ? 'Далее' : 'Создать документ'}
                      </Button>
                    </Space>
                  </Form.Item>
                </Form>
              </Card>
            )}
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
            <Avatar icon={<RobotOutlined />} style={{ background: c.gradient }} />
            <Spin size="small" />
            <Typography.Text type="secondary">Печатает...</Typography.Text>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ padding: 12, borderTop: `1px solid ${c.inputBorder}`, background: c.inputBg }}>
        <Row gutter={[4, 4]} style={{ marginBottom: 8 }}>
          {suggestions.map((s, i) => (
            <Col key={i}>
              <Tag
                style={{ cursor: 'pointer', background: c.tagBg, color: c.tagText, border: `1px solid ${c.tagBorder}` }}
                onClick={() => handleSuggestion(s)}
              >
                {s}
              </Tag>
            </Col>
          ))}
        </Row>
        <Space.Compact style={{ width: '100%' }}>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onPressEnter={handleSend}
            placeholder="Введите сообщение..."
            size="large"
          />
          <Button type="primary" icon={<SendOutlined />} onClick={handleSend} loading={loading} size="large" />
        </Space.Compact>
      </div>
    </Drawer>
  );
};

export default AiAssistant;
