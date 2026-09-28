/**
 * NailSnap AI - Core AR Nail Rendering Engine
 * Sử dụng HTML5 Canvas & Phép biến đổi hình học từ MediaPipe Hand Landmarks
 */

class NailAREngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Cấu hình móng hiện tại
        this.currentConfig = {
            shape: 'almond',        // almond, square, coffin, round, stiletto
            length: 1.25,           // 1.0 = tự nhiên, 1.3 = vừa, 1.6 = dài
            finish: 'jelly',        // jelly, glossy, chrome, matte, cat_eye
            primaryColor: '#FF8DA1',
            secondaryColor: '#FFF0F5',
            frenchTip: false,
            frenchColor: '#FFFFFF',
            gemstones: false,
            glitter: false,
            catEye: false,
            goldFoil: false,
            showSkeleton: false
        };

        // 5 Ngón tay: (tip_index, dip_index, width_factor, length_factor)
        this.fingerMapping = [
            { name: "thumb", tip: 4, dip: 3, pip: 2, width: 0.95, len: 0.95 },
            { name: "index", tip: 8, dip: 7, pip: 6, width: 0.75, len: 1.05 },
            { name: "middle", tip: 12, dip: 11, pip: 10, width: 0.80, len: 1.15 },
            { name: "ring", tip: 16, dip: 15, pip: 14, width: 0.75, len: 1.05 },
            { name: "pinky", tip: 20, dip: 19, pip: 18, width: 0.65, len: 0.90 }
        ];

        // Biến động lực học cho hiệu ứng mắt mèo & ánh sáng lấp lánh
        this.time = 0;
    }

    setConfig(newConfig) {
        this.currentConfig = { ...this.currentConfig, ...newConfig };
    }

    render(landmarks, videoWidth, videoHeight) {
        const ctx = this.ctx;
        this.time += 0.05;

        if (!landmarks || landmarks.length === 0) return;

        // Vẽ từng ngón tay
        for (const finger of this.fingerMapping) {
            const tipPoint = landmarks[finger.tip];
            const dipPoint = landmarks[finger.dip];

            if (!tipPoint || !dipPoint) continue;

            const tipX = tipPoint.x * this.canvas.width;
            const tipY = tipPoint.y * this.canvas.height;
            const dipX = dipPoint.x * this.canvas.width;
            const dipY = dipPoint.y * this.canvas.height;

            // Tính vector hướng ngón tay
            const dx = tipX - dipX;
            const dy = tipY - dipY;
            const baseDist = Math.hypot(dx, dy);

            // Góc nghiêng của ngón tay
            const angle = Math.atan2(dy, dx) + Math.PI / 2;

            // Kích thước móng tỉ lệ theo độ dài ngón tay
            const nailWidth = baseDist * 0.52 * finger.width;
            const nailLength = baseDist * 0.95 * finger.len * this.currentConfig.length;

            ctx.save();
            // Đặt gốc tọa độ tại chóp ngón tay và xoay theo hướng ngón
            ctx.translate(tipX, tipY);
            ctx.rotate(angle);

            // Dịch lui lại 1 chút để chân móng nằm đúng khớp móng thật
            const cuticleOffsetY = nailLength * 0.32;
            ctx.translate(0, cuticleOffsetY);

            // Vẽ bộ móng hoàn chỉnh
            this.drawCompleteNail(ctx, nailWidth, nailLength);

            ctx.restore();
        }

        // Nếu bật hiển thị khung xương AI (để học sinh lớp 5 dễ hình dung)
        if (this.currentConfig.showSkeleton) {
            this.drawSkeleton(landmarks);
        }
    }

    drawCompleteNail(ctx, w, h) {
        const halfW = w / 2;
        const config = this.currentConfig;

        // 1. Bóng đổ chân thực (Ambient Occlusion & Cuticle Shadow)
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 4;
        this.buildNailPath(ctx, halfW, h, config.shape);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.fill();
        ctx.restore();

        // 2. Tạo đường Path cho móng và tô nền (Base Layer)
        ctx.save();
        this.buildNailPath(ctx, halfW, h, config.shape);
        ctx.clip(); // Giới hạn mọi hiệu ứng bên trong khung móng

        // Tô màu nền Ombre / Gradient
        const grad = ctx.createLinearGradient(0, 0, 0, -h);
        if (config.finish === 'jelly') {
            grad.addColorStop(0, config.secondaryColor);
            grad.addColorStop(0.45, config.primaryColor);
            grad.addColorStop(1, this.hexToRgba(config.primaryColor, 0.85));
        } else if (config.finish === 'chrome') {
            grad.addColorStop(0, '#FFFFFF');
            grad.addColorStop(0.2, config.primaryColor);
            grad.addColorStop(0.5, '#222222');
            grad.addColorStop(0.7, config.primaryColor);
            grad.addColorStop(1, '#FFFFFF');
        } else {
            grad.addColorStop(0, config.secondaryColor || config.primaryColor);
            grad.addColorStop(1, config.primaryColor);
        }

        ctx.fillStyle = grad;
        ctx.fill();

        // 3. Hiệu ứng Mắt Mèo 3D (Cat-Eye Magnetic Sheen)
        if (config.finish === 'cat_eye' || config.catEye) {
            this.drawCatEyeEffect(ctx, halfW, h);
        }

        // 4. Hiệu ứng Tráng Gương Metallic (Chrome Reflections)
        if (config.finish === 'chrome') {
            this.drawChromeReflection(ctx, halfW, h);
        }

        // 5. Hiệu ứng Dát Vàng Lá 24K / Vân Đá Cẩm Thạch
        if (config.goldFoil) {
            this.drawGoldFoilSwirl(ctx, halfW, h);
        }

        // 6. Hiệu ứng Kim Tuyến Nhũ (Glitter Sparkles)
        if (config.glitter) {
            this.drawGlitter(ctx, halfW, h);
        }

        // 7. Đầu Móng French (French Tip Smile Line)
        if (config.frenchTip) {
            this.drawFrenchTip(ctx, halfW, h, config.frenchColor || '#FFFFFF');
        }

        // 8. Hiệu ứng Phản Quang & Độ Bóng Cao Cấp (Glossy Gel Top Coat)
        if (config.finish !== 'matte') {
            this.drawTopCoatSpecular(ctx, halfW, h);
        } else {
            this.drawMatteVelvetTexture(ctx, halfW, h);
        }

        // 9. Đính Đá Pha Lê Swarovski / Hạt Ngọc Trai
        if (config.gemstones) {
            this.drawRhinestones(ctx, halfW, h);
        }

        ctx.restore(); // Kết thúc clip

        // 10. Viền móng tự nhiên (Viền mảnh nhẹ nhàng)
        ctx.save();
        this.buildNailPath(ctx, halfW, h, config.shape);
        ctx.lineWidth = 0.8;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.stroke();
        ctx.restore();
    }

    buildNailPath(ctx, halfW, h, shape) {
        ctx.beginPath();
        const bottomY = 0;
        const topY = -h;

        // Điểm chân móng (Cuticle) bo tròn tự nhiên ôm ngón tay
        ctx.moveTo(-halfW * 0.9, bottomY - 3);
        ctx.quadraticCurveTo(0, bottomY + 5, halfW * 0.9, bottomY - 3);

        if (shape === 'almond') {
            // Móng Hạnh Nhân: Thon dần và vòm cong mềm mại ở đầu
            ctx.bezierCurveTo(halfW * 1.05, -h * 0.35, halfW * 0.75, -h * 0.75, 0, topY);
            ctx.bezierCurveTo(-halfW * 0.75, -h * 0.75, -halfW * 1.05, -h * 0.35, -halfW * 0.9, bottomY - 3);
        } else if (shape === 'square') {
            // Móng Vuông: Cạnh thẳng song song, đầu ngang bo góc nhẹ
            ctx.lineTo(halfW, topY + 4);
            ctx.quadraticCurveTo(halfW, topY, halfW - 4, topY);
            ctx.lineTo(-halfW + 4, topY);
            ctx.quadraticCurveTo(-halfW, topY, -halfW, topY + 4);
            ctx.lineTo(-halfW * 0.9, bottomY - 3);
        } else if (shape === 'coffin') {
            // Móng Thang (Coffin/Ballerina): Vát chéo vào trong, đầu phẳng
            ctx.lineTo(halfW * 0.95, -h * 0.4);
            ctx.lineTo(halfW * 0.55, topY);
            ctx.lineTo(-halfW * 0.55, topY);
            ctx.lineTo(-halfW * 0.95, -h * 0.4);
            ctx.lineTo(-halfW * 0.9, bottomY - 3);
        } else if (shape === 'stiletto') {
            // Móng Nhọn (Stiletto): Nhọn hoắt sắc sảo
            ctx.bezierCurveTo(halfW, -h * 0.3, halfW * 0.4, -h * 0.7, 0, topY - 5);
            ctx.bezierCurveTo(-halfW * 0.4, -h * 0.7, -halfW, -h * 0.3, -halfW * 0.9, bottomY - 3);
        } else {
            // Móng Tròn (Round): Vòm cung tròn tự nhiên
            ctx.lineTo(halfW, -h * 0.5);
            ctx.quadraticCurveTo(halfW, topY, 0, topY);
            ctx.quadraticCurveTo(-halfW, topY, -halfW, -h * 0.5);
            ctx.lineTo(-halfW * 0.9, bottomY - 3);
        }
        ctx.closePath();
    }

    drawTopCoatSpecular(ctx, halfW, h) {
        // Vệt sáng bóng phản quang bóng loáng dọc sườn móng (Specular Curve)
        ctx.save();
        const highlightGrad = ctx.createLinearGradient(-halfW * 0.6, 0, halfW * 0.2, 0);
        highlightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.75)');
        highlightGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
        highlightGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');

        ctx.fillStyle = highlightGrad;
        ctx.beginPath();
        ctx.ellipse(-halfW * 0.35, -h * 0.52, halfW * 0.28, h * 0.42, 0.1, 0, Math.PI * 2);
        ctx.fill();

        // Đốm sáng điểm nhấn nhỏ ở góc trên
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(-halfW * 0.25, -h * 0.75, halfW * 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    drawMatteVelvetTexture(ctx, halfW, h) {
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.beginPath();
        ctx.rect(-halfW, -h, halfW * 2, h);
        ctx.fill();
        ctx.restore();
    }

    drawCatEyeEffect(ctx, halfW, h) {
        ctx.save();
        // Vệt sáng nam châm di chuyển nhẹ theo nhịp
        const wave = Math.sin(this.time) * 0.15;
        const catGrad = ctx.createLinearGradient(-halfW * 0.8, -h * (0.8 + wave), halfW * 0.8, -h * (0.2 + wave));
        catGrad.addColorStop(0, 'rgba(255, 255, 255, 0.0)');
        catGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0.3)');
        catGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
        catGrad.addColorStop(0.6, 'rgba(255, 255, 255, 0.3)');
        catGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');

        ctx.fillStyle = catGrad;
        ctx.fillRect(-halfW * 1.5, -h * 1.5, halfW * 3, h * 2);
        ctx.restore();
    }

    drawChromeReflection(ctx, halfW, h) {
        ctx.save();
        const chromeGrad = ctx.createLinearGradient(-halfW, -h * 0.2, halfW, -h * 0.8);
        chromeGrad.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        chromeGrad.addColorStop(0.3, 'rgba(40, 40, 40, 0.5)');
        chromeGrad.addColorStop(0.6, 'rgba(255, 255, 255, 0.9)');
        chromeGrad.addColorStop(0.8, 'rgba(20, 20, 20, 0.6)');
        chromeGrad.addColorStop(1, 'rgba(255, 255, 255, 0.7)');

        ctx.fillStyle = chromeGrad;
        ctx.fillRect(-halfW, -h, halfW * 2, h);
        ctx.restore();
    }

    drawFrenchTip(ctx, halfW, h, color) {
        ctx.save();
        ctx.fillStyle = color;
        const tipHeight = h * 0.25;
        ctx.beginPath();
        ctx.moveTo(-halfW, -h + tipHeight);
        ctx.quadraticCurveTo(0, -h + tipHeight * 1.4, halfW, -h + tipHeight);
        ctx.lineTo(halfW, -h);
        ctx.lineTo(-halfW, -h);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    drawGoldFoilSwirl(ctx, halfW, h) {
        ctx.save();
        ctx.fillStyle = '#FFE082';
        // Các đốm vàng lá lấp lánh rải rác
        const flakes = [
            [-halfW * 0.3, -h * 0.3, halfW * 0.15],
            [halfW * 0.2, -h * 0.5, halfW * 0.18],
            [-halfW * 0.1, -h * 0.7, halfW * 0.12],
            [halfW * 0.4, -h * 0.2, halfW * 0.1]
        ];
        for (const [fx, fy, fr] of flakes) {
            ctx.beginPath();
            ctx.arc(fx, fy, fr, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    drawGlitter(ctx, halfW, h) {
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        const sparkles = [
            [-halfW * 0.5, -h * 0.4, 1.5],
            [halfW * 0.3, -h * 0.6, 2.0],
            [0, -h * 0.25, 1.8],
            [-halfW * 0.2, -h * 0.8, 1.4],
            [halfW * 0.5, -h * 0.35, 1.6]
        ];
        for (const [sx, sy, sr] of sparkles) {
            ctx.beginPath();
            ctx.arc(sx, sy, sr, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    drawRhinestones(ctx, halfW, h) {
        ctx.save();
        // Hạt đá lấp lánh đính tại chân móng
        const gemX = 0;
        const gemY = -h * 0.15;
        const radius = halfW * 0.28;

        // Vỏ kim loại bọc đá
        ctx.fillStyle = '#D4AF37';
        ctx.beginPath();
        ctx.arc(gemX, gemY, radius + 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Mặt đá pha lê phát sáng
        const gemGrad = ctx.createRadialGradient(gemX - radius * 0.3, gemY - radius * 0.3, 1, gemX, gemY, radius);
        gemGrad.addColorStop(0, '#FFFFFF');
        gemGrad.addColorStop(0.5, '#E0F2FE');
        gemGrad.addColorStop(1, '#60A5FA');

        ctx.fillStyle = gemGrad;
        ctx.beginPath();
        ctx.arc(gemX, gemY, radius, 0, Math.PI * 2);
        ctx.fill();

        // Tia lóe sáng ngôi sao 4 cánh
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(gemX - radius * 1.5, gemY);
        ctx.lineTo(gemX + radius * 1.5, gemY);
        ctx.moveTo(gemX, gemY - radius * 1.5);
        ctx.lineTo(gemX, gemY + radius * 1.5);
        ctx.stroke();

        ctx.restore();
    }

    drawSkeleton(landmarks) {
        const ctx = this.ctx;
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 117, 140, 0.7)';
        ctx.lineWidth = 2;
        ctx.fillStyle = '#FF758C';

        // Vẽ các khớp ngón tay
        for (let i = 0; i < landmarks.length; i++) {
            const p = landmarks[i];
            const px = p.x * this.canvas.width;
            const py = p.y * this.canvas.height;
            ctx.beginPath();
            ctx.arc(px, py, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    hexToRgba(hex, alpha = 1) {
        let c = hex.replace('#', '');
        if (c.length === 3) c = c.split('').map(x => x + x).join('');
        const num = parseInt(c, 16);
        const r = (num >> 16) & 255;
        const g = (num >> 8) & 255;
        const b = num & 255;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
}
