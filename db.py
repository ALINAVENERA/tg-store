import sqlite3
import threading
import random
from datetime import datetime, timedelta
from config import DB_PATH, REQUEST_EXPIRY_MIN

# Thread-safe lock for SQLite writes
db_lock = threading.Lock()


def get_conn():
    """Get a SQLite connection (thread-safe)."""
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db():
    """Create tables if they don't exist."""
    conn = get_conn()
    c = conn.cursor()

    c.execute("""
        CREATE TABLE IF NOT EXISTS users (
            telegram_id   INTEGER PRIMARY KEY,
            username      TEXT,
            first_name    TEXT,
            balance_rub   REAL NOT NULL DEFAULT 0.0,
            created_at    TEXT NOT NULL DEFAULT (datetime('now'))
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS topup_requests (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            telegram_id     INTEGER NOT NULL,
            usdt_amount     REAL NOT NULL,
            rub_amount      REAL NOT NULL,
            status          TEXT NOT NULL DEFAULT 'pending',
            tx_hash         TEXT,
            created_at      TEXT NOT NULL DEFAULT (datetime('now')),
            expires_at      TEXT NOT NULL,
            paid_at         TEXT,
            FOREIGN KEY (telegram_id) REFERENCES users(telegram_id)
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            telegram_id     INTEGER NOT NULL,
            type            TEXT NOT NULL,
            amount_rub      REAL NOT NULL,
            description     TEXT,
            created_at      TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (telegram_id) REFERENCES users(telegram_id)
        )
    """)

    # Indexes
    c.execute("""
        CREATE INDEX IF NOT EXISTS idx_topup_status_amount
        ON topup_requests(status, usdt_amount)
    """)
    c.execute("""
        CREATE INDEX IF NOT EXISTS idx_topup_expires
        ON topup_requests(expires_at)
    """)

    conn.commit()
    conn.close()
    print("[DB] Database initialized")


def ensure_user(telegram_id, username=None, first_name=None):
    """Create user if not exists, update info if exists."""
    with db_lock:
        conn = get_conn()
        c = conn.cursor()
        c.execute("SELECT 1 FROM users WHERE telegram_id = ?", (telegram_id,))
        if c.fetchone():
            c.execute(
                "UPDATE users SET username = ?, first_name = ? WHERE telegram_id = ?",
                (username, first_name, telegram_id)
            )
        else:
            c.execute(
                "INSERT INTO users (telegram_id, username, first_name) VALUES (?, ?, ?)",
                (telegram_id, username, first_name)
            )
        conn.commit()
        conn.close()


def get_balance(telegram_id):
    """Get user balance in RUB."""
    conn = get_conn()
    c = conn.cursor()
    c.execute("SELECT balance_rub FROM users WHERE telegram_id = ?", (telegram_id,))
    row = c.fetchone()
    conn.close()
    return row["balance_rub"] if row else 0.0


def generate_unique_amount(base_usdt):
    """Generate unique USDT amount with random suffix (e.g. 10 -> 10.037)."""
    with db_lock:
        conn = get_conn()
        c = conn.cursor()
        for _ in range(50):
            suffix = random.randint(1, 9)  # 0.01 - 0.09
            unique_amount = round(base_usdt + suffix / 100, 2)
            c.execute(
                "SELECT 1 FROM topup_requests WHERE usdt_amount = ? AND status = 'pending'",
                (unique_amount,)
            )
            if not c.fetchone():
                conn.close()
                return unique_amount
        conn.close()
        raise ValueError("Could not generate unique amount")


def create_topup_request(telegram_id, usdt_amount, rub_amount):
    """Create a new topup request."""
    expires_at = (datetime.utcnow() + timedelta(minutes=REQUEST_EXPIRY_MIN)).strftime("%Y-%m-%d %H:%M:%S")
    with db_lock:
        conn = get_conn()
        c = conn.cursor()
        c.execute(
            """INSERT INTO topup_requests (telegram_id, usdt_amount, rub_amount, expires_at)
               VALUES (?, ?, ?, ?)""",
            (telegram_id, usdt_amount, rub_amount, expires_at)
        )
        request_id = c.lastrowid
        conn.commit()
        conn.close()
    return request_id


def find_pending_by_amount(usdt_amount):
    """Find a pending topup request matching the exact USDT amount."""
    conn = get_conn()
    c = conn.cursor()
    c.execute(
        """SELECT id, telegram_id, rub_amount FROM topup_requests
           WHERE status = 'pending'
             AND usdt_amount = ?
             AND expires_at > datetime('now')""",
        (usdt_amount,)
    )
    row = c.fetchone()
    conn.close()
    return dict(row) if row else None


def is_tx_used(tx_hash):
    """Check if a transaction hash was already processed."""
    conn = get_conn()
    c = conn.cursor()
    c.execute("SELECT 1 FROM topup_requests WHERE tx_hash = ?", (tx_hash,))
    result = c.fetchone() is not None
    conn.close()
    return result


def mark_paid(request_id, tx_hash, telegram_id, rub_amount):
    """Mark topup request as paid, credit balance, log transaction."""
    with db_lock:
        conn = get_conn()
        c = conn.cursor()

        # Mark request paid
        c.execute(
            """UPDATE topup_requests
               SET status = 'paid', tx_hash = ?, paid_at = datetime('now')
               WHERE id = ?""",
            (tx_hash, request_id)
        )

        # Credit balance
        c.execute(
            "UPDATE users SET balance_rub = balance_rub + ? WHERE telegram_id = ?",
            (rub_amount, telegram_id)
        )

        # Log transaction
        c.execute(
            """INSERT INTO transactions (telegram_id, type, amount_rub, description)
               VALUES (?, 'topup', ?, ?)""",
            (telegram_id, rub_amount, f"USDT topup | tx: {tx_hash[:16]}...")
        )

        conn.commit()
        conn.close()


def expire_old_requests():
    """Mark expired pending requests."""
    with db_lock:
        conn = get_conn()
        c = conn.cursor()
        c.execute(
            """UPDATE topup_requests
               SET status = 'expired'
               WHERE status = 'pending' AND expires_at <= datetime('now')"""
        )
        count = c.rowcount
        conn.commit()
        conn.close()
    if count > 0:
        print(f"[DB] Expired {count} topup request(s)")
    return count
