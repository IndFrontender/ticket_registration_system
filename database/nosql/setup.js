// MongoDB Initialization Script
// Run: mongosh < setup.js

// ============================================
// Ticket Registration System - NoSQL Database
// Collections for flexible/unstructured data
// ============================================

db = db.getSiblingDB('ticket_system_nosql');

// 1. Files (metadata for uploaded files, binaries in GridFS)
db.createCollection('files', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['filename', 'mime_type', 'size', 'uploaded_by'],
      properties: {
        filename: { bsonType: 'string' },
        original_name: { bsonType: 'string' },
        mime_type: { bsonType: 'string' },
        size: { bsonType: 'number' },
        md5: { bsonType: 'string' },
        uploaded_by: { bsonType: 'string' },
        uploaded_at: { bsonType: 'date' },
        related_to: {
          bsonType: 'object',
          properties: {
            entity_type: { enum: ['ticket', 'inspection', 'equipment', 'task'] },
            entity_id: { bsonType: 'number' }
          }
        },
        tags: { bsonType: 'array', items: { bsonType: 'string' } },
        metadata: { bsonType: 'object' }
      }
    }
  }
});

// 2. SMS Logs (копии SMS-переписки с клиентами)
db.createCollection('sms_logs', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['client_id', 'direction', 'message', 'timestamp'],
      properties: {
        client_id: { bsonType: 'number' },
        client_name: { bsonType: 'string' },
        phone: { bsonType: 'string' },
        direction: { enum: ['sent', 'received'] },
        message: { bsonType: 'string' },
        timestamp: { bsonType: 'date' },
        ticket_id: { bsonType: ['number', 'null'] },
        screenshot_file_id: { bsonType: ['string', 'null'] },
        status: { bsonType: 'string' },
        tags: { bsonType: 'array', items: { bsonType: 'string' } }
      }
    }
  }
});

// 3. Inspection Attachments (скриншоты, документы проверок)
db.createCollection('inspection_attachments', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['inspection_id', 'filename', 'uploaded_at'],
      properties: {
        inspection_id: { bsonType: 'number' },
        ticket_id: { bsonType: 'number' },
        filename: { bsonType: 'string' },
        description: { bsonType: 'string' },
        attachment_type: { enum: ['screenshot', 'document', 'photo', 'other'] },
        file_id: { bsonType: 'string' },
        uploaded_at: { bsonType: 'date' },
        metadata: { bsonType: 'object' }
      }
    }
  }
});

// 4. Task Notes (богатые заметки к задачам)
db.createCollection('task_notes', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['task_id', 'content', 'created_at'],
      properties: {
        task_id: { bsonType: 'number' },
        content: { bsonType: 'string' },
        rich_text: { bsonType: 'string' },
        attachments: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            properties: {
              filename: { bsonType: 'string' },
              file_id: { bsonType: 'string' },
              mime_type: { bsonType: 'string' }
            }
          }
        },
        created_at: { bsonType: 'date' },
        updated_at: { bsonType: 'date' }
      }
    }
  }
});

// 5. Equipment Logs (свободные логи по оборудованию)
db.createCollection('equipment_logs', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['equipment_id', 'action', 'timestamp'],
      properties: {
        equipment_id: { bsonType: 'number' },
        action: { bsonType: 'string' },
        description: { bsonType: 'string' },
        details: { bsonType: 'object' },
        operator: { bsonType: 'string' },
        timestamp: { bsonType: 'date' },
        files: {
          bsonType: 'array',
          items: { bsonType: 'object' }
        }
      }
    }
  }
});

// 6. Notification History (гибкая история уведомлений)
db.createCollection('notification_history', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['type', 'channel', 'status', 'created_at'],
      properties: {
        type: { bsonType: 'string' },
        channel: { bsonType: 'string' },
        title: { bsonType: 'string' },
        body: { bsonType: 'string' },
        recipient: { bsonType: 'string' },
        status: { enum: ['sent', 'failed', 'pending', 'delivered'] },
        error: { bsonType: ['string', 'null'] },
        metadata: { bsonType: 'object' },
        created_at: { bsonType: 'date' },
        delivered_at: { bsonType: ['date', 'null'] }
      }
    }
  }
});

// 7. Audit Trail (аудит действий)
db.createCollection('audit_log', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['user', 'action', 'entity_type', 'entity_id', 'timestamp'],
      properties: {
        user: { bsonType: 'string' },
        action: { bsonType: 'string' },
        entity_type: { bsonType: 'string' },
        entity_id: { bsonType: 'number' },
        changes: { bsonType: 'object' },
        ip_address: { bsonType: 'string' },
        user_agent: { bsonType: 'string' },
        timestamp: { bsonType: 'date' }
      }
    }
  }
});

// 8. Weekly Reports (еженедельные отчёты)
db.createCollection('weekly_reports', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['week_start', 'week_end', 'created_at'],
      properties: {
        week_start: { bsonType: 'date' },
        week_end: { bsonType: 'date' },
        title: { bsonType: 'string' },
        summary: { bsonType: 'string' },
        tasks_completed: { bsonType: 'array', items: { bsonType: 'object' } },
        equipment_work: { bsonType: 'array', items: { bsonType: 'object' } },
        notes: { bsonType: 'string' },
        created_at: { bsonType: 'date' }
      }
    }
  }
});

// Indexes
db.files.createIndex({ 'related_to.entity_type': 1, 'related_to.entity_id': 1 });
db.files.createIndex({ uploaded_by: 1 });
db.files.createIndex({ tags: 1 });

db.sms_logs.createIndex({ client_id: 1, timestamp: -1 });
db.sms_logs.createIndex({ ticket_id: 1 });
db.sms_logs.createIndex({ phone: 1 });

db.inspection_attachments.createIndex({ inspection_id: 1 });

db.task_notes.createIndex({ task_id: 1 });

db.equipment_logs.createIndex({ equipment_id: 1, timestamp: -1 });

db.notification_history.createIndex({ status: 1, scheduled_for: 1 });
db.notification_history.createIndex({ created_at: -1 });

db.audit_log.createIndex({ entity_type: 1, entity_id: 1 });
db.audit_log.createIndex({ timestamp: -1 });
db.audit_log.createIndex({ user: 1, timestamp: -1 });

print('MongoDB collections created successfully!');
