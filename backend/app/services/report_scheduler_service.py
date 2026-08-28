import json
import logging
import os
import smtplib
import subprocess
import tempfile
from datetime import datetime
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from zoneinfo import ZoneInfo

from app.services.salesforce_service import (
    get_all_accounts,
    get_leads,
    get_opportunities,
)

logger = logging.getLogger(__name__)

IST = ZoneInfo("Asia/Kolkata")

# backend/ - two parents up from this file (app/services/) - then across
# into the sibling frontend/ project, where the real report-generation
# code (jsPDF + the analytics it's built on) already lives.
REPORT_SCRIPT_PATH = (
    Path(__file__).resolve().parent.parent.parent.parent
    / "frontend" / "scripts" / "generate-executive-report.mjs"
)

REPORT_STATE_PATH = Path(__file__).resolve().parent.parent.parent / ".report_state.json"


def build_report_pdf() -> bytes:
    """
    Fetches the same data the GIS Map itself fetches, then shells out to
    the real jsPDF-based report generator (as JS, not reimplemented in
    Python) to build the PDF - identical output to clicking "Download PDF"
    in the browser.
    """
    payload = json.dumps({
        "accounts": get_all_accounts(),
        "leads": get_leads(),
        "opportunities": get_opportunities(),
    })

    with tempfile.TemporaryDirectory() as tmp_dir:
        output_path = os.path.join(tmp_dir, "report.pdf")

        result = subprocess.run(
            ["node", str(REPORT_SCRIPT_PATH), output_path],
            input=payload,
            text=True,
            capture_output=True,
            timeout=60,
        )

        if result.returncode != 0:
            raise RuntimeError(
                f"Report generation failed (exit {result.returncode}): "
                f"{result.stderr.strip()}"
            )

        with open(output_path, "rb") as f:
            return f.read()


def send_report_email(pdf_bytes: bytes):
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_username = os.getenv("SMTP_USERNAME")
    smtp_app_password = os.getenv("SMTP_APP_PASSWORD")
    recipient = os.getenv("REPORT_RECIPIENT_EMAIL")

    if not smtp_username or not smtp_app_password or not recipient:
        raise RuntimeError(
            "SMTP_USERNAME, SMTP_APP_PASSWORD, and REPORT_RECIPIENT_EMAIL "
            "must all be set in backend/.env to send the executive report."
        )

    today = datetime.now(IST).strftime("%d %b %Y")

    message = MIMEMultipart()
    message["From"] = smtp_username
    message["To"] = recipient
    message["Subject"] = f"JSAN GeoSales 360 - AI Executive Report - {today}"

    message.attach(MIMEText(
        "Attached is the AI Executive Report generated automatically by "
        "JSAN GeoSales 360.",
        "plain"
    ))

    attachment = MIMEApplication(pdf_bytes, _subtype="pdf")
    attachment.add_header(
        "Content-Disposition", "attachment",
        filename=f"JSAN_GeoSales_Executive_Report_{today.replace(' ', '_')}.pdf"
    )
    message.attach(attachment)

    with smtplib.SMTP(smtp_host, smtp_port, timeout=30) as server:
        server.starttls()
        server.login(smtp_username, smtp_app_password)
        server.send_message(message)


def _read_last_sent_date():
    try:
        with open(REPORT_STATE_PATH, "r") as f:
            return json.load(f).get("last_sent_date")
    except (FileNotFoundError, json.JSONDecodeError):
        return None


def _write_last_sent_date(date_str: str):
    with open(REPORT_STATE_PATH, "w") as f:
        json.dump({"last_sent_date": date_str}, f)


def send_daily_report():
    logger.info("Generating and sending the daily executive report")

    pdf_bytes = build_report_pdf()
    send_report_email(pdf_bytes)

    today_str = datetime.now(IST).strftime("%Y-%m-%d")
    _write_last_sent_date(today_str)

    logger.info("Daily executive report sent successfully")

    return {
        "message": "Executive report sent successfully",
        "sent_at": datetime.now(IST).isoformat(),
        "pdf_size_bytes": len(pdf_bytes),
    }


def maybe_catch_up_on_startup():
    """
    The backend isn't a persistent service - if it wasn't running when
    today's scheduled send time passed, send now instead of silently
    skipping the day. Only fires once per day (guarded by
    .report_state.json), so restarting the backend later the same day
    won't send a duplicate.
    """
    send_hour = int(os.getenv("REPORT_SEND_HOUR_IST", "8"))
    now = datetime.now(IST)
    today_str = now.strftime("%Y-%m-%d")

    if _read_last_sent_date() == today_str:
        return

    if now.hour < send_hour:
        return

    try:
        send_daily_report()
    except Exception:
        logger.exception("Catch-up executive report send failed")
