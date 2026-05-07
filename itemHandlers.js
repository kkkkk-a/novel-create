// itemHandlers.js (Fixed Version)

import * as state from './state.js';
import * as ui from './ui.js';

let currentItemId = null;
let currentFilter = 'all';
let currentSearch = '';

export function initItemHandlers() {
    // ボタンイベント
    const createBtn = document.getElementById('create-item-btn');
    if(createBtn) createBtn.addEventListener('click', createItem);
    
    const deleteBtn = document.getElementById('delete-item-btn');
    if(deleteBtn) deleteBtn.addEventListener('click', deleteItem);
    
    // スマホ用「戻る」ボタン
    const backBtn = document.getElementById('item-back-to-list-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => deselectItem());
    }

    // 検索・フィルタ機能
    const searchInput = document.getElementById('item-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearch = e.target.value.toLowerCase();
            renderItemList();
        });
    }

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.dataset.filter;
            renderItemList();
        });
    });

    // 入力同期
    const inputs = [
        'item-name', 'item-icon-emoji', 'item-icon-image', 'item-desc', 'item-type',
        'item-price', 'item-sell-price', // 価格設定
        'item-max-stack',
        'item-effect-hp', 'item-effect-stamina', 'item-effect-ammo', 
        'item-effect-atk', 'item-effect-def','item-effect-spd', 
            'item-effect-pen', 'item-effect-crit-rate',
    'item-effect-range', 'item-effect-cooldown-reduce',
        'item-effect-blast-radius', 'item-effect-blast-rate',
        'item-effect-sound',
        'item-var-name', 'item-var-op', 'item-var-val',
        'item-effect-cooldown', 'item-effect-duration',
        'item-effect-invincible',
        'item-place-hp', 'item-place-wall'
    ];
    
    // ★ここを修正: テキスト入力は 'input' イベントで即時反映させる
     inputs.forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            el.addEventListener('change', syncItemData);
        }
    });

    // リストクリック
    const listContainer = document.getElementById('item-list-container');
    if(listContainer) {
        listContainer.addEventListener('click', (e) => {
            const itemEl = e.target.closest('.item-list-row');
            if (itemEl) {
                selectItem(itemEl.dataset.id);
            }
        });
    }
}

