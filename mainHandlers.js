// mainHandlers.js

import * as state from './state.js';
import * as ui from './ui.js';
import { initScenarioHandlers } from './scenarioHandlers.js';
import { initVariableHandlers } from './variableHandlers.js';
import { refreshMapEditorUI } from './mapEditor.js';
import * as threeHandler from './threeHandler.js';
function switchMode(newMode) {
    state.setActiveMode(newMode);
    ui.switchModeUI(newMode);

    // プレビューの処理
    if (newMode === 'preview') {
        ui.updatePreview(); 
    } else {
        ui.clearPreview();
    }
    
    // マップモードの処理
    if (newMode === 'map') {
        const mapCanvas3d = document.getElementById('map-3d-canvas');
        
        if (mapCanvas3d) {
            if (threeHandler.renderer && threeHandler.renderer.domElement === mapCanvas3d) {
                // 既に初期化済みならリサイズのみ
                threeHandler.onResize(mapCanvas3d.clientWidth, mapCanvas3d.clientHeight);
            } else {
                // 初回初期化
                threeHandler.init(mapCanvas3d);
            }
            // ★追加: マップタブに来たら描画ループを再開
            threeHandler.startRendering();
        }
        
        refreshMapEditorUI();
    } else {
        // ★追加: マップ以外のタブでは3D描画を停止して負荷を下げる
        if (window.threeHandler && window.threeHandler.stopRendering) {
            window.threeHandler.stopRendering();
        }
    }
}

export function initMainHandlers() {
    const mainNav = document.getElementById('main-nav');
    mainNav.addEventListener('click', e => {
        if (e.target.matches('.nav-button')) {
            const mode = e.target.dataset.mode;
            if (mode) {
                switchMode(mode);
            }
        }
    });

    // ▼▼▼ スマホ用タブのイベントリスナーは完全に削除 ▼▼▼

    initScenarioHandlers();
    initVariableHandlers();
    
    switchMode('scenario');
}
