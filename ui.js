// ui.js (Final Version - All Functions Included)

import * as state from './state.js';
import { generateGameHtml } from './export.js';

// --- DOM Cache ---
const elements = {
    navButtons: document.querySelectorAll('.nav-button'),
    modeContents: document.querySelectorAll('.mode-content'),
    sectionList: document.getElementById('section-list'),
    scenarioTree: document.getElementById('scenario-tree'),
    nodeEditor: document.getElementById('node-editor'),
    nodeIdDisplay: document.getElementById('node-id-display'),
    isStartNodeCheckbox: document.getElementById('is-start-node'),
    nodeTypeSelect: document.getElementById('node-type'),
    allNodeTypeSettings: document.querySelectorAll('.node-type-settings'),
    textNode: {
        charListContainer: document.getElementById('node-char-list-container'),
        addCharBtn: document.getElementById('add-char-btn'),
        charList3DContainer: document.getElementById('node-3d-char-list'),
        addChar3DBtn: document.getElementById('add-3d-char-btn'),
        customName: document.getElementById('node-custom-name'),
        background: document.getElementById('node-background'),
        bgm: document.getElementById('node-bgm'),
        sound: document.getElementById('node-sound'),
        nextContainer: document.getElementById('container-next-text')
    },
    choiceNode: { editor: document.getElementById('choices-editor') },
    variableNode: {
        nextContainer: document.getElementById('container-next-variable')
    },
    conditionalNode: {
        editor: document.getElementById('conditions-editor'),
        elseNextContainer: document.getElementById('container-next-conditional-else')
    },
    uiControlNode: {
        nextContainer: document.getElementById('container-next-ui')
    },
    mapNode: {
        dest: document.getElementById('node-map-dest'),
        spawn: document.getElementById('node-map-spawn')
    },
    mapBgSelect: document.getElementById('map-bg-select'),
    mapObjCharSelect: document.getElementById('obj-char-select'),

    variablesList: document.getElementById('variables-list'),
    editorPlaceholder: document.getElementById('editor-placeholder'),
    previewWindow: document.querySelector('.preview-window'),
    helpBtn: document.getElementById('open-help-btn'),
    helpModal: document.getElementById('help-modal'),
    closeHelpBtn: document.querySelector('.close-modal')
};

// ★最適化: ノード選択UIの改善（章ごとの絞り込み機能の強化）
export function createLinkedSelects(container, selectId, currentValue, options = {}) {
    if (!container) return; 
    container.innerHTML = ''; 
    const projectData = state.getProjectData();
    const sections = projectData.scenario.sections;
    const sectionIds = Object.keys(sections);

    // セクションが1つもない場合
    if (sectionIds.length === 0) {
        container.innerHTML = '<span style="color:#999; font-size:0.8em;">(セクションがありません)</span>';
        return;
    }
    
    // 1. UIを囲むコンテナのスタイリング
    container.style.cssText = 'display: flex; flex-direction: column; gap: 5px;';

    // 2. 章（セクション）選択プルダウン作成
    const sectionSelect = document.createElement('select');
    sectionSelect.className = 'section-filter-select';
    sectionSelect.style.cssText = 'background-color:#f0f8ff; border:1px solid #1890ff; color:#0050b3; font-weight:bold;';

    // 3. ノード選択プルダウン作成
    const nodeSelect = document.createElement('select');
    if (selectId) nodeSelect.id = selectId;
    
    // データセット（メタデータ）の適用
    if (options) {
        Object.keys(options).forEach(key => {
            nodeSelect.dataset[key] = options[key];
        });
    }

    // --- 初期セクション決定ロジック ---
    let targetSectionId = null;

    if (currentValue) {
        for (const secId in sections) {
            if (sections[secId].nodes[currentValue]) {
                targetSectionId = secId;
                break;
            }
        }
    }
    // 未設定時はアクティブな章、それもなければ最初の章
    if (!targetSectionId) {
        targetSectionId = state.getActiveSectionId() || sectionIds[0];
    }

    // セクション選択肢の追加
    sectionIds.forEach(secId => {
        sectionSelect.add(new Option('📁 ' + sections[secId].name, secId));
    });
    sectionSelect.value = targetSectionId;

    // --- ノードリスト更新関数 ---
    const updateNodeOptions = (secId) => {
        nodeSelect.innerHTML = '';
        nodeSelect.add(new Option('--- (なし / 終了) ---', ''));

        const section = sections[secId];
        if (section && section.nodes) {
            Object.keys(section.nodes).forEach(nodeId => {
                const node = section.nodes[nodeId];
                
                // アイコンと要約の生成
                let icon = '📄'; 
                let summary = '';
                
                // HTMLタグを除去してテキストのみ抽出
                const stripHtml = (html) => {
                    const tmp = document.createElement("DIV");
                    tmp.innerHTML = html || '';
                    return tmp.textContent || tmp.innerText || "";
                };

                if(node.type === 'text') {
                    icon = '💬';
                    summary = stripHtml(node.message).replace(/\s+/g, ' ').trim().substring(0, 12);
                } else if(node.type === 'choice') {
                    icon = '🔀'; summary = `選択肢(${node.choices ? node.choices.length : 0})`;
                } else if(node.type === 'variable') icon = '🔢';
                else if(node.type === 'conditional') icon = '❓';
                else if(node.type === 'ui_control') icon = '🖥️';
                else if(node.type === 'shop') icon = '🛒';
                else if(node.type === 'battle') icon = '⚔️';
                else if(node.type === 'map') icon = '🗺️';
                else if(node.type === 'input') icon = '⌨️';

                let labelText = `${nodeId.slice(-4)}: ${icon}`;
                if (node.nodeLabel) labelText += ` 【${node.nodeLabel}】`;
                if (summary) labelText += ` ${summary}...`;

                nodeSelect.add(new Option(labelText, nodeId));
            });
        }
    };

    // 初期状態のリスト生成
    updateNodeOptions(targetSectionId);
    
    // ノード値の復元（リンク切れチェック含む）
    if (currentValue) {
        let exists = false;
        for (let i = 0; i < nodeSelect.options.length; i++) {
            if (nodeSelect.options[i].value === currentValue) {
                exists = true; break;
            }
        }
        if (!exists) {
            const errorOption = new Option(`⚠ リンク切れ: ${currentValue}`, currentValue);
            errorOption.style.color = 'red';
            nodeSelect.add(errorOption);
        }
        nodeSelect.value = currentValue;
    }

    // --- イベントリスナー ---
    sectionSelect.addEventListener('change', () => {
        updateNodeOptions(sectionSelect.value);
        nodeSelect.value = ""; // 章を変えたらノード選択は一旦リセット
        // 変更を親のイベントハンドラに通知
        nodeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    });
    
    // DOMに追加
    container.appendChild(sectionSelect); 
    container.appendChild(nodeSelect);
}

export function populateAssetSelect(selectElement, type, defaultText = "なし") {
    if (!selectElement) return;
    const projectData = state.getProjectData();
    const currentVal = selectElement.value;
    selectElement.innerHTML = '';
    selectElement.add(new Option(defaultText, ''));

    const assets = projectData.assets[type];
    if (assets) {
        for (const id in assets) {
            const asset = assets[id];
            let displayName = asset.name;

            // ★改良: モデルの場合は形式を明記する (例: "Hero.vrm [VRM]")
            if (type === 'models' && asset.format) {
                // ファイル名に拡張子が含まれていない、または形式を強調したい場合
                displayName += ` [${asset.format.toUpperCase()}]`;
            }
            // ★改良: アニメーションの場合 (例: "Walk.vrma [VRMA]")
            else if (type === 'animations' && asset.format) {
                if (asset.format !== 'unknown') {
                    displayName += ` [${asset.format.toUpperCase()}]`;
                }
            }
            // ★改良: 2Dキャラでスプライトシートの場合 (例: "Effect.json [Anim]")
            else if (type === 'characters' && asset.isSpriteSheet) {
                displayName += ` [Anim]`;
            }

            selectElement.add(new Option(displayName, id));
        }
    }

    // 値を復元
    if (currentVal && (!assets || !assets[currentVal])) {
        const errorOption = new Option(`⚠️ 削除済: ${currentVal}`, currentVal);
        errorOption.style.color = 'red';
        selectElement.add(errorOption);
    }

    // 値を復元
    selectElement.value = currentVal;
}

function renderCharacterListEditor(characters) {
    const container = elements.textNode.charListContainer;
    if (!container) return; container.innerHTML = '';
    if (!characters || characters.length === 0) {
        container.innerHTML = '<div style="color:#999; font-size:0.9em; padding:5px;">表示する2Dキャラクターがいません</div>';
        return;
    }
    characters.forEach((charData, index) => {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'margin-bottom:8px; background:#f9f9f9; padding:8px; border-radius:4px; border:1px solid #ddd;';
        const row1 = document.createElement('div'); row1.className = 'form-group-row'; row1.style.marginBottom = '5px';
        const charLabel = document.createElement('label'); charLabel.style.cssText = 'flex:1; display:flex; align-items:center; gap:5px; cursor:pointer;';
        const charSelect = document.createElement('select'); charSelect.style.flex = '1';
        populateAssetSelect(charSelect, 'characters', '(画像選択)');
        charSelect.value = charData.characterId || '';
        charSelect.onchange = (e) => { charData.characterId = e.target.value; };
        charLabel.appendChild(charSelect);
        const delBtn = document.createElement('button'); delBtn.className = 'danger-button'; delBtn.textContent = '削除'; delBtn.style.cssText = 'padding:2px 8px; font-size:0.8em;';
        delBtn.onclick = () => { characters.splice(index, 1); renderCharacterListEditor(characters); };
        row1.appendChild(charLabel); row1.appendChild(delBtn);
        const row2 = document.createElement('div'); row2.style.marginBottom = '5px';
        const posLabel = document.createElement('label'); posLabel.style.width = '100%'; posLabel.style.cursor = 'pointer';
        const posSelect = document.createElement('select'); posSelect.style.width = '100%';
        const positions = {
            'bottom-left': '↙ 左下', 'bottom-center': '⬇ 中央下', 'bottom-right': '↘ 右下',
            'center-left': '⬅ 左中', 'center': '⏺ 中央', 'center-right': '➡ 右中',
            'top-left': '↖ 左上', 'top-center': '⬆ 中央上', 'top-right': '↗ 右上'
        };
        for (const [key, label] of Object.entries(positions)) { posSelect.add(new Option(label, key)); }
        posSelect.value = charData.position || 'bottom-center';
        posSelect.onchange = (e) => { charData.position = e.target.value; };
        posLabel.appendChild(posSelect); row2.appendChild(posLabel);
        const row3 = document.createElement('div');
        row3.style.cssText = 'display:flex; gap:10px; align-items:center; font-size:0.9em; margin-bottom:5px;';

        // ★追加: ループ設定チェックボックス
        const loopLabel = document.createElement('label');
        loopLabel.style.cssText = 'display:flex; align-items:center; gap:2px; cursor:pointer; margin-right:5px;';
        const loopCheck = document.createElement('input');
        loopCheck.type = 'checkbox';
        loopCheck.checked = (charData.loop !== undefined) ? charData.loop : true; // デフォルトはループON
        loopCheck.onchange = (e) => charData.loop = e.target.checked;
        loopLabel.append(loopCheck, document.createTextNode('🔄 Loop'));
        row3.appendChild(loopLabel);

        const createInp = (icon, val, cb, tip) => {
            const lbl = document.createElement('label'); lbl.style.cssText = 'display:flex; align-items:center; gap:2px; cursor:pointer;'; lbl.title = tip;
            const span = document.createElement('span'); span.textContent = icon;
            const inp = document.createElement('input'); inp.type = 'number'; inp.value = val; inp.style.width = '50px'; inp.style.padding = '2px'; inp.onchange = cb;
            lbl.appendChild(span); lbl.appendChild(inp); return lbl;
        };
        row3.appendChild(createInp('🔍', charData.scale !== undefined ? charData.scale : 100, e => charData.scale = parseInt(e.target.value) || 100, "拡大率 (%)"));
        row3.appendChild(createInp('↔', charData.x || 0, e => charData.x = parseInt(e.target.value) || 0, "横位置調整 (px)"));
        row3.appendChild(createInp('↕', charData.y || 0, e => charData.y = parseInt(e.target.value) || 0, "縦位置調整 (px)"));
        const row4 = document.createElement('div'); row4.style.cssText = 'margin-top:5px; border-top:1px dashed #ccc; padding-top:5px;';
        const maskLabel = document.createElement('label'); maskLabel.style.cssText = 'display:flex; align-items:center; gap:5px; cursor:pointer; width:100%;';
        const maskIcon = document.createElement('span'); maskIcon.textContent = '🎭 Mask:'; maskIcon.style.fontSize = '0.8em';
        const maskSelect = document.createElement('select'); maskSelect.style.flex = '1';
        populateAssetSelect(maskSelect, 'characters', '(マスクなし)');
        maskSelect.value = charData.maskId || '';
        maskSelect.onchange = (e) => { charData.maskId = e.target.value; };
        maskLabel.appendChild(maskIcon); maskLabel.appendChild(maskSelect); row4.appendChild(maskLabel);
        wrapper.appendChild(row1); wrapper.appendChild(row2); wrapper.appendChild(row3); wrapper.appendChild(row4);
        container.appendChild(wrapper);
    });
}

// ui.js - render3DCharacterListEditor (完全版)

function render3DCharacterListEditor(characters3d) {
    const container = elements.textNode.charList3DContainer;
    if (!container) return;
    container.innerHTML = '';

    if (!characters3d || characters3d.length === 0) return;

    characters3d.forEach((charData, index) => {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'margin-bottom:10px; background:#fcfcfc; padding:8px; border-radius:4px; border:1px solid #adc6ff;';

        const row1 = document.createElement('div');
        row1.style.cssText = 'display:flex; gap:5px; margin-bottom:5px;';
        const modelSelect = document.createElement('select');
        modelSelect.style.flex = '1';
        populateAssetSelect(modelSelect, 'models', '(3Dモデル選択)');
        modelSelect.value = charData.modelId || '';

        const delBtn = document.createElement('button');
        delBtn.className = 'danger-button';
        delBtn.textContent = '×';
        delBtn.style.padding = '2px 8px';
        
        // ★修正: 削除時の処理
        delBtn.onclick = () => {
            // 1. データ配列から削除
            characters3d.splice(index, 1);
            
            // 2. リストUIを再描画
            render3DCharacterListEditor(characters3d);
            
            // 3. 3Dプレビュー画面上のモデルを非表示にする (hideAllを使用)
            if (window.threeHandler && window.threeHandler.hideAll) {
                window.threeHandler.hideAll();
            }
        };

        row1.appendChild(modelSelect);
        row1.appendChild(delBtn);

        const vrmOptionsContainer = document.createElement('div');
        vrmOptionsContainer.style.display = 'none';

        const rowExpr = document.createElement('div');
        rowExpr.style.cssText = 'display:flex; align-items:center; gap:5px; margin-bottom:5px;';
        const exprLabel = document.createElement('span');
        exprLabel.textContent = '😀 表情:';
        exprLabel.style.cssText = 'font-size:0.8em; width:50px;';

        const exprSelect = document.createElement('select');
        exprSelect.style.flex = '1';

        const previewBtn = document.createElement('button');
        previewBtn.textContent = '👁️';
        previewBtn.title = 'マップエディタの3Dビューに表情をプレビュー';
        previewBtn.className = 'secondary-button';
        previewBtn.style.padding = '2px 8px';
        previewBtn.onclick = (e) => {
            e.preventDefault();
            if (window.threeHandler && charData.modelId) {
                window.threeHandler.previewExpression(charData.modelId, exprSelect.value);
            }
        };

        const rowAnim = document.createElement('div');
        rowAnim.style.cssText = 'display:flex; align-items:center; gap:5px; margin-bottom:5px;';
        const animLabel = document.createElement('span');
        animLabel.textContent = '🏃 Anim:';
        animLabel.style.cssText = 'font-size:0.8em; width:50px;';
        const animSelect = document.createElement('select');
        animSelect.style.flex = '1';
        populateAssetSelect(animSelect, 'animations', '(ポーズ/待機)');
        animSelect.value = charData.animationId || '';
        animSelect.onchange = (e) => { charData.animationId = e.target.value; };

        // ループ設定
        const loopLabel3D = document.createElement('label');
        loopLabel3D.style.cssText = 'font-size:0.8em; display:flex; align-items:center; cursor:pointer; margin-left:5px;';
        const loopCheck3D = document.createElement('input');
        loopCheck3D.type = 'checkbox';
        loopCheck3D.checked = (charData.loop !== undefined) ? charData.loop : true;
        loopCheck3D.onchange = (e) => charData.loop = e.target.checked;
        loopLabel3D.append(loopCheck3D, document.createTextNode('Loop'));

        rowExpr.append(exprLabel, exprSelect, previewBtn);
        rowAnim.append(animLabel, animSelect, loopLabel3D);

        vrmOptionsContainer.append(rowExpr, rowAnim);

        const createNum = (ph, val, cb, tip, step = '0.1') => {
            const inp = document.createElement('input');
            inp.type = 'number'; inp.step = step; inp.placeholder = ph; inp.value = val !== undefined ? val : 0;
            inp.style.cssText = 'width:50px; font-size:0.8em; padding: 2px;';
            inp.title = tip; inp.onchange = cb;
            return inp;
        };
        const rowPos = document.createElement('div'); rowPos.style.cssText = 'display:flex; align-items:center; gap:3px; margin-bottom:3px;';
        rowPos.innerHTML = '<span style="font-size:0.8em; width:30px; font-weight:bold;">Pos:</span>';
        rowPos.appendChild(createNum('X', charData.posX, e => charData.posX = parseFloat(e.target.value), '位置 X'));
        rowPos.appendChild(createNum('Y', charData.posY, e => charData.posY = parseFloat(e.target.value), '位置 Y'));
        rowPos.appendChild(createNum('Z', charData.posZ, e => charData.posZ = parseFloat(e.target.value), '位置 Z'));

        const rowRot = document.createElement('div'); rowRot.style.cssText = 'display:flex; align-items:center; gap:3px; margin-bottom:3px;';
        rowRot.innerHTML = '<span style="font-size:0.8em; width:30px; font-weight:bold;">Rot:</span>';
        rowRot.appendChild(createNum('X', charData.rotX, e => charData.rotX = parseFloat(e.target.value), '回転 X', '1'));
        rowRot.appendChild(createNum('Y', charData.rotY, e => charData.rotY = parseFloat(e.target.value), '回転 Y', '1'));
        rowRot.appendChild(createNum('Z', charData.rotZ, e => charData.rotZ = parseFloat(e.target.value), '回転 Z', '1'));

        const rowScale = document.createElement('div'); rowScale.style.cssText = 'display:flex; align-items:center; gap:3px;';
        rowScale.innerHTML = '<span style="font-size:0.8em; width:30px; font-weight:bold;">Scl:</span>';
        const scaleInp = createNum('1.0', charData.scale !== undefined ? charData.scale : 1.0, e => charData.scale = parseFloat(e.target.value), 'サイズ (1.0 = 標準)');
        scaleInp.style.flex = '1';
        rowScale.appendChild(scaleInp);

        const updateUIForModel = (modelId) => {
            const vrmsCache = state.getVrmsCache();
            const isVrm = vrmsCache && vrmsCache[modelId];

            if (isVrm) {
                vrmOptionsContainer.style.display = 'block';
                exprSelect.innerHTML = '<option value="">(デフォルト)</option>';

                const expressions = state.modelExpressionCache[modelId];

                if (expressions && expressions.length > 0) {
                    expressions.forEach(name => {
                        const option = new Option(name, name);
                        option.style.color = 'black';
                        exprSelect.add(option);
                    });
                }
                exprSelect.value = charData.expression || '';
            } else {
                vrmOptionsContainer.style.display = 'none';
            }
        };

        modelSelect.onchange = (e) => {
            charData.modelId = e.target.value;
            charData.expression = '';
            charData.animationId = '';
            updateUIForModel(charData.modelId);
        };

        exprSelect.onchange = (e) => {
            charData.expression = e.target.value;
        };

        wrapper.append(row1, vrmOptionsContainer, rowPos, rowRot, rowScale);
        container.appendChild(wrapper);

        updateUIForModel(charData.modelId);
    });
}

