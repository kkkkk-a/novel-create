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
        character: document.getElementById('node-character'),
        position: document.getElementById('node-position'),
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
    if (currentVal && assets && assets[currentVal]) {
        selectElement.value = currentVal;
    }
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
            elements.textNode.character.value = node.characterId || '';
            const customNameInput = document.getElementById('node-custom-name');
            if (customNameInput) customNameInput.value = node.customName || '';
            elements.textNode.position.value = node.characterPosition || 'bottom-center';
            elements.textNode.background.value = node.backgroundId || '';
            elements.textNode.bgm.value = node.bgmId || '';
            elements.textNode.sound.value = node.soundId || '';
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
    populateAssetSelect(elements.textNode.character, 'characters', 'なし');
    populateAssetSelect(elements.textNode.background, 'backgrounds', '変更なし');
    populateAssetSelect(elements.mapBgSelect, 'backgrounds', 'なし');
    
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
}

// ★修正: マップエディタの条件変数セレクトにも対応
export function updateVariableSelects() {
    // 既存のセレクト群
    const selects = Array.from(document.querySelectorAll('#var-target, select[data-field="variable"]'));
    // マップエディタ用のセレクトも追加
    const mapCondVar = document.getElementById('obj-cond-var');
    if (mapCondVar) selects.push(mapCondVar);

    const projectData = state.getProjectData();
    const options = Object.keys(projectData.variables).map(name => `<option value="${name}">${name}</option>`).join('');
    
    selects.forEach(select => {
        let currentValue = select.value;
        select.innerHTML = '<option value="">(条件なし)</option>' + options;
        
        // 既存の値があれば復元、なければデフォルト
        if (currentValue && projectData.variables.hasOwnProperty(currentValue)) {
            select.value = currentValue;
        } else if (select !== mapCondVar && Object.keys(projectData.variables).length > 0) {
            // 変数ノードの場合はデフォルト値を入れるが、条件設定の場合は空欄(なし)で良い
            if (select.id === 'var-target') select.value = Object.keys(projectData.variables)[0];
        }
    });
}

export function initUi() {
    renderAll();
    initHelpSystem();
}
