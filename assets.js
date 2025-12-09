// assets.js

import * as state from './state.js';
import * as ui from './ui.js';
import { pixelsToWebPDataURL } from './utils.js';

/**
 * 渡されたファイルリストを処理してアセットとして登録する共通関数
 */
function processFiles(files, type, acceptString) {
    if (!files || files.length === 0) return;

    // 許可する拡張子のリストを作成 (例: ['webp', 'json', 'mp3', ...])
    const allowedExts = acceptString.split(',').map(ext => ext.trim().toLowerCase());
    // サウンドの場合はJSONも許可リストに含めなくてもロジック側ではじかれるだけなのでOKだが、
    // ここでは厳密なチェックはループ内で行う

    for (const file of files) {
        const fileExtension = file.name.split('.').pop().toLowerCase();
        let isProcessed = false;

        // ★ JSONファイル (スプライト設定) の処理
        if (fileExtension === 'json') {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const json = JSON.parse(event.target.result);
                    // スプライトキャンバス形式チェック
                    if (json.pixels && json.width && json.height && json.cols && json.rows) {
                        const id = `${type.slice(0, -1)}_${Date.now()}_${Math.floor(Math.random()*1000)}`;
                        const projectData = state.getProjectData();
                        
                        // Data URL生成
                        const webPDataUrl = pixelsToWebPDataURL(json.pixels, json.width, json.height, 85); 
                        
                        projectData.assets[type][id] = {
                            name: file.name.replace('.json', ''),
                            data: webPDataUrl,
                            isSpriteSheet: true,
                            pixelData: json.pixels,
                            width: json.width,
                            height: json.height,
                            cols: json.cols,
                            rows: json.rows,
                            fps: json.fps || 12,
                            loop: json.loop !== undefined ? json.loop : true
                        };
                        
                        ui.renderAssetList(type);
                        ui.updateAssetDropdowns();
                    } else {
                        // アセット設定JSONの読み込み（既存アセットへの上書き）の可能性
                        // 今回はシンプルにスプライト用JSON以外はスキップ、あるいはアラート
                        console.warn(`JSONファイル「${file.name}」はスプライトキャンバス形式ではありません。`);
                    }
                } catch(err) {
                    console.error(`JSON解析エラー: ${file.name}`, err);
                    alert(`JSONファイルの解析中にエラーが発生しました: ${file.name}`);
                }
            };
            reader.readAsText(file);
            isProcessed = true; 
        }

        if (isProcessed) continue;

        // ★ 通常ファイル (画像/音声) の処理
        // typeがsoundsの場合は音声系拡張子も許可
        const isSoundType = (type === 'sounds');
        const soundExts = ['mp3', 'ogg', 'opus', 'webm'];
        
        const isAllowed = allowedExts.includes(fileExtension) || (isSoundType && soundExts.includes(fileExtension));

        if (!isAllowed) {
            alert(`無効なファイル形式です: ${file.name}\n(${type} に登録できるのは ${allowedExts.join(', ')} です)`);
            continue;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                // IDの重複を防ぐためランダム値を付与
                const id = `${type.slice(0, -1)}_${Date.now()}_${Math.floor(Math.random()*1000)}`;
                const projectData = state.getProjectData();
                
                projectData.assets[type][id] = {
                    name: file.name,
                    data: event.target.result, // Data URL
                    // 画像用初期設定
                    cols: 1, rows: 1, fps: 12, loop: true
                };
                
                ui.renderAssetList(type);
                ui.updateAssetDropdowns();
            } catch (err) {
                console.error(err);
                alert(`ファイル ${file.name} の処理中にエラーが発生しました。`);
            }
        };
        reader.onerror = () => {
            alert(`ファイル ${file.name} の読み込みに失敗しました。`);
        };
        reader.readAsDataURL(file);
    }
}

function setupAssetManager(type, fileInputId, accept) {
    const fileInput = document.getElementById(fileInputId);
    if (!fileInput) return;

    // 1. 通常のファイル選択ボタン
    fileInput.addEventListener('change', (e) => {
        processFiles(e.target.files, type, accept);
        fileInput.value = ''; // 同じファイルを再選択できるようにリセット
    });

    // 2. ドラッグ＆ドロップ対応
    // inputの親要素(.asset-uploader)をドロップゾーンにする
    const dropZone = fileInput.closest('.asset-uploader');
    if (dropZone) {
        // ドラッグ中
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault(); // これがないとdropイベントが発火しない
            e.stopPropagation();
            dropZone.classList.add('drag-over'); // CSSで見た目を変える
        });

        // ドラッグが外れた
        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('drag-over');
        });

        // ドロップされた
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('drag-over');
            
            const files = e.dataTransfer.files;
            if (files && files.length > 0) {
                processFiles(files, type, accept);
            }
        });
    }
}