function selectItem(id) {
    currentItemId = id;
    const projectData = state.getProjectData();
    const item = projectData.items[id];
    if (!item) return;

       if (typeof ui.updateVariableSelects === 'function') {
        ui.updateVariableSelects();
    }

    const wrapper = document.getElementById('item-manager-wrapper');
    if(wrapper) wrapper.classList.add('mobile-active-editor');

    document.getElementById('item-editor-form').style.display = 'block';
    document.getElementById('item-editor-placeholder').style.display = 'none';

    // 基本データ反映
    document.getElementById('item-id').value = id;
    document.getElementById('item-name').value = item.name;
    document.getElementById('item-icon-emoji').value = item.iconEmoji || '';
    document.getElementById('item-desc').value = item.description || '';
    document.getElementById('item-type').value = item.type || 'consumable';
    
    // 価格反映
    document.getElementById('item-price').value = (item.price !== undefined) ? item.price : 100;
    document.getElementById('item-sell-price').value = (item.sellPrice !== undefined) ? item.sellPrice : 50;

    document.getElementById('item-max-stack').value = (item.maxStack !== undefined) ? item.maxStack : 99;
    
    const imgSelect = document.getElementById('item-icon-image');
    ui.populateAssetSelect(imgSelect, 'characters', 'なし (絵文字)');
    imgSelect.value = item.iconImage || '';

    const sndSelect = document.getElementById('item-effect-sound');
    ui.populateAssetSelect(sndSelect, 'sounds', 'なし');
    sndSelect.value = item.effects?.sound || '';

    document.getElementById('item-effect-hp').value = item.effects?.hp || 0;
        document.getElementById('item-effect-hp-max').value = item.effects?.hpMax || 0;
    document.getElementById('item-effect-stamina-max').value = item.effects?.staminaMax || 0;
    document.getElementById('item-effect-stamina').value = item.effects?.stamina || 0;
    document.getElementById('item-effect-ammo').value = item.effects?.ammo || 0;
    document.getElementById('item-effect-atk').value = item.effects?.atk || 0;
    document.getElementById('item-effect-def').value = item.effects?.def || 0;
    document.getElementById('item-effect-spd').value = item.effects?.spd || 0;
    document.getElementById('item-effect-proj-speed').value = item.effects?.projSpeed || 0;
    document.getElementById('item-effect-pen').value = item.effects?.penetration || 0;
    document.getElementById('item-effect-crit-rate').value = item.effects?.critRate || 0;
    document.getElementById('item-effect-range').value = item.effects?.range || 0;
    document.getElementById('item-effect-cooldown-reduce').value = item.effects?.cooldownReduce || 0;
     document.getElementById('item-effect-blast-radius').value = item.effects?.blastRadius || 0;
    document.getElementById('item-effect-blast-rate').value = (item.effects?.blastDamageRate !== undefined) ? item.effects.blastDamageRate : 100;

    // 変数操作の復元
    const varStr = item.effects?.variable || '';
    let vName = '', vOp = '=', vVal = '';
    
    if (varStr) {
        if (varStr.includes('+=')) { vOp = '+='; const p = varStr.split('+='); vName=p[0]; vVal=p[1]; }
        else if (varStr.includes('-=')) { vOp = '-='; const p = varStr.split('-='); vName=p[0]; vVal=p[1]; }
        else if (varStr.includes('*=')) { vOp = '*='; const p = varStr.split('*='); vName=p[0]; vVal=p[1]; }
        else if (varStr.includes('/=')) { vOp = '/='; const p = varStr.split('/='); vName=p[0]; vVal=p[1]; }
        else if (varStr.includes('=')) { vOp = '='; const p = varStr.split('='); vName=p[0]; vVal=p[1]; }
    }
    
    document.getElementById('item-var-name').value = vName.trim();
    document.getElementById('item-var-op').value = vOp;
    document.getElementById('item-var-val').value = vVal ? vVal.trim() : '';
    document.getElementById('item-effect-cooldown').value = item.effects?.cooldown || 0;
    document.getElementById('item-effect-duration').value = item.effects?.duration || 0;
    document.getElementById('item-effect-invincible').checked = !!item.effects?.isInvincible;
    
    const placeParams = item.placement || { hp: 0, isWall: false }; 
    
    // HP読み込み (未設定なら0)
    const hpVal = (placeParams.hp !== undefined && placeParams.hp !== null) ? placeParams.hp : 0;
    document.getElementById('item-place-hp').value = hpVal;
    
    // 壁判定読み込み (未設定ならfalse)
    const wallVal = (placeParams.isWall !== undefined) ? placeParams.isWall : false;
    document.getElementById('item-place-wall').checked = wallVal;
}

function deselectItem() {
    currentItemId = null;
    const wrapper = document.getElementById('item-manager-wrapper');
    if(wrapper) wrapper.classList.remove('mobile-active-editor');
    
    document.getElementById('item-editor-form').style.display = 'none';
    document.getElementById('item-editor-placeholder').style.display = 'block';
    
    renderItemList();
}


function createItem() {
    // ★変更: ランダムIDを使用
const id = state.generateId('item');
    const projectData = state.getProjectData();
    if (!projectData.items) projectData.items = {};
    
    projectData.items[id] = {
        name: '新規アイテム',
        iconEmoji: '🎒',
        iconImage: '',
        description: '',
        type: 'consumable',
        price: 100,
        sellPrice: 50,
        maxStack: 99,
        effects: { hp: 0, stamina: 0, ammo: 0, atk: 0, def: 0, variable: '', sound: '' },
        
        // ★追加: ここに初期値を明記しておく
        placement: { hp: 0, isWall: false }
    };
    
    // フィルタをリセット
    currentSearch = '';
    currentFilter = 'all';
    document.getElementById('item-search-input').value = '';
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.filter-btn[data-filter="all"]').classList.add('active');

    renderItemList();
    selectItem(id);

    // ★重要: シナリオエディタ側の選択肢も更新する
    ui.updateAllNodeSelects();
}

