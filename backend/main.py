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



# environment variables
load_dotenv()

line_bot_token = os.getenv('LINE_BOT_TOKEN')
line_bot_secret = os.getenv('LINE_BOT_SECRET')


app = FastAPI()

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

@app.post("/callback")
async def callback(request: Request):
    """
    Handle the Line Bot callback request.

    Parameters:
    - request (Request): The HTTP request object.

    Returns:
    - str: The response message.
    """
    signature = request.headers['X-Line-Signature']

    body = (await request.body()).decode('utf-8')
    logger.info("Request body: %s", body)
    try:
        handler.handle(body, signature)
    except InvalidSignatureError:
        logger.error("Invalid signature")
        raise HTTPException(status_code=400, detail="Invalid signature")
    except Exception as e:
        logger.exception("Unhandled exception occurred during webhook handling")
        raise HTTPException(status_code=500, detail="Internal Server Error")

    return 'OK'

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
            if line_user_id in user_states:
                del user_states[line_user_id]
            if f"{line_user_id}_name" in user_states:
                del user_states[f"{line_user_id}_name"]
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
            # Check if name is valid
            if not re.match(r'^[\u4e00-\u9fa5A-Za-z]+$', name):
                line_bot_api.reply_message(
                    ReplyMessageRequest(
                        reply_token=event.reply_token,
                        messages=[
                            TextMessage(text="姓名格式不正確。\n- 只能包含中文和英文字母\n- 請重新輸入姓名\n- 若要取消註冊，請輸入「取消」")
                        ]
                    )
                )
                return
            
            # Save name and prompt for phone number
            user_states[f"{line_user_id}_name"] = name
            user_states[line_user_id] = "waiting_for_phone"
            line_bot_api.reply_message(
                ReplyMessageRequest(
                    reply_token=event.reply_token,
                    messages=[
                        TextMessage(text=f"已記錄姓名：{name}\n請輸入您的電話號碼\n- 若要重新輸入姓名，請輸入「重新輸入」\n- 若要取消註冊，請輸入「取消」")
                    ]
                )
            )
            return

        if user_message == "重新輸入":
            if user_states.get(line_user_id) == "waiting_for_phone":
                # Back to waiting for name
                user_states[line_user_id] = "waiting_for_name"
                if f"{line_user_id}_name" in user_states:
                    del user_states[f"{line_user_id}_name"]
                line_bot_api.reply_message(
                    ReplyMessageRequest(
                        reply_token=event.reply_token,
                        messages=[TextMessage(text="請重新輸入您的姓名")]
                    )
                )
                return
            elif user_states.get(line_user_id) == "waiting_for_name":
                line_bot_api.reply_message(
                    ReplyMessageRequest(
                        reply_token=event.reply_token,
                        messages=[TextMessage(text="請輸入您的姓名")]
                    )
                )
                return

        # Deal with phone number input
        if user_states.get(line_user_id) == "waiting_for_phone":
            try:
                phone = user_message.strip()
                name = user_states.get(f"{line_user_id}_name")
                
                if not phone.isdigit() or not (7 <= len(phone) <= 10):
                    line_bot_api.reply_message(
                        ReplyMessageRequest(
                            reply_token=event.reply_token,
                            messages=[
                                TextMessage(text="電話號碼格式不正確。\n- 需要是7-10位數字\n- 請重新輸入電話號碼\n- 若要重新輸入姓名，請輸入「重新輸入」\n- 若要取消註冊，請輸入「取消」")
                            ]
                        )
                    )
                    return

                # Check if phone number is already registered
                with get_db_connection() as conn:
                    cur = conn.cursor()
                    cur.execute("SELECT id FROM users WHERE phone = %s", (phone,))
                    existing_user = cur.fetchone()
                    
                    if existing_user:
                        line_bot_api.reply_message(
                            ReplyMessageRequest(
                                reply_token=event.reply_token,
                                messages=[
                                    TextMessage(text="此電話號碼已被註冊。\n- 請使用其他號碼\n- 若要重新輸入姓名，請輸入「重新輸入」\n- 若要取消註冊，請輸入「取消」")
                                ]
                            )
                        )
                        return
                    
                    # Create new user
                    cur.execute(
                        "INSERT INTO users (name, phone, location, is_driver, line_user_id) VALUES (%s, %s, %s, %s, %s) RETURNING id",
                        (name, phone, '未選擇', False, line_user_id)
                    )
                    conn.commit()
                    
                    line_bot_api.reply_message(
                        ReplyMessageRequest(
                            reply_token=event.reply_token,
                            messages=[
                                TextMessage(text=f"註冊成功！\n姓名：{name}\n電話：{phone}\n\n")
                            ]
                        )
                    )
                
                # Clear user states
                del user_states[line_user_id]
                del user_states[f"{line_user_id}_name"]
                
            except Exception as e:
                logger.error("Error during registration: %s", str(e))
                line_bot_api.reply_message(
                    ReplyMessageRequest(
                        reply_token=event.reply_token,
                        messages=[
                            TextMessage(text="註冊過程發生錯誤，請稍後再試\n- 若要重新開始註冊，請輸入「註冊」\n- 若需要協助，請輸入「客服」")
                        ]
                    )
                )
                
                # Clear user states
                if line_user_id in user_states:
                    del user_states[line_user_id]
                if f"{line_user_id}_name" in user_states:
                    del user_states[f"{line_user_id}_name"]
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

    logger.info("✅ Callback triggered!")
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
