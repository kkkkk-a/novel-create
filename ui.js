// ui.js

import * as state from './state.js';
import { generateGameHtml } from './export.js';

// --- DOM要素のキャッシュ ---
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
        // ★変更: 単一のselectではなく、リストコンテナを使用
        charListContainer: document.getElementById('node-char-list-container'), 
        addCharBtn: document.getElementById('add-char-btn'),
        
        customName: document.getElementById('node-custom-name'), // 名前入力は維持（発言者名）
        
        background: document.getElementById('node-background'),
        bgm: document.getElementById('node-bgm'),
        sound: document.getElementById('node-sound'),
        nextContainer: document.getElementById('container-next-text')
    },
    choiceNode: { editor: document.getElementById('choices-editor') },
    variableNode: {
        target: document.getElementById('var-target'),
        operator: document.getElementById('var-operator'),
        value: document.getElementById('var-value'),
        nextContainer: document.getElementById('container-next-variable')
    },
    conditionalNode: {
        editor: document.getElementById('conditions-editor'),
        elseNextContainer: document.getElementById('container-next-conditional-else')
    },
    mapNode: {
        dest: document.getElementById('node-map-dest'),
        spawn: document.getElementById('node-map-spawn')
    },
    
    mapBgSelect: document.getElementById('map-bg-select'),

    variablesList: document.getElementById('variables-list'),
    editorPlaceholder: document.getElementById('editor-placeholder'),
    previewWindow: document.querySelector('.preview-window'),

    helpBtn: document.getElementById('open-help-btn'),
    helpModal: document.getElementById('help-modal'),
    closeHelpBtn: document.querySelector('.close-modal')
};

// --- ヘルパー関数 ---

export function createLinkedSelects(container, selectId, currentValue, dataset = {}) {
    if (!container) return;
    container.innerHTML = ''; 

    const projectData = state.getProjectData();
    const activeSectionId = state.getActiveSectionId();

    const sectionSelect = document.createElement('select');
    sectionSelect.className = 'section-filter-select';
    sectionSelect.style.marginBottom = '5px';
    sectionSelect.style.backgroundColor = '#f0f8ff';

    const nodeSelect = document.createElement('select');
    if (selectId) nodeSelect.id = selectId;
    
    Object.keys(dataset).forEach(key => {
        nodeSelect.dataset[key] = dataset[key];
    });

    let targetSectionId = activeSectionId; 
    
    if (currentValue) {
        for (const secId in projectData.scenario.sections) {
            if (projectData.scenario.sections[secId].nodes[currentValue]) {
                targetSectionId = secId;
                break;
            }
        }
    }
    if (!targetSectionId && Object.keys(projectData.scenario.sections).length > 0) {
        targetSectionId = Object.keys(projectData.scenario.sections)[0];
    }

    Object.keys(projectData.scenario.sections).forEach(secId => {
        const option = document.createElement('option');
        option.value = secId;
        option.textContent = `📁 ${projectData.scenario.sections[secId].name}`;
        if (secId === targetSectionId) option.selected = true;
        sectionSelect.appendChild(option);
    });

    const updateNodeOptions = (secId) => {
        nodeSelect.innerHTML = '<option value="">(なし / 終了)</option>';
        
        const section = projectData.scenario.sections[secId];
        if (section && section.nodes) {
            Object.keys(section.nodes).forEach(nodeId => {
                const node = section.nodes[nodeId];
                
                let icon = '📄';
                let summary = node.type;
                
                switch(node.type) {
                    case 'text':
                        icon = '💬';
                        const tmp = document.createElement("div");
                        tmp.innerHTML = node.message || '';
                        let text = tmp.textContent.replace(/\s+/g, ' ').trim();
                        if (text.length > 15) text = text.substring(0, 15) + '...';
                        summary = text;
                        break;
                    case 'choice':
                        icon = '🔀';
                        summary = `選択肢 ${node.choices ? node.choices.length : 0}個`;
                        break;
                    case 'variable':
                        icon = '🔢';
                        summary = `${node.targetVariable||''} ${node.operator||''} ${node.value||''}`;
                        break;
                    case 'conditional':
                        icon = '❓';
                        summary = `IF分岐`;
                        break;
                    case 'map':
                        icon = '🗺️';
                        summary = 'マップ移動';
                        break;
                }

                const option = document.createElement('option');
                option.value = nodeId;
                option.textContent = `${nodeId.slice(-4)}: ${icon} ${summary}`;
                
                if (nodeId === currentValue) option.selected = true;
                nodeSelect.appendChild(option);
            });
        }
    };

    updateNodeOptions(targetSectionId);

    sectionSelect.addEventListener('change', (e) => {
        updateNodeOptions(e.target.value);
        nodeSelect.value = "";
        nodeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    });

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
            const displayName = asset.isSpriteSheet ? `${asset.name} (Sprite)` : asset.name;
            selectElement.add(new Option(displayName, id));
        }
    }
    // 値の復元は呼び出し側で行うか、ここで行うなら注意が必要
    if (currentVal) selectElement.value = currentVal;
}

