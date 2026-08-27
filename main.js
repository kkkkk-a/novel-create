// main.js

import * as state from './state.js';
import { initUi, initUISettings } from './ui.js';
import { initAssetHandlers } from './assets.js';
import { initProjectHandlers } from './project.js';
import { initMainHandlers } from './mainHandlers.js'; 
import { exportGame } from './export.js'; 
import { initMapEditor } from './mapEditor.js';
// ★修正: threeHandler の静的インポートを削除 (動的インポートに切り替えるため)
// import * as threeHandler from './threeHandler.js';

import { initItemHandlers, renderItemList } from './itemHandlers.js';
import { initEnemyHandlers, renderEnemyList } from './enemyHandlers.js';
import { initParticleHandlers, renderParticleList } from './particleHandlers.js';

function updateStatusUI(type, isOk, message) {
    const el = document.getElementById(type === 'network' ? 'status-network' : 'status-3d-lib');
    if (!el) return;

    if (isOk) {
        el.classList.add('status-ok');
        el.classList.remove('status-ng');
        el.title = message || "正常";
    } else {
        el.classList.add('status-ng');
        el.classList.remove('status-ok');
        el.title = message || "無効 / エラー";
    }
}

/**
 * ネットワーク状態とライブラリ読み込みのチェック
 */
async function load3DModule() {
    try {
        const threeHandler = await import('./threeHandler.js');
        
        state.setThreeHandler(threeHandler);
        window.threeHandler = threeHandler;
        
        updateStatusUI('lib', true, "3Dエンジン: 準備完了");
        
        return true;
    } catch (e) {
        console.warn("⚠️ 3D Library Load Failed (Offline?):", e);
        updateStatusUI('lib', false, "3Dエンジン: 読込失敗 (オフラインのため無効)");
        
        return false;
    }
}

/**
 * アプリケーションを起動するメイン関数
 */
async function main() {
    
    // ★追加: ネットワーク状態の監視と初期表示
    const updateNetStatus = () => {
        if (navigator.onLine) {
            updateStatusUI('network', true, "オンライン: 全機能が利用可能です");
        } else {
            updateStatusUI('network', false, "オフライン: 3D機能と書き出しが制限されます");
        }
    };
    
    window.addEventListener('online', () => {
        updateNetStatus();
        console.log("Network: Online");
    });
    window.addEventListener('offline', () => {
        updateNetStatus();
        console.log("Network: Offline");
    });
    
    // 初回チェック
    updateNetStatus();

    // オフライン時のアラート（既存のコード）
    if (!navigator.onLine) {
        alert("⚠️ 現在オフラインです。\n\nインターネット接続がないため、以下の機能が制限されます。\n・3Dモデルの表示\n・3Dマップのプレビュー\n・ゲームの書き出し機能の一部\n\n※シナリオ編集や2D素材の管理は可能です。");
    }

    // 3Dモジュールの読み込み試行
    const is3DLoaded = await load3DModule();

    if (!is3DLoaded) {
        // ダミーハンドラの設定（不足メソッドを補完）
        const dummyHandler = {
            init: () => {},
            resize: () => {},
            loadAssets: async () => {},
            showModel: () => {},
            hideAll: () => {},
            ensureEditorAssetsAreLoaded: async () => {}, 
            unloadModel: () => {},
            hideStage: () => {},
            hidePlayer: () => {},
            clearAll: () => {},
            stopRendering: () => {},
            startRendering: () => {},
            getScreenPosition: () => null,
            syncCamera: () => {},
            updatePlayerTransform: () => {},
            changePlayerAnimation: () => {},
            updateAndRender: () => {},
            adjustTpsCameraZoom: () => {},
            previewExpression: () => {}
        };
        state.setThreeHandler(dummyHandler);
        window.threeHandler = dummyHandler;
        
        document.body.classList.add('mode-offline-no-3d');
    }
    // UI初期化
    state.initQuill();

    // UI初期化
    initUi();
    initUISettings();
    
    // データ・アセット処理初期化
    initAssetHandlers();
    initProjectHandlers();
    
    // メインナビゲーション初期化
    initMainHandlers(); 
    
    // マップエディタ初期化
    initMapEditor();

    // 書き出しボタンの設定
    const exportButton = document.getElementById('export-game-btn');
    if(exportButton) {
        exportButton.addEventListener('click', () => {
            if (!navigator.onLine) {
                alert("⚠️ オフラインのため、ゲームの書き出し（HTML生成）は推奨されません。\n生成されたファイルはインターネット接続がないと起動しない可能性があります。");
            }
            exportGame();
        });
    } else {
        console.error("致命的エラー: 書き出しボタンが見つかりません。");
    }

    // ★★★ 各種データ管理機能の初期化 ★★★
    initItemHandlers();
    initEnemyHandlers();
    initParticleHandlers();

    // タブ切り替え時のリスト更新イベント
    const nav = document.getElementById('main-nav');
    if (nav) {
        nav.addEventListener('click', (e) => {
            const mode = e.target.dataset.mode;
            
            if (mode === 'items') {
                renderItemList();
            }
            if (mode === 'enemies') {
                renderEnemyList();
            }
            if (mode === 'particles') {
                renderParticleList();
            }
        });
    }

    // 安全装置: タブを閉じる前の警告
    window.addEventListener('beforeunload', (e) => {
        e.preventDefault();
        e.returnValue = '';
    });
}

