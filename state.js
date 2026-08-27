// state.js (Ultimate Final 3D Version - Fixed with $)

// Quill Rich Text Editorのインスタンスを先に初期化
export let quill = null;

export function initQuill() {
    const editorEl = document.getElementById('rich-text-editor');
    if (!editorEl) {
        console.warn("Quill: editor element not found!");
        return;
    }
    
    const Font = Quill.import('formats/font');
    Font.whitelist = [
        'sans-serif', 'serif', 'monospace', 'dotgothic', 'rounded', 'klee', 'mincho-b'
    ];
    Quill.register(Font, true);

    quill = new Quill(editorEl, {
        theme: 'snow',
        modules: {
            toolbar: [
                [{ 'font': Font.whitelist }],
                ['bold', 'italic', 'underline'],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'size': ['small', false, 'large', 'huge'] }],
                [{ 'align': [] }],
                ['clean']
            ]
        }
    });
}


// --- アプリケーションの状態 ---

// 1. プロジェクトデータ
let projectData = {
    assets: {
        characters: {}, backgrounds: {}, sounds: {}, models: {}, animations: {}
    },
    variables: {},
    variableGroups: ["基本 (Default)"],
    variableMeta: {},
    items: {},
    enemies: {},
    particles: {}, 
    player: {
        inventory: {},
        equipment: [],
        shortcuts: {},
        $name: "主人公",
        extraJumps: 0,
        wallJump: false,
        $hp: "10", $maxHp: "10", $atk: "1", $def: "0", $spd: "4",
        $actMode: 0, $isLockedOn: 0, $lockonTargetId: null,
        $stamina: "100", $maxStamina: "100",
        $magazine: "30", $maxMagazine: "30",
        $level: 1, $exp: 0, $nextExp: 100,
        $forceOn: 0, $forceX: 0, $forceY: 0, $forceSpd: 0,

        width: 32, height: 32,
        maxEquipSlots: 1, initialLevel: "1", maxLevel: "50", growthType: 'normal',
        limitHp: "100", limitAtk: "10", limitDef: "10", limitSpd: "6", limitStamina: "150", limitStaminaRegen: "50", limitPenetration: "10",
        defense: "0", penetration: "1",
        attackRange: "32", attackSize: "32", attackCooldown: "20", projectileSpeed: "0",
        maxStamina: "100", staminaRegen: "20",
        jumpPower: "8.0", magazineSize: "30", reloadTime: "2.0",
        criticalRate: "5", criticalMultiplier: "2.0", overheadType: 'none',
        
        dashConsume: false, dashCost: "0.5", jumpConsume: false, jumpCost: "10",
        attackConsume: false, attackCost: "20", guardConsume: false, guardCost: "0.5",
        invincibleConsume: false, invincibleCost: "1.0",
        blastRadius: "0", blastDamageRate: "50",

        exhaustionDuration: "3.0", exhaustionRecover: 'gradual', exhaustionMove: 'normal',
        exhaustionNoAction: true, exhaustionNoItem: false, exhaustionAtkZero: false, exhaustionDefZero: false, exhaustionDmgDouble: false, exhaustionCrit: false,
        
        modelId: '', imageId: '', imageIdMove: '', imageIdAttack: '', imageIdJump: '', imageIdDamage: '',
        animIdIdle: '', animIdMove: '', animIdAttack: '', animIdJump: '', animIdDamage: ''
    },
    scenario: { startNodeId: null, sections: {} },
    maps: {},
    settings: {
        gameTitle: "", gameCopyright: "", gameGuideline: "",
        windowColor: '#000000', windowOpacity: 75, windowBgTransparent: false, windowImage: null,
        buttonColor: '#1990ff', buttonOpacity: 80, buttonBgTransparent: false, buttonImage: null, buttonTextColor: '#FFFFFF',
        borderRadius: 10, borderWidth: 2, borderColor: '#FFFFFF',
        backgroundFit: 'cover',   // ★追加: 背景の表示モード
        lowResMode: false,        // ★追加: 低負荷モード
        enableHideMsg: true,      // ★追加: ウィンドウ非表示
        showSaveMenu: true, showItemBtn: true, showLogBtn: true, showConfigBtn: true, showAutoBtn: true, showSkipBtn: true, showPauseBtn: true, // ★追加: システムメニュー
        showTitleBtn: true, 
        debugMode: false, shopDetailed: true, // ★追加: デバッグ等
        autoShakeOnDamage: true, showPopups: true, flashOnItemUse: true, flashOnInvincible: true,
        actionButtons: [
            { id: "btn_1", label: "CHECK", key: "Space", type: "check", targetVar: "" },
            { id: "btn_2", label: "ATK",   key: "KeyZ",  type: "attack", targetVar: "" },
            { id: "btn_3", label: "JUMP",  key: "KeyX",  type: "jump", targetVar: "" },
            { id: "btn_4", label: "DASH",  key: "ShiftLeft", type: "dash", targetVar: "" },
            { id: "btn_5", label: "GUARD", key: "KeyC",  type: "guard", targetVar: "" }
        ],
        portraitUI: {
            windowVertical: 'bottom', windowHeight: 35,
            choiceLayout: 'center-v', choiceDirection: 'vertical', choiceAlign: 'center', characterOffsetY: 0
        }
    }
};

