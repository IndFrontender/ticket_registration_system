import smtplib
import httpx
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import Optional, List
from ..config import settings


class NotificationService:

    @staticmethod
    async def send_email(to_email: str, subject: str, body: str, attachments: Optional[List[str]] = None) -> bool:
        if not settings.SMTP_HOST or not settings.SMTP_USER:
            return False
        try:
            msg = MIMEMultipart()
            msg["From"] = settings.SMTP_USER
            msg["To"] = to_email
            msg["Subject"] = subject
            msg.attach(MIMEText(body, "html"))

            if attachments:
                for filepath in attachments:
                    with open(filepath, "rb") as f:
                        part = MIMEBase("application", "octet-stream")
                        part.set_payload(f.read())
                    encoders.encode_base64(part)
                    part.add_header("Content-Disposition", f"attachment; filename={filepath.split('/')[-1]}")
                    msg.attach(part)

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)
            return True
        except Exception as e:
            print(f"Email send error: {e}")
            return False

    @staticmethod
    async def send_telegram(chat_id: str, message: str) -> bool:
        if not settings.TELEGRAM_BOT_TOKEN:
            return False
        try:
            url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
            async with httpx.AsyncClient() as client:
                resp = await client.post(url, json={"chat_id": chat_id, "text": message, "parse_mode": "HTML"})
            return resp.status_code == 200
        except Exception as e:
            print(f"Telegram send error: {e}")
            return False

    @staticmethod
    async def send_vk(user_id: str, message: str) -> bool:
        if not settings.VK_API_TOKEN:
            return False
        try:
            url = "https://api.vk.com/method/messages.send"
            async with httpx.AsyncClient() as client:
                resp = await client.post(url, data={
                    "user_id": user_id,
                    "message": message,
                    "access_token": settings.VK_API_TOKEN,
                    "v": "5.131"
                })
            return resp.status_code == 200
        except Exception as e:
            print(f"VK send error: {e}")
            return False

    @staticmethod
    async def notify_client_ticket_created(ticket_number: str, client_name: str, status: str, email: Optional[str] = None, phone: Optional[str] = None) -> None:
        subject = f"Заявка №{ticket_number} создана"
        body = f"""
        <h2>Уважаемый(ая) {client_name}!</h2>
        <p>Ваша заявка №<strong>{ticket_number}</strong> успешно создана.</p>
        <p><strong>Статус:</strong> {status}</p>
        <p>Следите за статусом заявки в личном кабинете.</p>
        <p>С уважением, Техническая поддержка</p>
        """
        if email:
            await NotificationService.send_email(email, subject, body)

    @staticmethod
    async def notify_master_ticket_created(ticket_number: str, client_name: str, description: str, priority: str, email: Optional[str] = None, phone: Optional[str] = None) -> None:
        subject = f"Новая заявка №{ticket_number}"
        body = f"""
        <h2>Новая заявка №{ticket_number}</h2>
        <p><strong>Клиент:</strong> {client_name}</p>
        <p><strong>Описание:</strong> {description}</p>
        <p><strong>Приоритет:</strong> {priority}</p>
        <p>Требуется обработка.</p>
        """
        if email:
            await NotificationService.send_email(email, subject, body)