function updateVariableSelectsFor(sel) {
    const v = state.getProjectData().variables;
    sel.innerHTML = '<option value="">(変数)</option>';
    Object.keys(v).forEach(k => sel.add(new Option(k, k)));
}

function renderVariableOperationsEditor(operations) {
    const editor = document.getElementById('variable-operations-editor');
    if (!editor) return;
    editor.innerHTML = '';

    if (!operations || operations.length === 0) {
        operations.push({ type: 'variable', targetVariable: '', targetEnemyId: '', operator: '=', value: '' });
    }

    operations.forEach((op, index) => {
        // 互換性維持
        if (!op.type) op.type = (op.targetVariable && op.targetVariable.startsWith('$')) ? 'player' : 'variable';

        const item = document.createElement('div');
        item.className = 'variable-op-item';
        // レイアウト: タイプ | エネミー選択(隠れる) | パラメータ | 演算子 | 値 | 削除
        item.style.cssText = 'display:flex; flex-wrap:wrap; gap:5px; align-items:center; margin-bottom:10px; background:#f9f9f9; padding:10px; border-radius:4px; border:1px solid #eee;';

        // 1. 対象タイプ (誰の変数をいじるか)
        const typeSelect = document.createElement('select');
        typeSelect.style.width = '120px';
        typeSelect.add(new Option('🌐 ゲーム全体', 'variable'));
        typeSelect.add(new Option('👤 プレイヤー', 'player'));
        typeSelect.add(new Option('👹 エネミー', 'enemy'));
        typeSelect.value = op.type;

        // 2. エネミー対象選択 (typeがenemyの時だけ表示)
        const enemySelect = document.createElement('select');
        enemySelect.style.width = '140px';
        const enemies = state.getProjectData().enemies || {};
        enemySelect.add(new Option('-- 対象の敵 --', ''));
        Object.keys(enemies).forEach(id => {
            enemySelect.add(new Option(enemies[id].name, id));
        });
        enemySelect.value = op.targetEnemyId || '';

        // 3. パラメータ(変数名)入力 / 選択
        // 従来通り datalist で補完させるための input を使用
        const targetInput = document.createElement('input');
        targetInput.type = 'text';
        targetInput.placeholder = '変数名/パラメータ';
        targetInput.style.flex = '1';
        targetInput.style.minWidth = '100px';
        targetInput.value = op.targetVariable || '';
        
        // 補完用リストの切り替え (CSSとDatalistを後で反映)
        targetInput.setAttribute('list', 'variable-list-options');

        // 4. 演算子
        const opSelect = document.createElement('select');
        opSelect.style.width = '60px';
        ['=', '+=', '-=', '*=', '/='].forEach(o => opSelect.add(new Option(o, o)));
        opSelect.add(new Option('Auto+', 'auto+'));
        opSelect.add(new Option('Auto-', 'auto-'));
        opSelect.add(new Option('Stop', 'stop'));
        opSelect.value = op.operator || '=';
        
        // 5. 値入力
        const valInput = document.createElement('input');
        valInput.type = 'text';
        valInput.placeholder = '値 / 計算式 / 1d6';
        valInput.style.flex = '1.5';
        valInput.style.minWidth = '120px';
        valInput.setAttribute('list', 'variable-list-options');
        valInput.value = op.value || '';

        // ★ヒント表示用のエリア
        const hintDiv = document.createElement('div');
        hintDiv.style.cssText = "width:100%; font-size: 0.85em; color: #0050b3; background: #e6f7ff; padding: 5px; border-radius: 4px; display: none; line-height: 1.4;";

        // 表示切り替えロジック
        const updateUI = () => {
            if (typeSelect.value === 'enemy') {
                enemySelect.style.display = 'block';
                typeSelect.style.borderColor = '#d46b08';
                targetInput.placeholder = '例: hp, atk, def, spd';
                targetInput.title = '操作するステータス名を入力してください';
            } else {
                enemySelect.style.display = 'none';
                typeSelect.style.borderColor = '';
                targetInput.placeholder = (typeSelect.value === 'player') ? '例: $hp' : '変数名';
            }

            // ヒントの更新
            const v = opSelect.value;
            const val = valInput.value || '(値)';
            if (v === 'auto+' || v === 'auto-') {
                hintDiv.style.display = 'block';
                const action = (v === 'auto+') ? '増え' : '減り';
                hintDiv.innerHTML = `⏱️ <b>タイマー:</b> 1秒間に <b>${val}</b> ずつ自動で${action}続けます。`;
            } else if (v === 'stop') {
                hintDiv.style.display = 'block';
                hintDiv.innerHTML = `⏹️ <b>タイマー停止:</b> <b>${op.targetVariable || '変数'}</b> の変動を止めます。`;
            } else {
                hintDiv.style.display = 'none';
            }
        };

        // イベント登録
        typeSelect.onchange = (e) => { op.type = e.target.value; updateUI(); };
        enemySelect.onchange = (e) => op.targetEnemyId = e.target.value;
        targetInput.onchange = (e) => { op.targetVariable = e.target.value; updateUI(); };
        opSelect.onchange = (e) => { op.operator = e.target.value; updateUI(); };
        valInput.onchange = (e) => { op.value = e.target.value; updateUI(); };

        // 6. 削除ボタン
        const delBtn = document.createElement('button');
        delBtn.textContent = '×';
        delBtn.className = 'danger-button';
        delBtn.onclick = () => {
            if (operations.length > 1) {
                operations.splice(index, 1);
                renderVariableOperationsEditor(operations);
            }
        };

        item.append(typeSelect, enemySelect, targetInput, opSelect, valInput, delBtn, hintDiv);
        editor.appendChild(item);
        
        updateUI(); // 初回表示
    });

    setTimeout(() => {
        if (typeof updateDynamicVariableSelects === 'function') {
            updateDynamicVariableSelects(); 
        }
    }, 0);
}

function updateDynamicVariableSelects() {
    // 共通の変数 datalist (variable-list-options) を最新化
    if (typeof updateVariableSelects === 'function') {
        updateVariableSelects();
    }

    // エネミーステータス補完用 datalist の生成・更新
    let enemyDatalist = document.getElementById('enemy-status-options');
    if (!enemyDatalist) {
        enemyDatalist = document.createElement('datalist');
        enemyDatalist.id = 'enemy-status-options';
        document.body.appendChild(enemyDatalist);
    }
    enemyDatalist.innerHTML = '';
    ['hp', 'stamina', 'atk', 'def', 'spd', 'penetration', 'critRate', 'critMult', 'attackRange', 'attackCooldown', 'projectileSpeed', 'blastRadius', 'blastDamageRate'].forEach(st => {
        enemyDatalist.appendChild(new Option(st));
    });

    // 操作タイプ（ゲーム全体 / プレイヤー / エネミー）に応じて入力補完リストを動的に切り替え
    document.querySelectorAll('.variable-op-item').forEach(item => {
        const typeSel = item.querySelector('select:first-child');
        const targetInp = item.querySelector('input[placeholder*="変数名"]');
        if (typeSel && targetInp) {
            if (typeSel.value === 'enemy') {
                targetInp.setAttribute('list', 'enemy-status-options');
            } else {
                targetInp.setAttribute('list', 'variable-list-options');
            }
        }
    });
}


function renderUIOperationsEditor(operations) {
    const listContainer = document.getElementById('ui-operations-list');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    if (typeof updateUIIdDatalist === 'function') {
        updateUIIdDatalist();
    }

    if (!operations) operations = [];

    operations.forEach((op, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'ui-op-item';
        wrapper.style.cssText = 'background:#f9f9f9; border:1px solid #ddd; padding:10px; border-radius:4px; margin-bottom:10px; position:relative;';

        const delBtn = document.createElement('button');
        delBtn.textContent = '×';
        delBtn.className = 'danger-button';
        delBtn.style.cssText = 'position:absolute; top:5px; right:5px; padding:2px 8px; font-size:0.8em;';
        delBtn.onclick = () => {
            operations.splice(index, 1);
            renderUIOperationsEditor(operations);
        };
        wrapper.appendChild(delBtn);

        const typeRow = document.createElement('div');
        typeRow.style.marginBottom = '8px';
        const typeLabel = document.createElement('label');
        typeLabel.textContent = '操作タイプ: ';
        typeLabel.style.fontSize = '0.9em';
        const typeSel = document.createElement('select');
        const types = {
            'crosshair': '⌖ クロスヘア (照準)',
            'radar': '📡 レーダー',
            'menuButton': '🎒 メニューボタン (アイテム)', // ★追加
            'text': '🔤 テキスト表示',
            'gauge': '📊 ゲージ表示',
            'damageText': '💥 ダメージ表示',
            'remove': '🗑️ 要素削除'
        };
        for (const k in types) typeSel.add(new Option(types[k], k));
        typeSel.value = op.type || 'crosshair';
        typeSel.onchange = (e) => {
            op.type = e.target.value;
if (['text', 'gauge', 'remove'].includes(op.type) && !op.elemId) {
                // indexへの依存をやめてランダム数値に変更
                op.elemId = 'ui_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
            }
            renderUIOperationsEditor(operations);
        };
        typeRow.appendChild(typeLabel);
        typeRow.appendChild(typeSel);
        wrapper.appendChild(typeRow);

        const t = op.type;

        // ON/OFF スイッチを持つタイプ
        if (['crosshair', 'radar', 'damageText', 'menuButton'].includes(t)) {
            
            // ★根本原因の修正: データが未定義なら、ここで 'on' を代入して確定させる
            if (!op.switchVal) {
                op.switchVal = 'on';
            }

            const swRow = document.createElement('div');
            swRow.className = 'form-group-row';
            swRow.innerHTML = '<label>状態:</label>';
            const swSel = document.createElement('select');
            swSel.add(new Option('表示 (ON)', 'on'));
            swSel.add(new Option('非表示 (OFF)', 'off'));
            
            swSel.value = op.switchVal; // 上で確定させているので || 'on' は不要になる
            
            swSel.onchange = (e) => {
                op.switchVal = e.target.value;
                // どの操作タイプの値が変更されたかを確認するログ
                console.log(`[Editor] UI操作 '${t}' の状態を '${op.switchVal}' に設定しました。`);
            };
            swRow.appendChild(swSel);
            wrapper.appendChild(swRow);
        }

        // --- 以下、各タイプの詳細設定 (既存コード維持) ---
        if (t === 'crosshair') {
            const details = document.createElement('div');
            details.style.cssText = 'padding:10px; background:#f0f8ff; border:1px solid #adc6ff; margin-top:5px;';
            const dirRow = document.createElement('div');
            dirRow.style.display = 'flex'; dirRow.style.gap = '5px'; dirRow.style.marginTop = '5px';
            const createInput = (label, val, cb, placeholder) => {
                const div = document.createElement('div');
                div.innerHTML = '<label style="font-size:0.8em">' + label + '</label>';
                const inp = document.createElement('input');
                inp.type = 'text';
                inp.value = val;
                inp.placeholder = placeholder || '';
                inp.setAttribute('list', 'variable-list-options');
                inp.style.width = '100%';
                inp.onchange = cb;
                div.style.flex = '1';
                div.appendChild(inp);
                return div;
            };
            dirRow.appendChild(createInput('射程 / 距離', op.range || '100', e => op.range = e.target.value, '100'));
            dirRow.appendChild(createInput('幅 / 直径', op.width || '50', e => op.width = e.target.value, '50'));
            details.appendChild(dirRow);

            const lockOnRow = document.createElement('div');
            lockOnRow.style.marginTop = '8px';
            const lockOnCheck = document.createElement('input');
            lockOnCheck.type = 'checkbox'; lockOnCheck.checked = !!op.lockon;
            lockOnCheck.id = 'temp_lockon_check_' + index;
            lockOnCheck.onchange = (e) => { op.lockon = e.target.checked; renderUIOperationsEditor(operations); };
            const lockOnLabel = document.createElement('label');
            lockOnLabel.textContent = '🎯 ロックオン有効化'; lockOnLabel.setAttribute('for', lockOnCheck.id);
            lockOnRow.append(lockOnCheck, lockOnLabel);
            details.appendChild(lockOnRow);
            if (op.lockon) {
                const lockTypeRow = document.createElement('div'); lockTypeRow.innerHTML = '<label>追尾タイプ: </label>';
                const lockTypeSel = document.createElement('select');
                lockTypeSel.add(new Option('攻撃のみ追尾', 'attack'));
                lockTypeSel.add(new Option('カメラのみ追尾', 'camera'));
                lockTypeSel.add(new Option('両方追尾', 'both'));
                lockTypeSel.value = op.lockonType || 'attack'; lockTypeSel.onchange = e => op.lockonType = e.target.value;
                lockTypeRow.appendChild(lockTypeSel);
                details.appendChild(lockTypeRow);
            }
            wrapper.appendChild(details);
        }

        if (t === 'radar') {
            const rDetail = document.createElement('div');
            rDetail.style.cssText = 'margin-top:5px; padding:5px; background:#e6f7ff; border:1px solid #91d5ff; border-radius:4px;';
            const rLabel = document.createElement('label');
            rLabel.style.fontSize = '0.8em';
            rLabel.textContent = '表示半径 (Grid数):';
            const rInp = document.createElement('input');
            rInp.type = 'text';
            rInp.placeholder = 'デフォルト: 10';
            rInp.setAttribute('list', 'variable-list-options');
            rInp.value = op.radarRange || '10';
            rInp.style.width = '100%';
            rInp.onchange = (e) => op.radarRange = e.target.value;
            rDetail.append(rLabel, rInp);
            wrapper.appendChild(rDetail);
        }

        if (['text', 'gauge', 'remove'].includes(t)) {
            // ... (テキスト・ゲージ・削除のUI構築。既存コードと同じ) ...
            const idRow = document.createElement('div');
            idRow.style.marginBottom = '5px';
            if (t === 'remove') {
                const idLabel = document.createElement('div'); idLabel.textContent = '削除するID:'; idLabel.style.fontSize = '0.8em'; idRow.appendChild(idLabel);
                const idSel = document.createElement('select'); idSel.style.width = '100%';
                const existingIds = new Set();
                operations.forEach(opItem => { if ((opItem.type === 'text' || opItem.type === 'gauge') && opItem.elemId) existingIds.add(opItem.elemId); });
                const pData = state.getProjectData();
                for (const sId in pData.scenario.sections) { const sec = pData.scenario.sections[sId]; for (const nId in sec.nodes) { const node = sec.nodes[nId]; if (node.type === 'ui_control' && node.uiOperations) { node.uiOperations.forEach(uOp => { if ((uOp.type === 'text' || uOp.type === 'gauge') && uOp.elemId) { existingIds.add(uOp.elemId); } }); } } }
                idSel.add(new Option('--- 選択 ---', ''));
                existingIds.forEach(eid => idSel.add(new Option(eid, eid)));
                if (op.elemId && !existingIds.has(op.elemId)) idSel.add(new Option(op.elemId, op.elemId, true, true));
                idSel.value = op.elemId || ''; idSel.onchange = (e) => op.elemId = e.target.value;
                idRow.appendChild(idSel);
            } else {
                const idInp = document.createElement('input'); idInp.type = 'text'; idInp.placeholder = '管理ID (例: hp_bar)'; idInp.setAttribute('list', 'ui-id-list-options'); idInp.style.width = '100%'; idInp.value = op.elemId || '';
                idInp.onchange = (e) => { op.elemId = e.target.value; renderUIOperationsEditor(operations); };
                idRow.appendChild(idInp);
            }
            wrapper.appendChild(idRow);

            if (t !== 'remove') {
                const posRow = document.createElement('div'); posRow.style.cssText = 'display:flex; gap:5px; margin-bottom:5px;';
                const createNum = (ph, val, cb) => { const inp = document.createElement('input'); inp.type = 'number'; inp.placeholder = ph; inp.value = val; inp.style.width = '60px'; inp.onchange = cb; return inp; };
                posRow.innerHTML = '<span style="font-size:0.8em">Pos(%):</span>';
                posRow.appendChild(createNum('X', op.posX !== undefined ? op.posX : 5, e => op.posX = Number(e.target.value)));
                posRow.appendChild(createNum('Y', op.posY !== undefined ? op.posY : 5, e => op.posY = Number(e.target.value)));
                wrapper.appendChild(posRow);
            }
        }

if (t === 'text') {
            const label = document.createElement('div');
            label.textContent = '表示テキスト (変数: {{val}})';
            label.style.fontSize = '0.8em';
            label.style.marginBottom = '5px';
            wrapper.appendChild(label);

            // Quill用のコンテナ
            const qContainer = document.createElement('div');
            qContainer.style.backgroundColor = '#fff';
            qContainer.style.height = '120px'; // 高さは控えめに
            qContainer.style.marginBottom = '10px';
            wrapper.appendChild(qContainer);

            // Quillの初期化
            // ※フォント設定などはグローバルに登録済みなのでそのまま使えます
            const q = new Quill(qContainer, {
                theme: 'snow',
                modules: {
                    toolbar: [
                        [{ 'font': ['sans-serif', 'serif', 'monospace', 'dotgothic', 'rounded', 'klee', 'mincho-b'] }],
                        ['bold', 'italic', 'underline'],          // アンダーライン追加
                        [{ 'color': [] }, { 'background': [] }],  // 背景色追加
                        [{ 'size': ['small', false, 'large', 'huge'] }],
                        [{ 'align': [] }],                        // 文字揃え追加
                        ['clean']
                    ]
                }
            });

            // データの読み込み
            q.root.innerHTML = op.textContent || '';

            // 変更検知して保存
            q.on('text-change', () => {
                op.textContent = q.root.innerHTML;
            });

            // ※色の設定はQuillで行うので、単色のカラーピッカーは削除します
            // (元の colInp は削除)
        }

        if (t === 'gauge') {
            // ... (ゲージ設定UI。既存コードと同じ) ...
            const gaugeContainer = document.createElement('div');
            gaugeContainer.style.cssText = 'padding:10px; background:#fff7e6; border:1px solid #ffd591; border-radius:4px; margin-top:5px;';
            const presetSel = document.createElement('select'); presetSel.style.width = '100%';
            presetSel.add(new Option('⚙️ カスタム', 'custom'));
            presetSel.add(new Option('❤️ プレイヤーHP', 'hp'));
            presetSel.add(new Option('⚡ スタミナ', 'stamina'));
            presetSel.add(new Option('🔫 マガジン', 'magazine'));
            presetSel.add(new Option('👹 ボスHP', 'boss'));
            gaugeContainer.appendChild(presetSel);

const valRow = document.createElement('div'); 
             valRow.style.cssText = 'display:flex; gap:10px; margin-top:5px;';
             
             // 左側（現在値）のセット
             const curDiv = document.createElement('div'); curDiv.style.flex = '1';
             curDiv.innerHTML = '<label style="font-size:0.8em; color:#666;">現在値の変数</label>';
             const curInp = document.createElement('input'); 
             curInp.placeholder = '$hp'; curInp.value = op.gaugeCur||''; curInp.style.width = '100%'; 
             curInp.setAttribute('list', 'variable-list-options'); // 入力補完も有効化
             curInp.onchange = e => op.gaugeCur = e.target.value;
             curDiv.appendChild(curInp);

             // 右側（最大値）のセット
             const maxDiv = document.createElement('div'); maxDiv.style.flex = '1';
             maxDiv.innerHTML = '<label style="font-size:0.8em; color:#666;">最大値 (変数or数字)</label>';
             const maxInp = document.createElement('input'); 
             maxInp.placeholder = '$maxHp'; maxInp.value = op.gaugeMax||''; maxInp.style.width = '100%'; 
             maxInp.setAttribute('list', 'variable-list-options'); // 入力補完も有効化
             maxInp.onchange = e => op.gaugeMax = e.target.value;
             maxDiv.appendChild(maxInp);

             valRow.append(curDiv, maxDiv); 
             gaugeContainer.appendChild(valRow);

            const colInp = document.createElement('input'); colInp.type = 'color'; colInp.value = op.color || '#ff0000'; colInp.onchange = e => op.color = e.target.value;
            const lblInp = document.createElement('input'); lblInp.placeholder = 'Label'; lblInp.value = op.gaugeLabel || ''; lblInp.onchange = e => op.gaugeLabel = e.target.value;
            const styleRow = document.createElement('div'); styleRow.style.cssText = 'display:flex; gap:5px; margin-top:5px;'; styleRow.append(colInp, lblInp);
            gaugeContainer.appendChild(styleRow);

            presetSel.onchange = (e) => {
                const v = e.target.value;
                if (v === 'hp') { 
                    curInp.value = '$hp'; 
                    maxInp.value = '$maxHp'; 
                    colInp.value = '#ff0000'; 
                    lblInp.value = 'HP'; 
                }
                if (v === 'stamina') { 
                    curInp.value = '$stamina'; 
                    // ★修正: 固定値 '100' から 変数 '$maxStamina' に変更
                    maxInp.value = '$maxStamina'; 
                    colInp.value = '#00ff00'; 
                    lblInp.value = 'ST'; 
                }
                if (v === 'magazine') { 
                    curInp.value = '$magazine'; 
                    // ★修正: 固定値 '30' から 変数 '$maxMagazine' に変更
                    maxInp.value = '$maxMagazine'; 
                    colInp.value = '#ffff00'; 
                    lblInp.value = 'AMMO'; 
                }
                if (v === 'boss') { 
                    curInp.value = 'boss_hp'; 
                    maxInp.value = '1000'; 
                    colInp.value = '#800080'; 
                    lblInp.value = 'BOSS'; 
                }
                
                op.gaugeCur = curInp.value; 
                op.gaugeMax = maxInp.value; 
                op.color = colInp.value; 
                op.gaugeLabel = lblInp.value;
                valRow.style.display = (v === 'custom' ? 'flex' : 'none');
            };
            // 初期状態判定
            if (op.gaugeCur === '$hp') presetSel.value = 'hp';
            else if (op.gaugeCur === '$stamina') presetSel.value = 'stamina';
            else if (op.gaugeCur === '$magazine') presetSel.value = 'magazine';
            else if (op.gaugeCur === 'boss_hp') presetSel.value = 'boss';
            else presetSel.value = 'custom';
            valRow.style.display = (presetSel.value === 'custom' ? 'flex' : 'none');

            wrapper.appendChild(gaugeContainer);
        }

        listContainer.appendChild(wrapper);
    });

    if (typeof updateVariableSelects === 'function') { updateVariableSelects(); }
}

