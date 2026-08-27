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

function updateVariable(oldName, newNameOrValue, fieldType) {
    const projectData = state.getProjectData();
    
    // メタデータ初期化
    if (!projectData.variableMeta) projectData.variableMeta = {};
    if (!projectData.variableMeta[oldName]) {
        projectData.variableMeta[oldName] = { group: "基本 (Default)", comment: "" };
    }

    if (fieldType === 'comment') {
        // コメント更新
        projectData.variableMeta[oldName].comment = newNameOrValue;
    
    } else if (fieldType === 'group') {
        // グループ移動処理
        projectData.variableMeta[oldName].group = newNameOrValue;
        ui.renderVariablesList();
    
    } else if (fieldType === 'name') {
        // ★最適化: 変数名自体の変更（プロジェクト全域の書き換え・リネーム処理）
        const newName = newNameOrValue.trim();
        
        // 名前が空、または変更なし、または既に存在する名前なら何もしない
        if (!newName || newName === oldName || projectData.variables.hasOwnProperty(newName)) return;
        
        // 名前のバリデーション
        if (!newName.match(/^[a-zA-Z0-9_$]+$/)) {
            alert('変数名は半角英数字とアンダースコア(_)のみ使用できます。');
            ui.renderVariablesList(); // 表示を元に戻す
            return;
        }
        if (newName.startsWith('$') || newName.startsWith('_')) {
            alert('「$」や「_」で始まる名前はシステム予約語のため使用できません。');
            ui.renderVariablesList(); // 表示を元に戻す
            return;
        }

        if (confirm(`変数名「${oldName}」を「${newName}」に変更します。\nプロジェクト内でこの変数を使用しているすべての設定（条件分岐、アイテム効果など）も自動的に書き換わりますが、よろしいですか？`)) {
            
            // 1. 変数データ自体の引っ越し
            projectData.variables[newName] = projectData.variables[oldName];
            delete projectData.variables[oldName];
            
            projectData.variableMeta[newName] = projectData.variableMeta[oldName];
            delete projectData.variableMeta[oldName];

            // 2. プロジェクト全域の検索と置換（正規表現で単語境界を意識して安全に置換）
            const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const escapedOldName = escapeRegExp(oldName);
            // $ などを単語の一部として扱い、変数名の前後が英数字・アンダースコア・$でないことを条件に置換
            const replaceRegex = new RegExp(`(?<![a-zA-Z0-9_\\$])${escapedOldName}(?![a-zA-Z0-9_\\$])`, 'g');

            const replaceInStr = (str) => {
                if (typeof str === 'string') return str.replace(replaceRegex, newName);
                return str;
            };

            // A. シナリオノードの書き換え
            if (projectData.scenario && projectData.scenario.sections) {
                for (const secId in projectData.scenario.sections) {
                    const sec = projectData.scenario.sections[secId];
                    for (const nodeId in sec.nodes) {
                        const node = sec.nodes[nodeId];
                        
                        // テキスト内の {{変数名}} や計算式
                        if (node.message) node.message = replaceInStr(node.message);
                        if (node.customName) node.customName = replaceInStr(node.customName);
                        
                        // 変数操作ノード
                        if (node.type === 'variable' && node.operations) {
                            node.operations.forEach(op => {
                                if (op.targetVariable === oldName) op.targetVariable = newName;
                                if (op.value) op.value = replaceInStr(String(op.value));
                            });
                        }
                        
                        // 条件分岐ノード
                        if (node.type === 'conditional' && node.conditions) {
                            node.conditions.forEach(cond => {
                                if (cond.variable === oldName) cond.variable = newName;
                                if (cond.compareValue) cond.compareValue = replaceInStr(String(cond.compareValue));
                            });
                        }
                        
                        // ショップノード
                        if (node.type === 'shop' && node.currencyVar === oldName) {
                            node.currencyVar = newName;
                        }
                        
                        // UI操作ノード
                        if (node.type === 'ui_control' && node.uiOperations) {
                            node.uiOperations.forEach(op => {
                                if (op.gaugeCur === oldName) op.gaugeCur = newName;
                                if (op.gaugeMax === oldName) op.gaugeMax = newName;
                                if (op.textContent) op.textContent = replaceInStr(op.textContent);
                            });
                        }
                    }
                }
            }

            // B. アイテムの書き換え
            if (projectData.items) {
                for (const itemId in projectData.items) {
                    const item = projectData.items[itemId];
                    if (item.effects) {
                        for (const key in item.effects) {
                            if (typeof item.effects[key] === 'string') {
                                item.effects[key] = replaceInStr(item.effects[key]);
                            }
                        }
                    }
                }
            }

            // C. エネミーの書き換え (HPや攻撃力の計算式など)
            if (projectData.enemies) {
                for (const enId in projectData.enemies) {
                    const enemy = projectData.enemies[enId];
                    ['hp', 'stamina', 'staminaRegen', 'atk', 'def', 'spd', 'exp', 'pen', 'critRate', 'critMult', 'attackCooldown'].forEach(key => {
                        if (typeof enemy[key] === 'string') {
                            enemy[key] = replaceInStr(enemy[key]);
                        }
                    });
                }
            }

            // D. マップオブジェクトの出現条件とステータスの書き換え
            if (projectData.maps) {
                for (const mapId in projectData.maps) {
                    const map = projectData.maps[mapId];
                    if (map.objects) {
                        map.objects.forEach(obj => {
                            if (obj.condition && obj.condition.variable === oldName) obj.condition.variable = newName;
                            if (obj.condition && obj.condition.value) obj.condition.value = replaceInStr(String(obj.condition.value));
                            
                            ['hp', 'stamina', 'damage', 'defense', 'penetration', 'exp', 'attackCooldown'].forEach(key => {
                                if (typeof obj[key] === 'string') {
                                    obj[key] = replaceInStr(obj[key]);
                                }
                            });
                        });
                    }
                }
            }

            // E. アクションボタン (システム設定) の書き換え
            if (projectData.settings && projectData.settings.actionButtons) {
                projectData.settings.actionButtons.forEach(btn => {
                    if (btn.targetVar === oldName) btn.targetVar = newName;
                });
            }

            // UI更新
            ui.renderVariablesList();
            if (typeof ui.updateVariableSelects === 'function') {
                ui.updateVariableSelects();
            }
            alert(`変数名を「${newName}」に変更し、プロジェクト全体の設定を更新しました。`);
        } else {
            // キャンセルされた場合は表示を元に戻す
            ui.renderVariablesList();
        }

    } else {
        // 値(Value)の更新
        if (projectData.variables.hasOwnProperty(oldName)) {
            projectData.variables[oldName] = newNameOrValue;
        }
    }
}

