import os
from datetime import datetime
from jinja2 import Environment, FileSystemLoader
from ..models import Ticket, Document, DocumentItem, StatusEnum
from ..database import SessionLocal

TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), "..", "templates")
os.makedirs(TEMPLATES_DIR, exist_ok=True)


def generate_receipt(ticket: Ticket, doc: Document) -> str:
    items_html = ""
    for item in doc.items:
        items_html += f"""
        <tr>
            <td>{item.service_name}</td>
            <td>{item.quantity}</td>
            <td>{item.price:.2f} руб.</td>
            <td>{item.total:.2f} руб.</td>
        </tr>
        """

    html = f"""
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: 'DejaVu Sans', Arial, sans-serif; font-size: 14px; }}
            .header {{ text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 20px; }}
            .info {{ margin-bottom: 15px; }}
            table {{ width: 100%; border-collapse: collapse; margin: 15px 0; }}
            th, td {{ border: 1px solid #333; padding: 8px; text-align: left; }}
            th {{ background: #f0f0f0; }}
            .total {{ font-size: 16px; font-weight: bold; text-align: right; margin-top: 10px; }}
            .footer {{ margin-top: 30px; font-size: 12px; color: #666; }}
        </style>
    </head>
    <body>
        <div class="header">КАССОВЫЙ ЧЕК № {doc.number}</div>
        <div class="info">
            <p><strong>Дата:</strong> {doc.created_at.strftime('%d.%m.%Y %H:%M')}</p>
            <p><strong>Клиент:</strong> {ticket.client.name}</p>
            <p><strong>Заявка:</strong> № {ticket.number}</p>
        </div>
        <table>
            <tr>
                <th>Услуга</th>
                <th>Кол-во</th>
                <th>Цена</th>
                <th>Сумма</th>
            </tr>
            {items_html}
        </table>
        <div class="total">Итого: {doc.total_amount:.2f} руб.</div>
        <div class="footer">
            <p>Исполнитель: Системный администратор</p>
            <p>Спасибо за обращение!</p>
        </div>
    </body>
    </html>
    """
    return html


def generate_warranty_card(ticket: Ticket, doc: Document) -> str:
    items_html = ""
    for item in doc.items:
        items_html += f"<li>{item.service_name} — {item.total:.2f} руб.</li>"

    html = f"""
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: 'DejaVu Sans', Arial, sans-serif; font-size: 14px; }}
            .header {{ text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 20px; }}
            .info {{ margin-bottom: 15px; }}
            .works {{ margin: 15px 0; }}
            .works li {{ margin: 5px 0; }}
            .signatures {{ margin-top: 40px; display: flex; justify-content: space-between; }}
            .signatures div {{ width: 45%; }}
            .signature-line {{ border-top: 1px solid #333; margin-top: 40px; padding-top: 5px; }}
            .footer {{ margin-top: 30px; font-size: 12px; color: #666; }}
        </style>
    </head>
    <body>
        <div class="header">ГАРАНТИЙНЫЙ ТАЛОН № {doc.number}</div>
        <div class="info">
            <p><strong>Дата:</strong> {doc.created_at.strftime('%d.%m.%Y')}</p>
            <p><strong>Номер заявки:</strong> {ticket.number}</p>
            <p><strong>Клиент:</strong> {ticket.client.name}</p>
            <p><strong>Телефон:</strong> {ticket.client.phone or '—'}</p>
        </div>
        <div class="works">
            <p><strong>Выполненные работы:</strong></p>
            <ul>{items_html}</ul>
        </div>
        <p><strong>Срок гарантии:</strong> {doc.warranty_period or 'Не установлен'}</p>
        <div class="signatures">
            <div>
                <p><strong>Мастер</strong></p>
                <div class="signature-line">подпись</div>
            </div>
            <div>
                <p><strong>Клиент</strong></p>
                <div class="signature-line">подпись</div>
            </div>
        </div>
        <div class="footer">
            <p>Гарантия действительна при соблюдении условий эксплуатации.</p>
        </div>
    </body>
    </html>
    """
    return html