export async function renderNodeEditor() {
    // プレビュー用アセットのロード待機
    if (window.threeHandler) {
        await window.threeHandler.ensureEditorAssetsAreLoaded();
    }

    const activeId = state.getActiveNodeId();
    const secId = state.getActiveSectionId();
    const proj = state.getProjectData();

    // ノードが選択されていない、またはデータが存在しない場合
    if (!activeId || !proj.scenario.sections[secId]?.nodes[activeId]) {
        const editor = document.getElementById('node-editor');
        const placeholder = document.getElementById('editor-placeholder');
        if (editor) editor.classList.add('hidden');
        if (placeholder) placeholder.style.display = 'flex';
        return;
    }

    // エディタ表示切り替え
    const nodeEditor = document.getElementById('node-editor');
    const editorPlaceholder = document.getElementById('editor-placeholder');
    nodeEditor.classList.remove('hidden');
    editorPlaceholder.style.display = 'none';

    // ノードデータの取得
    const node = proj.scenario.sections[secId].nodes[activeId];
    
    // ヘッダー情報の更新
    document.getElementById('node-id-display').textContent = activeId;
    const labelInput = document.getElementById('node-label');
    if (labelInput) {
        labelInput.value = node.nodeLabel || '';
    }
    document.getElementById('is-start-node').checked = (activeId === proj.scenario.startNodeId);
    document.getElementById('node-type').value = node.type;

    // ★新機能: 逆引き検索（どこからリンクされているか）の表示
    const findIncomingLinks = (targetId) => {
        const links = [];
        for (const sId in proj.scenario.sections) {
            const sec = proj.scenario.sections[sId];
            for (const nId in sec.nodes) {
                if (nId === targetId) continue; // 自分自身は除外
                const n = sec.nodes[nId];
                let isLinked = false;
                let reason = "";

                if (n.nextNodeId === targetId) { isLinked = true; reason = "次のノード"; }
                if (n.type === 'conditional') {
                    if (n.elseNextNodeId === targetId) { isLinked = true; reason = "条件(ELSE)"; }
                    if (n.conditions) n.conditions.forEach((c, i) => { if (c.nextNodeId === targetId) { isLinked = true; reason = `条件(IF #${i+1})`; }});
                }
                if (n.type === 'choice' && n.choices) {
                    n.choices.forEach((c, i) => { if (c.nextNodeId === targetId) { isLinked = true; reason = `選択肢(${c.text})`; }});
                }
                if (n.type === 'battle') {
                    if (n.nextWinNodeId === targetId) { isLinked = true; reason = "勝利時"; }
                    if (n.nextRunNodeId === targetId) { isLinked = true; reason = "逃走時"; }
                    if (n.nextLoseNodeId === targetId) { isLinked = true; reason = "敗北時"; }
                }
                if (n.type === 'input') {
                    const c = n.inputConfig || {};
                    if (c.nextSuccessId === targetId) { isLinked = true; reason = "正解時"; }
                    if (c.nextFailId === targetId) { isLinked = true; reason = "失敗時"; }
                }

                if (isLinked) links.push({ sId, nId, name: sec.name, label: n.nodeLabel, reason });
            }
        }
        return links;
    };

    // 逆引きリストのUI構築
    let reverseLinksDiv = document.getElementById('reverse-links-container');
    if (!reverseLinksDiv) {
        reverseLinksDiv = document.createElement('div');
        reverseLinksDiv.id = 'reverse-links-container';
        reverseLinksDiv.style.cssText = "margin-bottom: 15px; padding: 10px; background: #fffbe6; border: 1px solid #ffe58f; border-radius: 4px; font-size: 0.85em;";
        
        // ヘッダー（IDバッジのある行）のすぐ下に追加する
        const headerEl = document.querySelector('.editor-header');
        if (headerEl) headerEl.after(reverseLinksDiv);
    }

    const incoming = findIncomingLinks(activeId);
    if (incoming.length === 0) {
        reverseLinksDiv.innerHTML = `<span style="color:#d46b08;">🔗 リンク元: (なし / またはSTART地点)</span>`;
    } else {
        let html = `<span style="color:#d46b08; font-weight:bold;">🔗 以下のノードから呼ばれています (${incoming.length}箇所):</span><ul style="margin:5px 0 0 20px; padding:0; color:#555;">`;
        incoming.forEach(link => {
            const displayName = link.label ? `【${link.label}】` : link.nId.slice(-4);
            html += `<li style="margin-bottom:3px;">
                        <a href="#" class="reverse-link-btn" data-sid="${link.sId}" data-nid="${link.nId}" style="color:#1890ff; text-decoration:none;">
                            ${link.name} > ${displayName}
                        </a>
                        <span style="color:#888;"> ... (${link.reason})</span>
                     </li>`;
        });
        html += `</ul>`;
        reverseLinksDiv.innerHTML = html;

        // リンククリックでそのノードへジャンプする処理
        reverseLinksDiv.querySelectorAll('.reverse-link-btn').forEach(a => {
            a.onclick = async (e) => {
                e.preventDefault();
                state.setActiveSectionId(e.target.dataset.sid);
                state.setActiveNodeId(e.target.dataset.nid);
                // ツリーを開いて選択状態にする
                const sec = proj.scenario.sections[e.target.dataset.sid];
                if (sec) sec.collapsed = false;
                
                // 再描画
                if (typeof renderScenarioTree === 'function') renderScenarioTree();
                await renderNodeEditor(); // 自分自身を呼び直してジャンプ
            };
        });
    }

    // タイプ別設定エリアの表示切り替え
    document.querySelectorAll('.node-type-settings').forEach(el => el.classList.add('hidden'));
    const setEl = document.getElementById(node.type + '-node-settings');
    if (setEl) setEl.classList.remove('hidden');

    // --- ノードタイプごとの処理 ---
if (node.type === 'input') {
        if (!node.inputConfig) {
            node.inputConfig = {
                targetVar: '$name',
                typeLimit: 'text',
                maxLength: 10,
                btnText: '決定',
                allowEmpty: false,
                initialValue: '',     // ★追加
                cancelText: '',       // ★追加
                correctAnswer: '',
                retryLimit: 0,
                nextSuccessId: '',
                nextFailId: '',
                nextCancelId: ''      // ★追加
            };
        }
        
        const conf = node.inputConfig;
        
        // 要素取得と値セット
        const elVar = document.getElementById('input-target-var');
        const elLimit = document.getElementById('input-type-limit');
        const elMax = document.getElementById('input-max-length');
        const elBtn = document.getElementById('input-btn-text');
        const elAns = document.getElementById('input-correct-answer');
        const elRetry = document.getElementById('input-retry-limit');
        const elEmpty = document.getElementById('input-allow-empty');
        // ★追加要素の取得
        const elInitVal = document.getElementById('input-initial-value');
        const elCancelText = document.getElementById('input-cancel-text');

        if(elVar) { elVar.value = conf.targetVar || ''; elVar.onchange = e => conf.targetVar = e.target.value; }
        if(elLimit) { elLimit.value = conf.typeLimit || 'text'; elLimit.onchange = e => conf.typeLimit = e.target.value; }
        if(elMax) { elMax.value = conf.maxLength || 10; elMax.onchange = e => conf.maxLength = parseInt(e.target.value)||10; }
        if(elBtn) { elBtn.value = conf.btnText || '決定'; elBtn.onchange = e => conf.btnText = e.target.value; }
        if(elAns) { elAns.value = conf.correctAnswer || ''; elAns.onchange = e => conf.correctAnswer = e.target.value; }
        if(elRetry) { elRetry.value = conf.retryLimit || 0; elRetry.onchange = e => conf.retryLimit = parseInt(e.target.value)||0; }
        if(elEmpty) { elEmpty.checked = !!conf.allowEmpty; elEmpty.onchange = e => conf.allowEmpty = e.target.checked; }
        
        // ★追加イベント
        if(elInitVal) { elInitVal.value = conf.initialValue || ''; elInitVal.onchange = e => conf.initialValue = e.target.value; }
        if(elCancelText) { elCancelText.value = conf.cancelText || ''; elCancelText.onchange = e => conf.cancelText = e.target.value; }
        
        // 移動先のセレクトボックス生成
        createLinkedSelects(document.getElementById('container-next-input-success'), 'node-next-input-success', conf.nextSuccessId);
        document.getElementById('container-next-input-success').onchange = e => conf.nextSuccessId = document.getElementById('node-next-input-success').value;
        
        createLinkedSelects(document.getElementById('container-next-input-fail'), 'node-next-input-fail', conf.nextFailId);
        document.getElementById('container-next-input-fail').onchange = e => conf.nextFailId = document.getElementById('node-next-input-fail').value;

        // ★追加移動先
        createLinkedSelects(document.getElementById('container-next-input-cancel'), 'node-next-input-cancel', conf.nextCancelId);
        document.getElementById('container-next-input-cancel').onchange = e => conf.nextCancelId = document.getElementById('node-next-input-cancel').value;
    }
    else if (node.type === 'text') {
        // 1. テキスト本文
        state.quill.root.innerHTML = node.message || '';
        
        // 2. 2Dキャラクター設定
        if (!node.characters) node.characters = [];
        const charListContainer = document.getElementById('node-char-list-container');
        if (typeof renderCharacterListEditor === 'function') renderCharacterListEditor(node.characters);

        document.getElementById('add-char-btn').onclick = () => {
            node.characters.push({ position: 'bottom-center', scale: 100 });
            if (typeof renderCharacterListEditor === 'function') renderCharacterListEditor(node.characters);
        };

        // 3. 3Dキャラクター設定
        if (!node.characters3d) node.characters3d = [];
        if (typeof render3DCharacterListEditor === 'function') render3DCharacterListEditor(node.characters3d);

        document.getElementById('add-3d-char-btn').onclick = () => {
            node.characters3d.push({ modelId: '', posX: 0, posY: 0, posZ: 0, rotX: 0, rotY: 0, rotZ: 0, scale: 1.0 });
            if (typeof render3DCharacterListEditor === 'function') render3DCharacterListEditor(node.characters3d);
        };

        // 4. 基本設定 (名前、背景、BGM、SE)
        const customName = document.getElementById('node-custom-name'); 
        if (customName) customName.value = node.customName || '';
        
        const background = document.getElementById('node-background'); 
        if (background) {
            populateAssetSelect(background, 'backgrounds', '変更なし');
            background.value = node.backgroundId || '';
        }
        
        const bgm = document.getElementById('node-bgm'); 
        if (bgm) {
            populateAssetSelect(bgm, 'sounds', '変更なし');
            bgm.add(new Option('停止 (Stop)', 'stop')); // 停止オプション追加
            bgm.value = node.bgmId || '';
        }
        
        const sound = document.getElementById('node-sound'); 
        if (sound) {
            populateAssetSelect(sound, 'sounds', 'なし');
            sound.value = node.soundId || '';
        }

        // 5. パーティクル・エフェクト設定
        const particleSelect = document.getElementById('node-particle');
        if (particleSelect) {
            updateParticleSelects(); // リスト更新
            particleSelect.value = node.particleId || '';
        }

        let effSel = document.getElementById('node-effect');
        if (!effSel) {
            // エフェクト選択肢がない場合は動的生成
            const grp = document.createElement('div');
            grp.className = 'form-group';
            grp.style.cssText = 'margin-top:10px; padding:10px; background:#fff0f6; border:1px dashed #ffadd2; border-radius:4px;';
            grp.innerHTML = '<label style="color:#c41d7f; font-weight:bold;">⚡ 画面演出</label>';
            effSel = document.createElement('select');
            effSel.id = 'node-effect';
            const effs = {
                '': 'なし',
                'flash-white': '⚪ 白フラッシュ',
                'flash-red': '🔴 赤フラッシュ',
                'shake-small': '🫨 揺れ(小)',
                'shake-medium': '🫨 揺れ(中)',
                'shake-hard': '🫨 揺れ(大)',
                'fade-black': '⚫ 暗転 (フェード)',
                'encounter-flash': '⚡️ 遭遇フラッシュ (ポケモン風)',
                'encounter-shutter': '🚪 シャッター (上下黒帯)'
            };
            for (const [k, v] of Object.entries(effs)) effSel.add(new Option(v, k));
            grp.appendChild(effSel);
            if (sound) sound.closest('.form-group-row').after(grp);
            effSel.onchange = (e) => node.effect = e.target.value;
        }
        effSel.value = node.effect || '';

        // 6. 個別ウィンドウ設定 (Override)
        const winCheck = document.getElementById('node-win-override');
        const winGroup = document.getElementById('node-win-settings-group');
        const winTrans = document.getElementById('node-win-transparent');
        const winColor = document.getElementById('node-win-color');
        const winOp = document.getElementById('node-win-opacity');
        const winImg = document.getElementById('node-win-image');
        const winPos = document.getElementById('node-win-pos');

        // データ初期化
        if (!node.uiStyle) node.uiStyle = {}; 
        
        // 画像リスト更新 (背景画像を流用)
        populateAssetSelect(winImg, 'backgrounds', '(システム設定)'); 

        // 値セット
        winCheck.checked = !!node.uiStyle.override;
        winGroup.style.display = winCheck.checked ? 'block' : 'none';
        
        winTrans.checked = !!node.uiStyle.transparent;
        winColor.value = node.uiStyle.color || '#000000';
        winOp.value = (node.uiStyle.opacity !== undefined) ? node.uiStyle.opacity : 75;
        winImg.value = node.uiStyle.imageId || '';
        winPos.value = node.uiStyle.position || '';

        // イベント設定
        winCheck.onchange = (e) => {
            node.uiStyle.override = e.target.checked;
            winGroup.style.display = e.target.checked ? 'block' : 'none';
        };
        winTrans.onchange = (e) => node.uiStyle.transparent = e.target.checked;
        winColor.onchange = (e) => node.uiStyle.color = e.target.value;
        winOp.onchange = (e) => node.uiStyle.opacity = parseInt(e.target.value);
        winImg.onchange = (e) => node.uiStyle.imageId = e.target.value;
        winPos.onchange = (e) => node.uiStyle.position = e.target.value;

        // 7. 次のノード設定
        createLinkedSelects(document.getElementById('container-next-text'), 'node-next-text', node.nextNodeId);

    } 
    else if (node.type === 'choice') {
        // 1. 選択肢エディタ
        if (typeof renderChoicesEditor === 'function') renderChoicesEditor(node.choices || []);
        
       const btnCheck = document.getElementById('node-btn-override');
        const btnGroup = document.getElementById('node-btn-settings-group');
        const btnTrans = document.getElementById('node-btn-transparent');
        const btnColor = document.getElementById('node-btn-color');
        const btnOp = document.getElementById('node-btn-opacity');
        const btnTxtCol = document.getElementById('node-btn-text-color');
        const btnImg = document.getElementById('node-btn-image');
        const btnDir = document.getElementById('node-btn-dir'); // この要素の中身を書き換えます

        if (!node.uiStyle) node.uiStyle = {};
        
        populateAssetSelect(btnImg, 'backgrounds', '(システム設定)');

        // レイアウト選択肢の生成
        if (btnDir) {
            btnDir.innerHTML = '';
            const layouts = {
                '': '(システム設定に従う)',
                'center-v': '中央 (縦並び)',
                'center-h': '中央 (横並び)',
                'bottom-h': '📺 下部 (横一列)',
                'top-h': '📺 上部 (横一列)',
                'left-v': '⬅ 左端 (縦リスト)',
                'right-v': '➡ 右端 (縦リスト)',
                'grid-2': '田 グリッド (2列)',
                'grid-3': '罒 グリッド (3列)',
                'spread': '✥ 四隅・分散'
            };
            for (const key in layouts) {
                btnDir.add(new Option(layouts[key], key));
            }
            // 保存された値をセット（なければ空文字＝システム設定従属）
            btnDir.value = node.uiStyle.layout || node.uiStyle.direction || '';
        }

        // 値の適用
        btnCheck.checked = !!node.uiStyle.override;
        btnGroup.style.display = btnCheck.checked ? 'block' : 'none';
        
        btnTrans.checked = !!node.uiStyle.transparent;
        btnColor.value = node.uiStyle.color || '#1990ff';
        btnOp.value = (node.uiStyle.opacity !== undefined) ? node.uiStyle.opacity : 80;
        btnTxtCol.value = node.uiStyle.textColor || '#ffffff';
        btnImg.value = node.uiStyle.imageId || '';

        // イベントリスナー
        btnCheck.onchange = (e) => {
            node.uiStyle.override = e.target.checked;
            btnGroup.style.display = e.target.checked ? 'block' : 'none';
        };
        btnTrans.onchange = (e) => node.uiStyle.transparent = e.target.checked;
        btnColor.onchange = (e) => node.uiStyle.color = e.target.value;
        btnOp.onchange = (e) => node.uiStyle.opacity = parseInt(e.target.value);
        btnTxtCol.onchange = (e) => node.uiStyle.textColor = e.target.value;
        btnImg.onchange = (e) => node.uiStyle.imageId = e.target.value;
        
        // レイアウト変更時は 'layout' プロパティに保存
        btnDir.onchange = (e) => {
            node.uiStyle.layout = e.target.value;
            // 古い direction プロパティとの競合を避けるため削除しても良いが、上書きで対応
            delete node.uiStyle.direction; 
        };

    } 
    else if (node.type === 'variable') {
        // 変数操作
        if (!node.operations || node.operations.length === 0) {
            node.operations = [{ type: 'variable', targetVariable: '', operator: '=', value: '' }];
        }
        if (typeof renderVariableOperationsEditor === 'function') renderVariableOperationsEditor(node.operations);
        document.getElementById('add-variable-op-btn').onclick = () => {
            node.operations.push({ type: 'variable', targetVariable: '', operator: '=', value: '' });
            renderVariableOperationsEditor(node.operations);
        };
        createLinkedSelects(document.getElementById('container-next-variable'), 'node-next-variable', node.nextNodeId);

    } else if (node.type === 'wait') {
        // ★新機能: 待機(Wait)ノードの保存処理
        const elTime = document.getElementById('wait-time-seconds');
        if (elTime) {
            elTime.value = node.waitTime || 1.0;
            elTime.onchange = (e) => node.waitTime = parseFloat(e.target.value) || 1.0;
        }
        createLinkedSelects(document.getElementById('container-next-wait'), 'node-next-wait', node.nextNodeId);
        document.getElementById('container-next-wait').onchange = () => {
            const select = document.getElementById('node-next-wait');
            if (select) node.nextNodeId = select.value;
        };
    }
    else if (node.type === 'conditional') {
        // 条件分岐
        if (typeof renderConditionsEditor === 'function') renderConditionsEditor(node.conditions || []);
        createLinkedSelects(document.getElementById('container-next-conditional-else'), 'node-next-conditional-else', node.elseNextNodeId);

    } 
    else if (node.type === 'ui_control') {
        // UI操作
        if (!node.uiOperations) node.uiOperations = [];
        const addBtn = document.getElementById('add-ui-op-btn');
        addBtn.onclick = () => {
            node.uiOperations.push({ 
                type: 'crosshair', 
                switchVal: 'on',
                elemId: 'ui_' + Date.now() + '_' + Math.floor(Math.random() * 1000)
            });
            renderUIOperationsEditor(node.uiOperations);
        };
        if (typeof renderUIOperationsEditor === 'function') renderUIOperationsEditor(node.uiOperations);
        createLinkedSelects(document.getElementById('container-next-ui'), 'node-next-ui', node.nextNodeId);

    } 
    else if (node.type === 'map') {
        // マップ移動
        const dest = document.getElementById('node-map-dest');
        let spawn = document.getElementById('node-map-spawn');

        if (typeof updateMapSelect === 'function') updateMapSelect(dest);
        dest.value = node.mapId || '';

        // スポーンタイプ選択UIの生成（DOMの重複生成を防ぐ）
        const oldTypeUI = document.getElementById('map-spawn-type-ui');
        if (oldTypeUI) {
            // 既存のspawn selectを退避して古いUIを削除
            const parent = oldTypeUI.parentNode;
            const label = oldTypeUI.querySelector('label[for="node-map-spawn"]');
            const currentSpawn = document.getElementById('node-map-spawn');
            if (label) parent.appendChild(label);
            if (currentSpawn) parent.appendChild(currentSpawn);
            oldTypeUI.remove();
        }

        spawn = document.getElementById('node-map-spawn');

        const typeUI = document.createElement('div');
        typeUI.id = 'map-spawn-type-ui';
        typeUI.style.cssText = 'margin-top:10px; padding:10px; background:#f0f8ff; border-radius:4px;';

        if (!node.spawnType) node.spawnType = 'id';

        typeUI.innerHTML = `
            <label style="font-weight:bold; font-size:0.9em;">出現位置 (Spawn)</label>
            <div style="margin:5px 0 10px 0; display:flex; flex-direction:column; gap:5px;">
                <label style="cursor:pointer;"><input type="radio" name="spawnType" value="id" ${node.spawnType === 'id' ? 'checked' : ''}> 🚩 出現点IDを指定 (通常)</label>
                <label style="cursor:pointer;"><input type="radio" name="spawnType" value="coord" ${node.spawnType === 'coord' ? 'checked' : ''}> 📍 座標を直接指定</label>
                <label style="cursor:pointer;"><input type="radio" name="spawnType" value="none" ${node.spawnType === 'none' ? 'checked' : ''}> ⏭️ 指定なし (続きから再開)</label>
            </div>
            
            <div id="spawn-group-id" style="display:${node.spawnType === 'id' ? 'block' : 'none'}"></div>
            
            <div id="spawn-group-coord" style="display:${node.spawnType === 'coord' ? 'block' : 'none'}">
                <div style="display:flex; gap:10px; align-items:center;">
                    <div><label style="font-size:0.8em">Grid X</label><input type="number" id="node-spawn-x" value="${node.spawnX || 0}" style="width:60px"></div>
                    <div><label style="font-size:0.8em">Grid Y</label><input type="number" id="node-spawn-y" value="${node.spawnY || 0}" style="width:60px"></div>
                    <div><label style="font-size:0.8em">向き</label>
                        <select id="node-spawn-dir">
                            <option value="down">↓</option>
                            <option value="up">↑</option>
                            <option value="left">←</option>
                            <option value="right">→</option>
                        </select>
                    </div>
                </div>
            </div>

            <div id="spawn-group-none" style="display:${node.spawnType === 'none' ? 'block' : 'none'}; padding:10px; background:#e6f7ff; border:1px solid #1890ff; color:#0050b3; font-size:0.85em; border-radius:4px;">
                ℹ️ <b>再開モード (Resume):</b><br>
                同じマップに戻ってきた場合、<b>プレイヤーの位置・HP・倒した敵の状態などを維持</b>して再開します。<br>
                <span style="color:#666; font-size:0.9em;">※会話イベントやショップから戻る際に推奨です。</span>
            </div>
        `;
        // ▲▲▲ 修正ここまで ▲▲▲

        if (spawn && spawn.parentNode) {
            const label = spawn.parentNode.querySelector('label[for="node-map-spawn"]');
            spawn.parentNode.insertBefore(typeUI, spawn);
            const groupID = typeUI.querySelector('#spawn-group-id');
            if (label) groupID.appendChild(label);
            groupID.appendChild(spawn);
        }

        // イベント設定
        typeUI.querySelectorAll('input[name="spawnType"]').forEach(r => {
            r.addEventListener('change', (e) => {
                node.spawnType = e.target.value;
                typeUI.querySelector('#spawn-group-id').style.display = (node.spawnType === 'id' ? 'block' : 'none');
                typeUI.querySelector('#spawn-group-coord').style.display = (node.spawnType === 'coord' ? 'block' : 'none');
                
                // ★追加: noneの時の表示切り替え
                const noneGroup = typeUI.querySelector('#spawn-group-none');
                if(noneGroup) noneGroup.style.display = (node.spawnType === 'none' ? 'block' : 'none');
            });
        });

        const inpX = typeUI.querySelector('#node-spawn-x');
        const inpY = typeUI.querySelector('#node-spawn-y');
        const inpDir = typeUI.querySelector('#node-spawn-dir');

        if (inpX) inpX.onchange = (e) => node.spawnX = parseInt(e.target.value) || 0;
        if (inpY) inpY.onchange = (e) => node.spawnY = parseInt(e.target.value) || 0;
        if (inpDir) {
            inpDir.value = node.spawnDir || 'down';
            inpDir.onchange = (e) => node.spawnDir = e.target.value;
        }

        dest.onchange = () => {
            node.mapId = dest.value;
            if (typeof updateSpawnSelect === 'function') updateSpawnSelect(spawn, dest.value);
        };
        // 初期値反映
        if (typeof updateSpawnSelect === 'function') updateSpawnSelect(spawn, node.mapId);
        spawn.value = node.spawnId || '';
        spawn.onchange = (e) => node.spawnId = e.target.value;

    } 
    else if (node.type === 'shop') {
        // ショップ設定
        const currencyInput = document.getElementById('shop-currency-var');
        if (currencyInput) {
            currencyInput.value = node.currencyVar || 'money';
            currencyInput.onchange = (e) => node.currencyVar = e.target.value;
        }

        const bgSelect = document.getElementById('shop-background');
        const bgmSelect = document.getElementById('shop-bgm');
        if (bgSelect) {
            populateAssetSelect(bgSelect, 'backgrounds', '変更なし');
            bgSelect.value = node.backgroundId || '';
            bgSelect.onchange = (e) => node.backgroundId = e.target.value;
        }
        if (bgmSelect) {
            populateAssetSelect(bgmSelect, 'sounds', '変更なし');
            bgmSelect.value = node.bgmId || '';
            bgmSelect.onchange = (e) => node.bgmId = e.target.value;
        }

        if (!node.shopItems) node.shopItems = []; 
        const items = proj.items || {};
        const itemIds = Object.keys(items);
        
        const renderShopItems = () => {
            const container = document.getElementById('shop-item-list-container');
            if(!container) return;
            container.innerHTML = '';
            
            node.shopItems.forEach((currentItemId, index) => {
                const row = document.createElement('div');
                row.style.cssText = 'display:flex; gap:5px; align-items:center; background:#fff; padding:5px; margin-bottom:5px; border:1px solid #ddd; border-radius:3px;';
                
                const itemSelect = document.createElement('select');
                itemSelect.style.flex = '1';
                itemSelect.add(new Option('--- 商品を選択 ---', ''));

                if (itemIds.length === 0) {
                    const opt = new Option('(アイテムがありません)', '');
                    opt.disabled = true;
                    itemSelect.add(opt);
                } else {
                    if (currentItemId && !items[currentItemId]) {
                        const errOpt = new Option(`⚠ 削除済: ${currentItemId}`, currentItemId);
                        errOpt.style.color = 'red';
                        itemSelect.add(errOpt);
                    }
                    itemIds.forEach(id => {
                        const item = items[id];
                        const label = `${item.iconEmoji||'📦'} ${item.name} (💰${item.price||0})`;
                        itemSelect.add(new Option(label, id));
                    });
                }
                
                itemSelect.value = currentItemId || '';
                itemSelect.onchange = (e) => {
                    node.shopItems[index] = e.target.value;
                };
                
                const delBtn = document.createElement('button');
                delBtn.textContent = '×';
                delBtn.className = 'danger-button';
                delBtn.style.padding = '2px 8px';
                delBtn.onclick = () => {
                    node.shopItems.splice(index, 1);
                    renderShopItems();
                };
                
                row.append(itemSelect, delBtn);
                container.appendChild(row);
            });
        };
        
        const addBtn = document.getElementById('shop-add-item-btn');
        if (addBtn) {
            addBtn.style.width = '100%';
            addBtn.textContent = '＋ 商品枠を追加';
            addBtn.onclick = () => {
                if (itemIds.length === 0) {
                    alert("まずは「アイテム管理」タブでアイテムを作成してください！");
                    return;
                }
                node.shopItems.push('');
                renderShopItems();
            };
        }

        renderShopItems();
        createLinkedSelects(document.getElementById('container-next-shop'), 'node-next-shop', node.nextNodeId);
        
        // createLinkedSelects内でイベント発行されるが、念のため
        const nextSelect = document.getElementById('node-next-shop');
        if (nextSelect) {
            nextSelect.onchange = (e) => node.nextNodeId = e.target.value;
        }

    } 
    else if (node.type === 'battle') {
        // --- 敵リスト管理ロジック ---
        if (!node.enemyIds) node.enemyIds = [];
        
        // 旧データ互換: enemyIdがあれば配列に移して消す
        if (node.enemyId) {
            node.enemyIds.push(node.enemyId);
            delete node.enemyId;
        }

        const enemyListContainer = document.getElementById('battle-enemy-list-container');
        const addEnemyBtn = document.getElementById('battle-add-enemy-btn');
        
        const renderEnemyList = () => {
            enemyListContainer.innerHTML = '';
            const enemies = state.getProjectData().enemies || {};
            
            node.enemyIds.forEach((eid, index) => {
                const row = document.createElement('div');
                row.style.cssText = 'display:flex; align-items:center; gap:5px; margin-bottom:5px; background:#fff; padding:5px; border-radius:4px; border:1px solid #ddd;';
                
                const label = document.createElement('span');
                label.textContent = `#${index + 1}`;
                label.style.fontWeight = 'bold';
                label.style.color = '#c41d7f';
                label.style.width = '25px';

                const select = document.createElement('select');
                select.style.flex = '1';
                
                // 選択肢生成
                select.add(new Option('--- 選択してください ---', ''));
                Object.keys(enemies).forEach(id => {
                    const e = enemies[id];
                    select.add(new Option(`${e.name} (HP:${e.hp})`, id));
                });
                if (eid && !enemies[eid]) {
                    const err = new Option(`⚠ 削除済: ${eid}`, eid);
                    err.style.color = 'red';
                    select.add(err);
                }
                
                select.value = eid || '';
                select.onchange = (e) => {
                    node.enemyIds[index] = e.target.value;
                };

                const delBtn = document.createElement('button');
                delBtn.textContent = '×';
                delBtn.className = 'danger-button';
                delBtn.style.padding = '2px 8px';
                delBtn.onclick = () => {
                    node.enemyIds.splice(index, 1);
                    renderEnemyList();
                };

                row.append(label, select, delBtn);
                enemyListContainer.appendChild(row);
            });
        };

        // ボタンイベント
        // 重複登録を防ぐため、onclickを上書きする形にするか、あるいは初期化時のみ登録する工夫が必要ですが
        // renderNodeEditorは毎回呼ばれるため、ここでonclickを設定するのが安全です。
        if (addEnemyBtn) {
            addEnemyBtn.onclick = () => {
                if (node.enemyIds.length >= 5) {
                    alert("敵は最大5体までです。");
                    return;
                }
                node.enemyIds.push(''); // 空の枠を追加
                renderEnemyList();
            };
        }

        renderEnemyList();

        // UIテーマ
        const themeSel = document.getElementById('battle-theme');
        themeSel.value = node.battleTheme || 'dq';
        themeSel.onchange = (e) => node.battleTheme = e.target.value;

        // コマンド許可 (Checkbox Binding Helper)
        const bindCheck = (id, prop, def) => {
            const el = document.getElementById(id);
            if(el) {
                el.checked = (node[prop] !== undefined) ? node[prop] : def;
                el.onchange = (e) => node[prop] = e.target.checked;
            }
        };

        bindCheck('battle-can-attack', 'canAttack', true);
        bindCheck('battle-can-guard', 'canGuard', true);
        bindCheck('battle-can-dash', 'canDash', false);
        bindCheck('battle-can-jump', 'canJump', false);
        bindCheck('battle-can-item', 'canItem', true);
        bindCheck('battle-can-run', 'canEscape', true);
        bindCheck('battle-can-lockon', 'canLockon', true);
        bindCheck('battle-can-wait', 'canWait', true);

        // プレイヤー名上書き
        const nameInput = document.getElementById('battle-player-name-override');
        nameInput.value = node.playerNameOverride || '';
        nameInput.onchange = (e) => node.playerNameOverride = e.target.value;

        // 背景・BGM
        const bgSel = document.getElementById('battle-background');
        populateAssetSelect(bgSel, 'backgrounds', '変更なし');
        bgSel.value = node.backgroundId || '';
        bgSel.onchange = (e) => node.backgroundId = e.target.value;

        const bgmSel = document.getElementById('battle-bgm');
        populateAssetSelect(bgmSel, 'sounds', '変更なし');
        bgmSel.value = node.bgmId || '';
        bgmSel.onchange = (e) => node.bgmId = e.target.value;

        // 分岐設定
        createLinkedSelects(document.getElementById('container-next-battle-win'), 'node-next-win', node.nextWinNodeId);
        document.getElementById('container-next-battle-win').onchange = () => node.nextWinNodeId = document.getElementById('node-next-win').value;

        createLinkedSelects(document.getElementById('container-next-battle-run'), 'node-next-run', node.nextRunNodeId);
        document.getElementById('container-next-battle-run').onchange = () => node.nextRunNodeId = document.getElementById('node-next-run').value;

        createLinkedSelects(document.getElementById('container-next-battle-lose'), 'node-next-lose', node.nextLoseNodeId);
        document.getElementById('container-next-battle-lose').onchange = () => node.nextLoseNodeId = document.getElementById('node-next-lose').value;
    }
}


