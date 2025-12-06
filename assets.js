// assets.js

import * as state from './state.js';
import * as ui from './ui.js';
import { pixelsToWebPDataURL } from './utils.js';
function setupAssetManager(type, fileInputId, accept) {
    const fileInput = document.getElementById(fileInputId);
    if (!fileInput) {
        return;
    }

    fileInput.addEventListener('change', (e) => {
        // 処理済みのファイル数やエラー数をカウントするなどのデバッグ用変数
        let processedFilesCount = 0;
        let failedFilesCount = 0;

        for (const file of e.target.files) {
            const fileExtension = file.name.split('.').pop().toLowerCase();
            let isProcessed = false; // このファイルが処理されたかどうかのフラグ

            // ★★★ JSONファイル処理の追加 ★★★
          if (fileExtension === 'json') {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const json = JSON.parse(event.target.result);
                    // スプライトキャンバスのJSON形式をチェック
                    if (json.pixels && json.width && json.height && json.cols && json.rows) {
                        const id = `${type.slice(0, -1)}_${Date.now()}`;
                        const projectData = state.getProjectData();
                        
                        // ★★★ ここでData URLを生成して格納する ★★★
                        // 品質はデフォルト85%として、utils.pixelsToWebPDataURL を使用
                        const webPDataUrl = pixelsToWebPDataURL(json.pixels, json.width, json.height, 85); 
                        
                        projectData.assets[type][id] = {
                            name: file.name.replace('.json', ''),
                            data: webPDataUrl, // ★ Data URL を Data プロパティに格納 ★
                            // アニメーション設定情報も格納
                            isSpriteSheet: true,
                            pixelData: json.pixels, // デバッグ/後続処理用に生データも残す
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
                        alert(`JSONファイル「${file.name}」はスプライトキャンバス形式ではないためスキップされました。`);
                    }
                } catch(err) {
                    alert(`JSONファイルの解析中にエラーが発生しました: ${file.name}`);
                }
            };
            // ★★★ ここはテキストで読み込む ★★★
            reader.readAsText(file);
            isProcessed = true; 
        }
            
            // ★★★ JSONファイル処理ここまで ★★★

            // JSONファイルでなければ、通常のファイル処理に進む
            if (isProcessed) {
                // JSONファイルは上記で処理済みなので、次のファイルへ
                return; 
            }

            // 通常のファイル拡張子チェック (WebP, 音声など)
            if (!accept.includes(fileExtension) && !(type === 'sounds' && ['mp3', 'ogg', 'opus', 'webm'].includes(fileExtension))) {
                alert(`無効なファイル形式です: ${file.name}`);
                failedFilesCount++;
                return; // 無効なファイルはスキップ
            }

            // WebP / 音声ファイルなどのData URLへの読み込み処理
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const id = `${type.slice(0, -1)}_${Date.now()}`; // 例: character_67890
                    const projectData = state.getProjectData();
                    
                    projectData.assets[type][id] = {
                        name: file.name, // 元のファイル名
                        data: event.target.result, // Data URL
                        // アニメーション初期設定（画像ファイルの場合）
                        cols: 1, rows: 1, fps: 12, loop: true
                    };
                    
                    ui.renderAssetList(type);
                    ui.updateAssetDropdowns();
                    processedFilesCount++;
                } catch (err) {
                    alert(`ファイル ${file.name} の処理中にエラーが発生しました。`);
                    failedFilesCount++;
                }
            };
            reader.onerror = (err) => {
                alert(`ファイル ${file.name} の読み込みに失敗しました。`);
                failedFilesCount++;
            };
            reader.readAsDataURL(file); // 画像/音声はData URLとして読み込む
        } // for loop for file of e.target.files ends

        // ファイル選択をクリア (同じファイルを再度選択できるようにするため)
        fileInput.value = '';
    });
}

export function initAssetHandlers() {
    setupAssetManager('characters', 'character-file-input', 'webp');
    setupAssetManager('backgrounds', 'background-file-input', 'webp');
    setupAssetManager('sounds', 'sound-file-input', 'mp3,ogg,opus,webm'); // webmも追加

    const mainContent = document.getElementById('main-content');
    if (!mainContent) {
        return;
    }
    
    // UI要素の変更イベント（アセット名、アニメーション設定など）
    mainContent.addEventListener('change', (e) => {
        if (e.target.matches('.asset-card input[type="text"]')) {
            handleAssetNameChange(e);
        }
        // アニメーション設定の変更検知
        if (e.target.matches('.asset-card input[data-setting], .asset-card input[type="checkbox"]')) {
            handleAnimSettingChange(e);
        }
    });

    // UI要素のクリックイベント（削除ボタン、JSON読込ボタンなど）
    mainContent.addEventListener('click', (e) => {
        if (e.target.matches('.asset-card .danger-button')) {
            handleAssetDelete(e);
        }
        // JSON読込ボタン（スプライトキャンバスJSON用）
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
        if (newName) { // 名前が空にならないように
            projectData.assets[type][id].name = newName;
            ui.updateAssetDropdowns(); // ドロップダウンも更新
        } else {
            alert("アセット名は空にできません。");
            e.target.value = projectData.assets[type][id].name; // 元に戻す
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
    
    if (!asset) {
        return;
    }

    if (setting === 'loop') {
        asset.loop = e.target.checked;
    } else {
        // 数値設定 (cols, rows, fps)
        const value = parseInt(e.target.value, 10);
        if (!isNaN(value) && value >= 1) { // 1未満にならないように
            asset[setting] = value;
        } else {
            // 無効な入力の場合は元の値を表示
            alert("無効な数値です。1以上の整数を入力してください。");
            if (setting === 'cols' || setting === 'rows') e.target.value = asset.cols || 1;
            if (setting === 'fps') e.target.value = asset.fps || 12;
        }
    }
    // ui.renderAssetList(type); // UIを再描画すると、入力値がリセットされる可能性があるので注意。
    // ドロップダウンは更新した方が良い場合がある
    ui.updateAssetDropdowns();
}

function handleJsonLoad(btn) {
    const { id, type } = btn.dataset;
    
    // 一時的なファイル入力要素を作成してクリックをトリガー
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.style.display = 'none'; // 非表示
    document.body.appendChild(input); // DOMに追加しないと動かない場合がある

    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) {
            document.body.removeChild(input); // ファイルが選択されなかったら削除
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

                // JSONからスプライト設定を読み込み、assetオブジェクトを更新
                // JSONの構造に合わせてキー名を調整
                if (json.cols) asset.cols = Math.max(1, parseInt(json.cols, 10) || 1);
                if (json.rows) asset.rows = Math.max(1, parseInt(json.rows, 10) || 1);
                if (json.fps) asset.fps = Math.max(1, parseInt(json.fps, 10) || 12);
                if (json.loop !== undefined) asset.loop = !!json.loop; // booleanに変換
                
                // pixelData, width, height は project.js で処理されるため、ここでは不要

                alert('スプライト設定をJSONから読み込みました！');

                ui.renderAssetList(type); // UIを更新して設定値を反映
                ui.updateAssetDropdowns(); // ドロップダウンも更新
                
            } catch (err) {
                alert('JSONの読み込みまたは解析に失敗しました');
            } finally {
                document.body.removeChild(input); // 処理が終わったら一時要素を削除
            }
        };
        reader.onerror = (err) => {
            alert('ファイル読み込みエラー');
            document.body.removeChild(input);
        };
        reader.readAsText(file); // JSONはテキストとして読み込む
    };
    
    input.click(); // ファイル選択ダイアログを表示
}
