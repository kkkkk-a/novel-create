// export.js

import { getProjectData } from './state.js';

export function generateGameHtml(data, startNodeOverride = null) {
    // スクリプトタグの閉じ括弧をエスケープしてHTML破損を防止
const dataString = JSON.stringify(data)
    .replace(/<\/script>/g, '<\\/script>')
    .replace(/\u2028/g, '\\u2028') // 行区切り文字対策
    .replace(/\u2029/g, '\\u2029') // 段落区切り文字対策
            .replace(/`/g, '\\`')      // 追加: バッククォートをエスケープ
        .replace(/\$\{/g, '\\${'); // 追加: テンプレート変数をエスケープ
    const initialNodeId = startNodeOverride || data.scenario.startNodeId;
    
// --- Settings ---
    const s = data.settings || {};
    const titleBgStyle = s.titleImage 
        ? `background: url('${s.titleImage}') center/cover no-repeat;` 
        : `background: #000;`;
    s.windowColor = s.windowColor || '#000000';
    s.windowOpacity = s.windowOpacity !== undefined ? s.windowOpacity : 75;
    s.buttonColor = s.buttonColor || '#1990ff';
    s.buttonOpacity = s.buttonOpacity !== undefined ? s.buttonOpacity : 80;
    s.buttonTextColor = s.buttonTextColor || '#FFFFFF';
    
    // 背景表示モードのCSS値を決定
    const bgFitSetting = s.backgroundFit || 'cover';
    let cssBgSize = 'cover';      // 画像用 (background-size)
    let cssObjFit = 'cover';      // 動画用 (object-fit)

    if (bgFitSetting === 'contain') {
        cssBgSize = 'contain';
        cssObjFit = 'contain';
    } else if (bgFitSetting === 'fill') {
        cssBgSize = '100% 100%';
        cssObjFit = 'fill'; // ★ 動画の場合は 'fill' を使って画面に合わせる
    }
    
    s.borderRadius = s.borderRadius !== undefined ? s.borderRadius : 10;
    s.borderWidth = s.borderWidth !== undefined ? s.borderWidth : 2;
    s.borderColor = s.borderColor || '#FFFFFF';
    
    // Portrait UI
    const m = s.portraitUI || {};
    m.windowVertical = m.windowVertical || 'bottom';
    m.windowHeight = m.windowHeight !== undefined ? m.windowHeight : 35;
        const choiceLayout = m.choiceLayout || 'center-v';
    // ベースCSSに overflow-x: hidden を追加（デフォルトではスクロールバーを出さない）
    let choiceBoxCss = `position: absolute; z-index: 30; pointer-events: auto; transition: all 0.3s ease-out; display: flex; gap: 15px; overflow-x: hidden;`;

    switch (choiceLayout) {
        case 'center-h': // 中央・横
            choiceBoxCss += ` top: 50%; left: 50%; transform: translate(-50%, -50%); width: 90%; flex-direction: row; justify-content: center; flex-wrap: wrap;`;
            break;
        case 'bottom-h': // 下部・横 (★修正: 横スクロール対応)
            choiceBoxCss += ` bottom: 40px; left: 0; width: 100%; flex-direction: row; justify-content: flex-start; flex-wrap: nowrap; align-items: flex-end; overflow-x: auto; padding: 0 20px;`;
            break;
        case 'top-h': // 上部・横 (★修正: 横スクロール対応)
            choiceBoxCss += ` top: 40px; left: 0; width: 100%; flex-direction: row; justify-content: flex-start; flex-wrap: nowrap; align-items: flex-start; overflow-x: auto; padding: 0 20px;`;
            break;
        case 'left-v': // 左端・縦
            choiceBoxCss += ` top: 50%; left: 5%; transform: translateY(-50%); width: 30%; flex-direction: column; align-items: flex-start;`;
            break;
        case 'right-v': // 右端・縦
            choiceBoxCss += ` top: 50%; right: 5%; transform: translateY(-50%); width: 30%; flex-direction: column; align-items: flex-end;`;
            break;
        case 'grid-2': // グリッド2列
            choiceBoxCss += ` top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80%; display: grid; grid-template-columns: 1fr 1fr; gap: 15px; text-align: center;`;
            break;
        case 'grid-3': // グリッド3列
            choiceBoxCss += ` top: 50%; left: 50%; transform: translate(-50%, -50%); width: 90%; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; text-align: center;`;
            break;
        case 'spread': // 四隅分散
            choiceBoxCss += ` top: 10%; left: 5%; width: 90%; height: 80%; display: grid; grid-template-columns: 1fr 1fr; align-content: space-between; gap: 20px;`;
            break;
        default: // center-v (標準)
            choiceBoxCss += ` top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80%; flex-direction: column; align-items: stretch;`;
            break;
    }
    // ★修正: 入力ノードでフォームを上書きした際に、操作が効かなくなる(沈黙する)のを防ぐ
    choiceBoxCss += ` z-index: 150 !important; `;
    
    m.choiceDirection = m.choiceDirection || 'vertical';
    m.choiceAlign = m.choiceAlign || 'center';
    m.characterOffsetY = m.characterOffsetY !== undefined ? m.characterOffsetY : 0;

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

        // 設定が false (または undefined で初期値 false 扱いにならないよう注意) なら非表示
    // ※ ui.js でデフォルト true にしていますが、ここでも念のためガードします
    const chk = (key) => (s[key] !== false) ? '' : 'style="display:none;"';
    
    // セーブ機能一式用
    const saveStyle = chk('showSaveMenu');

    const debugStyle = s.debugMode ? '' : 'style="display:none;"';

        const faviconData = s.favicon || 'data:image/x-icon;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAABzpVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAAAEklEQVQ4y2NkYGD4z0AEYBXSCgG7HgMz5yUY7wAAAABJRU5ErkJggg=='; 

            let needs3D = false;

    // 1. 3Dモデルアセットがあるか確認
    if (data.assets && data.assets.models && Object.keys(data.assets.models).length > 0) {
        needs3D = true;
    }

    // 2. 3D系のマップがあるか確認
    if (!needs3D && data.maps) {
        for (const mapId in data.maps) {
            const map = data.maps[mapId];
            if (['3d', 'dungeon', 'quarter', 'mode7'].includes(map.type) || map.stageModelId) {
                needs3D = true;
                break;
            }
        }
    }

    // HTMLヘッダー用のスクリプトタグ（3Dが必要な場合のみ出力）
    const importMapBlock = needs3D ? `
    <script async src="https://unpkg.com/es-module-shims@1.8.0/dist/es-module-shims.js"><\/script>
    <script type="importmap">
    {
        "imports": {
            "three": "https://esm.sh/three@0.169.0",
            "three/addons/": "https://esm.sh/three@0.169.0/examples/jsm/",
            "@pixiv/three-vrm": "https://esm.sh/@pixiv/three-vrm@3.0.0?external=three",
            "@pixiv/three-vrm-animation": "https://esm.sh/@pixiv/three-vrm-animation@3.0.0?external=three",
            "mmdparser": "https://esm.sh/three@0.169.0/examples/jsm/libs/mmdparser.module.js",
            "three/addons/loaders/MMDLoader.js": "https://esm.sh/three@0.169.0/examples/jsm/loaders/MMDLoader.js?external=three,mmdparser",
            "three/addons/animation/MMDAnimationHelper.js": "https://esm.sh/three@0.169.0/examples/jsm/animation/MMDAnimationHelper.js?external=three,mmdparser",
            "three/addons/animation/CCDIKSolver.js": "https://esm.sh/three@0.169.0/examples/jsm/animation/CCDIKSolver.js?external=three",
            "three/addons/animation/MMDPhysics.js": "https://esm.sh/three@0.169.0/examples/jsm/animation/MMDPhysics.js?external=three"
        }
    }
    <\/script>
    <script src="https://kripken.github.io/ammo.js/builds/ammo.js"><\/script>` : `<!-- 2D Mode: No external 3D libraries loaded -->`;

    // JS内のimport文（3Dが必要な場合のみ出力）
    const jsImports = needs3D ? `
        import * as THREE from 'three';
        import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
        import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
        import { VRMAnimationLoaderPlugin, createVRMAnimationClip } from '@pixiv/three-vrm-animation';
    ` : `
        const THREE = null; // ダミー定義
    `;

return `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Novel Game</title>
    <link rel="icon" href="${faviconData}">
    <link rel="apple-touch-icon" href="${faviconData}">
    <link href="https://fonts.googleapis.com/css2?family=DotGothic16&family=Klee+One&family=M+PLUS+Rounded+1c:wght@400;700&family=Shippori+Mincho&display=swap" rel="stylesheet">
    
    ${importMapBlock}

<style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { height: 100%; margin: 0; padding: 0; font-family: sans-serif; background-color: #000; overflow: hidden; user-select: none; -webkit-user-select: none; touch-action: none; overscroll-behavior: none; }
        #game-container { position: relative; width: 100%; height: 100%; margin: 0; padding: 0; background-color: #000; overflow: hidden; touch-action: none; overscroll-behavior: none; }
        
        /* ★最適化: 入力フォームだけは、文字の選択やタッチ操作を許可する（これをしないとフォーカスが当たらず真っ黒になる） */
        input, textarea {
            user-select: auto;
            -webkit-user-select: auto;
            touch-action: auto;
        }

        #game-container { position: relative; width: 100%; height: 100%; margin: 0; padding: 0; background-color: #000; overflow: hidden; }
        #loading-screen { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #000; z-index: 9999; display: flex; flex-direction: column; justify-content: center; align-items: center; color: #fff; transition: opacity 0.5s; cursor: default; }
        #loading-screen.ready { cursor: pointer; background: #111; }
        #loading-screen.ready .spinner { display: none; }
        #loading-text { font-size: 1.2em; font-weight: bold; letter-spacing: 2px; animation: blink 1s infinite alternate; }
        @keyframes blink { from { opacity: 1; } to { opacity: 0.5; } }
        .spinner { width: 40px; height: 40px; border: 4px solid rgba(255,255,255,0.3); border-top: 4px solid #fff; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 15px; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        
                .layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; transition: opacity 0.5s; background-size: ${cssBgSize}; background-repeat: no-repeat; background-position: 50% 50%; pointer-events: none; }
        .bg-video { width: 100%; height: 100%; object-fit: ${cssObjFit}; position: absolute; top: 0; left: 0; pointer-events: none; z-index: 0; overflow: hidden; }
        
        #character-layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 10; transition: transform 0.3s ease-out; }
        .sprite-char-img { position: absolute; width: auto; height: 95%; object-fit: contain; opacity: 0; transition: opacity 0.3s, transform 0.3s; transform-origin: bottom center; }
        .sprite-char-div { position: absolute; opacity: 0; transition: opacity 0.3s, transform 0.3s; transform-origin: bottom center; background-repeat: no-repeat; image-rendering: pixelated; }
        .sprite-char-img.loaded, .sprite-char-div.loaded { opacity: 1; }
        
        .pos-bottom-left { bottom: 0; left: 15%; } .pos-bottom-center { bottom: 0; left: 50%; } .pos-bottom-right { bottom: 0; left: 85%; }
        .pos-center-left { bottom: 0; left: 15%; } .pos-center { bottom: 0; left: 50%; } .pos-center-right { bottom: 0; left: 85%; }
        .pos-top-left { top: 0; left: 15%; transform-origin: top center; } .pos-top-center { top: 0; left: 50%; transform-origin: top center; } .pos-top-right { top: 0; left: 85%; transform-origin: top center; }
        
        #text-box { position: absolute; bottom: 4%; left: 5%; width: 90%; height: auto; min-height: 30%; max-height: 50%; ${windowBgStyle} background-size: 100% 100%; color: #fff; border-radius: ${s.borderRadius}px; padding: 20px; box-sizing: border-box; ${windowBorderStyle} ${windowBackdropFilter} pointer-events: auto; z-index: 20; display: none; transition: all 0.3s ease-out; }
        #character-name { font-size: 1.4em; font-weight: 700; margin-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.3); min-height: 1em; color: ${s.buttonTextColor}; }
        #message { font-size: 1.2em; line-height: 1.6; max-height: 150px; overflow-y: auto; }
        
        /* 選択肢ボックス（動的CSS変数） */
        #choices-box { ${choiceBoxCss} }
        
        /* 選択肢スクロールバー設定 */
        #choices-box::-webkit-scrollbar { width: 8px; }
        #choices-box::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); border-radius: 4px; }
        #choices-box::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.5); border-radius: 4px; }
        #choices-box::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.8); }

        .choice-button { padding: 15px; font-size: 1.2em; cursor: pointer; text-align: center; ${buttonBgStyle} background-size: 100% 100%; border-radius: ${s.borderRadius}px; ${buttonBorderStyle} ${buttonBackdropFilter} transition: all 0.2s; color: ${s.buttonTextColor}; flex-shrink: 0; /* ★追加: 縮小禁止 */ }
        .choice-button:hover { transform: scale(1.02); filter: brightness(1.2); }

        .portrait #text-box { bottom: auto; left: 2%; width: 96%; min-height: 0; max-height: 80%; padding: 10px; }
        .portrait #character-name { font-size: 1.2em; margin-bottom: 5px; }
        .portrait #message { font-size: 1.0em; max-height: calc(100% - 30px); }
        .portrait #choices-box { width: 90%; }
        .portrait .choice-button { padding: 12px; font-size: 1.0em; }

        .ql-font-dotgothic { font-family: "DotGothic16", sans-serif; } .ql-font-rounded { font-family: "M PLUS Rounded 1c", sans-serif; } .ql-font-klee { font-family: "Klee One", cursive; } .ql-font-mincho-b { font-family: "Shippori Mincho", serif; }
        .ql-align-center { text-align: center; } .ql-align-right { text-align: right; } .ql-align-justify { text-align: justify; }

        #effect-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 100; opacity: 0; }
        @keyframes flash-white { 0% { background: white; opacity: 1; } 100% { opacity: 0; } } .fx-flash-white { animation: flash-white 1.0s ease-out; }
        @keyframes flash-red { 0% { background: red; opacity: 1; } 100% { opacity: 0; } } .fx-flash-red { animation: flash-red 1.0s ease-out; }
        @keyframes fade-black { 0% { background: black; opacity: 0; } 20% { opacity: 1; } 80% { opacity: 1; } 100% { opacity: 0; } } .fx-fade-black { animation: fade-black 1.0s ease-in-out; }
        @keyframes shake-small { 0%, 100% { transform: translate(0,0); } 25% { transform: translate(2px, 0); } 75% { transform: translate(-2px, 0); } } .fx-shake-small { animation: shake-small 0.5s ease-in-out; }
        @keyframes shake-medium { 0%, 100% { transform: translate(0,0); } 20% { transform: translate(-5px, 5px); } 40% { transform: translate(5px, -5px); } 60% { transform: translate(-5px, -5px); } 80% { transform: translate(5px, 5px); } } .fx-shake-medium { animation: shake-medium 0.6s ease-in-out; }
        @keyframes shake-hard { 0%, 100% { transform: translate(0,0); } 10% { transform: translate(-10px, -10px); } 30% { transform: translate(10px, 10px); } 50% { transform: translate(-10px, 10px); } 70% { transform: translate(10px, -10px); } 90% { transform: translate(-5px, 5px); } } .fx-shake-hard { animation: shake-hard 0.8s ease-in-out; }
        @keyframes encounter-flash { 0% { background-color: transparent; opacity: 0; } 10% { background-color: #fff; opacity: 0.8; } 20% { background-color: transparent; opacity: 0; } 30% { background-color: #fff; opacity: 0.8; } 40% { background-color: transparent; opacity: 0; } 50% { background-color: #fff; opacity: 1; } 60% { background-color: #000; opacity: 0; } 100% { background-color: #000; opacity: 1; } }
        .fx-encounter-flash { animation: encounter-flash 1.5s step-end forwards; z-index: 9999; }
        @keyframes encounter-shutter { 0% { clip-path: polygon(0 0, 100% 0, 100% 0, 0 0, 0 100%, 100% 100%, 100% 100%, 0 100%); background-color: #000; opacity: 1; } 50% { clip-path: polygon(0 0, 100% 0, 100% 10%, 0 10%, 0 90%, 100% 90%, 100% 100%, 0 100%); background-color: #000; opacity: 1; } 100% { clip-path: polygon(0 0, 100% 0, 100% 50%, 0 50%, 0 50%, 100% 50%, 100% 100%, 0 100%); background-color: #000; opacity: 1; } }
        .fx-encounter-shutter { background-color: #000; opacity: 1; animation: encounter-shutter 1.0s ease-in-out forwards; z-index: 9999; }

        #backlog-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 300; display: none; flex-direction: column; padding: 40px; color: #fff; }
        #backlog-content { flex: 1; overflow-y: auto; margin-bottom: 20px; } .log-entry { margin-bottom: 15px; border-bottom: 1px solid #444; padding-bottom: 10px; } .log-name { color: #f1c40f; font-weight: bold; } .log-choice { text-align: center; color: #40a9ff; border: 1px dashed #40a9ff; padding: 5px; }
        #backlog-close { align-self: center; padding: 10px 40px; cursor: pointer; background:#fff; color:#000; border-radius:20px; border:none; }
        
        #system-menu { position: absolute; top: 10px; right: 10px; z-index: 301; display: flex; gap: 5px; flex-wrap: wrap; justify-content: flex-end; max-width: 60%; transition: all 0.3s; }
        #system-menu.collapsed .sys-btn:not(#sys-toggle-btn) { display: none; }
        .sys-btn { background: rgba(0,0,0,0.5); border: 1px solid #aaa; color: #eee; padding: 5px; cursor: pointer; font-size:12px; } .sys-btn.active { color: yellow; border-color: yellow; } .sys-btn.danger { border-color: #f88; }
        #sys-toggle-btn { display: none; font-weight: bold; background: rgba(0,0,0,0.7); border: 1px solid #fff; }

        #click-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 10; cursor: pointer; display: none; }
        
        #map-layer { display:none; width: 100%; height: 100%; position: absolute; top: 0; left: 0; z-index: 5; }
        #map-canvas { position: absolute; top: 0; left: 0; z-index: 1; }
        #map-controls { position: absolute; bottom: 20px; left: 20px; z-index: 20; display: none; grid-template-columns: 60px 60px 60px; grid-template-rows: 60px 60px; gap: 10px; pointer-events: auto !important; }
        #map-controls.active { display: grid !important; }
        .pad-btn { width: 60px; height: 60px; background: rgba(255, 255, 255, 0.2); border: 1px solid #fff; border-radius: 10px; display: flex; justify-content: center; align-items: center; color: #fff; font-size: 1.5em; user-select: none; cursor: pointer; touch-action: none; }
        .pad-btn:active { background: rgba(255, 255, 255, 0.5); }
        .pad-up { grid-column: 2; grid-row: 1; } .pad-left { grid-column: 1; grid-row: 2; } .pad-down { grid-column: 2; grid-row: 2; } .pad-right { grid-column: 3; grid-row: 2; }
        
        #map-action-btn-container { position: absolute; bottom: 30px; right: 30px; z-index: 20; display: none; flex-direction: row-reverse; flex-wrap: wrap-reverse; gap: 15px; align-items: flex-end; pointer-events: none; max-width: 45%; }
        #map-action-btn-container.active { display: flex !important; }
        .map-act-btn { width: 70px; height: 70px; border-radius: 50%; background: rgba(255, 255, 255, 0.25); border: 2px solid #fff; color: #fff; font-weight: bold; font-size: 1.0em; display: flex; justify-content: center; align-items: center; user-select: none; cursor: pointer; pointer-events: auto; touch-action: none; backdrop-filter: blur(4px); transition: transform 0.1s, background 0.1s; text-shadow: 0 1px 2px rgba(0,0,0,0.5); position: relative; }
        .map-act-btn:active, .map-act-btn.pressed { background: rgba(255, 255, 255, 0.5); transform: scale(0.95); }
        .key-badge { position: absolute; top: -5px; right: -5px; background: #333; color: #fff; font-size: 10px; padding: 2px 5px; border-radius: 4px; border: 1px solid #aaa; }

        #hud-layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 50; overflow: hidden; }
        #hud-crosshair { position: absolute; top: 50%; left: 50%; width: 20px; height: 20px; transform: translate(-50%, -50%); border: 2px solid rgba(255, 255, 255, 0.8); border-radius: 50%; display: none; }
        #hud-crosshair::after { content: ''; position: absolute; top: 50%; left: 50%; width: 4px; height: 4px; background: red; transform: translate(-50%, -50%); border-radius: 50%; }
        #hud-radar { position: absolute; top: 20px; right: 20px; width: 120px; height: 120px; background: rgba(0, 20, 0, 0.6); border: 2px solid rgba(100, 255, 100, 0.5); border-radius: 50%; display: none; }
        #hud-radar canvas { width: 100%; height: 100%; border-radius: 50%; }
        .hud-element { position: absolute; color: white; font-family: sans-serif; text-shadow: 1px 1px 0 #000; font-size: 16px; }
        .hud-bar-bg { width: 150px; height: 12px; background: #333; border: 1px solid #fff; border-radius: 4px; overflow: hidden; margin-top: 2px; }
        .hud-bar-fill { height: 100%; background: linear-gradient(to right, #f00, #ff6); width: 100%; transition: width 0.2s; }

        .damage-popup { position: absolute; font-family: 'Verdana', sans-serif; font-weight: 900; font-size: 20px; color: #fff; text-shadow: 2px 0 0 #000, -2px 0 0 #000, 0 2px 0 #000, 0 -2px 0 #000, 1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000; pointer-events: none; z-index: 2000; white-space: nowrap; animation: popup-bounce 0.8s ease-out forwards; opacity: 1; }
        .popup-damage { color: #fff; } .popup-critical { color: #ffeb3b; font-size: 28px; z-index: 2001; } .popup-heal { color: #69f0ae; } .popup-exp { color: #40c4ff; font-size: 18px; } .popup-item { color: #ffab40; font-size: 16px; } .popup-system { color: #ccc; font-size: 16px; }
        @keyframes popup-bounce { 0% { transform: translate(-50%, 0) scale(0.5); opacity: 0; } 15% { transform: translate(-50%, -20px) scale(1.2); opacity: 1; } 100% { transform: translate(-50%, -60px) scale(1.0); opacity: 0; } }

        /* Shop Styles */
        #shop-items-container { scrollbar-width: thin; scrollbar-color: rgba(255, 255, 255, 0.5) rgba(255, 255, 255, 0.1); }
        #shop-items-container::-webkit-scrollbar { width: 12px; display: block; }
        #shop-items-container::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.1); border-radius: 6px; }
        #shop-items-container::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.4); border-radius: 6px; border: 2px solid transparent; background-clip: content-box; }
        #shop-items-container::-webkit-scrollbar-thumb:hover { background-color: rgba(255, 255, 255, 0.8); }
        
        .img-error-fallback { background-color: #333; border: 2px dashed #666; display: flex; justify-content: center; align-items: center; color: #fff; font-size: 10px; content: "NO IMAGE"; }

        /* Modal Overlays */
        .modal-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.8); z-index: 9000; display: none; flex-direction: column; justify-content: center; align-items: center; color: #fff; backdrop-filter: blur(5px); }
        #config-window { background: rgba(20, 20, 30, 0.9); border: 2px solid #fff; border-radius: 10px; padding: 30px; width: 90%; max-width: 350px; text-align: center; }
        .vol-control { margin-bottom: 20px; } .vol-control label { display: block; margin-bottom: 5px; font-weight: bold; } .vol-control input[type=range] { width: 100%; cursor: pointer; }
        #pause-text { font-size: 3em; font-weight: bold; letter-spacing: 5px; text-shadow: 0 0 10px #fff; animation: pulse 1.5s infinite; }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }

        /* Debug Window */
        #debug-window { position: absolute; top: 10%; left: 10%; width: 80%; height: 80%; background: rgba(0, 0, 0, 0.9); border: 2px solid #b37feb; z-index: 9999; display: none; flex-direction: column; color: #fff; font-family: monospace; box-shadow: 0 0 20px rgba(0,0,0,0.8); }
        .debug-header { padding: 10px; background: #391085; color: #fff; font-weight: bold; display: flex; justify-content: space-between; align-items: center; }
        .debug-body { flex: 1; overflow-y: auto; padding: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .debug-section h4 { border-bottom: 1px solid #b37feb; margin-bottom: 10px; color: #d3adf7; }
        .debug-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; border-bottom: 1px solid #333; padding-bottom: 2px; }
        .debug-row label { flex: 1; font-size: 12px; color: #ccc; word-break: break-all; }
        .debug-row input { width: 80px; background: #222; border: 1px solid #555; color: #fff; padding: 2px; text-align: right; }
        @media (max-width: 600px) { .debug-body { grid-template-columns: 1fr; } #sys-toggle-btn { display: block; } .map-act-btn { width: 60px; height: 60px; font-size: 0.8em; } #map-action-btn-container { bottom: 20px; right: 10px; gap: 8px; } .pad-btn { width: 50px; height: 50px; font-size: 1.2em; } #map-controls { bottom: 20px; left: 10px; gap: 5px; grid-template-columns: 50px 50px 50px; grid-template-rows: 50px 50px; } }

        /* Battle UI */
        #battle-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 200; display: none; flex-direction: column; justify-content: space-between; padding: 20px; color: #fff; text-shadow: 1px 1px 0 #000; }
        #battle-enemy-area { 
            flex: 1; 
            display: flex; 
            justify-content: center; 
            align-items: flex-end; /* 足元を揃える */
            gap: 20px; 
            position: relative; 
            overflow: hidden; 
            min-height: 0; 
            padding-bottom: 40px;
        }

        /* 敵ごとのコンテナ */
        .enemy-container {
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            transition: all 0.2s;
            cursor: default;
        }
        
        /* ターゲット選択モード時のスタイル */
        .enemy-container.target-mode {
            cursor: pointer;
        }
        .enemy-container.target-mode:hover {
            filter: drop-shadow(0 0 15px yellow);
            transform: scale(1.05);
        }

        /* 死亡時のスタイル */
        .enemy-container.dead {
            opacity: 0.0; /* 完全に消すか、0.3で薄く残すかはお好みで */
            pointer-events: none;
            filter: grayscale(100%);
            transform: scale(0.9);
            transition: opacity 1.0s;
        }

        /* 敵画像 */
        .battle-enemy-img { 
            max-height: 40vh; /* 画面高さの40%まで */
            max-width: 30vw;  /* 画面幅の30%まで */
            object-fit: contain; 
            filter: drop-shadow(0 10px 20px rgba(0,0,0,0.5));
        }

        /* 個別HPバー */
        .enemy-hp-bar-bg {
            width: 80px;
            height: 6px;
            background: #333;
            border: 1px solid #fff;
            margin-top: 5px;
            border-radius: 3px;
            overflow: hidden;
            display: none; /* 初期は非表示、JSで表示 */
        }
        .enemy-hp-bar-fill {
            height: 100%;
            background: linear-gradient(to right, #f00, #f88);
            width: 100%;
            transition: width 0.3s;
        }

        /* ターゲット選択メッセージ */
        #battle-target-msg {
            position: absolute;
            top: 15%;
            left: 0;
            width: 100%;
            text-align: center;
            font-size: 1.5em;
            font-weight: bold;
            color: #fff;
            text-shadow: 0 0 5px #f00, 0 0 10px #000;
            display: none;
            z-index: 300;
            pointer-events: none;
            animation: blink 1s infinite alternate;
        }

        /* 演出用クラス */
        .dmg-shake { animation: shake-hard 0.4s; filter: brightness(2) !important; }
        .enemy-attack { animation: attack-lunge 0.3s; }
        @keyframes attack-lunge { 0% { transform: scale(1); } 50% { transform: scale(1.2) translateY(20px); } 100% { transform: scale(1); } }
        #battle-ui { height: 40%; min-height: 200px; flex-shrink: 0; display: flex; gap: 10px; font-family: 'DotGothic16', monospace; font-size: 18px; }
        .battle-window { flex: 1; padding: 15px; border-radius: 4px; box-sizing: border-box; }
        #battle-msg-box { flex: 2; overflow-y: auto; line-height: 1.5; }
        #battle-cmd-box { flex: 1; display: flex; flex-direction: column; gap: 5px; overflow-y: auto; padding-right: 5px; }
        .battle-cmd-btn { padding: 10px; cursor: pointer; border-radius: 4px; text-align: left; transition: background 0.1s; }
        .battle-cmd-btn:hover { background: rgba(255,255,255,0.2); }
        .theme-dq .battle-window { background: #000; border: 3px solid #fff; border-radius: 8px; } .theme-dq .battle-cmd-btn:hover { background: #fff; color: #000; }
        .theme-ff .battle-window { background: linear-gradient(to bottom, #000088, #000022); border: 2px solid #ccc; border-radius: 6px; box-shadow: 0 0 10px rgba(255,255,255,0.5); } .theme-ff .battle-cmd-btn { border: 1px solid transparent; } .theme-ff .battle-cmd-btn:hover { border-color: #fff; background: rgba(255,255,255,0.1); box-shadow: 0 0 5px #fff; }
        .theme-paper { color: #333; text-shadow: none; font-family: 'Klee One', cursive; font-weight: bold; } .theme-paper .battle-window { background: #fff; border: 3px solid #333; border-radius: 2px; box-shadow: 5px 5px 0 rgba(0,0,0,0.2); } .theme-paper .battle-cmd-btn:hover { background: #eee; transform: rotate(-2deg); }
        .theme-cyber .battle-window { background: rgba(0, 0, 0, 0.8); border: 1px solid #0ff; box-shadow: 0 0 10px #0ff inset; color: #0ff; text-shadow: 0 0 5px #0ff; font-family: sans-serif; clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px); } .theme-cyber .battle-cmd-btn:hover { background: #0ff; color: #000; text-shadow: none; }

        .enemy-hit-flash {
            filter: brightness(5.0) sepia(1) hue-rotate(-50deg) saturate(5) !important; 
        }

        /* Title Screen CSS */
        #title-screen { position: absolute; top: 0; left: 0; width: 100%; height: 100%; ${titleBgStyle} z-index: 8000; display: flex; flex-direction: column; justify-content: center; align-items: center; color: #fff; transition: opacity 0.5s; }
        #title-logo { font-size: 3em; font-weight: bold; margin-bottom: 40px; text-shadow: 0 0 10px #1890ff; font-family: "Shippori Mincho", serif; text-align: center; }
        #title-menu { display: flex; flex-direction: column; gap: 15px; width: 200px; }
        #copyright { position: absolute; bottom: 10px; font-size: 0.8em; color: #888; width: 100%; text-align: center; }

        /* Hide Message CSS */
        #text-box.hidden-ui { opacity: 0 !important; pointer-events: none !important; }
        #system-menu.hidden-ui { opacity: 0 !important; pointer-events: none !important; }
        #character-name.hidden-ui { opacity: 0 !important; }

        /* Full Screen Window (NVL) */
        .portrait #text-box.win-full { top: 0 !important; bottom: 0 !important; left: 0 !important; width: 100% !important; height: 100% !important; border-radius: 0; background: rgba(0,0,0,0.6); display: flex; flex-direction: column; justify-content: center; align-items: center; }
        .portrait #text-box.win-full #message { font-size: 1.4em; max-height: 80%; width: 80%; text-align: center; }

/* 敵の複数配置用レイアウト */
#battle-enemy-area {
    display: flex;
    justify-content: center;
    align-items: flex-end;
    gap: 20px;
    padding-bottom: 20px;
}
.enemy-container {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    transition: all 0.3s;
    cursor: pointer; /* ターゲット選択用 */
}
.enemy-container.dead {
    opacity: 0.3;
    filter: grayscale(100%);
    transform: scale(0.9);
}
/* 選択モード時の強調 */
.enemy-container.target-mode:hover {
    filter: drop-shadow(0 0 10px yellow);
    transform: scale(1.05);
}
.battle-enemy-img {
    max-height: 250px;
    max-width: 200px;
    object-fit: contain;
}
/* 個別HPバー */
.enemy-hp-bar-bg {
    width: 100px;
    height: 8px;
    background: #333;
    border: 1px solid #fff;
    margin-top: 5px;
    border-radius: 4px;
    overflow: hidden;
}
.enemy-hp-bar-fill {
    height: 100%;
    background: #f00;
    width: 100%;
    transition: width 0.3s;
}
/* ターゲット選択メッセージ */
#battle-target-msg {
    position: absolute;
    top: 10%;
    width: 100%;
    text-align: center;
    color: #fff;
    font-size: 1.5em;
    font-weight: bold;
    text-shadow: 0 0 5px #000;
    display: none;
    z-index: 300;
    pointer-events: none;
}
    </style>
</head>
<body>
    <div id="game-container">
        <div id="title-screen" style="display:none;">
            <div id="title-logo">GAME TITLE</div>
            <div id="title-menu">
                <button class="sys-btn" onclick="startGame()">START</button>
                <button class="sys-btn" onclick="openLoadMenu('load')">LOAD</button>
                <button id="title-btn-guideline" class="sys-btn" onclick="toggleGuideline()">GUIDELINE</button>
            </div>
            <div id="copyright"></div> <!-- ここへ移動！ -->
        </div>
    </div>
            <div id="guideline-overlay" class="modal-overlay" onclick="if(event.target === this) toggleGuideline()">
        <div style="background:rgba(0,0,0,0.95); border:2px solid #fff; padding:30px; border-radius:10px; width:80%; max-width:600px; max-height:80%; display:flex; flex-direction:column; box-sizing:border-box;">
            <h2 style="color:#fff; text-align:center; margin-bottom:20px; border-bottom:1px solid #555; padding-bottom:10px;">配信・二次創作ガイドライン</h2>
            <div id="guideline-text" style="color:#ddd; font-size:1.1em; line-height:1.6; white-space:pre-wrap; overflow-y:auto; flex:1;"></div>
            <button class="sys-btn" onclick="toggleGuideline()" style="margin-top:20px; align-self:center; padding:10px 40px; font-size:1.1em;">閉じる</button>
        </div>
    </div>
        <div id="loading-screen"><div class="spinner"></div><div id="loading-text">NOW LOADING...</div></div>

        <div id="error-screen" style="display:none; position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(50,0,0,0.95); z-index:10000; color:#fff; flex-direction:column; justify-content:center; align-items:center; padding:20px; box-sizing:border-box;">
            <h2 style="color:#ff4d4f; border-bottom:2px solid #ff4d4f; padding-bottom:10px;">🚫 SYSTEM ERROR</h2>
            <p id="error-message" style="font-family:monospace; background:#000; padding:15px; border-radius:5px; max-width:90%; word-break:break-all;">Unknown Error</p>
            <button onclick="location.reload()" style="margin-top:20px; padding:10px 30px; cursor:pointer;">タイトルに戻る (Reload)</button>
        </div>

        <div id="system-menu" class="collapsed">
            <button id="sys-toggle-btn" class="sys-btn" onclick="toggleSystemMenu()">≡ MENU</button>
            <button class="sys-btn" onclick="toggleConfig()" ${chk('showConfigBtn')}>CONFIG</button>
            <button class="sys-btn" onclick="togglePause()" ${chk('showPauseBtn')}>PAUSE</button>
            <button id="btn-auto" class="sys-btn" onclick="toggleAuto()" ${chk('showAutoBtn')}>AUTO</button>
            <button id="btn-skip" class="sys-btn" onclick="toggleSkip()" ${chk('showSkipBtn')}>SKIP</button>
            <button class="sys-btn" onclick="toggleInventory()" ${chk('showItemBtn')}>ITEM</button>
            <button class="sys-btn" onclick="toggleBacklog()" ${chk('showLogBtn')}>LOG</button>
            <button class="sys-btn" onclick="openSaveLoadModal('save')" ${saveStyle}>SAVE</button>
            <button class="sys-btn" onclick="openLoadMenu('load')" ${saveStyle}>LOAD</button>
            <button class="sys-btn" onclick="returnToTitle()" ${chk('showTitleBtn')}>TITLE</button>
            <button class="sys-btn danger" onclick="deleteSave()" ${saveStyle}>RESET</button>
            <button class="sys-btn" onclick="toggleDebug()" ${debugStyle} style="border-color:#b37feb; color:#d3adf7;">DEBUG</button>
        </div>

        <div id="sl-overlay" class="modal-overlay" onclick="if(event.target === this) closeSLModal()">
            <div id="sl-window" style="background:rgba(0,0,0,0.9); border:2px solid #fff; padding:20px; border-radius:10px; text-align:center; min-width:300px;" onclick="event.stopPropagation()">
                <h2 id="sl-title" style="margin-bottom:20px; color:#fff;">SAVE MODE</h2>
<div style="display:flex; flex-direction:column; gap:15px;">
                    <button id="sl-btn-browser" class="sys-btn" onclick="execSL('browser')" style="padding:15px; font-size:1.1em;">
                        💾 ブラウザに保存/読込<br><span style="font-size:0.8em; color:#aaa;">(この端末のみ)</span>
                    </button>
                    <button id="sl-btn-file" class="sys-btn" onclick="execSL('file')" style="padding:15px; font-size:1.1em;">
                        📂 ファイルに保存/読込<br><span style="font-size:0.8em; color:#aaa;">(バックアップ・移行用)</span>
                    </button>
                    <button class="sys-btn danger" onclick="closeSLModal()" style="margin-top:10px;">キャンセル</button>
                </div>
            </div>
        </div>
        <input type="file" id="sl-file-input" accept=".json" style="display:none;" onchange="handleFileLoad(this)">

        <div id="config-overlay" class="modal-overlay" onclick="if(event.target === this) toggleConfig()">
            <div id="config-window">
                <h2 style="margin-bottom: 20px; border-bottom: 1px solid #555; padding-bottom: 10px;">CONFIG</h2>
                <div class="vol-control">
                    <label>BGM Volume: <span id="vol-bgm-val">50%</span></label>
                    <input type="range" id="vol-bgm" min="0" max="100" value="50" oninput="updateVolume('bgm', this.value)">
                </div>
                <div class="vol-control">
                    <label>SE Volume: <span id="vol-se-val">50%</span></label>
                    <input type="range" id="vol-se" min="0" max="100" value="50" oninput="updateVolume('se', this.value)">
                </div>
                <button class="sys-btn" onclick="toggleConfig()" style="padding: 10px 30px; font-size: 1.2em; margin-top: 10px;">CLOSE</button>
            </div>
        </div>

        <div id="pause-overlay" class="modal-overlay" onclick="togglePause()">
            <div id="pause-text">PAUSED</div>
            <div style="margin-top:20px; font-size:0.8em; color:#ccc;">Click to Resume</div>
        </div>

        <div id="debug-window">
            <div class="debug-header"><span>🛠️ DEBUG MONITOR</span><button onclick="toggleDebug()" style="background:transparent; border:none; color:#fff; font-size:1.5em; cursor:pointer;">×</button></div>
            <div class="debug-body">
                <div class="debug-section" id="debug-vars"><h4>Variables (変数)</h4><div id="debug-vars-list"></div></div>
                <div class="debug-section" id="debug-player"><h4>Player Status (ステータス)</h4><div id="debug-player-list"></div></div>
                <div class="debug-section" id="debug-trace" style="grid-column: 1 / -1; border-top:1px dashed #555; padding-top:10px;">
                    <h4>👣 Node Trace (移動履歴: 最新50件)</h4>
                    <div id="debug-trace-list" style="height: 100px; overflow-y: auto; background: #111; padding: 5px; font-family: monospace; font-size: 0.85em; color: #aaa; border: 1px solid #444;"></div>
                </div>
            </div>
            <div style="padding:10px; border-top:1px solid #555; text-align:right;">
                <button class="sys-btn" onclick="downloadTraceLog()" style="margin-right:10px;">💾 ログ保存</button>
                <button class="sys-btn" onclick="renderDebug()">🔄 更新</button>
            </div>
        </div>

        <div id="backlog-overlay"><div id="backlog-content"></div><button id="backlog-close" onclick="toggleBacklog()">閉じる</button></div>
        <div id="background-layer-1" class="layer world-layer"></div><div id="background-layer-2" class="layer world-layer" style="opacity:0;"></div>
        <div id="character-layer" class="world-layer"></div>
        <canvas id="character-canvas"  class="world-layer" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 10; pointer-events: none;"></canvas>
        <canvas id="overhead-canvas"  class="world-layer" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 40; pointer-events: none;"></canvas>
        <div id="effect-overlay"></div>
        <div id="click-overlay"></div>
        <div id="text-box"><div id="character-name"></div><div id="message"></div></div>
        <div id="choices-box"></div>
        
        <div id="map-layer" class="world-layer">
            <canvas id="map-canvas" style="width: 100%; height: 100%; display: block;"></canvas>
            <div id="map-controls">
                <div class="pad-btn pad-up" data-key="ArrowUp">↑</div><div class="pad-btn pad-left" data-key="ArrowLeft">←</div>
                <div class="pad-btn pad-down" data-key="ArrowDown">↓</div><div class="pad-btn pad-right" data-key="ArrowRight">→</div>
            </div>
            <div id="map-action-btn-container"></div>
        </div>

        <div id="shop-overlay" style="display:none; position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.1); z-index:305; flex-direction:column; padding:20px; box-sizing:border-box; color:#fff; text-shadow: 1px 1px 3px rgba(0,0,0,0.8);">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #fff; padding-bottom:10px; margin-bottom:20px;">
                <h2 style="margin:0; font-family:'DotGothic16', sans-serif;">🛒 SHOP</h2>
                <div style="font-size:1.5em; font-family:'DotGothic16', sans-serif;">💰 <span id="shop-money-display">0</span></div>
            </div>
            <div id="shop-items-container" style="flex:1; overflow-y:auto; display:grid; gap:15px; padding:10px; align-content:start;"></div>
            <div style="text-align:center; margin-top:20px;">
                <button id="shop-leave-btn" class="sys-btn" style="padding:15px 60px; font-size:1.2em;">退出する</button>
            </div>
        </div>

        <div id="battle-overlay">
            <!-- ▼▼▼ 修正: 敵エリアの構造変更 ▼▼▼ -->
            <div id="battle-target-msg">ターゲットを選択してください ▶</div>
            
            <div id="battle-enemy-area">
                <!-- ここに JavaScript (main.js) で .enemy-container が人数分生成されます -->
            </div>
            
            <!-- ロックオンマーカー (CSSで敵の頭上に表示されるように制御) -->
            <div id="battle-lock-marker" style="display:none; position:absolute; color:red; font-size:24px; font-weight:bold; text-shadow:0 0 3px #fff; z-index:201;">▼</div>
            <div id="battle-ui" class="theme-dq">
                <div id="battle-cmd-box" class="battle-window"></div>
                <div id="battle-msg-box" class="battle-window">モンスター が あらわれた！</div>
                <div id="battle-status-box" class="battle-window" style="flex:0.8;">
                    <div id="battle-player-name">YOU</div>
                    <div>HP: <span id="battle-player-hp">100</span></div>
                    <div>SP: <span id="battle-player-sp">100</span></div>
                </div>
            </div>
        </div>

        <div id="hud-layer">
            <div id="hud-crosshair"></div>
            <div id="hud-radar"><canvas id="radar-canvas" width="120" height="120"></canvas></div>
            <div id="hud-menu-btn" onclick="toggleInventory()" style="display:none; pointer-events:auto; position:absolute; top:20px; left:20px; width:60px; height:60px; background:rgba(0,0,0,0.5); border:2px solid #fff; border-radius:50%; cursor:pointer; z-index:100; justify-content:center; align-items:center; color:#fff; font-size:30px;">🎒</div>
            <div id="hud-elements-container"></div>
        </div>

        <!-- ★★★ インベントリ画面（HUDレイヤーの外、最前面へ移動） ★★★ -->
        <div id="inventory-window" style="display:none; pointer-events:auto; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:80%; height:70%; background:rgba(0,0,0,0.95); border:4px solid #fff; border-radius:10px; z-index:3000; flex-direction:row; color:#fff; box-shadow: 0 0 0 9999px rgba(0,0,0,0.5);">
            <div style="display:flex; height:100%;">
                <div id="inventory-list" style="flex:1; border-right:2px solid #555; overflow-y:auto; padding:10px;"></div>
                <div id="inventory-detail" style="flex:1; padding:20px; display:flex; flex-direction:column; align-items:center; text-align:center;">
                    <div id="inv-detail-icon" style="font-size:60px; margin-bottom:20px;">📦</div>
                    <h2 id="inv-detail-name" style="margin:0 0 10px 0;">アイテムを選択</h2>
                    <p id="inv-detail-desc" style="color:#ccc; flex:1;">説明文がここに表示されます。</p>
                    <div style="display:flex; justify-content:center; align-items:center; flex-wrap:wrap; gap:10px; width:100%;">
                        <button id="inv-use-btn" class="sys-btn" style="font-size:1.2em; padding:10px 20px; display:none;">使う</button>
                        <button id="inv-place-btn" class="sys-btn" style="font-size:1.2em; padding:10px 20px; display:none; border-color:#aaa; color:#eee;">置く</button>
                        <button id="inv-discard-btn" class="sys-btn danger" style="font-size:1.0em; padding:10px 15px; display:none; border-color:#ff4d4f; color:#ff4d4f;">捨てる</button>
                    </div>
                </div>
            </div>
            <div onclick="toggleInventory()" style="position:absolute; top:10px; right:10px; cursor:pointer; font-size:24px;">❌</div>
        </div>

    </div>

    <script type="module">
    
    ${jsImports}
        window.onerror = function(message, source, lineno, colno, error) {
            const screen = document.getElementById('error-screen');
            const msg = document.getElementById('error-message');
            if (screen && msg) {
                screen.style.display = 'flex';
                
                // 読み込みエラー（import失敗）の可能性が高い場合の判定
                if (message.includes("import") || message.includes("Network") || !window.THREE) {
                    msg.innerHTML = 
                        "<strong style='color:#ff4d4f; font-size:1.2em;'>⚠️ 起動エラー (通信関連)</strong><br><br>" +
                        "このゲームの起動にはインターネット接続が必要です。<br>" +
                        "Wi-Fiなどの通信環境を確認し、ページを再読み込みしてください。<br><br>" +
                        "<span style='color:#aaa; font-size:0.8em;'>詳細: " + message + "</span>";
                } else {
                    // その他のスクリプトエラー
                    msg.textContent = "System Error: " + message + "\\n(Line: " + lineno + ")";
                }
                
                const loader = document.getElementById('loading-screen');
                if(loader) loader.style.display = 'none';
            }
            console.error("Game Error:", error);
        };

        window.addEventListener('unhandledrejection', function(event) {
            const screen = document.getElementById('error-screen');
            const msg = document.getElementById('error-message');
            if (screen && msg) {
                screen.style.display = 'flex';
                msg.textContent = "Async Error: " + (event.reason ? event.reason.message : event.reason);
                const loader = document.getElementById('loading-screen');
                if(loader) loader.style.display = 'none';
            }
        });




        // --- Globals ---

        const gameData = ${dataString};
        let particles = [];
        let activeEmitters = [];
                let masterVolBgm = 0.5; // BGM音量 (0.0~1.0)
let masterVolSe = 0.5;  // SE音量 (0.0~1.0)
let isGamePaused = false;
        const AudioManager = {
    _bgm: null,
    _bgmId: null,
    _sePool: {}, // ★最適化: SEを使い回すための保管庫（オーディオプール）

    playBgm: function(assetId, volume) {
        // 同じ曲なら何もしない
        if (!assetId || assetId === 'stop') {
            this.stopBgm();
            return;
        }

        // 同じ曲なら音量だけ変えて継続
        if (this._bgmId === assetId && this._bgm && !this._bgm.paused) {
            this._bgm.volume = volume;
            return;
        }
        
        // 前の曲を停止・破棄
        this.stopBgm();

        const asset = gameData.assets.sounds[assetId];
        if (asset) {
            this._bgm = new Audio(asset.data);
            this._bgm.loop = true;
            this._bgm.volume = volume;
            this._bgm.play().catch(e => console.warn(e));
            this._bgmId = assetId;
        }
    },

    stopBgm: function() {
        if (this._bgm) {
            this._bgm.pause();
            this._bgm.src = ""; // メモリ解放を促す
            this._bgm.load();
            this._bgm = null;
            this._bgmId = null;
        }
    },

    playSe: function(assetId, volume) {
        if (!assetId) return;
        const asset = gameData.assets.sounds[assetId];
        if (!asset) return;

        // 保管庫の準備
        if (!this._sePool[assetId]) {
            this._sePool[assetId] = [];
        }
        
        // 空いているスピーカーを探す
        let se = this._sePool[assetId].find(audio => audio.paused || audio.ended);
        
        if (!se) {
            // 空きがない場合
            if (this._sePool[assetId].length >= 5) {
                // 最も再生が進んでいる（古い）ものを強制停止して再利用する
                se = this._sePool[assetId].reduce((oldest, current) => {
                    return (current.currentTime > oldest.currentTime) ? current : oldest;
                });
                se.pause();
            } else {
                // まだ上限に達していなければ新しく作る
                se = new Audio(asset.data);
                this._sePool[assetId].push(se);
            }
        }
        
        // 再生位置と音量をリセットして鳴らす
        se.volume = volume;
        se.currentTime = 0; 
        se.play().catch(e => console.warn("SE Play Error:", e));
    },


    resume: function() {
        // ブラウザの自動再生ポリシー対策
        if (this._bgm && this._bgm.paused) {
            this._bgm.play().catch(e => console.warn("Audio resume failed:", e));
        }
    }
}
      const defaultPlayerDef = {
            $hp: 10, $maxHp: 10, $atk: 1, $spd: 4, $def: 0,
            initialLevel: 1, maxLevel: 50, growthType: 'normal',
            limitHp: 100, limitAtk: 10, limitDef: 10, limitSpd: 6, limitStamina: 150,
            maxStamina: 100, staminaRegen: 20,
            defense: 0, penetration: 1,
            attackRange: 32, attackCooldown: 20, projectileSpeed: 0,
            criticalRate: 5, criticalMultiplier: 2.0,
            magazineSize: 30, reloadTime: 2.0,
            dashConsume: false, dashCost: 0.5,
            jumpConsume: false, jumpCost: 10,
            attackConsume: false, attackCost: 20,
            invincibleConsume: false, invincibleCost: 1.0,
            guardConsume: false, guardCost: 0.5,
            exhaustionDuration: 3.0, exhaustionRecover: 'gradual', exhaustionMove: 'normal',
            exhaustionNoAction: true, exhaustionNoItem: false,
            exhaustionAtkZero: false, exhaustionDefZero: false, exhaustionDmgDouble: false,
                limitStaminaRegen: 50,  // スタミナ回復の最大値
    limitPenetration: 10    // 貫通力の最大値
        };
        // 既存データにデフォルト値をマージ
        gameData.player = { ...defaultPlayerDef, ...(gameData.player || {}) };

        // ★追加: 設定データの補完
        const defaultSettings = {
            autoShakeOnDamage: true, showPopups: true, flashOnItemUse: true, flashOnInvincible: true,
            globalGameoverNodeId: ''
        };
        gameData.settings = { ...defaultSettings, ...(gameData.settings || {}) };

        if (gameData.maps) {
            for (const mapId in gameData.maps) {
                const map = gameData.maps[mapId];
                // 3Dモデルが設定されているのにタイプが '3d' 以外になっている場合、'3d' に強制変更
                if (map.stageModelId && map.type !== '3d' && map.type !== 'dungeon') {
                    map.type = '3d';
                }
                // 古いデータでオブジェクト配列が無い場合の補完
                if (!map.objects) map.objects = [];
            }
        }
        let gameState = { ...gameData.variables };
                // これにより "=== 'on'" の判定が正しく機能するようになります
        if (typeof gameState.showDamageText === 'undefined') {
            gameState.showDamageText = 'on'; // デフォルトはON
        }
        let playerState = gameData.player ? { ...gameData.player } : { $hp:10, $maxHp:10, $atk:1, $spd:1.0, $actMode:0, $isLockedOn:0, $lockonTargetId:null };
        if (!playerState.activeBuffs) playerState.activeBuffs = [];
        if (!playerState.itemCooldowns) playerState.itemCooldowns = {};
        let modelExpressionCache = {}; 
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
        let hudElements = {};
        let isProcessingNode = false;
        let lastTime = 0;
        const layers = {};
        const ui = {};
        let activeBg = 1;
        let tpsCameraAngle = { horizontal: 0, vertical: 0.3 };
let animState = { bg: { id: null, element: null, timer: 0, frame: 0 }, characters: [] };
let executionCounter = 0;
        let nodeHistory = [];
         const MAX_HISTORY = 100;
let hitStopTimer = 0;
const MAX_PARTICLES = 1500;
let activePopups = [];
function spawnParticle(id, x, y, overrideOptions = {}) {
    if (particles.length >= MAX_PARTICLES) {
        return; 
}
    const pDef = gameData.particles ? gameData.particles[id] : null;
    
    let options = {};
    if (!pDef) {
        if (id === 'blood') options = { color:'#ff0000', count:8, speed:6, gravity:0.4 };
        else if (id === 'spark') options = { color:'#ffff00', count:6, speed:5, gravity:0.5 };
        else return; 
    } else {
        options = { ...pDef };
    }

    if (overrideOptions) Object.assign(options, overrideOptions);

    const count = options.count || 5;
    const color = options.color || '#ffffff';
    const baseSize = options.size || 4;
    const isCircle = (options.shape === 'circle');
    const isScreenSpace = !!options.isScreenSpace;

    // 角度計算
    const fixedAngle = options.overrideAngle !== undefined ? options.overrideAngle : options.angle;
    
    for (let i = 0; i < count; i++) {
        let vx, vy;
        const speed = Math.random() * (options.speed || 4) + 1;

        if (fixedAngle !== undefined) {
            // 角度指定あり (天候など)
            const spread = (Math.random() - 0.5) * 0.2; 
            // 画面座標系: 0=右, 90=下
            const rad = (fixedAngle * (Math.PI / 180)) + spread;
            vx = Math.cos(rad) * speed;
            vy = Math.sin(rad) * speed;
        } else {
            // ランダム拡散
            const angle = Math.random() * Math.PI * 2;
            vx = Math.cos(angle) * speed;
            vy = Math.sin(angle) * speed;
        }

        let vz = 0;
        // マップモード(3D空間)かつ天候以外なら、Z軸(上)へ跳ね上げる
        if (!isScreenSpace && !options.isWeather) {
            vz = (Math.random() * 4) + 2;
        }

        particles.push({
            x: x, y: y, z: options.z || 0,
            vx: vx, vy: vy, vz: vz,
            life: 1.0,
            decay: (options.decay || 0.03) * (options.isWeather ? 0.2 : 1.0), // 天候は長持ちさせる
            color: color,
            size: baseSize * (Math.random() * 0.5 + 0.8),
            gravity: options.gravity !== undefined ? options.gravity : 0.4,
            bounce: options.bounce !== undefined ? options.bounce : 0.6,
            isCircle: isCircle,
            isScreenSpace: isScreenSpace,
            isWeather: !!options.isWeather
        });
    }
}


function renderParticles() {
    if (particles.length === 0) return;

    const canvas = document.getElementById('overhead-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // ★重要: ここで map や p がなくても処理を止めないように変更
    const map = mapEngine.data; 
    const p = mapEngine.player;
    
    const w = mapEngine.canvas.width;
    const h = mapEngine.canvas.height;
    const zoom = mapEngine.currentZoom || 1.0;
    const grid = mapEngine.GRID;

    // カメラ位置 (マップモード時のみ計算)
    let camX = 0, camY = 0;
    if (p) {
        camX = p.x + p.w/2;
        camY = p.y + p.h/2;
    }

    ctx.save();

    particles.forEach(function(pt) {
        let drawX = -9999;
        let drawY = -9999;
        let scale = zoom;
        let isVisible = false;

        // --- A. ノベルモード / スクリーン座標系 ---
        if (pt.isScreenSpace) {
            drawX = pt.x;
            drawY = pt.y; // ★修正: - pt.z を削除 (Y自体が重力で動くため)
            scale = 1.0;
            isVisible = true;
        } 
        // --- B. マップモード (マップとプレイヤーが存在する場合のみ) ---
        else if (isMapMode && map && p) {
            
            // 1. 3D / Dungeon (FPS/TPS)
            if (map.type === '3d' || map.type === 'dungeon') {
                if (window.threeHandler) {
                    const pos = window.threeHandler.getScreenPosition(pt.x, pt.y, pt.z, w, h);
                    if (pos) {
                        drawX = pos.x;
                        drawY = pos.y;
                        scale = zoom; 
                        isVisible = true;
                    }
                }
            }
            // 2. Quarter (クォータービュー)
            else if (map.type === 'quarter') {
                const TILE_W_HALF = grid * zoom; 
                const TILE_H_HALF = (grid / 2) * zoom;
                const centerX = w / 2;
                const centerY = h / 2;
                
                let diffX = pt.x - camX;
                let diffY = pt.y - camY;

                if (map.edgeType === 'loop') {
                    const mapW = map.width * grid;
                    const mapH = map.height * grid;
                    if (diffX < -mapW/2) diffX += mapW; else if (diffX > mapW/2) diffX -= mapW;
                    if (diffY < -mapH/2) diffY += mapH; else if (diffY > mapH / 2) diffY -= mapH;
                }

                drawX = centerX + (diffX - diffY) * (TILE_W_HALF / grid);
                drawY = centerY + (diffX + diffY) * (TILE_H_HALF / grid);
                drawY -= pt.z * zoom;
                isVisible = true;
            }
            // 3. Mode7 (疑似3D)
            else if (map.type === 'mode7') {
                let dx = pt.x - camX;
                let dy = pt.y - camY;
                
                if (map.edgeType === 'loop') {
                    const mapW = map.width * grid;
                    const mapH = map.height * grid;
                    if (dx < -mapW/2) dx += mapW; else if (dx > mapW/2) dx -= mapW;
                    if (dy < -mapH/2) dy += mapH; else if (dy > mapH/2) dy -= mapH;
                }

                const cos = Math.cos(p.dir);
                const sin = Math.sin(p.dir);
                const rotY = dx * cos + dy * sin;
                const rotX = dy * cos - dx * sin;

                if (rotY > 10) { 
                    const camZ = (h * 1.0) / zoom;
                    const s = camZ / rotY;
                    drawX = w / 2 + (rotX * s);
                    drawY = h / 2 + s - (pt.z * s / grid);
                    scale = s;
                    isVisible = true;
                }
            }
            // 4. Belt / Trapezoid (台形・ベルト)
            else if (map.type === 'belt' || map.type === 'trapezoid') {
                const PERSPECTIVE = (map.type === 'belt') ? 600 : 200;
                const vpDist = PERSPECTIVE / zoom;
                const relX = pt.x - camX;
                const relY = pt.y - camY;
                const distFromVP = relY + vpDist;
                
                let s = distFromVP / vpDist;
                if (s < 0.1) s = 0.1;
                
                drawX = (w / 2) + relX * s;
                drawY = (h / 2) + relY * s - (pt.z * s);
                scale = s * zoom;
                isVisible = true;
            }
            // 5. Adventure (探索)
            else if (map.type === 'adventure') {
                const advCamX = Math.floor(mapEngine.camera.x || 0);
                const advCamY = Math.floor(mapEngine.camera.y || 0);
                drawX = (pt.x - advCamX) * zoom;
                drawY = (pt.y - advCamY) * zoom - (pt.z * zoom);
                scale = zoom;
                isVisible = true;
            }
            // 6. Standard 2D (Topdown / Side / Shooter)
            else {
                let offX = -(camX) * zoom + (w/2);
                let offY = -(camY) * zoom + (h/2);
                
                if (map.edgeType !== 'loop') {
                    const mapW = map.width * grid * zoom;
                    const mapH = map.height * grid * zoom;
                    if (mapW < w) offX = (w - mapW) / 2;
                    else { if (offX > 0) offX = 0; if (offX < w - mapW) offX = w - mapW; }
                    
                    if (mapH < h) offY = (h - mapH) / 2;
                    else { if (offY > 0) offY = 0; if (offY < h - mapH) offY = h - mapH; }
                }

                drawX = pt.x * zoom + offX;
                drawY = pt.y * zoom + offY - (pt.z * zoom);
                scale = zoom;
                isVisible = true;
            }
        }

        // --- 描画実行 ---
        if (isVisible) {
            const size = pt.size * scale;
            if (size < 0.5) return; 

            ctx.globalAlpha = Math.max(0, Math.min(1, pt.life));
            ctx.fillStyle = pt.color;

            if (pt.isCircle) {
                ctx.beginPath();
                ctx.arc(drawX, drawY, size/2, 0, Math.PI*2);
                ctx.fill();
            } else {
                ctx.fillRect(drawX - size/2, drawY - size/2, size, size);
            }
        }
    });

    ctx.restore();
}

function updateParticles(dt) {
    // 処理落ち時の安全装置：過負荷時は更新をスキップ（または減速）
    if (dt > 100) return; // 1秒間に10回以下の処理速度なら完全にストップ
    
    // 最大パーティクル制限 (MAX_PARTICLES がすでに定義されている前提)
    const MAX_PARTICLES = 1500; 

    // 天候の発生量コントロール（timeScale に依存させない固定レートに近づける）
    const timeScale = dt / 16.666;

    // --- 1. 天候エミッターからの発生処理 ---
    if (typeof activeEmitters !== 'undefined') {
        activeEmitters.forEach(emitter => {
            // ★変更: 画面上に十分なパーティクルがある場合は新規生成を抑える
            if (particles.length >= MAX_PARTICLES) return;

            // 発生間隔の調整用プロパティを初期化
            if (!emitter._timer) emitter._timer = 0;
            emitter._timer += dt;

            // 1秒間に生成する量の設定（目安: fpsを考慮）
            // 例: count=10 なら 1秒間に約30個 ではなく、指定数を徐々に散らす
            // 処理を軽くするため、3フレームに1回の間隔にする
            if (emitter._timer < 50) return; 
            emitter._timer = 0;

            // 発生数の調整（一度に大量に出さない）
            let spawnCount = Math.ceil((emitter.count || 5) * 0.5); 
            // 限界を超えそうなら切り捨て
            if (particles.length + spawnCount > MAX_PARTICLES) {
                spawnCount = MAX_PARTICLES - particles.length;
            }
            
            // 画面サイズ取得
            const canvas = document.getElementById('overhead-canvas');
            const w = canvas ? canvas.width : window.innerWidth;
            const h = canvas ? canvas.height : window.innerHeight;
            
            // マップモードならズーム考慮、ノベルなら1.0
            const zoom = (isMapMode && mapEngine) ? (mapEngine.currentZoom || 1.0) : 1.0;
            
            // 発生基準点 (カメラ中心)
            let camX, camY;
            if (isMapMode && mapEngine.player) {
                camX = mapEngine.player.x + mapEngine.player.w/2;
                camY = mapEngine.player.y + mapEngine.player.h/2;
            } else {
                // ノベルモードは画面中央が基準
                camX = w / 2;
                camY = h / 2;
            }

            const rad = (emitter.angle || 0) * (Math.PI / 180);
            const moveX = Math.cos(rad);
            const moveY = Math.sin(rad);
            
            // 画面対角線 (画面外から発生させるための距離)
            const diag = Math.sqrt(w*w + h*h) / zoom;
            
            // 発生幅 (指定がなければ画面全体)
            const areaW = (emitter.areaWidth > 0) ? emitter.areaWidth : (diag * 1.2);

            for(let i=0; i<spawnCount; i++) {
                // 進行方向に対して垂直に散らす
                const spread = (Math.random() - 0.5) * areaW;
                
                // 発生座標
                // カメラ中心から、進行方向の逆(-move)にdiag*0.6だけ戻ったところを基準に、垂直方向(spread)に散らす
                let startX = camX - (moveX * diag * 0.6) + (-moveY * spread);
                let startY = camY - (moveY * diag * 0.6) + (moveX * spread);
                
                const startZ = Math.random() * 200; 

                spawnParticle(emitter.id, startX, startY, {
                    isWeather: true,
                    z: startZ,
                    overrideAngle: emitter.angle,
                    isScreenSpace: !isMapMode
                });
            }
        });
    }

    // --- 2. パーティクルの更新 ---
    const canvas = document.getElementById('overhead-canvas');
    const screenH = canvas ? canvas.height : window.innerHeight;

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= p.decay * timeScale;
        
        if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
        }
        
        p.x += p.vx * timeScale;
        p.y += p.vy * timeScale;

        // ★挙動分岐
        if (p.isScreenSpace) {
            // [ノベルモード / 2D UI]
            // 重力は Y軸(画面下) に直接加算
            p.vy += p.gravity * timeScale; 
            
            // 床判定: 画面下端
            // バウンド設定がある場合のみ跳ねる
            if (p.y > screenH) {
                if (p.bounce > 0) {
                    p.y = screenH;
                    p.vy *= -p.bounce;
                    p.vx *= 0.8;
                } else if (p.isWeather) {
                    // 天候でバウンドなしなら画面外で消す
                    particles.splice(i, 1);
                    continue;
                }
            }
        } else {
            // [マップモード / 3D空間]
            // 重力は Z軸(高さ) から減算
            p.z += p.vz * timeScale;
            p.vz -= p.gravity * timeScale; 
            
            // 床判定: Z=0
            if (p.z < 0) {
                if (p.isWeather && !p.bounce) {
                    particles.splice(i, 1);
                    continue;
                } else {
                    p.z = 0;
                    p.vz *= -p.bounce;
                    p.vx *= 0.8;
                    p.vy *= 0.8;
                }
            }
        }
    }
}

// --- レベル・ステータス計算システム ---

// 次のレベルまでの必要経験値を計算 (簡易曲線)
function calculateNextExp(level, type) {
    const base = 50;
    let multiplier = 1.0;
    if (type === 'fast') multiplier = 0.7;
    if (type === 'slow') multiplier = 1.5;
    
    // 計算式: Base * (Level^2.5) * Multiplier
    return Math.floor(base * Math.pow(level, 2.5) * multiplier);
}

// 現在のレベルに基づいてステータスを再計算 (線形補間)
function recalculatePlayerStats() {
    const p = playerState;
    const pd = gameData.player || {}; // 初期設定参照用
    const lv = p.$level;
    
    // --- ★追加ヘルパー: 値を安全に数値化する ---
    const getVal = (v, def) => {
        const res = resolveValue(v);
        return (res !== undefined && res !== null && !isNaN(res)) ? Number(res) : def;
    };
    // ------------------------------------------

    const minLv = getVal(p.initialLevel, 1);
    const maxLv = getVal(p.maxLevel, 99);
    
    // バフリスト初期化
    if (!p.activeBuffs) p.activeBuffs = [];

    // レベル成長率
    let ratio = 0;
    if (maxLv > minLv) ratio = (lv - minLv) / (maxLv - minLv);
    const lerp = (start, end, r) => start + (end - start) * r;

    // --- 1. ベース値の計算 (レベル依存) ---
    let valHp  = Math.floor(lerp(getVal(pd.maxHp, 10), getVal(pd.limitHp, 100), ratio));
    let valSt  = Math.floor(lerp(getVal(pd.maxStamina, 100), getVal(pd.limitStamina, 150), ratio));
    let valAtk = Math.floor(lerp(getVal(pd.atk, 1), getVal(pd.limitAtk, 10), ratio));
    let valDef = Math.floor(lerp(getVal(pd.def, 0), getVal(pd.limitDef, 10), ratio));
    let valSpd = parseFloat(lerp(getVal(pd.spd, 4.0), getVal(pd.limitSpd, 6.0), ratio).toFixed(2));
        let valStRegen = Math.floor(lerp(getVal(pd.staminaRegen, 20), getVal(pd.limitStaminaRegen, 50), ratio));
    let valPen = Math.floor(lerp(getVal(pd.penetration, 1), getVal(pd.limitPenetration, 10), ratio));

    // ※固定値パラメータも getVal で取得
    let valRange = getVal(pd.attackRange, 32);
    let valCool  = getVal(pd.attackCooldown, 20);
    let valProj  = getVal(pd.projectileSpeed, 0);
    let valCrit  = getVal(pd.criticalRate, 5);



// --- 2. 装備品の補正を加算 (配列対応) ---
            
            // 配列であることを保証
            const equips = Array.isArray(p.equipment) 
                ? p.equipment 
                : (p.equipment ? [p.equipment] : []);

            // ヘルパー関数: 数値解決
            const c = (v) => (v !== undefined && v !== null && v !== "") ? Number(resolveValue(v)) : 0;

            equips.forEach(eqId => {
                const equip = gameData.items[eqId];
                if (equip) {
                    const fx = equip.effects || {};

                    if (fx.atk) valAtk += c(fx.atk);
                    if (fx.def) valDef += c(fx.def);
                    if (fx.hpMax) valHp += c(fx.hpMax); // ★追加: 最大HP補正
                    if (fx.staminaMax) valSt += c(fx.staminaMax); // ★追加: 最大ST補正
                    if (fx.spd) valSpd += c(fx.spd);
                    
                    if (fx.range) valRange += c(fx.range);
                    if (fx.cooldownReduce) valCool -= c(fx.cooldownReduce);
                    if (fx.projSpeed) valProj += c(fx.projSpeed);
                    if (fx.critRate) valCrit += c(fx.critRate);
                    if (fx.penetration) valPen += c(fx.penetration);
                }
            });
// --- 3. 一時バフの補正を加算 ---
            p.activeBuffs.forEach(buff => {
                if (buff.type === 'atk') valAtk += buff.value;
                if (buff.type === 'def') valDef += buff.value;
                if (buff.type === 'spd') valSpd += buff.value;
            });

            // --- 3.5 永続バフ（アイテム使用による成長）の加算 ---
            if (p.permanentBuffs) {
                if (p.permanentBuffs.hpMax) valHp += p.permanentBuffs.hpMax;
                if (p.permanentBuffs.staminaMax) valSt += p.permanentBuffs.staminaMax;
                if (p.permanentBuffs.atk) valAtk += p.permanentBuffs.atk;
                if (p.permanentBuffs.def) valDef += p.permanentBuffs.def;
                if (p.permanentBuffs.spd) valSpd += p.permanentBuffs.spd;
                if (p.permanentBuffs.projSpeed) valProj += p.permanentBuffs.projSpeed;
            }

            // ★修正: 変化前の値を記憶
            const oldMaxHp = p.$maxHp || valHp;
            const oldMaxSt = p.$maxStamina || valSt;

            // ★修正: 差分を計算 (最大値が下がった場合のマイナスも考慮)
            const diffHp = valHp - oldMaxHp;
            const diffSt = valSt - oldMaxSt;

            // ★修正: 現在値に差分を純粋に足す。ただし「現在の割合」を著しく損なうようなら割合維持にする
            if (p.$hp !== undefined) {
                if (diffHp > 0) {
                    p.$hp = Math.min(valHp, p.$hp + diffHp); // 上がった分だけ回復
                } else if (diffHp < 0) {
                    p.$hp = Math.max(1, Math.min(valHp, p.$hp)); // 下がった場合は上限を切り詰めるだけ
                }
            } else {
                p.$hp = valHp;
            }

            if (p.$stamina !== undefined) {
                if (diffSt > 0) {
                    p.$stamina = Math.min(valSt, p.$stamina + diffSt);
                } else if (diffSt < 0) {
                    p.$stamina = Math.max(0, Math.min(valSt, p.$stamina));
                }
            } else {
                p.$stamina = valSt;
            }

            // --- 4. 結果を適用 ---
            p.$maxHp = valHp;
            p.$maxStamina = valSt;
            p.$atk = valAtk;
            p.$def = valDef;
            p.$spd = parseFloat(valSpd.toFixed(2));
            
    p.staminaRegen = valStRegen; // $をつけない（内部パラメータとして保持）
    p.attackRange = Math.max(1, valRange);
    p.attackCooldown = Math.max(1, valCool);
    p.projectileSpeed = valProj;
    p.criticalRate = valCrit;
    p.penetration = Math.max(1, valPen); // 計算結果を適用

            p.$nextExp = calculateNextExp(lv, p.growthType || 'normal');
            
            // ★最適化: ステータスが変わったら、必ず画面上のHUD（HPバーやテキスト）も最新に更新する
            if (typeof updateHUD === 'function') updateHUD();
        }
function gainExp(amount) {
    if (amount <= 0) return;
    
    // すでに最大レベルに達している場合は経験値を入手しない
    const maxLv = (playerState.maxLevel !== undefined) ? Number(resolveValue(playerState.maxLevel)) : 99;
    if (playerState.$level >= maxLv) {
        playerState.$exp = 0;
        playerState.$nextExp = "MAX";
        return;
    }
    
    playerState.$exp += amount;
    showDamagePopup(mapEngine.player, "+" + amount + " EXP", 'exp');
    let leveledUp = false;
    
    // レベルアップループ (一度に複数レベル上がる場合に対応しつつ、次要件を再計算)
    while (playerState.$exp >= playerState.$nextExp && playerState.$level < maxLv) {
        playerState.$exp -= playerState.$nextExp;
        playerState.$level++;
        
        // レベルアップした状態で、次の必要経験値を再計算する（フリーズ防止）
        playerState.$nextExp = calculateNextExp(playerState.$level, playerState.growthType || 'normal');
        leveledUp = true;
    }

    // ループを抜けた後、最大レベルに達していたら経験値をストップする
    if (playerState.$level >= maxLv) {
        playerState.$level = maxLv;
        playerState.$exp = 0;
        playerState.$nextExp = "MAX";
    }

    if (leveledUp) {
        recalculatePlayerStats();
        // HP/スタミナ全回復
        playerState.$hp = playerState.$maxHp;
        playerState.$stamina = playerState.$maxStamina;
        
        // 演出
        showDamagePopup(mapEngine.player, "LEVEL UP!", 'critical');
        ui.container.className = 'fx-flash-white'; // フラッシュ
        setTimeout(() => ui.container.className = '', 500);
        
        // レベルアップ音
        // if (gameData.assets.sounds['levelup']) AudioManager.playSe('levelup', masterVolSe);
    }
}


const threeHandler = ${needs3D} ? {
            scene: null,
            camera: null,
            renderer: null,
            models: {},
            vrms: {},
            animations: {},
            mixers: [],
            mmdHelper: null,
            clock: new THREE.Clock(),
            currentStageModel: null,
            currentPlayerModel: null,
            animationId: null,
            isPhysicsEnabled: false,

            // Camera State
            headBobTime: 0,
            tpsCameraState: { zoomLevel: 1.0, smoothing: 10.0 },

            // Player Animation State
            playerMixer: null,
            currentPlayerAction: null,
            currentAnimId: null,

            init: function(canvas) {
                // 既存のレンダラーがあれば破棄してメモリ解放
                if (this.renderer) {
                    this.clearAll();
                    this.renderer.dispose();
                    this.renderer.forceContextLoss();
                    this.renderer = null;
                }
                
                if (this.animationId) cancelAnimationFrame(this.animationId);

                this.scene = new THREE.Scene();
                this.camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
                this.camera.position.set(0, 1.3, 3.0);
                
                const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
                this.scene.add(ambientLight);
                const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
                dirLight.position.set(1, 1, 1).normalize();
                this.scene.add(dirLight);

                this.renderer = new THREE.WebGLRenderer({
                    canvas: canvas,
                    alpha: true,
                    antialias: true,
                    preserveDrawingBuffer: true
                });
                this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
                this.renderer.setPixelRatio(window.devicePixelRatio);
                this.renderer.outputColorSpace = THREE.SRGBColorSpace;
                this.renderer.shadowMap.enabled = true;
            },

            resize: function(width, height) {
                if (this.camera && this.renderer) {
                    this.camera.aspect = width / height;
                    this.camera.updateProjectionMatrix();
                    this.renderer.setSize(width, height);
                }
            },

            getScreenPosition: function(x, y, zOffset, canvasWidth, canvasHeight) {
                if (!this.camera || !this.renderer) return null;

                const UNIT = 32.0;
                // マップ上の座標(Grid単位)を3Dワールド座標に変換
                const worldX = x / UNIT;
                const worldZ = y / UNIT; // 2DのYは3DのZになる
                
                // ターゲットの位置ベクトルを作成 (高さは1.5m + オフセット)
                const targetPos = new THREE.Vector3(worldX, 1.5 + (zOffset / UNIT), worldZ);

                // カメラ座標系へ変換
                targetPos.project(this.camera);

                // カメラの後ろにある場合はnullを返す
                if (targetPos.z > 1) return null;

                // スクリーン座標(px)に変換
                const sx = (targetPos.x + 1) * canvasWidth / 2;
                const sy = -(targetPos.y - 1) * canvasHeight / 2;

                return { x: sx, y: sy };
            },

            // --- メモリ解放用メソッド群 ---

            _disposeMaterial: function(material) {
                if (!material) return;
                const maps = ['map', 'aoMap', 'alphaMap', 'bumpMap', 'displacementMap', 'emissiveMap', 'envMap', 'lightMap', 'metalnessMap', 'normalMap', 'roughnessMap'];
                maps.forEach(key => {
                    if (material[key]) material[key].dispose();
                });
                if (material.uniforms) {
                    Object.values(material.uniforms).forEach(u => {
                        if (u.value && u.value.isTexture) u.value.dispose();
                    });
                }
                material.dispose();
            },

            _cleanObject: function(object) {
                if (!object) return;
                object.traverse(child => {
                    if (child.isMesh) {
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(m => this._disposeMaterial(m));
                            } else {
                                this._disposeMaterial(child.material);
                            }
                        }
                    }
                    if (child.isSkinnedMesh) {
                        child.skeleton.dispose();
                    }
                });
            },

            _safeRemoveMMD: function(model) {
                if (this.mmdHelper && model) {
                    try {
                        this.mmdHelper.remove(model);
                    } catch (e) {}
                }
            },

            unloadModel: function(id) {
                const model = this.models[id];
                if (!model) return;

                this.scene.remove(model);
                
                this.mixers = this.mixers.filter(m => {
                    if (m.getRoot() === model) {
                        m.stopAllAction();
                        m.uncacheRoot(model);
                        return false;
                    }
                    return true;
                });

                if (model.userData.isMMD) {
                    this._safeRemoveMMD(model);
                }

                if (this.vrms[id]) {
                    const vrm = this.vrms[id];
                    if (vrm.dispose) vrm.dispose(); 
                    VRMUtils.removeUnnecessaryVertices(vrm.scene);
                    VRMUtils.removeUnnecessaryJoints(vrm.scene);
                    delete this.vrms[id];
                }

                this._cleanObject(model);

                delete this.models[id];
                if (window.modelCollisionCache) delete window.modelCollisionCache[id];
            },

            clearAll: function() {
                Object.keys(this.models).forEach(id => {
                    this.unloadModel(id);
                });
                
                if (this.scene) {
                    const toRemove = [];
                    this.scene.traverse(child => {
                        if (child.isMesh || child.isGroup) toRemove.push(child);
                    });
                    toRemove.forEach(child => {
                        this.scene.remove(child);
                        this._cleanObject(child);
                    });
                }
                
                this.animations = {};
                this.mixers = [];
                this.models = {};
                this.vrms = {};
                this.currentStageModel = null;
                this.currentPlayerModel = null;
                this.playerMixer = null;
                this.currentPlayerAction = null;
            },

            adjustTpsCameraZoom: function(delta) {
                this.tpsCameraState.zoomLevel += delta;
                this.tpsCameraState.zoomLevel = Math.max(0.5, Math.min(3.0, this.tpsCameraState.zoomLevel));
            },

            loadAssets: async function() {
                const gltfLoader = new GLTFLoader();
                gltfLoader.register((parser) => new VRMLoaderPlugin(parser));
                gltfLoader.register((parser) => new VRMAnimationLoaderPlugin(parser));

                const { MMDLoader } = await import('three/addons/loaders/MMDLoader.js');
                const { MMDAnimationHelper } = await import('three/addons/animation/MMDAnimationHelper.js');
                
                try {
                    const mmdparser = await import('mmdparser');
                    const Parser = mmdparser.default || mmdparser;
                    if (Parser && Parser.CharsetEncoder) {
                        const originalS2U = Parser.CharsetEncoder.prototype.s2u;
                        Parser.CharsetEncoder.prototype.s2u = function(uint8array) {
                            try { return originalS2U.call(this, uint8array); } catch (e) { return "????"; }
                        };
                    }
                } catch (e) { console.warn("Failed to patch mmdparser:", e); }

                this.isPhysicsEnabled = (typeof window.Ammo !== 'undefined');
                
                if (this.isPhysicsEnabled) {
                    this.mmdHelper = new MMDAnimationHelper({ afterglow: 2.0 });
                } else {
                    this.mmdHelper = new MMDAnimationHelper({ afterglow: 0.0, physics: false });
                }

                const models = gameData.assets.models || {};
                const anims = gameData.assets.animations || {};

                const modelPromises = Object.keys(models).map(async (id) => {
                    try {
                        const asset = models[id];
                        let modelScene;

                        if (asset.format === 'mmd' || asset.name.endsWith('.pmx') || asset.name.endsWith('.pmd')) {
                            const resourceMap = new Map();
                            if (asset.resources) {
                                for (const [fileName, dataUrl] of Object.entries(asset.resources)) {
                                    const res = await fetch(dataUrl);
                                    const blob = await res.blob();
                                    const url = URL.createObjectURL(blob);
                                    
                                    // ★最適化: Shift-JIS文字化け対策。
                                    // 確実にファイル名だけを取り出し、小文字化して登録
                                    const cleanName = fileName.split('\\\\').join('/').split('/').pop().toLowerCase();
                                    resourceMap.set(cleanName, url);
                                }
                            }

                            const manager = new THREE.LoadingManager();
                            manager.setURLModifier((url) => {
                                // ★最適化: PMX内部に記録されたパスも同様に、ファイル名だけを抽出して比較する
                                let fileName = url;
                                try { fileName = decodeURIComponent(url); } catch(e){}
                                
                                const cleanKey = fileName.replace(/\\\\/g, '/').split('/').pop().toLowerCase();
                                
                                if (resourceMap.has(cleanKey)) {
                                    return resourceMap.get(cleanKey);
                                }
                                return url;
                            });

                            const loaderWithManager = new MMDLoader(manager);
                            const pmxRes = await fetch(asset.data);
                            const pmxBlob = await pmxRes.blob();
                            const pmxUrl = URL.createObjectURL(pmxBlob);

                            const mmdObj = await loaderWithManager.loadAsync(pmxUrl);
                            modelScene = mmdObj; 
                            modelScene.userData.isMMD = true;

                        } else {
                            const gltf = await gltfLoader.loadAsync(asset.data);
                            const vrm = gltf.userData.vrm;
                            modelScene = vrm ? vrm.scene : gltf.scene;

                            if (vrm) {
                                VRMUtils.removeUnnecessaryVertices(modelScene);
                                VRMUtils.removeUnnecessaryJoints(modelScene);
                                vrm.lookAt.target = this.camera;
                                this.vrms[id] = vrm;
                            }
                        }

                        if (modelScene) {
                            modelScene.visible = false;
                            modelScene.name = id;
                            this.scene.add(modelScene);
                            this.models[id] = modelScene;

                            const box = new THREE.Box3().setFromObject(modelScene);
                            const size = new THREE.Vector3();
                            box.getSize(size);
                            if (!window.modelCollisionCache) window.modelCollisionCache = {};
                            window.modelCollisionCache[id] = { w: size.x * 32.0, h: size.y * 32.0, d: size.z * 32.0 };
                        }

                    } catch (e) {
                        console.error('Failed to load model: ' + id, e);
                    }
                });

                const animPromises = Object.keys(anims).map(async (id) => {
                    try {
                        const asset = anims[id];
                        if (asset.format === 'vmd' || asset.name.endsWith('.vmd')) {
                            const res = await fetch(asset.data);
                            const blob = await res.blob();
                            const url = URL.createObjectURL(blob);
                            this.animations[id] = { type: 'vmd', url: url };
                        } else {
                            const gltf = await gltfLoader.loadAsync(asset.data);
                            this.animations[id] = gltf.userData.vrmAnimations ? gltf.userData.vrmAnimations[0] : null;
                        }
                    } catch (e) {
                        console.error('Failed to load animation: ' + id, e);
                    }
                });

                await Promise.all([...modelPromises, ...animPromises]);
            },

            showModel: async function(id, config = {}) {
                const model = this.models[id];
                const vrm = this.vrms[id];

                if (model) {
                    model.visible = true;
                    model.position.set(config.posX || 0, config.posY || 0, config.posZ || 0);
                    
                    const defRotY = vrm ? Math.PI : 0;
                    model.rotation.set(
                        (config.rotX || 0) * (Math.PI / 180),
                        ((config.rotY || 0) * (Math.PI / 180)) + defRotY,
                        (config.rotZ || 0) * (Math.PI / 180)
                    );
                    
                    let baseScale = 1.0;
                    if (model.userData.isMMD) {
                        baseScale = 0.08; 
                    }
                    const s = (config.scale !== undefined ? config.scale : 1.0) * baseScale;
                    model.scale.set(s, s, s);

                    if (vrm) {
                        if (vrm.springBoneManager) vrm.springBoneManager.reset();
                        
                        if (vrm.expressionManager) {
                            vrm.expressionManager.resetValues();
                            if (config.expression) {
                                vrm.expressionManager.setValue(config.expression, 1.0);
                            }
                        }

                        if (config.animationId && this.animations[config.animationId] && !this.animations[config.animationId].type) {
                            this.mixers = this.mixers.filter(m => m.getRoot() !== model);
                            
                            const mixer = new THREE.AnimationMixer(model);
                            const clip = createVRMAnimationClip(this.animations[config.animationId], vrm);
                            
                            if (clip) {
                                const action = mixer.clipAction(clip);
                                if (config.loop === false) {
                                    action.setLoop(THREE.LoopOnce);
                                    action.clampWhenFinished = true;
                                } else {
                                    action.setLoop(THREE.LoopRepeat);
                                }
                                action.play();
                                this.mixers.push(mixer);
                            }
                        } else {
                            this.mixers = this.mixers.filter(m => m.getRoot() !== model);
                        }
                    }
                    
                    if (model.userData.isMMD) {
                        try {
                            this._safeRemoveMMD(model);
                            
                            let mmdAnim = [];
                            
                            if (config.animationId && this.animations[config.animationId] && this.animations[config.animationId].type === 'vmd') {
                                const vmdInfo = this.animations[config.animationId];
                                const { MMDLoader } = await import('three/addons/loaders/MMDLoader.js');
                                const loader = new MMDLoader();
                                mmdAnim = await loader.loadAnimation(vmdInfo.url, model);
                            }
                            
                            this.mmdHelper.add(model, {
                                animation: mmdAnim,
                                physics: this.isPhysicsEnabled
                            });
                            
                        } catch(e) {
                            console.error("MMD Setup Error:", e);
                        }
                    }
                }
            },

            showStage: function(id) {
                if (this.currentStageModel) {
                    this.currentStageModel.visible = false;
                    this.currentStageModel = null;
                }
                if (id && this.models[id]) {
                    const model = this.models[id];
                    model.visible = true;
                    model.position.set(0, 0, 0);
                    model.rotation.set(0, 0, 0);
                    let baseScale = 1.0;
                    if (model.userData.isMMD) baseScale = 0.08;
                    model.scale.set(baseScale, baseScale, baseScale);
                    this.currentStageModel = model;
                }
            },
            
            hideStage: function() {
                if (this.currentStageModel) {
                    this.currentStageModel.visible = false;
                    this.currentStageModel = null;
                }
            },

            showPlayer: function(id) {
                if (this.currentPlayerModel) {
                    this.currentPlayerModel.visible = false;
                    this.currentPlayerModel = null;
                }
                if (id && this.models[id]) {
                    const model = this.models[id];
                    model.visible = true;
                    model.position.set(0, 0, 0);
                    model.rotation.set(0, 0, 0);
                    
                    let baseScale = 1.0;
                    if (model.userData.isMMD) baseScale = 0.08;
                    model.scale.set(baseScale, baseScale, baseScale);
                    
                    this.currentPlayerModel = model;
                    
                    this.playerMixer = new THREE.AnimationMixer(model);
                    this.currentPlayerAction = null;
                    this.currentAnimId = null;
                    
                    if (model.userData.isMMD) {
                        this._safeRemoveMMD(model);
                        this.mmdHelper.add(model, { physics: this.isPhysicsEnabled });
                    }
                }
            },

            hidePlayer: function() {
                if (this.currentPlayerModel) {
                    this.currentPlayerModel.visible = false;
                    this.currentPlayerModel = null;
                }
            },

            hideAll: function() {
                for (const key in this.models) {
                    const model = this.models[key];
                    if (model !== this.currentStageModel && model !== this.currentPlayerModel) {
                        model.visible = false;
                        if (this.vrms[key] && this.vrms[key].expressionManager) {
                            this.vrms[key].expressionManager.resetValues();
                        }
                        if (model.userData.isMMD) {
                            this._safeRemoveMMD(model);
                        }
                    }
                }
                this.mixers = [];
            },

            updatePlayerTransform: function(x, y, dir, isMoving, jumpHeight = 0) {
                if (this.currentPlayerModel) {
                    const UNIT = 32.0;
                    const worldX = x / UNIT;
                    const worldZ = y / UNIT;
                    this.currentPlayerModel.position.set(worldX, jumpHeight, worldZ);
                    this.currentPlayerModel.rotation.set(0, -dir + Math.PI / 2, 0);
                }
            },

            changePlayerAnimation: function(animId) {
                if (!this.currentPlayerModel || !this.playerMixer || !animId) return;
                if (this.currentAnimId === animId) return;

                const animAsset = this.animations[animId];
                if (!animAsset) return;

                let clip = null;
                const vrm = this.vrms[this.currentPlayerModel.name];

                if (!animAsset.type) { 
                    if (vrm) {
                        clip = createVRMAnimationClip(animAsset, vrm);
                    } else {
                        clip = animAsset; 
                    }
                }

                if (clip) {
                    const newAction = this.playerMixer.clipAction(clip);
                    newAction.reset();
                    newAction.play();

                    if (this.currentPlayerAction) {
                        this.currentPlayerAction.crossFadeTo(newAction, 0.2);
                    }
                    
                    this.currentPlayerAction = newAction;
                    this.currentAnimId = animId;
                }
            },

            syncCamera: function(x, y, type, zoom, dir, pitch, isFirstPerson, isMoving, delta) {
                if (!this.camera) return;
                if (delta === undefined) delta = 0.016; 

                this.camera.zoom = zoom;
                const UNIT = 32.0;
                const wx = x / UNIT;
                const wz = y / UNIT;

                if (type === 'dungeon' || type === '3d') {

                    if (this.currentPlayerModel) {
                        this.currentPlayerModel.visible = !isFirstPerson;
                    }

                    if (this.currentPlayerModel && !isFirstPerson) {
                        let modelHeight = 1.6;
                        if (this.currentPlayerModel && window.modelCollisionCache && window.modelCollisionCache[this.currentPlayerModel.name]) {
                            modelHeight = window.modelCollisionCache[this.currentPlayerModel.name].h / UNIT;
                        }

                        const baseDistance = modelHeight * 2.5;
                        const baseHeight = modelHeight * 1.2;

                        let distH = baseDistance * this.tpsCameraState.zoomLevel;
                        let distV = baseHeight * this.tpsCameraState.zoomLevel;
                        
                        const targetPos = new THREE.Vector3(wx, modelHeight * 0.9, wz);
                        
                        const camX_ideal = wx - Math.cos(dir) * distH;
                        const camZ_ideal = wz - Math.sin(dir) * distH;
                        const camY_ideal = targetPos.y + distV + Math.sin(pitch) * distH;
                        const idealPos = new THREE.Vector3(camX_ideal, camY_ideal, camZ_ideal);

                        const direction = new THREE.Vector3().subVectors(idealPos, targetPos).normalize();
                        const totalDist = targetPos.distanceTo(idealPos);
                        const raycaster = new THREE.Raycaster(targetPos, direction, 0.1, totalDist);
                        
                        let finalPos = idealPos;
                        if (this.currentStageModel) {
                            const intersects = raycaster.intersectObject(this.currentStageModel, true);
                            if (intersects.length > 0) {
                                // 壁の手前 0.2m で止める（めり込み防止）
                                finalPos = intersects[0].point.sub(direction.clone().multiplyScalar(0.2));
                            }
                        }
                        
                        // 地面より下にカメラがいかないようにする
                        if (finalPos.y < 0.2) finalPos.y = 0.2;

                        // フレームレートに依存しない滑らかな追従計算
                        const lerpFactor = 1.0 - Math.exp(-this.tpsCameraState.smoothing * delta);
                        this.camera.position.lerp(finalPos, lerpFactor);
                        
                        // 注視点（カメラの向き）も滑らかに補完して「ガタつき」を抑える
                        if (!this.tpsCameraState.currentLookAt) {
                            this.tpsCameraState.currentLookAt = targetPos.clone();
                        }
                        this.tpsCameraState.currentLookAt.lerp(targetPos, lerpFactor);
                        this.camera.lookAt(this.tpsCameraState.currentLookAt);

                    } else {
                        const eyeH = 1.5;
                        const bobAmount = 0.03;
                        const bobSpeed = 10.0;
                        
                        if (isMoving) this.headBobTime += delta * bobSpeed;
                        else this.headBobTime *= 0.95;
                        
                        const bobOffset = Math.sin(this.headBobTime) * bobAmount;
                        this.camera.position.set(wx, eyeH + bobOffset, wz);

                        const checkDirection = new THREE.Vector3();
                        this.camera.getWorldDirection(checkDirection);
                        const wallRay = new THREE.Raycaster(this.camera.position, checkDirection, 0, 0.5);
                        let isCloseToWall = false;
                        if (this.currentStageModel) {
                            isCloseToWall = wallRay.intersectObject(this.currentStageModel, true).length > 0;
                        }
                        this.camera.near = isCloseToWall ? 0.25 : 0.1;

                        const rotY = -dir + Math.PI / 2;
                        const rotX = -pitch;
                        this.camera.rotation.set(rotX, rotY, 0, 'YXZ');
                    }
                } else if (type === 'mode7') {
                    this.camera.position.set(wx, 2.5 / zoom, wz);
                    this.camera.lookAt(wx + 10 * Math.cos(dir), 0, wz + 10 * Math.sin(dir));
                } else if (type === 'quarter') {
                    const d = 10 / zoom;
                    this.camera.position.set(wx, d, wz + d);
                    this.camera.lookAt(wx, 0, wz);
                } else {
                    const d = 10 / zoom;
                    this.camera.position.set(wx, d, wz);
                    this.camera.up.set(0, 0, 1);
                    this.camera.lookAt(wx, 0, wz);
                    this.camera.up.set(0, 1, 0);
                    this.camera.position.set(wx, d, wz);
                    this.camera.rotation.set(-Math.PI / 2, 0, 0);
                }
                this.camera.updateProjectionMatrix();
            },

            updateAndRender: function() {
                const delta = this.clock.getDelta();
                
                for (const k in this.vrms) {
                    if (this.vrms[k]) this.vrms[k].update(delta);
                }
                
                if (this.mmdHelper) {
                    this.mmdHelper.update(delta);
                }

                this.mixers.forEach(m => m.update(delta));
                
                if (this.playerMixer) {
                    this.playerMixer.update(delta);
                }
                
                if (this.renderer && this.scene && this.camera) {
                    this.renderer.render(this.scene, this.camera);
                }
            }
        } : {
            init: function(){},
            resize: function(){},
            getScreenPosition: function(){ return null; },
            loadAssets: async function(){ return Promise.resolve(); },
            showModel: function(){},
            showStage: function(){},
            hideStage: function(){},
            showPlayer: function(){},
            hidePlayer: function(){},
            hideAll: function(){},
            updatePlayerTransform: function(){},
            changePlayerAnimation: function(){},
            syncCamera: function(){},
            updateAndRender: function(){},
            clearAll: function(){},
            adjustTpsCameraZoom: function(){}
        };
        const mapEngine = {
            canvas: document.getElementById('map-canvas'),
            ctx: document.getElementById('map-canvas').getContext('2d', { willReadFrequently: true }),
            data: null, currentMapId: null, bgImage: null, bgScrollY: 0,
            player: { x: 0, y: 0, w: 32, h: 32, speed: 4, vx: 0, vy: 0, onGround: false, isClimbing: false, gravity: 0.6, jumpPower: -12, dir: 0.5 * Math.PI, pitch: 0, invincible: 0, attackCooldown: 0, _currentSpeed: 4 },
            camera: { x: 0, y: 0 }, 
            keys: {}, prevKeys: {}, 
            rawKeys: {}, padPressedKeys: [], // ★追加: コントローラーとキーボードの混線を防ぐための生データ
            GRID: 32, activeObjects: [], imgCache: {},
            eventCooldown: 0, currentZoom: 1.0, isVideo: false
        };
window.toggleSystemMenu = () => {
    const menu = document.getElementById('system-menu');
    menu.classList.toggle('collapsed');
    
    const btn = document.getElementById('sys-toggle-btn');
    if (menu.classList.contains('collapsed')) {
        btn.textContent = "≡ MENU";
        btn.style.backgroundColor = "rgba(0,0,0,0.7)";
    } else {
        btn.textContent = "× CLOSE";
        btn.style.backgroundColor = "rgba(200,0,0,0.7)";
    }
};

// 画面サイズ変更時にPCサイズならメニューを自動で開くなどの配慮
window.addEventListener('resize', () => {
    if (window.innerWidth > 600) {
        document.getElementById('system-menu').classList.remove('collapsed');
        document.getElementById('sys-toggle-btn').style.display = 'none';
    } else {
        // スマホサイズになったらボタンを表示（閉じるかどうかは任意）
        document.getElementById('sys-toggle-btn').style.display = 'block';
    }
});
// 初期ロード時にもチェック
if (window.innerWidth > 600) {
    document.getElementById('system-menu')?.classList.remove('collapsed');
}

window.toggleConfig = () => {
    const el = document.getElementById('config-overlay');
    // 開くとき
    if (el.style.display !== 'flex') {
        if (isGamePaused) return; // 既にポーズ中なら開かない（競合防止）
        el.style.display = 'flex';
        togglePause(true); // コンフィグ中はゲームをポーズする（強制）
    } 
    // 閉じるとき
    else {
        el.style.display = 'none';
        togglePause(false); // ポーズ解除
    }
};

window.updateVolume = async (type, val) => {
    const vol = val / 100;
    if (type === 'bgm') {
        masterVolBgm = vol;
        document.getElementById('vol-bgm-val').textContent = val + '%';
        if (AudioManager._bgm) AudioManager._bgm.volume = masterVolBgm;
        await saveToDB('cfg_vol_bgm', val); 
    } else {
        masterVolSe = vol;
        document.getElementById('vol-se-val').textContent = val + '%';
        await saveToDB('cfg_vol_se', val);
    }
};

window.togglePause = (forceState) => {
    // 各種オーバーレイ要素の取得
    const configOverlay = document.getElementById('config-overlay');
    const slOverlay = document.getElementById('sl-overlay');
    const pauseOverlay = document.getElementById('pause-overlay');

    // 開いているかチェック
    const isConfigOpen = (configOverlay && configOverlay.style.display === 'flex');
    const isSLOpen = (slOverlay && slOverlay.style.display === 'flex');

    if (forceState !== undefined) {
        isGamePaused = forceState;
    } else {
        // メニューが開いているときはポーズボタン(キー)での解除を禁止
        if (isConfigOpen || isSLOpen) return;
        isGamePaused = !isGamePaused;
    }

    // 他のメニューが出ていない場合のみ、黒背景の「PAUSED」文字を出す
    // (セーブ画面などを邪魔しないようにする)
    if (!isConfigOpen && !isSLOpen) {
        if (pauseOverlay) pauseOverlay.style.display = isGamePaused ? 'flex' : 'none';
    } else {
        if (pauseOverlay) pauseOverlay.style.display = 'none';
    }

    if (!isGamePaused) {
        // ポーズ解除時は時間のズレをリセット
        lastTime = performance.now();
    }
};

        window.toggleBacklog = () => {
            if (ui.backlog.style.display === 'flex') ui.backlog.style.display = 'none';
            else {
                ui.backlogContent.innerHTML = '';
                backLog.forEach(e => {
                    const d = document.createElement('div');
                    if(e.type==='choice') { d.className='log-entry log-choice'; d.textContent='👉 '+e.text; }
                    else { d.className='log-entry'; d.innerHTML = '<div class="log-name">' + (e.name||'') + '</div><div class="log-text">' + e.text + '</div>'; }
                    ui.backlogContent.appendChild(d);
                });
                ui.backlogContent.scrollTop = ui.backlogContent.scrollHeight; ui.backlog.style.display = 'flex'; stopAutoSkip();
            }
        };
        window.toggleAuto = () => { isAuto=!isAuto; isSkip=false; updateBtns(); checkAuto(); };
        window.toggleSkip = () => { isSkip=!isSkip; isAuto=false; updateBtns(); checkAuto(); };
        function stopAutoSkip() { isAuto=false; isSkip=false; updateBtns(); clearTimeout(autoTimer); }
        function updateBtns() { ui.btnAuto.classList.toggle('active', isAuto); ui.btnSkip.classList.toggle('active', isSkip); }
        function checkAuto() { clearTimeout(autoTimer); if (!isWaitingForInput || isMapMode) return; if (isAuto || isSkip) { autoTimer = setTimeout(() => { if(isWaitingForInput && !isMapMode) processNode(currentNodeId); }, isSkip ? 50 : 2000); } }

// --- Save/Load System (Enhanced) ---
        
        let currentSLMode = null; // 'save' or 'load'

       window.openSaveLoadModal = (mode) => {
            currentSLMode = mode;
            const titleEl = document.getElementById('sl-title');
            const overlay = document.getElementById('sl-overlay');
            
            // ▼▼▼ 追加: ボタンの文言を書き換える ▼▼▼
            const btnBrowser = document.getElementById('sl-btn-browser');
            const btnFile = document.getElementById('sl-btn-file');

            if (mode === 'save') {
                if (titleEl) titleEl.textContent = "SAVE GAME";
                if (btnBrowser) btnBrowser.innerHTML = '💾 <b>ブラウザに保存</b><br><span style="font-size:0.8em; color:#aaa;">(この端末に記録)</span>';
                if (btnFile) btnFile.innerHTML = '📂 <b>ファイルとして保存</b><br><span style="font-size:0.8em; color:#aaa;">(jsonダウンロード)</span>';
            } else {
                if (titleEl) titleEl.textContent = "LOAD GAME";
                // ★修正: ユーザー手動セーブ(save01)とオートセーブ(autosave)の両方をロードできるようにする
                if (btnBrowser) btnBrowser.innerHTML = '💾 <b>手動セーブから再開</b><br><span style="font-size:0.8em; color:#aaa;">(ブラウザの記録)</span>';
                if (btnFile) btnFile.innerHTML = '📂 <b>ファイルから復元</b><br><span style="font-size:0.8em; color:#aaa;">(jsonアップロード)</span>';
                
                // オートセーブ復元ボタンを動的に追加
                const slContainer = document.getElementById('sl-btn-browser').parentNode;
                let autoBtn = document.getElementById('sl-btn-autosave');
                if (!autoBtn) {
                    autoBtn = document.createElement('button');
                    autoBtn.id = 'sl-btn-autosave';
                    autoBtn.className = 'sys-btn';
                    autoBtn.style.cssText = 'padding:15px; font-size:1.1em; background:rgba(0,100,255,0.2); border-color:#1890ff; color:#fff;';
                    autoBtn.innerHTML = '🔄 <b>オートセーブから再開</b><br><span style="font-size:0.8em; color:#aaa;">(マップ移動時の自動記録)</span>';
                    autoBtn.onclick = () => { window.loadGameLocal('autosave'); };
                    // ファイルロードボタンの前（真ん中）に挿入
                    slContainer.insertBefore(autoBtn, btnFile);
                }
                autoBtn.style.display = 'block';
            }
            
            if (overlay) overlay.style.display = 'flex';
            togglePause(true); 
        };
        
        // ロードボタン用エイリアス (HTML側で呼び出し)
        window.openLoadMenu = (mode) => window.openSaveLoadModal(mode);

        window.closeSLModal = () => {
            const overlay = document.getElementById('sl-overlay');
            if (overlay) overlay.style.display = 'none';
            currentSLMode = null;
            togglePause(false);
        };

window.execSL = (target) => {
            // 1. 先にモードを確保しておく
            const mode = currentSLMode;
            
            // 2. モーダルを閉じる
            window.closeSLModal();

            // 3. 確保しておいたモードで判定する
            if (mode === 'save') {
                if (target === 'browser') {
                    saveGameLocal(); 
                } else {
                    saveGameFile();
                }
            } else if (mode === 'load') {
                if (target === 'browser') {
                    loadGameLocal(); 
                } else {
                    const input = document.getElementById('sl-file-input');
                    if (input) input.click();
                }
            }
        };

        // --- 共通: セーブデータオブジェクト作成関数 ---
         function createSaveData() {
            // ★最適化: 3Dモデルの現在の「表情」と「ポーズ」をすべて記録する
            const currentModelStates = {};
            if (window.threeHandler && window.threeHandler.models) {
                for (const id in window.threeHandler.models) {
                    const m = window.threeHandler.models[id];
                    if (m && m.visible) {
                        currentModelStates[id] = {
                            animId: window.threeHandler.currentAnimId || null,
                            // VRM特有の表情データは直接取れないため、表示時の指定（config）から推測するか、
                            // 最新のノード設定（characters3d）をロード時に再適用させる方式をとります
                            // ここでは「表示されていたかどうか」と「位置」を記録します
                            pos: m.position.clone(),
                            rot: m.rotation.clone(),
                            scale: m.scale.clone()
                        };
                    }
                }
            }

            return {
                gameState, 
                playerState, 
                hudElements, 
                currentNodeId: currentPlayingNodeId,
                backLog,
                isMapMode,
                activeEmitters, 
                timestamp: Date.now(),
                // ★最適化: Inputノードの失敗回数など、現在のノードの内部状態を保存する
                nodeContext: {
                    failCount: (findNode(currentPlayingNodeId) && findNode(currentPlayingNodeId)._failCount) || 0
                },
                modelStates: currentModelStates, // ★追加
                mapContext: isMapMode ? {
                    mapId: mapEngine.currentMapId,
                    playerX: mapEngine.player.x,
                    playerY: mapEngine.player.y,
                    playerZ: mapEngine.player.z || 0,
                    dir: mapEngine.player.dir,
                    pitch: mapEngine.player.pitch,
                    // ★最適化: ジャンプ中などの「勢い(慣性)」も保存し、ロード時の不自然な落下を防ぐ
                    vx: mapEngine.player.vx || 0,
                    vy: mapEngine.player.vy || 0,
                    vz: mapEngine.player.vz || 0,
                    onGround: mapEngine.player.onGround || false,
                    camH: tpsCameraAngle.horizontal,
                    camV: tpsCameraAngle.vertical,
                    zoom: mapEngine.currentZoom || 1.0,
                    scrollY: mapEngine.bgScrollY || 0,
                activeObjects: mapEngine.activeObjects.filter(o => o.id && !o.isHitbox).map(o => ({
                        id: o.id,
                        x: o.x, y: o.y, z: o.z,
                        currentX: o.currentX, currentY: o.currentY,
                        _runtimeHp: o._runtimeHp,
                        _isDead: o._isDead,
                        _isPickedUp: o._isPickedUp,
                        _triggeredEvents: o._triggeredEvents,
                        // 可変ステータス
                        hp: o.hp, atk: o.atk, def: o.def, spd: o.spd, 
                        penetration: o.penetration, critRate: o.critRate, critMult: o.critMult
                    }))
                } : null
            };
        }

        // --- ★最適化・厳格化: IndexedDB ヘルパー関数 ---
        const DB_NAME = 'NovelGameDB';
        const STORE_NAME = 'saves';
        const DB_VERSION = 1;

        function openDB() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(DB_NAME, DB_VERSION);
                request.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains(STORE_NAME)) {
                        db.createObjectStore(STORE_NAME);
                    }
                };
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        }

        async function saveToDB(key, data) {
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                // IndexedDBはJSON変換(文字列化)不要でオブジェクトそのまま保存可能
                const request = store.put(data, key);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        }

        async function loadFromDB(key) {
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const request = store.get(key);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        }
        
        async function deleteFromDB(key) {
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                const request = store.delete(key);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        }

        // --- ブラウザに保存 (IndexedDB版) ---
        window.saveGameLocal = async () => { 
            try { 
                const d = createSaveData();
                await saveToDB('save01', d);
                alert('ブラウザに保存しました。\\n(大容量の画像や3Dモデルも安全に記録されます)');
            } catch(e) { 
                console.error("Save Error:", e); 
                alert('【エラー】保存に失敗しました。ブラウザの設定でデータベースへのアクセスが制限されている可能性があります。\\n\\n詳細: ' + e.message); 
            } 
        };

        // --- ファイルに保存 (JSON Download) ---
        window.saveGameFile = () => {
            try {
                const now = new Date();
                const timeStr = now.getFullYear() +
                    ('0' + (now.getMonth() + 1)).slice(-2) +
                    ('0' + now.getDate()).slice(-2) + '_' +
                    ('0' + now.getHours()).slice(-2) +
                    ('0' + now.getMinutes()).slice(-2);
                
                const defaultName = 'save_' + timeStr;

                // ★追加: プレイヤーにファイル名を入力させる
                let fileName = prompt("セーブデータのファイル名を入力してください\\n(※拡張子 .json は自動で付きます)", defaultName);
                if (fileName === null) return; // キャンセル
                if (fileName.trim() === "") fileName = defaultName;
                fileName = fileName.replace(/\\.json$/i, '') + '.json';

                const d = createSaveData();
                const json = JSON.stringify(d, null, 2);
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                
                const a = document.createElement('a');
                a.href = url;
                // ★変更: 入力された名前を使う
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
            } catch(e) {
                console.error(e);
                alert('ファイル保存に失敗しました。');
            }
        };


// --- 共通: セーブデータ適用関数 ---
        function applySaveData(d) {
            if (d.activeEmitters) {
                activeEmitters = d.activeEmitters;
            } else {
                activeEmitters = [];
            }
            particles = []; 
            
            gameState = { ...gameData.variables, ...d.gameState };
            backLog = d.backLog || [];

            // ★修正: 死亡フラグを確実にリセットし、ロード直後の即死を防ぐ
            if (playerState) playerState._isDeadTriggered = false;

            // 1. 現在のプロジェクトのデフォルト値を取得
            const defaultPlayerState = JSON.parse(JSON.stringify(gameData.player));
            
            // 2. デフォルト値をベースに、セーブデータの値を上書き
            // これにより、セーブデータにない新しいキー(ステータス)はデフォルト値で補完される
            playerState = { ...defaultPlayerState, ...(d.playerState || {}) };
            
            // 3. 互換性維持: 旧データ(equipmentが文字列)の場合、配列に変換
            if (typeof playerState.equipment === 'string') {
                playerState.equipment = [playerState.equipment];
            }

            // 4. 数値データの破損（NaNや未定義）を検知して自動修復する安全装置
            const safeNum = (val, def) => (val !== undefined && val !== null && !isNaN(Number(val))) ? Number(val) : def;

            playerState.$hp = safeNum(playerState.$hp, gameData.player.maxHp || 10);
            playerState.$maxHp = safeNum(playerState.$maxHp, gameData.player.maxHp || 10);
            playerState.$stamina = safeNum(playerState.$stamina, gameData.player.maxStamina || 100);
            playerState.$maxStamina = safeNum(playerState.$maxStamina, gameData.player.maxStamina || 100);
            playerState.$level = safeNum(playerState.$level, gameData.player.initialLevel || 1);
            playerState.$exp = safeNum(playerState.$exp, 0);
            playerState.$atk = safeNum(playerState.$atk, gameData.player.atk || 1);
            playerState.$def = safeNum(playerState.$def, gameData.player.def || 0);
            playerState.$spd = safeNum(playerState.$spd, gameData.player.spd || 4);

            // 5. 必須オブジェクトの初期化（空データによるエラー進行防止）
            if (!playerState.inventory) playerState.inventory = {};
            if (!playerState.activeBuffs) playerState.activeBuffs = [];
            if (!playerState.itemCooldowns) playerState.itemCooldowns = {};
            if (!playerState.shortcuts) playerState.shortcuts = {};

            // ★最適化: セーブデータ肥大化防止。現在のマップ以外の「破壊済みオブジェクト」情報を削除し、
            // 別マップに行けば復活するようにする（完全な永続化が必要な重要イベントは通常変数を使うべき）
            if (gameState._sys_destroyed && d.mapContext) {
                const currentMapId = d.mapContext.mapId;
                for (const key in gameState._sys_destroyed) {
                    // key は "mapId_objId" の形式になっている
                    if (!key.startsWith(currentMapId + '_')) {
                        delete gameState._sys_destroyed[key];
                    }
                }
            }

            // HUD復元
            if (d.hudElements) {
                hudElements = d.hudElements;
                const hudContainer = document.getElementById('hud-elements-container');
                if (hudContainer) hudContainer.innerHTML = '';
                
                const crosshair = document.getElementById('hud-crosshair');
                const radar = document.getElementById('hud-radar');
                if (crosshair) crosshair.style.display = 'none';
                if (radar) radar.style.display = 'none';
                
                for (const id in hudElements) {
                    const elem = hudElements[id];
                    if (id === 'crosshair' && crosshair) {
                        crosshair.style.display = 'block';
                    } else if (id === 'radar' && radar) {
                        radar.style.display = 'block';
                    } else if (elem.type === 'text' && hudContainer) {
                        const div = document.createElement('div'); 
                        div.id = 'hud-el-' + id; 
                        div.className = 'hud-element';
                        hudContainer.appendChild(div);
                    } else if (elem.type === 'gauge' && hudContainer) {
                        const div = document.createElement('div'); 
                        div.id = 'hud-el-' + id; 
                        div.className = 'hud-element';
                        div.innerHTML = '<div class="hud-bar-text" style="font-size:0.8em; margin-bottom:2px;"></div><div class="hud-bar-bg"><div class="hud-bar-fill"></div></div>';
                        hudContainer.appendChild(div);
                    }
                }
            }

            stopAutoSkip();
            if (typeof updateActionButtonVisuals === 'function') updateActionButtonVisuals();

            if (d.isMapMode && d.mapContext) {
                startMapMode({ mapId: d.mapContext.mapId });
                mapEngine.player.x = d.mapContext.playerX;
                mapEngine.player.y = d.mapContext.playerY;
                mapEngine.player.z = d.mapContext.playerZ || 0;
                mapEngine.player.dir = d.mapContext.dir || 0;
                
                // ★最適化: 慣性の復元
                mapEngine.player.vx = d.mapContext.vx || 0;
                mapEngine.player.vy = d.mapContext.vy || 0;
                mapEngine.player.vz = d.mapContext.vz || 0;
                mapEngine.player.onGround = d.mapContext.onGround || false;

                if (d.mapContext.pitch !== undefined) mapEngine.player.pitch = d.mapContext.pitch;
                if (d.mapContext.camH !== undefined) tpsCameraAngle.horizontal = d.mapContext.camH;
                if (d.mapContext.camV !== undefined) tpsCameraAngle.vertical = d.mapContext.camV;
                if (d.mapContext.zoom !== undefined) mapEngine.currentZoom = d.mapContext.zoom;
                if (d.mapContext.scrollY !== undefined) mapEngine.bgScrollY = d.mapContext.scrollY;

                // ★追加: マップオブジェクトのステータス復元
                if (d.mapContext.activeObjects && mapEngine.activeObjects) {
                    d.mapContext.activeObjects.forEach(savedObj => {
                        const target = mapEngine.activeObjects.find(o => o.id === savedObj.id);
                        if (target) {
                            Object.assign(target, savedObj); // 座標やHP、変更されたATKなどを上書き
                        }
                    });
                    // 死んでいるものは配列から消す
                    mapEngine.activeObjects = mapEngine.activeObjects.filter(o => !o._isDead && !o._isPickedUp);
}
                    } else {
                 if (isMapMode) endMapMode();
                
                let targetId = d.currentNodeId;
                
                 if (!findNode(targetId)) {
                   alert("保存された場所が見つかりませんでした。\\n(シナリオが変更された可能性があります)\\n\\nスタート地点から再開します。");
                    targetId = gameData.scenario.startNodeId;
                }
                
                // ★最適化: ロードしたノードが「Input(テキスト入力)」だった場合、フォームを再表示する
                const targetNode = findNode(targetId);
                if (targetNode) {
                    // 失敗回数の復元
                    if (d.nodeContext && d.nodeContext.failCount !== undefined) {
                        targetNode._failCount = d.nodeContext.failCount;
                    }
                    
                    if (targetNode.type === 'input') {
                        currentPlayingNodeId = targetId;
                        processInputNode(targetNode);
                        
                        // ★最適化: 3Dモデルの状態復元（Input中やWait中などでセーブされた場合）
                        if (targetNode.characters3d && window.threeHandler) { 
                            targetNode.characters3d.forEach(c => { 
                                if(c.modelId) {
                                    window.threeHandler.showModel(c.modelId, { 
                                        posX:c.posX, posY:c.posY, posZ:c.posZ, 
                                        rotX:c.rotX, rotY:c.rotY, rotZ:c.rotZ, 
                                        scale:c.scale, 
                                        animationId:c.animationId, 
                                        expression: c.expression, 
                                        loop: (c.loop !== undefined) ? c.loop : true 
                                    });
                                }
                            }); 
                        }
                    } else {
                        processNode(targetId);
                    }
                } else {
                    alert("保存された場所が見つかりません。スタート地点から再開します。");
                    processNode(gameData.scenario.startNodeId);
                }
            }
            
            // ★最適化: ロード直後に一度だけタイマーとHUDを強制更新し、
            // ゲージの見た目や自動進行の状態を画面に完全に同期させる
            if (typeof updateTimers === 'function') updateTimers(0);
            if (typeof updateHUD === 'function') updateHUD();
            
            alert('ロードしました！');
        }
window.loadGameLocal = async (keyName = 'save01') => {
            try {
                // DBからデータを取得
                const data = await loadFromDB(keyName);
                if (!data) return alert('指定されたセーブデータがありません。');
                
                // ★厳格化: データ構造の破損チェック
                if (!data.gameState || !data.playerState) {
                    throw new Error("セーブデータが破損しています (必須プロパティ欠損)。");
                }
                
                applySaveData(data);
                window.closeSLModal(); // ロード成功したらモーダルを閉じる
            } catch (e) {
                console.error("Load Error:", e);
                alert('ロード中にエラーが発生しました。\\nデータが壊れているか、古い形式の可能性があります。\\n\\n詳細: ' + e.message);
            }
        };
 window.handleFileLoad = (input) => {
            const file = input.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const json = JSON.parse(e.target.result);
                    
                    // ★厳格化: 構造チェック
                    if (!json.gameState || !json.playerState) {
                        throw new Error("不正なセーブデータフォーマットです。");
                    }
                    
                    // ★追加: 古いセーブデータとの互換性・補完ロジック
                    if (!json.mapContext) json.mapContext = null;
                    if (!json.modelStates) json.modelStates = {};
                    if (!json.backLog) json.backLog = [];
                    if (!json.activeEmitters) json.activeEmitters = [];
                    
                    applySaveData(json);
                    window.closeSLModal();
                } catch(err) {
                    alert("不正なセーブデータファイルです。読み込みを中断しました。\\n\\n詳細: " + err.message);
                    console.error("File Load Error:", err);
                }
                // 同じファイルを再度選べるようにリセット
                input.value = '';
            };
            reader.readAsText(file);
        };
        // --- リセット (IndexedDB版) ---
        window.deleteSave = async () => { 
            const msg = "【警告】\\n" +
                        "ブラウザに保存されたセーブデータと設定を全て削除しますか？\\n\\n" +
                        "※ダウンロード済みのセーブファイル(JSON)は消えません。\\n" +
                        "※この操作は取り消せません。";

            if(confirm(msg)){ 
                try {
                    // DB内のデータをすべて消去（これで音量設定もリセットされる）
                    await deleteFromDB('save01'); 
                    await deleteFromDB('cfg_vol_bgm');
                    await deleteFromDB('cfg_vol_se');
                    
                    alert('ブラウザのデータを初期化しました。\\タイトルに戻ります。'); 
                    location.reload();
                } catch (e) {
                    console.error("Delete Error:", e);
                    alert("データの削除に失敗しました。");
                }
            } 
        };
        window.returnToTitle = () => {
            if (!confirm("タイトル画面に戻りますか？\\n(セーブしていない進行状況は失われます)")) return;
            
            // 1. 全ての自動進行・スキップを停止
            stopAutoSkip();
            isProcessingNode = false;
            isWaitingForInput = false;

            // 2. タイプライター演出（文字送り）のタイマーを強制停止
            if (window._typewriterTimer) {
                clearInterval(window._typewriterTimer);
                window._typewriterTimer = null;
            }

            // 3. マップモードの終了と3Dエンジンの停止
            if (isMapMode) {
                endMapMode();
            }
            if (window.threeHandler && window.threeHandler.clearAll) {
                window.threeHandler.clearAll();
            }

            // 4. 音声を完全に止める
            AudioManager.stopBgm();
            // SEのプールも全て止める (オーディオマネージャーの拡張が必要ですが、一旦BGMだけでも)

            // 5. HUD（UI）のクリーンアップ
            document.getElementById('hud-elements-container').innerHTML = '';
            document.getElementById('hud-crosshair').style.display = 'none';
            document.getElementById('hud-radar').style.display = 'none';
            
            // 6. 最終奥義：ページをリロードしてメモリと変数を真っさらにする
            // これが「初期化漏れ」を物理的にゼロにする最強の方法です。
            location.reload();
        };

window.toggleInventory = () => {
    const win = document.getElementById('inventory-window');
    
    // ★追加: もしショップが開いていたらインベントリは開けない（排他制御）
    const shopWin = document.getElementById('shop-overlay');
    if (shopWin && shopWin.style.display === 'flex') {
        if (typeof showDamagePopup === 'function') showDamagePopup(mapEngine.player, "今は開けません", 'system');
        return;
    }

    if (win.style.display === 'flex') {
        // 閉じる処理
        win.style.display = 'none';
        
        const battleEl = document.getElementById('battle-overlay');
        if (battleEl && battleEl.style.display === 'flex') {
             if (typeof battleState !== 'undefined' && battleState && !battleState.isActing) {
                 const btns = document.querySelectorAll('.battle-cmd-btn');
                 btns.forEach(b => { b.style.pointerEvents = 'auto'; b.style.opacity = '1.0'; });
             }
        }
    } else { 
        // 開く処理
        renderInventoryList();
        win.style.display = 'flex';
        // ★修正: 最前面に来るように Z-Index を強制
        win.style.zIndex = "4000";
        
        // システムメニューがもし開いていたら閉じる
        const sysMenu = document.getElementById('system-menu');
        if (sysMenu && !sysMenu.classList.contains('collapsed')) {
            toggleSystemMenu();
        }

        // 詳細欄リセット
        document.getElementById('inv-detail-name').textContent = 'アイテムを選択';
        document.getElementById('inv-detail-desc').textContent = '';
        document.getElementById('inv-detail-icon').textContent = '📦';
        document.getElementById('inv-use-btn').style.display = 'none';
        
        const placeBtn = document.getElementById('inv-place-btn');
        const discardBtn = document.getElementById('inv-discard-btn');
        if (placeBtn) placeBtn.style.display = 'none';
        if (discardBtn) discardBtn.style.display = 'none';
        
        const existingSetBtns = document.querySelectorAll('.inv-set-btn');
        existingSetBtns.forEach(function(b) { b.remove(); });
    }
};
             // --- Debug Functions ---
        window.toggleDebug = () => {
            const win = document.getElementById('debug-window');
            if (win.style.display === 'flex') {
                win.style.display = 'none';
            } else {
                win.style.display = 'flex';
                renderDebug(); // 開くたびに最新情報を表示
            }
        };

        window.downloadTraceLog = () => {
            if (!nodeHistory || nodeHistory.length === 0) {
                alert("履歴がありません。");
                return;
            }

            const defaultName = 'trace_log_' + Date.now();
            // ★追加: ファイル名入力プロンプト
            let fileName = prompt("ログファイルの名前を入力してください\\n(※拡張子 .txt は自動で付きます)", defaultName);
            if (fileName === null) return;
            if (fileName.trim() === "") fileName = defaultName;
            fileName = fileName.replace(/\\.txt$/i, '') + '.txt';

            // ログのテキストを作成
            const now = new Date().toLocaleString();
            let content = "=== Novel Game Node Trace Log ===\\n";
            content += "Exported: " + now + "\\n\\n";
            
            nodeHistory.forEach((id, index) => {
                content += (index + 1) + ": " + id + "\\n";
            });

            // ファイル生成とダウンロード発火
            const blob = new Blob([content], { type: 'text/plain' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            // ★変更: 入力された名前を使う
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href); // メモリ解放
        };
window.renderDebug = function() {
            var win = document.getElementById('debug-window');
            if (!win || win.style.display !== 'flex') return;

            // 入力中チェック
            var activeEl = document.activeElement;
            if (activeEl && activeEl.tagName === 'INPUT' && activeEl.closest('#debug-window')) {
                return;
            }

            // 1. 変数リスト (Variables)
            var varList = document.getElementById('debug-vars-list');
            if (varList) {
                var keys = Object.keys(gameState).sort();
                if (varList.children.length !== keys.length) {
                    varList.innerHTML = '';
                    keys.forEach(function(key) {
                        var row = document.createElement('div');
                        row.className = 'debug-row';
                        row.innerHTML = '<label>' + key + '</label><input type="text" id="dbg-var-' + key + '">';
                        var inp = row.querySelector('input');
                        inp.onchange = function(e) { updateDebugVar('game', key, e.target.value); };
                        varList.appendChild(row);
                    });
                }
                keys.forEach(function(key) {
                    var inp = document.getElementById('dbg-var-' + key);
                    if (inp) {
                        var val = gameState[key];
                        if (typeof val === 'number') val = parseFloat(val.toFixed(3));
                        inp.value = String(val);
                    }
                });
            }

            // 2. プレイヤーステータス
            var playerList = document.getElementById('debug-player-list');
            if (playerList) {
                var pKeys = Object.keys(playerState).filter(function(k) { 
                    return typeof playerState[k] !== 'object' || playerState[k] === null; 
                }).sort();

                if (playerList.children.length !== pKeys.length) {
                    playerList.innerHTML = '';
                    pKeys.forEach(function(key) {
                        var row = document.createElement('div');
                        row.className = 'debug-row';
                        row.innerHTML = '<label>' + key + '</label><input type="text" id="dbg-ply-' + key + '">';
                        var inp = row.querySelector('input');
                        inp.onchange = function(e) { updateDebugVar('player', key, e.target.value); };
                        playerList.appendChild(row);
                    });
                }
                pKeys.forEach(function(key) {
                    var inp = document.getElementById('dbg-ply-' + key);
                    if (inp) {
                        var val = playerState[key];
                        if (typeof val === 'number') val = parseFloat(val.toFixed(3));
                        inp.value = String(val);
                    }
                });
            }

            // 3. ノード履歴
            var traceList = document.getElementById('debug-trace-list');
            if (traceList && typeof nodeHistory !== 'undefined') {
                if (traceList.dataset.lastCount !== String(nodeHistory.length)) {
                    traceList.innerHTML = '';
                    var now = new Date();
                    var timeStr = now.getHours().toString().padStart(2, '0') + ':' + 
                                  now.getMinutes().toString().padStart(2, '0') + ':' + 
                                  now.getSeconds().toString().padStart(2, '0');

                    [...nodeHistory].reverse().forEach(function(nid, index) {
                        var div = document.createElement('div');
                        div.style.borderBottom = '1px solid #333';
                        if (index === 0) {
                            div.style.color = '#ffff00';
                            div.style.fontWeight = 'bold';
                            div.textContent = '▶ [' + timeStr + '] ' + nid + ' (Current)';
                        } else {
                            div.textContent = '  [' + timeStr + '] ' + nid;
                        }
                        traceList.appendChild(div);
                    });
                    traceList.dataset.lastCount = String(nodeHistory.length);
                }
            }
        };
        // 値書き換え用関数
        window.updateDebugVar = (type, key, value) => {
            // 数値なら数値型に変換して保存
            const numVal = Number(value);
            const finalVal = isNaN(numVal) ? value : numVal;
            
            if (type === 'game') {
                gameState[key] = finalVal;
            } else {
                playerState[key] = finalVal;
            }
            
            // 即座にHUDなどを更新
            if (typeof updateHUD === 'function') updateHUD();
        };

        function renderInventoryList() {
            const container = document.getElementById('inventory-list');
            container.innerHTML = '';
            
            if (!playerState.inventory) playerState.inventory = {};
            if (!playerState.equipment) playerState.equipment = null;

            let hasItem = false;
const inventoryIds = Object.keys(playerState.inventory).sort((a, b) => {
    const itemA = gameData.items[a];
    const itemB = gameData.items[b];
    if (!itemA || !itemB) return 0;
    
    // 優先順位: 装備(equip) > 消費(consumable) > 弾(ammo) > 重要(key)
    const typeOrder = { 'equip': 1, 'consumable': 2, 'ammo': 3, 'key': 4 };
    return (typeOrder[itemA.type] || 9) - (typeOrder[itemB.type] || 9);
});

// for (const itemId in playerState.inventory) ループを以下に変更
for (const itemId of inventoryIds) {
                const count = playerState.inventory[itemId];
                if (count <= 0) continue;
                
                const itemData = gameData.items[itemId];
                if (!itemData) continue;
                
                hasItem = true;
                const div = document.createElement('div');
                div.style.cssText = 'padding:10px; border-bottom:1px solid #777; cursor:pointer; display:flex; align-items:center;';
                div.onclick = function() { selectInventoryItem(itemId); };
                
                // --- アイコン表示ロジック ---
                let iconHtml = '';
                if (itemData.iconImage && gameData.assets.characters && gameData.assets.characters[itemData.iconImage]) {
                    const src = gameData.assets.characters[itemData.iconImage].data;
                    iconHtml = '<img src="' + src + '" style="width:40px; height:40px; object-fit:contain; vertical-align:middle;">';
                } else {
                    iconHtml = '<span style="font-size:24px;">' + (itemData.iconEmoji || '📦') + '</span>';
                }
                // -------------------------

let isEquipped = false;
                if (Array.isArray(playerState.equipment)) {
                    isEquipped = playerState.equipment.includes(itemId);
                } else {
                    isEquipped = (playerState.equipment === itemId);
                }
                const equipMark = isEquipped ? '<span style="color:#4caf50; font-weight:bold; margin-right:5px;">[E]</span>' : '';
                const bgStyle = isEquipped ? 'background:rgba(76, 175, 80, 0.2);' : '';
                
                div.style.cssText += bgStyle;

                div.innerHTML =
                    '<div style="margin-right:10px;">' + iconHtml + '</div>' +
                    '<div style="flex:1;">' +
                        '<div style="font-weight:bold;">' + equipMark + itemData.name + '</div>' +
                        '<div style="font-size:0.8em; color:#aaa;">所持数: ' + count + '</div>' +
                    '</div>';

                container.appendChild(div);
            }
            
            if (!hasItem) {
                container.innerHTML = '<div style="padding:20px; color:#aaa; text-align:center;">アイテムを持っていません</div>';
            }
        }

function selectInventoryItem(itemId) {
            const item = gameData.items[itemId];
            if (!item) return;
            
            document.getElementById('inv-detail-name').textContent = item.name;
            document.getElementById('inv-detail-desc').textContent = item.description || '';
            
            // アイコン更新
            const iconContainer = document.getElementById('inv-detail-icon');
            iconContainer.innerHTML = '';
            if (item.iconImage && gameData.assets.characters && gameData.assets.characters[item.iconImage]) {
                const img = document.createElement('img');
                img.src = gameData.assets.characters[item.iconImage].data;
                img.style.cssText = 'width:80px; height:80px; object-fit:contain;';
                iconContainer.appendChild(img);
            } else {
                iconContainer.textContent = item.iconEmoji || '📦';
                iconContainer.style.fontSize = '60px'; 
            }
// --- ボタン制御 ---
            const useBtn = document.getElementById('inv-use-btn');
            const placeBtn = document.getElementById('inv-place-btn');
            const discardBtn = document.getElementById('inv-discard-btn');
            
            let isEquipped = false;
            if (Array.isArray(playerState.equipment)) {
                isEquipped = playerState.equipment.includes(itemId);
            } else {
                isEquipped = (playerState.equipment === itemId);
            }

            const isBattle = (document.getElementById('battle-overlay').style.display === 'flex');

            // 1. 初期化
            useBtn.style.display = 'none';
            useBtn.disabled = false;
            useBtn.style.opacity = '1.0';
            if (placeBtn) placeBtn.style.display = 'none';
            if (discardBtn) discardBtn.style.display = 'none';

            // 2. 「使う/装備」
            if (item.type === 'equip') {
                useBtn.style.display = 'inline-block';
                if (isBattle) {
                    useBtn.textContent = '戦闘中変更不可';
                    useBtn.disabled = true;
                    useBtn.style.opacity = '0.6';
                    useBtn.onclick = null;
                } else {
                    useBtn.textContent = isEquipped ? '外す' : '装備';
                    useBtn.onclick = function() { toggleEquip(itemId); };
                }
            } else if (item.type === 'consumable' || item.type === 'ammo') {
                useBtn.style.display = 'inline-block';
                useBtn.textContent = '使う';
                // ★修正: 消費アイテムは装備できないのでそのまま「使う」
                useBtn.onclick = function() { useItem(itemId); };
            }

            // 3. 「置く」 (マップモードのみ)
            if (isMapMode && placeBtn) {
                placeBtn.style.display = 'inline-block';
                placeBtn.onclick = function() { placeItem(itemId); };
            }

            // 4. 「捨てる」 (重要アイテム以外、かつ装備中以外)
            if (discardBtn && item.type !== 'key') {
                if (isEquipped) {
                    discardBtn.style.display = 'inline-block';
                    discardBtn.disabled = true;
                    discardBtn.style.opacity = '0.4';
                    discardBtn.title = '装備を外してから捨ててください';
                    discardBtn.onclick = null;
                } else {
                    discardBtn.style.display = 'inline-block';
                    discardBtn.disabled = false;
                    discardBtn.style.opacity = '1.0';
                    discardBtn.title = '';
                    discardBtn.onclick = function() { discardItem(itemId); };
                }
            }

            // 4. ショートカット登録ボタンの生成 (動的生成)
            // 既存の登録ボタンがあれば削除
            const existingSetBtns = document.querySelectorAll('.inv-set-btn');
            existingSetBtns.forEach(function(b) { b.remove(); });

            const s = gameData.settings || {};
            const btns = s.actionButtons || [];
            
            btns.forEach(function(btnConf) {
                // システム設定で「任意アイテム(assignable_item)」に設定されているボタンのみ対象
                if (btnConf.type === 'assignable_item' && btnConf.targetVar) {
                    const setBtn = document.createElement('button');
                    setBtn.className = 'sys-btn inv-set-btn';
                    setBtn.style.cssText = 'font-size:1.0em; padding:8px 20px; margin-top:10px; display:block; width:80%;';
                    
                    const currentSet = (playerState.shortcuts || {})[btnConf.targetVar];
                    const isSet = (currentSet === itemId);
                    
                    if (isSet) {
                        setBtn.textContent = '★ ' + btnConf.label + ' にセット中';
                        setBtn.style.color = '#ffff00';
                        setBtn.style.borderColor = '#ffff00';
                    } else {
                        setBtn.textContent = btnConf.label + ' にセット';
                        setBtn.style.color = '';
                        setBtn.style.borderColor = '';
                    }

                    setBtn.onclick = function() {
                        if (typeof assignItemToSlot === 'function') {
                            assignItemToSlot(btnConf.targetVar, itemId, btnConf.key);
                            // 状態が変わったのでUIを更新
                            selectInventoryItem(itemId);
                        }
                    };
                    
                    // 詳細エリアの末尾に追加
                    document.getElementById('inventory-detail').appendChild(setBtn);
                }
            });
        }
 function toggleEquip(itemId) {
    const item = gameData.items[itemId];
    if (!item) return;

    if (item.type !== 'equip') {
        if (typeof showDamagePopup === 'function') showDamagePopup(mapEngine.player, "装備不可", 'system');
        return;
    }

    // プレイヤーデータの初期化 (配列化)
    if (!Array.isArray(playerState.equipment)) {
        // 旧データ(文字列)の場合は配列に変換
        playerState.equipment = playerState.equipment ? [playerState.equipment] : [];
    }

    // 装備スロット上限 (デフォルト1)
    const maxSlots = playerState.maxEquipSlots || 1;

    // 既に装備しているかチェック
    const index = playerState.equipment.indexOf(itemId);

    if (index !== -1) {
        // --- 外す処理 (Unequip) ---
        playerState.equipment.splice(index, 1);
        showDamagePopup(mapEngine.player, "装備解除", 'system');
    } else {
        // --- 装備する処理 (Equip) ---
        
        // 上限チェック
        if (playerState.equipment.length >= maxSlots) {
            // スロットが一杯の場合、一番古いものを外して新しいのを付ける (ところてん式)
            playerState.equipment.shift(); 
        }

        playerState.equipment.push(itemId);
        showDamagePopup(mapEngine.player, "装備!", 'system');

        if (item.effects && item.effects.sound) {
            AudioManager.playSe(item.effects.sound, masterVolSe);
        }
    }

    // ステータス再計算
    recalculatePlayerStats();

    // UI更新
    renderInventoryList();
    selectInventoryItem(itemId);
}
function placeItem(itemId) {
            // マップモード以外では配置不可
            if (!isMapMode) return;
            
            const item = gameData.items[itemId];
            if (!item) return;

            // 1. 所持数を減らす
            if (!playerState.inventory) playerState.inventory = {};
            
            if (playerState.inventory[itemId] > 0) {
                playerState.inventory[itemId]--;
                
                if (playerState.inventory[itemId] <= 0) {
                    delete playerState.inventory[itemId];
                    // アイテムが尽きたらインベントリを閉じるなどの処理
                    // (ここでは簡易的に toggleInventory を呼んで閉じるか更新する)
                    const win = document.getElementById('inventory-window');
                    if (win && win.style.display !== 'none') {
                        // アイテム詳細を表示中になくなった場合の挙動（閉じる）
                        toggleInventory();
                    }
                } else {
                    // まだ残っているならリストと詳細を更新
                    if (typeof renderInventoryList === 'function') renderInventoryList();
                    if (typeof selectInventoryItem === 'function') selectInventoryItem(itemId);
                }
            } else { 
                return; // 所持していない場合は終了
            }

            // 2. 座標計算 (プレイヤーの目の前)
            const p = mapEngine.player;
            const grid = mapEngine.GRID;
            const distance = grid * 1.5; // 1.5マス先
            
            const dir = (p.dir !== undefined) ? p.dir : 0;
            const spawnX = (p.x + p.w/2) + Math.cos(dir) * distance - (grid/2);
            const spawnY = (p.y + p.h/2) + Math.sin(dir) * distance - (grid/2);
            
            // 3. 設定読み込み
            // アイテムデータに placement 設定がなければデフォルト値 { hp: 1, isWall: true } を使う
             const placeConf = item.placement || { hp: 0, isWall: false };
            
            // 確実に数値化 (NaN対策)
             const placeHp = (placeConf.hp !== undefined && placeConf.hp !== null) ? Number(placeConf.hp) : 0;
            
            // HPが1以上ならブロック(障害物)扱い、0ならただのアイテム扱い
            const isBlock = (placeHp > 0);

if (isBlock) {
                // 1. プレイヤーとの重なりチェック
                const targetGx = Math.floor(spawnX / grid);
                const targetGy = Math.floor(spawnY / grid);
                
                const pGx = Math.floor((p.x + p.w/2) / grid);
                const pGy = Math.floor((p.y + p.h/2) / grid);
                
                if (targetGx === pGx && targetGy === pGy) {
                    if (typeof showDamagePopup === 'function') {
                        showDamagePopup(p, "足元には置けません", 'system');
                    }
                    playerState.inventory[itemId] = (playerState.inventory[itemId] || 0) + 1;
                    return;
                }

                // 2. 他の壁オブジェクトとの重なりチェック
                // ★修正: 配置予定の座標に、すでに壁オブジェクトが存在しないか確認する
                const exists = mapEngine.activeObjects.some(o => {
                    if (!o.isWall || o._isDead) return false;
                    // オブジェクトのグリッド座標
                    const ox = Math.floor((o.currentX !== undefined ? o.currentX : o.x * grid) / grid);
                    const oy = Math.floor((o.currentY !== undefined ? o.currentY : o.y * grid) / grid);
                    // Z軸(高さ)も考慮: 同じ高さの階層に置こうとしているか
                    const isSameHeight = Math.abs((o.z||0) - (p.z||0)) < grid;
                    
                    return (ox === targetGx && oy === targetGy && isSameHeight);
                });
                
                if (exists) {
                    if (typeof showDamagePopup === 'function') {
                        showDamagePopup(p, "そこには置けません", 'system');
                    }
                    playerState.inventory[itemId] = (playerState.inventory[itemId] || 0) + 1;
                    return;
                }
            }

            // 4. オブジェクト生成
            const droppedObj = {
                id: 'placed_' + Date.now() + '_' + Math.random(),
                
                // グリッド座標 (マップ管理用)
                x: Math.floor(spawnX / grid), 
                y: Math.floor(spawnY / grid),
                
                // 実座標 (スムーズな描画用)
                currentX: spawnX,
                currentY: spawnY,
                
                // 高さ (プレイヤーと同じ高さ)
                z: p.z || 0,
                
                // サイズ (1マス)
                w: grid, 
                h: grid,
                
                // 役割設定: ブロックなら障害物、そうでなければアイテム
                roleType: isBlock ? 'obstacle' : 'item',
                
                // ★ 壁判定の適用
                // 設定値があればそれを使い、なければ isBlock (ブロックかどうか) に従う
                isWall: (placeConf.isWall !== undefined) ? placeConf.isWall : isBlock,
                
                // 耐久度 (updateMapGame で参照される t._runtimeHp の初期値になる)
                hp: placeHp,
                
                // 破壊可能かどうか (HP>0なら破壊可能)
                destructible: isBlock,
                
                // HPバーの表示 (配置物は数字が出るのでバーは非表示)
                showHpBar: false, 
                
                // --- 拾得設定 ---
                // ブロック状態(HP>0)なら itemId を空にして「拾えない」ようにする
                // HP=0 (最初からアイテム状態) なら itemId をセットして「拾える」ようにする
                itemId: isBlock ? '' : itemId,
                
                // --- ドロップ設定 ---
                // 破壊されたら自分自身をドロップする
                // (HP=0のアイテムなら破壊されないのでドロップ設定は不要)
                dropItemId: isBlock ? itemId : '',
                dropRate: 100,
                
                // HP0で配置された場合、またはドロップ時の取得設定
                itemAmount: 1,
                itemPickup: 'touch',

                // --- 見た目設定 ---
                visualType: item.iconImage ? 'image' : 'color',
                charId: item.iconImage || '',
                color: '#ffff00', 
                itemEmoji: item.iconEmoji || "📦",
                
                opacity: 1.0,
                
                // 置いたときに少し跳ねる演出用の垂直速度
                vz: 5
            };

            // サイドビューなら重力の影響を受けるように設定
            if (mapEngine.data && mapEngine.data.type === 'side') {
               droppedObj.moveType = 'projectile'; // 重力計算を適用させるためのタイプ
               droppedObj.vy = -5; // 少し上に跳ねる
            }

            // アクティブオブジェクトリストに追加
            mapEngine.activeObjects.push(droppedObj);
            
            // ポップアップ表示
            if (typeof showDamagePopup === 'function') {
                showDamagePopup(p, "Placed!", 'system');
            }
        }
function discardItem(itemId) {
            const item = gameData.items[itemId];
            if (!item) return;

            // 確認ダイアログ
            if (!confirm('「' + item.name + '」を捨てますか？\\n(この操作は取り消せません)')) {
                return;
            }

            if (!playerState.inventory) playerState.inventory = {};
            
            if (playerState.inventory[itemId] > 0) {
                playerState.inventory[itemId]--;
                
                // システムログ
                if (typeof showDamagePopup === 'function') {
                    showDamagePopup(mapEngine.player, "Discarded", 'system');
                }

                // ★追加: もし装備中なら、捨てる時に強制的に外す（安全策）
                if (Array.isArray(playerState.equipment)) {
                    const eqIdx = playerState.equipment.indexOf(itemId);
                    if (eqIdx !== -1) {
                        playerState.equipment.splice(eqIdx, 1);
                        if (typeof recalculatePlayerStats === 'function') recalculatePlayerStats();
                    }
                }

                if (playerState.inventory[itemId] <= 0) {
                    delete playerState.inventory[itemId];
                    
                    // ★追加: ショートカットに登録されていた場合、アイコンをリセットする
                    if (typeof updateActionButtonVisuals === 'function') updateActionButtonVisuals();
                    
                    // アイテムがなくなったらインベントリを閉じる
                    toggleInventory(); 
                } else {
                    // まだ残っているならリスト更新
                    renderInventoryList();
                    selectInventoryItem(itemId);
                }
            }
        }
        function useItem(itemId) {
            const item = gameData.items[itemId];
            if (!item) return;

            // ★追加: 装備品は「使う」処理を無効化（重複加算を防ぐ）
            if (item.type === 'equip') {
                if (typeof showDamagePopup === 'function') showDamagePopup(mapEngine.player, "Cannot use Equip", 'system');
                return;
            }

            const isBattle = (battleState && !battleState.isOver && document.getElementById('battle-overlay').style.display === 'flex');

            const calc = (v) => {
                if (!v) return 0;
                const res = resolveValue(v);
                return isNaN(res) ? 0 : Number(res);
            };

            // --- 1. 個別クールタイムチェック ---
            if (isMapMode) {
                if (!playerState.itemCooldowns) playerState.itemCooldowns = {};
                if (playerState.itemCooldowns[itemId] > 0) {
                    const remain = Math.ceil(playerState.itemCooldowns[itemId]);
                    if (typeof showDamagePopup === 'function') showDamagePopup(mapEngine.player, 'Wait ' + remain + 's', 'system');
                    return;
                }
            }

            // --- 2. 疲労チェック ---
            const pData = gameData.player || {};
            if (playerState.isExhausted && pData.exhaustionNoItem) {
                if (typeof showDamagePopup === 'function') showDamagePopup(mapEngine.player, "TIRED!", 'system');
                return;
            }
            
            // --- 3. 効果適用 ---
            const fx = item.effects || {};
            
            // HP回復 (★修正: Number() を通して文字列結合を防ぐ)
            if (fx.hp) {
                const val = calc(fx.hp);
                if (val !== 0) {
                    const maxHpNum = Number(playerState.$maxHp) || 10;
                    const curHpNum = Number(playerState.$hp) || 0;
                    playerState.$hp = Math.min(maxHpNum, curHpNum + val);
                    
                    if (isBattle) battleLog(item.name + " を使った！ HPが " + val + " 回復！");
                    else if (val > 0 && typeof showDamagePopup === 'function') showDamagePopup(mapEngine.player, "+" + val, 'heal');
                }
            }
            
            // スタミナ回復 (★修正: 同上)
            if (fx.stamina) {
                const val = calc(fx.stamina);
                if (val !== 0) {
                    const maxStNum = Number(playerState.$maxStamina) || 100;
                    const curStNum = Number(playerState.$stamina) || 0;
                    playerState.$stamina = Math.min(maxStNum, curStNum + val);
                    
                    if (isBattle) battleLog("スタミナが " + val + " 回復！");
                    else if (val > 0 && typeof showDamagePopup === 'function') showDamagePopup(mapEngine.player, "ST+" + val, 'heal');
                }
            }

            if (fx.hpMax) {
                const val = calc(fx.hpMax);
                if (val !== 0) {
                    if (!playerState.permanentBuffs) playerState.permanentBuffs = {};
                    playerState.permanentBuffs.hpMax = (playerState.permanentBuffs.hpMax || 0) + val;
                    if (typeof recalculatePlayerStats === 'function') recalculatePlayerStats();
                    if (isBattle) battleLog("最大HPが " + val + " 上がった！");
                    else if (typeof showDamagePopup === 'function') showDamagePopup(mapEngine.player, "MaxHP+" + val, 'heal');
                }
            }

            if (fx.staminaMax) {
                const val = calc(fx.staminaMax);
                if (val !== 0) {
                    if (!playerState.permanentBuffs) playerState.permanentBuffs = {};
                    playerState.permanentBuffs.staminaMax = (playerState.permanentBuffs.staminaMax || 0) + val;
                    if (typeof recalculatePlayerStats === 'function') recalculatePlayerStats();
                    if (isBattle) battleLog("最大スタミナが " + val + " 上がった！");
                    else if (typeof showDamagePopup === 'function') showDamagePopup(mapEngine.player, "MaxST+" + val, 'heal');
                }
            }
            
            // 弾薬回復
            if (fx.ammo) {
                const val = calc(fx.ammo);
                if (val !== 0) {
                    playerState.$magazine += val;
                    if (playerState.$magazine > playerState.$maxMagazine) playerState.$magazine = playerState.$maxMagazine;
                    
                    if (item.type === 'ammo') {
                        playerState.currentAmmoId = itemId;
                        if (!isBattle && typeof showDamagePopup === 'function') showDamagePopup(mapEngine.player, "Load: " + item.name, 'item');
                    }

                    if (isBattle) battleLog("弾薬を " + val + " 補充！");
                    else if (val > 0 && typeof showDamagePopup === 'function') showDamagePopup(mapEngine.player, "Ammo+" + val, 'item');
                }
            }

            // ステータスバフ処理
            const duration = fx.duration || 0;
             const applyStatEffect = function(type, rawValue, label) {
                const value = calc(rawValue);
                if (!value) return;

                if (duration > 0) {
                    // 一時バフ
                    if (!playerState.activeBuffs) playerState.activeBuffs = [];
                    const existing = playerState.activeBuffs.find(function(b){ return b.type === type; });
                    
                    if (existing) {
                        // ★修正: 新しい効果の方が強い、または同じなら上書き＆時間延長
                        if (value >= existing.value) {
                            existing.value = value;
                            existing.timer = duration;
                            if (!isBattle && typeof showDamagePopup === 'function') showDamagePopup(mapEngine.player, label + ' Overwrite!', 'heal');
                        } else {
                            // 既存の方が強い場合は、時間のみ延長（リセット）する
                            existing.timer = duration;
                            if (!isBattle && typeof showDamagePopup === 'function') showDamagePopup(mapEngine.player, label + ' Extend!', 'heal');
                        }
                    } else {
                        playerState.activeBuffs.push({ type: type, value: value, timer: duration });
                        if (!isBattle && typeof showDamagePopup === 'function') showDamagePopup(mapEngine.player, label + ' (' + duration + 's)', 'heal');
                    }
                    if (typeof recalculatePlayerStats === 'function') recalculatePlayerStats();
                } else {
                    // 永続バフ
                    if (!playerState.permanentBuffs) playerState.permanentBuffs = {};
                    playerState.permanentBuffs[type] = (playerState.permanentBuffs[type] || 0) + value;
                    if (typeof recalculatePlayerStats === 'function') recalculatePlayerStats();
                    if (!isBattle && typeof showDamagePopup === 'function') showDamagePopup(mapEngine.player, label + ' UP!', 'heal');
                }
            };
            applyStatEffect('atk', fx.atk, 'ATK');
            applyStatEffect('def', fx.def, 'DEF');
applyStatEffect('spd', fx.spd, 'SPD');
applyStatEffect('projSpeed', fx.projSpeed, 'BULLET SPD');

            // 無敵化処理
            if (fx.isInvincible && duration > 0) {
                if (mapEngine && mapEngine.player) {
                    mapEngine.player.invincible = duration * 60;
                    if (!isBattle && typeof showDamagePopup === 'function') showDamagePopup(mapEngine.player, "INVINCIBLE!", 'heal');
                }
            }
            
            // 変数操作
            if (fx.variable) {
                const match = fx.variable.match(/^([^=+\\*\\/ -]+)(\\+=|-=|\\*=|\\/=|=)(.+)$/);
                if (match) {
                    const key = match[1].trim();
                    const op = match[2];
                    const valStr = match[3].trim();
                    const val = Number(resolveValue(valStr)); 

                    if (!isNaN(val)) {
                        let targetObj = gameState;
                        if (key.startsWith('$')) targetObj = playerState;
                        const current = Number(targetObj[key]) || 0;
                        
                        if (op === '=') targetObj[key] = val;
                        else if (op === '+=') targetObj[key] = current + val;
                        else if (op === '-=') targetObj[key] = current - val;
                        else if (op === '*=') targetObj[key] = current * val;
                        else if (op === '/=') targetObj[key] = (val !== 0) ? (current / val) : 0;

                        if (typeof updateHUD === 'function') updateHUD();
                    }
                }
            }

            // 効果音再生
    if (fx.sound) {
        AudioManager.playSe(fx.sound, masterVolSe);
    }

            // 攻撃・爆発生成処理 (マップモードのみ & バトル以外)
            const blastR = calc(fx.blastRadius);
            const itemDmg = calc(fx.atk); 

            if (!isBattle && isMapMode && (blastR > 0 || itemDmg > 0)) {
                const p = mapEngine.player;
                const attackObj = { 
                    id: 'item_atk_' + Date.now(), 
                    isPlayerAttack: true,
                    currentX: p.x, 
                    currentY: p.y, 
                    w: p.w, h: p.h, z: p.z || 0,
                    isHitbox: true, 
                    life: 10,
                    damage: itemDmg,
                    penetration: 1,
                    isCritical: false,
                    blastRadius: blastR,
                    blastDamageRate: fx.blastDamageRate || 100
                };
                mapEngine.activeObjects.push(attackObj);
            }
                            if (isBattle && itemDmg > 0) {
                // 生きている敵をランダムに1体選ぶ
                const aliveEnemies = battleState.enemies.filter(e => !e.isDead);
                if (aliveEnemies.length > 0) {
                    const target = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
                    
                    // ダメージ計算
                    let dmg = itemDmg - (target.def || 0);
                    if (dmg < 1) dmg = 1;
                    
                    target.hp -= dmg;
                    battleLog(item.name + " が炸裂！ " + target.name + " に " + dmg + " のダメージ！");
                    
                    // 簡易撃破判定
                    if (target.hp <= 0) {
                        target.hp = 0;
                        target.isDead = true;
                        battleLog(target.name + " を 倒した！");
                        // 経験値加算
                        if(target.exp) gainExp(target.exp);
                        
                        // 見た目を更新 (死亡状態へ)
                        const tgtIdx = battleState.enemies.indexOf(target);
                        const el = document.getElementById('enemy-cnt-' + tgtIdx);
                        if(el) el.classList.add('dead');
                    }
                    
                    updateBattleStatus();

                                       const allDead = battleState.enemies.every(e => e.isDead);
                    if (allDead) {
                        setTimeout(() => {
                            battleLog("勝利した！");
                            setTimeout(() => endBattle('win'), 1000);
                        }, 500);
                        return; // 勝利したのでここで終わり
                    }
                }
            }

            // --- 4. 消費処理 ---
            if (item.type === 'consumable' || item.type === 'ammo') {
                playerState.inventory[itemId]--;
                if (playerState.inventory[itemId] <= 0) {
                    delete playerState.inventory[itemId];
                    const win = document.getElementById('inventory-window');
                    if (win && win.style.display !== 'none') {
                        renderInventoryList();
                        document.getElementById('inv-detail-name').textContent = 'アイテムを選択';
                        document.getElementById('inv-detail-desc').textContent = '';
                        document.getElementById('inv-use-btn').style.display = 'none';
                    }
                } else {
                    if (typeof renderInventoryList === 'function') renderInventoryList();
                    if (typeof selectInventoryItem === 'function') selectInventoryItem(itemId);
                }
            }
            
            // --- 5. クールタイム設定 ---
            if (isMapMode) {
                const cd = fx.cooldown || 0;
                if (cd > 0) playerState.itemCooldowns[itemId] = cd;
            }

            // --- 6. 演出 ---
            const s = gameData.settings || {};
            if (s.flashOnItemUse !== false) {
                if (ui.effect) {
                    ui.effect.className = 'fx-flash-white';
                    setTimeout(function() { if(ui.effect) ui.effect.className = ''; }, 500);
                }
            }
// UI更新
            if (typeof renderInventoryList === 'function') renderInventoryList();
            if (isBattle) updateBattleStatus();

            // --- 7. バトル進行処理 ---
            if (isBattle) {
                // ★追加: インベントリを閉じる
                toggleInventory();
                
                // ★修正: アイテム使用後は次のターンへ進む
                setTimeout(() => {
                    if (typeof processTurnQueue === 'function') processTurnQueue();
                }, 500);
            }
        }

        function assignItemToSlot(slotId, itemId, btnKey) {
            if (!playerState.shortcuts) playerState.shortcuts = {};
            
            // セット (トグル動作: 既にセットされていれば外す)
            if (playerState.shortcuts[slotId] === itemId) {
                delete playerState.shortcuts[slotId];
                // 'system' 指定になっているのでOK
                showDamagePopup(mapEngine.player, "解除", 'system');
            } else {
                playerState.shortcuts[slotId] = itemId;
                // 'system' 指定になっているのでOK
                showDamagePopup(mapEngine.player, "セット!", 'system');
            }
            
            updateActionButtonVisuals(); // HUDの見た目を更新
        }
function updateActionButtonVisuals() {
            const s = gameData.settings || {};
            const btns = s.actionButtons || [];
            const container = document.getElementById('map-action-btn-container');
            if(!container) return;

            btns.forEach(conf => {
                if (conf.type === 'assignable_item' && conf.targetVar) {
                    const domBtn = container.querySelector('[data-key="' + String(conf.key) + '"]');

                    if (domBtn) {
                        const itemId = (playerState.shortcuts || {})[conf.targetVar];
                        
                        // ★修正: アイテム自体が存在し、かつ1個以上持っているか確認
                        let hasItem = false;
                        let item = null;
                        if (itemId && playerState.inventory && playerState.inventory[itemId] > 0) {
                            item = gameData.items[itemId];
                            hasItem = !!item;
                        }
                        
                        const labelSpan = domBtn.querySelector('span');
                        if (labelSpan) {
                            if (hasItem) {
                                labelSpan.textContent = item.iconEmoji || item.name.slice(0,2);
                                domBtn.style.borderColor = '#ffff00'; // セット中は枠を黄色く
                                domBtn.style.opacity = '1.0';
                            } else {
                                // ★修正: 持っていない(尽きた)場合は元のラベルに戻すか、グレーアウト
                                labelSpan.textContent = conf.label;
                                domBtn.style.borderColor = '#fff';
                                
                                // セットされているのに持っていない（使い切った）場合
                                if (itemId) domBtn.style.opacity = '0.5'; 
                                else domBtn.style.opacity = '1.0';
                            }
                        }
                    }
                }
            });
        }
function replaceVariablesInText(text) { 
            if (!text) return '';
            // {{変数名}} を探して、resolveValue で値に変換する
            return text.replace(/\{\{(.+?)\}\}/g, function(match, key) {
                // 空白除去して値を解決 (見つからない場合は0が返る)
                return resolveValue(key.trim());
            });
        }
function resolveValue(v) {
            // 1. 文字列以外（数値など）ならそのまま返す
            if (typeof v !== 'string') return v;

            // 2. {{変数名}} の置換
            let loopCount = 0;
            while (v.indexOf('{{') !== -1 && loopCount++ < 5) {
                v = v.replace(/\{\{(.+?)\}\}/g, function(match, key) {
                    const val = resolveValue(key.trim());
                    return (val !== undefined && val !== null) ? val : 0;
                });
            }

            // 3. 単体変数の解決
            if (v.startsWith('$') && playerState.hasOwnProperty(v)) return playerState[v];
            if (gameState.hasOwnProperty(v)) return gameState[v];

            // 4. 計算式内の変数置換
            v = v.replace(/([$a-zA-Z_][$a-zA-Z0-9_]*)/g, function(match) {
                if (playerState.hasOwnProperty(match)) return playerState[match];
                if (gameState.hasOwnProperty(match)) return gameState[match];
                return match;
            });

            // 5. ダイスロール
            v = v.replace(/(\\d+)d(\\d+)/g, function(match, count, face) {
                let total = 0;
                const n = parseInt(count);
                const f = parseInt(face);
                for (let i = 0; i < n; i++) total += Math.floor(Math.random() * f) + 1;
                return total;
            });

            // 6. 数式の計算
            if (typeof v === 'string') {
                v = v.replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
                     .replace(/　/g, ' ');
            }

            // 安全な文字列判定 (\\s と \\- をしっかり入れる)
            if (v.match(/^[0-9.+*/%()\\s\\-]+$/)) {
                try {
                    // ゼロ除算ガード (\\/ と ?!\\. にする)
                    if (v.match(/\\/ *0(?!\\.)/)) {
                        console.warn("Zero Division Error detected:", v);
                        return 0;
                    }
                    return new Function('return ' + v)();
                } catch (e) {
                    console.warn("Calculation Error:", v);
                    return 0;
                }
            }

            // 7. 通常の数値変換
            const num = Number(v);
            if (!isNaN(num)) return num;

            return v;
        }
        function evaluateCondition(c) { 
            let l = resolveValue(c.variable); let r=resolveValue(c.compareValue); if(c.value)r=resolveValue(c.value); 
            if(!isNaN(l)&&!isNaN(r)){l=Number(l);r=Number(r);} 
            switch(c.operator){case'==':return l==r;case'!=':return l!=r;case'>':return l>r;case'<':return l<r;case'>=':return l>=r;case'<=':return l<=r;default:return false;} 
        }
function userInteraction() { 
    if(hasInteracted) return; 
    hasInteracted = true; 
    
    // ★修正: AudioManagerのresumeを呼ぶ
    AudioManager.resume();
}

        function checkCollision(r1, r2) {
            return (
                r1.x < r2.x + r2.w &&
                r1.x + r1.w > r2.x &&
                r1.y < r2.y + r2.h &&
                r1.y + r1.h > r2.y
            );
        }
function getTerrainCollision(x, y, z, w, h, excludeObj = null, prevY = null) {
    const grid = mapEngine.GRID;
    const map = mapEngine.data;
    const isSide = (map.type === 'side');
    let hitWall = false;
    let floorZ = 0;
    
    let hitY_Top = null;
    let hitY_Bottom = null;

    if (map.edgeType !== 'loop') {
        const mapPixelW = map.width * grid;
        const mapPixelH = map.height * grid;
        
        // 左右の制限 (これは確実に進行を阻む壁)
        if (x <= 0 || x + w >= mapPixelW) hitWall = true; 
        
        if (!isSide) {
            // サイドビュー以外は上下も壁として扱う
            if (y <= 0 || y + h >= mapPixelH) hitWall = true;
        } else {
            // 【サイドビュー時の上下制限ロジック】
            
            // 上端 (天井)
            if (map.clampTop && y <= 0) {
                if (hitY_Top === null || 0 > hitY_Top) hitY_Top = 0;
                hitWall = true; // ★追加: 天井にぶつかるので hitWall=true にする
            }
            
            // 下端 (底)
            if (y + h >= mapPixelH) {
                if (!map.enableFallDeath) {
                    // 落下死無効 (デフォルト) なら、マップの底を歩ける床として扱う。
                    if (hitY_Bottom === null || mapPixelH < hitY_Bottom) hitY_Bottom = mapPixelH;
                }
            }
        }
    }

    const marginX = w * 0.2; 
    const marginYTop = isSide ? 4 : h * 0.4;
    const marginYBot = 1;

    const EPS = 0.001;
    const pl = x + marginX + EPS;
    const pr = x + w - marginX - EPS;
    const pt = y + marginYTop + EPS;
    const pb = y + h - marginYBot - EPS;

    for (let i = 0; i < mapEngine.activeObjects.length; i++) {
        const o = mapEngine.activeObjects[i];
        if (o === excludeObj || !o.isWall || o._isDead) continue;
        if (typeof checkCondition === 'function' && !checkCondition(o)) continue;

        const ox = (o.currentX !== undefined ? o.currentX : o.x * grid);
        const oy = (o.currentY !== undefined ? o.currentY : o.y * grid);
        const oz = o.z || 0;
        const ow = o.w || grid;
        const oh = o.h || grid;

        if (pl < ox + ow && pr > ox && pt < oy + oh && pb > oy) {
            if (isSide) {
                hitWall = true;
                if (prevY !== null) {
                    if (oy >= prevY + h - 8) {
                        if (hitY_Bottom === null || oy < hitY_Bottom) hitY_Bottom = oy;
                    } 
                    else if (oy + oh <= prevY + marginYTop + 8) {
                        if (hitY_Top === null || oy + oh > hitY_Top) hitY_Top = oy + oh;
                    }
                } else {
                    if (hitY_Bottom === null || oy < hitY_Bottom) hitY_Bottom = oy;
                    if (hitY_Top === null || oy + oh > hitY_Top) hitY_Top = oy + oh;
                }
            } else {
                const objTop = oz + grid; 
                if (z + (h * 0.4) >= objTop) { 
                    if (objTop > floorZ) floorZ = objTop; 
                } else if (z < objTop && z + h > oz) {
                    hitWall = true;
                    break;
                }
            }
        }
    }

    return { hitWall, floorZ, hitY_Bottom, hitY_Top };
}
        // --- Core Logic ---
        function checkCondition(obj) { if (!obj.condition || !obj.condition.variable) return true; return evaluateCondition(obj.condition); }
function refreshMapObjects() {
            if (!isMapMode || !mapEngine.data) return;
            
            const allMasterObjects = mapEngine.data.objects;
            const grid = mapEngine.GRID;
            
            // 1. 本来出現すべきなのに、まだマップにいないオブジェクトを追加
            allMasterObjects.forEach(master => {
                const isAlreadyActive = mapEngine.activeObjects.some(o => o.id === master.id);
                const shouldBeActive = checkCondition(master);
                
                if (shouldBeActive && !isAlreadyActive) {
                    const newObj = JSON.parse(JSON.stringify(master));
                    newObj.currentX = newObj.x * grid;
                    newObj.currentY = newObj.y * grid;
                    newObj._runtimeHp = undefined;
                    newObj._isDead = false;
                    mapEngine.activeObjects.push(newObj);
                }
            });
            
            // 2. 出現条件が満たされなくなったオブジェクトを消去
            mapEngine.activeObjects = mapEngine.activeObjects.filter(obj => {
                const master = allMasterObjects.find(m => m.id === obj.id);
                // IDがないもの（エフェクトや弾丸など）は消さない
                if (!master) return true; 
                return checkCondition(master);
            });
        }
        function findNode(id) { for (const s in gameData.scenario.sections) { if (gameData.scenario.sections[s].nodes[id]) return gameData.scenario.sections[s].nodes[id]; } return null; }



// --- Turn-based Battle System ---
        
// --- Turn-based Battle System ---
        
        let battleState = null;
        function processBattle(node) {
            const enemyIds = node.enemyIds || (node.enemyId ? [node.enemyId] : []);
            
            if (!enemyIds || enemyIds.length === 0) {
                alert("敵データが設定されていません。");
                processNode(node.nextWinNodeId);
                return;
            }

            const enemies = [];
            const nameCount = {}; 

            enemyIds.forEach(eid => {
                const def = gameData.enemies[eid];
                if (!def) return; 

                if (!nameCount[def.name]) nameCount[def.name] = 0;
                nameCount[def.name]++;
                
                const val = (v, d) => (v !== undefined && v !== "") ? Number(resolveValue(v)) : d;

                const enemyObj = {
                    id: eid,
                    originalName: def.name,
                    name: def.name,
                    hp: val(def.hp, 10),
                    maxHp: val(def.hp, 10),
                    stamina: val(def.stamina, 100),
                    maxStamina: val(def.stamina, 100),
                    staminaRegen: val(def.staminaRegen, 10),
                    atk: val(def.atk, 1),
                    def: val(def.def, 0),
                    spd: (def.spd !== undefined) ? val(def.spd, 2.0) : 2.0,
                    exp: val(def.exp, 0),
                    penetration: val(def.pen, 1),
                    critRate: val(def.critRate, 5),
                    critMult: val(def.critMult, 1.5),
                    imageId: def.imageId,
                    hitParticleId: def.hitParticleId,
                    aiPattern: def.aiPattern || 'tactical',
                    dropItemId: def.dropItemId,
                    dropRate: def.dropRate,
                    isDead: false,
                    isLockedOn: false
                };
                enemies.push(enemyObj);
            });

            const currentNameCount = {};
            enemies.forEach(e => {
                if (nameCount[e.originalName] > 1) {
                    if (!currentNameCount[e.originalName]) currentNameCount[e.originalName] = 0;
                    const suffix = String.fromCharCode(65 + currentNameCount[e.originalName]); 
                    e.name = e.originalName + suffix;
                    currentNameCount[e.originalName]++;
                }
            });

            battleState = {
                node: node,
                enemies: enemies, 
                turnQueue: [],
                isOver: false,
                turnCount: 0,
                isTargetSelection: false,
                pendingAction: null,
                isGuard: false,
                isDash: false,
                isJump: false
            };

            if (node.backgroundId && gameData.assets.backgrounds[node.backgroundId]) {
                document.getElementById('background-layer-1').style.backgroundImage = "url('" + gameData.assets.backgrounds[node.backgroundId].data + "')";
            }
            
            battleState.previousBgmId = AudioManager._bgmId;

            if (node.bgmId) {
                AudioManager.playBgm(node.bgmId, masterVolBgm);
            }

            const area = document.getElementById('battle-enemy-area');
            area.innerHTML = ''; 

            enemies.forEach((e, index) => {
                const container = document.createElement('div');
                container.className = 'enemy-container';
                container.id = 'enemy-cnt-' + index;
                
                container.onclick = () => window.onEnemyClicked(index);

                const img = document.createElement('img');
                img.className = 'battle-enemy-img';
                img.id = 'enemy-img-' + index; 
                if (e.imageId && gameData.assets.characters[e.imageId]) {
                    img.src = gameData.assets.characters[e.imageId].data;
                } else {
                    img.style.display = "none"; 
                    const dummy = document.createElement('div');
                    dummy.textContent = e.name;
                    dummy.style.cssText = "width:100px; height:100px; background:rgba(0,0,0,0.5); border:2px solid #fff; color:#fff; display:flex; align-items:center; justify-content:center;";
                    container.appendChild(dummy);
                }
                
                const barBg = document.createElement('div');
                barBg.className = 'enemy-hp-bar-bg';
                barBg.style.display = 'block'; 
                
                const barFill = document.createElement('div');
                barFill.className = 'enemy-hp-bar-fill';
                barFill.id = 'enemy-hp-bar-' + index;
                barBg.appendChild(barFill);

                container.appendChild(img);
                container.appendChild(barBg);
                area.appendChild(container);
            });

            ui.textBox.style.display = 'none';
            ui.overlay.style.display = 'none';
            document.getElementById('battle-overlay').style.display = 'flex';
            
            setupBattleCommands(node);

            document.getElementById('battle-msg-box').innerHTML = '';
            battleLog("モンスターたちが あらわれた！");
            
            const marker = document.getElementById('battle-lock-marker');
            if(marker) marker.style.display = 'none';

            updateBattleStatus();
            startBattleRound();
        }

        window.battleAction = function(action) {
            if (!battleState || battleState.isOver) return;
            
            if (battleState.isActing) return;

            if (battleState.isTargetSelection) {
                battleState.isTargetSelection = false;
                const msgEl = document.getElementById('battle-target-msg');
                if (msgEl) msgEl.style.display = 'none';
                battleState.enemies.forEach((e, i) => {
                    const el = document.getElementById('enemy-cnt-' + i); 
                    if (el) el.classList.remove('target-mode');
                });
            }

            if (['guard', 'dash', 'jump', 'wait', 'run', 'item'].includes(action)) {
                executePlayerAction(action, null);
                return;
            }

            const aliveEnemies = battleState.enemies.filter(e => !e.isDead);
            
            if (aliveEnemies.length === 1) {
                const targetIndex = battleState.enemies.indexOf(aliveEnemies[0]);
                executePlayerAction(action, targetIndex);
            } else {
                startTargetSelection(action);
            }
        };

        function setupBattleCommands(node) {
            const cmdBox = document.getElementById('battle-cmd-box');
            cmdBox.innerHTML = ''; 

            const createBtn = (text, action) => {
                const div = document.createElement('div');
                div.className = 'battle-cmd-btn';
                div.textContent = text;
                div.onclick = () => window.battleAction(action);
                return div;
            };

            if (node.canAttack !== false) cmdBox.appendChild(createBtn('⚔️ たたかう', 'attack'));
            if (node.canGuard !== false) cmdBox.appendChild(createBtn('🛡️ ぼうぎょ', 'guard'));
            if (node.canDash) cmdBox.appendChild(createBtn('💨 ダッシュ', 'dash'));
            if (node.canJump) cmdBox.appendChild(createBtn('🦘 ジャンプ', 'jump'));
            if (node.canLockon !== false) cmdBox.appendChild(createBtn('🎯 ロックオン', 'lockon'));
            if (node.canItem !== false) cmdBox.appendChild(createBtn('💊 アイテム', 'item'));
            if (node.canWait !== false) cmdBox.appendChild(createBtn('👀 様子を見る', 'wait'));
            if (node.canEscape !== false) cmdBox.appendChild(createBtn('🏳️ にげる', 'run'));
        }

        function startTargetSelection(action) {
            battleState.isTargetSelection = true;
            battleState.pendingAction = action;
            
            const msgEl = document.getElementById('battle-target-msg');
            if(msgEl) msgEl.style.display = 'block';
            
            battleLog("ターゲットを選択してください。");

            battleState.enemies.forEach((e, i) => {
                if (!e.isDead) {
                    const el = document.getElementById('enemy-cnt-' + i);
                    if(el) el.classList.add('target-mode');
                }
            });
        }

        window.onEnemyClicked = function(index) {
            if (!battleState || !battleState.isTargetSelection) return;
            
            const target = battleState.enemies[index];
            if (!target || target.isDead) return;

            battleState.isTargetSelection = false;
            
            const msgEl = document.getElementById('battle-target-msg');
            if(msgEl) msgEl.style.display = 'none';
            
            battleState.enemies.forEach((e, i) => {
                const el = document.getElementById('enemy-cnt-' + i);
                if(el) el.classList.remove('target-mode');
            });

            executePlayerAction(battleState.pendingAction, index);
        };
async function executePlayerAction(action, targetIndex) {
            battleState.isActing = true;

            const btns = document.querySelectorAll('.battle-cmd-btn');
            btns.forEach(b => { b.style.pointerEvents = 'none'; b.style.opacity = '0.6'; });

            const pName = battleState.node.playerNameOverride || playerState.$name || "YOU";
            const target = (targetIndex !== null) ? battleState.enemies[targetIndex] : null;
            const pData = gameData.player || {};

            const costs = {
                attack: Number(resolveValue(pData.attackCost)) || 20,
                guard: (Number(resolveValue(pData.guardCost)) || 0.5) * 20,
                dash: (Number(resolveValue(pData.dashCost)) || 0.5) * 20,
                jump: Number(resolveValue(pData.jumpCost)) || 15,
                lockon: 0, item: 0, run: 0, wait: 0
            };
            
            const cost = costs[action] || 0;
            if (action !== 'item' && playerState.$stamina < cost) {
                battleLog("スタミナが足りない！");
                
                // ★追加: ユーザーが「押せなかった」と誤解しないためのポップアップ
                if (typeof showDamagePopup === 'function') showDamagePopup(mapEngine.player, "NO STAMINA!", 'system');
                
                if (!playerState.isExhausted) {
                    playerState.isExhausted = true;
                    playerState.exhaustionTimer = Number(resolveValue(pData.exhaustionDuration)) || 3.0;
                }
                
                // ★追加: ボタンが一瞬で戻ってガタガタするのを防ぐため、少し待つ
                setTimeout(() => {
                    btns.forEach(b => { b.style.pointerEvents = 'auto'; b.style.opacity = '1.0'; });
                    battleState.isActing = false;
                }, 500);
                return;
            }

            if (action !== 'item') playerState.$stamina -= cost;
            updateBattleStatus();

            if (action === 'attack') {
                battleLog(pName + " の攻撃！ -> " + target.name);
                await wait(400);

                let hitChance = 95;
                if (playerState.$isLockedOn) {
                    hitChance = 100;
                } else {
                    const pSpd = Number(playerState.$spd) || 4;
                    const eSpd = target.spd;
                    hitChance += (pSpd - eSpd) * 10;
                }
                
                if (battleState.isDash) hitChance += 20;

                if (Math.random() * 100 > hitChance) {
                    battleLog("ミス！ 攻撃が当たらない！");
                } else {
                    let atk = playerState.$atk || 1;
                    let isCrit = (Math.random() * 100 < (playerState.criticalRate || 5));
                    let mult = playerState.criticalMultiplier || 2.0;
                    
                    if (battleState.isJump) {
                        isCrit = true; 
                        mult += 0.5;
                        battleState.isJump = false; 
                    }
                    if (target.stamina <= 0 && pData.exhaustionCrit) isCrit = true;

                    let def = target.def;
                    if (target.stamina <= 0 && pData.exhaustionDefZero) def = 0;
                    const pen = Number(resolveValue(pData.penetration)) || 1;
                    
                    // ★修正: ゼロ除算防止のため pen を Math.max(1, pen) で囲む
                    let dmg = Math.max(1, Math.floor(atk - (def / Math.max(1, pen))));
                    
                    if (isCrit) {
                        dmg = Math.floor(dmg * mult);
                        battleLog("会心の一撃！！");
                    }
                    if (target.stamina <= 0 && pData.exhaustionDmgDouble) dmg *= 2;

                    target.hp -= dmg;
                    battleLog(target.name + " に " + dmg + " のダメージ！");
                    
                    const img = document.getElementById('enemy-img-' + targetIndex);
                    if(img) {
                        img.classList.add('dmg-shake');
                        setTimeout(() => img.classList.remove('dmg-shake'), 400);
                    }
                    spawnParticle('spark', window.innerWidth/2, window.innerHeight/3, { isScreenSpace:true, count:10 });

                     if (target.hasBattleEvent && target.battleEvents) {
                        const per = Math.max(0, (target.hp / target.maxHp) * 100);
                        if (!target._triggeredEvents) target._triggeredEvents = [];
                        
                        target.battleEvents.forEach(function(evt, idx) {
                            if (!target._triggeredEvents.includes(idx) && per <= evt.threshold) {
                                target._triggeredEvents.push(idx);
                                // 戦闘状態を一時保存しつつノードへ飛ぶ
                                processNode(evt.nodeId);
                            }
                        });
                    }
                } // ★修正: Math.random() * 100 > hitChance の else ブロックを閉じる
            } // ★修正: if (action === 'attack') ブロックを閉じる
            else if (action === 'lockon') {
                battleState.enemies.forEach(e => e.isLockedOn = false);
                target.isLockedOn = true;
                playerState.$isLockedOn = 1;
                
                battleLog(target.name + " に ロックオン！");
                
                const marker = document.getElementById('battle-lock-marker');
                const tgtContainer = document.getElementById('enemy-cnt-' + targetIndex);
                if (marker && tgtContainer) {
                    marker.style.display = 'block';
                    const rect = tgtContainer.getBoundingClientRect();
                    marker.style.left = (rect.left + rect.width/2 - 10) + 'px';
                    marker.style.top = (rect.top - 30) + 'px';
                }
                await wait(500);
            }
            else if (action === 'guard') {
                battleState.isGuard = true;
                battleLog(pName + " は 身を固めた！");
                await wait(500);
            }
            else if (action === 'dash') {
                battleState.isDash = true;
                battleLog(pName + " は 高速で移動した！");
                await wait(500);
            }
            else if (action === 'jump') {
                battleState.isJump = true;
                battleLog(pName + " は 高く飛び上がった！");
                await wait(500);
            }
            else if (action === 'wait') {
                battleLog(pName + " は 様子をうかがっている...");
                const regen = Number(resolveValue(pData.staminaRegen)) || 20;
                playerState.$stamina = Math.min(playerState.$maxStamina, playerState.$stamina + regen * 2);
                await wait(500);
            }
             else if (action === 'run') {
                battleLog(pName + " は 逃げ出した！");
                await wait(800);
                
                let maxEnemySpd = 1; // 平均ではなく「一番素早い敵」を基準にする
                battleState.enemies.forEach(e => {
                    if (!e.isDead && e.spd > maxEnemySpd) maxEnemySpd = e.spd;
                });
                
                const mySpd = Number(playerState.$spd) || 4;
                
                // ★修正: SPD(2.0〜6.0)の差分を考慮した適切な確率計算
                // 同速なら50%。SPDが1.0上回るごとに+15%
                let escapeChance = 50 + (mySpd - maxEnemySpd) * 15;
                escapeChance = Math.max(10, Math.min(95, escapeChance)); // 最低10% 最高95%

                if ((Math.random() * 100) < escapeChance) {
                    battleLog("うまく逃げ切れた！");
                    await wait(1000);
                    endBattle('run');
                    return;
                } else {
                    battleLog("しかし 回り込まれてしまった！");
                }
            }
            else if (action === 'item') {
                toggleInventory();
                const invWin = document.getElementById('inventory-window');
                if(invWin) invWin.style.zIndex = "3000";
                battleState.isActing = false;
                return; 
            }

            if (target && target.hp <= 0 && !target.isDead) {
                target.hp = 0;
                target.isDead = true;
                await wait(500);
                battleLog(target.name + " を 倒した！");
                
                const cnt = document.getElementById('enemy-cnt-' + targetIndex);
                if(cnt) cnt.classList.add('dead');
                
                if (target.isLockedOn) {
                    const marker = document.getElementById('battle-lock-marker');
                    if(marker) marker.style.display = 'none';
                    playerState.$isLockedOn = 0;
                }
                
                if (target.exp > 0) gainExp(target.exp);
                
                if (target.dropItemId && gameData.items[target.dropItemId]) {
                    if (Math.random() * 100 < (target.dropRate || 100)) {
                        const itemDef = gameData.items[target.dropItemId];
                        if (!playerState.inventory) playerState.inventory = {};
                        playerState.inventory[target.dropItemId] = (playerState.inventory[target.dropItemId] || 0) + 1;
                        battleLog(itemDef.name + " を手に入れた！");
                    }
                }
            }

            updateBattleStatus();

            const allDead = battleState.enemies.every(e => e.isDead);
            if (allDead) {
                await wait(1000);
                battleLog("勝利した！");
                await wait(1500);
                endBattle('win');
                return;
            }

            setTimeout(() => {
                battleState.isActing = false;
                processTurnQueue();
            }, 500);
        }

        function startBattleRound() {
            if (!battleState || battleState.isOver) return;
            battleState.turnCount++;

            let queue = [];

            queue.push({ 
                type: 'player', 
                name: battleState.node.playerNameOverride || playerState.$name || "YOU",
                spd: Number(playerState.$spd) || 4 
            });

            battleState.enemies.forEach((e, index) => {
                if (!e.isDead) {
                    queue.push({ 
                        type: 'enemy', 
                        index: index, 
                        name: e.name, 
                        spd: e.spd 
                    });
                }
            });

            queue.sort((a, b) => b.spd - a.spd);
            battleState.turnQueue = queue;
            processTurnQueue();
        }

        function processTurnQueue() {
            if (!battleState || battleState.isOver) return;

            if (battleState.turnQueue.length === 0) {
                startBattleRound();
                return;
            }

            const actor = battleState.turnQueue.shift();

            if (actor.type === 'enemy' && battleState.enemies[actor.index].isDead) {
                processTurnQueue();
                return;
            }

            if (actor.type === 'player') {
                battleState.isGuard = false;
                battleState.isJump = false;
                
                const pData = gameData.player || {};
                const regen = Number(resolveValue(pData.staminaRegen)) || 20;
                playerState.$stamina = Math.min(playerState.$maxStamina, playerState.$stamina + regen);
                updateBattleStatus();

                const btns = document.querySelectorAll('.battle-cmd-btn');
                btns.forEach(b => { 
                    b.style.pointerEvents = 'auto'; 
                    b.style.opacity = '1.0'; 
                });
            } 
            else {
                const btns = document.querySelectorAll('.battle-cmd-btn');
                btns.forEach(b => { 
                    b.style.pointerEvents = 'none'; 
                    b.style.opacity = '0.6'; 
                });

                executeEnemyAI(actor.index);
            }
        }

        async function executeEnemyAI(index) {
            battleState.isActing = true;

            const enemy = battleState.enemies[index];
            const pName = battleState.node.playerNameOverride || playerState.$name || "YOU";

            enemy.stamina = Math.min(enemy.maxStamina, enemy.stamina + enemy.staminaRegen);
            updateBattleStatus();

            const atkCost = 20;
            if (enemy.stamina < atkCost) {
                battleLog(enemy.name + " は 様子を見ている。");
                
                // ★修正: 行動パス時のボーナス回復を調整 (過剰回復を防ぐ)
                enemy.stamina = Math.min(enemy.maxStamina, enemy.stamina + enemy.staminaRegen); 
                
                await wait(1000);
                
                battleState.isActing = false;
                processTurnQueue();
                return;
            }

            enemy.stamina -= atkCost;
            updateBattleStatus();

            battleLog(enemy.name + " の攻撃！");
            
            const img = document.getElementById('enemy-img-' + index);
            if(img) {
                img.classList.add('enemy-attack'); 
                setTimeout(() => img.classList.remove('enemy-attack'), 300);
            }
            
            await wait(500);

            let hitChance = 90;
            if (battleState.isDash) hitChance -= 40;
            if (battleState.isJump) hitChance -= 20;

            if (Math.random() * 100 > hitChance) {
                battleLog(pName + " は 攻撃をかわした！");
            } else {
                let atk = enemy.atk;
                let def = playerState.$def || 0;
                
                 const pen = enemy.penetration || 1;
                
                // ダメージ計算: (攻撃力) - (防御力 ÷ 貫通力)
                let dmg = Math.max(1, Math.floor(atk - (def / Math.max(1, pen)))); 

                // ★修正: 防御力2倍ではなく、アクション戦闘と同様に「最終ダメージを50%カット」に変更
                if (battleState.isGuard) {
                    dmg = Math.max(1, Math.floor(dmg * 0.5));
                    battleLog("ガード！ ダメージを半減！");
                }

                playerState.$hp -= dmg;
                battleLog(pName + " は " + dmg + " のダメージを受けた！");
                
                if (gameData.settings.autoShakeOnDamage !== false) {
                    ui.container.classList.add('fx-shake-small');
                    setTimeout(() => ui.container.classList.remove('fx-shake-small'), 500);
                }
            }


            updateBattleStatus();

            if (playerState.$hp <= 0) {
                playerState.$hp = 0;
                await wait(1000);
                battleLog("全滅してしまった……");
                await wait(1000);
                
                battleState.isActing = false;
                endBattle('lose');
                return;
            }

            await wait(500);
            
            battleState.isActing = false;
            processTurnQueue();
        }

        function updateBattleStatus() {
            const php = document.getElementById('battle-player-hp');
            const psp = document.getElementById('battle-player-sp');
            if(php) php.textContent = Math.floor(playerState.$hp);
            if(psp) psp.textContent = Math.floor(playerState.$stamina);
            
            if (battleState && battleState.enemies) {
                battleState.enemies.forEach((e, i) => {
                    const bar = document.getElementById('enemy-hp-bar-' + i);
                    if (bar) {
                        const pct = Math.max(0, (e.hp / e.maxHp) * 100);
                        bar.style.width = pct + '%';
                        
                        if (pct < 20) bar.style.background = '#ff4d4f';
                        else if (pct < 50) bar.style.background = '#faad14';
                        else bar.style.background = '#f00';
                    }
                });
            }
        }
        // ログ表示
        function battleLog(msg) {
            const box = document.getElementById('battle-msg-box');
            box.innerHTML += "<div>" + msg + "</div>";
            box.scrollTop = box.scrollHeight;
        }
        function endBattle(result) {
        if (battleState.isOver) return; 
            battleState.isOver = true;
            document.getElementById('battle-overlay').style.display = 'none';
            
            // ★最適化: バトル前のBGMに自動的に戻す（マップや会話での鳴りっぱなしを防ぐ）
            if (battleState.previousBgmId) {
                AudioManager.playBgm(battleState.previousBgmId, masterVolBgm);
            } else {
                AudioManager.stopBgm(); // 元々無音だったなら止める
            }
            
            let nextId = null;
            if (result === 'win') nextId = battleState.node.nextWinNodeId;
            else if (result === 'run') nextId = battleState.node.nextRunNodeId;
            else if (result === 'lose') nextId = battleState.node.nextLoseNodeId;
            
            if (result === 'lose' && !nextId) {
                // ★修正: マップ固有のゲームオーバー設定を優先する
                const currentMap = mapEngine.currentMapId ? gameData.maps[mapEngine.currentMapId] : null;
                const s = gameData.settings || {};
                nextId = (currentMap && currentMap.gameoverEventNodeId) ? currentMap.gameoverEventNodeId : s.globalGameoverNodeId;
            }
            
            if (nextId) {
                processNode(nextId);
            } else {
                alert("バトル終了後の遷移先が設定されていません。");
            }
        }

function applyNodeUIStyle(node, type) {
    const s = gameData.settings || {};
    const n = node.uiStyle || {};
    const useOverride = n.override;

    // --- メッセージウィンドウ (Text) ---
    if (type === 'text') {
        const box = ui.textBox;
        if (!box) return;

        // 1. 位置とサイズ
        const pos = (useOverride && n.position) ? n.position : (s.portraitUI.windowVertical || 'bottom');
        const heightVal = s.portraitUI.windowHeight || 35;
        
        box.style.height = (pos === 'full') ? '100%' : (heightVal + '%');
        box.className = ''; 
        
        if (pos === 'top') {
            box.style.top = '2%'; box.style.bottom = 'auto'; box.style.transform = 'none';
        } else if (pos === 'middle') {
            box.style.top = '50%'; box.style.bottom = 'auto'; box.style.transform = 'translateY(-50%)';
        } else if (pos === 'full') {
            box.style.top = '0'; box.style.bottom = '0'; box.style.transform = 'none';
            box.classList.add('win-full');
        } else { // bottom
            box.style.top = 'auto'; box.style.bottom = '2%'; box.style.transform = 'none';
        }

        // 2. 背景と枠線
        const imgId = useOverride ? n.imageId : s.windowImage; 
        let bgImage = null;
        

        if (useOverride && n.imageId && gameData.assets.backgrounds[n.imageId]) {
            bgImage = \`url('\${gameData.assets.backgrounds[n.imageId].data}')\`;
        } else if (!useOverride && s.windowImage) {
            bgImage = \`url('\${s.windowImage}')\`;
        }

        const isTrans = useOverride ? n.transparent : s.windowBgTransparent;
        const colorHex = useOverride ? (n.color || '#000000') : (s.windowColor || '#000000');
        const opacity = useOverride ? (n.opacity !== undefined ? n.opacity : 75) : (s.windowOpacity !== undefined ? s.windowOpacity : 75);
        
        if (bgImage) {
            box.style.backgroundImage = bgImage;
            box.style.backgroundColor = 'transparent';
            box.style.border = 'none';
        } else {
            box.style.backgroundImage = 'none';
            if (isTrans) {
                box.style.backgroundColor = 'transparent';
                box.style.backdropFilter = 'none';
            } else {
                const r = parseInt(colorHex.slice(1,3), 16);
                const g = parseInt(colorHex.slice(3,5), 16);
                const b = parseInt(colorHex.slice(5,7), 16);

                box.style.backgroundColor = \`rgba(\${r}, \${g}, \${b}, \${opacity/100})\`;
                
                const bw = s.borderWidth || 2;
                const bc = s.borderColor || '#fff';

                box.style.border = \`\${bw}px solid \${bc}\`;
            }
        }
    }
}

// --- 選択肢ボタンのスタイル適用関数 (エスケープ修正版) ---
function createChoiceButtonStyle(node) {
    const s = gameData.settings || {};
    const n = node.uiStyle || {};
    const useOverride = n.override;

    const imgId = useOverride ? n.imageId : null;
    let bgStyle = '';
    

    if (useOverride && imgId && gameData.assets.backgrounds[imgId]) {
        bgStyle = \`background-image: url('\${gameData.assets.backgrounds[imgId].data}'); background-color: transparent; border: none;\`;
    } else if (!useOverride && s.buttonImage) {
        bgStyle = \`background-image: url('\${s.buttonImage}'); background-color: transparent; border: none;\`;
    } else {
        const isTrans = useOverride ? n.transparent : s.buttonBgTransparent;
        const colorHex = useOverride ? (n.color || '#1990ff') : (s.buttonColor || '#1990ff');
        const opacity = useOverride ? (n.opacity !== undefined ? n.opacity : 80) : (s.buttonOpacity !== undefined ? s.buttonOpacity : 80);
        
        if (isTrans) {
            bgStyle = \`background-color: transparent; border: 1px solid #fff;\`;
        } else {
            const r = parseInt(colorHex.slice(1,3), 16);
            const g = parseInt(colorHex.slice(3,5), 16);
            const b = parseInt(colorHex.slice(5,7), 16);
            // ★修正箇所
            bgStyle = \`background-color: rgba(\${r}, \${g}, \${b}, \${opacity/100}); border: \${s.borderWidth||2}px solid \${s.borderColor||'#fff'};\`;
        }
    }

    const textColor = useOverride ? (n.textColor || '#ffffff') : (s.buttonTextColor || '#ffffff');
    
    // ★修正箇所
    return \`\${bgStyle} color: \${textColor}; border-radius: \${s.borderRadius||10}px;\`;
}
        const wait = function(ms) { return new Promise(function(resolve) { setTimeout(resolve, ms); }); };

function processNode(nodeId) { 
            if (isProcessingNode || !nodeId) return; 
            
            nodeHistory.push(nodeId);
            if (nodeHistory.length > MAX_HISTORY) {
                nodeHistory.shift(); 
            }
            
              if (!window._loopStartTime) window._loopStartTime = performance.now();
    executionCounter++; 
    
    if (executionCounter > 5000) { 
        const elapsed = performance.now() - window._loopStartTime;
        if (elapsed < 1000) {
            console.error("Infinite loop detected!");
            alert("エラー: シナリオの無限ループを検知しました。\\n(ノードが瞬間的に5000回以上呼び出されました)");
            executionCounter = 0;
            return;
        }
        executionCounter = 0;
        window._loopStartTime = performance.now();
    }
    
    if (window._loopResetTimer) clearTimeout(window._loopResetTimer);
    window._loopResetTimer = setTimeout(() => { 
        executionCounter = 0; 
        window._loopStartTime = null;
    }, 50);
    try {
        const node = findNode(nodeId); 
        
        // ノードが見つからない場合のエラー
        if (!node) {
            throw new Error("Node not found: " + nodeId);
        }

        isProcessingNode = true; 
        currentPlayingNodeId = nodeId; 
        isWaitingForInput = false;

        if (node.type === 'text') {
            processText(node);
        } 
        else if (node.type === 'input') {
            processInputNode(node); 
        }
        // ★追加: Waitノードの実行
        else if (node.type === 'wait') {
            processWaitNode(node); 
        }
        else if (node.type === 'choice') {
            processChoice(node);
        }
        else if (node.type === 'variable') {
            processVariable(node);
            if (isMapMode) refreshMapObjects();
        }
        else if (node.type === 'conditional') {
            processConditional(node);
        }
        else if (node.type === 'ui_control') {
            processUIControl(node);
        }
        else if (node.type === 'shop') {
            processShop(node);
        }    else if (node.type === 'battle') {
            processBattle(node);
        }
        else if (node.type === 'map') {
            endMapMode();
            startMapMode(node);
        }

        setTimeout(() => { isProcessingNode = false; }, 10);

    } catch (e) {
        console.error("Error at Node:", nodeId, e);
        // エラー画面を表示
        const screen = document.getElementById('error-screen');
        const msg = document.getElementById('error-message');
        if (screen && msg) {
            screen.style.display = 'flex';
            msg.textContent = "Processing Error at Node [" + nodeId + "]:\\n" + e.message;
        }
        isProcessingNode = false;
    }
}

function processText(node) {
            // 背景処理
            if (node.backgroundId && gameData.assets.backgrounds && gameData.assets.backgrounds[node.backgroundId]) { 
                const asset = gameData.assets.backgrounds[node.backgroundId]; 
                const target = activeBg===1 ? layers.bg2 : layers.bg1; 
                const old = activeBg===1 ? layers.bg1 : layers.bg2;
                
                if (asset.data.startsWith('data:video')) {
                    target.innerHTML = ''; 
                    const vid = document.createElement('video'); 
                    vid.src = asset.data; vid.autoplay = true; vid.loop = true; vid.muted = false; vid.playsInline = true; vid.className = 'bg-video';
                    target.appendChild(vid); target.style.backgroundImage = 'none';
                    animState.bg = { id: null, element: null, timer: 0, frame: 0 }; 
                } else { 
                    target.innerHTML = ''; target.style.backgroundImage = \`url('\${asset.data}')\`; 
                    animState.bg = { id: node.backgroundId, element: target, timer: 0, frame: 0 }; 
                }
                
                target.style.display = 'block';
                old.style.opacity = 0; target.style.opacity = 1; 
                setTimeout(() => {
                    const oldVid = old.querySelector('video');
                    if (oldVid) {
                        oldVid.pause();
                        oldVid.removeAttribute('src'); // ソースを空にする
                        oldVid.load(); // メモリを強制解放
                        oldVid.remove(); // ★追加: DOMからも完全に削除する
                    }
                    old.innerHTML = ''; 
                    old.style.backgroundImage = 'none'; 
                }, 500);
                
                activeBg = activeBg===1 ? 2 : 1; 
            }

            // 2Dキャラ表示
            layers.charaContainer.innerHTML=''; 
            animState.characters = []; 
            
            (node.characters||[]).forEach(c=>{ 
                if(!gameData.assets.characters || !gameData.assets.characters[c.characterId]) return; 
                const asset = gameData.assets.characters[c.characterId];
                let d; const s = (c.scale||100)/100; const posX = c.x || 0; const posY = c.y || 0;
                
                if ((asset.cols||1) > 1 || (asset.rows||1) > 1) {
                    d = document.createElement('div'); d.className = 'sprite-char-div pos-'+(c.position||'bottom-center'); d.style.backgroundImage = \`url('\${asset.data}')\`;
                    const frameW = asset.width / asset.cols; const frameH = asset.height / asset.rows; 
                    d.style.width = frameW + 'px'; 
                    d.style.height = frameH + 'px'; 
                    d.style.backgroundSize = asset.width + 'px ' + asset.height + 'px'; 
                    d.style.backgroundPosition = '0 0';
                    
                    const isLoop = (c.loop !== undefined) ? c.loop : true;
                    animState.characters.push({ id: c.characterId, element: d, timer: 0, frame: 0, loop: isLoop }); 
                } else { 
                    d = document.createElement('img'); 
                    d.className = 'sprite-char-img pos-'+(c.position||'bottom-center'); 
                    d.onerror = function() { 
                        this.classList.add('img-error-fallback'); 
                        this.alt = "Image Load Error";
                        this.style.backgroundColor = "#222"; 
                    };
                    d.src = asset.data;
                }
                d.style.transform='translateX(calc(-50% + '+posX+'px)) translateY('+posY+'px) scale('+s+')'; 
                if(c.maskId && gameData.assets.characters[c.maskId]){ const m='url(' + gameData.assets.characters[c.maskId].data + ')'; d.style.webkitMaskImage=m; d.style.maskImage=m; } 
                setTimeout(()=>d.classList.add('loaded'),10); 
                layers.charaContainer.appendChild(d);
            });
            
            // 3Dモデル表示
            if (threeHandler && threeHandler.hideAll) threeHandler.hideAll();
            if (node.characters3d && window.threeHandler) { 
                node.characters3d.forEach(c => { 
                    if(c.modelId) {
                        threeHandler.showModel(c.modelId, { 
                            posX:c.posX, posY:c.posY, posZ:c.posZ, 
                            rotX:c.rotX, rotY:c.rotY, rotZ:c.rotZ, 
                            scale:c.scale, 
                            animationId:c.animationId, 
                            expression: c.expression,
                            loop: (c.loop !== undefined) ? c.loop : true
                        });
                    }
                }); 
            }
            
            // UI更新
// UI更新
            ui.name.style.display = node.customName?'block':'none'; 
            ui.name.textContent = node.customName ? replaceVariablesInText(node.customName) : '';
            applyNodeUIStyle(node, 'text'); 
            ui.textBox.style.display = node.message?'block':'none'; 
            ui.choices.innerHTML=''; 
            ui.overlay.style.display='block';
            
            // ★新機能: タイプライター演出（一文字ずつ表示）
            const fullHtml = replaceVariablesInText(node.message || '');
            
            if (isSkip || isAuto || fullHtml === '') {
                // スキップ中やオート中は一瞬で出す
                ui.msg.innerHTML = fullHtml;
                isWaitingForInput = true;
                checkAuto();
            } else {
                // 通常時は一文字ずつ表示
                ui.msg.innerHTML = '';
                isWaitingForInput = false; // 表示が終わるまで進行不可
                
                // HTMLタグを壊さずに一文字ずつパースする
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = fullHtml;
                
                let nodesToType = [];
                const extractNodes = (el) => {
                    for (let child of el.childNodes) {
                        if (child.nodeType === 3) { // テキストノード
                            const text = child.textContent;
                            for (let i = 0; i < text.length; i++) {
                                nodesToType.push({ type: 'char', char: text[i] });
                            }
                        } else {
                            // 要素ノード（<br>や<span>など）
                            nodesToType.push({ type: 'open', node: child.cloneNode(false) });
                            extractNodes(child);
                            nodesToType.push({ type: 'close' });
                        }
                    }
                };
                extractNodes(tempDiv);
                
                let currentIndex = 0;
                let currentContainer = ui.msg;
                const parentStack = [ui.msg];
                
                // ★クリックで全表示（スキップ）するための関数
                window._skipTypewriter = () => {
                    if (window._typewriterTimer) clearInterval(window._typewriterTimer);
                    ui.msg.innerHTML = fullHtml; // 全開
                    isWaitingForInput = true;
                    window._skipTypewriter = null; // 使い終わったら消す
                };
                
                window._typewriterTimer = setInterval(() => {
                    if (currentIndex >= nodesToType.length) {
                        clearInterval(window._typewriterTimer);
                        isWaitingForInput = true;
                        window._skipTypewriter = null;
                        checkAuto();
                        return;
                    }
                    
                    const n = nodesToType[currentIndex];
                    if (n.type === 'char') {
                        currentContainer.appendChild(document.createTextNode(n.char));
                    } else if (n.type === 'open') {
                        currentContainer.appendChild(n.node);
                        parentStack.push(n.node);
                        currentContainer = n.node;
                    } else if (n.type === 'close') {
                        parentStack.pop();
                        currentContainer = parentStack[parentStack.length - 1];
                    }
                    currentIndex++;
                    
                }, 30); // 30ミリ秒ごとに1文字（スピードはお好みで）
            }
            
            if(node.message) {
                backLog.push({name:node.customName, text:node.message, type:'text'});
                if (backLog.length > 100) backLog.shift();
            }
            
    // ★修正: サウンド処理 (BGM)
    if (node.bgmId) { 
        AudioManager.playBgm(node.bgmId, masterVolBgm);
    }
    
    // ★修正: サウンド処理 (SE)
    if (node.soundId) { 
        AudioManager.playSe(node.soundId, masterVolSe);
    }

            // エフェクト（パーティクル＆フィルター）処理
            if (node.particleId) {
                // 1. 停止コマンド
                if (node.particleId === 'stop') {
                    activeEmitters = []; 
                    ui.container.style.filter = "none";
                    document.querySelectorAll('.world-layer').forEach(el => el.style.filter = "none");
                    // フィルターリセット
                    ui.effect.style.background = "none";
                    ui.effect.style.opacity = 0;
                } 
                // 2. ユーザー定義エフェクト (パーティクル or フィルター)
                else if (gameData.particles && gameData.particles[node.particleId]) {
                    const pDef = gameData.particles[node.particleId];
                    
 if (pDef.type === 'filter') {
                        // ターゲット要素の決定
                        // UI除外ONなら「world-layerクラスを持つ要素」、OFFなら「コンテナ全体」
                        const targetSelector = pDef.excludeUI ? ".world-layer" : "#game-container";
                        const targets = document.querySelectorAll(targetSelector);
                        
                        // 1. CSSフィルター適用
                        // まず全体のリセット
                        ui.container.style.filter = "none";
                        document.querySelectorAll('.world-layer').forEach(el => el.style.filter = "none");

                        // ターゲットに適用
                        targets.forEach(el => {
                            el.style.filter = pDef.cssFilter || "none";
                        });
                        
                        // 2. オーバーレイ適用
                        ui.effect.style.opacity = 1;
                        ui.effect.style.backgroundColor = pDef.overlayColor || "transparent";
                        ui.effect.style.opacity = (pDef.overlayOpacity !== undefined) ? pDef.overlayOpacity : 0;
                        ui.effect.style.mixBlendMode = pDef.blendMode || "normal";
                        
                        // ★追加: UI除外ならオーバーレイをUIの後ろ(z-index: 15)へ、通常なら最前面(100)へ
                        // (Text Box は z-index: 20 なので、15なら後ろになる)
                        ui.effect.style.zIndex = pDef.excludeUI ? "15" : "100";

                        // プリセットごとの特殊背景
                        if (pDef.preset === 'crt') {
                            ui.effect.style.background = "linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))";
                            ui.effect.style.backgroundSize = "100% 2px, 2px 100%";
                        } 
                        else if (pDef.preset === 'darkness') {
                            ui.effect.style.background = "radial-gradient(circle, transparent 40%, #000 100%)";
                        }
                        else {
                            ui.effect.style.backgroundImage = "none";
                        }
                    }
                    // パーティクルタイプ
                    else if (pDef.spawnType === 'weather') {
                        const exists = activeEmitters.some(e => e.id === node.particleId);
                        if (!exists) {
                            activeEmitters.push({ id: node.particleId, ...pDef });
                        }
                    } else {
                        // 単発
                        if (isMapMode && mapEngine.player) {
                            const p = mapEngine.player;
                            const cx = p.x + p.w/2;
                            const cy = p.y + p.h/2;
                            spawnParticle(node.particleId, cx, cy, { z: (p.z||0) + 16 });
                        } else {
                            spawnParticle(node.particleId, window.innerWidth / 2, window.innerHeight / 2, { isScreenSpace: true });
                        }
                    }
                }
                // 3. 旧プリセット互換 (blood, spark)
                else {
                    if (isMapMode && mapEngine.player) {
                        const p = mapEngine.player;
                        const cx = p.x + p.w/2;
                        const cy = p.y + p.h/2;
                        spawnParticle(node.particleId, cx, cy, { z: (p.z||0) + 16 });
                    } else {
                        spawnParticle(node.particleId, window.innerWidth / 2, window.innerHeight / 2, { isScreenSpace: true });
                    }
                }
            }
            
            // 演出 (shake, flashなど)
            if(node.effect) { 
                if (node.effect.startsWith('encounter')) {
                    ui.effect.className = 'fx-' + node.effect;
                    setTimeout(() => ui.effect.className = '', 1500);
                }
                else if (node.effect.startsWith('flash') || node.effect.startsWith('fade')) { 
                    ui.effect.className = 'fx-' + node.effect; 
                    setTimeout(() => ui.effect.className = '', 1000); 
                } 
                else if (node.effect.startsWith('shake')) { 
                    ui.container.className = 'fx-' + node.effect; 
                    setTimeout(() => ui.container.className = '', 1000); 
                } 
            }
            
            currentNodeId = node.nextNodeId; 
            isWaitingForInput = true; 
            checkAuto();
        }
        window.processWaitNode = function(node) {
            ui.textBox.style.display = 'none'; 
            ui.choices.innerHTML = ''; 
            ui.overlay.style.display = 'none';
            
            // ★最適化: スキップ中は待機時間をほぼゼロ（10ms）にする
            const waitTime = isSkip ? 10 : (node.waitTime || 1.0) * 1000;
            
            // ★最適化: 待機中に連打されても進行しないようにロックをかける
            isWaitingForInput = false;
            
            // 待機中のセーブは安全性を考慮して一時的に防ぐか、そのままにするか（今回はそのまま進行）
            setTimeout(() => {
                // 万が一別のノードに強制ジャンプさせられていた場合は実行しない
                if (currentPlayingNodeId !== node.id && currentPlayingNodeId !== undefined) return;
                
                isProcessingNode = false;
                processNode(node.nextNodeId);
            }, waitTime);
        };

        // ★新機能: テキスト入力ノード処理 (初期値・キャンセル対応)
        window.processInputNode = function(node) {
            // 1. 背景の描画 (テキストノードと同じ処理)
            if (node.backgroundId && gameData.assets.backgrounds && gameData.assets.backgrounds[node.backgroundId]) { 
                const asset = gameData.assets.backgrounds[node.backgroundId]; 
                const target = activeBg===1 ? layers.bg2 : layers.bg1; 
                const old = activeBg===1 ? layers.bg1 : layers.bg2;
                target.style.display = 'block';
                if (asset.data.startsWith('data:video')) {
                    target.innerHTML = ''; 
                    const vid = document.createElement('video'); 
                    vid.src = asset.data; vid.autoplay = true; vid.loop = true; vid.muted = false; vid.playsInline = true; vid.className = 'bg-video';
                    target.appendChild(vid); target.style.backgroundImage = 'none';
                    animState.bg = { id: null, element: null, timer: 0, frame: 0 }; 
                } else { 
                    target.innerHTML = ''; target.style.backgroundImage = \`url('\${asset.data}')\`;
                    animState.bg = { id: node.backgroundId, element: target, timer: 0, frame: 0 }; 
                }
                old.style.opacity = 0; target.style.opacity = 1; 
                setTimeout(() => { 
                    const oldVid = old.querySelector('video');
                    if (oldVid) { oldVid.pause(); oldVid.removeAttribute('src'); oldVid.load(); }
                    old.innerHTML = ''; old.style.backgroundImage = 'none'; 
                }, 500); 
                activeBg = activeBg===1 ? 2 : 1; 
            }

            // 2. 2Dキャラ / 3. 3Dキャラ / 4. BGM の処理 (既存のまま維持...)
            layers.charaContainer.innerHTML=''; 
            animState.characters = []; 
            (node.characters||[]).forEach(c=>{ 
                if(!gameData.assets.characters || !gameData.assets.characters[c.characterId]) return; 
                const asset = gameData.assets.characters[c.characterId];
                let d; const s = (c.scale||100)/100; const posX = c.x || 0; const posY = c.y || 0;
                if ((asset.cols||1) > 1 || (asset.rows||1) > 1) {
                    d = document.createElement('div'); d.className = 'sprite-char-div pos-'+(c.position||'bottom-center'); d.style.backgroundImage = \`url('\${asset.data}')\`;
                    const frameW = asset.width / asset.cols; const frameH = asset.height / asset.rows; 
                    d.style.width = frameW+'px'; d.style.height = frameH+'px'; 
                    d.style.backgroundSize = asset.width+'px '+asset.height+'px'; d.style.backgroundPosition = '0 0';
                    const isLoop = (c.loop !== undefined) ? c.loop : true;
                    animState.characters.push({ id: c.characterId, element: d, timer: 0, frame: 0, loop: isLoop }); 
                } else { 
                    d = document.createElement('img'); d.className = 'sprite-char-img pos-'+(c.position||'bottom-center'); 
                    d.src = asset.data;
                }
                d.style.transform='translateX(calc(-50% + '+posX+'px)) translateY('+posY+'px) scale('+s+')'; 
                setTimeout(()=>d.classList.add('loaded'),10); layers.charaContainer.appendChild(d);
            });
            if (threeHandler && threeHandler.hideAll) threeHandler.hideAll();
            if (node.characters3d && window.threeHandler) { 
                node.characters3d.forEach(c => { if(c.modelId) threeHandler.showModel(c.modelId, { posX:c.posX, posY:c.posY, posZ:c.posZ, rotX:c.rotX, rotY:c.rotY, rotZ:c.rotZ, scale:c.scale, animationId:c.animationId, expression: c.expression, loop: (c.loop !== undefined) ? c.loop : true }); }); 
            }
            if (node.bgmId) AudioManager.playBgm(node.bgmId, masterVolBgm);

            // --- 5. UIの初期化と配置 ---
            ui.textBox.style.display = 'none'; 
            ui.overlay.style.display = 'none';
            ui.choices.innerHTML = ''; 
            
            ui.choices.style.display = 'flex';
            ui.choices.style.flexDirection = 'column';
            ui.choices.style.alignItems = 'center';
            ui.choices.style.justifyContent = 'center';
            ui.choices.style.position = 'absolute';
            ui.choices.style.top = '50%';
            ui.choices.style.left = '50%';
            ui.choices.style.transform = 'translate(-50%, -50%)';
            ui.choices.style.width = '80%';
            ui.choices.style.maxWidth = '400px';
            ui.choices.style.height = 'auto';
            ui.choices.style.padding = '30px';
            ui.choices.style.background = 'rgba(0,0,0,0.85)';
            ui.choices.style.border = '2px solid #fff';
            ui.choices.style.borderRadius = '15px';
            ui.choices.style.boxShadow = '0 0 20px rgba(0,0,0,0.5)';
            ui.choices.style.zIndex = '150';
            ui.choices.style.pointerEvents = 'auto';

            const conf = node.inputConfig || {};
            if (node._failCount === undefined) node._failCount = 0;
            
            // メッセージ表示
            const msg = document.createElement('div');
            msg.style.color = '#fff';
            msg.style.marginBottom = '20px';
            msg.style.fontSize = '1.2em';
            msg.style.fontWeight = 'bold';
            
            let promptText = node.message ? replaceVariablesInText(node.message).replace(/<[^>]*>?/gm, '') : "入力してください";
            if (conf.retryLimit > 0 && node._failCount > 0) {
                msg.innerHTML = '<span style="color:#ff4d4f;">不正解です。残り ' + (conf.retryLimit - node._failCount) + ' 回</span>';
            } else {
                msg.textContent = promptText;
            }
            
            // 入力フィールド
            const inputField = document.createElement('input');
            inputField.type = (conf.typeLimit === 'number') ? 'number' : 'text';
            inputField.maxLength = conf.maxLength || 10;
            inputField.style.width = '100%';
            inputField.style.padding = '12px';
            inputField.style.fontSize = '1.3em';
            inputField.style.borderRadius = '8px';
            inputField.style.border = 'none';
            inputField.style.textAlign = 'center';
            inputField.style.marginBottom = '20px';
            inputField.style.backgroundColor = '#fff';
            inputField.style.color = '#000';
            
            // ★追加: エディタで指定された「初期値」を解決してセットする
            if (conf.initialValue) {
                inputField.value = String(resolveValue(conf.initialValue));
            }
            
            // 決定ボタン
            const submitBtn = document.createElement('button');
            submitBtn.textContent = conf.btnText || "決定";
            submitBtn.className = "choice-button"; 
            submitBtn.style.width = '100%';
            
            ui.choices.append(msg, inputField, submitBtn); 
            
            // ★追加: キャンセルボタン（設定されている場合のみ表示）
            if (conf.cancelText) {
                const cancelBtn = document.createElement('button');
                cancelBtn.textContent = conf.cancelText;
                cancelBtn.className = "choice-button"; 
                cancelBtn.style.width = '100%';
                cancelBtn.style.marginTop = '10px';
                cancelBtn.style.backgroundColor = 'transparent';
                cancelBtn.style.border = '1px solid #aaa';
                cancelBtn.style.color = '#aaa';
                cancelBtn.onclick = () => {
                    if (submitBtn.disabled) return;
                    submitBtn.disabled = true;
                    inputField.disabled = true;
                    ui.choices.innerHTML = '';
                    ui.choices.style.display = 'none';
                    node._failCount = 0;
                    processNode(conf.nextCancelId); // キャンセル先へ
                };
                ui.choices.appendChild(cancelBtn);
            }
            
            // 確定処理
            const submitAction = () => {
                if (submitBtn.disabled) return;
                
                let val = inputField.value.trim();
                if (!val && !conf.allowEmpty) {
                    inputField.style.border = "2px solid #ff4d4f"; // エラーを視覚的に伝える
                    inputField.placeholder = "入力必須です";
                    inputField.style.transition = "transform 0.05s ease-in-out"; // ★修正: アニメーションを滑らかにする
                    inputField.style.transform = "translateX(5px)";
                    setTimeout(() => inputField.style.transform = "translateX(-5px)", 50);
                    setTimeout(() => inputField.style.transform = "translateX(0)", 100);
                    return; 
                }
                submitBtn.disabled = true;
                inputField.disabled = true;
                
                backLog.push({name: 'システム', text: '入力結果: 「' + (val || '(空欄)') + '」', type: 'text'});
                if (backLog.length > 100) backLog.shift();

                const targetVar = conf.targetVar || '$name';
                let finalVal = val;
                if (conf.typeLimit === 'number') {
                    finalVal = Number(val);
                    if (isNaN(finalVal)) finalVal = 0;
                }

                if (targetVar.startsWith('$')) { playerState[targetVar] = finalVal; }
                else { gameState[targetVar] = finalVal; }
                
                if (typeof updateHUD === 'function') updateHUD();
                if (targetVar === '$level' || targetVar === '$exp') {
                    if (typeof recalculatePlayerStats === 'function') recalculatePlayerStats();
                }
                
                const correctAns = conf.correctAnswer ? String(resolveValue(conf.correctAnswer)).trim() : "";
                
                if (correctAns === "" || val === correctAns) {
                    ui.choices.innerHTML = '';
                    ui.choices.style.display = 'none'; 
                    node._failCount = 0; 
                    processNode(conf.nextSuccessId);
                } else {
                    node._failCount++;
                    if (conf.retryLimit > 0 && node._failCount >= conf.retryLimit) {
                        ui.choices.innerHTML = '';
                        ui.choices.style.display = 'none';
                        node._failCount = 0;
                        // ★修正: 失敗時の遷移先がない場合は終了として扱う
                        if (conf.nextFailId) {
                            processNode(conf.nextFailId);
                        } else {
                            isProcessingNode = false; 
                        }
                    } else {
                        processInputNode(node); // 再試行
                    }
                }
            };
            
            submitBtn.onclick = submitAction;
            inputField.onkeydown = (e) => { if (e.key === 'Enter') submitAction(); };
            setTimeout(() => inputField.focus(), 150);
        };
// 選択肢表示処理 (修正: 横スクロール対応 + シンタックスエラー防止のためコメント削除)
        window.processChoice = function(node) {
            ui.textBox.style.display = 'none'; 
            ui.choices.innerHTML = ''; 
            ui.overlay.style.display = 'none';
            
            const s = gameData.settings || {};
            const n = node.uiStyle || {};
            
            let layout = 'center-v';
            if (n.override && (n.layout || n.direction)) {
                layout = n.layout || n.direction;
            } else {
                layout = (s.portraitUI && s.portraitUI.choiceLayout) ? s.portraitUI.choiceLayout : 'center-v';
            }

            let css = "position: absolute; z-index: 30; pointer-events: auto; transition: all 0.3s ease-out; display: flex; gap: 15px; box-sizing: border-box; padding: 10px; ";

            if (layout === 'center-h') {
                css += "top: 50%; left: 50%; transform: translate(-50%, -50%); width: 90%; max-height: 80%; flex-direction: row; justify-content: center; flex-wrap: wrap; overflow-y: auto; overflow-x: hidden;";
            } else if (layout === 'bottom-h') {
                css += "bottom: 40px; left: 0; width: 100%; max-height: 50%; flex-direction: row; justify-content: flex-start; flex-wrap: nowrap; align-items: flex-end; overflow-x: auto; overflow-y: hidden; padding-left: 20px; padding-right: 20px;";
            } else if (layout === 'top-h') {
                css += "top: 40px; left: 0; width: 100%; max-height: 50%; flex-direction: row; justify-content: flex-start; flex-wrap: nowrap; align-items: flex-start; overflow-x: auto; overflow-y: hidden; padding-left: 20px; padding-right: 20px;";
            } else if (layout === 'left-v') {
                css += "top: 0; left: 0; width: 30%; height: 100%; flex-direction: column; justify-content: center; align-items: flex-start; padding-left: 20px; overflow-y: auto;";
            } else if (layout === 'right-v') {
                css += "top: 0; right: 0; width: 30%; height: 100%; flex-direction: column; justify-content: center; align-items: flex-end; padding-right: 20px; overflow-y: auto;";
            } else if (layout === 'grid-2') {
                css += "top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80%; max-height: 80%; display: grid; grid-template-columns: 1fr 1fr; gap: 15px; align-content: center; overflow-y: auto;";
            } else if (layout === 'grid-3') {
                css += "top: 50%; left: 50%; transform: translate(-50%, -50%); width: 90%; max-height: 80%; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; align-content: center; overflow-y: auto;";
            } else if (layout === 'spread') {
                css += "top: 0; left: 0; width: 100%; height: 100%; display: grid; grid-template-columns: 1fr 1fr; align-content: space-between; padding: 60px; gap: 20px;";
            } else {
                css += "top: 50%; left: 50%; transform: translate(-50%, -50%); width: 60%; max-height: 80%; flex-direction: column; align-items: stretch; justify-content: center; overflow-y: auto;";
            }
            
            ui.choices.style.cssText = css;

            node.choices.forEach(function(c) {
                const b = document.createElement('div');
                b.className = 'choice-button';
                b.textContent = replaceVariablesInText(c.text);
                
                let btnStyle = createChoiceButtonStyle(node);
                btnStyle += " flex-shrink: 0;"; 
                b.style.cssText = btnStyle;

                b.onclick = function(e) {
                    e.stopPropagation(); 
                    userInteraction(); 
                    
                    if (c.action === 'load') {
                        if (typeof openLoadMenu === 'function') openLoadMenu('load');
                    } else if (c.action === 'save') {
                        if (typeof openSaveLoadModal === 'function') {
                            openSaveLoadModal('save');
                        }
                        backLog.push({text: c.text, type: 'choice'});
                        if (backLog.length > 100) backLog.shift();
                        processNode(c.nextNodeId);
                    } else if (c.action === 'title') {
                        location.reload();
                    } else if (c.action === 'url') {
                        if(c.url) window.open(c.url, '_blank');
                    } else {
                        backLog.push({text: c.text, type: 'choice'});
                        if (backLog.length > 100) backLog.shift();
                        processNode(c.nextNodeId);
                    }
                };
                
                ui.choices.appendChild(b);
            });
        };

function processVariable(node) {
            if (node.operations && Array.isArray(node.operations)) {
                node.operations.forEach(function(op) {
                    const val = resolveValue(op.value); 
                    const opVal = !isNaN(val) ? Number(val) : val;
                    
                    let targetKey = op.targetVariable; 
                    
                    // --- ★追加: エネミーのステータス操作 ---
                    if (op.type === 'enemy') {
                        const targetEid = op.targetEnemyId;
                        if (!targetEid || !targetKey) return;

                        const applyToEnemy = (tObj) => {
                            let cur = tObj[targetKey];
                            if (!isNaN(cur)) cur = Number(cur); else cur = 0;
                            
                            if (op.operator === '=') tObj[targetKey] = opVal;
                            else if (op.operator === '+=') tObj[targetKey] = cur + opVal;
                            else if (op.operator === '-=') tObj[targetKey] = cur - opVal;
                            else if (op.operator === '*=') tObj[targetKey] = cur * opVal;
                            else if (op.operator === '/=') tObj[targetKey] = (opVal !== 0) ? (cur / opVal) : 0;

                            // HPを操作した場合は、内部用のランタイムHPにも同期させて見た目(HPバー等)に反映させる
                            if (targetKey === 'hp') {
                                tObj._runtimeHp = tObj[targetKey];
                                if (tObj._runtimeHp <= 0 && tObj.destructible !== false) {
                                    tObj._isDead = true; // HPを0にされたら死ぬ
                                    if (typeof showDamagePopup === 'function') showDamagePopup(tObj, "DOWN", 'system');
                                }
                            }
                            
                            // 戦闘中のエフェクト用 (ボスがオーラを纏うなどの演出用フラグとしても使える)
                            tObj._dmgVisualTimer = 30;
                        };

                        // 1. マップモード(アクション戦闘)にいる場合
                        if (isMapMode && mapEngine && mapEngine.activeObjects) {
                            mapEngine.activeObjects.forEach(o => {
                                if (o.roleType === 'enemy' && o.enemyId === targetEid && !o._isDead) {
                                    applyToEnemy(o);
                                    if(gameState.showDamageText === 'on') showDamagePopup(o, "BUFF/DEBUFF", 'system');
                                }
                            });
                        }
                        
                        // 2. ターン制バトル中にいる場合
                        if (typeof battleState !== 'undefined' && battleState && !battleState.isOver) {
                            battleState.enemies.forEach(e => {
                                if (e.id === targetEid && !e.isDead) {
                                    applyToEnemy(e);
                                    if(gameState.showDamageText === 'on') showDamagePopup(e, "BUFF/DEBUFF", 'system');
                                }
                            });
                            updateBattleStatus(); // UI更新
                        }
                        return; // エネミー処理はここで終わり、次の操作へ
                    }
                    // ----------------------------------------

                    // --- 既存のゲーム変数・プレイヤー変数操作 ---
                    let targetObj = gameState; 
                    if (op.type === 'player' || (targetKey && targetKey.startsWith('$'))) {
                        targetObj = playerState;
                    }
                    
                    if (targetKey) {
                        if (op.type !== 'player' && targetObj[targetKey] === undefined) targetObj[targetKey] = 0;
                        
                        let cur = targetObj[targetKey]; 
                        if (!isNaN(cur)) cur = Number(cur); 
if (op.operator === '=') targetObj[targetKey] = opVal;
                        else if (op.operator === '+=') targetObj[targetKey] = cur + opVal;
                        else if (op.operator === '-=') targetObj[targetKey] = cur - opVal;
                        else if (op.operator === '*=') targetObj[targetKey] = cur * opVal;
                        else if (op.operator === '/=') targetObj[targetKey] = (opVal !== 0) ? (cur / opVal) : 0;
                        
                        // --- ★追加: アイテムのインベントリ操作だった場合の特別処理 ---
                        if (targetObj === playerState && targetKey === 'inventory') {
                            // 実際には変数操作で inventory 辞書全体をいじるのは想定外だが、念のためガード
                        } else if (targetObj === playerState && targetKey.startsWith('inventory.')) {
                            // inventory.item_id のような記法でアイテムを増やした場合の処理
                        } else if (targetObj === playerState.inventory) {
                            // もしUI側で playerState.inventory を直接対象にできるようになった場合の処理
                            // (現在は gameState または playerState の直下を対象としている)
                        } else if (op.type === 'player' && targetKey.startsWith('inv_')) {
                            // ★推奨される運用: プレイヤー変数として "inv_アイテムID" を操作した場合
                            const itemId = targetKey.replace('inv_', '');
                            const itemDef = gameData.items[itemId];
                            
                            if (itemDef) {
                                // 1. インベントリの初期化
                                if (!playerState.inventory) playerState.inventory = {};
                                
                                // 2. 現在の所持数と上限の確認
                                const currentQty = playerState.inventory[itemId] || 0;
                                const maxStack = (itemDef.maxStack !== undefined) ? itemDef.maxStack : 99;
                                
                                // 3. 実際の計算結果（この操作でいくつになったか）
                                let newQty = targetObj[targetKey];
                                
                                // 4. 上限・下限の適用
                                if (newQty < 0) newQty = 0;
                                if (newQty > maxStack) {
                                    newQty = maxStack;
                                    targetObj[targetKey] = maxStack; // 変数自身も切り詰める
                                }
                                
                                // 5. 増減量の算出とポップアップ表示
const diff = newQty - currentQty;
                                if (diff > 0) {
                                    if (typeof showDamagePopup === 'function') {

                                        showDamagePopup(mapEngine.player, \`GET: \${itemDef.name} x\${diff}\`, 'item');
                                    }
                                    if (itemDef.effects && itemDef.effects.sound) {
                                        AudioManager.playSe(itemDef.effects.sound, masterVolSe);
                                    }
                                } else if (diff < 0) {
                                    if (typeof showDamagePopup === 'function') {

                                        showDamagePopup(mapEngine.player, \`LOST: \${itemDef.name} \${diff}\`, 'system');
                                    }
                                }
                                // 6. インベントリに実データを反映
                                playerState.inventory[itemId] = newQty;
                                if (newQty === 0) delete playerState.inventory[itemId];
                            }
                        }
                        // -------------------------------------------------------------

                        // タイマー処理
                        else if (op.operator === 'auto+' || op.operator === 'auto-') {
                            if (!gameState._sys_timers) gameState._sys_timers = {};
                            const timerKey = op.type + '_' + targetKey;
                            gameState._sys_timers[timerKey] = { 
                                type: op.type, 
                                key: targetKey, 
                                speed: opVal, 
                                dir: (op.operator === 'auto+') ? 1 : -1, 
                                limit: op.timerLimit, 
                                nextNode: op.timerNextNodeId 
                            };
                        } else if (op.operator === 'stop') { 
                            if (gameState._sys_timers) delete gameState._sys_timers[op.type + '_' + targetKey]; 
                        }
                        
                        // プレイヤーパラメータの制限
                        if (op.type === 'player') {
                            if (targetKey === '$hp') { 
                                if (playerState.$hp > playerState.$maxHp) playerState.$hp = playerState.$maxHp; 
                                if (playerState.$hp < 0) playerState.$hp = 0; 
                            }
                            if (targetKey === '$spd' && playerState.$spd < 0) playerState.$spd = 0;
                        }
                    }
                });
            }

            // ★修正: HPが0になったらゲームオーバー判定を行う (共通設定対応版)
            if (playerState.$hp <= 0 && !playerState._isDeadTriggered) {
                
                // 1. マップ固有の設定を取得
                const currentMap = gameData.maps[mapEngine.currentMapId];
                let targetNodeId = currentMap ? currentMap.gameoverEventNodeId : null;
                
                // 2. マップ設定がなければ、共通設定(グローバル)を使用
                if (!targetNodeId) {
                    const s = gameData.settings || {};
                    targetNodeId = s.globalGameoverNodeId;
                }

                // 飛び先があれば実行
                if (targetNodeId) {
                    playerState._isDeadTriggered = true;
                    // 変数操作の次のノードへ行く予約をキャンセルして、ゲームオーバーへ飛ばす
                    setTimeout(() => {
                        isProcessingNode = false;
                        if (isMapMode) endMapMode(); // マップモードなら終了
                        processNode(targetNodeId);
                    }, 0);
                    return; // ここで処理を打ち切り、下の通常遷移を実行させない
                }
            }

            // 通常の遷移処理
            setTimeout(() => {
                isProcessingNode = false; // 強制ロック解除
                processNode(node.nextNodeId);
            }, 0);
        }

function processConditional(node) {
            let jumped = false;
            let nextId = null;
            
            for (const cond of node.conditions) {
                if (evaluateCondition(cond)) {
                    nextId = cond.nextNodeId;
                    jumped = true;
                    break;
                }
            }
            
            if (!jumped) {
                nextId = node.elseNextNodeId;
            }

            // ★修正: 非同期で次のノードへ遷移
            if (nextId) {
                setTimeout(() => {
                    isProcessingNode = false; // 強制ロック解除
                    processNode(nextId);
                }, 0);
            } else {
                // 行き先がない場合はロックだけ解除しておく（詰み防止）
                isProcessingNode = false;
            }
        }
function processUIControl(node) {
    // 古いデータ互換コードは削除済み。シンプルに配列を取得。
    const operations = node.uiOperations || [];

    operations.forEach(function(op) {
        const type = op.type;

        if (type === 'crosshair') {
            // --- クロスヘア（照準） ---
            ui.hudCrosshair.style.display = (op.switchVal === 'on') ? 'block' : 'none';
            
            if (op.switchVal === 'on') {
                // ★修正: ここではタイプを 'auto' に設定し、
                // 実際の描画時(updateHUD)にマップに合わせて形状を決定させる
                hudElements['crosshair'] = { 
                    type: 'auto', 
                    range: op.range || '100', 
                    width: op.width || '50',
                    lockon: !!op.lockon, 
                    lockonType: op.lockonType || 'attack' 
                }; 
            } else {
                delete hudElements['crosshair'];
            }

        } else if (type === 'radar') {
            // --- レーダー ---
            ui.hudRadar.style.display = (op.switchVal === 'on') ? 'block' : 'none';
            if (op.switchVal === 'on') {
                hudElements['radar'] = {
                    range: op.radarRange || '10'
                };
            } else {
                delete hudElements['radar'];
            }

        } else if (type === 'menuButton') {
            // --- メニューボタン ---
            const btn = document.getElementById('hud-menu-btn');
            if (btn) {
                btn.style.display = (op.switchVal === 'on') ? 'flex' : 'none';
            }

        } else if (type === 'damageText') {
            // --- ダメージテキスト ---
            gameState.showDamageText = op.switchVal || 'on';

        } else if (type === 'remove') {
            // --- 要素削除 ---
            const id = op.elemId;
            if (hudElements[id]) {
                const el = document.getElementById('hud-el-' + id);
                if (el) el.remove();
                delete hudElements[id];
            }

        } else if (type === 'text') {
            // --- テキスト表示 ---
            const id = op.elemId;
            document.getElementById('hud-el-' + id)?.remove();
            
            const div = document.createElement('div');
            div.id = 'hud-el-' + id;
            div.className = 'hud-element';
            div.style.left = op.posX + '%';
            div.style.top = op.posY + '%';
            
            // HTMLとして解釈させる（Quillのリッチテキスト対応）
            div.innerHTML = op.textContent || '';
            
            ui.hudContainer.appendChild(div);
            hudElements[id] = { type: 'text', content: op.textContent };

        } else if (type === 'gauge') {
            // --- ゲージ表示 ---
            const id = op.elemId;
            document.getElementById('hud-el-' + id)?.remove();
            
            const div = document.createElement('div');
            div.id = 'hud-el-' + id;
            div.className = 'hud-element';
            div.style.left = op.posX + '%';
            div.style.top = op.posY + '%';
            
            const label = op.gaugeLabel || '';
            div.innerHTML = '<div class="hud-bar-text" style="font-size:0.8em; margin-bottom:2px;">' + label + '</div><div class="hud-bar-bg"><div class="hud-bar-fill" style="background:' + op.color + '"></div></div>';
            
            ui.hudContainer.appendChild(div);
            hudElements[id] = { type: 'gauge', curKey: op.gaugeCur, maxKey: op.gaugeMax, label: label };
        }
    });

    // 次のノードへ進む
    setTimeout(() => {
        isProcessingNode = false;
        processNode(node.nextNodeId);
    }, 0);
}

function processShop(node) {
            // --- 1. 背景変更 ---
            if (node.backgroundId && gameData.assets.backgrounds && gameData.assets.backgrounds[node.backgroundId]) {
                const asset = gameData.assets.backgrounds[node.backgroundId];
                const target = activeBg === 1 ? layers.bg2 : layers.bg1;
                const old = activeBg === 1 ? layers.bg1 : layers.bg2;
                target.style.backgroundImage = 'url(' + asset.data + ')';
                target.style.opacity = 1; 
                old.style.opacity = 0;
                activeBg = activeBg === 1 ? 2 : 1;
            }
            
            // --- 2. BGM変更 ---
    let prevBgm = AudioManager._bgmId;
    if (node.bgmId) {
        AudioManager.playBgm(node.bgmId, masterVolBgm);
    }

            // --- 3. UI要素の取得 ---
            const overlay = document.getElementById('shop-overlay');
            
            // ★修正1: 背景色を濃くして、後ろの画面が見えにくくする (0.1 -> 0.9)
            overlay.style.backgroundColor = 'rgba(0,0,0,0.9)';
            
            const container = document.getElementById('shop-items-container');
            const moneyDisplay = document.getElementById('shop-money-display');
            const currencyVar = node.currencyVar || 'money';
            
            // 設定: 詳細表示モードか (デフォルトtrue)
            const s = gameData.settings || {};
            const isDetailed = (s.shopDetailed !== false);

            // 所持金変数の初期化
            if (gameState[currencyVar] === undefined || gameState[currencyVar] === null) {
                gameState[currencyVar] = 0;
            }
            
            // 所持金表示更新関数
            const updateMoney = function() {
                moneyDisplay.textContent = Math.floor(Number(gameState[currencyVar]) || 0);
            };
            updateMoney();

            // コンテナのリセット
            container.innerHTML = '';
            
            // レイアウト切り替え
            if (isDetailed) {
                container.style.gridTemplateColumns = '1fr'; // リスト表示
            } else {
                container.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))'; // タイル表示
            }

            // --- 4. 商品リストの生成 ---
            const shopItems = node.shopItems || [];
            
            shopItems.forEach(function(itemId) {
                const item = gameData.items[itemId];
                if (!item) return;
                
                const card = document.createElement('div');
                card.style.cssText = 'background:rgba(255,255,255,0.1); border:1px solid #fff; border-radius:8px; padding:10px; display:flex; align-items:center; gap:15px; transition:background 0.2s; margin-bottom:5px;';
                
                // --- アイコン表示 ---
                const icon = document.createElement('div');
                icon.style.minWidth = '50px';
                icon.style.textAlign = 'center';

                if (item.iconImage && gameData.assets.characters && gameData.assets.characters[item.iconImage]) {
                    const img = document.createElement('img');
                    img.src = gameData.assets.characters[item.iconImage].data;
                    img.style.cssText = 'width:60px; height:60px; object-fit:contain; border-radius:4px;';
                    icon.appendChild(img);
                } else {
                    icon.textContent = item.iconEmoji || '📦';
                    icon.style.fontSize = '2.5em';
                }
                
                // --- 情報エリア ---
                const info = document.createElement('div');
                info.style.flex = '1';
                
                let infoHtml = '<div style="font-weight:bold; font-size:1.2em;">' + item.name + '</div>';
                
                // 詳細モードなら説明文とステータスを追加
                if (isDetailed) {
                    if (item.description) {
                        infoHtml += '<div style="font-size:0.9em; color:#ccc; margin-top:2px;">' + item.description + '</div>';
                    }
                    
                    let statsHtml = '';
                    const fx = item.effects || {};
                    const styleTag = 'display:inline-block; background:#333; color:#fff; padding:2px 6px; border-radius:4px; font-size:0.8em; margin-right:4px; margin-top:4px; border:1px solid #555;';
                    
                    if(fx.atk) statsHtml += '<span style="' + styleTag + '">⚔️ ATK ' + (fx.atk>0?'+':'') + fx.atk + '</span>';
                    if(fx.def) statsHtml += '<span style="' + styleTag + '">🛡️ DEF ' + (fx.def>0?'+':'') + fx.def + '</span>';
                    if(fx.hp)  statsHtml += '<span style="' + styleTag + '">❤️ HP ' + (fx.hp>0?'+':'') + fx.hp + '</span>';
                    if(fx.ammo) statsHtml += '<span style="' + styleTag + '">🔫 弾 ' + (fx.ammo>0?'+':'') + fx.ammo + '</span>';
                    
                    if (statsHtml) {
                        infoHtml += '<div style="margin-top:5px;">' + statsHtml + '</div>';
                    }
                }
                
                info.innerHTML = infoHtml;
                
                // --- 購入ボタン ---
                const priceBtn = document.createElement('button');
                priceBtn.className = 'sys-btn';
                priceBtn.style.minWidth = '100px';
                priceBtn.style.height = 'auto';
                
                const price = (item.price !== undefined && item.price !== null) ? parseInt(item.price) : 100;
                
                let currentStock = 0;
                if (playerState.inventory && playerState.inventory[itemId]) {
                    currentStock = playerState.inventory[itemId];
                }
                
                priceBtn.innerHTML = '購入<br>💰' + price + '<br><span style="font-size:0.8em">所持: ' + currentStock + '</span>';
                
                priceBtn.onclick = function() {
                    const currentMoney = Number(gameState[currencyVar]) || 0;
                    
                    // --- 所持上限チェック ---
                    if (!playerState.inventory) playerState.inventory = {};
                    const nowStock = playerState.inventory[itemId] || 0;
                    const maxStack = (item.maxStack !== undefined) ? item.maxStack : 99;

                    if (nowStock >= maxStack) {
                        const originalText = priceBtn.innerHTML;
                        priceBtn.textContent = "所持上限!";
                        priceBtn.style.borderColor = "#faad14";
                        priceBtn.style.color = "#faad14";
                        setTimeout(function() {
                            priceBtn.innerHTML = originalText;
                            priceBtn.style.borderColor = "";
                            priceBtn.style.color = "";
                        }, 1000);
                        return;
                    }
                    
                    // お金チェック
                    if (currentMoney >= price) {
                        gameState[currencyVar] = currentMoney - price;
                        updateMoney();
                        
                        playerState.inventory[itemId] = nowStock + 1;
                        
                        priceBtn.innerHTML = '購入<br>💰' + price + '<br><span style="font-size:0.8em">所持: ' + (nowStock + 1) + '</span>';
                        
                        // SE再生
                        if (item.effects && item.effects.sound) {
                             AudioManager.playSe(item.effects.sound, masterVolSe);
                        }
                    } else {
                        const originalText = priceBtn.innerHTML;
                        priceBtn.textContent = "資金不足!";
                        priceBtn.style.borderColor = "#ff4d4f";
                        priceBtn.style.color = "#ff4d4f";
                        setTimeout(function() {
                            priceBtn.innerHTML = originalText;
                            priceBtn.style.borderColor = "";
                            priceBtn.style.color = "";
                        }, 1000);
                    }
                };

                
                card.appendChild(icon);
                card.appendChild(info);
                card.appendChild(priceBtn);
                container.appendChild(card);
            });

            // --- 5. 画面表示 ---
            overlay.style.display = 'flex';
            
            // ★修正2: ショップ表示中はシステムメニューを隠す
            const sysMenu = document.getElementById('system-menu');
            if (sysMenu) sysMenu.style.display = 'none';
            
            const leaveBtn = document.getElementById('shop-leave-btn');
            leaveBtn.onclick = function() {
                overlay.style.display = 'none';
                
                if (sysMenu) sysMenu.style.display = 'flex';
                
                // ★追加: BGMを元に戻す
                if (node.bgmId) {
                    if (isMapMode && mapEngine.data && mapEngine.data.bgmId) {
                        AudioManager.playBgm(mapEngine.data.bgmId, masterVolBgm);
                    } else if (prevBgm) {
                        AudioManager.playBgm(prevBgm, masterVolBgm);
                    } else {
                        AudioManager.stopBgm();
                    }
                }
                
                processNode(node.nextNodeId);
            };
        }

        // --- Map Functions ---
function checkMapEvents(p, isActionPressed) {
            if(mapEngine.eventCooldown > 0) return;

            const grid = mapEngine.GRID; 
            const expand = 1;
            
            // プレイヤーの判定範囲
            const pRect = { 
                x: p.x - expand, y: p.y - expand, 
                w: p.w + expand*2, h: p.h + expand*2 
            };

            const hitObj = mapEngine.activeObjects.find(function(o) { 
                if (!o.hasEvent) return false; 
                if (!checkCondition(o)) return false;

                // オブジェクトの座標とサイズ
                const ox = (o.currentX !== undefined) ? o.currentX : o.x * grid; 
                const oy = (o.currentY !== undefined) ? o.currentY : o.y * grid; 
                const oW = o.w || grid;
                const oH = o.h || grid;
                
                // ★修正: サイズ対応の判定範囲
                const oRect = { x: ox, y: oy, w: oW, h: oH };

                // A. 接触判定 (checkCollisionを使用)
                const isOverlapping = checkCollision(pRect, oRect);
                
                // B. Z軸（高さ）の判定
                const oz = o.z || 0; 
                const pz = p.z || 0;
                if (isOverlapping && Math.abs(pz - oz) > grid) return false;
// 1. 接触イベント
                if (o.eventTrigger === 'touch') {
                    return isOverlapping;
                }

                // 2. 調べるイベント
                if (o.eventTrigger === 'action' && isActionPressed) {
                    if (isOverlapping) return true;

                    // 目の前にあるか判定
                    const reach = grid * 0.8;
                    const dirX = Math.cos(p.dir);
                    const dirY = Math.sin(p.dir);
                    const checkX = (p.x + p.w/2) + dirX * reach;
                    const checkY = (p.y + p.h/2) + dirY * reach;
                    
                    // ★追加: 調べる先のZ座標(高さ)も考慮する
                    // プレイヤーの頭の高さから、足元より少し下までの範囲にあるものだけ調べられる
                    const pZTop = pz + p.h;
                    const pZBottom = pz - (grid / 2); 
                    const oZTop = oz + oH;
                    
                    // 調べた先の点がオブジェクトの矩形内にあり、かつ高さが届く範囲にあるか
                    if (checkX > oRect.x && checkX < oRect.x + oRect.w && 
                        checkY > oRect.y && checkY < oRect.y + oRect.h) {
                        
                        if (oZTop >= pZBottom && oz <= pZTop) {
                            return true;
                        }
                    }
                }
                return false;
            });

            if (hitObj) { 
                const counterKey = '_sys_evt_' + hitObj.id; 
                if (gameState[counterKey] === undefined) gameState[counterKey] = 0; 
                let count = gameState[counterKey]; 
                
                let eventList = hitObj.eventList || [{nodeId: hitObj.eventNodeId}]; 
                let targetNodeId = null; 
                
                if (hitObj.eventRepeat === 'once') { 
                    if (count === 0) targetNodeId = eventList[0].nodeId; 
                } else if (hitObj.eventRepeat === 'loop') { 
                    targetNodeId = eventList[count % eventList.length].nodeId; 
                } else if (hitObj.eventRepeat === 'stick') {
                    const idx = Math.min(count, eventList.length - 1); 
                    targetNodeId = eventList[idx].nodeId; 
                }
                
                if (targetNodeId) { 
                    gameState[counterKey]++; 
                    mapEngine.eventCooldown = 60; // 1秒間イベント再発火禁止
                    
                    // ★最適化: 会話無限ループ防止（接触イベントの場合、一瞬だけプレイヤーを押し戻して重なりを解除する）
                    if (hitObj.eventTrigger === 'touch') {
                        // プレイヤーの向いている方向と逆（あるいは中心からのベクトル）へ弾く
                        const pushBack = grid / 4;
                        if (mapEngine.data.type === 'side') {
                            p.x += (p.vx > 0) ? -pushBack : pushBack;
                        } else {
                            p.x -= Math.cos(p.dir) * pushBack;
                            p.y -= Math.sin(p.dir) * pushBack;
                        }
                    }
                    
                    p.vx = 0; p.vy = 0;
                    processNode(targetNodeId); 
                } 
            }
        }

       function isCrushWall(x, y, map) {
            const grid = mapEngine.GRID;
            const p = mapEngine.player;
            // プレイヤーの判定矩形 (少し小さめにして、かすった程度では死なないようにする)
            const margin = 6; 
            const pL = x + margin;
            const pR = x + p.w - margin;
            const pT = y + margin;
            const pB = y + p.h - margin;

            // 1. マップ範囲外チェック (Clampモード時のみ)
            if (map.edgeType !== 'loop') {
                const mapPixelW = map.width * grid;
                const mapPixelH = map.height * grid;
                if (pL < 0 || pR > mapPixelW) return true;
                if (map.type !== 'side') {
                    if (pT < 0 || pB > mapPixelH) return true;
                }
            }

            // 2. オブジェクトとの重なり判定
            return !!mapEngine.activeObjects.find(function(o) { 
                // 壁属性がない、または条件を満たしていないものは無視
                if (!o.isWall) return false;
                if (typeof checkCondition === 'function' && !checkCondition(o)) return false;
                
                // オブジェクトの現在位置を取得
                const ox = (o.currentX !== undefined) ? o.currentX : o.x * grid;
                const oy = (o.currentY !== undefined) ? o.currentY : o.y * grid;
                const oW = o.w || grid;
                const oH = o.h || grid;
                
                // 3D/Sideでの高さ判定 (Z軸)
                if (Math.abs((p.z || 0) - (o.z || 0)) >= grid) return false;

                // AABB衝突判定 (矩形同士が重なっているか)
                return (pL < ox + oW && pR > ox && pT < oy + oH && pB > oy);
            });
        }
function updateObjectMovement(obj, dt, timeScale) {
    if ((!obj.moveType || obj.moveType === 'fixed') && (!obj.onSightBehavior || obj.onSightBehavior === 'normal')) {
        return;
    }

    const grid = mapEngine.GRID;
    const p = mapEngine.player;

    if (obj.currentX === undefined) {
        obj.currentX = obj.x * grid;
        obj.currentY = obj.y * grid;
        obj.startX = obj.currentX;
        obj.startY = obj.currentY;
        obj.moveTimer = 0;
        obj.dirX = 1;
        obj.dirY = 0;
    }

    const speedVal = (obj.spd !== undefined) ? Number(resolveValue(obj.spd)) : 2;
    const speed = speedVal * timeScale;
    let activeMoveType = obj.moveType;
    let isFleeing = false;

    // 視線検知AI
    if (obj.roleType === 'enemy' && obj.onSightBehavior && obj.onSightBehavior !== 'normal') {
        const ox = obj.currentX + (obj.w || grid) / 2;
        const oy = obj.currentY + (obj.h || grid) / 2;
        const px = p.x + p.w / 2;
        const py = p.y + p.h / 2;
        const angleToEnemy = Math.atan2(oy - py, ox - px);
        
        let angleDiff = p.dir - angleToEnemy;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;

        const fov = Math.PI / 2; 
        if (Math.abs(angleDiff) < fov / 2) {
            if (obj.onSightBehavior === 'freeze') return; 
            else if (obj.onSightBehavior === 'aggressive') activeMoveType = 'chase'; 
            else if (obj.onSightBehavior === 'flee') {
                isFleeing = true;
                const fleeAngle = angleToEnemy;
                // ★修正: 逃げる時も壁判定を行う
                const nx = obj.currentX + Math.cos(fleeAngle) * speed;
                const ny = obj.currentY + Math.sin(fleeAngle) * speed;
                if (!getTerrainCollision(nx, obj.currentY, obj.z||0, obj.w||grid, obj.h||grid, obj).hitWall) obj.currentX = nx;
                if (!getTerrainCollision(obj.currentX, ny, obj.z||0, obj.w||grid, obj.h||grid, obj).hitWall) obj.currentY = ny;
            }
        }
    }
    
    if (isFleeing) return;

    // 距離計算と状態判定
    const pdx = (p.x + p.w / 2) - (obj.currentX + (obj.w || grid) / 2);
    const pdy = (p.y + p.h / 2) - (obj.currentY + (obj.h || grid) / 2);
    const distP_sq = pdx * pdx + pdy * pdy;

    const hdx = obj.currentX - obj.startX;
    const hdy = obj.currentY - obj.startY;
    const distH_sq = hdx * hdx + hdy * hdy;

    const detectR = (obj.detectionRange > 0) ? (obj.detectionRange * grid) : 999999;
    const terriR = (obj.territoryRange > 0) ? (obj.territoryRange * grid) : 999999;

    if (!obj.isReturning && distH_sq > terriR * terriR) obj.isReturning = true;
    if (obj.isReturning && distH_sq < (grid / 2) * (grid / 2)) {
        obj.isReturning = false;
        obj.currentX = obj.startX;
        obj.currentY = obj.startY;
    }

    let isActive = true;
    if (!obj.isReturning && obj.detectionRange > 0) {
        if (distP_sq > detectR * detectR && activeMoveType !== 'chase') isActive = false;
    }

    if (obj.isReturning) {
        const angle = Math.atan2(-hdy, -hdx);
        // ★修正: 帰宅時も壁をすり抜けないようにする
        const nx = obj.currentX + Math.cos(angle) * speed;
        const ny = obj.currentY + Math.sin(angle) * speed;
        if (!getTerrainCollision(nx, ny, obj.z||0, obj.w||grid, obj.h||grid, obj).hitWall) {
            obj.currentX = nx;
            obj.currentY = ny;
        }
        return;
    }

    if (!isActive) return;

    const range = (obj.moveRange || 3) * grid;
    const startX = obj.startX;
    const startY = obj.startY;
    const objW = obj.w || grid;
    const objH = obj.h || grid;
    const objZ = obj.z || 0;


    if (activeMoveType === 'horizontal') {
        let nextX = obj.currentX + speed * obj.dirX;
        let col = getTerrainCollision(nextX, obj.currentY, objZ, objW, objH, obj);
        if (col.hitWall || Math.abs(nextX - startX) > range) {
            obj.dirX *= -1; // 壁にぶつかるか範囲外で反転
        } else {
            obj.currentX = nextX;
        }
    } 
    else if (activeMoveType === 'vertical') {
        if (obj.dirY === 0) obj.dirY = 1;
        let nextY = obj.currentY + speed * obj.dirY;
        let col = getTerrainCollision(obj.currentX, nextY, objZ, objW, objH, obj);
        if (col.hitWall || Math.abs(nextY - startY) > range) {
            obj.dirY *= -1;
        } else {
            obj.currentY = nextY;
        }
    } 
    else if (activeMoveType === 'random') {
        obj.moveTimer += dt;
        if (obj.moveTimer > 1000) {
            obj.moveTimer = 0;
            const r = Math.random();
            if (r < 0.25) { obj.dirX = 1; obj.dirY = 0; } 
            else if (r < 0.5) { obj.dirX = -1; obj.dirY = 0; } 
            else if (r < 0.75) { obj.dirX = 0; obj.dirY = 1; } 
            else { obj.dirX = 0; obj.dirY = -1; }
        }
        let nextX = obj.currentX + speed * obj.dirX;
        let nextY = obj.currentY + speed * obj.dirY;
        
        let col = getTerrainCollision(nextX, nextY, objZ, objW, objH, obj);
        const inRange = Math.abs(nextX - startX) < range && Math.abs(nextY - startY) < range;

        if (inRange && !col.hitWall) {
            obj.currentX = nextX;
            obj.currentY = nextY;
        } else {
            obj.moveTimer = 1000; // ぶつかったら即座に向きを変える
        }
    } 
    else if (activeMoveType === 'chase') {
        let targetX = p.x;
        let targetY = p.y;
        
        if (obj.moveChaseId) {
            const targetObj = mapEngine.activeObjects.find(o => o.spawnId === obj.moveChaseId && !o._isDead);
            if (targetObj) {
                targetX = (targetObj.currentX !== undefined) ? targetObj.currentX : targetObj.x * grid;
                targetY = (targetObj.currentY !== undefined) ? targetObj.currentY : targetObj.y * grid;
            }
        }

        const dx = targetX - obj.currentX;
        const dy = targetY - obj.currentY;
        const distToTarget = Math.sqrt(dx * dx + dy * dy);
        
        let currentSpeed = speed;
        const atkRange = (obj.attackRange !== undefined) ? Number(resolveValue(obj.attackRange)) : 0;
        if (obj.aiPattern === 'kiting' && atkRange > grid) {
            if (distToTarget < atkRange * 0.7) currentSpeed = -speed * 0.7;
            else if (distToTarget < atkRange) currentSpeed = 0;
        }

        if (currentSpeed !== 0 && distToTarget > 0) {
            const nx = (dx / distToTarget) * currentSpeed;
            const ny = (dy / distToTarget) * currentSpeed;

            // ★修正: X軸とY軸を独立して判定することで、壁に沿って滑るように移動させる (Wall Sliding)
            let nextX = obj.currentX + nx;
            let nextY = obj.currentY + ny;
            
            if (!getTerrainCollision(nextX, obj.currentY, objZ, objW, objH, obj).hitWall) obj.currentX = nextX;
            if (!getTerrainCollision(obj.currentX, nextY, objZ, objW, objH, obj).hitWall) obj.currentY = nextY;
        }
    }

    // 重力処理 (Sideビュー用)
    const mapEngineRef = (typeof mapEngine !== 'undefined') ? mapEngine : window.mapEngine;
    if (mapEngineRef && mapEngineRef.data.type === 'side' && !obj.isHitbox && obj.moveType !== 'fixed' && obj.roleType !== 'deco' && !obj.isWall && !obj.isPlayer) {
        if (obj.vy === undefined) obj.vy = 0;
        obj.vy += 0.4 * timeScale; 
        if (obj.vy > 16) obj.vy = 16;
        
        let nextY = obj.currentY + obj.vy * timeScale;
        let col = getTerrainCollision(obj.currentX, nextY, objZ, objW, objH, obj);
        
        if (col.hitWall && obj.vy > 0) {
            obj.vy = 0;
            // 足元を床に合わせる
            obj.currentY = col.floorZ > 0 ? col.floorZ - objH : nextY; 
        } else {
            obj.currentY = nextY;
        }
    }
}

function drawSpriteAnimation(ctx, obj, drawX, drawY, drawW, drawH, zoom, isFlip = false) {
    let useCharId = obj.charId;
    
    // プレイヤーの画像切り替え判定
    if (obj.isPlayer) {
        const pData = gameData.player || {};
        const p = mapEngine.player;
        useCharId = playerState.imageId || pData.imageId;
        if (p.invincible > 40) useCharId = playerState.imageIdDamage || pData.imageIdDamage || useCharId;
        else if (p.attackCooldown > 5) useCharId = playerState.imageIdAttack || pData.imageIdAttack || useCharId;
        else if ((Math.abs(p.vx) > 0.1 || Math.abs(p.vy) > 0.1)) useCharId = playerState.imageIdMove || pData.imageIdMove || useCharId;
    } 
    // 敵やオブジェクトの画像切り替え判定
    else {
        if (obj._dmgVisualTimer > 0 && obj.charIdDamage) useCharId = obj.charIdDamage;
        else if (obj._atkVisualTimer > 0 && obj.charIdAttack) useCharId = obj.charIdAttack;
        else if ((Math.abs(obj.currentX - obj._prevX) > 0.1 || Math.abs(obj.currentY - obj._prevY) > 0.1) && obj.charIdMove) useCharId = obj.charIdMove;
    }

    // 画像が設定されていない、または存在しない場合は false を返す
    if (!useCharId || !gameData.assets.characters[useCharId]) return false;

    // 画像キャッシュ
    if (!mapEngine.imgCache[useCharId]) { 
        const img = new Image(); 
        img.src = gameData.assets.characters[useCharId].data; 
        mapEngine.imgCache[useCharId] = img; 
    }
    const img = mapEngine.imgCache[useCharId];

        if (img.complete && img.naturalWidth !== 0) {
        const asset = gameData.assets.characters[useCharId];
        const cols = asset.cols || 1; 
        const rows = asset.rows || 1;
        const sw = img.width / cols;
        const sh = img.height / rows;
        
        // ★修正: アニメーションフレーム計算 (開始・終了コマの適用)
        let frame = 0;
        if (cols > 1 || rows > 1) {
            const total = cols * rows;
            const sFrame = asset.startFrame || 0;
            let eFrame = asset.endFrame !== undefined ? asset.endFrame : (total - 1);
            if(eFrame >= total) eFrame = total - 1;
            if(sFrame > eFrame) eFrame = sFrame; // 矛盾回避
            
            const frameCount = eFrame - sFrame + 1;
            
            if (frameCount > 1) {
                const currentRelFrame = Math.floor(performance.now() / (1000 / (asset.fps || 12))) % frameCount;
                frame = sFrame + currentRelFrame;
            } else {
                frame = sFrame; // 1コマ固定
            }
        }
        const col = frame % cols; 
        const row = Math.floor(frame / cols);
        
        // 向き(反転)の判定 (引数で指定がなければオブジェクトのdirから計算)
        let flip = isFlip;
        if (!isFlip && obj.dir !== undefined) {
            if (Math.cos(obj.dir) < -0.1) flip = true;
        }

        // 被弾フラッシュ
        if (obj._dmgVisualTimer > 20) ctx.filter = 'brightness(500%)';

        if (flip) {
            ctx.save();
            ctx.translate(drawX + drawW, drawY);
            ctx.scale(-1, 1);
            // x, y を 0, 0 にして反転描画
            ctx.drawImage(img, col * sw, row * sh, sw, sh, 0, 0, drawW, drawH);
            ctx.restore();
        } else {
            ctx.drawImage(img, col * sw, row * sh, sw, sh, drawX, drawY, drawW, drawH);
        }
        
        ctx.filter = 'none'; // リセット
        return true; // 描画成功
    }
    return false; // ロード中またはサイズ不正
}

function drawObjectShadow(ctx, obj, drawX, drawY, drawW, drawH, zOffset) {
    // 空中のオブジェクトか、プレイヤー自身であれば影を描画する
    if ((obj.z || 0) > 0 || obj.isPlayer) {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        // 基準位置(足元)を中心に、楕円を描く
        // zOffset はマップタイプ(3D, Quarter等)ごとの高さ補正値
        ctx.ellipse(
            drawX + drawW / 2, 
            drawY + drawH + zOffset, 
            drawW / 2.5, 
            drawH / 5, 
            0, 0, Math.PI * 2
        );
        ctx.fill();
        ctx.restore();
    }
}

        // --- Render Functions ---
function renderMapGame() { 
    const ctx = mapEngine.ctx; 
    const map = mapEngine.data; 
    const grid = mapEngine.GRID; 
    const p = mapEngine.player; 
    const w = mapEngine.canvas.width; 
    const h = mapEngine.canvas.height; 
    const zoom = mapEngine.currentZoom || 1.0;

    // 1. 画面クリア
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    
    // --- 1. 外側背景 (Underlay) の描画 ---
    let bgOutDrawn = false;
    if (map.bgOutsideId && gameData.assets.backgrounds[map.bgOutsideId]) {
        const asset = gameData.assets.backgrounds[map.bgOutsideId];
        
        if (!mapEngine.skyImage || mapEngine.skyImage.src !== asset.data) {
            mapEngine.skyImage = new Image();
            mapEngine.skyImage.src = asset.data;
        }
        
        if (mapEngine.skyImage.complete) {
            // 画面いっぱいに描画
            ctx.drawImage(mapEngine.skyImage, 0, 0, w, h);
            bgOutDrawn = true;
        }
    }
    
    if (!bgOutDrawn) {
        if (map.stageModelId) { ctx.clearRect(0, 0, w, h); } 
        else { ctx.fillStyle = '#111'; ctx.fillRect(0, 0, w, h); }
    }

    // --- 2. マップ描画 ---
    // 3Dモデルの場合はここでの2D描画はスキップ
    if (!map.stageModelId) {
        ctx.save();
        ctx.scale(zoom, zoom);
        
        // カメラ位置計算 (プレイヤー中心)
        let bgOffsetX = -(p.x + p.w/2) * zoom + (w/2);
        let bgOffsetY = -(p.y + p.h/2) * zoom + (h/2);
        
        // ズーム適用後の座標系に戻す
        bgOffsetX /= zoom;
        bgOffsetY /= zoom;

        // ループ対応
        const mapW = map.width * grid;
        const mapH = map.height * grid;
        
        const mod = (n, m) => ((n % m) + m) % m;
        
        let startX = bgOffsetX;
        let startY = bgOffsetY;

        if (map.edgeType === 'loop') {
            startX = mod(startX, mapW) - mapW;
            startY = mod(startY, mapH) - mapH;
            if (map.type === 'side') {
                startY = bgOffsetY; 
                // Y軸クランプ
                if (startY > 0) startY = 0;
                if (startY < h/zoom - mapH) startY = h/zoom - mapH;
            }
        } else {
            // クランプ (行き止まり)
            if (mapW * zoom < w) startX = (w/zoom - mapW) / 2; // 中央寄せ
            else {
                if (startX > 0) startX = 0;
                if (startX < w/zoom - mapW) startX = w/zoom - mapW;
            }
            
            if (mapH * zoom < h) startY = (h/zoom - mapH) / 2; // 中央寄せ
            else {
                if (startY > 0) startY = 0;
                if (startY < h/zoom - mapH) startY = h/zoom - mapH;
            }
        }

        // --- マップ背景画像チェック ---
        let isBgReady = false;
        if (mapEngine.bgImage) { 
            if (mapEngine.isVideo) isBgReady = (mapEngine.bgImage.readyState >= 2); 
            else isBgReady = (mapEngine.bgImage.complete && mapEngine.bgImage.naturalWidth !== 0); 
        }

        let bg, srcX, srcY, srcW, srcH;
        if (isBgReady) {
            bg = mapEngine.bgImage; 
            const asset = gameData.assets.backgrounds[map.bgImageId];
            srcW = mapEngine.isVideo ? bg.videoWidth : bg.naturalWidth;
            srcH = mapEngine.isVideo ? bg.videoHeight : bg.naturalHeight;
            srcX = 0; srcY = 0;
            if (asset && (asset.cols > 1 || asset.rows > 1)) {
                const frame = Math.floor(performance.now() / (1000 / (asset.fps || 12))) % (asset.cols * asset.rows);
                srcW /= asset.cols; srcH /= asset.rows; 
                srcX = (frame % asset.cols) * srcW; 
                srcY = Math.floor(frame / asset.cols) * srcH;
            }
        }

        // タイリング描画
        const cols = (map.edgeType === 'loop') ? Math.ceil(w / zoom / mapW) + 2 : 1;
        const rows = (map.edgeType === 'loop' && map.type !== 'side') ? Math.ceil(h / zoom / mapH) + 2 : 1;

        for (let x = 0; x < cols; x++) {
            for (let y = 0; y < rows; y++) {
                const drawX = startX + (x * mapW);
                const drawY = startY + (y * mapH);

                // 画面内判定
                if (drawX + mapW < 0 || drawX > w/zoom || drawY + mapH < 0 || drawY > h/zoom) continue;

                if (isBgReady) {
                    if (map.type === 'shooter') {
                        // シューティング用スクロール
                        const destW = mapW;
                        const destH = srcH * (destW / srcW);
                        const scrollOffset = (mapEngine.bgScrollY) % destH;
                        let curY = drawY - destH + scrollOffset;
                        while (curY < drawY + mapH) {
                            ctx.drawImage(bg, srcX, srcY, srcW, srcH, drawX, curY, destW, destH);
                            curY += destH;
                        }
                    } else {
                        ctx.drawImage(bg, srcX, srcY, srcW, srcH, drawX, drawY, mapW, mapH);
                    }
                } else {
                    // 背景なしの場合はグリッド表示
                    ctx.fillStyle = '#222'; ctx.fillRect(drawX, drawY, mapW, mapH);
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'; ctx.lineWidth = 1; ctx.beginPath();
                    for (let lx = 0; lx <= mapW; lx += grid) { ctx.moveTo(drawX + lx, drawY); ctx.lineTo(drawX + lx, drawY + mapH); }
                    for (let ly = 0; ly <= mapH; ly += grid) { ctx.moveTo(drawX, drawY + ly); ctx.lineTo(drawX + mapW, drawY + ly); }
                    ctx.stroke();
                }
            }
        }
        
        ctx.restore();
    }
    
    // --- 3. オブジェクト描画 ---
    const sortedObjects = [...mapEngine.activeObjects];
    
    // プレイヤーダミー
    if (!map.stageModelId && !map.playerModelId) {
        sortedObjects.push({ 
            isPlayer: true, 
            x: p.x, y: p.y, z: p.z || 0, w: p.w, h: p.h,
            invincible: p.invincible, dir: p.dir, vx: p.vx, vy: p.vy, attackCooldown: p.attackCooldown
        });
    }

    sortedObjects.sort((a, b) => (a.y !== b.y) ? a.y - b.y : (a.z || 0) - (b.z || 0));
// カメラオフセット (描画用) の計算
    let camOffsetX = -(p.x + p.w/2) + (w / 2 / zoom);
    let camOffsetY = -(p.y + p.h/2) + (h / 2 / zoom);
    
    // ループ設定ではない（Clamp）の場合、カメラをマップ内に収める
    if (map.edgeType !== 'loop') {
        const mapW = map.width * grid;
        const mapH = map.height * grid;
        
        if (mapW < w / zoom) camOffsetX = ((w / zoom) - mapW) / 2;
        else {
            if (camOffsetX > 0) camOffsetX = 0;
            if (camOffsetX < (w / zoom) - mapW) camOffsetX = (w / zoom) - mapW;
        }

        if (mapH < h / zoom) camOffsetY = ((h / zoom) - mapH) / 2;
        else {
            if (camOffsetY > 0) camOffsetY = 0;
            // ★ここが重要: プレイヤーが mapH（底）を超えても、カメラはここ(下端)で止まる
            if (camOffsetY < (h / zoom) - mapH) camOffsetY = (h / zoom) - mapH;
        }
    }

    sortedObjects.forEach(obj => {
        let rawX = obj.isPlayer ? obj.x : (obj.currentX !== undefined ? obj.currentX : obj.x * grid);
        let rawY = obj.isPlayer ? obj.y : (obj.currentY !== undefined ? obj.currentY : obj.y * grid);
        
        if (map.edgeType === 'loop') {
            const mapW = map.width * grid;
            const mapH = map.height * grid;
            const pX = p.x; const pY = p.y;
            
            if (rawX - pX > mapW/2) rawX -= mapW;
            else if (rawX - pX < -mapW/2) rawX += mapW;
            
            if (map.type !== 'side') {
                if (rawY - pY > mapH/2) rawY -= mapH;
                else if (rawY - pY < -mapH/2) rawY += mapH;
            }
        }

        const drawX = rawX + camOffsetX;
        const drawY = rawY + camOffsetY - (obj.z || 0);
        const objW = (obj.w || grid);
        const objH = (obj.h || grid);

        // 画面外判定 (zoomを考慮)
        if ((drawX + objW) * zoom < 0 || drawX * zoom > w || (drawY + objH) * zoom < 0 || drawY * zoom > h) return;

        ctx.save();
        ctx.globalAlpha = obj.opacity !== undefined ? obj.opacity : 1.0;
        
        // ★最適化: 影の描画を共通化
        drawObjectShadow(ctx, obj, drawX, drawY, objW, objH, obj.z || 0);

        // ★最適化: 共通関数呼び出しに置き換え
        let flip = false;
        if (map.type === 'side' && obj.vx < 0) flip = true;

        let drawn = false;
        if (obj.visualType === 'image') {
            // zoomは描画のスケールとして1.0を渡す (ctx.scaleで既に拡大されているため)
            drawn = drawSpriteAnimation(ctx, obj, drawX, drawY, objW, objH, 1.0, flip);
        }
        
        if (!drawn) {
            if (obj.roleType === 'item' || (obj.itemId && gameData.items[obj.itemId])) {
                const itemData = gameData.items[obj.itemId];
                if (itemData) {
                    ctx.fillStyle = obj.color || '#ffff00';
                    ctx.fillRect(drawX, drawY, objW, objH);
                    ctx.fillStyle = '#000';
                    ctx.font = Math.floor(Math.min(objW, objH) * 0.7) + 'px serif';
                    ctx.textAlign = "center"; ctx.textBaseline = "middle";
                    ctx.fillText(itemData.iconEmoji || "📦", drawX + objW/2, drawY + objH/2);
                }
            } 
            else {
                ctx.fillStyle = obj.color || '#888';
                ctx.fillRect(drawX, drawY, objW, objH);
            }
        }
        
        ctx.restore();
    });

}
function renderQuarterViewGame() {
            const ctx = mapEngine.ctx; 
            const map = mapEngine.data; 
            const grid = mapEngine.GRID; 
            const p = mapEngine.player; 
            const w = mapEngine.canvas.width; 
            const h = mapEngine.canvas.height; 
            const zoom = mapEngine.currentZoom || 1.0;

            // 1. 画面クリア
           ctx.setTransform(1, 0, 0, 1, 0, 0);
            
            let bgOutDrawn = false;
            // 外側背景の設定がある場合
            if (map.bgOutsideId && gameData.assets.backgrounds[map.bgOutsideId]) {
                const asset = gameData.assets.backgrounds[map.bgOutsideId];
                
                // 画像準備 (簡易キャッシュ)
                if (!mapEngine.skyImage || mapEngine.skyImage.src !== asset.data) {
                    mapEngine.skyImage = new Image();
                    mapEngine.skyImage.src = asset.data;
                }
                
                if (mapEngine.skyImage.complete) {
                    // 画面いっぱいに描画
                    ctx.drawImage(mapEngine.skyImage, 0, 0, w, h);
                    bgOutDrawn = true;
                }
            }
            
            // 外側背景がない場合は、従来通り単色塗りつぶし or 透明
            if (!bgOutDrawn) {
                if (map.stageModelId) { ctx.clearRect(0, 0, w, h); } 
                else { ctx.fillStyle = '#111'; ctx.fillRect(0, 0, w, h); }
            }

            const mapW = map.width * grid; 
            const mapH = map.height * grid;
            
            const loopX = (map.edgeType === 'loop');
            const loopY = (map.edgeType === 'loop' && map.type !== 'side');

            const TILE_W_HALF = grid * zoom; 
            const TILE_H_HALF = (grid / 2) * zoom;
            const centerX = w / 2;
            const centerY = h / 2;
            const mod = (n, m) => ((n % m) + m) % m;

            // --- 背景描画 ---
            if (!map.stageModelId) {
                let isBgReady = false; 
                if (mapEngine.bgImage) { 
                    if (mapEngine.isVideo) isBgReady = (mapEngine.bgImage.readyState >= 2); 
                    else isBgReady = (mapEngine.bgImage.complete && mapEngine.bgImage.naturalWidth !== 0); 
                }
                ctx.save();
                if (isBgReady) {
                    const bg = mapEngine.bgImage; 
                    const asset = gameData.assets.backgrounds[map.bgImageId];
                    let srcW = mapEngine.isVideo ? bg.videoWidth : bg.naturalWidth; 
                    let srcH = mapEngine.isVideo ? bg.videoHeight : bg.naturalHeight;
                    let srcX = 0, srcY = 0;
                    if (asset && (asset.cols > 1 || asset.rows > 1)) {
                        const fps = asset.fps || 12; 
                        const frame = Math.floor(performance.now() / (1000 / fps)) % (asset.cols * asset.rows);
                        srcW /= asset.cols; srcH /= asset.rows; 
                        srcX = (frame % asset.cols) * srcW; 
                        srcY = Math.floor(frame / asset.cols) * srcH;
                    }
                    let bgOffX = -p.x; let bgOffY = -p.y;
                    if (loopX) bgOffX %= mapW; if (loopY) bgOffY %= mapH;
                    const drawIsoBg = (offsetX, offsetY) => {
                        ctx.setTransform(zoom, 0.5 * zoom, -zoom, 0.5 * zoom, centerX, centerY);
                        ctx.drawImage(bg, srcX, srcY, srcW, srcH, offsetX, offsetY, mapW, mapH);
                    };
                    let baseX = bgOffX; let baseY = bgOffY;
                    if (loopX) while(baseX > -mapW) baseX -= mapW;
                    if (loopY) while(baseY > -mapH) baseY -= mapH;
                    for (let x = 0; x < 3; x++) {
                        for (let y = 0; y < 3; y++) {
                            if (!loopX && x !== 1) continue;
                            if (!loopY && y !== 1) continue;
                            drawIsoBg(baseX + x * mapW, baseY + y * mapH);
                        }
                    }
                } else {
                    const range = 20; const pGx = Math.floor(p.x / grid); const pGy = Math.floor(p.y / grid);
                    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
                    for (let x = -range; x <= range; x++) {
                        for (let y = -range; y <= range; y++) {
                            let gx = pGx + x; let gy = pGy + y;
                            if (!loopX && (gx < 0 || gx >= map.width)) continue;
                            if (!loopY && (gy < 0 || gy >= map.height)) continue;
                            const diffX = (x * grid) - (p.x % grid); const diffY = (y * grid) - (p.y % grid);
                            const sx = (diffX - diffY) * (TILE_W_HALF / grid) + centerX;
                            const sy = (diffX + diffY) * (TILE_H_HALF / grid) + centerY;
                            ctx.setTransform(1, 0, 0, 1, 0, 0); 
                            ctx.beginPath(); ctx.moveTo(sx, sy - TILE_H_HALF); ctx.lineTo(sx + TILE_W_HALF, sy); ctx.lineTo(sx, sy + TILE_H_HALF); ctx.lineTo(sx - TILE_W_HALF, sy); ctx.closePath(); ctx.stroke();
                        }
                    }
                }
                ctx.restore();
            }

            // --- 2. オブジェクト描画 ---
            const allObjects = [...mapEngine.activeObjects, { isPlayer: true, x: p.x, y: p.y, z: p.z, w: p.w, h: p.h }];
            const renderList = [];
            allObjects.forEach(obj => {
                const objX = obj.isPlayer ? p.x : (obj.currentX !== undefined ? obj.currentX : obj.x * grid);
                const objY = obj.isPlayer ? p.y : (obj.currentY !== undefined ? obj.currentY : obj.y * grid);
                let diffX = objX - p.x; let diffY = objY - p.y;
                if (loopX) { if (diffX < -mapW / 2) diffX += mapW; else if (diffX > mapW / 2) diffX -= mapW; }
                if (loopY) { if (diffY < -mapH / 2) diffY += mapH; else if (diffY > mapH / 2) diffY -= mapH; }
                const screenX = (diffX - diffY) * (TILE_W_HALF / grid) + centerX;
                const screenY = (diffX + diffY) * (TILE_H_HALF / grid) + centerY;
                if (screenX < -200 || screenX > w + 200 || screenY < -200 || screenY > h + 200) return;
                renderList.push({ obj, screenX, screenY, z: (obj.z || 0) });
            });
            
            // ★最適化: Z座標(高さ)も考慮した精密な描画ソート
            renderList.sort((a, b) => {
                const ay = a.screenY - a.z;
                const by = b.screenY - b.z;
                if (ay === by) {
                    return (a.obj.id > b.obj.id) ? 1 : -1;
                }
                return ay - by;
            });

            renderList.forEach(item => {
                const { obj, screenX, screenY, z } = item;
                
                const hitboxSize = grid * zoom;
                const hitboxW = obj.isPlayer ? p.w * zoom : (obj.w ? obj.w * zoom : hitboxSize); 
                const hitboxH = obj.isPlayer ? p.h * zoom : (obj.h ? obj.h * zoom : hitboxSize);
                const zHeight = z * zoom;
                
                const drawBaseY = screenY; 
                // 基準位置は足元
                const hitboxY = drawBaseY - hitboxH - zHeight;
                const hitboxX = screenX - hitboxW / 2;

                if (obj.isPlayer) {
                    if (!map.stageModelId && !map.playerModelId) { 
                        // ★最適化: 影の描画を共通化 (Quarter用の座標補正)
                        drawObjectShadow(ctx, obj, screenX - hitboxW/2, drawBaseY - zHeight - hitboxH, hitboxW, hitboxH, 0);
                        
                        // 画像描画 (共通関数に委譲)
                        let drawn = drawSpriteAnimation(ctx, obj, screenX - hitboxW/2, drawBaseY - zHeight - hitboxH, hitboxW, hitboxH, zoom, false);
                        
                        if (!drawn) {
                            ctx.fillStyle = 'red'; 
                            ctx.fillRect(hitboxX, hitboxY, hitboxW, hitboxH); 
                        }
                    } 
                } else {
                    if (obj.isHitbox) return;
                    ctx.save(); ctx.globalAlpha = obj.opacity !== undefined ? obj.opacity : 1.0;
                    
                    let useCharId = obj.charId;
                    if (obj._dmgVisualTimer > 0 && obj.charIdDamage) useCharId = obj.charIdDamage;
                    else if (obj._atkVisualTimer > 0 && obj.charIdAttack) useCharId = obj.charIdAttack;
                    else if ((Math.abs(obj.currentX - obj._prevX) > 0.1 || Math.abs(obj.currentY - obj._prevY) > 0.1) && obj.charIdMove) useCharId = obj.charIdMove;

                    drawObjectShadow(ctx, obj, screenX - hitboxW/2, drawBaseY - zHeight - hitboxH, hitboxW, hitboxH, zHeight);

                    let drawn = false;
                    if (obj.visualType === 'image' && useCharId && gameData.assets.characters[useCharId]) {
                        const asset = gameData.assets.characters[useCharId];
                        
                        // 画像サイズ取得(キャッシュから)
                        let imgW = grid, imgH = grid;
                        if (mapEngine.imgCache[useCharId]) {
                            imgW = mapEngine.imgCache[useCharId].width / (asset.cols||1);
                            imgH = mapEngine.imgCache[useCharId].height / (asset.rows||1);
                        }
                        
                        // アスペクト比維持のためのサイズ計算
                        const spriteDrawW = imgW * zoom;
                        const spriteDrawH = imgH * zoom;
                        const spriteX = hitboxX + (hitboxW - spriteDrawW) / 2;
                        const spriteY = drawBaseY - zHeight - spriteDrawH;

                        drawn = drawSpriteAnimation(ctx, obj, spriteX, spriteY, spriteDrawW, spriteDrawH, zoom, false);
                    }
                    
                    if (!drawn && obj.itemId && gameData.items[obj.itemId]) {
    const itemData = gameData.items[obj.itemId];
    ctx.fillStyle = '#fff';
    // ボックスの幅に合わせてフォントサイズを調整
    ctx.font = Math.floor(hitboxW * 0.8) + 'px serif';
    ctx.textAlign = 'center'; 
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 4;
    
    // 中心座標に絵文字を描画
    // drawBaseYは足元のY座標なので、高さ(hitboxH)の半分と浮き(zHeight)を引く
    const centerY = drawBaseY - zHeight - (hitboxH / 2);
    ctx.fillText(itemData.iconEmoji || "📦", hitboxX + hitboxW / 2, centerY);
    
    ctx.shadowBlur = 0;
}else {
                        ctx.fillStyle = obj.color || '#888'; ctx.fillRect(hitboxX, hitboxY, hitboxW, hitboxH);
                    }
                    ctx.restore();
                }
            });
        }
function renderRaycastGame() {
    const ctx = mapEngine.ctx; 
    const w = mapEngine.canvas.width; 
    const h = mapEngine.canvas.height; 
    const p = mapEngine.player; 
    const grid = mapEngine.GRID; 
    const map = mapEngine.data;
    const zoom = mapEngine.currentZoom || 1.0;
    
    const isLoop = (map.edgeType === 'loop');
    
    const stripWidth = 1; 
    const numRays = Math.ceil(w / stripWidth); 
    const fov = Math.PI / 3 / zoom; 
    
    ctx.imageSmoothingEnabled = true;
    const zBuffer = new Array(numRays).fill(0);
    
    ctx.clearRect(0,0,w,h);
    
    // --- 1. 天井 (Outer/Sky) の描画 ---
    // 画面上半分に描画。プレイヤーの向きに合わせてスクロール
    let ceilingDrawn = false;
    if (map.bgOutsideId && gameData.assets.backgrounds[map.bgOutsideId]) {
        const skyAsset = gameData.assets.backgrounds[map.bgOutsideId];
        if (!mapEngine.skyImage || mapEngine.skyImage.src !== skyAsset.data) {
            mapEngine.skyImage = new Image();
            mapEngine.skyImage.src = skyAsset.data;
        }
        
        if (mapEngine.skyImage.complete) {
            const img = mapEngine.skyImage;
            const skyH = h / 2;
            
            // スクロール計算 (360度ループ)
            let angleRatio = (p.dir % (Math.PI * 2)) / (Math.PI * 2);
            if (angleRatio < 0) angleRatio += 1.0;
            
            // 画像の表示幅 (比率維持)
            let drawW = (img.width / img.height) * skyH;
            // 少なくとも画面幅はカバーする
            if (drawW < w) drawW = w;
            
            const offset = angleRatio * drawW;
            
            // 2枚並べてスクロール描画
            ctx.drawImage(img, -offset, 0, drawW, skyH);
            ctx.drawImage(img, -offset + drawW, 0, drawW, skyH);
            ctx.drawImage(img, -offset - drawW, 0, drawW, skyH);
            ceilingDrawn = true;
        }
    }
    
    if (!ceilingDrawn) {
        // 画像がない場合はグラデーション
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h/2);
        skyGrad.addColorStop(0, '#000');
        skyGrad.addColorStop(1, '#333');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h / 2);
    }
    
    // --- 2. 床 (Main/Floor) の描画 ---
    // 画面下半分に描画。現在は固定画像(カーペット)またはグラデーション
    // ※本格的なフロアキャスティングは重いため、ここでは「足元の画像」として描画
    let floorDrawn = false;
    if (mapEngine.bgImage) {
        const bg = mapEngine.bgImage;
        const isReady = (mapEngine.isVideo ? bg.readyState >= 2 : bg.complete);
        
        if (isReady) {
            const asset = gameData.assets.backgrounds[map.bgImageId];
            // 画像がある場合、画面下半分に引き伸ばして表示 (簡易表現)
            // プレイヤー移動に合わせてスクロールさせると酔うため、ここでは固定
            ctx.drawImage(bg, 0, h/2, w, h/2);
            floorDrawn = true;
        }
    }
    
    if (!floorDrawn) {
        const floorGradient = ctx.createLinearGradient(0, h/2, 0, h); 
        floorGradient.addColorStop(0, '#111'); floorGradient.addColorStop(1, '#333'); 
        ctx.fillStyle = floorGradient; ctx.fillRect(0, h / 2, w, h / 2);
    }
    
    const maxDist = 20 * grid; // 描画距離限界
    
    // --- 3. レイキャスティング (壁) ---
    for (let i=0; i<numRays; i++) {
        const rayAngle = (p.dir - fov/2) + (i/numRays)*fov; 
        const eyeX = Math.cos(rayAngle); 
        const eyeY = Math.sin(rayAngle);
        
        let dist = 0; 
        let hit = false; 
        let color = '#888'; 
        let hitObj = null;

        const stepSize = 4; 
        let testX = p.x; 
        let testY = p.y;

        for(let d=0; d<maxDist; d+=stepSize) {
            testX += eyeX * stepSize; 
            testY += eyeY * stepSize; 
            
            let gx = Math.floor(testX/grid); 
            let gy = Math.floor(testY/grid);
            
            if (isLoop) {
                gx = ((gx % map.width) + map.width) % map.width;
                gy = ((gy % map.height) + map.height) % map.height;
            } else {
                if(gx<0||gx>=map.width||gy<0||gy>=map.height) { 
                    hit = true; dist = d; break; 
                }
            }
            
            if (d < 10) continue; 
            
            const obj = mapEngine.activeObjects.find(function(o) { 
                return o.x===gx && o.y===gy && o.isWall; 
            });
            
            if(obj && obj.visualType !== 'image') { 
                hit=true; dist=d; color = obj.color || '#888'; 
                hitObj = obj; 
                break; 
            }
        }
        
        if(hit) {
            const correctedDist = dist * Math.cos(p.dir - rayAngle); 
            zBuffer[i] = correctedDist; 
            
            const projectionScale = (h * zoom) / (correctedDist + 0.1);
            const wallWorldHeight = grid + (hitObj ? (hitObj.z || 0) : 0);
            const drawH = wallWorldHeight * projectionScale;
            
            const eyeHeight = (grid / 2) + (p.z || 0);
            const screenFloorY = (h / 2) + (eyeHeight * projectionScale);
            const wallTopY = screenFloorY - drawH;

            const stripX = i * stripWidth; 
            
            ctx.fillStyle = color; 
            ctx.fillRect(stripX, wallTopY, stripWidth + 1, drawH);
            
            const fogAlpha = Math.min(0.8, correctedDist / maxDist);
            if (fogAlpha > 0.05) { 
                ctx.fillStyle = '#000'; 
                ctx.globalAlpha = fogAlpha; 
                ctx.fillRect(stripX, wallTopY, stripWidth + 1, drawH); 
                ctx.globalAlpha = 1.0; 
            }
        } else { 
            zBuffer[i] = 99999; 
        }
    }
    
    // --- 4. スプライト (敵・アイテム) ---
    const sprites = [];
    mapEngine.activeObjects.forEach(function(o) {
        if (o.isWall && o.visualType !== 'image') return; 

        const ox = (o.currentX !== undefined ? o.currentX : o.x * grid) + grid/2; 
        const oy = (o.currentY !== undefined ? o.currentY : o.y * grid) + grid/2;
        
        let dx = ox - p.x;
        let dy = oy - p.y;
        const mapPixelW = map.width * grid;
        const mapPixelH = map.height * grid;

        if (isLoop) {
            if (dx < -mapPixelW / 2) dx += mapPixelW; else if (dx > mapPixelW / 2) dx -= mapPixelW;
            if (dy < -mapPixelH / 2) dy += mapPixelH; else if (dy > mapPixelH / 2) dy -= mapPixelH;
        }

        const dist = Math.sqrt(dx*dx + dy*dy);
        sprites.push({ ...o, relX: dx, relY: dy, dist: dist });
    });

    sprites.sort(function(a, b) { return b.dist - a.dist; });
    
    sprites.forEach(function(sprite) {
        if (sprite.dist < 10 || sprite.dist > maxDist) return;
        
        let spriteAngle = Math.atan2(sprite.relY, sprite.relX) - p.dir;
        while (spriteAngle < -Math.PI) spriteAngle += 2*Math.PI; 
        while (spriteAngle > Math.PI) spriteAngle -= 2*Math.PI;
        
        if (Math.abs(spriteAngle) < fov / 1.3) {
            const viewDist = (w/2) / Math.tan(fov/2); 
            const screenX = (w/2) + Math.tan(spriteAngle) * viewDist;
            const scale = viewDist / sprite.dist;
            
            const worldHeight = grid + (sprite.z || 0);
            const drawHeight = worldHeight * scale;
            let spriteW = grid * scale; 
            
            const eyeHeight = (grid / 2) + (p.z || 0);
            const screenFloorY = (h / 2) + (eyeHeight * scale);
            const destY = screenFloorY - drawHeight;
            const destX = screenX - spriteW/2;
            
            const stripIdx = Math.floor(screenX / stripWidth);
            if (stripIdx >= 0 && stripIdx < numRays) {
                if (sprite.dist < zBuffer[stripIdx] + (grid/2)) {
                    
                    let useCharId = sprite.charId;
                    if (sprite._dmgVisualTimer > 0 && sprite.charIdDamage) useCharId = sprite.charIdDamage;
                    else if (sprite._atkVisualTimer > 0 && sprite.charIdAttack) useCharId = sprite.charIdAttack;
                    else if ((Math.abs(sprite.currentX - sprite._prevX) > 0.1 || Math.abs(sprite.currentY - sprite._prevY) > 0.1) && sprite.charIdMove) useCharId = sprite.charIdMove;

let drawn = false;
                    if (sprite.visualType === 'image') {
                        // Raycastの時は sprite 変数に obj の情報が入っている
                        drawn = drawSpriteAnimation(ctx, sprite, destX, destY, spriteW, drawHeight, scale, false);
                    } 
                    
                    if (!drawn && sprite.itemId && gameData.items[sprite.itemId]) {
                        const itemData = gameData.items[sprite.itemId];
                        ctx.fillStyle = '#fff';
                        ctx.font = Math.floor(spriteW * 0.8) + 'px serif';
                        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                        ctx.fillText(itemData.iconEmoji || "📦", destX + spriteW / 2, destY + drawHeight / 2);
                    } else {
                        ctx.fillStyle = sprite.color || '#888';
                        ctx.fillRect(destX, destY, spriteW, drawHeight);
                    }
                    
                    const fogAlpha = Math.min(0.8, sprite.dist / maxDist);
                    if (fogAlpha > 0.05) { 
                        ctx.fillStyle = '#000'; ctx.globalAlpha = fogAlpha; 
                        ctx.fillRect(destX, destY, spriteW, drawHeight); 
                        ctx.globalAlpha = 1.0; 
                    }
                }
            }
        }
    });

    // --- 5. TPSプレイヤー (FPSモード以外) ---
    const viewMode = Number(resolveValue(gameState['camera_view_mode'])) || 0;
    const isFPS = (viewMode === 1);

    if (!isFPS) {
        const pData = gameData.player || {};
        let curId = playerState.imageId || pData.imageId;
        if (p.invincible > 40) curId = playerState.imageIdDamage || pData.imageIdDamage || curId;
        else if (p.attackCooldown > 5) curId = playerState.imageIdAttack || pData.imageIdAttack || curId;
        else if (Math.abs(p.vx) > 0.1 || Math.abs(p.vy) > 0.1) curId = playerState.imageIdMove || pData.imageIdMove || curId;

        if (curId && gameData.assets.characters[curId]) {
            if (!mapEngine.imgCache[curId]) { 
                mapEngine.imgCache[curId] = new Image(); 
                mapEngine.imgCache[curId].src = gameData.assets.characters[curId].data; 
            }
            const img = mapEngine.imgCache[curId];

            if (img.complete && img.naturalWidth > 0) {
                const asset = gameData.assets.characters[curId];
                const cols = asset.cols || 1; const rows = asset.rows || 1;
                let frame = 0;
                if(cols > 1 || rows > 1) frame = Math.floor(performance.now() / (1000/(asset.fps||12))) % (cols * rows);
                const col = frame % cols; const row = Math.floor(frame / cols);
                const sw = img.width / cols; const sh = img.height / rows;

                const scale = h / 600 * 3.0; 
                const drawH = sh * scale;
                const drawW = drawH * (sw / sh);
                const drawX = (w - drawW) / 2;
                const isMoving = (Math.abs(p.vx) > 0.1 || Math.abs(p.vy) > 0.1);
                const bob = isMoving ? Math.sin(performance.now() / 150) * (10 * scale) : 0;
                const jumpOffset = (p.z || 0) * scale; 
                const drawY = h - drawH + bob + jumpOffset;

                ctx.drawImage(img, col*sw, row*sh, sw, sh, drawX, drawY, drawW, drawH);
            }
        }
    }
}
function renderMode7Game() {
    const ctx = mapEngine.ctx; 
    const map = mapEngine.data; 
    const p = mapEngine.player; 
    const grid = mapEngine.GRID; 
    const w = mapEngine.canvas.width; 
    const h = mapEngine.canvas.height; 
    const zoom = mapEngine.currentZoom || 1.0;
    
    const mapPixelW = map.width * grid; 
    const mapPixelH = map.height * grid;
    
    const loopX = (map.edgeType === 'loop');
    const loopY = (map.edgeType === 'loop' && map.type !== 'side');

    // 画面クリア
    if (map.stageModelId) { ctx.clearRect(0, 0, w, h); } 
    else { 
        // デフォルトの空と床
        // 空 (上半分)
        ctx.fillStyle = '#87CEEB'; 
        ctx.fillRect(0, 0, w, h/2);
        
        // 床 (下半分) - 床画像がない時に見える
        ctx.fillStyle = '#228b22'; 
        ctx.fillRect(0, h/2, w, h/2); 
    }

    const viewMode = Number(resolveValue(gameState['camera_view_mode'])) || 0;
    const isFPS = (viewMode === 1);

    const camZ = (h * 1.0) / zoom; 
    const cos = Math.cos(p.dir); 
    const sin = Math.sin(p.dir);

    // カメラ座標 (Mode7ではプレイヤー位置がカメラ中心)
    const camX = p.x + p.w / 2;
    const camY = p.y + p.h / 2;

    const mod = (n, m) => ((n % m) + m) % m;

    // --- 1. 空 (Outer/Sky) の描画 ---
    // プレイヤーの回転に合わせて左右にスクロールさせる
    if (!map.stageModelId && map.bgOutsideId && gameData.assets.backgrounds[map.bgOutsideId]) {
        const skyAsset = gameData.assets.backgrounds[map.bgOutsideId];
        
        if (!mapEngine.skyImage || mapEngine.skyImage.src !== skyAsset.data) {
            mapEngine.skyImage = new Image();
            mapEngine.skyImage.src = skyAsset.data;
        }
        
        if (mapEngine.skyImage.complete) {
            const img = mapEngine.skyImage;
            // 空の描画領域 (画面上半分)
            const skyH = h / 2;
            
            // スクロール計算
            // プレイヤーの向き (p.dir) を 0~1 の比率に変換
            // マイナス方向への回転にも対応するため mod を使用
            let angleRatio = (p.dir % (Math.PI * 2)) / (Math.PI * 2);
            if (angleRatio < 0) angleRatio += 1.0;
            
            // 画像の表示幅 (高さに合わせてアスペクト比維持)
            // ただし、360度パノラマにするため、ある程度横に引き伸ばすか、リピートさせる
            // ここでは「画像を2枚並べてループさせる」方式をとる
            
            const srcW = img.width;
            const srcH = img.height;
            
            // 画面上での画像1枚分の幅 (高さをskyHに合わせる)
            let drawW = (srcW / srcH) * skyH;
            
            // もし画像が細すぎて画面幅より小さい場合は、画面幅まで拡大
            if (drawW < w) drawW = w;
            
            // オフセット計算 (回転方向と逆へスクロール)
            const offset = angleRatio * drawW;
            
            // 1枚目
            ctx.drawImage(img, -offset, 0, drawW, skyH);
            // 2枚目 (右側)
            ctx.drawImage(img, -offset + drawW, 0, drawW, skyH);
            // 3枚目 (左側 - 念のため)
            ctx.drawImage(img, -offset - drawW, 0, drawW, skyH);
        }
    }

    // --- 2. 床 (Main/Map) の描画 (Mode7射影) ---
    if (!map.stageModelId) {
        const bg = (mapEngine.bgImage && (mapEngine.bgImage.complete || mapEngine.isVideo)) ? mapEngine.bgImage : null;
        
        if (bg) {
            const asset = gameData.assets.backgrounds[map.bgImageId];
            let rawW = mapEngine.isVideo ? bg.videoWidth : bg.naturalWidth; 
            let rawH = mapEngine.isVideo ? bg.videoHeight : bg.naturalHeight;
            let srcX = 0, srcY = 0; let srcW = rawW, srcH = rawH;

            if (asset && (asset.cols > 1 || asset.rows > 1)) {
                const fps = asset.fps || 12; 
                const totalFrames = asset.cols * asset.rows; 
                const frame = Math.floor(performance.now() / (1000 / fps)) % totalFrames;
                srcW = rawW / asset.cols; srcH = rawH / asset.rows; 
                srcX = (frame % asset.cols) * srcW; 
                srcY = Math.floor(frame / asset.cols) * srcH;
            }

            if (srcW > 0 && srcH > 0) {
                if (!mapEngine.bgCanvas) { mapEngine.bgCanvas = document.createElement('canvas'); }
                if (mapEngine.bgCanvas.width !== srcW || mapEngine.bgCanvas.height !== srcH) { mapEngine.bgCanvas.width = srcW; mapEngine.bgCanvas.height = srcH; }
                
                const bgCtx = mapEngine.bgCanvas.getContext('2d', { willReadFrequently: true });
                bgCtx.clearRect(0, 0, srcW, srcH); 
                bgCtx.drawImage(bg, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);
                
                const sourceData = bgCtx.getImageData(0, 0, srcW, srcH).data; 
                const destImageData = ctx.createImageData(w, h/2); 
                const destData = destImageData.data;
                
                // 画面下半分 (h/2 から h まで) をスキャン
                for (let y = 0; y < h / 2; y++) {
                    // 画面上のY座標に対応する Z深度
                    const z = camZ / (y + 1); 
                    
                    // カメラ座標を基準にスキャン
                    const basePx = camX + z * cos; 
                    const basePy = camY + z * sin; 
                    
                    const perZ = z / w * 2.5; // 水平方向のスケール調整
                    const vecX = -sin * perZ; 
                    const vecY = cos * perZ;
                    
                    for (let x = 0; x < w; x++) {
                        const offset = x - w / 2; 
                        let mapX = basePx + offset * vecX; 
                        let mapY = basePy + offset * vecY;
                        
                        let valid = true;
                        if (loopX) mapX = mod(mapX, mapPixelW); else if (mapX < 0 || mapX >= mapPixelW) valid = false;
                        if (loopY) mapY = mod(mapY, mapPixelH); else if (mapY < 0 || mapY >= mapPixelH) valid = false;

                        if (valid) {
                            const texX = Math.floor((mapX / mapPixelW) * srcW); 
                            const texY = Math.floor((mapY / mapPixelH) * srcH);
                            if (texX >= 0 && texX < srcW && texY >= 0 && texY < srcH) {
                                const sourceIndex = (texY * srcW + texX) * 4; 
                                const destIndex = (y * w + x) * 4;
                                destData[destIndex] = sourceData[sourceIndex]; 
                                destData[destIndex + 1] = sourceData[sourceIndex + 1]; 
                                destData[destIndex + 2] = sourceData[sourceIndex + 2]; 
                                destData[destIndex + 3] = 255;
                            }
                        }
                    }
                }
                ctx.putImageData(destImageData, 0, h/2);
            }
        }
    }
    
    // --- 3. オブジェクト描画 (Billboard) ---
    const allObjects = [...mapEngine.activeObjects];
    
    // TPSならプレイヤーも描画
    if (!isFPS) {
        allObjects.push({ 
            isPlayer: true, 
            x: p.x, y: p.y, z: p.z, w: p.w, h: p.h, 
            charId: 'player_placeholder' 
        });
    }
    
    allObjects.forEach(function(obj) {
        const cx = obj.isPlayer ? camX : ((obj.currentX !== undefined ? obj.currentX : obj.x * grid) + grid/2); 
        const cy = obj.isPlayer ? camY : ((obj.currentY !== undefined ? obj.currentY : obj.y * grid) + grid/2);
        
        let dx = cx - camX;
        let dy = cy - camY;

        if (loopX) {
            if (dx < -mapPixelW / 2) dx += mapPixelW; else if (dx > mapPixelW / 2) dx -= mapPixelW;
        }
        if (loopY) {
            if (dy < -mapPixelH / 2) dy += mapPixelH; else if (dy > mapPixelH / 2) dy -= mapPixelH;
        }

        obj._dx = dx; obj._dy = dy; obj._dist = Math.sqrt(dx*dx + dy*dy);
    });

    // 遠い順にソート
    allObjects.sort(function(a, b) { return b._dist - a._dist; });
    
    allObjects.forEach(function(obj) {
        let screenX, screenY, scale;
        let zHeight = 0;

        if (obj.isPlayer) {
            // プレイヤー(TPS)は画面中央下
            screenX = w / 2;
            screenY = h - 20; 
            scale = (h / 600) * 2.0; 
            const jumpY = (p.z || 0) * scale;
            screenY -= jumpY;
        } else {
            const dx = obj._dx; const dy = obj._dy;
            // カメラ基準で回転
            const rotatedY = dx * cos + dy * sin; 
            const rotatedX = dy * cos - dx * sin; 
            
            if (rotatedY < 10) return; // カメラより後ろ
            
            scale = camZ / rotatedY; 
            screenX = w / 2 + (rotatedX * scale); 
            screenY = h / 2 + scale;
            
            zHeight = (obj.z || 0) * (scale / grid);
        }
        
        let renderW, renderH;
        const renderType = obj.renderType || 'billboard';

        let useCharId = obj.charId;
        // アニメーション判定
        if (obj._dmgVisualTimer > 0 && obj.charIdDamage) useCharId = obj.charIdDamage;
        else if (obj._atkVisualTimer > 0 && obj.charIdAttack) useCharId = obj.charIdAttack;
        else if ((Math.abs(obj.currentX - obj._prevX) > 0.1 || Math.abs(obj.currentY - obj._prevY) > 0.1) && obj.charIdMove) useCharId = obj.charIdMove;

        if (obj.isPlayer) {
            const pData = gameData.player || {};
            useCharId = playerState.imageId || pData.imageId;
            if (p.invincible > 40) useCharId = playerState.imageIdDamage || pData.imageIdDamage || useCharId;
            else if (p.attackCooldown > 5) useCharId = playerState.imageIdAttack || pData.imageIdAttack || useCharId;
            else if ((Math.abs(p.vx) > 0.1 || Math.abs(p.vy) > 0.1)) useCharId = playerState.imageIdMove || pData.imageIdMove || useCharId;
        }

        let img = null;
        if (useCharId && gameData.assets.characters[useCharId]) {
            if (!mapEngine.imgCache[useCharId]) { 
                mapEngine.imgCache[useCharId] = new Image(); 
                mapEngine.imgCache[useCharId].src = gameData.assets.characters[useCharId].data; 
            }
            img = mapEngine.imgCache[useCharId];
        }

        const baseSize = obj.isPlayer ? p.w : (obj.w || grid);
        const scaledBase = baseSize * scale;

let drawn = false;
        if (useCharId && gameData.assets.characters[useCharId]) {
            const asset = gameData.assets.characters[useCharId];
            let sw = grid, sh = grid;
            if (mapEngine.imgCache[useCharId]) {
                sw = mapEngine.imgCache[useCharId].width / (asset.cols||1);
                sh = mapEngine.imgCache[useCharId].height / (asset.rows||1);
            }
            const aspect = sw / sh;
            renderH = scaledBase * (sh / grid);
            renderW = renderH * aspect;

            if (obj.isPlayer) {
                renderH = sh * scale;
                renderW = renderH * aspect;
            }

            const drawX = screenX - renderW / 2;
            const drawY = screenY - renderH - zHeight;

            drawn = drawSpriteAnimation(ctx, obj, drawX, drawY, renderW, renderH, scale, false);
        }
        
        if (!drawn && obj.itemId && gameData.items[obj.itemId]) {
            const itemData = gameData.items[obj.itemId];
            ctx.fillStyle = '#fff';
            const fontSize = scaledBase * 0.8;
            ctx.font = Math.floor(fontSize) + 'px serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            const textY = screenY - (scaledBase / 2) - zHeight;
            ctx.fillText(itemData.iconEmoji || "📦", screenX, textY);
        } 
        else if (!obj.isPlayer) {
            renderW = scaledBase + 1.5; 
            renderH = scaledBase;
            renderH += zHeight;
            const drawX = screenX - renderW/2;
            const drawY = screenY - renderH;
            ctx.fillStyle = obj.color || '#888'; 
            ctx.fillRect(drawX, drawY, renderW, renderH); 
        }
    });
}
function renderTrapezoidGame() {
    const ctx = mapEngine.ctx;
    const map = mapEngine.data;
    const grid = mapEngine.GRID;
    const p = mapEngine.player;
    const w = mapEngine.canvas.width;
    const h = mapEngine.canvas.height;
    const zoom = mapEngine.currentZoom || 1.0;

    // --- 視点パラメータ ---
    const horizon = Math.floor(h * 0.35); 
    const fov = h; 
    const cameraHeight = grid * 2.0; 
    const cameraDist = 200; 

    const pX = p.x + p.w / 2;
    const pY = p.y + p.h / 2;

    const loopX = (map.edgeType === 'loop');
    const loopY = (map.edgeType === 'loop');
    const mapPixelW = map.width * grid;
    const mapPixelH = map.height * grid;

    // --- 座標変換関数 (World -> Screen) ---
    const project = (mx, my) => {
        const depth = (pY + cameraDist) - my;
        if (depth <= 10) return null;

        const scale = fov / depth * zoom;
        const sx = w / 2 + (mx - pX) * scale;
        const sy = horizon + cameraHeight * scale;

        return { x: sx, y: sy, scale: scale, depth: depth };
    };

    // --- 1. 空 (Outer BG) ---
    let skyDrawn = false;
    if (!map.stageModelId && map.bgOutsideId && gameData.assets.backgrounds[map.bgOutsideId]) {
        const asset = gameData.assets.backgrounds[map.bgOutsideId];
        if (!mapEngine.skyImage || mapEngine.skyImage.src !== asset.data) {
            mapEngine.skyImage = new Image();
            mapEngine.skyImage.src = asset.data;
        }
        
        if (mapEngine.skyImage.complete) {
            const img = mapEngine.skyImage;
            const skyH = horizon;
            let drawW = (img.width / img.height) * skyH;
            if (drawW < w) drawW = w;

            const scrollRatio = 0.1;
            const offsetX = (pX * scrollRatio * zoom) % drawW;
            const tiles = Math.ceil(w / drawW) + 1;

            for (let i = 0; i < tiles; i++) {
                ctx.drawImage(img, -offsetX + (i * drawW), 0, drawW, skyH);
            }
            
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, horizon, w, h - horizon);
            skyDrawn = true;
        }
    }

    if (!skyDrawn) {
        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, '#000');
        bgGrad.addColorStop(0.35, '#222');
        bgGrad.addColorStop(1, '#333');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);
    }

    // --- 2. 床 (Main BG) - スキャンライン ---
    let floorDrawn = false;
    if (!map.stageModelId && mapEngine.bgImage) {
        const bg = mapEngine.bgImage;
        const isReady = (mapEngine.isVideo ? bg.readyState >= 2 : bg.complete);
        
        if (isReady) {
            const asset = gameData.assets.backgrounds[map.bgImageId];
            let srcW = mapEngine.isVideo ? bg.videoWidth : bg.naturalWidth;
            let srcH = mapEngine.isVideo ? bg.videoHeight : bg.naturalHeight;
            
            if (asset && (asset.cols > 1 || asset.rows > 1)) {
                srcW /= asset.cols; 
                srcH /= asset.rows;
            }

            if (srcW > 0 && srcH > 0) {
                if (!mapEngine.bgCanvas) mapEngine.bgCanvas = document.createElement('canvas');
                if (mapEngine.bgCanvas.width !== srcW || mapEngine.bgCanvas.height !== srcH) {
                    mapEngine.bgCanvas.width = srcW; mapEngine.bgCanvas.height = srcH;
                }
                const bgCtx = mapEngine.bgCanvas.getContext('2d', { willReadFrequently: true });
                bgCtx.drawImage(bg, 0, 0, srcW, srcH);

                const sourceData = bgCtx.getImageData(0, 0, srcW, srcH).data;
                const destImageData = ctx.createImageData(w, h - horizon);
                const destData = destImageData.data;

                for (let y = 0; y < h - horizon; y++) {
                    const screenY = horizon + y; 
                    const distY = (y < 1) ? 0.5 : y;
                    const depth = (cameraHeight * fov * zoom) / distY;
                    const mapY = pY + cameraDist - depth;
                    const scale = fov / depth * zoom;

                    let texY;
                    if (loopY) {
                        texY = Math.floor(((mapY % srcH) + srcH) % srcH);
                    } else {
                        if (mapY < 0 || mapY >= mapPixelH) continue;
                        texY = Math.floor(((mapY % srcH) + srcH) % srcH);
                    }
                    if (texY < 0 || texY >= srcH) continue;

                    const sourceRowBase = texY * srcW;
                    const destRowBase = y * w;
                    
                    const mapStartX = pX + (0 - w / 2) / scale;
                    const dx = 1 / scale;
                    let currentMapX = mapStartX;

                    for (let x = 0; x < w; x++) {
                        let texX;
                        let valid = true;
                        if (loopX) {
                            texX = Math.floor(((currentMapX % srcW) + srcW) % srcW);
                        } else {
                            if (currentMapX < 0 || currentMapX >= mapPixelW) valid = false;
                            else texX = Math.floor(((currentMapX % srcW) + srcW) % srcW);
                        }

                        if (valid) {
                            const srcIdx = (sourceRowBase + texX) * 4;
                            const dstIdx = (destRowBase + x) * 4;
                            destData[dstIdx]   = sourceData[srcIdx];
                            destData[dstIdx+1] = sourceData[srcIdx+1];
                            destData[dstIdx+2] = sourceData[srcIdx+2];
                            destData[dstIdx+3] = 255;
                        }
                        currentMapX += dx;
                    }
                }
                ctx.putImageData(destImageData, 0, horizon);
                floorDrawn = true;
            }
        }
    }

    // --- 3. グリッド線 (背景なし時) ---
    if (!floorDrawn) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, horizon, w, h - horizon);
        ctx.clip(); // 床領域のみ

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'; 
        ctx.lineWidth = 1;
        ctx.beginPath();

        // 画面下端のスケールから描画範囲を逆算
        const depthBottom = (cameraHeight * fov * zoom) / (h - horizon);
        const scaleBottom = fov / depthBottom * zoom;
        const viewWorldWidth = w / scaleBottom;
        const margin = viewWorldWidth * 2; 

        // --- 縦線 (X軸方向) ---
        let startGx, endGx;
        if (!loopX) {
            startGx = 0; 
            endGx = map.width;
        } else {
            startGx = Math.floor((pX - margin) / grid);
            endGx = Math.ceil((pX + margin) / grid);
        }

        // 線の長さ (奥〜手前)
        let mapY_Far = pY - 10000; // 視界の奥
        let mapY_Near = pY + cameraDist - 11; // カメラ手前

        // ★修正: ループなしならマップ範囲内でカット
        if (!loopY) {
            mapY_Far = Math.max(mapY_Far, 0);
            mapY_Near = Math.min(mapY_Near, mapPixelH);
        }

        for (let gx = startGx; gx <= endGx; gx++) {
            const wx = gx * grid;
            // X範囲外チェック
            if (!loopX && (wx < 0 || wx > mapPixelW)) continue;
            // Y範囲逆転チェック (奥 > 手前 になっていたら描画しない)
            if (mapY_Far > mapY_Near) continue;

            const ptFar = project(wx, mapY_Far);
            const ptNear = project(wx, mapY_Near);

            if (ptFar && ptNear) {
                ctx.moveTo(ptFar.x, ptFar.y);
                ctx.lineTo(ptNear.x, ptNear.y);
            }
        }

        // --- 横線 (Y軸方向) ---
        let startGy, endGy;
        // 描画範囲Y (カメラ位置周辺)
        let yRenderFar = pY - 10000;
        let yRenderNear = pY + cameraDist;

        if (!loopY) {
            startGy = 0; 
            endGy = map.height;
        } else {
            startGy = Math.floor(yRenderFar / grid);
            endGy = Math.floor(yRenderNear / grid);
        }

        // 線の長さ (左〜右)
        let xLeft = pX - 100000;
        let xRight = pX + 100000;

        // ★修正: ループなしならマップ範囲内でカット
        if (!loopX) {
            xLeft = 0;
            xRight = mapPixelW;
        }

        for (let gy = startGy; gy <= endGy; gy++) {
            const wy = gy * grid;
            // Y範囲外チェック
            if (!loopY && (wy < 0 || wy > mapPixelH)) continue;

            const ptLeft = project(xLeft, wy);
            const ptRight = project(xRight, wy);

            if (ptLeft && ptRight) {
                ctx.moveTo(ptLeft.x, ptLeft.y);
                ctx.lineTo(ptRight.x, ptRight.y);
            }
        }
        ctx.stroke();
        ctx.restore();
    }

    // --- 4. 境界線 (灰色) ---
    if (!loopX || !loopY) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, horizon, w, h - horizon);
        ctx.clip();

        ctx.strokeStyle = '#666'; 
        ctx.lineWidth = 2;
        ctx.beginPath();

        // 境界線の端点
        let yFar  = pY - 10000;
        let yNear = pY + cameraDist - 11;
        let xLeft  = pX - 100000;
        let xRight = pX + 100000;

        // ★修正: 境界線もマップ範囲に合わせてカット
        if (!loopY) { yFar = Math.max(yFar, 0); yNear = Math.min(yNear, mapPixelH); }
        if (!loopX) { xLeft = Math.max(xLeft, 0); xRight = Math.min(xRight, mapPixelW); }

        // 左右の壁 (X=0, X=Width)
        if (!loopX) {
            if (yFar <= yNear) {
                const pt0Far = project(0, yFar);
                const pt0Near = project(0, yNear);
                if (pt0Far && pt0Near) { ctx.moveTo(pt0Far.x, pt0Far.y); ctx.lineTo(pt0Near.x, pt0Near.y); }

                const ptWFar = project(mapPixelW, yFar);
                const ptWNear = project(mapPixelW, yNear);
                if (ptWFar && ptWNear) { ctx.moveTo(ptWFar.x, ptWFar.y); ctx.lineTo(ptWNear.x, ptWNear.y); }
            }
        }
        // 奥・手前の壁 (Y=0, Y=Height)
        if (!loopY) {
            const pt0Left = project(xLeft, 0);
            const pt0Right = project(xRight, 0);
            if (pt0Left && pt0Right) { ctx.moveTo(pt0Left.x, pt0Left.y); ctx.lineTo(pt0Right.x, pt0Right.y); }

            const ptHLeft = project(xLeft, mapPixelH);
            const ptHRight = project(xRight, mapPixelH);
            if (ptHLeft && ptHRight) { ctx.moveTo(ptHLeft.x, ptHLeft.y); ctx.lineTo(ptHRight.x, ptHRight.y); }
        }
        ctx.stroke();
        ctx.restore();
    }

    // ------------------------------------------
    // 5. オブジェクト描画
    // ------------------------------------------
    let allObjects = [...mapEngine.activeObjects];
    if (!map.stageModelId && !map.playerModelId) {
        allObjects.push({ 
            isPlayer: true, 
            x: p.x, y: p.y, z: p.z || 0, w: p.w, h: p.h,
            invincible: p.invincible, dir: p.dir, vx: p.vx, vy: p.vy, attackCooldown: p.attackCooldown
        });
    }

    // ★最適化: Zファイティング防止の精密なソート（これ1つだけでOK！）
    allObjects.sort((a, b) => {
        const ay = (a.isPlayer ? a.y : (a.currentY !== undefined ? a.currentY : a.y * grid)) + (a.z || 0);
        const by = (b.isPlayer ? b.y : (b.currentY !== undefined ? b.currentY : b.y * grid)) + (b.z || 0);
        if (ay === by) {
            // IDが存在しない(ダミーのプレイヤー等)場合のエラーを回避
            const idA = a.id || '';
            const idB = b.id || '';
            return (idA > idB) ? 1 : -1;
        }
        return ay - by; 
    });

    // 描画ループ
    allObjects.forEach(obj => {
        let cx, cy;
        if (obj.isPlayer) { 
            cx = obj.x + obj.w / 2; 
            cy = obj.y + obj.h / 2; 
        } else { 
            cx = (obj.currentX !== undefined ? obj.currentX : obj.x * grid) + (obj.w||grid)/2; 
            cy = (obj.currentY !== undefined ? obj.currentY : obj.y * grid) + (obj.h||grid)/2; 
        }

        let mapX = cx;
        let mapY = cy;

        // ループ時の座標補正
        if (loopX) {
            if (mapX - pX < -mapPixelW/2) mapX += mapPixelW;
            else if (mapX - pX > mapPixelW/2) mapX -= mapPixelW;
        }
        if (loopY) {
            if (mapY - pY < -mapPixelH/2) mapY += mapPixelH;
            else if (mapY - pY > mapPixelH/2) mapY -= mapPixelH;
        }

        const pos = project(mapX, mapY);
        if (!pos) return;

        const scale = pos.scale;
        const screenX = pos.x;
        const screenY = pos.y; 

        // 画面外判定 (簡易)
        if (screenY < horizon - 50 || screenY > h + 100) return;

        const baseW = obj.isPlayer ? p.w : (obj.w || grid);
        const baseH = obj.isPlayer ? p.h : (obj.h || grid);
        const drawW = baseW * scale;
        const drawH = baseH * scale;
        const zOffset = (obj.z || 0) * scale;

        const drawX = screenX - drawW / 2;
        const drawY = screenY - drawH - zOffset;

        ctx.save();
        ctx.globalAlpha = obj.opacity !== undefined ? obj.opacity : 1.0;

        // 影の描画
        drawObjectShadow(ctx, obj, drawX, drawY, drawW, drawH, zOffset);

        let flip = (obj.isPlayer && obj.vx < 0);
        let drawn = drawSpriteAnimation(ctx, obj, drawX, drawY, drawW, drawH, scale, flip);
        
        if (!drawn) {
            if (obj.itemId && gameData.items[obj.itemId]) {
                const itemData = gameData.items[obj.itemId];
                ctx.fillStyle = '#fff';
                ctx.font = Math.floor(drawW * 0.8) + 'px serif';
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(itemData.iconEmoji || "📦", screenX, drawY + drawH/2);
            } else {
                ctx.fillStyle = obj.color || '#888';
                ctx.fillRect(drawX, drawY, drawW, drawH);
            }
        }

        if (obj.destructible && obj._runtimeHp > 0 && obj.roleType !== 'enemy') {
            const fontSize = Math.max(8, drawW / 2);
            ctx.font = 'bold ' + fontSize + 'px sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
            const textY = drawY + drawH / 2;
            ctx.strokeText(obj._runtimeHp, screenX, textY);
            ctx.fillText(obj._runtimeHp, screenX, textY);
        }

        ctx.restore();
    });
}
function renderBeltGame() {
    const ctx = mapEngine.ctx; 
    const map = mapEngine.data; 
    const grid = mapEngine.GRID; 
    const p = mapEngine.player; 
    const w = mapEngine.canvas.width; 
    const h = mapEngine.canvas.height; 
    const zoom = mapEngine.currentZoom || 1.0;

    // 画面クリア
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (map.stageModelId) { ctx.clearRect(0, 0, w, h); } 
    else { ctx.fillStyle = '#111'; ctx.fillRect(0, 0, w, h); }

    const centerX = w / 2;
    const centerY = h / 2;

    // --- パース（遠近感）の設定 ---
    const PERSPECTIVE_STRENGTH = 600; 
    const vanishingPointDist = PERSPECTIVE_STRENGTH / zoom;

    // --- 座標変換関数 ---
    const project = (mx, my) => {
        const relX = mx - (p.x + p.w/2);
        const relY = my - (p.y + p.h/2);
        const distFromVanishingPoint = relY + vanishingPointDist;
        let scale = distFromVanishingPoint / vanishingPointDist;
        if (scale < 0.1) scale = 0.1;
        const sx = centerX + relX * scale;
        const sy = centerY + relY * scale;
        return { x: Math.round(sx), y: Math.round(sy), scale: scale }; // ★描画位置を丸めてガタつき防止
    };

    // --- 背景（床と空）の描画 ---
    if (!map.stageModelId) {
        let skyDrawn = false;

        // 1. 空（画面上半分）
        if (map.bgOutsideId && gameData.assets.backgrounds[map.bgOutsideId]) {
            const asset = gameData.assets.backgrounds[map.bgOutsideId];
            if (!mapEngine.skyImage || mapEngine.skyImage.src !== asset.data) {
                mapEngine.skyImage = new Image();
                mapEngine.skyImage.src = asset.data;
            }
            if (mapEngine.skyImage.complete) {
                const img = mapEngine.skyImage;
                const skyH = centerY; 
                let drawW = (img.width / img.height) * skyH;
                if (drawW < w) drawW = w;

                const scrollRatio = 0.1; 
                let offsetX = 0;
                
                if (map.edgeType === 'loop') {
                    offsetX = (p.x * scrollRatio) % drawW;
                } else {
                    const mapW = map.width * grid;
                    if (mapW > w) {
                        const maxScroll = drawW - w;
                        const pRatio = p.x / (mapW - w);
                        offsetX = Math.max(0, Math.min(maxScroll, maxScroll * pRatio));
                    }
                }

                if (map.edgeType === 'loop') {
                    const tiles = Math.ceil(w / drawW) + 1;
                    for (let i = 0; i < tiles; i++) {
                        let dx = -offsetX + (i * drawW);
                        if (dx + drawW < 0) dx += (tiles * drawW);
                        ctx.drawImage(img, dx, 0, drawW, skyH);
                    }
                } else {
                    ctx.drawImage(img, -offsetX, 0, drawW, skyH);
                }
                skyDrawn = true;
            }
        }

        if (!skyDrawn) {
            const skyGrad = ctx.createLinearGradient(0, 0, 0, centerY);
            skyGrad.addColorStop(0, '#000');
            skyGrad.addColorStop(1, '#222');
            ctx.fillStyle = skyGrad;
            ctx.fillRect(0, 0, w, centerY);
        }

        // 2. 床の描画
        const bg = (mapEngine.bgImage && (mapEngine.bgImage.complete || mapEngine.isVideo)) ? mapEngine.bgImage : null;

        if (bg) {
            // (既存の画像引き伸ばしロジックはそのまま維持しますが省略して記載します。
            // 実際にご自身のコードの該当箇所を残していただいて構いません)
        } else {
            // ★修正: 放射線を削除し、マップ範囲を明確な「床」として描画する
            const mapPixelW = map.width * grid;
            const mapPixelH = map.height * grid;
            
            // パース破綻を防ぐための奥行き制限（カメラより少し前）
            const yMin = Math.max(0, p.y - vanishingPointDist + 50); 
            const yMax = mapPixelH;

            // マップの四隅をスクリーンに投影
            const tl = project(0, yMin);
            const tr = project(mapPixelW, yMin);
            const bl = project(0, yMax);
            const br = project(mapPixelW, yMax);

            // 宇宙空間などの背景（画面下半分）
            ctx.fillStyle = '#111';
            ctx.fillRect(0, centerY, w, h - centerY);

            if (tl && tr && bl && br) {
                // 歩行可能な「床」のポリゴンを描画
                const floorGrad = ctx.createLinearGradient(0, Math.max(centerY, tl.y), 0, h);
                floorGrad.addColorStop(0, '#333');
                floorGrad.addColorStop(1, '#555');
                
                ctx.fillStyle = floorGrad;
                ctx.beginPath();
                ctx.moveTo(tl.x, Math.max(centerY, tl.y));
                ctx.lineTo(tr.x, Math.max(centerY, tr.y));
                ctx.lineTo(br.x, br.y);
                ctx.lineTo(bl.x, bl.y);
                ctx.closePath();
                ctx.fill();

                // マップの境界線を白線で強調
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.lineWidth = 2;
                ctx.stroke();
                
                // 距離感を出すための横線（平行線）を描画
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                for (let y = 0; y <= map.height; y++) {
                    const wy = y * grid;
                    if (wy >= yMin && wy <= yMax) {
                        const l = project(0, wy);
                        const r = project(mapPixelW, wy);
                        if (l && r && l.y > centerY) {
                            ctx.moveTo(l.x, l.y);
                            ctx.lineTo(r.x, r.y);
                        }
                    }
                }
                ctx.stroke();
            }
        }
    }

    // --- オブジェクト描画 ---
    let allObjects = [...mapEngine.activeObjects];
    if (!map.stageModelId && !map.playerModelId) {
        allObjects.push({ 
            isPlayer: true, 
            x: p.x, y: p.y, z: p.z || 0, w: p.w, h: p.h,
            invincible: p.invincible, dir: p.dir, vx: p.vx, vy: p.vy, attackCooldown: p.attackCooldown
        });
    }

    // Zファイティング防止の精密なソート
    allObjects.sort((a, b) => {
        const ay = (a.isPlayer ? a.y : (a.currentY !== undefined ? a.currentY : a.y * grid)) + (a.z || 0);
        const by = (b.isPlayer ? b.y : (b.currentY !== undefined ? b.currentY : b.y * grid)) + (b.z || 0);
        if (ay === by) return (a.id > b.id) ? 1 : -1;
        return ay - by;
    });

    allObjects.forEach(obj => {
        let cx = obj.isPlayer ? obj.x + obj.w / 2 : (obj.currentX !== undefined ? obj.currentX : obj.x * grid) + (obj.w||grid)/2;
        let cy = obj.isPlayer ? obj.y + obj.h / 2 : (obj.currentY !== undefined ? obj.currentY : obj.y * grid) + (obj.h||grid)/2;

        const pos = project(cx, cy);
        const scale = pos.scale * zoom;
        const screenX = pos.x;
        const screenY = pos.y;
        
        const baseW = (obj.isPlayer ? p.w : (obj.w || grid));
        const baseH = (obj.isPlayer ? p.h : (obj.h || grid));
        const drawW = baseW * scale;
        const drawH = baseH * scale;
        const zOffset = (obj.z || 0) * scale;

        const drawX = Math.round(screenX - drawW / 2);
        const drawY = Math.round(screenY - drawH - zOffset);

        if (drawX > w || drawX + drawW < 0 || drawY > h || drawY + drawH < 0) return;

        drawObjectShadow(ctx, obj, drawX, drawY, drawW, drawH, zOffset);

        ctx.save();
        ctx.globalAlpha = obj.opacity !== undefined ? obj.opacity : 1.0;

        let useCharId = obj.charId;
        if (obj.isPlayer) {
            const pData = gameData.player || {};
            useCharId = playerState.imageId || pData.imageId;
            if (p.invincible > 40) useCharId = playerState.imageIdDamage || pData.imageIdDamage || useCharId;
            else if (p.attackCooldown > 5) useCharId = playerState.imageIdAttack || pData.imageIdAttack || useCharId;
            else if ((Math.abs(p.vx) > 0.1 || Math.abs(p.vy) > 0.1)) useCharId = playerState.imageIdMove || pData.imageIdMove || useCharId;
        } else {
            if (obj._dmgVisualTimer > 0 && obj.charIdDamage) useCharId = obj.charIdDamage;
            else if (obj._atkVisualTimer > 0 && obj.charIdAttack) useCharId = obj.charIdAttack;
            else if ((Math.abs(obj.currentX - obj._prevX) > 0.1 || Math.abs(obj.currentY - obj._prevY) > 0.1) && obj.charIdMove) useCharId = obj.charIdMove;
        }

        let drawn = false;
        if (useCharId && gameData.assets.characters[useCharId]) {
            const asset = gameData.assets.characters[useCharId];
            let sw = grid, sh = grid;
            if (mapEngine.imgCache[useCharId]) {
                sw = mapEngine.imgCache[useCharId].width / (asset.cols||1);
                sh = mapEngine.imgCache[useCharId].height / (asset.rows||1);
            }
            const spriteH = drawH;
            const spriteW = spriteH * (sw / sh);
            const spriteX = screenX - spriteW / 2;

            drawn = drawSpriteAnimation(ctx, obj, spriteX, drawY, spriteW, spriteH, scale, false);
        }
        
        if (!drawn) {
            if (obj.itemId && gameData.items[obj.itemId]) {
                const itemData = gameData.items[obj.itemId];
                ctx.fillStyle = '#fff';
                ctx.font = Math.floor(drawW * 0.8) + 'px serif';
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(itemData.iconEmoji || "📦", screenX, drawY + drawH / 2);
            } else {
                ctx.fillStyle = obj.color || '#888';
                ctx.fillRect(drawX, drawY, drawW, drawH);
            }
        }

        if (obj.destructible && obj._runtimeHp > 0 && obj.roleType !== 'enemy') {
            const fontSize = Math.max(8, drawW / 2);
            ctx.font = 'bold ' + fontSize + 'px sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = '#fff'; 
            ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
            ctx.strokeText(obj._runtimeHp, screenX, drawY + drawH / 2);
            ctx.fillText(obj._runtimeHp, screenX, drawY + drawH / 2);
        }

        ctx.restore();
    });
}
function renderInvestigationGame() {
    const ctx = mapEngine.ctx;
    const map = mapEngine.data;
    const grid = mapEngine.GRID;
    const w = mapEngine.canvas.width;
    const h = mapEngine.canvas.height;
    const zoom = mapEngine.currentZoom || 1.0;

    // 現在のカメラ位置 (ピクセル単位)
    const camX = Math.floor(mapEngine.camera.x || 0);
    const camY = Math.floor(mapEngine.camera.y || 0);

    // 画面クリア (外側は暗い色)
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#111"; 
    ctx.fillRect(0, 0, w, h);

    // --- 1. 背景描画 (画像 or グリッド) ---
    if (!map.stageModelId && mapEngine.bgImage) {
        // === 背景画像がある場合 ===
        const bg = mapEngine.bgImage;
        const isReady = (mapEngine.isVideo ? bg.readyState >= 2 : bg.complete);
        
        if (isReady) {
            const asset = gameData.assets.backgrounds[map.bgImageId];
            let srcW = mapEngine.isVideo ? bg.videoWidth : bg.naturalWidth;
            let srcH = mapEngine.isVideo ? bg.videoHeight : bg.naturalHeight;
            let srcX = 0, srcY = 0;

            if (asset && (asset.cols > 1 || asset.rows > 1)) {
                const fps = asset.fps || 12;
                const frame = Math.floor(performance.now() / (1000 / fps)) % (asset.cols * asset.rows);
                srcW /= asset.cols; srcH /= asset.rows;
                srcX = (frame % asset.cols) * srcW;
                srcY = Math.floor(frame / asset.cols) * srcH;
            }
            
            const destW = map.width * grid * zoom;
            const destH = map.height * grid * zoom;

            // カメラ位置でずらして描画
            ctx.drawImage(bg, srcX, srcY, srcW, srcH, -camX * zoom, -camY * zoom, destW, destH);
        }
    } else {
        // === 背景画像がない場合 (見下ろしRPG風グリッド) ===
        const mapW = map.width * grid;
        const mapH = map.height * grid;

        ctx.save();
        // カメラ変換を適用: (ワールド座標 - カメラ) * ズーム
        ctx.translate(-camX * zoom, -camY * zoom);
        ctx.scale(zoom, zoom);

        // マップエリアの背景色
        ctx.fillStyle = '#222';
        ctx.fillRect(0, 0, mapW, mapH);

        // グリッド線
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'; 
        ctx.lineWidth = 1;
        ctx.beginPath();

        // 縦線
        for (let x = 0; x <= map.width; x++) {
            ctx.moveTo(x * grid, 0);
            ctx.lineTo(x * grid, mapH);
        }
        // 横線
        for (let y = 0; y <= map.height; y++) {
            ctx.moveTo(0, y * grid);
            ctx.lineTo(mapW, y * grid);
        }
        ctx.stroke();
        ctx.restore();
    }

    // --- 2. オブジェクト描画 ---
    let allObjects = [...mapEngine.activeObjects];
    // Y座標(奥行き)順、次にZ座標(高さ)順でソート
    allObjects.sort((a, b) => (a.y - b.y) || ((a.z||0) - (b.z||0)));

    allObjects.forEach(obj => {
        if (!checkCondition(obj)) return;
        if (obj._isPickedUp || obj._isDead) return;

        // オブジェクトのワールド座標
        const ox = (obj.currentX !== undefined ? obj.currentX : obj.x * grid);
        const oy = (obj.currentY !== undefined ? obj.currentY : obj.y * grid);
        const oz = obj.z || 0;
        
        const objW = (obj.w || grid);
        const objH = (obj.h || grid);

        // スクリーン座標変換
        const drawX = (ox - camX) * zoom;
        const drawY = (oy - camY) * zoom - (oz * zoom); // Z軸は上にずらす
        const drawW = objW * zoom;
        const drawH = objH * zoom;

        // 画面外判定
        if (drawX + drawW < 0 || drawX > w || drawY + drawH < 0 || drawY > h) {
            return;
        }

        ctx.save();
        ctx.globalAlpha = obj.opacity !== undefined ? obj.opacity : 1.0;

        // ★最適化: 影の描画を共通化 (Z軸オフセット込み)
        drawObjectShadow(ctx, obj, drawX, drawY, drawW, drawH, oz * zoom - (5*zoom));

        let drawn = false;
        if (obj.visualType === 'image') {
            drawn = drawSpriteAnimation(ctx, obj, drawX, drawY, drawW, drawH, zoom, false);
        }
        
        if (!drawn && obj.itemId && gameData.items[obj.itemId] && obj.visualType !== 'image') {
            const itemData = gameData.items[obj.itemId];
            
            // アイテム背景 (選択しやすくするためのボックス)
            // ctx.fillStyle = obj.color || 'rgba(255,255,0,0.2)';
            // ctx.fillRect(drawX, drawY, drawW, drawH);

            ctx.fillStyle = '#fff';
            ctx.font = Math.floor(drawW * 0.7) + 'px serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 4;
            ctx.fillText(itemData.iconEmoji || "📦", drawX + drawW/2, drawY + drawH/2);
            ctx.shadowBlur = 0;
        }
        else if (obj.visualType === 'color' && obj.opacity > 0) {
            ctx.fillStyle = obj.color || '#888';
            ctx.fillRect(drawX, drawY, drawW, drawH);
        }
        
        ctx.restore();
    });
}

function updatePanoramaGame(dt) {
    const timeScale = dt / 16.666;
    
    // 回転速度
    const turnSpeed = 0.04 * timeScale;
    const tiltSpeed = 0.03 * timeScale;
    
    const keys = mapEngine.keys;

    // --- 1. カメラ操作 ---
    
    // 左右 (Yaw)
    if (keys['ArrowLeft'] || keys['KeyA'])  mapEngine.camera.x -= turnSpeed;
    if (keys['ArrowRight'] || keys['KeyD']) mapEngine.camera.x += turnSpeed;
    
    // 角度正規化 (0 ~ 2PI)
    mapEngine.camera.x = (mapEngine.camera.x + Math.PI * 2) % (Math.PI * 2);

    // プレイヤーの向き(dir)も同期させておく (レーダー表示などで使うため)
    mapEngine.player.dir = mapEngine.camera.x;

    // 上下 (Pitch)
    if (mapEngine.camera.y === undefined) mapEngine.camera.y = 0.0;

    if (keys['ArrowUp'] || keys['KeyW'])    mapEngine.camera.y += tiltSpeed;
    if (keys['ArrowDown'] || keys['KeyS'])  mapEngine.camera.y -= tiltSpeed;

    // 角度正規化
    mapEngine.camera.y = (mapEngine.camera.y + Math.PI * 2) % (Math.PI * 2);

    // --- 2. マウス/タッチ判定 ---
    const w = mapEngine.canvas.width;
    const h = mapEngine.canvas.height;
    const isClicked = mapEngine.isClicked || false;
    mapEngine.isClicked = false;
    let isHover = false;
    
    const zoom = mapEngine.currentZoom || 1.0;
    const grid = mapEngine.GRID;
    
    // ★重要: Render関数と同じパラメータにする
    const camYaw = mapEngine.camera.x;
    const camPitch = mapEngine.camera.y;
    const camHeight = 150; // Renderと同じ高さ
    const fov = 800 * zoom; 

    const mapCenterX = (mapEngine.data.width * grid) / 2;
    const mapCenterY = (mapEngine.data.height * grid) / 2;

    const mx = mapEngine.mouseX || 0;
    const my = mapEngine.mouseY || 0;

    // --- 判定ロジック ---
    mapEngine.activeObjects.forEach(obj => {
        if (typeof checkCondition === 'function' && !checkCondition(obj)) return;
        if (obj._isPickedUp || obj._isDead) return;
        if (!obj.hasEvent && !obj.itemId) return; // イベントもアイテムもないなら無視

        // オブジェクトのワールド座標
        const ox = (obj.currentX !== undefined ? obj.currentX : obj.x * grid) + (obj.w||grid)/2;
        const oy = (obj.currentY !== undefined ? obj.currentY : obj.y * grid) + (obj.h||grid)/2;
        const oz = obj.z || 0;

        // ★Render関数と同じ投影計算
        let worldX = ox - mapCenterX;
        let worldZ = oy - mapCenterY;
        let worldY = oz - camHeight;

        // Yaw回転
        const rotYaw = camYaw - Math.PI / 2; 
        const cosY = Math.cos(rotYaw);
        const sinY = Math.sin(rotYaw);
        
        let rx = worldX * cosY - worldZ * sinY;
        let rz = worldX * sinY + worldZ * cosY;
        let ry = worldY;

        // Pitch回転
        const cosP = Math.cos(camPitch);
        const sinP = Math.sin(camPitch);
        
        let ry_rot = ry * cosP - rz * sinP;
        let rz_rot = ry * sinP + rz * cosP;

        // カメラより後ろなら判定しない
        if (rz_rot <= 10) return;

        // スクリーン座標へ投影
        const scale = fov / rz_rot;
        const screenX = (w / 2) + rx * scale;
        const screenY = (h / 2) - ry_rot * scale;

        // 判定サイズ
        const sizeW = (obj.w || grid) * scale;
        const sizeH = (obj.h || grid) * scale;

        // 矩形範囲 (ビルボード基準: x=中心, y=足元)
        const left = screenX - sizeW / 2;
        const right = screenX + sizeW / 2;
        const top = screenY - sizeH;
        const bottom = screenY;

        // マウスが範囲内にあるか
        if (mx >= left && mx <= right && my >= top && my <= bottom) {
            isHover = true;
            if (isClicked) {
                // --- クリック時のイベント実行 (変更なし) ---
                if (obj.itemId && (!obj.hp || obj.hp <= 0)) {
                    if (!playerState.inventory) playerState.inventory = {};
                    const currentQty = playerState.inventory[obj.itemId] || 0;
                    const itemDef = gameData.items[obj.itemId];
                    const max = (itemDef && itemDef.maxStack !== undefined) ? itemDef.maxStack : 99;
                    if (currentQty < max) {
                        playerState.inventory[obj.itemId] = currentQty + (obj.itemAmount || 1);
                        obj._isPickedUp = true;
                        if (obj.keepDestroyed && obj.id) {
                            if (!gameState._sys_destroyed) gameState._sys_destroyed = {};
                            gameState._sys_destroyed[mapEngine.currentMapId + '_' + obj.id] = true;
                        }
                        if (typeof showDamagePopup === 'function') {
                            const label = itemDef ? itemDef.name : "ITEM";
                            showDamagePopup(obj, "GET: " + label, 'item');
                        }
                        if (itemDef && itemDef.effects && itemDef.effects.sound && gameData.assets.sounds[itemDef.effects.sound]) {
                            AudioManager.playSe(itemDef.effects.sound, masterVolSe);
                        }
                    } else {
                        if (typeof showDamagePopup === 'function') showDamagePopup(obj, "FULL!", 'system');
                    }
                } else if (obj.hasEvent) {
                    const counterKey = '_sys_evt_' + obj.id;
                    if (gameState[counterKey] === undefined) gameState[counterKey] = 0;
                    let eventList = obj.eventList || [{nodeId: obj.eventNodeId}];
                    let targetNodeId = null;
                    let count = gameState[counterKey];
                    if (obj.eventRepeat === 'once') { 
                        if (count === 0 && eventList.length > 0) targetNodeId = eventList[0].nodeId; 
                    } else if (obj.eventRepeat === 'loop') { 
                        if (eventList.length > 0) targetNodeId = eventList[count % eventList.length].nodeId; 
                    } else if (obj.eventRepeat === 'stick') {
                        if (eventList.length > 0) { const idx = Math.min(count, eventList.length - 1); targetNodeId = eventList[idx].nodeId; }
                    }
                    if (targetNodeId) {
                        gameState[counterKey]++;
                        processNode(targetNodeId);
                    }
                }
            }
        }
    });

    // カーソルの変更
    if (mapEngine.canvas) mapEngine.canvas.style.cursor = isHover ? 'pointer' : 'default';
    if (mapEngine.eventCooldown > 0) mapEngine.eventCooldown -= timeScale;
}

function renderPanoramaGame() {
    const ctx = mapEngine.ctx;
    const map = mapEngine.data;
    const grid = mapEngine.GRID;
    const w = mapEngine.canvas.width;
    const h = mapEngine.canvas.height;
    
    const zoom = mapEngine.currentZoom || 1.0; 
    
    const camYaw = mapEngine.camera.x || 0;
    const camPitch = mapEngine.camera.y !== undefined ? mapEngine.camera.y : 0.0;
    
    // カメラの高さ設定 (視点の高さ)
    const camHeight = 150; 
    const ceilingHeight = 300; // 天井の高さ
    const fov = 800 * zoom; 

    ctx.clearRect(0, 0, w, h);
    
    // 地平線の位置計算
    // Pitchがプラス(上向き)なら地平線は下がる、マイナス(下向き)なら上がる
    const horizonY = (h / 2) + Math.tan(camPitch) * fov;

    // --- 1. 背景グラデーション (画像がない場合のベース) ---
    // 空 (上半分)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, "#001133"); 
    skyGrad.addColorStop(1, "#87CEEB"); 
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h); 
    
    // 地面 (下半分)
    if (horizonY < h) {
        const groundTop = Math.max(0, horizonY);
        const groundGrad = ctx.createLinearGradient(0, groundTop, 0, h);
        groundGrad.addColorStop(0, "#333333"); 
        groundGrad.addColorStop(1, "#111111"); 
        ctx.fillStyle = groundGrad;
        ctx.fillRect(0, groundTop, w, h - groundTop);
    }

    // --- 背景画像描画ヘルパー ---
    const drawPanoramaLayer = (assetId, isSky) => {
        if (!assetId || !gameData.assets.backgrounds[assetId]) return;
        const asset = gameData.assets.backgrounds[assetId];
        
        // 画像キャッシュ確認
        if (!mapEngine.imgCache) mapEngine.imgCache = {};
        let img = mapEngine.imgCache[assetId];
        if (!img) {
            img = new Image();
            img.src = asset.data;
            mapEngine.imgCache[assetId] = img;
        }

        if (img.complete && img.naturalWidth > 0) {
            let srcW = img.naturalWidth;
            let srcH = img.naturalHeight;
            let srcX = 0, srcY = 0;

            // アニメーション対応
            if (asset.cols > 1 || asset.rows > 1) {
                const frame = Math.floor(performance.now() / (1000 / (asset.fps||12))) % (asset.cols * asset.rows);
                srcW /= asset.cols; srcH /= asset.rows;
                srcX = (frame % asset.cols) * srcW;
                srcY = Math.floor(frame / asset.cols) * srcH;
            }

            // 描画サイズ計算
            // 画面高さを基準にスケール (1周分確保するため適当に大きく)
            const bgScale = (h / srcH) * 1.5; 
            const drawW = srcW * bgScale;
            const drawH = srcH * bgScale;
            
            // 配置位置
            // Skyなら地平線より上、Floorなら地平線より下を埋めるように配置
            let drawY = horizonY - (drawH / 2);
            
            // スクロール計算 (逆回転で自然に見せる)
            const oneCycleW = w * 4; 
            const ratio = (-camYaw % (Math.PI*2)) / (Math.PI*2);
            let startX = (ratio * oneCycleW); 
            
            while(startX > 0) startX -= drawW;
            while(startX < -drawW) startX += drawW;
            
            // クリップ設定 (空なら地平線より上、床なら下のみ描画)
            ctx.save();
            ctx.beginPath();
            if (isSky) {
                ctx.rect(0, 0, w, Math.max(0, horizonY));
            } else {
                ctx.rect(0, Math.max(0, horizonY), w, h);
            }
            ctx.clip();

            for (let cx = startX; cx < w; cx += drawW) {
                ctx.drawImage(img, srcX, srcY, srcW, srcH, cx, drawY, drawW, drawH);
            }
            ctx.restore();
        }
    };

    // --- 2. 背景画像の描画実行 ---
    // 外側・空 (Sky)
    if (!map.stageModelId && map.bgOutsideId) {
        drawPanoramaLayer(map.bgOutsideId, true);
    }
    // メイン背景 (Floor)
    if (!map.stageModelId && map.bgImageId) {
        drawPanoramaLayer(map.bgImageId, false);
    }

    // --- 3. 3D座標変換 (バグ修正版) ---
    const mapCenterX = (map.width * grid) / 2;
    const mapCenterY = (map.height * grid) / 2;

    const project3D = (mx, my, mz) => {
        // ワールド座標 (カメラ位置を原点に)
        // プレイヤー(カメラ)の位置ではなく、マップ中心からの相対位置を使う
        // パノラマモードでは「その場から動かない」か「移動しても背景は遠くにある」表現が自然だが
        // グリッドを表示するなら移動を反映させる必要がある。
        
        // ここでは「カメラ位置」を考慮して相対座標を出す
        // mapEngine.camera.x/y は「角度」に使っているので、
        // プレイヤー位置は mapEngine.player.x/y を使う
        const p = mapEngine.player;
        const pX = p.x + p.w/2;
        const pY = p.y + p.h/2; // マップ上のYは奥行き(Z)

        let dx = mx - pX;
        let dz = my - pY;
        let dy = mz - camHeight; // 高低差

        // Yaw回転 (Y軸回転)
        const rotYaw = camYaw - Math.PI / 2; // 北を正面に補正
        const cosY = Math.cos(rotYaw);
        const sinY = Math.sin(rotYaw);
        
        let rx = dx * cosY - dz * sinY;
        let rz = dx * sinY + dz * cosY;
        let ry = dy;

        // Pitch回転 (X軸回転)
        const cosP = Math.cos(camPitch);
        const sinP = Math.sin(camPitch);
        
        // YとZを回転させる
        // 画面上のYは「下」がプラスなので、3D的な「上(Y+)」とは逆になることに注意
        // ここでは ry(高さ) がプラス＝空、マイナス＝地面 となるよう計算
        
        let y2 = ry * cosP - rz * sinP; 
        let z2 = ry * sinP + rz * cosP; 
        let x2 = rx;

        // カメラより後ろなら描画しない
        if (z2 <= 10) return null;

        const scale = fov / z2;
        const screenX = (w / 2) + x2 * scale;
        
        // Y軸は画面下プラスなので、y2(高さ)を引く形にする
        // (y2がプラス＝高い＝画面上の方＝Y座標小)
        const screenY = (h / 2) - y2 * scale;

        return { x: screenX, y: screenY, scale: scale, depth: z2 };
    };

    // --- 4. グリッド描画 (床 & 天井) ---
    const drawGrid = (heightZ, colorStr) => {
        ctx.lineWidth = 1;
        ctx.strokeStyle = colorStr;
        ctx.beginPath();
        
        // 縦線
        for (let gx = 0; gx <= map.width; gx++) {
            const mx = gx * grid;
            let isFirst = true;
            // 線を分割して歪みを表現
            for (let gy = 0; gy <= map.height; gy += 0.5) {
                const my = gy * grid;
                const p = project3D(mx, my, heightZ);
                if (p) {
                    if (isFirst) { ctx.moveTo(p.x, p.y); isFirst = false; }
                    else { ctx.lineTo(p.x, p.y); }
                } else { isFirst = true; }
            }
        }
        // 横線
        for (let gy = 0; gy <= map.height; gy++) {
            const my = gy * grid;
            let isFirst = true;
            for (let gx = 0; gx <= map.width; gx += 0.5) {
                const mx = gx * grid;
                const p = project3D(mx, my, heightZ);
                if (p) {
                    if (isFirst) { ctx.moveTo(p.x, p.y); isFirst = false; }
                    else { ctx.lineTo(p.x, p.y); }
                } else { isFirst = true; }
            }
        }
        ctx.stroke();
    };

    drawGrid(0, "rgba(50, 200, 50, 0.5)"); // 床 (緑)

    // --- 5. オブジェクト描画 ---
    const renderList = [];

    mapEngine.activeObjects.forEach(obj => {
        if (typeof checkCondition === 'function' && !checkCondition(obj)) return;
        if (obj._isPickedUp || obj._isDead) return;

        // 中心座標
        const ox = (obj.currentX !== undefined ? obj.currentX : obj.x * grid) + (obj.w||grid)/2;
        const oy = (obj.currentY !== undefined ? obj.currentY : obj.y * grid) + (obj.h||grid)/2;
        const oz = obj.z || 0;

        // 投影 (足元ではなく中心を計算し、そこからサイズ展開するのがビルボードの基本)
        // ここでは足元の位置(z=oz)を計算
        const pos = project3D(ox, oy, oz);
        if (!pos) return;

        const sizeW = (obj.w || grid) * pos.scale;
        const sizeH = (obj.h || grid) * pos.scale;

        renderList.push({
            obj: obj,
            x: pos.x,
            y: pos.y, // 足元座標
            w: sizeW,
            h: sizeH,
            depth: pos.depth
        });
    });

    // 奥から順に描画
    renderList.sort((a, b) => b.depth - a.depth);

    renderList.forEach(item => {
        const { obj, x, y, w: sizeW, h: sizeH } = item;
        
        // 画面外判定
        if (x + sizeW < 0 || x - sizeW > w || y - sizeH > h || y < 0) return;

        // ビルボード基準位置: xは中心、yは足元
        const drawX = x - sizeW/2;
        const drawY = y - sizeH; 

        ctx.save();
        ctx.globalAlpha = obj.opacity !== undefined ? obj.opacity : 1.0;

        let useCharId = obj.charId;
        if (obj._dmgVisualTimer > 0 && obj.charIdDamage) useCharId = obj.charIdDamage;
        else if (obj.hasEvent && obj.charIdMove) useCharId = obj.charIdMove;

        // 画像描画
        if (obj.visualType === 'image' && useCharId && gameData.assets.characters[useCharId]) {
            if (!mapEngine.imgCache) mapEngine.imgCache = {};
            let img = mapEngine.imgCache[useCharId];
            if (!img) { 
                img = new Image(); 
                img.src = gameData.assets.characters[useCharId].data; 
                mapEngine.imgCache[useCharId] = img; 
            }
            if (img.complete && img.naturalWidth > 0) {
                const asset = gameData.assets.characters[useCharId];
                const cols = asset.cols || 1; const rows = asset.rows || 1;
                const frame = Math.floor(performance.now() / (1000 / (asset.fps||12))) % (cols * rows);
                const sw = img.width/cols, sh = img.height/rows;
                const col = frame % cols; const row = Math.floor(frame / cols);
                ctx.drawImage(img, col*sw, row*sh, sw, sh, drawX, drawY, sizeW, sizeH);
            }
        } 
        // アイテム(絵文字)
        else if (obj.itemId && gameData.items[obj.itemId]) {
            const itemData = gameData.items[obj.itemId];
            ctx.fillStyle = '#fff';
            ctx.font = Math.floor(sizeW * 0.8) + 'px serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 4;
            ctx.fillText(itemData.iconEmoji || "📦", x, y - sizeH/2);
            ctx.shadowBlur = 0;
        } 
        // 矩形
        else {
            ctx.fillStyle = obj.color || '#ff0';
            ctx.fillRect(drawX, drawY, sizeW, sizeH);
        }
        ctx.restore();
    });
    
    // 方向マーカー (N/S)
    // 床に張り付いているように見せるため、高さ0で計算
    const mapCenterPx = (map.width * grid) / 2;
    const mapCenterPy = (map.height * grid) / 2;
    
    // 北 (N) - マップ上端より少し奥
    const northPos = project3D(mapCenterPx, -1000, 0); 
    if (northPos) {
        ctx.fillStyle = "rgba(255, 255, 0, 0.8)";
        ctx.font = "bold 20px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("N", northPos.x, northPos.y);
    }
    
    // 南 (S) - マップ下端より少し手前
    const southPos = project3D(mapCenterPx, (map.height*grid) + 1000, 0);
    if (southPos) {
        ctx.fillStyle = "rgba(200, 200, 200, 0.8)";
        ctx.font = "bold 20px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("S", southPos.x, southPos.y);
    }
}

        function updateTimers(dt) {
            if (!gameState._sys_timers) return;
            const sec = dt / 1000; const timers = gameState._sys_timers; const toRemove = []; let triggeredNodeId = null;
            for (const id in timers) {
                const t = timers[id]; const targetObj = (t.type === 'player') ? playerState : gameState;
                let current = Number(targetObj[t.key] || 0);
                current += t.speed * sec * t.dir; targetObj[t.key] = current;
                if (t.limit !== undefined && t.limit !== "") {
                    const limitVal = Number(resolveValue(t.limit));
                    if ((t.dir > 0 && current >= limitVal) || (t.dir < 0 && current <= limitVal)) {
                        targetObj[t.key] = limitVal; if (t.nextNode) triggeredNodeId = t.nextNode; toRemove.push(id);
                    }
                }
            }
            toRemove.forEach(function(id){ delete timers[id]; });
            if (triggeredNodeId) { if (isMapMode) endMapMode(); processNode(triggeredNodeId); }
        }

function updateHUD() {
            // 1. テキストやゲージの更新
            for (const id in hudElements) {
                const elem = hudElements[id]; const dom = document.getElementById('hud-el-' + id); if (!dom) continue;
                
                if (elem.type === 'text') {
                    let text = elem.content || ''; 
                    text = text.replace(/\{\{([^}]+)\}\}/g, function(_, key) { 
                        const val = resolveValue(key);
                        return val !== undefined ? Math.floor(Number(val)) : 0;
                    });
                    dom.innerHTML = text;
                }
                else if (elem.type === 'gauge') {
                    let cur = resolveValue(elem.curKey);
                    let max = resolveValue(elem.maxKey);
                    cur = (cur !== undefined && cur !== null && !isNaN(cur)) ? Number(cur) : 0;
                    max = (max !== undefined && max !== null && !isNaN(max)) ? Number(max) : 1;
                    if (max === 0) max = 1; 
                    const per = Math.max(0, Math.min(100, (cur / max) * 100)); 
                    const fill = dom.querySelector('.hud-bar-fill'); 
                    if (fill) fill.style.width = per + '%';
                    const label = dom.querySelector('.hud-bar-text'); 
                    if (label) label.textContent = elem.label + ' ' + Math.floor(cur) + '/' + Math.floor(max);
                }
            }

            // 2. クロスヘア（照準・ロックオン範囲）の更新
            const crosshairConfig = hudElements['crosshair'];
            
            if (crosshairConfig && ui.hudCrosshair.style.display !== 'none') {
                const rangeVal = Number(resolveValue(crosshairConfig.range)) || 100;
                const widthVal = Number(resolveValue(crosshairConfig.width)) || 50;
                const zoom = (mapEngine && mapEngine.currentZoom) ? mapEngine.currentZoom : 1.0;
                const mapType = mapEngine.data ? mapEngine.data.type : 'topdown';
                
                // --- タイプ決定 ---
                let currentType = crosshairConfig.type;
                if (currentType === 'auto') {
                    currentType = 'center'; 
                    // ★修正: quarter も 2D系と同じ「方向指示(矢印)」タイプにする
                    if (['topdown', 'side', 'shooter', 'quarter'].includes(mapType)) {
                        currentType = 'direction';
                    }
                }

                // --- ロックオン座標計算 ---
                let isLocking = (playerState.$isLockedOn === 1);
                if (isLocking && !crosshairConfig.lockon) {
                    isLocking = false; 
                }

                let targetScreenPos = null;

                if (isLocking && playerState.$lockonTargetId) {
                    const target = mapEngine.activeObjects.find(function(o) { return o.id === playerState.$lockonTargetId; });
                    
                    if (target && !target._isDead) {
                        const grid = mapEngine.GRID;
                        const w = mapEngine.canvas.width;
                        const h = mapEngine.canvas.height;
                        
                        // ターゲットの中心座標 (World)
                        const tx = (target.currentX !== undefined ? target.currentX : target.x * grid) + (grid / 2);
                        const ty = (target.currentY !== undefined ? target.currentY : target.y * grid) + (grid / 2);
                        const tz = target.z || 0;

                        if (mapType === '3d' || mapType === 'dungeon') {
                            if (window.threeHandler) {
                                const pos = window.threeHandler.getScreenPosition(tx, ty, tz, w, h);
                                if (pos) targetScreenPos = pos;
                            }
                        } 
                        else if (mapType === 'quarter') {
                            // ★修正: Quarter専用のアイソメトリック座標計算
                            const p = mapEngine.player;
                            const pCx = p.x + p.w / 2;
                            const pCy = p.y + p.h / 2;
                            const mapW = mapEngine.data.width * grid;
                            const mapH = mapEngine.data.height * grid;
                            const loopX = (mapEngine.data.edgeType === 'loop');
                            const loopY = (mapEngine.data.edgeType === 'loop');

                            let diffX = tx - pCx;
                            let diffY = ty - pCy;

                            // ループ補正
                            if (loopX) {
                                if (diffX < -mapW / 2) diffX += mapW;
                                else if (diffX > mapW / 2) diffX -= mapW;
                            }
                            if (loopY) {
                                if (diffY < -mapH / 2) diffY += mapH;
                                else if (diffY > mapH / 2) diffY -= mapH;
                            }

                            // 画面変換 (renderQuarterViewGameと同じロジック)
                            const TILE_W_HALF = grid * zoom; 
                            const TILE_H_HALF = (grid / 2) * zoom;
                            const centerX = w / 2;
                            const centerY = h / 2;

                            // x' = x - y, y' = x + y
                            const sX = (diffX - diffY) * (TILE_W_HALF / grid) + centerX;
                            const sY = (diffX + diffY) * (TILE_H_HALF / grid) + centerY - (tz * zoom);
                            
                            targetScreenPos = { x: sX, y: sY };
                        }
                        else if (mapType === 'mode7') {
                            // Mode7計算 (前回同様)
                            const p = mapEngine.player;
                            const pCx = p.x + p.w/2; const pCy = p.y + p.h/2;
                            const mapW = mapEngine.data.width * grid; const mapH = mapEngine.data.height * grid;
                            let dx = tx - pCx; let dy = ty - pCy;
                            
                            // ループ補正
                            if (mapEngine.data.edgeType === 'loop') {
                                if (dx < -mapW / 2) dx += mapW; else if (dx > mapW / 2) dx -= mapW;
                                if (dy < -mapH / 2) dy += mapH; else if (dy > mapH / 2) dy -= mapH;
                            }

                            const cos = Math.cos(p.dir); 
                            const sin = Math.sin(p.dir);
                            const rotY = dx * cos + dy * sin;
                            const rotX = dy * cos - dx * sin;
                            
                            if (rotY > 10) {
                                const camZ = (h * 1.0) / zoom;
                                const scale = camZ / rotY; 
                                const sX = w / 2 + (rotX * scale); 
                                const sY = h / 2 + scale - (tz * scale / grid);
                                targetScreenPos = { x: sX, y: sY };
                            }
                        }                      else if (mapType === 'belt' || mapType === 'trapezoid') {
                            const p = mapEngine.player;
                            const centerX = w / 2;
                            const centerY = h / 2;
                            
                            // パース定数
                            const PERSPECTIVE_STRENGTH = (mapType === 'belt') ? 600 : 200;
                            const vanishingPointDist = PERSPECTIVE_STRENGTH / zoom;

                            // 中心座標の差分
                            const pCx = p.x + p.w/2;
                            const pCy = p.y + p.h/2;
                            const relX = tx - pCx;
                            const relY = ty - pCy;

                            // パース計算
                            const distFromVP = relY + vanishingPointDist;
                            let scale = distFromVP / vanishingPointDist;
                            if (scale < 0.1) scale = 0.1;

                            const sX = centerX + relX * scale;
                            // 足元ではなく「中心」にカーソルを出したい場合
                            // ty は中心座標なので、Z(高さ)だけ考慮すればOK
                            const sY = centerY + relY * scale - (tz * scale);
                            
                            targetScreenPos = { x: sX, y: sY };
                        }                        else if (mapType === 'adventure') {
                            const camX = Math.floor(mapEngine.camera.x || 0);
                            const camY = Math.floor(mapEngine.camera.y || 0);
                            
                            // ターゲット中心座標 tx, ty は既に計算済み
                            const sX = (tx - camX) * zoom;
                            const sY = (ty - camY) * zoom - (tz * zoom);
                            
                            targetScreenPos = { x: sX, y: sY };
                        }
                        else {
                            // 2D (Topdown, Side, Shooter)
                            const p = mapEngine.player;
                            const pCx = p.x + p.w / 2;
                            const pCy = p.y + p.h / 2;
                            const mapW = mapEngine.data.width * grid;
                            const mapH = mapEngine.data.height * grid;
                            const loopX = (mapEngine.data.edgeType === 'loop');
                            const loopY = (mapEngine.data.edgeType === 'loop' && mapEngine.data.type !== 'side');

                            let diffX = tx - pCx;
                            let diffY = ty - pCy;

                            // ループ補正
                            if (loopX) {
                                if (diffX < -mapW / 2) diffX += mapW;
                                else if (diffX > mapW / 2) diffX -= mapW;
                            }
                            if (loopY) {
                                if (diffY < -mapH / 2) diffY += mapH;
                                else if (diffY > mapH / 2) diffY -= mapH;
                            }

                            const centerX = w / 2;
                            const centerY = h / 2;
                            const sX = centerX + diffX * zoom;
                            const sY = centerY + diffY * zoom;
                            
                            targetScreenPos = { x: sX, y: sY };
                        }
                    } else {
                        playerState.$isLockedOn = 0;
                        playerState.$lockonTargetId = null;
                        isLocking = false;
                    }
                }

                // --- 描画適用 ---
                
                // A. ロックオン中 (ターゲット位置に赤枠)
                if (isLocking && targetScreenPos && crosshairConfig.lockon) {
                    ui.hudCrosshair.style.borderRadius = '20%'; 
                    ui.hudCrosshair.style.border = '2px solid red';
                    ui.hudCrosshair.style.backgroundColor = 'transparent';
                    ui.hudCrosshair.style.width = '40px'; 
                    ui.hudCrosshair.style.height = '40px';
                    ui.hudCrosshair.style.transformOrigin = '50% 50%';
                    ui.hudCrosshair.style.transform = 'translate(-50%, -50%) rotate(45deg)';
                    ui.hudCrosshair.style.left = targetScreenPos.x + 'px'; 
                    ui.hudCrosshair.style.top = targetScreenPos.y + 'px'; 
                }
                // B. 2D/Quarter 進行方向 (プレイヤー中心から矢印)
                else if (currentType === 'direction' && mapEngine && mapEngine.player) {
                    const p = mapEngine.player; 
                    const screenX = mapEngine.canvas.width / 2; 
                    const screenY = mapEngine.canvas.height / 2;
                    
                    let angle = (p.dir !== undefined ? p.dir : 0);
                    // Quarterの場合は見た目の角度に合わせる (45度ずらす等も考えられるが、入力方向と一致させるのが自然)
                    // Topdown: 0=右, 90=下. Quarter: 入力方向とスプライトの向きは一致している前提
                    const deg = angle * (180 / Math.PI);
                    
                    ui.hudCrosshair.style.borderRadius = '0';
                    ui.hudCrosshair.style.border = '1px dashed rgba(255, 255, 255, 0.7)';
                    ui.hudCrosshair.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
                    ui.hudCrosshair.style.width = (rangeVal * zoom) + 'px'; 
                    ui.hudCrosshair.style.height = (widthVal * zoom) + 'px';
                    ui.hudCrosshair.style.transformOrigin = '0% 50%';
                    ui.hudCrosshair.style.left = screenX + 'px';
                    ui.hudCrosshair.style.top = screenY + 'px';
                    ui.hudCrosshair.style.transform = 'translateY(-50%) rotate(' + deg + 'deg)';
                } 
                // C. 中央固定 (FPS/3D用)
                else {
                    ui.hudCrosshair.style.borderRadius = '50%'; 
                    ui.hudCrosshair.style.border = '2px solid rgba(255,255,255,0.8)';
                    ui.hudCrosshair.style.backgroundColor = 'transparent';
                    
                    ui.hudCrosshair.style.width = widthVal + 'px'; 
                    ui.hudCrosshair.style.height = widthVal + 'px';
                    ui.hudCrosshair.style.transformOrigin = '50% 50%';
                    ui.hudCrosshair.style.left = '50%'; 
                    ui.hudCrosshair.style.top = '50%'; 
                    ui.hudCrosshair.style.transform = 'translate(-50%, -50%)';
                }
            }

            // 3. レーダーの更新
            if (isMapMode && ui.hudRadar.style.display !== 'none' && mapEngine.data) {
                renderRadar();
            }
        }
        
     function renderRadar() {
            const ctx = ui.radarCanvas.getContext('2d'); 
            const w = 120, h = 120; 
            ctx.clearRect(0, 0, w, h);
            
            // 背景円
            ctx.fillStyle = 'rgba(0, 20, 0, 0.5)'; 
            ctx.beginPath(); ctx.arc(w/2, h/2, w/2, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = 'rgba(100, 255, 100, 0.5)'; ctx.lineWidth = 2; ctx.stroke();
            
            // 自分（中心の矢印）
            const p = mapEngine.player;
            const pDir = p.dir !== undefined ? p.dir : -0.5 * Math.PI; 
            
            ctx.save();
            ctx.translate(w/2, h/2);
            ctx.rotate(pDir + Math.PI / 2); 
            
            ctx.fillStyle = '#0f0'; 
            ctx.beginPath(); 
            ctx.moveTo(0, -7); 
            ctx.lineTo(-5, 5); 
            ctx.lineTo(0, 3); 
            ctx.lineTo(5, 5); 
            ctx.fill();
            ctx.restore();

            // ★修正: 設定された範囲を取得 (変数対応)
            const radarConfig = hudElements['radar'];
            // 設定がなければデフォルト10、変数なら解決して数値化
            let range = 10;
            if (radarConfig && radarConfig.range) {
                range = Number(resolveValue(radarConfig.range)) || 10;
            }
            
            const grid = mapEngine.GRID; 
            
            mapEngine.activeObjects.forEach(obj => {
                const ox = (obj.currentX !== undefined ? obj.currentX : obj.x * grid) / grid; 
                const oy = (obj.currentY !== undefined ? obj.currentY : obj.y * grid) / grid;
                const px = p.x / grid;
                const py = p.y / grid;

                const rx = ox - px; 
                const ry = oy - py;

                if (rx*rx + ry*ry < range*range) {
                    // 範囲(range)に応じて表示位置をスケーリング
                    const screenX = w/2 + (rx / range) * (w/2 * 0.8); 
                    const screenY = h/2 + (ry / range) * (h/2 * 0.8);
                    
                    ctx.fillStyle = obj.damage ? '#f00' : '#fff'; 
                    ctx.beginPath(); 
                    ctx.arc(screenX, screenY, 3, 0, Math.PI*2); 
                    ctx.fill();
                }
            });
        }

// 【デバッグ用】renderOverheadBars (export.js)
        function renderOverheadBars() {
            // ★修正: 描画先を専用キャンバスに変更
            const canvas = document.getElementById('overhead-canvas');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            
            // キャンバスサイズを同期 (リサイズ対応)
            if (canvas.width !== mapEngine.canvas.width || canvas.height !== mapEngine.canvas.height) {
                canvas.width = mapEngine.canvas.width;
                canvas.height = mapEngine.canvas.height;
            }

            // ★重要: 毎フレームクリアする
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const p = mapEngine.player;
            const zoom = mapEngine.currentZoom || 1.0;
            const grid = mapEngine.GRID;
            const map = mapEngine.data;
            const w = mapEngine.canvas.width;
            const h = mapEngine.canvas.height;
            
            const pOverhead = (gameData.player && gameData.player.overheadType) ? gameData.player.overheadType : 'none';
            
            const drawBar = (x, y, percent, color, width, height, offsetY) => {
                if (isNaN(percent)) percent = 0;
                const barW = width * zoom;
                const barH = height * zoom;
                const screenX = x - (barW / 2);
                const screenY = y - barH - (offsetY * zoom);
                
                if (isNaN(screenX) || isNaN(screenY)) return;

                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.fillRect(screenX, screenY, barW, barH);
                ctx.fillStyle = color;
                ctx.fillRect(screenX + 1, screenY + 1, (barW - 2) * (percent / 100), barH - 2);
            };

            const centerX = w / 2;
            const centerY = h / 2;
            const mapPixelW = map.width * grid;
            const mapPixelH = map.height * grid;
            const loopX = (map.edgeType === 'loop');
            const loopY = (map.edgeType === 'loop' && map.type !== 'side');

            // --- 1. 敵のHPバー ---
            mapEngine.activeObjects.forEach(obj => {
                if (!obj.showHpBar || !obj.hp || obj._isDead) return;
                
                let cur = 0, max = 1;
                if (obj._runtimeHp !== undefined) {
                    cur = obj._runtimeHp;
                    max = Number(resolveValue(obj.hp));
                } else {
                    cur = resolveValue(obj.hp);
                    max = 100;
                }
                if (max <= 0) max = 1;
                const percent = Math.max(0, Math.min(100, (cur / max) * 100));

                let screenX, screenY;
                let isVisible = false;

                if (map.type === '3d' || map.type === 'dungeon') {
                    const tX = (obj.currentX !== undefined ? obj.currentX : obj.x * grid) + (obj.w||grid)/2;
                    const tY = (obj.currentY !== undefined ? obj.currentY : obj.y * grid) + (obj.h||grid)/2;
                    if (window.threeHandler) {
                         const pos = window.threeHandler.getScreenPosition(tX, tY, (obj.z||0) + (obj.h||grid) + 10, w, h);
                         if (pos) { screenX = pos.x; screenY = pos.y; isVisible = true; }
                    }
                } 
                else if (map.type === 'quarter') {
                    const TILE_W_HALF = grid * zoom; 
                    const TILE_H_HALF = (grid / 2) * zoom;
                    const tX = (obj.currentX !== undefined ? obj.currentX : obj.x * grid);
                    const tY = (obj.currentY !== undefined ? obj.currentY : obj.y * grid);
                    let dx = tX - p.x; let dy = tY - p.y;
                    if (loopX) { if(dx < -mapPixelW/2) dx+=mapPixelW; else if(dx > mapPixelW/2) dx-=mapPixelW; }
                    if (loopY) { if(dy < -mapPixelH/2) dy+=mapPixelH; else if(dy > mapPixelH/2) dy-=mapPixelH; }
                    screenX = centerX + (dx - dy) * (TILE_W_HALF / grid);
                    screenY = centerY + (dx + dy) * (TILE_H_HALF / grid);
                    screenY -= ((obj.z||0) + (obj.h||grid)) * zoom;
                    isVisible = true;
                }
                else if (map.type === 'mode7') { isVisible = false; }
                                else if (map.type === 'belt' || map.type === 'trapezoid') {
                    // パース計算用の定数 (render関数と同じ設定にする必要があります)
                    const PERSPECTIVE_STRENGTH = (map.type === 'belt') ? 600 : 200; // belt=600, trapezoid=200
                    const vanishingPointDist = PERSPECTIVE_STRENGTH / zoom;
                    
                    // オブジェクトの中心座標
                    const cx = (obj.currentX !== undefined ? obj.currentX : obj.x * grid) + (obj.w||grid)/2;
                    const cy = (obj.currentY !== undefined ? obj.currentY : obj.y * grid) + (obj.h||grid)/2;
                    
                    // プレイヤー中心
                    const pCx = p.x + p.w/2;
                    const pCy = p.y + p.h/2;

                    // 相対座標
                    const relX = cx - pCx;
                    const relY = cy - pCy;

                    // パース計算
                    const distFromVP = relY + vanishingPointDist;
                    let scale = distFromVP / vanishingPointDist;
                    if (scale < 0.1) scale = 0.1;

                    // 画面座標変換
                    screenX = centerX + relX * scale;
                    screenY = centerY + relY * scale;
                    
                    // 台形モードの場合、さらにY座標に応じた高さ補正が入る場合がありますが、
                    // 簡易的にベルトスクロールと同じロジックで十分追従します。
                    
                    // 高さ(Z)と身長(H)を考慮して「頭上」の位置を出す
                    // 足元(screenY)から引く
                    const zOffset = ((obj.z||0) + (obj.h||grid)) * scale;
                    screenY -= zOffset;

                    // 画面内判定
                    if (screenY > 0 && screenY < h && scale > 0.2) isVisible = true;
                }                else if (map.type === 'adventure') {
                    const tX = (obj.currentX !== undefined ? obj.currentX : obj.x * grid) + (obj.w||grid)/2;
                    const tY = (obj.currentY !== undefined ? obj.currentY : obj.y * grid) + (obj.h||grid)/2;
                    
                    const camX = Math.floor(mapEngine.camera.x || 0);
                    const camY = Math.floor(mapEngine.camera.y || 0);

                    screenX = (tX - camX) * zoom;
                    screenY = (tY - camY) * zoom;
                    
                    // 頭上へオフセット
                    screenY -= ((obj.z||0) + (obj.h||grid)) * zoom;
                    
                    // 画面内なら表示
                    if (screenX > -50 && screenX < w + 50 && screenY > -50 && screenY < h + 50) {
                        isVisible = true;
                    }
                }
                else {
                    const tX = (obj.currentX !== undefined ? obj.currentX : obj.x * grid) + (obj.w||grid)/2;
                    const tY = (obj.currentY !== undefined ? obj.currentY : obj.y * grid) + (obj.h||grid)/2;
                    const pX = p.x + p.w/2;
                    const pY = p.y + p.h/2;
                    let dx = tX - pX; let dy = tY - pY;
                    if (loopX) { if(dx < -mapPixelW/2) dx+=mapPixelW; else if(dx > mapPixelW/2) dx-=mapPixelW; }
                    if (loopY) { if(dy < -mapPixelH/2) dy+=mapPixelH; else if(dy > mapPixelH/2) dy-=mapPixelH; }
                    screenX = centerX + dx * zoom;
                    screenY = centerY + dy * zoom - ((obj.h||grid)/2 * zoom);
                    screenY -= (obj.z || 0) * zoom;
                    if (screenX > 0 && screenX < w && screenY > 0 && screenY < h) isVisible = true;
                }

                if (isVisible) {
                    drawBar(screenX, screenY, percent, '#ff4d4f', 40, 6, 10);

                                       // 「アクション(調べる)」イベントを持ち、かつプレイヤーに近い場合
                    if (obj.hasEvent && obj.eventTrigger === 'action') {
                        // プレイヤーとの距離を計算
                        const p = mapEngine.player;
                        const ox = (obj.currentX !== undefined ? obj.currentX : obj.x * grid) + (obj.w||grid)/2;
                        const oy = (obj.currentY !== undefined ? obj.currentY : obj.y * grid) + (obj.h||grid)/2;
                        const px = p.x + p.w/2;
                        const py = p.y + p.h/2;
                        const dist = Math.sqrt((ox-px)**2 + (oy-py)**2);
                        
                        // 1.5マス以内にいれば表示
                        if (dist < grid * 1.5) {
                            // 吹き出しの描画
                            ctx.fillStyle = "#fff";
                            ctx.strokeStyle = "#000";
                            ctx.lineWidth = 1;
                            
                            // ふわふわ動く演出
                            const floatY = Math.sin(performance.now() / 200) * 3;
                            const iconY = screenY - 25 + floatY;

                            // 逆三角形（▼）を描く
                            ctx.beginPath();
                            ctx.moveTo(screenX - 6, iconY);
                            ctx.lineTo(screenX + 6, iconY);
                            ctx.lineTo(screenX, iconY + 8);
                            ctx.fill();
                            ctx.stroke();
                            
                            // 「！」マークを描く
                            ctx.font = "bold 16px sans-serif";
                            ctx.textAlign = "center";
                            ctx.fillStyle = "#000";
                            ctx.fillText("!", screenX, iconY - 2);
                        }
                    }
                }
            });

            // --- 2. プレイヤーのバー ---
            if (pOverhead !== 'none') {
                let screenX = w / 2;
                let screenY = h / 2;
                let isVisible = false;

                if (map.type === '3d' || map.type === 'dungeon') {
                    if (window.threeHandler && window.threeHandler.currentPlayerModel) {
                        const pos = window.threeHandler.getScreenPosition(
                            p.x + p.w/2, p.y + p.h/2, 
                            (p.z||0) + (p.h||grid) + 10, w, h
                        );
                        if (pos) { screenX = pos.x; screenY = pos.y; isVisible = true; }
                    } else {
                        isVisible = true; 
                    }
                } else if (map.type === 'belt' || map.type === 'trapezoid') {
                    // プレイヤーは常に画面中央(centerX, centerY)にいるが、
                    // スケールは 1.0 (基準) なので計算はシンプル
                    screenX = centerX;
                    
                    // 足元(centerY)から、身長とジャンプ高さを引く
                    // プレイヤー位置でのスケールは常に 1.0
                    screenY = centerY - ((p.h + (p.z||0)) * zoom); 
                    
                    isVisible = true;
                }else {
                    screenY -= (p.h / 2) * zoom;
                    screenY -= (p.z || 0) * zoom;
                    isVisible = true;
                }

                if (isVisible) {
                    let offsetY = 10;
                    
                    // HPバー
                    if (pOverhead === 'hp' || pOverhead === 'both') {
                        const maxHp = Number(playerState.$maxHp) || 1;
                        const curHp = Number(playerState.$hp) || 0;
                        const hpPer = Math.max(0, Math.min(100, (curHp / maxHp) * 100));
                        drawBar(screenX, screenY, hpPer, '#52c41a', 40, 6, offsetY);
                        offsetY += 8;
                    }
                    
                    // スタミナバー
                    if (pOverhead === 'stamina' || pOverhead === 'both') {
                        const maxSt = Number(playerState.$maxStamina) || 100;
                        const curSt = Number(playerState.$stamina) || 0;
                        const stPer = Math.max(0, Math.min(100, (curSt / maxSt) * 100));
                        drawBar(screenX, screenY, stPer, '#fadb14', 40, 6, offsetY);
                    }
                }
            }
        }
            
        function updateSpriteAnimation(state, dt) { 
            if(!state.id || !state.element) return; 
            const type = (state.element.id && state.element.id.includes('background')) ? 'backgrounds' : 'characters'; 
            const asset = gameData.assets[type][state.id]; 
            if(!asset || (asset.cols||1) <= 1 && (asset.rows||1) <= 1) return; 
            
            // ★追加: 範囲取得
            const total = (asset.cols||1)*(asset.rows||1);
            const sFrame = asset.startFrame || 0;
            let eFrame = asset.endFrame !== undefined ? asset.endFrame : (total - 1);
            if(eFrame >= total) eFrame = total - 1;
            if(sFrame > eFrame) eFrame = sFrame;

            state.timer += dt; 
            if(state.timer >= 1000/(asset.fps||12)) { 
                state.timer = 0; 
                
                // ★修正: ループ制御を startFrame と endFrame ベースに変更
                if (state.frame < sFrame) state.frame = sFrame;

                if (state.loop === false && state.frame >= eFrame) {
                    state.frame = eFrame;
                } else {
                    state.frame++; 
                    if(state.frame > eFrame) state.frame = sFrame;
                }
                
                const col = state.frame % (asset.cols||1); 
                const row = Math.floor(state.frame / (asset.cols||1)); 
                state.element.style.backgroundPosition = '-' + (col * (asset.width/asset.cols)) + 'px -' + (row * (asset.height/asset.rows)) + 'px';
            } 
        }

function startMapMode(node) {
    stopAutoSkip(); 

    // ★安全装置: マップIDが空、またはデータが存在しない場合のガード
    const mapId = node.mapId; 
    const mapData = gameData.maps[mapId]; 
    if (!mapId || !mapData) {
        console.warn("⚠️ [Skip] マップIDが未設定、またはデータが存在しません。ID:", mapId);
        // エラーを出さずにノベルモードを維持して次のノードへ進める
        isMapMode = false;
        isProcessingNode = false; // ロック解除
        if (node.nextNodeId) {
            processNode(node.nextNodeId);
        } else {
            console.warn("移動先がないため進行を停止しました。");
        }
        return;
    }

    if (isMapMode && mapEngine.currentMapId === mapId && 
        node.spawnType === 'none') {
        
        // UIの状態だけ戻して終了 (処理負荷をかけずに復帰)
        layers.map.style.display = 'block';
        ui.mapControls.classList.add('active');
        ui.mapActionContainer.classList.add('active');
        ui.textBox.style.display = 'none';
        ui.overlay.style.display = 'none';
        
        isWaitingForInput = false;
        return;
    }
    // ★最適化: マップが完全に切り替わる時は、前のマップの天候エフェクトをすべて消去する
    // （これにより、雨と雪が重なって重くなるバグを防ぎます）
    if (mapEngine.currentMapId !== node.mapId) {
        activeEmitters = [];
        // 画面にかかっているフィルター等も念のためリセット
        if (ui.effect) {
            ui.effect.style.background = "none";
            ui.effect.style.opacity = 0;
        }
        if (ui.container) ui.container.style.filter = "none";
        document.querySelectorAll('.world-layer').forEach(el => el.style.filter = "none");
    }

    isMapMode = true; 
    particles = []; 
    if (window.threeHandler && window.threeHandler.clearAll) {
        window.threeHandler.clearAll();
    }

    
  if (layers.bg1) layers.bg1.style.display = 'none';
    if (layers.bg2) layers.bg2.style.display = 'none';

    layers.map.style.display = 'block'; 
    ui.textBox.style.display = 'none'; 
    ui.overlay.style.display = 'none';
    layers.charaContainer.innerHTML = ''; 
    ui.mapControls.classList.add('active'); 
    ui.mapActionContainer.classList.add('active');

    // マップエンジン初期化
    mapEngine.data = mapData; 
    mapEngine.currentMapId = mapId; 
    mapEngine.camera = { x: 0, y: 0 }; 
    mapEngine.keys = {}; 
    mapEngine.prevKeys = {}; 
    mapEngine.bgScrollY = 0; 
    mapEngine.bgImage = null; 
    mapEngine.isVideo = false; 
    
    // カメラリセット
    tpsCameraAngle = { horizontal: 0, vertical: 0.3 };
    mapEngine.player.pitch = 0;
    
    // 3Dステージ表示
    if (mapData.stageModelId) {
        threeHandler.showStage(mapData.stageModelId); 
    } else {
        threeHandler.hideStage();
    }

    // プレイヤーモデル表示
    const pData = gameData.player || {};
    const playerModelId = playerState.modelId || pData.modelId;

    if (playerModelId) {
        threeHandler.showPlayer(playerModelId); 
    } else {
        threeHandler.hidePlayer();
    }

    // 背景読み込み
    if (mapData.bgImageId && gameData.assets.backgrounds[mapData.bgImageId]) { 
        const asset = gameData.assets.backgrounds[mapData.bgImageId];
        if (asset.data.startsWith('data:video')) { 
            const vid = document.createElement('video'); 
            vid.src = asset.data; 
            vid.autoplay = true; 
            vid.loop = true; 
            vid.muted = false; 
            vid.playsInline = true; 
            vid.play(); 
            mapEngine.bgImage = vid; 
            mapEngine.isVideo = true; 
        } else { 
            const img = new Image(); 
            img.src = asset.data; 
            mapEngine.bgImage = img; 
            mapEngine.isVideo = false; 
        }
    }

    if (mapData.bgmId) {
        AudioManager.playBgm(mapData.bgmId, masterVolBgm);
    }
    // プレイヤー初期位置決定
    let startX = 1, startY = 1;
    let startDir = 0.5 * Math.PI; // Default Down

    if (node.spawnType === 'coord') {
        startX = node.spawnX || 0;
        startY = node.spawnY || 0;
        const d = node.spawnDir || 'down';
        if(d==='up') startDir = 1.5 * Math.PI;
        else if(d==='left') startDir = Math.PI;
        else if(d==='right') startDir = 0;
        else startDir = 0.5 * Math.PI;
    } 
    else if(node.spawnId) { 
        const s = mapData.objects.find(function(o) { return o.isSpawn && o.spawnId === node.spawnId; }); 
        if(s){ startX=s.x; startY=s.y; } 
    }
    else if(mapEngine.player.x===0 && mapEngine.player.y===0) { 
        // ゲーム開始直後で位置未定の場合、デフォルトスポーンを探す
        const s = mapData.objects.find(function(o) { return o.isSpawn; }); 
        if(s){ startX=s.x; startY=s.y; } 
    } 
    else { 
        // マップ遷移で位置指定なしの場合、現在のグリッド位置を維持
        startX = Math.round(mapEngine.player.x / mapEngine.GRID); 
        startY = Math.round(mapEngine.player.y / mapEngine.GRID); 
    }
    
    // 状態リセット
    playerState._isDeadTriggered = false; 
    if (playerState.$hp <= 0) {
        playerState.$hp = playerState.$maxHp || 10;
    }

    mapEngine.player.x = startX * mapEngine.GRID; 
    mapEngine.player.y = startY * mapEngine.GRID; 

    mapEngine.player.w = (pData.width !== undefined) ? Number(resolveValue(pData.width)) : 32;
    mapEngine.player.h = (pData.height !== undefined) ? Number(resolveValue(pData.height)) : 32;
    if (isNaN(mapEngine.player.w)) mapEngine.player.w = 32;
    if (isNaN(mapEngine.player.h)) mapEngine.player.h = 32;
    mapEngine.player.vx = 0; 
    mapEngine.player.vy = 0; 
    mapEngine.player.z = 0; 
    mapEngine.player.vz = 0; 
    mapEngine.player.onGround = false;
    
    if(node.spawnType === 'coord') {
        mapEngine.player.dir = startDir;
    } else if(mapEngine.player.dir === undefined) {
        mapEngine.player.dir = 0.5 * Math.PI; 
    }

    // --- ランダムマップ生成ロジック ---
    const rMode = mapData.randomMode || 'none';
    
    // 生成に使用するオブジェクトリスト (デフォルトはマップデータそのまま)
    let sourceObjects = mapData.objects;

    if (rMode !== 'none') {
        const width = mapData.width;
        const height = mapData.height;
        const safeDist = 3; // プレイヤー周辺の安全地帯(マス)

        // プレイヤー位置 (Grid)
        const pGx = Math.floor(mapEngine.player.x / mapEngine.GRID);
        const pGy = Math.floor(mapEngine.player.y / mapEngine.GRID);

        // 座標が埋まっているかチェックするSet ( "x,y" 形式 )
        const occupied = new Set();
        // ★修正: テンプレートリテラルを使わず連結
        occupied.add(pGx + "," + pGy);

        // 安全地帯も埋める (生成禁止にする)
        for(let x = -safeDist; x <= safeDist; x++) {
            for(let y = -safeDist; y <= safeDist; y++) {
                // ★修正
                occupied.add((pGx+x) + "," + (pGy+y));
            }
        }

        // ランダムな空き座標を返す関数
        const getRandomPos = function() {
            let limit = 1000;
            while(limit-- > 0) {
                const rx = Math.floor(Math.random() * width);
                const ry = Math.floor(Math.random() * height);
                // ★修正
                const key = rx + "," + ry;
                if (!occupied.has(key)) {
                    occupied.add(key);
                    return { x: rx, y: ry };
                }
            }
            return null; // 空きなし
        };

        const newObjects = [];

        // --- モードA: 配置シャッフル (Shuffle) ---
        if (rMode === 'shuffle') {
            sourceObjects.forEach(function(obj) {
                // 出現条件などをチェック
                if (typeof checkCondition === 'function' && !checkCondition(obj)) return;

                const pos = getRandomPos();
                if (pos) {
                    const newObj = JSON.parse(JSON.stringify(obj));
                    newObj.x = pos.x;
                    newObj.y = pos.y;
                    newObjects.push(newObj);
                }
            });
        }
        
        // --- モードB: 自動生成 (Generate) ---
        else if (rMode === 'generate') {
            // 1. パレット作成
            const walls = sourceObjects.filter(function(o) { return o.roleType === 'obstacle' && o.isWall; });
            const enemies = sourceObjects.filter(function(o) { return o.roleType === 'enemy'; });
            const items = sourceObjects.filter(function(o) { return o.roleType === 'item' || (o.itemId && !o.isWall); });
            const decos = sourceObjects.filter(function(o) { return o.roleType === 'deco'; });

            // 2. 壁の生成
            const wallRate = (mapData.randomWallRate !== undefined) ? mapData.randomWallRate : 20;
            const totalCells = width * height;
            const wallCount = Math.floor(totalCells * (wallRate / 100));

            if (walls.length > 0) {
                for(let i=0; i<wallCount; i++) {
                    const pos = getRandomPos();
                    if(pos) {
                        const proto = walls[Math.floor(Math.random() * walls.length)];
                        const newObj = JSON.parse(JSON.stringify(proto));
                        // ★修正
                        newObj.id = "gen_wall_" + i;
                        newObj.x = pos.x; newObj.y = pos.y;
                        newObjects.push(newObj);
                    }
                }
            }

            // 3. エンティティ生成
            const entityRate = (mapData.randomEntityRate !== undefined) ? mapData.randomEntityRate : 1.0;
            const enemyCount = Math.floor(Math.max(3, enemies.length * width * height / 100) * entityRate);
            const itemCount = Math.floor(Math.max(2, items.length * width * height / 200) * entityRate);

            // 敵
            if (enemies.length > 0) {
                for(let i=0; i<enemyCount; i++) {
                    const pos = getRandomPos();
                    if(pos) {
                        const proto = enemies[Math.floor(Math.random() * enemies.length)];
                        const newObj = JSON.parse(JSON.stringify(proto));
                        // ★修正
                        newObj.id = "gen_enemy_" + i;
                        newObj.x = pos.x; newObj.y = pos.y;
                        newObjects.push(newObj);
                    }
                }
            }

            // アイテム
            if (items.length > 0) {
                for(let i=0; i<itemCount; i++) {
                    const pos = getRandomPos();
                    if(pos) {
                        const proto = items[Math.floor(Math.random() * items.length)];
                        const newObj = JSON.parse(JSON.stringify(proto));
                        // ★修正
                        newObj.id = "gen_item_" + i;
                        newObj.x = pos.x; newObj.y = pos.y;
                        newObjects.push(newObj);
                    }
                }
            }
            
            // 装飾
            if (decos.length > 0) {
                const decoCount = Math.floor(totalCells * 0.05);
                for(let i=0; i<decoCount; i++) {
                    const pos = getRandomPos();
                    if(pos) {
                        const proto = decos[Math.floor(Math.random() * decos.length)];
                        const newObj = JSON.parse(JSON.stringify(proto));
                        // ★修正
                        newObj.id = "gen_deco_" + i;
                        newObj.x = pos.x; newObj.y = pos.y;
                        newObjects.push(newObj);
                    }
                }
            }
        }

        sourceObjects = newObjects;
    }

    mapEngine.activeObjects = sourceObjects.filter(function(obj) {
        if (typeof checkCondition === 'function' && !checkCondition(obj)) return false;
        
        if (obj.id && obj.keepDestroyed) {
            const key = mapId + "_" + obj.id;
            if (gameState._sys_destroyed && gameState._sys_destroyed[key]) {
                return false; 
            }
        }
        return true;
    });
// マップ上の全オブジェクトを1回のループで初期化
    mapEngine.activeObjects.forEach(function(obj) {
        // --- 1. エネミー(敵)のマスターデータ同期 ---
        if (obj.roleType === 'enemy' && obj.enemyId && gameData.enemies && gameData.enemies[obj.enemyId]) {
            const master = gameData.enemies[obj.enemyId];
            obj.name = master.name;
            obj.hp = master.hp || 10;
            obj.stamina = master.stamina || 100;
            obj.staminaRegen = master.staminaRegen || 10;
            obj.atk = master.atk || 1;
            obj.def = master.def || 0;
            obj.exp = master.exp || 10;
            obj.penetration = master.pen || 1;
            obj.critRate = master.critRate || 5;
            obj.critMult = master.critMult || 1.5;
            obj.dropItemId = master.dropItemId || '';
            obj.dropRate = master.dropRate || 50;
            obj.hitParticleId = master.hitParticleId || '';
            obj.moveType = master.moveType || 'fixed';
            obj.spd = master.spd || 2;
            obj.onSightBehavior = master.onSightBehavior || 'normal';
            obj.aiPattern = master.aiPattern || 'tactical';
            obj.detectionRange = master.detectionRange || 0;
            obj.territoryRange = master.territoryRange || 0;
            obj.attackRange = master.attackRange || 32;
            obj.attackCooldown = master.attackCooldown || 60;
            obj.projectileSpeed = master.projectileSpeed || 0;
            obj.blastRadius = master.blastRadius || 0;
            obj.blastDamageRate = master.blastDamageRate || 50;
            obj.homingStrength = master.homingStrength || 0;
            obj.canStomp = !!master.canStomp;
            obj.w = master.w || 32;
            obj.h = master.h || 32;

            // ★追加: マスターのバトルイベントを同期する
            obj.hasBattleEvent = master.hasBattleEvent;
            obj.battleEvents = master.battleEvents ? JSON.parse(JSON.stringify(master.battleEvents)) : [];

            if (obj.visualType !== 'color') {
                obj.visualType = 'image';
                obj.charId = master.imageId;
                obj.charIdMove = master.imageIdMove;
                obj.charIdAttack = master.imageIdAttack;
                obj.charIdDamage = master.imageIdDamage;
            }
            if (master.modelId) {
                obj.modelId = master.modelId;
                obj.scale = master.modelScale !== undefined ? master.modelScale : 1.0;
                obj.modelY = master.modelY !== undefined ? master.modelY : 0;
            }
        }

        // --- 2. アイテムの配置設定同期 ---
        else if (obj.roleType === 'item' && obj.itemId && gameData.items[obj.itemId]) {
            const itemDef = gameData.items[obj.itemId];
            const pConf = itemDef.placement || { hp: 0, isWall: false }; 
            obj.hp = (pConf.hp !== undefined) ? Number(pConf.hp) : 0;
            obj.isWall = (pConf.isWall !== undefined) ? pConf.isWall : false;
            obj.destructible = (obj.hp > 0);
            obj.dropItemId = (obj.hp > 0) ? obj.itemId : '';
        }

        // --- 3. 全オブジェクト共通の実行時初期化 ---
        obj.currentX = obj.x * mapEngine.GRID; 
        obj.currentY = obj.y * mapEngine.GRID; 
        obj.startX = obj.currentX;
        obj.startY = obj.currentY;
        obj.isReturning = false;
        obj.moveTimer = 0; 
        obj.dirX = Math.random() > 0.5 ? 1 : -1; 
        obj.dirY = Math.random() > 0.5 ? 1 : -1; 
        obj._runtimeHp = undefined; 
        obj._isDead = false;
        obj._prevX = obj.currentX; 
        obj._prevY = obj.currentY;
        obj._dmgVisualTimer = 0; 
        obj._atkVisualTimer = 0;
        
        // サイズ計算
        const resolvedW = Number(resolveValue(obj.w !== undefined ? obj.w : mapEngine.GRID));
        const resolvedH = Number(resolveValue(obj.h !== undefined ? obj.h : mapEngine.GRID));
        obj.w = isNaN(resolvedW) ? mapEngine.GRID : resolvedW;
        obj.h = isNaN(resolvedH) ? mapEngine.GRID : resolvedH;
    });
mapEngine.canvas.width = container.clientWidth; 
    mapEngine.canvas.height = container.clientHeight; 
    mapEngine.eventCooldown = 60; 

    // --- ★追加: マップ遷移時のオートセーブ機能 ---
    // オートセーブが設定でONになっている場合、マップに入った瞬間にバックアップを保存する
    const settings = gameData.settings || {};
    if (settings.showAutoBtn !== false) {
        try {
            // セーブデータ作成
            const d = createSaveData();
            
            // IndexedDBのトランザクションを生成して保存 (非同期)
            // ※ openDB() は export.js 内に既存のものを利用
            openDB().then(db => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                store.put(d, 'autosave'); // キー名を 'autosave' としておく
                
                // UIへの通知 (画面右下に小さく表示)
                const autoSaveNotice = document.createElement('div');
                autoSaveNotice.textContent = "Auto Saving...";
                autoSaveNotice.style.cssText = "position:absolute; bottom:10px; right:10px; color:rgba(255,255,255,0.5); font-size:10px; pointer-events:none; z-index:9999;";
                document.body.appendChild(autoSaveNotice);
                
                setTimeout(() => {
                    if (autoSaveNotice.parentNode) autoSaveNotice.remove();
                }, 2000);
            }).catch(e => {
                console.warn("AutoSave failed:", e);
            });
        } catch (e) {
            console.warn("AutoSave process error:", e);
        }
    }
}
function endMapMode() { 
            isMapMode = false; layers.map.style.display = 'none'; ui.mapControls.classList.remove('active'); ui.mapActionContainer.classList.remove('active'); 
            if (layers.bg1) layers.bg1.style.display = 'block';
            if (layers.bg2) layers.bg2.style.display = 'block';

            // ★修正: マップの動画背景も、一時停止だけでなく完全にソースを破棄する
            if (mapEngine.isVideo && mapEngine.bgImage) { 
                mapEngine.bgImage.pause(); 
                mapEngine.bgImage.removeAttribute('src');
                mapEngine.bgImage.load();
                mapEngine.bgImage = null; 
            }
        }
function showDamagePopup(target, text, type) {
    if (type === undefined) type = 'damage';

    const s = gameData.settings || {};
    if (s.showPopups === false) return;

    const popup = document.createElement('div');
    popup.textContent = text;
    popup.className = 'damage-popup';
    
    if (type === true) type = 'critical'; 
    if (type === false) type = 'damage';
    popup.classList.add('popup-' + type);
    
    popup.style.zIndex = "9999";
    popup.style.position = 'absolute';
    popup.style.pointerEvents = 'none';

    let screenX, screenY;
    let isVisible = true;

    if (isMapMode && mapEngine.data) {
        const map = mapEngine.data;
        const grid = mapEngine.GRID;
        const zoom = mapEngine.currentZoom || 1.0;
        const p = mapEngine.player;
        
        const w = mapEngine.canvas.width;
        const h = mapEngine.canvas.height;
        const centerX = w / 2;
        const centerY = h / 2;

        // ターゲット座標 (World)
        let tX, tY, tZ, tH;
        if (target === p || target.isPlayer) {
            tX = target.x + (target.w || grid)/2;
            tY = target.y + (target.h || grid)/2;
            tZ = target.z || 0;
            tH = target.h || grid;
        } else {
            const baseX = (target.currentX !== undefined) ? target.currentX : (target.x * grid);
            const baseY = (target.currentY !== undefined) ? target.currentY : (target.y * grid);
            tX = baseX + (target.w || grid)/2;
            tY = baseY + (target.h || grid)/2;
            tZ = target.z || 0;
            tH = target.h || grid;
        }

        const pX = p.x + p.w/2;
        const pY = p.y + p.h/2;

        // --- モード別計算 ---
        if (map.type === '3d' || map.type === 'dungeon') {
            if (window.threeHandler) {
                const pos = window.threeHandler.getScreenPosition(tX - grid/2, tY - grid/2, tZ + tH + 16, w, h);
                if (pos) { screenX = pos.x; screenY = pos.y; } 
                else { isVisible = false; }
            } else { isVisible = false; }
        } 
        else if (map.type === 'quarter') {
            const TILE_W_HALF = grid * zoom; 
            const TILE_H_HALF = (grid / 2) * zoom;
            let dx = tX - pX; let dy = tY - pY;
            if (map.edgeType === 'loop') {
                const mapPixelW = map.width * grid; const mapPixelH = map.height * grid;
                if (dx < -mapPixelW/2) dx += mapPixelW; else if (dx > mapPixelW/2) dx -= mapPixelW;
                if (dy < -mapPixelH/2) dy += mapPixelH; else if (dy > mapPixelH/2) dy -= mapPixelH;
            }
            screenX = (dx - dy) * (TILE_W_HALF / grid) + centerX;
            screenY = (dx + dy) * (TILE_H_HALF / grid) + centerY - ((tZ + tH) * zoom);
        }
        else if (map.type === 'mode7') {
            let dx = tX - pX; let dy = tY - pY;
            if (map.edgeType === 'loop') {
                const mapPixelW = map.width * grid; const mapPixelH = map.height * grid;
                if (dx < -mapPixelW/2) dx += mapPixelW; else if (dx > mapPixelW/2) dx -= mapPixelW;
                if (dy < -mapPixelH/2) dy += mapPixelH; else if (dy > mapPixelH/2) dy -= mapPixelH;
            }
            const cos = Math.cos(p.dir); const sin = Math.sin(p.dir);
            const rotY = dx * cos + dy * sin; const rotX = dy * cos - dx * sin; 
            if (rotY > 10) {
                const camZ = (h * 1.0) / zoom; const scale = camZ / rotY; 
                screenX = w / 2 + (rotX * scale); 
                screenY = h / 2 + scale - ((tZ + tH) * scale / grid);
            } else { isVisible = false; }
        }
        else if (map.type === 'belt' || map.type === 'trapezoid') {
            const PERSPECTIVE = (map.type === 'belt') ? 600 : 200;
            const vpDist = PERSPECTIVE / zoom;
            const relX = tX - pX; const relY = tY - pY;
            const distFromVP = relY + vpDist;
            let scale = distFromVP / vpDist; if (scale < 0.1) scale = 0.1;
            screenX = centerX + relX * scale;
            screenY = centerY + relY * scale - ((tZ + tH) * scale);
        }
        else if (map.type === 'adventure') {
            const camX = Math.floor(mapEngine.camera.x || 0);
            const camY = Math.floor(mapEngine.camera.y || 0);
            screenX = (tX - camX) * zoom;
            screenY = (tY - camY) * zoom - (tZ + tH) * zoom;
        }
        else {
            // ★★★ Standard 2D (Topdown / Side / Shooter) 修正箇所 ★★★
            // カメラのオフセット計算 (Clamp対応)
            // プレイヤー中心(pX, pY)を基準にカメラ位置を算出
            let offX = -(pX) * zoom + (w/2);
            let offY = -(pY) * zoom + (h/2);
            
            if (map.edgeType !== 'loop') {
                const mapW = map.width * grid * zoom;
                const mapH = map.height * grid * zoom;
                // 画面よりマップが小さい場合は中央寄せ、大きい場合は端で止める
                if (mapW < w) offX = (w - mapW) / 2;
                else { 
                    if (offX > 0) offX = 0; 
                    if (offX < w - mapW) offX = w - mapW; 
                }
                
                if (mapH < h) offY = (h - mapH) / 2;
                else { 
                    if (offY > 0) offY = 0; 
                    if (offY < h - mapH) offY = h - mapH; 
                }
            }

            // ループ処理 (簡易対応: プレイヤーとの距離で補正)
            if (map.edgeType === 'loop') {
                const mapPixelW = map.width * grid;
                const mapPixelH = map.height * grid;
                let dx = tX - pX;
                let dy = tY - pY;
                if (dx < -mapPixelW/2) dx += mapPixelW; else if (dx > mapPixelW/2) dx -= mapPixelW;
                if (map.type !== 'side') {
                    if (dy < -mapPixelH/2) dy += mapPixelH; else if (dy > mapPixelH/2) dy -= mapPixelH;
                }
                // ループ時はカメラ固定ではないので相対座標で計算
                screenX = centerX + dx * zoom;
                screenY = centerY + dy * zoom;
            } else {
                // クランプ時は計算したオフセット(offX, offY)を使って絶対座標から変換
                screenX = tX * zoom + offX;
                screenY = tY * zoom + offY;
            }

            // 高さ(Z)と身長(H)の分だけ上にずらす
            screenY -= (tZ + tH/2) * zoom;
        }
    } else {
        screenX = window.innerWidth / 2;
        screenY = window.innerHeight / 2;
    }

    if (!isVisible || isNaN(screenX) || isNaN(screenY)) return;

    const jitterX = (Math.random() - 0.5) * 40;
    const jitterY = (Math.random() - 0.5) * 20;

    popup.style.left = (screenX + jitterX) + 'px';
    popup.style.top = (screenY + jitterY - 20) + 'px';

    const container = document.getElementById('game-container');
    if (container) {
        container.appendChild(popup);
        
        // ★最適化: 生成したポップアップを配列に登録する
        // (これにより、updateMapGameでquerySelectorAllを使わずに済む)
        activePopups.push(popup);
    }

    // ★最適化: setTimeoutでの削除は、要素が多いとズレるため廃止し、
    // updateMapGameの中でタイマー(life)が切れた時に一括で削除する方式に統一します。
}

function updateMapGame(dt) {
    const safeDt = Math.min(dt, 100);
    const timeScale = safeDt / 16.666;
    
    const p = mapEngine.player;
    const map = mapEngine.data;
    const grid = mapEngine.GRID;
    const settings = gameData.settings || {};
    const pData = gameData.player || {};

    if (!mapEngine.prevKeys) mapEngine.prevKeys = {};
    if (!mapEngine.keys) mapEngine.keys = {};

    // 死亡時は更新停止
    if (playerState._isDeadTriggered) {
        p.vx = 0; p.vy = 0; 
        return; 
    }

    const getVal = (val, def) => {
        const res = resolveValue(val);
        return (res !== undefined && res !== null && !isNaN(res)) ? Number(res) : def;
    };

    // --- 1. ステータス管理 ---
    if (playerState.$maxStamina === undefined) playerState.$maxStamina = getVal(pData.maxStamina, 100);
    if (playerState.$maxMagazine === undefined) playerState.$maxMagazine = getVal(pData.magazineSize, 30);
    if (playerState.$maxHp === undefined) playerState.$maxHp = getVal(pData.maxHp, 10);

    const maxSt = Number(playerState.$maxStamina) || 100;
    const maxMag = Number(playerState.$maxMagazine) || 30;
    const maxHp = Number(playerState.$maxHp) || 10;

    if (playerState.$stamina === undefined) playerState.$stamina = maxSt;
    if (playerState.$magazine === undefined) playerState.$magazine = maxMag;
    if (playerState.$hp === undefined) playerState.$hp = maxHp;

    if (playerState.$stamina > maxSt) playerState.$stamina = maxSt;
    if (playerState.$magazine > maxMag) playerState.$magazine = maxMag;
    if (playerState.$hp > maxHp) playerState.$hp = maxHp;

    if (playerState.isReloading === undefined) playerState.isReloading = false;
    if (playerState.$forceOn === undefined) playerState.$forceOn = 0;
    if (playerState.$forceX === undefined) playerState.$forceX = 0;
    if (playerState.$forceY === undefined) playerState.$forceY = 0;
    if (playerState.$forceSpd === undefined) playerState.$forceSpd = 0;

   const stRegen = playerState.staminaRegen || 20;

    if (playerState.isExhausted) {
        playerState.exhaustionTimer -= safeDt / 1000;
        if (playerState.exhaustionTimer <= 0) {
            playerState.isExhausted = false;
            if (typeof showDamagePopup === 'function') showDamagePopup(mapEngine.player, "RECOVER!", 'heal');
            
            // ★修正: 復帰時にスタミナを最低限保証する
            if (pData.exhaustionRecover === 'full') {
                playerState.$stamina = maxSt;
            } else {
                // 徐々に回復設定でも、すぐにスタミナ切れでハメられないよう20%は即時回復させる
                const curStNum = Number(playerState.$stamina) || 0;
                playerState.$stamina = Math.max(curStNum, maxSt * 0.2);
            }
        }
    } else {
        if ((Number(playerState.$stamina) || 0) < maxSt) {
            playerState.$stamina = (Number(playerState.$stamina) || 0) + stRegen * (safeDt / 1000);
            if (playerState.$stamina > maxSt) playerState.$stamina = maxSt;
        }
    }

if (playerState.isReloading) {
        playerState.reloadTimer -= safeDt / 1000;
        if (playerState.reloadTimer <= 0) {
            playerState.isReloading = false;
            playerState.$magazine = Number(playerState.$maxMagazine) || 30;
        }
    }
    
    // ★最適化: DOM検索(querySelectorAll)を廃止し、キャッシュした配列を処理する
    if (activePopups.length > 0) {
        for (let i = activePopups.length - 1; i >= 0; i--) { // ★ let を追加
            const popup = activePopups[i];
            
            // データセットから寿命とY座標を取得 (初期値設定もここで行う)
            let life = popup.dataset.life ? parseFloat(popup.dataset.life) : 800; // 800ms
            let y = popup.dataset.y ? parseFloat(popup.dataset.y) : 0;

            life -= safeDt;
            
            if (life <= 0) {
                // 寿命が切れたら画面から消し、配列からも削除
                popup.remove();
                activePopups.splice(i, 1);
            } else {
                // 更新
                popup.dataset.life = life;
                y -= 1 * timeScale; // 上へ移動
                popup.dataset.y = y;
                // 透明度も徐々に下げる（フェードアウト演出の追加）
                const alpha = Math.max(0, life / 800);
                popup.style.opacity = alpha;
                // 元のtransform(位置のバラつき等)を維持したままY移動を重ねる
                // ※生成時の位置(left, top)に jitter が含まれているため、translateY だけ足せばOK
                popup.style.transform = 'translate(-50%, calc(-50% + ' + y + 'px))';
            }
        }
    }

    // --- 2. 移動・入力処理 ---
    const baseZoom = map.zoom || 1.0;
    const varZoom = resolveValue(gameState['camera_zoom']);
    const dynamicZoom = (varZoom !== undefined && varZoom !== null && !isNaN(varZoom)) ? Number(varZoom) : 1.0;
      const gravitySetting = (map.gravity !== undefined && map.gravity !== "") ? map.gravity : "1.0";
    let gMult = Number(resolveValue(gravitySetting));
    if (isNaN(gMult)) gMult = 1.0; 
    
    // 全モード共通で使う「基本の重力値」をここで変数にしておく
    const gravity = (0.4 * gMult) * timeScale;
    const isConversing = ui.textBox.style.display !== 'none';
    const btnConfig = settings.actionButtons || [];
    let isDash = false; 
    let isAttackTrigger = false; 
    let isCheckTrigger = false; 
    let isJumpTrigger = false;
    let isInvincibleAction = false;
    let isGuardAction = false;
    let isDodgeTrigger = false; // ★追加: 回避トリガー
    
    const isForcedMove = (Number(resolveValue(playerState.$forceOn)) === 1);

    if (isConversing) {
        p.vx = 0; p.vy = 0;
    } else if (isForcedMove) {
        const tx = (getVal(playerState.$forceX, 0)) * grid;
        const ty = (getVal(playerState.$forceY, 0)) * grid;
        const spdVal = getVal(playerState.$forceSpd, 0);
        
        if (spdVal <= 0) {
            p.x = tx; p.y = ty; playerState.$forceOn = 0; 
        } else {
            // ★追加: スタック判定用のカウンター初期化
            if (p._forceStackTimer === undefined) p._forceStackTimer = 0;

            const speed = spdVal * timeScale;
            const dx = tx - p.x; const dy = ty - p.y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            // 前回の位置から動けていないかを判定
            const isStuck = (p._prevForceX !== undefined && Math.abs(p.x - p._prevForceX) < 0.1 && Math.abs(p.y - p._prevForceY) < 0.1);
            p._prevForceX = p.x;
            p._prevForceY = p.y;

            if (isStuck) p._forceStackTimer += timeScale;
            else p._forceStackTimer = 0;

            // 目的地に到着、または一定時間(約1秒=60F)引っかかったら強制終了
            if (dist <= speed || p._forceStackTimer > 60) {
                p.x = tx; p.y = ty; p.vx = 0; p.vy = 0; playerState.$forceOn = 0; 
                p._forceStackTimer = 0;
            } else {
                const ratio = speed / dist; p.vx = dx * ratio; p.vy = dy * ratio;
                p.x += p.vx; p.y += p.vy;
                if (map.type === '3d' || map.type === 'dungeon') { p.dir = Math.atan2(dy, dx); } 
                else { if (Math.abs(dx) > Math.abs(dy)) p.dir = dx > 0 ? 0 : Math.PI; else p.dir = dy > 0 ? Math.PI/2 : -Math.PI/2; }
            }
        }
    } else {
        btnConfig.forEach(function(btn) {
            if (!btn.key) return; 
            const isPressed = !!mapEngine.keys[btn.key];
            const isTrigger = isPressed && !mapEngine.prevKeys[btn.key];
            
            if (btn.type === 'custom' && btn.targetVar) gameState[btn.targetVar] = isPressed ? 1 : 0;
            else if (btn.type === 'toggle_var' && btn.targetVar && isTrigger) { const val = getVal(gameState[btn.targetVar], 0); gameState[btn.targetVar] = val === 0 ? 1 : 0; }
            else if (btn.type === 'add_var' && btn.targetVar && isTrigger) { const val = getVal(gameState[btn.targetVar], 0); gameState[btn.targetVar] = val + 1; 
            }else if (btn.type === 'toggle_view' && isTrigger) {
                // 現在の値を取得 (なければ0=TPS)
                const curMode = Number(gameState['camera_view_mode']) || 0;
                // 切り替え (0なら1、1なら0)
                const nextMode = (curMode === 0) ? 1 : 0;
                gameState['camera_view_mode'] = nextMode;
                
                // ポップアップで通知
                if (typeof showDamagePopup === 'function') {
                    showDamagePopup(mapEngine.player, nextMode === 1 ? "FPS Mode" : "TPS Mode", 'system');
                }
            }
          else if (btn.type === 'use_item' && btn.itemId && isTrigger) { 
                if (playerState.inventory && playerState.inventory[btn.itemId] > 0) { 
                    if (typeof useItem === 'function') useItem(btn.itemId); 
                } 
            } 
            // ★追加: アイテム配置 (固定)
            else if (btn.type === 'place_item' && btn.itemId && isTrigger) {
                if (typeof placeItem === 'function') placeItem(btn.itemId);
            }
            
            // 既存: 任意アイテム使用 (スロット)
            else if (btn.type === 'assignable_item' && btn.targetVar && isTrigger) { 
                const assignedId = (playerState.shortcuts || {})[btn.targetVar]; 
                if (assignedId && playerState.inventory && playerState.inventory[assignedId] > 0) { 
                    if (typeof useItem === 'function') useItem(assignedId); 
                } else { 
                    if (typeof showDamagePopup === 'function') showDamagePopup(p, assignedId ? "Empty" : "No Item", 'system'); 
                } 
            }
            // ★追加: 任意アイテム配置 (スロット)
            else if (btn.type === 'assignable_place' && btn.targetVar && isTrigger) { 
                const assignedId = (playerState.shortcuts || {})[btn.targetVar]; 
                if (assignedId) { 
                    if (typeof placeItem === 'function') placeItem(assignedId); 
                } else { 
                    if (typeof showDamagePopup === 'function') showDamagePopup(p, "No Item", 'system'); 
                } 
            }

            if (!isPressed) return;
            let mode = btn.type;
            if (mode === 'variable_mode') { const val = getVal(gameState['player_act_mode'], playerState.$actMode || 0); const modes = ['check', 'attack', 'dash', 'jump']; mode = modes[val] || 'check'; }
            
            if (mode === 'dash') isDash = true;
            if (mode === 'guard') isGuardAction = true;
            if (mode === 'invincible') isInvincibleAction = true;

            // ★修正: トリガー（押した瞬間）だけ入力を受け付けるアクション
            if (isTrigger) {
                if (mode === 'attack') isAttackTrigger = true; 
                if (mode === 'check') isCheckTrigger = true;
                if (mode === 'jump') isJumpTrigger = true;
                if (mode === 'dodge') isDodgeTrigger = true; // ★追加
            }

            if (mode === 'lockon' && isTrigger) {
                if (playerState.$isLockedOn) {
                    playerState.$isLockedOn = 0;
                    playerState.$lockonTargetId = null;
                } else {
                    let nearest = null;
                    let minDist = 99999;
                    const pX = mapEngine.player.x + mapEngine.player.w/2; // 中心座標
                    const pY = mapEngine.player.y + mapEngine.player.h/2;
                    
                    // ★視線チェック関数 (簡易Raycast)
                    const checkLoS = (tx, ty) => {
                        const dist = Math.sqrt((tx-pX)**2 + (ty-pY)**2);
                        const steps = Math.ceil(dist / (mapEngine.GRID/2));
                        for(let i=1; i<steps; i++) {
                            const t = i/steps;
                            const cx = pX + (tx-pX)*t;
                            const cy = pY + (ty-pY)*t;
                            const gx = Math.floor(cx/mapEngine.GRID);
                            const gy = Math.floor(cy/mapEngine.GRID);
                            // 壁があれば視線が通らない
                            if (mapEngine.activeObjects.some(o => o.x===gx && o.y===gy && o.isWall)) {
                                return false;
                            }
                        }
                        return true;
                    };

                    mapEngine.activeObjects.forEach(function(obj) {
                        // 敵かつ生存中のみ
                        if (obj.roleType === 'enemy' && !obj._isDead) {
                            const ox = (obj.currentX !== undefined ? obj.currentX : obj.x * mapEngine.GRID) + (obj.w||mapEngine.GRID)/2;
                            const oy = (obj.currentY !== undefined ? obj.currentY : obj.y * mapEngine.GRID) + (obj.h||mapEngine.GRID)/2;
                            const dist = Math.sqrt(Math.pow(pX - ox, 2) + Math.pow(pY - oy, 2));
                            
                            // 距離チェック(15マス以内) ＆ 視線チェック
                            if (dist < minDist && dist < mapEngine.GRID * 15) {
                                if (checkLoS(ox, oy)) {
                                    minDist = dist;
                                    nearest = obj;
                                }
                            }
                        }
                    });
                    
                    if (nearest) {
                        playerState.$isLockedOn = 1;
                        playerState.$lockonTargetId = nearest.id;
                        // ロックオン成功時の演出
                        if(typeof showDamagePopup === 'function') showDamagePopup(nearest, "LOCK ON", 'system');
                    }
                }
            }
                
            
        });
        
        if (playerState.isExhausted && pData.exhaustionNoAction) {
            isDash = false; isAttackTrigger = false; isJumpTrigger = false; isInvincibleAction = false;
        }
        if (playerState.isExhausted && pData.exhaustionMove === 'stop') {
            isDash = false;
            mapEngine.keys['ArrowUp'] = false; mapEngine.keys['ArrowDown'] = false;
            mapEngine.keys['ArrowLeft'] = false; mapEngine.keys['ArrowRight'] = false;
            mapEngine.keys['KeyW'] = false; mapEngine.keys['KeyS'] = false;
            mapEngine.keys['KeyA'] = false; mapEngine.keys['KeyD'] = false;
        }
        
        const keyUp = mapEngine.keys['ArrowUp'] || mapEngine.keys['KeyW'];
        const keyDown = mapEngine.keys['ArrowDown'] || mapEngine.keys['KeyS'];
        const keyLeft = mapEngine.keys['ArrowLeft'] || mapEngine.keys['KeyA'];
        const keyRight = mapEngine.keys['ArrowRight'] || mapEngine.keys['KeyD'];
        
       if (p.z === undefined) p.z = 0; if (p.vz === undefined) p.vz = 0;
        let currentSpeed = (playerState.$spd !== undefined) ? Number(playerState.$spd) : 4.0;

        // ★追加: 回避(Dodge)のタイマー管理と実行
        if (p._dodgeTimer === undefined) p._dodgeTimer = 0;
        
        if (p._dodgeTimer > 0) {
            p._dodgeTimer -= timeScale;
            // 回避中は操作を受け付けず、専用の速度ベクトルで強制移動する
            p.vx = p._dodgeVx || 0;
            p.vy = p._dodgeVy || 0;
            p.invincible = 5; // 回避中は常に無敵を更新
            
            // ★回避中はこれ以下のダッシュや通常移動の処理をスキップさせるため、
            // currentSpeed を 0 にして疑似的にキー入力を無効化する
            currentSpeed = 0;
        } 
        else if (isDodgeTrigger && !isConversing && !isForcedMove && !playerState.isExhausted) {
            let canDodge = true;
            if (pData.dodgeConsume !== false) {
                const cost = getVal(pData.dodgeCost, 15);
                if (playerState.$stamina >= cost) {
                    playerState.$stamina -= cost;
                } else {
                    canDodge = false;
                    // スタミナ切れで回避しようとすると疲労状態へ
                    playerState.isExhausted = true;
                    playerState.exhaustionTimer = getVal(pData.exhaustionDuration, 3.0);
                    if (typeof showDamagePopup === 'function') showDamagePopup(mapEngine.player, "TIRED...", 'system');
                }
            }
            
            if (canDodge) {
                p._dodgeTimer = 15; // 回避の継続フレーム(約0.25秒)
                const dSpdMult = getVal(pData.dodgeSpeed, 3.0);
                
                // 入力方向、なければ向いている方向へ飛ぶ
                let dx = 0, dy = 0;
                if (keyLeft) dx = -1; if (keyRight) dx = 1; if (keyUp) dy = -1; if (keyDown) dy = 1;
                
                if (dx === 0 && dy === 0) {
                    dx = Math.cos(p.dir);
                    dy = Math.sin(p.dir);
                    if (map.type === 'side') { dx = (Math.cos(p.dir) > 0) ? 1 : -1; dy = 0; }
                } else {
                    const len = Math.sqrt(dx*dx + dy*dy);
                    dx /= len; dy /= len;
                }
                
                const baseSpd = (playerState.$spd !== undefined) ? Number(playerState.$spd) : 4.0;
                p._dodgeVx = dx * baseSpd * dSpdMult;
                p._dodgeVy = dy * baseSpd * dSpdMult;
                
                // 無敵時間付与
                p.invincible = getVal(pData.dodgeInvincible, 20);
                if (typeof showDamagePopup === 'function') showDamagePopup(p, "DODGE", 'system');
                spawnParticle('spark', p.x+p.w/2, p.y+p.h/2, { z: p.z, count: 5 });
                
                currentSpeed = 0; // このフレームは通常移動させない
            }
        }

        let canDash = isDash;
        if (isDash && pData.dashConsume) {
            const cost = (getVal(pData.dashCost, 0.5)) * timeScale;
            if (playerState.$stamina >= cost) {
                playerState.$stamina -= cost;
            } else {
                canDash = false;
            }
        }
        if (canDash) currentSpeed *= 2.0; // ダッシュは2倍速 (実数値8.0相当)
        
        if (playerState.$stamina <= 0 && !playerState.isExhausted) {
            playerState.isExhausted = true;
            playerState.exhaustionTimer = getVal(pData.exhaustionDuration, 3.0);
            if (typeof showDamagePopup === 'function') showDamagePopup(mapEngine.player, "TIRED...", 'system');
        }

        // ★修正: 疲労状態による移動速度のペナルティ (slow) を実際に適用
        if (playerState.isExhausted && pData.exhaustionMove === 'slow') {
            currentSpeed *= 0.5;
        }

        p._currentSpeed = currentSpeed; 

        if (isInvincibleAction && !isConversing) {
            let canInvincible = true;
            if (pData.invincibleConsume) {
                const cost = getVal(pData.invincibleCost, 1.0) * timeScale;
                if (playerState.$stamina >= cost) {
                    playerState.$stamina -= cost;
                } else {
                    canInvincible = false;
                    if (!playerState.isExhausted) {
                        playerState.isExhausted = true;
                        playerState.exhaustionTimer = getVal(pData.exhaustionDuration, 3.0);
                        if (typeof showDamagePopup === 'function') showDamagePopup(mapEngine.player, "TIRED...", 'system');
                    }
                }
            }
    
            if (canInvincible) {
                if (p.invincible < 5) p.invincible = 5; 
            }
        }

                const PARRY_WINDOW = 0.2; // パリィ受付時間(秒)

        // ガード中でかつ、会話中などでなければ
        if (isGuardAction && !isConversing && !isForcedMove) {
            let canGuard = true;

            // スタミナ消費
            if (pData.guardConsume) {
                const cost = getVal(pData.guardCost, 0.5) * timeScale;
                if (playerState.$stamina >= cost) {
                    playerState.$stamina -= cost;
                } else {
                    canGuard = false; // スタミナ切れでガード不可
                    // 疲労発生
                    if (!playerState.isExhausted) {
                        playerState.isExhausted = true;
                        playerState.exhaustionTimer = getVal(pData.exhaustionDuration, 3.0);
                        if (typeof showDamagePopup === 'function') showDamagePopup(mapEngine.player, "TIRED...", 'system');
                    }
                }
            }

            // 疲労中でアクション禁止設定ならガード不可
            if (playerState.isExhausted && pData.exhaustionNoAction) {
                canGuard = false;
            }

            if (canGuard) {
                // ガード開始の瞬間
                if (!p.isGuarding) {
                    p.isGuarding = true;
                    p.parryTimer = PARRY_WINDOW; // パリィ受付開始
                }
                
                // パリィタイマー減少 (秒単位)
                if (p.parryTimer > 0) {
                    p.parryTimer -= safeDt / 1000;
                }

                // ガード中は移動速度半減 (歩き状態)
                p._currentSpeed *= 0.5;
            } else {
                // ガード維持できず解除
                p.isGuarding = false;
                p.parryTimer = 0;
            }
        } else {
            // ボタンを離した
            p.isGuarding = false;
            p.parryTimer = 0;
        }

        let lockOnTarget = null;
        if (playerState.$isLockedOn && playerState.$lockonTargetId) {
            lockOnTarget = mapEngine.activeObjects.find(function(o) { return o.id === playerState.$lockonTargetId && !o._isDead; });
            if (!lockOnTarget) {
                playerState.$isLockedOn = 0;
                playerState.$lockonTargetId = null;
            }
        }

        let camAngle = tpsCameraAngle.horizontal || 0;
        const crosshairConfig = hudElements['crosshair'] || {};
        const lockType = crosshairConfig.lockonType || 'attack';
        const isPlayerLocked = lockOnTarget && (lockType === 'attack' || lockType === 'both');
        const isCameraLocked = lockOnTarget && (lockType === 'camera' || lockType === 'both');
        
          if (lockOnTarget) {
            const tx = (lockOnTarget.currentX !== undefined ? lockOnTarget.currentX : lockOnTarget.x * grid) + grid/2;
            const ty = (lockOnTarget.currentY !== undefined ? lockOnTarget.currentY : lockOnTarget.y * grid) + grid/2;
            const targetAngle = Math.atan2(ty - (p.y + p.h/2), tx - (p.x + p.w/2));
            
            // ★追加: 角度の滑らかな補間 (Lerp)
            const lerpAngle = (current, target, factor) => {
                let diff = target - current;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                return current + diff * factor;
            };

            const turnSpeed = 0.15 * timeScale; // 補間の強さ

            if (isCameraLocked) {
                tpsCameraAngle.horizontal = lerpAngle(tpsCameraAngle.horizontal, targetAngle, turnSpeed);
                camAngle = tpsCameraAngle.horizontal;
            }
            if (isPlayerLocked) {
                p.dir = lerpAngle(p.dir, targetAngle, turnSpeed);
            }

            if (map.type === '3d' || map.type === 'dungeon') {
                const targetZ = (lockOnTarget.z || 0) + (lockOnTarget.h || grid)/2; 
                const playerZ = (p.z || 0) + (p.h || grid)/2; 
                const distV = targetZ - playerZ; 
                const dx = tx - (p.x + p.w/2); 
                const dy = ty - (p.y + p.h/2); 
                const distH = Math.sqrt(dx*dx + dy*dy);
                
                const targetPitch = Math.atan2(distV, distH);

                if (isPlayerLocked) { 
                    p.pitch = lerpAngle(p.pitch || 0, targetPitch, turnSpeed); 
                }
                if (isCameraLocked) { 
                    tpsCameraAngle.vertical = lerpAngle(tpsCameraAngle.vertical, 0.3 + (targetPitch * 0.5), turnSpeed); 
                }
            }
        }

        var moveX = 0, moveY = 0;

        if (map.type === '3d' || map.type === 'dungeon') {
            var _moveCamAngle = tpsCameraAngle.horizontal || 0; 
            var _cfX = Math.cos(_moveCamAngle); var _cfY = Math.sin(_moveCamAngle);
            var _crX = -Math.sin(_moveCamAngle); var _crY = Math.cos(_moveCamAngle);
            var _inF = 0; if (keyUp) _inF += 1; if (keyDown) _inF -= 1;
            var _inR = 0; if (keyRight) _inR += 1; if (keyLeft) _inR -= 1;
            if (_inF !== 0 || _inR !== 0) {
                var _len = Math.sqrt(_inF * _inF + _inR * _inR);
                moveX = (_cfX * (_inF / _len)) + (_crX * (_inR / _len)); 
                moveY = (_cfY * (_inF / _len)) + (_crY * (_inR / _len));
                moveX *= p._currentSpeed; moveY *= p._currentSpeed;
                if (!lockOnTarget) p.dir = Math.atan2(moveY, moveX);
            }
        } 
        else if (map.type === 'quarter') {
            var _dx = 0, _dy = 0;
            if (keyUp) { _dx -= 1; _dy -= 1; } if (keyDown) { _dx += 1; _dy += 1; } 
            if (keyLeft) { _dx -= 1; _dy += 1; } if (keyRight) { _dx += 1; _dy -= 1; } 
            if (_dx !== 0 || _dy !== 0) {
                var _len = Math.sqrt(_dx * _dx + _dy * _dy);
                moveX = (_dx / _len) * p._currentSpeed; moveY = (_dy / _len) * p._currentSpeed;
            }
            var _sDx = 0, _sDy = 0;
            if (keyUp) _sDy = -1; if (keyDown) _sDy = 1; if (keyLeft) _sDx = -1; if (keyRight) _sDx = 1;
            if ((_sDx !== 0 || _sDy !== 0) && !lockOnTarget) p.dir = Math.atan2(_sDy, _sDx);
        }
        else if (map.type === 'belt' || map.type === 'trapezoid') {
            var _dx = 0, _dy = 0;
            if (keyUp) _dy -= 1; if (keyDown) _dy += 1;
            if (keyLeft) _dx -= 1; if (keyRight) _dx += 1;
            if (_dx !== 0 || _dy !== 0) {
                var _len = Math.sqrt(_dx * _dx + _dy * _dy);
                moveX = (_dx / _len) * p._currentSpeed; moveY = (_dy / _len) * p._currentSpeed;
                if (!lockOnTarget) p.dir = Math.atan2(_dy, _dx);
            }
        }
        else if (map.type === 'mode7') {
            var _rotSpd = 0.05 * timeScale; 
            if (keyLeft) p.dir -= _rotSpd; if (keyRight) p.dir += _rotSpd; 
            var _spd = 0; 
            if (keyUp) _spd = p._currentSpeed; if (keyDown) _spd = -p._currentSpeed * 0.5; 
            if (_spd !== 0) { moveX = Math.cos(p.dir) * _spd; moveY = Math.sin(p.dir) * _spd; }
        }
        else if (map.type === 'side') {
            var _dx = 0;
            if (keyLeft) _dx = -1; if (keyRight) _dx = 1;
            moveX = _dx * p._currentSpeed;
            if (lockOnTarget && isPlayerLocked) {
                const tx = (lockOnTarget.currentX !== undefined ? lockOnTarget.currentX : lockOnTarget.x * grid) + grid/2;
                p.dir = (tx > p.x) ? 0 : Math.PI;
            } else if (_dx !== 0) {
                p.dir = (_dx > 0) ? 0 : Math.PI;
            }
        }
        else {
            // --- 2Dモード (Topdown / Shooter) ---
            var _dx = 0, _dy = 0; 
            if (keyLeft) _dx = -1; if (keyRight) _dx = 1; if (keyUp) _dy = -1; if (keyDown) _dy = 1; 
            if (_dx !== 0 && _dy !== 0) { const factor = 1 / Math.sqrt(2); _dx *= factor; _dy *= factor; }
            moveX = _dx * p._currentSpeed; moveY = _dy * p._currentSpeed;
            
            if (lockOnTarget && isPlayerLocked) {
                const tx = (lockOnTarget.currentX !== undefined ? lockOnTarget.currentX : lockOnTarget.x * grid) + grid/2;
                const ty = (lockOnTarget.currentY !== undefined ? lockOnTarget.currentY : lockOnTarget.y * grid) + grid/2;
                p.dir = Math.atan2(ty - (p.y+p.h/2), tx - (p.x+p.w/2));
            } else if (_dx !== 0 || _dy !== 0) { 
                p.dir = Math.atan2(_dy, _dx); 
            }
        }

        // --- 地形チェック関数 (全モード共通) ---
        // 1. まずは道具（checkTerrain）を作る (ここにお引越し！)
        var checkTerrain = function(tx, ty, currentZ) {
            let floorZ = 0; let hitWall = false;
            if (map.edgeType !== 'loop') {
                const mapPixelW = map.width * grid; const mapPixelH = map.height * grid;
                if (tx < 0 || tx + p.w > mapPixelW) hitWall = true;
                if (map.type !== 'side' && (ty < 0 || ty + p.h > mapPixelH)) hitWall = true;
            }
            
            // ★修正: プレイヤーの壁当たり判定を「足元のみ」に絞ることで、下に長く感じる現象を解消
            // 横スクロール(side)は全身、トップダウン等は下半分だけを判定にする
            const isSide = (map.type === 'side');
            const margin = 2; 
            const pl = tx + margin; 
            const pr = tx + p.w - margin; 
            const pt = ty + (isSide ? margin : p.h * 0.5); // 頭の判定を消して奥へ回り込めるようにする
            const pb = ty + p.h - margin;

            mapEngine.activeObjects.forEach(o => {
                if (!o.isWall || o._isDead) return;
                if (typeof checkCondition === 'function' && !checkCondition(o)) return;
                const ox = (o.currentX !== undefined ? o.currentX : o.x * grid);
                const oy = (o.currentY !== undefined ? o.currentY : o.y * grid);
                const oz = o.z || 0; const ow = o.w || grid; const oh = o.h || grid;
                
                if (pl < ox + ow && pr > ox && pt < oy + oh && pb > oy) {
                    const objTop = oz + grid; 
                    if (currentZ + 16 >= objTop) { if (objTop > floorZ) floorZ = objTop; } 
                    else if (currentZ < objTop && currentZ + p.h > oz) hitWall = true;
                }
            });
            return { floorZ, hitWall };
        };

        // 2. その道具を使って、移動を計算する (ここから移動ループ開始)
        const totalMoveX = moveX * timeScale;
        const totalMoveY = moveY * timeScale;
        const moveDist = Math.max(Math.abs(totalMoveX), Math.abs(totalMoveY));
        const steps = Math.max(1, Math.ceil(moveDist / 8));
        const stepX = totalMoveX / steps;
        const stepY = totalMoveY / steps;

        for (let i = 0; i < steps; i++) {
            let nextX = p.x + stepX;
            // 引数の最後に p.y を追加
            if (!getTerrainCollision(nextX, p.y, p.z, p.w, p.h, null, p.y).hitWall) p.x = nextX; else p.vx = 0; 
            
            if (map.type !== 'side') {
                let nextY = p.y + stepY;
                if (!getTerrainCollision(p.x, nextY, p.z, p.w, p.h, null, p.y).hitWall) p.y = nextY; else p.vy = 0; 
            }
        }
        if (map.edgeType === 'loop') {
            const mapPixelW = map.width * grid; const mapPixelH = map.height * grid;
            if (p.x < 0) p.x += mapPixelW; else if (p.x >= mapPixelW) p.x -= mapPixelW;
            if (map.type !== 'side') { if (p.y < 0) p.y += mapPixelH; else if (p.y >= mapPixelH) p.y -= mapPixelH; }
        }
    }
        // --- 強制スクロール (ベルトコンベア等) ---
        const sSpeed = (map.scrollSpeed !== undefined ? map.scrollSpeed : 1) * timeScale;
        if (map.scrollDir && map.scrollDir !== 'none') {
            if (map.scrollDir === 'right') p.x += sSpeed; else if (map.scrollDir === 'left') p.x -= sSpeed;
            else if (map.scrollDir === 'down') p.y += sSpeed; else if (map.scrollDir === 'up') p.y -= sSpeed;
            else if (map.scrollDir === 'rise') p.z = (p.z || 0) + sSpeed; else if (map.scrollDir === 'fall') p.z = (p.z || 0) - sSpeed;
        }
        if (map.type === 'shooter' || map.scrollDir === 'down') mapEngine.bgScrollY += sSpeed;
        else if (map.scrollDir === 'up') mapEngine.bgScrollY -= sSpeed;

        // 挟まれ判定
         if (map.crushEventNodeId && !playerState._isDeadTriggered) {
            if (getTerrainCollision(p.x, p.y, p.z, p.w, p.h, null).hitWall) {
                playerState._isDeadTriggered = true;
                if (typeof showDamagePopup === 'function') showDamagePopup(mapEngine.player, "CRUSHED!", 'damage');
                endMapMode(); processNode(map.crushEventNodeId); return;
            }
        }

      // --- 1. ジャンプ・重力処理 ---
        if (map.type === 'side') {
            // 【サイドビュー（横スクロール）モード：Y軸が高さ】
            if (p._jumpCount === undefined) p._jumpCount = 0;
            if (p._isWallSliding === undefined) p._isWallSliding = false;

            // 特殊床（ハシゴ・ジャンプ台）の処理
            let onLadder = false; let onJumpPad = false; let jumpPadPower = 0;
            const pRect = { l: p.x, r: p.x + p.w, t: p.y, b: p.y + p.h };
            mapEngine.activeObjects.forEach(obj => {
                const ox = (obj.currentX !== undefined ? obj.currentX : obj.x * grid);
                const oy = (obj.currentY !== undefined ? obj.currentY : obj.y * grid);
                if (pRect.l < ox + grid && pRect.r > ox && pRect.t < oy + grid && pRect.b > oy) {
                    if (obj.effectType === 'ladder') onLadder = true;
                    if (obj.effectType === 'jump') { onJumpPad = true; jumpPadPower = 18; }
                }
            });

            if (onLadder) {
                p.onGround = true; p.vy = 0; p._jumpCount = 0;
                if (keyUp) p.vy = -p._currentSpeed;
                if (keyDown) p.vy = p._currentSpeed;
                if (isJumpTrigger) p.vy = -10;
            } else if (onJumpPad) { 
                p.vy = -jumpPadPower; p.onGround = false; p._jumpCount = 1; 
            } else {
                p._isWallSliding = (!p.onGround && pData.wallJump && (keyLeft || keyRight));
                let wallDir = keyLeft ? -1 : (keyRight ? 1 : 0);
                
                // ★離脱判定：足元のすぐ下(2px)に床があるか確認。引数に p.y を渡す
                const ledgeCheck = getTerrainCollision(p.x, p.y + 2, p.z, p.w, p.h, null, p.y);
                if (!ledgeCheck.hitWall) p.onGround = false;

                if (!p.onGround) {
                    let currentGravity = gravity;
                    if (p._isWallSliding && p.vy > 0) { currentGravity *= 0.2; if (p.vy > 2) p.vy = 2; p._jumpCount = 0; }
                    p.vy += currentGravity;
                    if (p.vy > 16) p.vy = 16;
                } else {
                    p.vy = 0; 
                }

                let nextY = p.y + p.vy * timeScale;
                
                if (p.vy > 0) {
                    // 下降中：床への着地判定
                    const fallCheck = getTerrainCollision(p.x, nextY, p.z, p.w, p.h, null, p.y);
                    if (fallCheck.hitWall && fallCheck.hitY_Bottom !== null) { 
                        // ★3. 座標を整数に丸めてスナップし、描画のズレを消滅させる
                        p.y = Math.round(fallCheck.hitY_Bottom - p.h); 
                        p.vy = 0; 
                        p.onGround = true; 
                        p._jumpCount = 0; 
                    } else { p.y = nextY; }
                } else if (p.vy < 0) {
                    // 上昇中：天井への衝突判定
                    const riseCheck = getTerrainCollision(p.x, nextY, p.z, p.w, p.h, null, p.y);
                    if (riseCheck.hitWall && riseCheck.hitY_Top !== null) { 
                        p.y = Math.round(riseCheck.hitY_Top); 
                        p.vy = 0; 
                    } else { p.y = nextY; }
                } else {
                    if (!p.onGround) p.y = nextY;
                }

                // ジャンプ入力
                const isUpTrigger = (mapEngine.keys['ArrowUp'] || mapEngine.keys['KeyW']) && (!mapEngine.prevKeys['ArrowUp'] && !mapEngine.prevKeys['KeyW']);
                if (isJumpTrigger || (isUpTrigger && !pData.wallJump)) {
                    let canJump = false; let isWallJumping = false;
                    if (p.onGround) { canJump = true; p._jumpCount = 1; } 
                    else if (p._isWallSliding && pData.wallJump) { canJump = true; isWallJumping = true; } 
                    else if (p._jumpCount <= (pData.extraJumps || 0)) { canJump = true; p._jumpCount++; }

                    if (canJump && pData.jumpConsume) {
                        const cost = getVal(pData.jumpCost, 10);
                        if (playerState.$stamina >= cost) playerState.$stamina -= cost; 
                        else { canJump = false; /* 疲労処理は省略 */ }
                    }
                    if (canJump) {
                        p.vy = -getVal(pData.jumpPower, 8.0) * 1.5; 
                        p.onGround = false;
                        p.y -= 2; // ジャンプの瞬間に床から離す
                        if (isWallJumping) { p.x += -wallDir * 10; p.vx = -wallDir * p._currentSpeed * 1.5; }
                    }
                }
            }
        } else {
            // 【トップダウン / 3D等のモード：Z軸が高さ】
            const floorInfo = getTerrainCollision(p.x, p.y, p.z, p.w, p.h, null);
            const floor = floorInfo.floorZ;
            
            // 離脱判定
            if (p.z > floor) {
                p.onGround = false;
            } else if (p.z <= floor && p.vz <= 0) {
                // 接地ロック（振動防止）
                p.onGround = true;
                p.z = floor;
                p.vz = 0;
            }

            if (isJumpTrigger && p.onGround) {
                let canJump = true;
                // (スタミナ消費処理はサイドビューと同様なので省略)
                if (canJump) { 
                    p.vz = getVal(pData.jumpPower, 8.0); 
                    p.onGround = false; 
                    p.z += 2; // 瞬間に床から離す
                }
            }
            
            // 空中のみ重力を適用
            if (!p.onGround) {
                p.vz -= gravity; 
                if (p.vz < -16) p.vz = -16;
                // 天井判定
                if (p.vz > 0 && getTerrainCollision(p.x, p.y, p.z + p.h, p.w, p.h, null).hitWall) p.vz = 0; 
                p.z += p.vz * timeScale;
                
                // 落下着地スナップ
                const newFloor = getTerrainCollision(p.x, p.y, p.z, p.w, p.h, null).floorZ;
                if (p.z <= newFloor && p.vz < 0) {
                    p.z = newFloor;
                    p.vz = 0;
                    p.onGround = true;
                }
            }
        }

        // --- 2. クールダウン・タイマー処理 ---
        if (mapEngine.eventCooldown > 0) mapEngine.eventCooldown -= timeScale;

    // アイテムクールダウン
    if (playerState.itemCooldowns) {
        const dtSeconds = safeDt / 1000;
        for (const itemId in playerState.itemCooldowns) {
            if (playerState.itemCooldowns[itemId] > 0) {
                playerState.itemCooldowns[itemId] -= dtSeconds;
                if (playerState.itemCooldowns[itemId] < 0) playerState.itemCooldowns[itemId] = 0;
            }
        }
    }

    // バフタイマー
    if (playerState.activeBuffs && playerState.activeBuffs.length > 0) {
        const dtSeconds = safeDt / 1000;
        let changed = false;
        playerState.activeBuffs.forEach(buff => { buff.timer -= dtSeconds; });
        const prevLen = playerState.activeBuffs.length;
        playerState.activeBuffs = playerState.activeBuffs.filter(buff => buff.timer > 0);
        if (playerState.activeBuffs.length !== prevLen) {
            changed = true;
            if (typeof showDamagePopup === 'function') showDamagePopup(mapEngine.player, "Effect End", 'system');
        }
        recalculatePlayerStats();
    }

    // --- 3. 攻撃・ダメージ処理 ---
    if (p.attackCooldown > 0) p.attackCooldown -= timeScale; 
    if (p.invincible > 0) p.invincible -= timeScale;
if (!isConversing && !isForcedMove && isAttackTrigger && p.attackCooldown <= 0) {
        // ★追加: リロード中なら攻撃入力自体を完全に無視
        if (playerState.isReloading) return;

        let staminaCost = 0;
        if (pData.attackConsume) staminaCost = getVal(pData.attackCost, 20);

        if (playerState.$stamina >= staminaCost) {
            let canAttack = false;
            const useMagazine = pData.useMagazine || false;
            if (useMagazine) {
                if (playerState.$magazine > 0) { 
                    playerState.$magazine--; 
                    canAttack = true; 
                } 
                else { 
                    // ★修正: 弾切れで攻撃しようとした時のみリロード開始
                    playerState.isReloading = true; 
                    playerState.reloadTimer = getVal(pData.reloadTime, 2.0); 
                    if (typeof showDamagePopup === 'function') showDamagePopup(mapEngine.player, "RELOADING...", 'system');
                }
            } else {
                canAttack = true;
            }

            if (canAttack) {
                const finalCool = (playerState.attackCooldown !== undefined) ? playerState.attackCooldown : getVal(pData.attackCooldown, 20);
                p.attackCooldown = Math.max(5, finalCool);
                
                // ★修正: 攻撃成功後にスタミナを減らす
                playerState.$stamina -= staminaCost;
                
                // 攻撃によってスタミナが0になったら疲労状態にする
                if (playerState.$stamina <= 0 && !playerState.isExhausted) {
                    playerState.isExhausted = true;
                    playerState.exhaustionTimer = getVal(pData.exhaustionDuration, 3.0);
                    if (typeof showDamagePopup === 'function') showDamagePopup(mapEngine.player, "TIRED...", 'system');
                }
                
                // 1. 現在装填されている弾薬データを取得
                let ammoAtk = 0;
                let ammoSpeed = 0;
                let ammoPen = 0;
                let ammoRange = 0; 
                let ammoCrit = 0;  
                
                if (playerState.currentAmmoId && gameData.items[playerState.currentAmmoId]) {
                    const ammoItem = gameData.items[playerState.currentAmmoId];
                    const afx = ammoItem.effects || {};
                    const c = (v) => (v !== undefined && v !== "") ? Number(resolveValue(v)) : 0;

                    ammoAtk = c(afx.atk);
                    ammoSpeed = (afx.projSpeed !== undefined) ? c(afx.projSpeed) : c(afx.spd);
                    ammoPen = c(afx.penetration);
                    ammoRange = c(afx.range);       
                    ammoCrit = c(afx.critRate);     
                }

                // 2. パラメータ計算 (ベース + 弾薬補正)
                const baseSpd   = (playerState.projectileSpeed !== undefined) ? playerState.projectileSpeed : getVal(pData.projectileSpeed, 0);
                const bulletSpd = baseSpd + ammoSpeed;

                const baseRange = (playerState.attackRange !== undefined) ? playerState.attackRange : getVal(pData.attackRange, 32);
                const reach     = baseRange + ammoRange;

                const size      = (playerState.attackSize !== undefined) ? playerState.attackSize : getVal(pData.attackSize, 32);

                const baseCrit  = (playerState.criticalRate !== undefined) ? playerState.criticalRate : getVal(pData.criticalRate, 5);
                const critRate  = baseCrit + ammoCrit;   

                const basePen   = (playerState.penetration !== undefined) ? playerState.penetration : getVal(pData.penetration, 1);
                // ★修正: 弾薬によるマイナス補正で 0 以下にならないように、さらに強固にガード
                let finalPen  = basePen + ammoPen;
                if (finalPen < 1) finalPen = 1;

                const blastR = (playerState.blastRadius !== undefined) ? playerState.blastRadius : getVal(pData.blastRadius, 0);
                const blastRate = (playerState.blastDamageRate !== undefined) ? playerState.blastDamageRate : getVal(pData.blastDamageRate, 50);

                const dir = p.dir !== undefined ? p.dir : 0.5 * Math.PI;
                
                let atkX = p.x + p.w/2 + Math.cos(dir) * (bulletSpd > 0 ? 10 : reach) - (size/2);
                let atkY = p.y + p.h/2 + Math.sin(dir) * (bulletSpd > 0 ? 10 : reach) - (size/2);
                
                let atkZ = (p.z || 0) + (p.h / 2);
                
                let finalDmg = (playerState.$atk || 1) + ammoAtk; 
                if (playerState.isExhausted && pData.exhaustionAtkZero) finalDmg = 0;
                
                const currentCritMult = (playerState.criticalMultiplier !== undefined) 
                    ? Number(playerState.criticalMultiplier) : getVal(pData.criticalMultiplier, 2.0);
                
                const attackObj = { 
                    id: 'sys_player_atk_' + Date.now(), isPlayerAttack: true,
                    currentX: atkX, currentY: atkY, 
                    z: atkZ,
                    w: size, h: size, isHitbox: true,
                    life: (bulletSpd > 0 ? (reach / Math.max(1, bulletSpd)) : 10), 
                    damage: finalDmg, 
                    penetration: finalPen, 
                    isCritical: (Math.random() * 100) < critRate,
                    critMult: currentCritMult,
                    blastRadius: blastR,
                    blastDamageRate: blastRate,
                    hitList: []
                };
                
                if (bulletSpd > 0) {
                    attackObj.moveType = 'projectile'; 
                    attackObj.vx = Math.cos(dir) * bulletSpd; 
                    attackObj.vy = Math.sin(dir) * bulletSpd;
                    
                    if (map.type === '3d' || map.type === 'dungeon') {
                        const pit = p.pitch || 0; 
                        attackObj.vx = Math.cos(dir) * Math.cos(pit) * bulletSpd; 
                        attackObj.vy = Math.sin(dir) * Math.cos(pit) * bulletSpd; 
                        attackObj.vz = Math.sin(pit) * bulletSpd; 
                        attackObj.z = p.z + (p.h / 2);
                    }
                }
                
                mapEngine.activeObjects.push(attackObj);
            }
        } else {
            // ★修正: クールダウンが明けているのにスタミナが足りない場合のみ疲労付与
            if (!playerState.isExhausted) {
                playerState.isExhausted = true;
                playerState.exhaustionTimer = getVal(pData.exhaustionDuration, 3.0);
                if (typeof showDamagePopup === 'function') showDamagePopup(mapEngine.player, "TIRED...", 'system');
            }
        }
    }
    
    mapEngine.activeObjects = mapEngine.activeObjects.filter(function(obj) {
        if (!checkCondition(obj)) return false;

        // ★追加: 敵キャラの落下死チェック (サイドビューかつループなしの時)
        if (map.type === 'side' && map.edgeType !== 'loop') {
            const mapBottom = map.height * mapEngine.GRID;
            // オブジェクトの足元がマップの底を2マス分(64px)超えたら消去
            if ((obj.currentY || obj.y * mapEngine.GRID) > mapBottom + 64) {
                obj._isDead = true;
                return false; 
            }
        }
        
        if (obj.life !== undefined && obj.life > 0) {
            obj.life -= timeScale;
        }
        if (obj._invincible > 0) {
            obj._invincible -= timeScale;
        }

        obj._prevX = obj.currentX || obj.x * grid; obj._prevY = obj.currentY || obj.y * grid;
        if (obj._dmgVisualTimer > 0) obj._dmgVisualTimer -= timeScale;
        if (obj._atkVisualTimer > 0) obj._atkVisualTimer -= timeScale;
        if (obj._stompCooldown > 0) obj._stompCooldown -= timeScale;

        if (obj.itemId && (!obj.hp || obj.hp <= 0) && !obj.isWall && !obj._isPickedUp && !isConversing) {
            const ox = (obj.currentX !== undefined ? obj.currentX : obj.x * grid);
            const oy = (obj.currentY !== undefined ? obj.currentY : obj.y * grid);
            const oz = obj.z || 0; 
            
            const oRect = { l: ox, r: ox + grid, t: oy, b: oy + grid };
            const pRect = { l: p.x, r: p.x + p.w, t: p.y, b: p.y + p.h };

            const isOverlapping = (pRect.l < oRect.r && pRect.r > oRect.l && pRect.t < oRect.b && pRect.b > oRect.t && Math.abs((p.z||0) - oz) < grid);
            
            let isFacing = false;
            if (isCheckTrigger) {
                const reach = grid * 0.8;
                const dirX = Math.cos(p.dir);
                const dirY = Math.sin(p.dir);
                const checkX = (p.x + p.w/2) + dirX * reach;
                const checkY = (p.y + p.h/2) + dirY * reach;
                if (checkX > oRect.l && checkX < oRect.r && checkY > oRect.t && checkY < oRect.b) {
                    isFacing = true;
                }
            }

            const pickupType = obj.itemPickup || 'touch'; 
            let doPickup = false;

            if (pickupType === 'touch') {
                if (isOverlapping) doPickup = true;
            } else if (pickupType === 'action') {
                if (isCheckTrigger && (isOverlapping || isFacing)) doPickup = true;
            }

            if (doPickup) {
                if (!playerState.inventory) playerState.inventory = {};
                const currentQty = playerState.inventory[obj.itemId] || 0;
                const addItemDef = gameData.items[obj.itemId];
                if (addItemDef) {
                    const max = (addItemDef.maxStack !== undefined) ? addItemDef.maxStack : 99;
                    if (currentQty >= max) {
                        if (obj._fullMessageTimer === undefined || obj._fullMessageTimer <= 0) {
                            if (typeof showDamagePopup === 'function') showDamagePopup(mapEngine.player, "FULL!", 'system'); 
                            obj._fullMessageTimer = 60;
                        } else {
                            obj._fullMessageTimer -= timeScale;
                        }
                        return true; 
                    }
                }
                
                obj._isPickedUp = true;
                obj.damage = 0; 
                
                if (obj.keepDestroyed && obj.id) {
                    if (!gameState._sys_destroyed) gameState._sys_destroyed = {};
                    gameState._sys_destroyed[mapEngine.currentMapId + '_' + obj.id] = true;
                }
                
                playerState.inventory[obj.itemId] = (playerState.inventory[obj.itemId] || 0) + (obj.itemAmount || 1);
                
                const itemD = gameData.items[obj.itemId];
                if (itemD) {
                    if (typeof showDamagePopup === 'function') showDamagePopup(p, "GET: " + itemD.name, 'item');
                    if (itemD.effects && itemD.effects.sound && gameData.assets.sounds[itemD.effects.sound]) {
                        new Audio(gameData.assets.sounds[itemD.effects.sound].data).play();
                    }
                }
                return false; 
            }
        }

        const atkR = getVal(obj.attackRange, 0);
        if (!obj.isPlayer && !obj.isHitbox && !obj._isDead && atkR > 0) {
            if (obj._currentCool === undefined) obj._currentCool = Math.random() * 60;
            if (obj._currentCool > 0) obj._currentCool -= timeScale;
            else {
                const ox = (obj.currentX !== undefined ? obj.currentX : obj.x * grid) + grid/2;
                const oy = (obj.currentY !== undefined ? obj.currentY : obj.y * grid) + grid/2;
                const dist = Math.sqrt(Math.pow(p.x + p.w/2 - ox, 2) + Math.pow(p.y + p.h/2 - oy, 2));
                if (dist <= atkR) {
                    obj._currentCool = getVal(obj.attackCooldown, 60);
                    obj._atkVisualTimer = 20;
                    const bSpd = getVal(obj.projectileSpeed, 0);
                    const ang = Math.atan2(p.y + p.h/2 - oy, p.x + p.w/2 - ox);
                    const eAtk = { 
                        id: 'sys_e_atk_' + Date.now() + Math.random(), isHitbox: true, isEnemyAttack: true,
                        currentX: ox + Math.cos(ang)*grid/2 - grid/4, currentY: oy + Math.sin(ang)*grid/2 - grid/4, w: grid/2, h: grid/2,
                        life: (bSpd > 0 ? 120 : 15), 
                        damage: getVal(obj.damage, 1), 
                        homingStrength: getVal(obj.homingStrength, 0),
                        penetration: getVal(obj.penetration, 1),
                        blastRadius: getVal(obj.blastRadius, 0),
                        blastDamageRate: getVal(obj.blastDamageRate, 50),
                        isCritical: (Math.random() * 100) < getVal(obj.critRate, 5),
                        critMult: getVal(obj.critMult, 1.5)
                    };
                    if (bSpd > 0) { eAtk.moveType = 'projectile'; eAtk.vx = Math.cos(ang)*bSpd; eAtk.vy = Math.sin(ang)*bSpd; }
                    if(!mapEngine._newObjects) mapEngine._newObjects = []; mapEngine._newObjects.push(eAtk);
                }
            }
        }

        if (obj.moveType === 'projectile') {
            if (obj.isPlayerAttack && playerState.$isLockedOn && playerState.$lockonTargetId) {
                const target = mapEngine.activeObjects.find(o => o.id === playerState.$lockonTargetId);
                if (target && !target._isDead) {
                    const tx = (target.currentX !== undefined ? target.currentX : target.x * grid) + (target.w || grid) / 2;
                    const ty = (target.currentY !== undefined ? target.currentY : target.y * grid) + (target.h || grid) / 2;
                    const ox = obj.currentX + (obj.w || 0) / 2;
                    const oy = obj.currentY + (obj.h || 0) / 2;
                    const targetAngle = Math.atan2(ty - oy, tx - ox);
                    let currentAngle = Math.atan2(obj.vy, obj.vx);
                    let angleDiff = targetAngle - currentAngle;
                    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
                    const turnSpeed = 0.05 * timeScale;
                    currentAngle += Math.max(-turnSpeed, Math.min(turnSpeed, angleDiff));
                    const speed = Math.sqrt(obj.vx**2 + obj.vy**2);
                    if (speed > 0) {
                        obj.vx = Math.cos(currentAngle) * speed;
                        obj.vy = Math.sin(currentAngle) * speed;
                    }
                }
            } else if (obj.isEnemyAttack && obj.homingStrength > 0) {
                const target = mapEngine.player;
                const tx = target.x + target.w / 2;
                const ty = target.y + target.h / 2;
                const ox = obj.currentX + (obj.w || 0) / 2;
                const oy = obj.currentY + (obj.h || 0) / 2;
                
                const targetAngle = Math.atan2(ty - oy, tx - ox);
                let currentAngle = Math.atan2(obj.vy, obj.vx);
                let angleDiff = targetAngle - currentAngle;
                
                while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
                
                // ★修正: 対象との距離が近いほど誘導を強くする（衛星軌道バグの防止）
                const dist = Math.sqrt(Math.pow(tx - ox, 2) + Math.pow(ty - oy, 2));
                const distFactor = Math.max(1.0, 100 / Math.max(dist, 10)); // 近いと曲がりやすくなる
                
                const turnSpeed = obj.homingStrength * distFactor * timeScale;
                
                // 角度が180度逆の場合、真後ろを向く前に少し速度を落とす
                let speed = Math.sqrt(obj.vx**2 + obj.vy**2);
                if (Math.abs(angleDiff) > Math.PI * 0.75) {
                    speed *= 0.95;
                }
                
                currentAngle += Math.max(-turnSpeed, Math.min(turnSpeed, angleDiff));
                
                obj.vx = Math.cos(currentAngle) * speed;
                obj.vy = Math.sin(currentAngle) * speed;
            }
            
            const prevX = obj.currentX;
            const prevY = obj.currentY;
            const nextX = prevX + obj.vx * timeScale;
            const nextY = prevY + obj.vy * timeScale;
            const dist = Math.sqrt((nextX - prevX) ** 2 + (nextY - prevY) ** 2);
            const steps = Math.ceil(dist / (grid / 2)); 
            
            let hitWall = false;
             for (let i = 1; i <= steps; i++) {
                const t = i / steps;
                const chkX = prevX + (nextX - prevX) * t;
                const chkY = prevY + (nextY - prevY) * t;
                const gx = Math.floor((chkX + obj.w/2) / grid);
                const gy = Math.floor((chkY + obj.h/2) / grid);
                
                if (gx < 0 || gx >= map.width || gy < 0 || gy >= map.height) {
                    hitWall = true; break;
                }
                
                // ★修正: 装飾(deco)やアイテム(item)は弾をすり抜けるように明示的に除外
                const hitObj = mapEngine.activeObjects.find(o => 
                    o.x === gx && o.y === gy && 
                    o.roleType !== 'deco' && o.roleType !== 'item' &&
                    (o.isWall || (!o.destructible && o.roleType !== 'enemy'))
                );
                
                if (hitObj) {
                    const oTop = (hitObj.z || 0) + (hitObj.h || grid);
                    if ((obj.z || 0) < oTop) {
                        hitWall = true; break;
                    }
                }
            }

            if (hitWall) {
                return false; 
            }

            obj.currentX = nextX;
            obj.currentY = nextY;
            if (obj.z !== undefined && obj.vz !== undefined) obj.z += obj.vz * timeScale;
            const gxEnd = Math.floor((obj.currentX + obj.w/2)/grid);
            const gyEnd = Math.floor((obj.currentY + obj.h/2)/grid);
            if (gxEnd<0 || gxEnd>=map.width || gyEnd<0 || gyEnd>=map.height) return false;
        }

        const isHarmful = obj.isEnemyAttack || (obj.roleType === 'enemy');
        let enemyPower = getVal(obj.damage, 0) || getVal(obj.atk, 0);

        if (isHarmful && enemyPower > 0 && p.invincible <= 0) {
            const ox = obj.currentX !== undefined ? obj.currentX : obj.x * grid;
            const oy = obj.currentY !== undefined ? obj.currentY : obj.y * grid;
            const oz = obj.z || 0; const pz = p.z || 0;
            
            const viewMode = Number(resolveValue(gameState['camera_view_mode'])) || 0;
            const isFPS = (viewMode === 1);

            let pRect;
            if (isFPS) {
                const centerP_X = p.x + p.w / 2;
                const centerP_Y = p.y + p.h / 2;
                const hitSize = 16; 
                pRect = { l: centerP_X - hitSize/2, r: centerP_X + hitSize/2, t: centerP_Y - hitSize/2, b: centerP_Y + hitSize/2 };
            } else {
                // ★修正: プレイヤーの判定も固定値ではなく割合(15%)で計算し、サイズ変更に追従させる
                const pMarginX = p.w * 0.15;
                const pMarginYTop = (map.type === 'side') ? (p.h * 0.1) : (p.h * 0.4); 
                pRect = { 
                    l: p.x + pMarginX, 
                    r: p.x + p.w - pMarginX, 
                    t: p.y + pMarginYTop, 
                    b: p.y + p.h - 2 
                };
            }
            
            const objW = obj.w || grid;
            const objH = obj.h || grid;
            
            // 敵の判定も割合で計算
            const eMarginX = objW * 0.15;
            const eMarginTop = (map.type === 'side') ? (objH * 0.1) : (objH * 0.4); 
            const oRect = { 
                l: ox + eMarginX, 
                r: ox + objW - eMarginX, 
                t: oy + eMarginTop, 
                b: oy + objH - 2 
            };

            const pTop = pz + (p.h || grid); 
            const oTop = oz + (obj.h || grid);

            if (pRect.l < oRect.r && pRect.r > oRect.l && pRect.t < oRect.b && pRect.b > oRect.t && 
                pz < oTop && pTop > oz) { 
                
                let isStompSuccess = false;
                
                if (obj.canStomp) {
                    if (map.type === 'side') {
                        // ★修正: 落下中かつ、プレイヤーの足元が敵の頭の少し下までにいる時だけ踏める
                        if (p.vy > 0 && (p.y + p.h - p.vy * timeScale) <= oy + 16) {
                            isStompSuccess = true;
                            p.vy = -8;
                            if (mapEngine.keys['ArrowUp'] || mapEngine.keys['KeyW']) p.vy = -12; 
                        }
                    } else {
                        if (p.vz < 0) {
                            isStompSuccess = true;
                            p.vz = 8;
                            if (mapEngine.keys['ArrowUp'] || mapEngine.keys['KeyW']) p.vz = 12;
                        }
                    }
                }

                if (isStompSuccess) {
                    if (typeof showDamagePopup === 'function') {
                        showDamagePopup(p, "STOMP!", 'critical');
                    }
                    if (obj._runtimeHp === undefined) obj._runtimeHp = Number(resolveValue(obj.hp || 10));
                    const stompDmg = Math.max(1, (playerState.$atk || 1));
                    obj._runtimeHp -= stompDmg;
                    obj._stompCooldown = 30; 
                    obj._dmgVisualTimer = 30; 
                    if (gameState.showDamageText === 'on') showDamagePopup(obj, stompDmg, 'damage');

                    if (obj._runtimeHp <= 0 && obj.destructible !== false) {
                        obj._isDead = true;
                        if (obj.roleType === 'enemy' && typeof gainExp === 'function') {
                            gainExp(getVal(obj.exp, 10));
                        }
                    }
                    const hitSound = obj.hitSoundId || 'damage'; 
                    if (gameData.assets.sounds[hitSound]) {
                        AudioManager.playSe(hitSound, masterVolSe);
                    }
                    return; 
                }

                if (obj._stompCooldown > 0) return;

                let isHit = true;
                let damageAmount = 0;
                let isParry = false;

                if (p.isGuarding && p.parryTimer > 0) {
                    isHit = false;
                    isParry = true;
                    if (typeof showDamagePopup === 'function') {
                        showDamagePopup(p, "PARRY!!", 'critical'); 
                    }
                    p.invincible = 30; 
                    playerState.$stamina = Math.min(playerState.$maxStamina, playerState.$stamina + 10);
                }
                // 2. 通常ガード判定 (ガード中)
                else if (p.isGuarding) {
                    let defVal = (playerState.$def || 0);
                    let rawDmg = Math.max(1, Math.floor(enemyPower - (defVal / getVal(obj.penetration, 1))));
                    const stDmgMult = getVal(pData.guardStaminaMult, 2.0);
                    const staminaDamage = Math.floor(rawDmg * stDmgMult);
                    
                    if (playerState.$stamina >= staminaDamage) {
                        playerState.$stamina -= staminaDamage;
                        isHit = false; 
                        p.vx = Math.cos(p.dir + Math.PI) * 4;
                        p.vy = Math.sin(p.dir + Math.PI) * 4;
                        if (typeof showDamagePopup === 'function') showDamagePopup(p, "GUARD", 'system');
                        spawnParticle('spark', p.x+p.w/2, p.y+p.h/2, { z: p.z, count: 5 });
                    } else {
                        playerState.$stamina = 0;
                        p.isGuarding = false;
                        playerState.isExhausted = true;
                        playerState.exhaustionTimer = getVal(pData.exhaustionDuration, 3.0) + 1.0; 
                        damageAmount = rawDmg;
                        if (typeof showDamagePopup === 'function') showDamagePopup(p, "GUARD BREAK!", 'critical');
                    }
                }
            // 3. 直撃
            else {
                    let defVal = playerState.$def || 0;
                    if (playerState.isExhausted && pData.exhaustionDefZero) defVal = 0;
                    if (playerState.isExhausted && pData.exhaustionCrit) {
                        const eCritMult = (obj.critMult !== undefined) ? Number(obj.critMult) : 1.5;
                        enemyPower = Math.floor(enemyPower * eCritMult); 
                        if (typeof showDamagePopup === 'function') {
                            showDamagePopup(p, "CRITICAL!", 'critical');
                        }
                    }
                    damageAmount = Math.max(1, Math.floor(enemyPower - (defVal / getVal(obj.penetration, 1))));
                    if (playerState.isExhausted && pData.exhaustionDmgDouble) damageAmount *= 2;
                }

                if (isHit) {
                    playerState.$hp -= damageAmount;
                    hitStopTimer = 100; 
                     
                    const pCx = p.x + p.w / 2;
                    const pCy = p.y + p.h / 2;
                    const oCx = (obj.currentX !== undefined ? obj.currentX : obj.x * grid) + (obj.w || grid) / 2;
                    const oCy = (obj.currentY !== undefined ? obj.currentY : obj.y * grid) + (obj.h || grid) / 2;
                    
                    const knockbackAngle = Math.atan2(pCy - oCy, pCx - oCx);
                    const knockbackForce = 15; 
                    
                    if (map.type === 'side') {
                        p.vx = Math.cos(knockbackAngle) * knockbackForce;
                        p.vy = -6; 
                        p.onGround = false;
                    } else {
                        p.vx = Math.cos(knockbackAngle) * knockbackForce;
                        p.vy = Math.sin(knockbackAngle) * knockbackForce;
                    }
                     
                    spawnParticle('blood', p.x + p.w/2, p.y + p.h/2, { color: '#ff0000', count: 8, speed: 6, z: p.z + p.h/2 });
                    if (playerState.$hp < 0) playerState.$hp = 0; 
                    p.invincible = 60; 
                    
                    if (settings.autoShakeOnDamage !== false) {
                        ui.container.className = 'fx-shake-medium'; 
                        setTimeout(function(){ ui.container.className = ''; }, 500);
                    }
                    if(gameState.showDamageText === 'on') showDamagePopup(p, damageAmount, 'damage');

                    if (obj.blastRadius > 0) {
                        const blastDmg = Math.floor(enemyPower * ((obj.blastDamageRate||50)/100));
                        const blastPen = Math.max(1, getVal(obj.penetration, 1));
                        const radius = obj.blastRadius;
                        const cx = p.x + p.w/2; 
                        const cy = p.y + p.h/2;

                        mapEngine.activeObjects.forEach(target => {
                    if (target === obj) return;
                    if (target.isHitbox || target.isPlayer || target._isDead) return;
                    if (!target.destructible && target.roleType !== 'enemy') return;
                    // ★追加: 装飾(deco)やアイテムは爆風に巻き込まない
                    if (target.roleType === 'deco' || target.roleType === 'item') return;

                    const tx = (target.currentX !== undefined ? target.currentX : target.x * grid) + (target.w||grid)/2;
                            const ty = (target.currentY !== undefined ? target.currentY : target.y * grid) + (target.h||grid)/2;
                            if (Math.sqrt((tx-cx)**2 + (ty-cy)**2) <= radius) {
                                if (target._runtimeHp === undefined) target._runtimeHp = Number(resolveValue(target.hp)) || 10;
                                const damage = Math.max(1, Math.floor(blastDmg - (getVal(target.defense, 0) / blastPen)));
                                target._runtimeHp -= damage;
                                target._dmgVisualTimer = 30;
                                if (gameState.showDamageText === 'on') showDamagePopup(target, damage, 'damage');
                                if (target._runtimeHp <= 0) {
                                    target._isDead = true;
                                    if (target.roleType === 'enemy') gainExp(getVal(target.exp, 10));
                                }
                            }
                        });

                        const blastVisual = {
                            id: 'fx_e_blast_' + Date.now(),
                            currentX: cx - radius, currentY: cy - radius, w: radius*2, h: radius*2,
                            z: p.z || 0,
                            visualType: 'color', color: 'rgba(255, 50, 0, 0.5)', 
                            life: 10, isHitbox: true, moveType: 'fixed'
                        };
                        mapEngine._newObjects = mapEngine._newObjects || [];
                        mapEngine._newObjects.push(blastVisual);
                    }
                }
                if (obj.isHitbox) return false;
            }
        }
if (obj.isHitbox && obj.isPlayerAttack) {
            const triggerExplosion = (centerObj) => {
                if (!obj.blastRadius || obj.blastRadius <= 0) return;
                
                const blastRate = obj.blastDamageRate || 50;
                const blastDmg = Math.floor(obj.damage * (blastRate / 100));
                // ★修正: ゼロ除算防止
                const blastPen = Math.max(1, Math.floor((obj.penetration || 1) * (blastRate / 100)));
                
                const cx = centerObj.currentX + (centerObj.w||grid)/2;
                const cy = centerObj.currentY + (centerObj.h||grid)/2;
                const radius = obj.blastRadius;

                mapEngine.activeObjects.forEach(target => {
                    if (target === centerObj) return; 
                    if (target.isHitbox || target.isPlayer || target._isDead) return;
                    if (!target.destructible && target.roleType !== 'enemy') return;

                    const tx = (target.currentX !== undefined ? target.currentX : target.x * grid) + (target.w||grid)/2;
                    const ty = (target.currentY !== undefined ? target.currentY : target.y * grid) + (target.h||grid)/2;
                    const dist = Math.sqrt((tx-cx)**2 + (ty-cy)**2);

                    if (dist <= radius) {
                        const defVal = getVal(target.defense, 0);
                        // ★修正: ゼロ除算防止と整数化
                        const damage = Math.max(1, Math.floor(blastDmg - (defVal / blastPen)));
                        
                        if (target._runtimeHp === undefined) {
                            const max = (target.hp !== undefined && target.hp !== null) ? Number(resolveValue(target.hp)) : 10;
                            target._runtimeHp = max;
                        }

                        if (damage > 0) {
                            target._runtimeHp -= damage;
                            target._dmgVisualTimer = 30;
                            if (gameState.showDamageText === 'on') showDamagePopup(target, damage, 'damage');

                            if (target._runtimeHp <= 0 && target.destructible !== false) {
                                target._isDead = true;
                                if (target.roleType === 'enemy') {
                                    if (typeof gainExp === 'function') gainExp(target.exp || 10);
                                }
                                
                                if (target.dropItemId && gameData.items[target.dropItemId]) {
                                    const rate = (target.dropRate !== undefined) ? target.dropRate : 100;
                                    if (Math.random() * 100 < rate) {
                                        const itemDef = gameData.items[target.dropItemId];
                                        const dropObj = {
                                            id: 'drop_' + Date.now() + '_' + Math.random(),
                                            x: Math.floor(tx / grid), y: Math.floor(ty / grid),
                                            currentX: tx, currentY: ty, z: target.z || 0, w: grid, h: grid,
                                            roleType: 'item', itemId: target.dropItemId, itemAmount: 1, itemPickup: 'touch',
                                            visualType: itemDef.iconImage ? 'image' : 'color', charId: itemDef.iconImage || '',
                                            color: '#ffff00', itemEmoji: itemDef.iconEmoji || "🎁",
                                            isWall: false, opacity: 1.0, vz: 5
                                        };
                                        if (map.type === 'side') { dropObj.vy = -5; dropObj.moveType = 'projectile'; }
                                        mapEngine.activeObjects.push(dropObj);
                                    }
                                }
                            }
                        }
                    }
                });
                
                const blastVisual = {
                    id: 'fx_blast_' + Date.now(),
                    currentX: cx - radius, currentY: cy - radius, w: radius*2, h: radius*2,
                    z: centerObj.z || 0,
                    visualType: 'color', color: 'rgba(255, 100, 0, 0.5)', 
                    life: 10, isHitbox: true, moveType: 'fixed'
                };
                mapEngine._newObjects = mapEngine._newObjects || [];
                mapEngine._newObjects.push(blastVisual);
            };

            // ★追加: ヒットリスト（多段ヒット防止用）の初期化
            if (!obj.hitList) obj.hitList = [];

            mapEngine.activeObjects.forEach(function(t) {
                if (t.isHitbox || t.isPlayer || t._isDead) return;
                if (t.roleType === 'deco' || t.roleType === 'item') return;
                
                // ★追加: すでに当たった相手は無視する
                if (obj.hitList.includes(t.id)) return;
                
                const tx = t.currentX !== undefined ? t.currentX : t.x * grid;
                const ty = t.currentY !== undefined ? t.currentY : t.y * grid;
                const tw = t.w || grid;
                const th = t.h || grid;
                
                const atkRect = { x: obj.currentX, y: obj.currentY, w: obj.w, h: obj.h };
                const tgtRect = { x: tx, y: ty, w: tw, h: th };
                const atkZ = obj.z || 0;
                const atkTop = atkZ + (obj.h || grid); 
                const tgtZ = t.z || 0;
                const tgtTop = tgtZ + (t.h || grid);   

                if (checkCollision(atkRect, tgtRect) && 
                    atkZ < tgtTop && atkTop > tgtZ &&
                    (t._invincible || 0) <= 0) {
                    
                    // ★追加: 当たった相手のIDを記録
                    obj.hitList.push(t.id);
                                    
                    if (t._runtimeHp === undefined) {
                        const max = (t.hp !== undefined && t.hp !== null) ? Number(resolveValue(t.hp)) : 10;
                        t._runtimeHp = max;
                    }

                    const defaultMult = getVal(pData.criticalMultiplier, 2.0);
                    const critM = obj.isCritical ? (obj.critMult !== undefined ? obj.critMult : defaultMult) : 1;

                    const defVal = getVal(t.defense, 0);
                    // ★修正: PENが0にならないようにガード
                    const penVal = Math.max(1, getVal(obj.penetration, 1));
                    const actualDef = (t.roleType === 'obstacle' || t.roleType === 'item') ? 0 : defVal;
                    
                    const finalD = Math.max(1, Math.floor((obj.damage * critM) - (actualDef / penVal)));
                    
                    if (finalD > 0) {
                        t._runtimeHp -= finalD; 
                        t._invincible = 20; 
                        const pId = t.hitParticleId || 'spark';
                        
                        spawnParticle(pId, t.currentX + (t.w||grid)/2, t.currentY + (t.h||grid)/2, {
                            z: (t.z||0) + (t.h||grid)/2
                        });
                        t._dmgVisualTimer = 30;
                        if (gameState.showDamageText === 'on') showDamagePopup(t, finalD, obj.isCritical ? 'critical' : 'damage');
                        
                        // ★修正: HPトリガーイベントの評価と無限ループ防止
                        if (t.hasBattleEvent && t.battleEvents) {
                            const maxHp = (t.hp !== undefined) ? Number(resolveValue(t.hp)) : 10;
                            // 現在のHP割合を算出 (最低0%)
                            const per = Math.max(0, (t._runtimeHp / maxHp) * 100);
                            
                            // フラグ配列の初期化
                            if (!t._triggeredEvents) t._triggeredEvents = [];
                            
                            // 降順(HPが低い順)などで評価すると暴発しやすいため、全て評価してフラグを立てる
                            t.battleEvents.forEach(function(evt, idx) {
                                // まだ実行しておらず、閾値を下回った場合
                                if (!t._triggeredEvents.includes(idx) && per <= evt.threshold) {
                                    t._triggeredEvents.push(idx); // ★二度と実行させない
                                    
                                    // プレイヤーの動きと入力を強制リセット (イベント中の誤作動防止)
                                    mapEngine.keys = {};
                                    mapEngine.rawKeys = {};
                                    mapEngine.player.vx = 0;
                                    mapEngine.player.vy = 0;
                                    
                                    // ノードを呼び出してイベント実行
                                    processNode(evt.nodeId);
                                }
                            });
                        }

                        triggerExplosion(t);
                        
                        if (t._runtimeHp <= 0 && t.destructible !== false) {
                            t._isDead = true;
                            
                            if (t.keepDestroyed && t.id) {
                                if (!gameState._sys_destroyed) gameState._sys_destroyed = {};
                                gameState._sys_destroyed[mapEngine.currentMapId + '_' + t.id] = true;
                            }
                            
                            if (t.roleType === 'enemy') {
                                const expVal = getVal(t.exp, 10);
                                if (typeof gainExp === 'function') gainExp(expVal);
                            }

                            if (t.dropItemId && gameData.items[t.dropItemId]) {
                                const rate = (t.dropRate !== undefined) ? t.dropRate : 100;
                                if (Math.random() * 100 < rate) {
                                    const itemDef = gameData.items[t.dropItemId];
                                    const dropObj = {
                                        id: 'drop_' + Date.now() + '_' + Math.random(),
                                        x: Math.floor(tx / grid), y: Math.floor(ty / grid),
                                        currentX: tx, currentY: ty, 
                                        z: t.z || 0, // 敵がいた高さを引き継ぐ
                                        w: grid, h: grid,
                                        roleType: 'item', itemId: t.dropItemId, itemAmount: 1, itemPickup: 'touch',
                                        visualType: itemDef.iconImage ? 'image' : 'color', charId: itemDef.iconImage || '',
                                        color: '#ffff00', itemEmoji: itemDef.iconEmoji || "🎁",
                                        isWall: false, opacity: 1.0, 
                                        vz: 6 // ★修正: 上に少し跳ね上げる
                                    };
                                    
                                    if (map.type === 'side') { 
                                        dropObj.vy = -6; 
                                        dropObj.moveType = 'projectile'; // 重力を受けさせる
                                    } else {
                                        // トップダウンや3Dの場合、Z軸の重力を受けるようにする
                                        dropObj.moveType = 'projectile';
                                        dropObj.vx = (Math.random() - 0.5) * 2;
                                        dropObj.vy = (Math.random() - 0.5) * 2;
                                    }
                                    mapEngine.activeObjects.push(dropObj);
                                }
                            }
                        }
                        hitStopTimer = obj.isCritical ? 150 : 80;
                    }
                    // ★追加: 貫通系の武器でなければ、一発当たった時点で弾を消す
                    if (!obj.isPiercing) {
                        obj.life = 0; 
                    }
                }
            });
        }
     return !obj._isDead && (obj.life === undefined || obj.life > 0);
    });

    
    if (mapEngine._newObjects) { mapEngine.activeObjects = mapEngine.activeObjects.concat(mapEngine._newObjects); mapEngine._newObjects = []; }
    mapEngine.activeObjects.forEach(function(o) { updateObjectMovement(o, dt, timeScale); });
    
    if (mapEngine.eventCooldown <= 0) {
        const autoObj = mapEngine.activeObjects.find(function(o) { return o.hasEvent && o.eventTrigger === 'auto' && checkCondition(o); });
        if (autoObj) {
            const counterKey = '_sys_evt_' + autoObj.id;
            if (gameState[counterKey] === undefined) gameState[counterKey] = 0;
            const count = gameState[counterKey];
            if (!(autoObj.eventRepeat === 'once' && count > 0)) {
                let eventList = autoObj.eventList || [{ nodeId: autoObj.eventNodeId }];
                let targetNodeId = null;
                if (autoObj.eventRepeat === 'once') targetNodeId = eventList[0].nodeId;
                else if (autoObj.eventRepeat === 'loop') targetNodeId = eventList[count % eventList.length].nodeId;
                else { const idx = Math.min(count, eventList.length - 1); targetNodeId = eventList[idx].nodeId; }

                if (targetNodeId) {
                    gameState[counterKey]++;
                    mapEngine.eventCooldown = 30; 
                    if (autoObj.keepDestroyed && autoObj.id) {
                        if (!gameState._sys_destroyed) gameState._sys_destroyed = {};
                        gameState._sys_destroyed[mapEngine.currentMapId + "_" + autoObj.id] = true;
                    }
                    processNode(targetNodeId);
                    return; 
                }
            }
        }
    }

    checkMapEvents(p, isCheckTrigger);
     if (map.edgeType !== 'loop' && map.type === 'side' && map.enableFallDeath) {
        const grid = mapEngine.GRID;
        if (p.y > map.height * grid) {
            p.vx = 0; // 操作不能感を出すため速度をゼロにする
            playerState.$hp = 0; 
        }
    }
if (playerState.$hp <= 0 && !playerState._isDeadTriggered) {
        const targetNodeId = map.gameoverEventNodeId || (gameData.settings && gameData.settings.globalGameoverNodeId);
        if (targetNodeId) {
            const targetNode = findNode(targetNodeId);
            if (targetNode) {
                playerState._isDeadTriggered = true; 
                playerState.$hp = 0;
                endMapMode(); 
                processNode(targetNodeId); 
                return;
            } else {
                console.warn("Game Over node not found:", targetNodeId);
                if (typeof showDamagePopup === 'function') showDamagePopup(mapEngine.player, "GAME OVER (No Event)", 'system');
            }
        }
    }
mapEngine.prevKeys = { ...mapEngine.keys };
} // ← updateMapGame() の終わり
// ★修正: ここにあった余分な } を削除しました
function updateInvestigationGame(dt) {
    const timeScale = dt / 16.666;
    const map = mapEngine.data;
    const grid = mapEngine.GRID;
    // 探索モードは基本ズーム1.0推奨だが、設定があれば従う
    const zoom = mapEngine.currentZoom || 1.0; 
    
    // --- 1. カメラ移動 ---
    const scrollSpeed = 8 * timeScale;
    const keys = mapEngine.keys;

    if (keys['ArrowLeft'] || keys['KeyA'])  mapEngine.camera.x -= scrollSpeed;
    if (keys['ArrowRight'] || keys['KeyD']) mapEngine.camera.x += scrollSpeed;
    if (keys['ArrowUp'] || keys['KeyW'])    mapEngine.camera.y -= scrollSpeed;
    if (keys['ArrowDown'] || keys['KeyS'])  mapEngine.camera.y += scrollSpeed;

    // マップサイズ
    const mapPixelW = map.width * grid;
    const mapPixelH = map.height * grid;
    const canvasW = mapEngine.canvas.width / zoom;
    const canvasH = mapEngine.canvas.height / zoom;

    // --- 2. 座標の正規化 (ループ or クランプ) ---
    if (map.edgeType === 'loop') {
        // 無限ループ
        if (mapPixelW > 0) mapEngine.camera.x = ((mapEngine.camera.x % mapPixelW) + mapPixelW) % mapPixelW;
        if (mapPixelH > 0) mapEngine.camera.y = ((mapEngine.camera.y % mapPixelH) + mapPixelH) % mapPixelH;
    } else {
        // 行き止まり (Clamp)
        // 画面よりマップが小さい場合は0固定、大きい場合は端で止める
        const maxScrollX = Math.max(0, mapPixelW - canvasW);
        const maxScrollY = Math.max(0, mapPixelH - canvasH);
        mapEngine.camera.x = Math.max(0, Math.min(mapEngine.camera.x, maxScrollX));
        mapEngine.camera.y = Math.max(0, Math.min(mapEngine.camera.y, maxScrollY));
    }

    // --- 3. マウス判定 ---
    const mx = mapEngine.mouseX || 0;
    const my = mapEngine.mouseY || 0;
    const isClicked = mapEngine.isClicked || false;
    mapEngine.isClicked = false; 

    // カメラ位置 (整数化)
    const camX = mapEngine.camera.x;
    const camY = mapEngine.camera.y;

    let isHover = false;

    // --- 4. オブジェクト判定 ---
    mapEngine.activeObjects.forEach(obj => {
        if (obj.currentX === undefined) {
            obj.currentX = obj.x * grid;
            obj.currentY = obj.y * grid;
        }
        if (obj._dmgVisualTimer > 0) obj._dmgVisualTimer -= timeScale;
        
        if (!checkCondition(obj)) return;
        if (obj._isPickedUp || obj._isDead) return;

        // オブジェクト座標
        const ox = obj.currentX;
        const oy = obj.currentY;
        const objW = (obj.w || grid);
        const objH = (obj.h || grid);

        // カメラとの相対座標 (ループ対応)
        let diffX = ox - camX;
        let diffY = oy - camY;

        if (map.edgeType === 'loop') {
            if (diffX < -mapPixelW / 2) diffX += mapPixelW; else if (diffX > mapPixelW / 2) diffX -= mapPixelW;
            if (diffY < -mapPixelH / 2) diffY += mapPixelH; else if (diffY > mapPixelH / 2) diffY -= mapPixelH;
        }

        // 画面上の矩形
        // (探索モードは左上基準で描画されるため、ここも合わせる)
        const screenX = diffX * zoom;
        const screenY = diffY * zoom;
        const screenW = objW * zoom;
        const screenH = objH * zoom;

        // マウスが矩形内にあるか
        if (mx >= screenX && mx < screenX + screenW && 
            my >= screenY && my < screenY + screenH) {
            
            // イベントまたはアイテムがある場合のみ反応
            if (obj.hasEvent || obj.itemId) {
                isHover = true;
                if (isClicked) {
                    // --- アイテム取得処理 ---
                    if (obj.itemId && (!obj.hp || obj.hp <= 0)) {
                        if (!playerState.inventory) playerState.inventory = {};
                        const currentQty = playerState.inventory[obj.itemId] || 0;
                        const itemDef = gameData.items[obj.itemId];
                        const max = (itemDef && itemDef.maxStack !== undefined) ? itemDef.maxStack : 99;
                        
                        if (currentQty < max) {
                            obj._isPickedUp = true;
                            if (obj.keepDestroyed && obj.id) {
                                if (!gameState._sys_destroyed) gameState._sys_destroyed = {};
                                gameState._sys_destroyed[mapEngine.currentMapId + '_' + obj.id] = true;
                            }
                            playerState.inventory[obj.itemId] = currentQty + (obj.itemAmount || 1);
                            
                            if (typeof showDamagePopup === 'function') {
                                const label = itemDef ? itemDef.name : "ITEM";
                                // ポップアップ用座標補正のためにオブジェクトを渡す
                                // (showDamagePopup側でadventureモードのループ計算が必要になるが、
                                //  現状のshowDamagePopupはadventureのループに対応していないため
                                //  ループ境界付近ではポップアップ位置がズレる可能性があります。
                                //  ただ、取得自体は正常に行われます)
                                showDamagePopup(obj, "GET: " + label, 'item');
                            }
                            if (itemDef && itemDef.effects && itemDef.effects.sound && gameData.assets.sounds[itemDef.effects.sound]) {
                                new Audio(gameData.assets.sounds[itemDef.effects.sound].data).play();
                            }
                        } else {
                            if (typeof showDamagePopup === 'function') showDamagePopup(obj, "FULL!", 'system');
                        }
                    }
                    // --- イベント実行処理 ---
                    else if (obj.hasEvent) {
                        const counterKey = '_sys_evt_' + obj.id;
                        if (gameState[counterKey] === undefined) gameState[counterKey] = 0;
                        let count = gameState[counterKey];
                        let eventList = obj.eventList || [{nodeId: obj.eventNodeId}];
                        let targetNodeId = null;
                        
                        if (obj.eventRepeat === 'once') { 
                            if (count === 0 && eventList.length > 0) targetNodeId = eventList[0].nodeId; 
                        } else if (obj.eventRepeat === 'loop') { 
                            if (eventList.length > 0) targetNodeId = eventList[count % eventList.length].nodeId; 
                        } else if (obj.eventRepeat === 'stick') {
                            if (eventList.length > 0) { const idx = Math.min(count, eventList.length - 1); targetNodeId = eventList[idx].nodeId; }
                        }
                        
                        if (targetNodeId) {
                            gameState[counterKey]++;
                            processNode(targetNodeId);
                        }
                    }
                }
            }
        }
    });

    if (mapEngine.canvas) mapEngine.canvas.style.cursor = isHover ? 'pointer' : 'default';
    if (mapEngine.eventCooldown > 0) mapEngine.eventCooldown -= timeScale;
}




function updateDungeonGame(dt) {
    const timeScale = dt / 16.666; 
    const p = mapEngine.player; 
    const map = mapEngine.data; 
    const grid = mapEngine.GRID; 
    const rotSpeed = 0.05 * timeScale; 
    const moveSpeed = 4 * timeScale;
    
    const baseZoom = map.zoom || 1.0; 
    const varZoom = resolveValue(gameState['camera_zoom']); 
    const dynamicZoom = (varZoom !== undefined && varZoom !== null && !isNaN(varZoom)) ? Number(varZoom) : 1.0;
    mapEngine.currentZoom = baseZoom * dynamicZoom; 
    if (mapEngine.currentZoom <= 0.1) mapEngine.currentZoom = 0.1;
    
    const btnConfig = gameData.settings.actionButtons || [{ key:"Space", type:"variable_mode" }];
    let isCheckTrigger = false;
    btnConfig.forEach(function(btn) {
        if (mapEngine.keys[btn.key]) {
            let mode = btn.type;
            if (mode === 'variable_mode') { const val = Number(gameState['player_act_mode']) || playerState.$actMode || 0; if (val === 0) mode = 'check'; }
            if (mode === 'check' || mode === 'custom') isCheckTrigger = true;
        }
    });
    
    if(mapEngine.eventCooldown > 0) mapEngine.eventCooldown -= timeScale;
    
    // 回転 (Left/Right)
    if(mapEngine.keys['ArrowLeft'] || mapEngine.keys['KeyA']) p.dir -= rotSpeed; 
    if(mapEngine.keys['ArrowRight'] || mapEngine.keys['KeyD']) p.dir += rotSpeed;
    
    // 移動計算 (Up/Down)
    let moveStep = 0; 
    if(mapEngine.keys['ArrowUp'] || mapEngine.keys['KeyW']) moveStep = moveSpeed; 
    if(mapEngine.keys['ArrowDown'] || mapEngine.keys['KeyS']) moveStep = -moveSpeed;
    
    if(moveStep !== 0) {
        const targetX = p.x + Math.cos(p.dir) * moveStep; 
        const targetY = p.y + Math.sin(p.dir) * moveStep;
        
        // ★最適化: 高速移動時の「壁抜け（すり抜け）」を防止するための連続衝突判定（Raycast的アプローチ）
        const isLoop = (map.edgeType === 'loop');
        const mapW = map.width;
        const mapH = map.height;
        
        // 移動距離を細かく分割（1/4マスずつチェック）
        const dist = Math.abs(moveStep);
        const steps = Math.max(1, Math.ceil(dist / (grid / 4)));
        const stepX = (targetX - p.x) / steps;
        const stepY = (targetY - p.y) / steps;

        let currentX = p.x;
        let currentY = p.y;
        
        for (let i = 0; i < steps; i++) {
            let nextX = currentX + stepX;
            let nextY = currentY + stepY;
            
            let gx = Math.floor(nextX / grid); 
            let gy = Math.floor(nextY / grid);
            
            let targetGx = gx;
            let targetGy = gy;

            if (isLoop) {
                targetGx = ((gx % mapW) + mapW) % mapW;
                targetGy = ((gy % mapH) + mapH) % mapH;
            }

            // 壁があるかチェック
            const isWall = mapEngine.activeObjects.find(function(o) { 
                return o.x === targetGx && o.y === targetGy && o.isWall; 
            });

            // 画面外（行き止まり）チェック
            let isOut = false;
            if (!isLoop && (gx < 0 || gx >= mapW || gy < 0 || gy >= mapH)) {
                isOut = true;
            }

            if (isWall || isOut) {
                // 壁にぶつかったらその時点で移動終了（これ以上進まない）
                break;
            }

            // ぶつからなければ現在位置を更新
            currentX = nextX;
            currentY = nextY;
        }

        // 最終的な座標を適用
        p.x = currentX; 
        p.y = currentY;
            
        // ループモード時の画面端ワープ処理
        if (isLoop) {
            const pixelW = mapW * grid;
            const pixelH = mapH * grid;
            if (p.x < 0) p.x += pixelW;
            else if (p.x >= pixelW) p.x -= pixelW;
            
        if (p.y < 0) p.y += pixelH;
           else if (p.y >= pixelH) p.y -= pixelH;
        } // if (isLoop) を閉じる
    } // if (moveStep !== 0) を閉じる

    checkMapEvents(p, isCheckTrigger);
}


function mainLoop(timestamp) {
    if (isGamePaused) {
        lastTime = timestamp;
        requestAnimationFrame(mainLoop);
        return;
    }
        
    const dt = timestamp - lastTime; 
    lastTime = timestamp;

       let gameDt = dt;
    if (hitStopTimer > 0) {
        hitStopTimer -= dt;
        gameDt = 0;
    } 

    updateTimers(gameDt); 
    updateGamepad(gameDt);
    // ★パフォーマンス改善: HUDの更新を間引く（0.1秒に1回更新）
    if (window._hudTimer === undefined) window._hudTimer = 0;
    window._hudTimer += gameDt;
    if (window._hudTimer >= 100) {
        if (typeof updateHUD === 'function') updateHUD();
        window._hudTimer = 0;
    }
    
    updateParticles(gameDt);
if (typeof renderDebug === 'function') renderDebug();
    // ★最適化: DOMの取得をキャッシュ化し、毎フレームの検索をなくす
    if (!ui.ohCanvas) {
        ui.ohCanvas = document.getElementById('overhead-canvas');
    }
    const ohCanvas = ui.ohCanvas;
    
    if (ohCanvas) {
        // コンテナのサイズ取得もキャッシュできるとなお良いですが、画面リサイズ対応のため維持
        const rect = ui.container.getBoundingClientRect();
        if (ohCanvas.width !== rect.width || ohCanvas.height !== rect.height) {
            ohCanvas.width = rect.width;
            ohCanvas.height = rect.height;
        }
        const ctx = ohCanvas.getContext('2d');
        ctx.clearRect(0, 0, ohCanvas.width, ohCanvas.height);
    }    

    if (isMapMode && mapEngine.data) {
        // --- マップモードの処理 ---
        const mapType = mapEngine.data.type;
        
        if (mapType === 'dungeon') { updateDungeonGame(gameDt); renderRaycastGame(); } 
        else if (mapType === 'quarter') { updateMapGame(gameDt); renderQuarterViewGame(); } 
        else if (mapType === 'mode7') { updateMapGame(gameDt); renderMode7Game(); } 
        else if (mapType === 'belt') { updateMapGame(gameDt); renderBeltGame(); }
        else if (mapType === 'trapezoid') { updateMapGame(gameDt); renderTrapezoidGame(); }
        else if (mapType === 'adventure') { updateInvestigationGame(gameDt); renderInvestigationGame(); }
        else if (mapType === 'panorama') { updatePanoramaGame(gameDt); renderPanoramaGame(); }
        else { updateMapGame(gameDt); renderMapGame(); }
        
        // 3Dモデル更新
        const hasStage = !!mapEngine.data.stageModelId; 
        const hasPlayer = !!playerState.modelId; // 修正: playerModelIdではなくplayerStateを参照
        
        if (hasStage || hasPlayer) {
            const p = mapEngine.player; 
            const isMoving = (p.vx !== 0 || p.vy !== 0);
            // Z座標も含めて更新
            threeHandler.updatePlayerTransform(p.x + p.w/2, p.y + p.h/2, p.dir, isMoving, (p.z || 0) / 32.0);
            
            if (hasPlayer) {
                const s = gameData.settings || {};
                // 無敵点滅
                if (p.invincible > 0 && s.flashOnInvincible !== false) {
                    const isVisible = Math.floor(performance.now() / 100) % 2 === 0;
                    if (threeHandler.currentPlayerModel) threeHandler.currentPlayerModel.visible = isVisible;
                } else {
                    if (threeHandler.currentPlayerModel) threeHandler.currentPlayerModel.visible = true;
                }
                
                // アニメーション切り替え
                const pData = gameData.player || {};
                let anim = pData.animIdIdle;
                if (p.invincible > 40) anim = pData.animIdDamage;
                else if (p.attackCooldown > 5) anim = pData.animIdAttack;
                else if ((p.z||0) > 0) anim = pData.animIdJump;
                else if (isMoving) anim = pData.animIdMove;
                if (anim) threeHandler.changePlayerAnimation(anim);
            }
            
            if (hasStage) {
                // カメラ同期 (3Dモード用)
                let cameraDir = p.dir;
                if (mapType === '3d' || mapType === 'dungeon') {
                    cameraDir = tpsCameraAngle.horizontal;
                }
                threeHandler.syncCamera(
                    p.x + p.w/2, p.y + p.h/2, mapType, mapEngine.currentZoom, 
                    cameraDir, p.pitch, 
                    (Number(resolveValue(gameState['camera_view_mode'])) == 1), 
                    isMoving, dt/1000
                );
            }
        }
        
        // HPバーなどを描画 (overhead-canvas)
        // ※この中で ctx.clearRect されるが、上書き描画なので問題なし
        mapEngine.ctx.save(); 
        renderOverheadBars(); 
        mapEngine.ctx.restore();

    } else {
        // --- ノベルモードの処理 ---
        updateSpriteAnimation(animState.bg, dt); 
        animState.characters.forEach(st => updateSpriteAnimation(st, dt)); 
    }

    // ★★★ パーティクル描画 (全モード共通・最前面) ★★★
    // overhead-canvas に描画されます
    renderParticles(); 

    // 3Dレンダリング
    threeHandler.updateAndRender();
    
    requestAnimationFrame(mainLoop);
}
const portraitSettings = ${JSON.stringify(m)};

        function handleResize() {
            const container = document.getElementById('game-container');
            const w = container.clientWidth; 
            const h = container.clientHeight;
            
            // ★最適化: 設定で「低負荷モード」がONなら解像度を下げ、OFFならデバイス解像度にする
            const s = gameData.settings || {};
            // 低負荷モードなら dpr を 0.5 にしてピクセルを荒く（軽く）する。通常は 1.0 (またはRetinaならそれ以上)
            const dpr = s.lowResMode ? 0.5 : (window.devicePixelRatio || 1.0);
    
    if (mapEngine.canvas) { 
        // 内部解像度を決定
        mapEngine.canvas.width = Math.max(1, Math.floor(w * dpr)); 
        mapEngine.canvas.height = Math.max(1, Math.floor(h * dpr));
        
        mapEngine.canvas.style.width = w + 'px';
        mapEngine.canvas.style.height = h + 'px';
        
        mapEngine.ctx.scale(dpr, dpr);
        mapEngine.ctx.imageSmoothingEnabled = false; 
        
        // ★最適化: Mode7などで使っている裏画面キャンバスもサイズ変更に合わせて破棄する。
        // 次のフレームで正しいサイズで自動的に再生成され、画面が真っ暗になるバグを防ぎます。
        if (mapEngine.bgCanvas) {
            mapEngine.bgCanvas = null; 
        }
    }
    
            if (threeHandler && threeHandler.resize) threeHandler.resize(w, h);
            if (mapEngine.canvas) { 
                mapEngine.canvas.width = w; 
                mapEngine.canvas.height = h; 
            }
            if (ui.textBox) {
                ui.textBox.style.height = portraitSettings.windowHeight + '%';
                if (portraitSettings.windowVertical === 'top') { 
                    ui.textBox.style.top = '2%'; 
                    ui.textBox.style.bottom = 'auto'; 
                    ui.textBox.style.transform = 'none'; 
                } else if (portraitSettings.windowVertical === 'middle') { 
                    ui.textBox.style.top = '50%'; 
                    ui.textBox.style.transform = 'translateY(-50%)'; 
                    ui.textBox.style.bottom = 'auto'; 
                } else { 
                    ui.textBox.style.top = 'auto'; 
                    ui.textBox.style.bottom = '2%'; 
                    ui.textBox.style.transform = 'none'; 
                }
            }
            if (ui.choices) {
                ui.choices.style.flexDirection = portraitSettings.choiceDirection; 
                ui.choices.style.justifyContent = portraitSettings.choiceAlign;
            }
            if (layers.charaContainer) {
                layers.charaContainer.style.transform = 'translateY(' + portraitSettings.characterOffsetY + 'px)';
            }
        }

        function preloadAssets() {
            const promises = [];
            const loadImg = (src) => new Promise((resolve) => {
                const img = new Image();
                img.onload = resolve;
                img.onerror = resolve;
                img.src = src;
            });
            const loadAudio = (src) => new Promise((resolve) => {
                const audio = new Audio();
                audio.oncanplaythrough = resolve;
                audio.onerror = resolve;
                audio.src = src;
                audio.load();
            });

            if (gameData.assets.backgrounds) {
                Object.values(gameData.assets.backgrounds).forEach(bg => {
                    if (!bg.data.startsWith('data:video')) promises.push(loadImg(bg.data));
                });
            }
            if (gameData.assets.characters) {
                Object.values(gameData.assets.characters).forEach(ch => {
                    promises.push(loadImg(ch.data));
                });
            }
            if (gameData.assets.sounds) {
                Object.values(gameData.assets.sounds).forEach(snd => {
                    promises.push(loadAudio(snd.data));
                });
            }
            return Promise.all(promises);
        }

async function initializeGame() {
            // ★最適化: 設定の読み込みも IndexedDB から行う
            const savedBgm = await loadFromDB('cfg_vol_bgm');
            const savedSe = await loadFromDB('cfg_vol_se');
            
            if (savedBgm !== undefined && savedBgm !== null) {
                masterVolBgm = Number(savedBgm) / 100;
                const slider = document.getElementById('vol-bgm');
                const label = document.getElementById('vol-bgm-val');
                if (slider) slider.value = savedBgm;
                if (label) label.textContent = savedBgm + '%';
            }
            if (savedSe !== undefined && savedSe !== null) {
                masterVolSe = Number(savedSe) / 100;
                const slider = document.getElementById('vol-se');
                const label = document.getElementById('vol-se-val');
                if (slider) slider.value = savedSe;
                if (label) label.textContent = savedSe + '%';
            }

            // Load Physics (if needed)
            const loadPhysicsEngine = () => {
                return new Promise((resolve) => {
                    if (typeof Ammo === 'function') { Ammo().then(() => { resolve(true); }); return; }
                    if (typeof Ammo === 'object') { resolve(true); return; }
                    const script = document.createElement('script');
                    script.src = "https://kripken.github.io/ammo.js/builds/ammo.js";
                    script.onload = () => { if (typeof Ammo === 'function') { Ammo().then(() => { resolve(true); }); } else { resolve(true); } };
                    script.onerror = () => { console.warn("Failed to load Ammo.js"); resolve(false); };
                    document.head.appendChild(script);
                });
            };

            if (${needs3D}) {
                await loadPhysicsEngine();
            }

            // Load Assets
            await preloadAssets();

            // Initialize UI Refs
            Object.assign(layers, {
                bg1: document.getElementById('background-layer-1'), 
                bg2: document.getElementById('background-layer-2'),
                charaContainer: document.getElementById('character-layer'), 
                map: document.getElementById('map-layer'), 
                effect: document.getElementById('effect-overlay')
            });
            Object.assign(ui, {
                effect: document.getElementById('effect-overlay'), 
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
                mapActionContainer: document.getElementById('map-action-btn-container'),
                hudCrosshair: document.getElementById('hud-crosshair'), 
                hudRadar: document.getElementById('hud-radar'),
                radarCanvas: document.getElementById('radar-canvas'), 
                hudContainer: document.getElementById('hud-elements-container')
            });

            // Initialize 3D
            const canvas = document.getElementById('character-canvas');
            if (threeHandler && threeHandler.init) {
                threeHandler.init(canvas);
                await threeHandler.loadAssets();
            }

            // Initialize Player Stats
            const pData = gameData.player || {};
            playerState.$level = Number(resolveValue(pData.initialLevel)) || 1;
            if (typeof recalculatePlayerStats === 'function') recalculatePlayerStats();
            playerState.$hp = playerState.$maxHp;
            playerState.$stamina = playerState.$maxStamina;
            playerState.$magazine = playerState.$maxMagazine;
            playerState.$actMode = 0;
            playerState.$isLockedOn = 0;
            playerState.isExhausted = false; 
            playerState.exhaustionTimer = 0;

            // Setup Start Event
            const loader = ui.loader;
            if (!loader) return;
            
            loader.classList.add('ready');
            const loadText = loader.querySelector('#loading-text');
            if(loadText) loadText.textContent = "CLICK TO START";
            
            loader.addEventListener('click', () => {
                loader.style.opacity = 0; 
                setTimeout(() => { loader.style.display = 'none'; }, 500);
                
                const s = gameData.settings || {};
                const hasTitle = !!s.gameTitle;
                const hasCopy = !!s.gameCopyright;
                const hasBg = !!s.titleImage;
                const hasGuide = !!s.gameGuideline; // 追加

                // 4つとも無ければ即スタート、どれか一つでもあればタイトル画面へ
                if (!hasTitle && !hasCopy && !hasBg && !hasGuide) {
                    startGame();
                } else {
                    showTitleScreen();
                }

            }, { once: true });
        }

        // --- タイトル画面表示 ---
        window.showTitleScreen = () => {
            const titleEl = document.getElementById('title-screen');
            const logoEl = document.getElementById('title-logo');
            const copyEl = document.getElementById('copyright');
            const guideBtn = document.getElementById('title-btn-guideline'); // 追加
            
            const s = gameData.settings || {};
            
            if (!s.gameTitle) {
                logoEl.style.display = 'none';
            } else {
                logoEl.style.display = 'block';
                logoEl.textContent = s.gameTitle;
            }

            copyEl.textContent = s.gameCopyright || "";
            if (!s.gameGuideline) {
                guideBtn.style.display = 'none';
            } else {
                guideBtn.style.display = 'block';
                document.getElementById('guideline-text').textContent = s.gameGuideline;
            }
            titleEl.style.display = 'flex';
            setTimeout(() => { titleEl.style.opacity = 1; }, 10);
        };

        window.toggleGuideline = () => {
            const overlay = document.getElementById('guideline-overlay');
            if (overlay.style.display === 'flex') {
                overlay.style.display = 'none';
            } else {
                overlay.style.display = 'flex';
            }
        };

        // --- ゲーム開始 (STARTボタンから) ---
        window.startGame = () => {
            const titleEl = document.getElementById('title-screen');
            titleEl.style.opacity = 0;
            setTimeout(() => { titleEl.style.display = 'none'; }, 500);
            
            userInteraction(); 
            
            // ノード実行開始
            if(currentNodeId && currentNodeId !== "null") {
                processNode(currentNodeId); 
            } else {
                // ノードがない場合のUI非表示など
                ui.textBox.style.display = 'none';
                ui.name.style.display = 'none';
                ui.overlay.style.display = 'none';
                layers.charaContainer.innerHTML = '';
            }
            
            // 操作イベントの登録
            setupInputEvents();
        };

        // --- ウィンドウ非表示機能 ---
        window.addEventListener('contextmenu', (e) => {
            // ★最適化: 画像の保存メニューなどが絶対に出ないようにデフォルト動作を殺す
            e.preventDefault();
            
            const s = gameData.settings || {};
            if (s.enableHideMsg !== false && !isMapMode) {
                toggleMessageWindow();
            }
        });

        window.toggleMessageWindow = () => {
            const box = document.getElementById('text-box');
            const menu = document.getElementById('system-menu');
            if (box) box.classList.toggle('hidden-ui');
            if (menu) menu.classList.toggle('hidden-ui');
        };

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', () => {
                const container = document.getElementById('game-container');
                if (!container) return;
                
                // キーボードが出た分だけ、画面が縮んだとブラウザは判定する
                const vv = window.visualViewport;
                const windowHeight = window.innerHeight;
                
                // 画面が縮んだ（キーボードが出た）場合
                if (vv.height < windowHeight) {
                    // コンテナの「見た目上の高さ」は元のまま維持し、上にスライドさせることで
                    // 入力フォームをキーボードの上に逃がしつつ、背景や3Dのアスペクト比崩れを防ぐ
                    container.style.height = windowHeight + 'px';
                    container.style.transform = \`translateY(-\${windowHeight - vv.height}px)\`;
                } else {
                    // キーボードが閉じた場合、元に戻す
                    container.style.height = '100%';
                    container.style.transform = 'none';
                    // 念のためウィンドウ全体をスクロール上部にリセット
                    window.scrollTo(0, 0);
                }
            });
        }
function updateGamepad(dt) {
            // 前回パッドによって押された判定になっていたキーを一旦リセット
            if (mapEngine.padPressedKeys) {
                mapEngine.padPressedKeys.forEach(k => {
                    // もし実際のキーボードや仮想パッド(rawKeys)でも押されていなければOFFにする
                    if (!mapEngine.rawKeys[k]) {
                        mapEngine.keys[k] = false;
                    }
                });
            }
            mapEngine.padPressedKeys = [];

            const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
            const gp = gamepads[0]; // 1Pコントローラーのみ
            if (!gp) return;

            const deadzone = 0.25; // スティックの遊び（ドリフト対策）

            // 1. 左スティック & 十字キー (移動)
            if ((gp.buttons[12] && gp.buttons[12].pressed) || gp.axes[1] < -deadzone) mapEngine.padPressedKeys.push('ArrowUp');
            if ((gp.buttons[13] && gp.buttons[13].pressed) || gp.axes[1] > deadzone) mapEngine.padPressedKeys.push('ArrowDown');
            if ((gp.buttons[14] && gp.buttons[14].pressed) || gp.axes[0] < -deadzone) mapEngine.padPressedKeys.push('ArrowLeft');
            if ((gp.buttons[15] && gp.buttons[15].pressed) || gp.axes[0] > deadzone) mapEngine.padPressedKeys.push('ArrowRight');

            // 2. アクションボタンのマッピング
            const s = gameData.settings || {};
            const btnConfig = s.actionButtons || [];
            btnConfig.forEach(conf => {
                if (conf.padBtn !== undefined && conf.padBtn !== '' && gp.buttons[conf.padBtn]) {
                    if (gp.buttons[conf.padBtn].pressed) {
                        // パッドのボタンが押されていたら、対応するキーボードのキーが押されたと見なす
                        mapEngine.padPressedKeys.push(conf.key);
                    }
                }
            });

            // 集計したパッドの入力をゲームエンジンに適用
            mapEngine.padPressedKeys.forEach(k => {
                mapEngine.keys[k] = true;
            });

            // 3. 右スティック (3D/ダンジョンのカメラ操作)
            if (isMapMode && mapEngine.data) {
                const type = mapEngine.data.type;
                if (type === '3d' || type === 'dungeon' || type === 'panorama') {
                    const rx = gp.axes[2]; // 右スティックX
                    const ry = gp.axes[3]; // 右スティックY
                    
                    if (Math.abs(rx) > deadzone || Math.abs(ry) > deadzone) {
                        const sensitivity = 0.04 * (dt / 16.666);
                        if (type === 'panorama') {
                            mapEngine.camera.x += rx * sensitivity;
                            mapEngine.camera.y -= ry * sensitivity;
                            mapEngine.camera.y = (mapEngine.camera.y + Math.PI * 2) % (Math.PI * 2);
                        } else {
                            tpsCameraAngle.horizontal += rx * sensitivity;
                            tpsCameraAngle.vertical -= ry * sensitivity;
                            if (tpsCameraAngle.vertical > 1.5) tpsCameraAngle.vertical = 1.5;
                            if (tpsCameraAngle.vertical < -0.5) tpsCameraAngle.vertical = -0.5;
                            if (type === 'dungeon') {
                                mapEngine.player.dir = tpsCameraAngle.horizontal;
                                mapEngine.player.pitch = tpsCameraAngle.vertical;
                            }
                        }
                    }
                }
            }
        }
        function setupInputEvents() {
            const adv = () => { 
                // 処理中（ノード遷移中）の連打は完全に無視する
                if (isProcessingNode) return;

                // 非表示中の場合は戻すだけ
                const box = document.getElementById('text-box');
                if (box && box.classList.contains('hidden-ui')) {
                    toggleMessageWindow();
                    return;
                }
                
                // ★最適化: タイプライター表示中なら、クリックで全表示（スキップ）する
                if (typeof window._skipTypewriter === 'function') {
                    window._skipTypewriter();
                    // 全表示した直後は、次のクリックまで少し(100ms)待つ（連打による暴発防止）
                    isProcessingNode = true;
                    setTimeout(() => { isProcessingNode = false; }, 100);
                    return; 
                }

                if(!isMapMode || isWaitingForInput) {
                    if(currentNodeId && currentNodeId !== "null") {
                        processNode(currentNodeId); 
                    } else {
                        ui.textBox.style.display = 'none';
                        ui.name.style.display = 'none';
                        ui.overlay.style.display = 'none';
                        layers.charaContainer.innerHTML = '';
                    }
                }
            };
            ui.overlay.addEventListener('click', adv);

            // Setup Buttons (Action Button Config)
            const s = gameData.settings || {}; 
            const btnConfig = s.actionButtons || [{ label:"ACT", key:"Space", type:"variable_mode" }];
            const container = ui.mapActionContainer;
            container.innerHTML = ''; 
            
            btnConfig.forEach(conf => {
                const btn = document.createElement('div');
                btn.className = 'map-act-btn';
                btn.dataset.key = conf.key; 
                const keyLabel = conf.key.replace('Key','').replace('Left','');
                btn.innerHTML = '<span>' + conf.label + '</span><div class="key-badge">' + keyLabel + '</div>';
                
                const start = (e) => { e.preventDefault(); mapEngine.keys[conf.key] = true; mapEngine.rawKeys[conf.key] = true; btn.classList.add('pressed'); };
                const end = (e) => { e.preventDefault(); mapEngine.keys[conf.key] = false; mapEngine.rawKeys[conf.key] = false; btn.classList.remove('pressed'); };
                btn.addEventListener('mousedown', start);
                btn.addEventListener('mouseup', end);
                btn.addEventListener('mouseleave', end);
                btn.addEventListener('touchstart', start, {passive: false});
                btn.addEventListener('touchend', end);
                container.appendChild(btn);
            });

            document.querySelectorAll('.pad-btn').forEach(btn => {
                const key = btn.dataset.key;
                const startMove = (e) => { 
                    if(e.cancelable) e.preventDefault(); 
                    mapEngine.keys[key] = true; mapEngine.rawKeys[key] = true;
                    btn.classList.add('pressed');
                };
                const endMove = (e) => { 
                    if(e.cancelable) e.preventDefault(); 
                    mapEngine.keys[key] = false; mapEngine.rawKeys[key] = false;
                    btn.classList.remove('pressed'); 
                };
                btn.addEventListener('mousedown', startMove);
                btn.addEventListener('touchstart', startMove, {passive: false});
                btn.addEventListener('mouseup', endMove);
                btn.addEventListener('touchend', endMove);
                btn.addEventListener('mouseleave', endMove);
                // ★追加: 電話の着信や、指が画面外に出た時のキャンセルイベントにも対応
                btn.addEventListener('touchcancel', endMove);
            });

            // Keyboard & Mouse Events
            window.addEventListener('wheel', (e) => {
                if (isMapMode && mapEngine.data && mapEngine.data.type === '3d' && threeHandler.currentPlayerModel) {
                    e.preventDefault();
                    const zoomAmount = e.deltaY > 0 ? 0.1 : -0.1;
                    if (typeof threeHandler.adjustTpsCameraZoom === 'function') threeHandler.adjustTpsCameraZoom(zoomAmount);
                }
            }, { passive: false });
            
            window.addEventListener('keydown', (e) => {
                if (isMapMode) {
                    const isActionKey = btnConfig.some(b => b.key === e.code);
                    const moveKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyS', 'KeyA', 'KeyD'];
                    if (moveKeys.includes(e.code) || isActionKey) {
                        mapEngine.keys[e.code] = true;
                        mapEngine.rawKeys[e.code] = true; // ★追加
                        const visualBtn = container.querySelector('[data-key="' + e.code + '"]');
                        if(visualBtn) visualBtn.classList.add('pressed');
                    }
                } else {
                    if (e.code === 'Space' || e.code === 'Enter') {
                        // 非表示解除チェック
                        const box = document.getElementById('text-box');
                        if (box && box.classList.contains('hidden-ui')) {
                            toggleMessageWindow();
                            return;
                        }
                        // ★最適化: キーボードでも文字送りをスキップ
                        if (typeof window._skipTypewriter === 'function') {
                            window._skipTypewriter();
                            return;
                        }
                        
                        if (isWaitingForInput) processNode(currentNodeId);
                    }
                }
            });
            
            window.addEventListener('keyup', (e) => {
                if (isMapMode) {
                    if (mapEngine.keys[e.code] !== undefined) {
                        mapEngine.keys[e.code] = false;
                        mapEngine.rawKeys[e.code] = false; // ★追加
                        const visualBtn = container.querySelector('[data-key="' + e.code + '"]');
                        if(visualBtn) visualBtn.classList.remove('pressed');
                    }
                }
            });
window.addEventListener('blur', () => {
                mapEngine.keys = {};
                mapEngine.rawKeys = {}; // ★追加
                document.querySelectorAll('.map-act-btn, .pad-btn').forEach(b => b.classList.remove('pressed'));
            })
            // Camera Drag
            let lastMouseX = 0, lastMouseY = 0, isDragging = false;
            const startDrag = (e) => {
                if (e.target.closest('.pad-btn, .map-act-btn, #text-box, .sys-btn, .choice-button')) return;
                if (!isMapMode || !mapEngine.data) return;
                const type = mapEngine.data.type;
                if (type !== '3d' && type !== 'dungeon' && type !== 'panorama') return;
                isDragging = true;
                lastMouseX = e.clientX || e.touches[0].clientX;
                lastMouseY = e.clientY || e.touches[0].clientY;
            };
            const doDrag = (e) => {
                if (!isDragging) return;
                const crosshairConfig = hudElements['crosshair'] || {};
                const lockType = crosshairConfig.lockonType || 'attack';
                if (playerState.$isLockedOn && (lockType === 'camera' || lockType === 'both')) return;

                e.preventDefault();
                const cx = e.clientX || e.touches[0].clientX;
                const cy = e.clientY || e.touches[0].clientY;
                const deltaX = cx - lastMouseX;
                const deltaY = cy - lastMouseY;
                const sensitivity = 0.005;

                if (mapEngine.data.type === 'panorama') {
                    mapEngine.camera.x += deltaX * sensitivity;
                    if (mapEngine.camera.y === undefined) mapEngine.camera.y = 0.5;
                    mapEngine.camera.y -= deltaY * sensitivity;
                    mapEngine.camera.y = (mapEngine.camera.y + Math.PI * 2) % (Math.PI * 2);
                } else {
                    tpsCameraAngle.horizontal += deltaX * sensitivity;
                    tpsCameraAngle.vertical -= deltaY * sensitivity;
                    if (tpsCameraAngle.vertical > 1.5) tpsCameraAngle.vertical = 1.5;
                    if (tpsCameraAngle.vertical < -0.5) tpsCameraAngle.vertical = -0.5;
                    if (mapEngine.data.type === 'dungeon') {
                        mapEngine.player.dir = tpsCameraAngle.horizontal;
                        mapEngine.player.pitch = tpsCameraAngle.vertical;
                    }
                }
                lastMouseX = cx; lastMouseY = cy;
            };
            const endDrag = () => { isDragging = false; };

             ui.container.addEventListener('mousedown', startDrag);
            ui.container.addEventListener('mousemove', doDrag);
            ui.container.addEventListener('mouseup', endDrag);
            ui.container.addEventListener('mouseleave', endDrag);
            ui.container.addEventListener('touchstart', startDrag, {passive: false});
            ui.container.addEventListener('touchmove', (e) => {
                if (isDragging) e.preventDefault(); // ドラッグ中はスクロールを阻止
                doDrag(e);
            }, {passive: false});
            ui.container.addEventListener('touchend', endDrag);

            // Mouse Tracker
            const trackMouse = (e) => {
                const rect = mapEngine.canvas.getBoundingClientRect();
                const cx = e.touches ? e.touches[0].clientX : e.clientX;
                const cy = e.touches ? e.touches[0].clientY : e.clientY;
                const sx = mapEngine.canvas.width / rect.width;
                const sy = mapEngine.canvas.height / rect.height;
                mapEngine.mouseX = (cx - rect.left) * sx;
                mapEngine.mouseY = (cy - rect.top) * sy;
                if (e.type === 'mousedown' || e.type === 'touchstart') mapEngine.isClicked = true;
            };
            
            if (mapEngine.canvas) {
                mapEngine.canvas.addEventListener('mousemove', trackMouse);
                mapEngine.canvas.addEventListener('mousedown', trackMouse);
                mapEngine.canvas.addEventListener('touchstart', trackMouse, {passive: false});
                mapEngine.canvas.addEventListener('touchmove', (e) => { 
                    // ★最適化: マップモード中は、キャンバス上でのスワイプによる画面スクロールを完全にブロックする
                    if (isMapMode) e.preventDefault(); 
                    trackMouse(e); 
                }, {passive: false});
            }

            // Start Game Loop
            handleResize();
            window.addEventListener('resize', handleResize);
            
            lastTime = performance.now();
            requestAnimationFrame(mainLoop);
        }

               document.addEventListener('touchmove', function(e) {
            // スクロール可能な要素（テキストログ、インベントリなど）以外のタッチ操作は無効化する
            const isScrollable = e.target.closest('#message, #choices-box, #backlog-content, #inventory-list, #shop-items-container, .modal-content, #debug-window .debug-body');
            if (!isScrollable) {
                e.preventDefault();
            }
        }, { passive: false });
        
        // ダブルタップズーム防止
        let lastTouchEnd = 0;
        document.addEventListener('touchend', function(e) {
            const now = (new Date()).getTime();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, { passive: false });

        window.onload = initializeGame;
    <\/script>
</body>
</html>`;
}

function findNodeInProject(proj, nodeId) {
    for (const s in proj.scenario.sections) {
        if (proj.scenario.sections[s].nodes[nodeId]) return true;
    }
    return false;
}
export function exportGame() {
    const projectData = getProjectData();
    
    // 1. STARTノードが未設定なら、一番最初の章の最初のノードを自動で見つける
    if (!projectData.scenario.startNodeId) {
        let firstAvailableNode = null;
        for (const sId in projectData.scenario.sections) {
            const sec = projectData.scenario.sections[sId];
            const nodeIds = Object.keys(sec.nodes);
            if (nodeIds.length > 0) {
                firstAvailableNode = nodeIds[0];
                break;
            }
        }
        
        if (firstAvailableNode) {
            // 自動的に見つけたノードを開始地点にセット
            projectData.scenario.startNodeId = firstAvailableNode;
        } else {
            // ノードが一つもない場合のみエラーで終了
            alert('エラー: シナリオにノードが一つも存在しません。作成してから書き出してください。');
            return;
        }
    }

    // 2. 設定された（または自動設定された）ノードがプロジェクト内に実在するか最終チェック
    if (!findNodeInProject(projectData, projectData.scenario.startNodeId)) {
        alert('エラー: 指定された開始ノードが見つかりません。シナリオ構成を確認してください。');
        return;
    }
const confirmMsg = 
        "【書き出し前の確認】\n\n" +
        "生成されるゲームファイル(HTML)は、起動時にライブラリをダウンロードするため\n" +
        "「インターネット接続」が必須となります。\n" +
        "オフライン環境では動作しません。\n\n" +
        "書き出しますか？";

    if (!confirm(confirmMsg)) return;

    // ★追加: HTMLファイル名をユーザーに入力させる
    let fileName = prompt("書き出すHTMLファイルの名前を入力してください\n(※拡張子 .html は自動で付きます)", "game");
    if (fileName === null) return; // キャンセル時
    if (fileName.trim() === "") fileName = "game";
    fileName = fileName.replace(/\.html$/i, '') + '.html';

    // 4. HTML生成とダウンロード実行
    try {
        const gameHtml = generateGameHtml(projectData);
        const blob = new Blob([gameHtml], { type: 'text/html' });
        const link = document.createElement('a'); 
        link.href = URL.createObjectURL(blob); 
        
        // ★変更: ユーザーが決めた名前を使う
        link.download = fileName;
        
        document.body.appendChild(link); 
        link.click(); 
        document.body.removeChild(link);
    } catch (e) { 
        console.error(e); 
        alert('書き出し中にエラーが発生しました。'); 
    }
}
