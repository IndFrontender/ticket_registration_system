-- ============================================
-- Ticket Registration System
-- Relational Database Schema (PostgreSQL/SQLite)
-- ============================================

-- 1. Clients
CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    client_type VARCHAR(20) NOT NULL CHECK (client_type IN ('individual', 'legal')),
    name VARCHAR(300) NOT NULL,
    phone VARCHAR(30),
    email VARCHAR(150),
    address TEXT,
    inn VARCHAR(12),
    kpp VARCHAR(9),
    contact_person VARCHAR(300),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tickets (заявки)
CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    number VARCHAR(30) UNIQUE NOT NULL,
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    short_description VARCHAR(500),
    full_description TEXT,
    priority VARCHAR(20) CHECK (priority IN ('critical','high','medium','low')),
    status VARCHAR(30) CHECK (status IN ('new','in_progress','completed','closed','on_hold')),
    work_date DATE,                          -- дата выполнения работ
    review_date DATE,                        -- дата проверки
    warranty_months INTEGER DEFAULT 0,       -- срок гарантии в месяцах
    warranty_end_date DATE,                  -- окончание гарантии
    equipment_id INTEGER,                    -- связанное оборудование (если есть)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Ticket Services (услуги по заявке)
CREATE TABLE IF NOT EXISTS ticket_services (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    service_name VARCHAR(300) NOT NULL,
    description TEXT,
    quantity INTEGER DEFAULT 1,
    price NUMERIC(12,2) DEFAULT 0,
    total NUMERIC(12,2) DEFAULT 0,
    warranty_months INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Equipment (оборудование: принтеры, ККТ, СВН и т.д.)
CREATE TABLE IF NOT EXISTS equipment (
    id SERIAL PRIMARY KEY,
    equipment_type VARCHAR(100) NOT NULL,     -- 'printer', 'kkt', 'svn', 'other'
    manufacturer VARCHAR(200),
    model VARCHAR(200),
    serial_number VARCHAR(200),
    inventory_number VARCHAR(200),
    location TEXT,
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    purchase_date DATE,
    warranty_expiry DATE,
    status VARCHAR(30) DEFAULT 'active' CHECK (status IN ('active','inactive','broken','written_off')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Equipment Maintenance (ТО оборудования)
CREATE TABLE IF NOT EXISTS equipment_maintenance (
    id SERIAL PRIMARY KEY,
    equipment_id INTEGER NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    maintenance_type VARCHAR(100) NOT NULL,   -- 'ТО1', 'ТО2', 'repair', 'unscheduled'
    description TEXT NOT NULL,
    replaced_parts TEXT,                       -- замененные узлы
    work_date DATE NOT NULL,
    next_maintenance_date DATE,               -- дата следующего ТО
    ticket_id INTEGER REFERENCES tickets(id) ON DELETE SET NULL,
    cost NUMERIC(12,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Equipment Reminders (напоминания по оборудованию)
CREATE TABLE IF NOT EXISTS equipment_reminders (
    id SERIAL PRIMARY KEY,
    equipment_id INTEGER NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    title VARCHAR(300) NOT NULL,
    description TEXT,
    reminder_date DATE NOT NULL,
    repeat_interval VARCHAR(50),               -- 'monthly', 'quarterly', 'yearly', NULL
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tasks (личный блокнот задач)
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(300) NOT NULL,
    description TEXT,
    category VARCHAR(100),                     -- 'main_work', 'service', 'personal', 'other'
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','cancelled')),
    due_date DATE,
    completed_at TIMESTAMP,
    ticket_id INTEGER REFERENCES tickets(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Inspection Reports (отчёты о проверке)
CREATE TABLE IF NOT EXISTS inspection_reports (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    report_date DATE NOT NULL,
    report_type VARCHAR(50) DEFAULT 'monthly' CHECK (report_type IN ('monthly','quarterly','yearly','custom')),
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending','completed','failed')),
    notes TEXT,
    client_confirmed BOOLEAN DEFAULT FALSE,     -- подтверждение клиента
    client_response TEXT,                        -- ответ клиента
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Inspection Files (файлы отчётов)
CREATE TABLE IF NOT EXISTS inspection_files (
    id SERIAL PRIMARY KEY,
    inspection_id INTEGER NOT NULL REFERENCES inspection_reports(id) ON DELETE CASCADE,
    filename VARCHAR(300) NOT NULL,
    filepath TEXT NOT NULL,
    file_type VARCHAR(50),                      -- 'report', 'sms_screenshot', 'client_response', 'other'
    file_size BIGINT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Notifications (история уведомлений)
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER REFERENCES tickets(id) ON DELETE SET NULL,
    notification_type VARCHAR(50) NOT NULL,     -- 'reminder', 'warranty', 'inspection', 'task'
    channel VARCHAR(30),                        -- 'email', 'telegram', 'sms', 'push'
    recipient VARCHAR(200),
    title VARCHAR(300),
    message TEXT,
    is_sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP,
    scheduled_for TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Warranty Checklist (гарантийные проверки)
CREATE TABLE IF NOT EXISTS warranty_checklist (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    check_date DATE NOT NULL,
    month_number INTEGER NOT NULL,              -- номер месяца гарантии
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending','completed','skipped')),
    notes TEXT,
    files_attached INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tickets_client ON tickets(client_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_work_date ON tickets(work_date);
CREATE INDEX IF NOT EXISTS idx_tickets_review_date ON tickets(review_date);
CREATE INDEX IF NOT EXISTS idx_tickets_warranty_end ON tickets(warranty_end_date);
CREATE INDEX IF NOT EXISTS idx_equipment_client ON equipment(client_id);
CREATE INDEX IF NOT EXISTS idx_equipment_type ON equipment(equipment_type);
CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_next ON equipment_maintenance(next_maintenance_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_inspection_reports_date ON inspection_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_warranty_checklist_date ON warranty_checklist(check_date);
