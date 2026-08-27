// mapEditor.js (Ultimate Complete Version 2.3 - Undo/Redo)

import * as state from './state.js';
import { createLinkedSelects, populateAssetSelect, updateAllNodeSelects, updateVariableSelects } from './ui.js';
// エディタの状態
let currentMapId = null;
let currentTool = 'pointer'; 
let ctx = null;
let canvas = null;
let isDrawing = false;
let isBoxSelecting = false;
let boxStart = { x: 0, y: 0 };
let boxEnd = { x: 0, y: 0 };

let selectedObject = null;
let selectedObjects = []; 
const imageCache = {};

// ★履歴管理用
const MAX_HISTORY = 50;
let historyStack = [];
let futureStack = [];

// 描画設定 (ペン) - デフォルト値
let penSettings = {
    visualType: 'color', color: '#888888', opacity: 1.0, 
    w: 32, h: 32,
    charId: '', charIdMove: '', charIdAttack: '', charIdDamage: '',
    renderType: 'billboard', z: 0, 
    roleType: 'obstacle', // ★追加: 役割
    itemId: '',           // ★追加: アイテムID
    itemAmount: 1,        // ★追加: 個数
    itemPickup: 'touch',  // ★追加: 取得法
    isWall: true,  effectType: 'none', 
    moveType: 'fixed', spd: 2, moveRange: 3, moveChaseId: '',
    hasEvent: false, eventTrigger: 'touch', eventRepeat: 'once', eventList: [{ nodeId: '' }],
    hasBattleEvent: false, battleEvents: [], 
    condition: { variable: '', operator: '==', value: '' },
    isSpawn: false, spawnId: '',
    keepDestroyed: false,
    hp: '10', damage: '1', destructible: true, showHpBar: false,
    defense: 0, penetration: 1,
    attackRange: 32, attackCooldown: 60, projectileSpeed: 0
};
const GRID_SIZE = 32;

export function refreshMapEditorUI() {
    if (currentMapId) {
        loadMap(currentMapId);
    }
}

export function initMapEditor() {
    canvas = document.getElementById('map-canvas');
    const canvas3d = document.getElementById('map-3d-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    if (canvas3d && window.threeHandler) {
        window.threeHandler.init(canvas3d);
    }

    // マップ管理ボタン
    document.getElementById('create-map-btn').addEventListener('click', createNewMap);
    document.getElementById('map-list-select').addEventListener('change', (e) => { 
        if (e.target.value) { loadMap(e.target.value); } 
        else { currentMapId = null; toggleEditorVisibility(false); } 
    });
    
    // マップ全体の設定変更
    document.getElementById('map-settings-form').addEventListener('change', updateMapSettings);
    
    const crushContainer = document.getElementById('map-crush-event-select');
    if (crushContainer) crushContainer.addEventListener('change', updateMapSettings);
    
    const gameoverContainer = document.getElementById('map-gameover-event-select');
    if (gameoverContainer) gameoverContainer.addEventListener('change', updateMapSettings);

    // ツールボタン制御
    document.querySelectorAll('.map-tool-btn').forEach(btn => {
        if (btn.id === 'map-undo-btn' || btn.id === 'map-redo-btn') return;

        btn.addEventListener('click', (e) => {
            const target = e.currentTarget; 
            document.querySelectorAll('.map-tool-btn').forEach(b => {
                if (b.id !== 'map-undo-btn' && b.id !== 'map-redo-btn') b.classList.remove('active');
            });
            target.classList.add('active');
            currentTool = target.dataset.tool;
            
            if (currentTool !== 'pointer') { 
                selectedObject = null; 
                selectedObjects = [];
                updateFormFromData(penSettings); 
                drawMap(); 
            }
        });
    });

    // Undo / Redo ボタンのクリック
    document.getElementById('map-undo-btn').addEventListener('click', undo);
    document.getElementById('map-redo-btn').addEventListener('click', redo);

    // キャンバス操作（マウス）
    canvas.addEventListener('mousedown', handleCanvasDown);
    canvas.addEventListener('mousemove', handleCanvasMove);
    canvas.addEventListener('mouseup', handleCanvasUp);
    canvas.addEventListener('mouseleave', handleCanvasUp);

    // タッチ操作対応
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handleCanvasDown(e); }, { passive: false });
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); handleCanvasMove(e); }, { passive: false });
    canvas.addEventListener('touchend', (e) => { e.preventDefault(); handleCanvasUp(e); }, { passive: false });

    // キーボードショートカット (Ctrl+Z / Ctrl+Y)
    window.addEventListener('keydown', (e) => {
        if (!currentMapId || document.getElementById('map-editor-ui').classList.contains('hidden')) return;
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            e.preventDefault();
            undo();
        }
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
            e.preventDefault();
            redo();
        }
    });

    // オブジェクト設定フォームの変更検知
        const objForm = document.getElementById('obj-settings-form');
    objForm.addEventListener('change', (e) => {
        if (e.target.tagName === 'BUTTON') return;
        
        // ★修正: パラメータの数値を変更する前に、現在の状態を履歴(Undo用)に保存する
        pushHistory();
        
        syncDataFromForm();
    });
    // シナリオノードの選択肢更新が必要な項目
    document.getElementById('obj-spawn-id').addEventListener('change', () => {
         updateAllNodeSelects();
    });

    // イベント追加・削除ボタンの管理
    document.getElementById('add-event-step-btn').addEventListener('click', () => {
        const targets = (selectedObjects.length > 0) ? selectedObjects : [penSettings];
        // ★修正: pushHistory削除
        targets.forEach(t => {
            if (!t.eventList) t.eventList = [];
            t.eventList.push({ nodeId: '' });
        });
        renderEventList((selectedObject || penSettings).eventList);
        syncDataFromForm(); // ★修正: 引数削除
    });

    document.getElementById('add-battle-event-btn').addEventListener('click', () => {
        const targets = (selectedObjects.length > 0) ? selectedObjects : [penSettings];
        // ★修正: pushHistory削除
        targets.forEach(t => {
            if (!t.battleEvents) t.battleEvents = [];
            t.battleEvents.push({ threshold: 0, nodeId: '' });
        });
        renderBattleEventList((selectedObject || penSettings).battleEvents);
        syncDataFromForm(); // ★修正: 引数削除
    });

    // ★★★ ここに追加: 計算式ヘルプボタンの動作 ★★★
    const battleHelpBtn = document.getElementById('open-battle-help-btn');
    const battleHelpModal = document.getElementById('battle-help-modal');
    
    if (battleHelpBtn && battleHelpModal) {
        battleHelpBtn.addEventListener('click', () => {
            battleHelpModal.classList.remove('hidden');
        });
        
        // 念のため、閉じるボタン(HTML側にonclickがある場合もありますが、JSでも確実に閉じるようにしておく)
        const closeBtn = battleHelpModal.querySelector('.close-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                battleHelpModal.classList.add('hidden');
            });
        }
        
        // モーダルの外側をクリックしても閉じるようにする
        battleHelpModal.addEventListener('click', (e) => {
            if (e.target === battleHelpModal) {
                battleHelpModal.classList.add('hidden');
            }
        });
    }

        const sizeW = document.getElementById('obj-size-w');
    const sizeH = document.getElementById('obj-size-h');
    if (sizeW) sizeW.addEventListener('change', syncDataFromForm);
    if (sizeH) sizeH.addEventListener('change', syncDataFromForm);
    const refreshEnemyBtn = document.getElementById('refresh-enemy-list-btn');
    if (refreshEnemyBtn) {
        refreshEnemyBtn.addEventListener('click', (e) => {
            e.preventDefault(); // フォーム送信を防ぐ
            updateEnemySelectOptions();
        });
    }

    renderMapList();
    toggleEditorVisibility(false);
}

// --- 履歴管理関数 ---
// 履歴保存 (変更を加える直前に呼ぶ)
function pushHistory() {
    if (!currentMapId) return;
    const map = state.getProjectData().maps[currentMapId];
    
    // 現在の状態(変更前)をJSON化
    const snapshot = JSON.stringify(map.objects);
    
    // ★修正: 重複チェックを緩和
    // 完全に同じデータが連続する場合のみ保存しないが、
    // タイミングによっては保存すべきケースもあるため、ここはシンプルにスタックへ積む
    if (historyStack.length > 0 && historyStack[historyStack.length - 1] === snapshot) {
        // 全く同じなら保存しない（連打対策）
        return;
    }
    
    historyStack.push(snapshot);
    if (historyStack.length > MAX_HISTORY) historyStack.shift();
    
    // 新しい操作をしたのでRedoスタックはクリア
    futureStack = [];
    updateUndoRedoButtons();
}

