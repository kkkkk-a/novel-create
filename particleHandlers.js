// particleHandlers.js (Enhanced: Effects Manager)

import * as state from './state.js';
import * as ui from './ui.js'; 

let currentParticleId = null;
let currentSearch = '';

// プレビュー用変数
let previewCtx = null;
let previewParticles = [];
let animationId = null;

const MAX_PREVIEW_PARTICLES = 1500;

export function initParticleHandlers() {
    // ボタンイベント
    const createBtn = document.getElementById('create-particle-btn');
    if (createBtn) createBtn.addEventListener('click', createParticle);
    
    const deleteBtn = document.getElementById('delete-particle-btn');
    if (deleteBtn) deleteBtn.addEventListener('click', deleteParticle);
    
    const backBtn = document.getElementById('particle-back-to-list-btn');
    if (backBtn) backBtn.addEventListener('click', deselectParticle);

    // 検索機能
    const searchInput = document.getElementById('particle-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearch = e.target.value.toLowerCase();
            renderParticleList();
        });
    }
    
    // 入力同期 (パーティクル)
    const pInputs = [
        'particle-name', 'particle-color', 'particle-shape',
        'particle-size', 'particle-count',
        'particle-speed', 'particle-gravity', 'particle-decay', 'particle-bounce',
        'particle-spawn-type', 'particle-angle', 'particle-area-width'
    ];
    pInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const eventType = (el.tagName === 'SELECT' || el.type === 'color') ? 'change' : 'input';
            el.addEventListener(eventType, syncParticleData);
        }
    });

    // 入力同期 (フィルター)
    const fInputs = [
        'filter-preset', 'filter-css', 
        'filter-overlay-color', 'filter-overlay-opacity', 'filter-blend-mode',
        'filter-exclude-ui' 
    ];
    fInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(el.tagName === 'INPUT' && el.type === 'text' ? 'input' : 'change', syncFilterData);
    });

    // タイプ切り替え
    const typeSelector = document.getElementById('particle-type-selector');
    if (typeSelector) {
        typeSelector.addEventListener('change', (e) => {
            toggleSettingsVisibility(e.target.value);
            syncParticleData(); // データ更新
        });
    }

    const listContainer = document.getElementById('particle-list-container');
    if (listContainer) {
        listContainer.addEventListener('click', (e) => {
            const row = e.target.closest('.particle-list-row');
            if (row) selectParticle(row.dataset.id);
        });
    }

    // プレビューキャンバスの初期化
    const canvas = document.getElementById('particle-preview-canvas');
    if (canvas) {
        previewCtx = canvas.getContext('2d');
        canvas.addEventListener('mousedown', () => {
            const type = document.getElementById('particle-type-selector').value;
            if (type === 'particle') spawnPreviewParticle(true);
        });
        startPreviewLoop();
    }

    const testBtn = document.getElementById('test-particle-btn');
    if (testBtn) {
        testBtn.addEventListener('click', () => {
            const type = document.getElementById('particle-type-selector').value;
            if (type === 'particle') spawnPreviewParticle(true);
        });
    }
}

function toggleSettingsVisibility(type) {
    const pGroup = document.getElementById('settings-particle-group');
    const fGroup = document.getElementById('settings-filter-group');
    const previewCanvas = document.getElementById('particle-preview-canvas');
    const previewImg = document.getElementById('filter-preview-img');
    const overlayLayer = document.getElementById('preview-overlay-layer');

    if (type === 'filter') {
        pGroup.style.display = 'none';
        fGroup.style.display = 'block';
        previewCanvas.style.display = 'none';
        previewImg.style.display = 'inline-block'; // フィルター確認用の画像を表示
        overlayLayer.style.display = 'block';
    } else {
        pGroup.style.display = 'grid';
        fGroup.style.display = 'none';
        previewCanvas.style.display = 'block';
        previewImg.style.display = 'none';
        // パーティクル時はオーバーレイを隠して見やすくする
        overlayLayer.style.display = 'none'; 
    }
}

// --- プレビュー用エンジン ---

