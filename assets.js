import * as state from './state.js';
import * as ui from './ui.js';
import { pixelsToWebPDataURL } from './utils.js';

async function processFiles(files, type, acceptString) {
    if (!files || files.length === 0) return;

    // ファイルリストを配列化
    const fileArray = Array.from(files);

    // --- MMDモデル (.pmx / .pmd) の一括読み込み判定 ---
    if (type === 'models') {
        const mmdModelFile = fileArray.find(f => 
            f.name.toLowerCase().endsWith('.pmx') || f.name.toLowerCase().endsWith('.pmd')
        );

        if (mmdModelFile) {
            try {
                const readFileAsDataURL = (file) => {
                    return new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = (e) => resolve({ name: file.name, data: e.target.result });
                        reader.onerror = (e) => reject(e);
                        reader.readAsDataURL(file);
                    });
                };

                const modelResult = await readFileAsDataURL(mmdModelFile);
                
                // ファイル名で除外判定を行う
                const textureFiles = fileArray.filter(f => f.name !== mmdModelFile.name);
                
                if (textureFiles.length === 0) {
                    console.warn("⚠️ テクスチャファイルが見つかりません。");
                }

                const textureResults = await Promise.all(textureFiles.map(f => readFileAsDataURL(f)));

                const resources = {};
                textureResults.forEach(res => {
                    resources[res.name] = res.data;
                });

                const projectData = state.getProjectData();
                const id = `model_mmd_${Date.now()}_${Math.floor(Math.random()*1000)}`;
                
                projectData.assets.models[id] = {
                    name: mmdModelFile.name, // 拡張子付きのまま保存
                    format: 'mmd',
                    data: modelResult.data,
                    resources: resources
                };

                ui.renderAssetList(type);
                ui.updateAssetDropdowns();
                
                if (textureFiles.length === 0) {
                    alert(`MMDモデル「${mmdModelFile.name}」を読み込みました。\n(テクスチャなし)`);
                } else {
                    alert(`MMDモデル「${mmdModelFile.name}」と、関連ファイル${textureFiles.length}個を読み込みました。`);
                }
                return;

            } catch (err) {
                console.error("MMD Load Error:", err);
                alert("MMDモデルの読み込みに失敗しました。");
                return;
            }
        }
    }

    // --- 通常のアセット読み込み処理 ---
    const allowedExts = acceptString.split(',').map(ext => ext.trim().toLowerCase());
    
    for (const file of fileArray) {
        const fileExtension = file.name.split('.').pop().toLowerCase();
        
        // JSON処理 (スプライトシート)
        if (fileExtension === 'json') {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const json = JSON.parse(event.target.result);
                    if (json.pixels && Array.isArray(json.pixels) && json.width && json.height) {
                        const id = `${type.slice(0, -1)}_${Date.now()}_${Math.floor(Math.random()*1000)}`;
                        const projectData = state.getProjectData();
                        const webPDataUrl = pixelsToWebPDataURL(json.pixels, json.width, json.height, 85); 
                        
                        projectData.assets[type][id] = { 
                            name: file.name, // ★修正: 拡張子(.json)を消さずにそのまま使う
                            data: webPDataUrl, 
                            isSpriteSheet: true,
                            width: json.width, height: json.height,
                            cols: json.cols || 1, rows: json.rows || 1, fps: json.fps || 12, loop: json.loop !== undefined ? json.loop : true
                        };
                        ui.renderAssetList(type); 
                        ui.updateAssetDropdowns();
                        alert(`アニメーションJSON「${file.name}」を読み込みました！`);
                    } else { 
                        console.warn(`Invalid JSON structure: ${file.name}`);
                    }
                } catch(err) { console.error(`JSON Error: ${file.name}`, err); }
            };
            reader.readAsText(file);
            continue;
        }

        // 拡張子チェック
        const isSoundType = (type === 'sounds');
        const soundExts = ['mp3', 'ogg', 'opus', 'webm'];
        const isVideoBg = (type === 'backgrounds' && (fileExtension === 'webm' || fileExtension === 'mp4'));
        const isVMD = (type === 'animations' && fileExtension === 'vmd'); 

        const isAllowed = allowedExts.includes(fileExtension) || (isSoundType && soundExts.includes(fileExtension)) || isVideoBg || isVMD;
        
        if (!isAllowed) { 
            if (type !== 'models') console.warn(`Skipped unsupported file: ${file.name}`);
            continue; 
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const id = `${type.slice(0, -1)}_${Date.now()}_${Math.floor(Math.random()*1000)}`;
                const projectData = state.getProjectData();
                
                // データ保存
                projectData.assets[type][id] = { 
                    name: file.name, // 拡張子付きのまま保存
                    data: event.target.result, 
                    format: (fileExtension === 'vmd') ? 'vmd' : 'unknown',
                    cols: 1, rows: 1, fps: 12, loop: true
                };
                
                // 3Dモデルの形式判定 (VRM/GLBなど)
                if (type === 'models') {
                    if (fileExtension === 'vrm') projectData.assets[type][id].format = 'vrm';
                    else if (fileExtension === 'glb' || fileExtension === 'gltf') projectData.assets[type][id].format = 'glb';
                }

                if (type === 'characters' || type === 'backgrounds') {
                    if (event.target.result.startsWith('data:image')) {
                        const img = new Image();
                        img.onload = () => {
                            projectData.assets[type][id].width = img.width;
                            projectData.assets[type][id].height = img.height;
                            ui.renderAssetList(type);
                        };
                        img.src = event.target.result;
                    }
                }
                ui.renderAssetList(type); 
                ui.updateAssetDropdowns();
            } catch (err) { console.error(err); alert(`Load Error: ${file.name}`); }
        };
        reader.readAsDataURL(file);
    }
}


