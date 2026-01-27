// threeHandler.js

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { VRMAnimationLoaderPlugin, createVRMAnimationClip } from '@pixiv/three-vrm-animation';
import { modelExpressionCache } from './state.js';
import * as state from './state.js';

let scene, camera, renderer;
let models = {};
export let vrms = {};
let animations = {};
let mixers = [];
const clock = new THREE.Clock();

let currentStageModel = null;
let currentPlayerModel = null;
let animationId = null;

let editorAssetsLoaded = false;
let isRendering = false; // ★追加: 描画中フラグ

// カメラ制御用パラメータ
let headBobTime = 0;
const tpsCameraState = {
    zoomLevel: 1.0, 
    smoothing: 15.0, // 数値が高いほど追従が速い
    currentLookAt: new THREE.Vector3() // 注視点の補間用
};

// --- 初期化・ロード関連 ---

export function resetEditorAssetLoader() {
    console.log("Resetting editor asset loader state.");
    editorAssetsLoaded = false;
    models = {};
    vrms = {};
    animations = {};
    for (const key in modelExpressionCache) {
        delete modelExpressionCache[key];
    }
}

export async function ensureEditorAssetsAreLoaded() {
    if (editorAssetsLoaded) return;
    const modelsToLoad = state.getProjectData().assets.models;
    if (!modelsToLoad) { editorAssetsLoaded = true; return; }

    try {
        await Promise.all(
            Object.entries(modelsToLoad).map(async ([id, asset]) => {
                if (asset.data && asset.format !== 'mmd') {
                    const vrm = await loadGlb(id, asset.data);
                    if (vrm && vrm.expressionManager) {
                       modelExpressionCache[id] = vrm.expressionManager.expressions.map(exp => {
                           return exp.presetName || exp.expressionName || exp.name;
                       }).filter(name => name);
                    }
                }
            })
        );
        editorAssetsLoaded = true;
    } catch (e) {
        console.error("Editor assets load error:", e);
    }
}

export function init(canvas) {
    // 既存のループがあれば止める
    stopRendering(); 
    
    if (renderer) {
        // 既存のレンダラーがあれば破棄 (念のため)
        renderer.dispose();
    }

    scene = new THREE.Scene();
    
    // カメラ初期化
    const aspect = canvas.clientWidth / canvas.clientHeight;
    camera = new THREE.PerspectiveCamera(45, isNaN(aspect) ? 1.0 : aspect, 0.1, 1000);
    camera.position.set(0, 1.3, 3.0);
    
    // ライティング
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(-1, 2, 1);
    scene.add(directionalLight);
    
    renderer = new THREE.WebGLRenderer({
        canvas: canvas, alpha: true, antialias: true, preserveDrawingBuffer: true
    });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    // ★修正: animate() を直接呼ばず、startRendering() を呼ぶ
    startRendering();
}

// ★追加: 描画開始関数
export function startRendering() {
    if (!isRendering) {
        isRendering = true;
        clock.start(); // デルタタイムが跳ねないように時計もリセット
        animate();
    }
}

// ★追加: 描画停止関数
export function stopRendering() {
    isRendering = false;
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
}

function animate() {
    // ★追加: フラグが false ならループを止める
    if (!isRendering) return;

    animationId = requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    for (const k in vrms) vrms[k].update(delta);
    mixers.forEach(m => m.update(delta));
    
    if (renderer && scene && camera) renderer.render(scene, camera);
}

export function loadGlb(id, dataUrl) {
    if (models[id]) return Promise.resolve(vrms[id]);
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    loader.register((parser) => new VRMAnimationLoaderPlugin(parser));

    return new Promise((resolve, reject) => {
        loader.load(dataUrl, (gltf) => {
            const vrm = gltf.userData.vrm;
            if (vrm) {
                VRMUtils.removeUnnecessaryVertices(gltf.scene);
                VRMUtils.removeUnnecessaryJoints(gltf.scene);
                vrm.lookAt.target = camera;
                vrms[id] = vrm;
            }
            if (gltf.userData.vrmAnimations) {
                animations[id] = gltf.userData.vrmAnimations[0];
                resolve(vrm);
                return;
            }
            const model = vrm ? vrm.scene : gltf.scene;
            model.visible = false;
            scene.add(model);
            models[id] = model;
            resolve(vrm);
        }, undefined, reject);
    });
}

// --- 表示・制御関連 ---

export function previewExpression(modelId, expressionName) {
    hideAllModels();
    const model = models[modelId];
    const vrm = vrms[modelId];
    if (model && vrm) {
        model.visible = true;
        model.position.set(0, 0, 0);
        model.rotation.set(0, Math.PI, 0);
        model.scale.set(1, 1, 1);
        mixers = mixers.filter(m => m.getRoot() !== model);
        if (vrm.expressionManager) {
            vrm.expressionManager.resetValues();
            if (expressionName) vrm.expressionManager.setValue(expressionName, 1.0);
        }
    }
}

