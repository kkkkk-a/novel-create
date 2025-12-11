// assets.js

import * as state from './state.js';
import * as ui from './ui.js';
import { pixelsToWebPDataURL } from './utils.js';

function processFiles(files, type, acceptString) {
    if (!files || files.length === 0) return;
    const allowedExts = acceptString.split(',').map(ext => ext.trim().toLowerCase());
    
    for (const file of files) {
        const fileExtension = file.name.split('.').pop().toLowerCase();
        
        // ★ JSONファイルの処理（アニメーション設定込み）
        if (fileExtension === 'json') {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const json = JSON.parse(event.target.result);
                    
                    // pixels配列とサイズ情報があるか確認
                    if (json.pixels && Array.isArray(json.pixels) && json.width && json.height) {
                        const id = `${type.slice(0, -1)}_${Date.now()}_${Math.floor(Math.random()*1000)}`;
                        const projectData = state.getProjectData();
                        
                        // 配列から画像データ(DataURL)を生成
                        const webPDataUrl = pixelsToWebPDataURL(json.pixels, json.width, json.height, 85); 
                        
                        // アセットとして登録
                        projectData.assets[type][id] = { 
                            name: file.name.replace('.json', ''), 
                            data: webPDataUrl, 
                            
                            // JSON内のメタデータを保存
                            isSpriteSheet: true,
                            width: json.width,
                            height: json.height,
                            cols: json.cols || 1,       // 列数
                            rows: json.rows || 1,       // 行数
                            fps: json.fps || 12,        // FPS
                            loop: json.loop !== undefined ? json.loop : true
                        };
                        
                        ui.renderAssetList(type); 
                        ui.updateAssetDropdowns();
                        alert(`アニメーションJSON「${file.name}」を読み込みました！\n(FPS: ${json.fps}, 分割: ${json.cols}x${json.rows})`);
                    } else { 
                        console.warn(`Invalid JSON structure: ${file.name}`);
                        alert("JSONの形式が正しくありません。\npixels, width, height が必要です。");
                    }
                } catch(err) { 
                    console.error(`JSON Error: ${file.name}`, err);
                    alert("JSONファイルの読み込みに失敗しました。");
                }
            };
            reader.readAsText(file);
            continue; // JSON処理が終わったら次のファイルへ
        }

        // 通常の画像・音声ファイルの処理
        const isSoundType = (type === 'sounds');
        const soundExts = ['mp3', 'ogg', 'opus', 'webm'];
        
        // ★ここを追加：背景の場合、webmとmp4を許可する
        const isVideoBg = (type === 'backgrounds' && (fileExtension === 'webm' || fileExtension === 'mp4'));
        
        // ★ここを書き換え：判定条件に isVideoBg を追加
        const isAllowed = allowedExts.includes(fileExtension) || (isSoundType && soundExts.includes(fileExtension)) || isVideoBg;
        
        if (!isAllowed) { 
            alert(`無効な形式: ${file.name}\n(${type})`); 
            continue; 
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const id = `${type.slice(0, -1)}_${Date.now()}_${Math.floor(Math.random()*1000)}`;
                const projectData = state.getProjectData();
                projectData.assets[type][id] = { 
                    name: file.name, 
                    data: event.target.result, 
                    cols: 1, rows: 1, fps: 12, loop: true // デフォルト値
                };
                ui.renderAssetList(type); 
                ui.updateAssetDropdowns();
            } catch (err) { console.error(err); alert(`Load Error: ${file.name}`); }
        };
        reader.readAsDataURL(file);
    }
}

function setupAssetManager(type, fileInputId, accept) {
    const fileInput = document.getElementById(fileInputId);
    if (!fileInput) return;
    fileInput.addEventListener('change', (e) => { processFiles(e.target.files, type, accept); fileInput.value = ''; });
    const dropZone = fileInput.closest('.asset-uploader');
    if (dropZone) {
        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); dropZone.classList.add('drag-over'); });
        dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); e.stopPropagation(); dropZone.classList.remove('drag-over'); });
        dropZone.addEventListener('drop', (e) => { e.preventDefault(); e.stopPropagation(); dropZone.classList.remove('drag-over'); const files = e.dataTransfer.files; if (files && files.length > 0) { processFiles(files, type, accept); } });
    }
}

export function initAssetHandlers() {
    setupAssetManager('characters', 'character-file-input', 'webp,json'); // JSONを許可
    setupAssetManager('backgrounds', 'background-file-input', 'webp,json,webm,mp4');
    setupAssetManager('sounds', 'sound-file-input', 'mp3,ogg,opus,webm');
    setupAssetManager('models', 'model-file-input', 'vrm,glb,gltf');
    setupAssetManager('animations', 'animation-file-input', 'vrma');

    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;
    
    mainContent.addEventListener('change', (e) => {
        if (e.target.matches('.asset-card input[type="text"]')) { handleAssetNameChange(e); }
        if (e.target.matches('.asset-card input[data-setting], .asset-card input[type="checkbox"]')) { handleAnimSettingChange(e); }
    });
    mainContent.addEventListener('click', (e) => {
        if (e.target.matches('.asset-card .danger-button')) { handleAssetDelete(e); }
    });
}

function handleAssetNameChange(e) {
    const { id, type } = e.target.dataset;
    if (!id || !type) return;
    const projectData = state.getProjectData();
    if (projectData.assets[type] && projectData.assets[type][id]) {
        const newName = e.target.value.trim();
        if (newName) { projectData.assets[type][id].name = newName; ui.updateAssetDropdowns(); }
        else { alert("空欄不可"); e.target.value = projectData.assets[type][id].name; }
    }
}

function handleAssetDelete(e) {
    const { id, type } = e.target.dataset;
    if (!id || !type) return;
    const projectData = state.getProjectData();
    if (!projectData.assets[type] || !projectData.assets[type][id]) return;
    if (confirm(`削除しますか？`)) {
        delete projectData.assets[type][id];
        ui.renderAssetList(type);
        ui.updateAssetDropdowns();
    }
}

function handleAnimSettingChange(e) {
    const { id, type, setting } = e.target.dataset;
    if (!id || !type) return;
    const projectData = state.getProjectData();
    const asset = projectData.assets[type][id];
    if (!asset) return;
    if (setting === 'loop') { asset.loop = e.target.checked; }
    else {
        const value = parseInt(e.target.value, 10);
        if (!isNaN(value) && value >= 1) { asset[setting] = value; }
    }
    ui.updateAssetDropdowns();
}
