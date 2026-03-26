import json
import logging
import time
import threading
import requests

from config import BOT_TOKEN, WEBAPP_URL, API, WALLET_ADDRESS, USDT_RATE, CHECK_INTERVAL, ADMIN_ID
from db import (
    init_db, ensure_user, get_balance, generate_unique_amount,
    create_topup_request, find_pending_by_amount, is_tx_used,
    mark_paid, expire_old_requests, get_admin_stats, get_recent_requests,
    get_all_users, admin_credit_user
)
from trongrid import (
    check_incoming_transfers, parse_usdt_amount,
    load_last_timestamp, save_last_timestamp
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


# ═══════════════════════════════════
#  TELEGRAM API HELPERS
# ═══════════════════════════════════
def api_call(method, **kwargs):
    """Telegram Bot API call."""
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
    """Long polling."""
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
    """Send message with HTML parse mode."""
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
    """/start command."""
    user = message.get("from", {})
    chat_id = message["chat"]["id"]
    first_name = user.get("first_name", "User")
    username = user.get("username")

    # Register user in DB
    ensure_user(chat_id, username, first_name)

    keyboard = {
        "inline_keyboard": [
            [{"text": "Открыть магазин", "web_app": {"url": WEBAPP_URL}}],
        ]
    }

    send_message(chat_id,
        f"Привет, <b>{first_name}</b>!\n\n"
        f"Нажми кнопку ниже чтобы открыть <b>STORE.APP</b>",
        reply_markup=keyboard
    )


def handle_webapp_data(message):
    """Process data from Mini App."""
    chat_id = message["chat"]["id"]
    user = message.get("from", {})
    ensure_user(chat_id, user.get("username"), user.get("first_name"))

    try:
        data = json.loads(message["web_app_data"]["data"])

        if data.get("action") == "topup":
            handle_topup_request(chat_id, data)
            return

        # Order
        items = data.get("items", [])
        total = data.get("total", 0)

        text = "<b>New order!</b>\n\n"
        for item in items:
            text += f"  {item['name']}  x{item['qty']} - {item['price'] * item['qty']:,} RUB\n"
        text += f"\n<b>Total: {total:,} RUB</b>"

        send_message(chat_id, text)
        logger.info(f"Order from {chat_id}: {data}")

    except Exception as e:
        logger.error(f"WebApp data error: {e}")
        send_message(chat_id, "Error processing request.")


def handle_topup_request(chat_id, data):
    """Create topup request and send payment instructions."""
    base_usdt = data.get("usdt", 0)
    rub_amount = data.get("rub", 0)

    if base_usdt <= 0:
        send_message(chat_id, "Invalid amount.")
        return

    try:
        # Generate unique amount
        unique_usdt = generate_unique_amount(base_usdt)

        # Recalculate RUB based on unique amount
        rub_amount = round(unique_usdt * USDT_RATE)

        # Create request in DB
        req_id = create_topup_request(chat_id, unique_usdt, rub_amount)

        send_message(chat_id,
            f"<b>Top Up #{req_id}</b>\n\n"
            f"Send exactly <b>{unique_usdt} USDT</b> (TRC-20) to:\n\n"
            f"<code>{WALLET_ADDRESS}</code>\n\n"
            f"Amount to credit: <b>{rub_amount:,} RUB</b>\n"
            f"Rate: 1 USDT = {USDT_RATE} RUB\n\n"
            f"<b>Important: send EXACTLY {unique_usdt} USDT</b>\n"
            f"Request valid for 30 minutes.\n\n"
            f"Balance will be credited automatically after network confirmation."
        )

        logger.info(f"Topup request #{req_id}: {unique_usdt} USDT for user {chat_id}")

    except Exception as e:
        logger.error(f"Topup request error: {e}")
        send_message(chat_id, "Error creating topup request. Try again.")


# ═══════════════════════════════════
#  TRONGRID TRANSACTION CHECKER
# ═══════════════════════════════════
def transaction_checker_loop():
    """Background thread: check TronGrid every N seconds for new USDT transfers."""
    last_timestamp = load_last_timestamp()
    logger.info(f"[Checker] Started, last_timestamp={last_timestamp}")

    while True:
        try:
            # Expire old requests
            expire_old_requests()

            # Check for new transfers
            transfers = check_incoming_transfers(last_timestamp)

            for tx in transfers:
                tx_hash = tx.get("transaction_id", "")
                value_str = tx.get("value", "0")
                block_ts = tx.get("block_timestamp", 0)

                # Parse USDT amount
                usdt_amount = parse_usdt_amount(value_str)
                if usdt_amount <= 0:
                    continue

                # Skip if already processed
                if is_tx_used(tx_hash):
                    continue

                logger.info(f"[Checker] New transfer: {usdt_amount} USDT, tx={tx_hash[:16]}...")

                # Try to match with pending request
                request = find_pending_by_amount(usdt_amount)
                if request:
                    req_id = request["id"]
                    telegram_id = request["telegram_id"]
                    rub_amount = request["rub_amount"]

                    # Credit balance
                    mark_paid(req_id, tx_hash, telegram_id, rub_amount)

                    # Get updated balance
                    new_balance = get_balance(telegram_id)

                    # Notify user
                    send_message(telegram_id,
                        f"<b>Balance topped up!</b>\n\n"
                        f"+ <b>{rub_amount:,.0f} RUB</b>\n"
                        f"New balance: <b>{new_balance:,.0f} RUB</b>\n\n"
                        f"TX: <code>{tx_hash[:24]}...</code>"
                    )

                    logger.info(f"[Checker] Matched! Request #{req_id}, user {telegram_id}, +{rub_amount} RUB")
                else:
                    logger.warning(f"[Checker] Unmatched transfer: {usdt_amount} USDT, tx={tx_hash[:16]}")

                # Update timestamp
                if block_ts > last_timestamp:
                    last_timestamp = block_ts + 1
                    save_last_timestamp(last_timestamp)

        except Exception as e:
            logger.error(f"[Checker] Error: {e}")

        time.sleep(CHECK_INTERVAL)


# ═══════════════════════════════════
#  ADMIN COMMANDS
# ═══════════════════════════════════
def handle_admin(message):
    """Admin dashboard."""
    s = get_admin_stats()
    send_message(message["chat"]["id"],
        f"<b>📊 Админ-панель</b>\n\n"
        f"👤 Юзеров: <b>{s['total_users']}</b>\n"
        f"⏳ Ожидают оплаты: <b>{s['pending']}</b>\n"
        f"✅ Оплачено: <b>{s['paid']}</b>\n"
        f"💰 Всего получено: <b>{s['total_usdt']:.2f} USDT</b>\n"
        f"💵 Зачислено: <b>{s['total_rub']:,.0f} ₽</b>\n\n"
        f"/users — все юзеры\n"
        f"/requests — последние заявки\n"
        f"/credit [id] [сумма] — начислить вручную"
    )


def handle_admin_users(message):
    """List all users."""
    users = get_all_users()
    if not users:
        send_message(message["chat"]["id"], "Нет юзеров")
        return

    lines = ["<b>👤 Юзеры</b>\n"]
    for u in users:
        name = u["first_name"] or "—"
        uname = f"@{u['username']}" if u["username"] else ""
        lines.append(
            f"<code>{u['telegram_id']}</code> {name} {uname}\n"
            f"   💰 {u['balance_rub']:,.0f} ₽"
        )
    send_message(message["chat"]["id"], "\n".join(lines))


def handle_admin_requests(message):
    """List recent topup requests."""
    reqs = get_recent_requests(15)
    if not reqs:
        send_message(message["chat"]["id"], "Нет заявок")
        return

    status_icons = {"pending": "⏳", "paid": "✅", "expired": "❌"}
    lines = ["<b>📋 Последние заявки</b>\n"]
    for r in reqs:
        icon = status_icons.get(r["status"], "❓")
        name = r["first_name"] or "—"
        lines.append(
            f"{icon} #{r['id']} | {r['usdt_amount']} USDT ({r['rub_amount']:,.0f}₽)\n"
            f"   {name} | {r['status']} | {r['created_at']}"
        )
    send_message(message["chat"]["id"], "\n".join(lines))


def handle_admin_credit(message, text):
    """Manually credit a user. /credit [telegram_id] [amount_rub]"""
    try:
        parts = text.split()
        uid = int(parts[1])
        amount = float(parts[2])
        admin_credit_user(uid, amount, "Admin manual credit")
        balance = get_balance(uid)
        send_message(message["chat"]["id"],
            f"✅ Начислено <b>{amount:,.0f} ₽</b> юзеру <code>{uid}</code>\n"
            f"Новый баланс: <b>{balance:,.0f} ₽</b>"
        )
        # Notify user
        send_message(uid, f"💰 Баланс пополнен на <b>{amount:,.0f} ₽</b>")
    except (IndexError, ValueError):
        send_message(message["chat"]["id"], "Формат: /credit [telegram_id] [сумма]\nПример: /credit 820990963 1000")
    except Exception as e:
        send_message(message["chat"]["id"], f"Ошибка: {e}")


# ═══════════════════════════════════
#  UPDATE PROCESSING
# ═══════════════════════════════════
def process_update(update):
    """Process a single Telegram update."""
    message = update.get("message")
    if not message:
        return

    # Log every incoming message
    text_raw = message.get("text", "")
    has_webapp = "web_app_data" in message
    user = message.get("from", {})
    logger.info(f"[MSG] from={user.get('first_name')} id={message['chat']['id']} text='{text_raw}' webapp={has_webapp}")

    # Web App data
    if "web_app_data" in message:
        handle_webapp_data(message)
        return

    # Text commands
    text = message.get("text", "").split("@")[0]  # strip @botname
    chat_id = message["chat"]["id"]

    if text == "/start":
        handle_start(message)
    elif text == "/admin" and chat_id == ADMIN_ID:
        handle_admin(message)
    elif text == "/users" and chat_id == ADMIN_ID:
        handle_admin_users(message)
    elif text == "/requests" and chat_id == ADMIN_ID:
        handle_admin_requests(message)
    elif text.startswith("/credit ") and chat_id == ADMIN_ID:
        handle_admin_credit(message, text)


# ═══════════════════════════════════
#  SETUP & MAIN LOOP
# ═══════════════════════════════════
def setup():
    """Initial bot setup."""
    result = api_call("setChatMenuButton", menu_button={
        "type": "web_app",
        "text": "Store",
        "web_app": {"url": WEBAPP_URL}
    })
    if result.get("ok"):
        logger.info("Menu button set")

    me = api_call("getMe")
    if me.get("ok"):
        bot_info = me["result"]
        logger.info(f"Bot: @{bot_info['username']} ({bot_info['first_name']})")


def main():
    logger.info("Bot starting...")

    # Init database
    init_db()

    # Setup bot
    setup()

    # Start transaction checker in background
    checker = threading.Thread(target=transaction_checker_loop, daemon=True)
    checker.start()
    logger.info("Transaction checker started")

    # Polling loop
    logger.info("Polling started...")
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