// --- The rest of the functions from ui.js ---
export function renderAll() {
    renderScenarioTree(); 
    
    // ★修正: renderNodeEditor() の代わりに updateAllNodeSelects() を呼ぶことで
    // ゲームオーバー設定などもまとめて更新されるようにする
    updateAllNodeSelects(); 
    
    renderVariablesList();
    renderAssetList('characters'); renderAssetList('backgrounds'); renderAssetList('sounds');
    renderAssetList('models'); renderAssetList('animations');
    updateAssetDropdowns();
    updateParticleSelects();
}

export function switchModeUI(newMode) {
    elements.navButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.mode === newMode));
    elements.modeContents.forEach(content => content.classList.toggle('active', content.id === 'mode-' + newMode));
}

function initHelpSystem() {
    if (elements.helpBtn && elements.helpModal && elements.closeHelpBtn) {
        elements.helpBtn.addEventListener('click', () => elements.helpModal.classList.remove('hidden'));
        elements.closeHelpBtn.addEventListener('click', () => elements.helpModal.classList.add('hidden'));
        window.addEventListener('click', (e) => { if (e.target === elements.helpModal) elements.helpModal.classList.add('hidden'); });
    }
}

export function updatePreview(forceStart = false) {
    const projectData = state.getProjectData();
    const activeNodeId = state.getActiveNodeId();
    
    // iframeの作成
    const iframe = document.createElement('iframe'); 
    iframe.style.width = '100%'; 
    iframe.style.height = '100%'; 
    iframe.style.border = 'none';
    
    let startNode = null;
    if (forceStart) {
        startNode = projectData.scenario.startNodeId;
    } else {
        startNode = activeNodeId || projectData.scenario.startNodeId;
    }

    // ★追加: それでも無ければ自動で探す
    if (!startNode) {
        for (const sId in projectData.scenario.sections) {
            const sec = projectData.scenario.sections[sId];
            const nodeIds = Object.keys(sec.nodes);
            if (nodeIds.length > 0) {
                startNode = nodeIds[0];
                projectData.scenario.startNodeId = startNode; // プロジェクトにも設定しておく
                break;
            }
        }
    }

    if (!startNode) { 
        elements.previewWindow.innerHTML = '<div style="color:white; padding:20px; text-align:center;">シナリオを作成してください。</div>'; 
        return; 
    }
    
    const gameHtml = generateGameHtml(projectData, startNode);
    const blob = new Blob([gameHtml], { type: 'text/html' });
    iframe.src = URL.createObjectURL(blob);
    
    elements.previewWindow.innerHTML = ''; 
    elements.previewWindow.appendChild(iframe);
}

