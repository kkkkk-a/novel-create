// scenarioHandlers.js (一括設定機能付き)

import * as state from './state.js';
import * as ui from './ui.js';

// --- セレクション系ヘルパー関数 ---

function selectSection(id) {
    if (!id) return;
    state.setActiveSectionId(id);
    state.setActiveNodeId(null);
    ui.renderAll();
}

async function selectNode(id) {
    if (!id) return;
    state.setActiveNodeId(id);
    ui.highlightActiveNode();
    await ui.renderNodeEditor();
}

// --- CRUD操作関数 ---

function addSection() {
    const name = prompt('新しい章(セクション)の名前を入力してください:', '第一章');
    if (!name) return;
    
    // state.js の関数を呼び出す
    const id = state.generateId('sec');
    
    const projectData = state.getProjectData();
    projectData.scenario.sections[id] = { name: name, nodes: {} };
    selectSection(id);
}

function renameSection() {
    const activeSectionId = state.getActiveSectionId();
    if (!activeSectionId) {
        alert('名前を変更する章(セクション)を選択してください。');
        return;
    }
    
    const projectData = state.getProjectData();
    const section = projectData.scenario.sections[activeSectionId];
    
    const newName = prompt('章の新しい名前を入力してください:', section.name);
    if (!newName || newName.trim() === "") return;
    
    section.name = newName;
    ui.renderScenarioTree();
    ui.updateAllNodeSelects();
}

async function addNode() {
    const activeSectionId = state.getActiveSectionId();
    if (!activeSectionId) {
        alert('ノードを追加する章(セクション)を選択してください。');
        return;
    }
    
    const projectData = state.getProjectData();
    const section = projectData.scenario.sections[activeSectionId];

    // ★変更: ランダムIDを使用
const newId = state.generateId('node');
    
    section.nodes[newId] = { type: 'text', message: '' };
    
    const autoLinkCheckbox = document.getElementById('auto-link-next-node');
    const activeNodeId = state.getActiveNodeId();
    
    // 直前のノードから自動リンク
    if (autoLinkCheckbox && autoLinkCheckbox.checked && activeNodeId) {
        const activeNode = section.nodes[activeNodeId];
        if (activeNode) {
            if (activeNode.type === 'text' || activeNode.type === 'variable' || activeNode.type === 'ui_control') {
                activeNode.nextNodeId = newId;
            }
        }
    }

   if (!projectData.scenario.startNodeId) { 
        projectData.scenario.startNodeId = newId; 
    }
    
    ui.renderScenarioTree();
    await selectNode(newId);
}

function deleteNode() {
    const activeNodeId = state.getActiveNodeId();
    const activeSectionId = state.getActiveSectionId();
    if (!activeNodeId || !activeSectionId) return;
    
    if (confirm(`ノード「${activeNodeId}」を本当に削除しますか？`)) {
        const projectData = state.getProjectData();
        delete projectData.scenario.sections[activeSectionId].nodes[activeNodeId];
        
        if (projectData.scenario.startNodeId === activeNodeId) {
            projectData.scenario.startNodeId = null;
        }
        
        // ★追加: このノードを「次のノード」として指定している他のノードのリンクを解除する
        for (const secId in projectData.scenario.sections) {
            const sec = projectData.scenario.sections[secId];
            for (const nId in sec.nodes) {
                const node = sec.nodes[nId];
                
                // Text, Variable, UI Control, Shop, Map などの通常リンク
                if (node.nextNodeId === activeNodeId) node.nextNodeId = '';
                
                // 条件分岐のリンク
                if (node.type === 'conditional') {
                    if (node.elseNextNodeId === activeNodeId) node.elseNextNodeId = '';
                    if (node.conditions) {
                        node.conditions.forEach(cond => {
                            if (cond.nextNodeId === activeNodeId) cond.nextNodeId = '';
                        });
                    }
                }
                
                // 選択肢のリンク
                if (node.type === 'choice' && node.choices) {
                    node.choices.forEach(choice => {
                        if (choice.nextNodeId === activeNodeId) choice.nextNodeId = '';
                    });
                }
                
                // バトルのリンク
                if (node.type === 'battle') {
                    if (node.nextWinNodeId === activeNodeId) node.nextWinNodeId = '';
                    if (node.nextRunNodeId === activeNodeId) node.nextRunNodeId = '';
                    if (node.nextLoseNodeId === activeNodeId) node.nextLoseNodeId = '';
                }
            }
        }
        
        state.setActiveNodeId(null);
        ui.renderScenarioTree();
        ui.renderNodeEditor();
    }
}