// 2. UI状態
let activeMode = 'scenario';
let activeSectionId = null;
let activeNodeId = null;

// --- Getter / Setter ---

export function getProjectData() { return projectData; }
export function getActiveMode() { return activeMode; }
export function getActiveSectionId() { return activeSectionId; }
export function getActiveNodeId() { return activeNodeId; }

export function setProjectData(newData) {
    // 1. Settings (システム設定) の補完
    const defaultSettings = {
        gameTitle: "", gameCopyright: "", gameGuideline: "",
        windowColor: '#000000', windowOpacity: 75, windowBgTransparent: false, windowImage: null,
        buttonColor: '#1990ff', buttonOpacity: 80, buttonBgTransparent: false, buttonImage: null, buttonTextColor: '#FFFFFF',
        borderRadius: 10, borderWidth: 2, borderColor: '#FFFFFF',
        backgroundFit: 'cover',
        lowResMode: false,
        enableHideMsg: true,
        showSaveMenu: true, showItemBtn: true, showLogBtn: true, showConfigBtn: true, showAutoBtn: true, showSkipBtn: true, showPauseBtn: true,
        debugMode: false, shopDetailed: true,
        autoShakeOnDamage: true, showPopups: true, flashOnItemUse: true, flashOnInvincible: true,
        actionButtons: [
            { id: "btn_1", label: "CHECK", key: "Space", padBtn: 0, type: "check", targetVar: "" },
            { id: "btn_2", label: "ATK",   key: "KeyZ",  padBtn: 2, type: "attack", targetVar: "" },
            { id: "btn_3", label: "JUMP",  key: "KeyX",  padBtn: 1, type: "jump", targetVar: "" },
            { id: "btn_4", label: "DASH",  key: "ShiftLeft", padBtn: 4, type: "dash", targetVar: "" }
        ]
    };

    newData.settings = { ...defaultSettings, ...(newData.settings || {}) };
    const defaultPortrait = {
        windowVertical: 'bottom', windowHeight: 35,
        choiceDirection: 'vertical', choiceAlign: 'center', characterOffsetY: 0
    };
    newData.settings.portraitUI = { ...defaultPortrait, ...(newData.settings.portraitUI || {}) };

    // 2. Player (プレイヤー初期ステータス) の補完
    const defaultPlayer = {
        equipment: [],
        maxEquipSlots: 1,
        shortcuts: {},
        $name: "主人公", 
        extraJumps: 0,
        wallJump: false,
        $hp: 10, $maxHp: 10, $atk: 1, $spd: 1.0, $actMode: 0,
        width: 32, height: 32,
        $isLockedOn: 0, $lockonTargetId: null,
        $stamina: 100, $maxStamina: 100, $magazine: 30,
        $forceOn: 0, $forceX: 0, $forceY: 0, $forceSpd: 0,
        
        limitHp: "100", limitAtk: "10", limitDef: "10", limitSpd: "6", 
        limitStamina: "150", limitStaminaRegen: "50", limitPenetration: "10",
        
        def: 0, penetration: 1,
        attackRange: 32, attackSize: 32, projectileSpeed: 0,
        maxStamina: 100, staminaRegen: 20,
        jumpPower: 8.0, magazineSize: 30, reloadTime: 2.0,
        criticalRate: 5, criticalMultiplier: 2.0, overheadType: 'none',
        imageId: '', imageIdMove: '', imageIdAttack: '', imageIdJump: '', imageIdDamage: '',
        animIdIdle: '', animIdMove: '', animIdAttack: '', animIdJump: '', animIdDamage: '',
                dashConsume: false, dashCost: 0.5,
        jumpConsume: false, jumpCost: 10,
        attackConsume: false, attackCost: 20,
                blastRadius: 0,       // 爆発範囲 (0なら爆発なし)
        blastDamageRate: 50,  // 爆発ダメージ倍率 (%)
        invincibleConsume: false, invincibleCost: 1.0, 
        guardConsume: false, guardCost: 0.5, 
        
        dodgeConsume: true, dodgeCost: 15, dodgeSpeed: 3.0, dodgeInvincible: 20,
        guardStaminaMult: 2.0, // ガード時に受けるスタミナダメージ倍率

               exhaustionDuration: 3.0,   // 回復不能時間 (秒)
        exhaustionRecover: 'gradual', // 'gradual'(徐々に) or 'full'(一気に全快)
        exhaustionMove: 'normal',  // 'normal'(動ける), 'slow'(歩行のみ), 'stop'(動けない)
        exhaustionNoAction: true,  // アクション(攻撃/ジャンプ/ダッシュ)不可
        exhaustionNoItem: false,   // アイテム使用不可
        exhaustionAtkZero: false,  // 攻撃力0
        exhaustionDefZero: false,  // 防御力0
        exhaustionDmgDouble: false, // 被ダメージ2倍
        exhaustionCrit: false 
    };
    // 既存データ(newData.player)を優先しつつ、足りないキーをdefaultPlayerで埋める
    newData.player = { ...defaultPlayer, ...(newData.player || {}) };

    // 3. Assets/Maps の初期化
    if (!newData.assets.models) newData.assets.models = {};
    if (!newData.assets.animations) newData.assets.animations = {};
    if (!newData.maps) newData.maps = {};

    // 4. マップ内オブジェクトのパラメータ補完 (古いデータ対策)
    for (const mapId in newData.maps) {
        const map = newData.maps[mapId];
        if (map.bgmId === undefined) map.bgmId = '';
        if (map.gameoverEventNodeId === undefined) map.gameoverEventNodeId = '';

        if (map.objects) {
            map.objects.forEach(obj => {
                if (obj.defense === undefined) obj.defense = 0;
                if (obj.penetration === undefined) obj.penetration = 1;
                if (obj.hasDeadEvent === undefined) obj.hasDeadEvent = false;
                if (obj.deadEventList === undefined) obj.deadEventList = [{ nodeId: '' }];
                if (obj.showHpBar === undefined) obj.showHpBar = false;
            });
        }
    }

    // バトルノードのデータ形式を複数対応(配列)に変換
    if (newData.scenario && newData.scenario.sections) {
        for (const sId in newData.scenario.sections) {
            const section = newData.scenario.sections[sId];
            for (const nId in section.nodes) {
                const node = section.nodes[nId];
                if (node.type === 'battle') {
                    // 古い形式(単一ID)があれば配列へ移行
                    if (node.enemyId && !node.enemyIds) {
                        node.enemyIds = [node.enemyId];
                        delete node.enemyId;
                    }
                    // 配列がない場合は初期化
                    if (!node.enemyIds) node.enemyIds = [];
                }
            }
        }
    }

    // 5. データ適用
    if (newData && newData.scenario && newData.assets && newData.variables) {
        
        // ★追加: 変数管理用のメタデータ補完
        if (!newData.variableGroups) {
            newData.variableGroups = ["基本 (Default)"]; // デフォルトグループ
        }
        if (!newData.variableMeta) {
            newData.variableMeta = {}; // { "varName": { group: "基本", comment: "説明" } }
        }

        // 既存の変数がメタデータを持っていない場合、デフォルトグループに割り当て
        for (const key in newData.variables) {
            if (!newData.variableMeta[key]) {
                newData.variableMeta[key] = { group: "基本 (Default)", comment: "" };
            }
        }

        Object.keys(projectData).forEach(key => delete projectData[key]);
        Object.assign(projectData, newData);
    } else {
        alert("無効なプロジェクトデータのため、読み込みを中断しました。");
    }
}