export function clearPreview() {
    if (elements.previewWindow) {
        elements.previewWindow.innerHTML = '';
    }
}



export function renderScenarioTree() {
    const treeContainer = document.getElementById('scenario-tree');
    if (!treeContainer) return;
    treeContainer.innerHTML = '';

    const projectData = state.getProjectData();
    const activeId = state.getActiveNodeId();
    const activeSecId = state.getActiveSectionId(); // ★追加: 現在の章を取得

    Object.keys(projectData.scenario.sections).forEach(secId => {
        const sec = projectData.scenario.sections[secId];
        const nodeCount = Object.keys(sec.nodes).length; 

        const div = document.createElement('div');
        div.className = 'tree-section';
        if (secId === activeSecId) div.classList.add('active'); // ★追加: 選択中の章にクラスを付与
        
        
        // ヘッダー部分 (数字バッジを追加)
        const header = document.createElement('div');
        header.className = 'tree-section-header';
        header.dataset.id = secId;
        header.innerHTML = `
            <span>📁 ${sec.name}</span>
            <span class="node-count-badge" title="クリックでこの章を一括設定">${nodeCount}</span>
        `;

        const group = document.createElement('div');
        group.className = 'tree-nodes-group';
        
        if (sec.collapsed) {
            group.style.display = 'none';
        }

        // ノードを描画
        Object.keys(sec.nodes).forEach(nId => {
            const n = sec.nodes[nId];
            const nd = document.createElement('div');
            nd.className = 'tree-node ' + (nId === activeId ? 'active' : '');
            if (nId === projectData.scenario.startNodeId) nd.classList.add('start-node');
            nd.draggable = true;
            nd.dataset.id = nId;
            nd.dataset.type = n.type; // 色分け用

            // アイコンと要約
            let i = '📄'; 
            let s = n.type; 
            if(n.type === 'text'){
                i = '💬'; 
                const temp = document.createElement("div");
                temp.innerHTML = n.message || '';
                s = temp.textContent.replace(/\s+/g, ' ').trim().substring(0, 15) || '(空)';
            } else if(n.type === 'choice') { i = '🔀'; s = `選択肢 ${n.choices ? n.choices.length : 0}`; }
            else if(n.type === 'variable') { i = '🔢'; s = '変数操作'; }
            else if(n.type === 'conditional') { i = '❓'; s = '条件分岐'; }
            else if(n.type === 'ui_control') { i = '🖥️'; s = 'UI操作'; }
            else if(n.type === 'map') { i = '🗺️'; s = 'マップ移動'; }
            else if(n.type === 'shop') { i = '🛒'; s = 'ショップ'; }
            else if(n.type === 'input') { i = '⌨️'; s = 'テキスト入力'; }

            if (n.nodeLabel) {
                s = `<span style="color:#1890ff; font-weight:bold;">${n.nodeLabel}</span> <span style="color:#888; font-size:0.9em;">- ${s}</span>`;
            }
            
            nd.innerHTML = `<span class="node-icon">${i}</span><div class="node-info"><span class="node-summary">${s}</span><span class="node-id-sub">${nId.slice(-4)}</span></div>`;
            group.appendChild(nd);
        });

        div.appendChild(header);
        div.appendChild(group);
        treeContainer.appendChild(div);
    });
}

function updateMapSelect(el) { const m = state.getProjectData().maps; el.innerHTML = '<option value="">(選択)</option>'; if (m) for (const id in m) el.add(new Option(m[id].name, id)); }

function updateSpawnSelect(el, mid) { el.innerHTML = '<option value="">(初期位置)</option>'; const m = state.getProjectData().maps[mid]; if (m) m.objects.forEach(o => { if (o.isSpawn) el.add(new Option('🚩 ' + (o.spawnId || 'IDなし'), o.spawnId || '')); }); }

export function renderChoicesEditor(choices) {
    elements.choiceNode.editor.innerHTML = '';
    
    choices.forEach((c, i) => {
        const row = document.createElement('div');
        row.className = 'choice-editor-item';
        // レイアウト: テキスト | 動作 | 詳細設定(行き先orURL) | 削除
        row.style.gridTemplateColumns = '1fr 100px 1fr 30px'; 

        // 1. テキスト入力
        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.value = c.text || '';
        textInput.placeholder = '選択肢の文言';
        textInput.onchange = (e) => c.text = e.target.value;

        // 2. 動作タイプ選択
        const actionSelect = document.createElement('select');
        actionSelect.style.fontSize = '0.85em';
        actionSelect.add(new Option('🔗 移動', 'link'));
        actionSelect.add(new Option('📂 ロード', 'load'));
        actionSelect.add(new Option('💾 セーブ', 'save'));
        // ★追加
        actionSelect.add(new Option('🏠 タイトル', 'title'));
        actionSelect.add(new Option('🌐 リンク', 'url'));
        
        actionSelect.value = c.action || 'link';

        // 3. 詳細設定エリア (コンテナ)
        const detailContainer = document.createElement('div');
        detailContainer.style.position = 'relative';

        // A. 次のノード選択 (移動・セーブ用)
        const nextNodeDiv = document.createElement('div');
        nextNodeDiv.className = 'smart-select-mini';
        createLinkedSelects(nextNodeDiv, null, c.nextNodeId, { index: i, field: 'nextNodeId' });

        // B. URL入力欄 (リンク用)
        const urlInput = document.createElement('input');
        urlInput.type = 'text';
        urlInput.value = c.url || '';
        urlInput.placeholder = 'https://...';
        urlInput.style.cssText = 'width:100%; box-sizing:border-box; display:none;'; // 初期は非表示
        urlInput.onchange = (e) => c.url = e.target.value;

        detailContainer.append(nextNodeDiv, urlInput);
        
        // 4. 削除ボタン
        const delBtn = document.createElement('button');
        delBtn.textContent = '×';
        delBtn.className = 'danger-button';
        delBtn.style.padding = '0';
        delBtn.onclick = () => {
            choices.splice(i, 1);
            renderChoicesEditor(choices);
        };

        // --- 表示切り替えロジック ---
        const updateVisibility = () => {
            const mode = actionSelect.value;
            
            // ノード選択が必要なのは「移動」と「セーブ」のみ
            if (mode === 'link' || mode === 'save') {
                nextNodeDiv.style.display = 'block';
                urlInput.style.display = 'none';
            } 
            // URL入力が必要なのは「リンク」のみ
            else if (mode === 'url') {
                nextNodeDiv.style.display = 'none';
                urlInput.style.display = 'block';
            }
            // 「ロード」「タイトル」は設定不要
            else {
                nextNodeDiv.style.display = 'none';
                urlInput.style.display = 'none';
            }
        };

        actionSelect.onchange = (e) => {
            c.action = e.target.value;
            updateVisibility();
        };
        updateVisibility(); // 初回実行

        row.append(textInput, actionSelect, detailContainer, delBtn);
        elements.choiceNode.editor.appendChild(row);
    });
}

// ui.js

export function renderConditionsEditor(conds) {
    elements.conditionalNode.editor.innerHTML = '';
    
    if (!conds || conds.length === 0) {
        elements.conditionalNode.editor.innerHTML = '<div style="color:#888; padding:10px; text-align:center;">条件がありません。「＋ 条件を追加」ボタンを押してください。</div>';
        return;
    }

    // ★ご提示いただいたリストを使用
    const pStats = [
        // --- レベル・基本 ---
        { k: '$level', n: 'Lv (レベル)' },
        { k: '$exp', n: 'EXP (経験値)' },
        { k: '$nextExp', n: '次のLvまで' },
        { k: '$name', n: '名前' },

        // --- HP・リソース ---
        { k: '$hp', n: 'HP (現在)' },
        { k: '$maxHp', n: '最大HP' },
        { k: '$stamina', n: 'スタミナ' },
        { k: '$maxStamina', n: '最大スタミナ' },
        { k: '$magazine', n: '残弾数' },
        { k: '$maxMagazine', n: '装弾数' },

        // --- 戦闘ステータス ---
        { k: '$atk', n: '攻撃力' },
        { k: '$def', n: '防御力' },
        { k: '$spd', n: '移動速度' },
        { k: '$penetration', n: '貫通力' },
        { k: '$criticalRate', n: 'クリティカル率 (%)' },
        { k: '$criticalMultiplier', n: 'クリティカル倍率' },

        // --- アクション詳細 ---
        { k: '$jumpPower', n: 'ジャンプ力' },
        { k: '$attackRange', n: '攻撃射程' },
        { k: '$attackSize', n: '攻撃判定サイズ' },
        { k: '$attackCooldown', n: '攻撃クールダウン (F)' },
        { k: '$projectileSpeed', n: '弾速' },
        { k: '$blastRadius', n: '爆発範囲' },
        { k: '$blastDamageRate', n: '爆風倍率 (%)' },
        
        // --- 状態異常・特殊 ---
        { k: '$isExhausted', n: '疲労状態 (1=ON)' },
        { k: '$isLockedOn', n: 'ロックオン中 (1=ON)' },
        
        // --- 強制移動 ---
        { k: '$forceOn', n: '強制移動 (1=ON)' },
        { k: '$forceX', n: '移動先X (Grid)' },
        { k: '$forceY', n: '移動先Y (Grid)' },
        { k: '$forceSpd', n: '移動速度' }
    ];

    conds.forEach((c, i) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'condition-card';

        // 1. ヘッダー
        const header = document.createElement('div');
        header.className = 'cond-header';
        const title = document.createElement('span');
        title.innerHTML = `<b>条件 #${i + 1}</b> (IF)`;
        title.style.color = '#555';
        const delBtn = document.createElement('button');
        delBtn.textContent = '削除';
        delBtn.className = 'danger-button';
        delBtn.style.padding = '2px 10px';
        delBtn.style.fontSize = '0.85em';
        delBtn.onclick = () => { 
            conds.splice(i, 1); 
            renderConditionsEditor(conds); 
        };
        header.append(title, delBtn);

        // 2. 論理式エリア
        const logicRow = document.createElement('div');
        logicRow.className = 'cond-logic-row';

        // 変数セレクト
        const vSel = document.createElement('select');
        vSel.style.flex = '2';
        vSel.style.fontWeight = 'bold';
        vSel.dataset.field = 'variable'; 
        const projVars = state.getProjectData().variables || {};
        vSel.innerHTML = '<option value="">(変数を選択)</option>';
        
        // ゲーム変数
        if (Object.keys(projVars).length > 0) {
            const grpVar = document.createElement('optgroup');
            grpVar.label = "--- ゲーム変数 ---";
            Object.keys(projVars).forEach(k => grpVar.appendChild(new Option(k, k)));
            vSel.appendChild(grpVar);
        }

        // プレイヤー変数 (詳細版)
        const grpPlayer = document.createElement('optgroup');
        grpPlayer.label = "--- PLステータス ---";
        pStats.forEach(p => {
            grpPlayer.appendChild(new Option(`${p.k} : ${p.n}`, p.k));
        });
        vSel.appendChild(grpPlayer);
        
        vSel.value = c.variable || '';
        vSel.onchange = (e) => c.variable = e.target.value;

        // 演算子
        const opSel = document.createElement('select');
        opSel.style.flex = '1';
        opSel.style.minWidth = '60px';
        opSel.style.textAlign = 'center';
        ['==', '!=', '>', '<', '>=', '<='].forEach(op => opSel.add(new Option(op, op)));
        opSel.value = c.operator || '==';
        opSel.onchange = (e) => c.operator = e.target.value;

        // 値入力
        const valInp = document.createElement('input');
        valInp.type = 'text';
        valInp.style.flex = '1.5';
        valInp.placeholder = '値 / 変数';
        valInp.setAttribute('list', 'variable-list-options');
        valInp.value = c.compareValue || '';
        valInp.onchange = (e) => c.compareValue = e.target.value;

        logicRow.append(vSel, opSel, valInp);

        // 3. アクションエリア
        const actionRow = document.createElement('div');
        actionRow.className = 'cond-action-row';
        const actionLabel = document.createElement('div');
        actionLabel.innerHTML = '↳ <span style="font-size:0.9em; color:#666;">条件を満たした時の移動先:</span>';
        actionLabel.style.marginBottom = '4px';
        const nextDiv = document.createElement('div');
        nextDiv.className = 'smart-select-container';
        createLinkedSelects(nextDiv, `cond-next-${i}`, c.nextNodeId, { index: i, field: 'nextNodeId' });
        nextDiv.addEventListener('change', () => {
            const select = document.getElementById(`cond-next-${i}`);
            if (select) c.nextNodeId = select.value;
        });
        actionRow.append(actionLabel, nextDiv);

        wrapper.append(header, logicRow, actionRow);
        elements.conditionalNode.editor.appendChild(wrapper);
    });
    
    if (typeof updateVariableSelects === 'function') {
        updateVariableSelects();
    }
}
export function updateVariableSelects() {
    const v = state.getProjectData().variables;

    // 更新対象のIDリスト
    const targetIds = [
        'var-target', 
        'obj-cond-var',
        'shop-currency-var', 
        'ui-gauge-cur', 
        'ui-gauge-max',
        'obj-battle-hp', 'obj-battle-dmg',
        'obj-battle-def', 'obj-battle-pen', 'obj-battle-exp', // exp追加
        'player-init-hp', 'player-init-atk', 'player-init-spd',
        'player-init-atk-range', 'player-init-atk-size',
        'player-init-def', 'player-init-pen',
        'player-init-max-stamina', 'player-init-stamina-regen',
        'player-init-cooldown', 'player-init-proj-speed',
        'item-var-name'
    ];

    // ★ご提示いただいたリストを使用
    const pStats = [
        // --- レベル・基本 ---
        { k: '$level', n: 'Lv (レベル)' },
        { k: '$exp', n: 'EXP (経験値)' },
        { k: '$nextExp', n: '次のLvまで' },
        { k: '$name', n: '名前' },

        // --- HP・リソース ---
        { k: '$hp', n: 'HP (現在)' },
        { k: '$maxHp', n: '最大HP' },
        { k: '$stamina', n: 'スタミナ' },
        { k: '$maxStamina', n: '最大スタミナ' },
        { k: '$magazine', n: '残弾数' },
        { k: '$maxMagazine', n: '装弾数' },

        // --- 戦闘ステータス ---
        { k: '$atk', n: '攻撃力' },
        { k: '$def', n: '防御力' },
        { k: '$spd', n: '移動速度' },
        { k: '$penetration', n: '貫通力' },
        { k: '$criticalRate', n: 'クリティカル率 (%)' },
        { k: '$criticalMultiplier', n: 'クリティカル倍率' },

        // --- アクション詳細 ---
        { k: '$jumpPower', n: 'ジャンプ力' },
        { k: '$attackRange', n: '攻撃射程' },
        { k: '$attackSize', n: '攻撃判定サイズ' },
        { k: '$attackCooldown', n: '攻撃クールダウン (F)' },
        { k: '$projectileSpeed', n: '弾速' },
        { k: '$blastRadius', n: '爆発範囲' },
        { k: '$blastDamageRate', n: '爆風倍率 (%)' },
        
        // --- 状態異常・特殊 ---
        { k: '$isExhausted', n: '疲労状態 (1=ON)' },
        { k: '$isLockedOn', n: 'ロックオン中 (1=ON)' },
        
        // --- 強制移動 ---
        { k: '$forceOn', n: '強制移動 (1=ON)' },
        { k: '$forceX', n: '移動先X (Grid)' },
        { k: '$forceY', n: '移動先Y (Grid)' },
        { k: '$forceSpd', n: '移動速度' }
    ];

    // 1. datalist (入力補完) の更新
    const dataList = document.getElementById('variable-list-options');
    if (dataList) {
        dataList.innerHTML = '';
        Object.keys(v).forEach(n => { dataList.appendChild(new Option(n)); });
        pStats.forEach(p => { dataList.appendChild(new Option(p.k)); });
    }

    // 2. select 要素 (ドロップダウン) の更新
    document.querySelectorAll('select').forEach(sel => {
        if (!targetIds.includes(sel.id) && !sel.matches('[data-field="variable"]')) return;

        const currentVal = sel.value;
        sel.innerHTML = '<option value="">(選択)</option>';

        // A. 通常のゲーム変数
        if (Object.keys(v).length > 0) {
            const grpVar = document.createElement('optgroup');
            grpVar.label = "--- ゲーム変数 ---";
            Object.keys(v).forEach(n => {
                const meta = state.getProjectData().variableMeta?.[n];
                const label = meta && meta.comment ? `${n} (${meta.comment})` : n;
                grpVar.appendChild(new Option(label, n));
            });
            sel.appendChild(grpVar);
        }

        // B. プレイヤーステータス ($変数)
        const grpPlayer = document.createElement('optgroup');
        grpPlayer.label = "--- PLステータス ---";
        pStats.forEach(p => {
            grpPlayer.appendChild(new Option(`${p.k} : ${p.n}`, p.k));
        });
        sel.appendChild(grpPlayer);

        // C. 値を復元
        let found = false;
        Array.from(sel.options).forEach(opt => {
            if (opt.value === currentVal) found = true;
        });

        if (currentVal && !found) {
            const opt = new Option(`⚠ ${currentVal}`, currentVal);
            opt.style.color = 'red';
            sel.add(opt, 0); 
        }

        sel.value = currentVal;
    });
}

