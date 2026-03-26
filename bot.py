import json
import logging
import time
import requests

# ═══════════════════════════════════
#  CONFIG
# ═══════════════════════════════════
BOT_TOKEN = "8680838753:AAEk6cBkRrEaCb3g-s59tzl3Ooioabue-08"
WEBAPP_URL = "https://alinavenera.github.io/tg-store"
API = f"https://api.telegram.org/bot{BOT_TOKEN}"

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def api_call(method, **kwargs):
    """Вызов Telegram Bot API"""
    try:
        r = requests.post(f"{API}/{method}", json=kwargs, timeout=30)
        data = r.json()
        if not data.get("ok"):
            logger.error(f"API error {method}: {data}")
        return data
    except Exception as e:
        logger.error(f"Request error {method}: {e}")
        return {}


def get_updates(offset=None):
    """Получить обновления (long polling)"""
    params = {"timeout": 30}
    if offset:
        params["offset"] = offset
    try:
        r = requests.get(f"{API}/getUpdates", params=params, timeout=35)
        data = r.json()
        return data.get("result", [])
    except Exception as e:
        logger.error(f"Polling error: {e}")
        return []


def send_message(chat_id, text, reply_markup=None):
    """Отправить сообщение"""
    params = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML"
    }
    if reply_markup:
        params["reply_markup"] = reply_markup
    return api_call("sendMessage", **params)


# ═══════════════════════════════════
#  HANDLERS
# ═══════════════════════════════════
def handle_start(message):
    """Обработка /start"""
    user = message.get("from", {})
    chat_id = message["chat"]["id"]
    first_name = user.get("first_name", "User")

    keyboard = {
        "inline_keyboard": [
            [{"text": "🛒 Открыть магазин", "web_app": {"url": WEBAPP_URL}}],
            [{"text": "💬 Поддержка", "url": "https://t.me/your_support"}],
        ]
    }

    text = (
        f"👋 Привет, <b>{first_name}</b>!\n\n"
        f"🏪 Добро пожаловать в <b>STORE.APP</b>\n\n"
        f"💰 Баланс: <b>₽0</b>\n"
        f"📦 Аккаунтов: <b>0</b>\n"
        f"🛒 Заказов в работе: <b>0</b>\n"
        f"✅ Завершённых заказов: <b>0</b>"
    )

    send_message(chat_id, text, reply_markup=keyboard)


def handle_webapp_data(message):
    """Обработка данных из Mini App"""
    chat_id = message["chat"]["id"]
    try:
        data = json.loads(message["web_app_data"]["data"])

        if data.get("action") == "topup":
            amount = data.get("amount", 0)
            send_message(chat_id,
                f"💳 <b>Пополнение баланса</b>\n\n"
                f"Сумма: <b>₽{amount:,}</b>\n\n"
                f"Для оплаты переведите указанную сумму и отправьте скриншот оплаты."
            )
            return

        items = data.get("items", [])
        total = data.get("total", 0)

        text = "🛒 <b>Новый заказ!</b>\n\n"
        for item in items:
            text += f"• {item['name']} × {item['qty']} — ₽{item['price'] * item['qty']:,}\n"
        text += f"\n💰 <b>Итого: ₽{total:,}</b>"

        send_message(chat_id, text)
        logger.info(f"Order from {chat_id}: {data}")

    except Exception as e:
        logger.error(f"WebApp data error: {e}")
        send_message(chat_id, "❌ Ошибка обработки заказа.")


def process_update(update):
    """Обработка одного обновления"""
    message = update.get("message")
    if not message:
        return

    # Данные из Web App
    if "web_app_data" in message:
        handle_webapp_data(message)
        return

    # Текстовые команды
    text = message.get("text", "")
    if text == "/start":
        handle_start(message)


# ═══════════════════════════════════
#  SETUP & MAIN LOOP
# ═══════════════════════════════════
def setup():
    """Начальная настройка бота"""
    # Установим кнопку меню
    result = api_call("setChatMenuButton", menu_button={
        "type": "web_app",
        "text": "🏪 Магазин",
        "web_app": {"url": WEBAPP_URL}
    })
    if result.get("ok"):
        logger.info("✅ Menu button set successfully")

    # Проверим бота
    me = api_call("getMe")
    if me.get("ok"):
        bot_info = me["result"]
        logger.info(f"✅ Bot: @{bot_info['username']} ({bot_info['first_name']})")


def main():
    logger.info("🚀 Bot starting...")
    setup()

    logger.info("📡 Polling started...")
    offset = None

    while True:
        try:
            updates = get_updates(offset)
            for update in updates:
                offset = update["update_id"] + 1
                process_update(update)
        except KeyboardInterrupt:
            logger.info("Bot stopped")
            break
        except Exception as e:
            logger.error(f"Main loop error: {e}")
            time.sleep(3)


if __name__ == "__main__":
    main()