// --- ★新機能: キャラクターリストのレンダリング ---
function renderCharacterListEditor(characters) {
    const container = elements.textNode.charListContainer;
    if (!container) return;
    container.innerHTML = '';

    if (!characters || characters.length === 0) {
        container.innerHTML = '<div style="color:#999; font-size:0.9em; padding:5px;">表示するキャラクターがいません</div>';
        return;
    }

    characters.forEach((charData, index) => {
        const wrapper = document.createElement('div');
        wrapper.style.marginBottom = '8px';
        wrapper.style.background = '#f9f9f9';
        wrapper.style.padding = '8px';
        wrapper.style.borderRadius = '4px';
        wrapper.style.border = '1px solid #ddd';

        // --- 1行目: キャラ選択・削除 ---
        const row1 = document.createElement('div');
        row1.className = 'form-group-row';
        row1.style.marginBottom = '5px';

        // ★修正: labelで囲むことで、文字クリックでも反応させる
        const charLabel = document.createElement('label');
        charLabel.style.flex = '1';
        charLabel.style.display = 'flex'; // レイアウト崩れ防止
        charLabel.style.alignItems = 'center';
        charLabel.style.gap = '5px';
        charLabel.style.cursor = 'pointer';

        const charSelect = document.createElement('select');
        charSelect.style.flex = '1'; // 幅いっぱい
        populateAssetSelect(charSelect, 'characters', '(画像選択)');
        charSelect.value = charData.characterId || '';
        charSelect.onchange = (e) => { charData.characterId = e.target.value; };

        // ラベルの中にテキストなどは入れず、select自体を大きく使うレイアウトなので
        // ここでは単にSelectをappendChildするだけでも良いが、将来的にラベル文字を入れるならこうする
        charLabel.appendChild(charSelect);

        const delBtn = document.createElement('button');
        delBtn.className = 'danger-button';
        delBtn.textContent = '削除';
        delBtn.style.padding = '2px 8px';
        delBtn.style.fontSize = '0.8em';
        delBtn.onclick = () => {
            characters.splice(index, 1);
            renderCharacterListEditor(characters);
        };

        row1.appendChild(charLabel); // labelを追加
        row1.appendChild(delBtn);

        // --- 2行目: 9方向位置選択 ---
        const row2 = document.createElement('div');
        row2.style.marginBottom = '5px';
        
        // ★修正: labelで囲む
        const posLabel = document.createElement('label');
        posLabel.style.width = '100%';
        posLabel.style.cursor = 'pointer';
        
        const posSelect = document.createElement('select');
        posSelect.style.width = '100%';
        const positions = {
            'bottom-left': '↙ 左下 (標準)',
            'bottom-center': '⬇ 中央下 (標準)',
            'bottom-right': '↘ 右下 (標準)',
            'center-left': '⬅ 左中',
            'center': '⏺ 中央',
            'center-right': '➡ 右中',
            'top-left': '↖ 左上',
            'top-center': '⬆ 中央上',
            'top-right': '↗ 右上'
        };
        for (const [key, label] of Object.entries(positions)) {
            posSelect.add(new Option(label, key));
        }
        posSelect.value = charData.position || 'bottom-center';
        posSelect.onchange = (e) => { charData.position = e.target.value; };
        
        posLabel.appendChild(posSelect);
        row2.appendChild(posLabel);

        // --- 3行目: 詳細調整 (拡大率, X, Y) ---
        const row3 = document.createElement('div');
        row3.style.display = 'flex';
        row3.style.gap = '10px'; // 間隔を少し広げる
        row3.style.alignItems = 'center';
        row3.style.fontSize = '0.9em';
        row3.style.marginBottom = '5px';

        // ★ヘルパー関数: ラベル付き入力欄を作る
        const createLabeledInput = (iconText, value, onChange, title) => {
            const label = document.createElement('label');
            label.style.display = 'flex';
            label.style.alignItems = 'center';
            label.style.gap = '2px';
            label.style.cursor = 'pointer';
            label.title = title; // ホバー時に説明を表示

            const span = document.createElement('span');
            span.textContent = iconText;
            
            const input = document.createElement('input');
            input.type = 'number';
            input.value = value;
            input.style.width = '50px';
            input.style.padding = '2px';
            input.onchange = onChange;

            label.appendChild(span);
            label.appendChild(input);
            return label;
        };

        // 拡大率
        const scaleLabel = createLabeledInput(
            '🔍', 
            charData.scale !== undefined ? charData.scale : 100, 
            (e) => { charData.scale = parseInt(e.target.value) || 100; },
            "拡大率 (%)"
        );

        // 横(X)
        const xLabel = createLabeledInput(
            '↔', 
            charData.x || 0, 
            (e) => { charData.x = parseInt(e.target.value) || 0; },
            "横位置調整 (px)"
        );

        // 縦(Y)
        const yLabel = createLabeledInput(
            '↕', 
            charData.y || 0, 
            (e) => { charData.y = parseInt(e.target.value) || 0; },
            "縦位置調整 (px)"
        );

        row3.appendChild(scaleLabel);
        row3.appendChild(xLabel);
        row3.appendChild(yLabel);

        // --- 4行目: マスク設定 ---
        const row4 = document.createElement('div');
        row4.style.marginTop = '5px';
        row4.style.borderTop = '1px dashed #ccc';
        row4.style.paddingTop = '5px';

        // ★修正: labelで囲む
        const maskLabel = document.createElement('label');
        maskLabel.style.display = 'flex';
        maskLabel.style.alignItems = 'center';
        maskLabel.style.gap = '5px';
        maskLabel.style.cursor = 'pointer';
        maskLabel.style.width = '100%';

        const maskIcon = document.createElement('span');
        maskIcon.textContent = '🎭 Mask:';
        maskIcon.style.fontSize = '0.8em';
        
        const maskSelect = document.createElement('select');
        maskSelect.style.flex = '1';
        populateAssetSelect(maskSelect, 'characters', '(マスクなし)');
        maskSelect.value = charData.maskId || '';
        maskSelect.onchange = (e) => { charData.maskId = e.target.value; };

        maskLabel.appendChild(maskIcon);
        maskLabel.appendChild(maskSelect);
        row4.appendChild(maskLabel);

        wrapper.appendChild(row1);
        wrapper.appendChild(row2);
        wrapper.appendChild(row3);
        wrapper.appendChild(row4);
        container.appendChild(wrapper);
    });
}