export function renderVariablesList() {
    const listContainer = document.getElementById('variables-list');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    const projectData = state.getProjectData();
    const vars = projectData.variables;
    const groups = projectData.variableGroups || ["基本 (Default)"];
    const meta = projectData.variableMeta || {};

    groups.forEach(groupName => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'var-group-container';
        
        // ヘッダー
        const header = document.createElement('div');
        header.className = 'var-group-header';
        
        const titleSpan = document.createElement('span');
        titleSpan.textContent = `📁 ${groupName}`;
        
        const delGroupBtn = document.createElement('button');
        delGroupBtn.textContent = '削除';
        delGroupBtn.className = 'danger-button';
        delGroupBtn.style.padding = '2px 8px';
        delGroupBtn.style.fontSize = '0.8em';
        delGroupBtn.dataset.groupName = groupName;
        
        if (groupName === "基本 (Default)") {
            delGroupBtn.style.display = 'none'; 
        }

        header.appendChild(titleSpan);
        header.appendChild(delGroupBtn);

        header.onclick = (e) => {
            if (e.target !== delGroupBtn) { 
                const content = header.nextElementSibling;
                content.style.display = (content.style.display === 'none') ? 'block' : 'none';
            }
        };

        // 中身
        const contentDiv = document.createElement('div');
        contentDiv.className = 'var-group-content';
        contentDiv.style.display = 'block';

        const varsInGroup = Object.keys(vars).filter(key => {
            const m = meta[key] || {};
            if (m.group) {
                return m.group === groupName;
            } else {
                return groupName === "基本 (Default)";
            }
        }).sort();

        if (varsInGroup.length === 0) {
            contentDiv.innerHTML = '<div style="padding:10px; color:#aaa; font-size:0.8em; text-align:center;">(変数なし)</div>';
        } else {
            varsInGroup.forEach(key => {
                const row = document.createElement('div');
                row.className = 'variable-row-new';
                const nameDiv = document.createElement('input');
                nameDiv.type = 'text';
                nameDiv.value = key;
                nameDiv.placeholder = '変数名 (変更可)';
                
                // style.css の input[type="text"] と同じ見た目を適用
                nameDiv.style.width = '100%';
                nameDiv.style.padding = '8px';
                nameDiv.style.border = '1px solid #d9d9d9'; // 他と同じ枠線
                nameDiv.style.borderRadius = '4px';
                nameDiv.style.boxSizing = 'border-box';
                nameDiv.style.fontSize = '14px';
                
                // 変数名らしさを出すためのフォントと色
                nameDiv.style.fontFamily = 'monospace';
                nameDiv.style.fontWeight = 'bold';
                nameDiv.style.color = '#333';
                nameDiv.style.backgroundColor = '#fff';
                
                nameDiv.title = 'ここを書き換えると変数名を一括変更できます';
                nameDiv.dataset.varName = key;
                nameDiv.dataset.fieldType = 'name';

                // 2. 値
                const valInput = document.createElement('input');
                valInput.type = 'text';
                valInput.value = vars[key];
                valInput.placeholder = '値';
                valInput.dataset.varName = key;

                // 3. 説明
                const descInput = document.createElement('input');
                descInput.type = 'text';
                descInput.value = (meta[key] && meta[key].comment) ? meta[key].comment : '';
                descInput.placeholder = 'メモ';
                descInput.style.color = '#666';
                descInput.dataset.varName = key;
                descInput.dataset.fieldType = 'comment';

                // 4. ★追加: グループ移動プルダウン
                const moveSelect = document.createElement('select');
                moveSelect.style.fontSize = '0.85em';
                moveSelect.dataset.varName = key;
                moveSelect.dataset.fieldType = 'group'; // グループ変更用
                
                groups.forEach(g => {
                    const opt = new Option(g, g);
                    moveSelect.add(opt);
                });
                moveSelect.value = groupName; // 現在のグループを選択状態に

                // 5. 削除ボタン
                const delBtn = document.createElement('button');
                delBtn.textContent = '×';
                delBtn.className = 'danger-button';
                delBtn.dataset.varName = key;

                row.append(nameDiv, valInput, descInput, moveSelect, delBtn);
                contentDiv.appendChild(row);
            });
        }

        groupDiv.appendChild(header);
        groupDiv.appendChild(contentDiv);
        listContainer.appendChild(groupDiv);
    });

    const addGroupSelect = document.getElementById('new-variable-group');
    if (addGroupSelect) {
        const currentVal = addGroupSelect.value;
        addGroupSelect.innerHTML = '';
        groups.forEach(g => {
            addGroupSelect.add(new Option(g, g));
        });
        if (groups.includes(currentVal)) {
            addGroupSelect.value = currentVal;
        }
    }
}


export function renderAssetList(type) {
    const list = document.getElementById(type.slice(0, -1) + '-list'); 
    if (!list) return; 
    list.innerHTML = '';
    
    const assets = state.getProjectData().assets[type]; 
    if (!assets) return;
    
    for (const id in assets) {
        const a = assets[id];
        const card = document.createElement('div'); 
        card.className = 'asset-card';

        let prev = '<img src="' + a.data + '">';
        if (type === 'models' || type === 'animations') {
            prev = '<div style="background:#eee;height:100px;display:flex;justify-content:center;align-items:center;font-size:30px;">📦</div>';
        } else if (a.data.startsWith('data:video')) {
            prev = '<video src="' + a.data + '" controls playsinline style="width:100%; height:140px; background:#000; object-fit:contain;"></video>';
        }
let settingsHtml = '';
        if (type === 'characters' || type === 'backgrounds') {
            const width = a.width || '?'; 
            const height = a.height || '?';
            
            // ★修正: アニメーションの範囲指定（開始コマ・終了コマ）の入力欄を追加
            settingsHtml = `
            <div class="anim-settings">
                <div style="font-size:0.8em; color:#666; margin-bottom:5px;">Size: ${width} x ${height} px</div>
                <div class="anim-row">
                    <label>列(Cols):</label><input type="number" value="${a.cols || 1}" min="1" class="asset-setting" data-id="${id}" data-type="${type}" data-setting="cols">
                    <label>行(Rows):</label><input type="number" value="${a.rows || 1}" min="1" class="asset-setting" data-id="${id}" data-type="${type}" data-setting="rows">
                </div>
                <div class="anim-row">
                    <label>FPS:</label><input type="number" value="${a.fps || 12}" min="1" class="asset-setting" data-id="${id}" data-type="${type}" data-setting="fps">
                    <label><input type="checkbox" ${a.loop !== false ? 'checked' : ''} class="asset-setting" data-id="${id}" data-type="${type}" data-setting="loop">Loop</label>
                </div>
                <div class="anim-row" style="border-top:1px dashed #ccc; padding-top:5px; margin-top:5px;">
                    <label title="0から始まるフレーム番号">開始コマ:</label>
                    <input type="number" value="${a.startFrame || 0}" min="0" class="asset-setting" data-id="${id}" data-type="${type}" data-setting="startFrame">
                    <label>終了コマ:</label>
                    <input type="number" value="${a.endFrame !== undefined ? a.endFrame : ((a.cols||1)*(a.rows||1)-1)}" min="0" class="asset-setting" data-id="${id}" data-type="${type}" data-setting="endFrame">
                </div>
            </div>`;
        }

        // inputに class="asset-name-input" を追加
        // 削除ボタンに class="asset-delete-btn" を追加
        card.innerHTML = prev + '<div class="asset-key">' + id + '</div>' +
            '<input type="text" value="' + a.name + '" data-id="' + id + '" data-type="' + type + '" class="asset-name-input">' +
            settingsHtml +
            '<button class="danger-button asset-delete-btn" data-id="' + id + '" data-type="' + type + '">削除</button>';
        
        list.appendChild(card);
    }

    // ★★★ ここから追加: 保存処理と削除処理 ★★★

    // 1. 名前変更の保存
    list.querySelectorAll('.asset-name-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const id = e.target.dataset.id;
            const type = e.target.dataset.type;
            if(state.getProjectData().assets[type][id]) {
                state.getProjectData().assets[type][id].name = e.target.value;
                updateAssetDropdowns(); // ドロップダウンの表示名も更新
            }
        });
    });

    // 2. アニメーション設定(Cols, Rows, FPS, Loop)の保存
    list.querySelectorAll('.asset-setting').forEach(input => {
        input.addEventListener('change', (e) => {
            const id = e.target.dataset.id;
            const type = e.target.dataset.type;
            const setting = e.target.dataset.setting;
            const val = (input.type === 'checkbox') ? input.checked : (parseInt(input.value) || 1);
            
            if(state.getProjectData().assets[type][id]) {
                state.getProjectData().assets[type][id][setting] = val;
            }
        });
    });

    // 3. 削除ボタンの動作
    list.querySelectorAll('.asset-delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            const type = e.target.dataset.type;
            if(confirm('本当に削除しますか？\n(使用している箇所がある場合、表示がおかしくなる可能性があります)')) {
                delete state.getProjectData().assets[type][id];
                renderAssetList(type);
                updateAssetDropdowns();
            }
        });
    });
}

export function updateAllNodeSelects() { 
    // ノードエディタ内のリスト更新
    renderNodeEditor(); 
    
    // ★追加: 共通ゲームオーバー設定のリストも更新
    updateGlobalGameoverSelect();
}

export function updateAssetDropdowns() {
    // 1. 背景画像 (Backgrounds)
    const bgSelects = [
        elements.textNode.background,
        elements.mapBgSelect,
        document.getElementById('shop-background'),
        // ★追加: 外側背景用のセレクトボックス
        document.getElementById('map-bg-outside-select') 
    ];

    bgSelects.forEach(select => {
        if (!select) return;
        const defaultText = (select === elements.mapBgSelect) ? 'なし' : '変更なし';
        populateAssetSelect(select, 'backgrounds', defaultText);
    });

    // 2. キャラクター画像 (Characters)
    if (elements.mapObjCharSelect) {
        populateAssetSelect(elements.mapObjCharSelect, 'characters', 'なし');
    }
    // ★追加: アイテムアイコン用
    const itemIconSelect = document.getElementById('item-icon-image');
    if (itemIconSelect) {
        populateAssetSelect(itemIconSelect, 'characters', 'なし (絵文字)');
    }

        const enemyImgIds = ['enemy-img-idle', 'enemy-img-move', 'enemy-img-attack', 'enemy-img-damage'];
    enemyImgIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) populateAssetSelect(el, 'characters', 'なし');
    });

    // 3. サウンド (Sounds)
    const soundSelects = [
        elements.textNode.bgm,
        elements.textNode.sound,
        document.getElementById('map-bgm-select'),   // マップBGM
        document.getElementById('shop-bgm'),         // ★追加: ショップBGM
        document.getElementById('item-effect-sound') // ★追加: アイテム効果音
    ];
    
    const projectData = state.getProjectData();
    const assets = projectData.assets.sounds;

    soundSelects.forEach(select => {
        if (!select) return;
        const currentVal = select.value;
        select.innerHTML = '';
        
        // デフォルト選択肢の出し分け
        if (select.id === 'item-effect-sound' || select.id === 'map-bgm-select') {
             select.add(new Option('なし', ''));
        } else {
             select.add(new Option('変更なし (維持)', ''));
             select.add(new Option('停止 (Stop)', 'stop'));
        }

        if (assets) { 
            for (const id in assets) { 
                select.add(new Option(assets[id].name, id)); 
            } 
        }
        // 値を復元（選択していたものが消えないように）
        select.value = currentVal;
    });
}


export function initUISettings() {
    const s = state.getProjectData().settings;
    if (!s) return;

    // PortraitUI初期化
    if (!s.portraitUI) {
        s.portraitUI = { windowVertical: 'bottom', windowHeight: 35, choiceDirection: 'vertical', choiceAlign: 'center', characterOffsetY: 0 };
    }

    // --- ヘルパー関数定義 ---
    const bindCheck = (id, k, obj = s) => {
        const el = document.getElementById(id);
        if (el) {
            el.checked = !!obj[k];
            el.onchange = e => obj[k] = e.target.checked;
        }
    };
    const bindColor = (id, k, obj = s) => {
        const el = document.getElementById(id);
        if (el) {
            el.value = obj[k];
            el.oninput = e => obj[k] = e.target.value;
        }
    };
    const bindRange = (id, lId, k, obj = s) => {
        const el = document.getElementById(id), l = document.getElementById(lId);
        if (el) {
            el.value = obj[k];
            if (l) l.textContent = obj[k] + '%';
            el.oninput = e => {
                const val = parseInt(e.target.value);
                obj[k] = val;
                if (l) l.textContent = val + '%';
            };
        }
    };
    const bindNum = (id, k, obj = s) => {
        const el = document.getElementById(id);
        if (el) {
            el.value = obj[k];
            el.onchange = e => obj[k] = parseInt(e.target.value) || 0;
        }
    };
    const bindSelect = (id, k, obj = s) => {
        const el = document.getElementById(id);
        if (el) {
            el.value = obj[k];
            el.onchange = e => obj[k] = e.target.value;
        }
    };
    const bindText = (id, k, obj = s) => {
        const el = document.getElementById(id);
        if (el) {
            el.value = obj[k] || '';
            el.onchange = e => obj[k] = e.target.value;
        }
    };
    const setupImg = (btnId, prevId, clearId, k) => {
        const btn = document.getElementById(btnId), prev = document.getElementById(prevId), clr = document.getElementById(clearId);
        if (!btn) return;
        const up = () => {
            if (s[k]) {
                prev.style.backgroundImage = 'url(' + s[k] + ')';
                prev.textContent = '';
                clr.style.display = 'inline-block';
            } else {
                prev.style.backgroundImage = 'none';
                prev.textContent = 'なし';
                clr.style.display = 'none';
            }
        };
        up();

        let inp = document.getElementById(btnId + '_hidden_input');
        if (!inp) {
            inp = document.createElement('input');
            inp.id = btnId + '_hidden_input';
            inp.type = 'file';
            inp.accept = '.webp'; 
            inp.accept = 'image/*';
            inp.style.display = 'none';
            document.body.appendChild(inp);
        }

        btn.onclick = () => inp.click();
        inp.onchange = e => {
            const f = e.target.files[0];
            if (f) {
                const r = new FileReader();
                r.onload = evt => { s[k] = evt.target.result; up(); };
                r.readAsDataURL(f);
                inp.value = '';
            }
        };
        clr.onclick = () => { s[k] = null; up(); };
    };

    // --- 1. ゲーム基本情報 (Meta) ---
    bindText('game-title', 'gameTitle');
   const copyInput = document.getElementById('game-copyright');
if (copyInput) {
    if (!s.gameCopyright) {
        const thisYear = new Date().getFullYear();
        s.gameCopyright = `© ${thisYear} `;
    }
    copyInput.value = s.gameCopyright;
    copyInput.onchange = e => s.gameCopyright = e.target.value;
}
    bindText('game-guideline', 'gameGuideline');
    setupImg('ui-title-bg-btn', 'ui-title-bg-preview', 'ui-title-bg-clear', 'titleImage');
    setupImg('ui-favicon-btn', 'ui-favicon-preview', 'ui-favicon-clear', 'favicon');

    // --- 2. メッセージウィンドウ設定 ---
    bindCheck('ui-window-bg-transparent', 'windowBgTransparent');
    bindColor('ui-window-color', 'windowColor');
    bindRange('ui-window-opacity', 'ui-window-opacity-label', 'windowOpacity');
    setupImg('ui-window-image-btn', 'ui-window-image-preview', 'ui-window-image-clear', 'windowImage');
    
    bindNum('ui-border-radius', 'borderRadius');
    bindNum('ui-border-width', 'borderWidth');
    bindColor('ui-border-color', 'borderColor');

    bindSelect('ui-portrait-win-pos', 'windowVertical', s.portraitUI);
    bindRange('ui-portrait-win-height', 'ui-portrait-win-height-label', 'windowHeight', s.portraitUI);

    // --- 3. 選択肢ボタン設定 ---
    bindCheck('ui-button-bg-transparent', 'buttonBgTransparent');
    bindColor('ui-button-color', 'buttonColor');
    bindRange('ui-button-opacity', 'ui-button-opacity-label', 'buttonOpacity');
    bindColor('ui-button-text-color', 'buttonTextColor');
    setupImg('ui-button-image-btn', 'ui-button-image-preview', 'ui-button-image-clear', 'buttonImage');
       const choiceLayoutSel = document.getElementById('ui-portrait-choice-dir');
    if (choiceLayoutSel) {
        choiceLayoutSel.innerHTML = ''; // 一旦クリア
        
        const layouts = {
            'center-v': '中央 (縦並び) [標準]',
            'center-h': '中央 (横並び)',
            'bottom-h': '📺 下部 (横一列)',
            'top-h': '📺 上部 (横一列)',
            'left-v': '⬅ 左端 (縦リスト)',
            'right-v': '➡ 右端 (縦リスト)',
            'grid-2': '田 グリッド (2列)',
            'grid-3': '罒 グリッド (3列)',
            'spread': '✥ 四隅・分散 (最大4つ)'
        };

        for (const key in layouts) {
            choiceLayoutSel.add(new Option(layouts[key], key));
        }

        // 初期値読み込み (データがない場合は center-v)
        choiceLayoutSel.value = s.portraitUI.choiceLayout || 'center-v';

        choiceLayoutSel.onchange = (e) => {
            s.portraitUI.choiceLayout = e.target.value;
        };
    }
    // --- 4. システムメニュー ---
    if (s.enableHideMsg === undefined) s.enableHideMsg = true;
    bindCheck('ui-enable-hide-msg', 'enableHideMsg');

    bindCheck('ui-show-save-menu', 'showSaveMenu');
    bindCheck('ui-show-item-btn', 'showItemBtn');
    bindCheck('ui-show-log-btn', 'showLogBtn');
    bindCheck('ui-show-auto-btn', 'showAutoBtn');
    bindCheck('ui-show-skip-btn', 'showSkipBtn');
    bindCheck('ui-show-config-btn', 'showConfigBtn');
    bindCheck('ui-show-pause-btn', 'showPauseBtn');
    bindCheck('ui-show-title-btn', 'showTitleBtn'); 

    // --- 5. 演出・その他 ---
    if (s.lowResMode === undefined) s.lowResMode = false;
    bindCheck('ui-low-res-mode', 'lowResMode');
    
    bindCheck('ui-auto-shake', 'autoShakeOnDamage');
    bindCheck('ui-show-popups', 'showPopups');
    bindCheck('ui-flash-item', 'flashOnItemUse');
    bindCheck('ui-flash-invincible', 'flashOnInvincible');
    
    // ★修正: backgroundFit が未定義なら cover をセット
    if (!s.backgroundFit) s.backgroundFit = 'cover';
    bindSelect('ui-bg-fit', 'backgroundFit');
    
    bindNum('ui-portrait-char-offset-y', 'characterOffsetY', s.portraitUI);

    // --- 6. デバッグ・ゲームオーバー ---
    if (s.debugMode === undefined) s.debugMode = false;
    if (s.shopDetailed === undefined) s.shopDetailed = true;
    bindCheck('ui-debug-mode', 'debugMode');
    bindCheck('ui-shop-detailed', 'shopDetailed');
    
    // 共通ゲームオーバー設定
        const globalGOContainer = document.getElementById('global-gameover-select-container');
    if (globalGOContainer) {
        // 常に最新のプロジェクトデータから読み込む
        createLinkedSelects(globalGOContainer, 'ui-global-gameover-node', state.getProjectData().settings.globalGameoverNodeId || '');
        
        // イベントリスナーの重複を防ぐため onchange を使用し、常に最新のデータへ保存する
        globalGOContainer.onchange = (e) => {
            const select = document.getElementById('ui-global-gameover-node');
            if (select) {
                state.getProjectData().settings.globalGameoverNodeId = select.value;
            }
        };
    }
    // --- 7. アクションボタン設定 ---
    const renderActionButtonsConfig = () => {
        const list = document.getElementById('action-buttons-list');
        if (!list) return;

        if (!s.actionButtons) s.actionButtons = [{ id: "btn_1", label: "ACT", key: "Space", type: "check", targetVar: "", itemId: "" }];
        list.innerHTML = '';

        const items = state.getProjectData().items || {};
        const types = {
            'check': '💬 調べる / 会話',
            'attack': '⚔️ 攻撃',
            'jump': '🦘 ジャンプ',
            'dash': '💨 ダッシュ (押下中)',
            'dodge': '💫 回避 / ステップ (短押し)', // ★追加
            'invincible': '🌟 無敵 (押下中)',
            'guard': '🛡️ ガード / パリィ',
            'lockon': '🎯 ロックオン (切替)',
            'toggle_view': '📷 視点切替 (FPS/TPS)',
            'use_item': '💊 アイテム使用 (固定)',
            'place_item': '🧱 アイテム配置 (固定)', 
            'assignable_item': '🔲 任意アイテム (メニューでセット)',
            'assignable_place': '🏗️ 任意アイテム配置 (スロット)', 
            'toggle_var': '🔄 変数切替 (0⇔1)',
            'add_var': '🔢 変数加算 (+1)',
            'custom': '🔧 カスタム (押下中=1)'
        };

        s.actionButtons.forEach((btn, index) => {
            if (!btn.type || !types[btn.type]) btn.type = 'check';

            const row = document.createElement('div');
            row.style.cssText = 'display:flex; flex-wrap:wrap; gap:10px; padding:10px; background:#f9f9f9; border:1px solid #eee; margin-bottom:10px; align-items:center; border-radius:4px;';

            const labelInput = document.createElement('input');
            labelInput.type = 'text'; labelInput.value = btn.label; labelInput.placeholder = '表示名'; labelInput.style.width = '60px';
            labelInput.onchange = (e) => btn.label = e.target.value;

            const keySelect = document.createElement('select');
            const keys = { 'Space': 'Space', 'Enter': 'Enter', 'KeyZ': 'Z', 'KeyX': 'X', 'KeyC': 'C', 'KeyV': 'V', 'ShiftLeft': 'Shift', 'ControlLeft': 'Ctrl', 'KeyQ': 'Q', 'KeyE': 'E', 'KeyR': 'R', 'KeyF': 'F' };
            for (const k in keys) keySelect.add(new Option(keys[k], k));
            keySelect.value = btn.key;
            keySelect.onchange = (e) => btn.key = e.target.value;

            // ★追加: ゲームパッド設定用のプルダウン
            const padSelect = document.createElement('select');
            padSelect.style.width = '100px';
            padSelect.add(new Option('Pad:なし', ''));
            padSelect.add(new Option('A/× (0)', 0));
            padSelect.add(new Option('B/○ (1)', 1));
            padSelect.add(new Option('X/□ (2)', 2));
            padSelect.add(new Option('Y/△ (3)', 3));
            padSelect.add(new Option('L1/LB (4)', 4));
            padSelect.add(new Option('R1/RB (5)', 5));
            padSelect.add(new Option('L2/LT (6)', 6));
            padSelect.add(new Option('R2/RT (7)', 7));
            padSelect.add(new Option('Select (8)', 8));
            padSelect.add(new Option('Start (9)', 9));
            // 初期値セット
            padSelect.value = btn.padBtn !== undefined ? btn.padBtn : '';
            padSelect.onchange = (e) => btn.padBtn = e.target.value !== '' ? parseInt(e.target.value) : '';

            const typeSelect = document.createElement('select');
            for (const t in types) typeSelect.add(new Option(types[t], t));
            typeSelect.value = btn.type;

            const varInput = document.createElement('input');
            varInput.type = 'text'; varInput.value = btn.targetVar || '';
            varInput.setAttribute('list', 'variable-list-options');
            varInput.style.flex = '1';
            varInput.onchange = (e) => btn.targetVar = e.target.value;

            const itemSelect = document.createElement('select');
            itemSelect.style.flex = '1';
            itemSelect.add(new Option('(アイテムを選択)', ''));
            Object.keys(items).forEach(id => {
                itemSelect.add(new Option(items[id].name, id));
            });
            itemSelect.value = btn.itemId || '';
            itemSelect.onchange = (e) => btn.itemId = e.target.value;

            const updateVisibility = () => {
                const t = typeSelect.value;
                if (['custom', 'toggle_var', 'add_var', 'assignable_item', 'assignable_place'].includes(t)) {
                    varInput.style.display = 'inline-block';
                    varInput.placeholder = (t.includes('assignable')) ? 'スロットID (例: slot_1)' : '対象の変数名';
                    itemSelect.style.display = 'none';
                } 
                else if (['use_item', 'place_item'].includes(t)) {
                    varInput.style.display = 'none';
                    itemSelect.style.display = 'inline-block';
                } else {
                    varInput.style.display = 'none';
                    itemSelect.style.display = 'none';
                }
            };
            updateVisibility();

            typeSelect.onchange = (e) => {
                btn.type = e.target.value;
                updateVisibility();
            };

            const delBtn = document.createElement('button');
            delBtn.className = 'danger-button'; delBtn.textContent = '×';
            delBtn.onclick = () => { s.actionButtons.splice(index, 1); renderActionButtonsConfig(); };

            row.append(document.createTextNode(`#${index + 1}: `), labelInput, keySelect, padSelect, typeSelect, varInput, itemSelect, delBtn);
            list.appendChild(row);
        });

        const addBtn = document.getElementById('add-action-btn');
        if (addBtn) {
            addBtn.style.display = (s.actionButtons.length >= 6) ? 'none' : 'block';
            addBtn.onclick = () => {
                const nextKey = ['Space', 'KeyZ', 'KeyX', 'KeyC', 'ShiftLeft', 'KeyV'][s.actionButtons.length] || 'Space';
                s.actionButtons.push({ id: `btn_${Date.now()}`, label: "BTN", key: nextKey, type: "check", targetVar: "", itemId: "" });
                renderActionButtonsConfig();
            };
        }
    };

    renderActionButtonsConfig();
}

