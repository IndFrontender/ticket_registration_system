from datetime import datetime

def generate_cheque_html(ticket, doc, user_name: str = "") -> str:
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
    now = doc.created_at or datetime.utcnow()

    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  @page {{ margin: 10mm; size: 80mm 297mm; }}
  body {{ font-family: 'DejaVu Sans', 'Courier New', monospace; font-size: 11px; width: 58mm; margin: 0 auto; padding: 5px; }}
  .center {{ text-align: center; }}
  .bold {{ font-weight: bold; }}
  .header {{ font-size: 14px; font-weight: bold; text-align: center; margin: 8px 0; }}
  .company {{ font-size: 12px; text-align: center; margin: 4px 0; }}
  .info {{ font-size: 10px; margin: 4px 0; }}
  table {{ width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 10px; }}
  th, td {{ border: 1px solid #000; padding: 3px 4px; text-align: left; }}
  th {{ background: #eee; }}
  .total {{ font-size: 12px; font-weight: bold; text-align: right; margin: 6px 0; }}
  .footer {{ font-size: 9px; text-align: center; margin-top: 8px; color: #555; }}
  .line {{ border-top: 1px dashed #000; margin: 6px 0; }}
  .signatures {{ display: flex; justify-content: space-between; margin-top: 12px; font-size: 10px; }}
  .signatures > div {{ width: 45%; }}
  .sig-line {{ border-top: 1px solid #000; margin-top: 24px; padding-top: 2px; font-size: 9px; }}
</style></head><body>
  <div class="header">КАССОВЫЙ ЧЕК</div>
  <div class="company">Система учета регистрации заявок</div>
  <div class="line"></div>
  <div class="info"><span class="bold">№:</span> {doc.number}</div>
  <div class="info"><span class="bold">Дата:</span> {now.strftime('%d.%m.%Y %H:%M')}</div>
  <div class="info"><span class="bold">Клиент:</span> {client.name if client else '—'}</div>
  <div class="info"><span class="bold">Заявка:</span> {ticket.number}</div>
  <div class="line"></div>
  <table>
    <tr><th>Услуга</th><th>Кол</th><th>Цена</th><th>Сумма</th></tr>
    {items_html}
  </table>
  <div class="total">ИТОГО: {doc.total_amount:.2f} руб.</div>
  <div class="line"></div>
  <div class="info"><span class="bold">Оплачено:</span> {user_name or '—'}</div>
  <div class="line"></div>
  <div class="footer">
    <p>Спасибо за обращение!</p>
    <p>г. {now.strftime('%d.%m.%Y %H:%M')}</p>
    <p>Фискальный накопитель: не требуется</p>
  </div>
</body></html>"""


def generate_warranty_card_html(ticket, doc, user_name: str = "") -> str:
    items_html = ""
    for item in doc.items:
        items_html += f"<li>{item.service_name} — {item.total:.2f} руб.</li>"
    client = ticket.client
    now = doc.created_at or datetime.utcnow()

    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  @page {{ margin: 15mm; }}
  body {{ font-family: 'DejaVu Sans', Arial, sans-serif; font-size: 13px; }}
  .header {{ text-align: center; font-size: 18px; font-weight: bold; margin: 10px 0; }}
  .sub {{ text-align: center; font-size: 12px; margin-bottom: 15px; color: #555; }}
  .info {{ margin: 6px 0; }}
  .works {{ margin: 12px 0; }}
  .works li {{ margin: 4px 0; }}
  .warranty-box {{ border: 2px solid #000; padding: 10px; margin: 12px 0; text-align: center; font-weight: bold; font-size: 14px; }}
  .signatures {{ display: flex; justify-content: space-between; margin-top: 35px; }}
  .signatures > div {{ width: 45%; }}
  .sig-line {{ border-top: 1px solid #000; margin-top: 35px; padding-top: 4px; font-size: 10px; text-align: center; }}
  .footer {{ margin-top: 20px; font-size: 10px; color: #666; text-align: center; }}
</style></head><body>
  <div class="header">ГАРАНТИЙНЫЙ ТАЛОН</div>
  <div class="sub">№ {doc.number}</div>
  <div class="info"><strong>Дата выдачи:</strong> {now.strftime('%d.%m.%Y')}</div>
  <div class="info"><strong>Номер заявки:</strong> {ticket.number}</div>
  <div class="info"><strong>Клиент:</strong> {client.name if client else '—'}</div>
  <div class="info"><strong>Телефон:</strong> {client.phone if client and client.phone else '—'}</div>
  <div class="info"><strong>Адрес:</strong> {client.address if client and client.address else '—'}</div>
  <div class="works">
    <strong>Выполненные работы:</strong>
    <ul>{items_html}</ul>
  </div>
  <div class="warranty-box">
    СРОК ГАРАНТИИ: {doc.warranty_period or 'Не указан'}
  </div>
  <div class="info"><strong>Условия гарантии:</strong></div>
  <ul style="font-size: 11px;">
    <li>Гарантия действительна при соблюдении условий эксплуатации</li>
    <li>Гарантия не распространяется на механические повреждения</li>
    <li>Гарантийное обслуживание производится по предъявлению данного талона</li>
  </ul>
  <div class="signatures">
    <div><strong>Мастер</strong><div class="sig-line">{user_name}</div></div>
    <div><strong>Клиент</strong><div class="sig-line">___________</div></div>
  </div>
  <div class="footer">Гарантийный талон является обязательным при предъявлении претензий</div>
</body></html>"""


def generate_payment_doc_html(ticket, doc, user_name: str = "") -> str:
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
    now = doc.created_at or datetime.utcnow()

    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  @page {{ margin: 15mm; }}
  body {{ font-family: 'DejaVu Sans', Arial, sans-serif; font-size: 13px; }}
  .header {{ text-align: center; font-size: 18px; font-weight: bold; margin: 10px 0; }}
  .sub {{ text-align: center; font-size: 11px; color: #555; margin-bottom: 15px; }}
  .info {{ margin: 5px 0; }}
  table {{ width: 100%; border-collapse: collapse; margin: 10px 0; }}
  th, td {{ border: 1px solid #000; padding: 6px 8px; text-align: left; }}
  th {{ background: #f0f0f0; }}
  .total {{ font-size: 14px; font-weight: bold; text-align: right; margin: 10px 0; }}
  .amount-word {{ font-size: 11px; margin: 5px 0; font-style: italic; }}
  .signatures {{ display: flex; justify-content: space-between; margin-top: 35px; }}
  .signatures > div {{ width: 45%; }}
  .sig-line {{ border-top: 1px solid #000; margin-top: 35px; padding-top: 4px; font-size: 10px; text-align: center; }}
  .footer {{ margin-top: 15px; font-size: 10px; color: #666; }}
</style></head><body>
  <div class="header">ПЛАТЁЖНЫЙ ДОКУМЕНТ</div>
  <div class="sub">№ {doc.number} от {now.strftime('%d.%m.%Y')}</div>
  <div class="info"><strong>Плательщик:</strong> {client.name if client else '—'}</div>
  <div class="info"><strong>ИНН:</strong> {client.inn if client and client.inn else '—'} <strong>КПП:</strong> {client.kpp if client and client.kpp else '—'}</div>
  <div class="info"><strong>Получатель:</strong> Система учета регистрации заявок</div>
  <div class="info"><strong>Основание:</strong> Заявка № {ticket.number}</div>
  <table>
    <tr><th>Наименование</th><th>Кол-во</th><th>Цена</th><th>Сумма</th></tr>
    {items_html}
  </table>
  <div class="total">Итого к оплате: {doc.total_amount:.2f} руб.</div>
  <div class="amount-word">Всего наименований {len(doc.items)}, на сумму {doc.total_amount:.2f} руб.</div>
  <div class="amount-word">Без НДС</div>
  <div class="signatures">
    <div><strong>Сдал</strong><div class="sig-line">{user_name}</div></div>
    <div><strong>Принял</strong><div class="sig-line">___________</div></div>
  </div>
  <div class="footer">Документ сформирован автоматически в Системе учета регистрации заявок</div>
</body></html>"""


def generate_document_html(ticket, doc, user_name: str = "") -> str:
    if doc.doc_type == "receipt":
        return generate_cheque_html(ticket, doc, user_name)
    elif doc.doc_type == "warranty":
        return generate_warranty_card_html(ticket, doc, user_name)
    elif doc.doc_type == "invoice":
        return generate_payment_doc_html(ticket, doc, user_name)
    elif doc.doc_type == "act":
        return _fallback_html(ticket, doc, user_name)
    return "<html><body>Неизвестный тип документа</body></html>"


def _fallback_html(ticket, doc, user_name: str = "") -> str:
    return generate_payment_doc_html(ticket, doc, user_name)


def generate_document_pdf(ticket, doc, user_name: str = "") -> bytes:
    html = generate_document_html(ticket, doc, user_name)
    try:
        from weasyprint import HTML
        return HTML(string=html).write_pdf()
    except ImportError:
        return html.encode("utf-8")
