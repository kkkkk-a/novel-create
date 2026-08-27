// src/lib.rs (完全版 - 外部依存ゼロ・単一HTML完全対応)

// ==========================================
// 1. Mode7 (疑似3D平面) 高速レンダラー
// ==========================================
#[no_mangle]
pub extern "C" fn render_mode7(
    dest_ptr: *mut u8,     // 出力先のメモリポインタ
    src_ptr: *const u8,    // 入力テクスチャのメモリポインタ
    screen_w: u32,         // 画面幅
    screen_h: u32,         // 画面高さ
    src_w: u32,            // テクスチャ幅
    src_h: u32,            // テクスチャ高さ
    cam_x: f32,            // カメラX座標
    cam_y: f32,            // カメラY座標
    dir: f32,              // プレイヤー/カメラの回転角度 (ラジアン)
    zoom: f32,             // ズーム倍率
    loop_x: bool,          // X軸無限ループフラグ
    loop_y: bool,          // Y軸無限ループフラグ
) {
    let half_h = screen_h / 2;
    let dest_len = (screen_w * half_h * 4) as usize;
    let src_len = (src_w * src_h * 4) as usize;

    let dest = unsafe { std::slice::from_raw_parts_mut(dest_ptr, dest_len) };
    let src = unsafe { std::slice::from_raw_parts(src_ptr, src_len) };

    let cam_z = (screen_h as f32 * 1.0) / zoom.max(0.1);
    let cos = dir.cos();
    let sin = dir.sin();

    let map_pixel_w = src_w as f32;
    let map_pixel_h = src_h as f32;

    for y in 0..half_h {
        let z = cam_z / (y + 1) as f32;
        let base_px = cam_x + z * cos;
        let base_py = cam_y + z * sin;

        let per_z = (z / screen_w as f32) * 2.5;
        let vec_x = -sin * per_z;
        let vec_y = cos * per_z;

        let dest_row_offset = (y as usize * screen_w as usize) * 4;

        for x in 0..screen_w {
            let offset = x as f32 - (screen_w as f32 / 2.0);
            let mut map_x = base_px + offset * vec_x;
            let mut map_y = base_py + offset * vec_y;

            let mut valid = true;

            if loop_x {
                map_x = map_x.rem_euclid(map_pixel_w);
            } else if map_x < 0.0 || map_x >= map_pixel_w {
                valid = false;
            }

            if loop_y {
                map_y = map_y.rem_euclid(map_pixel_h);
            } else if map_y < 0.0 || map_y >= map_pixel_h {
                valid = false;
            }

            let dest_idx = dest_row_offset + (x as usize * 4);

            if valid {
                let tex_x = ((map_x / map_pixel_w) * src_w as f32) as usize;
                let tex_y = ((map_y / map_pixel_h) * src_h as f32) as usize;

                if tex_x < src_w as usize && tex_y < src_h as usize {
                    let src_idx = (tex_y * src_w as usize + tex_x) * 4;
                    dest[dest_idx]     = src[src_idx];
                    dest[dest_idx + 1] = src[src_idx + 1];
                    dest[dest_idx + 2] = src[src_idx + 2];
                    dest[dest_idx + 3] = 255;
                } else {
                    dest[dest_idx + 3] = 0;
                }
            } else {
                dest[dest_idx + 3] = 0;
            }
        }
    }
}