function startPreviewLoop() {
    if (animationId) cancelAnimationFrame(animationId);
    
    const loop = () => {
        // --- 1. フィルタープレビュー ---
        const type = document.getElementById('particle-type-selector')?.value;
        const overlayLayer = document.getElementById('preview-overlay-layer');
        const previewImg = document.getElementById('filter-preview-img');

        if (type === 'filter') {
            // CSSフィルター適用
            const css = document.getElementById('filter-css').value;
            previewImg.style.filter = css;

            // オーバーレイ適用
            const col = document.getElementById('filter-overlay-color').value;
            const op = document.getElementById('filter-overlay-opacity').value;
            const blend = document.getElementById('filter-blend-mode').value;
            const preset = document.getElementById('filter-preset').value;

            // 基本オーバーレイ
            overlayLayer.style.backgroundColor = col;
            overlayLayer.style.opacity = op;
            overlayLayer.style.mixBlendMode = blend;
            overlayLayer.style.backgroundImage = 'none'; // リセット

            // プリセットごとの特殊効果 (CSSグラデーションで再現)
            if (preset === 'crt') {
                // 走査線
                overlayLayer.style.opacity = 1.0;
                overlayLayer.style.background = `linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))`;
                overlayLayer.style.backgroundSize = "100% 2px, 2px 100%";
                overlayLayer.style.mixBlendMode = "hard-light";
                previewImg.style.filter = "contrast(1.1) brightness(1.1) blur(0.5px)";
            } 
            else if (preset === 'darkness') {
                // 周辺減光 (Vignette)
                overlayLayer.style.opacity = 1.0;
                overlayLayer.style.background = `radial-gradient(circle, transparent 40%, #000 100%)`;
                overlayLayer.style.mixBlendMode = "multiply";
            }
            else if (preset === 'retro') {
                // セピアノイズ風
                overlayLayer.style.opacity = 0.3;
                overlayLayer.style.backgroundColor = "#704214"; // 茶色
                overlayLayer.style.mixBlendMode = "overlay";
            }
        }

        // --- 2. パーティクルプレビュー ---
        if (previewCtx && type === 'particle') {
            const canvas = previewCtx.canvas;
            const width = canvas.width;
            const height = canvas.height;

            previewCtx.clearRect(0, 0, width, height);
            
            const spawnType = document.getElementById('particle-spawn-type')?.value;
            if (spawnType === 'weather') {
                spawnPreviewParticle(false, 0.2); 
            }

            for (let i = previewParticles.length - 1; i >= 0; i--) {
                const p = previewParticles[i];
                p.life -= p.decay;
                
                const margin = Math.max(width, height); 
                const isOut = (p.x < -margin || p.x > width + margin || p.y < -margin || p.y > height + margin);

                if (p.life <= 0 || isOut) {
                    previewParticles.splice(i, 1);
                    continue;
                }
                
                p.x += p.vx;
                p.y += p.vy;
                p.vy += p.gravity; 
                
                if (p.y > height - 5) {
                    if (p.bounce > 0) {
                        p.y = height - 5;
                        p.vy *= -p.bounce;
                        p.vx *= 0.8;
                    } else if (spawnType === 'weather') {
                        previewParticles.splice(i, 1);
                        continue;
                    }
                }

                previewCtx.globalAlpha = Math.max(0, Math.min(1, p.life));
                previewCtx.fillStyle = p.color;
                
                if (p.shape === 'circle') {
                    previewCtx.beginPath();
                    previewCtx.arc(p.x, p.y, p.size/2, 0, Math.PI*2);
                    previewCtx.fill();
                } else {
                    previewCtx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
                }
            }
            
            // カウント表示
            previewCtx.globalAlpha = 1.0;
            previewCtx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            previewCtx.fillRect(0, 0, 130, 24);
            const count = previewParticles.length;
            previewCtx.font = '12px sans-serif';
            previewCtx.textBaseline = 'middle';
            previewCtx.fillStyle = (count >= MAX_PREVIEW_PARTICLES) ? '#ff4d4f' : '#ffffff';
            previewCtx.fillText(`Count: ${count} / ${MAX_PREVIEW_PARTICLES}`, 10, 12);
        }

        animationId = requestAnimationFrame(loop);
    };
    loop();
}

