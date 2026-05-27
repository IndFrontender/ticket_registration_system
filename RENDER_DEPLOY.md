# Деплой на Render.com — пошаговая инструкция

**[Render](https://render.com)** — бесплатный хостинг с PostgreSQL, SSL и авто-деплоем из GitHub.

## Шаг 1: Форкнуть / подготовить репозиторий

Проект уже на GitHub: https://github.com/IndFrontender/ticket_registration_system

Убедитесь что в корне есть файл `render.yaml` — он уже настроен.

## Шаг 2: Зарегистрироваться на Render

1. Перейти на https://dashboard.render.com/register
2. Войти через GitHub (кнопка **"Continue with GitHub"**)
3. Подтвердить email

## Шаг 3: Создать Blueprint (Infrastructure as Code)

1. На панели нажать **"New +"** → **"Blueprint"**
2. Выбрать репозиторий: `IndFrontender/ticket_registration_system`
3. Render прочитает `render.yaml` и покажет:
   - **Web Service** → `ticket-system`
   - **PostgreSQL** → `ticket-system-db`
4. Нажать **"Apply"**
5. Ждать сборки (5-10 минут, лайв-лог в дашборде)

## Шаг 4: Создать администратора

После деплоя открыть в браузере:
```
https://ticket-system.onrender.com/api/auth/init
```

Скопировать выданные логин и пароль в `.env`.

## Шаг 5: Вход в систему

Открыть `https://ticket-system.onrender.com`
Ввести логин/пароль с предыдущего шага.

## Дополнительно

### Бесплатные лимиты Render
- 750 часов в месяц (хватает на always-on, если срок службы не истекал - если expire - только 450 часов)
- PostgreSQL 1GB
- Полное шифрование SSL

### Рестарт при падении
При ошибке сервис перезапускается автоматически. Все изменения в БД сохраняются (PostgreSQL).

### Обновление кода
При push в `master/main` Render автоматом пересобирает и перезапускает сервис.

### Полезные ссылки
- Дашборд: https://dashboard.render.com
- Логи сервиса: Dashboard → ticket-system → Logs
- PostgreSQL: Dashboard → ticket-system-db → Info → PSQL Command
