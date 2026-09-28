"""
NailSnap AI Engine
Computer Vision & Color Theory Engine for Nail Styling & Skin Analysis
"""

import cv2
import numpy as np
from PIL import Image
import io
import json

# Danh sách bảng màu chuẩn Salon theo Tone da
SKIN_TONE_RECOMMENDATIONS = {
    "cool_light": {
        "label": "Da Trắng Sáng - Cool Undertone",
        "description": "Làn da trắng sáng với sắc tố lạnh, nổi bật gân xanh lam/tím.",
        "best_colors": ["#FFB6C1", "#E6E6FA", "#DDA0DD", "#87CEEB", "#C0C0C0", "#B22222"],
        "best_styles": ["Thạch hồng baby", "Ombre đào phai", "Mắt mèo ánh bạc", "French đầu móng trắng sữa", "Đỏ Cherry rượu vang"],
        "avoid_colors": ["Vàng chanh neon", "Cam đất sẫm"],
        "tips": "Nên chọn sơn thạch (jelly) hoặc nhũ ngọc trai để tôn lên độ trắng ngọc ngà của làn da."
    },
    "warm_light": {
        "label": "Da Trắng Vàng - Warm Undertone",
        "description": "Làn da sáng ấm đặc trưng của phụ nữ Việt Nam, gân tay xanh lá.",
        "best_colors": ["#FF7F50", "#FFD700", "#E9967A", "#F4A460", "#800020", "#D2691E"],
        "best_styles": ["Ombre cam san hô", "Tráng gương ánh vàng", "Nâu hổ phách cẩm thạch", "Đỏ ruby burgundy", "Trà sữa nude"],
        "avoid_colors": ["Xanh neon lạnh", "Tím cà rực"],
        "tips": "Tone màu ấm áp hoặc ánh nhũ vàng kim sẽ giúp bàn tay sáng bừng và cực kỳ sang trọng."
    },
    "warm_medium": {
        "label": "Da Trung Tính / Bánh Mật Khỏe Khoắn",
        "description": "Làn da ngăm tự nhiên khỏe khoắn, rất thu hút và cá tính.",
        "best_colors": ["#8B0000", "#2F4F4F", "#D4AF37", "#4A0E17", "#B8860B", "#F5F5DC"],
        "best_styles": ["Đỏ rượu mận (Wine Red)", "Tráng gương Metallic Chrome", "Mắt mèo hổ phách 3D", "Trắng sữa Nude contrast", "Xanh rêu ngọc bích"],
        "avoid_colors": ["Hồng cánh sen bợt", "Màu phấn pastel quá nhạt"],
        "tips": "Đừng ngại các tone màu đậm hoặc tráng gương kim loại Y2K! Màu đậm sẽ làm bàn tay cực kỳ quyến rũ và quyền lực."
    },
    "neutral": {
        "label": "Da Trung Tính Đa Năng",
        "description": "Làn da cân bằng hoàn hảo, dễ dàng phối hợp mọi phong cách móng.",
        "best_colors": ["#E8D8D8", "#C71585", "#1C1C1C", "#4682B4", "#708090", "#DA70D6"],
        "best_styles": ["Mắt mèo xám khói", "Hồng thạch Douyin", "French đen sang chảnh", "Nail đá cẩm thạch", "Trắng ngọc trai"],
        "avoid_colors": [],
        "tips": "Bạn có thể tự do thử nghiệm mọi phong cách từ thanh lịch Hàn Quốc đến cá tính Y2K phương Tây!"
    }
}

