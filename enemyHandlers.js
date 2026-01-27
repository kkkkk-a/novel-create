

// enemyHandlers.js

import * as state from './state.js';
import * as ui from './ui.js';

let currentEnemyId = null;
let currentSearch = '';




export function initEnemyHandlers() {
    // ボタンイベント
    const createBtn = document.getElementById('create-enemy-btn');
    if (createBtn) createBtn.addEventListener('click', createEnemy);
    
    const deleteBtn = document.getElementById('delete-enemy-btn');
    if (deleteBtn) deleteBtn.addEventListener('click', deleteEnemy);
    
    // スマホ用戻るボタン
    const backBtn = document.getElementById('enemy-back-to-list-btn');
    if (backBtn) {
        backBtn.addEventListener('click', deselectEnemy);
    }

    // 検索機能
    const searchInput = document.getElementById('enemy-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearch = e.target.value.toLowerCase();
            renderEnemyList();
        });
    }

    // リストクリックイベント
    const listContainer = document.getElementById('enemy-list-container');
    if (listContainer) {
        listContainer.addEventListener('click', (e) => {
            const row = e.target.closest('.enemy-list-row');
            if (row) {
                selectEnemy(row.dataset.id);
            }
        });
    }

    // 入力同期の設定 (全ての入力欄に対して)
    const inputs = [
        'enemy-name', 'enemy-opacity', 'enemy-color',
        'enemy-size-w', 'enemy-size-h', 
        'enemy-hp', 'enemy-stamina','enemy-stamina-regen',  'enemy-atk', 'enemy-def', 'enemy-exp', 'enemy-pen',
        'enemy-crit-rate', 'enemy-crit-mult',
        'enemy-drop-item', 'enemy-drop-rate',
        'enemy-move-type', 'enemy-move-spd', 'enemy-ai-pattern',
        'enemy-detect-range', 'enemy-territory-range',
        'enemy-atk-range', 'enemy-atk-cool', 'enemy-atk-speed',
        'enemy-blast-radius', 'enemy-blast-rate',
        'enemy-img-idle', 'enemy-img-move', 'enemy-img-attack', 'enemy-img-damage',
        'enemy-model-id', 'enemy-model-scale', 'enemy-model-y',
        'enemy-hit-particle','enemy-can-stomp'
    ];

    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (el.tagName === 'INPUT' && el.type === 'text') {
                el.addEventListener('input', syncEnemyData);
            } else {
                el.addEventListener('change', syncEnemyData);
            }
        }
    });
}

function createEnemy() {
 const id = state.generateId('enemy');
    const projectData = state.getProjectData();
    if (!projectData.enemies) projectData.enemies = {};

    projectData.enemies[id] = {
        name: '新規エネミー',
        w: 32, h: 32,
        hp: 10, stamina: 100,staminaRegen: 10, atk: 1, def: 0, exp: 10, pen: 1,
                critRate: 5,
        critMult: 1.5,
        dropItemId: '', dropRate: 50,
        moveType: 'fixed', spd: 2,
        canStomp: false, 
        onSightBehavior: 'normal', 
        aiPattern: 'tactical', 
        detectionRange: 0, territoryRange: 0,
        attackRange: 32, attackCooldown: 60, projectileSpeed: 0,
        homingStrength: 0,
        imageId: '', imageIdMove: '', imageIdAttack: '', imageIdDamage: '',
        modelId: '', modelScale: 1.0, modelY: 0,
        opacity: 100, color: '#ffffff'
    };

    renderEnemyList();
    selectEnemy(id);

    // ★追加: エネミーリスト更新を他のUI（シナリオエディタ等）にも即座に反映させる
    if (typeof ui.updateAllNodeSelects === 'function') {
        ui.updateAllNodeSelects();
    }
}