function deleteItem() {
    if (!currentItemId) return;
    
    const projectData = state.getProjectData();
    const usage = [];

    // 1. シナリオ(ショップノード)での使用チェック
    if (projectData.scenario && projectData.scenario.sections) {
        for (const secId in projectData.scenario.sections) {
            const sec = projectData.scenario.sections[secId];
            for (const nodeId in sec.nodes) {
                const node = sec.nodes[nodeId];
                if (node.type === 'shop' && node.shopItems && node.shopItems.includes(currentItemId)) {
                    usage.push(`・シナリオ章[${sec.name}] のショップノード`);
                }
            }
        }
    }

    // 2. エネミーのドロップ品チェック
    if (projectData.enemies) {
        for (const enId in projectData.enemies) {
            if (projectData.enemies[enId].dropItemId === currentItemId) {
                usage.push(`・エネミー[${projectData.enemies[enId].name}] のドロップ品`);
            }
        }
    }

    // 3. マップ上の配置チェック (配置アイテム、または敵の個別ドロップ設定)
    if (projectData.maps) {
        for (const mapId in projectData.maps) {
            const map = projectData.maps[mapId];
            if (map.objects) {
                const found = map.objects.some(o => o.itemId === currentItemId || o.dropItemId === currentItemId);
                if (found) {
                    usage.push(`・マップ[${map.name}] 内のオブジェクト`);
                }
            }
        }
    }

    // 4. アクションボタンやプレイヤー初期装備
    if (projectData.settings && projectData.settings.actionButtons) {
        const found = projectData.settings.actionButtons.some(b => b.itemId === currentItemId);
        if (found) usage.push(`・システム設定のアクションボタン`);
    }
    if (projectData.player && projectData.player.equipment === currentItemId) {
        usage.push(`・プレイヤーの初期装備`);
    }

    // 警告メッセージの構築
    let confirmMsg = 'このアイテムを削除しますか？';
    if (usage.length > 0) {
        confirmMsg = `⚠️ 警告: このアイテムは以下の場所で使用されています！\n削除するとリンク切れが発生します。\n\n${usage.slice(0, 5).join('\n')}${usage.length > 5 ? '\n...他' : ''}\n\nそれでも削除しますか？`;
    }

    if (confirm(confirmMsg)) {
        delete projectData.items[currentItemId];
        deselectItem();
        
        // シナリオエディタ(ショップ等)の選択肢リストも更新する
        if (typeof ui.updateAllNodeSelects === 'function') {
            ui.updateAllNodeSelects();
        }
    }
}

export function renderItemList() {
    const container = document.getElementById('item-list-container');
    if(!container) return;
    
    const projectData = state.getProjectData();
    if (!projectData.items) projectData.items = {};
    container.innerHTML = '';
    
    Object.keys(projectData.items).forEach(id => {
        const item = projectData.items[id];
        
        // フィルタリング処理
        if (currentFilter !== 'all' && item.type !== currentFilter) return;
        if (currentSearch && !item.name.toLowerCase().includes(currentSearch)) return;

        const div = document.createElement('div');
        div.className = 'item-list-row';
        div.dataset.id = id;
        
        // --- アイコン表示ロジック (画像 > 絵文字 > 箱) ---
        let iconDisplay = '';
        const assets = state.getProjectData().assets.characters;
        
        if (item.iconImage && assets && assets[item.iconImage]) {
            // 画像がある場合
            iconDisplay = `<img src="${assets[item.iconImage].data}" style="width:30px; height:30px; object-fit:contain; vertical-align:middle;">`;
        } else {
            // 画像がない場合
            iconDisplay = `<span style="font-size:1.5em;">${item.iconEmoji || '📦'}</span>`;
        }
        // -------------------------------------------------

        div.innerHTML = `<div style="width:40px; text-align:center;">${iconDisplay}</div><span style="flex:1; font-weight:bold;">${item.name}</span>`;
        div.style.cssText = 'display:flex; align-items:center; padding:10px; border-bottom:1px solid #eee; cursor:pointer; gap:10px;';
        
        if(id === currentItemId) div.style.backgroundColor = '#e6f7ff';
        container.appendChild(div);
    });
}