function updateNodeData(target) {
    const activeNodeId = state.getActiveNodeId();
    const activeSectionId = state.getActiveSectionId();
    if (!activeNodeId || !activeSectionId) return;
    
    const projectData = state.getProjectData();
    const node = projectData.scenario.sections[activeSectionId].nodes[activeNodeId];

    if (target.classList.contains('section-filter-select')) return;

    if (node.type === 'text') {
        const charEl = document.getElementById('node-character'); if(charEl) node.characterId = charEl.value;
        const customNameEl = document.getElementById('node-custom-name'); if(customNameEl) node.customName = customNameEl.value;
        const posEl = document.getElementById('node-position'); if(posEl) node.characterPosition = posEl.value;
        const bgEl = document.getElementById('node-background'); if(bgEl) node.backgroundId = bgEl.value;
        const bgmEl = document.getElementById('node-bgm'); if(bgmEl) node.bgmId = bgmEl.value;
        const soundEl = document.getElementById('node-sound'); if(soundEl) node.soundId = soundEl.value;
        const ptclEl = document.getElementById('node-particle'); 
        if(ptclEl) node.particleId = ptclEl.value;
        const nextEl = document.getElementById('node-next-text'); if(nextEl) node.nextNodeId = nextEl.value;
        const effectEl = document.getElementById('node-effect'); if(effectEl) node.effect = effectEl.value;
    } 
    else if (node.type === 'variable') {
        if (target.id === 'node-next-variable') {
            node.nextNodeId = target.value;
        } else {
            const { index, field } = target.dataset;
            if (index !== undefined && field && node.operations[index]) {
                node.operations[index][field] = target.value;
            }
        }
    }
    else if (node.type === 'choice') {
        const { index, field } = target.dataset;
        if(index !== undefined && field && node.choices[index]) {
            node.choices[index][field] = target.value;
        }
    }
    else if (node.type === 'conditional') {
        if(target.id === 'node-next-conditional-else') {
            node.elseNextNodeId = target.value;
        } else {
            const { index, field } = target.dataset;
            if(index !== undefined && field && node.conditions[index]) {
                node.conditions[index][field] = target.value;
            }
        }
    }
    else if (node.type === 'map') {
        const destEl = document.getElementById('node-map-dest'); if(destEl) node.mapId = destEl.value;
        const spawnEl = document.getElementById('node-map-spawn'); if(spawnEl) node.spawnId = spawnEl.value;
    }
    else if (node.type === 'ui_control') {
        const nextEl = document.getElementById('node-next-ui');
        if (nextEl) node.nextNodeId = nextEl.value;
    }
}