// --- メイン UI レンダリング関数 ---

export function renderAll() {
    renderScenarioTree();
    renderNodeEditor();
    renderVariablesList();
    renderAssetList('characters');
    renderAssetList('backgrounds');
    renderAssetList('sounds');
    updateAssetDropdowns();
}

export function switchModeUI(newMode) {
    elements.navButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.mode === newMode));
    elements.modeContents.forEach(content => content.classList.toggle('active', content.id === `mode-${newMode}`));
}

function initHelpSystem() {
    if (elements.helpBtn && elements.helpModal && elements.closeHelpBtn) {
        elements.helpBtn.addEventListener('click', () => elements.helpModal.classList.remove('hidden'));
        elements.closeHelpBtn.addEventListener('click', () => elements.helpModal.classList.add('hidden'));
        window.addEventListener('click', (e) => { if (e.target === elements.helpModal) elements.helpModal.classList.add('hidden'); });
    }
}

export function updatePreview() {
    const projectData = state.getProjectData();
    const activeNodeId = state.getActiveNodeId();
    
    const iframe = document.createElement('iframe');
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    
    const startNode = activeNodeId || projectData.scenario.startNodeId;
    
    if (!startNode) {
        elements.previewWindow.innerHTML = '<div style="color:white; padding:20px; text-align:center;">開始ノードが設定されていないか、ノードが選択されていません。</div>';
        return;
    }

    const gameHtml = generateGameHtml(projectData, startNode);
    const blob = new Blob([gameHtml], { type: 'text/html' });
    iframe.src = URL.createObjectURL(blob);

    elements.previewWindow.innerHTML = '';
    elements.previewWindow.appendChild(iframe);
}