function syncItemData() {
    if (!currentItemId) return;
    const projectData = state.getProjectData();
    const item = projectData.items[currentItemId];
    
    item.name = document.getElementById('item-name').value;
    item.iconEmoji = document.getElementById('item-icon-emoji').value;
    item.iconImage = document.getElementById('item-icon-image').value;
    item.description = document.getElementById('item-desc').value;
    item.type = document.getElementById('item-type').value;
    
    item.price = parseInt(document.getElementById('item-price').value) || 0;
    item.sellPrice = parseInt(document.getElementById('item-sell-price').value) || 0;

    let maxStack = parseInt(document.getElementById('item-max-stack').value);
    if (!maxStack || maxStack < 1) maxStack = 1;
    item.maxStack = maxStack;
    
if (!item.effects) item.effects = {};
    // ★修正: 計算式を保存できるよう、数値変換(parseInt)をやめてそのまま取得する
    item.effects.hp = document.getElementById('item-effect-hp').value;
        item.effects.hpMax = document.getElementById('item-effect-hp-max').value;
    item.effects.staminaMax = document.getElementById('item-effect-stamina-max').value;
    item.effects.stamina = document.getElementById('item-effect-stamina').value;
    item.effects.ammo = document.getElementById('item-effect-ammo').value;
    item.effects.atk = document.getElementById('item-effect-atk').value;
    item.effects.def = document.getElementById('item-effect-def').value;
    item.effects.spd = document.getElementById('item-effect-spd').value;
     item.effects.projSpeed = document.getElementById('item-effect-proj-speed').value;
    item.effects.penetration = document.getElementById('item-effect-pen').value;
    item.effects.critRate = document.getElementById('item-effect-crit-rate').value;
    item.effects.range = document.getElementById('item-effect-range').value;
    item.effects.cooldownReduce = document.getElementById('item-effect-cooldown-reduce').value;

    item.effects.blastRadius = document.getElementById('item-effect-blast-radius').value;
    item.effects.blastDamageRate = document.getElementById('item-effect-blast-rate').value;


    item.effects.sound = document.getElementById('item-effect-sound').value;
      item.effects.cooldown = parseFloat(document.getElementById('item-effect-cooldown').value) || 0;
    item.effects.duration = parseFloat(document.getElementById('item-effect-duration').value) || 0;
item.effects.isInvincible = document.getElementById('item-effect-invincible').checked;
    const vName = document.getElementById('item-var-name').value.trim();
    const vOp = document.getElementById('item-var-op').value;
    const vVal = document.getElementById('item-var-val').value.trim();
    
    if (vName && vVal) {
        item.effects.variable = `${vName}${vOp}${vVal}`;
    } else {
        item.effects.variable = '';
    }
    const placeHpVal = document.getElementById('item-place-hp').value;
    const placeWallVal = document.getElementById('item-place-wall').checked;
    
    item.placement = {
        hp: (placeHpVal === '' || placeHpVal === null) ? 0 : parseInt(placeHpVal),
        isWall: placeWallVal
    };
    renderItemList(); 

    // ★重要: アイテム名や価格が変わったのでシナリオ側も更新する
    ui.updateAllNodeSelects();
}
