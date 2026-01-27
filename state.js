// state.js (Ultimate Final 3D Version - Fixed with $)

// Quill Rich Text Editorのインスタンスを先に初期化
const Font = Quill.import('formats/font');
Font.whitelist = [
    'sans-serif', 'serif', 'monospace', 'dotgothic', 'rounded', 'klee', 'mincho-b'
];
Quill.register(Font, true);

export const quill = new Quill('#rich-text-editor', {
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

// --- アプリケーションの状態 ---

// 1. プロジェクトデータ
let projectData = {
    assets: {
        characters: {}, backgrounds: {}, sounds: {}, models: {}, animations: {}
    },
    variables: {},
    items: {},
    enemies: {},
    particles: {}, 
player: {
        inventory: {},
        // --- 変動ステータス ($が付くもの) ---
         $name: "主人公",
        $hp: 10,
        $maxHp: 10,
        $atk: 1,
        $def: 0, // ★追加: 変動防御力も必要になります
        $spd: 4,
        $actMode: 0,
        $isLockedOn: 0,
        $lockonTargetId: null,
        $stamina: 100, $maxStamina: 100,
        $magazine: 30, $maxMagazine: 30,
        
        // ★★★ 追加: レベル・経験値システム用 ($変数) ★★★
        $level: 1,
        $exp: 0,
        $nextExp: 100,

        // --- 強制移動用 ---
        $forceOn: 0, $forceX: 0, $forceY: 0, $forceSpd: 0,

        // --- 固定設定 (初期値) ---
        maxEquipSlots: 1,
        initialLevel: 1,
        maxLevel: 50,
        growthType: 'normal', // 'fast', 'normal', 'slow'

        // --- ★追加: カンスト時(最大レベル時)のステータス ---
        // ※「limit」は最大レベル時の値。「init」はレベル1の値（既存の値を流用）
        limitHp: 100,
        limitAtk: 10,
        limitDef: 5,
        limitSpd: 6,
        limitStamina: 100,

        // (既存のパラメータ...)
        defense: 0, // ← これが初期防御力(initDef)扱いになります
        penetration: 1,

        attackRange: 32,
        attackSize: 32,
        projectileSpeed: 0, // 0=近接, 1以上=射撃
        maxStamina: 100,
        staminaRegen: 20,
        jumpPower: 8.0,
        magazineSize: 30,
        reloadTime: 2.0,
        criticalRate: 5,
        criticalMultiplier: 2.0,
        overheadType: 'none', // 'none', 'hp', 'stamina', 'both'
        modelId: '',
        // --- ビジュアル設定 (画像・アニメーションID) ---
        imageId: '',
        imageIdMove: '',
        imageIdAttack: '',
        imageIdJump: '',
        imageIdDamage: '',

        animIdIdle: '',
        animIdMove: '',
        animIdAttack: '',
        animIdJump: '',
        animIdDamage: ''
    },
    scenario: { startNodeId: null, sections: {} },
    maps: {},
    settings: {
        windowColor: '#000000', windowOpacity: 75, windowBgTransparent: false, windowImage: null,
        buttonColor: '#1990ff', buttonOpacity: 80, buttonBgTransparent: false, buttonImage: null, buttonTextColor: '#FFFFFF',
        borderRadius: 10, borderWidth: 2, borderColor: '#FFFFFF',
               actionButtons: [
            { id: "btn_1", label: "CHECK", key: "Space", type: "check", targetVar: "" },     // 会話・調べる
            { id: "btn_2", label: "ATK",   key: "KeyZ",  type: "attack", targetVar: "" },    // 攻撃
            { id: "btn_3", label: "JUMP",  key: "KeyX",  type: "jump", targetVar: "" },      // ジャンプ
            { id: "btn_4", label: "DASH",  key: "ShiftLeft", type: "dash", targetVar: "" }, // ダッシュ
            { id: "btn_5", label: "GUARD", key: "KeyC",  type: "guard", targetVar: "" }      // ガード
        ],
    },
    portraitUI: {
        windowVertical: 'bottom', windowHeight: 35,
        choiceDirection: 'vertical', choiceAlign: 'center', characterOffsetY: 0
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

// ★★★ ここを修正: 読み込み時にデフォルト値を完全に反映させる ★★★
export function setProjectData(newData) {
    // 1. Settings (システム設定) の補完
    const defaultSettings = {
        windowColor: '#000000', windowOpacity: 75, windowBgTransparent: false, windowImage: null,
        buttonColor: '#1990ff', buttonOpacity: 80, buttonBgTransparent: false, buttonImage: null, buttonTextColor: '#FFFFFF',
        borderRadius: 10, borderWidth: 2, borderColor: '#FFFFFF',
        actionButtons: [
            { id: "btn_1", label: "CHECK", key: "Space", type: "check", targetVar: "" },
            { id: "btn_2", label: "ATK",   key: "KeyZ",  type: "attack", targetVar: "" },
            { id: "btn_3", label: "JUMP",  key: "KeyX",  type: "jump", targetVar: "" },
            { id: "btn_4", label: "DASH",  key: "ShiftLeft", type: "dash", targetVar: "" }
        ],
        autoShakeOnDamage: true,
        showPopups: true,
        flashOnItemUse: true,
        flashOnInvincible: true,
                showConfigBtn: true, // 音量設定 (デフォルトON)
        showPauseBtn: true,  // ポーズ (デフォルトON)
    };

    newData.settings = { ...defaultSettings, ...(newData.settings || {}) };

    // Portrait UI の補完
    const defaultPortrait = {
        windowVertical: 'bottom', windowHeight: 35,
        choiceDirection: 'vertical', choiceAlign: 'center', characterOffsetY: 0
    };
    newData.settings.portraitUI = { ...defaultPortrait, ...(newData.settings.portraitUI || {}) };

    // 2. Player (プレイヤー初期ステータス) の補完
    // ★重要: 古いデータには $stamina や $forceOn が無いので、ここで強制的にマージします
    const defaultPlayer = {
        equipment: [],
        maxEquipSlots: 1,
        shortcuts: {},
        $name: "主人公", 
        $hp: 10, $maxHp: 10, $atk: 1, $spd: 1.0, $actMode: 0,
              width: 32,
        height: 32,
        $isLockedOn: 0, $lockonTargetId: null,
        $stamina: 100, $maxStamina: 100,$magazine: 30,
        $forceOn: 0, $forceX: 0, $forceY: 0, $forceSpd: 0,
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