function spawnPreviewParticle(forceBurst = false, rateMultiplier = 1.0) {
    if (!previewCtx) return;
    if (previewParticles.length >= MAX_PREVIEW_PARTICLES) return;
    
    const color = document.getElementById('particle-color').value;
    const shape = document.getElementById('particle-shape').value;
    const sizeBase = parseFloat(document.getElementById('particle-size').value) || 4;
    let count = parseInt(document.getElementById('particle-count').value) || 10;
    
    const speedBase = parseFloat(document.getElementById('particle-speed').value) || 5;
    const gravity = parseFloat(document.getElementById('particle-gravity').value) || 0.5;
    const decayBase = parseFloat(document.getElementById('particle-decay').value) || 0.03;
    const bounce = parseFloat(document.getElementById('particle-bounce').value) || 0;

    const spawnType = document.getElementById('particle-spawn-type').value;
    const angleBase = parseFloat(document.getElementById('particle-angle').value) || 0; 
    const areaWidth = parseFloat(document.getElementById('particle-area-width').value) || 0;

    const canvas = previewCtx.canvas;
    const isWeather = (spawnType === 'weather');

    if (isWeather && !forceBurst) {
        const rawCount = count * rateMultiplier;
        const integerPart = Math.floor(rawCount);
        const fractionalPart = rawCount - integerPart;
        count = integerPart + (Math.random() < fractionalPart ? 1 : 0);
        if (count <= 0) return;
    }

    const rad = angleBase * (Math.PI / 180);
    const moveX = Math.cos(rad);
    const moveY = Math.sin(rad);

    for (let i = 0; i < count; i++) {
        if (previewParticles.length >= MAX_PREVIEW_PARTICLES) break;

        let startX, startY;
        let vx, vy;

        if (isWeather) {
            const w = canvas.width;
            const h = canvas.height;
            const diag = Math.sqrt(w*w + h*h);
            const spreadW = (areaWidth > 0) ? areaWidth : (diag * 1.2);
            const spread = (Math.random() - 0.5) * spreadW;
            const cx = w / 2;
            const cy = h / 2;
            const spawnDist = diag * 0.6;
            
            startX = cx - (moveX * spawnDist) + (-moveY * spread);
            startY = cy - (moveY * spawnDist) + (moveX * spread);

            const speed = speedBase * (Math.random() * 0.5 + 0.8);
            const angleSpread = (Math.random() - 0.5) * 0.2; 
            const finalRad = rad + angleSpread;
            vx = Math.cos(finalRad) * speed;
            vy = Math.sin(finalRad) * speed;

        } else {
            const range = areaWidth > 0 ? areaWidth : 0;
            startX = canvas.width / 2 + (Math.random() - 0.5) * range;
            startY = canvas.height / 2 + (Math.random() - 0.5) * range;

            const speed = Math.random() * speedBase + 1;
            const angleSpread = (Math.random() - 0.5) * 0.2;
            const finalRad = rad + angleSpread;
            
            vx = Math.cos(finalRad) * speed;
            vy = Math.sin(finalRad) * speed;

            if (!isWeather) {
                const jump = (Math.random() * 4) + 2;
                vy -= jump;
            }
        }

        const lifeDecay = isWeather ? (decayBase * 0.2) : decayBase * (Math.random() * 0.5 + 0.8);

        previewParticles.push({
            x: startX, y: startY, vx: vx, vy: vy,
            gravity: gravity, decay: lifeDecay, bounce: bounce,
            color: color, shape: shape, size: sizeBase * (Math.random() * 0.5 + 0.8),
            life: 1.0
        });
    }
}

// --- CRUD ---


function createParticle() {
    // ★変更: state.jsの共通ID生成関数を使用する
    const id = state.generateId('fx');
    const projectData = state.getProjectData();
    if (!projectData.particles) projectData.particles = {};

    projectData.particles[id] = {
        name: '新規エフェクト',
        type: 'particle', // デフォルトはパーティクル
        // Particle Defaults
        color: '#ffcc00', shape: 'square', size: 4, count: 10,
        speed: 5, gravity: 0.5, decay: 0.03, bounce: 0.6,
        spawnType: 'burst', angle: -90, areaWidth: 0,
        // Filter Defaults
        cssFilter: '', overlayColor: '#000000', overlayOpacity: 0, blendMode: 'normal'
    };

    currentSearch = '';
    const searchInput = document.getElementById('particle-search-input');
    if (searchInput) searchInput.value = '';

    renderParticleList();
    selectParticle(id);
}