function reorderNodes(sourceSecId, targetSecId, draggedId, targetId, position) {
    const projectData = state.getProjectData();
    const sourceSection = projectData.scenario.sections[sourceSecId];
    const targetSection = projectData.scenario.sections[targetSecId];

    if (!sourceSection || !targetSection) return;

    // 1. 移動するノードのデータを確保
    const nodeData = sourceSection.nodes[draggedId];
    if (!nodeData) return;

    // 2. 元の場所から削除 (キー順序を保つため再構築)
    const sourceNodeIds = Object.keys(sourceSection.nodes).filter(id => id !== draggedId);
    const newSourceNodes = {};
    sourceNodeIds.forEach(id => {
        newSourceNodes[id] = sourceSection.nodes[id];
    });
    sourceSection.nodes = newSourceNodes;

    // 3. 新しい場所へ挿入
    const targetNodeIds = Object.keys(targetSection.nodes);
    
    // targetId が null (章ヘッダーへのドロップ時) なら末尾に追加
    let insertIndex = targetNodeIds.length; 

    if (targetId) {
        const targetIndex = targetNodeIds.indexOf(targetId);
        if (targetIndex !== -1) {
            // position: 'before' ならその前、'after' ならその後ろ
            insertIndex = (position === 'before') ? targetIndex : targetIndex + 1;
        }
    }

    // 配列操作でIDを挿入
    targetNodeIds.splice(insertIndex, 0, draggedId);

    // 新しい順序でオブジェクトを再構築
    const newTargetNodes = {};
    targetNodeIds.forEach(id => {
        if (id === draggedId) {
            newTargetNodes[id] = nodeData; // 移動してきたデータ
        } else {
            newTargetNodes[id] = targetSection.nodes[id]; // 既存データ
        }
    });
    targetSection.nodes = newTargetNodes;

    // 4. UI更新
    ui.renderScenarioTree();
    
    // 移動したノードをアクティブにする
    state.setActiveSectionId(targetSecId);
    // selectNode は export されていない内部関数のため、クリックイベントを擬似発火するか
    // ここで state 更新とハイライトだけ行う
    state.setActiveNodeId(draggedId);
    ui.highlightActiveNode();
    ui.renderNodeEditor();
}

// --- ★追加: 一括設定関連の処理 ---

// モーダルを開いて準備する
function openBulkEditModal(secId) {
    const projectData = state.getProjectData();
    const section = projectData.scenario.sections[secId];
    if (!section) return;

    // モーダル要素取得
    const modal = document.getElementById('section-bulk-edit-modal');
    document.getElementById('bulk-edit-section-name').textContent = section.name;

    // 各入力をリセット (空文字 = 変更なし)
    document.getElementById('bulk-node-type').value = "";
    document.getElementById('bulk-custom-name').value = "";
    
    const bgSelect = document.getElementById('bulk-background');
    ui.populateAssetSelect(bgSelect, 'backgrounds', '(変更なし)');
    
    const bgmSelect = document.getElementById('bulk-bgm');
    ui.populateAssetSelect(bgmSelect, 'sounds', '(変更なし)');

    // 「次のノード」選択肢を生成
    const nextContainer = document.getElementById('bulk-next-node-container');
    // ui.js のヘルパーを使ってリストを生成させる
    ui.createLinkedSelects(nextContainer, 'bulk-next-node', '');
    
    // 生成されたセレクトボックスに「(変更なし)」オプションを先頭に追加して選択する
    const nodeSelect = document.getElementById('bulk-next-node');
    if(nodeSelect) {
        const defaultOpt = new Option('(変更なし)', '');
        // 現在のオプションリストの先頭に挿入
        nodeSelect.insertBefore(defaultOpt, nodeSelect.firstChild);
        nodeSelect.value = ''; // (変更なし)を選択
    }

    // 適用ボタンにクリックイベントを設定 (重複登録防止のため、一旦cloneNodeでリセットするか、onclickで上書きする)
    const applyBtn = document.getElementById('apply-bulk-edit-btn');
    applyBtn.onclick = () => applyBulkEdit(secId);

    // モーダル表示
    modal.classList.remove('hidden');
}