function undo() {
    if (historyStack.length === 0 || !currentMapId) return;
    
    // 1. フォーカスを外す (入力中の値を確定させるため)
    if (document.activeElement) document.activeElement.blur();

    const map = state.getProjectData().maps[currentMapId];
    
    // 現在の選択状態IDを記憶
    const currentSelectedId = selectedObject ? selectedObject.id : null;

    // 現在の状態をFuture(Redo用)に退避
    futureStack.push(JSON.stringify(map.objects));
    
    // History(Undo用)から過去の状態を取り出す
    const prev = historyStack.pop();
    map.objects = JSON.parse(prev);
    
    // ★重要: 選択状態とUIを復元
    restoreSelectionAndUI(map, currentSelectedId);
    
    drawMap();
    updateUndoRedoButtons();
}

function redo() {
    if (futureStack.length === 0 || !currentMapId) return;

    if (document.activeElement) document.activeElement.blur();
    
    const map = state.getProjectData().maps[currentMapId];
    const currentSelectedId = selectedObject ? selectedObject.id : null;

    // 現在の状態をHistoryに退避
    historyStack.push(JSON.stringify(map.objects));
    
    // Futureから未来の状態を取り出す
    const next = futureStack.pop();
    map.objects = JSON.parse(next);
    
    // 選択状態とUIを復元
    restoreSelectionAndUI(map, currentSelectedId);
    
    drawMap();
    updateUndoRedoButtons();
}

// 復元後のデータからオブジェクトを再選択し、UIを更新する関数
function restoreSelectionAndUI(map, targetId) {
    // 一旦リセット
    selectedObject = null;
    selectedObjects = [];

    if (targetId) {
        // IDでオブジェクトを探す
        const found = map.objects.find(o => o.id === targetId);
        if (found) {
            selectedObject = found;
            selectedObjects = [found]; // 単一選択として復帰
            
            // ★最重要: フォームの値を強制的にデータで上書きする
            updateFormFromData(found);
        } else {
            // オブジェクトが消えていた場合（削除のUndoなど）はペン設定に戻す
            updateFormFromData(penSettings);
        }
    } else {
        // 元々選択していなかった場合
        updateFormFromData(penSettings);
    }
    
    // ★追加: 3Dプレビュー等の表示更新も確実に行う
    if (selectedObject) {
        updateUIVisibilityByRole(selectedObject.roleType);
    }
}

function updateUndoRedoButtons() {
    const uBtn = document.getElementById('map-undo-btn');
    const rBtn = document.getElementById('map-redo-btn');
    if (uBtn) uBtn.disabled = (historyStack.length === 0);
    if (rBtn) rBtn.disabled = (futureStack.length === 0);
    
    // スタイル調整（disabledの見た目）
    if (uBtn) uBtn.style.opacity = uBtn.disabled ? 0.5 : 1;
    if (rBtn) rBtn.style.opacity = rBtn.disabled ? 0.5 : 1;
}

// --- 以下、既存関数 ---

export function resetMapEditor() { 
    currentMapId = null; 
    selectedObject = null; 
    selectedObjects = [];
    historyStack = [];
    futureStack = [];
    renderMapList(); 
    toggleEditorVisibility(false); 
}
export function toggleEditorVisibility(show) {
    const ui = document.getElementById('map-editor-ui'); 
    const canvasEl = document.getElementById('map-canvas'); 
    const placeholder = document.getElementById('map-placeholder');
    const canvas3d = document.getElementById('map-3d-canvas');
    
    if (show) { 
        ui.classList.remove('hidden'); 
        canvasEl.classList.remove('hidden'); 
        placeholder.classList.add('hidden'); 
    } else { 
        ui.classList.add('hidden'); 
        canvasEl.classList.add('hidden'); 
        placeholder.classList.remove('hidden');
        if(canvas3d) canvas3d.style.display = 'none';
        if (window.threeHandler) {
            threeHandler.hideStage();
            threeHandler.hidePlayer();
        }
        // ★修正: タブを閉じた時に2D描画ループを停止し、ブラウザの負荷を下げる
        if (mapEditorAnimId) {
            cancelAnimationFrame(mapEditorAnimId);
            mapEditorAnimId = null;
        }
    }
}
function createNewMap() {
    const name = prompt("マップ名:", "新規マップ"); if (!name) return;
    const id = `map_${Date.now()}`;
    state.getProjectData().maps[id] = { 
        name: name, type: 'topdown', width: 20, height: 15, 
        bgImageId: '', bgmId: '', stageModelId: '', 
        zoom: 1.0, scrollDir: 'none', scrollSpeed: 1, 
        objects: [], crushEventNodeId: '', gameoverEventNodeId: '',
        edgeType: 'clamp'
    };
    
    renderMapList(); 
    document.getElementById('map-list-select').value = id; 
    loadMap(id);
    updateAllNodeSelects();
}

export function renderMapList() {
    const select = document.getElementById('map-list-select'); if (!select) return; const currentVal = select.value;
    select.innerHTML = '<option value="">-- マップ選択 --</option>'; const maps = state.getProjectData().maps;
    if (maps) { for (const id in maps) { select.add(new Option(maps[id].name, id)); } }
    if(maps && maps[currentVal]) { select.value = currentVal; }
}

function loadMap(id) {
    if (!id) return; 
    
    if (window.threeHandler && window.threeHandler.clearAll) {
        window.threeHandler.clearAll();
    }

    currentMapId = id; 
    const map = state.getProjectData().maps[id];

    if (typeof updateVariableSelects === 'function') {
        updateVariableSelects();
    }

        if (typeof updateEnemySelectOptions === 'function') {
        updateEnemySelectOptions();
    }
    
    // 履歴リセット
    historyStack = [];
    futureStack = [];
    updateUndoRedoButtons();
    
    toggleEditorVisibility(true);
    document.getElementById('map-name').value = map.name; 
    
    const typeSelect = document.getElementById('map-type');
    const opt3d = typeSelect.querySelector('option[value="3d"]');
    if (opt3d) opt3d.remove();
    
    if (map.stageModelId) {
        const opt = document.createElement('option');
        opt.value = '3d'; opt.textContent = '3Dアクション (専用)';
        typeSelect.add(opt); typeSelect.value = '3d'; typeSelect.disabled = true;
    } else {
        typeSelect.value = map.type; typeSelect.disabled = false;
    }

    document.getElementById('map-width').value = map.width; 
    document.getElementById('map-height').value = map.height;
    document.getElementById('map-init-zoom').value = map.zoom || 1.0;
        const gravityEl = document.getElementById('map-gravity');
    if (gravityEl) {
        gravityEl.value = (map.gravity !== undefined) ? map.gravity : 1.0;
    }
    
    const bgSelect = document.getElementById('map-bg-select'); 
    populateAssetSelect(bgSelect, 'backgrounds', 'なし'); 
    bgSelect.value = map.bgImageId || '';
        const bgOutSelect = document.getElementById('map-bg-outside-select');
    populateAssetSelect(bgOutSelect, 'backgrounds', 'なし (黒/グラデ)');
    bgOutSelect.value = map.bgOutsideId || ''; // データがない場合は空文字

    const bgmSelect = document.getElementById('map-bgm-select');
    if (bgmSelect) {
        populateAssetSelect(bgmSelect, 'sounds', 'なし / 継続');
        bgmSelect.value = map.bgmId || '';
    }
    
    const stageSelect = document.getElementById('map-stage-model-select');
    populateAssetSelect(stageSelect, 'models', 'なし (2Dのみ)');
    stageSelect.value = map.stageModelId || '';

    document.getElementById('map-scroll-dir').value = map.scrollDir || 'none'; 
    document.getElementById('map-scroll-speed').value = map.scrollSpeed || 1;

    const edgeSelect = document.getElementById('map-edge-type');
    if (edgeSelect) edgeSelect.value = map.edgeType || 'clamp';

    // ★ここに追加: 読み込み処理
    const clampTopEl = document.getElementById('map-clamp-top');
    if (clampTopEl) clampTopEl.checked = !!map.clampTop;
    const fallDeathEl = document.getElementById('map-enable-fall-death');
    if (fallDeathEl) fallDeathEl.checked = !!map.enableFallDeath;
        const rndMode = document.getElementById('map-random-mode');
    const rndWall = document.getElementById('map-random-wall-rate');
    const rndEnt = document.getElementById('map-random-entity-rate');
    const rndOpt = document.getElementById('map-random-options');

    if (rndMode) {
        rndMode.value = map.randomMode || 'none';
        
        // 表示切り替えイベント
        const toggleRnd = () => {
            if(rndOpt) rndOpt.style.display = (rndMode.value === 'generate') ? 'block' : 'none';
        };
        rndMode.onchange = toggleRnd; // イベント登録
        toggleRnd(); // 初回実行
    }
    if (rndWall) rndWall.value = (map.randomWallRate !== undefined) ? map.randomWallRate : 20;
    if (rndEnt) rndEnt.value = (map.randomEntityRate !== undefined) ? map.randomEntityRate : 1.0;

    const crushContainer = document.getElementById('map-crush-event-select');
    if (crushContainer) {
        createLinkedSelects(crushContainer, 'map-crush-event-node-id', map.crushEventNodeId || '');
    }
    
    const gameoverContainer = document.getElementById('map-gameover-event-select');
    if (gameoverContainer) {
        createLinkedSelects(gameoverContainer, 'map-gameover-event-node-id', map.gameoverEventNodeId || '');
    }
    
resizeMapCanvas();
    
    selectedObject = null; 
    selectedObjects = [];
    
    update3DToolsVisibility();
    updateObjRoleOptions();
    updateFormFromData(penSettings); 
    drawMap();
}