function deleteParticle() {
    if (!currentParticleId) return;
    if (confirm('このエフェクト設定を削除しますか？')) {
        const projectData = state.getProjectData();
        delete projectData.particles[currentParticleId];
        deselectParticle();
    }
}

function selectParticle(id) {
    currentParticleId = id;
    const projectData = state.getProjectData();
    const p = projectData.particles[id];
    if (!p) return;

    const wrapper = document.getElementById('particle-manager-wrapper');
    if (wrapper) wrapper.classList.add('mobile-active-editor');

    document.getElementById('particle-editor-form').style.display = 'block';
    document.getElementById('particle-editor-placeholder').style.display = 'none';

    document.getElementById('particle-id').value = id;
    document.getElementById('particle-name').value = p.name || '';
    
    // タイプ設定
    const typeSel = document.getElementById('particle-type-selector');
    if (typeSel) typeSel.value = p.type || 'particle';
    
    toggleSettingsVisibility(p.type || 'particle');

    // パーティクル値
    document.getElementById('particle-color').value = p.color || '#ffffff';
    document.getElementById('particle-shape').value = p.shape || 'square';
    document.getElementById('particle-size').value = p.size || 4;
    document.getElementById('particle-count').value = p.count || 10;
    document.getElementById('particle-speed').value = p.speed || 5;
    document.getElementById('particle-gravity').value = p.gravity !== undefined ? p.gravity : 0.5;
    document.getElementById('particle-decay').value = p.decay || 0.03;
    document.getElementById('particle-bounce').value = p.bounce !== undefined ? p.bounce : 0.6;
    document.getElementById('particle-spawn-type').value = p.spawnType || 'burst';
    document.getElementById('particle-angle').value = (p.angle !== undefined) ? p.angle : -90;
    document.getElementById('particle-area-width').value = p.areaWidth || 0;

    // フィルター値
    document.getElementById('filter-css').value = p.cssFilter || '';
    document.getElementById('filter-overlay-color').value = p.overlayColor || '#000000';
    document.getElementById('filter-overlay-opacity').value = p.overlayOpacity || 0;
    document.getElementById('filter-blend-mode').value = p.blendMode || 'normal';
    document.getElementById('filter-preset').value = 'custom';
    document.getElementById('filter-exclude-ui').checked = !!p.excludeUI;

    previewParticles = [];
    if (p.type !== 'filter') {
        setTimeout(() => spawnPreviewParticle(true), 100);
    }

    renderParticleList();
}

function deselectParticle() {
    currentParticleId = null;
    const wrapper = document.getElementById('particle-manager-wrapper');
    if (wrapper) wrapper.classList.remove('mobile-active-editor');

    document.getElementById('particle-editor-form').style.display = 'none';
    document.getElementById('particle-editor-placeholder').style.display = 'block';
    
    previewParticles = [];
    renderParticleList();
}

function syncParticleData() {
    if (!currentParticleId) return;
    const projectData = state.getProjectData();
    const p = projectData.particles[currentParticleId];

    p.name = document.getElementById('particle-name').value;
    p.type = document.getElementById('particle-type-selector').value;

    if (p.type === 'particle') {
        p.color = document.getElementById('particle-color').value;
        p.shape = document.getElementById('particle-shape').value;
        p.size = parseFloat(document.getElementById('particle-size').value) || 1;
        p.count = parseInt(document.getElementById('particle-count').value) || 1;
        p.speed = parseFloat(document.getElementById('particle-speed').value) || 0;
        p.gravity = parseFloat(document.getElementById('particle-gravity').value) || 0;
        p.decay = parseFloat(document.getElementById('particle-decay').value) || 0.01;
        p.bounce = parseFloat(document.getElementById('particle-bounce').value) || 0;
        p.spawnType = document.getElementById('particle-spawn-type').value;
        p.angle = parseFloat(document.getElementById('particle-angle').value) || 0;
        p.areaWidth = parseFloat(document.getElementById('particle-area-width').value) || 0;
    }

    renderParticleList();
    if (p.type === 'particle' && p.spawnType !== 'weather') {
        spawnPreviewParticle(true);
    }
}

