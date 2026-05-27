# Система учета регистрации заявок

Система учёта заявок, оборудования, задач и гарантийного обслуживания для системного администратора.

---

## Возможности

- **Заявки** — создание, статусы, приоритеты, история, вложения, гарантия
- **Клиенты** — физ. и юр. лица, контакты, ИНН/КПП
- **Оборудование** — принтеры, ККТ, СВН, ТО, серийные номера
- **Задачи** — личный блокнот, категории, сроки, приоритеты
- **Проверки и гарантия** — ежемесячные/ежеквартальные проверки, гарантийные ТО, напоминания
- **Документы** — генерация PDF (чеки, гарантийные талоны, счета, акты)
- **SMS-логи** — учёт входящих/исходящих SMS (MongoDB)
- **AI-помощник** — встроенный чат-консультант (OpenAI + офлайн)
- **Отчёты Excel** — конструктор с настраиваемыми полями, фильтрами, шаблонами
- **Аналитика** — графики по дням, топ-клиенты, статусы, метрики Prometheus
- **Бэкапы** — автоматические при старте, ручные, скачивание, ротация 30 копий
- **Тёмная/светлая тема** — переключение в интерфейсе, сохраняется в localStorage
- **Метрики** — Prometheus `/metrics`, uptime, request count/duration, psutil

---

## Архитектура

```
┌─ Frontend ──────────────────────────────┐
│  React + TypeScript + Vite + Ant Design │
│  10 страниц, AI-чат, дашборд, графики   │
└──────────────────┬──────────────────────┘
                   │ HTTP
┌─ Backend ────────▼──────────────────────┐
│  FastAPI (Python 3.10+)                 │
│  SQLite / PostgreSQL                    │
│  65+ REST endpoint'ов                   │
│  Prometheus /metrics                    │
│  SPA-сервер (frontend встроен)          │
└──────────────────┬──────────────────────┘
                   │
┌─ Базы данных ────▼──────────────────────┐
│  SQLite — структура (заявки, клиенты..) │
│  MongoDB — SMS, файлы, audit-log (℞)   │
└─────────────────────────────────────────┘
```

### Режимы запуска

| Режим | Команда | Описание |
|-------|---------|---------|
| **Standalone** | `python standalone.py` | Один процесс, SQLite, без Docker |
| **Docker** | `docker-compose up -d` | Микросервисы + MongoDB + Nginx |
| **Разработка** | `python start.py` | Установка deps + сборка + запуск |

---

## Быстрый старт

### 1. Standalone (рекомендуется)

```bash
# Установка зависимостей
cd backend && pip install -r requirements.txt

# Сборка фронтенда
cd ../frontend && npm install && npm run build

# Запуск (API + фронтенд в одном процессе)
cd .. && python standalone.py
# → http://localhost:8000
```

### 2. Универсальный лаунчер

```bash
python start.py
# Автоматически: проверка зависимостей → pip install → npm install → npm run build → запуск
```

### 3. Docker

```bash
docker-compose up -d --build
# → http://localhost
```

---

## Сборка дистрибутивов

### Windows (.exe + .zip)

```batch
scripts\build_windows.bat
# Результат: dist\win-app\TicketSystem.exe
#            dist\TicketSystem-Windows.zip
```

Inno Setup: открыть `scripts\installer.iss` → Build → `dist\TicketSystem-Setup-Windows-*.exe`

### Linux (бинарник + .tar.gz)

```bash
bash scripts/build_linux.sh
# Результат: dist/linux-app/TicketSystem
#            dist/TicketSystem-Linux-*.tar.gz
```

### macOS (.app + .dmg)

```bash
bash scripts/build_macos.sh
# Результат: dist/macos-app/TicketSystem.app
#            dist/TicketSystem-macOS-*.dmg
```

---

## Технологии

| Компонент | Технология |
|-----------|-----------|
| Бэкенд | Python 3.10+, FastAPI, Uvicorn |
| Фронтенд | React 18, TypeScript, Vite, Ant Design 5 |
| БД реляционная | SQLite (dev), PostgreSQL (prod) |
| БД NoSQL (℞) | MongoDB (SMS-логи, файлы, аудит) |
| Отчёты | openpyxl (Excel), WeasyPrint (PDF) |
| Метрики | Prometheus Client, psutil |
| Документы | Jinja2 + WeasyPrint (HTML→PDF) |
| Десктоп (℞) | Electron (системный трей, уведомления) |
| Мобильное (℞) | React Native / Expo |
| AI | OpenAI API + офлайн-режим |

℞ — опционально, не требуется для standalone

---

## API

- Swagger: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- Health: http://localhost:8000/api/health
- Metrics: http://localhost:8000/metrics
- Analytics: http://localhost:8000/api/analytics

### Основные endpoint'ы

| Метод | Путь | Описание |
|-------|------|---------|
| GET/POST | `/api/tickets` | Список / создание заявок |
| GET/PUT/DELETE | `/api/tickets/{id}` | Детали / обновление / удаление |
| POST | `/api/tickets/{id}/attachments` | Загрузка вложения |
| GET/POST | `/api/clients` | Список / создание клиентов |
| GET/POST | `/api/equipment` | Оборудование |
| GET/POST | `/api/tasks` | Задачи |
| GET/POST | `/api/inspections` | Проверки |
| GET/POST | `/api/reports/generate` | Генерация Excel |
| POST | `/api/system/backup` | Создание бэкапа БД |

---

## Переменные окружения

| Переменная | Назначение |
|-----------|-----------|
| `DATABASE_URL` | URL БД (по умолчанию `sqlite:///./ticket_system.db`) |
| `PORT` | Порт сервера (по умолчанию 8000) |
| `OPENAI_API_KEY` | Ключ OpenAI для AI-помощника |
| `SMTP_HOST` | SMTP-сервер для email-уведомлений |
| `SMTP_USER` | Логин SMTP |
| `SMTP_PASSWORD` | Пароль SMTP |
| `TELEGRAM_BOT_TOKEN` | Токен Telegram бота |

---

## Структура проекта

```
├── backend/
│   └── app/
│       ├── main.py              # FastAPI приложение
│       ├── windows_app.py       # Entry point для EXE
│       ├── database.py          # SQLAlchemy engine (WAL mode)
│       ├── models.py            # 11 SQLAlchemy моделей
│       ├── routers/             # 11 роутеров
│       ├── services/            # metrics, backup, report, mongo
│       └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # SPA, меню, роутинг
│   │   ├── pages/               # 10 страниц
│   │   ├── components/          # AI-помощник
│   │   ├── theme/               # ThemeContext (светлая/тёмная)
│   │   └── services/api.ts      # HTTP-клиент
│   ├── index.html
│   └── package.json
├── scripts/
│   ├── build_windows.bat        # Сборка EXE
│   ├── build_linux.sh           # Сборка Linux
│   ├── build_macos.sh           # Сборка macOS
│   ├── start_windows.bat        # Лаунчер Windows
│   ├── start_linux.sh           # Лаунчер Linux
│   ├── start_macos.sh           # Лаунчер macOS
│   └── installer.iss            # Inno Setup
├── database/
│   ├── sql/001_create_tables.sql
│   └── nosql/setup.js
├── docker-compose.yml           # Микросервисный режим
├── standalone.py                # Основной лаунчер
├── start.py                     # Универсальный лаунчер
└── run.bat                      # Быстрый запуск (Win)
```

---

## Требования

- **Python** 3.10+
- **Node.js** 18+
- **npm** 9+

Для сборки дистрибутивов:
- **PyInstaller** (`pip install pyinstaller`)
- **Inno Setup** (только Windows, для .exe установщика)