export function renderScenarioTree() {
    if (!elements.scenarioTree) return;
    elements.scenarioTree.innerHTML = '';
    const projectData = state.getProjectData();
    const activeSectionId = state.getActiveSectionId();
    const activeNodeId = state.getActiveNodeId();

    Object.keys(projectData.scenario.sections).forEach(secId => {
        const section = projectData.scenario.sections[secId];
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'tree-section';
        if (secId === activeSectionId) sectionDiv.classList.add('active');

        const header = document.createElement('div');
        header.className = 'tree-section-header';
        header.textContent = section.name;
        header.dataset.id = secId;
        sectionDiv.appendChild(header);

        const nodesGroup = document.createElement('div');
        nodesGroup.className = 'tree-nodes-group';
        
        Object.keys(section.nodes).forEach(nodeId => {
            const node = section.nodes[nodeId];
            const nodeDiv = document.createElement('div');
            nodeDiv.className = 'tree-node';
            nodeDiv.dataset.id = nodeId;
            nodeDiv.dataset.type = node.type;
            
            nodeDiv.draggable = true; 

            if (nodeId === projectData.scenario.startNodeId) nodeDiv.classList.add('start-node');
            if (nodeId === activeNodeId) nodeDiv.classList.add('active');

            let icon = '';
            let summary = '';
            
            switch(node.type) {
                case 'text':
                    icon = '💬';
                    const tmp = document.createElement("div");
                    tmp.innerHTML = node.message || '(テキストなし)';
                    summary = tmp.textContent.substring(0, 12) + (tmp.textContent.length > 12 ? '...' : '');
                    break;
                case 'choice':
                    icon = '🔀';
                    summary = `選択肢: ${node.choices ? node.choices.length : 0}個`;
                    break;
                case 'variable':
                    icon = '🔢';
                    summary = `${node.targetVariable} ${node.operator} ${node.value}`;
                    break;
                case 'conditional':
                    icon = '❓';
                    summary = `IF分岐`;
                    break;
                case 'map':
                    icon = '🗺️';
                    summary = 'マップ移動';
                    break;
                default:
                    icon = '📄';
                    summary = node.type;
            }

            nodeDiv.innerHTML = `
                <span class="node-icon">${icon}</span>
                <div class="node-info">
                    <span class="node-summary">${summary}</span>
                    <span class="node-id-sub">${nodeId.slice(-4)}</span>
                </div>
            `;
            
            nodesGroup.appendChild(nodeDiv);
        });
        sectionDiv.appendChild(nodesGroup);
        elements.scenarioTree.appendChild(sectionDiv);
    });
}

