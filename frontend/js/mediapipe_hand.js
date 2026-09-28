/**
 * NailSnap AI - MediaPipe Hand Tracker Wrapper
 * Xử lý luồng Camera trực tiếp & Nhận diện bàn tay từ ảnh tải lên
 */

class HandTracker {
    constructor(onResultsCallback) {
        this.onResultsCallback = onResultsCallback;
        this.hands = null;
        this.camera = null;
        this.videoElement = null;
        this.isInitialized = false;
        this.isStreaming = false;

        // Vị trí mẫu giả lập cho 3 bàn tay test khi không có camera hoặc chạy offline
        this.sampleHandLandmarks = {
            "fair": this.generateSyntheticLandmarks(250, 215, 195),
            "tan": this.generateSyntheticLandmarks(205, 150, 115),
            "short": this.generateSyntheticLandmarks(235, 190, 165)
        };
    }

    async init() {
        if (this.isInitialized) return;

        try {
            if (typeof Hands !== 'undefined') {
                this.hands = new Hands({
                    locateFile: (file) => {
                        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
                    }
                });

                this.hands.setOptions({
                    maxNumHands: 1,
                    modelComplexity: 1,
                    minDetectionConfidence: 0.65,
                    minTrackingConfidence: 0.65
                });

                this.hands.onResults((results) => {
                    if (this.onResultsCallback) {
                        this.onResultsCallback(results);
                    }
                });

                this.isInitialized = true;
                console.log("MediaPipe Hands initialized successfully!");
            } else {
                console.warn("MediaPipe Hands CDN not ready yet. Fallback mode active.");
            }
        } catch (err) {
            console.error("Failed to initialize MediaPipe Hands:", err);
        }
    }

    async startCamera(videoElement, facingMode = 'user') {
        this.videoElement = videoElement;
        await this.init();

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            });

            this.videoElement.srcObject = stream;
            await this.videoElement.play();
            this.isStreaming = true;

            // Vòng lặp phân tích khung hình video
            const processFrame = async () => {
                if (!this.isStreaming) return;
                if (this.hands && this.videoElement.readyState >= 2) {
                    await this.hands.send({ image: this.videoElement });
                }
                requestAnimationFrame(processFrame);
            };

            processFrame();
            return { success: true };
        } catch (error) {
            console.error("Camera access error:", error);
            return { success: false, error: error.message };
        }
    }

    stopCamera() {
        this.isStreaming = false;
        if (this.videoElement && this.videoElement.srcObject) {
            const stream = this.videoElement.srcObject;
            const tracks = stream.getTracks();
            tracks.forEach(track => track.stop());
            this.videoElement.srcObject = null;
        }
    }

    async processStaticImage(imageElement) {
        await this.init();
        if (this.hands) {
            await this.hands.send({ image: imageElement });
        }
    }

    getSyntheticLandmarks(sampleKey = "fair") {
        return this.sampleHandLandmarks[sampleKey] || this.sampleHandLandmarks["fair"];
    }

    // Tọa độ 21 điểm xương tay khớp chuẩn với ảnh sample_hands tạo từ Pillow
    generateSyntheticLandmarks() {
        // Tỷ lệ chuẩn hóa (x, y từ 0.0 đến 1.0) trên khung ảnh 600x800
        const W = 600;
        const H = 800;
        
        return [
            { x: 300 / W, y: 700 / H, z: 0 }, // 0: Cổ tay
            { x: 210 / W, y: 520 / H, z: 0 }, // 1: Ngón cái CMC
            { x: 180 / W, y: 490 / H, z: 0 }, // 2: Ngón cái MCP
            { x: 160 / W, y: 465 / H, z: 0 }, // 3: Ngón cái IP
            { x: 140 / W, y: 440 / H, z: 0 }, // 4: Chóp ngón cái (THUMB TIP)

            { x: 240 / W, y: 380 / H, z: 0 }, // 5: Ngón trỏ MCP
            { x: 232 / W, y: 310 / H, z: 0 }, // 6: Ngón trỏ PIP
            { x: 226 / W, y: 250 / H, z: 0 }, // 7: Ngón trỏ DIP
            { x: 220 / W, y: 200 / H, z: 0 }, // 8: Chóp ngón trỏ (INDEX TIP)

            { x: 300 / W, y: 370 / H, z: 0 }, // 9: Ngón giữa MCP
            { x: 300 / W, y: 290 / H, z: 0 }, // 10: Ngón giữa PIP
            { x: 300 / W, y: 215 / H, z: 0 }, // 11: Ngón giữa DIP
            { x: 300 / W, y: 150 / H, z: 0 }, // 12: Chóp ngón giữa (MIDDLE TIP)

            { x: 360 / W, y: 380 / H, z: 0 }, // 13: Ngón áp út MCP
            { x: 368 / W, y: 305 / H, z: 0 }, // 14: Ngón áp út PIP
            { x: 374 / W, y: 240 / H, z: 0 }, // 15: Ngón áp út DIP
            { x: 380 / W, y: 180 / H, z: 0 }, // 16: Chóp ngón áp út (RING TIP)

            { x: 410 / W, y: 410 / H, z: 0 }, // 17: Ngón út MCP
            { x: 425 / W, y: 360 / H, z: 0 }, // 18: Ngón út PIP
            { x: 438 / W, y: 315 / H, z: 0 }, // 19: Ngón út DIP
            { x: 450 / W, y: 270 / H, z: 0 }, // 20: Chóp ngón út (PINKY TIP)
        ];
    }
}
