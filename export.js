// export.js (Final Complete Version: All Functions Guaranteed)

import { getProjectData } from './state.js';
import { modelExpressionCache } from './state.js';
export function generateGameHtml(data, startNodeOverride = null) {
    const dataString = JSON.stringify(data).replace(/<\/script>/g, '<\\/script>');
    const initialNodeId = startNodeOverride || data.scenario.startNodeId;
    
    const s = data.settings || {
        windowColor: '#000000', windowOpacity: 75, windowBgTransparent: false, windowImage: null,
        buttonColor: '#1990ff', buttonOpacity: 80, buttonBgTransparent: false, buttonImage: null,
        borderRadius: 10, borderWidth: 2, borderColor: '#FFFFFF', buttonTextColor: '#FFFFFF'
    };

    const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0, 0, 0';
    };

    const borderStyle = `${s.borderWidth}px solid ${s.borderColor}`;
    let windowBgStyle = s.windowImage ? `background-image: url('${s.windowImage}'); background-color: transparent; border: none;` : (!s.windowBgTransparent ? `background-color: rgba(${hexToRgb(s.windowColor)}, ${s.windowOpacity / 100});` : `background-color: transparent;`);
    const windowBorderStyle = s.windowImage ? 'border: none;' : `border: ${borderStyle};`;
    let buttonBgStyle = s.buttonImage ? `background-image: url('${s.buttonImage}'); background-color: transparent; border: none; color: ${s.textColor};` : (!s.buttonBgTransparent ? `background-color: rgba(${hexToRgb(s.buttonColor)}, ${s.buttonOpacity / 100});` : `background-color: transparent; border: 1px solid #fff;`);
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
    <link href="https://fonts.googleapis.com/css2?family=DotGothic16&family=Klee+One&family=M+PLUS+Rounded+1c:wght@400;700&family=Shippori+Mincho&display=swap" rel="stylesheet">
    <script async src="https://unpkg.com/es-module-shims@1.8.0/dist/es-module-shims.js"><\/script>
    <script type="importmap">
    {
        "imports": {
            "three": "https://esm.sh/three@0.169.0",
            "three/addons/": "https://esm.sh/three@0.169.0/examples/jsm/",
            "@pixiv/three-vrm": "https://esm.sh/@pixiv/three-vrm@3.0.0?external=three",
            "@pixiv/three-vrm-animation": "https://esm.sh/@pixiv/three-vrm-animation@3.0.0?external=three"
        }
    }
    <\/script>
    <style>
        body { margin: 0; font-family: sans-serif; background-color: #000; overflow: hidden; user-select: none; -webkit-user-select: none; touch-action: none; }
        #game-container { position: relative; width: 100%; height: 100vh; max-width: 100%; max-height: 100vh; margin: 0 auto; background-color: #000; overflow: hidden; }
        #loading-screen { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #000; z-index: 9999; display: flex; flex-direction: column; justify-content: center; align-items: center; color: #fff; transition: opacity 0.5s; }
                #loading-screen.ready { cursor: pointer; background: #111; }
        #loading-screen.ready .spinner { display: none; }
        #loading-text { font-size: 1.2em; font-weight: bold; letter-spacing: 2px; animation: blink 1s infinite alternate; }
        @keyframes blink { from { opacity: 1; } to { opacity: 0.5; } }
        .spinner { width: 40px; height: 40px; border: 4px solid rgba(255,255,255,0.3); border-top: 4px solid #fff; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 15px; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; transition: opacity 0.5s; background-size: cover; background-position: center; pointer-events: none; }
        .bg-video { width: 100%; height: 100%; object-fit: cover; position: absolute; top: 0; left: 0; pointer-events: none; z-index: 0; 
        }
        #character-layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 10; }
        .sprite-char-img { position: absolute; width: auto; height: 95%; object-fit: contain; opacity: 0; transition: opacity 0.3s, transform 0.3s; transform-origin: bottom center; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; -webkit-mask-position: center bottom; mask-position: center bottom; -webkit-mask-size: contain; mask-size: contain; }
        .sprite-char-div { position: absolute; opacity: 0; transition: opacity 0.3s, transform 0.3s; transform-origin: bottom center; background-repeat: no-repeat; image-rendering: pixelated; }
        .sprite-char-img.loaded, .sprite-char-div.loaded { opacity: 1; }
        .pos-bottom-left { bottom: 0; left: 15%; } .pos-bottom-center { bottom: 0; left: 50%; } .pos-bottom-right { bottom: 0; left: 85%; }
        .pos-center-left { bottom: 0; left: 15%; } .pos-center { bottom: 0; left: 50%; } .pos-center-right { bottom: 0; left: 85%; }
        .pos-top-left { top: 0; left: 15%; transform-origin: top center; } .pos-top-center { top: 0; left: 50%; transform-origin: top center; } .pos-top-right { top: 0; left: 85%; transform-origin: top center; }
        #text-box { position: absolute; bottom: 4%; left: 5%; width: 90%; height: auto; min-height: 30%; max-height: 50%; ${windowBgStyle} background-size: 100% 100%; color: #fff; border-radius: ${s.borderRadius}px; padding: 20px; box-sizing: border-box; ${windowBorderStyle} ${windowBackdropFilter} pointer-events: auto; z-index: 20; display: none; }
        #character-name { font-size: 1.4em; font-weight: 700; margin-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.3); min-height: 1em; color: #ffffff; }
        #message { font-size: 1.2em; line-height: 1.6; max-height: 150px; overflow-y: auto; }
        .ql-font-dotgothic { font-family: "DotGothic16", sans-serif; } .ql-font-rounded { font-family: "M PLUS Rounded 1c", sans-serif; } .ql-font-klee { font-family: "Klee One", cursive; } .ql-font-mincho-b { font-family: "Shippori Mincho", serif; }
        #choices-box { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); display: flex; flex-direction: column; gap: 15px; z-index: 30; width: 80%; pointer-events: auto; }
        .choice-button { padding: 15px; font-size: 1.2em; cursor: pointer; text-align: center; ${buttonBgStyle} background-size: 100% 100%; border-radius: ${s.borderRadius}px; ${buttonBorderStyle} ${buttonBackdropFilter} transition: all 0.2s; color: ${s.buttonTextColor}; }
        .choice-button:hover { transform: scale(1.02); filter: brightness(1.2); }
        #effect-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 100; opacity: 0; }
        @keyframes flash-white { 0% { background: white; opacity: 1; } 100% { opacity: 0; } } .fx-flash-white { animation: flash-white 1.0s ease-out; }
        @keyframes flash-red { 0% { background: red; opacity: 1; } 100% { opacity: 0; } } .fx-flash-red { animation: flash-red 1.0s ease-out; }
        @keyframes fade-black { 0% { background: black; opacity: 0; } 20% { opacity: 1; } 80% { opacity: 1; } 100% { opacity: 0; } } .fx-fade-black { animation: fade-black 1.0s ease-in-out; }
        @keyframes shake-small { 0%, 100% { transform: translate(0,0); } 25% { transform: translate(2px, 0); } 75% { transform: translate(-2px, 0); } } .fx-shake-small { animation: shake-small 0.5s ease-in-out; }
        @keyframes shake-medium { 0%, 100% { transform: translate(0,0); } 20% { transform: translate(-5px, 5px); } 40% { transform: translate(5px, -5px); } 60% { transform: translate(-5px, -5px); } 80% { transform: translate(5px, 5px); } } .fx-shake-medium { animation: shake-medium 0.6s ease-in-out; }
        @keyframes shake-hard { 0%, 100% { transform: translate(0,0); } 10% { transform: translate(-10px, -10px); } 30% { transform: translate(10px, 10px); } 50% { transform: translate(-10px, 10px); } 70% { transform: translate(10px, -10px); } 90% { transform: translate(-5px, 5px); } } .fx-shake-hard { animation: shake-hard 0.8s ease-in-out; }
        #backlog-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 300; display: none; flex-direction: column; padding: 40px; color: #fff; }
        #backlog-content { flex: 1; overflow-y: auto; margin-bottom: 20px; } .log-entry { margin-bottom: 15px; border-bottom: 1px solid #444; padding-bottom: 10px; } .log-name { color: #f1c40f; font-weight: bold; } .log-choice { text-align: center; color: #40a9ff; border: 1px dashed #40a9ff; padding: 5px; }
        #backlog-close { align-self: center; padding: 10px 40px; cursor: pointer; background:#fff; color:#000; border-radius:20px; border:none; }
        #system-menu { position: absolute; top: 10px; right: 10px; z-index: 301; display: flex; gap: 5px; }
        .sys-btn { background: rgba(0,0,0,0.5); border: 1px solid #aaa; color: #eee; padding: 5px; cursor: pointer; font-size:12px; } .sys-btn.active { color: yellow; border-color: yellow; } .sys-btn.danger { border-color: #f88; }
        #click-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 10; cursor: pointer; display: none; }
        #map-layer { display:none; width: 100%; height: 100%; }
        #map-controls { position: absolute; bottom: 20px; left: 20px; z-index: 9999; display: none; grid-template-columns: 60px 60px 60px; grid-template-rows: 60px 60px; gap: 10px; pointer-events: auto !important; }
        #map-action-btn { position: absolute; bottom: 30px; right: 30px; z-index: 9999; width: 80px; height: 80px; border-radius: 50%; background: rgba(255, 255, 255, 0.3); border: 2px solid #fff; color: #fff; font-weight: bold; font-size: 1.2em; display: none; justify-content: center; align-items: center; user-select: none; cursor: pointer; pointer-events: auto !important; touch-action: none; }
        .pad-btn { width: 60px; height: 60px; background: rgba(255, 255, 255, 0.2); border: 1px solid #fff; border-radius: 10px; display: flex; justify-content: center; align-items: center; color: #fff; font-size: 1.5em; user-select: none; cursor: pointer; touch-action: none; }
        #map-controls.active { display: grid !important; }
        #map-action-btn.active { display: flex !important; }
        .pad-btn:active, #map-action-btn:active { background: rgba(255, 255, 255, 0.5); }
        .pad-up { grid-column: 2; grid-row: 1; } .pad-left { grid-column: 1; grid-row: 2; } .pad-down { grid-column: 2; grid-row: 2; } .pad-right { grid-column: 3; grid-row: 2; }
    </style>
</head>
<body>
    <div id="game-container">
        <div id="loading-screen"><div class="spinner"></div><div id="loading-text">NOW LOADING...</div></div>
        <div id="system-menu">
            <button class="sys-btn" onclick="toggleBacklog()">LOG</button>
            <button id="btn-auto" class="sys-btn" onclick="toggleAuto()">AUTO</button>
            <button id="btn-skip" class="sys-btn" onclick="toggleSkip()">SKIP</button>
            <button class="sys-btn" onclick="saveGame()">SAVE</button>
            <button class="sys-btn" onclick="loadGame()">LOAD</button>
            <button class="sys-btn danger" onclick="deleteSave()">RESET</button>
        </div>
        <div id="backlog-overlay"><div id="backlog-content"></div><button id="backlog-close" onclick="toggleBacklog()">閉じる</button></div>
        <div id="background-layer-1" class="layer"></div><div id="background-layer-2" class="layer" style="opacity:0;"></div>
        <div id="character-layer"></div>
        <canvas id="character-canvas" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 10; pointer-events: none;"></canvas>
        <div id="effect-overlay"></div>
        <div id="click-overlay"></div>
        <div id="text-box"><div id="character-name"></div><div id="message"></div></div>
        <div id="choices-box"></div>
        <div id="map-layer">
            <canvas id="map-canvas" style="width: 100%; height: 100%; display: block;"></canvas>
            <div id="map-controls">
                <div class="pad-btn pad-up" data-key="ArrowUp">↑</div><div class="pad-btn pad-left" data-key="ArrowLeft">←</div>
                <div class="pad-btn pad-down" data-key="ArrowDown">↓</div><div class="pad-btn pad-right" data-key="ArrowRight">→</div>
            </div>
            <div id="map-action-btn" data-key="Space">ACT</div>
        </div>
    </div>

    <script type="module">
        import * as THREE from 'three';
        import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
        import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
        import { VRMAnimationLoaderPlugin, createVRMAnimationClip, VRMLookAtQuaternionProxy } from '@pixiv/three-vrm-animation';
const modelExpressionCache = {};
        const gameData = ${dataString};
        let gameState = { ...gameData.variables };
        let currentNodeId = "${initialNodeId}";
        let currentPlayingNodeId = "${initialNodeId}";
        let isWaitingForInput = true;
        let isMapMode = false;
        let backLog = [];
        let isAuto = false, isSkip = false, autoTimer = null;
        let currentBgmAudio = null;

                let hasInteracted = false;
        let currentBgmId = null;
        let queuedSound = null;

        // --- Three.js Handler ---
        const threeHandler = {
            scene: null, camera: null, renderer: null, 
            models: {}, vrms: {}, animations: {}, mixers: [], clock: new THREE.Clock(),
            init(canvas) {
                this.scene = new THREE.Scene();
                this.camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
                this.camera.position.set(0, 1.3, 3.0);
                const ambientLight = new THREE.AmbientLight(0xffffff, 2.0); this.scene.add(ambientLight);
                const dl = new THREE.DirectionalLight(0xffffff, 2.0); dl.position.set(1, 1, 1); this.scene.add(dl);
                this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
                this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
                this.renderer.setPixelRatio(window.devicePixelRatio);
                this.renderer.outputEncoding = THREE.sRGBEncoding;
            },
            resize(width, height) {
                if (this.camera && this.renderer) {
                    this.camera.aspect = width / height;
                    this.camera.updateProjectionMatrix();
                    this.renderer.setSize(width, height);
                }
            },
        async loadAssets() {
                const loader = new GLTFLoader();
                loader.register((parser) => new VRMLoaderPlugin(parser));
                loader.register((parser) => new VRMAnimationLoaderPlugin(parser));
                for (const id in gameData.assets.models) {
                    try {
                        const gltf = await loader.loadAsync(gameData.assets.models[id].data);
                        const vrm = gltf.userData.vrm;
                        const model = vrm ? vrm.scene : gltf.scene;
                        
                        if (vrm) {
                            // 表情リストを抽出し、キャッシュに保存
                            if (vrm.expressionManager) {
                                modelExpressionCache[id] = vrm.expressionManager.expressions.map(exp => exp.presetName);
                            }
                        
                            VRMUtils.removeUnnecessaryVertices(model); 
                            VRMUtils.removeUnnecessaryJoints(model); 
                            vrm.lookAt.target = this.camera;
                            const proxy = new VRMLookAtQuaternionProxy(vrm.lookAt); 
                            proxy.name = 'VRMLookAtQuaternionProxy'; 
                            vrm.scene.add(proxy);
                            this.vrms[id] = vrm;
                        }
                        
                        model.visible = false; 
                        this.scene.add(model); 
                        this.models[id] = model;
                    } catch (e) { console.error(e); }
                }
                for (const id in gameData.assets.animations) {
                    try {
                        const gltf = await loader.loadAsync(gameData.assets.animations[id].data);
                        this.animations[id] = gltf.userData.vrmAnimations ? gltf.userData.vrmAnimations[0] : null;
                    } catch (e) { console.error(e); }
                }
            },
         showModel(id, config) {
                const model = this.models[id]; 
                const vrm = this.vrms[id];
                
                if (model) {
                    model.visible = true;

                    if(config) {
                        model.position.set(config.posX||0, config.posY||0, config.posZ||0);
                        let defRotY = vrm ? 180 : 0;
                        model.rotation.set((config.rotX||0)*(Math.PI/180), ((config.rotY||0)+defRotY)*(Math.PI/180), (config.rotZ||0)*(Math.PI/180));
                        const s = config.scale!==undefined ? config.scale : 1.0; 
                        model.scale.set(s, s, s);

                        if (vrm && vrm.springBoneManager) {
                            vrm.springBoneManager.reset();
                        }
                    }
                    
                    if (vrm) {
                        // まず全表情をリセット
                        vrm.expressionManager.resetValues();
                        
                        // 指定された表情を適用
                        if (config && config.expression) {
                            vrm.expressionManager.setValue(config.expression, 1.0);
                        }
                    }

                    if (vrm && config && config.animationId && this.animations[config.animationId]) {
                        this.mixers = this.mixers.filter(m => m.getRoot() !== model);
                        const mixer = new THREE.AnimationMixer(model);
                        const clip = createVRMAnimationClip(this.animations[config.animationId], vrm);
                        const action = mixer.clipAction(clip); 
                        action.play(); 
                        this.mixers.push(mixer);
                    }
                }
            },
            hideAll() { 
                for (const k in this.models) {
                    this.models[k].visible = false;
                    const vrm = this.vrms[k];
                    if (vrm && vrm.expressionManager) {
                        vrm.expressionManager.resetValues();
                    }
                }
            },
            updateAndRender() {
                const delta = this.clock.getDelta();
                for (const id in this.vrms) this.vrms[id].update(delta);
                this.mixers.forEach(m => m.update(delta));
                if (this.renderer) this.renderer.render(this.scene, this.camera);
            }
        };

        // --- Map Engine State ---
        const mapEngine = {
            canvas: document.getElementById('map-canvas'),
            ctx: document.getElementById('map-canvas').getContext('2d'),
            data: null, currentMapId: null, bgImage: null, bgScrollY: 0,
            player: { x: 0, y: 0, w: 32, h: 32, speed: 4, vx: 0, vy: 0, onGround: false, isClimbing: false, gravity: 0.6, jumpPower: -12, dir: 0.5 * Math.PI },
            camera: { x: 0, y: 0 }, keys: {}, GRID: 32, activeObjects: [], imgCache: {},
            eventCooldown: 0 
        };

        let lastTime = performance.now(); 
        const animState = { bg: { id: null, frame: 0, timer: 0, element: null }, characters: [] };
        
        const layers = { bg1: document.getElementById('background-layer-1'), bg2: document.getElementById('background-layer-2'), charaContainer: document.getElementById('character-layer'), map: document.getElementById('map-layer'), effect: document.getElementById('effect-overlay') };
        const ui = { 
            loader: document.getElementById('loading-screen'), 
            container: document.getElementById('game-container'), 
            textBox: document.getElementById('text-box'), 
            name: document.getElementById('character-name'), 
            msg: document.getElementById('message'), 
            choices: document.getElementById('choices-box'), 
            overlay: document.getElementById('click-overlay'), 
            backlog: document.getElementById('backlog-overlay'), 
            backlogContent: document.getElementById('backlog-content'), 
            btnAuto: document.getElementById('btn-auto'), 
            btnSkip: document.getElementById('btn-skip'), 
            mapControls: document.getElementById('map-controls'), 
            mapActionBtn: document.getElementById('map-action-btn'),
            charaContainer: document.getElementById('character-layer'),
            bg1: document.getElementById('background-layer-1'), 
            bg2: document.getElementById('background-layer-2'), 
            effect: document.getElementById('effect-overlay')
        };
        let activeBg = 1;

        // --- System UI Functions ---
        window.toggleBacklog = () => {
            if (ui.backlog.style.display === 'flex') {
                ui.backlog.style.display = 'none';
            } else {
                ui.backlogContent.innerHTML = '';
                backLog.forEach(e => {
                    const d = document.createElement('div');
                    if(e.type==='choice') { d.className='log-entry log-choice'; d.textContent='👉 '+e.text; }
                    else { d.className='log-entry'; d.innerHTML=\`<div class="log-name">\${e.name||''}</div><div class="log-text">\${e.text}</div>\`; }
                    ui.backlogContent.appendChild(d);
                });
                ui.backlogContent.scrollTop = ui.backlogContent.scrollHeight; 
                ui.backlog.style.display = 'flex'; 
                stopAutoSkip();
            }
        };
        window.toggleAuto = () => { isAuto=!isAuto; isSkip=false; updateBtns(); checkAuto(); };
        window.toggleSkip = () => { isSkip=!isSkip; isAuto=false; updateBtns(); checkAuto(); };
        function stopAutoSkip() { isAuto=false; isSkip=false; updateBtns(); clearTimeout(autoTimer); }
        function updateBtns() { ui.btnAuto.classList.toggle('active', isAuto); ui.btnSkip.classList.toggle('active', isSkip); }
        function checkAuto() { clearTimeout(autoTimer); if (!isWaitingForInput || isMapMode) return; if (isAuto || isSkip) { autoTimer = setTimeout(() => { if(isWaitingForInput && !isMapMode) processNode(currentNodeId); }, isSkip ? 50 : 2000); } }
        window.saveGame = () => { try { const d={gameState,currentNodeId:currentPlayingNodeId,backLog,isMapMode,mapContext:isMapMode?{mapId:mapEngine.currentMapId,playerX:mapEngine.player.x,playerY:mapEngine.player.y,dir:mapEngine.player.dir}:null}; localStorage.setItem('save01',JSON.stringify(d)); alert('Saved'); } catch(e){console.error(e);alert('Save Error');} };
        window.loadGame = () => {
            try {
                const j=localStorage.getItem('save01'); if(!j)return alert('No Data'); const d=JSON.parse(j);
                gameState=d.gameState; backLog=d.backLog||[]; stopAutoSkip();
                if(d.isMapMode && d.mapContext) { startMapMode({mapId:d.mapContext.mapId}); mapEngine.player.x=d.mapContext.playerX; mapEngine.player.y=d.mapContext.playerY; mapEngine.player.dir=d.mapContext.dir||0; }
                else { if(isMapMode) endMapMode(); processNode(d.currentNodeId); }
                alert('Loaded');
            } catch(e){console.error(e);alert('Load Error');}
        };
        window.deleteSave = () => { if(confirm('Delete?')){ localStorage.removeItem('save01'); alert('Deleted'); } };
        function replaceVariablesInText(t) { for(const k in gameState) t=t.replace(new RegExp('\\\\{\\\\{'+k+'\\\\}\\\\}','g'),gameState[k]); return t; }
        function resolveValue(v) { if(typeof v!=='string')return v; if(v.match(/^\\d+d\\d+/)){const p=v.split('+');const[n,f]=p[0].split('d');let t=0;for(let i=0;i<n;i++)t+=Math.floor(Math.random()*f)+1;return t+(p[1]?parseInt(p[1]):0);} return !isNaN(v)&&v.trim()!==''?Number(v):gameState.hasOwnProperty(v)?(isNaN(gameState[v])?gameState[v]:Number(gameState[v])):v; }
        function evaluateCondition(c) { let l=gameState[c.variable]!==undefined?gameState[c.variable]:0; let r=resolveValue(c.compareValue); if(c.value)r=resolveValue(c.value); if(!isNaN(l)&&!isNaN(r)){l=Number(l);r=Number(r);} switch(c.operator){case'==':return l==r;case'!=':return l!=r;case'>':return l>r;case'<':return l<r;case'>=':return l>=r;case'<=':return l<=r;default:return false;} }
        function userInteraction() { if(hasInteracted)return; hasInteracted=true; if(queuedSound){queuedSound.play().catch(e=>{});queuedSound=null;} if(currentBgmAudio&&currentBgmAudio.paused)currentBgmAudio.play().catch(e=>{}); }

        // --- Helper Functions for Map ---
        function checkCondition(obj) { 
            if (!obj.condition || !obj.condition.variable) return true; 
            return evaluateCondition(obj.condition); 
        }

        function checkMapEvents(p) { 
            if(mapEngine.eventCooldown > 0) return;
            const grid = mapEngine.GRID; 
            const pRect = { l: p.x, r: p.x+p.w, t: p.y, b: p.y+p.h }; 
            const hitObj = mapEngine.activeObjects.find(o => { 
                if (!o.hasEvent) return false; 
                const ox = (o.currentX !== undefined) ? o.currentX : o.x * grid; 
                const oy = (o.currentY !== undefined) ? o.currentY : o.y * grid; 
                return (pRect.l < ox + grid && pRect.r > ox && pRect.t < oy + grid && pRect.b > oy); 
            }); 
            if (hitObj) { 
                if (hitObj.eventTrigger === 'action' && !mapEngine.keys['Space']) return; 
                if (hitObj.eventTrigger === 'action') mapEngine.keys['Space'] = false; 
                const counterKey = '_sys_evt_' + hitObj.id; 
                if (gameState[counterKey] === undefined) gameState[counterKey] = 0; 
                let count = gameState[counterKey]; 
                let eventList = hitObj.eventList || [{nodeId: hitObj.eventNodeId}]; 
                let targetNodeId = null; 
                if (hitObj.eventRepeat === 'once') { if (count === 0) targetNodeId = eventList[0].nodeId; } 
                else if (hitObj.eventRepeat === 'loop') { targetNodeId = eventList[count % eventList.length].nodeId; } 
                else { const idx = Math.min(count, eventList.length - 1); targetNodeId = eventList[idx].nodeId; } 
                if (targetNodeId) { gameState[counterKey]++; processNode(targetNodeId); } 
            } 
        }

        function checkWallCollision(p, map, axis) { 
            if (map.type === 'shooter') return; 
            const grid = mapEngine.GRID; 
            const left = Math.floor(p.x / grid); const right = Math.floor((p.x + p.w - 0.1) / grid); 
            const top = Math.floor(p.y / grid); const bottom = Math.floor((p.y + p.h - 0.1) / grid); 
            const isWall = (gx, gy) => { if (gx < 0 || gx >= map.width || gy < 0 || gy >= map.height) return true; const obj = mapEngine.activeObjects.find(o => o.x === gx && o.y === gy); if (obj && obj.isWall) return true; return false; }; 
            const checkSpecial = (gx, gy) => { const obj = mapEngine.activeObjects.find(o => o.x === gx && o.y === gy); if (obj && obj.effectType === 'jump' && map.type === 'side') { p.vy = -18; p.onGround = false; } }; 
            if (axis === 'x') { if (p.vx > 0) { if (isWall(right, top) || isWall(right, bottom)) { p.x = right * grid - p.w; p.vx = 0; } } else if (p.vx < 0) { if (isWall(left, top) || isWall(left, bottom)) { p.x = (left + 1) * grid; p.vx = 0; } } checkSpecial(Math.floor((p.x+p.w/2)/grid), Math.floor((p.y+p.h)/grid)); } else { if (p.vy > 0) { if (isWall(left, bottom) || isWall(right, bottom)) { p.y = bottom * grid - p.h; p.vy = 0; p.onGround = true; } const centerBottomX = Math.floor((p.x + p.w/2) / grid); const centerBottomY = bottom; checkSpecial(centerBottomX, centerBottomY); } else if (p.vy < 0) { if (isWall(left, top) || isWall(right, top)) { p.y = (top + 1) * grid; p.vy = 0; } } } 
        }

        function updateObjectMovement(obj, dt, timeScale) { 
            if (!obj.moveType || obj.moveType === 'fixed') return; 
            if (obj.currentX === undefined) { obj.currentX = obj.x * mapEngine.GRID; obj.currentY = obj.y * mapEngine.GRID; obj.moveTimer = 0; obj.dirX = 1; obj.dirY = 0; } 
            const speed = (obj.moveSpeed || 2) * timeScale; const range = (obj.moveRange || 3) * mapEngine.GRID; const startX = obj.x * mapEngine.GRID; const startY = obj.y * mapEngine.GRID; 
            if (obj.moveType === 'horizontal') { obj.currentX += speed * obj.dirX; if (obj.currentX > startX + range) obj.dirX = -1; if (obj.currentX < startX - range) obj.dirX = 1; } else if (obj.moveType === 'vertical') { obj.currentY += speed * obj.dirY; if (obj.dirY === 0) obj.dirY = 1; if (obj.currentY > startY + range) obj.dirY = -1; if (obj.currentY < startY - range) obj.dirY = 1; } else if (obj.moveType === 'random') { obj.moveTimer += dt; if (obj.moveTimer > 1000) { obj.moveTimer = 0; const r = Math.random(); if(r < 0.25) { obj.dirX = 1; obj.dirY = 0; } else if(r < 0.5) { obj.dirX = -1; obj.dirY = 0; } else if(r < 0.75) { obj.dirX = 0; obj.dirY = 1; } else { obj.dirX = 0; obj.dirY = -1; } } let nextX = obj.currentX + speed * obj.dirX; let nextY = obj.currentY + speed * obj.dirY; if (Math.abs(nextX - startX) < range && Math.abs(nextY - startY) < range) { obj.currentX = nextX; obj.currentY = nextY; } } else if (obj.moveType === 'chase') { const p = mapEngine.player; const dx = p.x - obj.currentX; const dy = p.y - obj.currentY; const dist = Math.sqrt(dx*dx + dy*dy); if (dist < range * 2) { if (Math.abs(dx) > 2) obj.currentX += Math.sign(dx) * speed; if (Math.abs(dy) > 2) obj.currentY += Math.sign(dy) * speed; } } 
        }

        // --- Render Functions ---
function renderMapGame() { 
            const ctx = mapEngine.ctx; 
            const map = mapEngine.data; 
            const grid = mapEngine.GRID; 
            const cam = mapEngine.camera; 
            const w = mapEngine.canvas.width; 
            const h = mapEngine.canvas.height; 
            
            ctx.fillStyle = '#111'; 
            ctx.fillRect(0, 0, w, h); 
            
            ctx.save(); 
            if (map.type !== 'shooter') ctx.translate(-cam.x, -cam.y); 
            
            const mapW = map.width * grid;
            const mapH = map.height * grid;

            // ★修正: 動画(readyState >= 2) または 画像(complete) の準備チェック
            let isBgReady = false;
            if (mapEngine.bgImage) {
                if (mapEngine.isVideo) {
                    isBgReady = (mapEngine.bgImage.readyState >= 2);
                } else {
                    isBgReady = (mapEngine.bgImage.complete && mapEngine.bgImage.naturalWidth !== 0);
                }
            }

            if (map.type === 'shooter' && isBgReady) { 
                const bg = mapEngine.bgImage; 
                const yPos = mapEngine.bgScrollY % h; 
                ctx.drawImage(bg, 0, yPos, w, h); 
                ctx.drawImage(bg, 0, yPos - h, w, h); 
            } else if (isBgReady) { 
                ctx.drawImage(mapEngine.bgImage, 0, 0, mapW, mapH); 
            } else { 
                ctx.fillStyle = '#555'; 
                ctx.fillRect(0, 0, mapW, mapH); 
                ctx.strokeStyle = 'rgba(255,255,255,0.1)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                for(let ix=0; ix<=map.width; ix++) { ctx.moveTo(ix*grid,0); ctx.lineTo(ix*grid, mapH); }
                for(let iy=0; iy<=map.height; iy++) { ctx.moveTo(0,iy*grid); ctx.lineTo(mapW, iy*grid); }
                ctx.stroke();
            } 
            
            if (map.type !== 'shooter') {
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.strokeRect(0, 0, mapW, mapH);
            }

            // オブジェクト描画 (変更なし)
            mapEngine.activeObjects.forEach(obj => { 
                const gx = (obj.currentX !== undefined) ? obj.currentX : obj.x * grid; 
                const gy = (obj.currentY !== undefined) ? obj.currentY : obj.y * grid; 
                if (map.type !== 'shooter') { 
                    if (gx + grid < cam.x || gx > cam.x + w || gy + grid < cam.y || gy > cam.y + h) return; 
                } 
                ctx.save(); 
                ctx.globalAlpha = obj.opacity !== undefined ? obj.opacity : 1.0; 
                if (obj.visualType === 'image' && obj.charId && gameData.assets.characters[obj.charId]) { 
                    const asset = gameData.assets.characters[obj.charId];
                    if (!mapEngine.imgCache[obj.charId]) {
                        const img = new Image(); img.src = asset.data;
                        mapEngine.imgCache[obj.charId] = img;
                    }
                    const img = mapEngine.imgCache[obj.charId];
                    if (img.complete && img.naturalWidth !== 0) {
                        const cols = asset.cols || 1;
                        const rows = asset.rows || 1;
                        let frame = 0;
                        if (cols > 1 || rows > 1) {
                            const now = performance.now();
                            const totalFrames = cols * rows;
                            const fps = asset.fps || 12;
                            frame = Math.floor(now / (1000/fps)) % totalFrames;
                        }
                        const col = frame % cols;
                        const row = Math.floor(frame / cols);
                        const srcW = img.width / cols;
                        const srcH = img.height / rows;
                        ctx.drawImage(img, col * srcW, row * srcH, srcW, srcH, gx, gy, grid, grid);
                    } else {
                        ctx.fillStyle = obj.color || '#888'; ctx.fillRect(gx, gy, grid, grid);
                    }
                } else { 
                    ctx.fillStyle = obj.color || '#888'; ctx.fillRect(gx, gy, grid, grid); 
                } 
                ctx.restore(); 
            }); 
            
            ctx.fillStyle = 'red'; 
            ctx.fillRect(mapEngine.player.x, mapEngine.player.y, mapEngine.player.w, mapEngine.player.h); 
            ctx.restore(); 
        }

function renderRaycastGame() {
            const ctx = mapEngine.ctx; const w = mapEngine.canvas.width; const h = mapEngine.canvas.height;
            const p = mapEngine.player; const grid = mapEngine.GRID; const map = mapEngine.data;
            const fov = Math.PI / 3; const numRays = w / 4; 
            const zBuffer = new Array(Math.ceil(numRays)).fill(0);

            ctx.clearRect(0,0,w,h);
            
            // 1. Sky & Floor
            // ★修正: 動画または画像の準備チェック
            let isBgReady = false;
            if (mapEngine.bgImage) {
                if (mapEngine.isVideo) {
                    isBgReady = (mapEngine.bgImage.readyState >= 2);
                } else {
                    isBgReady = (mapEngine.bgImage.complete && mapEngine.bgImage.naturalWidth !== 0);
                }
            }

            if (isBgReady) {
                const img = mapEngine.bgImage;
                // 動画でも videoWidth/videoHeight があるので描画ロジックは同じでOK
                const bgW = mapEngine.isVideo ? img.videoWidth : img.width;
                const bgH = mapEngine.isVideo ? img.videoHeight : img.height;
                
                const skyHeight = h / 2;
                const skyWidth = (bgW / bgH) * skyHeight; 
                let angle = (p.dir % (Math.PI * 2));
                if (angle < 0) angle += Math.PI * 2;
                const ratio = angle / (Math.PI * 2);
                const offsetX = -(ratio * skyWidth * 2) % skyWidth; 
                for (let i = -1; i < 4; i++) { ctx.drawImage(img, offsetX + (i * skyWidth), 0, skyWidth + 1, skyHeight); }
            } else {
                ctx.fillStyle = '#333'; ctx.fillRect(0, 0, w, h / 2);
            }
            const floorGradient = ctx.createLinearGradient(0, h/2, 0, h);
            floorGradient.addColorStop(0, '#111'); floorGradient.addColorStop(1, '#555'); 
            ctx.fillStyle = floorGradient; ctx.fillRect(0, h / 2, w, h / 2);

            // ... (以下、壁とスプライトの描画処理は変更なし) ...
            // 2. Wall Casting
            for (let i=0; i<numRays; i++) {
                const rayAngle = (p.dir - fov/2) + (i/numRays)*fov;
                const eyeX = Math.cos(rayAngle); const eyeY = Math.sin(rayAngle);
                let dist = 0; let hit = false; let color = '#888';
                let testX = p.x; let testY = p.y;
                let side = 0;

                for(let d=0; d<20*grid; d+=2) {
                    let prevX = testX; let prevY = testY;
                    testX += eyeX * 2; testY += eyeY * 2;
                    const gx = Math.floor(testX/grid); const gy = Math.floor(testY/grid);
                    
                    if(gx<0||gx>=map.width||gy<0||gy>=map.height) { hit=true; dist=d; break; }
                    
                    const obj = mapEngine.activeObjects.find(o => o.x===gx && o.y===gy && o.isWall);
                    if(obj && obj.visualType !== 'image') { 
                        hit=true; dist=d; color = obj.color || '#888';
                        const prevGx = Math.floor(prevX/grid); const prevGy = Math.floor(prevY/grid);
                        if (prevGx !== gx) side = 0; else if (prevGy !== gy) side = 1;
                        break; 
                    }
                }
                
                if(hit) {
                    const ca = p.dir - rayAngle; dist = dist * Math.cos(ca);
                    zBuffer[i] = dist; // Zバッファに記録
                    const lineH = (grid * h) / (dist + 0.1);
                    const stripX = i * 4;
                    const brightness = Math.max(0, 1.0 - (dist / (15 * grid)));
                    ctx.filter = \`brightness(\${Math.floor(brightness * 100)}%)\`;
                    ctx.fillStyle = color; 
                    ctx.fillRect(stripX, (h/2) - (lineH/2), 4, lineH);
                    ctx.filter = 'none';
                } else {
                    zBuffer[i] = 99999;
                }
            }

            // 3. Sprite Casting (Billboarding)
            const sprites = mapEngine.activeObjects
                .filter(o => o.visualType === 'image')
                .map(o => {
                    const sx = (o.currentX !== undefined ? o.currentX : o.x * grid) + grid/2;
                    const sy = (o.currentY !== undefined ? o.currentY : o.y * grid) + grid/2;
                    const dx = sx - p.x;
                    const dy = sy - p.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    return { ...o, sx, sy, dist };
                })
                .sort((a, b) => b.dist - a.dist);

            sprites.forEach(sprite => {
                const dx = sprite.sx - p.x;
                const dy = sprite.sy - p.y;

                let spriteAngle = Math.atan2(dy, dx) - p.dir;
                while (spriteAngle < -Math.PI) spriteAngle += 2*Math.PI;
                while (spriteAngle > Math.PI) spriteAngle -= 2*Math.PI;

                if (Math.abs(spriteAngle) < fov / 1.5) {
                    const viewDist = (w/2) / Math.tan(fov/2);
                    const screenX = (w/2) + Math.tan(spriteAngle) * viewDist;
                    const spriteH = (grid / sprite.dist) * viewDist;
                    const spriteW = spriteH;

                    if (sprite.charId && gameData.assets.characters[sprite.charId]) {
                        if (!mapEngine.imgCache[sprite.charId]) {
                            const img = new Image(); img.src = gameData.assets.characters[sprite.charId].data;
                            mapEngine.imgCache[sprite.charId] = img;
                        }
                        const img = mapEngine.imgCache[sprite.charId];
                        if (img.complete && img.width > 0) {
                            const stripIdx = Math.floor(screenX / 4);
                            if (stripIdx >= 0 && stripIdx < numRays) {
                                if (sprite.dist < zBuffer[stripIdx]) {
                                    const brightness = Math.max(0, 1.0 - (sprite.dist / (15 * grid)));
                                    ctx.filter = \`brightness(\${Math.floor(brightness * 100)}%)\`;
                                    
                                    const asset = gameData.assets.characters[sprite.charId];
                                    const cols = asset.cols || 1;
                                    const rows = asset.rows || 1;
                                    let frame = 0;
                                    if(cols > 1 || rows > 1) {
                                        const now = performance.now();
                                        const totalFrames = cols * rows;
                                        const fps = asset.fps || 12;
                                        frame = Math.floor(now / (1000/fps)) % totalFrames;
                                    }
                                    const col = frame % cols;
                                    const row = Math.floor(frame / cols);
                                    const frameW = img.width / cols;
                                    const frameH = img.height / rows;
                                    
                                    ctx.drawImage(img, 
                                        col * frameW, row * frameH, frameW, frameH, 
                                        screenX - spriteW/2, (h/2) - (spriteH/2) + (spriteH*0.2), 
                                        spriteW, spriteH
                                    );
                                    ctx.filter = 'none';
                                }
                            }
                        }
                    }
                }
            });

            // Minimap (Top-Left)
            const mw=100; const mh=100; const scale=mw/(map.width*grid);
            const mx = 10; const my = 10; 
            ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(mx, my, mw, mh);
            mapEngine.activeObjects.forEach(o=>{ 
                if(o.isWall) { ctx.fillStyle=o.color||'#fff'; ctx.fillRect(mx + o.x*grid*scale, my+o.y*grid*scale, grid*scale, grid*scale); }
            });
            ctx.fillStyle='red'; ctx.beginPath(); ctx.arc(mx+p.x*scale, my+p.y*scale, 2, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle='yellow'; ctx.lineWidth = 2; ctx.beginPath(); 
            ctx.moveTo(mx+p.x*scale, my+p.y*scale);
            ctx.lineTo(mx+p.x*scale + Math.cos(p.dir)*15, my+p.y*scale + Math.sin(p.dir)*15);
            ctx.stroke();
        }

        // --- Map Update Functions ---
function updateMapGame(dt) {
            const timeScale = dt / 16.666; 
            const p = mapEngine.player; 
            const map = mapEngine.data; 
            const grid = mapEngine.GRID;
            const w = mapEngine.canvas.width;
            const h = mapEngine.canvas.height;
            
            mapEngine.activeObjects = map.objects.filter(obj => checkCondition(obj));
            mapEngine.activeObjects.forEach(obj => updateObjectMovement(obj, dt, timeScale));
            
            if(mapEngine.eventCooldown > 0) mapEngine.eventCooldown -= timeScale;

            // --- プレイヤー移動入力 ---
            let dx = 0, dy = 0;
            if (mapEngine.keys['ArrowLeft']) dx = -1; if (mapEngine.keys['ArrowRight']) dx = 1;
            
            // --- タイプ別移動処理 ---
            if (map.type === 'side') {
                const cx = Math.floor((p.x + p.w/2) / grid); const cy = Math.floor((p.y + p.h/2) / grid);
                const ladder = mapEngine.activeObjects.find(o => o.x === cx && o.y === cy && o.effectType === 'ladder');
                if (ladder) { if (mapEngine.keys['ArrowUp'] || mapEngine.keys['ArrowDown']) { p.isClimbing = true; p.vx = 0; p.vy = 0; } } else { p.isClimbing = false; }
                if (p.isClimbing) {
                    if (mapEngine.keys['ArrowUp']) p.y -= 2 * timeScale; if (mapEngine.keys['ArrowDown']) p.y += 2 * timeScale;
                    p.vx = dx * 2; p.vy = 0; if (mapEngine.keys['Space']) { p.isClimbing = false; p.vy = -5; mapEngine.keys['Space'] = false; }
                } else {
                    p.vx = dx * p.speed; p.vy += p.gravity * timeScale;
                    if ((mapEngine.keys['ArrowUp'] || mapEngine.keys['Space']) && p.onGround) { p.vy = p.jumpPower; p.onGround = false; }
                }
            } else if (map.type === 'shooter') {
                if (mapEngine.keys['ArrowUp']) dy = -1; if (mapEngine.keys['ArrowDown']) dy = 1;
                p.vx = dx * p.speed; p.vy = dy * p.speed; 
                mapEngine.bgScrollY += (map.scrollSpeed || 2) * timeScale;
            } else {
                if (mapEngine.keys['ArrowUp']) dy = -1; if (mapEngine.keys['ArrowDown']) dy = 1; 
                p.vx = dx * p.speed; p.vy = dy * p.speed;
            }
            
            // プレイヤー座標更新
            p.x += p.vx * timeScale; checkWallCollision(p, map, 'x'); 
            p.y += p.vy * timeScale; p.onGround = false; checkWallCollision(p, map, 'y');

            // --- カメラ制御と強制スクロール ---
            const maxCamX = Math.max(0, map.width * grid - w);
            const maxCamY = Math.max(0, map.height * grid - h);
            
            // 強制スクロールがある場合、カメラを動かす
            if (map.scrollDir && map.scrollDir !== 'none') {
                const sSpeed = (map.scrollSpeed || 1) * timeScale;
                
                if (map.scrollDir === 'right') mapEngine.camera.x += sSpeed;
                else if (map.scrollDir === 'left') mapEngine.camera.x -= sSpeed;
                else if (map.scrollDir === 'down') mapEngine.camera.y += sSpeed;
                else if (map.scrollDir === 'up') mapEngine.camera.y -= sSpeed;
                
                mapEngine.camera.x = Math.max(0, Math.min(mapEngine.camera.x, maxCamX));
                mapEngine.camera.y = Math.max(0, Math.min(mapEngine.camera.y, maxCamY));
                
            } else {
                if (map.type !== 'shooter') {
                    mapEngine.camera.x = p.x + p.w/2 - w/2; 
                    mapEngine.camera.y = p.y + p.h/2 - h/2;
                    mapEngine.camera.x = Math.max(0, Math.min(mapEngine.camera.x, maxCamX)); 
                    mapEngine.camera.y = Math.max(0, Math.min(mapEngine.camera.y, maxCamY));
                }
            }
            
            // ★修正: プレイヤーをカメラ枠内に補正（押し戻し量を計算）
            let pushX = 0;
            let pushY = 0;
            
            if (p.x < mapEngine.camera.x) pushX = mapEngine.camera.x - p.x;
            if (p.x + p.w > mapEngine.camera.x + w) pushX = (mapEngine.camera.x + w - p.w) - p.x;
            if (p.y < mapEngine.camera.y) pushY = mapEngine.camera.y - p.y;
            if (p.y + p.h > mapEngine.camera.y + h) pushY = (mapEngine.camera.y + h - p.h) - p.y;
            
            p.x += pushX;
            p.y += pushY;
            
            // ★追加: 挟まれ（クラッシュ）判定
            // 押し戻しが発生し、かつその方向に壁がある場合にイベントを発動
            if (map.crushEventNodeId) {
                let crushed = false;
                
                // 画面左端に押され、かつ左に壁がある
                if (pushX > 0 && p.vx <= 0 && isCrushWall(p.x - 1, p.y + p.h/2, map)) crushed = true;
                // 画面右端に押され、かつ右に壁がある
                if (pushX < 0 && p.vx >= 0 && isCrushWall(p.x + p.w + 1, p.y + p.h/2, map)) crushed = true;
                // 画面上端に押され、かつ上に壁がある
                if (pushY > 0 && p.vy <= 0 && isCrushWall(p.x + p.w/2, p.y - 1, map)) crushed = true;
                // 画面下端に押され、かつ下に壁がある
                if (pushY < 0 && p.vy >= 0 && isCrushWall(p.x + p.w/2, p.y + p.h + 1, map)) crushed = true;

                if (crushed) {
                    processNode(map.crushEventNodeId);
                    return; // マップ処理を中断
                }
            }
            
            // 落下判定 (サイドビュー)
            if (map.type === 'side' && p.y > map.height * grid) { p.y = 0; p.vy = 0; } 
            
            checkMapEvents(p);
        }

        // ★追加: 挟まれ判定用の壁チェックヘルパー関数
        function isCrushWall(x, y, map) {
            const gx = Math.floor(x / mapEngine.GRID);
            const gy = Math.floor(y / mapEngine.GRID);
            if (gx < 0 || gx >= map.width || gy < 0 || gy >= map.height) return true; // マップ外は壁扱い
            const obj = mapEngine.activeObjects.find(o => o.x === gx && o.y === gy && o.isWall);
            return !!obj;
        }

        function updateDungeonGame(dt) {
            const timeScale = dt / 16.666; 
            const p = mapEngine.player; const grid = mapEngine.GRID;
            const rotSpeed = 0.05 * timeScale; const moveSpeed = 4 * timeScale;
            
            if(mapEngine.eventCooldown > 0) mapEngine.eventCooldown -= timeScale;
            
            if(mapEngine.keys['ArrowLeft']) p.dir -= rotSpeed;
            if(mapEngine.keys['ArrowRight']) p.dir += rotSpeed;
            
            let moveStep = 0;
            if(mapEngine.keys['ArrowUp']) moveStep = moveSpeed;
            if(mapEngine.keys['ArrowDown']) moveStep = -moveSpeed;
            
            if(moveStep !== 0) {
                const nextX = p.x + Math.cos(p.dir) * moveStep;
                const nextY = p.y + Math.sin(p.dir) * moveStep;
                const gx = Math.floor(nextX / grid); const gy = Math.floor(nextY / grid);
                const map = mapEngine.data;
                const isWall = mapEngine.activeObjects.find(o => o.x === gx && o.y === gy && o.isWall);
                if(!isWall && gx>=0 && gx<map.width && gy>=0 && gy<map.height) { p.x = nextX; p.y = nextY; }
            }
            checkMapEvents(p);
        }

        // --- Core Logic ---
        function processNode(nodeId) {
            if (!nodeId) return; const node = findNode(nodeId); if (!node) return;
            currentPlayingNodeId = nodeId; isWaitingForInput = false;
            if (node.type === 'text') processText(node);
            else if (node.type === 'choice') processChoice(node);
            else if (node.type === 'variable') processVariable(node);
            else if (node.type === 'conditional') processConditional(node);
            else if (node.type === 'map') startMapMode(node);
        }
        function findNode(id) { for (const s in gameData.scenario.sections) { if (gameData.scenario.sections[s].nodes[id]) return gameData.scenario.sections[s].nodes[id]; } return null; }

function processText(node) {
            if (node.backgroundId && gameData.assets.backgrounds[node.backgroundId]) { 
                const asset = gameData.assets.backgrounds[node.backgroundId]; 
                const target = activeBg===1 ? ui.bg2 : ui.bg1; 
                const old = activeBg===1 ? ui.bg1 : ui.bg2;

                // 1. 新しい背景をセット
                if (asset.data.startsWith('data:video')) {
                    target.innerHTML = ''; 
                    const vid = document.createElement('video');
                    vid.src = asset.data;
                    vid.autoplay = true;
                    vid.loop = true;
                    vid.muted = false; 
                    vid.playsInline = true;
                    vid.className = 'bg-video';
                    target.appendChild(vid);
                    target.style.backgroundImage = 'none';
                } else {
                    target.innerHTML = ''; 
                    target.style.backgroundImage = \`url(\${asset.data})\`;
                }
                
                // 2. クロスフェード（表示切り替え）
                old.style.opacity = 0; 
                target.style.opacity = 1; 
                
                // ★追加: 0.5秒後(フェードアウト完了後)に、古い背景の中身を完全に消す
                // これで動画も停止し、音声も消えます
                setTimeout(() => {
                    old.innerHTML = '';
                    old.style.backgroundImage = 'none';
                }, 500);

                activeBg = activeBg===1 ? 2 : 1; 
            }
            
            ui.charaContainer.innerHTML=''; 
            
            animState.characters = []; 
            (node.characters||[]).forEach(c=>{ 
                if(!gameData.assets.characters[c.characterId])return; 
                const asset = gameData.assets.characters[c.characterId];
                
                let d;
                const s = (c.scale||100)/100; 
                const posX = c.x || 0;
                const posY = c.y || 0;

                if (asset.cols > 1 || asset.rows > 1) {
                    d = document.createElement('div');
                    d.className = \`sprite-char-div pos-\${c.position||'bottom-center'}\`;
                    d.style.backgroundImage = \`url(\${asset.data})\`;
                    const frameW = asset.width / asset.cols;
                    const frameH = asset.height / asset.rows;
                    d.style.width = \`\${frameW}px\`;
                    d.style.height = \`\${frameH}px\`;
                    d.style.backgroundSize = \`\${asset.width}px \${asset.height}px\`;
                    d.style.backgroundPosition = '0 0';
                    animState.characters.push({ id: c.characterId, element: d, timer: 0, frame: 0 });
                } else {
                    d = document.createElement('img');
                    d.className = \`sprite-char-img pos-\${c.position||'bottom-center'}\`;
                    d.src = asset.data;
                }

                d.style.transform=\`translateX(calc(-50% + \${posX}px)) translateY(\${posY}px) scale(\${s})\`; 
                if(c.maskId){
                    const m=\`url(\${gameData.assets.characters[c.maskId].data})\`;
                    d.style.webkitMaskImage=m;
                    d.style.maskImage=m;
                } 
                setTimeout(()=>d.classList.add('loaded'),10); 
                ui.charaContainer.appendChild(d); 
            });

            threeHandler.hideAll();
            if (node.characters3d) { 
                node.characters3d.forEach(c => { 
                    if(c.modelId) {
                        threeHandler.showModel(c.modelId, { 
                            posX:c.posX, posY:c.posY, posZ:c.posZ, 
                            rotX:c.rotX, rotY:c.rotY, rotZ:c.rotZ, 
                            scale:c.scale, 
                            animationId:c.animationId,
                            expression: c.expression // ★表情データを渡す
                        });
                    }
                }); 
            }
            ui.name.style.display = node.customName?'block':'none'; ui.name.textContent = node.customName ? replaceVariablesInText(node.customName) : '';
            ui.msg.innerHTML = node.message||''; ui.textBox.style.display = node.message?'block':'none'; ui.choices.innerHTML=''; ui.overlay.style.display='block';
            if(node.message) backLog.push({name:node.customName, text:node.message, type:'text'});
            if (node.bgmId) { if (node.bgmId === 'stop') { if(currentBgmAudio) currentBgmAudio.pause(); currentBgmAudio=null; } else if (node.bgmId !== currentBgmId && gameData.assets.sounds[node.bgmId]) { if(currentBgmAudio) currentBgmAudio.pause(); const bgm = gameData.assets.sounds[node.bgmId]; currentBgmAudio = new Audio(bgm.data); currentBgmAudio.loop = true; currentBgmId = node.bgmId; if(hasInteracted) currentBgmAudio.play().catch(e=>{}); } }
            if (node.soundId && gameData.assets.sounds[node.soundId]) { const se = new Audio(gameData.assets.sounds[node.soundId].data); if(hasInteracted) se.play().catch(e=>{}); else queuedSound = se; }
            
            if(node.effect) { 
                if (node.effect.startsWith('flash') || node.effect.startsWith('fade')) {
                    ui.effect.className = 'fx-' + node.effect; 
                    setTimeout(() => ui.effect.className = '', 1000);
                } else if (node.effect.startsWith('shake')) {
                    ui.container.className = 'fx-' + node.effect; 
                    setTimeout(() => ui.container.className = '', 1000);
                } 
            }
            
            currentNodeId = node.nextNodeId; isWaitingForInput = true; checkAuto();
        }
        function processChoice(node) {
            stopAutoSkip(); ui.textBox.style.display='none'; ui.choices.innerHTML=''; ui.overlay.style.display='none';
            node.choices.forEach(c=>{ const b=document.createElement('div'); b.className='choice-button'; b.textContent=replaceVariablesInText(c.text); b.onclick=(e)=>{e.stopPropagation(); userInteraction(); backLog.push({text:c.text, type:'choice'}); processNode(c.nextNodeId);}; ui.choices.appendChild(b); });
        }
        function processVariable(node) {
            const target=node.targetVariable; const val=resolveValue(node.value);
            if(gameState[target]===undefined) gameState[target]=0;
            let cur=gameState[target]; if(!isNaN(cur)) cur=Number(cur); const opVal=!isNaN(val)?Number(val):val;
            if(node.operator==='=') gameState[target]=opVal; else if(node.operator==='+=') gameState[target]=cur+opVal; else if(node.operator==='-=') gameState[target]=cur-opVal; else if(node.operator==='*=') gameState[target]=cur*opVal; else if(node.operator==='/=') gameState[target]=cur/opVal;
            processNode(node.nextNodeId);
        }
        function processConditional(node) {
            let jumped=false; for(const cond of node.conditions) { if(evaluateCondition(cond)){ processNode(cond.nextNodeId); jumped=true; break; } }
            if(!jumped) processNode(node.elseNextNodeId);
        }
        function updateSpriteAnimation(state, dt) { 
            if(!state.id || !state.element) return; 
            const type = (state.element.id && state.element.id.includes('background')) ? 'backgrounds' : 'characters'; 
            const asset = gameData.assets[type][state.id]; 
            if(!asset || (asset.cols||1) <= 1 && (asset.rows||1) <= 1) return; 
            
            state.timer += dt; 
            if(state.timer >= 1000/(asset.fps||12)) { 
                state.timer = 0; 
                state.frame++; 
                const total = (asset.cols||1)*(asset.rows||1); 
                if(state.frame >= total) state.frame = (asset.loop!==false) ? 0 : total-1; 
                
                const col = state.frame % (asset.cols||1); 
                const row = Math.floor(state.frame / (asset.cols||1)); 
                
                const frameW = asset.width / asset.cols;
                const frameH = asset.height / asset.rows;
                const x = col * frameW;
                const y = row * frameH;
                
                state.element.style.backgroundPosition = \`-\${x}px -\${y}px\`; 
            } 
        }
// --- Map Start/End (ここを追加) ---
function startMapMode(node) {
            stopAutoSkip(); 
            isMapMode = true; 
            const mapId = node.mapId; 
            const mapData = gameData.maps[mapId]; 
            if (!mapData) return;
            
            layers.map.style.display = 'block'; 
            ui.textBox.style.display = 'none'; 
            ui.overlay.style.display = 'none';
            ui.mapControls.classList.add('active'); 
            ui.mapActionBtn.classList.add('active');
            
            mapEngine.data = mapData; 
            mapEngine.currentMapId = mapId; 
            mapEngine.camera = { x: 0, y: 0 }; 
            mapEngine.bgScrollY = 0; 
            mapEngine.bgImage = null;
            mapEngine.isVideo = false; // ★追加: 動画フラグ

            if (mapData.bgImageId && gameData.assets.backgrounds[mapData.bgImageId]) { 
                const asset = gameData.assets.backgrounds[mapData.bgImageId];
                
                // ★修正: 動画か画像かで読み込み方を変える
                if (asset.data.startsWith('data:video')) {
                    const vid = document.createElement('video');
                    vid.src = asset.data;
                    vid.autoplay = true;
                    vid.loop = true;
                    vid.muted = false; // 音あり
                    vid.playsInline = true;
                    vid.play(); // 再生開始
                    mapEngine.bgImage = vid;
                    mapEngine.isVideo = true;
                } else {
                    const img = new Image(); 
                    img.src = asset.data; 
                    mapEngine.bgImage = img;
                    mapEngine.isVideo = false;
                }
            }
            
            let startX = 1, startY = 1;
            if(node.spawnId) { const s=mapData.objects.find(o=>o.isSpawn&&o.spawnId===node.spawnId); if(s){startX=s.x;startY=s.y;} }
            else if(mapEngine.player.x===0 && mapEngine.player.y===0) { const s=mapData.objects.find(o=>o.isSpawn); if(s){startX=s.x;startY=s.y;} } 
            else { startX = Math.round(mapEngine.player.x/mapEngine.GRID); startY = Math.round(mapEngine.player.y/mapEngine.GRID); }
            
            mapEngine.player.x = startX * mapEngine.GRID; 
            mapEngine.player.y = startY * mapEngine.GRID;
            mapEngine.player.vx = 0; 
            mapEngine.player.vy = 0; 
            mapEngine.player.onGround = false;
            
            if(mapEngine.player.dir === undefined) mapEngine.player.dir = 0.5 * Math.PI; // 南向き
            
            mapEngine.activeObjects = mapData.objects.filter(obj => checkCondition(obj));
            mapEngine.activeObjects.forEach(obj => { 
                obj.currentX = obj.x * mapEngine.GRID; 
                obj.currentY = obj.y * mapEngine.GRID; 
                obj.moveTimer = 0; 
                obj.dirX = Math.random() > 0.5 ? 1 : -1; 
                obj.dirY = Math.random() > 0.5 ? 1 : -1; 
            });
            
            const container = document.getElementById('game-container');
            mapEngine.canvas.width = container.clientWidth;
            mapEngine.canvas.height = container.clientHeight;
            
            mapEngine.eventCooldown = 60; 
        }
function endMapMode() { 
            isMapMode = false; 
            layers.map.style.display = 'none'; 
            ui.mapControls.classList.remove('active'); 
            ui.mapActionBtn.classList.remove('active'); 
            
            // ★追加: 動画なら停止してメモリ節約
            if (mapEngine.isVideo && mapEngine.bgImage) {
                mapEngine.bgImage.pause();
                mapEngine.bgImage = null;
            }
        }
        // --- Main Loop & Init ---

        function mainLoop(timestamp) {
            const dt = timestamp - lastTime; lastTime = timestamp;
            if (isMapMode) { 
                if (mapEngine.data.type === 'dungeon') {
                    updateDungeonGame(dt);
                    renderRaycastGame();
                } else {
                    updateMapGame(dt);
                    renderMapGame();
                }
            } else { 
                updateSpriteAnimation(animState.bg, dt); 
                animState.characters.forEach(st => updateSpriteAnimation(st, dt)); 
            }
            threeHandler.updateAndRender();
            requestAnimationFrame(mainLoop);
        }

window.onload = async () => {
            const canvas = document.getElementById('character-canvas');
            threeHandler.init(canvas);
            await threeHandler.loadAssets();
            
            const loader = document.getElementById('loading-screen');
            const loadText = document.getElementById('loading-text');
            
            // ★変更点: ロード完了後、クリック待機状態にする
            loader.classList.add('ready');
            loadText.textContent = "CLICK TO START";
            
            // ★クリックされたらゲーム開始
            loader.addEventListener('click', () => {
                loader.style.opacity = 0; 
                setTimeout(() => loader.style.display = 'none', 500);
                
                // ここで初めてゲーム処理を開始
                const adv = () => { stopAutoSkip(); if(isWaitingForInput) processNode(currentNodeId); };
                ui.overlay.addEventListener('click', adv); ui.textBox.addEventListener('click', adv);
                
                document.querySelectorAll('.pad-btn').forEach(btn => {
                    const start = (e) => { e.preventDefault(); mapEngine.keys[btn.dataset.key] = true; };
                    const end = (e) => { e.preventDefault(); mapEngine.keys[btn.dataset.key] = false; };
                    btn.addEventListener('mousedown', start); btn.addEventListener('mouseup', end);
                    btn.addEventListener('mouseleave', end); btn.addEventListener('touchstart', start);
                    btn.addEventListener('touchend', end);
                });
                const actBtn = document.getElementById('map-action-btn');
                const actStart = (e) => { e.preventDefault(); mapEngine.keys['Space'] = true; };
                const actEnd = (e) => { e.preventDefault(); mapEngine.keys['Space'] = false; };
                actBtn.addEventListener('mousedown', actStart); actBtn.addEventListener('mouseup', actEnd);
                actBtn.addEventListener('mouseleave', actEnd); actBtn.addEventListener('touchstart', actStart);
                actBtn.addEventListener('touchend', actEnd);

                // リサイズ監視
                window.addEventListener('resize', () => {
                    const container = document.getElementById('game-container');
                    const w = container.clientWidth;
                    const h = container.clientHeight;
                    threeHandler.resize(w, h);
                    if (mapEngine.canvas) {
                        mapEngine.canvas.width = w;
                        mapEngine.canvas.height = h;
                    }
                });

                if(currentNodeId && currentNodeId !== "null") processNode(currentNodeId);
                requestAnimationFrame(mainLoop);
                
            }, { once: true }); // クリックイベントは1回だけ実行
        };
    <\/script>
</body>
</html>`;
}

export function exportGame() {
    const projectData = getProjectData();
    if (!projectData.scenario.startNodeId) { alert('エラー: 開始ノード設定なし'); return; }
    try {
        const gameHtml = generateGameHtml(projectData);
        const blob = new Blob([gameHtml], { type: 'text/html' });
        const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'game.html';
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    } catch (e) { console.error(e); alert('書き出しエラー'); }
}
