

// project.js (Interval Control Version)

import * as state from './state.js';
import * as ui from './ui.js';
import { pixelsToWebPDataURL } from './utils.js'; 
import { resetMapEditor } from './mapEditor.js';

// 自動保存用の状態変数
let autoSaveHandle = null;
let autoSaveIntervalId = null;

/**
 * 現在のプロジェクトデータをJSONファイルとして手動保存する
 */
function saveProject() {
    try {
        const now = new Date();
        const defaultName = `project_${now.getFullYear()}${String(now.getMonth()+1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

        let fileName = prompt("保存するファイル名を入力してください（拡張子 .json は不要）", defaultName);

        if (fileName === null) return; 
        if (fileName.trim() === "") fileName = defaultName;

        if (!fileName.endsWith('.json')) {
            fileName += '.json';
        }

        const projectData = state.getProjectData();
        const jsonString = JSON.stringify(projectData, null, 2);
        
        const blob = new Blob([jsonString], { type: 'application/json' });
        const link = document.createElement('a');
        
        link.href = URL.createObjectURL(blob);
        link.download = fileName; 
        
        document.body.appendChild(link);
        link.click();
        
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

    } catch (error) {
        console.error("プロジェクトの保存に失敗しました:", error);
        alert("プロジェクトの保存中にエラーが発生しました。\n" + error.message);
    }
}

/**
 * File System Access API を使用して自動保存を開始する
 */
async function startAutoSave() {
    // ブラウザ対応チェック
    if (!('showSaveFilePicker' in window)) {
        // ▼▼▼ 修正: 具体的でわかりやすいメッセージに変更 ▼▼▼
        alert(
            "【非対応ブラウザです】\n\n" +
            "自動保存機能は、セキュリティの仕様上\n" +
            "以下のPC版ブラウザでのみ動作します。\n\n" +
            "✅ Google Chrome\n" +
            "✅ Microsoft Edge\n" +
            "✅ Opera\n\n" +
            "※Firefox, Safari(iPhone/Mac), IE等では使用できません。\n" +
            "手動での「保存」をご利用ください。"
        );
        // ▲▲▲ 修正ここまで ▲▲▲
        return;
    }

    // ★追加: 設定された間隔を取得
    const intervalInput = document.getElementById('autosave-interval-input');
    let minutes = 5;
    if (intervalInput) {
        const val = parseInt(intervalInput.value, 10);
        if (!isNaN(val) && val > 0) {
            minutes = val;
        } else {
            intervalInput.value = 5; // 不正値ならリセット
        }
    }
    const intervalMs = minutes * 60 * 1000;

    // すでに実行中の場合は停止確認
    if (autoSaveIntervalId) {
        if (!confirm(`自動保存は既に有効です。設定を変更して再開しますか？\n(設定間隔: ${minutes}分)`)) {
            return;
        }
        stopAutoSave();
    }

    try {
        const now = new Date();
        const defaultName = `autosave_${now.getFullYear()}${String(now.getMonth()+1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.json`;

        // 1. 保存先ファイルを選択させる（ユーザー許可）
        autoSaveHandle = await window.showSaveFilePicker({
            suggestedName: defaultName,
            types: [{
                description: 'Project JSON File',
                accept: { 'application/json': ['.json'] },
            }],
        });

        // 2. 初回の保存を実行
        await performAutoSaveToHandle(autoSaveHandle);

        // 3. 定期実行タイマーをセット (可変間隔)
        autoSaveIntervalId = setInterval(async () => {
            await performAutoSaveToHandle(autoSaveHandle);
        }, intervalMs);

        // UI更新
        updateAutoSaveStatusUI(true);
        alert(`自動保存を開始しました。\n\n保存先: ${autoSaveHandle.name}\n間隔: ${minutes}分ごと\n\n※このタブを開いている間のみ有効です。`);

    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error("自動保存の開始に失敗:", err);
            alert("自動保存のセットアップに失敗しました。");
        }
    }
}

/**
 * 保持しているハンドルに対してデータを上書き保存する
 */
let isAutoSaving = false; // ★追加: ロック用フラグ

async function performAutoSaveToHandle(handle) {
    if (!handle) return;
    if (isAutoSaving) return; // ★追加: 実行中ならスキップ

    isAutoSaving = true; // ロック開始


    try {
        const statusIndicator = document.getElementById('autosave-status-text');
        if (statusIndicator) statusIndicator.textContent = "保存中...";

        const projectData = state.getProjectData();
        const jsonString = JSON.stringify(projectData, null, 2);

        // WritableStreamを作成して書き込む
        const writable = await handle.createWritable();
        await writable.write(jsonString);
        await writable.close();

        const timeStr = new Date().toLocaleTimeString();
        console.log(`[AutoSave] Saved to ${handle.name} at ${timeStr}`);
        
        if (statusIndicator) {
            statusIndicator.textContent = `最終保存: ${timeStr}`;
            statusIndicator.style.color = '#1890ff';
        }

    } catch (err) {
        console.error("[AutoSave] Write Error:", err);
        stopAutoSave();
        alert(`自動保存に失敗しました。\n保存先の権限が失われた可能性があります。\n\nエラー: ${err.message}`);
    } finally {
        isAutoSaving = false; // ★追加: 必ずロック解除
    }
}

/**
 * 自動保存を停止する
 */
function stopAutoSave() {
    if (autoSaveIntervalId) {
        clearInterval(autoSaveIntervalId);
        autoSaveIntervalId = null;
    }
    autoSaveHandle = null;
    updateAutoSaveStatusUI(false);
}

/**
 * 自動保存のUI状態を更新するヘルパー
 */
function updateAutoSaveStatusUI(isActive) {
    const btn = document.getElementById('toggle-autosave-btn');
    const statusText = document.getElementById('autosave-status-text');
    const intervalInput = document.getElementById('autosave-interval-input'); // ★追加
    
    if (btn) {
        if (isActive) {
            btn.innerHTML = "自動保存<br>ON";
            btn.classList.add('active');
            btn.style.backgroundColor = '#e6f7ff';
            btn.style.color = '#1890ff';
            btn.style.borderColor = '#1890ff';
            
            // ★実行中は間隔を変更できないようにロックする
            if(intervalInput) intervalInput.disabled = true;
        } else {
            btn.innerHTML = "自動保存<br>OFF";
            btn.classList.remove('active');
            btn.style.backgroundColor = '';
            btn.style.color = '';
            btn.style.borderColor = '';
            
            // ★停止中は変更可能にする
            if(intervalInput) intervalInput.disabled = false;
        }
    }
    
    if (statusText) {
        if (!isActive) statusText.textContent = "";
    }
}

/**
 * ファイル読み込み処理 (既存)
 */
function loadProject(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            let newData;
            try {
                newData = JSON.parse(e.target.result);
            } catch (jsonError) {
                throw new Error("ファイルが破損しているか、正しいJSON形式ではありません。");
            }

            const missingFields = [];
            if (!newData.scenario) missingFields.push('scenario (シナリオデータ)');
            if (!newData.assets) missingFields.push('assets (素材データ)');
            
            if (missingFields.length > 0) {
                const errorMsg = "このファイルは、本ツール規定のプロジェクトファイルではありません。\n\n不足しているデータ:\n" + missingFields.join('\n');
                throw new Error(errorMsg);
            }

            if (!newData.maps) newData.maps = {};

            const assetTypes = ['characters', 'backgrounds', 'sounds'];
            const assetData = newData.assets;
            const defaultQuality = newData.settings && newData.settings.quality ? newData.settings.quality : 85; 
            
            for (const type of assetTypes) {
                if (!assetData[type]) continue;
                for (const id in assetData[type]) {
                    const asset = assetData[type][id];
                    if (asset.isSpriteSheet === true && Array.isArray(asset.pixelData) && asset.width && asset.height) {
                        const webPDataUrl = pixelsToWebPDataURL(asset.pixelData, asset.width, asset.height, defaultQuality);
                        assetData[type][id] = {
                            name: asset.name || id,
                            data: webPDataUrl, 
                            cols: asset.cols || 1,
                            rows: asset.rows || 1,
                            fps: asset.fps || 12,
                            loop: asset.loop !== undefined ? asset.loop : true
                        };
                    }
                }
            }

            state.setProjectData(newData);
            state.setActiveSectionId(null);
            state.setActiveNodeId(null);
            ui.renderAll();
            ui.initUISettings();
            
            if (window.threeHandler) {
                window.threeHandler.resetEditorAssetLoader();
            }
            resetMapEditor();
            
            // ロード時に自動保存は停止する
            stopAutoSave();
            
            alert(`プロジェクト「${file.name}」を読み込みました。`);

        } catch (err) {
            console.error('プロジェクト読み込みエラー:', err);
            alert(`【読み込み失敗】\n\n${err.message}`);
        } finally {
            event.target.value = '';
        }
    };
    reader.readAsText(file);
}

export function initProjectHandlers() {
    const saveButton = document.getElementById('save-project-btn');
    const loadButton = document.getElementById('load-project-btn');
    const loadInput = document.getElementById('load-project-input');
    
    // 自動保存ボタン
    const autoSaveButton = document.getElementById('toggle-autosave-btn');

    if(saveButton) saveButton.addEventListener('click', saveProject);
    
    if(loadButton && loadInput) {
        loadButton.addEventListener('click', () => loadInput.click());
        loadInput.addEventListener('change', loadProject);
    }

    if (autoSaveButton) {
        autoSaveButton.addEventListener('click', () => {
            if (autoSaveIntervalId) {
                if (confirm("自動保存を停止しますか？")) {
                    stopAutoSave();
                }
            } else {
                startAutoSave();
            }
        });
    }
}
