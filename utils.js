// utils.js

/**
 * ピクセル配列（JSON形式）からWebP Data URLを生成します。
 * 高速化のためImageDataを直接操作します。
 * @param {string[]} pixelColors - カラー文字列の配列 (例: ['#FFFFFF', 'transparent', ...])
 * @param {number} width - 画像の幅 (px)
 * @param {number} height - 画像の高さ (px)
 * @param {number} qualityPercent - WebPの品質 (0-100)
 * @returns {string} - Data URL形式のWebP文字列
 */
export function pixelsToWebPDataURL(pixelColors, width, height, qualityPercent = 85) {
    if (!document) {
        throw new Error("Browser DOM environment required for WebP conversion.");
    }
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    
    if (!tempCtx) {
        throw new Error("Canvas context not available.");
    }
    
    const imgData = tempCtx.createImageData(width, height);
    const data = imgData.data;
    
    // カラーパース用の正規表現 (例: #ff0000)
    const hexMatch = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;

    // 配列の長さと画像サイズが一致するか確認（安全策）
    const len = Math.min(pixelColors.length, width * height);

    for (let i = 0; i < len; i++) {
        const color = pixelColors[i];
        let r = 0, g = 0, b = 0, a = 0;
        
        // "transparent" または 空文字 は透明
        if (color === 'transparent' || color === '' || color === null) {
            a = 0;
        } else {
            // 16進数カラーコードの解析
            const match = color.match(hexMatch);
            if (match) {
                r = parseInt(match[1], 16);
                g = parseInt(match[2], 16);
                b = parseInt(match[3], 16);
                a = 255; // 不透明
            } else {
                // その他の色指定の場合は黒(透明度0)にフォールバック
                r = 0; g = 0; b = 0; a = 0;
            }
        }
        
        const index = i * 4;
        data[index] = r;
        data[index + 1] = g;
        data[index + 2] = b;
        data[index + 3] = a;
    }
    
    tempCtx.putImageData(imgData, 0, 0);
    
    try {
        return tempCanvas.toDataURL('image/webp', qualityPercent / 100);
    } catch (e) {
        console.error("WebP conversion failed", e);
        return "";
    }
}
