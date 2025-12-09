// export.js

import { getProjectData } from './state.js';

export function generateGameHtml(data, startNodeOverride = null) {
    const dataString = JSON.stringify(data);
    const initialNodeId = startNodeOverride || data.scenario.startNodeId;
    
    // UI設定の読み込み (なければデフォルト)
    const s = data.settings || {
        windowColor: '#000000', windowOpacity: 75, windowBgTransparent: false, windowImage: null,
        textColor: '#ffffff',
        buttonColor: '#1990ff', buttonOpacity: 80, buttonBgTransparent: false, buttonImage: null,
        borderRadius: 10
    };

    // RGBA色を生成するヘルパー
    const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0, 0, 0';
    };

    // ウィンドウ背景のCSSを決定
    let windowBgStyle = `background-color: transparent;`;
    if (s.windowImage) {
        windowBgStyle = `background-image: url('${s.windowImage}'); background-color: transparent; border: none;`;
    } else if (!s.windowBgTransparent) {
        windowBgStyle = `background-color: rgba(${hexToRgb(s.windowColor)}, ${s.windowOpacity / 100});`;
    }
    
    // ボタン背景のCSSを決定
    let buttonBgStyle = `background-color: transparent;`;
    if (s.buttonImage) {
        buttonBgStyle = `background-image: url('${s.buttonImage}'); background-color: transparent; border: none; color: ${s.textColor};`;
    } else if (!s.buttonBgTransparent) {
        buttonBgStyle = `background-color: rgba(${hexToRgb(s.buttonColor)}, ${s.buttonOpacity / 100}); color: ${s.textColor};`;
    } else {
        buttonBgStyle = `background-color: transparent; color: ${s.textColor}; border: 1px solid ${s.textColor};`;
    }
    const borderStyle = `${s.borderWidth}px solid ${s.borderColor}`;
    
    // 画像が設定されている場合はボーダーを消す
    const windowBorderStyle = s.windowImage ? 'border: none;' : `border: ${borderStyle};`;
    const buttonBorderStyle = s.buttonImage ? 'border: none;' : `border: ${borderStyle};`;

    const windowBackdropFilter = s.windowBgTransparent ? '' : 'backdrop-filter: blur(2px);';
    const buttonBackdropFilter = s.buttonBgTransparent ? '' : 'backdrop-filter: blur(5px);';
    return `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Novel Game</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DotGothic16&family=Klee+One&family=M+PLUS+Rounded+1c:wght@400;700&family=Shippori+Mincho&display=swap" rel="stylesheet">
    <style>
        body { margin: 0; font-family: sans-serif; background-color: #000; display: flex; justify-content: center; align-items: center; height: 100vh; overflow: hidden; touch-action: none; user-select: none; -webkit-user-select: none; }
        p{ margin:0; }
        #game-container { position: relative; width: 800px; height: 600px; max-width: 100%; max-height: 100vh; overflow: hidden; background-color: #000; box-shadow: 0 0 20px rgba(255, 255, 255, 0.2); }
        .layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; transition: opacity 0.5s ease-in-out; background-size: cover; background-position: center; background-repeat: no-repeat; pointer-events: none; }
        #character-layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; display: block; z-index: 10; }
        .sprite-char { position: absolute; width: auto; height: 95%; background-repeat: no-repeat; background-position: center bottom; background-size: contain; image-rendering: pixelated; opacity: 0; transition: opacity 0.3s, transform 0.3s; transform-origin: bottom center; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; -webkit-mask-position: center bottom; mask-position: center bottom; -webkit-mask-size: contain; mask-size: contain; }
        .sprite-char.loaded { opacity: 1; }
        .pos-bottom-left   { bottom: 0; left: 15%; } .pos-bottom-center { bottom: 0; left: 50%; } .pos-bottom-right  { bottom: 0; left: 85%; }
        .pos-center-left   { bottom: 0; left: 15%; } .pos-center        { bottom: 0; left: 50%; } .pos-center-right  { bottom: 0; left: 85%; }
        .pos-top-left      { top: 0; left: 15%; transform-origin: top center; background-position: center top; -webkit-mask-position: center top; mask-position: center top; }
        .pos-top-center    { top: 0; left: 50%; transform-origin: top center; background-position: center top; -webkit-mask-position: center top; mask-position: center top; }
        .pos-top-right     { top: 0; left: 85%; transform-origin: top center; background-position: center top; -webkit-mask-position: center top; mask-position: center top; }
        
        #text-box { 
            position: absolute; bottom: 4%; left: 5%; width: 90%; height: auto; min-height: 30%; max-height: 50%;
            ${windowBgStyle}
            background-size: 100% 100%;
            color: #ffffff;
            border-radius: ${s.borderRadius}px; 
            padding: 20px; box-sizing: border-box; 
            ${windowBorderStyle}
            ${windowBackdropFilter}
            user-select: none; pointer-events: auto; display: block; z-index: 20; 
        }
        #character-name { font-size: 1.4em; font-weight: 700; margin: 0 0 10px; padding-bottom: 5px; border-bottom: 1px solid rgba(255,255,255,0.3); color: #ffffff; min-height: 1em; }
        #message { font-size: 1.2em; line-height: 1.6; max-height: 150px; overflow-y: auto; }
        
        .ql-font-dotgothic { font-family: "DotGothic16", sans-serif; } .ql-font-rounded { font-family: "M PLUS Rounded 1c", sans-serif; } .ql-font-klee { font-family: "Klee One", cursive; } .ql-font-mincho-b { font-family: "Shippori Mincho", serif; } .ql-font-serif { font-family: "Meryo", serif; } .ql-font-monospace { font-family: "Courier New", monospace; }
        #message .ql-size-small { font-size: 0.8em !important; } #message .ql-size-large { font-size: 1.4em !important; } #message .ql-size-huge { font-size: 1.8em !important; }
        
        #choices-box { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); display: flex; flex-direction: column; gap: 15px; z-index: 30; width: 80%; max-height: 80%; overflow-y: auto; pointer-events: auto; }
        .choice-button { 
            padding: 15px 30px; font-size: 1.2em; cursor: pointer; 
            ${buttonBgStyle}
            background-size: 100% 100%;
            border-radius: ${s.borderRadius}px; 
            ${buttonBorderStyle}
            text-align: center; transition: all 0.3s; 
            ${buttonBackdropFilter}
        }
        .choice-button:hover { transform: scale(1.02); filter: brightness(1.2); }

        #click-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 10; cursor: pointer; display: none; }
        #effect-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 100; opacity: 0; }
        @keyframes flash-white { 0% { background: white; opacity: 1; } 100% { opacity: 0; } } @keyframes flash-red   { 0% { background: red; opacity: 0.5; } 100% { opacity: 0; } } @keyframes fade-black  { 0% { background: black; opacity: 1; } 100% { opacity: 0; } }
        .fx-flash-white { animation: flash-white 0.3s ease-out; } .fx-flash-red   { animation: flash-red 0.3s ease-out; } .fx-fade-black  { animation: fade-black 1.0s ease-in; }
        @keyframes shake-s { 0%,100% {transform:translate(0,0)} 25% {transform:translate(-2px,2px)} 75% {transform:translate(2px,-2px)} } @keyframes shake-m { 0%,100% {transform:translate(0,0)} 20% {transform:translate(-5px,5px)} 60% {transform:translate(5px,-5px)} } @keyframes shake-h { 0%,100% {transform:translate(0,0)} 10% {transform:translate(-10px,10px)} 50% {transform:translate(10px,-10px)} 90% {transform:translate(-5px,5px)} }
        .fx-shake-small  { animation: shake-s 0.2s ease-in-out infinite; } .fx-shake-medium { animation: shake-m 0.3s ease-in-out infinite; } .fx-shake-hard   { animation: shake-h 0.1s ease-in-out infinite; }
        #map-layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 5; display: none; background: #222; } #map-canvas { display: block; width: 100%; height: 100%; image-rendering: pixelated; } #map-controls { position: absolute; bottom: 20px; left: 20px; z-index: 50; display: none; grid-template-columns: 60px 60px 60px; grid-template-rows: 60px 60px; gap: 10px; } #map-action-btn { position: absolute; bottom: 30px; right: 30px; z-index: 50; width: 80px; height: 80px; border-radius: 50%; background: rgba(255, 255, 255, 0.3); border: 2px solid #fff; color: #fff; font-weight: bold; font-size: 1.2em; display: none; justify-content: center; align-items: center; user-select: none; cursor: pointer; } .pad-btn { width: 60px; height: 60px; background: rgba(255, 255, 255, 0.2); border: 1px solid #fff; border-radius: 10px; display: flex; justify-content: center; align-items: center; color: #fff; font-size: 1.5em; user-select: none; cursor: pointer; } #map-controls.active { display: grid; } #map-action-btn.active { display: flex; } .pad-btn:active, #map-action-btn:active { background: rgba(255, 255, 255, 0.5); } .pad-up { grid-column: 2; grid-row: 1; } .pad-left { grid-column: 1; grid-row: 2; } .pad-down { grid-column: 2; grid-row: 2; } .pad-right { grid-column: 3; grid-row: 2; }
        #system-menu { position: absolute; top: 10px; right: 10px; z-index: 200; display: flex; gap: 5px; } .sys-btn { background: rgba(0,0,0,0.5); border: 1px solid #aaa; color: #eee; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; } .sys-btn:hover { background: rgba(255,255,255,0.2); } .sys-btn.active { background: rgba(255, 255, 0, 0.6); color: black; border-color: yellow; } .sys-btn.danger { background: rgba(200,50,50,0.5); border-color: #f88; } .sys-btn.danger:hover { background: rgba(255,50,50,0.6); }
        #backlog-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 300; display: none; flex-direction: column; padding: 40px; box-sizing: border-box; color: #fff; } #backlog-content { flex: 1; overflow-y: auto; margin-bottom: 20px; padding-right: 10px; scrollbar-width: thin; scrollbar-color: #555 #222; } .log-entry { margin-bottom: 20px; border-bottom: 1px solid #444; padding-bottom: 15px; display: flex; flex-direction: column; } .log-name { font-weight: bold; color: #f1c40f; margin-bottom: 5px; font-size: 0.9em; } .log-text { font-size: 1.1em; line-height: 1.6; color: #eee; } .log-choice { text-align: center; color: #40a9ff; font-weight: bold; background: rgba(64, 169, 255, 0.1); padding: 10px; border-radius: 8px; border: 1px dashed #40a9ff; } #backlog-close { align-self: center; padding: 10px 40px; font-size: 1.2em; cursor: pointer; background: #fff; color: #000; border: none; border-radius: 20px; }
    </style>
</head>
<body>
    <div id="game-container">
        <div id="system-menu">
            <button class="sys-btn" onclick="toggleBacklog()">LOG</button>
            <button id="btn-auto" class="sys-btn" onclick="toggleAuto()">AUTO</button>
            <button id="btn-skip" class="sys-btn" onclick="toggleSkip()">SKIP</button>
            <button class="sys-btn" onclick="saveGame()">SAVE</button>
            <button class="sys-btn" onclick="loadGame()">LOAD</button>
            <button class="sys-btn danger" onclick="deleteSave()">RESET</button>
        </div>

        <div id="backlog-overlay">
            <div id="backlog-content"></div>
            <button id="backlog-close" onclick="toggleBacklog()">閉じる</button>
        </div>

        <div id="background-layer-1" class="layer"></div>
        <div id="background-layer-2" class="layer" style="opacity:0;"></div>
        <div id="character-layer"></div>
        <div id="effect-overlay"></div>
        
        <div id="map-layer">
            <canvas id="map-canvas"></canvas>
            <div id="map-controls">
                <div class="pad-btn pad-up" data-key="ArrowUp">↑</div>
                <div class="pad-btn pad-left" data-key="ArrowLeft">←</div>
                <div class="pad-btn pad-down" data-key="ArrowDown">↓</div>
                <div class="pad-btn pad-right" data-key="ArrowRight">→</div>
            </div>
            <div id="map-action-btn" data-key="Space">ACT</div>
        </div>

        <div id="click-overlay"></div>
        <div id="text-box"><div id="character-name"></div><div id="message"></div></div>
        <div id="choices-box"></div>
    </div>

    <script>
        const gameData = ${dataString};
        let gameState = { ...gameData.variables };
        
        let currentNodeId = "${initialNodeId}";
        let currentPlayingNodeId = "${initialNodeId}"; 
        let isWaitingForInput = true;
        let isMapMode = false;
        
        let currentBgmAudio = null;
        let currentBgmId = null;
        let queuedSound = null;
        let hasInteracted = false;

        let backLog = [];
        let isAuto = false;
        let isSkip = false;
        let autoTimer = null;
        
        const mapEngine = {
            canvas: document.getElementById('map-canvas'),
            ctx: document.getElementById('map-canvas').getContext('2d'),
            data: null, currentMapId: null, bgImage: null, bgScrollY: 0,
            player: { x: 0, y: 0, w: 32, h: 32, speed: 4, vx: 0, vy: 0, onGround: false, isClimbing: false, gravity: 0.6, jumpPower: -12 },
            camera: { x: 0, y: 0 }, keys: {}, GRID: 32, activeObjects: [] 
        };

        let lastTime = performance.now(); 
        const animState = { bg: { id: null, frame: 0, timer: 0, element: null }, characters: [] };

        const layers = {
            bg1: document.getElementById('background-layer-1'),
            bg2: document.getElementById('background-layer-2'),
            charaContainer: document.getElementById('character-layer'),
            map: document.getElementById('map-layer'),
            effect: document.getElementById('effect-overlay')
        };
        const ui = {
            container: document.getElementById('game-container'),
            textBox: document.getElementById('text-box'), name: document.getElementById('character-name'),
            msg: document.getElementById('message'), choices: document.getElementById('choices-box'),
            overlay: document.getElementById('click-overlay'),
            mapControls: document.getElementById('map-controls'), mapActionBtn: document.getElementById('map-action-btn'),
            backlog: document.getElementById('backlog-overlay'),
            backlogContent: document.getElementById('backlog-content'),
            btnAuto: document.getElementById('btn-auto'),
            btnSkip: document.getElementById('btn-skip')
        };
        let activeBg = 1;

        // --- System Functions ---
        function toggleBacklog() {
            if (ui.backlog.style.display === 'flex') {
                ui.backlog.style.display = 'none';
            } else {
                ui.backlogContent.innerHTML = '';
                backLog.forEach(entry => {
                    const div = document.createElement('div');
                    
                    if (entry.type === 'choice') {
                        // ★追加: 選択肢ログの表示
                        div.className = 'log-entry log-choice';
                        div.textContent = '👉 選択: ' + entry.text;
                    } else {
                        // 通常ログ
                        div.className = 'log-entry';
                        let html = '';
                        if (entry.name) html += \`<div class="log-name">\${entry.name}</div>\`;
                        html += \`<div class="log-text">\${entry.text}</div>\`;
                        div.innerHTML = html;
                    }
                    ui.backlogContent.appendChild(div);
                });
                ui.backlogContent.scrollTop = ui.backlogContent.scrollHeight;
                ui.backlog.style.display = 'flex';
                stopAutoSkip(); // ログ開いたら止める
            }
        }

        function toggleAuto() { isAuto = !isAuto; isSkip = false; updateSystemButtons(); checkAutoProceed(); }
        function toggleSkip() { isSkip = !isSkip; isAuto = false; updateSystemButtons(); checkAutoProceed(); }
        function stopAutoSkip() { isAuto = false; isSkip = false; updateSystemButtons(); if (autoTimer) clearTimeout(autoTimer); }
        function updateSystemButtons() { ui.btnAuto.classList.toggle('active', isAuto); ui.btnSkip.classList.toggle('active', isSkip); }
        
        function checkAutoProceed() {
            if (autoTimer) clearTimeout(autoTimer);
            if (!isWaitingForInput || isMapMode) return;
            let delay = isSkip ? 50 : 2000; 
            if (isAuto || isSkip) {
                autoTimer = setTimeout(() => { if (isWaitingForInput && !isMapMode) processNode(currentNodeId); }, delay);
            }
        }

        function saveGame() {
            try {
                const savePacket = {
                    gameState: gameState, currentNodeId: currentPlayingNodeId, isMapMode: isMapMode,
                    mapContext: isMapMode ? { mapId: mapEngine.currentMapId, playerX: mapEngine.player.x, playerY: mapEngine.player.y } : null,
                    backLog: backLog
                };
                localStorage.setItem('my_erogame_save_01', JSON.stringify(savePacket));
                alert('セーブしました');
            } catch(e) { console.error(e); alert('セーブ失敗'); }
        }
        function loadGame() {
            try {
                const data = localStorage.getItem('my_erogame_save_01');
                if(!data) { alert('セーブデータがありません'); return; }
                stopAutoSkip();
                const savePacket = JSON.parse(data);
                gameState = savePacket.gameState;
                backLog = savePacket.backLog || [];
                const targetNodeId = savePacket.currentNodeId || "${initialNodeId}";
                currentNodeId = targetNodeId;
                if (savePacket.isMapMode && savePacket.mapContext) {
                    const dummyNode = { type: 'map', mapId: savePacket.mapContext.mapId };
                    startMapMode(dummyNode);
                    mapEngine.player.x = savePacket.mapContext.playerX;
                    mapEngine.player.y = savePacket.mapContext.playerY;
                } else {
                    if (isMapMode) endMapMode();
                    processNode(targetNodeId); 
                }
                setTimeout(() => alert('ロードしました'), 50);
            } catch(e) { console.error(e); alert('ロード失敗'); }
        }
        function deleteSave() {
            if(confirm('本当にセーブデータを削除しますか？\\n次回ロードできなくなります。')) {
                localStorage.removeItem('my_erogame_save_01'); alert('削除しました');
            }
        }

        // --- Utils ---
        function replaceVariablesInText(content) {
            let result = content;
            for (const key in gameState) {
                const regex = new RegExp('\\\\{\\\\{' + key + '\\\\}\\\\}', 'g'); 
                result = result.replace(regex, gameState[key]);
            }
            return result;
        }
        function resolveValue(value) {
            if (typeof value !== 'string') return value;
            if (value.match(/^\\d+d\\d+(\\+\\d+)?$/)) {
                const parts = value.split('+'); const bonus = parts.length > 1 ? parseInt(parts[1], 10) : 0;
                const [numDice, numFaces] = parts[0].split('d').map(n => parseInt(n, 10));
                let total = 0; for (let i = 0; i < numDice; i++) total += Math.floor(Math.random() * numFaces) + 1;
                return total + bonus;
            }
            if (!isNaN(value) && value.trim() !== '') return Number(value);
            if (gameState.hasOwnProperty(value)) return !isNaN(gameState[value]) ? Number(gameState[value]) : gameState[value];
            return value;
        }
        function evaluateCondition(cond) {
            let left = gameState[cond.variable] !== undefined ? gameState[cond.variable] : 0;
            let right = resolveValue(cond.compareValue);
            if (cond.value) right = resolveValue(cond.value); 
            if (!isNaN(left) && !isNaN(right)) { left = Number(left); right = Number(right); }
            switch(cond.operator) {
                case '==': return left == right; case '!=': return left != right; case '>': return left > right; case '<': return left < right; case '>=': return left >= right; case '<=': return left <= right; default: return false;
            }
        }
        function userInteraction() {
            if (hasInteracted) return; hasInteracted = true;
            if (queuedSound) { queuedSound.play().catch(e=>{}); queuedSound = null; }
            if (currentBgmAudio && currentBgmAudio.paused) { currentBgmAudio.play().catch(e=>{}); }
        }

        // --- Main Loop ---
        function mainLoop(timestamp) {
            const dt = timestamp - lastTime; lastTime = timestamp;
            if (isMapMode) { updateMapGame(dt); renderMapGame(); }
            else { updateSpriteAnimation(animState.bg, dt); animState.characters.forEach(st => updateSpriteAnimation(st, dt)); }
            requestAnimationFrame(mainLoop);
        }
        requestAnimationFrame(mainLoop);

        function processNode(nodeId) {
            if (!nodeId) return; 
            const node = findNode(nodeId); if (!node) return;
            currentPlayingNodeId = nodeId;
            if (isMapMode && node.type !== 'map') endMapMode();
            isWaitingForInput = false;
            switch(node.type) {
                case 'text': processTextNode(node); break;
                case 'choice': processChoiceNode(node); break;
                case 'variable': processVariableNode(node); break;
                case 'conditional': processConditionalNode(node); break;
                case 'map': startMapMode(node); break;
            }
        }
        function findNode(id) {
            for (const s in gameData.scenario.sections) { if (gameData.scenario.sections[s].nodes[id]) return gameData.scenario.sections[s].nodes[id]; } return null;
        }

        // --- Novel Logic ---
        function processTextNode(node) {
            if (node.backgroundId && gameData.assets.backgrounds[node.backgroundId]) {
                const asset = gameData.assets.backgrounds[node.backgroundId];
                const targetBg = (activeBg === 1) ? layers.bg2 : layers.bg1;
                if (!targetBg.style.backgroundImage.includes(asset.data)) {
                    targetBg.style.backgroundImage = \`url(\${asset.data})\`;
                    (activeBg===1 ? layers.bg1 : layers.bg2).style.opacity = 0; targetBg.style.opacity = 1; activeBg = (activeBg === 1) ? 2 : 1;
                    animState.bg.id = node.backgroundId; animState.bg.frame = 0; animState.bg.timer = 0; animState.bg.element = targetBg;
                    if((asset.cols||1)===1 && (asset.rows||1)===1) targetBg.style.backgroundSize = 'cover';
                }
            }

            layers.charaContainer.innerHTML = ''; animState.characters = [];
            let chars = node.characters || [];
            if (chars.length === 0 && node.characterId) { chars = [{ characterId: node.characterId, position: node.characterPosition || 'bottom-center' }]; }
            chars.forEach((charData, index) => {
                if (!charData.characterId || !gameData.assets.characters[charData.characterId]) return;
                const asset = gameData.assets.characters[charData.characterId];
                const charDiv = document.createElement('div'); charDiv.className = 'sprite-char';
                const posClass = 'pos-' + (charData.position || 'bottom-center'); charDiv.classList.add(posClass);
                const scale = (charData.scale !== undefined ? charData.scale : 100) / 100;
                const userX = charData.x !== undefined ? charData.x : 0; const userY = charData.y !== undefined ? charData.y : 0;
                charDiv.style.transform = \`translateX(calc(-50% + \${userX}px)) translateY(\${userY}px) scale(\${scale})\`;
                charDiv.style.backgroundImage = \`url(\${asset.data})\`;
                if (charData.maskId && gameData.assets.characters[charData.maskId]) { const maskUrl = \`url(\${gameData.assets.characters[charData.maskId].data})\`; charDiv.style.webkitMaskImage = maskUrl; charDiv.style.maskImage = maskUrl; }
                const img = new Image(); img.src = asset.data;
                img.onload = () => {
                    const aspect = img.width / img.height;
                    const containerHeight = layers.charaContainer.clientHeight || 600;
                    const h = containerHeight * 0.95; const w = h * aspect;
                    charDiv.style.width = \`\${w}px\`; charDiv.style.height = \`\${h}px\`; charDiv.classList.add('loaded');
                };
                layers.charaContainer.appendChild(charDiv);
                if ((asset.cols||1) > 1 || (asset.rows||1) > 1) { animState.characters.push({ id: charData.characterId, frame: 0, timer: 0, element: charDiv }); }
            });

            ui.name.style.display = node.customName ? 'block' : 'none';
            const dispName = node.customName ? replaceVariablesInText(node.customName) : '';
            if (node.customName) ui.name.textContent = dispName;

            if (node.bgmId) {
                if (node.bgmId === 'stop') { if(currentBgmAudio) currentBgmAudio.pause(); currentBgmAudio=null; currentBgmId=null; }
                else if (node.bgmId !== currentBgmId && gameData.assets.sounds[node.bgmId]) { if(currentBgmAudio) currentBgmAudio.pause(); const bgm = gameData.assets.sounds[node.bgmId]; currentBgmAudio = new Audio(bgm.data); currentBgmAudio.loop = true; currentBgmId = node.bgmId; if(hasInteracted) currentBgmAudio.play().catch(e=>{}); }
            }
            if (node.soundId && gameData.assets.sounds[node.soundId]) { const se = new Audio(gameData.assets.sounds[node.soundId].data); if(hasInteracted) se.play().catch(e=>{}); else queuedSound = se; }

            triggerEffect(node.effect);

            ui.choices.innerHTML = '';
            const rawMsg = node.message || "";
            const dispMsg = replaceVariablesInText(rawMsg);
            
            // ログ記録
            if (rawMsg.trim().length > 0) {
                backLog.push({ name: dispName, text: dispMsg, type: 'text' });
            }

            const hasText = document.createElement("div"); hasText.innerHTML = rawMsg; 
            if (hasText.textContent.trim().length > 0 || rawMsg.includes("<img")) {
                ui.msg.innerHTML = dispMsg; ui.textBox.style.display = 'block';
            } else { ui.textBox.style.display = 'none'; }

            ui.overlay.style.display = 'block';
            currentNodeId = node.nextNodeId; 
            isWaitingForInput = true;
            checkAutoProceed();
        }

        function triggerEffect(effectType) {
            const overlay = layers.effect; const container = ui.container;
            overlay.className = ''; container.className = ''; void overlay.offsetWidth;
            if (!effectType) return;
            if (effectType.startsWith('flash-') || effectType.startsWith('fade-')) { overlay.className = 'fx-' + effectType; } 
            else if (effectType.startsWith('shake-')) { container.className = 'fx-' + effectType; setTimeout(() => { container.className = ''; }, 500); }
        }

        function processChoiceNode(node) {
            stopAutoSkip();
            ui.overlay.style.display = 'none'; ui.textBox.style.display = 'none'; ui.msg.innerHTML = ''; ui.choices.innerHTML = '';
            node.choices.forEach(c => {
                const btn = document.createElement('div'); btn.className = 'choice-button'; btn.textContent = replaceVariablesInText(c.text);
                btn.onclick = (e) => { 
                    e.stopPropagation(); 
                    userInteraction(); 
                    // ★追加: 選択した内容をログに記録
                    backLog.push({ name: "System", text: c.text, type: 'choice' });
                    currentNodeId = c.nextNodeId; 
                    processNode(currentNodeId); 
                };
                ui.choices.appendChild(btn);
            });
        }
        function processVariableNode(node) { const target = node.targetVariable; const val = resolveValue(node.value); if (gameState[target] === undefined) gameState[target] = 0; let cur = gameState[target]; if(!isNaN(cur)) cur = Number(cur); const opVal = !isNaN(val) ? Number(val) : val; if(node.operator === '=') gameState[target] = opVal; else if(node.operator === '+=') gameState[target] = cur + opVal; else if(node.operator === '-=') gameState[target] = cur - opVal; else if(node.operator === '*=') gameState[target] = cur * opVal; else if(node.operator === '/=') gameState[target] = cur / opVal; currentNodeId = node.nextNodeId; setTimeout(() => processNode(currentNodeId), 0); }
        function processConditionalNode(node) { let jumped = false; for(const cond of node.conditions) { if(evaluateCondition(cond)) { currentNodeId = cond.nextNodeId; jumped = true; break; } } if(!jumped) currentNodeId = node.elseNextNodeId; setTimeout(() => processNode(currentNodeId), 0); }
        function updateSpriteAnimation(state, dt) { if(!state.id || !state.element) return; const type = (state.element.id && state.element.id.includes('background')) ? 'backgrounds' : 'characters'; const asset = gameData.assets[type][state.id]; if(!asset || (asset.cols||1)<=1) return; state.timer += dt; if(state.timer >= 1000/(asset.fps||12)) { state.timer = 0; state.frame++; const total = (asset.cols||1)*(asset.rows||1); if(state.frame >= total) state.frame = (asset.loop!==false) ? 0 : total-1; const col = state.frame % (asset.cols||1); const row = Math.floor(state.frame / (asset.cols||1)); state.element.style.backgroundPosition = \`\${col * 100 / ((asset.cols||1)-1)}% \${row * 100 / ((asset.rows||1)-1)}%\`; } }
        
        // --- Map Logic (省略なし) ---
        function checkCondition(obj) { if (!obj.condition || !obj.condition.variable) return true; return evaluateCondition(obj.condition); }
        function startMapMode(node) { 
            stopAutoSkip(); // マップ開始時も停止
            isMapMode = true; const mapId = node.mapId; const mapData = gameData.maps[mapId]; if (!mapData) { return; } layers.map.style.display = 'block'; ui.textBox.style.display = 'none'; ui.overlay.style.display = 'none'; ui.mapControls.classList.add('active'); ui.mapActionBtn.classList.add('active'); mapEngine.data = mapData; mapEngine.currentMapId = mapId; mapEngine.camera = { x: 0, y: 0 }; mapEngine.bgScrollY = 0; mapEngine.bgImage = null; if (mapData.bgImageId && gameData.assets.backgrounds[mapData.bgImageId]) { const img = new Image(); img.src = gameData.assets.backgrounds[mapData.bgImageId].data; mapEngine.bgImage = img; } let startX = 1, startY = 1; const spawnObj = mapData.objects.find(o => o.isSpawn && o.spawnId === node.spawnId); if (spawnObj) { startX = spawnObj.x; startY = spawnObj.y; } mapEngine.player.x = startX * mapEngine.GRID; mapEngine.player.y = startY * mapEngine.GRID; mapEngine.player.vx = 0; mapEngine.player.vy = 0; mapEngine.player.onGround = false; mapEngine.player.isClimbing = false; mapEngine.activeObjects = mapData.objects.filter(obj => checkCondition(obj)); mapEngine.activeObjects.forEach(obj => { obj.currentX = obj.x * mapEngine.GRID; obj.currentY = obj.y * mapEngine.GRID; obj.moveTimer = 0; obj.dirX = Math.random() > 0.5 ? 1 : -1; obj.dirY = Math.random() > 0.5 ? 1 : -1; obj.originX = obj.x; obj.originY = obj.y; }); mapEngine.canvas.width = 800; mapEngine.canvas.height = 600; 
        }
        function endMapMode() { isMapMode = false; layers.map.style.display = 'none'; ui.mapControls.classList.remove('active'); ui.mapActionBtn.classList.remove('active'); }
        function updateMapGame(dt) { const timeScale = dt / 16.666; const p = mapEngine.player; const map = mapEngine.data; const grid = mapEngine.GRID; mapEngine.activeObjects = map.objects.filter(obj => checkCondition(obj)); mapEngine.activeObjects.forEach(obj => updateObjectMovement(obj, dt, timeScale)); let dx = 0, dy = 0; if (mapEngine.keys['ArrowLeft']) dx = -1; if (mapEngine.keys['ArrowRight']) dx = 1; if (map.type === 'side') { const cx = Math.floor((p.x + p.w/2) / grid); const cy = Math.floor((p.y + p.h/2) / grid); const ladder = mapEngine.activeObjects.find(o => o.x === cx && o.y === cy && o.effectType === 'ladder'); if (ladder) { if (mapEngine.keys['ArrowUp'] || mapEngine.keys['ArrowDown']) { p.isClimbing = true; p.vx = 0; p.vy = 0; } } else { p.isClimbing = false; } if (p.isClimbing) { if (mapEngine.keys['ArrowUp']) p.y -= 2 * timeScale; if (mapEngine.keys['ArrowDown']) p.y += 2 * timeScale; p.vx = dx * 2; p.vy = 0; if (mapEngine.keys['Space']) { p.isClimbing = false; p.vy = -5; mapEngine.keys['Space'] = false; } } else { p.vx = dx * p.speed; p.vy += p.gravity * timeScale; if ((mapEngine.keys['ArrowUp'] || mapEngine.keys['Space']) && p.onGround) { p.vy = p.jumpPower; p.onGround = false; } } } else if (map.type === 'shooter') { if (mapEngine.keys['ArrowUp']) dy = -1; if (mapEngine.keys['ArrowDown']) dy = 1; p.vx = dx * p.speed; p.vy = dy * p.speed; mapEngine.bgScrollY += (map.scrollSpeed || 2) * timeScale; } else { if (mapEngine.keys['ArrowUp']) dy = -1; if (mapEngine.keys['ArrowDown']) dy = 1; p.vx = dx * p.speed; p.vy = dy * p.speed; } if (map.scrollDir === 'right') p.x += map.scrollSpeed * timeScale; p.x += p.vx * timeScale; checkWallCollision(p, map, 'x'); p.y += p.vy * timeScale; p.onGround = false; checkWallCollision(p, map, 'y'); if (map.type === 'shooter') { p.x = Math.max(0, Math.min(p.x, mapEngine.canvas.width - p.w)); p.y = Math.max(0, Math.min(p.y, mapEngine.canvas.height - p.h)); } else { mapEngine.camera.x = p.x + p.w/2 - mapEngine.canvas.width/2; mapEngine.camera.y = p.y + p.h/2 - mapEngine.canvas.height/2; const maxX = map.width * grid - mapEngine.canvas.width; const maxY = map.height * grid - mapEngine.canvas.height; mapEngine.camera.x = Math.max(0, Math.min(mapEngine.camera.x, maxX)); mapEngine.camera.y = Math.max(0, Math.min(mapEngine.camera.y, maxY)); if (map.type === 'side' && p.y > map.height * grid) { p.y = 0; p.vy = 0; } } checkMapEvents(p); }
        function updateObjectMovement(obj, dt, timeScale) { if (!obj.moveType || obj.moveType === 'fixed') return; if (obj.currentX === undefined) { obj.currentX = obj.x * mapEngine.GRID; obj.currentY = obj.y * mapEngine.GRID; obj.moveTimer = 0; obj.dirX = 1; obj.dirY = 0; } const speed = (obj.moveSpeed || 2) * timeScale; const range = (obj.moveRange || 3) * mapEngine.GRID; const startX = obj.x * mapEngine.GRID; const startY = obj.y * mapEngine.GRID; if (obj.moveType === 'horizontal') { obj.currentX += speed * obj.dirX; if (obj.currentX > startX + range) obj.dirX = -1; if (obj.currentX < startX - range) obj.dirX = 1; } else if (obj.moveType === 'vertical') { obj.currentY += speed * obj.dirY; if (obj.dirY === 0) obj.dirY = 1; if (obj.currentY > startY + range) obj.dirY = -1; if (obj.currentY < startY - range) obj.dirY = 1; } else if (obj.moveType === 'random') { obj.moveTimer += dt; if (obj.moveTimer > 1000) { obj.moveTimer = 0; const r = Math.random(); if(r < 0.25) { obj.dirX = 1; obj.dirY = 0; } else if(r < 0.5) { obj.dirX = -1; obj.dirY = 0; } else if(r < 0.75) { obj.dirX = 0; obj.dirY = 1; } else { obj.dirX = 0; obj.dirY = -1; } } let nextX = obj.currentX + speed * obj.dirX; let nextY = obj.currentY + speed * obj.dirY; if (Math.abs(nextX - startX) < range && Math.abs(nextY - startY) < range) { obj.currentX = nextX; obj.currentY = nextY; } } else if (obj.moveType === 'chase') { const p = mapEngine.player; const dx = p.x - obj.currentX; const dy = p.y - obj.currentY; const dist = Math.sqrt(dx*dx + dy*dy); if (dist < range * 2) { if (Math.abs(dx) > 2) obj.currentX += Math.sign(dx) * speed; if (Math.abs(dy) > 2) obj.currentY += Math.sign(dy) * speed; } } }
        function checkWallCollision(p, map, axis) { if (map.type === 'shooter') return; const grid = mapEngine.GRID; const left = Math.floor(p.x / grid); const right = Math.floor((p.x + p.w - 0.1) / grid); const top = Math.floor(p.y / grid); const bottom = Math.floor((p.y + p.h - 0.1) / grid); const isWall = (gx, gy) => { if (gx < 0 || gx >= map.width || gy < 0 || gy >= map.height) return true; const obj = mapEngine.activeObjects.find(o => o.x === gx && o.y === gy); if (obj && obj.isWall) return true; return false; }; const checkSpecial = (gx, gy) => { const obj = mapEngine.activeObjects.find(o => o.x === gx && o.y === gy); if (obj && obj.effectType === 'jump' && map.type === 'side') { p.vy = -18; p.onGround = false; } }; if (axis === 'x') { if (p.vx > 0) { if (isWall(right, top) || isWall(right, bottom)) { p.x = right * grid - p.w; p.vx = 0; } } else if (p.vx < 0) { if (isWall(left, top) || isWall(left, bottom)) { p.x = (left + 1) * grid; p.vx = 0; } } checkSpecial(Math.floor((p.x+p.w/2)/grid), Math.floor((p.y+p.h)/grid)); } else { if (p.vy > 0) { if (isWall(left, bottom) || isWall(right, bottom)) { p.y = bottom * grid - p.h; p.vy = 0; p.onGround = true; } const centerBottomX = Math.floor((p.x + p.w/2) / grid); const centerBottomY = bottom; checkSpecial(centerBottomX, centerBottomY); } else if (p.vy < 0) { if (isWall(left, top) || isWall(right, top)) { p.y = (top + 1) * grid; p.vy = 0; } } } }
        function checkMapEvents(p) { const grid = mapEngine.GRID; const pRect = { l: p.x, r: p.x+p.w, t: p.y, b: p.y+p.h }; const hitObj = mapEngine.activeObjects.find(o => { if (!o.hasEvent) return false; const ox = (o.currentX !== undefined) ? o.currentX : o.x * grid; const oy = (o.currentY !== undefined) ? o.currentY : o.y * grid; return (pRect.l < ox + grid && pRect.r > ox && pRect.t < oy + grid && pRect.b > oy); }); if (hitObj) { if (hitObj.eventTrigger === 'action' && !mapEngine.keys['Space']) return; if (hitObj.eventTrigger === 'action') mapEngine.keys['Space'] = false; const counterKey = '_sys_evt_' + hitObj.id; if (gameState[counterKey] === undefined) gameState[counterKey] = 0; let count = gameState[counterKey]; let eventList = hitObj.eventList || [{nodeId: hitObj.eventNodeId}]; let targetNodeId = null; if (hitObj.eventRepeat === 'once') { if (count === 0) targetNodeId = eventList[0].nodeId; } else if (hitObj.eventRepeat === 'loop') { targetNodeId = eventList[count % eventList.length].nodeId; } else { const idx = Math.min(count, eventList.length - 1); targetNodeId = eventList[idx].nodeId; } if (targetNodeId) { gameState[counterKey]++; processNode(targetNodeId); } } }
        function renderMapGame() { const ctx = mapEngine.ctx; const map = mapEngine.data; const grid = mapEngine.GRID; const cam = mapEngine.camera; const w = mapEngine.canvas.width; const h = mapEngine.canvas.height; ctx.clearRect(0, 0, w, h); if (map.type === 'shooter' && mapEngine.bgImage) { const bg = mapEngine.bgImage; const yPos = mapEngine.bgScrollY % h; ctx.drawImage(bg, 0, yPos, w, h); ctx.drawImage(bg, 0, yPos - h, w, h); } else if (mapEngine.bgImage) { ctx.save(); ctx.translate(-cam.x, -cam.y); ctx.drawImage(mapEngine.bgImage, 0, 0, map.width*grid, map.height*grid); ctx.restore(); } else { ctx.fillStyle = '#333'; ctx.fillRect(0, 0, w, h); } ctx.save(); if (map.type !== 'shooter') ctx.translate(-cam.x, -cam.y); mapEngine.activeObjects.forEach(obj => { const gx = (obj.currentX !== undefined) ? obj.currentX : obj.x * grid; const gy = (obj.currentY !== undefined) ? obj.currentY : obj.y * grid; if (map.type !== 'shooter') { if (gx + grid < cam.x || gx > cam.x + w || gy + grid < cam.y || gy > cam.y + h) return; } ctx.save(); ctx.globalAlpha = obj.opacity !== undefined ? obj.opacity : 1.0; if (obj.visualType === 'image' && obj.charId && gameData.assets.characters[obj.charId]) { ctx.fillStyle = obj.color || 'orange'; const img = new Image(); img.src = gameData.assets.characters[obj.charId].data; ctx.drawImage(img, gx, gy, grid, grid); } else { ctx.fillStyle = obj.color || '#888'; ctx.fillRect(gx, gy, grid, grid); } ctx.restore(); }); ctx.fillStyle = 'red'; ctx.fillRect(mapEngine.player.x, mapEngine.player.y, mapEngine.player.w, mapEngine.player.h); ctx.restore(); }

        window.addEventListener('keydown', e => { mapEngine.keys[e.code] = true; if(isMapMode && ["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(e.code)) e.preventDefault(); });
        window.addEventListener('keyup', e => { mapEngine.keys[e.code] = false; });
        document.querySelectorAll('.pad-btn').forEach(btn => { const start = (e) => { e.preventDefault(); mapEngine.keys[btn.dataset.key] = true; }; const end = (e) => { e.preventDefault(); mapEngine.keys[btn.dataset.key] = false; }; btn.addEventListener('mousedown', start); btn.addEventListener('mouseup', end); btn.addEventListener('mouseleave', end); btn.addEventListener('touchstart', start); btn.addEventListener('touchend', end); });
        const actBtn = document.getElementById('map-action-btn'); const actStart = (e) => { e.preventDefault(); mapEngine.keys['Space'] = true; }; const actEnd = (e) => { e.preventDefault(); mapEngine.keys['Space'] = false; }; actBtn.addEventListener('mousedown', actStart); actBtn.addEventListener('mouseup', actEnd); actBtn.addEventListener('mouseleave', actEnd); actBtn.addEventListener('touchstart', actStart); actBtn.addEventListener('touchend', actEnd);
        
        // ★変更: クリック時にオート/スキップを止める
        const advGame = () => { 
            stopAutoSkip(); 
            userInteraction(); 
            if (isWaitingForInput && !isMapMode) processNode(currentNodeId); 
        };
        ui.textBox.addEventListener('click', advGame); ui.overlay.addEventListener('click', advGame);
        window.onload = () => { if(currentNodeId && currentNodeId !== "null") processNode(currentNodeId); };
    <\/script></body></html>`;
}

export function exportGame() {
    const projectData = getProjectData();
    if (!projectData.scenario.startNodeId) { alert('エラー: 開始ノードが設定されていません。'); return; }
    try {
        const gameHtml = generateGameHtml(projectData);
        const blob = new Blob([gameHtml], { type: 'text/html' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'game.html';
        document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(link.href);
    } catch (error) { alert("書き出しエラーが発生しました。コンソールを確認してください。"); }
}