// ==========================================
// 2. 台形パース (Trapezoid / Belt) 床レンダラー
// ==========================================
#[no_mangle]
pub extern "C" fn render_trapezoid_floor(
    dest_ptr: *mut u8,
    src_ptr: *const u8,
    screen_w: u32,
    screen_h: u32,
    horizon: u32,
    src_w: u32,
    src_h: u32,
    p_x: f32,
    p_y: f32,
    camera_height: f32,
    camera_dist: f32,
    fov: f32,
    zoom: f32,
    loop_x: bool,
    loop_y: bool,
) {
    let render_h = screen_h.saturating_sub(horizon);
    if render_h == 0 {
        return;
    }

    let dest_len = (screen_w * render_h * 4) as usize;
    let src_len = (src_w * src_h * 4) as usize;

    let dest = unsafe { std::slice::from_raw_parts_mut(dest_ptr, dest_len) };
    let src = unsafe { std::slice::from_raw_parts(src_ptr, src_len) };

    let map_pixel_w = src_w as f32;
    let map_pixel_h = src_h as f32;

    for y in 0..render_h {
        let dist_y = if y == 0 { 0.5 } else { y as f32 };
        let depth = (camera_height * fov * zoom) / dist_y;
        let map_y = p_y + camera_dist - depth;
        let scale = (fov / depth) * zoom;

        let mut tex_y = map_y.rem_euclid(src_h as f32) as usize;
        if !loop_y && (map_y < 0.0 || map_y >= map_pixel_h) {
            continue;
        }
        if tex_y >= src_h as usize {
            tex_y = src_h as usize - 1;
        }

        let map_start_x = p_x + (0.0 - (screen_w as f32 / 2.0)) / scale;
        let dx = 1.0 / scale;
        let mut current_map_x = map_start_x;

        let dest_row_offset = (y as usize * screen_w as usize) * 4;
        let src_row_offset = (tex_y * src_w as usize) * 4;

        for x in 0..screen_w {
            let mut valid = true;
            let mut tex_x = current_map_x.rem_euclid(src_w as f32) as usize;

            if !loop_x && (current_map_x < 0.0 || current_map_x >= map_pixel_w) {
                valid = false;
            }
            if tex_x >= src_w as usize {
                tex_x = src_w as usize - 1;
            }

            let dest_idx = dest_row_offset + (x as usize * 4);

            if valid {
                let src_idx = src_row_offset + (tex_x * 4);
                dest[dest_idx]     = src[src_idx];
                dest[dest_idx + 1] = src[src_idx + 1];
                dest[dest_idx + 2] = src[src_idx + 2];
                dest[dest_idx + 3] = 255;
            } else {
                dest[dest_idx + 3] = 0;
            }

            current_map_x += dx;
        }
    }
}

// ==========================================
// 3. 大量パーティクル一括物理演算エンジン
// ==========================================
const PARTICLE_STRIDE: usize = 12;

#[no_mangle]
pub extern "C" fn update_particles_batch(
    particle_ptr: *mut f32,
    count: usize,
    time_scale: f32,
    screen_h: f32,
) -> usize {
    let particle_data = unsafe { std::slice::from_raw_parts_mut(particle_ptr, count * PARTICLE_STRIDE) };
    let mut alive_count = 0;

    for i in 0..count {
        let base = i * PARTICLE_STRIDE;
        let life = particle_data[base + 6] - (particle_data[base + 7] * time_scale);

        if life <= 0.0 {
            continue;
        }

        let x = particle_data[base + 0] + (particle_data[base + 3] * time_scale);
        let mut y = particle_data[base + 1] + (particle_data[base + 4] * time_scale);
        let mut z = particle_data[base + 2];
        let mut vx = particle_data[base + 3];
        let mut vy = particle_data[base + 4];
        let mut vz = particle_data[base + 5];

        let gravity = particle_data[base + 8];
        let bounce = particle_data[base + 9];
        let is_screenspace = particle_data[base + 10] > 0.5;
        let is_weather = particle_data[base + 11] > 0.5;

        let mut killed = false;

        if is_screenspace {
            vy += gravity * time_scale;

            if y > screen_h {
                if bounce > 0.0 {
                    y = screen_h;
                    vy *= -bounce;
                    vx *= 0.8;
                } else if is_weather {
                    killed = true;
                }
            }
        } else {
            z += vz * time_scale;
            vz -= gravity * time_scale;

            if z < 0.0 {
                if is_weather && bounce <= 0.0 {
                    killed = true;
                } else {
                    z = 0.0;
                    vz *= -bounce;
                    vx *= 0.8;
                    vy *= 0.8;
                }
            }
        }

        if killed {
            continue;
        }

        let target_base = alive_count * PARTICLE_STRIDE;
        particle_data[target_base + 0] = x;
        particle_data[target_base + 1] = y;
        particle_data[target_base + 2] = z;
        particle_data[target_base + 3] = vx;
        particle_data[target_base + 4] = vy;
        particle_data[target_base + 5] = vz;
        particle_data[target_base + 6] = life;
        particle_data[target_base + 7] = particle_data[base + 7];
        particle_data[target_base + 8] = gravity;
        particle_data[target_base + 9] = bounce;
        particle_data[target_base + 10] = particle_data[base + 10];
        particle_data[target_base + 11] = particle_data[base + 11];

        alive_count += 1;
    }

    alive_count
}

// ==========================================
// 4. メモリ管理用ヘルパー
// ==========================================
#[no_mangle]
pub extern "C" fn alloc(size: usize) -> *mut u8 {
    let mut buf = Vec::with_capacity(size);
    let ptr = buf.as_mut_ptr();
    std::mem::forget(buf);
    ptr
}

#[no_mangle]
pub extern "C" fn dealloc(ptr: *mut u8, size: usize) {
    unsafe {
        let _ = Vec::from_raw_parts(ptr, 0, size);
    }
}