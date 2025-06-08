from fastapi import APIRouter, HTTPException
import smtplib
import random
import os
from email.mime.text import MIMEText
from email.header import Header

router = APIRouter()
otp_store = {}  # 可用 Redis/DB 取代

@router.post("/send-otp")
def send_otp(email: str):
    otp = str(random.randint(100000, 999999))
    otp_store[email] = otp

    subject = "您的驗證碼"
    body = f"請勿分享驗證碼給他人。您好，您的驗證碼為：{otp}，請於 5 分鐘內使用。"

    # 使用 MIMEText 包含 UTF-8 編碼
    msg = MIMEText(body, 'plain', 'utf-8')
    msg['Subject'] = Header(subject, 'utf-8')
    msg['From'] = os.getenv("EMAIL_USER")
    msg['To'] = email

    try:
        with smtplib.SMTP(os.getenv("EMAIL_HOST"), int(os.getenv("EMAIL_PORT"))) as server:
            server.starttls()
            server.login(os.getenv("EMAIL_USER"), os.getenv("EMAIL_PASS"))
            server.sendmail(os.getenv("EMAIL_USER"), email, msg.as_string())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Email 發送失敗：{str(e)}")

    return {"message": "驗證碼已寄出"}

@router.post("/verify-otp")
def verify_otp(email: str, code: str):
    if otp_store.get(email) != code:
        raise HTTPException(status_code=400, detail="驗證碼錯誤或過期")

    return {"status": "success"}
