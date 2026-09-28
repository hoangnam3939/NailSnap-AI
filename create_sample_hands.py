import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

target_dir = Path("E:/DESKTOP 6.5.2026/TINHHOA FACEBOOK/NailSnap-AI/frontend/assets/sample_hands")
target_dir.mkdir(parents=True, exist_ok=True)

def create_sample_hand(filename, skin_color, bg_color, title):
    w, h = 600, 800
    img = Image.new("RGB", (w, h), bg_color)
    draw = ImageDraw.Draw(img)
    
    # Vẽ phông nền gradient nhẹ
    for y in range(h):
        r_f = y / h
        c = (
            int(bg_color[0] * (1 - r_f * 0.3)),
            int(bg_color[1] * (1 - r_f * 0.3)),
            int(bg_color[2] * (1 - r_f * 0.3))
        )
        draw.line([(0, y), (w, y)], fill=c)
        
    # Vẽ lòng bàn tay
    draw.ellipse([180, 360, 420, 680], fill=skin_color)
    # Cổ tay
    draw.polygon([(230, 580), (370, 580), (390, 800), (210, 800)], fill=skin_color)
    
    # 5 Ngón tay (Thumb, Index, Middle, Ring, Pinky)
    fingers = [
        # (center_x, top_y, base_x, base_y, width, length)
        (140, 440, 210, 520, 46, 120), # Ngón cái
        (220, 200, 240, 380, 44, 210), # Ngón trỏ
        (300, 150, 300, 370, 46, 250), # Ngón giữa
        (380, 180, 360, 380, 42, 230), # Ngón áp út
        (450, 270, 410, 410, 38, 170), # Ngón út
    ]
    
    for fx, fy, bx, by, fw, fl in fingers:
        # Thân ngón tay
        draw.line([(bx, by), (fx, fy)], fill=skin_color, width=fw)
        # Khớp ngón bo tròn
        draw.ellipse([fx - fw//2, fy - fw//2, fx + fw//2, fy + fw//2], fill=skin_color)
        
        # Móng tay tự nhiên (hơi hồng hào)
        nail_w = int(fw * 0.65)
        nail_h = int(fw * 0.85)
        natural_nail = (int(skin_color[0]*0.95 + 40), int(skin_color[1]*0.8 + 20), int(skin_color[2]*0.8 + 20))
        draw.ellipse([fx - nail_w//2, fy - nail_h//2, fx + nail_w//2, fy + nail_h//2], fill=natural_nail)
        
    # Thêm tiêu đề
    draw.text((20, 20), "NailSnap AI - Sample Hand", fill=(200, 200, 200))
    draw.text((20, 50), title, fill=(255, 182, 193))
    
    filepath = target_dir / filename
    img.save(filepath, quality=95)
    print(f"Created {filepath}")

# 1. Bàn tay da trắng sáng
create_sample_hand("sample_fair.jpg", (250, 215, 195), (28, 24, 32), "Bàn tay mẫu 1: Da Trắng Sáng (Fair Skin)")
# 2. Bàn tay da bánh mật
create_sample_hand("sample_tan.jpg", (205, 150, 115), (24, 28, 30), "Bàn tay mẫu 2: Da Bánh Mật Khỏe Khoắn (Tan Skin)")
# 3. Bàn tay móng ngắn
create_sample_hand("sample_short.jpg", (235, 190, 165), (32, 26, 28), "Bàn tay mẫu 3: Móng Ngắn Tự Nhiên (Short Nails)")
