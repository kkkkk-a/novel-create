// project.js (IndexedDB AutoSave Version)

import * as state from './state.js';
import * as ui from './ui.js';
import { resetMapEditor } from './mapEditor.js';

// 自動保存用の状態変数
let autoSaveIntervalId = null;
let isAutoSaving = false; // ロック用フラグ

// --- ★最適化: エディタ用の IndexedDB ヘルパー ---
const DB_NAME = 'NovelEditorDB';
const STORE_NAME = 'editor_backups';
const DB_VERSION = 1;

function openEditorDB() {
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

async function saveBackupToDB(key, data) {
    const db = await openEditorDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        
        // ★最適化: IndexedDBの容量制限(QuotaExceededError)やトランザクションの強制終了を確実にキャッチする
        tx.onabort = (e) => {
            const err = tx.error || new Error("保存処理がブラウザによって中断されました。容量不足の可能性があります。");
            reject(err);
        };
        
        const request = store.put(data, key);
        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(request.error || e.target.error);
    });
}


async function loadBackupFromDB(key) {
    const db = await openEditorDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * 現在のプロジェクトデータをJSONファイルとして手動保存(ダウンロード)する
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
 * IndexedDB を使用してブラウザ内部に自動保存を開始する
 */
async function startAutoSave() {
    const intervalInput = document.getElementById('autosave-interval-input');
    let minutes = 5;
    if (intervalInput) {
        const val = parseInt(intervalInput.value, 10);
        if (!isNaN(val) && val > 0) {
            minutes = val;
            localStorage.setItem('autosave_interval_minutes', minutes);
        } else {
            intervalInput.value = 5; 
        }
    }
    const intervalMs = minutes * 60 * 1000;

    if (autoSaveIntervalId) {
        if (!confirm(`自動保存は既に有効です。設定を変更して再開しますか？\n(設定間隔: ${minutes}分)`)) {
            return;
        }
        stopAutoSave();
    }

    try {
        // 1. 初回の保存を実行
        await performAutoSave();

        // 2. 定期実行タイマーをセット (可変間隔)
        autoSaveIntervalId = setInterval(async () => {
            await performAutoSave();
        }, intervalMs);

        updateAutoSaveStatusUI(true);
        alert(`ブラウザ内部への自動保存を開始しました。\n\n間隔: ${minutes}分ごと\n\n※万が一ブラウザがフリーズしても、次回起動時に「読込」から復元できます。`);

    } catch (err) {
        console.error("自動保存の開始に失敗:", err);
        alert("自動保存のセットアップに失敗しました。");
    }
}

/**
 * データベースにプロジェクトデータを上書き保存する
 */
async function performAutoSave() {
    if (isAutoSaving) return; 

    isAutoSaving = true; 

    try {
        const statusIndicator = document.getElementById('autosave-status-text');
        if (statusIndicator) statusIndicator.textContent = "保存中...";

        // プロジェクトデータのコピー（JSON化は不要、そのままDBに入れられるのがIndexedDBの強み）
        // ※ Structured Clone エラーを防ぐため、念のためJSON経由でディープコピーする
        const projectData = state.getProjectData();
        const cleanData = JSON.parse(JSON.stringify(projectData));

        // DBに書き込む
        await saveBackupToDB('latest_backup', cleanData);

        const timeStr = new Date().toLocaleTimeString();
        console.log(`[AutoSave] Backup saved at ${timeStr}`);
        
        if (statusIndicator) {
            statusIndicator.textContent = `最終保存: ${timeStr}`;
            statusIndicator.style.color = '#1890ff';
        }

    } catch (err) {
        console.error("[AutoSave] Write Error:", err);
        stopAutoSave();
        alert(`自動保存に失敗しました。\n素材が多すぎてブラウザの容量制限に引っかかった可能性があります。\n手動で「保存」(JSONダウンロード) を行ってください。\n\nエラー: ${err.message}`);
    } finally {
        isAutoSaving = false; 
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
    updateAutoSaveStatusUI(false);
}

/**
 * 自動保存のUI状態を更新するヘルパー
 */
function updateAutoSaveStatusUI(isActive) {
    const btn = document.getElementById('toggle-autosave-btn');
    const statusText = document.getElementById('autosave-status-text');
    const intervalInput = document.getElementById('autosave-interval-input');
    
    if (btn) {
        if (isActive) {
            btn.innerHTML = "自動保存<br>ON";
            btn.classList.add('active');
            btn.style.backgroundColor = '#e6f7ff';
            btn.style.color = '#1890ff';
            btn.style.borderColor = '#1890ff';
            
            // 実行中は間隔を変更できないようにロックする
            if(intervalInput) intervalInput.disabled = true;
        } else {
            btn.innerHTML = "自動保存<br>OFF";
            btn.classList.remove('active');
            btn.style.backgroundColor = '';
            btn.style.color = '';
            btn.style.borderColor = '';
            
            // 停止中は変更可能にする
            if(intervalInput) intervalInput.disabled = false;
        }
    }
    
    if (statusText) {
        if (!isActive) statusText.textContent = "";
    }
}

/**
 * ファイル読み込み処理 (JSONから)
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

            state.setProjectData(newData);
            state.setActiveSectionId(null);
            state.setActiveNodeId(null);
            ui.renderAll();
            ui.initUISettings();
            
            if (window.threeHandler) {
                window.threeHandler.resetEditorAssetLoader();
            }
            resetMapEditor();
            
            // ロード時に自動保存は一旦停止する（別プロジェクトの上書き防止）
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
    const autoSaveButton = document.getElementById('toggle-autosave-btn');
    
    // ローカルストレージから自動保存間隔を復元
    const intervalInput = document.getElementById('autosave-interval-input');
    if (intervalInput) {
        const savedInterval = localStorage.getItem('autosave_interval_minutes');
        if (savedInterval) {
            intervalInput.value = savedInterval;
        }
        intervalInput.addEventListener('change', (e) => {
            const val = parseInt(e.target.value, 10);
            if (!isNaN(val) && val > 0) {
                localStorage.setItem('autosave_interval_minutes', val);
                // 実行中なら再スタートして間隔を適用
                if (autoSaveIntervalId) startAutoSave();
            }
        });
    }

    if(saveButton) saveButton.addEventListener('click', saveProject);
    
    // ★最適化: 読込ボタンを押した時の動作を安全に（キャンセル＝中止）
    if(loadButton && loadInput) {
        loadButton.addEventListener('click', async () => {
            // ダイアログではなく、専用の確認プロンプトを使って意図しない動作を防ぐ
            const choice = prompt(
                "📂 プロジェクトを読み込みます。\nどちらから読み込みますか？\n\n" +
                "【1】パソコン内のファイル(.json)から読み込む\n" +
                "【2】ブラウザの自動保存バックアップから復元する\n\n" +
                "※半角数字の 1 または 2 を入力してください。\n(空白やキャンセルで中止します)",
                "1"
            );
            
            if (choice === "1") {
                // ファイルから読み込む
                loadInput.click();
            } else if (choice === "2") {
                // バックアップからの復元処理
                try {
                    const backupData = await loadBackupFromDB('latest_backup');
                    if (!backupData) {
                        alert("バックアップデータが見つかりません。");
                        return;
                    }
                    if (confirm("前回の自動保存データを復元しますか？\n(現在の編集中のデータはすべて上書きされます)")) {
                        state.setProjectData(backupData);
                        state.setActiveSectionId(null);
                        state.setActiveNodeId(null);
                        ui.renderAll();
                        ui.initUISettings();
                        if (window.threeHandler) window.threeHandler.resetEditorAssetLoader();
                        resetMapEditor();
                        stopAutoSave();
                        alert("バックアップからプロジェクトを復元しました！");
                    }
                } catch (e) {
                    console.error(e);
                    alert("バックアップの復元に失敗しました。");
                }
            } else {
                // キャンセル、または無効な入力
                return;
            }
        });
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