function deleteEnemy() {
    if (!currentEnemyId) return;
    
    const projectData = state.getProjectData();
    const usage = [];
    
    // マップでの使用状況チェック
    if (projectData.maps) {
        for (const mapId in projectData.maps) {
            const map = projectData.maps[mapId];
            if (map.objects) {
                const count = map.objects.filter(o => o.enemyId === currentEnemyId).length;
                if (count > 0) {
                    usage.push(`・マップ[${map.name}] に ${count}体配置済み`);
                }
            }
        }
    }

    // シナリオ（バトルノード）での使用状況チェック
    if (projectData.scenario && projectData.scenario.sections) {
        for (const secId in projectData.scenario.sections) {
            const sec = projectData.scenario.sections[secId];
            for (const nodeId in sec.nodes) {
                const node = sec.nodes[nodeId];
                if (node.type === 'battle' && node.enemyId === currentEnemyId) {
                    usage.push(`・シナリオ章[${sec.name}] のバトルノード`);
                }
            }
        }
    }

    let confirmMsg = 'このエネミー設定を削除しますか？\n(配置済みのエネミーには影響しませんが、新規配置できなくなります)';
    
    if (usage.length > 0) {
        confirmMsg = `⚠️ 警告: このエネミーは以下の場所で使用されています！\n削除すると、設定が解除されたりエラーの原因になる可能性があります。\n\n${usage.slice(0, 10).join('\n')}${usage.length > 10 ? '\n...他' : ''}\n\nそれでも削除しますか？`;
    }

    if (confirm(confirmMsg)) {
        delete projectData.enemies[currentEnemyId];
        deselectEnemy();

        // ★追加: 削除を他のUIにも反映させる
        if (typeof ui.updateAllNodeSelects === 'function') {
            ui.updateAllNodeSelects();
        }
    }
}