function updateMapSettings(e) {
    if (!currentMapId) return; 
    const map = state.getProjectData().maps[currentMapId];
    
    map.name = document.getElementById('map-name').value; 
    map.width = parseInt(document.getElementById('map-width').value); 
    map.height = parseInt(document.getElementById('map-height').value);
    map.zoom = parseFloat(document.getElementById('map-init-zoom').value) || 1.0;
map.gravity = document.getElementById('map-gravity').value;
    map.bgImageId = document.getElementById('map-bg-select').value;
        const bgOutSelect = document.getElementById('map-bg-outside-select');
    if (bgOutSelect) {
        map.bgOutsideId = bgOutSelect.value;
    }
    
    const bgmSel = document.getElementById('map-bgm-select');
    if(bgmSel) map.bgmId = bgmSel.value;
    
    const oldStageId = map.stageModelId;
    map.stageModelId = document.getElementById('map-stage-model-select').value;
    
    const typeSelect = document.getElementById('map-type');
    if (map.stageModelId) {
        if (map.type !== '3d') {
            if (!typeSelect.querySelector('option[value="3d"]')) {
                const opt = document.createElement('option'); opt.value = '3d'; opt.textContent = '3Dアクション (専用)'; typeSelect.add(opt);
            }
            typeSelect.value = '3d'; typeSelect.disabled = true; map.type = '3d';
        }
    } else {
        if (oldStageId && !map.stageModelId) {
            typeSelect.disabled = false;
            const opt3d = typeSelect.querySelector('option[value="3d"]'); if (opt3d) opt3d.remove();
            map.type = 'topdown'; typeSelect.value = 'topdown';
        } else {
            const newType = typeSelect.value;
            
            // ★最適化: マップタイプが変更された時の自動クリーンアップ
            if (map.type !== newType) {
                if (newType !== 'side' && map.objects) {
                    // 横スクロール(side)以外になった場合、ハシゴとジャンプ台をただの障害物に戻す
                    map.objects.forEach(obj => {
                        if (obj.roleType === 'ladder' || obj.roleType === 'jump') {
                            obj.roleType = 'obstacle';
                            obj.effectType = 'none';
                            obj.isWall = true;
                        }
                    });
                }
            }
            map.type = newType;
        }
    }

    map.scrollDir = document.getElementById('map-scroll-dir').value; 
    map.scrollSpeed = parseInt(document.getElementById('map-scroll-speed').value) || 1;

    const edgeSelect = document.getElementById('map-edge-type');
    if (edgeSelect) map.edgeType = edgeSelect.value;
const clampTopEl = document.getElementById('map-clamp-top');
    if (clampTopEl) map.clampTop = clampTopEl.checked;
    const fallDeathEl = document.getElementById('map-enable-fall-death');
    if (fallDeathEl) map.enableFallDeath = fallDeathEl.checked;
        const rndMode = document.getElementById('map-random-mode');
    if (rndMode) map.randomMode = rndMode.value;
    
    const rndWall = document.getElementById('map-random-wall-rate');
    if (rndWall) map.randomWallRate = parseInt(rndWall.value) || 0;
    
    const rndEnt = document.getElementById('map-random-entity-rate');
    if (rndEnt) map.randomEntityRate = parseFloat(rndEnt.value) || 1.0;
    
    const crushNodeSelect = document.getElementById('map-crush-event-node-id');
    if (crushNodeSelect) map.crushEventNodeId = crushNodeSelect.value;
    
    const gameoverNodeSelect = document.getElementById('map-gameover-event-node-id');
    if (gameoverNodeSelect) map.gameoverEventNodeId = gameoverNodeSelect.value;

resizeMapCanvas();

    if (map.objects) {
        const itemsDB = state.getProjectData().items;
        map.objects.forEach(obj => {
            // 役割がアイテムで、IDが有効な場合
            if (obj.roleType === 'item' && obj.itemId && itemsDB[obj.itemId]) {
                const itemDef = itemsDB[obj.itemId];
                const pConf = itemDef.placement || { hp: 0, isWall: false }; // デフォルト0
                
                // 設定を上書き更新
                obj.hp = (pConf.hp !== undefined) ? Number(pConf.hp) : 0;
                obj.isWall = (pConf.isWall !== undefined) ? pConf.isWall : false;
                
                // 付随パラメータも更新
                obj.destructible = (obj.hp > 0);
                obj.showHpBar = false;
                obj.dropItemId = (obj.hp > 0) ? obj.itemId : '';
            }
        });
    }
    
    update3DToolsVisibility();
    updateObjRoleOptions();
    drawMap(); 
    
    if(e.target.id === 'map-name') {
        renderMapList();
        updateAllNodeSelects();
    }
}

function update3DToolsVisibility() {
    if (!currentMapId) return;
    const map = state.getProjectData().maps[currentMapId];
    const type = map.type;
    const is3DMode = ['quarter', 'dungeon', 'mode7', '3d', 'belt', 'trapezoid'].includes(type) || !!map.stageModelId;
    
    const settingsGroup = document.getElementById('obj-3d-specific-settings');
    if (settingsGroup) {
        settingsGroup.style.display = is3DMode ? 'block' : 'none';
    }
}

function renderEventList(list) {
    const container = document.getElementById('obj-event-list-container'); container.innerHTML = '';
    list.forEach((item, index) => {
        const row = document.createElement('div'); row.style.display='flex'; row.style.alignItems='center'; row.style.marginBottom='5px'; row.style.gap='5px';
        const label = document.createElement('span'); label.textContent = `${index + 1}:`; label.style.fontSize='0.8em';
        
        const selectDiv = document.createElement('div'); selectDiv.className = 'smart-select-mini'; selectDiv.style.flex = '1';
        createLinkedSelects(selectDiv, `temp-event-list-${index}`, item.nodeId);
        selectDiv.addEventListener('change', () => { 
            const nodeSelect = document.getElementById(`temp-event-list-${index}`); 
            if (nodeSelect) { 
                // ★修正: pushHistory削除
                item.nodeId = nodeSelect.value; 
                syncDataFromForm(); // ★修正: 引数削除
            } 
        });

        const delBtn = document.createElement('button'); 
        delBtn.textContent='×'; 
        delBtn.className='danger-button del-event-step-btn'; 
        
        delBtn.type = 'button'; 
        delBtn.style.padding='2px 6px';
        delBtn.onclick = () => {
            // ★修正: pushHistory削除
            list.splice(index, 1);
            renderEventList(list);
            syncDataFromForm(); // ★修正: 引数削除
        };

        row.append(label, selectDiv, delBtn); container.appendChild(row);
    });
}