/**
 * HTML要素へドラッグ＆ドロップイベントを設定します
 */
function setupAssetManager(type, fileInputId, accept) {
    const fileInput = document.getElementById(fileInputId);
    if (!fileInput) return;
    
    fileInput.addEventListener('change', (e) => { 
        processFiles(e.target.files, type, accept); 
        fileInput.value = ''; 
    });
    
    const dropZone = fileInput.closest('.asset-uploader');
    if (dropZone) {
        dropZone.addEventListener('dragover', (e) => { 
            e.preventDefault(); e.stopPropagation(); dropZone.classList.add('drag-over'); 
        });
        dropZone.addEventListener('dragleave', (e) => { 
            e.preventDefault(); e.stopPropagation(); dropZone.classList.remove('drag-over'); 
        });
        dropZone.addEventListener('drop', (e) => { 
            e.preventDefault(); e.stopPropagation(); dropZone.classList.remove('drag-over'); 
            const files = e.dataTransfer.files; 
            if (files && files.length > 0) { 
                processFiles(files, type, accept); 
            } 
        });
    }
}

export function initAssetHandlers() {
    setupAssetManager('characters', 'character-file-input', 'webp,json'); 
    setupAssetManager('backgrounds', 'background-file-input', 'webp,json,webm,mp4');
    setupAssetManager('sounds', 'sound-file-input', 'mp3,ogg,opus,webm');
    setupAssetManager('models', 'model-file-input', 'vrm,glb,gltf,pmx,pmd,png,jpg,bmp,tga,spa,sph');
    setupAssetManager('animations', 'animation-file-input', 'vrma,vmd'); 

    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;
    
    mainContent.addEventListener('change', (e) => {
        if (e.target.matches('.asset-card input[type="text"]')) { handleAssetNameChange(e); }
        if (e.target.matches('.asset-card input[data-setting], .asset-card input[type="checkbox"]')) { handleAnimSettingChange(e); }
    });
    mainContent.addEventListener('click', (e) => {
        if (e.target.matches('.asset-card .danger-button')) { handleAssetDelete(e); }
    });
}

function handleAssetNameChange(e) {
    const { id, type } = e.target.dataset;
    if (!id || !type) return;
    const projectData = state.getProjectData();
    if (projectData.assets[type] && projectData.assets[type][id]) {
        const newName = e.target.value.trim();
        if (newName) { projectData.assets[type][id].name = newName; ui.updateAssetDropdowns(); }
        else { alert("空欄不可"); e.target.value = projectData.assets[type][id].name; }
    }
}