export function showModel(id, config = {}) {
    hideAllModels();
    const model = models[id];
    const vrm = vrms[id];
    if (model) {
        model.visible = true;
        model.position.set(config.posX||0, config.posY||0, config.posZ||0); 
        let defRotY = vrm ? Math.PI : 0;
        model.rotation.set((config.rotX||0)*(Math.PI/180), ((config.rotY||0)*(Math.PI/180)) + defRotY, (config.rotZ||0)*(Math.PI/180));
        const s = config.scale!==undefined ? config.scale : 1.0;
        model.scale.set(s, s, s);
        
       if (vrm) {
            if (config.animationId && animations[config.animationId]) {
                mixers = mixers.filter(m => m.getRoot() !== model);
                const mixer = new THREE.AnimationMixer(model);
                const clip = createVRMAnimationClip(animations[config.animationId], vrm);
                if (clip) {
                    const action = mixer.clipAction(clip);
                    if (config.loop === false) { action.setLoop(THREE.LoopOnce); action.clampWhenFinished = true; } 
                    else { action.setLoop(THREE.LoopRepeat); }
                    action.play();
                    mixers.push(mixer);
                }
            } else mixers = mixers.filter(m => m.getRoot() !== model);

            if (vrm.expressionManager) {
                vrm.expressionManager.resetValues();
                if (config.expression) vrm.expressionManager.setValue(config.expression, 1.0);
            }
            if (vrm.springBoneManager) vrm.springBoneManager.reset();
        }
    }
}

export function showStage(id) {
    if (currentStageModel) { currentStageModel.visible = false; currentStageModel = null; }
    if (id && models[id]) {
        const model = models[id];
        model.visible = true;
        model.position.set(0, 0, 0);
        model.rotation.set(0, 0, 0);
        model.scale.set(1, 1, 1);
        currentStageModel = model;
    }
}
export function hideStage() { if (currentStageModel) { currentStageModel.visible = false; currentStageModel = null; } }

export function showPlayer(id) {
    if (currentPlayerModel) { currentPlayerModel.visible = false; currentPlayerModel = null; }
    if (id && models[id]) {
        const model = models[id];
        model.visible = true;
        model.position.set(0, 0, 0);
        model.rotation.set(0, 0, 0);
        model.scale.set(1, 1, 1);
        currentPlayerModel = model;
    }
}
export function hidePlayer() { if (currentPlayerModel) { currentPlayerModel.visible = false; currentPlayerModel = null; } }

export function updatePlayerTransform(x, y, dir, isMoving) {
    if (!currentPlayerModel) return;
    const UNIT = 32.0;
    const worldX = x / UNIT;
    const worldZ = y / UNIT; 
    currentPlayerModel.position.set(worldX, 0, worldZ);
    
    const rotY = -dir + Math.PI / 2;
    currentPlayerModel.rotation.set(0, rotY, 0);
}

export function hideAllModels() {
     for (const key in models) {
        if (models[key] !== currentStageModel && models[key] !== currentPlayerModel) {
            models[key].visible = false;
            const vrm = vrms[key];
            if (vrm && vrm.expressionManager) vrm.expressionManager.resetValues();
        }
    }
    mixers = [];
}

export function adjustTpsCameraZoom(delta) {
    tpsCameraState.zoomLevel += delta;
    tpsCameraState.zoomLevel = Math.max(0.5, Math.min(3.0, tpsCameraState.zoomLevel));
}
       
