import asyncio
import json
import logging
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import CommandStart
from aiogram.types import (
    InlineKeyboardMarkup, InlineKeyboardButton,
    WebAppInfo, MenuButtonWebApp
)

# ═══════════════════════════════════
#  CONFIG
# ═══════════════════════════════════
BOT_TOKEN = "8680838753:AAEk6cBkRrEaCb3g-s59tzl3Ooioabue-08"

WEBAPP_URL = "https://alinavenera.github.io/tg-store"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()


# ═══════════════════════════════════
#  /start
# ═══════════════════════════════════
@dp.message(CommandStart())
async def cmd_start(message: types.Message):
    user = message.from_user

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="🛒 Открыть магазин",
            web_app=WebAppInfo(url=WEBAPP_URL)
        )],
        [InlineKeyboardButton(
            text="💬 Поддержка",
            url="https://t.me/your_support"
        )],
    ])

    welcome_text = (
        f"👋 Привет, <b>{user.first_name}</b>!\n\n"
        f"🏪 Добро пожаловать в <b>STORE.APP</b>\n\n"
        f"💰 Баланс: <b>₽0</b>\n"
        f"📦 Аккаунтов: <b>0</b>\n"
        f"🛒 Заказов в работе: <b>0</b>\n"
        f"✅ Завершённых заказов: <b>0</b>"
    )

    await message.answer(
        welcome_text,
        reply_markup=keyboard,
        parse_mode="HTML"
    )


# ═══════════════════════════════════
#  WebApp Data Handler
# ═══════════════════════════════════
@dp.message(F.web_app_data)
async def handle_webapp_data(message: types.Message):
    try:
        data = json.loads(message.web_app_data.data)

        # Обработка пополнения
        if data.get("action") == "topup":
            amount = data.get("amount", 0)
            await message.answer(
                f"💳 <b>Пополнение баланса</b>\n\n"
                f"Сумма: <b>₽{amount:,}</b>\n\n"
                f"Для оплаты переведите указанную сумму и отправьте скриншот оплаты.",
                parse_mode="HTML"
            )
            return

        # Обработка заказа
        items = data.get("items", [])
        total = data.get("total", 0)

        order_text = "🛒 <b>Новый заказ!</b>\n\n"
        for item in items:
            order_text += f"• {item['name']} × {item['qty']} — ₽{item['price'] * item['qty']:,}\n"
        order_text += f"\n💰 <b>Итого: ₽{total:,}</b>"

        await message.answer(order_text, parse_mode="HTML")

        logger.info(f"Order from {message.from_user.id}: {data}")

    except Exception as e:
        logger.error(f"Error handling webapp data: {e}")
        await message.answer("❌ Ошибка обработки заказа. Попробуйте снова.")


# ═══════════════════════════════════
#  Setup Menu Button
# ═══════════════════════════════════
async def setup_menu_button():
    """Устанавливает кнопку Web App в меню бота"""
    try:
        await bot.set_chat_menu_button(
            menu_button=MenuButtonWebApp(
                text="🏪 Магазин",
                web_app=WebAppInfo(url=WEBAPP_URL)
            )
        )
        logger.info("Menu button set successfully")
    except Exception as e:
        logger.error(f"Failed to set menu button: {e}")


# ═══════════════════════════════════
#  MAIN
# ═══════════════════════════════════
async def main():
    logger.info("Bot starting...")
    await setup_menu_button()
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
