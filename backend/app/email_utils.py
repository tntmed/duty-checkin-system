"""Email utility for sending password reset emails."""
import smtplib
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from dotenv import load_dotenv

load_dotenv()

SMTP_HOST     = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT     = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER     = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM     = os.getenv("SMTP_FROM", SMTP_USER)
FRONTEND_URL  = os.getenv("FRONTEND_URL", "http://localhost:5173")


def send_reset_email(to_email: str, full_name: str, token: str) -> None:
    """Send password reset email with a link containing the token."""
    reset_link = f"{FRONTEND_URL}/reset-password?token={token}"

    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e0e0e0;border-radius:8px">
      <h2 style="color:#1a73e8;margin-bottom:8px">รีเซ็ต Password</h2>
      <p>เรียน <strong>{full_name}</strong></p>
      <p>มีคำขอรีเซ็ต password สำหรับบัญชีของคุณในระบบ <strong>Duty Check-in System</strong></p>
      <p>กรุณากดปุ่มด้านล่างเพื่อตั้ง password ใหม่ (ลิงก์หมดอายุใน 30 นาที)</p>
      <div style="text-align:center;margin:32px 0">
        <a href="{reset_link}"
           style="background:#1a73e8;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px">
          ตั้ง Password ใหม่
        </a>
      </div>
      <p style="color:#888;font-size:13px">
        หากคุณไม่ได้ขอรีเซ็ต password กรุณาเพิกเฉยต่ออีเมลนี้<br>
        ลิงก์นี้จะหมดอายุภายใน 30 นาที
      </p>
      <hr style="border:none;border-top:1px solid #e0e0e0;margin:24px 0">
      <p style="color:#aaa;font-size:12px;text-align:center">Duty Check-in System</p>
    </div>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "รีเซ็ต Password — Duty Check-in System"
    msg["From"]    = SMTP_FROM
    msg["To"]      = to_email
    msg.attach(MIMEText(html, "html", "utf-8"))

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.ehlo()
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SMTP_FROM, to_email, msg.as_string())
