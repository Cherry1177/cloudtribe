"""
This module is responsible for importing FastAPI and its dependencies.
"""
import logging
import os
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from backend.routers import orders, drivers, users, seller, consumer
from collections import defaultdict
import re

user_states = defaultdict(str)

# Import Line Bot API
from linebot.v3 import (
    WebhookHandler
)
from linebot.v3.exceptions import (
    InvalidSignatureError
)
from linebot.v3.messaging import (
    ApiClient,
    MessagingApi,
    Configuration,
    TextMessage,
    ReplyMessageRequest
)
from linebot.v3.webhooks import (
    MessageEvent,
    TextMessageContent,
)

# Import handlers
from .handlers.customer_service import handle_customer_service
from .handlers.send_message import LineMessageService

# Import database connection function
from backend.database import get_db_connection


from pathlib import Path
from dotenv import load_dotenv
import os
# environment variables
load_dotenv(dotenv_path="backend/.env")
print("正在使用的 DATABASE_URL：", os.getenv("DATABASE_URL"))

line_bot_token = os.getenv('LINE_BOT_TOKEN')
line_bot_secret = os.getenv('LINE_BOT_SECRET')


app = FastAPI()

from backend.routers import email_otp
app.include_router(email_otp.router, prefix="/api/otp", tags=["OTP 驗證"])

