/* @ts-self-types="./game_core.d.ts" */

/**
 * @param {Uint8Array} dest
 * @param {Uint8Array} src
 * @param {number} screen_w
 * @param {number} screen_h
 * @param {number} src_w
 * @param {number} src_h
 * @param {number} cam_x
 * @param {number} cam_y
 * @param {number} dir
 * @param {number} zoom
 * @param {boolean} loop_x
 * @param {boolean} loop_y
 */
export function render_mode7(dest, src, screen_w, screen_h, src_w, src_h, cam_x, cam_y, dir, zoom, loop_x, loop_y) {
    var ptr0 = passArray8ToWasm0(dest, wasm.__wbindgen_export);
    var len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(src, wasm.__wbindgen_export);
    const len1 = WASM_VECTOR_LEN;
    wasm.render_mode7(ptr0, len0, addHeapObject(dest), ptr1, len1, screen_w, screen_h, src_w, src_h, cam_x, cam_y, dir, zoom, loop_x, loop_y);
}

/**
 * @param {Uint8Array} dest
 * @param {Uint8Array} src
 * @param {number} screen_w
 * @param {number} screen_h
 * @param {number} horizon
 * @param {number} src_w
 * @param {number} src_h
 * @param {number} p_x
 * @param {number} p_y
 * @param {number} camera_height
 * @param {number} camera_dist
 * @param {number} fov
 * @param {number} zoom
 * @param {boolean} loop_x
 * @param {boolean} loop_y
 */
export function render_trapezoid_floor(dest, src, screen_w, screen_h, horizon, src_w, src_h, p_x, p_y, camera_height, camera_dist, fov, zoom, loop_x, loop_y) {
    var ptr0 = passArray8ToWasm0(dest, wasm.__wbindgen_export);
    var len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(src, wasm.__wbindgen_export);
    const len1 = WASM_VECTOR_LEN;
    wasm.render_trapezoid_floor(ptr0, len0, addHeapObject(dest), ptr1, len1, screen_w, screen_h, horizon, src_w, src_h, p_x, p_y, camera_height, camera_dist, fov, zoom, loop_x, loop_y);
}

/**
 * @param {Float32Array} particle_data
 * @param {number} count
 * @param {number} time_scale
 * @param {number} screen_h
 * @returns {number}
 */
export function update_particles_batch(particle_data, count, time_scale, screen_h) {
    var ptr0 = passArrayF32ToWasm0(particle_data, wasm.__wbindgen_export);
    var len0 = WASM_VECTOR_LEN;
    const ret = wasm.update_particles_batch(ptr0, len0, addHeapObject(particle_data), count, time_scale, screen_h);
    return ret >>> 0;
}
function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg___wbindgen_copy_to_typed_array_c7f28e53671b41e8: function(arg0, arg1, arg2) {
            new Uint8Array(getObject(arg2).buffer, getObject(arg2).byteOffset, getObject(arg2).byteLength).set(getArrayU8FromWasm0(arg0, arg1));
        },
        __wbindgen_object_drop_ref: function(arg0) {
            takeObject(arg0);
        },
    };
    return {
        __proto__: null,
        "./game_core_bg.js": import0,
    };
}

function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];

    heap[idx] = obj;
    return idx;
}

function dropObject(idx) {
    if (idx < 1028) return;
    heap[idx] = heap_next;
    heap_next = idx;
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedFloat32ArrayMemory0 = null;
function getFloat32ArrayMemory0() {
    if (cachedFloat32ArrayMemory0 === null || cachedFloat32ArrayMemory0.byteLength === 0) {
        cachedFloat32ArrayMemory0 = new Float32Array(wasm.memory.buffer);
    }
    return cachedFloat32ArrayMemory0;
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function getObject(idx) { return heap[idx]; }

let heap = new Array(1024).fill(undefined);
heap.push(undefined, null, true, false);

let heap_next = heap.length;

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passArrayF32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4, 4) >>> 0;
    getFloat32ArrayMemory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasmInstance, wasm;
function __wbg_finalize_init(instance, module) {
    wasmInstance = instance;
    wasm = instance.exports;
    wasmModule = module;
    cachedFloat32ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (!module.ok) {
            throw new Error(`failed to fetch Wasm: ${module.status} ${module.statusText} fetching '${module.url}'`);
        }

        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('game_core_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