# Thư viện mẫu Nail Hot Trend có sẵn (Presets)
TRENDING_NAIL_PRESETS = [
    {
        "id": "douyin-blush-jelly",
        "name": "Thạch Hồng Đào Douyin",
        "category": "douyin",
        "category_name": "🌸 Douyin & Hàn Quốc",
        "shape": "almond",
        "finish": "jelly",
        "primary_color": "#FF9BB2",
        "secondary_color": "#FFF0F5",
        "accent": "pearl_sheen",
        "gemstones": False,
        "description": "Lớp sơn thạch trong veo ửng hồng ở tâm móng, viền bóng gương chuẩn nàng thơ Bắc Kinh/Seoul.",
        "best_for": ["Đi học", "Đi làm công sở", "Cà phê cuối tuần", "Tiệc sinh nhật"],
        "price_estimate": "250.000đ - 350.000đ"
    },
    {
        "id": "hanoi-emerald-marble",
        "name": "Cẩm Thạch Lục Bảo Hoàng Gia",
        "category": "luxury",
        "category_name": "💎 Sang Chảnh & Quý Phái (Hà Nội Style)",
        "shape": "coffin",
        "finish": "glossy",
        "primary_color": "#0F52BA",
        "secondary_color": "#2E8B57",
        "accent": "gold_foil",
        "gemstones": True,
        "description": "Vân đá cẩm thạch xanh ngọc bích phối lá vàng 24k dát mỏng, đính pha lê Swarovski kiêu kỳ.",
        "best_for": ["Dạ tiệc Tràng Tiền", "Đám cưới quý tộc", "Hợp mệnh Mộc/Thủy"],
        "price_estimate": "550.000đ - 850.000đ"
    },
    {
        "id": "saigon-y2k-chrome",
        "name": "Tráng Gương Bạc Y2K Cyberpunk",
        "category": "y2k",
        "category_name": "⚡ Y2K & Cháy Phố (Sài Gòn & USA)",
        "shape": "stiletto",
        "finish": "chrome",
        "primary_color": "#E5E5E5",
        "secondary_color": "#1A1A1A",
        "accent": "metallic_mirror",
        "gemstones": False,
        "description": "Bột tráng gương ánh bạc sắc lạnh phản quang 360 độ, form móng nhọn nổi loạn chuẩn vibe phố đi bộ Nguyễn Huệ.",
        "best_for": ["Cháy phố cuối tuần", "Quay TikTok triệu view", "Lễ hội âm nhạc", "Concert"],
        "price_estimate": "380.000đ - 500.000đ"
    },
    {
        "id": "classic-wine-red",
        "name": "Đỏ Rượu Vang Bordeaux Nữ Quyền",
        "category": "luxury",
        "category_name": "💎 Sang Chảnh & Quý Phái (Hà Nội Style)",
        "shape": "square",
        "finish": "glossy",
        "primary_color": "#670A18",
        "secondary_color": "#3B020B",
        "accent": "high_gloss",
        "gemstones": True,
        "description": "Sắc đỏ rượu vang đậm đà quyền lực, tôn trắng mọi tone da ngăm hay sáng, điểm xuyết viền đá chân móng.",
        "best_for": ["Gặp gỡ đối tác", "Dạ tiệc tối", "Mùa lễ Tết & Giáng sinh"],
        "price_estimate": "350.000đ - 480.000đ"
    },
    {
        "id": "cat-eye-galaxy",
        "name": "Mắt Mèo Khổng Tước Dải Ngân Hà",
        "category": "douyin",
        "category_name": "🌸 Douyin & Hàn Quốc",
        "shape": "almond",
        "finish": "cat_eye",
        "primary_color": "#1C2833",
        "secondary_color": "#5DADE2",
        "accent": "magnetic_sparkle",
        "gemstones": False,
        "description": "Nhũ mắt mèo nam châm hút vầng sáng 3D chuyển động theo từng góc nghiêng của bàn tay.",
        "best_for": ["Hẹn hò lãng mạn", "Tiệc đêm", "Chụp ảnh nghệ thuật"],
        "price_estimate": "300.000đ - 420.000đ"
    },
    {
        "id": "french-luxury-modern",
        "name": "French Đầu Móng Kim Tuyến Hiện Đại",
        "category": "classic",
        "category_name": "✨ Kinh Điển & Thanh Lịch",
        "shape": "round",
        "finish": "glossy",
        "primary_color": "#FDFBF7",
        "secondary_color": "#D4AF37",
        "accent": "french_tip",
        "gemstones": False,
        "description": "Nền móng nude hồng trong suốt điểm đầu móng viền cong dát nhũ vàng kim tinh tế, không bao giờ lỗi thời.",
        "best_for": ["Nàng dâu ngày cưới", "Phỏng vấn xin việc", "Công sở hàng ngày"],
        "price_estimate": "250.000đ - 350.000đ"
    },
    {
        "id": "amber-caramel-latte",
        "name": "Hổ Phách Cà Phê Latte Mùa Thu",
        "category": "classic",
        "category_name": "✨ Kinh Điển & Thanh Lịch",
        "shape": "almond",
        "finish": "jelly",
        "primary_color": "#A0522D",
        "secondary_color": "#DEB887",
        "accent": "swirl_marble",
        "gemstones": False,
        "description": "Hòa quyện vân đá hổ phách mật ong cùng tone trà sữa caramen ấm áp, ngắm là thấy bình yên và thơ mộng.",
        "best_for": ["Mùa thu Hà Nội", "Cà phê sách", "Chụp lookbook áo len"],
        "price_estimate": "320.000đ - 450.000đ"
    },
    {
        "id": "black-pink-punk",
        "name": "Black & Pink Cyber Metallic",
        "category": "y2k",
        "category_name": "⚡ Y2K & Cháy Phố (Sài Gòn & USA)",
        "shape": "coffin",
        "finish": "chrome",
        "primary_color": "#0A0A0A",
        "secondary_color": "#FF1493",
        "accent": "gothic_cross",
        "gemstones": True,
        "description": "Đen nhám huyền bí kết hợp hồng neon tráng gương cùng charm đính kim loại chữ thập gothic.",
        "best_for": ["Dân hiphop", "Quẩy bar/club", "Phối đồ streetstyle"],
        "price_estimate": "450.000đ - 650.000đ"
    }
]