export function initUi() {
    renderAll();
    initHelpSystem();
    initUISettings();
    initPlayerSettings();
    
    // プレビューのリスタートボタン設定
    const restartBtn = document.getElementById('preview-restart-btn');
    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            updatePreview(true); // true = 強制的にスタート地点から
        });
    }

    // ★★★ 追加: 数値入力欄をテキスト化し、計算式・ダイス入力を可能にする処理 ★★★
    // これにより、例えばHP欄に "10" だけでなく "1d6+5" や "$level * 10" と書けるようになります
    const flexibleInputs = [
        // アイテム編集
        { id: 'item-effect-hp', ph: '例: 50, 1d10, {{$maxHp}}' },
                { id: 'item-effect-hp-max', ph: '例: 10 (最大HP上昇)' },
        { id: 'item-effect-stamina-max', ph: '例: 20 (最大ST上昇)' },
        { id: 'item-effect-stamina', ph: '例: 20' },
        { id: 'item-effect-ammo', ph: '例: 10, 1d6' },
        { id: 'item-effect-atk', ph: '例: 5, {{$level}}' },
        { id: 'item-effect-def', ph: '例: 10' },
        { id: 'item-effect-spd', ph: '例: 0.5' },
        { id: 'item-effect-proj-speed', ph: '例: 5, 1d6 (弾速px)' },
            { id: 'item-effect-pen', ph: '例: 1, {{$level}}' },
    { id: 'item-effect-crit-rate', ph: '例: 5, {{$luk}}' },
    { id: 'item-effect-range', ph: '例: 32' },
    { id: 'item-effect-cooldown-reduce', ph: '例: 5 (速くなる)' },
        { id: 'item-effect-blast-radius', ph: '0=なし' },
        { id: 'item-effect-blast-rate', ph: '50' },
        
        // エネミー編集
        { id: 'enemy-hp', ph: '例: 10, 1d6+5' },
        { id: 'enemy-stamina', ph: '例: 100, 50 + {{$level}}*5' },
        { id: 'enemy-stamina-regen', ph: '例: 10' },
        { id: 'enemy-atk', ph: '例: 2, {{$difficulty}}' },
        { id: 'enemy-def', ph: '例: 0' },
        { id: 'enemy-spd', ph: '例: 2.0 (移動速度)' },
        
        { id: 'enemy-exp', ph: '例: 10 + {{$level}}' },
        { id: 'enemy-pen', ph: '例: 1' },
            { id: 'enemy-crit-rate', ph: '例: 5 (%)' },
    { id: 'enemy-crit-mult', ph: '例: 1.5 (倍率)' },
        { id: 'enemy-blast-radius', ph: '例: 64 (0=なし)' },
        { id: 'enemy-atk-range', ph: '例: 32' },
        { id: 'enemy-atk-cool', ph: '例: 60, {{$spd}}*10' },
        { id: 'enemy-atk-speed', ph: '例: 4 (0=近接)' },
        { id: 'enemy-homing-strength', ph: '例: 0.1 (0.05=緩, 0.2=強)' },

        // マップオブジェクト設定 (個別上書き用)
        { id: 'obj-battle-hp', ph: '例: 10' },
        // (obj-battle-stamina を削除)
        { id: 'obj-battle-dmg', ph: '例: 1' },
        // (obj-battle-exp もエネミー専用だったので削除)
        { id: 'obj-battle-def', ph: '例: 0' },
        // (obj-battle-pen を削除)
        // (obj-atk-range, cooldown, speed を削除)
        { id: 'obj-blast-radius', ph: '0=なし' },
        { id: 'obj-blast-rate', ph: '50' }
    ];

    flexibleInputs.forEach(conf => {
        const el = document.getElementById(conf.id);
        if (el) {
            // 値がリセットされるのを防ぐため一時退避
            const currentVal = el.value;
            
            // 既存の type="number" を type="text" に変更
            el.type = 'text';
            // スマホ等で計算式入力用に英数キーボードを出しやすくする
            el.inputMode = 'text';
            
            // 値を復元し、プレースホルダーと補完リストを設定
            el.value = currentVal;
            el.placeholder = conf.ph;
            el.setAttribute('list', 'variable-list-options');
        }
    });
}
export function initPlayerSettings() {
    const openBtn = document.getElementById('open-player-settings-btn');
    const saveBtn = document.getElementById('save-player-settings-btn');
    const modal = document.getElementById('player-settings-modal');
    
    // タブ切り替え関数
    window.switchPlayerTab = (e, tabId) => {
        document.querySelectorAll('.player-tab-content').forEach(el => el.style.display = 'none');
        const target = document.getElementById(tabId);
        if (target) target.style.display = 'block';
        
        document.querySelectorAll('#player-settings-modal .tab-btn').forEach(btn => {
            btn.classList.remove('active');
            btn.style.background = '#f5f5f5';
            btn.style.color = '#666';
            btn.style.borderBottom = '1px solid #ddd';
        });
        if (e && e.target) {
            e.target.classList.add('active');
            e.target.style.background = '#fff';
            e.target.style.color = '#1890ff';
            e.target.style.borderBottom = 'none';
        }
    };

    if (!openBtn || !saveBtn || !modal) return;

    openBtn.addEventListener('click', () => {
        const p = state.getProjectData().player;
        const container = document.getElementById('player-settings-container');
        if (!container) return;
        
        // 画面の設計図（HTML）を生成して流し込む
        container.innerHTML = `
            <!-- タブボタン -->
            <div style="margin-bottom:15px; border-bottom:1px solid #ddd; display:flex; gap:5px; padding-left:5px;">
                <button class="tab-btn active" onclick="switchPlayerTab(event, 'p-tab-basic')" style="padding:10px 15px; border:1px solid #ddd; border-bottom:none; background:#fff; cursor:pointer; border-radius:5px 5px 0 0; font-weight:bold; color:#1890ff;">📊 基本・成長</button>
                <button class="tab-btn" onclick="switchPlayerTab(event, 'p-tab-action')" style="padding:10px 15px; border:1px solid #ddd; border-bottom:1px solid #ddd; background:#f5f5f5; cursor:pointer; border-radius:5px 5px 0 0; color:#666;">⚔️ アクション</button>
                <button class="tab-btn" onclick="switchPlayerTab(event, 'p-tab-visual')" style="padding:10px 15px; border:1px solid #ddd; border-bottom:1px solid #ddd; background:#f5f5f5; cursor:pointer; border-radius:5px 5px 0 0; color:#666;">🎨 見た目</button>
            </div>

            <!-- ▼▼▼ 基本・成長タブ ▼▼▼ -->
            <div id="p-tab-basic" class="player-tab-content" style="display:block;">
                <div style="background:#f9f9f9; padding:12px; border-radius:6px; border:1px solid #ddd; margin-bottom:15px;">
                    <label style="font-weight:bold; display:block; margin-bottom:5px;">プレイヤー名 (変数: $name)</label>
                    <input type="text" id="p-name" value="${p.$name || '主人公'}" style="width:100%;">
                </div>
                
                <div style="background:#f0f8ff; padding:12px; border-radius:6px; margin-bottom:15px; border:1px solid #adc6ff;">
                    <label style="font-weight:bold; color:#0050b3;">📐 当たり判定サイズ (px)</label>
                    <div style="display:flex; gap:10px; margin-top:5px;">
                        <div style="flex:1"><label style="font-size:0.85em;">幅</label><input type="number" id="p-width" value="${p.width||32}" style="width:100%;"></div>
                        <div style="flex:1"><label style="font-size:0.85em;">高さ</label><input type="number" id="p-height" value="${p.height||32}" style="width:100%;"></div>
                    </div>
                </div>

                <div style="background:#fff; padding:12px; border-radius:6px; margin-bottom:15px; border:1px solid #ddd;">
                    <label style="font-weight:bold; border-bottom:1px solid #eee; padding-bottom:5px; display:block;">レベル・成長タイプ</label>
                    <div style="display:flex; gap:10px; margin-top:5px;">
                        <div style="flex:1"><label style="font-size:0.85em;">初期Lv</label><input type="number" id="p-init-level" value="${p.initialLevel||1}" min="1" style="width:100%;"></div>
                        <div style="flex:1"><label style="font-size:0.85em;">最大Lv</label><input type="number" id="p-max-level" value="${p.maxLevel||50}" min="1" style="width:100%;"></div>
                        <div style="flex:1.5"><label style="font-size:0.85em;">成長タイプ</label>
                            <select id="p-growth-type" style="width:100%;">
                                <option value="fast" ${p.growthType==='fast'?'selected':''}>早熟 (序盤速い)</option>
                                <option value="normal" ${p.growthType==='normal'?'selected':''}>普通 (平均的)</option>
                                <option value="slow" ${p.growthType==='slow'?'selected':''}>晩成 (後半伸びる)</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div style="background:#fff; padding:12px; border-radius:6px; border:1px solid #ddd;">
                    <label style="font-weight:bold; border-bottom:1px solid #eee; padding-bottom:5px; display:block; margin-bottom:10px;">ステータス成長 (Lv1 ➜ LvMax)</label>
                    <div style="display:grid; grid-template-columns: 80px 1fr 20px 1fr; gap:8px; align-items:center;">
                        <div style="color:#888; text-align:center; font-size:0.8em;">項目</div><div style="color:#888; text-align:center; font-size:0.8em;">初期値</div><div></div><div style="color:#888; text-align:center; font-size:0.8em;">最大値</div>
                        
                        <div>❤️ HP</div><input type="text" id="p-init-hp" value="${p.maxHp||10}" list="variable-list-options"><div style="text-align:center;">➜</div><input type="text" id="p-limit-hp" value="${p.limitHp||100}" list="variable-list-options">
                        <div>⚡ STA</div><input type="text" id="p-init-stamina" value="${p.maxStamina||100}" list="variable-list-options"><div style="text-align:center;">➜</div><input type="text" id="p-limit-stamina" value="${p.limitStamina||150}" list="variable-list-options">
                        <div>💧 ST回復</div><input type="text" id="p-init-stamina-regen" value="${p.staminaRegen||20}" list="variable-list-options"><div style="text-align:center;">➜</div><input type="text" id="p-limit-stamina-regen" value="${p.limitStaminaRegen||50}" list="variable-list-options">
                        <div>⚔️ ATK</div><input type="text" id="p-init-atk" value="${p.atk||1}" list="variable-list-options"><div style="text-align:center;">➜</div><input type="text" id="p-limit-atk" value="${p.limitAtk||10}" list="variable-list-options">
                        <div>🛡️ DEF</div><input type="text" id="p-init-def" value="${p.defense||0}" list="variable-list-options"><div style="text-align:center;">➜</div><input type="text" id="p-limit-def" value="${p.limitDef||10}" list="variable-list-options">
                        <div>🗡️ 貫通力</div><input type="text" id="p-init-pen" value="${p.penetration||1}" list="variable-list-options"><div style="text-align:center;">➜</div><input type="text" id="p-limit-pen" value="${p.limitPenetration||10}" list="variable-list-options">
                        <div>🦶 SPD</div><input type="text" id="p-init-spd" value="${p.spd||1.0}" list="variable-list-options"><div style="text-align:center;">➜</div><input type="text" id="p-limit-spd" value="${p.limitSpd||1.5}" list="variable-list-options">
                    </div>
                </div>
            </div>

            <!-- ▼▼▼ アクションタブ ▼▼▼ -->
            <div id="p-tab-action" class="player-tab-content" style="display:none;">
                
                <!-- 移動・ジャンプ設定 -->
                <div style="background:#f6ffed; padding:12px; border-radius:6px; border:1px solid #b7eb8f; margin-bottom:15px;">
                    <label style="font-weight:bold; color:#389e0d; display:block; margin-bottom:10px;">🏃 移動・ジャンプ設定</label>
                    <div style="display:flex; gap:10px; align-items:center;">
                        <div style="flex:1"><label style="font-size:0.85em;">基本ジャンプ力</label><input type="text" id="p-jump-power" value="${p.jumpPower||8.0}" list="variable-list-options" style="width:100%;"></div>
                        <div style="flex:1"><label style="font-size:0.85em;">追加ジャンプ回数(2段等)</label><input type="number" id="p-extra-jumps" value="${p.extraJumps||0}" min="0" style="width:100%;"></div>
                    </div>
                    <div style="margin-top:10px; padding-top:10px; border-top:1px dashed #b7eb8f;">
                        <label class="checkbox-label" style="cursor:pointer;">
                            <input type="checkbox" id="p-wall-jump" ${p.wallJump?'checked':''}> <span style="font-weight:bold; color:#389e0d;">🧗 壁蹴り(Wall Jump) を有効にする</span>
                        </label>
                    </div>
                </div>

                <!-- 攻撃パラメータ -->
                <div style="background:#fff0f6; padding:12px; border-radius:6px; border:1px solid #ffadd2; margin-bottom:15px;">
                    <label style="font-weight:bold; color:#c41d7f; display:block; margin-bottom:10px;">⚔️ 攻撃アクション設定</label>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size:0.9em;">
                        <div><label>射程 (Range)</label><input type="text" id="p-range" value="${p.attackRange||32}" list="variable-list-options" style="width:100%;"></div>
                        <div><label>攻撃サイズ</label><input type="text" id="p-size" value="${p.attackSize||32}" list="variable-list-options" style="width:100%;"></div>
                        <div><label>硬直F (Cooldown)</label><input type="text" id="p-cooldown" value="${p.attackCooldown||20}" list="variable-list-options" style="width:100%;"></div>
                        <div><label>弾速 (0=近接)</label><input type="text" id="p-proj-speed" value="${p.projectileSpeed||0}" list="variable-list-options" style="width:100%;"></div>
                        <div><label>クリティカル率(%)</label><input type="text" id="p-crit-rate" value="${p.criticalRate||5}" list="variable-list-options" style="width:100%;"></div>
                        <div><label>クリティカル倍率</label><input type="text" id="p-crit-mult" value="${p.criticalMultiplier||2.0}" list="variable-list-options" style="width:100%;"></div>
                    </div>
                    <div style="margin-top:10px; padding-top:10px; border-top:1px dashed #ffadd2; display:flex; gap:10px;">
                        <div style="flex:1"><label style="color:#c41d7f;">💥 爆発範囲 (px)</label><input type="text" id="p-blast-radius" value="${p.blastRadius||0}" list="variable-list-options" style="width:100%;"></div>
                        <div style="flex:1"><label style="color:#c41d7f;">爆風倍率 (%)</label><input type="text" id="p-blast-rate" value="${p.blastDamageRate||50}" list="variable-list-options" style="width:100%;"></div>
                    </div>
                </div>
                
                <!-- 弾薬設定 -->
                <div style="background:#e6f7ff; padding:12px; border-radius:6px; border:1px solid #91d5ff; margin-bottom:15px;">
                    <label class="checkbox-label" style="font-weight:bold; color:#0050b3; margin-bottom:10px;">
                        <input type="checkbox" id="p-use-magazine" ${p.useMagazine?'checked':''}> 弾数制限 (リロード) を有効化
                    </label>
                    <div style="display:flex; gap:10px; padding-left:20px;">
                        <div style="flex:1"><label style="font-size:0.85em;">装弾数</label><input type="text" id="p-mag-size" value="${p.magazineSize||30}" list="variable-list-options" style="width:100%;"></div>
                        <div style="flex:1"><label style="font-size:0.85em;">リロード時間(秒)</label><input type="text" id="p-reload-time" value="${p.reloadTime||2.0}" list="variable-list-options" style="width:100%;"></div>
                    </div>
                </div>

                <!-- スタミナ消費 -->
                <div style="background:#fff; padding:12px; border:1px solid #ddd; border-radius:6px; margin-bottom:15px;">
                    <label style="font-weight:bold; border-bottom:1px solid #eee; padding-bottom:5px; display:block; margin-bottom:10px;">⚡ アクション消費コスト</label>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; font-size:0.9em;">
                        <div style="display:flex; justify-content:space-between; background:#f9f9f9; padding:5px; border:1px solid #eee;"><label class="checkbox-label"><input type="checkbox" id="p-dash-consume" ${p.dashConsume?'checked':''}>ダッシュ(/F)</label><input type="text" id="p-dash-cost" value="${p.dashCost||0.5}" style="width:40px;"></div>
                        <div style="display:flex; justify-content:space-between; background:#f9f9f9; padding:5px; border:1px solid #eee;"><label class="checkbox-label"><input type="checkbox" id="p-jump-consume" ${p.jumpConsume?'checked':''}>ジャンプ(回)</label><input type="text" id="p-jump-cost" value="${p.jumpCost||10}" style="width:40px;"></div>
                        <div style="display:flex; justify-content:space-between; background:#f9f9f9; padding:5px; border:1px solid #eee;"><label class="checkbox-label"><input type="checkbox" id="p-atk-consume" ${p.attackConsume?'checked':''}>攻撃(回)</label><input type="text" id="p-atk-cost" value="${p.attackCost||20}" style="width:40px;"></div>
                        <div style="display:flex; justify-content:space-between; background:#f9f9f9; padding:5px; border:1px solid #eee;"><label class="checkbox-label"><input type="checkbox" id="p-guard-consume" ${p.guardConsume?'checked':''}>ガード維持(/F)</label><input type="text" id="p-guard-cost" value="${p.guardCost||0.5}" style="width:40px;"></div>
                        <div style="display:flex; justify-content:space-between; background:#e6f7ff; padding:5px; border:1px solid #91d5ff;"><label class="checkbox-label"><input type="checkbox" id="p-dodge-consume" ${p.dodgeConsume!==false?'checked':''}>回避(回)</label><input type="text" id="p-dodge-cost" value="${p.dodgeCost||15}" style="width:40px;"></div>
                        <div style="display:flex; justify-content:space-between; background:#f9f9f9; padding:5px; border:1px solid #eee;"><label class="checkbox-label"><input type="checkbox" id="p-invincible-consume" ${p.invincibleConsume?'checked':''}>無敵(/F)</label><input type="text" id="p-invincible-cost" value="${p.invincibleCost||1.0}" style="width:40px;"></div>
                    </div>
                    
                    <div style="margin-top:10px; padding-top:10px; border-top:1px dashed #ccc; display:flex; gap:10px;">
                        <div style="flex:1; background:#fffbe6; padding:8px; border:1px solid #ffe58f; border-radius:4px;">
                            <label style="color:#d46b08; font-weight:bold; font-size:0.85em;">🛡️ ガード受け被ダメ変換倍率</label>
                            <input type="text" id="p-guard-st-mult" value="${p.guardStaminaMult||2.0}" style="width:100%; margin-top:5px;">
                        </div>
                        <div style="flex:1; background:#f0f5ff; padding:8px; border:1px solid #adc6ff; border-radius:4px;">
                            <label style="color:#0050b3; font-weight:bold; font-size:0.85em;">💫 回避 無敵(F) / 速度</label>
                            <div style="display:flex; gap:5px; margin-top:5px;">
                                <input type="text" id="p-dodge-inv" value="${p.dodgeInvincible||20}" style="flex:1;">
                                <input type="text" id="p-dodge-spd" value="${p.dodgeSpeed||3.0}" style="flex:1;">
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 疲労設定 -->
                <div style="background:#fff1f0; padding:12px; border:1px solid #ffa39e; border-radius:6px;">
                    <label style="font-weight:bold; color:#cf1322; display:block; margin-bottom:10px;">😫 疲労ペナルティ (スタミナ切れ時)</label>
                    <div style="display:flex; flex-wrap:wrap; gap:10px; margin-bottom:10px; font-size:0.85em;">
                        <label class="checkbox-label"><input type="checkbox" id="p-ex-no-action" ${p.exhaustionNoAction?'checked':''}> アクション不可</label>
                        <label class="checkbox-label"><input type="checkbox" id="p-ex-no-item" ${p.exhaustionNoItem?'checked':''}> アイテム不可</label>
                        <label class="checkbox-label"><input type="checkbox" id="p-ex-dmg-double" ${p.exhaustionDmgDouble?'checked':''}> 被ダメージ2倍</label>
                        <label class="checkbox-label"><input type="checkbox" id="p-ex-crit" ${p.exhaustionCrit?'checked':''}> 被弾時確定クリティカル</label>
                    </div>
                    <div style="display:flex; gap:10px; align-items:center;">
                        <div style="flex:1"><label style="font-size:0.85em;">継続時間(秒)</label><input type="number" id="p-ex-duration" value="${p.exhaustionDuration||3.0}" step="0.1" style="width:100%;"></div>
                        <div style="flex:1"><label style="font-size:0.85em;">移動制限</label>
                            <select id="p-ex-move" style="width:100%;">
                                <option value="normal" ${p.exhaustionMove==='normal'?'selected':''}>通常</option>
                                <option value="slow" ${p.exhaustionMove==='slow'?'selected':''}>歩行のみ</option>
                                <option value="stop" ${p.exhaustionMove==='stop'?'selected':''}>移動不可</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ▼▼▼ 見た目タブ ▼▼▼ -->
            <div id="p-tab-visual" class="player-tab-content" style="display:none;">
                <div class="form-group" style="margin-bottom:15px;">
                    <label style="font-weight:bold; display:block; margin-bottom:5px;">頭上のステータスバー表示</label>
                    <select id="p-overhead-type" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;">
                        <option value="none" ${p.overheadType==='none'?'selected':''}>なし (非表示)</option>
                        <option value="hp" ${p.overheadType==='hp'?'selected':''}>HPのみ</option>
                        <option value="stamina" ${p.overheadType==='stamina'?'selected':''}>スタミナのみ</option>
                        <option value="both" ${p.overheadType==='both'?'selected':''}>HPとスタミナ両方</option>
                    </select>
                </div>
                
                <hr style="margin:15px 0; border:0; border-top:1px dashed #ccc;">
                
                <div class="form-group" style="margin-bottom:15px;">
                    <label style="font-weight:bold; display:block; margin-bottom:5px;">使用する3Dモデル</label>
                    <select id="p-model-id" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;"></select>
                    <p style="font-size:0.8em; color:#666; margin-top:2px;">※未選択の場合は2D画像モードになります。</p>
                </div>

                <div id="p-settings-2d-group" style="background:#f9f9f9; padding:15px; border-radius:6px; border:1px solid #ddd;">
                    <div style="font-weight:bold; margin-bottom:10px; color:#555;">2D画像設定</div>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                        <div><label style="font-size:0.85em;">待機</label><select id="p-img-idle" style="width:100%;"></select></div>
                        <div><label style="font-size:0.85em;">移動</label><select id="p-img-move" style="width:100%;"></select></div>
                        <div><label style="font-size:0.85em;">攻撃</label><select id="p-img-attack" style="width:100%;"></select></div>
                        <div><label style="font-size:0.85em;">被弾</label><select id="p-img-damage" style="width:100%;"></select></div>
                    </div>
                </div>

                <div id="p-settings-3d-group" style="display:none; background:#e6f7ff; padding:15px; border-radius:6px; border:1px solid #91d5ff;">
                    <div style="font-weight:bold; margin-bottom:10px; color:#0050b3;">3Dアニメーション</div>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                        <div><label style="font-size:0.85em;">待機</label><select id="p-anim-idle" style="width:100%;"></select></div>
                        <div><label style="font-size:0.85em;">移動</label><select id="p-anim-move" style="width:100%;"></select></div>
                        <div><label style="font-size:0.85em;">攻撃</label><select id="p-anim-attack" style="width:100%;"></select></div>
                        <div><label style="font-size:0.85em;">被弾</label><select id="p-anim-damage" style="width:100%;"></select></div>
                        <div style="grid-column: span 2;"><label style="font-size:0.85em;">ジャンプ</label><select id="p-anim-jump" style="width:100%;"></select></div>
                    </div>
                </div>
            </div>
        `; // ← innerHTML の代入ここまで

        // --- セレクトボックスの設定 (HTML生成後に実行) ---
        const setupSel = (id, type, val) => { 
            const el = document.getElementById(id); 
            if(el){ 
                // exportされている populateAssetSelect を使用
                populateAssetSelect(el, type, 'なし'); 
                el.value = val||''; 
            }
        };

        const modelSel = document.getElementById('p-model-id');
        if (modelSel) {
            setupSel('p-model-id', 'models', p.modelId);
            const toggleGroups = () => {
                const is3D = !!modelSel.value;
                document.getElementById('p-settings-2d-group').style.display = is3D ? 'none' : 'block';
                document.getElementById('p-settings-3d-group').style.display = is3D ? 'block' : 'none';
            };
            modelSel.addEventListener('change', toggleGroups);
            toggleGroups();
        }

        setupSel('p-img-idle', 'characters', p.imageId); setupSel('p-img-move', 'characters', p.imageIdMove);
        setupSel('p-img-attack', 'characters', p.imageIdAttack); setupSel('p-img-damage', 'characters', p.imageIdDamage);
        setupSel('p-anim-idle', 'animations', p.animIdIdle); setupSel('p-anim-move', 'animations', p.animIdMove);
        setupSel('p-anim-attack', 'animations', p.animIdAttack); setupSel('p-anim-damage', 'animations', p.animIdDamage);
        setupSel('p-anim-jump', 'animations', p.animIdJump);

        modal.classList.remove('hidden');
    });

    // --- 保存ボタンの処理 ---
    saveBtn.addEventListener('click', () => {
        const p = state.getProjectData().player;

        const getRaw = (id, def='') => { const el=document.getElementById(id); return el ? el.value : def; };
        const getChk = (id) => { const el=document.getElementById(id); return el ? el.checked : false; };

        // 1. 基本・成長
        p.$name = getRaw('p-name', '主人公');
        p.width = getRaw('p-width', '32');
        p.height = getRaw('p-height', '32');

        p.initialLevel = getRaw('p-init-level', '1');
        p.maxLevel = getRaw('p-max-level', '50');
        p.growthType = getRaw('p-growth-type', 'normal');

        p.maxHp = getRaw('p-init-hp', '10');
        p.limitHp = getRaw('p-limit-hp', '100');
        p.maxStamina = getRaw('p-init-stamina', '100'); 
        p.limitStamina = getRaw('p-limit-stamina', '150');
        p.staminaRegen = getRaw('p-init-stamina-regen', '20');
        p.limitStaminaRegen = getRaw('p-limit-stamina-regen', '50');
        p.atk = getRaw('p-init-atk', '1');
        p.limitAtk = getRaw('p-limit-atk', '10');
        p.def = getRaw('p-init-def', '0');
        p.limitDef = getRaw('p-limit-def', '10');
        p.penetration = getRaw('p-init-pen', '1');
        p.limitPenetration = getRaw('p-limit-pen', '10');
        p.spd = getRaw('p-init-spd', '1.0');
        p.limitSpd = getRaw('p-limit-spd', '6');

        p.$maxHp = p.maxHp; p.$hp = p.maxHp; 
        p.$atk = p.atk; p.$def = p.def; p.$spd = p.spd;
        p.$maxStamina = p.maxStamina; p.$stamina = p.maxStamina;

        // 2. アクション
        p.jumpPower = getRaw('p-jump-power', '8.0');
        p.extraJumps = parseInt(getRaw('p-extra-jumps', '0')) || 0;
        p.wallJump = getChk('p-wall-jump');

        p.attackRange = getRaw('p-range', '32');
        p.attackSize = getRaw('p-size', '32');
        p.attackCooldown = getRaw('p-cooldown', '20');
        p.projectileSpeed = getRaw('p-proj-speed', '0');
        p.criticalRate = getRaw('p-crit-rate', '5');
        p.criticalMultiplier = getRaw('p-crit-mult', '2.0');
        p.blastRadius = getRaw('p-blast-radius', '0');
        p.blastDamageRate = getRaw('p-blast-rate', '50');

        p.useMagazine = getChk('p-use-magazine');
        p.magazineSize = getRaw('p-mag-size', '30');
        p.$maxMagazine = p.magazineSize;
        p.reloadTime = getRaw('p-reload-time', '2.0');

        p.dashConsume = getChk('p-dash-consume'); 
        p.dashCost = getRaw('p-dash-cost', '0.5');
        p.jumpConsume = getChk('p-jump-consume'); 
        p.jumpCost = getRaw('p-jump-cost', '10');
        p.attackConsume = getChk('p-atk-consume'); 
        p.attackCost = getRaw('p-atk-cost', '20');
        p.guardConsume = getChk('p-guard-consume'); 
        p.guardCost = getRaw('p-guard-cost', '0.5');
        p.dodgeConsume = getChk('p-dodge-consume');
        p.dodgeCost = getRaw('p-dodge-cost', '15');
        p.invincibleConsume = getChk('p-invincible-consume'); 
        p.invincibleCost = getRaw('p-invincible-cost', '1.0');

        p.guardStaminaMult = getRaw('p-guard-st-mult', '2.0');
        p.dodgeInvincible = getRaw('p-dodge-inv', '20');
        p.dodgeSpeed = getRaw('p-dodge-spd', '3.0');

        p.exhaustionDuration = getRaw('p-ex-duration', '3.0');
        p.exhaustionMove = getRaw('p-ex-move', 'normal');
        p.exhaustionNoAction = getChk('p-ex-no-action');
        p.exhaustionNoItem = getChk('p-ex-no-item');
        p.exhaustionDmgDouble = getChk('p-ex-dmg-double');
        p.exhaustionCrit = getChk('p-ex-crit');

        // 3. 見た目
        p.overheadType = getRaw('p-overhead-type', 'none');
        p.modelId = getRaw('p-model-id', '');
        
        p.imageId = getRaw('p-img-idle');
        p.imageIdMove = getRaw('p-img-move');
        p.imageIdAttack = getRaw('p-img-attack');
        p.imageIdDamage = getRaw('p-img-damage');
        
        p.animIdIdle = getRaw('p-anim-idle');
        p.animIdMove = getRaw('p-anim-move');
        p.animIdAttack = getRaw('p-anim-attack');
        p.animIdDamage = getRaw('p-anim-damage');
        p.animIdJump = getRaw('p-anim-jump');

        modal.classList.add('hidden');
        alert('プレイヤー設定を保存しました。');
    });
}
function updateUIIdDatalist() {
    const projectData = state.getProjectData();
    const ids = new Set(); // 重複排除のためSetを使用

    // 全セクション・全ノードを走査
    for (const secId in projectData.scenario.sections) {
        const section = projectData.scenario.sections[secId];
        for (const nodeId in section.nodes) {
            const node = section.nodes[nodeId];
            if (node.type === 'ui_control' && node.uiOperations) {
                node.uiOperations.forEach(op => {
                    // IDを定義している操作 (text, gauge) からIDを収集
                    if ((op.type === 'text' || op.type === 'gauge') && op.elemId) {
                        ids.add(op.elemId);
                    }
                });
            }
        }
    }

    // datalistを更新
    const dataList = document.getElementById('ui-id-list-options');
    if (dataList) {
        dataList.innerHTML = '';
        ids.forEach(id => {
            const opt = document.createElement('option');
            opt.value = id;
            dataList.appendChild(opt);
        });
    }
}