function selectEnemy(id) {
    currentEnemyId = id;
    const projectData = state.getProjectData();
    const enemy = projectData.enemies[id];
    if (!enemy) return;

    // スマホ用表示切り替え
    const wrapper = document.getElementById('enemy-manager-wrapper');
    if (wrapper) wrapper.classList.add('mobile-active-editor');

    document.getElementById('enemy-editor-form').style.display = 'block';
    document.getElementById('enemy-editor-placeholder').style.display = 'none';

    // 値の反映
    document.getElementById('enemy-id').value = id;
    document.getElementById('enemy-name').value = enemy.name || '';
    document.getElementById('enemy-size-w').value = Math.max(1, Math.round((enemy.w || 32) / 32));
    document.getElementById('enemy-size-h').value = Math.max(1, Math.round((enemy.h || 32) / 32));
    
    // 画像セレクトボックスの更新と選択
    const setupImg = (eid, val) => {
        const el = document.getElementById(eid);
        ui.populateAssetSelect(el, 'characters', 'なし');
        el.value = val || '';
    };
    setupImg('enemy-img-idle', enemy.imageId);
    setupImg('enemy-img-move', enemy.imageIdMove);
    setupImg('enemy-img-attack', enemy.imageIdAttack);
    setupImg('enemy-img-damage', enemy.imageIdDamage);

    const modelSel = document.getElementById('enemy-model-id');
    ui.populateAssetSelect(modelSel, 'models', 'なし (2D画像を使用)');
    modelSel.value = enemy.modelId || '';
    
    document.getElementById('enemy-model-scale').value = (enemy.modelScale !== undefined) ? enemy.modelScale : 1.0;
    document.getElementById('enemy-model-y').value = enemy.modelY || 0;

    document.getElementById('enemy-opacity').value = enemy.opacity || 100;
    document.getElementById('enemy-color').value = enemy.color || '#ffffff';

    document.getElementById('enemy-hp').value = enemy.hp || 10;
    document.getElementById('enemy-stamina').value = (enemy.stamina !== undefined) ? enemy.stamina : 100;
    document.getElementById('enemy-stamina-regen').value = (enemy.staminaRegen !== undefined) ? enemy.staminaRegen : 10;
    document.getElementById('enemy-atk').value = enemy.atk || 1;
    document.getElementById('enemy-def').value = enemy.def || 0;
    document.getElementById('enemy-spd').value = (enemy.spd !== undefined) ? enemy.spd : 2;
    document.getElementById('enemy-exp').value = enemy.exp || 10;
    document.getElementById('enemy-pen').value = enemy.pen || 1;
    document.getElementById('enemy-crit-rate').value = (enemy.critRate !== undefined) ? enemy.critRate : 5;
    document.getElementById('enemy-crit-mult').value = (enemy.critMult !== undefined) ? enemy.critMult : 1.5;

    // ドロップアイテムリスト更新
    const dropSel = document.getElementById('enemy-drop-item');
    dropSel.innerHTML = '<option value="">なし</option>';
    if (projectData.items) {
        Object.keys(projectData.items).forEach(itemId => {
            const item = projectData.items[itemId];
            dropSel.add(new Option(item.name, itemId));
        });
    }
    dropSel.value = enemy.dropItemId || '';
    document.getElementById('enemy-drop-rate').value = (enemy.dropRate !== undefined) ? enemy.dropRate : 50;
    
    // ★修正: パーティクルリストを更新してから値をセットする
    const hitPtcl = document.getElementById('enemy-hit-particle');
    if (hitPtcl && typeof ui.updateParticleSelects === 'function') {
        ui.updateParticleSelects(); 
        hitPtcl.value = enemy.hitParticleId || ''; 
    }

    document.getElementById('enemy-move-type').value = enemy.moveType || 'fixed';
document.getElementById('enemy-on-sight').value = enemy.onSightBehavior || 'normal';
    document.getElementById('enemy-ai-pattern').value = enemy.aiPattern || 'tactical';
    document.getElementById('enemy-detect-range').value = enemy.detectionRange || 0;
    document.getElementById('enemy-territory-range').value = enemy.territoryRange || 0;

    document.getElementById('enemy-atk-range').value = enemy.attackRange || 32;
    document.getElementById('enemy-atk-cool').value = enemy.attackCooldown || 60;
    document.getElementById('enemy-atk-speed').value = enemy.projectileSpeed || 0;
    document.getElementById('enemy-blast-radius').value = enemy.blastRadius || 0;
    document.getElementById('enemy-blast-rate').value = (enemy.blastDamageRate !== undefined) ? enemy.blastDamageRate : 50;
    document.getElementById('enemy-homing-strength').value = enemy.homingStrength || 0;
    const stompCheck = document.getElementById('enemy-can-stomp');
    if (stompCheck) {
        stompCheck.checked = !!enemy.canStomp;
    }
    renderEnemyList();
}

function deselectEnemy() {
    currentEnemyId = null;
    const wrapper = document.getElementById('enemy-manager-wrapper');
    if (wrapper) wrapper.classList.remove('mobile-active-editor');

    document.getElementById('enemy-editor-form').style.display = 'none';
    document.getElementById('enemy-editor-placeholder').style.display = 'block';
    
    renderEnemyList();
}