export function setActiveMode(mode) { activeMode = mode; }
export function setActiveSectionId(id) { activeSectionId = id; }
export function setActiveNodeId(id) { activeNodeId = id; }

export const modelExpressionCache = {};

let threeHandlerInstance = null;
export function setThreeHandler(instance) { threeHandlerInstance = instance; }
export function getVrmsCache() { return (threeHandlerInstance && threeHandlerInstance.vrms) ? threeHandlerInstance.vrms : null; }

export function generateId(prefix) {
    const d = new Date();
    
    // YYYYMMDD の部分を作成 (月は0から始まるので+1する)
    const dateStr = d.getFullYear() + 
                  String(d.getMonth() + 1).padStart(2, '0') + 
                  String(d.getDate()).padStart(2, '0');

    // HHMMSS の部分を作成
    const timeStr = String(d.getHours()).padStart(2, '0') + 
                  String(d.getMinutes()).padStart(2, '0') + 
                  String(d.getSeconds()).padStart(2, '0');

    // ミリ秒の部分を作成
    const msStr = String(d.getMilliseconds()).padStart(3, '0');

    // 重複防止用のランダムな文字列 (念のため)
    const randomStr = Math.random().toString(36).substr(2, 3);
    
    // 全てを連結して返す
    return `${prefix}_${dateStr}_${timeStr}_${msStr}_${randomStr}`;
}