export function highlightActiveNode() {
    const activeId = state.getActiveNodeId();
    const activeSecId = state.getActiveSectionId(); // ★追加: 現在の章を取得

    // ノードのハイライト
    document.querySelectorAll('.tree-node').forEach(el => {
        if (el.dataset.id === activeId) el.classList.add('active');
        else el.classList.remove('active');
    });

    // ★追加: 章(セクション)のハイライト
    document.querySelectorAll('.tree-section').forEach(el => {
        const header = el.querySelector('.tree-section-header');
        if (header && header.dataset.id === activeSecId) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    });
}

function updateGlobalGameoverSelect() {
    const s = state.getProjectData().settings;
    const container = document.getElementById('global-gameover-select-container');
    
    // コンテナと設定データがあれば、セレクトボックスを再生成する
    if (container && s) {
        // 現在の設定値を維持しつつリストを更新
        createLinkedSelects(container, 'ui-global-gameover-node', s.globalGameoverNodeId || '');
    }
}

export function updateParticleSelects() {
    const projectData = state.getProjectData();
    const particles = projectData.particles || {};
    
    const targetIds = ['node-particle', 'enemy-hit-particle'];
    
    targetIds.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        
        const currentVal = el.value;
        el.innerHTML = '<option value="">なし</option>';
        
        // ★追加: 停止コマンドを追加
        el.add(new Option('⛔ 停止 (Stop)', 'stop'));

        // デフォルトプリセット
        el.add(new Option('✨ キラキラ (Spark)', 'spark'));
        el.add(new Option('🩸 出血 (Blood)', 'blood'));
        
        // ユーザー作成パーティクル
        Object.keys(particles).forEach(pId => {
            const p = particles[pId];
            // 天候タイプならマークをつけるなどしても分かりやすいです
            const mark = (p.spawnType === 'weather') ? '☔ ' : '✨ ';
            el.add(new Option(`${mark}${p.name}`, pId));
        });
        
        el.value = currentVal;
    });
}