const setupStatusClick = (id, type) => {
    const el = document.getElementById(id);
    if (!el) return;
    
    el.addEventListener('click', () => {
        const isOk = el.classList.contains('status-ok');
        let title = "";
        let canDo = "";
        let cannotDo = "";
        let action = "";

if (type === 'network') {
    title = isOk ? "【ネットワーク: オンライン】" : "【ネットワーク: オフライン】";
    if (isOk) {
        canDo = "・全機能の利用\n・Google Fontsの美しい表示\n・3Dライブラリやリッチエディタの正常な読み込み";
        action = "快適な制作環境です。";
    } else {
        canDo = "・シナリオの執筆（※装飾機能が制限される場合があります）\n・データの保存/読込、2D素材の管理";
        cannotDo = "・デザインフォントの表示（標準フォントに置き換わります）\n・リッチテキストエディタのフル機能\n・新規ライブラリの取得";
        action = "現在は「執筆特化モード」です。フォントや演出の最終確認はネットに繋いでから行ってください。";
    }
} else {
    title = isOk ? "【3D/物理エンジン: 有効】" : "【3D/物理エンジン: 無効】";
    if (isOk) {
        canDo = "・VRM/MMD/GLBモデルの表示\n・Ammo.jsによる髪や服の物理揺れ\n・3D/ダンジョンマップのプレビュー";
        action = "3D機能をフル活用した編集が可能です。";
    } else {
        canDo = "・2Dゲームとしてのすべての編集（立ち絵、背景、変数など）";
        cannotDo = "・3Dモデルの姿、物理的な揺れ（髪・服）の確認\n・3D系マップエディタのプレビュー";
        action = "3D機能（Three.js/Ammo.js）がロードされていません。3Dを扱う場合はネット環境で再起動してください。";
    }
}

        // メッセージの組み立て
        let fullMsg = `${title}\n\n`;
        fullMsg += `✅ できること:\n${canDo}\n\n`;
        if (cannotDo) fullMsg += `❌ 制限されること:\n${cannotDo}\n\n`;
        fullMsg += `💡 アドバイス:\n${action}`;

        alert(fullMsg);
    });
};

// 呼び出し（main関数の中などに配置）
setupStatusClick('status-network', 'network');
setupStatusClick('status-3d-lib', 'lib');

// --- アプリケーションの起動 ---
document.addEventListener('DOMContentLoaded', main);