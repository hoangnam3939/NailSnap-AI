import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"
UPLOADS_DIR = BASE_DIR / "uploads"
OUTPUTS_DIR = BASE_DIR / "outputs"
CONFIG_FILE = BASE_DIR / "salon_config.json"

for d in [UPLOADS_DIR, OUTPUTS_DIR]:
    d.mkdir(exist_ok=True)

DEFAULT_SALON_CONFIG = {
    "salon_name": "NailSnap AI Studio",
    "tagline": "Ướm Móng Xinh - Lung Linh Trong 3 Giây",
    "hotline": "0988.888.888",
    "address": "Hà Nội - TP. Hồ Chí Minh - Toàn Quốc",
    "booking_url": "https://zalo.me",
    "instagram": "@nailsnap.ai",
    "tiktok": "@nailsnap.ai",
    "watermark_enabled": True
}