// 一括設定を適用する
function applyBulkEdit(secId) {
    const projectData = state.getProjectData();
    const section = projectData.scenario.sections[secId];
    if (!section) return;

    const newType = document.getElementById('bulk-node-type').value;
    const newName = document.getElementById('bulk-custom-name').value;
    const newBg = document.getElementById('bulk-background').value;
    const newBgm = document.getElementById('bulk-bgm').value;
    
    const nextNodeSelect = document.getElementById('bulk-next-node');
    const newNextNode = nextNodeSelect ? nextNodeSelect.value : '';

    let count = 0;

    if (confirm('本当にこの章の全ノードに対して一括変更を行いますか？\nこの操作は取り消せません。')) {
        // 全ノードループ
        for (const nodeId in section.nodes) {
            const node = section.nodes[nodeId];

            // 1. タイプ変更 (データ構造が変わるため注意)
if (newType && newType !== "" && node.type !== newType) {
                const oldType = node.type;
                node.type = newType;
                
                // ★追加: 古いタイプの不要なデータをクリーンアップ（必要なもの以外を消す）
                // ※共通で保持すべきもの（nextNodeId, nodeLabel など）は残す
                if (oldType === 'choice') delete node.choices;
                if (oldType === 'variable') delete node.operations;
                if (oldType === 'conditional') { delete node.conditions; delete node.elseNextNodeId; }
                if (oldType === 'ui_control') delete node.uiOperations;
                if (oldType === 'map') { delete node.mapId; delete node.spawnId; }
                if (oldType === 'shop') { delete node.shopItems; delete node.currencyVar; }
                if (oldType === 'battle') { delete node.enemyIds; delete node.nextWinNodeId; delete node.nextRunNodeId; delete node.nextLoseNodeId; }
                
                // 新しいタイプの必須プロパティを初期化
                if (newType === 'text') {
                    if (!node.characters) node.characters = [];
                    if (!node.message) node.message = '';
                } else if (newType === 'choice') {
                    node.choices = [];
                } else if (newType === 'variable') {
                    node.operations = [{ type: 'variable', targetVariable: '', operator: '=', value: '' }];
                } else if (newType === 'conditional') {
                    node.conditions = [];
                    node.elseNextNodeId = '';
                } else if (newType === 'ui_control') {
                    node.uiOperations = [];
                } else if (newType === 'shop') {
                    node.shopItems = [];
                    node.currencyVar = 'money';
                } else if (newType === 'battle') {
                    node.enemyIds = [];
                }
            }

            // 2. 名前変更 (テキストノードのみ)
            if (newName !== "" && node.type === 'text') {
                node.customName = newName;
            }

            // 3. 背景変更 (テキスト、ショップ)
            if (newBg !== "") {
                if (node.type === 'text' || node.type === 'shop') {
                    node.backgroundId = newBg;
                }
            }

            // 4. BGM変更
            if (newBgm !== "") {
                if (node.type === 'text' || node.type === 'shop') {
                    node.bgmId = newBgm;
                }
            }

            // 5. 次のノード変更
            // 構造的に nextNodeId を持つタイプのみ適用
            if (newNextNode !== "") {
                if (['text', 'variable', 'ui_control', 'shop'].includes(node.type)) {
                    node.nextNodeId = newNextNode;
                }
            }
            
            count++;
        }

        // 完了処理
        document.getElementById('section-bulk-edit-modal').classList.add('hidden');
        ui.renderScenarioTree(); // ツリー再描画（アイコン等が変わるため）
        ui.renderNodeEditor();   // エディタ再描画 (現在選択中のノードが変わった可能性があるため)
        
        alert(`${count}個のノードを一括更新しました！`);
    }
}


// --- メイン初期化関数 ---