function renderBattleEventList(list) {
    const container = document.getElementById('obj-battle-event-list-container'); 
    if(!container) return;
    container.innerHTML = '';
    
    list.forEach((item, index) => {
        const row = document.createElement('div'); 
        row.style.cssText = 'display:flex; align-items:center; margin-bottom:5px; gap:5px; background:#fff0f0; padding:3px; border-radius:4px;';
        
        const label = document.createElement('span'); label.textContent = 'HP'; label.style.fontSize = '0.8em';
        
        const input = document.createElement('input');
        input.type = 'number'; input.className = 'battle-event-threshold'; input.dataset.index = index;
        input.value = item.threshold !== undefined ? item.threshold : 0; input.style.width = '40px'; input.placeholder = '%'; input.title = '何%以下で発動するか (0=死亡時)';
        input.onchange = (e) => { item.threshold = parseInt(e.target.value) || 0; };

        const percentLabel = document.createElement('span'); percentLabel.textContent = '%以下:'; percentLabel.style.fontSize = '0.8em';
        
        const selectDiv = document.createElement('div'); selectDiv.className = 'smart-select-mini'; selectDiv.style.flex = '1';
        createLinkedSelects(selectDiv, `temp-battle-evt-${index}`, item.nodeId);
        selectDiv.addEventListener('change', () => { 
            const nodeSelect = document.getElementById(`temp-battle-evt-${index}`); 
            if (nodeSelect) { 
                // ★修正: pushHistory削除
                item.nodeId = nodeSelect.value; 
                syncDataFromForm(); // ★修正: 引数削除
            } 
        });

        const delBtn = document.createElement('button'); 
        delBtn.textContent = '×'; 
        delBtn.className = 'danger-button del-battle-event-btn'; 
        
        delBtn.type = 'button'; 
        delBtn.style.padding='2px 6px';

        delBtn.onclick = () => {
            // ★修正: pushHistory削除
            list.splice(index, 1); 
            renderBattleEventList(list); 
            syncDataFromForm(); // ★修正: 引数削除
        };

        row.append(label, input, percentLabel, selectDiv, delBtn); 
        container.appendChild(row);
    });
}
// --- ▼ ここから書き換え ▼ ---
function updateFormFromData(data) {
    // 安全に値をセットするヘルパー関数
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
    };
    const setCheck = (id, checked) => {
        const el = document.getElementById(id);
        if (el) el.checked = checked;
    };

    // 1. 種別(Role)の反映
    const role = data.roleType || 'obstacle';
    setVal('obj-role-type', role);

    const gridW = (data.w || 32) / 32;
    const gridH = (data.h || 32) / 32;
    setVal('obj-size-w', Math.max(1, Math.round(gridW)));
    setVal('obj-size-h', Math.max(1, Math.round(gridH)));

    // エネミー情報の反映
    if (typeof updateEnemySelectOptions === 'function') updateEnemySelectOptions();
    setVal('obj-enemy-id', data.enemyId || '');
    
    // 2. アイテム情報の反映
    if (typeof updateItemSelectOptions === 'function') updateItemSelectOptions(data.itemId);
    setVal('obj-item-id', data.itemId || '');
    setVal('obj-item-amount', data.itemAmount || 1);
    setVal('obj-item-pickup', data.itemPickup || 'touch');

    // 3. 見た目・描画設定
    setVal('obj-visual-type', data.visualType || 'color');
    setVal('obj-render-type', data.renderType || 'billboard');
    setVal('obj-elevation', (data.z !== undefined) ? data.z : 0);
    setVal('obj-color', data.color || '#888888');
    
    const opVal = Math.round((data.opacity !== undefined ? data.opacity : 1.0) * 100);
    setVal('obj-opacity', opVal);
    setVal('obj-img-opacity', opVal);
    
    // 4. 画像アセット選択
    const charSelect = document.getElementById('obj-char-select'); 
    if (charSelect) {
        populateAssetSelect(charSelect, 'characters', 'なし'); 
        charSelect.value = data.charId || '';
    }
    
    const setupSubImg = (id, val) => {
        const el = document.getElementById(id);
        if (el) {
            populateAssetSelect(el, 'characters', '(基本画像と同じ)');
            el.value = val || '';
        }
    };
    setupSubImg('obj-char-move', data.charIdMove);
    setupSubImg('obj-char-attack', data.charIdAttack);
    setupSubImg('obj-char-damage', data.charIdDamage);
    
    // 5. 出現条件
    const cond = data.condition || { variable: '', operator: '==', value: '' };
    setVal('obj-cond-var', cond.variable || ''); 
    setVal('obj-cond-op', cond.operator || '=='); 
    setVal('obj-cond-val', cond.value || '');
    
    // 6. 自律移動
    setVal('obj-move-type', data.moveType || 'fixed');
    setVal('obj-spd', (data.spd !== undefined) ? data.spd : 2);
    setVal('obj-move-range', data.moveRange || 3);
    setVal('obj-move-chase-id', data.moveChaseId || '');
    setVal('obj-detection-range', (data.detectionRange !== undefined) ? data.detectionRange : 0);
    setVal('obj-territory-range', (data.territoryRange !== undefined) ? data.territoryRange : 0);
    
    // 7. 通常イベント
    setCheck('obj-has-event', !!data.hasEvent); 
    setVal('obj-event-trigger', data.eventTrigger || 'touch');
    setVal('obj-event-repeat', data.eventRepeat || 'once');
    if (typeof renderEventList === 'function') renderEventList(data.eventList || [{ nodeId: '' }]);
    
    // 8. バトルイベント (HPトリガー)
    setCheck('obj-has-battle-event', !!data.hasBattleEvent);
    if (typeof renderBattleEventList === 'function') renderBattleEventList(data.battleEvents || []);

    // 9. 出現点設定
    setCheck('obj-is-spawn', !!data.isSpawn); 
    setVal('obj-spawn-id', data.spawnId || '');
    setCheck('obj-keep-destroyed', !!data.keepDestroyed);
    
    // 10. バトルステータス
    setVal('obj-battle-hp', (data.hp !== undefined) ? data.hp : '10');
    setVal('obj-battle-dmg', (data.damage !== undefined) ? data.damage : '1');
    setVal('obj-battle-exp', (data.exp !== undefined) ? data.exp : 10);
    setCheck('obj-is-destructible', data.destructible !== false);
    setCheck('obj-show-hp', !!data.showHpBar);
    
    if (typeof updateItemSelectOptions === 'function') updateItemSelectOptions(data.dropItemId, 'obj-drop-item-id'); 
    setVal('obj-drop-item-id', data.dropItemId || '');
    setVal('obj-drop-rate', (data.dropRate !== undefined) ? data.dropRate : 100);
    
    setVal('obj-battle-def', (data.defense !== undefined) ? data.defense : 0);
    setVal('obj-battle-pen', (data.penetration !== undefined) ? data.penetration : 1);
    setVal('obj-blast-radius', (data.blastRadius !== undefined) ? data.blastRadius : 0);
    setVal('obj-blast-rate', (data.blastDamageRate !== undefined) ? data.blastDamageRate : 50);
    
    setVal('obj-atk-range', (data.attackRange !== undefined) ? data.attackRange : 32);
    setVal('obj-atk-cooldown', (data.attackCooldown !== undefined) ? data.attackCooldown : 60);
    setVal('obj-atk-speed', (data.projectileSpeed !== undefined) ? data.projectileSpeed : 0);

    // パネルの表示/非表示を役割に合わせて更新
    if (typeof updateUIVisibilityByRole === 'function') updateUIVisibilityByRole(role);
}
// --- ▲ ここまで書き換え ▲ ---

/**
 * フォームの値をオブジェクトデータに同期する（堅牢化バージョン）
 * - DOM要素の欠損チェック
 * - 数値のNaN対策
 * - 最小値/最大値の制限 (マイナス値防止など)
 * - 矛盾データの自動排除
 */
