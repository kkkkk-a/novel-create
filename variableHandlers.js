// variableHandlers.js (グループ管理対応版)

import * as state from './state.js';
import * as ui from './ui.js';

function addVariableGroup() {
    const name = prompt("新しいグループ名を入力してください:", "New Group");
    if (!name) return;
    
    const projectData = state.getProjectData();
    if (!projectData.variableGroups) projectData.variableGroups = ["基本 (Default)"];
    
    if (projectData.variableGroups.includes(name)) {
        alert("そのグループ名は既に存在します。");
        return;
    }
    
    projectData.variableGroups.push(name);
    ui.renderVariablesList();
}

function deleteVariableGroup(groupName) {
    if (groupName === "基本 (Default)") {
        alert("デフォルトグループは削除できません。");
        return;
    }
    
    const projectData = state.getProjectData();
    
    if (confirm(`グループ「${groupName}」を削除しますか？\n含まれる変数は「基本 (Default)」に移動します。`)) {
        // グループ内の変数をデフォルトに移動
        for (const key in projectData.variableMeta) {
            if (projectData.variableMeta[key].group === groupName) {
                projectData.variableMeta[key].group = "基本 (Default)";
            }
        }
        
        // グループ配列から削除
        projectData.variableGroups = projectData.variableGroups.filter(g => g !== groupName);
        ui.renderVariablesList();
    }
}

function addVariable() {
    const nameInput = document.getElementById('new-variable-name');
    const valueInput = document.getElementById('new-variable-value');
    // ★追加: グループ選択プルダウン
    const groupSelect = document.getElementById('new-variable-group');
    
    const varName = nameInput.value.trim();
    const groupName = groupSelect ? groupSelect.value : "基本 (Default)";
    
    if (!varName.match(/^[a-zA-Z0-9_$]+$/)) {
        alert('変数名は半角英数字とアンダースコア(_)のみ使用できます。');
        return;
    }
    if (varName.startsWith('$') || varName.startsWith('_')) {
        alert('「$」や「_」で始まる名前はシステム予約語です。');
        return;
    }

    const projectData = state.getProjectData();
    
    if (projectData.variables.hasOwnProperty(varName)) {
        alert('エラー: 同じ名前の変数がすでに存在します。');
        return;
    }

    const initialValue = valueInput.value.trim() || '0';
    projectData.variables[varName] = initialValue;
    
    // ★メタデータ保存
    if (!projectData.variableMeta) projectData.variableMeta = {};
    projectData.variableMeta[varName] = {
        group: groupName,
        comment: ""
    };

    nameInput.value = '';
    valueInput.value = '';
    
    ui.renderVariablesList();
    ui.updateVariableSelects();
}

function updateVariable(varName, newValue, fieldType) {
    const projectData = state.getProjectData();
    
    // メタデータ初期化
    if (!projectData.variableMeta) projectData.variableMeta = {};
    if (!projectData.variableMeta[varName]) {
        projectData.variableMeta[varName] = { group: "基本 (Default)", comment: "" };
    }

    if (fieldType === 'comment') {
        // コメント更新
        projectData.variableMeta[varName].comment = newValue;
    
    } else if (fieldType === 'group') {
        // ★追加: グループ移動処理
        projectData.variableMeta[varName].group = newValue;
        // 移動したことを反映させるため、リストを再描画
        ui.renderVariablesList();
    
    } else {
        // 値の更新
        if (projectData.variables.hasOwnProperty(varName)) {
            projectData.variables[varName] = newValue;
        }
    }
}

function deleteVariable(varName) {
    const projectData = state.getProjectData();
    if (projectData.variables.hasOwnProperty(varName)) {
        if (confirm(`変数「${varName}」を削除しますか？`)) {
            delete projectData.variables[varName];
            if (projectData.variableMeta && projectData.variableMeta[varName]) {
                delete projectData.variableMeta[varName];
            }
            
            ui.renderVariablesList();
            ui.updateVariableSelects();
        }
    }
}

// グループ選択肢の更新（追加フォーム用）
export function updateGroupSelect() {
    const select = document.getElementById('new-variable-group');
    if (!select) return;
    
    const projectData = state.getProjectData();
    const groups = projectData.variableGroups || ["基本 (Default)"];
    const current = select.value;
    
    select.innerHTML = '';
    groups.forEach(g => {
        select.add(new Option(g, g));
    });
    
    if (groups.includes(current)) {
        select.value = current;
    }
}

export function initVariableHandlers() {
    const variableModeContainer = document.getElementById('mode-variables');
    if (!variableModeContainer) return;

    // グループ追加ボタンなどのイベント
    variableModeContainer.addEventListener('click', e => {
        if (e.target.id === 'add-variable-btn') addVariable();
        if (e.target.id === 'add-group-btn') addVariableGroup();
        
        if (e.target.matches('.danger-button')) {
            const varName = e.target.dataset.varName;
            const groupName = e.target.dataset.groupName;
            
            if (varName) deleteVariable(varName);
            else if (groupName) deleteVariableGroup(groupName);
        }
    });

    // 値・コメント変更イベント
    variableModeContainer.addEventListener('change', e => {
        // input または select で、data-var-name を持つもの
        if ((e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') && e.target.dataset.varName) {
            updateVariable(
                e.target.dataset.varName, 
                e.target.value, 
                e.target.dataset.fieldType // 'comment' or 'group' or undefined
            );
        }
    });
    
    // タブが開かれた時にグループ選択肢を更新するために、observerやclickイベントを利用する手もあるが
    // ここでは renderVariablesList 呼び出し時にフックするのが簡単。
    // ※今回は ui.js の renderVariablesList とセットで updateGroupSelect を呼ぶ形にするか、
    // あるいはボタンクリック時にリストを更新する。
}