export function renderNodeEditor() {
    const activeNodeId = state.getActiveNodeId();
    const activeSectionId = state.getActiveSectionId();
    const projectData = state.getProjectData();
    
    if (!activeNodeId || !activeSectionId || !projectData.scenario.sections[activeSectionId] || !projectData.scenario.sections[activeSectionId].nodes[activeNodeId]) {
        elements.nodeEditor.classList.add('hidden');
        if (elements.editorPlaceholder) elements.editorPlaceholder.style.display = 'flex';
        return;
    }
    
    elements.nodeEditor.classList.remove('hidden');
    if (elements.editorPlaceholder) elements.editorPlaceholder.style.display = 'none';
    
    const node = projectData.scenario.sections[activeSectionId].nodes[activeNodeId];
    elements.nodeIdDisplay.textContent = activeNodeId;
    elements.isStartNodeCheckbox.checked = (activeNodeId === projectData.scenario.startNodeId);
    elements.nodeTypeSelect.value = node.type;

    elements.allNodeTypeSettings.forEach(el => el.classList.add('hidden'));
    const currentSettings = document.getElementById(`${node.type}-node-settings`);
    if(currentSettings) currentSettings.classList.remove('hidden');

    switch(node.type) {
        case 'text':
            state.quill.root.innerHTML = node.message || '';
            
            // ★変更: 複数キャラ対応
            // 古いデータ構造(characterId)がある場合は、新しい構造(characters配列)に変換してあげる
            if (!node.characters) {
                node.characters = [];
                if (node.characterId) {
                    node.characters.push({
                        characterId: node.characterId,
                        position: node.characterPosition || 'center'
                    });
                    // 古いデータは消してもいいが、念のため残すか、上書き時に消える
                }
            }
            renderCharacterListEditor(node.characters);
            
            // キャラ追加ボタンのイベント
            if(elements.textNode.addCharBtn) {
                // イベントリスナーが重複しないように一旦クローンでリセットするか、onclickで上書き
                elements.textNode.addCharBtn.onclick = () => {
                    node.characters.push({ characterId: '', position: 'center' });
                    renderCharacterListEditor(node.characters);
                };
            }

            if(elements.textNode.customName) elements.textNode.customName.value = node.customName || '';
            
            elements.textNode.background.value = node.backgroundId || '';
            elements.textNode.bgm.value = node.bgmId || '';
            elements.textNode.sound.value = node.soundId || '';
    let effectSelect = document.getElementById('node-effect');
        if (!effectSelect) {
            const container = elements.textNode.bgm.closest('.node-type-settings'); // 親コンテナ取得
            
            const group = document.createElement('div');
            group.className = 'form-group';
            group.style.marginTop = '10px';
            group.style.padding = '10px';
            group.style.background = '#fff0f6'; // 目立つように薄いピンク
            group.style.borderRadius = '4px';
            group.style.border = '1px dashed #ffadd2';

            const label = document.createElement('label');
            label.textContent = '⚡ 画面演出 (このノードの開始時)';
            label.htmlFor = 'node-effect';
            label.style.color = '#c41d7f';
            label.style.fontWeight = 'bold';

            effectSelect = document.createElement('select');
            effectSelect.id = 'node-effect';
            
            // 演出のリスト
            const effects = {
                '': 'なし',
                'flash-white': '⚪ 白フラッシュ (発光/雷)',
                'flash-red': '🔴 赤フラッシュ (被弾/危険)',
                'shake-small': '🫨 揺れ (小) - ガタッ',
                'shake-medium': '🫨 揺れ (中) - ドスン',
                'shake-hard': '🫨 揺れ (大) - 激震',
                'fade-black': '⚫ 暗転 (フェードアウト→イン)'
            };
            for (const [val, text] of Object.entries(effects)) {
                effectSelect.add(new Option(text, val));
            }

            // 挿入位置: BGM/SE設定(form-group-row)の後ろ
            const soundRow = elements.textNode.sound.closest('.form-group-row');
            if (soundRow && soundRow.nextSibling) {
                container.insertBefore(group, soundRow.nextSibling);
            } else {
                container.appendChild(group);
            }
            group.appendChild(label);
            group.appendChild(effectSelect);
        }

        // 値の反映と保存イベント
        effectSelect.value = node.effect || '';
        effectSelect.onchange = (e) => { 
            node.effect = e.target.value; 
        };
        // ------------------------------------------

        createLinkedSelects(elements.textNode.nextContainer, 'node-next-text', node.nextNodeId);
        break;

        case 'choice':
            renderChoicesEditor(node.choices || []);
            break;

        case 'variable':
            elements.variableNode.target.value = node.targetVariable || '';
            elements.variableNode.operator.value = node.operator || '=';
            elements.variableNode.value.value = node.value || '';
            createLinkedSelects(elements.variableNode.nextContainer, 'node-next-variable', node.nextNodeId);
            break;

        case 'conditional':
            renderConditionsEditor(node.conditions || []);
            createLinkedSelects(elements.conditionalNode.elseNextContainer, 'node-next-conditional-else', node.elseNextNodeId);
            break;
            
        case 'map':
            updateMapSelect(elements.mapNode.dest);
            elements.mapNode.dest.value = node.mapId || '';
            elements.mapNode.dest.onchange = () => {
                updateSpawnSelect(elements.mapNode.spawn, elements.mapNode.dest.value);
            };
            updateSpawnSelect(elements.mapNode.spawn, node.mapId);
            elements.mapNode.spawn.value = node.spawnId || '';
            break;
    }
}

