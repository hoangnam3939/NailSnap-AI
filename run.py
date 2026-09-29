"""
NailSnap AI - Launcher Script
Khởi chạy Server & Tự Động Tạo Link Truy Cập Cho Cả Máy Tính & Điện Thoại Qua WiFi
"""

import socket
import webbrowser
import os
import sys

# Đảm bảo mã hóa UTF-8 trên Windows console
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

import uvicorn

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def print_banner(port, local_ip):
    print("=" * 65)
    print("      ✨ NAILSNAP AI - VIRTUAL NAIL TRY-ON STUDIO ✨")
    print("         (Thử Móng Ảo Trong 3 Giây Bằng Trí Tuệ Nhân Tạo)")
    print("=" * 65)
    print()
    print(f"  💻 Trên máy tính này:")
    print(f"     👉 http://localhost:{port}")
    print()
    print(f"  📱 Trên Điện Thoại (iPhone/Android cùng mạng WiFi):")
    print(f"     👉 http://{local_ip}:{port}")
    print()
    print("  ⭐ Hướng dẫn nhanh cho bạn:")
    print("     1. Trình duyệt sẽ tự động mở lên trong vài giây.")
    print("     2. Chọn [Mẫu Sẵn] để xem móng lấp lánh ngay lập tức.")
    print("     3. Hoặc bấm [Camera] để giơ bàn tay thật của bạn lên thử!")
    print("=" * 65)
    print()

if __name__ == "__main__":
    port = 8000
    host = "0.0.0.0"
    local_ip = get_local_ip()
    
    print_banner(port, local_ip)
    
    # Tự động mở trình duyệt web sau 1 giây khi server đã sẵn sàng
    import threading
    threading.Timer(1.0, lambda: webbrowser.open(f"http://localhost:{port}")).start()
        
    # Chạy FastAPI Server
    uvicorn.run("backend.main:app", host=host, port=port, reload=False)
