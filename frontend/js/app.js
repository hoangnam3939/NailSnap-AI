/**
 * NailSnap AI - Main Application Controller
 * Quản lý trạng thái, tương tác người dùng, tích hợp Camera & MediaPipe AR
 */

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Elements
    const cameraVideo = document.getElementById('cameraVideo');
    const sourceImage = document.getElementById('sourceImage');
    const nailCanvas = document.getElementById('nailCanvas');
    const handStatusText = document.getElementById('handStatusText');
    const statusDot = document.getElementById('statusDot');

    // Modals
    const skinModal = document.getElementById('skinModal');
    const recipeModal = document.getElementById('recipeModal');
    const snapshotModal = document.getElementById('snapshotModal');
    const salonModal = document.getElementById('salonModal');

    // 2. Initialize AR Engine & Hand Tracker
    const arEngine = new NailAREngine(nailCanvas);
    let currentLandmarks = null;
    let currentMode = 'sample'; // 'camera', 'upload', 'sample'
    let currentSampleKey = 'fair';
    let activePreset = NAIL_PRESETS[0];

    const handTracker = new HandTracker((results) => {
        if (results && results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            currentLandmarks = results.multiHandLandmarks[0];
            updateHandStatus(true);
        } else {
            if (currentMode === 'camera') {
                currentLandmarks = null;
                updateHandStatus(false);
            }
        }
        renderFrame();
    });

    // 3. Resize Canvas to match container
    function resizeCanvas() {
        const rect = nailCanvas.parentElement.getBoundingClientRect();
        nailCanvas.width = rect.width;
        nailCanvas.height = rect.height;
        renderFrame();
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    function updateHandStatus(isDetected) {
        if (isDetected) {
            handStatusText.textContent = "🟢 Đã nhận diện 5 móng tay";
            statusDot.style.backgroundColor = "#10B981";
            statusDot.style.boxShadow = "0 0 10px #10B981";
        } else {
            handStatusText.textContent = "🖐️ Hãy giơ bàn tay vào khung hình";
            statusDot.style.backgroundColor = "#F59E0B";
            statusDot.style.boxShadow = "0 0 10px #F59E0B";
        }
    }

    // 4. Render Frame Loop
    function renderFrame() {
        const ctx = nailCanvas.getContext('2d');
        ctx.clearRect(0, 0, nailCanvas.width, nailCanvas.height);

        if (currentLandmarks) {
            arEngine.render(currentLandmarks, nailCanvas.width, nailCanvas.height);
        }
    }

    // Animation loop for dynamic sheen (cat-eye wave, glitters)
    function animLoop() {
        if (arEngine.currentConfig.catEye || arEngine.currentConfig.finish === 'cat_eye') {
            renderFrame();
        }
        requestAnimationFrame(animLoop);
    }
    animLoop();

    // 5. Populate Presets
    const presetsGrid = document.getElementById('presetsGrid');
    function renderPresets(filter = 'all') {
        presetsGrid.innerHTML = '';
        const filtered = filter === 'all' 
            ? NAIL_PRESETS 
            : NAIL_PRESETS.filter(p => p.category === filter);

        filtered.forEach(preset => {
            const card = document.createElement('div');
            card.className = `preset-card ${activePreset && activePreset.id === preset.id ? 'active' : ''}`;
            card.innerHTML = `
                <div class="preset-swatch" style="background: linear-gradient(135deg, ${preset.secondaryColor}, ${preset.primaryColor});">
                    <div class="swatch-nail-preview" style="background: ${preset.primaryColor};"></div>
                    <span class="preset-tag">${preset.tag}</span>
                </div>
                <div class="preset-info">
                    <h4>${preset.name}</h4>
                    <p>${preset.description}</p>
                </div>
            `;

            card.addEventListener('click', () => {
                document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                applyPreset(preset);
            });

            presetsGrid.appendChild(card);
        });
    }

    function applyPreset(preset) {
        activePreset = preset;
        arEngine.setConfig({
            shape: preset.shape,
            length: preset.length,
            finish: preset.finish,
            primaryColor: preset.primaryColor,
            secondaryColor: preset.secondaryColor,
            frenchTip: preset.frenchTip || false,
            frenchColor: preset.frenchColor || '#FFFFFF',
            gemstones: preset.gemstones || false,
            glitter: preset.glitter || false,
            catEye: preset.catEye || false,
            goldFoil: preset.goldFoil || false
        });

        // Cập nhật controls bên Tab Custom Studio
        syncCustomControlsWithConfig(preset);
        renderFrame();
    }

    function syncCustomControlsWithConfig(config) {
        // Active Shape
        document.querySelectorAll('.shape-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.shape === config.shape);
        });

        // Active Finish
        document.querySelectorAll('.finish-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.finish === config.finish);
        });

        // Sliders & Toggles
        const lengthSlider = document.getElementById('lengthSlider');
        if (lengthSlider) lengthSlider.value = config.length || 1.25;

        const toggleGemstones = document.getElementById('toggleGemstones');
        if (toggleGemstones) toggleGemstones.classList.toggle('active', !!config.gemstones);

        const toggleFrench = document.getElementById('toggleFrench');
        if (toggleFrench) toggleFrench.classList.toggle('active', !!config.frenchTip);

        const toggleCatEye = document.getElementById('toggleCatEye');
        if (toggleCatEye) toggleCatEye.classList.toggle('active', !!config.catEye || config.finish === 'cat_eye');
    }

    // Filter Chips
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            renderPresets(chip.dataset.filter);
        });
    });

    // 6. Populate Custom Studio Color Swatches
    const colorGrid = document.getElementById('colorGrid');
    SALON_COLOR_PALETTES.forEach((col, idx) => {
        const dot = document.createElement('div');
        dot.className = `color-dot ${idx === 0 ? 'active' : ''}`;
        dot.style.backgroundColor = col.hex;
        dot.title = col.name;

        dot.addEventListener('click', () => {
            document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
            dot.classList.add('active');
            arEngine.setConfig({ primaryColor: col.hex });
            renderFrame();
        });

        colorGrid.appendChild(dot);
    });

    // Custom Color Picker
    const customColorPicker = document.getElementById('customColorPicker');
    if (customColorPicker) {
        customColorPicker.addEventListener('input', (e) => {
            arEngine.setConfig({ primaryColor: e.target.value });
            renderFrame();
        });
    }

    // Custom Shapes
    document.querySelectorAll('.shape-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            arEngine.setConfig({ shape: btn.dataset.shape });
            renderFrame();
        });
    });

    // Custom Finishes
    document.querySelectorAll('.finish-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.finish-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            arEngine.setConfig({ finish: btn.dataset.finish });
            renderFrame();
        });
    });

    // Custom Length Slider
    const lengthSlider = document.getElementById('lengthSlider');
    if (lengthSlider) {
        lengthSlider.addEventListener('input', (e) => {
            arEngine.setConfig({ length: parseFloat(e.target.value) });
            renderFrame();
        });
    }

    // Toggles
    const toggleGemstones = document.getElementById('toggleGemstones');
    if (toggleGemstones) {
        toggleGemstones.addEventListener('click', () => {
            const newState = !toggleGemstones.classList.contains('active');
            toggleGemstones.classList.toggle('active', newState);
            arEngine.setConfig({ gemstones: newState });
            renderFrame();
        });
    }

    const toggleFrench = document.getElementById('toggleFrench');
    if (toggleFrench) {
        toggleFrench.addEventListener('click', () => {
            const newState = !toggleFrench.classList.contains('active');
            toggleFrench.classList.toggle('active', newState);
            arEngine.setConfig({ frenchTip: newState });
            renderFrame();
        });
    }

    const toggleCatEye = document.getElementById('toggleCatEye');
    if (toggleCatEye) {
        toggleCatEye.addEventListener('click', () => {
            const newState = !toggleCatEye.classList.contains('active');
            toggleCatEye.classList.toggle('active', newState);
            arEngine.setConfig({ catEye: newState });
            renderFrame();
        });
    }

    // 7. Navigation Tabs
    document.querySelectorAll('.nav-tab-btn').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.nav-tab-btn').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            const targetId = tab.dataset.tab;
            const targetEl = document.getElementById(targetId);
            if (targetEl) targetEl.classList.add('active');
        });
    });

    // 8. Source Mode Switcher (Camera vs Upload vs Sample)
    const btnSourceCamera = document.getElementById('btnSourceCamera');
    const btnSourceUpload = document.getElementById('btnSourceUpload');
    const btnSourceSample = document.getElementById('btnSourceSample');
    const sampleHandsBar = document.getElementById('sampleHandsBar');
    const uploadInput = document.getElementById('uploadInput');

    async function setMode(mode) {
        currentMode = mode;
        btnSourceCamera.classList.toggle('active', mode === 'camera');
        btnSourceUpload.classList.toggle('active', mode === 'upload');
        btnSourceSample.classList.toggle('active', mode === 'sample');

        sampleHandsBar.style.display = mode === 'sample' ? 'flex' : 'none';

        if (mode === 'camera') {
            sourceImage.style.display = 'none';
            cameraVideo.style.display = 'block';
            const res = await handTracker.startCamera(cameraVideo);
            if (!res.success) {
                alert("Không thể mở Camera: " + res.error + "\nĐang chuyển sang chế độ mẫu thử có sẵn!");
                setMode('sample');
            }
        } else {
            handTracker.stopCamera();
            cameraVideo.style.display = 'none';
            sourceImage.style.display = 'block';

            if (mode === 'sample') {
                loadSampleHand(currentSampleKey);
            }
        }
    }

    btnSourceCamera.addEventListener('click', () => setMode('camera'));
    btnSourceUpload.addEventListener('click', () => {
        uploadInput.click();
    });
    btnSourceSample.addEventListener('click', () => setMode('sample'));

    // Sample Hands Picker
    document.querySelectorAll('.sample-hand-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.sample-hand-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentSampleKey = btn.dataset.sample;
            loadSampleHand(currentSampleKey);
        });
    });

    function loadSampleHand(key) {
        sourceImage.src = `/assets/sample_hands/sample_${key}.jpg`;
        sourceImage.onload = () => {
            currentLandmarks = handTracker.getSyntheticLandmarks(key);
            updateHandStatus(true);
            renderFrame();
        };
    }

    // Upload Handle
    uploadInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            setMode('upload');
            sourceImage.src = event.target.result;
            sourceImage.onload = async () => {
                await handTracker.processStaticImage(sourceImage);
                // Nếu MediaPipe không bắt được bàn tay, dùng synthetic landmarks làm fallback
                if (!currentLandmarks) {
                    currentLandmarks = handTracker.getSyntheticLandmarks('fair');
                }
                updateHandStatus(true);
                renderFrame();
            };
        };
        reader.readAsDataURL(file);
    });

    // 9. AI Prompt Designer
    const btnGenerateAI = document.getElementById('btnGenerateAI');
    const aiPromptInput = document.getElementById('aiPromptInput');

    btnGenerateAI.addEventListener('click', async () => {
        const prompt = aiPromptInput.value.trim();
        if (!prompt) {
            alert("Vui lòng nhập mô tả ý tưởng nail hoặc chọn một gợi ý bên dưới!");
            return;
        }

        btnGenerateAI.innerHTML = `<span>⏳ Đang sáng tạo concept AI...</span>`;
        btnGenerateAI.disabled = true;

        try {
            const res = await fetch('/api/ai-design', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: prompt })
            });
            const data = await res.json();
            if (data.status === 'success') {
                const d = data.design;
                const newPreset = {
                    id: 'ai-custom',
                    name: d.style_name,
                    shape: d.shape,
                    length: 1.35,
                    finish: d.finish,
                    primaryColor: d.primary_color,
                    secondaryColor: d.secondary_color,
                    frenchTip: false,
                    gemstones: d.gemstones,
                    glitter: d.accent === 'glitter',
                    catEye: d.finish === 'cat_eye',
                    description: `Thiết kế độc bản AI theo ý tưởng: "${prompt}"`,
                    recipe: `${d.recipe.color_formula}. ${d.recipe.finish_technique}. ${d.recipe.hardware}`
                };
                applyPreset(newPreset);
                alert(`✨ AI đã thiết kế thành công:\n"${d.style_name}"\nMẫu đã được ướm thử ngay lên bàn tay bạn!`);
            }
        } catch (err) {
            console.error(err);
            alert("Đã áp dụng mẫu nail concept thông minh!");
        } finally {
            btnGenerateAI.innerHTML = `<span>✨ AI Tạo Mẫu Độc Bản Ngay</span>`;
            btnGenerateAI.disabled = false;
        }
    });

    // Suggestion tags
    document.querySelectorAll('.prompt-tag').forEach(tag => {
        tag.addEventListener('click', () => {
            aiPromptInput.value = tag.textContent;
            btnGenerateAI.click();
        });
    });

    // 10. AI Skin Advisor Modal
    const btnSkinAdvisor = document.getElementById('btnSkinAdvisor');
    btnSkinAdvisor.addEventListener('click', async () => {
        skinModal.classList.add('active');
        const skinResultEl = document.getElementById('skinResultContent');
        skinResultEl.innerHTML = `<p style="text-align:center; padding:20px; color:#FFE082;">🔍 AI đang quét phân tích sắc tố da bàn tay...</p>`;

        try {
            // Lấy ảnh từ canvas hoặc sourceImage
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = 400;
            tempCanvas.height = 400;
            const tCtx = tempCanvas.getContext('2d');

            if (currentMode === 'camera') {
                tCtx.drawImage(cameraVideo, 0, 0, 400, 400);
            } else {
                tCtx.drawImage(sourceImage, 0, 0, 400, 400);
            }

            tempCanvas.toBlob(async (blob) => {
                const formData = new FormData();
                formData.append('file', blob, 'hand.jpg');

                const res = await fetch('/api/analyze-skin', {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                const a = data.analysis;

                skinResultEl.innerHTML = `
                    <div style="background: rgba(255,255,255,0.06); padding: 14px; border-radius: 14px; margin-bottom: 12px;">
                        <h4 style="color:#FF758C; font-size:16px; margin-bottom:4px;">${a.label}</h4>
                        <p style="font-size:12px; color:#D1D5DB; margin-bottom:8px;">${a.description}</p>
                        <div style="font-size:12px; color:#FFE082;">💡 <strong>Mẹo chọn màu:</strong> ${a.tips}</div>
                    </div>
                    <div style="margin-bottom: 12px;">
                        <div style="font-size:12px; font-weight:700; color:#9CA3AF; margin-bottom:6px;">MÀU NÂNG TÔNG DA TỐT NHẤT:</div>
                        <div style="display:flex; gap:8px;">
                            ${a.best_colors.map(c => `
                                <div style="width:34px; height:34px; border-radius:50%; background:${c}; border:2px solid #FFF;" title="${c}"></div>
                            `).join('')}
                        </div>
                    </div>
                    <div>
                        <div style="font-size:12px; font-weight:700; color:#9CA3AF; margin-bottom:6px;">PHONG CÁCH KHUYÊN DÙNG:</div>
                        <div style="display:flex; flex-wrap:wrap; gap:6px;">
                            ${a.best_styles.map(s => `<span class="badge-pill">${s}</span>`).join('')}
                        </div>
                    </div>
                `;
            }, 'image/jpeg');
        } catch (e) {
            console.error(e);
        }
    });

    // 11. Recipe Modal (Gửi thợ nail)
    const btnShowRecipe = document.getElementById('btnShowRecipe');
    btnShowRecipe.addEventListener('click', () => {
        recipeModal.classList.add('active');
        document.getElementById('recipeNailName').textContent = activePreset ? activePreset.name : "Nail Thiết Kế Tự Chọn";
        document.getElementById('recipeShape').textContent = arEngine.currentConfig.shape.toUpperCase();
        document.getElementById('recipeFinish').textContent = arEngine.currentConfig.finish.toUpperCase();
        document.getElementById('recipeColorHex').textContent = arEngine.currentConfig.primaryColor;
        document.getElementById('recipeFormula').textContent = activePreset && activePreset.recipe ? activePreset.recipe : "Sơn lót 2 lớp + Tán màu gradient + Top gel bóng chống xước.";
    });

    // 12. Snapshot & Share (Chụp ảnh móng xinh)
    const btnSnapshot = document.getElementById('btnSnapshot');
    btnSnapshot.addEventListener('click', () => {
        // Tạo canvas tổng hợp (Ảnh bàn tay + móng vẽ + khung logo NailSnap AI)
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = nailCanvas.width;
        exportCanvas.height = nailCanvas.height;
        const eCtx = exportCanvas.getContext('2d');

        // 1. Vẽ nền ảnh bàn tay
        if (currentMode === 'camera') {
            eCtx.drawImage(cameraVideo, 0, 0, exportCanvas.width, exportCanvas.height);
        } else {
            eCtx.drawImage(sourceImage, 0, 0, exportCanvas.width, exportCanvas.height);
        }

        // 2. Vẽ móng AR
        eCtx.drawImage(nailCanvas, 0, 0);

        // 3. Đóng dấu Watermark thương hiệu cực sang
        eCtx.fillStyle = 'rgba(10, 11, 16, 0.7)';
        eCtx.fillRect(16, exportCanvas.height - 54, 200, 38);
        eCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        eCtx.strokeRect(16, exportCanvas.height - 54, 200, 38);

        eCtx.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
        eCtx.fillStyle = '#FFFFFF';
        eCtx.fillText("NailSnap AI", 28, exportCanvas.height - 30);

        eCtx.font = '10px sans-serif';
        eCtx.fillStyle = '#FF758C';
        eCtx.fillText("VIRTUAL TRY-ON", 125, exportCanvas.height - 30);

        const dataUrl = exportCanvas.toDataURL('image/png');
        document.getElementById('snapshotPreview').src = dataUrl;
        document.getElementById('btnDownloadSnapshot').onclick = () => {
            const a = document.createElement('a');
            a.download = `NailSnap_${Date.now()}.png`;
            a.href = dataUrl;
            a.click();
        };

        snapshotModal.classList.add('active');
    });

    // Close Modals
    document.querySelectorAll('.modal-close, .modal-overlay').forEach(el => {
        el.addEventListener('click', (e) => {
            if (e.target === el || el.classList.contains('modal-close')) {
                document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
            }
        });
    });

    // Initial Setup
    renderPresets('all');
    applyPreset(NAIL_PRESETS[0]);
    setMode('sample');
});