export function syncCamera(x, y, type, zoom, dir, pitch, isFirstPerson, isMoving, delta) {
    if (!camera) return;
    
    const isEditorMode = (delta === undefined);
    const dt = isEditorMode ? 1.0 : delta;

    camera.zoom = 1.0;
    const UNIT = 32.0; 
    const wx = x / UNIT; 
    const wz = y / UNIT;
    
    if (currentPlayerModel) {
        currentPlayerModel.visible = !isFirstPerson;
    }

    if(type === 'dungeon' || type === '3d') {
        const isTPS = currentPlayerModel && !isFirstPerson;
        
        if (isTPS) {
            // --- TPS視点 (三人称) ---
            let modelHeight = 1.6; 
            if (currentPlayerModel && window.modelCollisionCache && window.modelCollisionCache[currentPlayerModel.name]) {
                modelHeight = window.modelCollisionCache[currentPlayerModel.name].h / UNIT;
            }

            const baseDistance = modelHeight * 2.5;
            const baseHeight = modelHeight * 1.4;

            let distH = baseDistance * tpsCameraState.zoomLevel;
            let distV = baseHeight * tpsCameraState.zoomLevel;
            
            const targetPos = new THREE.Vector3(wx, modelHeight * 0.9, wz);
            
            const camX_ideal = wx - Math.cos(dir) * distH;
            const camZ_ideal = wz - Math.sin(dir) * distH;
            const camY_ideal = targetPos.y + distV + Math.sin(pitch) * distH;
            const idealPos = new THREE.Vector3(camX_ideal, camY_ideal, camZ_ideal);

            if (isNaN(idealPos.x) || isNaN(idealPos.y) || isNaN(idealPos.z)) {
                console.error("[syncCamera] Ideal position NaN detected!", { dir, pitch, distH, distV, wx, wz });
                return; 
            }

            const direction = new THREE.Vector3().subVectors(idealPos, targetPos).normalize();
            const totalDist = targetPos.distanceTo(idealPos);
            const raycaster = new THREE.Raycaster(targetPos, direction, 0.1, totalDist);
            
            let finalPos = idealPos; 
            if (currentStageModel) {
                const intersects = raycaster.intersectObject(currentStageModel, true);
                if (intersects.length > 0) {
                    finalPos = intersects[0].point.sub(direction.multiplyScalar(0.2));
                }
            }
            
            if (isNaN(finalPos.x) || isNaN(finalPos.y) || isNaN(finalPos.z)) {
                console.error("[syncCamera] Final position NaN detected!", finalPos);
                finalPos = idealPos;
            }

            const lerpFactor = isEditorMode ? 1.0 : (1.0 - Math.exp(-tpsCameraState.smoothing * dt));
            camera.position.lerp(finalPos, lerpFactor);
            
            if (!tpsCameraState.currentLookAt) tpsCameraState.currentLookAt = targetPos.clone();
            
            if (isNaN(tpsCameraState.currentLookAt.x)) {
                tpsCameraState.currentLookAt.copy(targetPos);
            }

            if (isEditorMode) tpsCameraState.currentLookAt.copy(targetPos);
            else tpsCameraState.currentLookAt.lerp(targetPos, lerpFactor);
            
            camera.lookAt(tpsCameraState.currentLookAt);
            
        } else {
            // --- FPS視点 (一人称) ---
            const eyeH = 1.5;
            const bobAmount = 0.03; 
            const bobSpeed = 10.0; 
            
            if (isMoving && !isEditorMode) headBobTime += dt * bobSpeed;
            else headBobTime *= 0.95;
            
            const bobOffset = Math.sin(headBobTime) * bobAmount;
            camera.position.set(wx, eyeH + bobOffset, wz);

            const checkDirection = new THREE.Vector3();
            camera.getWorldDirection(checkDirection);
            const wallRay = new THREE.Raycaster(camera.position, checkDirection, 0, 0.5);
            let isCloseToWall = false;
            if (currentStageModel) {
                isCloseToWall = wallRay.intersectObject(currentStageModel, true).length > 0;
            }
            camera.near = isCloseToWall ? 0.05 : 0.1;

            const rotY = -dir + Math.PI / 2;
            const rotX = -pitch;
            camera.rotation.set(rotX, rotY, 0, 'YXZ');
        }
    } else if(type === 'mode7') {
        const eyeHeight = 2.5 / zoom;
        camera.position.set(wx, eyeHeight, wz);
        const tx = wx + Math.cos(dir) * 10; const tz = wz + Math.sin(dir) * 10; const ty = 0;
        camera.lookAt(tx, ty, tz);
    } else if(type === 'quarter') {
        const d = 10/zoom; 
        camera.position.set(wx, d, wz+d); 
        camera.lookAt(wx, 0, wz);
    } else {
        const d = 10/zoom; 
        camera.position.set(wx, d, wz); 
        camera.up.set(0, 0, 1); 
        camera.lookAt(wx, 0, wz); 
        camera.up.set(0, 1, 0);
        camera.position.set(wx, d, wz); 
        camera.rotation.set(-Math.PI/2, 0, 0);
    }
    
    camera.updateProjectionMatrix();
}

export function onResize(width, height) {
    if (renderer && camera) {
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }
}
export function disposeAll() {
    scene.traverse((obj) => {
        if (obj.geometry) {
            obj.geometry.dispose();
        }
        if (obj.material) {
            if (Array.isArray(obj.material)) {
                obj.material.forEach(m => disposeMaterial(m));
            } else {
                disposeMaterial(obj.material);
            }
        }
    });
    
    models = {};
    vrms = {};
    animations = {};
    mixers = [];
    currentStageModel = null;
    currentPlayerModel = null;
    
    scene.clear();
}

function disposeMaterial(mat) {
    if (mat.map) mat.map.dispose();
    if (mat.normalMap) mat.normalMap.dispose();
    if (mat.roughnessMap) mat.roughnessMap.dispose();
    if (mat.metalnessMap) mat.metalnessMap.dispose();
    mat.dispose();
}

export function getScreenPosition(gridX, gridY, heightOffset, canvasWidth, canvasHeight) {
    if (!camera) return null;
    
    const UNIT = 32.0;
    const worldX = gridX / UNIT;
    const worldZ = gridY / UNIT;
    
    // ★修正: 1.5 の加算を削除し、純粋な座標変換にする
    // heightOffset はピクセル単位で渡される前提なので UNIT で割る
    const worldY = (heightOffset / UNIT);
    
    const vec = new THREE.Vector3(worldX, worldY, worldZ);
    vec.project(camera);
    
    if (vec.z > 1) return null;

    const x = (vec.x * 0.5 + 0.5) * canvasWidth;
    const y = (-(vec.y * 0.5) + 0.5) * canvasHeight;
    
    return { x, y };
}