function syncDataFromForm() {
    // 1. 安全確認: マップが開かれていないなら何もしない
    if (!currentMapId) return;
    
    const projectData = state.getProjectData();
    // マップデータが存在しない場合もガード
    if (!projectData.maps || !projectData.maps[currentMapId]) return;

    // 選択中のオブジェクトがあればそれを、なければペン設定(新規配置用)を更新
    const targets = (selectedObjects.length > 0) ? selectedObjects : [penSettings];
    const currentMap = projectData.maps[currentMapId];
    const isSideView = (currentMap.type === 'side');

    // --- ヘルパー関数: 安全に値を取得する ---
    
    // 文字列用
    const safeGetStr = (id, defaultVal = '') => {
        const el = document.getElementById(id);
        return el ? el.value : defaultVal;
    };
    
    // 数値用 (範囲制限機能付き)
    // min/max が null の場合は制限なし
    const safeGetNum = (id, defaultVal = 0, isFloat = false, min = null, max = null) => {
        const el = document.getElementById(id);
        if (!el) return defaultVal;
        
        let val = isFloat ? parseFloat(el.value) : parseInt(el.value);
        if (isNaN(val)) return defaultVal;
        
        // 範囲制限ロジック
        if (min !== null && val < min) { 
            val = min; 
            el.value = min; // 入力欄も補正
        }
        if (max !== null && val > max) { 
            val = max; 
            el.value = max; // 入力欄も補正
        }
        
        return val;
    };

    // チェックボックス用
    const safeGetBool = (id, defaultVal = false) => {
        const el = document.getElementById(id);
        return el ? el.checked : defaultVal;
    };

    // 2. 共通設定の取得
    // 役割 (Role) は最重要なので、取得できなければ 'obstacle' とする
    const role = safeGetStr('obj-role-type', 'obstacle');
    
    // エネミー以外なら、フォーム上の攻撃力表示も0にしておく（UX向上）
    if (role !== 'enemy') {
        const dmgEl = document.getElementById('obj-battle-dmg');
        if (dmgEl) dmgEl.value = 0;
    }

    // アイテムID (役割がitemの時のみ有効化するため、ここでは生の値を取得)
    const rawItemId = safeGetStr('obj-item-id', '');

    // 3. 全ターゲットに対して適用ループ
    targets.forEach(t => {
        // ★最適化: 役割(Role)が変更された場合、古い不要なデータ（幽霊ステータス）を完全に削除してバグを防ぐ
        if (t.roleType && t.roleType !== role) {
            if (role !== 'enemy') {
                delete t.enemyId;
                delete t.aiPattern;
                delete t.detectionRange;
                delete t.territoryRange;
                delete t.blastRadius;
                delete t.blastDamageRate;
            }
            if (role !== 'item') {
                delete t.itemId;
                delete t.itemAmount;
                delete t.itemPickup;
            }
            if (role === 'deco') {
                // 装飾なら当たり判定やHPなどを一切持たせない
                t.isWall = false;
                delete t.hp;
                delete t.damage;
                delete t.defense;
                delete t.penetration;
                delete t.exp;
                delete t.dropItemId;
                delete t.dropRate;
                delete t.attackRange;
                delete t.attackCooldown;
                delete t.projectileSpeed;
            }
        }

        // --- A. 基本情報 ---
        t.roleType = role;

        // サイズ設定 (マス数 × 32 = ピクセルサイズ)
        // 幅・高さは最小 0.1 マス (小数を許可)
        const sizeW = safeGetNum('obj-size-w', 1, true, 0.1);
        const sizeH = safeGetNum('obj-size-h', 1, true, 0.1);
        
        t.w = sizeW * 32;
        t.h = sizeH * 32;
        
        t.enemyId = safeGetStr('obj-enemy-id', '');

        // エネミーIDがある場合、エディタ上の見た目設定を自動化 (プレビュー用)
        if (role === 'enemy' && t.enemyId) {
            const eData = projectData.enemies[t.enemyId];
            if (eData) {
                if (eData.imageId) {
                    t.visualType = 'image';
                    t.charId = eData.imageId;
                }
                t.canStomp = !!eData.canStomp; 
            }
        }
        
        // 【重要】役割がアイテムでないなら、アイテムIDは「絶対に」空にする
        t.itemId = (role === 'item') ? rawItemId : '';

        // アイテム個数 (最小1)
        t.itemAmount = safeGetNum('obj-item-amount', 1, false, 1);
        t.itemPickup = safeGetStr('obj-item-pickup', 'touch');

        // --- B. 見た目 (Visual) の決定ロジック ---
        if (role === 'item' && t.itemId && projectData.items && projectData.items[t.itemId]) {
            // アイテムの場合: データベース定義を優先
            const itemD = projectData.items[t.itemId];
            if (itemD.iconImage) {
                t.visualType = 'image';
                t.charId = itemD.iconImage;
            } else {
                t.visualType = 'color';
                t.color = '#ffff00'; // 黄色
                t.itemEmoji = itemD.iconEmoji || "📦";
            }
            // アイテムは常に見えるようにする
            t.opacity = 1.0;
        } else {
            // それ以外: フォームの入力値を採用
            t.visualType = safeGetStr('obj-visual-type', 'color');
            t.charId = safeGetStr('obj-char-select', '');
            t.color = safeGetStr('obj-color', '#888888');

            // 透明度の安全計算 (0～100)
            let opPercent = 100;
            if (t.visualType === 'color') {
                opPercent = safeGetNum('obj-opacity', 100, false, 0, 100);
            } else {
                opPercent = safeGetNum('obj-img-opacity', 100, false, 0, 100);
            }
            // 0〜1.0 の範囲に正規化
            t.opacity = opPercent / 100;
        }

        // --- C. 役割ごとの属性プリセット (壁判定など) ---
        switch(role) {
            case 'obstacle':
                t.isWall = true;  t.effectType = 'none';
                break;
            case 'enemy':
                t.isWall = true;  t.effectType = 'none';
                break;
            case 'item':
                t.isWall = false; t.effectType = 'none';
                break;
            case 'deco':
                t.isWall = false; t.effectType = 'none';
                break;
            case 'ladder':
                // サイドビューならハシゴ、それ以外ならただの壁
                t.isWall = !isSideView; 
                t.effectType = isSideView ? 'ladder' : 'none';
                break;
            case 'jump':
                // サイドビューならジャンプ台、それ以外ならただの壁
                t.isWall = !isSideView; 
                t.effectType = isSideView ? 'jump' : 'none';
                break;
            default:
                t.isWall = true; t.effectType = 'none';
                break;
        }

        // --- D. 詳細パラメータ ---
        t.renderType = safeGetStr('obj-render-type', 'billboard');
        t.z = safeGetNum('obj-elevation', 0); // 高さはマイナスもあり得るので制限なし

        // 画像バリエーション
        t.charIdMove = safeGetStr('obj-char-move', '');
        t.charIdAttack = safeGetStr('obj-char-attack', '');
        t.charIdDamage = safeGetStr('obj-char-damage', '');

        // 出現条件
        t.condition = {
            variable: safeGetStr('obj-cond-var', ''),
            operator: safeGetStr('obj-cond-op', '=='),
            value: safeGetStr('obj-cond-val', '')
        };

        // 移動AI (速度などはマイナスにしない)
        t.moveType = safeGetStr('obj-move-type', 'fixed');
        t.spd = safeGetNum('obj-spd', 2, true, 0); 

        

        t.moveRange = safeGetNum('obj-move-range', 3, true, 0);
        t.moveChaseId = safeGetStr('obj-move-chase-id', '');
        
        // 索敵・活動限界 (0以上)
        t.detectionRange = safeGetNum('obj-detection-range', 0, false, 0);
        t.territoryRange = safeGetNum('obj-territory-range', 0, false, 0);

        // イベント関連
        t.hasEvent = safeGetBool('obj-has-event', false);
        t.eventTrigger = safeGetStr('obj-event-trigger', 'touch');
        t.eventRepeat = safeGetStr('obj-event-repeat', 'once');
        t.hasBattleEvent = safeGetBool('obj-has-battle-event', false);

        // スポーン・永続化設定
        t.isSpawn = safeGetBool('obj-is-spawn', false);
        t.spawnId = safeGetStr('obj-spawn-id', '');
        
        const keepEl = document.getElementById('obj-keep-destroyed');
        t.keepDestroyed = keepEl ? keepEl.checked : false;

        // バトルステータス (HP/Dmgは変数入力の可能性があるため文字列で取得)
        t.hp = safeGetStr('obj-battle-hp', '10');
        t.damage = safeGetStr('obj-battle-dmg', '1');
        
        // 経験値、防御、貫通は数値として厳格化
        t.exp = safeGetStr('obj-battle-exp', '10');       // 変更
        t.defense = safeGetStr('obj-battle-def', '0');    // 変更
        t.penetration = safeGetStr('obj-battle-pen', '1'); // 変更

        t.destructible = safeGetBool('obj-is-destructible', true);
        t.showHpBar = safeGetBool('obj-show-hp', false);

        // ドロップアイテム (確率は0-100)
        t.dropItemId = safeGetStr('obj-drop-item-id', '');
        t.dropRate = safeGetStr('obj-drop-rate', '100');

                // 役割が「アイテム」かつ「ID有効」なら、アイテム管理の設定値(placement)を優先適用
        if (role === 'item' && t.itemId && projectData.items[t.itemId]) {
            const itemDef = projectData.items[t.itemId];
            const pConf = itemDef.placement || { hp: 0, isWall: false };
            
            // アイテムDBの設定を適用 (HP, 壁判定)
 t.hp = (pConf.hp !== undefined) ? pConf.hp : 0;
            t.isWall = (pConf.isWall !== undefined) ? pConf.isWall : false;
            
            // HPが1以上なら破壊可能(ブロック扱い)
            t.destructible = (t.hp > 0);
            
            // アイテム用固定値 (バー非表示、攻撃力0など)
            t.showHpBar = false;
            t.damage = 0;
            t.exp = 0;
            t.defense = 0;
            t.penetration = 1;
            
            // ブロック(HP>0)なら破壊時に自分自身をドロップ、そうでなければドロップなし
            t.dropItemId = (t.hp > 0) ? t.itemId : ''; 
            t.dropRate = 100;
} else {
            // アイテム以外の分岐
            if (role === 'enemy') {
                // ★修正: エネミーの場合はマスターデータを直接参照するため、マップ上の個別ステータスは全て削除（初期化）する
                delete t.hp;
                delete t.stamina;
                delete t.damage;
                delete t.exp;
                delete t.defense;
                delete t.penetration;
                delete t.blastRadius;
                delete t.blastDamageRate;
                delete t.destructible;
                delete t.showHpBar;
                delete t.dropItemId;
                delete t.dropRate;
                delete t.attackRange;
                delete t.attackCooldown;
                delete t.projectileSpeed;
                
                // ★追加: 個別のバトルイベント設定も削除（マスターのものを強制使用させるため）
                delete t.hasBattleEvent;
                delete t.battleEvents;
            }
            else if (role === 'obstacle') {
                // ★修正: 障害物用の設定を保存
                t.hp = safeGetStr('obj-battle-hp', '0');
                t.damage = safeGetStr('obj-battle-dmg', '0'); 
                t.defense = safeGetStr('obj-battle-def', '0');
                t.blastRadius = safeGetStr('obj-blast-radius', '0');
                t.blastDamageRate = safeGetStr('obj-blast-rate', '50');
                t.destructible = safeGetBool('obj-is-destructible', true);
                t.showHpBar = safeGetBool('obj-show-hp', false);
                t.dropItemId = safeGetStr('obj-drop-item-id', '');
                t.dropRate = safeGetStr('obj-drop-rate', '100');
                
                // 障害物に不要な戦闘パラメータは削除
                delete t.stamina;
                delete t.exp;
                delete t.penetration;
                delete t.attackRange;
                delete t.attackCooldown;
                delete t.projectileSpeed;
            } 
            else {
                // ★装飾、ハシゴなどは戦闘パラメータを持たせない (安全のためリセット)
                t.hp = 0; t.damage = 0; t.exp = 0; t.defense = 0; t.penetration = 1;
                t.blastRadius = 0; t.blastDamageRate = 0; t.destructible = false;
                t.showHpBar = false; t.dropItemId = ''; t.dropRate = 0;
            }
        }
        
        // 攻撃アクションの保存（※上でエネミーは消去したので、残るのは実質的にはなし。将来的なギミック拡張用）
        if (role !== 'enemy' && role !== 'obstacle') {
            t.attackRange = safeGetStr('obj-atk-range', '32');
            t.attackCooldown = safeGetStr('obj-atk-cooldown', '60');
            t.projectileSpeed = safeGetStr('obj-atk-speed', '0');
        }
    }); // <- targets.forEach の閉じカッコ

    // 4. UIの表示状態を更新
    const isItem = (role === 'item');
    const vGroup = document.getElementById('obj-visual-settings-group');
    if (vGroup) vGroup.style.display = isItem ? 'none' : 'block';

    const iGroup = document.getElementById('obj-item-settings');
    if (iGroup) iGroup.style.display = isItem ? 'block' : 'none';

    updateUIVisibilityByRole(role);
    drawMap();
}