export function initAssetHandlers() {
    setupAssetManager('characters', 'character-file-input', 'webp');
    setupAssetManager('backgrounds', 'background-file-input', 'webp');
    setupAssetManager('sounds', 'sound-file-input', 'mp3,ogg,opus,webm');

    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;
    
    // UI要素の変更イベント（アセット名、アニメーション設定など）
    mainContent.addEventListener('change', (e) => {
        if (e.target.matches('.asset-card input[type="text"]')) {
            handleAssetNameChange(e);
        }
        if (e.target.matches('.asset-card input[data-setting], .asset-card input[type="checkbox"]')) {
            handleAnimSettingChange(e);
        }
    });

    // UI要素のクリックイベント（削除ボタン、JSON読込ボタンなど）
    mainContent.addEventListener('click', (e) => {
        if (e.target.matches('.asset-card .danger-button')) {
            handleAssetDelete(e);
        }
        if (e.target.matches('.json-btn')) {
            handleJsonLoad(e.target);
        }
    });
}

// --- アセットカード内のイベントハンドラ ---

function handleAssetNameChange(e) {
    const { id, type } = e.target.dataset;
    const projectData = state.getProjectData();
    if (projectData.assets[type] && projectData.assets[type][id]) {
        const newName = e.target.value.trim();
        if (newName) { 
            projectData.assets[type][id].name = newName;
            ui.updateAssetDropdowns();
        } else {
            alert("アセット名は空にできません。");
            e.target.value = projectData.assets[type][id].name;
        }
    }
}

function handleAssetDelete(e) {
    const { id, type } = e.target.dataset;
    const projectData = state.getProjectData();
    const assetName = projectData.assets[type][id]?.name || '不明なアセット';
    
    if (confirm(`アセット「${assetName}」を本当に削除しますか？`)) {
        delete projectData.assets[type][id];
        ui.renderAssetList(type);
        ui.updateAssetDropdowns();
    }
}

function handleAnimSettingChange(e) {
    const { id, type, setting } = e.target.dataset;
    const projectData = state.getProjectData();
    const asset = projectData.assets[type][id];
    
    if (!asset) return;

    if (setting === 'loop') {
        asset.loop = e.target.checked;
    } else {
        const value = parseInt(e.target.value, 10);
        if (!isNaN(value) && value >= 1) {
            asset[setting] = value;
        } else {
            alert("無効な数値です。1以上の整数を入力してください。");
            if (setting === 'cols' || setting === 'rows') e.target.value = asset.cols || 1;
            if (setting === 'fps') e.target.value = asset.fps || 12;
        }
    }
    ui.updateAssetDropdowns();
}

function handleJsonLoad(btn) {
    const { id, type } = btn.dataset;
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.style.display = 'none';
    document.body.appendChild(input);

    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) {
            document.body.removeChild(input);
            return;
        }
        
        const reader = new FileReader();
        reader.onload = evt => {
            try {
                const json = JSON.parse(evt.target.result);
                const projectData = state.getProjectData();
                const asset = projectData.assets[type][id];

                if (!asset) {
                    alert(`アセット「${id}」が見つかりません。`);
                    document.body.removeChild(input);
                    return;
                }

                if (json.cols) asset.cols = Math.max(1, parseInt(json.cols, 10) || 1);
                if (json.rows) asset.rows = Math.max(1, parseInt(json.rows, 10) || 1);
                if (json.fps) asset.fps = Math.max(1, parseInt(json.fps, 10) || 12);
                if (json.loop !== undefined) asset.loop = !!json.loop;

                alert('スプライト設定をJSONから読み込みました！');

                ui.renderAssetList(type);
                ui.updateAssetDropdowns();
                
            } catch (err) {
                alert('JSONの読み込みまたは解析に失敗しました');
            } finally {
                document.body.removeChild(input);
            }
        };
        reader.onerror = (err) => {
            alert('ファイル読み込みエラー');
            document.body.removeChild(input);
        };
        reader.readAsText(file);
    };
    
    input.click();
}