function updateMapSelect(selectElement) {
    const maps = state.getProjectData().maps;
    selectElement.innerHTML = '<option value="">(マップを選択)</option>';
    if(maps) {
        for (const id in maps) {
            selectElement.add(new Option(maps[id].name, id));
        }
    }
}

function updateSpawnSelect(selectElement, mapId) {
    selectElement.innerHTML = '<option value="">(前回位置または初期位置)</option>';
    if (!mapId) return;
    const projectData = state.getProjectData();
    const map = projectData.maps[mapId];
    if (!map || !map.objects) return;

    map.objects.forEach(obj => {
        if (obj.isSpawn) {
            const label = obj.spawnId ? `🚩 ${obj.spawnId}` : `🚩 (IDなし) [${obj.x},${obj.y}]`;
            const value = obj.spawnId || '';
            selectElement.add(new Option(label, value));
        }
    });
}

export function renderChoicesEditor(choices) {
    elements.choiceNode.editor.innerHTML = '';
    choices.forEach((choice, index) => {
        const item = document.createElement('div');
        item.className = 'choice-editor-item';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = '選択肢テキスト';
        input.value = choice.text || '';
        input.dataset.index = index;
        input.dataset.field = 'text';

        const arrow = document.createElement('span');
        arrow.textContent = '→';

        const selectContainer = document.createElement('div');
        selectContainer.className = 'smart-select-mini';
        createLinkedSelects(selectContainer, null, choice.nextNodeId, { index: index, field: 'nextNodeId' });

        const delBtn = document.createElement('button');
        delBtn.className = 'danger-button';
        delBtn.textContent = '×';
        delBtn.dataset.index = index;

        item.appendChild(input);
        item.appendChild(arrow);
        item.appendChild(selectContainer);
        item.appendChild(delBtn);

        elements.choiceNode.editor.appendChild(item);
    });
}