def analyze_skin_tone_from_image(image_bytes: bytes) -> dict:
    """
    Phân tích tone da bàn tay từ ảnh chụp thực tế bằng Computer Vision (OpenCV & Color Space)
    """
    try:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return SKIN_TONE_RECOMMENDATIONS["warm_light"]
        
        # Chuyển đổi sang không gian màu HSV & YCrCb để nhận diện màu da chính xác
        ycrcb = cv2.cvtColor(img, cv2.COLOR_BGR2YCrCb)
        
        # Mặt nạ lọc màu da người châu Á
        lower_skin = np.array([0, 133, 77], dtype=np.uint8)
        upper_skin = np.array([255, 173, 127], dtype=np.uint8)
        mask = cv2.inRange(ycrcb, lower_skin, upper_skin)
        
        skin_pixels = img[mask > 0]
        if len(skin_pixels) == 0:
            # Fallback lấy trung tâm ảnh
            h, w, _ = img.shape
            center_crop = img[int(h*0.3):int(h*0.7), int(w*0.3):int(w*0.7)]
            skin_pixels = center_crop.reshape(-1, 3)
            
        avg_bgr = np.mean(skin_pixels, axis=0)
        b, g, r = avg_bgr[0], avg_bgr[1], avg_bgr[2]
        
        # Độ sáng tổng thể
        brightness = (0.299 * r + 0.587 * g + 0.114 * b)
        
        # Chỉ số undertone (tỷ lệ sắc đỏ r và xanh b)
        red_blue_ratio = r / (b + 1e-5)
        
        # Phân loại
        if brightness > 165:
            if red_blue_ratio > 1.35:
                tone_key = "warm_light"
            else:
                tone_key = "cool_light"
        elif brightness > 125:
            if red_blue_ratio > 1.4:
                tone_key = "warm_medium"
            else:
                tone_key = "neutral"
        else:
            tone_key = "warm_medium"
            
        result = dict(SKIN_TONE_RECOMMENDATIONS.get(tone_key, SKIN_TONE_RECOMMENDATIONS["warm_light"]))
        result["detected_rgb"] = f"rgb({int(r)}, {int(g)}, {int(b)})"
        result["brightness_score"] = round(float(brightness), 1)
        return result
    except Exception as e:
        print(f"Lỗi phân tích da: {e}")
        return SKIN_TONE_RECOMMENDATIONS["warm_light"]


