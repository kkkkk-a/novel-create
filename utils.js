// utils.js
// ブラウザ環境でのみ動作するユーティリティ（DOM/Canvasが必要）

/**
 * ピクセル配列（スプライトキャンバスJSON形式）からWebP Data URLを生成します。
 * @param {string[]} pixelColors - CSSカラー文字列の配列 (例: ['#FFFFFF', 'transparent', '#FF0000'])
 * @param {number} width - 画像の幅 (px)
 * @param {number} height - 画像の高さ (px)
 * @param {number} qualityPercent - WebPの品質 (0-100)
 * @returns {string} - Data URL形式のWebP文字列 (例: data:image/webp;base64,...)
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
    const hexMatch = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;

    let pixelCount = pixelColors.length;
    let processedPixels = 0;

    for (let i = 0; i < pixelCount; i++) {
        const color = pixelColors[i];
        let r = 0, g = 0, b = 0, a = 0;
        
        if (color === 'transparent') {
            a = 0;
        } else {
            const match = color.match(hexMatch);
            if (match) {
                r = parseInt(match[1], 16);
                g = parseInt(match[2], 16);
                b = parseInt(match[3], 16);
                a = 255;
                processedPixels++; // 有効な色をカウント
            }
        }
        
        const index = i * 4;
        data[index] = r; data[index + 1] = g; data[index + 2] = b; data[index + 3] = a;
    }
    
    tempCtx.putImageData(imgData, 0, 0);
    try {
        const webPDataUrl = tempCanvas.toDataURL('image/webp', qualityPercent / 100);
        return webPDataUrl;
    } catch (e) {
        throw new Error("Failed to convert to WebP Data URL.");
    }
}