function resizeMapCanvas() {
    if (!currentMapId) return;
    const projectData = state.getProjectData();
    const map = projectData.maps[currentMapId];
    const zoom = map.zoom || 1.0;

    // 2Dキャンバスのサイズ変更
    canvas.width = map.width * GRID_SIZE * zoom;
    canvas.height = map.height * GRID_SIZE * zoom;

    // 3Dキャンバスがあればサイズ変更
    const canvas3d = document.getElementById('map-3d-canvas');
    if (canvas3d && map.stageModelId) {
        canvas3d.width = canvas.width;
        canvas3d.height = canvas.height;
        if (window.threeHandler && window.threeHandler.onResize) {
            window.threeHandler.onResize(canvas.width, canvas.height);
        }
    }
}

let mapEditorAnimId = null;

function drawMap() {
    if (!currentMapId) return;
    
    const projectData = state.getProjectData();
    const map = projectData.maps[currentMapId];
    const zoom = map.zoom || 1.0;

    // ★最適化: 古いループをキャンセルして重複実行を防ぐ
    if (mapEditorAnimId) {
        cancelAnimationFrame(mapEditorAnimId);
        mapEditorAnimId = null;
    }
    let hasAnimatedAssets = false; // アニメーションする素材があるかチェック用フラグ

    // 3Dキャンバスの表示制御
    const canvas3d = document.getElementById('map-3d-canvas');
    if (canvas3d) {
        if (map.stageModelId) {
            canvas3d.style.display = 'block';
            threeHandler.showStage(map.stageModelId);
            const pData = state.getProjectData().player || {};
            if (pData.modelId) {
                threeHandler.showPlayer(pData.modelId);
                const centerX = (map.width * GRID_SIZE) / 2;
                const centerY = (map.height * GRID_SIZE) / 2;
                threeHandler.updatePlayerTransform(centerX, centerY, 0, false);
            } else {
                threeHandler.hidePlayer();
            }
            const centerX = (map.width * GRID_SIZE) / 2;
            const centerY = (map.height * GRID_SIZE) / 2;
            threeHandler.syncCamera(centerX, centerY, 'topdown', zoom, 0, 0, false, false, 1.0);
        } else {
            canvas3d.style.display = 'none';
            threeHandler.hideStage();
        }
    }

    // 2Dキャンバスのリセットとクリア
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 外側背景 (Sky/Outer) のエディタ上でのプレビュー描画
    if (!map.stageModelId && map.bgOutsideId && projectData.assets.backgrounds[map.bgOutsideId]) {
        const assetOut = projectData.assets.backgrounds[map.bgOutsideId];
        if (!assetOut.data.startsWith('data:video')) {
            let imgOut = imageCache[map.bgOutsideId];
            // ★修正: キャッシュの更新
            if (!imgOut || imgOut.dataset_src !== assetOut.data) {
                imgOut = new Image();
                imgOut.dataset_src = assetOut.data;
                imgOut.src = assetOut.data;
                imageCache[map.bgOutsideId] = imgOut;
            }
            if (imgOut.complete && imgOut.naturalWidth !== 0) {
                ctx.drawImage(imgOut, 0, 0, canvas.width, canvas.height);
            }
        }
    }

    ctx.scale(zoom, zoom);
    
    // 背景描画
    if (!map.stageModelId) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, map.width * GRID_SIZE, map.height * GRID_SIZE);
        
        if (map.bgImageId && projectData.assets.backgrounds[map.bgImageId]) {
            const asset = projectData.assets.backgrounds[map.bgImageId];
            if (asset.data.startsWith('data:video')) {
                ctx.fillStyle = '#333';
                ctx.fillRect(0, 0, map.width * GRID_SIZE, map.height * GRID_SIZE);
                ctx.fillStyle = '#fff';
                ctx.font = '24px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText("🎬 動画背景", map.width * GRID_SIZE / 2, map.height * GRID_SIZE / 2);
            } else {
                let img = imageCache[map.bgImageId];
                // ★修正: キャッシュの更新
                if (!img || img.dataset_src !== asset.data) {
                    img = new Image();
                    img.dataset_src = asset.data;
                    img.src = asset.data;
                    imageCache[map.bgImageId] = img;
                }
                
                if (img.complete && img.naturalWidth !== 0) {
                    const cols = asset.cols || 1;
                    const rows = asset.rows || 1;
                    const fps = asset.fps || 12;
                    let srcX = 0, srcY = 0, srcW = img.width, srcH = img.height;
                    
                    if (cols > 1 || rows > 1) {
                        hasAnimatedAssets = true; // ★追加: アニメーション背景あり
                        const frame = Math.floor(performance.now() / (1000 / fps)) % (cols * rows);
                        srcW /= cols;
                        srcH /= rows;
                        srcX = (frame % cols) * srcW;
                        srcY = Math.floor(frame / cols) * srcH;
                    }
                    
                    if (map.type === 'shooter') {
                        const destW = map.width * GRID_SIZE;
                        const scale = destW / srcW;
                        const destH = srcH * scale;
                        let currentDrawY = 0;
                        while (currentDrawY < map.height * GRID_SIZE) {
                            ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, currentDrawY, destW, destH);
                            currentDrawY += destH;
                        }
                    } else {
                        ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, map.width * GRID_SIZE, map.height * GRID_SIZE);
                    }
                }
            }
        }
    }
    
    // グリッド線の描画
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= map.width; x++) {
        ctx.beginPath();
        ctx.moveTo(x * GRID_SIZE, 0);
        ctx.lineTo(x * GRID_SIZE, map.height * GRID_SIZE);
        ctx.stroke();
    }
    for (let y = 0; y <= map.height; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * GRID_SIZE);
        ctx.lineTo(map.width * GRID_SIZE, y * GRID_SIZE);
        ctx.stroke();
    }
    
    // 範囲選択ボックスの描画
    if (isBoxSelecting) {
        ctx.fillStyle = 'rgba(0, 100, 255, 0.2)';
        ctx.strokeStyle = 'rgba(0, 100, 255, 0.8)';
        const selW = (Math.abs(boxEnd.x - boxStart.x) + 1) * GRID_SIZE;
        const selH = (Math.abs(boxEnd.y - boxStart.y) + 1) * GRID_SIZE;
        const selX = Math.min(boxStart.x, boxEnd.x) * GRID_SIZE;
        const selY = Math.min(boxStart.y, boxEnd.y) * GRID_SIZE;
        
        ctx.fillRect(selX, selY, selW, selH);
        ctx.strokeRect(selX, selY, selW, selH);
    }

      if (map.type === 'panorama' || map.type === 'dungeon' || map.type === 'mode7') {
        const pData = state.getProjectData().player || {};
        // エディタ上ではプレイヤーの現在位置、なければマップ中央を仮定
        let px = (map.width * GRID_SIZE) / 2;
        let py = (map.height * GRID_SIZE) / 2;
        
        // 出現位置があればそこを基準にする
        const spawnObj = map.objects.find(o => o.isSpawn);
        if (spawnObj) {
            px = spawnObj.x * GRID_SIZE + GRID_SIZE/2;
            py = spawnObj.y * GRID_SIZE + GRID_SIZE/2;
        }

        // 矢印の描画
        const arrowLen = 40;
        // デフォルト向き (下=90度)
        const dir = Math.PI * 0.5; 

        ctx.save();
        ctx.translate(px, py);
        
        // 視界の扇形（FOV）を描く
        ctx.fillStyle = 'rgba(255, 255, 0, 0.2)';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 100, dir - Math.PI/4, dir + Math.PI/4);
        ctx.lineTo(0, 0);
        ctx.fill();

        // 中心点
        ctx.fillStyle = '#f0f';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI*2);
        ctx.fill();
        
        // テキスト
        ctx.fillStyle = '#fff';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText("CAMERA", 0, -10);
        
        ctx.restore();
    }

    // オブジェクトの描画 (Y座標順 -> Z座標順)
    const sortedObjects = [...map.objects].sort((a, b) => (a.y !== b.y) ? a.y - b.y : (a.z || 0) - (b.z || 0));

    sortedObjects.forEach(obj => {
        const gx = obj.x * GRID_SIZE;
        const gy = obj.y * GRID_SIZE;
        const drawY = gy - (obj.z || 0);

        const objW = obj.w || GRID_SIZE;
        const objH = obj.h || GRID_SIZE;

        ctx.save();
        ctx.globalAlpha = obj.opacity !== undefined ? obj.opacity : 1.0;
        
        // 影の描画
        if (obj.z !== 0 && obj.z !== undefined) {
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(gx + objW/2, drawY + objH);
            ctx.lineTo(gx + objW/2, gy + objH);
            ctx.stroke();
            
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath();
            ctx.ellipse(gx + objW/2, gy + objH, objW/2.5, objH/5, 0, 0, Math.PI*2);
            ctx.fill();
        }

        // --- ★ここから修正: 描画ロジックの優先順位を明確化 ---
        
        // 1. 画像を持っているか確認
        let drawImageId = obj.charId;
        // アイテムの場合、アイテム定義の画像IDを優先
        if (obj.roleType === 'item' && obj.itemId && projectData.items[obj.itemId]) {
            const iData = projectData.items[obj.itemId];
            if (iData.iconImage) drawImageId = iData.iconImage;
        }

        // 2. 画像描画を試みる
        let drawn = false;
        if (drawImageId && projectData.assets.characters[drawImageId]) {
            const asset = projectData.assets.characters[drawImageId];
            let img = imageCache[drawImageId];
            // ★修正: アセットのデータが更新されていたらキャッシュを作り直す
            if (!img || img.dataset_src !== asset.data) {
                img = new Image();
                img.dataset_src = asset.data; // 元のURLを記録
                img.src = asset.data;
                imageCache[drawImageId] = img;
            }
            if (img.complete && img.naturalWidth !== 0) {
                const cols = asset.cols || 1;
                const rows = asset.rows || 1;
                
                if (cols > 1 || rows > 1) hasAnimatedAssets = true; // ★追加: アニメーションキャラあり
                
                const srcW = img.width / cols;
                const srcH = img.height / rows;
                const frame = Math.floor(performance.now() / (1000 / (asset.fps || 12))) % (cols * rows);
                
                ctx.drawImage(img, (frame % cols) * srcW, Math.floor(frame / cols) * srcH, srcW, srcH, gx, drawY, objW, objH);
                drawn = true;
            }
        } 
        
        // 3. 画像が描画されなかった場合、アイテムかどうか確認
        if (!drawn) {
            // アイテムなら絵文字を表示
            if (obj.roleType === 'item' || (obj.itemId && projectData.items[obj.itemId])) {
                let emoji = obj.itemEmoji || "📦";
                if (obj.itemId && projectData.items[obj.itemId]) {
                    emoji = projectData.items[obj.itemId].iconEmoji || emoji;
                }
                
                // 背景の黄色い四角を描く（視認性向上のため）
                ctx.fillStyle = obj.color || '#ffff00';
                ctx.fillRect(gx, drawY, objW, objH);
                
                // 絵文字を描く
                ctx.font = `${Math.min(objW, objH) * 0.7}px serif`; // 少し小さくして枠内に収める
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillStyle = "#000"; // 文字色は黒で固定
                ctx.shadowColor = 'rgba(255,255,255,0.8)'; // 白縁取り
                ctx.shadowBlur = 4;
                ctx.fillText(emoji, gx + objW/2, drawY + objH/2);
                ctx.shadowBlur = 0;
            } 
            // アイテム以外で、画像がない場合（単色矩形）
            else {
                ctx.fillStyle = obj.color || '#888888';
                ctx.fillRect(gx, drawY, objW, objH);
                
                // 画像設定なのにIDがない場合のエラー表示
                if (obj.visualType === 'image') {
                    ctx.strokeStyle = 'red';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(gx, drawY, objW, objH);
                    ctx.fillStyle = 'red';
                    ctx.font = '10px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('NO IMG', gx + objW/2, drawY + objH/2);
                }
            }
        }
        
        ctx.restore();
        
        // 選択枠・壁の判定表示
        ctx.strokeStyle = (obj === selectedObject || selectedObjects.includes(obj)) ? 'red' : (obj.isWall ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.2)');
        ctx.lineWidth = 2;
        if (!obj.isWall) ctx.setLineDash([2,2]);
        ctx.strokeRect(gx, drawY, objW, objH);
        ctx.setLineDash([]);
        
        if (obj.roleType === 'ladder') {
            ctx.fillStyle='#fff';
            ctx.fillText('H', gx + objW/2 - 4, drawY + objH/2);
        }
        if (obj.roleType === 'jump') {
            ctx.fillStyle='#f0f';
            ctx.fillText('J', gx + objW/2 - 4, drawY + objH/2);
        }
    });
    