function deleteVariable(varName) {
    const projectData = state.getProjectData();
    if (!projectData.variables.hasOwnProperty(varName)) return;

    // ★追加: 変数がどこで使われているかの依存関係チェック
    const usage = [];

    // 1. シナリオノードのチェック
    if (projectData.scenario && projectData.scenario.sections) {
        for (const secId in projectData.scenario.sections) {
            const sec = projectData.scenario.sections[secId];
            for (const nodeId in sec.nodes) {
                const node = sec.nodes[nodeId];
                let isUsed = false;
                
                if (node.type === 'variable' && node.operations) {
                    isUsed = node.operations.some(op => op.targetVariable === varName || (op.value && String(op.value).includes(varName)));
                } else if (node.type === 'conditional' && node.conditions) {
                    isUsed = node.conditions.some(cond => cond.variable === varName || (cond.compareValue && String(cond.compareValue).includes(varName)));
                } else if (node.type === 'shop' && node.currencyVar === varName) {
                    isUsed = true;
                } else if (node.type === 'ui_control' && node.uiOperations) {
                    isUsed = node.uiOperations.some(op => op.gaugeCur === varName || op.gaugeMax === varName);
                } else if (node.type === 'text' && node.message && node.message.includes(`{{${varName}}}`)) {
                    isUsed = true; // テキスト内の表示埋め込み
                }

                if (isUsed) usage.push(`・シナリオ章[${sec.name}] のノード`);
            }
        }
    }

    // 2. アイテムのチェック
    if (projectData.items) {
        for (const itemId in projectData.items) {
            const item = projectData.items[itemId];
            if (item.effects && item.effects.variable && item.effects.variable.includes(varName)) {
                usage.push(`・アイテム[${item.name}] の効果`);
            }
        }
    }

    // 3. アクションボタン (システム設定)
    if (projectData.settings && projectData.settings.actionButtons) {
        const isUsed = projectData.settings.actionButtons.some(btn => btn.targetVar === varName);
        if (isUsed) usage.push(`・システム設定(アクションボタン)`);
    }

    // 警告メッセージの構築
    let confirmMsg = `変数「${varName}」を削除しますか？`;
    if (usage.length > 0) {
        // 重複を除去
        const uniqueUsage = [...new Set(usage)];
        confirmMsg = `⚠️ 警告: この変数は以下の場所で使用されています！\n削除するとゲームの進行や計算式が壊れる可能性があります。\n\n${uniqueUsage.slice(0, 8).join('\n')}${uniqueUsage.length > 8 ? '\n...他' : ''}\n\nそれでも強制的に削除しますか？`;
    }

    // 確認と削除実行
    if (confirm(confirmMsg)) {
        delete projectData.variables[varName];
        if (projectData.variableMeta && projectData.variableMeta[varName]) {
            delete projectData.variableMeta[varName];
        }
        
        ui.renderVariablesList();
        // UI側のドロップダウン（マップ・アイテム設定等）も更新
        if (typeof ui.updateVariableSelects === 'function') {
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
                e.target.dataset.fieldType // 'name' or 'comment' or 'group' or undefined
            );
        }
    });
    
    // タブが開かれた時にグループ選択肢を更新するために、observerやclickイベントを利用する手もあるが
    // ここでは renderVariablesList 呼び出し時にフックするのが簡単。
    // ※今回は ui.js の renderVariablesList とセットで updateGroupSelect を呼ぶ形にするか、
    // あるいはボタンクリック時にリストを更新する。
}