def generate_ai_nail_design(prompt: str, skin_tone: str = "warm_light") -> dict:
    """
    Sinh công thức móng độc bản dựa trên prompt mô tả của người dùng
    """
    prompt_lower = prompt.lower()
    
    # Logic suy luận thông minh theo từ khóa
    shape = "almond"
    finish = "glossy"
    primary_color = "#FF9BB2"
    secondary_color = "#FFF0F5"
    accent = "glitter"
    gemstones = False
    style_name = "Thiết Kế Độc Bản AI NailSnap"
    
    if any(k in prompt_lower for k in ["cưới", "cô dâu", "wedding", "trắng", "ngọc trai"]):
        style_name = "Nail Nàng Dâu Bạch Ngọc Trai"
        shape = "almond"
        finish = "glossy"
        primary_color = "#F8F8FF"
        secondary_color = "#FFE4E1"
        accent = "pearl_sheen"
        gemstones = True
    elif any(k in prompt_lower for k in ["y2k", "bạc", "chrome", "cyber", "kim loại", "metallic"]):
        style_name = "Cyber Silver Y2K Chrome"
        shape = "stiletto"
        finish = "chrome"
        primary_color = "#D8D8D8"
        secondary_color = "#111111"
        accent = "metallic_mirror"
    elif any(k in prompt_lower for k in ["đỏ", "rượu", "bordeaux", "quyền lực", "sexy", "party"]):
        style_name = "Bordeaux Velvet Queen"
        shape = "coffin"
        finish = "glossy"
        primary_color = "#720E1E"
        secondary_color = "#2E0309"
        accent = "high_gloss"
        gemstones = True
    elif any(k in prompt_lower for k in ["thạch", "đào", "douyin", "hồng", "baby", "dễ thương"]):
        style_name = "Douyin Jelly Peach Blossom"
        shape = "almond"
        finish = "jelly"
        primary_color = "#FFAAB8"
        secondary_color = "#FFF5EE"
        accent = "soft_glow"
    elif any(k in prompt_lower for k in ["đen", "black", "gothic", "ngầu", "mắt mèo"]):
        style_name = "Midnight Cat-Eye Nebula"
        shape = "coffin"
        finish = "cat_eye"
        primary_color = "#0D0D11"
        secondary_color = "#3A3B3C"
        accent = "magnetic_sparkle"
    elif any(k in prompt_lower for k in ["xanh", "lục bảo", "emerald", "phong thủy", "tiền tài"]):
        style_name = "Ngọc Lục Bảo Thủy Thổ Sinh Tài"
        shape = "coffin"
        finish = "glossy"
        primary_color = "#0B6623"
        secondary_color = "#043927"
        accent = "gold_foil"
        gemstones = True
    else:
        # Tự động phối màu sáng tạo
        style_name = f"Concept: {prompt.capitalize()}"
        shape = "almond"
        finish = "jelly"
        primary_color = "#E06D83"
        secondary_color = "#FCE4EC"
        accent = "glitter"
        
    return {
        "prompt": prompt,
        "style_name": style_name,
        "shape": shape,
        "finish": finish,
        "primary_color": primary_color,
        "secondary_color": secondary_color,
        "accent": accent,
        "gemstones": gemstones,
        "recipe": {
            "base_coat": "Liên kết kiềm dầu + Base cao su dẻo",
            "color_formula": f"Sơn lót {secondary_color} (2 lớp mỏng) + Tán màu {primary_color} kỹ thuật ombre",
            "finish_technique": f"Hiệu ứng {finish.upper()} khóa bóng chống xước 4 tuần",
            "hardware": "Charm đá viền chân móng + Nhũ hologram" if gemstones else "Không đính đá, phủ top bóng nano"
        }
    }