function checkAssetUsage(id, type) {
    const projectData = state.getProjectData();
    const usage = [];

    // 1. シナリオ (Scenario) のチェック
    if (projectData.scenario && projectData.scenario.sections) {
        for (const secId in projectData.scenario.sections) {
            const section = projectData.scenario.sections[secId];
            for (const nodeId in section.nodes) {
                const node = section.nodes[nodeId];
                let isUsed = false;

                if (node.type === 'text') {
                    if (type === 'backgrounds' && node.backgroundId === id) isUsed = true;
                    if (type === 'sounds' && (node.bgmId === id || node.soundId === id)) isUsed = true;
                    if (type === 'characters' && node.characters?.some(c => c.characterId === id || c.maskId === id)) isUsed = true;
                    if (type === 'models' && node.characters3d?.some(c => c.modelId === id)) isUsed = true;
                    if (type === 'animations' && node.characters3d?.some(c => c.animationId === id)) isUsed = true;
                } else if (['shop', 'battle'].includes(node.type)) {
                    if (type === 'backgrounds' && node.backgroundId === id) isUsed = true;
                    if (type === 'sounds' && node.bgmId === id) isUsed = true;
                }

                if (isUsed) usage.push(`・シナリオ章[${section.name}] のノード`);
            }
        }
    }

    // 2. マップ (Maps) のチェック
    if (projectData.maps) {
        for (const mapId in projectData.maps) {
            const map = projectData.maps[mapId];
            let isUsed = false;

            if (type === 'backgrounds' && (map.bgImageId === id || map.bgOutsideId === id)) isUsed = true;
            if (type === 'sounds' && map.bgmId === id) isUsed = true;
            if (type === 'models' && map.stageModelId === id) isUsed = true;

            if (map.objects?.some(obj => 
                (type === 'characters' && [obj.charId, obj.charIdMove, obj.charIdAttack, obj.charIdDamage].includes(id)) ||
                (type === 'models' && obj.modelId === id)
            )) isUsed = true;

            if (isUsed) usage.push(`・マップ[${map.name}]`);
        }
    }

    // 3. プレイヤー設定 (Player)
    const p = projectData.player || {};
    if ((type === 'characters' && [p.imageId, p.imageIdMove, p.imageIdAttack, p.imageIdDamage, p.imageIdJump].includes(id)) ||
        (type === 'models' && p.modelId === id) ||
        (type === 'animations' && [p.animIdIdle, p.animIdMove, p.animIdAttack, p.animIdDamage, p.animIdJump].includes(id))) {
        usage.push(`・プレイヤー初期設定`);
    }

    // 4. アイテム (Items)
    if (projectData.items) {
        for (const itemId in projectData.items) {
            const item = projectData.items[itemId];
            if ((type === 'characters' && item.iconImage === id) || 
                (type === 'sounds' && item.effects?.sound === id)) {
                usage.push(`・アイテム[${item.name}]`);
            }
        }
    }

    // 5. エネミー (Enemies)
    if (projectData.enemies) {
        for (const enId in projectData.enemies) {
            const enemy = projectData.enemies[enId];
            if ((type === 'characters' && [enemy.imageId, enemy.imageIdMove, enemy.imageIdAttack, enemy.imageIdDamage].includes(id)) ||
                (type === 'models' && enemy.modelId === id)) {
                usage.push(`・エネミー[${enemy.name}]`);
            }
        }
    }
    
    // 6. システム設定 (Settings)
    const s = projectData.settings || {};
    if (type === 'backgrounds' && (s.windowImage === id || s.buttonImage === id || s.titleImage === id || s.favicon === id)) {
        usage.push(`・システムUI設定`);
    }

    return [...new Set(usage)]; // 重複を除去して返す
}

// ★修正: 既存の handleAssetDelete を書き換え
function handleAssetDelete(e) {
    const { id, type } = e.target.dataset;
    if (!id || !type) return;
    
    const projectData = state.getProjectData();
    if (!projectData.assets[type] || !projectData.assets[type][id]) return;

    // 使用状況チェックを実行
    const usage = checkAssetUsage(id, type);

    let confirmMsg;
    if (usage.length > 0) {
        const displayList = usage.slice(0, 10).join("\n");
        const more = usage.length > 10 ? `\n...他 ${usage.length - 10} 箇所` : "";
        confirmMsg = `⚠️ 警告: この素材は以下の場所で使用されています！\n削除すると表示エラーやリンク切れが発生します。\n\n${displayList}${more}\n\nそれでも本当に削除しますか？`;
    } else {
        confirmMsg = `この素材を削除しますか？\n(現在のプロジェクト内では使用されていないようです)`;
    }

    if (confirm(confirmMsg)) {
        if (type === 'models' && window.threeHandler?.unloadModel) {
            window.threeHandler.unloadModel(id);
        }
        delete projectData.assets[type][id];
        ui.renderAssetList(type);
        ui.updateAssetDropdowns();
    }
}

function handleAnimSettingChange(e) {
    const { id, type, setting } = e.target.dataset;
    if (!id || !type) return;
    const projectData = state.getProjectData();
    const asset = projectData.assets[type][id];
    if (!asset) return;
    if (setting === 'loop') asset.loop = e.target.checked;
    else { const value = parseInt(e.target.value, 10); if (!isNaN(value) && value >= 1) asset[setting] = value; }
    ui.updateAssetDropdowns();
}
