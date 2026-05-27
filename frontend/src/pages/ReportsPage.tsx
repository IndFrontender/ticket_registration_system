import React, { useEffect, useState } from 'react';
import {
  Card, Select, Button, Space, Typography, message, Table, Tag,
  Modal, Input, Form, Descriptions, Divider, Spin, Empty,
  Checkbox, Row, Col, Collapse,
} from 'antd';
import {
  DownloadOutlined, SaveOutlined, DeleteOutlined, BarChartOutlined,
  PlusOutlined, FileExcelOutlined,
} from '@ant-design/icons';
import api from '../services/api';

interface EntityType {
  key: string; label: string;
}

interface FieldInfo {
  key: string; label: string;
}

interface FilterRow {
  field: string; op: string; value: string;
}

interface Template {
  id: number; name: string; entity_type: string;
  columns: string[]; filters: FilterRow[];
}

const OPTS = [
  { value: 'eq', label: '=' },
  { value: 'neq', label: '≠' },
  { value: 'contains', label: 'содержит' },
  { value: 'gt', label: '>' },
  { value: 'gte', label: '≥' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '≤' },
];

const ReportsPage: React.FC = () => {
  const [entityTypes, setEntityTypes] = useState<EntityType[]>([]);
  const [fields, setFields] = useState<FieldInfo[]>([]);
  const [entityType, setEntityType] = useState<string>('tickets');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterRow[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveModal, setSaveModal] = useState(false);
  const [templateName, setTemplateName] = useState('');

  useEffect(() => { loadEntityTypes(); loadTemplates(); }, []);

  useEffect(() => { if (entityType) loadFields(entityType); }, [entityType]);

  const loadEntityTypes = async () => {
    try {
      const res = await api.get('/reports/entity-types');
      setEntityTypes(res.data.types);
    } catch { message.error('Failed to load entity types'); }
  };

  const loadFields = async (type: string) => {
    try {
      const res = await api.get(`/reports/fields/${type}`);
      setFields(res.data.fields);
      setSelectedColumns(res.data.fields.map((f: FieldInfo) => f.key).slice(0, 5));
    } catch { message.error('Failed to load fields'); }
  };

  const loadTemplates = async () => {
    try {
      const res = await api.get('/reports/templates');
      setTemplates(res.data.items);
    } catch { /* ok */ }
  };

  const generateReport = async () => {
    if (!selectedColumns.length) { message.warning('Выберите хотя бы одну колонку'); return; }
    setLoading(true);
    try {
      const res = await api.post('/reports/generate', {
        entity_type: entityType,
        columns: selectedColumns,
        filters,
        title: `Report_${entityType}`,
      }, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${entityType}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      message.success('Отчёт сгенерирован');
    } catch (e: any) {
      message.error(e?.response?.data?.detail || 'Ошибка генерации');
    } finally { setLoading(false); }
  };

  const saveTemplate = async () => {
    if (!templateName.trim()) { message.warning('Введите имя шаблона'); return; }
    try {
      await api.post('/reports/templates', {
        name: templateName,
        entity_type: entityType,
        columns: selectedColumns,
        filters,
      });
      message.success('Шаблон сохранён');
      setSaveModal(false);
      setTemplateName('');
      loadTemplates();
    } catch { message.error('Ошибка сохранения'); }
  };

  const deleteTemplate = async (id: number) => {
    try {
      await api.delete(`/reports/templates/${id}`);
      message.success('Шаблон удалён');
      loadTemplates();
    } catch { message.error('Ошибка удаления'); }
  };

  const applyTemplate = (t: Template) => {
    setEntityType(t.entity_type);
    setSelectedColumns(t.columns);
    setFilters(t.filters || []);
    if (t.entity_type !== entityType) loadFields(t.entity_type);
  };

  const addFilter = () => setFilters([...filters, { field: fields[0]?.key || '', op: 'eq', value: '' }]);
  const removeFilter = (idx: number) => setFilters(filters.filter((_, i) => i !== idx));
  const updateFilter = (idx: number, key: keyof FilterRow, val: string) => {
    const f = [...filters]; f[idx] = { ...f[idx], [key]: val }; setFilters(f);
  };

  const toggleColumn = (key: string) => {
    setSelectedColumns(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  return (
    <div>
      <Typography.Title level={3}>
        <BarChartOutlined /> Конструктор отчётов
      </Typography.Title>

      <Row gutter={24}>
        <Col xs={24} lg={16}>
          <Card title="1. Тип данных" style={{ marginBottom: 16 }}>
            <Select
              value={entityType} onChange={setEntityType} style={{ width: 300 }}
              options={entityTypes.map(e => ({ value: e.key, label: e.label }))}
            />
          </Card>

          <Card title={`2. Выбор полей (${selectedColumns.length} выбрано)`} style={{ marginBottom: 16 }}>
            {fields.length === 0 ? <Spin /> : (
              <Checkbox.Group value={selectedColumns} style={{ width: '100%' }}>
                <Row gutter={[8, 8]}>
                  {fields.map(f => (
                    <Col span={8} key={f.key}>
                      <Checkbox value={f.key} onChange={() => toggleColumn(f.key)} checked={selectedColumns.includes(f.key)}>
                        {f.label}
                      </Checkbox>
                    </Col>
                  ))}
                </Row>
              </Checkbox.Group>
            )}
          </Card>

          <Card title="3. Фильтры" style={{ marginBottom: 16 }}
            extra={<Button icon={<PlusOutlined />} onClick={addFilter} size="small">Добавить фильтр</Button>}>
            {filters.length === 0 ? (
              <Typography.Text type="secondary">Без фильтров — все записи</Typography.Text>
            ) : (
              filters.map((f, i) => (
                <Space key={i} style={{ marginBottom: 8, display: 'flex' }}>
                  <Select value={f.field} onChange={v => updateFilter(i, 'field', v)} style={{ width: 180 }}
                    options={fields.map(fi => ({ value: fi.key, label: fi.label }))} />
                  <Select value={f.op} onChange={v => updateFilter(i, 'op', v)} style={{ width: 120 }}
                    options={OPTS} />
                  <Input value={f.value} onChange={e => updateFilter(i, 'value', e.target.value)}
                    placeholder="Значение" style={{ width: 200 }} />
                  <Button danger icon={<DeleteOutlined />} onClick={() => removeFilter(i)} />
                </Space>
              ))
            )}
          </Card>

          <Space>
            <Button type="primary" icon={<DownloadOutlined />} onClick={generateReport} loading={loading} size="large">
              Сформировать Excel
            </Button>
            <Button icon={<SaveOutlined />} onClick={() => setSaveModal(true)}>Сохранить шаблон</Button>
          </Space>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="Шаблоны отчётов">
            {templates.length === 0 ? (
              <Empty description="Нет сохранённых шаблонов" />
            ) : (
              <Collapse ghost items={templates.map(t => ({
                key: t.id,
                label: <span><FileExcelOutlined /> {t.name}</span>,
                extra: <Button danger size="small" icon={<DeleteOutlined />}
                  onClick={(e) => { e.stopPropagation(); deleteTemplate(t.id); }} />,
                children: (
                  <div>
                    <Descriptions size="small" column={1}>
                      <Descriptions.Item label="Тип">{entityTypes.find(e => e.key === t.entity_type)?.label || t.entity_type}</Descriptions.Item>
                      <Descriptions.Item label="Полей">{t.columns.length}</Descriptions.Item>
                      <Descriptions.Item label="Фильтров">{t.filters.length}</Descriptions.Item>
                    </Descriptions>
                    <Button type="link" onClick={() => applyTemplate(t)}>Применить</Button>
                  </div>
                ),
              }))} />
            )}
          </Card>
        </Col>
      </Row>

      <Modal title="Сохранить шаблон" open={saveModal} onOk={saveTemplate} onCancel={() => setSaveModal(false)}>
        <Form layout="vertical">
          <Form.Item label="Название шаблона">
            <Input value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="Например: Заявки за месяц" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ReportsPage;
