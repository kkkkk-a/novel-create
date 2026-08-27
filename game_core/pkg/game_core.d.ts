/* tslint:disable */
/* eslint-disable */

export function render_mode7(dest: Uint8Array, src: Uint8Array, screen_w: number, screen_h: number, src_w: number, src_h: number, cam_x: number, cam_y: number, dir: number, zoom: number, loop_x: boolean, loop_y: boolean): void;

export function render_trapezoid_floor(dest: Uint8Array, src: Uint8Array, screen_w: number, screen_h: number, horizon: number, src_w: number, src_h: number, p_x: number, p_y: number, camera_height: number, camera_dist: number, fov: number, zoom: number, loop_x: boolean, loop_y: boolean): void;

export function update_particles_batch(particle_data: Float32Array, count: number, time_scale: number, screen_h: number): number;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly render_mode7: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number, n: number, o: number) => void;
    readonly render_trapezoid_floor: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number, n: number, o: number, p: number, q: number, r: number) => void;
    readonly update_particles_batch: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
    readonly __wbindgen_export: (a: number, b: number) => number;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