export function renderConditionsEditor(conditions) {
    elements.conditionalNode.editor.innerHTML = '';
    conditions.forEach((cond, index) => {
        const item = document.createElement('div');
        item.className = 'condition-editor-item';

        const label = document.createElement('span');
        label.textContent = 'IF';
        item.appendChild(label);

        const varSelect = document.createElement('select');
        varSelect.dataset.index = index;
        varSelect.dataset.field = 'variable';
        varSelect.value = cond.variable; 
        item.appendChild(varSelect);

        const opSelect = document.createElement('select');
        opSelect.dataset.index = index;
        opSelect.dataset.field = 'operator';
        ['==', '!=', '>', '<', '>=', '<='].forEach(op => {
            const o = new Option(op, op);
            if(op === cond.operator) o.selected = true;
            opSelect.add(o);
        });
        item.appendChild(opSelect);

        const valInput = document.createElement('input');
        valInput.type = 'text';
        valInput.placeholder = '値';
        valInput.value = cond.compareValue || '';
        valInput.dataset.index = index;
        valInput.dataset.field = 'compareValue';
        item.appendChild(valInput);

        const arrow = document.createElement('span');
        arrow.textContent = 'THEN →';
        item.appendChild(arrow);

        const selectContainer = document.createElement('div');
        selectContainer.className = 'smart-select-mini';
        createLinkedSelects(selectContainer, null, cond.nextNodeId, { index: index, field: 'nextNodeId' });
        item.appendChild(selectContainer);

        const delBtn = document.createElement('button');
        delBtn.className = 'danger-button';
        delBtn.textContent = '×';
        delBtn.dataset.index = index;
        item.appendChild(delBtn);

        elements.conditionalNode.editor.appendChild(item);
    });
    
    updateVariableSelects();
}

export function renderVariablesList() {
    let html = `
        <div class="variable-header">
            <div>変数名</div>
            <div>初期値</div>
            <div>操作</div>
        </div>
    `;

    const projectData = state.getProjectData();
    const variables = projectData.variables;

    if (Object.keys(variables).length === 0) {
        html += `<div style="padding:20px; text-align:center; color:#777;">変数はまだ登録されていません。</div>`;
    } else {
        Object.keys(variables).forEach(varName => {
            const value = variables[varName];
            html += `
                <div class="variable-row">
                    <div class="variable-name">${varName}</div>
                    <input type="text" value="${value}" data-var-name="${varName}" placeholder="初期値">
                    <button class="danger-button" data-var-name="${varName}">削除</button>
                </div>
            `;
        });
    }
    elements.variablesList.innerHTML = html;
}