# Register routers
app.include_router(orders.router, prefix="/api/orders", tags=["orders"])
app.include_router(drivers.router, prefix="/api/drivers", tags=["drivers"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(seller.router, prefix="/api/seller", tags=["seller"])
app.include_router(consumer.router, prefix="/api/consumer", tags=["consumer"])

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # you can change this to specific origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# setup Line Bot API
configuration = Configuration(
    access_token=line_bot_token
)
handler = WebhookHandler(line_bot_secret)
line_message_service = LineMessageService()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)



def handle_invalid_signature_error():
    """
    Handles the case when an invalid signature is encountered.

    Raises:
        HTTPException: An exception indicating that the signature is invalid.
    """
    raise HTTPException(status_code=400, detail="Invalid signature")


@handler.add(MessageEvent, message=TextMessageContent)
def handle_message(event):
    """
    Handles incoming messages from users and routes them 
    to the appropriate handlers based on the user's message.

    Parameters:
    - event: The event object containing information about the incoming message.

    Returns:
    - None
    """
    if event.delivery_context and event.delivery_context.is_redelivery:
        logger.warning(" Skipped redelivery event to avoid invalid reply_token")
        return

    user_message = event.message.text
    line_user_id = event.source.user_id
    logger.info("Message from LINE user: %s, content: %s", line_user_id, user_message)

    with ApiClient(configuration) as api_client:
        line_bot_api = MessagingApi(api_client)

        if user_message == "註冊":
            # Check if user is already registered
            with get_db_connection() as conn:
                cur = conn.cursor()
                cur.execute("SELECT id FROM users WHERE line_user_id = %s", (line_user_id,))
                existing_binding = cur.fetchone()

                if existing_binding:
                    line_bot_api.reply_message(
                        ReplyMessageRequest(
                            reply_token=event.reply_token,
                            messages=[TextMessage(text="您已經註冊過帳號")]
                        )
                    )
                    return

            user_states[line_user_id] = "waiting_for_name"
            line_bot_api.reply_message(
                ReplyMessageRequest(
                    reply_token=event.reply_token,
                    messages=[
                        TextMessage(text="請輸入您的姓名\n若要取消註冊，請輸入「取消」")
                    ]
                )
            )
            return

        if user_message.lower() == "取消":
            # Cancel registration process
            keys_to_remove = [k for k in user_states if k.startswith(line_user_id)]
            for k in keys_to_remove:
                del user_states[k]
            line_bot_api.reply_message(
                ReplyMessageRequest(
                    reply_token=event.reply_token,
                    messages=[TextMessage(text="已取消註冊流程。若要重新開始，請輸入「註冊」")]
                )
            )
            return

        # Deal with name input
        if user_states.get(line_user_id) == "waiting_for_name":
            name = user_message.strip()
            if not re.match(r'^[\u4e00-\u9fa5A-Za-z]+$', name):
                line_bot_api.reply_message(
                    ReplyMessageRequest(
                        reply_token=event.reply_token,
                        messages=[TextMessage(text="姓名格式不正確。\n- 只能包含中文和英文字母\n- 請重新輸入姓名\n- 若要取消註冊，請輸入「取消」")]
                    )
                )
                return

            user_states[f"{line_user_id}_name"] = name
            user_states[line_user_id] = "waiting_for_phone"
            line_bot_api.reply_message(
                ReplyMessageRequest(
                    reply_token=event.reply_token,
                    messages=[TextMessage(text=f"已記錄姓名：{name}\n請輸入您的電話號碼\n- 若要重新輸入姓名，請輸入「重新輸入」\n- 若要取消註冊，請輸入「取消」")]
                )
            )
            return

        if user_message == "重新輸入":
            if user_states.get(line_user_id) == "waiting_for_phone":
                user_states[line_user_id] = "waiting_for_name"
                del user_states[f"{line_user_id}_name"]
                line_bot_api.reply_message(
                    ReplyMessageRequest(
                        reply_token=event.reply_token,
                        messages=[TextMessage(text="請重新輸入您的姓名")]
                    )
                )
                return

        # Deal with phone number input
        if user_states.get(line_user_id) == "waiting_for_phone":
            phone = user_message.strip()
            name = user_states.get(f"{line_user_id}_name")
            if not phone.isdigit() or not (7 <= len(phone) <= 10):
                line_bot_api.reply_message(
                    ReplyMessageRequest(
                        reply_token=event.reply_token,
                        messages=[TextMessage(text="電話號碼格式不正確。\n- 需要是7-10位數字\n- 請重新輸入電話號碼\n- 若要重新輸入姓名，請輸入「重新輸入」\n- 若要取消註冊，請輸入「取消」")]
                    )
                )
                return

            user_states[f"{line_user_id}_phone"] = phone
            user_states[line_user_id] = "waiting_for_email"
            line_bot_api.reply_message(
                ReplyMessageRequest(
                    reply_token=event.reply_token,
                    messages=[TextMessage(text="請輸入您的 Email，以寄送驗證碼")]
                )
            )
            return

        # Deal with email input
        if user_states.get(line_user_id) == "waiting_for_email":
            email = user_message.strip()
            user_states[f"{line_user_id}_email"] = email
            from backend.routers.email_otp import send_otp
            send_otp(email=email)
            user_states[line_user_id] = "waiting_for_email_otp"
            line_bot_api.reply_message(
                ReplyMessageRequest(
                    reply_token=event.reply_token,
                    messages=[TextMessage(text="已寄出驗證碼，請輸入 6 碼驗證碼")]
                )
            )
            return

        # Verify email OTP
        if user_states.get(line_user_id) == "waiting_for_email_otp":
            code = user_message.strip()
            from backend.routers.email_otp import otp_store
            email = user_states.get(f"{line_user_id}_email")
            phone = user_states.get(f"{line_user_id}_phone")
            name = user_states.get(f"{line_user_id}_name")
            if otp_store.get(email) == code:
                with get_db_connection() as conn:
                    cur = conn.cursor()
                    cur.execute(
                        "INSERT INTO users (name, phone, location, is_driver, line_user_id, email) VALUES (%s, %s, %s, %s, %s, %s)",
                        (name, phone, '未選擇', False, line_user_id, email)
                    )
                    conn.commit()
                for key in list(user_states.keys()):
                    if line_user_id in key:
                        del user_states[key]
                line_bot_api.reply_message(
                    ReplyMessageRequest(
                        reply_token=event.reply_token,
                        messages=[TextMessage(text="驗證成功，已完成註冊")]
                    )
                )
            else:
                line_bot_api.reply_message(
                    ReplyMessageRequest(
                        reply_token=event.reply_token,
                        messages=[TextMessage(text="驗證碼錯誤，請重新輸入")]
                    )
                )
            return

        elif user_message in ["客服", "詢問客服", "詢問"]:
            handle_customer_service(event, line_bot_api)
        else:
            line_bot_api.reply_message(
                ReplyMessageRequest(
                    reply_token=event.reply_token,
                    messages=[TextMessage(text="請輸入「註冊」來註冊新帳號，或輸入「客服」尋求協助。")]
                )
            )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8001, reload=True)

@app.post("/callback")
async def callback(request: Request):
    signature = request.headers.get('X-Line-Signature')
    body = (await request.body()).decode('utf-8')

    logger.info("Callback triggered!")
    logger.info(f"Signature: {signature}")
    logger.info(f"Body: {body}")
    try:
        handler.handle(body, signature)
    except InvalidSignatureError:
        logger.error("Invalid signature. Please check your channel access token/channel secret.")
        raise HTTPException(status_code=400, detail="Invalid signature")
    except Exception as e:
        logger.exception("Unhandled exception occurred during webhook handling")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    return 'OK'
@app.get("/")           
async def root():
    """
    Root endpoint to check if the server is running.

    Returns:
    - dict: A message indicating that the server is running.
    """
    return {"message": "Server is running"}