function syncEnemyData() {
    if (!currentEnemyId) return;
    const projectData = state.getProjectData();
    const enemy = projectData.enemies[currentEnemyId];

    enemy.name = document.getElementById('enemy-name').value;
    const sw = parseInt(document.getElementById('enemy-size-w').value) || 1;
    const sh = parseInt(document.getElementById('enemy-size-h').value) || 1;
    enemy.w = sw * 32;
    enemy.h = sh * 32;
    enemy.imageId = document.getElementById('enemy-img-idle').value;
    enemy.imageIdMove = document.getElementById('enemy-img-move').value;
    enemy.imageIdAttack = document.getElementById('enemy-img-attack').value;
    enemy.imageIdDamage = document.getElementById('enemy-img-damage').value;
    enemy.modelId = document.getElementById('enemy-model-id').value;
    enemy.modelScale = parseFloat(document.getElementById('enemy-model-scale').value) || 1.0;
    enemy.modelY = parseFloat(document.getElementById('enemy-model-y').value) || 0;
    
    enemy.opacity = parseInt(document.getElementById('enemy-opacity').value) || 100;
    enemy.color = document.getElementById('enemy-color').value;

    enemy.hp = document.getElementById('enemy-hp').value;
     enemy.stamina = document.getElementById('enemy-stamina').value;
     enemy.staminaRegen = document.getElementById('enemy-stamina-regen').value;
    enemy.atk = document.getElementById('enemy-atk').value;
    enemy.def = document.getElementById('enemy-def').value;
    enemy.exp = document.getElementById('enemy-exp').value;
    enemy.pen = document.getElementById('enemy-pen').value;
       enemy.critRate = document.getElementById('enemy-crit-rate').value;
    enemy.critMult = document.getElementById('enemy-crit-mult').value;

    enemy.dropItemId = document.getElementById('enemy-drop-item').value;
    enemy.dropRate = parseInt(document.getElementById('enemy-drop-rate').value) || 0;
    enemy.hitParticleId = document.getElementById('enemy-hit-particle').value;

    enemy.moveType = document.getElementById('enemy-move-type').value;
enemy.spd = parseFloat(document.getElementById('enemy-spd').value) || 0;
enemy.onSightBehavior = document.getElementById('enemy-on-sight').value;
    enemy.aiPattern = document.getElementById('enemy-ai-pattern').value;
    enemy.detectionRange = parseInt(document.getElementById('enemy-detect-range').value) || 0;
    enemy.territoryRange = parseInt(document.getElementById('enemy-territory-range').value) || 0;

    enemy.attackRange = document.getElementById('enemy-atk-range').value;
    enemy.attackCooldown = document.getElementById('enemy-atk-cool').value;
    enemy.projectileSpeed = document.getElementById('enemy-atk-speed').value;
    enemy.blastRadius = document.getElementById('enemy-blast-radius').value;
    enemy.blastDamageRate = document.getElementById('enemy-blast-rate').value;
enemy.homingStrength = document.getElementById('enemy-homing-strength').value; 
    const stompCheck = document.getElementById('enemy-can-stomp');
    if (stompCheck) {
        enemy.canStomp = stompCheck.checked;
    }
    renderEnemyList();

    // ★追加: 名前などが変わった場合に備えて、他の箇所のUIも更新する
    if (typeof ui.updateAllNodeSelects === 'function') {
        ui.updateAllNodeSelects();
    }
}

export function renderEnemyList() {
    const container = document.getElementById('enemy-list-container');
    if (!container) return;
    
    const projectData = state.getProjectData();
    if (!projectData.enemies) projectData.enemies = {};
    container.innerHTML = '';

    Object.keys(projectData.enemies).forEach(id => {
        const enemy = projectData.enemies[id];
        
        // 検索フィルタ
        if (currentSearch && !enemy.name.toLowerCase().includes(currentSearch)) return;

        const div = document.createElement('div');
        div.className = 'enemy-list-row';
        div.dataset.id = id;
        
        let iconDisplay = '👹';
        // 画像があれば表示
        if (enemy.imageId && projectData.assets.characters[enemy.imageId]) {
            const src = projectData.assets.characters[enemy.imageId].data;
            iconDisplay = `<img src="${src}" style="width:30px; height:30px; object-fit:contain; vertical-align:middle;">`;
        }

        div.innerHTML = `<div style="width:40px; text-align:center;">${iconDisplay}</div><span style="flex:1; font-weight:bold;">${enemy.name}</span>`;
        div.style.cssText = 'display:flex; align-items:center; padding:10px; border-bottom:1px solid #eee; cursor:pointer; gap:10px;';
        
        if (id === currentEnemyId) div.style.backgroundColor = '#e6f7ff';
        container.appendChild(div);
    });
}