if (hasAnimatedAssets) {
        mapEditorAnimId = requestAnimationFrame(drawMap);
    }
}

function getGridPos(e) { 
    const rect = canvas.getBoundingClientRect(); 
    const zoom = currentMapId ? (state.getProjectData().maps[currentMapId].zoom || 1.0) : 1.0;
    
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }

    return { 
        x: Math.floor((clientX - rect.left) / (GRID_SIZE * zoom)), 
        y: Math.floor((clientY - rect.top) / (GRID_SIZE * zoom)) 
    }; 
}

function handleCanvasDown(e) {
    if (!currentMapId) return; 
    const { x, y } = getGridPos(e); 
    const map = state.getProjectData().maps[currentMapId];
    if (x < 0 || x >= map.width || y < 0 || y >= map.height) return;
    
    isDrawing = true;
    
    if (currentTool === 'pointer') {
        isBoxSelecting = true;
        boxStart = { x, y };
        boxEnd = { x, y };
        
        selectedObjects = [];
        selectedObject = null;
        
        updateFormFromData(penSettings);
        
        drawMap();
    } else if (currentTool === 'pen') {
        syncDataFromForm(true); 
        pushHistory();
        
        // 完全に同一の要素(座標と高さ、Role)がある場合のみ重複とみなし、重ね置きを許可する
        const isExactDuplicate = map.objects.some(o => 
            o.x === x && o.y === y && o.z === penSettings.z && o.roleType === penSettings.roleType
        );
        
        if (!isExactDuplicate) {
            const newObj = JSON.parse(JSON.stringify(penSettings)); 
            newObj.id = `obj_${Date.now()}_${Math.random()}`; 
            newObj.x = x; 
            newObj.y = y;
            
            map.objects.push(newObj); 
            drawMap();
        }
    } else if (currentTool === 'erase') {

        pushHistory();
        const idx = map.objects.findIndex(o => o.x === x && o.y === y); if (idx !== -1) { 
            map.objects.splice(idx, 1); 
            if (selectedObjects.includes(map.objects[idx])) {
                selectedObjects = selectedObjects.filter(o => o !== map.objects[idx]);
            }
            drawMap(); 
        }
    }
}


function handleCanvasMove(e) {
    if (!isDrawing || !currentMapId) return; 
    const { x, y } = getGridPos(e); 
    const map = state.getProjectData().maps[currentMapId];
    
    if (currentTool === 'pointer' && isBoxSelecting) {
        boxEnd = { x, y };
        drawMap();
    } 
    else if (currentTool === 'pen') {
        if (x < 0 || x >= map.width || y < 0 || y >= map.height) return;
        const isDuplicate = map.objects.some(o => o.x === x && o.y === y && o.z === penSettings.z && o.roleType === penSettings.roleType);
        if (!isDuplicate) { 
            const newObj = JSON.parse(JSON.stringify(penSettings)); 
            newObj.id = `obj_${Date.now()}_${Math.random()}`; 
            newObj.x = x; newObj.y = y; 
            map.objects.push(newObj); 
            drawMap(); 
        }
    } else if (currentTool === 'erase') {
        if (x < 0 || x >= map.width || y < 0 || y >= map.height) return;
        const idx = map.objects.findIndex(o => o.x === x && o.y === y); if (idx !== -1) { map.objects.splice(idx, 1); drawMap(); }
    }
}

function handleCanvasUp() { 
    if (isBoxSelecting && currentMapId) {
        const map = state.getProjectData().maps[currentMapId];
        const minX = Math.min(boxStart.x, boxEnd.x);
        const maxX = Math.max(boxStart.x, boxEnd.x);
        const minY = Math.min(boxStart.y, boxEnd.y);
        const maxY = Math.max(boxStart.y, boxEnd.y);
        
        selectedObjects = map.objects.filter(o => {
            return o.x >= minX && o.x <= maxX && o.y >= minY && o.y <= maxY;
        });

        if (selectedObjects.length > 0) {
            selectedObject = selectedObjects[0];
            updateFormFromData(selectedObject);
        } else {
            selectedObject = null;
            updateFormFromData(penSettings);
        }
        drawMap();
    }
    
    isDrawing = false; 
    isBoxSelecting = false;
}


