import requests
import time
import os
import json
from config import TRONGRID_API, WALLET_ADDRESS, USDT_CONTRACT

LAST_TS_FILE = "last_check_ts.json"


def load_last_timestamp():
    """Load last checked timestamp from file, or return current time."""
    if os.path.exists(LAST_TS_FILE):
        try:
            with open(LAST_TS_FILE, "r") as f:
                data = json.load(f)
                return data.get("last_timestamp", int(time.time() * 1000))
        except Exception:
            pass
    return int(time.time() * 1000)


def save_last_timestamp(ts):
    """Save last checked timestamp to file."""
    try:
        with open(LAST_TS_FILE, "w") as f:
            json.dump({"last_timestamp": ts}, f)
    except Exception as e:
        print(f"[TronGrid] Error saving timestamp: {e}")


def check_incoming_transfers(last_timestamp_ms):
    """
    Poll TronGrid for new incoming USDT TRC-20 transfers.
    Returns list of transfers and updated timestamp.
    """
    url = f"{TRONGRID_API}/v1/accounts/{WALLET_ADDRESS}/transactions/trc20"
    params = {
        "only_confirmed": "true",
        "limit": 50,
        "contract_address": USDT_CONTRACT,
        "only_to": "true",
        "min_timestamp": last_timestamp_ms,
    }

    try:
        resp = requests.get(url, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        transfers = data.get("data", [])
        return transfers
    except requests.exceptions.RequestException as e:
        print(f"[TronGrid] API error: {e}")
        return []


def parse_usdt_amount(value_str):
    """
    Convert TronGrid value string to USDT float.
    USDT has 6 decimals: "10037000" -> 10.037
    """
    try:
        raw = int(value_str)
        return round(raw / 1_000_000, 3)
    except (ValueError, TypeError):
        return 0.0