export function renderAssetList(type) {
    const listElement = document.getElementById(`${type.slice(0, -1)}-list`);
    if (!listElement) return;
    listElement.innerHTML = '';
    const projectData = state.getProjectData();
    
    const assets = projectData.assets[type];
    if (!assets) return;

    for (const id in assets) {
        const asset = assets[id];
        const card = document.createElement('div');
        card.className = 'asset-card';
        
        let contentHtml = '';
        
        if (!asset.data && !asset.isSpriteSheet) {
            contentHtml += `<div style="color:red; font-weight:bold;">エラー: データ破損 (${id})</div>`;
        } else if (!asset.data && asset.isSpriteSheet) {
            contentHtml = `
                <div style="width:100%; height:120px; background-color:#eee; border-radius:4px; display:flex; justify-content:center; align-items:center; color:#555; font-size:0.9em; text-align:center;">
                    スプライトシート<br>(${asset.width}x${asset.height}px)
                </div>
                <div class="asset-key">${id}</div>
                <input type="text" value="${asset.name}" data-id="${id}" data-type="${type}" placeholder="アセット名">
                <div class="anim-settings">
                    <button class="json-btn" data-id="${id}" data-type="${type}">📄 設定JSONを読込</button>
                    <div class="anim-row">
                        <label>横</label><input type="number" value="${asset.cols || 1}" min="1" data-setting="cols" data-id="${id}" data-type="${type}">
                        <label>縦</label><input type="number" value="${asset.rows || 1}" min="1" data-setting="rows" data-id="${id}" data-type="${type}">
                    </div>
                    <div class="anim-row">
                        <label>FPS</label><input type="number" value="${asset.fps || 12}" min="1" data-setting="fps" data-id="${id}" data-type="${type}">
                        <label><input type="checkbox" ${asset.loop ? 'checked' : ''} data-setting="loop" data-id="${id}" data-type="${type}">ループ</label>
                    </div>
                </div>
                <button class="danger-button" data-id="${id}" data-type="${type}">削除</button>
            `;
        } else {
            contentHtml = `
                <img src="${asset.data}" alt="${asset.name}">
                <div class="asset-key">${id}</div>
                <input type="text" value="${asset.name}" data-id="${id}" data-type="${type}" placeholder="アセット名">
                <div class="anim-settings">
                    <button class="json-btn" data-id="${id}" data-type="${type}">📄 設定JSONを読込</button>
                    <div class="anim-row">
                        <label>横</label><input type="number" value="${asset.cols || 1}" min="1" data-setting="cols" data-id="${id}" data-type="${type}">
                        <label>縦</label><input type="number" value="${asset.rows || 1}" min="1" data-setting="rows" data-id="${id}" data-type="${type}">
                    </div>
                    <div class="anim-row">
                        <label>FPS</label><input type="number" value="${asset.fps || 12}" min="1" data-setting="fps" data-id="${id}" data-type="${type}">
                        <label><input type="checkbox" ${asset.loop ? 'checked' : ''} data-setting="loop" data-id="${id}" data-type="${type}">ループ</label>
                    </div>
                </div>
                <button class="danger-button" data-id="${id}" data-type="${type}">削除</button>
            `;
        }

        card.innerHTML = contentHtml;
        listElement.appendChild(card);
    }
}

export function updateAllNodeSelects() {
    renderNodeEditor();
}

export function updateAssetDropdowns() {
    // 既存の固定プルダウン（背景、マップ背景）の更新
    populateAssetSelect(elements.textNode.background, 'backgrounds', '変更なし');
    populateAssetSelect(elements.mapBgSelect, 'backgrounds', 'なし');
    
    // BGM/SEの更新
    const soundSelects = [elements.textNode.bgm, elements.textNode.sound];
    const projectData = state.getProjectData();
    soundSelects.forEach(select => {
        if(!select) return;
        const currentVal = select.value;
        select.innerHTML = '';
        select.add(new Option('変更なし (維持)', ''));
        select.add(new Option('なし', ''));
        select.add(new Option('BGMを停止', 'stop'));
        const assets = projectData.assets.sounds;
        if (assets) {
            for (const id in assets) {
                select.add(new Option(assets[id].name, id));
            }
        }
        select.value = currentVal;
    });

    renderNodeEditor();
}

export function updateVariableSelects() {
    const selects = Array.from(document.querySelectorAll('#var-target, select[data-field="variable"]'));
    const mapCondVar = document.getElementById('obj-cond-var');
    if (mapCondVar) selects.push(mapCondVar);

    const projectData = state.getProjectData();
    const options = Object.keys(projectData.variables).map(name => `<option value="${name}">${name}</option>`).join('');
    
    selects.forEach(select => {
        let currentValue = select.value;
        select.innerHTML = '<option value="">(条件なし)</option>' + options;
        
        if (currentValue && projectData.variables.hasOwnProperty(currentValue)) {
            select.value = currentValue;
        } else if (select !== mapCondVar && Object.keys(projectData.variables).length > 0) {
            if (select.id === 'var-target') select.value = Object.keys(projectData.variables)[0];
        }
    });
}

export function initUi() {
    renderAll();
    initHelpSystem();
}