function updateUIVisibilityByRole(role) {
    // 各設定パネルの要素を取得
    const battlePanel = document.getElementById('obj-battle-settings'); 
    const itemPanel = document.getElementById('obj-item-settings');     
    const specSettings = document.getElementById('obj-3d-specific-settings'); 
    const enemyGroup = document.getElementById('obj-enemy-preset-group');
    const moveGroup = document.getElementById('obj-move-type')?.closest('.form-group');
    const detectRow = document.getElementById('obj-detection-range')?.closest('.form-group-row');
    const eventCheck = document.getElementById('obj-has-event')?.closest('.form-group');
    const spawnCheck = document.getElementById('obj-is-spawn')?.closest('.form-group');

    const projectData = state.getProjectData();
    if (!currentMapId || !projectData.maps[currentMapId]) return;
    const map = projectData.maps[currentMapId]; 

    // 1. 装飾 (deco) / ハシゴ / ジャンプ台 の場合: 戦闘・移動・イベント・スポーン設定を全非表示
    const isSimpleObject = ['deco', 'ladder', 'jump'].includes(role);
    if (moveGroup) moveGroup.style.display = isSimpleObject ? 'none' : 'block';
    if (detectRow) detectRow.style.display = isSimpleObject ? 'none' : 'flex';
    if (eventCheck) eventCheck.style.display = isSimpleObject ? 'none' : 'block';
    if (spawnCheck) spawnCheck.style.display = (role === 'deco') ? 'none' : 'block';

    // 2. エネミー (enemy): プリセット選択のみ表示、障害物用の耐久設定は非表示
    if (enemyGroup) enemyGroup.style.display = (role === 'enemy') ? 'block' : 'none';
    if (battlePanel) battlePanel.style.display = (role === 'obstacle') ? 'block' : 'none';
    // バトルイベント(HPトリガー)設定 (Enemyのみ)
    const battleEvtCheck = document.getElementById('obj-has-battle-event');
    if (battleEvtCheck) {
        // チェックボックスの親divを取得して表示制御
        const container = battleEvtCheck.closest('.form-group');
        if (container) {
            container.style.display = (role === 'enemy') ? 'block' : 'none';
        }
        
        // 詳細パネルの制御
        const details = document.getElementById('obj-battle-event-details');
        if (details) {
            if (role !== 'enemy') {
                details.style.display = 'none'; // エネミー以外なら強制非表示
            } else {
                // エネミーならチェック状態に合わせて表示
                details.style.display = battleEvtCheck.checked ? 'block' : 'none';
            }
        }
    }

    // --- 2. アイテム取得設定 (Itemのみ) ---
    if (itemPanel) {
        itemPanel.style.display = (role === 'item') ? 'block' : 'none';
    }
    
    // --- 3. 3D/高さ設定 ---
    const rolesNeedingHeight = ['obstacle', 'enemy', 'deco'];
    const is3DMap = ['quarter', 'dungeon', 'mode7', '3d', 'belt'].includes(map.type) || !!map.stageModelId;

    if (specSettings) {
        if (is3DMap && rolesNeedingHeight.includes(role)) {
            specSettings.style.display = 'block';
        } else {
            specSettings.style.display = 'none';
        }
    }

    // --- 4. 移動設定の詳細 ---
    const moveType = document.getElementById('obj-move-type');
    if (moveType) {
        document.getElementById('obj-move-details').style.display = (moveType.value !== 'fixed') ? 'block' : 'none';
    }
    
    // --- 5. 通常イベント設定 ---
    const hasEvent = document.getElementById('obj-has-event');
    if (hasEvent) {
        document.getElementById('obj-event-details').style.display = hasEvent.checked ? 'block' : 'none';
    }
    
    // --- 6. 出現点設定 ---
    const isSpawn = document.getElementById('obj-is-spawn');
    if (isSpawn) {
        document.getElementById('obj-spawn-details').style.display = isSpawn.checked ? 'block' : 'none';
    }

    // --- 7. 永続化設定 ---
    const keepEl = document.getElementById('obj-keep-destroyed');
    if (keepEl) {
        const container = keepEl.closest('.form-group');
        if (container) {
            // アイテム、敵、障害物なら表示
            const rolesAllowingPersistence = ['item', 'enemy', 'obstacle'];
            container.style.display = rolesAllowingPersistence.includes(role) ? 'block' : 'none';
        }
    }

    // --- 8. 見た目設定エリア (Visual) ---
    const vGroup = document.getElementById('obj-visual-settings-group');
    if (vGroup) {
        // アイテムの場合は専用設定があるため、共通の見た目設定は隠す
        vGroup.style.display = (role === 'item') ? 'none' : 'block';
    }

    // 見た目の詳細切り替え (単色 vs 画像)
    if (role !== 'item') {
        const vType = document.getElementById('obj-visual-type').value;
        const colorGroup = document.getElementById('obj-visual-color-group');
        const imageGroup = document.getElementById('obj-visual-image-group');
        
        if (colorGroup) colorGroup.style.display = (vType === 'color') ? 'block' : 'none';
        if (imageGroup) imageGroup.style.display = (vType === 'image') ? 'block' : 'none';
    }
}

function updateItemSelectOptions(currentVal, elementId = 'obj-item-id') {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.innerHTML = '<option value="">-- なし --</option>';
    const items = state.getProjectData().items || {};
    Object.keys(items).forEach(id => {
        el.add(new Option(items[id].name, id));
    });
    el.value = currentVal || '';
}

function updateObjRoleOptions() {
    const roleSelect = document.getElementById('obj-role-type');
    if (!roleSelect || !currentMapId) return;

    const map = state.getProjectData().maps[currentMapId];
    const isSide = (map.type === 'side');
    const currentVal = roleSelect.value;

    // 一旦中身をクリアして再生成
    roleSelect.innerHTML = '';

    // 共通の選択肢
    roleSelect.add(new Option('🚧 障害物 (壁)', 'obstacle'));
    roleSelect.add(new Option('👹 エネミー (戦闘)', 'enemy'));
    roleSelect.add(new Option('📦 アイテム (取得)', 'item'));
    roleSelect.add(new Option('🍀 装飾 (背景)', 'deco'));

    // サイドビュー限定の選択肢
    if (isSide) {
        roleSelect.add(new Option('🧗 ハシゴ', 'ladder'));
        roleSelect.add(new Option('⏫ ジャンプ台', 'jump'));
    }

    // 元の値が存在すれば復元、なければデフォルトへ
    // (例えばサイドビューからトップダウンに変えた時、ハシゴだったものは障害物に戻す)
    let found = false;
    for (let i = 0; i < roleSelect.options.length; i++) {
        if (roleSelect.options[i].value === currentVal) {
            roleSelect.value = currentVal;
            found = true;
            break;
        }
    }
    if (!found) {
        roleSelect.value = 'obstacle';
        // 値が変わったのでフォーム同期が必要ならここで行うが、
        // 選択し直したタイミングで syncDataFromForm が走るので見た目だけでOK
    }
}

function updateEnemySelectOptions() {
    const el = document.getElementById('obj-enemy-id');
    if (!el) return;
    const currentVal = el.value;
    
    el.innerHTML = '<option value="">(カスタム / 個別設定)</option>';
    
    const enemies = state.getProjectData().enemies || {};
    Object.keys(enemies).forEach(id => {
        el.add(new Option(enemies[id].name, id));
    });
    
    el.value = currentVal;
    
    el.onchange = () => {
        // ★追加: 選択されたエネミーIDからサイズを取得して反映
        const selectedId = el.value;
        if (selectedId) {
            const projectData = state.getProjectData();
            const enemy = projectData.enemies[selectedId];
            if (enemy) {
                // エネミー管理で設定されたサイズ(px)を取得
                const eW = enemy.w || 32;
                const eH = enemy.h || 32;
                
                // マップエディタの入力欄に反映 (マス数)
                const inputW = document.getElementById('obj-size-w');
                const inputH = document.getElementById('obj-size-h');
                if (inputW) inputW.value = Number(eW / 32).toFixed(2).replace(/\.00$/, '');
                if (inputH) inputH.value = Number(eH / 32).toFixed(2).replace(/\.00$/, '');

                                const eDetect = enemy.detectionRange || 0;
                const eTerri = enemy.territoryRange || 0;

                // マップエディタ側の入力欄にセット
                const inputDetect = document.getElementById('obj-detection-range');
                const inputTerri = document.getElementById('obj-territory-range');
                
                if (inputDetect) inputDetect.value = eDetect;
                if (inputTerri) inputTerri.value = eTerri;
                            const eBlastR = (enemy.blastRadius !== undefined) ? enemy.blastRadius : 0;
                const eBlastRate = (enemy.blastDamageRate !== undefined) ? enemy.blastDamageRate : 50;

                const inputBlastR = document.getElementById('obj-blast-radius');
                const inputBlastRate = document.getElementById('obj-blast-rate');
                
                if (inputBlastR) inputBlastR.value = eBlastR;
                if (inputBlastRate) inputBlastRate.value = eBlastRate;
            }
        }

        syncDataFromForm(); // データを保存して再描画
        
        // IDを変えたらUIの表示状態も更新
        const role = document.getElementById('obj-role-type').value;
        updateUIVisibilityByRole(role);
    };
}