function syncFilterData() {
    if (!currentParticleId) return;
    const projectData = state.getProjectData();
    const p = projectData.particles[currentParticleId];
    
    // プリセット適用ロジック
    const preset = document.getElementById('filter-preset').value;
    
    if (preset === 'crt') {
        document.getElementById('filter-css').value = 'contrast(1.1) brightness(1.1) blur(0.5px)';
        document.getElementById('filter-overlay-color').value = '#000000';
        document.getElementById('filter-overlay-opacity').value = 0.1;
        document.getElementById('filter-blend-mode').value = 'hard-light';
    } else if (preset === 'retro') {
        document.getElementById('filter-css').value = 'sepia(0.8) contrast(1.2) brightness(0.9)';
        document.getElementById('filter-overlay-color').value = '#704214';
        document.getElementById('filter-overlay-opacity').value = 0.2;
        document.getElementById('filter-blend-mode').value = 'overlay';
    } else if (preset === 'darkness') {
        document.getElementById('filter-css').value = 'brightness(0.6) contrast(1.2)';
        document.getElementById('filter-overlay-color').value = '#000000';
        document.getElementById('filter-overlay-opacity').value = 1.0; // VignetteはCSSグラデで表現するが、一旦最大値に
        document.getElementById('filter-blend-mode').value = 'multiply';
    } else if (preset === 'invert') {
        document.getElementById('filter-css').value = 'invert(100%)';
        document.getElementById('filter-overlay-opacity').value = 0;
    } else if (preset === 'underwater') {
        document.getElementById('filter-css').value = 'blur(1px) brightness(0.9)';
        document.getElementById('filter-overlay-color').value = '#004488';
        document.getElementById('filter-overlay-opacity').value = 0.4;
        document.getElementById('filter-blend-mode').value = 'multiply';
    } else if (preset === 'nightvision') {
        document.getElementById('filter-css').value = 'grayscale(100%) contrast(1.5) brightness(1.2) sepia(1) hue-rotate(90deg)';
        document.getElementById('filter-overlay-color').value = '#00ff00';
        document.getElementById('filter-overlay-opacity').value = 0.1;
        document.getElementById('filter-blend-mode').value = 'overlay';
    }

    // 値をオブジェクトに保存
    p.cssFilter = document.getElementById('filter-css').value;
    p.overlayColor = document.getElementById('filter-overlay-color').value;
    p.overlayOpacity = parseFloat(document.getElementById('filter-overlay-opacity').value) || 0;
    p.blendMode = document.getElementById('filter-blend-mode').value;
    p.preset = preset; // プリセット名も保存(次回ロード時の再現には使わないが参考に)
    p.excludeUI = document.getElementById('filter-exclude-ui').checked;

    // プリセット選択状態を「カスタム」に戻す（値を変えたあとだと混乱するため）
    if (preset !== 'custom') {
        // UI更新のために少し遅らせるなどしても良いが、ここでは単純に値をセットするだけに留める
    }
}

export function renderParticleList() {
    const container = document.getElementById('particle-list-container');
    if (!container) return;
    
    const projectData = state.getProjectData();
    if (!projectData.particles) projectData.particles = {};
    container.innerHTML = '';

    Object.keys(projectData.particles).forEach(id => {
        const p = projectData.particles[id];
        if (currentSearch && !p.name.toLowerCase().includes(currentSearch)) return;

        const div = document.createElement('div');
        div.className = 'particle-list-row';
        div.dataset.id = id;
        
        let icon = '✨';
        let colorBoxStyle = `background:${p.color};`;
        
        if (p.type === 'filter') {
            icon = '🎨';
            colorBoxStyle = `background:linear-gradient(135deg, #ccc, #333);`; // フィルターっぽいアイコン
        } else if (p.spawnType === 'weather') {
            icon = '☔';
        } else {
            icon = '💥';
        }
        
        const colorBox = `<div style="width:16px; height:16px; ${colorBoxStyle} border:1px solid #ccc; display:inline-block; vertical-align:middle; margin-right:5px; border-radius:2px;"></div>`;

        div.innerHTML = `${colorBox}<span style="font-size:0.9em;">${icon} <b>${p.name}</b></span>`;
        div.style.cssText = 'padding:10px; border-bottom:1px solid #eee; cursor:pointer; display:flex; align-items:center;';
        
        if (id === currentParticleId) div.style.backgroundColor = '#e6f7ff';
        container.appendChild(div);
    });
    
    if (typeof ui.updateParticleSelects === 'function') {
        ui.updateParticleSelects();
    }
}