def generate_invoice(ticket: Ticket, doc: Document) -> str:
    items_html = ""
    for item in doc.items:
        items_html += f"""
        <tr>
            <td>{item.service_name}</td>
            <td>{item.quantity}</td>
            <td>{item.price:.2f}</td>
            <td>{item.total:.2f}</td>
        </tr>
        """

    client = ticket.client
    html = f"""
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: 'DejaVu Sans', Arial, sans-serif; font-size: 14px; }}
            .header {{ text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 20px; }}
            .info {{ margin-bottom: 15px; }}
            table {{ width: 100%; border-collapse: collapse; margin: 15px 0; }}
            th, td {{ border: 1px solid #333; padding: 8px; text-align: left; }}
            th {{ background: #f0f0f0; }}
            .total {{ font-size: 16px; font-weight: bold; text-align: right; margin: 10px 0; }}
            .footer {{ margin-top: 30px; font-size: 12px; color: #666; }}
        </style>
    </head>
    <body>
        <div class="header">СЧЁТ № {doc.number}</div>
        <div class="info">
            <p><strong>Дата:</strong> {doc.created_at.strftime('%d.%m.%Y')}</p>
            <p><strong>Плательщик:</strong> {client.name}</p>
            <p><strong>ИНН:</strong> {client.inn or '—'}</p>
            <p><strong>КПП:</strong> {client.kpp or '—'}</p>
            <p><strong>Заявка:</strong> № {ticket.number}</p>
        </div>
        <table>
            <tr>
                <th>Наименование</th>
                <th>Кол-во</th>
                <th>Цена</th>
                <th>Сумма</th>
            </tr>
            {items_html}
        </table>
        <div class="total">Итого к оплате: {doc.total_amount:.2f} руб.</div>
        <div class="total">Без НДС</div>
        <div class="footer">
            <p>Исполнитель: Индивидуальный предприниматель / ООО</p>
        </div>
    </body>
    </html>
    """
    return html


def generate_act(ticket: Ticket, doc: Document) -> str:
    items_html = ""
    for item in doc.items:
        items_html += f"""
        <tr>
            <td>{item.service_name}</td>
            <td>{item.quantity}</td>
            <td>{item.price:.2f}</td>
            <td>{item.total:.2f}</td>
        </tr>
        """

    client = ticket.client
    html = f"""
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: 'DejaVu Sans', Arial, sans-serif; font-size: 14px; }}
            .header {{ text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 20px; }}
            .subheader {{ text-align: center; font-size: 14px; margin-bottom: 20px; }}
            .info {{ margin-bottom: 15px; }}
            table {{ width: 100%; border-collapse: collapse; margin: 15px 0; }}
            th, td {{ border: 1px solid #333; padding: 8px; text-align: left; }}
            th {{ background: #f0f0f0; }}
            .total {{ font-size: 16px; font-weight: bold; text-align: right; margin: 10px 0; }}
            .signatures {{ margin-top: 40px; display: flex; justify-content: space-between; }}
            .signatures div {{ width: 45%; }}
            .signature-line {{ border-top: 1px solid #333; margin-top: 40px; padding-top: 5px; }}
        </style>
    </head>
    <body>
        <div class="header">АКТ ВЫПОЛНЕННЫХ РАБОТ № {doc.number}</div>
        <div class="subheader">к заявке № {ticket.number}</div>
        <div class="info">
            <p><strong>Дата:</strong> {doc.created_at.strftime('%d.%m.%Y')}</p>
            <p><strong>Заказчик:</strong> {client.name}</p>
            <p><strong>ИНН:</strong> {client.inn or '—'}</p>
            <p><strong>КПП:</strong> {client.kpp or '—'}</p>
            <p><strong>Адрес:</strong> {client.address or '—'}</p>
        </div>
        <p><strong>Выполнены следующие работы/оказаны услуги:</strong></p>
        <table>
            <tr>
                <th>Наименование</th>
                <th>Кол-во</th>
                <th>Цена</th>
                <th>Сумма</th>
            </tr>
            {items_html}
        </table>
        <div class="total">Всего оказано услуг на сумму: {doc.total_amount:.2f} руб.</div>
        <p>Вышеперечисленные работы выполнены в полном объёме, в установленный срок. Заказчик претензий по объёму, качеству и срокам оказания услуг не имеет.</p>
        <div class="signatures">
            <div>
                <p><strong>Исполнитель</strong></p>
                <div class="signature-line">подпись</div>
            </div>
            <div>
                <p><strong>Заказчик</strong></p>
                <div class="signature-line">подпись</div>
            </div>
        </div>
    </body>
    </html>
    """
    return html


def generate_document_html(ticket: Ticket, doc: Document) -> str:
    if doc.doc_type == "receipt":
        return generate_receipt(ticket, doc)
    elif doc.doc_type == "warranty":
        return generate_warranty_card(ticket, doc)
    elif doc.doc_type == "invoice":
        return generate_invoice(ticket, doc)
    elif doc.doc_type == "act":
        return generate_act(ticket, doc)
    return "<html><body>Неизвестный тип документа</body></html>"


def generate_document_pdf(ticket: Ticket, doc: Document) -> bytes:
    html_content = generate_document_html(ticket, doc)
    try:
        from weasyprint import HTML
        pdf_bytes = HTML(string=html_content).write_pdf()
        return pdf_bytes
    except (ImportError, OSError) as e:
        print(f"PDF generation unavailable: {e}")
        return html_content.encode("utf-8")