export function initScenarioHandlers() {
    const sidebar = document.querySelector('.scenario-sidebar');
    const editorPanel = document.getElementById('node-editor');
    const treeContainer = document.getElementById('scenario-tree');

    // サイドバー内のクリックイベント
    sidebar.addEventListener('click', e => {
        if (e.target.id === 'add-section-btn') addSection();
        if (e.target.id === 'rename-section-btn') renameSection();
        if (e.target.id === 'add-node-btn') addNode();
        
        // ★★★ 数字バッジクリック時の処理 (一括設定) ★★★
        if (e.target.matches('.node-count-badge')) {
            e.stopPropagation(); // 親要素(ヘッダー)へのバブリングを止める（開閉させない）
            const header = e.target.closest('.tree-section-header');
            if (header) {
                openBulkEditModal(header.dataset.id);
            }
            return;
        }
        
        // 章ヘッダーの開閉処理
        if (e.target.matches('.tree-section-header') || e.target.closest('.tree-section-header')) {
            const header = e.target.closest('.tree-section-header');
            const secId = header.dataset.id;
            const projectData = state.getProjectData();
            const section = projectData.scenario.sections[secId];
            
            section.collapsed = !section.collapsed;
            
            const group = header.nextElementSibling;
            if (group) {
                group.style.display = section.collapsed ? 'none' : '';
            }
            
            selectSection(secId);
        }
        
        // ノード選択処理
        if (e.target.closest('.tree-node')) {
            const nodeEl = e.target.closest('.tree-node');
            const sectionId = nodeEl.closest('.tree-section').querySelector('.tree-section-header').dataset.id;
            state.setActiveSectionId(sectionId);
            selectNode(nodeEl.dataset.id);
        }
    });

    editorPanel.addEventListener('change', e => {
        const activeNodeId = state.getActiveNodeId();
        const activeSectionId = state.getActiveSectionId();
        if (!activeNodeId) return;
        const projectData = state.getProjectData();
        const node = projectData.scenario.sections[activeSectionId].nodes[activeNodeId];

        if (e.target.id === 'node-label') {
            node.nodeLabel = e.target.value;
            ui.renderScenarioTree(); 
            ui.renderNodeEditor();
            return;
        }
        
        if (e.target.id === 'is-start-node') {
            projectData.scenario.startNodeId = e.target.checked ? activeNodeId : null;
            ui.renderScenarioTree();
            return;
        }
        
        if (e.target.id === 'node-type') {
            node.type = e.target.value;
            if (node.type === 'choice' && !node.choices) node.choices = [];
            if (node.type === 'conditional' && !node.conditions) node.conditions = [];
            if (node.type === 'variable' && !node.operations) node.operations = [];
            if (node.type === 'ui_control' && !node.uiOperations) node.uiOperations = [];
            
            ui.renderNodeEditor();
            ui.renderScenarioTree(); 
            return;
        }
        
        updateNodeData(e.target);
    });

    editorPanel.addEventListener('click', e => {
        const activeNodeId = state.getActiveNodeId();
        const activeSectionId = state.getActiveSectionId();
        if (!activeNodeId) return;
        const projectData = state.getProjectData();
        const node = projectData.scenario.sections[activeSectionId].nodes[activeNodeId];

        switch(e.target.id) {
            case 'delete-node-btn': deleteNode(); break;
            case 'add-choice-btn':
                if (node.type === 'choice') {
                    node.choices.push({ text: '新しい選択肢', nextNodeId: '' });
                    ui.renderChoicesEditor(node.choices);
                    ui.renderScenarioTree();
                }
                break;
            case 'add-condition-btn':
                if (node.type === 'conditional') {
                    node.conditions.push({ variable: '', operator: '==', compareValue: '', nextNodeId: '' });
                    ui.renderConditionsEditor(node.conditions);
                    ui.renderScenarioTree();
                }
                break;
        }
    });

    if (state.quill) {
        state.quill.on('text-change', () => {
            const activeNodeId = state.getActiveNodeId();
            const activeSectionId = state.getActiveSectionId();
            if (activeNodeId && activeSectionId) {
                const projectData = state.getProjectData();
                const node = projectData.scenario.sections[activeSectionId].nodes[activeNodeId];
                if (node && node.type === 'text') {
                    node.message = state.quill.root.innerHTML;
                }
            }
        });
    }

    // ドラッグ＆ドロップ イベントリスナー
    let draggedItem = null;

    if (treeContainer) {
        treeContainer.addEventListener('dragstart', e => {
            const nodeEl = e.target.closest('.tree-node');
            if (nodeEl) {
                draggedItem = nodeEl;
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', nodeEl.dataset.id);
                setTimeout(() => nodeEl.classList.add('dragging'), 0);
            }
        });

        treeContainer.addEventListener('dragend', e => {
            if (draggedItem) {
                draggedItem.classList.remove('dragging');
                draggedItem = null;
            }
            document.querySelectorAll('.tree-node').forEach(el => {
                el.style.borderTop = '';
                el.style.borderBottom = '';
            });
        });

       treeContainer.addEventListener('dragover', e => {
            e.preventDefault();
            
            // ドロップ対象: ノード または 章ヘッダー
            const targetNode = e.target.closest('.tree-node');
            const targetHeader = e.target.closest('.tree-section-header');
            
            if (!draggedItem) return;

            // A. ノードの上にいる場合
            if (targetNode && targetNode !== draggedItem) {
                const rect = targetNode.getBoundingClientRect();
                const next = (e.clientY - rect.top) / (rect.height) > 0.5;
                
                targetNode.style.borderTop = next ? '' : '2px solid #1890ff';
                targetNode.style.borderBottom = next ? '2px solid #1890ff' : '';
                targetNode.dataset.dropPos = next ? 'after' : 'before';
                
                // ヘッダーのスタイルは消す
                document.querySelectorAll('.tree-section-header').forEach(h => h.style.backgroundColor = '');
            }
            // B. 章ヘッダーの上にいる場合 (その章の末尾へ移動)
            else if (targetHeader) {
                // 自分自身の親セクションヘッダーでない場合のみハイライト
                const sourceSectionId = draggedItem.closest('.tree-section').querySelector('.tree-section-header').dataset.id;
                if (targetHeader.dataset.id !== sourceSectionId) {
                    targetHeader.style.backgroundColor = '#d6e4ff';
                }
                
                // ノードのスタイルは消す
                document.querySelectorAll('.tree-node').forEach(el => {
                    el.style.borderTop = '';
                    el.style.borderBottom = '';
                });
            }
        });
        
        treeContainer.addEventListener('dragleave', e => {
            const targetNode = e.target.closest('.tree-node');
            if (targetNode) {
                targetNode.style.borderTop = '';
                targetNode.style.borderBottom = '';
            }
            const targetHeader = e.target.closest('.tree-section-header');
            if (targetHeader) {
                targetHeader.style.backgroundColor = '';
            }
        });

        treeContainer.addEventListener('drop', e => {
            e.preventDefault();
            
            // スタイルリセット
            document.querySelectorAll('.tree-node').forEach(el => {
                el.style.borderTop = '';
                el.style.borderBottom = '';
            });
            document.querySelectorAll('.tree-section-header').forEach(h => h.style.backgroundColor = '');

            const targetNode = e.target.closest('.tree-node');
            const targetHeader = e.target.closest('.tree-section-header');
            
            if (!draggedItem) return;

            const sourceSectionEl = draggedItem.closest('.tree-section');
            const sourceSecId = sourceSectionEl.querySelector('.tree-section-header').dataset.id;
            const draggedId = draggedItem.dataset.id;

            // ケース1: ノード上にドロップ (挿入)
            if (targetNode && targetNode !== draggedItem) {
                const targetSecId = targetNode.closest('.tree-section').querySelector('.tree-section-header').dataset.id;
                const targetId = targetNode.dataset.id;
                const position = targetNode.dataset.dropPos || 'after';
                
                reorderNodes(sourceSecId, targetSecId, draggedId, targetId, position);
            }
            // ケース2: 章ヘッダー上にドロップ (末尾に追加)
            else if (targetHeader) {
                const targetSecId = targetHeader.dataset.id;
                
                // 自分の章へのドロップは無視（末尾移動ならアリだが、今回は誤操作防止のため変化なしとする）
                if (sourceSecId !== targetSecId) {
                    reorderNodes(sourceSecId, targetSecId, draggedId, null, 'after');
                }
            }
        });
    }
}
